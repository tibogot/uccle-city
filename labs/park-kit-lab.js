// THE PARK KIT LAB: the two reusable kits made for the Parc de la Sauvagere (and any park): the concrete rockwork
// kit (tools/blender/rockKit.py) and the playground kit (tools/blender/playgroundKit.py), LODs by meshoptimizer
// (tools/park_kit_pack.mjs), drawn instanced with per-instance dithered LOD cross-fades (viewer/parkKit.js), under the
// city's lighting and post chain. Scenes: each kit's gallery, a sample cliff of 40 rock pieces, a sample playground;
// LOD mode / band scale / wireframe; slot swap for the safety surface; camera moves through the LOD bands (lab.dolly);
// GPU benchmark (median GPU ms per frame, kit drawn vs not: lab.bench()); the mesh checker's results and the LOD
// table from the kits' json; a page with what the city draws at the park today (screenshots).
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadParkKit, KitField, sampleCliff, samplePlayground, sampleSauvagereCliff, kitLook, pgLook, SHADOW_LAYER } from "../viewer/parkKit.js";
import { loadSauvagereSite, placeSauvagereCliff, siteTerrain } from "../viewer/sauvagereCliff.js";
import { PlantField } from "../viewer/parkPlants.js";
import { texture as tslTexture, positionWorld as tslPW, float as tslF, smoothstep as tslSS, vec3 as tslV3 } from "three/tsl";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $page = document.getElementById("page");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ ground
{
  const g = new THREE.Mesh(new THREE.CircleGeometry(1500, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3d4a2c, roughness: 1 }));
  g.receiveShadow = true; g.position.y = -0.01; scene.add(g);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(36, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x5b4a36, roughness: 1 }));
  pad.position.set(80, -0.005, 0); pad.receiveShadow = true; scene.add(pad);
}

// a flat dark pond in front of the Sauvagere cliff (context only: the real water is the park-water module, claude/wolvendael)
const water = new THREE.Mesh(new THREE.PlaneGeometry(40, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x1c2016, roughness: 0.22, metalness: 0 }));
water.position.set(1, 0.03, -9.5); water.scale.set(1.3, 1, 1.4); water.receiveShadow = true; scene.add(water);

// ------------------------------------------------------------------------------------------------ kits and scenes
const t0 = performance.now();
const [rocks, play] = await Promise.all([loadParkKit("rockkit"), loadParkKit("playgroundkit")]);
const loadMs = performance.now() - t0;
const fields = { rock: new KitField(rocks, { shadowProxy: qp.get("proxy") !== "0" }), play: new KitField(play) };
// round 3: the measured mound (DTM) + plants
const site = await loadSauvagereSite();
const terrain = siteTerrain(site, new THREE.MeshStandardNodeMaterial({ color: 0x6a4e36, roughness: 1 }));
terrain.visible = false; scene.add(terrain);
const plants = new PlantField({ near: 15, far: 21 });
scene.add(plants.group);
lighting.sun?.shadow?.camera?.layers.enable(SHADOW_LAYER);
for (const f of Object.values(fields)) scene.add(f.group);
const SCENES = ["Sauvagère mound (DTM, o01)", "Sauvagère cliff (o01)", "sample cliff (40 pieces)", "rock gallery", "sample playground", "playground gallery", "cliff + playground"];
const FOCUS = { rock: new THREE.Vector3(0, 1.5, 0), play: new THREE.Vector3(80, 1, 0) };
function gallery(field, kit, origin) {
  const names = Object.keys(kit.pieces).sort();
  let x = 0; const m = new THREE.Matrix4();
  const total = names.reduce((s, n) => s + kit.pieces[n].size[0] + 1.2, 0);
  for (const n of names) {
    const w = kit.pieces[n].size[0];
    m.makeTranslation(origin.x - total / 2 + x + w / 2, origin.y, origin.z);
    field.add(n, m); x += w + 1.2;
  }
}
function build(sc) {
  for (const f of Object.values(fields)) f.clear();
  if (sc === "rock gallery") gallery(fields.rock, rocks, new THREE.Vector3(0, 0, 0));
  if (sc === "sample cliff (40 pieces)") sampleCliff(fields.rock, { n: 40 });
  if (sc === "Sauvagère cliff (o01)" || sc === "cliff + playground") sampleSauvagereCliff(fields.rock);
  plants.set("fern", []); plants.set("grass", []); plants.set("ivy", []); plants.commit();
  if (sc === "Sauvagère mound (DTM, o01)") placeSauvagereCliff(fields.rock, site, plants);
  water.visible = sc.startsWith("Sauvagère");
  terrain.visible = sc.startsWith("Sauvagère mound");
  if (sc === "playground gallery") gallery(fields.play, play, new THREE.Vector3(80, 0, 0));
  if (sc === "sample playground" || sc === "cliff + playground") samplePlayground(fields.play, { origin: new THREE.Vector3(80, 0, 0) });
  for (const f of Object.values(fields)) f.commit();
  S.instances = `${fields.rock.instances} rock + ${fields.play.instances} playground instances`;
}
const S = { canopy: qp.get("canopy") !== "0", scene: qp.get("scene") && SCENES.includes(qp.get("scene")) ? qp.get("scene") : SCENES[0], lod: "auto", rangeScale: 1, wire: false, post: true,
  time: preset, surface: "surface_rubber", instances: "", stats: "", bench: "(not run)", lodInfo: "" };
build(S.scene);

// ------------------------------------------------------------------------------------------------ views
const VIEWS = {
  "o01 under the canopy": [new THREE.Vector3(1.0, 1.1, -16.5), new THREE.Vector3(0.5, 2.7, 3.0)],
  "mound: walking 12 m": [new THREE.Vector3(-1, 1.7, -10.5), new THREE.Vector3(0, 2.5, 3)],
  "mound: 30 m": [new THREE.Vector3(3, 2.5, -28), new THREE.Vector3(0, 2.5, 3)],
  "mound: grazing close-up": [new THREE.Vector3(-2.5, 2.0, -1.0), new THREE.Vector3(-4.5, 2.3, 2.0)],
  "o01: from the pond": [new THREE.Vector3(-2.0, 1.2, -12.5), new THREE.Vector3(-1.6, 2.6, 0)],
  "Sauvagère: walking 12 m": [new THREE.Vector3(0, 1.7, -12), new THREE.Vector3(1, 2.2, 0)],
  "Sauvagère: 30 m": [new THREE.Vector3(6, 2.5, -30), new THREE.Vector3(1, 2.2, 0)],
  "Sauvagère: grazing close-up": [new THREE.Vector3(-4.0, 1.6, -3.8), new THREE.Vector3(-6.0, 1.8, -0.4)],
  "cliff: walking 12 m": [new THREE.Vector3(-4, 1.7, -12), new THREE.Vector3(0, 2.0, 0)],
  "cliff: grazing close-up": [new THREE.Vector3(-3.4, 1.4, -2.8), new THREE.Vector3(-1.0, 1.6, 0.3)],
  "cliff: from the path 30 m": [new THREE.Vector3(14, 3, -26), new THREE.Vector3(0, 2.5, 0)],
  "cliff: from the street 120 m": [new THREE.Vector3(70, 8, -95), new THREE.Vector3(0, 2.5, 0)],
  "playground: walking 10 m": [new THREE.Vector3(74, 1.7, -10), new THREE.Vector3(80, 1.0, 1)],
  "playground: grazing timber": [new THREE.Vector3(82.3, 1.5, 0.2), new THREE.Vector3(81.0, 1.3, 2.5)],
  "playground: chains close": [new THREE.Vector3(75.3, 1.4, -0.8), new THREE.Vector3(74.7, 1.3, 1.5)],
  "playground: from 60 m": [new THREE.Vector3(110, 12, -50), new THREE.Vector3(80, 1, 0)],
};
function goView(v) {
  const [p, t] = VIEWS[v]; camera.position.copy(p); controls.target.copy(t); controls.update(); S.view = v;
}
const defView = (sc) => sc.includes("playground") && !sc.includes("cliff") ? "playground: walking 10 m" : sc.startsWith("Sauvagère mound") ? "o01 under the canopy" : sc.startsWith("Sauvagère") ? "o01: from the pond" : "cliff: walking 12 m";
goView(qp.get("view") && VIEWS[qp.get("view")] ? qp.get("view") : defView(S.scene));

/** camera along a line from `from` m to `to` m off the focus point, in `seconds` (the moving check through the LOD bands) */
let dollyState = null;
function dolly(which = "rock", from = 4, to = 280, seconds = 16, height = 1.7) {
  const f = FOCUS[which];
  const dir = new THREE.Vector3(0.35, 0, -1).normalize();
  dollyState = { f, dir, from, to, seconds, t: 0, height };
  return new Promise((r) => { dollyState.done = r; });
}
function stepDolly(dt) {
  const d = dollyState; if (!d) return;
  d.t += dt;
  const u = Math.min(1, d.t / d.seconds), s = d.from * Math.pow(d.to / d.from, u);   // exponential: equal time per LOD band
  camera.position.copy(d.f).addScaledVector(d.dir, s); camera.position.y = d.height + s * 0.08;
  controls.target.copy(d.f);
  S.lodInfo = `dolly ${s.toFixed(1)} m`;
  if (u >= 1) { dollyState = null; d.done(); }
}

// ------------------------------------------------------------------------------------------------ the page: city today + checker + LOD table
function tableOf(kit) {
  const L = kit.info.lods || {};
  const rows = Object.entries(L).map(([p, v]) => `<tr><td>${p}</td>${v.lods.map((l) => `<td>${l.triangles.toLocaleString()} / ${l.draws}</td>`).join("")}<td>${kit.info.audit ? ["0", "1", "2"].map((k) => kit.info.audit[`${p}_lod${k}`]?.blocking ?? "?").join(" · ") : "not run"}</td></tr>`).join("");
  return `<table><tr><th>piece</th><th>LOD0 tris / draws</th><th>LOD1</th><th>LOD2</th><th>checker blocking (LOD0 · 1 · 2)</th></tr>${rows}</table>
    <p>LOD bands (each band's end, m): ${kit.ranges.join(" / ")}; dithered cross-fade over the last 15 % of a band; beyond the last band the piece fades out.</p>`;
}
function showPage() {
  const shot = (f, c) => `<figure><img src="../docs/heroes/sauvagere/${f}" alt=""><figcaption>${c}</figcaption></figure>`;
  $page.innerHTML = `<main><button id="pgClose">close</button><h2>Parc de la Sauvagère: what the city draws there today</h2>
    <p>Screenshots of the city (branch claude/foundation, 2026-11-11, tiles F7 / G7) before any park work. The park is LiDAR trees on
    DTM ground with OSM paths and the OSM pond (natural=water, relation 16802190, with its islet); no temple, no rockwork, no cascade,
    no playground equipment; the Rue de Verrewinkel bridge over line 26 is a flat slab.</p>
    ${shot("city_today_aerial_se.jpeg", "From the south-east, 160 m up: a forest of LiDAR trees over the whole park (the playgrounds are the clearings near the right edge).")}
    ${shot("city_today_aerial_se_notrees.jpeg", "The same with the trees off: DTM ground, OSM paths, the pond (blue) with its islet; sand patches = the playgrounds' ground cover.")}
    ${shot("city_today_pond_cliff_notrees.jpeg", "From the north-west shore, trees off: the 5 m artificial cliff is a grassy slope east of the pond; the temple's place is empty.")}
    ${shot("city_today_temple_from_se.jpeg", "At the temple's height from the south-east: inside the canopy.")}
    ${shot("city_today_verrewinkel_bridge.jpeg", "The Rue de Verrewinkel over the L26 cutting (the park's west entrance), trees off: a flat deck, no brick arches, no parapets.")}
    <h3>Rock kit</h3>${tableOf(rocks)}<h3>Playground kit</h3>${tableOf(play)}
    <p>Checker: tools/mesh_audit (copied as-is from claude/stalle); reports in models/parkkit/audit/. Plan and references: docs/heroes/SAUVAGERE_PREP.md.</p></main>`;
  $page.style.display = "block";
  document.getElementById("pgClose").onclick = () => { $page.style.display = "none"; };
}
document.getElementById("pageLink").onclick = (e) => { e.preventDefault(); showPage(); };
if (qp.get("page") === "1") showPage();

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Park Kit Lab" });
const fs = ui.addFolder("Scene");
fs.add(S, "scene", SCENES).name("scene").onChange((v) => { build(v); goView(defView(v)); warm(); });
fs.add(S, "view", Object.keys(VIEWS)).name("view").onChange(goView);
fs.add({ go: () => dolly("rock") }, "go").name("dolly through the rock LOD bands");
fs.add({ go: () => dolly("play", 4, 200) }, "go").name("dolly through the playground bands");
fs.add({ go: showPage }, "go").name("page: city today + checker + LODs");
fs.add(S, "instances").name("instances").listen();
const fl = ui.addFolder("LOD");
fl.add(S, "lod", ["auto", "LOD0", "LOD1", "LOD2", "off"]).name("level").onChange((v) => { for (const f of Object.values(fields)) f.force = v === "auto" ? null : v === "off" ? "off" : +v.slice(3); });
fl.add(S, "rangeScale", 0.25, 3, 0.05).name("band scale").onChange((v) => { for (const f of Object.values(fields)) f.rangeScale = v; });
fl.add(S, "wire").name("wireframe").onChange((v) => { for (const f of Object.values(fields)) f.wireframe(v); });
fl.add(S, "lodInfo").name("now").listen();
// CANOPY SHADE (o01 is taken under the park's trees): a leafy dome with holes overhead (it shades the scene and lets a
// few sun flecks through, by its shadow), a green-filtered sky light, the sun at half strength, less sky reflection
const canopy = new THREE.Group(); canopy.name = "canopy"; scene.add(canopy);
{
  // a leaf dome all round down below the horizon (the park's trees), with small holes (sky specks, sun flecks)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(46, 72, 36, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 1 }));
  const P = tslPW;
  const f1 = P.x.mul(1.37).sin().mul(P.z.mul(1.13).cos()).add(P.y.mul(1.71).add(P.x.mul(0.6)).sin().mul(0.6)).add(P.z.mul(2.9).add(P.y.mul(2.3)).sin().mul(0.35));
  const f2 = P.x.mul(0.31).sin().mul(P.z.mul(0.27).cos()).add(P.y.mul(0.41).sin().mul(0.5));
  dome.material.colorNode = tslV3(0.045, 0.1, 0.03).mul(tslF(0.55).add(tslSS(-0.8, 1.2, f1).mul(0.7)).add(tslSS(-0.5, 1.0, f2).mul(0.35)));
  dome.material.maskNode = f1.add(f2.mul(0.8)).lessThan(1.55);
  dome.position.set(0, -6, 6); dome.castShadow = true; dome.receiveShadow = false;
  canopy.add(dome);
}
canopy.visible = false;
const canopyLook = () => {
  if (!S.canopy) return;
  lighting.hemi.color.setHex(0x86a070); lighting.hemi.groundColor.setHex(0x4d4231); lighting.hemi.intensity = 1.1;
  scene.environmentIntensity = 0.32;
  if (lighting.sun) lighting.sun.intensity = (PRESETS[S.time]?.sunIntensity ?? 5) * 0.55;
};
const fm = ui.addFolder("Look");
fm.add(S, "canopy").name("canopy shade (o01)").onChange((v) => { canopy.visible = v; if (!v) { lighting.apply(S.time); scene.environmentIntensity = 1; } });
fm.add(kitLook.bump, "value", 0, 2, 0.05).name("rough concrete bump");
fm.add(S, "time", Object.keys(PRESETS)).name("time").onChange((v) => { lighting.apply(v); pipe?.look(v); });
fm.add(S, "post").name("post chain");
fm.add(kitLook.ao, "value", 0, 1, 0.05).name("AO strength");
fm.add(kitLook.aoDirect, "value", 0, 1, 0.05).name("AO on direct light");
fm.add(kitLook.moss, "value", 0, 2, 0.05).name("moss");
fm.add(S, "surface", ["surface_rubber", "surface_woodchip", "sand"]).name("safety surface slot").onChange((v) => { const o = play.info.slot_order; pgLook.surface.value = v === "surface_woodchip" ? o.length : o.indexOf(v); });
fm.add(kitLook.normal, "value", 0, 2, 0.05).name("rock normal map");
const fb = ui.addFolder("GPU");
fb.add({ go: () => bench() }, "go").name("benchmark this view (kit vs none)");
fb.add(S, "bench").name("result").listen();
fb.add(S, "stats").name("now").listen();

// ------------------------------------------------------------------------------------------------ render
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
/** compile every LOD's opaque and fading materials before showing (no shader build mid-dolly) */
async function warm() {
  const saved = [];
  for (const f of Object.values(fields)) for (const im of f.meshes) { saved.push([im, im.count, im.visible]); im.count = 1; im.visible = true; }
  const t = performance.now();
  await renderer.compileAsync(scene, camera).catch(() => {});
  for (const [im, c, v] of saved) { im.count = c; im.visible = v; }
  S.compileMs = performance.now() - t;
}
await warm();

const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
/** interleaved windows (kit drawn / kit off), 1.2 s each after a 0.4 s settle, `cycles` times: median GPU ms of each */
async function bench(cycles = 5) {
  const acc = { on: [], off: [] };
  for (let c = 0; c < cycles; c++) {
    for (const k of ["off", "on"]) {
      for (const f of Object.values(fields)) f.group.visible = k === "on";
      plants.group.visible = k === "on";
      await wait(400); gpu.samples.length = 0; await wait(1200); acc[k].push(...gpu.samples);
    }
  }
  for (const f of Object.values(fields)) f.group.visible = true;
  plants.group.visible = true;
  const on = med(acc.on), off = med(acc.off);
  S.bench = `${(on - off).toFixed(2)} ms (with ${on.toFixed(2)}, without ${off.toFixed(2)})`;
  return { view: S.view, scene: S.scene, on, off, delta: on - off, n: acc.on.length };
}
window.lab = { plants, site, terrain, canopy, renderer, scene, camera, controls, fields, rocks, play, goView, dolly, bench, gpu, S, VIEWS, build, warm, showPage, kitLook, loadMs };

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  stepDolly(dt);
  controls.update();
  const st = [fields.rock.update(camera.position), fields.play.update(camera.position)];
  lighting.update(camera.position.y, 0, controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 1.2, 30, 300));
  canopy.visible = S.canopy && S.scene.startsWith("Sauvagère"); if (canopy.visible) canopyLook();
  const pst = plants.update(camera.position);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    const kitTris = st.reduce((s, x) => s + x.tris, 0), kitDraws = st.reduce((s, x) => s + x.draws, 0);
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms`;
    if (!dollyState) S.lodInfo = `rock L0/L1/L2 ${st[0].lod.join("/")} · play ${st[1].lod.join("/")} · fading ${st[0].fading + st[1].fading}`;
    $info.textContent = `${backend} · ${S.stats} · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris (frame, incl. shadows)\n` +
      `kits now: ${kitDraws} instanced draws, ${(kitTris / 1000).toFixed(1)}k tris (main pass) · ${S.lodInfo} · plants ${pst.plants} drawn (${(pst.tris / 1000).toFixed(1)}k tris) of ${plants.total}\n` +
      `${S.instances} · load ${loadMs.toFixed(0)} ms · shaders ${(S.compileMs ?? 0).toFixed(0)} ms · GPU bench (kits' cost in this view): ${S.bench}`;
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
