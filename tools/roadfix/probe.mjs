// node --import ./tools/road_audit/register.mjs tools/roadfix/probe.mjs E10 -870 2875 [r]
// the road junctions / roads near a point: node height vs the DTM (min / mean of its ring), plane RMS; drive grid there
import { buildTile } from "./tile.mjs";
const [T, xs, zs, rs] = process.argv.slice(2);
const x = +xs, z = +zs, R = +(rs || 40);
const d = await buildTile(T, { keepNet: true });
const { net, hm } = d;
console.log(T, "levels", JSON.stringify(d.netInfo.levels));
for (const n of net.nodes) {
  if (Math.hypot(n.x - x, n.z - z) > R) continue;
  const g = hm.ground(n.x, n.z);
  const ring = []; const Rr = n.reach || 6;
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; ring.push(hm.ground(n.x + Math.cos(a) * Rr, n.z + Math.sin(a) * Rr)); }
  console.log(`node ${n.id} (${n.x.toFixed(1)}, ${n.z.toFixed(1)}) y ${n.y.toFixed(2)} dtm ${g.toFixed(2)} ring min ${Math.min(...ring).toFixed(2)} max ${Math.max(...ring).toFixed(2)} reach ${Rr.toFixed(1)} arms ${n.arms.map((a) => a.road.id).join(",")}`);
}
for (const n of net.nodes) {
  if (Math.hypot(n.x - x, n.z - z) > R) continue;
  const Rr = n.reach || 6;
  for (const a of n.arms) {
    const s = [];
    for (let t = 0; t <= Rr + 0.01; t += 1) s.push(hm.ground(n.x + Math.cos(a.th) * t, n.z + Math.sin(a.th) * t).toFixed(1));
    console.log(`  arm ${a.road.id} th ${a.th.toFixed(2)} o (${a.ox?.toFixed(1)}, ${a.oz?.toFixed(1)}) ground along: ${s.join(" ")} | planeY at o ${(n.y + (n.plane?.gx||0)*(a.ox-n.x) + (n.plane?.gz||0)*(a.oz-n.z)).toFixed(2)}`);
  }
}
