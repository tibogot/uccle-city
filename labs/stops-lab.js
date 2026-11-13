// THE STOPS LAB: the STIB stops kit (viewer/stops/stopKit.js: the city's own loader, LODs, materials and pools) on a lab
// street: a sidewalk with its kerb, a shelter (poster case, bench, glass), a stop pole and a free-standing ad panel, by day
// or by night (the posters, the case margins and the roof strip glow: no light added). "street of 40": 40 of each along
// 600 m, to watch the dithered LOD hand-over while moving and to measure draws / GPU ms. The stop name and line numbers
// on the flag are the street-life layer's text (the city).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { loadStopKit, StopPool, BANDS } from "../viewer/stops/stopKit.js";
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
camera.position.set(5.5, 1.7, 7.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-1.5, 1.3, -1.2);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 60 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// the lab street: asphalt (z > 0), a 13 cm kerb at z = 0, a 4.5 m sidewalk (z < 0), 700 m long
const road = new THREE.Mesh(new THREE.PlaneGeometry(1400, 8).rotateX(-Math.PI / 2).translate(0, 0, 4), new THREE.MeshStandardNodeMaterial({ color: 0x3a3b3e, roughness: 0.92 }));
const walk = new THREE.Mesh(new THREE.BoxGeometry(1400, 0.13, 4.5).translate(0, 0.065, -2.25), new THREE.MeshStandardNodeMaterial({ color: 0x8b8984, roughness: 0.85 }));
const kerb = new THREE.Mesh(new THREE.BoxGeometry(1400, 0.14, 0.15).translate(0, 0.07, -0.075), new THREE.MeshStandardNodeMaterial({ color: 0xb5b1a7, roughness: 0.7 }));
for (const m of [road, walk, kerb]) { m.receiveShadow = true; scene.add(m); }

const kit = await loadStopKit();
const group = new THREE.Group(); scene.add(group);
const pools = ["shelter", "pole", "adpanel"].map((p) => new StopPool(kit.pieces[p], kit.mats, group));
const P = { layout: "one of each", night: false, wireframe: false, shadows: true, posterA: 0, posterB: 4 };
const Y = 0.13;
function instances() {
  const L = { shelter: [], pole: [], adpanel: [] };
  const n = P.layout === "street of 40" ? 40 : 1;
  for (let i = 0; i < n; i++) {
    const x0 = i * 15 - (n > 1 ? 0 : 0);
    L.shelter.push(x0, Y, -1.4, 0, (P.posterA + i) % 8, (P.posterB + i) % 8, 0, 0);       // roof edge 0.6 m behind the kerb
    L.pole.push(x0 + 3.0, Y, -0.45, 0, 0, 0, 0, 0);                                        // the pole at the open end
    L.adpanel.push(x0 - 7.5, Y, -1.32, 0, (P.posterA + 3 + i) % 8, (P.posterB + 5 + i) % 8, 0, 0);   // across the sidewalk
  }
  return { inst: Object.fromEntries(Object.entries(L).map(([k, a]) => [k, new Float32Array(a)])), fade: 1 };
}
let tiles = [instances()];
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
const gui = new GUI({ title: "Stops Lab" });
gui.add(P, "layout", ["one of each", "street of 40"]).onChange(() => { tiles = [instances()]; regather(true); });
gui.add(P, "night").onChange(applyNight);
gui.add(P, "posterA", 0, 7, 1).name("poster A").onChange(() => { tiles = [instances()]; regather(true); });
gui.add(P, "posterB", 0, 7, 1).name("poster B").onChange(() => { tiles = [instances()]; regather(true); });
gui.add(P, "shadows").onChange((v) => { for (const p of pools) for (const m of p.lod) m.castShadow = v; });
gui.add(P, "wireframe").onChange((v) => { for (const m of kit.mats.opaque) m.wireframe = v; });
const views = {
  "street view": [[5.5, 1.7, 7.5], [-1.5, 1.3, -1.2]], "inside the shelter": [[0.9, 1.6, -0.2], [-1.9, 1.3, -0.6]],
  "the flag": [[4.4, 2.8, 1.2], [3.0, 2.85, -0.45]], "ad panel": [[-4.5, 1.6, 2.5], [-7.5, 1.5, -1.3]],
  "grazing light": [[-12, 1.2, 1.0], [-1.9, 1.2, -1.2]], "down the street (LODs)": [[-20, 2.2, 3.2], [200, 1.0, -1.2]],
};
for (const [k, [p, t]] of Object.entries(views)) gui.add({ f: () => { camera.position.set(...p); controls.target.set(...t); } }, "f").name(k);
applyNight();
regather(true);

const gpu = { samples: [], pending: false };
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let frame = 0;
window.lab = { kit, pools, P, camera, controls, renderer, regather, gpu: () => { const s = gpu.samples.slice(-120).sort((a, b) => a - b); return s.length ? { n: s.length, avg: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] } : null; }, resetGpu: () => { gpu.samples.length = 0; } };
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
    $info.textContent = Object.values(kit.pieces).map((p) => `${p.name.padEnd(8)} LOD0/1/2 ${p.tris.join(" / ")} tris, bands ${BANDS[p.name].lod.join(" / ")} m`).join("\n") +
      `\nstops meshes drawn: ${pools.reduce((s, p) => s + p.drawn, 0)} (${pools.flatMap((p) => p.meshes.filter((m) => m.visible).map((m) => `${m.name.slice(6)} ${m.count}`)).join(", ")})` +
      `\nframe: ${info.drawCalls} draws, ${info.triangles} tris · GPU ${g ? `${g.avg} ms avg, p95 ${g.p95}` : "n/a"} · kit load ${kit.loadMs.toFixed(0)} ms`;
  }
});
