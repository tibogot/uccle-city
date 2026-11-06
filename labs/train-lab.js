// THE TRAIN LAB: the railway of Uccle at its real places, before it goes into the city (?trains=1).
//   - the real ground: the tiles' 1 m LiDAR DTM (terrain.u16) draped with their orthophoto, in a 640 m window
//     round the chosen site, carved under the ballast exactly as the city does (viewer/rail/railway.js carveTerrain)
//   - the track system of the city (railway.js railTile): ballast, rails, sleepers, catenary, platforms, road decks
//   - the hero bridges (tools/blender/railBridge.py, viewer/rail/bridgeModel.js) with their LODs
//   - the SNCB trains (tools/blender/am08.py, viewer/rail/trainModel.js) on the REAL timetable (pipeline/build_trains.py:
//     SNCB GTFS), viewer/rail/trains.js, the same runner as the city
// The reference photos' viewpoints with the photo overlaid (data/raw/refs/trains/, never shipped), GPU benchmarks,
// a frame-sequence recorder for the smoothness checks (window.lab.seq).
import * as THREE from "three/webgpu";
import { texture, uv, vec2, vec3, mix, float, smoothstep, positionWorld } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { lodEye, withObjectFade } from "../viewer/lodFade.js";
import { loadRail, railTile, carveTerrain, railMaterials } from "../viewer/rail/railway.js";
import { loadBridge, placeBridge, BRIDGES, BRIDGE_LODS } from "../viewer/rail/bridgeModel.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $photo = document.getElementById("photo"), $notes = document.getElementById("notes");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ sites
const SITES = {
  "Saint-Job bridge (L26 over Chaussée de Saint-Job)": { c: [417, 791], bridge: "stjob", cam: [455, 66, 845], tgt: [417, 64, 791] },
  "Calevoet viaduct (L124)": { c: [-1125, 1123], bridge: "calevoet", cam: [-1060, 48, 1140], tgt: [-1125, 46, 1123] },
  "Saint-Job station (L26)": { c: [830, 565], cam: [870, 78, 600], tgt: [830, 72, 565] },
  "Uccle-Calevoet station (L124)": { c: [-1234, 795], cam: [-1190, 58, 830], tgt: [-1234, 52, 795] },
  "Uccle-Stalle station (L124)": { c: [-1806, -368], cam: [-1760, 52, -330], tgt: [-1806, 46, -368] },
  "Moensberg (L124 over L26)": { c: [-1117, 2165], cam: [-1070, 75, 2210], tgt: [-1117, 66, 2165] },
};
const siteName = Object.keys(SITES).find((k) => SITES[k].bridge === qp.get("site") || k === qp.get("site")) || Object.keys(SITES)[0];
const WIN = 320;
const man = await fetch("../data/tiles/manifest.json").then((r) => r.json());
const rail = await loadRail(new URL("../data/rail/rail.json", import.meta.url));
const site = { group: new THREE.Group(), tiles: [], hm: [], parts: [] };
scene.add(site.group);
/** ground height at (x, z) from the loaded tiles (after carving: the drawn surface) */
function groundAt(x, z) {
  for (const t of site.hm) {
    const { x0, z0, cols, rows, step } = t.hdr;
    const c = (x - x0) / step, r = (z - z0) / step;
    if (c < 0 || r < 0 || c > cols - 1 || r > rows - 1) continue;
    const c0 = Math.min(Math.floor(c), cols - 2), r0 = Math.min(Math.floor(r), rows - 2), fc = c - c0, fr = r - r0, P = t.pos;
    const y = (i) => P[i * 3 + 1];
    const i = r0 * cols + c0;
    return (y(i) * (1 - fc) + y(i + 1) * fc) * (1 - fr) + (y(i + cols) * (1 - fc) + y(i + cols + 1) * fc) * fr;
  }
  return 0;
}
async function loadSite(name) {
  const s = SITES[name];
  for (const p of site.parts) p.dispose?.();
  site.parts.length = 0; site.hm.length = 0;
  site.group.clear();
  const [cx, cz] = s.c;
  const box = { x0: cx - WIN, x1: cx + WIN, z0: cz - WIN, z1: cz + WIN };
  let carved = 0, tris = 0;
  for (const t of man.tiles) {
    const [tx0, tx1] = t.bounds.x, [tz0, tz1] = t.bounds.z;
    if (tx1 <= box.x0 || tx0 >= box.x1 || tz1 <= box.z0 || tz0 >= box.z1 || t.status !== "built") continue;
    const [hdr, buf] = await Promise.all([fetch(`../data/tiles/${t.name}/terrain.json`).then((r) => r.json()), fetch(`../data/tiles/${t.name}/terrain.u16`).then((r) => r.arrayBuffer())]);
    const raw = new Uint16Array(buf);
    // the window part of the tile, 1 m grid
    const c0 = Math.max(0, Math.floor(box.x0 - hdr.x0)), c1 = Math.min(hdr.cols - 1, Math.ceil(box.x1 - hdr.x0));
    const r0 = Math.max(0, Math.floor(box.z0 - hdr.z0)), r1 = Math.min(hdr.rows - 1, Math.ceil(box.z1 - hdr.z0));
    const cols = c1 - c0 + 1, rows = r1 - r0 + 1;
    const pos = new Float32Array(cols * rows * 3), uvs = new Float32Array(cols * rows * 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c, v = raw[(r + r0) * hdr.cols + (c + c0)];
      pos[k * 3] = hdr.x0 + (c + c0); pos[k * 3 + 1] = v === hdr.nodata ? 50 : v / 100; pos[k * 3 + 2] = hdr.z0 + (r + r0);
      uvs[k * 2] = (c + c0) / (hdr.cols - 1); uvs[k * 2 + 1] = 1 - (r + r0) / (hdr.rows - 1);
    }
    const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
    let o = 0;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c, b = a + cols; idx.set([a, b, a + 1, a + 1, b, b + 1], o); o += 6; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    const lh = { x0: hdr.x0 + c0, z0: hdr.z0 + r0, cols, rows, step: 1 };
    if (S.carve) carved += carveTerrain(rail, g, lh, { x0: lh.x0, x1: lh.x0 + cols - 1, z0: lh.z0, z1: lh.z0 + rows - 1 });
    g.computeVertexNormals();
    const tex = await new THREE.TextureLoader().loadAsync(`../data/tiles/${t.name}/ortho.jpg`).catch(() => null);
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; m.colorNode = texture(tex, uv()).rgb.mul(0.85); } else m.color.set(0x5d6e45);
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.name = `terrain-${t.name}`;
    site.group.add(mesh);
    site.hm.push({ hdr: lh, pos });
    tris += idx.length / 3;
    // the railway of the tile's window
    const rt = railTile(rail, { x0: Math.max(tx0, box.x0), x1: Math.min(tx1, box.x1), z0: Math.max(tz0, box.z0), z1: Math.min(tz1, box.z1) });
    site.group.add(rt.group); site.parts.push(rt);
    site.tiles.push({ name: t.name, stats: rt.stats });
  }
  // bridges in the window
  site.bridges = [];
  for (const name of BRIDGES) {
    const b = await loadBridge(name).catch((e) => { console.warn(name, e); return null; });
    if (!b) continue;
    const p = b.placement.position;
    if (p.x < box.x0 || p.x > box.x1 || p.z < box.z0 || p.z > box.z1) continue;
    const pb = placeBridge(b, { smooth: true, objectFade: withObjectFade });
    site.group.add(pb.group); site.bridges.push({ b, pb });
  }
  camera.position.set(...s.cam); controls.target.set(...s.tgt);
  site.name = name; site.carved = carved; site.terrainTris = tris;
  updateNotes();
}

// ------------------------------------------------------------------------------------------------ photo views
// bridge frame (Blender: X along the track, Y left, Z up from the road) -> city: the bridge's placement
function bridgeToWorld(b, X, Y, Z) {
  const th = -b.placement.rotationY, c = Math.cos(th), s = Math.sin(th), mz = -Y;
  const p = b.placement.position;
  return new THREE.Vector3(p.x + X * c - mz * s, p.y + Z, p.z + X * s + mz * c);
}
const PHOTOS = {
  "orbit (free)": null,
  "St-Job bridge, from the rain garden (Stratoswift 2023)": { bridge: "stjob", file: "stjob_bridge_2.jpg", cam: [0.0, 30.0, 1.6], look: [0.0, 0.0, 5.2], fov: 62 },
  "St-Job bridge, from the Kauwberg side (Stratoswift 2023)": { bridge: "stjob", file: "stjob_bridge_kauwberg.jpg", cam: [-6.0, -24.0, 0.8], look: [-6.0, 0.0, 5.0], fov: 64 },
  "St-Job bridge, along the road (Stratoswift 2021)": { bridge: "stjob", file: "stjob_bridge_1.jpg", cam: [30.0, 18.0, 1.5], look: [-2.0, 0.0, 5.0], fov: 56 },
  "St-Job bridge, the scroll (detail)": { bridge: "stjob", file: "stjob_bridge_detail.jpg", cam: [8.5, 9.5, 1.6], look: [8.5, 4.35, 2.6], fov: 50 },
  "Calevoet viaduct, evening (Stratoswift 2017)": { bridge: "calevoet", file: "calevoet_viaduct.jpg", cam: [0.0, 42.0, 1.4], look: [0.0, 0.0, 8.0], fov: 55 },
};
async function goView(name) {
  S.view = name;
  const v = PHOTOS[name];
  if (!v) { $photo.removeAttribute("src"); $photo.style.opacity = 0; fitFrame(); return; }
  const want = Object.keys(SITES).find((k) => SITES[k].bridge === v.bridge);
  if (site.name !== want) { S.site = want; await loadSite(want); }
  const b = site.bridges.find((q) => q.b.name === v.bridge)?.b;
  if (!b) return;
  const c = bridgeToWorld(b, v.cam[0], v.cam[1], 0);
  c.y = groundAt(c.x, c.z) + v.cam[2];
  camera.position.copy(c);
  controls.target.copy(bridgeToWorld(b, ...v.look));
  camera.fov = v.fov; camera.updateProjectionMatrix();
  $photo.onload = () => { $photo.style.opacity = S.photo; fitFrame(); };
  $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
  $photo.src = `../data/raw/refs/trains/${v.file}`;
  ui?.controllersRecursive().forEach((k) => k.updateDisplay());
}
function fitFrame() {
  const c = renderer.domElement;
  let w = innerWidth, h = innerHeight;
  if (S.frame && $photo.getAttribute("src") && $photo.naturalWidth) {
    const a = $photo.naturalWidth / $photo.naturalHeight;
    if (w / h > a) w = Math.round(h * a); else h = Math.round(w / a);
  }
  renderer.setSize(w, h);
  Object.assign(c.style, { position: "fixed", left: `${(innerWidth - w) / 2}px`, top: `${(innerHeight - h) / 2}px` });
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener("resize", fitFrame);

// ------------------------------------------------------------------------------------------------ panel
const S = {
  site: siteName, view: "orbit (free)", photo: 0, frame: true, notes: false, carve: true,
  ballast: true, sleepers: true, rails: true, catenary: true, platforms: true, bridges: true, bridgeLod: "auto",
  time: preset, hour: lighting.hour, post: true, stats: "", bench: "—",
};
const ui = new Panel({ title: "Train Lab" });
ui.add(S, "site", Object.keys(SITES)).onChange((v) => loadSite(v));
ui.add(S, "view", Object.keys(PHOTOS)).name("photo viewpoint").onChange((v) => goView(v));
ui.add(S, "photo", 0, 1, 0.01).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
ui.add(S, "frame").name("frame = photo's aspect").onChange(fitFrame);
ui.add(S, "notes").name("notes (sources, counts)").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fv = ui.addFolder("Show");
const vis = () => site.group.traverse((o) => {
  if (o.name === "rail-ballast") o.visible = S.ballast; if (o.name === "rail-sleepers") o.visible = S.sleepers; if (o.name === "rail-rails") o.visible = S.rails;
  if (o.name === "rail-masts" || o.name === "rail-wires") o.visible = S.catenary; if (o.name === "rail-platforms" || o.name === "rail-shelters") o.visible = S.platforms;
  if (o.name.startsWith("bridge-") && !o.name.includes("-lod")) o.visible = S.bridges;
});
for (const k of ["ballast", "sleepers", "rails", "catenary", "platforms", "bridges"]) fv.add(S, k).onChange(vis);
fv.add(S, "carve").name("carve the terrain (reload)").onChange(() => loadSite(S.site));
fv.add(S, "bridgeLod", ["auto", "LOD0", "LOD1", "LOD2"]).name("bridge LOD");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("benchmark: railway on / off (GPU ms)");
fp.add(S, "bench").name("result").listen();

await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
await loadSite(siteName);
fitFrame();

if (qp.get("view")) await goView(Object.keys(PHOTOS).find((k) => k.startsWith(qp.get("view"))) || "orbit (free)");

function updateNotes() {
  const st = site.tiles.map((t) => `${t.name}: ${t.stats.km} km, ${t.stats.sleepers} sleepers, ${t.stats.masts} masts, ${t.stats.tris.toLocaleString()} tris`).join("<br>");
  const br = (site.bridges || []).map(({ b }) => `<li><b>${b.name}</b> (UrbIS ${b.info.urbis}, ${b.info.line} over ${b.info.road}): LODs ${b.lods.map((l) => Math.round(l.tris).toLocaleString()).join(" / ")} triangles; deck ${b.info.deck.length} x ${b.info.deck.width} m, rail ${b.info.deck.railTop} m above the road; ${b.info.estimated}</li>`).join("");
  $notes.innerHTML = `<h3>Site</h3><p>${site.name}; terrain ${site.terrainTris?.toLocaleString()} tris, ${site.carved} vertices carved under the ballast</p>
<h3>Track per tile window</h3><p>${st}</p><h3>Bridges</h3><ul>${br || "<li>none here</li>"}</ul>
<h3>Data</h3><p>${rail.source}</p>`;
}

// ------------------------------------------------------------------------------------------------ GPU timing, benchmark
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 900) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
/** A/B: everything railway (tracks, bridges, trains) on / off, `rounds` alternations, medians of 2 s each */
async function bench(rounds = 4) {
  const rw = []; site.group.traverse((o) => { if (o.name === "railway" || o.name.startsWith("bridge-") || o.name.startsWith("trains")) rw.push(o); });
  const extra = window.lab.trainsGroup ? [window.lab.trainsGroup] : [];
  const res = [];
  for (let r = 0; r < rounds; r++) for (const on of [true, false]) {
    for (const o of [...rw, ...extra]) o.visible = on;
    await new Promise((q) => setTimeout(q, 600)); gpu.samples.length = 0;
    await new Promise((q) => setTimeout(q, 2000));
    res.push({ on, ms: median(gpu.samples), draws: renderer.info.render.drawCalls ?? renderer.info.render.calls, tris: renderer.info.render.triangles });
  }
  for (const o of [...rw, ...extra]) o.visible = true; vis();
  const ons = res.filter((q) => q.on).map((q) => q.ms), offs = res.filter((q) => !q.on).map((q) => q.ms);
  S.bench = `on ${median(ons).toFixed(2)} / off ${median(offs).toFixed(2)} ms (+${(median(ons) - median(offs)).toFixed(2)}), draws +${res[0].draws - res[1].draws}`;
  console.log("[train lab] bench", res);
  return res;
}

// ------------------------------------------------------------------------------------------------ loop
const hooks = [];           // per-frame (camPos, dt) -> trains plug in here
window.lab = { renderer, scene, camera, controls, lighting, rail, site, loadSite, goView, fitFrame, bench, gpu, S, PHOTOS, SITES, groundAt, hooks, bridgeToWorld, median };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
window.lab.step = null;     // a fixed dt for frame sequences (seconds), null = real time
renderer.setAnimationLoop(() => {
  const now = performance.now(); let dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (window.lab.step != null) dt = window.lab.step;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  lodEye.value.copy(camera.position);
  for (const { pb } of site.bridges || []) {
    if (S.bridgeLod === "auto") pb.update(camera.position);
    else { const k = +S.bridgeLod.slice(3); pb.levels.forEach((g, i) => { g.visible = i === k; g.traverse((o) => { o.userData.fade = 0; }); }); }
  }
  for (const h of hooks) h(camera.position, dt, camera);
  lighting.update(camera.position.y, 0, controls.target, 160);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${site.name}${window.lab.trainInfo ? "\n" + window.lab.trainInfo() : ""}\nbenchmark: ${S.bench}`;
  }
});

// the trains on the real timetable (the city's runner); the lab's clock can jump to a time / run faster
const { createTrains } = await import("../viewer/rail/trains.js");
const { trainLook, LIVERIES, TRAIN_LODS } = await import("../viewer/rail/trainModel.js");
const trains = await createTrains({ rail, parent: scene });
window.lab.trains = trains; window.lab.trainsGroup = trains.group;
hooks.push((camPos, dt, cam) => trains.update(camPos, cam));
window.lab.trainInfo = () => trains.info();
const ft = ui.addFolder("Trains");
const T = { clock: trains.clockSecs / 3600, speed: 1, lod: "auto", livery: "sncb", follow: false, next: () => nextTrain() };
ft.add(T, "clock", 0, 24, 0.001).name("clock (h)").onChange((v) => trains.setClock(v * 3600));
ft.add(T, "speed", 0, 30, 0.5).name("time scale").onChange((v) => trains.setTimescale(v));
ft.add(T, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("train LOD").onChange((v) => { trains.fleet.forceLod = v === "auto" ? -1 : +v.slice(3); });
ft.add(T, "livery", Object.keys(LIVERIES)).onChange((v) => trainLook.setLivery(v));
ft.add(T, "next").name("jump to the next train past this site");
/** set the clock 40 s before the next train passes the site's centre (from the timetable) */
function nextTrain() {
  const [cx, cz] = SITES[site.name].c;
  const now = trains.clockSecs;
  let best = null;
  for (const t of trains.trips) {
    const R = trains.routes[t.route];
    // distance along the route nearest the site
    let sBest = 0, dBest = Infinity;
    for (let s = 0; s < R.len; s += 10) { const a = R.at(s); const d = Math.hypot(a[0] - cx, a[2] - cz); if (d < dBest) { dBest = d; sBest = s; } }
    if (dBest > 150) continue;
    for (let k = 0; k < t.stops.length - 1; k++) {
      const [d0, , dep0] = t.stops[k], [d1, arr1] = t.stops[k + 1];
      if (sBest >= d0 && sBest <= d1) { const tPass = dep0 + (arr1 - dep0) * (sBest - d0) / Math.max(1, d1 - d0); if (tPass > now + 5 && (!best || tPass < best.t)) best = { t: tPass, trip: t }; }
    }
  }
  if (best) { trains.setClock(best.t - 40); T.clock = (best.t - 40) / 3600; console.log("[train lab] next", best.trip.line, best.trip.id, best.trip.head); }
  return best && { line: best.trip.line, id: best.trip.id, head: best.trip.head, at: best.t };
}
window.lab.nextTrain = nextTrain;
