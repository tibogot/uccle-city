// THIRD-PERSON MODE: the capsule body, its controller, the spring-arm camera, input and debug, driven together.
// Used by the Capsule Lab (labs/capsule-lab.js) and the city hook (viewer/character/cityHook.js).
//
//   const tp = new ThirdPerson({ scene, camera, dom, world });     world: CollisionWorld (world.js)
//   tp.start(x, y, z, yaw);   per frame: tp.update(dt);   tp.stop();
//   tp.body.setModel(gltf, { clips, walkSpeed, runSpeed })          the animated character, later
//
// The controller runs at a fixed 120 Hz (FixedStepper) and the body + camera use its state interpolated to the
// frame's time, so the motion is the same at 30, 60, 144 or 240 fps. perf.* = CPU ms of this frame (EMA + 1 s max).
//
// A LOCOMOTION character in the slot (the UAL mannequin: body.loco, locomotion.js; ported from claude/character2) adds,
// all in this file and only for it (the Hoodie / Casual / capsule paths are unchanged): the stairs scan ahead
// (_scanStairs: riser, tread, the nosing grid), the body standing on the GROUND LINE on a spring (_bodyY), the ground's
// grade, the turn on the spot (the body's drive: no travel, the facing turned), the speed capped on stairs to the stair
// clip's cadence, CROUCH (key C: the crouch speed, no run) and SPRINT (running 1.5 s on: the sprint speed).
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
    this._step = () => { this.ctl.step(); if (this.ctl.jumped) this._jumped = true; };     // (a jump in any of the frame's steps)
    // (locomotion characters)
    this._gp = new Float64Array(3); this._rise = 0; this._run = 0;
    this._by = { y: 0, v: 0, init: false }; this._ga = 0; this._gb = 0; this._g0 = NaN; this._slope = 0; this._sdx = 0; this._sdz = 1;
    this._stairs = { dir: 0, riser: 0, tread: 0, k: 0, nx: 0, nz: 0, dx: 0, dz: 1, ref: NaN, ahead: 9 };
    this._sh = new Float64Array(26); this._sr = new Float64Array(26); this._st = new Float64Array(26); this._ra = new Float64Array(26); this._scanN = 0;
    this._jumped = false; this._runT = 0; this.sprintAfter = 1.5;
    this.gaits = null;            // { walk, run, sprint, crouch } m/s for a locomotion character (useCharacter)
    this.body.root.visible = false;
  }
  start(x, y, z, yaw = 0) {
    this.on = true;
    this.ctl.teleport(x, y, z, yaw);
    this.body.resetPose?.(); this._by.init = false; this._runT = 0;
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
    if (this.autopilot) this.autopilot(this.ctl.input, dt); else this.input.apply(this.cam, this.ctl);
    const lo = this.body.loco;
    if (lo) this._locoInput(dt, lo);
    this._jumped = false;
    const alpha = this.stepper.advance(dt, this._step);
    const t1 = performance.now();
    const S = this.ctl.sample(alpha, this.S), c = this.ctl;
    this.cam.update(dt, S[0], S[1], S[2], c.radius, c.height, this.world);
    const t2 = performance.now();
    const st = this.bodyState;
    st.speed = Math.sqrt(c.vel[0] * c.vel[0] + c.vel[2] * c.vel[2]); st.grounded = c.grounded; st.vy = c.vel[1]; st.opacity = this.cam.opacity;
    st.gaitWalk = c.p.walkSpeed; st.gaitRun = c.p.runSpeed;
    let by = S[1];
    if (lo) {
      st.vx = c.vel[0]; st.vz = c.vel[2]; st.jumped = this._jumped; st.gravity = c.p.gravity;
      if (this._jumped) st.vyJump = c.vel[1] > 0 ? c.vel[1] : Math.sqrt(2 * c.p.gravity * c.p.jumpHeight);
      const G = this.gaits;
      st.gaitWalk = G.walk; st.gaitRun = G.run; st.gaitSprint = G.sprint; st.gaitCrouch = G.crouch;
      // the ground's grade under the motion (stairs, ramps): |rise| / run of the physics feet, smoothed, and ahead
      const dx = c.pos[0] - this._gp[0], dy = c.pos[1] - this._gp[1], dz = c.pos[2] - this._gp[2], run = Math.sqrt(dx * dx + dz * dz);
      this._gp[0] = c.pos[0]; this._gp[1] = c.pos[1]; this._gp[2] = c.pos[2];
      if (c.grounded && run > 1e-4 && run < 1) { this._rise += Math.abs(dy); this._run += run; }
      const k = Math.exp(-dt / 0.35); this._rise *= k; this._run *= k;
      st.grade = Math.max(this._ga, this._run > 0.02 ? Math.min(2, this._rise / this._run) : 0);
      if (++this._scanN % 3 === 0 || !c.grounded) this._scanStairs(dt * 3);
      st.stairs = this._stairs; st.slope = c.grounded ? this._slope : 0; st.slopeDx = this._sdx; st.slopeDz = this._sdz;
      by = this._bodyY(dt, alpha);
    }
    this.body.update(dt, S[0], by, S[2], S[3], st, this.world);
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
      this.body.clearModel(); this.gaits = null;
      if (this._capsuleSpeeds) { this.ctl.p.walkSpeed = this._capsuleSpeeds[0]; this.ctl.p.runSpeed = this._capsuleSpeeds[1]; this.ctl.p.groundAccel = this._capsuleSpeeds[2]; this.ctl.p.groundDecel = this._capsuleSpeeds[3]; }
      return { name: "capsule" };
    }
    const ch = await loadCharacter(name);
    const found = this.body.setModel(ch.gltf, ch.opts);
    this._capsuleSpeeds ||= [this.ctl.p.walkSpeed, this.ctl.p.runSpeed, this.ctl.p.groundAccel, this.ctl.p.groundDecel];
    if (this.body.loco) {
      // a locomotion character: its gaits' speeds (characterModel.js: the clips' authored speeds within the playback
      // range), a softer acceleration (a run builds up over ~0.4 s; the gaits blend by speed)
      const L = this.body.loco, m = ch.opts.move || {};
      this.gaits = { walk: m.walk || L.walkSpeed, run: m.run || L.runSpeed, sprint: L.role.sprint ? m.sprint || L.sprintSpeed : 0, crouch: L.role.crouchWalk ? m.crouch || L.crouchSpeed : 0 };
      this.ctl.p.walkSpeed = this.gaits.walk; this.ctl.p.runSpeed = this.gaits.run;
      this.ctl.p.groundAccel = m.accel ?? 12; this.ctl.p.groundDecel = m.decel ?? 14;
      this._by.init = false;
    } else {
      // the body's speeds follow its clips, so the cadence looks right: a brisk walk a little above the walk clip's
      // stride, a run up to 30 % above the (jog) clip, at most 4 m/s; playback = speed / authored, capped (body.js)
      this.gaits = null;
      this.ctl.p.walkSpeed = +(this.body.walkSpeed * 1.15).toFixed(2);
      this.ctl.p.runSpeed = +Math.min(4.0, this.body.runSpeed * 1.3).toFixed(2);
      this.ctl.p.groundAccel = this._capsuleSpeeds[2]; this.ctl.p.groundDecel = this._capsuleSpeeds[3];
    }
    if (renderer) {
      // compile both material variants with the model detached while the capsule still shows: no frame waits on it
      const b = this.body, holder = b.model;
      b.root.remove(holder); b.capsuleGroup.visible = true;
      try { for (const [mesh, ...mats] of b.warmModel()) for (const m of mats) { mesh.material = m; await renderer.compileAsync(holder, this.camera, this.scene); } }
      finally { b.capsuleGroup.visible = false; b.root.add(holder); }
    }
    return { ...ch.info, clips: found, walk: +this.body.walkSpeed.toFixed(2), run: +this.body.runSpeed.toFixed(2), moveWalk: this.ctl.p.walkSpeed, moveRun: this.ctl.p.runSpeed, gaits: this.gaits };
  }

  /**
   * A locomotion character's input, before the physics steps: the wish (st.inX / inZ / run / crouch: the body reads it
   * before any cap), crouch and sprint speeds, the turn on the spot (the body's drive from last frame: the facing
   * turned, no travel), the speed capped on stairs to one tread per stair-clip step. No allocation.
   */
  _locoInput(dt, lo) {
    const c = this.ctl, inp = c.input, st = this.bodyState, G = this.gaits;
    st.inX = inp.x; st.inZ = inp.z; st.crouch = !!inp.crouch && !!G.crouch;
    const moving = Math.hypot(inp.x, inp.z) > 0.1;
    if (st.crouch) { inp.run = false; c.p.walkSpeed = G.crouch; } else c.p.walkSpeed = G.walk;
    st.run = !!inp.run;
    // SPRINT: running on for sprintAfter seconds (on the flat: not on stairs, not crouched) builds into the sprint
    this._runT = inp.run && moving && c.grounded && !(this._stairs.k > 0.2) ? this._runT + dt : 0;
    st.sprint = !!G.sprint && this._runT > this.sprintAfter;
    c.p.runSpeed = st.sprint ? G.sprint : G.run;
    // the turn on the spot: no travel this frame, the facing turned by the body's step-turn
    const d = lo.drive;
    if (d.on && c.grounded) {
      if (d.speed === 0) { inp.x = 0; inp.z = 0; }
      if (d.yaw) { c.yaw += d.yaw; c.curr[3] += d.yaw; c.prev[3] += d.yaw; }
    }
    // STAIRS with a stair clip: walked at the clip's own cadence, one tread a step (the stairs as last scanned)
    const sc = this._stairs, cad = sc.k > 0.01 ? this.body.stairCadence(sc.dir) * (inp.run ? lo.p.stairsMaxRate || 1 : 1) : 0;
    if (cad > 0 && sc.tread > 0) {
      const want = inp.run ? c.p.runSpeed : c.p.walkSpeed, il = Math.hypot(inp.x, inp.z);
      const cap = sc.tread * cad, f = il > 1e-3 && want * il > cap ? 1 + (cap / (want * il) - 1) * sc.k : 1;
      inp.x *= f; inp.z *= f;
    }
  }

  /**
   * STAIRS AHEAD, from the step pattern (claude/character2): 26 rays down along the motion, from 0.25 m behind the feet
   * to 1 m ahead (5 cm apart); the jumps between neighbours are the risers. Two or more risers the same way, 8-26 cm
   * high and 18-45 cm apart, are a flight: dir +1 up / -1 down, riser and tread (medians), the nosing grid (ref), k =
   * how sure (eased in / out, from the next riser's distance). Every 3rd frame.
   */
  _scanStairs(dt) {
    const c = this.ctl, W = this.world, R = W.r, H = W.hit, S = this._stairs, h = this._sh;
    let dx = Math.sin(c.yaw), dz = Math.cos(c.yaw);
    const vl = Math.hypot(c.vel[0], c.vel[2]);
    if (vl > 0.2) { dx = c.vel[0] / vl; dz = c.vel[2] / vl; }
    const x0 = c.pos[0], y0 = c.pos[1], z0 = c.pos[2];
    for (let i = 0; i < 26; i++) {
      const s = -0.25 + 0.05 * i;
      R[0] = x0 + dx * s; R[1] = y0 + 0.9; R[2] = z0 + dz * s; R[3] = 0; R[4] = -1; R[5] = 0; H[0] = 2; H[4] = -1;
      W.raycast();
      h[i] = H[4] >= 0 && H[2] > 0.7 ? y0 + 0.9 - H[0] : NaN;
    }
    let n = 0, sgn = 0, last = -1e9, nr = 0, nt = 0;
    const rs = this._sr, ts = this._st, ra = this._ra;
    for (let i = 0; i < 25; i++) {
      const d = h[i + 1] - h[i];
      if (!(Math.abs(d) > 0.06)) continue;                         // (NaN: no ground there)
      const g = d > 0 ? 1 : -1;
      if (sgn && g !== sgn) { n = 0; nr = 0; nt = 0; last = -1e9; }
      sgn = g; n++; rs[nr++] = Math.abs(d);
      // the riser's place between the two samples: bisected (3 more rays: ~6 mm)
      let a = -0.25 + 0.05 * i, b = a + 0.05;
      for (let it = 0; it < 3; it++) {
        const m = (a + b) * 0.5;
        R[0] = x0 + dx * m; R[1] = y0 + 0.9; R[2] = z0 + dz * m; R[3] = 0; R[4] = -1; R[5] = 0; H[0] = 2; H[4] = -1;
        W.raycast();
        const hm = H[4] >= 0 ? y0 + 0.9 - H[0] : h[i];
        if (Math.abs(hm - h[i]) < Math.abs(hm - h[i + 1])) a = m; else b = m;
      }
      const at = (a + b) * 0.5;
      ra[nr - 1] = at;
      if (last > -1e8) ts[nt++] = at - last;
      last = at;
    }
    const med = (arr, m) => {                                       // (in place: no allocation)
      if (!m) return 0;
      for (let i = 1; i < m; i++) { const x = arr[i]; let j = i - 1; while (j >= 0 && arr[j] > x) { arr[j + 1] = arr[j]; j--; } arr[j + 1] = x; }
      return arr[m >> 1];
    };
    // (the risers' places before the medians sort them: the nosing grid)
    let cs = 0, sn = 0, ahead = 9;
    for (let i = 0; i < nr; i++) if (ra[i] > -0.05 && ra[i] < ahead) ahead = ra[i];
    const riser = med(rs, nr), tread = med(ts, nt);
    const ok = c.grounded && n >= 2 && riser >= 0.08 && riser <= 0.26 && tread >= 0.18 && tread <= 0.45;
    if (ok) {
      S.dir = sgn; S.riser = riser; S.tread = tread; S.dx = dx; S.dz = dz;
      // the nosing grid along the motion: the risers' places as a circular mean modulo the tread (one bisection off by
      // a few cm doesn't shift it); kept continuous (the same grid shifted by whole treads is the same grid)
      const base = x0 * dx + z0 * dz, w = 2 * Math.PI / tread;
      for (let i = 0; i < nr; i++) { const a = (base + ra[i]) * w; cs += Math.cos(a); sn += Math.sin(a); }
      let ref = Math.atan2(sn, cs) / w;
      if (S.ref === S.ref) ref += Math.round((S.ref - ref) / tread) * tread;
      S.ref = S.k > 0.05 && S.ref === S.ref ? S.ref + (ref - S.ref) * 0.5 : ref;
      S.nx = x0 + dx * (S.ref - base); S.nz = z0 + dz * (S.ref - base);
    }
    S.ahead = ahead;
    // (the stair gait starts with the step that reaches the next riser, not a metre before)
    const near = ahead > 8 ? 1 : 1 - Math.min(1, Math.max(0, (ahead - 0.25) / 0.5));
    const want = ok ? near * near * (3 - 2 * near) : 0;
    S.k += (want - S.k) * (1 - Math.exp(-(want > S.k ? 10 : 8) * dt));
    if (S.k < 0.01 && !ok) { S.dir = 0; S.ahead = 9; }
  }

  /**
   * The animated body's feet plane (claude/character2): on the ground, the GROUND LINE under it (the mean of the ground
   * at the feet and 0.22 m behind / ahead along the motion: on stairs the line through the nosings, on a kerb a ramp
   * across it, exact on flat ground and slopes), followed by a critically damped spring, so the hips travel smoothly
   * up and down stairs; the body fit (locomotion.js) then puts the planted foot on its tread. In the air: the capsule's
   * interpolated feet. Also the grade ahead and the signed slope along the motion (foot tilt).
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
      const W = this.world, R = W.r, H = W.hit;
      for (let k = -1; k <= 1; k++) {
        R[0] = px + dx * 0.22 * k; R[1] = py + 0.55; R[2] = pz + dz * 0.22 * k; R[3] = 0; R[4] = -1; R[5] = 0; H[0] = 1.1; H[4] = -1;
        W.raycast();
        const ok = H[4] >= 0 && H[2] > 0.5, gy = py + 0.55 - H[0];
        if (ok && Math.abs(gy - py) < 0.5) { sum += gy; n++; }
        if (k === 0) this._g0 = ok && Math.abs(gy - py) < 0.5 ? gy : NaN;
        if (k === -1) this._gb = ok ? gy : NaN;
        else if (k === 1) {
          this._ga = ok && this._gb === this._gb && vl > 0.2 ? Math.min(2, Math.abs(gy - this._gb) / 0.44) : 0;
          const sg = ok && this._gb === this._gb ? Math.max(-1.2, Math.min(1.2, (gy - this._gb) / 0.44)) : 0;
          this._slope += (sg - this._slope) * (1 - Math.exp(-dt / 0.12)); this._sdx = dx; this._sdz = dz;
        }
      }
      if (n) target = sum / n;
      target = Math.min(py + 0.3, Math.max(py - 0.3, target));       // (never more than a step from the capsule's feet)
    }
    if (!B.init) { B.y = target; B.v = 0; B.init = true; }
    else if (dt > 0) {
      const om = c.grounded ? 20 : 45, e = B.y - target, ex = Math.exp(-om * dt), tmp = (B.v + om * e) * dt;
      B.v = (B.v - om * tmp) * ex; B.y = target + (e + tmp) * ex;
    }
    return B.y;
  }
  /** Where the character is (feet, interpolated). */
  get x() { return this.S[0]; } get y() { return this.S[1]; } get z() { return this.S[2]; }
}
