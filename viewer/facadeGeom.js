// Façade analysis, pure JS (no three.js), so it can run in the tile worker (viewer/tileWorker.js).
// Groups UrbIS wall triangles into faces with façade coordinates, party walls, street faces, shopfronts,
// and builds the detail geometry (cornices, ridge caps, buttresses, chimneys, eaves, shop fascias).
// The materials that draw all this are in facades.js.
const PARTY_PROBE = 0.35, STREET_REACH = 30;

export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}

/** Wall style from a hash; tall blocks (flats) lean to render / concrete. */
export function wallStyle(r, height) {
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

export function analyseBuildings(doc, buf, roads, feats) {
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
  // OSM shops (features.json points kind "shop") -> a shopfront on the nearest street face
  const shops = new Grid(40);
  for (const p of feats?.points || []) if (p.kind === "shop") { p.used = false; shops.add(p.x, p.z, p.x, p.z, p); }
  const PAINT = [[0.03, 0.09, 0.06], [0.2, 0.035, 0.045], [0.03, 0.05, 0.13], [0.025, 0.025, 0.025]];
  const AWNING = new Set(["cafe", "restaurant", "bar", "pub", "bakery", "ice_cream", "butcher", "greengrocer", "pastry", "chocolate"]);
  const D = { position: [], normal: [], color: [] };                             // detail geometry
  const R = { position: [], normal: [], aRoof: [], aRoofCol: [] };
  const stats = { faces: 0, party: 0, street: 0, cornices: 0, buttresses: 0, ridges: 0, chimneys: 0, shops: 0 };
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
      // shopfront: an unused shop point inside this building (or up to 6 m in front of the face), within the face's span
      let shopU = 0, shopW = 0;
      if (street && !landmark && width > 3.2) {
        let best = null;
        for (const sp of shops.near(cx, cz, width / 2 + 12)) {
          if (sp.used) continue;
          const dp = (sp.x - cx) * f.nx + (sp.z - cz) * f.nz, uu = sp.x * tx + sp.z * tz;
          if (uu < u0 - 1 || uu > u1 + 1) continue;
          if (!(dp > 0 && dp < 6) && !(dp <= 0 && dp > -14 && pip(sp.x, sp.z, ownRing))) continue;
          if (!best || Math.abs(dp) < best.d) best = { sp, d: Math.abs(dp), uu };
        }
        if (best) {
          best.sp.used = true;
          const sw = Math.min(width - 0.8, 6.5), paint = Math.floor(hash01(best.sp.id) * 4);
          const uc = Math.min(Math.max(best.uu, u0 + sw / 2 + 0.4), u1 - sw / 2 - 0.4);
          shopU = uc - u0; shopW = sw + 10 * paint;
          // fascia board and (food / drink shops) a canopy, as geometry
          const ox = cx - tx * ((cx * tx + cz * tz) - uc), oz = cz - tz * ((cx * tx + cz * tz) - uc);   // face point at u = uc
          const fa = [ox - tx * (sw / 2 + 0.15), 0, oz - tz * (sw / 2 + 0.15)], fb = [ox + tx * (sw / 2 + 0.15), 0, oz + tz * (sw / 2 + 0.15)];
          const pc = PAINT[paint];
          box(D, fa, fb, base + 3.5, 0.55, 0.12, f.nx, f.nz, pc);
          const kind = best.sp.tags?.shop || best.sp.tags?.amenity;
          if (AWNING.has(kind)) {
            const ac = hash01(best.sp.id + "a") < 0.5 ? [0.45, 0.06, 0.05] : [0.6, 0.55, 0.42];
            box(D, fa, fb, base + 2.95, 0.07, 1.25, f.nx, f.nz, ac);
            box(D, [fa[0] + f.nx * 1.2, 0, fa[2] + f.nz * 1.2], [fb[0] + f.nx * 1.2, 0, fb[2] + f.nz * 1.2], base + 2.95, 0.28, 0.05, f.nx, f.nz, ac);   // valance
          }
          stats.shops++;
        }
      }

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
        W.aFN.push(f.nx, f.nz, shopU, shopW);                                    // outward normal (xz), shopfront centre / width + 10 * paint
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

