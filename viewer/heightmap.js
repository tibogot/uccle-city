// 1 m terrain grid of one tile (terrain.json + terrain.u16), with road carving. Pure JS.
export class Heightmap {
  /** Rebuild from arrays computed elsewhere (the tile worker): header, carved grid, original grid. */
  static from(hdr, y, orig) { const m = Object.create(Heightmap.prototype); m.h = hdr; m.y = y; m.orig = orig;
    m.ground = (x, z) => m.sample(m.orig, x, z); m.surface = (x, z) => m.sample(m.y, x, z); return m; }
  constructor(hdr, buf) {
    this.h = hdr;
    const raw = new Uint16Array(buf);
    this.y = new Float32Array(raw.length);
    let lo = Infinity;
    for (let k = 0; k < raw.length; k++) if (raw[k] !== hdr.nodata) lo = Math.min(lo, raw[k]);
    for (let k = 0; k < raw.length; k++) this.y[k] = (raw[k] === hdr.nodata ? lo : raw[k]) / 100;
    this.orig = this.y.slice();   // un-carved, for the road engine's ground()
  }
  /** Bilinear lookup; points outside the tile are clamped to the edge (neighbour tiles aren't loaded). */
  sample(arr, x, z) {
    const h = this.h;
    const c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1);
    const r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
    const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
    const fc = c - c0, fr = r - r0, i = r0 * h.cols + c0;
    return (arr[i] * (1 - fc) + arr[i + 1] * fc) * (1 - fr) + (arr[i + h.cols] * (1 - fc) + arr[i + h.cols + 1] * fc) * fr;
  }
  ground = (x, z) => this.sample(this.orig, x, z);
  surface = (x, z) => this.sample(this.y, x, z);

  /** Push the grid under the given triangles (local xyz arrays + index) to `y − depth`, then one ring of neighbours. */
  carve(position, index, depth) {
    const { x0, z0, cols, rows, step } = this.h;
    const carved = new Uint8Array(cols * rows);
    const Y = this.y;
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ax = position[a], az = position[a + 2], bx = position[b], bz = position[b + 2], cx = position[c], cz = position[c + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / step)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx, cx) - x0) / step));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - z0) / step)), r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz, cz) - z0) / step));
      for (let r = r0; r <= r1; r++) {
        const pz = z0 + r * step;
        for (let cc = c0; cc <= c1; cc++) {
          const px = x0 + cc * step;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const y = l1 * position[a + 1] + l2 * position[b + 1] + l3 * position[c + 1] - depth;
          const k = r * cols + cc;
          if (y < Y[k]) Y[k] = y;
          carved[k] = 1;
        }
      }
    }
    // One-cell shoulder so terrain triangles that straddle a road edge don't poke through it.
    const out = Y.slice();
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (carved[k]) { n++; continue; }
      let best = Infinity;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const kk = rr * cols + cc;
        if (carved[kk]) best = Math.min(best, Y[kk] + 0.05);
      }
      if (best < out[k]) out[k] = best;
    }
    this.y = out;
    return n;
  }
}
