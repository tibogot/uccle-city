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
/** Push a quad p0 p1 p2 p3 with the flat normal n, WOUND so its geometric normal faces n (front-side culling works:
 *  docs/CITY_MESH_AUDIT.md found 68k detail triangles wound against their normal, hidden by DoubleSide). */
function pushQuad(D, p0, p1, p2, p3, n, col) {
  const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  const order = cx * n[0] + cy * n[1] + cz * n[2] >= 0 ? [p0, p1, p2, p0, p2, p3] : [p0, p2, p1, p0, p3, p2];
  for (const q of order) { D.position.push(q[0], q[1], q[2]); D.normal.push(n[0], n[1], n[2]); D.color.push(col[0], col[1], col[2]); }
}

/** Push a box that sticks out of a wall: the wall segment A->B (xz), extruded `depth` along the outward
 *  normal (nx, nz), from yTop - height to yTop. Flat normals, one colour. The back (inside the wall) is skipped. */
function box(D, A, B, yTop, height, depth, nx, nz, col, closed = false) {
  if (height <= 0.01) return;
  const y0 = yTop - height, y1 = yTop;
  const ax = A[0], az = A[2], bx = B[0], bz = B[2];
  const ox = nx * depth, oz = nz * depth;
  let tx = bx - ax, tz = bz - az; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
  const quad = (p0, p1, p2, p3, n) => pushQuad(D, p0, p1, p2, p3, n, col);
  const a0 = [ax, y0, az], b0 = [bx, y0, bz], a1 = [ax, y1, az], b1 = [bx, y1, bz];
  const A0 = [ax + ox, y0, az + oz], B0 = [bx + ox, y0, bz + oz], A1 = [ax + ox, y1, az + oz], B1 = [bx + ox, y1, bz + oz];
  quad(A0, B0, B1, A1, [nx, 0, nz]);           // front
  quad(a1, A1, B1, b1, [0, 1, 0]);             // top
  quad(a0, b0, B0, A0, [0, -1, 0]);            // soffit
  quad(a0, A0, A1, a1, [-tx, 0, -tz]);         // end at A
  quad(b0, b1, B1, B0, [tx, 0, tz]);           // end at B
  if (closed) quad(a0, b0, b1, a1, [-nx, 0, -nz]);   // the back (a box standing free: chimney stacks, caps, pots)
}

// ---------------------------------------------------------------- strip details (cornices, eaves boards, gutters)
// docs/CITY_MESH_AUDIT.md "Triage" + docs/fixes1/README.md: the boxes of these strips were the façade flicker: square end
// caps at a corner lying in the next wall's plane, the corner square covered by both segments' boxes (two coplanar tops /
// soffits), collinear pieces of one eave (one box per roof triangle edge) and duplicate edges overlapping. Now every strip
// is collected for the whole tile first, then: collinear pieces of one strip are MERGED (union of their spans), strip ends
// that meet another strip of the same kind and section are MITRED on the bisector (no end cap, no overlap: inside and
// outside corners, adjoining houses), free ends get their end cap SET BACK a few mm per kind (never in the plane of the
// next wall nor of another strip's cap). Every face is wound by its normal (front-side culling).
const STRIP_SETBACK = { eb: 0.002, cu: 0.004, cl: 0.006, gu: 0.008, xx: 0.004, pi: 0.012, cp: 0.016 };   // (the roof kit's parapets: a free end is often IN the plane of the next wall, which rises: 12-16 mm clear)

/** a strip along A -> B (xz; any order), its section from yTop - h to yTop, from `off` to `off + depth` along the
 *  outward normal (nx, nz) */
function addStrip(S, kind, A, B, yTop, h, depth, nx, nz, col, off = 0) {
  if (h <= 0.01) return {};
  const tx = -nz, tz = nx;                                      // along, left to right seen from outside
  let ax = A[0], az = A[2], bx = B[0], bz = B[2];
  if ((bx - ax) * tx + (bz - az) * tz < 0) [ax, az, bx, bz] = [bx, bz, ax, az];
  if (Math.hypot(bx - ax, bz - az) < 0.05) return {};
  const s = { kind, ax, az, bx, bz, y: yTop, h, d: depth, off, nx, nz, col };
  S.push(s);
  return s;
}

export const _dbg = { strips: null };
function emitStrips(D, S, stats) {
  const r = (v, k) => Math.round(v * k);
  // THE OWNER'S "BLUE LINE + BLACK LINE" along the wall tops (2026-11-11): the hanging zinc gutter (a 13 cm strip whose
  // top and front catch the sky: a thin pale-blue line from any distance) over the dark eaves board, on every eave,
  // also over the street cornices. A Brussels terrace has no hanging gutter on its street front: the gutter is in the
  // cornice (corniche), the roof's eave sits on it. So where the wall top carries a cornice (both ends on a cornice
  // strip's ends, parallel), the eaves board and the gutter are left out; elsewhere (rear fronts, villas) they stay.
  const cu = new Map();
  for (const s of S) if (s.kind === "cu") for (const [x, z] of [[s.ax, s.az], [s.bx, s.bz]]) cu.set(`${r(x, 20)},${r(z, 20)}`, s);
  const onCornice = (s) => {
    const c = cu.get(`${r(s.ax, 20)},${r(s.az, 20)}`) || cu.get(`${r(s.bx, 20)},${r(s.bz, 20)}`);
    return c && c.nx * s.nx + c.nz * s.nz > 0.99;
  };
  const before = S.length;
  for (let i = S.length - 1; i >= 0; i--) if ((S[i].kind === "eb" || S[i].kind === "gu") && onCornice(S[i])) S.splice(i, 1);
  stats.eavesOnCornice = before - S.length;
  // 1. merge collinear pieces of one strip (same kind, section, plane): union of their spans along t
  // (tolerant: normals within 2.5 deg, planes within 3 cm, spans overlapping or touching: UrbIS gives the same edge to
  // two adjoining solids a few mm / a fraction of a degree apart; exact keys left those as overlapping twins)
  const groups = new Map(), sec = new Map();
  for (const s of S) {
    const k = `${s.kind}|${r(s.y, 100)}|${r(s.h, 100)}|${r(s.d, 100)}|${r(s.off, 100)}`;
    if (!sec.has(k)) sec.set(k, []);
    sec.get(k).push(s);
  }
  let gid = 0;
  for (const list of sec.values()) {
    const cl = [];                                                 // clusters: { nx, nz, pl, u0, u1, items, cx, cz }
    const near = new Map(), ck = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
    for (const s of list) {
      const pl = s.ax * s.nx + s.az * s.nz, tx = -s.nz, tz = s.nx;
      const u0 = s.ax * tx + s.az * tz, u1 = s.bx * tx + s.bz * tz, mx = (s.ax + s.bx) / 2, mz = (s.az + s.bz) / 2;
      let hit = null;
      for (let i = -1; i <= 1 && !hit; i++) for (let j = -1; j <= 1 && !hit; j++) for (const c of near.get(`${Math.floor(mx / 8) + i},${Math.floor(mz / 8) + j}`) || []) {
        if (c.nx * s.nx + c.nz * s.nz < 0.999) continue;
        if (Math.abs(s.ax * c.nx + s.az * c.nz - c.pl) > 0.03 || Math.abs(s.bx * c.nx + s.bz * c.nz - c.pl) > 0.03) continue;
        const v0 = s.ax * -c.nz + s.az * c.nx, v1 = s.bx * -c.nz + s.bz * c.nx;
        if (Math.min(v0, v1) > c.u1 + 0.02 || Math.max(v0, v1) < c.u0 - 0.02) continue;
        hit = c; break;
      }
      if (hit) { const v0 = s.ax * -hit.nz + s.az * hit.nx, v1 = s.bx * -hit.nz + s.bz * hit.nx; hit.u0 = Math.min(hit.u0, v0, v1); hit.u1 = Math.max(hit.u1, v0, v1); hit.items.push(s); continue; }
      const c = { nx: s.nx, nz: s.nz, pl, u0, u1, items: [s] };
      cl.push(c);
      for (const [x, z] of [[s.ax, s.az], [mx, mz], [s.bx, s.bz]]) { const k = ck(x, z); if (!near.has(k)) near.set(k, []); if (!near.get(k).includes(c)) near.get(k).push(c); }
    }
    for (const c of cl) groups.set(gid++, c.items);
  }
  const merged = [];
  for (const g of groups.values()) {
    const s0 = g[0], tx = -s0.nz, tz = s0.nx, pl = s0.ax * s0.nx + s0.az * s0.nz;
    const iv = g.map((s) => [s.ax * tx + s.az * tz, s.bx * tx + s.bz * tz, s]).sort((a, b) => a[0] - b[0]);
    let cur = null;
    const flush = () => { if (!cur) return; merged.push({ ...cur.s, ax: tx * cur.u0 + s0.nx * pl, az: tz * cur.u0 + s0.nz * pl, bx: tx * cur.u1 + s0.nx * pl, bz: tz * cur.u1 + s0.nz * pl }); };
    for (const [u0, u1, s] of iv) {
      if (cur && u0 <= cur.u1 + 0.02) { if (u1 > cur.u1) cur.u1 = u1; stats.stripMerged++; continue; }
      flush(); cur = { u0, u1, s };
    }
    flush();
  }
  // 2. ends: key by position (5 cm) + kind + section; exactly two ends of different strips there -> a mitred joint
  const ends = new Map();
  const ek = (s, x, z) => `${s.kind}|${r(s.y, 50)}|${r(s.h, 100)}|${r(s.d, 100)}|${r(s.off, 100)}|${r(x, 20)}|${r(z, 20)}`;
  merged.forEach((s) => {
    s.mA = s.mB = null;
    for (const [e, x, z] of [["A", s.ax, s.az], ["B", s.bx, s.bz]]) { const k = ek(s, x, z); if (!ends.has(k)) ends.set(k, []); ends.get(k).push([s, e]); }
  });
  for (const list of ends.values()) {
    if (list.length !== 2 || list[0][0] === list[1][0]) continue;
    const [[s1, e1], [s2, e2]] = list, c = s1.nx * s2.nx + s1.nz * s2.nz;
    if (1 + c < 0.15) continue;                                   // a hairpin: leave both ends free
    // the mitre: each corner (back, front) = where the two strips' own offset lines meet, so every face stays in its
    // strip's plane; near-parallel strips (not merged: planes a few cm apart) keep their own square end
    const det = s1.nx * s2.nz - s1.nz * s2.nx;
    // (the roof kit's parapets: UrbIS splits one wall into faces ~1 deg apart; a "flat" joint left a 4-12 mm wedge open
    // at their outer corner: they mitre down to 0.006 deg)
    const flatLim = s1.kind === "pi" || s1.kind === "cp" ? 1e-4 : 0.05;
    if (Math.abs(det) < flatLim) { s1["m" + e1] = s2["m" + e2] = { flat: true }; stats.stripJoins++; continue; }
    const p1 = s1.ax * s1.nx + s1.az * s1.nz, p2 = s2.ax * s2.nx + s2.az * s2.nz;
    const meet = (o) => { const c1 = p1 + o, c2 = p2 + o; return [(c1 * s2.nz - c2 * s1.nz) / det, (s1.nx * c2 - s2.nx * c1) / det]; };
    const m = { back: meet(s1.off), front: meet(s1.off + s1.d) };
    // a mitre point far from the joint (very sharp turns) is worse than an end cap
    const V = e1 === "A" ? [s1.ax, s1.az] : [s1.bx, s1.bz];
    if (Math.hypot(m.front[0] - V[0], m.front[1] - V[1]) > 3 * (s1.off + s1.d) + 0.1) continue;
    s1["m" + e1] = s2["m" + e2] = m;
    stats.stripJoins++;
  }
  // 3. faces
  for (const s of merged) {
    const tx = -s.nz, tz = s.nx, y0 = s.y - s.h, y1 = s.y, n = [s.nx, 0, s.nz], col = s.col;
    const sb = STRIP_SETBACK[s.kind] ?? 0.004;
    const corner = (e) => {                                       // [back xz, front xz] at end e
      const m = s["m" + e];
      if (m && !m.flat) return [m.back, m.front];
      const sg = e === "A" ? 1 : -1, k = m ? 0 : sb, x = (e === "A" ? s.ax : s.bx) + tx * k * sg, z = (e === "A" ? s.az : s.bz) + tz * k * sg;
      return [[x + s.nx * s.off, z + s.nz * s.off], [x + s.nx * (s.off + s.d), z + s.nz * (s.off + s.d)]];
    };
    const [bA, fA] = corner("A"), [bB, fB] = corner("B");
    const P = (q, y) => [q[0], y, q[1]];
    // s.mask (the roof kit's parapets): which long faces to draw, "f"ront / "t"op / "s"offit / "b"ack (default: those
    // three + the back only when the strip stands off the wall)
    const mk = s.mask, has = (c) => (mk ? mk.includes(c) : c !== "b" || s.off > 0);
    if (has("f")) pushQuad(D, P(fA, y0), P(fB, y0), P(fB, y1), P(fA, y1), n, col);                 // front
    if (has("t")) pushQuad(D, P(bA, y1), P(fA, y1), P(fB, y1), P(bB, y1), [0, 1, 0], col);         // top
    if (has("s")) pushQuad(D, P(bA, y0), P(bB, y0), P(fB, y0), P(fA, y0), [0, -1, 0], col);        // soffit
    if (has("b")) pushQuad(D, P(bA, y0), P(bA, y1), P(bB, y1), P(bB, y0), [-s.nx, 0, -s.nz], col);   // back
    if (!s.mA) pushQuad(D, P(bA, y0), P(fA, y0), P(fA, y1), P(bA, y1), [-tx, 0, -tz], col);           // free end caps
    if (!s.mB) pushQuad(D, P(bB, y0), P(bB, y1), P(fB, y1), P(fB, y0), [tx, 0, tz], col);
  }
  stats.strips = merged.length; _dbg.strips = merged;
}

/** Push a capping beam along a 3D roof edge P0->P1 (ridge tiles, hip ribs): a square-ish section of width w
 *  and height h sitting on the edge, oriented by the edge direction. Top and both sides only. */
function beam(D, P0, P1, w, h, col, end0 = "cap", end1 = "cap") {
  let dx = P1[0] - P0[0], dy = P1[1] - P0[1], dz = P1[2] - P0[2];
  const L = Math.hypot(dx, dy, dz); if (L < 0.3) return;
  dx /= L; dy /= L; dz /= L;
  let sx = -dz, sz = dx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;   // horizontal, across the edge
  const ux = -sz * dy, uy = sz * dx - sx * dz, uz = sx * dy;                        // up' = s x d
  const hw = w / 2, lo = -h * 0.35, hi = h * 0.65;
  // ends at a junction of non-collinear beams stop short (the apex block covers the joint): no overlapping tops
  // a free end (a gable) stops 4 mm inside the gable wall's plane: its cap was IN that plane (2.6k z-fight items on I6)
  const inset = (e) => (e === "junction" ? hw * 1.1 : e === "cap" ? 0.004 : 0);
  const i0 = inset(end0), i1 = inset(end1);
  if (L - i0 - i1 < 0.1) return;
  const Q0 = [P0[0] + dx * i0, P0[1] + dy * i0, P0[2] + dz * i0], Q1 = [P1[0] - dx * i1, P1[1] - dy * i1, P1[2] - dz * i1];
  const at = (P, a, b) => [P[0] + sx * a + ux * b, P[1] + uy * b, P[2] + sz * a + uz * b];
  // a quad with its own FLAT normal (the face's plane, wound outward from the beam's axis): no bent normals on flat faces
  const flat = (p0, p1, p2, p3, hint) => {
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    pushQuad(D, p0, p1, p2, p3, [nx, ny, nz], col);
  };
  // three faces: top, and two sloped shoulders (the bottom sits on the roof)
  const s1 = [ux * 0.6 + sx * 0.8, uy * 0.6, uz * 0.6 + sz * 0.8], s2 = [ux * 0.6 - sx * 0.8, uy * 0.6, uz * 0.6 - sz * 0.8];
  flat(at(Q0, -hw * 0.6, hi), at(Q1, -hw * 0.6, hi), at(Q1, hw * 0.6, hi), at(Q0, hw * 0.6, hi), [ux, uy, uz]);
  flat(at(Q0, hw * 0.6, hi), at(Q1, hw * 0.6, hi), at(Q1, hw, lo), at(Q0, hw, lo), s1);
  flat(at(Q0, -hw, lo), at(Q1, -hw, lo), at(Q1, -hw * 0.6, hi), at(Q0, -hw * 0.6, hi), s2);
  // end caps (a free end, a junction): the section's pentagon as two quads, facing out along the axis
  for (const [Q, sg, e] of [[Q0, -1, end0], [Q1, 1, end1]]) {
    if (e === "open") continue;
    const o = [dx * sg, dy * sg, dz * sg];
    flat(at(Q, -hw, lo), at(Q, hw, lo), at(Q, hw * 0.6, hi), at(Q, -hw * 0.6, hi), o);
  }
}

/** a small closed block over a junction of ridge / hip beams (the beams stop short of it) */
function apexBlock(D, P, w, h, dirX, dirZ, col) {
  const hw = w * 0.62, l = Math.hypot(dirX, dirZ) || 1, ax = dirX / l, az = dirZ / l;
  const A = [P[0] - ax * hw - az * hw, 0, P[2] - az * hw + ax * hw], B = [P[0] + ax * hw - az * hw, 0, P[2] + az * hw + ax * hw];
  box(D, A, B, P[1] + h * 0.65 + 0.015, h + 0.015, 2 * hw, az, -ax, col, true);
}

/** opts.kit: a façade-kit collector (viewer/facadeKit/placement.js kitCollector): every wall face is offered to it;
 *  the faces it takes go to walls.kit (a separate mesh: its material cuts the openings the kit's pieces fill, aKit =
 *  (on, arch rise)) and the result gets kit = collector.finish(). */
export function analyseBuildings(doc, buf, roads, feats, opts = {}) {
  const kit = opts.kit || null;
  // the roof kit (viewer/roofs/roofPlace.js roofCollector, docs/assets/ROOFS.md): chimney stacks, parapets, roof
  // windows, solar, flat-roof furniture as instanced pieces; null = the roofs as before (?roofs=old: box chimneys)
  const roofs = opts.roofs || null;
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
  /** the roof of building bi exactly at (x, z): the highest roof triangle there, -Infinity off its roof (the roof kit) */
  const ownRoof = (bi, x, z) => {
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
    return best;
  };
  /** a chimney's brick (roof kit tones: 0 red-brown, 1 dark klinker, 2 orange-red, 3 yellow) from the house's wall */
  const stackTone = (style, rnd) => (style < 0.5 ? 0 : style < 1.5 ? 1 : style < 2.5 ? 3 : [0, 0, 2, 1][Math.floor(rnd * 4) % 4]);
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
  const WK = { position: [], normal: [], aWall: [], aBld: [], aFN: [], aKit: [] };   // the kit's faces
  // OSM shops (features.json points kind "shop") -> a shopfront on the nearest street face
  const shops = new Grid(40);
  // opts.fronts (the street-life layer is on, viewer/streetlife/): ITS shopfronts (data/streetlife/<T>.json pois[].face:
  // centre on the wall, normal, width) replace the OSM shop points: the wall shader and the facade kit leave their
  // ground-floor openings out exactly there, and this file draws no fascia / awning of its own (the layer has them)
  const fronts = opts.fronts ? new Grid(40) : null;
  if (fronts) for (const q of opts.fronts) fronts.add(q.x, q.z, q.x, q.z, q);
  else for (const p of feats?.points || []) if (p.kind === "shop") { p.used = false; shops.add(p.x, p.z, p.x, p.z, p); }
  const PAINT = [[0.03, 0.09, 0.06], [0.2, 0.035, 0.045], [0.03, 0.05, 0.13], [0.025, 0.025, 0.025]];
  const AWNING = new Set(["cafe", "restaurant", "bar", "pub", "bakery", "ice_cream", "butcher", "greengrocer", "pastry", "chocolate"]);
  const D = { position: [], normal: [], color: [] };                             // detail geometry
  const SD = [];                                                                 // strip details, emitted mitred at the end (emitStrips)
  const chimneysAt = [], buttressAt = [], apexAt = [];                                        // one stack per party wall, one buttress per spot
  const R = { position: [], normal: [], aRoof: [], aRoofCol: [] };
  const stats = { faces: 0, party: 0, street: 0, cornices: 0, buttresses: 0, ridges: 0, chimneys: 0, shops: 0, strips: 0, stripMerged: 0, stripJoins: 0, chimneysShared: 0 };
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
    let hasStack = false;                              // (the roof kit) a gable / party-wall stack was placed for this building
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
    const live = fl.filter((q) => !q.dead);
    // first pass: orientation, extent, party wall, street (the second pass needs every face's: the kit gives a corner
    // house ONE front door, on its widest street face)
    for (const f of live) {
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
      cx /= n; cz /= n;
      const width = u1 - u0;
      // party wall: blank below this height above base. Separate houses: the whole wall (property line);
      // parts of the same building or a landmark: only up to the neighbour's top, windows above it.
      const ob = width > 0.3 ? otherAt(cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE, bi) : -1;
      const sameBld = ob >= 0 && b.attrs?.BU_ID && doc.buildings[ob].attrs?.BU_ID === b.attrs.BU_ID;
      const partyH = ob < 0 ? 0 : (sameBld || landmark) ? Math.max(0.01, roofAt(ob, cx + f.nx * PARTY_PROBE, cz + f.nz * PARTY_PROBE) - base) : 999;
      const street = partyH < 999 && facesStreet(cx, cz, f.nx, f.nz) ? 1 : 0;
      f.pre = { tx, tz, u0, u1, cx, cz, top, width, partyH, street };
    }
    const terraced = live.some((f) => f.pre.partyH >= 999);        // (the roof kit: a house in a row)
    // the widest street face carries the front door (the kit only: the painted façade keeps a door per street face)
    let doorFace = null;
    for (const f of live) if (f.pre.street && f.pre.width >= 1.6 && (!doorFace || f.pre.width > doorFace.pre.width)) doorFace = f;
    for (const f of live) {
      const { tx, tz, u0, u1, cx, cz, top, width, partyH, street } = f.pre;
      // landmarks: windows sized to each wall's own top (a church's LoD2 walls stop low; drums and towers are separate faces)
      const faceEaves = landmark ? top - base : eaves;
      const party = partyH > 0 ? 1 : 0;
      stats.faces++; stats.party += party; stats.street += street;
      // shopfront: an unused shop point inside this building (or up to 6 m in front of the face), within the face's span
      let shopU = 0, shopW = 0;
      if (fronts && !landmark) {
        // every street-life front on this wall plane (within 0.6 m of it, facing the same way, inside its span):
        // one slot for all of them (the face carries one shop span), from the first one's left to the last one's right
        let lo = Infinity, hi = -Infinity;
        for (const q of fronts.near(cx, cz, width / 2 + 8)) {
          if (q.nx * f.nx + q.nz * f.nz < 0.8) continue;
          if (Math.abs((q.x - cx) * f.nx + (q.z - cz) * f.nz) > 0.6) continue;
          const uu = q.x * tx + q.z * tz;
          if (uu < u0 - 0.5 || uu > u1 + 0.5) continue;
          lo = Math.min(lo, uu - q.w / 2 - 0.1); hi = Math.max(hi, uu + q.w / 2 + 0.1);
        }
        lo = Math.max(lo, u0); hi = Math.min(hi, u1);
        if (hi - lo > 0.5) { shopU = (lo + hi) / 2 - u0; shopW = Math.min(hi - lo, 9.9); stats.shops++; }
      } else if (street && !landmark && width > 3.2) {
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
          addStrip(SD, "cu", A, B, top - 0.02, 0.16, landmark ? 0.32 : 0.22, f.nx, f.nz, col);
          addStrip(SD, "cl", A, B, top - 0.18, 0.12, landmark ? 0.18 : 0.12, f.nx, f.nz, col.map((c) => c * 0.93));
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
          // one buttress per spot (two faces of one wall would both put one there: overlapping boxes)
          if (buttressAt.some(([x, z, y]) => Math.hypot(x - cxk, z - czk) < 0.9 && Math.abs(y - h1) < 1)) continue;
          buttressAt.push([cxk, czk, h1]);
          box(D, A, B, h1, h1 - base + 0.3, 0.55, f.nx, f.nz, [0.5, 0.47, 0.41]);      // lower stage, deep
          box(D, A, B, h1 + 0.12, 0.12, 0.62, f.nx, f.nz, [0.44, 0.42, 0.38]);           // weathering cap
          box(D, A, B, h2, h2 - h1 - 0.12, 0.32, f.nx, f.nz, [0.52, 0.49, 0.43]);       // upper stage, set back, on the cap
          stats.buttresses++;
        }
      }
      // chimney stacks: Brussels terraces put them on the party walls, at the highest point of the gable
      // (the roof kit: the same rule as kit pieces, plus a stack on ~40 % of the gables of houses with no neighbour)
      // (a gable stack: one per house at most, only on houses with no party wall (villas, detached), 45 %)
      if (roofs && !landmark && faceH > 5 && width > 3 && (partyH >= 999 ? hash01(key + "c" + Math.round(cx) + Math.round(cz)) < 0.7
        : partyH === 0 && !hasStack && !terraced && width < 14 && hash01(key + "g") < 0.45)) {
        let hq = null;
        for (const { p } of f.tris) for (const q of p) if (!hq || q[1] > hq[1]) hq = q;
        if (hq && hq[1] - base > eaves + 0.8) {
          const uq = hq[0] * tx + hq[2] * tz;
          const um = Math.min(Math.max(uq, u0 + 0.8), u1 - 0.8) - uq;
          const ob = partyH >= 999 ? otherAt(hq[0] + f.nx * PARTY_PROBE, hq[2] + f.nz * PARTY_PROBE, bi) : -1;
          const st = roofs.gableChimney({ key, x: hq[0] + tx * um, z: hq[2] + tz * um, tx, tz, nx: f.nx, nz: f.nz, top: hq[1], party: partyH >= 999,
            roofAt: (x, z) => ownRoof(bi, x, z), otherRoof: ob >= 0 ? (x, z) => ownRoof(ob, x, z) : null, tone: stackTone(style, rnd) });
          if (st) stats.chimneys++;
          hasStack = true;
        }
      } else if (!roofs && !landmark && partyH >= 999 && faceH > 5 && width > 3 && hash01(key + "c" + Math.round(cx) + Math.round(cz)) < 0.7) {
        let hq = null;
        for (const { p } of f.tris) for (const q of p) if (!hq || q[1] > hq[1]) hq = q;
        if (hq && hq[1] - base > eaves + 0.8) {                                     // only on a real gable (pitched roof)
          const uq = hq[0] * tx + hq[2] * tz;
          const um = Math.min(Math.max(uq, u0 + 0.8), u1 - 0.8) - uq;              // keep the stack on the wall
          const cxq = hq[0] + tx * um, czq = hq[2] + tz * um;
          const hw = 0.45, A = [cxq - tx * hw, 0, czq - tz * hw], B = [cxq + tx * hw, 0, czq + tz * hw];
          const top = hq[1] + 1.1, brick = style <= 2 ? [0.2, 0.085, 0.055] : [0.24, 0.11, 0.07];
          // straddles the party wall (half on each side); both neighbours would build it: the first one does, closed
          const shared = chimneysAt.some(([x, z]) => Math.hypot(x - cxq, z - czq) < 1.0);
          if (shared) stats.chimneysShared++;
          else chimneysAt.push([cxq, czq, top]);
          if (!shared) {
          const A2 = [A[0] + f.nx * 0.3, 0, A[2] + f.nz * 0.3], B2 = [B[0] + f.nx * 0.3, 0, B[2] + f.nz * 0.3];
          box(D, A2, B2, top, 2.4, 0.6, -f.nx, -f.nz, brick, true);
          const cA = [A2[0] - tx * 0.06 + f.nx * 0.06, 0, A2[2] - tz * 0.06 + f.nz * 0.06];
          const cB = [B2[0] + tx * 0.06 + f.nx * 0.06, 0, B2[2] + tz * 0.06 + f.nz * 0.06];
          box(D, cA, cB, top + 0.1, 0.14, 0.72, -f.nx, -f.nz, [0.42, 0.41, 0.39], true);   // stone cap
          for (const k of [-0.2, 0.2]) {                                            // two clay pots
            const px = cxq + tx * k - f.nx * 0.0, pz = czq + tz * k - f.nz * 0.0;
            box(D, [px - tx * 0.09, 0, pz - tz * 0.09], [px + tx * 0.09, 0, pz + tz * 0.09], top + 0.42, 0.32, 0.18, f.nx, f.nz, [0.33, 0.13, 0.07], true);
          }
          stats.chimneys++;
          }
        }
      }
      // the façade kit takes this face? (street faces of eligible buildings, every opening on the wall)
      const k = kit ? kit.face({ key, building: b, doorFace: f === doorFace, wallStyle: style, landmark: !!landmark, rnd, width, eaves: faceEaves, partyH, street, roofAt: (x, z) => roofAt(bi, x, z),
        shopU, shopW, base, top, nx: f.nx, nz: f.nz, tx, tz, u0, tris: f.tris }) : null;
      const T = k?.on ? WK : W;
      for (const { p, n: nn, src } of f.tris) for (const q of p) {
        T.position.push(q[0], q[1], q[2]);
        const sn = src ? smooth(src, q) : nn;
        T.normal.push(sn[0], sn[1], sn[2]);
        T.aWall.push(q[0] * tx + q[2] * tz - u0, width, q[1] - base, faceEaves);
        T.aBld.push(style, partyH, street, rnd);
        T.aFN.push(f.nx, f.nz, shopU, shopW);                                    // outward normal (xz), shopfront centre / width + 10 * paint
        if (T === WK) WK.aKit.push(1, k.rise, k.doorless, k.french);
      }
    }
    // --- the roof kit (docs/assets/ROOFS.md): the building's roofs -> parapets, chimneys, solar, roof windows, furniture
    if (roofs && !landmark) {
      const ring = b.footprint[0];
      let fa = 0;
      for (let k = 0; k < ring.length; k++) { const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length]; fa += (x0 * z1 - x1 * z0) / 2; }
      const np = roofs.parapets.length;
      roofs.building({ key, rnd, height: b.height, base, eaves, landmark: !!landmark, style, roofTris: all.slice(wallTris), footArea: Math.abs(fa),
        hasStack, roofTop: b.top, tone: stackTone(style, rnd), roofColor: rc,
        streetNormals: live.filter((f) => f.pre.street).map((f) => [f.nx, f.nz]),
        roofAt: (x, z) => ownRoof(bi, x, z),
        otherTop: (x, z) => { const ob = otherAt(x, z, bi); return ob >= 0 ? ownRoof(ob, x, z) : -Infinity; } });
      // the parapets of its flat roofs: the outer face continues the wall below it (the wall material, aWall.w < 0 = a
      // parapet: no windows, no blind-wall marks), the inner face (the membrane dressed up it) and the coping as strips
      for (let k = np; k < roofs.parapets.length; k++) {
        const q = roofs.parapets[k], { A, B, nx, nz, h, t } = q;
        const y = (A[1] + B[1]) / 2;
        let face = null, rises = false;
        const ua = A[0] * -nz + A[2] * nx, ub = B[0] * -nz + B[2] * nx, uLo = Math.min(ua, ub) + 0.05, uHi = Math.max(ua, ub) - 0.05;
        for (const f of live) {
          if (f.nx * nx + f.nz * nz < 0.985) continue;
          const pd = f.tris[0].p[0][0] * f.nx + f.tris[0].p[0][2] * f.nz;
          if (Math.abs(A[0] * f.nx + A[2] * f.nz - pd) > 0.2) continue;
          // the building's own wall goes on up in this plane over the edge (a gable, a higher part): no parapet there
          for (const { p } of f.tris) {
            const q = p.map((v) => [v[0] * -nz + v[2] * nx, v[1]]);
            for (let j = 0; j <= 6 && !rises; j++) {
              const u = uLo + (uHi - uLo) * j / 6;
              // the triangle's top at u (its edges crossing the vertical line u)
              for (let e = 0; e < 3; e++) {
                const [u0, y0] = q[e], [u1, y1] = q[(e + 1) % 3];
                if ((u0 - u) * (u1 - u) > 0 || Math.abs(u1 - u0) < 1e-6) continue;
                if (y0 + (y1 - y0) * (u - u0) / (u1 - u0) > y + 0.08) { rises = true; break; }
              }
            }
            if (rises) break;
          }
          if (!face && Math.abs(f.pre.top - y) < 0.3) face = f;
        }
        if (rises) continue;
        // an END where a slope of the same building comes down (its eaves board / gutter / ridge beam end there) or one
        // of its walls rises over the edge (the parapet's end would lie in that wall's plane): stop 30 cm short
        const conflict = (Q) => {
          for (let k2 = 0; k2 < all.length; k2++) {
            const tri = all[k2], wall = k2 < wallTris;
            if (!wall && tri.n[1] > 0.97) continue;
            if (!tri.p.some((v) => Math.abs(v[0] - Q[0]) < 0.06 && Math.abs(v[2] - Q[2]) < 0.06)) continue;
            // a wall triangle at that corner reaching over the edge (anywhere: a sloping wall top rises away from the
            // corner), or a sloping roof triangle meeting the corner
            if (wall ? tri.p.some((v) => v[1] > Q[1] + 0.08) : tri.p.some((v) => Math.abs(v[1] - Q[1]) < 0.6)) return true;
          }
          return false;
        };
        const L0 = Math.hypot(B[0] - A[0], B[2] - A[2]), ex = (B[0] - A[0]) / L0, ez = (B[2] - A[2]) / L0;
        const cA = conflict(A), cB = conflict(B);
        if (L0 - (cA ? 0.3 : 0) - (cB ? 0.3 : 0) < 0.6) continue;
        if (cA) q.A = [A[0] + ex * 0.3, A[1] + (B[1] - A[1]) * 0.3 / L0, A[2] + ez * 0.3];
        if (cB) q.B = [B[0] - ex * 0.3, B[1] - (B[1] - A[1]) * 0.3 / L0, B[2] - ez * 0.3];
        emitParapet(q);
      }
    }
    function emitParapet(q) {
      {
        const { A, B, nx, nz, h, t } = q;
        const y = (A[1] + B[1]) / 2;
        let face = null;
        for (const f of live) {
          if (f.nx * nx + f.nz * nz < 0.985) continue;
          const pd = f.tris[0].p[0][0] * f.nx + f.tris[0].p[0][2] * f.nz;
          if (Math.abs(A[0] * f.nx + A[2] * f.nz - pd) > 0.2) continue;
          if (Math.abs(f.pre.top - y) < 0.3) { face = f; break; }
        }
        const tx = -nz, tz = nx, u0 = face ? face.pre.u0 : 0, fw = face ? face.pre.width : Math.hypot(B[0] - A[0], B[2] - A[2]);
        const fstyle = style;
        const quadW = [[A[0], A[1], A[2]], [B[0], B[1], B[2]], [B[0], B[1] + h, B[2]], [A[0], A[1] + h, A[2]]];
        const ux = quadW[1][0] - quadW[0][0], uz = quadW[1][2] - quadW[0][2];
        // wound so its geometric normal faces (nx, nz) (as pushQuad): (B - A) x (B + up - A) . n = h (ux nz - uz nx)
        const ord = ux * nz - uz * nx >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const i of ord) {
          const v = quadW[i];
          W.position.push(v[0], v[1], v[2]); W.normal.push(nx, 0, nz);
          W.aWall.push(v[0] * tx + v[2] * tz - u0, fw, v[1] - base, -Math.max(eaves, 0.01));
          W.aBld.push(fstyle, 0, 0, rnd); W.aFN.push(nx, nz, 0, 0);
        }
        const top = Math.max(A[1], B[1]) + h, inner = [rc[0] * 0.85, rc[1] * 0.85, rc[2] * 0.85];
        const cope = q.cope < 0.5 ? [0.44, 0.45, 0.46] : q.cope < 0.65 ? [0.38, 0.37, 0.34] : q.cope < 0.8 ? [0.085, 0.09, 0.095] : [0.06, 0.063, 0.068];
        // (down to 2 cm under the LOWER end: a flat roof's edge may fall a little along its length; JOINS)
        addStrip(SD, "pi", A, B, top, top - Math.min(A[1], B[1]) + 0.02, t, nx, nz, inner, -t).mask = "b";
        addStrip(SD, "cp", A, B, top + 0.05, 0.05, t + 0.06, nx, nz, cope, -(t + 0.03)).mask = "ftsb";
        stats.parapets = (stats.parapets || 0) + 1;
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
      const beams = [];
      for (const list of edges.values()) {
        // eaves: a roof edge with no other roof face, horizontal, the low edge of a pitched slope ->
        // the roof oversails the wall by 30 cm, with a zinc gutter under its lip
        if (list.length === 1 && !landmark) {
          const { tri, A, B, C } = list[0], n = tri.n[1] < 0 ? tri.n.map((v) => -v) : tri.n;
          if (n[1] > 0.2 && n[1] < 0.97 && Math.abs(A[1] - B[1]) < 0.05 && C[1] > A[1] + 0.3) {
            const hl = Math.hypot(n[0], n[2]) || 1, ox = n[0] / hl, oz = n[2] / hl;   // downhill, outward
            addStrip(SD, "eb", A, B, A[1] + 0.03, 0.1, 0.32, ox, oz, [rc[0] * 0.8, rc[1] * 0.8, rc[2] * 0.8]);
            addStrip(SD, "gu", A, B, A[1] - 0.05, 0.12, 0.13, ox, oz, [0.2, 0.205, 0.21], 0.26);    // the gutter, 26 cm out (weathered zinc)
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
        beams.push([e1.A, e1.B]);
        stats.ridges++;
      }
      // the beams' ends: shared by two collinear beams = open (one continuous ridge), by a junction = stop short + an
      // apex block, free = an end cap
      const ends = new Map();
      for (const [P, Q] of beams) for (const [X, Y] of [[P, Q], [Q, P]]) { const k = kv(X); if (!ends.has(k)) ends.set(k, []); ends.get(k).push([X, Y]); }
      const kind = (X) => {
        const l = ends.get(kv(X));
        if (l.length === 1) return "cap";
        if (l.length === 2) {
          const d = l.map(([a, b]) => { const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = Math.hypot(...v) || 1; return v.map((c) => c / n); });
          if (d[0][0] * d[1][0] + d[0][1] * d[1][1] + d[0][2] * d[1][2] < -0.995) return "open";
        }
        return "junction";
      };
      const w = landmark ? 0.34 : 0.26, h = landmark ? 0.2 : 0.14;
      for (const [P, Q] of beams) beam(D, P, Q, w, h, capCol, kind(P), kind(Q));
      for (const l of ends.values()) if (l.length >= 2 && kind(l[0][0]) === "junction") {
        const [X, Y] = l[0];
        if (apexAt.some((q) => Math.hypot(q[0] - X[0], q[1] - X[1], q[2] - X[2]) < w)) continue;     // one block per junction
        apexAt.push(X);
        apexBlock(D, X, w, h, Y[0] - X[0], Y[2] - X[2], capCol);
      }
    }
    // --- roofs: slope-aligned coordinates, smoothed shading normals, real colour
    // (the roof kit: a flat roof's (u, v) run along the footprint's longest side: the membrane's rolls and seams follow it)
    let fc = 1, fs = 0;
    if (roofs) {
      const ring = b.footprint[0];
      let best = 0;
      for (let k = 0; k < ring.length; k++) {
        const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length], L = Math.hypot(x1 - x0, z1 - z0);
        if (L > best) { best = L; fc = (x1 - x0) / L; fs = (z1 - z0) / L; }
      }
    }
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
        if (flat) R.aRoof.push(q[0] * fc + q[2] * fs, -q[0] * fs + q[2] * fc, 1, roofStyle);
        else R.aRoof.push(q[0] * -dz + q[2] * dx, (q[0] * dx + q[2] * dz) / Math.max(ny, 0.2), 0, roofStyle);
      }
    }
  });
  emitStrips(D, SD, stats);
  const f32 = (a) => new Float32Array(a);
  return {
    walls: { position: f32(W.position), normal: f32(W.normal), aWall: f32(W.aWall), aBld: f32(W.aBld), aFN: f32(W.aFN),
      kit: kit ? { position: f32(WK.position), normal: f32(WK.normal), aWall: f32(WK.aWall), aBld: f32(WK.aBld), aFN: f32(WK.aFN), aKit: f32(WK.aKit) } : null },
    kit: kit ? kit.finish() : null,
    roofKit: roofs ? roofs.finish() : null,
    details: { position: f32(D.position), normal: f32(D.normal), aCol: f32(D.color) },
    roofs: { position: f32(R.position), normal: f32(R.normal), aRoof: f32(R.aRoof), aRoofCol: f32(R.aRoofCol) },
    stats: { ...stats, triangles: T, vertices: V },
  };
}

// ---------------------------------------------------------------- materials

