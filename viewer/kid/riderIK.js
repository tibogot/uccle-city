// THE RIDER (docs/KID.md "Riding"): the kid's skeleton driven by the bike. Not a ragdoll, not clips: a base pose
// (a frame of the kid's own Idle clip: fists, relaxed shoulders) and then, every frame, in this order:
//   1. the HIPS: on / over the seat empty in the bike's CoM frame (it leans and pitches with the bike, not with the legs:
//      a crouch / landing moves the bike up under the body, the knees bend), raised and pushed forward when STANDING
//      (sprint, hop preload, air), lowered and moved back when CROUCHING (Space, a landing), back in a MANUAL, rocked
//      side to side with the cranks when standing; then FITTED to the legs: never further from the pedals' circle
//      (the crank axle + crank length) than RIDE.reachLeg of the leg's length (no stretching, on any bike geometry);
//   2. the pelvis turned with the frame (a little forward pitch) + an extra LEAN INTO THE TURN (the upper body leans a
//      little more than the bike);
//   3. the SPINE bent forward (spread over spine_01..03) just enough that the shoulders are RIDE.reachArm of the
//      arm's length from the grips (bisection: long arms, short bars, standing or seated, it reaches);
//   4. the HEAD level and looking ahead (yaw from the bike's heading; it does not pitch with a manual);
//   5. the ARMS: two-bone IK, wrists to the grip empties, elbows out and back;
//   6. the LEGS: two-bone IK, ankles to the pedal empties (the ball of the foot on the pedal), knees forward and a
//      little out; the foot follows the frame with an ankling angle from the crank; a foot down at a stop.
// Every limb's reach is measured (metrics): tools/kid/kidTest.mjs checks it over full crank turns and full steer.
// Off the bike: pushPose (walking beside the bike, hand on the grip and on the seat), clipPose (the crash tumble, the
// get-up, sitting). All on three.js bones; no allocation per frame.
import * as THREE from "three/webgpu";

export const RIDE = {
  hipUp: 0.075, hipBack: 0.0,                // seated: the pelvis joint above / behind the seat empty (m, frame axes)
  standUp: 0.16, standFwd: 0.12,             // standing (sprint, preload, air)
  crouchDown: 0.12, crouchBack: 0.08,        // crouching (Space hold, landing absorb)
  manualBack: 0.14,                          // a manual: hips back
  swayStand: 0.035,                          // standing: the hips rock with the cranks
  pelvisPitch: 0.18, standPitch: 0.22,       // rad forward
  leanExtra: 0.22,                           // the upper body leans this much more than the bike
  reachLeg: 0.965, reachArm: 0.90,           // fraction of the limb's length the targets are kept within
  ankleUp: 0.075, ankleBack: 0.055,          // the ankle above / behind the pedal's centre (the ball on the pedal)
  wristBack: 0.045,                          // the wrist behind the grip's centre (the fist round the bar)
  headDown: 0.10,                            // the gaze a little down the road
  spineMax: 1.15,                            // rad of forward bend at most
};

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _t = new THREE.Vector3(), _p = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qF = new THREE.Quaternion(), _qY = new THREE.Quaternion();
const _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);
const _left = new THREE.Vector3(), _up = new THREE.Vector3(), _fwd = new THREE.Vector3();
const _mat = new THREE.Matrix4();

function setWorldQuat(b, q) {
  b.parent.getWorldQuaternion(_q3);
  b.quaternion.copy(_q3.invert().multiply(q));
  b.updateMatrixWorld(true);
}
function setWorldPos(b, p) {
  b.parent.updateWorldMatrix(true, false);
  b.position.copy(b.parent.worldToLocal(_t.copy(p)));
  b.updateMatrixWorld(true);
}
/** rotate bone b so that the direction from its head to `from` points to `to` (world) */
function aim(b, from, to) {
  b.getWorldPosition(_p);
  _d.subVectors(from, _p).normalize(); _e.subVectors(to, _p).normalize();
  if (_d.lengthSq() < 1e-10 || _e.lengthSq() < 1e-10) return;
  _q.setFromUnitVectors(_d, _e);
  b.getWorldQuaternion(_q2);
  setWorldQuat(b, _q.multiply(_q2));
}

/**
 * Two-bone IK in world space: upper (a) -> lower (b) -> end (c) to target T, the middle joint toward `pole`.
 * Never stretches: the reach is clamped to maxRatio of the limb. Returns the wanted reach ratio (before the clamp).
 */
export function twoBone(a, b, c, T, pole, maxRatio = 0.999) {
  const A = a.getWorldPosition(new THREE.Vector3()), B = b.getWorldPosition(_b), C = c.getWorldPosition(_c);
  const l1 = A.distanceTo(B), l2 = B.distanceTo(C);
  _n.subVectors(T, A);
  const want = _n.length(), ratio = want / (l1 + l2);
  const d = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min((l1 + l2) * maxRatio, want));
  const dir = _n.normalize();
  _m.subVectors(pole, A); _m.addScaledVector(dir, -_m.dot(dir));
  if (_m.lengthSq() < 1e-10) _m.set(0, 1, 0).addScaledVector(dir, -dir.y);
  _m.normalize();
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))), sinA = Math.sqrt(1 - cosA * cosA);
  const Bn = _a.copy(A).addScaledVector(dir, l1 * cosA).addScaledVector(_m, l1 * sinA);
  const Cn = _e.copy(A).addScaledVector(dir, d);
  aim(a, B.clone(), Bn.clone());
  b.getWorldPosition(_b); c.getWorldPosition(_c);
  aim(b, _c.clone(), Cn.clone());
  return ratio;
}

export class RiderIK {
  /**
   * model: the kid's gltf.scene (its bones by UAL name), clips: gltf.animations. The base pose is the Idle clip at t=0.
   */
  constructor(model, clips, { base = "Idle", P = RIDE } = {}) {
    this.model = model; this.P = P; this.clips = new Map(clips.map((c) => [c.name, c]));
    const B = (n) => { const o = model.getObjectByName(n); if (!o) throw new Error("rider: no bone " + n); return o; };
    this.b = {};
    for (const n of ["root", "pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head", "upperarm_l", "lowerarm_l", "hand_l", "upperarm_r", "lowerarm_r", "hand_r",
      "thigh_l", "calf_l", "foot_l", "thigh_r", "calf_r", "foot_r", "ball_l", "ball_r"]) this.b[n] = B(n);
    this._samplers = new Map();
    this.base = base;
    this.bones = []; model.traverse((o) => { if (o.isBone) this.bones.push(o); });
    // the model-space rest orientation of the bones we set absolutely (base pose, model at identity)
    this.samplePose(base, 0);
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(_q2); const inv = _q2.clone().invert();
    this.mq = {};
    for (const n of ["pelvis", "spine_01", "spine_02", "spine_03", "Head", "foot_l", "foot_r"]) this.mq[n] = inv.clone().multiply(this.b[n].getWorldQuaternion(new THREE.Quaternion()));
    // limb lengths and the hip joints' offset from the pelvis (model space)
    const L = (a, b2) => this.b[a].getWorldPosition(new THREE.Vector3()).distanceTo(this.b[b2].getWorldPosition(new THREE.Vector3()));
    this.leg = [L("thigh_l", "calf_l") + L("calf_l", "foot_l"), L("thigh_r", "calf_r") + L("calf_r", "foot_r")];
    this.arm = [L("upperarm_l", "lowerarm_l") + L("lowerarm_l", "hand_l"), L("upperarm_r", "lowerarm_r") + L("lowerarm_r", "hand_r")];
    const pw = this.b.pelvis.getWorldPosition(new THREE.Vector3());
    this.hipOff = ["thigh_l", "thigh_r"].map((n) => this.b[n].getWorldPosition(new THREE.Vector3()).sub(pw).applyQuaternion(inv));
    this.metrics = { legRatio: [0, 0], armRatio: [0, 0], legErr: [0, 0], armErr: [0, 0], spine: 0, fitted: 0 };
    this._snap = null;
  }

  /** the pose of clip `name` at time t (seconds, wrapped) on the bones (local), no mixer */
  samplePose(name, t) {
    const clip = this.clips.get(name);
    if (!clip) return false;
    let S = this._samplers.get(name);
    if (!S) {
      S = clip.tracks.map((tr) => {
        const [node, prop] = tr.name.split(".");
        const o = this.model.getObjectByName(node);
        return o && (prop === "quaternion" || prop === "position") ? { o, prop, it: tr.createInterpolant() } : null;
      }).filter(Boolean);
      this._samplers.set(name, S);
    }
    const tt = clip.duration > 0 ? ((t % clip.duration) + clip.duration) % clip.duration : 0;
    for (const s of S) {
      const r = s.it.evaluate(tt);
      if (s.prop === "quaternion") s.o.quaternion.set(r[0], r[1], r[2], r[3]);
      else s.o.position.set(r[0], r[1], r[2]);
    }
    return true;
  }

  /**
   * RIDING: E = the bike's empties (bikeRig.js), s = the bike state (bikePhysics), root = the object holding the model
   * (moved under the bike). Writes the bones; returns this.metrics.
   */
  ride(E, s, root, groundY = null) {
    const P = this.P, b = this.b, M = this.metrics;
    const F = E.frame;
    F.updateWorldMatrix(true, true);
    F.getWorldQuaternion(_qF);
    _left.copy(_X).applyQuaternion(_qF); _up.copy(_Y).applyQuaternion(_qF); _fwd.copy(_Z).applyQuaternion(_qF);
    // the model's root under the bike (the ground under the CoM; the pelvis is placed explicitly below)
    F.getWorldPosition(_p);
    root.position.copy(_p).addScaledVector(_up, -(E.cg ?? 0.95)); root.quaternion.copy(_qF);
    root.updateMatrixWorld(true);
    this.samplePose(this.base, 0);
    this.model.updateMatrixWorld(true);
    // 1. the hips, in frame-local coordinates
    const legs = s.legs || 0, crouch = Math.min(1, Math.max(0, -legs * 1.4, s.preload ? s.preload * 0.6 : 0));
    const stand = Math.min(1, Math.max(s.sprint || 0, s.air ? 0.55 : 0, legs > 0.05 ? legs * 1.5 : 0, s.preload ? s.preload * 0.5 : 0));
    const manual = (s.manual || 0) > 0 ? 1 : Math.max(0, Math.min(1, (s.pitch || 0) / 0.35));
    const seat = F.worldToLocal(E.seat.getWorldPosition(_a));
    const hip = _b.set(
      P.swayStand * stand * Math.sin(s.crank || 0),
      seat.y + P.hipUp + stand * P.standUp - crouch * P.crouchDown,
      seat.z - P.hipBack + stand * P.standFwd - crouch * P.crouchBack - manual * P.manualBack);
    // fitted to the legs: the hip joints within reachLeg of the farthest point of the ankles' circle
    const bb = F.worldToLocal(E.bb.getWorldPosition(_c));
    const pl = F.worldToLocal(E.pedal_L.getWorldPosition(_d));
    const crank = Math.hypot(pl.y - bb.y, pl.z - bb.z) || 0.165;
    const cy = bb.y + P.ankleUp, cz = bb.z - P.ankleBack;
    let fitted = 0;
    for (let k = 0; k < 2; k++) {
      const off = this.hipOff[k], hx = hip.x + off.x, hy = hip.y + off.y, hz = hip.z + off.z;
      const px = k === 0 ? pl.x : -pl.x;
      const reach = P.reachLeg * this.leg[k], dx = hx - px;
      const lim = Math.sqrt(Math.max(1e-6, reach * reach - dx * dx)) - crank;
      const dy = hy - cy, dz = hz - cz, dl = Math.hypot(dy, dz);
      if (dl > lim) { const f = lim / dl; hip.y = cy + dy * f - off.y; hip.z = cz + dz * f - off.z; fitted = Math.max(fitted, dl - lim); }
    }
    M.fitted = fitted;
    // 2. the pelvis: placed + turned with the frame, pitched forward, leaning into the turn
    const roll = -(s.lean || 0) * P.leanExtra;
    const pitch = P.pelvisPitch + stand * P.standPitch - manual * 0.15;
    F.localToWorld(_p.copy(hip));
    setWorldPos(b.pelvis, _p);
    _q.setFromAxisAngle(_Z, roll); _q2.setFromAxisAngle(_X, pitch);
    setWorldQuat(b.pelvis, _q3.copy(_qF).multiply(_q).multiply(_q2).multiply(this.mq.pelvis));
    // 3. the spine: bent until the shoulders are within reach of the grips
    const gL = E.grip_L.getWorldPosition(new THREE.Vector3()), gR = E.grip_R.getWorldPosition(new THREE.Vector3());
    const want = P.reachArm * Math.min(this.arm[0], this.arm[1]);
    const bend = (th) => {
      for (const [n, w] of [["spine_01", 0.3], ["spine_02", 0.35], ["spine_03", 0.35]]) {
        _q.setFromAxisAngle(_Z, roll * 1.3); _q2.setFromAxisAngle(_X, pitch + th * (n === "spine_01" ? 0.3 : n === "spine_02" ? 0.65 : 1.0));
        setWorldQuat(b[n], _q3.copy(_qF).multiply(_q).multiply(_q2).multiply(this.mq[n]));
      }
      const sl = b.upperarm_l.getWorldPosition(_a), d1 = sl.distanceTo(gL);
      const sr = b.upperarm_r.getWorldPosition(_a), d2 = sr.distanceTo(gR);
      return Math.max(d1, d2) - want;
    };
    let lo = 0.05, hi = P.spineMax;
    if (bend(lo) <= 0) hi = lo;
    else if (bend(hi) > 0) lo = hi;
    else for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (bend(mid) > 0) lo = mid; else hi = mid; }
    bend(hi); M.spine = hi;
    // 4. the head: level, looking ahead (the heading's yaw, half the bike's lean)
    const yaw = Math.atan2(_fwd.x, _fwd.z);
    _qY.setFromAxisAngle(_Y, yaw); _q.setFromAxisAngle(_Z, (s.lean || 0) * -0.35 + 0); _q2.setFromAxisAngle(_X, P.headDown);
    setWorldQuat(b.Head, _q3.copy(_qY).multiply(_q).multiply(_q2).multiply(this.mq.Head));
    // 5. the arms
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1, g = k === 0 ? gL : gR;
      const ua = k === 0 ? b.upperarm_l : b.upperarm_r, la = k === 0 ? b.lowerarm_l : b.lowerarm_r, ha = k === 0 ? b.hand_l : b.hand_r;
      const sh = ua.getWorldPosition(new THREE.Vector3());
      const T = _c.subVectors(sh, g).normalize().multiplyScalar(P.wristBack).add(g).addScaledVector(_up, 0.012);
      const pole = _d.copy(sh).addScaledVector(_left, side * 0.35).addScaledVector(_fwd, -0.25).addScaledVector(_up, -0.15);
      M.armRatio[k] = twoBone(ua, la, ha, T.clone(), pole.clone(), 0.999);
      M.armErr[k] = ha.getWorldPosition(_e).distanceTo(T);
    }
    // 6. the legs (+ the foot down at a stop)
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      const th = k === 0 ? b.thigh_l : b.thigh_r, ca = k === 0 ? b.calf_l : b.calf_r, ft = k === 0 ? b.foot_l : b.foot_r;
      const pe = (k === 0 ? E.pedal_L : E.pedal_R).getWorldPosition(new THREE.Vector3());
      const T = pe.clone().addScaledVector(_up, P.ankleUp).addScaledVector(_fwd, -P.ankleBack);
      const fd = k === 0 ? Math.min(1, Math.max(0, ((s.footDown || 0) - 0.5) * 2)) : 0;
      if (fd > 0 && groundY !== null) {
        const hipW = th.getWorldPosition(_a);
        const down = _e.copy(hipW).addScaledVector(_left, 0.16).addScaledVector(_fwd, 0.12);
        down.y = groundY + 0.09;
        T.lerp(down, fd);
      }
      const hipW = th.getWorldPosition(new THREE.Vector3());
      const pole = _d.copy(hipW).addScaledVector(_fwd, 0.6).addScaledVector(_up, 0.15).addScaledVector(_left, side * 0.1);
      M.legRatio[k] = twoBone(th, ca, ft, T, pole.clone(), 0.999);
      M.legErr[k] = ft.getWorldPosition(_e).distanceTo(T);
      // the foot along the frame, ankling with the crank (toes down at the bottom / back of the stroke)
      const ang = (s.crank || 0) + (k === 0 ? 0 : Math.PI);
      _q.setFromAxisAngle(_X, 0.08 + 0.16 * Math.sin(ang - 0.4) * (1 - fd));
      setWorldQuat(ft, _q3.copy(_qF).multiply(_q).multiply(k === 0 ? this.mq.foot_l : this.mq.foot_r));
    }
    return M;
  }

  /** PUSHING the bike (bikePhysics s.pushing): walking beside it on its left, the walk clip in step, hands on it */
  push(E, s, root, groundY, walkPhase) {
    const F = E.frame;
    F.updateWorldMatrix(true, true); F.getWorldQuaternion(_qF);
    _fwd.copy(_Z).applyQuaternion(_qF); _fwd.y = 0; _fwd.normalize();
    _left.set(_fwd.z, 0, -_fwd.x);
    F.getWorldPosition(_p);
    root.position.set(_p.x + _left.x * 0.48, groundY, _p.z + _left.z * 0.48);
    root.quaternion.setFromAxisAngle(_Y, Math.atan2(_fwd.x, _fwd.z));
    root.updateMatrixWorld(true);
    const walk = this.clips.get("Walk");
    this.samplePose("Walk", walk ? (walkPhase / (Math.PI * 2)) * walk.duration : 0);
    this.model.updateMatrixWorld(true);
    const b = this.b;
    for (const [ua, la, ha, target] of [[b.upperarm_r, b.lowerarm_r, b.hand_r, E.grip_L], [b.upperarm_l, b.lowerarm_l, b.hand_l, E.seat]]) {
      const T = target.getWorldPosition(new THREE.Vector3()).add(_a.set(0, 0.03, 0));
      const sh = ua.getWorldPosition(new THREE.Vector3());
      twoBone(ua, la, ha, T, sh.clone().add(_a.set(0, -0.3, 0)).addScaledVector(_fwd, -0.2), 0.999);
    }
  }

  /** a clip's pose at (x, groundY, z) facing yaw: the crash tumble, the get-up, sitting */
  clipPose(root, name, t, x, y, z, yaw) {
    root.position.set(x, y, z); root.quaternion.setFromAxisAngle(_Y, yaw); root.updateMatrixWorld(true);
    this.samplePose(name, t);
    this.model.updateMatrixWorld(true);
  }

  /** the bones' local pose (+ the root's world transform) kept, for a blend (mount / dismount) */
  snapshot(root) {
    const S = this._snap ||= { q: this.bones.map(() => new THREE.Quaternion()), p: this.bones.map(() => new THREE.Vector3()), rp: new THREE.Vector3(), rq: new THREE.Quaternion() };
    this.bones.forEach((o, i) => { S.q[i].copy(o.quaternion); S.p[i].copy(o.position); });
    S.rp.copy(root.position); S.rq.copy(root.quaternion);
    return S;
  }
  /** after this frame's pose: blend back toward the snapshot by (1 - w) (w: 0 = the snapshot, 1 = this frame's pose) */
  blendFrom(S, root, w, lift = 0) {
    const k = 1 - w;
    this.bones.forEach((o, i) => { o.quaternion.slerp(S.q[i], k); o.position.lerp(S.p[i], k); });
    root.position.lerp(S.rp, k); root.position.y += lift; root.quaternion.slerp(S.rq, k);
    root.updateMatrixWorld(true);
  }
}
