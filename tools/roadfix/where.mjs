// where a tile's road / sidewalk vertices stand > 1 m over the drawn terrain, in 10 m clusters, old switches vs new
//   node --import ./tools/road_audit/register.mjs tools/roadfix/where.mjs H2
globalThis.__levelsDebug = true;
import { buildTile } from "./tile.mjs";
const T = process.argv[2];
for (const [lab, o] of [["old", { roughLanes: false, deckAbutments: false, underpassLevel: false }], ["new", {}]]) {
  const d = await buildTile(T, { ...o, keepNet: true });
  const cl = new Map(), b = d.bounds;
  for (const k of ["asphalt", "concrete"]) {
    const p = d.road.parts[k]?.position; if (!p) continue;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], z = p[i + 2]; if (x < b.x0 || x >= b.x1 || z < b.z0 || z >= b.z1) continue;
      const dd = p[i + 1] - d.hm.surface(x, z); if (dd <= 1) continue;
      const key = `${Math.round(x / 10) * 10},${Math.round(z / 10) * 10}`; const c = cl.get(key) || { n: 0, max: 0 }; c.n++; c.max = Math.max(c.max, dd); cl.set(key, c);
    }
  }
  console.log(lab, [...cl].sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([k, c]) => `(${k}) ${c.n} max ${c.max.toFixed(2)}`).join(" | "));
  if (lab === "new") console.log("  moved", JSON.stringify({ lane: d.netInfo.levels.laneNodes, big: d.netInfo.levels.big, rough: d.netInfo.levels.rough?.length }));
}
