// THE KIT LAB: the façade kit (tools/blender/facadeKit.py -> tools/facadekit/packKit.mjs -> models/facadekit/) on its
// own, with the city's lighting and post chain.
//   GALLERY: every piece alone on a plain wall cut like the city's (window, arched window, doors with their steps,
//            soupirail, balcony, hood, sill, cornice run + modillions + outside corner, plinth run): LOD forcing,
//            wireframe, AO on / off and strength, the slot table (point any slot at another material: the adapter
//            the library will use), the variants (blue stone, dark frames, yellow brick), triangles per piece and LOD.
//   ROW:     real I6 buildings (the 4 kit buildings nearest ?at=x,z, default the street east of Place de Saint-Job)
//            through the SAME code as the city: viewer/facadeGeom.js analyseBuildings + viewer/facadeKit/placement.js
//            (the openings of facades.js's window grid), the kit walls cutting their openings, the distance fades.
// URL: ?mode=gallery|row  ?at=x,z  ?time=golden|midday|overcast|night  ?lod=auto|0|1
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec2, positionWorld } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { analyseBuildings, buildingMeshes } from "../viewer/facades.js";
import { Heightmap } from "../viewer/heightmap.js";
import { lodEye } from "../viewer/lodFade.js";
import { loadKitField } from "../viewer/facadeKit/kitField.js";
import { kitCollector, STRIDE, VARIANT, WINDOW_RISE } from "../viewer/facadeKit/placement.js";
import { KIT } from "../viewer/facadeKit/kitFade.js";
import { kitLook, KIT_SLOTS, SLOT_TABLE } from "../viewer/facadeKit/kitMaterials.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 6000);
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);
await lighting.attach(camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ------------------------------------------------------------------------------------------------ the kit
const T0 = performance.now();
const field = await loadKitField();
scene.add(field.group);
const J = field.json;

// ------------------------------------------------------------------------------------------------ gallery
// on a plain brick wall at the origin (x along the wall, wall plane z = 0, ground y = 0), cut like the city's walls
const GAP = 3.6, GY = 100;             // the gallery stands 100 m up: the sky model expects TAW altitudes
const G = new THREE.Group(); G.name = "gallery"; G.position.y = GY; scene.add(G);
const wallMat = new THREE.MeshStandardNodeMaterial({ color: 0x6d3424, roughness: 0.9 });
const groundMat = new THREE.MeshStandardNodeMaterial({ color: 0x55575a, roughness: 0.95 });
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 30).rotateX(-Math.PI / 2), groundMat); g.position.set(GAP * 4, -0.001, 8); g.receiveShadow = true; G.add(g); }
const SLOTS = [   // [label, pieces [name, dy, w, h, variant extra], hole {w, h, y, rise}]
  ["window A + sill + hood", [["winA", 1.0], ["sill", 1.0], ["hood", 1.0]], { w: 1.2, h: 1.6, y: 1.0 }],
  ["window B + sill", [["winB", 1.0], ["sill", 1.0]], { w: 1.2, h: 1.6, y: 1.0, rise: WINDOW_RISE }],
  ["door A + 2 steps", [["doorA", 0.34]], { w: 1.1, h: 2.448, y: 0.34 }],
  ["door B", [["doorB", 0.0]], { w: 1.1, h: 2.448, y: 0.0 }],
  ["window A 0.9 m (9-slice)", [["winA", 1.0, 0.9, 1.5], ["sill", 1.0, 0.9, 1.5]], { w: 0.9, h: 1.5, y: 1.0 }],
  ["balcony on window A", [["winA", 1.6], ["balcony", 1.6]], { w: 1.2, h: 1.6, y: 1.6 }],
  ["soupirail + plinth", [["soup", 0.0], ["plinth", 0.0, 0.9, 0.6, 0, -1.2], ["plinth", 0.0, 0.9, 0.6, 0, 1.2]], null],
  ["cornice + modillions + corner", [["cornice", 4.0, 2.4, 0.6, 0, -0.2], ["modillion", 4.0, 0.1, 0.2, 0, -1.0], ["modillion", 4.0, 0.1, 0.2, 0, -0.45], ["modillion", 4.0, 0.1, 0.2, 0, 0.1], ["modillion", 4.0, 0.1, 0.2, 0, 0.65], ["cornCorner", 4.0, 1, 0.6, 0, 1.0]], null],
];
const S = {
  mode: qp.get("mode") === "row" ? "row" : "gallery", lod: ["0", "1"].includes(qp.get("lod")) ? qp.get("lod") : "auto", wire: false,
  ao: true, aoStrength: 1, aoDirect: kitLook.aoDirect.value, blue: false, dark: false, yellow: false, labels: true, post: qp.get("fx") !== "0",
  time: preset, perf: "", far: KIT.far.value,
};
const tags = [];
function galleryData() {
  const v = (S.blue ? VARIANT.BLUE : 0) | (S.dark ? VARIANT.DARK : 0) | (S.yellow ? VARIANT.YELLOW : 0);
  const pieces = {};
  SLOTS.forEach(([, list], i) => {
    for (const [name, y, w, h, , dx = 0] of list) {
      const P = (pieces[name] ??= []);
      const ref = J.pieces[name];
      const [W0, H0] = ref.kind === "door" ? J.ref.door : ref.kind === "window" || ref.slice === "window" ? J.ref.window : ref.ref;
      P.push(i * GAP + dx, GY + y, 0, 0, 1, w ?? W0, h ?? H0, v, 0.37 + i * 0.07, 0);
      if (name === "doorA") for (let k = 1; k <= 2; k++) (pieces.step ??= []).push(i * GAP, GY + y - 0.17 * (k - 1) - 0.06, 0.3 * k, 0, 1, 1.5, 0.17, 0, 0.5, 0);
    }
  });
  return { pieces: Object.fromEntries(Object.entries(pieces).map(([k, a]) => [k, new Float32Array(a)])) };
}
function galleryWalls() {
  for (const c of [...G.children]) if (c.userData.wall) { G.remove(c); c.geometry.dispose(); }
  SLOTS.forEach(([label, , hole], i) => {
    const x0 = i * GAP - GAP / 2 + 0.05, x1 = i * GAP + GAP / 2 - 0.05;
    const sh = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0), new THREE.Vector2(x1, 4.0), new THREE.Vector2(x0, 4.0)]);
    if (hole) {
      const hw = hole.w / 2, pts = [new THREE.Vector2(i * GAP - hw, hole.y), new THREE.Vector2(i * GAP + hw, hole.y)];
      const r = hole.rise || 0, R = r ? (hw * hw + r * r) / (2 * r) : 0;
      for (let k = 0; k <= 16; k++) {
        const x = hw - (2 * hw * k) / 16;
        pts.push(new THREE.Vector2(i * GAP + x, hole.y + hole.h + (r ? Math.sqrt(R * R - x * x) - (R - r) : 0)));
      }
      sh.holes.push(new THREE.Path(pts));
    }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), wallMat);
    m.castShadow = m.receiveShadow = true; m.userData.wall = true;
    G.add(m);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 4).translate((x0 + x1) / 2, 2, -0.6), new THREE.MeshStandardNodeMaterial({ color: 0x111111 }));
    back.userData.wall = true; G.add(back);                     // a dark room behind the openings
    if (!tags[i]) { const t = document.createElement("div"); t.className = "tag"; t.textContent = label; document.body.append(t); tags[i] = t; }
  });
}
galleryWalls();
const setGallery = () => { field.removeTile("gallery"); field.addTile("gallery", galleryData(), null, { instant: true }); };

// ------------------------------------------------------------------------------------------------ the row (real I6 buildings)
const TILE = "I6";
const tileUrl = (f) => `../data/tiles/${TILE}/${f}`;
const [doc, bin, roads, feats, thdr, tbin] = await Promise.all([
  fetch(tileUrl("buildings.json")).then((r) => r.json()), fetch(tileUrl("buildings.bin")).then((r) => r.arrayBuffer()),
  fetch(tileUrl("roads.json")).then((r) => r.json()), fetch(tileUrl("features.json")).then((r) => r.json()),
  fetch(tileUrl("terrain.json")).then((r) => r.json()), fetch(tileUrl("terrain.u16")).then((r) => r.arrayBuffer()),
]);
const hm = new Heightmap(thdr, tbin);
const AT = (qp.get("at") || "1229,640").split(",").map(Number);
const near = (b, R) => b.footprint[0].some(([x, z]) => Math.hypot(x - AT[0], z - AT[1]) < R);
const doc2 = { ...doc, buildings: doc.buildings.filter((b) => near(b, 90)) };
// pass 1: which buildings take the kit near the point (the 4 nearest, by their kit faces' middles)
const probe = kitCollector({ ground: (x, z) => hm.ground(x, z) });
const faceOf = probe.face, cand = new Map();
probe.face = (f) => {
  const r = faceOf(f);
  if (r.on) { const p = f.tris[0].p[0]; const d = Math.hypot(p[0] - AT[0], p[2] - AT[1]); if (!cand.has(f.key) || cand.get(f.key) > d) cand.set(f.key, d); }
  return r;
};
analyseBuildings(doc2, bin, roads, feats, { kit: probe });
const ROW = new Set([...cand.entries()].sort((a, b) => a[1] - b[1]).slice(0, +(qp.get("n") || 4)).map(([k]) => k));
// pass 2: the context (painted) + the row (kit), exactly the city's path
const rowCol = kitCollector({ ground: (x, z) => hm.ground(x, z), only: ROW });
const pre = analyseBuildings(doc2, bin, roads, feats, { kit: rowCol });
const RG = new THREE.Group(); RG.name = "row"; scene.add(RG);
const BM = buildingMeshes(doc2, bin, roads, feats, pre);
for (const m of BM.meshes) RG.add(m);
{
  const R = 90, N = 180;
  const g = new THREE.PlaneGeometry(2 * R, 2 * R, N, N).rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) + AT[0], z = P.getZ(i) + AT[1]; P.setXYZ(i, x, hm.surface(x, z) - 0.03, z); }
  g.computeVertexNormals();
  const ortho = await new THREE.TextureLoader().loadAsync(tileUrl("ortho.jpg")).catch(() => null);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.93 });
  if (ortho) { ortho.colorSpace = THREE.SRGBColorSpace; ortho.anisotropy = 8; m.colorNode = texture(ortho, positionWorld.xz.sub(vec2(thdr.x0, thdr.z0)).div(thdr.size)).rgb.mul(0.85); }
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true; RG.add(ground);
}
const rowInfo = `${ROW.size} buildings near ${AT.join(", ")}: ${pre.kit.faces} kit faces, ${pre.kit.openings} openings, ` +
  Object.entries(pre.kit.pieces).map(([k, a]) => `${a.length / STRIDE} ${k}`).join(", ");
field.addTile("row", pre.kit, BM.kitWalls, { instant: true });

// ------------------------------------------------------------------------------------------------ views, LOD, slots
const rowCentre = new THREE.Vector3();
{ let n = 0; for (const a of Object.values(pre.kit.pieces)) for (let i = 0; i < a.length; i += STRIDE) { rowCentre.x += a[i]; rowCentre.y += a[i + 1]; rowCentre.z += a[i + 2]; n++; } rowCentre.multiplyScalar(1 / Math.max(1, n)); }
const rowN = (() => { const a = Object.values(pre.kit.pieces)[0]; return a ? new THREE.Vector3(a[3], 0, a[4]) : new THREE.Vector3(0, 0, 1); })();
function setMode(m) {
  S.mode = m;
  G.visible = m === "gallery"; RG.visible = m === "row";
  for (const t of tags) t.style.display = m === "gallery" && S.labels ? "" : "none";
  if (m === "gallery") { camera.position.set(GAP * 1.5, GY + 2.6, 9.5); controls.target.set(GAP * 1.5, GY + 1.9, 0); }
  else { camera.position.copy(rowCentre).addScaledVector(rowN, 16).add(new THREE.Vector3(rowN.z * 6, 3.2 - rowCentre.y + hm.surface(rowCentre.x + rowN.x * 16, rowCentre.z + rowN.z * 16), -rowN.x * 6)); controls.target.copy(rowCentre).add(new THREE.Vector3(0, 2, 0)); }
  controls.update();
  field.forceRebucket();
}
function setLod(v) {
  S.lod = v;
  KIT.lod1.value = v === "0" ? 1e5 : v === "1" ? -1e3 : 28;
  field.forceRebucket();
}
function setWire(on) { for (const m of Object.values(field.mats)) { m.wireframe = on; m.needsUpdate = true; } }
const slotSel = Object.fromEntries(KIT_SLOTS.map((s) => [s, s]));
function setSlot(slot, name) {
  for (const e of field.meshes.values()) if (e.target === slot) e.mesh.material = field.matFor(name, e.lod);
}
setGallery();
setMode(S.mode);
setLod(S.lod);

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Kit Lab" });
const fv = ui.addFolder("View");
fv.add(S, "mode", ["gallery", "row"]).name("scene").onChange(setMode);
fv.add(S, "lod", ["auto", "0", "1"]).name("LOD").onChange(setLod);
fv.add(S, "wire").name("wireframe").onChange(setWire);
fv.add(S, "labels").name("labels").onChange(() => setMode(S.mode));
fv.add(S, "time", Object.keys(PRESETS)).name("time").onChange((v) => { lighting.apply(v); pipe.look(v); });
fv.add(S, "post").name("post chain");
fv.add(S, "far", 20, 300, 1).name("kit reach (m)").onChange((v) => { KIT.far.value = v; field.forceRebucket(); });
const fa = ui.addFolder("AO (baked per vertex)");
fa.add(S, "ao").name("AO on").onChange((v) => { kitLook.aoStrength.value = v ? S.aoStrength : 0; });
fa.add(S, "aoStrength", 0, 1, 0.01).name("strength").onChange((v) => { if (S.ao) kitLook.aoStrength.value = v; });
fa.add(S, "aoDirect", 0, 1, 0.01).name("on direct light").onChange((v) => { kitLook.aoDirect.value = v; });
const fvv = ui.addFolder("Variants (gallery)");
fvv.add(S, "blue").name("blue-stone surrounds").onChange(setGallery);
fvv.add(S, "dark").name("dark frames").onChange(setGallery);
fvv.add(S, "yellow").name("yellow brick arch").onChange(setGallery);
const fs = ui.addFolder("Slot table (adapter)");
for (const s of KIT_SLOTS) fs.add(slotSel, s, KIT_SLOTS).name(s).onChange((v) => setSlot(s, v));
fs.close();

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
const trisTable = Object.entries(field.pieceTris).map(([k, t]) => `${k.padEnd(10)} ${String(t[0]).padStart(5)} / ${String(t[1]).padStart(4)}`);
window.lab = { renderer, scene, camera, controls, field, S, setMode, setLod, setSlot, setWire, KIT, kitLook, gpu, pre, ROW, lighting, pipe };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const v3 = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  lodEye.value.copy(camera.position);
  field.update(camera.position, camera, dt);
  lighting.update(camera.position.y, S.mode === "row" ? hm.surface(camera.position.x, camera.position.z) : GY, controls.target, 40, dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (S.mode === "gallery" && S.labels) SLOTS.forEach((_, i) => {
    v3.set(i * GAP, GY - 0.25, 0.6).project(camera);
    const t = tags[i]; t.style.left = `${(v3.x * 0.5 + 0.5) * innerWidth}px`; t.style.top = `${(-v3.y * 0.5 + 0.5) * innerHeight}px`;
    t.style.visibility = v3.z < 1 ? "visible" : "hidden";
  });
  if (++frames % 10 === 1) {
    const r = renderer.info.render, st = field.stats;
    $info.textContent = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris · boot ${bootMs.toFixed(0)} ms\n` +
      `kit: ${st.drawn} instances in ${st.meshes} instanced meshes, ${(st.tris / 1000).toFixed(0)}k tris, re-bucket ${st.ms} ms (max ${st.msMax})\n` +
      (S.mode === "row" ? `row: ${rowInfo}\n` : "") +
      `triangles LOD0 / LOD1:\n${trisTable.join("\n")}`;
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
