// Smooth track centrelines (pure JS): OSM tram tracks are polylines with vertices metres apart in the bends, so the
// rails read as low-poly and a tram following them turns in jumps. smoothPolyline() puts a centripetal Catmull-Rom
// spline through the vertices (alpha 0.5: no overshoot, no cusps on uneven spacing) and resamples it adaptively:
// every `bend` metres where the line turns, every `straight` metres where it doesn't; every original vertex is kept.
// Used by the tile worker for the OSM tram lines (rails, wires, platforms, tram path all share the result).

function catmull(p0, p1, p2, p3, t) {
  const d = (a, b) => Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), 1e-6) ** 0.5;
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb) => [(tb - u) / (tb - ta) * a[0] + (u - ta) / (tb - ta) * b[0], (tb - u) / (tb - ta) * a[1] + (u - ta) / (tb - ta) * b[1]];
  const a1 = L(p0, p1, t0, t1), a2 = L(p1, p2, t1, t2), a3 = L(p2, p3, t2, t3);
  const b1 = L(a1, a2, t0, t2), b2 = L(a2, a3, t1, t3);
  return L(b1, b2, t1, t2);
}

const turnDeg = (a, b, c) => {
  const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
  const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
  if (lu < 1e-9 || lv < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uz * vz) / (lu * lv)))) * 180 / Math.PI;
};

/** [[x, z], ...] -> smoothed [[x, z], ...]. Corners sharper than `corner` degrees stay corners (switches, ends). */
export function smoothPolyline(line, { bend = 0.5, straight = 4, corner = 50 } = {}) {
  const P = line.filter((p, k) => k === 0 || Math.hypot(p[0] - line[k - 1][0], p[1] - line[k - 1][1]) > 0.05);
  if (P.length < 3) return P.map((p) => [p[0], p[1]]);
  const n = P.length, turn = P.map((p, k) => (k > 0 && k < n - 1 ? turnDeg(P[k - 1], p, P[k + 1]) : 0));
  const out = [[P[0][0], P[0][1]]];
  for (let k = 0; k < n - 1; k++) {
    const a = P[k], b = P[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // the spline's end tangents: through the neighbours, or straight on at a line end / sharp corner
    const p0 = k > 0 && turn[k] < corner ? P[k - 1] : [2 * a[0] - b[0], 2 * a[1] - b[1]];
    const p3 = k + 2 < n && turn[k + 1] < corner ? P[k + 2] : [2 * b[0] - a[0], 2 * b[1] - a[1]];
    const bendy = Math.max(turn[k] < corner ? turn[k] : 0, turn[k + 1] < corner ? turn[k + 1] : 0) > 0.5;
    const m = Math.max(1, Math.ceil(L / (bendy ? bend : straight)));
    for (let q = 1; q < m; q++) out.push(catmull(p0, a, b, p3, q / m));
    out.push([b[0], b[1]]);
  }
  return out;
}
