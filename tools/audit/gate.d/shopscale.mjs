// gate row `shopscale` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shopscale",
  script: "tools/audit/shopScaleCheck.mjs",
  args: ["--quiet"],
  guards: "the shop interiors at metric scale (rule shop-room-metric, docs/SHOPS_V2_PLAN.md jobs 1-2): every interior-mapped window (the street-life layout over data/streetlife, in Node) shows the 6 m render within +-10 % of metric across the glass, the glass inside its room (or side-by-side rooms with the partition inside the glass), a depth per type in 3.5-6 m; the shader's room constants (viewer/shops/shopScale.js) = the bake's (tools/blender/shopInteriors.py), the bake on OptiX; ?shopscale=old wired; report-only while shopWindow.js has no metric mapping",
  timeout: 120,
  deps: ["data/streetlife/", "data/shops/terraces.json", "tools/blender/shopInteriors.py"],
  meta: {
    features: [{ key: "shopscale", type: "old" }],
    clean: ["viewer/shops/"],
    text: [
      { file: "viewer/shops/shopWindow.js", what: "maps the glass in metres through shopScale.js (the JS twin the gate checks: the offset hash, STRETCH_MAX)", test: (s) => /from "\.\/shopScale\.js"/.test(s) && /mul\(13\.713\)\.add\(0\.37\)\.fract\(\)/.test(s) && /RW \* STRETCH_MAX/.test(s) },
      { file: "viewer/shops/shopWindow.js", what: "keeps ?shopscale=old (the stretched room)", test: (s) => /shopscale=old/.test(s) },
    ],
  },
};
