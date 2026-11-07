// THE SAINT-PIERRE LAB: the scripted Eglise Saint-Pierre d'Uccle (tools/blender/stpierre.py -> models/stpierre/, loaded by
// viewer/stpierreModel.js: the loader, LODs and slot materials the city uses) at its real place, on the real ground (UrbIS
// DTM 0.5 m + the tiles' orthophoto + the measured street surfaces of the parvis), with the neighbouring UrbIS buildings as
// context, under the city's lighting (viewer/lighting.js) and post chain (viewer/post.js). The reference photos' viewpoints
// (camera poses solved by tools/stpierre_photopose.py) with an overlay of the photo (data/raw/refs/saint-pierre/, never
// shipped; credits on screen), LOD switch + auto LOD with the city's dithered cross-fades (lodFade.js), wireframe, the
// UrbIS solid it replaces, a live material-slot swap through the adapter table (any slot -> any library name), day /
// night, stats, long-task record, a GPU benchmark per LOD, a scripted camera flight through the LOD hand-overs.
// URL: ?view=<viewpoint name>  ?time=golden|midday|overcast|twilight|night  ?photo=0..1  ?context=0
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, float, mix, smoothstep, positionWorld, select, uv, attribute, vec2 } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { SMOOTH, fadeProxies, fadeVariant } from "../viewer/lodFade.js";
import { precompile } from "../viewer/warmup.js";
import { loadStPierre, SP_LODS, SP_SLOTS, LIBRARY_NAMES, SLOT_TABLE, spLook, setLodFades } from "../viewer/stpierreModel.js";

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

// ------------------------------------------------------------------------------------------------ the church
const t0 = performance.now();
const model = await loadStPierre().catch((e) => { $info.textContent = "models/stpierre/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const root = new THREE.Group(); root.name = "stpierre";
root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY;
scene.add(root);
const levels = SP_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
root.visible = false;                   // shown once its shaders are built (precompile, below)
root.updateMatrixWorld(true);
const centre = model.boundsWorld.getCenter(new THREE.Vector3());
const FRM = model.notes.measured.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
const toCity = (u, w) => [FRM.origin_city[0] + u * RC - w * RS, FRM.origin_city[1] + u * RS + w * RC];

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto
const site = await fetch("../models/stpierre/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/stpierre/site_dtm.bin").then((r) => r.arrayBuffer()));
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
  const tl = new THREE.TextureLoader();
  const load = async (tile) => (await tl.loadAsync(`../data/raw/ortho/${tile}.jpg`).catch(() => null)) ?? (await tl.loadAsync(`../data/tiles/${tile}/ortho.jpg`).catch(() => null));
  const [o3, o4] = await Promise.all([load("E3"), load("E4")]);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  if (o3 && o4) {
    for (const o of [o3, o4]) { o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8; }
    // tile E3: x -1000..-500, z -1000..-500; E4: z -500..0 (image row 0 = north = the smaller z)
    const fy = (u) => u.mul(vec2(1, -1)).add(vec2(0, 1));
    const u3 = positionWorld.xz.sub(vec2(-1000, -1000)).div(500), u4 = positionWorld.xz.sub(vec2(-1000, -500)).div(500);
    const col = select(positionWorld.z.lessThan(-500), texture(o3, fy(u3)).rgb, texture(o4, fy(u4)).rgb);
    const edge = smoothstep(108, 92, positionWorld.xz.sub(vec2(centre.x, centre.z)).length());
    const green = col.g.sub(col.r.add(col.b).mul(0.5)).max(0).mul(6.0).min(1);
    const lawn = mix(vec3(0.12, 0.16, 0.05), vec3(0.2, 0.24, 0.09), col.g.mul(2.0).min(1));
    m.colorNode = mix(vec3(0.12, 0.14, 0.1), mix(col.mul(0.7), lawn, green.mul(0.5).add(0.45)), edge);
  } else m.color.set(0x55605a);
  const groundMesh = new THREE.Mesh(g, m); groundMesh.receiveShadow = true; groundMesh.name = "ground";
  scene.add(groundMesh);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(centre.x, site.min - 1.5, centre.z); farG.receiveShadow = true;
  scene.add(farG);
}

// the measured street surfaces (UrbIS, the tiles' surfaces.json) round the church: the parvis' setts, the pavements
{
  const byMat = { cobbles: [], paving_concrete: [] };
  for (const tile of ["E3", "E4"]) {
    const doc = await fetch(`../data/tiles/${tile}/surfaces.json`).then((r) => r.json()).catch(() => null);
    if (!doc) continue;
    const cls = doc.classes;
    for (const sf of doc.surfaces) {
      const ring = sf.rings[0];
      if (!ring.some(([x, z]) => Math.hypot(x - centre.x, z - centre.z) < 100)) continue;
      const type = cls[sf.c] ?? "";
      const mat = /sidewalk|path|ramp|median/.test(type) ? "paving_concrete" : "cobbles";
      const lift = mat === "paving_concrete" ? 0.1 : 0.04;
      const pts = ring.map(([x, z]) => new THREE.Vector2(x, z)), holes = sf.rings.slice(1).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
      const tris = THREE.ShapeUtils.triangulateShape(pts, holes);
      const all = [...pts, ...holes.flat()];
      for (const t of tris) {
        // wind every triangle counter-clockwise seen from above (normal up): the shape triangulator's order varies
        const [a, b, c] = t.map((i) => all[i]);
        const up = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0;     // x right, z (= y here) towards the viewer
        for (const p of up ? [a, b, c] : [a, c, b]) byMat[mat].push(p.x, groundAt(p.x, p.y) + lift, p.y);
      }
    }
  }
  for (const [name, arr] of Object.entries(byMat)) {
    if (!arr.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    const uvs = new Float32Array(arr.length / 3 * 2); for (let i = 0; i < arr.length / 3; i++) { uvs[i * 2] = arr[i * 3]; uvs[i * 2 + 1] = arr[i * 3 + 2]; }
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2)); g.computeVertexNormals();
    for (let i = 0; i < g.attributes.normal.count; i++) if (g.attributes.normal.getY(i) < 0) g.attributes.normal.setXYZ(i, 0, 1, 0);
    const m = model.libraryMaterial(name);
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.name = `street-${name}`;
    scene.add(mesh);
  }
}

// ------------------------------------------------------------------------------------------------ UrbIS: the solid it replaces + the neighbours
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis(tile, keep) {
  const out = [];
  const meta = await fetch(`../data/tiles/${tile}/buildings.json`).then((r) => r.json());
  const bin = await fetch(`../data/tiles/${tile}/buildings.bin`).then((r) => r.arrayBuffer());
  const V = new DataView(bin).getUint32(0, true);
  const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
  for (const b of meta.buildings) {
    if (!keep(b)) continue;
    for (const r of [b.roof, b.walls]) for (let i = r.first; i < r.first + r.count; i++) for (let k = 0; k < 3; k++) {
      const v = idx[i * 3 + k]; out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3)); g.computeVertexNormals();
  return g;
}
const urbisGeo = await loadUrbis("E3", (b) => HIDE.has(b.id)).catch(() => null);
const urbis = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshStandardNodeMaterial({ color: 0x8a7f74, roughness: 0.9 })) : new THREE.Group();
const urbisGhost = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshBasicNodeMaterial({ color: 0xff3b30, wireframe: true, transparent: true, opacity: 0.45 })) : new THREE.Group();
urbis.visible = urbisGhost.visible = false; urbis.castShadow = urbis.receiveShadow = true;
scene.add(urbis, urbisGhost);
// the neighbouring buildings (plain UrbIS solids, as the city draws its far LOD): context for the photo comparisons
const context = new THREE.Group(); context.name = "context";
if (qp.get("context") !== "0") {
  const near = (b) => !HIDE.has(b.id) && b.footprint[0].some(([x, z]) => Math.hypot(x - centre.x, z - centre.z) < 95);
  const mat = new THREE.MeshStandardNodeMaterial({ color: 0x9c9284, roughness: 0.92 });
  for (const tile of ["E3", "E4"]) {
    const g = await loadUrbis(tile, near).catch(() => null);
    if (g) { const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; context.add(m); }
  }
  scene.add(context);
}

// ------------------------------------------------------------------------------------------------ views (the photos)
// photo viewpoints: tools/stpierre_photopose.py (pose + focal + principal point solved on hand-picked correspondences)
const posed = await fetch("../models/stpierre/photo_views.json").then((r) => r.json()).catch(() => ({}));
const PHOTOS = {
  ...Object.fromEntries(Object.entries(posed).map(([k, v]) => [k, { ...v, posed: true }])),
  "west front, close": { pos: [-14.0, -0.07, 51.6], target: [0.0, -0.07, 58.0], fov: 60 },
  "the tower": { pos: [-12.0, 8.0, 60.0], target: [3.2, -0.07, 75.0], fov: 45 },
  "south side": { pos: [18.0, 32.0, 52.0], target: [18.0, 6.0, 57.0], fov: 55 },
  "north-west (fourth nave)": { pos: [-14.0, -30.0, 52.0], target: [8.0, -10.0, 57.0], fov: 55 },
  "chevet from the east (estimated)": { pos: [70.0, 10.0, 60.0], target: [40.0, -2.0, 57.0], fov: 45 },
  "aerial": { pos: [-35.0, 50.0, 100.0], target: [22.0, -2.0, 58.0], fov: 40 },
  "overview": { pos: [-140.0, 120.0, 140.0], target: [22.0, 0.0, 58.0], fov: 40 },
  "far (600 m)": { pos: [-450.0, 380.0, 240.0], target: [22.0, 0.0, 58.0], fov: 30 },
};
let viewOffset = null;
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  const [px, pz] = toCity(v.pos[0], v.pos[1]), [tx, tz] = toCity(v.target[0], v.target[1]);
  camera.position.set(px, v.posed ? v.pos[2] : Math.max(v.pos[2], groundAt(px, pz) + 1.5), pz);
  controls.target.set(tx, v.target[2], tz); camera.fov = v.fov;
  camera.lookAt(controls.target);
  viewOffset = v.posed ? { cy: v.cy ?? 0.5, f: v.f_px, H: v.size[1], W: v.size[0] } : null;
  if (v.file) {
    $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
    $photo.src = `../data/raw/refs/saint-pierre/${v.file}`;
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
    camera.aspect = w / full;                 // the virtual frame's aspect (three scales the width by aspect x full height)
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
  lod: "auto", show: "new model", wireframe: false, context: context.children.length > 0, view: firstView, photo: 0, frame: true, notes: true,
  time: preset, hour: lighting.hour, day: lighting.day, post: qp.get("fx") !== "0", ao: 1, aoDirect: 0.6, weather: 1, moss: 1, glow: 0.35,
  slot: "stone_white", swap: "table default", swapAll: false,
  stats: "", lodInfo: "", bench: "—", swapInfo: "—", flight: "—",
};
const ui = new Panel({ title: "Saint-Pierre Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
fv.add(S, "context").name("neighbouring UrbIS buildings").onChange((v) => { context.visible = v; });
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solid (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "wireframe").onChange((v) => { for (const s of SP_SLOTS) model.materials[s].wireframe = v; });
fm.add(S, "lodInfo").name("LOD now").listen();
const fs = ui.addFolder("Material slots (adapter table)");
fs.add(S, "slot", SP_SLOTS).name("GLB slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("-> material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
fs.add(S, "swapInfo").name("last swap").listen();
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset (day / night)").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { spLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { spLook.aoDirect.value = v; });
fl.add(S, "weather", 0, 1, 0.01).name("stone weathering").onChange((v) => { spLook.weather.value = v; });
fl.add(S, "moss", 0, 1, 0.01).name("moss / algae").onChange((v) => { spLook.moss.value = v; });
fl.add(S, "glow", 0, 1.5, 0.01).name("windows at night").onChange((v) => { spLook.glow.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms per LOD at this view");
fp.add(S, "bench").name("result").listen();
fp.add({ go: () => flight() }, "go").name("flight through the LOD hand-overs");
fp.add(S, "flight").name("flight result").listen();

function applyShow() {
  root.visible = S.show !== "UrbIS solid (city today)";
  urbis.visible = S.show === "UrbIS solid (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}
let swapMs = 0;
/** swap a slot's material live: its shaders are built first (precompile on a stand-in mesh), then the slot switches in
 *  one frame */
async function doSwap() {
  const t = performance.now();
  const make = SWAPS[S.swap];
  const slots = S.swapAll ? SP_SLOTS : [S.slot];
  const proxy = new THREE.Group();
  const wrapped = slots.map((s) => {
    const w = model.setSlotMaterial(s, make(s), { dryRun: true }); w.wireframe = S.wireframe;
    const geo = model.lods[0].find((l) => l.slot === s)?.geometry ?? model.lods[0][0].geometry;
    proxy.add(new THREE.Mesh(geo, w)); if (SMOOTH) proxy.add(new THREE.Mesh(geo, fadeVariant(w))); return [s, w];
  });
  proxy.position.copy(root.position); proxy.rotation.copy(root.rotation); scene.add(proxy); proxy.updateMatrixWorld(true);
  await precompile(renderer, [proxy], camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });
  scene.remove(proxy);
  for (const [s, w] of wrapped) model.setSlotMaterial(s, w, { raw: true });
  swapMs = performance.now() - t;
  S.swapInfo = `${S.swapAll ? "ALL" : S.slot} -> ${S.swap.replace("= ", "")} (${swapMs.toFixed(0)} ms)`;
  console.log(`[stpierre lab] slot ${S.swapAll ? "ALL" : S.slot} -> ${S.swap} (${swapMs.toFixed(0)} ms, shaders built before the switch)`);
}

// notes
const N = model.notes, LJ = model.lodsJson;
$notes.innerHTML = `
<h3>Eglise Saint-Pierre d'Uccle (Parvis Saint-Pierre)</h3>
<p>Neoclassical church built 1778-1782 by Jean-Francois Wincqz for the abbey of Forest (consecrated 24 September 1782),
facades embellished by Jean Baes (1883-84), enlarged with a fourth nave and annexes by Guillaume-Chretien Veraart
(1938-1950), protected 25 October 1938, restored by Arter 2013-14. Red brick in cross bond panelled in white sandstone
(gres ledien, Savonnieres, Gobertange), blue-stone portals; a square tower with canted corners, louvred belfry, four
clocks and a copper dome; slate roofs.</p>
<h3>Reference photos (not shipped; the overlay works where data/raw/refs/saint-pierre/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.credit} (pose error ${v.mean_err} px)</li>`).join("")}</ul>
<h3>Measured (UrbIS solid 546128, DSM / DTM 2021 0.5 m, CC0)</h3>
<p>frame rotated ${N.measured.frame.rotation_deg} deg; ridge ${N.levels_taw.ridge} m TAW (DSM), cornice ${N.levels_taw.cornice[1]},
fourth nave ${N.levels_taw.fourth_nave.join(" / ")}, annexes ${N.levels_taw.annexes}, dome top ${N.levels_taw.dome_top}.</p>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")};
GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB (meshopt); AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU; load ${loadMs.toFixed(0)} ms.
Slots: ${SP_SLOTS.join(", ")} (new name: copper_brown).</p>`;
$notes.style.display = "block";

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const tc0 = performance.now();
const fadeP = fadeProxies(root); if (fadeP) scene.add(fadeP);
await precompile(renderer, [scene], camera, scene, { target: pipe.passTarget ?? null, mrt: pipe.passMRT ?? null });         // (+ the fading copies)
if (fadeP) scene.remove(fadeP);
const compileMs = performance.now() - tc0;
const shownAt = performance.now();
root.visible = true;
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(S.view);
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
/** GPU ms per frame with the church off / LOD0 / LOD1 / LOD2, alternating, `rounds` times; medians */
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
  console.log("[stpierre lab] GPU ms median per frame:", JSON.stringify(all), "view", S.view);
  return all;
}
/** a scripted camera flight from 700 m to 25 m and back out along the parvis' axis, crossing both LOD hand-overs while
 *  MOVING; records per frame the LOD state (which levels are drawn, their fade) and the frame time; pops = a level
 *  appearing / disappearing outside a fade band */
let flying = null;
function flight(seconds = 24) {
  return new Promise((done) => {
    const rec = []; const t0f = performance.now();
    const pathAt = (t) => {             // 0..1: far -> near -> far (cosine ease), slightly curving
      const s = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
      const d = 700 * Math.pow(1 - s, 1.6) + 25;
      const a = -2.6 + 0.5 * Math.sin(Math.PI * t);
      const [x, z] = toCity(22 + d * Math.cos(a), d * Math.sin(a));
      return [x, Math.max(groundAt(x, z) + 2, 52 + d * 0.18), z];
    };
    flying = (now) => {
      const t = (now - t0f) / (seconds * 1000);
      if (t >= 1) {
        flying = null;
        // a level may only appear / disappear while invisible: its fade at that frame must be ~0 (fading in from
        // nothing) or ~3 (faded out completely); anything else is a pop. Also: the summed coverage must stay ~1.
        let pops = 0, prev = null, worst = 0, handovers = 0;
        const cover = (r) => r.shown.reduce((s, v, k) => s + (!v ? 0 : r.fade[k] >= 2 ? 3 - r.fade[k] : r.fade[k]), 0);
        let covMin = 9, covMax = 0;
        for (const r of rec) {
          const c = cover(r); covMin = Math.min(covMin, c); covMax = Math.max(covMax, c);
          if (prev) for (let k = 0; k < 3; k++) {
            if (prev.shown[k] !== r.shown[k]) {
              handovers++;
              const f = r.shown[k] ? r.fade[k] : prev.fade[k];
              const step = f >= 2 ? 3 - f : f;            // visible share at the switch
              worst = Math.max(worst, step);
              if (step > 0.1) pops++;
            }
          }
          prev = r;
        }
        window.lab.flightStats = { handovers, pops, worstStep: worst, coverage: [covMin, covMax] };
        const ft = rec.map((r) => r.dt).sort((a, b) => a - b);
        S.flight = `${rec.length} frames, median ${ft[ft.length >> 1].toFixed(1)} ms, p99 ${ft[Math.floor(ft.length * 0.99)].toFixed(1)} ms, >34 ms: ${ft.filter((x) => x > 34).length}, ${handovers} visibility switches, pops ${pops} (worst step ${(worst * 100).toFixed(1)} %), coverage ${covMin.toFixed(2)}-${covMax.toFixed(2)}`;
        window.lab.flightRecord = rec;
        done(rec); return;
      }
      const [x, y, z] = pathAt(t);
      camera.position.set(x, y, z); controls.target.copy(centre); camera.lookAt(centre);
    };
    window.lab.flightRec = rec;
  });
}
const hitches = [];
window.lab = { renderer, scene, camera, controls, model, lighting, goView, fitFrame, bench, flight, gpu, S, PHOTOS, levels, hitches, doSwap, loadMs, compileMs, shownAt, longTasks, toCity, groundAt, root, urbis, context, pipe: () => pipe };

const ramp = (d, k) => { const s = SP_LODS[k].until, w = SP_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dtMs = now - last, dt = Math.min(dtMs / 1000, 0.1); last = now;
  if (frames > 30 && dtMs > 34) { hitches.push(Math.round(dtMs)); if (hitches.length > 50) hitches.shift(); }
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (flying) flying(now); else controls.update();
  const dist = model.distance(camera.position);
  let shownNow = [false, false, false], fadeNow = [1, 1, 1];
  if (forced === null && S.lod === "auto" && SMOOTH) {
    const t1 = ramp(dist, 0), t2 = ramp(dist, 1);
    const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
    const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
    setLodFades(levels, shown, fades);
    shownNow = shown; fadeNow = fades;
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? SP_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    setLodFades(levels, levels.map((_, i) => i === k), [1, 1, 1]);
    shownNow = levels.map((g) => g.visible);
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (flying && window.lab.flightRec) window.lab.flightRec.push({ t: now, dt: dtMs, d: dist, shown: [...shownNow], fade: [...fadeNow] });
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  const focus = controls.target;
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), focus, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 60, 450), dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${SP_LODS[0].until} m, LOD1 < ${SP_LODS[1].until} m, to the building's box; dithered cross-fades)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · GLB ${(LJ.glbBytes / 1048576).toFixed(2)} MB · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms, shaders ${compileMs.toFixed(0)} ms (before it shows)` +
      `\nlong tasks: ${longTasks.filter(([t]) => t > shownAt).length} after show · benchmark (median GPU ms, whole frame; + = the church): ${S.bench}` +
      (S.flight !== "—" ? `\nflight: ${S.flight}` : "");
  }
});
addEventListener("resize", fitFrame);
