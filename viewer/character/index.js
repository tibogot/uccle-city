// THIRD-PERSON MODE: the capsule body, its controller, the spring-arm camera, input and debug, driven together.
// Used by the Capsule Lab (labs/capsule-lab.js) and the city hook (viewer/character/cityHook.js).
//
//   const tp = new ThirdPerson({ scene, camera, dom, world });     world: CollisionWorld (world.js)
//   tp.start(x, y, z, yaw);   per frame: tp.update(dt);   tp.stop();
//   tp.body.setModel(gltf, { clips, walkSpeed, runSpeed })          the animated character, later
//
// The controller runs at a fixed 120 Hz (FixedStepper) and the body + camera use its state interpolated to the
// frame's time, so the motion is the same at 30, 60, 144 or 240 fps. perf.* = CPU ms of this frame (EMA + 1 s max).
import { CharacterController, FixedStepper } from "./controller.js";
import { ThirdPersonCamera } from "./camera.js";
import { CharacterBody } from "./body.js";
import { CharacterInput } from "./input.js";
import { CharacterDebug } from "./debugDraw.js";
import { loadCharacter, CHARACTERS } from "./characterModel.js";

export { CollisionWorld, Heightfield, Contacts } from "./world.js";
export { TriBVH } from "./bvh.js";
export { PrismSet } from "./prisms.js";
export { CHARACTERS } from "./characterModel.js";

export class ThirdPerson {
  constructor({ scene, camera, dom, world, controller = {}, cam = {}, hz = 120, pointerLock = false }) {
    Object.assign(this, { scene, camera, world, on: false });
    this.ctl = new CharacterController(world, controller);
    this.cam = new ThirdPersonCamera(camera, cam);
    this.body = new CharacterBody(scene, { radius: this.ctl.radius, height: this.ctl.height });
    this.input = new CharacterInput(dom, { active: () => this.on, pointerLock });
    this.debug = new CharacterDebug(scene, this.ctl.radius, this.ctl.height);
    this.stepper = new FixedStepper(hz);
    this.ctl.dt = 1 / hz;
    this.S = new Float64Array(4);
    this.perf = { ms: 0, physMs: 0, camMs: 0, animMs: 0, ikMs: 0, maxMs: 0, steps: 0, _max: 0, _t: 0 };
    this.bodyState = { speed: 0, grounded: true, vy: 0, opacity: 1, gaitWalk: 2, gaitRun: 5.5 };
    this._gp = new Float64Array(3); this._rise = 0; this._run = 0;
    this._by = { y: 0, v: 0, init: false };
    this.stairSlow = 0.3;             // speed taken off on stairs / steep ramps with a character in the slot
    this._step = () => this.ctl.step();          // no argument: the controller reads its own dt
    this.body.root.visible = false;
  }
  start(x, y, z, yaw = 0) {
    this.on = true;
    this.ctl.teleport(x, y, z, yaw);
    this.body.footIK?.reset?.(); this.body.resetPose?.();
    this._by.init = false;
    this.cam.reset(yaw + Math.PI);          // behind the character, looking where it faces
    this.stepper.acc = 0;
    this.body.root.visible = true;
  }
  stop() { this.on = false; this.body.root.visible = false; this.debug.visible = false; if (document.pointerLockElement) document.exitPointerLock?.(); }
  setHz(hz) { this.stepper.dt = this.ctl.dt = 1 / hz; }
  /** Resize the capsule (controller, body, debug) */
  setSize(radius, height) {
    this.ctl.p.radius = radius; this.ctl.p.height = height;
    this.body.root.remove(this.body.capsuleGroup);
    const was = this.body.capsuleGroup.visible;
    this.body.radius = radius; this.body.height = height; this.body._buildCapsule(); this.body.capsuleGroup.visible = was;
    this.debug.setSize(radius, height);
  }

  update(dt) {
    if (!this.on) return;
    const t0 = performance.now();
    // autopilot(input, dt): scripted motion (the lab's foot audit) instead of the keyboard
    if (this.autopilot) this.autopilot(this.ctl.input, dt); else this.input.apply(this.cam, this.ctl);
    // steep ground (stairs, a steep ramp) slows a walking body a little: one tread per step, not a flat stride
    // straddling three nosings (the grade is last frame's; the capsule alone keeps its speed)
    if (this.body.model && this.stairSlow > 0) {
      const g = this.bodyState.grade || 0, gk = g > 0.25 ? Math.min(1, (g - 0.25) / 0.35) : 0, f = 1 - this.stairSlow * gk * gk * (3 - 2 * gk);
      this.ctl.input.x *= f; this.ctl.input.z *= f;
    }
    const alpha = this.stepper.advance(dt, this._step);
    const t1 = performance.now();
    const S = this.ctl.sample(alpha, this.S), c = this.ctl;
    this.cam.update(dt, S[0], S[1], S[2], c.radius, c.height, this.world);
    const t2 = performance.now();
    const st = this.bodyState;
    st.speed = Math.sqrt(c.vel[0] * c.vel[0] + c.vel[2] * c.vel[2]); st.grounded = c.grounded; st.vy = c.vel[1]; st.vx = c.vel[0]; st.vz = c.vel[2]; st.opacity = this.cam.opacity;
    st.gaitWalk = c.p.walkSpeed; st.gaitRun = c.p.runSpeed;
    // the ground's grade under the motion (stairs, ramps): |rise| / run of the physics feet, smoothed; the body takes
    // shorter, quicker steps on it (body.js)
    {
      const dx = c.pos[0] - this._gp[0], dy = c.pos[1] - this._gp[1], dz = c.pos[2] - this._gp[2], run = Math.sqrt(dx * dx + dz * dz);
      this._gp[0] = c.pos[0]; this._gp[1] = c.pos[1]; this._gp[2] = c.pos[2];
      if (c.grounded && run > 1e-4 && run < 1) { this._rise += Math.abs(dy); this._run += run; }
      const k = Math.exp(-dt / 0.35); this._rise *= k; this._run *= k;
      st.grade = this._run > 0.02 ? Math.min(2, this._rise / this._run) : 0;
    }
    this.body.update(dt, S[0], this.model ? this._bodyY(dt, alpha) : S[1], S[2], S[3], st, this.world);
    this.debug.update(c, this.cam, S[0], S[1], S[2]);
    const t3 = performance.now(), P = this.perf, ms = t3 - t0;
    P.physMs = P.physMs * 0.95 + (t1 - t0) * 0.05; P.camMs = P.camMs * 0.95 + (t2 - t1) * 0.05; P.ms = P.ms * 0.95 + ms * 0.05;
    P.animMs = P.animMs * 0.95 + (t3 - t2) * 0.05; P.ikMs = this.body.ikMs || 0;
    P.steps = this.stepper.steps;
    P._max = Math.max(P._max, ms);
    if (t3 - P._t > 1000) { P.maxMs = P._max; P._max = 0; P._t = t3; }
  }
  get model() { return this.body.model; }
  /**
   * The animated body's feet plane: on the ground, the GROUND LINE under it (the mean of the ground at the feet and
   * 0.22 m behind / ahead along the motion: on stairs the line through the nosings, on a kerb a ramp across it, exact
   * on flat ground and slopes), followed by a critically damped spring; so the hips travel smoothly up and down
   * stairs instead of jumping a riser per step (the capsule's own step lag reads as a jolt per step and lags a step
   * behind going down: the front foot then had to reach two treads). The feet are placed by the foot IK in the world.
   * In the air: the capsule's interpolated feet.
   */
  _bodyY(dt, alpha) {
    const c = this.ctl, a = c.prev, b = c.curr, B = this._by;
    const px = a[0] + (b[0] - a[0]) * alpha, py = a[1] + (b[1] - a[1]) * alpha, pz = a[2] + (b[2] - a[2]) * alpha;
    let target = py;
    if (c.grounded) {
      const vx = c.vel[0], vz = c.vel[2], vl = Math.sqrt(vx * vx + vz * vz);
      let dx = Math.sin(c.yaw), dz = Math.cos(c.yaw);
      if (vl > 0.2) { dx = vx / vl; dz = vz / vl; }
      let sum = 0, n = 0;
      for (let k = -1; k <= 1; k++) {
        const W = this.world, R = W.r, H = W.hit;
        R[0] = px + dx * 0.22 * k; R[1] = py + 0.55; R[2] = pz + dz * 0.22 * k; R[3] = 0; R[4] = -1; R[5] = 0; H[0] = 1.1; H[4] = -1;
        W.raycast();
        if (H[4] >= 0 && H[2] > 0.5) { const gy = py + 0.55 - H[0]; if (Math.abs(gy - py) < 0.5) { sum += gy; n++; } }
      }
      if (n) target = sum / n;
      // never more than a step from the capsule's own feet
      target = Math.min(py + 0.3, Math.max(py - 0.3, target));
    }
    if (!B.init) { B.y = target; B.v = 0; B.init = true; }
    else if (dt > 0) {
      const om = c.grounded ? 20 : 45, e = B.y - target, ex = Math.exp(-om * dt), tmp = (B.v + om * e) * dt;
      B.v = (B.v - om * tmp) * ex; B.y = target + (e + tmp) * ex;
    }
    return B.y;
  }
  /**
   * Put a character from models/characters/ in the slot ("capsule" = back to the capsule). Its materials are
   * compiled before it shows (renderer: compileAsync), so the swap does not hitch. Resolves to its info.
   */
  async useCharacter(name, renderer = null) {
    if (!name || name === "capsule") {
      this.body.clearModel();
      if (this._capsuleSpeeds) { this.ctl.p.walkSpeed = this._capsuleSpeeds[0]; this.ctl.p.runSpeed = this._capsuleSpeeds[1]; }
      return { name: "capsule" };
    }
    const ch = await loadCharacter(name);
    const found = this.body.setModel(ch.gltf, ch.opts);
    // the body's speeds follow its clips, so the cadence looks right: a brisk walk a little above the walk clip's
    // stride, a run up to 30 % above the (jog) clip, at most 4 m/s; playback = speed / authored, capped (body.js)
    this._capsuleSpeeds ||= [this.ctl.p.walkSpeed, this.ctl.p.runSpeed];
    this.ctl.p.walkSpeed = +(this.body.walkSpeed * 1.15).toFixed(2);
    this.ctl.p.runSpeed = +Math.min(4.0, this.body.runSpeed * 1.3).toFixed(2);
    if (renderer) {
      // compile both material variants with the model detached while the capsule still shows: no frame waits on it
      const b = this.body, holder = b.model;
      b.root.remove(holder); b.capsuleGroup.visible = true;
      try { for (const [mesh, ...mats] of b.warmModel()) for (const m of mats) { mesh.material = m; await renderer.compileAsync(holder, this.camera, this.scene); } }
      finally { b.capsuleGroup.visible = false; b.root.add(holder); }
    }
    return { ...ch.info, clips: found, walk: +this.body.walkSpeed.toFixed(2), run: +this.body.runSpeed.toFixed(2), moveWalk: this.ctl.p.walkSpeed, moveRun: this.ctl.p.runSpeed };
  }
  /** Where the character is (feet, interpolated). */
  get x() { return this.S[0]; } get y() { return this.S[1]; } get z() { return this.S[2]; }
}
