// THE SAINT-JOB FALCONS: a peregrine family alive at the church. The eyrie (models/falcons/nest.glb, built by
// tools/blender/falconNest.py: a gravel tray on the belfry floor behind the louvred arch whose lowest boards are out),
// three downy eyases in the scrape, and the two adults, the female (falcon) and the smaller male (tiercel), each run
// by a small behaviour state machine: perched on the spire cross, the clock-gable cross, the louvre ledges; circling
// on thermals over Saint-Job; hunting stoops; carrying prey home; the aerial food pass (the male calls, the female
// flies out and takes the prey from his feet upside down); landing on the ledge, hopping in and feeding the young
// while they beg.
//
// One rig for everyone: models/bird/peregrine.glb (the fly-mode bird, same clips: Idle, Flap, Glide, Walk), cloned
// (SkeletonUtils: geometry, textures and clips shared, a skeleton each); the eyases are the same rig with bone scales
// (big head, stubby wings, no tail, thick legs) and their own plumage (models/bird/eyas.jpg, same UVs). Clip weights
// are eased (never snapped) and the procedural layers of viewer/birdRig.js (wings folded in a stoop, bank, braking,
// head and beak) ride on top.
//
// Cost: animation only for birds on screen and in range, at 1/2, 1/3, 1/6 rate with distance; a 35 % LOD mesh
// beyond 70 m (dithered cross-fade, viewer/lodFade.js); faded out beyond ~650 m (smaller than a pixel); shadows
// only within 45 m; the nest drawn within 150 m (LOD beyond 30 m). Everything lives in the church's own frame
// (stjob.glb: x east, -z the front, y up from the floor at 75.40 m TAW).
//
//   const fam = await createFalcons({ church: await loadStJob(), heightAt });   scene.add(fam.group);
//   per frame: fam.update(camera)     fam.stats     fam.force("stoop" | "food" | "perch" | "circle")
import * as THREE from "three/webgpu";
import { uniform, texture, uv, attribute, vec3, float, mix } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { BirdRig } from "./birdRig.js";
import { withObjectFade } from "./lodFade.js";

const BIRD_DIR = new URL("../models/bird/", import.meta.url).href;
const NEST_DIR = new URL("../models/falcons/", import.meta.url).href;
const G = 9.81;
const MODEL_SPAN = 6.44;                         // peregrine.glb wingspan in model units (rest pose)
// wingspans (m): female 1.10, male (tiercel, about a third lighter, ~15 % smaller) 0.94; the eyases ~3 weeks old
export const FALCON_SIZES = { female: 1.10, male: 0.94, eyas: 0.70, juvenile: 1.0 };
const LOD1_AT = 70, LOD_BAND = 8;                // m: the 35 % mesh beyond, cross-faded over +-LOD_BAND
const FAR_FADE = [600, 680];                     // m: faded out (a 1 m bird is < 1.5 px there at 1080p)
const SHADOW_NEAR = 45;
const NEST_FAR = 150, NEST_LOD = 30;

// eased toward a target at a rate (1/s), frame-rate independent
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp, smooth = THREE.MathUtils.smoothstep, rand = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------------------------------------- assets (once)
let assetsP = null;
export function loadFalconAssets() {
  return (assetsP ??= (async () => {
    const loader = new GLTFLoader(), tl = new THREE.TextureLoader();
    const [bird, nest, eyasTex, juvTex] = await Promise.all([
      loader.loadAsync(BIRD_DIR + "peregrine.glb"), loader.loadAsync(NEST_DIR + "nest.glb"),
      tl.loadAsync(BIRD_DIR + "eyas.jpg"), tl.loadAsync(BIRD_DIR + "juvenile.jpg"),
    ]);
    for (const t of [eyasTex, juvTex]) { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
    await MeshoptSimplifier.ready;
    // the bird: only the skinned body (the glb also carries a stray Icosphere)
    let skinned = null;
    bird.scene.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
    for (const o of [...bird.scene.children]) if (o.isMesh && !o.isSkinnedMesh) bird.scene.remove(o);
    bird.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) o.parent?.remove(o); });
    const geo0 = skinned.geometry;
    const geo1 = lodGeometry(geo0, 0.35);
    const clips = trimClips(bird.animations, bird.scene);
    // the rig has no perched pose (its Idle / Walk are a ground pose with the wings half open): bake two static ones
    clips.push(bakePose(bird.scene, "Perch", POSES.perch), bakePose(bird.scene, "Sit", POSES.sit));
    const adultMap = skinned.material.map;
    return { bird, skinned, geo0, geo1, clips, adultMap, eyasTex, juvTex, nest };
  })());
}

/** Drop the tracks that never move AND hold the bone's rest value (the mixer then leaves the bone alone, which is the
 *  same pose): 165 tracks per clip -> the ones that animate. Scale tracks go too, so bone scales (the eyases) stay. */
function trimClips(clips, root) {
  const rest = new Map();
  root.traverse((o) => { if (o.isBone) rest.set(o.name, o); });
  return clips.map((c) => {
    const keep = c.tracks.filter((t) => {
      const [name, prop] = t.name.split(".");
      if (prop === "scale") return false;
      const v = t.values, n = t.getValueSize(), bone = rest.get(name);
      let constant = true;
      for (let i = n; i < v.length && constant; i++) if (Math.abs(v[i] - v[i % n]) > 1e-5) constant = false;
      if (!constant || !bone) return true;
      const r = prop === "quaternion" ? bone.quaternion.toArray() : prop === "position" ? bone.position.toArray() : null;
      if (!r) return true;
      let same = true;
      for (let i = 0; i < n; i++) if (Math.abs(v[i] - r[i]) > 1e-4) same = false;
      if (prop === "quaternion" && !same) { same = true; for (let i = 0; i < n; i++) if (Math.abs(v[i] + r[i]) > 1e-4) same = false; }
      return !same;
    });
    const out = new THREE.AnimationClip(c.name, c.duration, keep);
    out.userData = { tracks0: c.tracks.length };
    return out;
  });
}

/** Static poses built by aiming bones (each bone's direction to its child set in the model's frame: x = the left wing,
 *  y up, z = the nose), from the bind pose. pitch: the body raised (rad) about the hips. Directions are [x, y, z]
 *  for the LEFT side; the right side mirrors x. */
const POSES = {
  // an adult on a ledge: upright (~50 deg), wings folded along the back (arm back, forearm forward, hand back to the
  // tail tip, the trailing feathers down the flank), legs under the body, the head level
  perch: {
    pitch: 0.7,
    aims: [
      ["wing_1", "wing_2", [0.18, 0.2, -1]], ["wing_2", "wing_3", [0.2, -0.45, 0.8]], ["wing_3", "wing_4", [0.0, 0.25, -1]],
      ["wing_4", "wing_5", [-0.22, 0.25, -1]], ["wing_5", "wing_tip", [-0.35, 0.2, -1]],
      ["wing_feather_1_1", "wing_feather_1_2", [-0.5, -0.6, -0.5]], ["wing_feather_2_1", "wing_feather_2_2", [-0.5, -0.55, -0.6]],
      ["wing_feather_3_1", "wing_feather_3_2", [-0.45, -0.45, -0.75]], ["wing_feather_4_1", "wing_feather_4_2", [-0.4, -0.35, -0.85]],
      ["UpperLeg", "LowerLeg", [0.15, -0.45, 0.85]], ["LowerLeg", "AnkleLeg", [0.0, -0.75, -0.65]], ["AnkleLeg", "Foot", [0.0, -1, 0.3]],
      ["Foot", "Toes", [0, -0.2, 1]], ["Toes", "Toes_tip", [0, 0, 1]],
      ["spine_3", "head", [0, 0.6, 1]], ["head", "mouth_upper", [0, -0.05, 1]],
    ],
    feet: true,
  },
  // an eyas: sitting back on its tarsi (the "heel" on the gravel, Derby photo), the body up, stubby wings held down
  sit: {
    pitch: 0.55, eyas: true,
    aims: [
      ["wing_1", "wing_2", [0.25, -0.1, -1]], ["wing_2", "wing_3", [0.2, -0.6, 0.7]], ["wing_3", "wing_4", [0.05, 0.0, -1]],
      ["wing_4", "wing_5", [-0.1, 0.0, -1]], ["wing_5", "wing_tip", [-0.2, -0.05, -1]],
      ["wing_feather_1_1", "wing_feather_1_2", [-0.5, -0.6, -0.5]], ["wing_feather_2_1", "wing_feather_2_2", [-0.5, -0.55, -0.6]],
      ["wing_feather_3_1", "wing_feather_3_2", [-0.45, -0.45, -0.75]], ["wing_feather_4_1", "wing_feather_4_2", [-0.4, -0.35, -0.85]],
      ["UpperLeg", "LowerLeg", [0.3, -0.2, 0.95]], ["LowerLeg", "AnkleLeg", [0.05, -0.3, -1]], ["AnkleLeg", "Foot", [0.08, -0.08, 1]],
      ["Foot", "Toes", [0.12, -0.05, 1]], ["Toes", "Toes_tip", [0.15, -0.05, 1]],
      ["spine_3", "head", [0, 0.8, 0.6]], ["head", "mouth_upper", [0, -0.15, 1]],
    ],
    feet: true,
  },
};

/** The rig's body is short for its wings (body 1.9 : span 6.44 model units; a peregrine is ~0.45 : 1): the body 1.3x
 *  (hips and everything on them), the wings scaled back to their span, the tail a little longer. All kinds. */
function applyBodyScale(root) {
  const S = (n, k) => { const b = root.getObjectByName(n); if (b) b.scale.multiplyScalar(k); };
  S("hips", 1.3); S("wing_1_L", 1 / 1.3); S("wing_1_R", 1 / 1.3); S("tail_1", 1.12);
}
/** the eyas (~3 weeks): the adult rig reshaped by bone scales: a big round head, a fat downy body, stubby wings, no tail
 *  yet, big feet (the clips no longer write scale, so these stay) */
function eyasScale(root) {
  // uniform scales only (a parent's non-uniform scale shears its children); each grown bone's child gets it back
  const S = (n, k) => { const b = root.getObjectByName(n); if (b) b.scale.multiplyScalar(k); };
  S("spine_0", 1.25); S("spine_1", 1.15); S("spine_2", 1 / (1.25 * 1.15) * 0.85);   // a round body, a short neck
  S("head", 1.55); S("mouth_upper", 0.55);                                          // a big head, a small beak
  for (const s of ["L", "R"]) { S(`wing_1_${s}`, 0.36); S(`UpperLeg_${s}`, 0.95); S(`Foot_${s}`, 1.2); }
  S("tail_1", 0.3);
}

/** The perched pose for the fly-mode bird (viewer/flight.js nest start): its own model, no body rescale. */
export function perchClipFor(scene) { return bakePose(scene, "Perch", POSES.perch, false); }

function bakePose(scene0, name, spec, body = true) {
  const root = cloneSkinned(scene0);
  if (body) applyBodyScale(root);
  if (spec.eyas) eyasScale(root);
  root.updateMatrixWorld(true);
  const bones = {}; root.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const wq = (o) => { o.updateWorldMatrix(true, false); const q = new THREE.Quaternion(); _m.copy(inv).multiply(o.matrixWorld).decompose(_p, q, _s); return q; };   // (bones are scaled: decompose)
  const wp = (o) => { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv); };
  const setWorldQ = (o, q) => { const pq = wq(o.parent); o.quaternion.copy(pq.invert().multiply(q)); o.updateMatrixWorld(true); };
  // the body up: the hips turned nose-up about the lateral axis
  const hips = bones.hips;
  setWorldQ(hips, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -spec.pitch).multiply(wq(hips)));
  for (const [bn, cn, dir] of spec.aims) {
    for (const side of bn.startsWith("spine") || bn.startsWith("head") ? [""] : ["_L", "_R"]) {
      const b = bones[bn + side], c = bones[cn + side];
      if (!b || !c) continue;
      const cur = wp(c).sub(wp(b)).normalize();
      const want = new THREE.Vector3(side === "_R" ? -dir[0] : dir[0], dir[1], dir[2]).normalize();
      if (bn.startsWith("wing")) want.applyAxisAngle(_X, -spec.pitch);        // wings: in the (raised) body's frame; legs, head: level
      setWorldQ(b, new THREE.Quaternion().setFromUnitVectors(cur, want).multiply(wq(b)));
    }
  }
  // stand on the toes: lower / raise the whole bird so the lowest foot bone is at 0
  let low = Infinity;
  for (const n of ["Foot_L", "Foot_R", "Toes_L", "Toes_R", "Toes_tip_L", "Toes_tip_R"]) if (bones[n]) low = Math.min(low, wp(bones[n]).y);
  bones.root.position.y -= low - 0.02;
  const tracks = [];
  for (const b of Object.values(bones)) tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, [0, 1], [...b.quaternion.toArray(), ...b.quaternion.toArray()]));
  tracks.push(new THREE.VectorKeyframeTrack("root.position", [0, 1], [...bones.root.position.toArray(), ...bones.root.position.toArray()]));
  return new THREE.AnimationClip(name, 1, tracks);
}

/** A lighter LOD of the skinned mesh: meshoptimizer on a position-welded index (the UV seams split the vertices), each
 *  corner given back the original vertex whose normal best matches its new triangle (UVs and skin weights intact). */
function lodGeometry(g, ratio) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, I = g.index.array;
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const want = Math.floor(I.length / 3 * ratio) * 3;
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, 0.05, []);
  const res = new Uint32Array(out.length), C = cpos;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = -1, bd = -Infinity;
      for (const v of members[out[t + k]]) { const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz; if (d > bd) { bd = d; best = v; } }
      res[t + k] = best;
    }
  }
  const s = new THREE.BufferGeometry();
  for (const k of Object.keys(g.attributes)) s.setAttribute(k, g.attributes[k]);
  s.setIndex(new THREE.BufferAttribute(res, 1));
  s.boundingSphere = g.boundingSphere?.clone() ?? null;
  return s;
}

// ------------------------------------------------------------------------------------------------- materials
/** per-object light factor: 1 outside, darker inside the belfry chamber (object.userData.shade) */
const shadeU = uniform(1).onObjectUpdate(({ object }) => object.userData.shade ?? 1);
/** the belfry chamber's light on the nest and the birds inside (the baked AO in the nest is contact shading only) */
export const falconLook = { nestLight: uniform(0.42), downSheen: uniform(0.8) };

function birdMaterial(map, { down = false } = {}) {
  const m = down ? new THREE.MeshPhysicalNodeMaterial() : new THREE.MeshStandardNodeMaterial();
  m.colorNode = texture(map, uv()).rgb.mul(shadeU);
  m.roughness = down ? 0.95 : 0.78; m.metalness = 0;
  if (down) {                      // downy chicks: a soft sheen on the fluff (MeshPhysical sheen), no gloss
    m.sheen = 1; m.sheenRoughness = 0.55; m.sheenColorNode = vec3(0.9, 0.9, 0.88).mul(falconLook.downSheen).mul(shadeU);
  }
  withObjectFade(m);
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------- one bird
class Bird {
  constructor(fam, kind, name) {
    const A = fam.assets;
    this.fam = fam; this.kind = kind; this.name = name;
    this.root = new THREE.Group(); this.root.name = `falcon-${name}`;
    const model = cloneSkinned(A.bird.scene);
    model.rotation.y = Math.PI;                                  // the model's nose is +z; the root's is -z
    model.scale.setScalar(FALCON_SIZES[kind] / MODEL_SPAN);
    this.model = model;
    let m0 = null;
    model.traverse((o) => { if (o.isSkinnedMesh) m0 = o; });
    const mat = kind === "eyas" ? fam.mats.eyas : fam.mats.adult;
    m0.material = mat; m0.geometry = A.geo0;
    const m1 = new THREE.SkinnedMesh(A.geo1, mat);
    m1.bind(m0.skeleton, m0.bindMatrix);
    m0.parent.add(m1);
    m0.castShadow = m1.castShadow = false; m0.receiveShadow = m1.receiveShadow = true;
    m0.frustumCulled = m1.frustumCulled = false;                 // culled per bird here (the bind-pose sphere is wrong in flight)
    this.meshes = [m0, m1];
    this.root.add(model);
    applyBodyScale(model);
    if (kind === "eyas") this.shapeEyas();
    this.mixer = new THREE.AnimationMixer(model);
    const clip = (n) => A.clips.find((c) => c.name === n);
    // "idle" = the baked perched pose (adults) / sitting pose (eyases); flight: Flap and Glide, the fly-mode clips
    this.actions = { idle: this.mixer.clipAction(clip(kind === "eyas" ? "Sit" : "Perch")), flap: this.mixer.clipAction(clip("Flap")), glide: this.mixer.clipAction(clip("Glide")) };
    this.w = { idle: 1, flap: 0, glide: 0 }; this.tw = { ...this.w };
    for (const [k, a] of Object.entries(this.actions)) { a.play(); a.setEffectiveWeight(this.w[k]); a.time = Math.random() * a.getClip().duration; }
    this.rig = new BirdRig(this.root);
    this.rig.addLayer("headDown", "head", "mouth_upper_tip", [0, -1, 0]);
    this.rig.addLayer("headTurn", "head", "mouth_upper_tip", [1, 0, 0]);
    this.rig.addLayer("neckUp", "spine_3", "mouth_upper_tip", [0, 1, 0]);
    this.rig.addLayer("beak", "mouth_lower", "mouth_lower_tip", [0, -1, 0]);
    this.rig.addLayer("spreadL", "wing_1_L", "wing_tip_L", [-1, 0, 0]);
    this.rig.addLayer("spreadR", "wing_1_R", "wing_tip_R", [1, 0, 0]);
    this.lay = { fold: 0, brake: 0, bank: 0, legs: 0, headDown: 0, headTurn: 0, neckUp: 0, beak: 0, spread: 0, droop: 0 };
    this.extra = { headDown: 0, headTurn: 0, neckUp: 0, beak: 0, spreadL: 0, spreadR: 0 };
    // kinematics (church frame)
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.bank = 0; this.roll = 0; this.speed = 0;
    this.state = "perch"; this.t = 0; this.data = {};
    this.animAcc = 0; this.frame = (Math.random() * 6) | 0;
    this.prey = null;
    this.dist = 0; this.onScreen = true; this.updatedThisFrame = false;
  }

  shapeEyas() { eyasScale(this.model); }

  /** world-free helpers in the church frame */
  get fwd() { const cp = Math.cos(this.pitch); return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); }
  setFacing(dir) { this.yaw = Math.atan2(-dir.x, -dir.z); }

  /** fly toward a point: coordinated turns (bank -> yaw rate), pitch toward the climb / dive angle, energy */
  steer(dt, T, wantSpeed, { maxBank = 0.85, maxDive = -0.55, maxClimb = 0.4, turn = 1.0, pitchRate = 1.6 } = {}) {
    const dx = T.x - this.pos.x, dy = T.y - this.pos.y, dz = T.z - this.pos.z, h = Math.hypot(dx, dz);
    const dyaw = wrap(Math.atan2(-dx, -dz) - this.yaw);
    const rate = clamp(dyaw * 1.1 * turn, -1.3, 1.3);
    const bankWant = clamp(Math.atan(rate * Math.max(this.speed, 5) / G), -maxBank, maxBank);
    this.bank = ease(this.bank, bankWant, 2.2, dt);
    this.yaw = wrap(this.yaw + Math.tan(this.bank) * G / Math.max(this.speed, 5) * dt);
    const pitchWant = clamp(Math.atan2(dy, Math.max(h, 2)), maxDive, maxClimb);
    this.pitch = ease(this.pitch, pitchWant, pitchRate, dt);
    this.speed += -Math.sin(this.pitch) * G * dt * 0.7 + (wantSpeed - this.speed) * 0.5 * dt;
    this.speed = clamp(this.speed, 6, 95);
    this.move(dt);
    return Math.hypot(h, dy);
  }
  move(dt) {
    const cp = Math.cos(this.pitch);
    this.pos.x += -Math.sin(this.yaw) * cp * this.speed * dt;
    this.pos.z += -Math.cos(this.yaw) * cp * this.speed * dt;
    this.pos.y += Math.sin(this.pitch) * this.speed * dt;
    const floor = this.fam.floorAt(this.pos.x, this.pos.z) + 6;
    if (this.pos.y < floor && !this.data.noFloor) { this.pos.y = ease(this.pos.y, floor, 6, dt); if (this.pitch < 0) this.pitch *= 0.9; }
  }

  /** a Hermite path (p0, v0) -> (p1, v1) over T seconds; sets position and attitude from the curve's velocity */
  hermite(s, H) {
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    const d00 = 6 * s2 - 6 * s, d10 = 3 * s2 - 4 * s + 1, d01 = -6 * s2 + 6 * s, d11 = 3 * s2 - 2 * s;
    const { p0, v0, p1, v1, T } = H;
    this.pos.set(
      h00 * p0.x + h10 * T * v0.x + h01 * p1.x + h11 * T * v1.x,
      h00 * p0.y + h10 * T * v0.y + h01 * p1.y + h11 * T * v1.y,
      h00 * p0.z + h10 * T * v0.z + h01 * p1.z + h11 * T * v1.z);
    return _v.set(
      (d00 * p0.x + d10 * T * v0.x + d01 * p1.x + d11 * T * v1.x) / T,
      (d00 * p0.y + d10 * T * v0.y + d01 * p1.y + d11 * T * v1.y) / T,
      (d00 * p0.z + d10 * T * v0.z + d01 * p1.z + d11 * T * v1.z) / T);
  }
  /** attitude from a velocity (flight along a scripted path) */
  attitudeFrom(vel, dt, rate = 6) {
    const h = Math.hypot(vel.x, vel.z);
    if (h > 0.3) {
      const y = Math.atan2(-vel.x, -vel.z), d = wrap(y - this.yaw);
      this.bank = ease(this.bank, clamp(d * 2.5, -0.7, 0.7), 4, dt);
      this.yaw = wrap(this.yaw + d * (1 - Math.exp(-rate * dt)));
    }
    this.pitch = ease(this.pitch, clamp(Math.atan2(vel.y, Math.max(h, 0.5)), -0.7, 0.6), rate, dt);
    this.speed = vel.length();
  }

  setWeights(idle, flap, glide) { this.tw.idle = idle; this.tw.flap = flap; this.tw.glide = glide; }

  /** the root transform + clip weights (eased; they always sum to 1) + layers; the mixer at its own rate */
  pose(dt, doAnim) {
    this.root.position.copy(this.pos);
    this.root.rotation.set(this.pitch, this.yaw, this.bank + this.roll, "YXZ");
    let sum = 0;
    for (const k in this.w) { this.w[k] = ease(this.w[k], this.tw[k], 4.5, dt); sum += this.w[k]; }
    this.animAcc += dt;
    if (!doAnim) return;
    for (const k in this.w) this.actions[k].setEffectiveWeight(this.w[k] / Math.max(sum, 1e-4));
    this.actions.flap.timeScale = this.data.flapRate ?? 1;
    this.rig.restore();
    this.mixer.update(this.animAcc);
    this.animAcc = 0;
    const L = this.lay, E = this.extra;
    E.headDown = L.headDown; E.headTurn = L.headTurn; E.neckUp = L.neckUp; E.beak = L.beak;
    E.spreadL = L.spread + L.droop * 0.3; E.spreadR = L.spread + L.droop * 0.3;
    this.rig.apply({ fold: L.fold, bank: L.bank, legs: L.legs, brake: L.brake, extra: E });
  }
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4();
const _frustum = new THREE.Frustum(), _sphere = new THREE.Sphere();

// ------------------------------------------------------------------------------------------------- the family
export async function createFalcons({ church, heightAt = null, params = {} } = {}) {
  const A = await loadFalconAssets();
  const fam = new FalconFamily(A, church, heightAt, params);
  return fam;
}

export class FalconFamily {
  constructor(A, church, heightAt, params) {
    this.assets = A;
    this.params = { pace: 1, ...params };
    this.group = new THREE.Group(); this.group.name = "falcons";
    this.group.position.copy(church.placement.position); this.group.rotation.y = church.placement.rotationY;
    this.group.updateMatrixWorld(true);
    this.inv = this.group.matrixWorld.clone().invert();
    this.heightAt = heightAt;                                                  // world (x, z) -> m TAW, or null
    this.mats = { adult: birdMaterial(A.adultMap), eyas: birdMaterial(A.eyasTex, { down: true }) };
    // perches (church frame): the stjob.glb nodes perch_* (position + facing), the nest node
    this.perch = {};
    for (const [k, v] of Object.entries(church.perches || {})) this.perch[k.replace("perch_", "")] = v;
    const N = this.perch.ledge.facing.clone();                                 // the tower face's outward normal
    this.out = N;
    // the nest frame: origin = the nest node, z = outward
    this.nestFrame = new THREE.Group(); this.nestFrame.name = "falcon-nest";
    this.nestFrame.position.copy(church.nest);
    this.nestFrame.rotation.y = Math.atan2(N.x, N.z);
    this.group.add(this.nestFrame);
    this.nestFrame.updateMatrix();
    this.buildNest(A.nest);
    // the birds
    this.birds = [];
    this.female = this.addBird("female", "female"); this.male = this.addBird("male", "male");
    this.chicks = [0, 1, 2].map((i) => this.addBird("eyas", `eyas${i}`));
    this.chicks.forEach((c, i) => this.seatChick(c, i));
    this.perchAt(this.female, "ledge"); this.perchAt(this.male, "cross");
    this.female.data.next = rand(6, 14); this.male.data.next = rand(8, 18);
    this.clock = performance.now(); this.time = 0; this.frameNo = 0;
    this.stats = { birds: 0, animated: 0, onScreen: 0, cpuMs: 0, lod1: 0, shadows: 0, nest: "" };
    this.log = [];
    this.enabled = true;
  }

  addBird(kind, name) { const b = new Bird(this, kind, name); this.group.add(b.root); this.birds.push(b); return b; }

  /** church-frame point of a nest-frame point */
  nestPoint(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.nestFrame.matrix); }
  nestDir(x, y, z) { return new THREE.Vector3(x, y, z).applyAxisAngle(_Y, this.nestFrame.rotation.y); }

  buildNest(gltf) {
    const scene = gltf.scene;
    this.spots = {};
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
    mat.colorNode = attribute("color", "vec4").rgb.mul(falconLook.nestLight).mul(shadeU);
    withObjectFade(mat);
    this.nestMat = mat;
    scene.updateMatrixWorld(true);
    for (const o of [...scene.children]) {
      if (o.isMesh) o.material = mat;
      if (/^(chick_|feed|scrape|hop)/.test(o.name)) this.spots[o.name] = { pos: o.position.clone(), facing: new THREE.Vector3(0, 0, -1).applyQuaternion(o.quaternion) };
    }
    const props = scene.getObjectByName("nest_props"), prey = scene.getObjectByName("prey_carry");
    props.receiveShadow = true; props.castShadow = false;
    // LOD: meshopt to ~4k triangles beyond NEST_LOD m (the gravel's relief goes first)
    const g1 = new THREE.BufferGeometry();
    for (const k of Object.keys(props.geometry.attributes)) g1.setAttribute(k, props.geometry.attributes[k]);
    const I = props.geometry.index.array, P = props.geometry.attributes.position.array;
    const [ix] = MeshoptSimplifier.simplify(new Uint32Array(I), new Float32Array(P), 3, 12000, 0.02, ["LockBorder"]);
    g1.setIndex(new THREE.BufferAttribute(ix, 1));
    const props1 = new THREE.Mesh(g1, mat); props1.receiveShadow = true;
    this.nestMeshes = [props, props1];
    this.nestFrame.add(props, props1);
    this.preyMesh = prey; prey.removeFromParent();
    this.nestTris = [I.length / 3, ix.length / 3];
  }

  /** a carried pigeon (a clone of prey_carry), in the bird's talons */
  givePrey(b) {
    if (b.prey) return;
    const p = this.preyMesh.clone(); p.material = this.nestMat;
    p.userData.shade = 1;
    const k = FALCON_SIZES[b.kind] / FALCON_SIZES.female;
    p.position.set(0, -0.13 * k, 0.04 * k); p.rotation.set(0.15, Math.PI, 0); p.scale.setScalar(0.95 * k);
    b.root.add(p); b.prey = p;
  }
  takePrey(from, to) { if (!from.prey) return; const p = from.prey; from.prey = null; to.root.add(p); to.prey = p; const k = FALCON_SIZES[to.kind] / FALCON_SIZES.female; p.position.set(0, -0.13 * k, 0.04 * k); }
  dropPreyInNest(b) {
    if (!b.prey) return;
    const p = b.prey; b.prey = null;
    this.nestFrame.add(p);
    p.position.copy(this.spots.feed.pos).add(new THREE.Vector3(0, 0.03, -0.12)); p.rotation.set(0, 0.6, 0.0); p.scale.setScalar(0.95);
    this.nestPrey = p; this.nestPreyLeft = 1;
  }

  seatChick(c, i) {
    const s = this.spots[`chick_${i}`];
    c.home = this.nestPoint(s.pos.x, s.pos.y, s.pos.z);
    c.homeYaw = Math.atan2(-this.nestDir(s.facing.x, 0, s.facing.z).x, -this.nestDir(s.facing.x, 0, s.facing.z).z);
    c.pos.copy(c.home); c.yaw = c.homeYaw; c.state = "chick"; c.data = { phase: Math.random() * 10, flapT: rand(5, 20), look: 0, lookT: 0 };
    c.setWeights(1, 0, 0);
    c.w = { ...c.tw };
  }

  perchAt(b, name) {
    const P = this.perch[name];
    b.pos.copy(P.pos); b.setFacing(P.facing); b.pitch = 0; b.bank = 0; b.speed = 0;
    b.state = "perch"; b.t = 0; b.data = { perch: name, next: rand(12, 30) / this.params.pace, look: 0, lookT: 0 };
    b.setWeights(1, 0, 0); b.w = { ...b.tw };
  }

  /** the highest solid under a church-frame point: the ground / roofs (heightAt) and the church itself */
  floorAt(x, z) {
    let g = -2;
    if (this.heightAt) { _f.set(x, 0, z).applyMatrix4(this.group.matrixWorld); g = this.heightAt(_f.x, _f.z) - this.group.position.y; }
    return Math.max(g, churchTop(x, z));
  }

  say(b, what) { this.log.push(`${(this.time).toFixed(1)}s ${b.name}: ${what}`); if (this.log.length > 12) this.log.shift(); }

  // --------------------------------------------------------------------------------------------- behaviours
  /** force a behaviour now (the lab / dev panel): "stoop" (the male hunts), "food" (the male comes with prey: the
   *  food pass, the female feeds), "circle", "perch" (both go to perches) */
  force(what) {
    const F = this.female, M = this.male;
    if (what === "stoop") { this.launch(M, "hunt"); }
    else if (what === "food") { this.givePrey(M); this.launch(M, "carry"); }
    else if (what === "circle") { this.launch(F, "circle"); this.launch(M, "circle"); }
    else if (what === "perch") { for (const b of [F, M]) if (b.state !== "perch") this.goLand(b, b === F ? "louvre" : "cross"); }
    else if (what === "feed") {
      this.givePrey(F);
      if (F.state === "perch" && F.data.perch === "ledge") this.hopIn(F);
      else if (F.state === "perch") this.launch(F, "deliver");
      else if (F.state !== "nest" && F.state !== "hop") this.goLand(F, "ledge", "deliver");
    }
  }

  /** the fly-mode nest start: the adults off the ledge and out of the scrape (the young one hops up there) */
  makeRoom() {
    for (const b of [this.female, this.male]) {
      const busy = (b.state === "perch" && b.data.perch === "ledge") || b.state === "nest" || b.state === "hop" || (b.state === "final" && b.data.land === "ledge");
      if (busy) { if (b.prey) { b.prey.removeFromParent(); b.prey = null; } this.perchAt(b, b === this.female ? "louvre" : "gable"); }
      if (b.state === "approach" && b.data.land === "ledge") b.data.land = "louvre";
    }
  }

  /** from a perch: the takeoff (a drop forward off the ledge, wings opening), then `goal` */
  launch(b, goal) {
    b.data.goal = goal;
    if (b.state === "perch" || b.state === "nest") {
      const P = b.pos.clone(), F = b.fwd.setY(0).normalize();
      const inside = b.state === "nest";
      if (inside) {                     // first the hop back out to the ledge, then the drop
        const L = this.perch.ledge;
        b.state = "hop"; b.t = 0; b.data.hop = { from: P, to: L.pos.clone(), T: 0.75, yaw0: b.yaw, yaw1: Math.atan2(-L.facing.x, -L.facing.z), then: "takeoff" };
        b.setWeights(0.3, 0.7, 0); return;
      }
      b.state = "takeoff"; b.t = 0;
      b.data.H = { p0: P, v0: new THREE.Vector3(0, 0.6, 0).addScaledVector(F, 1.5), p1: P.clone().addScaledVector(F, 6).add(new THREE.Vector3(0, -2.6, 0)), v1: F.clone().multiplyScalar(9).add(new THREE.Vector3(0, -2.2, 0)), T: 1.1 };
      b.setWeights(0, 1, 0); b.data.flapRate = 1.25;
      this.say(b, `takes off for ${goal}`);
    } else { this.startGoal(b, goal); }
  }

  startGoal(b, goal) {
    b.state = "fly"; b.t = 0; b.data.goal = goal;
    const T = this.perch.cross.pos;
    if (goal === "circle" || goal === "hunt") {
      // a thermal over the Place / the houses NW of the tower (the dome stays inside no circle's low first lap)
      const big = goal === "hunt", side = new THREE.Vector3(-this.out.z, 0, this.out.x);
      b.data.C = new THREE.Vector3(T.x, 0, T.z).addScaledVector(this.out, rand(25, 55)).addScaledVector(side, rand(-30, 30));
      b.data.R = big ? rand(40, 55) : rand(28, 45); b.data.dir = Math.random() < 0.5 ? 1 : -1;
      b.data.alt = Math.max(b.pos.y + 4, 36); b.data.top = big ? rand(95, 125) : rand(60, 90);
      b.data.until = (big ? rand(25, 40) : rand(35, 70)) / this.params.pace;
      b.data.flapT = rand(2, 6);
    } else if (goal === "carry") {
      const R = this.perch.ledge.pos.clone().addScaledVector(this.out, 45); R.y = 48;
      b.data.R0 = R; b.data.until = 40;
    }
  }

  goLand(b, perchName, then = null) {
    b.state = "approach"; b.t = 0; b.data.land = perchName; b.data.then = then; b.data.rounded = false;
    this.say(b, `comes in to land on the ${perchName}`);
  }

  pickPerch(b) {
    const free = ["cross", "gable", "louvre", "ledge"].filter((k) => this.birds.every((o) => o === b || o.data.perch !== k || o.state !== "perch"));
    const pref = b === this.male ? ["cross", "gable", "louvre"] : ["louvre", "ledge", "gable", "cross"];
    const cands = pref.filter((k) => free.includes(k));
    return cands[Math.floor(Math.random() * Math.min(2, cands.length))] || free[0] || "cross";
  }

  updateAdult(b, dt) {
    const D = b.data, L = b.lay;
    b.t += dt;
    let fold = 0, brake = 0, legs = 0;
    switch (b.state) {
      case "perch": {
        b.pitch = ease(b.pitch, 0, 4, dt); b.bank = ease(b.bank, 0, 4, dt); b.roll = ease(b.roll, 0, 4, dt);
        // just landed facing the wall: turn round on the spot (a few steps) to face out
        const P = this.perch[D.perch];
        const want = Math.atan2(-P.facing.x, -P.facing.z), d = wrap(want - b.yaw);
        if (Math.abs(d) > 0.05) { b.yaw = wrap(b.yaw + Math.sign(d) * Math.min(Math.abs(d), 2.6 * dt)); b.setWeights(1, 0, 0); b.data.step = (b.data.step || 0) + dt; }
        else b.setWeights(1, 0, 0);
        b.pos.lerp(P.pos, 1 - Math.exp(-8 * dt));
        this.lookAround(b, dt);
        if (b.prey && D.perch === "ledge") { this.hopIn(b); break; }
        if (b.t > D.next) this.decide(b);
        break;
      }
      case "takeoff": {
        const s = Math.min(1, b.t / D.H.T), v = b.hermite(s, D.H);
        b.attitudeFrom(v, dt, 5);
        L.spread = 0;
        if (s >= 1) { b.speed = 9; this.startGoal(b, D.goal); }
        break;
      }
      case "fly": this.flyGoal(b, dt); fold = D.fold ?? 0; break;
      case "approach": {
        const P = this.perch[D.land], A = P.pos.clone().addScaledVector(P.facing, 22).add(new THREE.Vector3(0, 3.5, 0));
        // from behind the tower: first out round it, above the spire, to the perch's side
        const side = (b.pos.x - P.pos.x) * P.facing.x + (b.pos.z - P.pos.z) * P.facing.z;
        if (side < 12 && !D.rounded) { A.addScaledVector(P.facing, 25); A.y = Math.max(A.y, 64); }
        else D.rounded = true;
        const dist = b.steer(dt, A, 11, { maxDive: -0.45 });
        b.setWeights(0, b.pitch > 0.1 ? 1 : 0.15, b.pitch > 0.1 ? 0 : 0.85);
        const toward = -(b.fwd.x * P.facing.x + b.fwd.z * P.facing.z);              // > 0: heading at the wall
        if (dist < 7 || (dist < 14 && toward > 0.5)) {
          const p0 = b.pos.clone(), v0 = b.fwd.multiplyScalar(b.speed);
          const p1 = P.pos.clone(), v1 = P.facing.clone().multiplyScalar(-1.2).add(new THREE.Vector3(0, -0.3, 0));
          const T = clamp(2 * p0.distanceTo(p1) / (b.speed + 1.2), 1.4, 4.5);
          b.state = "final"; b.t = 0; D.H = { p0, v0, p1, v1, T };
        }
        break;
      }
      case "final": {                                      // the last metres: braking flaps, tail down, feet forward
        const s = Math.min(1, b.t / D.H.T), v = b.hermite(s, D.H);
        b.attitudeFrom(v, dt, 7);
        b.pitch = ease(b.pitch, 0.25 * smooth(s, 0.5, 1), 6, dt);
        brake = smooth(s, 0.35, 0.8);
        b.setWeights(0, smooth(s, 0.3, 0.6) * 0.95 + 0.05, 1 - smooth(s, 0.3, 0.6));
        D.flapRate = 1.15;
        if (s >= 1) {
          const then = D.then;
          this.perchAt(b, D.land);
          b.w = { idle: 0.3, flap: 0.7, glide: 0 };                        // the weights ease on from the landing
          b.yaw = Math.atan2(v.x, v.z) + Math.PI;                                      // landed facing in; perch turns it
          if (then === "deliver" && D.land === "ledge") this.hopIn(b);
        }
        break;
      }
      case "hop": {                                         // ledge <-> scrape: a short hop with a flap
        const H = D.hop, s = Math.min(1, b.t / H.T), e = s * s * (3 - 2 * s);
        b.pos.lerpVectors(H.from, H.to, e); b.pos.y += Math.sin(Math.PI * s) * 0.28;
        b.yaw = wrap(H.yaw0 + wrap(H.yaw1 - H.yaw0) * Math.min(1, s * 1.6));
        b.pitch = ease(b.pitch, 0, 6, dt);
        b.setWeights(0.4, 0.6, 0);
        if (s >= 1) {
          if (H.then === "nest") { b.state = "nest"; b.t = 0; D.perch = "nest"; D.feedT = rand(22, 34) / this.params.pace; b.setWeights(1, 0, 0); this.dropPreyInNest(b); this.say(b, "feeds the eyases"); }
          else if (H.then === "takeoff") { b.state = "perch"; D.perch = "ledge"; this.launch(b, D.goal || "circle"); }
        }
        break;
      }
      case "nest": {                                        // feeding: tear, lean down, offer a morsel to a chick
        b.setWeights(1, 0, 0);
        const cyc = (b.t * 0.55) % 1;
        L.headDown = ease(L.headDown, cyc < 0.45 ? 0.75 : cyc < 0.6 ? 0.1 : -0.15, 7, dt);
        L.headTurn = ease(L.headTurn, Math.sin(b.t * 0.9) * 0.4, 3, dt);
        L.beak = ease(L.beak, cyc > 0.55 && cyc < 0.7 ? 0.35 : 0, 10, dt);
        if (this.nestPrey) { this.nestPreyLeft = Math.max(0.15, 1 - b.t / D.feedT); this.nestPrey.scale.setScalar(0.95 * (0.45 + 0.55 * this.nestPreyLeft)); }
        if (b.t > D.feedT) { L.headDown = 0; this.launch(b, "circle"); }
        break;
      }
    }
    if (b.state !== "nest") { L.headDown = ease(L.headDown, b.state === "perch" ? L.headDown : 0, 3, dt); L.beak = ease(L.beak, 0, 6, dt); }
    L.fold = ease(L.fold, fold, 3, dt); L.brake = ease(L.brake, brake, 4, dt); L.legs = ease(L.legs, legs, 3, dt);
    L.bank = b.state === "fly" || b.state === "approach" ? b.bank : ease(L.bank, 0, 4, dt);
    this.shadeFor(b);
  }

  hopIn(b) {
    const s = this.spots.feed, to = this.nestPoint(s.pos.x, s.pos.y, s.pos.z);
    const f = this.nestDir(s.facing.x, 0, s.facing.z);
    b.state = "hop"; b.t = 0; b.data.hop = { from: b.pos.clone(), to, T: 0.8, yaw0: b.yaw, yaw1: Math.atan2(-f.x, -f.z), then: "nest" };
    this.say(b, "hops in to the scrape");
  }

  lookAround(b, dt) {
    const D = b.data, L = b.lay;
    D.lookT -= dt;
    if (D.lookT <= 0) { D.look = rand(-0.9, 0.9) * (Math.random() < 0.3 ? 0.2 : 1); D.lookDown = Math.random() < 0.25 ? rand(0.2, 0.5) : rand(-0.1, 0.1); D.lookT = rand(0.8, 4); }
    L.headTurn = ease(L.headTurn, D.look, 9, dt);                              // quick head turns, then still: a falcon's
    L.headDown = ease(L.headDown, D.lookDown, 7, dt);
  }

  decide(b) {
    const F = this.female, M = this.male;
    if (b === M) {
      const r = Math.random();
      this.launch(M, r < 0.45 ? "hunt" : "circle");
    } else {
      // the female mostly stays near the eyrie: short circles, perch changes, now and then a hunt; she waits on her
      // perch while the male is out with prey (he will call her off for the pass)
      if (M.prey) { b.data.next = b.t + 8; return; }
      const r = Math.random();
      if (r < 0.45) this.launch(F, "circle");
      else if (r < 0.65) this.launch(F, "hunt");
      else { this.launch(F, "hop"); }
    }
  }

  flyGoal(b, dt) {
    const D = b.data, L = b.lay;
    const goal = D.goal;
    D.fold = 0;
    if (goal === "hop") {                 // a short flight round the tower to another perch
      this.goLand(b, this.pickPerch(b)); return;
    }
    if (goal === "deliver") { this.goLand(b, "ledge", "deliver"); return; }
    if (goal === "circle" || goal === "hunt") {
      // soaring on a thermal: a wide circle that climbs; a few wingbeats now and then
      D.alt = Math.min(D.top, D.alt + dt * (goal === "hunt" ? 1.8 : 1.1));
      const C = D.C, a = Math.atan2(b.pos.z - C.z, b.pos.x - C.x) + D.dir * 0.55;
      const T = _w.set(C.x + Math.cos(a) * D.R, D.alt, C.z + Math.sin(a) * D.R);
      b.steer(dt, T, 11, { maxBank: 0.6, maxClimb: 0.22 });
      D.flapT -= dt;
      const flapping = D.flapT < 0 || b.pitch > 0.15;
      if (D.flapT < -1.4) D.flapT = rand(5, 12);
      b.setWeights(0, flapping ? 1 : 0, flapping ? 0 : 1); D.flapRate = 1.1;
      if (b.t > D.until) {
        if (goal === "hunt" && b.pos.y > 55) { this.stoop(b); }
        else if (goal === "hunt") { D.until += 10; }
        else this.goLand(b, this.pickPerch(b));
      }
      return;
    }
    if (goal === "stoop") {
      // the stoop: a few hard wingbeats, then wings folded, a steep dive at the prey (a pigeon over the rooftops)
      const P = D.target;
      const dist = b.steer(dt, P, 70, { maxDive: -1.35, maxBank: 0.5, turn: 1.6, pitchRate: 1.2 });
      const k = smooth(b.t, 0.8, 2.0);
      D.fold = k; b.setWeights(0, 1 - k, k); D.flapRate = 1.6;
      if (dist < 4 || b.t > 14 || b.pos.y < P.y - 2) {
        const caught = Math.random() < (b === this.male ? 0.7 : 0.55);
        this.say(b, caught ? "strikes: a pigeon" : "misses");
        if (caught) this.givePrey(b);
        D.goal = "pullout"; b.t = 0; D.caught = caught;
      }
      return;
    }
    if (goal === "pullout") {
      D.fold = 0;
      const T = _w.copy(b.pos).addScaledVector(b.fwd.setY(0).normalize(), 40); T.y = b.pos.y + 25;
      b.steer(dt, T, 13, { maxClimb: 0.55, pitchRate: 1.0 });
      b.setWeights(0, b.speed < 20 ? 1 : 0.3, b.speed < 20 ? 0 : 0.7);
      if (b.t > 4) { if (b.prey) this.startGoal(b, "carry"); else this.startGoal(b, "circle"); }
      return;
    }
    if (goal === "carry") {
      // home with the prey. The male calls the female off the tower for the food pass; else he lands on the ledge
      const R = D.R0, a = Math.atan2(b.pos.z - R.z, b.pos.x - R.x) + 0.5;
      const T = _w.set(R.x + Math.cos(a) * 16, R.y, R.z + Math.sin(a) * 16);
      b.steer(dt, T, 10, { maxBank: 0.6 });
      b.setWeights(0, b.pitch > 0.1 ? 1 : 0.25, b.pitch > 0.1 ? 0 : 0.75);
      const F = this.female;
      if (b === this.male && b.pos.distanceTo(R) < 60 && !D.called) {
        D.called = true;
        if (F.state === "perch") { this.say(b, "calls: the food pass"); F.data.pass = b; this.launch(F, "pass"); }
        else D.solo = true;
      }
      if (b === this.male && (D.solo || b.t > 45) && b.prey) { D.called = false; D.solo = false; this.goLand(b, "ledge", "deliver"); }
      if (!b.prey) { this.say(b, "goes back to the cross"); this.goLand(b, this.pickPerch(b)); }
      if (b === F && b.prey) this.goLand(b, "ledge", "deliver");
      return;
    }
    if (goal === "pass") {
      // the female comes up under the male, rolls over and takes the prey from his feet
      const M = D.pass;
      const T = _w.copy(M.pos).addScaledVector(M.fwd, 1.0).add(new THREE.Vector3(0, -1.0, 0));
      const dist = b.steer(dt, T, M.speed + 4, { maxBank: 0.8, maxClimb: 0.5, turn: 1.4 });
      b.setWeights(0, 1, 0); D.flapRate = 1.3;
      if (dist < 2.2 && !D.rolling) { D.rolling = 0.001; this.say(b, "rolls over for the pass"); }
      if (D.rolling) {
        D.rolling += dt;
        const s = D.rolling / 0.9;
        // she closes in under his feet (talons to talons) while she turns over
        b.pos.lerp(_v.copy(M.pos).addScaledVector(M.fwd, 0.15).add(_w.set(0, -0.55 * FALCON_SIZES.female, 0)), 1 - Math.exp(-6 * dt));
        b.roll = Math.sin(Math.PI * Math.min(1, s)) * 2.3;
        L.spread = 0;
        if (s > 0.5 && M.prey) this.takePrey(M, b);
        if (s >= 1) { b.roll = 0; D.rolling = 0; this.goLand(b, "ledge", "deliver"); }
      }
      if (b.t > 40) { D.rolling = 0; b.roll = 0; this.goLand(b, "louvre"); }
    }
  }

  stoop(b) {
    // the prey: a pigeon crossing below and ahead, at rooftop height + 18-30 m: a 40-60 degree dive
    const a = b.yaw + rand(-0.9, 0.9), drop = Math.max(30, b.pos.y - 25), r = drop * rand(0.6, 1.1);
    const T = new THREE.Vector3(b.pos.x - Math.sin(a) * r, 0, b.pos.z - Math.cos(a) * r);
    T.y = Math.max(this.floorAt(T.x, T.z) + rand(18, 30), 12);
    b.data.goal = "stoop"; b.data.target = T; b.t = 0;
    this.say(b, "stoops");
  }

  updateChick(c, dt, adultNear) {
    const D = c.data, L = c.lay;
    D.phase += dt;
    // idle: settled, a slow breathing bob, head turns, now and then wing exercise (flapping on the spot) or a nap
    const beg = adultNear ? 1 : 0;
    D.beg = ease(D.beg ?? 0, beg, 3, dt);
    D.lookT -= dt;
    if (D.lookT <= 0) { D.look = rand(-0.6, 0.6); D.lookT = rand(1, 4); }
    D.flapT -= dt;
    const exercising = D.flapT < 0 && D.beg < 0.3;
    if (D.flapT < -2.2) D.flapT = rand(12, 35);
    const bob = Math.sin(D.phase * 2.1) * 0.008 + D.beg * Math.abs(Math.sin(D.phase * 9)) * 0.018;
    c.pos.copy(c.home); c.pos.y += bob;
    // begging: head up toward the adult, beak open, wings drooped and quivering, the body leaning in
    let yawWant = c.homeYaw;
    if (adultNear) { const d = adultNear.pos.clone().sub(c.pos); yawWant = Math.atan2(-d.x, -d.z); }
    c.yaw = wrap(c.yaw + wrap(yawWant - c.yaw) * (1 - Math.exp(-2.5 * dt)));
    c.pitch = ease(c.pitch, D.beg * -0.15, 3, dt);
    L.neckUp = ease(L.neckUp, D.beg * 0.45, 5, dt);
    L.headDown = ease(L.headDown, D.beg * -0.35 + (1 - D.beg) * 0.15 + Math.sin(D.phase * 1.3) * 0.05, 5, dt);
    L.headTurn = ease(L.headTurn, D.beg ? Math.sin(D.phase * 7) * 0.15 : D.look, 6, dt);
    L.beak = ease(L.beak, D.beg * (0.45 + 0.25 * Math.sin(D.phase * 11)), 10, dt);
    L.droop = ease(L.droop, D.beg * (0.6 + 0.3 * Math.sin(D.phase * 23)), 8, dt);
    L.spread = ease(L.spread, exercising ? 0.4 : 0, 4, dt);
    c.setWeights(exercising ? 0.35 : 1, exercising ? 0.65 : 0, 0);
    c.data.flapRate = 1.5;
    this.shadeFor(c);
  }

  /** inside the belfry: the birds take the chamber's light */
  shadeFor(b) {
    const N = this.out, L = this.perch.ledge.pos;
    const behind = -((b.pos.x - L.x) * N.x + (b.pos.z - L.z) * N.z);          // metres behind the reveal's front
    const inside = b.pos.y < L.y + 2.5 && behind > -0.5 && Math.hypot(b.pos.x - L.x, b.pos.z - L.z) < 6;
    const k = inside ? smooth(behind, 0.2, 1.0) : 0;
    const s = 1 + (falconLook.nestLight.value / 0.42 * 0.5 - 1) * k;
    for (const m of b.meshes) m.userData.shade = s;
  }

  // --------------------------------------------------------------------------------------------- per frame
  update(camera, dtIn = null) {
    const now = performance.now();
    const dt = this.paused ? 0 : Math.min(0.1, dtIn ?? (now - this.clock) / 1000);   // paused: a still frame (the lab)
    this.clock = now; this.time += dt; this.frameNo++;
    if (!this.enabled) { this.group.visible = false; return; }
    this.group.visible = true;
    const t0 = performance.now();
    this.group.updateMatrixWorld();
    this.inv.copy(this.group.matrixWorld).invert();
    const camL = _c.copy(camera.position).applyMatrix4(this.inv);
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_m, camera.coordinateSystem, camera.reversedDepth);
    // behaviours (cheap: always)
    this.updateAdult(this.female, dt); this.updateAdult(this.male, dt);
    const nestC = this.nestPoint(0, 0.4, 0);
    const near = [this.female, this.male].find((b) => (b.state === "nest" || (b.state === "hop" && b.data.hop.then === "nest") || (b.state === "perch" && b.data.perch === "ledge")) && b.pos.distanceTo(nestC) < 2.2);
    const nestDist = camL.distanceTo(nestC);
    let animated = 0, onScreen = 0, lod1 = 0, shadows = 0;
    for (const b of this.birds) {
      const chick = b.kind === "eyas";
      if (chick && b.state !== "test") this.updateChick(b, dt, near);
      b.dist = camL.distanceTo(b.pos);
      // cull + LOD + fade, per bird (world sphere from the church frame)
      _sphere.center.copy(b.pos).applyMatrix4(this.group.matrixWorld); _sphere.radius = FALCON_SIZES[b.kind] * 0.7;
      const far = chick ? 130 : FAR_FADE[1];
      b.onScreen = b.dist < far && _frustum.intersectsSphere(_sphere);
      b.root.visible = b.onScreen;
      if (b.onScreen) onScreen++;
      const t = smooth(b.dist, LOD1_AT - LOD_BAND, LOD1_AT + LOD_BAND);
      const out = chick ? 1 - smooth(b.dist, 110, 130) : 1 - smooth(b.dist, FAR_FADE[0], FAR_FADE[1]);
      const [m0, m1] = b.meshes;
      m0.visible = t < 1; m1.visible = t > 0;
      // cross-fade (lodFade objectFade): the outgoing keeps n >= t (2 + t), the incoming n < t; the far fade on LOD1
      m0.userData.fade = t > 0 ? 2 + t : out < 1 ? out : 1;
      m1.userData.fade = t < 1 ? t : out;
      if (t > 0.5) lod1++;
      const cast = b.dist < SHADOW_NEAR && !chick;
      m0.castShadow = cast; if (cast) shadows++;
      // animation rate by distance; none off screen (time accumulates, so it resumes in step)
      const every = b.dist < 40 ? 1 : b.dist < 120 ? 2 : b.dist < 300 ? 3 : 6;
      const doAnim = b.onScreen && (this.frameNo + b.frame) % every === 0;
      if (!b.onScreen) b.animAcc = Math.min(b.animAcc, 2);
      b.pose(dt, doAnim);
      if (doAnim) animated++;
    }
    // the nest: drawn within NEST_FAR, the meshopt LOD beyond NEST_LOD (cross-faded), faded out at the far end
    const [n0, n1] = this.nestMeshes;
    const tn = smooth(nestDist, NEST_LOD - 4, NEST_LOD + 4), on = 1 - smooth(nestDist, NEST_FAR - 20, NEST_FAR);
    n0.visible = tn < 1; n1.visible = tn > 0 && on > 0;
    n0.userData.fade = tn > 0 ? 2 + tn : 1; n1.userData.fade = tn < 1 ? tn : on;
    if (this.nestPrey) this.nestPrey.visible = nestDist < NEST_FAR;
    this.stats.cpuMs = this.stats.cpuMs * 0.95 + (performance.now() - t0) * 0.05;
    Object.assign(this.stats, { birds: this.birds.length, animated, onScreen, lod1, shadows,
      nest: nestDist < NEST_FAR ? (tn < 0.5 ? `full ${this.nestTris[0]} tris` : `LOD ${this.nestTris[1]} tris`) : "off",
      female: `${this.female.state}${this.female.state === "fly" ? ":" + this.female.data.goal : ""}`, male: `${this.male.state}${this.male.state === "fly" ? ":" + this.male.data.goal : ""}` });
  }

  /** church-frame -> world */
  toWorld(v, out = new THREE.Vector3()) { return out.copy(v).applyMatrix4(this.group.matrixWorld); }

  dispose() { this.group.removeFromParent(); }
}
const _Y = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0), _f = new THREE.Vector3();

/** Saint-Job's height (m above its floor) at a church-frame point, from stjob.json "measured": the tower and its spire,
 *  the dome and lantern, the eight wings to their ridges (a proxy for the birds' flight floor, not drawn). */
const TOWER = [-13.456, -13.456], DOME = [[10.05, 23.2], [9.0, 25.9], [7.0, 30.1], [5.0, 32.2], [3.0, 33.3], [2.2, 33.6]];
function churchTop(x, z) {
  let h = -2;
  const tx = x - TOWER[0], tz = z - TOWER[1];
  const tr = Math.max(Math.abs(tx + tz), Math.abs(tx - tz)) / Math.SQRT2;            // the tower square is turned 45 deg
  if (tr < 4.9) h = 29.4;
  const rs = Math.hypot(tx, tz);
  if (rs < 4.7) h = Math.max(h, 29.4 + 4 + (54.85 - 33.4) * (1 - rs / 4.7) + 4.6 * (rs < 0.6 ? 1 : 0));   // spire, cross
  const r = Math.hypot(x, z);
  if (r < 10.3) {
    let d = 23.2;
    for (let i = 0; i < DOME.length - 1; i++) if (r <= DOME[i][0] && r >= DOME[i + 1][0]) d = DOME[i + 1][1] + (DOME[i][1] - DOME[i + 1][1]) * (r - DOME[i + 1][0]) / (DOME[i][0] - DOME[i + 1][0]);
    if (r < 2.2) d = 43.1;                                                               // lantern + cupola
    h = Math.max(h, d);
  }
  if (r < 25.6) {                                                                        // the wings: along the 8 axes, 4.3 m half width
    const a = Math.atan2(x, -z), k = Math.round(a / (Math.PI / 4)), off = Math.abs(Math.sin(a - k * Math.PI / 4)) * r;
    if (off < 4.6) h = Math.max(h, 14.7);
  }
  return h;
}
