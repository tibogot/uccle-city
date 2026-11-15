// FIX3: the road-part triangles (near-flat, ny >= 0.6) whose nearest point lies within R of (x, z), lowest first
import { buildTile } from "../roadfix/tile.mjs";
const [T, X, Z, R = 1.5] = [process.argv[2], +process.argv[3], +process.argv[4], +(process.argv[5] || 1.5)];
const d = await buildTile(T, { keepNet: true }), out = [];
const seg = (px, pz, ax, az, bx, bz) => { const ex = bx - ax, ez = bz - az, L = ex * ex + ez * ez || 1e-12, t = Math.min(1, Math.max(0, ((px - ax) * ex + (pz - az) * ez) / L)); return [t, Math.hypot(px - ax - t * ex, pz - az - t * ez)]; };
for (const [name, p] of Object.entries(d.road.parts)) { if (!p?.index) continue; const P = p.position, I = p.index;
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;
    const E = [[a, b], [b, c], [c, a]].map(([i, j]) => { const [tt, dd] = seg(X, Z, P[i], P[i + 2], P[j], P[j + 2]); return [dd, P[i + 1] + (P[j + 1] - P[i + 1]) * tt]; }).sort((p, q) => p[0] - q[0]);
    if (E[0][0] <= R) out.push([name, E[0][0].toFixed(2), E[0][1].toFixed(3), [a, b, c].map((k) => `${P[k].toFixed(2)},${P[k + 1].toFixed(2)},${P[k + 2].toFixed(2)}`).join(" | ")]);
  } }
out.sort((p, q) => p[2] - q[2]); for (const r of out.slice(0, 10)) console.log(r.join("  "));
