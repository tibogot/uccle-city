// THE TREE TEXTURES LAB (A/B): would other texture sources make the trees look better, and what do they cost? The
// same species, seed, variant and light (viewer/lighting.js + viewer/post.js), side by side as A | B | C (a split
// screen: one tree per slot, the same camera; or the three in a row), each side its own BARK source and LEAF source:
//   bark   A procedural (today: viewer/treesPlane.js planeBark / treesBeech.js beechBark), B CC0 scans (Poly Haven /
//          ambientCG, triplanar + the species' macro variation: viewer/treeTextures.js scanBark), C Megascans (slot:
//          not available locally; Fab Standard License, lab only)
//   leaves A procedural mask (today), B a spray baked in Blender from MODELLED leaves (tools/blender/leafAtlas.py),
//          C the same spray of CC0 SCANNED leaves (ambientCG), D Megascans (slot)
// Every option goes through the whole chain (viewer/treesStylized.js makeSpecies: LODs, morph, depth pre-pass,
// shadows, and the impostors RE-BAKED from the textured tree). Camera presets at 2 m (bark), 15, 40, 120 and 400 m
// (impostor), a turntable, day / golden / night; the cost of each option: GPU ms A/B alternated in one page (5 rounds,
// the spread) on a row of 50 trees and on the 4,552-tree LiDAR forest patch, texture memory, download size; and a pop
// meter over the LOD walk (2 -> 1200 m) per side. docs/TREES.md "Textures A/B". Panel: viewer/panelUI.js.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { vec3, mix, positionWorld, mx_noise_float, smoothstep, uniform, texture, screenUV, floor, select, sRGBTransferEOTF } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { makeSpecies, STREET, setTreeRenderer, setTreeLighting } from "../viewer/treesStylized.js";
import { planeDef } from "../viewer/treesPlane.js";
import { beechDef } from "../viewer/treesBeech.js";
import { IMP } from "../viewer/impostors.js";
import { lodEye } from "../viewer/lodFade.js";
import { cobbleMaterial } from "../viewer/cobbles.js";
import { vergeMaterial } from "../viewer/roadPaint.js";
import { loadBarkScan, loadLeafAtlas, scanBark, treeTextureManifest } from "../viewer/treeTextures.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $walk = document.getElementById("walkbar");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, +(qp.get("pr") ?? 1.5)));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const TIMES = { day: "midday", golden: "golden", night: "night" };
const lighting = new Lighting(scene, renderer, TIMES[qp.get("time")] ?? "golden");
setTreeRenderer(renderer);
setTreeLighting(lighting);
const Y0 = 100, ground = () => Y0, everywhere = () => true;

// ------------------------------------------------------------------------------------------------ ground
const lawn = new THREE.Mesh(new THREE.CircleGeometry(4000, 64).rotateX(-Math.PI / 2), vergeMaterial());
lawn.position.y = Y0; lawn.receiveShadow = true; scene.add(lawn);
function quad(x0, z0, x1, z1, y, mat, uvMetres = true) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  if (uvMetres) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0)); }
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
const setts = cobbleMaterial();
quad(-14, -14, 14, 14, Y0 + 0.02, setts);                                    // a square of setts under the single tree
const litter = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
{
  const P = positionWorld, n1 = mx_noise_float(P.mul(0.08)), n2 = mx_noise_float(P.mul(0.9).add(3.0)), n3 = mx_noise_float(P.mul(7.0).add(9.0));
  const brown = mix(vec3(0.075, 0.04, 0.02), vec3(0.16, 0.085, 0.035), n2.mul(0.5).add(0.5)).mul(n3.mul(0.25).add(1));
  litter.colorNode = mix(brown, vec3(0.05, 0.08, 0.025), smoothstep(0.35, 0.6, n1).mul(0.7));
}
quad(-260, -680, 260, -160, Y0 + 0.015, litter, false);                    // the forest patch's floor (as the tree lab)
const ROW_Z = 70;
quad(-170, ROW_Z - 6, 170, ROW_Z + 6, Y0 + 0.04, new THREE.MeshStandardNodeMaterial({ color: 0x2b2c2e, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), false);
quad(-170, ROW_Z + 6, 170, ROW_Z + 10.5, Y0 + 0.14, setts);
quad(-170, ROW_Z - 10.5, 170, ROW_Z - 6, Y0 + 0.14, setts);

// the 4,552 LiDAR trees of tile M8 (UrbIS CHM peaks: height + crown), as the tree lab's forest patch
const m8 = (await fetch("../data/tiles/M8/features.json").then((r) => r.json())).trees;
const forestTrees = (() => {
  const xs = m8.map((t) => t.x), zs = m8.map((t) => t.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  return m8.map((t) => ({ x: t.x - cx, z: t.z - cz - 420, height: t.height, crown: t.crown }));
})();

// ------------------------------------------------------------------------------------------------ the options
const MAN = await treeTextureManifest();
const DEFS = {
  street: (seed) => ({ ...STREET.def, params: { ...STREET.def.params, seed } }),
  plane: (seed) => planeDef(seed),
  beech: (seed) => beechDef(seed),
};
// the bark's mean colour per species (linear): what the scans are graded to (the procedural barks' far means)
const BARK_TARGET = { plane: [0.27, 0.26, 0.19], beech: [0.175, 0.168, 0.148] };
const MEGA = "megascans";
/** per species: option label -> source (null = today's procedural; MEGA = the empty Megascans slot) */
const BARK_OPTS = {
  plane: { "A procedural": null, "B CC0 scan": ["Bark009"], "B2 CC0 scan + foot scan": ["Bark009", "bark_platanus"], "B3 CC0 scan (alt)": ["bark_platanus"], "C Megascans (slot)": MEGA },
  beech: { "A procedural": null, "B CC0 scan": ["chinese_hackberry_bark"], "B2 CC0 scan + foot scan": ["chinese_hackberry_bark", "Bark005"], "B3 CC0 scan (alt)": ["Bark005"], "C Megascans (slot)": MEGA },
  street: { "A procedural": null },
};
const LEAF_OPTS = {
  plane: { "A procedural mask": null, "B Blender (modelled)": "leaf_plane", "C CC0 (scanned leaves)": "leaf_plane_scan", "D Megascans (slot)": MEGA },
  beech: { "A procedural mask": null, "B Blender (modelled)": "leaf_beech", "C CC0 (scanned leaves)": "leaf_beech_scan", "D Megascans (slot)": MEGA },
  street: { "A procedural mask": null },
};
const BARK_LABELS = Object.keys(BARK_OPTS.plane), LEAF_LABELS = Object.keys(LEAF_OPTS.plane);
const MEGA_NOTE = "Megascans not available locally (the owner is claiming them on Fab):\nslot kept; Fab Standard License, NOT CC0: lab only";
const srcName = (v) => (v === null ? "procedural" : v === MEGA ? "Megascans (slot)" : Array.isArray(v) ? v.join(" + ") : v);

const S = {
  species: qp.get("species") ?? "plane", mode: qp.get("mode") ?? "split A | B | C", nSides: +(qp.get("sides") ?? 3), seed: +(qp.get("seed") ?? 1000),
  variant: qp.get("variant") ?? "auto", height: +(qp.get("h") ?? 18),
  sides: [
    { bark: "A procedural", leaves: "A procedural mask" },
    { bark: "B CC0 scan", leaves: "B Blender (modelled)" },
    { bark: "B2 CC0 scan + foot scan", leaves: "C CC0 (scanned leaves)" },
  ],
  turntable: false, time: qp.get("time") ?? "golden", post: true, preset: "15 m",
  show: 0, pair: "A vs B", bench: "—", perf: "", pop: "—", costs: ["", "", ""],
};
for (const [k, side] of S.sides.entries()) { const b = qp.get(`bark${k}`), l = qp.get(`leaves${k}`); if (b) side.bark = b; if (l) side.leaves = l; }

/** the source of a side's option for the current species (an option the species doesn't have falls back to A) */
const barkSrc = (side) => BARK_OPTS[S.species][side.bark] ?? null;
const leafSrc = (side) => LEAF_OPTS[S.species][side.leaves] ?? null;

const species = new Map();     // key -> { sp, texGpu, texFile, key, note }
async function getSpecies(side) {
  const b = barkSrc(side), l = leafSrc(side);
  const key = `${S.species}|${S.seed}|${srcName(b)}|${srcName(l)}`;
  if (species.has(key)) return species.get(key);
  const p = (async () => {
    const base = DEFS[S.species](S.seed);
    const def = { ...base, params: { ...base.params } };
    let texGpu = 0, texFile = 0;
    const notes = [];
    if (Array.isArray(b)) {
      const scans = await Promise.all(b.map((id) => loadBarkScan(renderer, id)));
      // (the beech's scans are warmer than a beech: graded closer to its grey)
      def.bark = scanBark({ scans, target: BARK_TARGET[S.species], species: S.species, hueK: S.species === "beech" ? 0.85 : 0.5 });
      for (const s of scans) { texGpu += s.gpuBytes; texFile += s.fileBytes; }
    } else if (b === MEGA) notes.push("bark: " + MEGA_NOTE);
    if (l && l !== MEGA) {
      const la = await loadLeafAtlas(renderer, l);
      def.params.leafAtlas = la.atlas;
      texGpu += la.gpuBytes; texFile += la.fileBytes;
    } else if (l === MEGA) notes.push("leaves: " + MEGA_NOTE);
    const sp = makeSpecies(def);
    sp.calibrate();                 // builds the trees and RE-BAKES the impostors from this (textured) tree
    return { sp, key, texGpu, texFile, note: notes.join("\n"), bark: srcName(b), leaves: srcName(l) };
  })();
  species.set(key, p);
  return p;
}
function disposeAll() { for (const p of species.values()) p.then((s) => s.sp.dispose()); species.clear(); }

// ------------------------------------------------------------------------------------------------ layouts
const holder = new THREE.Group(); scene.add(holder);
let sideFields = [];           // per side: { f (buildField), sp entry }
const variantFor = (sp, layout) => {
  const forms = S.species !== "street";
  if (S.variant !== "auto") return () => Math.min(sp.variants - 1, +S.variant);
  if (!forms) return null;
  if (layout === "forest") return (i) => sp.variantOfIndex(i) % 4;                       // plane natural / beech forest
  if (layout === "row") return S.species === "beech" ? (i) => 4 + (sp.variantOfIndex(i) % 2) : (i) => sp.variantOfIndex(i) % 4;
  return () => (S.species === "beech" ? 4 : 0);                                           // one tree: beech open-grown, plane avenue
};
function placements(layout, k) {
  if (layout === "one") {
    const x = S.mode.startsWith("row") ? (k - (S.nSides - 1) / 2) * (S.species === "street" ? 14 : 26) : 0;
    return [{ x, z: 0, height: S.height, crown: 7, turn: 0.6 }];
  }
  if (layout === "row") { const T = []; for (let i = 0; i < 25; i++) for (const s of [-1, 1]) T.push({ x: -132 + i * 11, z: ROW_Z + s * 8.2, height: S.height * (0.9 + 0.2 * ((i * 7 + (s > 0 ? 3 : 0)) % 5) / 4), crown: 7 }); return T; }
  return forestTrees;
}
let layout = "one", building = null;
async function build(lay = layout) {
  layout = lay;
  const job = (async () => {
    $info.textContent = "building (each option bakes its own impostors)…";
    const entries = await Promise.all(S.sides.slice(0, S.nSides).map((s) => getSpecies(s)));
    for (const { f } of sideFields) f.dispose();
    sideFields = entries.map((e, k) => {
      const vf = variantFor(e.sp, lay);
      const f = e.sp.buildField(placements(lay, k), ground, everywhere, vf ? { variantOf: vf } : {});
      holder.add(f.group);
      return { f, e };
    });
    applyVisibility();
    updateSlots();
  })();
  building = job;
  await job;
}
function applyVisibility() {
  sideFields.forEach(({ f }, k) => { f.group.visible = layout === "one" ? (S.mode.startsWith("row") || k === S.show) : k === S.show; });
}

// ------------------------------------------------------------------------------------------------ views
const PRESET_D = { "2 m (bark)": 2, "15 m": 15, "40 m": 40, "120 m": 120, "400 m (impostor)": 400 };
/** a camera on the sunny side (turned 0.5 rad), d metres from the tree; past 15 m a longer lens keeps the tree in the
 *  frame (the distance is what the LODs see) */
function setPreset(name) {
  S.preset = name;
  const d = PRESET_D[name];
  const sd = new THREE.Vector3(lighting.sunDir.x, 0, lighting.sunDir.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
  if (layout !== "one") build("one").then(() => setPreset(name));
  if (d <= 2) {
    controls.target.set(0, Y0 + 1.5, 0);
    camera.position.set(sd.x * (d + 0.55), Y0 + 1.6, sd.z * (d + 0.55));
    camera.fov = 50;
  } else {
    const ty = S.height * 0.5;
    controls.target.set(0, Y0 + ty, 0);
    camera.position.set(sd.x * d, Y0 + Math.min(1.7 + d * 0.05, 30), sd.z * d);
    // the frame's half height: the tree's (0.6 x its height), or the crown's half width (~0.65 x the height; a row:
    // the three trees) over the slot's aspect
    const aspect = S.mode.startsWith("row") ? innerWidth / innerHeight : innerWidth / S.nSides / innerHeight;
    const halfW = S.mode.startsWith("row") ? (S.nSides * 26) / 2 + S.height * 0.3 : S.height * 0.65;
    const halfH = Math.max(S.height * 0.6, halfW / aspect);
    camera.fov = THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan(halfH / d)), 1, 50);
  }
  camera.updateProjectionMatrix();
}
const BENCH_VIEWS = {
  row: () => { camera.position.set(-150, Y0 + 1.7, ROW_Z + 3); controls.target.set(-100, Y0 + 6, ROW_Z); camera.fov = 50; camera.updateProjectionMatrix(); },
  forest: () => { camera.position.set(0, Y0 + 60, -140); controls.target.set(0, Y0 + 10, -330); camera.fov = 50; camera.updateProjectionMatrix(); },
};

// ------------------------------------------------------------------------------------------------ slot labels
const slotEls = [0, 1, 2].map(() => { const e = document.createElement("div"); e.className = "slot"; document.body.append(e); return e; });
const splitEls = [0, 1].map(() => { const e = document.createElement("div"); e.className = "split"; document.body.append(e); return e; });
const MB = (b) => (b / 1048576).toFixed(1), KB = (b) => (b / 1024).toFixed(0);
function updateSlots() {
  const split = layout === "one" && S.mode.startsWith("split");
  sideFields.forEach(({ e }, k) => {
    const imp = e.sp.bake ? (e.sp.bake.size[0] * e.sp.bake.size[1] * 4 * 2 * 4 / 3) : 0;
    S.costs[k] = `textures ${MB(e.texGpu)} MB GPU, ${KB(e.texFile)} KB download · impostor atlas ${MB(imp)} MB (bake ${e.sp.bakeMs.toFixed(0)} ms)`;
    const el = slotEls[k];
    el.innerHTML = `<b>${"ABC"[k]}</b> ${S.species} · bark: ${e.bark} · leaves: ${e.leaves}\n${S.costs[k]}${e.note ? `\n<i>${e.note}</i>` : ""}`;
    el.style.display = layout === "one" || k === S.show ? "block" : "none";
    el.style.left = split ? `${((k + 0.5) / S.nSides) * 100}%` : (layout === "one" ? `${((k + 0.5) / S.nSides) * 100}%` : "50%");
  });
  for (let k = S.nSides; k < 3; k++) slotEls[k].style.display = "none";
  splitEls.forEach((el, i) => { el.style.display = split && i < S.nSides - 1 ? "block" : "none"; el.style.left = `${((i + 1) / S.nSides) * 100}%`; });
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Tree Textures A/B" });
const fs = ui.addFolder("Species & sides");
const rebuild = () => { for (const p of species.values()) p.then((s) => s.sp.dispose()); species.clear(); build(); };
fs.add(S, "species", ["plane", "beech", "street"]).name("species").onChange(() => { build(); });
fs.add(S, "mode", ["split A | B | C", "row (side by side)"]).name("view").onChange(() => { build("one").then(() => setPreset(S.preset)); });
fs.add(S, "nSides", [2, 3]).name("sides").onChange((v) => { S.nSides = +v; build(); });
fs.add(S, "variant", ["auto", "0", "1", "2", "3", "4", "5"]).name("variant").onChange(() => build());
fs.add(S, "seed", 1, 99999, 1).name("seed").onChange(rebuild);
fs.add(S, "height", 6, 34, 0.5).name("height (m)").onChange(() => build());
for (let k = 0; k < 3; k++) {
  const f = ui.addFolder(`Side ${"ABC"[k]}`);
  f.add(S.sides[k], "bark", BARK_LABELS).name("bark").onChange(() => build()).listen();
  f.add(S.sides[k], "leaves", LEAF_LABELS).name("leaves").onChange(() => build()).listen();
  f.add(S.costs, String(k)).name("cost").listen();
  if (k) f.close();
}
const fv = ui.addFolder("View & light");
for (const name of Object.keys(PRESET_D)) fv.add({ f: () => setPreset(name) }, "f").name(`camera: ${name}`);
fv.add(S, "turntable").onChange((v) => { controls.autoRotate = v; controls.autoRotateSpeed = 1.5; });
fv.add(S, "time", Object.keys(TIMES)).name("time of day").onChange((v) => { lighting.apply(TIMES[v]); lighting.hourOverride = null; pipe.look(TIMES[v]); });
fv.add(S, "post").name("post effects");
const fc = ui.addFolder("Cost (GPU A/B, 5 rounds)");
fc.add(S, "pair", ["A vs B", "A vs C", "B vs C"]).name("pair");
fc.add({ f: () => benchAB("row") }, "f").name("GPU A/B: row of 50");
fc.add({ f: () => benchAB("forest") }, "f").name("GPU A/B: forest patch (4,552)");
fc.add({ f: () => popAll() }, "f").name("pop meter: LOD walk 2 → 1200 m, each side");
fc.add(S, "perf").name("frame").listen();
fc.add(S, "bench").name("result").listen();
fc.add(S, "pop").name("pop result").listen();

// ------------------------------------------------------------------------------------------------ perf
const gpu = { avg: 0, pending: false, samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => {
    if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function alternate(a, b, { rounds = 5, settle = 1.0, seconds = 2.5 } = {}) {
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) for (const [f, out] of [[a, A], [b, B]]) { f(); await sleep(settle * 1000); gpu.samples.length = 0; await sleep(seconds * 1000); out.push(median(gpu.samples)); }
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length, d = B.map((v, i) => v - A[i]);
  return { A: A.map((v) => +v.toFixed(2)), B: B.map((v) => +v.toFixed(2)), meanA: +mean(A).toFixed(2), meanB: +mean(B).toFixed(2), diff: +mean(d).toFixed(2), min: +Math.min(...d).toFixed(2), max: +Math.max(...d).toFixed(2) };
}
const results = [];
/** GPU A/B: the pair's two sides built on the layout (row of 50 / forest), shown in turn, full frame. */
async function benchAB(lay, pair = S.pair) {
  const [i, j] = pair.split(" vs ").map((c) => "ABC".indexOf(c));
  S.bench = "running…";
  const prevMode = S.mode, prevN = S.nSides;
  await build(lay);
  BENCH_VIEWS[lay]();
  const show = (k) => () => { S.show = k; applyVisibility(); };
  const r = await alternate(show(i), show(j));
  const tris = renderer.info.render.triangles;
  const rec = { layout: lay, species: S.species, pair, a: { ...S.sides[i] }, b: { ...S.sides[j] }, ...r, tris, texA: sideFields[i].e.texGpu, texB: sideFields[j].e.texGpu };
  results.push(rec); console.log("[tree textures] bench", rec);
  S.bench = `${lay} ${pair}: ${r.diff >= 0 ? "+" : ""}${r.diff} ms (spread ${r.min}..${r.max}; ${r.meanA} vs ${r.meanB})`;
  S.show = 0; S.mode = prevMode; S.nSides = prevN;
  return rec;
}

/** The pop meter (as the tree lab, docs/SMOOTH_LOD.md §5) for ONE side, full frame: the camera stays put (looking at the
 *  tree from 60 m), the LOD eye walks from d0 to d1 in `steps` log steps; at each step the frame is grabbed (480 x 270)
 *  and the share of pixels changing by > 40/255 is recorded; a "jump" is a step minus the mean of its neighbours. */
async function popWalk(k, { steps = 60, d0 = 2, d1 = 1200, settle = 350 } = {}) {
  if (layout !== "one") await build("one");
  S.show = k; walk.solo = k; applyVisibility();
  const c = document.createElement("canvas"); c.width = 480; c.height = 270;
  const g = c.getContext("2d", { willReadFrequently: true });
  const grab = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => { g.drawImage(renderer.domElement, 0, 0, 480, 270); r(g.getImageData(0, 0, 480, 270).data); })));
  const sd = new THREE.Vector3(lighting.sunDir.x, 0, lighting.sunDir.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
  controls.target.set(0, Y0 + S.height * 0.5, 0); camera.position.set(sd.x * 45, Y0 + 4, sd.z * 45); camera.fov = 40; camera.updateProjectionMatrix();
  walk.on = true;
  let prev = null; const out = [];
  for (let i = 0; i <= steps; i++) {
    const d = d0 * Math.pow(d1 / d0, i / steps);
    walk.eye.set(sd.x * d, Y0 + Math.max(1.7, Math.min(4, d)), sd.z * d);
    $walk.style.display = "block"; $walk.textContent = `LOD walk, side ${"ABC"[k]}: eye at ${d.toFixed(0)} m`;
    await sleep(settle);
    const px = await grab();
    if (prev) { let n = 0; for (let q = 0; q < px.length; q += 4) if (Math.abs(px[q] - prev[q]) + Math.abs(px[q + 1] - prev[q + 1]) + Math.abs(px[q + 2] - prev[q + 2]) > 120) n++; out.push([+d.toFixed(1), +(100 * n / (480 * 270)).toFixed(3)]); }
    prev = px;
  }
  walk.on = false; walk.solo = -1; $walk.style.display = "none"; S.show = 0; applyVisibility();
  const jumps = out.map(([d, v], i) => [d, +(v - ((out[i - 1]?.[1] ?? v) + (out[i + 1]?.[1] ?? v)) / 2).toFixed(3)]);
  const worst = jumps.reduce((a, b) => (b[1] > a[1] ? b : a), [0, -1]);
  const maxStep = out.reduce((a, b) => (b[1] > a[1] ? b : a), [0, -1]);
  return { side: "ABC"[k], sides: { ...S.sides[k] }, steps: out, worstJump: worst, maxStep, over15: jumps.filter((j) => j[1] > 1.5).length };
}
async function popAll() {
  S.pop = "running…";
  const rs = [];
  for (let k = 0; k < S.nSides; k++) rs.push(await popWalk(k));
  S.pop = rs.map((r) => `${r.side}: worst jump ${r.worstJump[1]} % at ${r.worstJump[0]} m, max step ${r.maxStep[1]} %`).join(" · ");
  console.log("[tree textures] pop", rs);
  setPreset(S.preset);
  return rs;
}

// ------------------------------------------------------------------------------------------------ loop
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(TIMES[S.time] ?? "golden");
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
await build("one");
setPreset(qp.get("preset") ?? S.preset);
if (qp.get("ui") === "0") { ui.domElement.style.display = "none"; $info.style.display = "none"; }   // (screenshots)

const walk = { on: false, eye: new THREE.Vector3(), solo: -1 };
// the split screen's per-slot targets (the post chain's output: tone-mapped, display-encoded) and the quad that shows them
const dbs = new THREE.Vector2();
const slotRT = [0, 1, 2].map(() => { const rt = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType }); return rt; });
const slotN = uniform(3);
const blitMat = new THREE.MeshBasicNodeMaterial();
{
  const k = floor(screenUV.x.mul(slotN));
  const t0 = texture(slotRT[0].texture, screenUV), t1 = texture(slotRT[1].texture, screenUV), t2 = texture(slotRT[2].texture, screenUV);
  // (the post chain wrote display-encoded colour into the target; the canvas output encodes again: decode first)
  blitMat.colorNode = sRGBTransferEOTF(select(k.lessThan(0.5), t0, select(k.lessThan(1.5), t1, t2)).rgb);
  blitMat.toneMapped = false; blitMat.depthTest = false; blitMat.depthWrite = false;
}
const blit = new THREE.QuadMesh(blitMat);
let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const frame = (dt) => {
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
};
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  controls.update();
  const eye = walk.on ? walk.eye : camera.position;
  lodEye.value.copy(eye);
  for (const { f } of sideFields) f.update(eye);
  lighting.update(eye.y, Y0, controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380), dt);
  const split = layout === "one" && S.mode.startsWith("split") && !walk.on && sideFields.length > 1;
  if (split) {
    // one full render (scene + post) per slot into its own target (the same camera, offset so its centre sits in the
    // slot), only that side's tree; then one quad puts slot k of target k on the screen (a clear of the canvas would
    // wipe the other slots: no scissor)
    const W = innerWidth, H = innerHeight, n = sideFields.length, w = W / n;
    renderer.getDrawingBufferSize(dbs);
    for (let k = 0; k < n; k++) {
      if (slotRT[k].width !== dbs.x || slotRT[k].height !== dbs.y) slotRT[k].setSize(dbs.x, dbs.y);
      sideFields.forEach(({ f }, j) => { f.group.visible = j === k; });
      camera.setViewOffset(w, H, -k * w, 0, W, H);
      renderer.setRenderTarget(slotRT[k]);
      frame(k === 0 ? dt : 0);
    }
    renderer.setRenderTarget(null);
    slotN.value = n;
    blit.render(renderer);
    camera.clearViewOffset(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  } else frame(dt);
  sampleGpu();
  if (++frames % 15 === 1) {
    const r = renderer.info.render;
    S.perf = `${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms${split ? ` (${sideFields.length} renders)` : ""} · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris`;
    $info.textContent = [
      `${S.species} · seed ${S.seed} · ${layout === "one" ? S.mode : layout} · camera ${S.preset} (${camera.position.distanceTo(new THREE.Vector3(0, camera.position.y, 0)).toFixed(0)} m) · ${S.time}`,
      ...sideFields.map(({ e }, k) => `${"ABC"[k]}: bark ${e.bark}, leaves ${e.leaves} · ${S.costs[k]}`),
      `perf: ${S.perf}`, `bench: ${S.bench}`, `pop: ${S.pop}`,
    ].join("\n");
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); updateSlots(); });
window.lab = { ui, S, renderer, scene, camera, controls, lighting, pipe, build, setPreset, benchAB, popWalk, popAll, results, gpu, species, get sideFields() { return sideFields; }, IMP, MAN, PRESETS, alternate };
