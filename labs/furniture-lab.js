// THE FURNITURE LAB: street furniture kit 2 (viewer/furniture2/furnitureKit.js: the city's own loader, LODs, materials
// and pools; docs/assets/FURNITURE2.md) on a lab street: a 4.5 m sidewalk with its kerb and a parking lane. "street":
// one of each where the city puts them (benches facing the road, a row of hoops, the bike box in the parking lane, bins
// beside the bench and at the stop, the white + coloured glass banks); "LOD row": every piece repeated down 400 m, to
// watch the dithered LOD hand-over while moving and to count draws / triangles. Day / night (nothing glows: no light).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { loadFurnitureKit, FurniturePool, BANDS, PIECES } from "../viewer/furniture2/furnitureKit.js";
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
sun.position.set(-6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 0.5, far: 60 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// the lab street: asphalt (z > 0) with a parking lane, a 13 cm kerb at z = 0, a 4.5 m sidewalk (z < 0), 900 m long
const road = new THREE.Mesh(new THREE.PlaneGeometry(1800, 9).rotateX(-Math.PI / 2).translate(300, 0, 4.5), new THREE.MeshStandardNodeMaterial({ color: 0x3a3b3e, roughness: 0.92 }));
const walk = new THREE.Mesh(new THREE.BoxGeometry(1800, 0.13, 4.5).translate(300, 0.065, -2.25), new THREE.MeshStandardNodeMaterial({ color: 0x8b8984, roughness: 0.85 }));
const kerb = new THREE.Mesh(new THREE.BoxGeometry(1800, 0.14, 0.15).translate(300, 0.07, -0.075), new THREE.MeshStandardNodeMaterial({ color: 0xb5b1a7, roughness: 0.7 }));
const line = new THREE.Mesh(new THREE.PlaneGeometry(1800, 0.12).rotateX(-Math.PI / 2).translate(300, 0.004, 2.1), new THREE.MeshStandardNodeMaterial({ color: 0xcfcfc8, roughness: 0.8 }));
for (const m of [road, walk, kerb, line]) { m.receiveShadow = true; scene.add(m); }

const kit = await loadFurnitureKit();
const group = new THREE.Group(); scene.add(group);
const pools = PIECES.map((p) => new FurniturePool(kit.pieces[p], kit.mats, group));
const P = { layout: "street", night: false, wireframe: false, shadows: true, metalSlats: false, tone: 0.5 };
const SW = 0.13;                      // the sidewalk's top
function instances() {
  const L = Object.fromEntries(PIECES.map((p) => [p, []]));
  const add = (p, x, y, z, yaw, mixv = 0, tone = P.tone) => L[p].push(x, y, z, yaw, mixv, tone, 0, 0);
  if (P.layout === "street") {
    // yaw 0: local +z (the piece's road side) = +z here (the road)
    add("bench_street", -6, SW, -2.4, 0, P.metalSlats ? 1 : 0);
    add("bin_round", -4.55, SW, -2.65, 0);
    add("bench_park", -1.2, SW, -2.7, 0, 0, Math.max(0, P.tone - 0.3));
    add("bench_backless", 2.8, SW, -2.3, 0);
    for (let k = 0; k < 4; k++) add("hoop", 6 + k * 1.0, SW, -0.75, Math.PI / 2);          // hoops across the kerb, a row along it
    add("bikebox", 12.5, 0, 1.15, 0);                                                         // in the parking lane, door to the sidewalk
    add("bin_column", 16, SW, -0.5, Math.PI);
    add("glassbank", 19.2, SW, -1.0, Math.PI, 0);                                                   // white glass
    add("glassbank", 21.0, SW, -1.0, Math.PI, 1);                                                   // coloured glass
  } else {
    for (let i = 0; i < 40; i++) {
      const x = i * 10;
      PIECES.forEach((p, k) => add(p, x + (k % 2) * 4, p === "bikebox" ? 0 : SW, p === "bikebox" ? 1.15 : -0.6 - k * 0.45, p === "hoop" ? Math.PI / 2 : 0, p === "glassbank" ? i % 2 : 0));
    }
  }
  return { inst: Object.fromEntries(Object.entries(L).map(([k, a]) => [k, new Float32Array(a)])), fade: 1 };
}
let tiles = [instances()];
const last = new THREE.Vector3(1e9, 0, 0);
function regather(force = false) {
  if (!force && camera.position.distanceToSquared(last) < 4) return;
  for (const p of pools) p.gather(tiles, camera.position);
  last.copy(camera.position);
}
function applyNight() {
  env.uNight.value = P.night ? 1 : 0;
  sun.intensity = P.night ? 0.04 : 2.6;
  scene.environmentIntensity = P.night ? 0.05 : 1;
  scene.background = new THREE.Color(P.night ? 0x0a1020 : 0x9fb3c8);
}
const rebuild = () => { tiles = [instances()]; regather(true); };
const gui = new GUI({ title: "Furniture Lab" });
gui.add(P, "layout", ["street", "LOD row"]).onChange(rebuild);
gui.add(P, "night").onChange(applyNight);
gui.add(P, "metalSlats").name("metal slats (bench)").onChange(rebuild);
gui.add(P, "tone", 0, 1, 0.05).name("wood tone").onChange(rebuild);
gui.add(P, "shadows").onChange((v) => { for (const p of pools) p.lod.forEach((m, k) => { m.castShadow = v && (k < 2 || p.piece.band.shadow2); }); });
gui.add(P, "wireframe").onChange((v) => { for (const m of kit.mats.opaque) m.wireframe = v; });
const views = {
  "street view": [[2, 1.7, 9], [6, 0.6, -1]], "benches": [[-3.5, 1.4, 2.2], [-3.5, 0.5, -2.5]], "bench close": [[-6, 1.0, -0.6], [-6, 0.45, -2.4]],
  "hoops + box": [[9, 1.6, 5.5], [10.5, 0.6, 0]], "bins + banks": [[17.5, 1.5, 3.5], [18.5, 0.8, -0.8]],
  "grazing light": [[-12, 0.8, -1.0], [0, 0.5, -2.4]], "down the street (LODs)": [[-20, 2.2, 3.2], [300, 0.6, -1.0]],
};
for (const [k, [p, t]] of Object.entries(views)) gui.add({ f: () => { camera.position.set(...p); controls.target.set(...t); } }, "f").name(k);
const v0 = views[qp.get("view") || "street view"] || views["street view"];
camera.position.set(...v0[0]); controls.target.set(...v0[1]);
if (qp.get("layout") === "lod") { P.layout = "LOD row"; rebuild(); }
if (qp.get("night") === "1") P.night = true;
applyNight();
regather(true);

const gpu = { samples: [], pending: false };
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let frame = 0;
window.lab = { kit, pools, P, camera, controls, renderer, regather, rebuild, views,
  gpu: () => { const s = gpu.samples.slice(-120).sort((a, b) => a - b); return s.length ? { n: s.length, avg: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] } : null; },
  resetGpu: () => { gpu.samples.length = 0; },
  view: (k) => { const v = views[k]; camera.position.set(...v[0]); controls.target.set(...v[1]); },
  stats: () => ({ draws: renderer.info.render.drawCalls, tris: renderer.info.render.triangles, meshes: pools.reduce((s, p) => s + p.drawn, 0) }) };
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
    const g = window.lab.gpu(), info = renderer.info.render;
    $info.textContent = Object.values(kit.pieces).map((p) => `${p.name.padEnd(15)} LOD0/1/2 ${p.tris.join(" / ")} tris, bands ${BANDS[p.name].lod.join(" / ")} m`).join("\n") +
      `\nfurniture meshes drawn: ${pools.reduce((s, p) => s + p.drawn, 0)}` +
      `\nframe: ${info.drawCalls} draws, ${info.triangles} tris · GPU ${g ? `${g.avg} ms avg, p95 ${g.p95}` : "n/a"} · kit load ${kit.loadMs.toFixed(0)} ms`;
  }
});
