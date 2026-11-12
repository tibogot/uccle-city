// THE NIGHT LIGHTS LAB: many real lights at night, cheaply (docs/NIGHT_LIGHTS.md; research docs/NIGHT_LIGHTS_RESEARCH.md).
// A test street (viewer/nightLights/nightStreet.js: houses with lit windows and front gardens, shops with lit signs,
// the city's Brussels lamp, street trees, parked cars, two lanes of traffic with headlights and rear lights, a STIB
// T3000 on a centre track) under the city's own night (viewer/lighting.js, Firmament) and post chain (viewer/post.js:
// AO, SSR, bloom), lit by viewer/nightLights/: a clustered forward lighting whose lights live in a fixed pool
// (nightLighting.js), filled each frame with the nearest sources and faded in / out (lightSelect.js, nightSources.js),
// with light profiles (low-beam cookie, lantern IES-like curve, window / shop-front apertures), soft shadows on the
// nearest lamps, cheap volumetric cones (lightCones.js) and a wet / dry street.
// Verify: frame strips while driving / walking / flying (no popping), the flicker test (labs/flickerTest.js, from
// claude/stalle eebd3d6), GPU A/B rounds (lights on / off, alternating), CPU per frame and an allocation check.
import * as THREE from "three/webgpu";
import { attribute, int, float, vec3, mix, clamp } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, env } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadLampModel } from "../viewer/lampModel.js";
import { loadTramModel, createTramFleet, tramPose } from "../viewer/tramModel.js";
import { PACK_SOURCES, packMaterial } from "../viewer/drive/carPacks.js";
import { pickType } from "../viewer/carFleet.js";
import { LightPool, NightLighting, nightLook } from "../viewer/nightLights/nightLighting.js";
import { NightSources, CAR, nightParams } from "../viewer/nightLights/nightSources.js";
import { createCones, coneLook } from "../viewer/nightLights/lightCones.js";
import { buildStreet, wet, X, Z, WALK_Y } from "../viewer/nightLights/nightStreet.js";
import { GroundLight } from "../viewer/nightLights/groundLight.js";
import { smooth01 } from "../viewer/nightLights/lightSelect.js";
import { flickerTest, showHeat } from "./flickerTest.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $strip = document.getElementById("strip");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pool = new LightPool(256);
const clustered = qp.get("clustered") !== "0";
if (clustered) renderer.lighting = new NightLighting(pool, { maxLightsPerCluster: +(qp.get("percluster") || 48), tileSize: +(qp.get("tile") || 32), zSlices: +(qp.get("slices") || 24) });
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 1500);
camera.position.set(-22, 6.5, 15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, -3);
controls.enableDamping = true;
const lighting = new Lighting(scene, renderer, "night");
const hour = qp.get("hour"); if (hour) lighting.hourOverride = +hour;

// ------------------------------------------------------------------------------------------------ the street
const lampModel = await loadLampModel();
// the ground light map (?groundmap=0: everything in the cluster loop, as round 1)
const useGround = qp.get("groundmap") !== "0";
const ground = useGround ? new GroundLight({ groundY: (x, z) => (Math.abs(z) < Z.kerb ? 0 : WALK_Y) }) : null;
const street = buildStreet(lampModel, { ground });
scene.add(street.group);

// soft shadows: the K nearest lamps also carry a real shadowed spot light (cross-faded, lightSelect.js ShadowLamps)
const K = Math.max(0, Math.min(4, +(qp.get("shadows") ?? 2)));
const shadowLights = [];
for (let k = 0; k < K; k++) {
  const L = new THREE.SpotLight(0xffc785, 0, 24, 1.22, 0.65, 2);
  L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.03; L.shadow.radius = 3;
  L.shadow.camera.near = 0.3; L.shadow.camera.far = 26;
  L.position.set(0, -50, 0); L.target.position.set(0, -60, 0);
  scene.add(L, L.target); shadowLights.push(L);
}
const cones = createCones(96);
scene.add(cones.mesh);
// ?pools=heads:16,lamps:24 overrides the pool sizes (nightSources.js)
const sizes = Object.fromEntries((qp.get("pools") || "").split(",").filter(Boolean).map((kv) => { const [k, v] = kv.split(":"); return [k, +v]; }));
const night = new NightSources(pool, street, { cars: 128, shadowLights, cones, sizes, ground });
if (ground) { ground.createDynamic(128); ground.bakeStatic(street.sources, nightParams); }
let rebakeT = 0;
const rebake = () => { if (!ground) return; clearTimeout(rebakeT); rebakeT = setTimeout(() => ground.bakeStatic(street.sources, nightParams), 150); };

// ------------------------------------------------------------------------------------------------ cars
const PAINTS = [0x0d0e10, 0x0d0e10, 0x1a1c1f, 0x34383d, 0x4a4e53, 0x8f959c, 0x9ea4ab, 0xb8bcc0, 0xe8e8e4, 0xdcdcd6, 0x1d3f6e, 0x2e5a8a, 0x8a1414, 0x24483a, 0x6b5a48];
const cars = [];     // { type, x, z, beta, speed, moving, paint, inst }
let hh = 0.5; const h01 = () => (hh = (hh * 9301 + 49297) % 233280) / 233280;
for (const s of street.parkSlots) cars.push({ type: pickType(h01()), x: s.x, z: s.z, beta: s.side > 0 ? 0 : Math.PI, speed: 0, moving: false, paint: PAINTS[Math.floor(s.pv * PAINTS.length)] });
const LANE_CARS = +(qp.get("traffic") || 16);
for (const dir of [1, -1]) for (let i = 0; i < LANE_CARS; i++)
  cars.push({ type: pickType(h01()), x: -X.carWrap + (i + h01() * 0.4) * (2 * X.carWrap / LANE_CARS), z: dir * Z.lane, beta: dir > 0 ? 0 : Math.PI,
    speed: dir * (dir > 0 ? 9.5 : 8.8), moving: true, paint: PAINTS[Math.floor(h01() * PAINTS.length)] });
let leadCar = cars.find((c) => c.moving && c.speed > 0);
/** the eastbound car nearest to x (the drive camera follows it) */
function pickLead(x = -110) { let best = null; for (const c of cars) if (c.moving && c.speed > 0 && (!best || Math.abs(c.x - x) < Math.abs(best.x - x))) best = c; leadCar = best; }
const carTypes = {}, carTypeList = [];   // id -> { mesh, n, head: [x,y,z], tail, alpha (local forward angle) }
let carsReady = false;
(async () => {
  const S = PACK_SOURCES.faceted;
  const worker = new Worker(new URL("../viewer/carLodWorker.js", import.meta.url), { type: "module" });
  const data = await new Promise((res, rej) => {
    worker.onmessage = (e) => (e.data.error ? rej(new Error(e.data.error)) : res(e.data));
    worker.onerror = (e) => rej(new Error(e.message || "car worker"));
    worker.postMessage({ id: 1, url: S.url, S: { welded: S.welded, prune: S.prune, lods: S.lods } });
  });
  worker.terminate();
  const mat = packMaterial({ paint: "instance", rich: true, lights: { head: attribute("aHead", "float"), tail: attribute("aTail", "float") } });
  for (const c of data.cars) {
    const m = c.lods[1];
    const n = cars.filter((k) => k.type === c.id).length;
    if (!n) continue;
    // the lamps from the vertex kinds (2 head, 3 tail): centroids in the car's frame -> where the lights sit, which way is forward
    const acc = { 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
    for (let i = 0; i < m.K.length; i++) { const k = Math.round(m.K[i]); if (acc[k]) { acc[k][0] += m.P[i * 3]; acc[k][1] += m.P[i * 3 + 1]; acc[k][2] += m.P[i * 3 + 2]; acc[k][3]++; } }
    const head = acc[2].slice(0, 3).map((v) => v / Math.max(1, acc[2][3])), tail = acc[3].slice(0, 3).map((v) => v / Math.max(1, acc[3][3]));
    const fx = head[0] - tail[0], fz = head[2] - tail[2], fl = Math.hypot(fx, fz) || 1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); geo.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
    geo.setIndex(new THREE.BufferAttribute(m.I, 1)); geo.computeBoundingSphere();
    const paint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aHead = new THREE.InstancedBufferAttribute(new Float32Array(n), 1), aTail = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    geo.setAttribute("paint", paint); geo.setAttribute("aHead", aHead); geo.setAttribute("aTail", aTail);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    carTypes[c.id] = { mesh, n: 0, head, tail, alpha: Math.atan2(-fz / fl, fx / fl), paint, aHead, aTail };
  }
  const col = new THREE.Color();
  for (const car of cars) {
    const T = carTypes[car.type]; if (!T) continue;
    car.T = T; car.inst = T.n++;
    col.setHex(car.paint); T.paint.setXYZ(car.inst, col.r, col.g, col.b);
    T.aHead.setX(car.inst, car.moving ? 1 : 0); T.aTail.setX(car.inst, car.moving ? 1 : 0);
  }
  for (const T of Object.values(carTypes)) { T.paint.needsUpdate = T.aHead.needsUpdate = T.aTail.needsUpdate = true; }
  carTypeList.push(...Object.values(carTypes));
  carsReady = true;
  placeCars();
})().catch((e) => { console.warn("cars:", e); $info.textContent = "cars: " + e.message; });

/** car matrices + the light data for the moving ones (no allocation) */
function placeCars() {
  if (!carsReady) return;
  const D = night.carData;
  let n = 0;
  for (const car of cars) {
    const T = car.T; if (!T) continue;
    const th = car.beta - T.alpha, c = Math.cos(th), s = Math.sin(th);
    const e = T.mesh.instanceMatrix.array, o = car.inst * 16;
    e[o] = c; e[o + 1] = 0; e[o + 2] = -s; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
    e[o + 8] = s; e[o + 9] = 0; e[o + 10] = c; e[o + 11] = 0; e[o + 12] = car.x; e[o + 13] = 0; e[o + 14] = car.z; e[o + 15] = 1;
    if (!car.moving) continue;
    const q = n * CAR.STRIDE, h = T.head, t = T.tail, fb = Math.cos(car.beta), fzb = -Math.sin(car.beta), pitch = 0.035;
    D[q] = car.x + c * h[0] + s * h[2] + fb * 0.12; D[q + 1] = h[1]; D[q + 2] = car.z - s * h[0] + c * h[2] + fzb * 0.12;
    D[q + 3] = fb * Math.cos(pitch); D[q + 4] = -Math.sin(pitch); D[q + 5] = fzb * Math.cos(pitch);
    D[q + 6] = car.x + c * t[0] + s * t[2] - fb * 0.6; D[q + 7] = Math.max(0.35, t[1] - 0.2); D[q + 8] = car.z - s * t[0] + c * t[2] - fzb * 0.6;   // 60 cm behind: lights the road, not its own bumper
    D[q + CAR.HEAD] = 1; D[q + CAR.TAIL] = 1; D[q + CAR.FADE] = smooth01((X.carWrap - Math.abs(car.x)) / 40);
    n++;
  }
  night.carCount = n;
  for (let k = 0; k < carTypeList.length; k++) carTypeList[k].mesh.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------------------------------------ the tram
const tramModel = await loadTramModel().catch((e) => { console.warn("tram:", e); return null; });
let tramFleet = null;
const TRACK = 560, tramS = { d: 140, dir: 1, speed: 7.5, on: true };
const atTrack = (s) => [Math.max(0, Math.min(TRACK, s)) - TRACK / 2, 0, 0];
const tramPoseBuf = [];
if (tramModel) {
  tramModel.sign.setRows(["FORT-JACO", "SCHAERBEEK GARE"]);
  tramFleet = createTramFleet(tramModel, scene, 2);
}
function placeTram() {
  const T = night.tram, L = tramModel ? tramModel.layout.length : 32;
  T.on = tramS.on && !!tramModel;
  if (!tramFleet) return;
  tramFleet.begin(camera);
  if (tramS.on) {
    tramPose(tramModel.layout, atTrack, tramS.d, tramPoseBuf, tramS.dir < 0);
    tramFleet.add(tramPoseBuf, () => 0, { sign: tramS.dir > 0 ? 0 : 1 });
    const nose = tramS.dir > 0 ? tramS.d : tramS.d - L, tail = tramS.dir > 0 ? tramS.d - L : tramS.d;
    T.hx = atTrack(nose)[0] + tramS.dir * 0.3; T.hz = 0; T.fx = tramS.dir; T.fz = 0;
    T.rx = atTrack(tail)[0] - tramS.dir * 0.3; T.rz = 0;
  }
  tramFleet.end();
}

// ------------------------------------------------------------------------------------------------ simulation + cameras
const sim = { t: 0, frozen: false };
function stepSim(dt) {
  sim.t += dt;
  for (const car of cars) if (car.moving) {
    car.x += car.speed * dt;
    if (car.x > X.carWrap) car.x -= 2 * X.carWrap; else if (car.x < -X.carWrap) car.x += 2 * X.carWrap;
  }
  const L = tramModel ? tramModel.layout.length : 32;
  tramS.d += tramS.dir * tramS.speed * dt;
  // at the ends (x = +-279 m, beyond the street) the tram reverses: cab 5 leads back (its lights swap white / red)
  if (tramS.dir > 0 && tramS.d > TRACK - 1) { tramS.d = TRACK - 1; tramS.dir = -1; }
  if (tramS.dir < 0 && tramS.d < L + 1) { tramS.d = L + 1; tramS.dir = 1; }
}
const VIEW = { mode: qp.get("view") || "orbit" };
const _look = new THREE.Vector3();
function poseCamera(t) {
  if (VIEW.mode === "drive") {
    const car = leadCar;
    camera.position.set(car.x - 7.5, 2.6, car.z + 0.2);
    _look.set(car.x + 14, 0.9, car.z);
  } else if (VIEW.mode === "walk") {
    const x = -60 + ((t * 1.4) % 120);
    camera.position.set(x, 1.75, -8.1);
    _look.set(x + 10, 1.4, -5);
  } else if (VIEW.mode === "fly") {
    const x = -110 + ((t * 6) % 220);
    camera.position.set(x, 19 + 4 * Math.sin(t * 0.15), 2.5);     // above the street, looking down it
    _look.set(x + 45, 0, -1);
  } else return;
  camera.lookAt(_look);
  controls.target.copy(_look);
}

// ------------------------------------------------------------------------------------------------ post + frame
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look("night");
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const P = { master: 1, wet: qp.get("wet") === "1", wetness: 1, puddles: 0.45, post: true, view: VIEW.mode, hour: lighting.hour, paused: false };
function applyWet() { wet.uWet.value = P.wet ? P.wetness : 0; wet.uPuddle.value = P.wet ? P.puddles : 0; }
applyWet();

let lastNight = 0;
function updateLights(dt) {
  placeCars(); placeTram();
  const n = env.uNight.value;
  lastNight = n;
  coneLook.uDensity.value = nightParams.coneDensity * (P.wet ? 2.5 : 1);
  cones.mesh.visible = nightParams.cones !== "off" && pool.enabled;
  const scale = P.master * smooth01((n - 0.15) / 0.5);
  night.update(camera.position, dt, scale, P.wet);
  nightLook.uWet.value = wet.uWet.value;
  if (ground) {
    const on = pool.enabled ? 1 : 0, np = nightParams;
    ground.uA.value = scale * on * (np.lamps ? 1 : 0); ground.uB.value = scale * on * (np.windows || np.shops ? 1 : 0); ground.uDyn.value = on;
    ground.renderDynamic(renderer, pool.enabled ? night.dynCount : 0);
  }
}
function frame(dt) {
  if (!sim.frozen && !P.paused) stepSim(dt);
  poseCamera(sim.t);
  if (VIEW.mode === "orbit") controls.update();
  camera.updateMatrixWorld();
  updateLights(dt);
  lighting.update(camera.position.y, 0, controls.target, 120);
  if (P.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!P.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
}

// ------------------------------------------------------------------------------------------------ GPU timing
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([r, c]) => {
    const ms = (typeof r === "number" ? r : 0) + (typeof c === "number" ? c : 0);
    if (ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 2000) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** alternating rounds: A = every night light on, B = the pool + cones + shadowed spots off (sun / moon, emissive and
 *  bloom stay). Frames are driven here (not by requestAnimationFrame: a background tab gets ~1 fps) and each frame's
 *  GPU time is read back from the timestamp queries (render passes + the cluster compute). */
async function bench({ rounds = 4, frames = 60, toggle = null } = {}) {
  renderer.setAnimationLoop(null);
  const res = { on: [], off: [] };
  // (the shadowed spots stay in the scene - removing a light rebuilds every material - but stop re-rendering their maps
  //  and go dark: their shadow lookups in the shaders remain, a small part of their cost)
  const set = toggle || ((on) => { pool.enabled = on; cones.mesh.visible = on; for (const L of shadowLights) L.shadow.autoUpdate = on; });
  const one = async () => {
    frame(0);
    const [r, c] = await Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]);
    return (typeof r === "number" ? r : 0) + (typeof c === "number" ? c : 0);
  };
  const keep = P.paused; P.paused = true;
  try {
    for (let r = 0; r < rounds; r++) for (const mode of r % 2 ? ["off", "on"] : ["on", "off"]) {
      set(mode === "on");
      for (let i = 0; i < 8; i++) await one();
      const ms = [];
      for (let i = 0; i < frames; i++) ms.push(await one());
      res[mode].push(median(ms));
    }
  } finally { set(true); P.paused = keep; renderer.setAnimationLoop(loop); }
  const on = median(res.on), off = median(res.off);
  const out = { on: +on.toFixed(3), off: +off.toFixed(3), delta: +(on - off).toFixed(3), roundsOn: res.on.map((v) => +v.toFixed(3)), roundsOff: res.off.map((v) => +v.toFixed(3)), active: pool.active, stats: { ...night.stats }, px: [renderer.domElement.width, renderer.domElement.height] };
  S.bench = `on ${out.on} / off ${out.off} ms → lights ${out.delta} ms (${out.active} active)`;
  return out;
}

/** CPU: the light update alone (selection + pool + cones), n runs on a moving camera; heap before / after */
function cpuTest(n = 20000) {
  const cam = camera.position.clone(), v = new THREE.Vector3();
  for (let i = 0; i < 200; i++) night.update(cam, 1 / 60, 1);            // warm the JIT
  const h0 = performance.memory?.usedJSHeapSize ?? 0, t0 = performance.now();
  for (let i = 0; i < n; i++) { v.set(cam.x + Math.sin(i * 0.001) * 80, cam.y, cam.z); night.update(v, 1 / 60, 1); }
  const t1 = performance.now(), h1 = performance.memory?.usedJSHeapSize ?? 0;
  return { runs: n, usPerUpdate: +((t1 - t0) / n * 1000).toFixed(2), heapDeltaBytes: h1 - h0, bytesPerUpdate: +((h1 - h0) / n).toFixed(3) };
}

// ------------------------------------------------------------------------------------------------ strips + pop metric
/** n frames, `step` s apart (the lights update at 60 Hz in between: the real fades), as a 4-wide contact sheet */
async function strip(mode = "drive", n = 8, step = 0.5, cols = 4, scale = 0.5, png = false) {
  const keepMode = VIEW.mode; VIEW.mode = mode; sim.frozen = true;
  if (mode === "drive") pickLead(-110);
  if (mode === "walk") sim.t = 20;
  if (mode === "fly") sim.t = 6;
  const W = renderer.domElement.width, H = renderer.domElement.height, tw = Math.round(W * scale), th = Math.round(H * scale);
  const rows = Math.ceil(n / cols), cv = document.createElement("canvas"); cv.width = tw * cols; cv.height = th * rows;
  const g = cv.getContext("2d");
  let worstFrame = 0, popEvents = 0;
  const kinds = Object.values(night.track);
  for (let f = 0; f < n; f++) {
    const sub = f === 0 ? 60 : Math.round(step * 60);
    for (let i = 0; i < sub; i++) {
      stepSim(1 / 60); poseCamera(sim.t); camera.updateMatrixWorld(); updateLights(1 / 60);
      lighting.update(camera.position.y, 0, controls.target, 120);
      pipe.setExposureFactor(lighting.adapt(1 / 60));
      if (f > 0) for (const t of kinds) { if (t.frameJump > worstFrame) worstFrame = t.frameJump; if (t.frameJump > 0.1) popEvents++; }
    }
    if (f === 0) for (const t of kinds) t.maxJump = 0;
    if (P.post) pipe.render(hazeHook); else renderer.render(scene, camera);
    g.drawImage(renderer.domElement, 0, 0, W, H, (f % cols) * tw, Math.floor(f / cols) * th, tw, th);
    g.fillStyle = "#fff"; g.font = `${Math.round(16 * scale * 2)}px monospace`;
    g.fillText(`${mode} t=${sim.t.toFixed(1)}s  ${pool.active} lights`, (f % cols) * tw + 10, Math.floor(f / cols) * th + 26);
    await new Promise((r) => setTimeout(r, 0));
  }
  sim.frozen = false; VIEW.mode = keepMode;
  $strip.innerHTML = ""; $strip.append(cv); $strip.style.display = "block";
  const out = { mode, frames: n, step, maxWeightJumpPerFrame: +worstFrame.toFixed(4), popEvents, perKind: Object.fromEntries(Object.entries(night.track).map(([k, t]) => [k, +t.maxJump.toFixed(4)])) };
  if (png) out.png = cv.toDataURL("image/png");
  return out;
}
$strip.onclick = () => { $strip.style.display = "none"; };

async function flicker(move = "strafe") {
  const keep = sim.frozen; sim.frozen = true; P.paused = true;
  const r = await flickerTest({ renderFrame: () => { camera.updateMatrixWorld(); updateLights(0); lighting.update(camera.position.y, 0, controls.target, 120); pipe.render(hazeHook); },
    canvas: renderer.domElement, camera, controls: VIEW.mode === "orbit" ? controls : null, frames: 24, move, step: 0.0006 });
  sim.frozen = keep; P.paused = false;
  showHeat(r);
  S.flicker = `${r.move}: ${r.blink} px (${r.ppm} ppm)`;
  return { move: r.move, blink: r.blink, ppm: r.ppm, clusters: r.clusters.slice(0, 5) };
}

// ------------------------------------------------------------------------------------------------ panel
const S = { stats: "", gpu: "", cpu: "", bench: "—", flicker: "—" };
const ui = new Panel({ title: "Night Lights Lab" });
const fs = ui.addFolder("Scene");
fs.add(P, "view", ["orbit", "drive", "walk", "fly"]).name("camera").onChange((v) => { VIEW.mode = v; });
fs.add(P, "hour", 17, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; });
fs.add(P, "wet").name("wet street").onChange(applyWet).listen();
fs.add(P, "wetness", 0, 1, 0.01).onChange(applyWet);
fs.add(P, "puddles", 0, 1, 0.01).onChange(applyWet);
fs.add(P, "paused").name("pause traffic");
fs.add({ f: () => { const L = tramModel ? tramModel.layout.length : 32; tramS.dir = 1; tramS.d = Math.min(TRACK - 1, Math.max(L + 1, camera.position.x + TRACK / 2 - 60 + L)); } }, "f").name("tram: pass now");
fs.add(P, "post").name("post chain (AO SSR bloom)");
const fl = ui.addFolder("Lights");
fl.add(P, "master", 0, 2, 0.01).name("all lights x");
for (const k of ["lamps", "windows", "shops", "signs", "headlights", "rear", "tram"]) fl.add(nightParams, k);
fl.add(nightParams, "cones", ["on", "wet only", "off"]).name("beams (cones)");
fl.add(nightParams, "lampI", 0, 400, 1).name("lamp cd").onChange(rebake);
fl.add(nightParams, "lampUp", 0, 1, 0.01).name("lamp up share").onChange(rebake);
fl.add(nightParams, "lampBatwing", 0, 2, 0.01).name("lamp batwing").onChange(rebake);
fl.add(nightParams, "windowI", 0, 60, 0.5).name("window cd").onChange(rebake);
fl.add(nightParams, "shopI", 0, 150, 1).name("shop cd").onChange(rebake);
fl.add(nightParams, "signI", 0, 40, 0.5).name("sign cd").onChange(rebake);
fl.add(nightParams, "headI", 0, 4000, 10).name("headlight cd");
fl.add(nightParams, "rearI", 0, 10, 0.1).name("rear light cd");
fl.add(nightParams, "coneDensity", 0, 0.3, 0.005).name("beam haze");
fl.add({ f: () => { location.search = new URLSearchParams({ ...Object.fromEntries(qp), shadows: K ? 0 : 2 }).toString(); } }, "f").name(`lamp shadows: ${K} (toggle, reloads)`);
const fv = ui.addFolder("Verify");
fv.add(S, "stats").name("active").listen();
fv.add(S, "gpu").name("GPU ms").listen();
fv.add(S, "cpu").name("CPU light update").listen();
fv.add({ f: () => strip("drive").then((r) => { S.flicker = JSON.stringify(r.perKind); }) }, "f").name("strip: drive");
fv.add({ f: () => strip("walk") }, "f").name("strip: walk");
fv.add({ f: () => strip("fly") }, "f").name("strip: fly over");
fv.add({ f: () => flicker() }, "f").name("flicker test");
fv.add({ f: () => bench() }, "f").name("GPU A/B (lights on / off)");
fv.add(S, "bench").name("bench").listen();
fv.add(S, "flicker").name("flicker").listen();

/** debug: lights listed in each pixel's cluster (blue 0 -> green 8 -> red 24+), drawn without post */
let heatMat = null;
function heat(on) {
  if (on && !heatMat) {
    const node = renderer.lighting.getNode(scene);
    heatMat = new THREE.MeshBasicNodeMaterial();
    const n = float(node.getClusterLightCount(int(-1)));
    heatMat.colorNode = mix(mix(vec3(0, 0, 0.6), vec3(0, 1, 0), clamp(n.div(8), 0, 1)), vec3(1, 0, 0), clamp(n.sub(8).div(16), 0, 1));
  }
  scene.overrideMaterial = on ? heatMat : null;
  P.post = !on;
}
window.lab = { ground, nightLook, heat, cones, shadowLights, frame, renderer, scene, camera, controls, pool, night, nightParams, P, VIEW, sim, cars, tramS, street, bench, cpuTest, strip, flicker, gpu, wet, lighting,
  setView(pos, tgt) { VIEW.mode = "orbit"; P.view = "orbit"; camera.position.set(...pos); controls.target.set(...tgt); controls.update(); } };

const c = street.counts;
const clock = new THREE.Clock();
let cpuAvg = 0;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  frame(dt);
  sampleGpu();
  cpuAvg = cpuAvg ? cpuAvg * 0.95 + night.ms * 0.05 : night.ms;
  const st = night.stats;
  S.stats = `${pool.active} lights: lamps ${st.lamps} win ${st.windows} shop ${st.shops} sign ${st.signs} head ${st.heads} rear ${st.rear} tram ${st.tram}`;
  S.gpu = gpu.avg ? gpu.avg.toFixed(2) : "n/a";
  S.cpu = `${(cpuAvg * 1000).toFixed(0)} µs`;
  $info.textContent = `${clustered ? "clustered" : "NO clustering (?clustered=0)"} · ${pool.active} lights drawn · night ${lastNight.toFixed(2)} · GPU ${S.gpu} ms · light update ${S.cpu}\n` +
    `street: ${c.houses} houses, ${c.openings} openings, ${c.windows} spill windows, ${c.shops} shops, ${c.lamps} lamps, ${c.trees} trees, ${c.parked} parked + ${LANE_CARS * 2} driving cars, tram ${tramModel ? "T3000" : "missing"}\n` +
    `${P.wet ? "WET" : "dry"} · shadows on the ${K} nearest lamps · camera ${VIEW.mode}`;
}
renderer.setAnimationLoop(loop);
