// THE TOWN HALL LAB: the scripted Uccle town hall (tools/blender/townhall.py -> models/townhall/, loaded by
// viewer/townhallModel.js: the loader, LODs and slot materials the city uses) at its real place, on the real ground
// (UrbIS DTM 0.5 m + orthophoto), under the city's lighting (viewer/lighting.js) and post chain (viewer/post.js).
// LOD switch + auto LOD by distance with the city's dithered cross-fades (lodFade.js), wireframe, the UrbIS solid it
// replaces, the photos' viewpoints with an overlay of the photo (data/raw/refs/townhall/, never shipped; the Commons
// photo is CC BY-SA 3.0, credited on screen), a live material-slot swap through the adapter table (any slot -> any
// library name), stats, long-task record and a GPU benchmark per LOD (labs/townhall-bench.js: the interleaved version
// over the NOTES views; lab.force(mode) pins a LOD or "off"; the A/B toggle puts the old always-on fade back).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, float, mix, smoothstep, positionWorld, select, uv, attribute } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { SMOOTH, fadeProxies, fadeVariant } from "../viewer/lodFade.js";
import { precompile } from "../viewer/warmup.js";
import { loadTownHall, TH_LODS, TH_SLOTS, LIBRARY_NAMES, SLOT_TABLE, TH_TEMP_MATERIALS, thLook, setLodFades } from "../viewer/townhallModel.js";

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
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.3, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the building
const t0 = performance.now();
const model = await loadTownHall().catch((e) => { $info.textContent = "models/townhall/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const root = new THREE.Group();
root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY;
scene.add(root);
const levels = TH_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
root.visible = false;                   // shown once its shaders are built (precompile, below)
const centre = model.boundsWorld.getCenter(new THREE.Vector3());
// building frame (u east, w south; tools/townhall_measure.py) -> city
const FRM = model.notes.measured.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
const toCity = (u, w) => [FRM.origin_city[0] + u * RC - w * RS, FRM.origin_city[1] + u * RS + w * RC];

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto
const site = await fetch("../models/townhall/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/townhall/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = THREE.MathUtils.clamp((x - site.x0) / site.step, 0, site.cols - 1.001), r = THREE.MathUtils.clamp((z - site.z0) / site.step, 0, site.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, H = (i, j) => dtm[j * site.cols + i] / 100 + site.base;
  return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr;
};
{
  const W = (site.cols - 1) * site.step, Hh = (site.rows - 1) * site.step;
  const g = new THREE.PlaneGeometry(W, Hh, (site.cols - 1) / 2, (site.rows - 1) / 2).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + site.x0 + W / 2, z = p.getZ(i) + site.z0 + Hh / 2;
    p.setXYZ(i, x, groundAt(x, z) - 0.03, z);
  }
  g.computeVertexNormals();
  // orthophoto: the 0.25 m source when it is on disk (data/raw/ortho, git-ignored), else the tiles' 1 m version
  const tl = new THREE.TextureLoader();
  const load = async (raw, tile) => (await tl.loadAsync(raw).catch(() => null)) ?? (await tl.loadAsync(tile).catch(() => null));
  const [o3, o4] = await Promise.all([load("../data/raw/ortho/D3.jpg", "../data/tiles/D3/ortho.jpg"), load("../data/raw/ortho/D4.jpg", "../data/tiles/D4/ortho.jpg")]);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  if (o3 && o4) {
    for (const o of [o3, o4]) { o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8; }
    // tiles D3: x -1500..-1000, z -1000..-500; D4: z -500..0 (image row 0 = north = the smaller z)
    const u3 = positionWorld.xz.sub(vec3(-1500, 0, -1000).xz).div(500), u4 = positionWorld.xz.sub(vec3(-1500, 0, -500).xz).div(500);
    const fy = (u) => u.mul(vec3(1, 0, -1).xz).add(vec3(0, 0, 1).xz);
    const col = select(positionWorld.z.lessThan(-500), texture(o3, fy(u3)).rgb, texture(o4, fy(u4)).rgb);
    const edge = smoothstep(108, 95, positionWorld.xz.sub(vec3(centre.x, 0, centre.z).xz).length());
    m.colorNode = mix(vec3(0.12, 0.14, 0.1), col.mul(0.9), edge);
  } else m.color.set(0x55605a);
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true;
  scene.add(ground);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(centre.x, 55, centre.z); farG.receiveShadow = true;
  scene.add(farG);
}

// ------------------------------------------------------------------------------------------------ the UrbIS solid the city draws today
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis() {
  const out = [];
  for (const t of ["D3"]) {
    const meta = await fetch(`../data/tiles/${t}/buildings.json`).then((r) => r.json());
    const bin = await fetch(`../data/tiles/${t}/buildings.bin`).then((r) => r.arrayBuffer());
    const V = new DataView(bin).getUint32(0, true);
    const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
    for (const b of meta.buildings) {
      if (!HIDE.has(b.id)) continue;
      for (const r of [b.roof, b.walls]) for (let i = r.first; i < r.first + r.count; i++) for (let k = 0; k < 3; k++) {
        const v = idx[i * 3 + k]; out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3)); g.computeVertexNormals();
  return g;
}
const urbisGeo = await loadUrbis().catch(() => null);
const urbis = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshStandardNodeMaterial({ color: 0x8a7f74, roughness: 0.9 })) : new THREE.Group();
const urbisGhost = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshBasicNodeMaterial({ color: 0xff3b30, wireframe: true, transparent: true, opacity: 0.45 })) : new THREE.Group();
urbis.visible = urbisGhost.visible = false; urbis.castShadow = urbis.receiveShadow = true;
scene.add(urbis, urbisGhost);

// ------------------------------------------------------------------------------------------------ views (the photos)
// camera and target in the BUILDING frame (u east, w south, height m TAW), estimated from each photo (overlay to check):
// 3557: the facade's 22.7 m (UrbIS) span 1395 px of 2844 -> f = 3690 px at 60 m; the principal point sits at 70 m TAW
// The inventory's 755 x 500 thumbnails are stretched vertically: their windows are 1.33x taller for their width than in
// the full-size Commons photo (GF window 2.2 vs 1.65): shown squeezed back by INV_SY (frame = photo)
const INV_SY = 0.75;
const PHOTOS = {
  "east facade (Commons 3557)": { file: "c_3557.jpg", pos: [72.4, -0.6, 62.6], target: [12.4, 0.0, 70.1], fov: 30.7,
    credit: "Photo: David Edgar, 2008, CC BY-SA 3.0 (Wikimedia Commons, 3557uccleTownHall.jpg)" },
  "east facade, frontal (inventory)": { file: "heritage_P01.jpg", sy: INV_SY, pos: [36.4, 0.8, 62.3], target: [12.4, 0.3, 70.4], fov: 44,
    credit: "Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)" },
  "east facade from the south-east (inventory)": { file: "heritage_P02.jpg", sy: INV_SY, pos: [36.0, 11.0, 62.7], target: [12.4, -1.5, 70.0], fov: 53,
    credit: "Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)" },
  "south-east corner (inventory)": { file: "heritage_P03.jpg", sy: INV_SY, pos: [21.5, 25.0, 61.9], target: [4.5, 7.0, 70.5], fov: 56,
    credit: "Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)" },
  "portico and perron": { pos: [24.0, 6.0, 62.9], target: [12.6, 0.0, 66.2], fov: 50 },
  "west facade (no photo: estimated)": { pos: [-48.0, -8.0, 64.0], target: [-12.0, 0.0, 70.0], fov: 45 },
  "roof from the north-west": { pos: [-42.0, -46.0, 100.0], target: [0.0, 0.0, 72.0], fov: 40 },
  "overview": { pos: [120.0, 140.0, 160.0], target: [0.0, 0.0, 68.0], fov: 40 },
  "far (900 m)": { pos: [700.0, 560.0, 330.0], target: [0.0, 0.0, 68.0], fov: 30 },
};
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  const [px, pz] = toCity(v.pos[0], v.pos[1]), [tx, tz] = toCity(v.target[0], v.target[1]);
  camera.position.set(px, Math.max(v.pos[2], groundAt(px, pz) + 1.5), pz);
  controls.target.set(tx, v.target[2], tz); camera.fov = v.fov; camera.updateProjectionMatrix();
  if (v.file) {
    $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
    $photo.src = `../data/raw/refs/townhall/${v.file}`;
  } else $photo.removeAttribute("src");
  $credit.textContent = v.credit ?? ""; $credit.style.display = v.credit ? "block" : "none";
  S.view = name;
  fitFrame();
}
function fitFrame() {
  const v = PHOTOS[S.view], c = renderer.domElement;
  let w = innerWidth, h = innerHeight;
  if (S.frame && v?.file && $photo.naturalWidth) {
    const a = $photo.naturalWidth / ($photo.naturalHeight * (v.sy ?? 1));
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
  ...Object.fromEntries(LIBRARY_NAMES.map((o) => [`= ${o}`, () => model.libraryMaterial(o)])),
};

// ------------------------------------------------------------------------------------------------ panel
const S = {
  lod: "auto", show: "new model", wireframe: false, view: "east facade (Commons 3557)", photo: 0, frame: false, notes: true,
  time: preset, hour: lighting.hour, day: lighting.day, post: true, ao: 1, aoDirect: 0.55, weather: 1,
  slot: "stone_white", swap: "table default (temporary)", swapAll: false,
  stats: "", lodInfo: "", bench: "—", swapInfo: "—", fadeAlways: false,
};
const ui = new Panel({ title: "Town Hall Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solid (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "wireframe").onChange((v) => { for (const s of TH_SLOTS) { model.materials[s].wireframe = v; if (SMOOTH) fadeVariant(model.materials[s]).wireframe = v; } });
fm.add(S, "lodInfo").name("LOD now");
const fs = ui.addFolder("Material slots (adapter table)");
fs.add(S, "slot", TH_SLOTS).name("GLB slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("-> material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
fs.add(S, "swapInfo").name("last swap");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { thLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { thLook.aoDirect.value = v; });
fl.add(S, "weather", 0, 1, 0.01).name("stone weathering").onChange((v) => { thLook.weather.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms per LOD at this view");
fp.add(S, "bench").name("result");
fp.add(S, "fadeAlways").name("A/B: LOD-fade discard on every material (the old way)");

function applyShow() {
  root.visible = S.show !== "UrbIS solid (city today)";
  urbis.visible = S.show === "UrbIS solid (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}
let swapMs = 0;
/** swap a slot's material live: its shaders are built first (precompile on a stand-in mesh), then the slot switches
 *  in one frame (no hitch) */
async function doSwap() {
  const t = performance.now();
  const make = SWAPS[S.swap];
  const slots = S.swapAll ? TH_SLOTS : [S.slot];
  const proxy = new THREE.Group();
  const wrapped = slots.map((s) => {
    const w = model.setSlotMaterial(s, make(s), { dryRun: true }); w.wireframe = S.wireframe;
    const geo = model.lods[0].find((l) => l.slot === s)?.geometry ?? model.lods[0][0].geometry;
    proxy.add(new THREE.Mesh(geo, w));
    if (SMOOTH) { const v = fadeVariant(w); v.wireframe = S.wireframe; proxy.add(new THREE.Mesh(geo, v)); }   // its fading copy too
    return [s, w];
  });
  proxy.position.copy(root.position); proxy.rotation.copy(root.rotation); scene.add(proxy); proxy.updateMatrixWorld(true);
  await precompile(renderer, [proxy], camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });
  scene.remove(proxy);
  for (const [s, w] of wrapped) model.setSlotMaterial(s, w, { raw: true });
  swapMs = performance.now() - t;
  S.swapInfo = `${S.swapAll ? "ALL" : S.slot} -> ${S.swap.replace("= ", "")} (${swapMs.toFixed(0)} ms)`;
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  console.log(`[townhall lab] slot ${S.swapAll ? "ALL" : S.slot} -> ${S.swap} (${swapMs.toFixed(0)} ms, shaders built before the switch)`);
}

// notes
const N = model.notes, M = N.measured, LJ = model.lodsJson;
$notes.innerHTML = `
<h3>Reference photos (not shipped; the overlay works where data/raw/refs/townhall/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.credit}</li>`).join("")}</ul>
<h3>Measured (UrbIS 3D solid 547183 + DSM/DTM 2021 0.5 m, CC0)</h3>
<ul>
<li>plan (building frame, rotated ${M.frame.rotation_deg} deg, symmetric about its E-W axis): east facade ${(2 * M.plan_m.w_main).toFixed(1)} m,
 portico ${(2 * M.plan_m.w_portico).toFixed(2)} x ${(M.plan_m.u_portico - M.plan_m.u_east).toFixed(2)} m, wings ${(M.plan_m.u_wing[1] - M.plan_m.u_wing[0]).toFixed(1)} x ${(M.plan_m.w_wing - M.plan_m.w_main).toFixed(2)} m</li>
<li>roof levels (DSM p50, m TAW): ${Object.entries(M.roof_taw).map(([k, v]) => `${k} ${v}`).join(", ")}; main curb ${M.core_curb_taw}</li>
<li>ground (DTM): east ${M.ground_taw.east.mean}, west ${M.ground_taw.west.mean} m TAW (the perron's 11 risers)</li>
</ul>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")};
GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB (meshopt); AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU (2048² R8 + mips, ${N.lightmap.lod0_px_per_m} px/m mean,
${N.lightmap.thin_faces_vertex_ao[0].toLocaleString()} thin faces with per-vertex AO); load ${loadMs.toFixed(0)} ms.
Slots: ${TH_SLOTS.join(", ")} (adapter table -> any of the ${LIBRARY_NAMES.length} library names).</p>
<h3>Sources</h3><p>UrbIS (paradigm.brussels) CC0; Brussels heritage inventory 27585 (Maison communale, 1872-1882); Bruxelles Patrimoines 18 (2016):
"avant-corps central muni de deux ailes en retrait ... petit chateau francais de style Louis XIII", probably Baptiste Van der Elst.
See data/raw/refs/townhall/SOURCES.md.</p>`;
$notes.style.display = "block";

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const tc0 = performance.now();
const fadeCopies = fadeProxies(root);         // the LOD bands' fading copies, built before it shows too
if (fadeCopies) { fadeCopies.position.copy(root.position); fadeCopies.rotation.copy(root.rotation); fadeCopies.updateMatrixWorld(true); }
await precompile(renderer, fadeCopies ? [scene, fadeCopies] : [scene], camera, scene, { target: pipe.passTarget ?? null, mrt: pipe.passMRT ?? null });
const compileMs = performance.now() - tc0;
const shownAt = performance.now();
root.visible = true;
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(qp.get("view") && PHOTOS[qp.get("view")] ? qp.get("view") : "east facade (Commons 3557)");
if (qp.get("photo")) { S.photo = +qp.get("photo"); $photo.style.opacity = S.photo; }

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let forced = null;
async function bench() {
  const res = [];
  for (const mode of ["off", 0, 1, 2]) {
    forced = mode;
    await new Promise((r) => setTimeout(r, 700));
    gpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, 2500));
    const s = [...gpu.samples].sort((a, b) => a - b);
    res.push([mode, s.length ? s[Math.floor(s.length / 2)] : NaN]);
  }
  forced = null;
  const off = res[0][1];
  S.bench = res.slice(1).map(([k, ms]) => `L${k} ${ms.toFixed(2)} (+${(ms - off).toFixed(2)})`).join(" ") + ` · none ${off.toFixed(2)} ms`;
  console.log("[townhall lab] GPU ms median per frame:", JSON.stringify(res), "view", S.view);
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
const hitches = [];
window.lab = { force: (m) => { forced = m; }, renderer, scene, camera, controls, model, lighting, goView, fitFrame, bench, gpu, S, PHOTOS, levels, hitches, doSwap, loadMs, compileMs, shownAt, longTasks, toCity, groundAt, root };

const ramp = (d, k) => { const s = TH_LODS[k].until, w = TH_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dtMs = now - last, dt = Math.min(dtMs / 1000, 0.1); last = now;
  if (frames > 30 && dtMs > 34) { hitches.push(Math.round(dtMs)); if (hitches.length > 50) hitches.shift(); }
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  const dist = model.distance(camera.position);
  if (forced === null && S.lod === "auto" && SMOOTH) {
    const t1 = ramp(dist, 0), t2 = ramp(dist, 1);
    const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
    const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
    setLodFades(levels, shown, fades);
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? TH_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    setLodFades(levels, levels.map((_, i) => i === k), levels.map(() => 1));
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (S.fadeAlways && SMOOTH) for (const g of levels) if (g.visible) for (const o of g.children) o.material = fadeVariant(o.userData.base);
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 60, 420));
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${TH_LODS[0].until} m, LOD1 < ${TH_LODS[1].until} m, to the building's box; dithered cross-fades)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms, shaders ${compileMs.toFixed(0)} ms (before it shows)` +
      `\nlong tasks: ${longTasks.filter(([t]) => t > shownAt).length} after show · benchmark (median GPU ms, whole frame; + = the building): ${S.bench}`;
  }
});
addEventListener("resize", fitFrame);
