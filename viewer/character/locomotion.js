// THE LOCOMOTION GRAPH for a character whose clips are on its own skeleton (Mixamo Y Bot + Mixamo clips: no
// retargeting). The ANIMATION does the work, the leg IK (legIK.js) only corrects what is left. How real engines do it,
// and what is taken from each (docs/character/LOCOMOTION.md):
//
//   SYNC MARKERS (UE sync groups): every cyclic clip has its foot touch-downs (tools/characters/mixamoClips.mjs ->
//     ybot.json); one shared foot PHASE (0 = left foot down, 0.5 = right) drives them all, so walk, run and the stair
//     clips blend and hand over in step (no scissoring legs in a cross-fade).
//   SPEED BLEND: idle -> walk -> run by the ground speed, the phase advancing at speed / the blended stride length
//     (playback rate clamped: past it the foot lock absorbs the rest).
//   ROOT MOTION for the one-shots (start, stop, turn in place): the clip's own travel / turn drives the controller
//     (body.loco.drive, read by index.js), so their planted feet don't skate. Entry frames chosen by phase (a stop
//     starts at the frame whose feet match the walk's).
//   STAIRS: the clip for the flight's direction (scan: index.js _scanStairs), its playback DISTANCE-MATCHED to the
//     nosings (each touch-down lands mid-tread whatever the speed) and its pose WARPED to the real riser / tread
//     (UE stride warping: the feet scaled about the body; the Mixamo clips were made for 24 cm risers).
//   JUMP / FALL / LAND: the jump clip from its take-off frame, its air time fitted to the physics; the falling loop
//     when the fall goes on; the landing clip from its touch-down frame, scaled by the fall speed.
// Clip times are set directly (timeScale 0, mixer.update(0)): nothing advances behind the graph's back. Weights are
// eased and normalised (three.js mixes a missing weight with the bind pose).
import * as THREE from "three/webgpu";
import { LegIK } from "./legIK.js";

export const LOCO = {
  turnMin: 70,          // degrees: standing, a wanted direction this far off turns on the spot first
  turnRate: 1.35,       // turn clip playback
  startRate: 1.2,       // start clip playback
  stopRate: 1.15,
  minRate: 0.7, maxRate: 1.35,     // cyclic clips' playback (the phase): beyond, the lock absorbs the difference
  stairsMaxRate: 1.3,   // stair clips: at most this x their own cadence (index.js caps the speed to it)
  jumpLead: 0.04,       // s before the jump clip's take-off frame
  fade: 0.12,           // s: default cross-fade
  // The BVHEcctrl / ecctrl way (owner, 2026-11-10): NO foot IK and no stair clips: the clips play as authored, the body
  // glides over steps and ramps on a spring (index.js glide). legIK.js and the stair-clip machinery stay, switched off.
  footIK: false,
  stairClips: true,     // the stair clips, BAKED for the stairs' riser / tread (tools/characters/mixamoClips.mjs): no leg IK
  bodyFit: true,        // the whole body's height from the planted foot's ground (one smooth vertical offset, no leg bent)
};

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** One clip: its action, its metadata, its foot markers -> phase map. */
class Clip {
  constructor(mixer, clip, meta) {
    this.name = clip.name; this.clip = clip; this.meta = meta || {}; this.dur = clip.duration;
    this.act = mixer.clipAction(clip);
    this.act.setLoop(THREE.LoopRepeat, Infinity); this.act.timeScale = 0; this.act.enabled = true; this.act.setEffectiveWeight(0); this.act.play();
    this.w = 0; this.target = 0; this.t = 0;
    const st = this.meta.steps || [[], []];
    this.uL = st[0][0]; this.uR = st[1][0];           // normalised touch-down times (cyclic clips: one each)
    this.cyclic = !!this.meta.loop && this.uL !== undefined && this.uR !== undefined;
    this.contact = (this.meta.contact || []).map((s) => Uint8Array.from(s, (ch) => (ch === "1" ? 1 : 0)));
    this.n = this.contact[0]?.length || 0;
    if (this.meta.dist) this.dist = Float32Array.from(this.meta.dist);
    if (this.meta.turn) this.turn = Float32Array.from(this.meta.turn);
  }
  get u() { return this.dur > 0 ? this.t / this.dur : 0; }
  /** Normalised time -> the shared foot phase (0 = left down, 0.5 = right down), piecewise linear between the markers. */
  phaseOf(u) {
    const a = this.uL, b = this.uR;
    let d = u - a; d -= Math.floor(d);                   // time since the left touch-down (0..1)
    let m = b - a; m -= Math.floor(m);                   // the right's touch-down after the left's
    return d < m ? 0.5 * d / m : 0.5 + 0.5 * (d - m) / (1 - m);
  }
  uOf(ph) {
    ph -= Math.floor(ph);
    let m = this.uR - this.uL; m -= Math.floor(m);
    const d = ph < 0.5 ? ph / 0.5 * m : m + (ph - 0.5) / 0.5 * (1 - m);
    let u = this.uL + d; u -= Math.floor(u);
    return u;
  }
  /** Contact of foot s at time t (frames interpolated). */
  contactAt(s, t) {
    const c = this.contact[s];
    if (!c || !this.n) return 1;
    const f = Math.min(this.n - 1, Math.max(0, t * 30)), k = Math.floor(f), k1 = Math.min(this.n - 1, k + 1), x = f - k;
    return c[k] + (c[k1] - c[k]) * x;
  }
  /** A per-frame curve (dist, turn) at time t. */
  curve(arr, t) {
    const f = Math.min(arr.length - 1, Math.max(0, t * 30)), k = Math.floor(f), k1 = Math.min(arr.length - 1, k + 1);
    return arr[k] + (arr[k1] - arr[k]) * (f - k);
  }
  /** The clip's root speed at t (dist curve slope, m/s at playback 1). */
  speedAt(t) {
    if (!this.dist) return this.meta.speed || 0;
    const h = 1 / 30, a = Math.max(0, t - h), b = Math.min(this.dur, t + h);      // (one-sided at the ends)
    return b > a ? (this.curve(this.dist, b) - this.curve(this.dist, a)) / (b - a) : 0;
  }
}

export class Locomotion {
  /** body: the CharacterBody; model: the glTF scene; inner: the pelvis group; clips: AnimationClip[]; opts: from characterModel loadLoco. */
  constructor(body, model, inner, clips, opts) {
    this.body = body; this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.p = { ...LOCO };
    const meta = opts.meta.clips;
    this.C = {};
    for (const c of clips) if (meta[c.name]) this.C[c.name] = new Clip(this.mixer, c, meta[c.name]);
    this.list = Object.values(this.C);
    this.role = {};
    for (const c of this.list) if (!c.meta.stairs?.variantOf) this.role[c.meta.role] = c;
    // baked stair variants by role (riser x tread grid)
    this.stairSets = {};
    for (const c of this.list) if (c.meta.stairs?.variantOf) (this.stairSets[c.meta.role] ||= []).push(c);
    this.walkSpeed = this.role.walk?.meta.speed || 1.7; this.runSpeed = this.role.run?.meta.speed || 4.5;
    this.stride = { walk: this.walkSpeed * (this.role.walk?.dur || 1), run: this.runSpeed * (this.role.run?.dur || 0.7) };
    this.mode = "idle"; this.modeT = 0; this.phase = 0; this.fadeTau = this.p.fade;
    this.drive = { on: false, speed: 0, dirX: 0, dirZ: 0, yaw: 0 };
    this.cur = null;                   // the one-shot playing (start / stop / turn / jump / land)
    this.turnWarp = 1;
    this.stairs = { k: 0, clip: null, sT: 1, sR: 1, fx: 0, fz: 1 };
    this.ik = new LegIK(model, inner, opts.rig);
    this.ikCtx = { weight: 1, contact: [1, 1], land: [{ ok: false, x: 0, z: 0, h: 0 }, { ok: false, x: 0, z: 0, h: 0 }], warp: { k: 0, sT: 1, sR: 1, fx: 0, fz: 1, slope: 0, sdx: 0, sdz: 1 }, landing: 0, lock: 1 };
    this.ikOn = true;
    this.preview = null;
    this.ms = 0; this.ikMs = 0;
    this._airT = 0; this._fallV = 0; this._wasGrounded = true;
    this._biasUp = 0; this._biasDown = 0.03;        // (m: the per-direction landing correction, learned; start values from the lab)
    this.reset();
  }

  reset() {
    for (const c of this.list) { c.w = c.target = 0; c.t = 0; }
    const idle = this.role.idle;
    if (idle) { idle.w = idle.target = 1; }
    this.mode = "idle"; this.cur = null; this.phase = 0; this.drive.on = false; this.drive.yaw = 0;
    this._airT = 0; this._wasGrounded = true;
    this.ik.reset();
    this._apply(0);
  }

  _go(mode, fade = this.p.fade) { this.mode = mode; this.modeT = 0; this.fadeTau = fade; }

  /** Play one clip alone, looped, IK off (the lab's clip preview); null: back to the graph. */
  setPreview(name) { this.preview = name && this.C[name] ? this.C[name] : null; return !!this.preview; }

  /**
   * x, y, z: the feet (the ground line); yaw: facing; st (index.js bodyState): speed, vx, vz, vy, grounded, jumped,
   * inX, inZ (wanted direction, |.| <= 1), run, stairs { k, dir, riser, tread, nx, nz, dx, dz }, gravity.
   */
  update(dt, x, y, z, yaw, st, world) {
    const t0 = performance.now(), p = this.p, C = this.role;
    const drive = this.drive;
    drive.on = false; drive.yaw = 0;
    for (const c of this.list) c.target = 0;
    const speed = st.speed, inMag = Math.hypot(st.inX || 0, st.inZ || 0), wantMove = inMag > 0.1;
    const wantYaw = wantMove ? Math.atan2(st.inX, st.inZ) : yaw;
    // landing / air bookkeeping
    const landing = st.grounded && !this._wasGrounded && this._airT > 0.12 ? Math.max(0, -this._fallV) : 0;
    if (st.grounded) this._airT = 0; else { this._airT += dt; this._fallV = st.vy; }
    this._wasGrounded = st.grounded;
    this.modeT += dt;
    if (this.preview) {
      const c = this.preview; c.t = (c.t + dt) % c.dur; c.target = 1; this.fadeTau = 0.05;
    } else {
      // ---- transitions that apply from any mode
      if (st.jumped && C.jump) { this.cur = C.jump; C.jump.t = Math.max(0, (C.jump.meta.takeoff ?? 0) - p.jumpLead); this._jumpRate = this._airRate(st); this._go("jump", 0.16); }
      else if (!st.grounded && this._airT > 0.15 && this.mode !== "jump" && this.mode !== "fall") this._go("fall", 0.25);
      else if (landing > 0 && (this.mode === "jump" || this.mode === "fall")) this._land(landing, st);
      this._step(dt, st, speed, wantMove, wantYaw, yaw, x, z);
    }
    this._apply(dt);
    if (this.body.preIK) { this.body.root.updateMatrixWorld(true); this.body.preIK(y); }     // (lab hook: the clip's own pose)
    const t1 = performance.now();
    // ---- the leg IK
    if (this.p.footIK && this.ikOn && !this.preview && world) {
      this.body.root.updateMatrixWorld(true);
      const ctx = this.ikCtx;
      ctx.weight = st.grounded && this.mode !== "jump" && this.mode !== "fall" ? 1 : 0;
      // (the landing absorb: lighter the faster the body runs on: a running hop barely dips)
      ctx.landing = landing * (1 - 0.65 * Math.min(1, st.speed / this.runSpeed));
      this._contacts(ctx);
      this._predictLanding(ctx, x, z, yaw, st);
      const s = this.stairs; ctx.warp.k = s.k * ctx.weight; ctx.warp.sT = s.sT; ctx.warp.sR = s.sR; ctx.warp.fx = s.fx; ctx.warp.fz = s.fz;
      // slope warping: the clip's foot pattern tilted onto the ground's grade (not where a stair clip already climbs)
      ctx.warp.slope = Math.max(-0.45, Math.min(0.45, st.slope || 0)) * (1 - s.k) * ctx.weight; ctx.warp.sdx = st.slopeDx ?? 0; ctx.warp.sdz = st.slopeDz ?? 1;
      ctx.lock = 1;
      this.ik.update(dt, world, y, ctx);
    }
    else if (!this.preview) {          // (no leg IK: the body fit, and the clip's contacts published for the lab's checks)
      this._contacts(this.ikCtx);
      if (this.p.bodyFit && world) this._bodyFit(dt, world, y, st);
      else for (let i = 0; i < 2; i++) { const L = this.ik.legs[i]; L.contact = st.grounded ? this.ikCtx.contact[i] : 0; L.planted = L.contact > 0.6; }
    }
    if (!this.preview) {
      // (stairs: where each touch-down really landed on its tread feeds back into the phase target: the clip's own
      // landing offsets, the warp and the lock are then irrelevant; aims at the middle of the tread)
      const sc = st.stairs;
      for (let i = 0; i < 2; i++) {
        const L = this.ik.legs[i];
        if (L.planted && !L._wasP && sc && sc.k > 0.6 && sc.tread > 0.1) {
          // (the sole's real middle: from the ankle along the foot)
          L.foot.getWorldPosition(_v); const ax = _v.x, az = _v.z; L.toe.getWorldPosition(_v);
          const fx = _v.x - ax, fz = _v.z - az, fl = Math.hypot(fx, fz) || 1, m = L.soleMid ?? fl * 0.5;
          const c = (ax + fx / fl * m) * sc.dx + (az + fz / fl * m) * sc.dz;
          let f = ((c - sc.ref) / sc.tread) % 1; if (f < 0) f += 1;
          const k = sc.dir > 0 ? "_biasUp" : "_biasDown", want = (this._aimMid ?? sc.tread * 0.5) / sc.tread;
          let e = want - f; e -= Math.round(e);
          this[k] = Math.max(-0.15, Math.min(0.15, this[k] + e * sc.tread * 0.6));
          this.lastLanding = f;
        }
        L._wasP = L.planted;
      }
        }
    const t2 = performance.now();
    this.ms = this.ms * 0.95 + (t2 - t0) * 0.05; this.ikMs = this.ikMs * 0.95 + (t2 - t1) * 0.05;
  }

  /** The jump clip's air part fitted to the physics' air time (flat ground): 2 vy / g. */
  _airRate(st) {
    const j = this.role.jump, air = (j.meta.touchdown ?? j.dur) - (j.meta.takeoff ?? 0);
    const tAir = 2 * Math.max(1, st.vyJump || st.vy || 6) / (st.gravity || 22);
    return Math.min(1.5, Math.max(0.6, air / tAir));
  }

  _land(fallV, st) {
    const C = this.role;
    // running on: straight back into the run (the IK's landing absorb dips the pelvis), no crouching land
    if (st.speed > 0.6 * this.runSpeed && fallV < 7) { this.cur = null; this.phase = 0.25; this._go("move", 0.22); return; }
    if (this.mode === "jump" && C.jump && Math.abs(C.jump.t - (C.jump.meta.touchdown ?? 0)) < 0.3 && fallV < 6) {
      // the jump clip's own landing
      this.cur = C.jump; C.jump.t = C.jump.meta.touchdown ?? C.jump.t; this._landHold = 0.45; this._go("land", 0.06);
    } else if (C.land && fallV > 3.5) {
      this.cur = C.land; C.land.t = C.land.meta.touchdown ?? 0; this._landHold = Math.min(0.7, 0.25 + fallV * 0.05); this._go("land", 0.06);
    } else { this.cur = null; this._go(st.speed > 0.3 ? "move" : "idle", 0.1); }
  }

  _step(dt, st, speed, wantMove, wantYaw, yaw, x, z) {
    const p = this.p, C = this.role, drive = this.drive;
    const ang = wrapPi(wantYaw - yaw);
    switch (this.mode) {
      case "idle": {
        const c = C.idle; c.t = (c.t + dt) % c.dur; c.target = 1;
        if (!st.grounded) break;
        if (wantMove) {
          if (Math.abs(ang) > p.turnMin * Math.PI / 180 && C.turnL && C.turnR && speed < 0.3) {
            const t = ang > 0 ? C.turnL : C.turnR; this.cur = t; t.t = 0;
            this.turnWarp = Math.min(1.8, Math.max(0.5, Math.abs(ang) / Math.abs(t.meta.angle * Math.PI / 180)));
            this._go("turn", 0.15);
          } else if (!st.run && C.walkStart) this._enterStart();
          else { this.phase = 0.25; this._go("move", 0.2); }
        }
        break;
      }
      case "turn": {
        const c = this.cur, t0 = c.t;
        c.t = Math.min(c.dur, c.t + dt * p.turnRate); c.target = 1;
        drive.on = true; drive.speed = 0; drive.yaw = (c.curve(c.turn, c.t) - c.curve(c.turn, t0)) * this.turnWarp;
        const left = Math.abs(ang);
        if (c.t >= c.dur * 0.9 || (c.t > c.dur * 0.55 && left < 0.4)) {
          if (wantMove) { if (!st.run && C.walkStart) this._enterStart(); else { this.phase = 0.25; this._go("move", 0.25); } }
          else { this.cur = null; this._go("idle", 0.3); }
        }
        break;
      }
      case "start": {
        const c = this.cur; c.t = Math.min(c.dur, c.t + dt * p.startRate); c.target = 1;
        drive.on = true; drive.speed = Math.max(0, c.speedAt(c.t) * p.startRate); drive.dirX = st.inX; drive.dirZ = st.inZ;
        const ml = Math.hypot(drive.dirX, drive.dirZ) || 1; drive.dirX /= ml; drive.dirZ /= ml;
        if (!wantMove) { if (speed > 0.7 * this.walkSpeed && C.walkStop) this._enterStop(this._oneShotPhase(c)); else { this.phase = this._oneShotPhase(c); this.cur = null; this._go("move", 0.25); } }
        else if (st.run || Math.abs(ang) > 1.2 || st.stairs?.k > 0.3) { this.phase = this._oneShotPhase(c); this.cur = null; this._go("move", 0.25); }
        else if (c.t >= this._startOut) { this.phase = this._oneShotPhase(c); this.cur = null; this._go("move", 0.3); }
        break;
      }
      case "move": this._move(dt, st, speed, wantMove, x, z, yaw); break;
      case "stop": {
        const c = this.cur; c.t = Math.min(c.dur, c.t + dt * p.stopRate); c.target = 1;
        drive.on = true; drive.speed = Math.max(0, c.speedAt(c.t) * p.stopRate); drive.dirX = Math.sin(yaw); drive.dirZ = Math.cos(yaw);
        if (wantMove && st.grounded) {
          if (c.t < this._stopMoving) { this.phase = this._oneShotPhase(c); this.cur = null; this._go("move", 0.25); }
          else { this.cur = null; this._go("idle", 0.15); }
        } else if (c.t >= this._stopEnd) { this.cur = null; this._go("idle", 0.45); }
        break;
      }
      case "jump": {
        const c = this.cur, td = c.meta.touchdown ?? c.dur;
        c.t = Math.min(td - 0.02, c.t + dt * this._jumpRate); c.target = 1;
        // still in the air past the clip's own landing: the falling loop
        if (c.t >= td - 0.03 && !st.grounded && st.vy < -1) { this._go("fall", 0.3); }
        break;
      }
      case "fall": { const c = C.fall; if (c) { c.t = (c.t + dt) % c.dur; c.target = 1; } else if (C.idle) C.idle.target = 1; break; }
      case "land": {
        const c = this.cur; c.t = Math.min(c.dur, c.t + dt * (speed > 1 ? 1.4 : 1)); c.target = 1;
        this._landHold -= dt * (wantMove ? 2 : 1);
        if (this._landHold <= 0) { this.cur = null; if (speed > 0.3 || wantMove) { this.phase = 0.25; this._go("move", 0.25); } else this._go("idle", 0.35); }
        break;
      }
    }
  }

  _enterStart() {
    const c = this.role.walkStart;
    // from the first frame that moves (0.15 s of the weight shift kept), handed over to the walk at its last steady
    // touch-down
    let k0 = 0; while (k0 < c.dist.length - 1 && c.dist[k0] < 0.004) k0++;
    c.t = Math.max(0, k0 / 30 - 0.15);
    const last = Math.max(...c.meta.steps[0], ...c.meta.steps[1]);
    this._startOut = Math.min(c.dur - 0.05, last * c.dur + 0.05);
    this.cur = c; this._go("start", 0.2);
  }
  /** The shared phase of a one-shot (start / stop) at its time: from its touch-downs, as for the cyclic clips. */
  _oneShotPhase(c) {
    const ev = [];
    c.meta.steps[0].forEach((u) => ev.push([u * c.dur, 0])); c.meta.steps[1].forEach((u) => ev.push([u * c.dur, 0.5]));
    ev.sort((a, b) => a[0] - b[0]);
    if (!ev.length) return 0;
    const half = 0.5 * (this.role.walk?.dur || 1);           // a step of the walk
    let prev = null;
    for (const e of ev) { if (e[0] > c.t) { return prev ? prev[1] + 0.5 * (c.t - prev[0]) / (e[0] - prev[0]) : e[1] - 0.5 * (e[0] - c.t) / half; } prev = e; }
    return prev[1] + 0.5 * Math.min(0.99, (c.t - prev[0]) / half);
  }
  /** Stop: the stop clip's frame whose foot phase matches the walk's (within its first second), then root motion. */
  _enterStop(ph) {
    const c = this.role.walkStop;
    let best = 0, bd = 9;
    for (let t = 0; t < Math.min(1.2, c.dur * 0.5); t += 1 / 60) {
      c.t = t; let d = this._oneShotPhase(c) - ph; d -= Math.round(d);
      if (Math.abs(d) < bd) { bd = Math.abs(d); best = t; }
    }
    c.t = best;
    let k = c.dist.length - 1; const end = c.dist[k]; while (k > 0 && end - c.dist[k] < 0.01) k--;
    this._stopMoving = (k + 1) / 30; this._stopEnd = Math.min(c.dur, this._stopMoving + 0.5);
    this.cur = c; this._go("stop", 0.22);
  }

  _move(dt, st, speed, wantMove, x, z, yaw) {
    const p = this.p, C = this.role;
    // stop: input released at a walk
    if (!wantMove && st.grounded) {
      if (C.walkStop && speed > 0.7 * this.walkSpeed && speed < this.walkSpeed * 1.3 && !(this.stairs.k > 0.2)) { this._enterStop(this.phase); return; }
      if (speed < 0.2) { this._go("idle", 0.3); return; }
    }
    const walk = C.walk, run = C.run;
    const g0 = st.gaitWalk ?? this.walkSpeed, g1 = Math.max(g0 + 0.1, st.gaitRun ?? this.runSpeed);
    const k = run ? smooth01((speed - g0) / (g1 - g0)) : 0;
    const stride = this.stride.walk + (this.stride.run - this.stride.walk) * k;
    // the phase: speed / stride (cycles per second), the playback clamped
    const cyc = speed / stride, cMin = p.minRate / (walk.dur + (run ? (run.dur - walk.dur) * k : 0)), cMax = p.maxRate / (walk.dur + (run ? (run.dur - walk.dur) * k : 0));
    let rate = Math.min(cMax, Math.max(cMin, cyc));
    // ---- stairs
    const sc = st.stairs, S = this.stairs;
    let sClip = null;
    let sMix = null;
    if (this.p.stairClips && sc && sc.k > 0.01 && sc.dir) {
      const role = sc.dir > 0 ? (st.run && C.stairsUpRun ? "stairsUpRun" : "stairsUp") : (st.run && C.stairsDownRun ? "stairsDownRun" : "stairsDown");
      sMix = this._stairMix(role, sc.riser, sc.tread);
      sClip = sMix ? sMix[0][0] : C[role];
    }
    if (sClip && sClip.meta.stairs) {
      const m = sClip.meta.stairs, cycLen = 2 * sc.tread;
      // (a baked variant already fits the stair: no warp left; the original clip: warped by the IK, when it is on)
      S.sT = m.variantOf ? 1 : sc.tread / m.tread; S.sR = m.variantOf ? 1 : sc.riser / m.riser; S.fx = sc.dx; S.fz = sc.dz; S.clip = sClip;
      // distance matching: the clip's phase from where the body is between the nosings (each touch-down mid-tread)
      const s = x * sc.dx + z * sc.dz - sc.ref;
      // (foot f touches down at u_f, sp = its offset ahead of the root then: the landing s(u_f) + sp sT is mid-tread
      // when u_now = u_f + (s + sp sT - tread / 2) / cycLen, mod a half cycle = one tread; both feet: their mean)
      const sp = sClip.meta.stepPos;
      // where the sole's middle should land on the tread: the middle when the tread is longer than the sole; else, as
      // people do, the toes at the riser going up (the heel overhangs the nosing), the heel at the back going down
      // (the toes overhang): 1 cm clear
      const sl = this.ik.legs[0].soleLen || 0.27, half = sl / 2;
      const mid = sc.tread > sl + 0.05 ? sc.tread * 0.5 : sc.dir > 0 ? sc.tread - 0.01 - half : 0.01 + half;
      this._aimMid = mid;
      // (the sole's middle is ahead of the clip's ankle-ball middle used by stepPos: the difference is taken off)
      const L0 = this.ik.legs[0], off = (L0.soleMid ?? 0) - (L0.ankleBall ?? 0) * 0.5;
      const aim = mid - off + (sc.dir > 0 ? this._biasUp : this._biasDown);
      const a = sClip.uL + (s + sp[0][0][2] * S.sT - aim) / cycLen, b0 = sClip.uR + (s + sp[1][0][2] * S.sT - aim) / cycLen;
      let db = b0 - a; db -= Math.round(db * 2) / 2;            // R's solution nearest L's (mod 0.5)
      let uS = a + db * 0.5; uS -= Math.floor(uS);
      // (continuity: of uS and uS + 0.5, the one nearest the stair clip's own time, or, entering, the walk's phase)
      const cur = sClip.w > 0.05 ? sClip.u : sClip.uOf(this.phase);
      let dA = uS - cur; dA -= Math.round(dA);
      const uT = Math.abs(dA) <= 0.25 ? uS : uS + 0.5;
      let du = uT - cur; du -= Math.round(du);
      const adv = Math.min(p.stairsMaxRate * 1.4, speed / cycLen * sClip.dur) / sClip.dur;     // cycles per second
      let u = cur + adv * dt + du * (1 - Math.exp(-dt / 0.12));
      u -= Math.floor(u);
      // the shared phase: the stairs' (distance-matched) as much as the stairs are there, the walk / run's own cadence
      // for the rest (entering and leaving a flight: no clip forced to the other's cadence)
      const phW = this.phase + rate * dt, phS = sClip.phaseOf(u);
      let d = phS - phW; d -= Math.round(d);
      this.phase = phW + d * sc.k; this.phase -= Math.floor(this.phase);
      this._cps = rate + (adv - rate) * sc.k;
      sClip.t = sClip.uOf(this.phase) * sClip.dur;
      S.k = sc.k;
      sClip.target = sc.k;
      if (sMix) for (const [c, w] of sMix) { c.t = sClip.t; c.target = sc.k * w; }
    } else {
      S.k += (0 - S.k) * (1 - Math.exp(-dt / 0.1));
      this.phase += rate * dt; this.phase -= Math.floor(this.phase);
      this._cps = rate;
    }
    const flat = 1 - (sClip ? sc.k : 0);
    if (walk) { walk.t = walk.uOf(this.phase) * walk.dur; walk.target = (run ? 1 - k : 1) * flat; }
    if (run) { run.t = run.uOf(this.phase) * run.dur; run.target = k * flat; }
    // below the walk speed: the idle blends in (decelerating without a stop clip, or the start of a run)
    // (not on stairs: there the slow speed IS the gait; an idle mixed in would keep both feet "down")
    const wi = sClip ? 0 : 1 - smooth01((speed - 0.1) / (0.45 * this.walkSpeed));
    if (wi > 0 && C.idle) {
      C.idle.t = (C.idle.t + dt) % C.idle.dur; C.idle.target = wi;
      if (walk) walk.target *= 1 - wi; if (run) run.target *= 1 - wi;
    }
  }

  /** The baked stair variants around (riser, tread): [[clip, weight], ...] (bilinear on the grid), best first. */
  _stairMix(role, riser, tread) {
    const set = this.stairSets[role];
    if (!set || !set.length) return null;
    const Rs = [...new Set(set.map((c) => c.meta.stairs.riser))].sort((a, b) => a - b), Ts = [...new Set(set.map((c) => c.meta.stairs.tread))].sort((a, b) => a - b);
    const pick = (arr, x) => { if (x <= arr[0]) return [0, 0, 0]; if (x >= arr[arr.length - 1]) return [arr.length - 1, arr.length - 1, 0]; let i = 0; while (arr[i + 1] < x) i++; return [i, i + 1, (x - arr[i]) / (arr[i + 1] - arr[i])]; };
    const [r0, r1, ur] = pick(Rs, riser), [t0, t1, ut] = pick(Ts, tread);
    const get = (ri, ti) => set.find((c) => c.meta.stairs.riser === Rs[ri] && c.meta.stairs.tread === Ts[ti]);
    const m = new Map();
    const add = (c, w) => { if (c && w > 1e-3) m.set(c, (m.get(c) || 0) + w); };
    add(get(r0, t0), (1 - ur) * (1 - ut)); add(get(r1, t0), ur * (1 - ut)); add(get(r0, t1), (1 - ur) * ut); add(get(r1, t1), ur * ut);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  /**
   * BODY FIT (no leg IK): the whole body moved up / down so that the planted foot's sole stands on the ground under it
   * (read once when the foot plants: no per-frame hopping between treads), through a critically damped spring; the legs
   * keep the clip's pose. In the air, and with nothing planted, it eases back to 0.
   */
  _bodyFit(dt, world, y, st) {
    const ik = this.ik, inner = ik.inner, ctx = this.ikCtx;
    inner.position.y = 0; inner.updateMatrixWorld(true);
    let sum = 0, wsum = 0;
    for (let i = 0; i < 2; i++) {
      const L = ik.legs[i], c = st.grounded ? ctx.contact[i] : 0;
      L.contact = c;
      const was = L.planted;
      L.planted = was ? c > 0.3 : c > 0.6;
      if (!L.planted) continue;
      L.foot.getWorldPosition(_v); const ax = _v.x, ay = _v.y, az = _v.z; L.toe.getWorldPosition(_w);
      const sole = Math.min(ay - L.ankleH, _w.y - L.ballH);
      if (!was) L.gPlant = ik._sole(world, ax, az, _w.x, _w.z, y, null);       // (latched at the touch-down)
      if (Math.abs(L.gPlant - y) > 0.6) continue;
      const e = L.gPlant - sole;
      sum += e * c; wsum += c;
    }
    const target = st.grounded && wsum > 0 ? Math.max(-0.25, Math.min(0.25, sum / wsum)) : st.grounded ? this._fitT || 0 : 0;
    this._fitT = target;
    const om = 14, e = (this.fit || 0) - target, ex = Math.exp(-om * dt), tmp = ((this.fitV || 0) + om * e) * dt;
    this.fitV = ((this.fitV || 0) - om * tmp) * ex; this.fit = target + (e + tmp) * ex;
    const sc = inner.parent.matrixWorld.elements[5] || 1;
    inner.position.y = this.fit / sc; inner.updateMatrixWorld(true);
    ik.pelvis = this.fit;
  }

  /** Weights eased to their targets and normalised; clip times written; the mixer applies them. */
  _apply(dt) {
    // (fadeTau = the cross-fade's DURATION: an exponential reaching ~95 % in that time)
    const k = dt > 0 ? 1 - Math.exp(-3 * dt / Math.max(0.02, this.fadeTau)) : 1;
    let sum = 0;
    for (const c of this.list) { c.w += (c.target - c.w) * k; if (c.w < 1e-3 && c.target === 0) c.w = 0; sum += c.w; }
    if (sum < 1e-4) { const i = this.role.idle; if (i) { i.w = 1; sum = 1; } }
    for (const c of this.list) { c.act.setEffectiveWeight(c.w / sum); c.act.time = Math.min(c.t, c.dur - 1e-4); }
    this.mixer.update(0);
  }

  /** The feet's contact, blended over the playing clips by weight (the clip says when a foot is down). */
  _contacts(ctx) {
    let a = 0, b = 0, s = 0;
    for (const c of this.list) { if (c.w < 1e-3) continue; a += c.w * c.contactAt(0, c.t); b += c.w * c.contactAt(1, c.t); s += c.w; }
    ctx.contact[0] = s ? a / s : 1; ctx.contact[1] = s ? b / s : 1;
  }

  /**
   * Where each swinging foot will land: the dominant clip's next touch-down for that foot (ybot.json stepPos: the sole's
   * middle relative to the root), the time left at the current rate, the body's velocity over it, the stairs warp.
   */
  _predictLanding(ctx, x, z, yaw, st) {
    let dom = null;
    for (const c of this.list) if (c.meta.stepPos && (!dom || c.w > dom.w)) dom = c;
    for (let s = 0; s < 2; s++) {
      const L = ctx.land[s];
      L.ok = false;
      if (!dom || dom.w < 0.3 || ctx.contact[s] > 0.6) continue;
      const sp = dom.meta.stepPos[s];
      if (!sp || !sp.length) continue;
      // next touch-down after now (cyclic: wrap)
      const u = dom.u;
      let best = null, bu = 9;
      for (const e of sp) { let d = e[0] - u; if (dom.meta.loop) d -= Math.floor(d); if (d >= 0 && d < bu) { bu = d; best = e; } }
      if (!best) continue;
      // (time left: in "move" the phase runs at _cps cycles per second; a one-shot plays at its own rate)
      const tLeft = this.mode === "move" ? bu / Math.max(0.2, this._cps || 1) : bu * dom.dur / (this.mode === "start" ? this.p.startRate : this.mode === "stop" ? this.p.stopRate : 1);
      const S = this.stairs, warpF = dom === S.clip ? S.sT : 1;
      const sy = Math.sin(yaw), cy = Math.cos(yaw);
      // (the clip's +z is the body's forward, +x its left)
      const lx = best[1], lz = best[2] * warpF;
      L.x = x + (st.vx || 0) * tLeft + cy * lx + sy * lz;
      L.z = z + (st.vz || 0) * tLeft - sy * lx + cy * lz;
      // the clip's sole at that touch-down, above the root line (a stair clip: a tread up / down, warped)
      L.h = best[3] * (dom === S.clip ? 1 + (S.sR - 1) * S.k : 1);
      L.ok = tLeft < 1.2;
      L.fwd = (L.x - x) * (st.slopeDx ?? 0) + (L.z - z) * (st.slopeDz ?? 1);
    }
  }
}
