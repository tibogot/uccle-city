// gate row `bmx` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bmx",
  script: "tools/audit/bmxCheck.mjs",
  args: ["--quiet"],
  guards: "the kid's BMX (models/bike/bmx.glb): the moving nodes + rider / contact empties under the right parents, no scale, pivots on the lab's numbers (wheelbase 0.95, wheel 0.254, head angle 74, fork offset 28 mm, BB 0.29, cranks 175 opposite), every node's 3 LODs within budget (16k / 8.5k / 2k), named slots only, spoke cards blended + KTX2 (rule 23), chain KTX2, mesh audit 0 blocking per LOD (claude/bmx, docs/BMX.md)",
};
