// gate row `worktreeremove` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "worktreeremove",
  script: "tools/audit/worktreeRemoveCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/worktreeRemove.mjs", "tools/merge.mjs"],
  guards: "removing a job worktree never deletes through a junction (rule worktree-remove-safe, 2026-11-23: a by-hand git worktree remove --force emptied the main checkout's data/raw): tools/worktreeRemove.mjs on a throwaway repo + worktree holding a junction to a folder outside it removes the worktree and leaves every file of the junction's target; tools/merge.mjs still counts data/raw before and after its own removal",
  timeout: 120,
};
