// Parked cars along the parking lanes of the road engine's cross-sections (ROAD_TYPES: a lane of
// type "parking"). PLACED PROCEDURALLY (no data source for parked cars): slots of 5.6 m, about
// 65 % occupied (deterministic hash), none within 12 m of a road end, 8 m of a crossing or 15 m of
// a bus stop; with ?roads=surface each one against the measured kerb (viewer/streetFit.js).
// DRAWN (default) as the faceted family (tools/blender/carFaceted.py, models/cars/faceted.glb): one global fleet for
// every loaded tile (viewer/carFleet.js: a realistic mix of types, per-instance Brussels paint, instanced per type per
// LOD, dithered LOD / distance fades). Each tile keeps an invisible InstancedMesh "parked-cars" of boxes sized to each
// car's type: the third-person colliders (viewer/character/cityHook.js) read it as before.
// ?cars=box: the old box cars (one InstancedMesh per tile, palette per car).
import * as THREE from "three/webgpu";
import { carFleet, assignTypes } from "./carFleet.js";
import { attribute, instancedBufferAttribute, mix, vec3, float } from "three/tsl";
import { carSites } from "./streets/parkPlace.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const PALETTE = [
  [0.02, 0.02, 0.022], [0.02, 0.02, 0.022], [0.18, 0.185, 0.19], [0.18, 0.185, 0.19], [0.32, 0.33, 0.34],
  [0.62, 0.62, 0.6], [0.62, 0.62, 0.6], [0.05, 0.08, 0.2], [0.3, 0.03, 0.02], [0.12, 0.1, 0.08], [0.05, 0.12, 0.08],
];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function part(g, col, body, x, y, z) {
  g.translate(x, y, z);
  g = g.toNonIndexed(); g.deleteAttribute("uv");
  const n = g.attributes.position.count, c = new Float32Array(n * 3), bb = new Float32Array(n);
  for (let i = 0; i < n; i++) { c.set(col, i * 3); bb[i] = body; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c, 3));
  g.setAttribute("aBody", new THREE.BufferAttribute(bb, 1));
  return g;
}
/** Box whose top face is pulled in (front / back along x, sides along z): a tapered car volume. */
function tapered(L, H, W, inF, inB, inS) {
  const g = new THREE.BoxGeometry(L, H, W, 1, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) > 0 ? p.getX(i) - inF : p.getX(i) + inB);
      p.setZ(i, p.getZ(i) > 0 ? p.getZ(i) - inS : p.getZ(i) + inS);
    }
  }
  g.computeVertexNormals();
  return g;
}
function carGeometry() {
  const glass = [0.03, 0.035, 0.04], tyre = [0.02, 0.02, 0.02], rim = [0.35, 0.35, 0.36];
  const parts = [
    part(tapered(4.25, 0.62, 1.78, 0.18, 0.1, 0.04), [1, 1, 1], 1, 0, 0.62, 0),          // lower body (+x = front)
    part(tapered(2.35, 0.5, 1.6, 0.55, 0.3, 0.12), glass, 0, -0.25, 1.18, 0),             // glasshouse
    part(tapered(1.55, 0.05, 1.32, 0.05, 0.05, 0.03), [1, 1, 1], 1, -0.33, 1.455, 0),     // roof
    part(new THREE.BoxGeometry(0.05, 0.12, 0.32), [0.9, 0.88, 0.8], 0, 2.12, 0.78, 0.55),   // head lights
    part(new THREE.BoxGeometry(0.05, 0.12, 0.32), [0.9, 0.88, 0.8], 0, 2.12, 0.78, -0.55),
    part(new THREE.BoxGeometry(0.05, 0.1, 0.3), [0.45, 0.02, 0.02], 0, -2.12, 0.82, 0.6),   // tail lights
    part(new THREE.BoxGeometry(0.05, 0.1, 0.3), [0.45, 0.02, 0.02], 0, -2.12, 0.82, -0.6),
    part(new THREE.BoxGeometry(0.12, 0.16, 1.6), [0.03, 0.03, 0.03], 0, 2.13, 0.45, 0),      // bumpers
    part(new THREE.BoxGeometry(0.12, 0.16, 1.6), [0.03, 0.03, 0.03], 0, -2.13, 0.45, 0),
  ];
  for (const [x, z] of [[1.35, 0.78], [1.35, -0.78], [-1.3, 0.78], [-1.3, -0.78]]) {
    parts.push(part(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14).rotateX(Math.PI / 2), tyre, 0, x, 0.32, z));
    parts.push(part(new THREE.CylinderGeometry(0.19, 0.19, 0.23, 10).rotateX(Math.PI / 2), rim, 0, x, 0.32, z));
  }
  return mergeGeometries(parts);
}

// WHEELS ON THE GROUND (citydefects 2026-11-16, owner playtest: "cars sunk into the road on slopes"). A parked car stood
// level at its centre's height: on Uccle's slopes (8-12 %) one axle was 20-30 cm in the road and the other in the air.
// Now its four wheels' contact points are sampled, the car pitched and rolled to their plane (front / rear, left / right
// means) and lifted until no wheel is under the ground. ?carfit=old: level, as before.
const CARFIT_OLD = typeof location !== "undefined" && /[?&]carfit=old/.test(location.search);
const MOVG_OLD = typeof location !== "undefined" && /[?&]movground=old/.test(location.search);
export const PARK_IN = 0.45;                                   // (rule mover-ground: the wheel's inner sample, x the half track)
function wheelFit(c, ground) {
  const [w, , l] = carFleet.sizeOf(c.type);
  const hb = l * 0.31, ht = Math.max(0.6, w / 2 - 0.12);           // half wheelbase, half track (m)
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading), rx = fz, rz = -fx;   // bonnet (+z model) and its side
  // (claude/ground, rule mover-ground) a wheel's contact: the lower of the ground under it and 0.45 x the half track in
  // from it: the 1 m drive grid blends the kerb into the gutter, the kerb-side wheels stood 5-10 cm up in the air;
  // ?movground=old: under the wheel only
  const at0 = (a, b) => ground(c.x + fx * a + rx * b, c.z + fz * a + rz * b);
  const at = MOVG_OLD ? at0 : (a, b) => Math.min(at0(a, b), at0(a, b * PARK_IN));
  const fl = at(hb, ht), fr = at(hb, -ht), bl = at(-hb, ht), br = at(-hb, -ht);
  const front = (fl + fr) / 2, back = (bl + br) / 2, left = (fl + bl) / 2, right = (fr + br) / 2;
  c.pitch = -Math.atan2(front - back, 2 * hb);                     // nose up: a negative turn about the car's X
  c.roll = Math.atan2(left - right, 2 * ht);
  // the plane through the means, then up by the worst wheel still under it (a twisted patch of road)
  const mid = (front + back) / 2, sp = (front - back) / (2 * hb), sr = (left - right) / (2 * ht);
  let lift = 0;
  for (const [a, b, g] of [[hb, ht, fl], [hb, -ht, fr], [-hb, ht, bl], [-hb, -ht, br]]) lift = Math.max(lift, g - (mid + sp * a + sr * b));
  c.y = mid + lift + 0.005;
}

/** The old box cars (?cars=box): one InstancedMesh per tile. */
function buildBoxCars(sites, ground) {
  const group = new THREE.Group();
  group.name = "parked-cars";
  if (!sites.length) return { group, count: 0 };
  const geo = carGeometry();
  const paint = new Float32Array(sites.length * 3);
  sites.forEach((s, i) => paint.set(PALETTE[s.c], i * 3));
  const iPaint = new THREE.InstancedBufferAttribute(paint, 3);
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.35, metalness: 0.4 });
  const body = attribute("aBody", "float");
  mat.colorNode = mix(attribute("aCol", "vec3"), instancedBufferAttribute(iPaint), body);
  mat.roughnessNode = mix(float(0.15), float(0.3), body);
  mat.metalnessNode = mix(float(0.1), float(0.55), body);
  const m = new THREE.InstancedMesh(geo, mat, sites.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  sites.forEach((s, i) => {
    q.setFromAxisAngle(up, s.yaw);                        // local +x (the bonnet) along the traffic direction
    M.compose(new THREE.Vector3(s.x, ground(s.x, s.z) + 0.005, s.z), q, one);
    m.setMatrixAt(i, M);
  });
  m.castShadow = m.receiveShadow = true;
  m.computeBoundingSphere();
  m.name = "parked-cars";
  group.add(m);
  return { group, count: sites.length };
}

const CARS_MODE = new URLSearchParams(location.search).get("cars");
/** One tile's parked cars: { group, count }. The group holds the collider boxes; the fleet draws the cars. */
export function buildCars(roads, feats, ground, bounds, { place = null, twoWheel = null, filter = null } = {}) {
  let sites = carSites(roads, feats, bounds, place, PALETTE.length);
  if (filter) sites = filter(sites);                 // (main.js: off the traffic lanes, the street left open: streets/parkPlace.js parkingClear)
  // (motorbike round 2: some slots go to parked motorbikes / scooters, viewer/moto/cityTwoWheelers.js: twoWheel(sites)
  // -> the indices it takes; their sites come back in twoSites)
  let twoSites = [];
  if (twoWheel && sites.length) { const take = twoWheel(sites); if (take?.size) { twoSites = sites.filter((s, i) => take.has(i)); sites = sites.filter((s, i) => !take.has(i)); } }
  if (CARS_MODE === "box") return { ...buildBoxCars(sites, ground), twoSites };
  const group = new THREE.Group();
  group.name = "parked-cars-tile";
  if (!sites.length) return { group, count: 0, twoSites };
  // slot length: the distance to the nearest parked neighbour on the same kerb, ahead or behind (9 m when none)
  const room = sites.map((s, i) => {
    const ax = Math.cos(s.yaw), az = -Math.sin(s.yaw);      // along the car (box cars: local +x = the bonnet)
    let r = 9;
    for (let j = 0; j < sites.length; j++) {
      if (j === i) continue;
      const dx = sites[j].x - s.x, dz = sites[j].z - s.z, along = Math.abs(dx * ax + dz * az), across = Math.abs(dx * az - dz * ax);
      if (across < 1.6 && along < r) r = along;
    }
    return r;
  });
  const types = assignTypes(room, sites.map((s) => hash(s.x * 0.113, s.z * 0.071)));
  const cars = sites.map((s, i) => ({
    x: s.x, y: ground(s.x, s.z) + 0.005, z: s.z,
    heading: s.yaw + Math.PI / 2,                      // the model's +z (its bonnet) along the box car's +x
    type: types[i], pv: hash(s.z * 0.31, s.x * 0.97), room: room[i],
  }));
  if (!CARFIT_OLD) for (const c of cars) wheelFit(c, ground);
  // collider boxes: a unit box (x, z in -0.5..0.5, y 0..1) scaled per car to its type's size, oriented like the car
  const col = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicNodeMaterial(), cars.length);
  col.name = "parked-cars";
  col.visible = false;                                 // never drawn: the fleet draws the cars
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  cars.forEach((c, i) => {
    const [w, h, l] = carFleet.sizeOf(c.type);
    M.compose(v.set(c.x, c.y, c.z), q.setFromAxisAngle(up, c.heading), sc.set(w, h, l));
    col.setMatrixAt(i, M);
  });
  col.computeBoundingSphere();
  // the car objects in instance order: every collider made from this mesh keeps a reference to its car, so it is off
  // while the car is not drawn (pulled out into the traffic) and takes the car's size when another type parks there
  // (docs/collisions/ROAD_FIX3.md item 1)
  col.userData.cars = cars;
  group.add(col);
  carFleet.add(group, cars);
  if (CARS_MODE === "ab") {                            // A/B timing: the box cars too, switched live (window.__cars.mode)
    const b = buildBoxCars(sites, ground).group;
    b.traverse((o) => { if (o.isInstancedMesh) { o.name = "parked-cars-box"; boxMeshes.add(o); o.visible = abMode === "box"; } });
    group.add(b);
  }
  return { group, count: cars.length, twoSites };
}
const boxMeshes = new Set();
let abMode = "faceted";
if (CARS_MODE === "ab") globalThis.__cars = {
  fleet: carFleet,
  /** "faceted" | "box" | "none" */
  mode(m) {
    abMode = m;
    carFleet.group.visible = m === "faceted";
    for (const o of boxMeshes) o.visible = m === "box";
    return m;
  },
};
globalThis.__carFleet = carFleet;
