// Street-surface name vote audit (docs/SURFVOTE.md): the old vote of viewer/surfaces.js (raw names, never matches)
// against the new one (viewer/streetNames.js surfaceVote), over every tile's measured carriageways.
//   node tools/audit/surfvote.mjs [--json out.json]
// Prints: the match counts old / new, then every street whose drawn surface changes (area in m2, tiles, from -> to).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SURFACE } from "../../viewer/roadData.js";
import { surfaceVote, oldNameVote, fixMojibake } from "../../viewer/streetNames.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TILES = path.join(ROOT, "data/tiles");
const ov = JSON.parse(fs.readFileSync(path.join(ROOT, "data/overrides.json"), "utf8"));
const CITY = JSON.parse(fs.readFileSync(path.join(ROOT, "data/roads/streetVote.json"), "utf8"));   // tools/build_street_vote.mjs
const BASE_SURF = [0, 0, 1, 2, 1, 0, 0, 0, 0, 0];     // viewer/surfaces.js
const ASPHALT_PART = (c) => c >= 0 && c <= 3;          // viewer/surfaces.js PART: the classes drawn by the asphalt shader
const NAME = ["asphalt", "setts", "pavers", "cobbles", "gravel"];
const area = (rings) => rings.reduce((A, r, i) => {
  let a = 0;
  for (let k = 0, j = r.length - 1; k < r.length; j = k++) a += (r[j][0] - r[k][0]) * (r[j][1] + r[k][1]);
  return A + (i === 0 ? 1 : -1) * Math.abs(a / 2);
}, 0);

const tot = { surfaces: 0, named: 0, oldMatch: 0, newExact: 0, newLoose: 0, newSpatial: 0, newCity: 0, newUnmatched: 0, changed: 0, changedArea: 0 };
const streets = new Map();       // name -> { from -> to -> area, tiles }
const unmatched = new Map();
for (const t of fs.readdirSync(TILES).sort()) {
  const sf = path.join(TILES, t, "surfaces.json"), rf = path.join(TILES, t, "roads.json");
  if (!fs.existsSync(sf) || !fs.existsSync(rf)) continue;
  const surf = JSON.parse(fs.readFileSync(sf, "utf8")), roads = JSON.parse(fs.readFileSync(rf, "utf8"));
  // as the worker has them: the road overrides (roadBuild.js applyRoadOverrides; tileData.js streetSurfaces, surfvoteRoads)
  for (const r of roads.roads) {
    const s = ov.roadSurface?.[r.id] || ov.surfvoteRoads?.[r.id]?.surface;
    if (s) (r.meta ??= {}).surface = s;
  }
  for (const s of surf.surfaces) { const o = ov.streetSurfaces?.[s.id]; if (o?.surface) s.surface = o.surface; }
  const old = oldNameVote(roads, SURFACE);
  const nv = surfaceVote(surf, roads, SURFACE, CITY);
  for (const s of surf.surfaces) {
    if (!ASPHALT_PART(s.c)) continue;
    tot.surfaces++;
    if (s.name) tot.named++;
    if (s.name && old.has(s.name)) tot.oldMatch++;
    const a = s.surface != null ? (SURFACE[s.surface] ?? 0) : old.get(s.name) || BASE_SURF[s.c];
    const v = s.surface != null ? null : nv.of(s);
    const b = s.surface != null ? (SURFACE[s.surface] ?? 0) : v || BASE_SURF[s.c];
    if (s.name && s.surface == null && v == null) { const nm = fixMojibake(s.name); unmatched.set(nm, (unmatched.get(nm) || 0) + area(s.rings)); }
    if (a !== b) {
      const nm = fixMojibake(s.name), A = area(s.rings);
      tot.changed++; tot.changedArea += A;
      const e = streets.get(nm) || { moves: new Map(), tiles: new Set(), area: 0 };
      const k = `${NAME[a]} -> ${NAME[b]}`;
      e.moves.set(k, (e.moves.get(k) || 0) + A); e.tiles.add(t); e.area += A;
      streets.set(nm, e);
    }
  }
  tot.newExact += nv.stats.exact; tot.newLoose += nv.stats.loose; tot.newSpatial += nv.stats.spatial; tot.newCity += nv.stats.city; tot.newUnmatched += nv.stats.unmatched;
}
console.log(`carriageway surfaces (asphalt-shader classes): ${tot.surfaces}, named ${tot.named}`);
console.log(`old vote: ${tot.oldMatch} matched by name`);
console.log(`new vote: ${tot.newExact + tot.newLoose} matched (${tot.newExact} exact, ${tot.newLoose} loose key), ${tot.newSpatial} decided by the roads inside them, ${tot.newCity} by the city-wide table (no road of theirs in the tile; not asphalt), ${tot.newUnmatched} unmatched`);
console.log(`surfaces whose drawn surface changes: ${tot.changed}, ${Math.round(tot.changedArea)} m2, ${streets.size} streets\n`);
const rows = [...streets].sort((p, q) => q[1].area - p[1].area);
for (const [nm, e] of rows) console.log(`${nm.padEnd(44)} ${String(Math.round(e.area)).padStart(6)} m2  ${[...e.moves].map(([k, A]) => `${k} ${Math.round(A)}`).join("; ")}  [${[...e.tiles].join(" ")}]`);
console.log(`\nunmatched names (largest first, ${unmatched.size}):`);
for (const [nm, A] of [...unmatched].sort((p, q) => q[1] - p[1]).slice(0, 40)) console.log(`  ${nm} ${Math.round(A)} m2`);
const j = process.argv.indexOf("--json");
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ tot, streets: rows.map(([nm, e]) => ({ name: nm, area: Math.round(e.area), moves: Object.fromEntries([...e.moves].map(([k, A]) => [k, Math.round(A)])), tiles: [...e.tiles] })) }, null, 1));
