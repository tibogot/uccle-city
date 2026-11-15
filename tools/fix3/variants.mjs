// FIX3 (docs/FIX3.md): which joins2 worker change raises the "surface > 50 cm over the terrain" count, per tile.
//   node --import ./tools/road_audit/register.mjs tools/fix3/variants.mjs TILES...
import { buildTile } from "../roadfix/tile.mjs";
import { buriedStats } from "../joins2/buried.mjs";
const V = { now: {}, clampOld: { clampTop: false }, weldOld: { groundWeld: false }, surfHOld: { surfH: false }, noFill: { sidewalkFill: false }, allOld: { groundWeld: false, surfH: false, sidewalkFill: false, cellar: false, groundSdf: false } };
const only = process.env.V ? process.env.V.split(",") : Object.keys(V);
for (const T of process.argv.slice(2)) {
  const row = {};
  for (const k of only) { const s = buriedStats(await buildTile(T, V[k])); row[k] = `${s.float50}/${s.buried}`; if (k === "now") row.top = s.floats.slice(0, 4); }
  console.log(T, JSON.stringify(row));
}
