// gate row `jitter` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "jitter",
  script: "tools/audit/jitterCheck.mjs",
  node: ["--preserve-symlinks","--import","./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "thin bars pre-filtered (owner 2026-11-18: gates, fences, grilles shimmer while moving): census class J (tools/audit/census/thinBars.mjs) strokes drawn as geometry under 1 internal px <= 12 garden ironwork (per piece set) / 11 façade kit (?jitter=old: 421 / 312 fails); every card atlas a full box-mip chain keeping level 0's coverage, every carded stroke on its card's coverage, kit cards stretching like their strokes; cards blended with a 4 % depth cut (no A2C / shadow), WGSL builds headless; the sun's shadows unchanged; ?jitter=old row, no DynamicDrawUsage / light (claude/jitter, rule 35 provisional, docs/JITTER.md)",
  meta: {
    features: [{ key: "jitter", type: "old" }],
    clean: ["viewer/thinBars.js", "viewer/thinCards.js", "viewer/gardens/gardenKit.js", "viewer/facadeKit/kitField.js", "viewer/facadeKit/kitMaterials.js"],
  },
};
