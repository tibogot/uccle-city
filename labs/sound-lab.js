// THE SOUND LAB: procedural city sound (viewer/audio/, no audio files) in a small walkable scene: a street of
// setts and asphalt between building blocks (they muffle what is behind them), a side street with an idling
// car, the tram 92 on a Saint-Job-like curve (R 18 m) with a stop, an SNCB line behind the houses, a park with
// trees (birds), a gravel path, a boardwalk and leaf litter, a playground, a dog in a garden, a church tower
// that strikes the hours. Every sound has its parameters in the panel (our viewer/panelUI.js); the mixer has
// the categories, the Performance folder the costs (main-thread ms per frame, voices, latency).
import * as THREE from "three/webgpu";
import { Panel } from "../viewer/panelUI.js";
import { SoundEngine, CATEGORIES, ENVIRONMENTS } from "../viewer/audio/engine.js";
import { FootstepBank, SURFACES, stepLength } from "../viewer/audio/footsteps.js";
import { VehicleBank } from "../viewer/audio/vehicles.js";
import { TransitBank } from "../viewer/audio/transit.js";
import { AmbienceBank, BirdBank, BellBank, BIRDS, createWindBed, createHumBed, createRainBed, playgroundBuffer, createPlaygroundVoice, birdActivity, sunTimes } from "../viewer/audio/ambience.js";
import { CarSim, TramSim, TrainSim, BirdChorus, BellTowers, Dog, makePath } from "../viewer/audio/sims.js";
import { renderScenario } from "../viewer/audio/renders.js";
import { bakeInWorker } from "../viewer/audio/bake.js";

const $info = document.getElementById("info"), $start = document.getElementById("start");

// ---- world layout (metres; x east, z south) ------------------------------------------------------------------
const ZONES = [            // ground patches: [minX, maxX, minZ, maxZ, surface, colour] (later = on top)
  [-200, 200, -200, 200, "grass", 0x5f7a45],
  [-160, 58, -10, 10, "pavement", 0x8a8a86],
  [-160, 0, -6, 6, "setts", 0x6d6a66],
  [0, 58, -6, 6, "pavement", 0x3f4146],    // asphalt road (feet: pavement-like)
  [-10, 2, -80, -10, "pavement", 0x8a8a86],
  [-7, -1, -80, -10, "setts", 0x6d6a66],
  [42, 58, -200, -10, "pavement", 0x8a8a86],
  [60, 160, -2, 2, "gravel", 0xb5a888],
  [96, 112, -22, -10, "wood", 0x8b6a45],
  [118, 142, 10, 32, "leaves", 0x8e6236],
  [80, 104, 32, 52, "pavement", 0xa49a8a],
];
const BLOCKS = [            // occluding buildings [minX, maxX, minZ, maxZ, height]
  [-90, -50, -36, -10, 15], [-44, -10, -34, -10, 13], [2, 40, -40, -10, 14],
  [-90, -22, 10, 34, 12], [-14, 40, 10, 32, 16], [-40, -20, 46, 60, 7],
];
const TOWER = { x: -60, y: 32, z: -62 };
const TREES = []; for (let i = 0; i < 26; i++) { const a = i * 2.39996, r = 12 + (i * 37 % 60); TREES.push({ x: 110 + Math.cos(a) * r * 0.75, z: Math.sin(a) * r * 0.8, h: 9 + (i % 5) * 2 }); }
for (let x = -150; x < 40; x += 22) TREES.push({ x, z: 8.4, h: 8 }, { x: x + 11, z: -8.4, h: 8 });
const surfaceAt = (x, z) => { let s = "grass"; for (const [a, b, c, d, surf] of ZONES) if (x >= a && x <= b && z >= c && z <= d) s = surf; return s; };
const treeCover = (x, z) => { let m = 0; for (const t of TREES) { const d = Math.hypot(t.x - x, t.z - z); m = Math.max(m, 1 - d / 14); } return Math.max(0, Math.min(1, m)); };
const inPark = (x, z) => x > 60;

// ---- 3D scene (cheap: flat materials, no shadows) -----------------------------------------------------------
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9bccb); scene.fog = new THREE.Fog(0xa9bccb, 150, 700);
scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x4a4f42, 1.6));
const sunL = new THREE.DirectionalLight(0xffffff, 1.6); sunL.position.set(60, 100, 40); scene.add(sunL);
const mat = (c, e = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.9, emissive: e });
ZONES.forEach(([a, b, c, d, , col], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, d - c).rotateX(-Math.PI / 2), mat(col)); m.position.set((a + b) / 2, i * 0.004, (c + d) / 2); scene.add(m); });
for (const [a, b, c, d, h] of BLOCKS) { const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, h, d - c), mat(0xb9a58c)); m.position.set((a + b) / 2, h / 2, (c + d) / 2); scene.add(m); }
{ const t = new THREE.Mesh(new THREE.BoxGeometry(7, TOWER.y + 6, 7), mat(0x9a948a)); t.position.set(TOWER.x, (TOWER.y + 6) / 2, TOWER.z); scene.add(t);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 4), mat(0x4d5560)); sp.position.set(TOWER.x, TOWER.y + 13, TOWER.z); sp.rotation.y = Math.PI / 4; scene.add(sp); }
const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 1, 6), crownG = new THREE.IcosahedronGeometry(1, 1);
const trunks = new THREE.InstancedMesh(trunkG, mat(0x5a4632), TREES.length), crowns = new THREE.InstancedMesh(crownG, mat(0x3f6a36), TREES.length);
TREES.forEach((t, i) => { const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(t.x, t.h * 0.3, t.z), new THREE.Quaternion(), new THREE.Vector3(1, t.h * 0.6, 1)); trunks.setMatrixAt(i, m);
  m.compose(new THREE.Vector3(t.x, t.h * 0.75, t.z), new THREE.Quaternion(), new THREE.Vector3(t.h * 0.35, t.h * 0.3, t.h * 0.35)); crowns.setMatrixAt(i, m); });
scene.add(trunks, crowns);
{ const e = new THREE.Mesh(new THREE.BoxGeometry(1400, 2, 10), mat(0x7b6f60)); e.position.set(0, 1, 140); scene.add(e); }

// ---- sound -------------------------------------------------------------------------------------------------
const P = {
  master: 0.8, mute: false, hour: 12.0, month: 5, clockRun: true, timeScale: 1,
  surface: "auto", gait: "auto", stepLevel: 1,
  cars: 4, carKind: "petrol", carSurface: "setts", rpm: 0, carProfile: "cycle",
  squeal: 1, squealA: 1250, squealB: 3240, tramMotor: 1, tramRoll: 1, bellHi: 1046, bellLo: 784,
  trainSpeed: 33, hornA: 660, hornB: 370,
  wind: 0.35, rain: 0, hum: 0.5, birds: 1, playground: 1, dogEvery: 45,
  bellPrime: 262, bellPrime2: 233,
  voiceLimit: 40, hrtfVoices: 8, hrtfRadius: 60, occlusion: true, env: "auto", controlRate: 10, stress: false,
};
for (const c of CATEGORIES) { P["vol_" + c] = 1; P["mute_" + c] = false; }

let ready = false, ctx = null, engine = null, B = null, sims = [], cruisers = [], stressCars = [], wind, rain, hum, birds, bells, dog, playSrcs = [], tram, train, cycleCar, idleCar;
const clock = () => ({ hour: P.hour, month: P.month, minute: (P.hour % 1) * 60 });

function laneCar(i, extra = false) {
  const dir = i % 2 ? 1 : -1, z = dir > 0 ? 3 : -3;
  const path = makePath(dir > 0 ? -160 : 160, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2, [{ len: 320 }]);
  return new CarSim(engine, B.veh, { path, s0: (i * 71) % 300, profile: "cruise", v: 8 + (i * 3.7) % 6, surface: "asphalt", kind: i % 3 ? "petrol" : "diesel", loop: true, priority: extra ? 0.8 : 1 });
}
function setCruisers(n, list, extra) {
  while (list.length > n) engine.remove(list.pop().src);
  while (list.length < n) list.push(laneCar(list.length + (extra ? 20 : 0), extra));
}

async function startSound() {
  if (ctx) { if (ctx.state !== "running") await ctx.resume(); return; }
  ctx = new AudioContext({ latencyHint: "interactive" });
  engine = new SoundEngine(ctx, { voiceLimit: P.voiceLimit, hrtfVoices: P.hrtfVoices, controlRate: P.controlRate });
  window.__sound = { ctx, engine, P };
  engine.occluders = BLOCKS.map(([minX, maxX, minZ, maxZ, maxY]) => ({ minX, maxX, minZ, maxZ, maxY }));
  B = { feet: new FootstepBank(ctx), veh: new VehicleBank(ctx), tr: new TransitBank(ctx), amb: new AmbienceBank(ctx), birds: new BirdBank(ctx), bells: new BellBank(ctx) };
  // Bake every bank in a worker (same synth code, ~2 s of synthesis kept off the main thread), then start.
  const jobs = [];
  for (const g of ["walk", "run"]) for (const sf of SURFACES) jobs.push(["feet", "variants", sf, g]);
  jobs.push(["veh", "engine", "petrol"], ["veh", "engine", "diesel"], ["veh", "setts", 4], ["veh", "setts", 12], ["veh", "pink"], ["veh", "horn", 0.37], ["veh", "horn", 0.22]);
  for (let k = 0; k < 3; k++) jobs.push(["veh", "door", true, k], ["veh", "door", false, k], ["veh", "squeal", k]);
  for (const sp of BIRDS) for (let v = 0; v < 4; v++) jobs.push(["birds", "song", sp, v]);
  jobs.push(["bells", "strike", P.bellPrime, 14, 1], ["bells", "strike", P.bellPrime, 14, 2], ["bells", "strike", P.bellPrime2, 16, 1], ["bells", "strike", P.bellPrime2, 16, 2]);
  jobs.push(["tr", "gong", P.bellHi], ["tr", "gong", P.bellLo], ["tr", "doors", 5], ["tr", "chime", 1318, 1046], ["tr", "trainHorn", P.hornA, P.hornB, 0.8, 1.0], ["tr", "pink"]);
  for (let k = 0; k < 4; k++) jobs.push(["tr", "clack", k]);
  jobs.push(["amb", "pink"], ["amb", "white"], ["amb", "gusts"], ["amb", "flutter"], ["amb", "cubeCurve"], ["amb", "playground", 1], ["amb", "playground", 2], ["amb", "bark", 1], ["amb", "bark", 2], ["amb", "bark", 3]);
  for (const sf of ["ground", "roof", "trees"]) for (const h of [0, 1]) jobs.push(["amb", "rain", sf, h]);
  $start.textContent = "baking the sounds…";
  const bk = await bakeInWorker(ctx, B, jobs);
  stats.bakeWhere = `${bk.where}: ${bk.ms.toFixed(0)} ms off-thread, unpack ${(bk.unpackMs || 0).toFixed(1)} ms`;
  const tb = performance.now();
  stats.bakeMs = performance.now() - tb;
  // Beds.
  wind = engine.addBed("nature", createWindBed(B.amb)); rain = engine.addBed("nature", createRainBed(B.amb)); hum = engine.addBed("traffic", createHumBed(B.amb));
  // Traffic: cruisers on the main street, a car doing idle / pull away / cruise / brake on the setts, one idling in the side street.
  setCruisers(P.cars, cruisers);
  cycleCar = new CarSim(engine, B.veh, { path: makePath(-150, -3, Math.PI / 2, [{ len: 300 }]), s0: 120, profile: "cycle", surface: P.carSurface, loop: true });
  idleCar = new CarSim(engine, B.veh, { path: makePath(-4, -45, 0, [{ len: 5 }]), profile: "manual", kind: "diesel" });
  // Tram 92: along the street (z = 0), the stop at x = -20, the Saint-Job-like curve (R 18 m) north into x = 48.
  const tpath = makePath(-170, 0, Math.PI / 2, [{ len: 200 }, { arc: 18, angle: Math.PI / 2 }, { len: 220 }]);
  tram = new TramSim(engine, B.tr, { path: tpath, s0: 20, stop: 150, dwell: 18, loop: true });
  train = new TrainSim(engine, B.tr, { x0: -700, z: 140, v: P.trainSpeed, joints: [0, 45], hornAt: -260, len: 900 });
  // Birds on park trees + street trees; species mix of a Uccle garden suburb.
  const mix = ["blackbird", "robin", "blackbird", "greattit", "woodpigeon", "robin", "magpie", "crow", "blackbird", "greattit", "robin", "woodpigeon"];
  const perches = TREES.filter((_, i) => i % 2 === 0).map((t, i) => ({ species: mix[i % mix.length], x: t.x, y: t.h * 0.8, z: t.z }));
  birds = new BirdChorus(engine, B.birds, perches, clock);
  bells = new BellTowers(engine, B.bells, [{ ...TOWER, prime: P.bellPrime, hum60: 14 }, { x: -900, y: 30, z: -1200, prime: P.bellPrime2, hum60: 16, delay: 3.5 }], clock);
  dog = new Dog(engine, ctx, { x: -30, y: 0.5, z: 52 }, { every: [P.dogEvery * 0.6, P.dogEvery * 1.4], bank: B.amb });
  [[86, 40], [98, 46]].forEach(([x, z], i) => { const buf = B.amb.playground(i + 1); const src = { category: "people", priority: 1, ref: 6, range: 220, x, y: 1.2, z, seed: i * 0.37, level: 1, create: (c, input, now) => createPlaygroundVoice(c, buf, input, src, now) }; engine.add(src); playSrcs.push(src); });
  sims = [cycleCar, idleCar, tram, train];
  ready = true; applyAll();
  $start.remove();
  stats.baseLatency = (ctx.baseLatency * 1000).toFixed(1); stats.outputLatency = ((ctx.outputLatency || 0) * 1000).toFixed(1);
  if (ctx.renderCapacity?.start) { try { ctx.renderCapacity.start({ updateInterval: 1 }); ctx.renderCapacity.addEventListener("update", (e) => { stats.audioLoad = `${(e.averageLoad * 100).toFixed(1)}% avg, ${(e.peakLoad * 100).toFixed(0)}% peak, underruns ${(e.underrunRatio * 100).toFixed(2)}%`; }); } catch { /* not available */ } }
}
$start.onclick = () => startSound();

function applyAll() {
  if (!ready) return;
  engine.setMaster(P.mute ? 0 : P.master);
  for (const c of CATEGORIES) engine.setCategory(c, P["vol_" + c], P["mute_" + c]);
  engine.voiceLimit = P.voiceLimit; engine.hrtfVoices = P.hrtfVoices; engine.hrtfRadius = P.hrtfRadius; engine.occlusionOn = P.occlusion; engine.controlRate = P.controlRate;
  engine.envAuto = P.env === "auto"; if (!engine.envAuto) engine.setEnvironment(P.env);
  cycleCar.src.surface = P.carSurface; cycleCar.src.kind = P.carKind; cycleCar.src.rpm = P.rpm; cycleCar.profile = P.carProfile;
  Object.assign(tram.params, { squeal: P.squeal, motorGain: P.tramMotor, rollGain: P.tramRoll, squealHz: [P.squealA, P.squealB], bellHi: P.bellHi, bellLo: P.bellLo });
  train.v = P.trainSpeed;
  dog.every = [P.dogEvery * 0.6, P.dogEvery * 1.4];
  birds.density = P.birds;
  bells.towers[0].prime = P.bellPrime; bells.towers[1].prime = P.bellPrime2;
  setCruisers(P.cars, cruisers); setCruisers(P.stress ? 26 : 0, stressCars, true);
}

// ---- walking listener --------------------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 3000);
const me = { x: -30, z: 8, yaw: Math.PI * 0.75, pitch: 0, dist: 0, foot: 0, mapView: false };
const keys = {};
addEventListener("keydown", (e) => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  keys[e.code] = true;
  if (!ctx) startSound();
  if (e.code === "KeyM") me.mapView = !me.mapView;
  if (e.code === "KeyB" && cycleCar) cycleCar.horn(0.37);
  if (e.code === "KeyT" && tram) tram.bell();
  if (e.code === "KeyN") { P.mute = !P.mute; applyAll(); ui.controllersRecursive().forEach((c) => c.updateDisplay()); }
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
let drag = null;
renderer.domElement.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", () => { drag = null; });
addEventListener("pointermove", (e) => { if (!drag) return; me.yaw -= (e.clientX - drag.x) * 0.004; me.pitch = Math.max(-1.2, Math.min(1.2, me.pitch - (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
const blocked = (x, z) => BLOCKS.some(([a, b, c, d]) => x > a - 0.3 && x < b + 0.3 && z > c - 0.3 && z < d + 0.3);

function stepListener(dt) {
  const run = keys.ShiftLeft || keys.ShiftRight, speed = run ? 3.6 : 1.45;
  let fx = 0, fz = 0;
  if (keys.KeyW) fz -= 1; if (keys.KeyS) fz += 1; if (keys.KeyA) fx -= 1; if (keys.KeyD) fx += 1;
  const len = Math.hypot(fx, fz);
  if (len > 0) {
    const s = Math.sin(me.yaw), c = Math.cos(me.yaw);
    const dx = (fx * c + fz * s) / len * speed * dt, dz = (-fx * s + fz * c) / len * speed * dt;
    if (!blocked(me.x + dx, me.z)) me.x += dx;
    if (!blocked(me.x, me.z + dz)) me.z += dz;
    me.dist += speed * dt;
    const gait = P.gait === "auto" ? (run ? "run" : "walk") : P.gait;
    if (me.dist >= stepLength(gait) && engine) {
      me.dist = 0; me.foot ^= 1;
      const surface = P.surface === "auto" ? surfaceAt(me.x, me.z) : P.surface, side = me.foot ? 0.12 : -0.12;
      engine.event({ category: "people", priority: 2.5, ref: 1.5, range: 40, wet: 0.6, x: me.x + Math.cos(me.yaw) * side, y: 0.05, z: me.z - Math.sin(me.yaw) * side },
        (c, out, when) => B.feet.play(out, when, { surface, gait, foot: me.foot, level: P.stepLevel, seed: Math.random() }));
      stats.lastStep = `${surface} ${gait}`;
    }
  } else me.dist = Math.min(me.dist, 0.3);
}

// ---- panel -------------------------------------------------------------------------------------------------
const ui = new Panel({ title: "Sound Lab" });
const ch = () => applyAll();
const fs = ui.addFolder("Sound");
fs.add({ start: () => startSound() }, "start").name("Start / resume sound");
fs.add(P, "master", 0, 1.5, 0.01).onChange(ch); fs.add(P, "mute").name("mute (N)").onChange(ch);
const fmx = ui.addFolder("Mixer (categories)");
for (const c of CATEGORIES) { fmx.add(P, "vol_" + c, 0, 2, 0.01).name(c).onChange(ch); fmx.add(P, "mute_" + c).name("mute " + c).onChange(ch); }
const fl = ui.addFolder("Listener");
const TP = { "street (setts)": [-30, 8, 0.75], "side-street corner": [6, 4, 1.0], "tram stop": [-20, 8, 1.6], "Saint-Job curve (inside)": [36, -7, -1.2], "park (gravel)": [100, 0, -1.57], "boardwalk": [104, -16, 0], "leaves": [130, 20, 0], "playground": [92, 30, 3.1], "rail line": [10, 128, 3.14], "under the tower": [-50, -8, -0.3] };
for (const [name, [x, z, yaw]] of Object.entries(TP)) fl.add({ [name]: () => { me.x = x; me.z = z; me.yaw = yaw; } }, name).name("go: " + name);
const fst = ui.addFolder("Footsteps"); fst.close();
fst.add(P, "surface", ["auto", ...SURFACES]); fst.add(P, "gait", ["auto", "walk", "run"]); fst.add(P, "stepLevel", 0, 2, 0.01).name("level");
fst.add({ test: () => { let t = ctx.currentTime + 0.05; const s = P.surface === "auto" ? surfaceAt(me.x, me.z) : P.surface; for (let i = 0; i < 6; i++) { const when = t + i * 0.53; engine.event({ category: "people", priority: 2.5, ref: 1.5, range: 40, x: me.x, y: 0.05, z: me.z }, (c, out) => B.feet.play(out, when, { surface: s, gait: "walk", foot: i % 2, level: P.stepLevel }), when); } } }, "test").name("6 steps here");
const fc = ui.addFolder("Cars"); fc.close();
fc.add(P, "cars", 0, 16, 1).name("cruising cars").onChange(ch);
fc.add(P, "carProfile", ["cycle", "cruise", "manual"]).name("test car profile").onChange(ch);
fc.add(P, "carKind", ["petrol", "diesel"]).name("test car engine").onChange(ch);
fc.add(P, "carSurface", ["asphalt", "setts", "concrete"]).name("test car road").onChange(ch);
fc.add(P, "rpm", 0, 6000, 50).name("manual RPM (0 = auto)").onChange(ch);
fc.add({ h: () => cycleCar?.horn(0.37) }, "h").name("horn (B)");
fc.add({ d: () => idleCar?.door(false) }, "d").name("side-street car: door open");
fc.add({ d: () => idleCar?.door(true) }, "d").name("side-street car: door close");
fc.add({ p: () => { if (!engine) return; const c = new CarSim(engine, B.veh, { path: makePath(me.x - 90, me.z - 5, Math.PI / 2, [{ len: 180 }]), profile: "cruise", v: 13.9, surface: P.carSurface, loop: false }); sims.push(c); setTimeout(() => { engine.remove(c.src); sims.splice(sims.indexOf(c), 1); }, 14000); } }, "p").name("50 km/h pass-by in front");
const ft = ui.addFolder("Tram 92"); ft.close();
ft.add(P, "squeal", 0, 2, 0.01).name("curve squeal").onChange(ch); ft.add(P, "squealA", 300, 5000, 10).name("squeal mode A Hz").onChange(ch); ft.add(P, "squealB", 300, 8000, 10).name("squeal mode B Hz").onChange(ch);
ft.add(P, "tramMotor", 0, 3, 0.01).name("motor whine").onChange(ch); ft.add(P, "tramRoll", 0, 3, 0.01).name("rail rumble").onChange(ch);
ft.add(P, "bellHi", 400, 2000, 1).name("bell high Hz").onChange(ch); ft.add(P, "bellLo", 300, 1600, 1).name("bell low Hz").onChange(ch);
ft.add({ b: () => tram?.bell() }, "b").name("bell (T)"); ft.add({ c: () => tram?.chime() }, "c").name("stop chime"); ft.add({ d: () => tram?.doors() }, "d").name("doors");
const ftr = ui.addFolder("Train (SNCB AM08)"); ftr.close();
ftr.add(P, "trainSpeed", 5, 45, 0.5).name("speed m/s").onChange(ch);
ftr.add({ go: () => { if (train) { train.x = -train.dir * 420; train.horned = false; } } }, "go").name("next train now");
ftr.add({ h: () => train?.horn() }, "h").name("horn");
const fa = ui.addFolder("Ambience"); fa.close();
fa.add(P, "hour", 0, 23.99, 0.01).name("hour").listen(); fa.add(P, "month", 1, 12, 1); fa.add(P, "clockRun").name("clock runs"); fa.add(P, "timeScale", 1, 600, 1).name("time scale");
fa.add(P, "wind", 0, 1, 0.01); fa.add(P, "rain", 0, 1, 0.01).name("rain (light..heavy)"); fa.add(P, "hum", 0, 1, 0.01).name("city hum");
fa.add(P, "birds", 0, 2, 0.01).name("bird activity x").onChange(ch); fa.add(P, "playground", 0, 2, 0.01); fa.add(P, "dogEvery", 8, 180, 1).name("dog every ~s").onChange(ch);
fa.add(P, "bellPrime", 150, 600, 1).name("Saint-Job bell prime Hz").onChange(ch); fa.add(P, "bellPrime2", 150, 600, 1).name("Saint-Pierre prime Hz").onChange(ch);
fa.add({ r: () => bells?.ring(Math.floor(P.hour) || 12, engine.time + 0.05) }, "r").name("strike the hour now");
fa.add({ d: () => dog?.bark(engine.time + 0.02) }, "d").name("dog barks now");
fa.add({ d: () => { P.hour = sunTimes(Math.round((P.month - 0.5) * 30.4)).sunrise - 0.3; } }, "d").name("go to dawn");
const fsp = ui.addFolder("Spatial"); fsp.close();
fsp.add(P, "voiceLimit", 4, 64, 1).name("voice limit").onChange(ch); fsp.add(P, "hrtfVoices", 0, 32, 1).name("HRTF voices (nearest)").onChange(ch);
fsp.add(P, "hrtfRadius", 5, 200, 1).name("HRTF radius m").onChange(ch); fsp.add(P, "occlusion").name("muffling behind buildings").onChange(ch);
fsp.add(P, "env", ["auto", ...Object.keys(ENVIRONMENTS)]).name("reverb").onChange(ch); fsp.add(P, "controlRate", 5, 30, 1).name("control rate Hz").onChange(ch);
const stats = { frameMs: "-", controlMs: "-", voices: "-", events: "-", sources: "-", env: "-", latency: "-", audioLoad: "n/a (no renderCapacity API)", lastStep: "-", bakeMs: 0, bench: "-", perSecond: "-" };
const fp = ui.addFolder("Performance");
fp.add(P, "stress").name("stress: +26 cars (~40 voices)").onChange(ch);
const R = [fp.add(stats, "perSecond").name("audio main thread"), fp.add(stats, "frameMs").name("main ms / frame"), fp.add(stats, "controlMs").name("control step ms"), fp.add(stats, "voices").name("voices hrtf/eq"),
  fp.add(stats, "events").name("events / beds"), fp.add(stats, "sources").name("sources, stolen, dropped"), fp.add(stats, "env").name("reverb, enclosure"),
  fp.add(stats, "latency").name("base / output latency"), fp.add(stats, "audioLoad").name("audio thread"), fp.add(stats, "bench").name("offline bench")];
fp.add({ b: async () => { stats.bench = "rendering…"; const r = await renderScenario("stress_40", { rate: ctx?.sampleRate || 48000 }); stats.bench = `${r.maxVoices} voices: ${(r.dur * 1000 / r.renderMs).toFixed(1)}x realtime (${(100 * r.renderMs / (r.dur * 1000)).toFixed(1)}% of a core)`; } }, "b").name("offline benchmark (stress scene)");

// ---- markers for sources -----------------------------------------------------------------------------------
const markerG = new THREE.SphereGeometry(0.5, 10, 8), markers = new Map();
const COL = { traffic: 0xffaa33, transit: 0x33aaff, nature: 0x55dd55, people: 0xff66aa, bells: 0xffee55 };
const boxes = new Map();
function syncMarkers() {
  if (!ready) return;
  for (const s of engine.sources) {
    let m = markers.get(s);
    if (!m) {
      const isCar = s.category === "traffic" && s.kind, isTram = !!s.part, isTrain = s.motored !== undefined;
      const g = isCar ? new THREE.BoxGeometry(1.8, 1.5, 4.2) : isTram ? new THREE.BoxGeometry(2.4, 3.2, 30) : isTrain ? new THREE.BoxGeometry(2.9, 4, 26.5) : markerG;
      m = new THREE.Mesh(g, mat(isTram ? 0xe7e7e2 : isTrain ? 0x334a7a : isCar ? 0x6c7a8a : COL[s.category], 0)); scene.add(m); markers.set(s, m);
    }
    m.position.set(s.x, s.part || s.motored !== undefined ? 1.8 : 0.9, s.z);
    if (s.part) { m.position.y = 1.8; m.rotation.y = s.heading || 0; m.position.x -= Math.sin(s.heading || 0) * 11; m.position.z -= Math.cos(s.heading || 0) * 11; }
    else if (Number.isFinite(s.heading)) m.rotation.y = s.heading;
    if (s.motored !== undefined) m.rotation.y = Math.PI / 2;
    m.material.emissive.setHex(s._voice ? (s._emitter?.model === "HRTF" ? 0x553300 : 0x222222) : 0x000000);
  }
  for (const [s, m] of markers) if (!engine.sources.has(s)) { scene.remove(m); markers.delete(s); }
}

// ---- loop --------------------------------------------------------------------------------------------------
let last = performance.now(), acc = 0, accN = 0, accMax = 0, uiT = 0, secMs = 0, secT = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  stepListener(dt);
  const eye = new THREE.Vector3(me.x, 1.7, me.z);
  if (me.mapView) { camera.position.set(me.x, 220, me.z + 0.01); camera.lookAt(me.x, 0, me.z); }
  else { camera.position.copy(eye); camera.lookAt(me.x - Math.sin(me.yaw) * Math.cos(me.pitch), 1.7 + Math.sin(me.pitch), me.z - Math.cos(me.yaw) * Math.cos(me.pitch)); }
  if (P.clockRun) P.hour = (P.hour + dt * P.timeScale / 3600) % 24;
  // --- audio main-thread work (measured) ---
  const t0 = performance.now();
  if (ready && ctx.state === "running") {
    const L = engine.listener; L.x = me.x; L.y = 1.7; L.z = me.z;
    L.fx = -Math.sin(me.yaw) * Math.cos(me.pitch); L.fy = Math.sin(me.pitch); L.fz = -Math.cos(me.yaw) * Math.cos(me.pitch); L.inPark = inPark(me.x, me.z);
    const t = ctx.currentTime;
    // sims move every frame (cheap); the engine's control step runs at the control rate inside frame().
    for (const s of sims) s.step(t, dt);
    for (const c of cruisers) c.step(t, dt); for (const c of stressCars) c.step(t, dt);
    birds.step(t); bells.step(t); dog.step(t);
    const day = P.hour > 8 && P.hour < 18.5 ? 1 : 0;
    for (const s of playSrcs) { s.level = P.playground * day; s.active = s.level > 0.01; }
    const tc = treeCover(me.x, me.z);
    Object.assign(wind.params, { speed: P.wind, trees: tc, shelter: engine.enclosure });
    Object.assign(rain.params, { intensity: P.rain, ground: 1 - tc * 0.6, roof: Math.min(1, engine.enclosure * 1.5), trees: tc });
    Object.assign(hum.params, { level: P.hum, night: P.hour < 6 || P.hour > 22 ? 1 : 0 });
    engine.frame(dt);
  }
  const ms = performance.now() - t0; acc += ms; accN++; accMax = Math.max(accMax, ms); secMs += ms;
  if (now - secT >= 2000) { stats.perSecond = `${(secMs / ((now - secT) / 1000)).toFixed(2)} ms/s = ${(secMs / ((now - secT) / 1000) / 60).toFixed(3)} ms per 60-fps frame`; secMs = 0; secT = now; }
  syncMarkers();
  renderer.render(scene, camera);
  if (now - uiT > 250 && ready) {
    uiT = now; const st = engine.stats;
    stats.frameMs = `${(acc / accN).toFixed(3)} avg, ${accMax.toFixed(2)} max`; acc = accN = accMax = 0;
    stats.controlMs = `${st.controlMs.toFixed(3)} avg, ${st.controlMax.toFixed(2)} max @${engine.controlRate} Hz`;
    stats.voices = `${st.voices} (${st.hrtf} / ${st.equalpower}) of ${engine.voiceLimit}`;
    stats.events = `${st.events} / ${st.beds}`; stats.sources = `${st.sources}, ${st.stolen}, ${st.dropped}`;
    stats.env = `${engine.envName}, ${engine.enclosure.toFixed(2)}`;
    stats.latency = `${stats.baseLatency} / ${stats.outputLatency} ms`;
    for (const r of R) r.updateDisplay();
    const h = Math.floor(P.hour), mi = Math.floor((P.hour % 1) * 60);
    const act = BIRDS.map((b) => `${b} ${birdActivity(b, P.hour, P.month).toFixed(2)}`).join(", ");
    $info.textContent = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} month ${P.month} · at ${me.x.toFixed(0)}, ${me.z.toFixed(0)} on ${surfaceAt(me.x, me.z)} · trees ${treeCover(me.x, me.z).toFixed(2)}\n` +
      `tram ${tram.v.toFixed(1)} m/s k=${tram.parts[0].curvature.toFixed(3)} · test car ${cycleCar.phase} ${(cycleCar.src.speed * 3.6).toFixed(0)} km/h ${Math.round(cycleCar.src.rpmOut || 0)} rpm g${cycleCar.src.gearOut || 1}\n` +
      `birds: ${act}\nlast step: ${stats.lastStep} · banks: ${stats.bakeWhere}; main-thread setup ${stats.bakeMs.toFixed(0)} ms`;
  } else if (!ready) $info.textContent = "Click to start. The scene: a street (setts west, asphalt east) between blocks, a side street (idling diesel), the tram 92 with its stop and an R 18 m curve, an SNCB line behind the south houses, a park (gravel, boardwalk, leaves, playground), a church tower.";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__lab = { me, P, stats, keys, startSound, applyAll };
