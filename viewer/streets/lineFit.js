// THE LANE PAINT ON THE MEASURED CARRIAGEWAY (claude/markings, census class F, rule 33 provisional). Plain JS, runs in
// the tile worker and in node.
//
// WHY. The lines along a road (centre, lane, bike, parking, edge) are painted by the asphalt shader on the road engine's
// lane strips (vendor/roads laneRoadMesh, aEdges: a stroke at the strip's lateral t). The engine sweeps those strips
// from the OSM centre line with ONE lane stack per road: fitRoadWidths (viewer/surfaces.js) scales it to the MEDIAN
// kerb-to-kerb width of the whole road, and leaves one-way stacks as tagged. Wherever the measured street is not that
// median (the OSM line drifting to one side, the street narrowing / widening, a one-way street half as wide as its OSM
// stack) the lines run on the sidewalk, along the kerb, or diagonally across the carriageway (owner playtest
// 2026-11-18: "in some parts of roads the white lines go totally wrong"; census F: 6.0 km off the street, 0.96 km on a
// kerb, 0.41 km skewed).
//
// FIX. Before the measured overlay (viewer/surfaces.js buildSurfaceRoads), every lane-strip vertex of the engine's
// asphalt moves ACROSS its road (along the alignment's normal, its uv untouched, so its lines move with it) so the
// strip's carriageway [curbR, curbL] lands on the MEASURED carriageway at that station: at every engine sample the
// carriage interval round the centre line is measured along the normal (the class raster, its ends refined on the
// exact kerb / street-edge lines), the two end offsets are smoothed along the road (a 30 m running median of the valid
// samples, then a 12 m mean, slope <= 1:8, no sample in a junction mouth or > 1.5 m off the road's median: the lines follow the street, not every bulb-out or lay-by), and the lane
// stack is stretched linearly between them (a lane keeps its share of the width; nothing folds: the map is monotonic).
// What still leaves the carriageway (a kerb extension, a junction mouth) is clipped in buildSurfaceRoads (its pieces on
// a sidewalk / median / square / tram site carry no line codes). The traffic lanes (net) are not moved.
// ?roadlines=old: off (viewer/features.js).
//
// NO LINE RATHER THAN A WRONG LINE (claude/street1, rule street-invariants, docs/STREET_MODEL_PLAN.md 3 "conservative
// fallbacks"; ?streetinv=old = before). Where the fit has no measurement the smoothed stack is a guess, and where the OSM
// line lies more than X_OFF outside the measured carriageway (confidence X) the guess shows through (the owner's
// Ch. de Saint-Job / Rue Engeland diagonal, E7 r71812634_1). So:
//   - an EDGE line is painted only as an offset of a measured kerb: at a station whose side has a raw kerb measurement
//     within +-EDGE_WIN that agrees with the line's kerb within EDGE_TOL (junction mouths measured for this too), and
//     the station is not X; else nothing (short pieces and funnels included);
//   - an edge line the strip would hold more than EDGE_TOL off its kerb offset (the kerb runs out of the lagging
//     strip: the Saint-Job / Engeland edge line, 1.7 m off the kerb) is not painted there;
//   - a lane / centre line is not painted at an X station, nor where the stack LAGS the measured carriageway (both
//     measured kerbs more than LAG off the stack's ends, the same way: the street shifted under it);
//   - a road the fit cannot measure whose centre line lies on the measured street is unpainted at ANY length when its
//     confidence is low (a third of its measured-street samples X; the SHORT_ROAD limit of rule 38 was for short
//     pieces only).
// A cut line's width goes to 0 at the vertex (its dash / colour kept), so it tapers out over one strip row.
import { evalAlignment } from "../../vendor/roads/roadAlignment.js";
import { layoutEdges, LANE_TYPES } from "../../vendor/roads/roadCrossSection.js";
import { roadMembers } from "./roadBends.js";
import { hashPhase } from "../roadData.js";

const CARR = new Set([0, 1, 2, 3]);     // roadway, tram roadway, tram site, parking: the carriageway (as fitRoadWidths)
const STEP = 0.1;                        // m: raster walk along the normal
const REACH = 25;                        // m: farthest kerb looked for
const FIND = 6;                          // m: a centre line off the carriageway looks this far for it
const MAX_D = 6;                         // m: a measured end farther than this from the engine's is not this road's
const WIN_MED = 15, WIN_MEAN = 6;        // m: half windows of the median / mean along the road
const SLOPE = 0.125;                     // the end offsets change at most 1 m per 8 m along the road (7 deg)
const MOUTH = 6;                         // m: samples this near a road end are not measured (junction mouths)
const JOIN = 20;                         // m: a way split's step is faded out over this along each road
const OUTLIER = 1.5;                     // m: a sample this far off the road's median shift is not used
const MIN_SHARE = 0.45;
const EDGE_IN = 0.3;                     // m: an edge line's centre inside the kerb / street edge
const PARK_W = 2.0;                      // m: a painted parking lane keeps at least this (a parked car's width + margin)
const EDGE_WIN = 3;                      // m: half window of the edge lines' kerb median
const X_OFF = 1.5;                       // m: the OSM line this far outside the measured carriageway = confidence X (street1)
const EDGE_TOL = 0.25;                   // m: a raw kerb measurement this near the edge line's kerb is "measured there" (street1)
const NEAR_KERB = 0.5;                   // m: an unmeasured road's line this near a measured kerb is not painted (street1)
const LAG = 0.5;                         // m: both kerbs this far off the stack's ends, the same way = the stack lags (street1)

/** segments of the kerb and street-edge lines in an 8 m grid: { hit(x, z, nx, nz, t0, t1) -> t | null } */
function lineGrid(lines) {
  const g = new Map(), K = (i, j) => i * 65536 + j;
  for (const l of lines) for (let k = 1; k < l.length; k++) {
    const [ax, az] = l[k - 1], [bx, bz] = l[k];
    for (let i = Math.floor(Math.min(ax, bx) / 8); i <= Math.floor(Math.max(ax, bx) / 8); i++)
      for (let j = Math.floor(Math.min(az, bz) / 8); j <= Math.floor(Math.max(az, bz) / 8); j++) { const q = K(i, j); (g.get(q) || g.set(q, []).get(q)).push([ax, az, bx, bz]); }
  }
  /** the crossing of the ray x + n t, t in [t0, t1], with a line nearest to tc */
  const hit = (x, z, nx, nz, t0, t1, tc) => {
    const px = x + nx * tc, pz = z + nz * tc, i0 = Math.floor(px / 8), j0 = Math.floor(pz / 8);
    let best = null, bd = Infinity;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const [ax, az, bx, bz] of g.get(K(i0 + di, j0 + dj)) || []) {
      const sx = bx - ax, sz = bz - az, d = nx * sz - nz * sx;
      if (Math.abs(d) < 1e-9) continue;
      const qx = ax - x, qz = az - z, t = (qx * sz - qz * sx) / d, w = (qx * nz - qz * nx) / d;
      if (w < 0 || w > 1 || t < t0 || t > t1) continue;
      if (Math.abs(t - tc) < bd) { bd = Math.abs(t - tc); best = t; }
    }
    return best;
  };
  return { hit };
}

/** the carriage interval [lo, hi] along x + n t round t = 0 (or the nearest carriage within FIND), ends refined on the
 *  kerb / edge lines; an end that runs out of reach is null */
function interval(classAt, lg, x, z, nx, nz, parkL = true, parkR = true) {
  const C = (t) => CARR.has(classAt(x + nx * t, z + nz * t));
  // (markings round 2: a side whose stack has no parking lane ends where measured parking bays begin: the bays hold
  // parked cars, not the stack's driving lane)
  const CL = parkL ? C : (t) => { const c = classAt(x + nx * t, z + nz * t); return c !== 3 && CARR.has(c); };
  const CR = parkR ? C : (t) => { const c = classAt(x + nx * t, z + nz * t); return c !== 3 && CARR.has(c); };
  let t0 = null;
  for (let d = 0; d <= FIND && t0 == null; d += STEP) { if (C(d)) t0 = d; else if (C(-d)) t0 = -d; }
  if (t0 == null) return null;
  const tc = t0;
  let hi = t0, lo = t0;
  while (hi < t0 + REACH && CL(hi + STEP)) hi += STEP;
  while (lo > t0 - REACH && CR(lo - STEP)) lo -= STEP;
  // (markings round 2: a tram road band BETWEEN two roadway parts is a tram reservation in the middle of a dual
  // carriageway (Avenue Churchill: its tree rows stand on it), not this road's lanes: the interval stops where it begins.
  // A road whose own centre lies on the tram road (street running, Alsemberg) or a tram road reaching the kerb keep it)
  const cutTram = (from, to, dir) => {
    if (classAt(x + nx * from, z + nz * from) === 1) return null;
    let enter = null;
    for (let t = from; dir > 0 ? t <= to : t >= to; t += dir * STEP) {
      const c = classAt(x + nx * t, z + nz * t);
      if (c === 1 && enter == null) enter = t;
      else if (c === 0 && enter != null) return enter - dir * STEP / 2;
    }
    return null;
  };
  const cHi = cutTram(t0, hi, 1), cLo = cutTram(t0, lo, -1);
  const ref = (e, dir) => { const t = lg.hit(x, z, nx, nz, e - 0.6, e + 0.6, e + dir * STEP / 2); return t ?? e + dir * STEP / 2; };
  return { t0: tc, lo: cLo != null ? cLo : lo <= t0 - REACH ? null : ref(lo, -1), hi: cHi != null ? cHi : hi >= t0 + REACH ? null : ref(hi, 1) };
}

/** robust smoothing of v (null = no measurement) over stations s: running median (+-WIN_MED), running mean (+-WIN_MEAN),
 *  slope-limited both ways; all null -> null */
function smooth(s, v) {
  const n = s.length, med = new Array(n).fill(null);
  if (!v.some((q) => q != null)) return null;
  for (let i = 0; i < n; i++) {
    let w = [];
    for (let j = 0; j < n; j++) if (v[j] != null && Math.abs(s[j] - s[i]) <= WIN_MED) w.push(v[j]);
    if (!w.length) { let bj = -1; for (let j = 0; j < n; j++) if (v[j] != null && (bj < 0 || Math.abs(s[j] - s[i]) < Math.abs(s[bj] - s[i]))) bj = j; w = [v[bj]]; }
    w.sort((a, b) => a - b); med[i] = w[w.length >> 1];
  }
  const out = med.map((_, i) => { let a = 0, k = 0; for (let j = 0; j < n; j++) if (Math.abs(s[j] - s[i]) <= WIN_MEAN) { a += med[j]; k++; } return a / k; });
  for (let i = 1; i < n; i++) { const m = SLOPE * (s[i] - s[i - 1]); out[i] = Math.min(out[i - 1] + m, Math.max(out[i - 1] - m, out[i])); }
  for (let i = n - 2; i >= 0; i--) { const m = SLOPE * (s[i + 1] - s[i]); out[i] = Math.min(out[i + 1] + m, Math.max(out[i + 1] - m, out[i])); }
  return out;
}

/** class R (claude/roads, rule 38, docs/ROADS_R.md): the robust smoothing above as a robust LOCAL LINE. The running
 *  median holds a constant: where the OSM line meets the measured carriageway at an angle (the kerb offset growing
 *  along the road) it lagged the trend, and on a short road (every sample within one window of an end, the MOUTH
 *  samples unmeasured) it held one value for the whole road: the lines stayed parallel to the OSM line and ran
 *  diagonally across the lane into the kerb (Av. du Prince de Ligne r220837890, J5 1590, 363: census F "skew").
 *  Here each sample takes the Theil-Sen line of the valid samples within +-WIN_MED (the median of the pairwise slopes,
 *  then the median intercept: robust to bulb-outs and lay-bys like the median), evaluated at its own station, so a
 *  trend is followed and carried into the unmeasured ends; then the same mean, and the slope limit at TREND_SLOPE
 *  (1:5, 11 deg: what the line may turn against the OSM line, the 1:8 cap held the skew). */
const TREND_SLOPE = 0.2, SHORT_ROAD = 2 * (WIN_MED + MOUTH), FUNNEL_W = 2;   // (42 m)
function smoothTrend(s, v) {
  const n = s.length;
  if (!v.some((q) => q != null)) return null;
  const val = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const J = []; for (let j = 0; j < n; j++) if (v[j] != null && Math.abs(s[j] - s[i]) <= WIN_MED) J.push(j);
    if (J.length < 3) { let bj = -1; for (let j = 0; j < n; j++) if (v[j] != null && (bj < 0 || Math.abs(s[j] - s[i]) < Math.abs(s[bj] - s[i]))) bj = j; val[i] = v[bj]; continue; }
    const sl = [];
    for (let a = 0; a < J.length; a++) for (let b = a + 1; b < J.length; b++) { const ds = s[J[b]] - s[J[a]]; if (Math.abs(ds) > 1e-6) sl.push((v[J[b]] - v[J[a]]) / ds); }
    sl.sort((a, b) => a - b);
    const m = sl.length ? Math.max(-TREND_SLOPE, Math.min(TREND_SLOPE, sl[sl.length >> 1])) : 0;
    const ic = J.map((j) => v[j] - m * (s[j] - s[i])).sort((a, b) => a - b);
    val[i] = ic[ic.length >> 1];
  }
  const out = val.map((_, i) => { let a = 0, k = 0; for (let j = 0; j < n; j++) if (Math.abs(s[j] - s[i]) <= WIN_MEAN) { a += val[j]; k++; } return a / k; });
  for (let i = 1; i < n; i++) { const mm = TREND_SLOPE * (s[i] - s[i - 1]); out[i] = Math.min(out[i - 1] + mm, Math.max(out[i - 1] - mm, out[i])); }
  for (let i = n - 2; i >= 0; i--) { const mm = TREND_SLOPE * (s[i + 1] - s[i]); out[i] = Math.min(out[i + 1] + mm, Math.max(out[i + 1] - mm, out[i])); }
  return out;
}

/**
 * The fit of every road's lane stack onto the measured carriageway: { fitOf: road index -> per-sample shifts of its
 * two carriage ends, st }. surf: the tile's surfaces (kerbs, edges, after prepareSurfaces); prep: prepareSurfaces'
 * result (classAt). Applied to the asphalt strips by fitLinesToStreet, to the lane graph by laneShifter.
 */
export function measureLineFit(net, prep, surf, opts = {}) {
  const R38 = opts.roadsR !== false, INV = opts.streetInv !== false;
  const st = { roads: 0, fitted: 0, moved: 0, meanShift: 0, maxShift: 0, edgeIn: 0, lanes: 0, lanePts: 0 };
  const fitOf = new Map();
  const unpaint = new Set(), edgeOff = new Map();
  if (!prep) return { fitOf, st, unpaint, edgeOff };
  const lg = lineGrid([...(surf?.kerbs || []), ...(surf?.edges || []).map((e) => e.line)]);
  // per road: the smoothed shifts of its two carriage ends at its samples
  net.roads.forEach((rr, ri) => {
    const S = rr.smp;
    if (!S || !rr.lays || !rr.al || S.s.length < 2) return;
    st.roads++;
    const n = S.s.length, dL = new Array(n).fill(null), dR = new Array(n).fill(null), eL = new Float64Array(n), eR = new Float64Array(n);
    // (street1: the raw kerb ends at every sample, mouths included, and the confidence X, for the edge-line test)
    const rL = new Array(n).fill(null), rR = new Array(n).fill(null), X = new Uint8Array(n);
    let any = 0;
    for (let i = 0; i < n; i++) {
      const e = layoutEdges(rr.lays[i]); eL[i] = e.curbL; eR[i] = e.curbR;
      if (!prep.inside(S.x[i], S.z[i])) continue;
      // (a junction mouth: the side street's carriageway runs on past the kerb line; the ends hold their neighbours')
      const mouth = S.s[i] - S.s[0] < MOUTH || S.s[n - 1] - S.s[i] < MOUTH;
      if (mouth && !INV) continue;
      const park = (side) => (rr.lays[i][side] || []).some((l) => l.present && l.type === "parking");
      const iv = interval(prep.classAt, lg, S.x[i], S.z[i], Math.sin(S.th[i]), -Math.cos(S.th[i]), park("left"), park("right"));
      if (INV) {
        if (prep.classAt(S.x[i], S.z[i]) >= 0 && (!iv || Math.abs(iv.t0) > X_OFF)) X[i] = 1;
        if (iv?.hi != null && Math.abs(iv.hi - e.curbL) < MAX_D) rL[i] = iv.hi - e.curbL;
        if (iv?.lo != null && Math.abs(iv.lo - e.curbR) < MAX_D) rR[i] = iv.lo - e.curbR;
      }
      if (!iv || mouth) continue;
      if (iv.hi != null && Math.abs(iv.hi - e.curbL) < MAX_D) { dL[i] = iv.hi - e.curbL; any++; }
      if (iv.lo != null && Math.abs(iv.lo - e.curbR) < MAX_D) { dR[i] = iv.lo - e.curbR; any++; }
    }
    // a road measured at fewer than a third of its samples keeps the engine's lines (UrbIS does not map it here)
    if (any < Math.max(2, (2 * n) / 3)) {
      // class R (rule 38, docs/ROADS_R.md 8): a road whose centre line lies ON the measured street but whose kerbs the
      // fit cannot find (the OSM line more than MAX_D off them, a short piece in a junction: Ch. de Saint-Job E7
      // r1156334403_1 at the Rue Papenkasteel junction, the owner's diagonal dashes) has no measured place for its
      // lines: the engine's would run along the OSM line, across the street. They are not painted (unpaint)
      // (short pieces only: a longer road that the fit misses in places (a tram reservation, gaps) keeps the engine's lines)
      // (street1: at any length when the fit cannot measure it AND its confidence is low: a third or more of its samples
      // on the measured street are X, the OSM line > X_OFF outside the carriageway. A long road the fit misses for a
      // tram reservation (Av. Churchill, Montjoie) keeps the engine's lines: they lie on its carriageway)
      let xs = 0, ins = 0; if (INV) for (let i = 0; i < n; i++) if (prep.inside(S.x[i], S.z[i]) && prep.classAt(S.x[i], S.z[i]) >= 0) { ins++; xs += X[i]; }
      if (R38 && (S.s[n - 1] - S.s[0] < SHORT_ROAD || (INV && ins && xs >= ins / 3))) { let on = 0, inside = 0; for (let i = 0; i < n; i++) { if (!prep.inside(S.x[i], S.z[i])) continue; inside++; if (prep.classAt(S.x[i], S.z[i]) >= 0) on++; } if (inside && on >= inside / 3) unpaint.add(ri); }
      // (street1: an unmeasured road on the measured street keeps its lane lines, but its EDGE lines are the guessed
      // stack's: not painted (edge lines only as offsets of measured kerbs). The D7 seam-cut dashed kerb line: D7
      // rebuilds E7's Saint-Job from its own clipped raster, finds too few samples, kept the engine's kerb line)
      else if (INV && R38) { let on = 0, inside = 0; for (let i = 0; i < n; i++) { if (!prep.inside(S.x[i], S.z[i])) continue; inside++; if (prep.classAt(S.x[i], S.z[i]) >= 0) on++; } if (inside && on >= inside / 3) edgeOff.set(ri, { eL, eR }); }
      return;
    }
    // a sample more than OUTLIER off the road's own median shift is a lay-by, a bus bay or a side street: not the street
    const cut = (v) => { const w = v.filter((q) => q != null).sort((a, b) => a - b); if (!w.length) return v; const m = w[w.length >> 1]; return v.map((q) => (q != null && Math.abs(q - m) <= OUTLIER ? q : null)); };
    // (rule 38: the outliers are judged against the road's own robust LINE, not its median: a road whose kerb offset
    // grows along it kept only its middle samples)
    const cutLine = (v) => { const J = v.map((q, j) => (q != null ? j : -1)).filter((j) => j >= 0); if (J.length < 3) return cut(v);
      const sl = []; for (let a = 0; a < J.length; a++) for (let b = a + 1; b < J.length; b++) { const ds = S.s[J[b]] - S.s[J[a]]; if (Math.abs(ds) > 1e-6) sl.push((v[J[b]] - v[J[a]]) / ds); }
      sl.sort((a, b) => a - b); const m = Math.max(-TREND_SLOPE, Math.min(TREND_SLOPE, sl[sl.length >> 1] ?? 0));
      const ic = J.map((j) => v[j] - m * S.s[j]).sort((a, b) => a - b), c0 = ic[ic.length >> 1];
      return v.map((q, j) => (q != null && Math.abs(q - (c0 + m * S.s[j])) <= OUTLIER ? q : null)); };
    // (only on a SHORT road, where every sample is within one median window of an end: a longer road keeps the median,
    // its trend-following there tilted the lines at junction flares: Av. de Boitsfort K4, Av. Brugmann F1)
    const short = R38 && S.s[n - 1] - S.s[0] < SHORT_ROAD;
    const sL = short ? smoothTrend(S.s, cutLine(dL)) : smooth(S.s, cut(dL)), sR = short ? smoothTrend(S.s, cutLine(dR)) : smooth(S.s, cut(dR));
    const L = sL ?? new Array(n).fill(0), R = sR ?? new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      // never squeeze the stack under MIN_SHARE of its width (a measurement gone wrong): scale both shifts back
      const w0 = eL[i] - eR[i], w1 = w0 + L[i] - R[i];
      if (w0 > 0.5 && w1 < MIN_SHARE * w0) { const f = (w0 * (1 - MIN_SHARE)) / Math.max(1e-6, R[i] - L[i]); L[i] *= f; R[i] *= f; }
    }
    // the edge lines follow the kerb closer than the stack: a +-EDGE_WIN median of the raw ends (no measurement: the stack's)
    const near = (v, sm) => S.s.map((s0, i) => { const w = []; for (let j = 0; j < n; j++) if (v[j] != null && Math.abs(S.s[j] - s0) <= EDGE_WIN) w.push(v[j]); if (!w.length) return sm[i]; w.sort((a, b) => a - b); return w[w.length >> 1]; });
    // class R (rule 38, docs/ROADS_R.md 8): a JUNCTION FUNNEL. A short road (under SHORT_ROAD) whose measured
    // carriageway changes width by more than FUNNEL_W m along it (a flare into a junction, the split round a refuge
    // island: Av. du Prince de Ligne r220837890, J5 1590, 362, the owner's line twice) is not a stretch with lanes: the
    // engine's lane strips run straight along the OSM line through it and no smoothing of two edges makes a lane line
    // follow a flare, so its lane / centre lines ran diagonally across the funnel. As painted in Brussels, the lane
    // lines stop at the junction mouth: in a funnel only the EDGE lines are painted (fitLinesToStreet), along the kerbs
    let funnel = false;
    if (R38 && S.s[n - 1] - S.s[0] < SHORT_ROAD) {
      const W = []; for (let i = 0; i < n; i++) if (dL[i] != null && dR[i] != null) W.push(eL[i] + dL[i] - (eR[i] + dR[i]));
      if (W.length >= 3 && Math.max(...W) - Math.min(...W) > FUNNEL_W) { funnel = true; st.funnels = (st.funnels || 0) + 1; }
    }
    const kL = near(dL, L), kR = near(dR, R);
    // (street1) an edge line is measured at sample i when a raw kerb end within +-EDGE_WIN agrees with its kerb there
    const okOf = (raw, k) => { const ok = new Uint8Array(n); for (let i = 0; i < n; i++) { if (X[i]) continue; for (let j = 0; j < n; j++) if (raw[j] != null && Math.abs(S.s[j] - S.s[i]) <= EDGE_WIN && Math.abs(raw[j] - k[i]) <= EDGE_TOL) { ok[i] = 1; break; } } return ok; };
    // (street1) the stack LAGS the measured carriageway: both measured kerbs off the stack's ends by more than LAG the
    // same way (the street shifted, not widened: the owner's Saint-Job / Engeland diagonal, 5 deg): its lane / centre
    // lines are the guess there
    const lag = new Uint8Array(n);
    if (INV) for (let i = 0; i < n; i++) { const a = kL[i] - L[i], b = kR[i] - R[i]; if (a * b > 0 && Math.min(Math.abs(a), Math.abs(b)) > LAG) lag[i] = 1; }
    fitOf.set(ri, { L, R, eL, eR, kL, kR, funnel, ...(INV ? { okL: okOf(rL, kL), okR: okOf(rR, kR), X, lag } : {}) });
    st.fitted++;
  });
  // a road that goes on as another (an OSM way split: a node with just those two roads): both fits meet at one place,
  // the painted lines and the lanes go on without a step. The carriage edges' plan offsets at the node are averaged
  // (in the first road's frame; a road leaving the node the other way has its left / right swapped and its normal
  // turned) and each road's ends take the difference, faded out over JOIN m
  const ends = new Map();
  net.roads.forEach((rr, ri) => { if (!fitOf.has(ri)) return; for (const [nd, atEnd] of [[rr.src?.a, false], [rr.src?.b, true]]) { if (nd == null) continue; (ends.get(nd) || ends.set(nd, []).get(nd)).push({ ri, atEnd }); } });
  const deg = new Map();
  for (const rr of net.roads) for (const nd of [rr.src?.a, rr.src?.b]) if (nd != null) deg.set(nd, (deg.get(nd) || 0) + 1);
  for (const [nd, E] of ends) {
    if (E.length !== 2 || deg.get(nd) !== 2) continue;
    const [A, B] = E, fa = fitOf.get(A.ri), fb = fitOf.get(B.ri);
    const ia = A.atEnd ? fa.L.length - 1 : 0, ib = B.atEnd ? fb.L.length - 1 : 0;
    // the edges' offsets in a frame along the travel A -> B: A's left normal if A ends here, else turned
    const sa = A.atEnd ? 1 : -1, sb = B.atEnd ? -1 : 1;
    const edges = (f, i, sg) => { const l = f.eL[i] + f.L[i], r = f.eR[i] + f.R[i]; return sg > 0 ? [l, r] : [-r, -l]; };
    const [al, ar] = edges(fa, ia, sa), [bl, br] = edges(fb, ib, sb);
    const ml = (al + bl) / 2, mr = (ar + br) / 2;
    // corrections back in each road's own frame (left, right)
    const corr = (sg, l, r) => (sg > 0 ? [ml - l, mr - r] : [-(mr - r), -(ml - l)]);
    for (const [f, i, c, rr] of [[fa, ia, corr(sa, al, ar), net.roads[A.ri]], [fb, ib, corr(sb, bl, br), net.roads[B.ri]]]) {
      const S = rr.smp, s0 = S.s[i];
      for (let k = 0; k < S.s.length; k++) { const w = Math.max(0, 1 - Math.abs(S.s[k] - s0) / JOIN); if (!w) continue; f.L[k] += c[0] * w; f.R[k] += c[1] * w; }
    }
    st.joined = (st.joined || 0) + 1;
  }
  // browser turn: stretched linearly, a narrow street squeezed its parking lane under a car's width (Av. Henri
  // Elleboudt: the parked cars stood on the painted line). Each sample's lanes are laid out again across the fitted
  // carriageway: a parking lane keeps min(its width, PARK_W), the other lanes share the rest by their widths (all
  // linear again where the rest would fall under half its engine width)
  for (const [ri, f] of fitOf) {
    const rr = net.roads[ri];
    // (one mode per road: a road switching between the two layouts from one sample to the next drew its lines
    // diagonally across the switch)
    let anyLinear = false;
    const lay2 = rr.lays.map((lay, i) => {
      const iv = [];
      for (const l of lay.right || []) if (l.present && LANE_TYPES[l.type]?.carriage) iv.push([Math.min(l.tIn, l.tOut), Math.max(l.tIn, l.tOut), l.type]);
      for (const l of lay.left || []) if (l.present && LANE_TYPES[l.type]?.carriage) iv.push([Math.min(l.tIn, l.tOut), Math.max(l.tIn, l.tOut), l.type]);
      iv.sort((a, b) => a[0] - b[0]);
      const e = [f.eR[i]];
      const type = [];
      for (const [a, b, ty] of iv) { if (a > e[e.length - 1] + 1e-3) { e.push(a); type.push("centre"); } if (b > e[e.length - 1] + 1e-3) { e.push(b); type.push(ty); } }
      if (f.eL[i] > e[e.length - 1] + 1e-3) { e.push(f.eL[i]); type.push("centre"); }
      const lo = f.eR[i] + f.R[i], hi = f.eL[i] + f.L[i], W0 = e[e.length - 1] - e[0], W1 = hi - lo;
      const w0 = type.map((_, k) => e[k + 1] - e[k]);
      const fixed = type.map((ty, k) => (ty === "parking" ? Math.min(w0[k], PARK_W) : null));
      const fx0 = w0.reduce((a, w, k) => a + (fixed[k] != null ? w : 0), 0), fx1 = fixed.reduce((a, w) => a + (w ?? 0), 0);
      const rest = (W1 - fx1) / Math.max(1e-6, W0 - fx0);
      if (fx0 && (W0 - fx0 < 0.5 || rest < 0.5)) anyLinear = true;
      return { e, type, w0, fixed, rest, lo, W0, W1 };
    });
    f.B = lay2.map(({ e, type, w0, fixed, rest, lo, W0, W1 }) => {
      const linear = anyLinear || !fixed.some((x) => x != null);
      const n = [lo];
      for (let k = 0; k < type.length; k++) n.push(n[k] + (linear ? (w0[k] * W1) / Math.max(1e-6, W0) : fixed[k] ?? w0[k] * rest));
      return { e, n };
    });
  }
  st.unpainted = unpaint.size;
  st.edgeOffRoads = edgeOff.size;
  return { fitOf, st, unpaint, edgeOff, lg, classAt: prep.classAt };
}

/** the shift of uv t at sample i of fit f (its lane layout B[i]; beyond the carriageway the nearer end's) */
function shiftI(f, i, t) {
  const B = f.B?.[i];
  if (!B) { const eL = f.eL[i], eR = f.eR[i], dL = f.L[i], dR = f.R[i]; return t >= eL ? dL : t <= eR ? dR : dR + ((t - eR) / Math.max(1e-6, eL - eR)) * (dL - dR); }
  const { e, n } = B, m = e.length - 1;
  if (t <= e[0]) return n[0] - e[0];
  if (t >= e[m]) return n[m] - e[m];
  let k = 0; while (k < m - 1 && e[k + 1] < t) k++;
  const a = (t - e[k]) / Math.max(1e-9, e[k + 1] - e[k]);
  return n[k] + (n[k + 1] - n[k]) * a - t;
}

/** the lateral shift (m, along the road's left normal) of uv (s, t) on a fitted road: linear across the carriageway
 *  [eR, eL] -> [eR + dR, eL + dL], beyond it the nearer end's; also the interpolated fit values at s */
function shiftAt(f, S, s, t) {
  let i = 1; while (i < S.s.length - 1 && S.s[i] < s) i++;
  const a = Math.max(0, Math.min(1, (s - S.s[i - 1]) / (S.s[i] - S.s[i - 1] || 1)));
  const lerp = (q) => q[i - 1] + (q[i] - q[i - 1]) * a;
  const eL = lerp(f.eL), eR = lerp(f.eR), dL = lerp(f.L), dR = lerp(f.R);
  const at = (tt) => shiftI(f, i - 1, tt) * (1 - a) + shiftI(f, i, tt) * a;
  return { d: at(t), eL, eR, dL, dR, lerp, at };
}

/** (station, lateral) of plan point (x, z) on road rr: the nearest point of its alignment (samples, then refined) */
export function roadFrameOf(rr, x, z) {
  const S = rr.smp, n = S.s.length;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < n; i++) { const d = (S.x[i] - x) ** 2 + (S.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  let best = { s: S.s[bi], d: Infinity };
  for (const j of [bi - 1, bi]) {
    if (j < 0 || j + 1 >= n) continue;
    const ax = S.x[j], az = S.z[j], dx = S.x[j + 1] - ax, dz = S.z[j + 1] - az, L2 = dx * dx + dz * dz || 1e-12;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * u, z - az - dz * u);
    if (d < best.d) best = { s: S.s[j] + (S.s[j + 1] - S.s[j]) * u, d };
  }
  const e = evalAlignment(rr.al, best.s), nx = Math.sin(e.th), nz = -Math.cos(e.th);
  return { s: best.s, t: (x - e.x) * nx + (z - e.z) * nz, nx, nz };
}

/** markings round 2 (coordinator 2026-11-18: cars must drive centred between the painted lines): a lane path of a
 *  fitted road moved across the road by the same shift as the strips under it. For viewer/streets/laneGraph.js
 *  refineLaneGraph (opts.laneShift), in place of its own centring: (path, plan points) -> moved points | null */
export function laneShifter(net, fit) {
  const byId = new Map(net.roads.map((rr, ri) => [rr.id, ri]));
  return (p, P) => {
    const ri = byId.get(p.roadId), f = ri != null ? fit.fitOf.get(ri) : null;
    if (!f) return null;
    const rr = net.roads[ri];
    fit.st.lanes++; fit.st.lanePts += P.length;
    return P.map(([x, z]) => { const q = roadFrameOf(rr, x, z), { d } = shiftAt(f, rr.smp, q.s, q.t); return [x + q.nx * d, z + q.nz * d]; });
  };
}

/** the painted lane under plan point (x, z) on road rr (the stretched stack's lane): { off (m from its centre, along
 *  the road's left normal), type, width, edges (5 plan points across it, from 0.4 m inside one painted edge to 0.4 m inside the other) } or null */
export function paintedLaneCentre(net, fit, rr, x, z) {
  const ri = net.roads.indexOf(rr), f = fit.fitOf.get(ri);
  if (!f) return null;
  const q = roadFrameOf(rr, x, z), S = rr.smp;
  let i = 1; while (i < S.s.length - 1 && S.s[i] < q.s) i++;
  const lay = rr.lays[Math.abs(S.s[i] - q.s) < Math.abs(S.s[i - 1] - q.s) ? i : i - 1];
  // the engine lane (uv t) whose PAINTED span holds the point
  for (const l of [...lay.left, ...lay.right]) {
    if (!l.present) continue;
    const a = shiftAt(f, S, q.s, l.tIn), b = shiftAt(f, S, q.s, l.tOut);
    const pa = l.tIn + a.d, pb = l.tOut + b.d;
    if (q.t >= Math.min(pa, pb) && q.t <= Math.max(pa, pb)) {
      const at = (t) => [x + q.nx * (t - q.t), z + q.nz * (t - q.t)], lo = Math.min(pa, pb), hi = Math.max(pa, pb);
      const a0 = lo + 0.4, a1 = Math.max(a0, hi - 0.4);
      return { off: q.t - (pa + pb) / 2, type: l.type, width: hi - lo, edges: [0, 0.25, 0.5, 0.75, 1].map((f) => at(a0 + (a1 - a0) * f)) };
    }
  }
  return null;
}

/** a line code with its width set to 0 (dash pattern, colour, double and phase kept: interpolated across a strip row
 *  it tapers the line out instead of decoding a different line). viewer/roadPaint.js asphaltMaterial line() */
function noWidth(v) {
  const code = Math.floor(v + 1e-4); if (code <= 0) return v;
  let c = code >= 1000 ? code - 1000 : code; if (c >= 500) c -= 500;
  const dash = Math.floor((c + 0.5) / 50);
  return v - (c - dash * 50);
}

/** Moves the lane-strip vertices of the engine's asphalt part across their roads (measureLineFit's fit), in place. */
export function fitLinesToStreet(net, part, fit) {
  const { fitOf, st } = fit;
  if (!part?.position || !part.uv || (!fitOf.size && !fit.unpaint?.size && !fit.edgeOff?.size)) return st;
  const P = part.position, U = part.uv, A = part.attributes?.aPiece?.array, E = part.attributes?.aEdges?.array, nv = P.length / 3;
  const member = roadMembers(net, part);
  // vertices the bend trim moved (off their sweep position, inside it): their road by phase, station and distance
  const byPhase = new Map();
  if (A) net.roads.forEach((rr, ri) => { if (fitOf.has(ri)) { const k = Math.round(hashPhase(rr.id) * 100); (byPhase.get(k) || byPhase.set(k, []).get(k)).push(ri); } });
  let sum = 0;
  for (let v = 0; v < nv; v++) {
    let ri = member[v];
    const s = U[v * 2], t = U[v * 2 + 1];
    if (ri < 0 && A) for (const rj of byPhase.get(Math.round(A[v * 2] * 100)) || []) {
      const rr = net.roads[rj], S = rr.smp;
      if (s < S.s[0] - 0.01 || s > S.s[S.s.length - 1] + 0.01) continue;
      const e = evalAlignment(rr.al, s);
      if (Math.hypot(P[v * 3] - e.x, P[v * 3 + 2] - e.z) <= Math.abs(t) + 0.05) { ri = rj; break; }
    }
    // (a vertex of a fitted road's phase still unmatched (a junction-mouth row the engine bent off its sweep): its
    // phase's single fitted road when its station is on it. Every vertex of a fitted strip must be converted to the
    // planar uv below, or its triangles' lines kink)
    if (ri < 0 && A) { const c = byPhase.get(Math.round(A[v * 2] * 100)); if (c?.length === 1) { const S = net.roads[c[0]].smp; if (s >= S.s[0] - 0.5 && s <= S.s[S.s.length - 1] + 0.5) ri = c[0]; else st.unmatched = (st.unmatched || 0) + 1; } else if (c) st.unmatched = (st.unmatched || 0) + 1; }
    const f = ri >= 0 ? fitOf.get(ri) : null;
    // (street1) an unmeasured road's edge lines (a line on its engine carriage edge at this station): width 0
    const eo = !f && ri >= 0 && E ? fit.edgeOff?.get(ri) : null;
    if (eo) {
      const S = net.roads[ri].smp; let i = 0; while (i < S.s.length - 1 && S.s[i] < s) i++;
      const al = evalAlignment(net.roads[ri].al, s), nx = Math.sin(al.th), nz = -Math.cos(al.th);
      for (let k = 0; k < 2; k++) {
        if (E[v * 4 + 2 + k] < 1) continue;
        const lt = E[v * 4 + k], atEdge = Math.abs(lt - eo.eL[i]) < 0.03 || Math.abs(lt - eo.eR[i]) < 0.03;
        // (and any line of it that lies within NEAR_KERB of a measured kerb / street edge, or on a measured surface
        // that is not carriageway: a stack line where the measured kerb is, the D7 seam-cut dashed parking line)
        const x = P[v * 3] + nx * (lt - t), z = P[v * 3 + 2] + nz * (lt - t), c = fit.classAt(x, z);
        const atKerb = fit.lg.hit(x, z, nx, nz, -NEAR_KERB, NEAR_KERB, 0) != null || (c >= 0 && !CARR.has(c));
        if (atEdge || atKerb) { E[v * 4 + 2 + k] = noWidth(E[v * 4 + 2 + k]); st.invEdgeCut = (st.invEdgeCut || 0) + 1; }
      }
      continue;
    }
    if (!f && ri >= 0 && E && fit.unpaint?.has(ri)) { if (E[v * 4 + 2] || E[v * 4 + 3]) st.unpaintedVerts = (st.unpaintedVerts || 0) + 1; E[v * 4 + 2] = 0; E[v * 4 + 3] = 0; continue; }
    if (!f) continue;
    const { d, eL, eR, lerp, at } = shiftAt(f, net.roads[ri].smp, s, t);
    // (street1, rule street-invariants) a flag at this vertex's station: both neighbouring samples must hold it
    let i1 = 1; if (f.X) { const S = net.roads[ri].smp; while (i1 < S.s.length - 1 && S.s[i1] < s) i1++; }
    const both = (q) => q[i1 - 1] && q[i1], xHere = f.X ? !!(f.X[i1 - 1] || f.X[i1]) : false, lagHere = f.lag ? !!(f.lag[i1 - 1] || f.lag[i1]) : false;
    // a line ON the carriage edge (the engine's "edge" / "leftEdge" where it sees no sidewalk; a kerb there) comes
    // EDGE_IN inside it, as painted: never half under the kerb face (census F atKerb)
    // and it follows the measured kerb at this station (kL / kR, a short median), not the smoothed stack: its uv t is
    // where the stretched strip puts EDGE_IN inside that kerb, kept inside its own strip (else the kerb clip ends it)
    if (E && eL - eR > 2 * EDGE_IN + 1) for (let k = 0; k < 2; k++) {
      if (E[v * 4 + 2 + k] < 1) continue;
      const lt = E[v * 4 + k], other = E[v * 4 + 1 - k];
      const side = Math.abs(lt - eL) < 0.03 ? 1 : Math.abs(lt - eR) < 0.03 ? -1 : 0;
      if (!side && f.funnel) { E[v * 4 + 2 + k] = 0; st.funnelLines = (st.funnelLines || 0) + 1; continue; }   // (a junction funnel: no lane line)
      if (!side && (xHere || lagHere)) { E[v * 4 + 2 + k] = noWidth(E[v * 4 + 2 + k]); st.invLaneCut = (st.invLaneCut || 0) + 1; continue; }   // (street1: a lane line at an X station)
      if (!side) continue;
      if (f.X && !both(side > 0 ? f.okL : f.okR)) { E[v * 4 + 2 + k] = noWidth(E[v * 4 + 2 + k]); st.invEdgeCut = (st.invEdgeCut || 0) + 1; continue; }   // (street1: no measured kerb for this edge line here)
      const target = side > 0 ? eL + lerp(f.kL) - EDGE_IN : eR + lerp(f.kR) + EDGE_IN;     // offset from the centre line
      // its uv t: the map's inverse (monotonic: bisection over the carriageway)
      let a0 = eR - 1, a1 = eL + 1; for (let it = 0; it < 30; it++) { const m = (a0 + a1) / 2; if (m + at(m) < target) a0 = m; else a1 = m; }
      let tt = (a0 + a1) / 2;
      const lo = Math.min(lt, other) + 0.08, hi = Math.max(lt, other) - 0.08;
      const want = tt;
      if (side > 0) tt = Math.min(tt, eL - 0.08); else tt = Math.max(tt, eR + 0.08);
      tt = Math.max(lo, Math.min(hi, tt));
      // (street1: held inside its strip more than EDGE_TOL off its kerb offset, the line is the stack's, not the kerb's)
      if (f.X && Math.abs(tt - want) > EDGE_TOL) { E[v * 4 + 2 + k] = noWidth(E[v * 4 + 2 + k]); st.invEdgeCut = (st.invEdgeCut || 0) + 1; continue; }
      E[v * 4 + k] = tt; st.edgeIn++;
    }
    // browser turn (tour: Saint-Pierre's setts, the asphalt grain): the paving texture is laid out in uv (station,
    // lateral); a stretched strip stretched its stones. The lateral uv becomes the PLANAR offset (t + its shift) and
    // the strip's line positions go through the same map, so the lines draw where they did and the texture is not
    // stretched (the map is linear across each lane strip: interpolation keeps them exact)
    if (E) for (let k = 0; k < 2; k++) E[v * 4 + k] += at(E[v * 4 + k]);
    U[v * 2 + 1] = t + d;
    if (Math.abs(d) < 1e-4) continue;
    const th = evalAlignment(net.roads[ri].al, s).th;
    P[v * 3] += Math.sin(th) * d; P[v * 3 + 2] -= Math.cos(th) * d;
    st.moved++; sum += Math.abs(d); st.maxShift = Math.max(st.maxShift, Math.abs(d));
  }
  st.meanShift = st.moved ? Math.round((sum / st.moved) * 100) / 100 : 0;
  st.maxShift = Math.round(st.maxShift * 100) / 100;
  return st;
}
