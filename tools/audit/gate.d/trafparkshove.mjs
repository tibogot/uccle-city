// gate row `trafparkshove` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "trafparkshove",
  script: "tools/trafParkSimTest.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--tile", "I6", "--secs", "240", "--shove", "60", "--seed", "11"],
  guards: "trafparksim on another parked set: 60 shoved cars, seed 11 (claude/parking1: a car easing back to its lane line unchecked ran 11 cm into the car it was passing; a move in is judged ahead like a move out, ?easeback=old)",
  meta: { features: [{ key: "easeback", type: "old" }] },
};
