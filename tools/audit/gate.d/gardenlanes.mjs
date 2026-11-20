// gate row `gardenlanes` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gardenlanes",
  script: "tools/gardens/fitGardens.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--check","--all","--quiet","--jobs","4","--max","gardenInLane=0"],
  guards: "no garden piece the city keeps (wall / railing, pier, closed driveway gate) reaches 0.3 m into a driven lane on a measured roadway (rule house-front-garden-closed, claude/gates: tools/gardens/fitGardens.mjs --lanes moves a run back into the garden as one, 0.1-0.8 m); lane data through unmeasured land counted as laneData (docs/GATES.md)",
};
