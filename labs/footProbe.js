// THE FOOT AUDIT (Capsule Lab): cameras zoomed on the feet, and MEASUREMENTS of the character's feet along scripted
// walks over every surface of the course, at a simulated frame rate (30 / 60 / 144 fps: the frames are stepped
// synchronously with that dt, the controller at its own fixed rate, nothing rendered).
//
// Per foot, from the skinned mesh's own sole: a HEEL and a TOE point (found once from the foot's vertices in the
// standing pose, kept in the foot bone's frame), each with a ray down to the ground under it. Per frame:
//   stance       from the ANIMATION (the foot's animated height above its standing height, before the IK: < 3 cm)
//   slide        horizontal speed of the sole (mid heel-toe) while in stance and grounded, m/s
//   gap          the lower of heel / toe above the ground under it, cm (< 0: into the ground); in stance: float /
//                sink; any frame: the deepest penetration (toes through a step)
//   knee         thigh-shin angle, degrees (180 = straight; > 179 = locked straight / popping)
//   pelvis       the hips' height above the character's feet plane: its spread (cm), and the hips' peak vertical
//                speed (m/s: a step-up that teleports shows here)
//   IK jumps     the largest frame-to-frame change of a foot's IK ground offset, as a speed (m/s)
// The audit is lab-only: viewer/character/ code exposes only the hooks it reads (body.preIK, tp.autopilot).
import * as THREE from "three/webgpu";

const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

export class FootProbe {
  constructor(tp, world) {
    this.tp = tp; this.world = world;
    this.feet = null;
    this.camMode = "follow";
    this.camYaw = 0;
  }

  /** Heel / toe sole points of each foot, in the foot bone's frame (from the skinned mesh in its current pose). */
  setup() {
    const body = this.tp.body;
    if (!body.model || !body.footIK) { this.feet = null; return false; }
    let mesh = null;
    body.model.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
    if (!mesh) return false;
    body.root.updateMatrixWorld(true);
    const sk = mesh.skeleton, P = mesh.geometry.attributes.position, SI = mesh.geometry.attributes.skinIndex, SW = mesh.geometry.attributes.skinWeight;
    const rootInv = new THREE.Matrix4().copy(body.root.matrixWorld).invert();
    this.feet = body.footIK.legs.map((L) => {
      const bi = sk.bones.indexOf(L.foot);
      const pts = [];
      for (let i = 0; i < P.count; i++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === bi) w += SW.getComponent(i, k);
        if (w < 0.6) continue;
        _v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix);
        _m.multiplyMatrices(L.foot.matrixWorld, sk.boneInverses[bi]);
        _v.applyMatrix4(_m);                                  // world (rigid on the foot bone)
        pts.push(_v.clone().applyMatrix4(rootInv));          // in the character's frame (+z forward)
      }
      if (!pts.length) return null;
      const minY = Math.min(...pts.map((p) => p.y));
      const sole = pts.filter((p) => p.y < minY + 0.015);
      const heel = sole.reduce((a, p) => (p.z < a.z ? p : a)), toe = sole.reduce((a, p) => (p.z > a.z ? p : a));
      const footInv = new THREE.Matrix4().copy(L.foot.matrixWorld).invert();
      const toLocal = (p) => p.clone().applyMatrix4(body.root.matrixWorld).applyMatrix4(footInv);
      _v.setFromMatrixPosition(L.foot.matrixWorld);
      return { L, heel: toLocal(heel), toe: toLocal(toe), len: toe.z - heel.z, restY: _v.y - body.root.position.y, n: pts.length,
        hw: new THREE.Vector3(), tw: new THREE.Vector3(), animY: 0, cH: new THREE.Vector3(), cT: new THREE.Vector3(), cKnee: 180, cHipY: 0 };
    });
    if (this.feet.some((f) => !f)) { this.feet = null; return false; }
    const hips = body.model.getObjectByName("Hips");
    this.hipRest = hips ? hips.getWorldPosition(_v).y - body.root.position.y : 0;
    body.preIK = (rootY) => {
      body.root.updateMatrixWorld(true);
      const pel = body.modelInner.position.y * body.modelScale;     // (the last frame's pelvis offset is still on the model)
      const r = body.root.position;
      for (const f of this.feet) {
        const L = f.L;
        L.foot.getWorldPosition(_v); f.animY = _v.y - pel - rootY - f.restY; body.root.worldToLocal(_v); f.animZ = _v.z;
        // the clip's own pose (pelvis taken out), to judge the IK's against: heel, toe (relative to the root), knee, hip
        f.cH.copy(f.heel).applyMatrix4(L.foot.matrixWorld); f.cH.x -= r.x; f.cH.y -= r.y + pel; f.cH.z -= r.z;
        f.cT.copy(f.toe).applyMatrix4(L.foot.matrixWorld); f.cT.x -= r.x; f.cT.y -= r.y + pel; f.cT.z -= r.z;
        L.upper.getWorldPosition(_a); L.lower.getWorldPosition(_b); L.end.getWorldPosition(_c);
        f.cKnee = _w.subVectors(_a, _b).angleTo(_v.subVectors(_c, _b)) * 180 / Math.PI;
        f.cHipY = _a.y - pel - r.y; f.cExt = _a.distanceTo(_c) / (_a.distanceTo(_b) + _b.distanceTo(_c));
      }
    };
    return true;
  }

  /** The ground's height under (x, z), looking down from y + 0.6 (null: none within 2 m). */
  ground(x, y, z) {
    const t = this.world.ray(x, y + 0.6, z, 0, -1, 0, 2.6);
    return t < Infinity ? y + 0.6 - t : null;
  }

  // ------------------------------------------------------------------------------------------------ cameras
  /** After tp.update: override the camera for the foot views (follow = the normal spring arm). */
  camera(camera, dt) {
    const m = this.camMode;
    if (m === "follow") { return; }
    const tp = this.tp, x = tp.x, y = tp.y, z = tp.z, yaw = tp.S[3];
    // the view's heading follows the character's slowly (turning on the spot stays readable)
    let d = yaw - this.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.camYaw += d * (1 - Math.exp(-3 * dt));
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw), rx = fz, rz = -fx;    // forward, right (of the character)
    if (m === "feet side") { camera.position.set(x - rx * 3.3, y + 0.25, z - rz * 3.3); camera.lookAt(x, y + 0.33, z); }
    else if (m === "feet front") { camera.position.set(x + fx * 2.4, y + 0.25, z + fz * 2.4); camera.lookAt(x, y + 0.3, z); }
    else if (m === "feet top") { camera.position.set(x - fx * 0.05, y + 3.4, z - fz * 0.05); camera.up.set(fx, 0, fz); camera.lookAt(x, y, z); camera.up.set(0, 1, 0); }
    else if (m === "feet 3/4") { camera.position.set(x - rx * 1.7 + fx * 1.5, y + 0.6, z - rz * 1.7 + fz * 1.5); camera.lookAt(x, y + 0.3, z); }
    if (camera.fov !== 28) { camera.fov = 28; camera.updateProjectionMatrix(); }
  }

  /** Play a scenario live (rendered, at the lab's time scale): the same script as simulate(). */
  play(sc, loop = false) {
    const tp = this.tp;
    let t = -(sc.pre ?? 0.6), jumped = false;
    tp.start(sc.start[0], sc.start[1], sc.start[2], sc.start[3] ?? 0);
    tp.autopilot = (inp, dt) => {
      t += dt;
      if (t > sc.secs) { inp.x = inp.z = 0; inp.run = false; if (t > sc.secs + 1) { if (loop) this.play(sc, true); else tp.autopilot = null; } return; }
      if (t < 0) { inp.x = inp.z = 0; inp.run = false; return; }
      if (typeof sc.dir === "function") { const r = sc.dir(t); inp.x = r[0]; inp.z = r[1]; inp.run = r[2] ?? !!sc.run; if (r[3]) inp.jump = true; }
      else { inp.x = sc.dir[0]; inp.z = sc.dir[1]; inp.run = !!sc.run; }
      if (sc.jumpAt !== undefined && !jumped && t >= sc.jumpAt) { inp.jump = true; jumped = true; }
    };
  }
  stop() { this.tp.autopilot = null; }

  // ------------------------------------------------------------------------------------------------ measurement
  /**
   * One scripted walk, measured. sc: { start: [x, y, z, yaw], dir: [x, z] | (t) => [x, z, run?], secs, run, jumpAt }
   * fps: the simulated frame rate. Returns the metrics.
   */
  simulate(sc, fps) {
    const tp = this.tp, c = tp.ctl, ik = tp.body.footIK, dt = 1 / fps;
    if (!this.feet) this.setup();
    const feet = this.feet;
    tp.start(sc.start[0], sc.start[1], sc.start[2], sc.start[3] ?? 0);
    if (ik) { ik.weight = 0; ik.pelvis = 0; ik.reset?.(); }
    let t = -(sc.pre ?? 0.6);                         // 0.6 s standing first (the IK and the idle settle)
    const cmd = [0, 0, false];
    tp.autopilot = (inp) => {
      if (t < 0) { inp.x = inp.z = 0; inp.run = false; return; }
      if (typeof sc.dir === "function") { const r = sc.dir(t); inp.x = r[0]; inp.z = r[1]; inp.run = r[2] ?? !!sc.run; if (r[3]) inp.jump = true; }
      else { inp.x = sc.dir[0]; inp.z = sc.dir[1]; inp.run = !!sc.run; }
      if (sc.jumpAt !== undefined && cmd[2] === false && t >= sc.jumpAt) { inp.jump = true; cmd[2] = true; }
    };
    const A = { frames: 0, stance: [0, 0], slideSum: [0, 0], slideMax: 0, slides: [], gapStanceMin: Infinity, gapStanceMax: -Infinity, floatSum: 0, floatN: 0,
      pen: 0, heelFloat: 0, toeFloat: 0, kneeMin: 180, kneeMax: 0, kneeLocked: 0, pelvis: [], gaps: [], dip: 0, foldMax: -180, extN: 0, extMax: -1, extOver: 0, pitchDev: 0, pitchMin: 90, pitchMax: -90, offY: 0, offXZ: 0, extraLift: -1, heelToHip: -1, hipHeelMin: 9, hipV: 0, ikJump: 0, landed: false, airFrames: 0 };
    const prevMid = [null, null], prevOff = [0, 0], prevZ = [null, null], prevSt = [false, false];
    let prevHip = null;
    const hips = tp.body.model?.getObjectByName("Hips");
    try {
      for (; t < sc.secs; t += dt) {
        tp.update(dt);
        if (t < 0 || !feet) continue;
        A.frames++;
        if (!c.grounded) A.airFrames++;
        tp.body.root.updateMatrixWorld(true);
        for (let i = 0; i < 2; i++) {
          const f = feet[i], L = f.L;
          f.hw.copy(f.heel).applyMatrix4(L.foot.matrixWorld); f.tw.copy(f.toe).applyMatrix4(L.foot.matrixWorld);
          const gh = this.ground(f.hw.x, f.hw.y, f.hw.z), gt = this.ground(f.tw.x, f.tw.y, f.tw.z);
          const hg = gh === null ? 0 : f.hw.y - gh, tg = gt === null ? 0 : f.tw.y - gt, low = Math.min(hg, tg);
          if (low < -A.pen) A.pen = -low;
          // the contact point: the heel, the toe (rolling over it) or between them (flat)
          // (blended by the two gaps, continuous: a switch from heel to toe would read as a 20 cm jump)
          let wh = Math.min(1, Math.max(0, ((tg - hg) + 0.03) / 0.06)); wh = wh * wh * (3 - 2 * wh);
          // the slide: the drift of the sole's points that are down (heel, toe or both), not of the blended point
          const mx = prevMid[i] ? wh * (f.hw.x - prevMid[i][0]) + (1 - wh) * (f.tw.x - prevMid[i][2]) : 0, mz = prevMid[i] ? wh * (f.hw.z - prevMid[i][1]) + (1 - wh) * (f.tw.z - prevMid[i][3]) : 0;
          // stance from the animation: the foot low and not swinging forward (relative to the body)
          const vzl = prevZ[i] === null ? 0 : (f.animZ - prevZ[i]) / dt;
          prevZ[i] = f.animZ;
          const stance = f.animY < 0.03 && vzl < 0.1 && c.grounded && (gh !== null || gt !== null);
          const was = prevSt[i]; prevSt[i] = stance;
          if (stance && was && prevMid[i]) {
            const sp = Math.hypot(mx, mz) / dt;
            A.stance[i]++; A.slideSum[i] += sp; A.slides.push(sp);
            A.gapStanceMin = Math.min(A.gapStanceMin, low); A.gapStanceMax = Math.max(A.gapStanceMax, low);
            A.floatSum += Math.abs(low); A.floatN++; A.gaps.push(Math.abs(low));
            if (hg > A.heelFloat) A.heelFloat = hg;
            if (tg > A.toeFloat) A.toeFloat = tg;
          }
          prevMid[i] = [f.hw.x, f.hw.z, f.tw.x, f.tw.z];
          L.upper.getWorldPosition(_a); L.lower.getWorldPosition(_b); L.end.getWorldPosition(_c);
          const knee = _w.subVectors(_a, _b).angleTo(_v.subVectors(_c, _b)) * 180 / Math.PI;
          A.kneeMin = Math.min(A.kneeMin, knee); A.kneeMax = Math.max(A.kneeMax, knee); if (knee > 179) A.kneeLocked++;
          // POSE PLAUSIBILITY (against the clip's own pose this frame)
          const len = _a.distanceTo(_b) + _b.distanceTo(_c), ext = _a.distanceTo(_c) / len;
          const fold = f.cKnee - knee;                                   // > 0: folded more than the clip
          if (fold > A.foldMax) A.foldMax = fold;
          if (stance) { A.extN++; if (ext - f.cExt > A.extMax) A.extMax = ext - f.cExt; if (ext > Math.max(0.97, f.cExt + 0.01)) A.extOver++; }
          const r0 = tp.body.root.position;
          const pitch = Math.atan2(f.tw.y - f.hw.y, Math.hypot(f.tw.x - f.hw.x, f.tw.z - f.hw.z)) * 180 / Math.PI;
          const cPitch = Math.atan2(f.cT.y - f.cH.y, Math.hypot(f.cT.x - f.cH.x, f.cT.z - f.cH.z)) * 180 / Math.PI;
          if (Math.abs(pitch - cPitch) > A.pitchDev) A.pitchDev = Math.abs(pitch - cPitch);
          if (pitch < A.pitchMin) A.pitchMin = pitch; if (pitch > A.pitchMax) A.pitchMax = pitch;
          const dy = (f.hw.y - r0.y) - f.cH.y, dxz = Math.hypot((f.hw.x - r0.x) - f.cH.x, (f.hw.z - r0.z) - f.cH.z);
          if (Math.abs(dy) > A.offY) A.offY = Math.abs(dy); if (dxz > A.offXZ) A.offXZ = dxz;
          if (!stance && c.grounded) {
            const extra = hg - f.cH.y;                                   // swing heel above the ground under it, beyond the clip's
            if (extra > A.extraLift) A.extraLift = extra;
            // hip above the heel, net of the ground under the heel (a foot on a higher tread is legitimately closer): IK vs clip
            const hh = (_a.y - r0.y) - hg, chh = f.cHipY - f.cH.y;
            if (chh - hh > A.heelToHip) A.heelToHip = chh - hh;
            if (hh < A.hipHeelMin) A.hipHeelMin = hh;
          }
          const off = (L.off ?? 0);
          if (A.frames > 1) A.ikJump = Math.max(A.ikJump, Math.abs(off - prevOff[i]) / dt);
          prevOff[i] = off;
        }
        if (hips) {
          hips.getWorldPosition(_v);
          A.pelvis.push(_v.y - tp.y);
          if (c.grounded && this.hipRest - (_v.y - tp.y) > A.dip) A.dip = this.hipRest - (_v.y - tp.y);
          if (prevHip !== null && c.grounded) A.hipV = Math.max(A.hipV, Math.abs(_v.y - prevHip) / dt);
          prevHip = _v.y;
        }
      }
    } finally { tp.autopilot = null; }
    const s = A.slides.slice().sort((a, b) => a - b), pct = (q) => (s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0);
    const gs = A.gaps.sort((a, b) => a - b), gapP95 = gs.length ? gs[Math.floor(0.95 * (gs.length - 1))] : 0, badPct = gs.length ? gs.filter((g) => g > 0.03).length / gs.length * 100 : 0;
    const pm = A.pelvis.reduce((a, b) => a + b, 0) / Math.max(1, A.pelvis.length);
    const pstd = Math.sqrt(A.pelvis.reduce((a, b) => a + (b - pm) ** 2, 0) / Math.max(1, A.pelvis.length));
    return {
      slideMean: (A.slideSum[0] + A.slideSum[1]) / Math.max(1, A.stance[0] + A.stance[1]), slideP95: pct(0.95), slideMax: s.length ? s[s.length - 1] : 0,
      stanceFrac: (A.stance[0] + A.stance[1]) / Math.max(1, 2 * A.frames),
      sinkCm: Math.max(0, -A.gapStanceMin) * 100, floatCm: Math.max(0, A.gapStanceMax) * 100, gapMeanCm: A.floatSum / Math.max(1, A.floatN) * 100, gapP95Cm: gapP95 * 100, badPct,
      heelFloatCm: A.heelFloat * 100, toeFloatCm: A.toeFloat * 100, penCm: A.pen * 100,
      kneeMin: A.kneeMin, kneeMax: A.kneeMax, kneeLockedPct: A.kneeLocked / Math.max(1, 2 * A.frames) * 100,
      foldMax: A.foldMax, extMax: A.extMax, extOverPct: A.extOver / Math.max(1, A.extN) * 100, pitchDev: A.pitchDev, pitchMin: A.pitchMin, pitchMax: A.pitchMax,
      offYCm: A.offY * 100, offXZCm: A.offXZ * 100, extraLiftCm: A.extraLift * 100, heelToHipCm: A.heelToHip * 100, hipHeelMin: A.hipHeelMin,
      pelvisStdCm: pstd * 100, dipCm: A.dip * 100, hipVmax: A.hipV, ikJump: A.ikJump, endX: c.pos[0], endY: c.pos[1], endZ: c.pos[2], air: A.airFrames,
    };
  }
}
