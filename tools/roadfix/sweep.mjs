// every built tile through tools/roadfix/tile.mjs: road / sidewalk vertices over / under the drawn terrain, junctions
// over the DTM; JSON lines to stdout. --old: the round-2 switches off (roughLanes, deckAbutments, underpassLevel)
//   node --import ./tools/road_audit/register.mjs tools/roadfix/sweep.mjs [--old] [T ...] > out.jsonl
import { buildTile, tiles } from "./tile.mjs";
const args = process.argv.slice(2), old = args.includes("--old");
const only = args.filter((a) => !a.startsWith("--"));
const opts = old ? { roughLanes: false, deckAbutments: false, underpassLevel: false } : {};
for (const t of tiles.map((q) => q.name).filter((n) => !only.length || only.includes(n))) {
  const d = await buildTile(t, { ...opts, keepNet: true });
  const { hm, bounds, net } = d;
  const r = { tile: t, verts: 0, o05: 0, o1: 0, o2: 0, u03: 0, max: 0, maxAt: null, jOver1: 0, jUnder1: 0, levels: d.netInfo.levels, abut: d.netInfo.deckAbutments, decks: d.bridgeDecks.length, drive: d.drive.counts };
  for (const k of ["asphalt", "concrete"]) {
    const p = d.road.parts[k]?.position; if (!p) continue;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], z = p[i + 2];
      if (x < bounds.x0 || x >= bounds.x1 || z < bounds.z0 || z >= bounds.z1) continue;
      const dd = p[i + 1] - hm.surface(x, z); r.verts++;
      if (dd > 0.5) r.o05++; if (dd > 1) r.o1++; if (dd > 2) r.o2++; if (dd < -0.3) r.u03++;
      if (dd > r.max) { r.max = +dd.toFixed(2); r.maxAt = [Math.round(x), Math.round(z)]; }
    }
  }
  for (const nd of net.nodes) {
    if (!nd.arms?.length || nd.x < bounds.x0 || nd.x >= bounds.x1 || nd.z < bounds.z0 || nd.z >= bounds.z1) continue;
    const dy = nd.y - hm.ground(nd.x, nd.z);
    if (dy > 1) r.jOver1++; if (dy < -1) r.jUnder1++;
  }
  delete r.levels.debug;
  console.log(JSON.stringify(r));
}
