// How far the road surfaces float over the drawn terrain, per tile (region border check, docs/HORIZON.md).
// Runs the tile worker's road stage exactly as the road audit does (tools/road_audit/tile.mjs), then for every road /
// sidewalk vertex (asphalt + concrete parts): gap = vertex y - drawn terrain (hm.surface: the carved + welded grid the
// viewer draws). Bridge decks are separate meshes (bridgeDecks.js), not in these parts.
//   node --import ./tools/road_audit/register.mjs tools/terrain/road_float.mjs D10 E10 ...
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { loadTile } = await import(pathToFileURL(join(ROOT, "tools/road_audit/tile.mjs")).href);

const tiles = process.argv.slice(2).map((t) => t.toUpperCase());
const tot = { verts: 0, over05: 0, over1: 0, over5: 0, max: 0 };
for (const T of tiles) {
  const t = loadTile(T);
  const { hm, rd } = t;
  let n = 0, o05 = 0, o1 = 0, o5 = 0, max = 0, maxAt = null;
  for (const k of ["asphalt", "concrete"]) {
    const p = rd.parts[k]?.position;
    if (!p) continue;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const g = hm.surface(x, z);
      const d = y - g;
      n++;
      if (d > 0.5) o05++;
      if (d > 1) o1++;
      if (d > 5) o5++;
      if (d > max) { max = d; maxAt = [Math.round(x), Math.round(z)]; }
    }
  }
  const lv = rd.netInfo.levels || {};
  console.log(`${T}: ${n} road verts, >0.5 m ${o05}, >1 m ${o1}, >5 m ${o5}, max ${max.toFixed(2)} m at ${JSON.stringify(maxAt)}; relevel skippedNoData ${lv.skippedNoData ?? 0}, nodata cells ${t.hm.h.nodataCount}`);
  tot.verts += n; tot.over05 += o05; tot.over1 += o1; tot.over5 += o5; tot.max = Math.max(tot.max, max);
}
console.log("ALL", JSON.stringify(tot));
