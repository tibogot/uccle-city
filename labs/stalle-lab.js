// THE STALLE LAB: the scripted Chapelle de Stalle and the sacristan's house (tools/blender/stalle.py -> models/stalle/,
// loaded by viewer/stalleModel.js: the loader, LODs and slot materials the city uses) at their real place, on the real
// ground (UrbIS DTM 0.5 m + the tiles' orthophoto), under the city's lighting (viewer/lighting.js) and post chain
// (viewer/post.js). The reference photos' viewpoints (camera poses solved by tools/stalle_photopose.py) with an overlay
// of the photo (data/raw/refs/stalle/, never shipped; credits on screen), LOD switch + auto LOD with the city's
// dithered cross-fades (lodFade.js), wireframe, the UrbIS solids it replaces, a live material-slot swap through the
// adapter table (any slot -> any library name), day / night, stats, long-task record, a GPU benchmark per LOD, and the
// INTERIOR cell (viewer/stalleInterior.js): walk in with the third-person character.
// URL: ?view=<viewpoint name>  ?time=golden|midday|overcast|twilight|night  ?photo=0..1  ?interior=0  ?walk=1
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, float, mix, smoothstep, positionWorld, select, uv, attribute, vec2 } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { withObjectFade, SMOOTH } from "../viewer/lodFade.js";
import { precompile } from "../viewer/warmup.js";
import { loadStalle, ST_LODS, ST_SLOTS, LIBRARY_NAMES, SLOT_TABLE, stLook } from "../viewer/stalleModel.js";

const qp = new URLSearchParams(location.search);
const longTasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch { /* no longtask API */ }
const $info = document.getElementById("info"), $photo = document.getElementById("photo"), $notes = document.getElementById("notes"), $credit = document.getElementById("credit");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the chapel
const t0 = performance.now();
const model = await loadStalle().catch((e) => { $info.textContent = "models/stalle/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const root = new THREE.Group(); root.name = "stalle";
root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY;
scene.add(root);
const fadeOn = (m) => (SMOOTH ? withObjectFade(m) : m);
for (const s of ST_SLOTS) fadeOn(model.materials[s]);
const levels = ST_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
root.visible = false;                   // shown once its shaders are built (precompile, below)
root.updateMatrixWorld(true);
const centre = model.boundsWorld.getCenter(new THREE.Vector3());
const FRM = model.notes.measured.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
const toCity = (u, w) => [FRM.origin_city[0] + u * RC - w * RS, FRM.origin_city[1] + u * RS + w * RC];

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto
const site = await fetch("../models/stalle/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/stalle/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = THREE.MathUtils.clamp((x - site.x0) / site.step, 0, site.cols - 1.001), r = THREE.MathUtils.clamp((z - site.z0) / site.step, 0, site.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, H = (i, j) => dtm[j * site.cols + i] / 100 + site.base;
  return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr;
};
let groundMesh;
{
  const W = (site.cols - 1) * site.step, Hh = (site.rows - 1) * site.step;
  const g = new THREE.PlaneGeometry(W, Hh, (site.cols - 1) / 2, (site.rows - 1) / 2).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + site.x0 + W / 2, z = p.getZ(i) + site.z0 + Hh / 2;
    p.setXYZ(i, x, groundAt(x, z) - 0.03, z);
  }
  g.computeVertexNormals();
  const tl = new THREE.TextureLoader();
  const load = async (tile) => (await tl.loadAsync(`../data/raw/ortho/${tile}.jpg`).catch(() => null)) ?? (await tl.loadAsync(`../data/tiles/${tile}/ortho.jpg`).catch(() => null));
  const [o5, o4] = await Promise.all([load("D5"), load("D4")]);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  if (o5 && o4) {
    for (const o of [o5, o4]) { o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8; }
    // tile D5: x -1500..-1000, z 0..500; D4: z -500..0 (image row 0 = north = the smaller z)
    const fy = (u) => u.mul(vec2(1, -1)).add(vec2(0, 1));
    const u5 = positionWorld.xz.sub(vec2(-1500, 0)).div(500), u4 = positionWorld.xz.sub(vec2(-1500, -500)).div(500);
    const col = select(positionWorld.z.lessThan(0), texture(o4, fy(u4)).rgb, texture(o5, fy(u5)).rgb);
    const edge = smoothstep(98, 85, positionWorld.xz.sub(vec2(centre.x, centre.z)).length());
    // the 1 m orthophoto alone reads as a flat blue-green blob under trees: lawn tone where it is green, the photo's
    // detail on top (the streets and the forecourt are real geometry above it)
    const green = col.g.sub(col.r.add(col.b).mul(0.5)).max(0).mul(6.0).min(1);
    const lawn = mix(vec3(0.12, 0.16, 0.05), vec3(0.2, 0.24, 0.09), col.g.mul(2.0).min(1));
    m.colorNode = mix(vec3(0.12, 0.14, 0.1), mix(col.mul(0.7), lawn, green.mul(0.5).add(0.45)), edge);
  } else m.color.set(0x55605a);
  groundMesh = new THREE.Mesh(g, m); groundMesh.receiveShadow = true; groundMesh.name = "ground";
  scene.add(groundMesh);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(centre.x, 28, centre.z); farG.receiveShadow = true;
  scene.add(farG);
}

// the measured street surfaces (UrbIS, the tiles' surfaces.json) near the chapel: rue de Stalle's setts, the pavements,
// draped on the DTM, so the photo sheets compare on a real street, not the orthophoto blob
{
  const doc = await fetch("../data/tiles/D5/surfaces.json").then((r) => r.json()).catch(() => null);
  if (doc) {
    const cls = doc.classes;
    const byMat = { cobbles: [], paving_concrete: [] };
    for (const sf of doc.surfaces) {
      const ring = sf.rings[0];
      if (!ring.some(([x, z]) => Math.hypot(x - centre.x, z - centre.z) < 95)) continue;
      const type = cls[sf.c] ?? "";
      const mat = /sidewalk|path|ramp|median/.test(type) ? "paving_concrete" : "cobbles";
      const lift = mat === "paving_concrete" ? 0.1 : 0.04;
      const pts = ring.map(([x, z]) => new THREE.Vector2(x, z)), holes = sf.rings.slice(1).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
      const tris = THREE.ShapeUtils.triangulateShape(pts, holes);
      const all = [...pts, ...holes.flat()];
      for (const t of tris) for (const i of t) { const p = all[i]; byMat[mat].push(p.x, groundAt(p.x, p.y) + lift, p.y); }
    }
    for (const [name, arr] of Object.entries(byMat)) {
      if (!arr.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      const uvs = new Float32Array(arr.length / 3 * 2); for (let i = 0; i < arr.length / 3; i++) { uvs[i * 2] = arr[i * 3]; uvs[i * 2 + 1] = arr[i * 3 + 2]; }
      g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2)); g.computeVertexNormals();
      for (let i = 0; i < g.attributes.normal.count; i++) if (g.attributes.normal.getY(i) < 0) g.attributes.normal.setXYZ(i, 0, 1, 0);
      const m = model.libraryMaterial(name); m.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.name = `street-${name}`;
      scene.add(mesh);
    }
  }
}

// ------------------------------------------------------------------------------------------------ the UrbIS solids the city draws today
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis() {
  const out = [];
  const meta = await fetch("../data/tiles/D5/buildings.json").then((r) => r.json());
  const bin = await fetch("../data/tiles/D5/buildings.bin").then((r) => r.arrayBuffer());
  const V = new DataView(bin).getUint32(0, true);
  const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
  for (const b of meta.buildings) {
    if (!HIDE.has(b.id)) continue;
    for (const r of [b.roof, b.walls]) for (let i = r.first; i < r.first + r.count; i++) for (let k = 0; k < 3; k++) {
      const v = idx[i * 3 + k]; out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
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
// photo viewpoints: tools/stalle_photopose.py (pose + focal + principal point solved on hand-picked correspondences)
const posed = await fetch("../models/stalle/photo_views.json").then((r) => r.json()).catch(() => ({}));
const PHOTOS = {
  ...Object.fromEntries(Object.entries(posed).map(([k, v]) => [k, { ...v, posed: true }])),
  "west front, close": { pos: [-7.5, 0.6, 35.6], target: [0.0, 0.1, 37.6], fov: 55 },
  "the bell-cote": { pos: [-3.0, -9.0, 41.5], target: [6.8, 0.1, 45.5], fov: 40 },
  "north side": { pos: [6.0, -19.0, 36.0], target: [7.0, 0.0, 38.5], fov: 50 },
  "chevet from the east": { pos: [32.0, 2.0, 36.0], target: [15.0, 0.5, 38.5], fov: 45 },
  "the house and the forecourt": { pos: [-9.0, -4.0, 35.5], target: [-3.0, 6.0, 36.5], fov: 55 },
  "south side (estimated)": { pos: [6.0, 22.0, 37.0], target: [6.0, 2.0, 38.5], fov: 50 },
  "aerial": { pos: [30.0, -28.0, 70.0], target: [5.0, 1.0, 38.0], fov: 40 },
  "overview": { pos: [90.0, 110.0, 120.0], target: [5.0, 0.0, 38.0], fov: 40 },
  "far (600 m)": { pos: [450.0, 380.0, 220.0], target: [5.0, 0.0, 38.0], fov: 30 },
};
let viewOffset = null;
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  setMode("orbit");
  const [px, pz] = toCity(v.pos[0], v.pos[1]), [tx, tz] = toCity(v.target[0], v.target[1]);
  camera.position.set(px, v.posed ? v.pos[2] : Math.max(v.pos[2], groundAt(px, pz) + 1.5), pz);
  controls.target.set(tx, v.target[2], tz); camera.fov = v.fov;
  camera.lookAt(controls.target);
  viewOffset = v.posed ? { cy: v.cy ?? 0.5, f: v.f_px, H: v.size[1], W: v.size[0] } : null;
  if (v.file) {
    $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
    $photo.src = `../data/raw/refs/stalle/${v.file}`;
  } else $photo.removeAttribute("src");
  $credit.textContent = v.credit ?? ""; $credit.style.display = v.credit ? "block" : "none";
  S.view = name;
  fitFrame();
}
function fitFrame() {
  const v = PHOTOS[S.view], c = renderer.domElement;
  let w = innerWidth, h = innerHeight;
  const photo = S.frame && v?.file && $photo.naturalWidth;
  if (photo) {
    const a = $photo.naturalWidth / $photo.naturalHeight;
    if (w / h > a) w = Math.round(h * a); else h = Math.round(w / a);
  }
  renderer.setSize(w, h);
  Object.assign(c.style, { position: "fixed", left: `${(innerWidth - w) / 2}px`, top: `${(innerHeight - h) / 2}px` });
  if (S.frame) Object.assign($photo.style, { objectFit: "fill", inset: "auto", left: c.style.left, top: c.style.top, width: `${w}px`, height: `${h}px` });
  else Object.assign($photo.style, { objectFit: "contain", inset: "0", left: "", top: "", width: "100%", height: "100%" });
  camera.aspect = w / h;
  camera.clearViewOffset();
  if (photo && viewOffset) {
    // the photo's principal point (straightened photos: not the centre): a taller virtual frame centred on it
    const { cy, f, H } = viewOffset, fc = f * h / H;
    const full = 2 * Math.max(cy, 1 - cy) * h;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(full / 2 / fc));
    camera.setViewOffset(w, full, 0, cy > 0.5 ? 0 : full - h, w, h);
  } else if (v) camera.fov = v.fov;
  camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------------------------------------ material swap (adapter table)
const SWAPS = {
  "table default": (s) => model.libraryMaterial(SLOT_TABLE[s]),
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
const firstView = qp.get("view") && PHOTOS[qp.get("view")] ? qp.get("view") : (Object.keys(posed)[0] ?? "west front, close");
const S = {
  mode: "orbit", lod: "auto", show: "new model", wireframe: false, view: firstView, photo: 0, frame: true, notes: true,
  time: preset, hour: lighting.hour, day: lighting.day, post: qp.get("fx") !== "0", ao: 1, aoDirect: 0.6, weather: 1, moss: 1, glow: 0.35,
  slot: "sandstone_rubble", swap: "table default", swapAll: false,
  stats: "", lodInfo: "", bench: "—", swapInfo: "—",
};
const ui = new Panel({ title: "Stalle Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solids (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "wireframe").onChange((v) => { for (const s of ST_SLOTS) model.materials[s].wireframe = v; });
fm.add(S, "lodInfo").name("LOD now").listen();
const fs = ui.addFolder("Material slots (adapter table)");
fs.add(S, "slot", ST_SLOTS).name("GLB slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("-> material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
fs.add(S, "swapInfo").name("last swap").listen();
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset (day / night)").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { stLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { stLook.aoDirect.value = v; });
fl.add(S, "weather", 0, 1, 0.01).name("stone weathering").onChange((v) => { stLook.weather.value = v; });
fl.add(S, "moss", 0, 1, 0.01).name("moss / algae").onChange((v) => { stLook.moss.value = v; });
fl.add(S, "glow", 0, 1.5, 0.01).name("windows at night").onChange((v) => { stLook.glow.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms per LOD at this view");
fp.add(S, "bench").name("result").listen();

function applyShow() {
  root.visible = S.show !== "UrbIS solids (city today)";
  urbis.visible = S.show === "UrbIS solids (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}
let swapMs = 0;
/** swap a slot's material live: its shaders are built first (precompile on a stand-in mesh), then the slot switches in
 *  one frame */
async function doSwap() {
  const t = performance.now();
  const make = SWAPS[S.swap];
  const slots = S.swapAll ? ST_SLOTS : [S.slot];
  const proxy = new THREE.Group();
  const wrapped = slots.map((s) => {
    const w = model.setSlotMaterial(s, make(s), { fade: fadeOn, dryRun: true }); w.wireframe = S.wireframe;
    const geo = model.lods[0].find((l) => l.slot === s)?.geometry ?? model.lods[0][0].geometry;
    proxy.add(new THREE.Mesh(geo, w)); return [s, w];
  });
  proxy.position.copy(root.position); proxy.rotation.copy(root.rotation); scene.add(proxy); proxy.updateMatrixWorld(true);
  await precompile(renderer, [proxy], camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });
  scene.remove(proxy);
  for (const [s, w] of wrapped) model.setSlotMaterial(s, w, { raw: true });
  swapMs = performance.now() - t;
  S.swapInfo = `${S.swapAll ? "ALL" : S.slot} -> ${S.swap.replace("= ", "")} (${swapMs.toFixed(0)} ms)`;
  console.log(`[stalle lab] slot ${S.swapAll ? "ALL" : S.slot} -> ${S.swap} (${swapMs.toFixed(0)} ms, shaders built before the switch)`);
}

// notes
const N = model.notes, LJ = model.lodsJson;
$notes.innerHTML = `
<h3>Chapelle de Stalle (Notre-Dame de Bon-Secours / des Affligés)</h3>
<p>Gothic chapel of the lords of Stalle (lands endowed 1369); the present building probably end of the 15th century: dressed
white stone in irregular courses, a basilican plan with two very small aisles lit by oculi, a polygonal chevet, a hexagonal
bell-cote; stucco ceiling 1693, choir paving 1697, sacristan's house 1711; restored 1932-33 and 1990-91; protected 1938
(heritage inventory 27945).</p>
<h3>Reference photos (not shipped; the overlay works where data/raw/refs/stalle/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.credit} (pose error ${v.mean_err} px)</li>`).join("")}</ul>
<h3>Measured (UrbIS solids 530292 + 525640, DSM / DTM 2021 0.5 m, CC0)</h3>
<p>frame rotated ${N.measured.frame.rotation_deg} deg; ridge ${N.levels_taw.ridge} m TAW (DSM), aisle eaves ${N.levels_taw.aisle_eave}, nave eaves
${N.levels_taw.nave_eave}, floor ${N.levels_taw.floor}; bell-cote on the ridge at u ${N.plan.bell_u} m (the DSM's bump).</p>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")} (+ door ${model.doorTris} tris);
GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB (meshopt); AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU; load ${loadMs.toFixed(0)} ms.
Slots: ${ST_SLOTS.join(", ")} (new names: sandstone_rubble, painted_wood_red).</p>`;
$notes.style.display = "block";

// ------------------------------------------------------------------------------------------------ the interior cell (+ walk)
let inner = null;
const setMode = (m) => { S.mode = m; inner?.setMode?.(m); controls.enabled = m === "orbit"; };
if (qp.get("interior") !== "0") {
  try {
    const mod = await import("./stalle-lab-interior.js");
    inner = await mod.attachInterior({ renderer, scene, camera, controls, lighting, model, groundAt, toCity, ui, S, levels, getPipe: () => pipe });
  } catch (e) { console.warn("[stalle lab] interior:", e); }
}

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const tc0 = performance.now();
await precompile(renderer, [scene], camera, scene, { target: pipe.passTarget ?? null, mrt: pipe.passMRT ?? null });
const compileMs = performance.now() - tc0;
const shownAt = performance.now();
root.visible = true;
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(S.view);
if (qp.get("photo")) { S.photo = +qp.get("photo"); $photo.style.opacity = S.photo; }
if (qp.get("walk") === "1") setMode("walk");

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let forced = null;
async function bench(rounds = 1) {
  const all = [];
  for (let r = 0; r < rounds; r++) {
    const res = [];
    for (const mode of ["off", 0, 1, 2]) {
      forced = mode;
      await new Promise((ok) => setTimeout(ok, 700));
      gpu.samples.length = 0;
      await new Promise((ok) => setTimeout(ok, 2500));
      const s = [...gpu.samples].sort((a, b) => a - b);
      res.push([mode, s.length ? s[Math.floor(s.length / 2)] : NaN]);
    }
    all.push(res);
  }
  forced = null;
  const med = (k) => { const v = all.map((r) => r[k][1]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const off = med(0);
  S.bench = [1, 2, 3].map((k) => `L${k - 1} ${med(k).toFixed(2)} (+${(med(k) - off).toFixed(2)})`).join(" ") + ` · none ${off.toFixed(2)} ms` + (rounds > 1 ? ` · median of ${rounds}` : "");
  console.log("[stalle lab] GPU ms median per frame:", JSON.stringify(all), "view", S.view);
  return all;
}
const hitches = [];
window.lab = { renderer, scene, camera, controls, model, lighting, goView, fitFrame, bench, gpu, S, PHOTOS, levels, hitches, doSwap, loadMs, compileMs, shownAt, longTasks, toCity, groundAt, root, inner: () => inner, setMode, urbis, pipe: () => pipe };

const ramp = (d, k) => { const s = ST_LODS[k].until, w = ST_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dtMs = now - last, dt = Math.min(dtMs / 1000, 0.1); last = now;
  if (frames > 30 && dtMs > 34) { hitches.push(Math.round(dtMs)); if (hitches.length > 50) hitches.shift(); }
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (S.mode === "orbit") controls.update();
  inner?.update?.(dt);
  const eye = inner?.eye?.() ?? camera.position;
  const dist = model.distance(eye);
  if (forced === null && S.lod === "auto" && SMOOTH) {
    const t1 = ramp(dist, 0), t2 = ramp(dist, 1);
    const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
    const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
    levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) for (const o of g.children) o.userData.fade = fades[k]; });
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? ST_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    levels.forEach((g, i) => { g.visible = i === k; if (g.visible) for (const o of g.children) o.userData.fade = 1; });
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  const focus = S.mode === "orbit" ? controls.target : eye;
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), focus, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 50, 420), dt);
  inner?.beforeRender?.();
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${ST_LODS[0].until} m, LOD1 < ${ST_LODS[1].until} m, to the building's box; dithered cross-fades)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms, shaders ${compileMs.toFixed(0)} ms (before it shows)` +
      `\nlong tasks: ${longTasks.filter(([t]) => t > shownAt).length} after show · benchmark (median GPU ms, whole frame; + = the chapel): ${S.bench}` +
      (inner?.info ? `\n${inner.info()}` : "");
  }
});
addEventListener("resize", fitFrame);
