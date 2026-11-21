// gate row `shopsv2` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shopsv2",
  script: "tools/audit/shopsV2Check.mjs",
  args: ["--quiet"],
  guards: "the layered shop interiors of every type + their glass dressing (rule shop-room-layers, docs/SHOPS_V2_PLAN.md jobs 3-6): three KTX2 2D arrays for 9 variants (textures/shops/interiors_v2.ktx2 19 x 1024 x 512: day room + display / composite + the L4 sticker sheet; interiors_v2c.ktx2 9 x 1024 x 512: day near cards; interiors_v2n.ktx2 45 x 512 x 256: day mid cards + the night layers; shopScale.js V2_SLOT, <= 24 layers of 1024 px a file: the encoder heap) with full mips, together <= 40 MB GPU and <= 12 MB download; the shader's v2 fetches = shopScale.js V2_FETCH (4 room layers + 1 sticker near, 1 composite far) within budget, only through fetchV2 at an explicit level, near / far, day / night and the sticker zones as branches, the shutter / blinds / dirt procedural (no fetch); the bake's variants and each one's depth = shopScale.js V2 / DEPTH of its type (metric), planes / slabs / layer size; every window with a variant of its own type and within +-10 % across; the generic room <= 12 % of the windows; the neighbour rule (no same-type twins with the same variant within 12 m when the type has 2+ variants); the sticker cells inside the layer, not overlapping",
  timeout: 120,
  deps: ["data/streetlife/", "data/shops/terraces.json", "tools/blender/shopInteriors.py", "tools/shops/stickers.py", "textures/shops/interiors_v2.ktx2", "textures/shops/interiors_v2c.ktx2", "textures/shops/interiors_v2n.ktx2", "viewer/shops/shopWindow.js"],
  meta: {
    features: [{ key: "shopsv2", type: "old" }],
    clean: ["viewer/shops/"],
    text: [
      { file: "viewer/shops/shopWindow.js", what: "keeps ?shopsv2=old (every window on the v1 atlas)", test: (s) => /shopsv2=old/.test(s) },
      { file: "viewer/shops/shopWindow.js", what: "loads the v2 layers as KTX2 arrays (interiors_v2 / v2c / v2n .ktx2, CompressedArrayTexture check)", test: (s) => /interiors_v2\.ktx2/.test(s) && /interiors_v2c\.ktx2/.test(s) && /interiors_v2n\.ktx2/.test(s) && /isCompressedArrayTexture/.test(s) },
      { file: "viewer/streetlife/layout.js", what: "applies the neighbour rule (shopScale.js neighbourVariants) to the tile's shop windows", test: (s) => /neighbourVariants\(/.test(s) },
    ],
  },
};
