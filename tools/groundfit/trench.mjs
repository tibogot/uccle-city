// TRENCHES along walls (docs/GROUND_FIT.md): the drawn terrain right outside a wall (0.35 m) vs 2.5 m out, per wall sample
//   node --import ./tools/road_audit/register.mjs tools/groundfit/trench.mjs [TILES...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTile, tiles, ROOT } from "../roadfix/tile.mjs";
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const old = process.argv.includes("--old");
for (const T of names.length ? names : tiles.map((t) => t.name)) {
  const d = await buildTile(T, { keepNet: true, ...(old ? { groundFit: false } : {}) });
  const { hm, bounds } = d, e = tiles.find((t) => t.name === T);
  const bDoc = JSON.parse(readFileSync(join(ROOT, "data/tiles", e.files.buildings.split("?")[0]), "utf8"));
  const inAny = (x, z) => bDoc.buildings.some((b) => { const r = b.footprint[0]; let k = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; });
  let n = 0, t05 = 0, t1 = 0; const worst = [];
  for (const b of bDoc.buildings) {
    const r = b.footprint[0];
    let area = 0; for (let i = 0; i < r.length; i++) { const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length]; area += x0 * z1 - x1 * z0; }
    const s = area > 0 ? 1 : -1;
    let w = 0, at = null;
    for (let i = 0; i < r.length; i++) {
      const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length], L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 1) continue;
      const tx = (x1 - x0) / L, tz = (z1 - z0) / L, nx = tz * s, nz = -tx * s;   // outward for the ring's winding
      for (let u = 0.5; u < L; u += 1) {
        const x = x0 + tx * u, z = z0 + tz * u;
        if (x < bounds.x0 || x >= bounds.x1 || z < bounds.z0 || z >= bounds.z1) continue;
        const ax = x + nx * 0.35, az = z + nz * 0.35, bx = x + nx * 2.5, bz = z + nz * 2.5;
        if (inAny(ax, az) || inAny(bx, bz)) continue;
        n++;
        const dd = hm.surface(bx, bz) - hm.surface(ax, az);
        if (dd > 0.5) t05++; if (dd > 1) t1++;
        if (dd > w) { w = dd; at = [+x.toFixed(1), +z.toFixed(1)]; }
      }
    }
    if (w > 1) worst.push([+w.toFixed(2), at]);
  }
  worst.sort((a, b) => b[0] - a[0]);
  console.log(`${T}: wall samples ${n}, trench > 0.5 m ${t05}, > 1 m ${t1}; worst ${JSON.stringify(worst.slice(0, 6))}`);
}
