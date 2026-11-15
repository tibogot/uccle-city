// TEMPORAL UPSCALING + DYNAMIC RESOLUTION (docs/UPSCALE.md; docs/perf/AUDIT.md step 15).
//
// The scene (and AO / SSR / the sky's haze) renders at an INTERNAL resolution (scale x the drawing buffer per axis,
// no MSAA) with a sub-pixel jitter (Halton 2,3); a temporal resolve accumulates the jittered frames into an
// output-resolution history: three r187's TAAUNode (MIT, three.js authors: 9-tap Blackman-Harris reconstruction,
// variance clipping, thin-feature lock, flicker reduction) with two changes made here:
//  - MOTION FROM DEPTH, not a velocity MRT: three's `velocity` in the MRT makes every instanced mesh keep a copy of its
//    instance matrices (a full array copy per mesh per frame, an extra vertex buffer, object-specific builds) and every
//    lit shader changes. Here the history is reprojected with the camera only (the dilated tap's depth -> world ->
//    last frame's unjittered view-projection), as Tidewater does for its static geometry (dgreenheck/tidewater,
//    src/post/CameraVelocity.js, MIT); things that move on their own (cars, trams, birds) lean on the variance clip.
//  - the jitter is set around OUR scene render (post.js renders the scene itself, before the RenderPipeline), and its
//    amplitude drops while the camera moves (Tidewater TemporalUpscale.js jitterMoving: in motion the samples already
//    move over the pixels, a full jitter only adds flicker of sub-pixel detail).
// After the resolve: a 5-tap sharpen clamped to the local min / max (no halos), inline in the final grade (post.js).
// Dynamic resolution: the GPU time per frame (timestamp queries, main.js sampleGpu) steers the scale inside the
// quality preset's range: down quickly when over the target, up one small step after a calm period, with hysteresis.
//
// Switches: ?upscale=0 (native + MSAA, as before 2026-11-15), ?dynres=0 (a fixed scale), ?rscale=0.75 (the scale; with
// dynres on it is the start), ?quality=high|medium|low|auto|native, ?taasharp=0.3 (sharpen strength, 0 = off).
// The game's settings menu: `import { cityQuality } from "./upscale.js"` (also window.cityQuality):
//   cityQuality.set("high" | "medium" | "low" | "auto" | "native"), .get(), .presets, .stats()
import * as THREE from "three/webgpu";
import TAAUNode from "three/addons/tsl/display/TAAUNode.js";
import { clipAABB, flickerReduction, sampleCurrentDepth, samplePreviousDepth } from "three/addons/tsl/utils/TAAUtils.js";
import { Fn, float, vec2, vec3, vec4, ivec2, uniform, uv, exp, max, min, mix, luminance, property, outputStruct, context, texture, getViewPosition, positionWorld, renderGroup, diffuseColor } from "three/tsl";
import { ditherFrame, ditherNoise } from "./lodFade.js";

const qs = new URLSearchParams(location.search);
/** ?upscale=0: the native path (MSAA, every pass at the drawing buffer's size), as before */
export const UPSCALE = qs.get("upscale") !== "0" && qs.get("fx") !== "0";

// ---- see-through glass without MSAA: the car / tram / train glass is ONE opaque draw made see-through by
// alphaToCoverage, which only acts on an MSAA target; at 1 sample three draws it fully opaque (black windows).
// Upscaled, a material flagged `userData.seeThrough` keeps a STOCHASTIC coverage instead: a pixel is dropped when its
// alpha is under the per-frame dither (ditherNoise, moving each frame), and the TAA history averages it back into the
// see-through glass A2C gave. Not for the coverage-as-alpha cards and wires (trees, hedges, ivy, catenary, mesh
// fences): a thin stochastic feature is clipped away by the history's neighbourhood clamp (dotted wires, tried); those
// keep three's 1-sample fallback (a hard alpha edge), which the jitter + history anti-alias. Native: untouched.
if (UPSCALE) {
  const NM = THREE.NodeMaterial.prototype, setup = NM.setupDiffuseColor;
  NM.setupDiffuseColor = function (builder) {
    setup.call(this, builder);
    if (this.alphaToCoverage === true && this.userData?.seeThrough === true && this.transparent !== true && (builder.renderer.currentSamples ?? 1) <= 1) {
      diffuseColor.a.lessThan(ditherNoise()).discard();
    }
  };
}

// ---- texture mip bias: at an internal scale s the GPU picks mips for the SMALLER image (blurry bricks / cobbles after
// the upscale); the scene pass's fragment texture samples get bias log2(s) + MIP_EXTRA (FSR2's rule; the history
// averages the extra aliasing). WebGPU samplers have no LOD bias: done in the shader (textureSampleBias) for samples
// with no level / bias / grad / compare of their own, in the pass whose MRT is the scene's (not shadows, not post).
export const uMipBias = uniform(0);
const MIP_EXTRA = +(qs.get("mipbias") ?? -0.3);
let sceneMRTRef = null;
/** post.js: the scene pass's MRT (the mip bias applies to its builds only) */
export function setSceneMRT(m) { sceneMRTRef = m; }
if (UPSCALE && qs.get("mipbias") !== "off") {
  const TN = THREE.TextureNode.prototype, gen = TN.generateSnippet;
  TN.generateSnippet = function (builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, depthSnippet, compareSnippet, gradSnippet, gatherSnippet, ...rest) {
    const t = this.value;
    if (!levelSnippet && !biasSnippet && !gradSnippet && !gatherSnippet && !compareSnippet && builder.shaderStage === "fragment" && sceneMRTRef &&
        builder.renderer.getMRT?.() === sceneMRTRef && t && !t.isRenderTargetTexture && !t.isDepthTexture &&
        t.minFilter !== THREE.NearestFilter && t.minFilter !== THREE.LinearFilter && (t.generateMipmaps || t.mipmaps?.length > 1)) {
      biasSnippet = uMipBias.build(builder, "float");
    }
    return gen.call(this, builder, textureProperty, uvSnippet, levelSnippet, biasSnippet, depthSnippet, compareSnippet, gradSnippet, gatherSnippet, ...rest);
  };
}

// ---- quality presets: internal scale range for the dynamic resolution, start, and effect switches
export const PRESETS = {
  native: { label: "Native (TAA, full resolution)", min: 1, max: 1, start: 1, ao: true, ssr: true },
  high: { label: "High", min: 0.85, max: 1, start: 0.92, ao: true, ssr: true },
  medium: { label: "Medium", min: 0.7, max: 0.85, start: 0.77, ao: true, ssr: true },
  low: { label: "Low", min: 0.55, max: 0.7, start: 0.6, ao: true, ssr: false },
  auto: { label: "Auto (holds 60 fps)", min: 0.6, max: 1, start: 0.8, ao: true, ssr: true },
};
const TARGET_MS = +(qs.get("gputarget") ?? 14);       // the GPU budget the dynamic resolution holds (60 Hz with margin)
const STEP = 0.025;                                      // scale grid (each change resizes the internal targets)

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const quant = (s) => +(Math.round(s / STEP) * STEP).toFixed(3);
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
const JITTER = Array.from({ length: 16 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);

/**
 * three's TAAUNode with the motion built from the depth (camera reprojection) and the jitter driven from outside
 * (begin / end around the scene render): its own OnBeforeRenderPipeline hook would jitter only the post chain.
 */
class CityTAAU extends TAAUNode {
  constructor(beautyNode, depthNode, motionNode, camera, curVP, prevVP) {
    super(beautyNode, depthNode, null, camera);
    this.motionNode = motionNode;                        // the objects' own motion (uv), 0 for static ones (objectMotion)
    this._curVP = curVP;                                 // this frame's UNJITTERED view-projection
    this._prevVP = prevVP;                               // last frame's
    this.uWeight = uniform(0.05);                        // baseline weight of the current frame
    this.uReset = uniform(0);                            // 1: drop the history this frame (camera cut)
    this.uKernel = uniform(+(qs.get("taakernel") ?? 1.6));   // reconstruction sharpness when the history is good (three: 1)
  }

  setup(builder) {
    this.depthNode.build(builder);
    this.beautyNode.build(builder);
    this.motionNode?.build(builder);
    this._previousDepthRenderTarget.depthTexture.format = this.depthNode.value.format;
    this._previousDepthRenderTarget.depthTexture.type = this.depthNode.value.type;
    const historyNode = texture(this._historyRenderTarget.textures[0]);
    const lockNode = texture(this._historyRenderTarget.textures[1]);
    const colorOutput = property("vec4"), lockOutput = property("vec4");
    const outputNode = outputStruct(colorOutput, lockOutput);

    const resolve = Fn(() => {
      const uvNode = uv();
      const inputSizeF = vec2(this.beautyNode.size());
      const pIn = uvNode.mul(inputSizeF);
      const closestTapF = pIn.sub(vec2(0.5).add(this._jitterOffset)).round();
      const closestTap = ivec2(closestTapF);
      const cur = sampleCurrentDepth(this.depthNode, closestTapF, this._cameraNearFar);
      const closestDepth = cur.get("closestDepth"), closestTexel = cur.get("closestPositionTexel"), farthestDepth = cur.get("farthestDepth");

      // camera motion at the dilated tap: its (jittered) view position -> world -> last frame's unjittered clip
      const raw = this.depthNode.load(closestTexel).r;
      const tapUV = closestTexel.add(0.5).div(inputSizeF);
      const wpos = this._cameraWorldMatrix.mul(vec4(getViewPosition(tapUV, raw, this._cameraProjectionMatrixInverse), 1));
      const c = this._curVP.mul(wpos).toVar(), p = this._prevVP.mul(wpos).toVar();
      const inFront = p.w.greaterThan(1e-4);
      // + the object's own motion (a moving tram / car / the player's vehicle; 0 for the static city and the sky)
      const isFar = builder.renderer.reversedDepthBuffer ? raw.lessThanEqual(0) : raw.greaterThanEqual(1);
      const objUV = this.motionNode ? isFar.select(vec2(0), this.motionNode.load(closestTexel).xy) : vec2(0);
      const moving = objUV.length().mul(inputSizeF.y).greaterThan(0.05);
      const offsetUV = c.xy.div(c.w).sub(p.xy.div(p.w.max(1e-4))).mul(vec2(0.5, -0.5)).add(objUV);
      const historyUV = uvNode.sub(offsetUV);
      const motionFactor = uvNode.sub(historyUV).mul(inputSizeF).length().div(this.maxVelocityLength).saturate();
      const previousDepth = samplePreviousDepth(this._previousDepthNode, historyUV, this._previousCameraProjectionMatrixInverse, this._previousCameraWorldMatrix, this._cameraWorldMatrixInverse, this._cameraNearFar, this.camera);

      const isValidUV = historyUV.greaterThanEqual(0).all().and(historyUV.lessThanEqual(1).all()).and(inFront).and(this.uReset.lessThan(0.5));
      const isEdge = farthestDepth.sub(closestDepth).greaterThan(this.edgeDepthDiff);
      const isDisocclusion = closestDepth.sub(previousDepth).greaterThan(this.depthThreshold);
      const hasValidHistory = isValidUV.and(isEdge.or(isDisocclusion.not()));

      // the reconstruction kernel widens where the history counts for little (disocclusion, fast motion): the
      // current frame alone then reads as a soft upscale, not as the input's pixel staircase (FSR2's kernel scale)
      const kernel = hasValidHistory.select(mix(this.uKernel, float(0.45), motionFactor.mul(4).saturate()), float(0.45));
      const sumColor = vec4(0).toVar(), sumWeight = float(0).toVar(), moment1 = vec4(0).toVar(), moment2 = vec4(0).toVar();
      const taps = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
      for (const [x, y] of taps) {
        const tap = closestTap.add(ivec2(x, y));
        const delta = pIn.sub(vec2(tap).add(vec2(0.5).add(this._jitterOffset)));
        const w = exp(delta.dot(delta).mul(kernel.mul(-2.29)));
        const col = this.beautyNode.load(tap).max(0);
        sumColor.addAssign(col.mul(w)); sumWeight.addAssign(w);
        moment1.addAssign(col); moment2.addAssign(col.pow2());
      }
      const currentColor = sumColor.div(sumWeight.max(1e-5));
      const N = float(taps.length), mean = moment1.div(N);
      const varianceGamma = mix(0.5, 1, motionFactor.oneMinus().pow2());
      const variance = moment2.div(N).sub(mean.pow2()).max(0).sqrt().mul(varianceGamma);
      const minColor = mean.sub(variance), maxColor = mean.add(variance);
      const historyColor = historyNode.sample(historyUV);
      const clipped = clipAABB(mean.clamp(minColor, maxColor), historyColor, minColor, maxColor);

      const meanLuma = luminance(mean.rgb).toConst();
      const thinFeature = luminance(currentColor.rgb).sub(meanLuma).abs().div(meanLuma).smoothstep(0, 0.2);
      const isDepthChanged = closestDepth.sub(previousDepth).abs().greaterThan(this.depthThreshold);
      const canLock = isValidUV.and(isDepthChanged.not()).and(moving.not());
      const lock = max(canLock.select(thinFeature, float(0)), lockNode.r.mul(isDisocclusion.select(0, 0.5))).saturate();
      const history = mix(clipped, historyColor, lock);
      const weight = hasValidHistory.select(this.uWeight.add(motionFactor).add(moving.select(0.08, 0)).saturate(), float(1));
      colorOutput.assign(flickerReduction(currentColor, history, weight));
      lockOutput.assign(lock);
      return vec4(0);
    });

    const shared = context(builder.getSharedContext());
    this._resolveMaterial.contextNode = shared;
    this._resolveMaterial.colorNode = resolve();
    this._resolveMaterial.outputNode = outputNode;
    this._seedMaterial.colorNode = Fn(() => { colorOutput.assign(this.beautyNode.sample(uv())); lockOutput.assign(0); return vec4(0); })();
    this._seedMaterial.contextNode = shared;
    this._seedMaterial.outputNode = outputNode;
    return this._textureNode;
  }
}

/**
 * Per OBJECT (updated before each draw of the scene pass): last frame's world matrix x this frame's inverse, identity for
 * an object that did not move (the whole static city: its motion output is then exactly 0, the camera reprojection
 * covers it). Rigid motion only: instanced sets (the traffic fleet, the birds) and skinning keep the camera's.
 */
const _prev = new WeakMap(), _inv = new THREE.Matrix4();
class ObjectMotionMatrix extends THREE.Node {
  static get type() { return "ObjectMotionMatrix"; }
  constructor() {
    super("mat4");
    this.updateType = THREE.NodeUpdateType.OBJECT;
    this.updateAfterType = THREE.NodeUpdateType.OBJECT;
    this.delta = uniform(new THREE.Matrix4());
  }
  update({ object, frameId }) {
    const p = _prev.get(object), m = object.matrixWorld;
    // (not drawn last frame: no motion, rather than a jump from where it was seen long ago)
    if (!p || p.f < frameId - 1 || p.m.equals(m)) this.delta.value.identity();
    else this.delta.value.multiplyMatrices(p.m, _inv.copy(m).invert());
  }
  updateAfter({ object, frameId }) {
    let p = _prev.get(object);
    if (!p) { p = { m: new THREE.Matrix4(), f: 0 }; _prev.set(object, p); }
    p.m.copy(object.matrixWorld); p.f = frameId;
  }
  setup() { return this.delta; }
}

/** A 5-tap sharpen of the resolved image, clamped to the cross's min / max (no halo, no ringing). */
export function sharpenTap(texNode, amount) {
  const t = uv(), px = vec2(1).div(vec2(texNode.size()));
  const c = texNode.sample(t).rgb.toVar();
  const n = texNode.sample(t.sub(vec2(0, px.y))).rgb, s = texNode.sample(t.add(vec2(0, px.y))).rgb;
  const w = texNode.sample(t.sub(vec2(px.x, 0))).rgb, e = texNode.sample(t.add(vec2(px.x, 0))).rgb;
  const lo = min(c, n, s, w, e), hi = max(c, n, s, w, e);
  return c.add(c.mul(4).sub(n).sub(s).sub(w).sub(e).mul(amount.mul(0.25))).clamp(lo, hi).max(vec3(0));
}

/**
 * The upscaler: owns the scale (dynamic resolution), the jitter and the TAAU node. post.js asks it for the internal
 * size each frame and wraps its scene render + pipeline render in begin() / end().
 */
export function createUpscaler(renderer, camera) {
  const q0 = PRESETS[qs.get("quality")] ? qs.get("quality") : "auto";
  const fixed = qs.has("rscale") ? clamp(+qs.get("rscale") || 1, 0.4, 1) : null;
  const dynOn = qs.get("dynres") !== "0" && !(fixed !== null && qs.get("dynres") !== "1");
  const sharp0 = qs.has("taasharp") ? +qs.get("taasharp") : null;
  const U = {
    quality: q0, preset: PRESETS[q0], scale: 1, dynres: dynOn,
    targetMs: TARGET_MS, taau: null, listeners: [],
    uSharp: uniform(0.3),
    // the dynamic resolution's state
    win: [], lastChange: 0, calmSince: 0, changes: 0, history: [],
    _vp: new THREE.Matrix4(), _prevPos: new THREE.Vector3(), _prevDir: new THREE.Vector3(), _dir: new THREE.Vector3(),
    _has: false, _motion: 0, _frame: 0,
  };

  const applyScale = (s) => {
    s = clamp(quant(s), 0.4, 1);
    if (s === U.scale) return;
    U.scale = s;
    U.uSharp.value = sharp0 ?? (0.2 + 0.5 * (1 - s));     // more sharpening the lower the scale
    uMipBias.value = Math.log2(s) + MIP_EXTRA;
    for (const f of U.listeners) f(s);
  };
  U.onScale = (f) => { U.listeners.push(f); f(U.scale); };

  /** the internal size for an output size (floor, as three's RTTNode.setSize: the beauty rtt matches the scene target) */
  U.internalSize = (out, target) => target.set(Math.max(1, Math.floor(out.x * U.scale)), Math.max(1, Math.floor(out.y * U.scale)));

  U.curVP = uniform(new THREE.Matrix4()).setGroup(renderGroup);    // unjittered view-projection, this / last frame
  U.prevVP = uniform(new THREE.Matrix4()).setGroup(renderGroup);
  /** the scene MRT's "motion" output: the object's own screen motion in uv (last frame's place with the object's
   *  motion minus without it); exactly 0 for static objects */
  U.motionOutput = () => {
    const D = new ObjectMotionMatrix(), wp = vec4(positionWorld, 1);
    const ps = U.prevVP.mul(wp), po = U.prevVP.mul(D.mul(wp));
    return vec4(ps.xy.div(ps.w.max(1e-4)).sub(po.xy.div(po.w.max(1e-4))).mul(vec2(0.5, -0.5)), 0, 1);
  };
  U.makeTAAU = (beauty, depth, motion) => {
    U.taau = new CityTAAU(beauty, depth, motion, camera, U.curVP, U.prevVP);
    return U.taau;
  };

  /** before the scene render: decide the scale, jitter the camera, the reprojection matrices */
  U.begin = (inW, inH) => {
    const T = U.taau;
    if (!T) return;
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    U._vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    // camera motion this frame (0 still .. 1 moving), eased; a cut (> 25 m or a big turn in a frame) drops the history
    const pos = camera.position, dir = camera.getWorldDirection(U._dir);
    let target = 0, cut = !U._has;
    if (U._has) {
      const dp = pos.distanceTo(U._prevPos), da = Math.acos(clamp(dir.dot(U._prevDir), -1, 1));
      target = clamp(Math.max(dp / 0.1, da / 0.0006), 0, 1);
      cut = dp > 25 || da > 0.6;
    }
    U._motion = target > U._motion ? target : U._motion * 0.85 + target * 0.15;
    U._prevPos.copy(pos); U._prevDir.copy(dir);
    T._prevVP.value.copy(U._has && !cut ? T._curVP.value : U._vp);
    T._curVP.value.copy(U._vp);
    T.uReset.value = cut ? 1 : 0;
    U._has = true;
    const [hx, hy] = JITTER[U._frame % JITTER.length];
    const k = 1 - 0.5 * U._motion;                      // full jitter still, half while moving
    T._jitterOffset.value.set(hx * k, hy * k);
    camera.setViewOffset(inW, inH, hx * k, hy * k, inW, inH);
    // the dithered fades / cross-fades: a new noise phase each frame, resolved by the history (Jimenez's IGN offset)
    const f = U._frame % 16;
    ditherFrame.value.set(5.588238 * f, 5.588238 * f);
    U._frame++;
  };
  /** after the post chain */
  U.end = () => { if (U.taau) camera.clearViewOffset(); };

  /** one GPU frame time (ms, main.js sampleGpu) -> the dynamic resolution */
  U.gpuSample = (ms) => {
    if (!(ms > 0) || ms > 200) return;
    const now = performance.now();
    U.win.push(ms);
    if (!U.dynres || !U.taau) return;
    const P = U.preset;
    if (P.min >= P.max) return;
    if (U.win.length < 24 || now - U.lastChange < 750) return;
    const s = [...U.win].sort((a, b) => a - b), p75 = s[Math.floor(s.length * 0.75)];
    const T = U.targetMs;
    if (p75 > T * 1.04 && U.scale > P.min + 1e-6) {
      // GPU time ~ fixed + pixels: aim a little under the target (sqrt: per axis), at most -0.1 per change
      const want = U.scale * Math.sqrt((T * 0.94) / p75);
      setDyn(clamp(Math.max(want, U.scale - 0.1), P.min, P.max), p75, now);
      return;
    }
    if (p75 < T * 0.8 && U.scale < P.max - 1e-6) {
      if (!U.calmSince) U.calmSince = now;
      const up = Math.min(P.max, U.scale + 0.05);
      const predicted = p75 * (up * up) / (U.scale * U.scale);
      if (now - U.calmSince > 2500 && predicted < T * 0.92) setDyn(up, p75, now);
    } else U.calmSince = 0;
    if (U.win.length > 120) U.win.splice(0, U.win.length - 60);
  };
  function setDyn(s, p75, now) {
    const before = U.scale;
    applyScale(s);
    if (U.scale !== before) {
      U.changes++;
      U.history.push([Math.round(now), before, U.scale, +p75.toFixed(2)]);
      if (U.history.length > 40) U.history.shift();
    }
    U.win.length = 0; U.lastChange = now; U.calmSince = 0;
  }

  /** the settings menu: a preset (internal scale range / start, effects) */
  U.setQuality = (q) => {
    if (!PRESETS[q]) throw new Error(`quality: ${q}? (${Object.keys(PRESETS).join(", ")})`);
    U.quality = q; U.preset = PRESETS[q];
    applyScale(fixed !== null && q === q0 ? fixed : U.preset.start);
    U.win.length = 0; U.lastChange = performance.now(); U.calmSince = 0;
    U.effects?.(U.preset);
  };
  U.setScale = (s, { dynres = false } = {}) => { U.dynres = dynres; applyScale(s); U.win.length = 0; U.lastChange = performance.now(); };
  U.stats = () => ({
    upscale: true, quality: U.quality, scale: U.scale, dynres: U.dynres, range: [U.preset.min, U.preset.max], targetMs: U.targetMs,
    sharpen: +U.uSharp.value.toFixed(3), changes: U.changes, recent: U.history.slice(-8), motion: +U._motion.toFixed(2),
  });

  applyScale(fixed ?? U.preset.start);
  U.uSharp.value = sharp0 ?? (0.2 + 0.5 * (1 - U.scale));
  uMipBias.value = Math.log2(U.scale) + MIP_EXTRA;
  return U;
}

/** The settings menu's handle (the game HUD): works with ?upscale=0 too (then only the effect switches act). */
export const cityQuality = {
  presets: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.label])),
  _pipe: null,
  _q: PRESETS[qs.get("quality")] ? qs.get("quality") : "auto",
  /** "high" | "medium" | "low" | "auto" | "native" */
  set(q) {
    if (!PRESETS[q]) throw new Error(`quality: ${q}? (${Object.keys(PRESETS).join(", ")})`);
    this._q = q;
    const p = this._pipe;
    if (p?.upscale) p.upscale.setQuality(q); else p?.setEffects?.(PRESETS[q]);
    return this.stats();
  },
  get() { return this._q; },
  stats() { return this._pipe?.upscale ? this._pipe.upscale.stats() : { upscale: false, quality: this._q }; },
};
window.cityQuality = cityQuality;
