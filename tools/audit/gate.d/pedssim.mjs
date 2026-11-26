// gate row `pedssim` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "pedssim",
  script: "tools/audit/pedsAudit.mjs",
  node: ["--expose-gc", "--import", "./tools/road_audit/register.mjs"],
  args: ["--sim", "--quiet"],
  guards: "the people's city sim (claude/peds2, rules peds-density, peds-no-alloc, peds-crossings-only; viewer/pedestrians/citySim.js) headless on the Saint-Job / Wolvendael graphs: S1 density by place and hour (Saint-Job 08:30 weekday 60-260 alive within 230 m, 03:00 <= 30, Wolvendael busier at 15:00 than 08:30), S2 sampled people never on a carriageway cell off a crossing (<= 0.2 %) nor in a solid, S3 the step keeps <= 0.5 KB a step on the heap (no allocation a frame), S4 the step <= 0.5 ms",
};
