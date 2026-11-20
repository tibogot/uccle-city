// gate row `birds` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "birds",
  script: "tools/audit/birdGate.mjs",
  node: ["--preserve-symlinks","--import","./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "sky flocks never a ball (owner 2026-11-18): on the CPU mirror of the GPU step (viewer/birds/flockModel.js), starlings / pigeons / jackdaws / parakeets / gulls + the 3072 / 900 murmuration 90 s each: principal axes c/a median <= 0.45 and ball-like <= 10 % of the time, b/a varying, a path flown, nearest neighbour >= 3 spans (day) / p5 >= 1 span, on screen from 150 m >= 40 px wide with <= 35 % of birds merging; the ?birds2=old mirror shown failing (the ball reproduced); the compute compiles to WGSL headless (both modes); pair tests <= old, no DynamicDrawUsage / light, compute built once (claude/birds2, docs/BIRDS.md §8)",
};
