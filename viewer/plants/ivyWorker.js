// THE CITY'S IVY, grown off the main thread: a tile's wall descriptors (data/plants/<T>.ivy.json, tools/plants/
// build_ivy.mjs) -> the leaf cards' and stem ribbons' instance columns, ready for viewer/plants/cityIvy.js's pools.
// The growth is viewer/foliage/ivyGrow.js (the Foliage Lab's rules), deterministic per wall.
//   in:  { id, walls }        out: { id, leaves: { M (16 / card), K (4: r0, r1, r2, r3 + 2 x fence) }, stems: { M }, n }
import { growIvyData } from "../foliage/ivyGrow.js";

self.onmessage = (e) => {
  const { id, walls } = e.data;
  const t0 = performance.now();
  const L = [], S = [];
  for (const w of walls) {
    // the city: one spray per 13 cm cell, 40 cm sprays (the lab: 2 per 6 cm, 24 cm: ~6x the overdraw on a covered wall)
    const g = growIvyData({ width: w.w, height: w.h }, { ...w.g, leafCell: 0.13, perCellMax: 1 });
    const [ox, oy, oz] = w.o, [tx, tz] = w.t, [nx, nz] = w.n, out0 = w.out || 0, fence = w.f === 2 ? 1 : 0;
    const P = (u, v, out) => [ox + tx * u + nx * out, oy + v, oz + tz * u + nz * out];
    for (const l of g.leaves) {
      const p = P(l.u, l.v, l.out + out0);
      L.push(p[0], p[1], p[2], nx, nz, tx, tz, l.r[0], l.r[1], l.r[2], l.r[3] + 2 * fence + (l.trail ? 4 : 0));
    }
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
  self.postMessage({ id, leaves: { M: LM, K: LK }, stems: { M: SM }, n: { walls: walls.length, leaves: nl, stems: ns }, ms: performance.now() - t0 }, [LM.buffer, LK.buffer, SM.buffer]);
};
