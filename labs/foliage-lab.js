// THE FOLIAGE LAB: the ground vegetation systems (viewer/foliage/) on their own, under the city's lighting and post
// chain. Scenes (?scene=):
//   street  a real Uccle street with front gardens: tile D8 (terraces west of the cemetery), UrbIS DTM + street
//           surfaces + building footprints, gardens from the orthophoto's green (viewer/foliage/placement.js), hedges
//           along the garden fronts, shrubs and beds, GPU grass. The perf scene (budget <= 0.8 ms at street level).
//   garden  a 48 x 48 m test bed: mowed lawn, long verge, meadow with wildflowers, hedges of every species following
//           polylines, a bed of every plant, a wall with ivy growing on it and window boxes, leaf litter.
// Panels: season (month), wind (speed, direction, gust), grass (density, layers, debug bands), what is shown, views,
// benchmark (alternating on / off rounds), flicker test, moving frame strips.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec2, vec3, float, mix, smoothstep, positionWorld, length, cameraPosition, color } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { wind } from "../viewer/foliage/wind.js";
import { season, SEASON_NAMES } from "../viewer/foliage/seasons.js";
import { FoliageMask, GroundHeights, GrassSystem, grassGroundColor, grassU, GRASS_LAYERS } from "../viewer/foliage/grass.js";
import { MaskBuilder, frontGardens, hedgeRuns, scatterPlants, KIND, hash2 } from "../viewer/foliage/placement.js";
import { noiseAt } from "../viewer/foliage/noise.js";
import { buildHedges } from "../viewer/foliage/hedges.js";
import { buildPlants, PLANT_TYPES } from "../viewer/foliage/plants.js";
import { flickerTest } from "./flickerTest.js";
import { frameStrip } from "./frameStrip.js";

const qp = new URLSearchParams(location.search);
const SCENE = qp.get("scene") === "garden" ? "garden" : "street";
const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
if (qp.get("w")) renderer.setSize(+qp.get("w"), +qp.get("h") || 720); else renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, renderer.domElement.width / renderer.domElement.height, 0.1, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the region
const log = [];
let region, heights, mb, gardens = null, hedges = [], plants = [], tileData = null, streetMask = null;
if (SCENE === "street") {
  const T = "D8";
  const get = (f) => fetch(`../data/tiles/${T}/${f}`);
  const [terr, tbuf, surf, bmeta, bbin, feats] = await Promise.all([get("terrain.json").then((r) => r.json()), get("terrain.u16").then((r) => r.arrayBuffer()),
    get("surfaces.json").then((r) => r.json()), get("buildings.json").then((r) => r.json()), get("buildings.bin").then((r) => r.arrayBuffer()), get("features.json").then((r) => r.json())]);
  const ortho = await createImageBitmap(await get("ortho.jpg").then((r) => r.blob()));
  // the villa streets east of the railway (detached houses with front gardens, hedges on the street line): 240 m square
  region = { x0: -1240, z0: 1660, size: 240 };
  const raw = new Uint16Array(tbuf), n = region.size + 1, H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = Math.round(region.x0 + i - terr.x0), r = Math.round(region.z0 + j - terr.z0);
    const v = raw[Math.min(terr.rows - 1, Math.max(0, r)) * terr.cols + Math.min(terr.cols - 1, Math.max(0, c))];
    H[j * n + i] = (v === terr.nodata ? 4000 : v) / 100;
  }
  heights = new GroundHeights(H, n, n, region.x0, region.z0, 1);
  tileData = { surfaces: surf, buildings: bmeta.buildings, features: feats, ortho, bounds: { x0: terr.x0, z0: terr.z0, size: terr.size }, bin: bbin };
  mb = new MaskBuilder(region.x0, region.z0, region.size, 480);
  gardens = frontGardens(tileData, mb);
  hedges = hedgeRuns(tileData, mb, gardens);
  plants = scatterPlants(tileData, mb, gardens, hedges);
  // street surfaces for the ground colour: R roadway-like, G raised (sidewalk, median, square)
  const sm = new MaskBuilder(region.x0, region.z0, region.size, 480);
  for (const s of surf.surfaces) { const raised = [4, 5, 6, 7, 8].includes(s.c); sm.fill(s.rings, { cover: raised ? 0 : 1, kind: raised ? 1 : 0 }); }
  streetMask = new FoliageMask(sm.data(), 480, region.x0, region.z0, region.size);
  log.push(`D8: ${hedges.length} hedge runs (${hedges.reduce((s, h) => s + h.points.length * 0.5, 0).toFixed(0)} m), ${plants.length} plants`);
} else {
  region = { x0: -24, z0: -24, size: 48 };
  const n = 49, H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) H[j * n + i] = 60 + 0.25 * Math.sin(i * 0.21) * Math.cos(j * 0.17) + (j - 24) * 0.012;
  heights = new GroundHeights(H, n, n, region.x0, region.z0, 1);
  mb = new MaskBuilder(region.x0, region.z0, region.size, 192);
  const rect = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]];
  mb.fill(rect(-20, -20, -4, 20), { cover: 1, kind: KIND.lawn, flowers: 0.25, litter: 0.5 });    // lawn (with daisies)
  mb.fill(rect(-2, -20, 8, 20), { cover: 1, kind: KIND.verge, flowers: 0.3, litter: 0.3 });     // long verge
  mb.fill(rect(10, -20, 22, 20), { cover: 1, kind: KIND.meadow, flowers: 1, litter: 0.2 });     // meadow
  mb.stroke([[-24, 0], [24, 0]], 1.4, { cover: 0, litter: 0 });                                  // a gravel path across
  mb.fill(rect(-20, 14, -4, 17), { cover: 0, litter: 1 });                                       // bed (bare soil, litter)
  mb.feather(1);
  streetMask = null;
}
const mask = new FoliageMask(mb.data(), mb.res, region.x0, region.z0, region.size);

// ------------------------------------------------------------------------------------------------ ground
const ground = new THREE.Mesh(heights.geometry(), new THREE.MeshStandardNodeMaterial({ roughness: 0.95 }));
ground.receiveShadow = true;
scene.add(ground);
const grassSys = new GrassSystem({ mask, ground: heights });
scene.add(grassSys.group);
{
  const P = positionWorld, xz = vec2(P.x, P.z);
  const n = noiseAt(xz, 1 / 7).a;
  const soil = mix(color(0x4a3a28), color(0x5e4a33), n);
  let base = soil;
  if (streetMask) {
    const s = streetMask.atFrag(xz);
    const asphalt = mix(color(0x3c3d40), color(0x47484b), n), pave = mix(color(0x8b8780), color(0x9a958c), n);
    base = mix(base, pave, s.g); base = mix(base, asphalt, s.r);
  } else {
    const gravel = mix(color(0x9a8c74), color(0xb8ab92), n);
    base = mix(soil, gravel, smoothstep(0.75, 0.6, P.z.abs()));
  }
  const m = mask.atFrag(xz);
  const d = length(P.sub(cameraPosition));
  ground.material.colorNode = grassGroundColor(xz, m, d, base, GRASS_LAYERS.main);
}

// buildings (street): the tile's UrbIS solids, plain
if (tileData) {
  const dv = new DataView(tileData.bin), V = dv.getUint32(0, true);
  const pos = new Float32Array(tileData.bin, 8, 3 * V), idx = new Uint32Array(tileData.bin, 8 + 12 * V);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const bm = new THREE.Mesh(ng, new THREE.MeshStandardNodeMaterial({ color: 0x9c7b66, roughness: 0.85 }));
  bm.castShadow = bm.receiveShadow = true;
  scene.add(bm);
}

// ------------------------------------------------------------------------------------------------ views
const G = (x, z, dy = 1.65) => new THREE.Vector3(x, heights.get(x, z) + dy, z);
const VIEWS = SCENE === "street" ? {
  "street level": [G(-1056, 1735), G(-1050, 1770, 0.6)],
  "front gardens close": [G(-1057, 1752), G(-1066, 1757, 0.3)],
  "down the street": [G(-1053, 1695), G(-1060, 1800, 0.8)],
  "from the sky (300 m)": [G(-1090, 1640, 300), G(-1090, 1780, 0)],
  "first floor window": [G(-1070, 1772, 6), G(-1050, 1760, 0.2)],
} : {
  "lawn / verge / meadow": [G(0, 22), G(0, 0, 0.3)],
  "meadow close": [G(16, 8, 1.2), G(16, -2, 0)],
  "lawn close": [G(-12, 6, 1.0), G(-12, -3, 0)],
  "overview": [G(-30, 34, 22), G(0, 0, 0)],
  "hedges": [G(-4, -13), G(1, -21, 0.9)],
  "box edging and bed": [G(-8, 10, 1.4), G(-12, 15.5, 0.2)],
  "plants row": [G(-11.5, 21.0, 1.7), G(-11.5, 15.5, 0.3)],
};
function goView(name) { const v = VIEWS[name]; if (!v) return; camera.position.copy(v[0]); controls.target.copy(v[1]); S.view = name; }

// ------------------------------------------------------------------------------------------------ panel
const S = { plants: true, hedges: true, view: Object.keys(VIEWS)[0], month: season.month, snow: 0, grass: true, near: true, main: true, flowers: true, litter: true,
  density: 1, debugBands: false, minPx: 1.1, windSpeed: wind.speed, windDir: wind.direction, gust: wind.gust, freeze: false, time: preset, post: true,
  stats: "", bench: "(run)", flicker: "(run)" };
const ui = new Panel({ title: "Foliage Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(VIEWS)).onChange(goView);
fv.add(S, "time", Object.keys(PRESETS)).name("light").onChange((v) => { lighting.apply(v); pipe?.look(v); });
fv.add(S, "post").name("post chain");
const fs = ui.addFolder("Season");
fs.add(S, "month", 1, 12.99, 0.05).name("month (1 = Jan)").onChange((v) => { season.month = v; season.apply(); }).listen();
for (const [k, m] of Object.entries(SEASON_NAMES)) fs.add({ f: () => { S.month = m; season.month = m; season.apply(); } }, "f").name(k);
fs.add(S, "snow", 0, 1, 0.01).name("snow (weather)").onChange((v) => { season.snow = v; season.apply(); });
const fw = ui.addFolder("Wind (shared field)");
fw.add(S, "windSpeed", 0, 20, 0.1).name("speed m/s").onChange((v) => { wind.speed = v; });
fw.add(S, "windDir", 0, 360, 1).name("direction °").onChange((v) => { wind.direction = v; });
fw.add(S, "gust", 0, 1, 0.01).name("gustiness").onChange((v) => { wind.gust = v; });
fw.add(S, "freeze").name("freeze time").onChange((v) => { wind.frozen = v; });
const fg = ui.addFolder("Grass and ground fields");
fg.add(S, "grass").name("all fields");
for (const k of Object.keys(grassSys.layers)) fg.add(S, k).name(`layer ${k}`);
fg.add(S, "density", 0, 1.5, 0.01).onChange((v) => { grassU.density.value = v; });
fg.add(S, "minPx", 0, 2, 0.05).name("min blade px").onChange((v) => { grassU.minPixels.value = v; });
fg.add(S, "plants").name("plants (Blender)");
fg.add(S, "hedges");
fg.add(S, "debugBands").name("tint layers").onChange((v) => { grassU.debugLayers.value = v ? 1 : 0; });
const fb = ui.addFolder("Measure");
fb.add(S, "stats").name("stats").listen();
fb.add({ f: () => bench() }, "f").name("GPU benchmark (on/off rounds)");
fb.add(S, "bench").name("result").listen();
fb.add({ f: () => runFlicker("strafe") }, "f").name("flicker test (strafe)");
fb.add(S, "flicker").name("result").listen();

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(qp.get("view") && VIEWS[qp.get("view")] ? qp.get("view") : S.view);

const gpu = { render: 0, compute: 0, samples: [], pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([r, c]) => {
    if (typeof r === "number" && r > 0) {
      const cc = typeof c === "number" ? c : 0;
      gpu.render = gpu.render * 0.9 + r * 0.1; gpu.compute = gpu.compute * 0.9 + cc * 0.1;
      gpu.samples.push(r + cc); if (gpu.samples.length > 900) gpu.samples.shift();
    }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}

let forcedOff = false;
function applyShow() {
  const on = S.grass && !forcedOff;
  for (const [k, L] of Object.entries(grassSys.layers)) L.enabled = on && S[k];
  extras.visible = !forcedOff;
}
const extras = new THREE.Group(); scene.add(extras);
// ------------------------------------------------------------------------------------------------ hedges
const densify = (pts, step = 0.5) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < d; t += step) o.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); } o.push(pts[pts.length - 1]); return o; };
if (SCENE === "garden") hedges.push(
  { points: densify([[-20, -21], [-6, -21]]), species: "privet", height: 1.6, width: 0.7 },
  { points: densify([[-3, -21], [3, -20.2], [8, -21.5]]), species: "beech", height: 1.8, width: 0.75 },
  { points: densify([[10, -21], [22, -21]]), species: "hornbeam", height: 1.4, width: 0.65 },
  { points: densify([[23, -18], [23, -3]]), species: "laurel", height: 2.0, width: 1.0 },
  { points: densify([[-20, 13.2], [-4, 13.2]]), species: "box", height: 0.45, width: 0.35 },
  { points: densify([[-20, 17.8], [-4, 17.8]]), species: "box", height: 0.55, width: 0.4 });
const hedgeSet = buildHedges(hedges, (x, z) => heights.get(x, z));
extras.add(hedgeSet.group);
// ------------------------------------------------------------------------------------------------ plants
if (SCENE === "garden") {
  PLANT_TYPES.forEach((t, k) => plants.push({ x: -19 + k * 2.1, z: 15.5, type: t, yaw: k * 1.3, scale: 1 }));
  for (let k = 0; k < 14; k++) plants.push({ x: -18 + (k % 7) * 2.2, z: -15 + Math.floor(k / 7) * 3, type: PLANT_TYPES[k % 4], yaw: k * 2.1, scale: 0.9 + (k % 3) * 0.1 });
}
const plantSet = await buildPlants(plants, (x, z) => heights.get(x, z));
extras.add(plantSet.group);
log.push(`plants: ${plants.length} (${Object.entries(plantSet.stats.byType).map(([k, v]) => `${k} ${v.n}: ${v.tris.join("/")} tris`).join(", ")})`);
log.push(`hedges: ${hedgeSet.stats.metres.toFixed(0)} m, ${hedgeSet.stats.tris.toLocaleString()} tris, ${hedgeSet.stats.cards.toLocaleString()} leaf cards, ${hedgeSet.stats.draws} draws`);

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0, cpuMs = 0;
function frame(dt) {
  controls.update();
  wind.update(dt);
  applyShow();
  const t0 = performance.now();
  const disp = grassSys.frame(renderer, camera);
  if (!forcedOff && S.plants) disp.push(...plantSet.frame(renderer, camera));
  if (disp.length) renderer.compute(disp);
  plantSet.group.visible = !forcedOff && S.plants; hedgeSet.group.visible = !forcedOff && S.hedges;
  cpuMs = cpuMs * 0.95 + (performance.now() - t0) * 0.05;
  lighting.update(camera.position.y, heights.get(camera.position.x, camera.position.z), controls.target, 150);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
}
let paused = false;
renderer.setAnimationLoop(() => {
  if (paused) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  frame(dt);
  sampleGpu();
  if (++frames % 30 === 1) {
    grassSys.readCounts(renderer).catch(() => {});
    const r = renderer.info.render, st = grassSys.stats();
    S.stats = `${fps.toFixed(0)} fps · GPU ${(gpu.render + gpu.compute).toFixed(2)} ms (compute ${gpu.compute.toFixed(2)})`;
    $info.textContent = `${S.stats} · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1e6).toFixed(2)} M tris · foliage CPU ${cpuMs.toFixed(3)} ms/frame\n` +
      Object.entries(st).map(([k, v]) => `${k}: ${v.drawn.toLocaleString()} drawn / ${v.threads.toLocaleString()} cells`).join(" · ") +
      `\nmonth ${season.month.toFixed(1)} · wind ${wind.speed} m/s · ${log.join(" · ")}\nbench (median GPU ms/frame, alternating rounds): ${S.bench}\nflicker: ${S.flicker}`;
  }
});
addEventListener("resize", () => { if (qp.get("w")) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ------------------------------------------------------------------------------------------------ measurements
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
/** alternating on / off rounds (settle 0.5 s, sample 1.5 s each), median of all rounds per mode */
async function bench(rounds = 6, views = [S.view]) {
  const out = {};
  for (const v of views) {
    goView(v); await wait(1200);
    const acc = { on: [], off: [] };
    for (let k = 0; k < rounds; k++) for (const mode of ["off", "on"]) {
      forcedOff = mode === "off"; await wait(500); gpu.samples.length = 0; await wait(1500); acc[mode].push(med(gpu.samples));
    }
    forcedOff = false;
    out[v] = { on: +med(acc.on).toFixed(3), off: +med(acc.off).toFixed(3), delta: +(med(acc.on) - med(acc.off)).toFixed(3), rounds: acc };
  }
  S.bench = Object.entries(out).map(([v, r]) => `${v}: +${r.delta} ms (on ${r.on} / off ${r.off})`).join(" · ");
  console.log("[foliage lab] bench", JSON.stringify(out));
  return out;
}
/** what costs what: alternating rounds of variants (setup functions) */
async function abBench(variants, rounds = 5, views = [S.view]) {
  const out = {};
  for (const v of views) {
    goView(v); await wait(1200);
    const acc = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
    for (let k = 0; k < rounds; k++) for (const [name, setup] of Object.entries(variants)) { setup(); await wait(500); gpu.samples.length = 0; await wait(1300); acc[name].push(med(gpu.samples)); }
    out[v] = Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, +med(a).toFixed(3)]));
  }
  Object.assign(S, { grass: true, plants: true, hedges: true }); forcedOff = false;
  console.log("[foliage lab] abBench", JSON.stringify(out));
  return out;
}
const PARTS = {
  none: () => { forcedOff = true; },
  all: () => { forcedOff = false; Object.assign(S, { grass: true, plants: true, hedges: true }); },
  grass: () => { forcedOff = false; Object.assign(S, { grass: true, plants: false, hedges: false }); },
  plants: () => { forcedOff = false; Object.assign(S, { grass: false, plants: true, hedges: false }); },
  hedges: () => { forcedOff = false; Object.assign(S, { grass: false, plants: false, hedges: true }); },
};
async function runFlicker(move = "strafe", opts = {}) {
  paused = true; wind.frozen = true;
  try {
    const r = await flickerTest({ renderFrame: () => frame(0), canvas: renderer.domElement, camera, controls, frames: 24, move, step: move === "orbit" ? 0.0004 : 0.004, ...opts });
    S.flicker = `${move}: ${r.blink} blinking px (${r.ppm} ppm)`;
    return r;
  } finally { paused = false; wind.frozen = S.freeze; last = performance.now(); }
}
async function strip(path, opts = {}) {
  paused = true;
  try { return await frameStrip({ renderFrame: (dt) => frame(dt), canvas: renderer.domElement, camera, controls, path, ...opts }); }
  finally { paused = false; last = performance.now(); }
}
window.lab = { abBench, PARTS, renderer, scene, camera, controls, lighting, grassSys, mask, heights, hedges, plants, gardens, mb, bench, runFlicker, strip, goView, VIEWS, S, gpu, wind, season, grassU, extras, G, frame, setPaused: (v) => { paused = v; last = performance.now(); } };
