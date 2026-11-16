// PARTIAL WALLS OF THE UrbIS 3D SOLIDS (citydefects 2026-11-16, owner image 55: a bright diagonal band across the door of
// Av. J. et P. Carsoel 13). Some solids' wall meshes cover a footprint edge only in part: buildingsolid/538119 has a front
// stepped 33 cm proud of the rest, and its wall there is a 48 cm strip under the flat roof plus ONE diagonal triangle down
// to the ground: the house's real façade (behind it) shows through the hole, the lone triangle cuts across the door.
// Here, per footprint edge of the outer ring: the wall triangles lying on it (all three corners within PLANE m of the
// edge's line, inside its span), their coverage of the edge's wall (samples every 0.25 m along x 0.25 m up, from the
// building's base to the edge's own top, the highest wall point above each sample). Coverage under MIN_COVER with at least
// MIN_HOLE m2 uncovered: the edge's wall is rebuilt as one quad strip following that top line (ground to top), its own
// triangles dropped. Pure (no three.js): viewer/facadeGeom.js uses it (?wallfix=old: off), tools/audit/wallAudit.mjs counts.
const PLANE = 0.2, MIN_COVER = 0.85, MIN_HOLE = 1.0, STEP = 0.25, MIN_EDGE = 0.25, SHORT = 1.0, SHORT_HOLE = 0.3;   // (short edges: the returns of a stepped front, Carsoel 13's 33 cm sides)

/** tris: [{ p: [[x, y, z] x3], n, area }] (the building's wall triangles); ring: [[x, z], ...] its outer footprint;
 *  base: the building's base height. Returns { tris (the repaired list), edges: [{ a, b, cover, hole, rebuilt }] } */
export function repairWalls(tris, ring, base, { fix = true, party = null } = {}) {
  const used = new Set(), out = [], edges = [];
  const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n], L = Math.hypot(bx - ax, bz - az);
    if (L < MIN_EDGE) continue;
    const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
    // the triangles on this edge, in (u along, y) coordinates
    const on = [];
    tris.forEach((t, k) => {
      if (used.has(k) || Math.abs(t.n[1]) > 0.3) return;
      // in the edge's plane (all corners within PLANE of its line); overlapping its span. A triangle that also runs past
      // the span's ends (a wall running on along a collinear neighbour edge: Carsoel 13's ground floor, whose diagonal
      // triangle reached from the rebuilt edge to the next corner) is "over": its part outside the span is kept, clipped
      let ok = true, u0 = Infinity, u1 = -Infinity, dSum = 0;
      for (const q of t.p) {
        const dx = q[0] - ax, dz = q[2] - az, d = dx * nx + dz * nz, u = dx * tx + dz * tz;
        if (Math.abs(d) > PLANE) { ok = false; break; }
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); dSum += d;
      }
      if (!ok || u1 < 0.05 || u0 > L - 0.05) return;
      on.push({ k, q: t.p.map((q) => [(q[0] - ax) * tx + (q[2] - az) * tz, q[1]]), over: u0 < -PLANE || u1 > L + PLANE, d: dSum / 3, n: t.n });
    });
    if (!on.length) continue;
    // the edge's top line: the highest wall point over each u (from the triangles' edges)
    const topAt = (u) => {
      let hi = -Infinity;
      for (const { q } of on) for (let e = 0; e < 3; e++) {
        const A = q[e], B = q[(e + 1) % 3];
        if ((A[0] - u) * (B[0] - u) > 0) continue;
        const y = Math.abs(B[0] - A[0]) < 1e-6 ? Math.max(A[1], B[1]) : A[1] + (B[1] - A[1]) * (u - A[0]) / (B[0] - A[0]);
        if (y > hi) hi = y;
      }
      return hi;
    };
    const inTri = (u, y, q) => {
      const [A, B, C] = q, d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(d) < 1e-9) return false;
      const l1 = ((B[1] - C[1]) * (u - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (u - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
      return l1 >= -1e-4 && l2 >= -1e-4 && 1 - l1 - l2 >= -1e-4;
    };
    // (a stretch with another building against it, party(x, z) true just outside the edge on either side: a party wall
    // its neighbour's own wall closes: not a hole, and a wall rebuilt there would z-fight with the neighbour's)
    let tot = 0, cov = 0, partyN = 0;
    for (let u = Math.min(STEP / 2, L / 2); u < L; u += Math.min(STEP, L / 2)) {
      const top = topAt(u);
      if (!(top > base + 0.3)) continue;
      const px = ax + tx * u, pz = az + tz * u;
      if (party && (party(px + nx * 0.4, pz + nz * 0.4) || party(px - nx * 0.4, pz - nz * 0.4))) { partyN++; continue; }
      for (let y = base + STEP / 2; y < top; y += STEP) { tot++; if (on.some(({ q }) => inTri(u, y, q))) cov++; }
    }
    if (partyN && tot === 0) continue;
    const cover = tot ? cov / tot : 1, hole = (tot - cov) * STEP * STEP;
    // (an edge with a party stretch is left as it is: dropping its triangles would open the wall above the neighbour)
    const bad = cover < MIN_COVER && hole >= (L < SHORT ? SHORT_HOLE : MIN_HOLE) && partyN === 0;
    edges.push({ a: [ax, az], b: [bx, bz], cover: Math.round(cover * 100) / 100, hole: Math.round(hole * 10) / 10, party: partyN > 0, rebuilt: bad && fix });
    if (!bad || !fix) continue;
    // rebuild: a strip of quads every <= 1 m along, from the base to the top line, on the edge's line, facing out
    for (const o of on) {
      used.add(o.k);
      if (!o.over) continue;
      // keep the triangle's parts outside [0, L] (u <= 0 and u >= L), fanned, back in world space on its own plane
      for (const [sg, c] of [[1, 0], [-1, L]]) {          // keep u <= 0: sg = 1 (u - 0 <= 0); keep u >= L: sg = -1
        const poly = clipU(o.q, sg, c);
        if (poly.length < 3) continue;
        const W = poly.map(([u, y]) => [ax + tx * u + nx * o.d, y, az + tz * u + nz * o.d]);
        for (let k2 = 1; k2 + 1 < W.length; k2++) { const A = W[0], B = W[k2], Cc = W[k2 + 1], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
          out.push({ p: [A, B, Cc], n: o.n, area: 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx), clipped: true }); }
      }
    }
    const steps = Math.max(1, Math.ceil(L)), pts = [];
    for (let s = 0; s <= steps; s++) {
      const u = Math.min(L, (L * s) / steps), top = topAt(Math.min(L - 1e-3, Math.max(1e-3, u)));
      pts.push([ax + tx * u, az + tz * u, top > base ? top : base]);
    }
    const sideN = [nx, 0, nz];
    for (let s = 0; s < steps; s++) {
      const [x0, z0, y0] = pts[s], [x1, z1, y1] = pts[s + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (party && (party(mx + nx * 0.4, mz + nz * 0.4) || party(mx - nx * 0.4, mz - nz * 0.4))) continue;   // (a party stretch: the neighbour's)
      const a = [x0, base, z0], b = [x1, base, z1], c = [x1, y1, z1], d = [x0, y0, z0];
      // (wound either way: facadeGeom orients each face outward itself; area for the stats)
      out.push({ p: [a, b, c], n: sideN, area: 0.5 * Math.abs((y1 - base) * Math.hypot(x1 - x0, z1 - z0)), rebuilt: true });
      out.push({ p: [a, c, d], n: sideN, area: 0.5 * Math.abs((y0 - base) * Math.hypot(x1 - x0, z1 - z0)), rebuilt: true });
    }
  }
  tris.forEach((t, k) => { if (!used.has(k)) out.push(t); });
  return { tris: out, edges };
}

/** a polygon in (u, y) clipped to sg * (u - c) <= 0 */
function clipU(poly, sg, c) {
  const out = [], f = (p) => sg * (p[0] - c);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], fa = f(a), fb = f(b);
    if (fb <= 0) { if (fa > 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } out.push(b); }
    else if (fa <= 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
