// THE INTERIOR LAB: the first interior cell (models/interior/maison1: a terraced house near Place de Saint-Job, UrbIS
// building 1786120, built by tools/blender/interior.py) standing in its street: the real ground (UrbIS DTM + the tile's
// orthophoto), the city's own façades for the house and its neighbours (viewer/facades.js, with the house's openings cut
// out: viewer/interior/cut.js), the city's lighting and post chain. Walk in with the third-person character (front door
// opens, stairs with foot IK, walls and furniture collide); day / night; debug views (lightmaps off, lighting only,
// albedo only, colliders, probes); a perf readout.
// URL: ?time=golden|midday|overcast|twilight|night  ?view=street|salon|kitchen|stair|bedroom|bathroom|study|walk
//      ?char=hoodie|casual|capsule  ?fx=0 (no post)  ?probes=0
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec2, vec3, positionWorld, mix, float, uniform } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS, env } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { houseCut, setHouseCut, cutOpacity } from "../viewer/interior/cut.js";
import { buildingMeshes } from "../viewer/facades.js";
import { Heightmap } from "../viewer/heightmap.js";
import { loadInterior, interiorLook } from "../viewer/interior/interiorModel.js";
import { bakeProbes, probeVariant, probeLook } from "../viewer/interior/probes.js";
import { Portal, INTERIOR_LAYER } from "../viewer/interior/portal.js";
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH, PrismSet } from "../viewer/character/index.js";

houseCut.enabled = true;                     // before any façade / ground material is built
const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const HOUSE = "../models/interior/maison1/", TILE = "I6";
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ data
const T0 = performance.now();
const tileUrl = (f) => `../data/tiles/${TILE}/${f}`;
const [spec, doc, bin, roads, feats, thdr, tbin] = await Promise.all([
  fetch(HOUSE + "house.json").then((r) => r.json()), fetch(tileUrl("buildings.json")).then((r) => r.json()), fetch(tileUrl("buildings.bin")).then((r) => r.arrayBuffer()),
  fetch(tileUrl("roads.json")).then((r) => r.json()), fetch(tileUrl("features.json")).then((r) => r.json()),
  fetch(tileUrl("terrain.json")).then((r) => r.json()), fetch(tileUrl("terrain.u16")).then((r) => r.arrayBuffer()),
]);
setHouseCut(spec);
const hm = new Heightmap(thdr, tbin);
const O = new THREE.Vector3(spec.frame.origin[0], spec.base, spec.frame.origin[1]);
const R = 95;                                   // the street around the house
const near = (b) => b.footprint[0].some(([x, z]) => Math.hypot(x - O.x, z - O.z) < R);
const doc2 = { ...doc, buildings: doc.buildings.filter(near) };
const city = new THREE.Group(); city.name = "city"; scene.add(city);
for (const m of buildingMeshes(doc2, bin, roads, feats).meshes) city.add(m);

// the ground: the DTM on a 1 m grid, the orthophoto draped, cut inside the house (the DTM is above its floor at the back)
const insideFoot = (x, z) => {
  const dx = x - O.x, dz = z - O.z, [ex, ez] = spec.frame.ex;
  const lx = dx * ex + dz * ez, lz = -dx * ez + dz * ex;
  return lx > -0.2 && lx < 5.75 && lz > 0.05 && lz < 10.85;
};
const groundAt = (x, z) => hm.surface(x, z);
{
  const S = 2 * R, N = S;
  const g = new THREE.PlaneGeometry(S, S, N, N).rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) + O.x + 3, z = P.getZ(i) + O.z + 5; P.setXYZ(i, x, groundAt(x, z) - 0.03, z); }
  g.computeVertexNormals();
  const ortho = await new THREE.TextureLoader().loadAsync(tileUrl("ortho.jpg")).catch(() => null);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.93 });
  if (ortho) {
    ortho.colorSpace = THREE.SRGBColorSpace; ortho.anisotropy = 8;
    const b = thdr; const uvO = positionWorld.xz.sub(vec2(b.x0, b.z0)).div(b.size);
    m.colorNode = texture(ortho, uvO).rgb.mul(0.85);
  } else m.color.set(0x55575c);
  m.maskNode = cutOpacity(float(1), -0.08).greaterThan(0.5);
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true; ground.name = "ground";
  city.add(ground);
}

// ------------------------------------------------------------------------------------------------ the interior cell
await lighting.attach(camera);
const cell = await loadInterior(HOUSE, { renderer, scene, camera });
scene.add(cell.root);
houseCut.uFade.value = 1;
const local = (x, y, z) => cell.root.localToWorld(new THREE.Vector3(x, y, z));

// ------------------------------------------------------------------------------------------------ collision + character
const world = new CollisionWorld();
world.add(new Heightfield((x, z) => (insideFoot(x, z) ? -1e4 : groundAt(x, z))));
const polys = doc2.buildings.filter((b) => b.footprint[0]?.length >= 3).map((b) => ({ rings: b.footprint, base: b.base - 3, top: b.top, id: b.attrs?.BU_ID || b.id }));
const prisms = world.add(new PrismSet(polys, []));
prisms.exclude(spec.BU_ID, true);             // the house's own footprint no longer blocks: its interior collides instead
const tb0 = performance.now();
const bvh = world.add(new TriBVH(cell.colliders)); bvh.tag = 3;
const bvhMs = performance.now() - tb0;
const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world });
tp.body.root.visible = false;
const spawn = () => { const s = cell.info.spawn.outside; const p = local(s[0], 0, s[2]); const yaw = Math.atan2(cell.root.matrixWorld.elements[8], cell.root.matrixWorld.elements[10]); tp.start(p.x, groundAt(p.x, p.z) + 0.05, p.z, yaw); };
const charName = qp.get("char") || "hoodie";
if (charName !== "capsule") await tp.useCharacter(charName, renderer).catch((e) => console.warn("character", e));

// ------------------------------------------------------------------------------------------------ probes (character lighting inside)
let probes = null;
const S = {
  mode: "orbit", view: qp.get("view") || "street", time: preset, light: "follow city", post: qp.get("fx") !== "0",
  lightmaps: true, debugView: "final", colliders: false, probesShow: false, footIK: true,
  dayGain: interiorLook.dayGain.value, sunGain: interiorLook.sunGain.value, nightGain: interiorLook.nightGain.value, probeGain: probeLook.gain.value,
  perf: "", cellInfo: "", portal: "",
};
async function makeProbes() {
  probes = await bakeProbes(cell, renderer, { onProgress: (k) => { S.cellInfo = `probes ${(k * 100).toFixed(0)} %`; } });
  tp.body.setVariant(probeVariant(probes, tp.body));
  for (const [mesh, ...mats] of tp.body.warmModel()) for (const m of mats) { mesh.material = m; await renderer.compileAsync(scene, camera); }
}
if (qp.get("probes") !== "0") await makeProbes();
const portal = new Portal(cell, { camera, sun: lighting.sun, extra: [tp.body.root] });

// debug: colliders as a wireframe, probes as small spheres
const colGeo = new THREE.BufferGeometry(); colGeo.setAttribute("position", new THREE.BufferAttribute(cell.colliders, 3));
const colMesh = new THREE.Mesh(colGeo, new THREE.MeshBasicNodeMaterial({ color: 0xff5533, wireframe: true, transparent: true, opacity: 0.6, depthTest: false }));
colMesh.visible = false; colMesh.renderOrder = 10; colMesh.layers.enable(INTERIOR_LAYER); scene.add(colMesh);
let probeDots = null;
function showProbes(on) {
  if (on && !probeDots && probes) {
    const g = probes.grids.day, res = g.resolution, pts = [], v = new THREE.Vector3();
    for (let x = 0; x < res.x; x++) for (let y = 0; y < res.y; y++) for (let z = 0; z < res.z; z++) { g.getProbePosition(x, y, z, v); pts.push(cell.root.localToWorld(v.clone())); }
    const sph = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 6), new THREE.MeshBasicNodeMaterial(), pts.length);
    sph.material = probeVariant(probes, tp.body)({ vertexColors: false, color: new THREE.Color(1, 1, 1) }, false);
    pts.forEach((p, i) => sph.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    sph.layers.enable(INTERIOR_LAYER); scene.add(sph); probeDots = sph;
  }
  if (probeDots) probeDots.visible = on;
}

// ------------------------------------------------------------------------------------------------ views
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const L = cell.info.inner;
const VIEWS = {   // house local: eye, target
  street: [[1.0, 1.7, -4.6], [3.0, 3.6, 2]],
  facade_night: [[5.5, 1.7, -4.4], [2.0, 3.2, 1]],
  salon: [[2.75, 1.6, 5.2], [5.0, 1.0, 1.4]],
  kitchen: [[5.0, 1.7, 5.9], [0.7, 0.9, 9.5]],
  dining: [[1.3, 1.6, 10.2], [4.4, 0.8, 6.5]],
  stair: [[2.1, 1.6, 0.55], [0.5, 2.6, 5.5]],
  bedroom: [[3.4, 5.0, 5.6], [4.7, 3.9, 2.4]],
  bathroom: [[2.8, 5.0, 7.3], [4.9, 4.0, 10.1]],
  study: [[2.0, 5.0, 8.3], [0.8, 4.2, 10.4]],
  landing: [[1.9, 5.0, 7.6], [0.5, 3.6, 3.0]],
};
function goView(v) {
  const V = VIEWS[v]; if (!V) return;
  S.view = v; setMode("orbit");
  camera.position.copy(local(...V[0])); controls.target.copy(local(...V[1])); controls.update();
}
function setMode(m) {
  S.mode = m;
  if (m === "walk") { controls.enabled = false; spawn(); tp.body.root.visible = true; }
  else { tp.stop(); controls.enabled = true; }
}
function setLight(v) {
  S.light = v;
  interiorLook.dayOverride.value = -1;
  if (v === "day") { lighting.apply(S.time === "night" || S.time === "twilight" ? "golden" : S.time); pipe?.look(lighting.preset ?? "golden"); }
  else if (v === "night") { lighting.apply("night"); pipe?.look("night"); }
  else if (v === "follow city") { lighting.apply(S.time); pipe?.look(S.time); }
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Interior Lab" });
const fv = ui.addFolder("Views");
for (const v of Object.keys(VIEWS)) fv.add({ go: () => goView(v) }, "go").name(v);
fv.add({ go: () => setMode("walk") }, "go").name("walk in (third person)");
const fl = ui.addFolder("Light");
fl.add(S, "light", ["follow city", "day", "night"]).name("day / night").onChange(setLight);
fl.add(S, "time", Object.keys(PRESETS)).name("city preset").onChange((v) => { S.light = "follow city"; lighting.apply(v); pipe?.look(v); });
fl.add(S, "dayGain", 0, 12, 0.05).name("sky gain").onChange((v) => { interiorLook.dayGain.value = v; });
fl.add(S, "sunGain", 0, 12, 0.05).name("sun gain").onChange((v) => { interiorLook.sunGain.value = v; });
fl.add(S, "nightGain", 0, 3, 0.01).name("lamps gain").onChange((v) => { interiorLook.nightGain.value = v; });
fl.add(S, "probeGain", 0, 2, 0.01).name("character (probes)").onChange((v) => { probeLook.gain.value = v; });
fl.add(S, "post").name("post effects");
const fd = ui.addFolder("Debug");
fd.add(S, "lightmaps").name("baked light").onChange((v) => { interiorLook.lightmaps.value = v ? 1 : 0; });
fd.add(S, "debugView", ["final", "lighting only", "albedo only"]).name("view").onChange((v) => { interiorLook.view.value = ["final", "lighting only", "albedo only"].indexOf(v); });
fd.add(S, "colliders").name("colliders").onChange((v) => { colMesh.visible = v; tp.debug.visible = v; });
fd.add(S, "probesShow").name("probes").onChange(showProbes);
fd.add(S, "footIK").name("foot IK").onChange((v) => { tp.body.ikOn = v; });
fd.add({ cut: false }, "cut").name("façade: painted windows").onChange((v) => { houseCut.uFade.value = v ? 0 : 1; });
const fp = ui.addFolder("Performance");
fp.add(S, "perf").name("frame").listen();
fp.add(S, "portal").name("portal").listen();
fp.add(S, "cellInfo").name("cell").listen();

// ------------------------------------------------------------------------------------------------ loop
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const gpu = { avg: 0, pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const bootMs = performance.now() - T0;
window.lab = { renderer, scene, camera, cell, tp, world, portal, lighting, interiorLook, houseCut, goView, setMode, setLight, S, gpu, probes: () => probes, pipe };
if (qp.get("view") === "walk") setMode("walk"); else goView(S.view in VIEWS ? S.view : "street");
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const focus = new THREE.Vector3(), cp = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (S.mode === "walk") { tp.update(dt); cp.set(tp.x, tp.y + 1, tp.z); tp.body.useVariant(!!probes && cell.contains(cp, 0.1)); }
  else controls.update();
  cell.update(dt, S.mode === "walk" ? cp : camera.position);
  focus.copy(S.mode === "walk" ? cp : controls.target);
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), focus, 50, dt);
  const sealed = portal.update();
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 10 === 1) {
    const r = renderer.info.render, st = cell.stats;
    S.perf = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    S.portal = portal.inside ? (sealed ? "inside, no opening in view: city skipped" : `inside, ${portal.visible} openings in view`) : "outside";
    if (!/probes \d/.test(S.cellInfo) || probes) S.cellInfo = `${st.triangles} tris · ${st.draws} draws · load ${st.loadMs} ms · ready ${st.readyMs} ms` + (probes ? ` · probes ${probes.probes} in ${probes.ms} ms (worst slice ${probes.worstSliceMs} ms)` : "");
    $info.textContent = `${backend} · ${S.perf}\ninterior cell: ${S.cellInfo}\nportal: ${S.portal} · door ${(cell.doorOpen * 100).toFixed(0)} %\n` +
      `colliders: ${bvh.count} triangles (BVH ${bvhMs.toFixed(1)} ms) + ${prisms.P} footprints (house excluded) · boot ${bootMs.toFixed(0)} ms` +
      (S.mode === "walk" ? `\ncharacter CPU ${tp.perf.ms.toFixed(3)} ms · ${tp.ctl.grounded ? "ground" : "air"} · y ${(tp.y - spec.base).toFixed(2)} m above base · indoor light ${tp.body.variantOn ? "probes" : "city"}` : "");
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
addEventListener("keydown", (e) => { if (e.code === "Escape" && S.mode === "walk") setMode("orbit"); });
