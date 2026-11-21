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

// ---- Shops v2 (docs/SHOPS_V2_PLAN.md jobs 3-4, rule shop-room-layers): the layered café / restaurant interiors
// (tools/blender/shopInteriors.py --v2 -> tools/shops/pack_v2.py -> textures/shops/interiors_v2.ktx2, a KTX2 2D ARRAY).
/** the v2 render: the room is RD deep (= DEPTH.cafe: the viewer's room is the render's, depth scale 1), the card planes
 *  (m behind the glass, L1 L2 L3) and the slabs of free-standing furniture each card holds; PX = one layer's size */
export const V2 = {
  RD: 6.0, PLANES: [2.6, 1.2, 0.3], SLABS: [[1.8, 3.5], [0.6, 1.8], [0.0, 0.6]], PX: [1024, 512],
  VARIANTS: ["cafe", "brasserie"], LIGHTS: ["day", "night"], LAYERS: 16,
  TYPES: ["cafe"],          // the interior types drawn by v2 (the café / restaurant / bar room); the rest stay v1
  FAR: 40, BAND: 5,         // all layers within FAR - BAND, the single composite fetch beyond FAR + BAND, both between
};
/** the array layer: variant (0 café, 1 brasserie) x light (0 day, 1 night) x k (0 L0, 1 L1, 2 L2, 3 L3 + composite) */
export const v2Layer = (variant, light, k) => variant * 8 + light * 4 + k;
/** texture fetches per window pixel at one lighting (shopWindow.js nearV2 / farV2 call fetchV2 this many times) and
 *  the budgets the gate row `shopsv2` holds them to (plan: ~5 fetches; one composite fetch far away; <= 12 MB GPU) */
export const V2_FETCH = { near: 4, far: 1 };
export const V2_BUDGET = { fetchNear: 5, fetchFar: 1, gpuMB: 12, fileMB: 4 };
/** the café / restaurant variant of a shop (iWinT.w): a restaurant / fast food -> the brasserie, else the café */
export const v2Variant = (kind, cat = "") => (kind === "restaurant" || kind === "fastfood" || cat === "restaurant" || cat === "fast_food") ? 1 : 0;
