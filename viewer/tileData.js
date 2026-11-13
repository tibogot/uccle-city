// Everything about loading a tile that does not need three.js or the GPU: fetch, heightmap, the road
// engine (network + lane meshes + marking atlas), terrain carving, the terrain grid and its normals,
// the façade analysis and the land-cover raster. Runs in the tile worker (viewer/tileWorker.js,
// bundled to tileWorker.bundle.js) so loading a tile doesn't freeze the frame; main.js falls back to
// running it on the main thread if the worker can't start. The result is plain data (typed arrays).
import { carvePonds } from "./water/pondBed.js";
import { Heightmap } from "./heightmap.js";
import { analyseBuildings, hash01, wallStyle } from "./facadeGeom.js";
import { landCoverData } from "./landcover.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { buildDriveData } from "./drive/colliders.js";
import { buildRoadData, CARVE } from "./roadBuild.js";
import { smoothPolyline } from "./track.js";
import { kitCollector } from "./facadeKit/placement.js";
import { prepRail, abutmentFill, carveGrid, railTileData, railKeepClear, railVerges, roadDeckGround, roadDeckPins } from "./rail/railData.js";
import { buildTrafficGraph } from "./traffic/trafficGraph.js";

let railP = null;
/** ?trains=1: rail.json + the hero bridges' notes, fetched once per worker */
const railDocs = (base) => (railP ??= Promise.all([
  fetch(new URL("../rail/rail.json", base)).then((r) => r.json()).then(prepRail),
  Promise.all(["stjob", "calevoet", "verrewinkel"].map((n) => fetch(new URL(`../../models/rail/${n}.json`, base)).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((a) => a.filter(Boolean)),
]).then(([doc, heroes]) => ({ doc, heroes })));

export { CARVE };                  // terrain is pushed this far under any road surface (viewer/roadBuild.js)
// The 1 m terrain grid is 500k triangles a tile (half the scene); seen from above, 1 m triangles cover
// 2-3 pixels, which GPUs rasterise badly. meshoptimizer collapses the flat stretches while keeping the
// surface within TERRAIN_ERROR metres of the grid (carved road beds, kerbs, banks stay); tile borders
// are locked so neighbours still meet. Measured 2026-11-04: 3.0 M -> 0.63 M triangles for 6 tiles,
// overview 10.7 -> 8.1 ms GPU, walk 7.4 -> 6.9 ms. The heightmap (walking, placement) is unchanged.
export const TERRAIN_ERROR = 0.05;
// road marking rules (viewer/roadBuild.js): "v2" = measured paint, no invented lines (docs/ROADS_V2_RESEARCH.md phase 1);
// "v1" = the road engine's own (?paint=v1 in the city, the before/after toggle in the Road Lab)
export const PAINT = "v2";

function terrainArrays(hm) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y;
  const pos = new Float32Array(cols * rows * 3), nrm = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c;
    pos[k * 3] = x0 + c * step; pos[k * 3 + 1] = Y[k]; pos[k * 3 + 2] = z0 + r * step;
    const hx = (Y[r * cols + Math.min(c + 1, cols - 1)] - Y[r * cols + Math.max(c - 1, 0)]) / ((Math.min(c + 1, cols - 1) - Math.max(c - 1, 0)) * step);
    const hz = (Y[Math.min(r + 1, rows - 1) * cols + c] - Y[Math.max(r - 1, 0) * cols + c]) / ((Math.min(r + 1, rows - 1) - Math.max(r - 1, 0)) * step);
    const L = Math.hypot(hx, 1, hz);
    nrm[k * 3] = -hx / L; nrm[k * 3 + 1] = 1 / L; nrm[k * 3 + 2] = -hz / L;
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let o = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols, cc = a + 1, d = b + 1;   // (a, b, c) faces +y with +z = south
    idx[o++] = a; idx[o++] = b; idx[o++] = cc;
    idx[o++] = cc; idx[o++] = b; idx[o++] = d;
  }
  return { pos, nrm, idx };
}

let overridesP = null;
/** data/overrides.json (hand corrections), fetched once per worker; {} if missing. */
const overrides = (base) => (overridesP ??= fetch(new URL("../overrides.json", base)).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

/** ROOF HEIGHTS: every building's top (m TAW) rasterised into a 2 m grid over the tile (0 = no building), for fly
 *  mode's collision (the bird's floor = max(ground, roof)). Scanline fill of each footprint's outer ring. */
export const ROOF_STEP = 2;
export function roofGrid(bDoc, b) {
  const nx = Math.ceil((b.x1 - b.x0) / ROOF_STEP), nz = Math.ceil((b.z1 - b.z0) / ROOF_STEP);
  const g = new Float32Array(nx * nz);
  for (const bd of bDoc.buildings) {
    const ring = bd.footprint?.[0];
    if (!ring || ring.length < 3) continue;
    const top = +bd.top;
    let zMin = Infinity, zMax = -Infinity;
    for (const [, z] of ring) { zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); }
    const j0 = Math.max(0, Math.floor((zMin - b.z0) / ROOF_STEP)), j1 = Math.min(nz - 1, Math.floor((zMax - b.z0) / ROOF_STEP));
    for (let j = j0; j <= j1; j++) {
      const zc = b.z0 + (j + 0.5) * ROOF_STEP, xs = [];
      for (let k = 0; k < ring.length; k++) {
        const [ax, az] = ring[k], [bx, bz] = ring[(k + 1) % ring.length];
        if ((az <= zc) !== (bz <= zc)) xs.push(ax + (zc - az) / (bz - az) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        // cells the span touches at all (a little generous: the bird should clear eaves and narrow towers)
        const i0 = Math.max(0, Math.floor((xs[k] - b.x0) / ROOF_STEP)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - b.x0) / ROOF_STEP));
        for (let i = i0; i <= i1; i++) if (g[j * nx + i] < top) g[j * nx + i] = top;
      }
    }
  }
  return { data: g, nx, nz, x0: b.x0, z0: b.z0, step: ROOF_STEP };
}

/** Is (x, z) under a building (roof grid cell > 0)? */
export const onRoof = (g, x, z) => {
  const i = Math.floor((x - g.x0) / g.step), j = Math.floor((z - g.z0) / g.step);
  return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.data[j * g.nx + i] > 0;
};

/** Drop the UrbIS solids a scripted model replaces (entry.hide = BU_IDs, e.g. the Saint-Job church, or solid ids for
 *  solids with no BU_ID or one shared with others, e.g. the Château de Wolvendael's 537523, the Observatory's). */
function hideBuildings(bDoc, hide) {
  if (!hide?.length) return;
  const h = new Set(hide);
  bDoc.buildings = bDoc.buildings.filter((b) => !h.has(b.attrs?.BU_ID) && !h.has(b.id));
}

/** Build all CPU-side data for one manifest entry (entry.hide: BU_IDs not to draw). `base` = URL of data/tiles/. */
export async function buildTileData(entry, base) {
  const times = {};
  const step = async (k, f) => { const t0 = performance.now(); const r = await f(); times[k] = Math.round(performance.now() - t0); return r; };
  const F = entry.files;
  const [x0, x1] = entry.bounds.x, [z0, z1] = entry.bounds.z;
  const bounds = { x0, x1, z0, z1 };
  const get = async (p, bin) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
  const [tHdr, tBuf, bDoc, bBuf, roads, feats] = await step("fetch", () => Promise.all([
    get(F.terrainHeader), get(F.terrain, true), get(F.buildings), get(F.buildingsBin, true), get(F.roads), get(F.features),
  ]));
  // the OSM tram tracks as smooth curves (viewer/track.js): rails, wires, platforms and the trams all follow them
  for (const l of feats.lines || []) if (l.kind === "tram") l.line = smoothPolyline(l.line);
  // ?trains=1 (viewer/rail/): no LiDAR "trees" on rail bridge decks, platforms or the ballast; the line's verges as
  // undergrowth in the land cover
  const rail = entry.rail ? await step("rail fetch", () => railDocs(base)) : null;
  let railDropped = 0;
  if (rail) {
    const clear = railKeepClear(rail.doc, bounds, rail.heroes), n = feats.trees?.length || 0;
    if (n) feats.trees = feats.trees.filter((t) => !clear(t.x, t.z));
    railDropped = n - (feats.trees?.length || 0);
    feats.railVerges = railVerges(rail.doc, bounds);
  }
  // ?roads=surface: the measured UrbIS street surfaces of this tile (surfaces.json), when the tile has them
  const surf = entry.surface && F.surfaces ? await step("fetch surfaces", () => get(F.surfaces)) : null;
  // hand corrections (data/overrides.json): road surfaces OSM gets wrong (Place de Saint-Job is setts)
  const ov = await overrides(base);
  for (const r of roads.roads) { const s = ov.roadSurface?.[r.id]; if (s) (r.meta ??= {}).surface = s; }
  const hm = new Heightmap(tHdr, tBuf);
  // measured markings (pipeline/build_markings.py): crossings, stop lines, lines, OSM crossing / control nodes
  const paint = entry.paint || PAINT;
  const markings = F.markings && paint === "v2" ? await step("fetch markings", () => get(F.markings).catch(() => null)) : null;
  // the roof grid (fly-mode collision) keeps every solid, also the ones a model replaces (its envelope is close enough)
  const roofs = await step("roof grid", () => roofGrid(bDoc, bounds));
  // the road stage (viewer/roadBuild.js, shared with the Road Checker and the Road Lab)
  // ?trains=1: the hero road bridges' decks are the road's ground over the cutting (viewer/rail/railData.js roadDeckGround)
  // the ground at the hero road bridges' ends up to their decks, before the roads sample it (railData.js abutmentFill)
  if (rail) await step("abutment fill", () => abutmentFill(rail.heroes, [hm.y, hm.orig], tHdr));
  const roadGround = rail ? roadDeckGround(rail.heroes, hm.ground) : hm.ground;
  const rd = await step("roads", () => buildRoadData({ roads, surf, markings, hm, bounds, paint, ground: roadGround, levelPins: rail ? roadDeckPins(rail.heroes) : null,
    trees: entry.pits === false ? null : feats.trees, onBuilding: (x, z) => onRoof(roofs, x, z) }));
  Object.assign(times, rd.times);
  const { netInfo } = rd;
  const road = { parts: rd.parts, atlas: rd.atlas, carvedCells: rd.carvedCells, triangles: rd.triangles, surfaceStats: rd.surfaceStats,
    surfaceData: rd.surfaceData, inventory: rd.inventory ?? null };
  const net = rd.net;              // the live engine network (stays in the worker: drive colliders)
  // park ponds (entry.ponds, viewer/water/pondBed.js): the bed carved under the water before the terrain mesh is built
  // (and their OSM water areas leave the land-cover mask: the ground under the pond is the bank / bed, the water is the pond's own surface)
  if (entry.ponds?.length) { const ids = new Set(entry.ponds.map((p) => p.osm).filter(Boolean)); feats.areas = (feats.areas || []).filter((a) => !ids.has(a.id)); }
  if (entry.ponds?.length) await step("pond beds", () => carvePonds(hm, entry.ponds.filter((p) => p.ring.some(([x, z]) => x >= x0 - 5 && x <= x1 + 5 && z >= z0 - 5 && z <= z1 + 5))));
  // ?trains=1: the terrain under the ballast / platforms / hero arches, the fills at viaduct ends; then the tile's rail
  // geometry as typed arrays (viewer/rail/railData.js; the main thread only wraps them in buffers)
  let railOut = null;
  if (rail) {
    const c = await step("rail carve", () => carveGrid(rail.doc, hm.y, tHdr, bounds, rail.heroes));
    railOut = await step("rail meshes", () => railTileData(rail.doc, bounds, rail.heroes));
    railOut.stats.carved = c.moved; railOut.stats.treesDropped = railDropped;
  }
  // the lane graph for the moving traffic (viewer/traffic/: lanes on the measured carriageway, connectors, junction
  // control from OSM, conflicts). Round 4: built on the roads2 network (rd.net, its lane graph already repaired by
  // viewer/streets/laneGraph.js) and the measured class raster
  const traffic = await step("traffic graph", () => buildTrafficGraph(net, roads, feats, bounds, road.surfaceData?.grid));
  const terrain = await step("terrain grid", () => terrainArrays(hm));
  await step("terrain simplify", async () => {
    await MeshoptSimplifier.ready;
    const [idx] = MeshoptSimplifier.simplify(terrain.idx, terrain.pos, 3, 0, TERRAIN_ERROR, ["LockBorder", "ErrorAbsolute"]);
    terrain.idx = idx;
  });
  // drive colliders: NOT the solids a scripted model replaces (the model collides by its own geometry,
  // viewer/heroColliders.js: its footprint corners blocked where the model has a porch or a recess, and missed its
  // steps, yard walls, fences and parapets)
  const nb = bDoc.buildings.length;
  const keep = entry.driveKeepHidden ? { buildings: bDoc.buildings.slice() } : null;      // ?colfix=0: the old way
  hideBuildings(bDoc, entry.hide);
  const drive = await step("drive colliders", () => buildDriveData({ bDoc: keep || bDoc, bBuf: keep ? null : bBuf, net, feats, hm, parts: road.parts, bounds, surf, legacy: !!entry.driveLegacy,
    walls: keep ? [] : (rail?.doc.platforms || []).map((p) => p.ring) }));          // rail platforms: 0.76 m walls for the car   // drive mode (viewer/drive/)
  drive.counts.hidden = nb - bDoc.buildings.length;     // solids a hero model replaces (it collides by its own LOD0)
  // ?kit=1: the façade kit's placement (viewer/facadeKit/placement.js) runs inside the analysis, here in the worker;
  // entry.kitExclude = BU_IDs a hero model or the interior pilot replaces
  const kit = entry.kit ? kitCollector({ exclude: new Set(entry.kitExclude || []), ground: (x, z) => hm.ground(x, z) }) : null;
  const buildings = await step("façade analysis", () => analyseBuildings(bDoc, bBuf, roads, feats, { kit }));
  const cover = await step("land cover", () => landCoverData(feats, bounds));
  return { name: entry.name, bounds, hdr: tHdr, y: hm.y, orig: hm.orig, roads, feats, buildingCount: bDoc.count, roofs, drive,
    netInfo, road, terrain, buildings, cover, traffic, times, rail: railOut };
}

// ---------------------------------------------------------------- far level of detail

const WALL = [[0.29, 0.085, 0.05], [0.17, 0.075, 0.045], [0.4, 0.27, 0.14], [0.62, 0.6, 0.55], [0.56, 0.47, 0.32], [0.3, 0.29, 0.27]];

/** Far LOD of a tile: 4 m terrain grid (uncarved) with uvs for the orthophoto, and the UrbIS solids as
 *  flat-shaded triangles coloured per building (wall style average, real roof colour). No roads,
 *  trees or props: these tiles are only seen from 500 m and more. */
export async function buildLiteData(entry, base) {
  const F = entry.files;
  const get = async (p, bin) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return bin ? r.arrayBuffer() : r.json(); };
  const [tHdr, tBuf, bDoc, bBuf] = await Promise.all([get(F.terrainHeader), get(F.terrain, true), get(F.buildings), get(F.buildingsBin, true)]);
  const hm = new Heightmap(tHdr, tBuf);
  const { x0, z0, cols, rows, step } = hm.h, S = 4;
  const c2 = Math.floor((cols - 1) / S) + 1, r2 = Math.floor((rows - 1) / S) + 1;
  const pos = new Float32Array(c2 * r2 * 3), nrm = new Float32Array(c2 * r2 * 3), uv = new Float32Array(c2 * r2 * 2);
  const W = (cols - 1) * step, H = (rows - 1) * step;
  for (let r = 0; r < r2; r++) for (let c = 0; c < c2; c++) {
    const k = r * c2 + c, x = x0 + c * S * step, z = z0 + r * S * step;
    pos[k * 3] = x; pos[k * 3 + 1] = hm.ground(x, z) - 0.3; pos[k * 3 + 2] = z;     // a little low: never pokes through
    const hx = (hm.ground(x + S, z) - hm.ground(x - S, z)) / (2 * S), hz = (hm.ground(x, z + S) - hm.ground(x, z - S)) / (2 * S), L = Math.hypot(hx, 1, hz);
    nrm[k * 3] = -hx / L; nrm[k * 3 + 1] = 1 / L; nrm[k * 3 + 2] = -hz / L;
    uv[k * 2] = (x - x0) / W; uv[k * 2 + 1] = 1 - (z - z0) / H;                      // image row 0 = north = z0
  }
  const idx = new Uint32Array((c2 - 1) * (r2 - 1) * 6);
  let o = 0;
  for (let r = 0; r < r2 - 1; r++) for (let c = 0; c < c2 - 1; c++) {
    const a = r * c2 + c, b = a + c2;
    idx[o++] = a; idx[o++] = b; idx[o++] = a + 1; idx[o++] = a + 1; idx[o++] = b; idx[o++] = b + 1;
  }
  // seen from 500 m and more: 25 cm of error is far below a pixel (the grid already sits 30 cm low)
  await MeshoptSimplifier.ready;
  const [idxS] = MeshoptSimplifier.simplify(idx, pos, 3, 0, 0.25, ["LockBorder", "ErrorAbsolute"]);
  hideBuildings(bDoc, entry.hide);
  const dv = new DataView(bBuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(bBuf, 8, V * 3), I = new Uint32Array(bBuf, 8 + V * 12, T * 3);
  let n = 0;
  for (const b of bDoc.buildings) n += b.walls.count + b.roof.count;
  const bp = new Float32Array(n * 9), bn = new Float32Array(n * 9), bc = new Float32Array(n * 9);
  let q = 0;
  const tri = (t, col) => {
    const ia = I[t * 3] * 3, ib = I[t * 3 + 1] * 3, ic = I[t * 3 + 2] * 3;
    const ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2];
    const vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (const i of [ia, ib, ic]) {
      bp[q] = P[i]; bp[q + 1] = P[i + 1]; bp[q + 2] = P[i + 2];
      bn[q] = nx; bn[q + 1] = ny; bn[q + 2] = nz;
      bc[q] = col[0]; bc[q + 1] = col[1]; bc[q + 2] = col[2];
      q += 3;
    }
  };
  for (const b of bDoc.buildings) {
    const key = String(b.attrs?.BU_ID ?? b.id);
    const wall = b.attrs?._landmark ? [0.42, 0.4, 0.36] : WALL[wallStyle(hash01(key + "s"), b.height)].map((v) => v * 0.85 + 0.02);
    const roof = b.roofColor || [0.12, 0.08, 0.07];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) tri(t, wall);
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) tri(t, roof);
  }
  return { name: entry.name, terrain: { pos, nrm, uv, idx: idxS }, buildings: { position: bp, normal: bn, color: bc }, buildingCount: bDoc.count };
}

/** Every ArrayBuffer inside a result, for a zero-copy postMessage. */
export function transferables(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (ArrayBuffer.isView(obj)) { out.add(obj.buffer); return out; }
  if (obj instanceof ArrayBuffer) { out.add(obj); return out; }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) transferables(v, out);
  return out;
}
