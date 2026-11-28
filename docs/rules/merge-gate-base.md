---
status: provisional
added: 2026-11-23
check: `mergetool` (tools/audit/mergeToolCheck.mjs: the --no-merge base is fixed from the merge commit's first parent before any commit by the tool; a throwaway repo shows it names the pre-merge commit, where HEAD^1 read after the bundle commit names the merge commit)
---
**Rule.** `tools/merge.mjs` gates the MERGED tree against the commit before the merge, never against the merge commit. The base is fixed at the start, before the tool commits anything: the current HEAD for a normal merge, and the merge commit's first parent (`<merge>^1`) for `--no-merge`, the resume after a hand-resolved conflict. It prints the base ("gate base: <sha> (<subject>)") so a reader sees what the gate compared against. A gate that skipped almost every row on a merge that changed code is a red flag: read the "skipped" list before trusting "all gate checks pass".

**Why.** On 2026-11-23 claude/lanes5's merge conflicted in tools/audit/trafmixGate.mjs. I resolved it, committed, and resumed with `--no-merge`. The tool rebuilt the worker bundle and committed it, THEN read `HEAD^1` for the gate's base, and by then HEAD^1 was the merge commit itself. So the gate saw only the bundle (plus untracked scratch files) as changed, skipped 68 rows including trafmix, ran in 5 s and said "all gate checks pass", and the merge was pushed. The branch had passed its own gate in its worktree, but the merged tree (with the villa merge and the hand-resolved conflict) was not gated until a manual `mergeGate --changed --base <pre-merge>` afterwards.
