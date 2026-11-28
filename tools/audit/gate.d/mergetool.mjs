// gate row `mergetool` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "mergetool",
  script: "tools/audit/mergeToolCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/merge.mjs"],
  guards: "tools/merge.mjs gates a merge against the commit before it (rule merge-gate-base, coordinator 2026-11-23): with --no-merge the base is fixed from the merge commit's first parent before the tool commits the rebuilt bundle; a throwaway repo shows the fixed base is the pre-merge commit and the old HEAD^1 was the merge itself",
  timeout: 120,
};
