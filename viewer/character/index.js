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
    this._step = () => this.ctl.step();          // no argument: the controller reads its own dt
    this.body.root.visible = false;
  }
  start(x, y, z, yaw = 0) {
    this.on = true;
    this.ctl.teleport(x, y, z, yaw);
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
    this.input.apply(this.cam, this.ctl);
    const alpha = this.stepper.advance(dt, this._step);
    const t1 = performance.now();
    const S = this.ctl.sample(alpha, this.S), c = this.ctl;
    this.cam.update(dt, S[0], S[1], S[2], c.radius, c.height, this.world);
    const t2 = performance.now();
    const st = this.bodyState;
    st.speed = Math.sqrt(c.vel[0] * c.vel[0] + c.vel[2] * c.vel[2]); st.grounded = c.grounded; st.vy = c.vel[1]; st.opacity = this.cam.opacity;
    st.gaitWalk = c.p.walkSpeed; st.gaitRun = c.p.runSpeed;
    this.body.update(dt, S[0], S[1], S[2], S[3], st, this.world);
    this.debug.update(c, this.cam, S[0], S[1], S[2]);
    const t3 = performance.now(), P = this.perf, ms = t3 - t0;
    P.physMs = P.physMs * 0.95 + (t1 - t0) * 0.05; P.camMs = P.camMs * 0.95 + (t2 - t1) * 0.05; P.ms = P.ms * 0.95 + ms * 0.05;
    P.animMs = P.animMs * 0.95 + (t3 - t2) * 0.05; P.ikMs = this.body.ikMs || 0;
    P.steps = this.stepper.steps;
    P._max = Math.max(P._max, ms);
    if (t3 - P._t > 1000) { P.maxMs = P._max; P._max = 0; P._t = t3; }
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
