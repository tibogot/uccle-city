// gate row `walllook` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "walllook",
  script: "tools/audit/wallLook.mjs",
  args: ["--quiet"],
  guards: "the retaining walls' brick / coursed stone read as brick / stone (viewer/streets/wallPattern.js, the same math the shader runs): head-on at 4-40 m with the game camera, luminance contrast >= 0.08 up to 12 m, the face's mean within 8 % of the near face's at every distance; round 3's flat brick rebuilt and required to fail; roadPaint.js wired to it inside its Fn (claude/sidewalk round 5, rule 31)",
};
