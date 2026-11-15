// ?night=1 round 3, step 7: THE GROUND LIGHT MAP OF ONE TILE, baked off the main thread (nightMap.js has the layout).
// The cluster loop's own formulas (nightLighting.js: lantern / aperture profiles, 1 / (d^2 + r^2) x Frostbite's window,
// Lambert on a floor), evaluated per texel at the ground height (a coarse grid of the tile's terrain + streets).
// Input (one message per tile): { id, x0, z0, res, span, margin, emax, ground: { g0x, g0z, step, n, y: Float32Array },
//   lamps: Float32Array (x y z), windows: Float32Array (stride 10, litHash.js), shops: Float32Array (stride 11,
//   shopLayout.js night.lights: kind 0 window / 1 sign), p: the intensities (nightParams) }
// Output: { id, data: Uint16Array RES x RES x 4 (half floats, E clamped to emax), ms, n }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LAMP = [1.0, 0.78, 0.52];
// float -> half (round to nearest; values here are >= 0 and <= emax)
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
function toHalf(v) {
  f32[0] = v; const x = u32[0], e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
  if (e <= 0) { if (e < -10) return 0; const mm = (m | 0x800000) >> (1 - e); return (mm + 0x1000) >> 13; }
  if (e >= 31) return 0x7bff;
  return ((e << 10) | (m >> 13)) + ((m >> 12) & 1);
}

self.onmessage = (ev) => {
  const q = ev.data, t0 = performance.now();
  const { res: N, span, margin, emax, p } = q;
  const T = span / N, ox = q.x0 - margin, oz = q.z0 - margin;
  const acc = new Float32Array(N * N * 3);
  // the ground height under texel centres: bilinear in the coarse grid
  const G = q.ground, gy = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    const z = oz + (j + 0.5) * T, fz = Math.min(G.n - 1.001, Math.max(0, (z - G.g0z) / G.step)), jz = Math.floor(fz), wz = fz - jz;
    for (let i = 0; i < N; i++) {
      const x = ox + (i + 0.5) * T, fx = Math.min(G.n - 1.001, Math.max(0, (x - G.g0x) / G.step)), ix = Math.floor(fx), wx = fx - ix;
      const a = G.y[jz * G.n + ix], b = G.y[jz * G.n + ix + 1], c = G.y[(jz + 1) * G.n + ix], d = G.y[(jz + 1) * G.n + ix + 1];
      gy[j * N + i] = (a * (1 - wx) + b * wx) * (1 - wz) + (c * (1 - wx) + d * wx) * wz;
    }
  }
  // one light: position, range R, source radius r, colour (x intensity), profile k(fx, fy, fz) of light -> ground (unit)
  const splat = (lx, ly, lz, R, r, cr, cg, cb, prof) => {
    const i0 = Math.max(0, Math.floor((lx - R - ox) / T)), i1 = Math.min(N - 1, Math.ceil((lx + R - ox) / T));
    const j0 = Math.max(0, Math.floor((lz - R - oz) / T)), j1 = Math.min(N - 1, Math.ceil((lz + R - oz) / T));
    const R2 = R * R, r2 = r * r;
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * T;
      for (let i = i0; i <= i1; i++) {
        const x = ox + (i + 0.5) * T, y = gy[j * N + i];
        const dx = lx - x, dy = ly - y, dz = lz - z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= R2 || dy <= 0.02) continue;
        const d = Math.sqrt(d2), cosN = dy / d;                              // Lambert on a floor (normal up)
        const k = prof ? prof(-dx / d, -dy / d, -dz / d) : 1;
        if (k <= 0) continue;
        const win = Math.max(0, 1 - (d2 / R2) ** 2) ** 2;
        const e = k * cosN * win / (d2 + r2), o = (j * N + i) * 3;
        acc[o] += cr * e; acc[o + 1] += cg * e; acc[o + 2] += cb * e;
      }
    }
  };
  // street lamps: LANTERN (up share, batwing), omni
  const L = q.lamps, I = p.lampI;
  const lantern = (fx, fy) => { const c = -fy, base = p.lampUp + (1 - p.lampUp) * sstep(-0.35, 0.45, c); return base * (1 + p.lampBatwing * Math.exp(-(((c - 0.42) / 0.2) ** 2))); };
  for (let o = 0; o + 3 <= L.length; o += 3) splat(L[o], L[o + 1], L[o + 2], p.lampRange, 0.22, LAMP[0] * I, LAMP[1] * I, LAMP[2] * I, lantern);
  // an opening (lit window, shop front): the APERTURE light `depth` m behind it, its beam along the outward normal
  const cone = Math.cos(1.25), pen = Math.cos(0.95);
  const aperture = (x, y, z, nx, nz, hw, hh, cr, cg, cb, depth, range, mullion) => {
    // the light's frame: axis = (nx, 0, nz), right = axis x up = (-nz, 0, nx), up' = right x axis = (0, 1, 0)
    const soft = Math.min(hw, hh) * 0.22;
    splat(x - nx * depth, y, z - nz * depth, range + depth, 0.35, cr, cg, cb, (fx, fy, fz) => {
      const cosA = fx * nx + fz * nz;
      const spot = sstep(cone, pen, cosA);
      if (spot <= 0) return 0;
      const t = depth / Math.max(cosA, 0.05);
      const px = Math.abs((fx * -nz + fz * nx) * t), sy = fy * t, py = Math.abs(sy);
      const box = (1 - sstep(hw - soft, hw + soft, px)) * (1 - sstep(hh - soft, hh + soft, py));
      const bar = Math.max(1 - sstep(0.02, 0.05, px), 1 - sstep(0.02, 0.05, Math.abs(sy - hh * 0.35)));
      return spot * box * (1 - bar * mullion);
    });
  };
  const W = q.windows;
  for (let o = 0; o + 10 <= W.length; o += 10) {
    const g = p.windowI;
    aperture(W[o], W[o + 1], W[o + 2], W[o + 3], W[o + 4], W[o + 5], W[o + 6], W[o + 7] * g, W[o + 8] * g, W[o + 9] * g, 1.2, p.windowRange, 0.8);
  }
  const S = q.shops;
  for (let o = 0; o + 11 <= S.length; o += 11) {
    if (S[o] === 0) { const g = p.shopI; aperture(S[o + 1], S[o + 2], S[o + 3], S[o + 4], S[o + 5], S[o + 6], S[o + 7], S[o + 8] * g, S[o + 9] * g, S[o + 10] * g, 2.0, p.shopRange, 0); }
    else { const g = p.signI; splat(S[o + 1], S[o + 2] - 0.1, S[o + 3], p.signRange, 0.4, S[o + 8] * g, S[o + 9] * g, S[o + 10] * g, null); }
  }
  // encode: half floats (RGBA16F; 8 bits banded the dim edges of the pools)
  const out = new Uint16Array(N * N * 4);
  for (let i = 0, n = N * N; i < n; i++) {
    out[i * 4] = toHalf(Math.min(emax, acc[i * 3])); out[i * 4 + 1] = toHalf(Math.min(emax, acc[i * 3 + 1])); out[i * 4 + 2] = toHalf(Math.min(emax, acc[i * 3 + 2])); out[i * 4 + 3] = 0x3c00;
  }
  self.postMessage({ id: q.id, data: out, ms: performance.now() - t0, n: L.length / 3 + W.length / 10 + S.length / 11 }, [out.buffer]);
};
