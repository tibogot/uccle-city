// Minimal 3D viewer for one tile (default G4): terrain, UrbIS buildings, road-engine roads.
// Serve the repo root (python3 -m http.server 8000) and open /viewer/index.html?tile=G4.
//
// Scene units are CONTRACT local metres: +x east, +z south, +y up (absolute m TAW).
// Everything is built on the main thread at load (about 1 s for G4).

import * as THREE from "three/webgpu";
import {
  color, float, uniform, positionWorld, normalWorld, fract, min, fwidth, smoothstep, mix, abs,
} from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";
import { buildLaneRoadMesh } from "../vendor/roads/mesh/laneRoadMesh.js";
import { asphaltMaterial, concreteMaterial, vergeMaterial, surfaceAttribute } from "./roadPaint.js";
import { buildingMeshes as facadeMeshes } from "./facades.js";
import { Lighting, PRESETS } from "./lighting.js";
import { createPipeline } from "./post.js";
import { buildTrees } from "./trees.js";

const DATA = new URL("../data/tiles/", import.meta.url);
const params = new URLSearchParams(location.search);
const TILE = (params.get("tile") || "G4").toUpperCase();
const EYE = 1.7;            // walk-mode eye height (m)
const CARVE = 0.12;         // terrain is pushed this far under any road surface

const $ = (id) => document.getElementById(id);
const logLines = [];
const log = (s) => { logLines.push(s); $("log").textContent = logLines.join("\n"); console.log(s); };
const timed = async (label, fn) => { const t = performance.now(); const r = await fn(); log(`${label}: ${(performance.now() - t).toFixed(0)} ms`); return r; };
const getJSON = async (p) => { const r = await fetch(new URL(p, DATA)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
const getBin = async (p) => { const r = await fetch(new URL(p, DATA)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.arrayBuffer(); };

// ------------------------------------------------------------------ terrain grid

class Heightmap {
  constructor(hdr, buf) {
    this.h = hdr;
    const raw = new Uint16Array(buf);
    this.y = new Float32Array(raw.length);
    let lo = Infinity;
    for (let k = 0; k < raw.length; k++) if (raw[k] !== hdr.nodata) lo = Math.min(lo, raw[k]);
    for (let k = 0; k < raw.length; k++) this.y[k] = (raw[k] === hdr.nodata ? lo : raw[k]) / 100;
    this.orig = this.y.slice();   // un-carved, for the road engine's ground()
  }
  /** Bilinear lookup; points outside the tile are clamped to the edge (neighbour tiles aren't loaded). */
  sample(arr, x, z) {
    const h = this.h;
    const c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1);
    const r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
    const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
    const fc = c - c0, fr = r - r0, i = r0 * h.cols + c0;
    return (arr[i] * (1 - fc) + arr[i + 1] * fc) * (1 - fr) + (arr[i + h.cols] * (1 - fc) + arr[i + h.cols + 1] * fc) * fr;
  }
  ground = (x, z) => this.sample(this.orig, x, z);
  surface = (x, z) => this.sample(this.y, x, z);

  /** Push the grid under the given triangles (local xyz arrays + index) to `y − depth`, then one ring of neighbours. */
  carve(position, index, depth) {
    const { x0, z0, cols, rows, step } = this.h;
    const carved = new Uint8Array(cols * rows);
    const Y = this.y;
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ax = position[a], az = position[a + 2], bx = position[b], bz = position[b + 2], cx = position[c], cz = position[c + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / step)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx, cx) - x0) / step));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - z0) / step)), r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz, cz) - z0) / step));
      for (let r = r0; r <= r1; r++) {
        const pz = z0 + r * step;
        for (let cc = c0; cc <= c1; cc++) {
          const px = x0 + cc * step;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const y = l1 * position[a + 1] + l2 * position[b + 1] + l3 * position[c + 1] - depth;
          const k = r * cols + cc;
          if (y < Y[k]) Y[k] = y;
          carved[k] = 1;
        }
      }
    }
    // One-cell shoulder so terrain triangles that straddle a road edge don't poke through it.
    const out = Y.slice();
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (carved[k]) { n++; continue; }
      let best = Infinity;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const kk = rr * cols + cc;
        if (carved[kk]) best = Math.min(best, Y[kk] + 0.05);
      }
      if (best < out[k]) out[k] = best;
    }
    this.y = out;
    return n;
  }
}

function terrainMesh(hm, contourOn) {
  const { x0, z0, cols, rows, step } = hm.h;
  const pos = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c;
    pos[k * 3] = x0 + c * step; pos[k * 3 + 1] = hm.y[k]; pos[k * 3 + 2] = z0 + r * step;
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let o = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols, cc = a + 1, d = b + 1;   // (a, b, c) faces +y with +z = south
    idx[o++] = a; idx[o++] = b; idx[o++] = cc;
    idx[o++] = cc; idx[o++] = b; idx[o++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();

  // TSL: green low ground → paler high ground, earthy on slopes, optional 1 m / 5 m contour lines.
  const h = positionWorld.y;
  const lo = float(hm.h.min), hi = float(hm.h.max);
  const t = smoothstep(lo, hi, h);
  const base = mix(color(0x58733d), color(0x8f9a5c), t);
  const slope = smoothstep(float(0.93), float(0.75), normalWorld.y);
  let col = mix(base, color(0x7d6a4f), slope);
  const line = (period, width) => {
    const f = fract(h.div(period));
    const d = min(f, f.oneMinus()).mul(period);
    return float(1).sub(smoothstep(float(0), fwidth(h).mul(width), d));
  };
  const lines = mix(line(1, 1.0).mul(0.35), float(0.8), line(5, 1.4));
  col = mix(col, color(0x2b2418), lines.mul(contourOn));
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  m.colorNode = col;
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  mesh.name = "terrain";
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

/** Keep only triangles whose centroid is inside the tile (the 150 m buffer is for complete junctions only). */
function clipToTile(part, b) {
  const p = part.position, src = part.index, keep = [];
  for (let t = 0; t < src.length; t += 3) {
    const a = src[t] * 3, bb = src[t + 1] * 3, c = src[t + 2] * 3;
    const x = (p[a] + p[bb] + p[c]) / 3, z = (p[a + 2] + p[bb + 2] + p[c + 2]) / 3;
    if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) keep.push(src[t], src[t + 1], src[t + 2]);
  }
  return Uint32Array.from(keep);
}

function roadMeshes(net, hm, bounds) {
  const built = buildLaneRoadMesh(net, { markings: true });
  const mats = { asphalt: asphaltMaterial(built.atlas), concrete: concreteMaterial(), grass: vergeMaterial() };
  if (built.atlas) log(`marking atlas: ${built.atlas.width}x${built.atlas.height} at ${(built.atlas.texel * 100).toFixed(1)} cm, ${built.atlas.stats.regions} junctions`);
  const meshes = [];
  let carvedCells = 0, tris = 0;
  for (const name of ["asphalt", "concrete", "grass"]) {
    const part = built[name];
    if (!part.vertexCount) continue;
    const index = clipToTile(part, bounds);
    carvedCells += hm.carve(part.position, index, CARVE);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(part.uv, 2));
    for (const [k, a] of Object.entries(part.attributes)) g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize));
    if (name === "asphalt") g.setAttribute("aSurf", new THREE.BufferAttribute(surfaceAttribute(net, part), 1));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    const m = new THREE.Mesh(g, mats[name]);
    m.receiveShadow = true;
    m.name = `roads-${name}`;
    meshes.push(m);
    tris += index.length / 3;
  }
  return { meshes, stats: built.stats, carvedCells, triangles: tris };
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
  const T = buildTrees(f.trees || [], (x, z) => hm.surface(x, z), inTile);
  group.add(T.group);
  log(`trees: ${T.count} (LiDAR canopy peaks + OSM)`);
  return group;
}

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
    const { x0, z0, size } = this.hm.h;
    this.x = Math.min(Math.max(this.x, x0), x0 + size); this.z = Math.min(Math.max(this.z, z0), z0 + size);
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

  const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: params.get("rdepth") !== "0" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.prepend(renderer.domElement);
  await renderer.init();
  const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";
  log(`renderer: ${backend}`);

  const scene = new THREE.Scene();
  const timeId = PRESETS[params.get("time")] ? params.get("time") : "golden";
  const lighting = new Lighting(scene, renderer, timeId, { sunLight: params.get("sunlight") === "1" });
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  const [tHdr, tBuf, bDoc, bBuf, roads, feats] = await timed("fetch", () => Promise.all([
    getJSON(F.terrainHeader), getBin(F.terrain), getJSON(F.buildings), getBin(F.buildingsBin), getJSON(F.roads), getJSON(F.features),
  ]));
  const hm = new Heightmap(tHdr, tBuf);
  const cy = hm.ground(cx, cz);


  const layers = { terrain: new THREE.Group(), buildings: new THREE.Group(), roads: new THREE.Group(), features: new THREE.Group() };
  for (const g of Object.values(layers)) scene.add(g);

  // Roads first: they carve the heightmap the terrain mesh is built from.
  const net = await timed("buildRoadNetwork", () => buildRoadNetwork(roads, { ground: hm.ground }));
  const errors = net.issues.filter((i) => i.level === "error");
  const byCode = {};
  for (const i of errors) byCode[i.code] = (byCode[i.code] || 0) + 1;
  log(`road engine: ${net.roads.length} roads, ${net.nodes.length} nodes, ${errors.length} errors ${JSON.stringify(byCode)}, ${net.issues.length - errors.length} warnings/info`);
  const R = await timed("road meshes + carve", () => roadMeshes(net, hm, bounds));
  layers.roads.add(...R.meshes);

  const contourOn = uniform(0);
  layers.terrain.add(await timed("terrain mesh", () => terrainMesh(hm, contourOn)));
  const B = await timed("building meshes + façades", () => facadeMeshes(bDoc, bBuf, roads));
  log(`façades: ${B.stats.faces} wall faces, ${B.stats.party} party walls, ${B.stats.street} facing a street`);
  layers.buildings.add(...B.meshes);
  layers.features.add(featureObjects(feats, hm, bounds));
  log(`buildings: ${bDoc.count} (${B.triangles} triangles), roads: ${R.triangles} triangles in tile, terrain cells carved: ${R.carvedCells}`);

  // UI
  for (const el of document.querySelectorAll("[data-layer]")) el.addEventListener("change", () => { layers[el.dataset.layer].visible = el.checked; });
  $("contours").addEventListener("change", (e) => { contourOn.value = e.target.checked ? 1 : 0; });

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  const walker = new Walker(camera, renderer.domElement, hm);
  const atP = params.get("at")?.split(",").map(Number);
  const start = atP?.length === 2 ? roadStart(roads, atP[0], atP[1], bounds)
    : TILE === "G4" ? roadStart(roads, 1153.1, 540.1, bounds) : roadStart(roads, cx, cz, bounds);   // ?at=, else Place de Saint-Job on G4
  if (!start) $("btnWalk").disabled = true;
  const walk = () => { if (!start) return; controls.enabled = false; walker.start(start.x, start.z, start.yaw); };
  const views = {
    overview: () => { camera.position.set(cx - 330, cy + 300, cz + 400); controls.target.set(cx, cy, cz); },
    stjob: () => {   // ?at=x,z, else Place de Saint-Job on G4, else the tile centre
      const at = params.get("at")?.split(",").map(Number);
      const [x, z] = at?.length === 2 ? at : TILE === "G4" ? [1153, 540] : [cx, cz], y = hm.surface(x, z);
      const cam = params.get("cam")?.split(",").map(Number);           // ?cam=x,z,height-above-ground
      if (cam?.length === 3) camera.position.set(cam[0], hm.surface(cam[0], cam[1]) + cam[2], cam[1]);
      else camera.position.set(x + 70, y + 45, z + 110);
      controls.target.set(x, y + (cam?.length === 3 ? 12 : 0), z);
    },
  };
  const setView = (v) => { walker.on = false; controls.enabled = true; views[v](); controls.update(); };
  walker.onExit = () => setView("stjob");
  $("btnOrbit").onclick = () => setView("overview");
  $("btnStJob").onclick = () => setView("stjob");
  $("btnWalk").onclick = walk;
  const v0 = params.get("view") || (params.get("at") ? "stjob" : null);   // ?at=x,z&view=walk stands on the nearest road
  if (v0 === "walk") walk(); else setView(v0 === "stjob" ? "stjob" : "overview");

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, frames = 0;
  const info = renderer.info;
  // Render pipeline: AO + reflections + bloom + grade (?fx=0: plain render, for slow machines)
  const fx = params.get("fx") !== "0";
  const pipe = fx ? createPipeline(renderer, scene, camera) : null;
  if (pipe) pipe.look(timeId); else renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const focus = new THREE.Vector3(), fwd = new THREE.Vector3();
  const renderFrame = () => (pipe ? pipe.render() : renderer.render(scene, camera));
  const tsel = $("timeSel");
  for (const k of Object.keys(PRESETS)) tsel.add(new Option(k, k, false, k === timeId));
  tsel.onchange = () => { lighting.apply(tsel.value); pipe?.look(tsel.value); };
  renderer.setAnimationLoop(() => {
    if (walker.on) focus.copy(camera.position).addScaledVector(camera.getWorldDirection(fwd).setY(0).normalize(), 45);
    else focus.copy(controls.target);
    const half = walker.on ? 80 : THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.9, 60, 380);
    lighting.update(camera.position.y, hm.surface(camera.position.x, camera.position.z), focus, half);
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (walker.on) walker.update(dt); else controls.update();
    renderFrame();
    frames++;
    if (frames % 10 === 1) {
      const r = info.render;
      $("stats").textContent =
        `${backend}  ${fps.toFixed(0)} fps\n` +
        `draw calls ${r.drawCalls ?? r.calls}  triangles ${(r.triangles / 1000).toFixed(0)}k\n` +
        `cam x ${camera.position.x.toFixed(0)} z ${camera.position.z.toFixed(0)} y ${camera.position.y.toFixed(1)} m TAW`;
    }
  });
  window.viewer = { scene, camera, renderer, net, hm, frames: () => frames, setView, renderFrame, lighting };
}

main().catch((e) => { log(`ERROR: ${e.message}`); console.error(e); });
