---
status: provisional
added: 2026-11-26
check: `perfharness` (tools/audit/perfHarnessCheck.mjs: debug/tabLoads.js counts a tab's page loads in sessionStorage; debug/gamePerf.js, debug/playTime.js and debug/perf5Run.js import it, carry tabLoads / freshTab in their reports, and gamePerf's `valid` is false on a reused tab; the harness headers say "fresh tab")
---
**Rule.** A timed page load runs in a FRESH tab. Open a new tab (about:blank), close the previous one, then navigate the new tab. Never reload the same tab between timed runs. One tab at a time stays the rule (one-chrome-tab): the new one replaces the old one. Every perf harness reports `tabLoads` / `freshTab` (debug/tabLoads.js), and a run with `freshTab: false` does not count.

**Why.** On the quiet laptop (2026-11-26, docs/perf/QUIET_2026-11-26.md), about 20 reloads of the city in one tab filled the GPU's memory: 5.66 of 6.14 GB, Chrome 5.5 GB, 3.2 GB of RAM free. The next police drive then ran at 17 fps with 0.6-6.9 s stalls: 77 frames over 50 ms vs 3-5. Closing the tab freed all of it (320 MB in use). Before the stall shows, a reused tab is also slowly worse: the same-tab police drives earlier that session ran at a CPU loop of 12.8-14.2 ms vs 12.1-12.5 in fresh tabs. perf8 saw the same with about:blank (the old renderer kept 2.2 GB). The tab's page-load count survives a reload in sessionStorage and starts at 1 in a new tab, so each harness can tell.
