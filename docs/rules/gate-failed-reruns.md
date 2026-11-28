---
status: provisional
added: 2026-11-23
check: `gatedirdeps` (tools/audit/gateDirDepsCheck.mjs: a row whose last trace says ok:false is selected by --changed with no change touching it; after a PASS the same row is skipped)
---
**Rule.** A gate row whose LAST run failed is selected by `--changed` every time, until it passes. "Touched or not" is never judged on a failed run's trace. Its "files read" are only what it read before it failed or timed out.

**Why.** claude/indpool (2026-11-23): one `--changed` run reported a FAIL. The row's trace was rewritten from that failed run, which stopped early and read only part of its deps. The next `--changed` run then judged the row "not touched" and skipped it, so a failing row could disappear from the gate without ever passing. The agent had to re-run every candidate with `--full` to find it (all 7 passed, most likely a timing row under the parallel load).
