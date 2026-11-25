// THE PLAYER'S FALCON (Falcon Flight Lab): the family's rig (models/bird/peregrine.glb through viewer/falcons.js
// loadFalconAssets: trimmed clips + the baked Perch pose), the juvenile plumage (the young of the year), the clips
// blended from the flight model (Flap with the wingbeat, Glide, Perch), and the procedural layers of
// viewer/birdRig.js on top, with three new ones for this lab:
//   tuck    the full stoop tuck: beyond the fold layer, the hand folded tight under the arm (wing_3), the wrists in
//   flare   the landing flare: the wings forward and up, the tail fanned down (the brake layer + more)
//   talons  the legs swung forward and down, the feet open (the strike, the landing's last metre)
// No new model (a later step: docs/FALCONS.md "what still looks weak").
import * as THREE from "three/webgpu";
import { texture, uv } from "three/tsl";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { loadFalconAssets } from "../falcons.js";
import { BirdRig } from "../birdRig.js";
import { FUN, FUN_OLD } from "./falconFun.js";
import { HeldPrey } from "./heldPrey.js";

const MODEL_SPAN = 6.44;   // peregrine.glb wingspan in model units (viewer/falcons.js)
/** (falcon fun round 3) the grip: the toes curled (rad) round the held pigeon, sunk this share of its depth into its
 *  plumage (the closed toes, no gap), blended in from where it was struck over FUN.strike.grip s of game time */
export const GRIP = { curl: 0.85, sink: 0.12, blend: FUN.strike.grip, talons: 0.45, from: 1.6 };
/** held: rolled belly-up against the feet, head forward (prey_carry's head is its -z end, the narrow round one; its
 *  +z end the flat tail fan: the root's forward is -z too, so no turn; the old carry's half turn held it tail first), a
 *  little nose-down; laid (perched): belly-down on the ledge, head forward */
const Q_HOLD = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, Math.PI, "YXZ"));
const Q_LAID = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _g = new THREE.Vector3(), _o = new THREE.Vector3(), _t = new THREE.Vector3();
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

/** viewer/falcons.js applyBodyScale (private there; the Perch clip was baked on it): the body 1.3x, wings back to span */
function applyBodyScale(root) {
  const S = (n, k) => { const b = root.getObjectByName(n); if (b) b.scale.multiplyScalar(k); };
  S("hips", 1.3); S("wing_1_L", 1 / 1.3); S("wing_1_R", 1 / 1.3); S("tail_1", 1.12);
}

export class FalconBird {
  static async create(span = 2.0) {
    const A = await loadFalconAssets();
    return new FalconBird(A, span);
  }
  constructor(A, span) {
    this.A = A;
    this.root = new THREE.Group(); this.root.name = "player-falcon";
    const model = cloneSkinned(A.bird.scene);
    model.rotation.y = Math.PI;                        // nose +z in the model, -z for the root
    this.model = model;
    let mesh = null; model.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.78, metalness: 0 });
    mat.colorNode = texture(A.juvTex, uv()).rgb;
    mesh.material = mat; mesh.geometry = A.geo0;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    this.mesh = mesh;
    this.root.add(model);
    applyBodyScale(model);
    this.mixer = new THREE.AnimationMixer(model);
    const clip = (n) => A.clips.find((c) => c.name === n);
    this.actions = { perch: this.mixer.clipAction(clip("Perch")), flap: this.mixer.clipAction(clip("Flap")), glide: this.mixer.clipAction(clip("Glide")) };
    this.w = { perch: 0, flap: 0, glide: 1 };
    for (const [k, a] of Object.entries(this.actions)) { a.play(); a.setEffectiveWeight(this.w[k]); }
    this.flapDur = clip("Flap").duration;
    this.rig = new BirdRig(this.root);
    // the family's extra layers + this lab's
    this.rig.addLayer("spreadL", "wing_1_L", "wing_tip_L", [-1, 0, 0]);
    this.rig.addLayer("spreadR", "wing_1_R", "wing_tip_R", [1, 0, 0]);
    this.rig.addLayer("handL", "wing_3_L", "wing_tip_L", [0.3, 0, 1]);           // tuck: the hand back along the arm
    this.rig.addLayer("handR", "wing_3_R", "wing_tip_R", [-0.3, 0, 1]);
    this.rig.addLayer("wristL", "wing_2_L", "wing_tip_L", [0.4, -0.3, 0.6]);     // tuck: the wrists in and down to the flanks
    this.rig.addLayer("wristR", "wing_2_R", "wing_tip_R", [-0.4, -0.3, 0.6]);
    this.rig.addLayer("raiseL", "wing_1_L", "wing_tip_L", [0, 1, 0]);            // flare: the wings up
    this.rig.addLayer("raiseR", "wing_1_R", "wing_tip_R", [0, 1, 0]);
    this.rig.addLayer("talonL", "UpperLeg_L", "Toes_tip_L", [0, -0.4, -1]);      // talons: legs forward and down
    this.rig.addLayer("talonR", "UpperLeg_R", "Toes_tip_R", [0, -0.4, -1]);
    this.rig.addLayer("headDown", "head", "mouth_upper_tip", [0, -1, 0]);
    // (round 3) the grip: the toes closed (their tips down and back, round the pigeon under the feet)
    this.rig.addLayer("gripL", "Toes_L", "Toes_tip_L", [0, -1, 0.5]);
    this.rig.addLayer("gripR", "Toes_R", "Toes_tip_R", [0, -1, 0.5]);
    const Bn = (n) => this.root.getObjectByName(n);
    this.toes = Bn("Toes_L") && Bn("Toes_R") && Bn("Toes_tip_L") && Bn("Toes_tip_R") ? { l: Bn("Toes_L"), r: Bn("Toes_R"), lt: Bn("Toes_tip_L"), rt: Bn("Toes_tip_R") } : null;
    this.lay = { fold: 0, tuck: 0, flare: 0, talons: 0, bank: 0, legs: 0.4, head: 0 };
    this.extra = { spreadL: 0, spreadR: 0, handL: 0, handR: 0, wristL: 0, wristR: 0, raiseL: 0, raiseR: 0, talonL: 0, talonR: 0, headDown: 0, gripL: 0, gripR: 0 };
    this.flapPhase = 0; this.lastFlapPhase = 0; this.downstroke = false;
    this.setSpan(span);
    this.prey = null;
    // (round 3 part B) the caught bird itself in the talons (heldPrey.js): one pooled mesh, hidden until a catch
    this.held = FUN_OLD ? null : new HeldPrey();
    if (this.held) this.root.add(this.held.mesh);
  }

  setSpan(span) { this.span = span; this.model.scale.setScalar(span / MODEL_SPAN); }

  /** a pigeon in the talons (the nest's prey_carry mesh of viewer/falcons.js, as the family carries it).
   *  (falcon fun round 3, the owner: "the prey should look really inside the hands of the falcon") from = the pigeon's
   *  world position when it was struck: it is blended from there into the GRIP over FUN.strike.grip s, then held by the
   *  feet every frame (holdPrey: the toe bones, belly against the closed toes, head forward). ?falconfun=old: the fixed
   *  offset under the body as before.
   *  (round 3 part B) look = { shape, scale, tint } (the caught bird as its flock draws it: PreyMux / Pigeons heldLook):
   *  the pooled held bird of that species, plumage and size (heldPrey.js) instead of the nest's grey prey_carry; a new
   *  catch with a bird already held (the fun game hunts on with prey): the talons take the new one (it shows) */
  carry(preyMesh, material, from = null, look = null) {
    const own = !!(look && this.held && this.toes);
    if (this.prey && !(own && this.prey === this.held.mesh)) return;
    this.prey = null;
    const k = this.span / 1.10;
    let p;
    if (own) p = this.held.show(look);
    else {
      if (!preyMesh) return;
      p = preyMesh.clone(); if (material) p.material = material;
      this.root.add(p);
    }
    p.position.set(0, -0.13 * k, 0.04 * k); p.rotation.set(0.15, Math.PI, 0); p.scale.setScalar(own ? look.scale : 0.95 * k);
    this.prey = p;
    if (FUN_OLD || !this.toes) return;
    if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
    const bb = p.geometry.boundingBox, H = (this.hold ??= { belly: new THREE.Vector3(), depth: 0, len: 0, k: 1, from: new THREE.Vector3(), has: false, perch: 0, err: 0, top: 0, s: 1, own: false });
    // (the held bird's own size: its flock's draw scale; prey_carry: 0.95 x the falcon's scale, as before)
    H.s = own ? look.scale : 0.95 * k; H.own = own;
    // the contact: the middle of the belly (the mesh's lowest face, between its breast and its vent)
    H.belly.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) * 0.5);
    H.depth = bb.max.y - bb.min.y; H.len = bb.max.z - bb.min.z;
    H.has = !!from; H.k = from ? 0 : 1;
    // (struck: it starts where it flew, the blend carries it in from there: no first frame at the old offset)
    // (kept in the falcon's frame: the pigeon is carried along as the talons close on it, not left behind in the air)
    // (at most GRIP.from x the scale from the talons: the 5.5 m automatic grab would slide it in over metres, a magnet;
    // browser check: a jackdaw caught 5 m off crossed half the screen into the feet)
    if (from) {
      this.root.updateMatrixWorld(true); H.from.set(from.x, from.y, from.z); this.root.worldToLocal(H.from);
      this.gripPoint(_g); _c.subVectors(H.from, _g); const L = _c.length(), mx = GRIP.from * k;
      if (L > mx) H.from.copy(_g).addScaledVector(_c, mx / L);
      p.position.copy(H.from);
    }
    p.matrixAutoUpdate = true;
  }
  drop() { if (!this.prey) return null; const p = this.prey; this.prey = null; if (this.held && p === this.held.mesh) this.held.hide(); else p.removeFromParent(); return p; }

  /** (round 3) the grip point, root-local: between the two feet, 35 % of the way from the toes' roots to their tips
   *  (where the closed toes meet the pigeon); out (Vector3) */
  gripPoint(out, world = false) {
    const T = this.toes;
    const k = this.gripAlong ?? 0.35;                  // (a bird's own: v2's toes, gymBird.js)
    T.l.getWorldPosition(_a); T.lt.getWorldPosition(_b); _a.lerp(_b, k);
    T.r.getWorldPosition(_b); T.rt.getWorldPosition(_c); _b.lerp(_c, k);
    out.copy(_a).add(_b).multiplyScalar(0.5);
    return world ? out : this.root.worldToLocal(out);
  }
  /** (round 3) the pigeon held at the talons, after the pose: belly up against the closed toes (sunk GRIP.sink of its
   *  depth into the plumage: no gap), head forward, body along the falcon's; the strike's blend from where it flew;
   *  perched: laid on the ledge under the feet (the falcon stands on it, mantling) */
  holdPrey(dt, mode) {
    const p = this.prey, H = this.hold, s = H.s;
    this.root.updateMatrixWorld(true);
    this.gripPoint(_g);
    H.perch = ease(H.perch, mode === "perch" ? 1 : 0, 6, dt);
    // held: the belly up (rolled over), the head forward (-z), a little nose-down along the falcon's body
    p.quaternion.copy(this.gripQ ?? Q_HOLD).slerp(Q_LAID, H.perch);   // (gripQ: a bird's own hold, gymBird.js v2)
    p.scale.setScalar(s);
    _o.copy(H.belly).multiplyScalar(s).applyQuaternion(p.quaternion);
    _t.copy(_g).sub(_o);
    _t.y += GRIP.sink * H.depth * s * (1 - H.perch);
    // (gripFwd: a bird whose tail base hangs low behind its feet (v2, gymBird.js) holds it this share of its span forward)
    if (this.gripFwd) _t.z -= this.gripFwd * this.span * (1 - H.perch);
    // perched: laid belly-down on the surface the feet stand on (the root's height), just ahead of the feet, the toes on it
    if (H.perch > 0) {
      _c.copy(H.belly).multiplyScalar(s).applyQuaternion(Q_LAID);
      _o.set(_g.x - _c.x, -_c.y, _g.z - H.len * s * 0.3 - _c.z);
      _t.lerp(_o, H.perch);
    }
    if (H.k < 1 && H.has) {
      H.k = Math.min(1, H.k + dt / GRIP.blend);
      _c.copy(H.from);
      // (from where the pigeon was, in the falcon's frame: its centre, the mesh's middle, to the held spot)
      _o.set(0, (H.depth / 2) * s, 0).applyQuaternion(p.quaternion);
      const e = H.k * H.k * (3 - 2 * H.k);
      p.position.copy(_c).sub(_o).lerp(_t, e);
    } else { H.k = 1; p.position.copy(_t); }
    p.updateMatrix();
  }
  /** (round 3, the falconfun row) the held pigeon's belly to the talons' grip point (m, world) and how far its highest
   *  corner rises over the grip (m, the falcon's frame: > 0 = into the falcon's body) */
  gripCheck() {
    const p = this.prey, H = this.hold;
    if (!p || !H) return null;
    this.root.updateMatrixWorld(true);
    this.gripPoint(_g, true);
    _o.copy(H.belly).applyMatrix4(p.matrixWorld);
    const err = _o.distanceTo(_g);
    const bb = p.geometry.boundingBox;
    this.gripPoint(_g);
    let top = -Infinity;
    for (let i = 0; i < 8; i++) {
      _c.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(p.matrix);
      top = Math.max(top, _c.y - _g.y);
    }
    return { err, top, k: H.k, scale: this.span };
  }

  /**
   * f: the flight state { heading, gamma, alpha, phi, fold, flapLevel, brake, V }; mode: "fly" | "perch" | "land";
   * talons 0..1. Sets the root transform, the clip weights and the layers.
   */
  pose(dt, pos, f, { mode = "fly", talons = 0, perchYaw = 0, look = 0 } = {}) {
    this.root.position.copy(pos);
    if (mode === "perch") this.root.rotation.set(0, perchYaw, 0, "YXZ");
    else this.root.rotation.set(f.gamma + f.alpha * 0.8, f.heading, -f.phi, "YXZ");
    // clips: perch / flap / glide (eased, sum 1); the wingbeat speeds up with the effort
    const flapping = f.flapLevel > 0.08;
    const tw = mode === "perch" ? { perch: 1, flap: 0, glide: 0 } : flapping ? { perch: 0, flap: 1, glide: 0 } : { perch: 0, flap: 0, glide: 1 };
    if (mode === "land") { tw.perch = 0.25; tw.flap = 0.55; tw.glide = 0.2; }
    let sum = 0;
    for (const k in this.w) { this.w[k] = ease(this.w[k], tw[k], mode === "perch" ? 6 : 7, dt); sum += this.w[k]; }
    for (const k in this.w) this.actions[k].setEffectiveWeight(this.w[k] / Math.max(sum, 1e-4));
    this.actions.flap.timeScale = 0.9 + 1.0 * f.flapLevel + (mode === "land" ? 0.6 : 0);
    // the downstroke event (for the wing sound): the flap clip's phase crossing its start
    const ph = this.actions.flap.time / this.flapDur;
    this.downstroke = this.w.flap > 0.3 && ph < this.lastFlapPhase;
    this.lastFlapPhase = ph;
    // layers
    const L = this.lay, tuck = mode === "fly" ? Math.max(0, (f.fold - 0.5) / 0.5) : 0;
    L.fold = ease(L.fold, mode === "fly" ? Math.min(1, f.fold * 1.6) : 0, 9, dt);
    L.tuck = ease(L.tuck, tuck, 8, dt);
    L.flare = ease(L.flare, mode === "land" ? 1 : f.brake, 6, dt);
    L.talons = ease(L.talons, talons, 10, dt);
    L.bank = ease(L.bank, mode === "fly" ? -f.phi : 0, 6, dt);
    L.legs = ease(L.legs, mode === "fly" && !talons ? 0.5 * (1 - L.flare) : 0, 4, dt);
    L.head = ease(L.head, mode === "fly" ? Math.max(0, -f.gamma) * 0.5 + look : look, 4, dt);
    const E = this.extra;
    E.handL = E.handR = 0.9 * L.tuck; E.wristL = E.wristR = 0.45 * L.tuck;
    E.spreadL = E.spreadR = 0.15 * L.flare - 0.1 * L.tuck;
    E.raiseL = E.raiseR = 0.35 * L.flare;
    E.talonL = E.talonR = 1.1 * Math.max(L.talons, L.flare * 0.8);
    E.headDown = L.head;
    // (round 3) the toes close round the held pigeon as it reaches them
    const H = this.prey && this.hold && !FUN_OLD ? this.hold : null;
    E.gripL = E.gripR = H ? GRIP.curl * H.k * H.k * (1 - 0.4 * H.perch) : 0;
    this.rig.restore();
    this.mixer.update(dt);
    this.rig.apply({ fold: L.fold, bank: L.bank, legs: L.legs, brake: L.flare, extra: E });
    if (H && this.toes) this.holdPrey(dt, mode);
  }
}
