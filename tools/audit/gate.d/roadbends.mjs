// gate row `roadbends` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "roadbends",
  script: "tools/audit/roadBends.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "road-engine strips at sharp bends, all tiles: 0 folded triangles (plan vs station / lateral frame), no spike, no crack between a row's copies, no exposed hole added, the engine sidewalks / verges (drawn where UrbIS maps nothing) 0 folded too, every vertex the trim moved near a folding bend (the rest bit-identical, kept triangles in order), the default build path = the audited trim (claude/curvedroads, docs/roads/BENDS.md)",
};
