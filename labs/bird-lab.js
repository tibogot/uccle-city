// THE BIRD LAB: the fly-mode bird on its own, up close: every clip, the flight blend, the procedural
// layers (viewer/birdRig.js, the same code fly mode runs), body attitude, a studio or a Uccle evening light,
// wireframe / skeleton / texture views. Model and settings from models/bird/bird.json (the same as fly mode).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import GUI from "lil-gui";
import { BirdRig } from "../viewer/birdRig.js";

const $info = document.getElementById("info");
const DIR = new URL("../models/bird/", import.meta.url).href;

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 200);
camera.position.set(3.2, 1.6, 3.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.35, 0);
controls.enableDamping = true;

// lights: a studio (soft room environment + key light) or a Uccle evening (low warm sun, blue sky fill)
const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = studioEnv;
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x6a6258, 0.4);
scene.add(key, hemi);
const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x9aa3ab, roughness: 0.95 }));
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(12, 24, 0x6f7a85, 0x7f8a95);
grid.position.y = 0.001;
scene.add(grid);

const LIGHTS = {
  studio: () => { scene.environment = studioEnv; scene.environmentIntensity = 1; key.color.set(0xffffff); key.intensity = 2.2; key.position.set(3, 6, 4); hemi.intensity = 0.4; scene.background = new THREE.Color(0x8e9aa6); renderer.toneMappingExposure = 1; },
  "Uccle evening": () => { scene.environment = studioEnv; scene.environmentIntensity = 0.35; key.color.set(0xffc890); key.intensity = 3.2; key.position.set(-5, 2.2, 4); hemi.color.set(0x7fa6e6); hemi.groundColor.set(0x8a6a50); hemi.intensity = 0.8; scene.background = new THREE.Color(0x9bb6d8); renderer.toneMappingExposure = 1.05; },
  "from below (sky)": () => { scene.environment = studioEnv; scene.environmentIntensity = 0.8; key.color.set(0xffffff); key.intensity = 2.5; key.position.set(1, 8, 1); hemi.color.set(0xd0e0ff); hemi.intensity = 1.0; scene.background = new THREE.Color(0xb7cbe6); renderer.toneMappingExposure = 1; },
};

// ---------------------------------------------------------------- the bird
const cfg = await fetch(DIR + "bird.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const P = {
  model: cfg.model || "bird.glb", light: "studio", height: 1.2,
  mode: "flight blend", clip: "Glide", flap: 0, speed: 1, paused: false, time: 0,
  fold: 0, bank: 0, legs: 0, brake: 0, layers: true,
  pitch: 0, roll: 0, turntable: false,
  wireframe: false, skeleton: false, textureOnly: false,
};
let bird = null, mixer = null, actions = {}, rig = null, skel = null, mats = [];
const holder = new THREE.Group();
scene.add(holder);

async function loadModel(file) {
  const gltf = await loader.loadAsync(DIR + file);
  if (bird) holder.remove(bird);
  if (skel) { scene.remove(skel); skel = null; }
  bird = new THREE.Group();
  const m = gltf.scene;
  const fwd = cfg.forward || "-z";
  if (fwd === "+z") m.rotation.y = Math.PI; else if (fwd === "+x") m.rotation.y = Math.PI / 2; else if (fwd === "-x") m.rotation.y = -Math.PI / 2;
  m.scale.setScalar(cfg.scale ?? 1);
  mats = [];
  let tris = 0;
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    mats.push(o.material);
  });
  bird.add(m);
  holder.add(bird);
  mixer = new THREE.AnimationMixer(m);
  actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  for (const a of Object.values(actions)) { a.play(); a.setEffectiveWeight(0); }
  rig = new BirdRig(bird);   // the wrapper (nose -z), as fly mode: the inner model faces +z
  skel = new THREE.SkeletonHelper(m); skel.visible = P.skeleton; scene.add(skel);
  const bones = []; m.traverse((o) => { if (o.isBone) bones.push(o); });
  const tex = mats[0]?.map;
  return { clips: gltf.animations.map((c) => `${c.name} ${c.duration.toFixed(2)} s`), tris: Math.round(tris), bones: bones.length,
    texture: tex ? `${tex.image?.width}x${tex.image?.height}` : "none", size: (await fetch(DIR + file, { method: "HEAD" })).headers.get("content-length") };
}

let stats = await loadModel(P.model);
const clipNames = () => Object.keys(actions);

// ---------------------------------------------------------------- UI
const gui = new GUI({ title: "Bird Lab" });
const fM = gui.addFolder("Model & light");
fM.add(P, "model", ["peregrine.glb", "bird.glb"]).name("model").onChange(async (v) => { stats = await loadModel(v); refreshInfo(); });
fM.add(P, "light", Object.keys(LIGHTS)).onChange((v) => LIGHTS[v]());
fM.add(P, "height", 0, 3, 0.01).name("height above ground (m)");
fM.add(P, "turntable");
const fA = gui.addFolder("Animation");
fA.add(P, "mode", ["flight blend", "single clip"]).name("mode");
fA.add(P, "clip", clipNames()).name("single clip");
fA.add(P, "flap", 0, 1, 0.01).name("flight: glide ↔ flap");
fA.add(P, "speed", 0, 2, 0.01).name("playback speed");
fA.add(P, "paused");
fA.add(P, "time", 0, 1.25, 0.005).name("scrub (when paused)");
const fL = gui.addFolder("Procedural layers (fly mode's)");
fL.add(P, "layers").name("layers on");
fL.add(P, "fold", 0, 1, 0.01).name("1. wings folded (dive)");
fL.add(P, "bank", -0.8, 0.8, 0.01).name("2. bank (rad, + = left turn)");
fL.add(P, "legs", 0, 1, 0.01).name("3. feet tucked");
fL.add(P, "brake", 0, 1, 0.01).name("4. braking");
const fB = gui.addFolder("Body attitude");
fB.add(P, "pitch", -0.8, 0.8, 0.01);
fB.add(P, "roll", -1, 1, 0.01).name("roll (follows bank in flight)");
const fD = gui.addFolder("Views");
fD.add(P, "wireframe").onChange((v) => mats.forEach((m) => { m.wireframe = v; }));
fD.add(P, "skeleton").onChange((v) => { if (skel) skel.visible = v; });
fD.add(P, "textureOnly").name("texture only (unlit)").onChange((v) => mats.forEach((m) => { m.emissiveMap = v ? m.map : null; m.emissive?.set(v ? 0xffffff : 0x000000); m.needsUpdate = true; }));
const VIEWS = {
  side: [3.6, 0.6, 0], front: [0, 0.6, -3.6], back: [0, 0.9, 3.6], above: [0.01, 4.2, 0.01], below: [0.01, -2.4, 0.01], "chase (fly mode)": [0, 0.9, 2.4],
};
for (const [k, p] of Object.entries(VIEWS)) fD.add({ [k]: () => { camera.position.set(p[0], p[1] + P.height * 0.3, p[2]); controls.target.set(0, P.height * 0.3 + 0.3, 0); } }, k);
fD.add({ preset: () => { Object.assign(P, { mode: "flight blend", flap: 0, fold: 0.8, bank: 0, brake: 0, pitch: -0.5 }); gui.controllersRecursive().forEach((c) => c.updateDisplay()); } }, "preset").name("preset: dive");
fD.add({ preset: () => { Object.assign(P, { mode: "flight blend", flap: 0.2, fold: 0, bank: 0.6, brake: 0, pitch: 0, roll: 0.6 }); gui.controllersRecursive().forEach((c) => c.updateDisplay()); } }, "preset").name("preset: left turn");
fD.add({ preset: () => { Object.assign(P, { mode: "flight blend", flap: 0, fold: 0, bank: 0, brake: 1, pitch: 0.35 }); gui.controllersRecursive().forEach((c) => c.updateDisplay()); } }, "preset").name("preset: braking");
fD.add({ preset: () => { Object.assign(P, { mode: "single clip", clip: "Idle", fold: 0, bank: 0, legs: 0, brake: 0, pitch: 0, roll: 0, height: 0 }); gui.controllersRecursive().forEach((c) => c.updateDisplay()); } }, "preset").name("preset: perched");

function refreshInfo() {
  $info.textContent = `${P.model}  ${(stats.size / 1024).toFixed(0)} KB · ${stats.tris} triangles · ${stats.bones} bones · texture ${stats.texture}\n` +
    `clips: ${stats.clips.join(" · ")}\n` +
    `rig calibration (bone axis per layer):\n` + Object.entries(rig.found).map(([k, v]) => `  ${k.padEnd(9)} ${v ?? "—"}`).join("\n") +
    `\ndrag to orbit · wheel to zoom · right-drag to pan`;
}
refreshInfo();

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (bird && mixer) {
    // weights: the fly-mode blend (Glide <-> Flap) or one clip alone
    for (const [name, a] of Object.entries(actions)) {
      let w = 0;
      if (P.mode === "single clip") w = name === P.clip ? 1 : 0;
      else if (name === "Flap") w = P.flap; else if (name === "Glide") w = 1 - P.flap;
      a.setEffectiveWeight(w);
      a.timeScale = name === "Flap" ? 0.8 + 0.8 * P.flap : 1;
    }
    rig.restore();
    if (P.paused) { for (const a of Object.values(actions)) a.time = P.time % a.getClip().duration; mixer.update(0); }
    else mixer.update(dt * P.speed);
    if (P.layers) rig.apply({ fold: P.fold, bank: P.bank, legs: P.legs, brake: P.brake });
    holder.position.y = P.height;
    bird.rotation.set(P.pitch, 0, P.roll, "YXZ");
    if (P.turntable) holder.rotation.y += dt * 0.4;
  }
  controls.update();
  renderer.render(scene, camera);
});
