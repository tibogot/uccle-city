// BIKE LAB 2: THE BMX SPOT (2026-11-28, owner: "more than a lab, like a real bike test that looks good already; many
// obstacles, close"). A 90s Brussels waste-ground BMX spot (viewer/bike/bikeSpot.js: the world; bikeSpotMeshes.js: the
// meshes; debug/bikeSpotLook.js: the materials, the city's light / sky / post, grass, trees). The kid, the BMX, the
// physics, the camera, the mount and the keys are the old lab's (debug/bikeLab.js, unchanged: debug/bikeLab.html?lab=old).
// URL: ?spot=<name> (start there, e.g. ?spot=quarter%20pipe), ?ride=1 (start on the bike), ?time=midday, ?grass=low,
// ?slow=0.25, ?cam=low, ?edges=1 (the grind lines)
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { DT, BIKE, BIKE_RANGES, BIKE_PARK, BIKE_PARK_RANGES, SURFACES, createBikeState, advanceBike, bikePose, bikeSpeed, getUp } from "../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../viewer/bike/bikeEnv.js";
import { SPOT_SPOTS, spotGround, spotHeightRamped, spotEdges, spotColliders } from "../viewer/bike/bikeSpot.js";
import { EDGE_NAMES } from "../viewer/bike/bikeEdges.js";
import { soundGate } from "../viewer/audio/soundGate.js";
import { BikeSound, SOUND, SOUND_RANGES } from "../viewer/bike/bikeAudio.js";
import { buildColliders, KIND } from "../viewer/drive/colliders.js";
import { createBikeModel } from "../viewer/bike/bikeModel.js";
import { BikeCamera, BIKE_CAMERA } from "../viewer/bike/bikeCamera.js";
import { BikeKeys } from "../viewer/bike/bikeInput.js";
import { ThirdPerson, CollisionWorld, Heightfield, PrismSet } from "../viewer/character/index.js";
import { RiderIK, RIDE, RIDE_KIDA } from "../viewer/kid/riderIK.js";
import { MOUNT, createMount, stepMount, parkStep, ridden, mountSpot } from "../viewer/kid/kidMount.js";
import { loadBmx } from "../viewer/kid/bmxModel.js";
import { buildSpotLook } from "./bikeSpotLook.js";

const qs = new URLSearchParams(location.search);
Object.assign(RIDE, RIDE_KIDA);
const DEFAULTS = { ...BIKE }, PARK_DEFAULTS = { ...BIKE_PARK }, SURF_DEFAULTS = SURFACES.map((s) => ({ ...s }));
document.getElementById("title").innerHTML = `<b>Bike Lab</b> <small>the BMX spot · ? controls · <a href="?lab=old" style="color:#8fb8ff">old lab</a></small>`;
const renderer = new THREE.WebGPURenderer({ antialias: true, reversedDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.id = "view";
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.05, 6000);
const TIMES = ["golden", "midday"];
const look = await buildSpotLook({ renderer, scene, camera, quality: qs.get("grass") || "high", time: TIMES.includes(qs.get("time")) ? qs.get("time") : "golden" });

// ---------------------------------------------------------------- the world: ground, colliders, edges
const CL = spotColliders(KIND);
const COL = buildColliders(CL.polys, CL.circles, CL.bounds);
const W = { height: spotHeightRamped, ground: spotGround, edges: spotEdges, spots: SPOT_SPOTS };
// the edge layer drawn (debug, off by default, depth tested: never through the kid)
const EDGE_COL = [0x9a9a9a, 0xff9a2e, 0xc77a3a, 0xffb347, 0x4fb3ff, 0x5ad16a];
const edgeLines = (() => {
  const E = W.edges, pos = [], col = [], c = new THREE.Color();
  for (let k = 0; k < E.n; k++) {
    const o = k * 6, li = E.segLine[k];
    c.set(EDGE_COL[E.lineType[li]] || 0xffffff).multiplyScalar(E.lineGrind[li] ? 1 : 0.55);
    pos.push(E.seg[o], E.seg[o + 1] + 0.012, E.seg[o + 2], E.seg[o + 3], E.seg[o + 4] + 0.012, E.seg[o + 5]);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: true, transparent: true, opacity: 0.85 }));
  m.renderOrder = 10; scene.add(m);
  return m;
})();

// ---------------------------------------------------------------- the bike + the kid
const env = createBikeEnv({ sets: () => [COL], ground: W.ground, edges: W.edges, wallrides: null });
const model = createBikeModel(BIKE, { rider: false });
scene.add(model.root, model.fallen);
const groundAt = (x, z) => W.height(x, z);
const chase = new BikeCamera(camera, BIKE_CAMERA);
if (qs.get("cam")) BIKE_CAMERA.mode = qs.get("cam");
let s;
const P = { pause: false, slow: +(qs.get("slow") || 1), spot: SPOT_SPOTS[qs.get("spot")] ? qs.get("spot") : "start", info: "", card: true, edges: qs.get("edges") === "1", time: TIMES.includes(qs.get("time")) ? qs.get("time") : "golden" };
const snd = new BikeSound().followGate(() => s);
soundGate.mountButton();
const K = { on: false, tp: null, rider: null, kid: null, E: null, snap: null, crashYaw: 0, ik: "", bmx: null };
function place(name) {
  const [x, z, h, v = 0] = W.spots[name] || W.spots.start;
  s = createBikeState(x, z, h, W.height(x, z));
  if (v) { s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v; }
  chase.reset(); P.spot = name;
  if (K.on) { mount.state = "riding"; mount.t = 0; mount.park.mode = "standing"; K.tp.on = false; K.tp.body.root.visible = true; camBlend.t = 1; }
}
try { K.bmx = await loadBmx(renderer, model, { colourway: qs.get("colourway") || null }); K.bmx.setSeatPost?.(RIDE.seatPost || 0); }
catch (e) { console.warn("[bike spot] the BMX failed, placeholder bike:", e); model.bikeFrame.traverse((o) => { if (o.isMesh) o.visible = true; }); }
const mount = createMount(qs.get("ride") === "1" ? "riding" : "foot");
const camBlend = { t: 1, dur: 0.6, p: new THREE.Vector3(), q: new THREE.Quaternion() };
function startCamBlend() { camBlend.t = 0; camBlend.p.copy(camera.position); camBlend.q.copy(camera.quaternion); }
place(P.spot);
try {
  const world = new CollisionWorld();
  world.add(new Heightfield(W.height));
  world.add(new PrismSet(CL.polys.map((p) => ({ rings: p.rings, base: -2, top: p.top ?? 2.5 })), CL.circles.map((c) => ({ x: c.x, z: c.z, r: c.r, base: -2, top: 1.1 }))));
  const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world, controller: { height: 1.45, radius: 0.24 } });
  const info = await tp.useCharacter("kidA", renderer);
  K.tp = tp; K.kid = info.kid;
  K.rider = new RiderIK(info.kid.gltf.scene, info.kid.gltf.animations);
  K.E = K.bmx.empties; K.E.cg = BIKE.cgHeight;
  K.on = true;
  const sp = mountSpot(s);
  if (mount.state === "foot") tp.start(sp.x + Math.cos(s.heading) * 0.6, W.height(sp.x, sp.z) + 0.05, sp.z - Math.sin(s.heading) * 0.6, s.heading);
  else { tp.on = false; tp.body.root.visible = true; }
} catch (e) { console.warn("[bike spot] the kid failed:", e); }

const names = Object.keys(SPOT_SPOTS);
const keys = new BikeKeys({ onKey: (code) => {
  if (code === "KeyE") { K.e = true; return; }
  if (code === "KeyO" || (code === "Escape" && ORB.on)) { orbitToggle(code === "KeyO" ? !ORB.on : false); return; }
  if (code === "KeyR" || code === "PadBack") place(P.spot);
  else if (code === "KeyV" || code === "PadY") banner(`camera: ${chase.next()}`);
  else if (code === "KeyP") P.pause = !P.pause;
  else if (code === "KeyG") { if (s.crashed) getUp(s, env); }
  else if (code === "Slash" || code === "F1") { P.card = !P.card; card.classList.toggle("hidden", !P.card); }
  else if (/^Digit[0-9]$/.test(code)) { const n = names[(+code.slice(5) + 9) % 10]; if (n) { place(n); banner(n); } }
  else if (code === "KeyN" || code === "KeyB") { const i = names.indexOf(P.spot), n = names[((i < 0 ? 0 : i) + (code === "KeyN" ? 1 : -1) + names.length) % names.length]; place(n); banner(n); }
} });
window.__keys = keys;
// ---------------------------------------------------------------- the orbit camera (O)
const ORB = { on: false, slow: 1 };
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; orbit.enabled = false; orbit.minDistance = 1.2; orbit.maxDistance = 120;
const FOCUS = new THREE.Vector3(), ORB_PREV = new THREE.Vector3();
function orbitToggle(on) {
  ORB.on = on; orbit.enabled = on; ORB.fixed = false;
  if (on) { const p = bikePose(s, 1, {}); ORB_PREV.set(p.x, p.y + 0.4, p.z); orbit.target.copy(ORB_PREV); orbitPreset("side"); }
  else chase.reset();
  banner(on ? "orbit camera (drag / wheel / right-drag; Esc or O: back)" : "ride camera");
  ui.controllersRecursive().forEach((c) => c.updateDisplay?.());
}
function orbitPreset(name) {
  const p = bikePose(s, 1, {}), h = p.heading, fx = Math.sin(h), fz = Math.cos(h), lx = fz, lz = -fx, t = new THREE.Vector3(p.x, p.y + 0.4, p.z);
  const off = { side: [lx * 4.5, 0.9, lz * 4.5], front: [fx * 4.5, 1.0, fz * 4.5], back: [-fx * 5, 1.6, -fz * 5], top: [-fx * 0.6, 9, -fz * 0.6], low: [lx * 2.2 + fx * 1.5, 0.15, lz * 2.2 + fz * 1.5], park: [-fx * 26 + lx * 14, 16, -fz * 26 + lz * 14] }[name];
  orbit.target.copy(t); ORB_PREV.copy(t); camera.position.set(t.x + off[0], t.y + off[1], t.z + off[2]); orbit.update();
}
function orbitStep(p) { FOCUS.set(p.x, (p.y ?? 0) + 0.4, p.z); camera.position.add(FOCUS.clone().sub(ORB_PREV)); orbit.target.copy(FOCUS); ORB_PREV.copy(FOCUS); orbit.update(); }
// ---------------------------------------------------------------- the controls card
const card = document.getElementById("card");
card.textContent = [
  "THE BMX SPOT: funbox + rail, quarter pipe, ledge,",
  "manual pad, stairs + handrail, two wooden kickers,",
  "pump track, dirt table, whoops, hill, drift pad",
  "",
  "W / Up       pedal      Shift  stand up + sprint",
  "S / Down     rear brake (hold = skid)   Q  front brake",
  "A D / Left Right   steer (lean)",
  "Space        hold = crouch, release = hop",
  "C            pump       Z / X  lean fwd / back",
  "F            trick in the air (let go before landing!)",
  "E            get on / off the bike",
  "R reset  G get up  V camera  P pause  O orbit",
  "1-9, 0       the spots (N / B next / previous)",
  "",
  "ON FOOT: WASD walk, Shift run, Space jump, E: bike",
  "? this card",
].join("\n");
const bannerEl = document.getElementById("banner");
let bannerT = 0;
function banner(t) { bannerEl.textContent = t; bannerEl.style.opacity = 1; bannerT = 1.6; }

// ---------------------------------------------------------------- the panel
const ui = new Panel({ title: "Bike Lab: the spot", persist: "bikespot", search: true });
{
  const fp = ui.addFolder("Spots", { id: "spot-spots", open: true });
  fp.buttons(names.map((n, i) => [i < 10 ? `${(i + 1) % 10} ${n}` : n, () => { place(n); banner(n); ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }, `ride the ${n} (with its speed)`]), 2);
  const fl = ui.addFolder("Look", { id: "spot-look", open: false });
  fl.add(P, "time", TIMES).name("time of day").onChange((v) => look.setTime(v));
  if (look.grass) fl.add(look.grass.group, "visible").name("grass blades");
  if (look.trees) fl.add(look.trees.group, "visible").name("trees");
  const fk = ui.addFolder("Kid", { id: "spot-kid", open: false });
  fk.add(K, "ik").name("state").listen();
  const O = { bmx: qs.get("colourway") || "blue", cap: qs.get("cap") === "back" ? "back" : "fwd" };
  fk.add(O, "bmx", ["blue", "red", "purple"]).name("BMX colourway").onChange((v) => K.bmx?.setColourway(v));
  fk.add(O, "cap", ["fwd", "back"]).name("cap").onChange((v) => K.kid?.setCap(v));
  setTimeout(() => K.kid?.setCap(O.cap), 0);
}
const fo = ui.addFolder("Orbit camera (O)", { id: "spot-orbit", open: false });
fo.add(ORB, "on").name("orbit (O / Esc)").onChange((v) => orbitToggle(v));
fo.buttons(["side", "front", "back", "top", "low", "park"].map((n) => [n, () => { if (!ORB.on) orbitToggle(true); orbitPreset(n); }]), 6);
fo.buttons([["slow 0.25x", () => { P.slow = 0.25; ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }], ["normal 1x", () => { P.slow = 1; ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }],
  ["pause (P)", () => { P.pause = !P.pause; ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }]], 3);
const fr = ui.addFolder("Ride", { id: "spot-ride", open: false });
fr.add(P, "pause").name("pause (P)");
fr.add(P, "slow", 0.05, 1, 0.05).name("time scale");
edgeLines.visible = P.edges;
fr.add(P, "edges").name("debug: the grind lines").onChange((v) => { edgeLines.visible = v; });
fr.buttons([["reset bike (R)", () => place(P.spot)], ["get up (G)", () => s.crashed && getUp(s, env)], ["camera (V)", () => banner(`camera: ${chase.next()}`)],
  ["constants to defaults", () => { Object.assign(BIKE, DEFAULTS); Object.assign(BIKE_PARK, PARK_DEFAULTS); SURFACES.forEach((x, i) => Object.assign(x, SURF_DEFAULTS[i])); ui.controllersRecursive().forEach((c) => c.updateDisplay?.()); }]], 2);
fr.add(P, "info").name("state").listen();
const groups = {};
for (const [k, [a, b, st, grp]] of Object.entries(BIKE_PARK_RANGES)) (groups[grp] ||= ui.addFolder(`Bike: ${grp}`, { id: `spot-bike-${grp}`, open: false })).add(BIKE_PARK, k, a, b, st).name(k);
for (const [k, [a, b, st, grp]] of Object.entries(BIKE_RANGES)) (groups[grp] ||= ui.addFolder(`Bike: ${grp}`, { id: `spot-bike-${grp}`, open: false })).add(BIKE, k, a, b, st).name(k);
const fs = ui.addFolder("Surfaces", { id: "spot-surf", open: false });
for (const sp of SURFACES) { fs.heading(sp.name); fs.add(sp, "grip", 0.1, 1.5, 0.01).name(`${sp.name} grip`); fs.add(sp, "roll", 0, 0.4, 0.002).name(`${sp.name} rolling`); }
const fc = ui.addFolder("Camera", { id: "spot-cam", open: false });
for (const [k, a, b, st] of [["distance", 1.5, 10, 0.1], ["height", 0.2, 4, 0.05], ["lookHeight", 0, 2, 0.05], ["lookAhead", 0, 4, 0.1], ["fov", 40, 90, 1], ["fovKick", 0, 30, 1], ["shake", 0, 3, 0.1]]) fc.add(BIKE_CAMERA, k, a, b, st).name(k);
fc.add(BIKE_CAMERA, "mode", ["chase", "far", "low", "side"]).name("mode").onChange(() => chase.reset());
const fsd = ui.addFolder("Sound", { id: "spot-sound", open: false });
for (const [k, [a, b, st]] of Object.entries(SOUND_RANGES)) fsd.add(SOUND, k, a, b, st).name(k);

// ---------------------------------------------------------------- the telemetry strip
const tele = document.getElementById("tele");
tele.innerHTML = `<div class="big" id="tv">0<small> km/h</small></div>
<div class="col"><span><span class="k">lean</span> <b id="tl">0</b>° <span class="k">pitch</span> <b id="tp">0</b>°</span><span><span class="k">grade</span> <b id="tg">0</b> % <span class="k">fps</span> <b id="tfps">0</b></span></div>
<div class="col"><span id="tst"></span><span id="tland" class="k"></span></div>`;
const $ = (id) => document.getElementById(id);
window.__bike = { get state() { return s; }, camera, orbit,
  /** a fixed look (orbit on, the bike paused): view([x, y, z], [tx, ty, tz]) */
  view(p, t) { if (!ORB.on) orbitToggle(true); ORB.fixed = true; camera.position.set(...p); orbit.target.set(...t); orbit.update(); }, ORB, orbitToggle, orbitPreset, look, BIKE, env, chase, place, P, K, mount, SPOT_SPOTS };

// ---------------------------------------------------------------- loop
const pose = {};
const NO_INPUT = { pedal: 0, sprint: false, brakeF: 0, brakeR: 1, steer: 0, lean: 0, hop: false, pump: 0, trick: false };
const ease = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
let last = performance.now(), frames = 0, landT = -1, fps = 60, fpsT = 0, fpsN = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  fpsT += dt; fpsN++; if (fpsT > 0.5) { fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
  const stepInput = (lag) => keys.sample(now - lag * 1000 / Math.max(0.05, P.slow), DT);
  const fdt = P.pause ? 0 : dt * P.slow;
  if (K.on) {
    const tp = K.tp, root = tp.body.root;
    stepMount(mount, { e: !!K.e }, { x: tp.x, z: tp.z }, { x: s.x, z: s.z, heading: s.heading, speed: bikeSpeed(s), crashed: s.crashed, air: s.air, lean: s.lean, lying: mount.park.mode === "lying" }, fdt);
    K.e = false;
    for (const ev of mount.events) {
      if (ev === "mount" || ev === "getUp") { K.snap = K.rider.snapshot(root); tp.on = false; root.visible = true; s.vx = s.vz = 0; startCamBlend(); chase.reset(); }
      else if (ev === "pickUp") { getUp(s, env); banner("picks the bike up"); }
      else if (ev === "dismount") { K.snap = K.rider.snapshot(root); const sp = mountSpot(s); tp.start(sp.x, W.height(sp.x, sp.z) + 0.03, sp.z, s.heading); tp.autopilot = (inp) => { inp.x = 0; inp.z = 0; inp.run = false; }; startCamBlend(); }
      else if (ev === "foot") { tp.autopilot = null; root.rotation.set(0, root.rotation.y, 0); }
      else if (ev === "tooFast") banner("too fast to get off (slow down)");
      else if (ev === "far") banner("walk up to the bike, then E");
      else if (ev === "crash") { const r = s.rider; K.crashYaw = Math.atan2(r.vx || Math.sin(s.heading), r.vz || Math.cos(s.heading)); }
    }
  }
  const riding = !K.on || ridden(mount);
  if (riding) advanceBike(s, !K.on || mount.state === "riding" ? stepInput : NO_INPUT, fdt, env, BIKE, SURFACES);
  else parkStep(mount, s, fdt, W.height(s.x, s.z));
  keys.apply(now);
  if (s.lastLanding && s.lastLanding.t !== landT) { landT = s.lastLanding.t; if (s.lastLanding.band === "sketchy") banner(`sketchy landing (${s.lastLanding.why})`); }
  snd.update(s, BIKE);
  bikePose(s, P.pause ? 1 : s.alpha, pose);
  model.update(s, pose, groundAt);
  K.bmx?.update(s, camera.position.distanceTo(model.root.position), groundAt);
  if (K.on) {
    const tp = K.tp, root = tp.body.root, R = K.rider, st = mount.state;
    root.updateMatrixWorld(true);
    if (st === "foot" || st === "dismounting" || st === "pickUp") {
      if (fdt > 0) tp.update(fdt);
      if (st === "dismounting" && K.snap) R.blendFrom(K.snap, root, ease(mount.t / MOUNT.dismountTime));
    } else if (st === "crashed") {
      const r = s.rider, gy = W.height(r.x, r.z), t = mount.t;
      if (t < 0.75) R.clipPose(root, "Roll", 0.15 + t * 1.6, r.x, gy, r.z, K.crashYaw);
      else if (t < MOUNT.tumble) R.clipPose(root, "FallDown", 2.3, r.x, gy, r.z, K.crashYaw);
      else R.clipPose(root, "CrouchIdle", 0, r.x, gy, r.z, K.crashYaw);
    } else {
      if (s.pushing) R.push(K.E, s, root, W.height(pose.x, pose.z), s.walkPhase);
      else R.ride(K.E, s, root, W.height(pose.x, pose.z));
      if (st === "mounting" && K.snap) { const w = ease(mount.t / MOUNT.mountTime); R.blendFrom(K.snap, root, w, Math.sin(Math.PI * w) * 0.12); }
    }
    K.ik = `${st} · LOD${K.kid.lod}`;
  }
  const onFoot = K.on && (mount.state === "foot" || mount.state === "dismounting" || mount.state === "pickUp");
  if (ORB.on && ORB.fixed) orbit.update();
  else if (ORB.on) orbitStep(onFoot ? K.tp : pose);
  else if (!onFoot) chase.update(s, pose, dt, groundAt, env.solidAt);
  if (camBlend.t < 1) {
    camBlend.t = Math.min(1, camBlend.t + dt / camBlend.dur);
    const w = ease(camBlend.t);
    camera.position.lerpVectors(camBlend.p, camera.position.clone(), w); camera.quaternion.slerpQuaternions(camBlend.q, camera.quaternion.clone(), w);
  }
  if (K.on) K.kid.autoLod(camera.position.distanceTo(K.tp.body.root.position));
  const fx = onFoot ? K.tp.x : pose.x, fy = onFoot ? K.tp.y : pose.y, fz = onFoot ? K.tp.z : pose.z;
  FOCUS.set(fx, fy, fz); look.update(dt, FOCUS, s); look.render();
  if (bannerT > 0 && (bannerT -= dt) <= 0) bannerEl.style.opacity = 0;
  if (s.crashed && s.crashT < 0.05 && s.crashT > 0) banner(`crash: ${s.crashCause}`);
  if (++frames % 6 === 0) writeTele();
});
function writeTele() {
  $("tv").innerHTML = `${Math.abs(bikeSpeed(s) * 3.6).toFixed(0)}<small> km/h</small>`;
  $("tl").textContent = (s.lean * 57.3).toFixed(0); $("tp").textContent = (s.pitch * 57.3).toFixed(0); $("tg").textContent = (s.grade * 100).toFixed(0); $("tfps").textContent = fps.toFixed(0);
  const st = s.crashed ? `<span class="warn">CRASH: ${s.crashCause}</span>` : s.grindSeg >= 0 ? `<span class="hot">${s.grindV < BIKE.grindMinSpeed ? "stall" : "grind"} ${EDGE_NAMES[s.grindType]} ${s.grindDist.toFixed(1)} m</span>` : s.air ? `<span class="hot">${s.park.vertT >= 0 ? "vert " : ""}air ${s.airT.toFixed(2)} s</span>` : s.manual > 0 ? `<span class="hot">manual ${s.manual.toFixed(1)} s</span>` : s.skid ? `<span class="hot">SKID</span>` : `<span class="ok">riding</span>`;
  $("tst").innerHTML = st + ` <span class="k">hops ${s.hops} grinds ${s.grinds} crashes ${s.crashes}</span>`;
  const L = s.lastLanding;
  $("tland").textContent = L ? `last landing: ${L.band}${L.band === "clean" ? "" : ` (${L.why})`} (${L.air.toFixed(2)} s air)` : "";
  P.info = `${K.on ? mount.state + " · " : ""}${st.replace(/<[^>]+>/g, "")}`;
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
