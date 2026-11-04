// THE CAR LAB: the Blender hatchback (models/car/hatchback.glb via viewer/drive/carModel.js) and the driving model
// drive mode uses (viewer/drive/carPhysics.js, colliders.js, carEnv.js, chaseCamera.js: the very same code), on a test
// ground: a concave building with an open courtyard, a building with an enclosed courtyard (a hole), a narrow alley,
// an angled block, a kerb island and a median, a row of bollards, trunks and lamp posts, a sidewalk kerb to climb,
// a 15 % ramp with a plateau and a banked side slope.
//   W / S (↑ ↓) throttle, brake, reverse   A / D (← →) steer   Space handbrake   R reset   C camera   G colliders
import * as THREE from "three/webgpu";
import { color, positionWorld, floor, mod, mix, float, abs, fract, smoothstep, min } from "three/tsl";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel } from "../viewer/panelUI.js";
import { loadCarModel, createCar, CAR_LODS, PAINTS, carLights } from "../viewer/drive/carModel.js";
import { HANDLING, BODY, createCarState, stepCar } from "../viewer/drive/carPhysics.js";
import { buildColliders, KIND } from "../viewer/drive/colliders.js";
import { createCarEnv } from "../viewer/drive/carEnv.js";
import { ChaseCamera, CAMERA } from "../viewer/drive/chaseCamera.js";
import { ColliderDebug } from "../viewer/drive/debugDraw.js";
import { DriveKeys } from "../viewer/drive/input.js";

const $info = document.getElementById("info"), $speedo = document.getElementById("speedo");
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb3c8);
scene.fog = new THREE.Fog(0x9fb3c8, 120, 420);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1500);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;
const sun = new THREE.DirectionalLight(0xfff4e6, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
scene.add(sun, sun.target);

// ---------------------------------------------------------------- the test ground (one height function for mesh + car)
const SIZE = 260;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const KERB = { x0: -70, x1: 10, z0: 16, z1: 21, h: 0.15 };        // a sidewalk strip with a 15 cm kerb
function terrain(x, z) {
  // ramp along +x: 15 % up to a 6 m plateau, 30 % down; tapered sides (embankments)
  let r = 0;
  if (x > 30 && x < 112) r = x < 70 ? (x - 30) * 0.15 : x < 92 ? 6 : Math.max(0, 6 - (x - 92) * 0.3);
  r *= smooth(-48, -42, z) * (1 - smooth(-12, -6, z));
  // a banked side slope (12 % across) south of the ramp
  const bank = (z > -110 && z < -60 && x > 20 && x < 110) ? Math.max(0, (-60 - z) * 0.12) * smooth(20, 30, x) * (1 - smooth(100, 110, x)) : 0;
  return r + Math.min(bank, 6);
}
const kerbAt = (x, z) => (x > KERB.x0 && x < KERB.x1 && z > KERB.z0 && z < KERB.z1 ? KERB.h : 0);
const ground = (x, z) => terrain(x, z) + kerbAt(x, z);

const groundMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.92 });
{ // asphalt grey with a 10 m grid and 2 m squares (world-space floor, no hashing)
  const p = positionWorld.xz;
  const cell = mod(floor(p.x.div(2)).add(floor(p.y.div(2))), 2);
  const g = fract(p.div(10)), line = smoothstep(0.0, 0.012, min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))));
  groundMat.colorNode = mix(color(0xe6e2d8), mix(color(0x3b3e43), color(0x45484d), cell), line);
}
{
  const N = SIZE, geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrain(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, groundMat); m.receiveShadow = true; scene.add(m);
}
const concrete = new THREE.MeshStandardNodeMaterial({ color: 0xb9b6ae, roughness: 0.85 });
const wallMat = new THREE.MeshStandardNodeMaterial({ color: 0xc9b9a0, roughness: 0.8 });
{ const k = new THREE.Mesh(new THREE.BoxGeometry(KERB.x1 - KERB.x0, KERB.h, KERB.z1 - KERB.z0), concrete);
  k.position.set((KERB.x0 + KERB.x1) / 2, KERB.h / 2, (KERB.z0 + KERB.z1) / 2); k.receiveShadow = k.castShadow = true; scene.add(k); }

// ---------------------------------------------------------------- colliders: footprints, islands, posts
const polys = [], circles = [];
function building(rings, h = 8, mat = wallMat) {
  polys.push({ rings, kind: KIND.building, top: h });
  const shape = new THREE.Shape(rings[0].map(([x, z]) => new THREE.Vector2(x, z)));
  for (const hole of rings.slice(1)) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, z))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, h, 0);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; scene.add(m);
}
function island(ring, h = 0.18) {
  polys.push({ rings: [ring], kind: KIND.island });
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, h, 0);
  const m = new THREE.Mesh(geo, concrete); m.castShadow = m.receiveShadow = true; scene.add(m);
}
const postGeo = new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0);
const postMats = { [KIND.post]: new THREE.MeshStandardNodeMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.4 }),
  [KIND.tree]: new THREE.MeshStandardNodeMaterial({ color: 0x5a4636, roughness: 0.95 }), [KIND.lamp]: new THREE.MeshStandardNodeMaterial({ color: 0x1d3a2c, roughness: 0.42, metalness: 0.35 }) };
function post(x, z, r, kind, h) {
  circles.push({ x, z, r, kind });
  const m = new THREE.Mesh(postGeo, postMats[kind]); m.scale.set(r, h, r); m.position.set(x, ground(x, z), z); m.castShadow = true; scene.add(m);
}
// a U-shaped block, its courtyard open to the north (-z): concave corners
building([[[-60, 70], [-50, 70], [-50, 40], [-30, 40], [-30, 70], [-20, 70], [-20, 30], [-60, 30]]]);
// a block round an enclosed courtyard (a hole): "start in the courtyard" in the panel
building([[[20, 30], [55, 30], [55, 65], [20, 65]], [[28, 38], [28, 57], [47, 57], [47, 38]]], 10, new THREE.MeshStandardNodeMaterial({ color: 0x9a6b52, roughness: 0.8 }));
// a narrow alley: two blocks 3.0 m apart (the car is 1.8 m wide)
building([[[-15, 30], [-1.5, 30], [-1.5, 60], [-15, 60]]], 7);
building([[[1.5, 30], [14, 30], [14, 60], [1.5, 60]]], 7);
// an angled block and an octagonal tower
{ const a = 0.5, c = Math.cos(a), s = Math.sin(a), pts = [[-6, -10], [6, -10], [6, 10], [-6, 10]].map(([u, v]) => [-70 + u * c - v * s, -20 + u * s + v * c]); building([pts], 12); }
building([Array.from({ length: 8 }, (_, k) => [-40 + 7 * Math.cos(k / 8 * Math.PI * 2), -60 + 7 * Math.sin(k / 8 * Math.PI * 2)])], 16);
// kerb islands: a splitter teardrop and a long median
island([[0, -52], [2.2, -58], [1.4, -66], [0, -70], [-1.4, -66], [-2.2, -58]]);
island([[-1, -100], [1, -100], [1, -140], [-1, -140]]);
// bollards (2.4 m gaps: the car fits through, just), lamp posts and trees along the sidewalk
for (let x = -10; x <= 10; x += 2.6) post(x, 4, 0.1, KIND.post, 0.9);
for (let x = -64; x <= 6; x += 14) post(x, 19.5, 0.13, KIND.lamp, 5.5);
for (let x = -57; x <= 6; x += 14) post(x, 18.7, 0.32, KIND.tree, 3.2);
post(-25, -10, 0.45, KIND.tree, 3.5);
const COL = buildColliders(polys, circles, { x0: -SIZE / 2, x1: SIZE / 2, z0: -SIZE / 2, z1: SIZE / 2 });

// ---------------------------------------------------------------- the car
const model = await loadCarModel();
const car = createCar(model);
scene.add(car.root);
const START = { x: 0, z: -20, h: Math.PI };                       // facing -z (north on the city's axes)
const SPOTS = { start: START, "enclosed courtyard": { x: 37.5, z: 47.5, h: 0 }, "foot of the ramp": { x: 15, z: -27, h: Math.PI / 2 }, "the alley": { x: 0, z: 20, h: 0 } };
let state = createCarState(START.x, START.z, START.h);
const env = createCarEnv({ sets: () => [COL], ground, handling: HANDLING });
const chase = new ChaseCamera(camera, renderer.domElement);
chase.active = true;
const debug = new ColliderDebug(scene);
const reset = (s = START) => { state = createCarState(s.x, s.z, s.h); state.y = ground(s.x, s.z); chase.reset(); };
const keys = new DriveKeys({ onKey: (k) => {
  if (k === "KeyR") reset(); else if (k === "KeyC") { chase.next(); camCtl?.updateDisplay(); } else if (k === "KeyG") { debug.visible = !debug.visible; dbgCtl?.updateDisplay(); }
} });
reset();

// ---------------------------------------------------------------- panel
const P = { paint: "metallic blue", lod: "auto", colliders: false, wireframe: false, night: false, spot: "start",
  speed: "", contacts: "", frame: "", tris: "" };
const ui = new Panel({ title: "Car Lab" });
const fh = ui.addFolder("Handling");
fh.add(HANDLING, "grip", 3, 20, 0.1).name("tyre grip (m/s²)");
fh.add(HANDLING, "power", 1, 12, 0.1).name("power (m/s²)");
fh.add(HANDLING, "topSpeed", 10, 70, 1).name("top speed (m/s)");
fh.add(HANDLING, "brake", 2, 15, 0.1).name("brakes (m/s²)");
fh.add(HANDLING, "cornering", 3, 20, 0.1).name("steering pull (m/s²)");
fh.add(HANDLING, "maxSteer", 0.2, 0.9, 0.01).name("full lock (rad)");
fh.add(HANDLING, "steerRate", 2, 25, 0.5).name("steering speed");
fh.add(HANDLING, "handbrakeGrip", 0, 1, 0.01).name("handbrake rear grip");
fh.add(HANDLING, "drag", 0, 0.004, 0.0001).name("air drag");
fh.add(HANDLING, "bounce", 0, 0.8, 0.01).name("wall bounce");
const fs = ui.addFolder("Suspension");
fs.add(HANDLING, "springK", 10, 200, 1).name("spring");
fs.add(HANDLING, "damping", 1, 30, 0.1).name("damping");
fs.add(HANDLING, "pitchGain", 0, 0.08, 0.001).name("pitch (squat / dive)");
fs.add(HANDLING, "rollGain", 0, 0.04, 0.001).name("body roll");
const fc = ui.addFolder("Camera");
const camCtl = fc.add(CAMERA, "mode", ["chase", "far", "bumper", "orbit"]).onChange(() => chase.reset());
fc.add(CAMERA, "distance", 3.5, 20, 0.1).name("distance");
fc.add(CAMERA, "height", 0.8, 8, 0.1).name("height");
fc.add(CAMERA, "fov", 35, 90, 1).name("field of view");
fc.add(CAMERA, "stiffness", 2, 20, 0.5).name("stiffness");
const fv = ui.addFolder("Car");
fv.add(P, "paint", Object.keys(PAINTS)).onChange((v) => model.mats.Paint.color.setHex(PAINTS[v]));
fv.add(P, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("level of detail");
fv.add(P, "tris").name("triangles").listen();
fv.add(P, "night").onChange(applyNight);
fv.add(P, "wireframe").onChange((v) => { for (const m of Object.values(model.mats)) m.wireframe = v; });
const fd = ui.addFolder("Test & debug");
const dbgCtl = fd.add(P, "colliders").name("draw colliders (G)").onChange((v) => { debug.visible = v; });
fd.add(P, "spot", Object.keys(SPOTS)).name("put the car at").onChange((v) => reset(SPOTS[v]));
fd.add({ f: () => reset(SPOTS[P.spot]) }, "f").name("reset (R)");
fd.add(P, "speed").listen();
fd.add(P, "contacts").name("colliders near / hits").listen();
fd.add(P, "frame").name("frame / physics ms").listen();
Object.defineProperty(P, "colliders", { get: () => debug.visible, set: (v) => { debug.visible = v; } });

function applyNight() {
  sun.intensity = P.night ? 0.04 : 2.6;
  scene.environmentIntensity = P.night ? 0.05 : 0.8;
  scene.background.set(P.night ? 0x0b1222 : 0x9fb3c8); scene.fog.color.copy(scene.background);
  carLights.head.value = P.night ? 1 : 0; carLights.tail.value = P.night ? 1 : 0;
  headL.visible = P.night;
}
const headL = new THREE.SpotLight(0xfff1dc, 120, 60, 0.5, 0.5, 1.5);
headL.position.set(0, 0.7, 2.0); headL.target.position.set(0, 0, 14); car.chassis.add(headL, headL.target); headL.visible = false;

$info.textContent = model.lods.map((l, k) => `LOD${k}: ${Math.round(l.tris)} triangles${k ? `, meshoptimizer ${(CAR_LODS[k].error * 1000).toFixed(0)} mm` : ", the Blender model"}, up to ${CAR_LODS[k].until} m`).join("\n") +
  `\nW/S ↑↓ throttle · brake · reverse   A/D ←→ steer   Space handbrake   R reset   C camera   G colliders\nsource tools/blender/car.py · viewer/drive/ (the city uses the same code)`;

// ---------------------------------------------------------------- loop
let last = performance.now(), fpsT = 0, fpsN = 0, phys = 0;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t0 = performance.now();
  stepCar(state, keys.read(), dt, env, HANDLING);
  phys = phys * 0.95 + (performance.now() - t0) * 0.05;
  carLights.brake.value = state.braking ? 1 : 0;
  const dist = camera.position.distanceTo(car.root.position);
  car.setLod(P.lod === "auto" ? Math.max(0, CAR_LODS.findIndex((l) => dist < l.until)) : +P.lod.slice(3));
  car.update(state);
  chase.update(state, dt, ground);
  sun.position.set(state.x + 30, state.y + 60, state.z + 25); sun.target.position.set(state.x, state.y, state.z);
  debug.update(() => [COL], ground, state, env.contacts > 0);
  renderer.render(scene, camera);
  const kmh = Math.abs(state.speed) * 3.6;
  $speedo.innerHTML = `${kmh.toFixed(0)} <small>km/h${state.speed < -0.2 ? " R" : ""}</small>`;
  fpsN++; fpsT += dt;
  if (fpsT > 0.5) {
    P.speed = `${kmh.toFixed(1)} km/h, slip ${Math.hypot(state.vx, state.vz).toFixed(2)} m/s, slope ${(Math.tan(state.slopePitch) * 100).toFixed(0)} %`;
    P.contacts = `${env.tested} near / ${state.hits} hits${state.lastHit ? `, last ${state.lastHit.speed.toFixed(1)} m/s` : ""}`;
    P.frame = `${(fpsT / fpsN * 1000).toFixed(1)} ms / ${phys.toFixed(3)} ms`;
    P.tris = `LOD${car.lod}: ${Math.round(model.lods[car.lod].tris)}`;
    fpsT = 0; fpsN = 0;
  }
});
window.lab = { state: () => state, env, reset, keys, HANDLING, COL, car, model };
