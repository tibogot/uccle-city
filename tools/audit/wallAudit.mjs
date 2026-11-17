// OUTER SHELL AUDIT (citydefects 2026-11-16, holes 2026-11-17): per building of data/tiles/<T>/buildings.{json,bin}, is
// its outer shell closed from the street side, as viewer/facadeGeom.js draws it (viewer/wallRepair.js applied, FrontSide
// wall material: a triangle wound inward is culled from outside = a hole)?
//   partial  every outer footprint edge whose UrbIS wall triangles cover less than wallRepair.js MIN_COVER of it (with
//            >= MIN_HOLE m2 uncovered), before (the solids as they are) and after (repairWalls rebuilds them; "after" re-runs
//            it on the repaired triangles: anything still open = a hole left). A stretch with another building against it
//            is a party wall and not counted (party test: a point 0.4 m out inside another footprint). "recess": loggias,
//            an oriel over a recessed ground floor, a roof overhanging its walls (the building's own wall behind each
//            uncovered sample and a soffit over it close the shell: wallRepair.js leaves it as it is).
//   inward   wall triangles lying on an outer footprint edge (all corners within 0.2 m of its line, inside its span, not a
//            party stretch) whose WINDING faces into the footprint: culled from the street. Split: UrbIS triangles kept as
//            they are / triangles the repair made (rebuilt strips, clipped remains). m2 and the worst buildings.
//   roofOnly buildings whose every open (non-party) edge has under 15 % wall (a canopy on posts, a roof-only solid):
//            counted and listed, not a gate (UrbIS draws real canopies so; the repair leaves them open when nothing in
//            them sees a back face)
//   node tools/audit/wallAudit.mjs [--out FILE] [--repair MODULE] T... | --all   (the merge gate: tools/audit/shellGate.mjs)
//   (--repair: another wallRepair.js, e.g. the old one from git show, for the "before" counts)
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const oi = argv.indexOf("--out"), OUT = oi >= 0 ? resolve(ROOT, argv.splice(oi, 2)[1]) : null;
const ri = argv.indexOf("--repair"), REPAIR = ri >= 0 ? resolve(argv.splice(ri, 2)[1]) : join(ROOT, "viewer/wallRepair.js");
const { repairWalls } = await import(pathToFileURL(REPAIR).href);
const ALL = argv.includes("--all");
const TILES = ALL ? readdirSync(join(ROOT, "data/tiles")).filter((t) => existsSync(join(ROOT, "data/tiles", t, "buildings.bin"))) : argv.filter((a) => !a.startsWith("--")).map((t) => t.toUpperCase());

const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const triOf = (p) => {
  const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
  const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz);
  return L > 1e-9 ? { p, n: [nx / L, ny / L, nz / L], area: L / 2 } : null;
};
const tot = { buildings: 0, edges: 0, partial: 0, partialArea: 0, recess: 0, after: 0, inwardUrbis: 0, inwardRepair: 0, inwardM2: 0, buildingsWithInward: 0, roofOnly: 0, worst: [], worstInward: [], afterList: [], roofOnlyList: [] };
const per = {};
const keepWorst = (list, item, key, n = 30) => { list.push(item); list.sort((p, q) => q[key] - p[key]); list.length = Math.min(n, list.length); };
for (const T of TILES) {
  const d = join(ROOT, "data/tiles", T);
  const doc = JSON.parse(readFileSync(join(d, "buildings.json"), "utf8"));
  const buf = readFileSync(join(d, "buildings.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const V = new Uint32Array(ab, 0, 2)[0], Tn = new Uint32Array(ab, 0, 2)[1];
  const P = new Float32Array(ab, 8, V * 3), I = new Uint32Array(ab, 8 + V * 12, Tn * 3);
  const tri = (t) => triOf([0, 1, 2].map((q) => { const i = I[t * 3 + q]; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; }));
  // a coarse grid of footprints for the party test
  const grid = new Map(), key = (i, j) => `${i},${j}`;
  doc.buildings.forEach((b, bi) => {
    const r = b.footprint[0]; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    for (let i = Math.floor(x0 / 16); i <= Math.floor(x1 / 16); i++) for (let j = Math.floor(z0 / 16); j <= Math.floor(z1 / 16); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(bi); }
  });
  const pt = { buildings: 0, edges: 0, partial: 0, holeM2: 0, recess: 0, roofOnly: 0, after: 0, inwardUrbis: 0, inwardRepair: 0, inwardM2: 0 };
  doc.buildings.forEach((b, bi) => {
    const tris = [], soffits = [];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) { const o = tri(t); if (o) tris.push(o); }
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) { const o = tri(t); if (o) soffits.push(o); }
    const party = (x, z) => (grid.get(key(Math.floor(x / 16), Math.floor(z / 16))) || []).some((o) => o !== bi && pip(x, z, doc.buildings[o].footprint[0]));
    const id = b.id.split("/").pop();
    const r = repairWalls(tris, b.footprint[0], b.base, { fix: true, party, roofs: soffits });
    pt.buildings++;
    pt.edges += r.edges.length;
    const openE = r.edges.filter((e) => !e.party);
    if (openE.length >= 3 && openE.every((e) => e.cover < 0.15)) { pt.roofOnly++; if (tot.roofOnlyList.length < 200) tot.roofOnlyList.push({ tile: T, id, height: +b.height.toFixed(1) }); }
    for (const e of r.edges) {
      if (e.recess) pt.recess++;
      if (!e.rebuilt) continue;
      pt.partial++; pt.holeM2 += e.hole;
      keepWorst(tot.worst, { tile: T, id, a: e.a.map((v) => +v.toFixed(2)), b: e.b.map((v) => +v.toFixed(2)), cover: e.cover, hole: e.hole }, "hole");
    }
    // after: re-run on the repaired triangles (nothing left to rebuild = 0)
    const r2 = repairWalls(r.tris, b.footprint[0], b.base, { fix: false, party, roofs: soffits });
    for (const e of r2.edges) if (e.cover < 0.85 && e.hole >= 1.0 && !e.party && !e.recess) { pt.after++; keepWorst(tot.afterList, { tile: T, id, a: e.a.map((v) => +v.toFixed(2)), b: e.b.map((v) => +v.toFixed(2)), cover: e.cover, hole: e.hole }, "hole", 50); }
    // inward: the drawn wall triangles on an outer edge, wound into the footprint (the geometric normal, not t.n)
    const ring = b.footprint[0], n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
    let bIn = 0, bInM2 = 0;
    for (const t of r.tris) {
      const g = triOf(t.p);
      if (!g || Math.abs(g.n[1]) > 0.3) continue;
      const cx = (t.p[0][0] + t.p[1][0] + t.p[2][0]) / 3, cz = (t.p[0][2] + t.p[1][2] + t.p[2][2]) / 3;
      let on = false;
      for (let i = 0; i < n && !on; i++) {
        const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n], L = Math.hypot(bx - ax, bz - az);
        if (L < 0.25) continue;
        const tx = (bx - ax) / L, tz = (bz - az) / L;
        on = t.p.every((q) => { const dx = q[0] - ax, dz = q[2] - az, u = dx * tx + dz * tz; return Math.abs(dx * -tz + dz * tx) < 0.2 && u > -0.2 && u < L + 0.2; });
      }
      if (!on) continue;
      const h = Math.hypot(g.n[0], g.n[2]), ox = g.n[0] / h, oz = g.n[2] / h;
      const inF = pip(cx + ox * 0.3, cz + oz * 0.3, ring), inB = pip(cx - ox * 0.3, cz - oz * 0.3, ring);
      if (!(inF && !inB)) continue;                                       // faces out (or the test is unclear: a sliver)
      if (party(cx + ox * 0.4, cz + oz * 0.4) || party(cx - ox * 0.4, cz - oz * 0.4)) continue;
      if (t.rebuilt || t.clipped) pt.inwardRepair++; else pt.inwardUrbis++;
      bIn++; bInM2 += g.area;
    }
    if (bIn) { tot.buildingsWithInward++; pt.inwardM2 += bInM2; keepWorst(tot.worstInward, { tile: T, id, tris: bIn, m2: Math.round(bInM2 * 10) / 10 }, "m2"); }
  });
  pt.holeM2 = Math.round(pt.holeM2); pt.inwardM2 = Math.round(pt.inwardM2);
  per[T] = pt;
  for (const k of ["buildings", "edges", "partial", "recess", "roofOnly", "after", "inwardUrbis", "inwardRepair", "inwardM2"]) tot[k] += pt[k];
  tot.partialArea += pt.holeM2;
  console.log(`${T}: ${pt.buildings} buildings, ${pt.edges} wall edges, partial ${pt.partial} (${pt.holeM2} m2) after ${pt.after}, recess ${pt.recess}, inward on outer edges: UrbIS ${pt.inwardUrbis} / repair ${pt.inwardRepair} tris (${pt.inwardM2} m2)`);
}
console.log(JSON.stringify({ ...tot, worst: tot.worst.slice(0, 8), worstInward: tot.worstInward.slice(0, 12), roofOnlyList: tot.roofOnlyList.slice(0, 12) }, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify({ summary: tot, tiles: per }, null, 1));
