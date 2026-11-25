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
import * as THREE from "three/webgpu";
import { texture, uv } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { loadFalconAssets } from "../falcons.js";
import { BirdRig } from "../birdRig.js";
import { birdRoll, rigBank } from "./gymFlight.js";

const _I = new THREE.Quaternion();
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const M2M = new URL("../../models/bird/v2/m2m/", import.meta.url);
const V2 = new URL("../../models/bird/v2/falcon_v2.glb", import.meta.url);
const V2_JUV = new URL("../../models/bird/v2/falcon_v2_juvenile.ktx2", import.meta.url);
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
  static async create(which = "current", span = 1.05, renderer = null, plumage = "juvenile") {
    const [A, M] = await Promise.all([loadFalconAssets(), loadM2MClips()]);
    if (which === "v2") {
      // (tools/falconV2pack.mjs: EXT_meshopt_compression + KTX2 textures)
      if (!ktx) { ktx = new KTX2Loader().setTranscoderPath(TRANSCODER); if (renderer) ktx.detectSupport(renderer); }
      const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx).loadAsync(V2.href);
      // the juvenile plumage: its own KTX2, the adult's sampler and colour space (missing file: the adult only)
      const juv = await ktx.loadAsync(V2_JUV.href).catch(() => null);
      // rotations only (+ v2's own root translation): the Mesh2Motion clips' translations were in its own units
      const b = new GymBird({ scene: g.scene, clips: g.animations.map((c) => rotOnly(c, c.name, true)), v2: true }, M, span, A);
      b.plumages = { adult: b.mesh.material.map, juvenile: juv };
      if (juv) { const m = b.plumages.adult; juv.colorSpace = THREE.SRGBColorSpace; juv.flipY = m.flipY; juv.wrapS = m.wrapS; juv.wrapT = m.wrapT; juv.channel = m.channel; }
      b.setPlumage(plumage);
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
    let mesh = null; model.traverse((o) => { if (o.isSkinnedMesh) { mesh ??= o; o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } if (o.isMesh && !o.isSkinnedMesh) o.visible = false; });
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
    this.rig = new BirdRig(this.root);
    this.rig.addLayer("spreadL", "wing_1_L", "wing_tip_L", [-1, 0, 0]); this.rig.addLayer("spreadR", "wing_1_R", "wing_tip_R", [1, 0, 0]);
    this.rig.addLayer("handL", "wing_3_L", "wing_tip_L", [0.3, 0, 1]); this.rig.addLayer("handR", "wing_3_R", "wing_tip_R", [-0.3, 0, 1]);
    this.rig.addLayer("wristL", "wing_2_L", "wing_tip_L", [0.4, -0.3, 0.6]); this.rig.addLayer("wristR", "wing_2_R", "wing_tip_R", [-0.4, -0.3, 0.6]);
    this.rig.addLayer("raiseL", "wing_1_L", "wing_tip_L", [0, 1, 0]); this.rig.addLayer("raiseR", "wing_1_R", "wing_tip_R", [0, 1, 0]);
    this.rig.addLayer("talonL", "UpperLeg_L", "Toes_tip_L", [0, -0.4, -1]); this.rig.addLayer("talonR", "UpperLeg_R", "Toes_tip_R", [0, -0.4, -1]);
    this.rig.addLayer("headDown", "head", "mouth_upper_tip", [0, -1, 0]);
    // (v2) the tail's own feather bones (tail_fan_*, tools/blender/falconV2.py "the tail closes"): every clip keys their
    // fold; the flare / brake layer opens the fan on top (the bind is the full fan: identity). The mixer rewrites them
    // each frame, so nothing accumulates
    this.fan = []; model.traverse((o) => { if (o.isBone && o.name.startsWith("tail_fan_")) this.fan.push(o); });
    this.lay = { fold: 0, tuck: 0, flare: 0, talons: 0, bank: 0, legs: 0.4, head: 0, pitch: 0 };
    this.extra = { spreadL: 0, spreadR: 0, handL: 0, handR: 0, wristL: 0, wristR: 0, raiseL: 0, raiseR: 0, talonL: 0, talonR: 0, headDown: 0 };
    this.tw = Object.fromEntries(KEYS.map((k) => [k, 0]));
    this.lastFlapPhase = 0; this.downstroke = false; this.prevMode = "perch";
    this.prey = null; this.forceClip = null;       // the panel's clip preview: one clip at weight 1
    this.setSpan(span);
  }

  /** "juvenile" (the player) | "adult" (the church family): v2 only */
  setPlumage(name) {
    const t = this.plumages?.[name];
    if (!t || this.mesh.material.map === t) return;
    this.mesh.material.map = t; this.mesh.material.needsUpdate = true; this.plumage = name;
  }
  setSpan(span) { this.span = span; this.model.scale.setScalar(span / this.modelSpan); }
  carry(preyMesh, material) {
    if (this.prey || !preyMesh) return;
    const p = preyMesh.clone(); if (material) p.material = material;
    const k = this.span / 1.10;
    p.position.set(0, -0.13 * k, 0.04 * k); p.rotation.set(0.15, Math.PI, 0); p.scale.setScalar(0.95 * k);
    this.root.add(p); this.prey = p;
  }
  drop() { if (!this.prey) return null; const p = this.prey; this.prey = null; p.removeFromParent(); return p; }

  /** f: { heading, gamma, alpha, phi, fold, flapLevel, brake, V, walkV? }; mode: fly | land | perch | walk | hop | launch */
  pose(dt, pos, f, { mode = "fly", talons = 0, perchYaw = 0, look = 0, wdt = dt } = {}) {
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
    if (mode === "fly" && this.actions.stoop && !this.forceClip) { const k = Math.max(0, (f.fold - 0.5) / 0.5); T.stoop = k; T.flap *= 1 - k; T.glide *= 1 - k; }
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
    this.actions.flap.timeScale = 0.9 + 1.0 * f.flapLevel + (mode === "land" || mode === "launch" ? 0.7 : 0);
    if (this.actions.walk) this.actions.walk.timeScale = mode === "hop" ? 1.8 : Math.max(0.4, Math.abs(f.walkV ?? 1) * 1.1);
    const ph = this.actions.flap.time / this.flapDur;
    this.downstroke = this.w.flap > 0.3 && ph < this.lastFlapPhase;
    this.lastFlapPhase = ph;
    // the layers
    const air = mode === "fly";
    const tuck = air ? Math.max(0, (f.fold - 0.5) / 0.5) : 0;
    L.fold = ease(L.fold, air ? Math.min(1, f.fold * 1.6) * (this.actions.stoop ? 0.3 : 1) : 0, 9, wdt);
    L.tuck = ease(L.tuck, tuck, 8, wdt);
    L.flare = ease(L.flare, mode === "land" ? 1 : air ? f.brake : 0, 6, wdt);
    L.talons = ease(L.talons, talons, 10, wdt);
    L.bank = ease(L.bank, air ? rigBank(f.phi) : 0, 6, wdt);
    L.legs = ease(L.legs, air && !talons ? 0.5 * (1 - L.flare) : 0, 4, wdt);
    L.head = ease(L.head, air ? Math.max(0, -f.gamma) * 0.5 + look : look, 4, wdt);
    const E = this.extra;
    const tk = this.actions.stoop ? 0.15 * L.tuck : L.tuck;     // (v2: the clip folds the wings)
    E.handL = E.handR = 0.9 * tk; E.wristL = E.wristR = 0.45 * tk;
    E.spreadL = E.spreadR = 0.15 * L.flare - 0.1 * L.tuck;
    E.raiseL = E.raiseR = 0.35 * L.flare;
    E.talonL = E.talonR = 1.1 * Math.max(L.talons, L.flare * 0.8);
    E.headDown = L.head;
    this.rig.restore();
    this.mixer.update(dt);
    if (L.flare > 1e-3) for (const b of this.fan) b.quaternion.slerp(_I, L.flare);
    this.rig.apply({ fold: L.fold, bank: L.bank, legs: L.legs, brake: L.flare, extra: E });
  }
}
