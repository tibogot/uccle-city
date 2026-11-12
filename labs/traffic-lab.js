// THE TRAFFIC LAB: tile I6 round Place de Saint-Job as the city builds it (the tile worker: road engine fitted to
// the measured UrbIS street surfaces, façades, the real OSM signals and parked cars), and the moving traffic on its
// lane graph (viewer/traffic/: graph, sim, fleet, debug). The 5-arm junction with lights (Chaussée de Saint-Job /
// Rue Jean Benaets / Avenue Carsoel, OSM node 140341502) and the pedestrian light 30 m east of it are the test bed.
// Panel (viewer/panelUI.js): density, speed, hour (density curve), signal clock speed, parking rate, debug layers,
// camera presets (junction, the light at street level, overview, follow a car), the perf read-outs (cars, sim /
// draw CPU ms, GPU ms, draw calls, pops). A road block at the orbit target (an obstacle, as the player's car is).
// Scripted checks: window.__lab (pause(), advance(sec), follow(i), shot helpers).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS, env } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { Heightmap } from "../viewer/heightmap.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial } from "../viewer/roadPaint.js";
import { cobbleMaterial, pitMaterial } from "../viewer/cobbles.js";
import { buildingMeshes as facadeMeshes } from "../viewer/facades.js";
import { streetFit } from "../viewer/streetFit.js";
import { buildCars } from "../viewer/cars.js";
import { carFleet } from "../viewer/carFleet.js";
import { buildFurniture, updateSignals } from "../viewer/furniture.js";
import { createTraffic } from "../viewer/traffic/traffic.js";
import { TrafficDebug } from "../viewer/traffic/trafficDebug.js";
import { signalClock, signalState, untilGreen } from "../viewer/traffic/signals.js";
import { hourFactor } from "../viewer/traffic/trafficSim.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const CARVE = 0.12;
const TILE = qp.get("tile") || "I6";
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the tile
const DATA = new URL("../data/tiles/", import.meta.url);
const manifest = await (await fetch(new URL("manifest.json", DATA))).json();
const entry = manifest.tiles.find((t) => t.name === TILE);
const worker = new Worker(new URL("../viewer/tileWorker.bundle.js", import.meta.url), { type: "module" });
$info.textContent = `building tile ${TILE} in the tile worker…`;
const d = await new Promise((resolve, reject) => {
  worker.onmessage = (e) => (e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.r));
  worker.postMessage({ id: 1, entry: { ...entry, hide: [], surface: true, pits: true }, base: DATA.href, lite: false });
});
worker.terminate();
const bounds = d.bounds, hm = Heightmap.from(d.hdr, d.y, d.orig);
const ground = (x, z) => hm.surface(x, z) + CARVE;
// terrain
{
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(d.terrain.pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(d.terrain.nrm, 3));
  g.setIndex(new THREE.BufferAttribute(d.terrain.idx, 1));
  const m = new THREE.Mesh(g, new THREE.MeshStandardNodeMaterial({ color: 0x5f6b48, roughness: 0.95 }));
  m.receiveShadow = true; scene.add(m);
}
// roads: the city's own materials (markings atlas, framed paving, setts)
{
  const mats = { asphalt: asphaltMaterial(d.road.atlas), grass: vergeMaterial(), square: cobbleMaterial(), pits: pitMaterial(), concrete: concreteMaterial({ framed: true }) };
  for (const [name, part] of Object.entries(d.road.parts)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [k, a] of Object.entries(part.attributes)) g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize));
    if (part.aSurf) g.setAttribute("aSurf", new THREE.BufferAttribute(part.aSurf, 1));
    g.setIndex(new THREE.BufferAttribute(part.index, 1));
    const m = new THREE.Mesh(g, mats[name] || mats.concrete);
    m.receiveShadow = true; scene.add(m);
  }
}
const B = facadeMeshes(null, null, null, null, d.buildings);
for (const m of B.meshes) scene.add(m);
// parked cars against the measured kerbs (the city's code), the signal posts (OSM) with the shared cycle
const fit = streetFit(d.road.surfaceData);
const roads = d.roads, feats = d.feats;
const carRoads = { ...roads, roads: roads.roads.map((r) => (r.meta?.widthFit ? { ...r, lanes: r.meta.unfitLanes ?? undefined } : r)) };
const cars = buildCars(carRoads, feats, ground, bounds, { place: fit.placeCar });
scene.add(cars.group);
scene.add(carFleet.group);
carFleet.setRenderer(renderer, scene);
const furn = buildFurniture(feats, roads, (x, z) => hm.ground(x, z), bounds);
scene.add(furn.group);

// ------------------------------------------------------------------------------------------------ the traffic
const traffic = createTraffic({ scene, renderer, camera, ground, night: env.uNight, seed: +(qp.get("seed") || 7) });
traffic.addTile(TILE, d.traffic);
const sim = traffic.sim;
const debug = new TrafficDebug(scene, ground, sim.cap);
traffic.debug = debug;
// parking: the parked fleet's cars of this tile
sim.setParking(() => carFleet.regs.flatMap((r) => r.cars), (name) => traffic.types.findIndex((t) => t.name === name));
sim.onPark = () => carFleet.touch();
// a road block (obstacle) at the orbit target
const block = { on: false, x: 0, z: 0 };
const blockMesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12).translate(0, 0.45, 0), new THREE.MeshStandardNodeMaterial({ color: 0xff5a1a, roughness: 0.6 }));
blockMesh.visible = false; scene.add(blockMesh);
traffic.setObstacleSource((s) => { if (block.on) s.addObstacle(block.x, block.z, 1.0, 0, 0); });

// ------------------------------------------------------------------------------------------------ views
const J = d.traffic.jnodes.find((j) => j.id === "n140341502") || d.traffic.jnodes.find((j) => j.signal) || { x: (bounds.x0 + bounds.x1) / 2, z: (bounds.z0 + bounds.z1) / 2 };
const VIEWS = {
  junction: () => { const y = ground(J.x, J.z); camera.position.set(J.x + 38, y + 34, J.z + 52); controls.target.set(J.x, y, J.z); },
  light: () => { const y = ground(J.x, J.z); camera.position.set(J.x + 22, y + 4.5, J.z - 30); controls.target.set(J.x - 2, y + 1, J.z + 2); },
  overview: () => { const y = ground(J.x, J.z); camera.position.set(J.x + 120, y + 260, J.z + 260); controls.target.set(J.x + 60, y, J.z + 30); },
  church: () => { const y = ground(1216, 561); camera.position.set(1150, y + 40, 640); controls.target.set(1200, y, 560); },
};
let follow = -1;
const S = {
  view: "junction", density: 1, speed: 1, hour: 8, clockSpeed: 1, park: 1, signals: true, lanes: true, holds: true, targets: true,
  cars: true, parked: true, time: preset, follow: false, block: false, stats: "", signal: "",
};
const ui = new Panel({ title: "Traffic Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(VIEWS)).name("camera").onChange((v) => { follow = -1; S.follow = false; VIEWS[v](); controls.update(); });
fv.add(S, "follow").name("follow a car").onChange((v) => { follow = v ? pickFollow() : -1; }).listen();
fv.add(S, "time", Object.keys(PRESETS)).name("light").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); });
fv.add(S, "parked").name("parked cars").onChange((v) => { carFleet.group.visible = v; });
fv.add(S, "cars").name("moving cars").onChange((v) => { traffic.fleet.group.visible = v; });
const ft = ui.addFolder("Traffic");
ft.add(S, "density", 0, 3, 0.05).name("density x").onChange((v) => { sim.params.density = v; });
ft.add(S, "hour", 0, 23.9, 0.1).name("hour (density curve)").onChange((v) => { sim.params.hour = v; });
ft.add(S, "speed", 0.3, 2, 0.05).name("speed x (limits)").onChange((v) => { sim.params.speed = v; });
ft.add(S, "park", 0, 4, 0.1).name("parking rate").onChange((v) => { sim.params.parkRate = v; });
ft.add(S, "clockSpeed", 0, 4, 0.1).name("signal clock x").onChange((v) => { signalClock.setSpeed(v); });
ft.add(S, "signals").name("obey signals").onChange((v) => { sim.params.signals = v; });
ft.add(S, "block").name("road block at target").onChange((v) => { block.on = v; block.x = controls.target.x; block.z = controls.target.z; blockMesh.visible = v; blockMesh.position.set(block.x, ground(block.x, block.z), block.z); });
ft.add({ clear: () => { for (let i = 0; i < sim.cap; i++) sim.kill(i); } }, "clear").name("remove all cars");
const fd = ui.addFolder("Debug");
fd.add(S, "lanes").name("lane graph").onChange((v) => { debug.show.lanes = v; });
fd.add(S, "holds").name("hold points / signals").onChange((v) => { debug.show.holds = v; });
fd.add(S, "targets").name("car targets").onChange((v) => { debug.show.targets = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("").listen().disable();
fp.add(S, "signal").name("junction").listen().disable();
fp.add({ bench: () => bench() }, "bench").name("GPU A/B: traffic on / off");
sim.params.hour = S.hour;
VIEWS.junction();

await lighting.attach(camera);
const pipe = qp.get("fx") === "0" ? null : createPipeline(renderer, scene, camera);
if (pipe) { pipe.setExposureScale(lighting.exposureScale); pipe.look(preset); }
else { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = lighting.exposureScale; }
const hazeHook = (rt, dd, size) => lighting.hazeHook(rt, dd, size);

function pickFollow() {
  let best = -1, bd = Infinity;
  for (let i = 0; i < sim.cap; i++) if (sim.alive[i]) { const dd = (sim.x[i] - controls.target.x) ** 2 + (sim.z[i] - controls.target.z) ** 2; if (dd < bd) { bd = dd; best = i; } }
  return best;
}

// ------------------------------------------------------------------------------------------------ GPU timing
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 900) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
/** GPU A/B: rounds x (traffic drawn / hidden), 3 s each; the sim keeps running. -> [{ on, off }] medians */
async function bench(rounds = 4, ms = 3000) {
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const row = {};
    for (const on of [true, false]) {
      traffic.fleet.group.visible = on;
      await wait(600); gpu.samples.length = 0; await wait(ms);
      row[on ? "on" : "off"] = +median(gpu.samples).toFixed(3);
      row[on ? "drawsOn" : "drawsOff"] = renderer.info.render.drawCalls ?? renderer.info.render.calls;
    }
    out.push(row);
  }
  traffic.fleet.group.visible = S.cars;
  console.log("[traffic lab] GPU A/B", out);
  return out;
}

// ------------------------------------------------------------------------------------------------ loop
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0, paused = false;
const tmpV = new THREE.Vector3();
function frame(dt) {
  if (follow >= 0) {
    if (!sim.alive[follow]) follow = pickFollow();
    if (follow >= 0) {
      tmpV.set(sim.x[follow], sim.y[follow] + 1, sim.z[follow]);
      const dx = tmpV.x - controls.target.x, dz = tmpV.z - controls.target.z, dy = tmpV.y - controls.target.y;
      controls.target.add(new THREE.Vector3(dx, dy, dz)); camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
    }
  }
  controls.update();
  updateSignals();
  traffic.update(dt, camera, controls.target);
  carFleet.update(camera.position, camera);
  lighting.update(camera.position.y, ground(controls.target.x, controls.target.z), controls.target, 120, dt);
  if (pipe) pipe.render(hazeHook); else renderer.render(scene, camera);
  if (pipe) pipe.setExposureFactor(lighting.adapt(dt));
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render, st = traffic.sim.stats, fs = traffic.fleet.stats, c = traffic.cpu;
    const h = st.holds;
    let held = 0; for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && sim.hold[i]) held++;
    S.stats = `${st.cars}/${st.target} cars · sim ${c.sim.toFixed(2)} draw ${c.draw.toFixed(2)} ms`;
    const t = signalClock.now();
    S.signal = `A ${["green", "amber", "red"][signalState(0, t)]} · B ${["green", "amber", "red"][signalState(1, t)]} (${untilGreen(0, t).toFixed(0)} s to A green)`;
    $info.textContent = `${backend}  ${fps.toFixed(0)} fps  GPU ${gpu.avg.toFixed(2)} ms  draw calls ${r.drawCalls ?? r.calls}  triangles ${(r.triangles / 1000).toFixed(0)}k\n` +
      `traffic: ${st.cars} cars (target ${st.target} for ${st.laneKm} km of lane, hour factor ${hourFactor(sim.params.hour).toFixed(2)}), ${held} waiting · ` +
      `CPU sim ${c.sim.toFixed(3)} ms + draw ${c.draw.toFixed(3)} ms per frame (step ${st.stepMs.toFixed(3)} ms, worst frame ${c.max.toFixed(2)})\n` +
      `fleet: ${fs.drawn} drawn (LOD ${fs.perLod.join("/")}), ${fs.fading} fading, ${fs.culled} culled, ${fs.draws} draws, ${(fs.tris / 1000).toFixed(0)}k tris, LOD pops ${fs.pops}, appeared in view ${fs.appeared ?? 0}, vanished in view ${fs.vanished ?? 0} · ` +
      `spawned ${st.spawned}, removed ${st.removed}, pull-outs ${st.pullOuts}, park-ins ${st.parkIns}\n` +
      `signals: ${S.signal} · graph ${d.traffic.stats.paths} paths, ${d.traffic.stats.junctions} junctions (${d.traffic.stats.signal} signalled approaches), ${d.traffic.stats.conflicts} conflicts`;
  }
}
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (!paused) frame(dt);
});

// scripted checks: pause the clock, advance in exact steps (10 fps sequences), follow / find cars
window.__lab = {
  renderer, scene, camera, controls, traffic, sim, debug, carFleet, signalClock, VIEWS, S, gpu, bench, d, J, ground, block,
  pause() { paused = true; this._spd = signalClock.speed; signalClock.setSpeed(0); },
  resume() { signalClock.setSpeed(this._spd ?? 1); paused = false; last = performance.now(); },
  /** advance the world by sec (sim + signal clock), render once */
  advance(sec = 0.1) {
    signalClock.offset += sec;
    frame(sec);
  },
  follow(i) { follow = i; },
  /** The canvas right after a render (same task), with a caption, JPEG-posted to the lab server (?dir, ?name). */
  shot(dir, name, caption = "", scale = 0.5) {
    const src = renderer.domElement, c = this._cv ||= document.createElement("canvas");
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    const x = c.getContext("2d");
    x.drawImage(src, 0, 0, c.width, c.height);
    if (caption) { x.font = "bold 15px ui-monospace, monospace"; const w = x.measureText(caption).width; x.fillStyle = "rgba(0,0,0,.65)"; x.fillRect(6, 6, w + 12, 24); x.fillStyle = "#fff"; x.fillText(caption, 12, 23); }
    return new Promise((res) => c.toBlob((b) => fetch(`/__frame?dir=${dir}&name=${name}`, { method: "POST", body: b }).then(() => res(b.size)), "image/jpeg", 0.85));
  },
  /** n frames dt apart (paused world): caption(k) -> text; each frame advanced then shot */
  async seq(dir, n, dt = 0.1, caption = () => "", pre = null) {
    this.pause();
    for (let k = 0; k < n; k++) { pre?.(k); this.advance(dt); await this.shot(dir, `f${String(k).padStart(3, "0")}.jpg`, caption(k)); }
  },
  /** chase camera on car i: back m behind, up m above, looking ahead m in front */
  chase(i, back = 14, up = 6, ahead = 12) {
    const fx = Math.sin(sim.yaw[i]), fz = Math.cos(sim.yaw[i]), x = sim.x[i], z = sim.z[i], y = sim.y[i];
    this.look(x - fx * back, y + up, z - fz * back, x + fx * ahead, y + 0.5, z + fz * ahead);
  },
  /** Clear the area round (x, z) of moving cars. */
  clearAround(x, z, r) { for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && Math.hypot(sim.x[i] - x, sim.z[i] - z) < r) sim.kill(i); sim.buildLists(); },
  /** Set the signal clock so phase `ph` is `s` seconds into its cycle (0 = the start of green). */
  setPhaseTime(ph, s) { const t = signalClock.now(), cur = (((t + (ph ? 27 : 0)) % 54) + 54) % 54; signalClock.offset += s - cur; },
  lightName(ph) { return ["green", "amber", "red"][signalState(ph, signalClock.now())]; },
  /** THE RED-LIGHT CHECK: two cars on signalled lane `lane` (gid), 20 m apart; the light turns amber after `amberIn` s;
   *  10 fps frames of the stop (dir/red_stop), then the light jumps to 1.5 s before green: the start (dir/green_go). */
  async redLight(lane = 90, amberIn = 2.5, d0 = 62, n1 = 130, n2 = 100) {
    const g = sim.W.slots[lane >>> 16], li = lane & 0xffff, ph = g.phase[li], o = new Float64Array(4);
    this.pause();
    sim.W.point(lane, g.holdAt[li], o);
    this.clearAround(o[0], o[1], 110);
    this.setPhaseTime(ph, 22 - amberIn);
    const car = sim.spawnAt(lane, d0, 8); sim.insertInList(car);
    const car2 = sim.spawnAt(lane, d0 - 22, 8); sim.insertInList(car2);
    let k = 0;
    const cap = () => { const dS = g.holdAt[li] - (sim.d[car] + sim.half[car]); return `t=${(k += 0.1).toFixed(1)}s  light ${this.lightName(ph)}  lead ${(sim.v[car] * 3.6).toFixed(1)} km/h ${sim.path[car] === lane ? dS.toFixed(1) + " m to line" : "through"}  follower ${(sim.v[car2] * 3.6).toFixed(1)} km/h`; };
    await this.seq("red_stop", n1, 0.1, cap, () => this.chase(car2, 13, 5.5, 14));
    const r1 = { v: sim.v[car], toLine: g.holdAt[li] - (sim.d[car] + sim.half[car]), v2: sim.v[car2], gap: sim.d[car] - sim.d[car2] - sim.half[car] - sim.half[car2] };
    this.setPhaseTime(ph, -1.5); k = 0;
    await this.seq("green_go", n2, 0.1, cap, () => this.chase(car2, 13, 5.5, 14));
    return { car, car2, phase: ph, r1, after: { v: sim.v[car], path: sim.path[car], v2: sim.v[car2] } };
  },
  /** THE PULL-OUT CHECK: the parked car nearest (x, z) pulls out (indicator, gap, S-curve); 10 fps frames (dir/pull_out)
   *  from a fixed camera across the street, then the car is followed. */
  async pullOut(x = J.x - 60, z = J.z, n = 120) {
    this.pause();
    let best = null, bd = Infinity;
    for (const r of carFleet.regs) for (const c of r.cars) {
      if (c.hidden) continue;
      const hx = Math.sin(c.heading), hz = Math.cos(c.heading), lane = sim.laneAt(c.x, c.z, hx, hz);
      if (!lane || lane.along < 6 || lane.along + 14 > sim.plen(lane.gid)) continue;
      const dd = (c.x - x) ** 2 + (c.z - z) ** 2; if (dd < bd) { bd = dd; best = c; }
    }
    if (!best) return "no slot";
    this.clearAround(best.x, best.z, 60);
    const before = sim.stats.pullOuts;
    sim.pullOut(best);
    if (sim.stats.pullOuts === before) return "pull-out refused";
    let i = -1; for (let k = 0; k < sim.cap; k++) if (sim.alive[k] && sim.slot[k] === best) i = k;
    const hx = Math.sin(best.heading), hz = Math.cos(best.heading), y = ground(best.x, best.z);
    // across the street (the car's left), a little ahead, looking at the slot
    this.look(best.x + hz * 14 + hx * 6, y + 6, best.z - hx * 14 + hz * 6, best.x + hx * 4, y + 0.6, best.z + hz * 4);
    let k = 0;
    const ST = ["drive", "waiting for a gap (indicator)", "pulling out", "stopping past a slot", "reversing in"];
    await this.seq("pull_out", n, 0.1, () => `t=${(k += 0.1).toFixed(1)}s  ${ST[sim.state[i]] ?? "?"}  ${(sim.v[i] * 3.6).toFixed(1)} km/h  parked copy hidden: ${best.hidden}`);
    return { i, slot: [best.x, best.z], state: sim.state[i], v: sim.v[i], pops: traffic.fleet.stats };
  },
  /** THE PARK-IN CHECK: a free slot (a parked car taken away) and a car 45 m before it: it stops past the slot,
   *  indicates, reverses in and is handed to the parked fleet (dir/park_in). */
  async parkIn(x = J.x + 40, z = J.z - 10, n = 200) {
    this.pause();
    let best = null, bd = Infinity, lane = null;
    for (const r of carFleet.regs) for (const c of r.cars) {
      if (c.hidden) continue;
      const l = sim.laneAt(c.x, c.z, Math.sin(c.heading), Math.cos(c.heading));
      if (!l || l.along < 50 || l.along + 11 > sim.plen(l.gid)) continue;
      const dd = (c.x - x) ** 2 + (c.z - z) ** 2; if (dd < bd) { bd = dd; best = c; lane = l; }
    }
    if (!best) return "no slot";
    this.clearAround(best.x, best.z, 80);
    best.hidden = true; carFleet.touch();                 // the slot is free (its car "left")
    const ti = traffic.types.findIndex((t) => t.len + 0.5 <= (best.room ?? 6));
    const i = sim.spawnAt(lane.gid, lane.along - 45, 6, Math.max(0, ti)); sim.insertInList(i);
    sim.state[i] = 3; sim.slot[i] = best; sim.onD[i] = lane.along + 9; sim.parkPath[i] = lane.gid;
    const hx = Math.sin(best.heading), hz = Math.cos(best.heading), y = ground(best.x, best.z);
    this.look(best.x + hz * 9 + hx * 4, y + 16, best.z - hx * 9 + hz * 4, best.x + hx * 4, y, best.z + hz * 4);
    let k = 0, done = -1;
    const ST = ["drive", "waiting", "pulling out", "stopping past the slot (indicator)", "reversing in"];
    await this.seq("park_in", n, 0.1, () => { if (!sim.alive[i] && done < 0) done = k; return `t=${(k += 0.1).toFixed(1)}s  ${sim.alive[i] ? ST[sim.state[i]] + "  " + (sim.v[i] * 3.6).toFixed(1) + " km/h" : "parked (handed to the parked fleet)"}`; });
    return { parked: !best.hidden, at: done, parkIns: sim.stats.parkIns };
  },
  /** THE GIVE-WAY CHECK: at an unsigned junction (priorité de droite / give way), two cars on crossing moves timed to
   *  arrive together; the one without priority waits, then turns (dir/give_way). pick = which suitable pair. */
  async giveWay(pick = 0, n = 110) {
    this.pause();
    const g = sim.W.slots[0], pairs = [];
    for (let c = 0; c < g.paths; c++) {
      if (!g.kind[c] || !g.core[c]) continue;
      const j = g.nodeOf[c]; if (j < 0 || g.jnodes[j].signal) continue;
      for (let k = g.cfOff[c]; k < g.cfOff[c + 1]; k++) {
        if (g.cfYield[k] !== 1) continue;
        const o = g.cfOther[k], la = g.prevIdx[g.prevOff[c]], lb = g.prevIdx[g.prevOff[o]];
        if (g.len[la] > 32 && g.len[lb] > 32 && g.turn[c] !== 3 && g.turn[o] !== 3) pairs.push([c, o, la, lb, j]);
      }
    }
    if (!pairs.length) return "no pair";
    const [c, o, la, lb, j] = pairs[pick % pairs.length], J2 = g.jnodes[j];
    this.clearAround(J2.x, J2.z, 90);
    const a = sim.spawnAt(la, g.len[la] - 30, 7); sim.insertInList(a); sim.route[a * 4] = c; sim.route[a * 4 + 1] = -1; sim.fillRoute(a);
    const b = sim.spawnAt(lb, g.len[lb] - 30, 7); sim.insertInList(b); sim.route[b * 4] = o; sim.route[b * 4 + 1] = -1; sim.fillRoute(b);
    const y = ground(J2.x, J2.z);
    this.look(J2.x + 6, y + 42, J2.z + 30, J2.x, y, J2.z);
    const H = ["", "signal", "stop sign", "give way", "junction busy", "exit full"], T = ["straight", "left", "right", "u-turn", "ring"];
    let k = 0;
    await this.seq("give_way", n, 0.1, () => `t=${(k += 0.1).toFixed(1)}s  yielding car (${T[g.turn[c]]}): ${(sim.v[a] * 3.6).toFixed(1)} km/h ${H[sim.hold[a]] || ""}  ·  priority car (${T[g.turn[o]]}): ${(sim.v[b] * 3.6).toFixed(1)} km/h`);
    return { pairs: pairs.length, node: J2.id, kind: J2.kind, ctrlA: g.ctrl[la], turnA: g.turn[c], turnB: g.turn[o] };
  },
  look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update(); },
  near(x, z, r = 30) { const o = []; for (let i = 0; i < sim.cap; i++) if (sim.alive[i] && (sim.x[i] - x) ** 2 + (sim.z[i] - z) ** 2 < r * r) o.push({ i, v: +sim.v[i].toFixed(2), hold: sim.hold[i], st: sim.state[i], x: +sim.x[i].toFixed(1), z: +sim.z[i].toFixed(1) }); return o; },
};
