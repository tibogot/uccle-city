// CENSUS path helpers (claude/roads, class R, docs/ROADS_R.md): the wobble / slalom detector shared by
// tools/audit/census/roads.mjs (the traffic graph's lane paths, the sim's trajectories) and its gate.
//   resample(P, step)  a polyline every `step` m
//   wobble(Q)          per 1 m sample: the lateral deviation from a local quadratic (Savitzky-Golay) over +-SG m, the
//                      fit's curvature, the heading change per metre
//   judge(Q)           2D: wobble samples (|e| >= WOB), slalom samples (two opposite deviations >= FLIP within FLIP_GAP m)
//   judge1(t)          the same on a lateral profile t(s) (1 m apart): a lane's offset in its road's frame
export const SG = 15, WOB = 0.2, FLIP = 0.15, FLIP_GAP = 25, STRAIGHT_R = 150;

// ------------------------------------------------------------------ the wobble / slalom detector (shared with --sim)
/** polyline [[x, z], ...] resampled every `step` m (returns { Q, s }) */
export function resample(P, step = 1) {
  const c = [0]; for (let k = 1; k < P.length; k++) c.push(c[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const L = c[c.length - 1], n = Math.max(1, Math.round(L / step)), Q = [], s = [];
  let k = 1;
  for (let i = 0; i <= n; i++) {
    const d = (L * i) / n;
    while (k < c.length - 1 && c[k] < d) k++;
    const f = (d - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1]);
    Q.push([P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f]); s.push(d);
  }
  return { Q, s, L };
}
/** per sample of Q (1 m apart): e = signed lateral deviation (m) from the local quadratic fit over +-SG samples,
 *  k = the fit's curvature (1/m), h = heading change per metre of Q itself (deg/m). Samples within SG of an end: null. */
export function wobble(Q) {
  const n = Q.length, e = new Array(n).fill(null), kf = new Array(n).fill(null), h = new Array(n).fill(null);
  if (n < 2 * SG + 1) return { e, k: kf, h };
  // Savitzky-Golay quadratic, uniform window 2m+1: smoothed value and 1st / 2nd derivatives at the centre
  const m = SG, S2 = (m * (m + 1) * (2 * m + 1)) / 3, S4 = (m * (m + 1) * (2 * m + 1) * (3 * m * m + 3 * m - 1)) / 15, N = 2 * m + 1;
  for (let i = m; i < n - m; i++) {
    let a0x = 0, a1x = 0, a2x = 0, a0z = 0, a1z = 0, a2z = 0;
    for (let j = -m; j <= m; j++) { const [x, z] = Q[i + j]; a0x += x; a1x += j * x; a2x += j * j * x; a0z += z; a1z += j * z; a2z += j * j * z; }
    // y = c0 + c1 j + c2 j^2: c1 = sum(j y) / S2; c2, c0 from the even moments
    const den = N * S4 - S2 * S2;
    const c2x = (N * a2x - S2 * a0x) / den, c0x = (S4 * a0x - S2 * a2x) / den, c1x = a1x / S2;
    const c2z = (N * a2z - S2 * a0z) / den, c0z = (S4 * a0z - S2 * a2z) / den, c1z = a1z / S2;
    const tl = Math.hypot(c1x, c1z) || 1, tx = c1x / tl, tz = c1z / tl;
    e[i] = (Q[i][0] - c0x) * -tz + (Q[i][1] - c0z) * tx;          // + = left of travel (x east, z south: left normal (tz, -tx))... sign only matters for flips
    kf[i] = (c1x * 2 * c2z - c1z * 2 * c2x) / Math.pow(tl, 3);
  }
  for (let i = 1; i + 1 < n; i++) {
    const h0 = Math.atan2(Q[i][1] - Q[i - 1][1], Q[i][0] - Q[i - 1][0]), h1 = Math.atan2(Q[i + 1][1] - Q[i][1], Q[i + 1][0] - Q[i][0]);
    h[i] = (Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) * 180) / Math.PI;   // per metre (1 m samples)
  }
  return { e, k: kf, h };
}
/** flagged samples of one resampled path: { wob: Set(i), sl: Set(i), straightH: [deg/m...] } */
export function judge(Q) {
  const { e, k, h } = wobble(Q), wob = new Set(), sl = new Set(), straightH = [];
  // extrema of e over FLIP (local max of |e| with one sign)
  const ext = [];
  for (let i = 1; i + 1 < e.length; i++) {
    if (e[i] == null || e[i - 1] == null || e[i + 1] == null) continue;
    if (Math.abs(e[i]) >= WOB) wob.add(i);
    if (Math.abs(e[i]) >= FLIP && Math.abs(e[i]) >= Math.abs(e[i - 1]) && Math.abs(e[i]) >= Math.abs(e[i + 1])) ext.push(i);
    if (k[i] != null && Math.abs(k[i]) < 1 / STRAIGHT_R && h[i] != null) straightH.push(h[i]);
  }
  for (let a = 0; a + 1 < ext.length; a++) {
    const i = ext[a], j = ext[a + 1];
    if (j - i <= FLIP_GAP && Math.sign(e[i]) !== Math.sign(e[j])) for (let q = i; q <= j; q++) sl.add(q);
  }
  return { wob, sl, straightH };
}

/** the same judgement on a 1D lateral profile t (1 m apart): residual from the local quadratic over +-SG samples */
export function judge1(t) {
  const n = t.length, e = new Array(n).fill(null), wob = new Set(), sl = new Set();
  const m = SG, N = 2 * m + 1, S2 = (m * (m + 1) * (2 * m + 1)) / 3, S4 = (m * (m + 1) * (2 * m + 1) * (3 * m * m + 3 * m - 1)) / 15, den = N * S4 - S2 * S2;
  // (a short lane: the window shrinks to what it has, at least +-5 m)
  for (let i = 0; i < n; i++) {
    const h = Math.min(m, i, n - 1 - i); if (h < 5) continue;
    let a0 = 0, a2 = 0, c0;
    if (h === m) { for (let j = -m; j <= m; j++) { a0 += t[i + j]; a2 += j * j * t[i + j]; } c0 = (S4 * a0 - S2 * a2) / den; }
    else { const Nh = 2 * h + 1, S2h = (h * (h + 1) * (2 * h + 1)) / 3, S4h = (h * (h + 1) * (2 * h + 1) * (3 * h * h + 3 * h - 1)) / 15; for (let j = -h; j <= h; j++) { a0 += t[i + j]; a2 += j * j * t[i + j]; } c0 = (S4h * a0 - S2h * a2) / (Nh * S4h - S2h * S2h); }
    e[i] = t[i] - c0;
  }
  const ext = [];
  for (let i = 1; i + 1 < n; i++) {
    if (e[i] == null || e[i - 1] == null || e[i + 1] == null) continue;
    if (Math.abs(e[i]) >= WOB) wob.add(i);
    if (Math.abs(e[i]) >= FLIP && Math.abs(e[i]) >= Math.abs(e[i - 1]) && Math.abs(e[i]) >= Math.abs(e[i + 1])) ext.push(i);
  }
  for (let a = 0; a + 1 < ext.length; a++) { const i = ext[a], j = ext[a + 1]; if (j - i <= FLIP_GAP && Math.sign(e[i]) !== Math.sign(e[j])) for (let q = i; q <= j; q++) sl.add(q); }
  return { e, wob, sl };
}

