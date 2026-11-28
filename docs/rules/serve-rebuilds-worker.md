---
status: provisional
added: 2026-11-28
check: `tourbundle` (tools/audit/tourBundleCheck.mjs: a marker added to viewer/tileWorker.js while serve.mjs runs is in the next bundle request, with the "rebuilt" line; a source that no longer builds is answered 503, never the stale build)
---
**Rule.** `tools/tour/serve.mjs` never serves a tile-worker build older than its sources. On every `/viewer/tileWorker.bundle.js` request (checked at most once a second) it compares the size + mtime of every file esbuild read for the current build; when one changed it rebuilds (tools/tour/freshBundle.mjs) and logs `WORKER SOURCES CHANGED ... rebuilt, code hash A -> B`. A rebuild that fails is answered 503 with a loud REFUSING line until a source change builds again; the stale build is never sent.

**Why.** 2026-11-28: serve.mjs built the bundle once at start-up. A server left running across a merge served the pre-merge worker, the tour drew stale tiles and flagged 20 views that were not regressions.
