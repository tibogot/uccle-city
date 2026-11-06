// THE TRAM LAB: the scripted STIB T3000, second pass (tools/blender/tram2.py -> models/tram2/, viewer/tram2Model.js; ?tram=v1
// = the first model, tools/blender/tram.py -> models/tram/, viewer/tramModel.js: the
// loader, LODs, material and placement the city uses) on a short track: a straight, a curve of the
// radius of the tightest Saint-Job curve (18 m: GTFS shape of line 92 at Place de Saint-Job, three-point circle fit),
// and another straight. The tram drives back and forth so the modules articulate (lead cab: white headlights; the
// other: red tail lights; the display shows the direction's real headsign). Under the city's own lighting
// (viewer/lighting.js) and post chain (viewer/post.js). LOD switch / auto, wireframe, up to 20 trams for the GPU cost,
// the reference photos' viewpoints with an overlay of the photo when it is on disk (data/raw/refs/tram/, never shipped).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
const qp = new URLSearchParams(location.search);
// ?tram=v1: the first model (viewer/tramModel.js, tools/blender/tram.py); default: the second pass (viewer/tram2Model.js)
const V1 = qp.get("tram") === "v1";
const { loadTramModel, createTramFleet, tramPose, TRAM_LODS, tramLook } = V1 ? await import("../viewer/tramModel.js") : await import("../viewer/tram2Model.js");
const $info = document.getElementById("info"), $photo = document.getElementById("photo"), $notes = document.getElementById("notes");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.2, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the track
const R = +(qp.get("radius") || 18);                  // m: Place de Saint-Job's tightest curve (GTFS fit ~17.9 m)
const STRAIGHT = 70;
const trackPts = [];
for (let s = -STRAIGHT; s < 0; s += 0.25) trackPts.push([s, 0]);
const arcN = Math.ceil((Math.PI / 2) * R / 0.25);
for (let k = 0; k <= arcN; k++) { const a = (Math.PI / 2) * k / arcN; trackPts.push([R * Math.sin(a), -R * (1 - Math.cos(a))]); }
for (let s = 0.25; s <= STRAIGHT; s += 0.25) trackPts.push([R, -R - s]);
const cum = new Float64Array(trackPts.length);
for (let i = 1; i < trackPts.length; i++) cum[i] = cum[i - 1] + Math.hypot(trackPts[i][0] - trackPts[i - 1][0], trackPts[i][1] - trackPts[i - 1][1]);
const TRACK_LEN = cum[cum.length - 1];
const ARC0 = STRAIGHT, ARC1 = STRAIGHT + (Math.PI / 2) * R;
/** point + heading at distance s along the track (clamped), offset by (ox, oz) */
const atTrack = (s, ox = 0, oz = 0) => {
  s = Math.max(0, Math.min(TRACK_LEN, s));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = trackPts[lo], b = trackPts[hi];
  return [a[0] + (b[0] - a[0]) * f + ox, a[1] + (b[1] - a[1]) * f + oz, Math.atan2(-(b[1] - a[1]), b[0] - a[0])];
};
const MAX_TRAMS = 20;
const offsets = Array.from({ length: MAX_TRAMS }, (_, i) => [-6 * i, 6 * i]);     // parallel copies of the track, 6 m apart
const RAIL_TOP = 0.0;
const ground = () => RAIL_TOP;

const model = await loadTramModel().catch((e) => { $info.textContent = "models/tram/ not found: " + e.message; throw e; });
// ground: asphalt with a setts band along the track, rails, the contact wire
const asphalt = new THREE.MeshStandardNodeMaterial({ color: 0x3b3d40, roughness: 0.92 });
const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), asphalt);
gnd.position.set(0, -0.02, -200); gnd.receiveShadow = true; scene.add(gnd);
function ribbon(off, width, y, step = 1) {
  const pos = [], idx = [];
  for (let i = 0; i < trackPts.length; i += step) {
    const a = trackPts[Math.max(0, i - 1)], b = trackPts[Math.min(trackPts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    const p = trackPts[i];
    pos.push(p[0] + nx * (off - width / 2), y, p[1] + nz * (off - width / 2), p[0] + nx * (off + width / 2), y, p[1] + nz * (off + width / 2));
  }
  for (let i = 0; i < pos.length / 6 - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const setts = new THREE.MeshStandardNodeMaterial({ color: 0x55524d, roughness: 0.85 });
const steel = new THREE.MeshStandardNodeMaterial({ color: 0x9a9690, roughness: 0.35, metalness: 0.9 });
const wireM = new THREE.MeshStandardNodeMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 });
const trackGroup = new THREE.Group(); scene.add(trackGroup);
const settsG = ribbon(0, 3.2, -0.012, 2), railG = [ribbon(0.7175 + 0.035, 0.07, 0.003), ribbon(-0.7175 - 0.035, 0.07, 0.003)];
const copies = [];
for (const [ox, oz] of offsets) {
  const cg = new THREE.Group(); trackGroup.add(cg); copies.push(cg);
  const add = (g, m) => { const o = new THREE.Mesh(g, m); o.position.set(ox, 0, oz); o.receiveShadow = true; cg.add(o); };
  add(settsG, setts); add(railG[0], steel); add(railG[1], steel);
  const wire = new THREE.Mesh(ribbon(0, 0.025, model.layout.wire, 2), wireM); wire.position.set(ox, 0, oz); cg.add(wire);
}

// ------------------------------------------------------------------------------------------------ the tram
const L = model.layout.length;
model.sign.setRows(["FORT-JACO", "SCHAERBEEK GARE", "LOUISE", "MARLOW", "HEROS", "POGGE", "ST-SERVAIS", "VERBOEKHOVEN"]);
const fleet = createTramFleet(model, scene, MAX_TRAMS);

// ------------------------------------------------------------------------------------------------ views (the photos)
// camera positions relative to the tram's nose on the first straight (x ahead, y up, z to the right), estimated
const PHOTOS = {
  "orbit (free)": null,
  "3097 Grand Sablon, 3/4 front (left side)": { file: "Brussels_tram_T3000_3097.jpg", park: 30, cam: [21.55, 2.12, -10.24, 1.9041, 0.0002, 14.26], src: "Jacek Rużyczka, CC BY-SA 4.0 (2015)" },
  "3041 front (telephoto)": { file: "MIVB_3041.jpg", park: 30, cam: [20.03, 2.90, -2.10, 1.5804, -0.0033, 22.21], src: "Willem_90, public domain (2010)" },
  "3028 front 3/4 (left side)": { file: "Tram_de_la_STIB_le_21_juillet_2016.jpg", park: 30, pos: [7.2, 1.75, -4.6], target: [-8, 1.7, 1.2], fov: 46, src: "Commons, CC0 (2016)" },
  "3017 front 3/4 (right side)": { file: "3017_stib_-_Flickr_-_antoniovera1.jpg", park: 30, cam: [14.97, 1.79, 5.07, 1.3151, 0.0003, 19.61], src: "Antonio Vera, CC BY-SA 2.0 (2015)" },
  "3095 side 3/4 (left side)": { file: "Tram_de_la_STIB_le_21_juillet_2016_2.jpg", park: 30, pos: [3.6, 1.75, -5.6], target: [-12, 1.6, 0.6], fov: 52, src: "Commons, CC0 (2016)" },
  "3007 Gare de Saint-Job, in the curve": { file: "Tram_92_gare_de_Saint-Job_14_juillet_2024.jpg", park: ARC1 + 6, abs: true, pos: [R + 3.5, 1.7, -R - 16], target: [R - 4, 2.0, -R + 2], fov: 55, src: "Stratoswift, CC BY-SA 4.0 (2024-07-14)" },
  "side (orthographic-ish)": { file: "", park: 30, pos: [-16, 1.8, -60], target: [-16, 1.8, 0], fov: 30, src: "" },
  "rear 3/4 (cab 5)": { file: "", park: 40, pos: [-37, 1.6, -6.5], target: [-26, 1.8, 0], fov: 50, src: "" },
};
const S = {
  view: qp.get("view") && PHOTOS[qp.get("view")] !== undefined ? qp.get("view") : "orbit (free)", photo: 0, frame: false, notes: false,
  drive: true, speed: 8, pos: 40, dir: 1, follow: true, trams: 1, v: 0, dwell: 12, doorsLab: -1,
  lod: "auto", wireframe: false,
  time: preset, hour: lighting.hour, post: true,
  interior: 1, headlights: 1, display: 1, dirt: 1, glass: 0.62, ao: 1,
  stats: "", joint: "", bench: "—",
};
function goView(name) {
  S.view = name;
  const v = PHOTOS[name];
  if (!v) { $photo.removeAttribute("src"); fitFrame(); return; }
  S.drive = false; S.pos = v.park; S.dir = 1; S.follow = false;
  if (v.abs) { camera.position.set(...v.pos); controls.target.set(...v.target); }
  else if (v.cam) {                                         // fitted to the photo (data/raw/tram2tools/camfit.js): nose-relative position, yaw, pitch, vertical fov
    const [nx, nz] = atTrack(v.park), [cx, cy, cz, yaw, pitch, fov] = v.cam;
    camera.position.set(nx + cx, cy, nz + cz);
    controls.target.set(nx + cx - Math.sin(yaw) * Math.cos(pitch) * 10, cy + Math.sin(pitch) * 10, nz + cz - Math.cos(yaw) * Math.cos(pitch) * 10);
    v.fov = fov;
  } else {
    const [nx, nz] = atTrack(v.park);                       // the nose (on the first straight, heading +x)
    camera.position.set(nx + v.pos[0], v.pos[1], nz + v.pos[2]); controls.target.set(nx + v.target[0], v.target[1], nz + v.target[2]);
  }
  camera.fov = v.fov; camera.updateProjectionMatrix();
  $photo.onload = () => fitFrame(); $photo.onerror = () => { $photo.removeAttribute("src"); fitFrame(); };
  if (v.file) $photo.src = `../data/raw/refs/tram/${v.file}`; else $photo.removeAttribute("src");
  fitFrame();
  ui?.controllersRecursive().forEach((c) => c.updateDisplay());
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

// ------------------------------------------------------------------------------------------------ panel
let ui = null;
ui = new Panel({ title: "Tram Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(PHOTOS)).name("photo viewpoint").onChange(goView).listen();
fv.add(S, "photo", 0, 1, 0.05).name("photo overlay").onChange((v) => { $photo.style.opacity = v; });
fv.add(S, "frame").name("frame = photo").onChange(fitFrame);
fv.add(S, "follow").name("camera follows the tram");
fv.add(S, "notes").name("notes & numbers").onChange((v) => { $notes.style.display = v ? "block" : "none"; });
const fd = ui.addFolder("Drive");
fd.add(S, "drive").name("drive (stop, doors, back)").listen();
fd.add(S, "speed", 0.5, 15, 0.5).name("top speed (m/s)");
fd.add(S, "dwell", 0, 30, 1).name("dwell at the ends (s)");
if (!V1) fd.add(S, "doorsLab", -1, 1, 0.01).name("doors (-1 = auto)").onChange((v) => { tramLook.doors.value = v; });
fd.add(S, "pos", L + 0.5, TRACK_LEN - 0.5, 0.1).name("nose position (m)").listen();
fd.add(S, "trams", 1, MAX_TRAMS, 1).name("trams (GPU test)");
fd.add(S, "joint").name("joints");
const fm = ui.addFolder("Model");
fm.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2"]).name("LOD").onChange((v) => { fleet.forceLod = v === "auto" ? -1 : +v.slice(3); });
fm.add(S, "wireframe").onChange((v) => { model.material.wireframe = v; });
fm.add(S, "interior", 0, 2, 0.01).name("saloon light").onChange((v) => { tramLook.interior.value = v; });
fm.add(S, "headlights", 0, 2, 0.01).onChange((v) => { tramLook.headlights.value = v; });
fm.add(S, "display", 0, 2, 0.01).name("LED display").onChange((v) => { tramLook.display.value = v; });
fm.add(S, "dirt", 0, 1, 0.01).name("grime low on the body").onChange((v) => { tramLook.dirt.value = v; });
if (!V1) {
  fm.add(S, "glass", 0.2, 1, 0.01).name("glass opacity").onChange((v) => { tramLook.glassOpacity.value = v; });
  fm.add(S, "ao", 0, 1.5, 0.01).name("baked AO").onChange((v) => { tramLook.ao.value = v; });
}
const fl = ui.addFolder("Light");
fl.add(S, "time", Object.keys(PRESETS)).name("preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "post").name("post effects (AO, SSR, bloom)");
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame");
fp.add({ go: () => bench() }, "go").name("benchmark: 20 trams, GPU ms per LOD");
fp.add(S, "bench").name("result");

await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
camera.position.set(-6, 3.2, 14); controls.target.set(-14, 1.6, 0);
if (S.view !== "orbit (free)") goView(S.view); else fitFrame();

// notes
const lods = model.lods.map((l, k) => `LOD${k}: ${Math.round(l.tris).toLocaleString()} triangles per tram, up to ${TRAM_LODS[k].until} m`).join("<br>");
$notes.innerHTML = `<h3>Rolling stock</h3><p>Tram 92 is run by STIB's <b>T3000</b> (Bombardier Flexity Outlook Cityrunner, 5 sections, 3 bogies);
photos of cars 3007, 3036, 3128, 3131 on line 92 in 2024-2026. The TNG trams (Alstom, 2023+) run on lines 9, 19, 51, 82. Line 97 (also through Uccle) runs the old PCC 7900 (photo 2025-02-25): not modelled. Research: docs/tram2/RESEARCH.md.</p>
<h3>Measured (published)</h3><p>${model.layout.measured}</p><h3>Estimated (from photos)</h3><p>${model.layout.estimated}</p>
<h3>Levels of detail</h3><p>${lods}<br>one draw call per piece type and LOD (6 types), one node material</p>
<h3>Reference photos (not shipped; overlay works where data/raw/refs/tram/ is on disk)</h3>
<ul>${Object.entries(PHOTOS).filter(([, v]) => v).map(([k, v]) => `<li><b>${k}</b>: ${v.file} — ${v.src}</li>`).join("")}</ul>`;

// ------------------------------------------------------------------------------------------------ GPU timing, benchmark
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
let hideTrams = false;
async function bench() {
  const keep = { trams: S.trams, lod: S.lod, follow: S.follow, cam: camera.position.clone(), tgt: controls.target.clone() };
  S.trams = MAX_TRAMS; S.follow = false;
  camera.position.set(40, 38, 150); controls.target.set(-30, 0, 50);              // all 20 trams in view
  const res = [];
  for (const mode of ["off", 0, 1, 2]) {
    hideTrams = mode === "off"; fleet.forceLod = mode === "off" ? -1 : mode;
    await new Promise((r) => setTimeout(r, 700));
    gpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, 2500));
    const s = [...gpu.samples].sort((a, b) => a - b);
    res.push([mode, s.length ? s[Math.floor(s.length / 2)] : NaN, renderer.info.render.drawCalls ?? renderer.info.render.calls]);
  }
  hideTrams = false; S.trams = keep.trams; S.follow = keep.follow; camera.position.copy(keep.cam); controls.target.copy(keep.tgt);
  fleet.forceLod = keep.lod === "auto" ? -1 : +keep.lod.slice(3);
  const off = res[0][1];
  S.bench = res.slice(1).map(([k, ms]) => `L${k} ${ms.toFixed(2)} (+${(ms - off).toFixed(2)})`).join(" ") + ` · none ${off.toFixed(2)} ms`;
  console.log("[tram lab] GPU ms median per frame, 20 trams in view:", res);
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
  return res;
}
window.lab = { renderer, scene, camera, controls, model, fleet, lighting, goView, fitFrame, bench, gpu, S, atTrack, PHOTOS };

// ------------------------------------------------------------------------------------------------ loop
const pose = [];
let dwellT = 0, doorOpen = 0, braking = 0;
const phases = offsets.map((_, i) => (i * 37.3) % (TRACK_LEN - L));
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const GAPB = model.layout.gap, HWB = model.layout.width / 2 - 0.035;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  // drive: accelerate (1.0 m/s²), cruise, brake (1.1 m/s²) to a stop at each end, open the right-hand doors,
  // dwell, close, then go back the other way (cab 5 leads)
  if (S.drive) {
    const end = S.dir > 0 ? TRACK_LEN - 0.5 : L + 0.5;
    if (dwellT > 0) {
      dwellT -= dt; S.v = 0; braking = 0;
      const t = S.dwell - dwellT;
      doorOpen = Math.max(0, Math.min(1, (t - 1) / 3, (dwellT - 0.5) / 3));
      if (dwellT <= 0) { S.dir *= -1; doorOpen = 0; }
    } else {
      const dist = Math.abs(end - S.pos);
      const vT = Math.min(S.speed, Math.sqrt(2 * 1.1 * Math.max(0, dist - 0.02)));
      braking = S.v > vT + 0.01 ? 1 : 0;
      S.v = S.v < vT ? Math.min(vT, S.v + 1.0 * dt) : Math.max(vT, S.v - 1.6 * dt);
      S.pos += S.dir * S.v * dt;
      if (dist < 0.05 || (S.dir > 0 ? S.pos >= end : S.pos <= end)) { S.pos = end; S.v = 0; dwellT = S.dwell; if (!S.dwell) S.dir *= -1; }
    }
  }
  // the nose is cab 1's tip; driving back, cab 5 leads (its headlights, the other direction's headsign)
  fleet.begin(camera);
  copies.forEach((c, i) => { c.visible = i < (hideTrams ? MAX_TRAMS : S.trams); });
  let maxA = 0;
  for (let i = 0; i < (hideTrams ? 0 : S.trams); i++) {
    const [ox, oz] = offsets[i];
    let d = S.pos, dir = S.dir;
    if (i > 0) { const span = TRACK_LEN - L - 1, t = (phases[i] + now / 1000 * S.speed) % (2 * span); d = L + 0.5 + (t < span ? t : 2 * span - t); dir = t < span ? 1 : -1; }
    tramPose(model.layout, (s) => atTrack(s, ox, oz), d, pose, dir < 0);
    if (i === 0) for (const p of pose) if (p.piece === "Bellows") maxA = Math.max(maxA, Math.abs(p.angle));
    fleet.add(pose, ground, { sign: dir > 0 ? 0 : 1, doors: i === 0 ? [doorOpen, 0] : null, brake: i === 0 ? braking : 0 });
  }
  fleet.end();
  const clear = 2 * (GAPB - HWB * Math.sin(maxA / 2)), cover = GAPB + HWB * Math.sin(maxA / 2);
  S.joint = `max ${(maxA * 180 / Math.PI).toFixed(1)}° · inner ${(clear * 100).toFixed(0)} cm · outer ${(cover * 100).toFixed(0)}/${(model.layout.bellowsHalf * 100).toFixed(0)} cm`;
  if (S.follow) {
    tramPose(model.layout, atTrack, S.pos, pose);
    let cx = 0, cz = 0; for (const p of pose) { cx += p.x; cz += p.z; } cx /= pose.length; cz /= pose.length;
    const dx = cx - controls.target.x, dz = cz - controls.target.z;
    controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz;
  }
  controls.update();
  lighting.update(camera.position.y, 0, controls.target, 120);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    const st = fleet.stats;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = `${backend} · ${S.stats}\ntrams drawn ${st.trams} (LOD0 ${st.perLod[0]} · LOD1 ${st.perLod[1]} · LOD2 ${st.perLod[2]}) · culled ${st.culled}` +
      `\n${model.lods.map((l, i) => `LOD${i} ${Math.round(l.tris).toLocaleString()}`).join(" · ")} triangles per tram · joints: ${S.joint}` +
      `\ncurve radius ${R} m · ${S.dir > 0 ? "92 Fort-Jaco (cab 1 leads)" : "92 Schaerbeek Gare (cab 5 leads)"}\nbenchmark (median GPU ms, whole frame; + = 20 trams): ${S.bench}`;
  }
});
addEventListener("resize", fitFrame);
