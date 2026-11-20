// gate row `orbitcam` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "orbitcam",
  script: "tools/orbitCamTest.mjs",
  args: [],
  guards: "orbit camera: picks, orbit / zoom / pan / frame, keyboard moves (no NaN, over the ground, speed by height, walls stop it) (claude/orbitcam2)",
  timing: true,
};
