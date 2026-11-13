// THE GRASS LAB: our grass (viewer/grass/) on REAL Uccle tiles, with the city's own terrain + textured ground, measured
// street surfaces, UrbIS buildings, trees, lamps, light and post chain (all imported read-only), docs/GRASS.md.
// Scenes (?scene=):
//   garden  D8, the villa streets east of Avenue de Beersel: front gardens between houses, kerbs, sidewalks
//   park    F4, the Wolvendael park lawns (the slope under the château, the big trees)
//   verge   D8, Rue du Bourdon from a car: the roadside verges of Uccle's south
// ?time=golden|midday|night|..., ?preset=low|medium|high|ultra, ?grass=0 (the textured ground alone), ?cam=x,y,z,tx,ty,tz
// window.lab: bench(), strip(), flicker(), pipelines(), counts(), go(view) ...
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { Heightmap } from "../viewer/heightmap.js";
import { buildingMeshes as facadeMeshes } from "../viewer/facades.js";
import { landCoverTexture, groundMaterial, setGroundTextures } from "../viewer/ground.js";
import { loadGroundTextures } from "../viewer/materials/groundTex.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial } from "../viewer/roadPaint.js";
import { cobbleMaterial, pitMaterial } from "../viewer/cobbles.js";
import { lodEye } from "../viewer/lodFade.js";
import { buildStylizedTreeField, setTreeLighting, setTreeRenderer } from "../viewer/treesStylized.js";
import { buildLamps } from "../viewer/lamps.js";
import { addLamps } from "../viewer/lampLight.js";
import { streetFit } from "../viewer/streetFit.js";
import { wind } from "../viewer/foliage/wind.js";
import { setDay, season, dayLabel } from "../viewer/seasons/season.js";
import { Grass, grassU, PRESETS as GRASS_PRESETS } from "../viewer/grass/grass.js";
import { grassTypeData, trunkDiscs } from "../viewer/grass/grassTypes.js";
import { flickerTest, showHeat } from "./flickerTest.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const SCENES = {
  garden: { label: "Front gardens, D8 (villa streets off Avenue de Beersel)", tiles: ["D8"], home: [-1100, 1850], street: /Beersel|Arbrisseau|Mirabelles|Griottes|Bigarreaux/ },
  park: { label: "Wolvendael park lawns, F4", tiles: ["F4"], home: [-455, -135], street: null },
  verge: { label: "Rue Zandbeek verges from a car, C8 (Kauwberg)", tiles: ["C8"], home: [-1635, 1641], street: /Zandbeek/, startRide: ["drive", 0.74] },
};
const sceneId = SCENES[qp.get("scene")] ? qp.get("scene") : "garden";
const SC = SCENES[sceneId];

// pipelines: count synchronous / async render + compute pipelines (0 sync after warm-up is the rule)
const pipes = { sync: 0, async: 0, compute: 0, log: [] };
{
  const P = GPUDevice.prototype;
  const s = P.createRenderPipeline, a = P.createRenderPipelineAsync, c = P.createComputePipeline;
  P.createRenderPipeline = function (d) { pipes.sync++; pipes.log.push(["sync", d?.label || "", performance.now()]); return s.call(this, d); };
  P.createRenderPipelineAsync = function (d) { pipes.async++; return a.call(this, d); };
  P.createComputePipeline = function (d) { pipes.compute++; pipes.log.push(["compute", d?.label || "", performance.now()]); return c.call(this, d); };
}

const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const W0 = +qp.get("w") || innerWidth, H0 = +qp.get("h") || innerHeight;
renderer.setSize(W0, H0);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W0 / H0, 0.1, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);
setTreeRenderer(renderer); setTreeLighting(lighting);
const say = (s) => { $info.textContent = s; console.log("[grass lab]", s); };

// ------------------------------------------------------------------------------------------------ the city tiles
say("ground textures…");
setGroundTextures(await loadGroundTextures(renderer).catch(() => null));
const DATA = new URL("../data/tiles/", import.meta.url);
const manifest = await fetch(new URL("manifest.json", DATA)).then((r) => r.json());
const kinds = await fetch(new URL("../data/grass/osm_grass.json", import.meta.url)).then((r) => r.json()).then((d) => d.kinds).catch(() => null);
const tileWorker = new Worker(new URL("../viewer/tileWorker.bundle.js", import.meta.url), { type: "module" });
let reqId = 0; const pending = new Map();
tileWorker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.r); };
const tileData = (entry) => new Promise((resolve, reject) => { const id = ++reqId; pending.set(id, { resolve, reject }); tileWorker.postMessage({ id, entry: { ...entry, hide: [], surface: true, pits: true }, base: DATA.href, lite: false }); });
const shared = new Map();
const sharedMat = (k, f) => { if (!shared.has(k)) shared.set(k, f()); return shared.get(k); };
const hms = [], cityRoads = [], updaters = [], tileFeats = [], tileTypes = [];
const cityGroup = new THREE.Group(); scene.add(cityGroup);
const grassOn = qp.get("grass") !== "0" && Grass.supported(renderer);
const grass = grassOn ? new Grass(renderer, { preset: qp.get("preset") || "high" }) : null;
if (grass) scene.add(grass.group);
const texLoader = new THREE.TextureLoader();
const CARVE = 0.12;

async function loadCityTile(name) {
  const entry = manifest.tiles.find((t) => t.name === name);
  const orthoP = texLoader.loadAsync(new URL(entry.files.ortho, DATA).href).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }).catch(() => null);
  const surfP = entry.files.surfaces ? fetch(new URL(entry.files.surfaces, DATA)).then((r) => r.json()).catch(() => null) : null;
  const d = await tileData(entry);
  const bounds = { x0: entry.bounds.x[0], x1: entry.bounds.x[1], z0: entry.bounds.z[0], z1: entry.bounds.z[1] };
  const hm = Heightmap.from(d.hdr, d.y, d.orig);
  hms.push({ bounds, hm });
  const road = d.road;
  const mats = { asphalt: asphaltMaterial(road.atlas), grass: sharedMat("verge", vergeMaterial), square: sharedMat("cobbles", cobbleMaterial), pits: sharedMat("pits", pitMaterial),
    paint: sharedMat("concrete", concreteMaterial),
    concrete: road.surfaceStats ? sharedMat("concrete-framed", () => concreteMaterial({ framed: true })) : sharedMat("concrete", concreteMaterial) };
  const roadMeshes = [];
  for (const [k, part] of Object.entries(road.parts)) {
    if (k === "paint") continue;              // measured paint (v2) is the city's own material: left out here
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [a, v] of Object.entries(part.attributes)) g.setAttribute(a, new THREE.BufferAttribute(v.array, v.itemSize));
    if (part.aSurf) g.setAttribute("aSurf", new THREE.BufferAttribute(part.aSurf, 1));
    g.setIndex(new THREE.BufferAttribute(part.index, 1));
    const m = new THREE.Mesh(g, mats[k]); m.receiveShadow = true; m.name = `roads-${k}`; cityGroup.add(m); roadMeshes.push(m);
  }
  // terrain: the city's own textured ground
  const cover = landCoverTexture(d.feats, bounds, d.cover);
  cover.ortho = await orthoP;
  const t = d.terrain, tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.BufferAttribute(t.pos, 3)); tg.setAttribute("normal", new THREE.BufferAttribute(t.nrm, 3)); tg.setIndex(new THREE.BufferAttribute(t.idx, 1));
  const terrain = new THREE.Mesh(tg, groundMaterial(cover, bounds, (c) => c)); terrain.receiveShadow = true; terrain.name = "terrain"; cityGroup.add(terrain);
  // buildings
  const B = facadeMeshes(null, null, null, null, d.buildings);
  for (const m of B.meshes) cityGroup.add(m);
  // trees + lamps (shadows on the grass; lamp pools at night)
  const inTile = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  const fit = road.surfaceData ? streetFit(road.surfaceData) : null;
  const treeGround = fit ? (x, z) => (fit.classAt(x, z) >= 0 ? hm.surface(x, z) + CARVE + fit.lift(x, z) : hm.surface(x, z)) : (x, z) => hm.surface(x, z);
  const T = buildStylizedTreeField(d.feats.trees || [], treeGround, inTile);
  cityGroup.add(T.group || T.mesh); if (T.update) updaters.push(T.update);
  const lamps = buildLamps(d.roads, (x, z) => hm.ground(x, z), bounds, { place: fit?.placeLamp, lift: fit?.lift, lights: false });
  cityGroup.add(lamps.group); if (lamps.update) updaters.push(lamps.update);
  addLamps(name, lamps.heads);
  cityRoads.push(d.roads); tileFeats.push({ name, feats: d.feats, bounds });
  // the grass field: terrain + islands grow, the rest is solid
  if (grass) {
    const surfaces = await surfP;
    const tt = performance.now();
    const types = grassTypeData(d.feats, bounds, { kinds, surfaces });
    const typeMs = performance.now() - tt;
    tileTypes.push({ name, bounds, types });
    grass.field.addTile(name, { terrain, grass: roadMeshes.filter((m) => m.name === "roads-grass"), solids: [...roadMeshes.filter((m) => m.name !== "roads-grass"), ...B.meshes],
      trunks: trunkDiscs(d.feats, bounds), cover: cover.tex, types, bounds });
    console.log("[grass lab] types", name, types.stats, `${typeMs.toFixed(1)} ms`);
  }
  return d;
}
const groundAt = (x, z) => { for (const t of hms) if (x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1) return t.hm.ground(x, z); return hms[0]?.hm.ground(x, z) ?? 70; };
const surfaceAt = (x, z) => { for (const t of hms) if (x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1) return t.hm.surface(x, z); return groundAt(x, z); };

const t0 = performance.now();
say(`loading ${SC.label}…`);
for (const t of SC.tiles) await loadCityTile(t);
const cityMs = performance.now() - t0;
if (grass) grass.groundAt = groundAt;

// ------------------------------------------------------------------------------------------------ views and paths
/** a street of the scene as a camera path: drive = 1.7 m right of the centreline at 1.25 m, walk = beside the road */
function streetPath(re, kind) {
  if (!re) return null;
  const segs = [];
  for (const R of cityRoads) {
    const N = new Map(R.nodes.map((n) => [n.id, n]));
    for (const r of R.roads) if (re.test(r.meta?.name || "") && !/service|footway/.test(r.meta?.highway || "")) segs.push([N.get(r.a), ...r.pts, N.get(r.b)].map((q) => [q.x, q.z]));
  }
  if (!segs.length) return null;
  const len = (p) => p.reduce((t, q, i) => t + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  segs.sort((x, y) => len(y) - len(x));
  let chain = segs.shift().slice(), grew = true;
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 3;
  while (grew) {
    grew = false;
    for (let i = 0; i < segs.length; i++) {
      const q = segs[i];
      if (near(chain.at(-1), q[0])) chain.push(...q.slice(1));
      else if (near(chain.at(-1), q.at(-1))) chain.push(...q.slice(0, -1).reverse());
      else if (near(chain[0], q.at(-1))) chain.unshift(...q.slice(0, -1));
      else if (near(chain[0], q[0])) chain.unshift(...q.slice(1).reverse());
      else continue;
      segs.splice(i, 1); grew = true; break;
    }
  }
  const off = (kind === "drive" ? 1.0 : 4.6) * (SC.offScale ?? 1), eye = kind === "drive" ? 1.25 : 1.65;
  // only the stretch inside the loaded tiles (the longest run, 30 m in from the tile edge)
  const inside = ([x, z]) => hms.some((t) => x > t.bounds.x0 + 30 && x < t.bounds.x1 - 30 && z > t.bounds.z0 + 30 && z < t.bounds.z1 - 30);
  let run = [], bestRun = [];
  for (const q of chain) { if (inside(q)) { run.push(q); if (run.length > bestRun.length) bestRun = run; } else run = []; }
  chain = bestRun;
  const pts = [];
  for (let i = 0; i < chain.length; i++) {
    const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    const x = chain[i][0] + nx * off, z = chain[i][1] + nz * off;
    if (pts.length && Math.hypot(pts.at(-1).x - x, pts.at(-1).z - z) < 2) continue;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  if (pts.length < 2) return null;
  const c = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  c.userData = { eye, kind };
  return c;
}
/** the park: a walk along the Wolvendael footways near home (the longest OSM footway chain within 120 m) */
function footPath() {
  const [hx, hz] = SC.home;
  let best = null;
  for (const { feats } of tileFeats) for (const l of feats.lines || []) {
    if (!/footway|path/.test(l.kind)) continue;
    const dmin = Math.min(...l.line.map(([x, z]) => Math.hypot(x - hx, z - hz)));
    const L = l.line.reduce((t, q, i) => t + (i ? Math.hypot(q[0] - l.line[i - 1][0], q[1] - l.line[i - 1][1]) : 0), 0);
    if (dmin < 120 && L > 60 && (!best || L > best.L)) best = { l, L };
  }
  if (!best) return null;
  const pts = best.l.line.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const c = new THREE.CatmullRomCurve3(pts, false, "centripetal"); c.userData = { eye: 1.65, kind: "walk" };
  return c;
}
const paths = { drive: streetPath(SC.street, "drive"), walk: SC.street ? streetPath(SC.street, "walk") : footPath() };
let ride = null;
function startRide(kind, u = 0) {
  const c = paths[kind]; if (!c) return false;
  ride = { curve: c, u, speed: kind === "drive" ? 8.3 : 1.4, len: c.getLength(), kind };
  controls.enabled = false; rideStep(0); return true;
}
function rideStep(dt) {
  if (!ride) return;
  ride.u += (ride.speed * dt) / ride.len;
  if (ride.u >= 1) { ride.u = 0; }
  const p = ride.curve.getPointAt(ride.u), q = ride.curve.getPointAt(Math.min(1, ride.u + 0.01));
  const eye = ride.curve.userData.eye;
  camera.position.set(p.x, surfaceAt(p.x, p.z) + eye + (ride.kind === "drive" ? CARVE : 0), p.z);
  const fwd = q.clone().sub(p).setY(0).normalize();
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);              // right
  const look = camera.position.clone().addScaledVector(fwd, 12).addScaledVector(side, ride.kind === "drive" ? 0.8 : 1.5);
  look.y = camera.position.y - 1.0;
  camera.lookAt(look); controls.target.copy(look);
  if (grass && ride.kind === "drive") {
    // the car's wheels lay the grass down where they touch it (front + rear, both sides)
    const v = fwd.clone().multiplyScalar(ride.speed);
    let k = 0;
    for (const s of [-0.8, 0.8]) for (const f of [1.2, -1.4]) {
      const x = p.x + side.x * s + fwd.x * f, z = p.z + side.z * s + fwd.z * f, gy = groundAt(x, z);
      grass.push.set(k++, { x, y: gy, z, radius: 0.35, strength: 1, vx: v.x, vz: v.z, ground: gy });
    }
  }
}
function goHome(eye = 1.65) {
  ride = null; controls.enabled = true;
  if (SC.startRide && startRide(...SC.startRide)) { ride.speed = 0; return; }   // parked on the ride (a car on the verge road)
  const [x, z] = SC.home;
  camera.position.set(x, groundAt(x, z) + eye, z);
  controls.target.set(x + 10, groundAt(x + 10, z + 6) + 0.2, z + 6); controls.update();
}

// ------------------------------------------------------------------------------------------------ panel
const S = { scene: sceneId, time: preset, preset: grass?.presetName || "off", grass: !!grass, day: season.day, windSpeed: wind.speed, post: true, debugLod: false,
  tip: grassU.tip.value, root: grassU.root.value, density: grassU.density.value, d0: grassU.d0.value, reach: grassU.reach.value, minPx: grassU.minPixels.value,
  stats: "", bench: "—", flicker: "—" };
const ui = new Panel({ title: "Grass Lab" });
const fs = ui.addFolder("Scene & view");
fs.add(S, "scene", Object.keys(SCENES)).name("scene (reloads)").onChange((v) => { qp.set("scene", v); location.search = qp.toString(); });
fs.add({ go: () => goHome() }, "go").name("start view");
fs.add({ go: () => startRide("walk") }, "go").name("walk (5 km/h)");
fs.add({ go: () => startRide("drive") }, "go").name("drive (30 km/h)");
const fl = ui.addFolder("Light & season");
fl.add(S, "time", Object.keys(PRESETS)).name("time").onChange((v) => { lighting.apply(v); pipe?.look(v); });
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { setDay(v); grass?.syncSeason(); });
fl.add(S, "windSpeed", 0, 16, 0.1).name("wind m/s").onChange((v) => { wind.speed = v; });
fl.add(S, "post").name("post effects");
const fg = ui.addFolder("Grass");
fg.add(S, "grass").name("grass on").onChange((v) => { if (grass) grass.enabled = v; });
fg.add(S, "preset", Object.keys(GRASS_PRESETS)).name("quality preset").onChange((v) => { grass?.setPreset(v); S.density = grassU.density.value; S.d0 = grassU.d0.value; S.reach = grassU.reach.value; });
fg.add(S, "density", 0, 1.5, 0.01).name("density").onChange((v) => { grassU.density.value = v; }).listen();
fg.add(S, "d0", 0.4, 2, 0.01).name("full-density radius x").onChange((v) => { grassU.d0.value = v; grass?.sizeLevels(); }).listen();
fg.add(S, "reach", 0.3, 1.5, 0.01).name("reach x").onChange((v) => { grassU.reach.value = v; }).listen();
fg.add(S, "minPx", 0.3, 2, 0.05).name("min blade width (px)").onChange((v) => { grassU.minPixels.value = v; });
fg.add(S, "tip", 0.6, 2, 0.01).name("tip brightness").onChange((v) => { grassU.tip.value = v; });
fg.add(S, "root", 0.1, 1, 0.01).name("root brightness").onChange((v) => { grassU.root.value = v; });
fg.add(S, "debugLod").name("tint the 3 LODs").onChange((v) => { grassU.debugLod.value = v ? 1 : 0; });
const fp = ui.addFolder("Performance & tests");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("GPU A/B grass on / off (alternating)");
fp.add(S, "bench").name("result");
fp.add({ go: () => flicker("strafe") }, "go").name("flicker test: strafe");
fp.add(S, "flicker").name("result");

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goHome();
if (qp.get("cam")) { const c = qp.get("cam").split(",").map(Number); camera.position.set(c[0], c[1], c[2]); if (c.length >= 6) controls.target.set(c[3], c[4], c[5]); controls.update(); }
if (qp.get("ride")) startRide(qp.get("ride"), +(qp.get("u") || 0));
setDay(+(qp.get("day") || season.day)); grass?.syncSeason(); S.day = season.day;

const gpu = { samples: [], comp: [], pending: false, avg: 0 };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([ms, cms]) => {
    if (typeof ms === "number" && ms > 0) { const t = ms + (cms || 0); gpu.avg = gpu.avg ? gpu.avg * 0.9 + t * 0.1 : t; gpu.samples.push(t); gpu.comp.push(cms || 0); if (gpu.samples.length > 900) { gpu.samples.shift(); gpu.comp.shift(); } }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const cpu = { samples: [] };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
let freeze = false, last = performance.now(), frames = 0, fps = 0, fpsAcc = 0, fpsN = 0;

function renderFrame(dt) {
  if (ride) rideStep(dt); else controls.update();
  lodEye.value.copy(camera.position);
  camera.updateMatrixWorld();
  wind.update(dt);
  for (const u of updaters) u(camera.position, camera);
  const tc = performance.now();
  if (grass) grass.update(camera, dt);
  cpu.samples.push(performance.now() - tc); if (cpu.samples.length > 900) cpu.samples.shift();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, 140);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
}
renderer.setAnimationLoop(() => {
  if (freeze) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  renderFrame(dt);
  sampleGpu();
  if (++frames % 30 === 1) {
    grass?.readCounts().catch(() => {});
    const r = renderer.info.render, c = grass?.counts || [0, 0, 0];
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws`;
    $info.textContent = `${SC.label} · tiles ${cityMs.toFixed(0)} ms\n${S.stats} (compute ${median(gpu.comp.slice(-60)).toFixed(3)} ms) · grass CPU ${median(cpu.samples.slice(-60)).toFixed(3)} ms\n` +
      `blades drawn ${(c[0] + c[1] + c[2]).toLocaleString()} (LOD0 ${c[0].toLocaleString()} / LOD1 ${c[1].toLocaleString()} / LOD2 ${c[2].toLocaleString()}) · preset ${grass?.presetName ?? "off"} · field bakes ${grass?.field.bakes ?? 0} (last ${grass?.field.lastBakeMs.toFixed(1) ?? 0} ms CPU)\n` +
      `pipelines: ${pipes.sync} sync, ${pipes.async} async, ${pipes.compute} compute · season ${dayLabel(season.day)}\nA/B: ${S.bench}\nflicker: ${S.flicker}\n` +
      `cam ${camera.position.toArray().map((v) => v.toFixed(1)).join(",")},${controls.target.toArray().map((v) => v.toFixed(1)).join(",")}`;
  }
});
addEventListener("resize", () => { if (qp.get("w")) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------------------------------------ measurements
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** GPU A/B: alternating rounds grass on / off; median GPU ms (render + compute) per round, median of the pair diffs */
async function bench(rounds = 6, secs = 2.5) {
  const res = { on: [], off: [], cpuOn: [] };
  for (let r = 0; r < rounds * 2; r++) {
    const on = r % 2 === 0;
    if (grass) grass.enabled = on;
    await sleep(700);
    gpu.samples.length = 0; gpu.comp.length = 0; cpu.samples.length = 0;
    await sleep(secs * 1000);
    res[on ? "on" : "off"].push(median(gpu.samples)); if (on) res.cpuOn.push(median(cpu.samples));
  }
  if (grass) grass.enabled = S.grass;
  const diffs = res.on.map((v, i) => v - res.off[i]);
  S.bench = `+${median(diffs).toFixed(3)} ms GPU (pairs ${diffs.map((d) => d.toFixed(2)).join(" ")}), on ${median(res.on).toFixed(2)} / off ${median(res.off).toFixed(2)}; grass CPU ${median(res.cpuOn).toFixed(3)} ms`;
  console.log("[grass lab] bench", res, S.bench);
  return { ...res, diffs, diff: +median(diffs).toFixed(3), counts: grass?.counts, summary: S.bench };
}
async function flicker(move = "strafe", frames = 24, step = 0.0006) {
  freeze = true;
  const r = await flickerTest({ renderFrame: () => renderFrame(0), canvas: renderer.domElement, camera, controls, frames, move, step });
  freeze = false;
  S.flicker = `${move}: ${r.blink} px blinking (${r.ppm} ppm)`;
  showHeat(r);
  return r;
}
/** a moving frame strip: n frames, `every` steps of 1/60 s apart along a ride, composed into one overlay image */
async function strip(kind = "walk", { u = 0.1, n = 6, every = 20, cols = 3, scale = 0.5 } = {}) {
  freeze = true;
  if (!startRide(kind, u)) { freeze = false; return null; }
  const cv = document.createElement("canvas");
  const w = Math.round(renderer.domElement.width * scale), h = Math.round(renderer.domElement.height * scale);
  cv.width = w * cols; cv.height = h * Math.ceil(n / cols);
  const g = cv.getContext("2d");
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < every - 1; s++) { renderFrame(1 / 60); await renderer.backend.device.queue.onSubmittedWorkDone(); }
    renderFrame(1 / 60);                       // the captured frame: copied in the same task (the canvas is only valid until presented)
    g.drawImage(renderer.domElement, (i % cols) * w, Math.floor(i / cols) * h, w, h);
    g.fillStyle = "#fff"; g.font = "14px monospace"; g.fillText(`${kind} +${(i * every / 60).toFixed(2)} s`, (i % cols) * w + 8, Math.floor(i / cols) * h + 18);
  }
  cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;object-fit:contain;z-index:20;background:#000";
  cv.id = "strip"; document.getElementById("strip")?.remove(); document.body.append(cv);
  return { w: cv.width, h: cv.height };
}
const hideStrip = () => { document.getElementById("strip")?.remove(); document.getElementById("heat")?.remove(); freeze = false; };
const go = (x, y, z, tx, ty, tz) => { ride = null; controls.enabled = true; camera.position.set(x, y, z); controls.target.set(tx, ty, tz); controls.update(); };
const goGround = (x, z, eye, tx, tz, ty = 0.3) => go(x, groundAt(x, z) + eye, z, tx, groundAt(tx, tz) + ty, tz);
const step = async (n = 1) => { for (let i = 0; i < n; i++) renderFrame(1 / 60); await renderer.backend.device.queue.onSubmittedWorkDone(); };
window.lab = { renderer, scene, camera, controls, grass, grassU, lighting, pipe, bench, flicker, strip, hideStrip, go, goGround, goHome, startRide, step,
  pipes, gpu, S, paths, tileTypes, cityRoads, groundAt, surfaceAt, setFreeze: (v) => { freeze = v; }, cityMs, wind, setDay };
say(`${SC.label} ready`);
