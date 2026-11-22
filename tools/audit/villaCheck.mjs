// GATE `villa` (claude/villa1, rules villa-budget, villa-joins, villa-colliders; docs/VILLA.md): the villa on Av. du
// Prince d'Orange, checked offline from the shipped files (models/villa/*.glb / *.json) and the viewer's own code.
//   1. PLACEMENT  viewer/villa/villaPlot.js's frame = models/villa/site.json's; the hide lists are full UrbIS URIs that
//                 match a solid of tile H9 (a short id hid nothing: the old house's roof stood through the villa, seen
//                 2026-11-22); the plot rings inside tile H9.
//   2. BUDGETS    download (villa.glb + interior.glb), LOD0 / LOD1 / LOD2 triangles and draws (one per slot), the interior
//                 cell's triangles and draws (Cell + Soft + Glass), every interior primitive carrying the three bakes.
//   3. JOINS      tools/mesh_audit/contact.js on LOD0 + the gate + the paved grounds (viewer/villa/villaGrounds.js, built
//                 here with the tile's own heightmap) against the city's terrain (tile H9's DTM, the heightmap.js lookup):
//                 0 floating, 0 overhang (rule model-meets-ground).
//   4. COLLIDERS  the car's blockers from LOD0 (viewer/heroColliders.js carBlockersSync, the drive surface = the terrain):
//                 the drive lane gate -> garage right bay is FREE; the closed gate's rings (villaCity.js leafRing)
//                 close the gate's mouth; the garage walls stop the car; the walker's cell collider (Collider) has a
//                 floor under every spawn point / probe, the stair's risers <= 0.2 m, the pool a floor.
//   node --import ./tools/road_audit/register.mjs tools/audit/villaCheck.mjs [--quiet]
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
globalThis.location ??= { search: "" };
const ROOT = new URL("../../", import.meta.url);
const QUIET = process.argv.includes("--quiet");
const imp = (p) => import(pathToFileURL(new URL(p, ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);
const J = (p) => JSON.parse(readFileSync(new URL(p, ROOT), "utf8"));
const fails = [], rows = [];
const check = (ok, what, detail = "") => { rows.push(`${ok ? "PASS" : "FAIL"} ${what}${detail ? ": " + detail : ""}`); if (!ok) fails.push(what); };

// budgets (round 1, 2026-11-22): measured + headroom; raising one is a reviewed change
const B = { mb: 5.0, lod0: 60000, lod1: 20000, lod2: 1500, draws: 9, cellTris: 140000, cellDraws: 16 };

const site = J("models/villa/site.json"), notes = J("models/villa/villa.json"), info = J("models/villa/interior.json");
const plot = await imp("viewer/villa/villaPlot.js");
// ---- 1. placement
const F = site.frame;
check(Math.abs(plot.FRAME.origin[0] - F.origin_city[0]) < 1e-3 && Math.abs(plot.FRAME.origin[1] - F.origin_city[1]) < 1e-3 && Math.abs(plot.FRAME.rotationY - F.rotation_y_rad) < 1e-9,
  "villaPlot.js frame = site.json frame");
const bj = J("data/tiles/H9/buildings.json").buildings;
const ids = new Set(bj.map((b) => String(b.id))), bus = new Set(bj.map((b) => String(b.attrs?.BU_ID || "")));
check(notes.placement.hides_solids.every((s) => s.startsWith("https://") && ids.has(s)) && notes.placement.hides_bu_ids.every((s) => s.startsWith("https://") && bus.has(s)),
  "hide lists = full UrbIS URIs present in tile H9", JSON.stringify(notes.placement.hides_bu_ids));
const tb = J("data/tiles/manifest.json").tiles.find((t) => t.name === "H9").bounds;
check(plot.CLEAR_RING.every(([x, z]) => x > tb.x[0] && x < tb.x[1] && z > tb.z[0] && z < tb.z[1]), "the plot inside tile H9");
const [px, pz] = plot.toCity(9.6, 20);
const [sx, sz] = [F.origin_city[0] + F.u[0] * 9.6 + F.w[0] * 20, F.origin_city[1] + F.u[1] * 9.6 + F.w[1] * 20];
check(Math.hypot(px - sx, pz - sz) < 1e-3, "villaPlot.toCity = site.json's axes");

// ---- 2. budgets
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const ext = await readGlb(new URL("models/villa/villa.glb", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const cell = await readGlb(new URL("models/villa/interior.glb", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const mb = (statSync(new URL("models/villa/villa.glb", ROOT)).size + statSync(new URL("models/villa/interior.glb", ROOT)).size) / 1048576;
check(mb <= B.mb, `download <= ${B.mb} MB`, `${mb.toFixed(2)} MB`);
const tri = (parts, node) => parts.filter((p) => p.node === node).reduce((s, p) => s + p.index.length / 3, 0);
const draws = (parts, node) => parts.filter((p) => p.node === node).length;
for (const [node, lim] of [["Villa", B.lod0], ["Villa_lod1", B.lod1], ["Villa_lod2", B.lod2]]) {
  check(tri(ext.parts, node) <= lim && draws(ext.parts, node) <= B.draws, `${node} <= ${lim} tris, <= ${B.draws} draws`, `${tri(ext.parts, node)} tris, ${draws(ext.parts, node)} draws`);
}
const cellTris = ["Cell", "Soft", "Glass"].reduce((s, n) => s + tri(cell.parts, n), 0), cellDraws = ["Cell", "Soft", "Glass"].reduce((s, n) => s + draws(cell.parts, n), 0);
check(cellTris <= B.cellTris && cellDraws <= B.cellDraws, `interior cell <= ${B.cellTris} tris, <= ${B.cellDraws} draws`, `${cellTris} tris, ${cellDraws} draws`);
const cj = cell.json;
const prims = cj.meshes.flatMap((m, mi) => m.primitives.map((p) => ({ p, node: cj.nodes.find((n) => n.mesh === mi)?.name })));
const unbaked = prims.filter(({ p, node }) => (node === "Cell" || node === "Soft") && !["_LSKY", "_LSUN", "_LNIGHT"].every((a) => a in p.attributes));
check(unbaked.length === 0, "every interior primitive carries the sky / sun / night bakes", unbaked.length ? `${unbaked.length} without` : "");

// ---- 3. joins: LOD0 + gate + grounds vs the terrain
const { Heightmap } = await imp("viewer/heightmap.js");
const hdr = J("data/tiles/H9/terrain.json");
const hm = new Heightmap(hdr, readFileSync(new URL("data/tiles/H9/terrain.u16", ROOT)).buffer.slice(0));
const THREE = await import(pathToFileURL(new URL("tools/worker/node_modules/three/build/three.module.js", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);
const rootM = new THREE.Matrix4().compose(new THREE.Vector3(...notes.placement.city_local_position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), notes.placement.rotation_y_rad), new THREE.Vector3(1, 1, 1));
const toWorld = (p) => {
  const P = new Float64Array(p.positions.length), v = new THREE.Vector3();
  for (let i = 0; i < P.length; i += 3) { v.set(p.positions[i], p.positions[i + 1], p.positions[i + 2]).applyMatrix4(rootM); P[i] = v.x; P[i + 1] = v.y; P[i + 2] = v.z; }
  return { ...p, positions: P };
};
const model = ext.parts.filter((p) => ["Villa", "Villa_gateL", "Villa_gateR"].includes(p.node)).map(toWorld);
// the paved grounds as the viewer builds them (the same function, the tile's heightmap)
const groundAt = (x, z) => hm.surface(x, z);
const GG = await imp("viewer/villa/villaGroundsGeom.js");
const vv = new THREE.Vector3();
const gg = GG.groundsGeometry({ notes, toWorld: (u, w) => { vv.set(u, 0, w).applyMatrix4(rootM); return [vv.x, vv.z]; }, groundAt });
model.push({ name: "grounds", node: "grounds", slot: "grounds", positions: Float64Array.from(gg.P), index: Uint32Array.from(gg.I) });
// the terrain: 0.5 m cells over the plot
const terr = (() => {
  const P = [], I = []; const xs = [], zs = [];
  const ring = plot.CLEAR_RING; const x0 = Math.min(...ring.map((r) => r[0])) - 6, x1 = Math.max(...ring.map((r) => r[0])) + 6, z0 = Math.min(...ring.map((r) => r[1])) - 6, z1 = Math.max(...ring.map((r) => r[1])) + 6;
  const n = Math.ceil((x1 - x0) / 0.5), m = Math.ceil((z1 - z0) / 0.5);
  for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) { const x = x0 + i * 0.5, z = z0 + j * 0.5; P.push(x, hm.surface(x, z), z); }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; I.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2); }
  return { name: "terrain", positions: Float64Array.from(P), index: Uint32Array.from(I) };
})();
const { auditContact } = await imp("tools/mesh_audit/contact.js");
const rc = auditContact(model, [terr], {});
const frameOfC = (x, z) => [(x - F.origin_city[0]) * F.u[0] + (z - F.origin_city[1]) * F.u[1], (x - F.origin_city[0]) * F.w[0] + (z - F.origin_city[1]) * F.w[1]];
const cnt = (k) => (rc.items || []).filter((x) => x.kind === k).length;
const floating = rc.summary?.floating ?? cnt("floating"), overhang = rc.summary?.overhang ?? cnt("overhang");
check(floating === 0 && overhang === 0, "joins: LOD0 + gate + grounds meet the terrain (contact.js: 0 floating, 0 overhang)", `floating ${floating}, overhang ${overhang}${floating + overhang ? " at (u, h, w) " + JSON.stringify((rc.items || []).filter((x) => x.kind !== "opening").slice(0, 30).map((x) => { const [u, w] = frameOfC(x.at[0], x.at[2]); return [x.kind[0], +u.toFixed(2), +x.at[1].toFixed(2), +w.toFixed(2), x.part ?? ""]; })) : ""}`);

// ---- 4. colliders
const H = await imp("viewer/heroColliders.js");
const T = [];
for (const p of model.slice(0, -1)) {
  if (!p.node.startsWith("Villa") || p.node !== "Villa" || /glow/.test(p.slot)) continue;
  for (let k = 0; k < p.index.length; k++) { const i = p.index[k] * 3; T.push(p.positions[i], p.positions[i + 1], p.positions[i + 2]); }
}
const blocks = H.carBlockersSync(Float32Array.from(T), groundAt);
const frameOf = (x, z) => [(x - F.origin_city[0]) * F.u[0] + (z - F.origin_city[1]) * F.u[1], (x - F.origin_city[0]) * F.w[0] + (z - F.origin_city[1]) * F.w[1]];
const inLane = (u, w) => u > 7.0 && u < 30.0 && w > 19.3 && w < 21.3;
let laneHits = 0, garageWall = 0;
for (const b of blocks) for (const r of b.rings) {
  const c = r.reduce((s, [x, z]) => [s[0] + x / r.length, s[1] + z / r.length], [0, 0]);
  const [u, w] = frameOf(...c);
  if (inLane(u, w)) laneHits++;
  if (u > 19.6 && u < 30.8 && Math.abs(w - 22.75) < 0.4) garageWall++;
}
check(laneHits === 0, "the drive lane gate -> garage right bay is free of car blockers", `${laneHits} blocker cells in it`);
check(garageWall > 0, "the garage's south wall stops the car", `${garageWall} cells`);
// the parked cars stay out of that lane (villa.json places, the car pack's ~1.9 x 4.7 m footprint)
const carsInLane = notes.garage.places.filter((p) => p.kind === "car" && Math.abs(p.w - 20.3) < 2.0 && p.u > 14);
check(carsInLane.length === 0, "no parked car in the garage's right bay (the player's)", JSON.stringify(carsInLane));
// the closed gate spans its mouth (villaCity.js leafRing: hinge + length along w)
const gL = notes.parts.gateL, gR = notes.parts.gateR;
const spanL = [gL.hinge_uw[1], gL.hinge_uw[1] + gL.length], spanR = [gR.hinge_uw[1] - gR.length, gR.hinge_uw[1]];
const gap = spanR[0] - spanL[1];
check(spanL[0] <= notes.gate.w[0] + 0.05 && spanR[1] >= notes.gate.w[1] - 0.05 && gap < 0.1, "the closed gate's leaves close the mouth", `gap ${gap.toFixed(3)} m`);
// the walker: floors under the spawn points / probes; the stair walkable; the pool has a floor
const col = cell.parts.find((p) => p.node === "Collider");
const down = (u, w, h) => {
  let best = -Infinity; const P = col.positions, I = col.index;
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
    const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-9) continue;
    const l1 = ((bz - cz) * (u - cx) + (cx - bx) * (w - cz)) / d, l2 = ((cz - az) * (u - cx) + (ax - cx) * (w - cz)) / d, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1];
    if (y <= h - 100 + 0.05 && y > best) best = y;
  }
  return best + 100;
};
const spawns = Object.entries(info.spawn).filter(([k]) => k !== "gate_out" && k !== "terrace");   // (outside: the terrace is LOD0's, the hero BVH)
const noFloor = spawns.filter(([, [u, y, w]]) => Math.abs(down(u, w, y + 100 + 0.5) - (y + 100)) > 0.06).map(([k]) => k);
check(noFloor.length === 0, "a walkable floor under every interior spawn point", noFloor.join(", "));
const s = { u0: 21.42, going: 0.28, w: 10.4 };
let worst = 0, prev = down(s.u0 - 0.3, s.w, notes.levels_taw.ground + 0.3);
for (let k = 0; k < 22; k++) { const h = down(s.u0 + k * s.going + 0.14, s.w, notes.levels_taw.first + 0.3); worst = Math.max(worst, h - prev); prev = h; }
check(worst <= 0.2 && worst > 0.1, "the stair: every riser walkable (<= 0.2 m)", `worst riser ${worst.toFixed(3)} m`);
const P = notes.pool, pf = down((P.u0 + P.u1) / 2, (P.w0 + P.w1) / 2, P.water + 0.3);
check(Math.abs(pf - P.floor) < 0.05, "the pool has a floor (the walker stands in it, never falls through)", `floor ${pf.toFixed(2)} (want ${P.floor.toFixed(2)})`);
const tChk = info.no_terrain.some((b) => b.u[0] <= P.u0 && b.u[1] >= P.u1 && b.w[0] <= P.w0 && b.w[1] >= P.w1);
check(tChk, "the terrain is ignored over the pool and in the house (no_terrain boxes)");

if (!QUIET || fails.length) console.log(rows.join("\n"));
console.log(fails.length ? `villa: ${fails.length} check(s) FAILED` : `villa: all ${rows.length} checks pass`);
process.exit(fails.length ? 1 : 0);

