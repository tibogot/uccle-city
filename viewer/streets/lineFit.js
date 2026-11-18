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
import { evalAlignment } from "../../vendor/roads/roadAlignment.js";
import { layoutEdges } from "../../vendor/roads/roadCrossSection.js";
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
const EDGE_WIN = 3;                      // m: half window of the edge lines' kerb median                  // the fitted carriageway keeps at least this share of the engine's width

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
  let hi = t0, lo = t0;
  while (hi < t0 + REACH && CL(hi + STEP)) hi += STEP;
  while (lo > t0 - REACH && CR(lo - STEP)) lo -= STEP;
  const ref = (e, dir) => { const t = lg.hit(x, z, nx, nz, e - 0.6, e + 0.6, e + dir * STEP / 2); return t ?? e + dir * STEP / 2; };
  return { lo: lo <= t0 - REACH ? null : ref(lo, -1), hi: hi >= t0 + REACH ? null : ref(hi, 1) };
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

/**
 * The fit of every road's lane stack onto the measured carriageway: { fitOf: road index -> per-sample shifts of its
 * two carriage ends, st }. surf: the tile's surfaces (kerbs, edges, after prepareSurfaces); prep: prepareSurfaces'
 * result (classAt). Applied to the asphalt strips by fitLinesToStreet, to the lane graph by laneShifter.
 */
export function measureLineFit(net, prep, surf) {
  const st = { roads: 0, fitted: 0, moved: 0, meanShift: 0, maxShift: 0, edgeIn: 0, lanes: 0, lanePts: 0 };
  const fitOf = new Map();
  if (!prep) return { fitOf, st };
  const lg = lineGrid([...(surf?.kerbs || []), ...(surf?.edges || []).map((e) => e.line)]);
  // per road: the smoothed shifts of its two carriage ends at its samples
  net.roads.forEach((rr, ri) => {
    const S = rr.smp;
    if (!S || !rr.lays || !rr.al || S.s.length < 2) return;
    st.roads++;
    const n = S.s.length, dL = new Array(n).fill(null), dR = new Array(n).fill(null), eL = new Float64Array(n), eR = new Float64Array(n);
    let any = 0;
    for (let i = 0; i < n; i++) {
      const e = layoutEdges(rr.lays[i]); eL[i] = e.curbL; eR[i] = e.curbR;
      if (!prep.inside(S.x[i], S.z[i])) continue;
      // (a junction mouth: the side street's carriageway runs on past the kerb line; the ends hold their neighbours')
      if (S.s[i] - S.s[0] < MOUTH || S.s[n - 1] - S.s[i] < MOUTH) continue;
      const park = (side) => (rr.lays[i][side] || []).some((l) => l.present && l.type === "parking");
      const iv = interval(prep.classAt, lg, S.x[i], S.z[i], Math.sin(S.th[i]), -Math.cos(S.th[i]), park("left"), park("right"));
      if (!iv) continue;
      if (iv.hi != null && Math.abs(iv.hi - e.curbL) < MAX_D) { dL[i] = iv.hi - e.curbL; any++; }
      if (iv.lo != null && Math.abs(iv.lo - e.curbR) < MAX_D) { dR[i] = iv.lo - e.curbR; any++; }
    }
    // a road measured at fewer than a third of its samples keeps the engine's lines (UrbIS does not map it here)
    if (any < Math.max(2, (2 * n) / 3)) return;
    // a sample more than OUTLIER off the road's own median shift is a lay-by, a bus bay or a side street: not the street
    const cut = (v) => { const w = v.filter((q) => q != null).sort((a, b) => a - b); if (!w.length) return v; const m = w[w.length >> 1]; return v.map((q) => (q != null && Math.abs(q - m) <= OUTLIER ? q : null)); };
    const sL = smooth(S.s, cut(dL)), sR = smooth(S.s, cut(dR));
    const L = sL ?? new Array(n).fill(0), R = sR ?? new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      // never squeeze the stack under MIN_SHARE of its width (a measurement gone wrong): scale both shifts back
      const w0 = eL[i] - eR[i], w1 = w0 + L[i] - R[i];
      if (w0 > 0.5 && w1 < MIN_SHARE * w0) { const f = (w0 * (1 - MIN_SHARE)) / Math.max(1e-6, R[i] - L[i]); L[i] *= f; R[i] *= f; }
    }
    // the edge lines follow the kerb closer than the stack: a +-EDGE_WIN median of the raw ends (no measurement: the stack's)
    const near = (v, sm) => S.s.map((s0, i) => { const w = []; for (let j = 0; j < n; j++) if (v[j] != null && Math.abs(S.s[j] - s0) <= EDGE_WIN) w.push(v[j]); if (!w.length) return sm[i]; w.sort((a, b) => a - b); return w[w.length >> 1]; });
    fitOf.set(ri, { L, R, eL, eR, kL: near(dL, L), kR: near(dR, R) });
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
  return { fitOf, st };
}

/** the lateral shift (m, along the road's left normal) of uv (s, t) on a fitted road: linear across the carriageway
 *  [eR, eL] -> [eR + dR, eL + dL], beyond it the nearer end's; also the interpolated fit values at s */
function shiftAt(f, S, s, t) {
  let i = 1; while (i < S.s.length - 1 && S.s[i] < s) i++;
  const a = Math.max(0, Math.min(1, (s - S.s[i - 1]) / (S.s[i] - S.s[i - 1] || 1)));
  const lerp = (q) => q[i - 1] + (q[i] - q[i - 1]) * a;
  const eL = lerp(f.eL), eR = lerp(f.eR), dL = lerp(f.L), dR = lerp(f.R);
  const d = t >= eL ? dL : t <= eR ? dR : eL - eR > 1e-6 ? dR + ((t - eR) / (eL - eR)) * (dL - dR) : (dL + dR) / 2;
  return { d, eL, eR, dL, dR, lerp };
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

/** Moves the lane-strip vertices of the engine's asphalt part across their roads (measureLineFit's fit), in place. */
export function fitLinesToStreet(net, part, fit) {
  const { fitOf, st } = fit;
  if (!part?.position || !part.uv || !fitOf.size) return st;
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
    const f = ri >= 0 ? fitOf.get(ri) : null;
    if (!f) continue;
    const { d, eL, eR, dL, dR, lerp } = shiftAt(f, net.roads[ri].smp, s, t);
    // a line ON the carriage edge (the engine's "edge" / "leftEdge" where it sees no sidewalk; a kerb there) comes
    // EDGE_IN inside it, as painted: never half under the kerb face (census F atKerb)
    // and it follows the measured kerb at this station (kL / kR, a short median), not the smoothed stack: its uv t is
    // where the stretched strip puts EDGE_IN inside that kerb, kept inside its own strip (else the kerb clip ends it)
    if (E && eL - eR > 2 * EDGE_IN + 1) for (let k = 0; k < 2; k++) {
      if (E[v * 4 + 2 + k] < 1) continue;
      const lt = E[v * 4 + k], other = E[v * 4 + 1 - k], kk = (dL - dR) / (eL - eR);
      const side = Math.abs(lt - eL) < 0.03 ? 1 : Math.abs(lt - eR) < 0.03 ? -1 : 0;
      if (!side) continue;
      const target = side > 0 ? eL + lerp(f.kL) - EDGE_IN : eR + lerp(f.kR) + EDGE_IN;     // offset from the centre line
      let tt = (target - dR + eR * kk) / (1 + kk);                                         // its uv t (the linear map's inverse)
      const lo = Math.min(lt, other) + 0.08, hi = Math.max(lt, other) - 0.08;
      if (side > 0) tt = Math.min(tt, eL - 0.08); else tt = Math.max(tt, eR + 0.08);
      E[v * 4 + k] = Math.max(lo, Math.min(hi, tt)); st.edgeIn++;
    }
    if (Math.abs(d) < 1e-4) continue;
    const th = evalAlignment(net.roads[ri].al, s).th;
    P[v * 3] += Math.sin(th) * d; P[v * 3 + 2] -= Math.cos(th) * d;
    st.moved++; sum += Math.abs(d); st.maxShift = Math.max(st.maxShift, Math.abs(d));
  }
  st.meanShift = st.moved ? Math.round((sum / st.moved) * 100) / 100 : 0;
  st.maxShift = Math.round(st.maxShift * 100) / 100;
  return st;
}
