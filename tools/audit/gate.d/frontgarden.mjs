// gate row `frontgarden` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "frontgarden",
  script: "tools/audit/frontgardenCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality1, rule frontgarden-by-context, class C4) the front-garden boundary by the house's family (data/gardens/<T>.json gardens[].fam from tools/gardens/faces.mjs types + data/bldclass evidence): pre-war rows low plinth + railing >= 55 %, solid walls <= 10 %; post-war solid walls <= 10 %; every institution front not set by OSM a 1.4-1.6 m steel bar fence; ?frontgarden=old reads the complete frozen data/gardens/fgold",
  timeout: 120,
  deps: ["data/gardens/", "tools/gardens/build_gardens.py", "tools/gardens/faces.mjs", "viewer/gardens/cityGardens.js", "viewer/tileData.js"],
  meta: { features: [{ key: "frontgarden", type: "old" }] },
};
