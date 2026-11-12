// THE IMPOSTOR LAB: the generic octahedral impostor kit (viewer/impostorKit/) against today's tree impostors
// (viewer/impostors.js, imported read-only) and the real tree LODs, on the city's own stylized trees (the vendor's
// createStylizedTrees with viewer/treesStylized.js's parameters), under the city's lighting (viewer/lighting.js) and
// post chain (viewer/post.js). docs/IMPOSTOR_KIT.md: the results; docs/IMPOSTORS_RESEARCH.md: why.
//
// Scenes: a single tree (turntable), a row of 50 street trees from 300 to 1500 m, a forest patch (~2,000 LiDAR trees
// of tile M8 on its DTM + orthophoto), the far forest (every LiDAR tree within 1.6 km of a viewpoint over L8: the
// cost scene); slots for later: 300 cars, a hero building, a rock.
// Modes: mesh (the real LODs to the horizon: the reference), today (LOD 2 -> viewer/impostors.js at 400 m, its screen
// dither), kit (LOD 2 -> the kit at the hand-over, object-anchored dither), none (no far trees: the cost baseline).
// JITTER METER (labs/jitterMeter.js): fixed camera paths (slow orbit, strafe, dolly, the bird path), per distance
// band, mesh / today / kit, jitter excess = impostor / mesh. Also: frame strips, side-by-side at the hand-over, GPU
// bench (timestamp queries, medians), the kit's atlas viewer, bake time and memory.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { attribute, vec3, float, mix, smoothstep, mx_noise_float, normalGeometry, positionGeometry, select, uniform, texture, positionWorld } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { lodEye, ditherNoise } from "../viewer/lodFade.js";
import { treeParams } from "../viewer/treesStylized.js";
import { createStylizedTrees } from "../vendor/stylized-trees/stylizedTrees.js";
import { bakeTreeImpostors, impostorMaterial, impostorField as todayField, IMP } from "../viewer/impostors.js";
import { bumpNormal } from "../viewer/tslkit.js";
import * as K from "../viewer/impostorKit/index.js";
import { jitterRun, stripURL } from "./jitterMeter.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $atlas = document.getElementById("atlas"), $ov = document.getElementById("overlay");
const CW = +(qp.get("w") ?? 1280), CH = +(qp.get("h") ?? 720);
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(1);
renderer.setSize(CW, CH);
renderer.shadowMap.enabled = true;
renderer.domElement.className = "main";
document.body.prepend(renderer.domElement);
await renderer.init();
if (!renderer.backend.isWebGPUBackend) $info.textContent = "This lab needs WebGPU (the kit writes its mip chains straight to the GPU texture).";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, CW / CH, 0.3, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the city's trees
// The vendor's stylized trees with the city's parameters (treeParams(), read-only): the same built trees (same seeds),
// leaf mask, LOD distances and morph. Copied from viewer/treesStylized.js (private there): the bark material, the
// height calibration, the leaves' depth pre-pass pair, the placement hash and the variant rule.
const VARIANTS = 6;
const H = K.makeFade(K.TYPES.tree.fade);        // the hand-over / far distances, shared by the kit and the mesh LOD 2
const base = treeParams();
const leafMask = base.leafMask;
/** LOD 2's hand-over mask: keep n < 1 - t; n = the object-anchored noise (kit) or the screen IGN (today) */
const farMask = (d) => {
  const foot = attribute("treePos", "vec3"), xf = attribute("treeXf", "vec3");
  const n = K.fadeNoise(H, K.anchorOf(H, foot, xf.z), K.footSeed(foot));
  return K.meshKeep(H, d, n);
};
const shared = {};
createStylizedTrees({ scene: new THREE.Group(), trees: [], shared, variants: VARIANTS, params: { ...base, farMask } });
let NATURAL_HEIGHT = 11;
{
  let sum = 0, n = 0;
  for (const [key, g] of shared.geoms) { if (!key.endsWith(":0")) continue; g.leaves.computeBoundingBox(); sum += g.leaves.boundingBox.max.y + 1.0; n++; }
  if (n) NATURAL_HEIGHT = sum / n;
}
barkMaterial(shared.trunkMat);
for (const k of ["colorNode", "normalNode", "roughnessNode"]) shared.trunkFar[k] = shared.trunkMat[k];
shared.trunkFar.needsUpdate = true;
for (const m of new Set([shared.leafMat, shared.leafFar, shared.trunkMat, shared.trunkFar])) m.userData.shared = true;
const U = shared.U;
function barkMaterial(m) {   // viewer/treesStylized.js barkMaterial (private there), as is
  const p = positionGeometry;
  const ridge = mx_noise_float(vec3(p.x.mul(7.0), p.y.mul(0.9), p.z.mul(7.0))).mul(0.5).add(0.5);
  const fine = mx_noise_float(vec3(p.x.mul(23.0), p.y.mul(3.0), p.z.mul(23.0))).mul(0.5).add(0.5);
  const furrow = smoothstep(0.35, 0.7, ridge);
  let col = mix(vec3(0.07, 0.055, 0.045), vec3(0.26, 0.22, 0.18), furrow);
  col = col.mul(fine.mul(0.35).add(0.82));
  const moss = smoothstep(1.6, 0.2, p.y).mul(smoothstep(0.2, 0.9, normalGeometry.y.add(normalGeometry.x.mul(0.5)).add(0.3)));
  col = mix(col, vec3(0.16, 0.2, 0.09), moss.mul(0.55));
  m.colorNode = col;
  m.normalNode = bumpNormal(furrow.mul(0.02).add(fine.mul(0.006)));
  m.roughnessNode = float(0.92);
  m.needsUpdate = true;
}
const prepass = new Map();
function prepassMaterials(b) {   // viewer/treesStylized.js prepassMaterials (private there), as is
  if (prepass.has(b)) return prepass.get(b);
  const depth = new THREE.MeshBasicNodeMaterial({ side: b.side });
  depth.positionNode = b.positionNode; depth.opacityNode = b.opacityNode; depth.maskNode = b.maskNode;
  depth.alphaTest = b.alphaTest; depth.alphaToCoverage = b.alphaToCoverage; depth.colorWrite = false;
  const colour = b.clone();
  colour.opacityNode = null; colour.maskNode = null; colour.alphaTest = 0; colour.alphaToCoverage = false;
  colour.maskShadowNode = b.maskShadowNode; colour.depthFunc = THREE.EqualDepth; colour.depthWrite = false;
  depth.userData.shared = colour.userData.shared = true;
  const pair = { depth, colour };
  prepass.set(b, pair);
  return pair;
}
const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
const variantOfIndex = (i, v) => { let s = (i * 7919 + 13) >>> 0; s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * v); };
const toPlacement = (t) => [t.x, t.z, t.y, hash(t.z, t.x, 2) * Math.PI * 2, Math.min(1.8, Math.max(0.3, Math.max(3, t.height ?? 9) / NATURAL_HEIGHT))];

/** A vendor tree field (one group of trees), as viewer/treesStylized.js buildStylizedTreeField builds a tile's. */
function meshField(placements) {
  const holder = new THREE.Group();
  const P = { ...base, farMask, maxDist: H.start.value };
  const f = createStylizedTrees({ scene: holder, trees: placements, shared, variants: VARIANTS, params: P });
  holder.traverse((o) => {
    if (!o.isInstancedMesh) return;
    o.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    o.geometry.attributes.treeXf?.setUsage(THREE.StaticDrawUsage);
    o.geometry.attributes.treePos?.setUsage(THREE.StaticDrawUsage);
  });
  const lodOf = new Map();
  for (const [key, g] of shared.geoms) { const lod = +key.split(":")[1]; lodOf.set(g.leaves.index, lod); lodOf.set(g.trunk.index, lod); }
  holder.traverse((o) => { if (o.isInstancedMesh && lodOf.has(o.geometry.index)) o.castShadow = lodOf.get(o.geometry.index) <= 1; });
  const twins = [];
  holder.traverse((o) => {
    if (!o.isInstancedMesh || (o.material !== shared.leafMat && o.material !== shared.leafFar)) return;
    const pm = prepassMaterials(o.material);
    o.material = pm.colour;
    const d = new THREE.InstancedMesh(o.geometry, pm.depth, o.instanceMatrix.count);
    d.instanceMatrix = o.instanceMatrix; d.count = 0; d.castShadow = d.receiveShadow = false; d.frustumCulled = false; d.renderOrder = -1;
    o.add(d); twins.push([o, d]);
  });
  return { holder, f, twins, update(cam, light) { f.update(cam, light); for (const [o, d] of twins) d.count = o.count; } };
}

// ------------------------------------------------------------------------------------------------ the bakes
// today's: viewer/impostors.js as the city calls it (treesStylized.js calibrate: LOD 0 as built)
let todayBake = null, todayMat = null;
{
  const t0 = performance.now();
  U.lodScale.value = 0;
  todayBake = bakeTreeImpostors(renderer, shared, VARIANTS, leafMask);
  U.lodScale.value = 1;
  todayMat = impostorMaterial(todayBake, U);
  todayBake.ms = performance.now() - t0;
}
// the kit's
const S = {
  scene: qp.get("scene") ?? "row50", mode: qp.get("mode") ?? "kit", distance: 600, post: true, time: preset, hour: 0,
  blend: "bary3", parallax: 0, pdo: false, alpha: "a2c-ramp", gain: 1, card: "octagon", noise: "screen", far: "ground", lodBias: -1, colourDepth: "equal", ringSplit: 0, sortKit: true, farParallax: 0, farBlend: "bary3",
  start: 400, band: 30, end: 1500, endBand: 300, todayEnd: 1100,
  grid: 16, cell: 64, bakeLod: 2, bakeInfo: "", todayInfo: "",
  path: "orbit", frames: 24, orbitDeg: 0.02, strafe: 0.12, dolly: 1.0, result: "—", gpu: "—", bench: "—",
  atlasOn: false, layer: 0, channel: "albedo", stats: "",
};
const view = K.makeView();
let atlas = null, kitMats = null, kitFarMats = null;
async function bakeKit() {
  S.bakeInfo = "baking…";
  const spec = { ...K.TYPES.tree, grid: S.grid, cell: S.cell };
  const src = K.stylizedTreeSource(shared, leafMask, { variants: VARIANTS, lod: S.bakeLod, handover: H.start.value });
  const a = await K.bakeAtlas(renderer, src, spec);
  atlas?.dispose();
  atlas = a;
  S.bakeInfo = `${atlas.grid}x${atlas.grid} views x ${atlas.cell} px, ${atlas.layers} layers, ${atlas.levels} levels, ${(atlas.bytes / 1048576).toFixed(1)} MB; bake ${atlas.bakeMs.toFixed(0)} ms (renders ${atlas.renderMs.toFixed(0)} ms main thread over ${atlas.grid * atlas.layers} frames, worker ${atlas.workerMs.toFixed(0)} ms)`;
  console.log("[impostor lab] kit bake:", S.bakeInfo, atlas.stats);
  buildKitMats();
}
function buildKitMats() {
  if (!atlas) return;
  const old = kitMats;
  const opt = { fade: H, view, shade: K.treeShade(U), blend: S.blend, parallax: +S.parallax, pdo: S.pdo, alpha: S.alpha, card: S.card,
    far: S.far, colourDepth: S.colourDepth, name: "tree-kit" };
  const oldFar = kitFarMats;
  const rings = S.ringSplit > 0;
  kitMats = K.impostorMaterials(atlas, { ...opt, ring: rings ? "near" : "all" });
  kitFarMats = rings ? K.impostorMaterials(atlas, { ...opt, ring: "far", pdo: false, parallax: +S.farParallax, blend: S.farBlend, name: "tree-kit-far" }) : null;
  view.ringSplit.value = S.ringSplit;
  oldFar?.colour.dispose(); oldFar?.depth.dispose();
  view.gain.value = S.gain; view.lodBias.value = S.lodBias;
  if (world?.kit) {
    // the card geometry is part of the field: rebuild it when the card changes
    if (world.kit.card !== S.card) rebuildKitField(); else world.kit.setMaterials(kitMats, kitFarMats);
  }
  old?.colour.dispose(); old?.depth.dispose();
}
const todayMB = (todayBake.size[0] * todayBake.size[1] * 4 * 2 * 4 / 3) / 1048576;
S.todayInfo = `8x8 views x 128 px, ${todayBake.size.join("x")} x2, ${todayMB.toFixed(1)} MB, bake ${todayBake.ms.toFixed(0)} ms (sync)`;

// ------------------------------------------------------------------------------------------------ ground
const TILE_CACHE = new Map();
async function loadTile(id) {
  if (TILE_CACHE.has(id)) return TILE_CACHE.get(id);
  const p = (async () => {
    const hdr = await fetch(`../data/tiles/${id}/terrain.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!hdr) return null;
    const raw = new Uint16Array(await fetch(`../data/tiles/${id}/terrain.u16`).then((r) => r.arrayBuffer()));
    const feats = await fetch(`../data/tiles/${id}/features.json`).then((r) => r.json()).catch(() => ({ trees: [] }));
    let lo = Infinity;
    for (const v of raw) if (v !== hdr.nodata) lo = Math.min(lo, v);
    const hAt = (c, r) => { const v = raw[Math.min(hdr.rows - 1, r) * hdr.cols + Math.min(hdr.cols - 1, c)]; return (v === hdr.nodata ? lo : v) / 100; };
    const step = 4, n = Math.floor((hdr.cols - 1) / step) + 1;
    const g = new THREE.PlaneGeometry(hdr.size, hdr.size, n - 1, n - 1).rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + hdr.size / 2, z = pos.getZ(i) + hdr.size / 2;
      pos.setXYZ(i, hdr.x0 + x, hAt(Math.round(x / hdr.step), Math.round(z / hdr.step)) - 0.05, hdr.z0 + z);
    }
    g.computeVertexNormals();
    const ortho = await new THREE.TextureLoader().loadAsync(`../data/tiles/${id}/ortho.jpg`).catch(() => null);
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
    let avg = null;
    if (ortho) {
      ortho.colorSpace = THREE.SRGBColorSpace; ortho.anisotropy = 8; m.map = ortho;
      // the orthophoto's mean colour (linear): what the far trees fade into (FAR.ground)
      const c = new OffscreenCanvas(16, 16), x = c.getContext("2d"); x.drawImage(ortho.image, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data, lin = (v) => Math.pow(v / 255, 2.2);
      avg = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) avg[k] += lin(d[i + k]) / 256;
    }
    else m.color.set(0x4a5236);
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    const ground = (x, z) => hAt(Math.round((x - hdr.x0) / hdr.step), Math.round((z - hdr.z0) / hdr.step));
    return { id, hdr, mesh, trees: feats.trees ?? [], ground, avg };
  })();
  TILE_CACHE.set(id, p);
  return p;
}
let manifest = null;
async function tilesNear(x, z, r) {
  manifest ??= await fetch("../data/tiles/manifest.json").then((res) => res.json());
  const out = [];
  for (const t of manifest.tiles) {
    const b = t.bounds;
    const cx = Math.min(Math.max(x, b.x[0]), b.x[1]), cz = Math.min(Math.max(z, b.z[0]), b.z[1]);
    if (Math.hypot(cx - x, cz - z) > r) continue;
    const tile = await loadTile(t.name);
    if (tile) out.push(tile);
  }
  return out;
}
const flatGround = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x4e5a34, roughness: 1 }));
flatGround.receiveShadow = true;

// ------------------------------------------------------------------------------------------------ scenes
// world = { groups: [{ name, placements, mesh, today, hidden }], kit (field), focus, start pose, ground meshes }
let world = null;
const BANDS = [[0, 420, "near"], [420, 600, "420-600"], [600, 800, "600-800"], [800, 1100, "800-1100"], [1100, 1e9, ">1100"]];
const SCENES = {
  single: { label: "a single tree (turntable)" },
  row50: { label: "a row of 50 street trees, 300-1500 m" },
  forest: { label: "forest patch, ~2,000 LiDAR trees (M8)" },
  far: { label: "far forest: every LiDAR tree within 1.6 km (cost)" },
  cars: { label: "300 parked cars (impostor-cars.js)", page: "?scene=cars" },
  building: { label: "a hero building (later)", later: true },
  rock: { label: "a rock (later)", later: true },
};
async function buildScene(id) {
  if (SCENES[id]?.page) { location.search = SCENES[id].page; return; }
  if (SCENES[id]?.later) { S.result = `${SCENES[id].label}: slot only (docs/TODO.md)`; return; }
  disposeWorld();
  const w = { id, groups: [], grounds: [], focus: new THREE.Vector3(), eye: new THREE.Vector3() };
  let trees = [];        // { x, y, z, height } world
  if (id === "single" || id === "row50") {
    scene.add(flatGround); w.grounds.push(flatGround);
    if (id === "single") trees = [{ x: 0, z: -S.distance, y: 0, height: 12 }];
    else for (let i = 0; i < 50; i++) {
      const d = 300 + (i * 1200) / 49, side = i % 2 ? 1 : -1;
      trees.push({ x: side * d * Math.tan(THREE.MathUtils.degToRad(2 + (i % 5) * 1.4)), z: -d, y: 0, height: 11 + 3 * Math.sin(i * 1.7) });
    }
    w.eye.set(0, id === "single" ? 8 : 14, 0);
    w.focus.set(0, 6, -(id === "single" ? S.distance : 700));
  } else if (id === "forest") {
    const m8 = await loadTile("M8");
    const c = new THREE.Vector2(m8.hdr.x0 + 250, m8.hdr.z0 + 250);
    trees = m8.trees.filter((t) => Math.hypot(t.x - c.x, t.z - c.y) < 185);
    for (const t of await tilesNear(c.x, c.y, 1300)) { scene.add(t.mesh); w.grounds.push(t.mesh); }
    const ex = c.x - 700, ez = c.y + 120, gy = (await loadTile("L8"))?.ground(ex, ez) ?? m8.ground(c.x, c.y);
    w.eye.set(ex, gy + 70, ez);
    w.focus.set(c.x, m8.ground(c.x, c.y) + 10, c.y);
  } else if (id === "far") {
    const l8 = await loadTile("L8");
    const c = new THREE.Vector2(l8.hdr.x0 + 250, l8.hdr.z0 + 250);
    const tiles = await tilesNear(c.x, c.y, 2100);
    for (const t of tiles) { scene.add(t.mesh); w.grounds.push(t.mesh); }
    for (const t of tiles) for (const tr of t.trees) if (Math.hypot(tr.x - c.x, tr.z - c.y) < 1600) trees.push(tr);
    w.eye.set(c.x, l8.ground(c.x, c.y) + 140, c.y);
    w.focus.set(c.x + 900, l8.ground(c.x, c.y) + 20, c.y - 300);
  }
  // groups: by distance band from the scene's eye (the meter hides a band to find its pixels); the far forest groups
  // by 500 m tile instead and keeps meshes only within 700 m (36 instanced meshes per group, sized to its count)
  const byBand = id !== "far";
  const groupsOf = new Map();
  for (const t of trees) {
    const d = Math.hypot(t.x - w.eye.x, (t.y ?? 0) - w.eye.y, t.z - w.eye.z);
    const key = byBand ? BANDS.findIndex(([a, b]) => d >= a && d < b) : `${Math.floor(t.x / 500)},${Math.floor(t.z / 500)}`;
    if (!groupsOf.has(key)) groupsOf.set(key, { name: byBand ? BANDS[key][2] : key, trees: [], dmin: Infinity });
    const gr = groupsOf.get(key); gr.trees.push(t); gr.dmin = Math.min(gr.dmin, d);
  }
  const kitPlacements = [];
  let gi = 0;
  for (const [, gr] of [...groupsOf.entries()].sort((a, b) => (byBand ? a[0] - b[0] : a[1].dmin - b[1].dmin))) {
    const placements = gr.trees.map(toPlacement);
    const variants = placements.map((_, i) => variantOfIndex(i, VARIANTS));
    const mesh = (byBand || gr.dmin < 700) ? meshField(placements) : null;
    if (mesh) scene.add(mesh.holder);
    const today = todayField(placements, variants, todayMat);
    today.mesh.traverse((o) => { o.frustumCulled = false; });   // (the city gives it the tile's sphere instead)
    scene.add(today.mesh);
    const band = byBand ? gi : 0;
    placements.forEach((p, i) => kitPlacements.push({ x: p[0], y: p[2] - 0.25, z: p[1], yaw: p[3], scale: p[4], variant: variants[i], band }));
    w.groups.push({ name: gr.name, n: placements.length, mesh, today, band, hidden: false });
    gi++;
  }
  w.trees = trees.length;
  // the far fade's target: the mean orthophoto under the scene (flat ground: its own colour)
  const avgs = [];
  for (const id of TILE_CACHE.keys()) { const t = await TILE_CACHE.get(id); if (t?.avg && w.grounds.includes(t.mesh)) avgs.push(t.avg); }
  if (avgs.length) K.FAR.ground.value.setRGB(...[0, 1, 2].map((k) => avgs.reduce((a, v) => a + v[k], 0) / avgs.length));
  else K.FAR.ground.value.copy(flatGround.material.color);
  w.kitPlacements = kitPlacements;
  world = w;
  rebuildKitField();
  resetView();
  applyMode();
  S.result = `${SCENES[id].label}: ${trees.length} trees in ${w.groups.length} groups (${w.groups.map((g) => `${g.name} ${g.n}`).join(", ")})`;
}
function rebuildKitField() {
  if (!world || !kitMats) return;
  if (world.kit) { scene.remove(world.kit.group); world.kit.dispose(); }
  world.kit = K.impostorField(kitMats, world.kitPlacements, { card: S.card, name: "tree-kit", farMats: kitFarMats });
  world.kit.card = S.card;
  if (S.sortKit) world.kit.sort(world.eye);
  scene.add(world.kit.group);
  applyMode();
}
function disposeWorld() {
  if (!world) return;
  for (const g of world.groups) { if (g.mesh) { scene.remove(g.mesh.holder); g.mesh.f.dispose(); } scene.remove(g.today.mesh); }
  if (world.kit) { scene.remove(world.kit.group); world.kit.dispose(); }
  for (const m of world.grounds) scene.remove(m);
  world = null;
}
function resetView() {
  camera.position.copy(world.eye); controls.target.copy(world.focus); camera.lookAt(world.focus); controls.update();
}

// ------------------------------------------------------------------------------------------------ modes
function applyMode() {
  if (!world) return;
  const m = S.mode;
  IMP.start.value = S.start; IMP.end.value = S.todayEnd;
  H.end.value = S.end; H.endBand.value = S.endBand;
  if (m === "mesh") { H.start.value = 1e6; H.band.value = S.band; }
  else if (m === "today") { H.start.value = S.start; H.band.value = IMP.band.value; H.noise.value = 0; }
  else if (m === "kit") { H.start.value = S.start; H.band.value = S.band; H.noise.value = S.noise === "object" ? 1 : 0; }
  else { H.start.value = S.start - S.band; H.band.value = 0.001; }
  const maxDist = m === "mesh" ? 1e6 : m === "none" ? S.start - S.band : S.start;
  for (const g of world.groups) {
    if (g.mesh) g.mesh.f.params.maxDist = maxDist;
    g.today.mesh.visible = m === "today" && !g.hidden;
    if (g.mesh) g.mesh.holder.visible = !g.hidden;
  }
  if (world.kit) world.kit.group.visible = m === "kit";
  view.hideMask.value = world.groups.reduce((s, g) => s + (g.hidden ? 2 ** g.band : 0), 0);
}
const light = { sunDir: new THREE.Vector3(), sunColor: [1, 1, 1] };
function updateTrees() {
  light.sunDir.copy(lighting.sunDir);
  const c = lighting.keyColor, k = 0.18;
  light.sunColor[0] = c.r * k; light.sunColor[1] = c.g * k; light.sunColor[2] = c.b * k;
  lodEye.value.copy(camera.position);
  for (const g of world?.groups ?? []) { g.mesh?.update(camera, light); g.today.update(camera.position); }
  K.updateView(view, camera, renderer);
  K.setCellFromCamera(H, camera, renderer.getDrawingBufferSize(new THREE.Vector2()).y);
}

// ------------------------------------------------------------------------------------------------ render
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
let frozen = false;
function renderFrame(dt = 1 / 60) {
  updateTrees();
  if (!frozen) lighting.update(camera.position.y, 0, controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380), dt);
  if (S.post) { pipe.render(hazeHook); pipe.setExposureFactor(lighting.adapt(frozen ? 0 : dt)); }
  else { renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0); renderer.render(scene, camera); }
}

// ------------------------------------------------------------------------------------------------ camera paths
// deterministic, frame index f from the pose the run starts at (lab time frozen: dt = 0)
let pathBase = null;
function poseFor(path, f) {
  const b = pathBase;
  if (path === "orbit") {
    const a = THREE.MathUtils.degToRad(S.orbitDeg * f), o = b.pos.clone().sub(b.target);
    camera.position.set(b.target.x + o.x * Math.cos(a) - o.z * Math.sin(a), b.pos.y, b.target.z + o.x * Math.sin(a) + o.z * Math.cos(a));
    camera.lookAt(b.target);
  } else if (path === "strafe" || path === "dolly") {
    const fwd = b.target.clone().sub(b.pos).normalize(), right = fwd.clone().cross(camera.up).normalize();
    camera.position.copy(b.pos).addScaledVector(path === "strafe" ? right : fwd, (path === "strafe" ? S.strafe : S.dolly) * f);
    camera.quaternion.copy(b.quat);
  } else if (path === "bird") {
    // a falcon's glide over the trees: 0.6 m a frame (36 m/s at 60 fps), 60-150 m over the ground, gentle bank
    const fwd = b.target.clone().sub(b.pos).setY(0).normalize(), right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const s = f * 0.6;
    camera.position.copy(b.pos).addScaledVector(fwd, s).addScaledVector(right, 18 * Math.sin(s / 140)).add(new THREE.Vector3(0, 12 * Math.sin(s / 90), 0));
    const look = camera.position.clone().addScaledVector(fwd, 300).addScaledVector(right, 40 * Math.cos(s / 140)).add(new THREE.Vector3(0, -70, 0));
    camera.lookAt(look);
  }
  camera.updateMatrixWorld(true);
}
function startPath() {
  pathBase = { pos: camera.position.clone(), quat: camera.quaternion.clone(), target: controls.target.clone() };
  if (S.path === "bird") {
    // from the scene's eye, at bird height over the ground
    pathBase.pos.copy(world.eye); pathBase.pos.y = Math.max(world.eye.y, world.focus.y + 60);
    pathBase.target.copy(world.focus);
  }
}
function endPath() { camera.position.copy(pathBase.pos); camera.quaternion.copy(pathBase.quat); controls.target.copy(pathBase.target); camera.updateMatrixWorld(true); }

// ------------------------------------------------------------------------------------------------ the jitter meter
async function meter(mode, path = S.path, { strip = false } = {}) {
  S.mode = mode; applyMode();
  frozen = true;
  renderFrame(0);
  startPath();
  const bands = world.groups.filter((g) => g.n && (g.name !== "near" || world.id === "single")).map((g) => ({
    name: g.name, hide: () => { g.hidden = true; applyMode(); }, show: () => { g.hidden = false; applyMode(); },
  }));
  const crop = strip ? stripCrop() : null;
  const r = await jitterRun({ frames: S.frames, pose: (f) => poseFor(path, f), render: () => renderFrame(0), canvas: renderer.domElement, bands, keepFrames: strip ? 12 : 0, crop });
  endPath();
  frozen = false;
  r.mode = mode; r.path = path; r.scene = world.id;
  return r;
}
function stripCrop() {
  // around the screen point of the scene's focus, 200 x 120 px
  const p = world.focus.clone().project(camera);
  const x = Math.round((p.x * 0.5 + 0.5) * CW - 100), y = Math.round((-p.y * 0.5 + 0.5) * CH - 60);
  return [Math.min(Math.max(0, x), CW - 200), Math.min(Math.max(0, y), CH - 120), 200, 120];
}
const fmt = (b) => (b ? `${(b.share * 100).toFixed(2)}% / ${(b.d2 * 1000).toFixed(2)}` : "—");
async function meterAB(path = S.path, modes = ["mesh", "today", "kit"]) {
  const out = {};
  const keep = S.mode;
  for (const m of modes) out[m] = await meter(m, path);
  S.mode = keep; applyMode();
  const names = Object.keys(out[modes[0]].bands);
  const rows = ["all", ...names].map((n) => {
    const get = (m) => (n === "all" ? out[m].all : out[m].bands[n]);
    const ex = (m) => { const a = get(m), b = get("mesh"); return a && b && b.d2 > 0 ? `x${(a.d2 / b.d2).toFixed(2)} d2, x${b.share > 0 ? (a.share / b.share).toFixed(2) : "-"} blink` : ""; };
    return `${n.padEnd(9)} ${modes.map((m) => `${m}: ${fmt(get(m))} ${m !== "mesh" ? ex(m) : ""}`).join(" | ")}`;
  });
  const txt = `[${world.id} · ${path} · ${S.frames} frames] blink share / d2 x1000 (mask px all: ${modes.map((m) => out[m].all.maskPx).join("/")})\n` + rows.join("\n");
  console.log(txt);
  S.result = txt;
  (window.lab.results ??= []).push({ scene: world.id, path, settings: kitSettings(), out: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { all: v.all, bands: v.bands }])) });
  window.lab.lastHeat = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.heatURL]));
  return out;
}
const kitSettings = () => ({ ringSplit: S.ringSplit, farParallax: S.farParallax, farBlend: S.farBlend, blend: S.blend, parallax: S.parallax, pdo: S.pdo, alpha: S.alpha, gain: S.gain, card: S.card, noise: S.noise, far: S.far, lodBias: S.lodBias, grid: S.grid, cell: S.cell, bakeLod: S.bakeLod, post: S.post });
function show(url, caption = "") { lastShown = url; $ov.style.display = "block"; $ov.querySelector("img").src = url; $ov.querySelector("div").textContent = caption; }
$ov.onclick = () => { $ov.style.display = "none"; };
async function stackURLs(urls, caption) {
  const bms = [];
  for (const u of urls) { const b = await fetch(u).then((r) => r.blob()); bms.push(await createImageBitmap(b)); }
  const w = Math.max(...bms.map((b) => b.width)), h = bms.reduce((s, b) => s + b.height + 6, 0);
  const c = new OffscreenCanvas(w, h), x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
  let y = 0;
  for (const b of bms) { x.drawImage(b, 0, y); y += b.height + 6; }
  const url = URL.createObjectURL(await c.convertToBlob({ type: "image/png" }));
  show(url, caption);
  return url;
}
async function stripSet(path = S.path) {
  const keep = S.mode, urls = [];
  for (const m of ["mesh", "today", "kit"]) {
    const r = await meter(m, path, { strip: true });
    urls.push(await stripURL(r.kept, 3, `${world.id} · ${path} · ${m}: 12 consecutive frames, x3 (rows of 6)`));
  }
  S.mode = keep; applyMode();
  return stackURLs(urls, `${world.id} ${path}: mesh / today / kit`);
}
/** impostor vs mesh at the same camera: left the mode, right the mesh, then |diff| x4 */
async function sideBySide(mode = "kit", crop = null, k = 1) {
  frozen = true;
  const grabMode = (m) => { S.mode = m; applyMode(); renderFrame(0); renderFrame(0); const c = new OffscreenCanvas(CW, CH), x = c.getContext("2d"); x.drawImage(renderer.domElement, 0, 0); return x.getImageData(0, 0, CW, CH); };
  const keep = S.mode;
  let a = grabMode(mode), b = grabMode("mesh");
  S.mode = keep; applyMode(); frozen = false;
  if (crop) {   // a region, scaled k x (nearest): the hand-over close-up
    const cut = (im) => { const c0 = new OffscreenCanvas(CW, CH), x0 = c0.getContext("2d"); x0.putImageData(im, 0, 0); const c1 = new OffscreenCanvas(crop[2] * k, crop[3] * k), x1 = c1.getContext("2d"); x1.imageSmoothingEnabled = false; x1.drawImage(c0, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2] * k, crop[3] * k); return x1.getImageData(0, 0, crop[2] * k, crop[3] * k); };
    a = cut(a); b = cut(b);
  }
  const w = a.width, h = a.height;
  const c = new OffscreenCanvas(w * 3, h), x = c.getContext("2d");
  x.putImageData(a, 0, 0); x.putImageData(b, w, 0);
  const d = x.createImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.min(255, Math.abs(a.data[i + k] - b.data[i + k]) * 4);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255;
  x.putImageData(d, w * 2, 0);
  x.fillStyle = "#fff"; x.font = "18px monospace";
  x.fillText(`${mode}`, 10, 24); x.fillText("mesh LODs", w + 10, 24); x.fillText("|diff| x4", w * 2 + 10, 24);
  const url = URL.createObjectURL(await c.convertToBlob({ type: "image/png" }));
  show(url, `${world.id}: ${mode} | mesh | diff x4`);
  return url;
}

/** The far trees' look in a mode, at this camera: mean linear-ish colour over their pixels (brightness match) and
 *  the mean |Laplacian| of luminance inside the crowns (leafy breakup: higher = crisper), the mask from on/off. */
function treeStats(mode) {
  frozen = true;
  const grab = () => { const c = new OffscreenCanvas(CW, CH), x = c.getContext("2d"); x.drawImage(renderer.domElement, 0, 0); return x.getImageData(0, 0, CW, CH).data; };
  const keep = S.mode;
  S.mode = mode; applyMode(); renderFrame(0); renderFrame(0);
  const on = grab();
  for (const g of world.groups) g.hidden = true;
  applyMode(); renderFrame(0); const off = grab();
  for (const g of world.groups) g.hidden = false;
  S.mode = keep; applyMode(); frozen = false;
  const m = new Uint8Array(CW * CH), L = new Float32Array(CW * CH);
  for (let j = 0, i = 0; j < m.length; j++, i += 4) {
    L[j] = (0.2126 * on[i] + 0.7152 * on[i + 1] + 0.0722 * on[i + 2]) / 255;
    if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) > 6) m[j] = 1;
  }
  let n = 0, r = 0, g = 0, b = 0, lap = 0, nl = 0, li = 0;
  for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) {
    const j = y * CW + x; if (!m[j]) continue;
    n++; r += on[j * 4]; g += on[j * 4 + 1]; b += on[j * 4 + 2];
    if (m[j - 1] && m[j + 1] && m[j - CW] && m[j + CW]) { lap += Math.abs(4 * L[j] - L[j - 1] - L[j + 1] - L[j - CW] - L[j + CW]); nl++; li += L[j]; }
  }
  return { mode, px: n, rgb: [r / n, g / n, b / n].map((v) => +v.toFixed(1)), lum: +((0.2126 * r + 0.7152 * g + 0.0722 * b) / n).toFixed(1), crisp: +(nl ? (lap / nl) * 1000 : 0).toFixed(1), inner: +(nl ? (li / nl) * 255 : 0).toFixed(1) };
}

// ------------------------------------------------------------------------------------------------ GPU bench
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 900) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function bench(modes = ["none", "mesh", "today", "kit"], rounds = 3) {
  const keep = S.mode, res = Object.fromEntries(modes.map((m) => [m, []]));
  for (let r = 0; r < rounds; r++) for (const m of modes) {
    if (m === "mesh" && world.id === "far") continue;
    S.mode = m; applyMode();
    await wait(700); gpu.samples.length = 0; await wait(2000);
    const s = [...gpu.samples].sort((a, b) => a - b);
    res[m].push(s.length ? s[Math.floor(s.length / 2)] : NaN);
  }
  S.mode = keep; applyMode();
  const med = (a) => { const s = [...a].filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const base = med(res.none);
  S.bench = modes.map((m) => `${m} ${med(res[m]).toFixed(2)}${m !== "none" ? ` (+${(med(res[m]) - base).toFixed(2)})` : ""}`).join(" · ") + " ms";
  console.log(`[impostor lab] GPU ms (median of ${rounds} x 2 s, whole frame) ${world.id}:`, S.bench, res);
  (window.lab.benches ??= []).push({ scene: world.id, view: { pos: camera.position.toArray(), target: controls.target.toArray() }, res, settings: kitSettings(), post: S.post });
  return res;
}

// ------------------------------------------------------------------------------------------------ atlas viewer
function drawAtlas() {
  $atlas.style.display = S.atlasOn && atlas ? "block" : "none";
  if (!S.atlasOn || !atlas) return;
  const W = atlas.size, x = $atlas.getContext("2d");
  const src = atlas.pixels(Math.min(S.layer, atlas.layers - 1), S.channel === "albedo" || S.channel === "coverage" ? "A" : "B");
  const img = new ImageData(W, W), d = img.data;
  for (let i = 0; i < W * W * 4; i += 4) {
    if (S.channel === "albedo") { const a = src[i + 3] / 255; for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.pow(src[i + k] / 255, 1 / 2.2) * 255 * a + 40 * (1 - a)); }
    else if (S.channel === "coverage") d[i] = d[i + 1] = d[i + 2] = src[i + 3];
    else if (S.channel === "normal") { d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = 200; }
    else if (S.channel === "depth") d[i] = d[i + 1] = d[i + 2] = src[i + 2];
    else d[i] = d[i + 1] = d[i + 2] = src[i + 3];
    d[i + 3] = 255;
  }
  const c = new OffscreenCanvas(W, W); c.getContext("2d").putImageData(img, 0, 0);
  x.imageSmoothingEnabled = true;
  x.drawImage(c, 0, 0, 512, 512);
  // the grid, and the 3 views the focus tree uses now
  const s = 512 / atlas.grid;
  x.strokeStyle = "rgba(255,255,255,.15)";
  for (let i = 1; i < atlas.grid; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 512); x.moveTo(0, i * s); x.lineTo(512, i * s); x.stroke(); }
  const t = world?.kitPlacements?.[0];
  if (t) {
    const sph = atlas.spheres[t.variant], cy = Math.cos(t.yaw), sy = Math.sin(t.yaw);
    const cw = new THREE.Vector3(t.x + (cy * sph.x + sy * sph.z) * t.scale, t.y + sph.y * t.scale, t.z + (cy * sph.z - sy * sph.x) * t.scale);
    const dw = camera.position.clone().sub(cw);
    const d = new THREE.Vector3(cy * dw.x - sy * dw.z, dw.y, sy * dw.x + cy * dw.z).normalize();
    const tr = K.octa.triangle(d, atlas.grid, atlas.full);
    tr.cells.forEach(([gx, gy], i) => { x.strokeStyle = ["#ff4040", "#40ff40", "#4080ff"][i]; x.lineWidth = 2; x.strokeRect(gx * s + 1, gy * s + 1, s - 2, s - 2); x.fillStyle = x.strokeStyle; x.font = "10px monospace"; x.fillText(tr.w[i].toFixed(2), gx * s + 3, gy * s + 11); });
  }
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Impostor Lab" });
const fs = ui.addFolder("Scene");
fs.add(S, "scene", Object.keys(SCENES)).name("scene").onChange((v) => buildScene(v));
fs.add(S, "mode", ["kit", "today", "mesh", "none"]).name("far trees").onChange(applyMode).listen();
fs.add(S, "distance", 300, 1500, 10).name("single: distance (m)").onChange(() => { if (S.scene === "single") buildScene("single"); });
fs.add(S, "post").name("post chain + haze");
fs.add(S, "time", Object.keys(PRESETS)).name("time").onChange((v) => { lighting.apply(v); pipe.look(v); });
fs.add({ go: resetView }, "go").name("reset view");
const fk = ui.addFolder("Kit material");
fk.add(S, "blend", ["bary3", "dominant"]).onChange(buildKitMats);
fk.add(S, "parallax", [0, 1, 2]).name("parallax steps").onChange(buildKitMats);
fk.add(S, "pdo").name("depth out (PDO)").onChange(buildKitMats);
fk.add(S, "alpha", ["a2c-ramp", "a2c-sharp", "cutout"]).onChange(buildKitMats);
fk.add(S, "gain", 0.5, 8, 0.1).name("a2c ramp gain").onChange((v) => { view.gain.value = v; });
fk.add(S, "card", ["octagon", "quad"]).onChange(buildKitMats);
fk.add(S, "noise", ["object", "screen"]).name("hand-over noise").onChange(applyMode);
fk.add(S, "far", ["ground", "none"]).name("far fade").onChange(buildKitMats);
fk.add(S, "lodBias", -2, 2, 0.1).name("mip bias").onChange((v) => { view.lodBias.value = v; });
fk.add(S, "colourDepth", ["equal", "lequal"]).name("colour pass depth").onChange(buildKitMats);
fk.add(S, "ringSplit", 0, 1500, 10).name("far ring from (m, 0 = off)").onChange(buildKitMats);
fk.add(S, "sortKit").name("front-to-back order").onChange(rebuildKitField);
fk.add(S, "farParallax", [0, 1]).name("far ring parallax").onChange(buildKitMats);
fk.add(S, "farBlend", ["bary3", "dominant"]).name("far ring blend").onChange(buildKitMats);
const fd = ui.addFolder("Distances (m)");
fd.add(S, "start", 150, 900, 5).name("hand-over at").onChange(applyMode);
fd.add(S, "band", 1, 100, 1).name("hand-over band").onChange(applyMode);
fd.add(S, "end", 600, 3000, 10).name("kit far end").onChange(applyMode);
fd.add(S, "endBand", 10, 800, 10).name("kit far band").onChange(applyMode);
fd.add(S, "todayEnd", 600, 3000, 10).name("today's far end").onChange(applyMode);
const fb = ui.addFolder("Bake");
fb.add(S, "grid", [8, 12, 16]).name("views per side").onChange((v) => { S.grid = +v; });
fb.add(S, "cell", [32, 48, 64, 96]).name("cell px").onChange((v) => { S.cell = +v; });
fb.add(S, "bakeLod", [0, 2]).name("bake from LOD").onChange((v) => { S.bakeLod = +v; });
fb.add({ go: () => bakeKit() }, "go").name("re-bake the kit atlas");
fb.add(S, "bakeInfo").name("kit").listen();
fb.add(S, "todayInfo").name("today");
const fa = ui.addFolder("Atlas viewer");
fa.add(S, "atlasOn").name("show").onChange(drawAtlas);
fa.add(S, "layer", 0, 5, 1).name("variant").onChange(drawAtlas);
fa.add(S, "channel", ["albedo", "coverage", "normal", "depth", "aux"]).onChange(drawAtlas);
const fm = ui.addFolder("Jitter meter");
fm.add(S, "path", ["orbit", "strafe", "dolly", "bird"]);
fm.add(S, "frames", 8, 60, 1);
fm.add(S, "orbitDeg", 0.01, 0.5, 0.01).name("orbit deg / frame");
fm.add(S, "strafe", 0.01, 1, 0.01).name("strafe m / frame");
fm.add(S, "dolly", 0.1, 5, 0.1).name("dolly m / frame");
fm.add({ go: () => meterAB() }, "go").name("run: mesh / today / kit");
fm.add({ go: async () => { for (const p of ["orbit", "strafe", "dolly", "bird"]) await meterAB(p); } }, "go").name("run every path");
fm.add({ go: () => { const h = window.lab.lastHeat; if (h) stackHeat(h); } }, "go").name("show heat maps");
fm.add({ go: () => stripSet() }, "go").name("frame strips (mesh / today / kit)");
fm.add({ go: () => sideBySide("kit") }, "go").name("side by side: kit | mesh | diff");
fm.add({ go: () => sideBySide("today") }, "go").name("side by side: today | mesh | diff");
fm.add(S, "result").name("result").listen();
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("frame").listen();
fp.add({ go: () => bench() }, "go").name("GPU bench: none / mesh / today / kit");
fp.add(S, "bench").name("result").listen();
async function stackHeat(h) { return stackURLs(Object.values(h), "heat maps: " + Object.keys(h).join(" / ") + " (yellow = blinking, red = |d2|, blue tint = mask)"); }

/** an object URL -> data URL (to save an image from the console / devtools) */
const dataURL = (url) => fetch(url).then((r) => r.blob()).then((b) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }));
let lastShown = null;
window.lab = { dataURL, treeStats, rebuildKitField, get lastShown() { return lastShown; }, renderer, scene, camera, controls, S, H, IMP, U, view, shared, buildScene, applyMode, meter, meterAB, bench, sideBySide, stripSet, stackURLs, show, bakeKit, buildKitMats, renderFrame, get atlas() { return atlas; }, get world() { return world; }, todayBake, gpu, poseFor, startPath, endPath };

await bakeKit();
await buildScene(S.scene);
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, n = 0;
renderer.setAnimationLoop(() => {
  if (frozen) return;
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  renderFrame(dt);
  sampleGpu();
  if (++n % 15 === 1) {
    const r = renderer.info.render;
    S.stats = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    const d = camera.position.distanceTo(controls.target);
    $info.textContent = `${S.stats} · ${world ? `${world.trees} trees` : ""} · mode ${S.mode} · target ${d.toFixed(0)} m\n` +
      `kit: ${S.bakeInfo}\ntoday: ${S.todayInfo}\n${S.result}\n${S.bench !== "—" ? `GPU: ${S.bench}` : ""}`;
    if (S.atlasOn && n % 60 === 1) drawAtlas();
  }
});
addEventListener("resize", () => {});
