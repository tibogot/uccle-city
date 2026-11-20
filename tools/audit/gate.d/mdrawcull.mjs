// gate row `mdrawcull` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "mdrawcull",
  script: "tools/audit/mdrawCull.mjs",
  node: ["--import","./tools/heap/register.mjs"],
  args: ["--quiet"],
  guards: "multi-draw culls (viewer/multiDraw.js) on a synthetic city: chunks tile every part exactly (CHMAX fallback too), no instance in a view / sun / lamp frustum lost vs 160 m chunks, fewer drawn with ?mdchunk=80, view camera near to far with ?mdsort=1, shadow + blended passes in the old order, defaults 160 m / 48 unsorted, indirect <= 2560 B a part with range uploads, sort <= 20 us, cull <= 2 x old (claude/mdraw, docs/AGARGARO.md)",
  timing: true,
  meta: {
    features: [{ key: "mdsort", type: "opt" }, { key: "mdchunk", type: "opt", on: "80" }],
    text: [{ file: "viewer/main.js", what: "registers the view camera (only its culls are sorted)", test: (s) => /setMultiDrawViewCamera\(camera\)/.test(s) }],
  },
};
