// FIX3: every road-part triangle (any slope) covering (x, z) of tile T, with its height there and its normal y
import { buildTile } from "../roadfix/tile.mjs";
const [T, X, Z] = [process.argv[2], +process.argv[3], +process.argv[4]];
const d = await buildTile(T);
for (const [name, p] of Object.entries(d.road.parts)) { if (!p?.index) continue; const P = p.position, I = p.index;
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const det = (P[b + 2] - P[c + 2]) * (P[a] - P[c]) + (P[c] - P[b]) * (P[a + 2] - P[c + 2]); if (Math.abs(det) < 1e-9) continue;
    const l1 = ((P[b + 2] - P[c + 2]) * (X - P[c]) + (P[c] - P[b]) * (Z - P[c + 2])) / det, l2 = ((P[c + 2] - P[a + 2]) * (X - P[c]) + (P[a] - P[c]) * (Z - P[c + 2])) / det, l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    console.log(name, (l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1]).toFixed(3), "ny", (Math.abs(ny) / Math.hypot(nx, ny, nz)).toFixed(2), [a, b, c].map((k) => `${P[k].toFixed(2)},${P[k + 1].toFixed(2)},${P[k + 2].toFixed(2)}`).join(" | "));
  } }
console.log("terrain grid", d.hm ? d.hm.surface(X, Z).toFixed(3) : "", "orig", d.hm?.ground(X, Z).toFixed(3));
