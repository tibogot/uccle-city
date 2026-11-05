// Smooth LOD: the pieces every level-of-detail switch in the viewer shares (docs/SMOOTH_LOD.md).
//
//  - lodEye: the VIEW camera's position as a uniform. Distance-driven fades and morphs read it in every pass,
//    so the shadow pass (whose cameraPosition is the light's) picks exactly the LOD the eye sees: a tree's
//    shadow never disagrees with the tree.
//  - ditherNoise(): a per-pixel threshold in [0, 1) (interleaved gradient noise, Jimenez 2014) on the screen
//    (in the shadow pass: on the shadow map's texels). Two copies of an object cross-fade by splitting the
//    pixels: the outgoing keeps n >= t, the incoming n < t, with the SAME noise, so every pixel is drawn by
//    exactly one of them (no holes, no double layer; Unity's LOD Group "cross-fade", Unreal's dithered LOD
//    transition). Static (no TAA here): during a fade a fine pattern, never a flicker.
//  - keepBand(lo, hi): keep the pixel when lo <= n < hi; a distance-driven cross-fade gives the outgoing copy
//    [0, 1 - t) and the incoming one [1 - t, 1), from the same t.
//  - objectFade(): a per-OBJECT fade (object.userData.fade) for time-based fades of whole objects (streamed
//    tiles): fade f in [0, 1] keeps n < f (fading in), f in [2, 3] keeps n >= f - 2 (the complementary
//    half, fading out). Read through a uniform updated per object (one material for every tile).
//  - Fader: steps those time-based fades each frame.
import * as THREE from "three/webgpu";
import { uniform, float, fract, dot, vec2, screenCoordinate, select, saturate } from "three/tsl";

const qs = new URLSearchParams(location.search);
/** ?smooth=0: every fade of this file off (hard switches, the old behaviour) for A/B. */
export const SMOOTH = qs.get("smooth") !== "0";

/** The view camera's position (world), set by main.js every frame before rendering. */
export const lodEye = uniform(new THREE.Vector3());

/** Interleaved gradient noise on the pixel grid: [0, 1), well spread, cheap (one dot + fract). */
export function ditherNoise() {
  const p = screenCoordinate.xy.floor();
  return fract(float(52.9829189).mul(fract(dot(p, vec2(0.06711056, 0.00583715)))));
}

/** Keep the pixel when lo <= n < hi (n = ditherNoise()); both in [0, 1], hi = 1 keeps the top. */
export function keepBand(lo, hi, n = ditherNoise()) {
  return n.greaterThanEqual(lo).and(n.lessThan(hi));
}

/** 0 -> 1 across [a - w, a] (the fade toward a switch distance a, over a band w); w <= 0: a step. */
export function rampTo(d, a, w) {
  return saturate(d.sub(a.sub(w)).div(w.max(1e-3)));
}

/** Per-object time fade (object.userData.fade, default 1 = fully drawn): see the header. */
export const objectFadeValue = uniform(1).onObjectUpdate(({ object }) => object.userData.fade ?? 1);
export function objectFadeKeep(n = ditherNoise()) {
  const f = objectFadeValue;
  const out = f.greaterThan(1.5);
  return select(out, n.greaterThanEqual(f.sub(2)), n.lessThan(f));
}

/** Add the per-object time fade to a material (once): its maskNode (and the shadow cut) keep the
 *  object's share of pixels. Materials that already have a maskNode get it AND-ed. */
export function withObjectFade(m) {
  if (!SMOOTH || m.userData.objectFade) return m;
  const keep = objectFadeKeep();
  m.maskNode = m.maskNode ? m.maskNode.and(keep) : keep;
  if (m.maskShadowNode) m.maskShadowNode = m.maskShadowNode.and(keep);
  m.userData.objectFade = true;
  m.needsUpdate = true;
  return m;
}

/** The fading copy of a material: a clone with the per-object time fade (cached; shared when the original is).
 *  A discard costs early-z, and on every façade, road and terrain material it cost ~3 ms of GPU time in the
 *  Saint-Job view (measured 2026-11-05), so a tile's meshes draw with these copies only WHILE they fade. */
const variants = new WeakMap();
export function fadeVariant(m) {
  let v = variants.get(m);
  if (!v) {
    v = withObjectFade(m.clone());
    v.name = `${m.name || m.type}:fade`;
    v.userData.shared = !!m.userData.shared;
    v.userData.fadeOf = m;
    variants.set(m, v);
  }
  return v;
}
/** Does this material need a fading copy? (node materials; not one that is fade-safe already: its own
 *  maskNode fades, or it draws only where its depth pre-pass, which fades, wrote: the leaves' EQUAL pass) */
const swappable = (m) => m?.isNodeMaterial && !m.userData.objectFade && !m.userData.noFade;

/** Time-based fades of whole objects (tile groups): fade(obj, dir, done) with dir +1 = in, -1 = out. The
 *  meshes draw with their fading copies (fadeVariant) and userData.fade, from the start to the end of the
 *  fade, then get their own materials back (before done(): a fading-out tile is disposed with its own).
 *  hold = true pauses every fade (the boot warm-up: it compiles the fading copies too). */
export class Fader {
  constructor() { this.list = []; this.seconds = +(qs.get("tilefade") ?? 0.9); this.hold = false; }
  fade(obj, dir, done = null, seconds = this.seconds) {
    if (!SMOOTH || seconds <= 0) { restore(obj); set(obj, 1); done?.(); return; }
    this.list = this.list.filter((f) => f.obj !== obj);
    swapIn(obj);
    set(obj, dir > 0 ? 0 : 2);
    this.list.push({ obj, dir, t: 0, seconds, done });
  }
  update(dt) {
    if (this.hold) return;
    for (const f of [...this.list]) {
      f.t = Math.min(1, f.t + dt / f.seconds);
      const e = f.t * f.t * (3 - 2 * f.t);
      set(f.obj, f.dir > 0 ? e : 2 + e);
      if (f.t >= 1) { this.list.splice(this.list.indexOf(f), 1); restore(f.obj); set(f.obj, 1); f.done?.(); }
    }
  }
  get busy() { return this.list.length > 0; }
}
/** Stand-ins drawn with the fading copies of obj's materials that have none yet (made now, cached for fade()):
 *  compile them (warmup.js precompile) before fade(obj), and the fade builds no shader in a frame. The group
 *  shares the geometries; drop it after the compile (no dispose). Null when there is nothing new. */
export function fadeProxies(obj) {
  if (!SMOOTH) return null;
  const g = new THREE.Group();
  obj.traverse((o) => {
    const m = o.userData.fadeOrig || o.material;
    if (!o.isMesh || Array.isArray(m) || !swappable(m) || variants.has(m)) return;
    const v = fadeVariant(m);
    const p = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, v, 1) : new THREE.Mesh(o.geometry, v);
    if (o.isInstancedMesh && o.instanceColor) p.instanceColor = o.instanceColor;
    p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow;
    p.matrixWorld.copy(o.matrixWorld);
    g.add(p);
  });
  return g.children.length ? g : null;
}
/** Free the fading copy of a tile's own material (its tile is disposed). The copy is kept between a tile's
 *  fade-in and its fade-out: a new copy is a new shader build on the main thread. */
export function dropFadeVariant(m) {
  const v = variants.get(m);
  if (!v || v.userData.shared) return;
  variants.delete(m); v.dispose();
}
function set(obj, v) { obj.traverse((o) => { o.userData.fade = v; }); }
function swapIn(obj) {
  obj.traverse((o) => {
    if (o.userData.fadeOrig || Array.isArray(o.material) || !swappable(o.material)) return;
    o.userData.fadeOrig = o.material;
    o.material = fadeVariant(o.material);
  });
}
function restore(obj) {
  obj.traverse((o) => {
    const m = o.userData.fadeOrig;
    if (!m) return;
    o.material = m;
    delete o.userData.fadeOrig;     // (a tile's own copy stays cached for its fade-out: dropFadeVariant on dispose)
  });
}

/** A smoothed scalar (exponential approach, time constant tau seconds): for limits that must not jump. */
export function damp(cur, target, tau, dt) {
  return tau <= 0 ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau));
}
