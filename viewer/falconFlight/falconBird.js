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

const MODEL_SPAN = 6.44;   // peregrine.glb wingspan in model units (viewer/falcons.js)
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
    this.lay = { fold: 0, tuck: 0, flare: 0, talons: 0, bank: 0, legs: 0.4, head: 0 };
    this.extra = { spreadL: 0, spreadR: 0, handL: 0, handR: 0, wristL: 0, wristR: 0, raiseL: 0, raiseR: 0, talonL: 0, talonR: 0, headDown: 0 };
    this.flapPhase = 0; this.lastFlapPhase = 0; this.downstroke = false;
    this.setSpan(span);
    this.prey = null;
  }

  setSpan(span) { this.span = span; this.model.scale.setScalar(span / MODEL_SPAN); }

  /** a pigeon in the talons (the nest's prey_carry mesh of viewer/falcons.js, as the family carries it) */
  carry(preyMesh, material) {
    if (this.prey || !preyMesh) return;
    const p = preyMesh.clone(); if (material) p.material = material;
    const k = this.span / 1.10;
    p.position.set(0, -0.13 * k, 0.04 * k); p.rotation.set(0.15, Math.PI, 0); p.scale.setScalar(0.95 * k);
    this.root.add(p); this.prey = p;
  }
  drop() { if (!this.prey) return null; const p = this.prey; this.prey = null; p.removeFromParent(); return p; }

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
    this.rig.restore();
    this.mixer.update(dt);
    this.rig.apply({ fold: L.fold, bank: L.bank, legs: L.legs, brake: L.flare, extra: E });
  }
}
