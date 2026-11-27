// gate row `timingretry` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "timingretry",
  script: "tools/audit/timingRetryCheck.mjs",
  args: ["--quiet"],
  timing: true,       // (it times a fixture path and the props row's solver: alone, with the timing rows)
  deps: ["tools/gate/retry.mjs", "tools/gate/timing.mjs", "tools/audit/timingRetryFixture.mjs", "tools/audit/mergeGate.mjs", "tools/propsTest.mjs"],
  guards: "a timing-only failure (exit 75, tools/gate/timing.mjs gateExit) is re-run alone up to 3 times and still FAILS a real regression (rule timing-rows-alone, claude/gateflakes): R1 the retry policy (75 x4 -> FAIL after 4 runs, 75 then 0 -> PASS, 1 / a timeout -> FAIL at once, never retried); R2 a fixture timing row as a child: quiet PASS, its path 4 x dearer (GATE_SLOW=fixture) exit 75 on all 4 runs -> FAIL, a structural failure exit 1 after 1 run; R3 propsTest with its solver block 8 x dearer (GATE_SLOW=props) exits 75 with its cost check FAILED",
};
