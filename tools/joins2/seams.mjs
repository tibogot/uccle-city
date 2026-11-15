// TILE SEAMS (joins2): the terrain's border vertices of two neighbour tiles must agree (a crack otherwise).
//   node --import ./tools/road_audit/register.mjs tools/joins2/seams.mjs F4 G4 [--old]   (east neighbour or south one)
import { buildTile } from "../roadfix/tile.mjs";
const [A, B] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opts = process.argv.includes("--old") ? { groundWeld: false } : {};
const a = await buildTile(A, opts), b = await buildTile(B, opts);
const ya = (d, c, r) => d.terrain.pos[(r * d.hdr.cols + c) * 3 + 1];
let n = 0, gt1 = 0, gt5 = 0, worst = 0, at = null;
const east = Math.abs(a.bounds.x1 - b.bounds.x0) < 0.01;
for (let i = 0; i < (east ? a.hdr.rows : a.hdr.cols); i++) {
  const p = east ? ya(a, a.hdr.cols - 1, i) : ya(a, i, a.hdr.rows - 1), q = east ? ya(b, 0, i) : ya(b, i, 0);
  const e = Math.abs(p - q); n++;
  if (e > 0.01) gt1++; if (e > 0.05) gt5++;
  if (e > worst) { worst = e; at = east ? [a.bounds.x1, a.bounds.z0 + i] : [a.bounds.x0 + i, a.bounds.z1]; }
}
console.log(`${A}|${B}: ${n} border vertices, > 1 cm ${gt1}, > 5 cm ${gt5}, worst ${worst.toFixed(3)} at ${at}`);
