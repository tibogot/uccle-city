// LIGHT LEG IK for an FK leg rig (Mixamo: UpLeg -> Leg -> Foot -> ToeBase), after the animation (locomotion.js).
// The CLIP does the work (stairs clips, warped to the real riser / tread); this only corrects what is left, and never
// fights the clip's own timing:
//
//   plant      from the CLIP's foot contacts (ybot.json, blended over the playing clips), with hysteresis: planted
//              above 0.6, swinging below 0.3. Not from the ground: a foot rolling over a tread edge stays planted.
//   ground     PLANTED: the height under the sole is read once, at the touch-down (3 rays: heel, middle, ball; the
//              highest that is a floor), and HELD while the foot is down: no per-frame ray that hops between a tread
//              and the one below it (that was the old shaking). SWINGING: eased (60-80 ms) toward the ground at the
//              foot's PREDICTED LANDING POINT (where the clip puts the next touch-down, warped, ahead of the body by
//              the time left: look-ahead on stairs), with a clearance floor (the sole stays 1 cm over the ground under
//              it now: a toe never goes through a riser).
//   pelvis     a critically damped spring to the lower foot's offset (so a leg can reach down a step), never above
//              +maxRise; and low enough that each leg reaches its foot (the clip's own extension allowed).
//   lock       a planted foot holds its world position and heading (the ball at the touch-down; capped, it fades out
//              through the swing): no skating from a speed / stride mismatch, start and stop, turns.
//   legs       two-bone, the knee in the plane of the clip's knee (a little forward bias where the clip's leg is
//              straight: no flip, never bending backwards), soft reach; the foot keeps the clip's rotation (tilted on
//              a slope while planted, level on an edge), the toes their local pose.
// All lengths are measured from the rig (leg length, ankle / ball heights): no tuning per clip. No allocations per frame.
import * as THREE from "three/webgpu";

export const LEG_IK = {
  swingTau: 0.07,       // s: a swinging foot's offset easing to its landing ground
  landTau: 0.05,        // s: the predicted landing ground's filter (the prediction moves as the body does)
  plantIn: 0.6, plantOut: 0.3,    // contact hysteresis
  clearance: 0.012,     // m: a swinging sole over the ground under it
  maxOff: 0.45,         // m: the most a foot is moved up / down from the clip
  offRate: 1.5,         // m/s: the fastest the correction may move a foot (anti-pop)
  maxDrop: 0.3, maxRise: 0.18,     // m: the pelvis (it rises only when BOTH feet stand higher than the clip has them)
  pelvisOmega: 14,      // 1/s: the pelvis spring
  maxLock: 0.16,        // m: a planted foot dragged further than this slides with the body
  maxTwist: 0.45,       // rad: a planted foot's heading held against the body's turn
  lockTau: 0.09,        // s: the lock's correction fading out through a swing
  maxTilt: 22,          // degrees: a planted foot on a slope
  soft: 0.97,           // the soft reach starts at this fraction of the leg's length
  absorb: 0.3,          // landing: the pelvis spring kicked down by this x the fall speed (m/s), capped 2.4
};

const DEG = Math.PI / 180;
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3(), _D = new THREE.Vector3(), _T = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _dir = new THREE.Vector3(), _perp = new THREE.Vector3(), _Bn = new THREE.Vector3(), _n = new THREE.Vector3(), _fw = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _qf = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

export class LegIK {
  /** model: the glTF scene; inner: the group the pelvis offset moves; rig: { left, right: { upper, lower, foot, toe } } bone names. */
  constructor(model, inner, rig) {
    this.inner = inner; this.model = model;
    this.legs = [rig.left, rig.right].map((n) => {
      const g = (k) => model.getObjectByName(n[k]);
      return {
        upper: g("upper"), lower: g("lower"), foot: g("foot"), toe: g("toe"), end: g("foot"),     // (end: the ankle, for the foot probe)
        planted: false, off: 0, offPrev: 0, gPlant: 0, gLand: 0, landOk: false, lx: 0, lz: 0, lyaw: 0, lockX: 0, lockZ: 0, lockYaw: 0,
        nx: 0, ny: 1, nz: 0, tw: 0, len: 0.8, ankleH: 0.1, ballH: 0.03, heelBack: 0.06, contact: 0, clipKnee: 180, ext: 0.9,
        cx: 0, cy: 0, cz: 0,          // the clip's ankle (warped), world: for the lab's traces
      };
    });
    this.ok = this.legs.every((L) => L.upper && L.lower && L.foot && L.toe);
    this.p = { ...LEG_IK };
    this.pelvis = 0; this.pelvisV = 0; this.weight = 0;
    this.stats = { rays: 0 };
    if (this.ok) this._measure();
  }

  /** Leg lengths and the ankle / ball heights over the sole, in the current (standing) pose. */
  _measure() {
    // (the parents' world matrices too: in the city the slot already stands 70 m up when the model is set, and a stale
    // parent matrix put the box's floor at 0 while the bones were at 70: every leg "lifted" 30 cm)
    this.model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(this.model);
    const floor = box.min.y;
    for (const L of this.legs) {
      L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.foot.getWorldPosition(_C); L.toe.getWorldPosition(_D);
      L.len = _A.distanceTo(_B) + _B.distanceTo(_C);
      L.l1 = _A.distanceTo(_B); L.l2 = _B.distanceTo(_C);
      L.ankleH = Math.max(0.02, _C.y - floor); L.ballH = Math.max(0.005, _D.y - floor);
      L.heelBack = 0.4 * Math.hypot(_D.x - _C.x, _D.z - _C.z);       // the heel this far behind the ankle (of the ankle-ball length)
    }
    this._soles();
  }

  /**
   * The real heel and toe tip of each sole, from the skinned mesh (the rearmost / frontmost vertices near the floor,
   * skinned to the foot / the toe bone), as distances behind the ankle / ahead of the ball along the foot.
   */
  _soles() {
    let mesh = null;
    this.model.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
    if (!mesh) return;
    const sk = mesh.skeleton, P = mesh.geometry.attributes.position, SI = mesh.geometry.attributes.skinIndex, SW = mesh.geometry.attributes.skinWeight;
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const L of this.legs) {
      const fi = sk.bones.indexOf(L.foot), ti = sk.bones.indexOf(L.toe);
      L.foot.getWorldPosition(_C); L.toe.getWorldPosition(_D);
      const hx = _D.x - _C.x, hz = _D.z - _C.z, hl = Math.hypot(hx, hz) || 1;
      let minY = Infinity; const pts = [];
      for (let i = 0; i < P.count; i++) {
        let b = -1;
        for (let k = 0; k < 4; k++) { const j = SI.getComponent(i, k); if ((j === fi || j === ti) && SW.getComponent(i, k) > 0.5) b = j; }
        if (b < 0) continue;
        m.multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b]);
        v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(m);
        pts.push(v.x, v.y, v.z); if (v.y < minY) minY = v.y;
      }
      let back = 0, front = 0;
      for (let i = 0; i < pts.length; i += 3) {
        if (pts[i + 1] > minY + 0.02) continue;
        const a = ((pts[i] - _C.x) * hx + (pts[i + 2] - _C.z) * hz) / hl;          // along the foot, from the ankle
        if (-a > back) back = -a;
        if (a - hl > front) front = a - hl;
      }
      if (back > 0.01) L.heelBack = back;
      L.toeFront = front;
      L.ankleBall = hl;
      L.soleLen = L.heelBack + hl + front;                         // heel to toe tip
      L.soleMid = -L.heelBack + L.soleLen / 2;                      // the sole's middle, ahead of the ankle
    }
  }

  reset() {
    this.pelvis = 0; this.pelvisV = 0;
    for (const L of this.legs) { L.planted = false; L.off = 0; L.offPrev = 0; L.lx = L.lz = L.lyaw = 0; L.landOk = false; }
  }

  /**
   * After the mixer. rootY: the feet plane the clip stands on (world). ctx: { weight (0 air .. 1 ground), contact: [l, r]
   * (clip, 0..1), land: [{ ok, x, z }, ...] (predicted landing points), warp: { k, sT, sR, fx, fz }, landing (fall
   * speed this frame, else 0), lock (0..1) }.
   */
  update(dt, world, rootY, ctx) {
    if (!this.ok || dt <= 0) return;
    const p = this.p, inner = this.inner, legs = this.legs;
    this.weight += ((ctx.weight ?? 1) - this.weight) * (1 - Math.exp(-dt * ((ctx.weight ?? 1) > this.weight ? 16 : 10)));
    const w = this.weight;
    inner.position.y = 0;
    inner.updateMatrixWorld(true);
    if (w < 1e-3 && Math.abs(this.pelvis) < 1e-4 && Math.abs(this.pelvisV) < 1e-3) {
      this.pelvis = 0; this.pelvisV = 0;
      for (const L of legs) { L.planted = false; L.lx = L.lz = L.lyaw = 0; L.off = 0; }
      return;
    }
    const sc = inner.parent.matrixWorld.elements[5] || 1;
    const ie = inner.matrixWorld.elements, rx = ie[12], rz = ie[14];
    const wp = ctx.warp, wk = wp ? wp.k : 0;
    const kSwing = 1 - Math.exp(-dt / p.swingTau), kLand = 1 - Math.exp(-dt / p.landTau), kLock = 1 - Math.exp(-dt / p.lockTau);
    let pelT = Infinity, need = -Infinity;
    for (let i = 0; i < 2; i++) {
      const L = legs[i];
      L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.foot.getWorldPosition(_C); L.toe.getWorldPosition(_D);
      L.foot.getWorldQuaternion(_qf);
      L.clipKnee = _v1.subVectors(_A, _B).angleTo(_v2.subVectors(_C, _B)) / DEG;
      L.ext = _A.distanceTo(_C) / L.len;
      // 1. the stairs warp: the foot (rigidly: ankle and ball together) moved in the body's frame, forward by sT and
      // vertically by sR (the clip's riser / tread -> the real one)
      if (wk > 1e-3) {
        const ox = _C.x - rx, oy = _C.y - rootY, oz = _C.z - rz, f = ox * wp.fx + oz * wp.fz;
        const df = f * (wp.sT - 1) * wk, dy = oy * (wp.sR - 1) * wk;
        _C.x += wp.fx * df; _C.z += wp.fz * df; _C.y += dy;
        _D.x += wp.fx * df; _D.z += wp.fz * df; _D.y += dy;
      }
      // slope warping (UE5's): every foot, planted or swinging, raised by the grade x its distance ahead of the body,
      // so the clip's own foot pattern lies on the slope and the IK only corrects what is left
      if (wp && wp.slope) {
        const dyS = wp.slope * ((_C.x - rx) * wp.sdx + (_C.z - rz) * wp.sdz);
        _C.y += dyS; _D.y += dyS;
      }
      L.cx = _C.x; L.cy = _C.y; L.cz = _C.z;
      // the foot's heading (ankle -> ball) and its sole's lowest point in the clip, above the clip's floor
      let hx = _D.x - _C.x, hz = _D.z - _C.z; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      const soleClip = Math.min(_C.y - L.ankleH, _D.y - L.ballH);
      const yawFoot = Math.atan2(hx, hz);
      // 2. planted / swinging (the clip's contact, hysteresis)
      // (in the air nothing is planted: the feet latch the ground again when the body lands; a latch far from the
      // feet plane (a teleport, a spawn, a platform) is read again too)
      const c = (ctx.weight ?? 1) < 0.5 ? 0 : ctx.contact ? ctx.contact[i] : 1;
      L.contact = c;
      if (L.planted && Math.abs(L.gPlant - rootY) > 0.5) L.planted = false;
      if (!L.planted && c > p.plantIn) {
        L.planted = true;
        L.lockX = _D.x + L.lx; L.lockZ = _D.z + L.lz; L.lockYaw = yawFoot + L.lyaw;
        // a foot about to stand ACROSS an edge (part of the sole inside a higher step: a heel behind a nosing going down,
        // a toe tip in a riser going up): slid along its heading the shorter way (<= 14 cm) until it isn't, through the
        // lock point. Valid: the ball level with the heel or with the toe tip, the other end level or over a drop (a
        // heel or toes overhanging a nosing is how people stand on stairs; inside a step is not)
        const hb = L.heelBack + 0.01, tf = (L.toeFront || 0.05) + 0.01, abx = _D.x - _C.x, abz = _D.z - _C.z;
        const valid = (d) => {
          const bx = L.lockX + hx * d, bz = L.lockZ + hz * d;
          const a = this._ray(world, bx - abx - hx * hb, bz - abz - hz * hb, rootY), b = this._ray(world, bx, bz, rootY), c = this._ray(world, bx + hx * tf, bz + hz * tf, rootY);
          return (Math.abs(a - b) < 0.01 && c < b + 0.01) || (Math.abs(c - b) < 0.01 && a < b + 0.01);
        };
        if (!valid(0)) {
          let best = 0;
          for (let k = 1; k <= 7 && !best; k++) for (const sgn of [1, -1]) { const d = sgn * 0.02 * k; if (valid(d)) { best = d; break; } }
          if (best) { L.lockX += hx * best; L.lockZ += hz * best; this.stats.shifts = (this.stats.shifts || 0) + 1; }
        }
        L.gPlant = this._sole(world, L.lockX - (_D.x - _C.x) - hx * L.heelBack, L.lockZ - (_D.z - _C.z) - hz * L.heelBack, L.lockX, L.lockZ, rootY, L);
        L.gAnkle = this._ray(world, L.lockX - (_D.x - _C.x), L.lockZ - (_D.z - _C.z), rootY);
      } else if (L.planted && c < p.plantOut) L.planted = false;
      // 3. the ground target
      let offT;
      // (the correction is measured against the CLIP's own sole, not its floor: a stair clip's planted foot moves
      // down past the rising body, a flat clip's rolls from heel to ball; both stay where the clip has them)
      if (L.planted) {
        offT = L.gPlant - soleClip;
        // on a slope (the foot tilted to it about the ankle): the ankle over the ground UNDER IT, ankleH along the normal
        if (L.ny < 0.999) offT = L.gAnkle + L.ankleH / Math.max(0.5, L.ny) - L.ankleH - soleClip;
        L.off += (offT - L.off) * (1 - Math.exp(-dt / 0.03));
      } else {
        const ld = ctx.land && ctx.land[i];
        let gl;
        if (ld && ld.ok) gl = this._sole(world, ld.x - hx * L.heelBack, ld.z - hz * L.heelBack, ld.x + hx * L.heelBack, ld.z + hz * L.heelBack, rootY, null);
        else gl = this._sole(world, _C.x - hx * L.heelBack, _C.z - hz * L.heelBack, _D.x, _D.z, rootY, null);
        if (!L.landOk) L.gLand = gl; else L.gLand += (gl - L.gLand) * kLand;
        L.landOk = true;
        // (landing: the clip's sole at its touch-down, above the root line: ld.h, warped)
        offT = L.gLand - rootY - (ld && ld.ok ? ld.h + (wp && wp.slope ? wp.slope * (ld.fwd || 0) : 0) : 0);
        L.off += (offT - L.off) * kSwing;
        // clearance over the ground under the foot now (heel, ball): the sole never goes into a riser / kerb
        const gN = this._sole(world, _C.x - hx * L.heelBack, _C.z - hz * L.heelBack, _D.x, _D.z, rootY, null);
        const floor = gN + p.clearance - soleClip;
        L.dbgFloor = floor; L.dbgSole = soleClip - rootY; L.dbgOffT = offT;
        if (L.off < floor) L.off = floor;
      }
      if (L.off > p.maxOff) L.off = p.maxOff; else if (L.off < -p.maxOff) L.off = -p.maxOff;
      // (no correction moves a foot faster than offRate: a latch or a clearance floor never pops the foot in one frame)
      const dmax = p.offRate * dt;
      if (L.off > L.offPrev + dmax) L.off = L.offPrev + dmax; else if (L.off < L.offPrev - dmax) L.off = L.offPrev - dmax;
      L.offPrev = L.off;
      // 4. the lock (planted: hold the touch-down's ball and heading; swinging: fade out)
      const lockOn = (ctx.lock ?? 1) * w;
      if (L.planted && lockOn > 0) {
        let ex = L.lockX - _D.x, ez = L.lockZ - _D.z;
        const el = Math.hypot(ex, ez);
        if (el > p.maxLock) {             // dragged too far: the lock point follows (the foot slides, as a real one would)
          const k = (el - p.maxLock) / el; L.lockX -= ex * k; L.lockZ -= ez * k; ex *= 1 - k; ez *= 1 - k;
        }
        L.lx = ex * lockOn; L.lz = ez * lockOn;
        let ey = L.lockYaw - yawFoot; ey = Math.atan2(Math.sin(ey), Math.cos(ey));
        if (ey > p.maxTwist) { L.lockYaw -= ey - p.maxTwist; ey = p.maxTwist; } else if (ey < -p.maxTwist) { L.lockYaw -= ey + p.maxTwist; ey = -p.maxTwist; }
        L.lyaw = ey * lockOn;
      } else { L.lx -= L.lx * kLock; L.lz -= L.lz * kLock; L.lyaw -= L.lyaw * kLock; }
      // 5. the pelvis: the lower foot's offset (and reach)
      if (L.off < pelT) pelT = L.off;
      const tx = _C.x + L.lx, ty = _C.y + L.off * w, tz = _C.z + L.lz;
      const dx = tx - _A.x, dz = tz - _A.z, h2 = dx * dx + dz * dz, rm = L.len * Math.max(p.soft, Math.min(0.995, L.ext));
      if (h2 < rm * rm) { const ny = _A.y - ty - Math.sqrt(rm * rm - h2); if (ny > need) need = ny; } else need = Math.max(need, p.maxDrop);
      L._tx = tx; L._ty = ty; L._tz = tz; L._yaw = yawFoot;
    }
    let target = Math.min(p.maxRise, Math.max(-p.maxDrop, pelT)) * w;
    if (need > 0 && -need * w < target) target = Math.max(-p.maxDrop, -need * w);
    if (ctx.landing > 0) this.pelvisV -= Math.min(2.4, ctx.landing * p.absorb);
    {
      const om = p.pelvisOmega, e = this.pelvis - target, ex = Math.exp(-om * dt), tmp = (this.pelvisV + om * e) * dt;
      this.pelvisV = (this.pelvisV - om * tmp) * ex;
      this.pelvis = target + (e + tmp) * ex;
      if (this.pelvis < -p.maxDrop - 0.05) { this.pelvis = -p.maxDrop - 0.05; if (this.pelvisV < 0) this.pelvisV = 0; }
    }
    inner.position.y = this.pelvis / sc;
    inner.updateMatrixWorld(true);
    // 6. the legs
    const sinT = Math.sin(p.maxTilt * DEG);
    for (let i = 0; i < 2; i++) {
      const L = legs[i];
      L.foot.getWorldPosition(_C);           // (the clip's ankle, pelvis moved: the target is in the world, the hip moved)
      L.foot.getWorldQuaternion(_qf);
      _T.set(L._tx, L._ty, L._tz);
      // (the IK weight: toward the clip's own ankle, pelvis included, as w goes to 0)
      _T.x = _C.x + (_T.x - _C.x) * w; _T.y = _C.y - this.pelvis + (_T.y - _C.y + this.pelvis) * w; _T.z = _C.z + (_T.z - _C.z) * w;
      this._twoBone(L, _T);
      // the foot: the clip's world rotation, its heading held by the lock, tilted to a slope while planted
      _n.set(L.nx, L.ny, L.nz);
      const hh = Math.sqrt(_n.x * _n.x + _n.z * _n.z);
      if (hh > sinT) { _n.x *= sinT / hh; _n.z *= sinT / hh; }
      _n.y = Math.sqrt(Math.max(0, 1 - _n.x * _n.x - _n.z * _n.z));
      L.tw += ((L.planted ? 1 : 0) - L.tw) * (1 - Math.exp(-dt / 0.08));
      _n.lerpVectors(_up, _n, w * L.tw).normalize();
      _q.setFromUnitVectors(_up, _n);
      _qy.setFromAxisAngle(_up, L.lyaw * w);
      _qw.copy(_qf).premultiply(_qy).premultiply(_q);
      L.foot.parent.getWorldQuaternion(_qp);
      L.foot.quaternion.copy(_qp.invert().multiply(_qw));
      L.foot.updateMatrixWorld(true);
    }
  }

  /**
   * The floor under a foot: rays at the heel and the ball (and between): the highest hit that is a floor (normal y >
   * 0.6). leg: when given, the slope normal is stored on it (heel and ball on one plane: tilt; else level: an edge).
   */
  _sole(world, x0, z0, x1, z1, rootY, leg) {
    const a = this._ray(world, x0, z0, rootY), na = world.hit[2] > 0.6 ? 1 : 0, ax = world.hit[1], ay = world.hit[2], az = world.hit[3];
    const b = this._ray(world, x1, z1, rootY), bx = world.hit[1], by = world.hit[2], bz = world.hit[3];
    const m = this._ray(world, (x0 + x1) * 0.5, (z0 + z1) * 0.5, rootY);
    // (the median: where most of the sole is, the weight-bearing height; a heel hanging over a nosing, or a toe over
    // a riser's edge, is outvoted, so a foot is never latched onto the wrong tread)
    const g = Math.max(Math.min(a, b), Math.min(Math.max(a, b), m));
    if (leg) {
      const same = ax * bx + ay * by + az * bz > 0.985 && ay > 0.7 && na;
      // (one plane: the heel-to-ball rise must match that plane's grade; two treads a step apart are an edge)
      const grade = -(((ax + bx) * 0.5) * (x1 - x0) + ((az + bz) * 0.5) * (z1 - z0)) / (((ay + by) * 0.5) || 1);
      if (same && Math.abs((b - a) - grade) < 0.02) { leg.nx = (ax + bx) * 0.5; leg.ny = (ay + by) * 0.5; leg.nz = (az + bz) * 0.5; }
      else { leg.nx = 0; leg.ny = 1; leg.nz = 0; }
    }
    return g;
  }

  /** Ground height under (x, z), from 0.6 m above the feet plane down to 0.6 m below it (rootY when nothing). */
  _ray(world, x, z, rootY) {
    const R = world.r, H = world.hit;
    R[0] = x; R[1] = rootY + 0.6; R[2] = z; R[3] = 0; R[4] = -1; R[5] = 0; H[0] = 1.2; H[4] = -1;
    world.raycast();
    this.stats.rays++;
    if (H[4] < 0) { H[1] = 0; H[2] = 1; H[3] = 0; return rootY - 0.6; }
    if (H[2] < 0.5) { H[1] = 0; H[2] = 1; H[3] = 0; }         // a wall's face: no tilt
    return rootY + 0.6 - H[0];
  }

  _twoBone(L, T) {
    L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.foot.getWorldPosition(_C);
    const l1 = _A.distanceTo(_B), l2 = _B.distanceTo(_C);
    _dir.subVectors(T, _A);
    let d = _dir.length();
    if (d < 1e-6 || l1 < 1e-6 || l2 < 1e-6) return;
    _dir.multiplyScalar(1 / d);
    const Lm = l1 + l2, ds = Lm * Math.max(this.p.soft, Math.min(0.995, L.ext));
    if (d > ds) d = ds + (Lm - ds) * (1 - Math.exp(-(d - ds) / (Lm - ds)));
    d = Math.min(Lm - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
    // the bend plane: the clip's knee offset from the hip -> ankle line, plus a small forward bias (a straight clip leg
    // has no defined plane: the knee would flip; forward = the foot's heading)
    _perp.subVectors(_B, _A);
    _perp.addScaledVector(_dir, -_perp.dot(_dir));
    _fw.set(Math.sin(L._yaw), 0, Math.cos(L._yaw)).addScaledVector(_dir, -_fw.dot(_dir));
    _perp.addScaledVector(_fw, 0.02);
    if (_perp.lengthSq() < 1e-10) _perp.copy(_fw);
    _perp.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _Bn.copy(_A).addScaledVector(_dir, a).addScaledVector(_perp, h);
    this._rotate(L.upper, _v1.subVectors(_B, _A), _v2.subVectors(_Bn, _A));
    L.upper.updateMatrixWorld(true);
    L.foot.getWorldPosition(_C);
    _T.copy(_A).addScaledVector(_dir, d);
    this._rotate(L.lower, _v1.subVectors(_C, _Bn), _v2.subVectors(_T, _Bn));
    L.lower.updateMatrixWorld(true);
  }

  _rotate(bone, from, to) {
    if (from.lengthSq() < 1e-12 || to.lengthSq() < 1e-12) return;
    _q.setFromUnitVectors(from.normalize(), to.normalize());
    bone.getWorldQuaternion(_qw);
    _qw.premultiply(_q);
    bone.parent.getWorldQuaternion(_qp);
    bone.quaternion.copy(_qp.invert().multiply(_qw));
  }
}
