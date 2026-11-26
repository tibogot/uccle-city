// gate row `timberfence` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "timberfence",
  script: "tools/audit/timberFenceCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality1 round 3, rule timber-fence) every OSM wooden fence (barrier=fence, fence_type wood / split_rail / post_and_rail / pole / rail, or material wood) in the built tiles has its run in data/fences/timber.json, posts <= 2.45 m apart, none inside a building; on the terrain every post's 0.45 m footing reaches under the ground, the low rail clears the ground by >= 0.1 m along every span, the top rail never flies > 1.6 m over a dip; viewer/fences/timberFence.js one shared material and box, instanced, no dynamic buffers, the hashed far fade, the collider roots",
  timeout: 60,
  deps: ["data/fences/", "tools/fences/build_timber.py", "viewer/fences/timberFence.js"],
  meta: { features: [{ key: "timberfence", type: "on" }] },
};
