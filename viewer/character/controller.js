// THE KINEMATIC CAPSULE CONTROLLER (third-person body; the same body walks into the house interiors).
//
// A vertical capsule (radius r, height h, feet at `pos`) moved by velocity, at a FIXED step (default 120 Hz, see
// FixedStepper): render code interpolates between the last two states, so the motion is smooth at any frame rate.
// One step:
//   1. input -> wanted horizontal velocity (camera-relative), accelerated toward it (ground / air rates)
//   2. jump (buffered, with coyote time), gravity when airborne
//   3. MOVE in substeps no longer than 0.4 r (no tunnelling at run or fall speed), each followed by RESOLVE: the
//      contacts of the capsule with the world (world.js) pushed out one by one, re-projected as the capsule moves
//      (collide-and-slide: the velocity loses its part into each blocking normal, so it slides along walls),
//      several iterations. A contact is
//        ground   walkable normal (ny >= cos slope limit) under the bottom sphere centre: pushed straight UP (no
//                 sliding down ramps when standing), lands the capsule
//        wall     steeper, or any side contact: pushed HORIZONTALLY while grounded (a steep slope can't be
//                 climbed), along its normal in the air (so you slide down a too-steep slope)
//        ceiling  pointing down: along its normal; kills upward speed (bonk)
//   4. STEP-UP when a grounded move was blocked low (kerb, stair riser <= stepHeight): up, forward, down; kept if
//      it lands on walkable ground no higher than stepHeight and gets further than the blocked move
//   5. GROUND SNAP when it was grounded and nothing holds it: down in small chunks up to snapDistance (stairs and
//      ramps on the way down, kerbs off the sidewalk), else it falls
//   6. the visual height lags step-ups / snaps by a short exponential (stepOffset) so stairs look smooth
// No allocations in step().
import { Contacts, STRIDE } from "./world.js";

export const CONTROLLER_DEFAULTS = {
  radius: 0.3, height: 1.75,
  walkSpeed: 2.0, runSpeed: 5.5,      // m/s (a brisk walk, a run)
  groundAccel: 28, groundDecel: 34, airAccel: 5,
  jumpHeight: 0.9, gravity: 22, maxFall: 40, coyoteTime: 0.1, jumpBuffer: 0.12,
  stepHeight: 0.25, snapDistance: 0.3, maxSlope: 50,      // degrees
  turnRate: 12,                       // facing follows the motion (1/s)
  stepSmooth: 18,                     // visual lag of step-ups and snaps (1/s)
  iterations: 4, maxSubsteps: 16,
};

const DEG = Math.PI / 180;

export class CharacterController {
  constructor(world, params = {}) {
    this.world = world;
    this.p = { ...CONTROLLER_DEFAULTS, ...params };
    this.pos = new Float64Array(3); this.vel = new Float64Array(3);
    this.prev = new Float64Array(5); this.curr = new Float64Array(5);     // x, y, z, yaw, stepOffset (for interpolation)
    this.yaw = 0; this.stepOffset = 0;
    this.grounded = false; this.groundN = new Float64Array([0, 1, 0]);
    this.coyote = 0; this.jumpBuf = 0; this.jumped = false;
    this.contacts = new Contacts(64);
    // the last step's contacts for the debug view: x, y, z, nx, ny, nz, kind (0 ground 1 wall 2 ceiling)
    this.dbg = new Float64Array(32 * 7); this.dbgN = 0;
    this.stats = { substeps: 0, queries: 0, steppedUp: 0, snapped: 0, contacts: 0 };
    this._save = new Float64Array(6);
    // scratch numbers passed between the step's parts in a typed array, not as arguments (V8 boxes double
    // arguments of calls it does not inline: the hot path must not allocate)
    this.F = new Float64Array(12);           // 0 dt, 1 snap distance, 2-9 step-up: sx sy sz svx svz wantX wantZ got
    this.dt = 1 / 120;
    this.input = { x: 0, z: 0, run: false, jump: false };        // world-space wanted direction (|x,z| <= 1)
  }

  get radius() { return this.p.radius; }
  get height() { return this.p.height; }

  teleport(x, y, z, yaw = this.yaw) {
    this.pos[0] = x; this.pos[1] = y; this.pos[2] = z;
    this.vel.fill(0); this.yaw = yaw; this.stepOffset = 0;
    this.grounded = false; this.coyote = 0; this.jumpBuf = 0;
    this._snapState(); this.prev.set(this.curr);
  }
  _snapState() { const c = this.curr; c[0] = this.pos[0]; c[1] = this.pos[1]; c[2] = this.pos[2]; c[3] = this.yaw; c[4] = this.stepOffset; }

  /** One fixed step of dt seconds (default this.dt; the input is read from this.input; input.jump is consumed). */
  step(dtArg) {
    const dt = dtArg === undefined ? this.dt : dtArg, F = this.F;
    F[0] = dt;
    const p = this.p, pos = this.pos, v = this.vel, inp = this.input;
    this.prev.set(this.curr);
    this.dbgN = 0; this.stats.substeps = 0;
    const q0 = this.world.queries;
    const wasGrounded = this.grounded;
    // 1. horizontal velocity toward the wanted one
    if (inp.jump) { this.jumpBuf = p.jumpBuffer; inp.jump = false; }
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.coyote = wasGrounded ? p.coyoteTime : Math.max(0, this.coyote - dt);
    let ix = inp.x, iz = inp.z;
    const il = Math.sqrt(ix * ix + iz * iz);
    if (il > 1) { ix /= il; iz /= il; }
    const speed = inp.run ? p.runSpeed : p.walkSpeed, tx = ix * speed, tz = iz * speed;
    const rate = wasGrounded ? (il > 0.01 ? p.groundAccel : p.groundDecel) : p.airAccel;
    const ddx = tx - v[0], ddz = tz - v[2], dl = Math.sqrt(ddx * ddx + ddz * ddz), maxd = rate * dt;
    if (dl <= maxd) { v[0] = tx; v[2] = tz; } else { v[0] += ddx / dl * maxd; v[2] += ddz / dl * maxd; }
    // 2. jump, gravity
    this.jumped = false;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      v[1] = Math.sqrt(2 * p.gravity * p.jumpHeight);
      this.jumpBuf = 0; this.coyote = 0; this.jumped = true; this.grounded = false;
    } else if (wasGrounded) v[1] = 0;
    else v[1] = Math.max(-p.maxFall, v[1] - p.gravity * dt);
    // 3. move + resolve
    const sx = pos[0], sy = pos[1], sz = pos[2], svx = v[0], svz = v[2];
    const wantX = v[0] * dt, wantZ = v[2] * dt;
    const r = this._move(this.grounded);
    let hitGround = r & 1;
    const wallLow = r & 2;
    // 4. step-up
    if (wasGrounded && !this.jumped && wallLow && p.stepHeight > 0) {
      const want = Math.sqrt(wantX * wantX + wantZ * wantZ);
      const got = want > 1e-6 ? ((pos[0] - sx) * wantX + (pos[2] - sz) * wantZ) / want : 0;
      F[2] = sx; F[3] = sy; F[4] = sz; F[5] = svx; F[6] = svz; F[7] = wantX; F[8] = wantZ; F[9] = got;
      if (want > 1e-4 && got < want * 0.8 && this._stepUp()) hitGround = 1;
    }
    // 5. ground
    if (hitGround && v[1] <= 0) this.grounded = true;
    else if (wasGrounded && !this.jumped && v[1] <= 0) {
      const y0 = pos[1];
      F[1] = p.snapDistance;
      this.grounded = this._snapDown();
      // a real drop (a stair down, off a kerb): the body follows it smoothly
      if (this.grounded && y0 - pos[1] > 0.03) { this.stepOffset += y0 - pos[1]; this.stats.snapped++; }
    }
    else this.grounded = false;
    if (this.grounded) v[1] = 0;
    // facing follows the horizontal motion
    const hv = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
    if (hv > 0.15 && il > 0.01) {
      let d = Math.atan2(v[0], v[2]) - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-p.turnRate * dt));
      if (this.yaw > Math.PI) { this.yaw -= 2 * Math.PI; this.prev[3] -= 2 * Math.PI; }
      else if (this.yaw < -Math.PI) { this.yaw += 2 * Math.PI; this.prev[3] += 2 * Math.PI; }
    }
    // 6. visual step lag
    this.stepOffset *= Math.exp(-p.stepSmooth * dt);
    if (Math.abs(this.stepOffset) < 1e-4) this.stepOffset = 0;
    this.stats.queries = this.world.queries - q0;
    this._snapState();
  }

  /** Move by vel * dt in substeps, resolving after each. Returns bit 1 = walkable ground, 2 = a low wall blocked. */
  _move(grounded) {
    const p = this.p, v = this.vel, pos = this.pos, dt = this.F[0];
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) * dt;
    const n = Math.min(p.maxSubsteps, Math.max(1, Math.ceil(len / (0.4 * p.radius))));
    const h = dt / n;
    let res = 0;
    for (let s = 0; s < n; s++) {
      pos[0] += v[0] * h; pos[1] += v[1] * h; pos[2] += v[2] * h;   // the velocity is clipped as it slides
      res |= this._resolve(grounded, true);
    }
    this.stats.substeps += n;
    return res;
  }

  /** Push the capsule out of the world. clip: remove the velocity going into each contact. */
  _resolve(grounded, clip) {
    const p = this.p, pos = this.pos, v = this.vel, r = p.radius, C = this.contacts, D = C.d, W = this.world;
    const cosSlope = Math.cos(p.maxSlope * DEG);
    let res = 0;
    for (let it = 0; it < p.iterations; it++) {
      const gx = pos[0], gy = pos[1], gz = pos[2], ay = gy + r;
      const q = W.q;
      q[0] = gx; q[1] = ay; q[2] = gz; q[3] = gx; q[4] = gy + p.height - r; q[5] = gz; q[6] = r;
      const n = W.capsule(C);
      if (!n) break;
      this.stats.contacts = n;
      let moved = 0;
      // two passes: ground contacts first (a stair nosing is touched by the tread AND the riser triangle; the
      // tread must win, or the riser's horizontal push would leave nothing for it)
      for (let k = 0; k < 2 * n; k++) {
        const i = k < n ? k : k - n;
        const o = i * STRIDE, nx = D[o], ny = D[o + 1], nz = D[o + 2];
        const cyl = D[o + 5];                                  // the contact's height
        // ground: under the bottom sphere's centre, and a walkable contact, or the edge of a walkable face (a tread's
        // nosing, a kerb's top edge) no higher than a step: the sphere rolls up onto it
        const isGround = cyl < ay + 1e-4 && (ny >= cosSlope || (D[o + 7] >= cosSlope && cyl - gy <= p.stepHeight + 0.01));
        if (isGround !== k < n) continue;
        // re-project: the depth left after the pushes so far
        // (planar), and no more than the exact distance from the capsule's axis to the stored contact point (a
        // stair nosing touched by the tread and the riser: once the tread's lift has resolved it, the riser has
        // nothing left to push, so the climb keeps its speed)
        const ex = pos[0] - D[o + 4], ez = pos[2] - D[o + 6];
        const ey = pos[1] + r > cyl ? pos[1] + r - cyl : pos[1] + p.height - r < cyl ? pos[1] + p.height - r - cyl : 0;
        const depth = Math.min(D[o + 3] - ((pos[0] - gx) * nx + (pos[1] - gy) * ny + (pos[2] - gz) * nz), r - Math.sqrt(ex * ex + ey * ey + ez * ez));
        if (depth <= 1e-6) continue;
        let kind;
        if (isGround) {
          // straight up until the sphere rests on the contact point (exact for points and edges, converges on faces)
          const lx = pos[0] - D[o + 4], lz = pos[2] - D[o + 6], l2 = lx * lx + lz * lz;
          let dy = l2 < r * r ? cyl + Math.sqrt(r * r - l2) - (pos[1] + r) : depth / Math.max(ny, 0.25);
          if (dy <= 1e-7) continue;
          dy = Math.min(dy, r);
          pos[1] += dy; moved += dy;
          if (clip && v[1] < 0) v[1] = 0;
          res |= 1; kind = 0;
          this.groundN[0] = nx; this.groundN[1] = ny; this.groundN[2] = nz;
        } else {
          const hl = Math.sqrt(nx * nx + nz * nz);
          if (ny < -0.2 && (!grounded || hl < 0.3)) {
            // ceiling: along the normal, no more rising
            pos[0] += nx * depth; pos[1] += ny * depth; pos[2] += nz * depth; moved += depth;
            if (clip && v[1] > 0) v[1] = 0;
            kind = 2;
          } else if ((grounded || ny < 0) && hl > 1e-3) {
            // wall while grounded (or an overhang edge): horizontal only, so steep ground is not climbed
            const hx = nx / hl, hz = nz / hl, amt = Math.min(depth / hl, depth * 4);
            pos[0] += hx * amt; pos[2] += hz * amt; moved += amt;
            if (clip) { const vn = v[0] * hx + v[2] * hz; if (vn < 0) { v[0] -= hx * vn; v[2] -= hz * vn; } }
            kind = 1;
          } else {
            // in the air: along the normal (slide off steep slopes, round edges)
            pos[0] += nx * depth; pos[1] += ny * depth; pos[2] += nz * depth; moved += depth;
            if (clip) { const vn = v[0] * nx + v[1] * ny + v[2] * nz; if (vn < 0) { v[0] -= nx * vn; v[1] -= ny * vn; v[2] -= nz * vn; } }
            kind = 1;
          }
          if (kind === 1 && D[o + 5] < gy + p.stepHeight + 0.02) res |= 2;
        }
        if (this.dbgN < 32) {
          const b = this.dbgN++ * 7;
          this.dbg[b] = D[o + 4]; this.dbg[b + 1] = D[o + 5]; this.dbg[b + 2] = D[o + 6];
          this.dbg[b + 3] = nx; this.dbg[b + 4] = ny; this.dbg[b + 5] = nz; this.dbg[b + 6] = kind;
        }
      }
      if (moved < 1e-6) break;
    }
    return res;
  }

  /** Up, forward, down from the step's start. Keeps the result if it is a real step. */
  _stepUp() {
    const F = this.F, sx = F[2], sy = F[3], sz = F[4], svx = F[5], svz = F[6], wantX = F[7], wantZ = F[8], blockedGot = F[9];
    const p = this.p, pos = this.pos, v = this.vel, S = this._save;
    S[0] = pos[0]; S[1] = pos[1]; S[2] = pos[2]; S[3] = v[0]; S[4] = v[1]; S[5] = v[2];
    pos[0] = sx; pos[1] = sy; pos[2] = sz;
    // up (a ceiling may stop it)
    const upN = Math.max(1, Math.ceil(p.stepHeight / (0.4 * p.radius)));
    for (let k = 0; k < upN; k++) { pos[1] += p.stepHeight / upN; this._resolve(false, false); }
    const climbed = pos[1] - sy;
    let ok = climbed > 0.01;
    if (ok) {
      // forward, the whole wanted move
      const want = Math.sqrt(wantX * wantX + wantZ * wantZ), fn = Math.max(1, Math.ceil(want / (0.4 * p.radius)));
      for (let k = 0; k < fn; k++) { pos[0] += wantX / fn; pos[2] += wantZ / fn; this._resolve(false, false); }
      // down onto the step
      F[1] = climbed + 0.02;
      ok = this._snapDown();
      const rise = pos[1] - sy, got = ((pos[0] - sx) * wantX + (pos[2] - sz) * wantZ) / want;
      ok = ok && rise <= p.stepHeight + 0.01 && rise > -0.01 && got > blockedGot + want * 0.25;
    }
    if (!ok) { pos[0] = S[0]; pos[1] = S[1]; pos[2] = S[2]; v[0] = S[3]; v[1] = S[4]; v[2] = S[5]; return false; }
    v[0] = svx; v[2] = svz; v[1] = 0;
    this.stepOffset -= pos[1] - S[1];
    this.stats.steppedUp++;
    return true;
  }

  /** Down in chunks until walkable ground holds it (true), else back where it was (false). */
  _snapDown() {
    const p = this.p, pos = this.pos, dist = this.F[1];
    const x = pos[0], y = pos[1], z = pos[2];
    let gone = 0, chunk = 0.02;
    while (gone < dist - 1e-9) {
      const c = Math.min(chunk, dist - gone);
      pos[1] -= c; gone += c;
      if (this._resolve(true, false) & 1) return true;
      chunk = 0.4 * p.radius;
    }
    pos[0] = x; pos[1] = y; pos[2] = z;
    return false;
  }

  /** Interpolated render state (alpha in [0, 1] between the last two steps) -> out [x, y (with step lag), z, yaw]. */
  sample(alpha, out) {            // (once per frame)
    const a = this.prev, b = this.curr;
    out[0] = a[0] + (b[0] - a[0]) * alpha;
    out[1] = a[1] + (b[1] - a[1]) * alpha + a[4] + (b[4] - a[4]) * alpha;
    out[2] = a[2] + (b[2] - a[2]) * alpha;
    out[3] = a[3] + (b[3] - a[3]) * alpha;
    return out;
  }
}

/**
 * Fixed-step driver: accumulates frame time, runs the controller at `hz`, returns the interpolation alpha.
 * Caps the backlog (a stalled tab) at maxSteps per frame.
 */
export class FixedStepper {
  constructor(hz = 120, maxSteps = 8) { this.dt = 1 / hz; this.acc = 0; this.maxSteps = maxSteps; this.steps = 0; }
  advance(frameDt, stepFn) {
    this.acc += frameDt;
    let n = 0;
    while (this.acc >= this.dt && n < this.maxSteps) { stepFn(); this.acc -= this.dt; n++; }
    if (n === this.maxSteps && this.acc > this.dt) this.acc = this.acc % this.dt;
    this.steps = n;
    return this.acc / this.dt;
  }
}
