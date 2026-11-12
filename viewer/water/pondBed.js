// THE POND'S BED (pure JS: the tile worker carves the terrain with it, the main thread builds the water's depth texture
// from the same numbers). The park-water system's ground half (viewer/water/pondWater.js is the surface).
//
// A pond is { id, ring: [[x, z], ...] (city local), level (m TAW), maxDepth, ramp, wet, grow }:
//   - the WATER = the cells inside the ring grown by `grow` metres whose ground (the DTM: the LiDAR returns the water
//     surface itself, flat at the level) is lower than level + wet;
//   - the BED = the ground lowered there by maxDepth x smoothstep(0, ramp, distance to the nearest dry cell) + 4 cm:
//     a bowl that is deep in the middle and runs out at the banks (the DTM alone is flat at the water level: the water
//     plane would z-fight with the terrain);
//   - depth(x, z) = level - bed (> 0 = under water), the water shader's shoreline fade and colour.
// Same grid, same sampler, same numbers everywhere: the carve (tileData.js carvePonds) and the shader agree.

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function inside(x, z, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function distToRing(x, z, ring) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[j], [bx, bz] = ring[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

/** the bed grid of one pond: { x0, z0, cols, rows, step, level, bed (Float32Array), water (Uint8Array), depthAt, bedAt } */
export function pondBedGrid(pond, groundAt, step = 0.5) {
  const { ring, level } = pond;
  const maxDepth = pond.maxDepth ?? 0.9, ramp = pond.ramp ?? 3.0, wet = pond.wet ?? 0.14, grow = pond.grow ?? 1.0;
  const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
  const m = grow + 3;
  const x0 = Math.floor((Math.min(...xs) - m) / step) * step, z0 = Math.floor((Math.min(...zs) - m) / step) * step;
  const cols = Math.ceil((Math.max(...xs) + m - x0) / step) + 1, rows = Math.ceil((Math.max(...zs) + m - z0) / step) + 1;
  const n = cols * rows, ground = new Float32Array(n), water = new Uint8Array(n);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * step, z = z0 + r * step, k = r * cols + c;
    ground[k] = groundAt(x, z);
    water[k] = (inside(x, z, ring) || distToRing(x, z, ring) < grow) && ground[k] < level + wet ? 1 : 0;
  }
  // distance (m) from every water cell to the nearest dry cell: two-pass chamfer (1, sqrt 2)
  const D = new Float32Array(n);
  for (let k = 0; k < n; k++) D[k] = water[k] ? 1e9 : 0;
  const s2 = Math.SQRT2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c; if (!D[k]) continue;
    let d = D[k];
    if (c > 0) d = Math.min(d, D[k - 1] + 1);
    if (r > 0) { d = Math.min(d, D[k - cols] + 1); if (c > 0) d = Math.min(d, D[k - cols - 1] + s2); if (c < cols - 1) d = Math.min(d, D[k - cols + 1] + s2); }
    D[k] = d;
  }
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
    const k = r * cols + c; if (!D[k]) continue;
    let d = D[k];
    if (c < cols - 1) d = Math.min(d, D[k + 1] + 1);
    if (r < rows - 1) { d = Math.min(d, D[k + cols] + 1); if (c < cols - 1) d = Math.min(d, D[k + cols + 1] + s2); if (c > 0) d = Math.min(d, D[k + cols - 1] + s2); }
    D[k] = d;
  }
  const bed = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    bed[k] = water[k] ? Math.min(ground[k], level - 0.04 - maxDepth * smooth(0, ramp, (D[k] - 0.5) * step)) : ground[k];
  }
  const sample = (arr, x, z) => {
    const c = Math.min(Math.max((x - x0) / step, 0), cols - 1.001), r = Math.min(Math.max((z - z0) / step, 0), rows - 1.001);
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, i = r0 * cols + c0;
    return (arr[i] * (1 - fc) + arr[i + 1] * fc) * (1 - fr) + (arr[i + cols] * (1 - fc) + arr[i + cols + 1] * fc) * fr;
  };
  const inGrid = (x, z) => x >= x0 && z >= z0 && x <= x0 + (cols - 1) * step && z <= z0 + (rows - 1) * step;
  return {
    id: pond.id, x0, z0, cols, rows, step, level, bed, water, ground,
    bedAt: (x, z) => (inGrid(x, z) ? sample(bed, x, z) : groundAt(x, z)),
    depthAt: (x, z) => (inGrid(x, z) ? level - sample(bed, x, z) : level - groundAt(x, z)),
    waterArea: water.reduce((a, b) => a + b, 0) * step * step,
  };
}

/** Lower a tile's heightmap grid (viewer/heightmap.js: hm.y, the drawn surface) under every pond's bed (the tile
 *  worker, before the terrain mesh is built and simplified). Returns the number of lowered cells. */
export function carvePonds(hm, ponds) {
  const { x0, z0, cols, rows, step } = hm.h;
  let n = 0;
  for (const pond of ponds || []) {
    const g = pondBedGrid(pond, hm.ground, Math.min(step, 0.5));
    const c0 = Math.max(0, Math.floor((g.x0 - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((g.x0 + (g.cols - 1) * g.step - x0) / step));
    const r0 = Math.max(0, Math.floor((g.z0 - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((g.z0 + (g.rows - 1) * g.step - z0) / step));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const x = x0 + c * step, z = z0 + r * step, k = r * cols + c;
      const b = g.bedAt(x, z);
      if (b < hm.y[k] - 1e-4) { hm.y[k] = b; n++; }
    }
  }
  return n;
}
