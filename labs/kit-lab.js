// THE KIT LAB: the façade kit (tools/blender/facadeKit.py -> tools/facadekit/packKit.mjs -> models/facadekit/) on its
// own, with the city's lighting and post chain.
//   GALLERY: every piece alone on a plain wall cut like the city's (window, arched window, doors with their steps,
//            soupirail, balcony, hood, sill, cornice run + modillions + outside corner, plinth run): LOD forcing,
//            wireframe, AO on / off and strength, the slot table (point any slot at another material: the adapter
//            the library will use), the variants (blue stone, dark frames, yellow brick), triangles per piece and LOD.
//   ROW:     real I6 buildings (the 4 kit buildings nearest ?at=x,z, default the street east of Place de Saint-Job)
//            through the SAME code as the city: viewer/facadeGeom.js analyseBuildings + viewer/facadeKit/placement.js
//            (the openings of facades.js's window grid), the kit walls cutting their openings, the distance fades.
//   ROUND 3: the city's lighting AND its shadow box exactly (viewer/lighting.js: the camera-following box at the city's
//            size for this view, FadedShadowNode, the same post chain); gallery walls are closed solids like the city's
//            buildings with the openings cut in the front only (no dark "room" plane behind any more: a gap in a piece
//            shows what it shows in the city, the daylight behind); the new pieces; the flicker test
//            (labs/flickerTest.js) and the anti-aliasing switches (specular AA, thin-part filter) in the panel.
// URL: ?mode=gallery|row  ?at=x,z  ?time=golden|midday|overcast|night  ?lod=auto|0|1  ?n=4 (row buildings)
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
import { kitLook, KIT_SLOTS, SLOT_TABLE, kitOpaqueMaterial } from "../viewer/facadeKit/kitMaterials.js";
import { flickerTest, showHeat } from "./flickerTest.js";

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
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(140, 40).rotateX(-Math.PI / 2), groundMat); g.position.set(32, -0.001, 6); g.receiveShadow = true; G.add(g); }
const SLOTS = [   // [label, pieces [name, dy, w, h, variant extra, dx], hole {w, h, y, rise}]
  ["window A + sill + hood", [["winA", 1.0], ["sill", 1.0], ["hood", 1.0]], { w: 1.2, h: 1.6, y: 1.0 }],
  ["window B + sill", [["winB", 1.0], ["sill", 1.0]], { w: 1.2, h: 1.6, y: 1.0, rise: WINDOW_RISE }],
  ["door A + 2 steps + number", [["doorA", 0.34], ["numPlate", 0.34 + 1.72, 0.16, 0.12, 0, 0.95]], { w: 1.1, h: 2.448, y: 0.34 }],
  ["door B", [["doorB", 0.0]], { w: 1.1, h: 2.448, y: 0.0 }],
  ["door C, Art Nouveau", [["doorNouveau", 0.0]], { w: 1.1, h: 2.448, y: 0.0 }],
  ["door D, Art Deco", [["doorDeco", 0.0]], { w: 1.1, h: 2.448, y: 0.0 }],
  ["door E, 1960s (letter slot)", [["doorModern", 0.0]], { w: 1.1, h: 2.448, y: 0.0 }],
  ["window C, stained transom", [["winC", 1.0], ["sill", 1.0], ["hood", 1.0]], { w: 1.2, h: 1.6, y: 1.0 }],
  ["window A + shutters", [["winA", 1.0], ["sill", 1.0], ["shutter", 1.0]], { w: 1.2, h: 1.6, y: 1.0 }, 1.7],
  ["window A 0.9 m (9-slice)", [["winA", 1.0, 0.9, 1.5], ["sill", 1.0, 0.9, 1.5]], { w: 0.9, h: 1.5, y: 1.0 }],
  ["bay window (oriel)", [["bay", 1.2]], { w: 1.2, h: 1.6, y: 1.2 }, 0.7],
  ["French window + balcony", [["frenchWin", 0.6], ["balcony", 0.6], ["hood", 0.6, 1.2, 2.3]], { w: 1.2, h: 2.3, y: 0.6 }],
  ["French window + balconnet", [["frenchWin", 0.6], ["balconnet", 0.6]], { w: 1.2, h: 2.3, y: 0.6 }],
  ["garage door", [["garage", 0.0]], { w: 2.4, h: 2.1, y: 0.0 }, 1.4],
  ["soupirail + plinth", [["soup", 0.0], ["plinth", 0.0, 0.9, 0.6, 0, -1.2], ["plinth", 0.0, 0.9, 0.6, 0, 1.2]], null],
  ["cornice + string course + modillions (mitred corner)", [], null, 0.9],
  ["dormer over the eaves", [["dormer", 3.0]], null, 0, { top: 3.0 }],
];
// the gallery's x per slot (some are wider)
const SX = [];
{ let x = 0; SLOTS.forEach((sl, i) => { const extra = sl[3] || 0; if (i) x += extra / 2; SX.push(x); x += GAP + extra / 2; }); }
const S = {
  mode: qp.get("mode") === "row" ? "row" : "gallery", lod: ["0", "1"].includes(qp.get("lod")) ? qp.get("lod") : "auto", wire: false,
  ao: true, aoStrength: 1, aoDirect: kitLook.aoDirect.value, blue: false, dark: false, yellow: false, labels: true, post: qp.get("fx") !== "0",
  time: preset, perf: "", far: KIT.far.value, rooms: true,
};
const tags = [];
function galleryData() {
  const v = (S.blue ? VARIANT.BLUE : 0) | (S.dark ? VARIANT.DARK : 0) | (S.yellow ? VARIANT.YELLOW : 0);
  const pieces = {};
  SLOTS.forEach(([, list], i) => {
    for (const [name, y, w, h, , dx = 0] of list) {
      const P = (pieces[name] ??= []);
      const ref = J.pieces[name];
      if (!ref) continue;
      const [W0, H0] = ref.kind === "door" ? J.ref.door : ref.kind === "french" || ref.slice === "frenchX" ? J.ref.french : ref.kind === "window" || ref.slice === "window" ? J.ref.window : ref.slice === "garage" ? J.ref.garage : ref.ref;
      // a synthetic one-bay face (3.7 m: the painted grid puts its window in the middle) for the glass's room
      const xc = SX[i] + dx, kind = ref.kind;
      const F = kind === "door" ? [-xc - 1.85, 3.7, GY + y, 0.1 + 2] : kind === "french" ? [-xc - 1.85, 3.7, GY + y - 3.46, 0.1 + 4 * 17] : [-xc - 1.85, 3.7, GY + y - 0.918, 0.1];
      P.push(xc, GY + y, 0, 0, 1, w ?? W0, h ?? H0, name === "hood" ? v : v, 0.37 + i * 0.07, 0, ...F);
      if (name === "doorA") for (let k = 1; k <= 2; k++) (pieces.step ??= []).push(SX[i], GY + y - 0.17 * (k - 1) - 0.06, 0.3 * k, 0, 1, 1.5, 0.17, 0, 0.5, 0, 0, 1, 0, 0);
    }
  });
  // the MITRED RUNS: an outside corner of the gallery's last wall block, a cornice and a string course turning round it
  // (left / right mitres in the instance: placement.js joinRuns), modillions under the cornice
  const ci = SLOTS.findIndex((sl) => sl[0].startsWith("cornice")), ext = SLOTS[ci][3];
  const cx = SX[ci] + GAP / 2 + ext / 2 - 0.05 + 0.45, x0b = SX[ci] - GAP / 2 - ext / 2 + 0.05;   // the block's right / left edges
  const run = (piece, A, B, y, nx, nz, mL, mR) => {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    (pieces[piece] ??= []).push((A[0] + B[0]) / 2, y, (A[1] + B[1]) / 2, nx, nz, L, 0.6, 0, 0.4, mL, mR, 0, 0, 0);
  };
  for (const [piece, y] of [["cornice", GY + 4.0], ["band", GY + 3.4]]) {
    run(piece, [x0b + 0.002, 0], [cx, 0], y, 0, 1, 0, 1);              // along the front (+x), outside corner at its right end
    run(piece, [cx, 0], [cx, -2.4], y, 1, 0, 1, 0);                    // round the corner, along the side wall (normal +x)
  }
  for (let k = 0; k < 6; k++) (pieces.modillion ??= []).push(cx - 0.35 - 0.55 * k, GY + 4.0, 0, 0, 1, 0.1, 0.2, 0, 0.4, 0, 0, 0, 0, 0);
  for (let k = 0; k < 4; k++) (pieces.modillion ??= []).push(cx, GY + 4.0, -0.35 - 0.55 * k, 1, 0, 0.1, 0.2, 0, 0.4, 0, 0, 0, 0, 0);
  return { pieces: Object.fromEntries(Object.entries(pieces).map(([k, a]) => [k, new Float32Array(a)])) };
}
function galleryWalls() {
  for (const c of [...G.children]) if (c.userData.wall) { G.remove(c); c.geometry.dispose(); }
  SLOTS.forEach(([label, , hole, extra = 0, opt = {}], i) => {
    const corner = label.startsWith("cornice");
    const x0 = SX[i] - GAP / 2 - extra / 2 + 0.05, x1 = SX[i] + GAP / 2 + extra / 2 - 0.05 + (corner ? 0.45 : 0);
    const top = opt.top ?? 4.0;
    // A CLOSED BLOCK like the city's buildings (front with the opening cut, back, sides, top; single-sided, outward): no
    // dark room behind the opening any more: a slit in a piece shows the daylight behind, as in the city
    const sh = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0), new THREE.Vector2(x1, top), new THREE.Vector2(x0, top)]);
    if (hole) {
      const hw = hole.w / 2, xc = SX[i], pts = [new THREE.Vector2(xc - hw, hole.y), new THREE.Vector2(xc + hw, hole.y)];
      const r = hole.rise || 0, R = r ? (hw * hw + r * r) / (2 * r) : 0;
      for (let k = 0; k <= 16; k++) {
        const x = hw - (2 * hw * k) / 16;
        pts.push(new THREE.Vector2(xc + x, hole.y + hole.h + (r ? Math.sqrt(R * R - x * x) - (R - r) : 0)));
      }
      sh.holes.push(new THREE.Path(pts));
    }
    const D = corner ? 2.6 : 3.0;
    const parts = [new THREE.ShapeGeometry(sh)];
    const quad = (a, b, c, d) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3)); g.computeVertexNormals(); return g; };
    parts.push(quad([x1, 0, -D], [x0, 0, -D], [x0, top, -D], [x1, top, -D]));          // back
    parts.push(quad([x0, 0, -D], [x0, 0, 0], [x0, top, 0], [x0, top, -D]));            // left side
    parts.push(quad([x1, 0, 0], [x1, 0, -D], [x1, top, -D], [x1, top, 0]));            // right side
    if (!opt.top) parts.push(quad([x0, top, 0], [x1, top, 0], [x1, top, -D], [x0, top, -D]));   // flat top
    else {                                                                               // a 45 deg roof from the eaves
      parts.push(quad([x0, top, 0], [x1, top, 0], [x1, top + D * 0.5, -D * 0.5], [x0, top + D * 0.5, -D * 0.5]));
      parts.push(quad([x0, top + D * 0.5, -D * 0.5], [x1, top + D * 0.5, -D * 0.5], [x1, top, -D], [x0, top, -D]));
      parts.push(quad([x0, top, -D], [x0, top, 0], [x0, top + D * 0.5, -D * 0.5], [x0, top + D * 0.5, -D * 0.5]).toNonIndexed());
      parts.push(quad([x1, top, 0], [x1, top, -D], [x1, top + D * 0.5, -D * 0.5], [x1, top + D * 0.5, -D * 0.5]));
    }
    for (const g of parts) {
      const m = new THREE.Mesh(g.index ? g.toNonIndexed() : g, wallMat);
      m.castShadow = m.receiveShadow = true; m.userData.wall = true;
      G.add(m);
    }
    if (!tags[i]) { const t = document.createElement("div"); t.className = "tag"; t.textContent = label; document.body.append(t); tags[i] = t; }
  });
}
// the shadow box: the CITY's (main.js): orbit -> half = clamp(distance to the target x 0.9, 60, 380)
const shadowHalf = () => THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380);
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
  if (m === "gallery") { camera.position.set(SX[2] + 1.0, GY + 2.2, 7.5); controls.target.set(SX[2], GY + 1.6, 0); }
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
  SLOT_TABLE[slot] = name;
  for (const L of [0, 1]) {
    const m = kitOpaqueMaterial(L); m.wireframe = S.wire;
    field.mats[`opaque|${L}`] = m;
    for (const e of field.meshes.values()) if (e.kind === "opaque" && e.lod === L) e.mesh.material = m;
  }
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
fa.add(S, "rooms").name("rooms behind the glass").onChange((v) => { kitLook.roomGlass.value = v ? 1 : 0; });
fa.add(S, "aoDirect", 0, 1, 0.01).name("on direct light").onChange((v) => { kitLook.aoDirect.value = v; });
const faa = ui.addFolder("Anti-aliasing (round 3)");
S.specAA = true; S.thinFar = true;
faa.add(S, "specAA").name("specular AA (normal variance)").onChange((v) => { kitLook.specAA.value = v ? 1 : 0; });
faa.add(kitLook.specAAVar, "value", 0, 1, 0.01).name("AA variance (sigma^2)");
faa.add(kitLook.specAAMax, "value", 0, 0.5, 0.01).name("AA kernel max");
faa.add(S, "thinFar").name("thin parts shade like the wall").onChange((v) => { kitLook.thinFar.value = v ? 1 : 0; });
S.flickerOut = "";
S.flickerStrafe = () => flicker({ move: "strafe" }).then(showHeat);
S.flickerDolly = () => flicker({ move: "dolly", step: 0.002 }).then(showHeat);
faa.add(S, "flickerStrafe").name("flicker test: strafe (heat map)");
faa.add(S, "flickerDolly").name("flicker test: dolly (heat map)");
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
window.lab = { renderer, scene, camera, controls, field, S, setMode, setLod, setSlot, setWire, KIT, kitLook, gpu, pre, ROW, lighting, pipe, renderFrame, flicker, showHeat, SX, GY };
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const v3 = new THREE.Vector3();
/** one frame with the lab's time frozen (dt = 0): the flicker test's renderFrame */
function renderFrame() {
  controls.update();
  lodEye.value.copy(camera.position);
  field.update(camera.position, camera, 0);
  lighting.update(camera.position.y, S.mode === "row" ? hm.surface(camera.position.x, camera.position.z) : GY, controls.target, shadowHalf(), 0);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
}
let frozen = false;
/** the flicker test (labs/flickerTest.js) on the current view: lab.flicker({ move: "strafe" | "dolly" | "fixed", frames, step }) */
async function flicker(opts = {}) {
  frozen = true;
  const dampOld = controls.enableDamping; controls.enableDamping = false;
  try {
    const r = await flickerTest({ renderFrame, canvas: renderer.domElement, camera, controls, frames: 24, move: "strafe", step: 0.0006, ...opts });
    S.flickerOut = `${r.move}: ${r.blink} px (${r.ppm} ppm)`;
    return r;
  } finally { controls.enableDamping = dampOld; frozen = false; }
}
renderer.setAnimationLoop(() => {
  if (frozen) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  lodEye.value.copy(camera.position);
  field.update(camera.position, camera, dt);
  lighting.update(camera.position.y, S.mode === "row" ? hm.surface(camera.position.x, camera.position.z) : GY, controls.target, shadowHalf(), dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (S.mode === "gallery" && S.labels) SLOTS.forEach((_, i) => {
    v3.set(SX[i], GY - 0.25, 0.6).project(camera);
    const t = tags[i]; t.style.left = `${(v3.x * 0.5 + 0.5) * innerWidth}px`; t.style.top = `${(-v3.y * 0.5 + 0.5) * innerHeight}px`;
    t.style.visibility = v3.z < 1 ? "visible" : "hidden";
  });
  if (++frames % 10 === 1) {
    const r = renderer.info.render, st = field.stats;
    $info.textContent = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris · boot ${bootMs.toFixed(0)} ms\n` +
      `kit: ${st.drawn} instances in ${st.meshes} instanced meshes, ${(st.tris / 1000).toFixed(0)}k tris, re-bucket ${st.ms} ms (max ${st.msMax})\n` +
      (S.mode === "row" ? `row: ${rowInfo}\n` : "") + (S.flickerOut ? `flicker test: ${S.flickerOut}\n` : "") +
      `triangles LOD0 / LOD1:\n${trisTable.join("\n")}`;
  }
});
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
