// THE CHARACTER SLOT: what is drawn at the controller's interpolated feet. Today a capsule; later an animated
// character (Quaternius / Mixamo glTF) through ONE call, without touching the controller or the camera:
//
//   body.setModel(gltf, { clips: { idle: "Idle", walk: "Walk", run: "Run", jump: "Jump", fall: "Fall" },
//                         walkSpeed: 1.6, runSpeed: 5.0,   // m/s the walk / run clips were authored at (stride match)
//                         scale: 1, forward: "+z", height?: 1.75 })   // height: rescale to this standing height
//   body.update(dt, x, y, z, yaw, { speed, grounded, vy, opacity })
//
// The state machine: idle / walk / run on the ground (walk and run cross-blend by speed, playback rate = speed /
// authored speed so the feet don't skate), jump on take-off, fall when airborne and descending; cross-fades of
// 0.15-0.25 s. Clip names are matched case-insensitively, also as substrings ("Armature|Run" matches "run").
// Fading (camera very close): the capsule swaps to a transparent twin material (both compiled at start: no hitch).
import * as THREE from "three/webgpu";
import { color, float, mix, positionLocal, normalView, uniform, smoothstep, abs, dot, vec3 } from "three/tsl";

const ROLES = ["idle", "walk", "run", "jump", "fall"];
const TARGET = { idle: 0, walk: 0, run: 0, jump: 0, fall: 0 };

export class CharacterBody {
  constructor(scene, { radius = 0.3, height = 1.75 } = {}) {
    this.root = new THREE.Group(); this.root.name = "character";
    scene.add(this.root);
    this.radius = radius; this.height = height;
    this.uOpacity = uniform(1);
    this._buildCapsule();
    this.model = null; this.mixer = null; this.actions = {}; this.state = "";
  }

  _buildCapsule() {
    const r = this.radius, h = this.height;
    const geo = new THREE.CapsuleGeometry(r, h - 2 * r, 12, 32);
    geo.translate(0, h / 2, 0);
    // a soft clay body, a little warmer at the top, a darker band at the hips, a glossy visor showing the facing
    const y = positionLocal.y.div(h);
    const clay = mix(color(0xb9b1a3), color(0xe6dfd2), smoothstep(0.1, 0.95, y));
    const band = smoothstep(0.43, 0.45, y).mul(smoothstep(0.52, 0.50, y));
    const rim = float(1).sub(abs(dot(normalView, vec3(0, 0, 1)))).pow(3).mul(0.18);
    const make = (fade) => {
      const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0 });
      m.colorNode = mix(clay, color(0x5d6670), band.mul(0.85)).add(rim);
      if (fade) { m.transparent = true; m.opacityNode = this.uOpacity; m.depthWrite = false; }
      return m;
    };
    this.matSolid = make(false); this.matFade = make(true);
    this.capsule = new THREE.Mesh(geo, this.matSolid);
    this.capsule.castShadow = true; this.capsule.receiveShadow = true;
    const visorMat = new THREE.MeshStandardNodeMaterial({ color: 0x1d2530, roughness: 0.12, metalness: 0.3 });
    this.visorMats = [visorMat, Object.assign(visorMat.clone(), { transparent: true, depthWrite: false })];
    this.visorMats[1].opacityNode = this.uOpacity;
    // the visor: a thin curved slab on the front (+z) at eye height
    const vg = new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.11, 24, 1, true, -0.75, 1.5);
    this.visor = new THREE.Mesh(vg, visorMat);
    this.visor.position.y = h - r - 0.02; this.visor.castShadow = false;
    this.capsuleGroup = new THREE.Group();
    this.capsuleGroup.add(this.capsule, this.visor);
    this.root.add(this.capsuleGroup);
  }

  /** Objects to render once at start so both material variants are compiled (see warm()). */
  warmVariants() { return [[this.capsule, this.matFade, this.matSolid], [this.visor, this.visorMats[1], this.visorMats[0]]]; }

  /**
   * Swap the capsule for a model. gltf: a loaded GLTF ({ scene, animations }). Returns the clip mapping it found.
   * opts.forward: the model's nose axis ("+z" for glTF characters, "-z", "+x", "-x").
   */
  setModel(gltf, opts = {}) {
    if (this.model) { this.root.remove(this.model); this.mixer?.stopAllAction(); }
    const model = gltf.scene;
    const fwd = { "+z": 0, "-z": Math.PI, "+x": -Math.PI / 2, "-x": Math.PI / 2 }[opts.forward || "+z"] ?? 0;
    const holder = new THREE.Group();
    holder.add(model);
    model.rotation.y = fwd;
    let s = opts.scale ?? 1;
    if (opts.height) {
      const box = new THREE.Box3().setFromObject(model);
      const hh = box.max.y - box.min.y;
      if (hh > 1e-3) s = opts.height / hh;
    }
    holder.scale.setScalar(s);
    // feet on the ground: the model's lowest point at y = 0
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    this.model = holder;
    this.root.add(holder);
    this.capsuleGroup.visible = false;
    // clips
    this.mixer = new THREE.AnimationMixer(model);
    const anims = gltf.animations || [];
    const want = { idle: "idle", walk: "walk", run: "run", jump: "jump", fall: "fall", ...(opts.clips || {}) };
    const found = {};
    for (const [role, name] of Object.entries(want)) {
      const n = String(name).toLowerCase();
      const clip = anims.find((a) => a.name.toLowerCase() === n) || anims.find((a) => a.name.toLowerCase().includes(n));
      if (!clip) continue;
      const act = this.mixer.clipAction(clip);
      if (role === "jump") { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }
      act.enabled = true; act.setEffectiveWeight(0); act.play();
      this.actions[role] = act; found[role] = clip.name;
    }
    this.walkSpeed = opts.walkSpeed ?? 1.6; this.runSpeed = opts.runSpeed ?? 5.0;
    this.state = ""; this._w = { idle: 0, walk: 0, run: 0, jump: 0, fall: 0 };
    return found;
  }

  clearModel() {
    if (this.model) { this.root.remove(this.model); this.mixer?.stopAllAction(); }
    this.model = null; this.mixer = null; this.actions = {}; this.capsuleGroup.visible = true;
  }

  /** x, y, z: feet; yaw: facing (+z forward at 0); st: { speed (horizontal m/s), grounded, vy, opacity } */
  update(dt, x, y, z, yaw, st) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    const op = st.opacity ?? 1;
    this.root.visible = op > 0.02;
    if (!this.model) {
      this.uOpacity.value = op;
      const fade = op < 0.999;
      this.capsule.material = fade ? this.matFade : this.matSolid;
      this.visor.material = this.visorMats[fade ? 1 : 0];
      return;
    }
    // the animation state machine (weights eased toward targets)
    const A = this.actions, w = this._w, target = TARGET;
    for (let i = 0; i < ROLES.length; i++) target[ROLES[i]] = 0;
    let state;
    if (!st.grounded) state = st.vy > 0.5 && A.jump ? "jump" : A.fall ? "fall" : A.jump ? "jump" : "idle";
    else if (st.speed < 0.15) state = "idle";
    else state = "move";
    if (state === "move") {
      // blend walk -> run between the two authored speeds
      const k = A.run && A.walk ? Math.min(1, Math.max(0, (st.speed - this.walkSpeed) / (this.runSpeed - this.walkSpeed))) : A.run ? 1 : 0;
      target.walk = A.walk ? 1 - k : 0; target.run = A.run ? k : 0;
      const rate = A.walk && A.run ? st.speed / (this.walkSpeed + (this.runSpeed - this.walkSpeed) * k) : st.speed / (A.run ? this.runSpeed : this.walkSpeed);
      if (A.walk) A.walk.timeScale = rate;
      if (A.run) A.run.timeScale = rate;
      if (A.walk && A.run) {            // keep the two cycles in phase
        const ph = A.walk.time / A.walk.getClip().duration;
        if (k > 0.5) A.walk.time = (A.run.time / A.run.getClip().duration) * A.walk.getClip().duration;
        else A.run.time = ph * A.run.getClip().duration;
      }
    } else target[state] = 1;
    if (state === "jump" && this.state !== "jump" && A.jump) A.jump.reset().play();
    this.state = state;
    const fadeRate = 1 - Math.exp(-dt / 0.08);
    for (let i = 0; i < ROLES.length; i++) {
      const role = ROLES[i];
      if (!A[role]) continue;
      w[role] += (target[role] - w[role]) * fadeRate;
      A[role].setEffectiveWeight(w[role]);
    }
    this.mixer.update(dt);
  }
}
