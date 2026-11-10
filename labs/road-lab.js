// THE ROAD LAB (docs/ROADS_V2_RESEARCH.md §7): ten real Uccle junctions built by the city's own road stage
// (viewer/roadBuild.js, on the main thread here) over the 2024 UrbIS orthophoto (CC0, 25 cm when data/raw/ortho is
// on disk, else the tiles' 1 m copy). Overlays: the MEASURED paint (markings.json: Brussels Mobility crossing polygons,
// UrbIS Topo zebra edges / stop / give-way / lines, OSM crossing and control nodes) against OURS (what the road stage
// paints, viewer/streets/inventory.js), the engine's lane graph, and the Road Checker's findings
// (tools/road_audit -> docs/roads/audit/<before|after>/<T>.json) as markers, listed in the panel (click = fly there).
// Before / after: paint v1 (the engine's own rules, on the network as it was: labs/data/roads-v1) vs v2 (phase 1).
// Our own panel (viewer/panelUI.js). window.lab: go(j, paint, view) for scripted screenshots.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, uniform, float, vec3, uv, positionWorld, mix, smoothstep } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting } from "../viewer/lighting.js";
import { Heightmap } from "../viewer/heightmap.js";
import { buildRoadData } from "../viewer/roadBuild.js";
import { roofGrid, onRoof } from "../viewer/tileData.js";
import { paintInventory } from "../viewer/streets/inventory.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial, paintMaterial } from "../viewer/roadPaint.js";
import { cobbleMaterial, pitMaterial } from "../viewer/cobbles.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $note = document.getElementById("note"), $city = document.getElementById("city");
const DATA = new URL("../data/tiles/", import.meta.url);

// ------------------------------------------------------------------------------------------------ the ten junctions
// (tile, x, z from docs/ROADS_V2_RESEARCH.md §7; "photo" = what the 2024 orthophoto shows, looked at in this lab)
const J = [
  { n: 1, name: "Place de Saint-Job", tile: "I6", x: 1086, z: 519, why: "5 arms, OSM signals, tram 92, the raised square, a node merged by refine" },
  { n: 2, name: "Av. J. et P. Carsoel railway bridge", tile: "H6", x: 901, z: 526, why: "road bridge (LVL +1) next to Saint-Job, with tram (levels: phase 4)" },
  { n: 3, name: "Rond-point Churchill", tile: "G2", x: 313, z: -1434, why: "8-arm roundabout, tram through the ring, cycle lanes on Churchill" },
  { n: 4, name: "Square Georges Marlow", tile: "E4", x: -641, z: -313, why: "roundabout with trams and one-way arms; BM inventory present" },
  { n: 5, name: "Ch. d'Alsemberg / Av. Brugmann / Rue de Stalle", tile: "E4", x: -919, z: -142, why: "the sharp Y; signals, trams, shared cycle lanes (sharrows), BM inventory, measured stop lines" },
  { n: 6, name: "Ch. d'Alsemberg / Vanderkindere / Coghen / Sept Bonniers / Van Goidtsnoven", tile: "E1", x: -746, z: -1616, why: "6-arm signalised junction, tram, a one-way arm" },
  { n: 7, name: "Ch. de Waterloo / Av. Churchill / Av. de la Lisière", tile: "I2", x: 1326, z: -1453, why: "wide avenue with a central tram site, painted cycle lanes, signals" },
  { n: 8, name: "Av. du Fort-Jaco / Av. du Feuillage", tile: "J7", x: 1941, z: 1101, why: "plain residential priorité-de-droite: the right answer is NO paint" },
  { n: 9, name: "Rue des Bigarreaux underpass", tile: "D8", x: -1106, z: 1638, why: "road under the railway (levels: phase 4)" },
  { n: 10, name: "Ch. de Waterloo railway bridge", tile: "J5", x: 1731, z: 317, why: "main-road bridge with approach ramps (levels: phase 4)" },
];
const PHOTO = await fetch("./data/road-lab-notes.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const R = 130;                     // m: scene radius around the junction

// ------------------------------------------------------------------------------------------------ renderer, scene
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const lighting = new Lighting(scene, renderer, qp.get("time") || "midday");
await lighting.attach?.(camera);
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const manifest = await fetch(new URL("manifest.json", DATA)).then((r) => r.json());
const entryOf = (T) => manifest.tiles.find((t) => t.name === T);
const tilesNear = (x, z, r) => manifest.tiles.filter((t) => {
  if (t.status === "missing") return false;
  const [x0, x1] = t.bounds.x, [z0, z1] = t.bounds.z;
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1)) <= r;
}).map((t) => t.name);

// ------------------------------------------------------------------------------------------------ one tile's roads
const cache = new Map();
const getJ = async (p, bin) => { const r = await fetch(new URL(p, DATA)); if (!r.ok) throw new Error(`${p}: ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
async function tileRoads(T, paint) {
  const key = `${T}|${paint}`;
  if (cache.has(key)) return cache.get(key);
  const e = entryOf(T), F = e.files, b = { x0: e.bounds.x[0], x1: e.bounds.x[1], z0: e.bounds.z[0], z1: e.bounds.z[1] };
  const t0 = performance.now();
  const v1Roads = paint === "v1" ? await fetch(`./data/roads-v1/${T}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
  const [hdr, buf, roads, surf, feats, bDoc, markings, ov] = await Promise.all([getJ(F.terrainHeader), getJ(F.terrain, true),
    v1Roads ? Promise.resolve(v1Roads) : getJ(F.roads), F.surfaces ? getJ(F.surfaces) : null, getJ(F.features), getJ(F.buildings),
    F.markings ? getJ(F.markings) : null, fetch("../data/overrides.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
  for (const r of roads.roads) { const s = ov.roadSurface?.[r.id]; if (s) (r.meta ??= {}).surface = s; }
  const hm = new Heightmap(hdr, buf);
  const roofs = roofGrid(bDoc, b);
  const rd = buildRoadData({ roads, surf, markings: paint === "v2" ? markings : null, hm, bounds: b, paint, trees: feats.trees, keep: true, onBuilding: (x, z) => onRoof(roofs, x, z) });
  const findings = await fetch(`../docs/roads/audit/${paint === "v1" ? "before" : "after"}/${T}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const res = { T, e, b, hm, rd, roads, surf, markings, inv: paintInventory(rd), findings, ms: Math.round(performance.now() - t0), v1Roads: !!v1Roads };
  cache.set(key, res);
  return res;
}

// ------------------------------------------------------------------------------------------------ meshes
const shared = new Map();
const sharedMat = (k, make) => { if (!shared.has(k)) shared.set(k, make()); return shared.get(k); };
function roadMeshes(rd) {
  const mats = { asphalt: asphaltMaterial(rd.atlas), concrete: sharedMat("concrete", () => concreteMaterial({ framed: true })), grass: sharedMat("verge", vergeMaterial),
    square: sharedMat("cobbles", cobbleMaterial), pits: sharedMat("pits", pitMaterial), paint: sharedMat("paint", paintMaterial) };
  const out = [];
  for (const [name, part] of Object.entries(rd.parts)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [k, a] of Object.entries(part.attributes || {})) g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize));
    if (part.aSurf) g.setAttribute("aSurf", new THREE.BufferAttribute(part.aSurf, 1));
    g.setIndex(new THREE.BufferAttribute(part.index, 1));
    const m = new THREE.Mesh(g, mats[name]);
    m.receiveShadow = true;
    m.name = `roads-${name}`;
    out.push(m);
  }
  return out;
}
const orthoTex = new Map();
async function orthoOf(T) {
  if (orthoTex.has(T)) return orthoTex.get(T);
  const tl = new THREE.TextureLoader();
  const t = (await tl.loadAsync(`../data/raw/ortho/${T}.jpg`).catch(() => null)) ?? (await tl.loadAsync(`../data/tiles/${T}/ortho.jpg`).catch(() => null));
  if (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
  orthoTex.set(T, t);
  return t;
}
const S = { j: Math.max(1, Math.min(10, +(qp.get("j") || 1))), paint: qp.get("paint") === "v1" ? "v1" : "v2", view: qp.get("view") || "oblique",
  groundPhoto: true, photoOver: +(qp.get("photo") || 0), measured: qp.get("measured") !== "0", ours: qp.get("ours") !== "0", findings: qp.get("findings") !== "0",
  lanes: qp.get("lanes") === "1", roads: true };
const uPhoto = uniform(S.photoOver);
/** the terrain around the junction (carved by the road stage) with the orthophoto; plus a copy over the roads (photo) */
function groundMeshes(t, tex, cx, cz) {
  const { hm, b } = t, h = hm.h;
  const x0 = Math.max(b.x0, cx - R), x1 = Math.min(b.x1, cx + R), z0 = Math.max(b.z0, cz - R), z1 = Math.min(b.z1, cz + R);
  if (x1 <= x0 || z1 <= z0) return [];
  const step = 1, nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
  const pos = new Float32Array(nx * nz * 3), pos2 = new Float32Array(nx * nz * 3), uvs = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = Math.min(x1, x0 + i * step), z = Math.min(z1, z0 + j * step), k = j * nx + i;
    const y = hm.surface(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    pos2[k * 3] = x; pos2[k * 3 + 1] = Math.max(y, hm.ground(x, z)) + 0.25; pos2[k * 3 + 2] = z;
    uvs[k * 2] = (x - b.x0) / (b.x1 - b.x0); uvs[k * 2 + 1] = 1 - (z - b.z0) / (b.z1 - b.z0);
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, c = a + nx; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const mk = (p) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const gm = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  gm.colorNode = tex ? texture(tex, uv()).rgb.mul(0.9) : vec3(0.3, 0.32, 0.28);
  const ground = new THREE.Mesh(mk(pos), gm);
  ground.receiveShadow = true; ground.name = "ground";
  const om = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  om.colorNode = tex ? texture(tex, uv()).rgb : vec3(0.5);
  om.opacityNode = uPhoto;
  const over = new THREE.Mesh(mk(pos2), om);
  over.renderOrder = 15; over.name = "photo-over";
  return [ground, over];
}

// ------------------------------------------------------------------------------------------------ overlays
const COL = { bm: 0x00e5ff, topo: 0xff40ff, topoStop: 0xff2020, topoGive: 0xffa000, topoLine: 0x40ff40, bmInv: 0xffe060, osmX: 0x40a0ff, osmCtl: 0xff8080,
  ours: 0xff8c00, oursStop: 0xffff00, oursSym: 0xc0ff40, lanes: 0x3070ff, error: 0xff2a2a, warn: 0xffa500, review: 0xb060ff };
function lineMesh(segs, order = 20) {
  if (!segs.length) return null;
  const pos = new Float32Array(segs.length * 6), col = new Float32Array(segs.length * 6), c = new THREE.Color();
  segs.forEach(([a, b, color], i) => { pos.set(a, i * 6); pos.set(b, i * 6 + 3); c.set(color); col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6); });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
  m.renderOrder = order;
  return m;
}
function overlays(tiles, cx, cz) {
  const t0 = tiles[0];
  const yAt = (x, z) => { const t = tiles.find((q) => x >= q.b.x0 && x < q.b.x1 && z >= q.b.z0 && z < q.b.z1) || t0; return t.hm.ground(x, z) + 0.3; };
  const P = (p) => [p[0], yAt(p[0], p[1]), p[1]];
  const near = (x, z) => Math.hypot(x - cx, z - cz) < R;
  const ring = (pts, color, out) => { for (let i = 0; i < pts.length; i++) out.push([P(pts[i]), P(pts[(i + 1) % pts.length]), color]); };
  const path = (pts, color, out) => { for (let i = 1; i < pts.length; i++) out.push([P(pts[i - 1]), P(pts[i]), color]); };
  const cross = (x, z, r, color, out) => { out.push([P([x - r, z - r]), P([x + r, z + r]), color], [P([x - r, z + r]), P([x + r, z - r]), color]); };
  const meas = [], ours = [], lanes = [];
  const seen = new Set();
  for (const t of tiles) {
    const m = t.markings;
    if (!m) continue;
    for (const c of m.crossings) { if (seen.has(c.id) || !near(...c.c)) continue; seen.add(c.id); if (c.poly) ring(c.poly, c.src === "bm" ? COL.bm : COL.topo, meas); else cross(c.c[0], c.c[1], 1.2, COL.osmX, meas); }
    for (const s of m.stops) { if (seen.has(s.id) || !s.line.some((p) => near(...p))) continue; seen.add(s.id); path(s.line, s.kind === "stop" ? COL.topoStop : COL.topoGive, meas); }
    for (const l of m.lines) { if (seen.has(l.id) || !l.line.some((p) => near(...p))) continue; seen.add(l.id); path(l.line, COL.topoLine, meas); }
    for (const l of m.bm.lines) { if (seen.has(l.id) || !l.line.some((p) => near(...p))) continue; seen.add(l.id); path(l.line, COL.bmInv, meas); }
    for (const p of m.bm.polys) { if (seen.has(p.id) || !p.poly.some((q) => near(...q))) continue; seen.add(p.id); ring(p.poly, COL.bmInv, meas); }
    for (const c of m.osm.control) { if (seen.has(c.id) || !near(c.x, c.z)) continue; seen.add(c.id); cross(c.x, c.z, 0.8, COL.osmCtl, meas); }
  }
  for (const t of tiles) {
    const inT = (x, z) => x >= t.b.x0 && x < t.b.x1 && z >= t.b.z0 && z < t.b.z1;
    for (const c of t.inv.crossings) if (inT(...c.c) && near(...c.c) && c.poly) ring(c.poly, COL.ours, ours);
    for (const s of t.inv.stops) { const m = [(s.line[0][0] + s.line[1][0]) / 2, (s.line[0][1] + s.line[1][1]) / 2]; if (inT(...m) && near(...m)) path(s.line, COL.oursStop, ours); }
    for (const s of t.inv.symbols) if (inT(s.x, s.z) && near(s.x, s.z)) cross(s.x, s.z, 0.6, COL.oursSym, ours);
    for (const p of t.rd.net.graph.paths) {
      const pts = p.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]).filter(([x, z]) => inT(x, z) && near(x, z));
      path(pts, COL.lanes, lanes);
    }
  }
  // checker findings: a pole + a cross on top, coloured by level
  const marks = [], list = [];
  for (const t of tiles) for (const f of t.findings?.findings || []) {
    if (!near(f.x, f.z) || f.check === "C6" || f.check === "C10") continue;
    const y = yAt(f.x, f.z), col = COL[f.level] ?? COL.warn;
    marks.push([[f.x, y, f.z], [f.x, y + 3, f.z], col], [[f.x - 0.6, y + 3, f.z], [f.x + 0.6, y + 3, f.z], col], [[f.x, y + 3, f.z - 0.6], [f.x, y + 3, f.z + 0.6], col]);
    list.push({ ...f, d: Math.hypot(f.x - cx, f.z - cz) });
  }
  list.sort((a, b) => a.d - b.d);
  return { meas: lineMesh(meas, 21), ours: lineMesh(ours, 22), lanes: lineMesh(lanes, 20), marks: lineMesh(marks, 23), list };
}

// ------------------------------------------------------------------------------------------------ the scene
let root = null, cur = null;
const groups = {};
async function load(j, paint) {
  const jn = J[j - 1];
  $info.textContent = `building ${jn.name} (${paint}) …`;
  const names = tilesNear(jn.x, jn.z, 90);
  const tiles = [];
  for (const T of names) tiles.push(await tileRoads(T, paint));
  if (root) { scene.remove(root); root.traverse((o) => o.geometry?.dispose?.()); }
  root = new THREE.Group();
  for (const k of ["roads", "ground", "photo", "meas", "ours", "lanes", "marks"]) { groups[k] = new THREE.Group(); root.add(groups[k]); }
  for (const t of tiles) {
    for (const m of roadMeshes(t.rd)) groups.roads.add(m);
    const [g, o] = groundMeshes(t, await orthoOf(t.T), jn.x, jn.z);
    if (g) { groups.ground.add(g); groups.photo.add(o); }
  }
  const ov = overlays(tiles, jn.x, jn.z);
  for (const k of ["meas", "ours", "lanes", "marks"]) if (ov[k]) groups[k].add(ov[k]);
  scene.add(root);
  cur = { j, paint, jn, tiles, list: ov.list, y: tiles[0].hm.ground(jn.x, jn.z) };
  applyLayers();
  buildFindingsUI();
  writeNote();
  $city.href = `../viewer/index.html?tile=${jn.tile}&at=${jn.x},${jn.z}${paint === "v1" ? "&paint=v1" : ""}`;
  return cur;
}
function applyLayers() {
  if (!root) return;
  groups.roads.visible = S.roads; groups.ground.visible = S.groundPhoto; groups.photo.visible = S.photoOver > 0;
  groups.meas.visible = S.measured; groups.ours.visible = S.ours; groups.lanes.visible = S.lanes; groups.marks.visible = S.findings;
  uPhoto.value = S.photoOver;
}
function setView(v, p = null) {
  const { jn, y } = cur;
  const c = new THREE.Vector3(jn.x, y, jn.z);
  controls.target.copy(p ? new THREE.Vector3(p[0], y, p[1]) : c);
  const t = controls.target;
  if (v === "plan") camera.position.set(t.x, t.y + (p ? 40 : 95), t.z + 0.01);
  else if (v === "street") camera.position.set(t.x - 4, t.y + 1.7, t.z + 26);
  else camera.position.set(t.x + 38, t.y + 42, t.z + 52);
  if (v === "plan") camera.up.set(0, 0, -1); else camera.up.set(0, 1, 0);
  controls.update();
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Road Lab" });
const names = J.map((q) => `${q.n} ${q.name}`);
const sel = { junction: names[S.j - 1], paint: S.paint === "v1" ? "v1 (before)" : "v2 (after)" };
ui.add(sel, "junction", names).onChange(async (v) => { S.j = names.indexOf(v) + 1; await load(S.j, S.paint); setView(S.view); });
ui.add(sel, "paint", ["v2 (after)", "v1 (before)"]).name("paint").onChange(async (v) => { S.paint = v.startsWith("v1") ? "v1" : "v2"; const tgt = controls.target.clone(), pos = camera.position.clone(); await load(S.j, S.paint); controls.target.copy(tgt); camera.position.copy(pos); controls.update(); });
const fv = ui.addFolder("View");
fv.add({ plan: () => { S.view = "plan"; setView("plan"); } }, "plan").name("plan (top down)");
fv.add({ obl: () => { S.view = "oblique"; setView("oblique"); } }, "obl").name("oblique");
fv.add({ st: () => { S.view = "street"; setView("street"); } }, "st").name("street level");
const fl = ui.addFolder("Layers");
fl.add(S, "roads").name("roads").onChange(applyLayers);
fl.add(S, "groundPhoto").name("orthophoto ground").onChange(applyLayers);
fl.add(S, "photoOver", 0, 1, 0.05).name("photo over roads").onChange(applyLayers);
fl.add(S, "measured").name("measured paint").onChange(applyLayers);
fl.add(S, "ours").name("our paint").onChange(applyLayers);
fl.add(S, "findings").name("checker findings").onChange(applyLayers);
fl.add(S, "lanes").name("engine lane graph").onChange(applyLayers);
const stats = { draws: "", tris: "", gpu: "", build: "" };
const fs = ui.addFolder("Stats");
fs.add(stats, "gpu").name("GPU ms").listen(); fs.add(stats, "draws").name("draw calls").listen(); fs.add(stats, "tris").name("triangles").listen(); fs.add(stats, "build").name("road stage").listen();
let ff = null;
function buildFindingsUI() {
  ff?.el.remove();
  ff = ui.addFolder(`Findings (${cur.list.length} within ${R} m)`);
  for (const f of cur.list.slice(0, 40)) {
    ff.add({ go: () => { setView("plan", [f.x, f.z]); } }, "go").name(`${f.level === "error" ? "●" : "○"} ${f.check} ${f.msg}`.slice(0, 80));
  }
  if (!cur.list.length) ff.add({ none: () => {} }, "none").name(cur.tiles.some((t) => t.findings) ? "no findings here" : "no checker report for this tile");
}
function writeNote() {
  const { jn, tiles, paint } = cur;
  const inv = { crossings: {}, stops: {} };
  for (const t of tiles) {
    const inT = (x, z) => x >= t.b.x0 && x < t.b.x1 && z >= t.b.z0 && z < t.b.z1;
    for (const c of t.inv.crossings) if (inT(...c.c) && Math.hypot(c.c[0] - jn.x, c.c[1] - jn.z) < R) inv.crossings[c.src] = (inv.crossings[c.src] || 0) + 1;
    for (const s of t.inv.stops) { const m = s.line[0]; if (inT(...m) && Math.hypot(m[0] - jn.x, m[1] - jn.z) < R) inv.stops[s.src] = (inv.stops[s.src] || 0) + 1; }
  }
  const fmt = (o) => Object.entries(o).map(([k, v]) => `${v} ${k}`).join(", ") || "none";
  const byCheck = {};
  for (const f of cur.list) if (f.level === "error") byCheck[f.check] = (byCheck[f.check] || 0) + 1;
  $note.innerHTML = `<b>${jn.n}. ${jn.name}</b> (${jn.tile}, ${jn.x}, ${jn.z}) · paint <b>${paint}</b><br>${jn.why}.<br>` +
    (PHOTO[jn.n] ? `<i>Photo:</i> ${PHOTO[jn.n]}<br>` : "") +
    `Within ${R} m, ours: crossings ${fmt(inv.crossings)}; stop / give-way ${fmt(inv.stops)}.<br>Checker errors here: ${fmt(byCheck)}.` +
    `<div id="legend"><span style="background:#00e5ff"></span>BM crossing<span style="background:#ff40ff"></span>Topo crossing<span style="background:#40a0ff"></span>OSM crossing<br>` +
    `<span style="background:#ff2020"></span>Topo stop<span style="background:#ffa000"></span>Topo give-way<span style="background:#40ff40"></span>Topo line<span style="background:#ffe060"></span>BM inventory<br>` +
    `<span style="background:#ff8c00"></span>our crossing<span style="background:#ffff00"></span>our stop line<span style="background:#ff2a2a"></span>error<span style="background:#ffa500"></span>warning</div>`;
  const ms = tiles.map((t) => `${t.T} ${t.ms} ms${t.v1Roads ? " (v1 network)" : ""}`).join(", ");
  stats.build = ms;
}

// ------------------------------------------------------------------------------------------------ loop
let gpuMs = 0, gpuPending = false;
renderer.setAnimationLoop(() => {
  controls.update();
  lighting.update?.(camera.position.y, cur?.y ?? 0, controls.target, THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 1.2, 60, 300));
  renderer.render(scene, camera);
  stats.draws = renderer.info.render.drawCalls; stats.tris = renderer.info.render.triangles;
  if (renderer.backend.trackTimestamp && !gpuPending) {
    gpuPending = true;
    renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) gpuMs = gpuMs ? gpuMs * 0.9 + ms * 0.1 : ms; gpuPending = false; }).catch(() => { gpuPending = false; });
  }
  stats.gpu = gpuMs.toFixed(2);
  if (cur) $info.textContent = `${cur.jn.n}. ${cur.jn.name} · paint ${cur.paint} · tiles ${cur.tiles.map((t) => t.T).join(" ")}\n` +
    `GPU ${gpuMs.toFixed(2)} ms · ${renderer.info.render.drawCalls} draws · ${renderer.info.render.triangles} tris · ${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2"}`;
});

await load(S.j, S.paint);
setView(S.view);
const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
window.lab = {
  J, S, camera, controls, scene, renderer,
  /** go to junction j with paint v1|v2 and a view (plan|oblique|street); resolves once a few frames are drawn */
  async go(j, paint = S.paint, view = S.view, layers = {}) {
    Object.assign(S, layers); S.paint = paint; S.view = view; S.j = j;
    sel.junction = names[j - 1]; sel.paint = paint === "v1" ? "v1 (before)" : "v2 (after)";
    ui.controllersRecursive().forEach((c) => c.updateDisplay());
    await load(j, paint); setView(view); applyLayers(); await frames(30);
    return { tiles: cur.tiles.map((t) => [t.T, t.ms]), findings: cur.list.length };
  },
  layers(o) { Object.assign(S, o); applyLayers(); ui.controllersRecursive().forEach((c) => c.updateDisplay()); },
  view: setView, frames,
  stats: () => ({ gpuMs, draws: renderer.info.render.drawCalls, tris: renderer.info.render.triangles }),
};
