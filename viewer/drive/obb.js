// Oriented box vs oriented box on the ground plane (separating axes), pure JS, no allocation. Heading h: forward =
// (sin h, cos h), across (left) = (cos h, -sin h); hx across, hz along (half sizes).
// out = the push of box A out of box B (unit normal + depth). (Moved out of traffic/cityTraffic.js for the rail movers.)
const A = new Float64Array(4), B = new Float64Array(4);
export function obbObb(ax, az, ah, ahx, ahz, bx, bz, bh, bhx, bhz, out) {
  A[0] = Math.cos(ah); A[1] = -Math.sin(ah); A[2] = -A[1]; A[3] = A[0];   // A's across axis, along axis
  B[0] = Math.cos(bh); B[1] = -Math.sin(bh); B[2] = -B[1]; B[3] = B[0];
  const dx = ax - bx, dz = az - bz;
  let best = Infinity, nx = 0, nz = 0;
  for (let k = 0; k < 4; k++) {
    const L = k < 2 ? A : B, i = (k % 2) * 2, ux = L[i], uz = L[i + 1];
    const ra = ahx * Math.abs(A[0] * ux + A[1] * uz) + ahz * Math.abs(A[2] * ux + A[3] * uz);
    const rb = bhx * Math.abs(B[0] * ux + B[1] * uz) + bhz * Math.abs(B[2] * ux + B[3] * uz);
    const dist = dx * ux + dz * uz, ov = ra + rb - Math.abs(dist);
    if (ov <= 0) return false;
    if (ov < best) { best = ov; const s = dist >= 0 ? 1 : -1; nx = ux * s; nz = uz * s; }
  }
  out.nx = nx; out.nz = nz; out.depth = best + 1e-4;
  return true;
}
