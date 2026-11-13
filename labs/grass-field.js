// THE GRASS FIELD LAB: the city's grass (viewer/grass/) alone on a gently rolling test field, to tune its LOOK
// (docs/GRASS.md §10). Nothing else is in the scene: the city's textured ground (ground.js, so the blades stand on the
// colour they converge to), the city's sky, sun, fog and post chain (lighting.js, post.js), the grass system exactly as
// the city builds it (sun + sky lights, preset). The field is a lab showcase ground, not Uccle data.
//   - one grass TYPE over the whole field (grassTypes.js KIND / LAWN / ROADSIDE_VERGE, grassField.js ISLAND_VERGE),
//     or a mix: the type with a patch of another one (an edge to look at);
//   - live sliders for every value that drives the look; "Copy settings" = a JSON of what differs from the city's
//     defaults, which docs/GRASS.md §10 maps onto the code. Settings live in the URL hash (+ localStorage).
// URL: ?preset=low|medium|high|ultra (the quality preset is chosen at construction, as in the city: caps, Lambert),
//      ?w=&h= (fixed canvas size), ?gpu=0 (no timestamp queries). window.lab for the console.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS as TIMES } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { groundMaterial, setGroundTextures, groundLook } from "../viewer/ground.js";
import { loadGroundTextures } from "../viewer/materials/groundTex.js";
import { wind } from "../viewer/foliage/wind.js";
import { setDay, season, dayLabel } from "../viewer/seasons/season.js";
import { Grass, grassU, PRESETS as QUALITY } from "../viewer/grass/grass.js";
import { KIND, LAWN, ROADSIDE_VERGE } from "../viewer/grass/grassTypes.js";
import { ISLAND_VERGE } from "../viewer/grass/grassField.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const say = (s) => { $info.textContent = s; console.log("[grass field]", s); };

// ------------------------------------------------------------------------------------------------ the type tables
// [density, length, dry, flowers] per type; label, and where the city keeps it
const TYPE_INFO = {
  lawn: ["lawn (private gardens, unmapped green)", "grassTypes.js LAWN"],
  garden: ["garden lawn (OSM garden, mown)", "grassTypes.js KIND.garden"],
  pitchGrass: ["sports pitch (grass)", "grassTypes.js KIND.pitchGrass"],
  cemetery: ["cemetery", "grassTypes.js KIND.cemetery"],
  park: ["park", "grassTypes.js KIND.park"],
  village_green: ["village green", "grassTypes.js KIND.village_green"],
  grass: ["public green (landuse=grass)", "grassTypes.js KIND.grass"],
  dog_park: ["dog park", "grassTypes.js KIND.dog_park"],
  island: ["traffic island / median", "grassField.js ISLAND_VERGE"],
  verge: ["roadside verge", "grassTypes.js ROADSIDE_VERGE"],
  orchard: ["orchard", "grassTypes.js KIND.orchard"],
  heath: ["heath", "grassTypes.js KIND.heath"],
  scrub: ["scrub edge", "grassTypes.js KIND.scrub"],
  grassland: ["grassland", "grassTypes.js KIND.grassland"],
  meadow: ["meadow", "grassTypes.js KIND.meadow"],
};
const CITY_TYPES = { lawn: LAWN, verge: ROADSIDE_VERGE, island: ISLAND_VERGE };
for (const [k, v] of Object.entries(KIND)) if (k !== "none") CITY_TYPES[k] = v;
const TYPE_IDS = Object.keys(TYPE_INFO).filter((k) => CITY_TYPES[k]);
const types = Object.fromEntries(TYPE_IDS.map((k) => [k, [...CITY_TYPES[k]]]));   // the lab's working copy

// ------------------------------------------------------------------------------------------------ renderer, light
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const W0 = +qp.get("w") || innerWidth, H0 = +qp.get("h") || innerHeight;
renderer.setSize(W0, H0);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
if (!Grass.supported(renderer)) { say("The grass needs the WebGPU backend (this browser fell back to WebGL2)."); throw new Error("no WebGPU"); }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W0 / H0, 0.05, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
const lighting = new Lighting(scene, renderer, "golden");

// ------------------------------------------------------------------------------------------------ the field ground
say("ground textures…");
setGroundTextures(await loadGroundTextures(renderer).catch(() => null));
const SIZE = 600, STEP = 2, N = SIZE / STEP + 1, BASE_Y = 80;          // m; 80 m TAW: on Uccle's slopes (the haze's floor is 40 m)
const B = { x0: -SIZE / 2, x1: SIZE / 2, z0: -SIZE / 2, z1: SIZE / 2 };
const field = { hills: 1 };
/** the showcase ground: a few long gentle swells (max slope ~12 % at hills 1: grass grows on all of it) */
const hillAt = (x, z) => field.hills * (3.2 * Math.sin(x / 70 + 1.3) * Math.cos(z / 90 - 0.4) + 1.6 * Math.sin((0.6 * x + 0.8 * z) / 38 + 2.0)
  + 0.5 * Math.sin((-0.7 * x + 0.7 * z) / 15 + 0.7) + 0.9 * Math.cos((0.9 * x - 0.4 * z) / 55));
const tg = new THREE.BufferGeometry();
const pos = new Float32Array(N * N * 3), idx = new Uint32Array((N - 1) * (N - 1) * 6);
for (let j = 0, t = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
  const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
  idx.set([a, c, b, b, c, d], t); t += 6;
}
tg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
tg.setIndex(new THREE.BufferAttribute(idx, 1));
function buildGround() {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = B.x0 + i * STEP, z = B.z0 + j * STEP, k = (j * N + i) * 3;
    pos[k] = x; pos[k + 1] = BASE_Y + hillAt(x, z); pos[k + 2] = z;
  }
  tg.attributes.position.needsUpdate = true;
  tg.computeVertexNormals();
  tg.computeBoundingSphere(); tg.computeBoundingBox();
}
buildGround();
/** the drawn surface's height (the same two triangles per cell as the mesh): the camera's ground */
function groundAt(x, z) {
  const gx = Math.min(N - 1.001, Math.max(0, (x - B.x0) / STEP)), gz = Math.min(N - 1.001, Math.max(0, (z - B.z0) / STEP));
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const h = (ii, jj) => pos[((jj * N) + ii) * 3 + 1];
  const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
  return fx + fz < 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
// land cover: all zero = grass everywhere (no wood, path, sand or water); no orthophoto (no far hand-over)
const coverTex = new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4, THREE.RGBAFormat);
coverTex.needsUpdate = true;
const terrain = new THREE.Mesh(tg, groundMaterial({ tex: coverTex, ortho: null }, B, null));
terrain.receiveShadow = true; terrain.name = "field-ground";
scene.add(terrain);

// ------------------------------------------------------------------------------------------------ the grass
const presetName = QUALITY[qp.get("preset")] ? qp.get("preset") : "high";
const grass = new Grass(renderer, { preset: presetName, lights: [lighting.sun, lighting.hemi].filter(Boolean) });   // as cityGrass.js
grass.groundAt = groundAt;
scene.add(grass.group);
// the types raster (1 m/px, as grassTypes.js): the whole field one type, or the type with a patch of another
const TW = SIZE, TH = SIZE;
const typesData = { data: new Uint8Array(TW * TH * 4), W: TW, H: TH };
const L = { type: "meadow", mix: false, patch: "lawn", patchR: 18, patchAt: 22 };   // the field's layout (lab settings)
function paintTypes() {
  const d = typesData.data, base = types[L.type], pt = types[L.patch];
  const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const bq = base.map(q), pq = pt.map(q);
  // the patch: a blob ahead of the start view (+z), its edge wobbling a little (a mown lawn's real outline is no circle)
  const cx = -B.x0, cz = -B.z0 + L.patchAt;
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    let v = bq;
    if (L.mix) {
      const dx = i + 0.5 - cx, dz = j + 0.5 - cz, a = Math.atan2(dz, dx);
      const r = L.patchR * (1 + 0.12 * Math.sin(3 * a + 0.8) + 0.06 * Math.sin(7 * a + 2.1));
      if (dx * dx + dz * dz < r * r) v = pq;
    }
    const k = (j * TW + i) * 4;
    d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = v[3];
  }
}
paintTypes();
grass.field.addTile("field", { terrain, cover: coverTex, types: typesData, bounds: B });
const typesTex = grass.field.tiles.get("field").textures[0];
function rebake() { paintTypes(); typesTex.image.data = typesData.data; typesTex.needsUpdate = true; grass.field.dirty = true; }

// ------------------------------------------------------------------------------------------------ the settings model
// every tunable: { id, group, get, set, def, kind: 'num'|'color'|'bool'|'str' }; the defaults are the city's values,
// read from the code at load (before any saved settings are applied)
const P = [];
const colorOf = (c) => [+c.r.toFixed(4), +c.g.toFixed(4), +c.b.toFixed(4)];
const U = (k, kind = "num") => {
  const u = grassU[k];
  const p = kind === "color"
    ? { id: k, group: "grassU", kind, get: () => colorOf(u.value), set: (v) => u.value.setRGB(v[0], v[1], v[2]) }
    : { id: k, group: "grassU", kind, get: () => u.value, set: (v) => { u.value = v; if (k === "d0" || k === "d0Lawn" || k === "d0Long" || k === "rmax") grass.sizeLevels(); } };
  p.def = p.get(); P.push(p); return p;
};
const SEASONAL = new Set(["height", "dry", "frost", "tint"]);       // driven by the day of the year (grass.syncSeason)
for (const k of ["density", "d0", "reach", "rmax", "maxWiden", "minPixels", "lod0", "lod1", "wideLong", "seedHeads", "sheen", "tip", "root", "conv", "flat",
  "hBase", "hLong", "hPow", "hVar", "wBase", "wVar", "clumpLawn", "clumpLong", "clumpSizeLawn", "clumpSizeLong", "leanLawn", "leanLong", "windLawn", "windLong",
  "d0Lawn", "d0Long", "reachLawn", "reachLong", "seedLift", "flowerShare", "flowerSize", "scatter", "hueVar", "convNear", "convFar"]) U(k);
for (const k of ["colLawn", "colRough", "colDry", "straw", "petal0", "petal1", "petal2", "petal3", "seed0", "seed1", "seed2", "seedRipe"]) U(k, "color");
const PRESET_KEYS = new Set(["density", "d0", "reach", "rmax"]);    // these four belong to the quality preset (grass.js PRESETS)
for (const k of ["height", "dry", "frost"]) { const p = { id: k, group: "season", kind: "num", get: () => grassU[k].value, set: (v) => { grassU[k].value = v; } }; P.push(p); }
P.push({ id: "tint", group: "season", kind: "color", get: () => colorOf(grassU.tint.value), set: (v) => grassU.tint.value.setRGB(v[0], v[1], v[2]) });
const W = (id, prop, u) => { const p = { id, group: "wind", kind: "num", get: () => (u ? wind[u].value : wind[prop]), set: (v) => { if (u) wind[u].value = v; else wind[prop] = v; } }; p.def = p.get(); P.push(p); };
W("speed", "speed"); W("direction", "direction"); W("gust", "gust"); W("gustSize", null, "uScale"); W("gustSpeed", null, "uRate");
const GL = groundLook();
if (GL) for (const [id, u] of [["groundRough", "uRough"], ["groundDry", "uDry"]]) {
  const p = { id, group: "ground", kind: "num", get: () => GL[u].value, set: (v) => { GL[u].value = v; grass.field.dirty = true; } };
  p.def = p.get(); P.push(p);
}
for (const k of TYPE_IDS) {
  const p = { id: k, group: "types", kind: "type", get: () => [...types[k]], set: (v) => { types[k] = v.map(Number); }, def: [...CITY_TYPES[k]] };
  P.push(p);
}
// lab-only settings (not city values): the field, light, season, view
const lab = { type: L.type, mix: L.mix, patch: L.patch, patchR: L.patchR, patchAt: L.patchAt, hills: 1, time: "golden", hour: -1, day: 200,
  seasonOverride: false, post: true, walk: false };
const LAB_DEF = { ...lab };
const byId = (g, id) => P.find((p) => p.group === g && p.id === id);
const same = (a, b) => (Array.isArray(a) ? a.every((x, i) => Math.abs(x - b[i]) < 1e-6) : typeof a === "number" ? Math.abs(a - b) < 1e-6 : a === b);

/** what differs from the city's defaults: { grassU, preset, types, wind, ground, lab } */
function changed() {
  const out = {};
  const put = (g, k, v) => { (out[g] ||= {})[k] = v; };
  for (const p of P) {
    if (p.group === "season") { if (lab.seasonOverride) put("season", p.id, p.get()); continue; }
    const v = p.get();
    if (same(v, p.def)) continue;
    const g = p.group === "grassU" && PRESET_KEYS.has(p.id) ? "preset" : p.group;
    put(g, p.id, typeof v === "number" ? +v.toFixed(5) : v);
  }
  if (out.preset) out.preset = { name: presetName, ...out.preset };
  for (const [k, v] of Object.entries(lab)) if (!same(v, LAB_DEF[k])) put("lab", k, v);
  return out;
}
function applySettings(o) {
  if (!o) return;
  for (const [g, vals] of Object.entries(o)) {
    if (g === "lab") { Object.assign(lab, vals); continue; }
    for (const [k, v] of Object.entries(vals)) {
      if (g === "preset" && k === "name") continue;
      const p = byId(g === "preset" ? "grassU" : g, k);
      if (p) p.set(v);
    }
  }
}
const STORE = "grassFieldLab.v1";
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const c = changed(), s = JSON.stringify(c);
    try { localStorage.setItem(STORE, s); } catch { /* storage blocked: the hash still keeps it */ }
    history.replaceState(null, "", location.pathname + location.search + (Object.keys(c).length ? "#s=" + encodeURIComponent(s) : ""));
    out.json = JSON.stringify(c, null, 1);
    jsonBox.value = out.json;
  }, 250);
}
function loadSaved() {
  const m = location.hash.match(/s=([^&]+)/);
  try { if (m) return JSON.parse(decodeURIComponent(m[1])); } catch { /* bad hash */ }
  try { const s = localStorage.getItem(STORE); if (s) return JSON.parse(s); } catch { /* no storage */ }
  return null;
}

// ------------------------------------------------------------------------------------------------ light, season
function applyLight() {
  if (lighting.preset !== lab.time) { lighting.apply(lab.time); pipe?.look(lab.time); }
  lighting.hourOverride = lab.hour >= 0 ? lab.hour : null;
  lighting.day = lab.day;
}
function applySeason() {
  setDay(lab.day);
  if (!lab.seasonOverride) grass.syncSeason();
  else for (const p of P) if (p.group === "season" && p._ov) p.set(p._ov);
}
// the season sliders keep their own override values (used while "override the season" is on)
for (const p of P) if (p.group === "season") { p._ov = null; const set0 = p.set; p.set = (v) => { p._ov = v; if (lab.seasonOverride) set0(v); }; p.setRaw = set0; }

// saved settings first (types + uniforms + lab), then the field and light from them
const saved = loadSaved();
applySettings(saved);
if (saved?.season) for (const [k, v] of Object.entries(saved.season)) { const p = byId("season", k); if (p) p._ov = v; }
Object.assign(L, { type: lab.type, mix: lab.mix, patch: lab.patch, patchR: lab.patchR, patchAt: lab.patchAt });
if (lab.hills !== 1) { field.hills = lab.hills; buildGround(); }
rebake();

// ------------------------------------------------------------------------------------------------ camera: orbit + walk
const keys = new Set();
addEventListener("keydown", (e) => { if (e.target.closest?.(".upanel")) return; keys.add(e.code); });
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
const look = { yaw: 0, pitch: -0.08, drag: null };
renderer.domElement.addEventListener("pointerdown", (e) => { if (lab.walk) { look.drag = [e.clientX, e.clientY]; renderer.domElement.setPointerCapture(e.pointerId); } });
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!lab.walk || !look.drag) return;
  look.yaw -= (e.clientX - look.drag[0]) * 0.004; look.pitch = Math.max(-1.4, Math.min(1.4, look.pitch - (e.clientY - look.drag[1]) * 0.004));
  look.drag = [e.clientX, e.clientY];
});
renderer.domElement.addEventListener("pointerup", () => { look.drag = null; });
const EYE = 1.7;
function setWalk(on) {
  lab.walk = on; controls.enabled = !on;
  if (on) {
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    look.yaw = Math.atan2(-d.x, -d.z); look.pitch = Math.max(-1.4, Math.asin(Math.max(-1, Math.min(1, d.y))));
  } else {
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    controls.target.copy(camera.position).addScaledVector(d, 12); controls.update();
    grass.push.clear(4);
  }
}
const walkPrev = new THREE.Vector3();
function walkStep(dt) {
  const sp = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4.5 : 1.4) * dt;
  const fx = -Math.sin(look.yaw), fz = -Math.cos(look.yaw);
  let mx = 0, mz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) { mx += fx; mz += fz; }
  if (keys.has("KeyS") || keys.has("ArrowDown")) { mx -= fx; mz -= fz; }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) { mx += fz; mz -= fx; }
  if (keys.has("KeyD") || keys.has("ArrowRight")) { mx -= fz; mz += fx; }
  const m = Math.hypot(mx, mz);
  walkPrev.copy(camera.position);
  if (m > 0) { camera.position.x += (mx / m) * sp; camera.position.z += (mz / m) * sp; }
  const lim = SIZE / 2 - 60;
  camera.position.x = Math.max(-lim, Math.min(lim, camera.position.x)); camera.position.z = Math.max(-lim, Math.min(lim, camera.position.z));
  camera.position.y = groundAt(camera.position.x, camera.position.z) + EYE;
  camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
  // the walker lays the grass down (as the city's walker, cityGrass.js pusher 4)
  const gy = camera.position.y - EYE, k = dt > 0 ? 1 / dt : 0;
  grass.push.set(4, { x: camera.position.x, y: gy, z: camera.position.z, radius: 0.32, strength: 0.8, vx: (camera.position.x - walkPrev.x) * k, vz: (camera.position.z - walkPrev.z) * k, ground: gy });
}
/** preset views. The patch (mix) lies ahead of the start (+z). */
const VIEWS = {
  "eye level in the field": () => orbitAt(0, 0, 1.7, 0, 20, 0.9),
  "low, grazing (35 cm)": () => orbitAt(0, 0, 0.35, 3, 14, 0.15),
  "20 m up": () => orbitAt(-22, -14, 20, 0, 20, 0),
  "backlit golden hour": () => {
    lab.time = "golden"; lab.hour = -1; applyLight(); refreshAll();
    lighting.update(camera.position.y, 0, controls.target, 140);
    const s = lighting.sunDir, h = Math.hypot(s.x, s.z) || 1;
    orbitAt(0, 0, 1.5, (s.x / h) * 20, (s.z / h) * 20, 0.6);
    save();
  },
  "the patch's edge (mix)": () => { if (!lab.mix) { lab.mix = true; L.mix = true; rebake(); refreshAll(); save(); } orbitAt(-L.patchR - 6, L.patchAt - 6, 1.7, -L.patchR + 2, L.patchAt + 2, 0.4); },
};
function orbitAt(x, z, eye, tx, tz, ty) {
  if (lab.walk) setWalk(false);
  camera.position.set(x, groundAt(x, z) + eye, z);
  controls.target.set(tx, groundAt(tx, tz) + ty, tz); controls.update();
  if (lab.walk) setWalk(true);
}

// ------------------------------------------------------------------------------------------------ the panel
const ui = new Panel({ title: "Grass Field Lab" });
const refreshers = [];
const refreshAll = () => { for (const c of ui.controllersRecursive()) c.updateDisplay(); for (const f of refreshers) f(); };
const note = (folder, text) => { const d = document.createElement("div"); d.className = "unote"; d.textContent = text; folder.body.append(d); };
/** a slider bound to a settings entry */
function num(folder, g, id, min, max, step, label) {
  const p = byId(g, id);
  const o = { get v() { return p.group === "season" ? (p._ov ?? p.get()) : p.get(); }, set v(x) { p.set(x); } };
  return folder.add(o, "v", min, max, step).name(label).onChange(() => save());
}
/** a colour picker (sRGB on screen, linear in the uniform) bound to a settings entry */
function colorRow(folder, g, id, label) {
  const p = byId(g, id), r = folder.row(label), inp = document.createElement("input");
  inp.type = "color"; r.append(inp);
  const c = new THREE.Color();
  const read = () => { const v = p.group === "season" ? (p._ov ?? p.get()) : p.get(); c.setRGB(v[0], v[1], v[2]); inp.value = "#" + c.getHexString(); };
  inp.oninput = () => { c.set(inp.value); p.set(colorOf(c)); save(); };
  read(); refreshers.push(read);
}

// field
const fF = ui.addFolder("Field");
fF.add(lab, "type", TYPE_IDS).name("type (whole field)").onChange((v) => { L.type = v; edit.type = v; rebake(); refreshAll(); save(); });
fF.add(lab, "mix").name("mix: add a patch").onChange((v) => { L.mix = v; rebake(); save(); });
fF.add(lab, "patch", TYPE_IDS).name("patch type").onChange((v) => { L.patch = v; rebake(); save(); });
fF.add(lab, "patchR", 4, 60, 1).name("patch radius m").onChange((v) => { L.patchR = v; rebake(); save(); });
fF.add(lab, "patchAt", 0, 80, 1).name("patch centre ahead m").onChange((v) => { L.patchAt = v; rebake(); save(); });
fF.add(lab, "hills", 0, 2.5, 0.05).name("hills x (rebuild)").onChange((v) => { field.hills = v; buildGround(); grass.field.dirty = true; save(); });
note(fF, "Type and patch changes re-bake the grass field (a few ms): no shader rebuild.");

// type values
const fT = ui.addFolder("Type values (grassTypes.js)");
const edit = { type: lab.type, get dens() { return types[this.type][0]; }, set dens(v) { types[this.type][0] = v; }, get len() { return types[this.type][1]; }, set len(v) { types[this.type][1] = v; },
  get dry() { return types[this.type][2]; }, set dry(v) { types[this.type][2] = v; }, get flowers() { return types[this.type][3]; }, set flowers(v) { types[this.type][3] = v; }, info: "", src: "" };
fT.add(edit, "type", TYPE_IDS).name("edit type").onChange(() => refreshAll());
fT.add(edit, "src").name("city table").listen();
const onType = () => { rebake(); save(); };
fT.add(edit, "dens", 0, 1, 0.01).name("density").onChange(onType).listen();
fT.add(edit, "len", 0, 1, 0.01).name("length (-> height)").onChange(onType).listen();
fT.add(edit, "dry", 0, 1, 0.01).name("dryness (straw)").onChange(onType).listen();
fT.add(edit, "flowers", 0, 1, 0.01).name("flowers").onChange(onType).listen();
fT.add(edit, "info").name("blade height").listen();
fT.add({ go: () => { types[edit.type] = [...CITY_TYPES[edit.type]]; onType(); } }, "go").name("reset this type");
note(fT, "Re-bake (instant). The field's ground noise still makes rough patches longer and dry patches thinner, as in the city. Length drives height, width, clumping, lean, wind and seed heads through the sliders below (lawn end = length 0, long end = length 1).");
const updateEditInfo = () => {
  const len = edit.len, H = grassU.hBase.value + Math.pow(len, grassU.hPow.value) * grassU.hLong.value, v = grassU.hVar.value / 2;
  edit.info = `${(H * (1 - v) * 100).toFixed(0)}-${(H * (1 + v) * 100).toFixed(0)} cm (x season ${grassU.height.value.toFixed(2)})`;
  edit.src = TYPE_INFO[edit.type][1];
};

// blade shape
const fS = ui.addFolder("Blade shape by length (grass.js)");
num(fS, "grassU", "hBase", 0.01, 0.2, 0.001, "height lawn m");
num(fS, "grassU", "hLong", 0.1, 1.2, 0.01, "height + long m");
num(fS, "grassU", "hPow", 0.5, 3, 0.05, "height curve (len^)");
num(fS, "grassU", "hVar", 0, 1.2, 0.01, "height spread");
num(fS, "grassU", "wBase", 0.001, 0.015, 0.0005, "width lawn m");
num(fS, "grassU", "wideLong", 0, 0.025, 0.0005, "width + long m");
num(fS, "grassU", "wVar", 0, 1, 0.01, "width spread");
num(fS, "grassU", "maxWiden", 1, 4, 0.05, "max widen far");
num(fS, "grassU", "clumpLawn", 0, 1, 0.01, "clumping lawn");
num(fS, "grassU", "clumpLong", 0, 1, 0.01, "clumping long");
num(fS, "grassU", "clumpSizeLawn", 0.05, 1, 0.01, "clump size lawn m");
num(fS, "grassU", "clumpSizeLong", 0.1, 2, 0.01, "clump size long m");
num(fS, "grassU", "leanLawn", 0, 0.6, 0.01, "rest lean lawn");
num(fS, "grassU", "leanLong", 0, 0.9, 0.01, "rest lean long");
fS.close();

// colour
const fC = ui.addFolder("Colour (grass.js)");
num(fC, "grassU", "root", 0.05, 1, 0.01, "root brightness");
num(fC, "grassU", "tip", 0.5, 2, 0.01, "tip brightness");
colorRow(fC, "grassU", "colLawn", "mid: lawn");
colorRow(fC, "grassU", "colRough", "mid: rough");
colorRow(fC, "grassU", "colDry", "mid: dry");
colorRow(fC, "grassU", "straw", "straw (dry blades)");
num(fC, "grassU", "scatter", 0, 1, 0.01, "brightness spread");
num(fC, "grassU", "hueVar", 0, 3, 0.05, "hue spread x");
num(fC, "grassU", "flat", 0, 1, 0.01, "flat normal (share up)");
num(fC, "grassU", "conv", 0, 1, 0.01, "converge to ground");
num(fC, "grassU", "convNear", 0, 30, 0.5, "converge from m");
num(fC, "grassU", "convFar", 5, 80, 0.5, "converge to m");
note(fC, "mid colours = the textured ground's mean colours (ground.json): change them and blades no longer sit on the ground's colour.");
fC.close();

// seed heads + flowers
const fH = ui.addFolder("Seed heads & flowers (grass.js)");
num(fH, "grassU", "seedHeads", 0, 0.8, 0.01, "seed-head share");
num(fH, "grassU", "seedLift", 0, 0.6, 0.01, "seed stalk above leaves");
colorRow(fH, "grassU", "seed0", "panicle pale");
colorRow(fH, "grassU", "seed1", "panicle pinkish");
colorRow(fH, "grassU", "seed2", "panicle brown");
colorRow(fH, "grassU", "seedRipe", "panicle ripe (drought)");
num(fH, "grassU", "flowerShare", 0, 0.15, 0.001, "flower share");
num(fH, "grassU", "flowerSize", 0.3, 3, 0.05, "flower size x");
colorRow(fH, "grassU", "petal0", "buttercup");
colorRow(fH, "grassU", "petal1", "oxeye daisy");
colorRow(fH, "grassU", "petal2", "clover");
colorRow(fH, "grassU", "petal3", "knapweed");
note(fH, "Flower share x the type's flowers value = the share of blades that are a flower.");
fH.close();

// wind
const fW = ui.addFolder("Wind (wind.js)");
num(fW, "wind", "speed", 0, 16, 0.1, "speed m/s");
num(fW, "wind", "direction", 0, 360, 1, "blows toward deg");
num(fW, "wind", "gust", 0, 1, 0.01, "gustiness");
num(fW, "wind", "gustSize", 0.25, 4, 0.05, "gust fronts smaller x");
num(fW, "wind", "gustSpeed", 0, 3, 0.05, "gust travel x");
num(fW, "grassU", "windLawn", 0, 2, 0.01, "lean in wind: lawn");
num(fW, "grassU", "windLong", 0, 3, 0.01, "lean in wind: long");
num(fW, "grassU", "sheen", 0, 0.8, 0.01, "gust sheen");
fW.close();

// light + season
const fL = ui.addFolder("Light & season");
fL.add(lab, "time", Object.keys(TIMES)).name("time preset").onChange(() => { lab.hour = -1; applyLight(); save(); });
fL.add({ get v() { return lighting.hour; }, set v(x) { lab.hour = x; } }, "v", 3, 23, 0.05).name("solar hour").onChange(() => { applyLight(); save(); }).listen();
fL.add(lab, "day", 1, 365, 1).name("day of year").onChange(() => { applyLight(); applySeason(); refreshAll(); save(); });
const dayRead = { v: "" }; fL.add(dayRead, "v").name("date").listen();
fL.add(lab, "seasonOverride").name("override the season").onChange((on) => {
  for (const p of P) if (p.group === "season") { if (on) { p._ov ??= p.get(); p.setRaw(p._ov); } }
  if (!on) grass.syncSeason();
  refreshAll(); save();
});
num(fL, "season", "height", 0.3, 1.5, 0.01, "season height x");
num(fL, "season", "dry", 0, 1, 0.01, "season drought");
num(fL, "season", "frost", 0, 1, 0.01, "season frost");
colorRow(fL, "season", "tint", "season tint");
note(fL, "The day of year drives height / drought / frost / tint (grass.syncSeason) unless overridden.");
if (GL) { num(fL, "ground", "groundRough", 0, 1, 0.01, "ground rough share"); num(fL, "ground", "groundDry", 0, 1, 0.01, "ground dry share"); }
fL.add(lab, "post").name("post effects").onChange(save);
fL.close();

// quality + LOD
const fQ = ui.addFolder(`Quality & LOD (preset ${presetName})`);
const qs = { preset: presetName };
fQ.add(qs, "preset", Object.keys(QUALITY)).name("preset (reloads)").onChange((v) => { save(); setTimeout(() => { qp.set("preset", v); location.search = qp.toString(); }, 300); });
num(fQ, "grassU", "density", 0, 1.5, 0.01, "density");
num(fQ, "grassU", "d0", 0.3, 2, 0.01, "full-density radius x");
num(fQ, "grassU", "reach", 0.3, 1.6, 0.01, "reach x");
num(fQ, "grassU", "rmax", 10, 48, 1, "max distance m");
num(fQ, "grassU", "d0Lawn", 2, 15, 0.1, "full density lawn m");
num(fQ, "grassU", "d0Long", 2, 15, 0.1, "full density long m");
num(fQ, "grassU", "reachLawn", 5, 48, 0.5, "reach lawn m");
num(fQ, "grassU", "reachLong", 5, 60, 0.5, "reach long m");
num(fQ, "grassU", "lod0", 1, 20, 0.5, "LOD0 (5 seg) to m");
num(fQ, "grassU", "lod1", 5, 48, 0.5, "LOD1 (3 seg) to m");
num(fQ, "grassU", "minPixels", 0.3, 2, 0.05, "min blade width px");
fQ.add({ v: false }, "v").name("tint the 3 LODs").onChange((v) => { grassU.debugLod.value = v ? 1 : 0; });
note(fQ, "Blade buffers are sized by the preset at construction (as in the city): an over-full LOD is clamped. Density, radius, reach, max distance: the preset's values (grass.js PRESETS).");
fQ.close();

// camera
const fV = ui.addFolder("Camera");
fV.add(lab, "walk").name("walk (WASD, eye 1.7 m)").onChange((v) => setWalk(v)).listen();
for (const [k, f] of Object.entries(VIEWS)) fV.add({ go: f }, "go").name(k);

// settings
const fX = ui.addFolder("Settings");
const out = { json: "{}" };
fX.add({ go: async () => {
  const s = JSON.stringify(changed(), null, 1); jsonBox.value = s;
  try { await navigator.clipboard.writeText(s); stat.msg = "copied to the clipboard"; } catch { jsonBox.select(); stat.msg = "clipboard blocked: copy from the box"; }
} }, "go").name("Copy settings (changed values, JSON)");
fX.add({ go: () => {
  for (const p of P) if (p.def !== undefined) p.set(Array.isArray(p.def) ? [...p.def] : p.def);
  Object.assign(lab, LAB_DEF, { walk: lab.walk });
  for (const p of P) if (p.group === "season") p._ov = null;
  Object.assign(L, { type: lab.type, mix: lab.mix, patch: lab.patch, patchR: lab.patchR, patchAt: lab.patchAt });
  edit.type = lab.type;
  field.hills = 1; buildGround();
  applyLight(); applySeason(); rebake(); refreshAll();
  try { localStorage.removeItem(STORE); } catch { /* */ }
  save(); stat.msg = "reset to the city's defaults";
} }, "go").name("Reset to the city's defaults");
const stat = { msg: "" }; fX.add(stat, "msg").name("status").listen();
const jsonBox = document.createElement("textarea"); jsonBox.readOnly = true; jsonBox.spellcheck = false; fX.body.append(jsonBox);
note(fX, "Kept in the URL (#s=…) and localStorage: a reload keeps them. docs/GRASS.md §10: where each key goes in the city's code.");

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale);
lighting.preset = null; applyLight();
applySeason();
VIEWS["eye level in the field"]();
if (lab.walk) setWalk(true);
edit.type = lab.type;
refreshAll(); save();
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);

const gpu = { avg: 0, comp: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([ms, cms]) => {
    if (typeof ms === "number" && ms > 0) { const t = ms + (cms || 0); gpu.avg = gpu.avg ? gpu.avg * 0.9 + t * 0.1 : t; gpu.comp = gpu.comp ? gpu.comp * 0.9 + (cms || 0) * 0.1 : cms || 0; gpu.samples.push(t); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let freeze = false, last = performance.now(), frames = 0, fps = 0, fpsAcc = 0, fpsN = 0;
function renderFrame(dt) {
  if (lab.walk) walkStep(dt); else controls.update();
  camera.updateMatrixWorld();
  wind.update(dt);
  grass.update(camera, dt);
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), lab.walk ? camera.position : controls.target, 90, dt);
  if (lab.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
}
renderer.setAnimationLoop(() => {
  if (freeze) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  renderFrame(dt);
  sampleGpu();
  if (++frames % 20 === 1) {
    grass.readCounts().catch(() => {});
    updateEditInfo();
    dayRead.v = `${dayLabel(season.day)}`;
    const c = grass.counts, f = grass.field;
    const p = camera.position;
    $info.textContent = `${TYPE_INFO[L.type][0]}${L.mix ? ` + patch of ${TYPE_INFO[L.patch][0]}` : ""} · preset ${presetName}${grass.lambert ? " (Lambert)" : ""}\n` +
      `${fps.toFixed(0)} fps · GPU ${renderer.backend.trackTimestamp ? `${gpu.avg.toFixed(2)} ms (compute ${gpu.comp.toFixed(2)})` : "n/a"} · ${renderer.info.render.drawCalls ?? renderer.info.render.calls} draws\n` +
      `blades ${(c[0] + c[1] + c[2]).toLocaleString()}: LOD0 ${c[0].toLocaleString()} / LOD1 ${c[1].toLocaleString()} / LOD2 ${c[2].toLocaleString()} · threads ${(grass.threads ?? 0).toLocaleString()}\n` +
      `field bakes ${f.bakes} (last ${f.lastBakeMs.toFixed(1)} ms CPU) · ${lab.walk ? "walk" : "orbit"} · eye ${(p.y - groundAt(p.x, p.z)).toFixed(2)} m · cam ${p.x.toFixed(1)},${p.z.toFixed(1)}`;
  }
});
addEventListener("resize", () => { if (qp.get("w")) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const step = async (n = 1) => { for (let i = 0; i < n; i++) renderFrame(1 / 60); await renderer.backend.device.queue.onSubmittedWorkDone(); };
window.lab = { renderer, scene, camera, controls, grass, grassU, lighting, pipe, wind, types, lab, P, changed, applySettings, rebake, groundAt, views: VIEWS,
  step, gpu, setFreeze: (v) => { freeze = v; }, refreshAll, save };
say("ready");
