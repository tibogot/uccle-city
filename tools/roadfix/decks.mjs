// node --import ./tools/road_audit/register.mjs tools/roadfix/decks.mjs D9 [x z]
// the tile's OSM bridge decks: ends, end heights, and the road junctions / drive surface near each end
globalThis.__levelsDebug = true;
import { buildTile } from "./tile.mjs";
const [T, xs, zs] = process.argv.slice(2);
const d = await buildTile(T, { keepNet: true });
const { net, hm, drive } = d;
const h = hm.h, Y = hm.y, g = drive.ground;
const top = (x, z) => { const c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step); if (c < 0 || r < 0 || c >= h.cols || r >= h.rows) return NaN; const k = r * h.cols + c; return Y[k] + g.delta[k] / 100; };
for (const b of d.bridgeDecks) {
  if (xs && Math.hypot(b.pts[1][0] - +xs, b.pts[1][1] - +zs) > 200) continue;
  const L = b.cum[b.cum.length - 1];
  console.log(`deck ${b.id} "${b.name}" L ${L.toFixed(1)} span ${b.span.map((v) => v.toFixed(1))} h0 ${b.h0.toFixed(2)} h1 ${b.h1.toFixed(2)} half ${b.half} prof ends ${b.prof[0].toFixed(2)} .. ${b.prof[b.prof.length - 1].toFixed(2)}`);
  console.log("   pts", JSON.stringify(b.pts.map((p) => p.map((v) => +v.toFixed(1)))));
  const prof = b.prof.map((v) => v.toFixed(1)).join(" ");
  console.log("   prof", prof);
  for (const end of [b.pts[1], b.pts[b.pts.length - 2]]) {
    for (const n of net.nodes) if (Math.hypot(n.x - end[0], n.z - end[1]) < 30) console.log(`   node ${n.id} (${n.x.toFixed(1)}, ${n.z.toFixed(1)}) y ${n.y.toFixed(2)} dtm ${hm.ground(n.x, n.z).toFixed(2)} dist ${Math.hypot(n.x - end[0], n.z - end[1]).toFixed(1)} arms ${n.arms.map((a) => a.road.id + (a.road.src?.meta?.bridge ? "(B)" : "")).join(",")}`);
  }
}
if (xs) {
  console.log("drive top / dtm around", xs, zs);
  for (let dz = -6; dz <= 6; dz += 2) { const row = []; for (let dx = -6; dx <= 6; dx += 2) row.push(`${top(+xs + dx, +zs + dz).toFixed(1)}/${hm.ground(+xs + dx, +zs + dz).toFixed(1)}`); console.log("  ", row.join(" ")); }
}
