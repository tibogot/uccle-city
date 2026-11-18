// PLACEHOLDER kid + BMX for the bike lab (boxes, cylinders, tori: clearly not the final asset; the real one comes from
// the Blender kit later). Driven by bikePhysics state: heading / lean (round the contact line) / pitch (round the CoM),
// the legs (the frame moves under the body), wheel spin, cranks with the feet on the pedals (2-bone IK), the bars
// turned by the steer angle, pushing (the kid walks beside it), the crash (the bike on its side, the kid tumbling).
//
// THE RIDER'S EMPTIES (claude/kid): named Object3Ds on the bike that the real rider (viewer/kid/riderIK.js) reaches
// for: grip_L / grip_R (on the bars: they turn with the steering), pedal_L / pedal_R (turn with the cranks), seat (top of
// the saddle), bb (the crank axle), peg_FL / peg_FR / peg_RL / peg_RR (the BMX pegs), and `frame` (the CoM frame the
// rider's body hangs in: lean + pitch, NOT moved by the legs). The same names as the BMX asset's empties
// (models/bike/bmx.glb, claude/bmx): viewer/kid/bikeRig.js finds them in either. createBikeModel(B, { rider: false })
// hides the placeholder kid (the real one rides).
import * as THREE from "three/webgpu";
import { BIKE } from "./bikePhysics.js";

const mat = (color, rough = 0.6, metal = 0) => new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal });
const M = {
  frame: mat(0x1f7ae0, 0.35, 0.4), chrome: mat(0xd8dde2, 0.25, 0.9), tyre: mat(0x1b1b1d, 0.85), grip: mat(0x2a2a2a, 0.9),
  shirt: mat(0xf2c12e, 0.8), shorts: mat(0x3a4f7a, 0.85), skin: mat(0xe0b08e, 0.7), shoe: mat(0xf4f4f4, 0.7), cap: mat(0xd23a3a, 0.7),
};

function box(w, h, d, m) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = true; return g; }
/** a bar from a to b (local points), thickness t */
function rod(a, b, t, m) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.Mesh(new THREE.BoxGeometry(t, t, L), m);
  g.position.copy(a).addScaledVector(d, 0.5); g.lookAt(b.clone()); g.castShadow = true;
  return g;
}
/** a limb segment that is re-aimed every frame (unit length box scaled along z) */
function limb(t, m) { const g = new THREE.Mesh(new THREE.BoxGeometry(t, t, 1), m); g.castShadow = true; return g; }
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function aim(seg, a, b, parent) {
  seg.position.copy(a).add(b).multiplyScalar(0.5);
  seg.scale.set(1, 1, Math.max(0.01, a.distanceTo(b)));
  _a.copy(b); parent.localToWorld(_a); seg.lookAt(_a);
}

export function createBikeModel(B = BIKE, { rider = true } = {}) {
  const H = B.cgHeight, R = B.wheelR, L = B.wheelbase;
  const root = new THREE.Group(); root.name = "bike (placeholder)";
  const leanG = new THREE.Group(); root.add(leanG);            // round the contact line
  const pitchG = new THREE.Group(); pitchG.position.y = H; leanG.add(pitchG);   // round the CoM
  pitchG.rotation.order = "XYZ";
  const bikeG = new THREE.Group(); pitchG.add(bikeG);          // the frame: moved by the legs
  const riderG = new THREE.Group(); pitchG.add(riderG);
  // ---- the bike (in pitchG coordinates: the CoM at 0, the ground at -H, forward +z)
  const hubY = -H + R, hubF = L / 2, hubR = -L / 2;
  const wheel = () => {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.028, 0.028, 8, 28), M.tyre); t.rotation.y = Math.PI / 2; t.castShadow = true; w.add(t);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.008, 4, 24), M.chrome); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 6; k++) { const sp = box(0.006, (R - 0.06) * 2, 0.006, M.chrome); sp.rotation.x = k * Math.PI / 6; w.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 10), M.chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
    return w;
  };
  const wf = wheel(), wr = wheel();
  wf.position.set(0, hubY, hubF); wr.position.set(0, hubY, hubR);
  const fork = new THREE.Group(); fork.position.set(0, -H + 0.86, hubF - 0.13); bikeG.add(fork);   // the steering: head tube top
  fork.rotation.order = "YXZ";
  const forkLocal = (p) => p.sub(fork.position);
  wf.position.copy(forkLocal(new THREE.Vector3(0, hubY, hubF)));
  // (the front wheel in the steering group, unrotated by the head angle for simplicity of the placeholder)
  const frontG = new THREE.Group(); fork.add(frontG); frontG.add(wf);
  bikeG.add(wr);
  const V = (y, z) => new THREE.Vector3(0, -H + y, z);
  const bb = V(0.3, 0.03), seatTop = V(0.78, -0.2), head = V(0.86, hubF - 0.13), headLow = V(0.7, hubF - 0.09);
  bikeG.add(rod(bb, headLow, 0.035, M.frame), rod(seatTop, head, 0.032, M.frame), rod(bb, seatTop, 0.035, M.frame),
    rod(bb, V(R, hubR), 0.022, M.frame), rod(seatTop, V(R, hubR), 0.02, M.frame));
  const seat = box(0.09, 0.04, 0.22, M.grip); seat.position.copy(V(0.81, -0.22)); bikeG.add(seat);
  // fork legs + bars (in the steering group)
  frontG.add(rod(new THREE.Vector3(0, -0.02, 0), forkLocal(new THREE.Vector3(0, hubY, hubF)), 0.025, M.chrome));
  const bars = new THREE.Group(); bars.position.set(0, 0.16, -0.04); frontG.add(bars);
  bars.add(box(0.66, 0.022, 0.022, M.chrome), box(0.02, 0.16, 0.02, M.chrome));
  for (const sx of [-0.3, 0.3]) { const gp = box(0.1, 0.034, 0.034, M.grip); gp.position.x = sx; bars.add(gp); }
  // cranks + pedals
  const crank = new THREE.Group(); crank.position.copy(bb); bikeG.add(crank);
  const arms = [], pedals = [];
  for (const side of [1, -1]) {
    const a = box(0.02, 0.02, 0.165, M.chrome); a.position.set(side * 0.07, 0, 0.0825); const ag = new THREE.Group(); ag.add(a); crank.add(ag); arms.push(ag);
    const p = box(0.1, 0.02, 0.07, M.grip); pedals.push(p); bikeG.add(p);
  }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 20), M.chrome); ring.rotation.z = Math.PI / 2; ring.position.x = 0.05; crank.add(ring);
  // the rider's empties (see the header); +x = the bike's LEFT (forward +z, up +y)
  const empty = (name, parent, x, y, z) => { const e = new THREE.Object3D(); e.name = name; e.position.set(x, y, z); parent.add(e); return e; };
  const empties = {
    grip_L: empty("grip_L", bars, 0.3, 0, 0), grip_R: empty("grip_R", bars, -0.3, 0, 0),
    pedal_L: empty("pedal_L", bikeG, 0, 0, 0), pedal_R: empty("pedal_R", bikeG, 0, 0, 0),
    seat: empty("seat", bikeG, 0, -H + 0.83, -0.22), bb: empty("bb", bikeG, 0, bb.y, bb.z),
    peg_FL: empty("peg_FL", frontG, 0.1, forkLocal(new THREE.Vector3(0, hubY, hubF)).y, forkLocal(new THREE.Vector3(0, hubY, hubF)).z),
    peg_FR: empty("peg_FR", frontG, -0.1, forkLocal(new THREE.Vector3(0, hubY, hubF)).y, forkLocal(new THREE.Vector3(0, hubY, hubF)).z),
    peg_RL: empty("peg_RL", bikeG, 0.1, hubY, hubR), peg_RR: empty("peg_RR", bikeG, -0.1, hubY, hubR),
    frame: pitchG,
  };
  // ---- the kid (in pitchG coordinates)
  const torso = box(0.26, 0.42, 0.16, M.shirt), headM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), M.skin);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.cap);
  headM.castShadow = true; riderG.add(torso, headM, cap);
  const hips = box(0.26, 0.12, 0.16, M.shorts); riderG.add(hips);
  const thigh = [limb(0.1, M.shorts), limb(0.1, M.shorts)], shin = [limb(0.08, M.skin), limb(0.08, M.skin)], shoe = [box(0.09, 0.07, 0.2, M.shoe), box(0.09, 0.07, 0.2, M.shoe)];
  const upper = [limb(0.07, M.shirt), limb(0.07, M.shirt)], fore = [limb(0.06, M.skin), limb(0.06, M.skin)];
  riderG.add(...thigh, ...shin, ...shoe, ...upper, ...fore);
  // the fallen kid (a crash): a separate group in world space
  const fallen = new THREE.Group();
  riderG.visible = rider;
  { const t = box(0.26, 0.42, 0.16, M.shirt); const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), M.skin); h.position.y = 0.32; h.castShadow = true;
    const l1 = box(0.1, 0.5, 0.1, M.shorts); l1.position.set(0.07, -0.42, 0.05); const l2 = box(0.1, 0.5, 0.1, M.shorts); l2.position.set(-0.07, -0.42, -0.05);
    fallen.add(t, h, l1, l2); fallen.visible = false; }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), knee = new THREE.Vector3(), elbow = new THREE.Vector3();
  const THIGH = 0.4, SHIN = 0.4, UPPER = 0.27, FORE = 0.25;
  /** 2-bone IK in the side plane (y, z), the joint bent toward `bend` (+1 forward knee, -1 back elbow) */
  function ik(hip, foot, l1, l2, bend, out) {
    const dz = foot.z - hip.z, dy = foot.y - hip.y, d = Math.min(l1 + l2 - 1e-3, Math.hypot(dz, dy));
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const base = Math.atan2(dy, dz), ang = base + bend * a;
    out.set(hip.x + (foot.x - hip.x) * 0.5, hip.y + Math.sin(ang) * l1, hip.z + Math.cos(ang) * l1);
    return out;
  }

  return {
    root, fallen, empties, rider, bikeFrame: bikeG,
    /** the bike's ground clearance etc. for the rider: crank length, wheel radius */
    geom: { crank: 0.165, wheelR: R, cgHeight: H },
    update(s, pose, groundAt) {
      const legs = s.legs * B.legRange;
      root.position.set(pose.x, pose.y - H, pose.z);
      root.rotation.y = pose.heading;
      const tricked = s.trick;
      leanG.rotation.z = -pose.lean;
      pitchG.rotation.x = -pose.pitch;
      bikeG.position.y = -legs;
      // the trick (placeholder tabletop): the bike laid flat to one side under the kid
      bikeG.rotation.z = -tricked * 0.9;
      frontG.rotation.y = s.steerAngle;
      wr.rotation.x = s.spin[1]; wf.rotation.x = s.spin[0];
      crank.rotation.x = s.crank;
      for (let k = 0; k < 2; k++) {
        // (the crank arm points along +z at 0 and turns with crank.rotation.x: +z -> -y)
        const ang = s.crank + k * Math.PI;
        pedals[k].position.set((k === 0 ? 1 : -1) * 0.12, bb.y - Math.sin(ang) * 0.165, bb.z + Math.cos(ang) * 0.165);
        (k === 0 ? empties.pedal_L : empties.pedal_R).position.copy(pedals[k].position);
        arms[k].rotation.x = k * Math.PI;
      }
      // the kid: seated / standing (sprint, hop crouch, landing), the hips over the seat or the BB
      const stand = Math.max(s.sprint, Math.min(1, Math.abs(s.legs) * 1.5), s.air ? 0.7 : 0);
      const hip = tmpA.set(0, -H + 0.83 + stand * 0.12 - Math.max(0, -s.legs) * 0.15, -0.16 + stand * 0.1);
      const lean = 0.45 + stand * 0.25 - (s.manual > 0 ? 0.35 : 0);
      torso.position.set(0, hip.y + 0.22 * Math.cos(lean), hip.z + 0.22 * Math.sin(lean)); torso.rotation.x = lean;
      hips.position.copy(hip);
      const sh = tmpB.set(0, hip.y + 0.42 * Math.cos(lean), hip.z + 0.42 * Math.sin(lean));
      headM.position.set(0, sh.y + 0.15, sh.z + 0.05); cap.position.copy(headM.position).add({ x: 0, y: 0.01, z: 0 });
      cap.rotation.x = 0.15;
      riderG.visible = rider && !s.crashed && !s.pushing;
      root.updateMatrixWorld(true);
      if (riderG.visible) {
        for (let k = 0; k < 2; k++) {
          const side = k === 0 ? 1 : -1;
          const h = new THREE.Vector3(side * 0.08, hip.y, hip.z);
          const f = pedals[k].position.clone(); f.y += 0.04 - legs; f.x = side * 0.11;
          if (s.footDown > 0.5 && k === 0) f.set(side * 0.3, -H + 0.05, hip.z + 0.2);    // a foot down at a stop
          ik(h, f, THIGH, SHIN, 1, knee);
          aim(thigh[k], h, knee, riderG); aim(shin[k], knee, f, riderG);
          shoe[k].position.copy(f); shoe[k].position.z += 0.04;
          // the hands on the grips (the bars turn with the steering; approximate their place in pitchG)
          const g = new THREE.Vector3(side * 0.3, -H + 0.86 + 0.16 - legs, hubF - 0.17);
          const s0 = new THREE.Vector3(side * 0.16, sh.y - 0.04, sh.z);
          ik(s0, g, UPPER, FORE, -1, elbow); elbow.x = side * 0.22;
          aim(upper[k], s0, elbow, riderG); aim(fore[k], elbow, g, riderG);
        }
      }
      // crashed: the kid tumbles in world space; pushing: the kid walks beside the bike (a simple stand-in)
      fallen.visible = rider && (s.crashed || s.pushing);
      if (s.crashed) {
        fallen.position.set(s.rider.x, s.rider.y, s.rider.z);
        fallen.rotation.set(Math.min(1.5, s.crashT * 4), pose.heading, s.crashT * 2);
      } else if (s.pushing) {
        const lx = Math.cos(pose.heading), lz = -Math.sin(pose.heading);
        const gx = pose.x + lx * 0.45, gz = pose.z + lz * 0.45;
        fallen.position.set(gx, (groundAt ? groundAt(gx, gz) : pose.y - H) + 0.92 + Math.abs(Math.sin(s.walkPhase)) * 0.03, gz);
        fallen.rotation.set(0.15, pose.heading, 0);
      }
    },
  };
}
