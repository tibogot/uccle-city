// Scalar closest-point routines for the capsule, after Ericson, Real-Time Collision Detection (2005): 5.1.5 closest
// point on a triangle, 5.1.9 closest points of two segments.
//
// ZERO ALLOCATIONS: V8 boxes double arguments and double return values at every call it does not inline, so these
// take only integers / typed arrays and write their results into the shared arrays below:
//   SEG = [px, py, pz, qx, qy, qz]   the query segment (set once per query)
//   segTriClosest(tri, o)            triangle = tri[o .. o + 9)   ->  CP = [segment point xyz, triangle point xyz, d²]

export const SEG = new Float64Array(6);
export const CP = new Float64Array(7);
const PT = new Float64Array(3);        // pointTri input
const Q = new Float64Array(3);         // pointTri result
const S = new Float64Array(7);         // segSeg result: point on SEG, point on the edge, d²

/** Closest point of triangle tri[o..o+9) to PT -> Q. */
function pointTri(tri, o) {
  const px = PT[0], py = PT[1], pz = PT[2];
  const ax = tri[o], ay = tri[o + 1], az = tri[o + 2], bx = tri[o + 3], by = tri[o + 4], bz = tri[o + 5], cx = tri[o + 6], cy = tri[o + 7], cz = tri[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { Q[0] = ax; Q[1] = ay; Q[2] = az; return; }
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { Q[0] = bx; Q[1] = by; Q[2] = bz; return; }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); Q[0] = ax + abx * v; Q[1] = ay + aby * v; Q[2] = az + abz * v; return; }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { Q[0] = cx; Q[1] = cy; Q[2] = cz; return; }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); Q[0] = ax + acx * w; Q[1] = ay + acy * w; Q[2] = az + acz * w; return; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    Q[0] = bx + (cx - bx) * w; Q[1] = by + (cy - by) * w; Q[2] = bz + (cz - bz) * w; return;
  }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  Q[0] = ax + abx * v + acx * w; Q[1] = ay + aby * v + acy * w; Q[2] = az + abz * v + acz * w;
}

/** Closest points of SEG and the edge tri[ia..ia+3) -> tri[ib..ib+3) -> S (S[6] = d²). */
function segSeg(tri, ia, ib) {
  const p1x = SEG[0], p1y = SEG[1], p1z = SEG[2];
  const d1x = SEG[3] - p1x, d1y = SEG[4] - p1y, d1z = SEG[5] - p1z;
  const p2x = tri[ia], p2y = tri[ia + 1], p2z = tri[ia + 2];
  const d2x = tri[ib] - p2x, d2y = tri[ib + 1] - p2y, d2z = tri[ib + 2] - p2z;
  const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
  let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = 0; t = 0; }
  else if (a <= 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); }
  else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
    else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z, den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  S[0] = p1x + d1x * s; S[1] = p1y + d1y * s; S[2] = p1z + d1z * s;
  S[3] = p2x + d2x * t; S[4] = p2y + d2y * t; S[5] = p2z + d2z * t;
  const x = S[0] - S[3], y = S[1] - S[4], z = S[2] - S[5];
  S[6] = x * x + y * y + z * z;
}

function takeS() { for (let k = 0; k < 7; k++) CP[k] = S[k]; }

/**
 * Closest points between SEG and triangle tri[o..o+9) -> CP (CP[6] = d²; 0 when they intersect, CP then holds the
 * crossing point twice).
 */
export function segTriClosest(tri, o) {
  const px = SEG[0], py = SEG[1], pz = SEG[2], qx = SEG[3], qy = SEG[4], qz = SEG[5];
  const ax = tri[o], ay = tri[o + 1], az = tri[o + 2];
  // 1. does the segment cross the triangle? (Möller–Trumbore, t in [0, 1])
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const e1x = tri[o + 3] - ax, e1y = tri[o + 4] - ay, e1z = tri[o + 5] - az, e2x = tri[o + 6] - ax, e2y = tri[o + 7] - ay, e2z = tri[o + 8] - az;
  const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;
  if (det > 1e-12 || det < -1e-12) {
    const inv = 1 / det, sx = px - ax, sy = py - ay, sz = pz - az;
    const u = (sx * hx + sy * hy + sz * hz) * inv;
    if (u >= 0 && u <= 1) {
      const kx = sy * e1z - sz * e1y, ky = sz * e1x - sx * e1z, kz = sx * e1y - sy * e1x;
      const v = (dx * kx + dy * ky + dz * kz) * inv;
      if (v >= 0 && u + v <= 1) {
        const t = (e2x * kx + e2y * ky + e2z * kz) * inv;
        if (t >= 0 && t <= 1) {
          CP[0] = CP[3] = px + dx * t; CP[1] = CP[4] = py + dy * t; CP[2] = CP[5] = pz + dz * t; CP[6] = 0;
          return;
        }
      }
    }
  }
  // 2. else the minimum over: both endpoints vs the triangle, the segment vs the three edges
  PT[0] = px; PT[1] = py; PT[2] = pz; pointTri(tri, o);
  let best = (px - Q[0]) ** 2 + (py - Q[1]) ** 2 + (pz - Q[2]) ** 2;
  CP[0] = px; CP[1] = py; CP[2] = pz; CP[3] = Q[0]; CP[4] = Q[1]; CP[5] = Q[2];
  PT[0] = qx; PT[1] = qy; PT[2] = qz; pointTri(tri, o);
  const d = (qx - Q[0]) ** 2 + (qy - Q[1]) ** 2 + (qz - Q[2]) ** 2;
  if (d < best) { best = d; CP[0] = qx; CP[1] = qy; CP[2] = qz; CP[3] = Q[0]; CP[4] = Q[1]; CP[5] = Q[2]; }
  CP[6] = best;
  segSeg(tri, o, o + 3); if (S[6] < CP[6]) takeS();
  segSeg(tri, o + 3, o + 6); if (S[6] < CP[6]) takeS();
  segSeg(tri, o + 6, o); if (S[6] < CP[6]) takeS();
}
