// SAW-TOOTH FOLDS of the terrain mesh (docs/GROUND_FIT.md "blocky"): per 1 m cell, the angle between its two triangles
// with the fixed b-c split (before) and with the flatter diagonal (viewer/tileData.js terrainArrays, ground fit).
//   node --import ./tools/road_audit/register.mjs tools/groundfit/folds.mjs [TILES...]
import { buildTile, tiles } from "../roadfix/tile.mjs";
const names = process.argv.slice(2);
const nrm = (p, q, r) => { const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], L = Math.hypot(...n); return n.map((v) => v / L); };
const ang = (m, n) => Math.acos(Math.min(1, m[0] * n[0] + m[1] * n[1] + m[2] * n[2])) * 180 / Math.PI;
// a fold ACROSS the slope: the cell's crease runs along its steeper diagonal while the cell is twisted (|a + d - b - c| >
// 0.3 m): the silhouette of a diagonal bank then zig-zags cell by cell (the saw-tooth). The flatter diagonal follows the
// contour instead. (The fold ANGLE is the same for both splits: the twist; what changes is its direction.)
const tot = { cells: 0, b20: 0, a20: 0, b40: 0, a40: 0, flipped: 0, twisted: 0, acrossBefore: 0, acrossAfter: 0 };
for (const T of names.length ? names : tiles.map((t) => t.name)) {
  const d = await buildTile(T, { keepNet: true });
  const { cols, rows } = d.hm.h, Y = d.hm.y;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols, cc = a + 1, dd = b + 1;
    const A = [0, Y[a], 0], B = [0, Y[b], 1], C = [1, Y[cc], 0], D = [1, Y[dd], 1];
    const before = ang(nrm(A, B, C), nrm(C, B, D)), after0 = ang(nrm(A, B, D), nrm(A, D, C));
    const flip = Math.abs(Y[a] - Y[dd]) < Math.abs(Y[b] - Y[cc]) - 0.01, after = flip ? after0 : before;
    tot.cells++; if (flip) tot.flipped++;
    if (Math.abs(Y[a] + Y[dd] - Y[b] - Y[cc]) > 0.3) {
      tot.twisted++;
      const steepBC = Math.abs(Y[b] - Y[cc]) > Math.abs(Y[a] - Y[dd]) + 0.01;
      if (steepBC) tot.acrossBefore++;
      if (steepBC && !flip) tot.acrossAfter++;
    }
    if (before > 20) tot.b20++; if (after > 20) tot.a20++; if (before > 40) tot.b40++; if (after > 40) tot.a40++;
  }
  console.log(T, JSON.stringify(tot));
}
