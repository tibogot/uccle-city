// THE CAR MODEL (tools/blender/car.py -> models/car/hatchback.glb), shared by the Car Lab and drive mode.
// Loaded once: the body as one geometry per material, the four wheels (origin = wheel centre, so they spin and steer),
// and two more levels of detail made here by meshoptimizer (error budgets in metres, per material part, borders locked
// so the paint / glass seams stay closed). Materials are ours, by the glTF material names: clear-coated paint (colour
// per car), dark glass, black trim, head lights (lit at night) and tail lights (brighter when braking).
import * as THREE from "three/webgpu";
import { color, uniform } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export const CAR_LODS = [
  { error: 0, until: 30 },        // LOD0: the Blender model
  { error: 0.006, until: 90 },    // LOD1: 6 mm
  { error: 0.025, until: 400 },   // LOD2: 2.5 cm
];
export const PAINTS = { "metallic blue": 0x1d3f6e, "silver": 0x9ea4ab, "white": 0xe8e8e4, "black": 0x0d0e10, "red": 0x8a1414, "dark grey": 0x34383d, "green": 0x24483a };

let promise = null;
/** { lods: [{ body: [{ geo, mat }], wheels: { FL: geo, ... }, tris }], wheelPos: { FL: [x, y, z], ... }, mats } */
export function loadCarModel(url = new URL("../../models/car/hatchback.glb", import.meta.url).href) {
  return (promise ??= (async () => {
    const gltf = await new GLTFLoader().loadAsync(url);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const body = new Map(), wheels = {}, wheelPos = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let n = o; while (n && !/^(Body|Wheel_(FL|FR|RL|RR))$/.test(n.name)) n = n.parent;
      if (!n) return;
      const mname = o.material.name;
      if (n.name === "Body") {
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
        (body.get(mname) || body.set(mname, []).get(mname)).push(g);
      } else {
        const key = n.name.slice(6);                        // FL / FR / RL / RR
        n.updateMatrixWorld(true);
        wheelPos[key] = new THREE.Vector3().setFromMatrixPosition(n.matrixWorld).toArray();
        const inv = new THREE.Matrix4().copy(n.matrixWorld).invert();
        const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
        (wheels[key] ||= new Map());
        (wheels[key].get(mname) || wheels[key].set(mname, []).get(mname)).push(g);
      }
    });
    const mats = materials();
    const merged = (list) => list.length === 1 ? list[0] : mergeAll(list);
    const simplify = (g, error) => {
      if (!error) return g;
      const [idx] = MeshoptSimplifier.simplify(new Uint32Array(g.index.array), g.attributes.position.array, 3, 0, error, ["ErrorAbsolute", "LockBorder"]);
      const s = new THREE.BufferGeometry();
      s.setAttribute("position", g.attributes.position); s.setAttribute("normal", g.attributes.normal);
      s.setIndex(new THREE.BufferAttribute(idx, 1));
      return s;
    };
    const base = [...body].map(([m, gs]) => ({ name: m, geo: merged(gs) }));
    const wbase = Object.fromEntries(Object.entries(wheels).map(([k, mm]) => [k, [...mm].map(([m, gs]) => ({ name: m, geo: merged(gs) }))]));
    const lods = CAR_LODS.map(({ error }) => {
      const out = { body: base.map((p) => ({ geo: simplify(p.geo, error), mat: mats[p.name] || mats.Paint, name: p.name })), wheels: {} };
      for (const [k, parts] of Object.entries(wbase)) out.wheels[k] = parts.map((p) => ({ geo: simplify(p.geo, error * 0.6), mat: mats[p.name] || mats.Trim, name: p.name }));
      let tris = 0;
      for (const p of out.body) tris += p.geo.index.count / 3;
      for (const parts of Object.values(out.wheels)) for (const p of parts) tris += p.geo.index.count / 3;
      out.tris = tris;
      for (const p of [...out.body, ...Object.values(out.wheels).flat()]) { p.geo.computeBoundingSphere(); p.geo.userData.shared = true; }
      return out;
    });
    return { lods, wheelPos, mats };
  })());
}

function mergeAll(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, v * 3); nrm.set(g.attributes.normal.array, v * 3);
    const src = g.index.array;
    for (let k = 0; k < src.length; k++) idx[i + k] = src[k] + v;
    v += g.attributes.position.count; i += src.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

// light switches shared by every car: head lights (0 = off .. 1 = on), and the player car's brake / tail lights
export const carLights = { head: uniform(0), tail: uniform(0), brake: uniform(0) };

let MATS = null;
function materials() {
  if (MATS) return MATS;
  const Paint = new THREE.MeshPhysicalNodeMaterial({ color: PAINTS["metallic blue"], metalness: 0.55, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 });
  const Glass = new THREE.MeshStandardNodeMaterial({ color: 0x07090b, roughness: 0.04, metalness: 0.2 });
  const Trim = new THREE.MeshStandardNodeMaterial({ color: 0x0b0b0c, roughness: 0.62 });
  const HeadLight = new THREE.MeshStandardNodeMaterial({ color: 0xc9ced4, roughness: 0.12, metalness: 0.9 });
  HeadLight.emissiveNode = color(0xfff1dc).mul(carLights.head.mul(6));
  const TailLight = new THREE.MeshStandardNodeMaterial({ color: 0x4a0405, roughness: 0.2 });
  TailLight.emissiveNode = color(0xff1408).mul(carLights.tail.mul(1.2).add(carLights.brake.mul(5)));
  const Plate = new THREE.MeshStandardNodeMaterial({ color: 0xe9e9e4, roughness: 0.5 });
  const Tyre = new THREE.MeshStandardNodeMaterial({ color: 0x141414, roughness: 0.88 });
  const Rim = new THREE.MeshStandardNodeMaterial({ color: 0xb9bdc3, roughness: 0.3, metalness: 1 });
  const Brake = new THREE.MeshStandardNodeMaterial({ color: 0x4a4a4c, roughness: 0.45, metalness: 0.8 });
  MATS = { Paint, Glass, Trim, HeadLight, TailLight, Plate, Tyre, Rim, Brake };
  for (const m of Object.values(MATS)) m.userData.shared = true;
  return MATS;
}

/**
 * One drivable car: root (position, heading, ground slope) > chassis (the body on its springs) + four wheel pivots.
 * car.update(state) poses it from a carPhysics state; car.setLod(k).
 */
export function createCar(model, { lod = 0, shadows = true } = {}) {
  const root = new THREE.Group(); root.name = "car"; root.rotation.order = "YXZ";
  const chassis = new THREE.Group(); root.add(chassis);
  const wheels = {};
  for (const k of ["FL", "FR", "RL", "RR"]) {
    const pivot = new THREE.Group(); pivot.position.fromArray(model.wheelPos[k]);
    const spin = new THREE.Group(); pivot.add(spin);
    root.add(pivot);
    wheels[k] = { pivot, spin };
  }
  let cur = -1;
  const setLod = (k) => {
    if (k === cur) return;
    cur = k;
    chassis.clear();
    const L = model.lods[k];
    for (const p of L.body) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = shadows && p.name !== "Glass"; m.receiveShadow = true; chassis.add(m); }
    for (const [key, w] of Object.entries(wheels)) {
      w.spin.clear();
      for (const p of L.wheels[key]) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = shadows; w.spin.add(m); }
    }
  };
  setLod(lod);
  const update = (c) => {
    root.position.set(c.x, c.y, c.z);
    root.rotation.set(-c.slopePitch, c.heading, c.slopeRoll);
    chassis.position.y = c.heave;
    chassis.rotation.set(c.pitch, 0, c.roll);
    for (const [k, w] of Object.entries(wheels)) {
      w.spin.rotation.x = c.wheelSpin;
      if (k[0] === "F") w.pivot.rotation.y = c.steerAngle;
    }
  };
  return { root, chassis, wheels, setLod, update, get lod() { return cur; } };
}
