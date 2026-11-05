// A SMALL TRIANGLE BVH for the character controller and its camera: static triangle soups (the lab's test course,
// house interiors, the city's road / sidewalk meshes) in world space, on flat typed arrays, queried with ZERO
// allocations (an explicit Int32Array stack, results written into preallocated arrays).
//
//   const bvh = new TriBVH(positions, index?)          positions: xyz Float32Array (world space), index optional
//   bvh.capsule(q, contacts)    q = [ax, ay, az, bx, by, bz, r]: every triangle closer than r to AB -> contacts
//   bvh.raycast(r, hit)         r = [o, d], hit = [t so far, n, tag]: the nearest hit, if nearer (world.js)
//
// Build: median split on the longest centroid axis (quickselect), leaves of <= 4 triangles: a city tile's roads
// (35k triangles) in ~25-60 ms, 300k in ~270 ms. Written for this project, no three.js inside.
import { segTriClosest, CP, SEG } from "./geom.js";

const LEAF = 4;
const STACK = new Int32Array(256);

export class TriBVH {
  constructor(positions, index = null, { leaf = LEAF } = {}) {
    // three small top-level phases (one big constructor body optimised ~3x worse in V8)
    const { src, cen, T } = gather(positions, index);
    this.count = T;
    const B = split(src, cen, T, leaf);
    const { tri, nrm } = reorder(src, B.order, T);
    this.tri = tri; this.nrm = nrm;
    this.box = B.box; this.first = B.first; this.cnt = B.cnt;
    this.nodes = B.nodes;
    this.enabled = true;
    this.tag = 0;                                  // contact kind reported for this source
  }

  /** World bounds of the whole set. */
  get bounds() { const b = this.box; return { x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5] }; }

  /** Every triangle closer than r to segment AB: contact (normal from the triangle to the segment, depth, point). */
  capsule(q, contacts) {
    if (!this.enabled || !this.count) return;
    const ax = q[0], ay = q[1], az = q[2], bx = q[3], by = q[4], bz = q[5], r = q[6];
    SEG[0] = ax; SEG[1] = ay; SEG[2] = az; SEG[3] = bx; SEG[4] = by; SEG[5] = bz;
    const D = contacts.d;
    const qx0 = Math.min(ax, bx) - r, qy0 = Math.min(ay, by) - r, qz0 = Math.min(az, bz) - r;
    const qx1 = Math.max(ax, bx) + r, qy1 = Math.max(ay, by) + r, qz1 = Math.max(az, bz) + r;
    const box = this.box, first = this.first, cnt = this.cnt, tri = this.tri, nrm = this.nrm, r2 = r * r;
    let sp = 0;
    STACK[sp++] = 0;
    while (sp > 0) {
      const node = STACK[--sp], b = node * 6;
      if (box[b] > qx1 || box[b + 3] < qx0 || box[b + 1] > qy1 || box[b + 4] < qy0 || box[b + 2] > qz1 || box[b + 5] < qz0) continue;
      const c = cnt[node];
      if (c === 0) { STACK[sp++] = first[node]; STACK[sp++] = first[node] + 1; continue; }
      for (let i = first[node], e = first[node] + c; i < e; i++) {
        const o = i * 9;
        // cheap reject: triangle box vs query box
        const t0x = tri[o], t1x = tri[o + 3], t2x = tri[o + 6];
        if ((t0x > qx1 && t1x > qx1 && t2x > qx1) || (t0x < qx0 && t1x < qx0 && t2x < qx0)) continue;
        const t0z = tri[o + 2], t1z = tri[o + 5], t2z = tri[o + 8];
        if ((t0z > qz1 && t1z > qz1 && t2z > qz1) || (t0z < qz0 && t1z < qz0 && t2z < qz0)) continue;
        const t0y = tri[o + 1], t1y = tri[o + 4], t2y = tri[o + 7];
        if ((t0y > qy1 && t1y > qy1 && t2y > qy1) || (t0y < qy0 && t1y < qy0 && t2y < qy0)) continue;
        segTriClosest(tri, o);
        const d2 = CP[6];
        if (d2 >= r2) continue;
        let nx, ny, nz, depth, fny = nrm[i * 3 + 1];
        if (d2 > 1e-12) {
          const d = Math.sqrt(d2);
          nx = (CP[0] - CP[3]) / d; ny = (CP[1] - CP[4]) / d; nz = (CP[2] - CP[5]) / d; depth = r - d;
          if (nx * nrm[i * 3] + ny * fny + nz * nrm[i * 3 + 2] < 0) fny = -fny;     // the face as seen from the capsule
        } else {
          // the segment goes through the triangle: the face normal, toward the segment's middle
          nx = nrm[i * 3]; ny = nrm[i * 3 + 1]; nz = nrm[i * 3 + 2];
          const mx = (ax + bx) * 0.5 - t0x, my = (ay + by) * 0.5 - t0y, mz = (az + bz) * 0.5 - t0z;
          if (mx * nx + my * ny + mz * nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const da = (ax - t0x) * nx + (ay - t0y) * ny + (az - t0z) * nz, db = (bx - t0x) * nx + (by - t0y) * ny + (bz - t0z) * nz;
          depth = r - Math.min(da, db, 0); fny = ny;
        }
        const k = contacts.slot();
        if (k < 0) return;
        D[k] = nx; D[k + 1] = ny; D[k + 2] = nz; D[k + 3] = depth; D[k + 4] = CP[3]; D[k + 5] = CP[4]; D[k + 6] = CP[5]; D[k + 7] = fny; D[k + 8] = this.tag;
      }
    }
  }

  /** Nearest hit along the ray (dir need not be unit; t in units of dir), double-sided. Normal faces the ray. */
  raycast(R, H) {
    if (!this.enabled || !this.count) return;
    const ox = R[0], oy = R[1], oz = R[2], dx = R[3], dy = R[4], dz = R[5], tmax = H[0];
    const box = this.box, first = this.first, cnt = this.cnt, tri = this.tri, nrm = this.nrm;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    let best = tmax, hit = -1, sp = 0;
    STACK[sp++] = 0;
    while (sp > 0) {
      const node = STACK[--sp], b = node * 6;
      // slab test
      let t0 = (box[b] - ox) * ix, t1 = (box[b + 3] - ox) * ix;
      let lo = Math.min(t0, t1), hi = Math.max(t0, t1);
      t0 = (box[b + 1] - oy) * iy; t1 = (box[b + 4] - oy) * iy;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
      t0 = (box[b + 2] - oz) * iz; t1 = (box[b + 5] - oz) * iz;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
      if (!(hi >= Math.max(lo, 0)) || lo > best) continue;       // NaN-safe (axis-parallel rays)
      const c = cnt[node];
      if (c === 0) { STACK[sp++] = first[node]; STACK[sp++] = first[node] + 1; continue; }
      for (let i = first[node], e = first[node] + c; i < e; i++) {
        const o = i * 9;
        const ax = tri[o], ay = tri[o + 1], az = tri[o + 2];
        const e1x = tri[o + 3] - ax, e1y = tri[o + 4] - ay, e1z = tri[o + 5] - az;
        const e2x = tri[o + 6] - ax, e2y = tri[o + 7] - ay, e2z = tri[o + 8] - az;
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-12 && det < 1e-12) continue;
        const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az;
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t >= 0 && t < best) { best = t; hit = i; }
      }
    }
    if (hit < 0) return;
    let nx = nrm[hit * 3], ny = nrm[hit * 3 + 1], nz = nrm[hit * 3 + 2];
    if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }
    H[0] = best; H[1] = nx; H[2] = ny; H[3] = nz; H[4] = this.tag;
  }
}


/** The triangles (from an optional index) and their centroids. */
function gather(positions, index) {
  const T = index ? (index.length / 3) | 0 : (positions.length / 9) | 0;
  const src = new Float32Array(T * 9), cen = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) {
    for (let k = 0; k < 3; k++) {
      const v = index ? index[t * 3 + k] : t * 3 + k;
      src[t * 9 + k * 3] = positions[v * 3]; src[t * 9 + k * 3 + 1] = positions[v * 3 + 1]; src[t * 9 + k * 3 + 2] = positions[v * 3 + 2];
    }
    cen[t * 3] = (src[t * 9] + src[t * 9 + 3] + src[t * 9 + 6]) / 3;
    cen[t * 3 + 1] = (src[t * 9 + 1] + src[t * 9 + 4] + src[t * 9 + 7]) / 3;
    cen[t * 3 + 2] = (src[t * 9 + 2] + src[t * 9 + 5] + src[t * 9 + 8]) / 3;
  }
  return { src, cen, T };
}

/** The node tree: median splits, leaves of <= leaf triangles; `order` = the triangles in leaf order. */
function split(src, cen, T, leaf) {
  const order = new Uint32Array(T);
  for (let t = 0; t < T; t++) order[t] = t;
  const maxNodes = Math.max(1, 2 * Math.ceil(T / leaf) * 2);
  let box = new Float32Array(maxNodes * 6), first = new Int32Array(maxNodes), cnt = new Int32Array(maxNodes);
  let nodes = 1;
  // Top-down median split. The centroid bounds are not rescanned per node: the parent's, clipped at the median
  // (conservative, only used to pick the split axis); the centroids are kept in a copy permuted with `order` so
  // the partition reads memory in sequence. Exact boxes: at the leaves, then unions bottom-up.
  rangeBounds(order, src, cen, 0, T, RB);
  const cenP = cen.slice();
  const work = [0, 0, T, RB[6], RB[7], RB[8], RB[9], RB[10], RB[11]];
  while (work.length) {
    const c5 = work.pop(), c4 = work.pop(), c3 = work.pop(), c2 = work.pop(), c1 = work.pop(), c0 = work.pop();
    const end = work.pop(), start = work.pop(), node = work.pop();
    const n = end - start;
    if (n <= leaf) {
      first[node] = start; cnt[node] = n;
      rangeBounds(order, src, cen, start, end, RB);
      for (let k = 0; k < 6; k++) box[node * 6 + k] = RB[k];
      continue;
    }
    const ex = c3 - c0, ey = c4 - c1, ez = c5 - c2;
    const axis = ex >= ey && ex >= ez ? 0 : ey >= ez ? 1 : 2;
    const mid = (start + end) >> 1;
    quickselect(order, cenP, axis, start, end - 1, mid);
    const pv = cenP[mid * 3 + axis];
    if (nodes + 2 > cnt.length) {           // grow (rare: degenerate splits)
      const nb = new Float32Array(box.length * 2); nb.set(box); box = nb;
      const nf = new Int32Array(first.length * 2); nf.set(first); first = nf;
      const nc = new Int32Array(cnt.length * 2); nc.set(cnt); cnt = nc;
    }
    const l = nodes; nodes += 2;
    first[node] = l; cnt[node] = 0;           // internal: children l and l + 1
    work.push(l, start, mid, c0, c1, c2, axis === 0 ? pv : c3, axis === 1 ? pv : c4, axis === 2 ? pv : c5);
    work.push(l + 1, mid, end, axis === 0 ? pv : c0, axis === 1 ? pv : c1, axis === 2 ? pv : c2, c3, c4, c5);
  }
  // internal boxes = union of the children (children always come after their parent)
  for (let node = nodes - 1; node >= 0; node--) {
    if (cnt[node] !== 0 || node >= nodes) continue;
    const a = first[node] * 6, b = a + 6, o = node * 6;
    box[o] = Math.min(box[a], box[b]); box[o + 1] = Math.min(box[a + 1], box[b + 1]); box[o + 2] = Math.min(box[a + 2], box[b + 2]);
    box[o + 3] = Math.max(box[a + 3], box[b + 3]); box[o + 4] = Math.max(box[a + 4], box[b + 4]); box[o + 5] = Math.max(box[a + 5], box[b + 5]);
  }
  return { order, nodes, box: box.slice(0, nodes * 6), first: first.slice(0, nodes), cnt: cnt.slice(0, nodes) };
}

function reorder(src, order, T) {
  // the triangles in leaf order, plus their unit normals (for the intersecting case and the ray hits)
  const tri = new Float32Array(T * 9), nrm = new Float32Array(T * 3);
  for (let i = 0; i < T; i++) {
    const o = order[i] * 9;
    for (let k = 0; k < 9; k++) tri[i * 9 + k] = src[o + k];
    const e1x = tri[i * 9 + 3] - tri[i * 9], e1y = tri[i * 9 + 4] - tri[i * 9 + 1], e1z = tri[i * 9 + 5] - tri[i * 9 + 2];
    const e2x = tri[i * 9 + 6] - tri[i * 9], e2y = tri[i * 9 + 7] - tri[i * 9 + 1], e2z = tri[i * 9 + 8] - tri[i * 9 + 2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nrm[i * 3] = nx / L; nrm[i * 3 + 1] = ny / L; nrm[i * 3 + 2] = nz / L;
  }
  return { tri, nrm };
}

const RB = new Float64Array(12);
/** Bounds of the triangles order[start..end) -> out[0..5], and of their centroids -> out[6..11]. */
function rangeBounds(order, src, cen, start, end, out) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  let cx0 = Infinity, cy0 = Infinity, cz0 = Infinity, cx1 = -Infinity, cy1 = -Infinity, cz1 = -Infinity;
  for (let i = start; i < end; i++) {
    const t = order[i], o = t * 9;
    for (let k = 0; k < 9; k += 3) {
      const x = src[o + k], y = src[o + k + 1], z = src[o + k + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const cx = cen[t * 3], cy = cen[t * 3 + 1], cz = cen[t * 3 + 2];
    if (cx < cx0) cx0 = cx; if (cx > cx1) cx1 = cx; if (cy < cy0) cy0 = cy; if (cy > cy1) cy1 = cy; if (cz < cz0) cz0 = cz; if (cz > cz1) cz1 = cz;
  }
  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = x1; out[4] = y1; out[5] = z1;
  out[6] = cx0; out[7] = cy0; out[8] = cz0; out[9] = cx1; out[10] = cy1; out[11] = cz1;
}

/**
 * Partially sort positions lo..hi by centroid[axis] so position k holds the k-th smallest. cenP is the centroid
 * array permuted like `order` (position i's centroid at cenP[i * 3]): both are swapped together.
 */
function quickselect(order, cenP, axis, lo, hi, k) {
  while (hi > lo) {
    const m = (lo + hi) >> 1;
    // median of three as pivot
    const a = cenP[lo * 3 + axis], b = cenP[m * 3 + axis], c = cenP[hi * 3 + axis];
    const pivot = a < b ? (b < c ? b : a < c ? c : a) : (a < c ? a : b < c ? c : b);
    let i = lo, j = hi;
    while (i <= j) {
      while (cenP[i * 3 + axis] < pivot) i++;
      while (cenP[j * 3 + axis] > pivot) j--;
      if (i <= j) {
        const t = order[i]; order[i] = order[j]; order[j] = t;
        const i3 = i * 3, j3 = j * 3;
        let s = cenP[i3]; cenP[i3] = cenP[j3]; cenP[j3] = s;
        s = cenP[i3 + 1]; cenP[i3 + 1] = cenP[j3 + 1]; cenP[j3 + 1] = s;
        s = cenP[i3 + 2]; cenP[i3 + 2] = cenP[j3 + 2]; cenP[j3 + 2] = s;
        i++; j--;
      }
    }
    if (k <= j) hi = j; else if (k >= i) lo = i; else return;
  }
}
