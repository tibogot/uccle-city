// THE SHOP ROOM'S METRIC SCALE (docs/SHOPS_V2_PLAN.md job 2, rule shop-room-metric): pure numbers, shared by the window
// shader (viewer/shops/shopWindow.js, in TSL) and its gate row (`shopscale`, tools/audit/shopScaleCheck.mjs, in JS).
//
// The interiors are Blender renders of a 6 m wide x 3 m high room (tools/blender/shopInteriors.py RW, RH). Before this
// job the shader stretched that room over the glass, whatever its width (nx = hx / w): a 3.4 m café window showed the
// 6 m room squeezed to 57 %, the narrowest (2.1 m) to 35 %; only 84 of the 502 windows were within 10 % of metric
// (tools/shops/shopScaleAudit.mjs, 2026-11-20). Now the glass's x in METRES is laid
// onto the room: the window sees a w-metre slice of it, at a per-shop offset (a hash), so two cafés of the same type
// do not look into the same slice. Glass up to 10 % wider than the room (6.6 m; today's widest is 6.38 m) takes the
// one room stretched by that much (a partition in the middle of a 6.2 m shop would read worse than a 6 % stretch);
// wider glass gets rooms side by side (a partition where they meet, the next one mirrored, so both show their
// right-hand wall as the partition), centred on the glass.
//
// Depth: the render is 5 m deep. The viewer's room depth comes from the type (DEPTH below, 3.5-6 m); the render's depth
// is scaled to it (the across / up scale stays metric). The next bake (plan job 3) renders each type at its own depth.

/** the render's room (shopInteriors.py: RW, RD, RH, F, CARD_Y): width, depth, height, the pinhole in front, the card plane */
export const RW = 6.0, RD = 5.0, RH = 3.0, F = 3.0, CARD_Y = 1.4;
/** the viewer's room depth (m) by interior type (shopWindow.js INTERIOR_TYPES order) */
export const DEPTH = {
  bakery: 4.0,    // a counter and the racks behind it: a shallow shop floor
  pharmacy: 4.5,
  cafe: 6.0,      // tables, then the bar at the back
  boutique: 5.0,
  grocery: 5.5,   // aisles
  office: 4.5,
  salon: 3.5,     // a row of mirror stations
  shop: 4.5,
};
export const TYPES = ["bakery", "pharmacy", "cafe", "boutique", "grocery", "office", "salon", "shop"];
export const DEPTH_BY_INDEX = TYPES.map((t) => DEPTH[t]);
/** glass up to STRETCH_MAX x RW wide keeps one room (stretched to the glass); wider = rooms side by side */
export const STRETCH_MAX = 1.1;
/** the old fixed depth (?shopscale=old) */
export const OLD_DEPTH = 4.0;

/** the per-shop offset's hash of the window seed (iWin.z = hash01(id + "w")): decorrelated from the seed's other uses */
export const offsetHash = (seed) => { const v = seed * 13.713 + 0.37; return v - Math.floor(v); };

/**
 * the room layout of one window, the JS twin of the shader's: w = the glass width (m), seed = iWin.z.
 * rooms: how many rooms side by side; roomW: each room's width on the glass (m: RW, or the glass's own width when one
 * room takes glass a little wider than RW); o: the offset (m) of the glass's left edge inside the first room (room k
 * spans glass x in [k * roomW - o, (k + 1) * roomW - o]); partitions: their x on the glass (m).
 */
export function roomLayout(w, seed) {
  const rooms = Math.max(1, Math.ceil(w / (RW * STRETCH_MAX) - 1e-6));
  const roomW = rooms === 1 ? Math.max(RW, w) : RW;
  const o = rooms === 1 ? offsetHash(seed) * Math.max(RW - w, 0) : (rooms * RW - w) / 2;
  const partitions = [];
  for (let k = 1; k < rooms; k++) partitions.push(k * roomW - o);
  return { rooms, roomW, o, partitions };
}

/** metres of the RENDER's room per metre of glass, across: 1 = metric; old = RW / w (the room stretched to the glass) */
export const acrossScale = (w, old = false) => RW / (old ? w : roomLayout(w, 0).roomW);

// ---- Shops v2 (docs/SHOPS_V2_PLAN.md jobs 3-6, rule shop-room-layers): the layered interiors of every type
// (tools/blender/shopInteriors.py --v2 -> tools/shops/pack_v2.py -> textures/shops/interiors_v2*.ktx2, KTX2 2D ARRAYS:
// V2_ARRAYS below).
/** the v2 render: each variant's room is as deep as the viewer's room of its type (DEPTH: depth scale 1, metric), the
 *  card planes (m behind the glass, L1 L2 L3, absolute: the same in every room) and the slabs of free-standing furniture
 *  each card holds; PX = a day layer's size, PXN = a night layer's (half: the night and the closed look are darker and
 *  the budget is 40 MB); RD = the café's depth (shops3) */
export const V2 = {
  RD: 6.0, PLANES: [2.6, 1.2, 0.3], SLABS: [[1.8, 3.5], [0.6, 1.8], [0.0, 0.6]], PX: [1024, 512], PXN: [512, 256],
  /** the variants in array order and the interior type each one belongs to: (shops7) two per type (the café type: café /
   *  brasserie; the others their shops5 room + a second one, shopInteriors.py v2_patisserie ... v2_bookshop) */
  VARIANTS: ["cafe", "brasserie", "bakery", "pharmacy", "boutique", "grocery", "office", "salon", "shop",
    "patisserie", "officine", "concept", "epicerie", "bank", "barber", "bookshop"],
  VARIANT_TYPE: ["cafe", "cafe", "bakery", "pharmacy", "boutique", "grocery", "office", "salon", "shop",
    "bakery", "pharmacy", "boutique", "grocery", "office", "salon", "shop"],
  LIGHTS: ["day", "night"],
  TYPES: ["bakery", "pharmacy", "cafe", "boutique", "grocery", "office", "salon", "shop"],   // every type drawn by v2
  FAR: 40, BAND: 5,         // all layers within FAR - BAND, the single composite fetch beyond FAR + BAND, both between
};
/** (shops7) FOUR KTX2 2D arrays for the 16 variants (the Basis encoder's 2 GB WASM heap takes ~24 layers of 1024 x 512
 *  in one file; 40 MB GPU for all v2 layers keeps only the room and the window display + composite at 1024 px: the day
 *  near card went to 512 px like the mid card and every night layer; shops5's three arrays for 9 variants were 26.2 MB):
 *  A interiors_v2.ktx2 (PX): day L0 per variant, then the L4 sticker sheet; C interiors_v2c.ktx2 (PX): day L3 +
 *  composite per variant; N interiors_v2n.ktx2 (PXN): day L1, day L2 per variant; M interiors_v2m.ktx2 (PXN): night
 *  L0..L3 per variant (tools/shops/pack_v2.py SLOT_ARR) */
const NV = V2.VARIANTS.length;
V2.STICKER_LAYER = NV;
V2.LAYERS = NV + 1;              // array A
V2.LAYERS_C = NV;                // array C
V2.LAYERS_N = NV * 2;            // array N
V2.LAYERS_M = NV * 4;            // array M
/** where card k (0 L0, 1 L1, 2 L2, 3 L3 + composite) of a variant lives: [array, layer] (light 0 day, 1 night) */
export const V2_SLOT = (variant, light, k) => light
  ? ["M", variant * 4 + k]
  : [["A", variant], ["N", variant * 2], ["N", variant * 2 + 1], ["C", variant]][k];
/** each array's file, layer count, layer size and codec (tools/shops/encode_array.mjs). (shops7) The night array is
 *  ETC1S (BasisLZ, `--etc1s=255`): as UASTC + zstd the 16 variants came to 13.75 MB download (> 12; UASTC's RDO level
 *  and dictionary only took 5 % off); ETC1S is 0.84 MB instead of 3.27 for the 64 night layers, seen dimmed in the dark
 *  street; three's KTX2Loader transcodes it to BC3 / BC1 on desktop (<= 1 byte a texel, as BC7). The day arrays stay
 *  UASTC (the close-up quality). */
export const V2_ARRAYS = {
  A: { file: "interiors_v2.ktx2", layers: V2.LAYERS, px: V2.PX, codec: "uastc" },
  C: { file: "interiors_v2c.ktx2", layers: V2.LAYERS_C, px: V2.PX, codec: "uastc" },
  N: { file: "interiors_v2n.ktx2", layers: V2.LAYERS_N, px: V2.PXN, codec: "uastc" },
  M: { file: "interiors_v2m.ktx2", layers: V2.LAYERS_M, px: V2.PXN, codec: "etc1s" },
};
/** texture fetches per window pixel at one lighting (shopWindow.js nearV2 / farV2 / dressV2 call fetchV2 this many
 *  times) and the budgets the gate row `shopsv2` holds them to: near = 4 layers + 1 sticker; ONE composite far away;
 *  all v2 textures together <= 40 MB GPU and <= 12 MB download (docs/SHOPS_V2_PLAN.md) */
export const V2_FETCH = { near: 4, dress: 1, far: 1 };
export const V2_BUDGET = { fetchNear: 5, fetchFar: 1, gpuMB: 40, fileMB: 12 };
/** (shops6) THE V2 GAINS PER VARIANT (V2.VARIANTS order): the shader multiplies the day / night bake by these (the
 *  closed-shop look stays the night bake x shopWindow.js closedV2 0.1, unchanged). Before, every room took the café's
 *  0.2 / 0.7, so the dark rooms (boutique, salon, generic shop) read at 0.03 by day next to a pharmacy at 0.12.
 *  V2_LUM = the mean LINEAR luminance of each variant's composite (the whole room, array A / N layer "L3 + composite",
 *  upper half), on the window crop (rows 20-95 % from the top, columns 10-90 %: the ceiling left out), measured from the
 *  shipped KTX2 arrays with three's Basis transcoder (2026-11-21). Day: gain = V2_DAY_TARGET / lum (every type reads the
 *  same mean through the glass; the café a little brighter than its old 0.2). Night: half-way in log
 *  (0.7 x sqrt(target / (0.7 lum))), clamped to V2_GAIN_RANGE.night, so the white rooms (pharmacy, office) are toned
 *  down and the dark ones lifted while each keeps some of its character. (shops7) The boutique / salon / shop night
 *  bakes were nearly black (0.007-0.02: 30-45 W spots only); they now have shop lighting (0.23-0.31). Re-measured after
 *  the 16-variant bake by tools/shops/v2_lum.py on the packed slices (the encoder's input: on the unchanged rooms it
 *  gives shops6's transcoded-KTX2 numbers within 0.1 %), which also prints V2_GAIN. Gate row `shopsv2` checks every
 *  variant has both gains in range, day gain x lum within V2_DAY_TOL of the target, the night gain = the formula on the
 *  night lum, no night lum under V2_NIGHT_MIN. ?shopgain=old = the old 0.2 / 0.7 for every room. */
export const V2_LUM = {
  day: { cafe: 0.2726, brasserie: 0.4479, bakery: 0.335, pharmacy: 0.5994, boutique: 0.4233, grocery: 0.4808, office: 0.4737, salon: 0.3232, shop: 0.3792,
    patisserie: 0.5307, officine: 0.2926, concept: 0.576, epicerie: 0.2523, bank: 0.5882, barber: 0.3175, bookshop: 0.2168 },
  night: { cafe: 0.1827, brasserie: 0.3464, bakery: 0.1878, pharmacy: 0.4574, boutique: 0.3052, grocery: 0.3591, office: 0.3707, salon: 0.2336, shop: 0.2527,
    patisserie: 0.3776, officine: 0.1877, concept: 0.4782, epicerie: 0.1545, bank: 0.4805, barber: 0.2179, bookshop: 0.1284 },
};
export const V2_DAY_TARGET = 0.075, V2_NIGHT_TARGET = 0.15, V2_DAY_TOL = 0.05;
/** (shops7) no night bake darker than this mean (the shops5 boutique / salon / shop were 0.008-0.02: an open shop read
 *  dark even at the clamped gain) */
export const V2_NIGHT_MIN = 0.05;
export const V2_GAIN_RANGE = { day: [0.08, 0.8], night: [0.3, 2.0] };
export const V2_GAIN = {
  day: { cafe: 0.275, brasserie: 0.167, bakery: 0.224, pharmacy: 0.125, boutique: 0.177, grocery: 0.156, office: 0.158, salon: 0.232, shop: 0.198,
    patisserie: 0.141, officine: 0.256, concept: 0.13, epicerie: 0.297, bank: 0.128, barber: 0.236, bookshop: 0.346 },
  night: { cafe: 0.758, brasserie: 0.551, bakery: 0.748, pharmacy: 0.479, boutique: 0.587, grocery: 0.541, office: 0.532, salon: 0.67, shop: 0.645,
    patisserie: 0.527, officine: 0.748, concept: 0.469, epicerie: 0.824, bank: 0.467, barber: 0.694, bookshop: 0.904 },
};
export const V2_GAIN_OLD = { day: 0.2, night: 0.7 };
/** the café / restaurant variant (shops3): a restaurant / fast food -> the brasserie (1), else the café (0) */
export const v2Variant = (kind, cat = "") => (kind === "restaurant" || kind === "fastfood" || cat === "restaurant" || cat === "fast_food") ? 1 : 0;
/** the variants (indices into V2.VARIANTS) of an interior type (index into TYPES) */
export const variantsOfType = (type) => V2.VARIANT_TYPE.map((t, i) => (t === TYPES[type] ? i : -1)).filter((i) => i >= 0);
/** a shop's preferred v2 variant (iWinT.w): the café type by kind (café / brasserie); (shops7) the others pick one of
 *  their type's rooms by a hash of the shop (h in [0, 1): shopLayout.js hash01(id + "v")), so the second rooms are spread
 *  over the city, not only where the neighbour rule moves a twin */
export function v2Slot(type, kind, cat = "", h = 0) {
  const vs = variantsOfType(type);
  if (!vs.length) return 0;
  return TYPES[type] === "cafe" ? vs[v2Variant(kind, cat)] : vs[Math.min(vs.length - 1, Math.floor(h * vs.length))];
}
/** THE NEIGHBOUR RULE (shops5): two windows of the same type within NEIGHBOUR_M of each other on the same side (facing
 *  within ~45 deg) never show the same variant when the type has more than one: the later one (in record order) takes
 *  the next free variant of its type. recs: [{ x, z, nx, nz, type, variant }] (variant is rewritten); returns the count
 *  changed. Types with one variant keep it (two such twins are counted by the gate as "waiting for variants"). */
export const NEIGHBOUR_M = 12;
export function neighbourVariants(recs) {
  let changed = 0;
  for (let i = 0; i < recs.length; i++) {
    const a = recs[i], vs = variantsOfType(a.type);
    if (vs.length < 2) continue;
    const taken = new Set();
    for (let j = 0; j < i; j++) {
      const b = recs[j];
      if (b.type === a.type && (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < NEIGHBOUR_M ** 2 && a.nx * b.nx + a.nz * b.nz > 0.7) taken.add(b.variant);
    }
    if (!taken.has(a.variant)) continue;
    const free = vs.find((v) => !taken.has(v));
    if (free != null) { a.variant = free; changed++; }
  }
  return changed;
}

// ---- L4, the glass dressing (shops5): the sticker sheet's cells (px in the 1024 x 512 layer, top-left origin: x, y, w,
// h) at STICKER_PPM texels a metre on the glass. tools/shops/stickers.py draws them (no brand, no real logo).
export const STICKER_PPM = 720;
export const STICKERS = {
  hoursFR: [0, 0, 160, 256], hoursBI: [160, 0, 160, 256],        // opening-hours vinyl (FR; FR / NL)
  open: [320, 0, 256, 128], openBI: [320, 128, 256, 128],        // OUVERT / OUVERT - OPEN - GEOPEND
  sale: [576, 0, 448, 128], saleNL: [576, 128, 448, 128],        // SOLDES / SOLDEN
  pay: [0, 256, 256, 64], pay2: [0, 320, 256, 64],               // plain card-payment marks (a card + chip, a phone, €)
  lace: [256, 256, 256, 256],                                    // a lace café curtain, tiled along the glass
  newFR: [512, 256, 512, 128], welcome: [512, 384, 512, 128],    // NOUVEAU - NIEUW / BIENVENUE - WELKOM
};
/** the promo slot's cells and their weights by type (TYPES order); 0 = none */
export const PROMO = ["open", "openBI", "sale", "saleNL", "newFR", "welcome"];
