// Everything about loading a tile that does not need three.js or the GPU: fetch, heightmap, the road
// engine (network + lane meshes + marking atlas), terrain carving, the terrain grid and its normals,
// the façade analysis and the land-cover raster. Runs in the tile worker (viewer/tileWorker.js,
// bundled to tileWorker.bundle.js) so loading a tile doesn't freeze the frame; main.js falls back to
// running it on the main thread if the worker can't start. The result is plain data (typed arrays).
import { carvePonds } from "./water/pondBed.js";
import { Heightmap } from "./heightmap.js";
import { analyseBuildings, hash01, wallStyle } from "./facadeGeom.js";
import { classify, TYPE } from "./buildingTypes.js";
import { farBuildings } from "./farLookData.js";   // the far city's façades (docs/FARCITY.md), ?farlook=old = the flat solids
import { landCoverData } from "./landcover.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { buildDriveData, tramPlatformSurface, driveGround } from "./drive/colliders.js";
import { gardenIndex } from "./streets/retainWalls.js";
import { buildRoadData, applyRoadOverrides, CARVE } from "./roadBuild.js";
import { surfaceVote } from "./streetNames.js";   // surfvote (docs/SURFVOTE.md)
import { SURFACE } from "./roadData.js";
import { bridgeDecks, deckMesh, parapetRings, deckAbutments, deckHeight, deckUnderCut, ringPlans, deckSoffitCap, deckFootprint, deckTopGrid, onCarriageway, deckContinuation, markRailCuts } from "./streets/bridgeDecks.js";
import { tramTracks } from "./track.js";
import { fitPlatforms } from "./streets/tramPlatforms.js";
import { kitCollector } from "./facadeKit/placement.js";
import { roofCollector, stampRoofCols } from "./roofs/roofPlace.js";
import { prepRail, heroBridgeNames, abutmentFill, underpassCut, underpassGround, carveGrid, railTileData, railKeepClear, railVerges, roadDeckGround, roadDeckPins, railDriveSurface, railFences, fenceMesh, FENCE_H } from "./rail/railData.js";
import { buildTrafficGraph } from "./traffic/trafficGraph.js";
import { widthParking } from "./streets/parkPlace.js";
import { streetFit } from "./streets/fitCore.js";
import { carriageway } from "./streets/carriageway.js";
import { treesOffCarriageway, paintedDriveLanes } from "./streets/roadTrees.js";
import { paintedLaneCentre, roadFrameOf } from "./streets/lineFit.js";
import { squeezeDeckLanes } from "./rail/roadDeck.js";
import { loadTunnels, tunnelRoads, tunnelCut, tunnelRecut, tunnelGround, tunnelTrees, tunnelTerrain, tunnelSurface, tunnelFenceRings } from "./rail/tunnels.js";
import { grassTypeData } from "./grass/grassTypes.js";
import { applyParkSquares, carveFlights, withoutLines } from "./heros/herosSurface.js";
import { drawnGround, sinkFeet, footprintIndex } from "./groundFit.js";

let railP = null;
let grassKindsP = null;
/** ?grass=1: data/grass/osm_grass.json (the OSM grass kinds features.json folds away), fetched once per worker */
const grassKinds = (base) => (grassKindsP ||= fetch(new URL("../grass/osm_grass.json", base)).then((r) => r.json()).then((d) => d.kinds).catch(() => null));
/** ?trains=1: rail.json + the hero bridges' notes, fetched once per worker */
const railDocs = (base, round2 = true) => (railP ??= Promise.all([
  fetch(new URL("../rail/rail.json", base)).then((r) => r.json()).then(prepRail),
  Promise.all(heroBridgeNames(round2).map((n) => fetch(new URL(`../../models/rail/${n}.json`, base)).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((a) => a.filter(Boolean)),
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

function terrainArrays(hm, fitDiagonals = false) {
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
    // (ground fit, docs/GROUND_FIT.md "blocky") each cell split along its flatter diagonal: a bank or a kerb shoulder
    // running diagonally across the grid is one straight crease, not a saw-tooth of folds (the split b-c everywhere)
    if (fitDiagonals && Math.abs(Y[a] - Y[d]) < Math.abs(Y[b] - Y[cc]) - 0.01) {
      idx[o++] = a; idx[o++] = b; idx[o++] = d;
      idx[o++] = a; idx[o++] = d; idx[o++] = cc;
      continue;
    }
    idx[o++] = a; idx[o++] = b; idx[o++] = cc;
    idx[o++] = cc; idx[o++] = b; idx[o++] = d;
  }
  return { pos, nrm, idx };
}

/** the street-life layer's shopfronts of a tile (the poi kinds that get a shopfront in viewer/streetlife/layout.js:
 *  not ATMs, schools or civic buildings, which carry a plaque only): [{ x, z, nx, nz, w }], null when the tile has none */
/** data/gardens/<tile>.json (the garden fronts: walls, hedges, gates), or null (claude/sidewalk: retaining walls) */
/** (x, z) -> inside an OSM park / wood / grass / meadow / scrub area (public green: a bank, not a retaining wall) */
function publicAreas(feats) {
  const KINDS = new Set(["wood", "forest", "park", "grass", "meadow", "scrub", "heath", "recreation_ground", "cemetery"]);
  const polys = (feats.areas || []).filter((a) => KINDS.has(a.kind)).map((a) => a.rings);
  const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  return (x, z) => polys.some((R) => pip(x, z, R[0]) && !R.slice(1).some((h) => pip(x, z, h)));
}
async function gardenDoc(base, name) {
  const r = await fetch(new URL(`../gardens/${name}.json`, base)).catch(() => null);
  return r?.ok ? r.json().catch(() => null) : null;
}
async function streetlifeFronts(base, name) {
  const r = await fetch(new URL(`../streetlife/${name}.json`, base)).catch(() => null);
  if (!r?.ok) return null;
  const doc = await r.json();
  return (doc.pois || []).filter((p) => p.face && !["atm", "school", "civic"].includes(p.kind)).map(({ face: f }) => ({ x: f.x, z: f.z, nx: f.nx, nz: f.nz, w: f.w }));
}

let overridesP = null;
let streetVoteP = null;
/** data/roads/streetVote.json (tools/build_street_vote.mjs): street key -> its city-wide OSM surface code (not asphalt) */
const streetVote = (base) => (streetVoteP ??= fetch(new URL("../roads/streetVote.json", base)).then((r) => (r.ok ? r.json() : { exact: {}, loose: {} })).catch(() => ({ exact: {}, loose: {} })));
/** data/overrides.json (hand corrections), fetched once per worker; {} if missing. */
const overrides = (base) => (overridesP ??= fetch(new URL("../overrides.json", base)).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
/** the curated building looks this build uses: an entry of a neighbourhood pass ("set": "cortenbosch") only with its
 *  switch on (?cortenbosch=old: none of them; ?looks=old drops every look) */
const lookSet = (looks, entry) => {
  if (!looks) return looks;
  // (cortenbosch2, docs/CORTENBOSCH2.md) round 2: an entry's "v2" fields (the 1990s house type, the curtain wall, concrete
  // tiles) over its round-1 look, and the entries of set "cortenbosch2" (the school's other blocks); ?cortenbosch2=old:
  // round 1 as it was; ?cortenbosch=old: neither round
  const out = {};
  for (const [k, v] of Object.entries(looks)) {
    if (!v || typeof v !== "object") { out[k] = v; continue; }
    if (entry.cortenbosch === false && (v.set === "cortenbosch" || v.set === "cortenbosch2")) continue;
    if (entry.cortenbosch2 === false && v.set === "cortenbosch2") continue;
    out[k] = entry.cortenbosch2 !== false && v.v2 ? { ...v, ...v.v2 } : v;
  }
  return out;
};

/** ROOF HEIGHTS: every building's top (m TAW) rasterised into a 2 m grid over the tile (0 = no building), for fly
 *  mode's collision (the bird's floor = max(ground, roof)). Scanline fill of each footprint's outer ring. */
/** joins2 (viewer/surfaces.js "sidewalk to the façade"): (x, z, dx, dz, max) -> the distance along the ray to the first
 *  footprint edge of any building (Infinity: none within max). A 4 m bucket grid of the footprints' edges. */
export function wallRayOf(bDoc) {
  const B = 4, cells = new Map(), segs = [];
  for (const b of bDoc.buildings) for (const ring of b.footprint || []) for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], k = segs.length;
    segs.push([ax, az, bx, bz]);
    for (let gi = Math.floor(Math.min(ax, bx) / B); gi <= Math.floor(Math.max(ax, bx) / B); gi++)
      for (let gj = Math.floor(Math.min(az, bz) / B); gj <= Math.floor(Math.max(az, bz) / B); gj++) {
        const key = gi * 65536 + gj; let c = cells.get(key); if (!c) cells.set(key, (c = [])); c.push(k);
      }
  }
  return (x, z, dx, dz, max) => {
    let best = Infinity;
    const seen = new Set();
    for (let gi = Math.floor(Math.min(x, x + dx * max) / B); gi <= Math.floor(Math.max(x, x + dx * max) / B); gi++)
      for (let gj = Math.floor(Math.min(z, z + dz * max) / B); gj <= Math.floor(Math.max(z, z + dz * max) / B); gj++)
        for (const k of cells.get(gi * 65536 + gj) || []) {
          if (seen.has(k)) continue; seen.add(k);
          const [ax, az, bx, bz] = segs[k], ex = bx - ax, ez = bz - az, den = dx * ez - dz * ex;
          if (Math.abs(den) < 1e-9) continue;
          const t = ((ax - x) * ez - (az - z) * ex) / den, u = ((ax - x) * dz - (az - z) * dx) / den;
          if (t >= 0 && t < best && u >= 0 && u <= 1) best = t;
        }
    return best <= max ? best : Infinity;
  };
}

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

/**
 * THE DRAWN ROOF SURFACE for the falcon's collision (viewer/falconFlight/cityStream.js; road fix round 3, the owner:
 * "the falcon's collision seems weird"): the flat roof grid above is every building's TOP over its whole footprint,
 * dilated to 2 m cells, so over a pitched roof the bird hit (and landed on) nothing drawn up to 5 m over the eaves, and
 * bounced off air up to 2 m in front of the facades. Here: the height of the topmost drawn roof triangle at each 1 m
 * cell's centre (buildings.bin, the solids the city draws: a replaced one is hidden first), Uint16 in 2 cm (0 = no
 * roof). 0.5 MB a tile.
 */
export const ROOF_SURF_STEP = 1, ROOF_SURF_Q = 50;
export function roofSurface(bDoc, bBuf, b) {
  const S = ROOF_SURF_STEP, nx = Math.ceil((b.x1 - b.x0) / S), nz = Math.ceil((b.z1 - b.z0) / S);
  const g = new Uint16Array(nx * nz);
  if (!bBuf) return null;
  const dv = new DataView(bBuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(bBuf, 8, V * 3), I = new Uint32Array(bBuf, 8 + V * 12, T * 3);
  for (const bd of bDoc.buildings) {
    if (!bd.roof) continue;
    for (let t = bd.roof.first; t < bd.roof.first + bd.roof.count; t++) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, d = I[t * 3 + 2] * 3;
      const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[c], by = P[c + 1], bz = P[c + 2], cx = P[d], cy = P[d + 1], cz = P[d + 2];
      const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(den) < 1e-9) continue;                       // a vertical / degenerate face
      const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - b.x0) / S - 0.5)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - b.x0) / S - 0.5));
      const j0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - b.z0) / S - 0.5)), j1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - b.z0) / S - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = b.x0 + (i + 0.5) * S, z = b.z0 + (j + 0.5) * S;
        const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den, w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den, w3 = 1 - w1 - w2;
        if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
        const y = w1 * ay + w2 * by + w3 * cy, q = Math.min(65535, Math.max(1, Math.round(y * ROOF_SURF_Q)));
        if (q > g[j * nx + i]) g[j * nx + i] = q;
      }
    }
  }
  return { data: g, nx, nz, x0: b.x0, z0: b.z0, step: S, q: ROOF_SURF_Q };
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

/**
 * THE GROUND PAST THE TILE'S EDGE for the road stage (docs/collisions/DRIVE_FIX.md). roads.json holds every road within
 * 150 m of the tile, but the tile's height grid stops at its edge and Heightmap.sample CLAMPS beyond it: a junction
 * across the edge was fitted to a flat continuation of the edge row, the grade rule carried that height back into the
 * tile, and the level pass skipped it as "no data" (Rue de la Brasserie 3.4 m over the ground at C9 / D9, Kleindalstraat
 * 7.5 m at the E10 / F10 corner, seams between neighbours' roads). Here the 8 neighbours' DTM grids (terrain.u16, raw:
 * no data stays no data) answer outside the own grid; a point no grid covers keeps the clamp and is "no data".
 * Returns { ground(x, z), noData(x, z) } or null when no neighbour exists.
 */
async function paddedGround(entry, base, hm) {
  const name = entry.name, L = name.charCodeAt(0) - entry.i, N = parseInt(name.slice(1), 10) - entry.j;
  const v = (entry.files.terrain.split("?")[1] || "");
  const h = hm.h, S = (h.cols - 1) * h.step;
  const grids = (await Promise.all([[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(async ([di, dj]) => {
    const n = String.fromCharCode(L + entry.i + di) + (N + entry.j + dj);
    try {
      const [hr, br] = await Promise.all([fetch(new URL(`${n}/terrain.json${v ? "?" + v : ""}`, base)), fetch(new URL(`${n}/terrain.u16${v ? "?" + v : ""}`, base))]);
      if (!hr.ok || !br.ok) return null;
      const hdr = await hr.json(), raw = new Uint16Array(await br.arrayBuffer());
      return Math.abs(hdr.x0 - (h.x0 + di * S)) < 1e-3 && Math.abs(hdr.z0 - (h.z0 + dj * S)) < 1e-3 && raw.length === hdr.cols * hdr.rows ? { hdr, raw } : null;
    } catch { return null; }
  }))).filter(Boolean);
  if (!grids.length) return null;
  const inOwn = (x, z) => x >= h.x0 && z >= h.z0 && x <= h.x0 + S && z <= h.z0 + (h.rows - 1) * h.step;
  const sampleN = (x, z) => {
    for (const { hdr, raw } of grids) {
      const c = (x - hdr.x0) / hdr.step, r = (z - hdr.z0) / hdr.step;
      if (c < 0 || r < 0 || c > hdr.cols - 1 || r > hdr.rows - 1) continue;
      const c0 = Math.min(Math.floor(c), hdr.cols - 2), r0 = Math.min(Math.floor(r), hdr.rows - 2), fc = c - c0, fr = r - r0, i = r0 * hdr.cols + c0;
      const a = raw[i], b = raw[i + 1], cc = raw[i + hdr.cols], d = raw[i + hdr.cols + 1];
      if (a === hdr.nodata || b === hdr.nodata || cc === hdr.nodata || d === hdr.nodata) return NaN;
      return ((a * (1 - fc) + b * fc) * (1 - fr) + (cc * (1 - fc) + d * fc) * fr) / 100;
    }
    return NaN;
  };
  return {
    neighbours: grids.length,
    ground: (x, z) => { if (inOwn(x, z)) return hm.ground(x, z); const y = sampleN(x, z); return Number.isNaN(y) ? hm.ground(x, z) : y; },
    noData: (x, z) => (inOwn(x, z) ? h.min != null && hm.ground(x, z) <= h.min + 0.02 : Number.isNaN(sampleN(x, z))),
  };
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
  // the tram tracks (viewer/track.js tramTracks): rails, wire + poles, platforms' sides, the bridge deck and the trams all
  // follow them. claude/tramfit (rule 32): the OSM ways fitted to the measured street (tools/tramfit/build_tramfit.mjs:
  // both rails clear of every kerb and raised paving, smooth, continuous across tile seams), data/tramfit/<T>.json;
  // ?tramfit=old (entry.tramFit false) = each OSM way smoothed as it is (rails under the kerb, onto the sidewalk)
  const hasTram = (feats.lines || []).some((l) => l.kind === "tram");
  const tramFit = hasTram && entry.tramFit !== false ? await step("tramfit fetch", () => fetch(new URL(`../tramfit/${entry.name}.json`, base)).then((r) => (r.ok ? r.json() : null)).catch(() => null)) : null;
  tramTracks(feats, tramFit);
  // ... and the tram platforms beside them, never over a rail (viewer/streets/tramPlatforms.js; ?tramfit=old: as OSM)
  if (entry.tramFit !== false) fitPlatforms(feats);
  // ?trains=1 (viewer/rail/): no LiDAR "trees" on rail bridge decks, platforms or the ballast; the line's verges as
  // undergrowth in the land cover
  const rail = entry.rail ? await step("rail fetch", () => railDocs(base, entry.bridges2 !== false)) : null;
  let railDropped = 0;
  if (rail) {
    const clear = railKeepClear(rail.doc, bounds, rail.heroes), n = feats.trees?.length || 0;
    if (n) feats.trees = feats.trees.filter((t) => !clear(t.x, t.z));
    railDropped = n - (feats.trees?.length || 0);
    feats.railVerges = railVerges(rail.doc, bounds);
  }
  // the road tunnels under the Linkebeek embankments (viewer/rail/tunnels.js, docs/trains/TUNNELS.md; ?tunnels=0: none):
  // no LiDAR "tree" in their streets; the ones over a bore moved beside it (they would stand on the street's ground, inside)
  const tunnels = entry.tunnels !== false ? await step("tunnel fetch", () => loadTunnels(base)) : null;
  if (tunnels?.length && feats.trees?.length) feats.trees = tunnelTrees(tunnels, feats.trees);
  // the petrol stations (viewer/fuel/, data/fuel/summary.json "clear"): no LiDAR "tree" on a canopy roof (the UrbIS
  // canopy-height model reads a 5 m canopy as crowns); the drive / walk colliders are built from this same list
  if (entry.fuelClear?.length && feats.trees?.length) {
    const inRing = (r, x, z) => { let k = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; };
    feats.trees = feats.trees.filter((t) => t.source !== "urbis-chm" || !entry.fuelClear.some((r) => inRing(r, t.x, t.z)));
  }
  // ?roads=surface: the measured UrbIS street surfaces of this tile (surfaces.json), when the tile has them
  const surfDoc = (entry.surface || entry.grass) && F.surfaces ? await step("fetch surfaces", () => get(F.surfaces)) : null;
  const surf = entry.surface ? surfDoc : null;
  // ?grass=1: the tile's grass TYPES raster (viewer/grass/grassTypes.js, ~40 ms of canvas work): here, off the main thread.
  // Before the road stage, which may adjust the surfaces in place; the verges read the measured carriageways as fetched.
  const grassTypes = entry.grass ? await step("grass types", async () => grassTypeData(feats, { x0, x1, z0, z1 }, { kinds: await grassKinds(base), surfaces: surfDoc })) : null;
  // hand corrections (data/overrides.json): road surfaces OSM gets wrong (Place de Saint-Job is setts)
  const ov = await overrides(base);
  applyRoadOverrides(roads, ov);
  // surfvote (docs/SURFVOTE.md): the street-surface name vote of surfaces.js with the names repaired and normalised
  // (viewer/streetNames.js), the city-wide table as its fallback (data/roads/streetVote.json), and the OSM road surfaces
  // Street View contradicts (data/overrides.json surfvoteRoads); ?surfvote=old: the raw-name vote, which never matched
  if (surf && entry.surfVote !== false)
    for (const r of roads.roads) { const o = ov.surfvoteRoads?.[r.id]; if (o?.surface) (r.meta ??= {}).surface = o.surface; }
  // Square des Heros (viewer/heros/herosSurface.js; ?heros=old: the setts plaza as before): the UrbIS square surface minus
  // the park, as sidewalk paving; the park is the hero place's own ground
  if (surf && entry.heros) applyParkSquares(surf, ov, bounds);
  // (cortenbosch) the surface of single UrbIS street surfaces a local knows (data/overrides.json streetSurfaces: the
  // Chemin privé 't Cortenbosch, grey concrete pavers on its 1990s part, setts on the old lane; the name vote of
  // surfaces.js never matches it: UrbIS names are French only, OSM's bilingual), read by surfaces.js as s.surface;
  // ?cortenbosch=old: none
  if (entry.cortenbosch !== false && ov.streetSurfaces) {
    // (cortenbosch2) pattern "herringbone": the pavers' herringbone layer (roadData.js paving_herringbone); ?cortenbosch2=old:
    // the stretcher-bond pavers of round 1
    const sOf = (o) => (o.pattern === "herringbone" && o.surface === "paving_stones" && entry.cortenbosch2 !== false ? "paving_herringbone" : o.surface);
    if (surf) for (const s of surf.surfaces || []) { const o = ov.streetSurfaces[s.id]; if (o?.surface) s.surface = sOf(o); }
    // (and the engine carriageway kept over them reads its OSM road's surface: those roads too)
    const byRoad = new Map(Object.values(ov.streetSurfaces).flatMap((o) => (o?.roads || []).map((id) => [id, sOf(o)])));
    for (const r of roads.roads) { const sf = byRoad.get(r.id); if (sf) (r.meta ??= {}).surface = sf; }
  }
  // (surfvote) the vote itself, once the curated surfaces are in: surfaces.js reads it as surf.surfVote.of(s); OSM roads
  // of a street with no surface tag take the vote of the measured surface they run in when that is not asphalt (the
  // engine carriageway kept over it drew a strip of asphalt between voted setts, e.g. Rue Geleytsbeek at Avenue du Lycée)
  if (surf && entry.surfVote !== false) {
    surf.surfVote = surfaceVote(surf, roads, SURFACE, await streetVote(base));
    surf.surfVote.fillUntagged();
  }
  if (tunnels?.length) tunnelRoads(roads, tunnels);                 // the lanes through the bores
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
  // the ground through the round-2 street underpasses down to the road (railData.js underpassCut; the DTM ran over them)
  if (rail) await step("underpass cut", () => underpassCut(rail.heroes, [hm.y, hm.orig], tHdr));
  // the tunnels' cut: the road level through the approaches and the bores, the earth the walls retain (tunnels.js)
  const tcut = tunnels?.length ? await step("tunnel cut", () => tunnelCut(tunnels, hm, tHdr)) : null;
  // every other road bridge (OSM bridge=yes: Carsoel at Saint-Job station, Waterloo, Merlo, Chênaie, Tilleuls...): a deck
  // between its ends instead of the bare-earth DTM's cutting (viewer/streets/bridgeDecks.js); the hero decks win where
  // they are (Verrewinkel), and their OSM road is left out of the page's world decks
  const heroDeck = rail ? roadDeckGround(rail.heroes, () => NaN) : () => NaN;
  // only bridges whose deck (both extended ends) lies on THIS tile's height grid: outside it the grid clamps to its edge
  // and the ends' heights would be wrong (the tile whose grid holds the bridge carries it)
  const hh = hm.h, gx1 = hh.x0 + (hh.cols - 1) * hh.step, gz1 = hh.z0 + (hh.rows - 1) * hh.step;
  const onGrid = (p) => p[0] >= hh.x0 && p[0] <= gx1 && p[1] >= hh.z0 && p[1] <= gz1;
  // the ground past the tile's edge from the neighbours' grids (paddedGround; ?padroads=0: the clamp, as before)
  const pad = entry.padRoads === false ? null : await step("neighbour ground", () => paddedGround(entry, base, hm));
  const baseGround = pad ? pad.ground : hm.ground;
  // road fix round 2 (docs/collisions/ROAD_FIX2.md): a bridge crossing a tile edge (Avenue de la Chênaie over the L26,
  // G6 / G7: its south end 0.8 m into G7) had both ends on NO tile's grid and was drawn by none: a bare road strip 7 m
  // over the railway, open drops both sides. With the neighbours' grids every tile whose ground covers both ends knows the
  // deck (its roads' ground, its parapet walls), and the tile holding the deck's middle draws it (one deck, one world deck)
  const known = pad ? (p) => onGrid(p) || !pad.noData(p[0], p[1]) : onGrid;
  // (a deck with a measured outline in data/overrides.json bridgePlans, the Carsoel deck at Saint-Job station: its
  // whole slab, parapets on its free edges, the cutting walls under it; ?bridgeplan=old: the road band, as before)
  // (vivier 2026-11-17, ?vivier=old: off) + a plan from the UrbIS polygon for a road bridge its band leaves half open over
  // the cutting (bridgeDecks.js ringPlans: the Chaussee de Waterloo at Vivier d'Oie)
  const plans = entry.bridgePlan === false ? null : entry.vivier !== false && rail ? ringPlans(ov.bridgePlans, roads, rail.doc, baseGround, surf) : ov.bridgePlans;
  const osmBridges = bridgeDecks(roads, baseGround, (d) => known(d.pts[0]) && known(d.pts[d.pts.length - 1]), plans);
  osmBridges.decks = osmBridges.decks.filter((d) => { const m = d.pts[Math.floor(d.pts.length / 2)]; return Number.isNaN(heroDeck(m[0], m[1])); });
  const mid = (d) => { const L = d.cum[d.cum.length - 1] / 2; let i = 1; while (i < d.pts.length - 1 && d.cum[i] < L) i++;
    const t = (L - d.cum[i - 1]) / ((d.cum[i] - d.cum[i - 1]) || 1); return [d.pts[i - 1][0] + (d.pts[i][0] - d.pts[i - 1][0]) * t, d.pts[i - 1][1] + (d.pts[i][1] - d.pts[i - 1][1]) * t]; };
  const ownDeck = (d) => { if (!pad) return true; const [mx, mz] = mid(d); return mx >= x0 && mx < x1 && mz >= z0 && mz < z1; };
  // the ground at the decks' ends up to them (bridgeDecks.js deckAbutments; ?abutments=0: the bare DTM, as before)
  const abutCells = entry.deckAbutments === false ? 0 : deckAbutments(osmBridges.decks, [hm.y, hm.orig], tHdr);
  // under a deck with a measured plan (the Carsoel deck at Saint-Job station): the cutting's floor between its walls
  const underCells = deckUnderCut(osmBridges.decks, [hm.y, hm.orig], tHdr);
  // no LiDAR "tree" growing up through an OSM deck from the cutting under it (the walker on the Avenue des Tilleuls deck
  // passed through their trunks once the deck was drawn, road fix round 2); as railKeepClear does for the rail bridges
  if (osmBridges.decks.length && feats.trees?.length) {
    const on = osmBridges.decks.map((d) => deckHeight(d, hm.ground, { drawn: true }));
    feats.trees = feats.trees.filter((t) => !on.some((f) => { const y = f(t.x, t.z); return y != null && y - hm.ground(t.x, t.z) > 1.5; }));
  }
  // (+ the street level across the hero underpasses, railData.js underpassGround; ?underpasslevel=0: as before)
  // (vivier) the UrbIS plan decks' road level (no kerb: the junction is on the carriageway); the hand-measured Carsoel
  // deck keeps its own verified levels (tour: its junction re-levelled changed the Saint-Job station view)
  const planDecks = osmBridges.decks.filter((d) => d.plan?.urbis), planFns = planDecks.map((d) => deckHeight(d, baseGround));
  const planLevel = planFns.length ? (x, z) => { for (const f of planFns) { const y = f(x, z); if (y != null) return y; } return null; } : null;
  const roadGround0 = rail ? roadDeckGround(rail.heroes, osmBridges.wrap(baseGround)) : osmBridges.wrap(baseGround);
  const roadGround = tunnelGround(tunnels, rail && entry.underpassLevel !== false ? underpassGround(rail.heroes, roadGround0) : roadGround0);
  // (claude/sidewalk round 2) the garden fronts, for the retaining walls behind levelled sidewalks (viewer/streets/retainWalls.js)
  const gardenNear = entry.sidewalkLevel !== false && entry.retainWalls !== false && surf ? gardenIndex(await step("fetch gardens", () => gardenDoc(base, entry.name))) : null;
  const rd = await step("roads", () => buildRoadData({ roads, surf, markings, hm, bounds, paint, ground: roadGround, noData: pad?.noData, roughLanes: entry.roughLanes !== false, recentre: entry.recentre === true, roadBend: entry.roadBend !== false, roadLines: entry.roadLines !== false, laneFit: entry.laneFit !== false, bikeMark: entry.bikeMark !== false, weldNearest: entry.groundWeld !== false, clampTop: entry.clampTop !== false, clampH: entry.surfH !== false, kerbLevel: entry.sidewalkLevel !== false, gardenNear, publicAt: gardenNear ? publicAreas(feats) : null,
    wallRay: entry.sidewalkFill !== false ? wallRayOf(bDoc) : null, levelPins: rail ? roadDeckPins(rail.heroes) : null,
    trees: entry.pits === false ? null : feats.trees, onBuilding: (x, z) => onRoof(roofs, x, z),
    deckLevel: entry.vivier !== false ? planLevel : null,   // (vivier: junctions on a measured deck at its level)
    roadTexts: entry.cortenbosch !== false && entry.cortenbosch2 !== false ? ov.roadTexts ?? null : null }));   // (cortenbosch2: the lane's painted words)
  Object.assign(times, rd.times);
  const { netInfo } = rd;
  netInfo.deckAbutments = abutCells; netInfo.deckUnder = underCells;
  const road = { parts: rd.parts, atlas: rd.atlas, carvedCells: rd.carvedCells, clampedCells: rd.clampedCells, triangles: rd.triangles, surfaceStats: rd.surfaceStats,
    surfaceData: rd.surfaceData, inventory: rd.inventory ?? null };
  // (claude/drivecheck round 2, rule 27) no LiDAR trunk on the DRAWN carriageway: pipeline/filter_road_trees.py only knew
  // the measured surfaces, where a street has none the OSM band is drawn and the crown peak's trunk stood in it
  // (viewer/streets/roadTrees.js); before the parking, traffic, colliders and the drawn tree list read feats.trees.
  // entry.roadTrees === false (?roadtrees=old): as before
  let roadTrees = null;
  if (entry.roadTrees !== false && feats.trees?.length) {
    const fit0 = rd.surfaceData ? streetFit(rd.surfaceData) : null;
    // (a measured TRAM road keeps its trees: Avenue Churchill's tram reservation is a tram road in UrbIS, its two tree rows
    // stand on it; browser turn, tour churchill-blocks. Only the roadway / parking where measured, the OSM band elsewhere)
    const noTram = fit0?.classAt ? (x, z) => { const c = fit0.classAt(x, z); return c === 1 ? 2 : c; } : null;
    roadTrees = await step("road trees", () => treesOffCarriageway(feats.trees, carriageway(roads, { classAt: noTram, onDeck: null }),
      { inTile: (x, z) => x >= x0 && x < x1 && z >= z0 && z < z1, inBuilding: (x, z) => onRoof(roofs, x, z), ground: (x, z) => hm.ground(x, z) }));
    feats.trees = roadTrees.trees;
    // markings round 2 (rule 33): a LiDAR tree kept on a measured tram road but standing in a PAINTED driving lane (or
    // within 0.3 m of one) moves off it the same way (or is dropped); the tram reservation's rows are not in a driving
    // lane and stay (rows: below). (entry.roadLines false: no fitted lanes, nothing to do)
    const inLane = fit0?.classAt ? paintedDriveLanes(rd.net, paintedLaneCentre, roadFrameOf, 0.3) : null;
    if (inLane) {
      const base = carriageway(roads, { classAt: noTram, onDeck: null });
      const lanes = { inside: (x, z, m = 0) => (fit0.classAt(x, z) === 1 ? inLane(x, z) : base.inside(x, z, m)) };
      // (a tree in a ROW on the tram road, two more within 12 m, is the reservation's planting (Avenue Churchill: one OSM
      // road with the reservation in its middle, its stack painted over it): kept)
      const onTram = feats.trees.filter((t) => fit0.classAt(t.x, t.z) === 1);
      const inRow = (t) => onTram.filter((o) => o !== t && Math.hypot(o.x - t.x, o.z - t.z) < 12).length >= 2;
      const r2 = treesOffCarriageway(feats.trees, lanes, { inTile: (x, z) => x >= x0 && x < x1 && z >= z0 && z < z1, inBuilding: (x, z) => onRoof(roofs, x, z), ground: (x, z) => hm.ground(x, z), keep: inRow });
      feats.trees = r2.trees; roadTrees.lanesMoved = r2.moved; roadTrees.lanesDropped = r2.dropped;
    }
  }
  // (again after the road stage: its terrain weld brought the bank back up over a plan deck's tucked ends)
  netInfo.deckUnder2 = deckUnderCut(osmBridges.decks, [hm.y, hm.orig], tHdr);
  const net = rd.net;              // the live engine network (stays in the worker: drive colliders)
  // (x, z) -> true where a measured street surface is drawn (a plan deck's top tucks under it: bridgeDecks.js)
  const sg = rd.surfaceData?.grid;
  const measuredAt = sg ? (x, z) => { const i = Math.floor((x - sg.x0) / sg.step), j = Math.floor((z - sg.z0) / sg.step); return i >= 0 && j >= 0 && i < sg.nx && j < sg.nz && sg.data[j * sg.nx + i] > 0; } : null;
  // park ponds (entry.ponds, viewer/water/pondBed.js): the bed carved under the water before the terrain mesh is built
  // (and their OSM water areas leave the land-cover mask: the ground under the pond is the bank / bed, the water is the pond's own surface)
  if (entry.ponds?.length) { const ids = new Set(entry.ponds.map((p) => p.osm).filter(Boolean)); feats.areas = (feats.areas || []).filter((a) => !ids.has(a.id)); }
  if (entry.ponds?.length) await step("pond beds", () => carvePonds(hm, entry.ponds.filter((p) => p.ring.some(([x, z]) => x >= x0 - 5 && x <= x1 + 5 && z >= z0 - 5 && z <= z1 + 5))));
  // Square des Heros: the terrain under the memorial's two flights of steps (viewer/heros/herosSurface.js carveFlights)
  if (entry.heros?.carves?.length) await step("heros steps", () => carveFlights(hm, entry.heros.carves));
  // ?trains=1: the terrain under the ballast / platforms / hero arches, the fills at viaduct ends; then the tile's rail
  // geometry as typed arrays (viewer/rail/railData.js; the main thread only wraps them in buffers)
  let railOut = null;
  if (rail) {
    const c = await step("rail carve", () => carveGrid(rail.doc, hm.y, tHdr, bounds, rail.heroes, { platformEdge: entry.platformEdge !== false }));
    // (vivier: the catenary under the OSM decks' soffits, no UrbIS slab where a deck is drawn or in the cutting)
    const vv = entry.vivier !== false, foots = osmBridges.decks.map(deckFootprint);
    railOut = await step("rail meshes", () => railTileData(rail.doc, bounds, rail.heroes, vv ? { deckCap: deckSoffitCap(osmBridges.decks), skipDeck: (b) => foots.some((f) => f(b.centre[0], b.centre[1])) } : {}));
    railOut.stats.carved = c.moved; railOut.stats.treesDropped = railDropped;
  }
  if (tcut) tcut.recut = tunnelRecut(tcut, hm);        // the rail's embankment fill does not fill the bores again
  // the lane graph for the moving traffic (viewer/traffic/: lanes on the measured carriageway, connectors, junction
  // control from OSM, conflicts). Round 4: built on the roads2 network (rd.net, its lane graph already repaired by
  // viewer/streets/laneGraph.js) and the measured class raster
  // citydefects: the parked cars by the measured width (viewer/streets/parkPlace.js widthParking; entry.parkWidth false =
  // ?parkclear=old: the main thread's old slots), here so the traffic lanes keep clear of them (trafficGraph.js)
  const parked = entry.parkWidth !== false && road.surfaceData ? await step("parking", () => widthParking(roads, feats, bounds, streetFit(road.surfaceData))) : null;
  const traffic = await step("traffic graph", () => buildTrafficGraph(net, roads, feats, bounds, road.surfaceData?.grid, { parked: parked?.sites, old: entry.trafpark === false }));
  // (claude/drivecheck round 2) the lanes over a hero road deck inside its roadway, clear of its parapets (rail/roadDeck.js)
  const deckLanes = rail && traffic && entry.deckLanes !== false ? squeezeDeckLanes(traffic, rail.heroes) : 0;
  // trafpark: the graph checks every driven path (lanes + junction connectors) against the parked cars' boxes and keeps
  // only the cars no path touches (a car the lanes could not be moved clear of: a junction corner, a street too narrow)
  if (parked && traffic.parkedKept) { parked.stats.trafparkDropped = parked.sites.length - traffic.parkedKept.length; parked.sites = traffic.parkedKept; }
  delete traffic.parkedKept;
  const terrain = await step("terrain grid", () => terrainArrays(hm, entry.groundFit !== false));
  // the tunnels: the drawn earth over the bores (the lid) and the ground clipped at the walls (tunnels.js)
  if (tcut) netInfo.tunnels = await step("tunnel terrain", () => tunnelTerrain(tcut, terrain, hm, rail?.doc, bounds));
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
  roofs.surf = await step("roof surface", () => roofSurface(bDoc, bBuf, bounds));      // the falcon's collision (drawn roofs)
  // the railway for the car (viewer/rail/railData.js): fences along the line where it runs on the ground (not on bridges,
  // not over a tunnel, broken at road crossings), and below the line's own surface in the drive grid (rail top, shoulders)
  const fences = rail && !keep && entry.railFix ? await step("rail fences", () => railFences(rail.doc, bounds, rail.heroes, roads, hm.ground)) : null;
  if (fences && tcut) fences.rings = tunnelFenceRings(tunnels, fences);         // no fence collider over a bore (tunnels.js)
  // the ground AS DRAWN and the walls' feet sunk onto it BEFORE the drive colliders (claude/collisions, rule 25): the
  // building colliders are traced from these walls at car height (colliders.js buildingBlocks); traced from the solids
  // before sinkFeet, a solid standing up to 2.8 m over a slope had no wall in the car band where its drawn wall (sunk
  // to the ground) stands: drawn, driven into (tools/audit/colliderAudit.mjs "missing"). entry.colFeet === false
  // (?colfeet=old): the feet after the colliders, as before (the same drawn walls)
  const fitGround0 = entry.groundFit !== false ? await step("ground fit", () => drawnGround(hm, road.parts)) : null;
  // the walls' feet down to the drawn ground where they stood over it (JOINS; viewer/groundFit.js sinkFeet): the façades
  // and (now) the drive colliders are built from these walls (the roof grids above read the solids)
  const sinkWalls = () => (fitGround0 && bBuf ? step("wall feet", () => { const dv = new DataView(bBuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
    return sinkFeet(bDoc, new Float32Array(bBuf, 8, V * 3), new Uint32Array(bBuf, 8 + V * 12, T * 3), fitGround0, footprintIndex(bDoc)); }) : null);
  const feetEarly = entry.colFeet === false ? null : await sinkWalls();
  const feetLate = () => sinkWalls();
  // (claude/deckrail, rule 17) the drive raster once, here: the decks' parapets / railings are left off every edge where
  // the drawn street, another deck, a lane or a tram track goes on at the deck's level (bridgeDecks.js markRailCuts: the same
  // decision for the drawn deck below and its car walls); entry.deckRail === false (?deckrail=old): as before
  const raster0 = osmBridges.decks.length && !keep ? driveGround(hm, road.parts) : null;
  const railCuts = raster0 && entry.deckRail !== false ? await step("deck rails", () => markRailCuts(osmBridges.decks, deckContinuation({ hm, raster: raster0, decks: osmBridges.decks, lines: feats.lines || [],
    paths: traffic?.xy ? Array.from({ length: traffic.paths }, (_, p) => traffic.xy.subarray(traffic.off[p] * 2, traffic.off[p + 1] * 2)) : [] }))) : null;
  const drive = await step("drive colliders", () => buildDriveData({ ground: raster0, bDoc: keep || bDoc, bBuf: keep ? null : bBuf, net, feats, hm, parts: road.parts, bounds, surf, legacy: !!entry.driveLegacy, clipBand: entry.colBand !== false,   // boot3: ?colband=old every wall sample (colliders.js buildingBlocks)
    // the walls with their vertical extent (colliders.js heightClear): a car on a road bridge over a station's platform
    // or the line's fence passes over them
    walls: keep ? [] : [...(rail?.doc.platforms || []).map((p) => ({ ring: p.ring, top: p.top, base: p.top - 1.2 })),   // (base: a car far under it passes: Linkebeek's platforms over the Kleindalstraat bore)
      // the road bridges' parapets (citydefects 2026-11-16: this spread had slipped into the comment above, so no OSM
      // deck's parapet was a car wall since the round-2 edit)
      ...osmBridges.decks.flatMap((d) => parapetRings(d, hm.ground)),
      ...(fences?.rings || []).map((ring) => ({ ring, top: Math.max(...ring.map(([x, z]) => hm.surface(x, z))) + FENCE_H }))] }));   // + the road bridges' parapets          // rail platforms: 0.76 m walls for the car   // drive mode (viewer/drive/)
  if (rail && !keep && entry.railFix) drive.counts.railSurface = await step("rail drive surface", () => railDriveSurface(rail.doc, hm, drive.ground, bounds, rail.heroes));
  if (fences) drive.counts.railFences = fences.rings.length;
  if (railCuts != null) drive.counts.deckRailCuts = railCuts;
  if (roadTrees) drive.counts.roadTrees = { moved: roadTrees.moved, dropped: roadTrees.dropped, lanesMoved: roadTrees.lanesMoved ?? 0, lanesDropped: roadTrees.lanesDropped ?? 0 };
  if (deckLanes) drive.counts.deckLanes = deckLanes;
  // the tram platforms (drawn by viewer/tram.js 25 cm over the road) in the drive surface: the car rides up their kerb
  // instead of sinking into the slab (docs/collisions/DRIVE_FIX.md); ?colfix=0 keeps the old surface
  if (!keep) drive.counts.tramPlatforms = tramPlatformSurface(feats, hm, drive.ground, bounds, CARVE);
  if (fences && railOut) railOut.fences = fenceMesh(fences.lines, tunnelSurface(tcut, hm.surface));   // (over a bore: on the drawn earth)        // drawn: viewer/rail/railway.js
  drive.counts.hidden = nb - bDoc.buildings.length;     // solids a hero model replaces (it collides by its own LOD0)
  // ?kit=1: the façade kit's placement (viewer/facadeKit/placement.js) runs inside the analysis, here in the worker;
  // entry.kitExclude = BU_IDs a hero model or the interior pilot replaces
  // the ground AS DRAWN (terrain after carve / weld + the street surfaces): the façades' ground-floor line and the kit's
  // door steps stand on it (viewer/groundFit.js, docs/GROUND_FIT.md); entry.groundFit === false (?groundfit=old): the
  // lowest DTM point and the bare DTM, as before
  const fitGround = fitGround0;
  const kit = entry.kit ? kitCollector({ exclude: new Set(entry.kitExclude || []), ground: fitGround || ((x, z) => hm.ground(x, z)), fit: entry.storeys !== false }) : null;
  // entry.streetlife (the street-life layer, viewer/streetlife/, on by default in the city): its shopfronts replace the
  // OSM shop points of the façade analysis (data/streetlife/<T>.json; a tile without one keeps the OSM shops)
  const fronts = entry.streetlife ? await step("street-life fronts", () => streetlifeFronts(base, entry.name)) : null;
  // entry.roofs !== false: the roof kit (viewer/roofs/roofPlace.js, docs/assets/ROOFS.md; ?roofs=old = the roofs before)
  const roofKit = entry.roofs !== false ? roofCollector() : null;
  const feet = entry.colFeet === false ? await feetLate() : feetEarly;   // (the walls' feet: sunk before the drive colliders, above)
  const buildings = await step("façade analysis", () => analyseBuildings(bDoc, bBuf, roads, feats, { kit, fronts, roofs: roofKit, ground: fitGround, fitExclude: new Set(entry.kitExclude || []), storeys: entry.storeys !== false, styles: entry.styles !== false, balcony: entry.balcony !== false, zfight: entry.zfight !== false, cellar: entry.cellar !== false, wallFix: entry.wallFix !== false, roofFlat: entry.roofFlat !== false, looks: entry.looks === false ? null : lookSet(ov.buildingLooks, entry) }));
  // what the roof kit stands on the roofs, in the falcon's drawn-roof grid (it collides with what is drawn)
  if (feet) buildings.stats.feet = feet;
  if (buildings.roofKit && roofs.surf) buildings.roofKit.stats.stampedCells = stampRoofCols(roofs.surf, buildings.roofKit.cols);
  const cover = await step("land cover", () => landCoverData(withoutLines(feats, entry.heros?.paths), bounds, { sdf: entry.groundSdf !== false }));   // joins2: distance-field edges, ?groundsdf=old the coverage mask   // (Square des Heros: its paths are the hero ground's)
  // (vivier) the drawn street's top near (x, z): the nearest road-surface cell of the drive raster within 2 m (a plan
  // deck's paving between the UrbIS surfaces sits a kerb over the street beside it, not on its own plane up to 0.35 m off)
  const streetTop = (x, z) => {
    const H = hm.h, dl = drive.ground.delta, c0 = Math.round((x - H.x0) / H.step), r0 = Math.round((z - H.z0) / H.step);
    let best = Infinity, y = null;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const c = c0 + dc, r = r0 + dr;
      if (c < 0 || r < 0 || c >= H.cols || r >= H.rows) continue;
      const k = r * H.cols + c, dd = dc * dc + dr * dr;
      if (dl[k] > 0 && dl[k] !== 65535 && dd < best) { best = dd; y = hm.y[k] + dl[k] / 100; }
    }
    return y;
  };
  // (vivier) a street of any kind drawn at (x, z): the measured surfaces, or the road engine's own pieces (the drive
  // raster): the plan deck's top tucks under both on the bridge road's own band (its paving drawn over the engine's
  // Chaussee was a raised strip; off the band the drive raster also holds tram platforms: tour, Saint-Job station)
  const drawnAt = (x, z) => {
    if (measuredAt && measuredAt(x, z)) return true;
    const H = hm.h, c = Math.round((x - H.x0) / H.step), r = Math.round((z - H.z0) / H.step);
    if (c < 0 || r < 0 || c >= H.cols || r >= H.rows) return false;
    const v = drive.ground.delta[r * H.cols + c];
    return v > 0 && v !== 65535 && Math.abs(hm.y[r * H.cols + c] + v / 100 - roadGround(x, z)) < 0.6;    // (not the rail's surface under the deck)
  };
  return { name: entry.name, bounds, hdr: tHdr, y: hm.y, orig: hm.orig, roads, feats, buildingCount: bDoc.count, roofs, drive,
    netInfo, road, terrain, buildings, cover, traffic, parked: parked ? { sites: parked.sites, stats: parked.stats } : null, times, rail: railOut, grassTypes,
    bridgeDecks: osmBridges.decks.filter(ownDeck).map((d) => { const v = entry.vivier !== false && !!d.plan?.urbis, cov = v && d.plan ? (x, z) => (measuredAt ? measuredAt(x, z) : false) || (onCarriageway(d, x, z) && drawnAt(x, z)) : measuredAt, tops = v && d.plan && measuredAt ? deckTopGrid(d, cov, streetTop) : null;
      return { ...d, ...(tops ? { plan: { ...d.plan, tops } } : {}), mesh: deckMesh(d, hm.ground, cov, v ? streetTop : null) }; }),   // (vivier: + the drawn top grid the walker / the car stand on)   // OSM road bridges: heights for walk / car + their drawn deck
    ...(entry.keepNet ? { net, hm, deckRings: osmBridges.decks.filter(ownDeck).map((d) => parapetRings(d, hm.ground)) } : {}) };    // (node checks, tools/roadfix/: the live road network; never posted from the worker)
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
  // (farcity, docs/FARCITY.md) the walls' face coordinates + the building type for viewer/farLook.js; entry.farLook ===
  // false (?farlook=old): the flat-coloured solids below
  if (entry.farLook !== false) {
    const fbd = farBuildings(bDoc, P, I, { styles: entry.styles !== false, storeys: entry.storeys !== false, looks: entry.looks === false || entry.cortenbosch2 === false ? null : lookSet((await overrides(base))?.buildingLooks, entry) });
    return { name: entry.name, terrain: { pos, nrm, uv, idx: idxS }, buildings: fbd, buildingCount: bDoc.count };
  }
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
  // (styles) the far tiles' wall colour from the same building types as the full tile (viewer/buildingTypes.js)
  const cls = entry.styles !== false ? classify(bDoc, P, I, (b, key) => wallStyle(hash01(key + "s"), b.height)) : null;
  bDoc.buildings.forEach((b, bi) => {
    const key = String(b.attrs?.BU_ID ?? b.id);
    const wall = b.attrs?._landmark ? [0.42, 0.4, 0.36] : WALL[cls ? Math.round(cls.style[bi]) : wallStyle(hash01(key + "s"), b.height)].map((v) => v * 0.85 + 0.02);
    if (cls && cls.type[bi] === TYPE.DECO && cls.style[bi] >= 2.5) for (let c = 0; c < 3; c++) wall[c] = wall[c] * 0.5 + 0.34;   // the light deco renders (facades.js)
    const roof = b.roofColor || [0.12, 0.08, 0.07];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) tri(t, wall);
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) tri(t, roof);
  });
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
