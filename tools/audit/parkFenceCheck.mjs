// GATE: THE PARK FENCES (claude/parkfence; rule park-fence, docs/rules/park-fence.md, docs/PARKFENCE.md).
//   node --import ./tools/road_audit/register.mjs tools/audit/parkFenceCheck.mjs [--quiet] [--json FILE]
// What it checks, per park (Wolvendael, Sauvagère), on the tiles as the city builds them (tools/gate/tileBuild.mjs):
//   1. fresh      data/parkfence/parkfence.json is what tools/parkfence/build.mjs makes from OSM + the obs files now;
//   2. coverage   every 0.5 m of the OSM boundary has a drawn panel / plinth within reach (the line, moved into the park
//                 off the carriageway <= 4 m) unless it is an entrance's opening or a listed gap (a building on the line:
//                 its wall closes the park; the carriageway of an open lane entrance); the gap metres under a ceiling;
//   3. clear      no panel, plinth, pier, post or closed leaf on a public carriageway, in a building footprint or across an
//                 OSM path (every path through the line goes through an entrance);
//   4. entrances  every open entrance has an OSM path through its opening (or ending in it, <= 2.5 m);
//   5. contact    on the drawn ground (main.js gardenGround): a bare panel's foot line 0 floating > CONTACT.float, 0 buried
//                 > CONTACT.bury; a plinth inside its skirt (0.6 m) and buried <= 0.35 m; a pier's base on the ground
//                 (buried <= 0.45 m on its high side); a gate leaf's foot not in the ground;
//   6. budget     <= 18 instanced meshes for both parks (6 iron pieces x 2 stages, 2 stone pieces x 3 LODs); the worst
//                 view's triangles (every iron LOD0 within SHADOW_END, the stone LOD0 within its band, the cards) under a
//                 ceiling; the kit's pieces' triangles under theirs;
//   7. colliders  a box for every drawn panel / plinth / pier / post / leaf (one source), >= 1.3 m tall (the car's band), no
//                 box across an open entrance's passage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
globalThis.location ??= { search: "" };
const QUIET = process.argv.includes("--quiet");
const JSON_OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };

/** ceilings (set 2026-11-23 on the first build; a rise is a regression to look at) */
const CEIL = { gapBuildingM: 5, gapRoadM: 5, viewTris: 140000, pieceTris: { pf_rail: 4000, pf_bars: 1300, pf_mesh: 1800, pf_post: 300, pf_gate2: 8000, pf_gate1: 2400, pf_pier: 1700, pf_plinth: 1000 }, meshes: 18 };

const { build, arc, publicRoad, toLocal } = await imp("tools/parkfence/build.mjs");
const L = await imp("viewer/parkFenceLayout.js");
const { SHADOW_END, STONE_BANDS, CARD_END } = { SHADOW_END: 25, STONE_BANDS: [30, 90, 420], CARD_END: 240 };   // (viewer/parkFence.js: kept in step, the text row below)

// ---- 1. fresh
const doc = J("data/parkfence/parkfence.json");
const realLog = console.log; console.log = () => {};
let fresh;
try { fresh = await build(); } finally { console.log = realLog; }
check("data fresh (build.mjs == data/parkfence/parkfence.json)", JSON.stringify(fresh) === JSON.stringify(doc), "rebuild: node --import ./tools/road_audit/register.mjs tools/parkfence/build.mjs");

// ---- the city: tiles as built (ground, carriageway, buildings)
const { buildTile } = await imp("tools/audit/census/lib_mesh.mjs");
const { streetTile } = await imp("tools/audit/census/lib_street.mjs");
const { footprintIndex } = await imp("tools/audit/census/lib_mesh.mjs");
const { Heightmap } = await imp("viewer/heightmap.js");
const tiles = [...new Set(Object.values(L.docTiles(doc)).flat())].sort();
const city = new Map();
for (const T of tiles) {
  const { d, bDoc } = await buildTile(T);
  const hm = Heightmap.from(d.hdr, d.y, d.orig), gDelta = d.drive?.ground?.delta;
  // main.js gardenGround (the same formula: the drawn terrain, raised to the drive surface's delta where one is drawn)
  const g = !gDelta ? (x, z) => hm.surface(x, z) : (x, z) => {
    const h = hm.h, c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1.001), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1.001);
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, i = r0 * h.cols + c0;
    const v = (k) => { const dl = gDelta[k]; return hm.y[k] + (dl > 0 && dl !== 65535 ? dl * 0.01 : 0); };
    return Math.max(hm.surface(x, z), (v(i) * (1 - fc) + v(i + 1) * fc) * (1 - fr) + (v(i + h.cols) * (1 - fc) + v(i + h.cols + 1) * fc) * fr);
  };
  console.log = () => {};
  let st; try { st = await streetTile(T); } finally { console.log = realLog; }
  city.set(T, { g, driven: st.driven, fp: footprintIndex(bDoc.buildings.filter((b) => b.footprint)) });
}
const manifest = J("data/tiles/manifest.json");
const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
const C = (x, z) => city.get(tileOf(x, z));

// OSM paths (every highway way; the footways are what must go through entrances)
const area = J("data/raw/osm/area.json").elements;
const N = new Map(); for (const e of area) if (e.type === "node") N.set(e.id, e);
const paths = area.filter((e) => e.type === "way" && e.tags?.highway).map((w) => ({ id: w.id, hw: w.tags.highway, pts: w.nodes.map((id) => { const q = N.get(id); return toLocal(q.lon, q.lat); }) }));
const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) !== 0; };
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t); };

const kit = J("models/parkfence/parkfence.json").pieces;
const tris0 = Object.fromEntries(L.PIECES.map((p) => [p, kit[`${p}_lod0`]?.triangles ?? 0]));
const report = { parks: {} };
let worstView = 0, worstAt = null;
for (const [name, park] of Object.entries(doc.parks)) {
  const A = arc(park.ring);
  const R = { panels: park.panels.length, plinths: park.plinths.length, piers: park.piers.length, leaves: park.leaves.length, entrances: park.entrances.length };
  // ---- 2. coverage
  const drawn = [...park.panels, ...park.plinths].map((q) => [q.a, q.b]);
  let uncovered = 0, entM = 0, gapB = 0, gapR = 0; const where = [];
  const inGap = (p) => park.gaps.find((g) => dSeg(p, g.a, g.b) < 4.8);
  for (let s = 0; s < A.L; s += 0.5) {
    const p = A.at(s);
    if (park.entrances.some((e) => Math.abs(((s - e.s + A.L / 2) % A.L + A.L) % A.L - A.L / 2) <= e.half + 0.6)) { entM += 0.5; continue; }
    if (drawn.some(([a, b]) => dSeg(p, a, b) < 4.6)) continue;
    const g = inGap(p);
    if (g?.reason === "building") { gapB += 0.5; continue; }
    if (g?.reason === "carriageway") { gapR += 0.5; continue; }
    uncovered += 0.5; if (where.length < 5) where.push(p.map((v) => v.toFixed(1)).join(","));
  }
  Object.assign(R, { ringM: +A.L.toFixed(0), entranceM: entM, gapBuildingM: gapB, gapRoadM: gapR, uncoveredM: uncovered });
  check(`${name}: the line covers the boundary but the entrances / listed gaps`, uncovered === 0, `${uncovered} m uncovered ${where.join(" ")}; entrances ${entM} m, gaps: building ${gapB} m, carriageway ${gapR} m of ${A.L.toFixed(0)} m`);
  check(`${name}: gap metres under the ceilings`, gapB <= CEIL.gapBuildingM && gapR <= CEIL.gapRoadM, `building ${gapB} <= ${CEIL.gapBuildingM}, carriageway ${gapR} <= ${CEIL.gapRoadM}`);
  // ---- 3. clear: carriageway, buildings, paths
  let onRoad = 0, inBuilding = 0, crossPath = 0; const bad = [], closedOnPath = [];
  const closedLeaves = park.leaves.filter((q) => !q.open).map((q) => [q.hinge, [q.hinge[0] + q.dir[0] * q.w, q.hinge[1] + q.dir[1] * q.w]]);
  const segsOf = [...drawn, ...closedLeaves];
  const isLeaf = new Set(closedLeaves);
  for (const [a, b] of segsOf) {
    for (let k = 0; k <= 8; k++) {
      const x = a[0] + (b[0] - a[0]) * k / 8, z = a[1] + (b[1] - a[1]) * k / 8, c = C(x, z); if (!c) continue;
      if (publicRoad(c.driven, x, z)) { onRoad++; if (bad.length < 4) bad.push(`road ${x.toFixed(1)},${z.toFixed(1)}`); break; }
      if (c.fp.at(x, z, 0.1) >= 0) { inBuilding++; if (bad.length < 4) bad.push(`building ${x.toFixed(1)},${z.toFixed(1)}`); break; }
    }
    // (a CLOSED gate across a path is the observed state of an OSM access=no gate: listed, not a fence across a path)
    if (isLeaf.has(segsOf.find((q) => q[0] === a && q[1] === b))) { for (const w of paths) for (let i = 0; i < w.pts.length - 1; i++) if (segX(a, b, w.pts[i], w.pts[i + 1])) closedOnPath.push(w.id); continue; }
    for (const w of paths) for (let i = 0; i < w.pts.length - 1; i++) if (segX(a, b, w.pts[i], w.pts[i + 1])) { crossPath++; if (bad.length < 4) bad.push(`path ${w.id} ${w.hw} at ${a.map((v) => v.toFixed(1))}`); break; }
  }
  for (const q of [...park.piers, ...park.posts]) { const c = C(...q.at); if (c && publicRoad(c.driven, ...q.at)) { onRoad++; if (bad.length < 4) bad.push(`pier on road ${q.at}`); } if (c && c.fp.at(...q.at, 0) >= 0) { inBuilding++; if (bad.length < 4) bad.push(`pier in building ${q.at}`); } }
  Object.assign(R, { onRoad, inBuilding, crossPath, closedGateOnPath: [...new Set(closedOnPath)] });
  check(`${name}: nothing on a carriageway, in a building or across a path`, !onRoad && !inBuilding && !crossPath, `road ${onRoad}, building ${inBuilding}, path ${crossPath} ${bad.join("; ")}`);
  // ---- 4. entrances: an OSM path through every open one
  const noPath = [];
  for (const e of park.entrances) {
    if (e.state !== "open") continue;
    const u = A.dir(e.s), c = e.at, h = e.w / 2;
    const p0 = [c[0] - u[0] * h, c[1] - u[1] * h], p1 = [c[0] + u[0] * h, c[1] + u[1] * h];
    const through = paths.some((w) => w.pts.some((p, i) => (i < w.pts.length - 1 && segX(p0, p1, p, w.pts[i + 1])) || dSeg(p, p0, p1) < 2.5) || w.pts.some((p, i) => i < w.pts.length - 1 && dSeg(c, p, w.pts[i + 1]) < 2.5));
    // (or the street it opens straight onto, named in the obs file: `opensOnto`, within 5 m)
    const onto = e.opensOnto && paths.find((w) => `way/${w.id}` === e.opensOnto)?.pts.some((p, i, P) => i < P.length - 1 && dSeg(c, p, P[i + 1]) < 5);
    if (!through && !onto) noPath.push(e.osm);
    if (!through && onto) (R.opensOnto ??= []).push(`${e.osm} -> ${e.opensOnto}`);
  }
  R.entrancesNoPath = noPath;
  check(`${name}: every open entrance has its OSM path`, !noPath.length, noPath.length ? `no path: ${noPath.join(", ")}` : `${park.entrances.filter((e) => e.state === "open").length} open entrances`);
  // ---- 5. contact + 7. colliders + 6. view triangles, tile by tile on the built ground
  let floatN = 0, buryN = 0, plinthBad = 0, pierBad = 0, leafBad = 0, colMiss = 0, colShort = 0, colAcross = 0, nPanel = 0;
  const contactBad = [];
  const insts = [];
  for (const T of tiles) {
    const c = city.get(T); if (!c) continue;
    const r = L.tileItems(park, T, c.g);
    for (const f of r.fitted) {
      if (f.kind === "plinth") {
        const k = L.panelContact(f, c.g);
        if (k.float > 0.55 || k.bury > 0.35) { plinthBad++; if (contactBad.length < 4) contactBad.push(`plinth ${f.a.map((v) => v.toFixed(1))} float ${k.float.toFixed(2)} bury ${k.bury.toFixed(2)}`); }
      } else {
        nPanel++;
        const k = L.panelContact(f, c.g);
        if (k.float > L.CONTACT.float) { floatN++; if (contactBad.length < 4) contactBad.push(`${f.kind} floats ${k.float.toFixed(2)} at ${f.a.map((v) => v.toFixed(1))}`); }
        if (k.bury > L.CONTACT.bury) { buryN++; if (contactBad.length < 4) contactBad.push(`${f.kind} buried ${k.bury.toFixed(2)} at ${f.a.map((v) => v.toFixed(1))}`); }
      }
    }
    for (const it of r.inst.pf_pier) {
      const x = it.m[12], y = it.m[13], z = it.m[14], ux = it.m[0], uz = it.m[2], s = Math.hypot(ux, uz), hw = 0.35 * s; const ax = ux / s, az = uz / s;
      let hi = -Infinity, lo = Infinity;
      for (const [p, q] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const gy = c.g(x + (ax * p - az * q) * hw, z + (az * p + ax * q) * hw); hi = Math.max(hi, gy); lo = Math.min(lo, gy); }
      if (lo < y - 0.5 || hi - y > 0.45) { pierBad++; if (contactBad.length < 4) contactBad.push(`pier ${x.toFixed(1)},${z.toFixed(1)} base ${y.toFixed(2)} ground ${lo.toFixed(2)}..${hi.toFixed(2)}`); }
    }
    for (const it of [...r.inst.pf_gate2, ...r.inst.pf_gate1]) {
      const x = it.m[12], y = it.m[13], z = it.m[14];
      // (the leaf's local x scaled to its width: m[0], m[2] = dir x scale; its foot 8 cm x its height scale over y)
      const wx = it.m[0], wz = it.m[2];
      for (const f of [0, 0.5, 1]) { const gx = x + wx * (it.piece === "pf_gate2" ? 2.0 : 1.1) * f, gz = z + wz * (it.piece === "pf_gate2" ? 2.0 : 1.1) * f; if (c.g(gx, gz) > y + 0.08 * it.m[5] + 0.05) { leafBad++; break; } }
    }
    // colliders: a box per drawn panel / plinth, pier, post, leaf
    const boxes = r.boxes;
    const fittedKeys = new Set(r.fitted.map((f) => `${f.a[0].toFixed(2)},${f.a[2].toFixed(2)}`));
    const boxKeys = new Set(boxes.map((b) => `${b.a[0].toFixed(2)},${b.a[2].toFixed(2)}`));
    for (const k of fittedKeys) if (!boxKeys.has(k)) colMiss++;
    const want = r.counts.pf_pier + r.counts.pf_post + r.counts.pf_gate2 + r.counts.pf_gate1 + new Set(r.fitted.map((f) => `${f.a}|${f.b}`)).size;
    if (boxes.length < want) colMiss += want - boxes.length;
    for (const b of boxes) if (b.h < 1.0) colShort++;
    for (const e of park.entrances) {
      if (e.state !== "open") continue;
      const u = A.dir(e.s), h = e.w / 2 - 0.3, p0 = [e.at[0] - u[0] * h, e.at[1] - u[1] * h], p1 = [e.at[0] + u[0] * h, e.at[1] + u[1] * h];
      for (const b of boxes) if (!b.leaf && segX(p0, p1, [b.a[0], b.a[2]], [b.b[0], b.b[2]])) colAcross++;
      for (const b of boxes) if (b.leaf && dSeg([b.b[0], b.b[2]], p0, p1) < 0.3) colAcross++;      // an open leaf's tip in the passage
    }
    for (const p of L.PIECES) for (const it of r.inst[p]) insts.push({ p, c: it.c });
  }
  // the worst view: every 10 m along the line, at 1.7 m over it, what the stages would draw (LOD0 tris)
  for (let s = 0; s < A.L; s += 10) {
    const [x, z] = A.at(s); let t = 0;
    for (const it of insts) {
      const d = Math.hypot(it.c[0] - x, it.c[2] - z);
      if (L.IRON.includes(it.p)) { if (d < SHADOW_END + 2) t += tris0[it.p]; else if (d < CARD_END) t += 2; }
      else if (d < STONE_BANDS[0] * 1.1) t += tris0[it.p]; else if (d < STONE_BANDS[1] * 1.1) t += 60;
    }
    if (t > worstView) { worstView = t; worstAt = [x.toFixed(0), z.toFixed(0)]; }
  }
  Object.assign(R, { panelsFitted: nPanel, floating: floatN, buried: buryN, plinthOut: plinthBad, pierOut: pierBad, leafInGround: leafBad, colliderMissing: colMiss, colliderShort: colShort, colliderAcrossEntrance: colAcross });
  check(`${name}: contact with the drawn ground (0 floating, 0 buried beyond tolerance)`, !floatN && !buryN && !plinthBad && !pierBad && !leafBad, `${nPanel} bare panels: floating ${floatN}, buried ${buryN}; plinths out ${plinthBad}; piers ${pierBad}; leaves ${leafBad} ${contactBad.join("; ")}`);
  check(`${name}: colliders match the drawn line`, !colMiss && !colShort && !colAcross, `missing ${colMiss}, under 1.3 m ${colShort}, across an open entrance ${colAcross}`);
  report.parks[name] = R;
}
// ---- 6. budget
const meshes = L.IRON.length * 2 + L.STONE.length * 3;
check("draw budget: instanced meshes for both parks", meshes <= CEIL.meshes, `${meshes} <= ${CEIL.meshes} (whatever the length)`);
check("triangle budget: the worst view along the lines", worstView <= CEIL.viewTris, `${worstView} <= ${CEIL.viewTris} at ${worstAt}`);
const overPiece = L.PIECES.filter((p) => tris0[p] > CEIL.pieceTris[p]);
check("triangle budget: the kit's LOD0 pieces", !overPiece.length, L.PIECES.map((p) => `${p} ${tris0[p]}`).join(", "));
// the viewer's constants kept in step with this check's copies
{
  const src = fs.readFileSync(path.join(ROOT, "viewer/parkFence.js"), "utf8");
  const ok = /STONE_BANDS = \[30, 90, 420\]/.test(src) && /CARD_END = 240, SHADOW_END = 25/.test(src);
  check("viewer/parkFence.js bands = the check's", ok, "STONE_BANDS [30, 90, 420], CARD_END 240, SHADOW_END 25");
}
report.worstView = { tris: worstView, at: worstAt }; report.meshes = meshes;

const fails = rows.filter((r) => r[1] === "FAIL");
if (!QUIET || fails.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}${r[2] ? `  (${r[2]})` : ""}`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
console.log(`park fences: ${rows.length - fails.length}/${rows.length} pass; ${Object.entries(report.parks).map(([k, r]) => `${k} ${r.panels} panels, gaps ${r.gapBuildingM}+${r.gapRoadM} m, floating ${r.floating}, buried ${r.buried}`).join("; ")}; worst view ${worstView} tris`);
process.exit(fails.length ? 1 : 0);
