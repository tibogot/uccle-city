// THE CHURCH LAB: the scripted Saint-Job church (tools/blender/stjob.py -> models/stjob/, loaded by
// viewer/stjobModel.js: the loader, LODs and materials the city will use) at its real place and orientation, on the
// real ground (UrbIS DTM 0.5 m + the tile's orthophoto), under the city's own lighting (viewer/lighting.js: Firmament
// sky, real Brussels sun) and post chain (viewer/post.js). LOD switch + auto LOD by distance, wireframe, the UrbIS
// solid the city draws today (to compare / check the fit), the reference photos' viewpoints with an overlay of the photo
// when it is on disk (data/raw/refs/stjob/, never shipped), the falcon nest node in the belfry, stats and a GPU
// benchmark per LOD.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, uv, vec3, float, mix, smoothstep, positionWorld } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadStJob, STJOB_LODS, STJOB_BU_ID, stjobLook } from "../viewer/stjobModel.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $photo = document.getElementById("photo"), $notes = document.getElementById("notes");
const $nest = document.getElementById("nestLabel");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.3, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the church
const model = await loadStJob().catch((e) => { $info.textContent = "models/stjob/ not found: " + e.message; throw e; });
const P0 = model.placement.position, ROT = model.placement.rotationY;
const root = new THREE.Group();
root.position.copy(P0); root.rotation.y = ROT;
scene.add(root);
const lodGroups = STJOB_LODS.map((_, k) => { const g = model.make(k); g.visible = k === 0; root.add(g); return g; });
const centre = P0.clone();
/** a point in the Blender frame of stjob.py (x east, y front, z up from the floor) -> city world */
const W = (x, y, z) => new THREE.Vector3(x, z, -y).applyAxisAngle(new THREE.Vector3(0, 1, 0), ROT).add(P0);

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto
const site = await fetch("../models/stjob/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/stjob/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = THREE.MathUtils.clamp((x - site.x0) / site.step, 0, site.cols - 1.001), r = THREE.MathUtils.clamp((z - site.z0) / site.step, 0, site.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, H = (i, j) => dtm[j * site.cols + i] / 100 + 60;
  return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr;
};
{
  const n = (site.cols - 1) / 2 + 1, size = (site.cols - 1) * site.step;
  const g = new THREE.PlaneGeometry(size, size, n - 1, n - 1).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + site.x0 + size / 2, z = p.getZ(i) + site.z0 + size / 2;
    p.setXYZ(i, x, groundAt(x, z) - 0.02, z);
  }
  g.computeVertexNormals();
  const ortho = await new THREE.TextureLoader().loadAsync("../data/tiles/G4/ortho.jpg").catch(() => null);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.92 });
  if (ortho) {
    ortho.colorSpace = THREE.SRGBColorSpace; ortho.anisotropy = 8;
    const ouv = positionWorld.xz.sub(vec3(1000, 0, 500).xz).div(500);          // tile G4: x 1000-1500, z 500-1000
    const edge = smoothstep(70, 60, positionWorld.xz.sub(vec3(P0.x, 0, P0.z).xz).length());
    m.colorNode = mix(vec3(0.16, 0.16, 0.15), texture(ortho, ouv).rgb.mul(0.92), edge);
  } else m.color.set(0x55575c);
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true;
  scene.add(ground);
}

// ------------------------------------------------------------------------------------------------ the UrbIS solid the city draws today
async function loadUrbis() {
  const meta = await fetch("../data/tiles/G4/buildings.json").then((r) => r.json());
  const bin = await fetch("../data/tiles/G4/buildings.bin").then((r) => r.arrayBuffer());
  const dv = new DataView(bin), V = dv.getUint32(0, true);
  const pos = new Float32Array(bin, 8, 3 * V), idx = new Uint32Array(bin, 8 + 12 * V);
  const out = [];
  for (const b of meta.buildings) {
    if (b.attrs?.BU_ID !== STJOB_BU_ID) continue;
    for (const r of [b.roof, b.walls]) for (let t = r.first; t < r.first + r.count; t++) for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k]; out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3)); g.computeVertexNormals();
  return g;
}
const urbisGeo = await loadUrbis().catch(() => null);
const urbis = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshStandardNodeMaterial({ color: 0x6b6660, roughness: 0.9 })) : new THREE.Group();
const urbisGhost = urbisGeo ? new THREE.Mesh(urbisGeo, new THREE.MeshBasicNodeMaterial({ color: 0xff3b30, wireframe: true, transparent: true, opacity: 0.5 })) : new THREE.Group();
urbis.visible = urbisGhost.visible = false; urbis.castShadow = true;
scene.add(urbis, urbisGhost);

// ------------------------------------------------------------------------------------------------ the nest
const nestWorld = model.nest.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ROT).add(P0);
const nestMark = new THREE.Group();
nestMark.position.copy(nestWorld);
nestMark.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicNodeMaterial({ color: 0xffb020 })));
nestMark.add(new THREE.AxesHelper(0.8));
const nestNode = new THREE.Object3D(); nestNode.name = "nest"; nestNode.position.copy(model.nest); root.add(nestNode);   // the node itself, in the church
scene.add(nestMark);

// ------------------------------------------------------------------------------------------------ views (the photos)
// camera positions in the Blender frame (x east, y front/north, z up from the floor), estimated from each photo
const PHOTOS = {
  "a north-west": { file: "a.jpg", pos: [-44, 44, -1.0], target: [-12, 12, 22], fov: 52, src: "Jean-Pol GRANDMONT, CC BY-SA 3.0 (Commons)" },
  "b front": { file: "b.jpg", pos: [0, 58, -0.6], target: [0, 0, 16], fov: 56, src: "User:Tram Bruxelles, CC BY-SA 4.0 (Commons)" },
  "c south-west": { file: "c_southwest.png", pos: [-30, -62, 1.2], target: [2, 0, 13], fov: 50, src: "owner's photo (reference only)" },
  "d east (dome)": { file: "d_east_dome.png", pos: [80, -34, 1.5], target: [0, 0, 18], fov: 36, src: "owner's photo (reference only)" },
  "e aerial": { file: "e_aerial.png", pos: [-12, 78, 56], target: [-3, 0, 6], fov: 48, src: "owner's photo (reference only)" },
  "f Rue du Ham": { file: "f_street_tram.png", pos: [-5.4, -78.4, 0.7], target: [-3, 0, 20], fov: 30, src: "owner's photo (reference only)" },
  "spire tip (fly start)": { pos: [-5, 5, 62], target: [-13.5, 13.5, 50], fov: 60 },
  "belfry / nest": { pos: [-22, 22, 24], target: [-15.5, 15.5, 22], fov: 50 },
};
function goView(name) {
  const v = PHOTOS[name]; if (!v) return;
  const p = W(...v.pos); p.y = Math.max(p.y, groundAt(p.x, p.z) + 1.6);
  camera.position.copy(p); controls.target.copy(W(...v.target)); camera.fov = v.fov; camera.updateProjectionMatrix();
  if (v.file) { $photo.src = `../data/raw/refs/stjob/${v.file}`; $photo.onerror = () => { $photo.removeAttribute("src"); }; } else $photo.removeAttribute("src");
  S.view = name;
}

// ------------------------------------------------------------------------------------------------ panel
const S = {
  lod: "auto", show: "new model", wireframe: false, view: "b front", photo: 0, notes: true, nest: true,
  time: preset, hour: lighting.hour, day: lighting.day, post: true,
  brickTone: 1, bands: 1, moss: 1, ao: 1, dirt: 1,
  stats: "", lodInfo: "", bench: "—",
};
const ui = new Panel({ title: "Church Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("photo viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "notes").name("notes & photo list").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
fv.add(S, "nest").name("show the nest node");
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD");
fm.add(S, "show", ["new model", "UrbIS solid (city today)", "new + UrbIS ghost"]).onChange(applyShow);
fm.add(S, "wireframe").onChange((v) => { for (const m of model.materials) m.wireframe = v; });
fm.add(S, "lodInfo").name("LOD now");
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
const fk = ui.addFolder("Look (live uniforms)");
fk.add(S, "brickTone", 0.6, 1.4, 0.01).name("brick tone").onChange((v) => { stjobLook.brickTone.value = v; });
fk.add(S, "bands", 0, 1, 0.01).name("stone bands").onChange((v) => { stjobLook.bandStrength.value = v; });
fk.add(S, "moss", 0, 2, 0.01).onChange((v) => { stjobLook.moss.value = v; });
fk.add(S, "ao", 0, 1, 0.01).name("baked AO").onChange((v) => { stjobLook.aoStrength.value = v; });
fk.add(S, "dirt", 0, 2, 0.01).name("ground splash").onChange((v) => { stjobLook.dirt.value = v; });
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: GPU ms per LOD at this view");
fp.add(S, "bench").name("result");

function applyShow() {
  const newOn = S.show !== "UrbIS solid (city today)";
  root.visible = newOn; urbis.visible = S.show === "UrbIS solid (city today)"; urbisGhost.visible = S.show === "new + UrbIS ghost";
}

// notes: the photos, the measurements, the numbers
const N = model.notes, M = N.measured;
$notes.innerHTML = `
<h3>Reference photos (not shipped; overlay works where data/raw/refs/stjob/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v.file).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.src}</li>`).join("")}</ul>
<h3>Measured (UrbIS 3D solid 509924 + DSM/DTM 2021 0.5 m, CC0)</h3>
<ul>
<li>plan: octagon (face ${M.wing_width} m, centre ${M.octagon_centre_city.join(", ")}), 8 gabled wings, axes turned ${M.wing_axes_rotation_deg}°</li>
<li>wing ends from the centre: ${Object.entries(M.wing_ends_from_centre).map(([k, v]) => `${k} ${v}`).join(", ")} m</li>
<li>wing eaves ${M.wing_eaves_taw}, ridges ${M.wing_ridge_taw}; chapels ${M.chapel_eaves_taw} / ${M.chapel_apex_taw}; drum top ${M.drum_top_taw}</li>
<li>dome profile (flat radius, m TAW): ${M.dome_profile_taw.map((p) => `${p[0]}/${p[1]}`).join(" ")}</li>
<li>lantern ${M.lantern_taw.join(" / ")}; tower ${M.tower_side} m square, walls to ${M.tower_walls_top_taw}, spire ${M.spire_tip_taw}, weathercock ${M.weathercock_taw} m TAW</li>
</ul>
<h3>Estimated</h3><p>floor ${N.estimated.floor_taw} m TAW (13 steps above the street, DTM 73.2 m); ${N.estimated.from_photos}.</p>
<h3>Model</h3><p>${model.lods.map((l, k) => `LOD${k} ${l.tris.toLocaleString()} tris`).join(" · ")}; 4 materials = 4 draw calls (+ shadows);
AO ${(model.aoBytes / 1048576).toFixed(1)} MB (2048² R8 + mips). City placement: position (${N.placement.city_local_position.join(", ")}), rotation.y ${N.placement.rotation_y_rad} rad; hides ${N.placement.hides}.</p>`;
$notes.style.display = "block";

// ------------------------------------------------------------------------------------------------ render loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
goView(qp.get("view") && PHOTOS[qp.get("view")] ? qp.get("view") : "b front");

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let forced = null;                 // the benchmark's LOD (or "off")
async function bench() {
  const res = [];
  for (const mode of ["off", 0, 1, 2]) {
    forced = mode;
    await new Promise((r) => setTimeout(r, 600));
    gpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, 2500));
    const s = [...gpu.samples].sort((a, b) => a - b);
    res.push([mode, s.length ? s[Math.floor(s.length / 2)] : NaN]);
  }
  forced = null;
  const off = res[0][1];
  S.bench = res.slice(1).map(([k, ms]) => `L${k} ${ms.toFixed(2)} (+${(ms - off).toFixed(2)})`).join(" ") + ` · none ${off.toFixed(2)} ms`;
  console.log("[church lab] GPU ms median per frame:", res, "view", S.view);
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
}
window.lab = { renderer, scene, camera, model, lighting, goView, bench, gpu, S };

const nv = new THREE.Vector3();
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  const dist = camera.position.distanceTo(centre);
  let k = S.lod === "auto" ? STJOB_LODS.findIndex((l) => dist < l.until) : +S.lod.slice(3);
  if (forced !== null) k = forced === "off" ? -1 : forced;
  lodGroups.forEach((g, i) => { g.visible = i === k; });
  if (forced === "off") root.visible = false; else if (forced !== null) root.visible = true; else applyShow();
  S.lodInfo = k >= 0 ? `LOD${k} · ${model.lods[k].tris.toLocaleString()} tris · ${dist.toFixed(0)} m` : "off";
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(dist * 0.9, 60, 380));
  nestMark.visible = S.nest;
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (S.nest) {
    nv.copy(nestWorld).project(camera);
    const vis = nv.z < 1 && Math.abs(nv.x) < 1 && Math.abs(nv.y) < 1;
    $nest.style.display = vis ? "block" : "none";
    if (vis) { $nest.style.left = `${(nv.x * 0.5 + 0.5) * innerWidth + 8}px`; $nest.style.top = `${(-nv.y * 0.5 + 0.5) * innerHeight - 6}px`; }
  } else $nest.style.display = "none";
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\n${S.lodInfo}  (auto: LOD0 < ${STJOB_LODS[0].until} m, LOD1 < ${STJOB_LODS[1].until} m)\n` +
      `${model.lods.map((l, i) => `LOD${i} ${l.tris.toLocaleString()}`).join(" · ")} triangles · 4 draw calls/LOD · AO map ${(model.aoBytes / 1048576).toFixed(1)} MB` +
      `\nbenchmark (median GPU ms, whole frame; + = the church): ${S.bench}`;
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
