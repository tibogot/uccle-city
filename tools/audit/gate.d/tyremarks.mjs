// gate row `tyremarks` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "tyremarks",
  script: "tools/tyreMarksTest.mjs",
  node: ["--expose-gc","--import","./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "tyre marks (rule 48, docs/TYREMARKS.md): the car (carCtl) straight = none, handbrake drift = the rears, a full dry brake = a faint mark only, a half brake none; the front-lock rule (a 22 deg drift: rears only, a 57 deg spin: the fronts too), touch-down scuffs (car, Villo), the motorbike rear lock (rear only) and none in the air; the ring wrapped 1.5 x with no NaN, uploads by 1-2 ranges only, an unrendered frame keeps its span, no DynamicDrawUsage, births + the age fade, the material builds to WGSL, zero allocation, < 0.05 ms per update",
  timing: true,
  meta: {
    clean: ["viewer/drive/tyreMarks.js"],
  },
};
