// THE CHATEAU LAB: the scripted Château de Wolvendael (tools/blender/wolvendael_chateau.py -> models/wolvendael_chateau/,
// loaded by viewer/wolvendaelModel.js: the loader, LODs and slot materials the city uses) and ITS POND (viewer/water/:
// the bed carved in the ground, the calm water with its planar reflection, reeds, lilies) at their real place, on the
// real ground (tile F4's UrbIS DTM 1 m, the same grid the city carves, + the 25 cm orthophoto), with the UrbIS
// neighbours within 130 m, under the city's lighting and post chain. Built like labs/vanbuuren-lab.js (claude/vanbuuren).
// The photos' SOLVED camera poses (tools/wolvendael_photopose.py -> models/wolvendael_chateau/photo_views.json) with an
// overlay of the photo (data/raw/refs/wolvendael/undist/, git-ignored, never shipped; Commons, credited on screen).
// LOD switch + auto LOD with the city's dithered cross-fades, the material-slot swap, a GPU benchmark (the château per
// LOD, the pond on / off: lab.bench()), the flicker test (lab.flicker()) and moving frame strips (lab.strip()).
// Our own panel (viewer/panelUI.js).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, mix, smoothstep, positionWorld, uv, attribute, float } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { SMOOTH, fadeProxies, fadeVariant } from "../viewer/lodFade.js";
import { precompile } from "../viewer/warmup.js";
import { Heightmap } from "../viewer/heightmap.js";
import { pondBedGrid, carvePonds } from "../viewer/water/pondBed.js";
import { createPond, waterLook } from "../viewer/water/pondWater.js";
import { wolvendaelPond } from "../viewer/wolvendaelCity.js";
import { loadWolvendael, WV_LODS, WV_SLOTS, LIBRARY_NAMES, SLOT_TABLE, wvLook, setLodFades, wvLodState } from "../viewer/wolvendaelModel.js";

const qp = new URLSearchParams(location.search);
const longTasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch { /* no longtask API */ }
const $info = document.getElementById("info"), $photo = document.getElementById("photo"), $notes = document.getElementById("notes"), $credit = document.getElementById("credit");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.2, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);
// the photos' light: 2019-03-24 16:35 CEST-1 (w01-w04): day 83, ~15.9 solar
if (!qp.get("time")) { lighting.day = 83; lighting.hourOverride = 15.9; }

// ------------------------------------------------------------------------------------------------ the building
const t0 = performance.now();
const model = await loadWolvendael().catch((e) => { $info.textContent = "models/wolvendael_chateau/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const root = new THREE.Group();
root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY;
scene.add(root);
const levels = WV_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
root.visible = false;
const centre = model.boundsWorld.getCenter(new THREE.Vector3());
const SITE = await fetch("../models/wolvendael_chateau/site.json").then((r) => r.json());
const FRM = SITE.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
const toCity = (u, w) => [FRM.origin_city[0] + u * RC - w * RS, FRM.origin_city[1] + u * RS + w * RC];

// ------------------------------------------------------------------------------------------------ ground: tile F4's DTM (1 m), the pond carved
const tileHdr = await fetch("../data/tiles/F4/terrain.json").then((r) => r.json());
const hm = new Heightmap(tileHdr, await fetch("../data/tiles/F4/terrain.u16").then((r) => r.arrayBuffer()));
const pondDesc = wolvendaelPond(SITE);
carvePonds(hm, [pondDesc]);
const groundAt = hm.surface;
const focus = new THREE.Vector3((centre.x + pondDesc.ring[0][0]) / 2, 0, (centre.z + pondDesc.ring[0][1]) / 2);
{
  const R = 140, S = 1;
  const g = new THREE.PlaneGeometry(2 * R, 2 * R, 2 * R / S, 2 * R / S).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + focus.x, z = p.getZ(i) + focus.z;
    p.setXYZ(i, x, groundAt(x, z) - 0.02, z);
  }
  g.computeVertexNormals();
  const tl = new THREE.TextureLoader();
  const o = (await tl.loadAsync("../data/raw/ortho/F4.jpg").catch(() => null)) ?? (await tl.loadAsync("../data/tiles/F4/ortho.jpg").catch(() => null));
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  if (o) {
    o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8;
    const u2 = positionWorld.xz.sub(vec3(-500, 0, -500).xz).div(500);
    const col = texture(o, u2.mul(vec3(1, 0, -1).xz).add(vec3(0, 0, 1).xz)).rgb;
    const edge = smoothstep(R - 5, R - 20, positionWorld.xz.sub(vec3(focus.x, 0, focus.z).xz).length());
    m.colorNode = mix(vec3(0.12, 0.14, 0.1), col.mul(0.85), edge);
  } else m.color.set(0x55605a);
  var ground = new THREE.Mesh(g, m); ground.receiveShadow = true; ground.name = "terrain";
  scene.add(ground);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(focus.x, 44, focus.z); farG.receiveShadow = true;
  scene.add(farG);
}

// ------------------------------------------------------------------------------------------------ the pond
const bed = pondBedGrid(pondDesc, hm.ground);
const pond = createPond({ pond: pondDesc, bed, renderer });
scene.add(pond.group);
pond.addReflected(root); pond.addReflected(ground);
if (pond.reeds) pond.addReflected(pond.reeds);
pond.setSuspend(() => { const s = lighting.sun?.shadow; if (!s) return null; const a = s.autoUpdate; s.autoUpdate = false; s.needsUpdate = false; return () => { s.autoUpdate = a; }; });

// ------------------------------------------------------------------------------------------------ UrbIS: the solids it replaces + the neighbours
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis() {
  const meta = await fetch("../data/tiles/F4/buildings.json").then((r) => r.json());
  const bin = await fetch("../data/tiles/F4/buildings.bin").then((r) => r.arrayBuffer());
  const V = new DataView(bin).getUint32(0, true);
  const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
  const own = [], near = [];
  for (const b of meta.buildings) {
    const fp = b.footprint[0];
    const cx = fp.reduce((s, q) => s + q[0], 0) / fp.length, cz = fp.reduce((s, q) => s + q[1], 0) / fp.length;
    const mine = HIDE.has(b.id);
    if (!mine && Math.hypot(cx - centre.x, cz - centre.z) > 130) continue;
    const out = mine ? own : near;
    for (const r of [b.roof, b.walls]) for (let i = r.first; i < r.first + r.count; i++) for (let k = 0; k < 3; k++) {
      const v = idx[i * 3 + k]; out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
  }
  const mk = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
  return { own: mk(own), near: mk(near) };
}
const U = await loadUrbis().catch(() => null);
const urbis = U ? new THREE.Mesh(U.own, new THREE.MeshStandardNodeMaterial({ color: 0x8a7f74, roughness: 0.9 })) : new THREE.Group();
const urbisGhost = U ? new THREE.Mesh(U.own, new THREE.MeshBasicNodeMaterial({ color: 0xff3b30, wireframe: true, transparent: true, opacity: 0.45 })) : new THREE.Group();
const neighbours = U ? new THREE.Mesh(U.near, new THREE.MeshStandardNodeMaterial({ color: 0xb9b6ae, roughness: 0.92 })) : new THREE.Group();
urbis.visible = urbisGhost.visible = false; urbis.castShadow = urbis.receiveShadow = true;
neighbours.castShadow = neighbours.receiveShadow = true;
scene.add(urbis, urbisGhost, neighbours);
pond.addReflected(neighbours);

// ------------------------------------------------------------------------------------------------ views (the photos' solved poses + more)
const PV = await fetch("../models/wolvendael_chateau/photo_views.json").then((r) => r.json()).catch(() => ({}));
const PHOTOS = {};
for (const [name, v] of Object.entries(PV)) PHOTOS[name] = { file: v.file, pos: v.pos, target: v.target, up: v.up, fov: v.fov, credit: v.credit, err: v.mean_err };
Object.assign(PHOTOS, {
  "arches and perron (close-up)": { pos: [9.6, -19.0, 51.2], target: [7.9, -11.4, 53.0], fov: 50 },
  "north-east corner": { pos: [36.0, -26.0, 52.0], target: [12.0, -7.0, 56.0], fov: 45 },
  "dormer and cornice (close-up)": { pos: [16.2, -16.0, 57.5], target: [15.3, -11.0, 58.8], fov: 45 },
  "entrance side (ESTIMATED)": { pos: [12.0, 22.0, 53.0], target: [6.0, -2.7, 55.0], fov: 50 },
  "pond close (reflection)": { pos: [33.0, -58.0, 47.9], target: [10.0, -20.0, 49.0], fov: 55 },
  "roof from the pond side, above": { pos: [20.0, -50.0, 80.0], target: [4.0, -4.0, 58.0], fov: 40 },
  "pond from above": { pos: [40.0, -75.0, 70.0], target: [25.0, -48.0, 46.7], fov: 45 },
  "LOD0 band (95 m)": { pos: [70.0, -80.0, 54.0], target: [4.0, -7.0, 55.0], fov: 35 },
  "far (500 m)": { pos: [380.0, -330.0, 120.0], target: [4.0, -7.0, 55.0], fov: 25 },
});
let pinned = null;
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  const [px, pz] = toCity(v.pos[0], v.pos[1]), [tx, tz] = toCity(v.target[0], v.target[1]);
  camera.position.set(px, Math.max(v.pos[2], groundAt(px, pz) + 0.3), pz);
  controls.target.set(tx, v.target[2], tz); camera.fov = v.fov; camera.updateProjectionMatrix();
  if (v.up) {
    const [ux, uz] = [v.up[0] * RC - v.up[1] * RS, v.up[0] * RS + v.up[1] * RC];
    camera.up.set(ux, v.up[2], uz); camera.lookAt(controls.target); camera.up.set(0, 1, 0);
    pinned = camera.quaternion.clone();
  } else { pinned = null; camera.up.set(0, 1, 0); camera.lookAt(controls.target); }
  if (v.file) {
    $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
    $photo.src = `../data/raw/refs/wolvendael/undist/${v.file}`;
  } else $photo.removeAttribute("src");
  $credit.textContent = v.credit ? `${v.credit} · pose solved, mean reprojection ${v.err} px (tools/wolvendael_photopose.py)` : "";
  $credit.style.display = v.credit ? "block" : "none";
  S.view = name;
  fitFrame();
}
renderer.domElement.addEventListener("pointerdown", () => { pinned = null; });
function fitFrame() {
  const v = PHOTOS[S.view], c = renderer.domElement;
  let w = innerWidth, h = innerHeight;
  if (S.frame && v?.file && $photo.naturalWidth) {
    const a = $photo.naturalWidth / $photo.naturalHeight;
    if (w / h > a) w = Math.round(h * a); else h = Math.round(w / a);
  }
  renderer.setSize(w, h);
  Object.assign(c.style, { position: "fixed", left: `${(innerWidth - w) / 2}px`, top: `${(innerHeight - h) / 2}px` });
  if (S.frame) Object.assign($photo.style, { objectFit: "fill", inset: "auto", left: c.style.left, top: c.style.top, width: `${w}px`, height: `${h}px` });
  else Object.assign($photo.style, { objectFit: "contain", inset: "0", left: "", top: "", width: "100%", height: "100%" });
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------------------------------------ material swap (adapter table)
const SWAPS = {
  "table default (temporary)": (s) => model.libraryMaterial(SLOT_TABLE[s]),
  "debug: UV0 metre grid": () => {
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
    const g = uv(0).fract();
    m.colorNode = mix(vec3(0.85, 0.85, 0.85), vec3(0.9, 0.2, 0.1), smoothstep(0.96, 0.98, g.x.max(g.y)));
    return m;
  },
  "debug: face code (COLOR_0.r)": () => {
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
    const c = attribute("color", "vec4").r.mul(16).floor().div(15);
    m.colorNode = vec3(c, c.mul(7).fract(), c.mul(3).fract());
    return m;
  },
  "debug: AO only (white)": () => new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 1 }),
  "debug: flat grey": () => new THREE.MeshStandardNodeMaterial({ color: 0x9a9a9a, roughness: 0.8 }),
  ...Object.fromEntries(LIBRARY_NAMES.map((o) => [`= ${o}`, () => model.libraryMaterial(o)])),
};

// ------------------------------------------------------------------------------------------------ panel
const firstView = Object.keys(PHOTOS)[0];
const S = {
  lod: "auto", show: "new model", wireframe: false, view: firstView, photo: 0, frame: true, notes: true, neighbours: true, pond: true,
  time: preset, hour: lighting.hourOverride ?? lighting.hour, day: lighting.day, post: true, ao: 1, aoDirect: 0.55, thinFar: 1, relief: 1, weather: 1,
  ripple: 1, distort: 1, refl: 1, slot: "render_white_lime", swap: "table default (temporary)", swapAll: false,
  stats: "", lodInfo: "", pondInfo: "", bench: "—", swapInfo: "—", fadeAlways: false, flicker: "—",
};
const ui = new Panel({ title: "Château Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solid (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "neighbours").name("UrbIS neighbours").onChange((v) => { neighbours.visible = v; });
fm.add(S, "wireframe").onChange((v) => { for (const s of WV_SLOTS) { model.materials[s].wireframe = v; if (SMOOTH) fadeVariant(model.materials[s]).wireframe = v; } });
fm.add(S, "lodInfo").name("LOD now");
const fw = ui.addFolder("Pond");
fw.add(S, "pond").name("pond (water, reeds, lilies)");
fw.add(S, "ripple", 0, 4, 0.05).name("ripples").onChange((v) => { waterLook.ripple.value = v; });
fw.add(S, "distort", 0, 4, 0.05).name("reflection distortion").onChange((v) => { waterLook.distort.value = v; });
fw.add(S, "refl", 0, 1.5, 0.05).name("reflection strength").onChange((v) => { waterLook.reflection.value = v; });
fw.add(S, "pondInfo").name("pond now");
const fs = ui.addFolder("Material slots (adapter table)");
fs.add(S, "slot", WV_SLOTS).name("GLB slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("-> material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
fs.add(S, "swapInfo").name("last swap");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { wvLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { wvLook.aoDirect.value = v; });
fl.add(S, "thinFar", 0, 1, 0.01).name("thin parts far away shade like the wall (anti-sparkle)").onChange((v) => { wvLook.thinFar.value = v; });
fl.add(S, "relief", 0, 2, 0.05).name("render / stone / slate relief").onChange((v) => { wvLook.relief.value = v; });
fl.add(S, "weather", 0, 2, 0.05).name("weathering").onChange((v) => { wvLook.weather.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms (château per LOD, pond on/off) at this view");
fp.add(S, "bench").name("result");
fp.add({ go: async () => { const out = []; for (const move of ["fixed", "strafe", "dolly"]) { const r = await lab.flicker({ move, show: move === "dolly" }); out.push(`${move} ${r.ppm} ppm`); } S.flicker = out.join(" · "); } }, "go").name("flicker test (fixed, strafe, dolly)");
fp.add(S, "flicker").name("blinking pixels").listen();
fp.add(S, "fadeAlways").name("A/B: LOD-fade discard on every material (the old way)");

function applyShow() {
  root.visible = S.show !== "UrbIS solid (city today)";
  urbis.visible = S.show === "UrbIS solid (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}
async function doSwap() {
  const t = performance.now();
  const make = SWAPS[S.swap];
  const slots = S.swapAll ? WV_SLOTS : [S.slot];
  const proxy = new THREE.Group();
  const wrapped = slots.map((s) => {
    const w = model.setSlotMaterial(s, make(s), { dryRun: true }); w.wireframe = S.wireframe;
    const geo = model.lods[0].find((l) => l.slot === s)?.geometry ?? model.lods[0][0].geometry;
    proxy.add(new THREE.Mesh(geo, w));
    if (SMOOTH) { const v = fadeVariant(w); v.wireframe = S.wireframe; proxy.add(new THREE.Mesh(geo, v)); }
    return [s, w];
  });
  proxy.position.copy(root.position); proxy.rotation.copy(root.rotation); scene.add(proxy); proxy.updateMatrixWorld(true);
  await precompile(renderer, [proxy], camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });
  scene.remove(proxy);
  for (const [s, w] of wrapped) model.setSlotMaterial(s, w, { raw: true });
  S.swapInfo = `${S.swapAll ? "ALL" : S.slot} -> ${S.swap.replace("= ", "")} (${(performance.now() - t).toFixed(0)} ms)`;
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// notes
const N = model.notes, LJ = model.lodsJson;
$notes.innerHTML = `
<h3>Reference photos (not shipped; the overlay works where data/raw/refs/wolvendael/undist/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.credit} (pose: ${v.err} px)</li>`).join("")}</ul>
<h3>Measured (UrbIS solids 537523 + 538880, DSM/DTM 2021 0.5 m, CC0; the photos back-projected on the pond front)</h3>
<ul>
<li>frame rotated ${FRM.rotation_deg} deg; cornice ${N.measured.levels_taw.cornice} (= the UrbIS eaves), mansard break ${N.measured.levels_taw.break}, ridges ${N.measured.levels_taw.ridge_A} (main) / ${N.measured.levels_taw.ridge_B} (the SW pavilion)</li>
<li>pond: OSM way 31664019, water at ${pondDesc.level} m TAW (DSM = DTM on the open water), ${bed.waterArea.toFixed(0)} m² of water, its bed carved ${pondDesc.maxDepth} m deep</li>
</ul>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")};
GLB ${((LJ.glbBytes ?? 0) / 1048576).toFixed(2)} MB (meshopt); AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU (${N.lightmap.px}² R8 + mips, ${N.lightmap.lod0_px_per_m} px/m mean); load ${loadMs.toFixed(0)} ms.
Slots: ${WV_SLOTS.join(", ")} (adapter table -> any of the ${LIBRARY_NAMES.length} library names).</p>
<h3>Sources</h3><p>UrbIS (paradigm.brussels) CC0; OSM (ODbL); photos Wikimedia Commons (Donarreiskoffer 2019, CC BY-SA 4.0; Edison McCullen 2026, CC BY 4.0): data/raw/refs/wolvendael/SOURCES.md; models/wolvendael_chateau/NOTES.md (facade by facade). Wave texture: Mr.doob, slop-newyork (MIT), vendor/slop-water/.</p>`;
$notes.style.display = qp.get("notes") === "0" ? "none" : "block";
if (qp.get("notes") === "0") S.notes = false;

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
const skyObj = scene.getObjectByName("FirmamentSkyDome") || lighting.sky?.mesh || lighting.sky;
if (skyObj?.isObject3D) pond.addReflected(skyObj);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const tc0 = performance.now();
const fadeCopies = fadeProxies(root);
if (fadeCopies) { fadeCopies.position.copy(root.position); fadeCopies.rotation.copy(root.rotation); fadeCopies.updateMatrixWorld(true); }
root.visible = true;
await precompile(renderer, fadeCopies ? [scene, fadeCopies] : [scene], camera, scene, { target: pipe.passTarget ?? null, mrt: pipe.passMRT ?? null });
// the reflection pass's pipelines (another target format, no MRT): one render before showing
{ const wc = camera.clone(); const pc = pond.water.geometry.boundingSphere.center; wc.position.set(pc.x + 15, pondDesc.level + 2, pc.z + 20); wc.lookAt(centre); wc.updateMatrixWorld(); pond.refl.render(scene, wc, pondDesc.level, null); }
const compileMs = performance.now() - tc0;
const shownAt = performance.now();
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(qp.get("view") && PHOTOS[qp.get("view")] ? qp.get("view") : firstView);
if (qp.get("photo")) { S.photo = +qp.get("photo"); $photo.style.opacity = S.photo; }

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let forced = null, pondForced = null;
/** GPU ms (median of the whole frame) interleaved over `cycles` cycles of 1.2 s windows: château off / L0 / L1 / L2
 *  with the pond OFF, then the pond off / on with the château as the auto LOD shows it. + = the part's cost. */
async function bench({ cycles = 4, win = 1200 } = {}) {
  const modes = [["off", false], [0, false], [1, false], [2, false], [null, false], [null, true]];
  const acc = modes.map(() => []);
  for (let c = 0; c < cycles; c++) for (let i = 0; i < modes.length; i++) {
    forced = modes[i][0]; pondForced = modes[i][1];
    await new Promise((r) => setTimeout(r, 300));
    gpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, win));
    acc[i].push(...gpu.samples);
  }
  forced = null; pondForced = null;
  const med = acc.map((s) => { s = [...s].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; });
  const off = med[0];
  const res = { view: S.view, none: +off.toFixed(2), L0: +(med[1] - off).toFixed(2), L1: +(med[2] - off).toFixed(2), L2: +(med[3] - off).toFixed(2),
    pondOff: +med[4].toFixed(2), pond: +(med[5] - med[4]).toFixed(2), reflMs: +pond.stats.reflMs.toFixed(2) };
  S.bench = `château L0 +${res.L0} L1 +${res.L1} L2 +${res.L2} · pond +${res.pond} (refl CPU ${res.reflMs} ms) · none ${res.none} ms`;
  console.log("[château lab] bench", JSON.stringify(res));
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
const hitches = [];
const lab = window.lab = { force: (m) => { forced = m; }, forcePond: (v) => { pondForced = v; }, renderer, scene, camera, controls, model, lighting, goView, fitFrame, bench, gpu, S, PHOTOS, levels,
  hitches, doSwap, loadMs, compileMs, shownAt, longTasks, toCity, groundAt, root, urbis, neighbours, pond, bed, waterLook, wvLook, pipe: () => pipe };

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const frame = (dtFixed = null) => {
  const now = performance.now(), dtMs = now - last; last = now;
  const dt = dtFixed ?? Math.min(dtMs / 1000, 0.1);
  if (frames > 30 && dtMs > 34) { hitches.push(Math.round(dtMs)); if (hitches.length > 50) hitches.shift(); }
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (pinned) camera.quaternion.copy(pinned); else controls.update();
  const dist = model.distance(camera.position);
  if (forced === null && S.lod === "auto" && SMOOTH) {
    const { shown, fades } = wvLodState(dist);
    setLodFades(levels, shown, fades);
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? WV_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    setLodFades(levels, levels.map((_, i) => i === k), levels.map(() => 1));
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (S.fadeAlways && SMOOTH) for (const g of levels) if (g.visible) for (const o of g.children) o.material = fadeVariant(o.userData.base);
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  const pondOn = pondForced ?? S.pond;
  pond.group.visible = pondOn;
  camera.updateMatrixWorld();
  if (pondOn) pond.update(camera, scene);
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 50, 420), dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    S.pondInfo = `${pond.stats.onScreen ? "on screen" : "off screen"} · ${pond.stats.d.toFixed(0)} m · reflection ${(pond.stats.refl * 100).toFixed(0)} % (${pond.stats.reflMs.toFixed(2)} ms CPU) · props ${(pond.stats.props * 100).toFixed(0)} %`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${WV_LODS[0].until} m ±${WV_LODS[0].band}, LOD1 < ${WV_LODS[1].until} m ±${WV_LODS[1].band}, to the building's box)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · GLB ${((LJ.glbBytes ?? 0) / 1048576).toFixed(2)} MB · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms, shaders ${compileMs.toFixed(0)} ms (before it shows)` +
      `\npond: ${S.pondInfo}\nlong tasks: ${longTasks.filter(([t]) => t > shownAt).length} after show · benchmark: ${S.bench}`;
  }
};
renderer.setAnimationLoop(() => frame());
lab.renderFrame = () => frame(0);
lab.pause = () => renderer.setAnimationLoop(null);
lab.resume = () => { last = performance.now(); renderer.setAnimationLoop(() => frame()); };
lab.flicker = async (opts = {}) => {
  const { flickerTest, showHeat } = await import("./flickerTest.js");
  lab.pause();
  try {
    const r = await flickerTest({ renderFrame: lab.renderFrame, canvas: renderer.domElement, camera, controls, ...opts });
    if (opts.show !== false) showHeat(r);
    console.log("[château lab] flicker", JSON.stringify({ ...r, heatURL: undefined }));
    return r;
  } finally { lab.resume(); }
};
lab.strip = async (opts = {}) => {
  const { frameStrip, showSheet } = await import("./frameStrip.js");
  lab.pause(); pinned = null;
  try {
    const r = await frameStrip({ renderFrame: (dt) => frame(dt), canvas: renderer.domElement, camera, controls, label: () => `${S.lodInfo} · pond ${(pond.stats.refl * 100).toFixed(0)} %`, ...opts });
    if (opts.show !== false) showSheet(r);
    return { labels: r.labels, width: r.width, height: r.height, url: r.url };
  } finally { lab.resume(); }
};
/** put the camera at (u, w, h) looking at (u, w, h) in the building frame (un-pins a photo view) */
lab.look = (p, t, fov = 40) => {
  pinned = null;
  const [x, z] = toCity(p[0], p[1]), [tx, tz] = toCity(t[0], t[1]);
  camera.position.set(x, p[2], z); controls.target.set(tx, t[2], tz); camera.lookAt(controls.target);
  camera.fov = fov; camera.updateProjectionMatrix(); $photo.removeAttribute("src"); $credit.style.display = "none";
};
/** a camera path in the building frame: from (u, w, h) a to b looking at target (u, w, h) */
lab.pathUWH = (a, b, tgt) => (t) => {
  const u = a[0] + (b[0] - a[0]) * t, w = a[1] + (b[1] - a[1]) * t, h = a[2] + (b[2] - a[2]) * t;
  const [x, z] = toCity(u, w), [tx, tz] = toCity(tgt[0], tgt[1]);
  return { pos: [x, h, z], target: [tx, tgt[2], tz] };
};
addEventListener("resize", fitFrame);
