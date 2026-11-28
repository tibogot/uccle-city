// gate row `tourbundle` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tourbundle",
  script: "tools/audit/tourBundleCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/tour/serve.mjs", "tools/tour/freshBundle.mjs", "tools/build_worker.mjs", "viewer/tileWorker.js", "viewer/tileWorker.bundle.js", "sw.js", "tools/perf/allocBudget.mjs"],
  guards: "a branch's city tour draws the branch's tiles (rules tour-fresh-bundle + serve-rebuilds-worker, coordinator 2026-11-23): tools/tour/freshBundle.mjs builds byte for byte what tools/build_worker.mjs commits (in place, when no worker input changed since the merge base); tools/tour/serve.mjs serves that fresh build at /viewer/tileWorker.bundle.js, names a stale committed bundle at start-up, and a marker planted in the served checkout's viewer/tileWorker.js reaches the browser; rule serve-rebuilds-worker (claude/tooling2): a marker added while the server runs is in the next bundle request (rebuilt, logged), a source that no longer builds is answered 503, never the stale build; --committed-bundle serves the committed file; rule local-origins-capped: a port outside 8837-8842 is refused, /sw.js on a local check is the self-removing worker, --keep-sw the real file",
  timeout: 300,
};
