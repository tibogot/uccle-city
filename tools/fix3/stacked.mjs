// FIX3 (docs/FIX3.md): are the buried / floating samples of buried.mjs on STACKED surfaces (another near-flat surface
// triangle over / under the same x, z)? A buried sample under a higher surface is hidden (the higher one draws over it).
//   node --import ./tools/road_audit/register.mjs tools/fix3/stacked.mjs TILES...
import { buildTile } from "../roadfix/tile.mjs";
import { terrainAt } from "../joins2/buried.mjs";
const BARY = [[0.9, 0.05, 0.05], [0.05, 0.9, 0.05], [0.05, 0.05, 0.9], [0.48, 0.48, 0.04], [0.04, 0.48, 0.48], [0.48, 0.04, 0.48]];
export function surfIndex(d) {
  const tris = [], G = new Map(), C = 4;
  for (const [name, p] of Object.entries(d.road.parts)) {
    if (!p?.index || name === "paint") continue;
    const P = p.position, I = p.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.8 * Math.hypot(nx, ny, nz)) continue;
      const tri = [P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[c], P[c + 1], P[c + 2], name], id = tris.push(tri) - 1;
      const xa = Math.floor(Math.min(P[a], P[b], P[c]) / C), xb = Math.floor(Math.max(P[a], P[b], P[c]) / C);
      const za = Math.floor(Math.min(P[a + 2], P[b + 2], P[c + 2]) / C), zb = Math.floor(Math.max(P[a + 2], P[b + 2], P[c + 2]) / C);
      for (let x = xa; x <= xb; x++) for (let z = za; z <= zb; z++) { const k = x * 100003 + z; (G.get(k) || G.set(k, []).get(k)).push(id); }
    }
  }
  // heights of every surface over (x, z)
  const heights = (x, z) => {
    const out = [];
    for (const id of G.get(Math.floor(x / C) * 100003 + Math.floor(z / C)) || []) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris[id];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      out.push(l1 * ay + l2 * by + l3 * cy);
    }
    return out;
  };
  return { tris, heights };
}
/** buried / float50 split into visible (the top surface at x, z) and hidden (another surface > 5 cm over it) */
export function visibleStats(d) {
  const at = terrainAt(d), B = d.bounds, { tris, heights } = surfIndex(d);
  const o = { samples: 0, buried: 0, buriedHidden: 0, over10: 0, float50: 0, float50Stacked: 0 };
  for (const [ax, ay, az, bx, by, bz, cx, cy, cz] of tris) for (const [l1, l2, l3] of BARY) {
    const x = l1 * ax + l2 * bx + l3 * cx, z = l1 * az + l2 * bz + l3 * cz, y = l1 * ay + l2 * by + l3 * cy;
    if (x < B.x0 || x >= B.x1 || z < B.z0 || z >= B.z1) continue;
    const g = at(x, z);
    if (Number.isNaN(g)) continue;
    o.samples++;
    const e = g - y, hs = heights(x, z);
    if (e > 0.02) { if (hs.some((h) => h > y + 0.05 && h > g)) o.buriedHidden++; else { o.buried++; if (e > 0.1) o.over10++; } }
    if (-e > 0.5) { o.float50++; if (hs.some((h) => h < y - 0.3)) o.float50Stacked++; }
  }
  return o;
}
if (process.argv[1].endsWith("stacked.mjs")) for (const T of process.argv.slice(2)) {
  const row = {};
  for (const [k, top] of [["joins2", false], ["fix3", true]]) row[k] = visibleStats(await buildTile(T, { clampTop: top }));
  console.log(T, JSON.stringify(row));
}
