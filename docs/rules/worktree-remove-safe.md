---
status: provisional
added: 2026-11-23
check: `worktreeremove` (tools/audit/worktreeRemoveCheck.mjs: a throwaway worktree with a junction to an outside folder is removed by tools/worktreeRemove.mjs and the outside folder keeps every file)
---
**Rule.** A job worktree is removed ONLY by `tools/merge.mjs` (after a merge) or by `node tools/worktreeRemove.mjs <path> --repo <main checkout>`. Never by hand: no `git worktree remove --force`, no recursive delete of a worktree folder, by anyone (coordinator or agent). The tool removes every junction / symlink inside AS A LINK, scans again and refuses while any link is left, counts every link target's files before and after, and only then runs `git worktree remove`. A temp worktree made for a comparison is removed the same way. Job briefs say so.

**Why.** On 2026-11-23 I made a temp worktree to measure the pre-merge foundation, with junctions for data/raw and the two node_modules. My by-hand unlink in Git Bash failed on a Windows path-quoting error (`cmd //c rmdir "$(cygpath -w ...)"`), and `git worktree remove --force` ran anyway. It followed the still-active junctions and deleted the contents of the main checkout's `data/raw`: 3,129 git-ignored files, never committed, and every worktree's data/raw links to that one folder. It also emptied `tools/road_audit/node_modules`. The live site was not affected (it uses built, committed data). data/raw was re-fetched from the sources (docs/DATA_RESTORE_2026-11-23.md).
