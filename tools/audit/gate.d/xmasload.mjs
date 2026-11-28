// gate row `xmasload` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "xmasload",
  script: "tools/christmas/xmasLoad.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: [],
  guards: "the Christmas layer's load can not grow silently (claude/xmasperf4, rule xmas-pass-budget): the pieces the layer places, counted as viewer/christmas/xmasCity.js builds them (site.json + poles.json + terraces.json + the per-street switches + xmasSwag.js swagRun: firs, chalets, shopfront swag modules, wreaths, star motifs, street and pole garlands), their LOD0 triangles and the layer's instanced sets, each within models/christmas/load_budget.json; a street-life / shop-kit / site change that adds swags (2026-11-26: the site refit to the filled shop streets took 335 -> 551 swag modules unnoticed) must raise the ceiling in the same commit with a re-measure (debug/xmasPerf.js passes() + run(), docs/CHRISTMAS.md 7.7); a mutation (every front placed twice) fails it",
  timeout: 120,
  deps: ["models/christmas/", "data/shops/terraces.json", "viewer/christmas/", "viewer/shops/shopLayout.js", "viewer/streetlife/layout.js"],
};
