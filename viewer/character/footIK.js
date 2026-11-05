// FOOT IK for the third-person character: the feet follow stairs, kerbs and slopes.
//
// Per frame, after the animation mixer (body.js), with weight w (1 walking on the ground, softer at a run, 0 in the
// air; eased so it never snaps):
//   1. per foot: a ray down through the animated foot from above the hip line (CollisionWorld: stairs, kerbs, terrain)
//      -> how far the ground there is above / below the character's feet plane, and its normal (both smoothed)
//   2. the pelvis drops to the LOWER foot's ground (so that leg can still reach it), eased
//   3. each foot moves up / down by its ground offset (its animated lift is kept: the swing still clears the step)
//   4. two-bone IK bends thigh + shin to the foot: the knee stays in the plane of the animated knee (the pole)
//   5. the foot turns to the ground's normal (at most maxTilt)
// The rig (Quaternius modular men): feet are IK-style bones under Root, so they can be placed freely and the leg
// chain UpperLeg -> LowerLeg -> LowerLeg_end (ankle) is solved to reach them. No allocations per frame.
import * as THREE from "three/webgpu";

export const FOOT_IK = { maxDrop: 0.16, reach: 0.42, raise: 0.75, smooth: 16, normalSmooth: 12, pelvisSmooth: 12, maxTilt: 28, weightRate: 7 };

const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3(), _T = new THREE.Vector3(), _F = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _dir = new THREE.Vector3(), _perp = new THREE.Vector3(), _Bn = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _fwd = new THREE.Vector3();

export class FootIK {
  constructor(model, inner, rig) {
    this.inner = inner;
    this.legs = [rig.left, rig.right].map((n) => ({
      upper: model.getObjectByName(n.upper), lower: model.getObjectByName(n.lower), end: model.getObjectByName(n.end), foot: model.getObjectByName(n.foot),
      off: 0, n: new THREE.Vector3(0, 1, 0), hit: 0, rest: Infinity,    // rest: the ankle's height above the sole, planted
    }));
    this.ok = this.legs.every((l) => l.upper && l.lower && l.end && l.foot);
    this.p = { ...FOOT_IK };
    this.weight = 0; this.pelvis = 0;
    this.stats = { rays: 0 };
  }

  /** rootY: the character's feet plane (world y); want: target weight 0..1. */
  update(dt, world, rootY, want, enabled = true) {
    if (!this.ok) return;
    const p = this.p, legs = this.legs, inner = this.inner;
    this.weight += ((enabled ? want : 0) - this.weight) * (1 - Math.exp(-p.weightRate * dt));
    const w = this.weight;
    if (w < 1e-3 && Math.abs(this.pelvis) < 1e-4) { if (inner.position.y !== 0) { inner.position.y = 0; inner.updateMatrixWorld(true); } this.pelvis = 0; return; }
    // the pelvis drop from the last frame's grounds (the scale of the holder: inner is in its units)
    const sc = inner.parent.matrixWorld.elements[5] || 1;
    inner.position.y = this.pelvis / sc;
    inner.updateMatrixWorld(true);
    const kOff = 1 - Math.exp(-p.smooth * dt), kN = 1 - Math.exp(-p.normalSmooth * dt);
    const R = world.r, H = world.hit;
    let low = 0;
    for (let i = 0; i < 2; i++) {
      const L = legs[i];
      L.foot.getWorldPosition(_F);
      R[0] = _F.x; R[1] = rootY + p.raise; R[2] = _F.z; R[3] = 0; R[4] = -1; R[5] = 0;
      H[0] = p.raise + p.reach; H[4] = -1;
      world.raycast();
      this.stats.rays++;
      let o = 0, nx = 0, ny = 1, nz = 0;
      if (H[4] >= 0) {
        o = Math.min(p.reach, Math.max(-p.reach, p.raise - H[0]));
        nx = H[1]; ny = H[2]; nz = H[3];
        if (ny < 0.5) { nx = 0; ny = 1; nz = 0; }            // a wall face: no tilt
      }
      L.hit = H[4] >= 0 ? 1 : 0;
      L.off += (o - L.off) * kOff;
      L.n.x += (nx - L.n.x) * kN; L.n.y += (ny - L.n.y) * kN; L.n.z += (nz - L.n.z) * kN; L.n.normalize();
      // only a planted foot pulls the pelvis down (a foot in its swing is lifted anyway): plant 1 at the animated
      // sole height, 0 from 12 cm up
      const raw = _F.y - (rootY + this.pelvis);
      if (want > 0.5 && raw < L.rest) L.rest = raw;                 // the lowest the ankle gets = planted
      const lift = raw - (L.rest < Infinity ? L.rest : 0.08);
      const plant = 1 - Math.min(1, Math.max(0, (lift - 0.02) / 0.10));
      if (L.off * plant < low) low = L.off * plant;
    }
    low = Math.max(low, -p.maxDrop);
    this.pelvis += (low * w - this.pelvis) * (1 - Math.exp(-p.pelvisSmooth * dt));
    inner.getWorldDirection(_fwd);                             // the knees' fallback bend direction
    const maxTilt = Math.sin(p.maxTilt * Math.PI / 180);
    for (let i = 0; i < 2; i++) {
      const L = legs[i];
      // 3. the foot: its animated height above the (dropped) feet plane, plus the ground offset
      L.foot.getWorldPosition(_F);
      const lift = _F.y - (rootY + this.pelvis);
      _T.set(_F.x, rootY + lift + L.off * w, _F.z);
      _v1.copy(_T);
      L.foot.parent.worldToLocal(_v1);
      L.foot.position.copy(_v1);
      // 5. the foot's tilt to the ground normal (limited, weighted)
      _v2.copy(L.n);
      const h = Math.sqrt(_v2.x * _v2.x + _v2.z * _v2.z);
      if (h > maxTilt) { _v2.x *= maxTilt / h; _v2.z *= maxTilt / h; }
      _v2.y = Math.sqrt(Math.max(0, 1 - _v2.x * _v2.x - _v2.z * _v2.z));
      _v2.lerpVectors(_up, _v2, w).normalize();
      _q.setFromUnitVectors(_up, _v2);
      L.foot.updateWorldMatrix(true, false);
      L.foot.getWorldQuaternion(_qw);
      _qw.premultiply(_q);
      L.foot.parent.getWorldQuaternion(_qp);
      L.foot.quaternion.copy(_qp.invert().multiply(_qw));
      L.foot.updateMatrixWorld(true);
      // 4. the leg to the ankle
      this._twoBone(L, _T);
    }
  }

  _twoBone(L, T) {
    L.upper.getWorldPosition(_A); L.lower.getWorldPosition(_B); L.end.getWorldPosition(_C);
    const l1 = _A.distanceTo(_B), l2 = _B.distanceTo(_C);
    _dir.subVectors(T, _A);
    let d = _dir.length();
    if (d < 1e-6 || l1 < 1e-6 || l2 < 1e-6) return;
    _dir.multiplyScalar(1 / d);
    d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
    // the bend plane: the animated knee's offset from the hip -> ankle line (the pole)
    _perp.subVectors(_B, _A);
    _perp.addScaledVector(_dir, -_perp.dot(_dir));
    if (_perp.lengthSq() < 1e-8) { _perp.copy(_fwd); _perp.addScaledVector(_dir, -_perp.dot(_dir)); }
    _perp.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _Bn.copy(_A).addScaledVector(_dir, a).addScaledVector(_perp, h);
    // thigh: (B - A) -> (Bn - A)
    this._rotate(L.upper, _v1.subVectors(_B, _A), _v2.subVectors(_Bn, _A));
    L.upper.updateMatrixWorld(true);
    // shin: (C' - Bn) -> (target - Bn)
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
