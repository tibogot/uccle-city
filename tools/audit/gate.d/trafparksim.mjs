// gate row `trafparksim` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "trafparksim",
  script: "tools/trafParkSimTest.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--tile","I6","--secs","240"],
  guards: "simulated traffic never drives through a parked car (tile I6, 240 s) (claude/trafpark)",
};
