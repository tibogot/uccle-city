// gate row `roadsim` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "roadsim",
  script: "tools/audit/census/roadSim.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet","--max","perKm=12,wobblePerKm=8.5"],
  guards: "class R in the running sim (claude/roads, rule 38): the traffic cars' own poses on I6 / E7 / J6 / D6 for 120 s, judged in their lane's road frame: slalom metres per km of lane driven <= 12 (10.0 measured; ?roads=old 122.6), wobble <= 8.5 / km (7.1; old 71.6)",
};
