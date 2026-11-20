// gate row `railcorridor` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "railcorridor",
  script: "tools/audit/census/railCorridor.mjs",
  node: ["--import","./tools/road_audit/register.mjs","--import","./tools/heap/register.mjs"],
  args: ["--all","--quiet","--worst","0","--max","bedSink=5,openReach=0,fenceGap=72,postFloat=7,fenceStep=0,fenceGhost=58"],
  guards: "census class T, rule 39, the 32 rail tiles (docs/RAIL_T.md): track metres where the car sinks in the ballast <= 5 (51 before; left: the two road tunnels' lids), track bed reached by car from a street 0 m (8,108 before: a flood fill over the drive grid, car-wide, every collider), fence panels floating <= 72 m (185; +0.8 m at E10 after the roads + sidewalk merge) / posts floating <= 7 (57; both: the tunnel lids' stepped drawn earth), stepped bays 0 (1,173), fence walls over / under the drawn fence <= 58 m (12,002); ?rail=old (--old) fails",
};
