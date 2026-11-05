// THE CAR LAB, comparison (car-lab.html?mode=compare | ?mode=street): which car model goes into the city?
//   compare  four cars parked at a kerb side by side, under the city's own lighting (viewer/lighting.js) and post
//            chain (viewer/post.js): our scripted hatchback (tools/blender/car.py), a Kenney Car Kit car and a
//            Quaternius Cars Pack car (CC0, tools/cars/convertPacks.mjs -> models/cars/) and one of our faceted
//            family (tools/blender/carFaceted.py -> models/cars/faceted.glb); the faceted family alone; or every car.
//   street   ~300 parked cars along two 420 m streets, per option (scripted / Kenney / Quaternius / faceted / none), with
//            instancing per (model, LOD, material), LODs by distance (meshoptimizer, made at load), per-instance paint,
//            per-instance frustum culling; triangles, draw calls and GPU ms per option, and an A/B benchmark.
// Every model comes through the one loader (viewer/drive/carModel.js loadCarModel / viewer/drive/carPacks.js).
// Same renderer settings as the city: reversed depth buffer, near plane 0.2 m (no coplanar surfaces in the scene:
// the kerbs and facades stand on the road plane with their bottoms below it).
import * as THREE from "three/webgpu";
import { attribute } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadCarModel, createCar, carLights, CAR_LODS, PAINTS } from "../viewer/drive/carModel.js";
import { loadPack, packMaterial, packLook, PACK_LODS } from "../viewer/drive/carPacks.js";

const qp = new URLSearchParams(location.search);
const MODE = qp.get("mode") === "street" ? "street" : "compare";
const $info = document.getElementById("info");
document.getElementById("speedo")?.remove();
document.getElementById("title").innerHTML = `<b>Car Lab</b> — ${MODE === "street" ? "parked street benchmark" : "car comparison"} ·
  <a href="?mode=compare">compare</a> · <a href="?mode=street">street of 300</a> · <a href="car-lab.html">drive</a> · <a href="./">all labs</a>`;

const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.2, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the street set
// streets run along z; road (y = 0) 8 m between kerbs, 15 cm kerbs, 4 m sidewalks, facades behind
const STREETS = MODE === "street" ? [-16, 16] : [0];
const LEN = MODE === "street" ? 440 : 160;
const ROAD_W = 8, WALK = 4, KERB = 0.15;
{
  const asphalt = new THREE.MeshStandardNodeMaterial({ color: 0x35373a, roughness: 0.93 });
  const walkM = new THREE.MeshStandardNodeMaterial({ color: 0x8d8a84, roughness: 0.88 });
  const kerbM = new THREE.MeshStandardNodeMaterial({ color: 0xa6a29a, roughness: 0.8 });
  const wallM = new THREE.MeshStandardNodeMaterial({ color: 0x9c8f82, roughness: 0.85 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), asphalt);
  gnd.receiveShadow = true; scene.add(gnd);
  const walks = [], kerbs = [], walls = [];
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  for (const sx of STREETS) for (const s of [-1, 1]) {
    const xk = sx + s * ROAD_W / 2;
    kerbs.push(box(0.2, KERB + 0.1, LEN, xk + s * 0.1, (KERB - 0.1) / 2, 0));                 // bottom 10 cm below the road
    walks.push(box(WALK - 0.2, KERB + 0.1, LEN, xk + s * (0.2 + (WALK - 0.2) / 2), (KERB - 0.12) / 2, 0));   // 2 cm under the kerb top
    // row houses of 11 m, heights 9-15 m (compare: only behind the parked cars, so the low sun reaches them)
    if (MODE === "compare" && s < 0) continue;
    for (let z = -LEN / 2; z < LEN / 2; z += 11) {
      const h = 9 + ((Math.sin(z * 1.7 + sx) * 43758.5) % 1 + 1) % 1 * 6;
      walls.push(box(9, h + 0.5, 10.8, xk + s * (WALK + 4.5), h / 2 - 0.25, z + 5.5));
    }
  }
  for (const [list, m] of [[walks, walkM], [kerbs, kerbM], [walls, wallM]]) {
    const o = new THREE.Mesh(mergeGeometries(list), m); o.castShadow = o.receiveShadow = true; scene.add(o);
  }
}

// ------------------------------------------------------------------------------------------------ the options
// Brussels-ish paints (viewer/cars.js palette, sRGB-ish hex): lots of grey, black, white, some blue / red / green
const STREET_PAINTS = [0x0d0e10, 0x0d0e10, 0x34383d, 0x34383d, 0x5a5e63, 0x9ea4ab, 0x9ea4ab, 0xe8e8e4, 0xe8e8e4, 0x1d3f6e, 0x8a1414, 0x24483a, 0x6b5a48];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const [kenney, quaternius, faceted, scripted] = await Promise.all([loadPack("kenney"), loadPack("quaternius"), loadPack("faceted"), loadCarModel("scripted")]);
const OPTIONS = {
  scripted: { label: "scripted (car.py)", lodDist: CAR_LODS.map((l) => l.until) },
  kenney: { label: "Kenney Car Kit", lodDist: PACK_LODS.map((l) => l.until), pack: kenney },
  quaternius: { label: "Quaternius Cars Pack", lodDist: PACK_LODS.map((l) => l.until), pack: quaternius },
  faceted: { label: "Faceted (carFaceted.py)", lodDist: faceted.lods.map((l) => l.until), pack: faceted },
};

/** Instanced variants of an option: [{ id, lods: [[{ geo, mat }]], tris: [per LOD], keepPaint }] */
function variantsOf(name) {
  if (name === "scripted") {
    const m = scripted, paintMat = new THREE.MeshPhysicalNodeMaterial({ metalness: 0.55, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 });
    paintMat.colorNode = attribute("paint", "vec3");
    const lods = m.lods.map((L) => {
      const byMat = new Map();
      const put = (mat, g) => (byMat.get(mat) || byMat.set(mat, []).get(mat)).push(g);
      for (const p of L.body) put(p.mat, p.geo);
      for (const [k, parts] of Object.entries(L.wheels)) for (const p of parts) put(p.mat, p.geo.clone().translate(...m.wheelPos[k]));
      return [...byMat].map(([mat, gs]) => ({ geo: mergeGeometries(gs), mat: mat === m.mats.Paint ? paintMat : mat }));
    });
    return [{ id: "hatchback", lods, tris: m.lods.map((l) => l.tris), keepPaint: false }];
  }
  const pack = OPTIONS[name].pack, mat = packMaterial({ paint: "instance", lights: { head: carLights.head, tail: carLights.tail }, rich: pack.rich, crossFade: pack.rich });
  return pack.cars.map((c) => ({
    id: c.id, type: c.type, keepPaint: c.keepPaint, defaultPaint: c.paint,
    lods: c.lods.map((L) => [{ geo: mergeGeometries(Object.entries(c.parts).map(([k, p]) => L[k].clone().translate(...p.pos))), mat }]),
    tris: c.lods.map((L) => L.tris),
  }));
}

/** One option's parked cars: InstancedMesh per (variant, LOD, material); LOD + frustum culling per car, every few frames. */
class Fleet {
  constructor(name, slots) {
    this.name = name; this.group = new THREE.Group(); this.group.name = `fleet-${name}`;
    this.variants = variantsOf(name);
    this.lodDist = OPTIONS[name].lodDist;
    this.slots = slots.map((s, i) => {
      // which model: taxis and police cars are rare, vans less common than cars (weights by type)
      const w = this.variants.map((x) => ({ taxi: 0.04, police: 0.02, van: 0.45 }[x.type] ?? 1)), sum = w.reduce((a, b) => a + b, 0);
      let r = hash(i, 3.1) * sum, v = 0;
      while (v < w.length - 1 && r >= w[v]) { r -= w[v]; v++; }
      const V = this.variants[v];
      const c = V.keepPaint ? V.defaultPaint.clone() : new THREE.Color().setHex(STREET_PAINTS[Math.floor(hash(i, 7.7) * STREET_PAINTS.length * 0.999)]);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(s.x, 0, s.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.h), new THREE.Vector3(1, 1, 1));
      return { ...s, v, color: c, m };
    });
    const count = this.variants.map((_, v) => this.slots.filter((s) => s.v === v).length);
    this.meshes = this.variants.map((V, v) => V.lods.map((parts, k) => parts.map(({ geo, mat }) => {
      const g = new THREE.BufferGeometry();
      for (const [n, a] of Object.entries(geo.attributes)) g.setAttribute(n, a);
      g.setIndex(geo.index);
      g.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count[v]) * 3), 3));
      g.setAttribute("lodFade", new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count[v])), 1));
      const im = new THREE.InstancedMesh(g, mat, Math.max(1, count[v]));
      im.count = 0; im.frustumCulled = false; im.castShadow = k < 2; im.receiveShadow = true;
      this.group.add(im);
      return im;
    })));
    this.forceLod = -1;
    this.crossFade = !!OPTIONS[name].pack?.rich;
    this.stats = { cars: 0, perLod: [0, 0, 0], culled: 0, draws: 0, tris: 0 };
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
    this.n = 0;
  }
  update(camera) {
    if (this.n++ % 4) return;
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm, THREE.WebGPUCoordinateSystem, camera.reversedDepth);
    for (const per of this.meshes) for (const l of per) for (const im of l) im.count = 0;
    const st = this.stats; st.cars = 0; st.perLod = this.lodDist.map(() => 0); st.culled = 0; st.tris = 0; st.fading = 0;
    for (const s of this.slots) {
      this.sphere.center.set(s.x, 0.8, s.z);
      if (!this.frustum.intersectsSphere(this.sphere)) { st.culled++; continue; }
      const d = camera.position.distanceTo(this.sphere.center);
      let k = this.forceLod >= 0 ? this.forceLod : this.lodDist.findIndex((u) => d < u);
      if (k < 0) k = this.lodDist.length - 1;
      // cross-fade band of +-10 % around a switch distance (only where the material dithers: lodFade attribute)
      let near = k, far = -1, t = 0;
      if (this.crossFade && this.forceLod < 0) {
        const L = this.lodDist;
        if (k > 0 && d - L[k - 1] < 0.1 * L[k - 1]) { near = k - 1; far = k; t = (d - 0.9 * L[k - 1]) / (0.2 * L[k - 1]); }
        else if (k < L.length - 1 && L[k] - d < 0.1 * L[k]) { near = k; far = k + 1; t = (d - 0.9 * L[k]) / (0.2 * L[k]); }
      }
      const put = (kk, fade) => { for (const im of this.meshes[s.v][kk]) {
        const i = im.count++;
        im.setMatrixAt(i, s.m);
        im.geometry.attributes.paint.setXYZ(i, s.color.r, s.color.g, s.color.b);
        im.geometry.attributes.lodFade?.setX(i, fade);
      } };
      if (far < 0) put(k, 0); else { put(near, Math.min(1, Math.max(0, t))); put(far, 1 + Math.min(1, Math.max(0, t))); st.fading++; }
      k = far < 0 ? k : t < 0.5 ? near : far;
      st.cars++; st.perLod[k]++; st.tris += this.variants[s.v].tris[k];
    }
    st.draws = 0;
    for (const per of this.meshes) for (const l of per) for (const im of l) {
      im.visible = im.count > 0;
      if (im.visible) { st.draws++; im.instanceMatrix.needsUpdate = true; im.geometry.attributes.paint.needsUpdate = true; if (im.geometry.attributes.lodFade) im.geometry.attributes.lodFade.needsUpdate = true; }
    }
  }
}

// ------------------------------------------------------------------------------------------------ compare: three cars at the kerb
const S = {
  option: qp.get("option") || "faceted", kenneyCar: "hatchback", quaterniusCar: "car_a", facetedCar: "hatch_c", paint: "as designed", layout: "trio",
  view: "across the street", time: preset, hour: lighting.hour, post: true, wire: false, night: false, darkGlass: qp.get("glass") === "dark",
  stats: "", bench: "—",
};
const labels = [];
const compareCars = [];
function label(text) { const d = document.createElement("div"); d.className = "lbl"; d.textContent = text; document.body.append(d); labels.push(d); return d; }
const kerbX = STREETS[0] + ROAD_W / 2 - 1.05;          // a parked car's centre, 15 cm off the kerb
async function placeCompare() {
  for (const c of compareCars) scene.remove(c.car.root);
  compareCars.length = 0; labels.splice(0).forEach((d) => d.remove());
  const list = S.layout === "trio"
    ? ["scripted", `kenney:${S.kenneyCar}`, `quaternius:${S.quaterniusCar}`, `faceted:${S.facetedCar}`]
    : S.layout === "faceted family" ? faceted.cars.map((c) => `faceted:${c.id}`)
    : ["scripted", ...kenney.cars.map((c) => `kenney:${c.id}`), ...quaternius.cars.map((c) => `quaternius:${c.id}`), ...faceted.cars.map((c) => `faceted:${c.id}`)];
  const gap = S.layout === "trio" ? 8 : 6.4;
  let z = -((list.length - 1) * gap) / 2;
  for (const spec of list) {
    const model = await loadCarModel(spec);
    const car = createCar(model);
    const len = model.size[2];
    car.update({ x: kerbX, y: 0, z, heading: Math.PI, slopePitch: 0, slopeRoll: 0, heave: 0, pitch: 0, roll: 0, wheelSpin: 0, steerAngle: 0 });
    scene.add(car.root);
    const src = spec.split(":")[0], name = spec === "scripted" ? "scripted hatchback (car.py)" : `${{ kenney: "Kenney", quaternius: "Quaternius", faceted: "Faceted" }[src]} · ${model.label.split(" · ")[1]}`;
    compareCars.push({ spec, model, car, z, lbl: label(`${name}\n${Math.round(model.lods[0].tris).toLocaleString()} tris · ${model.size[2].toFixed(2)} m`) });
    z += Math.max(gap, len + 1.6);
  }
  applyPaint(); applyWire();
}
function applyPaint() {
  for (const c of compareCars) c.model.setPaint(S.paint === "as designed" ? null : PAINTS[S.paint]);
}
function applyWire() {
  for (const c of compareCars) for (const m of Object.values(c.model.mats)) m.wireframe = S.wire;
}
const close = (i) => () => { const c = compareCars[Math.min(i, compareCars.length - 1)]; if (!c) return; camera.position.set(kerbX - 4.6, 1.55, c.z - 5.2); controls.target.set(kerbX, 0.75, c.z); };
const VIEWS = {
  "across the street": () => { camera.position.set(kerbX - 21, 1.7, 0); controls.target.set(kerbX, 1.2, 0); },
  "3/4 front": () => { const z = compareCars.length ? compareCars[0].z : 0; camera.position.set(kerbX - 6.5, 1.65, z - 9); controls.target.set(kerbX, 0.8, z + (S.layout === "trio" ? 6 : 14)); },
  "close: scripted": close(0), "close: Kenney": close(1), "close: Quaternius": close(2), "close: Faceted": close(3),
  "rear 3/4: Faceted": () => { const c = compareCars[Math.min(3, compareCars.length - 1)]; if (!c) return; camera.position.set(kerbX - 4.4, 1.6, c.z + 5.6); controls.target.set(kerbX, 0.75, c.z); },
  "side (pedestrian)": () => { camera.position.set(kerbX - 9.5, 1.6, 0); controls.target.set(kerbX, 0.8, 0); },
  "from a window (8 m)": () => { camera.position.set(kerbX - 12, 8, -10); controls.target.set(kerbX, 0.5, 2); },
  "street, 40 m": () => { camera.position.set(STREETS[0] - 1.5, 1.7, -46); controls.target.set(kerbX, 0.8, 0); },
  "high, 80 m": () => { camera.position.set(STREETS[0] - 60, 55, -50); controls.target.set(kerbX, 0, 0); },
};
const STREET_VIEWS = {
  "down the street": () => { camera.position.set(STREETS[0] - 0.8, 1.7, -LEN / 2 - 2); controls.target.set(STREETS[0] + 0.5, 1.1, 0); },
  "above the streets": () => { camera.position.set(-70, 60, -LEN / 2 - 20); controls.target.set(0, 0, 0); },
  "across, 15 m": () => { camera.position.set(0, 3, -20); controls.target.set(STREETS[1], 0.8, 0); },
};

// ------------------------------------------------------------------------------------------------ street: 300 parked cars
const slots = [];
if (MODE === "street") {
  for (const sx of STREETS) for (const s of [-1, 1]) for (let z = -LEN / 2 + 8; z <= LEN / 2 - 8; z += 5.6)
    slots.push({ x: sx + s * (ROAD_W / 2 - 1.05), z, h: s > 0 ? Math.PI : 0 });
}
const fleets = {};
if (MODE === "street") for (const name of Object.keys(OPTIONS)) { fleets[name] = new Fleet(name, slots); scene.add(fleets[name].group); }
const showFleet = (name) => { for (const [n, f] of Object.entries(fleets)) f.group.visible = n === name; };

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: MODE === "street" ? "Car Lab · street" : "Car Lab · compare" });
if (MODE === "compare") {
  const fc = ui.addFolder("Cars");
  fc.add(S, "layout", ["trio", "faceted family", "lineup (all)"]).name("layout (trio: + faceted)").onChange(() => placeCompare().then(() => VIEWS[S.view]()));
  fc.add(S, "kenneyCar", kenney.cars.map((c) => c.id)).name("Kenney car").onChange(placeCompare);
  fc.add(S, "quaterniusCar", quaternius.cars.map((c) => c.id)).name("Quaternius car").onChange(placeCompare);
  fc.add(S, "facetedCar", faceted.cars.map((c) => c.id)).name("Faceted car").onChange(placeCompare);
  S.glassOpacity = packLook.glassOpacity.value;
  fc.add(S, "glassOpacity", 0.2, 1, 0.01).name("faceted: glass opacity").onChange((v) => { packLook.glassOpacity.value = v; });
  S.clearcoat = packLook.clearcoat.value;
  fc.add(S, "clearcoat", 0, 1, 0.01).name("faceted: clear coat").onChange((v) => { packLook.clearcoat.value = v; });
  fc.add(S, "paint", ["as designed", ...Object.keys(PAINTS)]).name("paint").onChange(applyPaint);
  fc.add(S, "wire").name("wireframe").onChange(applyWire);
  S.compareLod = "auto";
  fc.add(S, "compareLod", ["auto", "LOD0", "LOD1", "LOD2", "LOD3"]).name("LOD (forced: popping check)");
  fc.add(S, "darkGlass").name("packs: dark glass (city fit)").onChange((v) => { packLook.glass.value = v ? 0.12 : 1; });
  fc.add(S, "view", Object.keys(VIEWS)).name("view").onChange((v) => VIEWS[v]());
} else {
  const fs = ui.addFolder("Street");
  fs.add(S, "option", ["none", ...Object.keys(OPTIONS)]).name("cars").onChange(showFleet);
  S.lod = "auto";
  fs.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2", "LOD3"]).name("LOD (LOD3: packs only)").onChange((v) => { for (const f of Object.values(fleets)) f.forceLod = v === "auto" ? -1 : Math.min(+v.slice(3), f.lodDist.length - 1); });
  S.view = "down the street";
  fs.add(S, "view", Object.keys(STREET_VIEWS)).name("view").onChange((v) => STREET_VIEWS[v]());
  fs.add(S, "darkGlass").name("packs: dark glass (city fit)").onChange((v) => { packLook.glass.value = v ? 0.12 : 1; });
  fs.add({ go: () => bench() }, "go").name("benchmark (A/B, all options)");
  fs.add(S, "bench").name("result").listen();
}
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();

packLook.glass.value = S.darkGlass ? 0.12 : 1;
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
if (MODE === "compare") {
  if (qp.get("layout") === "lineup") S.layout = "lineup (all)";
  if (qp.get("kenney")) S.kenneyCar = qp.get("kenney");
  if (qp.get("quaternius")) S.quaterniusCar = qp.get("quaternius");
  if (qp.get("faceted")) S.facetedCar = qp.get("faceted");
  if (qp.get("layout") === "family") S.layout = "faceted family";
  if (qp.get("paint")) S.paint = qp.get("paint");
  if (qp.get("view") && VIEWS[qp.get("view")]) S.view = qp.get("view");
  await placeCompare(); VIEWS[S.view]();
} else {
  if (qp.get("view") && STREET_VIEWS[qp.get("view")]) S.view = qp.get("view");
  showFleet(S.option); STREET_VIEWS[S.view]();
}
ui.controllersRecursive().forEach((c) => c.updateDisplay());

// ------------------------------------------------------------------------------------------------ GPU timing, benchmark
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** A/B: none, scripted, Kenney, Quaternius, twice over, in the current view; median GPU ms per frame (whole frame). */
async function bench({ rounds = 2, settle = 800, measure = 2500 } = {}) {
  const keep = S.option, res = {};
  for (let r = 0; r < rounds; r++) for (const name of ["none", ...Object.keys(OPTIONS)]) {
    S.option = name; showFleet(name);
    await sleep(settle);
    gpu.samples.length = 0;
    await sleep(measure);
    const s = [...gpu.samples].sort((a, b) => a - b), f = fleets[name];
    (res[name] ||= { ms: [], draws: f ? f.stats.draws : 0, tris: f ? f.stats.tris : 0, cars: f ? f.stats.cars : 0, perLod: f ? [...f.stats.perLod] : [] }).ms.push(s.length ? s[Math.floor(s.length / 2)] : NaN);
  }
  S.option = keep; showFleet(keep);
  const base = Math.min(...res.none.ms);
  S.bench = Object.entries(res).filter(([n]) => n !== "none").map(([n, v]) => `${n} ${Math.min(...v.ms).toFixed(2)} ms (+${(Math.min(...v.ms) - base).toFixed(2)})`).join(" · ") + ` · none ${base.toFixed(2)} ms`;
  console.log("[car lab] street benchmark, median GPU ms per round:", JSON.stringify(res));
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
window.lab = { renderer, scene, camera, controls, lighting, pipe, fleets, compareCars, S, bench, gpu, VIEWS, STREET_VIEWS, placeCompare, kenney, quaternius, faceted, scripted };

// ------------------------------------------------------------------------------------------------ loop
const v = new THREE.Vector3();
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  carLights.head.value = carLights.tail.value = S.time === "night" || S.time === "twilight" ? 1 : 0;
  // compare: LOD by distance per car (each model's own distances)
  for (const c of compareCars) {
    const d = camera.position.distanceTo(c.car.root.position);
    let k = c.model.lodDist.findIndex((u) => d < u); if (k < 0) k = c.model.lodDist.length - 1;
    if (S.compareLod !== "auto") k = +S.compareLod.slice(3);
    k = Math.min(k, c.model.lods.length - 1);
    c.car.setLod(k);
    v.set(kerbX, c.model.size[1] + 0.4 + (compareCars.indexOf(c) % 2) * 0.9, c.z).project(camera);
    Object.assign(c.lbl.style, { left: `${(v.x * 0.5 + 0.5) * innerWidth}px`, top: `${(-v.y * 0.5 + 0.5) * innerHeight}px`, display: v.z < 1 && Math.abs(v.x) < 1.1 ? "" : "none" });
  }
  for (const f of Object.values(fleets)) if (f.group.visible) f.update(camera);
  lighting.update(camera.position.y, 0, controls.target, MODE === "street" ? 160 : 60);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    if (MODE === "street") {
      const f = fleets[S.option], st = f?.stats;
      $info.textContent = `${backend} · ${S.stats}\n` + (st ? `${OPTIONS[S.option].label}: ${slots.length} parked, ${st.cars} drawn (${st.perLod.map((n, k) => `LOD${k} ${n}`).join(" · ")}), ${st.culled} culled\n` +
        `car draw calls (main pass) ${st.draws} · car triangles ${(st.tris / 1000).toFixed(1)}k · variants ${f.variants.length} · LODs to ${f.lodDist.join(" / ")} m\n` +
        `triangles per car by LOD: ${f.variants.map((x) => `${x.id} ${x.tris.map((t) => Math.round(t)).join("/")}`).join(", ")}` : "no cars") +
        `\nbenchmark (median GPU ms, whole frame, A/B twice): ${S.bench}\nGPU is shared with other work on this machine: compare options back to back, not absolute numbers.`;
    } else {
      $info.textContent = `${backend} · ${S.stats}\n` + compareCars.map((c) => `${c.spec}: LOD${c.car.lod} ${Math.round(c.model.lods[c.car.lod].tris)} tris (LODs ${c.model.lods.map((l) => Math.round(l.tris)).join(" / ")}), ${c.model.size.map((x) => x.toFixed(2)).join(" x ")} m, ${Object.keys(c.model.mats).length} material(s)`).join("\n") +
        `\nKenney: Car Kit 3.1 (kenney.nl) CC0 · Quaternius: Cars Pack (quaternius.com) CC0 · scripted: tools/blender/car.py · faceted: tools/blender/carFaceted.py`;
    }
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
