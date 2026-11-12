// Minimal 3D viewer for one tile (default I6): terrain, UrbIS buildings, road-engine roads.
// Serve the repo root (python3 -m http.server 8000) and open /viewer/index.html?tile=I6.
//
// Scene units are CONTRACT local metres: +x east, +z south, +y up (absolute m TAW).
// Everything is built on the main thread at load (about 1 s for G4).

import * as THREE from "three/webgpu";
import {
  color, float, uniform, positionWorld, normalWorld, fract, min, fwidth, smoothstep, mix, abs, uv, vec3,
} from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildLamps, setLampModel } from "./lamps.js";
import { loadLampModel } from "./lampModel.js";
import { loadStJob, STJOB_LODS, STJOB_BU_ID, stjobColliders } from "./stjobModel.js";
import { addStalle } from "./stalleCity.js";
import { addTownHall } from "./townhallCity.js";
import { addVanBuuren } from "./vanbuurenCity.js";
import { addWolvendael } from "./wolvendaelCity.js";
import { buildFurniture } from "./furniture.js";
import { buildTram } from "./tram.js";
import { buildCars } from "./cars.js";
import { carFleet } from "./carFleet.js";
import { streetFit, buildBollards } from "./streetFit.js";
import { cobbleMaterial, pitMaterial } from "./cobbles.js";
import { landCoverTexture, groundMaterial } from "./ground.js";
import { Heightmap } from "./heightmap.js";
import { createTramLine } from "./tramline.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial } from "./roadPaint.js";
import { buildingMeshes as facadeMeshes } from "./facades.js";
import { Lighting, PRESETS } from "./lighting.js";
import { createPipeline } from "./post.js";
import { buildTrees } from "./trees.js";
import { buildTreeField } from "./treesSlop.js";
import { buildStylizedTreeField, setTreeLighting, setTreeRenderer } from "./treesStylized.js";
import { openBootPipelines, warmBoot, precompile } from "./warmup.js";
import { buildPlazas, loadOverrides } from "./plazas.js";
import { Flyer } from "./flight.js";
import { Driver, tileDrive } from "./drive/driveMode.js";
import { addLamps } from "./lampLight.js";
import { SMOOTH, lodEye, Fader, withObjectFade, fadeProxies, dropFadeVariant } from "./lodFade.js";
import { buildFarTreeField } from "./treesStylized.js";
import { cityKit } from "./facadeKit/cityKit.js";

const DATA = new URL("../data/tiles/", import.meta.url);
const params = new URLSearchParams(location.search);
if (params.get("log") === "0") document.getElementById("logBox")?.removeAttribute("open");   // dev log: open by default, ?log=0 closes it
const TILE = (params.get("tile") || "I6").toUpperCase();    // I6 = Saint-Job (it was G4 before the grid grew to all of Uccle)
const EYE = 1.7;            // walk-mode eye height (m)
const CARVE = 0.12;         // terrain is pushed this far under any road surface
// Smooth LOD (docs/SMOOTH_LOD.md): streamed tiles cross-fade (dithered, ~0.9 s) instead of popping: a full
// tile fades in over the far tile it replaces, a full tile leaving the ring hands over to its far tile the
// same way, far tiles fade in and out at the ring's edge. ?tilefade=0: instant swaps (and no fade term in the
// tiles' shaders), ?smooth=0: every smooth-LOD change off.
const TILE_FADE = SMOOTH && params.get("tilefade") !== "0";
const fader = new Fader();
/** compileFor(roots): build the shaders of streamed objects before they show (warmup.js precompile; set once the
 *  render pipeline exists). Not under the boot cover: the warm-up draws those itself. */
let compileFor = null;
const preCompile = async (roots, fading) => {
  if (!compileFor) return;
  // under the boot cover the warm-up draws the tile with its fading copies (it holds its fade): its OWN materials
  // were then built on the frame its fade ended, after the cover lifted (28 ms, measured). Compiled in the
  // background here, not awaited: the boot does not wait for them.
  if (fader.hold) {
    const list = [].concat(roots), p = compileFor(list);
    for (const r of list) r.userData.compiling = p;
    p.finally(() => { for (const r of list) delete r.userData.compiling; });
    return;
  }
  await compileFor(roots);
  if (fading) await compileFor([].concat(roots).map(fadeProxies));
};
const dropMat = (m) => { if (!m.userData?.shared) { dropFadeVariant(m); m.dispose?.(); } };

const $ = (id) => document.getElementById(id);
const logLines = [];
const log = (s) => { logLines.push(s); $("log").textContent = logLines.join("\n"); console.log(s); };
const timedGlobal = async (label, fn) => { const t = performance.now(); const r = await fn(); log(`${label}: ${(performance.now() - t).toFixed(0)} ms`); return r; };
const getJSON = async (p) => { const r = await fetch(new URL(p, DATA)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
const getBin = async (p) => { const r = await fetch(new URL(p, DATA)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.arrayBuffer(); };

// ------------------------------------------------------------------ terrain grid

function terrainMesh(t, contourOn, feats, bounds, coverData) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(t.pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(t.nrm, 3));
  g.setIndex(new THREE.BufferAttribute(t.idx, 1));

  // TSL ground: OSM land cover mask + procedural grass (viewer/ground.js); optional 1 m / 5 m contour lines
  const h = positionWorld.y;
  const line = (period, width) => {
    const f = fract(h.div(period));
    const d = min(f, f.oneMinus()).mul(period);
    return float(1).sub(smoothstep(float(0), fwidth(h).mul(width), d));
  };
  const lines = mix(line(1, 1.0).mul(0.35), float(0.8), line(5, 1.4));
  const cover = landCoverTexture(feats, bounds, coverData);
  const m = groundMaterial(cover, bounds, (col) => mix(col, color(0x2b2418), lines.mul(contourOn)));
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  mesh.name = "terrain";
  mesh.userData.textures = [cover.tex];
  return mesh;
}

// ------------------------------------------------------------------ buildings

function buildingMeshes(doc, buf) {
  const dv = new DataView(buf);
  const V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3);
  const I = new Uint32Array(buf, 8 + V * 12, T * 3);
  const groups = { roof: [], walls: [] };
  const tint = new Float32Array(V * 3);
  doc.buildings.forEach((b, n) => {
    // small per-building colour jitter, stable across loads
    const j = ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (const part of ["roof", "walls"]) {
      const { first, count } = b[part];
      for (let t = first; t < first + count; t++) {
        groups[part].push(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]);
        for (let q = 0; q < 3; q++) {
          const v = I[t * 3 + q];
          tint[v * 3] = 0.88 + 0.16 * j; tint[v * 3 + 1] = 0.9 + 0.1 * j; tint[v * 3 + 2] = 0.92 + 0.08 * (1 - j);
        }
      }
    }
  });
  const mats = {
    roof: new THREE.MeshStandardMaterial({ color: 0x9a4f3c, roughness: 0.8, vertexColors: true }),
    walls: new THREE.MeshStandardMaterial({ color: 0xd9cbb4, roughness: 0.9, vertexColors: true }),
  };
  const meshes = [];
  for (const part of ["roof", "walls"]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("color", new THREE.BufferAttribute(tint, 3));
    g.setIndex(groups[part]);
    const flat = g.toNonIndexed();     // flat per-face normals (CONTRACT 5.2: normals are not stored)
    flat.computeVertexNormals();
    const m = new THREE.Mesh(flat, mats[part]);
    m.castShadow = m.receiveShadow = true;
    m.name = `buildings-${part}`;
    meshes.push(m);
  }
  return { meshes, triangles: T, vertices: V };
}

// ------------------------------------------------------------------ roads

/** GPU meshes for a tile's roads from the worker's data (tileData.js). */
function roadMeshes(road) {
  const mats = { asphalt: asphaltMaterial(road.atlas), grass: sharedMat("verge", vergeMaterial), square: sharedMat("cobbles", cobbleMaterial), pits: sharedMat("tree-pits", pitMaterial),
    concrete: road.surfaceStats ? sharedMat("concrete-framed", () => concreteMaterial({ framed: true })) : sharedMat("concrete", concreteMaterial) };
  const meshes = [];
  for (const [name, part] of Object.entries(road.parts)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [k, a] of Object.entries(part.attributes)) g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize));
    if (part.aSurf) g.setAttribute("aSurf", new THREE.BufferAttribute(part.aSurf, 1));
    g.setIndex(new THREE.BufferAttribute(part.index, 1));
    const m = new THREE.Mesh(g, mats[name]);
    m.receiveShadow = true;
    m.name = `roads-${name}`;
    meshes.push(m);
  }
  return { meshes, textures: road.atlas?.texture ? [road.atlas.texture] : [] };
}

/** Materials that don't depend on the tile: made once, never disposed with a tile. */
const shared = new Map();
function sharedMat(key, make) {
  if (!shared.has(key)) { const m = make(); m.userData.shared = true; shared.set(key, m); }
  return shared.get(key);
}

// ------------------------------------------------------------------ features (tram lines, trees)

// grooved rail cross-section (m, from the gauge side): check lip, groove, running head, then an asphalt seam
const RAIL_LIP = 0.015, RAIL_GROOVE = 0.035, RAIL_HEAD = 0.065, RAIL_SEAM = 0.02, RAIL_W = RAIL_LIP + RAIL_GROOVE + RAIL_HEAD + RAIL_SEAM;
function railMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  const v = uv().y.mul(RAIL_W), aa = fwidth(v).add(0.0015);
  const edge = (e) => smoothstep(float(e).sub(aa), float(e).add(aa), v);      // 0 before e, 1 after
  const lip = float(1).sub(edge(RAIL_LIP)), groove = edge(RAIL_LIP).sub(edge(RAIL_LIP + RAIL_GROOVE));
  const head = edge(RAIL_LIP + RAIL_GROOVE).sub(edge(RAIL_LIP + RAIL_GROOVE + RAIL_HEAD)), seam = edge(RAIL_LIP + RAIL_GROOVE + RAIL_HEAD);
  // polished running head, duller lip, dirty groove (dark but not black), the bitumen seam beside the rail
  let col = vec3(0.32, 0.31, 0.3).mul(lip).add(vec3(0.035, 0.03, 0.026).mul(groove)).add(vec3(0.55, 0.55, 0.56).mul(head)).add(vec3(0.04, 0.04, 0.042).mul(seam));
  // far away a pixel covers the whole rail: the average, not aliasing stripes
  const far = smoothstep(float(0.02), float(0.07), aa);
  col = mix(col, vec3(0.22, 0.215, 0.21), far);
  m.colorNode = col;
  m.metalnessNode = mix(head.mul(0.85).add(lip.mul(0.5)), float(0.3), far);
  m.roughnessNode = mix(float(0.9).sub(head.mul(0.62)).sub(lip.mul(0.3)), float(0.6), far);
  return m;
}

/** `treeGround(x, z)`: where a trunk stands (?roads=surface: on the measured paving / in its pit's soil) */
function featureObjects(f, hm, bounds, railLift = 0.012, treeGround = (x, z) => hm.surface(x, z)) {
  const group = new THREE.Group();
  group.name = "features";
  const inTile = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  // Tram rails: two grooved rails (Ri60-type: check lip, groove, running head) at standard gauge (1.435 m) along
  // each OSM tram line (smoothed in the tile worker, viewer/track.js), embedded flush in the road: one ribbon per
  // rail, 13.5 cm wide, whose cross-section is painted by railMaterial() (lip | groove | head | asphalt seam), so it
  // is one mesh and one draw for every rail of the tile and stays clean at a distance (no thin black lines).
  const GAUGE = 1.435, W = RAIL_W;
  const pos = [], uvs = [], nrm = [];
  const ribbon = (pts, side) => {
    // side -1 / +1: the strip runs from the gauge side (lip) outward
    const o0 = side * (GAUGE / 2 - RAIL_LIP - RAIL_GROOVE), o1 = o0 + side * W;
    for (let k = 0; k + 1 < pts.length; k++) {
      const q = [pts[k], pts[k + 1]].map(([x, z, nx, nz]) => [[x + nx * o0, z + nz * o0], [x + nx * o1, z + nz * o1]]);
      const y = (p) => hm.surface(p[0], p[1]) + CARVE + railLift;
      const [a0, a1] = q[0], [b0, b1] = q[1];
      for (const [p, v] of [[a0, 0], [b0, 0], [a1, 1], [a1, 1], [b0, 0], [b1, 1]]) { pos.push(p[0], y(p), p[1]); uvs.push(0, v); nrm.push(0, 1, 0); }
    }
  };
  for (const l of f.lines || []) {
    if (l.kind !== "tram") continue;
    const dense = [];
    for (let k = 1; k < l.line.length; k++) {
      const [ax, az] = l.line[k - 1], [bx, bz] = l.line[k];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));      // every metre at most, so rails follow the ground
      for (let s2 = k === 1 ? 0 : 1; s2 <= n; s2++) dense.push([ax + (bx - ax) * s2 / n, az + (bz - az) * s2 / n]);
    }
    const pts = dense.filter(([x, z]) => inTile(x, z)).map(([x, z], i, arr) => {
      const p = arr[Math.max(0, i - 1)], q = arr[Math.min(arr.length - 1, i + 1)];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1;
      return [x, z, -dz / L, dx / L];
    });
    if (pts.length < 2) continue;
    for (const side of [-1, 1]) ribbon(pts, side);
  }
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    const mesh = new THREE.Mesh(g, sharedMat("rails", railMaterial));
    mesh.name = "tram-rails"; mesh.receiveShadow = true;
    group.add(mesh);
  }
  /** the trees, added later (their own frame slice): group.userData.addTrees() */
  group.userData.addTrees = () => addTrees(group, f, inTile, treeGround);
  return group;
}
function addTrees(group, f, inTile, treeGround) {
  // default: game-engine-v1's fog-lab stylized trees (viewer/treesStylized.js); ?trees=slop:
  // slop-newyork's tree system (viewer/treesSlop.js); ?trees=simple: our first leaf-card crowns
  const treeMode = params.get("trees");
  const T = treeMode === "simple" ? buildTrees(f.trees || [], treeGround, inTile)
    : treeMode === "slop" ? buildTreeField(f.trees || [], treeGround, inTile)
    : buildStylizedTreeField(f.trees || [], treeGround, inTile);
  group.add(T.group);
  group.userData.update = T.update || null;
  log(`trees: ${T.count} (LiDAR canopy peaks + OSM)` + (T.sizes ? `, species heights ${T.sizes.map((z) => z.h.toFixed(1)).join("/")} m` : ""));
}

let tramLine = null;       // real STIB line 92 on its timetable (tramline.js)
const updaters = [];
let falconsReady = null, falconsOn = true;   // the Saint-Job peregrines (viewer/falcons.js), once loaded       // per-frame updates (tree LOD, lamp lights) of every loaded tile

// ------------------------------------------------------------------ walk mode

class Walker {
  constructor(camera, dom, hm) {
    Object.assign(this, { camera, dom, hm, on: false, yaw: 0, pitch: 0, keys: new Set() });
    addEventListener("keydown", (e) => { if (this.on) { this.keys.add(e.code); if (e.code === "Escape") this.onExit?.(); } });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    let drag = null;
    dom.addEventListener("pointerdown", (e) => { if (this.on) drag = [e.clientX, e.clientY]; });
    addEventListener("pointerup", () => { drag = null; });
    addEventListener("pointermove", (e) => {
      if (!this.on || !drag) return;
      this.yaw -= (e.clientX - drag[0]) * 0.004;
      this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - (e.clientY - drag[1]) * 0.004));
      drag = [e.clientX, e.clientY];
    });
  }
  start(x, z, yaw) { this.on = true; this.yaw = yaw; this.pitch = -0.05; this.x = x; this.z = z; }
  update(dt) {
    if (!this.on) return;
    const k = this.keys, sp = (k.has("ShiftLeft") || k.has("ShiftRight") ? 12 : 4) * dt;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let mx = 0, mz = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) { mx += fx; mz += fz; }
    if (k.has("KeyS") || k.has("ArrowDown")) { mx -= fx; mz -= fz; }
    if (k.has("KeyA") || k.has("ArrowLeft")) { mx += fz; mz -= fx; }
    if (k.has("KeyD") || k.has("ArrowRight")) { mx -= fz; mz += fx; }
    const l = Math.hypot(mx, mz);
    if (l) { this.x += mx / l * sp; this.z += mz / l * sp; }
    const { x0, z0, x1, z1 } = this.hm.h;
    this.x = Math.min(Math.max(this.x, x0), x1); this.z = Math.min(Math.max(this.z, z0), z1);
    this.camera.position.set(this.x, (this.hm.walkY ? this.hm.walkY(this.x, this.z) : this.hm.surface(this.x, this.z) + CARVE) + EYE, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}

/** Nearest point on any road polyline (roads.json, end nodes + PIs) to (x, z), and the road's yaw there. */
function roadStart(data, x, z, bounds) {
  const nodes = new Map(data.nodes.map((n) => [n.id, n]));
  let best = null;
  for (const r of data.roads) {
    const pts = [nodes.get(r.a), ...r.pts, nodes.get(r.b)];
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(px - x, pz - z);
      if (px < bounds.x0 || px > bounds.x1 || pz < bounds.z0 || pz > bounds.z1) continue;
      if (!best || d < best.d) best = { d, x: px, z: pz, yaw: Math.atan2(-dx, -dz), road: r };
    }
  }
  return best;
}

// ------------------------------------------------------------------ tile worker

let tileWorker = null, reqId = 0;
const pendingReq = new Map();
if (params.get("worker") !== "0") {
  try {
    tileWorker = new Worker(new URL("./tileWorker.bundle.js", import.meta.url), { type: "module" });
    tileWorker.onmessage = (e) => { const p = pendingReq.get(e.data.id); pendingReq.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.r); };
    tileWorker.onerror = (e) => { log(`tile worker failed (${e.message || "error"}): building tiles on the main thread`); tileWorker = null; for (const p of pendingReq.values()) p.retry(); pendingReq.clear(); };
  } catch (e) { tileWorker = null; }
}
/** UrbIS solids replaced by a scripted model (the Saint-Job church): not drawn, kept in the roof grid. */
const HIDE_BU_IDS = params.get("stjob") !== "0" ? [STJOB_BU_ID] : [];
/** Park ponds whose bed the tiles carve (viewer/water/pondBed.js; the Wolvendael pond with ?wolvendael=1). */
const PONDS = [];
/** Tiles that have surfaces.json draw the measured UrbIS street surfaces (viewer/surfaces.js), the default since
 *  2026-11-05; ?roads=engine: the road engine's own guessed carriageways, sidewalks and kerbs, as before. */
const ROAD_SURFACES = params.get("roads") !== "engine";
/** CPU data for a tile: from the worker, or on the main thread (?worker=0, or if the worker fails). */
function tileData(entry, lite = false) {
  entry = { ...entry, hide: HIDE_BU_IDS, surface: ROAD_SURFACES, pits: params.get("pits") !== "0",   // ?pits=0: no tree pits (A/B)
    kit: cityKit.on && !lite, kitExclude: cityKit.exclude };                                         // ?kit=1: the façade kit (viewer/facadeKit/)
  entry = { ...entry, hide: HIDE_BU_IDS, ponds: PONDS, surface: ROAD_SURFACES, pits: params.get("pits") !== "0" };   // ?pits=0: no tree pits (A/B)
  const local = () => import("./tileData.js").then((m) => (lite ? m.buildLiteData : m.buildTileData)(entry, DATA.href));
  if (!tileWorker) return local();
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    pendingReq.set(id, { resolve, reject, retry: () => local().then(resolve, reject) });
    tileWorker.postMessage({ id, entry, base: DATA.href, lite });
  });
}

/** Far level of detail of a tile (tileData.js buildLiteData): orthophoto-draped 4 m terrain and
 *  flat-coloured UrbIS solids. 2 draw calls, no shadows, no per-frame work. */
const texLoader = new THREE.TextureLoader();
async function loadLiteTile(entry, group) {
  const d = await tileData(entry, true);
  const g = new THREE.Group();
  g.name = `${entry.name}-lite`;
  const tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.BufferAttribute(d.terrain.pos, 3));
  tg.setAttribute("normal", new THREE.BufferAttribute(d.terrain.nrm, 3));
  tg.setAttribute("uv", new THREE.BufferAttribute(d.terrain.uv, 2));
  tg.setIndex(new THREE.BufferAttribute(d.terrain.idx, 1));
  const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, color: 0x5d6e45 });
  const textures = [];
  if (entry.files.ortho) {
    const tex = await texLoader.loadAsync(new URL(entry.files.ortho, DATA).href).catch(() => null);
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tm.map = tex; tm.color.set(0xffffff); textures.push(tex); }
  }
  g.add(new THREE.Mesh(tg, tm));
  const bg = new THREE.BufferGeometry();
  bg.setAttribute("position", new THREE.BufferAttribute(d.buildings.position, 3));
  bg.setAttribute("normal", new THREE.BufferAttribute(d.buildings.normal, 3));
  bg.setAttribute("color", new THREE.BufferAttribute(d.buildings.color, 3));
  g.add(new THREE.Mesh(bg, sharedMat("lite-buildings", () => new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85 }))));
  // its trees, as the full tile's impostors (the same placements and variants: no change when it swaps), so a
  // tile no longer brings a whole forest with it at ~500 m (smooth LOD; none with ?impostors=0)
  let trees = null;
  if (SMOOTH && entry.files.features) {
    const f = await getJSON(entry.files.features).catch(() => null);
    const b = { x0: entry.bounds.x[0], x1: entry.bounds.x[1], z0: entry.bounds.z[0], z1: entry.bounds.z[1] };
    const ys = new Map((f?.trees || []).map((t) => [`${t.x},${t.z}`, t.y]));
    trees = f?.trees?.length && ys.values().next().value != null
      ? buildFarTreeField(f.trees, (x, z) => ys.get(`${x},${z}`), (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) : null;
    if (trees) { g.add(trees.mesh); updaters.push(trees.update); }
  }
  await preCompile(g, TILE_FADE);       // its shaders (and its fading copies') before its first frame
  group.add(g);
  return {
    name: entry.name,
    group: g,
    dispose: () => {
      if (trees) { const i = updaters.indexOf(trees.update); if (i >= 0) updaters.splice(i, 1); }
      g.traverse((o) => { o.geometry?.dispose(); if (o.material) dropMat(o.material); });
      for (const t of textures) t.dispose();
      g.removeFromParent();
    },
  };
}

/** Load and build one tile into the shared layer groups. Returns what the viewer needs from it. */
async function loadTile(entry, { layers, contourOn, verbose }) {
  const F = entry.files;
  const [x0, x1] = entry.bounds.x, [z0, z1] = entry.bounds.z;
  const bounds = { x0, x1, z0, z1 };
  const say = verbose ? log : () => {};
  // per-tile groups inside the shared layers, so the tile can be unloaded
  const own = {};
  for (const k of Object.keys(layers)) { own[k] = new THREE.Group(); own[k].name = `${entry.name}-${k}`; layers[k].add(own[k]); }
  // a streamed tile is built over several frames: hidden until it is whole, then faded in (smooth LOD)
  const fadeIn = TILE_FADE && !verbose;
  if (fadeIn) for (const g of Object.values(own)) g.visible = false;
  const ups = [];
  const t0 = performance.now();
  const d = await tileData(entry);
  let busy = 0, longest = 0, mark = performance.now(), worst = "";
  const slices = [];
  const frame = (label = "") => { const dt = performance.now() - mark; busy += dt; if (dt > 4) slices.push(`${label} ${dt.toFixed(0)}`); if (dt > longest) { longest = dt; worst = label; }
    if (verbose || fader.hold) { mark = performance.now(); return Promise.resolve(); }   // under the boot cover: no frame to keep smooth
    return new Promise((r) => requestAnimationFrame(() => { mark = performance.now(); r(); })); };   // spread GPU-side work over frames
  const { roads, feats } = d;
  const hm = Heightmap.from(d.hdr, d.y, d.orig);
  const ni = d.netInfo;
  say(`tile ${entry.name} built ${tileWorker ? "in the worker" : "on the main thread"}: ${Object.entries(d.times).map(([k, v]) => `${k} ${v} ms`).join(", ")}`);
  say(`road engine: ${ni.roads} roads, ${ni.nodes} nodes, ${ni.errors} errors ${JSON.stringify(ni.byCode)}, ${ni.warnings} warnings/info`);
  if (d.road.atlas) say(`marking atlas: ${d.road.atlas.width}x${d.road.atlas.height} at ${(d.road.atlas.texel * 100).toFixed(1)} cm, ${d.road.atlas.stats.regions} junctions`);
  const ss = d.road.surfaceStats;      // ?roads=surface on a tile with surfaces.json (viewer/surfaces.js)
  if (ss) say(`road surfaces: MEASURED (UrbIS Land cover): ${ss.surfaces} polygons -> ${ss.baseTris} triangles, ${ss.kerbLength} m of kerb; engine markings clipped to them: ${ss.overlayTris} triangles; ${ss.mappedPieces} engine roads/pads on measured ground, ${ss.unmappedPieces} kept as built (${ss.keptEngineTris} + ${ss.keptSideTris} triangles); ${ss.ms} ms`);
  const R = roadMeshes(d.road);
  own.roads.add(...R.meshes);
  await frame("roads");
  const terr = terrainMesh(d.terrain, contourOn, feats, bounds, d.cover);
  own.terrain.add(terr);
  // squares OSM leaves out (data/overrides.json); with measured surfaces the UrbIS squares replace them
  const plazas = ss ? { count: 0 } : buildPlazas(await loadOverrides(DATA), bounds, (x, z) => hm.ground(x, z));
  if (plazas.count) own.roads.add(plazas.group);
  R.textures.push(...terr.userData.textures);
  await frame("terrain");
  const B = facadeMeshes(null, null, null, null, d.buildings);
  say(`façades: ${B.stats.faces} wall faces, ${B.stats.party} party walls, ${B.stats.street} facing a street; details: ${B.stats.cornices} cornices, ${B.stats.buttresses} buttresses, ${B.stats.ridges} ridge/hip caps, ${B.stats.chimneys} chimneys, ${B.stats.eaves || 0} eaves, ${B.stats.shops} shopfronts (OSM shops)`);
  own.buildings.add(...B.meshes);
  await frame("buildings");
  // rails 1.2 cm above the road; with ?roads=surface 2 cm above H (the engine's markings layer sits up to 1.8 cm above it)
  // ?roads=surface: lamps, parked cars, the walker, the trees and the bollards on the measured street (viewer/streetFit.js)
  const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
  // a tree on measured ground stands on it (in its pit, viewer/surfaces.js), not on the terrain carved under it
  const treeGround = fit ? (x, z) => (fit.classAt(x, z) >= 0 ? hm.surface(x, z) + CARVE + fit.lift(x, z) : hm.surface(x, z)) : undefined;
  const fo = featureObjects(feats, hm, bounds, d.road.surfaceStats ? 0.02 : 0.012, treeGround);
  own.features.add(fo);
  await frame("rails");
  fo.userData.addTrees();
  if (fo.userData.update) ups.push(fo.userData.update);
  await frame("trees");
  // ?roads=surface: lamps, parked cars, the walker and the bollards on the measured street (viewer/streetFit.js)
  const lamps = buildLamps(roads, (x, z) => hm.ground(x, z), bounds, { lights: verbose, place: fit?.placeLamp, lift: fit?.lift });   // point lights: main tile only
  own.features.add(lamps.group);
  ups.push(lamps.update);
  await frame("lamps");
  addLamps(entry.name, lamps.heads);                 // every lamp lights the street (viewer/lampLight.js)
  await frame("lamp light map");
  const furn = buildFurniture(feats, roads, (x, z) => hm.ground(x, z), bounds);
  own.features.add(furn.group);
  await frame("furniture");
  const tram = buildTram(feats, (x, z) => hm.surface(x, z) + CARVE, bounds);
  own.features.add(tram.group);
  await frame("tram");
  // parked cars from the parking lanes as OSM / the type default has them (before the width fit, which drops lanes the
  // measured street is too narrow for), then each one against the measured kerb if it fits there wholly
  const carRoads = fit ? { ...roads, roads: roads.roads.map((r) => (r.meta?.widthFit ? { ...r, lanes: r.meta.unfitLanes ?? undefined } : r)) } : roads;
  const cars = buildCars(carRoads, feats, (x, z) => hm.surface(x, z) + CARVE, bounds, { place: fit?.placeCar });
  await frame("parked cars");
  const bollards = fit ? buildBollards(d.road.surfaceData.bollards) : null;
  if (bollards) own.features.add(bollards);
  if (fit) say(`street on the measured surfaces: ${lamps.count} lamps on the sidewalks, ${cars.count} parked cars against the kerbs, ${bollards?.count ?? 0} bollards (UrbIS Topo CR5702P / CR57L)`);
  own.features.add(cars.group);
  say(`parked cars: ${cars.count} (placed procedurally in the parking lanes)`);
  say(`tram (OSM): ${tram.counts.wireSegments} wire segments, ${tram.counts.poles} poles, ${tram.counts.platforms} platforms, ${tram.counts.shelters} shelters`);
  say(`street furniture (OSM points): ${Object.entries(furn.counts).map(([k, v]) => `${v} ${k}`).join(", ")}`);
  say(`street lamps: ${lamps.count} (placed along the kerbs, ROAD_TYPES lampSpacing; OSM has none here)`);
  say(`buildings: ${d.buildingCount} (${B.triangles} triangles), roads: ${d.road.triangles} triangles in tile, terrain cells carved: ${d.road.carvedCells}; tile ready in ${(performance.now() - t0).toFixed(0)} ms`);

  await frame("bollards");
  if (fadeIn) { const tc = performance.now(); await preCompile(Object.values(own), true); mark += performance.now() - tc; }   // shaders + fading copies built before it shows (not counted as a slice)
  for (const u of ups) updaters.push(u);
  for (const g of Object.values(own)) if (fadeIn) { g.visible = true; fader.fade(g, +1); }
  cityKit.addTile(entry.name, B.kit, B.kitWalls, !fadeIn);       // ?kit=1: its kit fades in with it
  const dispose = () => {
    cityKit.removeTile(entry.name);
    for (const u of ups) { const i = updaters.indexOf(u); if (i >= 0) updaters.splice(i, 1); }
    for (const g of Object.values(own)) {
      g.traverse((o) => { if (!o.geometry?.userData?.shared) o.geometry?.dispose(); for (const m of [].concat(o.material || [])) dropMat(m); o.dispose?.(); });
      g.removeFromParent();
    }
    for (const t of R.textures) t.dispose();
  };
  await frame("show");
  tramLine?.snapTile(entry.name, feats, bounds);
  await frame("tram line snap");
  const drive = tileDrive(d.drive, roads, bounds);
  frame("drive colliders");
  log(`tile ${entry.name}: main-thread work ${busy.toFixed(0)} ms, longest slice ${longest.toFixed(0)} ms (${worst}); slices over 4 ms: ${slices.join(", ") || "none"}; ${tileWorker ? "CPU build in the worker" : "CPU build ALSO on the main thread"}`);
  // roof heights (m TAW, 0 = none) for fly-mode collision: the max of the 2 m cells around the point, so the bird
  // keeps clear of a roof edge it is about to cross
  const rf = d.roofs;
  const roofAt = (x, z) => {
    if (!rf) return 0;
    const fi = (x - rf.x0) / rf.step, fj = (z - rf.z0) / rf.step;
    let h = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const i = Math.floor(fi + di * 0.5), j = Math.floor(fj + dj * 0.5);
      if (i >= 0 && j >= 0 && i < rf.nx && j < rf.nz) h = Math.max(h, rf.data[j * rf.nx + i]);
    }
    return h;
  };
  return { name: entry.name, hm, roads, net: ni, bounds, feats, dispose, roofAt, drive, lift: fit?.lift, groups: Object.values(own) };
}

// ------------------------------------------------------------------ main

async function main() {
  const manifest = await getJSON("manifest.json");
  const sel = $("tileSel");
  for (const t of manifest.tiles) {
    const o = new Option(`${t.name}${t.status === "built" ? "" : ` (${t.status})`}`, t.name, false, t.name === TILE);
    o.disabled = t.status === "missing";
    sel.add(o);
  }
  sel.onchange = () => { params.set("tile", sel.value); location.search = params.toString(); };
  const entry = manifest.tiles.find((t) => t.name === TILE);
  if (!entry || entry.status === "missing") throw new Error(`tile ${TILE} is not built (manifest status: ${entry?.status})`);
  const F = entry.files;
  const [x0, x1] = entry.bounds.x, [z0, z1] = entry.bounds.z;
  const bounds = { x0, x1, z0, z1 };

  const gpuTiming = params.get("gpu") !== "0";      // GPU ms per frame in the stats (timestamp queries; ?gpu=0 off)
  const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: params.get("rdepth") !== "0", trackTimestamp: gpuTiming });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.prepend(renderer.domElement);
  await renderer.init();
  const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
  log(`renderer: ${backend}`);

  const scene = new THREE.Scene();
  const bootPipes = params.get("warmup") !== "0" ? openBootPipelines(renderer, scene) : null;   // ?warmup=0: old boot, for A/B
  const timeId = PRESETS[params.get("time")] ? params.get("time") : "golden";
  const lighting = new Lighting(scene, renderer, timeId, { sunLight: params.get("sunlight") === "1" });
  setTreeLighting(lighting);
  setTreeRenderer(renderer);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  const contourOn = uniform(0);
  const layers = { terrain: new THREE.Group(), buildings: new THREE.Group(), roads: new THREE.Group(), features: new THREE.Group() };
  for (const g of Object.values(layers)) scene.add(g);
  // the parked cars of every tile, as one fleet (viewer/carFleet.js; ?cars=box: the old box cars per tile)
  if (params.get("cars") !== "box") { scene.add(carFleet.group); updaters.push(carFleet.update); carFleet.setRenderer(renderer, scene); }
  // the world: the main tile now, its neighbours streamed in after the first frame (?ring=0|1|2)
  const world = {
    tiles: [],
    at(x, z) { return this.tiles.find((t) => x >= t.bounds.x0 && x <= t.bounds.x1 && z >= t.bounds.z0 && z <= t.bounds.z1) || this.tiles[0]; },
    surface(x, z) { return this.at(x, z).hm.surface(x, z); },
    ground(x, z) { return this.at(x, z).hm.ground(x, z); },
    /** where feet stand: the road level, plus the kerb height on measured sidewalks / squares (?roads=surface) */
    walkY(x, z) { const t = this.at(x, z); return t.hm.surface(x, z) + CARVE + (t.lift ? t.lift(x, z) : 0); },
    /** the highest solid here: ground or a roof (fly-mode collision) */
    heightAt(x, z) { const t = this.at(x, z); return Math.max(t.hm.surface(x, z), t.roofAt ? t.roofAt(x, z) : 0); },
    get h() {
      const b = this.tiles.map((t) => t.bounds);
      return { x0: Math.min(...b.map((q) => q.x0)), z0: Math.min(...b.map((q) => q.z0)), x1: Math.max(...b.map((q) => q.x1)), z1: Math.max(...b.map((q) => q.z1)) };
    },
  };
  if (params.get("lampmodel") !== "0") setLampModel(await loadLampModel());   // the Blender lamp (?lampmodel=0: the old cylinders)
  // The Saint-Job church (tools/blender/stjob.py, viewer/stjobModel.js) in place of its UrbIS solid (HIDE_BU_IDS);
  // ?stjob=0: the UrbIS solid. One model, three LODs by distance to the octagon; shown while its tile is loaded
  // (full or far LOD), since the tiles no longer draw the solid.
  if (HIDE_BU_IDS.length) {
    loadStJob().then((m) => {
      // smooth LOD: the levels cross-fade (dithered, lodFade.js objectFade) over a band around each switch
      // distance instead of THREE.LOD's hard swap (?smooth=0: THREE.LOD)
      const lod = SMOOTH ? new THREE.Group() : new THREE.LOD();
      lod.name = "stjob";
      const levels = STJOB_LODS.map((l, k) => m.make(k));
      if (SMOOTH) { lod.add(...levels); for (const mat of m.materials) withObjectFade(mat); }
      else levels.forEach((g, k) => lod.addLevel(g, k ? STJOB_LODS[k - 1].until : 0));
      lod.position.copy(m.placement.position);
      lod.rotation.y = m.placement.rotationY;
      scene.add(lod);
      const p = m.placement.position;
      const home = manifest.tiles.find((t) => p.x >= t.bounds.x[0] && p.x < t.bounds.x[1] && p.z >= t.bounds.z[0] && p.z < t.bounds.z[1])?.name;
      let n = 0;
      const BANDS = [0.15, 0.12];     // half-width of each switch's band, a share of its distance (170 m: +-25 m, 520 m: +-62 m)
      const ramp = (d, k) => { const s = STJOB_LODS[k].until, w = s * BANDS[k]; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
      updaters.push((camPos) => {
        if (SMOOTH) {
          const d = camPos.distanceTo(p), t1 = ramp(d, 0), t2 = ramp(d, 1);
          const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];       // outgoing keeps n >= t (2 + t), incoming n < t
          const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
          levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) g.traverse((o) => { o.userData.fade = fades[k]; }); });
        }
        if (n++ % 30) return;
        lod.visible = world.tiles.some((t) => t.name === home) || !!scene.getObjectByName(`${home}-lite`);
      });
      log(`Saint-Job church: scripted model, LODs ${m.lods.map((l) => l.tris).join(" / ")} triangles (?stjob=0: the UrbIS solid)`);
      // the peregrine family at the church (viewer/falcons.js, Falcon Lab): ?falcons=0 = none
      if (params.get("falcons") !== "0") {
        import("./falcons.js").then(({ createFalcons }) => createFalcons({ church: m, heightAt: (x, z) => (world.tiles.length ? world.heightAt(x, z) : -1e9) })).then((fam) => {
          scene.add(fam.group);
          window.__falcons = fam; falconsReady = fam;
          window.__falconsOn = (v) => { falconsOn = v; };   // A/B timing (debug/gpuAB.js alternate)
          updaters.push((camPos, cam) => { fam.enabled = lod.visible && falconsOn; fam.update(cam); });
          log(`falcons: the Saint-Job family (female, tiercel, 3 eyases; the eyrie ${fam.nestTris[0]} tris) - ?falcons=0 to leave them out`);
        }).catch((e) => log(`falcons: ${e.message}`));
      }
    }).catch((e) => log(`Saint-Job model failed (${e.message}): the UrbIS solid is hidden, reload with ?stjob=0`));
  }
  await cityKit.start({ scene, updaters, log });                   // ?kit=1: the façade kit (before the first tile and the warm-up)
  // the Chapelle de Stalle + its interior cell (tools/blender/stalle*.py, viewer/stalleCity.js) behind ?stalle=1
  if (params.get("stalle") === "1") await addStalle({ scene, updaters, hide: HIDE_BU_IDS, world, manifest, log, compiler: () => compileFor, getView: () => ({ camera, lighting }), getThird: () => third });
  // The Uccle town hall (tools/blender/townhall.py, viewer/townhallCity.js) in place of its UrbIS solid, behind
  // ?townhall=1 for now (its BU_ID joins HIDE_BU_IDS before the first tile is built)
  if (params.get("townhall") === "1") await addTownHall({ scene, updaters, hide: HIDE_BU_IDS, world, manifest, log, compiler: () => compileFor });
  // The Villa van Buuren (tools/blender/vanbuuren.py, viewer/vanbuurenCity.js) in place of UrbIS solid 550409 only,
  // behind ?vanbuuren=1 for now
  if (params.get("vanbuuren") === "1") await addVanBuuren({ scene, updaters, hide: HIDE_BU_IDS, world, manifest, log, compiler: () => compileFor, renderer });
  // The Château de Wolvendael (tools/blender/wolvendael_chateau.py, viewer/wolvendaelCity.js) in place of UrbIS solids
  // 537523 + 538880, and its pond (viewer/water/), behind ?wolvendael=1 for now
  if (params.get("wolvendael") === "1") await addWolvendael({ scene, updaters, hide: HIDE_BU_IDS, ponds: PONDS, world, manifest, log, compiler: () => compileFor, renderer, lighting });
  const T0 = await loadTile(entry, { layers, contourOn, verbose: true });
  world.tiles.push(T0);
  const { hm, roads, net } = T0;
  if (params.get("trams") !== "0") {
    try {
      tramLine = await createTramLine(new URL("../data/transit/stib-92.json", import.meta.url), scene, (x, z) => world.surface(x, z) + CARVE);
      for (const t of world.tiles) tramLine.snapTile(t.name, t.feats, t.bounds);
      updaters.push(tramLine.update);
      tramLine.update(new THREE.Vector3(cx, 0, cz));
      log(tramLine.info());
    } catch (e) { log(`tram line: ${e.message}`); }
  }
  const cy = hm.ground(cx, cz);

  // UI
  for (const el of document.querySelectorAll("[data-layer]")) el.addEventListener("change", () => { layers[el.dataset.layer].visible = el.checked; });
  $("contours").addEventListener("change", (e) => { contourOn.value = e.target.checked ? 1 : 0; });

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  const walker = new Walker(camera, renderer.domElement, world);
  const atP = params.get("at")?.split(",").map(Number);
  const start = atP?.length === 2 ? roadStart(roads, atP[0], atP[1], bounds)
    : TILE === "I6" ? roadStart(roads, 1153.1, 540.1, bounds) : roadStart(roads, cx, cz, bounds);   // ?at=, else Place de Saint-Job on I6
  if (!start) $("btnWalk").disabled = true;
  const yawP = params.get("yaw");                                        // ?yaw=deg: walk facing (0 = -z / north-ish, 90 = -x)
  const walk = () => { if (!start) return; if (third?.on) third.stop(); flyer.stop(); driver.stop(); controls.enabled = false; walker.start(start.x, start.z, yawP != null ? +yawP * Math.PI / 180 : start.yaw); };
  // fly mode (viewer/flight.js): a bird from above Place de Saint-Job (or the walk start), heading the walk's way
  const flyer = new Flyer(camera, renderer.domElement, scene, world);
  window.__flyer = flyer;
  let flyerGltf = null;
  // the bird model: models/bird/bird.glb (the owner's, with its animations), or ?bird=<url>; the placeholder
  // stays when there is none. ?birdscale= if the model is not in metres, ?birdfwd=+z|-z|+x|-x for its nose axis.
  (async () => {
    const dir = new URL("../models/bird/", import.meta.url).href;
    const cfg0 = await fetch(dir + "bird.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const url = params.get("bird") || dir + (cfg0.model || "bird.glb");
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (!head.ok) return;
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(url);
      // its settings beside it (models/bird/bird.json: nose axis, scale, clip names); the URL overrides them
      const cfg = params.get("bird") ? {} : cfg0;
      const clips = flyer.setModel(gltf, { scale: +(params.get("birdscale") ?? cfg.scale ?? 1), forward: params.get("birdfwd") || cfg.forward || "-z", clips: cfg.clips });
      log(`bird: ${url.split("/").pop()}, clips ${JSON.stringify(clips)}`);
      flyerGltf = gltf;
      // the player is the family's young of the year (the nest start): juvenile plumage (bird.json playerSkin,
      // models/bird/juvenile.jpg on peregrine.glb's UVs; ?birdskin=adult = the adult's) and a perched pose
      if (!params.get("bird")) {
        const { perchClipFor } = await import("./falcons.js");
        flyer.addPerchClip(perchClipFor(gltf.scene));
        const skin = params.get("birdskin") === "adult" ? null : cfg0.playerSkin;
        if (skin) {
          const tex = await new THREE.TextureLoader().loadAsync(dir + skin);
          tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
          gltf.scene.traverse((o) => { if (o.isMesh && o.material?.map) { o.material.map = tex; o.material.needsUpdate = true; } });
        }
      }
    } catch (e) { log(`bird model: ${e.message}`); }
  })();
  // from the Saint-Job eyrie (the nest start: the young falcon's first flight, viewer/flight.js startFromNest), or
  // ?flystart=spire: the tip of the spire (data/overrides.json flyStart), else above the walk start
  const fly = async () => {
    if (third?.on) third.stop(); walker.on = false; driver.stop(); controls.enabled = false;
    // (at boot, ?view=fly: wait up to 15 s for the family and the bird to load)
    for (let i = 0; i < 150 && (!falconsReady || !flyerGltf) && params.get("falcons") !== "0" && params.get("flystart") !== "spire"; i++) await new Promise((r) => setTimeout(r, 100));
    // the intro plays in view: not under the boot cover
    for (let i = 0; i < 600 && !document.getElementById("cover")?.classList.contains("gone"); i++) await new Promise((r) => setTimeout(r, 100));
    const fam = falconsReady;
    if (fam && params.get("flystart") !== "spire" && flyerGltf) {
      const { FALCON_SIZES } = await import("./falcons.js");
      const sp = fam.spots.hop, L = fam.perch.ledge;
      const scrape = fam.toWorld(fam.nestPoint(sp.pos.x, sp.pos.y, sp.pos.z));
      const ledge = fam.toWorld(L.pos.clone());
      const out = L.facing.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), fam.group.rotation.y);
      const span = 6.44 * +(params.get("birdscale") ?? 0.42);
      fam.makeRoom();
      flyer.startFromNest({ scrape, ledge, out, life: FALCON_SIZES.juvenile / span });
      return;
    }
    const fs = (await loadOverrides(DATA)).flyStart;
    if (fs) flyer.start(fs.x, fs.z, Math.atan2(-(fs.toward[0] - fs.x), -(fs.toward[1] - fs.z)), fs.y);
    else { const s = start || { x: cx, z: cz, yaw: 0 }; flyer.start(s.x, s.z, yawP != null ? +yawP * Math.PI / 180 : s.yaw); }
  };
  flyer.onExit = () => setView("stjob");
  // drive mode (viewer/drive/): the hatchback on a street near Saint-Job church (the fly start), ?at=x,z elsewhere
  const driver = new Driver(camera, renderer.domElement, scene, world);
  window.__driver = driver;
  if (HIDE_BU_IDS.length) loadStJob().then((m) => driver.addStatic(stjobColliders(m.placement))).catch(() => {});   // the church's front steps
  const drive = () => {
    const [px, pz] = atP?.length === 2 ? atP : [1201.6, 549.3];
    const s = roadStart(roads, px, pz, bounds) || start;
    if (!s) return;
    if (third?.on) third.stop(); walker.on = false; flyer.stop(); controls.enabled = false;
    let h = s.yaw + Math.PI;                                       // walk yaw -> car heading (forward = sin h, cos h)
    if (TILE === "I6" && !atP && Math.sin(h) * (1153 - s.x) + Math.cos(h) * (540 - s.z) < 0) h += Math.PI;   // face the church
    driver.start(s.x - Math.cos(h) * 1.6, s.z + Math.sin(h) * 1.6, h);   // keep right
  };
  driver.onExit = () => setView("stjob");
  const views = {
    overview: () => { camera.position.set(cx - 330, cy + 300, cz + 400); controls.target.set(cx, cy, cz); },
    stjob: () => {   // ?at=x,z, else Place de Saint-Job on I6, else the tile centre
      const at = params.get("at")?.split(",").map(Number);
      const [x, z] = at?.length === 2 ? at : TILE === "I6" ? [1153, 540] : [cx, cz], y = hm.surface(x, z);
      const cam = params.get("cam")?.split(",").map(Number);           // ?cam=x,z,height-above-ground
      if (cam?.length === 3) camera.position.set(cam[0], hm.surface(cam[0], cam[1]) + cam[2], cam[1]);
      else camera.position.set(x + 70, y + 45, z + 110);
      controls.target.set(x, y + (cam?.length === 3 ? 12 : 0), z);
    },
  };
  let third = null;                       // the third-person character (?view=third), see below
  const setView = (v) => { if (third?.on) third.stop(); walker.on = false; flyer.stop(); driver.stop(); controls.enabled = true; views[v](); controls.update(); lighting.snapNext = true; };
  walker.onExit = () => setView("stjob");
  $("btnOrbit").onclick = () => setView("overview");
  $("btnStJob").onclick = () => setView("stjob");
  $("btnWalk").onclick = walk;
  $("btnFly").onclick = fly;
  $("btnDrive").onclick = drive;
  const v0 = params.get("view") || (params.get("at") ? "stjob" : null);   // ?at=x,z&view=walk stands on the nearest road
  if (v0 === "walk") walk(); else if (v0 === "drive") { setView("overview"); drive(); } else if (v0 === "fly") { setView("overview"); fly(); } else setView(v0 === "stjob" ? "stjob" : "overview");
  // third person: a character on foot (viewer/character/cityHook.js, Capsule Lab); the button, ?view=third, the dev panel
  let thirdBoot = null;                   // one start only, however many callers (button, ?view=third, a shared link)
  const thirdPerson = async () => {
    walker.on = false; flyer.stop(); driver.stop(); controls.enabled = false;
    try {
      if (!third) third = await (thirdBoot ||= import("./character/cityHook.js").then((m) => m.startThirdPerson({ scene, camera, renderer, controls, world, start, setView, log })));
      else third.resume();
    } catch (e) { log(`third person: ${e.message}`); controls.enabled = true; }
  };
  $("btnThird").onclick = thirdPerson;
  if (v0 === "third") thirdPerson();
  // ?interior=1: the pilot interior cell (viewer/interior/cityInterior.js; Interior Lab first)
  if (params.get("interior") === "1") import("./interior/cityInterior.js").then((m) => m.startCityInterior({ scene, renderer, camera, lighting, updaters, getThird: () => third, log })).catch((e) => log(`interior: ${e.message}`));

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, frames = 0;
  let stateFreeze = false;       // the smoothness harness (viewer.stateAt): LOD and shadow state set by hand
  const info = renderer.info;
  // GPU time: r187's resolve returns the total of every pass (shadows, scene, post) of the LAST frame
  // it has queries for (each query uid ends in ":f<frame>"), and keeps per-pass times in
  // backend.timestampQueryPool.render.timestamps. fps is capped by vsync; this is the number to watch
  // for headroom (16.7 ms = the 60 Hz budget).
  const gpu = { avg: 0, worst: 0, worstWin: 0, winT: 0, samples: [], pending: false };
  const sampleGpu = () => {
    if (!gpuTiming || gpu.pending || !renderer.backend.trackTimestamp) return;
    gpu.pending = true;
    renderer.resolveTimestampsAsync("render").then((ms) => {
      if (typeof ms === "number" && ms > 0) {
        const per = ms;
        gpu.avg = gpu.avg ? gpu.avg * 0.9 + per * 0.1 : per;
        gpu.worstWin = Math.max(gpu.worstWin, per);
        gpu.samples.push(per); if (gpu.samples.length > 600) gpu.samples.shift();
        const now = performance.now();
        if (now - gpu.winT > 1000) { gpu.worst = gpu.worstWin; gpu.worstWin = 0; gpu.winT = now; }
      }
    }).catch(() => {}).finally(() => { gpu.pending = false; });
  };
  // Render pipeline: AO + reflections + bloom + grade (?fx=0: plain render, for slow machines)
  const fx = params.get("fx") !== "0";
  await lighting.attach(camera);                      // Firmament's sky needs the camera (no-op for ?sky=old)
  const pipe = fx ? createPipeline(renderer, scene, camera, { aoOn: params.get("ao") !== "0", ssrOn: params.get("ssr") !== "0" }) : null;   // ?ao=0 ?ssr=0: A/B
  if (pipe) { pipe.setExposureScale(lighting.exposureScale); pipe.look(timeId); }
  if (params.get("precompile") !== "0") compileFor = (roots) => precompile(renderer, roots, camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });   // ?precompile=0: A/B
  else { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = lighting.exposureScale; }
  const focus = new THREE.Vector3(), fwd = new THREE.Vector3();
  const hazeHook = lighting.firmament ? (rt, d, size) => lighting.hazeHook(rt, d, size) : null;   // ?haze=0: off
  const dev = { haze: params.get("haze") !== "0" };    // live switches (the dev panel)
  const renderFrame = () => (pipe ? pipe.render(dev.haze ? hazeHook : null) : renderer.render(scene, camera));
  const tsel = $("timeSel");
  for (const k of Object.keys(PRESETS)) tsel.add(new Option(k, k, false, k === timeId));
  tsel.onchange = () => { lighting.apply(tsel.value); pipe?.look(tsel.value); };
  renderer.setAnimationLoop(() => {
    if (flyer.on) focus.set(flyer.x, flyer.pos.y, flyer.z).addScaledVector(camera.getWorldDirection(fwd).setY(0).normalize(), 60);
    else if (walker.on || driver.on) focus.copy(camera.position).addScaledVector(camera.getWorldDirection(fwd).setY(0).normalize(), 45);
    else focus.copy(controls.target);
    const half = flyer.on ? THREE.MathUtils.clamp((flyer.pos.y - world.surface(flyer.x, flyer.z)) * 1.6 + 90, 90, 380)   : walker.on || driver.on ? 80 : THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380);
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!stateFreeze) lighting.update(camera.position.y, world.surface(camera.position.x, camera.position.z), focus, half, dt);
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (third?.on) third.update(dt); else if (flyer.on) flyer.update(dt); else if (driver.on) driver.update(dt); else if (walker.on) walker.update(dt); else controls.update();
    fader.update(dt);
    if (!stateFreeze) { lodEye.value.copy(camera.position); for (const u of updaters) u(camera.position, camera); }
    renderFrame();
    if (pipe && lighting.firmament) pipe.setExposureFactor(lighting.adapt(dt));
    sampleGpu();
    frames++;
    if (frames % 10 === 1) {
      const r = info.render;
      $("stats").textContent =
        `${backend}  ${fps.toFixed(0)} fps` + (gpu.avg ? `  GPU ${gpu.avg.toFixed(2)} ms (worst ${gpu.worst.toFixed(1)})` : "") + `\n` +
        `draw calls ${r.drawCalls ?? r.calls}  triangles ${(r.triangles / 1000).toFixed(0)}k\n` +
        `cam x ${camera.position.x.toFixed(0)} z ${camera.position.z.toFixed(0)} y ${camera.position.y.toFixed(1)} m TAW` +
        (tramLine ? `\n${tramLine.info().split(". Source")[0]}` : "");
    }
  });
  // Streaming: full-detail tiles within `ring` of the tile under the player (?ring=, default 1),
  // far-LOD tiles out to `far` (?far=, default 3, 0 = none). Hysteresis of one tile for unloading.
  // One full tile per step (nearest first), then up to two lite tiles. Checked every second.
  const ring = Math.max(0, Math.min(2, +(params.get("ring") ?? 1)));
  const far = Math.max(ring, Math.min(6, +(params.get("far") ?? 3)));
  const T = x1 - x0;
  const centre = (t) => [(t.bounds.x[0] + t.bounds.x[1]) / 2, (t.bounds.z[0] + t.bounds.z[1]) / 2];
  const liteGroup = new THREE.Group();
  liteGroup.name = "far-lod";
  scene.add(liteGroup);
  const lite = new Map();                 // name -> lite tile
  const pending = new Set();
  let busy = null, firstLite = !!bootPipes;
  /** Fade a tile's groups out, then dispose it (at once with ?tilefade=0). */
  const retire = async (groups, dispose) => {
    if (!TILE_FADE) { dispose(); return; }
    const px = groups.map(fadeProxies).filter(Boolean);     // fading copies it has none of yet: built first
    if (px.length && compileFor) await compileFor(px);
    let n = groups.length;
    for (const g of groups) fader.fade(g, -1, () => { if (--n === 0) dispose(); });
  };
  const stream = async (liteFirst = false) => {   // liteFirst: skip the full tiles this step (boot warm-up)
    // the manifest tile under (or nearest to) the player / orbit target, loaded or not
    const px = flyer.on ? flyer.x : driver.on ? driver.x : walker.on ? walker.x : controls.target.x, pz = flyer.on ? flyer.z : driver.on ? driver.z : walker.on ? walker.z : controls.target.z;
    const built = manifest.tiles.filter((t) => t.status !== "missing");
    const cell = built.map((t) => {
      const dx = Math.max(t.bounds.x[0] - px, 0, px - t.bounds.x[1]), dz = Math.max(t.bounds.z[0] - pz, 0, pz - t.bounds.z[1]);
      return [dx * dx + dz * dz, t];
    }).sort((a, b) => a[0] - b[0])[0][1];
    const [hx, hz] = centre(cell);
    const here = world.tiles.find((t) => t.name === cell.name);
    const dist = (t) => { const [tx, tz] = centre(t); return Math.max(Math.abs(tx - hx), Math.abs(tz - hz)) / T; };
    const byName = (n) => built.find((m) => m.name === n);
    for (const t of [...world.tiles]) {
      if (t !== here && dist(byName(t.name)) > ring + 1.01 && world.tiles.length > 1) {
        world.tiles.splice(world.tiles.indexOf(t), 1);
        // smooth LOD: its far tile first, then the full one fades out over it (no hole, no pop)
        if (TILE_FADE && far > ring && dist(byName(t.name)) <= far + 0.01 && !lite.has(t.name) && !pending.has(t.name)) {
          pending.add(t.name);
          try { const l = await loadLiteTile(byName(t.name), liteGroup); lite.set(t.name, l); fader.fade(l.group, +1); } catch (e) { log(`far tile ${t.name} failed: ${e.message}`); }
          pending.delete(t.name);
        }
        retire(t.groups, t.dispose);
        log(`- tile ${t.name}`);
      }
    }
    for (const [n, l] of lite) if (dist(byName(n)) > far + 1.01 || world.tiles.some((w) => w.name === n)) { lite.delete(n); retire([l.group], l.dispose); }
    const want = built.filter((t) => dist(t) <= ring + 0.01 && !world.tiles.some((w) => w.name === t.name)).sort((a, b) => dist(a) - dist(b));
    if (!liteFirst) for (const t of want) {
      if (pending.has(t.name)) continue;
      pending.add(t.name);
      const t0 = performance.now();
      try {
        world.tiles.push(await loadTile(t, { layers, contourOn, verbose: false }));   // (fades in by itself)
        const old = lite.get(t.name);
        lite.delete(t.name);
        if (old) retire([old.group], old.dispose);
        log(`+ tile ${t.name} (${(performance.now() - t0).toFixed(0)} ms)`);
      } catch (e) { log(`tile ${t.name} failed: ${e.message}`); }
      pending.delete(t.name);
      return true;                                // one full tile per step: re-check where the player is
    }
    // far LOD: tiles not loaded in full, within `far`, nearest first (two per step)
    const wantLite = built.filter((t) => dist(t) <= far + 0.01 && (!liteFirst || dist(t) > ring + 0.01) && !lite.has(t.name) && !world.tiles.some((w) => w.name === t.name) && !pending.has(t.name))
      .sort((a, b) => dist(a) - dist(b)).slice(0, 2);
    await Promise.all(wantLite.map(async (t) => {
      pending.add(t.name);
      try { const l = await loadLiteTile(t, liteGroup); lite.set(t.name, l); if (firstLite) firstLite = false; else fader.fade(l.group, +1); } catch (e) { log(`far tile ${t.name} failed: ${e.message}`); }
      pending.delete(t.name);
    }));
    if (wantLite.length && !want.length && built.filter((t) => dist(t) <= far + 0.01 && !lite.has(t.name) && !world.tiles.some((w) => w.name === t.name)).length === 0)
      log(`far LOD: ${lite.size} tiles (out to ring ${far}), full: ${world.tiles.map((t) => t.name).join(" ")}`);
    return wantLite.length > 0;
  };
  // every pipeline compiled under the cover before it lifts; streamed tiles then reuse them.
  // One neighbour tile and the first far tiles load under the cover too: the first material built
  // emits its shared TSL functions in a different order than all later ones (same code, other WGSL
  // text, so one more compile), and far tiles have their own shaders.
  if (bootPipes) {
    // the tiles streamed under the cover hold their fade (smooth LOD): the warm-up then compiles their fading
    // copies too (lodFade.js fadeVariant); the first far tile does not fade, so its own materials compile
    fader.hold = true;
    if (ring > 0) await stream();
    if (far > ring) await stream(true);
    // ?interior=1: the interior cell's materials compile under the cover too (stand-in meshes with its exact
    // attribute layouts; the cell streaming in later then builds no shader: viewer/interior/interiorModel.js)
    const interiorWarm = params.get("interior") === "1" ? await import("./interior/interiorModel.js").then((m) => m.interiorWarmup()).catch(() => null) : null;
    if (interiorWarm) scene.add(interiorWarm);
    const w = await warmBoot(renderer, scene, bootPipes);
    interiorWarm?.removeFromParent();
    fader.hold = false;
    log(`warm-up: ${w.ms} ms, ${w.warmed} drawables, ${w.parallel} pipelines compiled in parallel, ${w.late} after`);
  }
  $("cover").classList.add("gone");
  const loading = (async () => { while (await stream()); })();   // initial fill around the start tile
  busy = loading.finally(() => { busy = null; });
  setInterval(() => { if (!busy) busy = stream().finally(() => { busy = null; }); }, 1000);
  // gpuStats(): GPU ms per frame over the last ≤600 samples (avg, p50, p95, max), for measurements
  const gpuStats = () => {
    const s = [...gpu.samples].sort((a, b) => a - b), q = (p) => s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : null;
    return { n: s.length, avg: s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : null, p50: q(0.5), p95: q(0.95), max: q(1) };
  };
  // gpuPasses(): ms per render pass of the last resolved frame, biggest first (uid minus the frame suffix)
  const gpuPasses = () => {
    const t = renderer.backend.timestampQueryPool?.render?.timestamps;
    if (!t) return null;
    const agg = {};
    for (const [uid, ms] of t) { const k = uid.replace(/:f\d+$/, ""); agg[k] = (agg[k] || 0) + ms; }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, ms]) => [k, +ms.toFixed(3)]);
  };
  // the dev panel (viewer/devPanel.js; ?panel=0: the old HUD only)
  if (params.get("panel") !== "0") {
    try {
      const { createDevPanel } = await import("./devPanel.js");
      createDevPanel({ renderer, scene, camera, controls, lighting, pipe, world, layers, contourOn, setView, walk, fly, drive, thirdPerson, driver, getThird: () => third, getTram: () => tramLine, flyer, walker, tsel, dev, gpuStats, resetGpu: () => { gpu.samples.length = 0; }, params, log, fader });
    } catch (e) { log(`dev panel: ${e.message}`); }
  }
  // stateAt(pos, focus, half, dt): the smoothness harness (docs/SMOOTH_LOD.md): every LOD, fade and the shadow box
  // as if the camera were at `pos` (looking at `focus`), while the view camera stays where it is; freeze(true)
  // keeps the animation loop from resetting it. Frames rendered that way show only what the LOD state changes.
  const stateAt = (pos, f = pos, h = 80, dtS = 1 / 60) => {
    lodEye.value.copy(pos);
    for (const u of updaters) u(pos, camera);
    lighting.update(pos.y, world.surface(pos.x, pos.z), f, h, dtS);
  };
  window.viewer = { tram: () => tramLine, loading, lite, controls, scene, camera, renderer, net, hm, frames: () => frames, setView, lighting, gpuStats, gpuPasses, resetGpu: () => { gpu.samples.length = 0; },
    world, fader, stateAt, freeze: (on) => { stateFreeze = !!on; },
    renderFrame: () => { if (!stateFreeze) { lodEye.value.copy(camera.position); for (const u of updaters) u(camera.position, camera); } renderFrame(); } };
}

main().catch((e) => { log(`ERROR: ${e.message}`); console.error(e); });
