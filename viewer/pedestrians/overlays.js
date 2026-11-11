// The clip families' arm / torso overlays for the LIVE band (round 3): the same scripted overrides the baker applies
// before baking (tools/peds/bakeGait.mjs POST: keep the two in step), run on Mr.doob's live rig after its solve, so
// a pram pusher, an umbrella or a cane, a phone call, a stoop and a held hand look the same at 10 m as at 40 m.
// Uses his rig's own methods (jointFrom, limb, writeBone); world space; the person's scale is in the rig.
import * as THREE from "three/webgpu";

const B = { PELVIS: 0, CHEST: 1, HEAD: 2, UA: [3, 5], FA: [4, 6] };
const SIDE = [1, -1];
const AXX = new THREE.Vector3(1, 0, 0), AXY = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _v3 = new THREE.Vector3();
const _c = new THREE.Vector3(), _sh = new THREE.Vector3(), _t = new THREE.Vector3(), _pole = new THREE.Vector3(), _f = new THREE.Vector3(), _p = new THREE.Vector3(), _qc = new THREE.Quaternion();

function boneQ(rig, b, out) { const o = b * 8, p = rig.pose; return out.set(p[o], p[o + 1], p[o + 2], p[o + 3]); }
function jointPos(rig, b, out) { const o = b * 8, p = rig.pose, s = p[o + 7]; return out.copy(rig.bind[b]).multiplyScalar(s).applyQuaternion(boneQ(rig, b, _q2)).add(_v3.set(p[o + 4], p[o + 5], p[o + 6])); }
function rotateAbout(rig, bones, dq, pivot) {
  for (const b of bones) {
    const q = boneQ(rig, b, _q).clone(), p = jointPos(rig, b, _p).clone();
    p.sub(pivot).applyQuaternion(dq).add(pivot);
    rig.writeBone(b, q.premultiply(dq), p);
  }
}
function armTo(rig, i, local, poleLocal) {
  const side = SIDE[i], s = rig.s;
  boneQ(rig, B.CHEST, _qc); jointPos(rig, B.CHEST, _c);
  rig.jointFrom(B.CHEST, B.UA[i], _qc, _c, _sh);
  _qy.setFromAxisAngle(AXY, rig.yaw);
  const bob = rig.pelvisY - rig.standingHeight(rig.feet ? Math.min(rig.feet[0].py, rig.feet[1].py) : 0);
  const gy = rig.feet ? Math.min(rig.feet[0].py, rig.feet[1].py) : 0;
  _t.set(local[0] * side * s, local[1] * s, local[2] * s).applyQuaternion(_qy).add(_p.set(rig.x, gy + bob * 0.7, rig.z));
  _pole.set(poleLocal[0] * side, poleLocal[1], poleLocal[2]).applyQuaternion(_qy);
  _f.set(0, 0, 1).applyQuaternion(_qy);
  rig.limb(B.UA[i], B.FA[i], _sh.clone(), _t.clone(), 0.3 * s, (0.255 + 0.07) * s, _pole.clone(), _f.clone(), side * 0.14);
}
function stoop(rig, a = 0.26) {
  _qy.setFromAxisAngle(AXY, rig.yaw);
  const dq = _qy.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AXX, a)).multiply(_qy.clone().invert());
  rotateAbout(rig, [B.CHEST, B.HEAD, 3, 4, 5, 6], dq, jointPos(rig, B.CHEST, new THREE.Vector3()));
  const up = _qy.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AXX, -a * 0.7)).multiply(_qy.clone().invert());
  rotateAbout(rig, [B.HEAD], up, jointPos(rig, B.HEAD, new THREE.Vector3()));
}
export const OVERLAYS = {
  pram: (rig) => { for (const i of [0, 1]) armTo(rig, i, [0.21, 0.93, 0.5], [0.3, -1, -0.2]); },
  umbrella: (rig) => armTo(rig, 1, [0.1, 1.2, 0.24], [0.6, -1, -0.3]),
  phone: (rig) => armTo(rig, 1, [0.09, 1.55, 0.06], [0.5, -1, -0.1]),
  old: (rig) => stoop(rig),
  cane: (rig) => { stoop(rig); armTo(rig, 1, [0.24, 0.82, 0.22 + 0.05 * Math.sin(rig.phase * Math.PI * 2)], [0.4, -0.6, -1]); },
  holdL: (rig) => armTo(rig, 0, [0.34, 0.66, 0.06], [0.3, -1, -0.5]),
  reachR: (rig) => armTo(rig, 1, [0.6, 1.4, 0.1], [0.2, -1, -0.6]),
};
/** Apply a family's overlay to a live rig's pose (after rig.update). */
export function overlay(rig, family) { const f = OVERLAYS[family]; if (f) f(rig); }
