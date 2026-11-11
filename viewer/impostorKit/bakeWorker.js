// impostorKit / bakeWorker.js (module worker): the CPU half of the bake, off the main thread.
// In: one layer (variant) as read back from the GPU bake, already resolved from the supersampled capture:
//   A = albedo.rgb + coverage (fractional: the share of covered sub-samples), B = the type's aux channels
//   (trees: view-space normal xy, depth, leaf / AO flag), both RGBA8, `size` x `size`, rows top-first,
//   N x N cells of C px with a gutter of g px on each side.
// Out: per-cell mip chains down to `minCell` px a cell, for A and B, plus the cut-out card (an octagon round the
// union of every view's coverage) and per-level coverage stats.
//  - DILATION: empty texels (coverage 0) take their covered neighbours' colour / normal / depth, so filtering at a
//    leaf's edge never drags in black or a "facing nowhere" normal, and parallax at the crown's edge reads a
//    plausible depth (game-engine-v1 octahedralCore.js dilateAtlasEdges, read-only reference). Then whatever is
//    still empty takes the cell's mean (no seams at coarse levels).
//  - MIPS PER CELL: each level is built from the level above WITHIN the cell (no bleeding between views; the
//    layers of a texture array never bleed into each other). Colour and aux are averaged weighted by coverage.
//  - COVERAGE-PRESERVING ALPHA (Ignacio Castano, "Computing Alpha Mipmaps", The Witness; game-engine-v1
//    v3/render/foliage/alphaCoverageMips.js and viewer/treesStylized.js coverageMips, read-only): per cell and per
//    level, the box-filtered alpha is scaled (bisection) so the share of texels at or above the cut (0.5) equals
//    level 0's share in that cell. A far crown keeps the weight of its silhouette instead of thinning into a
//    see-through speckle; this replaces today's guessed `1 + 0.3 x mip` boost (viewer/impostors.js:242).
self.onmessage = (e) => {
  const { id, A, B, size, N, C, g, minCell = 8, cut = 0.5 } = e.data;
  const t0 = performance.now();
  const levels = [];
  let w = size, cell = C, a = new Uint8Array(A), b = new Uint8Array(B), gut = g;
  const cut8 = cut * 255;
  // level 0 share of texels >= cut, per cell
  const target = new Float32Array(N * N);
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    let n = 0;
    for (let y = cy * C; y < (cy + 1) * C; y++) for (let x = cx * C; x < (cx + 1) * C; x++) if (a[(y * size + x) * 4 + 3] >= cut8) n++;
    target[cy * N + cx] = n / (C * C);
  }
  const hull = fitOctagon(a, size, N, C, g);
  dilate(a, b, w, N, cell, 6);
  levels.push({ a, b, w });
  const stats = [{ level: 0, cell, share: mean(target) }];
  while (cell / 2 >= minCell) {
    const nw = w / 2, nc = cell / 2;
    const na = new Uint8Array(nw * nw * 4), nb = new Uint8Array(nw * nw * 4);
    const alpha = new Float32Array(nw * nw);
    for (let y = 0; y < nw; y++) for (let x = 0; x < nw; x++) {
      let sa = 0, r = 0, gg = 0, bb = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, sr = 0, sg = 0, sb = 0, s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const k = ((2 * y + j) * w + 2 * x + i) * 4, al = a[k + 3];
        sa += al; r += a[k] * al; gg += a[k + 1] * al; bb += a[k + 2] * al;
        b0 += b[k] * al; b1 += b[k + 1] * al; b2 += b[k + 2] * al; b3 += b[k + 3] * al;
        sr += a[k]; sg += a[k + 1]; sb += a[k + 2]; s0 += b[k]; s1 += b[k + 1]; s2 += b[k + 2]; s3 += b[k + 3];
      }
      const o = (y * nw + x) * 4;
      if (sa > 0) {
        na[o] = r / sa; na[o + 1] = gg / sa; na[o + 2] = bb / sa;
        nb[o] = b0 / sa; nb[o + 1] = b1 / sa; nb[o + 2] = b2 / sa; nb[o + 3] = b3 / sa;
      } else {   // all four empty: their dilated values
        na[o] = sr / 4; na[o + 1] = sg / 4; na[o + 2] = sb / 4;
        nb[o] = s0 / 4; nb[o + 1] = s1 / 4; nb[o + 2] = s2 / 4; nb[o + 3] = s3 / 4;
      }
      alpha[y * nw + x] = sa / 4;
    }
    // Castano: per cell, the scale that keeps the level-0 share of texels >= cut
    let shareSum = 0;
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const tgt = target[cy * N + cx];
      const x0 = cx * nc, y0 = cy * nc;
      let k = 1;
      if (tgt > 0) {
        let lo = 0.25, hi = 8;
        for (let it = 0; it < 16; it++) {
          const s = (lo + hi) / 2;
          let n = 0;
          for (let y = y0; y < y0 + nc; y++) for (let x = x0; x < x0 + nc; x++) if (alpha[y * nw + x] * s >= cut8) n++;
          if (n / (nc * nc) < tgt) lo = s; else hi = s;
        }
        k = (lo + hi) / 2;
      }
      let n = 0;
      for (let y = y0; y < y0 + nc; y++) for (let x = x0; x < x0 + nc; x++) {
        const v = Math.min(255, Math.round(alpha[y * nw + x] * k));
        na[(y * nw + x) * 4 + 3] = v;
        if (v >= cut8) n++;
      }
      shareSum += n / (nc * nc);
    }
    dilate(na, nb, nw, N, nc, 3);
    levels.push({ a: na, b: nb, w: nw });
    stats.push({ level: levels.length - 1, cell: nc, share: shareSum / (N * N) });
    a = na; b = nb; w = nw; cell = nc; gut /= 2;
  }
  const out = { id, levels: levels.map((l) => ({ a: l.a, b: l.b, w: l.w })), hull, stats, ms: performance.now() - t0 };
  self.postMessage(out, levels.flatMap((l) => [l.a.buffer, l.b.buffer]));
};

function mean(f) { let s = 0; for (const v of f) s += v; return s / f.length; }

/** Fill empty texels from covered neighbours (iterations of a 3x3 average, inside each cell), then the cell's mean. */
function dilate(a, b, w, N, C, iters) {
  const filled = new Uint8Array(w * w);
  for (let i = 0; i < w * w; i++) filled[i] = a[i * 4 + 3] > 0 ? 1 : 0;
  const next = new Uint8Array(w * w);
  for (let it = 0; it < iters; it++) {
    next.set(filled);
    let any = false;
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const x0 = cx * C, y0 = cy * C, x1 = x0 + C, y1 = y0 + C;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * w + x;
        if (filled[i]) continue;
        let n = 0, s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0, t2 = 0, t3 = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < y0 || yy >= y1) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < x0 || xx >= x1) continue;
            const j = yy * w + xx;
            if (!filled[j]) continue;
            const k = j * 4; n++;
            s0 += a[k]; s1 += a[k + 1]; s2 += a[k + 2]; t0 += b[k]; t1 += b[k + 1]; t2 += b[k + 2]; t3 += b[k + 3];
          }
        }
        if (n) {
          const k = i * 4;
          a[k] = s0 / n; a[k + 1] = s1 / n; a[k + 2] = s2 / n; b[k] = t0 / n; b[k + 1] = t1 / n; b[k + 2] = t2 / n; b[k + 3] = t3 / n;
          next[i] = 1; any = true;
        }
      }
    }
    filled.set(next);
    if (!any) break;
  }
  // the rest: the cell's mean of what is filled (a flat "facing the camera" normal and mid depth if none)
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const x0 = cx * C, y0 = cy * C;
    let n = 0; const s = [0, 0, 0, 0, 0, 0, 0];
    for (let y = y0; y < y0 + C; y++) for (let x = x0; x < x0 + C; x++) {
      const i = y * w + x; if (!filled[i]) continue;
      const k = i * 4; n++;
      s[0] += a[k]; s[1] += a[k + 1]; s[2] += a[k + 2]; s[3] += b[k]; s[4] += b[k + 1]; s[5] += b[k + 2]; s[6] += b[k + 3];
    }
    const m = n ? s.map((v) => v / n) : [40, 60, 30, 128, 128, 128, 64];
    for (let y = y0; y < y0 + C; y++) for (let x = x0; x < x0 + C; x++) {
      const i = y * w + x; if (filled[i]) continue;
      const k = i * 4;
      a[k] = m[0]; a[k + 1] = m[1]; a[k + 2] = m[2]; b[k] = m[3]; b[k + 1] = m[4]; b[k + 2] = m[5]; b[k + 3] = m[6];
    }
  }
}

/** The cut-out card: 8 supporting half-planes (every 45 degrees) round the union of every view's coverage, in the
 *  frame's unit square [-1, 1]^2 (v up), with a margin; returns the 8 corners, counter-clockwise. */
function fitOctagon(a, size, N, C, g) {
  const inner = C - 2 * g;
  const dirs = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const h = dirs.map(() => -Infinity);
  let any = false;
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      if (a[((cy * C + y) * size + cx * C + x) * 4 + 3] < 4) continue;
      any = true;
      const ux = ((x - g + 0.5) / inner) * 2 - 1, uy = 1 - ((y - g + 0.5) / inner) * 2;
      for (let k = 0; k < 8; k++) h[k] = Math.max(h[k], ux * dirs[k][0] + uy * dirs[k][1]);
    }
  }
  if (!any) return [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const m = 3 / inner;   // a margin of 1.5 texels (the parallax and the views between the grid points)
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const [a1, b1] = dirs[k], [a2, b2] = dirs[(k + 1) % 8], c1 = h[k] + m, c2 = h[(k + 1) % 8] + m;
    const det = a1 * b2 - a2 * b1;
    pts.push([(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]);
  }
  return pts;
}
