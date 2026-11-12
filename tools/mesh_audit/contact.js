// CONTACT CHECK: where a scripted model meets the generated ground, the two must be welded or closed (skirt / kerb /
// wall): never an open floating edge or a gap you can see under (the owner's JOINS rule, 2026-11-13, from the
// Verrewinkel bridge: the approach's slab stuck out over a gap beside the abutment).
//
//   auditContact(model, ground, options) -> { summary, items }
//     model   parts (partFromBufferGeometry: world-space positions + index) of the thing checked: a hero's LOD0, a
//             bridge, or a tile's roads / sidewalks / plazas
//     ground  parts it should rest on: the tile's terrain, roads, sidewalks, plazas, rail ballast (and other heroes)
//
// Candidate edges ("where it can float"):
//   open      an edge of the model used by ONE triangle (after a 1 mm weld): a slab's rim, a skirt's foot, a plane's end
//   bottom    a sharp edge between a face looking DOWN (n.y < -0.5) and a side face (|n.y| < 0.5): the foot of a closed
//             block (a plinth, a step, a pier) or the underside rim of a slab
// Each candidate is sampled every `step` m (not within 2 cm of its ends) and a sample is fine when
//   touch     another surface (model or ground, not a triangle sharing a vertex with the edge) is within `touch` (2 cm)
//   buried    it is under the ground (a vertical ray up from it meets a ground face from below within `buryDepth`)
// otherwise it floats; `gap` = the drop to the first surface under it (Infinity: nothing). Kept (= an item):
//   floating  (BLOCK) the first surface under it is the GROUND, 2 cm < gap <= slit (0.3 m): a plinth, a skirt, a
//             slab edge hovering over the street / bank: you see a slit
//   overhang  (BLOCK) an OPEN edge of a level face (n.y > 0.9: a slab, a deck, a tread) with nothing (model or ground)
//             within slit under it: a paper-thin slab sticking out over a gap (the owner's Verrewinkel spot)
//   opening   (info)  the ground slit < gap <= zone (1.5 m) under a model edge: an arch or a deck over a bank, a bench;
//             usually design, listed for review
//   a model part over the model itself (a railing's bottom bar over its deck) is design, not a join: not listed; other
//   high edges (gutters, eaves, cornices) are parts in the air: not listed
// Samples are clustered (0.6 m) into items: { kind, at, length, gapMax, gapMean, part }.
// Pure JS, no imports: the browser (viewer/contactAudit.js, in the city with the real tile ground) and Node.

const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export const CONTACT_DEFAULTS = {
  weld: 1e-3,         // m: vertices closer than this are one (open-edge detection)
  step: 0.1,          // m between samples along a candidate edge
  touch: 0.02,        // m: a surface this close closes the edge (welded / resting)
  slit: 0.3,          // m: a model edge this close over the ground (and nothing of the model under it) is a visible slit (block)
  zone: 1.5,          // m: up to this, a higher gap over the ground is listed as an "opening" (info: an arch over a bank)
  buryDepth: 30,      // m: a ground face this far above the sample (seen from below) buries it
  boxed: 0.6,         // m: a sample with something this close on 5 of its 6 axis rays is hidden (inside masonry)
  cluster: 0.6,       // m: samples closer than this are one item
  minLength: 0.15,    // m: shorter items are noise (a sliver's corner)
  cell: 0.5,          // m: hash grid for the touch query
  pad: 3,             // m: ground triangles within the model's box + pad are loaded
  maxItems: 400,
};

function soup(parts, filter = null) {
  let n = 0;
  for (const p of parts) n += (p.index ? p.index.length : p.positions.length / 3) / 3;
  const v = new Float64Array(n * 9), nrm = new Float32Array(n * 3), part = new Int32Array(n);
  let t = 0;
  parts.forEach((p, pi) => {
    const P = p.positions, I = p.index, nt = (I ? I.length : P.length / 3) / 3;
    for (let k = 0; k < nt; k++) {
      const b = t * 9;
      for (let c = 0; c < 3; c++) { const vi = I ? I[k * 3 + c] : k * 3 + c; v[b + c * 3] = P[vi * 3]; v[b + c * 3 + 1] = P[vi * 3 + 1]; v[b + c * 3 + 2] = P[vi * 3 + 2]; }
      if (filter && !filter(v, b)) continue;
      const ux = v[b + 3] - v[b], uy = v[b + 4] - v[b + 1], uz = v[b + 5] - v[b + 2], wx = v[b + 6] - v[b], wy = v[b + 7] - v[b + 1], wz = v[b + 8] - v[b + 2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-10) continue;
      nrm[t * 3] = nx / L; nrm[t * 3 + 1] = ny / L; nrm[t * 3 + 2] = nz / L; part[t] = pi;
      t++;
    }
  });
  return { n: t, v: v.subarray(0, t * 9), nrm: nrm.subarray(0, t * 3), part: part.subarray(0, t) };
}

/** Closest point on triangle (a, b, c) to p: squared distance (Ericson, Real-Time Collision Detection 5.1.5). */
function triDist2(v, b, px, py, pz) {
  const ax = v[b], ay = v[b + 1], az = v[b + 2], bx = v[b + 3], by = v[b + 4], bz = v[b + 5], cx = v[b + 6], cy = v[b + 7], cz = v[b + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const d2s = (x, y, z) => (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
  if (d1 <= 0 && d2 <= 0) return d2s(ax, ay, az);
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return d2s(bx, by, bz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return d2s(ax + abx * t, ay + aby * t, az + abz * t); }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return d2s(cx, cy, cz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return d2s(ax + acx * t, ay + acy * t, az + acz * t); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return d2s(bx + (cx - bx) * t, by + (cy - by) * t, bz + (cz - bz) * t); }
  const den = 1 / (va + vb + vc), s = vb * den, w = vc * den;
  return d2s(ax + abx * s + acx * w, ay + aby * s + acy * w, az + abz * s + acz * w);
}

/** y of triangle b at (x, z) if (x, z) is inside its plan, else NaN. */
function triYAt(v, b, x, z) {
  const ax = v[b], az = v[b + 2], bx = v[b + 3], bz = v[b + 5], cx = v[b + 6], cz = v[b + 8];
  const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(det) < 1e-12) return NaN;
  const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
  if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) return NaN;
  return l1 * v[b + 1] + l2 * v[b + 4] + l3 * v[b + 7];
}

/** Möller-Trumbore: t along the ray, or -1. */
function rayTri(v, b, ox, oy, oz, dx, dy, dz) {
  const e1x = v[b + 3] - v[b], e1y = v[b + 4] - v[b + 1], e1z = v[b + 5] - v[b + 2], e2x = v[b + 6] - v[b], e2y = v[b + 7] - v[b + 1], e2z = v[b + 8] - v[b + 2];
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-14) return -1;
  const f = 1 / det, sx = ox - v[b], sy = oy - v[b + 1], sz = oz - v[b + 2], u = f * (sx * px + sy * py + sz * pz);
  if (u < 0 || u > 1) return -1;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz);
  if (w < 0 || u + w > 1) return -1;
  return f * (e2x * qx + e2y * qy + e2z * qz);
}

/** A grid of triangles: 3D cells (touch queries) and 2D columns (vertical rays). */
function grid(S, cell, box) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell)), ny = Math.max(1, Math.ceil((y1 - y0) / cell)), nz = Math.max(1, Math.ceil((z1 - z0) / cell));
  const cells = new Map(), cols = new Map();
  const add = (m, k, t) => { let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(t); };
  for (let t = 0; t < S.n; t++) {
    const b = t * 9;
    const mnx = Math.min(S.v[b], S.v[b + 3], S.v[b + 6]), mxx = Math.max(S.v[b], S.v[b + 3], S.v[b + 6]);
    const mny = Math.min(S.v[b + 1], S.v[b + 4], S.v[b + 7]), mxy = Math.max(S.v[b + 1], S.v[b + 4], S.v[b + 7]);
    const mnz = Math.min(S.v[b + 2], S.v[b + 5], S.v[b + 8]), mxz = Math.max(S.v[b + 2], S.v[b + 5], S.v[b + 8]);
    if (mxx < x0 || mnx > x1 || mxz < z0 || mnz > z1) continue;
    const i0 = Math.max(0, Math.floor((mnx - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((mxx - x0) / cell));
    const k0 = Math.max(0, Math.floor((mnz - z0) / cell)), k1 = Math.min(nz - 1, Math.floor((mxz - z0) / cell));
    const j0 = Math.max(0, Math.floor((mny - y0) / cell)), j1 = Math.min(ny - 1, Math.floor((mxy - y0) / cell));
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
      add(cols, i * 65536 + k, t);
      if (mxy >= y0 && mny <= y1) for (let j = j0; j <= j1; j++) add(cells, (i * 4096 + j) * 4096 + k, t);
    }
  }
  return {
    S, cell, x0, y0, z0, nx, ny, nz,
    near(px, py, pz, r, skip, fn) {
      const i0 = Math.floor((px - r - x0) / cell), i1 = Math.floor((px + r - x0) / cell), j0 = Math.floor((py - r - y0) / cell), j1 = Math.floor((py + r - y0) / cell);
      const k0 = Math.floor((pz - r - z0) / cell), k1 = Math.floor((pz + r - z0) / cell);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
        if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
        for (const t of cells.get((i * 4096 + j) * 4096 + k) || []) if (!skip?.(t) && fn(t)) return true;
      }
      return false;
    },
    /** first hit along a ray (dir unit) up to tmax: { t, tri } or null; marches the 3D cells */
    ray(ox, oy, oz, dx, dy, dz, tmax, skip) {
      const seen = new Set();
      let best = tmax, bt = -1;
      const h = cell * 0.5;
      for (let s = 0; s * h <= Math.min(best, tmax) + cell; s++) {
        const px = ox + dx * s * h, py = oy + dy * s * h, pz = oz + dz * s * h;
        const i = Math.floor((px - x0) / cell), j = Math.floor((py - y0) / cell), k = Math.floor((pz - z0) / cell);
        if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) { if (s * h > cell) break; continue; }
        for (const t of cells.get((i * 4096 + j) * 4096 + k) || []) {
          if (seen.has(t) || skip?.(t)) continue;
          seen.add(t);
          const tt = rayTri(S.v, t * 9, ox, oy, oz, dx, dy, dz);
          if (tt > 1e-4 && tt < best) { best = tt; bt = t; }
        }
      }
      return bt < 0 ? null : { t: best, tri: bt };
    },
    column(px, pz) { const i = Math.floor((px - x0) / cell), k = Math.floor((pz - z0) / cell); return cols.get(i * 65536 + k) || []; },
  };
}

/**
 * The check. model / ground: parts ({ name, slot, positions, index }, world space). Returns { summary, items }.
 * options: CONTACT_DEFAULTS + { ignore?(p) -> true to skip a sample (e.g. inside a tunnel) }
 */
export function auditContact(model, ground, options = {}) {
  const O = { ...CONTACT_DEFAULTS, ...options };
  const t0 = Date.now();
  const M = soup(model);
  let bx0 = Infinity, by0 = Infinity, bz0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz1 = -Infinity;
  for (let i = 0; i < M.v.length; i += 3) { const x = M.v[i], y = M.v[i + 1], z = M.v[i + 2]; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; if (z < bz0) bz0 = z; if (z > bz1) bz1 = z; }
  const box = [bx0 - O.pad, by0 - O.pad - O.buryDepth, bz0 - O.pad, bx1 + O.pad, by1 + O.pad, bz1 + O.pad];
  const G = soup(ground, (v, b) => {
    const mnx = Math.min(v[b], v[b + 3], v[b + 6]), mxx = Math.max(v[b], v[b + 3], v[b + 6]), mnz = Math.min(v[b + 2], v[b + 5], v[b + 8]), mxz = Math.max(v[b + 2], v[b + 5], v[b + 8]);
    return mxx >= box[0] && mnx <= box[3] && mxz >= box[2] && mnz <= box[5];
  });
  const gm = grid(M, O.cell, box), gg = grid(G, O.cell, box);
  // ---- weld + edges of the model
  const vid = new Int32Array(M.n * 3), wmap = new Map();
  let nv = 0;
  for (let t = 0; t < M.n; t++) for (let c = 0; c < 3; c++) {
    const b = t * 9 + c * 3, k = `${Math.round(M.v[b] / O.weld)},${Math.round(M.v[b + 1] / O.weld)},${Math.round(M.v[b + 2] / O.weld)}`;
    let id = wmap.get(k); if (id === undefined) { id = nv++; wmap.set(k, id); }
    vid[t * 3 + c] = id;
  }
  const edges = new Map();
  for (let t = 0; t < M.n; t++) for (let c = 0; c < 3; c++) {
    const a = vid[t * 3 + c], b = vid[t * 3 + (c + 1) % 3];
    if (a === b) continue;
    const k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    const e = edges.get(k);
    if (e) e.push(t, c); else edges.set(k, [t, c]);
  }
  // triangles sharing a vertex with a given triangle (its 1-ring): skipped in the touch query
  const vtris = new Map();
  for (let t = 0; t < M.n; t++) for (let c = 0; c < 3; c++) { const a = vid[t * 3 + c]; const l = vtris.get(a); if (l) l.push(t); else vtris.set(a, [t]); }
  const ny = (t) => M.nrm[t * 3 + 1];
  const cand = [];       // [tri, corner, kind]
  for (const e of edges.values()) {
    if (e.length === 2) { cand.push(e[0], e[1], 0); continue; }                     // open
    if (e.length === 4) {
      const a = e[0], b = e[2], ya = ny(a), yb = ny(b);
      if ((ya < -0.5 && Math.abs(yb) < 0.5) || (yb < -0.5 && Math.abs(ya) < 0.5)) cand.push(ya < yb ? a : b, ya < yb ? e[1] : e[3], 1);   // bottom rim
    }
  }
  // ---- samples
  const skipSet = new Set();
  let samples = 0, checked = 0;
  const bad = [];
  const touch2 = O.touch * O.touch;
  for (let q = 0; q < cand.length; q += 3) {
    const t = cand[q], c = cand[q + 1], kind = cand[q + 2], b = t * 9;
    const A = [M.v[b + c * 3], M.v[b + c * 3 + 1], M.v[b + c * 3 + 2]], c2 = (c + 1) % 3, B = [M.v[b + c2 * 3], M.v[b + c2 * 3 + 1], M.v[b + c2 * 3 + 2]];
    const L = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    if (L < 0.05) continue;
    skipSet.clear();
    for (const vv of [vid[t * 3], vid[t * 3 + 1], vid[t * 3 + 2]]) for (const s of vtris.get(vv)) skipSet.add(s);
    // the rim's other face (bottom rim): its 1-ring too
    const n = Math.max(1, Math.round((L - 0.04) / O.step));
    const level = M.nrm[t * 3 + 1] > 0.9;
    for (let s = 0; s <= n; s++) {
      const f = (0.02 + (L - 0.04) * s / n) / L;
      const px = A[0] + (B[0] - A[0]) * f, py = A[1] + (B[1] - A[1]) * f, pz = A[2] + (B[2] - A[2]) * f;
      samples++;
      if (O.ignore?.(px, py, pz)) continue;
      // touch: another surface within O.touch
      const close = (S) => (tt) => triDist2(S.v, tt * 9, px, py, pz) <= touch2;
      if (gm.near(px, py, pz, O.touch, (tt) => skipSet.has(tt), close(M))) continue;
      if (gg.near(px, py, pz, O.touch, null, close(G))) continue;
      // buried: a ground face above, seen from below (its normal points up), within buryDepth
      let buried = false, drop = Infinity;
      for (const tt of gg.column(px, pz)) {
        const y = triYAt(G.v, tt * 9, px, pz);
        if (Number.isNaN(y)) continue;
        if (y > py && y - py < O.buryDepth && G.nrm[tt * 3 + 1] > 0.05) { buried = true; break; }
        if (y <= py && py - y < drop) drop = py - y;
      }
      if (buried) continue;
      // inside a closed part of the model (an end tucked into a wall): the nearest model face above is seen from
      // below (normal up) and the nearest one under it from above... from inside (normal down)
      let up = Infinity, upN = 0, dn = Infinity, dnN = 0;
      for (const tt of gm.column(px, pz)) {
        if (skipSet.has(tt)) continue;
        const y = triYAt(M.v, tt * 9, px, pz);
        if (Number.isNaN(y)) continue;
        if (y < py - 1e-3 && py - y < dn) { dn = py - y; dnN = M.nrm[tt * 3 + 1]; }
        if (y > py + 1e-3 && y - py < up) { up = y - py; upN = M.nrm[tt * 3 + 1]; }
      }
      if (up < 50 && upN > 0.05 && dn < 50 && dnN < -0.05) continue;
      // enclosed (an end tucked into a wall or under a parapet): >= 3 of 6 axis rays first meet a face from behind
      // or boxed in (>= 5 of the 6 rays meet something within `boxed`): a seam inside masonry nobody sees
      let back = 0, near = 0;
      for (const [dx, dy, dz] of AXES) {
        let h = gm.ray(px, py, pz, dx, dy, dz, 20, (tt) => skipSet.has(tt)), S = M;
        const hg = gg.ray(px, py, pz, dx, dy, dz, h ? h.t : 20);
        if (hg) { h = hg; S = G; }
        if (h && S.nrm[h.tri * 3] * dx + S.nrm[h.tri * 3 + 1] * dy + S.nrm[h.tri * 3 + 2] * dz > 0) back++;
        if (h && h.t <= O.boxed) near++;
      }
      if (O.trace && Math.hypot(px - O.trace[0], py - O.trace[1], pz - O.trace[2]) < 0.3) O.traceOut.push({ p: [px, py, pz], back, near, up, upN, dn, dnN, drop, rays: AXES.map(([dx, dy, dz]) => { const h = gm.ray(px, py, pz, dx, dy, dz, 20, (tt) => skipSet.has(tt)); const hg = gg.ray(px, py, pz, dx, dy, dz, 20); return [h && +h.t.toFixed(3), h && [...M.nrm.subarray(h.tri * 3, h.tri * 3 + 3)].map((v) => +v.toFixed(2)), hg && +hg.t.toFixed(3)]; }) });
      if (back >= 3 || near >= 5) continue;
      checked++;
      // floating: the first thing under it is the GROUND, within zone (a model part over its own deck, e.g. a railing's
      // bottom bar, is the model's design, not a join); overhang: nothing (model or ground) within zone under a slab rim
      const below = Math.min(drop, dn);
      const what = level && kind === 0 && below > O.slit ? "overhang"
        : drop < dn && drop <= O.slit ? "floating"
        : drop < dn && drop <= O.zone ? "opening" : null;
      if (dn < drop) drop = dn;
      if (!what) continue;
      bad.push({ x: px, y: py, z: pz, gap: drop, kind: what, edge: kind ? "bottom" : "open", t });
    }
  }
  // ---- clusters
  const cl = [];
  const cg = new Map(), key = (x, z) => `${Math.floor(x / O.cluster)},${Math.floor(z / O.cluster)}`;
  for (const s of bad) {
    let into = null;
    const i = Math.floor(s.x / O.cluster), k = Math.floor(s.z / O.cluster);
    for (let a = i - 1; a <= i + 1 && !into; a++) for (let d = k - 1; d <= k + 1 && !into; d++) for (const c of cg.get(`${a},${d}`) || []) {
      if (c.kind === s.kind && Math.abs(c.ly - s.y) < 1 && Math.hypot(c.lx - s.x, c.lz - s.z) <= O.cluster) { into = c; break; }
    }
    if (!into) { into = { kind: s.kind, n: 0, sum: 0, max: 0, min: Infinity, pts: [], parts: new Map(), edge: s.edge }; cl.push(into); }
    into.n++; into.lx = s.x; into.ly = s.y; into.lz = s.z;
    const g = Number.isFinite(s.gap) ? s.gap : 99;
    into.sum += g; into.max = Math.max(into.max, g); into.min = Math.min(into.min, g);
    into.pts.push([s.x, s.y, s.z]);
    const p = model[M.part[s.t]], pn = p.slot ? `${p.name}/${p.slot}` : p.name;
    into.parts.set(pn, (into.parts.get(pn) || 0) + 1);
    const kk = key(s.x, s.z); (cg.get(kk) || cg.set(kk, []).get(kk)).push(into);
  }
  const items = cl.map((c) => {
    const m = c.pts[c.pts.length >> 1];
    return { check: "contact", kind: c.kind, sev: c.kind === "opening" ? "info" : "block", at: m.map((v) => +v.toFixed(2)), length: +(c.n * O.step).toFixed(2), samples: c.n,
      gapMax: +c.max.toFixed(3), gapMin: +c.min.toFixed(3), gapMean: +(c.sum / c.n).toFixed(3), edge: c.edge,
      part: [...c.parts.entries()].sort((a, b) => b[1] - a[1])[0][0],
      from: c.pts[0].map((v) => +v.toFixed(2)), to: c.pts[c.pts.length - 1].map((v) => +v.toFixed(2)) };
  }).filter((x) => x.length >= O.minLength).sort((a, b) => b.length * Math.min(b.gapMax, 5) - a.length * Math.min(a.gapMax, 5));
  const by = (k) => items.filter((x) => x.kind === k);
  const summary = { modelTris: M.n, groundTris: G.n, candidates: cand.length / 3, samples, checked, floating: by("floating").length, overhang: by("overhang").length,
    floatingLength: +by("floating").reduce((s, x) => s + x.length, 0).toFixed(1), overhangLength: +by("overhang").reduce((s, x) => s + x.length, 0).toFixed(1),
    opening: by("opening").length, blocking: items.filter((x) => x.sev === "block").length, ms: Date.now() - t0 };
  return { summary, items: items.slice(0, O.maxItems) };
}
