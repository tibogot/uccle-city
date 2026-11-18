// THE BIKE LAB (docs/BIKE.md): the kid's BMX (viewer/bike/bikePhysics.js, the same code the game will run) on a
// procedural test ground (viewer/bike/bikeGround.js, the same one tools/bike/bikeTest.mjs rides): a kicker, a table,
// pump rollers, a dirt bowl, a sand patch, a 15 cm kerb, a 12 % slope, a 20 % one, roots, a wall, posts, a log, a car.
// Placeholder rider + bike (viewer/bike/bikeModel.js), a bike chase camera, keyboard + gamepad, our own panel
// (viewer/panelUI.js) for every constant, a telemetry strip. No sound. One fixed light set (sun + sky), never changed.
// URL: ?spot=kicker (start there), ?slow=0.25, ?cam=low
// THE KID (claude/kid, docs/KID.md): the real kid (models/characters/kid.glb) walks ON FOOT with the merged third-person
// controller (viewer/character: the same WASD / arrows, Shift run, Space jump, C crouch) and gets ON / OFF the bike
// with E (viewer/kid/kidMount.js); riding, his body is driven by the bike (viewer/kid/riderIK.js: hands on the grips,
// feet on the pedals, hips on the seat, standing, crouching, leaning, manuals; the crash tumble and the get-up).
// ?kid=0: the placeholder rider only (phase 1); ?ride=1: start on the bike.
import * as THREE from "three/webgpu";
import { attribute, positionWorld, floor, mod, mix, float, fract, smoothstep, min, vec3 } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { BIKE, BIKE_RANGES, SURFACES, DT, createBikeState, advanceBike, bikePose, bikeSpeed, getUp } from "../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../viewer/bike/bikeEnv.js";
import { FEATURES, testHeight, testSurface, testGround, testColliders, SPOTS, BOUNDS } from "../viewer/bike/bikeGround.js";
import { buildColliders, KIND } from "../viewer/drive/colliders.js";
import { createBikeModel } from "../viewer/bike/bikeModel.js";
import { BikeCamera, BIKE_CAMERA } from "../viewer/bike/bikeCamera.js";
import { BikeKeys } from "../viewer/bike/bikeInput.js";
import { ThirdPerson, CollisionWorld, Heightfield, PrismSet } from "../viewer/character/index.js";
import { RiderIK, RIDE } from "../viewer/kid/riderIK.js";
import { MOUNT, createMount, stepMount, parkStep, ridden, mountSpot } from "../viewer/kid/kidMount.js";
import { findBikeEmpties } from "../viewer/kid/bikeRig.js";
import { loadBmx } from "../viewer/kid/bmxModel.js";

const qs = new URLSearchParams(location.search);
const USE_KID = qs.get("kid") !== "0";
const DEFAULTS = { ...BIKE }, SURF_DEFAULTS = SURFACES.map((s) => ({ ...s }));
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.id = "view";
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9bccd);
scene.fog = new THREE.Fog(0xa9bccd, 90, 320);
const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.05, 800);
const hemi = new THREE.HemisphereLight(0xdfe9f5, 0x5d5a48, 1.1);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 90 });
scene.add(hemi, sun, sun.target);

// ---------------------------------------------------------------- the ground (meshes from the same height function)
const SURF_COLOR = [0x45474b, 0x8a8378, 0x8c6c4a, 0x5f8540, 0xd9c590, 0x5e4a33].map((c) => new THREE.Color(c));
const groundMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.93 });
{ // a 1 m checker + 10 m lines over the surface colour (scale reading at bike height)
  const p = positionWorld.xz, cell = mod(floor(p.x).add(floor(p.y)), 2);
  const g = fract(p.div(10)), line = smoothstep(0.0, 0.006, min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))));
  groundMat.colorNode = attribute("color", "vec3").mul(mix(float(0.9), float(1.0), cell)).mul(mix(float(0.7), float(1), line));
}
const inside = (f, x, z) => x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1;
function gridMesh(x0, x1, z0, z1, res, keep = null) {
  const nx = Math.max(1, Math.round((x1 - x0) / res)), nz = Math.max(1, Math.round((z1 - z0) / res));
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3), idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, k = (j * (nx + 1) + i) * 3;
    const sx = Math.min(x, x1 - 1e-4), sz = Math.min(z, z1 - 1e-4);        // (sample inside the rectangle)
    pos[k] = x; pos[k + 1] = testHeight(sx, sz); pos[k + 2] = z;
    const c = SURF_COLOR[testSurface(sx, sz)] || SURF_COLOR[0]; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (keep && !keep(x0 + (x1 - x0) * (i + 0.5) / nx, z0 + (z1 - z0) * (j + 0.5) / nz)) continue;
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, groundMat); m.receiveShadow = true; scene.add(m);
  return m;
}
gridMesh(BOUNDS.x0, BOUNDS.x1, BOUNDS.z0, BOUNDS.z1, 1, (x, z) => !FEATURES.some((f) => inside(f, x, z)));
for (const f of FEATURES) gridMesh(f.x0, f.x1, f.z0, f.z1, f.res);
// skirts: a feature's border that stands above the base ground gets a vertical face down to it (the kerb, the slopes)
{
  const pos = [], col = [];
  const c = new THREE.Color(0x77736b);
  for (const f of FEATURES) {
    const edges = [[f.x0, f.z0, f.x1, f.z0], [f.x1, f.z0, f.x1, f.z1], [f.x1, f.z1, f.x0, f.z1], [f.x0, f.z1, f.x0, f.z0]];
    for (const [ax, az, bx, bz] of edges) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / f.res));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const h = (x, z) => testHeight(Math.min(Math.max(x, f.x0), f.x1 - 1e-4), Math.min(Math.max(z, f.z0), f.z1 - 1e-4));
        const h0 = h(x0, z0), h1 = h(x1, z1);
        if (Math.max(h0, h1) < 0.005) continue;
        pos.push(x0, h0, z0, x0, 0, z0, x1, h1, z1, x1, h1, z1, x0, 0, z0, x1, 0, z1);
        for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardNodeMaterial({ roughness: 0.9, side: THREE.DoubleSide, colorNode: attribute("color", "vec3") }));
  m.castShadow = m.receiveShadow = true; scene.add(m);
}

// ---------------------------------------------------------------- colliders (+ what they stand for, drawn)
const CL = testColliders(KIND);
const COL = buildColliders(CL.polys, CL.circles, CL.bounds);
const solidMat = { [KIND.building]: new THREE.MeshStandardNodeMaterial({ color: 0xb9a48a, roughness: 0.9 }), [KIND.car]: new THREE.MeshStandardNodeMaterial({ color: 0x5b6670, roughness: 0.5, metalness: 0.3 }),
  [KIND.furniture]: new THREE.MeshStandardNodeMaterial({ color: 0x6b4a2e, roughness: 0.95 }), [KIND.wall]: new THREE.MeshStandardNodeMaterial({ color: 0x9c958a, roughness: 0.9 }) };
for (const p of CL.polys) {
  const r = p.rings[0], xs = r.map((q) => q[0]), zs = r.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), top = p.top ?? (p.kind === KIND.car ? 1.45 : 2.5);
  const by = testHeight((x0 + x1) / 2, (z0 + z1) / 2);
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, p.kind === KIND.wall ? top - by : top, z1 - z0), solidMat[p.kind] || solidMat[KIND.building]);
  m.position.set((x0 + x1) / 2, p.kind === KIND.wall ? by + (top - by) / 2 : top / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true; scene.add(m);
}
{ const pm = new THREE.MeshStandardNodeMaterial({ color: 0xe8452c, roughness: 0.6 });
  for (const c of CL.circles) { const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, 1.1, 12), pm); m.position.set(c.x, 0.55, c.z); m.castShadow = true; scene.add(m); } }

// ---------------------------------------------------------------- the bike
const env = createBikeEnv({ sets: () => [COL], ground: testGround });
const model = createBikeModel(BIKE, { rider: !USE_KID });
scene.add(model.root, model.fallen);
const groundAt = (x, z) => testHeight(x, z);
const chase = new BikeCamera(camera, BIKE_CAMERA);
if (qs.get("cam")) BIKE_CAMERA.mode = qs.get("cam");
let s;
const P = { pause: false, slow: +(qs.get("slow") || 1), spot: qs.get("spot") || "start", info: "", card: true };
function place(name) {
  const [x, z, h] = SPOTS[name] || SPOTS.start;
  s = createBikeState(x, z, h, testHeight(x, z));
  chase.reset(); P.spot = name;
  if (K.on) { mount.state = "riding"; mount.t = 0; mount.park.mode = "standing"; K.tp.on = false; K.tp.body.root.visible = true; camBlend.t = 1; }
}
// ---------------------------------------------------------------- the kid: on foot + on the bike (claude/kid)
const K = { on: false, tp: null, rider: null, kid: null, E: null, snap: null, crashYaw: 0, lod: 0, ik: "", bmx: null };
// the BMX asset (claude/bmx: models/bike/bmx.glb) on the placeholder's pose (?bmx=0: the placeholder bike)
if (qs.get("bmx") !== "0") {
  try { K.bmx = await loadBmx(renderer, model, { colourway: qs.get("colourway") || null }); console.log("[bike lab] BMX", K.bmx.info); }
  catch (e) { console.warn("[bike lab] the BMX failed, placeholder bike:", e); model.bikeFrame.traverse((o) => { if (o.isMesh) o.visible = true; }); }
}
const mount = createMount(qs.get("ride") === "1" ? "riding" : "foot");
const camBlend = { t: 1, dur: 0.6, p: new THREE.Vector3(), q: new THREE.Quaternion() };
function startCamBlend() { camBlend.t = 0; camBlend.p.copy(camera.position); camBlend.q.copy(camera.quaternion); }
place(P.spot);
if (USE_KID) {
  try {
    const world = new CollisionWorld();
    world.add(new Heightfield(testHeight));
    const CLp = testColliders(KIND);
    world.add(new PrismSet(CLp.polys.map((p) => ({ rings: p.rings, base: -2, top: p.kind === KIND.wall ? (p.top ?? 2.5) : (p.top ?? (p.kind === KIND.car ? 1.45 : 2.5)) })),
      CLp.circles.map((c) => ({ x: c.x, z: c.z, r: c.r, base: -2, top: 1.1 }))));
    const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world, controller: { height: 1.45, radius: 0.24 } });
    const info = await tp.useCharacter("kid", renderer);
    K.tp = tp; K.kid = info.kid;
    K.rider = new RiderIK(info.kid.gltf.scene, info.kid.gltf.animations);
    K.E = K.bmx ? K.bmx.empties : findBikeEmpties(model.root, model.empties.frame); K.E.cg = BIKE.cgHeight;
    K.on = true;
    const sp = mountSpot(s);
    if (mount.state === "foot") { tp.start(sp.x + Math.cos(s.heading) * 0.6, testHeight(sp.x, sp.z) + 0.05, sp.z - Math.sin(s.heading) * 0.6, s.heading); }
    else { tp.on = false; tp.body.root.visible = true; }
    console.log("[bike lab] the kid", info.label, info.lods, "tris per LOD");
  } catch (e) { console.warn("[bike lab] the kid failed, placeholder rider:", e); model.root.traverse?.(() => {}); }
}
const keys = new BikeKeys({ onKey: (code) => {
  if (code === "KeyE") { K.e = true; return; }
  if (code === "KeyR" || code === "PadBack") place(P.spot);
  else if (code === "KeyV" || code === "PadY") banner(`camera: ${chase.next()}`);
  else if (code === "KeyP") P.pause = !P.pause;
  else if (code === "KeyG") { if (s.crashed) getUp(s, env); }
  else if (code === "Slash" || code === "F1") { P.card = !P.card; card.classList.toggle("hidden", !P.card); }
  else if (/^Digit[1-9]$/.test(code)) { const n = Object.keys(SPOTS)[+code.slice(5) - 1]; if (n) { place(n); banner(n); } }
} });

// ---------------------------------------------------------------- the controls card (rule 14: shown once + ?)
const card = document.getElementById("card");
card.textContent = [
  "W / Up       pedal          Shift  stand up / sprint",
  "S / Down     rear brake (hold = skid)   Q  front brake",
  "A D / Left Right   steer (lean)",
  "Space        hold = crouch / preload / absorb",
  "             release = hop (on a back slope: a pump)",
  "C            pump (push the bike down a back slope)",
  "Z / X        lean forward / back (I / K too):",
  "             manual, nose dive, air pitch",
  "F            trick in the air (let go before landing!)",
  "R reset  G get up  V camera  P pause  1-9 spots",
  "E            get on / off the bike (walk up to it;",
  "             off: stopped = it stands, rolling = it falls)",
  "",
  "ON FOOT: W A S D / arrows walk, Shift run, Space jump,",
  "C crouch, mouse drag = camera, E get on the bike",
  "? this card",
  "",
  "Gamepad: stick steer + lean, RT pedal, LT rear,",
  "LB front, A hop, B pump, X trick, RB sprint,",
  "Y camera, Back reset",
].join("\n");
const bannerEl = document.getElementById("banner");
let bannerT = 0;
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = 1; bannerT = 1.6; }

// ---------------------------------------------------------------- panel: every constant
const ui = new Panel({ title: "Bike Lab", persist: "bikelab", search: true });
{ // the kid (claude/kid): the riding constants (viewer/kid/riderIK.js RIDE), the mount, an outfit
  const fk = ui.addFolder("Kid", { id: "bike-kid", open: false });
  fk.add(K, "ik").name("state").listen();
  const OUTFITS = {
    "yellow ringer": {},
    "red + jeans blue": { shirt: 0xc8302c, shirt_trim: 0xf4f1ea, shorts: 0x2f4a78, cap: 0x1f3f8a, cap_brim: 0x1f3f8a },
    "teal + khaki": { shirt: 0x1f8a8a, shirt_trim: 0xf2c230, shorts: 0xb59a6a, cap: 0xf2c230, cap_brim: 0x1f8a8a },
    "purple + black": { shirt: 0x6a3d9a, shirt_trim: 0x1d1d1d, shorts: 0x262626, cap: 0x1d1d1d, cap_brim: 0x6a3d9a, hair: 0x2a1a10 },
  };
  const O = { outfit: "yellow ringer", bmx: qs.get("colourway") || "blue" };
  fk.add(O, "bmx", ["blue", "red", "purple"]).name("BMX colourway").onChange((v) => K.bmx?.setColourway(v));
  fk.add(O, "outfit", Object.keys(OUTFITS)).name("outfit").onChange((v) => {
    if (!K.kid) return;
    import("../viewer/kid/kidModel.js").then(({ KID_PALETTE }) => { for (const n of K.kid.slots) K.kid.setColor(n, (OUTFITS[v][n] ?? KID_PALETTE[n])); });
  });
  for (const [k, a, b, st] of [["hipUp", -0.05, 0.2, 0.005], ["hipBack", -0.15, 0.15, 0.005], ["standUp", 0, 0.3, 0.005], ["standFwd", 0, 0.3, 0.005],
    ["crouchDown", 0, 0.3, 0.005], ["crouchBack", 0, 0.2, 0.005], ["manualBack", 0, 0.3, 0.005], ["swayStand", 0, 0.1, 0.005], ["pelvisPitch", -0.3, 0.8, 0.01],
    ["standPitch", 0, 0.8, 0.01], ["leanExtra", 0, 0.8, 0.01], ["reachLeg", 0.85, 0.999, 0.001], ["reachArm", 0.7, 0.99, 0.01], ["ankleUp", 0, 0.15, 0.005],
    ["ankleBack", -0.05, 0.15, 0.005], ["wristBack", 0, 0.1, 0.005], ["headDown", -0.3, 0.5, 0.01], ["spineMax", 0.3, 1.5, 0.01],
    ["footReach", 0.8, 0.999, 0.005], ["footOut", 0, 0.3, 0.005], ["footFwd", -0.1, 0.3, 0.005], ["footAnkle", 0.05, 0.15, 0.005],
    ["wobbleHip", 0, 0.15, 0.005], ["wobbleRoll", 0, 0.8, 0.01], ["wobbleCrouch", 0, 1, 0.05], ["poseTime", 0, 0.3, 0.01]])
    fk.add(RIDE, k, a, b, st).name(k);
  for (const [k, a, b, st] of [["near", 0.5, 3, 0.05], ["mountTime", 0.1, 1.5, 0.05], ["dismountTime", 0.1, 1.5, 0.05], ["dismountMax", 0.5, 6, 0.1], ["standStill", 0, 2, 0.05]])
    fk.add(MOUNT, k, a, b, st).name(`mount ${k}`);
}
const fr = ui.addFolder("Ride");
fr.add(P, "pause").name("pause (P)");
fr.add(P, "slow", 0.05, 1, 0.05).name("time scale");
fr.add(P, "spot", Object.keys(SPOTS)).name("start spot").onChange((v) => place(v));
fr.buttons([["reset bike (R)", () => place(P.spot)], ["get up (G)", () => s.crashed && getUp(s, env)],
  ["camera (V)", () => banner(`camera: ${chase.next()}`)], ["constants to defaults", () => { Object.assign(BIKE, DEFAULTS); SURFACES.forEach((x, i) => Object.assign(x, SURF_DEFAULTS[i])); ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }],
  ["copy constants (JSON)", () => navigator.clipboard?.writeText(JSON.stringify({ BIKE: changed(BIKE, DEFAULTS), SURFACES: SURFACES.map((x, i) => changed(x, SURF_DEFAULTS[i])) }, null, 1))]], 2);
fr.add(P, "info").name("state").listen();
function changed(o, d) { const r = {}; for (const k in o) if (o[k] !== d[k]) r[k] = o[k]; return r; }
const groups = {};
for (const [k, [a, b, st, grp]] of Object.entries(BIKE_RANGES)) {
  (groups[grp] ||= ui.addFolder(`Bike: ${grp}`, { id: `bike-${grp}`, open: false })).add(BIKE, k, a, b, st).name(k);
}
const fs = ui.addFolder("Surfaces", { open: false });
for (const sp of SURFACES) {
  fs.heading(sp.name);
  fs.add(sp, "grip", 0.1, 1.5, 0.01).name(`${sp.name} grip`);
  fs.add(sp, "roll", 0, 0.4, 0.002).name(`${sp.name} rolling`);
  fs.add(sp, "sink", 0, 1, 0.01).name(`${sp.name} sink`);
  fs.add(sp, "buzz", 0, 0.05, 0.001).name(`${sp.name} buzz`);
}
const fc = ui.addFolder("Camera", { open: false });
for (const [k, a, b, st] of [["distance", 1.5, 10, 0.1], ["height", 0.2, 4, 0.05], ["lookHeight", 0, 2, 0.05], ["lookAhead", 0, 4, 0.1], ["yawRate", 0.5, 15, 0.1],
  ["followXZ", 1, 30, 0.5], ["followY", 0.5, 20, 0.5], ["fov", 40, 90, 1], ["fovKick", 0, 30, 1], ["roll", 0, 0.6, 0.01], ["shake", 0, 3, 0.1], ["minClear", 0.1, 1, 0.05]])
  fc.add(BIKE_CAMERA, k, a, b, st).name(k);
fc.add(BIKE_CAMERA, "mode", ["chase", "far", "low", "side"]).name("mode").onChange(() => chase.reset());

// ---------------------------------------------------------------- the telemetry strip
const tele = document.getElementById("tele");
tele.innerHTML = `<div class="big" id="tv">0<small> km/h</small></div>
<div class="col"><span><span class="k">lean</span> <b id="tl">0</b>° <span class="k">pitch</span> <b id="tp">0</b>°</span><span><span class="k">grade</span> <b id="tg">0</b> % <span class="k">rpm</span> <b id="tc">0</b></span></div>
<div class="col"><span><span class="wheel" id="wf"></span>F <span class="bar"><i id="bf"></i></span> <span id="sf"></span></span><span><span class="wheel" id="wr"></span>R <span class="bar"><i id="br"></i></span> <span id="sr"></span></span></div>
<div class="col"><span><span class="k">slip</span> <b id="ts">0</b> m/s <b id="ta">0</b>°</span><span id="tf"></span></div>
<div class="col"><span id="tst"></span><span id="tland" class="k"></span></div>
<canvas id="graph" width="300" height="56"></canvas>`;
const $ = (id) => document.getElementById(id);
const graph = $("graph"), g2 = graph.getContext("2d");
const HIST = 300, hist = { v: new Float32Array(HIST), lean: new Float32Array(HIST), slip: new Float32Array(HIST) };
let hi = 0;

window.__bike = { get state() { return s; }, BIKE, SURFACES, env, chase, place, P, K, mount, RIDE, MOUNT };

// ---------------------------------------------------------------- loop
const pose = {};
const NO_INPUT = { pedal: 0, sprint: false, brakeF: 0, brakeR: 1, steer: 0, lean: 0, hop: false, pump: 0, trick: false };
const ease = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
let last = performance.now(), frames = 0, physMs = 0, histT = 0, kidMs = 0, landT = -1;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  // (feel round 1: the keys are sampled per fixed step at that step's time, not once a frame)
  const stepInput = (lag) => keys.sample(now - lag * 1000 / Math.max(0.05, P.slow), DT);
  const t0 = performance.now();
  const fdt = P.pause ? 0 : dt * P.slow;
  // ON FOOT <-> ON THE BIKE (viewer/kid/kidMount.js)
  if (K.on) {
    const tp = K.tp, root = tp.body.root;
    stepMount(mount, { e: !!K.e }, { x: tp.x, z: tp.z }, { x: s.x, z: s.z, heading: s.heading, speed: bikeSpeed(s), crashed: s.crashed, air: s.air, lean: s.lean, lying: mount.park.mode === "lying" }, fdt);
    K.e = false;
    for (const ev of mount.events) {
      if (ev === "mount" || ev === "getUp") { K.snap = K.rider.snapshot(root); tp.on = false; root.visible = true; s.vx = s.vz = 0; startCamBlend(); chase.reset(); }
      else if (ev === "pickUp") { getUp(s, env); banner("picks the bike up"); }
      else if (ev === "dismount") {
        K.snap = K.rider.snapshot(root);
        const sp = mountSpot(s);
        tp.start(sp.x, testHeight(sp.x, sp.z) + 0.03, sp.z, s.heading);
        tp.autopilot = (inp) => { inp.x = 0; inp.z = 0; inp.run = false; };
        startCamBlend();
      } else if (ev === "foot") { tp.autopilot = null; root.rotation.set(0, root.rotation.y, 0); }
      else if (ev === "tooFast") banner("too fast to get off (slow down)");
      else if (ev === "far") banner("walk up to the bike, then E");
      else if (ev === "crash") { const r = s.rider; K.crashYaw = Math.atan2(r.vx || Math.sin(s.heading), r.vz || Math.cos(s.heading)); }
    }
  }
  const riding = !K.on || ridden(mount);
  if (riding) advanceBike(s, !K.on || mount.state === "riding" ? stepInput : NO_INPUT, fdt, env, BIKE, SURFACES);
  else parkStep(mount, s, fdt, testHeight(s.x, s.z));
  keys.apply(now);           // (the events since the last step: the next frame's first step comes after them)
  if (s.lastLanding && s.lastLanding.t !== landT) { landT = s.lastLanding.t; if (s.lastLanding.band === "sketchy") banner(`sketchy landing (${s.lastLanding.why})`); }
  physMs = physMs * 0.95 + (performance.now() - t0) * 0.05;
  bikePose(s, P.pause ? 1 : s.alpha, pose);
  model.update(s, pose, groundAt);
  K.bmx?.update(s, camera.position.distanceTo(model.root.position));
  const tk = performance.now();
  if (K.on) {
    const tp = K.tp, root = tp.body.root, R = K.rider, st = mount.state;
    root.updateMatrixWorld(true);
    if (st === "foot" || st === "dismounting" || st === "pickUp") {
      if (fdt > 0) tp.update(fdt);
      if (st === "dismounting" && K.snap) R.blendFrom(K.snap, root, ease(mount.t / MOUNT.dismountTime));
    } else if (st === "crashed") {
      const r = s.rider, gy = testHeight(r.x, r.z), t = mount.t;
      if (t < 0.75) R.clipPose(root, "Roll", 0.15 + t * 1.6, r.x, gy, r.z, K.crashYaw);
      else if (t < MOUNT.tumble) R.clipPose(root, "FallDown", 2.3, r.x, gy, r.z, K.crashYaw);
      else R.clipPose(root, "CrouchIdle", 0, r.x, gy, r.z, K.crashYaw);
    } else {
      // riding / mounting: the body driven by the bike
      if (s.pushing) R.push(K.E, s, root, testHeight(pose.x, pose.z), s.walkPhase);
      else R.ride(K.E, s, root, testHeight(pose.x, pose.z));
      if (st === "mounting" && K.snap) { const w = ease(mount.t / MOUNT.mountTime); R.blendFrom(K.snap, root, w, Math.sin(Math.PI * w) * 0.12); }
    }
    const M = R.metrics;
    K.ik = `${st} · legs ${(M.legRatio[0] * 100).toFixed(0)}/${(M.legRatio[1] * 100).toFixed(0)} % arms ${(M.armRatio[0] * 100).toFixed(0)}/${(M.armRatio[1] * 100).toFixed(0)} % spine ${(M.spine * 57.3).toFixed(0)}° · LOD${K.kid.lod} · ${kidMs.toFixed(2)} ms`;
  }
  kidMs = kidMs * 0.95 + (performance.now() - tk) * 0.05;
  const onFoot = K.on && (mount.state === "foot" || mount.state === "dismounting" || mount.state === "pickUp");
  if (!onFoot) chase.update(s, pose, dt, groundAt);
  if (camBlend.t < 1) {
    camBlend.t = Math.min(1, camBlend.t + dt / camBlend.dur);
    const w = ease(camBlend.t);
    camera.position.lerpVectors(camBlend.p, camera.position.clone(), w); camera.quaternion.slerpQuaternions(camBlend.q, camera.quaternion.clone(), w);
  }
  if (K.on) K.kid.autoLod(camera.position.distanceTo(K.tp.body.root.position));
  const fx = onFoot ? K.tp.x : pose.x, fy = onFoot ? K.tp.y : pose.y, fz = onFoot ? K.tp.z : pose.z;
  sun.position.set(fx + 10, fy + 24, fz + 6); sun.target.position.set(fx, fy, fz);
  renderer.render(scene, camera);
  if (bannerT > 0 && (bannerT -= dt) <= 0) bannerEl.style.opacity = 0;
  if (s.crashed && s.crashT < 0.05 && s.crashT > 0) banner(`crash: ${s.crashCause}`);
  // history (10 s at 30 Hz)
  histT += dt;
  if (histT > 1 / 30) { histT = 0; hist.v[hi] = bikeSpeed(s) * 3.6; hist.lean[hi] = s.lean * 57.3; hist.slip[hi] = s.slip; hi = (hi + 1) % HIST; drawGraph(); }
  if (++frames % 4 === 0) writeTele();
});
function drawGraph() {
  const W = graph.width, Hh = graph.height;
  g2.clearRect(0, 0, W, Hh);
  g2.strokeStyle = "rgba(255,255,255,.12)"; g2.beginPath(); g2.moveTo(0, Hh / 2); g2.lineTo(W, Hh / 2); g2.stroke();
  const line = (arr, scale, mid, colr) => {
    g2.strokeStyle = colr; g2.beginPath();
    for (let k = 0; k < HIST; k++) { const v = arr[(hi + k) % HIST], x = k / (HIST - 1) * W, y = mid - v * scale; k ? g2.lineTo(x, y) : g2.moveTo(x, y); }
    g2.stroke();
  };
  line(hist.v, Hh / 60, Hh - 2, "#ffffff");          // 0-60 km/h
  line(hist.lean, Hh / 2 / 45, Hh / 2, "#f2a33a");    // +-45 deg
  line(hist.slip, Hh / 2 / 3, Hh / 2, "#ff6b5b");     // +-3 m/s
}
function writeTele() {
  const v = bikeSpeed(s) * 3.6;
  $("tv").innerHTML = `${Math.abs(v).toFixed(0)}<small> km/h</small>`;
  $("tl").textContent = (s.lean * 57.3).toFixed(0); $("tp").textContent = (s.pitch * 57.3).toFixed(0);
  $("tg").textContent = (s.grade * 100).toFixed(0); $("tc").textContent = s.cadence.toFixed(0);
  $("wf").classList.toggle("on", s.contact[0]); $("wr").classList.toggle("on", s.contact[1]);
  $("bf").style.width = `${Math.min(100, s.comp[0] / BIKE.maxComp * 100)}%`; $("br").style.width = `${Math.min(100, s.comp[1] / BIKE.maxComp * 100)}%`;
  $("sf").textContent = SURFACES[s.surf[0]]?.name || ""; $("sr").textContent = SURFACES[s.surf[1]]?.name || "";
  $("ts").textContent = s.slip.toFixed(2); $("ta").textContent = (s.slipAngle * 57.3).toFixed(0);
  const flags = [s.skid && "SKID", s.wheelspin && "wheelspin", s.frontLock && "FRONT LOCK", s.washT > 0.05 && "washing"].filter(Boolean);
  $("tf").innerHTML = flags.length ? `<span class="warn">${flags.join(" ")}</span>` : `<span class="k">grip ok</span>`;
  const st = s.crashed ? `<span class="warn">CRASH: ${s.crashCause}</span>` : s.air ? `<span class="hot">air ${s.airT.toFixed(2)} s</span>` : s.manual > 0 ? `<span class="hot">manual ${s.manual.toFixed(1)} s</span>`
    : s.pushing ? "pushing" : s.footDown > 0.5 ? "foot down" : s.preload > 0 ? `preload ${(s.preload * 100).toFixed(0)} %` : `<span class="ok">riding</span>`;
  $("tst").innerHTML = st + ` <span class="k">hops ${s.hops} crashes ${s.crashes}</span>`;
  const L = s.lastLanding;
  $("tland").textContent = L ? `last landing: ${L.band}${L.band === "clean" ? "" : ` (${L.why})`} (${L.wheel} first, ${(L.rel * 57.3).toFixed(0)}°, ${L.vn.toFixed(1)} m/s, ${L.air.toFixed(2)} s air)` : "";
  P.info = `${K.on ? mount.state + " · " : ""}${st.replace(/<[^>]+>/g, "")} · phys ${physMs.toFixed(3)} ms · ${keys.pad ? "gamepad" : "keyboard"}`;
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
