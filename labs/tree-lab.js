// THE TREE LAB: the city's stylized-tree chain (viewer/treesStylized.js makeSpecies + vendor/stylized-trees +
// viewer/impostors.js + viewer/lodFade.js) on its own, under the city's lighting (viewer/lighting.js: Firmament sky,
// the Brussels sun, the faded shadow box) and post chain (viewer/post.js), on real ground (a lawn; a sett square with
// tree pits as Place de Saint-Job, viewer/cobbles.js; a street with its pavements). Layouts: one tree (turntable), the
// LOD chain side by side (LOD 0 / 1 / 2 / impostor with triangles and distances), a street of 50, a park cluster and
// a forest patch from the real LiDAR trees (features.json of tiles G4 and M8), and the LOD WALK: the view stays put
// while the LOD eye walks 2 -> 1200 m (or a dolly zoom: the camera really walks, the frame kept by the focal length).
// Species: the city's street trees ("street", the only ones in the city) and the London plane (viewer/treesPlane.js,
// lab only), both through the same chain. Panel: viewer/panelUI.js. window.lab for scripts.
// (2026-11-14) + the COPPER BEECH (viewer/treesCopperBeech.js, docs/trees/COPPER_BEECH.md): factory-textured (leaf
// sprays per season, bark), its own seasons (spring / summer / autumn / marcescent winter: a rebuild + impostor rebake
// each), its far trees through the IMPOSTOR KIT as in the city, and the "Drève de Lorraine" layout: the 520 real copper
// beeches of the Bruxelles Mobilité inventory (data/trees/bm_copper_beech.json) with their heights and crowns.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { uniform, vec3, float, mix, select, positionWorld, mx_noise_float, smoothstep } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { makeSpecies, STREET, TREE_SHADOW, setTreeRenderer, setTreeLighting } from "../viewer/treesStylized.js";
import { planeDef, planeLeafMask } from "../viewer/treesPlane.js";
import { beechDef } from "../viewer/treesBeech.js";
import { copperBeechDef, loadCopperBeechTextures, COPPER_SEASONS } from "../viewer/treesCopperBeech.js";
import * as K from "../viewer/impostorKit/index.js";
import { flickerTest, showHeat } from "./flickerTest.js";
import { IMP, impostorField } from "../viewer/impostors.js";
import { lodEye } from "../viewer/lodFade.js";
import { lodMorph } from "../vendor/stylized-trees/stylizedTrees.js";
import { cobbleMaterial, pitMaterial } from "../viewer/cobbles.js";
import { vergeMaterial } from "../viewer/roadPaint.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $walk = document.getElementById("walkbar"), $mask = document.getElementById("mask");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "golden";
const lighting = new Lighting(scene, renderer, preset);
setTreeRenderer(renderer);
setTreeLighting(lighting);
const Y0 = 100;                                         // the lab's ground (m TAW, in Uccle's range: the haze's floor is 40)
const ground = () => Y0, everywhere = () => true;

// ------------------------------------------------------------------------------------------------ ground
// a lawn to the horizon; Place-de-Saint-Job-like setts (48 x 36 m) with tree pits; a street (road + two pavements)
const lawn = new THREE.Mesh(new THREE.CircleGeometry(4000, 64).rotateX(-Math.PI / 2), vergeMaterial());
lawn.position.y = Y0; lawn.receiveShadow = true; scene.add(lawn);
function quad(x0, z0, x1, z1, y, mat, uvMetres = true) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  if (uvMetres) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0)); }
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
// the forest patch's floor: beech leaf litter (brown, patchy, a few green patches of moss and bramble), as in the
// Sonian Forest photos; a plain procedural material (the lab only)
const litter = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
{
  const P = positionWorld, n1 = mx_noise_float(P.mul(0.08)), n2 = mx_noise_float(P.mul(0.9).add(3.0)), n3 = mx_noise_float(P.mul(7.0).add(9.0));
  const brown = mix(vec3(0.075, 0.04, 0.02), vec3(0.16, 0.085, 0.035), n2.mul(0.5).add(0.5)).mul(n3.mul(0.25).add(1));
  litter.colorNode = mix(brown, vec3(0.05, 0.08, 0.025), smoothstep(0.35, 0.6, n1).mul(0.7));
}
quad(-260, -680, 260, -160, Y0 + 0.015, litter, false);
const setts = cobbleMaterial();
quad(-24, -18, 24, 18, Y0 + 0.02, setts);                                   // the square
const STREET_Z = 70;
quad(-170, STREET_Z - 6, 170, STREET_Z + 6, Y0 + 0.04, new THREE.MeshStandardNodeMaterial({ color: 0x2b2c2e, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), false);
quad(-170, STREET_Z + 6, 170, STREET_Z + 10.5, Y0 + 0.14, setts);           // pavements (setts), a 13 cm kerb
quad(-170, STREET_Z - 10.5, 170, STREET_Z - 6, Y0 + 0.14, setts);
/** tree pits (viewer/cobbles.js pitMaterial: aKind 0 soil with uv = metres from the centre, 1 the four edging slabs
 *  with uv = (metres along, metres to the far end)) */
const pitMat = pitMaterial();
let pitMesh = null;
function setPits(list) {
  if (pitMesh) { scene.remove(pitMesh); pitMesh.geometry.dispose(); pitMesh = null; }
  if (!list.length) return;
  const pos = [], uv = [], kind = [], idx = [];
  const q = (pts, uvs, k) => { const b = pos.length / 3; for (let i = 0; i < 4; i++) { pos.push(...pts[i]); uv.push(...uvs[i]); kind.push(k); } idx.push(b, b + 2, b + 1, b, b + 3, b + 2); };
  for (const [x, z, y] of list) {
    const s = 0.62, e = 0.78, h = y + 0.035;
    q([[x - s, h - 0.03, z - s], [x + s, h - 0.03, z - s], [x + s, h - 0.03, z + s], [x - s, h - 0.03, z + s]], [[-s, -s], [s, -s], [s, s], [-s, s]], 0);
    // four slabs, each 0.16 m wide, around the soil
    const L = 2 * e;
    q([[x - e, h, z - e], [x + e, h, z - e], [x + e, h, z - s], [x - e, h, z - s]], [[0, L], [L, 0], [L, 0], [0, L]], 1);
    q([[x - e, h, z + s], [x + e, h, z + s], [x + e, h, z + e], [x - e, h, z + e]], [[0, L], [L, 0], [L, 0], [0, L]], 1);
    q([[x - e, h, z - s], [x - s, h, z - s], [x - s, h, z + s], [x - e, h, z + s]], [[0, L], [0, L], [L, 0], [L, 0]], 1);
    q([[x + s, h, z - s], [x + e, h, z - s], [x + e, h, z + s], [x + s, h, z + s]], [[0, L], [0, L], [L, 0], [L, 0]], 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(idx);
  pitMesh = new THREE.Mesh(g, pitMat); pitMesh.receiveShadow = true; scene.add(pitMesh);
}

// ------------------------------------------------------------------------------------------------ real LiDAR trees
// (features.json: UrbIS CHM canopy peaks, height + crown radius; G4 = Saint-Job, M8 = a forest tile, 4552 trees)
async function tileTrees(name) { const f = await fetch(`../data/tiles/${name}/features.json`).then((r) => r.json()); return f.trees; }
const [g4, m8] = await Promise.all([tileTrees("G4"), tileTrees("M8")]);
const parkTrees = (() => {                // the densest 60 x 60 m of G4 (a park / garden block), moved to the lab
  let best = null;
  for (const t of g4) {
    const near = g4.filter((u) => Math.abs(u.x - t.x) < 30 && Math.abs(u.z - t.z) < 30);
    if (!best || near.length > best.length) best = near;
  }
  const cx = best.reduce((s, t) => s + t.x, 0) / best.length, cz = best.reduce((s, t) => s + t.z, 0) / best.length;
  return best.map((t) => ({ x: t.x - cx - 90, z: t.z - cz - 60, height: t.height, crown: t.crown }));
})();
const forestTrees = (() => {
  const xs = m8.map((t) => t.x), zs = m8.map((t) => t.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  return m8.map((t) => ({ x: t.x - cx, z: t.z - cz - 420, height: t.height, crown: t.crown }));
})();

// the copper beeches of the Drève de Lorraine (Bruxelles Mobilité inventory, CC0): east of the lab's other layouts
const DREVE_X = 900;
const dreve = await fetch("../data/trees/bm_copper_beech.json").then((r) => r.json());
const dreveTrees = dreve.trees.map(([x, z, h, d]) => ({ x: x + DREVE_X, z, height: h, crown: d / 2 }));

// ------------------------------------------------------------------------------------------------ species
const S = {
  layout: qp.get("layout") ?? "single tree", species: qp.get("species") ?? "plane", forestMix: qp.get("mix") ?? "the selected species", variant: qp.get("variant") ?? "auto", seed: +(qp.get("seed") ?? 1000),
  height: +(qp.get("h") ?? 18), crown: +(qp.get("crown") ?? 7), turntable: false, ring: false, maskView: false,
  force: "auto", lodColours: false, wireframe: false,
  lod1: 40, morph1: 14, lod2: 120, morph2: 40,
  impostors: true, impStart: IMP.start.value, impBand: IMP.band.value, impEnd: IMP.end.value, impEndBand: IMP.endBand.value,
  shadows: true, shEnd: TREE_SHADOW.end.value, shBand: TREE_SHADOW.band.value,
  wind: 0, windSpeed: 1.1, windDir: 30, season: 0, cbSeason: COPPER_SEASONS[qp.get("cbseason")] ? qp.get("cbseason") : "summer", farKit: qp.get("farkit") !== "0",
  time: preset, hour: lighting.hour, post: true,
  walkMode: "frozen view (LOD eye walks)", walkD: 2, walkSeconds: 40, walking: false,
  perf: "", passes: "", cpu: "", mem: "", bench: "—", lodNow: "", crownFit: "", pop: "—",
};
const DEFS = {
  street: (seed) => ({ ...STREET.def, params: { ...STREET.def.params, seed } }),
  plane: (seed) => planeDef(seed),
  beech: (seed) => beechDef(seed),
  copperbeech: (seed) => copperBeechDef(seed, COPPER_TEX[S.cbSeason]),
};
// the copper beech's factory textures, every season (small: ~1.4 MB GPU per spray, the bark 2.7 MB)
const COPPER_TEX = {};
await Promise.all(Object.keys(COPPER_SEASONS).map(async (k) => { COPPER_TEX[k] = await loadCopperBeechTextures(renderer, k); }));
// the forest patch (tile M8: mostly beech in the Sonian Forest edge) as a mix of species, shares of the LiDAR trees
const FOREST_MIX = { "all beech": { beech: 1 }, "beech 80 % + street trees 20 %": { beech: 0.8, street: 0.2 } };
const SPECIES_NAMES = { "street (city today)": "street", "plane (Platanus x acerifolia)": "plane", "copper beech": "copperbeech" };
const speciesKey = () => (S.species in DEFS ? S.species : SPECIES_NAMES[S.species]);
const species = {};
// LOD colours (debug): one per mesh (userData.treeLod: 0-2, 3 = impostor), mixed into every tree material
const dbg = { on: uniform(0), lod: uniform(0).onObjectUpdate(({ object }) => object.userData.treeLod ?? 0) };
const LODCOL = [vec3(0.1, 0.35, 1.0), vec3(1.0, 0.85, 0.1), vec3(1.0, 0.18, 0.12), vec3(0.9, 0.2, 0.95)];
const lodColour = select(dbg.lod.lessThan(0.5), LODCOL[0], select(dbg.lod.lessThan(1.5), LODCOL[1], select(dbg.lod.lessThan(2.5), LODCOL[2], LODCOL[3])));
function getSpecies(key) {
  if (species[key]) return species[key];
  const sp = makeSpecies(DEFS[key](S.seed));
  sp.calibrate();
  // (before any field: the depth pre-pass and impostor colour passes are clones made per field)
  for (const m of new Set([sp.shared.leafMat, sp.shared.leafFar, sp.shared.trunkMat, sp.shared.trunkFar, sp.impMat, sp.impMatFar])) {
    if (!m) continue;
    m.colorNode = mix(m.colorNode, lodColour, dbg.on.mul(0.75));
    m.needsUpdate = true;
  }
  applySeason(sp);
  species[key] = sp;
  return sp;
}
function disposeSpecies(key) { if (species[key]) disposeKit(species[key]); species[key]?.dispose(); delete species[key]; }

// ------------------------------------------------------------------------------------------------ layouts
const holder = new THREE.Group(); scene.add(holder);
let fields = [];            // { key, sp, f } (f = makeSpecies buildField result)
let chain = null;           // the LOD chain display
let labels = [];
const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2), 0, Math.sin(i / 96 * Math.PI * 2)))), new THREE.LineBasicNodeMaterial({ color: 0xffd27a }));
scene.add(ring);
const variantFn = (sp) => {
  const v = S.variant;
  // the copper beech on auto: the avenue form (0-3) along the street and the Drève, the park form (4-5) in the park
  if (v === "auto" && sp.def.id === "copperbeech") {
    if (S.layout.startsWith("street") || S.layout.startsWith("Drève")) return (i) => sp.variantOfIndex(i) % 4;
    if (S.layout.startsWith("park")) return (i) => 4 + (sp.variantOfIndex(i) % 2);
  }
  if (v === "auto") return null;
  // the plane and the beech have two forms: variants 0-3 (plane natural, beech forest) and 4-5 (plane pollard,
  // beech open-grown); the street trees have one
  const forms = sp.def.id === "plane" || sp.def.id === "beech" || sp.def.id === "copperbeech";
  if (v.startsWith("auto: 0-3")) return forms ? (i) => sp.variantOfIndex(i) % 4 : null;
  if (v.startsWith("auto: 4-5")) return forms ? (i) => 4 + (sp.variantOfIndex(i) % 2) : null;
  return () => Math.min(sp.variants - 1, +v);
};
function placementsFor(layout) {
  const T = [];
  if (layout === "single tree") T.push({ x: 0, z: 0, height: S.height, crown: S.crown, turn: 0.6 });
  if (layout === "street of 50") for (let i = 0; i < 25; i++) for (const side of [-1, 1]) T.push({ x: -132 + i * 11, z: STREET_Z + side * 8.2, height: S.height * (0.9 + 0.2 * ((i * 7 + (side > 0 ? 3 : 0)) % 5) / 4), crown: S.crown });
  if (layout === "park cluster (LiDAR G4)") T.push(...parkTrees);
  if (layout === "forest patch (LiDAR M8, 4552)") T.push(...forestTrees);
  if (layout.startsWith("Drève")) T.push(...dreveTrees);
  return T;
}
const LAYOUTS = ["single tree", "LOD chain side by side", "street of 50", "park cluster (LiDAR G4)", "forest patch (LiDAR M8, 4552)", "Drève de Lorraine (inventory, 520 copper beeches)"];
/** Build the current layout (keys: the species to build; the first is shown, the others hidden for A/B). */
function build(keys = [speciesKey()]) {
  for (const { f } of fields) f.dispose();
  fields = [];
  chain?.dispose(); chain = null;
  for (const l of labels) l.el.remove();
  labels = [];
  let T = placementsFor(S.layout);
  // the forest patch's species mix (one field per species, each its own share of the LiDAR trees): M8 is mostly beech
  const mix = S.layout.startsWith("forest") && keys.length === 1 && S.forestMix !== "the selected species" ? FOREST_MIX[S.forestMix] : null;
  if (mix) {
    const h = (t) => { const x = Math.sin(t.x * 12.9898 + t.z * 78.233) * 43758.5453; return x - Math.floor(x); };
    let acc = 0;
    for (const [key, share] of Object.entries(mix)) {
      const lo = acc; acc += share;
      const sp = getSpecies(key);
      const mine = T.filter((t) => { const u = h(t); return u >= lo && u < acc; });
      const vf = key === "street" ? null : (i) => sp.variantOfIndex(i) % 4;            // the forest forms
      const f = sp.buildField(mine, ground, everywhere, vf ? { variantOf: vf } : {});
      holder.add(f.group);
      f.group.traverse((o) => { if (o.isInstancedMesh) o.userData.castsByDefault = o.castShadow; });
      if (f.imp) f.imp.mesh.userData.treeLod = 3;
      fields.push({ key, sp, f, mixed: true });
    }
    keys = [];
  }
  for (const key of keys) {
    const sp = getSpecies(key);
    if (S.layout === "LOD chain side by side") { if (key === keys[0]) chain = buildChain(sp); continue; }
    const vf = variantFn(sp);
    const f = sp.buildField(T, ground, everywhere, vf ? { variantOf: vf } : {});
    f.group.visible = key === keys[0];
    holder.add(f.group);
    f.group.traverse((o) => { if (o.isInstancedMesh) o.userData.castsByDefault = o.castShadow; });
    if (f.imp) f.imp.mesh.userData.treeLod = 3;
    const entry = { key, sp, f };
    fields.push(entry);
    if (key === "copperbeech" && S.farKit) attachKit(entry, vf ?? ((i) => sp.variantOfIndex(i)));
  }
  setPits(S.layout === "street of 50" || S.layout === "single tree" || S.layout === "LOD chain side by side"
    ? (S.layout === "LOD chain side by side" ? [-24, -8, 8, 24].map((x) => [x, 0, Y0 + 0.02]) : T.map((t) => [t.x, t.z, Y0 + (S.layout === "street of 50" ? 0.14 : 0.02)])) : []);
  applyAll();
  updateInfo();
}

/** The copper beech's far trees through the IMPOSTOR KIT (viewer/impostorKit/, as the city's street trees:
 *  viewer/treeKitCity.js): one atlas per species (16 x 16 hemi views x 64 px, baked from LOD 2 at the hand-over,
 *  with its leaf-spray colours: sources/stylizedTrees.js reads shared.leafAtlas), one instanced draw per pass, the
 *  hand-over on the same IMP uniforms as the mesh's far mask; today's impostors (viewer/impostors.js) are taken out
 *  of that field. The bake is async: the field's far trees come in when it is ready. */
const kits = new Map();
function kitFor(sp) {
  if (kits.has(sp)) return kits.get(sp);
  const H = K.makeFade(K.TYPES.tree.fade);
  H.start = IMP.start; H.band = IMP.band; H.end = IMP.end; H.endBand = IMP.endBand;
  const view = K.makeView();
  const k = { H, view, atlas: null, mats: null, bakeMs: 0 };
  k.ready = (async () => {
    const t0 = performance.now();
    const src = K.stylizedTreeSource(sp.shared, sp.params().leafMask, { variants: sp.variants, lod: 2, handover: IMP.start.value });
    k.atlas = await K.bakeAtlas(renderer, src, K.TYPES.tree);
    src.dispose?.();
    k.bakeMs = performance.now() - t0;
    k.mats = K.impostorMaterials(k.atlas, { ...K.TYPES.tree.material, fade: H, view, shade: K.treeShade(sp.shared.U), name: "tree-kit-lab" });
    console.log(`[tree lab] kit atlas (${sp.def.id}) ${(k.atlas.bytes / 1048576).toFixed(1)} MB, bake ${k.bakeMs.toFixed(0)} ms`);
    return k;
  })();
  kits.set(sp, k);
  return k;
}
function disposeKit(sp) {
  const k = kits.get(sp); if (!k) return;
  kits.delete(sp);
  k.ready.then(() => { k.mats?.colour.dispose(); k.mats?.depth.dispose(); k.atlas?.dispose?.(); });
}
function attachKit(entry, variantOf) {
  const { sp, f } = entry;
  if (f.imp) { f.imp.mesh.removeFromParent(); f.imp.mesh.visible = false; }
  const k = kitFor(sp);
  k.ready.then(() => {
    if (!fields.includes(entry)) return;
    const P = f.placements.map((p, i) => ({ x: p[0], y: p[2] - 0.25, z: p[1], yaw: p[3], scale: p[4], variant: variantOf(i) }));
    const kf = K.impostorField(k.mats, P, { name: "tree-kit-lab" });
    kf.group.traverse((o) => { if (o.isInstancedMesh) o.userData.treeLod = 3; });
    f.group.add(kf.group);
    entry.kit = { k, kf };
    const d0 = f.dispose; f.dispose = () => { kf.dispose(); d0(); };
  });
}

/** The chain: the SAME built trees and materials as the fields (shared.geoms "<v>:<lod>", the shared leaf / bark
 *  materials, the impostor material), one tree per LOD side by side. Each LOD is held in its state by giving its
 *  instance a stand-in distance for the morph (treePos = the eye + that distance toward the tree): LOD 0 at 10 m,
 *  LOD 1 at 80 m, LOD 2 at 250 m, the impostor as drawn past 400 m. */
function buildChain(sp) {
  const g = new THREE.Group(); holder.add(g);
  const v = variantFn(sp)?.(0) ?? 0;
  const scale = Math.min(1.8, Math.max(0.3, S.height / sp.variantHeight(v))), rot = 0.6;
  const side = Math.sign(lighting.sunDir.z || 1), xs = [-24, -8, 8, 24].map((x) => x * side), virt = [10, 80, 250];   // LOD 0 on the left seen from the sunny side
  const items = [];
  const M = new THREE.Matrix4().makeRotationY(rot).scale(new THREE.Vector3(scale, scale, scale));
  for (let lod = 0; lod < 3; lod++) {
    const base = sp.shared.geoms.get(`${v}:${lod}`);
    const xf = new THREE.InstancedBufferAttribute(new Float32Array([Math.cos(rot), Math.sin(rot), scale]), 3);
    const tp = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
    const meshes = [];
    for (const [src, mat] of [[base.leaves, lod === 2 ? sp.shared.leafFar : sp.shared.leafMat], [base.trunk, lod === 2 ? sp.shared.trunkFar : sp.shared.trunkMat]]) {
      const geo = new THREE.BufferGeometry();
      for (const a of Object.keys(src.attributes)) geo.setAttribute(a, src.attributes[a]);
      geo.setIndex(src.index);
      geo.setAttribute("treeXf", xf); geo.setAttribute("treePos", tp);
      const im = new THREE.InstancedMesh(geo, mat, 1);
      im.setMatrixAt(0, M.clone().setPosition(xs[lod], Y0 - 0.25, 0));
      im.castShadow = lod < 2; im.receiveShadow = true; im.frustumCulled = false;
      im.userData.treeLod = lod; im.userData.castsByDefault = im.castShadow;
      g.add(im); meshes.push(im);
    }
    items.push({ lod, tp, foot: new THREE.Vector3(xs[lod], Y0 - 0.25, 0), virt: virt[lod], meshes,
      tris: { leaves: base.leaves.index.count / 3, bark: base.trunk.index.count / 3, cards: base.leaves.index.count / 6 } });
  }
  const imp = impostorField([[xs[3], 0, Y0, rot, scale]], [v], sp.impMatFar, { near: 0 });
  imp.mesh.userData.treeLod = 3; imp.mesh.frustumCulled = false;
  g.add(imp.mesh);
  const P = sp.params();
  const range = [`0-${P.lodDist} m\nmorph ${P.lodDist - P.morph1}-${P.lodDist} m`, `${P.lodDist}-${P.farDist} m\nmorph ${P.farDist - P.morph2}-${P.farDist} m`,
    `${P.farDist}-${IMP.start.value} m\ndither ${IMP.start.value - IMP.band.value}-${IMP.start.value} m`, `${IMP.start.value}-${IMP.end.value} m\ndissolve ${IMP.end.value - IMP.endBand.value}-${IMP.end.value} m`];
  const bk = sp.bake;
  const atlasMB = bk ? (bk.size[0] * bk.size[1] * 4 * 2 * 4 / 3) / 1048576 : 0;
  const txt = [
    ...items.map((it) => `<b>LOD ${it.lod}</b> ${(it.tris.leaves + it.tris.bark).toLocaleString()} tris\n${it.tris.cards} cards (${it.tris.leaves})\nbark ${it.tris.bark}\n${range[it.lod]}\n${it.lod < 2 ? "casts shadow" : "no shadow"}`),
    `<b>impostor</b> 2 tris\nfrom LOD 0, 8x8 views\n${range[3]}\natlas ${bk ? bk.size.join("x") : "-"} x2\n${atlasMB.toFixed(0)} MB, no shadow`,
  ];
  for (let k = 0; k < 4; k++) {
    const el = document.createElement("div"); el.className = "tlabel"; el.innerHTML = txt[k]; document.body.append(el);
    labels.push({ el, at: new THREE.Vector3(xs[k], Y0 + S.height + 1.5, 0) });
  }
  const tmp = new THREE.Vector3();
  return {
    group: g, items, imp,
    update(eye) {
      for (const it of items) { tmp.copy(it.foot).sub(eye).setLength(it.virt).add(eye); it.tp.array.set([tmp.x, tmp.y, tmp.z]); it.tp.needsUpdate = true; }
      imp.update(eye);
      // (no field writes the LOD uniforms here: the chain holds them at the auto values)
      const U = sp.shared.U;
      U.lod1.value = S.lod1; U.lod2.value = S.lod2; U.morph1.value = S.morph1; U.morph2.value = S.morph2;
      U.sunDir.value.copy(lighting.sunDir);
      const c = lighting.keyColor; U.sunColor.value.set(c.r * 0.18, c.g * 0.18, c.b * 0.18);
    },
    dispose() { g.removeFromParent(); for (const it of items) for (const m of it.meshes) m.geometry.dispose(); imp.mesh.geometry.dispose(); },
  };
}

// ------------------------------------------------------------------------------------------------ live state
const FORCE = ["auto", "LOD 0", "LOD 1", "LOD 2", "impostor"];
function lodValues() {
  const a = { lodDist: S.lod1, morph1: S.morph1, farDist: S.lod2, morph2: S.morph2, lodSlack: 6 };
  if (S.force === "LOD 0") return { ...a, lodDist: 1e5, farDist: 1e5 + 1 };
  if (S.force === "LOD 1") return { ...a, lodDist: 0, morph1: 0, farDist: 1e5 };
  if (S.force === "LOD 2") return { ...a, lodDist: 0, morph1: 0, farDist: 0, morph2: 0 };
  if (S.force === "impostor") return { ...a, lodSlack: 0 };
  return a;
}
function windValues() {
  const a = THREE.MathUtils.degToRad(S.windDir);
  return { windAmp: S.wind, windSpeed: S.windSpeed, windDir: [Math.cos(a), Math.sin(a)] };
}
function applyAll() {
  const vals = { ...lodValues(), ...windValues() };
  for (const sp of Object.values(species)) Object.assign(sp.params(), vals);
  for (const { f } of fields) Object.assign(f.field.params, vals);
  const realOnly = ["LOD 0", "LOD 1", "LOD 2"].includes(S.force);
  IMP.start.value = S.force === "impostor" ? 0 : !S.impostors || realOnly ? 1e5 : S.impStart;
  IMP.band.value = S.force === "impostor" ? 0 : S.impBand;
  IMP.end.value = S.impEnd; IMP.endBand.value = S.impEndBand;
  TREE_SHADOW.end.value = S.shEnd; TREE_SHADOW.band.value = S.shBand;
  dbg.on.value = S.lodColours ? 1 : 0;
  holder.traverse((o) => {
    if (!o.isInstancedMesh) return;
    if (o.userData.castsByDefault !== undefined) o.castShadow = S.shadows && o.userData.castsByDefault;
    if (o.material) o.material.wireframe = S.wireframe;
  });
  controls.autoRotate = S.turntable; controls.autoRotateSpeed = 1.2;
  const sp = fields[0]?.sp ?? (chain ? species[speciesKey()] : null);
  ring.visible = S.ring && S.layout === "single tree";
  ring.position.set(0, Y0 + S.height * 0.62, 0); ring.scale.setScalar(S.crown);
  if (sp && S.layout === "single tree") {
    const v = variantFn(sp)?.(0) ?? sp.variantOfIndex(0);
    const g = sp.shared.geoms.get(`${v}:0`).leaves; g.computeBoundingBox();
    const bb = g.boundingBox, k = Math.min(1.8, Math.max(0.3, S.height / sp.variantHeight(v)));
    S.crownFit = `variant ${v}: model crown r ${(((bb.max.x - bb.min.x + bb.max.z - bb.min.z) / 4 + 0.6) * k).toFixed(1)} m vs LiDAR ${S.crown} m · scale ${k.toFixed(2)} (h / ${sp.variantHeight(v).toFixed(1)} m)`;
  } else S.crownFit = "-";
}
/** Season hook (stub): 0 summer -> 1 autumn tints the near LODs' leaf colours; the impostor atlas keeps the summer
 *  albedo it was baked with (a rebake per season is the next step: docs/TREES.md). */
function applySeason(sp) {
  if (sp.def.seasonal) return;            // the copper beech: its seasons are its sprays (the "copper beech season" control)
  const P = sp.params(), base = sp.def.params;
  const lerp = (a, b) => `#${new THREE.Color(a).lerp(new THREE.Color(b), S.season).getHexString()}`;
  P.topColor = lerp(base.topColor, "#c9a13a"); P.bottomColor = lerp(base.bottomColor, "#5a3a17"); P.translucencyColor = lerp(base.translucencyColor, "#f0b850");
  for (const { f } of fields) if (f.field.params !== P) Object.assign(f.field.params, { topColor: P.topColor, bottomColor: P.bottomColor, translucencyColor: P.translucencyColor });
}

// ------------------------------------------------------------------------------------------------ views
const VIEWS = {
  "single tree": () => { camera.position.set(22, Y0 + 6, 26); controls.target.set(0, Y0 + 8, 0); },
  "LOD chain side by side": () => { camera.position.set(0, Y0 + 10, 62); controls.target.set(0, Y0 + 9, 0); },
  "street of 50": () => { camera.position.set(-150, Y0 + 1.7, STREET_Z + 3); controls.target.set(-100, Y0 + 6, STREET_Z); },
  "park cluster (LiDAR G4)": () => { camera.position.set(-40, Y0 + 12, -10); controls.target.set(-90, Y0 + 6, -60); },
  "forest patch (LiDAR M8, 4552)": () => { camera.position.set(0, Y0 + 60, -140); controls.target.set(0, Y0 + 10, -330); },
  // down the drève from its north end, at eye height
  "Drève de Lorraine (inventory, 520 copper beeches)": () => {
    const T = dreveTrees, n = T.reduce((a, t) => (t.z < a.z ? t : a)), m = T.filter((t) => Math.abs(t.z - (n.z + 150)) < 20);
    const cx = m.reduce((s, t) => s + t.x, 0) / Math.max(1, m.length);
    camera.position.set(n.x + 2, Y0 + 1.7, n.z - 6); controls.target.set(cx || n.x, Y0 + 10, n.z + 150);
  },
};
/** the preset view of a layout, turned round its target so the sun is behind the camera (front-lit) */
function resetView() {
  VIEWS[S.layout]?.();
  if (S.layout === "LOD chain side by side") camera.position.set(0, Y0 + 8, Math.sign(lighting.sunDir.z || 1) * 58);   // the row's sunny side
  else if (S.layout !== "street of 50" && !S.layout.startsWith("Drève")) {
    const off = camera.position.clone().sub(controls.target), h = Math.hypot(off.x, off.z);
    const sd = new THREE.Vector3(lighting.sunDir.x, 0, lighting.sunDir.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
    camera.position.set(controls.target.x + sd.x * h, camera.position.y, controls.target.z + sd.z * h);
  }
  camera.fov = 50; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------------------------------------ the LOD walk
const walk = { from: new THREE.Vector3(), dir: new THREE.Vector3(), target: new THREE.Vector3(), half: 1, eye: new THREE.Vector3(), camFrom: new THREE.Vector3() };
const D0 = 2, D1 = 1200;
const dOf = (u) => D0 * Math.pow(D1 / D0, u), uOf = (d) => Math.log(d / D0) / Math.log(D1 / D0);
function startWalk() {
  S.walking = true; walk.paused = false; controls.enabled = false; controls.autoRotate = false;
  walk.target.copy(controls.target);
  walk.camFrom.copy(camera.position);
  walk.dir.copy(camera.position).sub(controls.target).setY(0).normalize();
  if (walk.dir.lengthSq() < 0.5) walk.dir.set(0, 0, 1);
  const d0 = camera.position.distanceTo(controls.target);
  walk.half = d0 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));     // the frame's half height at the target
  walk.t0 = performance.now() - uOf(Math.max(D0, S.walkD)) * S.walkSeconds * 1000;
}
function stopWalk() {
  S.walking = false; controls.enabled = true;
  if (S.walkMode.startsWith("dolly")) { camera.position.copy(walk.camFrom); camera.fov = 50; camera.updateProjectionMatrix(); }
}
/** the eye the LODs see (and the camera itself in the dolly mode) at walk distance d */
function walkAt(d) {
  S.walkD = d;
  walk.eye.copy(walk.target).addScaledVector(walk.dir, d);
  walk.eye.y = Math.max(Y0 + 1.7, walk.target.y + (walk.camFrom.y - walk.target.y) * Math.min(1, 20 / Math.max(d, 1e-3)));
  if (S.walkMode.startsWith("dolly")) {
    camera.position.copy(walk.eye);
    camera.fov = THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan(walk.half / d)), 0.4, 100);
    camera.updateProjectionMatrix();
    camera.lookAt(walk.target);
  }
}
function lodStateText(d) {
  const P = lodValues(), I = IMP;
  const parts = [];
  if (d < P.lodDist - P.morph1) parts.push("LOD 0");
  else if (d < P.lodDist) parts.push(`LOD 0, cards of LOD 1 shrinking (${(100 * (d - (P.lodDist - P.morph1)) / P.morph1).toFixed(0)} %)`);
  else if (d < P.farDist - P.morph2) parts.push("LOD 1");
  else if (d < P.farDist) parts.push(`LOD 1, cards of LOD 2 shrinking (${(100 * (d - (P.farDist - P.morph2)) / P.morph2).toFixed(0)} %)`);
  else if (d < I.start.value - I.band.value) parts.push("LOD 2");
  else if (d < I.start.value) parts.push(`LOD 2 -> impostor dither (${(100 * (d - (I.start.value - I.band.value)) / I.band.value).toFixed(0)} %)`);
  else if (d < I.end.value - I.endBand.value) parts.push("impostor");
  else if (d < I.end.value) parts.push(`impostor dissolving (${(100 * (d - (I.end.value - I.endBand.value)) / I.endBand.value).toFixed(0)} %)`);
  else parts.push("no tree (the orthophoto carries it in the city)");
  const se = TREE_SHADOW.end.value, sb = TREE_SHADOW.band.value;
  parts.push(d < se - sb ? "shadow on" : d < se ? `shadow fading (${(100 * (d - (se - sb)) / sb).toFixed(0)} %)` : "no shadow");
  return parts.join(" · ");
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Tree Lab" });
const fs = ui.addFolder("Scene & species");
fs.add(S, "layout", LAYOUTS).onChange(() => { build(); resetView(); }).listen();
fs.add(S, "species", ["street", "plane", "beech", "copperbeech"]).name("species").onChange(() => build()).listen();
fs.add(S, "cbSeason", Object.keys(COPPER_SEASONS)).name("copper beech season").onChange(() => rebuildCopper()).listen();
fs.add(S, "farKit").name("copper beech far: impostor kit").onChange(() => build()).listen();
fs.add(S, "variant", ["auto", "auto: 0-3 (plane natural, beech forest)", "auto: 4-5 (plane pollards, beech open-grown)", "0", "1", "2", "3", "4", "5"]).onChange(() => build()).listen();
fs.add(S, "forestMix", Object.keys(FOREST_MIX).concat(["the selected species"])).name("forest patch species").onChange(() => { if (S.layout.startsWith("forest")) build(); }).listen();
fs.add(S, "seed", 1, 99999, 1).onChange(() => { for (const k of Object.keys(species)) disposeSpecies(k); build(); });
/** the copper beech in another season: a new species (its spray, palette and impostor bakes) */
function rebuildCopper() {
  const shown = fields.map((x) => x.key);
  const wasChain = !!chain;
  if (species.copperbeech) disposeSpecies("copperbeech");
  if (shown.includes("copperbeech") || (wasChain && speciesKey() === "copperbeech")) build([...new Set(shown.length ? shown : [speciesKey()])]);
}
fs.add(S, "height", 4, 40, 0.5).name("LiDAR height (m)").onChange(() => { if (["single tree", "LOD chain side by side", "street of 50"].includes(S.layout)) build(); }).listen();
fs.add(S, "crown", 1, 14, 0.1).name("LiDAR crown r (m)").onChange(applyAll);
fs.add(S, "crownFit").name("fit").listen();
fs.add(S, "ring").name("show the LiDAR crown").onChange(applyAll);
fs.add(S, "turntable").onChange(applyAll);
fs.add(S, "maskView").name("show the leaf mask").onChange(drawMask);
fs.add({ f: resetView }, "f").name("reset the view");
const fl = ui.addFolder("LOD");
fl.add(S, "force", FORCE).name("force LOD").onChange(applyAll).listen();
fl.add(S, "lodColours").name("LOD colours").onChange(applyAll);
fl.add(S, "wireframe").onChange(applyAll);
fl.add(S, "lod1", 10, 120, 1).name("LOD 0→1 (m)").onChange(applyAll);
fl.add(S, "morph1", 0, 40, 1).name("  0→1 morph band (m)").onChange(applyAll);
fl.add(S, "lod2", 40, 300, 1).name("LOD 1→2 (m)").onChange(applyAll);
fl.add(S, "morph2", 0, 100, 1).name("  1→2 morph band (m)").onChange(applyAll);
const fi = ui.addFolder("Impostors");
fi.add(S, "impostors").name("impostors on").onChange(applyAll);
fi.add(S, "impStart", 150, 900, 5).name("start (m)").onChange(applyAll);
fi.add(S, "impBand", 0, 150, 1).name("  cross-fade band (m)").onChange(applyAll);
fi.add(S, "impEnd", 500, 3000, 10).name("end (m)").onChange(applyAll);
fi.add(S, "impEndBand", 0, 800, 10).name("  dissolve band (m)").onChange(applyAll);
fi.close();
const fsh = ui.addFolder("Shadows");
fsh.add(S, "shadows").name("tree shadows").onChange(applyAll);
fsh.add(S, "shEnd", 40, 400, 5).name("tree shadows end (m)").onChange(applyAll);
fsh.add(S, "shBand", 0, 120, 1).name("  fade band (m)").onChange(applyAll);
fsh.close();
const fw = ui.addFolder("Wind & season");
fw.add(S, "wind", 0, 0.6, 0.01).name("wind strength").onChange(applyAll);
fw.add(S, "windSpeed", 0.2, 3, 0.05).name("wind speed").onChange(applyAll);
fw.add(S, "windDir", 0, 360, 1).name("wind from (deg)").onChange(applyAll);
fw.add(S, "season", 0, 1, 0.01).name("season (hook: near LODs)").onChange(() => { for (const sp of Object.values(species)) applySeason(sp); });
fw.close();
const ft = ui.addFolder("Light");
ft.add(S, "time", Object.keys(PRESETS)).name("time of day").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe.look(v); S.hour = lighting.hour; });
ft.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
ft.add(S, "post").name("post effects");
ft.close();
const fwk = ui.addFolder("LOD walk (2 → 1200 m)");
fwk.add(S, "walkMode", ["frozen view (LOD eye walks)", "dolly zoom (camera walks)"]).name("mode").onChange(() => { if (S.walking) { stopWalk(); startWalk(); } });
fwk.add({ f: () => (S.walking ? stopWalk() : startWalk()) }, "f").name("▶ play / stop the walk");
fwk.add(S, "walkD", 2, 1200, 1).name("distance (m) (scrub)").onChange((d) => { if (!S.walking) startWalk(); walk.t0 = performance.now() - uOf(d) * S.walkSeconds * 1000; walk.paused = true; }).listen();
fwk.add(S, "walkSeconds", 5, 120, 1).name("walk duration (s)");
fwk.add({ f: async () => { S.pop = "running…"; const r = await popWalk(); S.pop = `worst jump ${r.worstJump[1]} % at ${r.worstJump[0]} m, ${r.over15} steps > 1.5 %`; console.log("[tree lab] pop meter", r); } }, "f").name("pop meter: frozen walk, 60 steps");
fwk.add(S, "pop").name("pop result").listen();
fwk.add(S, "lodNow").name("state").listen();
const fp = ui.addFolder("Performance");
fp.add(S, "perf").name("frame").listen();
fp.add(S, "passes").name("GPU per pass").listen();
fp.add(S, "cpu").name("CPU tree update").listen();
fp.add(S, "mem").name("memory").listen();
fp.add({ f: () => bench("onoff") }, "f").name("benchmark: trees on / off");
fp.add({ f: () => bench("species", { pair: ["street", "plane"] }) }, "f").name("benchmark: street vs plane (A/B)");
fp.add({ f: () => bench("species", { pair: ["street", "beech"] }) }, "f").name("benchmark: street vs beech (A/B)");
fp.add({ f: () => bench("species", { pair: ["beech", "copperbeech"] }) }, "f").name("benchmark: beech vs copper beech (A/B)");
fp.add({ f: () => bench("species", { pair: ["plane", "copperbeech"] }) }, "f").name("benchmark: plane vs copper beech (A/B)");
fp.add({ f: () => flicker() }, "f").name("flicker test (24 frames, strafe)");
fp.add(S, "bench").name("result").listen();

function drawMask() {
  $mask.style.display = S.maskView ? "block" : "none";
  if (!S.maskView) return;
  const key = speciesKey(), c = $mask.getContext("2d");
  c.fillStyle = "#222"; c.fillRect(0, 0, 512, 512);
  const mask = species[key]?.params().leafMask;
  if (mask?.userData.preview) c.drawImage(mask.userData.preview(), 0, 0, 512, 512);
  else if (mask) { const N = mask.image.width, im = c.createImageData(N, N), d = mask.image.data; for (let i = 0; i < N * N; i++) { im.data[i * 4 + 1] = d[i]; im.data[i * 4 + 3] = 255; } const t = document.createElement("canvas"); t.width = t.height = N; t.getContext("2d").putImageData(im, 0, 0); c.drawImage(t, 0, 0, 512, 512); }
}

// ------------------------------------------------------------------------------------------------ perf
const gpu = { avg: 0, pending: false, samples: [], passes: null };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
    const t = renderer.backend.timestampQueryPool?.render?.timestamps;
    // r187 names the render passes "r:<order in the frame>:<context>:f<frame>": measured here (trees and their shadows
    // toggled), #1 is the scene (MRT) pass and #2 the sun's shadow map; the rest is the post chain + the sky
    if (t) { const agg = { scene: 0, shadow: 0, post: 0 }; for (const [uid, v] of t) { const o = +uid.split(":")[1]; agg[o === 1 ? "scene" : o === 2 ? "shadow" : "post"] += v; } gpu.passes = agg; }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Alternate A / B `rounds` times (settle, then sample), so both see the same background GPU load. */
async function alternate(a, b, { rounds = 5, settle = 1.0, seconds = 2.5 } = {}) {
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) for (const [f, out] of [[a, A], [b, B]]) { f(); await sleep(settle * 1000); gpu.samples.length = 0; await sleep(seconds * 1000); out.push(median(gpu.samples)); }
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length, d = B.map((v, i) => v - A[i]);
  return { A: A.map((v) => +v.toFixed(2)), B: B.map((v) => +v.toFixed(2)), meanA: +mean(A).toFixed(2), meanB: +mean(B).toFixed(2), diff: +mean(d).toFixed(2), min: +Math.min(...d).toFixed(2), max: +Math.max(...d).toFixed(2) };
}
const results = [];
async function bench(kind, opts = {}) {
  S.bench = "running…";
  let r;
  if (kind === "onoff") {
    r = await alternate(() => { holder.visible = false; }, () => { holder.visible = true; }, opts);
    S.bench = `trees: +${r.diff} ms (spread ${r.min}..${r.max}; off ${r.meanA}, on ${r.meanB})`;
  } else {
    const prev = S.species;
    const pair = opts.pair ?? ["street", "plane"];
    build(pair);
    const show = (k) => () => { for (const x of fields) x.f.group.visible = x.key === k; };
    r = await alternate(show(pair[0]), show(pair[1]), opts);
    S.species = prev; build();
    S.bench = `${pair[1]} - ${pair[0]}: ${r.diff >= 0 ? "+" : ""}${r.diff} ms (spread ${r.min}..${r.max}; ${pair[0]} ${r.meanA}, ${pair[1]} ${r.meanB})`;
    r.pair = pair;
  }
  const rec = { kind, layout: S.layout, variant: S.variant, species: S.species, view: camera.position.toArray().map((v) => +v.toFixed(1)), ...r, tris: renderer.info.render.triangles, draws: renderer.info.render.drawCalls };
  results.push(rec); console.log("[tree lab] bench", rec);
  return rec;
}

function memText() {
  let geo = 0, atlas = 0, mask = 0;
  for (const sp of Object.values(species)) {
    for (const g of sp.shared.geoms?.values() ?? []) for (const geom of [g.leaves, g.trunk]) { for (const a of Object.values(geom.attributes)) geo += a.array.byteLength; geo += geom.index.array.byteLength; }
    if (sp.bake) atlas += sp.bake.size[0] * sp.bake.size[1] * 4 * 2 * 4 / 3;
    const m = sp.params().leafMask; if (m) mask += m.image.width * m.image.height * (m.format === THREE.RGFormat ? 2 : 1) * 4 / 3;
  }
  let kitB = 0;
  for (const k of kits.values()) kitB += k.atlas?.bytes ?? 0;
  const ct = species.copperbeech ? COPPER_TEX[S.cbSeason].gpuBytes : 0;
  return `impostor atlas ${(atlas / 1048576).toFixed(1)} MB · kit atlas ${(kitB / 1048576).toFixed(1)} MB · built trees ${(geo / 1048576).toFixed(2)} MB · leaf masks ${(mask / 1048576).toFixed(2)} MB · factory textures ${(ct / 1048576).toFixed(1)} MB`;
}
function updateInfo() {
  const lines = [`${backend} · layout "${S.layout}" · ${fields.reduce((s, x) => s + (x.f.group.visible ? x.f.count : 0), 0) || (chain ? 4 : 0)} trees`];
  for (const sp of Object.values(species)) {
    const per = [0, 1, 2].map((l) => { let t = 0, n = 0; for (let v = 0; v < sp.variants; v++) { const g = sp.shared.geoms.get(`${v}:${l}`); if (g) { t += (g.leaves.index.count + g.trunk.index.count) / 3; n++; } } return Math.round(t / n); });
    lines.push(`${sp.def.id}: ${sp.variants} variants, natural height ${sp.naturalHeight.toFixed(1)} m · mean tris LOD0 ${per[0].toLocaleString()} / LOD1 ${per[1].toLocaleString()} / LOD2 ${per[2].toLocaleString()} / impostor 2 · build ${sp.buildMs.toFixed(0)} ms, impostor bake ${sp.bakeMs.toFixed(0)} ms`);
  }
  $info.textContent = lines.join("\n") + `\nperf: ${S.perf}\n${S.mem}\nbenchmark: ${S.bench}`;
}

// ------------------------------------------------------------------------------------------------ loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
build();
resetView();
if (qp.get("walk")) { S.walkMode = qp.get("walk") === "dolly" ? "dolly zoom (camera walks)" : S.walkMode; }

const eye = new THREE.Vector3();
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0, cpuMs = 0;
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (S.walking) {
    if (!walk.paused) { const u = (now - walk.t0) / (S.walkSeconds * 1000); if (u >= 1) walk.t0 = now; walkAt(dOf(Math.min(1, Math.max(0, u)))); }
    else walkAt(S.walkD);
    eye.copy(walk.eye);
    if (S.walkMode.startsWith("frozen")) controls.update();
  } else { controls.update(); eye.copy(camera.position); }
  lodEye.value.copy(eye);
  const t0 = performance.now();
  for (const { f } of fields) if (f.group.visible) f.update(eye);
  for (const k of kits.values()) K.updateView(k.view, camera, renderer);
  chain?.update(eye);
  cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  const focus = S.walking ? walk.target : controls.target;
  const viewD = S.walking ? S.walkD : camera.position.distanceTo(controls.target);
  lighting.update(eye.y, Y0, focus, THREE.MathUtils.clamp(viewD * 0.9, 60, 380), dt);
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  for (const l of labels) {
    const p = l.at.clone().project(camera), vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
    l.el.style.display = vis ? "block" : "none";
    if (vis) { l.el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`; l.el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight - 70}px`; }
  }
  $walk.style.display = S.walking ? "block" : "none";
  if (S.walking) { S.lodNow = lodStateText(S.walkD); $walk.textContent = `LOD walk (${S.walkMode.split(" (")[0]}): ${S.walkD.toFixed(0)} m · ${S.lodNow}`; }
  if (++frames % 10 === 1) {
    const r = renderer.info.render;
    S.perf = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    S.passes = gpu.passes ? Object.entries(gpu.passes).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · ") : "-";
    S.cpu = `${cpuMs.toFixed(3)} ms / frame (LOD buckets + uniforms)`;
    S.mem = memText();
    if (frames % 30 === 1) updateInfo();
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
/** The pop meter (docs/SMOOTH_LOD.md §5): a frozen-view LOD walk in `steps` log steps from d0 to d1; at each step the
 *  frame is grabbed (480 x 270) and compared with the previous one: the share of pixels changing by > 40/255. A pop
 *  is a step much larger than its neighbours ("jump" = the step minus the mean of its two neighbours). */
async function popWalk({ steps = 60, d0 = 2, d1 = 1200, settle = 350 } = {}) {
  const c = document.createElement("canvas"); c.width = 480; c.height = 270;
  const g = c.getContext("2d", { willReadFrequently: true });
  const grab = () => new Promise((r) => requestAnimationFrame(() => { g.drawImage(renderer.domElement, 0, 0, 480, 270); r(g.getImageData(0, 0, 480, 270).data); }));
  const mode = S.walkMode; S.walkMode = "frozen view (LOD eye walks)";
  startWalk(); walk.paused = true;
  let prev = null; const out = [];
  for (let i = 0; i <= steps; i++) {
    const d = d0 * Math.pow(d1 / d0, i / steps);
    S.walkD = d; walkAt(d);
    await sleep(settle);
    const px = await grab();
    if (prev) { let n = 0; for (let k = 0; k < px.length; k += 4) if (Math.abs(px[k] - prev[k]) + Math.abs(px[k + 1] - prev[k + 1]) + Math.abs(px[k + 2] - prev[k + 2]) > 120) n++; out.push([+d.toFixed(1), +(100 * n / (480 * 270)).toFixed(3)]); }
    prev = px;
  }
  stopWalk(); S.walkMode = mode;
  const jumps = out.map(([d, v], i) => [d, +(v - ((out[i - 1]?.[1] ?? v) + (out[i + 1]?.[1] ?? v)) / 2).toFixed(3)]);
  const worst = jumps.reduce((a, b) => (b[1] > a[1] ? b : a), [0, -1]);
  return { steps: out, worstJump: worst, over15: jumps.filter((j) => j[1] > 1.5).length };
}
/** A camera on the sunny side of (x, z) at distance d, eye height h, looking at height ty (screenshots, photo matches). */
function photoView(d = 36, h = 1.6, ty = 9, x = 0, z = 0, turn = 0) {
  const sd = new THREE.Vector3(lighting.sunDir.x, 0, lighting.sunDir.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
  controls.target.set(x, Y0 + ty, z); camera.position.set(x + sd.x * d, Y0 + h, z + sd.z * d);
}
/** The flicker test (labs/flickerTest.js): frames rendered back to back with time frozen, the camera strafing
 *  sub-pixel; reports the blinking pixels (shimmer, z-fight, acne) and shows the heat map. */
async function flicker(o = {}) {
  controls.autoRotate = false;
  const renderFrame = () => {
    lodEye.value.copy(camera.position);
    for (const { f } of fields) if (f.group.visible) f.update(camera.position);
    for (const k of kits.values()) K.updateView(k.view, camera, renderer);
    if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  };
  const r = await flickerTest({ renderFrame, canvas: renderer.domElement, camera, controls, frames: 24, move: "strafe", step: 0.0006, ...o });
  if (o.heat !== false) showHeat(r);
  return r;
}
window.lab = { flicker, kits, COPPER_TEX, dreveTrees, ui, popWalk, photoView, renderer, scene, camera, controls, lighting, S, species, get fields() { return fields; }, get chain() { return chain; }, build, applyAll, bench, alternate, results, startWalk, stopWalk, walkAt, walk, resetView, gpu, lodMorph, IMP, TREE_SHADOW, drawMask, planeLeafMask };
