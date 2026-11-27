// gate row `lampextras` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "lampextras",
  script: "tools/audit/lampExtrasCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality2, rules lamps-from-osm + lamp-extras, class C7) O every OSM street lamp of a built tile (data/lamps/osm_lamps.json) is a lamp site where surveyed (lampPlace.js lampSites), no generated lamp within 3 m of one; W the shop streets' wall lanterns on their front's wall, 4.5 m up, >= 1.2 m under the eaves, >= 6 m apart, >= 5 m from a post, >= 60 city-wide; B the flower baskets on posts within 14 m of a shopfront, >= 40; V viewer/lampExtras.js adds no light, no DynamicDrawUsage, draws with the lamp's shared materials, main.js builds it, features.js rows lampextras + osmlamps",
  timeout: 120,
  deps: ["data/lamps/", "data/streetlife/", "data/tiles/manifest.json", "viewer/streets/lampPlace.js", "viewer/streets/lampExtrasPlace.js", "viewer/lampExtras.js", "viewer/main.js", "viewer/features.js"],
  meta: { features: [{ key: "lampextras", type: "on" }, { key: "osmlamps", type: "old" }] },
};
