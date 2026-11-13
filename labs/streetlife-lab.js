// THE STREET LIFE LAB: the street-life layer (viewer/streetlife/) on REAL streets of Uccle, built from
// data/streetlife/<T>.json (tools/streetlife/build_streetlife.py: OSM POIs, STIB stops, Villo, bpost, UrbIS addresses):
// the real shops in their real places on the city's own tiles (terrain, measured street surfaces, UrbIS façades with the
// city's façade material, read-only; the city's own OSM shopfront boxes are left out here so they don't double ours).
// Sites: Place de Saint-Job (tiles I5 + I6) and Chaussée de Waterloo at Fort-Jaco (J6, with the Esso station).
// Panel: site, time of day, text fade distances, layer / text / props toggles, camera paths (walk / drive past the
// shops), flicker test (labs/flickerTest.js), GPU A/B benchmark (alternating rounds), the names check (every text
// shown, against the data).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { Heightmap } from "../viewer/heightmap.js";
import { analyseBuildings, buildingMeshes as facadeMeshes } from "../viewer/facades.js";
import { landCoverTexture, groundMaterial } from "../viewer/ground.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial } from "../viewer/roadPaint.js";
import { cobbleMaterial, pitMaterial } from "../viewer/cobbles.js";
import { lodEye } from "../viewer/lodFade.js";
import { loadStJob, STJOB_BU_ID } from "../viewer/stjobModel.js";
import { StreetLife, streetUniforms } from "../viewer/streetlife/streetlife.js";
import { flickerTest, showHeat } from "./flickerTest.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $names = document.getElementById("names");
const SITES = {
  stjob: { label: "Place de Saint-Job (I5 + I6)", tiles: ["I6", "I5"], home: "Botanea", street: /Saint-Job|Prince de Ligne|Carsoel/ },
  fortjaco: { label: "Chaussée de Waterloo, Fort-Jaco (J6)", tiles: ["J6"], home: "Neuhaus", street: /Waterloo/ },
  alsemberg: { label: "Chaussée d'Alsemberg / Xavier De Bue / Parvis Saint-Pierre (E4)", tiles: ["E4"], home: "Etam", street: /Alsemberg|Xavier De Bue/ },
};
const site = SITES[qp.get("site")] ? qp.get("site") : "stjob";
const SITE = SITES[site];

const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);
const say = (s) => { $info.textContent = s; console.log("[streetlife lab]", s); };

// ------------------------------------------------------------------------------------------------ the city tiles (read-only)
const DATA = new URL("../data/tiles/", import.meta.url);
const manifest = await fetch(new URL("manifest.json", DATA)).then((r) => r.json());
const tileWorker = new Worker(new URL("../viewer/tileWorker.bundle.js", import.meta.url), { type: "module" });
let reqId = 0; const pending = new Map();
tileWorker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.r); };
const tileData = (entry) => new Promise((resolve, reject) => { const id = ++reqId; pending.set(id, { resolve, reject }); tileWorker.postMessage({ id, entry: { ...entry, hide: [STJOB_BU_ID], surface: true, pits: true }, base: DATA.href, lite: false }); });
const shared = new Map();
const sharedMat = (k, f) => { if (!shared.has(k)) shared.set(k, f()); return shared.get(k); };
const hms = [], cityRoads = [];
const cityGroup = new THREE.Group(); scene.add(cityGroup);
async function loadCityTile(name) {
  const entry = manifest.tiles.find((t) => t.name === name);
  const d = await tileData(entry);
  const bounds = { x0: entry.bounds.x[0], x1: entry.bounds.x[1], z0: entry.bounds.z[0], z1: entry.bounds.z[1] };
  hms.push({ bounds, hm: Heightmap.from(d.hdr, d.y, d.orig) });
  // roads (as main.js roadMeshes)
  const road = d.road;
  const mats = { asphalt: asphaltMaterial(road.atlas), grass: sharedMat("verge", vergeMaterial), square: sharedMat("cobbles", cobbleMaterial), pits: sharedMat("pits", pitMaterial),
    concrete: road.surfaceStats ? sharedMat("concrete-framed", () => concreteMaterial({ framed: true })) : sharedMat("concrete", concreteMaterial) };
  for (const [k, part] of Object.entries(road.parts)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [a, v] of Object.entries(part.attributes)) g.setAttribute(a, new THREE.BufferAttribute(v.array, v.itemSize));
    if (part.aSurf) g.setAttribute("aSurf", new THREE.BufferAttribute(part.aSurf, 1));
    g.setIndex(new THREE.BufferAttribute(part.index, 1));
    const m = new THREE.Mesh(g, mats[k]); m.receiveShadow = true; cityGroup.add(m);
  }
  // terrain
  {
    const t = d.terrain, g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(t.pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(t.nrm, 3)); g.setIndex(new THREE.BufferAttribute(t.idx, 1));
    const m = new THREE.Mesh(g, groundMaterial(landCoverTexture(d.feats, bounds, d.cover), bounds, (c) => c)); m.receiveShadow = true; cityGroup.add(m);
  }
  // buildings: the city's façade analysis WITHOUT its OSM shop points (our layer draws the shopfronts)
  const F = entry.files, get = (p, bin) => fetch(new URL(p, DATA)).then((r) => (bin ? r.arrayBuffer() : r.json()));
  const [bDoc, bBuf] = await Promise.all([get(F.buildings), get(F.buildingsBin, true)]);
  bDoc.buildings = bDoc.buildings.filter((b) => b.attrs?.BU_ID !== STJOB_BU_ID);
  const feats = { ...d.feats, points: (d.feats.points || []).filter((p) => p.kind !== "shop") };
  const B = facadeMeshes(null, null, null, null, analyseBuildings(bDoc, bBuf, d.roads, feats));
  for (const m of B.meshes) cityGroup.add(m);
  cityRoads.push(d.roads);
  return d;
}
const groundAt = (x, z) => { for (const t of hms) if (x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1) return t.hm.ground(x, z); return hms[0]?.hm.ground(x, z) ?? 70; };

const t0 = performance.now();
say(`loading ${SITE.label}: city tiles…`);
for (const t of SITE.tiles) await loadCityTile(t);
const cityMs = performance.now() - t0;
if (site === "stjob") {               // the scripted church instead of its UrbIS solid (as the city)
  const model = await loadStJob().catch(() => null);
  if (model) { const root = model.make(0); root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY; scene.add(root); }
}

// ------------------------------------------------------------------------------------------------ the street-life layer
say("street life: kits + worker…");
const SL = await StreetLife.create(scene);
const tileStats = [];
for (const t of SITE.tiles) tileStats.push(await SL.addTile(t));
console.log("[streetlife lab] tiles", tileStats);

// ------------------------------------------------------------------------------------------------ camera paths
const docs = await Promise.all(SITE.tiles.map((t) => fetch(`../data/streetlife/${t}.json`).then((r) => r.json())));
/** the site's main street as the road engine has it (roads.json centrelines, chained), the camera path along it:
 *  drive = the right-hand lane (1.7 m off the centreline), walk = the sidewalk on the shops' side (half the carriageway
 *  + 1.6 m), looking ahead and a little toward the shops */
function streetPath(kind) {
  const segs = [];
  for (const R of cityRoads) {
    const N = new Map(R.nodes.map((n) => [n.id, n]));
    for (const r of R.roads) if (SITE.street.test(r.meta?.name || "") && !/service|footway/.test(r.meta?.highway || "")) {
      const pts = [N.get(r.a), ...r.pts, N.get(r.b)].map((q) => [q.x, q.z]);
      let half = 0; for (const side of ["left", "right"]) half = Math.max(half, (r.lanes?.[side] || []).filter((l) => l.type !== "sidewalk").reduce((t, l) => t + (l.width || 0), 0));
      segs.push({ pts, half: half || 3.5 });
    }
  }
  if (!segs.length) return null;
  // chain: start with the longest piece, append pieces whose end touches the chain's end (either way round)
  const len = (p) => p.reduce((t, q, i) => t + (i ? Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  segs.sort((x, y) => len(y.pts) - len(x.pts));
  let chain = segs.shift().pts.slice(), half = 3.5, grew = true;
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 3;
  while (grew) {
    grew = false;
    for (let i = 0; i < segs.length; i++) {
      const q = segs[i].pts;
      if (near(chain.at(-1), q[0])) chain.push(...q.slice(1));
      else if (near(chain.at(-1), q.at(-1))) chain.push(...q.slice(0, -1).reverse());
      else if (near(chain[0], q.at(-1))) chain.unshift(...q.slice(0, -1));
      else if (near(chain[0], q[0])) chain.unshift(...q.slice(1).reverse());
      else continue;
      half = Math.max(half, segs[i].half); segs.splice(i, 1); grew = true; break;
    }
  }
  // the shops' side: the side most shop fronts of this street are on
  const P = docs.flatMap((d) => d.pois).filter((p) => p.face && SITE.street.test(p.face.street || ""));
  let vote = 0;
  for (const p of P) {
    let best = null;
    for (let i = 1; i < chain.length; i++) { const [ax, az] = chain[i - 1], [bx, bz] = chain[i]; const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(p.face.x - mx, p.face.z - mz); if (!best || d < best.d) best = { d, ax, az, bx, bz }; }
    if (best) vote += Math.sign((best.bx - best.ax) * (p.face.z - best.az) - (best.bz - best.az) * (p.face.x - best.ax));
  }
  const shopSide = vote >= 0 ? 1 : -1;                 // + = left of the chain's direction (x right, z toward the viewer)
  const off = kind === "drive" ? -shopSide * 1.7 : shopSide * (half + 1.6), eye = kind === "drive" ? 1.25 : 1.65;
  const pts = [];
  for (let i = 0; i < chain.length; i++) {
    const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;          // left normal
    const x = chain[i][0] + nx * off, z = chain[i][1] + nz * off;
    if (pts.length && Math.hypot(pts.at(-1).x - x, pts.at(-1).z - z) < 2) continue;
    pts.push(new THREE.Vector3(x, groundAt(x, z) + eye + (kind === "drive" ? 0 : 0.13), z));
  }
  if (pts.length < 2) return null;
  const c = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  c.userData = { shopSide };
  return c;
}
const paths = { walk: streetPath("walk"), drive: streetPath("drive") };
let ride = null;                            // { curve, t, speed }
function startRide(kind) {
  const c = paths[kind]; if (!c) return;
  ride = { curve: c, u: 0, speed: kind === "drive" ? 8.3 : 1.4, len: c.getLength(), kind };   // 30 km/h, 5 km/h
  controls.enabled = false;
}
/** put the ride at a fraction u of its path (frame strips) */
function rideAt(kind, u) { startRide(kind); if (ride) { ride.u = u; rideStep(0); } }
function rideStep(dt) {
  if (!ride) return;
  ride.u += (ride.speed * dt) / ride.len;
  if (ride.u >= 1) { ride = null; controls.enabled = true; return; }
  const p = ride.curve.getPointAt(ride.u), q = ride.curve.getPointAt(Math.min(1, ride.u + 0.02));
  camera.position.copy(p);
  // look ahead, turned ~35 deg toward the shops
  const fwd = q.clone().sub(p).setY(0).normalize();
  const left = new THREE.Vector3(-fwd.z, 0, fwd.x);   // the same side convention as streetPath (its "left normal")
  const look = p.clone().addScaledVector(fwd, 10).addScaledVector(left, ride.curve.userData.shopSide * (ride.kind === "drive" ? 5 : 2.5));
  look.y = p.y + 0.6;
  camera.lookAt(look); controls.target.copy(look);
}

// ------------------------------------------------------------------------------------------------ panel
const S = {
  site, time: preset, hour: lighting.hour, night: preset === "night" ? 1 : preset === "twilight" ? 0.7 : 0,
  layer: true, text: true, props: true, shadows: true, post: true,
  textNear: streetUniforms.textNear.value, textFar: streetUniforms.textFar.value, footNear: streetUniforms.footNear.value, footFar: streetUniforms.footFar.value,
  stats: "", bench: "—", flicker: "—", namesOn: false,
};
streetUniforms.night.value = S.night;
const ui = new Panel({ title: "Street Life Lab" });
const fs = ui.addFolder("Site & view");
fs.add(S, "site", Object.keys(SITES)).name("site (reloads)").onChange((v) => { location.search = `?site=${v}&time=${S.time}`; });
fs.add({ go: () => goHome() }, "go").name("back to the start view");
fs.add({ go: () => startRide("walk") }, "go").name("walk past the shops (5 km/h)");
fs.add({ go: () => startRide("drive") }, "go").name("drive past (30 km/h)");
fs.add(S, "namesOn").name("names check (every text vs the data)").onChange((v) => { $names.style.display = v ? "block" : "none"; });
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; S.night = v === "night" ? 1 : v === "twilight" ? 0.7 : 0; streetUniforms.night.value = S.night; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "night", 0, 1, 0.01).name("signs lit (night)").onChange((v) => { streetUniforms.night.value = v; }).listen();
fl.add(S, "post").name("post effects");
const fl2 = ui.addFolder("Street life");
fl2.add(S, "layer").name("layer on").onChange((v) => { SL.group.visible = v; });
fl2.add(S, "text").name("text on").onChange((v) => { streetUniforms.showText.value = v ? 1 : 0; });
fl2.add(S, "props").name("props (kits) on").onChange((v) => { for (const m of SL.meshes) if (/lod\d/.test(m.name)) m.userData.hidden = !v; });
fl2.add(S, "shadows").name("street-life shadows").onChange((v) => { for (const m of SL.meshes) m.castShadow = v && !/window|glass|cross/.test(m.name); });
fl2.add(S, "textNear", 10, 150, 1).name("text full until (m)").onChange((v) => { streetUniforms.textNear.value = v; });
fl2.add(S, "textFar", 12, 200, 1).name("text gone at (m)").onChange((v) => { streetUniforms.textFar.value = v; });
fl2.add(S, "footNear", 1, 16, 0.1).name("ink fade from (texels/px)").onChange((v) => { streetUniforms.footNear.value = v; });
fl2.add(S, "footFar", 2, 24, 0.1).name("ink gone at (texels/px)").onChange((v) => { streetUniforms.footFar.value = v; });
const fp = ui.addFolder("Performance & tests");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("GPU A/B: layer on / off (alternating)");
fp.add(S, "bench").name("result");
fp.add({ go: () => flicker("strafe") }, "go").name("flicker test: strafe");
fp.add({ go: () => flicker("dolly") }, "go").name("flicker test: dolly");
fp.add(S, "flicker").name("result");

/** look at a POI's front from the street: d m out, s m to the side, at eye height */
function viewPoi(name, d = 10, s = 5, eye = 1.65) {
  const p = docs.flatMap((x) => [...x.pois, ...x.fuel]).find((q) => q.name === name || q.brand === name);
  if (!p) return false;
  ride = null; controls.enabled = true;
  const f = p.face || { x: p.cx, z: p.cz, nx: p.nx, nz: p.nz, y: p.y };
  const x = f.x + f.nx * d + f.nz * s, z = f.z + f.nz * d - f.nx * s;
  camera.position.set(x, groundAt(x, z) + eye, z); controls.target.set(f.x, f.y + 2.4, f.z); controls.update();
  return true;
}
function goHome() { viewPoi(SITE.home); }

// the names check: every text the layer shows, from the data (the worker reports them per tile)
function namesHTML() {
  const all = { names: new Set(), fuel: new Set(), stops: new Set(), plates: new Set(), numbers: 0 };
  for (const s of tileStats) { for (const n of s.used.names) all.names.add(n); for (const n of s.used.fuel) all.fuel.add(n); for (const n of s.used.stops) all.stops.add(n); for (const n of s.used.plates) all.plates.add(n); all.numbers += s.used.numbers.length; }
  const dataNames = new Set(docs.flatMap((d) => [...d.pois.map((p) => p.name), ...d.fuel.map((p) => p.name || p.brand)]).filter(Boolean));
  const notInData = [...all.names, ...all.fuel].filter((n) => !dataNames.has(n));
  const li = (set) => [...set].sort((a, b) => a.localeCompare(b, "fr")).map((n) => `<li>${n.replace(/</g, "&lt;")}</li>`).join("");
  return `<h3>Check: ${notInData.length ? `<span style="color:#ff8a80">${notInData.length} text(s) NOT in the data: ${notInData.join(", ")}</span>` : "every shop / fuel name shown is in the data (OSM name or brand)"}</h3>
<h3>Shops, cafés, banks, pharmacies (${all.names.size}, OSM name)</h3><ul>${li(all.names)}</ul>
<h3>Fuel (${all.fuel.size}, OSM name / brand)</h3><ul>${li(all.fuel)}</ul>
<h3>STIB stops (${all.stops.size}, Brussels Mobility WFS)</h3><ul>${li(all.stops)}</ul>
<h3>Street plates (${all.plates.size} streets, OSM "FR - NL" names)</h3><ul>${li(all.plates)}</ul>
<h3>House numbers: ${all.numbers} (UrbIS AddressNumbers)</h3>
<h3>Skipped by the build</h3><ul>${tileStats.map((s) => `<li>${s.tile}: ${Object.entries(s.skipped).map(([k, v]) => `${v} ${k}`).join("; ") || "none"}</li>`).join("")}</ul>`;
}
$names.innerHTML = namesHTML();

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goHome();
if (qp.get("cam")) { const c = qp.get("cam").split(",").map(Number); camera.position.set(c[0], c[1], c[2]); if (c.length >= 6) controls.target.set(c[3], c[4], c[5]); }

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 900) gpu.samples.shift(); } })
    .catch(() => {}).finally(() => { gpu.pending = false; });
}
const cpu = { samples: [] };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
let freeze = false;
/** GPU A/B: alternating rounds (on, off, on, off, ...) of `secs` each; median GPU ms per round, then the median of the
 *  per-pair differences. The machine is shared (another GPU project runs): numbers are noisy, read the spread. */
async function bench(rounds = 4, secs = 2.5) {
  const res = { on: [], off: [], cpuOn: [], cpuOff: [] };
  for (let r = 0; r < rounds * 2; r++) {
    const on = r % 2 === 0;
    SL.group.visible = on;
    await new Promise((k) => setTimeout(k, 500));
    gpu.samples.length = 0; cpu.samples.length = 0;
    await new Promise((k) => setTimeout(k, secs * 1000));
    res[on ? "on" : "off"].push(median(gpu.samples)); res[on ? "cpuOn" : "cpuOff"].push(median(cpu.samples));
  }
  SL.group.visible = S.layer;
  const diffs = res.on.map((v, i) => v - res.off[i]);
  S.bench = `+${median(diffs).toFixed(3)} ms GPU (pairs ${diffs.map((d) => d.toFixed(2)).join(" ")}), on ${median(res.on).toFixed(2)} / off ${median(res.off).toFixed(2)}; update() CPU ${median(res.cpuOn).toFixed(3)} ms`;
  console.log("[streetlife lab] bench", res, S.bench);
  return { ...res, diffs, summary: S.bench };
}
async function flicker(move = "strafe", frames = 24, step = 0.0006) {
  freeze = true;
  const r = await flickerTest({ renderFrame: () => { lodEye.value.copy(camera.position); SL.update(camera); if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera); }, canvas: renderer.domElement, camera, controls, frames, move, step });
  freeze = false;
  S.flicker = `${move}: ${r.blink} px blinking (${r.ppm} ppm)`;
  showHeat(r);
  return r;
}
/** the atlas upload cost: render time of the frame right after a tile's labels were added (the GPU upload + mips
 *  happen in that render call), minus a normal frame's; repeated for the A/B (?atlas=full = whole-atlas re-upload) */
let uploadNote = "";
async function measureUpload(tile = "J6", rounds = 3) {
  const res = [];
  for (let k = 0; k < rounds; k++) {
    SL.removeTile(tile);
    await new Promise((r) => setTimeout(r, 400));
    const normal = [];
    for (let i = 0; i < 20; i++) { const t = performance.now(); renderOnce(); normal.push(performance.now() - t); await new Promise((r) => requestAnimationFrame(r)); }
    await SL.addTile(tile);
    const t = performance.now(); renderOnce(); const first = performance.now() - t;
    res.push({ first: +first.toFixed(2), normal: +median(normal).toFixed(2), bytes: SL.atlas.uploads.at(-1).bytes });
  }
  uploadNote = ` · atlas upload ${qp.get("atlas") === "full" ? "FULL" : "per page"}: first frame +${median(res.map((r) => r.first - r.normal)).toFixed(1)} ms CPU (${(res[0].bytes / 1048576).toFixed(0)} MB)`;
  console.log("[streetlife lab] upload", res, uploadNote);
  return { res, note: uploadNote };
}
let renderOnce = () => {};
window.lab = { measureUpload, renderOnce: () => renderOnce(), viewPoi, rideAt, renderer, scene, camera, controls, SL, streetUniforms, lighting, bench, flicker, startRide, goHome, gpu, S, tileStats, paths, docs, cityMs };

renderOnce = () => { lodEye.value.copy(camera.position); SL.update(camera); if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera); };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  if (freeze) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (ride) rideStep(dt); else controls.update();
  lodEye.value.copy(camera.position);
  const tc = performance.now();
  SL.update(camera);
  for (const m of SL.meshes) if (m.userData.hidden) m.visible = false;
  cpu.samples.push(performance.now() - tc); if (cpu.samples.length > 900) cpu.samples.shift();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, 140);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 15 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws`;
    const ts = tileStats.map((s) => `${s.tile}: worker ${s.worker.total} ms (layout ${s.worker.layout}, sdf ${s.worker.sdf}), main ${s.mainMs} ms; ${s.boxes} boxes, ${s.windows} windows, ${Object.entries(s.props).map(([k, v]) => `${v} ${k}`).join(" ")}; ${s.labels} labels`).join("\n");
    $info.textContent = `${backend} · ${S.stats} · street life: ${SL.visibleMeshes}/${SL.meshes.length} meshes drawn, ${(SL.triangles / 1000).toFixed(0)}k tris\n` +
      `${SITE.label} · city tiles ${cityMs.toFixed(0)} ms · kits ${SL.kitMs.toFixed(0)} ms · atlas ${SL.atlas.pages - SL.atlas.free.length}/${SL.atlas.pages} pages of ${SL.atlas.W}² (${SL.atlas.full} labels did not fit)${uploadNote}\n${ts}\n` +
      `GPU A/B: ${S.bench}\nflicker: ${S.flicker}\ncam ${camera.position.toArray().map((v) => v.toFixed(1)).join(",")},${controls.target.toArray().map((v) => v.toFixed(1)).join(",")}`;
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
