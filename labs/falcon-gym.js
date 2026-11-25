// THE FALCON GYM (docs/FALCON_GYM.md): a small greybox playground under the city's own sky, sun, haze and post chain
// (viewer/lighting.js + viewer/post.js, as labs/capsule-lab.js), to tune the falcon's flight, take-offs and landings
// and its animations before they go to the city game. Two controllers, switchable in the panel:
//   gym      viewer/falconGym/gymFlight.js (the proposal: mouse direction steering, auto-level, flap-glide cruise,
//            Space power, the stoop, soft walls, ground take-off / hop to a ledge, the flare)
//   current  the city game's (viewer/falconFlight/: flightModel.js + flightAssist.js + falconFun.js via falconGame.js)
// The greybox (gymLayout.js), the pigeons (viewer/falconFlight/pigeons.js), the air (air.js: thermals over the field,
// slope lift off the blocks), the falcon (gymBird.js: the current model or v2), the chase camera (falconCamera.js).
// No sound (the lab never makes any). ?time=midday|golden  ?ctl=gym|current  ?start=field|alley|passage|tower|high300|high800
// ORBIT (O, the panel's "Orbit / inspect"): the flight pauses, three's OrbitControls round the falcon's body centre
// (drag = rotate, wheel = zoom 0.3-40 m (to see the far LOD switch), right-drag / Shift-drag = pan), the clip picker plays in place; O again = back
// to the exact flight state. ?orbit=1 starts in it.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { makeGymWorld, Y0, FIELD } from "../viewer/falconGym/gymLayout.js";
import { buildGymScene } from "../viewer/falconGym/gymScene.js";
import { GymFlight, GymControls, GYM, fillGymControls } from "../viewer/falconGym/gymFlight.js";
import { GymBird, v2Exists, LOD_FAR_PX, LOD_NEAR_PX } from "../viewer/falconGym/gymBird.js";
import { AirField } from "../viewer/falconFlight/air.js";
import { Pigeons } from "../viewer/falconFlight/pigeons.js";
import { FalconInput } from "../viewer/falconFlight/falconInput.js";
import { FalconCamera } from "../viewer/falconFlight/falconCamera.js";
import { FalconGame } from "../viewer/falconFlight/falconGame.js";

const qp = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp, smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const log = (s) => console.log(`[falcon gym] ${s}`);

const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 6000);
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the world
const world = makeGymWorld();
const gym = buildGymScene(scene);
const air = new AirField({ grid: world.liftGrid, floor: world.floor, sources: world.thermalSources });
air.setWind(+(qp.get("wind") ?? 3), +(qp.get("windfrom") ?? 240));
const pigeons = new Pigeons({ world, roosts: world.roosts, home: FIELD, count: +(qp.get("pigeons") ?? 40), scale: 1.0 });
scene.add(pigeons.mesh);
const input = new FalconInput(renderer.domElement, { invert: qp.get("invert") === "1" });
const fcam = new FalconCamera(camera, scene);
const HAS_V2 = await v2Exists();
const birds = { current: await GymBird.create("current"), v2: HAS_V2 ? await GymBird.create("v2", 1.05, renderer).catch((e) => { log(`v2 failed: ${e.message}`); return null; }) : null };
let bird = birds.current;
scene.add(bird.root);
// the side-by-side stand (the model comparison): both models perched on a plinth by the field, life size
const stand = new THREE.Group(); stand.name = "model-stand"; scene.add(stand); stand.visible = false;

// the two controllers
const gf = new GymFlight(world); gf.air = air;
const game = new FalconGame({ world, air, bird, pigeons, fam: null, audio: null, input });
game.size.readable = 2.0; game.size.life = GYM.span;
const C = new GymControls();

// ------------------------------------------------------------------------------------------------ starts
let script = null;                       // a demo's scripted input (cleared by any start)
const START = {
  "on the field": () => place(FIELD.x + 8, Y0, FIELD.z + 18, 0),
  "in the alley (4 m)": () => place(62, Y0, -9, -Math.PI / 2),
  "under the passage": () => place(-8, Y0, 38, 0),
  "in the courtyard": () => place(-59, Y0, -59, 0),
  "on block B's railing": () => place(78, Y0 + 23, 5.85, Math.PI),
  "on the tower balcony": () => place(-2, Y0 + 61, -76.6, Math.PI),
  "on the spire": () => place(-2, Y0 + 86, -82, Math.PI),
  "flying, 40 m": () => fly(60, Y0 + 40, 120, 0, 20),
  "high, 300 m (stoop)": () => fly(120, Y0 + 300, 150, Math.atan2(120, 150), 18),
  "high, 800 m (stoop)": () => fly(200, Y0 + 800, 260, Math.atan2(200, 260), 18),
};
function place(x, y, z, h) {
  script = null;
  if (S.ctl === "gym") gf.placeOnGround(x, y, z, h);
  else game.perchOn({ name: "ground", pos: new THREE.Vector3(x, y, z), yaw: h, roof: y > Y0 + 1 });
  input.syncAim(h, 0);
}
function fly(x, y, z, h, V) {
  script = null;
  if (S.ctl === "gym") gf.launchAt(x, y, z, h, V, 0); else game.start(x, y, z, h, V, 0);
  input.syncAim(h, 0);
}
game.reset = () => START[S.start]();

// ------------------------------------------------------------------------------------------------ panel
const CLIPS = ["perch", "glide", "flap", "stoop", "talons", "flare", "walk", "hop", "takeoff", "land"];
const S = {
  ctl: qp.get("ctl") === "current" ? "current" : "gym", model: "current", plumage: "juvenile", compare: false, standPose: "perch", clip: "auto", start: "on the field", slowmo: 1,
  time: preset, hour: lighting.hour, post: true, pigeons: pigeons.count, readable: 2.0,
  readout: "", stats: "",
  orbit: false, orbitClip: "auto", orbitSpeed: 1, orbitPause: false, turntable: false, studio: false, lod: "auto", lodInfo: "",
  ...Object.fromEntries(["cruise", "stoopPush", "nMax", "nMaxStoop", "thrust0", "stunVn", "look", "rollRate"].map((k) => [k, GYM[k]])),
};
const ui = new Panel({ title: "Falcon Gym" });
const f0 = ui.addFolder("Falcon");
f0.add(S, "ctl", ["gym", "current"]).name("controller").onChange((v) => switchCtl(v));
f0.add(S, "model", HAS_V2 && birds.v2 ? ["current", "v2"] : ["current"]).name("model").onChange((v) => setModel(v)).hint(HAS_V2 ? "" : "v2: models/bird/v2/falcon_v2.glb not built yet");
if (birds.v2?.plumages?.juvenile) f0.add(S, "plumage", ["juvenile", "adult"]).name("v2 plumage").onChange((v) => { for (const b of [birds.v2, ...(standBirds || [])]) b?.setPlumage?.(v); });
if (birds.v2?.far) {
  f0.add(S, "lod", ["auto", "near", "far"]).name("v2 LOD").hint(`auto: the far mesh (${birds.v2.lodTris.far} triangles) when the drawn span is under ${LOD_FAR_PX} px, the near (${birds.v2.lodTris.near}) again over ${LOD_NEAR_PX}`);
  f0.add(S, "lodInfo").name("v2 LOD now").listen();
}
f0.add(S, "compare").name("side by side (both models on the stand)").onChange((v) => setCompare(v));
f0.add(S, "standPose", ["perch", "glide"]).name("stand pose").onChange((v) => placeStand());
f0.add(S, "clip", ["auto", ...CLIPS]).name("clip (preview)").onChange((v) => { for (const b of Object.values(birds)) if (b) b.forceClip = v === "auto" ? null : v; });
f0.add(S, "slowmo", 0.05, 1, 0.05).name("time scale");
f0.add(S, "readable", 1, 3, 0.05).name("drawn span in the air (m)").onChange((v) => { game.size.readable = v; });
f0.add(S, "readout").name("speed / altitude").listen();
const fs = ui.addFolder("Start");
fs.add(S, "start", Object.keys(START)).name("start").onChange((v) => START[v]());
fs.add({ go: () => START[S.start]() }, "go").name("reset (R)");
fs.add({ go: () => demo("stoop") }, "go").name("demo: a stoop from 300 m");
fs.add({ go: () => demo("alley") }, "go").name("demo: take-off in the alley");
fs.add({ go: () => demo("passage") }, "go").name("demo: out from under the passage");
const ft = ui.addFolder("Tuning (gym controller)");
const tune = (k, a, b, s, label) => ft.add(S, k, a, b, s).name(label).onChange((v) => { gf.P[k] = v; });
tune("cruise", 15, 26, 0.5, "cruise speed (m/s), hands off");
tune("thrust0", 0.3, 0.8, 0.01, "wingbeat thrust at rest (g)");
tune("stoopPush", 0, 3, 0.05, "stoop push (x g; 0 = pure physics)");
tune("nMax", 3, 9, 0.1, "pull limit (g)");
tune("nMaxStoop", 4, 10, 0.1, "pull-out limit in the stoop (g)");
tune("rollRate", 1, 6, 0.1, "roll rate (rad/s)");
tune("look", 0.3, 2.5, 0.05, "wall look-ahead (s)");
tune("stunVn", 6, 30, 0.5, "tumble above (m/s into a wall)");
ft.add(S, "stats").name("stats").listen();
ft.close();
const fl = ui.addFolder("Light / world");
fl.add(S, "time", Object.keys(PRESETS)).name("light preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 21, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects");
fl.add(S, "pigeons", 0, 120, 1).name("pigeons").onChange((v) => pigeons.setCount(v));
fl.close();
const fo = ui.addFolder("Orbit / inspect (O)");
fo.add(S, "orbit").name("orbit the falcon (O)").onChange((v) => setOrbit(v)).listen().hint("the flight pauses; drag = rotate, wheel = zoom, right-drag / Shift-drag = pan; O again = back to the flight");
fo.add(S, "orbitClip", ["auto", ...CLIPS]).name("clip in place").onChange(() => orbitRecentre(true)).hint("auto = the pose it had when the flight paused");
fo.add(S, "orbitSpeed", 0, 2, 0.05).name("clip time scale");
fo.add(S, "orbitPause").name("pause the clip (P)").listen();
fo.add(S, "turntable").name("turntable (T)").onChange((v) => { orbit.controls.autoRotate = v; }).listen();
fo.add(S, "studio").name("studio fill light").hint("lifts the shadow side: the city lighting's own hemisphere light turned up (no light added)");
for (const v of ["front", "side", "back", "below", "above"]) fo.add({ go: () => orbitView(v) }, "go").name(`view: ${v}`);
fo.add({ go: () => orbitRecentre(true) }, "go").name("re-centre on the body");

function switchCtl(v) {
  // hand the state over (position, heading, speed / perched)
  if (v === "current") {
    const f = gf;
    if (f.mode === "fly" || f.mode === "land" || f.mode === "launch") game.start(f.pos.x, f.pos.y, f.pos.z, f.heading, Math.max(f.V, 10), f.gamma);
    else game.perchOn({ name: "ground", pos: new THREE.Vector3(f.pos.x, f.feetY, f.pos.z), yaw: f.heading, roof: f.feetY > Y0 + 1 });
  } else {
    const f = game.f;
    if (game.mode === "fly") gf.launchAt(f.pos.x, f.pos.y, f.pos.z, f.heading, Math.max(f.V, 10), f.gamma);
    else gf.placeOnGround(f.pos.x, game.perch ? game.perch.pos.y : f.pos.y - 0.35, f.pos.z, game.perch?.yaw ?? f.heading);
  }
  S.ctl = v;
}
function setModel(v) {
  const nb = birds[v] || birds.current;
  if (nb === bird) return;
  bird.root.removeFromParent(); bird = nb; scene.add(bird.root); game.bird = bird; S.model = v;
}
let standBirds = null;
// perched on the plinth's top (the feet on it), or held 25 cm over it in the glide
function placeStand() { for (const b of standBirds || []) b.root.position.set(b.standX, Y0 + 1.2 + (S.standPose === "perch" ? 0 : 0.25), 0); }
const STAND_F = { heading: 0, gamma: 0, alpha: 0, phi: 0, fold: 0, flapLevel: 0, brake: 0, V: 15, walkV: 0 };
async function setCompare(on) {
  stand.visible = on;
  if (on && !standBirds) {
    standBirds = [];
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 1.2), gym.materials.trim); plinth.position.set(0, Y0 + 0.6, 0); plinth.castShadow = plinth.receiveShadow = true; stand.add(plinth);
    for (const [i, w] of [["current", -0.8], ["v2", 0.8]].map((x) => x)) {
      if (i === "v2" && !HAS_V2) continue;
      const b = await GymBird.create(i, 1.05, renderer, S.plumage); b.standX = w * 1.6; stand.add(b.root); standBirds.push(b);
    }
    placeStand();
    stand.position.set(FIELD.x - 6, 0, FIELD.z + 10); stand.rotation.y = Math.PI * 0.85;
  }
}

// ------------------------------------------------------------------------------------------------ demos (scripted inputs for the screenshots / checks)
function demo(name) {
  if (S.ctl !== "gym") switchCtl("gym");
  if (name === "stoop") {
    START["high, 300 m (stoop)"]();
    let released = false;
    script = (f, C) => { C.aimYaw = Math.atan2(-(FIELD.x - f.pos.x), -(FIELD.z - f.pos.z)); C.aimPitch = released ? 0 : -1.35; C.stoop = released ? 0 : 1; if (f.guarding) released = true; if (released && f.mode === "fly" && f.gamma > -0.05) script = null; };
  } else if (name === "alley") { START["in the alley (4 m)"](); C.jump = true; script = (f, C) => { if (f.mode === "fly") script = null; }; }
  else if (name === "passage") { START["under the passage"](); C.jump = true; script = (f, C) => { if (f.mode === "fly") script = null; }; }
}

// ------------------------------------------------------------------------------------------------ the gym controller's input
let spaceWas = false, flapWas = false, lastMouse = performance.now();
addEventListener("mousemove", () => { lastMouse = performance.now(); });
const _lead = { x: 0, y: 0, z: 0 }, _pv = { x: 0, y: 0, z: 0 };
let target = -1;
function gymControls(dt) {
  input.update(dt, gf);                            // fills the intent + the raw controls (keys, mouse, pad, touch)
  const I = input.intent, R = input.C;
  // the aim: the mouse direction while pointer-locked; it relaxes to level when the mouse rests (auto-level)
  if (I.aim && performance.now() - lastMouse > 600 && gf.mode === "fly") input.aim.pitch *= Math.exp(-1.2 * dt);
  fillGymControls(C, I, R);                        // (gymFlight.js: the one mapping the test checks too)
  const space = R.flap > 0.5;
  if (space && !spaceWas) C.jump = true;
  spaceWas = space;
  if (input.take("land")) C.land = true;
  // the chase (F held): the falcon aims at the lead point of the pigeon in the ring (smooth: the controller's own rates)
  C.talons = input.talons ? 1 : 0;
  if (gf.mode === "fly") {
    const hx = -Math.sin(gf.heading) * Math.cos(gf.gamma), hy = Math.sin(gf.gamma), hz = -Math.cos(gf.heading) * Math.cos(gf.gamma);
    if (!input.talons || target < 0 || pigeons.state[target] === 3) target = pigeons.target(gf.pos.x, gf.pos.y, gf.pos.z, hx, hy, hz, 160, 0.45);
    if (input.talons && target >= 0) {
      pigeons.pos(target, _lead); pigeons.vel(target, _pv);
      const d = Math.hypot(_lead.x - gf.pos.x, _lead.y - gf.pos.y, _lead.z - gf.pos.z), tgo = clamp(d / Math.max(gf.V, 8), 0, 3);
      const lx = _lead.x + _pv.x * tgo - gf.pos.x, ly = _lead.y + _pv.y * tgo - gf.pos.y, lz = _lead.z + _pv.z * tgo - gf.pos.z;
      C.aimYaw = Math.atan2(-lx, -lz); C.aimPitch = Math.atan2(ly, Math.hypot(lx, lz));
      if (ly < -d * 0.3) C.stoop = 1;
      if (d < 1.0 + 0.6 * bird.span) { pigeons.take(target); caught++; gf.say("catch", `caught a pigeon at ${(gf.V * 3.6).toFixed(0)} km/h`); target = -1; }
      if (C.aimYaw != null) input.aim.yaw = C.aimYaw, input.aim.pitch = C.aimPitch;
    }
  } else target = -1;
  if (script) script(gf, C);
  if (input.take("reset")) START[S.start]();
}
let caught = 0;

// ------------------------------------------------------------------------------------------------ HUD
const $hud = $("hud"), $msg = $("msg"), $speed = $("speed"), $aim = $("aim"), $tgt = $("tgt"), $perch = $("perch");
const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Vector3();
function screen(v, el, show) {
  if (!show) { el.style.display = "none"; return; }
  _p.copy(v).project(camera);
  if (_p.z > 1 || Math.abs(_p.x) > 1.2 || Math.abs(_p.y) > 1.2) { el.style.display = "none"; return; }
  el.style.display = "block"; el.style.left = `${(_p.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-_p.y * 0.5 + 0.5) * innerHeight}px`;
}
const MODE = { ground: "STANDING", hop: "HOPPING / WALKING OUT", launch: "TAKE-OFF", fly: "FLYING", land: "LANDING: the flare" };
function hud(st) {
  const kmh = st.V * 3.6, bar = (x, col = "#7fd18b") => `<span class="bar"><i style="width:${(x * 100).toFixed(0)}%;background:${col}"></i></span>`;
  $speed.innerHTML = `${kmh.toFixed(0)} km/h<small>${st.agl.toFixed(0)} m above · ${(st.y - Y0).toFixed(0)} m over the field</small>`;
  S.readout = `${kmh.toFixed(0)} km/h · ${st.agl.toFixed(0)} m AGL · ${(st.y - Y0).toFixed(0)} m`;
  $hud.innerHTML = `controller ${S.ctl}   ${st.modeName}${st.cfg ? "   " + st.cfg : ""}
speed    ${st.V.toFixed(1).padStart(5)} m/s  ${kmh.toFixed(0).padStart(3)} km/h   top ${(st.top * 3.6).toFixed(0)} km/h
height   ${st.agl.toFixed(0).padStart(4)} m above the floor  (${(st.y - Y0).toFixed(0)} m over the field)
climb    ${(st.vy >= 0 ? "+" : "") + st.vy.toFixed(1)} m/s   air ${(st.lift >= 0 ? "+" : "") + st.lift.toFixed(1)} m/s   load ${st.n.toFixed(1)} g  bank ${(st.phi * 57.3).toFixed(0)}°${st.stun > 0 ? "   TUMBLE" : ""}
stamina  ${bar(st.sta, st.sta < 0.15 ? "#e0705a" : "#7fd18b")}   pigeons caught ${S.ctl === "gym" ? caught : game.score.catches}
input    ${input.device}${input.mouseAim && input.mouse.locked ? " (mouse aim)" : " — click the view for mouse aim"}${script ? " · DEMO" : ""}`;
}
let msgs = [];
function messages(now) {
  for (const e of gf.events.splice(0)) msgs.push({ s: e.s, t: now });
  for (const m of game.messages.splice(0)) msgs.push({ s: m.s, t: now });
  msgs = msgs.filter((m) => now - m.t < 3500).slice(-4);
  $msg.innerHTML = msgs.map((m) => m.s).join("<br>");
}

// ------------------------------------------------------------------------------------------------ orbit / inspect
// The flight pauses (gf / game are not stepped: leaving returns to the exact state); the camera's transform and the
// bird's clip weights and layers are saved and put back. The studio fill makes NO light (fixed light count, rule
// falcon-gym: no light made in the gym's files): it raises the intensity of the city Lighting's own hemisphere light
// (made at startup, kept at 0 under the firmament sky) and puts the value back.
const studio = { on: false, keep: 0 };
function setStudio(on) {
  if (on === studio.on) return;
  // (a quarter of the key light: lighting.keyColor is the sun's colour x illuminance; the firmament's sun.intensity is 1)
  const k = lighting.keyColor, key = Math.max(0.2126 * k.r + 0.7152 * k.g + 0.0722 * k.b, lighting.sun.intensity);
  if (on) { studio.keep = lighting.hemi.intensity; lighting.hemi.intensity = studio.keep + 0.25 * key; }
  else lighting.hemi.intensity = studio.keep;
  studio.on = on;
}
const orbit = {
  on: false, controls: new OrbitControls(camera, renderer.domElement), saved: null,
  f: null, mode: "perch", talons: 0, perchYaw: 0,
  NF: { heading: 0, gamma: 0, alpha: 0, phi: 0, fold: 0, flapLevel: 0, brake: 0, V: 15, walkV: 0 },
};
Object.assign(orbit.controls, { enabled: false, enableDamping: true, dampingFactor: 0.12, minDistance: 0.3, maxDistance: 40, autoRotateSpeed: 1.5, zoomSpeed: 0.8, screenSpacePanning: true });
const _ov = new THREE.Vector3();
function hipsOf(b) { return (b._hips ??= b.model.getObjectByName("hips") || b.root); }
/** the bird's body centre (its hips bone), world */
function bodyCentre(out) { bird.root.updateMatrixWorld(true); return hipsOf(bird).getWorldPosition(out); }
/** the target back on the body (after a clip / model change), the camera keeping its direction and distance */
function orbitRecentre(keep = true) {
  if (!orbit.on) return;
  const c = orbit.controls, d = Math.min(Math.max(camera.position.distanceTo(c.target), 0.3), 8);
  _ov.copy(camera.position).sub(c.target).normalize();
  orbitPose(0, 1 / 30); bodyCentre(c.target);
  if (keep) camera.position.copy(c.target).addScaledVector(_ov, d);
  c.update();
}
/** a preset view round the bird's facing (front = in front of its face) */
function orbitView(v) {
  if (!orbit.on) setOrbit(true);
  const h = S.orbitClip !== "auto" ? orbit.perchYaw : orbit.f?.heading ?? orbit.perchYaw;
  const fx = -Math.sin(h), fz = -Math.cos(h), d = 1.9;
  const c = orbit.controls; bodyCentre(c.target);
  const off = { front: [fx, 0.15, fz], back: [-fx, 0.25, -fz], side: [-fz, 0.1, fx], below: [fx * 0.2, -1, fz * 0.2], above: [fx * 0.3, 1, fz * 0.3], three: [fx - fz * 0.9, 0.35, fz + fx * 0.9] }[v] || [fx, 0.2, fz];
  camera.position.copy(c.target).add(_ov.set(off[0], off[1], off[2]).normalize().multiplyScalar(d));
  c.update();
}
function setOrbit(on) {
  if (on === orbit.on) return;
  if (on) {
    orbit.saved = { bird, pos: camera.position.clone(), quat: camera.quaternion.clone(), up: camera.up.clone(), fov: camera.fov, forceClip: bird.forceClip, w: { ...bird.w }, lay: { ...bird.lay }, span: bird.span };
    input.setEnabled(false);                       // (lets go of the keys and the pointer lock; clicks no longer lock)
    orbit.on = true; S.orbit = true;
    camera.up.set(0, 1, 0); camera.fov = 40; camera.updateProjectionMatrix();
    bird.setSpan(GYM.span);                        // life size
    orbit.controls.enabled = true; orbit.controls.autoRotate = S.turntable;
    orbitPose(0, 1 / 30); orbitView("three");
    log("orbit on");
  } else {
    const s = orbit.saved; orbit.on = false; S.orbit = false; orbit.controls.enabled = false; orbit.controls.autoRotate = false; setStudio(false);
    camera.position.copy(s.pos); camera.quaternion.copy(s.quat); camera.up.copy(s.up); camera.fov = s.fov; camera.updateProjectionMatrix();
    if (s.bird === bird) { bird.forceClip = s.forceClip; Object.assign(bird.w, s.w); Object.assign(bird.lay, s.lay); bird.setSpan(s.span); }
    else bird.forceClip = S.clip === "auto" ? null : S.clip;
    input.setEnabled(true); orbit.saved = null;
    log("orbit off");
  }
}
/** the bird in place (at pos: where the last flight step put it, also for a model switched in since): the paused
 *  flight pose (auto) or the picked clip on a neutral, level body */
function orbitPose(adt, wdt) {
  const clip = S.orbitClip, NF = orbit.NF;
  if (clip === "auto") {
    bird.forceClip = orbit.saved?.forceClip ?? null;
    bird.pose(adt, pos, orbit.f || NF, { mode: orbit.mode, talons: orbit.talons, perchYaw: orbit.perchYaw, wdt });
    return;
  }
  // (a clip the model does not have: the current model's talons / flare / stoop are the glide + its procedural layer)
  const has = !!bird.actions[clip], ground = clip === "perch" || clip === "walk" || clip === "hop" || clip === "takeoff" || clip === "land";
  bird.forceClip = has ? clip : clip === "stoop" || clip === "talons" || clip === "flare" ? "glide" : null;
  NF.heading = orbit.perchYaw; NF.fold = clip === "stoop" ? 1 : 0; NF.brake = clip === "flare" && !has ? 1 : 0; NF.flapLevel = clip === "flap" ? 0.5 : 0; NF.walkV = 1;
  const a = bird.actions[clip];
  if (a && a.loop === THREE.LoopOnce && adt > 0 && a.time >= a.getClip().duration - 1e-3) a.reset().play();   // (the one-shots loop in place)
  bird.pose(adt, pos, NF, { mode: ground ? (clip === "walk" ? "walk" : clip === "hop" ? "hop" : "perch") : "fly", talons: clip === "talons" && !has ? 1 : 0, perchYaw: orbit.perchYaw, wdt });
}
function orbitStep(dtReal) {
  if (orbit.saved.bird !== bird) { bird.setSpan(GYM.span); orbit.saved.bird = bird; orbitRecentre(true); }
  orbitPose(S.orbitPause ? 0 : dtReal * S.orbitSpeed, dtReal);
  orbit.controls.update(dtReal);
  setStudio(S.studio);                             // (the shadow side lifted: the hemisphere light's intensity only)
  if (standBirds) for (const b of standBirds) b.pose(dtReal, b.root.position, STAND_F, { mode: S.standPose === "perch" ? "perch" : "fly" });
}

// ------------------------------------------------------------------------------------------------ the loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const pos = new THREE.Vector3(), aimV = new THREE.Vector3();
const st = { V: 0, agl: 0, y: 0, vy: 0, lift: 0, n: 1, phi: 0, sta: 1, stun: 0, top: 0, modeName: "", cfg: "" };
const camIn = { pos, va: null, V: 0, phi: 0, heading: 0, gamma: 0, span: 1, stun: 0, liftRate: 0 };
const camOpt = { aim: null, look: input.look, zoom: 1, perched: false, perchYaw: 0, floor: world.floor };
let t = 0, last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0, span = GYM.span;
const lab = { paused: false };
function step(dtReal) {
  const dt = dtReal * S.slowmo;
  t += dt;
  air.update(t);
  let birdMode, f;
  if (S.ctl === "gym") {
    gymControls(dt);
    gf.step(dt, C);
    f = gf;
    birdMode = gf.mode === "ground" ? (Math.abs(gf.walkV) > 0.08 ? "walk" : "perch") : gf.mode === "hop" ? (gf.hopT?.walk ? "walk" : "hop") : gf.mode;
    const agl = gf.agl() - GYM.radius;
    const want = gf.mode === "fly" ? GYM.span + (S.readable - GYM.span) * smooth(agl, 6, 30) : GYM.span;
    span += (want - span) * (1 - Math.exp(-2.5 * dtReal));
    bird.setSpan(span);
    pos.set(gf.pos.x, gf.mode === "fly" || gf.mode === "land" || gf.mode === "launch" ? gf.pos.y : gf.feetY, gf.pos.z);
    bird.pose(dt, pos, gf, { mode: birdMode, talons: C.talons || (gf.mode === "land" ? 1 : 0), perchYaw: gf.heading });
    Object.assign(st, { V: gf.V, agl: Math.max(0, agl), y: gf.pos.y, vy: gf.vel.y, lift: gf.lift, n: gf.n, phi: gf.phi, sta: gf.stamina, stun: gf.stun, top: gf.stats.maxV, modeName: MODE[gf.mode], cfg: gf.mode === "fly" ? (gf.fold > 0.75 ? "STOOP (tucked)" : gf.fold > 0.3 ? "half folded" : gf.guarding ? "pull-out" : gf.burstOn || gf.flapLevel > 0.5 ? "flapping" : "gliding") : "" });
    camIn.va = gf.va; camIn.V = gf.mode === "fly" ? gf.V : Math.max(gf.V, 0.1); camIn.phi = gf.phi; camIn.heading = gf.heading; camIn.gamma = gf.gamma; camIn.stun = gf.stun; camIn.liftRate = gf.lift;
    camOpt.perched = gf.mode === "ground" || gf.mode === "hop"; camOpt.perchYaw = gf.heading;
    S.stats = `grazes ${gf.stats.grazes} · tumbles ${gf.stats.stuns} · launches ${gf.stats.launches} · hops ${gf.stats.hops} · landings ${gf.stats.landings}`;
  } else {
    game.update(dt, camera);
    f = game.f;
    birdMode = game.mode;
    pos.copy(game.pos);
    Object.assign(st, { V: f.V, agl: game.agl ?? 0, y: f.pos.y, vy: f.vel.y, lift: f.lift, n: f.n, phi: f.phi, sta: f.stamina, stun: f.stun, top: game.score.maxSpeed, modeName: game.mode.toUpperCase(), cfg: "" });
    camIn.va = f.va; camIn.V = game.mode === "fly" ? f.V : Math.max(f.V, 0.1); camIn.phi = f.phi; camIn.heading = f.heading; camIn.gamma = f.gamma; camIn.stun = f.stun; camIn.liftRate = f.lift;
    camOpt.perched = game.mode === "perch"; camOpt.perchYaw = game.perch?.yaw ?? 0;
  }
  orbit.f = f; orbit.mode = birdMode; orbit.talons = S.ctl === "gym" ? (C.talons || (gf.mode === "land" ? 1 : 0)) : game.talonsOut ? 1 : 0;
  orbit.perchYaw = S.ctl === "gym" ? gf.heading : game.perch?.yaw ?? f.heading;
  pigeons.update(dt, t, { x: pos.x, y: pos.y, z: pos.z, speed: st.V, stoop: (f.fold ?? 0) > 0.7 });
  if (input.take("camera")) fcam.mode = fcam.mode === "chase" ? "head" : "chase";
  if (input.take("help")) $("help").style.display = $("help").style.display === "block" ? "none" : "block";
  const aiming = input.mouseAim && input.mouse.locked && !camOpt.perched;
  camOpt.aim = aiming ? aimV.set(-Math.sin(input.aim.yaw) * Math.cos(input.aim.pitch), Math.sin(input.aim.pitch), -Math.cos(input.aim.yaw) * Math.cos(input.aim.pitch)) : null;
  camOpt.zoom = input.zoom; camIn.span = bird.span;
  fcam.update(dtReal, camIn, camOpt);
  // the stand: both models perched (the standing shape) or in the glide (wings spread), or the clip the panel previews
  if (standBirds) for (const b of standBirds) b.pose(dtReal, b.root.position, STAND_F, { mode: S.standPose === "perch" ? "perch" : "fly" });
}
lab.advance = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) step(1 / 60); };
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (orbit.on) orbitStep(dt);
  else if (!lab.paused) step(dt);
  lighting.update(camera.position.y, Y0, pos, clamp(st.agl * 1.6 + 70, 70, 380), dt);
  // the v2 far LOD by the drawn span on screen (gymBird.updateLod: hysteresis); the panel can force one
  for (const b of [bird, ...(standBirds || [])]) if (b?.far) { b.lodMode = S.lod; b.updateLod(camera, renderer.domElement.clientHeight || innerHeight); }
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (++frames % 6 === 1) {
    hud(st); messages(now);
    if (bird.far) S.lodInfo = `${bird.lod} (${bird.lodTris[bird.lod]} tris), span ${bird.lodPx.toFixed(0)} px`;
    screen(_q.copy(camera.position).addScaledVector(aimV, 50), $aim, !!camOpt.aim);
    if (S.ctl === "gym" && target >= 0 && gf.mode === "fly") { pigeons.pos(target, _d); screen(_q.set(_d.x, _d.y, _d.z), $tgt, true); } else $tgt.style.display = "none";
    const q = S.ctl === "gym" && gf.mode === "fly" ? gf.landingTarget() : null;
    screen(q ? _q.set(q.x, q.y, q.z) : _q, $perch, !!q);
    lab.fps = fps;
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
if (qp.get("start")) { const k = { field: "on the field", alley: "in the alley (4 m)", passage: "under the passage", tower: "on the tower balcony", high300: "high, 300 m (stoop)", high800: "high, 800 m (stoop)" }[qp.get("start")]; if (k) S.start = k; }
if (S.ctl === "current") game.start(0, Y0 + 40, 60, 0, 18);
START[S.start]();
$("loading").remove();
addEventListener("keydown", (e) => {
  if (e.repeat || e.target?.closest?.(".upanel") || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
  if (e.code === "KeyO") setOrbit(!orbit.on);
  else if (orbit.on && e.code === "KeyT") { S.turntable = !S.turntable; orbit.controls.autoRotate = S.turntable; }
  else if (orbit.on && e.code === "KeyP") S.orbitPause = !S.orbitPause;
  else if (orbit.on && e.code === "Escape") setOrbit(false);
});
if (qp.get("orbit") === "1") { step(1 / 60); setOrbit(true); }   // (one step first: the bird placed at the start)
Object.assign(lab, { orbit, setOrbit, orbitView, orbitRecentre, renderer, scene, camera, world, gym, air, pigeons, input, fcam, game, gf, C, S, START, demo, birds, setModel, setCompare, placeStand, switchCtl, lighting, step });
Object.defineProperty(lab, "standBirds", { get: () => standBirds });   // (live: Object.assign would copy null)
Object.defineProperty(lab, "bird", { get: () => bird });               // (live too: Object.assign copied the first bird)
window.lab = lab;
log(`ready: ${world.boxes.length} boxes, ${world.ledges.length} ledges, v2 ${HAS_V2 ? "found" : "not built"}`);
