// gate row `trafparkborder` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "trafparkborder",
  script: "tools/audit/trafParkBorder.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: [],
  guards: "no parked car under a NEIGHBOUR tile's own lane after the border drop (8 tiles: D3 D4 E3 E4 H5 H6 I5 I6) (claude/trafpark)",
};
