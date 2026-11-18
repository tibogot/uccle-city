// THE BIKE LAB (docs/BIKE.md): the kid's BMX (viewer/bike/bikePhysics.js, the same code the game will run) on a
// procedural test ground (viewer/bike/bikeGround.js, the same one tools/bike/bikeTest.mjs rides): a kicker, a table,
// pump rollers, a dirt bowl, a sand patch, a 15 cm kerb, a 12 % slope, a 20 % one, roots, a wall, posts, a log, a car.
// Placeholder rider + bike (viewer/bike/bikeModel.js), a bike chase camera, keyboard + gamepad, our own panel
// (viewer/panelUI.js) for every constant, a telemetry strip. No sound. One fixed light set (sun + sky), never changed.
// URL: ?spot=kicker (start there), ?slow=0.25, ?cam=low
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

const qs = new URLSearchParams(location.search);
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
const model = createBikeModel(BIKE);
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
}
place(P.spot);
const keys = new BikeKeys({ onKey: (code) => {
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

window.__bike = { get state() { return s; }, BIKE, SURFACES, env, chase, place, P };

// ---------------------------------------------------------------- loop
const pose = {};
let last = performance.now(), frames = 0, physMs = 0, histT = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  const input = keys.read(dt);
  const t0 = performance.now();
  if (!P.pause) advanceBike(s, input, dt * P.slow, env, BIKE, SURFACES);
  physMs = physMs * 0.95 + (performance.now() - t0) * 0.05;
  bikePose(s, P.pause ? 1 : s.alpha, pose);
  model.update(s, pose, groundAt);
  chase.update(s, pose, dt, groundAt);
  sun.position.set(pose.x + 10, pose.y + 24, pose.z + 6); sun.target.position.set(pose.x, pose.y, pose.z);
  renderer.render(scene, camera);
  if (bannerT > 0 && (bannerT -= dt) <= 0) bannerEl.style.opacity = 0;
  if (s.crashed && s.crashT < 0.05) banner(`crash: ${s.crashCause}`);
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
  $("tland").textContent = L ? `last landing: ${L.cause} (${L.wheel} first, ${(L.rel * 57.3).toFixed(0)}°, ${L.vn.toFixed(1)} m/s, ${L.air.toFixed(2)} s air)` : "";
  P.info = `${st.replace(/<[^>]+>/g, "")} · phys ${physMs.toFixed(3)} ms · ${keys.pad ? "gamepad" : "keyboard"}`;
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
