// gate row `montjoie` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "montjoie",
  script: "tools/audit/montjoieCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality1, rule institution-not-balcony-block) Institut Montjoie (Avenue Montjoie, UrbIS 506834): its curated look red face brick, a type with no balconies (never 4), a red clay-tile roof, set montjoie; its two asphalt yards (montjoie_court, montjoie_west_yard) on ?montjoie=old; the front strip (plantsClear montjoie_front) covering the whole 62 m front so no front-garden wall stands along a facade built on the sidewalk; every curated look / plantsClear set wired to its ?<set>=old switch. --census lists the class: steep-roofed buildings the classifier draws as balcony blocks",
  timeout: 60,
  deps: ["data/overrides.json", "viewer/tileData.js", "viewer/main.js", "viewer/buildingTypes.js", "data/tiles/I2/buildings.json"],
  meta: {
    features: [{ key: "montjoie", type: "old" }],
    text: [
      { file: "viewer/tileData.js", what: "the montjoie look set leaves with ?montjoie=old", test: (s) => /entry\.montjoie === false && v\.set === "montjoie"/.test(s) },
    ],
  },
};
