// ?roads=surface: the street surfaces MEASURED by UrbIS (Land cover StreetSurfaces, data/tiles/<T>/surfaces.json,
// pipeline/build_surfaces.py) instead of the road engine's guessed carriageways, sidewalks and kerbs.
// docs/ROADS_RESEARCH.md Ã‚Â§5 "surface first, semantics second". Pure JS (runs in the tile worker and in node).
//
// What it builds, into the same three parts the engine makes (so the viewer draws them with the same three
// materials, one draw call each):
//   asphalt   measured roadway, junctions, tram-shared roadway, parking, squares and tram sites, PLUS the
//             engine's own asphalt triangles CLIPPED to that measured roadway and laid LIFT above it: they carry
//             the engine's lane lines, crosswalks, stop lines, arrows and parking ticks (aEdges / aMark) and its
//             per-road surface (setts). They come first in the index buffer, so the base under them fails the
//             depth test early and is not shaded twice.
//   concrete  measured sidewalks, raised by KERB; a kerb face (blue stone) along every kerb line from the
//             roadway up to the sidewalk, with a 15 cm kerb-stone band on top; skirts down into the terrain
//             along the outer edges (where the street meets private land).
//   grass     medians / islands (raised by MEDIAN_KERB, kerbed like sidewalks).
// Roads UrbIS does not map (private lanes, roads outside the region) keep the engine's mesh as it is.
// The lane graph, traffic and everything else still come from the engine: only the visible ground changes.
//
// HEIGHTS. One exact height field H(x, z) for everything: the DTM sampled at the corners of a CELL grid, each
// cell split along its (i, j)-(i+1, j+1) diagonal into two planar triangles. Every triangle built here lies
// inside one half-cell and takes y = H at its vertices, so base, markings layer, sidewalks and kerb tops are
// exactly coplanar where they should be (no z-fighting, no cracks) and follow the ground within a few cm.
// The 1 m DTM is the road level (it is smooth across kerbs: measured in I6, the 13 cm step does not show), so
// low surfaces sit on H and raised ones KERB above it. The terrain is carved CARVE under all of them.
import earcut from "three/src/extras/lib/earcut.js";
import { hashPhase, SURFACE } from "./roadData.js";

/** pipeline/build_surfaces.py CLASS */
export const SURF_CLASS = { roadway: 0, tramRoad: 1, tramSite: 2, parking: 3, square: 4, sidewalk: 5, median: 6, path: 7 };
export const KERB = 0.13;          // sidewalk kerb face (m)
export const MEDIAN_KERB = 0.15;   // islands a touch taller
const RAISE = [0, 0, 0, 0, 0, KERB, MEDIAN_KERB, 0];
const PART = ["asphalt", "asphalt", "asphalt", "asphalt", "asphalt", "concrete", "grass", "concrete"];
/** classes the engine's markings may lie on (not tram sites, sidewalks, medians, paths) */
const OVERLAY = [1, 1, 0, 1, 1, 0, 0, 0];
/** base surface code (roadData SURFACE) unless the street name says setts/pavers/...: tram sites and squares setts
 *  (Place de Saint-Job, owner photos 2026-11-04), parking pavers */
const BASE_SURF = [0, 0, 1, 2, 1, 0, 0, 0];
export const CELL = 6;             // m: height-field grid
const LIFT = 0.006;                // engine marking layer above the measured base (reversed-z: far above precision)
const BAND = 0.15;                 // kerb-stone band on top of the kerb
const BAND_LIFT = 0.004;
const KERB_DOWN = 0.03;            // kerb face starts this far under the roadway (no crack)
const SKIRT_DOWN = 0.2;            // outer skirts reach this far under H (terrain is carved 0.12)
const KIND = { slab: 0, curb: 1 }; // laneRoadMesh CONCRETE_KIND

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
  let p = clipHalf(poly, x0, z0, x1, z0, 1);     // z >= z0 (left of +x is +z in this cross convention)
  p = clipHalf(p, x1, z1, x0, z1, 1);            // z <= z1
  p = clipHalf(p, x0, z1, x0, z0, 1);            // x >= x0
  p = clipHalf(p, x1, z0, x1, z1, 1);            // x <= x1
  // diagonal (x0,z0)->(x1,z1): h 0 keeps fx >= fz (right of the diagonal), h 1 keeps fx <= fz
  return clipHalf(p, x0, z0, x1, z1, h ? 1 : -1);
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
  let polys = [];
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

// ---------------------------------------------------------------- main

/**
 * @param {object} surf    surfaces.json
 * @param {object} built   buildLaneRoadMesh() output (asphalt / concrete / grass parts)
 * @param {Float32Array} engineSurf  per-vertex surface code of built.asphalt (roadData surfaceAttribute)
 * @param {object} roads   roads.json (for the street name -> OSM surface map)
 * @param {(x:number, z:number) => number} ground  the un-carved DTM
 * @param {{x0,x1,z0,z1}} bounds  the tile
 * @param {(x:number, z:number) => boolean} [onBuilding]  under a UrbIS building? (engine roads UrbIS does not map
 *        are kept as built, except where the engine put them on a house)
 * @returns {{ parts: {asphalt, concrete, grass}, carve: {position, index}[], stats }}
 */
export function buildSurfaceRoads(surf, built, engineSurf, roads, ground, bounds, onBuilding = () => false) {
  const t0 = (globalThis.performance ?? Date).now();
  const G = ground;
  // ---- the height field
  // A grid corner often lies off the street (a front garden, a bank, a wall foot 1 m higher), so its value is
  // not G there but a weighted least-squares plane through the DTM at the measured-surface points around it
  // (1 m lattice within one CELL, tent weights), evaluated at the corner: the street's own ground, extended.
  const corner = new Map();
  let fitted = 0;
  const fitCorner = (cx, cz) => {
    let sw = 0, sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sy = 0, sxy = 0, szy = 0, n = 0;
    for (let dx = -CELL + 0.5; dx < CELL; dx += 1) for (let dz = -CELL + 0.5; dz < CELL; dz += 1) {
      const x = cx + dx, z = cz + dz;
      if (!baseAt(x, z)) continue;
      const w = (1 - Math.abs(dx) / CELL) * (1 - Math.abs(dz) / CELL), y = G(x, z);
      sw += w; sx += w * dx; sz += w * dz; sxx += w * dx * dx; sxz += w * dx * dz; szz += w * dz * dz; sy += w * y; sxy += w * dx * y; szy += w * dz * y; n++;
    }
    if (n === (2 * CELL) ** 2 || n < 6) return G(cx, cz);       // all street (G is right) / too little street
    // solve [sw sx sz; sx sxx sxz; sz sxz szz] [a b c] = [sy sxy szy] for a (Cramer)
    const det3 = (a, b, c, d, e, f, g, h, k) => a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
    const D = det3(sw, sx, sz, sx, sxx, sxz, sz, sxz, szz);
    if (Math.abs(D) < 1e-9) return sy / sw;
    fitted++;
    return det3(sy, sx, sz, sxy, sxx, sxz, szy, sxz, szz) / D;
  };
  const Gc = (i, j) => { const k = cellKey(i, j); let v = corner.get(k); if (v === undefined) { v = fitCorner(i * CELL, j * CELL); corner.set(k, v); } return v; };
  const H = (x, z) => {
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL), fx = x / CELL - i, fz = z / CELL - j;
    const g00 = Gc(i, j), g11 = Gc(i + 1, j + 1);
    return fx >= fz ? g00 + fx * (Gc(i + 1, j) - g00) + fz * (g11 - Gc(i + 1, j))
      : g00 + fz * (Gc(i, j + 1) - g00) + fx * (g11 - Gc(i, j + 1));
  };
  // shading normals: central differences of H over 1 m (smooth across the half-cell creases)
  const nrmAt = (x, z) => {
    const hx = (H(x + 1, z) - H(x - 1, z)) / 2, hz = (H(x, z + 1) - H(x, z - 1)) / 2, L = Math.hypot(hx, 1, hz);
    return [-hx / L, 1 / L, -hz / L];
  };
  const UP = [0, 1, 0];
  const inTile = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  const halfOf = (x, z) => { const i = Math.floor(x / CELL), j = Math.floor(z / CELL); return [i, j, x / CELL - i >= z / CELL - j ? 0 : 1]; };

  // street name -> the OSM surface most of its roads have (setts on Place de Saint-Job, data/overrides.json)
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
    concrete: new Part({ aKind: 1 }),
    grass: new Part({}),
  };

  // ---- 1. measured polygons -> triangles, each inside one half-cell
  const base = [];                       // { cls, si, a, b, c }
  const halves = new Map();              // halfKey -> base indices
  const lowArea = new Map();             // halfKey -> area of overlay-class base triangles
  const convex = new Map();              // halfKey -> the overlay-class area as few convex CCW polygons
  let fallbacks = 0;
  const addTri = (cls, si, a, b, c, hk) => {
    if (Math.abs(area2(a, b, c)) < 1e-7) return;
    base.push({ cls, si, a, b, c });
    (halves.get(hk) || halves.set(hk, []).get(hk)).push(base.length - 1);
    if (OVERLAY[cls]) lowArea.set(hk, (lowArea.get(hk) || 0) + Math.abs(area2(a, b, c)) / 2);
  };
  const addConvex = (cls, si, p, hk) => { for (let k = 1; k + 1 < p.length; k++) addTri(cls, si, p[0], p[k], p[k + 1], hk); };
  const earcutRing = (p) => { const flat = p.flat(); return { flat, tris: earcut(flat, null, 2) }; };
  surf.surfaces.forEach((s, si) => {
    const rings = s.rings;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const I0 = Math.floor(x0 / CELL), I1 = Math.floor(x1 / CELL), J0 = Math.floor(z0 / CELL), J1 = Math.floor(z1 / CELL);
    // robust path (holes, or a cell where the clipped ring doesn't triangulate cleanly): earcut the whole
    // polygon, then cut each (convex) triangle to the half-cells
    let wholeTris = null;
    const whole = () => {
      if (wholeTris) return wholeTris;
      const flat = [], holes = [];
      rings.forEach((r, k) => { if (k) holes.push(flat.length / 2); for (const [x, z] of r) flat.push(x, z); });
      const t = earcut(flat, holes.length ? holes : null, 2);
      wholeTris = [];
      for (let q = 0; q < t.length; q += 3) wholeTris.push([0, 1, 2].map((m) => [flat[t[q + m] * 2], flat[t[q + m] * 2 + 1]]));
      return wholeTris;
    };
    for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) for (let h = 0; h < 2; h++) {
      const hk = halfKey(i, j, h);
      if (rings.length === 1) {
        const p = clipHalfCell(rings[0], i, j, h);
        if (p.length < 3) continue;
        const A = Math.abs(ringArea(p));
        if (A < 1e-4) continue;
        const { flat, tris } = earcutRing(p);
        let At = 0;
        for (let q = 0; q < tris.length; q += 3) At += Math.abs(area2([flat[tris[q] * 2], flat[tris[q] * 2 + 1]], [flat[tris[q + 1] * 2], flat[tris[q + 1] * 2 + 1]], [flat[tris[q + 2] * 2], flat[tris[q + 2] * 2 + 1]])) / 2;
        if (Math.abs(At - A) < 1e-3 * Math.max(1, A)) {
          for (let q = 0; q < tris.length; q += 3) addTri(s.c, si, [flat[tris[q] * 2], flat[tris[q] * 2 + 1]], [flat[tris[q + 1] * 2], flat[tris[q + 1] * 2 + 1]], [flat[tris[q + 2] * 2], flat[tris[q + 2] * 2 + 1]], hk);
          if (OVERLAY[s.c]) for (const c of convexParts(flat, tris)) (convex.get(hk) || convex.set(hk, []).get(hk)).push(c);
          continue;
        }
        fallbacks++;
      }
      for (const tri of whole()) {
        const p = clipHalfCell(tri, i, j, h);
        if (p.length < 3) continue;
        addConvex(s.c, si, p, hk);
        if (OVERLAY[s.c]) (convex.get(hk) || convex.set(hk, []).get(hk)).push(ringArea(p) < 0 ? p.slice().reverse() : p);
      }
    }
  });
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

  // ---- 2. the engine's asphalt: clipped to the measured roadway (markings), or kept where UrbIS maps nothing
  const E = built.asphalt, EP = E.position, EI = E.index, EA = E.attributes;
  const phaseOf = (v) => Math.round(EA.aPiece.array[v * 2] * 100) / 100;
  // a road / pad is "mapped" when most of its triangles (in this tile) lie on measured surfaces
  const tally = new Map();
  for (let t = 0; t < EI.length; t += 3) {
    const a = EI[t], b = EI[t + 1], c = EI[t + 2];
    const x = (EP[a * 3] + EP[b * 3] + EP[c * 3]) / 3, z = (EP[a * 3 + 2] + EP[b * 3 + 2] + EP[c * 3 + 2]) / 3;
    if (!inTile(x, z)) continue;
    const ph = phaseOf(a), v = tally.get(ph) || [0, 0];
    v[baseAt(x, z) ? 0 : 1]++;
    tally.set(ph, v);
  }
  // A road UrbIS has surveyed is "mapped" even where the engine made it much too wide (ChaussÃƒÂ©e de Saint-Job:
  // half its guessed carriageway lies on houses): its street name is on the measured surfaces (OSM names are
  // "French - Dutch"), or at least 20 % of it lies on them.
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
  let overlayTris = 0, keptTris = 0, droppedTris = 0, unpainted = 0;
  const edg = EA.aEdges.array, mk = EA.aMark.array;
  // line codes (laneRoadMesh lineCode, the fraction is the dash phase): 0 = no line on that side
  // (setts and other non-asphalt engine surfaces count as paint: the base may not know them)
  const painted = (vs) => vs.some((v) => Math.floor(edg[v * 4 + 2] + 1e-4) > 0 || Math.floor(edg[v * 4 + 3] + 1e-4) > 0 || mk[v * 4 + 2] > 0.5 || mk[v * 4 + 3] > 0.5 || engineSurf[v] > 0.5);
  const keptEngine = [];               // [x,y,z]*3 of kept unmapped engine triangles (for the carve)
  const emit = (poly, vs, P2) => {     // a convex piece of engine triangle vs, on H + LIFT
    const idx = [];
    for (const q of poly) {
      const we = bary(q, P2[0], P2[1], P2[2]);
      if (!we) return;
      const u = we[0] * E.uv[vs[0] * 2] + we[1] * E.uv[vs[1] * 2] + we[2] * E.uv[vs[2] * 2];
      const v = we[0] * E.uv[vs[0] * 2 + 1] + we[1] * E.uv[vs[1] * 2 + 1] + we[2] * E.uv[vs[2] * 2 + 1];
      const ex = exOf(vs, we);
      // weld pieces that meet with the same attributes (cuts inside one engine triangle, shared engine edges)
      const key = `o${Math.round(q[0] * 1000)},${Math.round(q[1] * 1000)},${Math.round(u * 1000)},${Math.round(v * 1000)},${ex.aPiece[0].toFixed(2)},${ex.aEdges.map((e) => e.toFixed(3)).join()},${ex.aMark.map((e) => e.toFixed(4)).join()},${ex.aLateral.toFixed(3)}`;
      idx.push(A.keyed(key, () => A.vert(q[0], H(q[0], q[1]) + LIFT, q[1], nrmAt(q[0], q[1]), u, v, ex)));
    }
    for (let k = 1; k + 1 < idx.length; k++) if (A.tri(idx[0], idx[k], idx[k + 1], UP, true)) overlayTris++;
  };
  for (let t = 0; t < EI.length; t += 3) {
    const vs = [EI[t], EI[t + 1], EI[t + 2]];
    const P2 = vs.map((v) => [EP[v * 3], EP[v * 3 + 2]]);
    const cx = (P2[0][0] + P2[1][0] + P2[2][0]) / 3, cz = (P2[0][1] + P2[1][1] + P2[2][1]) / 3;
    if (!mapped.has(phaseOf(vs[0]))) {
      // UrbIS maps nothing here: keep the engine's triangle, unless it lies on a measured surface
      if (!inTile(cx, cz) || baseAt(cx, cz) || onBuilding(cx, cz)) { droppedTris++; continue; }
      const w3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const idx = vs.map((v, q) => A.vert(EP[v * 3], EP[v * 3 + 1], EP[v * 3 + 2], [E.normal[v * 3], E.normal[v * 3 + 1], E.normal[v * 3 + 2]], E.uv[v * 2], E.uv[v * 2 + 1], exOf(vs, w3[q])));
      A.idxFirst.push(idx[0], idx[1], idx[2]);
      for (const v of vs) keptEngine.push(EP[v * 3], EP[v * 3 + 1], EP[v * 3 + 2]);
      keptTris++;
      continue;
    }
    // mapped and unpainted (no line along it, no junction marking, no parking ticks): the measured base
    // under it is the same asphalt, so it is not drawn twice
    if (!painted(vs)) { unpainted++; continue; }
    // mapped: the parts of the triangle over measured roadway; whole half-cells of roadway need no cut
    const n0 = overlayTris;
    const xs = P2.map((p) => p[0]), zs = P2.map((p) => p[1]);
    const i0 = Math.floor(Math.min(...xs) / CELL), i1 = Math.floor(Math.max(...xs) / CELL);
    const j0 = Math.floor(Math.min(...zs) / CELL), j1 = Math.floor(Math.max(...zs) / CELL);
    const pieces = [];
    let whole = true;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let h = 0; h < 2; h++) {
      const hk = halfKey(i, j, h);
      const p = clipHalfCell(P2, i, j, h);
      if (p.length < 3 || Math.abs(ringArea(p)) < 1e-6) continue;
      const la = lowArea.get(hk) || 0;
      if (la < CELL * CELL / 2 - 1e-3) whole = false;
      pieces.push({ hk, p, la });
    }
    // Over whole half-cells of roadway the triangle need not be cut at all when its own plane stays within
    // a few mm of H (flat or evenly sloped ground): it is drawn as it is, LIFT above H at its corners, and
    // stays above the base everywhere (the plane may sink at most 3 mm below H, LIFT is 6 mm).
    if (whole && pieces.length > 1) {
      const hv = P2.map((p) => H(p[0], p[1]));
      let ok = true;
      for (const { p } of pieces) for (const q of p) {
        const w = bary(q, P2[0], P2[1], P2[2]);
        const dev = w ? w[0] * hv[0] + w[1] * hv[1] + w[2] * hv[2] - H(q[0], q[1]) : 0;
        if (dev < -0.003 || dev > 0.015) { ok = false; break; }
      }
      if (ok) { emit(P2, vs, P2); continue; }
    }
    for (const { hk, p, la } of pieces) {
      if (!la) continue;
      if (la >= CELL * CELL / 2 - 1e-3) { emit(p, vs, P2); continue; }
      for (const c of convex.get(hk) || []) {
        let q = p;
        for (let k = 0; k < c.length && q.length >= 3; k++) { const a = c[k], b = c[(k + 1) % c.length]; q = clipHalf(q, a[0], a[1], b[0], b[1], 1); }
        if (q.length >= 3 && Math.abs(ringArea(q)) > 1e-5) emit(q, vs, P2);
      }
    }
    if (overlayTris === n0) droppedTris++;
  }

  // base mesh (after the markings layer, so it sits behind it in the index buffer)
  for (const b of base) {
    const s = surf.surfaces[b.si], part = out[PART[b.cls]], r = RAISE[b.cls];
    const ex = PART[b.cls] === "asphalt" ? { aPiece: [hashPhase(s.id || String(b.si)), 0], aSurf: nameSurf.get(s.name) || BASE_SURF[b.cls] }
      : PART[b.cls] === "concrete" ? { aKind: KIND.slab } : null;
    const idx = [b.a, b.b, b.c].map((p) =>
      part.keyed(`${b.si}|${Math.round(p[0] * 1000)}|${Math.round(p[1] * 1000)}`, () => part.vert(p[0], H(p[0], p[1]) + r, p[1], nrmAt(p[0], p[1]), p[0], p[1], ex)));
    part.tri(idx[0], idx[1], idx[2], UP);
  }
  // terrain carve: every measured triangle at road level
  const carveTris = new Float32Array(base.length * 9);
  base.forEach((b, k) => { [b.a, b.b, b.c].forEach((p, q) => { carveTris[k * 9 + q * 3] = p[0]; carveTris[k * 9 + q * 3 + 1] = H(p[0], p[1]); carveTris[k * 9 + q * 3 + 2] = p[1]; }); });

  // ---- 3. the engine's concrete / grass: only around roads UrbIS does not map
  const near = new Map();              // 8 m grid of asphalt triangle centroids -> phase
  for (let t = 0; t < EI.length; t += 3) {
    const a = EI[t], b = EI[t + 1], c = EI[t + 2];
    const x = (EP[a * 3] + EP[b * 3] + EP[c * 3]) / 3, z = (EP[a * 3 + 2] + EP[b * 3 + 2] + EP[c * 3 + 2]) / 3;
    const k = cellKey(Math.floor(x / 8), Math.floor(z / 8));
    (near.get(k) || near.set(k, []).get(k)).push(x, z, phaseOf(a));
  }
  const nearestPhase = (x, z) => {
    let best = null, bd = 100;
    const i = Math.floor(x / 8), j = Math.floor(z / 8);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const L = near.get(cellKey(i + di, j + dj));
      if (!L) continue;
      for (let k = 0; k < L.length; k += 3) { const d = (L[k] - x) ** 2 + (L[k + 1] - z) ** 2; if (d < bd) { bd = d; best = L[k + 2]; } }
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
      dst.idx.push(idx[0], idx[1], idx[2]);       // the engine's own winding
      keptSide++;
    }
  }

  // ---- 4. kerbs: a face from just under the roadway up to the raised surface, a kerb-stone band on top
  const C = out.concrete;
  const raisedAt = (x, z) => baseAt(x, z, (c) => RAISE[c] > 0);
  /** the polyline with a vertex wherever it crosses a grid line or a cell diagonal (where H bends) */
  const densify = (line) => {
    const pts = [line[0]];
    for (let k = 1; k < line.length; k++) {
      const [ax, az] = line[k - 1], [bx, bz] = line[k], ts = [];
      for (const [a0, b0] of [[ax, bx], [az, bz], [ax - az, bx - bz]]) {     // x = gC, z = gC, x - z = gC
        const lo = Math.min(a0, b0), hi = Math.max(a0, b0);
        for (let g = Math.ceil(lo / CELL) * CELL; g < hi; g += CELL) { const t = (g - a0) / (b0 - a0); if (t > 1e-6 && t < 1 - 1e-6) ts.push(t); }
      }
      ts.sort((p, q) => p - q);
      // only where H bends by more than 3 mm along the segment (the kerb band on top hides less)
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
    // per point: left normal (raised side), mitred over the neighbouring segments, clamped
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
    // raise per point: the raised surface just left of the kerb (sidewalk 13 cm, median 15 cm)
    const rise = pts.map((p, k) => { const r = raisedAt(p[0] + nl[k][0] * 0.2, p[1] + nl[k][1] * 0.2); return r ? RAISE[r.cls] : KERB; });
    const ex = { aKind: KIND.curb };
    let prev = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, z] = pts[k], y = H(x, z), right = [-nl[k][0], 0, -nl[k][1]];      // the face looks at the roadway
      const bx = x + nl[k][0] * BAND, bz = z + nl[k][1] * BAND, n = nrmAt(x, z);
      const cur = {
        bot: C.vert(x, y - KERB_DOWN, z, right, x, z, ex), top: C.vert(x, y + rise[k], z, right, x, z, ex),
        // band: from the kerb edge BAND into the raised side, on H (+ rise) like the sidewalk under it
        bo: C.vert(x, y + rise[k] + BAND_LIFT, z, n, x, z, ex), bi: C.vert(bx, H(bx, bz) + rise[k] + BAND_LIFT, bz, n, bx, bz, ex),
      };
      if (prev) {
        C.tri(prev.bot, cur.bot, cur.top, right); C.tri(prev.bot, cur.top, prev.top, right);
        C.tri(prev.bo, cur.bo, cur.bi, UP); C.tri(prev.bo, cur.bi, prev.bi, UP);
        kerbLen += Math.hypot(x - pts[k - 1][0], z - pts[k - 1][1]);
      }
      prev = cur;
    }
  }

  // ---- 5. skirts along the outer edges, down into the carved terrain (surface on the left)
  for (const e of surf.edges) {
    const pts = densify(e.line);
    let pb = null, pt = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, z] = pts[k];
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const right = [dz / L, 0, -dx / L];
      let r = 0;
      if (e.raised) { const q = raisedAt(x - dz / L * 0.2, z + dx / L * 0.2); r = q ? RAISE[q.cls] : KERB; }
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
  const stats = {
    surfaces: surf.surfaces.length, baseTris: base.length, overlayTris, unpaintedEngineTris: unpainted, keptEngineTris: keptTris, droppedEngineTris: droppedTris,
    keptSideTris: keptSide, kerbLength: Math.round(kerbLen), mappedPieces: mapped.size, unmappedPieces: tally.size - mapped.size,
    unmapped: [...tally].filter(([ph]) => !mapped.has(ph)).map(([ph, v]) => [ph, v[0], v[1]]),
    cutFallbacks: fallbacks, fittedCorners: fitted, heightError: (() => {      // |H - DTM| at the triangle centroids (m)
      const d = base.map((b) => { const x = (b.a[0] + b.b[0] + b.c[0]) / 3, z = (b.a[1] + b.b[1] + b.c[1]) / 3; return Math.abs(H(x, z) - G(x, z)); }).sort((p, q) => p - q);
      const q = (f) => Math.round((d[Math.floor(f * (d.length - 1))] || 0) * 1000) / 1000;
      return { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
    })(), ms: Math.round((globalThis.performance ?? Date).now() - t0),
  };
  return { parts, carve, stats };
}
