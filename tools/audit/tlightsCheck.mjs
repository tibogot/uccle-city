// TRAFFIC LIGHTS CHECK (claude/tlights, owner playtest 2026-11-18 "make better traffic lights in Blender"; docs/TLIGHTS.md,
// docs/QUALITY_RULES.md rule 33). Offline, no browser:
//
//   node --import ./tools/road_audit/register.mjs tools/audit/tlightsCheck.mjs [--quiet] [--tiles T,T] [--old]
//   (--old: the city placement as before claude/tlights, ?tlights=old: the counts it had)
//
// The KIT (models/tlights/tlights.glb, tools/blender/trafficLights.py):
//   budget   triangles per piece and LOD <= TRI_BUDGET (viewer/tlights/tlightPlace.js)
//   slots    every slot is a palette slot of viewer/tlights/tlightKit.js (named, no baked colour); every LOD has the five
//            lens slots (the engine lights the active aspect through them)
//   lenses   each lens (a cluster of lens triangles) looks where its head must: the vehicle lenses along -z (toward the
//            coming cars) within 25 deg (the repeater is turned 20 deg toward the road), the pedestrian lenses along +x
//            (across the road) within 10 deg; the counts per LOD (6 vehicle + 2 pedestrian, +3 with the bike head)
//   foot     the pole crosses the ground plane (y = 0) and goes >= 0.25 m under it (JOINS rule: a weld into the pavement)
//   mesh     tools/mesh_audit on each LOD node alone (what is drawn together), at its band's end: 0 blocking items
//            (z-fight, crossing, leak, flipped, streak, bent flat normals)
// The CITY (the tiles with OSM signals; the placement of viewer/streets/signalPlace.js + viewer/tlights/tlightPlace.js
// on the tile worker's road stage, as main.js runs them):
//   facing   the vehicle heads face the cars coming up their approach: the direction from the head to the lane centre
//            15-25 m back up the road (walked along the road's polyline, bends included) within 35 deg of the heads'
//            facing; the pedestrian head looks at the carriageway (toward the road's centre line within 50 deg: the post is aimed at its approach, up to 30 deg)
//   seated   the foot on the drawn pavement: 9 points round the pole (r 7.5 cm) within 5 cm of the post's height
//            (ground + the measured raise): a post across a kerb line or on a slope edge fails
//   lane     no post centre in a driven lane (viewer/streets/carriageway.js lanesOnly, as tools/audit/streetAudit.mjs)
// Exit 1 on any failure.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { loadTile, allTiles, ROOT } from "../road_audit/tile.mjs";
import { readGlb } from "../mesh_audit/glb.mjs";
import { auditGlb } from "../mesh_audit/cli.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway } = await imp("viewer/streets/carriageway.js");
const { signalSites } = await imp("viewer/streets/signalPlace.js");
const { nearestRoad } = await imp("viewer/traffic/signals.js");
const { tlightInstances, seatY, TL_PIECES, TRI_BUDGET, LOD_END } = await imp("viewer/tlights/tlightPlace.js");

const argv = process.argv.slice(2);
const QUIET = argv.includes("--quiet");
const OLD = argv.includes("--old");          // the placement before claude/tlights (?tlights=old): report its counts
const say = (s) => { if (!QUIET) console.log(s); };
const fails = [];
const FAIL = (s) => { fails.push(s); console.log(`FAIL ${s}`); };

// ------------------------------------------------------------------------------------------------ the kit
const GLB = join(ROOT, "models/tlights/tlights.glb");
const kitSrc = readFileSync(join(ROOT, "viewer/tlights/tlightKit.js"), "utf8");
const PALETTE = new Set([...kitSrc.matchAll(/^\s*\["((?:tl|lens|ped)_\w+)", \[/gm)].map((m) => m[1]));
const LENS = ["lens_red", "lens_amber", "lens_green", "ped_red", "ped_green"];
const { parts } = await readGlb(GLB);
const kit = {};
for (const piece of TL_PIECES) for (let lod = 0; lod < 3; lod++) {
  const node = `${piece}_LOD${lod}`, ps = parts.filter((p) => p.name === node);
  if (!ps.length) { FAIL(`kit: node ${node} missing`); continue; }
  let tris = 0, minY = Infinity, cross = false;
  const lens = [];                                           // [x, y, z, nx, ny, nz, area, ped]
  for (const p of ps) {
    if (!PALETTE.has(p.slot)) FAIL(`kit: ${node} slot "${p.slot}" not in the viewer palette (tlightKit.js SLOTS)`);
    const P = p.positions, I = p.index || Uint32Array.from({ length: P.length / 3 }, (_, i) => i);
    tris += I.length / 3;
    for (let k = 1; k < P.length; k += 3) minY = Math.min(minY, P[k]);
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const y0 = Math.min(P[a + 1], P[b + 1], P[c + 1]), y1 = Math.max(P[a + 1], P[b + 1], P[c + 1]);
      const cx = (P[a] + P[b] + P[c]) / 3, cz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
      if (p.slot === "tl_pole" && y0 <= 0 && y1 >= 0 && y1 - y0 > 0.01 && Math.hypot(cx, cz) < 0.08) cross = true;
      const key = (o) => `${p.slot}:${Math.round(P[o] * 1e4)},${Math.round(P[o + 1] * 1e4)},${Math.round(P[o + 2] * 1e4)}`;
      if (LENS.includes(p.slot)) lens.push([cx, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, cz, nx / 2, ny / 2, nz / 2, p.slot.startsWith("ped"), Math.hypot(nx, ny, nz) / 2 + 1e-12, [key(a), key(b), key(c)]]);
    }
  }
  const slots = new Set(ps.map((p) => p.slot));
  for (const s of LENS) if (!slots.has(s)) FAIL(`kit: ${node} has no ${s} slot`);
  if (tris > TRI_BUDGET[lod]) FAIL(`kit: ${node} ${tris} triangles > budget ${TRI_BUDGET[lod]}`);
  if (!(minY <= -0.25) || !cross) FAIL(`kit: ${node} foot not into the ground (min y ${minY.toFixed(3)}, pole crosses y 0: ${cross})`);
  // lens clusters: the connected lens surfaces (triangles sharing a vertex position), the area-weighted mean normal each
  const par = lens.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
  const byKey = new Map();
  lens.forEach((l, i) => { for (const key of l[8]) { const j = byKey.get(key); if (j === undefined) byKey.set(key, i); else par[find(i)] = find(j); } });
  const groups = new Map();
  lens.forEach((l, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, { y: 0, w: 0, n: [0, 0, 0], ped: l[6] }); const c = groups.get(r); c.y += l[1] * l[7]; c.w += l[7]; c.n[0] += l[3]; c.n[1] += l[4]; c.n[2] += l[5]; });
  const cl = [...groups.values()].map((c) => ({ ...c, y: c.y / c.w }));
  let veh = 0, ped = 0;
  for (const c of cl) {
    const L = Math.hypot(...c.n) || 1, n = c.n.map((v) => v / L);
    const [want, lim] = c.ped ? [[1, 0, 0], 10] : [[0, 0, -1], 25];
    const ang = Math.acos(Math.max(-1, Math.min(1, n[0] * want[0] + n[1] * want[1] + n[2] * want[2]))) * 180 / Math.PI;
    if (ang > lim) FAIL(`kit: ${node} ${c.ped ? "pedestrian" : "vehicle"} lens at y ${c.y.toFixed(2)} looks ${ang.toFixed(0)} deg off its axis (> ${lim})`);
    if (c.ped) ped++; else veh++;
  }
  const wantVeh = piece === "tl_post_bike" ? 9 : 6;
  if (veh !== wantVeh || ped !== 2) FAIL(`kit: ${node} lenses ${veh} vehicle / ${ped} pedestrian (want ${wantVeh} / 2)`);
  // the mesh audit of this LOD alone, at its band's end
  const rep = await auditGlb(GLB, { nodes: [node], range: { "*": LOD_END[lod] }, out: join(tmpdir(), "tlights_audit"), quiet: true });
  if (rep.summary.blocking) FAIL(`kit: ${node} mesh audit ${rep.summary.blocking} blocking (${Object.entries(rep.summary.counts).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ")})`);
  kit[node] = { tris, lenses: `${veh}+${ped}`, minY: +minY.toFixed(2), blocking: rep.summary.blocking };
}
say(`kit: ${Object.entries(kit).map(([k, v]) => `${k} ${v.tris} tris (lenses ${v.lenses}, audit ${v.blocking})`).join(", ")}`);

// ------------------------------------------------------------------------------------------------ static rules
for (const f of readdirSync(join(ROOT, "viewer/tlights"))) {
  const s = readFileSync(join(ROOT, "viewer/tlights", f), "utf8");
  if (/THREE\.DynamicDrawUsage|\.setUsage\(/.test(s)) FAIL(`code: viewer/tlights/${f} uses DynamicDrawUsage (rule 8)`);
  if (/new THREE\.\w*Light\(|PointLight|SpotLight|RectAreaLight/.test(s)) FAIL(`code: viewer/tlights/${f} adds a light (rule 7: the lit aspect is emissive)`);
}
if (!/old\("tlights"/.test(readFileSync(join(ROOT, "viewer/features.js"), "utf8"))) FAIL("code: no ?tlights switch row in viewer/features.js");
const mainSrc = readFileSync(join(ROOT, "viewer/main.js"), "utf8");
if (!/noSignals: cityTLights\.drawing/.test(mainSrc) || !/cityTLights\.addTile\(/.test(mainSrc) || !/cityTLights\.removeTile\(/.test(mainSrc)) FAIL("code: main.js does not hand the signal sites to cityTLights (add / remove / furniture.js noSignals)");

// ------------------------------------------------------------------------------------------------ the city
let TILES;
const ti = argv.indexOf("--tiles");
if (ti >= 0) TILES = argv[ti + 1].split(",");
else {
  TILES = allTiles().filter((T) => {
    const f = join(ROOT, "data/tiles", T, "features.json");
    return existsSync(f) && JSON.parse(readFileSync(f, "utf8")).points?.some((p) => p.kind === "traffic_signals");
  });
}
const S = { tiles: 0, posts: 0, bike: 0, facingBad: 0, facingNA: 0, pedBad: 0, unseated: 0, inLane: 0, worstSeat: 0, worstFace: 0 };
const worst = [];
const deg = (a) => a * 180 / Math.PI;
for (const T of TILES) {
  let tile;
  try { tile = loadTile(T); } catch (e) { FAIL(`city: ${T} ${e.message}`); continue; }
  const { roads, feats, bounds, rd, hm } = tile;
  const fit = rd.surfaceData ? streetFit(rd.surfaceData) : null;
  const driven = carriageway(roads, { classAt: fit?.classAt });
  const lanes = carriageway(roads, { classAt: fit?.classAt, lanesOnly: true });
  const sites = signalSites(feats.points, roads, { fit, driven, pre: OLD });
  const ground = (x, z) => hm.ground(x, z);
  const { list } = tlightInstances(sites, ground, fit?.lift, bounds);
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  S.tiles++;
  for (const p of list) {
    S.posts++; if (p.piece === "tl_post_bike") S.bike++;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);              // the vehicle heads' facing (local -z)
    // facing: the lane 15-25 m back up the approach, walked along the road's polyline from the post's projection
    // the road the post is FOR (the OSM point's road) and the stop point on it (signalPlace.js site.road / site.stop)
    const road = roads.roads.find((r) => r.id === p.road);
    const nr = road ? { road, px: p.stop[0], pz: p.stop[1] } : null;
    if (nr) {
      const pts = [N.get(nr.road.a), ...nr.road.pts, N.get(nr.road.b)].filter(Boolean);
      // the segment of the projection and the walking direction (against the travel)
      let k = 1, bestD = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((nr.px - a.x) * dx + (nr.pz - a.z) * dz) / L2));
        const d = Math.hypot(a.x + dx * t - nr.px, a.z + dz * t - nr.pz);
        if (d < bestD) { bestD = d; k = i; }
      }
      const fwd = p.tx * (pts[k].x - pts[k - 1].x) + p.tz * (pts[k].z - pts[k - 1].z) >= 0;   // travel along a -> b
      // two points back up the approach (15 and 25 m: the cars that come see the heads from there)
      let bad = false;
      for (const back of [15, 25]) {
        let x = nr.px, z = nr.pz, left = back, i = fwd ? k - 1 : k;
        while (left > 0 && i >= 0 && i < pts.length) {
          const d = Math.hypot(pts[i].x - x, pts[i].z - z);
          if (d > 1e-6 && ((pts[i].x - x) * -p.tx + (pts[i].z - z) * -p.tz) / d < 0.5) break;   // past a hairpin (> 60 deg): not this approach
          if (d >= left) { x += (pts[i].x - x) * left / d; z += (pts[i].z - z) * left / d; left = 0; break; }
          left -= d; x = pts[i].x; z = pts[i].z; i += fwd ? -1 : 1;
        }
        if (back - left < 8) { if (back === 15) S.facingNA++; continue; }     // a short stub before the way's end
        // the lane's centre: from the centre line toward the traffic's right (the side the post is on)
        const ox = p.x - nr.px, oz = p.z - nr.pz, ol = Math.hypot(ox, oz) || 1;
        const lx = x + (ox / ol) * Math.min(1.6, ol * 0.4), lz = z + (oz / ol) * Math.min(1.6, ol * 0.4);
        const vx = lx - p.x, vz = lz - p.z, vl = Math.hypot(vx, vz) || 1;
        const ang = deg(Math.acos(Math.max(-1, Math.min(1, (fx * vx + fz * vz) / vl))));
        S.worstFace = Math.max(S.worstFace, ang);
        if (ang > 35) { bad = true; worst.push({ T, kind: `facing @${back} m`, ang: +ang.toFixed(0), x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); }
      }
      if (bad) S.facingBad++;
      // the pedestrian head (local +x) toward the carriageway
      const px = Math.cos(p.yaw), pz = -Math.sin(p.yaw), rx = nr.px - p.x, rz = nr.pz - p.z, rl = Math.hypot(rx, rz);
      if (rl > 2) {                // (a post on a median within 2 m of the centre line: either way is across)
        const a2 = deg(Math.acos(Math.max(-1, Math.min(1, (px * rx + pz * rz) / rl))));
        if (a2 > 50) { S.pedBad++; worst.push({ T, kind: "ped head", ang: +a2.toFixed(0), x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); }
      }
    }
    // seated: the foot ring on the drawn pavement
    let dmax = 0;
    for (let j = 0; j <= 8; j++) {
      const a = (j / 8) * 2 * Math.PI, r = j === 8 ? 0 : 0.075;
      dmax = Math.max(dmax, Math.abs(seatY(ground, fit?.lift, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r) - p.y));
    }
    S.worstSeat = Math.max(S.worstSeat, dmax);
    if (dmax > 0.05) { S.unseated++; worst.push({ T, kind: "seat", dy: +dmax.toFixed(3), x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); }
    if (lanes.inside(p.x, p.z, 0)) { S.inLane++; worst.push({ T, kind: "in lane", x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); }
  }
  say(`${T}: ${list.length} posts`);
}
S.worstSeat = +S.worstSeat.toFixed(3); S.worstFace = +S.worstFace.toFixed(1);
console.log(`city: ${JSON.stringify(S)}`);
if (!QUIET || S.facingBad || S.pedBad || S.unseated || S.inLane) for (const w of worst.slice(0, 20)) console.log("  ", JSON.stringify(w));
if (S.facingBad) FAIL(`city: ${S.facingBad} posts whose heads do not face their approach (> 35 deg)`);
if (S.pedBad) FAIL(`city: ${S.pedBad} pedestrian heads not looking across the road`);
if (S.unseated) FAIL(`city: ${S.unseated} posts not seated within 5 cm (worst ${S.worstSeat} m)`);
if (S.inLane) FAIL(`city: ${S.inLane} posts in a driven lane`);
if (!S.posts) FAIL("city: no posts placed");
console.log(fails.length ? `${fails.length} FAIL` : "tlights: all checks pass");
process.exitCode = fails.length ? 1 : 0;
