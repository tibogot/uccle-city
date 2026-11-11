// THE POLICE LAB: the scripted Uccle police station (Commissariat Central, Rue Rouge 17; tools/blender/police_rouge.py ->
// models/police_rouge/, loaded by viewer/policeModel.js: the loader, LODs and slot materials the city uses) with its YARD
// (viewer/policeYard.js) at its real place, on the real ground (the station's 0.5 m DTM patch, models/police_rouge/
// site_dtm.*, draped with the 2024 orthophoto: the 8 cm crop when data/raw/refs/police_rouge/ is on disk, else the
// tiles' 25 cm), with the UrbIS neighbours within 130 m (the school, the Château de Wolvendael's solid), under the city's
// lighting and post chain. Built like labs/wolvendael-lab.js.
// NO PHOTO OVERLAY: the only street-level references are Google Street View panoramas, LOOK-ONLY (never stored or
// shipped); the "street view ..." viewpoints stand roughly where those panoramas were taken, for checking proportions
// by eye against a Street View opened beside the lab.
// LOD switch + auto LOD with the city's dithered cross-fades, the material-slot swap, a GPU benchmark (lab.bench()), the
// flicker test (lab.flicker()), moving frame strips (lab.strip()), grazing-light presets. Our own panel (viewer/panelUI.js).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, mix, smoothstep, positionWorld, uv, attribute, step, float } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { SMOOTH, fadeProxies, fadeVariant } from "../viewer/lodFade.js";
import { precompile } from "../viewer/warmup.js";
import { buildPoliceYard } from "../viewer/policeYard.js";
import { loadPolice, PO_LODS, PO_SLOTS, LIBRARY_NAMES, SLOT_TABLE, poLook, setLodFades, poLodState } from "../viewer/policeModel.js";

const qp = new URLSearchParams(location.search);
const longTasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longTasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch { /* no longtask API */ }
const $info = document.getElementById("info"), $notes = document.getElementById("notes");
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
// the street views' light: April 2024, overcast-bright; a spring afternoon sun by default
if (!qp.get("time")) { lighting.day = 110; lighting.hourOverride = 15.0; }

// ------------------------------------------------------------------------------------------------ the building
const t0 = performance.now();
const model = await loadPolice().catch((e) => { $info.textContent = "models/police_rouge/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const root = new THREE.Group();
root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY;
scene.add(root);
const levels = PO_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
root.visible = false;
const centre = model.boundsWorld.getCenter(new THREE.Vector3());
const SITE = await fetch("../models/police_rouge/site.json").then((r) => r.json());
const FRM = SITE.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
const toCity = (u, w) => [FRM.origin_city[0] + u * RC - w * RS, FRM.origin_city[1] + u * RS + w * RC];

// ------------------------------------------------------------------------------------------------ ground: the station's 0.5 m DTM patch
const DH = await fetch("../models/police_rouge/site_dtm.json").then((r) => r.json());
const DB = new Uint16Array(await fetch("../models/police_rouge/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = Math.min(Math.max((x - DH.x0) / DH.step, 0), DH.cols - 1.001), r = Math.min(Math.max((z - DH.z0) / DH.step, 0), DH.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, A = (i, j) => DB[j * DH.cols + i] / 100 + DH.base;
  return (A(c0, r0) * (1 - fc) + A(c0 + 1, r0) * fc) * (1 - fr) + (A(c0, r0 + 1) * (1 - fc) + A(c0 + 1, r0 + 1) * fc) * fr;
};
{
  const R = 95, S = 0.5;
  const g = new THREE.PlaneGeometry(2 * R, 2 * R, 2 * R / S, 2 * R / S).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + centre.x, z = p.getZ(i) + centre.z;
    p.setXYZ(i, x, groundAt(x, z) - 0.02, z);
  }
  g.computeVertexNormals();
  const tl = new THREE.TextureLoader();
  const load = (u) => tl.loadAsync(u).catch(() => null);
  const [crop, oE, oF] = await Promise.all([load("../data/raw/refs/police_rouge/ortho_2024_crop.jpg"),
    (async () => (await load("../data/raw/ortho/E4.jpg")) ?? (await load("../data/tiles/E4/ortho.jpg")))(),
    (async () => (await load("../data/raw/ortho/F4.jpg")) ?? (await load("../data/tiles/F4/ortho.jpg")))()]);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  for (const t of [crop, oE, oF]) if (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
  if (oE && oF) {
    // tiles: E4 x -1000..-500, F4 x -500..0, z -500..0 (25 cm); the crop: x -565..-465, z -400..-300 (8 cm)
    const p2 = positionWorld.xz;
    // (image rows run north -> south = z -500 -> 0: v flipped as in the Château Lab)
    const flip = (q) => q.mul(vec3(1, 0, -1).xz).add(vec3(0, 0, 1).xz);
    const tE = texture(oE, flip(p2.sub(vec3(-1000, 0, -500).xz).div(500))).rgb;
    const tF = texture(oF, flip(p2.sub(vec3(-500, 0, -500).xz).div(500))).rgb;
    let col = mix(tE, tF, step(-500.0, positionWorld.x));
    if (crop) {
      const cu = p2.sub(vec3(-565, 0, -400).xz).div(100);
      const inC = step(0.0, cu.x).mul(step(cu.x, 1.0)).mul(step(0.0, cu.y)).mul(step(cu.y, 1.0));
      col = mix(col, texture(crop, flip(cu)).rgb, inC);
    }
    const edge = smoothstep(R - 5, R - 20, positionWorld.xz.sub(vec3(centre.x, 0, centre.z).xz).length());
    m.colorNode = mix(vec3(0.12, 0.14, 0.1), col.mul(0.85), edge);
  } else m.color.set(0x55605a);
  var ground = new THREE.Mesh(g, m); ground.receiveShadow = true; ground.name = "terrain";
  scene.add(ground);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(centre.x, 44, centre.z); farG.receiveShadow = true;
  scene.add(farG);
}
// the yard (asphalt + markings) on the same ground
const yard = buildPoliceYard({ site: SITE, groundAt });
scene.add(yard.mesh);

// ------------------------------------------------------------------------------------------------ UrbIS: the solids it replaces + the neighbours (tiles E4 + F4)
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis() {
  const own = [], near = [];
  for (const T of ["E4", "F4"]) {
    const meta = await fetch(`../data/tiles/${T}/buildings.json`).then((r) => r.json());
    const bin = await fetch(`../data/tiles/${T}/buildings.bin`).then((r) => r.arrayBuffer());
    const V = new DataView(bin).getUint32(0, true);
    const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
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

// ------------------------------------------------------------------------------------------------ views (frame u, w, m TAW)
const VIEWS = {
  "street view n° 2 (wing A front, frontal)": { pos: [36.0, -12.5, 49.3], target: [14.6, -5.0, 52.6], fov: 62 },
  "street view n° 17 (the gate, the entrance)": { pos: [33.0, 15.5, 49.0], target: [12.0, 2.0, 51.8], fov: 58 },
  "street view n° 17 north (flags, both fronts)": { pos: [33.5, 4.5, 49.2], target: [10.0, 0.0, 52.5], fov: 62 },
  "street view n° 13 (from the north)": { pos: [33.0, -30.0, 49.2], target: [12.0, -8.0, 52.0], fov: 62 },
  "entrance corner (close-up)": { pos: [21.0, 6.0, 49.4], target: [13.0, 0.0, 49.8], fov: 50 },
  "the yard, patrol bays": { pos: [17.0, -16.0, 50.5], target: [23.0, 0.0, 47.5], fov: 55 },
  "blade sign + cornice (close-up)": { pos: [19.0, 3.0, 52.5], target: [14.8, -0.1, 52.4], fov: 40 },
  "roof (solar rows, plant)": { pos: [28.0, 22.0, 72.0], target: [5.0, -2.0, 58.8], fov: 45 },
  "back (ESTIMATED faces)": { pos: [-14.0, 26.0, 55.0], target: [2.0, 4.0, 53.0], fov: 50 },
  "grazing: wing A front": { pos: [19.0, -9.0, 53.0], target: [14.6, -4.0, 54.0], fov: 45, grazing: [-0.07, 0.16, 0.98] },
  "grazing: the entrance face": { pos: [11.0, 6.5, 49.2], target: [10.0, 0.5, 49.4], fov: 55, grazing: [0.98, 0.16, 0.17] },
  "LOD0 band (95 m)": { pos: [90.0, 30.0, 58.0], target: [8.0, 0.0, 53.0], fov: 35 },
  "far (500 m)": { pos: [420.0, 260.0, 130.0], target: [8.0, 0.0, 53.0], fov: 25 },
};
function goView(name) {
  const v = VIEWS[name]; if (!v) return;
  const [px, pz] = toCity(v.pos[0], v.pos[1]), [tx, tz] = toCity(v.target[0], v.target[1]);
  camera.position.set(px, Math.max(v.pos[2], groundAt(px, pz) + 0.3), pz);
  controls.target.set(tx, v.target[2], tz); camera.fov = v.fov; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0); camera.lookAt(controls.target);
  if (v.grazing) setGrazing(v.grazing);
  S.view = name;
}
/** a low sun skimming a facade: d = the light's direction TOWARD the sun in the frame (u, up, w) */
function setGrazing(d) {
  const [x, z] = [d[0] * RC - d[2] * RS, d[0] * RS + d[2] * RC];
  const az = Math.atan2(x, -z), el = Math.asin(d[1] / Math.hypot(...d));
  lighting.setSunDirection?.(new THREE.Vector3(x, d[1], z).normalize());
  S.grazeInfo = `sun az ${(az * 180 / Math.PI).toFixed(0)} el ${(el * 180 / Math.PI).toFixed(0)} deg`;
  lab.grazeDir = new THREE.Vector3(x, d[1], z).normalize();
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
const firstView = Object.keys(VIEWS)[0];
const S = {
  lod: "auto", show: "new model", wireframe: false, view: firstView, notes: true, neighbours: true, yard: true,
  time: preset, hour: lighting.hourOverride ?? lighting.hour, day: lighting.day, post: true, ao: 1, aoDirect: 0.55, thinFar: 1, relief: 1, weather: 1,
  refl: 1, slot: "brick_yellow", swap: "table default (temporary)", swapAll: false,
  stats: "", lodInfo: "", bench: "—", swapInfo: "—", fadeAlways: false, flicker: "—", grazeInfo: "—",
};
const ui = new Panel({ title: "Police Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(VIEWS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
fv.add(S, "grazeInfo").name("grazing sun").listen();
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solid (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "neighbours").name("UrbIS neighbours").onChange((v) => { neighbours.visible = v; });
fm.add(S, "yard").name("yard (asphalt, markings)").onChange((v) => { yard.mesh.visible = v; });
fm.add(S, "wireframe").onChange((v) => { for (const s of PO_SLOTS) { model.materials[s].wireframe = v; if (SMOOTH) fadeVariant(model.materials[s]).wireframe = v; } });
fm.add(S, "lodInfo").name("LOD now");
const fs = ui.addFolder("Material slots (adapter table)");
fs.add(S, "slot", PO_SLOTS).name("GLB slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("-> material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
fs.add(S, "swapInfo").name("last swap");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; lab.grazeDir = null; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; lab.grazeDir = null; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { poLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { poLook.aoDirect.value = v; });
fl.add(S, "thinFar", 0, 1, 0.01).name("thin parts far away shade like the wall (anti-sparkle)").onChange((v) => { poLook.thinFar.value = v; });
fl.add(S, "relief", 0, 2, 0.05).name("brick / stone / hedge relief").onChange((v) => { poLook.relief.value = v; });
fl.add(S, "refl", 0, 2, 0.05).name("glass / solar reflection").onChange((v) => { poLook.glassRefl.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms (station per LOD, yard) at this view");
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
  const slots = S.swapAll ? PO_SLOTS : [S.slot];
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
<h3>References</h3>
<ul><li><b>Free</b>: UrbIS solids 528055 + 528772, DSM / DTM 2021 0.5 m, Ortho 2024 (paradigm.brussels, CC0): the footprint, roof level, roof plant and
solar rows, the yard's markings, wall line, gate openings, parked cars' bays.</li>
<li><b>Look-only</b>: Google Street View, April 2024, four panoramas on Rue Rouge: never traced, stored or shipped; the "street view" viewpoints stand
near them (no photo overlay: compare by eye with a Street View opened beside the lab). Wikimedia Commons has no photo of the station.</li></ul>
<h3>Measured</h3><ul>
<li>frame rotated ${FRM.rotation_deg} deg; roof deck ${N.measured.levels_taw.deck}, cornice top ${N.measured.levels_taw.cornice_top} (UrbIS eaves 58.69, top 58.85); ground floor ${N.measured.levels_taw.gf}</li>
<li>yard: the street wall along u ${N.yard.wall_u.join("-")}, the vehicle gate w ${N.yard.gate_s_w.join("..")}, the north gate w ${N.yard.gate_n_w.join("..")}</li></ul>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")}; yard ${yard.tris} tris / 1 draw;
GLB ${((LJ.glbBytes ?? 0) / 1048576).toFixed(2)} MB (meshopt); AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU (${N.lightmap.px}² R8 + mips, ${N.lightmap.lod0_px_per_m} px/m mean); load ${loadMs.toFixed(0)} ms.
Slots: ${PO_SLOTS.join(", ")} (adapter table -> any of the ${LIBRARY_NAMES.length} library names). The sign carries plain "POLICE / POLITIE" lettering, no emblem.</p>
<h3>Sources</h3><p>UrbIS (paradigm.brussels) CC0; police.be (zone 5342), BX1 / La Libre 2025; models/police_rouge/NOTES.md (facade by facade).</p>`;
$notes.style.display = qp.get("notes") === "0" ? "none" : "block";
if (qp.get("notes") === "0") S.notes = false;

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const tc0 = performance.now();
const fadeCopies = fadeProxies(root);
if (fadeCopies) { fadeCopies.position.copy(root.position); fadeCopies.rotation.copy(root.rotation); fadeCopies.updateMatrixWorld(true); }
root.visible = true;
await precompile(renderer, fadeCopies ? [scene, fadeCopies] : [scene], camera, scene, { target: pipe.passTarget ?? null, mrt: pipe.passMRT ?? null });
const compileMs = performance.now() - tc0;
const shownAt = performance.now();
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const lab = window.lab = {};
goView(qp.get("view") && VIEWS[qp.get("view")] ? qp.get("view") : firstView);

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let forced = null, yardForced = null;
/** GPU ms (median of the whole frame) interleaved over `cycles` cycles of 1.2 s windows: station off / L0 / L1 / L2 with
 *  the yard OFF, then the yard off / on with the station as the auto LOD shows it. + = the part's cost. (NOISY: another
 *  WebGPU tab of the owner's may run on the same GPU) */
async function bench({ cycles = 4, win = 1200 } = {}) {
  const modes = [["off", false], [0, false], [1, false], [2, false], [null, false], [null, true]];
  const acc = modes.map(() => []);
  for (let c = 0; c < cycles; c++) for (let i = 0; i < modes.length; i++) {
    forced = modes[i][0]; yardForced = modes[i][1];
    await new Promise((r) => setTimeout(r, 300));
    gpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, win));
    acc[i].push(...gpu.samples);
  }
  forced = null; yardForced = null;
  const med = acc.map((s) => { s = [...s].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; });
  const off = med[0];
  const res = { view: S.view, none: +off.toFixed(2), L0: +(med[1] - off).toFixed(2), L1: +(med[2] - off).toFixed(2), L2: +(med[3] - off).toFixed(2),
    yardOff: +med[4].toFixed(2), yard: +(med[5] - med[4]).toFixed(2) };
  S.bench = `station L0 +${res.L0} L1 +${res.L1} L2 +${res.L2} · yard +${res.yard} · none ${res.none} ms`;
  console.log("[police lab] bench", JSON.stringify(res));
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
const hitches = [];
Object.assign(lab, { force: (m) => { forced = m; }, forceYard: (v) => { yardForced = v; }, renderer, scene, camera, controls, model, lighting, goView, bench, gpu, S, VIEWS, levels,
  hitches, doSwap, loadMs, compileMs, shownAt, longTasks, toCity, groundAt, root, urbis, neighbours, yard, poLook, setGrazing, pipe: () => pipe });

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const frame = (dtFixed = null) => {
  const now = performance.now(), dtMs = now - last; last = now;
  const dt = dtFixed ?? Math.min(dtMs / 1000, 0.1);
  if (frames > 30 && dtMs > 34) { hitches.push(Math.round(dtMs)); if (hitches.length > 50) hitches.shift(); }
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  const dist = model.distance(camera.position);
  if (forced === null && S.lod === "auto" && SMOOTH) {
    const { shown, fades } = poLodState(dist);
    setLodFades(levels, shown, fades);
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? PO_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    setLodFades(levels, levels.map((_, i) => i === k), levels.map(() => 1));
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (S.fadeAlways && SMOOTH) for (const g of levels) if (g.visible) for (const o of g.children) o.material = fadeVariant(o.userData.base);
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  yard.mesh.visible = yardForced ?? S.yard;
  camera.updateMatrixWorld();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 50, 420), dt);
  if (lab.grazeDir && lighting.sun) {
    // grazing presets: the sun put along the wanted direction after the lighting's own update (shadow box kept)
    const L = lighting.sun; const tgt = L.target?.position ?? controls.target;
    L.position.copy(tgt).addScaledVector(lab.grazeDir, 200); L.updateMatrixWorld();
  }
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${PO_LODS[0].until} m ±${PO_LODS[0].band}, LOD1 < ${PO_LODS[1].until} m ±${PO_LODS[1].band}, to the building's box)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · yard ${yard.tris} tris · GLB ${((LJ.glbBytes ?? 0) / 1048576).toFixed(2)} MB · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms, shaders ${compileMs.toFixed(0)} ms (before it shows)` +
      `\nlong tasks: ${longTasks.filter(([t]) => t > shownAt).length} after show · benchmark: ${S.bench}`;
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
    console.log("[police lab] flicker", JSON.stringify({ ...r, heatURL: undefined }));
    return r;
  } finally { lab.resume(); }
};
lab.strip = async (opts = {}) => {
  const { frameStrip, showSheet } = await import("./frameStrip.js");
  lab.pause();
  try {
    const r = await frameStrip({ renderFrame: (dt) => frame(dt), canvas: renderer.domElement, camera, controls, label: () => S.lodInfo, ...opts });
    if (opts.show !== false) showSheet(r);
    return { labels: r.labels, width: r.width, height: r.height, url: r.url };
  } finally { lab.resume(); }
};
/** put the camera at (u, w, h) looking at (u, w, h) in the building frame */
lab.look = (p, t, fov = 40) => {
  const [x, z] = toCity(p[0], p[1]), [tx, tz] = toCity(t[0], t[1]);
  camera.position.set(x, p[2], z); controls.target.set(tx, t[2], tz); camera.lookAt(controls.target);
  camera.fov = fov; camera.updateProjectionMatrix();
};
/** a camera path in the building frame: from (u, w, h) a to b looking at target (u, w, h) */
lab.pathUWH = (a, b, tgt) => (t) => {
  const u = a[0] + (b[0] - a[0]) * t, w = a[1] + (b[1] - a[1]) * t, h = a[2] + (b[2] - a[2]) * t;
  const [x, z] = toCity(u, w), [tx, tz] = toCity(tgt[0], tgt[1]);
  return { pos: [x, h, z], target: [tx, tgt[2], tz] };
};
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
