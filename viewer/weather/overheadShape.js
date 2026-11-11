// THE OVERHEAD SHAPE PASS (pure JS: runs in a worker, overheadWorker.js; or on the main thread as a fallback).
// readback pixels (y + 1000, x - x0 + 1, z - z0 + 1, alpha) of the solid and canopy bakes -> the canonical grids:
//   H        topmost solid height per cell (m)          Hs   H smoothed across non-step neighbours (the snow layer's
//                                                            base: no 12.5 cm terraces on gentle curves, car roofs)
//   shelter  0..1 under a crown                           shape  snow depth multiplier   cliff  1 = cut the layer
//   eaves    [x, y, z, dx, dz, drop] icicle / drip sites: roof drop edges higher than 1.5 m over what is below
export const SHAPE = {
  cliff: 0.08,          // a step bigger than this (after the local slope) cuts the snow layer (kerbs are 0.13)
  taper: 0.38,          // rounded taper toward a drop edge (eaves, kerbs, car roofs)
  lip: 0.04,            // depth share left at the cut (the cut's staircase on diagonals stays nearly flat: no stair-steps)
  driftWidth: 0.9,      // drifts against walls / kerb faces
  driftGain: 0.45,      // +45 % at the wall foot
  shedFrom: 38, shedTo: 62,   // roof pitch (deg): full snow below shedFrom, none above shedTo
  shelter: 0.65,        // under a full crown, snow depth x (1 - shelter)
};

export function computeOverheadShape({ solidPx, canopyPx, roadPx = null, res, cell, origin }) {
  const N = res, S = SHAPE;
  const H = new Float32Array(N * N), Hs = new Float32Array(N * N), shelter = new Float32Array(N * N), shape = new Float32Array(N * N), cliff = new Uint8Array(N * N);
  const uOrigin = { value: { x: origin[0], y: origin[1] } };
  /** readback -> canonical grid, using each texel's own world x / z (G, B) */
  function toGrid(px, out, empty) {
    out.fill(NaN);
    for (let k = 0; k < res * res; k++) {
      if (px[k * 4 + 3] < 0.5) continue;
      const i = Math.floor((px[k * 4 + 1] - 1) / cell), j = Math.floor((px[k * 4 + 2] - 1) / cell);
      if (i < 0 || j < 0 || i >= res || j >= res) continue;
      const v = px[k * 4] - 1000;
      const o = j * res + i;
      if (!(out[o] >= v)) out[o] = v;            // the topmost when two texels land in one cell
    }
    // holes (no texel landed: rounding at cell borders; or nothing there): the neighbour's value, else `empty`
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const o = j * res + i;
      if (out[o] === out[o]) continue;
      const n = [i > 0 ? out[o - 1] : NaN, i < res - 1 ? out[o + 1] : NaN, j > 0 ? out[o - res] : NaN, j < res - 1 ? out[o + res] : NaN].filter((v) => v === v);
      if (n.length) out[o] = Math.max(...n); else if (pass === 1) out[o] = empty;
    }
  }
  function blur(a, r) {
    const t = new Float32Array(a.length);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const ii = i + d; if (ii >= 0 && ii < res) { s += a[j * res + ii]; n++; } } t[j * res + i] = s / n; }
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const jj = j + d; if (jj >= 0 && jj < res) { s += t[jj * res + i]; n++; } } a[j * res + i] = s / n; }
  }
  /** chamfer (3-4) distance transform of a seed mask, in cells */
  function distance(seed) {
    const D = new Float32Array(res * res);
    for (let k = 0; k < D.length; k++) D[k] = seed[k] ? 0 : 1e9;
    const a = 1, b = Math.SQRT2;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const o = j * res + i; let d = D[o];
      if (i > 0) d = Math.min(d, D[o - 1] + a);
      if (j > 0) { d = Math.min(d, D[o - res] + a); if (i > 0) d = Math.min(d, D[o - res - 1] + b); if (i < res - 1) d = Math.min(d, D[o - res + 1] + b); }
      D[o] = d;
    }
    for (let j = res - 1; j >= 0; j--) for (let i = res - 1; i >= 0; i--) {
      const o = j * res + i; let d = D[o];
      if (i < res - 1) d = Math.min(d, D[o + 1] + a);
      if (j < res - 1) { d = Math.min(d, D[o + res] + a); if (i < res - 1) d = Math.min(d, D[o + res + 1] + b); if (i > 0) d = Math.min(d, D[o + res - 1] + b); }
      D[o] = d;
    }
    return D;
  }
  function computeShape() {
    const S = SHAPE, N = res;
    const edge = new Uint8Array(N * N), wall = new Uint8Array(N * N), slope = new Float32Array(N * N);
    const at = (i, j) => H[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i, h = H[o];
      // local slope from the continuous neighbours (a step is not a slope): one-sided where the other side jumps
      const l = at(i - 1, j), r = at(i + 1, j), u = at(i, j - 1), d = at(i, j + 1);
      // a slope rises the same on both sides; a step (kerb, eave) does not: then the flatter side is the slope
      const SLOPE_MAX = 1.6 * cell;   // above ~58 deg it is a step anyway
      const grad = (m, p) => {
        const a = h - m, b = p - h;
        if (Math.abs(a - b) < 0.05 && Math.abs(a) < SLOPE_MAX) return (p - m) / (2 * cell);
        const s = Math.abs(a) < Math.abs(b) ? a : b;
        return Math.abs(s) < SLOPE_MAX ? s / cell : 0;
      };
      const gx = grad(l, r), gz = grad(u, d);
      slope[o] = Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
      // steps after the plane: a neighbour much LOWER than the plane = I am on a drop edge; much HIGHER = a wall foot
      let lo = false, hi = false;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const e = at(i + di, j + dj) - (h + gx * di * cell + gz * dj * cell);
        // a ridge / valley bends the slope (up to 2 x its rise): a crease, not a step
        const tol = S.cliff + 2 * Math.abs(di ? gx : gz) * cell;
        if (e < -tol) lo = true;
        if (e > tol) hi = true;
      }
      edge[o] = lo ? 1 : 0; wall[o] = hi ? 1 : 0;
      cliff[o] = lo || hi ? 1 : 0;
      if (h < -1e3) cliff[o] = 1;
    }
    const dE = distance(edge), dW = distance(wall);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i;
      const shed = 1 - Math.min(1, Math.max(0, (slope[o] - S.shedFrom) / (S.shedTo - S.shedFrom)));
      const e = dE[o] * cell, w = dW[o] * cell;
      let f = shed;
      if (e <= w) {   // closer to a drop edge than to a wall: the high side, rounded taper (quarter ellipse)
        const t = Math.min(1, Math.max(0, (e - 0.5 * cell) / S.taper));
        f *= S.lip + (1 - S.lip) * Math.sqrt(1 - (1 - t) * (1 - t));
      } else {        // the low side of a step: a drift against the wall, quadratic falloff
        const t = Math.max(0, 1 - (w - 0.5 * cell) / S.driftWidth);
        f *= 1 + S.driftGain * t * t;
      }
      // low-frequency unevenness (wind-packed, uneven fall), baked here so the snow layer's vertex shader has no noise
      const wx = (i + 0.5) * cell + uOrigin.value.x, wz = (j + 0.5) * cell + uOrigin.value.y;
      f *= 1 + 0.12 * Math.sin(wx * 0.31 + Math.sin(wz * 0.17) * 2.1) * Math.sin(wz * 0.27 + 1.3) + 0.05 * Math.sin(wx * 1.9 + wz * 1.3);
      shape[o] = f;
    }
  }
  
  const t0 = Date.now();
  toGrid(solidPx, H, -1e4);
  const Cn = new Float32Array(N * N);
  toGrid(canopyPx, Cn, -1e4);
  for (let k = 0; k < N * N; k++) shelter[k] = Cn[k] > H[k] + 0.8 ? 1 : 0;
  blur(shelter, 3);
  computeShape();
  // road cells: a carriageway is the topmost surface here
  const road = new Uint8Array(N * N);
  if (roadPx) { const Rd = new Float32Array(N * N); toGrid(roadPx, Rd, -1e4); for (let k = 0; k < N * N; k++) road[k] = Rd[k] > H[k] - 0.05 ? 1 : 0; }
  // Hs: two passes of a 3 x 3 blur over the neighbours that are NOT across a step (gentle curves lose their terraces)
  Hs.set(H);
  const tmp = new Float32Array(N * N);
  for (let it = 0; it < 2; it++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i, h = Hs[o];
      if (cliff[o]) { tmp[o] = h; continue; }
      let s = 0, w = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const v = Hs[jj * N + ii];
        if (Math.abs(v - h) > 0.3 * cell + S.cliff) continue;
        const k = di || dj ? 1 : 2; s += v * k; w += k;
      }
      tmp[o] = s / w;
    }
    Hs.set(tmp);
  }
  // eaves: a drop edge cell whose lower neighbour is > 1.5 m below (roofs, not kerbs or car roofs)
  const eaves = [];
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const o = j * N + i, h = H[o];
    if (!cliff[o] || h < 1.5) continue;
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const lo = H[(j + dj) * N + i + di], inner = H[(j - dj) * N + i - di];
      // a roof edge, not a ledge on a wall (a sill under a taller facade has a much higher cell behind it)
      if (h - lo > 1.5 && inner < h + 0.3 && rnd() < 0.55) {
        eaves.push((i + 0.5 + di * 0.5) * cell + origin[0], h, (j + 0.5 + dj * 0.5) * cell + origin[1], di, dj, h - lo);
        break;
      }
    }
  }
  return { H, Hs, shelter, shape, cliff, road, eaves: new Float32Array(eaves), ms: Date.now() - t0 };
}
