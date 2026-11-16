// PARTIAL WALLS AUDIT (citydefects 2026-11-16): per building of data/tiles/<T>/buildings.{json,bin}, every outer footprint
// edge whose UrbIS wall triangles cover less than viewer/wallRepair.js MIN_COVER of it (with >= MIN_HOLE m2 uncovered),
// before (the solids as they are) and after (repairWalls rebuilds them). A stretch with another building against it is a
// party wall and not counted (party test: a point 0.4 m out inside another footprint).
//   node tools/audit/wallAudit.mjs [--out FILE] T... | --all
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { repairWalls } = await import(pathToFileURL(join(ROOT, "viewer/wallRepair.js")).href);
const argv = process.argv.slice(2);
const oi = argv.indexOf("--out"), OUT = oi >= 0 ? argv.splice(oi, 2)[1] : null;
const ALL = argv.includes("--all");
const TILES = ALL ? readdirSync(join(ROOT, "data/tiles")).filter((t) => existsSync(join(ROOT, "data/tiles", t, "buildings.bin"))) : argv.map((t) => t.toUpperCase());

const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const tot = { buildings: 0, edges: 0, partial: 0, partialArea: 0, after: 0, worst: [] };
const per = {};
for (const T of TILES) {
  const d = join(ROOT, "data/tiles", T);
  const doc = JSON.parse(readFileSync(join(d, "buildings.json"), "utf8"));
  const buf = readFileSync(join(d, "buildings.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const V = new Uint32Array(ab, 0, 2)[0], Tn = new Uint32Array(ab, 0, 2)[1];
  const P = new Float32Array(ab, 8, V * 3), I = new Uint32Array(ab, 8 + V * 12, Tn * 3);
  // a coarse grid of footprints for the party test
  const grid = new Map(), key = (i, j) => `${i},${j}`;
  doc.buildings.forEach((b, bi) => {
    const r = b.footprint[0]; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    for (let i = Math.floor(x0 / 16); i <= Math.floor(x1 / 16); i++) for (let j = Math.floor(z0 / 16); j <= Math.floor(z1 / 16); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(bi); }
  });
  let n = 0, partial = 0, area = 0, after = 0, edgesN = 0;
  doc.buildings.forEach((b, bi) => {
    const tris = [];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const p = [0, 1, 2].map((q) => { const i = I[t * 3 + q]; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; });
      const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz);
      if (L > 1e-9) tris.push({ p, n: [nx / L, ny / L, nz / L], area: L / 2 });
    }
    const party = (x, z) => (grid.get(key(Math.floor(x / 16), Math.floor(z / 16))) || []).some((o) => o !== bi && pip(x, z, doc.buildings[o].footprint[0]));
    const r = repairWalls(tris, b.footprint[0], b.base, { fix: true, party });
    n++;
    edgesN += r.edges.length;
    for (const e of r.edges) if (e.rebuilt) { partial++; area += e.hole; if (tot.worst.length < 30 || e.hole > tot.worst[tot.worst.length - 1].hole) { tot.worst.push({ tile: T, id: b.id.split("/").pop(), a: e.a.map((v) => +v.toFixed(2)), b: e.b.map((v) => +v.toFixed(2)), cover: e.cover, hole: e.hole }); tot.worst.sort((p, q) => q.hole - p.hole); tot.worst.length = Math.min(30, tot.worst.length); } }
    // after: re-run on the repaired triangles (nothing left to rebuild = 0)
    const r2 = repairWalls(r.tris, b.footprint[0], b.base, { fix: false, party });
    after += r2.edges.filter((e) => e.cover < 0.85 && e.hole >= 1.0 && !e.party).length;
  });
  per[T] = { buildings: n, edges: edgesN, partial, holeM2: Math.round(area), after };
  tot.buildings += n; tot.edges += edgesN; tot.partial += partial; tot.partialArea += area; tot.after += after;
  console.log(`${T}: ${n} buildings, ${edgesN} wall edges, partial ${partial} (${Math.round(area)} m2 of hole), after ${after}`);
}
tot.partialArea = Math.round(tot.partialArea);
console.log(JSON.stringify({ ...tot, worst: tot.worst.slice(0, 10) }, null, 1));
if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ summary: tot, tiles: per }, null, 1));
