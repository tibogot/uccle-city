// gate row `twinlink` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "twinlink",
  script: "tools/audit/twinLink.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--quiet"],
  guards: "tile-border lane links: >= 99 % of the buffer copies with a twin in a loaded neighbour linked to it, 0 wrong links, link <= 5 ms per tile pair (13 tiles: Saint-Job 3 x 3 + Alsemberg) (claude/twinlink, docs/TWINLINK.md)",
};
