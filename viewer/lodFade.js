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
//  - keepBand(lo, hi): keep the pixel when lo <= n < hi (lo = how much has faded in-from-the-other-side...).
//  - objectFade(): a per-OBJECT fade (object.userData.fade) for time-based fades of whole objects (streamed
//    tiles): fade f in [0, 1] keeps n < f (fading in), f in [2, 3] keeps n >= f - 2 (the complementary
//    half, fading out). Read through a uniform updated per object (one material for every tile).
//  - Fader: steps those time-based fades each frame.
import * as THREE from "three/webgpu";
import { uniform, float, fract, dot, vec2, vec3, screenCoordinate, select, smoothstep, saturate } from "three/tsl";

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

/** Time-based fades of whole objects (tile groups): fade(obj, dir, seconds) with dir +1 = in, -1 = out.
 *  Sets userData.fade on the object and all its descendants; done() runs when it ends. */
export class Fader {
  constructor() { this.list = []; this.seconds = +(qs.get("tilefade") ?? 0.9); }
  fade(obj, dir, done = null, seconds = this.seconds) {
    if (!SMOOTH || seconds <= 0) { set(obj, dir > 0 ? 1 : 2); done?.(); return; }
    this.list = this.list.filter((f) => f.obj !== obj);
    set(obj, dir > 0 ? 0 : 2);
    this.list.push({ obj, dir, t: 0, seconds, done });
  }
  update(dt) {
    for (const f of [...this.list]) {
      f.t = Math.min(1, f.t + dt / f.seconds);
      const e = f.t * f.t * (3 - 2 * f.t);
      set(f.obj, f.dir > 0 ? e : 2 + e);
      if (f.t >= 1) { this.list.splice(this.list.indexOf(f), 1); if (f.dir > 0) set(f.obj, 1); f.done?.(); }
    }
  }
  get busy() { return this.list.length > 0; }
}
function set(obj, v) { obj.traverse((o) => { o.userData.fade = v; }); }

/** A smoothed scalar (exponential approach, time constant tau seconds): for limits that must not jump. */
export function damp(cur, target, tau, dt) {
  return tau <= 0 ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau));
}

export { smoothstep, vec3 };
