// THE OBSERVATORY LAB: the scripted Royal Observatory campus (tools/blender/observatory.py -> models/observatory/,
// loaded by viewer/observatoryModel.js: the loader, LODs and slot materials the city uses) at its real place, on the
// real ground (UrbIS DTM 0.5 m + orthophoto), under the city's lighting (viewer/lighting.js) and post chain
// (viewer/post.js). LOD switch + auto LOD by distance with the dithered cross-fades of the city (lodFade.js),
// wireframe, the UrbIS solids it replaces (to compare / check the fit), the reference photos' viewpoints with an
// overlay of the photo when it is on disk (data/raw/refs/observatory/, never shipped), a live material-slot swap
// (the Material Lab's library will replace the slots by name), stats and a GPU benchmark per LOD.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, float, mix, smoothstep, positionWorld, select, uv } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { withObjectFade, SMOOTH } from "../viewer/lodFade.js";
import { loadObservatory, OBS_LODS, OBS_SLOTS, OBS_TEMP_MATERIALS, obsLook } from "../viewer/observatoryModel.js";

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
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.3, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the campus
const t0 = performance.now();
const model = await loadObservatory().catch((e) => { $info.textContent = "models/observatory/ not found: " + e.message; throw e; });
const loadMs = performance.now() - t0;
const P0 = model.placement.position;
const root = new THREE.Group();
root.position.copy(P0); root.rotation.y = model.placement.rotationY;
scene.add(root);
const fadeOn = (m) => (SMOOTH ? withObjectFade(m) : m);
for (const s of OBS_SLOTS) fadeOn(model.materials[s]);
const levels = OBS_LODS.map((_, k) => { const g = model.make(k); root.add(g); return g; });
const centre = model.boundsWorld.getCenter(new THREE.Vector3());

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto
const site = await fetch("../models/observatory/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/observatory/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = THREE.MathUtils.clamp((x - site.x0) / site.step, 0, site.cols - 1.001), r = THREE.MathUtils.clamp((z - site.z0) / site.step, 0, site.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, H = (i, j) => dtm[j * site.cols + i] / 100 + 60;
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
  const [o4, o5] = await Promise.all([load("../data/raw/ortho/H4.jpg", "../data/tiles/H4/ortho.jpg"), load("../data/raw/ortho/H5.jpg", "../data/tiles/H5/ortho.jpg")]);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  if (o4 && o5) {
    for (const o of [o4, o5]) { o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8; }
    // tiles H4: x 500-1000, z -500..0; H5: z 0..500 (image row 0 = north = the smaller z)
    const u4 = positionWorld.xz.sub(vec3(500, 0, -500).xz).div(500), u5 = positionWorld.xz.sub(vec3(500, 0, 0).xz).div(500);
    const col = select(positionWorld.z.lessThan(0), texture(o4, u4).rgb, texture(o5, u5).rgb);
    const edge = smoothstep(130, 115, positionWorld.xz.sub(vec3(640, 0, 80).xz).length());
    m.colorNode = mix(vec3(0.12, 0.15, 0.09), col.mul(0.9), edge);
  } else m.color.set(0x55605a);
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true;
  scene.add(ground);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(5000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x343a2f, roughness: 1 }));
  farG.position.set(centre.x, 96.5, centre.z); farG.receiveShadow = true;
  scene.add(farG);
}

// ------------------------------------------------------------------------------------------------ the UrbIS solids the city draws today
const HIDE = new Set(model.notes.placement.hides_solids);
async function loadUrbis() {
  const out = [];
  for (const t of ["H4", "H5"]) {
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
// camera (x, z, height m TAW) and target in CITY coordinates, estimated from each photo (overlay to check)
const PHOTOS = {
  "aerial from the south-west": { file: "owner_aerial.png", pos: [616, 214, 172], target: [660, 62, 99], fov: 58, src: "owner's photo (reference only)" },
  "white dome over the east wing": { file: "owner_dome_white_banded.png", pos: [661, 92, 103.5], target: [707, 47, 107.5], fov: 15, src: "owner's photo (reference only)" },
  "east tower, slit open": { file: "owner_tower_slit_dome.png", pos: [672, 64, 102.2], target: [705, 45, 105], fov: 42, src: "owner's photo (reference only)" },
  "great equatorial (south lawn)": { pos: [628, 196, 103], target: [654, 156, 108], fov: 45 },
  "main front (north court)": { pos: [654, -48, 101], target: [654, 30, 106], fov: 55 },
  "medium equatorial + meridian hall": { pos: [700, 150, 104], target: [680, 104, 109], fov: 50 },
  "overview": { pos: [480, 330, 300], target: [650, 80, 100], fov: 40 },
  "far (900 m)": { pos: [-60, 700, 330], target: [650, 80, 100], fov: 30 },
};
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  camera.position.set(v.pos[0], v.pos[2], v.pos[1]);
  camera.position.y = Math.max(camera.position.y, groundAt(v.pos[0], v.pos[1]) + 1.5);
  controls.target.set(v.target[0], v.target[2], v.target[1]); camera.fov = v.fov; camera.updateProjectionMatrix();
  if (v.file) {
    $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
    $photo.src = `../data/raw/refs/observatory/${v.file}`;
  } else $photo.removeAttribute("src");
  S.view = name;
  fitFrame();
}
function fitFrame() {
  const v = PHOTOS[S.view], c = renderer.domElement;
  let w = innerWidth, h = innerHeight;
  if (S.frame && v?.file && $photo.naturalWidth) {
    const a = $photo.naturalWidth / $photo.naturalHeight;
    if (w / h > a) w = Math.round(h * a); else h = Math.round(w / a);
  }
  renderer.setSize(w, h);
  Object.assign(c.style, { position: "fixed", left: `${(innerWidth - w) / 2}px`, top: `${(innerHeight - h) / 2}px` });
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------------------------------------ material swap test
const SWAPS = {
  "temporary (default)": (s) => OBS_TEMP_MATERIALS[s](),
  "debug: UV0 metre grid": () => {
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
    const g = uv(0).fract();
    m.colorNode = mix(vec3(0.85, 0.85, 0.85), vec3(0.9, 0.2, 0.1), smoothstep(0.96, 0.98, g.x.max(g.y)));
    return m;
  },
  "debug: AO only (white)": () => new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 1 }),
  ...Object.fromEntries(OBS_SLOTS.map((o) => [`= ${o}`, () => OBS_TEMP_MATERIALS[o]()])),
};

// ------------------------------------------------------------------------------------------------ panel
const S = {
  lod: "auto", show: "new model", wireframe: false, view: "aerial from the south-west", photo: 0, frame: false, notes: true,
  time: preset, hour: lighting.hour, day: lighting.day, post: true, ao: 1, aoDirect: 0.5, weather: 1,
  slot: "copper_patina", swap: "temporary (default)", swapAll: false,
  stats: "", lodInfo: "", bench: "—",
};
const ui = new Panel({ title: "Observatory Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "notes").name("notes & sources").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solids (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "wireframe").onChange((v) => { for (const s of OBS_SLOTS) model.materials[s].wireframe = v; });
fm.add(S, "lodInfo").name("LOD now");
const fs = ui.addFolder("Material slots (swap test)");
fs.add(S, "slot", OBS_SLOTS).name("slot");
fs.add(S, "swap", Object.keys(SWAPS)).name("material").onChange(doSwap);
fs.add(S, "swapAll").name("apply to every slot").onChange(doSwap);
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
fl.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { obsLook.aoStrength.value = v; });
fl.add(S, "aoDirect", 0, 1, 0.01).name("AO on direct light").onChange((v) => { obsLook.aoDirect.value = v; });
fl.add(S, "weather", 0, 1, 0.01).name("stone weathering").onChange((v) => { obsLook.weather.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms per LOD at this view");
fp.add(S, "bench").name("result");

function applyShow() {
  root.visible = S.show !== "UrbIS solids (city today)";
  urbis.visible = S.show === "UrbIS solids (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}
let swapMs = 0;
function doSwap() {
  const t = performance.now();
  const make = SWAPS[S.swap];
  for (const s of S.swapAll ? OBS_SLOTS : [S.slot]) {
    const w = model.setSlotMaterial(s, make(s), { fade: fadeOn });
    w.wireframe = S.wireframe;
  }
  swapMs = performance.now() - t;
  console.log(`[observatory lab] slot ${S.swapAll ? "ALL" : S.slot} -> ${S.swap} (${swapMs.toFixed(1)} ms + shader build on next frame)`);
}

// notes
const N = model.notes, M = N.measured;
$notes.innerHTML = `
<h3>Reference photos (not shipped; the overlay works where data/raw/refs/observatory/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.src}</li>`).join("")}</ul>
<h3>Measured (UrbIS 3D solids + DSM/DTM 2021 0.5 m, CC0)</h3>
<ul>
<li>${N.placement.hides_solids.length} UrbIS solids replaced (footprints, bases)</li>
<li>domes (centre, sphere fitted to the DSM: radius / springing / top m TAW): ${Object.entries(M.domes).map(([k, d]) => `<b>${k}</b> R ${d.radius} ${d.springing_taw}/${d.top_taw} ${d.material}${d.slit_open ? " (slit open)" : ""}`).join("; ")}</li>
<li>towers (radius / cornice m TAW): ${Object.entries(M.towers).map(([k, t]) => `${k} ${t.radius}/${t.cornice_top_taw}`).join(", ")}</li>
<li>wall tops from the DSM roof level of each part: ${Object.entries(M.wall_tops_taw).map(([k, v]) => `${k} ${v}`).join(", ")}</li>
</ul>
<h3>Estimated</h3><p>${N.estimated}</p>
<h3>Model</h3><p>${model.tris.map((t, k) => `LOD${k} ${t.toLocaleString()} tris / ${model.drawCalls[k]} draws`).join(" · ")};
AO ${(model.aoBytes / 1048576).toFixed(1)} MB GPU (2048² R8 + mips); load ${loadMs.toFixed(0)} ms. Slots: ${OBS_SLOTS.join(", ")}.</p>
<h3>Sources</h3><p>UrbIS (paradigm.brussels) CC0; Brussels heritage inventory (Observatoire royal, O. Van Rysselberghe 1883-1889);
"Le quartier de l'Observatoire d'Uccle" (Bruxelles, Ville d'Art et d'Histoire 16), plan of the 1880s. See data/raw/refs/observatory/SOURCES.md.</p>`;
$notes.style.display = "block";

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(qp.get("view") && PHOTOS[qp.get("view")] ? qp.get("view") : "aerial from the south-west");

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
  console.log("[observatory lab] GPU ms median per frame:", JSON.stringify(res), "view", S.view);
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
// long frames (main-thread hitches) after load: the lab's own record
const hitches = [];
window.lab = { renderer, scene, camera, controls, model, lighting, goView, fitFrame, bench, gpu, S, PHOTOS, levels, hitches, doSwap, loadMs };

const ramp = (d, k) => { const s = OBS_LODS[k].until, w = OBS_LODS[k].band; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
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
    levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) g.traverse((o) => { o.userData.fade = fades[k]; }); });
    S.lodInfo = `${shown.map((v, k) => (v ? `L${k}` : "")).filter(Boolean).join("+")} · ${dist.toFixed(0)} m`;
  } else {
    let k = S.lod === "auto" ? OBS_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
    if (forced !== null) k = forced === "off" ? -1 : forced;
    levels.forEach((g, i) => { g.visible = i === k; if (g.visible) g.traverse((o) => { o.userData.fade = 1; }); });
    S.lodInfo = k >= 0 ? `LOD${k} · ${model.tris[k].toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  }
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(centre) * 0.9, 80, 420));
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${OBS_LODS[0].until} m, LOD1 < ${OBS_LODS[1].until} m, to the campus box; dithered cross-fades)\n` +
      `${model.tris.map((t, i) => `LOD${i} ${t.toLocaleString()} tris/${model.drawCalls[i]} draws`).join(" · ")} · AO ${(model.aoBytes / 1048576).toFixed(1)} MB · load ${loadMs.toFixed(0)} ms` +
      `\nbenchmark (median GPU ms, whole frame; + = the campus): ${S.bench}`;
  }
});
addEventListener("resize", fitFrame);
