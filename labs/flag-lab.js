// THE FLAG LAB: flags on poles, Verlet cloth near the camera and a baked loop everywhere else (viewer/flags/).
//   - the town hall's three balcony poles (models/townhall/townhall.json flag_poles: EU / Belgium / Uccle as on the
//     photos), with the town hall model behind them (toggle);
//   - three 9 m masts on the square (Belgium / EU / Uccle);
//   - a field of N flags for the cost test (all baked: one draw per design);
//   - modes: auto (live within a radius, up to N flags, the rest baked; hand-over both ways without a pop), all live,
//     all baked; wind speed / direction / gusts, fabric, size; read-outs: live flags, CPU ms of the cloth per frame,
//     bake time, instances.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { FABRIC } from "../viewer/flags/flagCloth.js";
import { BakedFlags, LiveFlag, wallPlanesFrom } from "../viewer/flags/flagField.js";
import { FLAG_DESIGNS, flagTexture } from "../viewer/flags/flagDesigns.js";

const $info = document.getElementById("info");
const qp = new URLSearchParams(location.search);
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb3c8);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
const sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const GROUND_Y = 61.05;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x8d8a83, roughness: 0.95 }));
ground.position.set(-1100, GROUND_Y, -500); ground.receiveShadow = true;
scene.add(ground);

// ---------- the town hall (optional backdrop) ----------
const notes = await fetch("../models/townhall/townhall.json").then((r) => r.json()).catch(() => null);
let hall = null;
if (notes && !qp.has("nohall")) {
  try {
    const { loadTownHall } = await import("../viewer/townhallModel.js");
    const m = await loadTownHall();
    hall = new THREE.Group();
    hall.position.copy(m.placement.position); hall.rotation.y = m.placement.rotationY;
    const lod0 = m.make(0); hall.add(lod0);
    lod0.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(hall); hall.updateMatrixWorld(true);
  } catch (e) { console.warn("town hall model:", e.message); }
}

// ---------- poles ----------
const P = {
  mode: "auto (live near)", liveRadius: 40, maxLive: 6,
  wind: 5, windDir: 60, gust: 0.35, turbulence: 0.25, fabric: "polyester", size: 1.0,
  field: 120, hall: !!hall, slow: false, pause: false,
  stats: "", stats2: "", stats3: "",
};
const poleMat = new THREE.MeshStandardNodeMaterial({ color: 0x2f3a33, roughness: 0.5, metalness: 0.6 });
const poleGroup = new THREE.Group(); scene.add(poleGroup);
const flags = [];       // { name, design, top: Vector3, axis: [3], vertical, set, index, live, state, dist }
const sets = new Map(); // key -> BakedFlags
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function addPoleMesh(base, tip, r) {
  const d = tip.clone().sub(base), L = d.length();
  const g = new THREE.CylinderGeometry(r, r * 1.15, L, 12).translate(0, L / 2, 0);
  const m = new THREE.Mesh(g, poleMat); m.position.copy(base);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; poleGroup.add(m);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r * 2.2, 16, 10), poleMat); ball.position.copy(tip); ball.castShadow = true; poleGroup.add(ball);
}

function definePoles() {
  const list = [];
  // the town hall's balcony poles, as measured (tip end), flags as on the photos (P01: EU / Belgium / Uccle)
  const design = { south: "eu", centre: "belgium", north: "uccle" };
  for (const p of notes?.flag_poles ?? []) {
    const base = v3(p.base_city_xyz), tip = v3(p.tip_city_xyz), axis = tip.clone().sub(base).normalize();
    list.push({ name: `town hall ${p.name}`, design: design[p.name] ?? "belgium", base, tip, r: p.radius_m, axis, vertical: false, w: 1.5, h: 1.0 });
  }
  // three masts on the square in front
  ["belgium", "eu", "uccle"].forEach((d, k) => {
    const base = new THREE.Vector3(-1112, GROUND_Y, -511 + k * 5.5), tip = base.clone().add(new THREE.Vector3(0, 9, 0));
    list.push({ name: `mast ${d}`, design: d, base, tip, r: 0.055, axis: new THREE.Vector3(0, 1, 0), vertical: true, w: 2.25, h: 1.5 });
  });
  return list;
}

// the wind turns smoothly towards the slider (~45 deg/s): the masts' flags follow it without a snap
let curYaw = THREE.MathUtils.degToRad(P.windDir);
const targetYaw = () => THREE.MathUtils.degToRad(P.windDir);
const windYaw = () => curYaw;
function wallPlanes(top) { return hall ? wallPlanesFrom(hall, top) : []; }
const windVec = (a = curYaw) => [Math.cos(a), 0, -Math.sin(a)];
let bakeMs = 0;

async function buildAll() {
  for (const f of flags) if (f.live) { scene.remove(f.live.mesh); f.live.mesh.geometry.dispose(); f.set?.setVisible?.(f.index, true); }
  const old = [...sets.values()].filter((s) => s.mesh);     // kept on screen until the new bakes are in
  flags.length = 0; sets.clear(); poleGroup.clear(); bakeMs = 0;
  const yaw = windYaw(), poles = definePoles();
  const fab = FABRIC[P.fabric];
  const setFor = (key, clothOpts, design, capacity) => {
    if (!sets.has(key)) sets.set(key, { clothOpts, design, capacity, adds: [] });   // baked below, in the worker
    return sets.get(key);
  };
  const fieldN = Math.round(P.field);
  for (const p of poles) {
    addPoleMesh(p.base, p.tip, p.r);
    const top = p.tip.clone().addScaledVector(p.axis, -0.12);
    const w = p.w * P.size, h = p.h * P.size;
    // vertical masts: baked with the wind along +x, each flag turned to the wind (yaw); a fixed angled pole: baked in
    // world space with the real wind (yaw 0), re-recorded when the wind turns
    const cloth = p.vertical ? { width: w, height: h, axis: [0, 1, 0], out: [1, 0, 0], fabric: fab }
      : { width: w, height: h, axis: [p.axis.x, p.axis.y, p.axis.z], out: windVec(), windDir: windVec(), fabric: fab, planes: wallPlanes(top, p.axis) };
    const key = p.vertical ? `v:${p.design}:${w}x${h}` : `a:${p.name}`;
    const set = setFor(key, cloth, p.design, p.vertical ? 3 + fieldN : 1);
    const index = set.adds.push([top, { yaw: p.vertical ? yaw : 0, phase: Math.random() }]) - 1;
    flags.push({ planes: cloth.planes, setKey: key, name: p.name, design: p.design, top, axis: [p.axis.x, p.axis.y, p.axis.z], vertical: p.vertical, set, index, live: null, state: "baked", w, h, fab });
  }
  // the cost field: vertical 6 m masts in a grid east of the square, the three designs
  const keys = ["belgium", "eu", "uccle"], cols = Math.ceil(Math.sqrt(fieldN)), fieldPoles = [];
  for (let k = 0; k < fieldN; k++) {
    const d = keys[k % 3], w = 1.5 * P.size, h = 1.0 * P.size;
    const set = setFor(`v:${d}:${w}x${h}`, { width: w, height: h, axis: [0, 1, 0], out: [1, 0, 0], fabric: fab }, d, 3 + fieldN);
    const x = -1080 + (k % cols) * 9, z = -560 + Math.floor(k / cols) * 9;
    const base = new THREE.Vector3(x, GROUND_Y, z), tip = base.clone().add(new THREE.Vector3(0, 6, 0));
    fieldPoles.push(base);
    const top = tip.clone().add(new THREE.Vector3(0, -0.12, 0));
    const index = set.adds.push([top, { yaw, phase: Math.random() }]) - 1;
    flags.push({ setKey: `v:${d}:${w}x${h}`, name: `field ${k}`, design: d, top, axis: [0, 1, 0], vertical: true, set, index, live: null, state: "baked", w, h, fab });
  }
  if (fieldPoles.length) {                                   // the field's 6 m poles: one instanced draw
    const g = new THREE.CylinderGeometry(0.045, 0.052, 6, 8).translate(0, 3, 0);
    const im = new THREE.InstancedMesh(g, poleMat, fieldPoles.length), M = new THREE.Matrix4();
    fieldPoles.forEach((b, k) => im.setMatrixAt(k, M.makeTranslation(b.x, b.y, b.z)));
    im.castShadow = true; poleGroup.add(im);
  }
  const gen = ++buildGen, t0 = performance.now();
  building = true;
  const built = await Promise.all([...sets.entries()].map(async ([key, d]) => {
    const s = await BakedFlags.create({ cloth: d.clothOpts, map: flagTexture(d.design, renderer), capacity: d.capacity, speed: P.wind });
    for (const [top, o] of d.adds) s.add(top.x, top.y, top.z, o);
    s.setWind(P.wind);
    return [key, s];
  }));
  if (gen !== buildGen) return;                              // a newer build started meanwhile
  bakeMs = performance.now() - t0;
  for (const [key, s] of built) { sets.set(key, s); scene.add(s.mesh); }
  for (const s of old) { scene.remove(s.mesh); s.geometry.dispose(); }
  for (const f of flags) f.set = sets.get(f.setKey);
  await renderer.compileAsync(scene, camera);
  building = false;
}
let buildGen = 0, building = false;

/** wind direction changed: turn the masts' flags; re-bake the angled poles' loops (their frame depends on it) */
let rebakeTimer = 0;
function onWindDir() {
  clearTimeout(rebakeTimer);
  rebakeTimer = setTimeout(() => {               // angled poles: a new loop with the new wind, cross-faded in
    for (const f of flags) if (!f.vertical) f.set.retarget(P.wind, { ...f.set.clothOpts, out: windVec(targetYaw()), windDir: windVec(targetYaw()) });
  }, 350);
}

// ---------- live / baked switching ----------
const live = () => flags.filter((f) => f.live);
function makeLive(f, t) {
  const yaw = windYaw();
  f.live = new LiveFlag({ cloth: { width: f.w, height: f.h, axis: f.axis, out: windVec(), fabric: f.fab, planes: f.planes ?? [] }, map: flagTexture(f.design, renderer) });
  Object.assign(f.live.cloth.wind, { speed: P.wind, dir: windVec(), gust: P.gust, turbulence: P.turbulence });
  f.live.startFrom(f.set.stateAt(f.index, t), f.vertical ? yaw : 0);          // carry on from the baked pose: no pop
  f.live.mesh.position.copy(f.top);
  scene.add(f.live.mesh);
  f.set.setVisible(f.index, false);
  f.state = "live";
}
function dropLive(f) {
  scene.remove(f.live.mesh); f.live.mesh.geometry.dispose(); f.live = null;
  f.set.setVisible(f.index, true); f.state = "baked";
}

const clock = new THREE.Clock();
let t = 0, simAvg = 0, frames = 0, fpsAvg = 60;
function tick() {
  const dtReal = Math.min(clock.getDelta(), 0.1), dt = P.pause ? 0 : dtReal * (P.slow ? 0.25 : 1);
  t += dt;
  const cam = camera.position;
  if (building) { controls.update(); renderer.render(scene, camera); requestAnimationFrame(tick); return; }
  for (const f of flags) f.dist = cam.distanceTo(f.top);
  // who should be live
  let want;
  if (P.mode === "all baked") want = new Set();
  else if (P.mode === "all live (poles only)") want = new Set(flags.filter((f) => !f.name.startsWith("field")));
  else {
    const near = flags.filter((f) => f.dist < P.liveRadius + (f.live ? 5 : 0)).sort((a, b) => a.dist - b.dist).slice(0, Math.round(P.maxLive));
    want = new Set(near);
  }
  for (const f of flags) {
    if (want.has(f) && f.state === "baked") makeLive(f, t);
    else if (want.has(f) && f.state === "handback") { f.live.blend = null; f.state = "live"; }
    else if (!want.has(f) && f.state === "live") { f.live.handBack(() => f.set.stateAt(f.index, t), f.vertical ? windYaw() : 0); f.state = "handback"; }
  }
  // turn the wind towards the slider
  let dy = Math.atan2(Math.sin(targetYaw() - curYaw), Math.cos(targetYaw() - curYaw));
  if (Math.abs(dy) > 1e-4) {
    curYaw += Math.sign(dy) * Math.min(Math.abs(dy), THREE.MathUtils.degToRad(45) * dtReal);
    for (const f of flags) if (f.vertical && f.set?.setYaw) f.set.setYaw(f.index, curYaw);
  }
  let sim = 0;
  for (const s of sets.values()) { s.setWind(P.wind); s.update(t, dt); }
  for (const f of live()) {
    Object.assign(f.live.cloth.wind, { speed: P.wind, dir: windVec(), gust: P.gust, turbulence: P.turbulence });
    const going = f.live.update(dt);
    sim += f.live.simMs;
    if (f.state === "handback" && !going) dropLive(f);
  }
  simAvg += (sim - simAvg) * 0.05; frames++;
  fpsAvg += (1 / Math.max(dtReal, 1e-3) - fpsAvg) * 0.05;
  controls.update();
  renderer.render(scene, camera);
  if (frames % 15 === 0) {
    const L = live(), inst = [...sets.values()].reduce((a, s) => a + s.geometry.instanceCount, 0);
    P.stats = `${L.length} live · ${inst - L.length} baked · ${sets.size} baked draws`;
    P.stats2 = `cloth CPU ${simAvg.toFixed(3)} ms/frame · ${fpsAvg.toFixed(0)} fps`;
    P.stats3 = `bake ${bakeMs.toFixed(0)} ms in a worker (${sets.size} sets) · last re-record ${Math.max(...[...sets.values()].map((s) => s.bakeMs ?? 0)).toFixed(0)} ms`;
    $info.textContent = [
      `wind ${P.wind.toFixed(1)} m/s towards ${P.windDir.toFixed(0)}° · gusts ${P.gust} · ${P.fabric}`,
      P.stats, P.stats2, P.stats3,
      L.map((f) => `${f.name} ${f.state} ${f.dist.toFixed(0)} m ${f.live.simMs.toFixed(3)} ms`).join("\n"),
    ].join("\n");
  }
  requestAnimationFrame(tick);
}

// ---------- views ----------
const VIEWS = {
  "town hall balcony": [[-1112, 70, -499], [-1132.6, 70.5, -505.7]],
  "balcony close-up": [[-1124, 70.8, -503.5], [-1132.6, 70.2, -505.9]],
  "masts": [[-1098, 66, -497], [-1112, 67.5, -505.5]],
  "field (cost)": [[-1010, 120, -450], [-1050, 62, -520]],
  "walk past the masts": null,
};
let walkT = -1;
function view(name) {
  const v = VIEWS[name];
  if (!v) { walkT = 0; return; }
  walkT = -1; camera.position.set(...v[0]); controls.target.set(...v[1]);
}

const gui = new GUI({ title: "Flag Lab" });
const g1 = gui.addFolder("Mode");
g1.add(P, "mode", ["auto (live near)", "all live (poles only)", "all baked"]);
g1.add(P, "liveRadius", 5, 150, 1).name("live radius (m)");
g1.add(P, "maxLive", 0, 12, 1).name("max live flags");
g1.add(P, "slow").name("slow motion (x0.25)");
g1.add(P, "pause");
const g2 = gui.addFolder("Wind");
g2.add(P, "wind", 0, 15, 0.1).name("speed (m/s)");
g2.add(P, "windDir", 0, 359, 1).name("towards (deg)").onChange(onWindDir);
g2.add(P, "gust", 0, 0.8, 0.01).name("gusts (live)");
g2.add(P, "turbulence", 0, 0.6, 0.01).name("ripple (live)");
const g3 = gui.addFolder("Flags");
g3.add(P, "fabric", Object.keys(FABRIC)).onChange(() => buildAll());
g3.add(P, "size", 0.5, 2, 0.05).name("size x").onChange(() => { clearTimeout(rebakeTimer); rebakeTimer = setTimeout(() => buildAll(), 300); });
g3.add(P, "field", 0, 600, 1).name("field flags (cost)").onChange(() => { clearTimeout(rebakeTimer); rebakeTimer = setTimeout(() => buildAll(), 300); });
if (hall) g3.add(P, "hall").name("town hall model").onChange((on) => { hall.visible = on; });
const g4 = gui.addFolder("Views");
for (const k of Object.keys(VIEWS)) g4.add({ f: () => view(k) }, "f").name(k);
const g5 = gui.addFolder("Read-outs");
g5.add(P, "stats").listen(); g5.add(P, "stats2").listen(); g5.add(P, "stats3").listen();

// the walk: 1.4 m/s past the masts at 6 m, so flags cross the live radius both ways
controls.addEventListener("start", () => { walkT = -1; });
const walkStep = () => {
  if (walkT >= 0) {
    walkT += 1 / 60;
    const z = -540 + (walkT * 1.4 * 10) % 80;          // x10: a quick pass for testing the hand-overs
    camera.position.set(-1100, GROUND_Y + 1.7, z); controls.target.set(-1112, 66, z + 4);
  }
  requestAnimationFrame(walkStep);
};
walkStep();

sun.position.set(-1060, 160, -420); sun.target.position.set(-1120, 61, -505);
view(qp.get("view") ?? "town hall balcony");
$info.textContent = "baking the flag loops and building shaders…";
await buildAll();
window.flagLab = { P, flags, sets, renderer, scene, camera, view, buildAll, onWindDir };
tick();
