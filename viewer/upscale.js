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
import { Fn, float, vec2, vec3, vec4, ivec2, uniform, uv, exp, max, min, mix, luminance, property, outputStruct, context, texture, getViewPosition, positionWorld, positionPrevious, modelWorldMatrix, varying, renderGroup, diffuseColor, cameraViewMatrix, viewZToPerspectiveDepth, floor } from "three/tsl";
import { ditherFrame, ditherNoise } from "./lodFade.js";

const qs = new URLSearchParams(location.search);
/** ?upscale=0: the native path (MSAA, every pass at the drawing buffer's size), as before */
export const UPSCALE = qs.get("upscale") !== "0" && qs.get("fx") !== "0";

/** ?instmotion=0: the per-instance / skinned / wind motion off (camera + rigid object motion only, as on 2026-11-15) */
export const INST_MOTION = UPSCALE && qs.get("instmotion") !== "0";
// ---- SHARP (branch claude/sharp, 2026-11-17, docs/UPSCALE.md "Sharp moving objects"): the owner's playtest saw the
// player's car shimmer (plate breaking into blocks) and distant / moving things (motorbikes, the falcon in flight) soft
// and blocky. Each fix has its own ?key=old; ?sharp=old = all of them as before.
const SHARP_OLD = qs.get("sharp") === "old";
const isOld = (k) => SHARP_OLD || qs.get(k) === "old";
/** ?taadepth=old: the history's disocclusion test ignored the object's OWN motion along the view (the player's car,
 *  a falcon flown from behind: dropped history every frame = the raw low-res frame) */
export const SHARP_DEPTH = !isOld("taadepth");
/** ?taahist=old: the history fetched bilinearly (soft after each reprojection) instead of a 5-tap Catmull-Rom */
export const SHARP_HIST = !isOld("taahist");
/** ?taarecon=old: low-confidence pixels (disocclusion, fast motion) reconstructed with a wide Gaussian (soft blocks)
 *  instead of a deringed Lanczos-2 */
export const SHARP_RECON = !isOld("taarecon");
/** ?taalock=old: the thin-feature lock off on every pixel with its own motion (a followed car's plate flickered) */
export const SHARP_LOCK = !isOld("taalock");
/** ?taablend=old: under camera motion the clip box at 0.5 sigma and + the whole motion factor on the current frame */
export const SHARP_BLEND = !isOld("taablend");
/** ?taafire=old: the reconstruction taps unweighted (a bright sub-pixel glint sparkles through) */
export const SHARP_FIRE = !isOld("taafire");
/** ?rcas=old: the clamped 5-tap unsharp mask instead of RCAS (FSR's robust contrast-adaptive sharpening) */
export const SHARP_RCAS = !isOld("rcas");
/** ?drrule=old: the dynamic resolution as on 2026-11-15 (floor 0.6, steps up to 0.1, GPU time only) */
export const SHARP_DR = !isOld("drrule");

/** ?thinaa=old: the coverage cards / wires as merged on 2026-11-15 (hard alpha edge, full-strength 1 px wires) */
export const THIN_OLD = qs.get("thinaa") === "old";

/**
 * PER-VERTEX MOTION (2026-11-15, docs/UPSCALE.md "Moving objects"): a material whose vertices move on their own (an
 * instanced fleet re-written each frame, GPU-simulated birds, wind) gives the motion output the offset from THIS
 * frame's vertex to where it was LAST frame, in the object's local space (positionLocal: three r187 has applied the
 * instance matrix and the positionNode already), evaluated in the vertex stage (a varying). Zero = no own motion.
 * The object's rigid motion (ObjectMotionMatrix) and the camera's (the resolve) come on top.
 */
/** live A/B (debug, window.instMotion.set(false)): 0 = the vertex motion multiplied away, same shaders */
export const uInstMotion = uniform(1);
export function setMotionDelta(material, deltaNode) {
  if (INST_MOTION && deltaNode) material.motionDeltaNode = deltaNode;
  return material;
}

// ---- skinned meshes: three's skinning keeps last frame's bone matrices and skins positionPrevious with them when
// the builder "needs previous data" (normally: a `velocity` MRT output). Turned on here for SkinnedMeshes drawn in the
// scene pass only (the characters, the falcons): one copy of the bone matrices per skeleton per frame, a second skin
// transform in their vertex shader. Not for instanced / batched meshes (three would keep a copy of every instance
// matrix array: the reason `velocity` is not used, see CityTAAU).
if (INST_MOTION) {
  const NB = THREE.NodeBuilder.prototype, need = NB.needsPreviousData;
  NB.needsPreviousData = function () {
    if (need.call(this)) return true;
    const o = this.object;
    return o?.isSkinnedMesh === true && sceneMRTRef !== null && this.renderer.getMRT?.() === sceneMRTRef;
  };
}

// ---- see-through glass without MSAA: the car / tram / train glass is ONE opaque draw made see-through by
// alphaToCoverage, which only acts on an MSAA target; at 1 sample three draws it fully opaque (black windows).
// Upscaled, a material flagged `userData.seeThrough` keeps a STOCHASTIC coverage instead: a pixel is dropped when its
// alpha is under the per-frame dither (ditherNoise, moving each frame), and the TAA history averages it back into the
// see-through glass A2C gave. Not for the coverage-as-alpha cards and wires (trees, hedges, ivy, catenary, mesh
// fences): a thin stochastic feature is clipped away by the history's neighbourhood clamp (dotted wires, tried); those
// keep three's 1-sample fallback (a hard alpha edge), which the jitter + history anti-alias. Native: untouched.
//
// THIN GEOMETRY (2026-11-15, ?thinaa=old = as above): the other alpha-to-coverage materials (tree / hedge / ivy cards,
// the welded-mesh fences) get the same stochastic coverage in the scene pass, which is what A2C gave them at 4x:
// their alpha is 1 inside a leaf and only falls off over the pixel-wide band of the alpha-test edge (three's
// smoothstep(alphaTest, alphaTest + fwidth)) or over a wide even veil (a far fence), so the dropped pixels always sit
// next to kept ones and the history averages them (no lone sub-pixel feature for the clamp to throw away). The WIRES
// (thinWire(): the tram catenary, the railway wires) are the exception: a ribbon >= ~1.2 internal pixels wide whose
// alpha is its true width over the ribbon's (coverage) is BLENDED (transparent) instead: soft and continuous, never
// dotted, as faint as the real 12 mm wire. Both only in the upscaled city pipeline (post.js enableThinAA()).
let thinOn = false;
const _wires = new Set();
/** the wires' minimum half-width per metre of distance (native: 0.0011 = ~1 px at 1080p / 60 deg; upscaled: 0.6
 *  INTERNAL pixels, set per frame by the upscaler) */
export const wireHalfPx = uniform(0.0011);
/** a coverage-as-alpha wire material (opacity = true width / ribbon width): blended under the TAAU */
export function thinWire(m) { _wires.add(m); if (thinOn) { m.transparent = true; m.needsUpdate = true; } return m; }
/** post.js, upscaled pipeline: the thin-geometry path on */
export function enableThinAA() {
  if (!UPSCALE || THIN_OLD || thinOn) return;
  thinOn = true;
  for (const m of _wires) { m.transparent = true; m.needsUpdate = true; }
}
if (UPSCALE) {
  const NM = THREE.NodeMaterial.prototype, setup = NM.setupDiffuseColor;
  NM.setupDiffuseColor = function (builder) {
    setup.call(this, builder);
    if (this.alphaToCoverage === true && this.transparent !== true && (builder.renderer.currentSamples ?? 1) <= 1) {
      if (this.userData?.seeThrough === true) diffuseColor.a.lessThan(ditherNoise()).discard();
      else if (thinOn && sceneMRTRef !== null && builder.renderer.getMRT?.() === sceneMRTRef) diffuseColor.a.lessThan(ditherNoise()).discard();
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
  auto: { label: "Auto (holds 60 fps)", min: 0.6, max: 1, start: 0.8, ao: true, ssr: true, soft: 0.75 },
};
// SHARP (?drrule=old): a SOFT floor (auto: 0.75): the scale goes under it only when frames are really missed there
// (0.6 under 0.75 was soft and blocky on a laptop GPU in power-saving clocks, whose timings read high while 60 fps held)
const TARGET_MS = +(qs.get("gputarget") ?? 14);       // the GPU budget the dynamic resolution holds (60 Hz with margin)
const STEP = 0.025;                                      // scale grid (each change resizes the internal targets)

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** the sharpen's strength for a scale: RCAS lobe share 0.5 at 1.0 -> 1 (FSR's maximum) at 0.65 and under; the old
 *  unsharp mask 0.2 at 1.0 -> 0.4 at 0.6 */
const sharpFor = (s) => SHARP_RCAS ? clamp(0.5 + (1 - s) / 0.35 * 0.5, 0.5, 1) : 0.2 + 0.5 * (1 - s);
const quant = (s) => +(Math.round(s / STEP) * STEP).toFixed(3);
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
const JITTER = Array.from({ length: 16 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);

/** 5-tap Catmull-Rom of a filtered texture (Jimenez, "Filmic SMAA" 2016: the 4 x 4 bicubic with the corners dropped,
 *  each remaining 2 x 2 group one bilinear fetch); >= 0 (the negative lobes on a bright edge) */
function catmullRom(tex, uvIn) {
  const size = vec2(tex.size()), sp = uvIn.mul(size), t1 = floor(sp.sub(0.5)).add(0.5), f = sp.sub(t1);
  const w0 = f.mul(f.mul(f.mul(-0.5).add(1)).sub(0.5));
  const w1 = f.mul(f).mul(f.mul(1.5).sub(2.5)).add(1);
  const w2 = f.mul(f.mul(f.mul(-1.5).add(2)).add(0.5));
  const w3 = f.mul(f).mul(f.mul(0.5).sub(0.5));
  const w12 = w1.add(w2), o12 = w2.div(w12);
  const t0 = t1.sub(1).div(size), t3 = t1.add(2).div(size), t12 = t1.add(o12).div(size);
  const a = tex.sample(vec2(t12.x, t0.y)).mul(w12.x.mul(w0.y));
  const b = tex.sample(vec2(t0.x, t12.y)).mul(w0.x.mul(w12.y));
  const c = tex.sample(t12).mul(w12.x.mul(w12.y));
  const d = tex.sample(vec2(t3.x, t12.y)).mul(w3.x.mul(w12.y));
  const e = tex.sample(vec2(t12.x, t3.y)).mul(w12.x.mul(w3.y));
  const wsum = w12.x.mul(w0.y).add(w0.x.mul(w12.y)).add(w12.x.mul(w12.y)).add(w3.x.mul(w12.y)).add(w12.x.mul(w3.y));
  return a.add(b).add(c).add(d).add(e).div(wsum).max(0);
}

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
    // extra current-frame weight on pixels with their own motion (resampling the history each frame softens; a moving
    // object's motion was approximate before the per-instance motion; ?taamoving=)
    this.uMovingW = uniform(+(qs.get("taamoving") ?? (INST_MOTION ? 0.03 : 0.08)));
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
      const motTap = this.motionNode ? isFar.select(vec4(0), this.motionNode.load(closestTexel)) : vec4(0);
      const objUV = motTap.xy;
      const moving = objUV.length().mul(inputSizeF.y).greaterThan(0.05);
      const offsetUV = c.xy.div(c.w).sub(p.xy.div(p.w.max(1e-4))).mul(vec2(0.5, -0.5)).add(objUV);
      const historyUV = uvNode.sub(offsetUV);
      const pxMotion = uvNode.sub(historyUV).mul(inputSizeF).length();
      const motionFactor = pxMotion.div(this.maxVelocityLength).saturate();
      // last frame's depth at the history uv, seen from THIS frame's camera. SHARP (?taadepth=old): + the object's own
      // view-z change this frame (motion.z, metres): a car driving away from the chase camera was 0.2-0.4 m nearer last
      // frame, three's one-sided test read that as a disocclusion on every pixel of the car (except edges) and dropped
      // its history every frame (the player's car shimmered, its plate broke into the input's blocks)
      let previousDepth;
      if (SHARP_DEPTH) {
        const prevRaw = this._previousDepthNode.sample(historyUV).r;
        const pv = getViewPosition(historyUV, prevRaw, this._previousCameraProjectionMatrixInverse);
        const pw = this._previousCameraWorldMatrix.mul(vec4(pv, 1)).xyz;
        const vz = this._cameraWorldMatrixInverse.mul(vec4(pw, 1)).z.add(motTap.z);
        previousDepth = viewZToPerspectiveDepth(vz, this._cameraNearFar.x, this._cameraNearFar.y);
      } else {
        previousDepth = samplePreviousDepth(this._previousDepthNode, historyUV, this._previousCameraProjectionMatrixInverse, this._previousCameraWorldMatrix, this._cameraWorldMatrixInverse, this._cameraNearFar, this.camera);
      }

      const isValidUV = historyUV.greaterThanEqual(0).all().and(historyUV.lessThanEqual(1).all()).and(inFront).and(this.uReset.lessThan(0.5));
      const isEdge = farthestDepth.sub(closestDepth).greaterThan(this.edgeDepthDiff);
      const isDisocclusion = closestDepth.sub(previousDepth).greaterThan(this.depthThreshold);
      const hasValidHistory = isValidUV.and(isEdge.or(isDisocclusion.not()));

      // the reconstruction kernel widens where the history counts for little (disocclusion, fast motion): the
      // current frame alone then reads as a soft upscale, not as the input's pixel staircase (FSR2's kernel scale)
      // SHARP (?taarecon=old): there a deringed Lanczos-2 instead (sharp, no blocks, no halo); the narrow Gaussian
      // stays where the history is good
      const lowConf = hasValidHistory.select(motionFactor.mul(4).saturate(), float(1));
      const kernel = SHARP_RECON ? this.uKernel : hasValidHistory.select(mix(this.uKernel, float(0.45), motionFactor.mul(4).saturate()), float(0.45));
      const sumColor = vec4(0).toVar(), sumWeight = float(0).toVar(), moment1 = vec4(0).toVar(), moment2 = vec4(0).toVar();
      const sumL = vec4(0).toVar(), sumLW = float(0).toVar(), lo = vec4(1e9).toVar(), hi = vec4(0).toVar();
      // FSR2's polynomial Lanczos-2 (x^2 < 4): ((25/16)(2/5 x^2 - 1)^2 - 9/16)(1/4 x^2 - 1)^2
      const lanczos2 = (x2) => { const a = x2.mul(0.4).sub(1), b = x2.mul(0.25).sub(1); return a.mul(a).mul(25 / 16).sub(9 / 16).mul(b.mul(b)); };
      const taps = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
      for (const [x, y] of taps) {
        const tap = closestTap.add(ivec2(x, y));
        const delta = pIn.sub(vec2(tap).add(vec2(0.5).add(this._jitterOffset)));
        const col = this.beautyNode.load(tap).max(0);
        // SHARP (?taafire=old): each tap weighted by 1 / (1 + luma) (Karis 2014): a sub-pixel sun glint through the
        // leaves or a specular spark no longer dominates the reconstruction (sparkle while moving)
        const wk = SHARP_FIRE ? float(1).div(luminance(col.rgb).add(1)) : float(1);
        const w = exp(delta.dot(delta).mul(kernel.mul(-2.29))).mul(wk);
        sumColor.addAssign(col.mul(w)); sumWeight.addAssign(w);
        moment1.addAssign(col); moment2.addAssign(col.pow2());
        if (SHARP_RECON) {
          const wl = lanczos2(delta.x.mul(delta.x)).mul(lanczos2(delta.y.mul(delta.y))).mul(wk);
          sumL.addAssign(col.mul(wl)); sumLW.addAssign(wl);
          // deringing range: the 2 x 2 input texels round the output pixel (FSR2), approximated by |d| < 1 per axis
          const near = delta.abs().lessThan(vec2(1)).all();
          lo.assign(near.select(min(lo, col), lo)); hi.assign(near.select(max(hi, col), hi));
        }
      }
      let currentColor = sumColor.div(sumWeight.max(1e-5));
      if (SHARP_RECON) currentColor = mix(currentColor, sumL.div(sumLW.max(1e-5)).clamp(lo, hi), lowConf);
      const N = float(taps.length), mean = moment1.div(N);
      // SHARP (?taablend=old): under camera motion three's clip box shrank to 0.5 sigma and the current frame's weight
      // rose by the whole motionFactor: while driving every static pixel leaned on the (soft, aliased) current low-res
      // frame. Now: >= 0.8 sigma and half the motion weight (the Catmull-Rom history + exact reprojection make the
      // history worth keeping; ghosts are still clipped)
      const varianceGamma = SHARP_BLEND ? mix(0.8, 1, motionFactor.oneMinus().pow2()) : mix(0.5, 1, motionFactor.oneMinus().pow2());
      const variance = moment2.div(N).sub(mean.pow2()).max(0).sqrt().mul(varianceGamma);
      const minColor = mean.sub(variance), maxColor = mean.add(variance);
      // SHARP (?taahist=old: bilinear): the history fetched with a 5-tap Catmull-Rom (Jimenez's 9 -> 5 bilinear taps,
      // as FSR2 / UE): a bilinear fetch softens the history on every frame it is reprojected (moving camera / objects)
      const historyColor = SHARP_HIST ? catmullRom(historyNode, historyUV) : historyNode.sample(historyUV);
      const clipped = clipAABB(mean.clamp(minColor, maxColor), historyColor, minColor, maxColor);

      const meanLuma = luminance(mean.rgb).toConst();
      const thinFeature = luminance(currentColor.rgb).sub(meanLuma).abs().div(meanLuma).smoothstep(0, 0.2);
      const isDepthChanged = closestDepth.sub(previousDepth).abs().greaterThan(this.depthThreshold);
      // SHARP (?taalock=old: never on own-motion pixels): a pixel of a moving object that stays put ON SCREEN (the
      // followed car, < 1.5 input px of total motion) keeps the thin-feature lock: its plate / panel lines stop flickering
      const canLock = isValidUV.and(isDepthChanged.not()).and(SHARP_LOCK ? moving.not().or(pxMotion.lessThan(1.5)) : moving.not());
      const lock = max(canLock.select(thinFeature, float(0)), lockNode.r.mul(isDisocclusion.select(0, 0.5))).saturate();
      const history = mix(clipped, historyColor, lock);
      const weight = hasValidHistory.select(this.uWeight.add(motionFactor.mul(SHARP_BLEND ? 0.5 : 1)).add(moving.select(this.uMovingW, 0)).saturate(), float(1));
      colorOutput.assign(flickerReduction(currentColor, history, weight));
      // debug (?taadebug=1): red = history rejected, green = own motion, blue = |motion.z| x 10 (m), on the image x 0.3
      if (qs.get("taadebug") === "1") colorOutput.assign(vec4(colorOutput.rgb.mul(0.3).add(vec3(hasValidHistory.select(0, 1), moving.select(0.6, 0), motTap.z.abs().mul(10).min(1))), 1));
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

/**
 * Per BUILD (each material x object kind): where this fragment's surface point was last frame BEFORE the object's
 * rigid motion (vec4 world position, w = 1): the material's own motion (setMotionDelta: instanced fleets, birds, wind),
 * a skinned mesh's last-frame skinning (positionPrevious, see needsPreviousData above), or here (everything else).
 */
class PreviousWorld extends THREE.Node {
  static get type() { return "PreviousWorld"; }
  constructor() { super("vec4"); }
  setup(builder) {
    if (INST_MOTION) {
      const d = builder.material?.motionDeltaNode;
      if (d) return vec4(positionWorld.add(modelWorldMatrix.mul(vec4(varying(d), 0)).xyz.mul(uInstMotion)), 1);
      const o = builder.object;
      if (o?.isSkinnedMesh === true && !o.isInstancedMesh) return vec4(mix(positionWorld, modelWorldMatrix.mul(vec4(positionPrevious, 1)).xyz, uInstMotion), 1);
    }
    return vec4(positionWorld, 1);
  }
}

/**
 * RCAS (AMD FidelityFX FSR 1 "robust contrast-adaptive sharpening", MIT, ffx_fsr1.h FsrRcasF): a 5-tap cross whose
 * negative lobe is the largest that keeps the result inside the cross's min / max: per-pixel adaptive (flat areas and
 * strong edges get little, soft detail gets most), no halo, no clipping. Runs on the HDR resolve, so on a reversible
 * tonemap (c / (1 + max(c)), inverted after): RCAS's limits assume [0, 1]. amount 0..1 = the lobe's share (FSR's
 * sharpness 0 stops = 1). 5 fetches (as the old sharpen) + ~40 ALU in the grade pass.
 */
export function rcasTap(texNode, amount) {
  const t = uv(), px = vec2(1).div(vec2(texNode.size()));
  const tm = (c) => c.div(max(c.r, max(c.g, c.b)).add(1));
  const e = tm(texNode.sample(t).rgb.max(vec3(0))).toVar();
  const b = tm(texNode.sample(t.sub(vec2(0, px.y))).rgb.max(vec3(0))), h = tm(texNode.sample(t.add(vec2(0, px.y))).rgb.max(vec3(0)));
  const d = tm(texNode.sample(t.sub(vec2(px.x, 0))).rgb.max(vec3(0))), f = tm(texNode.sample(t.add(vec2(px.x, 0))).rgb.max(vec3(0)));
  const mn4 = min(min(b, d), min(f, h)), mx4 = max(max(b, d), max(f, h));
  const hitMin = min(mn4, e).div(mx4.mul(4).add(1e-5));
  const hitMax = vec3(1).sub(max(mx4, e)).div(mn4.mul(4).sub(4).min(-1e-5));
  const lobeRGB = max(hitMin.negate(), hitMax);
  const lobe = max(float(-0.1875), min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0)).mul(amount);
  const o = b.add(d).add(f).add(h).mul(lobe).add(e).div(lobe.mul(4).add(1)).toVar();
  return o.div(float(1).sub(max(o.r, max(o.g, o.b))).max(1e-3)).max(vec3(0));
}

/** the resolve's sharpen: RCAS (default) or (?rcas=old) the clamped 5-tap unsharp mask */
export function sharpenResolved(texNode, amount) { return SHARP_RCAS ? rcasTap(texNode, amount) : sharpenTap(texNode, amount); }

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
    U.uSharp.value = sharp0 ?? sharpFor(s);                // more sharpening the lower the scale
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
    const prevW = D.mul(new PreviousWorld());
    const ps = U.prevVP.mul(wp), po = U.prevVP.mul(prevW);
    // .z (SHARP, ?taadepth=old = 0): the surface point's own view-z change this frame (metres, this frame's camera):
    // the resolve's disocclusion test adds it to last frame's depth (an object moving along the view is no disocclusion)
    const dz = SHARP_DEPTH ? cameraViewMatrix.mul(vec4(positionWorld.sub(prevW.xyz), 0)).z : float(0);
    return vec4(ps.xy.div(ps.w.max(1e-4)).sub(po.xy.div(po.w.max(1e-4))).mul(vec2(0.5, -0.5)), dz, 1);
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
    // full jitter still, half while moving (Tidewater); SHARP (?taablend=old): full always, as FSR2 / DLSS (with the
    // exact reprojection the moving samples still cover the output grid; half left it under-sampled at 0.6-0.75)
    const k = SHARP_BLEND ? 1 : 1 - 0.5 * U._motion;
    T._jitterOffset.value.set(hx * k, hy * k);
    camera.setViewOffset(inW, inH, hx * k, hy * k, inW, inH);
    // the wires' minimum half-width: 0.6 internal pixels (metres per pixel per metre = 2 tan(fov / 2) / height)
    if (thinOn) wireHalfPx.value = 0.6 * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (camera.zoom || 1) / inH;
    // the dithered fades / cross-fades: a new noise phase each frame, resolved by the history (Jimenez's IGN offset)
    const f = U._frame % 16;
    ditherFrame.value.set(5.588238 * f, 5.588238 * f);
    U._frame++;
  };
  /** after the post chain */
  U.end = () => { if (U.taau) camera.clearViewOffset(); };

  /** one frame interval (ms, main.js loop): the dynamic resolution only lowers the scale when frames are MISSED */
  U.frames = [];
  U.frameSample = (ms) => { if (ms > 0 && ms < 500) { U.frames.push(ms); if (U.frames.length > 240) U.frames.splice(0, 120); } };
  /** one GPU frame time (ms, main.js sampleGpu) -> the dynamic resolution */
  U.gpuSample = (ms) => {
    if (SHARP_DR) return gpuSampleSharp(ms);
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
  // SHARP rule: GPU p75 over the target AND frames late (> 20 ms intervals in > 10 % of the window, or the GPU p75 past
  // 16 ms itself) -> down at most 0.05 per change, never under the preset's soft floor unless frames are missed there
  // for 3 s at > 1.25 x the target; up 0.025 after 2 s calm. Changes >= 1 s apart: small steps the TAAU absorbs.
  function gpuSampleSharp(ms) {
    if (!(ms > 0) || ms > 200) return;
    const now = performance.now();
    U.win.push(ms);
    if (!U.dynres || !U.taau) return;
    const P = U.preset;
    if (P.min >= P.max) return;
    if (U.win.length < 30 || now - U.lastChange < 1000) return;
    const s = [...U.win].sort((a, b) => a - b), p75 = s[Math.floor(s.length * 0.75)];
    const F = U.frames, miss = F.length >= 20 ? F.filter((x) => x > 20).length / F.length : 1;
    U.lastMiss = miss; U.lastP75 = p75;
    const T = U.targetMs, soft = Math.max(P.min, P.soft ?? P.min);
    const late = miss > 0.1 || p75 > 16;
    if (p75 > T * 1.04 && late && U.scale > P.min + 1e-6) {
      let floor = soft;
      if (U.scale <= soft + 1e-6) {
        if (!(p75 > T * 1.25 && miss > 0.25 && now - U.lastChange > 3000)) return;
        floor = P.min;
      }
      const want = U.scale * Math.sqrt((T * 0.94) / p75);
      setDyn(clamp(Math.max(want, U.scale - 0.05), floor, P.max), p75, now);
      U.frames.length = 0;
      return;
    }
    const calm = p75 < T * 0.8 || (U.scale < soft - 1e-6 && p75 < T * 0.95 && miss < 0.03);
    if (calm && U.scale < P.max - 1e-6) {
      if (!U.calmSince) U.calmSince = now;
      const up = Math.min(P.max, U.scale + 0.025);
      const predicted = p75 * (up * up) / (U.scale * U.scale);
      if (now - U.calmSince > 2000 && (predicted < T * 0.92 || U.scale < soft - 1e-6)) { setDyn(up, p75, now); U.frames.length = 0; }
    } else U.calmSince = 0;
    if (U.win.length > 180) U.win.splice(0, U.win.length - 90);
  }
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
    rule: SHARP_DR ? "sharp" : "old", softFloor: U.preset.soft ?? U.preset.min, missShare: U.lastMiss ?? null, rcas: SHARP_RCAS,
  });
  /** the HUD stats line: "render 0.80 auto" */
  U.hudLine = () => `render ${U.scale.toFixed(2)}${U.dynres ? " " + U.quality : " fixed"}`;

  applyScale(fixed ?? U.preset.start);
  U.uSharp.value = sharp0 ?? sharpFor(U.scale);
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
