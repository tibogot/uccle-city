// gate row `tourbundle` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tourbundle",
  script: "tools/audit/tourBundleCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/tour/serve.mjs", "tools/tour/freshBundle.mjs", "tools/build_worker.mjs", "viewer/tileWorker.js", "viewer/tileWorker.bundle.js"],
  guards: "a branch's city tour draws the branch's tiles (rule tour-fresh-bundle, coordinator 2026-11-23): tools/tour/freshBundle.mjs builds byte for byte what tools/build_worker.mjs commits (in place, when no worker input changed since the merge base); tools/tour/serve.mjs serves that fresh build at /viewer/tileWorker.bundle.js, names a stale committed bundle at start-up, and a marker planted in the served checkout's viewer/tileWorker.js reaches the browser; --committed-bundle serves the committed file",
  timeout: 300,
};
