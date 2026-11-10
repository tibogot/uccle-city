// THE CHARACTER SLOT: what is drawn at the controller's interpolated feet. Today a capsule; later an animated
// character (Quaternius / Mixamo glTF) through ONE call, without touching the controller or the camera:
//
//   body.setModel(gltf, { clips: { idle: "Idle", walk: "Walk", run: "Run", jump: "Jump", fall: "Fall" },
//                         walkSpeed: 1.6, runSpeed: 5.0,   // m/s the walk / run clips were authored at (stride match)
//                         scale: 1, forward: "+z", height?: 1.75 })   // height: rescale to this standing height
//   body.update(dt, x, y, z, yaw, { speed, grounded, vy, opacity }, world)    world: foot IK (footIK.js)
//
// The state machine: idle / walk / run on the ground (walk and run cross-blend by speed, playback rate = speed /
// authored speed so the feet don't skate), jump on take-off, fall when airborne and descending; cross-fades of
// 0.15-0.25 s. Clip names are matched case-insensitively, also as substrings ("Armature|Run" matches "run").
// Fading (camera very close): the capsule swaps to a transparent twin material (both compiled at start: no hitch).
import * as THREE from "three/webgpu";
import { color, float, mix, positionLocal, normalView, uniform, smoothstep, abs, dot, vec3 } from "three/tsl";
import { FootIK } from "./footIK.js";
import { Locomotion } from "./locomotion.js";

const ROLES = ["idle", "walk", "run", "jump", "fall", "land", "stairsUp", "stairsDown", "stairsUpRun", "stairsDownRun"];
const TARGET = { idle: 0, walk: 0, run: 0, jump: 0, fall: 0, land: 0, stairsUp: 0, stairsDown: 0, stairsUpRun: 0, stairsDownRun: 0 };

export class CharacterBody {
  constructor(scene, { radius = 0.3, height = 1.75 } = {}) {
    this.root = new THREE.Group(); this.root.name = "character";
    scene.add(this.root);
    this.radius = radius; this.height = height;
    this.uOpacity = uniform(1);
    this._buildCapsule();
    this.model = null; this.mixer = null; this.actions = {}; this.state = "";
    this._ik = { grounded: true, speed: 0, vx: 0, vz: 0, landing: 0 };
    this._wasGrounded = true; this._airTime = 0; this._fallV = 0;
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
   * opts.clips: role -> clip name, or { clip, at } to hold a clip at a fraction of its length (a pose: the pack has
   * no jump clip, so a held run stride stands in). opts.forward: the model's nose axis ("+z", "-z", "+x", "-x").
   * opts.walkSpeed / runSpeed: the ground speed the clips were authored at, in metres (or in the model's own units
   * with opts.speedUnits = "model": they are then scaled with the model). opts.rig: leg bone names for foot IK.
   */
  setModel(gltf, opts = {}) {
    if (this.model) { this.root.remove(this.model); this.mixer?.stopAllAction(); }
    const model = gltf.scene;
    const fwd = { "+z": 0, "-z": Math.PI, "+x": -Math.PI / 2, "-x": Math.PI / 2 }[opts.forward || "+z"] ?? 0;
    const holder = new THREE.Group();
    const inner = new THREE.Group();          // the pelvis drop of foot IK moves this one
    holder.add(inner); inner.add(model);
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
    // materials: each gets a transparent twin for the camera fade (swapped, both compiled up front)
    this.modelMats = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const solid = o.material, fade = solid.clone();
      fade.transparent = true; fade.depthWrite = false; fade.opacityNode = this.uOpacity;
      this.modelMats.push({ mesh: o, solid, fade });
    });
    this.model = holder; this.modelInner = inner; this.modelScale = s;
    this.root.add(holder);
    this.capsuleGroup.visible = false;
    // a character with its own clip set (Mixamo Y Bot): the locomotion graph + light leg IK (locomotion.js)
    if (opts.system === "loco") {
      this.loco = new Locomotion(this, model, inner, gltf.animations || [], opts);
      this.mixer = this.loco.mixer; this.actions = {}; this.hold = {}; this._allClips = gltf.animations || [];
      this.walkSpeed = this.loco.walkSpeed; this.runSpeed = this.loco.runSpeed;
      this.footIK = null; this.legIK = this.loco.ik; this.clipMeta = opts.meta?.clips || {}; this.previewAct = null;
      return Object.fromEntries(Object.entries(this.loco.role).map(([r, c]) => [r, c.name]));
    }
    this.loco = null; this.legIK = null;
    // clips
    this.mixer = new THREE.AnimationMixer(model);
    const anims = gltf.animations || [];
    this._allClips = anims;
    const want = { idle: "idle", walk: "walk", run: "run", jump: "jump", fall: "fall", ...(opts.clips || {}) };
    const found = {};
    this.actions = {}; this.hold = {};
    const find = (name) => { const n = String(name).toLowerCase(); return anims.find((a) => a.name.toLowerCase() === n) || anims.find((a) => a.name.toLowerCase().includes(n)); };
    for (const [role, spec] of Object.entries(want)) {
      const held = typeof spec === "object" && spec;
      let clip = find(held ? spec.clip : spec);
      if (!clip) continue;
      if (held) { clip = clip.clone(); clip.name = `${clip.name}@${spec.at}`; }       // its own action
      const act = this.mixer.clipAction(clip);
      if (held) { act.timeScale = 0; act.time = spec.at * clip.duration; this.hold[role] = spec.at * clip.duration; }
      else if (role === "jump" || role === "land") { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }
      act.enabled = true; act.setEffectiveWeight(0); act.play();
      this.actions[role] = act; found[role] = held ? `${spec.clip} held at ${spec.at}` : clip.name;
    }
    const k = opts.speedUnits === "model" ? s : 1;
    this.walkSpeed = (opts.walkSpeed || 1.4) * k; this.runSpeed = (opts.runSpeed || 4.5) * k;
    this.state = ""; this._w = { idle: 0, walk: 0, run: 0, jump: 0, fall: 0, land: 0, stairsUp: 0, stairsDown: 0, stairsUpRun: 0, stairsDownRun: 0 }; this._landT = 0;
    this.clipMeta = opts.clipMeta || {}; this.previewAct = null;
    this.footIK = opts.rig ? new FootIK(model, inner, opts.rig) : null;
    return found;
  }

  /** Back to standing (a teleport): the clips from their start, idle in full. */
  resetPose() {
    if (this.loco) { this.loco.reset(); return; }
    if (!this.mixer) return;
    for (const role of ROLES) { const a = this.actions[role]; if (!a) continue; a.time = this.hold[role] ?? 0; this._w[role] = role === "idle" ? 1 : 0; a.setEffectiveWeight(this._w[role]); }
    this._wasGrounded = true; this._airTime = 0;
  }

  /** The stair clip for a flight (dir +1 up / -1 down) at a walk or a run (the walk one when there is no run one). */
  stairRole(dir, run) {
    if (this.loco) { const R = this.loco.role; return dir > 0 ? (run && R.stairsUpRun ? "stairsUpRun" : R.stairsUp ? "stairsUp" : null) : (run && R.stairsDownRun ? "stairsDownRun" : R.stairsDown ? "stairsDown" : null); }
    const A = this.actions, up = dir > 0;
    if (run && A[up ? "stairsUpRun" : "stairsDownRun"]) return up ? "stairsUpRun" : "stairsDownRun";
    return A[up ? "stairsUp" : "stairsDown"] ? (up ? "stairsUp" : "stairsDown") : null;
  }
  /** Steps per second of that stair clip at its own speed (a loop = two steps), 0 without one. */
  stairCadence(dir, run) {
    const r = this.stairRole(dir, run);
    if (this.loco) return r ? 2 / this.loco.role[r].dur : 0;
    return r ? 2 / this.actions[r].getClip().duration : 0;
  }

  /** Play one clip alone, looped, in place (lab: check a retargeted clip); null = back to the state machine. */
  setPreview(name) {
    if (this.loco) return this.loco.setPreview(name);
    if (this.previewAct) { this.previewAct.stop(); this.previewAct = null; }
    const clip = name && this.mixer && this.mixer.getRoot().animations?.find?.((a) => a.name === name) || (name && this._allClips?.find((a) => a.name === name));
    if (!clip) return false;
    for (const role of ROLES) if (this.actions[role]) { this._w[role] = 0; this.actions[role].setEffectiveWeight(0); }
    this.previewAct = this.mixer.clipAction(clip); this.previewAct.reset().setLoop(THREE.LoopRepeat).play();
    return true;
  }

  clearModel() {
    if (this.model) { this.root.remove(this.model); this.mixer?.stopAllAction(); }
    this.model = null; this.mixer = null; this.actions = {}; this.footIK = null; this.loco = null; this.legIK = null; this.capsuleGroup.visible = true;
  }

  /** Objects + materials to render once so every variant is compiled up front. */
  warmModel() { return (this.modelMats || []).map((m) => [m.mesh, m.fade, m.solid, ...(m.solidV ? [m.fadeV, m.solidV] : [])]); }

  /**
   * A second lighting for the model, e.g. inside an interior cell (viewer/interior/: lit by the cell's baked probes, not
   * by the city's sun and sky). make(material, fade) -> the variant (made once per material); then useVariant(true/false)
   * swaps every frame's choice. Compile them with warmModel() before the first swap (no hitch).
   */
  setVariant(make) { for (const m of this.modelMats || []) { m.solidV ??= make(m.solid, false); m.fadeV ??= make(m.fade, true); } }
  useVariant(on) { this.variantOn = !!on; }

  /**
   * x, y, z: feet; yaw: facing (+z forward at 0); st: { speed (horizontal m/s), grounded, vy, opacity }.
   * world (optional): the CollisionWorld, for foot IK.
   */
  update(dt, x, y, z, yaw, st, world = null) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    const op = st.opacity ?? 1;
    this.root.visible = op > 0.02;
    this.uOpacity.value = op;
    const fade = op < 0.999;
    if (!this.model) {
      this.capsule.material = fade ? this.matFade : this.matSolid;
      this.visor.material = this.visorMats[fade ? 1 : 0];
      return;
    }
    const v = this.variantOn;
    for (let i = 0; i < this.modelMats.length; i++) { const m = this.modelMats[i]; m.mesh.material = v && m.solidV ? (fade ? m.fadeV : m.solidV) : fade ? m.fade : m.solid; }
    if (dt <= 0) return;                       // (paused: keep the last pose, IK included)
    if (this.loco) {
      this.loco.ikOn = this.ikOn !== false;
      this.loco.update(dt, x, y, z, yaw, st, world);       // (calls body.preIK between the clips and the IK)
      this.ikMs = this.loco.ikMs;
      return;
    }
    // the animation state machine (weights eased toward targets)
    const A = this.actions, w = this._w, target = TARGET;
    for (let i = 0; i < ROLES.length; i++) target[ROLES[i]] = 0;
    // touch-down after a real fall: the landing clip (from its touch-down frame), held while it absorbs, shorter
    // when the body keeps moving
    const landing = st.grounded && !this._wasGrounded && this._airTime > 0.12 ? Math.max(0, -this._fallV) : 0;
    if (st.grounded) this._airTime = 0; else { this._airTime += dt; this._fallV = st.vy; }
    this._wasGrounded = st.grounded;
    if (landing > 2 && A.land) {
      const m = this.clipMeta[A.land.getClip().name], t0 = m?.touchdown ?? 0;
      A.land.reset().play(); A.land.time = t0;
      this._landT = Math.min(0.7, A.land.getClip().duration - t0) * Math.min(1, landing / 5);
    }
    if (this._landT > 0) this._landT -= dt * (st.speed > 1 ? 2.5 : 1);
    let state;
    if (this.previewAct) state = "preview";
    else if (!st.grounded) state = st.vy > 0.5 && A.jump ? "jump" : A.fall ? "fall" : A.jump ? "jump" : "idle";
    else if (this._landT > 0) state = "land";
    else if (st.speed < 0.15) state = "idle";
    else state = "move";
    if (state === "move") {
      // blend walk -> run between the controller's walk and run speeds (st.gaitWalk / gaitRun: at the walk speed the
      // pure walk clip plays, at the run speed the pure run; a mix of the two strides would slide the planted foot),
      // playback rate = speed / the blended authored speed (no skating)
      const g0 = st.gaitWalk ?? this.walkSpeed, g1 = Math.max(g0 + 0.1, st.gaitRun ?? this.runSpeed);
      const k = A.run && A.walk ? Math.min(1, Math.max(0, (st.speed - g0) / (g1 - g0))) : A.run ? 1 : 0;
      target.walk = A.walk ? 1 - k : 0; target.run = A.run ? k : 0;
      // capped: past 1.35x a clip looks frantic; the controller's speeds are set so the cap is not reached (index.js)
      const raw = A.walk && A.run ? st.speed / (this.walkSpeed + (this.runSpeed - this.walkSpeed) * k) : st.speed / (A.run ? this.runSpeed : this.walkSpeed);
      // on stairs and steep ramps: shorter, quicker steps (up to 1.45x the cadence: a step about a tread or two, not
      // a flat-ground stride straddling three nosings); the foot lock holds the planted foot, so the stride shortens
      // (not with a stair clip: it steps tread by tread itself)
      const sck = st.stairs && st.stairs.dir && this.stairRole(st.stairs.dir, false) ? st.stairs.k : 0; this._stairClipK = sck;
      const g = st.grade || 0, gk = (g > 0.2 ? Math.min(1, (g - 0.2) / 0.35) : 0) * (1 - sck), steep = 1 + 0.45 * gk * gk * (3 - 2 * gk);
      const rate = Math.min(1.35 * steep, Math.max(0.5, raw * steep));
      if (A.walk) A.walk.timeScale = rate;
      if (A.run) A.run.timeScale = rate;
      if (A.walk && A.run) {            // keep the two cycles in phase
        const ph = A.walk.time / A.walk.getClip().duration;
        if (k > 0.5) A.walk.time = (A.run.time / A.run.getClip().duration) * A.walk.getClip().duration;
        else A.run.time = ph * A.run.getClip().duration;
      }
      // STAIRS (a stair clip in the slot): blended in by the scan's confidence, played so that one step = one tread
      // (the controller's speed is capped to the clip's own cadence: index.js), in phase with the walk / run it replaces
      const sc = st.stairs, sr = sc && sc.k > 0.01 && sc.dir ? this.stairRole(sc.dir, k > 0.5) : null;
      if (sr) {
        const a = A[sr], kk = sc.k;
        if (w[sr] < 0.01 && A.walk) a.time = (A.walk.time / A.walk.getClip().duration) * a.getClip().duration;
        a.timeScale = Math.min(1.6, Math.max(0.5, st.speed / Math.max(0.15, sc.tread) / (2 / a.getClip().duration)));
        target.walk *= 1 - kk; target.run *= 1 - kk; target[sr] = kk;
      }
    } else if (state !== "preview") target[state] = 1;
    // a jump clip starts at its take-off frame (the body is already in the air)
    if (state === "jump" && this.state !== "jump" && A.jump && this.hold.jump === undefined) { A.jump.reset().play(); A.jump.time = this.clipMeta[A.jump.getClip().name]?.takeoff ?? 0; }
    this.state = state;
    const fadeRate = 1 - Math.exp(-dt / 0.1);
    for (let i = 0; i < ROLES.length; i++) {
      const role = ROLES[i];
      if (!A[role]) continue;
      if (this.hold[role] !== undefined) A[role].time = this.hold[role];
      w[role] += (target[role] - w[role]) * fadeRate;
      A[role].setEffectiveWeight(w[role]);
    }
    if (this.previewAct) this.previewAct.setEffectiveWeight(1);
    this.mixer.update(dt);
    if (this.preIK) this.preIK(y);              // (lab hook: the foot audit reads the animated pose here)
    if (this.footIK && world) {
      const t0 = performance.now();
      this.root.updateMatrixWorld(true);
      // on the ground (walking and running), off in the air; a touch-down passes its fall speed (the landing absorb)
      const ik = this._ik;
      ik.grounded = st.grounded; ik.speed = st.speed; ik.vx = st.vx ?? 0; ik.vz = st.vz ?? 0; ik.grade = (st.grade || 0) * (1 - (this._stairClipK || 0));
      ik.landing = landing;
      this.footIK.update(dt, world, y, ik, this.ikOn !== false);
      this.ikMs = (this.ikMs || 0) * 0.95 + (performance.now() - t0) * 0.05;
    }
  }
}
