// gate row `sunshadowstep` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "sunshadowstep",
  script: "tools/audit/sunShadowStepCheck.mjs",
  args: ["--quiet"],
  guards: "sun shadow step (rule sun-shadow-step, claude/sunstep): the sun shadow cache keys on a STEPPED shadow sun (a step moves a 30 m caster's tip <= 1 map texel of the box, leading the motion; simulated day at 1x and 60x: tip error <= 1 texel, <= 1 step / 5 s above 15 deg at 1x, <= 25 % of frames at 60x; a still sun never steps), the shading on the live sun, no direction formatted into the key; the far plane reaches the box's deepest receiver at the sun's elevation (brute force), the bias kept in metres, receivers past it fade to lit; each behind its ?x=old",
  meta: {
    features: ["sunstep", "sunfar"].map((key) => ({ key, type: "old", group: "perf", sub: "Renders per frame" })),
  },
};
