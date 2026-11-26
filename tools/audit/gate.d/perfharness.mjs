// gate row `perfharness` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "perfharness",
  script: "tools/audit/perfHarnessCheck.mjs",
  args: ["--quiet"],
  guards: "every timed page load in a FRESH tab (rule perf-fresh-tab, claude/perf5: ~20 reloads in one tab filled the GPU's memory and stalled the drives): debug/tabLoads.js counts a tab's page loads in sessionStorage; gamePerf / playTime / perf5Run report tabLoads / freshTab, gamePerf's valid needs a fresh tab",
  timeout: 60,
};
