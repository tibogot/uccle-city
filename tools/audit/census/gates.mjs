// CENSUS class G (claude/gates 2026-11-19, owner: "most people around their house are supposed to have gates; I feel
// you miss many", docs/GATES.md): every HOUSE FRONTAGE city-wide (a building's main street face: the door face, else
// its widest street face; this tile's own buildings), what stands on its property line as the city DRAWS it (the garden
// doc after main.js's clearing: restyles, pieces on a carriageway 0.3 m in / in a cleared ring, viewer/gardens/
// gardenClear.js), independent of the generator's own bookkeeping:
//
//   rays      every 0.5 m along the face's middle 80 %, out along its normal (0.1 m steps, <= 35 m): the first measured
//             street surface (every UrbIS class but paths and tree pits) or carriageway is the PROPERTY LINE; another
//             building first = blocked. < 50 % of the rays reach a street: the building does not front one (noStreet).
//             Median gap < 1 m: the façade IS the line (onLine: a row on the sidewalk, no front garden).
//   type      shop (a street-life shopfront on a face, an OSM shop point inside / within 3 m of the footprint),
//             apartment (>= 12 m high and >= 200 m2), terraced (a whole party wall: rows and semis), villa (detached),
//             annex (< 30 m2 or < 3.5 m high: garages, sheds; not a frontage)
//   line      each ray, from the face to 0.4 m past its street hit, against the drawn pieces: wall (a wall with no
//             railing), railing (low wall + railing / bare railing), hedge, gate (a leaf drawn: pedestrian / driveway),
//             pillar (a pier, within 0.22 m); nothing = an open ray. A frontage is CLOSED when >= 50 % of its rays meet
//             a piece, otherwise OPEN; its kind = the majority piece
//   access    path: the door (tools/gardens/faces.mjs, the façade code's door bay) projected along the normal onto the
//             line; drive: a UrbIS CR42L driveway line or a ramp (dropped kerb) within 1.5 m of the line in front of
//             the face. gated: a gate leaf within 2.5 m of the path point along the line (or the path walks through a
//             driveway with a driveway gate), a driveway gate leaf within 1.2 m of the drive's span
//   openByMistake  an OPEN garden frontage of a villa / terraced house that no forecourt / car park explains (OSM
//             amenity=parking / landuse retail / commercial / shop areas over its strip); a ray through a UrbIS
//             driveway (CR42L within 0.8 m, a ramp) is access by data, not an open ray
//   gateAcrossDriven  a CLOSED driveway gate (kind 1, open 0) whose leaf line crosses the drawn carriageway or any OSM
//             way the player drives (service, driveway, track, residential ...): it would stand across a used way
//   cause     each openByMistake frontage traced to the first place it went: noRecord (the build left the face out:
//             its skip reason when the doc carries one, data/gardens/<T>.json skips), ruleOpen (the style rule drew it
//             open), viewerDrop (pieces placed but cleared by main.js), runShort (the run shorter than 3/4 of the face:
//             samples lost), openings (pieces placed, the openings take the rest)
//   paths     each house path without a gate: frontOpen, inDrive (into an ungated driveway), leafMissing (piers, no
//             leaf), noOpening (the solid line runs across), gap (neither: an opening at a run's end)
//   budget    gatesTileMax (gate leaves a tile draws: a driveway pair is two), piersTileMax
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/gates.mjs [--all | T ...] [--out FILE] [--jobs N]
//        [--old] [--max k=v,...] [--quiet] [--worst N]
//   --old: the city as ?gates=old draws it (data/gardens/old/<T>.json, the garden data before claude/gates)
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, json, at, ROOT, imp, SC } from "./lib_street.mjs";
import { footprintIndex } from "./lib_mesh.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag, opt } = cli();
const OLD = flag("--old"), MAX = opt("--max", null), QUIET = flag("--quiet"), DEBUG = opt("--debug", null), LIST = flag("--list");   // --list: every garden frontage in --out (docs/GATES.md sample)   // --debug x,z: the frontage there, ray by ray (child)
const TYPES = ["villa", "terraced", "apartment", "shop"];
const KINDS = ["wall", "railing", "hedge", "gate", "pillar"];
const r1 = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------------ parent
if (!CHILD) {
  if (!TILES.length) { console.error("usage: gates.mjs [--all | T ...] [--out FILE] [--old] [--max k=v,...]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: [...(OLD ? ["--old"] : []), ...(LIST ? ["--list"] : [])], log: !QUIET });
  const sum = {}, items = {}, causes = {}, byType = {}, pathCauses = {};
  for (const r of res) {
    if (r.error) continue;
    for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v;
    for (const [k, v] of Object.entries(r.causes)) causes[k] = (causes[k] || 0) + v;
    for (const [k, v] of Object.entries(r.pathCauses || {})) pathCauses[k] = (pathCauses[k] || 0) + v;
    for (const [t, o] of Object.entries(r.byType)) { byType[t] ||= {}; for (const [k, v] of Object.entries(o)) byType[t][k] = (byType[t][k] || 0) + v; }
    for (const [k, list] of Object.entries(r.items)) for (const it of list) (items[k] ||= []).push({ tile: r.tile, ...it });
  }
  // the shares the gate holds (per mille: integers in the ceilings)
  const pm = (a, b) => (b ? Math.round((1000 * a) / b) : 0);
  sum.pathGatedPm = pm(sum.pathGated || 0, sum.pathFronts || 0);
  sum.driveGatedPm = pm(sum.driveGated || 0, sum.driveFronts || 0);
  sum.houseOpenPm = pm(sum.openByMistake || 0, sum.houseGardenFronts || 0);
  sum.pathUngated = (sum.pathFronts || 0) - (sum.pathGated || 0);
  // the per-tile budget: the most gate leaves / piers a tile draws (instances in the kit's pools: no draw call each)
  sum.gatesTileMax = Math.max(0, ...res.filter((r) => !r.error).map((r) => 2 * r.counts.gates - r.counts.pedGates));   // (leaves: a driveway gate is two)
  sum.piersTileMax = Math.max(0, ...res.filter((r) => !r.error).map((r) => r.counts.piers || 0));
  for (const k of Object.keys(items)) items[k].sort((a, b) => (b.w ?? 0) - (a.w ?? 0));
  console.log(`class G (front gates), ${res.length} tiles${res.some((r) => r.error) ? ` (${res.filter((r) => r.error).length} failed)` : ""}${OLD ? " (--old: ?gates=old)" : ""}`);
  console.log(JSON.stringify(sum));
  console.log("open by mistake, by cause:", JSON.stringify(causes));
  console.log("house paths without a gate, by cause:", JSON.stringify(pathCauses));
  for (const t of TYPES) if (byType[t]) console.log(`  ${t}: ${JSON.stringify(byType[t])}`);
  for (const k of Object.keys(items)) {
    console.log(`worst ${k} (${items[k].length}):`);
    for (const it of items[k].slice(0, WORST)) console.log(`  ${it.tile} ${JSON.stringify(it)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, causes, pathCauses, byType, items, ...(LIST ? { fronts: res.flatMap((r) => (r.fronts || []).map((q) => [r.tile, ...q])) } : {}) }));
  let bad = res.some((r) => r.error) ? 1 : 0;
  if (bad) console.log(`FAIL ${res.filter((r) => r.error).length} tile(s) did not build`);
  // a ceiling k=v (sum[k] <= v); a floor k>=v (sum[k] >= v: the shares that must not fall)
  if (MAX) for (const kv of MAX.split(",")) {
    const floor = kv.includes(">="), [k, v] = kv.split(floor ? ">=" : "="), n = sum[k] ?? 0;
    if (floor ? n < +v : n > +v) { console.log(`FAIL ${k} ${n} ${floor ? "<" : ">"} ${v}`); bad++; } else console.log(`ok ${k} ${n} ${floor ? ">=" : "<="} ${v}`);
  }
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ child: one tile
const T = TILES[0];
const S = await streetTile(T);
const { fit, driven, nameAt, inB, roads, feats } = S;
const classAt = fit ? fit.classAt : () => -1;
const { tileFaces } = await imp("tools/gardens/faces.mjs");
const { clearRoads, restyleHedges } = await imp("viewer/gardens/gardenClear.js");
const counts = { houses: 0, noStreet: 0, onLine: 0, gardenFronts: 0, houseGardenFronts: 0, closed: 0, open: 0, openByMistake: 0, openAllowed: 0,
  pathFronts: 0, pathGated: 0, driveFronts: 0, driveGated: 0, gates: 0, pedGates: 0, carGates: 0, carGatesOpen: 0, gateAcrossDriven: 0,
  annex: 0, wall: 0, railing: 0, hedge: 0, gateKind: 0, pillar: 0, drive: 0 };
const causes = {}, pathCauses = {};
const byType = Object.fromEntries(TYPES.map((t) => [t, { fronts: 0, onLine: 0, garden: 0, closed: 0, open: 0, wall: 0, railing: 0, hedge: 0, gate: 0, pillar: 0, path: 0, pathGated: 0, drive: 0, driveGated: 0 }]));
const items = { openByMistake: [], pathUngated: [], gateAcrossDriven: [] };
const fronts = [];        // (--list) [x, z, street, type, kind, gap, width, path: 0 none / 1 gated / 2 ungated, drive: 0 / 1 gated / 2 open]

const bdoc = json(join(ROOT, "data/tiles", T, "buildings.json")).buildings;
const nbrs = (() => { const m = /^([A-Z])(\d+)$/.exec(T), out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(String.fromCharCode(m[1].charCodeAt(0) + a) + (+m[2] + b)); return out; })();
const blds = [], own = new Map();
for (const t of nbrs) {
  const f = join(ROOT, "data/tiles", t, "buildings.json"); if (!existsSync(f)) continue;
  json(f).buildings.forEach((b, k) => { if (b.footprint?.[0]?.length >= 3) { if (t === T) own.set(k, blds.length); blds.push({ ...b, tile: t }); } });
}
const FI = footprintIndex(blds);
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

// ---- the garden doc as the city draws it (main.js: restyles, then the pieces on a carriageway / cleared ring dropped)
const overrides = json(join(ROOT, "data/overrides.json")) || {};
const clearRings = Object.entries(overrides.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring);
const blocked = (x, z) => driven.inside(x, z, 0.3) || clearRings.some((r) => pip(x, z, r));
let doc = json(join(ROOT, OLD ? "data/gardens/old" : "data/gardens", `${T}.json`)) || { styles: [], segs: [], pillars: [], gates: [], hedges: [], gardens: [] };
const placed = { segs: doc.segs.length, pillars: doc.pillars.length, gates: doc.gates.length };
const rs = restyleHedges(doc, overrides.gardenRestyle, blocked); if (rs) doc = rs.doc;
const cl = clearRoads(doc, blocked, {}); const droppedDoc = doc; if (cl) doc = cl.doc;
const records = new Map(); for (const g of doc.gardens || []) { if (!records.has(g.bu)) records.set(g.bu, []); records.get(g.bu).push(g); }
/** the build's record of this face: the one of its building with the nearest gap (a building has one per garden face) */
const recordOf = (bu, gap) => (records.get(bu) || []).reduce((a, g) => (!a || Math.abs(g.gap - gap) < Math.abs(a.gap - gap) ? g : a), null);
const skips = doc.skips || {};

// pieces as plan segments [ax, az, bx, bz, kind, extra]
const P = [];
for (const s of doc.segs) { const st = doc.styles[s[6]] || {}; P.push([s[0], s[2], s[3], s[5], st.rail >= 0 && (st.railH || 0) > 0 ? "railing" : s[7] > 0.01 ? "wall" : "railing"]); }
for (const h of doc.hedges || []) for (let i = 1; i < h.points.length; i++) P.push([h.points[i - 1][0], h.points[i - 1][1], h.points[i][0], h.points[i][1], "hedge"]);
const gates = [];
for (const g of doc.gates) {
  const [x, , z, yaw, w, kind, open] = g, c = Math.cos(yaw), s = Math.sin(yaw);
  // a gate's span on the line (pa -> pa + w along yaw): a leaf is drawn there (open or closed: it stands at the opening)
  const q = { x, z, bx: x + c * w, bz: z - s * w, w, kind, open, mx: x + c * w / 2, mz: z - s * w / 2 };
  gates.push(q); P.push([q.x, q.z, q.bx, q.bz, "gate"]);
}
const pillars = doc.pillars.map((p) => [p[0], p[2]]);
const CELL = 4, grid = new Map(), key = (i, j) => i * 100003 + j;
P.forEach((s, id) => { for (let i = Math.floor(Math.min(s[0], s[2]) / CELL) - 1; i <= Math.floor(Math.max(s[0], s[2]) / CELL) + 1; i++) for (let j = Math.floor(Math.min(s[1], s[3]) / CELL) - 1; j <= Math.floor(Math.max(s[1], s[3]) / CELL) + 1; j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); } });
const pgrid = new Map(); pillars.forEach((p, id) => { const k = key(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)); if (!pgrid.has(k)) pgrid.set(k, []); pgrid.get(k).push(id); });
const segX = (ax, az, bx, bz, cx, cz, dx, dz) => {
  const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(den) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
  return t >= 0 && t <= 1 && u >= -0.03 && u <= 1.03;
};
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
/** what a ray (a -> b) meets first along the line (gate > hedge > wall / railing > pillar), or null */
function rayMeets(ax, az, bx, bz) {
  const seen = new Set(); let best = null, rank = { gate: 4, hedge: 3, railing: 2, wall: 2 };
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / CELL) + 1;
  for (let k = 0; k <= n; k++) {
    const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, kk = key(Math.floor(x / CELL), Math.floor(z / CELL));
    for (const id of grid.get(kk) || []) { if (seen.has(id)) continue; seen.add(id); const s = P[id]; if (segX(ax, az, bx, bz, s[0], s[1], s[2], s[3]) && (!best || rank[s[4]] > rank[best])) best = s[4]; }
    if (!best) for (const id of pgrid.get(kk) || []) { const p = pillars[id]; if (segD(p[0], p[1], ax, az, bx, bz) < 0.22) best = "pillar"; }
  }
  return best;
}

// ---- driveways (UrbIS Topo CR42L on the property line), OSM ways the player drives, OSM forecourts
const cr = json(join(ROOT, "data/raw/urbis/topo_poles", `${T}.street_furniture_line.geojson`));
const l72ToLocal = (e, n) => [e - 148643.0, -(n - 165394.0)];        // pipeline/common.py l72_to_local
const drives = [];
if (cr) for (const f of cr.features) { if (f.properties?.topo_type !== "CR42L") continue; const cs = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates]; for (const l of cs) drives.push(l.map(([e, n]) => l72ToLocal(e, n))); }
const N = new Map(roads.nodes.map((n) => [n.id, n]));
const ways = roads.roads.filter((r) => !["footway", "path", "steps", "cycleway", "pedestrian", "bridleway", "corridor"].includes(r.meta?.highway)).map((r) => [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]));
const forecourts = [];
{
  // pipeline/common.py wgs_to_local (pyproj EPSG:31370 - the origin), as a quadratic in (lon - 4.36, lat - 50.795) fitted
  // over the city (lon 4.30-4.42, lat 50.76-50.83): max error 0.7 mm
  const toLocal = (lon, lat) => { const u = lon - 4.36, v = lat - 50.795;
    return [739.99186 + 70503.28252 * u + 12.080496 * v + 0.0552472 * u * u - 1498.13872 * u * v - 0.0076268 * v * v,
      445.514106 + 7.6565977 * u - 111239.18349 * v - 474.759393 * u * u - 0.174368 * u * v - 14.558541 * v * v]; };
  const fj = json(join(ROOT, "data/raw/osm/forecourts.json"));
  if (fj) for (const e of fj.elements) { if (e.type !== "way" || (e.geometry || []).length < 4) continue; forecourts.push({ ring: e.geometry.map((g) => toLocal(g.lon, g.lat)), tags: e.tags || {} }); }
}
const inForecourt = (x, z) => forecourts.some((f) => pip(x, z, f.ring));
const shops = (feats.points || []).filter((p) => p.kind === "shop");

// ---- the frontages: this tile's buildings, their main street face
const faces = tileFaces(T);
const byB = new Map();
for (const f of faces) { if (!f.street || f.partyH >= 999 || f.landmark || f.width < 2) continue; if (!byB.has(f.bi)) byB.set(f.bi, []); byB.get(f.bi).push(f); }
const partyOf = new Map(); for (const f of faces) if (f.partyH >= 999) partyOf.set(f.bi, true);
const shopOf = new Map(); for (const f of faces) if (f.shopW > 0.5) shopOf.set(f.bi, true);
const STREET = (c) => c >= 0 && c !== SC.path && c !== SC.pit;
for (const [bi, fl] of byB) {
  const b = bdoc[bi], gi = own.get(bi); if (!b || gi == null) continue;
  const f = fl.find((q) => q.doorFace) || fl.reduce((a, q) => (q.width > a.width ? q : a));
  const mx = (f.a[0] + f.b[0]) / 2, mz = (f.a[1] + f.b[1]) / 2;
  if (!inB(mx, mz)) continue;
  const ring = b.footprint[0], A = area(ring);
  if (A < 30 || b.height < 3.5) { counts.annex++; continue; }
  const type = shopOf.get(bi) || shops.some((p) => pip(p.x, p.z, ring) || ringDist(p.x, p.z, ring) < 3) ? "shop"
    : b.height >= 12 && A >= 200 ? "apartment" : partyOf.get(bi) ? "terraced" : "villa";
  counts.houses++;
  const W = f.width, tx = (f.b[0] - f.a[0]) / W, tz = (f.b[1] - f.a[1]) / W, nx = f.nx, nz = f.nz;
  const rays = [];
  for (let u = W * 0.1; u <= W * 0.9 + 1e-6; u += 0.5) {
    const ox = f.a[0] + tx * u + nx * 0.15, oz = f.a[1] + tz * u + nz * 0.15;
    let d = null, blockedBy = false;
    for (let t = 0; t <= 35; t += 0.1) {
      const x = ox + nx * t, z = oz + nz * t, k = FI.at(x, z);
      if (k >= 0 && k !== gi) { blockedBy = true; break; }
      if (STREET(classAt(x, z)) || driven.inside(x, z)) { d = t; break; }
    }
    rays.push({ ox, oz, d, blockedBy, cls: d != null ? classAt(ox + nx * (d + 0.05), oz + nz * (d + 0.05)) : -1 });
  }
  const hits = rays.filter((r) => r.d != null);
  const T0 = byType[type];
  if (hits.length < 0.5 * rays.length) { counts.noStreet++; counts.houses--; continue; }
  T0.fronts++;
  const gaps = hits.map((r) => r.d + 0.15).sort((a, b) => a - b), gap = gaps[Math.floor(gaps.length / 2)];
  // (the build found the DRAWN paving at the façade: the sidewalk carried on to the wall, viewer/surfaces.js; the city
  // draws no garden there) -> on the line too
  if (gap < 1.0 || (!recordOf(String(f.bu), gap) && skips[String(f.bu).split("/").pop()] === "online")) { counts.onLine++; T0.onLine++; continue; }
  counts.gardenFronts++; T0.garden++;
  const house = type === "villa" || type === "terraced";
  if (house) counts.houseGardenFronts++;
  // access by data: the UrbIS driveways (CR42L) on this line, ramps (dropped kerbs)
  const linePts = hits.map((r) => [r.ox + nx * r.d, r.oz + nz * r.d]);
  const nearLine = (x, z, tol) => linePts.some(([px, pz]) => Math.hypot(px - x, pz - z) < tol);
  const myDrives = drives.filter((l) => l.some(([x, z]) => nearLine(x, z, 1.5)));
  const onDrive = (x, z) => myDrives.some((l) => l.some((p, k) => k && segD(x, z, l[k - 1][0], l[k - 1][1], p[0], p[1]) < 0.8));
  // what the line carries, ray by ray: a piece, else a driveway the data draws there (access by design), else open
  const meet = Object.fromEntries([...KINDS, "drive"].map((k) => [k, 0]));
  let closedN = 0, openN = 0;
  const rayKind = hits.map((r) => {
    const m = rayMeets(r.ox, r.oz, r.ox + nx * (r.d + 0.4), r.oz + nz * (r.d + 0.4));
    const k = m || (onDrive(r.ox + nx * r.d, r.oz + nz * r.d) || r.cls === SC.ramp ? "drive" : null);
    if (k) { meet[k]++; closedN++; } else openN++;
    return k;
  });
  const closed = closedN >= 0.5 * hits.length;
  if (DEBUG) { const [qx, qz] = DEBUG.split(",").map(Number); if (Math.hypot(linePts[0][0] - qx, linePts[0][1] - qz) < 0.3) console.error(JSON.stringify({ bu: f.bu, type, gap, W, door: f.door, rec: recordOf(String(f.bu), gap), rays: hits.map((r, i) => [r1(r.ox), r1(r.oz), r1(r.d), rayKind[i]]) })); }
  const kind = closed ? [...KINDS, "drive"].reduce((a, k) => (meet[k] > meet[a] ? k : a), "wall") : "open";
  // access: the door's path onto the line, driveways in front of the face
  const lineAt = (u) => hits.reduce((a, q) => (Math.abs(((q.ox - f.a[0]) * tx + (q.oz - f.a[1]) * tz) - u) < Math.abs(((a.ox - f.a[0]) * tx + (a.oz - f.a[1]) * tz) - u) ? q : a));
  let path = null;
  if (f.door) { const r = lineAt(f.door.u); path = [f.door.x + nx * (r.d + 0.15), f.door.z + nz * (r.d + 0.15)]; }
  const driveSpans = myDrives.map((l) => l.filter(([x, z]) => nearLine(x, z, 1.5)));
  if (!driveSpans.length) { const rp = hits.filter((r) => r.cls === SC.ramp); if (rp.length >= 3) driveSpans.push(rp.map((r) => [r.ox + nx * r.d, r.oz + nz * r.d])); }
  const gateNear = (x, z, tol, kind = null) => gates.some((g) => (kind == null || g.kind === kind) && segD(x, z, g.x, g.z, g.bx, g.bz) < tol);
  if (closed) { counts.closed++; T0.closed++; counts[kind === "gate" ? "gateKind" : kind] = (counts[kind === "gate" ? "gateKind" : kind] || 0) + 1; T0[kind] = (T0[kind] || 0) + 1; } else { counts.open++; T0.open++; }
  const strip = hits.map((r) => [r.ox + nx * r.d * 0.5, r.oz + nz * r.d * 0.5]);
  const fore = strip.filter(([x, z]) => inForecourt(x, z)).length >= 0.3 * strip.length;
  if (path && !(fore && !closed)) {
    counts.pathFronts++; T0.path++;
    // gated: a leaf at the path, or the path walks through a gated driveway
    if (gateNear(path[0], path[1], 2.5) || (onDrive(path[0], path[1]) && gateNear(path[0], path[1], 3.0, 1))) { counts.pathGated++; T0.pathGated++; }
    else if (house) {
      // why no leaf: the front is open, the path walks into an ungated driveway, an opening drawn (piers) without a
      // leaf, or no opening at all (the solid line runs across the path)
      const piers = pillars.filter(([x, z]) => Math.hypot(x - path[0], z - path[1]) < 1.6).length;
      const why = kind === "open" ? "frontOpen" : onDrive(path[0], path[1]) ? "inDrive" : piers >= 2 ? "leafMissing" : rayMeets(path[0] - nx * 1.0, path[1] - nz * 1.0, path[0] + nx * 0.4, path[1] + nz * 0.4) ? "noOpening" : "gap";
      pathCauses[why] = (pathCauses[why] || 0) + 1;
      items.pathUngated.push({ w: 1, at: at(path[0], path[1]), street: nameAt(path[0], path[1]), type, kind, why });
    }
  }
  if (driveSpans.length) {
    counts.driveFronts++; T0.drive++;
    if (driveSpans.some((sp) => sp.some(([x, z]) => gateNear(x, z, 1.2, 1)))) { counts.driveGated++; T0.driveGated++; }
  }
  if (LIST) {
    const pg = path ? (gateNear(path[0], path[1], 2.5) || (onDrive(path[0], path[1]) && gateNear(path[0], path[1], 3.0, 1)) ? 1 : 2) : 0;
    const dg = driveSpans.length ? (driveSpans.some((sp) => sp.some(([x, z]) => gateNear(x, z, 1.2, 1))) ? 1 : 2) : 0;
    const c0 = path || linePts[Math.floor(linePts.length / 2)];
    fronts.push([r1(c0[0]), r1(c0[1]), nameAt(mx, mz), type, kind, r1(gap), r1(W), pg, dg]);
  }
  if (!closed) {
    if (!house || fore) { counts.openAllowed++; continue; }
    counts.openByMistake++;
    // the cause: where did this frontage's boundary go?
    const rec = recordOf(String(f.bu), gap);
    let cause;
    if (!rec) cause = "noRecord:" + (skips[String(f.bu).split("/").pop()] || (shops.some((p) => ringDist(p.x, p.z, ring) < 6) ? "shopNear" : "faceRules"));
    else if (rec.kind === "open") cause = "ruleOpen";
    else {
      // the open rays: were pieces placed there and cleared by the viewer (main.js), or never placed?
      const placedP = [];
      for (const q of droppedDoc.segs) placedP.push([q[0], q[2], q[3], q[5]]);
      for (const h of droppedDoc.hedges || []) for (let i = 1; i < h.points.length; i++) placedP.push([h.points[i - 1][0], h.points[i - 1][1], h.points[i][0], h.points[i][1]]);
      let dropped = 0;
      hits.forEach((r, i) => { if (rayKind[i]) return; const bx = r.ox + nx * (r.d + 0.4), bz = r.oz + nz * (r.d + 0.4); if (placedP.some((q) => segX(r.ox, r.oz, bx, bz, q[0], q[1], q[2], q[3]))) dropped++; });
      cause = dropped >= 0.5 * openN ? "viewerDrop" : rec.len < 0.75 * W ? "runShort" : "openings";
    }
    causes[cause] = (causes[cause] || 0) + 1;
    items.openByMistake.push({ w: r1(W), at: at(linePts[0][0], linePts[0][1]), street: nameAt(mx, mz), type, gap: r1(gap), cause });
  }
}
// ---- closed driveway gates across a way the player / traffic drives
for (const g of gates) {
  if (g.kind !== 1 || g.open) continue;
  if (!inB(g.mx, g.mz)) continue;
  counts.carGates++;
  let hit = false;
  for (let k = 2; k <= 6 && !hit; k++) { const x = g.x + (g.bx - g.x) * k / 8, z = g.z + (g.bz - g.z) * k / 8; if (driven.inside(x, z, 0.3)) hit = "carriageway"; }   // (the leaves' middle 0.3 m into the carriageway, the test main.js clears by: a gate at the kerb is not across)
  if (!hit) for (const w of ways) { for (let k = 1; k < w.length && !hit; k++) if (segX(g.x, g.z, g.bx, g.bz, w[k - 1][0], w[k - 1][1], w[k][0], w[k][1])) hit = "way"; if (hit) break; }
  if (hit) { counts.gateAcrossDriven++; items.gateAcrossDriven.push({ w: r1(g.w), at: at(g.mx, g.mz), street: nameAt(g.mx, g.mz), by: hit }); }
}
for (const g of gates) { if (!inB(g.mx, g.mz)) continue; counts.gates++; if (g.kind === 0) counts.pedGates++; else if (g.open) counts.carGatesOpen++; }
counts.placedGates = placed.gates;
counts.piers = doc.pillars.filter((p) => inB(p[0], p[2])).length;
for (const k of Object.keys(items)) items[k] = items[k].slice(0, 60);
console.log(JSON.stringify({ tile: T, counts, causes, pathCauses, byType, items, ...(LIST ? { fronts } : {}) }));
