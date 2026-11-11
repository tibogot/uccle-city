// THE PEDESTRIAN LAB (docs/PEDESTRIANS.md): the crowd on a test ground before it goes into the city.
//   - Mr.doob's people (vendor/slop-ped, MIT): code-built bodies, procedural clothes, rigid-pair GPU skinning;
//   - two animation modes: "banded" (ours: live rig < 18 m, bone table 18-250 m on the GPU, LOD0 / LOD1 / LOD2 with
//     dithered cross-fades, nothing beyond 250 m) and "his" (P0 baseline: every drawn person runs his live rig, his
//     PersonCrowd with near / far at 34 m, as in slop-newyork);
//   - the scenes of the lab spec on one test ground (labs/pedestrian-ground.js): sidewalk, signalled crossing, zebra,
//     square, tram stop, park path; test cars, a local signal clock, a scripted tram;
//   - meters (viewer/pedestrians/meters.js): foot slide, ground gap, pops while the camera moves, spawns in view;
//   - cost: CPU (sim, crowd) and GPU (render + compute timestamps) per frame, A/B rounds with the crowd on / off.
// URL: ?scene=sidewalk|crossing|zebra|square|tram|park|overview  ?count=  ?mode=banded|his|off  ?hour=  ?gpu=0
//      ?post=0 (no AO / SSR / bloom)  ?seed=
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { PersonCrowd, PersonRig } from "../vendor/slop-ped/pedestrians.js";
import { BoneTable } from "../viewer/pedestrians/boneTable.js";
import { Crowd, BANDS } from "../viewer/pedestrians/crowd.js";
import { PedSim } from "../viewer/pedestrians/sim.js";
import { Meters } from "../viewer/pedestrians/meters.js";
import { ground, buildGround, buildGraph, Traffic, SignalPosts, Tram, SIGNAL } from "./pedestrian-ground.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the world
const G = buildGround(scene);
const { graph, platformLine, tramDoors } = buildGraph(G.doors);
const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
const inView = (x, y, z) => { sph.center.set(x, y, z); sph.radius = 1.0; return frustum.intersectsSphere(sph) && camera.position.distanceTo(sph.center) < BANDS.end; };
const world = { graph, ground, signal: SIGNAL, inView, carsNear: (e) => traffic.near(e), tram: null };
const sim = new PedSim(world, { max: 640, seed: +(qp.get("seed") ?? 7) });
const traffic = new Traffic(scene, sim);
const posts = new SignalPosts(scene);
const tram = new Tram(scene, tramDoors); world.tram = tram;

const table = await BoneTable.load();
const crowd = await Crowd.create(renderer, table);
crowd.ground = ground;
for (const m of crowd.meshes) scene.add(m);
const meters = new Meters(crowd, ground);
// P0 baseline: his crowd as is (all live rigs, near / far LOD at 34 m)
const his = new PersonCrowd(640);
for (const m of his.meshes) scene.add(m);
const hisGround = (owner, x, z) => ground(x, z);
const hisRigs = new Map();

// ------------------------------------------------------------------------------------------------ state + UI
const HOURS = (h) => {      // people out by hour (weekday), share of the morning peak
  const k = [0.05, 0.03, 0.02, 0.02, 0.03, 0.08, 0.25, 0.7, 1.0, 0.85, 0.7, 0.75, 0.85, 0.8, 0.7, 0.75, 0.9, 1.0, 0.9, 0.7, 0.45, 0.3, 0.18, 0.1];
  const i = Math.floor(h) % 24, f = h - Math.floor(h); return k[i] + (k[(i + 1) % 24] - k[i]) * f;
};
const S = {
  scene: qp.get("scene") || "sidewalk", mode: qp.get("mode") || "banded", count: +(qp.get("count") ?? 150), density: 1, hour: +(qp.get("hour") ?? 8.5),
  season: "autumn", timeScale: 1, paused: false, post: qp.get("post") !== "0", meters: false, spawning: true, showGraph: false,
  lod01: BANDS.lod01, lod12: BANDS.lod12, live: BANDS.live, end: BANDS.end, shadow: BANDS.shadow,
  stats: "", bandsTxt: "", cost: "", metersTxt: "", bench: "—",
};
const VIEWS = {
  sidewalk: { pos: [-60, 1.7, -0.5], target: [-90, 1.2, -4] },
  crossing: { pos: [-18, 6, 16], target: [0, 0.5, 0] },
  zebra: { pos: [48, 4, 10], target: [60, 0.5, -1] },
  square: { pos: [8, 12, 4], target: [35, 0.5, -35] },
  tram: { pos: [-25, 5, 40], target: [-37, 0.5, 55] },
  park: { pos: [30, 10, 30], target: [55, 0.5, 65] },
  overview: { pos: [-60, 95, 130], target: [10, 0, -5] },
  street: { pos: [-150, 2.2, 0], target: [0, 1, 0] },
};
function setView(name) {
  const v = VIEWS[name]; if (!v) return;
  S.scene = name; camera.position.set(...v.pos); controls.target.set(...v.target); controls.update();
}
const ui = new Panel({ title: "Pedestrian Lab" });
const fs = ui.addFolder("Scene");
fs.add(S, "scene", Object.keys(VIEWS)).name("view").onChange(setView);
fs.add(S, "hour", 0, 23.9, 0.05).name("hour (city clock)").onChange((v) => { lighting.hourOverride = v; });
fs.add(S, "season", ["winter", "spring", "summer", "autumn"]).name("season (palette: P4)");
fs.add(S, "timeScale", 0, 4, 0.05).name("speed of time");
fs.add(S, "paused").name("pause");
fs.add(S, "post").name("post effects");
const fc = ui.addFolder("Crowd");
fc.add(S, "mode", ["banded", "his", "off"]).name("animation").onChange(applyMode);
fc.add(S, "count", 0, 600, 1).name("people (at peak)");
fc.add(S, "density", 0, 3, 0.05).name("density");
fc.add(S, "spawning").name("respawn at doors / ends");
fc.add(S, "stats").name("drawn").listen();
fc.add(S, "bandsTxt").name("bands").listen();
fc.add(S, "cost").name("cost").listen();
const fl = ui.addFolder("LOD bands (m)");
fl.add(S, "live", 0, 40, 0.5).name("live rig until").onChange((v) => { BANDS.live = v; BANDS.liveOut = v + 2; BANDS.liveWarm = v + 5; });
fl.add(S, "lod01", 10, 80, 1).name("LOD0 -> LOD1").onChange((v) => { BANDS.lod01 = v; });
fl.add(S, "lod12", 20, 150, 1).name("LOD1 -> LOD2").onChange((v) => { BANDS.lod12 = v; });
fl.add(S, "shadow", 10, 120, 1).name("shadows fade at").onChange((v) => { BANDS.shadow = v; });
fl.add(S, "end", 50, 400, 5).name("nothing beyond").onChange((v) => { BANDS.end = v; BANDS.endw = v * 0.1; });
const fm = ui.addFolder("Meters + checks");
fm.add(S, "meters").name("meters on").onChange((v) => { meters.on = v; if (v) meters.reset(); });
fm.add({ go: () => meters.reset() }, "go").name("reset meters");
fm.add(S, "metersTxt").name("meters").listen();
fm.add({ go: () => runCheck("dolly-walk") }, "go").name("check: dolly at walking speed");
fm.add({ go: () => runCheck("dolly-drive") }, "go").name("check: dolly at driving speed");
fm.add({ go: () => runCheck("orbit") }, "go").name("check: orbit the junction");
fm.add({ go: () => runCheck("bands") }, "go").name("check: dolly through the bands");
fm.add({ go: () => runCheck("spawn60") }, "go").name("check: spawns in view (60 s orbit)");
fm.add({ go: () => bench() }, "go").name("cost: A/B 50 / 150 / 300");
fm.add(S, "bench").name("result").listen();
setView(S.scene);
lighting.hourOverride = S.hour;

function applyMode() {
  for (const m of crowd.meshes) m.visible = S.mode === "banded";
  for (const m of his.meshes) m.visible = S.mode === "his";
  crowd.mode = "banded";
  if (S.mode !== "banded") for (const p of sim.people) if (p.anim?.live) crowd._free(p);
  if (S.mode !== "his") hisRigs.clear();
}
applyMode();

// ------------------------------------------------------------------------------------------------ population
const population = () => Math.round(S.count * S.density * HOURS(S.hour));
sim.fill(population());

// ------------------------------------------------------------------------------------------------ frame
const cpu = { sim: [], crowd: [], rig: [] };
const gpu = { render: 0, compute: 0, samples: [], pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([r, c]) => {
    r = typeof r === "number" ? r : 0; c = typeof c === "number" ? c : 0;
    if (r > 0) { gpu.render = gpu.render ? gpu.render * 0.9 + r * 0.1 : r; gpu.compute = gpu.compute * 0.9 + c * 0.1; gpu.samples.push(r + c); if (gpu.samples.length > 900) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const push = (a, v) => { a.push(v); if (a.length > 600) a.shift(); };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

let clock = 0, last = performance.now(), frame = 0, camPath = null, fixedDt = 0;
const prevCam = new THREE.Vector3();
function hisUpdate(dt) {
  his.begin();
  const cx = camera.position.x, cz = camera.position.z;
  for (const p of sim.people) {
    if (!p.alive) { hisRigs.delete(p.id); continue; }
    const d = Math.hypot(p.x - cx, p.y - camera.position.y, p.z - cz);
    sph.center.set(p.x, p.y + 0.9, p.z); sph.radius = 1.1;
    const draw = frustum.intersectsSphere(sph) && d < BANDS.end;
    let r = hisRigs.get(p.id);
    if (!draw && d > 50) { if (r) r.placed = false; continue; }          // his rule: hidden people within 50 m still step
    if (!r) { r = new PersonRig({ seed: p.seed, female: !!p.sex, scale: p.scale, girth: p.girth, hair: p.hair, armSwing: p.armSwing, stride: p.strideK }); hisRigs.set(p.id, r); }
    r.update(dt, p.x, p.z, p.yaw, hisGround, null, 0, draw);
    if (draw) his.add(r, d);
  }
  his.end();
}
function step(dt) {
  clock += dt;
  if (S.spawning) sim.target = population();
  const t0 = performance.now();
  sim.step(dt);
  traffic.step(dt, clock);
  posts.update(clock);
  tram.step(clock, () => { const n = Math.floor(sim.r() * 5); for (let i = 0; i < n; i++) sim.alight(tramDoors[Math.floor(sim.r() * tramDoors.length)], platformLine[1 + Math.floor(sim.r() * 4)]); });
  const t1 = performance.now();
  push(cpu.sim, t1 - t0);
}
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (fixedDt) dt = fixedDt;
  frame++;
  if (camPath) camPath(dt);
  else controls.update();
  camera.updateMatrixWorld();
  frustum.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const sdt = S.paused ? 0 : dt * S.timeScale;
  if (sdt > 0) step(sdt);
  const tc = performance.now();
  if (S.mode === "banded") {
    const st = crowd.update(sim.people, camera, Math.max(sdt, 1e-4));
    push(cpu.crowd, performance.now() - tc); push(cpu.rig, st.rigMs);
    const moving = camera.position.distanceTo(prevCam) > 1e-3;
    if (meters.on) meters.sample(sim.people, Math.max(sdt, 1e-4), moving);
  } else if (S.mode === "his") {
    hisUpdate(Math.max(sdt, 1e-4));
    push(cpu.crowd, performance.now() - tc);
  }
  prevCam.copy(camera.position);
  lighting.update(camera.position.y, 0, controls.target, 140);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (frame % 15 === 1) readouts();
});

function readouts() {
  const st = crowd.stats, alive = sim.people.filter((p) => p.alive).length;
  const r = renderer.info.render;
  const vis = sim.people.filter((p) => p.alive && p.inView && p.dist <= BANDS.end).length;
  S.stats = `${alive} alive · ${vis} in view · ${st.drawn} drawn`;
  S.bandsTxt = S.mode === "banded" ? `LOD0 ${st.perBand[0]} · LOD1 ${st.perBand[1]} · LOD2 ${st.perBand[2]} · live ${st.live} (${st.blending} blending)` : S.mode;
  S.cost = `CPU sim ${mean(cpu.sim).toFixed(3)} + crowd ${mean(cpu.crowd).toFixed(3)} ms · GPU ${gpu.render.toFixed(2)} + ${gpu.compute.toFixed(3)} ms`;
  if (meters.on) {
    const m = meters.summary();
    S.metersTxt = `slide p95 live ${m.slide.live.p95} mid ${m.slide.mid.p95} far ${m.slide.far.p95} m/s · pops ${m.pops.coverage}/${m.pops.shadow}/${m.pops.pose}`;
  }
  const c = sim.counters;
  $info.textContent = `${backend} · ${(1000 / Math.max(1, med(frameTimes))).toFixed(0)} fps · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris · clock ${clock.toFixed(0)} s · signal A ${SIGNAL.car("A", clock)} / B ${SIGNAL.car("B", clock)}\n` +
    `${S.stats} · ${S.bandsTxt}\n${S.cost}\n` +
    `spawns: hidden ${c.spawnHidden} · faded ${c.spawnFaded} · unfaded in view ${c.spawnInViewUnfaded} | removed: hidden ${c.removedHidden} · faded ${c.removedFaded} | red crossings ${c.redCrossings} (runners ${c.redRunners}) · tram boarded ${c.boarded} alighted ${c.alighted}\n` +
    (meters.on ? `meters: ${S.metersTxt}` : "meters off") +
    `\nLOD0 ${crowd.tris[0]} · LOD1 ${crowd.tris[1]} · LOD2 ${crowd.tris[2]} triangles per person · GPU shared with other work on this machine: A/B rounds, not absolutes.`;
}
const frameTimes = []; { let lt = performance.now(); const tick = () => { const n = performance.now(); push(frameTimes, n - lt); lt = n; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }


// ------------------------------------------------------------------------------------------------ checks
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};
/** Camera paths for the moving checks: t in seconds -> camera position / target. */
const PATHS = {
  "dolly-walk": { secs: 30, f: (t) => ({ pos: [-140 + 1.4 * t, 1.7, -5.6], target: [-140 + 1.4 * t + 20, 1.4, -5.6] }) },
  "dolly-drive": { secs: 20, f: (t) => ({ pos: [-145 + 13.9 * t, 1.3, 1.75], target: [-145 + 13.9 * t + 30, 1.0, 1.75] }) },
  orbit: { secs: 40, f: (t) => { const a = t * 0.16; return { pos: [Math.cos(a) * 40, 30, Math.sin(a) * 40], target: [0, 0.5, 0] }; } },
  bands: { secs: 32, f: (t) => { const d = 6 + t * 8; return { pos: [-120 + d, 1.7 + d * 0.03, 0.5], target: [-120, 1.0, -4.5] }; } },     // backwards down street A: every person crosses every band
  spawn60: { secs: 60, f: (t) => { const a = t * 0.1; return { pos: [Math.cos(a) * 110, 60, Math.sin(a) * 110], target: [0, 0, 0] }; } },
};
async function runCheck(name, { fixed = 0 } = {}) {
  const P = PATHS[name];
  meters.on = true; S.meters = true; meters.reset();
  const c0 = { ...sim.counters };
  let t = 0;
  fixedDt = fixed;
  await new Promise((done) => {
    camPath = (dt) => {
      t += dt;
      const v = P.f(Math.min(t, P.secs));
      camera.position.set(...v.pos); camera.lookAt(...v.target); controls.target.set(...v.target);
      if (t >= P.secs) { camPath = null; done(); }
    };
  });
  fixedDt = 0;
  const m = meters.summary();
  const c = sim.counters;
  results[name] = { ...m, spawns: { hidden: c.spawnHidden - c0.spawnHidden, faded: c.spawnFaded - c0.spawnFaded, unfadedInView: c.spawnInViewUnfaded - c0.spawnInViewUnfaded },
    removed: { hidden: c.removedHidden - c0.removedHidden, faded: c.removedFaded - c0.removedFaded }, events: meters.pops.events.slice(0, 20) };
  console.log(`[ped lab] ${name}`, JSON.stringify(results[name]));
  return results[name];
}

/** GPU / CPU A/B: for each count, rounds of crowd off / banded / his in the current view (spawning off, a fixed
 *  population); median GPU ms (render + compute) and median CPU ms (crowd update; the sim reported apart). */
async function bench({ counts = [50, 150, 300], modes = ["banded", "his"], rounds = 3, settle = 700, measure = 2200, street = true } = {}) {
  // street: everyone on street A's west sidewalks (the "street" view looks down it: all of them in view, every band)
  const keepW = sim._walkable, keepL = sim._walkLen;
  if (street) { sim._walkable = graph.edges.filter((e) => e.kind === "walk" && Math.abs(e.a.z) < 8 && Math.abs(e.b.z) < 8 && e.a.x < -8 && e.b.x < -8); sim._walkLen = 0; setView("street"); }
  const keep = { mode: S.mode, count: S.count, spawning: S.spawning, density: S.density, hour: S.hour };
  S.spawning = false;
  const res = {};
  for (const n of counts) {
    // exactly n people, all in place
    for (const p of sim.people) { p.alive = false; if (p.anim?.live) crowd._free(p); }
    sim.target = n; sim.fill(n);
    res[n] = {};
    for (let r = 0; r < rounds; r++) for (const mode of ["off", ...modes]) {
      S.mode = mode; applyMode();
      await sleep(settle);
      gpu.samples.length = 0; cpu.crowd.length = 0; cpu.sim.length = 0; cpu.rig.length = 0;
      await sleep(measure);
      const row = (res[n][mode] ||= { gpu: [], cpu: [], sim: [], rig: [], inView: 0, bands: null });
      // CPU: means (performance.now() is coarsened to 0.1 ms here: a median of such samples is meaningless)
      row.gpu.push(med(gpu.samples)); row.cpu.push(mode === "off" ? 0 : mean(cpu.crowd)); row.sim.push(mean(cpu.sim)); row.rig.push(mean(cpu.rig)); row.gpuCompute = gpu.compute;
      row.inView = sim.people.filter((p) => p.alive && p.inView).length;
      if (mode === "banded") row.bands = [...crowd.stats.perBand, crowd.stats.live];
    }
  }
  Object.assign(S, keep); applyMode();
  sim._walkable = keepW; sim._walkLen = keepL;
  const out = {};
  for (const [n, byMode] of Object.entries(res)) {
    const off = Math.min(...byMode.off.gpu);
    out[n] = Object.fromEntries(Object.entries(byMode).map(([m, v]) => [m, { gpuMs: +med(v.gpu).toFixed(3), gpuMin: +Math.min(...v.gpu).toFixed(3), dGpu: +(med(v.gpu) - med(byMode.off.gpu)).toFixed(3), dGpuMin: +(Math.min(...v.gpu) - off).toFixed(3),
      cpuMs: +med(v.cpu).toFixed(3), rigMs: +med(v.rig).toFixed(3), simMs: +med(v.sim).toFixed(3), compute: +(v.gpuCompute ?? 0).toFixed(3), runs: v.gpu.map((x) => +x.toFixed(2)), inView: v.inView, bands: v.bands }]));
  }
  results.bench = out;
  S.bench = Object.entries(out).map(([n, o]) => `${n}: banded +${o.banded?.dGpu} GPU / ${o.banded?.cpuMs} CPU · his +${o.his?.dGpu} / ${o.his?.cpuMs}`).join(" | ");
  console.log("[ped lab] bench", JSON.stringify(out));
  return out;
}

window.lab = { renderer, scene, camera, controls, lighting, S, sim, crowd, his, meters, table, traffic, tram, graph, results, bench, runCheck, setView, PATHS, gpu, cpu, applyMode,
  setFixed: (dt) => { fixedDt = dt; }, setCamPath: (f) => { camPath = f; }, ground, BANDS, med };

// ------------------------------------------------------------------------------------------------ frame strips
// Deterministic stepping for review strips (the owner wants moving evidence): lab.strip.ui(false) hides the overlays,
// lab.strip.cam = (t) => ({ pos, target, fov? }) drives the camera from the strip clock, await lab.strip.step(frames)
// advances the world by frames x 1/60 s and holds still for a screenshot. lab.strip.follow(person, d(t)) = a dolly-
// zoom on one person (the field of view keeps them ~2.2 m tall on screen) to show every band switch up close.
const strip = {
  t: 0, cam: null,
  ui(on) { for (const s of [".upanel", "#title", "#info"]) document.querySelector(s).style.display = on ? "" : "none"; },
  async step(frames) {
    fixedDt = 1 / 60; S.paused = false;
    for (let i = 0; i < frames; i++) {
      strip.t += 1 / 60;
      if (strip.cam) { const v = strip.cam(strip.t); camera.position.set(...v.pos); camera.lookAt(...v.target); controls.target.set(...v.target); if (v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); } }
      await new Promise((r) => requestAnimationFrame(r));
    }
    S.paused = true; fixedDt = 0;
    await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => requestAnimationFrame(r));
    return strip.t;
  },
  follow(p, dist) {
    strip.cam = (t) => {
      // in front of the walker along the sidewalk (a clear line of sight), a little toward the road
      const d = dist(t), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      let sx = fz, sz = -fx; if (Math.abs(p.z + sz) > Math.abs(p.z - sz)) { sx = -sx; sz = -sz; }
      const pos = [p.x + fx * d * 0.985 + sx * d * 0.17, p.y + 1.25 + d * 0.012, p.z + fz * d * 0.985 + sz * d * 0.17];
      return { pos, target: [p.x, p.y + 0.95, p.z], fov: (2 * Math.atan(1.25 / d) * 180) / Math.PI };
    };
  },
  reset() { strip.t = 0; strip.cam = null; camera.fov = 50; camera.updateProjectionMatrix(); S.paused = false; fixedDt = 0; },
};
window.lab.strip = strip;
