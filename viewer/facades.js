// Building façades and roofs: per-face analysis at load + procedural TSL materials.
//
// UrbIS gives real LoD2 geometry (CONTRACT 5.2) but no surfaces. This module adds plausible ones:
//
//   analysis (JS, once per tile)
//     - wall triangles are grouped into planar faces per building; each vertex gets wall-local
//       coordinates: aWall = (u along the face from its left end, face width, height above the
//       building's base, eaves height above base)
//     - each face is classified: PARTY wall (a point 0.35 m outside it lies in another footprint:
//       the shared walls of Brussels terraces: blank; parts of one building or a landmark: blank only
//       up to the neighbour's top) and STREET-facing (it looks at a road
//       centreline within 30 m: gets the front door). aBld = (style, party, street, random)
//     - roof triangles get slope-aligned coordinates aRoof = (u along the eaves, v down the slope,
//       flat 0/1, style)
//   materials (TSL)
//     - wall styles: 0 red brick, 1 brown brick, 2 yellow brick, 3 white render, 4 cream render,
//       5 grey render/concrete; blue-stone plinth, cornice band under the eaves
//     - storeys: ground floor 3.4 m, then 3.0 m; window bays sized to each face; white frames with
//       glazing bars, stone sills, glass with a sky gradient; one painted door per street face
//     - roofs: clay tiles, dark glazed tiles or slate in courses down the slope, moss and weathering;
//       flat roofs bitumen/gravel
//
// Style choice is a stable hash of the UrbIS building id (BU_ID, so all solids of one building
// match). The orthophoto can replace the roof guess later (PLAN, realism step 4).
import * as THREE from "three/webgpu";
import {
  Fn, If, attribute, positionWorld, normalWorld, cameraPosition, color, float, vec2, vec3, vec4, mix, step, smoothstep, floor, fract,
  abs, min, max, clamp, fwidth, sin, sign, dot, normalize, length, pow, atan,
} from "three/tsl";
import { hash2D, noise2D, bumpNormal, filteredPulse } from "./tslkit.js";
import { env } from "./lighting.js";
import { n3, band, courses } from "./roadPaint.js";

const PARTY_PROBE = 0.35, STREET_REACH = 30;

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}

/** Wall style from a hash; tall blocks (flats) lean to render / concrete. */
function wallStyle(r, height) {
  const tall = height > 14;
  const table = tall ? [[0, 0.15], [1, 0.25], [2, 0.3], [3, 0.55], [4, 0.7], [5, 1]] : [[0, 0.3], [1, 0.48], [2, 0.56], [3, 0.8], [4, 0.93], [5, 1]];
  for (const [s, c] of table) if (r < c) return s;
  return 0;
}

// ---------------------------------------------------------------- 2D helpers

function pip(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

class Grid {
  constructor(cell) { this.cell = cell; this.m = new Map(); }
  key(i, j) { return i * 100003 + j; }
  add(x0, z0, x1, z1, item) {
    const c = this.cell;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const k = this.key(i, j);
        if (!this.m.has(k)) this.m.set(k, []);
        this.m.get(k).push(item);
      }
  }
  near(x, z, r = 0) {
    const c = this.cell, out = new Set();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)
      for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) for (const it of this.m.get(this.key(i, j)) || []) out.add(it);
    return out;
  }
}

// ---------------------------------------------------------------- smooth shading

const CREASE = Math.cos((32 * Math.PI) / 180);

/** Per-building corner normals: average of the adjacent faces within CREASE of the corner's own face
 *  (area-weighted). Curved UrbIS surfaces (domes, spires, round towers) shade round; real edges stay sharp. */
function smoother(tris) {
  const key = (q) => `${Math.round(q[0] * 50)}|${Math.round(q[1] * 50)}|${Math.round(q[2] * 50)}`;
  const adj = new Map();
  for (const t of tris) for (const q of t.p) { const k = key(q); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(t); }
  return (t, q) => {
    let x = 0, y = 0, z = 0;
    for (const o of adj.get(key(q))) {
      if (o.n[0] * t.n[0] + o.n[1] * t.n[1] + o.n[2] * t.n[2] < CREASE) continue;
      x += o.n[0] * o.area; y += o.n[1] * o.area; z += o.n[2] * o.area;
    }
    const L = Math.hypot(x, y, z) || 1;
    return [x / L, y / L, z / L];
  };
}

function triOf(P, I, t) {
  const p = [0, 1, 2].map((q) => { const i = I[t * 3 + q]; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; });
  const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
  const wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
  const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
  const L = Math.hypot(nx, ny, nz);
  return L < 1e-9 ? null : { p, n: [nx / L, ny / L, nz / L], area: L / 2 };
}

// ---------------------------------------------------------------- analysis

/**
 * @param doc   buildings.json
 * @param buf   buildings.bin
 * @param roads roads.json (for street-facing walls)
 * @returns { walls: {position, normal, aWall, aBld}, roofs: {position, normal, aRoof}, stats }
 */
/** Push a box that sticks out of a wall: the wall segment A->B (xz), extruded `depth` along the outward
 *  normal (nx, nz), from yTop - height to yTop. Flat normals, one colour. The back (inside the wall) is skipped. */
function box(D, A, B, yTop, height, depth, nx, nz, col) {
  if (height <= 0.01) return;
  const y0 = yTop - height, y1 = yTop;
  const ax = A[0], az = A[2], bx = B[0], bz = B[2];
  const ox = nx * depth, oz = nz * depth;
  let tx = bx - ax, tz = bz - az; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
  const quad = (p0, p1, p2, p3, n) => {
    for (const q of [p0, p1, p2, p0, p2, p3]) {
      D.position.push(q[0], q[1], q[2]); D.normal.push(n[0], n[1], n[2]); D.color.push(col[0], col[1], col[2]);
    }
  };
  const a0 = [ax, y0, az], b0 = [bx, y0, bz], a1 = [ax, y1, az], b1 = [bx, y1, bz];
  const A0 = [ax + ox, y0, az + oz], B0 = [bx + ox, y0, bz + oz], A1 = [ax + ox, y1, az + oz], B1 = [bx + ox, y1, bz + oz];
  quad(A0, B0, B1, A1, [nx, 0, nz]);           // front
  quad(a1, A1, B1, b1, [0, 1, 0]);             // top
  quad(a0, b0, B0, A0, [0, -1, 0]);            // soffit
  quad(a0, A0, A1, a1, [-tx, 0, -tz]);         // end at A
  quad(b0, b1, B1, B0, [tx, 0, tz]);           // end at B
}

/** Push a capping beam along a 3D roof edge P0->P1 (ridge tiles, hip ribs): a square-ish section of width w
 *  and height h sitting on the edge, oriented by the edge direction. Top and both sides only. */
function beam(D, P0, P1, w, h, col) {
  let dx = P1[0] - P0[0], dy = P1[1] - P0[1], dz = P1[2] - P0[2];
  const L = Math.hypot(dx, dy, dz); if (L < 0.3) return;
  dx /= L; dy /= L; dz /= L;
  let sx = -dz, sz = dx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;   // horizontal, across the edge
  const ux = -sz * dy, uy = sz * dx - sx * dz, uz = sx * dy;                        // up' = s x d
  const at = (P, a, b) => [P[0] + sx * a + ux * b, P[1] + uy * b, P[2] + sz * a + uz * b];
  const hw = w / 2, lo = -h * 0.35, hi = h * 0.65;
  const quad = (p0, p1, p2, p3, n) => {
    for (const q of [p0, p1, p2, p0, p2, p3]) {
      D.position.push(q[0], q[1], q[2]); D.normal.push(n[0], n[1], n[2]); D.color.push(col[0], col[1], col[2]);
    }
  };
  // rounded look from three faces: top, and two sloped shoulders
  quad(at(P0, -hw * 0.6, hi), at(P1, -hw * 0.6, hi), at(P1, hw * 0.6, hi), at(P0, hw * 0.6, hi), [ux, uy, uz]);
  const n1 = [ux * 0.6 + sx * 0.8, uy * 0.6, uz * 0.6 + sz * 0.8], n2 = [ux * 0.6 - sx * 0.8, uy * 0.6, uz * 0.6 - sz * 0.8];
  quad(at(P0, hw * 0.6, hi), at(P1, hw * 0.6, hi), at(P1, hw, lo), at(P0, hw, lo), n1);
  quad(at(P0, -hw, lo), at(P1, -hw, lo), at(P1, -hw * 0.6, hi), at(P0, -hw * 0.6, hi), n2);
}

export function analyseBuildings(doc, buf, roads) {
  const dv = new DataView(buf);
  const V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3);
  const I = new Uint32Array(buf, 8 + V * 12, T * 3);

  // footprints for party-wall probes
  const fp = new Grid(25);
  doc.buildings.forEach((b, bi) => {
    const ring = b.footprint[0];
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    fp.add(x0, z0, x1, z1, { bi, ring, x0, z0, x1, z1 });
  });
  /** Roof height of building bi above (x, z): highest roof triangle covering the point, else its eaves. */
  const roofAt = (bi, x, z) => {
    const b = doc.buildings[bi];
    let best = -Infinity;
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, d = I[t * 3 + 2] * 3;
      const ax = P[a], az = P[a + 2], bx = P[c], bz = P[c + 2], cx = P[d], cz = P[d + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      best = Math.max(best, l1 * P[a + 1] + l2 * P[c + 1] + l3 * P[d + 1]);
    }
    return best > -Infinity ? best : (b.eaves ?? b.top);
  };
  /** Neighbour at (x, z): its building index or -1 (largest top if several). */
  const otherAt = (x, z, bi) => {
    let best = -1;
    for (const f of fp.near(x, z)) if (f.bi !== bi && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && pip(x, z, f.ring))
      if (best < 0 || doc.buildings[f.bi].top > doc.buildings[best].top) best = f.bi;
    return best;
  };

  // road centreline segments (end nodes + PIs) for street-facing walls
  const segs = new Grid(40);
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  for (const r of roads.roads) {
    if (r.meta?.highway === "service") continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      segs.add(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), [a.x, a.z, b.x, b.z]);
    }
  }
  const facesStreet = (cx, cz, nx, nz) => {
    let best = Infinity;
    for (const [ax, az, bx, bz] of segs.near(cx, cz, STREET_REACH)) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L2));
      const qx = ax + dx * t - cx, qz = az + dz * t - cz, d = Math.hypot(qx, qz);
      if (d < best && d > 0.5 && (qx * nx + qz * nz) / d > 0.55) best = d;
    }
    return best < STREET_REACH;
  };

  const W = { position: [], normal: [], aWall: [], aBld: [], aFN: [] };
  const D = { position: [], normal: [], color: [] };                             // detail geometry
  const R = { position: [], normal: [], aRoof: [], aRoofCol: [] };
  const stats = { faces: 0, party: 0, street: 0, cornices: 0, buttresses: 0, ridges: 0, chimneys: 0 };
  doc.buildings.forEach((b, bi) => {
    const base = b.base, eaves = (b.eaves ?? b.top) - base;
    const key = String(b.attrs?.BU_ID ?? b.id);
    const landmark = b.attrs?._landmark;
    const rnd = hash01(key);
    // landmark towers (small footprint, tall): style 6.25 -> louvred belfry openings instead of lancets
    let ext = 0;
    if (landmark) {
      const xs = b.footprint[0].map((q) => q[0]), zs = b.footprint[0].map((q) => q[1]);
      ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    }
    const style = landmark ? (ext < 11 && b.height > 16 ? 6.25 : 6) : wallStyle(hash01(key + "s"), b.height);
    const roofStyle = hash01(key + "r");
    // real roof colour from the orthophoto (build_roofcolors.py), else a guess from the hash
    const rc = b.roofColor || (roofStyle < 0.4 ? [0.27, 0.085, 0.05] : [0.06, 0.065, 0.075]);
    const all = [];
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) { const o = triOf(P, I, t); if (o) all.push(o); }
    const wallTris = all.length;
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) { const o = triOf(P, I, t); if (o) all.push(o); }
    const smooth = smoother(all);
    // --- walls: group triangles into planar faces
    const faces = new Map();
    for (let k0 = 0; k0 < wallTris; k0++) {
      const tri = all[k0], p = tri.p, [nx, ny, nz] = tri.n;
      const h = Math.hypot(nx, nz) || 1;
      const d = (p[0][0] * nx + p[0][2] * nz) / h;
      const k = `${Math.round(Math.atan2(nz, nx) * 20)}|${Math.round(d * 4)}`;   // ~3°, 25 cm
      if (!faces.has(k)) faces.set(k, { tris: [], nx: nx / h, nz: nz / h });
      faces.get(k).tris.push({ p, n: tri.n, src: tri });
    }
    // merge faces of one plane split by the key rounding (same direction within ~3°, offset within 0.3 m,
    // touching along the face): a gable front must be ONE face so its openings are laid out once
    const fl = [...faces.values()];
    for (const f of fl) {
      const tx = -f.nz, tz = f.nx;
      let u0 = Infinity, u1 = -Infinity, dd = 0, k = 0;
      for (const { p } of f.tris) for (const q of p) { const uu = q[0] * tx + q[2] * tz; u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); dd += q[0] * f.nx + q[2] * f.nz; k++; }
      f.u0 = u0; f.u1 = u1; f.d = dd / k;
    }
    for (let i = 0; i < fl.length; i++) {
      const a = fl[i]; if (a.dead) continue;
      for (let j = i + 1; j < fl.length; j++) {
        const c = fl[j]; if (c.dead) continue;
        if (a.nx * c.nx + a.nz * c.nz < 0.9985 || Math.abs(a.d - c.d) > 0.3) continue;
        if (c.u0 > a.u1 + 0.15 || a.u0 > c.u1 + 0.15) continue;
        a.tris.push(...c.tris); a.u0 = Math.min(a.u0, c.u0); a.u1 = Math.max(a.u1, c.u1); c.dead = true; j = i;   // rescan
      }
    }
    const ownRing = b.footprint[0];
    for (const f of fl.filter((q) => !q.dead)) {
      // outward: a point 0.5 m along the normal must be outside the building's own footprint
      {
        let mx = 0, mz = 0, k = 0;
        for (const { p } of f.tris) for (const q of p) { mx += q[0]; mz += q[2]; k++; }
        mx /= k; mz /= k;
        if (pip(mx + f.nx * 0.5, mz + f.nz * 0.5, ownRing) && !pip(mx - f.nx * 0.5, mz - f.nz * 0.5, ownRing)) { f.nx = -f.nx; f.nz = -f.nz; }
      }
      const tx = -f.nz, tz = f.nx;                       // along the face, left to right seen from outside
      let u0 = Infinity, u1 = -Infinity, cx = 0, cz = 0, n = 0, top = -Infinity;
      for (const { p } of f.tris) for (const q of p) {
        const u = q[0] * tx + q[2] * tz;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); cx += q[0]; cz += q[2]; n++; top = Math.max(top, q[1]);
      }
      // landmarks: windows sized to each wall's own top (a church's LoD2 walls stop low; drums and towers are separate faces)
      const faceEaves = landmark ? top - base : eaves;
      cx /= n; cz /= n;
      const width = u1 - u0;
      // party wall: blank below this height above base. Separate houses: the whole wall (property line);
      // parts of the same building or a landmark: only up to the neighbour's top, windows above it.
      const ob = width > 0.3 ? otherAt(cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE, bi) : -1;
      const sameBld = ob >= 0 && b.attrs?.BU_ID && doc.buildings[ob].attrs?.BU_ID === b.attrs.BU_ID;
      const partyH = ob < 0 ? 0 : (sameBld || landmark) ? Math.max(0.01, roofAt(ob, cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE) - base) : 999;
      const party = partyH > 0 ? 1 : 0;
      const street = partyH < 999 && facesStreet(cx, cz, f.nx, f.nz) ? 1 : 0;
      stats.faces++; stats.party += party; stats.street += street;

      // ---- detail geometry: cornices along the eaves, buttresses on landmarks
      const faceH = top - base;
      if (partyH < 999 && width > 1.2 && faceH > 3) {
        const seen = new Set();
        for (const { p } of f.tris) for (let e = 0; e < 3; e++) {
          const A = p[e], B = p[(e + 1) % 3];
          if (Math.abs(A[1] - B[1]) > 0.05 || Math.abs(A[1] - top) > 0.08) continue;     // horizontal edge at the face top
          const L = Math.hypot(B[0] - A[0], B[2] - A[2]);
          const key = [A[0], A[2], B[0], B[2]].map((v) => Math.round(v * 20)).sort().join();
          if (L < 0.6 || seen.has(key)) continue;
          seen.add(key);
          const col = landmark ? [0.5, 0.47, 0.42] : style >= 3 ? [0.6, 0.58, 0.54] : [0.52, 0.5, 0.46];
          // two-step moulding: a deep top course and a shallower one under it
          box(D, A, B, top - 0.02, 0.16, landmark ? 0.32 : 0.22, f.nx, f.nz, col);
          box(D, A, B, top - 0.18, 0.12, landmark ? 0.18 : 0.12, f.nx, f.nz, col.map((c) => c * 0.93));
          stats.cornices++;
        }
      }
      if (landmark && partyH < 999 && width >= 4 && faceH >= 5 && faceH <= 16) {    // nave and aisles, not towers or drums
        const nbL = Math.max(1, Math.floor(width / 3.6 + 0.5)), bwL = width / nbL;
        let q0 = f.tris[0].p[0];
        const uq = q0[0] * tx + q0[2] * tz - u0;
        for (let k = 0; k <= nbL; k++) {
          const uu = Math.min(width - 0.35, Math.max(0.35, k * bwL)) - uq;
          const cxk = q0[0] + tx * uu, czk = q0[2] + tz * uu;
          const hw = 0.4, A = [cxk - tx * hw, 0, czk - tz * hw], B = [cxk + tx * hw, 0, czk + tz * hw];
          const h1 = base + faceH * 0.55, h2 = base + faceH * 0.85;
          box(D, A, B, h1, h1 - base + 0.3, 0.55, f.nx, f.nz, [0.5, 0.47, 0.41]);      // lower stage, deep
          box(D, A, B, h2, h2 - h1, 0.32, f.nx, f.nz, [0.52, 0.49, 0.43]);              // upper stage, set back
          box(D, A, B, h1 + 0.12, 0.12, 0.62, f.nx, f.nz, [0.44, 0.42, 0.38]);           // weathering cap
          stats.buttresses++;
        }
      }
      // chimney stacks: Brussels terraces put them on the party walls, at the highest point of the gable
      if (!landmark && partyH >= 999 && faceH > 5 && width > 3 && hash01(key + "c" + Math.round(cx) + Math.round(cz)) < 0.7) {
        let hq = null;
        for (const { p } of f.tris) for (const q of p) if (!hq || q[1] > hq[1]) hq = q;
        if (hq && hq[1] - base > eaves + 0.8) {                                     // only on a real gable (pitched roof)
          const uq = hq[0] * tx + hq[2] * tz;
          const um = Math.min(Math.max(uq, u0 + 0.8), u1 - 0.8) - uq;              // keep the stack on the wall
          const cxq = hq[0] + tx * um, czq = hq[2] + tz * um;
          const hw = 0.45, A = [cxq - tx * hw, 0, czq - tz * hw], B = [cxq + tx * hw, 0, czq + tz * hw];
          const top = hq[1] + 1.1, brick = style <= 2 ? [0.2, 0.085, 0.055] : [0.24, 0.11, 0.07];
          // straddles the party wall (half on each side) so both neighbours agree
          const A2 = [A[0] + f.nx * 0.3, 0, A[2] + f.nz * 0.3], B2 = [B[0] + f.nx * 0.3, 0, B[2] + f.nz * 0.3];
          box(D, A2, B2, top, 2.4, 0.6, -f.nx, -f.nz, brick);
          const cA = [A2[0] - tx * 0.06 + f.nx * 0.06, 0, A2[2] - tz * 0.06 + f.nz * 0.06];
          const cB = [B2[0] + tx * 0.06 + f.nx * 0.06, 0, B2[2] + tz * 0.06 + f.nz * 0.06];
          box(D, cA, cB, top + 0.1, 0.14, 0.72, -f.nx, -f.nz, [0.42, 0.41, 0.39]);   // stone cap
          for (const k of [-0.2, 0.2]) {                                            // two clay pots
            const px = cxq + tx * k - f.nx * 0.0, pz = czq + tz * k - f.nz * 0.0;
            box(D, [px - tx * 0.09, 0, pz - tz * 0.09], [px + tx * 0.09, 0, pz + tz * 0.09], top + 0.42, 0.32, 0.18, f.nx, f.nz, [0.33, 0.13, 0.07]);
          }
          stats.chimneys++;
        }
      }
      for (const { p, n: nn, src } of f.tris) for (const q of p) {
        W.position.push(q[0], q[1], q[2]);
        const sn = src ? smooth(src, q) : nn;
        W.normal.push(sn[0], sn[1], sn[2]);
        W.aWall.push(q[0] * tx + q[2] * tz - u0, width, q[1] - base, faceEaves);
        W.aBld.push(style, partyH, street, rnd);
        W.aFN.push(f.nx, f.nz);                                                  // outward face normal (xz)
      }
    }
    // --- ridge tiles and hip ribs: convex roof edges shared by two roof faces that meet at > 12°
    {
      const edges = new Map(), kv = (q) => `${Math.round(q[0] * 50)},${Math.round(q[1] * 50)},${Math.round(q[2] * 50)}`;
      for (let k = wallTris; k < all.length; k++) {
        const tri = all[k];
        for (let e = 0; e < 3; e++) {
          const A = tri.p[e], B = tri.p[(e + 1) % 3], ka = kv(A), kb = kv(B);
          const key = ka < kb ? ka + "|" + kb : kb + "|" + ka;
          if (!edges.has(key)) edges.set(key, []);
          edges.get(key).push({ tri, A, B, C: tri.p[(e + 2) % 3] });
        }
      }
      const capCol = landmark ? [0.47, 0.45, 0.4] : [rc[0] * 0.72, rc[1] * 0.72, rc[2] * 0.72];
      for (const list of edges.values()) {
        // eaves: a roof edge with no other roof face, horizontal, the low edge of a pitched slope ->
        // the roof oversails the wall by 30 cm, with a zinc gutter under its lip
        if (list.length === 1 && !landmark) {
          const { tri, A, B, C } = list[0], n = tri.n[1] < 0 ? tri.n.map((v) => -v) : tri.n;
          if (n[1] > 0.2 && n[1] < 0.97 && Math.abs(A[1] - B[1]) < 0.05 && C[1] > A[1] + 0.3) {
            const hl = Math.hypot(n[0], n[2]) || 1, ox = n[0] / hl, oz = n[2] / hl;   // downhill, outward
            box(D, A, B, A[1] + 0.03, 0.1, 0.32, ox, oz, [rc[0] * 0.8, rc[1] * 0.8, rc[2] * 0.8]);
            const gA = [A[0] + ox * 0.26, 0, A[2] + oz * 0.26], gB = [B[0] + ox * 0.26, 0, B[2] + oz * 0.26];
            box(D, gA, gB, A[1] - 0.05, 0.12, 0.13, ox, oz, [0.3, 0.31, 0.32]);
            stats.eaves = (stats.eaves || 0) + 1;
          }
          continue;
        }
        if (list.length !== 2) continue;
        const [e1, e2] = list, up = (n) => (n[1] < 0 ? n.map((v) => -v) : n), n1 = up(e1.tri.n), n2 = up(e2.tri.n);
        if (n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2] > 0.978) continue;               // coplanar-ish
        if (n1[1] < 0.15 || n2[1] < 0.15) continue;                                         // not a roof slope
        const C = e2.C, A = e1.A;                                                           // convex: e2's far corner below e1's plane
        if ((C[0] - A[0]) * n1[0] + (C[1] - A[1]) * n1[1] + (C[2] - A[2]) * n1[2] > -0.02) continue;
        beam(D, e1.A, e1.B, landmark ? 0.34 : 0.26, landmark ? 0.2 : 0.14, capCol);
        stats.ridges++;
      }
    }
    // --- roofs: slope-aligned coordinates, smoothed shading normals, real colour
    for (let k = wallTris; k < all.length; k++) {
      const tri = all[k], p = tri.p;
      const [nx, ny, nz] = tri.n;
      const flat = ny > 0.97 ? 1 : 0;
      const h = Math.hypot(nx, nz) || 1, dx = nx / h, dz = nz / h;   // downhill, horizontal
      for (const q of p) {
        R.position.push(q[0], q[1], q[2]);
        const sn = smooth(tri, q);
        R.normal.push(sn[0], sn[1], sn[2]);
        R.aRoofCol.push(rc[0], rc[1], rc[2]);
        if (flat) R.aRoof.push(q[0], q[2], 1, roofStyle);
        else R.aRoof.push(q[0] * -dz + q[2] * dx, (q[0] * dx + q[2] * dz) / Math.max(ny, 0.2), 0, roofStyle);
      }
    }
  });
  const f32 = (a) => new Float32Array(a);
  return {
    walls: { position: f32(W.position), normal: f32(W.normal), aWall: f32(W.aWall), aBld: f32(W.aBld), aFN: f32(W.aFN) },
    details: { position: f32(D.position), normal: f32(D.normal), aCol: f32(D.color) },
    roofs: { position: f32(R.position), normal: f32(R.normal), aRoof: f32(R.aRoof), aRoofCol: f32(R.aRoofCol) },
    stats: { ...stats, triangles: T, vertices: V },
  };
}

// ---------------------------------------------------------------- materials

const C = (r, g, b) => vec3(r, g, b);

/**
 * Room behind a window, raycast in metres (interior mapping). Adapted from evaluateApartmentInterior in
 * mrdoob/slop-newyork js/tsl-materials.js (MIT, © 2026 Mr.doob); the frame comes from our face normal.
 * gx: bay coordinate along the wall (bays), gy: storey coordinate (storeys), winUV: 0..1 inside the
 * window, bayW / storeyH in metres. Returns vec4(colour, emission 0..1).
 */
const interiorRoom = Fn(([gx, gy, winUV, cellId, bayW, storeyH, seed, litProb, fw, drapeFw]) => {
  const floorIdx = floor(gy).toVar();
  const fh1 = fract(sin(floorIdx.mul(41.3).add(seed)).mul(43758.5453));
  const fh2 = fract(sin(floorIdx.mul(73.7).add(seed.mul(1.7))).mul(43758.5453));
  const roomBays = mix(float(1.0), float(2.0), step(0.5, fh1)).toVar();          // Uccle houses: 1-2 bay rooms
  const roomU = gx.add(floor(fh2.mul(roomBays))).div(roomBays).toVar();
  const roomId = vec2(floor(roomU), floorIdx).toVar();
  const roomW = bayW.mul(roomBays).toVar();
  const roomH = storeyH.mul(0.92).toVar();
  const setback = float(0.18);                                                   // thick brick walls
  const depth = roomH.mul(1.5).toVar();
  const ox = fract(roomU).sub(0.5).mul(roomW).toVar();
  const oy = winUV.y.sub(0.46).mul(roomH.mul(0.62)).toVar();
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z)).toVar();
  const ray = normalize(positionWorld.sub(cameraPosition)).toVar();
  const dirX = dot(ray, vec3(n.z.negate(), 0.0, n.x)).toVar();
  const dirY = ray.y.toVar();
  const dirZ = max(abs(dot(ray, n)), 0.05).toVar();
  const hw = roomW.mul(0.5), hh = roomH.mul(0.5);
  const tX = hw.sub(ox.mul(sign(dirX))).div(max(abs(dirX), 0.0001)).toVar();
  const tY = hh.sub(oy.mul(sign(dirY))).div(max(abs(dirY), 0.0001)).toVar();
  const tZ = setback.add(depth).div(dirZ).toVar();
  const t = min(min(tX, tY), tZ).toVar();
  const hit = vec3(ox.add(dirX.mul(t)), oy.add(dirY.mul(t)), dirZ.mul(t));
  const q = clamp(vec3(hit.x.div(roomW).add(0.5), hit.y.div(roomH).add(0.5), hit.z.sub(setback).div(depth)), vec3(0), vec3(1)).toVar();
  const onBack = step(tZ, tX).mul(step(tZ, tY)).toVar();
  const isY = step(tY, tX).mul(step(tY, tZ)).toVar();
  const onCeil = isY.mul(step(0.0, dirY)), onFloor = isY.mul(float(1).sub(step(0.0, dirY)));
  const s1 = hash2D(roomId.add(vec2(seed, 19.4))).toVar(), s2 = hash2D(roomId.add(vec2(seed.mul(1.9), 83.1))).toVar();
  const s3 = hash2D(roomId.add(vec2(63.2, seed.mul(0.7))));
  const lod = smoothstep(0.3, 0.8, max(fw.x, fw.y)).toVar();
  const litRoom = step(float(1).sub(litProb), s3).toVar();
  const lit = mix(litRoom, 1.0, lod);
  const lightCol = mix(mix(color(0xdfe8ff), color(0x9fb6ff), s2), mix(color(0xffb845), color(0xffe49c), s1), step(0.3, s2)).toVar();
  const wallBase = mix(mix(color(0x9a8b73), color(0x7d8580), s1), color(0xc9bda5), s2.mul(0.6)).toVar();
  const wallCol = mix(wallBase, wallBase.mul(0.5), smoothstep(0.06, 0.04, q.y));
  const boards = mix(color(0x4a3320), color(0x6a4c30), s1).mul(float(1).sub(step(0.92, fract(q.x.mul(7.0))).mul(0.3)));
  const rug = mix(color(0x7a3b32), color(0x3a5760), s2);
  const floorCol = mix(boards, rug, step(abs(q.x.sub(0.5)), 0.28).mul(step(abs(q.z.sub(0.58)), 0.25)).mul(0.88));
  const lamp = smoothstep(0.18, 0.11, length(vec2(q.x.sub(0.5), q.z.sub(0.5)))).mul(float(1).sub(lod));
  const ceilCol = mix(mix(wallBase, color(0xe8e2d5), 0.28), lightCol.mul(mix(float(0.85), float(3.8), lit)), lamp);
  const doorX = mix(float(0.24), float(0.76), s1);
  const inDoor = step(abs(q.x.sub(doorX)), 0.09).mul(step(abs(q.y.sub(0.34)), 0.34));
  const picX = mix(float(0.72), float(0.28), step(0.5, s1));
  const inFrame = step(abs(q.x.sub(picX)), 0.085).mul(step(abs(q.y.sub(0.56)), 0.095));
  const inCanvas = step(abs(q.x.sub(picX)), 0.065).mul(step(abs(q.y.sub(0.56)), 0.075));
  const backCol = mix(mix(mix(wallCol, mix(color(0x5a4631), color(0x39383c), step(0.5, s2)), inDoor), color(0x141210), inFrame),
    mix(color(0x2c3a4a), color(0x7a5a3a), fract(s1.add(s2))), inCanvas);
  const shell = mix(mix(mix(wallCol, floorCol, onFloor), ceilCol, onCeil), backCol, onBack);
  const ao = (v) => smoothstep(0.0, 0.16, v).mul(smoothstep(0.0, 0.16, float(1).sub(v)));
  const edgeAO = mix(mix(ao(q.y).mul(ao(q.z)), ao(q.x).mul(ao(q.z)), isY), ao(q.x).mul(ao(q.y)), onBack);
  const room = shell.mul(mix(float(0.66), float(1), edgeAO)).mul(mix(float(1), float(0.42), q.z)).toVar();
  // curtains just behind the glass (lace or drapes), parallax-shifted
  const cU = clamp(winUV.x.add(dirX.div(dirZ).mul(0.06)), 0.0, 1.0).toVar();
  const w1 = hash2D(cellId.add(vec2(seed.mul(0.8), 41.2))), w2 = hash2D(cellId.add(vec2(17.9, seed.mul(1.3))));
  const sL = smoothstep(0.18, 1.0, w1), sR = smoothstep(0.18, 1.0, w2);
  const lw = sL.mul(sL).mul(0.48), rw = sR.mul(sR).mul(0.48);
  const aa = drapeFw.add(0.015);
  const inL = smoothstep(lw.add(aa), lw.sub(aa), cU).mul(step(0.03, lw));
  const inR = smoothstep(float(1).sub(rw).sub(aa), float(1).sub(rw).add(aa), cU).mul(step(0.03, rw));
  // Belgian lace half-curtains (vitrage) over the lower part of many windows
  const lace = step(0.55, fract(s1.mul(3.1).add(w1))).mul(smoothstep(0.52, 0.48, winUV.y));
  const inDrape = mix(clamp(max(max(inL, inR), lace.mul(0.85)), 0.0, 1.0), 0.29, lod).toVar();
  const pick = fract(s1.mul(5.7)).mul(4.0);
  const fabric = mix(mix(mix(mix(color(0xd8cdb8), color(0xe8e4da), lace), color(0x8a7a64), step(1.0, pick).mul(float(1).sub(lace))),
    color(0x6f818b), step(2.0, pick).mul(float(1).sub(lace))), color(0x8c5a44), step(3.0, pick).mul(float(1).sub(lace)));
  const pleat = sin(cU.mul(48.0).add(w1.mul(6.28))).mul(float(1).sub(smoothstep(0.6, 1.6, drapeFw.mul(48.0)))).mul(0.2).add(0.95);
  const col = mix(room, fabric.mul(pleat).mul(0.92), inDrape);
  const emit = mix(float(1), float(0.25), inDrape);
  const warm = mix(vec3(1), lightCol, lit.mul(0.85));
  return vec4(col.mul(warm).mul(mix(float(0.85), float(1.35), lit)), litRoom.mul(emit));
});

export function wallMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: THREE.DoubleSide });   // some UrbIS faces are wound inward: never cull them
  const P = positionWorld;
  const wall = attribute("aWall", "vec4"), bld = attribute("aBld", "vec4");
  const u = wall.x, fw = wall.y, h = wall.z, eh = wall.w;
  const style = bld.x, street = bld.z, rnd = bld.w;
  const party = step(h, bld.y.add(0.3)).mul(step(0.001, bld.y)).toVar();      // below the neighbour's top (aBld.y, m above base)
  const camDist = length(P.sub(cameraPosition)).toVar();
  const near = float(1).sub(smoothstep(16.0, 150.0, camDist)).toVar();       // relief and fine detail fade with distance
  const grain = n3(P.x.mul(5.0), P.y.mul(5.0), P.z.mul(5.0));

  // ---- window grid: corner piers, whole bays, storeys (ground floor 3.4 m, then 3.0 m)
  const pier = float(0.55);
  const usable = max(fw.sub(pier.mul(2)), float(0.001));
  const nb = max(floor(usable.div(2.6).add(0.5)), float(1)).toVar();
  const bw = usable.div(nb).toVar();
  const gx = u.sub(pier).div(bw).toVar();                                       // bay coordinate
  const G = float(3.4), S = float(3.0);
  const up = step(G, h);
  const gy = mix(h.div(G), h.sub(G).div(S).add(1.0), up).toVar();              // storey coordinate
  const storeyH = mix(G, S, up);
  const fwx = fwidth(gx).toVar(), fwy = fwidth(gy).toVar();
  const ww = min(float(1.2), bw.mul(0.52));
  const xa = float(0.5).sub(ww.div(bw).mul(0.5)).toVar(), xb = float(1).sub(xa).toVar();
  const ya = mix(float(0.27), float(0.29), up).toVar(), yb = mix(float(0.77), float(0.79), up).toVar();
  const fl = floor(gy);
  const winTopAbs = mix(yb.mul(G), G.add(fl.sub(1).add(yb).mul(S)), up);
  const isLM = band(style, 6).toVar();                                          // landmark (church, chapel...)
  const ok = float(1).sub(party).mul(float(1).sub(isLM)).mul(step(float(1.6), fw)).mul(step(float(2.8), eh))
    .mul(step(winTopAbs.add(0.35), eh))                                          // the whole window fits under the eaves
    .mul(step(0.0, gx)).mul(step(gx, nb)).toVar();
  // the front door replaces one ground-floor window on a street face
  const doorBay = floor(rnd.mul(nb));
  const isDoor = street.mul(step(abs(floor(gx).sub(doorBay)), 0.5)).mul(float(1).sub(up)).mul(ok).toVar();
  const dxa = float(0.5).sub(float(0.55).div(bw)), dxb = float(1).sub(dxa);
  const wxa = mix(xa, dxa, isDoor), wxb = mix(xb, dxb, isDoor);
  const wya = mix(ya, float(0.0), isDoor), wyb = mix(yb, float(0.72), isDoor);
  const cx = filteredPulse(gx, wxa, wxb, fwx), cy = filteredPulse(gy, wya, wyb, fwy);
  const opening = cx.mul(cy).mul(ok).toVar();                                    // whole opening (frame + glass)
  // frame 7 cm, glass inside; a mullion and a transom
  const fX = float(0.07).div(bw), fY = float(0.07).div(storeyH);
  const gxa = wxa.add(fX), gxb = wxb.sub(fX), gya = wya.add(fY), gyb = wyb.sub(fY);
  const glassBox = filteredPulse(gx, gxa, gxb, fwx).mul(filteredPulse(gy, gya, gyb, fwy)).mul(ok).toVar();
  const wu = clamp(fract(gx).sub(gxa).div(gxb.sub(gxa)), 0.0, 1.0).toVar();      // 0..1 inside the glass
  const wv = clamp(fract(gy).sub(gya).div(gyb.sub(gya)), 0.0, 1.0).toVar();
  const barX = smoothstep(float(0.035).div(ww), float(0.0), abs(wu.sub(0.5))).mul(step(float(0.95), ww));
  const barY = smoothstep(float(0.035).div(storeyH.mul(0.5)), float(0.0), abs(wv.sub(0.7)));
  const bars = max(barX, barY).mul(float(1).sub(isDoor)).mul(near.mul(0.7).add(0.3));
  const glass = glassBox.mul(float(1).sub(bars)).toVar();
  const frame = opening.sub(glassBox).add(glassBox.mul(bars)).max(0).toVar();

  // ---- wall surface by style, with relief heights
  const brick = courses(h, u, 0.0675, 0.23, float(0.01), rnd.mul(97.0));
  const brickTone = brick.tone.sub(0.5).mul(0.35).add(1.0);
  const mortar = C(0.3, 0.28, 0.25);
  const brickOf = (c) => mix(c.mul(brickTone).add(grain.mul(0.01)), mortar, brick.joint);
  const stain = noise2D(vec2(u.mul(1.4), h.mul(0.05).add(rnd.mul(13.0))));      // soot streaks run down the wall
  const renderOf = (c) => c.add(grain.mul(0.012)).mul(float(1).sub(stain.mul(0.12))).sub(smoothstep(float(1.4), float(0.0), h).mul(0.05));
  let col = brickOf(C(0.29, 0.085, 0.05));
  col = mix(col, brickOf(C(0.17, 0.075, 0.045)), band(style, 1));
  col = mix(col, brickOf(C(0.4, 0.27, 0.14)), band(style, 2));
  col = mix(col, renderOf(C(0.62, 0.6, 0.55)), band(style, 3));
  col = mix(col, renderOf(C(0.56, 0.47, 0.32)), band(style, 4));
  col = mix(col, renderOf(C(0.3, 0.29, 0.27)), band(style, 5));
  const isBrick = float(1).sub(step(float(2.5), style)).toVar();
  // relief: domed bricks, recessed openings, protruding sills / plinth / cornice (metres)
  let height = isBrick.mul(float(1).sub(brick.joint)).mul(0.0045);
  height = height.sub(opening.mul(0.12));                                        // reveal: the opening sits 12 cm back
  const aaH = fwidth(h).add(0.002);
  const plinth = float(1).sub(smoothstep(float(0.5).sub(aaH), float(0.5).add(aaH), h)).toVar();
  col = mix(col, C(0.075, 0.08, 0.09).add(grain.mul(0.01)), plinth);
  height = height.add(plinth.mul(0.03));
  const corn = smoothstep(eh.sub(0.42).sub(aaH), eh.sub(0.42).add(aaH), h).mul(float(1).sub(smoothstep(eh.sub(0.12).sub(aaH), eh.sub(0.12).add(aaH), h)))
    .mul(step(float(4.5), eh)).mul(float(1).sub(party)).toVar();
  col = mix(col, C(0.55, 0.53, 0.49), corn.mul(0.85));
  height = height.add(corn.mul(0.05));
  // sills (blue stone) under every window, a shadow beneath them, lit top
  const sillX = filteredPulse(gx, wxa.sub(float(0.06).div(bw)), wxb.add(float(0.06).div(bw)), fwx);
  const sillY = filteredPulse(gy, wya.sub(float(0.08).div(storeyH)), wya, fwy);
  const sill = sillX.mul(sillY).mul(ok).mul(float(1).sub(isDoor)).toVar();
  const underSill = sillX.mul(filteredPulse(gy, wya.sub(float(0.3).div(storeyH)), wya.sub(float(0.08).div(storeyH)), fwy)).mul(ok).mul(float(1).sub(isDoor));
  col = mix(col, C(0.16, 0.165, 0.17).add(env.uSunColor.mul(0.04)), sill);
  col = col.mul(float(1).sub(underSill.mul(0.25)));
  height = height.add(sill.mul(0.04));
  // reveal shadows on the wall just inside the opening: lintel (top) and jambs
  const revealTop = smoothstep(gyb.sub(float(0.12).div(storeyH)), gyb, fract(gy)).mul(glassBox);
  const revealSide = max(smoothstep(gxa.add(float(0.1).div(bw)), gxa, fract(gx)), smoothstep(gxb.sub(float(0.1).div(bw)), gxb, fract(gx))).mul(glassBox);

  // ---- glass with the room behind it
  const n = normalize(vec3(normalWorld.x, 0.0, normalWorld.z));
  const view = normalize(cameraPosition.sub(P));
  const fres = pow(float(1).sub(abs(dot(view, normalWorld))), 2.0).mul(0.52).add(0.08).toVar();
  const cellId = vec2(floor(gx), floor(gy));
  const litProb = float(0.55).mul(0.62);
  const drapeFootprint = fwidth(wu);                                            // derivatives before the branch
  const room = Fn(() => {
    const fwv = vec2(fwx, fwy).toVar(), drapeFw = float(drapeFootprint).toVar();
    const r = vec4(0).toVar();
    If(glass.greaterThan(0.0), () => {                                           // rooms only where there is glass
      r.assign(interiorRoom(gx, gy, vec2(wu, wv), cellId, bw, storeyH, rnd.mul(100.0), litProb, fwv, drapeFw));
    });
    return r;
  })();
  const dirt = float(0.4).add(smoothstep(0.25, 0.0, wv).mul(0.2));
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), clamp(view.y.negate().mul(2.0).add(0.4), 0.0, 1.0));
  let glassCol = mix(room.rgb.mul(C(0.71, 0.78, 0.75)), C(0.05, 0.06, 0.065), dirt.mul(0.3));
  glassCol = mix(glassCol, sky.mul(0.7), fres);
  glassCol = glassCol.mul(float(1).sub(revealTop.mul(0.42))).mul(float(1).sub(revealSide.mul(0.3)));
  // door: painted, panelled, glazed fanlight above
  const di = floor(fract(rnd.mul(31.0)).mul(4.0));
  let doorCol = C(0.05, 0.12, 0.07);
  doorCol = mix(doorCol, C(0.16, 0.03, 0.03), band(di, 1));
  doorCol = mix(doorCol, C(0.03, 0.05, 0.11), band(di, 2));
  doorCol = mix(doorCol, C(0.12, 0.06, 0.025), band(di, 3));
  const fan = step(0.78, wv);
  const panel = step(abs(wu.sub(0.5)), 0.36).mul(max(step(abs(wv.sub(0.25)), 0.17), step(abs(wv.sub(0.58)), 0.14)));
  doorCol = mix(doorCol.mul(0.7), doorCol, panel);
  const doorGlass = isDoor.mul(fan);
  const frameCol = mix(C(0.6, 0.6, 0.58), C(0.07, 0.065, 0.06), step(float(0.8), fract(rnd.mul(7.0))));

  col = mix(col, frameCol, frame);
  const glassPart = glass.mul(mix(float(1), doorGlass, isDoor)).toVar();
  const doorPart = glass.mul(isDoor).mul(float(1).sub(fan));
  col = mix(col, glassCol, glassPart);
  col = mix(col, doorCol, doorPart);
  height = height.add(frame.mul(0.03));

  // ---- landmarks: ashlar stone, tall round-arched stained-glass windows, a portal
  const ash = courses(h, u, 0.32, 0.62, float(0.012), rnd.mul(31.0));
  let lmCol = C(0.34, 0.315, 0.28).mul(ash.tone.sub(0.5).mul(0.22).add(1.0)).mul(float(1).sub(stain.mul(0.18))).add(grain.mul(0.01));
  lmCol = mix(lmCol, C(0.2, 0.19, 0.17), ash.joint);
  let lmH = float(1).sub(ash.joint).mul(0.006);
  const lmPlinth = float(1).sub(smoothstep(float(0.8).sub(aaH), float(0.8).add(aaH), h));
  lmCol = mix(lmCol, C(0.11, 0.115, 0.12), lmPlinth);
  lmH = lmH.add(lmPlinth.mul(0.05));
  const sc = max(smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(h.sub(3.0))),
    smoothstep(float(0.14).add(aaH), float(0.14).sub(aaH), abs(fract(h.sub(3.0).div(7.0)).sub(0.5).mul(7.0).abs().sub(3.5)))).mul(step(float(3.5), eh));
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), sc);
  lmH = lmH.add(sc.mul(0.05));
  // windows: bays of ~3.6 m, window 1.4 m wide, from 3.4 m to the eaves - 1.5 m (max 10 m), round arch on top.
  // Towers (tall narrow faces) get a louvred belfry opening near the top instead.
  const tower = step(float(6.1), style).mul(step(float(12.0), eh)).toVar();
  const nbL = mix(max(floor(fw.div(3.6).add(0.5)), float(1)), float(1), tower);
  const bwL = fw.div(nbL);
  const lxC = u.sub(fw.mul(0.5)).toVar();                                       // from the middle of the face
  const roseFace = street.mul(step(float(10.0), eh)).mul(float(1).sub(step(float(6.1), style))).mul(step(float(4.5), fw)).toVar();
  const R = min(min(float(2.1), fw.mul(0.21)), min(eh.sub(1.5), float(13.4)).sub(4.6).sub(0.9).mul(0.5)).toVar();
  const roseBay = roseFace.mul(step(float(0.6), R)).mul(step(abs(lxC), R.add(0.45))).toVar();   // lancets give way to the rose
  const lx = fract(u.div(bwL)).sub(0.5).mul(bwL).toVar();
  const hwL = mix(min(float(0.7), bwL.mul(0.21)), min(float(0.8), fw.mul(0.17)), tower).toVar();
  const y0 = mix(mix(float(2.4), float(3.4), step(float(8.0), eh)), eh.sub(7.2), tower).toVar();
  const yTop = mix(min(eh.sub(mix(float(0.9), float(1.5), step(float(8.0), eh))), float(13.4)), eh.sub(2.0), tower).toVar();
  const ySpring = yTop.sub(hwL).toVar();
  const winSD = (x, y) => y.lessThan(ySpring).select(max(abs(x).sub(hwL), y0.sub(y)), length(vec2(x, y.sub(ySpring))).sub(hwL));
  const dWin = winSD(lx, h).toVar();
  const lmOk = isLM.mul(float(1).sub(party)).mul(step(float(2.2), fw)).mul(step(float(5.2), eh)).toVar();
  const aaW = fwidth(dWin).add(0.003);
  const lmWin = smoothstep(aaW, aaW.negate(), dWin).mul(lmOk).mul(float(1).sub(roseBay)).toVar();
  const surround = smoothstep(aaW, aaW.negate(), dWin.sub(0.16)).mul(float(1).sub(lmWin)).mul(lmOk);
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), surround);
  lmH = lmH.add(surround.mul(0.04)).sub(lmWin.mul(0.2));
  // deep reveal by parallax: the glass sits REVEAL m behind the wall face. Trace the view ray to that plane;
  // where it lands outside the opening we see the stone jamb / soffit / sill instead of glass.
  const fn = attribute("aFN", "vec2");
  const nO = vec3(fn.x, 0.0, fn.y), tA = vec3(fn.y.negate(), 0.0, fn.x);   // outward normal, along-face (+u)
  const ray = normalize(P.sub(cameraPosition));
  const rz = max(dot(ray, nO).negate(), 0.08);
  const REVEAL = mix(float(0.38), float(0.5), tower);
  const lxs = lx.add(dot(ray, tA).div(rz).mul(REVEAL)).toVar(), hs = h.add(ray.y.div(rz).mul(REVEAL)).toVar();
  const dIn = winSD(lxs, hs);
  const glassVis = smoothstep(aaW, aaW.negate(), dIn).mul(lmWin).toVar();
  const revealK = lmWin.sub(glassVis).max(0).toVar();                           // the visible side of the opening
  // stained glass: leaded diamond lattice, a colour per pane (at the glass plane)
  const ga = lxs.add(hs).div(0.26), gb = lxs.sub(hs).div(0.26);
  const lead = max(smoothstep(0.08, 0.0, min(fract(ga), float(1).sub(fract(ga)))), smoothstep(0.08, 0.0, min(fract(gb), float(1).sub(fract(gb)))));
  const pane = hash2D(vec2(floor(ga), floor(gb)).add(rnd.mul(17.0)));
  let sg = C(0.02, 0.035, 0.12);
  sg = mix(sg, C(0.13, 0.012, 0.015), step(0.35, pane));
  sg = mix(sg, C(0.15, 0.085, 0.012), step(0.62, pane));
  sg = mix(sg, C(0.02, 0.07, 0.03), step(0.84, pane));
  const leadK = lead.mul(near.mul(0.6).add(0.4)).mul(float(1).sub(tower));
  // from outside by day stained glass reads dark, a hint of colour and the sky's sheen
  const sgDay = mix(sg.mul(0.28).add(C(0.012, 0.012, 0.015)), vec3(env.uSkyHorizon).mul(0.22), fres.mul(0.7));
  // belfry louvres: slanted boards, lit on top, dark gaps between
  const slat = fract(hs.sub(y0).div(0.24));
  const louvre = mix(C(0.015, 0.014, 0.013), C(0.16, 0.15, 0.135), smoothstep(0.45, 0.85, slat)).mul(mix(float(1), float(0.6), smoothstep(0.85, 1.0, slat)));
  // stone tracery: a central mullion splitting the lancet in two, an oculus ring in the arch head, iron saddle bars
  const aaT = fwidth(lx).add(0.004);
  const ocY = ySpring.add(hwL.mul(0.32)), ocR = hwL.mul(0.42);
  const mullion = smoothstep(float(0.055).add(aaT), float(0.055).sub(aaT), abs(lx)).mul(step(h, ocY.sub(ocR)));
  const oculus = smoothstep(float(0.045).add(aaT), float(0.045).sub(aaT), abs(length(vec2(lx, h.sub(ocY))).sub(ocR)));
  const tracery = max(mullion, oculus).mul(lmWin).mul(float(1).sub(tower)).toVar();
  const saddle = smoothstep(float(0.03).add(aaT), float(0.03).sub(aaT), abs(fract(hs.sub(y0).div(0.9)).sub(0.5).mul(0.9))).mul(step(hs, ySpring)).mul(float(1).sub(tower));
  const fill = mix(mix(sgDay, C(0.02, 0.02, 0.022), max(leadK, saddle)), louvre, tower);
  // reveal stone: in shade, darker toward the glass (soffit darkest)
  const revCol = C(0.27, 0.255, 0.23).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)).mul(mix(float(0.75), float(0.45), step(ySpring, hs)));
  lmCol = mix(lmCol, mix(fill, revCol, revealK), lmWin);
  lmCol = mix(lmCol, C(0.48, 0.46, 0.42).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)), tracery);
  lmH = lmH.add(tracery.mul(0.17));
  // portal: on a street face, the bay nearest the middle of the wall
  const isPortal = street.mul(lmOk);
  const pw = float(1.15), pTop = float(4.6);
  const dPortal = h.lessThan(pTop.sub(pw)).select(max(abs(lxC).sub(pw), h.negate()), length(vec2(lxC, h.sub(pTop.sub(pw)))).sub(pw));
  const portal = smoothstep(aaW, aaW.negate(), dPortal).mul(isPortal).toVar();
  const wood = C(0.09, 0.05, 0.025).mul(step(0.5, fract(lxC.div(0.28))).mul(0.25).add(0.8));
  lmCol = mix(lmCol, wood, portal);
  lmH = lmH.sub(portal.mul(0.3));
  // rose window above the portal: 12 spokes, an inner ring, a hub, a moulded surround; glass set back by parallax
  const cyR = max(pTop.add(0.7).add(R), min(eh.sub(1.5), float(13.4)).sub(R).sub(0.6)).toVar();   // high in the gable, clear of the portal
  const roseOk = roseFace.mul(lmOk).mul(step(float(0.6), R)).toVar();
  const rr = length(vec2(lxC, h.sub(cyR))).toVar();
  const aaR = fwidth(rr).add(0.003);
  const roseIn = smoothstep(R.add(aaR), R.sub(aaR), rr).mul(roseOk).toVar();
  const roseMould = smoothstep(R.add(0.24).add(aaR), R.add(0.24).sub(aaR), rr).mul(roseOk).sub(roseIn).max(0);
  const rrs = length(vec2(lxs.sub(lx).add(lxC), hs.sub(cyR)));
  const ang = atan(h.sub(cyR), lxC);
  const spokeD = abs(fract(ang.mul(12.0 / 6.2831853).add(0.5)).sub(0.5)).mul(6.2831853 / 12.0).mul(rr);
  const roseStone = max(max(smoothstep(float(0.06).add(aaR), float(0.06).sub(aaR), spokeD).mul(step(R.mul(0.14), rr)),
    smoothstep(float(0.05).add(aaR), float(0.05).sub(aaR), abs(rr.sub(R.mul(0.42))))),
    smoothstep(R.mul(0.16).add(aaR), R.mul(0.16).sub(aaR), rr)).mul(roseIn).toVar();
  const roseGlass = roseIn.sub(roseStone).max(0).mul(smoothstep(R.add(aaR), R.sub(aaR), rrs)).toVar();
  const roseRev = roseIn.sub(roseStone).max(0).sub(roseGlass).max(0);
  lmCol = mix(lmCol, C(0.5, 0.48, 0.44), roseMould);
  lmCol = mix(lmCol, mix(mix(sgDay, C(0.02, 0.02, 0.022), leadK), revCol, roseRev), roseIn.sub(roseStone).max(0));
  lmCol = mix(lmCol, C(0.48, 0.46, 0.42).mul(ash.tone.sub(0.5).mul(0.15).add(1.0)), roseStone);
  lmH = lmH.add(roseMould.mul(0.06)).add(roseStone.mul(0.15)).sub(roseIn.mul(0.15));
  const lmGlass = roseGlass.mul(float(1).sub(leadK)).add(glassVis.mul(float(1).sub(portal)).mul(float(1).sub(leadK)).mul(float(1).sub(tracery)).mul(float(1).sub(tower))).toVar();
  col = mix(col, lmCol, isLM);
  height = mix(height, lmH, isLM);

  // ---- lighting terms
  const relief = bumpNormal(height.mul(near));
  m.normalNode = relief;
  m.colorNode = col;
  m.roughnessNode = mix(mix(mix(mix(float(0.85), float(0.93), isBrick), float(0.5), frame), mix(float(0.12), float(0.4), dirt.sub(0.4).mul(2.5)), glassPart),
    mix(float(0.8), float(0.15), lmGlass), isLM);
  m.metalnessNode = glassPart.add(lmGlass).mul(fres).mul(0.6);                               // lets SSR reflect the street in the glass
  m.emissiveNode = room.rgb.mul(room.a).mul(float(1).sub(fres.mul(0.82))).mul(glassPart).mul(env.uInteriorGlow).mul(0.76)
    .add(sg.mul(lmGlass).mul(env.uInteriorGlow).mul(env.uNight).mul(2.2));                     // stained glass lit from inside at night
  // height AO: wall feet and narrow gaps between houses get less sky
  m.aoNode = mix(float(0.62), float(1.0), smoothstep(0.0, 9.0, h)).mul(smoothstep(0.0, 1.2, h).mul(0.2).add(0.8));
  return m;
}

export function roofMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: THREE.DoubleSide });   // some UrbIS faces are wound inward: never cull them
  const P = positionWorld;
  const r = attribute("aRoof", "vec4"), base = attribute("aRoofCol", "vec3");
  const u = r.x, v = r.y, flat = r.z, style = r.w;
  const near = float(1).sub(smoothstep(16.0, 160.0, length(P.sub(cameraPosition))));
  const grain = n3(P.x.mul(6.0), P.y.mul(6.0), P.z.mul(6.0));
  const weather = n3(P.x.mul(0.25), P.y.mul(0.25), P.z.mul(0.25));
  // tile type from the real colour: red-orange -> clay tiles, otherwise slate (Brussels' two roofs)
  const clayK = smoothstep(1.25, 1.6, base.x.div(max(base.y, 0.001))).toVar();
  const clay = courses(v, u, 0.32, 0.21, float(0.02), style.mul(53.0));
  const slate = courses(v, u, 0.25, 0.3, float(0.012), style.mul(71.0));
  const tone = mix(slate.tone, clay.tone, clayK), joint = mix(slate.joint, clay.joint, clayK);
  let col = base.mul(tone.sub(0.5).mul(mix(float(0.3), float(0.45), clayK)).add(1.0)).mul(float(1).sub(joint.mul(0.45)));
  col = col.mul(weather.mul(0.12).add(1.0)).add(grain.mul(0.006));
  const moss = smoothstep(float(0.35), float(0.8), n3(P.x.mul(0.9), P.y.mul(0.9), P.z.mul(0.9))).mul(clayK);
  col = mix(col, vec3(0.06, 0.075, 0.03), moss.mul(0.3));
  // relief: each course overlaps the one below (sawtooth), joints recessed
  const period = mix(float(0.25), float(0.32), clayK);
  // smooth ramp instead of a hard sawtooth step (a step tilts the bump normal to black); fades out once a
  // course is only a few pixels tall
  const fv = fract(v.div(period));
  const lap = smoothstep(0.0, 0.85, fv).mul(float(1).sub(smoothstep(0.9, 1.0, fv))).mul(mix(float(0.008), float(0.016), clayK));
  const fine = float(1).sub(smoothstep(period.mul(0.15), period.mul(0.5), fwidth(v)));
  const relief = lap.sub(joint.mul(0.006)).mul(near).mul(fine).mul(float(1).sub(flat));
  // flat roofs: the real colour with gravel speckle
  const flatCol = base.mul(n3(P.x.mul(30.0), 0.0, P.z.mul(30.0)).mul(0.18).add(1.0)).add(weather.mul(0.01));
  m.colorNode = mix(col, flatCol, flat);
  m.normalNode = bumpNormal(relief);
  m.roughnessNode = mix(mix(float(0.62), float(0.78), clayK), float(0.95), flat);
  return m;
}

/** Meshes for one tile. */
export function buildingMeshes(doc, buf, roads) {
  const a = analyseBuildings(doc, buf, roads);
  const mk = (part, attrs, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(part.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(part.normal, 3));
    for (const [k, n] of attrs) g.setAttribute(k, new THREE.BufferAttribute(part[k], n));
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = name;
    return mesh;
  };
  const detailMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.82, side: THREE.DoubleSide });
  detailMat.colorNode = attribute("aCol", "vec3");
  const meshes = [mk(a.walls, [["aWall", 4], ["aBld", 4], ["aFN", 2]], wallMaterial(), "buildings-walls"),
    mk(a.roofs, [["aRoof", 4], ["aRoofCol", 3]], roofMaterial(), "buildings-roofs")];
  if (a.details.position.length) meshes.push(mk(a.details, [["aCol", 3]], detailMat, "buildings-details"));
  return {
    meshes,
    stats: a.stats, triangles: a.stats.triangles, vertices: a.stats.vertices,
  };
}
