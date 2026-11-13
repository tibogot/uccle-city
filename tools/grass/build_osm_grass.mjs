// The grass KINDS the tile features don't carry (pipeline/build_features.py folds landuse=meadow into "grass" and drops
// a pitch's surface): read the raw OSM extract (data/raw/osm/area.json, git-ignored: fetched by pipeline/fetch_osm.py)
// and write data/grass/osm_grass.json = { "osm:w123": "meadow" | "grassland" | "heath" | "village_green" |
// "pitch:<surface>" | ... } for every area id the features may have. viewer/grass/grassTypes.js reads it.
//   node tools/grass/build_osm_grass.mjs [path/to/area.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const src = process.argv[2] || path.join(root, "data/raw/osm/area.json");
const osm = JSON.parse(fs.readFileSync(src, "utf8"));
const out = {};
const n = {};
for (const e of osm.elements) {
  if (e.type !== "way" && e.type !== "relation") continue;
  const t = e.tags || {};
  let k = null;
  if (t.landuse === "meadow") k = "meadow";
  else if (t.natural === "grassland") k = "grassland";
  else if (t.natural === "heath") k = "heath";
  else if (t.landuse === "village_green") k = "village_green";
  else if (t.landuse === "orchard") k = "orchard";
  else if (t.leisure === "dog_park") k = "dog_park";
  else if (t.leisure === "pitch") k = `pitch:${t.surface || "unknown"}:${(t.sport || "").split(";")[0]}`;
  else if (t.landuse === "grass" && /wild|meadow|tall/.test(`${t.grassland || ""}${t.meadow || ""}`)) k = "meadow";
  if (!k) continue;
  out[`osm:${e.type[0]}${e.id}`] = k;
  n[k] = (n[k] || 0) + 1;
}
const doc = { about: "OSM grass kinds by area id (tools/grass/build_osm_grass.mjs, from data/raw/osm/area.json). © OpenStreetMap contributors, ODbL.",
  osm_base: osm.osm3s?.timestamp_osm_base || null, counts: n, kinds: out };
fs.mkdirSync(path.join(root, "data/grass"), { recursive: true });
fs.writeFileSync(path.join(root, "data/grass/osm_grass.json"), JSON.stringify(doc));
console.log(n);
