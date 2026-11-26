// gate row `bldclass` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bldclass",
  script: "tools/audit/bldclassCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality1, rule bldclass-evidence, class C1) building types from open-data evidence (data/bldclass/<T>.json: Brussels heritage inventory years / styles / typologies, OSM buildings / start_date / school, hospital, worship sites): every tile has its evidence; no balcony block on an institution, on anything dated before 1946, or on a row front / small block under a steep pitched roof; Institut Montjoie never a balcony block; the five real post-war balcony blocks of data/bldclass/fixtures.json (Street View 2026-11-26) stay balcony blocks. Prints the census (balcony blocks, steep-roofed ones, old vs new)",
  timeout: 240,
  deps: ["data/bldclass/", "viewer/buildingTypes.js", "viewer/tileData.js", "tools/bldclass/build_evidence.py"],
  meta: {
    features: [{ key: "bldclass", type: "old" }],
    text: [
      { file: "viewer/tileData.js", what: "the near and far tiles apply the evidence before classify (applyBuildingEvidence twice)", test: (s) => (s.match(/applyBuildingEvidence\(bDoc/g) || []).length >= 2 },
      { file: "viewer/main.js", what: "the tile entry carries the bldclass switch", test: (s) => /bldclass: params\.get\("bldclass"\) !== "old"/.test(s) },
    ],
  },
};
