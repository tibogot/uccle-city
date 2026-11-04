// Minimal 3D viewer for one tile (default I6): terrain, UrbIS buildings, road-engine roads.
// Serve the repo root (python3 -m http.server 8000) and open /viewer/index.html?tile=I6.
//
// Scene units are CONTRACT local metres: +x east, +z south, +y up (absolute m TAW).
// Everything is built on the main thread at load (about 1 s for G4).

import * as THREE from "three/webgpu";
import {
  color, float, uniform, positionWorld, normalWorld, fract, min, fwidth, smoothstep, mix, abs,
} from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildLamps, setLampModel } from "./lamps.js";
import { loadLampModel } from "./lampModel.js";
import { loadStJob, STJOB_LODS, STJOB_BU_ID } from "./stjobModel.js";
import { buildFurniture } from "./furniture.js";
import { buildTram } from "./tram.js";
import { buildCars } from "./cars.js";
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
import { openBootPipelines, warmBoot } from "./warmup.js";
import { buildPlazas, loadOverrides } from "./plazas.js";
import { Flyer } from "./flight.js";
import { addLamps } from "./lampLight.js";

const DATA = new URL("../data/tiles/", import.meta.url);
const params = new URLSearchParams(location.search);
if (params.get("log") === "0") document.getElementById("logBox")?.removeAttribute("open");   // dev log: open by default, ?log=0 closes it
const TILE = (params.get("tile") || "I6").toUpperCase();    // I6 = Saint-Job (it was G4 before the grid grew to all of Uccle)
const EYE = 1.7;            // walk-mode eye height (m)
const CARVE = 0.12;         // terrain is pushed this far under any road surface

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
  const mats = { asphalt: asphaltMaterial(road.atlas), concrete: sharedMat("concrete", concreteMaterial), grass: sharedMat("verge", vergeMaterial) };
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

function featureObjects(f, hm, bounds) {
  const group = new THREE.Group();
  group.name = "features";
  const inTile = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  // Tram rails: two grooved steel rails at standard gauge (1.435 m) along each OSM tram line, laid on
  // the road surface. (Footpaths etc. in features.lines are not drawn here: the 2D debug page has them.)
  const GAUGE = 1.435, RAIL = 0.07, GROOVE = 0.035;
  const steel = [], groove = [];
  const ribbon = (out, pts, off, w) => {
    for (let k = 0; k + 1 < pts.length; k++) {
      const q = [pts[k], pts[k + 1]].map(([x, z, nx, nz]) => [[x + nx * (off - w / 2), z + nz * (off - w / 2)], [x + nx * (off + w / 2), z + nz * (off + w / 2)]]);
      const y = (p) => hm.surface(p[0], p[1]) + CARVE + 0.012;
      const [a0, a1] = q[0], [b0, b1] = q[1];
      out.push(a0[0], y(a0), a0[1], b0[0], y(b0), b0[1], a1[0], y(a1), a1[1]);
      out.push(a1[0], y(a1), a1[1], b0[0], y(b0), b0[1], b1[0], y(b1), b1[1]);
    }
  };
  for (const l of f.lines || []) {
    if (l.kind !== "tram") continue;
    const dense = [];
    for (let k = 1; k < l.line.length; k++) {
      const [ax, az] = l.line[k - 1], [bx, bz] = l.line[k];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));      // every metre, so rails follow the ground
      for (let s2 = k === 1 ? 0 : 1; s2 <= n; s2++) dense.push([ax + (bx - ax) * s2 / n, az + (bz - az) * s2 / n]);
    }
    const pts = dense.filter(([x, z]) => inTile(x, z)).map(([x, z], i, arr) => {
      const p = arr[Math.max(0, i - 1)], q = arr[Math.min(arr.length - 1, i + 1)];
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1;
      return [x, z, -dz / L, dx / L];
    });
    if (pts.length < 2) continue;
    for (const side of [-1, 1]) {
      ribbon(steel, pts, side * (GAUGE / 2 + RAIL / 2), RAIL);
      ribbon(groove, pts, side * (GAUGE / 2 - GROOVE / 2), GROOVE);   // the groove on the gauge side
    }
  }
  const mk = (arr, mat, name) => {
    if (!arr.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = name; mesh.receiveShadow = true;
    group.add(mesh);
  };
  const off = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide };
  mk(steel, new THREE.MeshStandardMaterial({ color: 0x9a9da0, metalness: 0.3, roughness: 0.4, ...off }), "tram-rails");
  mk(groove, new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9, ...off }), "tram-grooves");
  // default: game-engine-v1's fog-lab stylized trees (viewer/treesStylized.js); ?trees=slop:
  // slop-newyork's tree system (viewer/treesSlop.js); ?trees=simple: our first leaf-card crowns
  const treeMode = params.get("trees");
  const T = treeMode === "simple" ? buildTrees(f.trees || [], (x, z) => hm.surface(x, z), inTile)
    : treeMode === "slop" ? buildTreeField(f.trees || [], (x, z) => hm.surface(x, z), inTile)
    : buildStylizedTreeField(f.trees || [], (x, z) => hm.surface(x, z), inTile);
  group.add(T.group);
  group.userData.update = T.update || null;
  log(`trees: ${T.count} (LiDAR canopy peaks + OSM)` + (T.sizes ? `, species heights ${T.sizes.map((z) => z.h.toFixed(1)).join("/")} m` : ""));
  return group;
}

let tramLine = null;       // real STIB line 92 on its timetable (tramline.js)
const updaters = [];       // per-frame updates (tree LOD, lamp lights) of every loaded tile

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
    this.camera.position.set(this.x, this.hm.surface(this.x, this.z) + CARVE + EYE, this.z);
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
/** ?roads=surface: tiles that have surfaces.json draw the measured UrbIS street surfaces (viewer/surfaces.js) */
const ROAD_SURFACES = params.get("roads") === "surface";
/** CPU data for a tile: from the worker, or on the main thread (?worker=0, or if the worker fails). */
function tileData(entry, lite = false) {
  entry = { ...entry, hide: HIDE_BU_IDS, surface: ROAD_SURFACES };
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
  group.add(g);
  return {
    name: entry.name,
    dispose: () => {
      g.traverse((o) => { o.geometry?.dispose(); if (o.material && !o.material.userData?.shared) o.material.dispose(); });
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
  const ups = [];
  const t0 = performance.now();
  const d = await tileData(entry);
  let busy = 0, longest = 0, mark = performance.now(), worst = "";
  const frame = (label = "") => { const dt = performance.now() - mark; busy += dt; if (dt > longest) { longest = dt; worst = label; } return new Promise((r) => requestAnimationFrame(() => { mark = performance.now(); r(); })); };   // spread GPU-side work over frames
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
  const fo = featureObjects(feats, hm, bounds);
  own.features.add(fo);
  if (fo.userData.update) ups.push(fo.userData.update);
  await frame("features+trees");
  const lamps = buildLamps(roads, (x, z) => hm.ground(x, z), bounds, { lights: verbose });   // point lights: main tile only
  own.features.add(lamps.group);
  ups.push(lamps.update);
  addLamps(entry.name, lamps.heads);                 // every lamp lights the street (viewer/lampLight.js)
  const furn = buildFurniture(feats, roads, (x, z) => hm.ground(x, z), bounds);
  own.features.add(furn.group);
  const tram = buildTram(feats, (x, z) => hm.surface(x, z) + CARVE, bounds);
  own.features.add(tram.group);
  const cars = buildCars(roads, feats, (x, z) => hm.surface(x, z) + CARVE, bounds);
  own.features.add(cars.group);
  say(`parked cars: ${cars.count} (placed procedurally in the parking lanes)`);
  say(`tram (OSM): ${tram.counts.wireSegments} wire segments, ${tram.counts.poles} poles, ${tram.counts.platforms} platforms, ${tram.counts.shelters} shelters`);
  say(`street furniture (OSM points): ${Object.entries(furn.counts).map(([k, v]) => `${v} ${k}`).join(", ")}`);
  say(`street lamps: ${lamps.count} (placed along the kerbs, ROAD_TYPES lampSpacing; OSM has none here)`);
  say(`buildings: ${d.buildingCount} (${B.triangles} triangles), roads: ${d.road.triangles} triangles in tile, terrain cells carved: ${d.road.carvedCells}; tile ready in ${(performance.now() - t0).toFixed(0)} ms`);

  for (const u of ups) updaters.push(u);
  const dispose = () => {
    for (const u of ups) { const i = updaters.indexOf(u); if (i >= 0) updaters.splice(i, 1); }
    for (const g of Object.values(own)) {
      g.traverse((o) => { if (!o.geometry?.userData?.shared) o.geometry?.dispose(); for (const m of [].concat(o.material || [])) if (!m.userData?.shared) m.dispose?.(); o.dispose?.(); });
      g.removeFromParent();
    }
    for (const t of R.textures) t.dispose();
  };
  tramLine?.snapTile(entry.name, feats, bounds);
  frame("lamps, furniture, tram, cars");
  log(`tile ${entry.name}: main-thread work ${busy.toFixed(0)} ms, longest slice ${longest.toFixed(0)} ms (${worst}); ${tileWorker ? "CPU build in the worker" : "CPU build ALSO on the main thread"}`);
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
  return { name: entry.name, hm, roads, net: ni, bounds, feats, dispose, roofAt };
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
  // the world: the main tile now, its neighbours streamed in after the first frame (?ring=0|1|2)
  const world = {
    tiles: [],
    at(x, z) { return this.tiles.find((t) => x >= t.bounds.x0 && x <= t.bounds.x1 && z >= t.bounds.z0 && z <= t.bounds.z1) || this.tiles[0]; },
    surface(x, z) { return this.at(x, z).hm.surface(x, z); },
    ground(x, z) { return this.at(x, z).hm.ground(x, z); },
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
      const lod = new THREE.LOD();
      lod.name = "stjob";
      STJOB_LODS.forEach((l, k) => lod.addLevel(m.make(k), k ? STJOB_LODS[k - 1].until : 0));
      lod.position.copy(m.placement.position);
      lod.rotation.y = m.placement.rotationY;
      scene.add(lod);
      const p = m.placement.position;
      const home = manifest.tiles.find((t) => p.x >= t.bounds.x[0] && p.x < t.bounds.x[1] && p.z >= t.bounds.z[0] && p.z < t.bounds.z[1])?.name;
      let n = 0;
      updaters.push(() => {
        if (n++ % 30) return;
        lod.visible = world.tiles.some((t) => t.name === home) || !!scene.getObjectByName(`${home}-lite`);
      });
      log(`Saint-Job church: scripted model, LODs ${m.lods.map((l) => l.tris).join(" / ")} triangles (?stjob=0: the UrbIS solid)`);
    }).catch((e) => log(`Saint-Job model failed (${e.message}): the UrbIS solid is hidden, reload with ?stjob=0`));
  }
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
  const walk = () => { if (!start) return; flyer.stop(); controls.enabled = false; walker.start(start.x, start.z, yawP != null ? +yawP * Math.PI / 180 : start.yaw); };
  // fly mode (viewer/flight.js): a bird from above Place de Saint-Job (or the walk start), heading the walk's way
  const flyer = new Flyer(camera, renderer.domElement, scene, world);
  window.__flyer = flyer;
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
    } catch (e) { log(`bird model: ${e.message}`); }
  })();
  // from the tip of the Saint-Job spire (data/overrides.json flyStart), else above the walk start
  const fly = async () => {
    walker.on = false; controls.enabled = false;
    const fs = (await loadOverrides(DATA)).flyStart;
    if (fs) flyer.start(fs.x, fs.z, Math.atan2(-(fs.toward[0] - fs.x), -(fs.toward[1] - fs.z)), fs.y);
    else { const s = start || { x: cx, z: cz, yaw: 0 }; flyer.start(s.x, s.z, yawP != null ? +yawP * Math.PI / 180 : s.yaw); }
  };
  flyer.onExit = () => setView("stjob");
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
  const setView = (v) => { walker.on = false; flyer.stop(); controls.enabled = true; views[v](); controls.update(); };
  walker.onExit = () => setView("stjob");
  $("btnOrbit").onclick = () => setView("overview");
  $("btnStJob").onclick = () => setView("stjob");
  $("btnWalk").onclick = walk;
  $("btnFly").onclick = fly;
  const v0 = params.get("view") || (params.get("at") ? "stjob" : null);   // ?at=x,z&view=walk stands on the nearest road
  if (v0 === "walk") walk(); else if (v0 === "fly") { setView("overview"); fly(); } else setView(v0 === "stjob" ? "stjob" : "overview");

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, frames = 0;
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
    else if (walker.on) focus.copy(camera.position).addScaledVector(camera.getWorldDirection(fwd).setY(0).normalize(), 45);
    else focus.copy(controls.target);
    const half = flyer.on ? THREE.MathUtils.clamp((flyer.pos.y - world.surface(flyer.x, flyer.z)) * 1.6 + 90, 90, 380) : walker.on ? 80 : THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380);
    lighting.update(camera.position.y, world.surface(camera.position.x, camera.position.z), focus, half);
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (flyer.on) flyer.update(dt); else if (walker.on) walker.update(dt); else controls.update();
    for (const u of updaters) u(camera.position, camera);
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
  let busy = null;
  const stream = async (liteFirst = false) => {   // liteFirst: skip the full tiles this step (boot warm-up)
    // the manifest tile under (or nearest to) the player / orbit target, loaded or not
    const px = flyer.on ? flyer.x : walker.on ? walker.x : controls.target.x, pz = flyer.on ? flyer.z : walker.on ? walker.z : controls.target.z;
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
      if (t !== here && dist(byName(t.name)) > ring + 1.01 && world.tiles.length > 1) { t.dispose(); world.tiles.splice(world.tiles.indexOf(t), 1); log(`- tile ${t.name}`); }
    }
    for (const [n, l] of lite) if (dist(byName(n)) > far + 1.01 || world.tiles.some((w) => w.name === n)) { l.dispose(); lite.delete(n); }
    const want = built.filter((t) => dist(t) <= ring + 0.01 && !world.tiles.some((w) => w.name === t.name)).sort((a, b) => dist(a) - dist(b));
    if (!liteFirst) for (const t of want) {
      if (pending.has(t.name)) continue;
      pending.add(t.name);
      const t0 = performance.now();
      try {
        world.tiles.push(await loadTile(t, { layers, contourOn, verbose: false }));
        lite.get(t.name)?.dispose(); lite.delete(t.name);
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
      try { lite.set(t.name, await loadLiteTile(t, liteGroup)); } catch (e) { log(`far tile ${t.name} failed: ${e.message}`); }
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
    if (ring > 0) await stream();
    if (far > ring) await stream(true);
    const w = await warmBoot(renderer, scene, bootPipes);
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
      createDevPanel({ renderer, scene, camera, controls, lighting, pipe, world, layers, contourOn, setView, walk, fly, flyer, walker, tsel, dev, gpuStats, resetGpu: () => { gpu.samples.length = 0; }, params, log });
    } catch (e) { log(`dev panel: ${e.message}`); }
  }
  window.viewer = { loading, lite, controls, scene, camera, renderer, net, hm, frames: () => frames, setView, lighting, gpuStats, gpuPasses, resetGpu: () => { gpu.samples.length = 0; },
    world, renderFrame: () => { for (const u of updaters) u(camera.position, camera); renderFrame(); } };
}

main().catch((e) => { log(`ERROR: ${e.message}`); console.error(e); });
