// The horizon ring's mesh (docs/HORIZON.md): data/raw/horizon/heights.u16 (pipeline/build_horizon.py, 20 m grid, 32 km)
// -> data/horizon/horizon.bin, ONE simplified triangle mesh (meshoptimizer), static, drawn by viewer/horizon.js.
//
// The error allowed grows with the distance to the city's tile grid: the simplifier sees heights scaled by
// w = 1 / (1 + d / FALLOFF) (d = metres outside the tile grid's box), so the error is ERR m at the city's edge (where
// the ring can be seen from the street, at the region border) and ERR x (1 + d / FALLOFF) far out (in the haze).
// Vertices keep their original positions (the simplifier returns indices into the full grid).
//
// horizon.bin layout (little endian): u32 magic 'HZN1', u32 V, u32 T, f32 x0, z0, step, base;
//   V x (u16 col, u16 row, u16 height cm over base, i8 nx, i8 nz)  [10 bytes]
//   T x 3 x u32 index
//   node tools/terrain/build_horizon_mesh.mjs [--err 0.25] [--falloff 1500]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MeshoptSimplifier } from "../worker/node_modules/meshoptimizer/meshopt_simplifier.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? +process.argv[i + 1] : d; };
const ERR = arg("--err", 0.25), FALLOFF = arg("--falloff", 1500);
const hdr = JSON.parse(readFileSync(join(ROOT, "data/horizon/heights.json"), "utf8"));
const { x0, z0, step, cols, rows, base } = hdr.grid;
const buf = readFileSync(join(ROOT, "data/raw/horizon/heights.u16"));
const H16 = new Uint16Array(buf.buffer, buf.byteOffset, cols * rows);
const h = (c, r) => H16[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))] / 100 + base;
// distance (m) to the edge of the city's tiles (manifest tiles, built): the ring meets the tiles along that edge (seen
// up close from the street there); inside the tiles it only shows past the far ring (>= 1.25 km), outside it melts
// into the haze. Chamfer distance on the grid, both sides of the edge.
const man = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const V = cols * rows;
const inTile = new Uint8Array(V);
for (const t of man.tiles) {
  if (t.status === "missing") continue;
  const c0 = Math.round((t.bounds.x[0] - x0) / step), c1 = Math.round((t.bounds.x[1] - x0) / step);
  const r0 = Math.round((t.bounds.z[0] - z0) / step), r1 = Math.round((t.bounds.z[1] - z0) / step);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) inTile[r * cols + c] = 1;
}
const dist = new Float32Array(V).fill(1e9);
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const k = r * cols + c, v = inTile[k];
  if ((c > 0 && inTile[k - 1] !== v) || (c < cols - 1 && inTile[k + 1] !== v) || (r > 0 && inTile[k - cols] !== v) || (r < rows - 1 && inTile[k + cols] !== v)) dist[k] = 0;
}
const D1 = step, D2 = step * Math.SQRT2;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const k = r * cols + c; let d = dist[k];
  if (c > 0) d = Math.min(d, dist[k - 1] + D1);
  if (r > 0) { d = Math.min(d, dist[k - cols] + D1); if (c > 0) d = Math.min(d, dist[k - cols - 1] + D2); if (c < cols - 1) d = Math.min(d, dist[k - cols + 1] + D2); }
  dist[k] = d;
}
for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
  const k = r * cols + c; let d = dist[k];
  if (c < cols - 1) d = Math.min(d, dist[k + 1] + D1);
  if (r < rows - 1) { d = Math.min(d, dist[k + cols] + D1); if (c < cols - 1) d = Math.min(d, dist[k + cols + 1] + D2); if (c > 0) d = Math.min(d, dist[k + cols - 1] + D2); }
  dist[k] = d;
}
const IN_FALLOFF = 250;          // inside the tiles the error grows 6x faster (the ring is far from the eye there)
const warped = new Float32Array(V * 3);
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const k = r * cols + c;
  const w = 1 / (1 + dist[k] / (inTile[k] ? IN_FALLOFF : FALLOFF));
  warped[k * 3] = x0 + c * step; warped[k * 3 + 1] = h(c, r) * w; warped[k * 3 + 2] = z0 + r * step;
}
const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
let o = 0;
for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
  const a = r * cols + c, b = a + cols;
  // alternate the diagonal (no directional bias in the shading)
  if ((r + c) & 1) { idx[o++] = a; idx[o++] = b; idx[o++] = a + 1; idx[o++] = a + 1; idx[o++] = b; idx[o++] = b + 1; }
  else { idx[o++] = a; idx[o++] = b; idx[o++] = b + 1; idx[o++] = a; idx[o++] = b + 1; idx[o++] = a + 1; }
}
await MeshoptSimplifier.ready;
const t0 = performance.now();
const [simp, err] = MeshoptSimplifier.simplify(idx, warped, 3, 0, ERR, ["ErrorAbsolute", "LockBorder"]);
console.log(`simplify: ${idx.length / 3} -> ${simp.length / 3} triangles (error ${err.toFixed(3)} m warped), ${((performance.now() - t0) / 1000).toFixed(1)} s`);
// compact the vertices
const remap = new Int32Array(V).fill(-1);
let nv = 0;
for (let i = 0; i < simp.length; i++) if (remap[simp[i]] < 0) remap[simp[i]] = nv++;
const out = Buffer.alloc(28 + nv * 10 + simp.length * 4);
out.write("HZN1", 0, "latin1"); out.writeUInt32LE(nv, 4); out.writeUInt32LE(simp.length / 3, 8);
out.writeFloatLE(x0, 12); out.writeFloatLE(z0, 16); out.writeFloatLE(step, 20); out.writeFloatLE(base, 24);
for (let k = 0; k < V; k++) {
  const j = remap[k];
  if (j < 0) continue;
  const c = k % cols, r = (k / cols) | 0, p = 28 + j * 10;
  // normal from the full 20 m grid (central differences): the shading keeps the detail the simplification drops
  const gx = (h(c + 1, r) - h(c - 1, r)) / (2 * step), gz = (h(c, r + 1) - h(c, r - 1)) / (2 * step), L = Math.hypot(gx, 1, gz);
  out.writeUInt16LE(c, p); out.writeUInt16LE(r, p + 2); out.writeUInt16LE(H16[k], p + 4);
  out.writeInt8(Math.round((-gx / L) * 127), p + 6); out.writeInt8(Math.round((-gz / L) * 127), p + 7);
  out.writeUInt16LE(0, p + 8);
}
const ib = 28 + nv * 10;
for (let i = 0; i < simp.length; i++) out.writeUInt32LE(remap[simp[i]], ib + i * 4);
writeFileSync(join(ROOT, "data/horizon/horizon.bin"), out);
console.log(`horizon.bin: ${nv} vertices, ${simp.length / 3} triangles, ${(out.length / 1e6).toFixed(2)} MB`);
