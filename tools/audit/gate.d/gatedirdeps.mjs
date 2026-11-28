// gate row `gatedirdeps` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gatedirdeps",
  script: "tools/audit/gateDirDepsCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/gate/deps.mjs", "tools/gate/select.mjs"],
  guards: "the gate's --changed selection (rules gate-dir-deps + gate-failed-reruns, coordinator 2026-11-23): an added / deleted path touches every directory a row listed among its ancestors, so a new sub-directory (models/villa/) re-runs the rows that scan the parent (heroshell); a row whose last run FAILED is re-run until it passes (a failed run's truncated trace never decides 'not touched')",
  timeout: 60,
};
