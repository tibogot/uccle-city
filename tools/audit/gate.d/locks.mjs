// gate row `locks` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "locks",
  script: "tools/audit/lockCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/gate/lock.mjs", "tools/audit/mergeGate.mjs", "tools/merge.mjs", "tools/perf/allocBudget.mjs", "tools/perf/allocSample.mjs", "tools/perf/gpuTrace.mjs", "tools/gate/chromeProfile.mjs", "tools/"],
  guards: "the shared locks (rules gate-lock-held + browser-lock-helper, claude/tooling2), on scratch lock files: a live, beating holder is never taken (busy = code 76, the file unchanged; allocBudget overwrote xmasperf4's browser.lock); stale = the pid dead or no heartbeat > 10 min, a legacy no-pid lock 38 min old is NOT stale (the 2026-11-28 take-over), 130 min is; released on exit / a throw / process.exit, a hard kill's lock taken over (logged), the same owner nests, 4 racers for one stale lock: one wins; mergeGate waits for gate.lock (GATE_LOCK_WAIT_S -> 76), takes + releases it, --no-lock, nested under merge.mjs (no self-deadlock); merge.mjs holds it for the whole merge; allocbudget with browser.lock busy exits 76 in seconds (mergeGate re-runs it, BUSY not FAIL); no tool writes a lock file itself, every own-Chrome tool takes browser.lock through tools/gate/lock.mjs",
  timeout: 180,
};
