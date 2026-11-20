// gate row `shell` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shell",
  script: "tools/audit/shellGate.mjs",
  args: [],
  guards: "every building's outer shell closed from the street: no wall wound inward, no open edge (claude/holes)",
};
