// gate row `tourdet` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tourdet",
  script: "tools/tour/tourDeterminism.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: [],
  guards: "the visual tour is deterministic: views.json / views_xmas.json common switches carry still=1, and under ?still=1 the traffic sim's random parked-car pull-outs / reverse-ins are off (parkRate 0), normal play keeps 1 (claude/deckrail, docs/TOUR.md)",
};
