// gate row `gatedirdeps` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gatedirdeps",
  script: "tools/audit/gateDirDepsCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/gate/deps.mjs"],
  guards: "the gate's --changed selection: an added / deleted path touches every directory a row listed among its ancestors, so a new sub-directory (models/villa/) re-runs the rows that scan the parent (heroshell) (rule gate-dir-deps, coordinator 2026-11-23)",
  timeout: 60,
};
