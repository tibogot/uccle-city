// viewer/cellCull.js's triangle sort by cell (pure: no three.js, the worker imports it)
/** the sort (pure; the worker runs it): P positions (xyz), src index or null, -> { I (Uint32), rec (Uint32, 5 per
 *  cell: indexCount, 1, firstIndex, 0, 0), boxes (Float32, 6 per cell), n } */
export function cellSort(P, src, cell = 40, pad = 0.5) {
  const nt = (src ? src.length : P.length / 3) / 3;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const cx = new Float32Array(nt), cz = new Float32Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = (src ? src[t * 3] : t * 3) * 3, b = (src ? src[t * 3 + 1] : t * 3 + 1) * 3, c = (src ? src[t * 3 + 2] : t * 3 + 2) * 3;
    const x = (P[a] + P[b] + P[c]) / 3, z = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    cx[t] = x; cz[t] = z;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell + 1e-6)), nz = Math.max(1, Math.ceil((z1 - z0) / cell + 1e-6)), nc = nx * nz;
  const cellOf = new Uint32Array(nt), count = new Uint32Array(nc);
  for (let t = 0; t < nt; t++) {
    const k = Math.min(nz - 1, Math.floor((cz[t] - z0) / cell)) * nx + Math.min(nx - 1, Math.floor((cx[t] - x0) / cell));
    cellOf[t] = k; count[k]++;
  }
  const start = new Uint32Array(nc + 1);
  for (let k = 0; k < nc; k++) start[k + 1] = start[k] + count[k];
  const fill = start.slice(0, nc), I = new Uint32Array(nt * 3), box = new Float32Array(nc * 6);
  for (let k = 0; k < nc; k++) { const b = k * 6; box[b] = box[b + 1] = box[b + 2] = Infinity; box[b + 3] = box[b + 4] = box[b + 5] = -Infinity; }
  for (let t = 0; t < nt; t++) {
    const k = cellOf[t], o = fill[k]++ * 3, b = k * 6;
    for (let j = 0; j < 3; j++) {
      const v = src ? src[t * 3 + j] : t * 3 + j, p = v * 3;
      I[o + j] = v;
      const x = P[p], y = P[p + 1], z = P[p + 2];
      if (x < box[b]) box[b] = x; if (x > box[b + 3]) box[b + 3] = x;
      if (y < box[b + 1]) box[b + 1] = y; if (y > box[b + 4]) box[b + 4] = y;
      if (z < box[b + 2]) box[b + 2] = z; if (z > box[b + 5]) box[b + 5] = z;
    }
  }
  let n = 0;
  for (let k = 0; k < nc; k++) if (count[k]) n++;
  const rec = new Uint32Array(n * 5), boxes = new Float32Array(n * 6);
  let r = 0;
  for (let k = 0; k < nc; k++) {
    if (!count[k]) continue;
    rec[r * 5] = count[k] * 3; rec[r * 5 + 1] = 1; rec[r * 5 + 2] = start[k] * 3;
    for (let c = 0; c < 6; c++) boxes[r * 6 + c] = box[k * 6 + c] + (c < 3 ? -pad : pad);
    r++;
  }
  return { I, rec, boxes, n };
}
