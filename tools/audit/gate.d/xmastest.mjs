// gate row `xmastest` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "xmastest",
  script: "tools/christmas/xmasTest.mjs",
  node: ["--import","./tools/christmas/hook.mjs"],
  args: [],
  guards: "the Christmas layer offline: the date switch (1 Dec - 6 Jan, ?xmas, ?day), the kit's pieces / levels / attributes, every slot material builds, lights emissive only, the fir's needle cards (canopy normals on the decoded GLB on both card levels, alpha tested not blended, two-sided), the depth pre-pass pair (twin: alpha + band, no colour, @invariant; lit: EQUAL, no discard), the field's twins drawn first and the shadow-only casters (the far level's solid fronds, shadow layer, each level's band), the 30 -> 70 m walk through the 45 m switch, the shop-front families, the level buckets (claude/christmas, claude/xmasfir, claude/xmasfir3)",
};
