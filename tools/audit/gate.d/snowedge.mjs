// gate row `snowedge` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "snowedge",
  script: "tools/audit/snowEdgeCheck.mjs",
  args: ["--quiet"],
  guards: "the snow layer's edges (claude/snowfix, rules overhead-fill-bounded, snow-edge-sdf, snow-thin-ledge, wx-bake-drawn-only; the snow-day defects of 2026-11-27): the overhead shape pass (viewer/weather/overheadShape.js) on synthetic bakes: a sparse road pass is never flooded by the hole fill (Saint-Job's bare patch); the cut edge round a salted patch at 8 angles within 2.5 cm of its 1 m running mean (the stair-step detector; old: 10-13 cm); a 13 cm kerb's cut never opens; wall feet not cut; 0.3 / 0.42 m raised copings keep no layer cell, a 2 m platform keeps its own; mark() bakes only what the camera draws and the props / lamp extras / poles are shelter; --old (the four ?...=old switches) fails the row",
  meta: {
    features: [{ key: "wxfill", type: "old", group: "weather" }, { key: "snowsdf", type: "old", group: "weather" }, { key: "wxdrawn", type: "old", group: "weather" }, { key: "wxprops", type: "old", group: "weather" }],
  },
};
