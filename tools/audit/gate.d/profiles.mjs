// gate row `profiles` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "profiles",
  script: "tools/audit/profileCheck.mjs",
  args: ["--quiet"],
  deps: ["tools/gate/chromeProfile.mjs", "tools/gate/lock.mjs", "tools/perf/allocSample.mjs", "tools/perf/allocBudget.mjs", "tools/perf/gpuTrace.mjs", "tools/"],
  guards: "no temp Chrome profile is left behind (rule chrome-profiles-removed, claude/tooling2: 28 uccle-alloc-* / uccle-ab-* profiles, ~17 GB, 2026-11-28), in a scratch temp folder: tools/gate/chromeProfile.mjs makeProfile removed on exit / a throw / process.exit; a hard-killed maker's profile swept (maker dead); the sweep keeps a live maker's, an old tool's under 2 h and a non-profile uccle-* folder, removes one over 2 h; allocSample with a stand-in Chrome exits with no profile left and its lock released, killed hard mid-run the sweep leaves none; every own-Chrome tool's profile comes from makeProfile, allocBudget's cleanup sweeps",
  timeout: 120,
};
