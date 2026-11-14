// THE IMPOSTOR LAB, cars (impostor-lab.html?scene=cars): phase 4 of the impostor kit (docs/IMPOSTOR_KIT.md §5).
// A straight Uccle street of 300 parked cars along both kerbs (real slots: the fleet's type mix and slot lengths,
// viewer/carFleet.js), under the city's lighting (viewer/lighting.js) and post chain (viewer/post.js).
// The cars are the city's faceted family with the city's LODs, made by the city's own LOD worker
// (viewer/carLodWorker.js) and drawn with the city's material (viewer/drive/carPacks.js packMaterial), instanced per
// (type, LOD, plain / fading) like viewer/carFleet.js (its update loop copied here: the fleet is a singleton whose
// distances are module constants; the lab needs them live).
// Modes:
//   mesh   the mesh LODs to the horizon (LOD 3 past 130 m, to 1.5 km): the reference
//   today  the city as it is: the same LODs, a dithered fade-out at 380-420 m (carFleet.js FADE_FROM / FADE_TO)
//   kit    the mesh LODs to the hand-over, then the kit's impostors (one atlas, 8 layers = 8 car types, paint as a
//          per-instance tint), complementary screen-dither hand-over, far end faded into the road colour
//   none   no cars (the cost baseline)
// Contact shadows (viewer/impostorKit/contact.js, Mr.doob's rounded-box SDF quad) under every car, mesh and kit.
// Jitter meter (labs/jitterMeter.js) on orbit / strafe / drive-by at 30 km/h / fly, per distance band; side by side
// with the mesh; brightness / paint match per band; GPU bench (timestamp queries, alternating modes, medians).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { uniform, float, vec3, floor, fract, sin, mix, step, positionWorld, abs, smoothstep } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { lodEye } from "../viewer/lodFade.js";
import { PACK_SOURCES, packMaterial, packLook } from "../viewer/drive/carPacks.js";
import { TYPE_MIX, slotNeed, pickType } from "../viewer/carFleet.js";
import * as K from "../viewer/impostorKit/index.js";
import { jitterRun, stripURL } from "./jitterMeter.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $atlas = document.getElementById("atlas"), $ov = document.getElementById("overlay");
document.getElementById("title").innerHTML = `<b>Impostor Lab · cars</b> — the kit's parked-car impostors vs the city's car LODs · <a href="?scene=row50">trees</a> · <a href="./">all labs</a>`;
const CW = +(qp.get("w") ?? 1280), CH = +(qp.get("h") ?? 720);
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(1);
renderer.setSize(CW, CH);
renderer.shadowMap.enabled = true;
renderer.domElement.className = "main";
document.body.prepend(renderer.domElement);
await renderer.init();
if (!renderer.backend.isWebGPUBackend) $info.textContent = "This lab needs WebGPU (the kit writes its mip chains straight to the GPU texture).";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, CW / CH, 0.2, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ settings
const S = {
  mode: qp.get("mode") ?? "kit", time: preset, post: true, contact: true, contactStrength: 1,
  start: +(qp.get("start") ?? 150), band: 12, end: 900, endBand: 300, meshEnd: 1500,
  grid: +(qp.get("grid") ?? 12), cell: +(qp.get("cell") ?? 48), full: qp.get("full") === "1", bakeLod: +(qp.get("lod") ?? 3),
  parallax: +(qp.get("parallax") ?? 1), pdo: qp.get("pdo") !== "0", blend: "bary3", alpha: "a2c-ramp", gain: K.TYPES.car.view.gain, lodBias: K.TYPES.car.view.lodBias, card: "octagon",
  path: "drive", frames: 24, orbitDeg: 0.02, strafe: 0.05, driveKmh: 30, result: "—", bench: "—", stats: "", bakeInfo: "", meshInfo: "",
  atlasOn: false, layer: 0, channel: "albedo",
};
const H = K.makeFade({ ...K.TYPES.car.fade, start: S.start, band: S.band, end: S.end, endBand: S.endBand });
const view = K.makeView({ lodBias: S.lodBias, gain: S.gain });

// ------------------------------------------------------------------------------------------------ the street
// A straight residential street along -z: two 3 m driving lanes, a 2 m parking lane each side (kerb at x = +-5 m,
// 15 cm), 2.5 m sidewalks, then terraced houses (12 m, a plaster colour per 6-9 m house, windows).
const STREET_LEN = 900;
const lin = (hex) => new THREE.Color().setHex(hex);
{
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10, STREET_LEN + 200).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3b3c3f, roughness: 0.92 }));
  road.position.set(0, 0, -STREET_LEN / 2 + 50); road.receiveShadow = true; scene.add(road);
  K.FAR.road.value.copy(road.material.color);       // the far fade's target: the asphalt (linear)
  const walkM = new THREE.MeshStandardNodeMaterial({ color: 0x8d8a84, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, STREET_LEN + 200), walkM);
    w.position.set(s * 6.25, 0.0, -STREET_LEN / 2 + 50); w.receiveShadow = true; scene.add(w);        // top at 0.15
  }
  // facades: one box per side, the houses by a world-space pattern
  const fm = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  const zz = positionWorld.z, yy = positionWorld.y;
  const house = floor(zz.div(7.3));
  const h = fract(sin(house.mul(12.9898)).mul(43758.5453));
  const plaster = mix(mix(vec3(0.42, 0.36, 0.29), vec3(0.55, 0.52, 0.47), h), vec3(0.30, 0.17, 0.12), step(0.72, h));   // ochre / cream / brick
  const wx = fract(zz.div(7.3).mul(3)), wy = fract(yy.div(3.1));
  const win = step(0.22, wx).mul(step(wx, 0.78)).mul(step(0.3, wy)).mul(step(wy, 0.85)).mul(step(1.2, yy));
  fm.colorNode = mix(plaster, vec3(0.03, 0.035, 0.04), win);
  fm.roughnessNode = mix(float(0.85), float(0.15), win);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(6, 12, STREET_LEN + 200), fm);
    f.position.set(s * 10.5, 6, -STREET_LEN / 2 + 50); f.castShadow = f.receiveShadow = true; scene.add(f);
  }
  const g = new THREE.Mesh(new THREE.CircleGeometry(6000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x4e5a34, roughness: 1 }));
  g.position.y = -0.03; g.receiveShadow = true; scene.add(g);
}

// ------------------------------------------------------------------------------------------------ the cars (data)
// the city's LODs from the city's worker (no main-thread hitch, exactly the fleet's arrays)
const SRC = PACK_SOURCES.faceted;
const t0 = performance.now();
const lodData = await new Promise((resolve, reject) => {
  const w = new Worker(new URL("../viewer/carLodWorker.js", import.meta.url), { type: "module" });
  w.onmessage = (e) => { w.terminate(); e.data.error ? reject(new Error(e.data.error)) : resolve(e.data); };
  w.onerror = (e) => reject(new Error(e.message));
  w.postMessage({ id: 1, url: SRC.url, S: { welded: SRC.welded, prune: SRC.prune, smooth: SRC.smooth, lods: SRC.lods } });
});
const LOD_DIST = SRC.lods.map((l) => l.until);
const CAR_IDS = lodData.cars.map((c) => c.id);
const source = K.fleetCarSource(lodData.cars, { lod: S.bakeLod, glass: packLook.glass });
// paints: viewer/carFleet.js PAINTS (private there), as is (sRGB hex; Brussels: lots of black, greys, silver, white)
const PAINTS = [0x0d0e10, 0x0d0e10, 0x0d0e10, 0x1a1c1f, 0x34383d, 0x34383d, 0x4a4e53, 0x5a5e63, 0x8f959c, 0x9ea4ab, 0x9ea4ab, 0xb8bcc0,
  0xe8e8e4, 0xe8e8e4, 0xdcdcd6, 0x1d3f6e, 0x1d2c4a, 0x2e5a8a, 0x8a1414, 0x5a1010, 0x24483a, 0x6b5a48, 0x3a3226];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// the car's long axis in the GLB (object space): the fleet's heading turns it
const box0 = source.box(0), alongX = box0.max.x - box0.min.x > box0.max.z - box0.min.z;
const lengthYaw = alongX ? Math.PI / 2 : 0;
const meshBytes = lodData.cars.reduce((s, c) => s + c.lods.reduce((a, m) => a + m.P.byteLength + m.N.byteLength + m.C.byteLength + m.K.byteLength + m.I.byteLength, 0), 0);
S.meshInfo = `${CAR_IDS.length} types x ${LOD_DIST.length} LODs (${lodData.cars.map((c) => c.lods.map((m) => m.I.length / 3)).map((a) => a.join("/")).slice(0, 2).join(", ")}, … tris), geometry ${(meshBytes / 1048576).toFixed(1)} MB, worker ${lodData.ms.toFixed(0)} ms`;

// 300 cars: 150 per kerb, slot = the type's slotNeed + a 0.2-1.3 m gap, a driveway gap now and then; right kerb
// cars face the traffic direction (-z), left kerb +z; +-1.2 degrees and +-8 cm off the kerb line
const cars = [];
{
  const KERB = 5.0;
  for (const side of [1, -1]) {
    let z = -6 - hash(side, 1) * 3;
    for (let i = 0; i < 150; i++) {
      const h1 = hash(i, side * 7.1), type = pickType(h1);
      const v = CAR_IDS.indexOf(type), b = source.box(v);
      const len = alongX ? b.max.x - b.min.x : b.max.z - b.min.z, wid = alongX ? b.max.z - b.min.z : b.max.x - b.min.x;
      const slot = slotNeed(type) - 0.5 + 0.2 + hash(i, side * 3.3) * 1.1;
      if (i && hash(i, side * 9.7) < 0.06) z -= 3.5 + hash(i, 5) * 3;          // a driveway / a free slot
      z -= slot / 2;
      const yaw = (side > 0 ? 0 : Math.PI) + lengthYaw + (hash(i, side * 1.9) - 0.5) * 0.042;
      const x = side * (KERB - 0.12 - wid / 2) + (hash(i, side * 4.4) - 0.5) * 0.16;
      const x2 = lodData.cars[v].extras || {};
      const paint = x2.keepPaint ? new THREE.Color().setRGB(...(x2.paint || [0.5, 0.5, 0.5])) : lin(PAINTS[Math.floor(hash(i, side * 2.7) * PAINTS.length * 0.9999)]);
      cars.push({ x, y: 0, z, yaw, type, v, paint, len, wid });
      z -= slot / 2;
    }
  }
}
// per car: matrix, the bounding-sphere centre (world: the distance the hand-over uses, the same point as the
// impostor's), the footprint centre (contact shadow)
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
for (const c of cars) {
  c.m = new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y, c.z), Q.setFromAxisAngle(UP, c.yaw), ONE);
  const sph = source.sphere(c.v), b = source.box(c.v), bc = b.getCenter(new THREE.Vector3());
  c.centre = sph.center.clone().applyMatrix4(c.m);
  c.foot = new THREE.Vector3(bc.x, 0, bc.z).applyMatrix4(c.m);
  c.R = sph.radius;
}

// ------------------------------------------------------------------------------------------------ the mesh fleet
// viewer/carFleet.js's batches and update loop (copied: private there), with the lab's live distances
const BANDS_LOD = [0.1, 0.08, 0.05];
const matNear = packMaterial({ paint: "instance", rich: true }), matFar = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false });
const matNearF = packMaterial({ paint: "instance", rich: true, crossFade: true }), matFarF = packMaterial({ paint: "instance", rich: true, clearcoat: false, seeThrough: false, crossFade: true });
const fleetGroup = new THREE.Group(); fleetGroup.name = "lab-car-fleet"; scene.add(fleetGroup);
const types = lodData.cars.map((c) => ({
  id: c.id,
  lods: c.lods.map((m, k) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(m.P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(m.N, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(m.C, 3)); geo.setAttribute("_kind", new THREE.BufferAttribute(m.K, 1));
    geo.setIndex(new THREE.BufferAttribute(m.I, 1));
    geo.computeBoundingSphere();
    const near = k <= 1;
    return { tris: m.I.length / 3, plain: batch(geo, near ? matNear : matFar, k < 3, false), fade: batch(geo, near ? matNearF : matFarF, k < 3, true) };
  }),
}));
function batch(geo, mat, cast, fade, cap = 320) {
  const g = new THREE.BufferGeometry();
  for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
  g.setIndex(geo.index);
  g.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
  if (fade) g.setAttribute("lodFade", new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
  const m = new THREE.InstancedMesh(g, mat, cap);
  m.count = 0; m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true; m.visible = false;
  m.name = "parked-car-batch";
  fleetGroup.add(m);
  return { geo: g, mesh: m, fade };
}
const allBatches = types.flatMap((T) => T.lods.flatMap((l) => [l.plain, l.fade]));
const frustum = new THREE.Frustum(), PM = new THREE.Matrix4(), SPH = new THREE.Sphere(new THREE.Vector3(), 3.2);
const fstats = { drawn: 0, perLod: [0, 0, 0, 0], fading: 0, tris: 0, impostors: 0 };
let hidden = new Set();          // the meter's hidden distance bands
function updateFleet() {
  const mode = S.mode, eye = camera.position;
  camera.updateMatrixWorld();
  PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(PM, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
  const L = LOD_DIST, last = L.length - 1, jobs = [];
  fstats.drawn = 0; fstats.perLod = L.map(() => 0); fstats.fading = 0; fstats.tris = 0; fstats.impostors = 0;
  const lo = S.start - S.band;
  for (const c of cars) {
    if (mode === "none" || hidden.has(c.band)) continue;
    const d = eye.distanceTo(c.centre);
    if (mode === "kit" && d >= lo && d <= S.end) fstats.impostors++;
    SPH.center.copy(c.centre);
    if (!frustum.intersectsSphere(SPH)) continue;
    let keep = 1, hand = -1;
    if (mode === "today") { if (d >= 420) continue; keep = d > 380 ? 1 - (d - 380) / 40 : 1; }
    else if (mode === "kit") { if (d >= S.start) continue; if (d >= lo) hand = Math.min(1, Math.max(0, (d - lo) / S.band)); }
    else if (d > S.meshEnd) continue;
    let k = L.findIndex((u) => d < u); if (k < 0) k = last;
    const T = types[c.v];
    let near = k, far = -1, t = 0;
    const bl = BANDS_LOD[k - 1] ?? 0, bk = BANDS_LOD[k] ?? 0;
    if (k > 0 && d - L[k - 1] < bl * L[k - 1]) { near = k - 1; far = k; t = (d - (1 - bl) * L[k - 1]) / (2 * bl * L[k - 1]); }
    else if (k < last && L[k] - d < bk * L[k]) { near = k; far = k + 1; t = (d - (1 - bk) * L[k]) / (2 * bk * L[k]); }
    t = Math.min(1, Math.max(0, t));
    // the hand-over: the mesh keeps the screen-hash pixels h < 1 - t (packMaterial crossFade "incoming" range, lodFade
    // = 2 - t), the impostor keeps h >= 1 - t (impostorKit fade.js impostorKeep): complementary
    if (hand >= 0) { jobs.push([T.lods[k].fade, c, 2 - hand]); fstats.fading++; }
    else if (far >= 0 && keep >= 1) { jobs.push([T.lods[near].fade, c, t], [T.lods[far].fade, c, 1 + t]); fstats.fading++; }
    else if (keep < 1) { jobs.push([T.lods[k].fade, c, 1 - keep]); fstats.fading++; }
    else jobs.push([T.lods[k].plain, c, 0]);
    fstats.drawn++; fstats.perLod[k]++; fstats.tris += T.lods[k].tris;
  }
  for (const b of allBatches) b.mesh.count = 0;
  for (const [b, c, f] of jobs) {
    const m = b.mesh, i = m.count++;
    m.setMatrixAt(i, c.m);
    b.geo.attributes.paint.setXYZ(i, c.paint.r, c.paint.g, c.paint.b);
    if (b.fade) b.geo.attributes.lodFade.setX(i, f);
  }
  for (const b of allBatches) {
    const m = b.mesh;
    m.visible = m.count > 0;
    if (!m.visible) continue;
    m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, m.count * 16); m.instanceMatrix.needsUpdate = true;
    const p = b.geo.attributes.paint; p.clearUpdateRanges(); p.addUpdateRange(0, m.count * 3); p.needsUpdate = true;
    if (b.fade) { const a = b.geo.attributes.lodFade; a.clearUpdateRanges(); a.addUpdateRange(0, m.count); a.needsUpdate = true; }
  }
}

// ------------------------------------------------------------------------------------------------ world: bands
// distance bands from the scene's eye (the meter hides a band to find its pixels)
const BANDS = [[0, 100, "near"], [100, 150, "100-150"], [150, 250, "150-250"], [250, 400, "250-400"], [400, 600, "400-600"], [600, 1e9, ">600"]];
const EYE = new THREE.Vector3(0.6, 1.6, 4), FOCUS = new THREE.Vector3(0, 1.0, -260);
/** -> true when a car changed band */
function assignBands(eye) {
  let changed = false;
  for (const c of cars) {
    const d = eye.distanceTo(c.centre), b = BANDS.findIndex(([lo, hi]) => d >= lo && d < hi);
    if (b !== c.band) { c.band = b; changed = true; }
  }
  return changed;
}
assignBands(EYE);

// ------------------------------------------------------------------------------------------------ the kit
let atlas = null, kitMats = null, field = null, contact = null;
async function bakeKit() {
  S.bakeInfo = "baking…";
  const src = K.fleetCarSource(lodData.cars, { lod: S.bakeLod, glass: packLook.glass });
  const spec = { ...K.TYPES.car, grid: S.grid, cell: S.cell, full: S.full };
  const a = await K.bakeAtlas(renderer, src, spec);
  src.dispose();
  atlas?.dispose(); atlas = a;
  S.bakeInfo = `${a.full ? "full" : "hemi"} ${a.grid}x${a.grid} x ${a.cell} px, LOD ${S.bakeLod}, ${a.layers} layers of ${a.size}², ${a.levels} levels, ${(a.bytes / 1048576).toFixed(1)} MB; bake ${a.bakeMs.toFixed(0)} ms (renders ${a.renderMs.toFixed(0)} ms over ${a.grid * a.layers} frames, worker ${a.workerMs.toFixed(0)} ms)`;
  console.log("[impostor lab · cars] bake:", S.bakeInfo);
  buildKitMats();
}
function buildKitMats() {
  if (!atlas) return;
  const old = kitMats;
  kitMats = K.impostorMaterials(atlas, { fade: H, view, shade: K.carShade, blend: S.blend, parallax: +S.parallax, pdo: S.pdo, alpha: S.alpha, card: S.card, far: "ground", name: "car-kit" });
  view.gain.value = S.gain; view.lodBias.value = S.lodBias;
  if (field && field.card === S.card) field.setMaterials(kitMats);
  else rebuildField();
  old?.colour.dispose(); old?.depth.dispose();
}
function rebuildField() {
  if (field) { scene.remove(field.group); field.dispose(); }
  field = K.impostorField(kitMats, cars.map((c) => ({ x: c.x, y: c.y, z: c.z, yaw: c.yaw, scale: 1, variant: c.v, band: c.band, tint: [c.paint.r, c.paint.g, c.paint.b] })), { card: S.card, name: "car-kit" });
  field.card = S.card;
  field.sort(EYE);
  scene.add(field.group);
  applyMode();
}
function buildContact() {
  if (contact) { scene.remove(contact.mesh); contact.dispose(); }
  contact = K.contactShadows(cars.map((c) => ({ x: c.foot.x, y: 0, z: c.foot.z, yaw: c.yaw - lengthYaw, hw: c.wid / 2, hl: c.len / 2, band: c.band })),
    { strength: S.contactStrength, hideMask: view.hideMask, maxDist: H.end, eye: lodEye });
  scene.add(contact.mesh);
}
buildContact();

function applyMode() {
  const m = S.mode;
  H.start.value = S.start; H.band.value = S.band; H.end.value = S.end; H.endBand.value = S.endBand; H.noise.value = 0;
  if (field) field.group.visible = m === "kit";
  if (contact) { contact.mesh.visible = S.contact && (m === "kit" || m === "mesh"); contact.U.strength.value = S.contactStrength; }
  view.hideMask.value = [...hidden].reduce((s, b) => s + 2 ** b, 0);
}

// ------------------------------------------------------------------------------------------------ render
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
let frozen = false;
function renderFrame(dt = 1 / 60) {
  lodEye.value.copy(camera.position);
  updateFleet();
  K.updateView(view, camera, renderer);
  if (!frozen) lighting.update(camera.position.y, 0, controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380), dt);
  if (S.post) { pipe.render(hazeHook); pipe.setExposureFactor(lighting.adapt(frozen ? 0 : dt)); }
  else { renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0); renderer.render(scene, camera); }
}
function resetView(eye = EYE, focus = FOCUS) { camera.position.copy(eye); controls.target.copy(focus); camera.lookAt(focus); controls.update(); }

// ------------------------------------------------------------------------------------------------ camera paths
// deterministic, frame f from the pose the run starts at (lab time frozen)
let pathBase = null;
function poseFor(path, f) {
  const b = pathBase;
  if (path === "orbit") {
    const a = THREE.MathUtils.degToRad(S.orbitDeg * f), o = b.pos.clone().sub(b.target);
    camera.position.set(b.target.x + o.x * Math.cos(a) - o.z * Math.sin(a), b.pos.y, b.target.z + o.x * Math.sin(a) + o.z * Math.cos(a));
    camera.lookAt(b.target);
  } else if (path === "strafe") {
    const fwd = b.target.clone().sub(b.pos).normalize(), right = fwd.clone().cross(UP).normalize();
    camera.position.copy(b.pos).addScaledVector(right, S.strafe * f); camera.quaternion.copy(b.quat);
  } else if (path === "drive") {
    // a driver at 30 km/h in the right-hand lane (60 fps: 0.139 m a frame), eye 1.25 m, looking down the street
    camera.position.set(1.5, 1.25, b.pos.z - (S.driveKmh / 3.6 / 60) * f);
    camera.lookAt(1.5, 1.0, camera.position.z - 300);
  } else if (path === "fly") {
    // a bird over the street: 0.6 m a frame (36 m/s), 45-60 m up, gentle bank, looking 300 m ahead and down
    const s = f * 0.6;
    camera.position.set(14 * Math.sin(s / 140), 52 + 8 * Math.sin(s / 90), b.pos.z - s);
    camera.lookAt(30 * Math.cos(s / 140), 0, camera.position.z - 300);
  }
  camera.updateMatrixWorld(true);
}
function startPath(path) {
  pathBase = { pos: camera.position.clone(), quat: camera.quaternion.clone(), target: controls.target.clone() };
  if (path === "drive" || path === "fly") pathBase.pos.set(0, 0, EYE.z);
}
function endPath() { camera.position.copy(pathBase.pos); camera.quaternion.copy(pathBase.quat); controls.target.copy(pathBase.target); camera.updateMatrixWorld(true); }

// ------------------------------------------------------------------------------------------------ the jitter meter
async function meter(mode, path = S.path, { strip = false, crop = null } = {}) {
  S.mode = mode; applyMode();
  frozen = true;
  // the start pose of drive / fly is fixed: put the camera there before the bands are taken
  startPath(path); poseFor(path, 0);
  if (assignBands(camera.position)) rebuildBandsAttr();
  renderFrame(0);
  const bands = BANDS.map(([, , name], b) => ({ name, b })).filter(({ name, b }) => name !== "near" && cars.some((c) => c.band === b))
    .map(({ name, b }) => ({ name, hide: () => { hidden.add(b); applyMode(); }, show: () => { hidden.delete(b); applyMode(); } }));
  const r = await jitterRun({ frames: S.frames, pose: (f) => poseFor(path, f), render: () => renderFrame(0), canvas: renderer.domElement, bands, keepFrames: strip ? 12 : 0, crop });
  endPath();
  frozen = false;
  r.mode = mode; r.path = path;
  return r;
}
/** the band attribute of the field and the contact quads follows assignBands */
function rebuildBandsAttr() {
  const fb = field?.colour.geometry.attributes.ikData, cb = contact?.mesh.geometry.attributes.csData;
  // field.sort reordered the instances: rebuild the field instead (cheap: 300 instances), keeping its materials
  if (fb) { const m = { colour: field.colour.material, depth: field.depth.material }; rebuildField(); field.setMaterials(m); }
  if (cb) { cars.forEach((c, i) => { cb.array[i * 4 + 3] = c.band; }); cb.needsUpdate = true; }
}
const fmt = (b) => (b ? `${(b.share * 100).toFixed(2)}% / ${(b.d2 * 1000).toFixed(2)}` : "—");
async function meterAB(path = S.path, modes = ["mesh", "today", "kit"]) {
  const out = {}, keep = S.mode;
  for (const m of modes) out[m] = await meter(m, path);
  S.mode = keep; applyMode();
  const names = Object.keys(out[modes[0]].bands);
  const rows = ["all", ...names].map((n) => {
    const get = (m) => (n === "all" ? out[m].all : out[m].bands[n]);
    const ex = (m) => { const a = get(m), b = get("mesh"); return a && b && b.d2 > 0 ? `x${(a.d2 / b.d2).toFixed(2)}` : ""; };
    return `${n.padEnd(8)} ${modes.map((m) => `${m}: ${fmt(get(m))} ${m !== "mesh" ? ex(m) : ""} (${get(m)?.maskPx ?? 0} px)`).join(" | ")}`;
  });
  const txt = `[cars · ${path} · ${S.frames} frames · hand-over ${S.start} m] blink share / d2 x1000\n` + rows.join("\n");
  console.log(txt);
  S.result = txt;
  (window.lab.results ??= []).push({ path, settings: settings(), out: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { all: v.all, bands: v.bands }])) });
  window.lab.lastHeat = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.heatURL]));
  return out;
}
const settings = () => ({ start: S.start, band: S.band, grid: S.grid, cell: S.cell, full: S.full, bakeLod: S.bakeLod, parallax: S.parallax, pdo: S.pdo, blend: S.blend, contact: S.contact, post: S.post, time: S.time });

// ------------------------------------------------------------------------------------------------ images, stats
function show(url, caption = "") { lastShown = url; $ov.style.display = "block"; $ov.querySelector("img").src = url; $ov.querySelector("div").textContent = caption; }
$ov.onclick = () => { $ov.style.display = "none"; };
let lastShown = null;
const grab = () => { const c = new OffscreenCanvas(CW, CH), x = c.getContext("2d"); x.drawImage(renderer.domElement, 0, 0); return x.getImageData(0, 0, CW, CH); };
function grabMode(m) { S.mode = m; applyMode(); renderFrame(0); renderFrame(0); return grab(); }
/** mode vs mesh at this camera: left the mode, right the mesh, then |diff| x4; crop = [x, y, w, h], k = zoom */
async function sideBySide(mode = "kit", crop = null, k = 1) {
  frozen = true;
  const keep = S.mode;
  let a = grabMode(mode), b = grabMode("mesh");
  S.mode = keep; applyMode(); frozen = false;
  if (crop) {
    const cut = (im) => { const c0 = new OffscreenCanvas(CW, CH), x0 = c0.getContext("2d"); x0.putImageData(im, 0, 0); const c1 = new OffscreenCanvas(crop[2] * k, crop[3] * k), x1 = c1.getContext("2d"); x1.imageSmoothingEnabled = false; x1.drawImage(c0, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2] * k, crop[3] * k); return x1.getImageData(0, 0, crop[2] * k, crop[3] * k); };
    a = cut(a); b = cut(b);
  }
  const w = a.width, h = a.height;
  const c = new OffscreenCanvas(w, h * 3 + 8), x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, w, c.height);
  x.putImageData(a, 0, 0); x.putImageData(b, 0, h + 4);
  const d = x.createImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) { for (let q = 0; q < 3; q++) d.data[i + q] = Math.min(255, Math.abs(a.data[i + q] - b.data[i + q]) * 4); d.data[i + 3] = 255; }
  x.putImageData(d, 0, 2 * h + 8);
  x.fillStyle = "#fff"; x.font = "16px monospace";
  x.fillText(mode, 8, 20); x.fillText("mesh LODs", 8, h + 24); x.fillText("|diff| x4", 8, 2 * h + 28);
  const url = URL.createObjectURL(await c.convertToBlob({ type: "image/png" }));
  show(url, `cars: ${mode} | mesh | diff x4`);
  return url;
}
/** brightness / paint match per distance band: over the band's car pixels (mode or mesh differ from no cars),
 *  mean colour of the mode and of the mesh, mean |mode - mesh| (0-255), at this camera. */
function carStats(mode = "kit") {
  frozen = true;
  const keep = S.mode, out = {};
  if (assignBands(camera.position)) rebuildBandsAttr();
  for (let b = 1; b < BANDS.length; b++) {
    if (!cars.some((c) => c.band === b)) continue;
    const others = BANDS.map((_, i) => i).filter((i) => i !== b);
    hidden = new Set(others);
    const A = grabMode(mode).data, M = grabMode("mesh").data, N0 = grabMode("none").data;
    let n = 0, la = 0, lm = 0, mad = 0; const ra = [0, 0, 0], rm = [0, 0, 0];
    for (let i = 0; i < A.length; i += 4) {
      const dA = Math.abs(A[i] - N0[i]) + Math.abs(A[i + 1] - N0[i + 1]) + Math.abs(A[i + 2] - N0[i + 2]);
      const dM = Math.abs(M[i] - N0[i]) + Math.abs(M[i + 1] - N0[i + 1]) + Math.abs(M[i + 2] - N0[i + 2]);
      if (dA <= 6 && dM <= 6) continue;
      n++;
      for (let q = 0; q < 3; q++) { ra[q] += A[i + q]; rm[q] += M[i + q]; mad += Math.abs(A[i + q] - M[i + q]) / 3; }
      la += 0.2126 * A[i] + 0.7152 * A[i + 1] + 0.0722 * A[i + 2]; lm += 0.2126 * M[i] + 0.7152 * M[i + 1] + 0.0722 * M[i + 2];
    }
    out[BANDS[b][2]] = { px: n, lum: [+(la / n).toFixed(1), +(lm / n).toFixed(1)], rgb: [ra.map((v) => +(v / n).toFixed(1)), rm.map((v) => +(v / n).toFixed(1))], mad: +(mad / n).toFixed(2) };
  }
  hidden = new Set(); S.mode = keep; applyMode(); frozen = false;
  console.log(`[cars] stats ${mode} vs mesh (lum mode/mesh, mean |diff|):`, out);
  return out;
}
async function stripSet(path = S.path, crop = null) {
  const keep = S.mode, urls = [];
  for (const m of ["mesh", "today", "kit"]) {
    const r = await meter(m, path, { strip: true, crop });
    urls.push(await stripURL(r.kept, 3, `cars · ${path} · ${m}: 12 consecutive frames, x3`));
  }
  S.mode = keep; applyMode();
  return stackURLs(urls, `cars ${path}: mesh / today / kit`);
}
async function stackURLs(urls, caption) {
  const bms = [];
  for (const u of urls) bms.push(await createImageBitmap(await fetch(u).then((r) => r.blob())));
  const w = Math.max(...bms.map((b) => b.width)), h = bms.reduce((s, b) => s + b.height + 6, 0);
  const c = new OffscreenCanvas(w, h), x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
  let y = 0;
  for (const b of bms) { x.drawImage(b, 0, y); y += b.height + 6; }
  const url = URL.createObjectURL(await c.convertToBlob({ type: "image/png" }));
  show(url, caption);
  return url;
}
/** the screen box of the cars at distance [a, b] from the camera (for crops) */
function cropAt(a, b, pad = 6) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const v = new THREE.Vector3();
  for (const c of cars) {
    const d = camera.position.distanceTo(c.centre); if (d < a || d > b) continue;
    for (const s of [-1, 1]) for (const t of [-1, 1]) for (const u of [0, 1]) {
      v.copy(c.centre).add(new THREE.Vector3(s * c.R, (u ? 1 : -1) * 0.8, t * c.R)).project(camera);
      if (v.z > 1 || v.z < -1) continue;
      const px = (v.x * 0.5 + 0.5) * CW, py = (-v.y * 0.5 + 0.5) * CH;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
  }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(CW, Math.ceil(x1 + pad)); y1 = Math.min(CH, Math.ceil(y1 + pad));
  return [x0, y0, Math.max(8, x1 - x0), Math.max(8, y1 - y0)];
}

// ------------------------------------------------------------------------------------------------ GPU bench
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 900) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** modes: names or { name, set() } (a variant: e.g. kit without contact shadows) */
async function bench(modes = ["none", "mesh", "today", "kit"], rounds = 4) {
  const keep = { ...S };
  const list = modes.map((m) => (typeof m === "string" ? { name: m, set: () => { S.mode = m; } } : m));
  const res = Object.fromEntries(list.map((m) => [m.name, []]));
  for (let r = 0; r < rounds; r++) for (const m of (r % 2 ? [...list].reverse() : list)) {
    Object.assign(S, { mode: keep.mode, contact: keep.contact, pdo: keep.pdo, parallax: keep.parallax });
    m.set(); applyMode();
    await wait(700); gpu.samples.length = 0; await wait(2000);
    const s = [...gpu.samples].sort((a, b) => a - b);
    res[m.name].push(s.length ? s[Math.floor(s.length / 2)] : NaN);
  }
  Object.assign(S, { mode: keep.mode, contact: keep.contact, pdo: keep.pdo, parallax: keep.parallax }); applyMode();
  const med = (a) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const base = med(res[list[0].name]);
  S.bench = list.map((m) => `${m.name} ${med(res[m.name]).toFixed(2)}${m !== list[0] ? ` (${(med(res[m.name]) - base) >= 0 ? "+" : ""}${(med(res[m.name]) - base).toFixed(2)})` : ""}`).join(" · ") + " ms";
  console.log(`[cars] GPU ms (median of ${rounds} x 2 s, whole frame, alternating order):`, S.bench, res);
  (window.lab.benches ??= []).push({ view: { pos: camera.position.toArray(), target: controls.target.toArray() }, res, settings: settings() });
  return res;
}

/**
 * ISOLATED cost (the whole-frame bench above drowns ~0.1 ms of cars in the shared GPU's noise): the cars alone in a
 * scene of their own (a road plane, two lights, no shadows, no post), rendered N times per sample with the lab loop
 * frozen, timestamp medians, configurations alternated round by round. -> ms over the empty scene per configuration.
 *   meshFar / kitFar: only the cars past the 100-150 m bands (the hand-over side), meshAll / kitAll: every car,
 *   contactAll: the contact quads alone.
 */
async function microBench(reps = 6, N = 60) {
  const r = renderer;
  if (assignBands(EYE)) rebuildBandsAttr();
  const bs = new THREE.Scene(); bs.environment = scene.environment;
  const dl = new THREE.DirectionalLight(0xffffff, 3); dl.position.set(-1, 3, 2);
  bs.add(dl, new THREE.HemisphereLight(0xaaccff, 0x806040, 1));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 2000).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3b3c3f }));
  ground.position.z = -450; bs.add(ground);
  bs.add(fleetGroup, field.group, contact.mesh);
  const sm = r.shadowMap.enabled; r.shadowMap.enabled = false;
  frozen = true;
  const keep = { mode: S.mode, contact: S.contact };
  const cfgs = {
    none: () => { S.mode = "none"; S.contact = false; hidden = new Set(); },
    meshFar: () => { S.mode = "mesh"; S.contact = false; hidden = new Set([0, 1]); },
    kitFar: () => { S.mode = "kit"; S.contact = false; hidden = new Set([0, 1]); },
    meshAll: () => { S.mode = "mesh"; S.contact = false; hidden = new Set(); },
    kitAll: () => { S.mode = "kit"; S.contact = false; hidden = new Set(); },
    todayAll: () => { S.mode = "today"; S.contact = false; hidden = new Set(); },
    contactAll: () => { S.mode = "none"; S.contact = true; hidden = new Set(); },
  };
  const res = Object.fromEntries(Object.keys(cfgs).map((k) => [k, []]));
  for (let rep = 0; rep < reps; rep++) for (const k of (rep % 2 ? Object.keys(cfgs).reverse() : Object.keys(cfgs))) {
    cfgs[k](); applyMode();
    if (k === "contactAll") contact.mesh.visible = true;
    lodEye.value.copy(camera.position); updateFleet(); K.updateView(view, camera, r);
    for (let i = 0; i < 4; i++) r.render(bs, camera);
    await r.resolveTimestampsAsync("render");
    const t = [];
    for (let i = 0; i < N; i++) { r.render(bs, camera); if (i % 4 === 3) { const ms = await r.resolveTimestampsAsync("render"); if (ms > 0) t.push(ms / 4); } }
    t.sort((a, b) => a - b); res[k].push(t[Math.floor(t.length / 2)]);
  }
  scene.add(fleetGroup, field.group, contact.mesh);
  r.shadowMap.enabled = sm; Object.assign(S, keep); hidden = new Set(); applyMode(); frozen = false;
  const med = (a) => { const q = [...a].sort((x, y) => x - y); return q[Math.floor(q.length / 2)]; };
  const base = med(res.none);
  const out = Object.fromEntries(Object.entries(res).filter(([k]) => k !== "none").map(([k, v]) => [k, +(med(v) - base).toFixed(3)]));
  out.empty = +base.toFixed(3);
  console.log("[cars] isolated GPU ms over the empty scene:", out, res);
  (window.lab.micro ??= []).push({ view: camera.position.toArray(), out, res, settings: settings() });
  return out;
}

// ------------------------------------------------------------------------------------------------ atlas viewer
function drawAtlas() {
  $atlas.style.display = S.atlasOn && atlas ? "block" : "none";
  if (!S.atlasOn || !atlas) return;
  const W = atlas.size, x = $atlas.getContext("2d");
  const src = atlas.pixels(Math.min(S.layer, atlas.layers - 1), S.channel === "albedo" || S.channel === "coverage" ? "A" : "B");
  const img = new ImageData(W, W), d = img.data;
  for (let i = 0; i < W * W * 4; i += 4) {
    if (S.channel === "albedo") { const a = src[i + 3] / 255; for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.pow(src[i + k] / 255, 1 / 2.2) * 255 * a + 40 * (1 - a)); }
    else if (S.channel === "coverage") d[i] = d[i + 1] = d[i + 2] = src[i + 3];
    else if (S.channel === "normal") { d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = 200; }
    else if (S.channel === "depth") d[i] = d[i + 1] = d[i + 2] = src[i + 2];
    else { const v = src[i + 3]; d[i] = v; d[i + 1] = d[i + 2] = v * 0.4; }   // the paint's shade (B.a), red
    d[i + 3] = 255;
  }
  const c = new OffscreenCanvas(W, W); c.getContext("2d").putImageData(img, 0, 0);
  x.imageSmoothingEnabled = true;
  x.drawImage(c, 0, 0, 512, 512);
  const s = 512 / atlas.grid;
  x.strokeStyle = "rgba(255,255,255,.15)";
  for (let i = 1; i < atlas.grid; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 512); x.moveTo(0, i * s); x.lineTo(512, i * s); x.stroke(); }
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Impostor Lab · cars" });
const fs = ui.addFolder("Scene");
fs.add({ scene: "cars" }, "scene", ["cars", "single", "row50", "forest", "far"]).name("scene").onChange((v) => { if (v !== "cars") location.search = `?scene=${v}`; });
fs.add(S, "mode", ["kit", "today", "mesh", "none"]).name("cars").onChange(applyMode).listen();
fs.add(S, "contact").name("contact shadows").onChange(applyMode);
fs.add(S, "contactStrength", 0, 1.5, 0.05).name("contact strength").onChange(applyMode);
fs.add(S, "post").name("post chain + haze");
fs.add(S, "time", Object.keys(PRESETS)).name("time").onChange((v) => { lighting.apply(v); pipe.look(v); });
fs.add({ go: () => resetView() }, "go").name("reset view (street level)");
fs.add({ go: () => resetView(new THREE.Vector3(18, 55, 10), new THREE.Vector3(0, 0, -260)) }, "go").name("view from above");
const fk = ui.addFolder("Kit");
fk.add(S, "parallax", [0, 1, 2]).name("parallax steps").onChange(buildKitMats);
fk.add(S, "pdo").name("depth out (PDO)").onChange(buildKitMats);
fk.add(S, "blend", ["bary3", "dominant"]).onChange(buildKitMats);
fk.add(S, "card", ["octagon", "quad"]).onChange(buildKitMats);
fk.add(S, "gain", 0.5, 8, 0.1).name("a2c ramp gain").onChange((v) => { view.gain.value = v; });
fk.add(S, "lodBias", -2, 2, 0.1).name("mip bias").onChange((v) => { view.lodBias.value = v; });
const fd = ui.addFolder("Distances (m)");
fd.add(S, "start", 60, 420, 5).name("hand-over at").onChange(applyMode);
fd.add(S, "band", 2, 40, 1).name("hand-over band").onChange(applyMode);
fd.add(S, "end", 400, 1500, 10).name("kit far end").onChange(applyMode);
fd.add(S, "endBand", 10, 600, 10).name("kit far band").onChange(applyMode);
const fb = ui.addFolder("Bake");
fb.add(S, "full").name("full octahedron (else hemi)");
fb.add(S, "grid", [8, 12, 16, 20]).name("views per side").onChange((v) => { S.grid = +v; });
fb.add(S, "cell", [32, 48, 64]).name("cell px").onChange((v) => { S.cell = +v; });
fb.add(S, "bakeLod", [0, 1, 2, 3]).name("bake from LOD").onChange((v) => { S.bakeLod = +v; });
fb.add({ go: () => bakeKit() }, "go").name("re-bake");
fb.add(S, "bakeInfo").name("kit").listen();
fb.add(S, "meshInfo").name("mesh");
const fa = ui.addFolder("Atlas viewer");
fa.add(S, "atlasOn").name("show").onChange(drawAtlas);
fa.add(S, "layer", 0, 7, 1).name("car type").onChange(drawAtlas);
fa.add(S, "channel", ["albedo", "coverage", "normal", "depth", "paint"]).name("channel (albedo = all but paint)").onChange(drawAtlas);
const fm = ui.addFolder("Jitter meter");
fm.add(S, "path", ["drive", "orbit", "strafe", "fly"]);
fm.add(S, "frames", 8, 60, 1);
fm.add(S, "driveKmh", 5, 90, 1).name("drive km/h");
fm.add(S, "orbitDeg", 0.005, 0.5, 0.005).name("orbit deg / frame");
fm.add(S, "strafe", 0.01, 1, 0.01).name("strafe m / frame");
fm.add({ go: () => meterAB() }, "go").name("run: mesh / today / kit");
fm.add({ go: async () => { for (const p of ["drive", "orbit", "strafe", "fly"]) await meterAB(p); } }, "go").name("run every path");
fm.add({ go: () => { const h = window.lab.lastHeat; if (h) stackURLs(Object.values(h), "heat maps: " + Object.keys(h).join(" / ")); } }, "go").name("show heat maps");
fm.add({ go: () => stripSet() }, "go").name("frame strips");
fm.add({ go: () => sideBySide("kit") }, "go").name("side by side: kit | mesh | diff");
fm.add({ go: () => { S.result = JSON.stringify(carStats("kit")); } }, "go").name("brightness / paint per band");
fm.add(S, "result").name("result").listen();
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("GPU bench: none / mesh / today / kit");
fp.add(S, "bench").name("result").listen();

const dataURL = (url) => fetch(url).then((r) => r.blob()).then((b) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }));
window.lab = { microBench, freeze(v) { frozen = v; }, dataURL, renderer, scene, camera, controls, S, H, view, cars, types, lodData, source, meter, meterAB, bench, sideBySide, carStats, stripSet, stackURLs, cropAt, show,
  bakeKit, buildKitMats, rebuildField, buildContact, applyMode, renderFrame, poseFor, startPath, endPath, resetView, assignBands, fstats, gpu,
  get atlas() { return atlas; }, get field() { return field; }, get contact() { return contact; }, get lastShown() { return lastShown; },
  setHidden(list) { hidden = new Set(list); applyMode(); }, EYE, FOCUS, BANDS, TYPE_MIX };

await bakeKit();
resetView();
applyMode();
console.log(`[impostor lab · cars] ${cars.length} cars, street ${(-Math.min(...cars.map((c) => c.z))).toFixed(0)} m; mesh: ${S.meshInfo}; ready in ${(performance.now() - t0).toFixed(0)} ms`);
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, n = 0;
renderer.setAnimationLoop(() => {
  if (frozen) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  renderFrame(dt);
  sampleGpu();
  if (++n % 15 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${S.stats} · mode ${S.mode} · mesh cars ${fstats.drawn} (LOD ${fstats.perLod.join("/")}, fading ${fstats.fading}, ${(fstats.tris / 1000).toFixed(0)}k tris) · impostors ${S.mode === "kit" ? fstats.impostors : 0}\n` +
      `kit: ${S.bakeInfo}\nmesh: ${S.meshInfo}\n${S.result}\n${S.bench !== "—" ? `GPU: ${S.bench}` : ""}`;
    if (S.atlasOn && n % 60 === 1) drawAtlas();
  }
});
