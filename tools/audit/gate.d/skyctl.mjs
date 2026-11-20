// gate row `skyctl` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "skyctl",
  script: "tools/audit/skyctlCheck.mjs",
  args: [],
  guards: "the dev panel's sky controls: every URL key has a features row + panel control with one range, defaults = the sky's own (the look as before), extras neutral, no lights, uniforms only (claude/skyctl)",
};
