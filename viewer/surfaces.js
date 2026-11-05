// ?roads=surface: the street surfaces MEASURED by UrbIS (Land cover StreetSurfaces, data/tiles/<T>/surfaces.json,
// pipeline/build_surfaces.py) instead of the road engine's guessed carriageways, sidewalks and kerbs.
// docs/ROADS_RESEARCH.md §5 "surface first, semantics second". Pure JS (runs in the tile worker and in node).
//
// Three steps, all in the tile worker (viewer/tileData.js):
//   prepareSurfaces   the measured polygons cut into triangles on one height field, a class raster, kerb frames
//   fitRoadWidths     BEFORE the road engine runs: each road's lane stack is fitted into the measured kerb-to-kerb
//                     width (research §5 step 4), so the engine's edge lines and lanes land on the real kerbs
//   buildSurfaceRoads AFTER the engine: the meshes, in the same three parts the engine makes (one draw each):
//   asphalt   measured roadway, junctions, tram-shared roadway, parking and tram sites, PLUS the engine's own
//             asphalt laid LIFT above it, cut away only outside the measured street (front gardens, houses):
//             under a raised sidewalk / square it is simply hidden. It carries the engine's lane lines,
//             crosswalks, stop lines, arrows and parking ticks (aEdges / aMark) and its per-road surface. It comes
//             first in the index buffer, so the base under it fails the depth test early.
//   asphalt   also the raised squares (Place de Saint-Job): setts in rows along the square, KERB high.
//   concrete  sidewalks raised by KERB, paved in ONE continuous pattern per street (uv = station along the
//             nearest kerb, distance from it), a blue-stone kerb face along every kerb line with a 15 cm kerb
//             band on top, skirts down into the terrain along the outer edges.
//   grass     medians / islands (raised by MEDIAN_KERB, kerbed like sidewalks).
// Roads UrbIS does not map (private lanes, roads outside the region) keep the engine's mesh as it is (not on houses).
//
// HEIGHTS. One exact height field H(x, z) for everything: a CELL grid of corner heights, each cell split along its
// (i, j)-(i+1, j+1) diagonal into two planar triangles. Corners are fitted to the DTM at the street's own points
// (not the garden next to it) and smoothed along the street, so the surfaces have no folds. Every measured triangle
// lies inside one half-cell and takes y = H at its vertices: base, markings, sidewalks and kerb tops are exactly
// coplanar where they should be. Low surfaces sit on H, raised ones KERB above it; the terrain is carved under all.
import earcut from "three/src/extras/lib/earcut.js";
import { hashPhase, SURFACE } from "./roadData.js";
import { ROAD_TYPES, LANE_TYPES } from "../vendor/roads/roadCrossSection.js";

/** pipeline/build_surfaces.py CLASS */
export const SURF_CLASS = { roadway: 0, tramRoad: 1, tramSite: 2, parking: 3, square: 4, sidewalk: 5, median: 6, path: 7, ramp: 8, pit: 9 };
export const KERB = 0.13;          // sidewalk / square kerb face (m)
export const MEDIAN_KERB = 0.15;   // islands a touch taller
// ramp (a dropped kerb, build_surfaces.py): its height comes from the distance to the kerb (rampRise); RAISE is its
// mean, for the walker and the lamps
// pit: the soil of a tree pit (raster only: the walker and the tree stand on it), PIT_SINK under the paving
export const PIT_SINK = 0.04;
export const RAISE = [0, 0, 0, 0, KERB, KERB, MEDIAN_KERB, 0, 0.07, KERB - PIT_SINK];
export const RAMP_LOW = 0.02, RAMP_DEPTH = 1.0;   // a dropped kerb: 2 cm at the kerb, the full KERB 1 m behind it
// squares: their own part and material (viewer/cobbles.js: old irregular setts), one more draw where there is a square
const PART = ["asphalt", "asphalt", "asphalt", "asphalt", "square", "concrete", "grass", "concrete", "concrete", "pits"];
/** low classes the engine's markings may lie on (not tram sites or paths) */
const OVERLAY = [1, 1, 0, 1, 0, 0, 0, 0, 0, 0];
/** where the engine's asphalt may stay: markable low ground, or anything raised (it is hidden under it) */
const COVER = OVERLAY.map((o, c) => o || RAISE[c] > 0 ? 1 : 0);
/** the carriageway between kerbs, for the width fit */
const CARRIAGE = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
/** base surface code (roadData SURFACE): tram sites and squares setts (Place de Saint-Job, owner photos
 *  2026-11-05: the raised square is old setts, the roads round it asphalt), parking pavers */
const BASE_SURF = [0, 0, 1, 2, 1, 0, 0, 0, 0, 0];
export const CELL = 6;             // m: height-field grid
// corner smoothing passes: 0. Tried 1-3 (plane-preserving, 4-neighbour): the street moves away from the DTM
// (I6 median |H - DTM| 3.6 -> 6-10 cm), so folds are handled by the wide-stencil normals instead
const SMOOTH_PASSES = 0;
const LIFT = 0.006;                // engine marking layer above the measured base (reversed-z: far above precision)
const BASE_DROP = 0.01;            // the measured roadway base sits this far under H, the engine layer LIFT above it
const DEV = [-0.014, 0.012];       // so an uncut engine triangle may sit this far below / above H and stay on top
const BAND = 0.15;                 // kerb-stone band on top of the kerb
const BAND_LIFT = 0.004;
const KERB_DOWN = 0.03;            // kerb face starts this far under the roadway (no crack)
const SKIRT_DOWN = 0.2;            // outer skirts reach this far under H (terrain is carved 0.12)
// laneRoadMesh CONCRETE_KIND, plus 3: a sidewalk slab with kerb-frame uv (x = station along the kerb, y = metres
// from it): roadPaint concreteMaterial({ framed: true }) paves it along the street and paints the 15 cm blue-stone
// kerb band where y < BAND (no band geometry on sidewalks)
const KIND = { slab: 0, curb: 1, framed: 3 };
export const GRID = 0.5;           // m: class raster

// ---------------------------------------------------------------- small geometry

/** Sutherland-Hodgman against one line: keep the side where s * cross(b - a, p - a) >= 0. */
function clipHalf(poly, ax, az, bx, bz, s) {
  const out = [], n = poly.length;
  if (!n) return out;
  const side = (p) => s * ((bx - ax) * (p[1] - az) - (bz - az) * (p[0] - ax));
  let prev = poly[n - 1], dp = side(prev);
  for (let k = 0; k < n; k++) {
    const cur = poly[k], dc = side(cur);
    if (dc >= 0) {
      if (dp < 0) { const t = dp / (dp - dc); out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]); }
      out.push(cur);
    } else if (dp >= 0) { const t = dp / (dp - dc); out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]); }
    prev = cur; dp = dc;
  }
  return out;
}

/** Polygon cut to half-cell (i, j, h): h 0 = the triangle (i,j)(i+1,j)(i+1,j+1), h 1 = (i,j)(i+1,j+1)(i,j+1). */
function clipHalfCell(poly, i, j, h) {
  const x0 = i * CELL, z0 = j * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
  let p = clipHalf(poly, x0, z0, x1, z0, 1);     // z >= z0
  p = clipHalf(p, x1, z1, x0, z1, 1);            // z <= z1
  p = clipHalf(p, x0, z1, x0, z0, 1);            // x >= x0
  p = clipHalf(p, x1, z0, x1, z1, 1);            // x <= x1
  return clipHalf(p, x0, z0, x1, z1, h ? 1 : -1);   // diagonal: h 0 keeps fx >= fz, h 1 keeps fx <= fz
}

const area2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const ringArea = (p) => { let s = 0; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

/** Barycentric weights of p in triangle (a, b, c), or null if degenerate. */
function bary(p, a, b, c) {
  const d = area2(a, b, c);
  if (Math.abs(d) < 1e-12) return null;
  const l1 = area2(p, b, c) / d, l2 = area2(a, p, c) / d;
  return [l1, l2, 1 - l1 - l2];
}

/** Earcut triangles of one ring (flat coords) merged into few convex CCW polygons (Hertel-Mehlhorn: drop a
 *  diagonal whenever the two sides together stay convex). */
function convexParts(flat, tris) {
  const P = (i) => [flat[2 * i], flat[2 * i + 1]];
  const polys = [];
  for (let q = 0; q < tris.length; q += 3) {
    let t = [tris[q], tris[q + 1], tris[q + 2]];
    const a = area2(P(t[0]), P(t[1]), P(t[2]));
    if (Math.abs(a) < 1e-9) continue;
    if (a < 0) t = [t[0], t[2], t[1]];
    polys.push(t);
  }
  const convexOk = (poly) => {
    for (let k = 0; k < poly.length; k++) if (area2(P(poly[k]), P(poly[(k + 1) % poly.length]), P(poly[(k + 2) % poly.length])) < -1e-9) return false;
    return true;
  };
  const rot = (A, k) => A.slice(k).concat(A.slice(0, k));
  for (let merged = true; merged;) {
    merged = false;
    search: for (let x = 0; x < polys.length; x++) for (let y = x + 1; y < polys.length; y++) {
      const A = polys[x], B = polys[y];
      for (let k = 0; k < A.length; k++) {
        const u = A[k], v = A[(k + 1) % A.length];
        const j = B.findIndex((w, m) => w === v && B[(m + 1) % B.length] === u);
        if (j < 0) continue;
        const cand = rot(A, (k + 1) % A.length).concat(rot(B, (j + 1) % B.length).slice(1, -1));   // v..u then u..v inner
        if (!convexOk(cand)) continue;
        polys[x] = cand; polys.splice(y, 1); merged = true;
        break search;
      }
    }
  }
  return polys.map((p) => p.map(P));
}

const cellKey = (i, j) => (i + 4096) * 8192 + (j + 4096);
const halfKey = (i, j, h) => cellKey(i, j) * 2 + h;
const push = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);

// ---------------------------------------------------------------- output parts (laneRoadMesh layout)

class Part {
  constructor(extras) {
    this.pos = []; this.nrm = []; this.uv = []; this.idx = []; this.idxFirst = [];
    this.extras = Object.entries(extras).map(([name, size]) => ({ name, size, data: [] }));
    this.keys = new Map();
  }
  get count() { return this.pos.length / 3; }
  vert(x, y, z, n, u, v, ex) {
    const i = this.count;
    this.pos.push(x, y, z); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v);
    for (const e of this.extras) {
      const val = ex?.[e.name] ?? 0;
      if (e.size === 1) e.data.push(val); else for (let k = 0; k < e.size; k++) e.data.push(val[k] ?? 0);
    }
    return i;
  }
  /** shared vertex by key (welded mesh) */
  keyed(key, make) { let i = this.keys.get(key); if (i === undefined) { i = make(); this.keys.set(key, i); } return i; }
  /** triangle wound to face `n`; `first`: goes before every other triangle in the index buffer */
  tri(a, b, c, n, first = false) {
    const P = this.pos;
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-14) return false;
    const d = cx * n[0] + cy * n[1] + cz * n[2];
    const I = first ? this.idxFirst : this.idx;
    if (d >= 0) I.push(a, b, c); else I.push(a, c, b);
    return true;
  }
  finish(extraName) {
    const attributes = {};
    let extra = null;
    for (const e of this.extras) {
      const arr = Float32Array.from(e.data);
      if (e.name === extraName) extra = arr; else attributes[e.name] = { array: arr, itemSize: e.size };
    }
    const index = new Uint32Array(this.idxFirst.length + this.idx.length);
    index.set(this.idxFirst); index.set(this.idx, this.idxFirst.length);
    return { position: Float32Array.from(this.pos), normal: Float32Array.from(this.nrm), uv: Float32Array.from(this.uv), attributes,
      index, vertexCount: this.count, extra };
  }
}

// ---------------------------------------------------------------- 1. prepare

/**
 * @param {object} surf   surfaces.json
 * @param {(x:number, z:number) => number} ground  the un-carved DTM
 * @param {{x0,x1,z0,z1}} bounds  the tile
 */
/** classes a tree pit is cut into (paved, walked on): parking, square, sidewalk, median */
const PIT_HOST = new Set([3, 4, 5, 6]);

/**
 * TREE PITS. Every tree (LiDAR canopy peak or OSM) whose trunk stands on paved measured ground gets a square pit:
 * four big stone slabs (pinwheel, flush with the paving) framing sunk soil, the trunk in the middle. The pit is
 * centred on the trunk and only nudged (<= 0.25 m) if it would not fit on the paving; aligned to the nearest kerb,
 * or to the square's rows. Returns [{ x, z, tx, tz, o (half size), w (slab width), host, raise, tree }].
 * No cast-iron grate: the owner's Place de Saint-Job pits are open soil, and no Uccle photo source was checked yet.
 */
function placePits(trees, classAt, nearKerb, surf, bounds) {
  const out = [];
  for (const t of trees || []) {
    if (t.x < bounds.x0 || t.x >= bounds.x1 || t.z < bounds.z0 || t.z >= bounds.z1) continue;
    const host = classAt(t.x, t.z);
    if (!PIT_HOST.has(host)) continue;
    if (out.some((q) => (q.x - t.x) ** 2 + (q.z - t.z) ** 2 < (q.o * 2) ** 2)) continue;   // a neighbour's pit is here
    const big = host === SURF_CLASS.square || host === SURF_CLASS.median;
    // the pit grows with the tree (old plane trees have trunks ~1 m across): half size 0.7 .. 1.1 m
    const want = Math.min(1.1, Math.max(big ? 0.8 : 0.7, 0.45 + 0.03 * (t.height ?? 9))), w = big ? 0.22 : 0.2;
    let o = want;
    // axis: the square's rows, else the nearest kerb, else north
    let tx = 1, tz = 0;
    const k = nearKerb(t.x, t.z);
    if (host === SURF_CLASS.square) {
      const sq = surf.surfaces.find((q) => q.c === SURF_CLASS.square && q.course != null);
      if (sq) { tx = Math.cos(sq.course * Math.PI / 180); tz = Math.sin(sq.course * Math.PI / 180); }
    } else if (k) { tx = k.tx; tz = k.tz; }
    const fits = (cx, cz) => {
      for (const a of [-1, -0.5, 0, 0.5, 1]) for (const b of [-1, -0.5, 0, 0.5, 1]) {
        const x = cx + (tx * a - tz * b) * o, z = cz + (tz * a + tx * b) * o;
        if (classAt(x, z) !== host) return false;
      }
      return true;
    };
    // nudge only: the trunk stays inside the soil square (half o - w >= 0.5 m)
    const nx = -tz, nz = tx, away = k && k.d < 0 ? -1 : 1;     // away from the kerb = toward the raised side
    let c = null;
    for (const size of [want, 0.7]) {           // the full size, else the standard 1.4 m pit
      o = size;
      for (const [du, dv] of [[0, 0], [0, 0.25 * away], [0.25, 0], [-0.25, 0], [0.25, 0.25 * away], [-0.25, 0.25 * away], [0, -0.25 * away]])
        if (fits(t.x + tx * du + nx * dv, t.z + tz * du + nz * dv)) { c = [t.x + tx * du + nx * dv, t.z + tz * du + nz * dv]; break; }
      if (c) break;
    }
    if (!c) continue;
    out.push({ x: c[0], z: c[1], tx, tz, o, w, host, raise: RAISE[host], tree: [t.x, t.z] });
  }
  return out;
}

export function prepareSurfaces(surf, ground, bounds, trees = null) {
  const t0 = (globalThis.performance ?? Date).now();
  const G = ground;
  const base = [];                       // { cls, si, a, b, c, hk }
  const halves = new Map();              // halfKey -> base indices
  const coverArea = new Map();           // halfKey -> area of COVER-class triangles
  const convexCover = new Map();         // halfKey -> that area as few convex CCW polygons
  let fallbacks = 0;
  const addTri = (cls, si, a, b, c, hk) => {
    const A = Math.abs(area2(a, b, c)) / 2;
    if (A < 5e-8) return;
    base.push({ cls, si, a, b, c, hk });
    push(halves, hk, base.length - 1);
    if (COVER[cls]) coverArea.set(hk, (coverArea.get(hk) || 0) + A);
  };
  surf.surfaces.forEach((s, si) => {
    const rings = s.rings;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    // rings with holes (build_surfaces.py splits them, but an older file may have them): earcut the polygon,
    // then cut each (convex) triangle to its own half-cells
    if (rings.length > 1) {
      fallbacks++;
      const flat = [], holes = [];
      rings.forEach((r, k) => { if (k) holes.push(flat.length / 2); for (const [x, z] of r) flat.push(x, z); });
      const t = earcut(flat, holes, 2);
      for (let q = 0; q < t.length; q += 3) {
        const tri = [0, 1, 2].map((m) => [flat[t[q + m] * 2], flat[t[q + m] * 2 + 1]]);
        const xs = tri.map((p) => p[0]), zs = tri.map((p) => p[1]);
        for (let i = Math.floor(Math.min(...xs) / CELL); i <= Math.floor(Math.max(...xs) / CELL); i++)
          for (let j = Math.floor(Math.min(...zs) / CELL); j <= Math.floor(Math.max(...zs) / CELL); j++) for (let h = 0; h < 2; h++) {
            const p = clipHalfCell(tri, i, j, h), hk = halfKey(i, j, h);
            if (p.length < 3) continue;
            for (let k = 1; k + 1 < p.length; k++) addTri(s.c, si, p[0], p[k], p[k + 1], hk);
            if (COVER[s.c]) push(convexCover, hk, ringArea(p) < 0 ? p.slice().reverse() : p);
          }
      }
      return;
    }
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) for (let h = 0; h < 2; h++) {
      const hk = halfKey(i, j, h);
      const p = clipHalfCell(rings[0], i, j, h);
      if (p.length < 3) continue;
      const A = Math.abs(ringArea(p));
      if (A < 1e-4) continue;
      const flat = p.flat(), tris = earcut(flat, null, 2);
      const T = (q) => [flat[tris[q] * 2], flat[tris[q] * 2 + 1]];
      let At = 0;
      for (let q = 0; q < tris.length; q += 3) At += Math.abs(area2(T(q), T(q + 1), T(q + 2))) / 2;
      if (Math.abs(At - A) > 1e-3 * Math.max(1, A)) fallbacks++;        // a degenerate clip: keep what earcut made
      for (let q = 0; q < tris.length; q += 3) addTri(s.c, si, T(q), T(q + 1), T(q + 2), hk);
      if (COVER[s.c]) for (const c of convexParts(flat, tris)) push(convexCover, hk, c);
    }
  });
  const halfOf = (x, z) => { const i = Math.floor(x / CELL), j = Math.floor(z / CELL); return [i, j, x / CELL - i >= z / CELL - j ? 0 : 1]; };
  /** the base triangle under (x, z) (optionally of classes `want` accepts) */
  const baseAt = (x, z, want) => {
    const [i, j, h] = halfOf(x, z);
    for (const hh of [h, 1 - h]) {           // points on the diagonal may be filed in the other half
      const ids = halves.get(halfKey(i, j, hh));
      if (!ids) continue;
      for (const id of ids) {
        const b = base[id];
        if (want && !want(b.cls)) continue;
        const w = bary([x, z], b.a, b.b, b.c);
        if (w && w[0] >= -1e-7 && w[1] >= -1e-7 && w[2] >= -1e-7) return b;
      }
    }
    return null;
  };

  // ---- class raster (GRID m): class + 1, 0 = no measured surface. Used by the width fit and the main thread
  // (walker height, lamps, parked cars).
  const nx = Math.round((bounds.x1 - bounds.x0) / GRID), nz = Math.round((bounds.z1 - bounds.z0) / GRID);
  const grid = new Uint8Array(nx * nz);
  for (const b of base) {
    const xs = [b.a[0], b.b[0], b.c[0]], zs = [b.a[1], b.b[1], b.c[1]];
    const i0 = Math.max(0, Math.floor((Math.min(...xs) - bounds.x0) / GRID)), i1 = Math.min(nx - 1, Math.floor((Math.max(...xs) - bounds.x0) / GRID));
    const j0 = Math.max(0, Math.floor((Math.min(...zs) - bounds.z0) / GRID)), j1 = Math.min(nz - 1, Math.floor((Math.max(...zs) - bounds.z0) / GRID));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const w = bary([bounds.x0 + (i + 0.5) * GRID, bounds.z0 + (j + 0.5) * GRID], b.a, b.b, b.c);
      if (w && w[0] >= -1e-7 && w[1] >= -1e-7 && w[2] >= -1e-7) grid[j * nx + i] = b.cls + 1;
    }
  }
  const classAt = (x, z) => {
    const i = Math.floor((x - bounds.x0) / GRID), j = Math.floor((z - bounds.z0) / GRID);
    return i >= 0 && j >= 0 && i < nx && j < nz ? grid[j * nx + i] - 1 : -1;
  };

  // ---- the height field. A grid corner often lies off the street (a front garden, a bank, a wall foot 1 m
  // higher), so its value is a weighted least-squares plane through the DTM at the measured-surface points around
  // it (1 m lattice within one CELL, tent weights), evaluated at the corner. Then two smoothing passes over the
  // corners of the street (each corner halfway to the mean of its street neighbours), so the planes do not fold.
  const fitCorner = (cx, cz) => {
    let sw = 0, sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sy = 0, sxy = 0, szy = 0, n = 0;
    for (let dx = -CELL + 0.5; dx < CELL; dx += 1) for (let dz = -CELL + 0.5; dz < CELL; dz += 1) {
      const x = cx + dx, z = cz + dz;
      if (classAt(x, z) < 0) continue;                         // only the street's own ground
      const w = (1 - Math.abs(dx) / CELL) * (1 - Math.abs(dz) / CELL), y = G(x, z);
      sw += w; sx += w * dx; sz += w * dz; sxx += w * dx * dx; sxz += w * dx * dz; szz += w * dz * dz; sy += w * y; sxy += w * dx * y; szy += w * dz * y; n++;
    }
    if (n === (2 * CELL) ** 2 || n < 6) return G(cx, cz);       // all street (G is right) / too little street
    const det3 = (a, b, c, d, e, f, g, h, k) => a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
    const D = det3(sw, sx, sz, sx, sxx, sxz, sz, sxz, szz);
    if (Math.abs(D) < 1e-9) return sy / sw;
    return det3(sy, sx, sz, sxy, sxx, sxz, szy, sxz, szz) / D;
  };
  const inside = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  const corner = new Map();
  const street = new Set();
  for (const b of base) {
    const cx = (b.a[0] + b.b[0] + b.c[0]) / 3, cz = (b.a[1] + b.b[1] + b.c[1]) / 3;
    const i = Math.floor(cx / CELL), j = Math.floor(cz / CELL);
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) street.add(cellKey(i + di, j + dj));
  }
  for (const k of street) { const i = Math.floor(k / 8192) - 4096, j = (k % 8192) - 4096; corner.set(k, fitCorner(i * CELL, j * CELL)); }
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const next = new Map();
    for (const k of street) {
      let s = 0, n = 0;
      for (const d of [8192, -8192, 1, -1]) { const v = corner.get(k + d); if (v !== undefined && street.has(k + d)) { s += v; n++; } }
      // only corners with all four street neighbours: their mean keeps a sloping plane exactly (an edge corner
      // pulled toward one side would sink or rise by the slope)
      next.set(k, n === 4 ? 0.5 * corner.get(k) + 0.5 * s / n : corner.get(k));
    }
    for (const [k, v] of next) corner.set(k, v);
  }
  const Gc = (i, j) => { const k = cellKey(i, j); let v = corner.get(k); if (v === undefined) { v = fitCorner(i * CELL, j * CELL); corner.set(k, v); } return v; };
  const H = (x, z) => {
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL), fx = x / CELL - i, fz = z / CELL - j;
    const g00 = Gc(i, j), g11 = Gc(i + 1, j + 1);
    return fx >= fz ? g00 + fx * (Gc(i + 1, j) - g00) + fz * (g11 - Gc(i + 1, j))
      : g00 + fz * (Gc(i, j + 1) - g00) + fx * (g11 - Gc(i, j + 1));
  };
  // shading normals: central differences of H over 3 m, so the half-cell creases do not show in the light
  const nrmAt = (x, z) => {
    const hx = (H(x + 3, z) - H(x - 3, z)) / 6, hz = (H(x, z + 3) - H(x, z - 3)) / 6, L = Math.hypot(hx, 1, hz);
    return [-hx / L, 1 / L, -hz / L];
  };

  // ---- kerb frames: every kerb polyline with its stations, in an 8 m grid of segments
  const lines = (surf.kerbs || []).map((l) => {
    const cum = [0];
    for (let k = 1; k < l.length; k++) cum.push(cum[k - 1] + Math.hypot(l[k][0] - l[k - 1][0], l[k][1] - l[k - 1][1]));
    // curvature (1/m) at each vertex, then per segment the mean of its ends
    const kv = l.map((p, k) => {
      if (k === 0 || k === l.length - 1) return 0;
      const a = l[k - 1], b = l[k + 1], ux = p[0] - a[0], uz = p[1] - a[1], vx = b[0] - p[0], vz = b[1] - p[1];
      const ang = Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz);
      return Math.abs(ang) / Math.max(0.05, (Math.hypot(ux, uz) + Math.hypot(vx, vz)) / 2);
    });
    return { pts: l, cum, kap: kv.slice(1).map((v, k) => (v + kv[k]) / 2) };
  });
  const segs = new Map();
  lines.forEach((L, li) => {
    for (let k = 1; k < L.pts.length; k++) {
      const [ax, az] = L.pts[k - 1], [bx, bz] = L.pts[k];
      for (let i = Math.floor(Math.min(ax, bx) / 8); i <= Math.floor(Math.max(ax, bx) / 8); i++)
        for (let j = Math.floor(Math.min(az, bz) / 8); j <= Math.floor(Math.max(az, bz) / 8); j++) push(segs, cellKey(i, j), [li, k]);
    }
  });
  /** nearest kerb point (optionally on line `only`) within ~16 m: { li, s (station), d (signed: + = raised side),
   *  x, z (on the kerb), tx, tz (unit tangent) } */
  const nearKerb = (x, z, only = -1) => {
    let best = null, bd = 16 * 16;
    const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8), seen = new Set();
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) for (const [li, k] of segs.get(cellKey(i0 + di, j0 + dj)) || []) {
      if ((only >= 0 && li !== only) || seen.has(li * 1e6 + k)) continue;
      seen.add(li * 1e6 + k);
      const L = lines[li], [ax, az] = L.pts[k - 1], [bx, bz] = L.pts[k], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t;
      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < bd) {
        bd = d2;
        const l = Math.sqrt(l2), tx = dx / l, tz = dz / l;
        best = { li, s: L.cum[k - 1] + t * l, d: (x - px) * -tz + (z - pz) * tx, x: px, z: pz, tx, tz, kap: L.kap[k - 1] };
      }
    }
    return best;
  };
  /** height of a dropped kerb above H: RAMP_LOW at the kerb, KERB at RAMP_DEPTH behind it */
  const rampRise = (x, z) => { const k = nearKerb(x, z); const d = k ? Math.max(0, k.d) : RAMP_DEPTH; return RAMP_LOW + (KERB - RAMP_LOW) * Math.min(1, d / RAMP_DEPTH); };
  /** height above H of the surface class c at (x, z) */
  const riseAt = (c, x, z) => (c === SURF_CLASS.ramp ? rampRise(x, z) : RAISE[c]);
  // ---- tree pits: cut their outer squares out of the paving, mark their soil in the raster
  const pits = trees ? placePits(trees, classAt, nearKerb, surf, bounds) : [];
  if (pits.length) {
    const keep = [];
    for (const b of base) {
      let cut = false, pieces = [[b.a, b.b, b.c]];
      for (const P of pits) {
        if (!PIT_HOST.has(b.cls)) break;
        const r = P.o * 1.5;
        if (Math.max(b.a[0], b.b[0], b.c[0]) < P.x - r || Math.min(b.a[0], b.b[0], b.c[0]) > P.x + r ||
            Math.max(b.a[1], b.b[1], b.c[1]) < P.z - r || Math.min(b.a[1], b.b[1], b.c[1]) > P.z + r) continue;
        const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c2]) => [P.x + (P.tx * a - P.tz * c2) * P.o, P.z + (P.tz * a + P.tx * c2) * P.o]);
        const ccw = ringArea(C) > 0 ? 1 : -1;
        const next = [];
        for (const poly of pieces) {
          // poly minus the square = the sum over edges e of poly ∩ outside(edge e) ∩ inside(edges before e)
          let inside = poly;
          const outs = [];
          for (let e = 0; e < 4 && inside.length >= 3; e++) {
            const [ax, az] = C[e], [bx, bz] = C[(e + 1) % 4];
            const outside = clipHalf(inside, ax, az, bx, bz, -ccw);
            if (outside.length >= 3 && Math.abs(ringArea(outside)) > 1e-6) outs.push(outside);
            inside = clipHalf(inside, ax, az, bx, bz, ccw);
          }
          if (inside.length >= 3 && Math.abs(ringArea(inside)) > 1e-6) { cut = true; next.push(...outs); }
          else next.push(poly);                   // not touched by this pit: as it was
        }
        pieces = next;
      }
      if (!cut) { keep.push(b); continue; }
      for (const p of pieces) for (let k2 = 1; k2 + 1 < p.length; k2++) if (Math.abs(area2(p[0], p[k2], p[k2 + 1])) > 1e-7) keep.push({ ...b, a: p[0], b: p[k2], c: p[k2 + 1] });
    }
    base.length = 0;
    base.push(...keep);
    halves.clear();
    base.forEach((b, i) => push(halves, b.hk, i));
    // the soil in the raster (the walker, the tree's foot)
    for (const P of pits) {
      const ins = P.o - P.w, R2 = Math.ceil(P.o / GRID) + 1, ci = Math.floor((P.x - bounds.x0) / GRID), cj = Math.floor((P.z - bounds.z0) / GRID);
      for (let j = cj - R2; j <= cj + R2; j++) for (let i = ci - R2; i <= ci + R2; i++) {
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const x = bounds.x0 + (i + 0.5) * GRID - P.x, z = bounds.z0 + (j + 0.5) * GRID - P.z;
        if (Math.abs(x * P.tx + z * P.tz) < ins && Math.abs(-x * P.tz + z * P.tx) < ins) grid[j * nx + i] = SURF_CLASS.pit + 1;
      }
    }
  }
  return { pits, surf, G, H, nrmAt, rampRise, riseAt, base, halves, coverArea, convexCover, baseAt, classAt, grid: { data: grid, nx, nz, x0: bounds.x0, z0: bounds.z0, step: GRID },
    nearKerb, bounds, inside, fallbacks, streetCorners: street.size, ms: Math.round((globalThis.performance ?? Date).now() - t0) };
}

// ---------------------------------------------------------------- 2. lane stacks fitted to the measured width

/**
 * Research §5 steps 3-4: for every road, cast perpendiculars every 4 m from its centreline to the measured kerbs
 * (the edge of the carriageway classes in the raster), take the median width on each side, and fit the lane
 * stack into it: drop parking, then bike lanes, then extra driving lanes while the minimum widths do not fit,
 * then scale the remaining carriage lanes to the measured width. Sidewalk / verge lanes are left as they are (the
 * measured sidewalks are drawn instead). Roads mostly outside the tile or off the measured street are not touched.
 * Writes road.lanes (CONTRACT 5.1 custom stack); returns stats.
 */
export function fitRoadWidths(roads, prep) {
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const MIN = { driving: 2.6, turn: 2.6, bus: 2.9, bike: 1.0, parking: 1.8, shoulder: 0.3 };
  const st = { fitted: 0, skipped: 0, lanesDropped: 0, oneSided: 0, meanAbsChange: 0 };
  let chg = 0;
  for (const r of roads.roads) {
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    if (pts.length < 2) continue;
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); segL.push(L); total += L; }
    if (total < 16) { st.skipped++; continue; }
    const wl = [], wr = [];
    let seg = 0, acc = 0, samples = 0;
    for (let s = 8; s < total - 8; s += 4) {
      while (seg < segL.length - 1 && acc + segL[seg] < s) acc += segL[seg++];
      const a = pts[seg], b = pts[seg + 1], L = segL[seg] || 1, t = (s - acc) / L;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      samples++;
      const c0 = prep.classAt(x, z);
      if (c0 < 0 || !CARRIAGE[c0]) continue;
      const ray = (sx, sz) => {           // distance to the first non-carriage cell (a kerb, a house), max 25 m
        for (let d = 0.25; d < 25; d += 0.25) { const c = prep.classAt(x + sx * d, z + sz * d); if (c < 0 || !CARRIAGE[c]) return d; }
        return null;
      };
      const l = ray(dz, -dx), rr = ray(-dz, dx);       // the road engine's left normal is (dz, -dx) (cars.js)
      if (l && rr) { wl.push(l); wr.push(rr); }
    }
    if (wl.length < 3 || wl.length < samples * 0.4) { st.skipped++; continue; }
    const med = (v) => { const s = [...v].sort((p, q) => p - q); return s[s.length >> 1]; };
    const t = ROAD_TYPES[r.type] || ROAD_TYPES.local, src = r.lanes || t;
    const center = { width: src.center?.width ?? 0, kind: src.center?.kind ?? "line" };
    const sides = {};
    let ok = true;
    for (const [side, w] of [["left", med(wl)], ["right", med(wr)]]) {
      const lanes = (src[side] || []).map((l) => ({ ...l }));
      const k = lanes.findIndex((l) => !LANE_TYPES[l.type]?.carriage);
      const carriage = k < 0 ? lanes : lanes.slice(0, k), rest = k < 0 ? [] : lanes.slice(k);
      if (!carriage.some((l) => LANE_TYPES[l.type]?.drive)) { ok = false; break; }   // one-way stacks: leave them
      const target = Math.max(0.5, w - center.width / 2);
      const minSum = () => carriage.reduce((s, l) => s + (MIN[l.type] ?? 1), 0);
      for (const ty of ["parking", "bike", "driving"]) {
        while (minSum() > target) {
          const drives = carriage.filter((l) => LANE_TYPES[l.type]?.drive).length;
          let idx = -1;
          for (let q = carriage.length - 1; q >= 0; q--) if (carriage[q].type === ty && (ty !== "driving" || drives > 1)) { idx = q; break; }
          if (idx < 0) break;
          carriage.splice(idx, 1);
          st.lanesDropped++;
        }
      }
      const sum = carriage.reduce((s, l) => s + l.width, 0) || 1;
      const f = target / sum;
      for (const l of carriage) l.width = Math.round(l.width * f * 100) / 100;
      chg += Math.abs(target - sum);
      sides[side] = [...carriage, ...rest];
    }
    if (!ok) { st.oneSided++; continue; }
    (r.meta ??= {}).unfitLanes = r.lanes ?? null;      // the parked cars still come from the OSM parking (streetFit puts them on the kerb)
    r.lanes = { center, left: sides.left, right: sides.right };
    (r.meta ??= {}).widthFit = { left: Math.round(med(wl) * 100) / 100, right: Math.round(med(wr) * 100) / 100, samples: wl.length };
    st.fitted++;
  }
  st.meanAbsChange = st.fitted ? Math.round(chg / (2 * st.fitted) * 100) / 100 : 0;
  return st;
}

// ---------------------------------------------------------------- 3. meshes

/**
 * @param {object} prep    prepareSurfaces()
 * @param {object} built   buildLaneRoadMesh() output (asphalt / concrete / grass parts)
 * @param {Float32Array} engineSurf  per-vertex surface code of built.asphalt (roadData surfaceAttribute)
 * @param {object} roads   roads.json (street name -> OSM surface map, names of mapped roads)
 * @param {(x:number, z:number) => boolean} [onBuilding]  under a UrbIS building? (engine roads UrbIS does not map
 *        are kept as built, except where the engine put them on a house)
 * @returns {{ parts: {asphalt, concrete, grass}, carve: {position, index}[], grid, kerbs, bollards, stats }}
 */
export function buildSurfaceRoads(prep, built, engineSurf, roads, onBuilding = () => false) {
  const t0 = (globalThis.performance ?? Date).now();
  const { surf, H, nrmAt, base, halves, coverArea, convexCover, baseAt, bounds, riseAt } = prep;
  const UP = [0, 1, 0];
  const inTile = prep.inside;

  // street name -> the OSM surface most of its roads have
  const votes = new Map();
  for (const r of roads.roads) {
    const nm = r.meta?.name;
    if (!nm) continue;
    const code = SURFACE[r.meta?.surface] ?? 0;
    const v = votes.get(nm) || new Map();
    v.set(code, (v.get(code) || 0) + 1);
    votes.set(nm, v);
  }
  const nameSurf = new Map([...votes].map(([nm, v]) => [nm, [...v].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]]));

  const out = {
    asphalt: new Part({ aLateral: 1, aPiece: 2, aEdges: 4, aMark: 4, aSurf: 1 }),
    concrete: new Part({ aKind: 1, aUv2: 2, aFrameW: 1 }),
    grass: new Part({}),
    square: new Part({}),
    pits: new Part({ aKind: 1 }),          // tree pits: 0 soil (uv = metres from the centre), 1 edging slab (uv = s, L - s)
  };

  // ---- the engine's asphalt: kept over the measured street, or as built where UrbIS maps nothing
  const E = built.asphalt, EP = E.position, EI = E.index, EA = E.attributes;
  const phaseOf = (v) => Math.round(EA.aPiece.array[v * 2] * 100) / 100;
  const tally = new Map();
  for (let t = 0; t < EI.length; t += 3) {
    const a = EI[t], b = EI[t + 1], c = EI[t + 2];
    const x = (EP[a * 3] + EP[b * 3] + EP[c * 3]) / 3, z = (EP[a * 3 + 2] + EP[b * 3 + 2] + EP[c * 3 + 2]) / 3;
    if (!inTile(x, z)) continue;
    const ph = phaseOf(a), v = tally.get(ph) || [0, 0];
    v[baseAt(x, z) ? 0 : 1]++;
    tally.set(ph, v);
  }
  // A road UrbIS has surveyed is "mapped" even where the engine made it much too wide: its street name is on the
  // measured surfaces (OSM names are "French - Dutch"), or at least 20 % of it lies on them.
  const surveyed = new Set(surf.surfaces.map((s) => s.name).filter(Boolean));
  const roadName = new Map(roads.roads.map((r) => [hashPhase(r.id), (r.meta?.name || "").split(" - ")[0]]));
  const mapped = new Set([...tally].filter(([ph, v]) => surveyed.has(roadName.get(ph)) || v[0] >= 0.2 * (v[0] + v[1])).map(([ph]) => ph));
  const A = out.asphalt;
  const names = Object.keys(EA);
  const exOf = (vs, w) => {           // engine attributes at barycentric w of vertices vs
    const ex = {};
    for (const nm of names) {
      const { array, itemSize } = EA[nm];
      if (itemSize === 1) ex[nm] = w[0] * array[vs[0]] + w[1] * array[vs[1]] + w[2] * array[vs[2]];
      else { const v = []; for (let k = 0; k < itemSize; k++) v.push(w[0] * array[vs[0] * itemSize + k] + w[1] * array[vs[1] * itemSize + k] + w[2] * array[vs[2] * itemSize + k]); ex[nm] = v; }
    }
    ex.aSurf = w[0] * engineSurf[vs[0]] + w[1] * engineSurf[vs[1]] + w[2] * engineSurf[vs[2]];
    return ex;
  };
  let overlayTris = 0, overlayWhole = 0, keptTris = 0, droppedTris = 0, devFail = 0, cutAtEdge = 0;
  const keptEngine = [];
  const emit = (poly, vs, P2) => {     // a convex piece of engine triangle vs, LIFT above H
    const idx = [];
    for (const q of poly) {
      const we = bary(q, P2[0], P2[1], P2[2]);
      if (!we) return;
      const u = we[0] * E.uv[vs[0] * 2] + we[1] * E.uv[vs[1] * 2] + we[2] * E.uv[vs[2] * 2];
      const v = we[0] * E.uv[vs[0] * 2 + 1] + we[1] * E.uv[vs[1] * 2 + 1] + we[2] * E.uv[vs[2] * 2 + 1];
      const ex = exOf(vs, we);
      const key = `o${Math.round(q[0] * 1000)},${Math.round(q[1] * 1000)},${Math.round(u * 1000)},${Math.round(v * 1000)},${ex.aPiece[0].toFixed(2)},${ex.aEdges.map((e) => e.toFixed(3)).join()},${ex.aMark.map((e) => e.toFixed(4)).join()},${ex.aLateral.toFixed(3)}`;
      idx.push(A.keyed(key, () => A.vert(q[0], H(q[0], q[1]) + LIFT, q[1], nrmAt(q[0], q[1]), u, v, ex)));
    }
    for (let k = 1; k + 1 < idx.length; k++) if (A.tri(idx[0], idx[k], idx[k + 1], UP, true)) overlayTris++;
  };
  // outer street edges (surfaces.json "edges", the street on their left) in an 8 m grid of segments
  const eseg = new Map();
  for (const e of surf.edges || []) for (let k = 1; k < e.line.length; k++) {
    const [ax, az] = e.line[k - 1], [bx, bz] = e.line[k];
    for (let i = Math.floor(Math.min(ax, bx) / 8); i <= Math.floor(Math.max(ax, bx) / 8); i++)
      for (let j = Math.floor(Math.min(az, bz) / 8); j <= Math.floor(Math.max(az, bz) / 8); j++) push(eseg, cellKey(i, j), [ax, az, bx, bz]);
  }
  const segHitsTri = ([ax, az, bx, bz], T) => {
    const inT = (x, z) => { const w = bary([x, z], T[0], T[1], T[2]); return w && w[0] >= 0 && w[1] >= 0 && w[2] >= 0; };
    if (inT(ax, az) || inT(bx, bz)) return true;
    const cross = (p, q, r, s2) => { const d = (q[0] - p[0]) * (s2[1] - r[1]) - (q[1] - p[1]) * (s2[0] - r[0]); if (Math.abs(d) < 1e-12) return false;
      const t = ((r[0] - p[0]) * (s2[1] - r[1]) - (r[1] - p[1]) * (s2[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
    for (let k = 0; k < 3; k++) if (cross([ax, az], [bx, bz], T[k], T[(k + 1) % 3])) return true;
    return false;
  };
  const edgesAcross = (T) => {
    const xs = T.map((p) => p[0]), zs = T.map((p) => p[1]), out = [], seen = new Set();
    for (let i = Math.floor(Math.min(...xs) / 8); i <= Math.floor(Math.max(...xs) / 8); i++)
      for (let j = Math.floor(Math.min(...zs) / 8); j <= Math.floor(Math.max(...zs) / 8); j++)
        for (const sg of eseg.get(cellKey(i, j)) || []) { if (seen.has(sg)) continue; seen.add(sg); if (segHitsTri(sg, T)) out.push(sg); }
    return out;
  };
  /** a convex piece placed on the plane of H at the engine triangle's corners (+ LIFT): no cut at the creases */
  const emitPlane = (poly, vs, P2) => {
    const hv = P2.map((q) => H(q[0], q[1]));
    const idx = [];
    for (const q of poly) {
      const we = bary(q, P2[0], P2[1], P2[2]);
      if (!we) return;
      const u = we[0] * E.uv[vs[0] * 2] + we[1] * E.uv[vs[1] * 2] + we[2] * E.uv[vs[2] * 2];
      const v = we[0] * E.uv[vs[0] * 2 + 1] + we[1] * E.uv[vs[1] * 2 + 1] + we[2] * E.uv[vs[2] * 2 + 1];
      idx.push(A.vert(q[0], we[0] * hv[0] + we[1] * hv[1] + we[2] * hv[2] + LIFT, q[1], nrmAt(q[0], q[1]), u, v, exOf(vs, we)));
    }
    for (let k = 1; k + 1 < idx.length; k++) if (A.tri(idx[0], idx[k], idx[k + 1], UP, true)) overlayTris++;
  };
  for (let t = 0; t < EI.length; t += 3) {
    const vs = [EI[t], EI[t + 1], EI[t + 2]];
    const P2 = vs.map((v) => [EP[v * 3], EP[v * 3 + 2]]);
    const cx = (P2[0][0] + P2[1][0] + P2[2][0]) / 3, cz = (P2[0][1] + P2[1][1] + P2[2][1]) / 3;
    if (!mapped.has(phaseOf(vs[0]))) {
      if (!inTile(cx, cz) || baseAt(cx, cz) || onBuilding(cx, cz)) { droppedTris++; continue; }
      const w3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const idx = vs.map((v, q) => A.vert(EP[v * 3], EP[v * 3 + 1], EP[v * 3 + 2], [E.normal[v * 3], E.normal[v * 3 + 1], E.normal[v * 3 + 2]], E.uv[v * 2], E.uv[v * 2 + 1], exOf(vs, w3[q])));
      A.idxFirst.push(idx[0], idx[1], idx[2]);
      for (const v of vs) keptEngine.push(EP[v * 3], EP[v * 3 + 1], EP[v * 3 + 2]);
      keptTris++;
      continue;
    }
    // keep the part on the street side of every outer street edge crossing it (surface on the left of the edges)
    // and inside the tile; under-cutting at an inner corner only drops paint over measured base asphalt
    let poly = P2;
    const hits = edgesAcross(P2);
    if (!hits.length && prep.classAt(cx, cz) < 0) { droppedTris++; continue; }     // wholly off the street
    for (const [ax, az, bx, bz] of hits) { poly = clipHalf(poly, ax, az, bx, bz, 1); if (poly.length < 3) break; }
    if (poly.length >= 3) { poly = clipHalf(poly, bounds.x0, bounds.z0, bounds.x1, bounds.z0, 1); poly = clipHalf(poly, bounds.x1, bounds.z1, bounds.x0, bounds.z1, 1);
      poly = clipHalf(poly, bounds.x0, bounds.z1, bounds.x0, bounds.z0, 1); poly = clipHalf(poly, bounds.x1, bounds.z0, bounds.x1, bounds.z1, 1); }
    if (poly.length < 3 || Math.abs(ringArea(poly)) < 1e-5) { droppedTris++; continue; }
    if (hits.length) cutAtEdge++;
    // drawn uncut when its own plane stays within DEV of H at every crease it spans, else cut at the creases
    const xs = poly.map((q) => q[0]), zs = poly.map((q) => q[1]);
    const pieces = [];
    for (let i = Math.floor(Math.min(...xs) / CELL); i <= Math.floor(Math.max(...xs) / CELL); i++)
      for (let j = Math.floor(Math.min(...zs) / CELL); j <= Math.floor(Math.max(...zs) / CELL); j++) for (let h = 0; h < 2; h++) {
        const q = clipHalfCell(poly, i, j, h);
        if (q.length >= 3 && Math.abs(ringArea(q)) > 1e-6) pieces.push(q);
      }
    let ok = true;
    if (pieces.length > 1) {
      const hv = P2.map((q) => H(q[0], q[1]));
      for (const q of pieces) {
        for (const r of q) {
          const w = bary(r, P2[0], P2[1], P2[2]);
          const dev = w ? w[0] * hv[0] + w[1] * hv[1] + w[2] * hv[2] - H(r[0], r[1]) : 0;
          if (dev < DEV[0] || dev > DEV[1]) { ok = false; break; }
        }
        if (!ok) break;
      }
    }
    if (ok && poly === P2) { emit(P2, vs, P2); overlayWhole++; continue; }
    if (ok) {
      // the cut polygon on the plane through H at the triangle's corners (as the uncut case)
      emitPlane(poly, vs, P2); overlayWhole++; continue;
    }
    devFail++;
    for (const q of pieces) emit(q, vs, P2);
  }

  // ---- the measured base (after the markings layer, so it sits behind it in the index buffer)
  let unframed = 0;
  // each sidewalk polygon's kerb: the line nearest to most of its triangles (area-weighted vote)
  const votes2 = new Map();
  const paved = (c) => c === SURF_CLASS.sidewalk || c === SURF_CLASS.ramp;
  const cen = new Map();                 // si -> [sum ax, sum az, area] for the polygon's own straight frame
  for (const b of base) {
    if (!paved(b.cls)) continue;
    const A2 = Math.abs(area2(b.a, b.b, b.c)), c0 = cen.get(b.si) || [0, 0, 0];
    c0[0] += A2 * (b.a[0] + b.b[0] + b.c[0]) / 3; c0[1] += A2 * (b.a[1] + b.b[1] + b.c[1]) / 3; c0[2] += A2;
    cen.set(b.si, c0);
    const k = prep.nearKerb((b.a[0] + b.b[0] + b.c[0]) / 3, (b.a[1] + b.b[1] + b.c[1]) / 3);
    if (!k) continue;
    const m = votes2.get(b.si) || new Map();
    m.set(k.li, (m.get(k.li) || 0) + Math.abs(area2(b.a, b.b, b.c)));
    votes2.set(b.si, m);
  }
  const sidewalkKerb = new Map([...votes2].map(([si, m]) => [si, [...m].sort((p, q) => q[1] - p[1])[0][0]]));
  // the polygon's own straight frame: rows along its kerb's direction at the point nearest its centroid
  const straight = new Map();
  for (const [si, [sx, sz, A2]] of cen) {
    const li = sidewalkKerb.get(si), k = li !== undefined && A2 > 0 ? prep.nearKerb(sx / A2, sz / A2, li) || prep.nearKerb(sx / A2, sz / A2) : null;
    straight.set(si, k ? [k.tx, k.tz] : [1, 0]);
  }
  const sst = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const b of base) {
    const s = surf.surfaces[b.si], cls = b.cls, part = out[PART[cls]];
    const pts = [b.a, b.b, b.c];
    let uvs = pts.map((p) => [p[0], p[1]]), frame = -1, uv2 = uvs, fw = [0, 0, 0];
    if (paved(cls)) {
      // one continuous paving per sidewalk: station along ITS kerb (the kerb line most of the sidewalk lies
      // against), distance from it; the kerb is smooth, so the pattern turns with it and never changes direction
      // inside a sidewalk
      // (a sidewalk round a block faces several streets: where its own kerb is out of reach, the nearest kerb)
      const ok = (ks) => ks && ks.every(Boolean) && Math.max(...ks.map((k) => k.s)) - Math.min(...ks.map((k) => k.s)) < 3 * CELL;
      let li = sidewalkKerb.get(b.si) ?? -1;
      let ks = li >= 0 ? pts.map((p) => prep.nearKerb(p[0], p[1], li)) : null;
      if (!ok(ks)) {
        const k0 = prep.nearKerb((b.a[0] + b.b[0] + b.c[0]) / 3, (b.a[1] + b.b[1] + b.c[1]) / 3);
        li = k0 ? k0.li : -1;
        ks = k0 ? pts.map((p) => prep.nearKerb(p[0], p[1], li)) : null;
      }
      if (ok(ks)) {
        uvs = ks.map((k) => [k.s, k.d]); frame = li;
        // cross-fade to the polygon's straight frame where the kerb frame would stretch the pavers: far from the kerb
        // (a wide forecourt, where two kerbs' frames meet) or outside a tight bend (|d| x curvature large)
        const [tx, tz] = straight.get(b.si) || [1, 0];
        uv2 = pts.map((p) => [p[0] * tx + p[1] * tz, -p[0] * tz + p[1] * tx]);
        fw = ks.map((k) => Math.max(sst(2.5, 4.5, Math.abs(k.d)), sst(0.12, 0.3, Math.abs(k.d * k.kap))));
      } else unframed++;
    } else if (cls === SURF_CLASS.square) {
      const th = ((s.course ?? 0) * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
      uvs = pts.map((p) => [p[0] * c + p[1] * sn, -p[0] * sn + p[1] * c]);    // setts rows along the square
    }
    const exOfV = (q) => (PART[cls] === "asphalt" ? { aPiece: [hashPhase(s.id || String(b.si)), 0], aSurf: nameSurf.get(s.name) || BASE_SURF[cls] }
      : PART[cls] === "concrete" ? { aKind: frame >= 0 ? KIND.framed : KIND.slab, aUv2: uv2[q], aFrameW: fw[q] } : null);
    const idx = pts.map((p, q) =>
      part.keyed(`${b.si}|${frame}|${Math.round(p[0] * 1000)}|${Math.round(p[1] * 1000)}`, () => part.vert(p[0], H(p[0], p[1]) + riseAt(cls, p[0], p[1]) - (OVERLAY[cls] ? BASE_DROP : 0), p[1], nrmAt(p[0], p[1]), uvs[q][0], uvs[q][1], exOfV(q))));
    part.tri(idx[0], idx[1], idx[2], UP);
  }
  const carveTris = new Float32Array(base.length * 9);
  base.forEach((b, k) => { [b.a, b.b, b.c].forEach((p, q) => { carveTris[k * 9 + q * 3] = p[0]; carveTris[k * 9 + q * 3 + 1] = H(p[0], p[1]); carveTris[k * 9 + q * 3 + 2] = p[1]; }); });

  // ---- the engine's concrete / grass: only around roads UrbIS does not map
  const near = new Map();
  for (let t = 0; t < EI.length; t += 3) {
    const a = EI[t], b = EI[t + 1], c = EI[t + 2];
    const x = (EP[a * 3] + EP[b * 3] + EP[c * 3]) / 3, z = (EP[a * 3 + 2] + EP[b * 3 + 2] + EP[c * 3 + 2]) / 3;
    push(near, cellKey(Math.floor(x / 8), Math.floor(z / 8)), [x, z, phaseOf(a)]);
  }
  const nearestPhase = (x, z) => {
    let best = null, bd = 100;
    const i = Math.floor(x / 8), j = Math.floor(z / 8);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const [px, pz, ph] of near.get(cellKey(i + di, j + dj)) || []) {
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bd) { bd = d; best = ph; }
    }
    return best;
  };
  let keptSide = 0;
  for (const name of ["concrete", "grass"]) {
    const S = built[name], SP = S.position, SI = S.index, dst = out[name];
    for (let t = 0; t < SI.length; t += 3) {
      const vs = [SI[t], SI[t + 1], SI[t + 2]];
      const cx = (SP[vs[0] * 3] + SP[vs[1] * 3] + SP[vs[2] * 3]) / 3, cz = (SP[vs[0] * 3 + 2] + SP[vs[1] * 3 + 2] + SP[vs[2] * 3 + 2]) / 3;
      if (!inTile(cx, cz) || baseAt(cx, cz) || onBuilding(cx, cz)) continue;
      const ph = nearestPhase(cx, cz);
      if (ph === null || mapped.has(ph)) continue;
      const idx = vs.map((v) => dst.vert(SP[v * 3], SP[v * 3 + 1], SP[v * 3 + 2], [S.normal[v * 3], S.normal[v * 3 + 1], S.normal[v * 3 + 2]], S.uv[v * 2], S.uv[v * 2 + 1],
        name === "concrete" ? { aKind: S.attributes.aKind.array[v] } : null));
      dst.idx.push(idx[0], idx[1], idx[2]);
      keptSide++;
    }
  }

  // ---- kerbs: a face from just under the roadway up to the raised surface, a kerb-stone band on top
  const C = out.concrete;
  const raisedAt = (x, z) => baseAt(x, z, (c) => RAISE[c] > 0);
  /** the polyline with a vertex wherever it crosses a grid line or a cell diagonal and H bends there by > 3 mm */
  const densify = (line) => {
    const pts = [line[0]];
    for (let k = 1; k < line.length; k++) {
      const [ax, az] = line[k - 1], [bx, bz] = line[k], ts = [];
      for (const [a0, b0] of [[ax, bx], [az, bz], [ax - az, bx - bz]]) {
        const lo = Math.min(a0, b0), hi = Math.max(a0, b0);
        for (let g = Math.ceil(lo / CELL) * CELL; g < hi; g += CELL) { const t = (g - a0) / (b0 - a0); if (t > 1e-6 && t < 1 - 1e-6) ts.push(t); }
      }
      ts.sort((p, q) => p - q);
      const ha = H(ax, az), hb = H(bx, bz);
      if (ts.some((t) => Math.abs(H(ax + (bx - ax) * t, az + (bz - az) * t) - (ha + (hb - ha) * t)) > 0.003))
        for (const t of ts) pts.push([ax + (bx - ax) * t, az + (bz - az) * t]);
      pts.push(line[k]);
    }
    return pts;
  };
  let kerbLen = 0;
  for (const line of surf.kerbs) {
    const pts = densify(line);
    if (pts.length < 2) continue;
    const segN = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [-dz / L, dx / L]; };
    const nl = pts.map((p, k) => {
      const n0 = k > 0 ? segN(pts[k - 1], p) : null, n1 = k + 1 < pts.length ? segN(p, pts[k + 1]) : null;
      if (!n0) return n1;
      if (!n1) return n0;
      const mx = n0[0] + n1[0], mz = n0[1] + n1[1], L = Math.hypot(mx, mz);
      if (L < 0.2) return n1;
      const cos = Math.max(0.5, (mx / L) * n1[0] + (mz / L) * n1[1]);
      return [mx / L / cos, mz / L / cos];
    });
    const upCls = pts.map((p, k) => raisedAt(p[0] + nl[k][0] * 0.2, p[1] + nl[k][1] * 0.2)?.cls ?? SURF_CLASS.sidewalk);
    const rise = upCls.map((c, k) => riseAt(c, pts[k][0], pts[k][1]));
    const ex = { aKind: KIND.curb };
    let prev = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, z] = pts[k], y = H(x, z), right = [-nl[k][0], 0, -nl[k][1]];      // the face looks at the roadway
      const bx = x + nl[k][0] * BAND, bz = z + nl[k][1] * BAND, n = nrmAt(x, z);
      const cur = {
        bot: C.vert(x, y - KERB_DOWN, z, right, x, z, ex), top: C.vert(x, y + rise[k], z, right, x, z, ex),
        bo: C.vert(x, y + rise[k] + BAND_LIFT, z, n, x, z, ex), bi: C.vert(bx, H(bx, bz) + rise[k] + BAND_LIFT, bz, n, bx, bz, ex),
      };
      if (prev) {
        C.tri(prev.bot, cur.bot, cur.top, right); C.tri(prev.bot, cur.top, prev.top, right);
        // band geometry only on squares and medians (sidewalks paint it, KIND.framed)
        const banded = (c) => c === SURF_CLASS.square || c === SURF_CLASS.median;
        if (banded(upCls[k]) || banded(upCls[k - 1])) { C.tri(prev.bo, cur.bo, cur.bi, UP); C.tri(prev.bo, cur.bi, prev.bi, UP); }
        kerbLen += Math.hypot(x - pts[k - 1][0], z - pts[k - 1][1]);
      }
      prev = cur;
    }
  }

  // ---- tree pits: four stone slabs in a pinwheel (each one long side, butt joints that turn round the square), flush
  // with the paving, framing soil sunk PIT_SINK; one part for all of the tile's pits (one draw)
  const T = out.pits;
  for (const P of prep.pits || []) {
    const { o, w } = P, iw = o - w;
    const X = (u, v) => [P.x + P.tx * u - P.tz * v, P.z + P.tz * u + P.tx * v];
    const top = (u, v) => { const [x, z] = X(u, v); return H(x, z) + P.raise; };
    const dirW = (du, dv) => [P.tx * du - P.tz * dv, 0, P.tz * du + P.tx * dv];
    const slab = (u0, u1, v0, v1, alongU) => {
      // top: uv.x = metres along the slab, uv.y = metres to its far end (the shader draws the joints at both ends)
      const L = alongU ? u1 - u0 : v1 - v0, ex = (s2) => ({ aKind: 1 });
      const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => {
        const s2 = alongU ? u - u0 : v - v0, [x, z] = X(u, v);
        return T.vert(x, top(u, v), z, nrmAt(x, z), s2, L - s2, ex(s2));
      });
      T.tri(q[0], q[1], q[2], UP); T.tri(q[0], q[2], q[3], UP);
    };
    slab(-o, o - w, -o, -o + w, true);        // pinwheel: each slab runs from one corner to the next slab's side
    slab(o - w, o, -o, o - w, false);
    slab(-o + w, o, o - w, o, true);
    slab(-o, -o + w, -o + w, o, false);
    // the frame's inner faces down to the soil, and a short skirt on its outer edge (hides the paving cut)
    const ring = (h, down, outward) => {
      const c = [[-h, -h], [h, -h], [h, h], [-h, h]];
      for (let k = 0; k < 4; k++) {
        const [u0, v0] = c[k], [u1, v1] = c[(k + 1) % 4], [x0, z0] = X(u0, v0), [x1, z1] = X(u1, v1);
        const nu = (v1 - v0) / (2 * h) * (outward ? 1 : -1), nv = -(u1 - u0) / (2 * h) * (outward ? 1 : -1), n = dirW(nu, nv);
        const L = Math.hypot(x1 - x0, z1 - z0);
        const a = T.vert(x0, top(u0, v0), z0, n, 0, L, { aKind: 1 }), b = T.vert(x1, top(u1, v1), z1, n, L, 0, { aKind: 1 });
        const a2 = T.vert(x0, top(u0, v0) - down, z0, n, 0, L, { aKind: 1 }), b2 = T.vert(x1, top(u1, v1) - down, z1, n, L, 0, { aKind: 1 });
        T.tri(a, a2, b2, n); T.tri(a, b2, b, n);
      }
    };
    ring(iw, PIT_SINK + 0.005, false);
    ring(o, 0.04, true);
    // soil: a 2 x 2 grid over the inner square, sunk PIT_SINK (uv: metres from the pit centre)
    const N = 2, id = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const u = -iw + 2 * iw * i / N, v = -iw + 2 * iw * j / N, [x, z] = X(u, v);
      id.push(T.vert(x, top(u, v) - PIT_SINK, z, nrmAt(x, z), u, v, { aKind: 0 }));
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = id[j * (N + 1) + i], b = a + 1, c = a + N + 1, d = c + 1;
      T.tri(a, b, d, UP); T.tri(a, d, c, UP);
    }
  }

  // ---- dropped kerbs: the sidewalk's side face along each ramp ("flanks", the ramp on the left), every 0.25 m
  for (const line of surf.flanks || []) {
    const pts = [line[0]];
    for (let k = 1; k < line.length; k++) {
      const [ax, az] = line[k - 1], [bx, bz] = line[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25));
      for (let q = 1; q <= n; q++) pts.push([ax + (bx - ax) * q / n, az + (bz - az) * q / n]);
    }
    let pv = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, z] = pts[k], a = pts[Math.max(0, k - 1)], b2 = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b2[0] - a[0], dz = b2[1] - a[1], L = Math.hypot(dx, dz) || 1, left = [-dz / L, 0, dx / L];
      const y = H(x, z), ex = { aKind: KIND.curb };
      const rr = prep.rampRise(x, z);
      const cur = { lo: C.vert(x, y + rr - 0.005, z, left, x, z, ex), hi: C.vert(x, y + KERB, z, left, x, z, ex), top: KERB - rr };
      // (no face where the ramp is already back at full height, e.g. along its back edge)
      if (pv && !(cur.top < 0.004 && pv.top < 0.004)) { C.tri(pv.lo, cur.lo, cur.hi, left); C.tri(pv.lo, cur.hi, pv.hi, left); }
      pv = cur;
    }
  }

  // ---- skirts along the outer edges, down into the carved terrain (surface on the left)
  for (const e of surf.edges) {
    const pts = densify(e.line);
    let pb = null, pt = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, z] = pts[k];
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const right = [dz / L, 0, -dx / L];
      let r = 0;
      if (e.raised) { const q = raisedAt(x - dz / L * 0.2, z + dx / L * 0.2); r = q ? riseAt(q.cls, x, z) : KERB; }
      const y = H(x, z);
      const bot = C.vert(x, y - SKIRT_DOWN, z, right, x, z, { aKind: KIND.slab }), top = C.vert(x, y + r, z, right, x, z, { aKind: KIND.slab });
      if (pb !== null) { C.tri(pb, bot, top, right); C.tri(pb, top, pt, right); }
      pb = bot; pt = top;
    }
  }

  const parts = {};
  for (const [name, p] of Object.entries(out)) if (p.count) parts[name] = p.finish(name === "asphalt" ? "aSurf" : null);
  const seq = (n) => Uint32Array.from({ length: n }, (_, i) => i);
  const carve = [{ position: carveTris, index: seq(carveTris.length / 3) }];
  if (keptEngine.length) carve.push({ position: Float32Array.from(keptEngine), index: seq(keptEngine.length / 3) });
  // bollards (UrbIS Topo CR5702P / CR57L) on the measured surface
  const bollards = (surf.bollards || []).filter(([x, z]) => inTile(x, z)).map(([x, z]) => { const c = prep.classAt(x, z); return [x, H(x, z) + (c >= 0 ? riseAt(c, x, z) : 0), z]; });
  const stats = {
    surfaces: surf.surfaces.length, baseTris: base.length, overlayTris, overlayWhole, overlayCutAtCreases: devFail, overlayCutAtStreetEdge: cutAtEdge, keptEngineTris: keptTris, droppedEngineTris: droppedTris,
    keptSideTris: keptSide, kerbLength: Math.round(kerbLen), mappedPieces: mapped.size, unmappedPieces: tally.size - mapped.size,
    unframedSidewalkTris: unframed, cutFallbacks: prep.fallbacks, bollards: bollards.length, treePits: (prep.pits || []).length,
    heightError: (() => {      // |H - DTM| at the triangle centroids (m)
      const d = base.map((b) => { const x = (b.a[0] + b.b[0] + b.c[0]) / 3, z = (b.a[1] + b.b[1] + b.c[1]) / 3; return Math.abs(H(x, z) - prep.G(x, z)); }).sort((p, q) => p - q);
      const q = (f) => Math.round((d[Math.floor(f * (d.length - 1))] || 0) * 1000) / 1000;
      return { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
    })(),
    ms: Math.round((globalThis.performance ?? Date).now() - t0) + prep.ms,
  };
  return { parts, carve, grid: prep.grid, kerbs: surf.kerbs, bollards: Float32Array.from(bollards.flat()), stats };
}
