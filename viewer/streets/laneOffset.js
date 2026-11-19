// Plain JS, no three.js: used by viewer/traffic/trafficGraph.js (fitToSurface) and viewer/streets/laneGraph.js (keepOnCarriage).
/**
 * CLASS R (claude/roads, rule 38, docs/ROADS_R.md): a lane's sideways offset as a road system lays it, not point by
 * point. The fit above gives each point the shift it NEEDS (off the kerb raster, clear of a parked car); the old
 * smoothing (a +-6 point average, then "never less than the point needs", ramps of 0.2 m/m) moved the lane out round
 * every parked car and back into every gap between two of them: a 1-1.7 m zigzag every 10-20 m (Av. Hippolyte
 * Boulenger, the owner's slalom). Here, as Mr.doob's slop-newyork keeps a lane at ONE offset along an edge (lanes are
 * dropped, never shifted) and as road design joins two offsets by a smooth reverse curve:
 *   1. each sign's need (left / right) is kept as an envelope; a gap under GAP_FILL m between two needs is filled
 *      (a driver passing a row of parked cars does not dive back in between them)
 *   2. dilated by 2 H m along the lane, ramped at most OFF_SLOPE m per m (1:10, 5.7 deg), then box-averaged twice over
 *      +-H m: C1 transitions (quadratic / cubic blends), never under the need anywhere (every average window lies on
 *      the dilated plateau around a need)
 * -> offsets (m, + = the left normal), per point of the lane (cum: its cumulative length).
 */
export const GAP_FILL = 30, OFF_SLOPE = 0.1, OFF_H = 4;
export function laneOffsetProfile(need, cum, { gap = GAP_FILL, h = OFF_H, slope = OFF_SLOPE } = {}) {
  const n = need.length, out = new Float32Array(n);
  const env = (sg) => {
    let e = Float64Array.from(need, (v) => (v * sg > 0 ? Math.abs(v) : 0));
    if (!e.some((v) => v > 0)) return null;
    // 1. gaps under GAP_FILL between two needs: the lower of the two ends, held
    let last = -1;
    for (let k = 0; k < n; k++) {
      if (!(e[k] > 0)) continue;
      if (last >= 0 && k > last + 1 && cum[k] - cum[last] < gap) { const v = Math.min(e[last], e[k]); for (let m = last + 1; m < k; m++) e[m] = v; }
      last = k;
    }
    // 2. dilate by 2 H (a max over +-2 H), ramp at OFF_SLOPE, average twice over +-H
    const dil = new Float64Array(n);
    for (let k = 0, a = 0, b = 0; k < n; k++) {
      while (cum[k] - cum[a] > 2 * h) a++;
      while (b + 1 < n && cum[b + 1] - cum[k] <= 2 * h) b++;
      let m = 0; for (let j = a; j <= b; j++) if (e[j] > m) m = e[j]; dil[k] = m;
    }
    const ramp = Float64Array.from(dil);
    for (let k = 1; k < n; k++) ramp[k] = Math.max(ramp[k], ramp[k - 1] - slope * (cum[k] - cum[k - 1]));
    for (let k = n - 2; k >= 0; k--) ramp[k] = Math.max(ramp[k], ramp[k + 1] - slope * (cum[k + 1] - cum[k]));
    const box = (v) => {
      const o = new Float64Array(n);
      for (let k = 0, a = 0, b = 0; k < n; k++) {
        while (cum[k] - cum[a] > h) a++;
        while (b + 1 < n && cum[b + 1] - cum[k] <= h) b++;
        // (length-weighted: points are not evenly spaced)
        let s = 0, w = 0;
        for (let j = a; j <= b; j++) { const ww = (cum[Math.min(n - 1, j + 1)] - cum[Math.max(0, j - 1)]) || 1; s += v[j] * ww; w += ww; }
        o[k] = s / w;
      }
      return o;
    };
    e = box(box(ramp));
    for (let k = 0; k < n; k++) if (e[k] < Math.abs(need[k]) && need[k] * sg > 0) e[k] = Math.abs(need[k]);   // (guard: the lane's ends, where a window runs out)
    return e;
  };
  const P = env(1), N = env(-1);
  for (let k = 0; k < n; k++) { const a = P ? P[k] : 0, b = N ? N[k] : 0; out[k] = a >= b ? a : -b; }
  // (needs on BOTH sides along one lane (a lane off any carriageway, the fit finding room left here, right there): the
  // switch from one side to the other is held to the same slope and blend, never a jump; the needs there are not met)
  if (P && N) {
    for (let k = 1; k < n; k++) { const m = slope * (cum[k] - cum[k - 1]); out[k] = Math.min(out[k - 1] + m, Math.max(out[k - 1] - m, out[k])); }
    for (let k = n - 2; k >= 0; k--) { const m = slope * (cum[k + 1] - cum[k]); out[k] = Math.min(out[k + 1] + m, Math.max(out[k + 1] - m, out[k])); }
  }
  return out;
}

