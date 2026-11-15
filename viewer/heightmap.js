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

  /**
   * JOINS (roads round 5): where a road / sidewalk edge stands over the terrain (a raised road, a sidewalk over a
   * lawn), the terrain beside it comes up to meet it: a flat shoulder at the edge's height - SHOULDER out to 1.5 m, then
   * a bank down at `slope` (m per m) to the natural ground, at most `reach` m out; under a surface the terrain comes up
   * to `depth` under it (the carve's depth). Only raises. Skipped where the rise would exceed maxRise (a structure: decks, overpasses) or where skip(x, z)
   * (no DTM data, bridge decks). meshes: [{ position, index }]. Returns the number of cells raised.
   */
  weld(meshes, { slope = 0.7, reach = 4, maxRise = 2.0, depth = 0.12, skip = null, nearest = false } = {}) {
    const { x0, z0, cols, rows, step } = this.h;
    const SHOULDER = 0.01, Y = this.y;
    const top = new Float32Array(cols * rows).fill(-Infinity);          // highest surface over each covered cell
    for (const { position, index } of meshes) for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ax = position[a], az = position[a + 2], bx = position[b], bz = position[b + 2], cx = position[c], cz = position[c + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      // steep faces (kerb faces, the skirts that go down into the ground past a street's outer edge) cover nothing: the
      // ground under a skirt comes up to the edge above it (the skirt then ends in the ground, as it should)
      const ay = position[a + 1], ux = bx - ax, uy = position[b + 1] - ay, uz = bz - az, vx = cx - ax, vy = position[c + 1] - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / step)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx, cx) - x0) / step));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - z0) / step)), r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz, cz) - z0) / step));
      for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) {
        const px = x0 + cc * step, pz = z0 + r * step;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        const y = l1 * position[a + 1] + l2 * position[b + 1] + l3 * position[c + 1], k = r * cols + cc;
        if (y > top[k]) top[k] = y;
      }
    }
    // each uncovered cell within `reach` of a covered one: the highest target over the covered cells around it
    const R = Math.ceil(reach / step), want = new Float32Array(cols * rows).fill(-Infinity);
    // nearest (joins2, docs/JOINS2.md; ?groundweld=old = false): a cell takes the bank of its NEAREST edge cell, not the
    // highest one within reach: along a path that climbs (or tilts across, a 6 m height field on a park slope) the
    // highest edge cell 1.5 m away stands up to grade x 1.5 m over the edge next to the cell, and the terrain raised to
    // it drew over the path in a saw-tooth of grid triangles (Wolvendael, Kauwberg: "a path in a forest with saw-tooth edges")
    const wantD = nearest ? new Float32Array(cols * rows).fill(Infinity) : null;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (top[k] === -Infinity) continue;
      // only edge cells (an uncovered 8-neighbour) seed the bank
      let edge = false;
      for (let dr = -1; dr <= 1 && !edge; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && top[rr * cols + cc] === -Infinity) { edge = true; break; }
      }
      if (!edge) continue;
      const yTop = top[k];
      for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const kk = rr * cols + cc;
        if (top[kk] !== -Infinity) continue;
        const d = Math.hypot(dr, dc) * step;
        if (d > reach) continue;
        const v = yTop - SHOULDER - slope * Math.max(0, d - 1.5);
        if (wantD) {
          if (d < wantD[kk] - 1e-6) { wantD[kk] = d; want[kk] = v; } else if (d < wantD[kk] + 1e-6 && v < want[kk]) want[kk] = v;
        } else if (v > want[kk]) want[kk] = v;
      }
    }
    let n = 0;
    for (let k = 0; k < Y.length; k++) {
      // under a surface: up to its carve depth (the terrain under a road that stands over it, so its edge is not open);
      // beside one: the shoulder / bank
      const v = top[k] !== -Infinity ? top[k] - depth : want[k];
      if (v === -Infinity || v <= Y[k]) continue;
      if (v - this.orig[k] > maxRise) continue;
      if (skip && skip(x0 + (k % cols) * step, z0 + Math.floor(k / cols) * step)) continue;
      Y[k] = v; n++;
    }
    return n;
  }

  /**
   * JOINS2 (docs/JOINS2.md): NO TERRAIN OVER A SURFACE. Every grid vertex of a cell that a near-flat surface triangle
   * overlaps is held under that triangle: y <= ySurface(nearest point) - lift + rise * distance. The terrain triangles
   * that straddle a street / path edge then stay under it (a 1 m grid triangle from a high garden / hillside vertex to a
   * carved one drew over the surface's edge: the saw-tooth along park paths on a slope, gardens above a sidewalk). The
   * natural ground beyond the ring is kept: a short bank one cell out. Only lowers; skipped where it would drop more than
   * maxDrop (a structure: a road through a tunnel / under an embankment) or skip(x, z). Returns the cells lowered.
   */
  clampUnder(meshes, { lift = 0.03, rise = 0.1, maxDrop = 1.2, skip = null } = {}) {
    const { x0, z0, cols, rows, step } = this.h, Y = this.y;
    const cap = new Float32Array(cols * rows).fill(Infinity), reach2 = (1.5 * step) ** 2;
    // a vertex UNDER a surface takes only the triangles over it (a folded street's lower half next to it must not pull
    // it down: the street floated over a hole); a vertex beside one takes the nearest edges round it
    const capIn = new Float32Array(cols * rows).fill(Infinity);
    const near = (px, pz, ax, az, bx, bz) => {           // closest point of segment ab to p: [t, d2]
      const ex = bx - ax, ez = bz - az, L = ex * ex + ez * ez || 1e-12;
      const t = Math.min(1, Math.max(0, ((px - ax) * ex + (pz - az) * ez) / L)), dx = px - ax - t * ex, dz = pz - az - t * ez;
      return [t, dx * dx + dz * dz];
    };
    for (const { position: P, index: I } of meshes) for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[b], by = P[b + 1], bz = P[b + 2], cx = P[c], cy = P[c + 1], cz = P[c + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (Math.abs(ny) < 0.6 * Math.hypot(nx, ny, nz)) continue;              // kerb faces, skirts
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      // the corners of every cell the triangle's box touches
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(az, bz, cz) - z0) / step));
      for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) {
        const px = x0 + cc * step, pz = z0 + r * step;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det, l3 = 1 - l1 - l2;
        let y, d = 0;
        if (l1 >= 0 && l2 >= 0 && l3 >= 0) y = l1 * ay + l2 * by + l3 * cy;
        else {
          const e = [near(px, pz, ax, az, bx, bz), near(px, pz, bx, bz, cx, cz), near(px, pz, cx, cz, ax, az)];
          const k = e[0][1] <= e[1][1] ? (e[0][1] <= e[2][1] ? 0 : 2) : (e[1][1] <= e[2][1] ? 1 : 2), [tt, d2] = e[k];
          y = k === 0 ? ay + (by - ay) * tt : k === 1 ? by + (cy - by) * tt : cy + (ay - cy) * tt;
          if (d2 > reach2) continue;                                       // only the cells round the triangle (its box is wider)
          d = Math.sqrt(d2);
        }
        const v = y - lift + rise * d, kk = r * cols + cc;
        if (d === 0) { if (v < capIn[kk]) capIn[kk] = v; } else if (v < cap[kk]) cap[kk] = v;
      }
    }
    let n = 0;
    for (let k = 0; k < Y.length; k++) {
      const c = capIn[k] < Infinity ? capIn[k] : cap[k];
      if (!(c < Y[k])) continue;
      if (Y[k] - c > maxDrop) continue;
      if (skip && skip(x0 + (k % cols) * step, z0 + Math.floor(k / cols) * step)) continue;
      Y[k] = c; n++;
    }
    return n;
  }
}
