// THE BIRD RIG: procedural flight layers on a skinned bird's bones, added AFTER the animation clips each frame.
// Shared by fly mode (viewer/flight.js) and the bird lab (labs/bird-lab.html).
//
//   const rig = new BirdRig(modelRoot);          // calibrates the bone axes once
//   per frame: rig.restore(); mixer.update(dt); rig.apply({ fold, bank, legs, brake });
//
//   fold  0..1  wings folded back and in (a dive)       bank  rad, > 0 = turning left: inner wing dips,
//   legs  0..1  feet tucked back under the tail                     tail and head into the turn
//   brake 0..1  tail down, wings reach forward
//
// The rig's local axes are unknown, so calibration finds, per bone, the axis and sign whose small rotation
// moves an end bone (wing tip, toe tip, tail tip, beak) the wanted way, in the bird's own frame (nose -z, up +y,
// left -x). restore() undoes last frame's offsets first: the mixer only rewrites the channels its clips animate,
// so on the others the offsets would accumulate (the jitter of 2026-11-04).
import * as THREE from "three/webgpu";

export class BirdRig {
  constructor(root) {
    this.root = root;
    this.saved = new Map();
    const B = (n) => root.getObjectByName(n);
    const v = new THREE.Vector3(), inv = new THREE.Matrix4();
    const local = (o) => { root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert(); return o.getWorldPosition(v).applyMatrix4(inv).clone(); };
    const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const q = new THREE.Quaternion();
    const find = (boneName, tipName, want) => {
      const bone = B(boneName), tip = B(tipName);
      if (!bone || !tip) return null;
      const q0 = bone.quaternion.clone(), p0 = local(tip);
      let best = null;
      for (const ax of AX) {
        bone.quaternion.copy(q0).multiply(q.setFromAxisAngle(ax, 0.4));
        const d = local(tip).sub(p0).dot(want);
        if (!best || Math.abs(d) > Math.abs(best.d)) best = { axis: ax.clone(), d };
      }
      bone.quaternion.copy(q0);
      return best && Math.abs(best.d) > 1e-4 ? { bone, axis: best.axis.multiplyScalar(Math.sign(best.d)) } : null;
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
    this.layers = {
      foldL: find("wing_1_L", "wing_tip_L", V(0.6, 0, 1)), foldR: find("wing_1_R", "wing_tip_R", V(-0.6, 0, 1)),
      elbowL: find("wing_3_L", "wing_tip_L", V(0.5, 0, 1)), elbowR: find("wing_3_R", "wing_tip_R", V(-0.5, 0, 1)),
      dipL: find("wing_1_L", "wing_tip_L", V(0, -1, 0)), dipR: find("wing_1_R", "wing_tip_R", V(0, -1, 0)),
      fwdL: find("wing_1_L", "wing_tip_L", V(0, 0, -1)), fwdR: find("wing_1_R", "wing_tip_R", V(0, 0, -1)),
      tailSide: find("tail_1", "tail_tip", V(1, 0, 0)), tailDown: find("tail_1", "tail_tip", V(0, -1, 0)),
      headSide: find("head", "mouth_upper_tip", V(1, 0, 0)),
      legL: find("UpperLeg_L", "Toes_tip_L", V(0, 0.5, 1)), legR: find("UpperLeg_R", "Toes_tip_R", V(0, 0.5, 1)),
      kneeL: find("LowerLeg_L", "Toes_tip_L", V(0, 0.5, 1)), kneeR: find("LowerLeg_R", "Toes_tip_R", V(0, 0.5, 1)),
    };
    this._find = find;
    this.found = Object.fromEntries(Object.entries(this.layers).map(([k, l]) => [k, l ? `${l.bone.name} ${l.axis.toArray().join(",")}` : null]));
  }

  /** One more layer (the falcon family, viewer/falcons.js: head down, beak open...): rotating `boneName` moves the end
   *  bone `tipName` along `want` [x, y, z] (the bird's frame: nose -z, up +y, left -x). Call before any mixer update. */
  addLayer(key, boneName, tipName, want) {
    this.layers[key] = this._find(boneName, tipName, new THREE.Vector3(want[0], want[1], want[2]).normalize());
    this._list = null;
    return !!this.layers[key];
  }

  /** Before mixer.update: put every layered bone back to its pose before last frame's offsets. */
  restore() { for (const [bone, q0] of this.saved) bone.quaternion.copy(q0); }

  /** After mixer.update: the layers; extra = { layerKey: angle } for the added layers. */
  apply({ fold = 0, bank = 0, legs = 1, brake = 0, extra = null } = {}) {
    const L = this.layers, q = _q;
    this._list ??= Object.values(L).filter(Boolean);
    for (const l of this._list) (this.saved.get(l.bone) || this.saved.set(l.bone, new THREE.Quaternion()).get(l.bone)).copy(l.bone.quaternion);
    const add = (l, a) => { if (l && a) l.bone.quaternion.multiply(q.setFromAxisAngle(l.axis, a)); };
    add(L.foldL, 0.9 * fold); add(L.foldR, 0.9 * fold); add(L.elbowL, 0.7 * fold); add(L.elbowR, 0.7 * fold);
    add(L.dipL, Math.max(0, bank) * 0.45); add(L.dipR, Math.max(0, -bank) * 0.45);
    add(L.tailSide, -bank * 0.5); add(L.headSide, -bank * 0.5);
    add(L.legL, 0.9 * legs); add(L.legR, 0.9 * legs); add(L.kneeL, 0.6 * legs); add(L.kneeR, 0.6 * legs);
    add(L.tailDown, 0.5 * brake); add(L.fwdL, 0.35 * brake); add(L.fwdR, 0.35 * brake);
    if (extra) for (const k in extra) add(L[k], extra[k]);
  }
}
const _q = new THREE.Quaternion();
