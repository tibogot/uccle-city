// Road levels vs the DTM per tile (road fix round 2): road / sidewalk vertices over the drawn terrain, junctions off
// their lanes' ground (the DTM along each arm's centre line out to the junction's reach).
//   node --import ./tools/road_audit/register.mjs tools/roadfix/metrics.mjs E10 F10 D10 ... [--list]
globalThis.__levelsDebug = true;
import { buildTile } from "./tile.mjs";
const args = process.argv.slice(2), list = args.includes("--list");
const T = args.filter((a) => !a.startsWith("--"));
for (const t of T) {
  const d = await buildTile(t, { keepNet: true });
  const { net, hm, bounds } = d;
  let n = 0, o05 = 0, o1 = 0, o2 = 0, max = 0, maxAt = null, under = 0;
  for (const k of ["asphalt", "concrete"]) {
    const p = d.road.parts[k]?.position; if (!p) continue;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], z = p[i + 2];
      if (x < bounds.x0 || x >= bounds.x1 || z < bounds.z0 || z >= bounds.z1) continue;
      const g = d.road.parts[k] && hm.surface(x, z), dd = p[i + 1] - g; n++;
      if (dd > 0.5) o05++; if (dd > 1) o1++; if (dd > 2) o2++; if (dd < -0.3) under++;
      if (dd > max) { max = dd; maxAt = [Math.round(x), Math.round(z)]; }
    }
  }
  const off = [];
  for (const nd of net.nodes) {
    if (!nd.arms?.length || nd.x < bounds.x0 || nd.x >= bounds.x1 || nd.z < bounds.z0 || nd.z >= bounds.z1) continue;
    const R = nd.reach || 6; let lo = Infinity;
    for (const a of nd.arms) for (let s = 0; s <= R; s += 1) lo = Math.min(lo, hm.ground(nd.x + Math.cos(a.th) * s, nd.z + Math.sin(a.th) * s));
    const dy = nd.y - hm.ground(nd.x, nd.z);
    if (dy > 1) off.push(`${nd.id}@(${nd.x.toFixed(0)},${nd.z.toFixed(0)}) +${dy.toFixed(2)} (lane min ${(nd.y - lo).toFixed(2)})`);
  }
  console.log(`${t}: verts ${n}, >0.5 m ${o05}, >1 m ${o1}, >2 m ${o2}, < -0.3 m ${under}, max ${max.toFixed(2)} at ${JSON.stringify(maxAt)}; junctions >1 m over the DTM: ${off.length}; levels ${JSON.stringify(d.netInfo.levels)}`);
  if (list) for (const o of off) console.log("   ", o);
}
