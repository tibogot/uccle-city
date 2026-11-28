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

/** the signed cut distance's clamp (m): the blur (2 cells) must see a linear field round the line */
export const SD_CLAMP = 0.6;
/** a raised kept patch whose cells all lie within this many cells of the cut is a ledge (narrowCut) */
export const NARROW = 2.25;

export function computeOverheadShape({ solidPx, canopyPx, roadPx = null, carPx = null, res, cell, origin, fillOld = false, sdfOld = false }) {
  const FILL_OLD = fillOld;
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
    // holes (no texel landed: rounding at cell borders; or nothing there): the neighbour's value, else `empty`.
    // snowfix (rule overhead-fill-bounded): each pass reads a SNAPSHOT of the grid, so a hole takes a value from at most
    // 2 cells away, and only a pinhole is filled. The fill used to run in place in raster order: a filled cell fed the next one, and every empty
    // stretch of a sparse pass (roads, crowns, cars) was flooded right / down with the heights of what lay up-left of it:
    // 16.8 k cells of Place Saint-Job's window "carriageway" with no road there (the salted layer cut: a polygonal
    // patch of bare setts at 15 cm), crowns' shelter spread over open ground. ?wxfill=old = before
    const OLD_FILL = FILL_OLD;      // (the page's switch, passed in the job: a worker has no page URL)
    for (let pass = 0; pass < 2; pass++) {
      const src = OLD_FILL ? out : out.slice();
      for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
        const o = j * res + i;
        if (out[o] === out[o]) continue;
        const n = [i > 0 ? src[o - 1] : NaN, i < res - 1 ? src[o + 1] : NaN, j > 0 ? src[o - res] : NaN, j < res - 1 ? src[o + res] : NaN].filter((v) => v === v);
        // (snowfix: a pinhole has >= 2 present neighbours; an empty cell beside a sparse pass's edge only one: it stays
        // empty, so a road / crown / car never grows by the fill)
        if (n.length >= (OLD_FILL ? 1 : 2)) out[o] = Math.max(...n); else if (pass === 1) out[o] = empty;
      }
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
  /** exact squared Euclidean distance (cells^2) to the nearest seed cell (Felzenszwalb + Huttenlocher, separable) */
  function edt2(seed) {
    const INF = 1e12, f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), zz = new Float64Array(N + 1);
    const g = new Float64Array(N * N);
    for (let o = 0; o < N * N; o++) g[o] = seed[o] ? 0 : INF;
    const pass = (base, stride) => {
      for (let q = 0; q < N; q++) f[q] = g[base + q * stride];
      let k = 0; v[0] = 0; zz[0] = -INF; zz[1] = INF;
      for (let q = 1; q < N; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= zz[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; zz[k] = s; zz[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < N; q++) { while (zz[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
      for (let q = 0; q < N; q++) g[base + q * stride] = d[q];
    };
    for (let i = 0; i < N; i++) pass(i, N);
    for (let j = 0; j < N; j++) pass(j * N, 1);
    return g;
  }
  /** cut the kept 4-connected patches that are narrow (max distance to the cut <= NARROW cells) and raised (most of
   *  their rim cells have ground > 0.3 m lower within 2 cells). Returns the cells cut */
  function narrowCut(cutM) {
    const g = edt2(cutM), comp = new Int32Array(N * N).fill(-1), st = [];
    let id = 0, total = 0;
    for (let o0 = 0; o0 < N * N; o0++) {
      if (cutM[o0] || comp[o0] >= 0) continue;
      const cells = [o0]; comp[o0] = id; st.length = 0; st.push(o0);
      let maxD = 0, rim = 0, raised = 0, big = false;
      while (st.length) {
        const o = st.pop(), i = o % N, j = (o / N) | 0;
        if (g[o] > maxD) maxD = g[o];
        if (maxD > NARROW * NARROW) big = true;
        let edgeCell = false;
        for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
          const p = jj * N + ii;
          if (cutM[p]) { edgeCell = true; continue; }
          if (comp[p] < 0) { comp[p] = id; st.push(p); if (!big) cells.push(p); }
        }
        if (!big && edgeCell) {
          rim++;
          let lo = Infinity;
          for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N) lo = Math.min(lo, H[jj * N + ii] > -1e3 ? H[jj * N + ii] : Infinity); }
          if (lo < H[o] - 0.3) raised++;
        }
      }
      if (!big && rim > 0 && raised > 0.5 * rim) { for (const o of cells) cutM[o] = 1; total += cells.length; }
      id++;
    }
    narrowCells = total;
    return total;
  }
  let narrowCells = 0;
  /** the signed distance (m) to the cut (cliff | road): + kept, - cut, clamped to +-SD_CLAMP, blurred [1 4 6 4 1] x 2;
   *  a cut cell keeps <= its own value (no cut ever closes) */
  function signedCut(cl, rd) {
    const cut = new Uint8Array(N * N), keep = new Uint8Array(N * N);
    let any = 0;
    for (let k = 0; k < N * N; k++) { cut[k] = cl[k] || (rd && rd[k]) ? 1 : 0; keep[k] = 1 - cut[k]; any += cut[k]; }
    const out = new Float32Array(N * N);
    if (!any) { out.fill(SD_CLAMP); return out; }
    if (any === N * N) { out.fill(-SD_CLAMP); return out; }
    const dc = edt2(cut), dk = edt2(keep);
    for (let k = 0; k < N * N; k++) {
      const s = cut[k] ? -(Math.sqrt(dk[k]) - 0.5) : Math.sqrt(dc[k]) - 0.5;
      out[k] = Math.max(-SD_CLAMP, Math.min(SD_CLAMP, s * cell));
    }
    const raw = out.slice(), t = new Float32Array(N * N), W = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
    for (let it = 0; it < 2; it++) {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0; for (let d = -2; d <= 2; d++) s += W[d + 2] * out[j * N + Math.min(N - 1, Math.max(0, i + d))]; t[j * N + i] = s; }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0; for (let d = -2; d <= 2; d++) s += W[d + 2] * t[Math.min(N - 1, Math.max(0, j + d)) * N + i]; out[j * N + i] = s; }
    }
    // a cut cell stays cut (a 1-2 cell kerb / wall-foot line would blur away): the blur only lets the line move OUT over
    // the kept notches of a staircase (its envelope: straight), never open a cut
    // (only a THIN cut, no cell deeper than 1.5 cells within 2 cells: a wide cut's protruding raster corners may go, so
    // its edge follows the line, not the staircase's envelope)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; if (!cut[k]) continue;
      let deep = 0;
      for (let dj = -2; dj <= 2 && !deep; dj++) for (let di = -2; di <= 2; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && cut[jj * N + ii] && dk[jj * N + ii] > 2.25) { deep = 1; break; } }
      if (!deep) out[k] = Math.min(out[k], raw[k]);
    }
    return out;
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
      // (a WALL's foot: the step up is > 0.3 m; a kerb's / a low step's foot stays cut: the kerb keeps a 2-cell cut)
      foot[o] = hi && !lo && Math.max(at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)) > h + 0.3 ? 1 : 0;
      cliff[o] = lo || hi ? 1 : 0;
      if (h < -1e3) cliff[o] = 1;
    }
    // (snowfix: exact distances, blurred once: the chamfer distance to a diagonal raster wall alternated 1 / 1.41 cells
    // along it, and the drift / taper height with it: scallops along every facade foot; ?snowsdf=old = the chamfer)
    const smooth1 = (a) => { const t = new Float32Array(N * N), W = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let v = 0; for (let d = -2; d <= 2; d++) v += W[d + 2] * a[j * N + Math.min(N - 1, Math.max(0, i + d))]; t[j * N + i] = v; }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let v = 0; for (let d = -2; d <= 2; d++) v += W[d + 2] * t[Math.min(N - 1, Math.max(0, j + d)) * N + i]; a[j * N + i] = v; }
      return a; };
    const exact = (seed) => { const g = edt2(seed), D = new Float32Array(N * N); for (let k = 0; k < N * N; k++) D[k] = Math.min(64, Math.sqrt(g[k])); return smooth1(D); };
    const dE = sdfOld ? distance(edge) : exact(edge), dW = sdfOld ? distance(wall) : exact(wall);
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
  const foot = new Uint8Array(N * N);       // a wall / kerb FOOT only (a higher neighbour, no lower one)
  toGrid(solidPx, H, -1e4);
  const Cn = new Float32Array(N * N);
  toGrid(canopyPx, Cn, -1e4);
  for (let k = 0; k < N * N; k++) shelter[k] = Cn[k] > H[k] + 0.8 ? 1 : 0;
  blur(shelter, 3);
  computeShape();
  // snow caps (claude/snowtracks): a parked car's top cuts the layer (the car carries its own cap mesh); the ground under
  // it stays the topmost-surface test's "sheltered"
  const carCut = new Uint8Array(N * N);
  if (carPx) { const Cr = new Float32Array(N * N); toGrid(carPx, Cr, -1e4); for (let k = 0; k < N * N; k++) if (Cr[k] > H[k] - 0.05) { cliff[k] = 1; carCut[k] = 1; } }
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
  // snowfix (rule snow-edge-sdf): the layer's CUT as a smooth signed distance (m) per cell centre, read per PIXEL by the
  // layer's fragment (a bilinear tap): + inside the snow, - in the cut, 0 on the line between the cut cells and the
  // kept ones. The layer's vertices only TAPER toward it: the cut no longer follows the mesh's 12.5 / 25 cm triangles
  // (the saw-teeth of the coarse outer chunks round Place Saint-Job's paving, 2026-11-27). Blurred ~1.4 cells so a raster
  // staircase on a shallow diagonal reads as its line. sdA: cliffs / no surface; sdB: + the carriageways (salted)
  // the layer's cut: the cliffs, but not a wall's / kerb face's FOOT (snowfix): the snow runs on into the wall at full
  // depth (its drift) and the wall hides the rest; tapered to 0 at the foot cell, its top met the wall in 12.5 cm
  // teeth (the police yard's facades). Drop edges (eaves, kerb tops, wall tops), cars and "no surface" stay cut
  const cut = new Uint8Array(N * N);
  for (let k = 0; k < N * N; k++) cut[k] = cliff[k] && !(foot[k] && !sdfOld && H[k] > -1e3 && !carCut[k]) ? 1 : 0;
  // narrow RAISED strips (snowfix, rule snow-thin-ledge): a kept patch no wider than ~0.6 m (every cell within 2.25
  // cells of the cut) whose rim drops > 0.3 m (a garden coping, a shop fascia, a sill, a parapet): the layer draws it
  // as a 1-2 cell strip that zigzags along any diagonal; the caps (snowCaps.js) and the materials' cover carry them
  if (!sdfOld) narrowCut(cut);
  const sdA = signedCut(cut, null), sdB = signedCut(cut, road);
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
  return { H, Hs, shelter, shape, cliff, cut, road, sdA, sdB, narrowCells, eaves: new Float32Array(eaves), ms: Date.now() - t0 };
}
