// FOOT IK for the third-person character: the feet stand on stairs, kerbs and slopes, and a planted foot stays put.
//
// Per frame, after the animation mixer (body.js), each foot from its ANIMATED pose:
//   contact   how planted the clip's foot is (its sole's height above the clip's flat ground: 1 down, 0 from 5 cm up)
//   lock      a planted foot does not slide: a world-space correction (xz + yaw) cancels the clip's foot drift while it
//             is planted (stride / speed mismatch, turning, start and stop), fades out through the swing. Standing,
//             a foot twisted or dragged too far by a turn on the spot takes a quick STEP (lifted, put down at the clip's
//             place), one foot at a time.
//   ground    two rays, under the HEEL and the TOE (the sole's own points, from the skinned mesh): a slope tilts the foot
//             (<= maxTilt), an edge (a stair nosing, a kerb) holds it level on the HIGHER side (no toe in the riser, the
//             heel hangs over a step down). A swinging foot also looks AHEAD of its toe and is carried over higher ground
//             before it gets there (stairs up read as steps, no toes through the risers). Planted: the ground height is
//             exact (no lag: an eased planted foot sinks or floats); swinging: eased.
//   pelvis    a critically damped spring to the lower planted foot's ground (down, or up when both feet stand higher),
//             and always low enough that each leg reaches its foot; a landing kicks it down by the fall speed (absorb)
//   legs      two-bone IK, the knee in the plane of the animated knee (the pole), a SOFT reach (no knee pop) and the
//             foot attached to the shin's end exactly
// The rig (Quaternius modular men): Foot.L / Foot.R are IK-style bones under Root (their origin is at the heel), the
// leg chain UpperLeg -> LowerLeg -> LowerLeg_end (ankle) is solved to reach them. No allocations per frame.
import * as THREE from "three/webgpu";

export const FOOT_IK = {
  lock: true,           // planted feet locked in the world (false: the clip's feet as they are, only lifted / lowered)
  raise: 0.75,          // m: the rays start this high above the feet plane
  reach: 0.55,          // m: how far up / down a foot may be moved from the clip's flat ground
  maxTilt: 30,          // degrees: the foot's tilt to a slope
  maxDrop: 0.25, maxRise: 0.06,   // m: the pelvis
  lowFollow: 0.35,       // how much of the lower planted foot's drop the pelvis follows (the reach is always kept)
  pelvisOmega: 16,      // 1/s: the pelvis spring (critically damped)
  swingSmooth: 22,      // 1/s: a swinging foot's height to the ground under / ahead of it
  normalSmooth: 14,     // 1/s: a swinging foot's tilt
  lockFade: 9,          // 1/s: the lock's correction fades through a swing
  maxLock: 0.25,        // m: a planted foot dragged further than this slides (the leg can't stay)
  maxTwist: 0.45,       // rad: a planted foot holds its heading against the body's turn this far, then pivots
  idleStep: 0.11, idleYaw: 22, stepTime: 0.28, stepLift: 0.07,   // a step on the spot: when, how long, how high
  look: 0.07, lookSpeed: 0.08,    // m + s * speed: how far ahead of the toe a swinging foot looks
  strideCut: 0.4,       // the stride is this much shorter on stairs / steep ramps (grade >= 0.6)
  maxShift: 0.1,       // m: how far a landing foot may be moved forward off a nosing / kerb edge
  soft: 0.96,           // fraction of the leg's length where the soft reach starts
  absorb: 0.32,         // pelvis kick on landing: m/s per m/s of fall speed (capped at 2.6 m/s)
  weightUp: 18, weightDown: 9,    // 1/s: the IK weight easing in (landing) / out (take-off)
};

const DEG = Math.PI / 180;
const _F = new THREE.Vector3(), _H = new THREE.Vector3(), _T = new THREE.Vector3(), _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _dir = new THREE.Vector3(), _perp = new THREE.Vector3(), _Bn = new THREE.Vector3(), _n = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class FootIK {
  constructor(model, inner, rig) {
    this.inner = inner;
    this.legs = [rig.left, rig.right].map((n) => ({
      upper: model.getObjectByName(n.upper), lower: model.getObjectByName(n.lower), end: model.getObjectByName(n.end), foot: model.getObjectByName(n.foot),
      heel: new THREE.Vector3(), toe: new THREE.Vector3(), len: 0.2, sole: 0,           // sole points (foot-local), length, ankle above sole
      contact: 0, plant: 0, lift: 0, off: 0, offS: 0, n: new THREE.Vector3(0, 1, 0),
      dx: 0, dz: 0, dyaw: 0, px: 0, pz: 0, qx: 0, qz: 0, pyaw: 0, has: false,                         // the lock: correction, last contact point
      step: -1, sx: 0, sz: 0, syaw: 0,                                                  // a step on the spot (progress, start correction)
      gH: 0, gT: 0, hit: 0, reachLen: 1, fx: 0, fz: 0, shift: 0, shiftT: 0, planted: false, ploc: 0, vloc: 0, warp: 0, ext: 0.9, stepLift: 0, ox: 0, oy: 0, oz: 0,   // ox..: the clip's foot bone from the shin's end
    }));
    this.ok = this.legs.every((l) => l.upper && l.lower && l.end && l.foot);
    this.p = { ...FOOT_IK };
    this.weight = 0; this.pelvis = 0; this.pelvisV = 0; this.stride = 1;
    this.stats = { rays: 0 };
    if (this.ok) this._soles(model);
  }

  /** The heel and toe of each foot's sole, in the foot bone's frame, from the skinned mesh's vertices on it. */
  _soles(model) {
    let mesh = null;
    model.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
    const root = this.inner;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const sx = new THREE.Vector3().setFromMatrixScale(root.matrixWorld).x || 1;
    for (const L of this.legs) {
      const pts = [];
      if (mesh) {
        const sk = mesh.skeleton, bi = sk.bones.indexOf(L.foot), P = mesh.geometry.attributes.position, SI = mesh.geometry.attributes.skinIndex, SW = mesh.geometry.attributes.skinWeight;
        if (bi >= 0) {
          _m.multiplyMatrices(sk.boneInverses[bi], mesh.bindMatrix);
          for (let i = 0; i < P.count; i++) {
            let w = 0;
            for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === bi) w += SW.getComponent(i, k);
            if (w < 0.6) continue;
            const loc = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(_m);              // foot-local
            pts.push({ loc, m: loc.clone().applyMatrix4(L.foot.matrixWorld).applyMatrix4(inv) });   // + in the model's frame (+z forward)
          }
        }
      }
      if (pts.length < 4) { L.heel.set(0, 0, 0); L.toe.set(0, 0, 0); continue; }
      let minY = Infinity;
      for (const p of pts) minY = Math.min(minY, p.m.y);
      let heel = null, toe = null;
      for (const p of pts) if (p.m.y < minY + 0.015 / sx) { if (!heel || p.m.z < heel.m.z) heel = p; if (!toe || p.m.z > toe.m.z) toe = p; }
      L.heel.copy(heel.loc); L.toe.copy(toe.loc);
      L.len = (toe.m.z - heel.m.z) * sx;
      _v1.setFromMatrixPosition(L.foot.matrixWorld).applyMatrix4(inv);
      L.sole = (_v1.y - minY) * sx;                      // the ankle (foot bone) above the sole, standing
    }
  }

  /** Forget the locks and the pelvis (a teleport). */
  reset() {
    this.pelvis = 0; this.pelvisV = 0;
    for (const L of this.legs) { L.dx = L.dz = L.dyaw = 0; L.shift = L.shiftT = 0; L.has = false; L.step = -1; L.offS = 0; L.n.set(0, 1, 0); }
  }

  /**
   * rootY: the character's feet plane (world y). st: { grounded, speed, landing (fall speed of a touch-down this frame,
   * m/s, else 0), vx, vz (m/s) }. enabled: false eases it all out.
   */
  update(dt, world, rootY, st, enabled = true) {
    if (!this.ok || dt <= 0) return;
    const p = this.p, legs = this.legs, inner = this.inner;
    const want = enabled && st.grounded ? 1 : 0;
    this._air = !st.grounded;
    this.weight += (want - this.weight) * (1 - Math.exp(-(want > this.weight ? p.weightUp : p.weightDown) * dt));
    const w = this.weight;
    if (w < 1e-3 && Math.abs(this.pelvis) < 1e-4 && Math.abs(this.pelvisV) < 1e-3) {
      if (inner.position.y !== 0) { inner.position.y = 0; inner.updateMatrixWorld(true); }
      this.pelvis = 0; this.pelvisV = 0;
      for (const L of legs) { L.dx = L.dz = L.dyaw = 0; L.has = false; L.step = -1; }
      return;
    }
    const sc = inner.parent.matrixWorld.elements[5] || 1;          // the holder's scale (inner is in its units)
    // the animated pose, pelvis at 0
    inner.position.y = 0;
    inner.updateMatrixWorld(true);
    const R = world.r, Hh = world.hit, maxT = Math.tan(p.maxTilt * DEG);
    const speed = st.speed || 0, idle = speed < 0.15;
    const vl = Math.sqrt((st.vx || 0) ** 2 + (st.vz || 0) ** 2), hx = vl > 0.05 ? st.vx / vl : 0, hz = vl > 0.05 ? st.vz / vl : 0;
    const kSwing = 1 - Math.exp(-p.swingSmooth * dt), kN = 1 - Math.exp(-p.normalSmooth * dt), kFade = 1 - Math.exp(-p.lockFade * dt);
    const rootYaw = this._rootYaw();
    // the stride on steep ground (st.grade: |rise| / run under the body)
    { const g = st.grade || 0, gk = g > 0.25 ? Math.min(1, (g - 0.25) / 0.35) : 0; this.stride += ((1 - p.strideCut * gk * gk * (3 - 2 * gk)) - this.stride) * (1 - Math.exp(-4 * dt)); }
    const stride = this.stride;
    let target = 0, any = false, need = -Infinity;
    let stepping = legs[0].step >= 0 || legs[1].step >= 0;
    for (let i = 0; i < 2; i++) {
      const L = legs[i], fw = L.foot.matrixWorld;
      // 1. the clip's foot: heel / toe in the world, its contact with the clip's flat ground
      _H.copy(L.heel).applyMatrix4(fw); _T.copy(L.toe).applyMatrix4(fw); _F.setFromMatrixPosition(fw);
      // stairs / steep ramps: the stride warped shorter along the heading (the clip's feet reach k times as far in front
      // of and behind the body), with the quicker cadence (body.js): a step about a tread, not a flat-ground stride
      if (stride < 0.999) {
        const ie0 = inner.matrixWorld.elements, rx = ie0[12], rz = ie0[14], k1 = stride - 1;
        // (the whole foot moved by its heel's warp: warping each point would shorten the foot itself)
        L.warp = ((_F.x - rx) * hx + (_F.z - rz) * hz) * k1;
        const wx = hx * L.warp, wz = hz * L.warp;
        _H.x += wx; _H.z += wz; _T.x += wx; _T.z += wz; _F.x += wx; _F.z += wz;
      } else L.warp = 0;
      const hH = _H.y - rootY, hT = _T.y - rootY, low = Math.min(hH, hT);
      L.lift = low;
      // the contact point (heel, toe, or between: continuous) of the clip, in the world
      const wh = smooth01((hT - hH + 0.03) / 0.06), cx = _T.x + (_H.x - _T.x) * wh, cz = _T.z + (_H.z - _T.z) * wh;
      // planted = low AND not swinging forward relative to the body (this clip's swing skims the ground: the height
      // alone held a swinging foot as planted): the contact point's forward speed in the body's frame
      const ie = inner.matrixWorld.elements, il = Math.sqrt(ie[8] * ie[8] + ie[10] * ie[10]) || 1;
      // (of the sole's middle: the contact point moves from heel to toe as the foot rolls)
      const loc = (((_H.x + _T.x) * 0.5 - ie[12]) * ie[8] + ((_H.z + _T.z) * 0.5 - ie[14]) * ie[10]) / il;
      if (L.has) L.vloc += ((loc - L.ploc) / dt - L.vloc) * (1 - Math.exp(-40 * dt));
      L.ploc = loc;
      let contact = (1 - smooth01((low - 0.015) / 0.035)) * (1 - smooth01((L.vloc - 0.05) / (0.3 * speed + 0.15)));
      // 2. the lock: while planted, the correction cancels the clip's contact point's drift in the world
      let yawA = rootYaw;
      if (L.has && L.step < 0 && p.lock) {
        const c = contact * w;
        let dyaw = yawA - L.pyaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        // the drift of the corrected contact point (rotating with the correction's yaw about the clip's own point)
        // (the drift of the sole's points that are down: the heel, the toe, or both; not of the contact point, which
        // moves from heel to toe as the foot rolls)
        L.dx -= (wh * (_H.x - L.px) + (1 - wh) * (_T.x - L.qx)) * c; L.dz -= (wh * (_H.z - L.pz) + (1 - wh) * (_T.z - L.qz)) * c; L.dyaw -= dyaw * c;
        // fading through a swing (and off when the IK is)
        const f = (1 - contact) * kFade + (1 - w) * kFade;
        L.dx -= L.dx * Math.min(1, f); L.dz -= L.dz * Math.min(1, f); L.dyaw -= L.dyaw * Math.min(1, f);
        const dl = Math.sqrt(L.dx * L.dx + L.dz * L.dz);
        if (dl > p.maxLock) { L.dx *= p.maxLock / dl; L.dz *= p.maxLock / dl; }
        if (L.dyaw > p.maxTwist) L.dyaw = p.maxTwist; else if (L.dyaw < -p.maxTwist) L.dyaw = -p.maxTwist;   // (beyond: the foot pivots with the body)
      }
      L.px = _H.x; L.pz = _H.z; L.qx = _T.x; L.qz = _T.z; L.pyaw = yawA; L.has = true;
      // standing and twisted / dragged too far: a step on the spot (one foot at a time)
      if (L.step < 0 && p.lock && idle && !stepping && w > 0.9 && (L.dx * L.dx + L.dz * L.dz > p.idleStep * p.idleStep || Math.abs(L.dyaw) > p.idleYaw * DEG)) {
        L.step = 0; L.sx = L.dx; L.sz = L.dz; L.syaw = L.dyaw; stepping = true;
      }
      let stepLift = 0;
      if (L.step >= 0) {
        L.step += dt / p.stepTime;
        const u = Math.min(1, L.step), e = 1 - smooth01(u);
        L.dx = L.sx * e; L.dz = L.sz * e; L.dyaw = L.syaw * e;
        stepLift = p.stepLift * Math.sin(Math.PI * u);
        contact *= 1 - Math.sin(Math.PI * u);
        if (L.step >= 1) { L.step = -1; L.dx = L.dz = L.dyaw = 0; }
      }
      L.contact = contact; L.plant = contact; L.stepLift = stepLift;
      // the foot's place: the clip's heel moved by the correction (turned by its yaw about the contact point)
      // (+ the landing shift along the heading: a foot about to land across a nosing is put down on one tread)
      if (L.planted && contact < 0.3) { L.planted = false; L.shiftT = 0; }
      if (contact > 0.95) L.planted = true;
      else L.shift += (L.shiftT - L.shift) * Math.min(1, 25 * dt);
      const cy = Math.cos(L.dyaw), sy = Math.sin(L.dyaw), shx = L.dx + hx * L.shift, shz = L.dz + hz * L.shift;
      const fx = cx + (_F.x - cx) * cy + (_F.z - cz) * sy + shx, fz = cz - (_F.x - cx) * sy + (_F.z - cz) * cy + shz;
      const tx = cx + (_T.x - cx) * cy + (_T.z - cz) * sy + shx, tz = cz - (_T.x - cx) * sy + (_T.z - cz) * cy + shz;
      const kx = cx + (_H.x - cx) * cy + (_H.z - cz) * sy + shx, kz = cz - (_H.x - cx) * sy + (_H.z - cz) * cy + shz;
      L.fx = fx; L.fz = fz; L.tx = tx; L.tz = tz;
      // 3. the ground under the heel and the toe
      const oy = rootY + p.raise;
      let gH = this._ray(world, kx, oy, kz, rootY), nHx = Hh[1], nHy = Hh[2], nHz = Hh[3], okH = L.hit = Hh[4] >= 0 ? 1 : 0;
      let gT = this._ray(world, tx, oy, tz, rootY), nTx = Hh[1], nTy = Hh[2], nTz = Hh[3];
      const okT = Hh[4] >= 0;
      if (!okH) { gH = gT; nHx = nTx; nHy = nTy; nHz = nTz; }
      if (!okT) { gT = gH; nTx = nHx; nTy = nHy; nTz = nHz; }
      if (!okH && !okT) { gH = gT = this._air ? rootY : rootY - p.reach; nHx = nHz = nTx = nTz = 0; nHy = nTy = 1; }
      L.gH = gH; L.gT = gT;
      // a slope (heel and toe on one plane) tilts the foot; an edge holds it level on the higher side
      let g, nx = 0, ny = 1, nz = 0;
      // (a slope: one plane under both, and the heel-to-toe rise is what that plane's grade predicts; two level treads
      // a step apart are an edge)
      const dzH = gT - gH, sdx = tx - kx, sdz = tz - kz, nay = (nHy + nTy) * 0.5 || 1;
      const slope = nHx * nTx + nHy * nTy + nHz * nTz > 0.97 && nHy > 0.5 && Math.abs(dzH + ((nHx + nTx) * 0.5 * sdx + (nHz + nTz) * 0.5 * sdz) / nay) < 0.03;
      // (steeper than the foot may tilt: raised so its uphill end stays on the slope)
      if (slope) { g = Math.max(gH, gT - L.len * maxT); nx = (nHx + nTx) * 0.5; ny = (nHy + nTy) * 0.5; nz = (nHz + nTz) * 0.5; }
      else g = Math.max(gH, gT);
      // straddling an edge down (a nosing, a kerb: heel above, toe below) while coming down to land: the landing is moved
      // forward, the whole foot onto the lower tread (up, the foot stands on the upper edge: forward would be a step higher)
      if (!slope && contact < 0.95 && vl > 0.3 && gH - gT > 0.05 && okH && okT) L.shiftT = Math.min(p.maxShift, L.shiftT + 0.04);
      // a swinging foot: also the ground ahead of its toe (it is carried over a step before it gets there)
      if (contact < 0.99 && vl > 0.3) {
        const la = p.look + p.lookSpeed * vl, ax = tx + hx * la, az = tz + hz * la;
        const gA = this._ray(world, ax, oy, az, rootY);
        if (Hh[4] >= 0 && gA > g + 0.03 && Hh[2] > 0.5) { const s = 1 - contact; g = g + (gA - g) * s; }
      }
      const off = Math.min(p.reach, Math.max(-p.reach, g - rootY));
      // planted: exact; swinging: eased
      L.offS += (off - L.offS) * kSwing;
      L.off = L.offS + (off - L.offS) * contact;
      if (contact > 0.99) L.offS = off;
      L.n.x += (nx - L.n.x) * kN; L.n.y += (ny - L.n.y) * kN; L.n.z += (nz - L.n.z) * kN;
      if (contact > 0.5) { L.n.x += (nx - L.n.x) * contact; L.n.y += (ny - L.n.y) * contact; L.n.z += (nz - L.n.z) * contact; }
      L.n.normalize();
      // 4. the pelvis: the lower planted foot's ground, and every foot within reach
      const cw = contact * (L.step >= 0 ? 0 : 1);
      if (cw > 0.05) { const o = L.off * cw * p.lowFollow; if (!any || o < target) target = o; any = true; }
      L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.end.getWorldPosition(_C);
      L.ox = _F.x - _C.x; L.oy = _F.y - _C.y; L.oz = _F.z - _C.z;
      L.reachLen = _A.distanceTo(_B) + _B.distanceTo(_C);
      // the foot's target (heel), the clip's height kept above the ground offset
      const ty = _F.y + L.off * w + stepLift;
      // (the reach allowed: the soft limit, or as far as the clip itself stretches the leg)
      const ext = L.ext = _A.distanceTo(_C) / L.reachLen;
      const ddx = fx - L.ox - _A.x, ddz = fz - L.oz - _A.z, h2 = ddx * ddx + ddz * ddz, rm = L.reachLen * Math.max(p.soft, Math.min(0.995, ext));
      // (the ankle sits L.sole above the heel's sole: the leg reaches the ankle, about where the bone is)
      if (h2 < rm * rm) { const needY = (_A.y - (ty - L.oy) - Math.sqrt(rm * rm - h2)) * (0.5 + 0.5 * contact); if (needY > need) need = needY; }
    }
    if (!any) target = 0;
    target = Math.min(p.maxRise, Math.max(-p.maxDrop, target * w));
    if (need > 0 && -need < target) target = Math.max(-p.maxDrop, -need * w);
    this.need = need; this.target = target;
    // the spring (exact for any dt), a landing kicks it down
    if (st.landing > 0) this.pelvisV -= Math.min(2.6, st.landing * p.absorb);
    {
      const om = p.pelvisOmega, e = this.pelvis - target, ex = Math.exp(-om * dt), tmp = (this.pelvisV + om * e) * dt;
      this.pelvisV = (this.pelvisV - om * tmp) * ex;
      this.pelvis = target + (e + tmp) * ex;
      if (this.pelvis < -p.maxDrop - 0.05) { this.pelvis = -p.maxDrop - 0.05; if (this.pelvisV < 0) this.pelvisV = 0; }
    }
    inner.position.y = this.pelvis / sc;
    inner.updateMatrixWorld(true);
    // 5. the feet and the legs
    const sinT = Math.sin(p.maxTilt * DEG);
    for (let i = 0; i < 2; i++) {
      const L = legs[i];
      L.foot.getWorldPosition(_F);
      const ty = _F.y - this.pelvis + L.off * w + L.stepLift;   // (the foot is under Root: the pelvis moved it, take that back)
      _T.set(_F.x + (L.fx - _F.x) * w, ty, _F.z + (L.fz - _F.z) * w);
      // the tilt to the ground (limited, weighted) and the lock's yaw
      _n.copy(L.n);
      const h = Math.sqrt(_n.x * _n.x + _n.z * _n.z);
      if (h > sinT) { _n.x *= sinT / h; _n.z *= sinT / h; }
      _n.y = Math.sqrt(Math.max(0, 1 - _n.x * _n.x - _n.z * _n.z));
      _n.lerpVectors(_up, _n, w).normalize();
      _q.setFromUnitVectors(_up, _n);
      _qy.setFromAxisAngle(_up, L.dyaw * w);
      L.foot.getWorldQuaternion(_qw);
      _qw.premultiply(_qy).premultiply(_q);
      L.foot.parent.getWorldQuaternion(_qp);
      L.foot.quaternion.copy(_qp.invert().multiply(_qw));
      // the leg to the target (soft reach), then the foot onto the shin's end (as the clip has it)
      _T.x -= L.ox; _T.y -= L.oy; _T.z -= L.oz;
      this._twoBone(L, _T);
      L.end.getWorldPosition(_C);
      _v1.set(_C.x + L.ox, _C.y + L.oy, _C.z + L.oz);
      L.foot.parent.worldToLocal(_v1);
      L.foot.position.copy(_v1);
      L.foot.updateMatrixWorld(true);
    }
  }

  /** Ground height under (x, z) looking down from y0 (rootY - reach when nothing). Normal in world.hit[1..3]. */
  _ray(world, x, y0, z, rootY) {
    const R = world.r, H = world.hit, p = this.p;
    if (this._air) { H[4] = -1; return rootY; }             // (in the air: no ground under the feet)
    R[0] = x; R[1] = y0; R[2] = z; R[3] = 0; R[4] = -1; R[5] = 0;
    H[0] = p.raise + p.reach + 0.1; H[4] = -1;
    world.raycast();
    this.stats.rays++;
    if (H[4] < 0) return rootY - p.reach;                  // (nothing within reach: as low as it goes, not level)
    if (H[2] < 0.5 && false) return rootY;
    if (H[2] < 0.5) { H[1] = 0; H[2] = 1; H[3] = 0; }      // a wall's face: no tilt
    return y0 - H[0];
  }

  _rootYaw() {
    const e = this.inner.matrixWorld.elements;      // the yaw of the holder's +z in the world
    return Math.atan2(e[8], e[10]);
  }

  _twoBone(L, T) {
    L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.end.getWorldPosition(_C);
    const l1 = _A.distanceTo(_B), l2 = _B.distanceTo(_C);
    _dir.subVectors(T, _A);
    let d = _dir.length();
    if (d < 1e-6 || l1 < 1e-6 || l2 < 1e-6) return;
    _dir.multiplyScalar(1 / d);
    // soft reach: past soft * (l1 + l2) the distance eases toward full length (the knee never snaps straight)
    const Lm = l1 + l2, ds = Lm * Math.max(this.p.soft, Math.min(0.995, L.ext));
    if (d > ds) d = ds + (Lm - ds) * (1 - Math.exp(-(d - ds) / (Lm - ds)));
    d = Math.min(Lm - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
    // the bend plane: the animated knee's offset from the hip -> ankle line (the pole)
    _perp.subVectors(_B, _A);
    _perp.addScaledVector(_dir, -_perp.dot(_dir));
    if (_perp.lengthSq() < 1e-8) { this.inner.getWorldDirection(_perp); _perp.addScaledVector(_dir, -_perp.dot(_dir)); }
    _perp.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _Bn.copy(_A).addScaledVector(_dir, a).addScaledVector(_perp, h);
    this._rotate(L.upper, _v1.subVectors(_B, _A), _v2.subVectors(_Bn, _A));
    L.upper.updateMatrixWorld(true);
    L.end.getWorldPosition(_C);
    _T.copy(_A).addScaledVector(_dir, d);
    this._rotate(L.lower, _v1.subVectors(_C, _Bn), _v2.subVectors(_T, _Bn));
    L.lower.updateMatrixWorld(true);
  }

  /** Turn bone so its world-space vector `from` points along `to`. */
  _rotate(bone, from, to) {
    if (from.lengthSq() < 1e-12 || to.lengthSq() < 1e-12) return;
    _q.setFromUnitVectors(from.normalize(), to.normalize());
    bone.getWorldQuaternion(_qw);
    _qw.premultiply(_q);
    bone.parent.getWorldQuaternion(_qp);
    bone.quaternion.copy(_qp.invert().multiply(_qw));
  }
}
