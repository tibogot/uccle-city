// gate row `shopsv2` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shopsv2",
  script: "tools/audit/shopsV2Check.mjs",
  args: ["--quiet"],
  guards: "the layered cafe / restaurant interiors (rule shop-room-layers, docs/SHOPS_V2_PLAN.md jobs 3-4): textures/shops/interiors_v2.ktx2 a 16-layer KTX2 2D array with full mips, <= 12 MB GPU and <= 4 MB download; the shader's v2 fetches (shopWindow.js nearV2 / farV2) = shopScale.js V2_FETCH (4 near, 1 composite far) within budget, only through fetchV2 at an explicit level, near / far and day / night as branches; the bake's v2 room (RD2, planes, slabs, layer size) = shopScale.js V2, its depth = DEPTH.cafe (metric), every v2 window within +-10 % across and with a variant the array holds",
  timeout: 120,
  deps: ["data/streetlife/", "data/shops/terraces.json", "tools/blender/shopInteriors.py", "textures/shops/interiors_v2.ktx2", "viewer/shops/shopWindow.js"],
  meta: {
    features: [{ key: "shopsv2", type: "old" }],
    clean: ["viewer/shops/"],
    text: [
      { file: "viewer/shops/shopWindow.js", what: "keeps ?shopsv2=old (every window on the v1 atlas)", test: (s) => /shopsv2=old/.test(s) },
      { file: "viewer/shops/shopWindow.js", what: "loads the v2 layers as a KTX2 array (interiors_v2.ktx2, CompressedArrayTexture check)", test: (s) => /interiors_v2\.ktx2/.test(s) && /isCompressedArrayTexture/.test(s) },
    ],
  },
};
