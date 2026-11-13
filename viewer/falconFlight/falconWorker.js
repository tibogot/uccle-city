// THE FALCON FLIGHT'S WORKER (the city's fly mode, viewer/falconFlight/cityStream.js): the work that would make a long
// task on the main thread, off it.
//   ridges  the pigeons' roof-ridge roosts round a square: the city's buildings.json + buildings.bin of the tiles
//           there (the same files the tile worker reads), the roof-part edges whose two ends are at the building's top,
//           a point every 1.1 m (as cityWorld.js roosts() in the lab), 1.5 m off the ridge's ends (the chimneys stand
//           there) -> Float32Array [x, y, z, yaw] per point
//   raster  a landmark's height proxy from its own drawn mesh (world-space triangles of its lowest LOD): the highest
//           surface per cell (1 m): cell centres inside each triangle (interpolated height) + every triangle edge
//           sampled each half cell (walls, railings, spires: the thin parts), -1e9 where nothing is; with `under`
//           also the LOWEST surface per cell (a bridge's arch: the underside the falcon can fly beneath)
//   trees   a tile's tree crowns as the flight's obstacles: per tree (the city's own placements: viewer/treesStylized.js
//           variant, turn and scale of each LiDAR tree) the crown's ellipsoid (centre, horizontal / vertical radius,
//           from the drawn variant's leaf cards) and the trunk, bucketed on an 8 m grid (each crown in every cell its
//           box touches) -> { T: Float32Array [cx, cz, cy, Rh, Rv, tx, tz, tr] per tree, start, idx, x0, z0, nx, nz, cell }
// No imports: plain module worker.
const near = (x, z, P, R) => Math.hypot(x - P.x, z - P.z) < R;

async function ridges({ tiles, place, R }) {
  const out = [];
  for (const t of tiles) {
    const [doc, buf] = await Promise.all([fetch(t.json).then((r) => r.json()), fetch(t.bin).then((r) => r.arrayBuffer())]);
    const dv = new DataView(buf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
    const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, T * 3);
    const hide = new Set(t.hide || []);
    for (const bd of doc.buildings) {
      if (hide.has(bd.attrs?.BU_ID) || hide.has(bd.id)) continue;     // a hero model's solid: its own roosts / perches
      const f = bd.footprint?.[0]?.[0]; if (!f || !near(f[0], f[1], place, R + 40)) continue;
      const top = +bd.top, seen = new Set();
      for (let tri = bd.roof.first; tri < bd.roof.first + bd.roof.count; tri++) for (let e = 0; e < 3; e++) {
        const a = I[tri * 3 + e], c = I[tri * 3 + (e + 1) % 3];
        const ya = P[a * 3 + 1], yc = P[c * 3 + 1];
        if (ya < top - 0.35 || yc < top - 0.35) continue;
        const key = a < c ? a * 4294967296 + c : c * 4294967296 + a; if (seen.has(key)) continue; seen.add(key);
        const ax = P[a * 3], az = P[a * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2], L = Math.hypot(cx - ax, cz - az);
        if (L < 3.2) continue;
        const yaw = Math.atan2(-(cz - az), (cx - ax));                 // facing across the ridge
        // 1.5 m off the ridge's ends: the façade kit's chimney stacks stand there (viewer/facadeGeom.js: on the party
        // walls, at the gable's highest point, 0.9 m wide), so no roost / perch faces into one
        for (let s = 1.5; s < L - 1.5; s += 1.1) {
          const k = s / L, x = ax + (cx - ax) * k, z = az + (cz - az) * k;
          if (!near(x, z, place, R)) continue;
          out.push(x, ya + (yc - ya) * k + 0.02, z, yaw + ((out.length / 4) % 2 ? Math.PI : 0));
        }
      }
    }
  }
  return new Float32Array(out);
}

function raster({ pos, step = 1, under = false }) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, top = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    x0 = Math.min(x0, pos[i]); x1 = Math.max(x1, pos[i]); z0 = Math.min(z0, pos[i + 2]); z1 = Math.max(z1, pos[i + 2]); top = Math.max(top, pos[i + 1]);
  }
  x0 = Math.floor(x0 / step) * step - step; z0 = Math.floor(z0 / step) * step - step;
  const nx = Math.ceil((x1 - x0) / step) + 2, nz = Math.ceil((z1 - z0) / step) + 2;
  const data = new Float32Array(nx * nz).fill(-1e9);
  const low = under ? new Float32Array(nx * nz).fill(1e9) : null;
  const put = (x, z, y) => {
    const i = Math.floor((x - x0) / step), j = Math.floor((z - z0) / step);
    if (i < 0 || j < 0 || i >= nx || j >= nz) return;
    const k = j * nx + i;
    if (data[k] < y) data[k] = y;
    if (low && low[k] > y) low[k] = y;
  };
  for (let t = 0; t + 8 < pos.length; t += 9) {
    const ax = pos[t], ay = pos[t + 1], az = pos[t + 2], bx = pos[t + 3], by = pos[t + 4], bz = pos[t + 5], cx = pos[t + 6], cy = pos[t + 7], cz = pos[t + 8];
    // the edges, every half cell
    for (const [px, py, pz, qx, qy, qz] of [[ax, ay, az, bx, by, bz], [bx, by, bz, cx, cy, cz], [cx, cy, cz, ax, ay, az]]) {
      const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qz - pz) / (step * 0.5)));
      for (let k = 0; k <= n; k++) { const s = k / n; put(px + (qx - px) * s, pz + (qz - pz) * s, py + (qy - py) * s); }    }
    // the inside: cell centres, the plane's height there
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-6) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / step)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / step));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / step)), j1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - z0) / step));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + (i + 0.5) * step, pz = z0 + (j + 0.5) * step;
      const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      const y = l1 * ay + l2 * by + l3 * cy, k = j * nx + i;
      if (data[k] < y) data[k] = y;
      if (low && low[k] > y) low[k] = y;
    }
  }
  // the footprint, dilated by `grow` cells (where the city's roof grid gives way to the model)
  const grow = 2, cover = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (data[j * nx + i] < -1e8) continue;
    for (let dj = -grow; dj <= grow; dj++) for (let di = -grow; di <= grow; di++) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < nx && jj < nz) cover[jj * nx + ii] = 1;
    }
  }
  // the model's highest cell (the replaced UrbIS envelope's top is read from the roof grid there)
  let hi = 0; for (let k = 1; k < data.length; k++) if (data[k] > data[hi]) hi = k;
  return { x0, z0, nx, nz, step, data, cover, low, top, hx: x0 + ((hi % nx) + 0.5) * step, hz: z0 + (Math.floor(hi / nx) + 0.5) * step };
}

// the vendor's variant per tree index (vendor/stylized-trees: rng(i * 7919 + 13) -> floor(x * variants))
const variantOf = (i, n) => { let s = (i * 7919 + 13) >>> 0; s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * n); };
// viewer/treesStylized.js's turn per tree (hash(z, x, 2) * 2 pi)
const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** pts: [x, z, ground, height] per tree (the tile's drawn order); V: [cx, cz, cy, Rh, Rv, trunkR] per variant at scale 1
 *  (crown centre relative to the trunk foot, unturned); H: the species' natural height (scale = clamp(h / H, 0.3, 1.8)) */
function trees({ pts, V, nVar, H, cell = 8, x0, z0, x1, z1 }) {
  const n = pts.length / 4, T = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const x = pts[i * 4], z = pts[i * 4 + 1], gy = pts[i * 4 + 2] - 0.25, h = Math.max(3, pts[i * 4 + 3]);
    const v = variantOf(i, nVar) * 6, s = Math.min(1.8, Math.max(0.3, h / H)), rot = hash(z, x, 2) * Math.PI * 2;
    const c = Math.cos(rot), sn = Math.sin(rot), lx = V[v] * s, lz = V[v + 1] * s;
    // makeRotationY(rot): local (x, z) -> (x cos + z sin, -x sin + z cos)
    T.set([x + lx * c + lz * sn, z - lx * sn + lz * c, gy + V[v + 2] * s, V[v + 3] * s, V[v + 4] * s, x, z, V[v + 5] * s], i * 8);
  }
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell) + 2), nz = Math.max(1, Math.ceil((z1 - z0) / cell) + 2), gx0 = x0 - cell, gz0 = z0 - cell;
  const cnt = new Uint32Array(nx * nz + 1);
  const each = (i, fn) => {
    const cx = T[i * 8], cz = T[i * 8 + 1], R = T[i * 8 + 3];
    const i0 = Math.max(0, Math.floor((Math.min(cx - R, T[i * 8 + 5]) - gx0) / cell)), i1 = Math.min(nx - 1, Math.floor((Math.max(cx + R, T[i * 8 + 5]) - gx0) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(cz - R, T[i * 8 + 6]) - gz0) / cell)), j1 = Math.min(nz - 1, Math.floor((Math.max(cz + R, T[i * 8 + 6]) - gz0) / cell));
    for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) fn(j * nx + k);
  };
  for (let i = 0; i < n; i++) each(i, (q) => cnt[q + 1]++);
  for (let q = 0; q < nx * nz; q++) cnt[q + 1] += cnt[q];
  const idx = new Uint32Array(cnt[nx * nz]), fill = cnt.slice(0, nx * nz);
  for (let i = 0; i < n; i++) each(i, (q) => { idx[fill[q]++] = i; });
  return { T, start: cnt, idx, x0: gx0, z0: gz0, nx, nz, cell, n };
}

self.onmessage = async (e) => {
  const { id, kind } = e.data;
  try {
    if (kind === "ridges") { const r = await ridges(e.data); self.postMessage({ id, r }, [r.buffer]); }
    else if (kind === "raster") { const r = raster(e.data); self.postMessage({ id, r }, [r.data.buffer, r.cover.buffer, ...(r.low ? [r.low.buffer] : [])]); }
    else if (kind === "trees") { const r = trees(e.data); self.postMessage({ id, r }, [r.T.buffer, r.start.buffer, r.idx.buffer]); }
    else throw new Error(`unknown job ${kind}`);
  } catch (err) { self.postMessage({ id, error: err.message }); }
};
