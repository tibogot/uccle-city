// gate row `allocbudget` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "allocbudget",
  script: "tools/perf/allocBudget.mjs",
  args: ["--quiet"],
  alone: true,        // (in the alone group, one at a time, like the timing rows: it drives a city page and takes browser.lock
                      // itself; no wall-time assert: KB a frame holds up under load)
  heavy: true,
  timeout: 2400,      // (s: it may wait for browser.lock, then two city boots under the sampler)
  deps: ["viewer/", "models/", "debug/falconStutter.js", "debug/gamePerf.js", "tools/perf/allocSample.mjs", "tools/perf/allocBudget.json", "tools/tour/serve.mjs", "tools/tour/freshBundle.mjs"],
  guards: "the allocation budget (rule alloc-rate, claude/allocrate2): a 25 s falcon flight and a 25 s police drive under the allocation sampler (tools/perf/allocSample.mjs: its own Chrome, muted, browser.lock held, the process trees killed) keep the sampled JS KB a frame under tools/perf/allocBudget.json (measured + 25 %); the villa merge's drive deck had doubled the falcon flight's garbage (2.9 MB a frame) and no row saw it",
};
