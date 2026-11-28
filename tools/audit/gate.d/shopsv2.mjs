// gate row `shopsv2` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shopsv2",
  script: "tools/audit/shopsV2Check.mjs",
  args: ["--quiet"],
  guards: "the layered shop interiors of every type + their glass dressing (rule shop-room-layers, docs/SHOPS_V2_PLAN.md jobs 3-7): (shops7) four KTX2 2D arrays for 16 variants, two per interior type (textures/shops/interiors_v2.ktx2 17 x 1024 x 512: day rooms + the L4 sticker sheet; interiors_v2c.ktx2 16 x 1024 x 512: day display / composite; interiors_v2n.ktx2 32 x 512 x 256: day mid + near cards; interiors_v2m.ktx2 64 x 512 x 256: the night layers; shopScale.js V2_ARRAYS / V2_SLOT, the encoder heap's layer cap per size) with full mips, together <= 40 MB GPU and <= 12 MB download; the shader's v2 fetches = shopScale.js V2_FETCH (4 room layers + 1 sticker near, 1 composite far) within budget, only through fetchV2 at an explicit level, near / far, day / night and the sticker zones as branches, slot() = V2_SLOT, the shutter / blinds / dirt procedural (no fetch); the bake's variants and each one's depth = shopScale.js V2 / DEPTH of its type (metric), planes / slabs / layer size, every piece inside the room box (room_bounds_check); every window with a variant of its own type and within +-10 % across, every variant shown somewhere; the generic room <= 12 % of the windows; the neighbour rule (no same-type twins with the same variant within 12 m; no pair waiting: 2 variants a type); the sticker cells inside the layer, not overlapping; every variant's day / night gain (shopScale.js V2_GAIN) present and in range, day gain x measured luminance (V2_LUM) = one target +-5 %, the night gain = the half-way-in-log formula on the measured night luminance +-5 %, no night bake below V2_NIGHT_MIN (shops7: the boutique / salon / shop ones were near black), applied per variant in the shader, the closed look unchanged (closedV2 0.1)",
  timeout: 120,
  deps: ["data/streetlife/", "data/shops/terraces.json", "tools/blender/shopInteriors.py", "tools/shops/stickers.py", "textures/shops/interiors_v2.ktx2", "textures/shops/interiors_v2c.ktx2", "textures/shops/interiors_v2n.ktx2", "textures/shops/interiors_v2m.ktx2", "viewer/shops/shopWindow.js", "viewer/shops/shopScale.js"],
  meta: {
    features: [{ key: "shopsv2", type: "old" }],
    clean: ["viewer/shops/"],
    text: [
      { file: "viewer/shops/shopWindow.js", what: "keeps ?shopsv2=old (every window on the v1 atlas)", test: (s) => /shopsv2=old/.test(s) },
      { file: "viewer/shops/shopWindow.js", what: "loads the v2 layers as KTX2 arrays (interiors_v2 / v2c / v2n / v2m .ktx2, CompressedArrayTexture check)", test: (s) => /interiors_v2\.ktx2/.test(s) && /interiors_v2c\.ktx2/.test(s) && /interiors_v2n\.ktx2/.test(s) && /interiors_v2m\.ktx2/.test(s) && /isCompressedArrayTexture/.test(s) },
      { file: "viewer/streetlife/layout.js", what: "applies the neighbour rule (shopScale.js neighbourVariants) to the tile's shop windows", test: (s) => /neighbourVariants\(/.test(s) },
      { file: "viewer/shops/shopLayout.js", what: "picks each shop's v2 room by a hash among its type's variants (shopScale.js v2Slot with hash01(id + \"v\"))", test: (s) => /v2Slot\([^)]*hash01\(id \+ "v"\)\)/.test(s) },
    ],
  },
};
