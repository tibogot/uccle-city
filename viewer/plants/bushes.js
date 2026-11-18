// BUSHES WITH THE TREES' FOLIAGE (claude/bushes, owner playtest 2026-11-18 step 2; ?bushes=old = the Blender plants'
// 3 LODs as before). The city's shrubs (box balls, laurels, rhododendrons, hydrangeas, roses, lavender) are crowns of
// the street trees' leaf cards WITHOUT a trunk: the same vendor builder (vendor/stylized-trees buildTree, through
// createStylizedTrees with these shapes), the same leaf material (camera-facing cards with the leaf mask, each clump a
// lit dome, baked occlusion, sun shadows on the cards, light through the leaves), the same NESTED LODs + card morph
// (the cards LOD 1 drops shrink away before the switch, the kept ones grow: no pop, no dither between two models), the
// same instancing (parts of the trees' city-wide multi-draw sets: viewer/treesStylized.js makeTreePool, 0 extra draws).
//
// Why the old bushes "faded out weirdly up close" (the owner's green balls): their LOD hand-overs were at 4 m (the
// Blender model -> 30 % of its leaves + a dark inner shell) and 9-11 m (-> an 80-triangle lumpy shell), each a per-pixel
// DITHER cross-fade between two different models by the pixel's own distance. The drive / walk cameras keep the
// nearby bushes inside those bands, so every bush close to the camera was half one model, half another (a static
// screen dither the TAA history averages into a see-through ghost), and past 10 m an 80-triangle ball. Now: no
// dither anywhere inside BUSH_NEAR m; the one LOD switch is a morph (same pixels on both sides), the far end a fade
// beyond 40 m (tools/audit/bushGate.mjs checks it).
//
// Shapes are per VARIANT (6): round (fine leaves: box), round, wide, low, tall, tall-loose; a type picks among its
// variants per instance (seeded by position). Scale = the LiDAR / rule height over the variant's own height. The
// foot sits at the lowest ground under the bush, sunk a little: the lowest ring's cards reach below it (no floating
// ball); the vendor's occlusion darkens the bottom of the crown (height in crown) and under other clumps; bushes cast
// sun shadows to BUSH_SHADOW.end (contact shadow at the base).
import * as THREE from "three/webgpu";

export const BUSH_OLD = typeof location !== "undefined" && /[?&]bushes=old(&|$)/.test(location.search);
/** the shrub types drawn as bushes (kind = index + 1; kind 0 = a tree in the shared pool) */
export const BUSH_KINDS = ["box_ball", "laurel", "rhododendron", "hydrangea", "rose", "lavender"];
export const BUSH_SEED = 7001;
/** no LOD dither / fade may start nearer than this (m, the gate's near range) */
export const BUSH_NEAR = 30;
/** the far end (m) per instance: base x (0.8 + 0.25 x min(2, height)), clamped to [END_MIN, END_MAX]; faded over its last 20 % */
export const BUSH_END = { box_ball: 60, laurel: 80, rhododendron: 80, hydrangea: 65, rose: 60, lavender: 55 };
export const BUSH_END_MIN = 50, BUSH_END_MAX = 95, BUSH_END_BAND = 0.2;
/** sun shadows cast to `end`, dithered out over `band` (m, the view camera) */
export const BUSH_SHADOW = { end: 32, band: 8 };
/** triangle budget per bush and LOD (the gate): LOD 1 at most the old far shell (80) */
export const BUSH_TRIS = [220, 80];

// shapes at scale 1 (m): h height, w width; rings [height share, clumps]; top clump; cardScale (card size / clump);
// cards per clump [LOD 0, LOD 1, LOD 2] (nested: LOD 1 keeps the first n1 of LOD 0's)
export const BUSH_SHAPES = [
  { name: "round-fine", h: 1.0, w: 1.05, rings: [[0.22, 6]], top: true, cardScale: 0.66, cards: [11, 5, 2] },
  { name: "round", h: 1.3, w: 1.5, rings: [[0.28, 6]], top: true, cardScale: 0.78, cards: [9, 5, 2] },
  { name: "wide", h: 0.95, w: 1.9, rings: [[0.32, 7]], top: true, cardScale: 0.78, cards: [9, 4, 2] },
  { name: "low", h: 0.6, w: 1.25, rings: [[0.42, 5]], top: true, cardScale: 0.75, cards: [9, 5, 2] },
  { name: "tall", h: 2.4, w: 1.5, rings: [[0.17, 5], [0.52, 5]], top: true, cardScale: 0.78, cards: [8, 3, 2] },
  { name: "tall-loose", h: 2.0, w: 1.9, rings: [[0.19, 6], [0.58, 4]], top: true, cardScale: 0.84, cards: [8, 3, 2] },
];
/** per type: its variants and its leaf colour against the trees' palette (rgb multiplier, desaturation) */
export const BUSH_TYPES = {
  box_ball: { shapes: [0, 0, 1], tint: [0.58, 0.68, 0.5, 0.0] },
  laurel: { shapes: [4, 5, 1], tint: [0.54, 0.7, 0.58, 0.0] },
  rhododendron: { shapes: [1, 5, 2], tint: [0.58, 0.68, 0.54, 0.05] },
  hydrangea: { shapes: [1, 2], tint: [0.8, 0.9, 0.74, 0.0] },
  rose: { shapes: [2, 3], tint: [0.7, 0.78, 0.64, 0.05] },
  lavender: { shapes: [3], tint: [0.92, 0.88, 0.92, 0.55] },
};

/** the instance's far end (m) from its type and height (m) */
export function bushEnd(type, height) {
  return Math.min(BUSH_END_MAX, Math.max(BUSH_END_MIN, (BUSH_END[type] ?? 60) * (0.8 + 0.25 * Math.min(2, height))));
}
/** the foot's sink below the lowest ground under the bush (m) */
export const bushSink = (height) => Math.max(0.05, 0.06 * height);
/** the footprint radius (m) the lowest ground is searched over */
export const bushFoot = (height, v) => Math.min(0.7, 0.32 * BUSH_SHAPES[v].w * height / BUSH_SHAPES[v].h);
/** the variant of a bush of `type` at (x, z) (stable) */
export function bushVariant(type, x, z) {
  const s = BUSH_TYPES[type].shapes;
  let h = Math.imul(Math.floor(x * 100) | 0, 73856093) ^ Math.imul(Math.floor(z * 100) | 0, 19349663) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return s[((h ^ (h >>> 16)) >>> 0) % s.length];
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
let EMPTY = null;
/** no bark: an empty mesh with the bark's attributes (the bark view leaves the bush parts out) */
function emptyTrunk() {
  if (EMPTY) return EMPTY;
  EMPTY = new THREE.BufferGeometry();
  EMPTY.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
  EMPTY.setAttribute("normal", new THREE.Float32BufferAttribute([], 3));
  EMPTY.setAttribute("bark", new THREE.Float32BufferAttribute([], 4));
  EMPTY.setIndex([]);
  return EMPTY;
}

/** the vendor's shape contract (stylizedTrees.js buildTree): { crown, rad, clumps (the last = the core), cards,
 *  cardScale, trunk(lod), aoOverhead, aoFloor, crownNormal }. The variant from the seed (createStylizedTrees passes
 *  seed + v x 97). Draws the same randoms whatever the LOD (the nested card sets). */
export function bushShape(r, lod, seed) {
  const S = BUSH_SHAPES[Math.max(0, Math.min(BUSH_SHAPES.length - 1, Math.round((seed - BUSH_SEED) / 97)))];
  const h = S.h, R = S.w / 2;
  const cr = Math.min(h * 0.42, R * 0.52);
  const clumps = [];
  for (const [fy, n] of S.rings) {
    // the lowest ring sits about a clump's radius up: its cards reach into the ground
    const y = Math.max(cr * 0.85, fy * h);
    // a mound's profile: full at the base, rounding off toward the top
    const t = (y - h * 0.42) / (h * 0.58), prof = Math.sqrt(Math.max(0.4, 1 - t * t));
    const a0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU + (r() - 0.5) * 0.5;
      const rr = Math.max(0.05, R - cr * 0.7) * prof * (0.85 + r() * 0.2);
      clumps.push({ c: V(Math.cos(a) * rr, y + (r() - 0.5) * 0.1 * h, Math.sin(a) * rr), r: cr * (0.85 + r() * 0.3) });
    }
  }
  if (S.top) clumps.push({ c: V((r() - 0.5) * 0.1 * S.w, h - cr * 0.95, (r() - 0.5) * 0.1 * S.w), r: cr * (0.95 + r() * 0.2) });
  clumps.push({ c: V(0, h * 0.42, 0), r: Math.min(h * 0.45, R * 0.6) });           // the core (fills the middle)
  return {
    crown: V(0, h * 0.48, 0), rad: V(R, h * 0.5, R), clumps,
    cards: S.cards, cardScale: S.cardScale, trunk: emptyTrunk,
    aoOverhead: 0.85, aoFloor: 0.28, crownNormal: 0.45,
  };
}

/** a built bush's extent from its leaf cards (centre +- 0.7 x the half size: the mask's round cluster): { top, foot,
 *  cards, tris } */
export function bushExtent(leaves) {
  const P = leaves.attributes.position, S = leaves.attributes.cardSpin;
  let top = -Infinity, foot = Infinity;
  for (let i = 0; i < P.count; i++) {
    const s = Math.hypot(S.getX(i), S.getY(i)) * 0.7;
    top = Math.max(top, P.getY(i) + s); foot = Math.min(foot, P.getY(i) - s);
  }
  const tris = leaves.index.count / 3;
  return { top, foot, tris, cards: tris / 2 };
}
