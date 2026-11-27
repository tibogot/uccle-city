// gate row `motion` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "motion",
  script: "tools/audit/motionAudit.mjs",
  args: [],
  guards: "motion vectors on every mover + upscale guarantees (claude/sharp)",
  // (claude/reality2) the audit walks viewer/ (readdirSync): the trace records the files it read, not the listing, so a NEW
  // viewer module (kerbBarriers.js) changed no traced dep and the row was memo-skipped on the branch; the whole folder is a dep
  deps: ["viewer/", "tools/audit/motionAudit.mjs"],
};
