// The retaining walls' faces (viewer/streets/retainWalls.js, drawn by viewer/roadPaint.js concreteMaterial): brick in
// stretcher bond and coursed stone, as ONE piece of math written against an ops table, so the shader (TSL ops) and the
// gate's check (tools/audit/wallLook.mjs, plain-number ops) run the same code.
//
// WHY (claude/sidewalk round 5): the round-3 brick faded to the bare base colour as soon as a course shrank under ~3 px
// (tone -> 1, mortar -> 0): from 6-12 m every wall was one flat orange slab, and walls are ~1 km a tile. Now:
//   - the courses stay until they are under ~2 px (an anti-aliased joint is still a line at 3 px);
//   - past that the face keeps its AVERAGE: the mortar's share of the area (21 % for an 11 mm joint round a 22 x 6.5 cm
//     brick) mixed in, never dropped, so a far wall is the right desaturated brick, not the raw brick colour;
//   - a low-frequency tone (patches of 4 bricks x 3 courses, as real brick batches and weathering) that survives a
//     few times further before it too averages out;
//   - the mortar rougher than the brick (roughness, for the light's relief).
// Coursed stone: the same, with ~0.5 x 0.24 m stones and their ~15 mm joints.
//
// u, v: metres along the face and up it; wu, wv: their change over one pixel (fwidth in the shader, the pixel's
// footprint in the check). Returns { tone (colour multiplier), mortar (0..1 mortar share of the pixel), rough, far,
// and the raw pieces (tv, joint share) the check uses to rebuild the round-3 look }.

export const BRICK_DIM = { CH: 0.0655, BW: 0.22, J: 0.011 };
export const STONE_DIM = { CH: 0.24, BW: 0.5, JU: 0.015, JV: 0.03 };
const BRICK_MEAN = 1 - (1 - BRICK_DIM.J / BRICK_DIM.BW) * (1 - BRICK_DIM.J / BRICK_DIM.CH);   // 0.21
const STONE_MEAN = 1 - (1 - 2 * STONE_DIM.JU) * (1 - 2 * STONE_DIM.JV);                        // 0.088
const FAR0 = 0.25, FAR1 = 0.6;   // the fade, in pattern units a pixel: courses of 4 px -> 1.7 px

const hash2 = (O, a, b) => O.fract(O.mul(O.sin(O.add(O.mul(a, 12.9898), O.mul(b, 78.233))), 43758.5453));
// an anti-aliased "inside" of a unit cell with half joints j at both ends, w = the cell coordinate's pixel change
const inside = (O, f, j, w) => O.mul(O.smoothstep(O.sub(j, w), O.add(j, w), f), O.smoothstep(O.sub(j, w), O.add(j, w), O.sub(1, f)));

function face(O, u, v, wu0, wv0, D, ju, jv, mean, tvLo, tvHi, patchAmp) {
  const cv = O.div(v, D.CH), course = O.floor(cv);
  const bu = O.add(O.div(u, D.BW), O.fract(O.mul(course, 0.5))), bi = O.floor(bu);
  const wu = O.max(O.div(wu0, D.BW), 1e-4), wv = O.max(O.div(wv0, D.CH), 1e-4);
  const unit = O.mul(inside(O, O.fract(bu), ju, wu), inside(O, O.fract(cv), jv, wv));
  const far = O.smoothstep(FAR0, FAR1, O.max(wu, wv));
  const tv = O.mul(O.mix(tvLo, tvHi, hash2(O, bi, course)), O.mix(0.95, 1.05, hash2(O, O.add(bi, 17.1), O.sub(course, 3.3))));
  // (patches of 4 units x 3 courses: their own fade, three times further)
  const patch = O.mix(O.mix(1 - patchAmp, 1 + patchAmp, hash2(O, O.add(O.floor(O.div(bu, 4)), 5.3), O.sub(O.floor(O.div(cv, 3)), 1.7))), 1, O.smoothstep(FAR0, FAR1, O.mul(O.max(wu, wv), 0.3)));
  const tvMean = (tvLo + tvHi) / 2;
  const tone = O.mul(O.mix(tv, tvMean, far), patch);
  const mortar = O.mix(O.sub(1, unit), mean, far);
  return { tone, mortar, rough: O.mix(0.86, 0.97, mortar), far, tv, joint: O.sub(1, unit) };
}
export const brickFace = (O, u, v, wu, wv) => face(O, u, v, wu, wv, BRICK_DIM, BRICK_DIM.J / BRICK_DIM.BW / 2, BRICK_DIM.J / BRICK_DIM.CH / 2, BRICK_MEAN, 0.8, 1.16, 0.07);
export const stoneFace = (O, u, v, wu, wv) => face(O, u, v, wu, wv, STONE_DIM, STONE_DIM.JU, STONE_DIM.JV, STONE_MEAN, 0.82, 1.15, 0.06);

/** plain-number ops (the check) */
export const NUM = {
  add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b,
  floor: Math.floor, fract: (x) => x - Math.floor(x), sin: Math.sin, max: Math.max,
  mix: (a, b, t) => a + (b - a) * t,
  smoothstep: (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1e-9))); return t * t * (3 - 2 * t); },
};
/** TSL ops: pass three/tsl's { float, floor, fract, sin, max, mix, smoothstep } */
export function tslOps(T) {
  const f = (x) => (typeof x === "number" ? T.float(x) : x);
  return {
    add: (a, b) => f(a).add(f(b)), sub: (a, b) => f(a).sub(f(b)), mul: (a, b) => f(a).mul(f(b)), div: (a, b) => f(a).div(f(b)),
    floor: (x) => T.floor(f(x)), fract: (x) => T.fract(f(x)), sin: (x) => T.sin(f(x)), max: (a, b) => T.max(f(a), f(b)),
    mix: (a, b, t) => T.mix(f(a), f(b), f(t)), smoothstep: (e0, e1, x) => T.smoothstep(f(e0), f(e1), f(x)),
  };
}
