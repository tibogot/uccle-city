// THE MATERIAL LAB: the shared material library (viewer/materials/library.js) on a gallery of test objects (a wall
// with a window opening and a sill, an outside corner, a plinth, a pavement strip with a kerb, a floor patch, a roof
// slope, a dome on a drum, a tower), under the city's own lighting (viewer/lighting.js) and post chain
// (viewer/post.js). Variants: procedural / CC0 scan / hybrid, and a side-by-side A|B|C split. Camera presets
// 1 / 5 / 20 / 80 / 300 m and a full-screen bench wall; sliders for every parameter (live uniforms); "save choice"
// -> choices.json; GPU ms / shader size / texture memory per material; a "city sample" street that shows the
// city's materials today next to their library replacements.
// URL: ?mat=<name>&variant=proc|scan|hybrid|split&mapping=world|uv|triplanar|auto&view=1m|5m|20m|80m|300m|bench|city&time=<preset>
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { DEFS, MATERIAL_NAMES, SCAN_MATERIALS, createMaterial, createLook, paramSpec, readParams, splitAt } from "../viewer/materials/library.js";
import { loadScans, SCANS } from "../viewer/materials/scans.js";
import { GeoBuilder, wallWithWindow, sill } from "./material-lab-scene.js";
import { buildCitySample, CITY_MAP } from "./material-lab-city.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $notes = document.getElementById("notes"), $split = document.getElementById("split");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 5000);   // reversed depth: 5 cm near is safe
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

$info.textContent = "loading the CC0 scans (KTX2)…";
const scanT0 = performance.now();
await loadScans(renderer).catch((e) => console.warn("[material lab] scans failed:", e));
const scanMs = performance.now() - scanT0;

// ------------------------------------------------------------------------------------------------ state
const LS = "uccle.materialLab.choices";
let committed = {};
try { committed = await fetch("../viewer/materials/choices.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})); } catch { /* none yet */ }
let choices = { ...(committed.materials ?? {}) };
try { Object.assign(choices, JSON.parse(localStorage.getItem(LS) || "{}")); } catch { /* private mode */ }
const looks = {};                      // name -> live uniforms shared by every material of that name (gallery + city)
const lookOf = (name) => {
  if (!looks[name]) {
    looks[name] = createLook(name);
    for (const [k, v] of Object.entries(choices[name]?.params ?? {})) {
      const u = looks[name][k]; if (!u) continue;
      if (u.value?.isColor) u.value.set(v); else u.value = v;
    }
  }
  return looks[name];
};
const S = {
  material: MATERIAL_NAMES.includes(qp.get("mat")) ? qp.get("mat") : "brick_red_brussels",
  variant: qp.get("variant") || "proc", mapping: qp.get("mapping") || "auto", view: qp.get("view") || "5m",
  time: preset, hour: lighting.hour, post: true, ground: true,
  layout: qp.get("layout") || "screen thirds",
  stats: "", bench: "—", shader: "—", tex: "—", saved: "",
};
if (choices[S.material] && !qp.get("variant")) { S.variant = choices[S.material].variant ?? S.variant; S.mapping = choices[S.material].mapping ?? S.mapping; }

// ------------------------------------------------------------------------------------------------ ground + gallery
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3a3c37, roughness: 0.95 }));
ground.receiveShadow = true;
scene.add(ground);

const gallery = new THREE.Group(); scene.add(gallery);
const flatParts = [], curvedParts = [];
function part(builder, curved = false, name = "") {
  const mesh = new THREE.Mesh(builder.geometry(), null);
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = name;
  (curved ? curvedParts : flatParts).push(mesh); gallery.add(mesh);
  return mesh;
}
// the wall with a window opening and a sill
const wb = new GeoBuilder([0.12, 0.5, 0.5, 0.5]);
const win = wallWithWindow(wb, { cx: 0 });
part(wb, false, "wall");
const sb = new GeoBuilder([0.2, 0.45, 0.4, 0.5]); sill(sb, win.ox0 - 0.1, win.ox1 + 0.1, win.sy - 0.06, win.sy, 0.07); part(sb, false, "sill");
// the outside corner, the plinth
part(new GeoBuilder([0.33, 0.42, 0.62, 0.75]).box(-7.5, -0.1, -1.2, -5, 4.2, 1.2), false, "corner");
part(new GeoBuilder([0.51, 0.56, 0.45, 0.35]).box(3.2, -0.1, -0.3, 6.4, 0.85, 0.3), false, "plinth");
// pavement strip with a kerb in front of the wall: slab top 13 cm, kerb face, a road strip 1 cm above the ground
{
  const b = new GeoBuilder([0.66, 0.5, 0.5, 0.5]);
  b.rect(new THREE.Vector3(-3.5, 0.13, 2.2), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 7, 2.2, [-3.5, 0]);   // top (v = m from the kerb)
  b.rect(new THREE.Vector3(-3.5, 0.01, 2.2), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 7, 0.12, [-3.5, 0.01]); // kerb face
  b.rect(new THREE.Vector3(3.5, 0.01, 2.2), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 2.2, 0.12, [0, 0.01]);  // end
  b.rect(new THREE.Vector3(-3.5, 0.01, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), 2.2, 0.12, [0, 0.01]);    // end
  b.rect(new THREE.Vector3(-3.5, 0.01, 4.0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 7, 1.8, [-3.5, 0]);   // road strip
  part(b, false, "pavement");
}
// floor patch beyond the road (the ground materials' big test area; v = m from its near edge)
part(new GeoBuilder([0.8, 0.5, 0.5, 0.5]).rect(new THREE.Vector3(-7, 0.01, 10.5), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 14, 6.3, [-7, 0]), false, "floor");
// roof slope (gable prism on the ground, 40 degrees)
{ const b = new GeoBuilder([0.9, 0.48, 0.55, 0.6]); b.roof(8, 12.5, -2.5, 2.5, 0, 40); part(b, false, "roof"); }
// dome on a drum, tower
{ const b = new GeoBuilder([0.27, 0.5, 0.5, 0.5]); b.cylinder(-12.5, 0, 2.5, -0.1, 1.6, 64, false); b.dome(-12.5, 0, 2.5, 1.6, 64, 20); part(b, true, "dome"); }
{ const b = new GeoBuilder([0.44, 0.52, 0.5, 0.45]); b.cylinder(16.5, 0, 1.4, -0.1, 8, 56, true); part(b, true, "tower"); }
// the pane in the window opening (always the library glass)
const pane = new THREE.Mesh(new THREE.PlaneGeometry(win.ox1 - win.ox0, win.top - win.sy), createMaterial("glass_window", { look: lookOf("glass_window") }));
pane.position.set(0, (win.sy + win.top) / 2, -0.25); gallery.add(pane);

// "three galleries": A (proc) left, B (scan) middle, C (hybrid) right, 45 m apart: the far views compare whole galleries
const GAP = 45, copies = [];
for (const [dx, variant] of [[-GAP, "proc"], [GAP, "hybrid"]]) {
  const g = new THREE.Group(); g.position.x = dx; g.visible = false;
  for (const m of [...flatParts, ...curvedParts]) { const c = m.clone(); c.userData.curved = curvedParts.includes(m); g.add(c); }
  const p = pane.clone(); g.add(p);
  scene.add(g); copies.push({ g, variant });
}

// the bench wall: 30 x 30 m, far in front of everything (camera 2.2 m away fills the screen with it)
const benchWall = new THREE.Mesh(new GeoBuilder([0.1, 0.5, 0.5, 0.5]).rect(new THREE.Vector3(-15, 0, 60), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 30, 30, [0, 0]).geometry(), null);
benchWall.visible = false; scene.add(benchWall);

// the city sample (today's city materials vs the library), built lazily
let city = null;

// ------------------------------------------------------------------------------------------------ materials
const matCache = new Map();
function mat(name, variant, mapping, extra = {}) {
  const key = `${name}|${variant}|${mapping}|${extra.dripAttr ?? ""}`;
  if (!matCache.has(key)) matCache.set(key, createMaterial(name, { variant, mapping, varAttr: "aMatVar", look: lookOf(name), ...extra }));
  return matCache.get(key);
}
const hasScan = (n) => SCAN_MATERIALS.includes(n) && !!SCANS[n];
function applyMaterial() {
  const n = S.material, v = hasScan(n) ? S.variant : "proc";
  const flatMap = S.mapping === "auto" ? "world" : S.mapping, curvedMap = S.mapping === "auto" ? "uv" : S.mapping;
  for (const m of flatParts) m.material = mat(n, v, flatMap, { dripAttr: "aDrip" });
  for (const m of curvedParts) m.material = mat(n, v, curvedMap, { dripAttr: "aDrip" });
  benchWall.material = mat(n, v, "world");
  // three galleries: the middle one is B (scan), the copies A and C
  const three = v === "split" && S.layout === "three galleries";
  for (const c of copies) {
    c.g.visible = three && gallery.visible;
    if (three) c.g.children.forEach((m) => { if (m !== c.g.children[c.g.children.length - 1]) m.material = mat(n, c.variant, m.userData.curved ? curvedMap : flatMap, { dripAttr: "aDrip" }); });
  }
  if (three) { for (const m of flatParts) m.material = mat(n, "scan", flatMap, { dripAttr: "aDrip" }); for (const m of curvedParts) m.material = mat(n, "scan", curvedMap, { dripAttr: "aDrip" }); }
  $split.style.display = v === "split" && S.view !== "city" && !three ? "block" : "none";
  S.tex = hasScan(n) && v !== "proc" ? `${(SCANS[n].bytesGPU / 1048576).toFixed(1)} MB GPU (${SCANS[n].format}), ${(SCANS[n].bytesFile / 1048576).toFixed(1)} MB download` : "0 (procedural)";
  S.shader = "—";
  buildParamFolder();
  writeNotes();
}

// ------------------------------------------------------------------------------------------------ views
const VIEWS = {
  "1m": { pos: [1.15, 1.2, 1.0], target: [0.75, 0.9, 0] },
  "5m": { pos: [1.8, 1.9, 5.0], target: [0, 1.8, 0] },
  "20m": { pos: [6, 4.5, 19], target: [1, 2, 0] },
  "80m": { pos: [26, 20, 76], target: [2, 2, 0] },
  "300m": { pos: [95, 85, 283], target: [2, 2, 0] },
  bench: { pos: [0, 15, 62.2], target: [0, 15, 60], fov: 50 },
  city: { pos: [-1, 2.2, 22], target: [-1.5, 4.2, 0] },
};
function goView(name) {
  const v = VIEWS[name] ?? VIEWS["5m"];
  S.view = name;
  camera.position.set(...v.pos); controls.target.set(...v.target); camera.fov = v.fov ?? 50; camera.updateProjectionMatrix();
  if (S.variant === "split" && S.layout === "three galleries" && (name === "80m" || name === "300m")) {
    camera.position.sub(controls.target).multiplyScalar(1.45).add(controls.target);       // all three in view, clear of the panel
    camera.position.x += 14; controls.target.x += 14;
  }
  benchWall.visible = name === "bench";
  if (benchWall.visible) benchWall.position.set(0, 0, 0);
  const isCity = name === "city";
  if (isCity && !city) {
    city = buildCitySample((n, mapping) => { const v = choices[n]?.variant; return mat(n, hasScan(n) && v && v !== "split" ? v : "proc", mapping); });
    scene.add(city.group);
  }
  gallery.visible = !isCity;
  for (const c of copies) c.g.visible = !isCity && S.variant === "split" && S.layout === "three galleries";
  if (city) { city.group.visible = isCity; city.show(S.cityShow); }
  $split.style.display = S.variant === "split" && !isCity && S.layout !== "three galleries" ? "block" : "none";
  writeNotes();
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Material Lab" });
const fm = ui.addFolder("Material");
fm.add(S, "material", MATERIAL_NAMES).name("material").onChange(() => { loadChoice(); applyMaterial(); }).listen();
fm.add(S, "variant", ["proc", "scan", "hybrid", "split"]).name("variant (A/B/C)").onChange(applyMaterial).listen();
fm.add(S, "mapping", ["auto", "world", "uv", "triplanar"]).name("mapping").onChange(applyMaterial).listen();
fm.add(S, "layout", ["screen thirds", "three galleries"]).name("split layout").onChange(() => { applyMaterial(); goView(S.view); });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(VIEWS)).name("camera preset").onChange(goView).listen();
S.cityShow = "library";
fv.add(S, "cityShow", ["library", "city today"]).name("city sample shows").onChange((v) => city?.show(v)).listen();
S.notes = qp.get("notes") !== "0";
fv.add(S, "notes").name("notes (inputs, sources, mapping)").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
let paramFolder = null;
function buildParamFolder() {
  paramFolder?.el.remove();
  paramFolder = ui.addFolder(`Parameters: ${S.material}`);
  const U = lookOf(S.material);
  for (const [k, spec] of Object.entries(paramSpec(S.material))) {
    if (typeof spec === "string") {
      const row = paramFolder.row(k), inp = document.createElement("input");
      inp.type = "color"; inp.value = "#" + U[k].value.getHexString();
      inp.style.cssText = "width:100%;height:20px;border:0;padding:0;background:none";
      inp.oninput = () => U[k].value.set(inp.value);
      row.append(inp);
    } else {
      const o = { [k]: U[k].value };
      paramFolder.add(o, k, spec[1], spec[2], spec[3]).onChange((v) => { U[k].value = v; });
    }
  }
  paramFolder.add({ go: () => { const spec = paramSpec(S.material); for (const [k, v] of Object.entries(spec)) { if (typeof v === "string") U[k].value.set(v); else U[k].value = v[0]; } buildParamFolder(); } }, "go").name("reset to library defaults");
}
const fc = ui.addFolder("Choice");
fc.add({ go: () => saveChoice() }, "go").name("save choice for this material");
fc.add({ go: () => downloadChoices() }, "go").name("download choices.json");
fc.add(S, "saved").name("saved");
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("bench: GPU ms per variant (bench wall)");
fp.add(S, "bench").name("result").listen();
fp.add({ go: () => shaderSize() }, "go").name("shader size (WGSL)");
fp.add(S, "shader").name("fragment shader").listen();
fp.add(S, "tex").name("texture memory").listen();
fp.add({ go: () => benchAll() }, "go").name("bench ALL materials (console + docs)");

function loadChoice() {
  const c = choices[S.material];
  if (c) { S.variant = c.variant ?? S.variant; S.mapping = c.mapping ?? S.mapping; }
}
function saveChoice() {
  const m = flatParts[0].material;
  choices[S.material] = { variant: hasScan(S.material) ? S.variant : "proc", mapping: S.mapping, params: readParams(m), saved: new Date().toISOString() };
  try { localStorage.setItem(LS, JSON.stringify(choices)); } catch { /* private mode */ }
  S.saved = `${S.material}: ${choices[S.material].variant}, ${S.mapping}`;
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
}
function downloadChoices() {
  const out = { about: "Material choices from labs/material-lab.html (viewer/materials/library.js). variant: proc | scan | hybrid; mapping: auto | world | uv | triplanar; params: the live uniforms (colours sRGB hex).", date: new Date().toISOString(), materials: choices };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
  a.download = "choices.json"; a.click();
}

function writeNotes() {
  const n = S.material, d = DEFS[n], spec = paramSpec(n), scan = SCANS[n]?.meta;
  if (S.view === "city") {
    $notes.innerHTML = `<h3>City sample: today → library</h3><table>${CITY_MAP.map((r) => `<tr><td><code>${r.today}</code></td><td>→ <b>${r.lib}</b></td><td>${r.note}</td></tr>`).join("")}</table>
    <p>Switch "city sample shows" between <b>library</b> and <b>city today</b> (the same geometry with today's city shaders: facades.js wallMaterial / roofMaterial, roadPaint asphalt / concrete, cobbles.js). Integration steps: docs/MATERIALS.md.</p>`;
  } else {
    $notes.innerHTML = `<h3>${d.label} <code>${n}</code></h3>
    <p>kind ${d.kind}; unit ${d.unit} m; variants: proc${d.scan ? " · scan · hybrid" : ""}</p>
    ${scan ? `<p>Scan: <a style="color:#9cc4ff" href="${scan.url}" target="_blank">${scan.source} ${scan.id}</a> (CC0), ${scan.size_m} m per repeat, ${scan.px}px, mean albedo ${scan.mean_albedo_linear.join(", ")}</p>` : ""}
    <h3>Inputs</h3><table>${Object.entries(spec).map(([k, v]) => `<tr><td><code>${k}</code></td><td>${typeof v === "string" ? v : `${v[0]} (${v[1]}…${v[2]})`}</td></tr>`).join("")}</table>
    <p>Per-instance: <code>aMatVar</code> (seed, brightness, warm/cool, age). Streaks: <code>aDrip</code> on the wall (under the sill).</p>`;
  }
}
$notes.style.display = S.notes ? "block" : "none";

// ------------------------------------------------------------------------------------------------ perf
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// the bench draws ONLY the full-screen wall, REPS times per frame (no post, no gallery, no ground), so the material's
// cost dominates the timestamp noise of a shared GPU; result = median ms per draw over ~2 s
const REPS = 12;
async function measure(material) {
  benchWall.material = material;
  await renderer.compileAsync(scene, camera).catch(() => {});
  await wait(400); gpu.samples.length = 0; await wait(1800);
  const s = [...gpu.samples].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] / REPS : NaN;
}
const plain = new THREE.MeshStandardNodeMaterial({ color: 0x777777, roughness: 0.8 });
let benching = false;
async function benchOne(name) {
  const prevView = S.view; goView("bench"); S.post = false; S.reps = REPS;
  const vis = [gallery.visible, ground.visible]; gallery.visible = ground.visible = false; benchWall.castShadow = false;
  const res = { base: await measure(plain) };
  for (const v of hasScan(name) ? ["proc", "scan", "hybrid"] : ["proc"]) res[v] = await measure(mat(name, v, "world"));
  res.triplanar = await measure(mat(name, "proc", "triplanar"));
  S.post = true; S.reps = 1; goView(prevView); applyMaterial(); [gallery.visible, ground.visible] = vis;
  return res;
}
async function bench() {
  if (benching) return; benching = true;
  const r = await benchOne(S.material);
  S.bench = Object.entries(r).filter(([k]) => k !== "base").map(([k, ms]) => `${k} ${ms.toFixed(2)}`).join(" · ") + ` ms per full-screen draw (plain ${r.base.toFixed(2)})`;
  console.log("[material lab] bench", S.material, r);
  benching = false;
}
async function shaderSize(m = flatParts[0].material, mesh = flatParts[0]) {
  try {
    const sh = await renderer.debug.getShaderAsync(scene, camera, mesh);
    const fs = sh.fragmentShader || "";
    const lines = fs.split("\n").filter((l) => l.trim()).length, ops = (fs.match(/[=+\-*/]\s*[A-Za-z0-9_(]/g) || []).length;
    S.shader = `${lines} lines, ~${ops} ops, ${(fs.length / 1024).toFixed(0)} KB WGSL`;
    return { lines, ops, kb: fs.length / 1024 };
  } catch (e) { S.shader = "n/a: " + e.message; return null; }
}
async function benchAll(names = MATERIAL_NAMES) {
  if (benching) return; benching = true;
  const out = {};
  for (const n of names) {
    S.material = n; applyMaterial();
    const r = await benchOne(n);
    const sz = {};
    for (const v of hasScan(n) ? ["proc", "scan", "hybrid"] : ["proc"]) { benchWall.material = mat(n, v, "world"); benchWall.visible = true; sz[v] = await shaderSize(null, benchWall); }
    benchWall.visible = S.view === "bench";
    out[n] = { gpu_ms: Object.fromEntries(Object.entries(r).filter(([k]) => k !== "base").map(([k, v]) => [k, +v.toFixed(3)])), plain_ms: +r.base.toFixed(3), shader: sz,
      tex_gpu_mb: hasScan(n) ? +(SCANS[n].bytesGPU / 1048576).toFixed(2) : 0, tex_file_mb: hasScan(n) ? +(SCANS[n].bytesFile / 1048576).toFixed(2) : 0 };
    console.log("[material lab] bench", n, out[n]);
  }
  window.benchResult = out;
  console.log("[material lab] bench ALL", JSON.stringify(out));
  benching = false;
  return out;
}

// ------------------------------------------------------------------------------------------------ loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
applyMaterial();
goView(VIEWS[S.view] ? S.view : "5m");
window.lab = { renderer, scene, camera, controls, lighting, S, goView, applyMaterial, bench, benchAll, shaderSize, looks, choices, mat, SCANS, gpu };

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  const dist = camera.position.distanceTo(controls.target);
  lighting.update(camera.position.y, 0, controls.target, THREE.MathUtils.clamp(dist * 1.2, 30, 400));
  if (S.reps > 1) for (let i = 0; i < S.reps; i++) renderer.render(scene, camera);
  else if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws`;
    $info.textContent = `${backend} · ${S.stats} · camera ${dist.toFixed(1)} m\n${S.material} · ${hasScan(S.material) ? S.variant : "proc"} · mapping ${S.mapping} · textures ${S.tex}` +
      `\nscans loaded in ${(scanMs / 1000).toFixed(1)} s · bench: ${S.bench}\nshader: ${S.shader}`;
  }
});
// the split thirds share the canvas left of the panel; labels follow
function layoutSplit() {
  const w = Math.max(innerWidth - 340, innerWidth * 0.5), t = w / 3;
  splitAt.value.set(t / innerWidth, (2 * t) / innerWidth);
  [...$split.children].forEach((el, i) => { el.style.left = `${i * t}px`; el.style.width = `${t}px`; });
}
layoutSplit();
addEventListener("resize", layoutSplit);
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
