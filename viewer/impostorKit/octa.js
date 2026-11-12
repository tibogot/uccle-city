// impostorKit / octa.js: the octahedral view grid, ONE source of truth for the bake (CPU) and the material (TSL).
//
// A grid of N x N views on [0, 1]^2, endpoint-inclusive (grid point g / (N - 1)), so the horizon row and the
// zenith exist as real views (the "0 degree row" lesson, docs/IMPOSTORS_RESEARCH.md 3.2.1).
//  - hemi-octahedral (default): the upper hemisphere only, x = u - v, z = u + v - 1, y = 1 - |x| - |z|. Every
//    object type we impostor stands on the ground; directions below the horizon clamp to it.
//  - full octahedral (optional, per type): the lower half folded onto the corners (game-engine-v1
//    v3/render/foliage/octahedralCore.js fullOctaGridToDir / encode, read-only reference).
// Three views per lookup: the grid square split along its diagonal, barycentric weights
// (Brucks / Unreal ImpostorBaker; the same maths as game-engine-v1 octahedralCore.js:543-560 and agargaro's
// octahedral-impostor). The weights are continuous across both the diagonal and the square's edges.
// The frame basis per view: right = cross(upRef, dir), up = cross(dir, right), with upRef leaning from +Y to +Z
// near the zenith (the bake camera's up, so the top view is not rotated: octahedralCore.js planeTangent).
import * as THREE from "three/webgpu";
import { vec2, vec3, float, abs, max, floor, clamp, normalize, cross, select, smoothstep, sign } from "three/tsl";

// ------------------------------------------------------------------------------------------------ CPU
/** Grid point (gx, gy in [0, 1]) -> unit direction (object space, y up). */
export function gridToDir(gx, gy, out = new THREE.Vector3(), full = false) {
  if (!full) {
    out.set(gx - gy, 0, gx + gy - 1);
    out.y = 1 - Math.abs(out.x) - Math.abs(out.z);
    return out.normalize();
  }
  const ox = gx * 2 - 1, oz = gy * 2 - 1, oy = 1 - Math.abs(ox) - Math.abs(oz);
  if (oy >= 0) out.set(ox, oy, oz);
  else out.set((1 - Math.abs(oz)) * (ox >= 0 ? 1 : -1), oy, (1 - Math.abs(ox)) * (oz >= 0 ? 1 : -1));
  return out.normalize();
}
/** Unit direction -> grid coordinates in [0, 1]^2 (the inverse of gridToDir). */
export function dirToGrid(d, full = false) {
  if (!full) {
    const y = Math.max(d.y, 0), L = Math.abs(d.x) + y + Math.abs(d.z);
    const x = d.x / L, z = d.z / L;
    return [(x + z + 1) / 2, (z - x + 1) / 2];
  }
  const L = Math.abs(d.x) + Math.abs(d.y) + Math.abs(d.z);
  let ox = d.x / L, oz = d.z / L;
  if (d.y < 0) { const wx = (1 - Math.abs(oz)) * Math.sign(d.x || 1), wz = (1 - Math.abs(ox)) * Math.sign(d.z || 1); ox = wx; oz = wz; }
  return [(ox + 1) / 2, (oz + 1) / 2];
}
/** The bake camera's up for a view direction (the pole blend). */
export function upRef(dir, out = new THREE.Vector3()) {
  const t = THREE.MathUtils.smoothstep(Math.abs(dir.y), 0.9, 1.0);
  return out.set(0, 1 - t, t);
}
/** The 3 views and weights for a direction: { cells: [[gx, gy] x3] (integers), w: [w0, w1, w2] }. */
export function triangle(d, N, full = false) {
  const [u, v] = dirToGrid(d, full);
  const gx = u * (N - 1), gy = v * (N - 1);
  const x0 = Math.min(Math.max(Math.floor(gx), 0), N - 2), y0 = Math.min(Math.max(Math.floor(gy), 0), N - 2);
  const fx = gx - x0, fy = gy - y0, upper = fx >= fy;
  return {
    cells: [[x0, y0], upper ? [x0 + 1, y0] : [x0, y0 + 1], [x0 + 1, y0 + 1]],
    w: upper ? [1 - fx, fx - fy, fy] : [1 - fy, fy - fx, fx],
  };
}

// ------------------------------------------------------------------------------------------------ TSL
/** Unit direction (y >= 0 for hemi) -> grid coordinates [0, 1]^2. */
export function encodeTSL(d, full = false) {
  if (!full) {
    const y = max(d.y, 0), L = abs(d.x).add(y).add(abs(d.z));
    const x = d.x.div(L), z = d.z.div(L);
    return vec2(x.add(z).add(1).mul(0.5), z.sub(x).add(1).mul(0.5));
  }
  const L = abs(d.x).add(abs(d.y)).add(abs(d.z));
  const ox = d.x.div(L), oz = d.z.div(L);
  const lower = d.y.lessThan(0);
  const wx = float(1).sub(abs(oz)).mul(select(d.x.greaterThanEqual(0), float(1), float(-1)));
  const wz = float(1).sub(abs(ox)).mul(select(d.z.greaterThanEqual(0), float(1), float(-1)));
  return vec2(select(lower, wx, ox), select(lower, wz, oz)).add(1).mul(0.5);
}
/** Integer cell (vec2) -> unit direction. */
export function decodeTSL(cell, N, full = false) {
  const q = cell.div(N - 1);
  if (!full) {
    const x = q.x.sub(q.y), z = q.x.add(q.y).sub(1);
    return normalize(vec3(x, float(1).sub(abs(x)).sub(abs(z)), z));
  }
  const ox = q.x.mul(2).sub(1), oz = q.y.mul(2).sub(1), oy = float(1).sub(abs(ox)).sub(abs(oz));
  const lower = oy.lessThan(0);
  const ux = float(1).sub(abs(oz)).mul(sign(ox)), uz = float(1).sub(abs(ox)).mul(sign(oz));
  return normalize(vec3(select(lower, ux, ox), oy, select(lower, uz, oz)));
}
/** The view's frame: { r, u } (right, up) for a view direction n (object space). */
export function basisTSL(n) {
  const t = smoothstep(0.9, 1.0, abs(n.y));
  const r = normalize(cross(vec3(0, float(1).sub(t), t), n));
  return { r, u: cross(n, r) };
}
/** The 3 views for a direction: { c: [vec2 x3] (integer cells), w: vec3 } (TSL, run it in the vertex stage). */
export function triangleTSL(d, N, full = false) {
  const g = encodeTSL(d, full).mul(N - 1);
  const g0 = clamp(floor(g), 0, N - 2), f = g.sub(g0);
  const upper = f.x.greaterThanEqual(f.y);
  return {
    c: [g0, g0.add(select(upper, vec2(1, 0), vec2(0, 1))), g0.add(vec2(1, 1))],
    w: select(upper, vec3(float(1).sub(f.x), f.x.sub(f.y), f.y), vec3(float(1).sub(f.y), f.y.sub(f.x), f.x)),
  };
}

