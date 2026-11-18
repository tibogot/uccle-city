// CENSUS mesh helpers (claude/census 2026-11-18): shared by openMeshes.mjs (class A) and zfight.mjs (class G).
//   buildTile(T)        the tile worker's own build in node (viewer/tileData.js buildTileData, as colliderAudit.mjs)
//   soupOf(...)         triangle soups (9 floats a triangle, world) from the tile's drawn meshes / a GLB's parts
//   Bvh                 a small BVH for first-hit rays (front / back face)
//   dsmOf(soup, ...)    a top-down max-height raster of a soup (the "is there building above this ray" test)
//   coplanarPairs(...)  same-facing faces in one plane (within EPS) overlapping more than MIN m2: z-fight
//   loopsOf(...)        boundary-edge loops of a welded soup (open-edge census)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);

let shimmed = false;
function shim() {
  if (shimmed) return; shimmed = true;
  globalThis.location ??= { search: "" };
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const url = new URL(String(u));
    if (url.protocol !== "file:") return nodeFetch(u, o);
    try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
  };
  if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
}

/** the tile as the city builds it (default entry of tools/boot3/entries.json: kit on, heroes' solids hidden) + its buildings.json */
export async function buildTile(T, over = {}) {
  shim();
  const { buildTileData } = await imp("viewer/tileData.js");
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
  const entry = { ...entries.find((e) => !e.lite).entry, ...manifest.tiles.find((t) => t.name === T), cache: false, ...over };
  const realLog = console.log; console.log = () => {};
  let d;
  try { d = await buildTileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href); } finally { console.log = realLog; }
  const bDoc = JSON.parse(readFileSync(join(ROOT, "data/tiles", T, "buildings.json"), "utf8"));
  const hide = new Set(entry.hide || []);
  bDoc.buildings = bDoc.buildings.filter((b) => !hide.has(b.attrs?.BU_ID) && !hide.has(b.id));
  return { d, bDoc, entry };
}

export const allBuiltTiles = () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  return manifest.tiles.filter((t) => t.status === "built" || t.status === undefined).map((t) => t.name).filter((t) => existsSync(join(ROOT, "data/tiles", t, "buildings.bin")));
};

/** footprint lookup: building index at (x, z) (inside its footprint, else within `near` m of it), -1 none */
export function footprintIndex(buildings) {
  const C = 16, grid = new Map(), key = (i, j) => i * 100003 + j;
  buildings.forEach((b, bi) => {
    const r = b.footprint[0]; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    for (let i = Math.floor((x0 - 2) / C); i <= Math.floor((x1 + 2) / C); i++) for (let j = Math.floor((z0 - 2) / C); j <= Math.floor((z1 + 2) / C); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(bi); }
  });
  const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const segD = (x, z, r) => { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
  const at = (x, z, near = 0) => {
    const list = grid.get(key(Math.floor(x / C), Math.floor(z / C))) || [];
    for (const bi of list) if (pip(x, z, buildings[bi].footprint[0])) return bi;
    if (near > 0) { let best = -1, bd = near; for (const bi of list) { const dd = segD(x, z, buildings[bi].footprint[0]); if (dd < bd) { bd = dd; best = bi; } } return best; }
    return -1;
  };
  return { at, pip };
}

/** concat Float32Array soups (9 floats a triangle) and remember each source's triangle range */
export function concatSoups(list) {
  let n = 0; for (const s of list) n += s.pos?.length || 0;
  const pos = new Float32Array(n), src = new Uint8Array(n / 9), names = [];
  let o = 0;
  list.forEach((s, k) => { if (!s.pos?.length) { names.push(s.name); return; } pos.set(s.pos, o); src.fill(k, o / 9, (o + s.pos.length) / 9); o += s.pos.length; names.push(s.name); });
  return { pos, src, names };
}

/** a GLB's parts (tools/mesh_audit/glb.mjs readGlb) of the given nodes -> soup (world = the file's scene frame) */
export function soupFromParts(parts, keep) {
  const chunks = [];
  for (const p of parts) {
    if (!keep(p.node)) continue;
    const I = p.index, P = p.positions, a = new Float32Array(I.length * 3);
    for (let k = 0; k < I.length; k++) { a[k * 3] = P[I[k] * 3]; a[k * 3 + 1] = P[I[k] * 3 + 1]; a[k * 3 + 2] = P[I[k] * 3 + 2]; }
    chunks.push(a);
  }
  let n = 0; for (const c of chunks) n += c.length;
  const out = new Float32Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// ------------------------------------------------------------------------------------------------ BVH (first hit)
export class Bvh {
  constructor(pos) {
    const N = pos.length / 9; this.pos = pos; this.N = N;
    const cx = new Float32Array(N), cy = new Float32Array(N), cz = new Float32Array(N);
    const bmin = new Float32Array(N * 3), bmax = new Float32Array(N * 3);
    for (let t = 0; t < N; t++) {
      const b = t * 9;
      for (let a = 0; a < 3; a++) {
        const v0 = pos[b + a], v1 = pos[b + 3 + a], v2 = pos[b + 6 + a];
        bmin[t * 3 + a] = Math.min(v0, v1, v2); bmax[t * 3 + a] = Math.max(v0, v1, v2);
      }
      cx[t] = (bmin[t * 3] + bmax[t * 3]) / 2; cy[t] = (bmin[t * 3 + 1] + bmax[t * 3 + 1]) / 2; cz[t] = (bmin[t * 3 + 2] + bmax[t * 3 + 2]) / 2;
    }
    const idx = new Uint32Array(N); for (let i = 0; i < N; i++) idx[i] = i;
    const nodes = []; // [min3, max3, left, right, start, count]
    const C = [cx, cy, cz];
    const build = (s, e) => {
      const id = nodes.length; nodes.push(null);
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = s; i < e; i++) { const t = idx[i]; for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], bmin[t * 3 + a]); mx[a] = Math.max(mx[a], bmax[t * 3 + a]); } }
      if (e - s <= 6) { nodes[id] = [mn, mx, -1, -1, s, e - s]; return id; }
      let ax = 0; const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]; if (ext[1] > ext[ax]) ax = 1; if (ext[2] > ext[ax]) ax = 2;
      // median split on centroids (nth element by sort of the slice)
      const sl = Array.from(idx.subarray(s, e)); const ca = C[ax]; sl.sort((p, q) => ca[p] - ca[q]); idx.set(sl, s);
      const m = (s + e) >> 1;
      const l = build(s, m), r = build(m, e);
      nodes[id] = [mn, mx, l, r, 0, 0]; return id;
    };
    if (N) build(0, N);
    const M = nodes.length; this.nb = new Float32Array(M * 6); this.nc = new Int32Array(M * 4);
    nodes.forEach((n, i) => { this.nb.set(n[0], i * 6); this.nb.set(n[1], i * 6 + 3); this.nc.set([n[2], n[3], n[4], n[5]], i * 4); });
    this.idx = idx; this.M = M;
    this.stack = new Int32Array(256);
  }
  /** first hit along o + t d (t in (tmin, tmax)): { t, tri, back } or null. back: the face is seen from behind (d . n > 0) */
  hit(ox, oy, oz, dx, dy, dz, tmax = 1e9, tmin = 1e-4) {
    if (!this.N) return null;
    const P = this.pos, nb = this.nb, nc = this.nc, st = this.stack;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    let sp = 0, best = tmax, bt = -1, bback = false;
    st[sp++] = 0;
    while (sp) {
      const n = st[--sp], b = n * 6;
      let t0 = (nb[b] - ox) * ix, t1 = (nb[b + 3] - ox) * ix; if (t0 > t1) { const q = t0; t0 = t1; t1 = q; }
      let u0 = (nb[b + 1] - oy) * iy, u1 = (nb[b + 4] - oy) * iy; if (u0 > u1) { const q = u0; u0 = u1; u1 = q; }
      if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
      let w0 = (nb[b + 2] - oz) * iz, w1 = (nb[b + 5] - oz) * iz; if (w0 > w1) { const q = w0; w0 = w1; w1 = q; }
      if (w0 > t0) t0 = w0; if (w1 < t1) t1 = w1;
      if (!(t1 >= t0) || t1 < tmin || t0 > best) continue;
      const c = n * 4;
      if (nc[c] < 0) {
        for (let i = nc[c + 2], e = i + nc[c + 3]; i < e; i++) {
          const t = this.idx[i], p = t * 9;
          const e1x = P[p + 3] - P[p], e1y = P[p + 4] - P[p + 1], e1z = P[p + 5] - P[p + 2];
          const e2x = P[p + 6] - P[p], e2y = P[p + 7] - P[p + 1], e2z = P[p + 8] - P[p + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-12) continue;
          const inv = 1 / det, sx = ox - P[p], sy = oy - P[p + 1], sz = oz - P[p + 2];
          const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
          const v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt > tmin && tt < best) { best = tt; bt = t; bback = det < 0; }   // det < 0: d . (e1 x e2) > 0 = seen from behind
        }
      } else { st[sp++] = nc[c]; st[sp++] = nc[c + 1]; }
    }
    if (bt < 0) return null;
    // |cos| between the ray and the face: a grazing hit (< 0.1) is not judged front / back
    const p = bt * 9, e1x = P[p + 3] - P[p], e1y = P[p + 4] - P[p + 1], e1z = P[p + 5] - P[p + 2], e2x = P[p + 6] - P[p], e2y = P[p + 7] - P[p + 1], e2z = P[p + 8] - P[p + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, nl = Math.hypot(nx, ny, nz) || 1;
    const cos = Math.abs(nx * dx + ny * dy + nz * dz) / nl / (Math.hypot(dx, dy, dz) || 1);
    return { t: best, tri: bt, back: bback && cos > 0.1, cos };
  }
}

/** top-down max height of a soup on a cell grid (NaN = nothing). Triangles rasterised by sampling (cell/2 steps). */
export function dsmOf(pos, x0, z0, x1, z1, cell = 0.5) {
  const NX = Math.ceil((x1 - x0) / cell), NZ = Math.ceil((z1 - z0) / cell), H = new Float32Array(NX * NZ).fill(NaN);
  const put = (x, z, y) => { const i = Math.floor((x - x0) / cell), k = Math.floor((z - z0) / cell); if (i < 0 || k < 0 || i >= NX || k >= NZ) return; const q = k * NX + i; if (!(H[q] >= y)) H[q] = y; };
  for (let p = 0; p < pos.length; p += 9) {
    const ax = pos[p], ay = pos[p + 1], az = pos[p + 2], bx = pos[p + 3], by = pos[p + 4], bz = pos[p + 5], cx = pos[p + 6], cy = pos[p + 7], cz = pos[p + 8];
    const L = Math.max(Math.hypot(bx - ax, bz - az), Math.hypot(cx - ax, cz - az), Math.hypot(cx - bx, cz - bz));
    const n = Math.max(1, Math.ceil(L / (cell * 0.5)));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v;
      put(ax * w + bx * u + cx * v, az * w + bz * u + cz * v, ay * w + by * u + cy * v);
    }
  }
  const at = (x, z) => { const i = Math.floor((x - x0) / cell), k = Math.floor((z - z0) / cell); return i < 0 || k < 0 || i >= NX || k >= NZ ? NaN : H[k * NX + i]; };
  /** deep under the roof: (x, z) and the points `m` m round it all have drawn building over height h + 0.5 */
  const deep = (x, z, h, m = 1.0) => at(x, z) > h + 0.5 && at(x + m, z) > h + 0.5 && at(x - m, z) > h + 0.5 && at(x, z + m) > h + 0.5 && at(x, z - m) > h + 0.5;
  return { H, NX, NZ, x0, z0, cell, at, deep };
}

// ------------------------------------------------------------------------------------------------ coplanar overlaps
const clip2 = (poly, ax, ay, bx, by) => {     // keep the left side of a -> b (ccw polygon clipping)
  const out = [], ex = bx - ax, ey = by - ay, side = (p) => ex * (p[1] - ay) - ey * (p[0] - ax);
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], sp = side(P), sq = side(Q);
    if (sp >= 0) out.push(P);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
};
const area2 = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1]; return a / 2; };

/**
 * same-facing faces in one plane that overlap: they z-fight.
 * pos: soup; group(t) -> a key: pairs inside one key AND one connected surface are skipped only when they share an edge (overlap ~0 anyway);
 * opts: eps (m, plane separation over the overlap), cosMin (normals), minArea (m2 overlap), minTri (m2), cell (m)
 * -> [{ a, b, area, x, y, z }]
 */
export function coplanarPairs(pos, { eps = 0.002, cosMin = Math.cos(3 * Math.PI / 180), minArea = 0.01, minTri = 0.004, cell = 1.5, skip = null } = {}) {
  const N = pos.length / 9, nrm = new Float32Array(N * 3), dd = new Float32Array(N), ok = new Uint8Array(N);
  for (let t = 0; t < N; t++) {
    const p = t * 9, e1 = [pos[p + 3] - pos[p], pos[p + 4] - pos[p + 1], pos[p + 5] - pos[p + 2]], e2 = [pos[p + 6] - pos[p], pos[p + 7] - pos[p + 1], pos[p + 8] - pos[p + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], L = Math.hypot(nx, ny, nz);
    if (L / 2 < minTri) continue;
    ok[t] = 1; nrm[t * 3] = nx / L; nrm[t * 3 + 1] = ny / L; nrm[t * 3 + 2] = nz / L;
    dd[t] = (nx * pos[p] + ny * pos[p + 1] + nz * pos[p + 2]) / L;
  }
  // spatial hash on bboxes (3D cells); each triangle into every cell its bbox covers (capped)
  const grid = new Map();
  const K = (i, j, k) => (i + 4096) * 67108864 + (j + 4096) * 8192 + (k + 4096);
  for (let t = 0; t < N; t++) {
    if (!ok[t]) continue;
    const p = t * 9;
    const i0 = Math.floor(Math.min(pos[p], pos[p + 3], pos[p + 6]) / cell), i1 = Math.floor(Math.max(pos[p], pos[p + 3], pos[p + 6]) / cell);
    const j0 = Math.floor(Math.min(pos[p + 1], pos[p + 4], pos[p + 7]) / cell), j1 = Math.floor(Math.max(pos[p + 1], pos[p + 4], pos[p + 7]) / cell);
    const k0 = Math.floor(Math.min(pos[p + 2], pos[p + 5], pos[p + 8]) / cell), k1 = Math.floor(Math.max(pos[p + 2], pos[p + 5], pos[p + 8]) / cell);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 4000) continue;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) { const key = K(i, j, k); let a = grid.get(key); if (!a) grid.set(key, (a = [])); a.push(t); }
  }
  const seen = new Set(), out = [];
  for (const list of grid.values()) {
    if (list.length < 2) continue;
    for (let x = 0; x < list.length; x++) {
      const a = list[x];
      for (let y = x + 1; y < list.length; y++) {
        const b = list[y];
        const c = nrm[a * 3] * nrm[b * 3] + nrm[a * 3 + 1] * nrm[b * 3 + 1] + nrm[a * 3 + 2] * nrm[b * 3 + 2];
        if (c < cosMin) continue;
        // b's corners within eps (+ slack) of a's plane: a quick reject before the clip
        const pb = b * 9; let far = 0;
        for (let q = 0; q < 3; q++) far = Math.max(far, Math.abs(nrm[a * 3] * pos[pb + q * 3] + nrm[a * 3 + 1] * pos[pb + q * 3 + 1] + nrm[a * 3 + 2] * pos[pb + q * 3 + 2] - dd[a]));
        if (far > eps * 4 + 0.02) continue;
        const key = a < b ? a * 4294967296 + b : b * 4294967296 + a;
        if (seen.has(key)) continue; seen.add(key);
        if (skip && skip(a, b)) continue;
        const r = overlap(pos, a, b, nrm, dd);
        if (!r || r.area < minArea || r.sep > eps) continue;
        out.push({ a, b, area: r.area, sep: r.sep, x: r.c[0], y: r.c[1], z: r.c[2] });
      }
    }
  }
  return out;
}
/** overlap of b projected on a's plane (convex clip) + the separation measured over the overlap */
function overlap(pos, a, b, nrm, dd) {
  const n = [nrm[a * 3], nrm[a * 3 + 1], nrm[a * 3 + 2]];
  const u = Math.abs(n[1]) < 0.9 ? norm(cross([0, 1, 0], n)) : norm(cross([1, 0, 0], n)), v = cross(n, u);
  const P = (t, q) => [pos[t * 9 + q * 3], pos[t * 9 + q * 3 + 1], pos[t * 9 + q * 3 + 2]];
  const to2 = (p) => [p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * v[0] + p[1] * v[1] + p[2] * v[2]];
  let A = [0, 1, 2].map((q) => to2(P(a, q))), B = [0, 1, 2].map((q) => to2(P(b, q)));
  if (area2(A) < 0) A.reverse(); if (area2(B) < 0) B.reverse();
  let poly = B;
  for (let i = 0; i < 3 && poly.length; i++) poly = clip2(poly, A[i][0], A[i][1], A[(i + 1) % 3][0], A[(i + 1) % 3][1]);
  if (poly.length < 3) return null;
  const ar = area2(poly); if (ar <= 0) return null;
  // separation: b's plane height over a's plane at the overlap's points
  const nb = [nrm[b * 3], nrm[b * 3 + 1], nrm[b * 3 + 2]], db = dd[b];
  let sep = 0, cx = 0, cy = 0;
  for (const [s, t] of poly) {
    const p0 = [u[0] * s + v[0] * t + n[0] * dd[a], u[1] * s + v[1] * t + n[1] * dd[a], u[2] * s + v[2] * t + n[2] * dd[a]];
    // point on b's plane along n from p0: p0 + n h, nb . (p0 + n h) = db
    const den = nb[0] * n[0] + nb[1] * n[1] + nb[2] * n[2];
    const h = (db - (nb[0] * p0[0] + nb[1] * p0[1] + nb[2] * p0[2])) / den;
    sep = Math.max(sep, Math.abs(h)); cx += s; cy += t;
  }
  cx /= poly.length; cy /= poly.length;
  const c = [u[0] * cx + v[0] * cy + n[0] * dd[a], u[1] * cx + v[1] * cy + n[1] * dd[a], u[2] * cx + v[2] * cy + n[2] * dd[a]];
  return { area: ar, sep, c };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// ------------------------------------------------------------------------------------------------ open-edge loops
/** boundary edges (used by one triangle) of a soup welded at `weld` m, chained into loops: [{ n, perim, x, y, z }] */
export function loopsOf(pos, weld = 0.001) {
  const map = new Map(), vid = new Int32Array(pos.length / 3), vp = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const k = `${Math.round(pos[i * 3] / weld)},${Math.round(pos[i * 3 + 1] / weld)},${Math.round(pos[i * 3 + 2] / weld)}`;
    let id = map.get(k); if (id === undefined) { id = vp.length / 3; map.set(k, id); vp.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
    vid[i] = id;
  }
  const E = new Map();
  for (let t = 0; t < pos.length / 9; t++) for (let c = 0; c < 3; c++) {
    const a = vid[t * 3 + c], b = vid[t * 3 + (c + 1) % 3]; if (a === b) continue;
    const k = a < b ? `${a},${b}` : `${b},${a}`; E.set(k, (E.get(k) || 0) + 1);
  }
  const adj = new Map();
  for (const [k, n] of E) if (n === 1) { const [a, b] = k.split(",").map(Number); (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); }
  const used = new Set(), loops = [];
  const V = (i) => [vp[i * 3], vp[i * 3 + 1], vp[i * 3 + 2]];
  for (const s of adj.keys()) {
    for (const nb0 of adj.get(s)) {
      const ek = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
      if (used.has(ek(s, nb0))) continue;
      let prev = s, cur = nb0, perim = 0, n = 0, cx = 0, cy = 0, cz = 0;
      used.add(ek(s, nb0));
      const pts = [V(s)];
      for (let guard = 0; guard < 100000; guard++) {
        const a = V(prev), b = V(cur); perim += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); n++; cx += b[0]; cy += b[1]; cz += b[2]; pts.push(b);
        if (cur === s) break;
        const nx = (adj.get(cur) || []).find((w) => !used.has(ek(cur, w)));
        if (nx === undefined) break;
        used.add(ek(cur, nx)); prev = cur; cur = nx;
      }
      // area (Newell)
      let ax = 0, ay = 0, az = 0;
      for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; ax += (p[1] - q[1]) * (p[2] + q[2]); ay += (p[2] - q[2]) * (p[0] + q[0]); az += (p[0] - q[0]) * (p[1] + q[1]); }
      loops.push({ n, perim, area: Math.hypot(ax, ay, az) / 2, closed: cur === s, x: cx / n, y: cy / n, z: cz / n });
    }
  }
  return loops;
}

/** the DTM (un-carved) at (x, z) from the tile holding it (lazy); NaN outside the city */
const hmCache = new Map(); let manifestC = null;
export async function groundAt() {
  const { Heightmap } = await imp("viewer/heightmap.js");
  manifestC ??= JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  return (x, z) => {
    const t = manifestC.tiles.find((q) => x >= q.bounds.x[0] && x < q.bounds.x[1] && z >= q.bounds.z[0] && z < q.bounds.z[1]);
    if (!t || !existsSync(join(ROOT, "data/tiles", t.name, "terrain.u16"))) return NaN;
    if (!hmCache.has(t.name)) { const hdr = JSON.parse(readFileSync(join(ROOT, "data/tiles", t.name, "terrain.json"), "utf8")), buf = readFileSync(join(ROOT, "data/tiles", t.name, "terrain.u16")); hmCache.set(t.name, new Heightmap(hdr, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))); }
    return hmCache.get(t.name).ground(x, z);
  };
}

/** "street name" of a point: the nearest UrbIS address number's street in data/streetlife/<T>.json (within 40 m) */
const slCache = new Map();
export function streetAt(T, x, z) {
  if (!slCache.has(T)) { const f = join(ROOT, "data/streetlife", `${T}.json`); slCache.set(T, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).numbers || [] : []); }
  let best = null, bd = 40;
  for (const nb of slCache.get(T)) { const d = Math.hypot(nb.x - x, nb.z - z); if (d < bd) { bd = d; best = nb; } }
  return best ? `${best.fr} ${best.n}` : "";
}
export const tileOf = (x, z) => {
  const m = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  return m.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name || "?";
};
