// Smooth LOD: the pieces every level-of-detail switch in the viewer shares (docs/SMOOTH_LOD.md).
//
//  - lodEye: the VIEW camera's position as a uniform. Distance-driven fades and morphs read it in every pass,
//    so the shadow pass (whose cameraPosition is the light's) picks exactly the LOD the eye sees: a tree's
//    shadow never disagrees with the tree.
//  - ditherNoise(): a per-pixel threshold in [0, 1) (interleaved gradient noise, Jimenez 2014) on the screen
//    (in the shadow pass: on the shadow map's texels). Two copies of an object cross-fade by splitting the
//    pixels: the outgoing keeps n >= t, the incoming n < t, with the SAME noise, so every pixel is drawn by
//    exactly one of them (no holes, no double layer; Unity's LOD Group "cross-fade", Unreal's dithered LOD
//    transition). Static without the temporal upscaler: during a fade a fine pattern, never a flicker; with it (the
//    default since 2026-11-15) the phase moves each frame (ditherFrame) and the TAA history blends it smooth.
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

/** The noise's phase per frame (pixels): (0, 0) = a static pattern; the temporal upscaler (viewer/upscale.js) moves
 *  it every frame (Jimenez's 5.588238 px step), so its history resolves a dithered fade into a smooth blend. */
export const ditherFrame = uniform(new THREE.Vector2());

/** Interleaved gradient noise on the pixel grid: [0, 1), well spread, cheap (one dot + fract). */
export function ditherNoise() {
  const p = screenCoordinate.xy.floor().add(ditherFrame);
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

/** ?lodsettle=0: the distance-band cross-fades of the landmarks / bridges as before (perf audit 2026-11-14, docs/perf/AUDIT.md
 *  step 11). A landmark's LOD switch dithered over a band of +-12..15 % of its distance (Saint-Job church: 145-195 m);
 *  standing anywhere in it left the church half LOD0 / half LOD1 through a static screen dither (a checker at 50 %) and
 *  drawn twice with the discarding fade copies. settleRamp() turns the band's t into a TIMED fade: the goal is the side
 *  of the band's middle (with hysteresis), the value moves to it over `seconds` (eased): standing still = one LOD,
 *  whole, no dither; crossing the switch = a 0.6 s dissolve (Unity's animated LOD cross-fade, Godot's fade). */
export const LOD_SETTLE = SMOOTH && qs.get("lodsettle") !== "0";
export function settleRamp(seconds = 0.6) {
  if (!LOD_SETTLE) return (t) => t;
  let v = null, goal = 0, last = 0;
  return (t) => {
    const now = performance.now();
    if (v === null) { v = goal = t >= 0.5 ? 1 : 0; last = now; return v; }
    if (t > 0.55) goal = 1; else if (t < 0.45) goal = 0;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    v = goal > v ? Math.min(goal, v + dt / seconds) : Math.max(goal, v - dt / seconds);
    return v * v * (3 - 2 * v);
  };
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
// perf9 (?fadeshare=old = a new fade graph per material, as before): ONE fade graph (the same node objects) for every
// fading copy, and one AND-ed mask per source mask node. three r187 keys its node-build cache by node ids: two materials
// whose graphs are the same node objects (plain library / kit materials that differ only by colour, maps, roughness ...)
// share one main-thread build, but their fading copies each had a fresh fade graph, so each built again (same WGSL).
const FADE_SHARE = qs.get("fadeshare") !== "old";
let sharedKeep = null;
const andKeep = new WeakMap();
const withKeep = (mask, keep) => {
  if (!FADE_SHARE) return mask.and(keep);
  let a = andKeep.get(mask);
  if (!a) andKeep.set(mask, (a = mask.and(keep)));
  return a;
};
export function withObjectFade(m) {
  if (!SMOOTH || m.userData.objectFade) return m;
  const keep = FADE_SHARE ? (sharedKeep ||= objectFadeKeep()) : objectFadeKeep();
  m.maskNode = m.maskNode ? withKeep(m.maskNode, keep) : keep;
  if (m.maskShadowNode) m.maskShadowNode = withKeep(m.maskShadowNode, keep);
  m.userData.objectFade = true;
  m.needsUpdate = true;
  return m;
}

/** The fading copy of a material: a clone with the per-object time fade (cached; shared when the original is).
 *  A discard costs early-z, and on every façade, road and terrain material it cost ~3 ms of GPU time in the
 *  Saint-Job view (measured 2026-11-05), so a tile's meshes draw with these copies only WHILE they fade. */
const variants = new WeakMap();
/** ?fadeclone=old: clone with three's own userData copy (perf audit 2026-11-14, docs/perf/AUDIT.md step 11). r187's
 *  NodeMaterial.copy deep-copies userData through JSON.stringify: a userData holding NODES or typed arrays (the road
 *  marking atlas, the weather's dry nodes, a fade copy's fadeOf) serialised whole node graphs and DataTextures
 *  (Array.from of every texel): 100-580 ms per clone, the 300-850 ms long tasks while tiles stream, GBs of garbage.
 *  Default: clone with an empty userData, then a SHALLOW copy of the source's (nested objects shared, read-only). */
const FADE_CLONE_OLD = qs.get("fadeclone") === "old";
export function cloneMaterial(m) {
  if (FADE_CLONE_OLD) return m.clone();
  const ud = m.userData;
  m.userData = {};
  let c;
  try { c = m.clone(); } finally { m.userData = ud; }
  c.userData = { ...ud };
  return c;
}
export function fadeVariant(m) {
  let v = variants.get(m);
  if (!v) {
    v = withObjectFade(cloneMaterial(m));
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
      // (a fade-in whose own materials are still being compiled (obj.userData.compiling, main.js preCompile) keeps
      // drawing its fading copies, whole, until they are: swapping them in earlier built them in that frame)
      if (f.t >= 1 && f.dir > 0 && f.obj.userData.compiling) continue;
      if (f.t >= 1) { this.list.splice(this.list.indexOf(f), 1); restore(f.obj); set(f.obj, 1); f.done?.(); }
    }
  }
  get busy() { return this.list.length > 0; }
}
/** Stand-ins drawn with the fading copies of obj's materials that have none yet (made now, cached for fade()):
 *  compile them (warmup.js precompile) before fade(obj), and the fade builds no shader in a frame. The group
 *  shares the geometries; drop it after the compile (no dispose). Null when there is nothing new. */
// falcon2 (docs/perf/FALCON_STUTTER.md round 2; ?retirewarm=old: as before): a mesh that swaps its material by distance
// (the façade kit's walls: userData.cutMat near, plainMat far, viewer/facadeKit/kitField.js) gets the fading copies of
// BOTH, so the far one's copy is built (scene pass + shadow pass, preCompile) when its first tile lands, not when a far
// tile first retires (its "walls (kit, far):fade" shadow shader was then built on screen, 31-56 ms, round 1's #1)
export const RETIRE_WARM = qs.get("retirewarm") !== "old";
export function fadeProxies(obj) {
  if (!SMOOTH) return null;
  const g = new THREE.Group();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const own = o.userData.fadeOrig || o.material;
    const mats = RETIRE_WARM ? [own, o.userData.cutMat, o.userData.plainMat] : [own];
    for (const m of new Set(mats)) {
      if (!m || Array.isArray(m) || !swappable(m) || variants.has(m)) continue;
      const v = fadeVariant(m);
      const p = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, v, 1) : new THREE.Mesh(o.geometry, v);
      if (o.isInstancedMesh && o.instanceColor) p.instanceColor = o.instanceColor;
      p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow;
      p.matrixWorld.copy(o.matrixWorld);
      g.add(p);
    }
  });
  return g.children.length ? g : null;
}
/** Stand-ins for the sun's SHADOW pass of obj's fading copies (claude/perf7, rule fade-shadow-warm; ?fadeshadowwarm=old:
 *  none, as before). fadeProxies() above makes a stand-in only for a fading copy that does not exist yet, and the play
 *  loader's tiles (main.js holdFast) compile their fading copies for the scene pass only, so a SHARED material's fading
 *  copy made under a cover (the walls, roofs, details, kit walls ...) never had its shadow pass built: the first tile
 *  fade while driving built it in that frame ("walls:fade" SH, 29-38 ms, police drives 2026-11-26). This one tracks the
 *  shadow pass itself: one stand-in per (fading copy, geometry layout) never shadow-warmed, whether the copy is new or
 *  not. warmup.js warmShadows draws them far under the city; null when there is nothing new. */
export const FADE_SHADOW_WARM = qs.get("fadeshadowwarm") !== "old";
const shadowDone = new WeakMap();      // fading copy -> Set of geometry layouts whose shadow pass was warmed
// (as three r187's RenderObject.getGeometryCacheKey: the attribute names, item sizes and normalized flags; the index is not
// in the node key, and cellCull.js gives the big meshes one when they land)
export const fadeLayoutKey = (o) => `${o.isInstancedMesh ? 1 : 0}${o.instanceColor ? 1 : 0}|${Object.keys(o.geometry.attributes).sort().map((k) => { const a = o.geometry.attributes[k]; return `${k}${a.itemSize}${a.normalized ? "n" : ""}`; }).join(",")}`;
export function fadeShadowProxies(obj) {
  if (!SMOOTH || !FADE_SHADOW_WARM) return null;
  const g = new THREE.Group(); g.name = "fade-shadow-warm";
  obj.traverse((o) => {
    if (!o.isMesh || !o.castShadow) return;
    const own = o.userData.fadeOrig || o.material;
    const mats = RETIRE_WARM ? [own, o.userData.cutMat, o.userData.plainMat] : [own];
    for (const m of new Set(mats)) {
      if (!m || Array.isArray(m) || !swappable(m)) continue;
      const v = fadeVariant(m), k = fadeLayoutKey(o);
      let done = shadowDone.get(v);
      if (!done) shadowDone.set(v, (done = new Set()));
      if (done.has(k)) continue;
      done.add(k);
      const p = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, v, 1) : new THREE.Mesh(o.geometry, v);
      if (o.isInstancedMesh && o.instanceColor) p.instanceColor = o.instanceColor;
      p.castShadow = true; p.receiveShadow = o.receiveShadow; p.name = `${o.name || "mesh"}:fade-shadow-warm`;
      p.matrixWorld.copy(o.matrixWorld);
      g.add(p);
    }
  });
  return g.children.length ? g : null;
}
/** was the shadow pass of `v` (a fading copy) warmed for this mesh's geometry layout? (the gate row fadeshadow) */
export const fadeShadowWarmed = (v, o) => !!shadowDone.get(v)?.has(fadeLayoutKey(o));
/** boot3 (docs/BOOT.md section 5): stand-ins drawn with the OWN materials of obj's meshes that are fading right now (a tile
 *  streamed under the boot cover holds its fade: the warm-up drew only its fading copies, and the end of its fade, ~1 s
 *  after the reveal, built the own materials on a frame: 9-16 node builds + sync pipelines, a 160-260 ms long task).
 *  Null when nothing fades. ?fadewarm=old: none (as before). */
export function ownProxies(obj) {
  if (!SMOOTH || qs.get("fadewarm") === "old") return null;
  const g = new THREE.Group();
  obj.traverse((o) => {
    const m = o.userData.fadeOrig;
    if (!o.isMesh || !m || Array.isArray(m)) return;
    const p = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, m, 1) : new THREE.Mesh(o.geometry, m);
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
