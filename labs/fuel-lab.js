// THE FUEL LAB: the petrol station kit (viewer/fuel/fuelKit.js: the city's own loader, LODs, materials and pools) with ONE
// real station from the data (data/fuel/<T>.json, tools/fuel/build_fuel.py): its canopy, islands, dispensers, totem, shop
// front, forecourt slab, laid out as in the city (moved to the origin), on a plain ground at the slab's lowest height.
// Day / night (the fascia LED line, soffit panels, screens, signs glow: no light added), a scheme override, and a "LOD
// row": the island set (island, hoops, dispenser, column, sleeve) and a totem every 25 m along 600 m, to watch the
// dithered LOD hand-over while moving and to measure draws / triangles / GPU ms.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { loadFuelKit, FuelPool, BANDS, PIECES, buildStation } from "../viewer/fuel/fuelKit.js";
import { fuelInstances, slabGeometry, forecourtMaterial } from "../viewer/fuel/cityFuel.js";
import { loadPavingTextures } from "../viewer/streets/paving.js";
import { lodEye } from "../viewer/lodFade.js";
import { env } from "../viewer/lighting.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-14, 22, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 0.5, far: 90 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x45464a, roughness: 0.93 }));
ground.receiveShadow = true; scene.add(ground);

await loadPavingTextures(renderer);
const kit = await loadFuelKit();
const summary = await fetch("../data/fuel/summary.json").then((r) => r.json());
const group = new THREE.Group(); scene.add(group);
const pools = PIECES.map((p) => new FuelPool(kit.pieces[p], kit.mats, group));
const names = Object.fromEntries(summary.stations.map((s) => [`${s.name} (${s.tile})`, s]));
const P = { station: Object.keys(names).find((k) => k.startsWith(qp.get("s") || "Lukoil, Wolvendael")) || Object.keys(names)[0], scheme: "data", layout: "station", night: false, wireframe: false, shadows: true };
const slabGroup = new THREE.Group(); scene.add(slabGroup);
let tiles = [], origin = [0, 0, 0], doc = null;

async function load() {
  const s = names[P.station];
  const d = await fetch(`../data/fuel/${s.tile}.json`).then((r) => r.json());
  const st = d.stations.find((x) => x.id === s.id);
  doc = { stations: [st] };
  const c = st.canopy || st.slab;
  const y0 = st.slab ? Math.min(...st.slab.ys) - 0.03 : 0;
  origin = [c.cx, y0, c.cz];
  document.getElementById("city").href = `../viewer/index.html?at=${Math.round(c.cx)},${Math.round(c.cz)}`;
  build();
  const w = st.canopy ? Math.max(st.canopy.w, st.canopy.d) : 12;
  camera.position.set(w * 0.9, 3.0, w * 1.1); controls.target.set(0, 2.0, 0);
}
const stationGroup = new THREE.Group(); scene.add(stationGroup);
async function build() {
  const st = doc.stations[0];
  const scheme = P.scheme === "data" ? st.scheme : kit.brands.schemes.indexOf(P.scheme);
  const inst = fuelInstances({ stations: [{ ...st, scheme }] });
  const [ox, oy, oz] = origin;
  if (P.layout === "LOD row") {
    stationGroup.clear();
    // the island set + a totem every 25 m along +x (the dispenser faces +-z), the canopy pieces left out
    const L = {};
    const put = (k, x, y, z, yaw, s = [1, 1, 1]) => (L[k] ||= []).push(x, y, z, yaw, ...s, scheme);
    for (let i = 0; i < 24; i++) {
      const x = i * 25;
      put("island", x, 0, 0, 0);
      put("dispenser", x - 0.55, 0.16, 0, 0); put("canopy_column", x + 1.65, -0.5, 0, 0, [1, 5.0, 1]); put("column_base", x + 1.65, 0.16, 0, 0);
      put("totem", x + 6, 0, 4, Math.PI / 2); put("bollard", x + 6, 0, 2.6, 0);
    }
    tiles = [{ inst: Object.fromEntries(Object.entries(L).map(([k, a]) => [k, new Float32Array(a)])) }];
  } else {
    for (const a of Object.values(inst)) for (let o = 0; o < a.length; o += 8) { a[o] -= ox; a[o + 1] -= oy; a[o + 2] -= oz; }
    tiles = [];
    // as the city draws it (viewer/fuel/cityFuel.js): the station's pieces merged, LOD0 / 1 / 2 + signs + glass
    const geos = await buildStation(kit, inst, scheme, 0);
    stationGroup.clear();
    const M = kit.mats;
    for (const [k, g] of Object.entries(geos)) {
      const m = new THREE.Mesh(g, k === "sign" ? M.sign : k === "glass" ? M.glass : M.opaque[+k.slice(3)]);
      m.castShadow = k.startsWith("lod"); m.receiveShadow = true; if (k === "glass") m.renderOrder = 2;
      stationGroup.add(m);
    }
  }
  slabGroup.clear();
  if (P.layout === "station" && st.slab) {
    const S = { ...st.slab, cx: st.slab.cx - ox, cz: st.slab.cz - oz, ys: st.slab.ys.map((y) => y - oy) };
    const m = new THREE.Mesh(slabGeometry(S), forecourtMaterial()); m.receiveShadow = true; slabGroup.add(m);
  }
  ground.position.y = -0.002;
  regather(true);
}
const last = new THREE.Vector3(1e9, 0, 0);
function regather(force = false) {
  if (!force && camera.position.distanceToSquared(last) < 16) return;
  for (const p of pools) p.gather(tiles, camera.position);
  last.copy(camera.position);
}
function applyNight() {
  env.uNight.value = P.night ? 1 : 0;
  sun.intensity = P.night ? 0.04 : 2.6;
  scene.environmentIntensity = P.night ? 0.05 : 1;
  scene.background = new THREE.Color(P.night ? 0x0a1020 : 0x9fb3c8);
}
const gui = new GUI({ title: "Fuel Lab" });
gui.add(P, "station", Object.keys(names)).onChange(load);
gui.add(P, "scheme", ["data", ...kit.brands.schemes]).onChange(build);
gui.add(P, "layout", ["station", "LOD row"]).onChange(() => { build(); if (P.layout === "LOD row") { camera.position.set(-12, 2.0, 7); controls.target.set(60, 1.2, 0); } });
gui.add(P, "night").onChange(applyNight);
gui.add(P, "shadows").onChange((v) => { for (const p of pools) for (const m of p.lod) m.castShadow = v && p.piece.band.shadow; });
gui.add(P, "wireframe").onChange((v) => { for (const m of kit.mats.opaque) m.wireframe = v; });
const views = {
  "street view": () => { camera.position.set(14, 1.7, 16); controls.target.set(0, 2.2, 0); },
  "at the pump": () => { camera.position.set(2.6, 1.6, 3.0); controls.target.set(-0.5, 1.1, 0); },
  "under the canopy": () => { camera.position.set(-3, 1.7, 2.5); controls.target.set(2, 4.6, -1); },
  "aerial": () => { camera.position.set(0, 45, 20); controls.target.set(0, 0, 0); },
  "grazing light": () => { camera.position.set(-22, 1.2, 4); controls.target.set(0, 2.5, 0); },
};
for (const [k, f] of Object.entries(views)) gui.add({ f }, "f").name(k);
applyNight();
await load();

const gpu = { samples: [], pending: false };
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let frame = 0;
window.lab = { kit, pools, P, camera, controls, renderer, scene, regather, load, build, views, applyNight, doc: () => doc,
  gpu: () => { const s = gpu.samples.slice(-120).sort((a, b) => a - b); return s.length ? { n: s.length, avg: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] } : null; },
  resetGpu: () => { gpu.samples.length = 0; } };
renderer.setAnimationLoop(() => {
  controls.update();
  lodEye.value.copy(camera.position);
  regather();
  renderer.render(scene, camera);
  if (renderer.backend.trackTimestamp && !gpu.pending && frame % 4 === 0) {
    gpu.pending = true;
    renderer.resolveTimestampsAsync("render").then((ms) => { if (ms) gpu.samples.push(+ms.toFixed(3)); gpu.pending = false; }).catch(() => { gpu.pending = false; });
  }
  if (++frame % 30 === 0) {
    const g = window.lab.gpu(), info = renderer.info.render, st = doc?.stations[0];
    $info.textContent = (st ? `${st.name}\n${st.type}, ${st.islands} island(s), scheme ${kit.brands.schemes[st.scheme]}${st.canopy ? `, canopy ${st.canopy.w} x ${st.canopy.d} m, top ${st.canopy.h} m (${st.canopy.src})` : ""}\n` : "") +
      `kit LOD0 ${PIECES.reduce((s, p) => s + kit.pieces[p].tris[0], 0)} tris over ${PIECES.length} pieces · fuel meshes drawn: ${pools.reduce((s, p) => s + p.drawn, 0)}` +
      `\nframe: ${info.drawCalls} draws, ${info.triangles} tris · GPU ${g ? `${g.avg} ms avg, p95 ${g.p95}` : "n/a"} · kit load ${kit.loadMs.toFixed(0)} ms`;
  }
});
