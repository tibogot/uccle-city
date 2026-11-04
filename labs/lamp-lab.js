// THE LAMP LAB: the Blender lamp (models/lamp/brussels_lamp.glb, via viewer/lampModel.js: the city's own loader,
// LODs and materials) on its own. Three lamps side by side = LOD0 / LOD1 / LOD2 with their triangle counts, or one
// lamp at a chosen distance showing the LOD the city would draw there; day / night (the glass glows, a pool lights
// the pavement); wireframe.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { loadLampModel, LAMP_LODS } from "../viewer/lampModel.js";
import { env } from "../viewer/lighting.js";

const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 2000);
camera.position.set(6, 3.5, 9);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.2, 0);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
scene.add(sun);
const pave = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x55575c, roughness: 0.9 }));
pave.receiveShadow = true;
scene.add(pave);
const pools = [];          // night: a point light under each lamp's globe

const model = await loadLampModel();
if (!model) { $info.textContent = "models/lamp/brussels_lamp.glb not found"; throw new Error("no lamp"); }
const P = { view: "LODs side by side", distance: 40, night: false, wireframe: false };
const holder = new THREE.Group();
scene.add(holder);

function build() {
  holder.clear(); for (const l of pools) scene.remove(l); pools.length = 0;
  const lamps = P.view === "LODs side by side" ? [0, 1, 2].map((k) => ({ k, x: (k - 1) * 3.2 })) : [{ k: LAMP_LODS.findIndex((l) => P.distance < l.until), x: 0 }];
  for (const { k, x } of lamps) {
    if (k < 0) continue;
    const l = model.lods[k];
    for (const [geo, mat] of [[l.iron, model.iron], [l.glass, model.glass]]) {
      const m = new THREE.Mesh(geo, mat); m.position.x = x; m.castShadow = true; holder.add(m);
    }
    const pl = new THREE.PointLight(0xffc27a, 0, 18, 2);
    pl.position.set(x, 5.95, -1.05); pools.push(pl); scene.add(pl);
  }
  applyNight();
}
function applyNight() {
  env.uNight.value = P.night ? 1 : 0;
  sun.intensity = P.night ? 0.05 : 2.4;
  scene.environmentIntensity = P.night ? 0.06 : 1;
  scene.background = new THREE.Color(P.night ? 0x0b1222 : 0x9fb3c8);
  for (const l of pools) l.intensity = P.night ? 60 : 0;
}
function single() {
  if (P.view !== "at a distance") return;
  build();
  camera.position.set(P.distance * 0.7, 1.7, P.distance * 0.7); controls.target.set(0, 3.5, 0);
}

const gui = new GUI({ title: "Lamp Lab" });
gui.add(P, "view", ["LODs side by side", "at a distance"]).onChange(() => { build(); if (P.view === "at a distance") single(); else { camera.position.set(6, 3.5, 9); controls.target.set(0, 3.2, 0); } });
gui.add(P, "distance", 5, 450, 1).name("distance (m)").onChange(single);
gui.add(P, "night").onChange(applyNight);
gui.add(P, "wireframe").onChange((v) => { model.iron.wireframe = model.glass.wireframe = v; });
gui.add({ f: () => { camera.position.set(0.8, 6.2, 1.6); controls.target.set(0, 5.9, -1.05); } }, "f").name("lantern close-up");
gui.add({ f: () => { camera.position.set(6, 3.5, 9); controls.target.set(0, 3.2, 0); } }, "f").name("whole lamp");

build();
$info.textContent = model.lods.map((l, k) => `LOD${k}: ${l.tris} triangles, ${k ? `meshoptimizer ${(LAMP_LODS[k].error * 100).toFixed(1)} cm error` : "the Blender model"}, used up to ${LAMP_LODS[k].until} m`).join("\n") +
  `\nleft to right in "side by side": LOD0, LOD1, LOD2 · source tools/blender/brusselsLamp.py`;

const clock = new THREE.Clock();
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop(() => { clock.getDelta(); controls.update(); renderer.render(scene, camera); });
