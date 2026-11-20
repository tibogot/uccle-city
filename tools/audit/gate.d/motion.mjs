// gate row `motion` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "motion",
  script: "tools/audit/motionAudit.mjs",
  args: [],
  guards: "motion vectors on every mover + upscale guarantees (claude/sharp)",
};
