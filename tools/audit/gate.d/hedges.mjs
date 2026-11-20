// gate row `hedges` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "hedges",
  script: "tools/audit/hedgeGate.mjs",
  node: ["--import","./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "garden hedges (viewer/gardens/gardenHedge.js, baked clipped surface): no LOD dither inside 40 m (the lumps flat before the body hand-over: identical shapes swap), the cards a shrink morph gone before their end dither, triangles per LOD <= old, the worst 25 m-grid view on all tiles <= old x 1.15, 3 body + 1 card draws, every LOD's foot 12 % under the base line, modules on a bumpy ground never floating, no DynamicDrawUsage / light, ?hedges=old (claude/hedges)",
  meta: {
    features: [{ key: "hedges", type: "old", group: "world" }],
    clean: ["viewer/gardens/gardenHedge.js"],
  },
};
