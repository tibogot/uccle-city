// THE FALCON FLIGHT LAB: flying as a peregrine over Saint-Job. The new flight (viewer/falconFlight/: flightModel.js,
// air.js, falconBird.js, falconCamera.js, falconInput.js, falconAudio.js, pigeons.js, hints.js, falconGame.js) next to
// today's fly mode (viewer/flight.js, untouched), in the real city: Saint-Job's 3 x 3 tiles through the city's tile
// worker and façades (viewer/falconFlight/cityWorld.js), the Saint-Job church and the falcon family (viewer/falcons.js)
// as the city has them, under the city's lighting and post chain. docs/FALCON_FLIGHT.md.
//
// ?time=midday|golden|...  ?wind=4  ?windfrom=240  ?pigeons=150  ?size=2  ?scenario=thermal|ridge|stoop|catch|land
import * as THREE from "three/webgpu";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { createFalcons } from "../viewer/falcons.js";
import { loadCityWorld, PLACE } from "../viewer/falconFlight/cityWorld.js";
import { AirField } from "../viewer/falconFlight/air.js";
import { Pigeons } from "../viewer/falconFlight/pigeons.js";
import { ThermalHints } from "../viewer/falconFlight/hints.js";
import { FalconBird } from "../viewer/falconFlight/falconBird.js";
import { FalconInput } from "../viewer/falconFlight/falconInput.js";
import { FalconCamera } from "../viewer/falconFlight/falconCamera.js";
import { FalconAudio } from "../viewer/falconFlight/falconAudio.js";
import { FalconGame } from "../viewer/falconFlight/falconGame.js";
import { G } from "../viewer/falconFlight/flightModel.js";

const qp = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const log = (s) => console.log(`[falcon flight] ${s}`);

const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 8000);
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the city, the family
const world = await loadCityWorld({ renderer, scene, lighting, log });
const fam = await createFalcons({ church: world.church, heightAt: world.floor });
scene.add(fam.group);
const air = new AirField({ grid: world.liftGrid, floor: world.floor, sources: world.thermalSources });
air.setWind(+(qp.get("wind") ?? 4), +(qp.get("windfrom") ?? 240));
const SIZE = +(qp.get("size") ?? 2.0);
const pigeons = new Pigeons({ world, roosts: world.roosts, home: PLACE, count: +(qp.get("pigeons") ?? 150), scale: SIZE * 0.7 });
scene.add(pigeons.mesh);
const hints = new ThermalHints(air, { scale: SIZE * 0.7 });
scene.add(hints.group);
const bird = await FalconBird.create(SIZE);
scene.add(bird.root);
const input = new FalconInput(renderer.domElement, { invert: qp.get("invert") === "1" });
const fcam = new FalconCamera(camera, scene);
const audio = new FalconAudio();
const game = new FalconGame({ world, air, bird, pigeons, fam, audio, input });
game.size.readable = SIZE;

// ------------------------------------------------------------------------------------------------ starts
const famW = (k) => fam.toWorld(fam.perch[k].pos.clone());
const START = {
  "over the Place (60 m)": () => game.start(PLACE.x + 120, world.ground(PLACE.x, PLACE.z) + 60, PLACE.z + 80, Math.atan2(120, 80), 14),
  "high above Saint-Job (650 m)": () => game.start(PLACE.x + 300, world.ground(PLACE.x, PLACE.z) + 650, PLACE.z + 250, Math.atan2(300, 250), 15),
  "on the spire cross": () => game.perchOn(game.perches.find((p) => p.name === "cross")),
  "on the eyrie's ledge": () => game.perchOn(game.perches.find((p) => p.name === "ledge")),
};
game.reset = () => { input.script = null; START["over the Place (60 m)"](); };

// ------------------------------------------------------------------------------------------------ verification scenarios (autopilots)
// each sets the scene up and gives the input a script: (f) -> controls. They fly the real model (no shortcuts).
const steer = (f, hT, gT, bankMax = 1) => ({ roll: clamp(-wrap(hT - f.heading) * 2.2, -bankMax, bankMax), pitch: clamp((gT - f.gamma) * 3.5, -1, 1) });
function bestRidge() {
  // the strongest line of updraft near the Place for the current wind: w at 7 m over the smoothed obstacles, summed
  // over +-40 m along the crosswind, the façade rows within 450 m
  const U = air.U, Ul = Math.hypot(U.x, U.z) || 1, cx = -U.z / Ul, cz = U.x / Ul;
  let best = null;
  for (let x = PLACE.x - 450; x < PLACE.x + 450; x += 6) for (let z = PLACE.z - 450; z < PLACE.z + 450; z += 6) {
    let s = 0;
    for (let k = -40; k <= 40; k += 8) { const X = x + cx * k, Z = z + cz * k; s += air.ridgeLift(X, air.hs(X, Z) + 7, Z, U.x * 1.5, U.z * 1.5); }
    if (!best || s > best.s) best = { s, x, z };
  }
  best.heading = Math.atan2(-cx, -cz);
  return best;
}
const SCEN = {
  thermal() {
    // midday sun, a light wind, the Place's column on: circle in its core at 35 deg of bank
    air.params.cloud = 0.1; air.setWind(2.5, 240);
    const th = air.thermals[0]; th.forced = true;
    air.update(game.t);
    const C = air.thermalCentre(th, th.ground + 60);
    game.start(C.x + 30, th.ground + 55, C.z, 0, 13);
    input.script = (f) => {
      const c = air.thermalCentre(th, f.pos.y);
      const dx = c.x - f.pos.x, dz = c.z - f.pos.z, d = Math.hypot(dx, dz), rx = dx / d, rz = dz / d;
      const R0 = c.R * 0.55;
      const tx = -rz + rx * (d - R0) / R0 * 0.9, tz = rx + rz * (d - R0) / R0 * 0.9;
      return { ...steer(f, Math.atan2(-tx, -tz), 0, 0.6), fold: 0, flap: 0, brake: 0 };
    };
    return "the Place's thermal: circling in the core";
  },
  ridge() {
    // a 7 m/s wind; the best row of façades across it; along it at ~8 m over the smoothed roofs, seeking the lift
    air.setWind(7, +(qp.get("windfrom") ?? 240)); air.params.thermals = 0;
    const r = bestRidge();
    game.start(r.x, air.hs(r.x, r.z) + 9, r.z, r.heading, 13);
    const h0 = r.heading;
    input.script = (f) => {
      const hx = -Math.sin(f.heading), hz = -Math.cos(f.heading), rx = -hz, rz = hx, t = game.t, o = { x: 0, y: 0, z: 0 };
      const L = air.sample(f.pos.x - rx * 8, f.pos.y, f.pos.z - rz * 8, t, o).y, R = air.sample(f.pos.x + rx * 8, f.pos.y, f.pos.z + rz * 8, t, o).y;
      const hT = h0 + clamp((L - R) * 0.25, -0.5, 0.5);
      const want = air.hs(f.pos.x, f.pos.z) + 9;
      return { ...steer(f, hT, clamp((want - f.pos.y) * 0.04, -0.25, 0.25), 0.5), fold: 0, flap: 0 };
    };
    return `ridge lift along the façades (wind ${air.params.wind} m/s from ${air.params.windFrom} deg), line strength ${r.s.toFixed(1)}`;
  },
  stoop() {
    // 650 m up, 15 m/s, tuck and dive at the Place (~60-70 deg), pull out with the wings half open
    air.setWind(3, 240);
    const y0 = world.ground(PLACE.x, PLACE.z) + 650;
    game.start(PLACE.x + 260, y0, PLACE.z + 200, Math.atan2(260, 200), 15, -0.2);
    let pulling = false;
    input.script = (f) => {
      const dx = PLACE.x - f.pos.x, dz = PLACE.z - f.pos.z, dy = world.ground(PLACE.x, PLACE.z) + 40 - f.pos.y, dh = Math.hypot(dx, dz);
      const agl = f.pos.y - world.floor(f.pos.x, f.pos.z);
      if (!pulling && agl < f.V * f.V / (5.5 * G) + 35) pulling = true;
      if (pulling) return { pitch: 1, roll: 0, fold: 0.5, flap: 0 };
      return { ...steer(f, Math.atan2(-dx, -dz), Math.atan2(dy, dh) - 0.08), fold: 1, flap: 0 };
    };
    return "the stoop: 650 m, tucked, at the Place";
  },
  catch() {
    // a stoop at a flying pigeon: pursuit with lead (proportional to the time to go), talons in the last 0.6 s
    air.setWind(3, 240);
    for (let i = 0; i < pigeons.max; i++) if (pigeons.state[i] === 0 && Math.random() < 0.5) pigeons.takeoff(i, PLACE.x, 0, PLACE.z);
    const y0 = world.ground(PLACE.x, PLACE.z) + 330;
    game.start(PLACE.x + 180, y0, PLACE.z + 140, Math.atan2(180, 140), 16, -0.3);
    const p = { x: 0, y: 0, z: 0 }, v = { x: 0, y: 0, z: 0 };
    let tgt = -1, after = 0;
    input.script = (f) => {
      if (game.score.catches) { after += 1 / 60; return { pitch: after < 3 ? 0.8 : 0, roll: 0, fold: 0, flap: after > 1 && after < 4 ? 1 : 0 }; }
      if (tgt < 0 || pigeons.state[tgt] === 3) { tgt = pigeons.target(f.pos.x, f.pos.y, f.pos.z, f.vel.x, f.vel.y, f.vel.z, 400, 1.2); game.target = tgt; }
      if (tgt < 0) return { pitch: -0.3, fold: 0.5 };
      pigeons.pos(tgt, p); pigeons.vel(tgt, v);
      const d = Math.hypot(p.x - f.pos.x, p.y - f.pos.y, p.z - f.pos.z), tgo = d / Math.max(f.V, 10);
      const ax = p.x + v.x * tgo - f.pos.x, ay = p.y + v.y * tgo - f.pos.y, az = p.z + v.z * tgo - f.pos.z;
      const agl = f.pos.y - world.floor(f.pos.x, f.pos.z);
      input.talons = tgo < 0.6;
      if (agl < 12 && f.vel.y < 0) return { pitch: 1, roll: 0, fold: 0.5 };
      return { ...steer(f, Math.atan2(-ax, -az), Math.atan2(ay, Math.hypot(ax, az))), fold: d > 60 ? 1 : 0.55, flap: 0 };
    };
    return "a strike: stoop on a pigeon of the flock";
  },
  land() {
    // 45 m out from the spire's cross, slow, then E (the landing flare onto the cross)
    air.setWind(2, 240);
    const q = game.perches.find((x) => x.name === "cross");
    const out = new THREE.Vector3(-Math.sin(q.yaw), 0, -Math.cos(q.yaw));
    const s = q.pos.clone().addScaledVector(out, 45).add(new THREE.Vector3(0, 6, 0));
    game.start(s.x, s.y, s.z, Math.atan2(out.x, out.z), 13, -0.05);
    let asked = false;
    input.script = (f) => {
      const dx = q.pos.x - f.pos.x, dy = q.pos.y + 1 - f.pos.y, dz = q.pos.z - f.pos.z, d = Math.hypot(dx, dz);
      if (!asked && d < 24) { input.actions.add("land"); asked = true; }
      return { ...steer(f, Math.atan2(-dx, -dz), Math.atan2(dy, d)), brake: d < 35 ? 0.6 : 0, fold: 0, flap: 0 };
    };
    return "landing on the spire's cross";
  },
};
function runScenario(name) {
  air.params.thermals = S.thermals; for (const th of air.thermals) th.forced = false;
  game.f.extraMass = 0; bird.drop(); game.trace.length = 0; game.t = 0; game.messages.length = 0;
  const s = SCEN[name](); S.scenario = name; game.say(s); log(s);
  return s;
}

// ------------------------------------------------------------------------------------------------ panel
const S = {
  start: "over the Place (60 m)", scenario: "none", time: preset, hour: lighting.hour, wind: air.params.wind, windFrom: air.params.windFrom, gust: air.params.gust,
  thermals: 1, ridge: 1, cloud: air.params.cloud, size: SIZE, camera: "chase", fov1: fcam.params.fov1, shake: 1, streaks: true, vignette: true,
  mouseAim: true, invert: input.invert, sound: true, vario: false, volume: 0.8, slowmo: 1,
  pigeons: pigeons.count, flee: pigeons.params.flee, startle: pigeons.params.startle, showPigeons: true, family: true,
  liftMap: false, marks: false, post: true, stats: "", bench: "-", trace: "",
};
const ui = new Panel({ title: "Falcon Flight Lab" });
const fs = ui.addFolder("Start / scenarios");
fs.add(S, "start", Object.keys(START)).name("start").onChange((v) => { input.script = null; START[v](); });
fs.add(S, "scenario", ["none", ...Object.keys(SCEN)]).name("verification autopilot").onChange((v) => { if (v === "none") input.script = null; else runScenario(v); }).listen();
fs.add({ go: () => { input.script = null; S.scenario = "none"; } }, "go").name("take the controls back");
const fw = ui.addFolder("Air");
fw.add(S, "wind", 0, 14, 0.1).name("wind at 10 m (m/s)").onChange((v) => air.setWind(v, S.windFrom)).listen();
fw.add(S, "windFrom", 0, 359, 1).name("wind from (deg)").onChange((v) => air.setWind(S.wind, v)).listen();
fw.add(S, "gust", 0, 1, 0.01).name("gusts").onChange((v) => { air.params.gust = v; });
fw.add(S, "thermals", 0, 2, 0.05).name("thermal strength").onChange((v) => { air.params.thermals = v; });
fw.add(S, "ridge", 0, 2, 0.05).name("façade / slope updrafts").onChange((v) => { air.params.ridge = v; });
fw.add(S, "cloud", 0, 1, 0.01).name("cloud (less sun)").onChange((v) => { air.params.cloud = v; });
fw.add(S, "liftMap").name("show the lift map (at the falcon's height)");
fw.add(S, "marks").name("show thermals / perches");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("light preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 21, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects");
fl.close();
const fc = ui.addFolder("Feel");
fc.add(S, "camera", ["chase", "head"]).name("camera").onChange((v) => { fcam.mode = v; }).listen();
fc.add(S, "size", 1, 3, 0.05).name("falcon draw size (span m)").onChange((v) => { game.size.readable = v; pigeons.scale = v * 0.7; hints.scale = v * 0.7; });
fc.add(S, "fov1", 60, 100, 1).name("FOV at 90 m/s").onChange((v) => { fcam.params.fov1 = v; });
fc.add(S, "shake", 0, 2, 0.05).name("camera shake").onChange((v) => { fcam.params.shake = v; });
fc.add(S, "streaks").name("air streaks").onChange((v) => { fcam.params.streaks = v; });
fc.add(S, "vignette").name("speed vignette").onChange((v) => { fcam.params.vignette = v; });
fc.add(S, "mouseAim").name("mouse aim (M)").onChange((v) => { input.mouseAim = v; }).listen();
fc.add(S, "invert").name("invert pitch (stick / touch)").onChange((v) => { input.invert = v; });
fc.add(S, "slowmo", 0.1, 1, 0.05).name("time scale").onChange((v) => { game.timeScale = v; });
fc.close();
const fa = ui.addFolder("Sound");
fa.add(S, "sound").name("sound on").onChange((v) => { audio.on = v; });
fa.add(S, "volume", 0, 1.5, 0.01).name("volume").onChange((v) => { audio.volume = v; });
fa.add(S, "vario").name("vario beep in lift").onChange((v) => { audio.vario = v; });
fa.close();
const fp = ui.addFolder("Pigeons");
fp.add(S, "pigeons", 0, 200, 1).name("pigeons").onChange((v) => pigeons.setCount(v));
fp.add(S, "flee", 10, 80, 1).name("flee distance (m)").onChange((v) => { pigeons.params.flee = v; });
fp.add(S, "startle", 10, 80, 1).name("startle distance (m)").onChange((v) => { pigeons.params.startle = v; });
fp.add(S, "showPigeons").name("draw them").onChange((v) => { pigeons.mesh.visible = v; });
fp.add(S, "family").name("the falcon family").onChange((v) => { fam.enabled = v; });
fp.close();
const fx = ui.addFolder("Performance");
fx.add(S, "stats").name("CPU ms").listen();
fx.add({ go: () => bench() }, "go").name("A/B: pigeons + hints off / on (GPU ms)");
fx.add(S, "bench").name("result").listen();
fx.add({ go: () => { const t = JSON.stringify(game.trace); navigator.clipboard?.writeText(t).catch(() => {}); S.trace = `${game.trace.length} samples copied`; } }, "go").name("copy the trace (JSON)");
fx.add(S, "trace").name("trace").listen();
fx.close();

// ------------------------------------------------------------------------------------------------ lift map, marks
const LM = 96, lmData = new Uint8Array(LM * LM * 4);
const lmTex = new THREE.DataTexture(lmData, LM, LM); lmTex.needsUpdate = true; lmTex.magFilter = THREE.LinearFilter;
const lmMesh = new THREE.Mesh(new THREE.PlaneGeometry(384, 384).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ map: lmTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
lmMesh.visible = false; lmMesh.renderOrder = 5; scene.add(lmMesh);
let lmT = 0;
function updateLiftMap(dt) {
  lmMesh.visible = S.liftMap; if (!S.liftMap || (lmT -= dt) > 0) return;
  lmT = 0.4;
  const f = game.f, y = f.pos.y, o = { x: 0, y: 0, z: 0 };
  lmMesh.position.set(f.pos.x, y - 1.5, f.pos.z);
  for (let j = 0; j < LM; j++) for (let i = 0; i < LM; i++) {
    const x = f.pos.x + (i / (LM - 1) - 0.5) * 384, z = f.pos.z + (j / (LM - 1) - 0.5) * 384;
    const w = y < world.floor(x, z) ? 0 : air.sample(x, y, z, game.t, o).y;
    const k = ((LM - 1 - j) * LM + i) * 4, a = clamp(Math.abs(w) / 3, 0, 1);
    lmData[k] = w < 0 ? 230 : 40; lmData[k + 1] = w > 0 ? 220 : 50; lmData[k + 2] = 60; lmData[k + 3] = Math.round(a * 150);
  }
  lmTex.needsUpdate = true;
}
const marks = new THREE.Group(); marks.visible = false; scene.add(marks);
const thMarks = air.thermals.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), new THREE.MeshBasicNodeMaterial({ color: 0xff9040, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); marks.add(m); return m; });
for (const p of game.perches) if (p.church) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicNodeMaterial({ color: 0xffd36a })); m.position.copy(p.pos); marks.add(m); }

// ------------------------------------------------------------------------------------------------ HUD
const $hud = $("hud"), $msg = $("msg"), $aim = $("aim"), $tgt = $("tgt"), $perch = $("perch"), tctx = $("trace").getContext("2d");
const _p = new THREE.Vector3();
function screen(v, el, show) {
  if (!show) { el.style.display = "none"; return; }
  _p.copy(v).project(camera);
  if (_p.z > 1 || Math.abs(_p.x) > 1.2 || Math.abs(_p.y) > 1.2) { el.style.display = "none"; return; }
  el.style.display = "block"; el.style.left = `${(_p.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-_p.y * 0.5 + 0.5) * innerHeight}px`;
}
function hud() {
  const f = game.f, w = game.window, cfg = f.fold < 0.25 ? "spread" : f.fold < 0.75 ? "half folded" : "TUCKED";
  const bar = (x, col = "#7fd18b") => `<span class="bar"><i style="width:${(x * 100).toFixed(0)}%;background:${col}"></i></span>`;
  const sc = game.score;
  $hud.innerHTML = `${game.mode === "perch" ? `PERCHED (${game.perch?.name})  E / Space: take off` : game.mode === "land" ? "LANDING: the flare" : `airspeed ${f.V.toFixed(1).padStart(5)} m/s  ${(f.V * 3.6).toFixed(0).padStart(3)} km/h   ${cfg}`}
height   ${game.agl.toFixed(0).padStart(4)} m over the roofs / ground  (${f.pos.y.toFixed(0)} m TAW)
air      ${(f.lift >= 0 ? "+" : "") + f.lift.toFixed(1)} m/s  climb ${(f.vel.y >= 0 ? "+" : "") + f.vel.y.toFixed(1)} m/s   load ${f.n.toFixed(1)} g  bank ${(f.phi * 57.3).toFixed(0)}°${f.stall > 0.3 ? "   STALL" : ""}${f.stun > 0 ? "   STUNNED" : ""}
stamina  ${bar(f.stamina, f.stamina < 0.15 ? "#e0705a" : "#7fd18b")}  energy ${(game.agl + f.V * f.V / (2 * G)).toFixed(0)} m
${w ? `target   ${w.d.toFixed(0)} m, closing ${w.closing.toFixed(0)} m/s, ${(w.angle * 57.3).toFixed(0)}°  ${w.ok ? "WINDOW OPEN" : ""}${game.talonsOut ? " · talons" : ""}` : "target   -"}
score    ${sc.points} · caught ${sc.catches} · delivered ${sc.delivered} · best strike ${sc.bestStrike} m/s · top ${sc.maxSpeed.toFixed(0)} m/s${bird.prey ? "\n         CARRYING: to the eyrie's ledge (E near it)" : ""}
${input.script ? `autopilot: ${S.scenario}` : `input: ${input.device}${input.mouseAim && input.mouse.locked ? " (mouse aim)" : ""}`}`;
  $msg.innerHTML = game.messages.filter((m) => game.t - m.t < 4).map((m) => m.s).join("<br>");
  // rings: the aim, the target, the perch in reach
  const aimD = new THREE.Vector3(-Math.sin(input.aim.yaw) * Math.cos(input.aim.pitch), Math.sin(input.aim.pitch), -Math.cos(input.aim.yaw) * Math.cos(input.aim.pitch));
  screen(camera.position.clone().addScaledVector(aimD, 50), $aim, input.mouseAim && input.mouse.locked && game.mode === "fly");
  if (w && game.mode === "fly") { pigeons.pos(w.i, _p); screen(new THREE.Vector3(_p.x, _p.y, _p.z), $tgt, true); $tgt.className = `ring${w.ok ? " ok" : ""}${w.near ? " near" : ""}`; } else $tgt.style.display = "none";
  const q = game.mode === "fly" ? game.perchInReach() : null;
  screen(q ? q.pos : _p, $perch, !!q);
  // the trace: airspeed (blue), height (green), energy height (orange), stamina (white) over the last 60 s
  const T = game.trace, W = 680, H = 220;
  tctx.clearRect(0, 0, W, H);
  if (T.length > 2) {
    const t1 = T.at(-1).t, t0 = t1 - 60, maxY = Math.max(60, ...T.map((s) => Math.max(s.agl, s.E)));
    const line = (k, col, scale) => { tctx.strokeStyle = col; tctx.lineWidth = 2; tctx.beginPath(); let first = true; for (const s of T) { if (s.t < t0) continue; const x = (s.t - t0) / 60 * W, y = H - 8 - s[k] * scale * (H - 16); if (first) tctx.moveTo(x, y); else tctx.lineTo(x, y); first = false; } tctx.stroke(); };
    line("V", "#6fa8ff", 1 / 100); line("agl", "#7fd18b", 1 / maxY); line("E", "#ffb060", 1 / maxY); line("sta", "#e6e9ee", 1);
    tctx.fillStyle = "#e6e9ee"; tctx.font = "20px ui-monospace, monospace";
    tctx.fillText(`speed /100 m/s · height · energy (max ${maxY.toFixed(0)} m) · stamina`, 10, 24);
  }
}

// ------------------------------------------------------------------------------------------------ the loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); } })
    .catch(() => {}).finally(() => { gpu.pending = false; });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
/** GPU A/B of the pigeons + the thermal hints (alternating off / on rounds in one page: the GPU is shared, numbers noisy) */
async function bench(rounds = 4) {
  const res = { off: [], on: [] };
  for (let r = 0; r < rounds * 2; r++) {
    const on = r % 2 === 1;
    pigeons.mesh.visible = hints.group.visible = on;
    await new Promise((ok) => setTimeout(ok, 600)); gpu.samples.length = 0;
    await new Promise((ok) => setTimeout(ok, 2000));
    res[on ? "on" : "off"].push(med(gpu.samples));
  }
  pigeons.mesh.visible = S.showPigeons; hints.group.visible = true;
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  S.bench = `GPU off ${avg(res.off).toFixed(2)} on ${avg(res.on).toFixed(2)} ms (${(avg(res.on) - avg(res.off) >= 0 ? "+" : "") + (avg(res.on) - avg(res.off)).toFixed(2)}) · rounds ${JSON.stringify(res)}`;
  log(`A/B ${S.bench}`);
  return { res, bench: S.bench };
}

const cpuAcc = { flight: [], pigeons: [], hints: [], game: [] };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const lab = { paused: false };
/** one simulation step (dt s): the game, the pigeons, the hints, the family, the air, the camera */
function step(dt) {
  const t = game.t;
  air.params.sunElev = Math.asin(clamp(lighting.sunDir.y, -1, 1)) * 57.3;
  for (const th of air.thermals) if (th.forced) th.phase = 0.2 - (t / (th.life + th.rest)) % 1;   // a forced column stays mid-life
  air.update(t);
  const c0 = performance.now();
  game.update(dt, camera);
  const c1 = performance.now();
  const f = game.f;
  pigeons.update(dt * game.timeScale, t, { x: f.pos.x, y: f.pos.y, z: f.pos.z, speed: f.V, stoop: f.fold > 0.7 });
  const c2 = performance.now();
  hints.update(dt * game.timeScale, t, f.pos);
  const c3 = performance.now();
  for (const e of pigeons.events.splice(0)) if (e.kind === "burst") audio.pigeonBurst(e.x, e.y, e.z, e.n);
  fam.update(camera, dt * game.timeScale);
  cpuAcc.game.push(c1 - c0); cpuAcc.pigeons.push(c2 - c1); cpuAcc.hints.push(c3 - c2);
  for (const k in cpuAcc) if (cpuAcc[k].length > 300) cpuAcc[k].shift();
  // the camera
  if (input.take("camera")) { fcam.mode = fcam.mode === "chase" ? "head" : "chase"; S.camera = fcam.mode; }
  if (input.take("help")) $("help").style.display = $("help").style.display === "block" ? "none" : "block";
  const aim = input.mouseAim && input.mouse.locked && game.mode === "fly" ? new THREE.Vector3(-Math.sin(input.aim.yaw) * Math.cos(input.aim.pitch), Math.sin(input.aim.pitch), -Math.cos(input.aim.yaw) * Math.cos(input.aim.pitch)) : null;
  fcam.update(dt, { pos: game.pos, va: f.va, V: game.mode === "fly" ? f.V : Math.max(f.V, 0.1), phi: f.phi, heading: f.heading, gamma: f.gamma, span: game.span, stun: f.stun, liftRate: f.lift },
    { aim, look: input.look, zoom: input.zoom, perched: game.mode === "perch", perchYaw: game.perch?.yaw ?? 0, floor: world.floor });
  audio.update(dt, { V: game.mode === "fly" ? f.V : 0, phi: f.phi, fold: f.fold, lift: f.lift, downstroke: bird.downstroke, flapLevel: f.flapLevel }, camera);
  marks.visible = S.marks;
  if (S.marks) air.thermals.forEach((th, i) => { const m = thMarks[i], C = air.thermalCentre(th, th.ground + 150); m.visible = th.w > 0.3; m.position.set(C.x, th.ground + 150, C.z); m.scale.set(C.R, 300, C.R); });
  updateLiftMap(dt);
}
/** advance the simulation by `sec` seconds at 60 Hz without drawing (deterministic frame strips) */
lab.advance = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) step(1 / 60); world.update(camera); };
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (!lab.paused) step(dt);
  world.update(camera);
  lighting.update(camera.position.y, world.ground(camera.position.x, camera.position.z), game.pos, clamp(game.agl * 1.6 + 90, 90, 380), dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  sampleGpu();
  if (++frames % 6 === 1) {
    hud();
    const m = (a) => med(a).toFixed(3);
    S.stats = `flight+game ${m(cpuAcc.game)} · pigeons ${m(cpuAcc.pigeons)} (${pigeons.stats.flying} flying) · hints ${m(cpuAcc.hints)} · GPU ${gpu.avg.toFixed(2)} · ${fps.toFixed(0)} fps`;
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
$("loading").remove();
Object.assign(lab, { renderer, scene, camera, world, fam, air, pigeons, hints, bird, input, fcam, audio, game, S, START, SCEN, runScenario, bench, gpu, cpuAcc, bestRidge, lighting, step, med });
window.lab = lab;
if (qp.get("scenario") && SCEN[qp.get("scenario")]) runScenario(qp.get("scenario")); else START[S.start]();
log("ready");
