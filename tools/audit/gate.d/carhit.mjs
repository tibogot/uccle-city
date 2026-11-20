// gate row `carhit` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "carhit",
  script: "tools/carHitTest.mjs",
  args: ["--quiet"],
  guards: "two-way car contact (rule 37, docs/CARHIT.md): head-on / T-bone / rear-corner nudge / tap / van vs small car, never inside a wall, momentum kept, no NaN, solver cost, no allocation in the step",
  timing: true,
};
