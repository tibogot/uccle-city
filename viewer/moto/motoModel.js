// THE MOTORBIKE MODEL in the viewer: tools/blender/motorbike.py -> models/moto/moto.raw.glb (+ moto.json: the rig
// numbers, moto_ao.png: the AO atlas), our materials by slot name, three LODs (motoLod.js, meshoptimizer at load), and
// the rig that poses it from a motoPhysics.js state:
//   root (the ground midway between the axles, heading, slope) > lean (about the contact line, lifted so nothing sinks)
//   > pitchR (wheelie, about the rear contact) > pitchF (stoppie, about the front contact) > bike:
//       sprung (dive / squat, heave): Body, Steer pivot (turns about the steering axis; carries the front wheel),
//       the rider (legs fixed; torso tucks at the hip and hangs off into the corner; arms by a two-bone IK from the
//       shoulders to the grips, so the hands stay on the bars while steering), Wheel_R (spins)
// On a crash the rider leaves the bike (a tumbling rigid body that slides to a stop) and comes back on the respawn.
// No per-frame allocation in update(). Materials are shared (userData.shared) and built once.
import * as THREE from "three/webgpu";
import { color, uniform, texture, uv, attribute, float } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { MOTO_LODS, weld, lodPart } from "./motoLod.js";
import { leanLift } from "./motoPhysics.js";

const BASE = new URL("../../models/moto/", import.meta.url);
const NODES = ["Body", "Steer", "Wheel_F", "Wheel_R", "RiderLegs", "RiderTorso", "ArmU_L", "ArmU_R", "ArmF_L", "ArmF_R"];

/** light switches of the player's bike (0..1): head / tail lamps (night), brake light */
export const motoLights = { head: uniform(0), tail: uniform(0), brake: uniform(0) };
/** paint colours (the tank, scoops, tail, fender) */
export const MOTO_PAINTS = { "racing red": 0x8c0a0c, "acid green": 0x6f9a12, "pearl white": 0xe6e6e2, "matte black": 0x101113, "cobalt blue": 0x1a3f8f, "orange": 0xd0560c };

let promise = null;
export function loadMotoModel() {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [info, gltf] = await Promise.all([
      fetch(new URL("moto.json", BASE)).then((r) => r.json()),
      new GLTFLoader().loadAsync(new URL("moto.raw.glb", BASE).href),
    ]);
    const ao = info.ao ? await loadAO(new URL(info.ao, BASE).href).catch(() => null) : null;
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    // per node: its meshes (in the node's own frame) grouped by slot
    const raw = {};
    for (const name of NODES) {
      const node = gltf.scene.getObjectByName(name);
      if (!node) throw new Error(`motorbike: node ${name} missing`);
      const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
      const bySlot = new Map();
      node.traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        const slot = o.material.name;
        (bySlot.get(slot) || bySlot.set(slot, []).get(slot)).push(g);
      });
      raw[name] = bySlot;
    }
    const mats = materials(ao?.tex ?? null);
    const lods = MOTO_LODS.map(() => ({}));
    let tris = [0, 0, 0];
    for (const name of NODES) {
      for (const L of lods) L[name] = [];
      for (const [slot, gs] of raw[name]) {
        const part = toArrays(gs);
        const w = weld(part);
        MOTO_LODS.forEach((spec, k) => {
          const q = lodPart(w, spec.error, MeshoptSimplifier);
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.BufferAttribute(q.P, 3));
          g.setAttribute("normal", new THREE.BufferAttribute(q.N, 3));
          if (q.U && k === 0) g.setAttribute("uv1", new THREE.BufferAttribute(q.U, 2));
          if (k > 0) {                                     // LOD1+: the AO per vertex (sampled from the atlas)
            const A = new Float32Array(q.P.length / 3);
            for (let i = 0; i < A.length; i++) A[i] = ao && q.U ? ao.at(q.U[i * 2], q.U[i * 2 + 1]) : 1;
            g.setAttribute("aoV", new THREE.BufferAttribute(A, 1));
          }
          g.setIndex(new THREE.BufferAttribute(q.I, 1));
          g.computeBoundingSphere();
          g.userData.shared = true;
          tris[k] += q.I.length / 3;
          lods[k][name].push({ geo: g, slot, mat: (k === 0 ? mats.lod0 : mats.far)[slot] || (k === 0 ? mats.lod0 : mats.far).Metal });
        });
      }
    }
    for (const gs of Object.values(raw)) for (const list of gs.values()) for (const g of list) g.dispose();
    return { info, lods, mats, tris, ao: !!ao, loadMs: performance.now() - t0, lodDist: MOTO_LODS.map((l) => l.until),
      size: info.size, lamps: info.lamps, setPaint: (hex) => { for (const m of [mats.lod0.Paint, mats.far.Paint]) m.color.setHex(hex); } };
  })());
}

function toArrays(gs) {
  let nv = 0, ni = 0;
  for (const g of gs) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), hasU = gs.every((g) => g.attributes.uv1), U = hasU ? new Float32Array(nv * 2) : null, I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const g of gs) {
    const n = g.attributes.position.count;
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (U) U.set(g.attributes.uv1.array, v * 2);
    if (g.index) { const s = g.index.array; for (let k = 0; k < s.length; k++) I[i + k] = s[k] + v; i += s.length; }
    else { for (let k = 0; k < n; k++) I[i + k] = v + k; i += n; }
    v += n;
  }
  return { P, N, U, I };
}

function loadAO(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height, c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, W, H).data, r = new Uint8Array(W * H);
      for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
      const tex = new THREE.DataTexture(r, W, H, THREE.RedFormat, THREE.UnsignedByteType);
      Object.assign(tex, { flipY: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, colorSpace: THREE.NoColorSpace, anisotropy: 4 });
      tex.needsUpdate = true;
      const at = (u, v) => { const px = Math.min(W - 1, Math.max(0, Math.round(u * W - 0.5))), py = Math.min(H - 1, Math.max(0, Math.round(v * H - 0.5))); return r[py * W + px] / 255; };
      res({ tex, at });
    };
    img.onerror = () => rej(new Error(`AO map ${url}`));
    img.src = url;
  });
}

// ------------------------------------------------------------------------------------------------ materials
let MATS = null;
function materials(aoTex) {
  if (MATS) return MATS;
  const spec = {
    Paint: { phys: true, color: MOTO_PAINTS["racing red"], metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
    Frame: { color: 0x15171a, metalness: 0.6, roughness: 0.42 },
    Metal: { color: 0x9a9ea4, metalness: 1, roughness: 0.32 },
    Engine: { color: 0x1d1e21, metalness: 0.7, roughness: 0.48 },
    Chrome: { color: 0xd8d8da, metalness: 1, roughness: 0.14 },
    Anodized: { color: 0xc88a1c, metalness: 1, roughness: 0.3 },
    Rubber: { color: 0x101010, metalness: 0, roughness: 0.88 },
    Plastic: { color: 0x0e0e10, metalness: 0, roughness: 0.55 },
    Seat: { color: 0x121214, metalness: 0, roughness: 0.78 },
    Rim: { color: 0x121316, metalness: 0.75, roughness: 0.35 },
    Disc: { color: 0x8b8d90, metalness: 1, roughness: 0.38 },
    Glass: { color: 0x07090b, metalness: 0.2, roughness: 0.05 },
    HeadLight: { color: 0xc7ccd2, metalness: 0.9, roughness: 0.12, emissive: (m) => color(0xeef3ff).mul(motoLights.head.mul(7).add(0.6)) },   // (the LED DRL always on)
    TailLight: { color: 0x3a0405, metalness: 0, roughness: 0.2, emissive: (m) => color(0xff1408).mul(motoLights.tail.mul(1.4).add(motoLights.brake.mul(5))) },
    Plate: { color: 0xe8e8e4, metalness: 0, roughness: 0.5 },
    Suit: { color: 0x17181c, metalness: 0.05, roughness: 0.62 },
    Helmet: { phys: true, color: 0xe9e9e6, metalness: 0.1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 },
    Visor: { color: 0x050607, metalness: 0.4, roughness: 0.04 },
  };
  const make = (far) => {
    const out = {};
    for (const [name, s] of Object.entries(spec)) {
      const { phys, emissive, ...p } = s;
      const m = phys ? new THREE.MeshPhysicalNodeMaterial(p) : new THREE.MeshStandardNodeMaterial(p);
      m.name = `moto-${name}${far ? "-far" : ""}`;
      if (emissive) m.emissiveNode = emissive(m);
      // AO: LOD0 from the atlas (TEXCOORD_1), the far LODs per vertex
      if (far) m.aoNode = attribute("aoV", "float");
      else if (aoTex) m.aoNode = texture(aoTex, uv(1)).r;
      m.userData.shared = true;
      out[name] = m;
    }
    return out;
  };
  MATS = { lod0: make(false), far: make(true) };
  return MATS;
}

// ------------------------------------------------------------------------------------------------ the rig
const v3 = (a) => new THREE.Vector3().fromArray(a);
const ZAXIS = new THREE.Vector3(0, 0, 1);

/**
 * One rideable bike. moto.update(state, dt, ground) poses it; moto.setLod(k); moto.root (add to the scene);
 * moto.lampRoot (the frame the lamps in model.lamps are given in: night lights follow the lean and pitch).
 */
export function createMoto(model, { shadows = true } = {}) {
  const I = model.info, WB = I.wheelbase, half = WB / 2;
  const root = new THREE.Group(); root.name = "motorbike"; root.rotation.order = "YXZ";
  const lean = new THREE.Group(); root.add(lean);
  const pitchR = new THREE.Group(); pitchR.position.z = -half; lean.add(pitchR);
  const afterR = new THREE.Group(); afterR.position.z = half; pitchR.add(afterR);
  const pitchF = new THREE.Group(); pitchF.position.z = half; afterR.add(pitchF);
  const bike = new THREE.Group(); bike.position.z = -half; pitchF.add(bike);
  const sprung = new THREE.Group(); bike.add(sprung);
  const rider = new THREE.Group(); rider.name = "rider"; sprung.add(rider);
  // pivots
  const steer = new THREE.Group(); steer.position.fromArray(I.steer.pivot); sprung.add(steer);
  const axis = v3(I.steer.axis).normalize();
  const wheelF = new THREE.Group(); wheelF.position.copy(v3(I.wheels.F.pos)).sub(steer.position); steer.add(wheelF);
  const wheelR = new THREE.Group(); wheelR.position.fromArray(I.wheels.R.pos); bike.add(wheelR);
  const torso = new THREE.Group(); torso.position.fromArray(I.rider.hip); rider.add(torso);
  const legs = new THREE.Group(); rider.add(legs);
  const arms = { U_L: new THREE.Group(), U_R: new THREE.Group(), F_L: new THREE.Group(), F_R: new THREE.Group() };
  for (const g of Object.values(arms)) rider.add(g);
  const holders = { Body: sprung, Steer: steer, Wheel_F: wheelF, Wheel_R: wheelR, RiderLegs: legs, RiderTorso: torso, ArmU_L: arms.U_L, ArmU_R: arms.U_R, ArmF_L: arms.F_L, ArmF_R: arms.F_R };
  // one Mesh per node x slot, its geometry swapped per LOD (no new objects at a LOD change)
  const meshes = [];
  for (const [name, holder] of Object.entries(holders)) {
    for (const p of model.lods[0][name]) {
      const m = new THREE.Mesh(p.geo, p.mat);
      m.castShadow = shadows && p.slot !== "Glass" && p.slot !== "Visor"; m.receiveShadow = true;
      m.userData.node = name; m.userData.slot = p.slot;
      holder.add(m); meshes.push(m);
    }
  }
  let cur = 0;
  const setLod = (k) => {
    if (k === cur) return;
    cur = k;
    for (const m of meshes) {
      const p = model.lods[k][m.userData.node].find((q) => q.slot === m.userData.slot);
      if (p) { m.geometry = p.geo; m.material = p.mat; m.visible = true; } else m.visible = false;
    }
  };

  // IK scratch (rider frame = sprung's frame)
  const R = I.rider, hip = v3(R.hip);
  const shoulderRest = { L: v3(R.shoulder.L).sub(hip), R: v3(R.shoulder.R).sub(hip) };
  const gripRest = { L: v3(R.grip.L).sub(steer.position), R: v3(R.grip.R).sub(steer.position) };
  const S = new THREE.Vector3(), G = new THREE.Vector3(), D = new THREE.Vector3(), E = new THREE.Vector3(), P = new THREE.Vector3(), T = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const solveArm = (side, torsoQ) => {
    S.copy(shoulderRest[side]).applyQuaternion(torsoQ).add(torso.position);
    G.copy(gripRest[side]).applyQuaternion(steer.quaternion).add(steer.position);
    D.subVectors(G, S);
    const a = R.upper, b = R.fore, d = Math.min(D.length(), a + b - 1e-3), dl = D.length() || 1;
    D.multiplyScalar(1 / dl);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    // elbows out and down
    P.set(side === "L" ? R.elbowOut : -R.elbowOut, -1, -0.2);
    P.addScaledVector(D, -P.dot(D)).normalize();
    E.copy(S).addScaledVector(D, x).addScaledVector(P, h);
    const U = arms["U_" + side], F = arms["F_" + side];
    U.position.copy(S); U.quaternion.setFromUnitVectors(ZAXIS, T.subVectors(E, S).normalize());
    F.position.copy(E); F.quaternion.setFromUnitVectors(ZAXIS, T.subVectors(G, E).normalize());
  };

  // the crash: the rider as a tumbling body in world space
  const fall = { on: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), q: new THREE.Quaternion(), dq: new THREE.Quaternion(), t: 0 };
  const scratchM = new THREE.Matrix4(), scratchS = new THREE.Vector3(), eul = new THREE.Euler();
  const detach = (c) => {
    rider.updateMatrixWorld(true);
    rider.matrixWorld.decompose(fall.pos, fall.q, scratchS);
    fall.pos.copy(hip).applyMatrix4(rider.matrixWorld);          // the body tumbles about its hips
    root.parent?.attach(rider);
    const s = Math.sin(c.heading), k = Math.cos(c.heading), v = Math.max(3, c.speed);
    fall.vel.set(s * v * 0.9 + c.vx, 2.2 + Math.min(3, v * 0.06), k * v * 0.9 + c.vz);
    fall.spin.set(k * -v * 0.5 - c.crashDir * s * 2, c.crashDir * 1.5, s * v * 0.5 - c.crashDir * k * 2);   // tumbling forward and to the side
    fall.on = true; fall.t = 0;
  };
  const attach = () => { sprung.add(rider); rider.position.set(0, 0, 0); rider.quaternion.identity(); rider.scale.set(1, 1, 1); fall.on = false; };
  const stepFall = (dt, ground) => {
    fall.t += dt;
    fall.vel.y -= 9.81 * dt;
    fall.pos.addScaledVector(fall.vel, dt);
    const gy = ground(fall.pos.x, fall.pos.z) + 0.16;           // (the hips' height lying on the ground)
    if (fall.pos.y < gy) {                               // on the ground: bounce a little, slide, the tumble dies
      fall.pos.y = gy;
      if (fall.vel.y < 0) fall.vel.y *= -0.25;
      const f = Math.exp(-dt * 2.2); fall.vel.x *= f; fall.vel.z *= f;
      fall.spin.multiplyScalar(Math.exp(-dt * 3));
    }
    const w = fall.spin.length();
    if (w > 1e-4) { fall.dq.setFromAxisAngle(T.copy(fall.spin).multiplyScalar(1 / w), w * dt); fall.q.premultiply(fall.dq); }
    // the rider's origin is the bike's (on the ground): place it so the hips are at fall.pos
    rider.quaternion.copy(fall.q);
    rider.position.copy(hip).applyQuaternion(fall.q).negate().add(fall.pos);
  };

  let tuckS = 0;
  const update = (c, dt = 1 / 60, ground = null) => {
    root.position.set(c.x, c.y, c.z);
    root.rotation.set(-c.slopePitch, c.heading, 0);
    // lean about the contact line (lean > 0 = left: rotation about +z is negative), lifted so the tyres' crowns stay on
    lean.rotation.z = -c.lean;
    lean.position.y = leanLift(c.lean, c.crashed ? 0.06 : I.wheels.R.crown);
    // wheelie (front up) about the rear contact, stoppie about the front
    pitchR.rotation.x = c.wheelie > 0 ? -c.wheelie : 0;
    pitchF.rotation.x = c.wheelie < 0 ? -c.wheelie : 0;
    sprung.position.y = c.heave * 0.5;
    sprung.rotation.x = c.pitch * 0.6;
    steer.quaternion.setFromAxisAngle(axis, c.steerAngle);
    wheelF.rotation.x = c.frontSpin;
    wheelR.rotation.x = c.wheelSpin;
    // the rider: tuck at speed, hang off into the corner
    if (c.crashed && !fall.on) detach(c);
    if (!c.crashed && fall.on) attach();
    if (fall.on) { if (ground) stepFall(dt, ground); return; }
    tuckS += ((c.tuck || 0) - tuckS) * Math.min(1, dt * 4);
    torso.rotation.set(0.05 + tuckS * 0.26 + Math.max(0, c.wheelie) * 0.5, 0, -c.lean * 0.18);
    legs.position.x = -c.lean * 0.0; rider.position.x = c.lean * 0.035;     // (the hips shift into the turn)
    eul.set(torso.rotation.x, 0, torso.rotation.z); q.setFromEuler(eul);
    solveArm("L", q); solveArm("R", q);
  };
  update({ x: 0, y: 0, z: 0, heading: 0, slopePitch: 0, lean: 0, wheelie: 0, heave: 0, pitch: 0, steerAngle: 0, frontSpin: 0, wheelSpin: 0, tuck: 0 });
  return { root, lampRoot: bike, setLod, update, meshes, get lod() { return cur; }, get riderOff() { return fall.on; }, reattach: attach };
}
