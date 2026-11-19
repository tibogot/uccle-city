// THE MOTO LAB: the city's motorbike (viewer/moto/: model, physics, camera, sound: the very same code as ?view=moto) on a
// test ground: a 10 % ramp, a kerb, two lanes of parked cars 1.3 m apart (filtering), a wall to crash into, a slalom.
//   W gas  S front brake  Space rear brake  A / D lean  Shift full gas (wheelie)  R reset  C camera  N mute
// ?pose=1 (or the panel's "pose"): the physics frozen, lean / steer / wheelie / tuck from sliders (model checks, stills).
import * as THREE from "three/webgpu";
import { color, positionWorld, floor, mod, mix, float, fract, smoothstep, min } from "three/tsl";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel } from "../viewer/panelUI.js";
import { loadMotoModel, createMoto, motoLights, MOTO_PAINTS } from "../viewer/moto/motoModel.js";
import { TWO_WHEELERS, MOTO_BODY, createMotoState, stepMoto, motoHit, twoWheelEnv } from "../viewer/moto/motoPhysics.js";
// the city's motorbike handling (the feel round, docs/MOTO_FEEL.md; ?moto=old = before)
const MOTO = TWO_WHEELERS.moto;
import { MotoCamera, MOTO_CAMERA } from "../viewer/moto/motoCamera.js";
import { MotoAudio } from "../viewer/moto/motoAudio.js";
import { buildColliders, KIND } from "../viewer/drive/colliders.js";
import { createCarEnv } from "../viewer/drive/carEnv.js";
import { DriveKeys } from "../viewer/drive/input.js";

const qs = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $speedo = document.getElementById("speedo");
const renderer = new THREE.WebGPURenderer({ antialias: true, reversedDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb3c8);
scene.fog = new THREE.Fog(0x9fb3c8, 120, 420);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 1500);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;
const sun = new THREE.DirectionalLight(0xfff4e6, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 });
scene.add(sun, sun.target);

// ---------------------------------------------------------------- ground
const SIZE = 300;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const KERB = { x0: -40, x1: 40, z0: 14, z1: 18, h: 0.14 };
const terrain = (x, z) => {   // a 10 % ramp along +x to a 5 m plateau
  let r = 0;
  if (x > 40 && x < 140) r = x < 90 ? (x - 40) * 0.1 : x < 110 ? 5 : Math.max(0, 5 - (x - 110) * 0.17);
  return r * smooth(-40, -34, z) * (1 - smooth(-10, -4, z));
};
const kerbAt = (x, z) => (x > KERB.x0 && x < KERB.x1 && z > KERB.z0 && z < KERB.z1 ? KERB.h : 0);
const ground = (x, z) => terrain(x, z) + kerbAt(x, z);
const gm = new THREE.MeshStandardNodeMaterial({ roughness: 0.92 });
{ const p = positionWorld.xz, cell = mod(floor(p.x.div(2)).add(floor(p.y.div(2))), 2);
  const g = fract(p.div(10)), line = smoothstep(0.0, 0.012, min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))));
  gm.colorNode = mix(color(0xe6e2d8), mix(color(0x3b3e43), color(0x45484d), cell), line); }
{ const geo = new THREE.PlaneGeometry(SIZE, SIZE, SIZE, SIZE).rotateX(-Math.PI / 2), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrain(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, gm); m.receiveShadow = true; scene.add(m); }
const concrete = new THREE.MeshStandardNodeMaterial({ color: 0xb9b6ae, roughness: 0.85 });
{ const k = new THREE.Mesh(new THREE.BoxGeometry(KERB.x1 - KERB.x0, KERB.h, KERB.z1 - KERB.z0), concrete);
  k.position.set(0, KERB.h / 2, (KERB.z0 + KERB.z1) / 2); k.receiveShadow = k.castShadow = true; scene.add(k); }

// colliders: parked cars (two lanes, 1.3 m gap), a wall, a slalom of posts
const polys = [], circles = [];
const carMat = new THREE.MeshStandardNodeMaterial({ color: 0x5b6670, roughness: 0.5, metalness: 0.3 });
const box = (cx, cz, w, l, h, kind, mat) => {
  polys.push({ rings: [[[cx - w / 2, cz - l / 2], [cx + w / 2, cz - l / 2], [cx + w / 2, cz + l / 2], [cx - w / 2, cz + l / 2]]], kind, top: h });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat); m.position.set(cx, h / 2, cz); m.castShadow = m.receiveShadow = true; scene.add(m);
};
for (let k = 0; k < 6; k++) { box(-1.55, -30 - k * 6, 1.8, 4.3, 1.45, KIND.car, carMat); box(1.55, -30 - k * 6, 1.8, 4.3, 1.45, KIND.car, carMat); }
box(-30, -60, 30, 0.6, 2.5, KIND.building, concrete);
const postMat = new THREE.MeshStandardNodeMaterial({ color: 0xe8452c, roughness: 0.6 });
for (let k = 0; k < 8; k++) { const x = -20 + (k % 2) * 3, z = 40 + k * 9; circles.push({ x, z, r: 0.12, kind: KIND.post });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 12), postMat); m.position.set(x, 0.5, z); m.castShadow = true; scene.add(m); }
const COL = buildColliders(polys, circles, { x0: -SIZE / 2, x1: SIZE / 2, z0: -SIZE / 2, z1: SIZE / 2 });

// ---------------------------------------------------------------- the bike
const t0 = performance.now();
const model = await loadMotoModel();
const moto = createMoto(model);
scene.add(moto.root);
const START = { x: 0, z: -10, h: Math.PI };
let state;
const env = createCarEnv({ sets: () => [COL], ground, handling: MOTO, dims: MOTO_BODY, onHit: motoHit, ...twoWheelEnv(MOTO) });
const chase = new MotoCamera(camera, renderer.domElement); chase.active = true;
const audio = new MotoAudio(); audio.active = true;
const reset = () => { state = createMotoState(START.x, START.z, START.h); state.y = ground(START.x, START.z); chase.reset(); moto.reattach(); };
const keys = new DriveKeys({ onKey: (k) => { if (k === "KeyR") reset(); else if (k === "KeyC") chase.next(); else if (k === "KeyN") audio.toggleMute(); } });
reset();

// ---------------------------------------------------------------- panel
const P = { pose: qs.get("pose") === "1", lean: 0, steer: 0, wheelie: 0, tuck: 0, lod: "auto", paint: "racing red", night: false, wire: false, spin: true, info: "" };
const ui = new Panel({ title: "Moto Lab" });
const fp = ui.addFolder("Pose (physics frozen)");
fp.add(P, "pose").name("pose mode");
fp.add(P, "lean", -50, 50, 1).name("lean (deg, + left)");
fp.add(P, "steer", -35, 35, 1).name("steer (deg)");
fp.add(P, "wheelie", -20, 40, 1).name("wheelie / stoppie (deg)");
fp.add(P, "tuck", 0, 1, 0.05).name("tuck");
const fl = ui.addFolder("Look");
fl.add(P, "lod", ["auto", "0", "1", "2"]).name("LOD");
fl.add(P, "paint", Object.keys(MOTO_PAINTS)).name("paint").onChange((v) => model.setPaint(MOTO_PAINTS[v]));
fl.add(P, "night").name("night lamps");
fl.add(P, "wire").name("wireframe").onChange((v) => { for (const m of moto.meshes) m.material.wireframe = v; });
const fh = ui.addFolder("Handling");
fh.add(MOTO, "power", 4, 16, 0.5); fh.add(MOTO, "maxLean", 0.4, 0.9, 0.01).name("max lean (rad)"); fh.add(MOTO, "leanRate", 1, 12, 0.5);
fh.add(MOTO, "brakeFront", 4, 14, 0.5); fh.add(MOTO, "grip", 6, 16, 0.5); fh.add(MOTO.feel || MOTO, "crashSpeed", 3, 20, 0.5);
fh.add(MOTO_CAMERA, "tilt", 0, 1, 0.02).name("camera roll"); fh.add(MOTO_CAMERA, "fovKick", 0, 30, 1).name("FOV kick");
ui.addFolder("Info").add(P, "info").listen();
window.__moto = { model, moto, get state() { return state; }, P, chase, audio, MOTO, MOTO_CAMERA };

// ---------------------------------------------------------------- loop
let last = performance.now(), frames = 0, msAvg = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  const c = state, a = performance.now();
  if (P.pose) {
    Object.assign(c, { lean: P.lean * Math.PI / 180, steerAngle: P.steer * Math.PI / 180, wheelie: P.wheelie * Math.PI / 180, tuck: P.tuck, speed: 0, vx: 0, vz: 0 });
    c.y = ground(c.x, c.z);
    if (P.spin) { c.frontSpin += dt * 2; c.wheelSpin += dt * 2; }
  } else stepMoto(c, keys.readMoto(), dt, env, MOTO);
  motoLights.head.value = motoLights.tail.value = P.night ? 1 : 0; motoLights.brake.value = c.braking ? 1 : 0;
  moto.update(c, dt, ground);
  const d = camera.position.distanceTo(moto.root.position);
  moto.setLod(P.lod === "auto" ? (d < model.lodDist[0] ? 0 : d < model.lodDist[1] ? 1 : 2) : +P.lod);
  chase.update(c, dt, ground, null, () => [c.x + Math.sin(c.lean) * 1.5 * Math.cos(c.heading), c.y + 1.5 * Math.cos(c.lean), c.z - Math.sin(c.lean) * 1.5 * Math.sin(c.heading)]);
  audio.update(c, dt);
  msAvg = msAvg * 0.95 + (performance.now() - a) * 0.05;
  sun.position.set(c.x + 12, c.y + 22, c.z + 8); sun.target.position.set(c.x, c.y, c.z);
  renderer.render(scene, camera);
  if (++frames % 6 === 0) {
    $speedo.innerHTML = `${(Math.abs(c.speed) * 3.6).toFixed(0)} <small>km/h · gear ${c.gear} · ${Math.round(c.rpm)} rpm${c.crashed ? " · CRASH" : ""}</small>`;
    P.info = `lean ${(c.lean * 57.3).toFixed(0)}° wheelie ${(c.wheelie * 57.3).toFixed(0)}° LOD${moto.lod} · cpu ${msAvg.toFixed(3)} ms`;
    $info.textContent = `tris LOD0/1/2: ${model.tris.join(" / ")} · load ${model.loadMs.toFixed(0)} ms (page ${(performance.now() - t0).toFixed(0)}) · AO ${model.ao ? "baked" : "none"}\n` +
      `W gas · S front brake · Space rear brake · A/D lean · Shift full gas (wheelie) · R reset · C camera · N mute`;
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
