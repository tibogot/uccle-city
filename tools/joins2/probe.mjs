import { buildTile } from "../roadfix/tile.mjs";
import { buriedStats, terrainAt } from "./buried.mjs";
const T = process.argv[2], X = +process.argv[3], Z = +process.argv[4];
const d = await buildTile(T, { keepNet: true });
const s = buriedStats(d); console.log(s.worst.slice(0, 6));
const at = terrainAt(d), hm = d.hm;
// road triangles near
for (const [name, p] of Object.entries(d.road.parts)) { if (!p?.index || name === "paint") continue; const P = p.position, I = p.index;
  for (let t = 0; t < I.length; t += 3) { const ids = [I[t], I[t+1], I[t+2]]; const cx = ids.reduce((a, i) => a + P[i*3], 0)/3, cz = ids.reduce((a, i) => a + P[i*3+2], 0)/3;
    if (Math.hypot(cx - X, cz - Z) < 1.6) console.log(name, ids.map((i) => [P[i*3].toFixed(2), P[i*3+1].toFixed(2), P[i*3+2].toFixed(2), "t=" + at(P[i*3], P[i*3+2]).toFixed(2), "o=" + hm.ground(P[i*3], P[i*3+2]).toFixed(2)].join(",")).join(" | ")); } }
for (let dz = -3; dz <= 3; dz++) { let row = ""; for (let dx = -3; dx <= 3; dx++) { const x = Math.round(X) + dx, z = Math.round(Z) + dz; row += `${(hm.surface(x, z)).toFixed(2)}/${hm.ground(x,z).toFixed(2)} `; } console.log(row); }
