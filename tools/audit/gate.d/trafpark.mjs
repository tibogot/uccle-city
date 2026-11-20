// gate row `trafpark` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "trafpark",
  script: "tools/audit/trafParkAudit.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet","--max","0","--all"],
  guards: "no parked car overlaps a traffic lane, all tiles (claude/trafpark)",
};
