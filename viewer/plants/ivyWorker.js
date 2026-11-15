// THE CITY'S IVY, grown off the main thread: a tile's wall descriptors (data/plants/<T>.ivy.json, tools/plants/
// build_ivy.mjs) -> the leaf cards' and stem ribbons' instance columns, ready for viewer/plants/cityIvy.js's pools.
// The growth is viewer/foliage/ivyGrow.js (the Foliage Lab's rules), deterministic per wall.
//   in:  { id, walls, far }   out: { id, leaves: { M (16 / card), K (4: r0, r1, r2, r3 + 2 x fence) }, stems: { M }, n,
//                                   far: { W (15 / wall), atlas (R8, FAR_PX^2), ppm } }
// FAR (perf pass 3, ?ivyfar=0 off): every wall's leaves are also splatted into a coverage mask (one region of the tile's
// FAR_PX x FAR_PX atlas, shelf-packed, ~10 px a metre): past ~20 m the city draws ONE quad per wall with that mask
// instead of its cards (the cards lie 4-9 deep: one layer instead).
import { growIvyData } from "../foliage/ivyGrow.js";

self.onmessage = (e) => {
  const { id, walls, far } = e.data;
  const t0 = performance.now();
  const L = [], S = [];
  const FW = [];                                                // far: per wall with leaves [wall index, u0, v0, u1, v1, first leaf, n leaves]
  for (const w of walls) {
    const l0 = L.length / 11;
    // the city: one spray per 13 cm cell, 40 cm sprays (the lab: 2 per 6 cm, 24 cm: ~6x the overdraw on a covered wall)
    const g = growIvyData({ width: w.w, height: w.h }, { ...w.g, leafCell: 0.13, perCellMax: 1 });
    const [ox, oy, oz] = w.o, [tx, tz] = w.t, [nx, nz] = w.n, out0 = w.out || 0, fence = w.f === 2 ? 1 : 0;
    const P = (u, v, out) => [ox + tx * u + nx * out, oy + v, oz + tz * u + nz * out];
    for (const l of g.leaves) {
      const p = P(l.u, l.v, l.out + out0);
      L.push(p[0], p[1], p[2], nx, nz, tx, tz, l.r[0], l.r[1], l.r[2], l.r[3] + 2 * fence + (l.trail ? 4 : 0));
      if (far) FL.push(l.u, l.v, l.r[2]);
    }
    if (far && g.leaves.length) {
      let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
      for (const l of g.leaves) { u0 = Math.min(u0, l.u); v0 = Math.min(v0, l.v); u1 = Math.max(u1, l.u); v1 = Math.max(v1, l.v); }
      const R = 0.24;                                            // (a spray's reach round its anchor)
      FW.push([FW_WALL.length, u0 - R, v0 - R, u1 + R, v1 + R, FL.length / 3 - g.leaves.length, g.leaves.length]);
      FW_WALL.push(w);
    }
    void l0;
    for (const b of g.branches) {
      const pts = b.pts, n = pts.length;
      if (b.w < 0.0065 && !b.trail) continue;                 // the thinnest twigs: under the leaves anyway
      for (let k = 0; k + 1 < n; k += 4) {
        const a = pts[k], c = pts[Math.min(n - 1, k + 4)], wd = b.w * (1 - 0.5 * k / n);
        const off = (b.trail ? 0.012 + 0.05 * k / n : 0.008) + out0;
        const A = P(a[0], a[1], off), C = P(c[0], c[1], off);
        S.push(A[0], A[1], A[2], C[0], C[1], C[2], nx, nz, wd);
      }
    }
  }
  const farOut = far ? bakeFar(FW, FW_WALL, FL, far) : null;
  FL.length = 0; FW_WALL.length = 0;
  const nl = L.length / 11, ns = S.length / 9;
  const LM = new Float32Array(nl * 16), LK = new Float32Array(nl * 4), SM = new Float32Array(ns * 16);
  for (let i = 0; i < nl; i++) {
    const o = i * 11, k = i * 16;
    // col0 = the wall's normal (the card geometry's normal is +x), col1 = up, col2 = along the wall, col3 = the spot
    LM[k] = L[o + 3]; LM[k + 2] = L[o + 4]; LM[k + 5] = 1; LM[k + 8] = L[o + 5]; LM[k + 10] = L[o + 6];
    LM[k + 12] = L[o]; LM[k + 13] = L[o + 1]; LM[k + 14] = L[o + 2]; LM[k + 15] = 1;
    LK[i * 4] = L[o + 7]; LK[i * 4 + 1] = L[o + 8]; LK[i * 4 + 2] = L[o + 9]; LK[i * 4 + 3] = L[o + 10];
  }
  for (let i = 0; i < ns; i++) {
    const o = i * 9, k = i * 16;
    const dx = S[o + 3] - S[o], dy = S[o + 4] - S[o + 1], dz = S[o + 5] - S[o + 2], nx = S[o + 6], nz = S[o + 7], w = S[o + 8];
    // width direction = normal x along (in the wall plane), scaled by the stem's width
    let wx = -nz * dy, wy = nz * dx - nx * dz, wz = nx * dy; const l = Math.hypot(wx, wy, wz) || 1;
    wx *= w / l; wy *= w / l; wz *= w / l;
    SM[k] = dx; SM[k + 1] = dy; SM[k + 2] = dz; SM[k + 4] = wx; SM[k + 5] = wy; SM[k + 6] = wz; SM[k + 8] = nx; SM[k + 10] = nz;
    SM[k + 12] = S[o]; SM[k + 13] = S[o + 1]; SM[k + 14] = S[o + 2]; SM[k + 15] = 1;
  }
  const tr = [LM.buffer, LK.buffer, SM.buffer];
  if (farOut) tr.push(farOut.W.buffer, farOut.atlas.buffer);
  self.postMessage({ id, leaves: { M: LM, K: LK }, stems: { M: SM }, far: farOut, n: { walls: walls.length, leaves: nl, stems: ns }, ms: performance.now() - t0 }, tr);
};

const FL = [], FW_WALL = [];
/** the far LOD's coverage masks: walls shelf-packed into one size x size R8 region at a common density (px / m: as
 *  much as fits, 3..10); each leaf a soft spray-sized disc (the card's opaque part: ~0.26 x 0.3 m, 58 % covered, tilted
 *  ~0.8), coverage accumulated as 1 - prod(1 - a). Out: W per wall (15 floats: origin x y z, t x z, n x z, u0 v0 w h (m),
 *  atlas px x0 y0 x1 y1) */
function bakeFar(FW, walls, FLs, { size = 512 } = {}) {
  if (!FW.length) return { W: new Float32Array(0), atlas: new Uint8Array(size * size), ppm: 0, n: 0 };
  let area = 0;
  for (const f of FW) area += (f[3] - f[1]) * (f[4] - f[2]);
  let ppm = Math.min(10, Math.max(3, Math.sqrt((0.72 * size * size) / area)));
  // shelf packing (tallest first); shrink the density until everything fits
  const order = FW.map((f, i) => i).sort((a, b) => (FW[b][4] - FW[b][2]) - (FW[a][4] - FW[a][2]));
  let place = null;
  for (let tries = 0; tries < 12 && !place; tries++, ppm *= 0.9) {
    place = new Array(FW.length);
    let x = 0, y = 0, rowH = 0;
    for (const i of order) {
      const f = FW[i], w = Math.ceil((f[3] - f[1]) * ppm) + 2, h = Math.ceil((f[4] - f[2]) * ppm) + 2;
      if (w > size) { place = null; break; }
      if (x + w > size) { x = 0; y += rowH; rowH = 0; }
      if (y + h > size) { place = null; break; }
      place[i] = [x, y, w, h]; x += w; rowH = Math.max(rowH, h);
    }
  }
  if (!place) return { W: new Float32Array(0), atlas: new Uint8Array(size * size), ppm: 0, n: 0 };
  ppm /= 0.9;                                                    // (the loop shrank it once more after the fit)
  const acc = new Float32Array(size * size).fill(1);             // prod(1 - a)
  const W = new Float32Array(FW.length * 15);
  FW.forEach((f, i) => {
    const w = walls[f[0]], [px, py, pw, ph] = place[i], u0 = f[1], v0 = f[2];
    for (let k = f[5]; k < f[5] + f[6]; k++) {
      const lu = FLs[k * 3], lv = FLs[k * 3 + 1], sz = 0.75 + 0.5 * FLs[k * 3 + 2];
      const rx = 0.13 * sz * ppm, ry = 0.15 * sz * 0.8 * ppm;
      const cx = px + 1 + (lu - u0) * ppm, cy = py + 1 + (lv - v0) * ppm;
      for (let y = Math.max(py, Math.floor(cy - ry)); y <= Math.min(py + ph - 1, Math.ceil(cy + ry)); y++)
        for (let x = Math.max(px, Math.floor(cx - rx)); x <= Math.min(px + pw - 1, Math.ceil(cx + rx)); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r2 = dx * dx + dy * dy;
          if (r2 >= 1) continue;
          const a = 0.62 * (1 - r2 * r2);
          acc[y * size + x] *= 1 - a;
        }
    }
    const o = i * 15, out0 = (w.out || 0) + 0.05;
    W.set([w.o[0] + w.n[0] * out0, w.o[1], w.o[2] + w.n[1] * out0, w.t[0], w.t[1], w.n[0], w.n[1], u0, v0, (pw - 2) / ppm, (ph - 2) / ppm, px + 1, py + 1, px + pw - 1, py + ph - 1], o);
  });
  const atlas = new Uint8Array(size * size);
  for (let i = 0; i < atlas.length; i++) atlas[i] = Math.round((1 - acc[i]) * 255);
  return { W, atlas, ppm, n: FW.length };
}
