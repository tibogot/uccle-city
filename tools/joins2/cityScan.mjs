// JOINS2 CITY SCAN (docs/JOINS2.md): every tile (or the ones given) built in node as the worker does; per tile the buried /
// floating samples (buried.mjs), the sidewalk gaps to the facades (surfaces.js sidewalkFill: gapLen = m of raised sidewalk
// edge with a wall 0.05-1.8 m behind it over bare terrain, len = m filled), the basements (facadeGeom.js cellarOf).
//   node --import ./tools/road_audit/register.mjs tools/joins2/cityScan.mjs [TILES...] [--out file.json]
//   JOINS2_OLD=1 ... = the worker changes of this round off (tools/roadfix/tile.mjs)
import { writeFileSync } from "node:fs";
import { buildTile, tiles } from "../roadfix/tile.mjs";
import { buriedStats } from "./buried.mjs";
const args = process.argv.slice(2), oi = args.indexOf("--out");
const names = args.filter((a, i) => !a.startsWith("--") && (oi < 0 || i !== oi + 1));
const todo = names.length ? names : tiles.map((t) => t.name);
const tot = { samples: 0, buried: 0, over10: 0, over25: 0, float50: 0, gapLen: 0, fillLen: 0, cellarFaces: 0, lowerGround: 0, landCoverMs: 0, weldMs: 0 }, per = {};
for (const T of todo) {
  let d;
  try { d = await buildTile(T); } catch (e) { console.log(T, "FAILED", e.message); continue; }
  const b = buriedStats(d), f = d.road.surfaceStats?.sidewalkFill || { len: 0, gapLen: 0 }, s = d.buildings.stats;
  const r = { buried: b.buried, samples: b.samples, over10: b.over10, over25: b.over25, float50: b.float50, gapLen: f.gapLen, fillLen: f.len,
    cellarFaces: s.cellarFaces || 0, lowerGround: s.lowerGround || 0, landCoverMs: d.times["land cover"] || 0, weldMs: d.times["terrain weld"] || 0 };
  per[T] = r;
  for (const k of Object.keys(tot)) tot[k] += r[k] || 0;
  console.log(T, JSON.stringify(r));
}
console.log("TOTAL", todo.length, JSON.stringify(tot));
if (oi >= 0) writeFileSync(args[oi + 1], JSON.stringify({ tot, per }, null, 1));
