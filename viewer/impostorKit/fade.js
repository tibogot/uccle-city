// impostorKit / fade.js: transitions that do not crawl when the camera moves.
//
// The city's cross-fades (viewer/lodFade.js) split the pixels of two copies with interleaved gradient noise fixed to
// the SCREEN. That is right while the camera is still; when it moves, the object slides under the fixed threshold
// pattern and a different subset of its texels shows every frame: the "fizz" (docs/IMPOSTORS_RESEARCH.md, cause 1 / 6).
// Here the threshold is anchored to the OBJECT (Wyman & McGuire, "Hashed Alpha Testing", I3D 2017: the hash comes
// from object-space coordinates quantised at the pixel scale):
//  - each instance gets a plane through its anchor (foot + `anchorH` x scale up), facing the view camera (lodEye);
//  - a pixel's ray from the eye meets that plane at Q; Q's coordinates on the plane, quantised in cells of `cell`
//    metres (a pixel's footprint at the hand-over distance, fixed: the pattern does not rescale inside the band),
//    feed the noise (IGN on the cell index, offset per instance);
//  - the mesh LOD and the impostor of the same instance compute the SAME Q for the same pixel (Q depends only on
//    the pixel's ray and the instance), so their split stays complementary: every pixel drawn by exactly one.
// The pattern moves with the object: a texel of the tree keeps its side of the split while the camera moves.
// Far end: no pixel dropping at all; the impostor's shading fades into the ground under it (material.js `far`).
import { uniform, float, vec2, vec3, fract, dot, floor, normalize, cross, positionWorld, select, vertexStage } from "three/tsl";
import { lodEye, ditherNoise, rampTo } from "../lodFade.js";

/** Per object type: the live fade distances (metres from the view camera, lodEye). */
export function makeFade({ start = 400, band = 30, end = 1500, endBand = 300, cell = 0.25, anchorH = 6, noise = 1 } = {}) {
  return {
    start: uniform(start), band: uniform(band), end: uniform(end), endBand: uniform(endBand),
    /** metres per pixel at the hand-over: set it from the camera (setCellFromCamera) */
    cell: uniform(cell),
    /** metres (x instance scale) above the instance's foot: the anchor plane's centre */
    anchorH: uniform(anchorH),
    /** 1 = object-anchored noise, 0 = the city's screen IGN (A/B) */
    noise: uniform(noise),
  };
}

/** cell = a pixel's footprint (m) at the hand-over distance, for this camera and drawing-buffer height. */
export function setCellFromCamera(F, camera, heightPx) {
  const p11 = camera.projectionMatrix.elements[5];
  F.cell.value = (2 * F.start.value) / (p11 * heightPx);
}

const ign = (p) => fract(float(52.9829189).mul(fract(dot(p, vec2(0.06711056, 0.00583715)))));

/** The anchor of an instance (world): foot + anchorH x scale up. Computed in the VERTEX stage (a per-instance value:
 *  interpolated per pixel it would carry last-bit noise into the quantisation). */
export const anchorOf = (F, foot, scale) => vertexStage(foot.add(vec3(0, F.anchorH.mul(scale), 0)));

/** The object-anchored threshold in [0, 1) for this pixel, for the instance whose anchor is A (anchorOf). */
export function objectNoise(F, A, seed = float(0)) {
  const n = normalize(lodEye.sub(A));
  const r = normalize(cross(vec3(0, 1, 0), n)), u = cross(n, r);
  const ray = positionWorld.sub(lodEye);
  const t = dot(A.sub(lodEye), n).div(dot(ray, n).min(-1e-6));
  const q = lodEye.add(ray.mul(t)).sub(A);
  const ij = floor(vec2(dot(q, r), dot(q, u)).div(F.cell));
  return ign(ij.add(floor(seed.mul(997)).mul(vec2(7, 13))));
}

/** The noise the type's fades use: object-anchored or the screen IGN (F.noise, live). */
export function fadeNoise(F, A, seed) {
  return select(F.noise.greaterThan(0.5), objectNoise(F, A, seed), ditherNoise());
}

/** t of the hand-over: 0 -> 1 across [start - band, start] (the mesh LOD hands its pixels to the impostor). */
export const handoverT = (F, d) => rampTo(d, F.start, F.band);
/** Mesh side of the hand-over: keep n < 1 - t. */
export const meshKeep = (F, d, n) => n.lessThan(float(1).sub(handoverT(F, d)));
/** Impostor side: keep n >= 1 - t. */
export const impostorKeep = (F, d, n) => n.greaterThanEqual(float(1).sub(handoverT(F, d)));
/** The far fade's amount: 0 -> 1 across [end - endBand, end]. */
export const farT = (F, d) => rampTo(d, F.end, F.endBand);
/** A stable per-instance seed in [0, 1) from its foot (world). */
export const footSeed = (foot) => vertexStage(fract(foot.x.mul(0.1271).add(foot.z.mul(0.3117)).sin().mul(43758.5453)));
