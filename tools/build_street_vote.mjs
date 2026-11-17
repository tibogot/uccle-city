// The city-wide street-surface table for the name vote (docs/SURFVOTE.md, viewer/streetNames.js streetTable):
// data/roads/network.json (+ data/overrides.json roadSurface / surfvoteRoads) -> data/roads/streetVote.json.
// Re-run after the road network or those overrides change:  node tools/build_street_vote.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SURFACE } from "../viewer/roadData.js";
import { streetTable } from "../viewer/streetNames.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const net = JSON.parse(fs.readFileSync(path.join(ROOT, "data/roads/network.json"), "utf8"));
const ov = JSON.parse(fs.readFileSync(path.join(ROOT, "data/overrides.json"), "utf8"));
// the overrides are keyed by tile road id ("r<way>_<n>"); the network's ids are the same before the cut
for (const r of net.roads) {
  const s = ov.roadSurface?.[r.id] || ov.surfvoteRoads?.[r.id]?.surface;
  if (s) (r.meta ??= {}).surface = s;
}
const all = streetTable(net, SURFACE);
// only the streets that are not asphalt: a 0 falls back to the class's base surface in surfaces.js, as no match does
const nz0 = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
const t = { exact: nz0(all.exact), loose: nz0(all.loose) };
const out = { _doc: "street key (viewer/streetNames.js normName / looseKey) -> roadData.js SURFACE code (not asphalt; others absent) most of the street's OSM length has, city-wide; the name vote's fallback where a tile has no road of the street (tools/build_street_vote.mjs)", ...t };
fs.writeFileSync(path.join(ROOT, "data/roads/streetVote.json"), JSON.stringify(out));
const n = (o) => Object.keys(o).length;
console.log(`data/roads/streetVote.json: ${n(all.exact)} exact keys, ${n(all.loose)} loose keys; kept the ${n(t.exact)} / ${n(t.loose)} not asphalt`);
