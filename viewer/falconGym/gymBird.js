// THE GYM'S FALCON (labs/falcon-gym.html): the player's falcon of viewer/falconFlight/falconBird.js (the same rig, the
// juvenile plumage, the procedural layers of viewer/birdRig.js) with the ground and take-off clips the gym needs:
//   current   models/bird/peregrine.glb (Flap, Glide, Idle, Walk + the baked Perch of viewer/falcons.js) and the
//             Mesh2Motion bird clips Take_Off, Land, Hop (models/bird/v2/m2m/, CC0: the SAME 55-bone bird rig as
//             peregrine.glb, so they play on it as they are; quaternion tracks only, the bone lengths stay ours)
//   v2        models/bird/v2/falcon_v2.glb (tools/blender/falconV2.py: the Sketchfab peregrine re-rigged onto that rig,
//             with our own Stoop / Talons / Flare / Perch / TakeOff / Hop clips) when it exists; it wears the juvenile
//             plumage (falcon_v2_juvenile.ktx2: the player is the young of the year) or the adult (the glb's own)
// Modes: fly | land | perch (= standing) | walk | hop | launch. One mixer, the clip weights eased (sum 1), then the
// layers (fold, tuck, flare, talons, bank) as falconBird.js. No per-frame allocation.
// IN THE CITY GAME (the default since 2026-11-27, ?falconmodel=current = the old bird; viewer/falconFlight/cityFlyer.js;
// rule falcon-gym "the v2 in the city"): the
// player's bird with falconBird.js's catch: the caught bird held in the talons (heldPrey.js, the same carry / grip /
// holdPrey / gripCheck, on v2's own foot bones: its rig keeps our names Toes_L / Toes_tip_L ...; the grip layers gripL /
// gripR calibrated in the Glide as the others), the strike pose from v2's Talons clip (pose's `strike`), the far LOD.
import * as THREE from "three/webgpu";
import { texture, uv } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { loadFalconAssets } from "../falcons.js";
import { BirdRig } from "../birdRig.js";
import { birdRoll, rigBank, V2_WALK_MPS } from "./gymFlight.js";
import { FalconBird, GRIP } from "../falconFlight/falconBird.js";
import { HeldPrey, loadHeldPigeon } from "../falconFlight/heldPrey.js";

const _I = new THREE.Quaternion();
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const M2M = new URL("../../models/bird/v2/m2m/", import.meta.url);
// (?v2src=<url>: another build of the v2 to look at in the lab, e.g. a candidate before it replaces the shipped one)
const QS = new URLSearchParams(globalThis.location?.search || "");
const V2 = QS.get("v2src") ? new URL(QS.get("v2src"), globalThis.location.href) : new URL("../../models/bird/v2/falcon_v2.glb", import.meta.url);
const V2_FAR = new URL(V2.pathname.replace(/\.glb$/, "_far.glb"), V2);
// THE FAR LOD (v2, tools/falconV2far.mjs: ~2.5k triangles, the same rig, clips, UVs and materials, no textures of its
// own): each of its meshes is bound to the near bird's skeleton and wears the near mesh's material of the same name, so
// one mixer drives both and the plumage switch changes both. The switch is by the drawn wingspan on screen, with hysteresis, where the bird is small: the far one
// below LOD_FAR_PX, the near one again above LOD_NEAR_PX (no flicker at the threshold)
export const LOD_FAR_PX = 56, LOD_NEAR_PX = 68;
/** the carry on v2 (rule falcon-gym "the v2 in the city"): the legs let down (rad at the hip, half at the knee) */
export const CARRY = { hip: 0, knee: 0, tail: 0.5, stoop: 0.3, pitch: 0.3, fwd: 0.01 };
const _lp = new THREE.Vector3();
const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
let ktx = null;
const KEYS = ["perch", "flap", "glide", "walk", "hop", "takeoff", "land", "stoop", "talons", "flare"];   // (talons, flare: v2 only, the orbit view's clip picker)

function applyBodyScale(root) {
  const S = (n, k) => { const b = root.getObjectByName(n); if (b) b.scale.multiplyScalar(k); };
  S("hips", 1.3); S("wing_1_L", 1 / 1.3); S("wing_1_R", 1 / 1.3); S("tail_1", 1.12);
}
/** quaternion tracks only (the clip's rotations on our bone lengths), named as the rig; keepRoot: v2's own root
 *  translation too (its Perch lowers the upright body onto the feet, its ground clips put the feet on the floor) */
function rotOnly(clip, name, keepRoot = false) {
  const c = new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => t.name.endsWith(".quaternion") || (keepRoot && t.name === "root.position")));
  return c;
}
let m2mP = null;
export function loadM2MClips() {
  return (m2mP ??= (async () => {
    const L = new GLTFLoader();
    const get = async (f, n) => { try { const g = await L.loadAsync(new URL(f, M2M).href); return rotOnly(g.animations[0], n); } catch { return null; } };
    const [takeoff, land, hop] = await Promise.all([get("take-off.glb", "TakeOff"), get("land.glb", "Land"), get("hop.glb", "Hop")]);
    return { takeoff, land, hop };
  })());
}
export async function v2Exists() { try { const r = await fetch(V2, { method: "HEAD" }); return r.ok; } catch { return false; } }

export class GymBird {
  /** which: "current" | "v2" */
  /** opts.ktx2: a KTX2 loader to use (node tests: a stub) */
  static async create(which = "current", span = 1.05, renderer = null, plumage = "juvenile", opts = {}) {
    const [A, M] = await Promise.all([loadFalconAssets(), loadM2MClips(), loadHeldPigeon()]);
    if (which === "v2") {
      // (tools/falconV2pack.mjs: EXT_meshopt_compression + KTX2 textures)
      if (opts.ktx2) ktx = opts.ktx2;
      // (the page's ONE KTX2 loader, viewer/materials/scans.js: a second one warned "multiple active KTX2 loaders")
      if (!ktx && renderer) { try { ktx = (await import("../materials/scans.js")).ktxLoader(renderer); } catch { /* the lab without the city's materials */ } }
      if (!ktx) { ktx = new KTX2Loader().setTranscoderPath(TRANSCODER); if (renderer) ktx.detectSupport(renderer); }
      const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx);
      const [g, gFar] = await Promise.all([L.loadAsync(V2.href), L.loadAsync(V2_FAR.href).catch(() => null)]);
      // rotations only (+ v2's own root translation)
      const b = new GymBird({ scene: g.scene, clips: g.animations.map((c) => rotOnly(c, c.name, true)), v2: true }, M, span, A);
      // the plumages: the adult = the glb's own base colours; the juvenile = the KTX2 files beside it, one a painted
      // material (asset.extras.variants: { juvenile*: { file, material } }), the adult's sampler and colour space
      const adult = new Map(b.meshes.map((m) => [m.material.name, m.material.map])), juvenile = new Map();
      for (const [k, v] of Object.entries(g.asset?.extras?.variants || {})) {
        if (!k.startsWith("juvenile")) continue;
        const t = await ktx.loadAsync(new URL(v.file, V2).href).catch(() => null), m = adult.get(v.material ?? b.mesh.material.name);
        if (!t || !m) continue;
        t.colorSpace = THREE.SRGBColorSpace; t.flipY = m.flipY; t.wrapS = m.wrapS; t.wrapT = m.wrapT; t.channel = m.channel;
        juvenile.set(v.material ?? b.mesh.material.name, t);
      }
      b.plumages = { adult, juvenile: juvenile.size ? juvenile : null };
      b.setPlumage(plumage);
      if (gFar) b.attachFar(gFar);
      return b;
    }
    return new GymBird({ scene: A.bird.scene, clips: A.clips, v2: false }, M, span, A);
  }
  constructor(src, M, span, A) {
    this.which = src.v2 ? "v2" : "current";
    this.root = new THREE.Group(); this.root.name = `gym-falcon-${this.which}`;
    const model = cloneSkinned(src.scene);
    model.rotation.y = Math.PI;                        // nose +z in the model, -z for the root
    this.model = model;
    let mesh = null; const meshes = [];
    model.traverse((o) => { if (o.isSkinnedMesh) { mesh ??= o; meshes.push(o); o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } if (o.isMesh && !o.isSkinnedMesh) o.visible = false; });
    this.meshes = meshes;                              // (v2 base B: the body, the eyes, the flight feathers)
    // (round 5 perf: the eyes, 576 triangles inside the head, cast no shadow: one shadow draw less)
    for (const m of meshes) if (/eye/i.test(m.material?.name || "")) m.castShadow = false;
    if (!src.v2) {
      const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.78, metalness: 0 });
      mat.colorNode = texture(A.juvTex, uv()).rgb;
      mesh.material = mat; mesh.geometry = A.geo0;
      applyBodyScale(model);
    }
    this.mesh = mesh;
    this.root.add(model);
    // the wingspan in model units (the rest pose's wing tips), for setSpan
    model.updateMatrixWorld(true);
    const tl = model.getObjectByName("wing_tip_L"), tr = model.getObjectByName("wing_tip_R");
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.modelSpan = tl && tr ? tl.getWorldPosition(a).distanceTo(tr.getWorldPosition(b)) : 6.44;
    this.mixer = new THREE.AnimationMixer(model);
    // (v2 carries every clip on its own rest pose: never mix in peregrine.glb's or the runtime Mesh2Motion ones)
    const find = (...names) => { for (const n of names) { const c = src.clips.find((x) => x.name === n) || (src.v2 ? null : A?.clips.find((x) => x.name === n)); if (c) return c; } return null; };
    const clips = {
      perch: find("Perch", "Idle"), flap: find("Flap"), glide: find("Glide"), walk: find("Walk"),
      stoop: src.v2 ? find("Stoop") : null, talons: src.v2 ? find("Talons") : null, flare: src.v2 ? find("Flare") : null,
      hop: find("Hop") || (src.v2 ? null : M.hop), takeoff: find("TakeOff", "Take_Off") || (src.v2 ? null : M.takeoff), land: find("Land") || (src.v2 ? null : M.land),
    };
    this.clips = clips;
    this.actions = {}; this.w = {};
    for (const k of KEYS) {
      if (!clips[k]) continue;
      const act = this.mixer.clipAction(clips[k]);
      if (k === "takeoff" || k === "land") { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }
      act.play(); act.setEffectiveWeight(0); this.actions[k] = act; this.w[k] = k === "glide" ? 1 : 0;
    }
    this.flapDur = clips.flap.duration;
    if (src.v2 && this.actions.glide) {
      // (v2's bind is the perched idle, its wings folded: the span is the glide's, tip to tip)
      this.actions.glide.setEffectiveWeight(1); this.mixer.update(0); model.updateMatrixWorld(true);
      const d = tl && tr ? tl.getWorldPosition(a).distanceTo(tr.getWorldPosition(b)) : 0;
      if (d > 0.5 * this.modelSpan) this.modelSpan = d / model.scale.x;
      // (and the rig's layers below are calibrated in this spread pose: BirdRig finds each layer's axis by turning a
      // bone and watching its tip, and on the folded bind a "fold" or "tuck" found the wrong way: the stoop's wing rose)
    }
    this.rig = new BirdRig(this.root);
    this.rig.addLayer("spreadL", "wing_1_L", "wing_tip_L", [-1, 0, 0]); this.rig.addLayer("spreadR", "wing_1_R", "wing_tip_R", [1, 0, 0]);
    this.rig.addLayer("handL", "wing_3_L", "wing_tip_L", [0.3, 0, 1]); this.rig.addLayer("handR", "wing_3_R", "wing_tip_R", [-0.3, 0, 1]);
    this.rig.addLayer("wristL", "wing_2_L", "wing_tip_L", [0.4, -0.3, 0.6]); this.rig.addLayer("wristR", "wing_2_R", "wing_tip_R", [-0.4, -0.3, 0.6]);
    this.rig.addLayer("raiseL", "wing_1_L", "wing_tip_L", [0, 1, 0]); this.rig.addLayer("raiseR", "wing_1_R", "wing_tip_R", [0, 1, 0]);
    this.rig.addLayer("talonL", "UpperLeg_L", "Toes_tip_L", [0, -0.4, -1]); this.rig.addLayer("talonR", "UpperLeg_R", "Toes_tip_R", [0, -0.4, -1]);
    this.rig.addLayer("headDown", "head", "mouth_upper_tip", [0, -1, 0]);
    // (the city's catch, falconBird.js: the toes closed round the held bird)
    this.rig.addLayer("gripL", "Toes_L", "Toes_tip_L", [0, -1, 0.5]); this.rig.addLayer("gripR", "Toes_R", "Toes_tip_R", [0, -1, 0.5]);
    // (the carry: the legs let DOWN under the body with the bird in the feet; v2 flies with its feet tucked up to the
    // tail's coverts, so a held pigeon went into its tail: node check, tools/falconCityTest.mjs)
    this.rig.addLayer("carryL", "UpperLeg_L", "Toes_tip_L", [0, -1, 0.2]); this.rig.addLayer("carryR", "UpperLeg_R", "Toes_tip_R", [0, -1, 0.2]);
    this.rig.addLayer("carryKL", "LowerLeg_L", "Toes_tip_L", [0, -1, 0.2]); this.rig.addLayer("carryKR", "LowerLeg_R", "Toes_tip_R", [0, -1, 0.2]);
    this.rig.addLayer("carryT", "tail_1", "tail_tip", [0, 1, 0]);
    if (src.v2 && this.actions.glide) this.actions.glide.setEffectiveWeight(0);
    // (v2) the tail's own feather bones (tail_fan_*, tools/blender/falconV2.py "the tail closes"): every clip keys their
    // fold; the flare / brake layer opens the fan on top (the bind is the full fan: identity). The mixer rewrites them
    // each frame, so nothing accumulates
    this.fan = []; model.traverse((o) => { if (o.isBone && o.name.startsWith("tail_fan_")) this.fan.push(o); });
    // (the open fan: the Flare clip's first key for each; the bind's otherwise)
    this.fanOpen = this.fan.map((bn) => { const t = clips.flare?.tracks.find((k) => k.name === `${bn.name}.quaternion`); return t ? new THREE.Quaternion().fromArray(t.values, 0) : bn.quaternion.clone(); });
    this.lay = { fold: 0, tuck: 0, flare: 0, talons: 0, strike: 0, bank: 0, legs: 0.4, head: 0, pitch: 0 };
    this.extra = { spreadL: 0, spreadR: 0, handL: 0, handR: 0, wristL: 0, wristR: 0, raiseL: 0, raiseR: 0, talonL: 0, talonR: 0, headDown: 0, gripL: 0, gripR: 0, carryL: 0, carryR: 0, carryKL: 0, carryKR: 0, carryT: 0 };
    this.carryPose = { ...CARRY }; this.lay.carry = 0;
    // (v2's hold, falconBird.js holdPrey: the held bird a little nose-UP and 1 % of the span forward, clear of the vent)
    if (src.v2) { this.gripQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(CARRY.pitch, 0, Math.PI, "YXZ")); this.gripFwd = CARRY.fwd; }
    this.tw = Object.fromEntries(KEYS.map((k) => [k, 0]));
    this.lastFlapPhase = 0; this.downstroke = false; this.prevMode = "perch";
    this.prey = null; this.forceClip = null;       // the panel's clip preview: one clip at weight 1
    // (the city's catch: falconBird.js's toes, the held bird's pooled mesh; the ground clips the game can ask for)
    const Bn = (n) => this.model.getObjectByName(n);
    this.toes = Bn("Toes_L") && Bn("Toes_R") && Bn("Toes_tip_L") && Bn("Toes_tip_R") ? { l: Bn("Toes_L"), r: Bn("Toes_R"), lt: Bn("Toes_tip_L"), rt: Bn("Toes_tip_R") } : null;
    this.held = new HeldPrey(); this.root.add(this.held.mesh);
    this.groundClips = true;
    this.setSpan(span);
  }

  /** the far LOD's mesh on this bird's skeleton and material (v2: the same 65 joints in the same order) */
  attachFar(g) {
    const far = [];
    g.scene.traverse((o) => { if (o.isSkinnedMesh) far.push(o); });
    const near = this.mesh, byMat = new Map(this.meshes.map((m) => [m.material.name, m]));
    if (!far.length || far.some((f) => f.skeleton.bones.length !== near.skeleton.bones.length || f.skeleton.bones.some((b, i) => b.name !== near.skeleton.bones[i].name))) return;
    this.far = [];
    for (const src of far) {
      const nm = byMat.get(src.material.name) || near;
      const m = new THREE.SkinnedMesh(src.geometry, nm.material);
      m.name = `${nm.name}-far`; m.position.copy(nm.position); m.quaternion.copy(nm.quaternion); m.scale.copy(nm.scale);
      // (round 5 perf: the far LOD draws only under 56 px: its shadow is a few pixels, none cast)
      m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; m.visible = false;
      nm.parent.add(m); m.updateMatrixWorld(true); m.bind(near.skeleton, nm.bindMatrix);
      this.far.push(m);
    }
    this.lod = "near"; this.lodMode = "auto";
    const tri = (ms) => ms.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count / 3 : 0), 0);
    this.lodTris = { near: tri(this.meshes), far: tri(this.far) };
  }
  /** the LOD by the drawn span on screen (px): call once a frame after pose(). mode: "auto" | "near" | "far" */
  updateLod(camera, viewH) {
    if (!this.far) return this.lod = "near";
    this.root.getWorldPosition(_lp);
    const d = Math.max(camera.position.distanceTo(_lp), 1e-3), px = (this.span / (2 * d * Math.tan((camera.fov * Math.PI) / 360))) * viewH;
    this.lodPx = px;
    const want = this.lodMode === "near" ? "near" : this.lodMode === "far" ? "far" : this.lod === "near" ? (px < LOD_FAR_PX ? "far" : "near") : (px > LOD_NEAR_PX ? "near" : "far");
    if (want !== this.lod) { this.lod = want; for (const m of this.meshes) m.visible = want === "near"; for (const m of this.far) m.visible = want === "far"; }
    return this.lod;
  }
  /** "juvenile" (the player) | "adult" (the church family): v2 only; each mesh's base colour from that plumage's map */
  setPlumage(name) {
    const P = this.plumages?.[name];
    if (!P) return;
    for (const m of this.meshes) {
      const t = P.get(m.material.name) || this.plumages.adult.get(m.material.name);
      if (t && m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; }
    }
    this.plumage = name;
  }
  setSpan(span) { this.span = span; this.model.scale.setScalar(span / this.modelSpan); }
  // carry (preyMesh, material, from, look) / drop / gripPoint / holdPrey / gripCheck: falconBird.js's (below the class)

  /** f: { heading, gamma, alpha, phi, fold, flapLevel, brake, V, walkV? }; mode: fly | land | perch | walk | hop | launch */
  /** strike: v2's Talons clip weight (the city game: the last metres of a strike and the catch); omitted = the talons */
  pose(dt, pos, f, { mode = "fly", talons = 0, strike = null, perchYaw = 0, look = 0, wdt = dt } = {}) {
    this.root.position.copy(pos);
    const L = this.lay;
    // the body's pitch: the path + the angle of attack in the air, upright in the launch, level on the ground
    const pitchT = mode === "fly" || mode === "land" ? f.gamma + f.alpha * 0.8 : mode === "launch" ? 0.95 : 0;
    L.pitch = ease(L.pitch, pitchT, mode === "fly" ? 30 : 8, wdt);
    const yaw = mode === "perch" ? perchYaw : f.heading;
    this.root.rotation.set(L.pitch, yaw, mode === "fly" || mode === "land" ? birdRoll(f.phi) : 0, "YXZ");   // (phi > 0 = right wing down)
    // the clip weights
    const T = this.tw; for (const k of KEYS) T[k] = 0;
    const flapping = f.flapLevel > 0.08;
    if (this.forceClip && this.actions[this.forceClip]) T[this.forceClip] = 1;
    else if (mode === "perch") T.perch = 1;
    else if (mode === "walk") T.walk = 1;
    else if (mode === "hop") { if (this.actions.hop) T.hop = 1; else T.walk = 1; }
    else if (mode === "launch") { if (this.actions.takeoff) { T.takeoff = 0.5; T.flap = 0.5; } else T.flap = 1; }
    else if (mode === "land") { if (this.actions.land) { T.land = 0.6; T.flap = 0.4; } else { T.perch = 0.25; T.flap = 0.55; T.glide = 0.2; } }
    else if (flapping) T.flap = 1; else T.glide = 1;
    // (v2) its own Stoop clip (the Mesh2Motion folded wings in flight) takes over with the tuck
    // (with a bird in the feet the Stoop clip only a third: its folded wings and tucked feet closed round the held bird,
    // node check tools/falconCityTest.mjs; the fold layers do the rest)
    if (mode === "fly" && this.actions.stoop && !this.forceClip) { const k = Math.max(0, (f.fold - 0.5) / 0.5) * (this.prey ? CARRY.stoop : 1); T.stoop = k; T.flap *= 1 - k; T.glide *= 1 - k; }
    // (v2) its Talons clip, the strike (legs thrown forward, wings up and back, tail fanned), takes over with the talons
    L.strike = ease(L.strike, strike ?? talons, 10, wdt);
    if (mode === "fly" && this.actions.talons && !this.forceClip && L.strike > 0.01) { const k = L.strike; for (const c of KEYS) T[c] *= 1 - k; T.talons = k; }
    // the one-shot clips restart when their mode begins
    if (mode !== this.prevMode) {
      if (mode === "launch" && this.actions.takeoff) this.actions.takeoff.reset().play();
      if (mode === "land" && this.actions.land) this.actions.land.reset().play();
      this.prevMode = mode;
    }
    let sum = 0;
    const rate = mode === "perch" || mode === "walk" ? 6 : 7;
    for (const k in this.w) { this.w[k] = ease(this.w[k], T[k], rate, wdt); sum += this.w[k]; }   // (wdt: the orbit view eases even while paused)
    for (const k in this.w) this.actions[k].setEffectiveWeight(this.w[k] / Math.max(sum, 1e-4));
    // (v2: its Stoop clip folds the wings itself, so the fold / tuck / spread layers fade out with that clip's weight:
    // on top of the folded clip they folded a second time and stood the wing up above the back)
    const unfolded = this.actions.stoop ? 1 - (this.w.stoop || 0) / Math.max(sum, 1e-4) : 1;
    // (v2: its Stoop and Talons clips set the legs themselves (tucked under the tail / thrown forward), so the legs and
    // talon layers fade out with those clips' weights: on top of the Stoop clip the legs layer swung the feet out behind)
    const ownLegs = this.actions.stoop ? 1 - ((this.w.stoop || 0) + (this.w.talons || 0)) / Math.max(sum, 1e-4) : 1;
    this.actions.flap.timeScale = 0.9 + 1.0 * f.flapLevel + (mode === "land" || mode === "launch" ? 0.7 : 0);
    // (v2's Walk plants its feet at V2_WALK_MPS (tools/blender/falconV2.py WALK_*: 0.12 m stance sweep, 60 % stance,
    // 10 frames): played at the ground speed's rate, capped, so a fast walk does not turn into a blur of steps)
    if (this.actions.walk) this.actions.walk.timeScale = mode === "hop" ? 1.8 : this.which === "v2" ? Math.min(2.5, Math.max(0.4, Math.abs(f.walkV ?? 1) / V2_WALK_MPS)) : Math.max(0.4, Math.abs(f.walkV ?? 1) * 1.1);
    const ph = this.actions.flap.time / this.flapDur;
    this.downstroke = this.w.flap > 0.3 && ph < this.lastFlapPhase;
    this.lastFlapPhase = ph;
    // the layers
    const air = mode === "fly";
    const tuck = air ? Math.max(0, (f.fold - 0.5) / 0.5) : 0;
    L.fold = ease(L.fold, air ? Math.min(1, f.fold * 1.6) * (this.actions.stoop ? 0.3 * unfolded : 1) : 0, 9, wdt);
    L.tuck = ease(L.tuck, tuck, 8, wdt);
    L.flare = ease(L.flare, mode === "land" ? 1 : air ? f.brake : 0, 6, wdt);
    L.talons = ease(L.talons, talons, 10, wdt);
    L.bank = ease(L.bank, air ? rigBank(f.phi) : 0, 6, wdt);
    L.legs = ease(L.legs, air && !talons ? 0.5 * (1 - L.flare) * ownLegs : 0, 4, wdt);
    L.head = ease(L.head, air ? Math.max(0, -f.gamma) * 0.5 + look : look, 4, wdt);
    const E = this.extra;
    const tk = this.actions.stoop ? 0.15 * L.tuck * unfolded : L.tuck;     // (v2: the clip folds the wings)
    E.handL = E.handR = 0.9 * tk; E.wristL = E.wristR = 0.45 * tk;
    E.spreadL = E.spreadR = 0.15 * L.flare - 0.1 * L.tuck * unfolded;
    E.raiseL = E.raiseR = 0.35 * L.flare;
    E.talonL = E.talonR = 1.1 * Math.max(L.talons, L.flare * 0.8) * ownLegs;
    E.headDown = L.head;
    // (the city's catch: the toes close round the held bird as it reaches them, falconBird.js)
    const H = this.prey && this.hold ? this.hold : null;
    E.gripL = E.gripR = H ? GRIP.curl * H.k * H.k * (1 - 0.4 * H.perch) : 0;
    L.carry = ease(L.carry, H && (mode === "fly" || mode === "land") ? 1 : 0, 6, wdt);
    const CP = this.carryPose;
    E.carryL = E.carryR = CP.hip * L.carry; E.carryKL = E.carryKR = CP.knee * L.carry; E.carryT = CP.tail * L.carry;
    this.rig.restore();
    this.mixer.update(dt);
    if (L.flare > 1e-3) for (let i = 0; i < this.fan.length; i++) this.fan[i].quaternion.slerp(this.fanOpen[i], L.flare);
    this.rig.apply({ fold: L.fold, bank: L.bank, legs: L.legs, brake: L.flare, extra: E });
    // (the landing's second half: the held bird is laid at the feet already, the Land clip's upright touchdown sits on it)
    const la = this.actions.land, laid = mode === "land" && la && la.time > 0.2 * la.getClip().duration;
    if (H && this.toes) this.holdPrey(dt, mode === "walk" || mode === "hop" || laid ? "perch" : mode);
  }
}
// the city's catch on v2: falconBird.js's own (they read root, span, toes, held, prey, hold; rule falcon-gym "the v2 in
// the city": one grip for both birds)
for (const k of ["carry", "drop", "gripPoint", "holdPrey", "gripCheck", "bodyLength"]) GymBird.prototype[k] = FalconBird.prototype[k];
