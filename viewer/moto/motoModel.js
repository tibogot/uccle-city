// THE RIDDEN TWO-WHEELERS in the viewer (round 1: the motorbike; round 2: + the scooter and the Villo bike, docs/MOTO.md):
// tools/blender/<kind>.py -> tools/moto/pack.mjs -> models/<kind>/<kind>.glb (+ <kind>.json: the rig numbers). The pack
// carries every LOD (round 1 made them here with meshoptimizer at load) and ONE primitive per rig node with every slot
// merged ("_slot": viewer/moto/twoWheelSlots.js), drawn by one material per kind (viewer/moto/twoWheelMats.js): a bike is
// ~10 meshes (round 1: 41). The rig poses it from a motoPhysics.js state:
//   root (the ground midway between the axles, heading, slope) > lean (about the contact line, lifted so nothing sinks)
//   > pitchR (wheelie, about the rear contact) > pitchF (stoppie, about the front contact) > bike:
//       sprung (dive / squat, heave): Body, Steer pivot (turns about the steering axis; carries the front wheel),
//       the rider, Wheel_R (spins)
//   motorbike / scooter (createMoto): legs fixed; the torso tucks (motorbike) and hangs into the corner; the arms by a
//       two-bone IK from the shoulders to the grips
//   Villo (createVillo): + the cranks (turn with the pedalling), the pedals (stay level), the legs by a two-bone IK from
//       the hips to the pedals (the feet follow the cranks); pushing uphill: the rider walks beside the bike, one hand
//       on the bar, one on the saddle
// On a crash the rider leaves the bike: a tumbling body that slides to a stop, its arms and torso blending into a
// limp / bracing pose (ragdoll-ish, no physics), back on the respawn.
// No per-frame allocation in update(). Materials are shared (userData.shared) and built once.
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { leanLift } from "./motoPhysics.js";
import { KINDS } from "./twoWheelSlots.js";
import { playerMaterial, twoWheelLights } from "./twoWheelMats.js";

/** light switches of the player's two-wheeler (0..1): head / tail lamps (night), brake light */
export const motoLights = twoWheelLights;
/** paint colours (the tank, scoops, tail, fender) */
export const MOTO_PAINTS = { "racing red": 0x8c0a0c, "acid green": 0x6f9a12, "pearl white": 0xe6e6e2, "matte black": 0x101113, "cobalt blue": 0x1a3f8f, "orange": 0xd0560c };
/** the scooter's paints (classic pastels and darks, no brand colours) */
export const SCOOTER_PAINTS = { "mint": 0x8fc0b4, "cream": 0xe9e2cf, "sky": 0x9fb9d4, "burgundy": 0x6d0f12, "black": 0x101113, "sage": 0xb3c99a };
const DEFAULT_PAINT = { moto: MOTO_PAINTS["racing red"], scooter: SCOOTER_PAINTS.mint, villo: 0x808080 };
/** LOD switch distances (m) of the ridden vehicle (the pack's rig LODs) */
export const RIG_LOD_DIST = [22, 70, Infinity];

const promises = new Map();
/** one kind's model: { kind, info, lods: [ { node: [{ geo, mat }] } x3 ], ... } */
export function loadMotoModel(kind = "moto") {
  if (promises.has(kind)) return promises.get(kind);
  const p = (async () => {
    const t0 = performance.now(), K = KINDS[kind];
    const base = new URL(`../../models/${K.dir}/`, import.meta.url);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [info, gltf] = await Promise.all([fetch(new URL(`${kind}.json`, base)).then((r) => r.json()), loader.loadAsync(new URL(`${kind}.glb`, base).href)]);
    const { material, setPaint } = playerMaterial(kind, DEFAULT_PAINT[kind]);
    const geoOf = (name) => {
      const o = gltf.scene.getObjectByName(name);
      if (!o) return null;
      const g = o.isMesh ? o.geometry : o.children.find((c) => c.isMesh)?.geometry;
      if (!g) return null;
      g.computeBoundingSphere(); g.userData.shared = true;
      return g;
    };
    const lods = [0, 1, 2].map(() => ({}));
    const tris = [0, 0, 0];
    for (const n of K.nodes) for (let k = 0; k < 3; k++) {
      const g = geoOf(`${n}_lod${k}`);
      if (!g) throw new Error(`${kind}: ${n}_lod${k} missing in ${kind}.glb (run node tools/moto/pack.mjs ${kind})`);
      lods[k][n] = [{ geo: g, slot: "all", mat: material }];
      tris[k] += g.index.count / 3;
    }
    return { kind, info, lods, mats: { all: material }, tris, ao: true, loadMs: performance.now() - t0, lodDist: RIG_LOD_DIST,
      size: info.size, lamps: info.lamps, setPaint, nodes: K.nodes };
  })();
  promises.set(kind, p);
  return p;
}

const cityPromises = new Map();
/** the city's geometries of a kind (models/<kind>/<kind>_city.glb: parked_lod1..3, ridden_lod1..3; no rig) */
export function loadCityTwoWheeler(kind) {
  if (cityPromises.has(kind)) return cityPromises.get(kind);
  const p = (async () => {
    const K = KINDS[kind], base = new URL(`../../models/${K.dir}/`, import.meta.url);
    const [info, gltf] = await Promise.all([fetch(new URL(`${kind}.json`, base)).then((r) => r.json()),
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL(`${kind}_city.glb`, base).href)]);
    const geoOf = (name) => {
      const o = gltf.scene.getObjectByName(name), g = o?.isMesh ? o.geometry : o?.children.find((c) => c.isMesh)?.geometry;
      if (!g) return null;
      // float normals: the pack's int8 octahedral normals arrive interleaved (stride 4) and normalized; the city pools'
      // multi-draw merge copies attributes into a typed array of the source's type (0.05 into an Int8Array = 0: black bikes)
      const N = g.attributes.normal;
      if (N && (N.isInterleavedBufferAttribute || !(N.array instanceof Float32Array))) {
        const F = new Float32Array(N.count * 3);
        for (let i = 0; i < N.count; i++) { F[i * 3] = N.getX(i); F[i * 3 + 1] = N.getY(i); F[i * 3 + 2] = N.getZ(i); }
        g.setAttribute("normal", new THREE.BufferAttribute(F, 3));
      }
      g.computeBoundingSphere(); g.userData.shared = true;
      return g;
    };
    return { kind, info, parked: [1, 2, 3].map((k) => geoOf(`parked_lod${k}`)), ridden: [1, 2, 3].map((k) => geoOf(`ridden_lod${k}`)) };
  })();
  cityPromises.set(kind, p);
  return p;
}

// ------------------------------------------------------------------------------------------------ shared rig helpers
const v3 = (a) => new THREE.Vector3().fromArray(a);
const ZAXIS = new THREE.Vector3(0, 0, 1);

/** a two-bone chain solver: places segment groups U (S -> E) and F (E -> G), both built along +Z from their joint.
 *  pole: the side the middle joint bends toward. Scratch vectors are the caller's (no allocation). */
function twoBone(U, F, S, G, a, b, pole, E, D, P, T) {
  D.subVectors(G, S);
  const dl = D.length() || 1, d = Math.min(dl, a + b - 1e-3);
  D.multiplyScalar(1 / dl);
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  P.copy(pole).addScaledVector(D, -pole.dot(D)).normalize();
  E.copy(S).addScaledVector(D, x).addScaledVector(P, h);
  U.position.copy(S); U.quaternion.setFromUnitVectors(ZAXIS, T.subVectors(E, S).normalize());
  F.position.copy(E); F.quaternion.setFromUnitVectors(ZAXIS, T.subVectors(G, E).normalize());
}

/** the rig's frame groups (root > lean > pitchR > afterR > pitchF > bike > sprung) */
function frames(WB) {
  const half = WB / 2;
  const root = new THREE.Group(); root.rotation.order = "YXZ";
  const lean = new THREE.Group(); root.add(lean);
  const pitchR = new THREE.Group(); pitchR.position.z = -half; lean.add(pitchR);
  const afterR = new THREE.Group(); afterR.position.z = half; pitchR.add(afterR);
  const pitchF = new THREE.Group(); pitchF.position.z = half; afterR.add(pitchF);
  const bike = new THREE.Group(); bike.position.z = -half; pitchF.add(bike);
  const sprung = new THREE.Group(); bike.add(sprung);
  return { root, lean, pitchR, pitchF, bike, sprung };
}

/** one Mesh per node, its geometry swapped per LOD (no new objects at a LOD change) */
function meshesFor(model, holders, shadows) {
  const meshes = [];
  for (const [name, holder] of Object.entries(holders)) {
    for (const p of model.lods[0][name]) {
      const m = new THREE.Mesh(p.geo, p.mat);
      m.castShadow = shadows; m.receiveShadow = true;
      m.userData.node = name;
      holder.add(m); meshes.push(m);
    }
  }
  let cur = 0;
  const setLod = (k) => {
    if (k === cur) return;
    cur = k;
    for (const m of meshes) { const p = model.lods[k][m.userData.node][0]; m.geometry = p.geo; m.material = p.mat; }
  };
  return { meshes, setLod, lod: () => cur };
}

/** the crash: the rider as a tumbling body in world space, its pose blending toward a limp / bracing one */
function riderFall(root, rider, hip) {
  const fall = { on: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), q: new THREE.Quaternion(), dq: new THREE.Quaternion(), t: 0, limp: 0 };
  const sS = new THREE.Vector3(), T = new THREE.Vector3();
  fall.detach = (c) => {
    rider.updateMatrixWorld(true);
    rider.matrixWorld.decompose(fall.pos, fall.q, sS);
    fall.pos.copy(hip).applyMatrix4(rider.matrixWorld);          // the body tumbles about its hips
    root.parent?.attach(rider);
    const s = Math.sin(c.heading), k = Math.cos(c.heading), v = Math.max(3, c.speed);
    fall.vel.set(s * v * 0.9 + c.vx, 2.2 + Math.min(3, v * 0.06), k * v * 0.9 + c.vz);
    fall.spin.set(k * -v * 0.5 - c.crashDir * s * 2, c.crashDir * 1.5, s * v * 0.5 - c.crashDir * k * 2);
    fall.on = true; fall.t = 0; fall.limp = 0;
  };
  fall.step = (dt, ground) => {
    fall.t += dt;
    fall.limp = Math.min(1, fall.limp + dt * 3);
    fall.vel.y -= 9.81 * dt;
    fall.pos.addScaledVector(fall.vel, dt);
    const gy = ground(fall.pos.x, fall.pos.z) + 0.16;
    if (fall.pos.y < gy) {
      fall.pos.y = gy;
      if (fall.vel.y < 0) fall.vel.y *= -0.25;
      const f = Math.exp(-dt * 2.2); fall.vel.x *= f; fall.vel.z *= f;
      fall.spin.multiplyScalar(Math.exp(-dt * 3));
    }
    const w = fall.spin.length();
    if (w > 1e-4) { fall.dq.setFromAxisAngle(T.copy(fall.spin).multiplyScalar(1 / w), w * dt); fall.q.premultiply(fall.dq); }
    rider.quaternion.copy(fall.q);
    rider.position.copy(hip).applyQuaternion(fall.q).negate().add(fall.pos);
  };
  return fall;
}

// ------------------------------------------------------------------------------------------------ motorbike / scooter
/**
 * One rideable motorbike or scooter. moto.update(state, dt, ground) poses it; moto.setLod(k); moto.root (add to the
 * scene); moto.lampRoot (the frame the lamps in model.lamps are given in: night lights follow the lean and pitch).
 */
export function createMoto(model, { shadows = true } = {}) {
  if (model.kind === "villo") return createVillo(model, { shadows });
  const I = model.info, scooter = model.kind === "scooter";
  const { root, lean, pitchR, pitchF, bike, sprung } = frames(I.wheelbase);
  root.name = scooter ? "scooter" : "motorbike";
  const rider = new THREE.Group(); rider.name = "rider"; sprung.add(rider);
  const steer = new THREE.Group(); steer.position.fromArray(I.steer.pivot); sprung.add(steer);
  const axis = v3(I.steer.axis).normalize();
  const wheelF = new THREE.Group(); wheelF.position.copy(v3(I.wheels.F.pos)).sub(steer.position); steer.add(wheelF);
  const wheelR = new THREE.Group(); wheelR.position.fromArray(I.wheels.R.pos); bike.add(wheelR);
  const torso = new THREE.Group(); torso.position.fromArray(I.rider.hip); rider.add(torso);
  const legs = new THREE.Group(); rider.add(legs);
  const arms = { U_L: new THREE.Group(), U_R: new THREE.Group(), F_L: new THREE.Group(), F_R: new THREE.Group() };
  for (const g of Object.values(arms)) rider.add(g);
  const holders = { Body: sprung, Steer: steer, Wheel_F: wheelF, Wheel_R: wheelR, RiderLegs: legs, RiderTorso: torso, ArmU_L: arms.U_L, ArmU_R: arms.U_R, ArmF_L: arms.F_L, ArmF_R: arms.F_R };
  const M = meshesFor(model, holders, shadows);

  // IK scratch (rider frame = sprung's frame)
  const R = I.rider, hip = v3(R.hip), torsoRest = KINDS[model.kind].torsoRest;
  const shoulderRest = { L: v3(R.shoulder.L).sub(hip), R: v3(R.shoulder.R).sub(hip) };
  const gripRest = { L: v3(R.grip.L).sub(steer.position), R: v3(R.grip.R).sub(steer.position) };
  const S = new THREE.Vector3(), G = new THREE.Vector3(), D = new THREE.Vector3(), E = new THREE.Vector3(), P = new THREE.Vector3(), T = new THREE.Vector3();
  const pole = { L: new THREE.Vector3(R.elbowOut, -1, -0.2), R: new THREE.Vector3(-R.elbowOut, -1, -0.2) };
  const limpPole = { L: new THREE.Vector3(1, 0.2, 0.3), R: new THREE.Vector3(-1, 0.2, 0.3) };
  const q = new THREE.Quaternion(), eul = new THREE.Euler();
  const solveArm = (side, torsoQ, limp) => {
    S.copy(shoulderRest[side]).applyQuaternion(torsoQ).add(torso.position);
    G.copy(gripRest[side]).applyQuaternion(steer.quaternion).add(steer.position);
    if (limp > 0) {   // (the crash: the hands leave the bars, out and forward: bracing)
      T.set(side === "L" ? 0.42 : -0.42, -0.15, 0.25).add(S);
      G.lerp(T, limp);
    }
    twoBone(arms["U_" + side], arms["F_" + side], S, G, R.upper, R.fore, limp > 0 ? limpPole[side] : pole[side], E, D, P, T);
  };
  const fall = riderFall(root, rider, hip);
  const attach = () => { sprung.add(rider); rider.position.set(0, 0, 0); rider.quaternion.identity(); rider.scale.set(1, 1, 1); fall.on = false; };

  let tuckS = 0;
  const update = (c, dt = 1 / 60, ground = null) => {
    root.position.set(c.x, c.y, c.z);
    root.rotation.set(-c.slopePitch, c.heading, 0);
    lean.rotation.z = -c.lean;
    lean.position.y = leanLift(c.lean, c.crashed ? 0.06 : I.wheels.R.crown, model.kind);
    pitchR.rotation.x = c.wheelie > 0 ? -c.wheelie : 0;
    pitchF.rotation.x = c.wheelie < 0 ? -c.wheelie : 0;
    sprung.position.y = c.heave * 0.5;
    sprung.rotation.x = c.pitch * 0.6;
    steer.quaternion.setFromAxisAngle(axis, c.steerAngle);
    wheelF.rotation.x = c.frontSpin;
    wheelR.rotation.x = c.wheelSpin;
    if (c.crashed && !fall.on) fall.detach(c);
    if (!c.crashed && fall.on) attach();
    if (fall.on) {
      if (ground) fall.step(dt, ground);
      // the ragdoll-ish blend: the torso folds back at the hip, the arms brace out
      torso.rotation.set(torsoRest - 0.55 * fall.limp, 0, 0.25 * fall.limp * (c.crashDir || 1));
      eul.set(torso.rotation.x, 0, torso.rotation.z); q.setFromEuler(eul);
      solveArm("L", q, fall.limp); solveArm("R", q, fall.limp);
      return;
    }
    tuckS += ((scooter ? 0 : c.tuck || 0) - tuckS) * Math.min(1, dt * 4);
    torso.rotation.set(torsoRest + tuckS * 0.26 + Math.max(0, c.wheelie) * 0.5 + (scooter ? -Math.min(0.06, Math.max(-0.06, (c.accel || 0) * 0.012)) : 0), 0, -c.lean * (scooter ? 0.1 : 0.18));
    rider.position.x = c.lean * (scooter ? 0.015 : 0.035);
    eul.set(torso.rotation.x, 0, torso.rotation.z); q.setFromEuler(eul);
    solveArm("L", q, 0); solveArm("R", q, 0);
  };
  update({ x: 0, y: 0, z: 0, heading: 0, slopePitch: 0, lean: 0, wheelie: 0, heave: 0, pitch: 0, steerAngle: 0, frontSpin: 0, wheelSpin: 0, tuck: 0 });
  const eye = R.eye ? v3(R.eye) : new THREE.Vector3(0, 1.53, 0.05);
  return { root, lampRoot: bike, setLod: M.setLod, update, meshes: M.meshes, get lod() { return M.lod(); }, get riderOff() { return fall.on; }, reattach: attach, eye, kind: model.kind };
}

// ------------------------------------------------------------------------------------------------ the Villo bike
/**
 * The rideable Villo (tools/blender/villo_ride.py: the street kit's station bike + a commuter). Extra state read from
 * the physics: c.crank (rad, the pedalling phase), c.pushing (0..1: off the saddle, walking beside it), c.walk (the
 * walking phase).
 */
export function createVillo(model, { shadows = true } = {}) {
  const I = model.info, R = I.rider;
  const { root, lean, pitchR, pitchF, bike, sprung } = frames(I.wheelbase);
  root.name = "villo-ride";
  const steer = new THREE.Group(); steer.position.fromArray(I.steer.pivot); sprung.add(steer);
  const axis = v3(I.steer.axis).normalize();
  const wheelF = new THREE.Group(); wheelF.position.copy(v3(I.wheels.F.pos)).sub(steer.position); steer.add(wheelF);
  const wheelR = new THREE.Group(); wheelR.position.fromArray(I.wheels.R.pos); bike.add(wheelR);
  const bb = v3(I.bb);
  const cranks = new THREE.Group(); cranks.position.copy(bb); sprung.add(cranks);
  const pedal = { L: new THREE.Group(), R: new THREE.Group() }; sprung.add(pedal.L, pedal.R);
  const rider = new THREE.Group(); rider.name = "rider"; sprung.add(rider);
  const torso = new THREE.Group(); torso.position.fromArray(R.hip); rider.add(torso);
  const seg = {};
  for (const n of ["Thigh_L", "Thigh_R", "Shin_L", "Shin_R", "ArmU_L", "ArmU_R", "ArmF_L", "ArmF_R"]) { seg[n] = new THREE.Group(); rider.add(seg[n]); }
  const holders = { Body: sprung, Steer: steer, Wheel_F: wheelF, Wheel_R: wheelR, Cranks: cranks, Pedal_L: pedal.L, Pedal_R: pedal.R, RiderTorso: torso, ...seg };
  const M = meshesFor(model, holders, shadows);

  const hip = v3(R.hip);
  const hipJ = { L: v3(R.hipJoint.L).sub(hip), R: v3(R.hipJoint.R).sub(hip) };
  const shoulderRest = { L: v3(R.shoulder.L).sub(hip), R: v3(R.shoulder.R).sub(hip) };
  const gripRest = { L: v3(R.grip.L).sub(steer.position), R: v3(R.grip.R).sub(steer.position) };
  const footBike = v3(R.footBike);                       // ankle -> pedal spindle (bike frame, foot flat)
  const crankR0 = I.crankRest_deg.R * Math.PI / 180, CR = I.crank, PX = I.pedalX;
  const saddle = new THREE.Vector3(-0.02, hip.y - 0.05, hip.z - 0.05);
  const S = new THREE.Vector3(), G = new THREE.Vector3(), D = new THREE.Vector3(), E = new THREE.Vector3(), P = new THREE.Vector3(), T = new THREE.Vector3(), H = new THREE.Vector3(), A = new THREE.Vector3();
  const kneePole = { L: new THREE.Vector3(0.12, 0, 1), R: new THREE.Vector3(-0.12, 0, 1) };
  const armPole = { L: new THREE.Vector3(R.elbowOut, -1, -0.3), R: new THREE.Vector3(-R.elbowOut, -1, -0.3) };
  const limpPole = { L: new THREE.Vector3(1, 0.2, 0.3), R: new THREE.Vector3(-1, 0.2, 0.3) };
  const q = new THREE.Quaternion(), eul = new THREE.Euler();
  // standing beside the bike (pushing): the hips 0.45 m to its left, 0.2 m ahead of the saddle, standing height
  const standHip = new THREE.Vector3(0.45, 0.94, hip.z + 0.2);
  const fall = riderFall(root, rider, hip);
  const attach = () => { sprung.add(rider); rider.position.set(0, 0, 0); rider.quaternion.identity(); fall.on = false; };
  const pedalPos = (side, phase, out) => {
    const a = crankR0 - phase + (side === "L" ? Math.PI : 0);
    return out.set(side === "L" ? PX : -PX, bb.y + CR * Math.sin(a), bb.z + CR * Math.cos(a));
  };
  let push = 0;
  const update = (c, dt = 1 / 60, ground = null) => {
    root.position.set(c.x, c.y, c.z);
    root.rotation.set(-c.slopePitch, c.heading, 0);
    lean.rotation.z = -c.lean;
    lean.position.y = leanLift(c.lean, c.crashed ? 0.06 : I.wheels.R.crown, "villo");
    pitchR.rotation.x = 0; pitchF.rotation.x = c.wheelie < 0 ? -c.wheelie : 0;
    sprung.position.y = c.heave * 0.3;
    steer.quaternion.setFromAxisAngle(axis, c.steerAngle);
    wheelF.rotation.x = c.frontSpin;
    wheelR.rotation.x = c.wheelSpin;
    const phase = c.crank || 0;
    cranks.rotation.x = phase;
    pedalPos("L", phase, pedal.L.position); pedalPos("R", phase, pedal.R.position);
    if (c.crashed && !fall.on) fall.detach(c);
    if (!c.crashed && fall.on) attach();
    push += ((c.pushing || 0) - push) * Math.min(1, dt * 5);
    // the torso: on the saddle (rocking a little with the pedal strokes) or standing beside the bike
    const rock = Math.sin(phase * 2) * 0.012 * (1 - push) * Math.min(1, (c.pedal || 0) * 2);
    torso.position.copy(hip).lerp(standHip, push);
    torso.position.x += rock;
    const limp = fall.on ? fall.limp : 0;
    torso.rotation.set(0.15 * push - 0.5 * limp + (1 - push) * Math.min(0.12, Math.max(0, (c.accel || 0) * 0.04)), 0, -c.lean * 0.1 * (1 - push) + rock * 2);
    if (fall.on && ground) fall.step(dt, ground);
    eul.set(torso.rotation.x, 0, torso.rotation.z); q.setFromEuler(eul);
    // legs: hips -> the pedals (feet flat on them), or a walking gait beside the bike
    const w = c.walk || 0;
    for (const side of ["L", "R"]) {
      H.copy(hipJ[side]).applyQuaternion(q).add(torso.position);
      pedalPos(side, phase, A).sub(footBike);                              // the ankle over the pedal
      if (push > 0.01 || limp > 0) {
        const ph = w + (side === "L" ? 0 : Math.PI), stride = 0.26;
        T.set(H.x, 0.1 + Math.max(0, Math.sin(ph)) * 0.09, H.z + Math.cos(ph) * stride);
        if (limp > 0) T.set(H.x, H.y - 0.55, H.z + 0.5);
        A.lerp(T, Math.max(push, limp));
      }
      twoBone(seg["Thigh_" + side], seg["Shin_" + side], H, A, R.thigh, R.shin, kneePole[side], E, D, P, T);
    }
    // arms: both on the grips riding; pushing: the left on its grip, the right on the saddle
    for (const side of ["L", "R"]) {
      S.copy(shoulderRest[side]).applyQuaternion(q).add(torso.position);
      G.copy(gripRest[side]).applyQuaternion(steer.quaternion).add(steer.position);
      if (side === "R" && push > 0) G.lerp(saddle, push);
      if (limp > 0) { T.set(side === "L" ? 0.42 : -0.42, -0.15, 0.25).add(S); G.lerp(T, limp); }
      twoBone(seg["ArmU_" + side], seg["ArmF_" + side], S, G, R.upper, R.fore, limp > 0 ? limpPole[side] : armPole[side], E, D, P, T);
    }
  };
  update({ x: 0, y: 0, z: 0, heading: 0, slopePitch: 0, lean: 0, wheelie: 0, heave: 0, pitch: 0, steerAngle: 0, frontSpin: 0, wheelSpin: 0, crank: 0 });
  const eye = R.eye ? v3(R.eye) : new THREE.Vector3(0, 1.72, 0);
  return { root, lampRoot: bike, setLod: M.setLod, update, meshes: M.meshes, get lod() { return M.lod(); }, get riderOff() { return fall.on; }, reattach: attach, eye, kind: "villo",
    /** the rider shown / hidden (docked: the bike alone stays at the station) */
    setRider: (on) => { rider.visible = on; } };
}
