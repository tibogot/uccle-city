// THE TRAFFIC LANES AND TURNS FROM THE STREET MODEL (claude/street4, docs/STREET_MODEL_PLAN.md job 4, rule street-lanes).
// Plain JS, no three.js: tile worker + node. Called by viewer/traffic/trafficGraph.js buildTrafficGraph (through the ONE
// builder viewer/traffic/tileTraffic.js) on the engine's lane graph (its topology: lane pieces, connectors, links), so
// the junction control, conflicts and hand-overs stay as they were; only the GEOMETRY of the lanes on model-covered
// roads and of the turns between them comes from the model:
//
//   lanes   an offset curve of the segment's axis (viewer/street/model.js: the mid-line of the MEASURED carriageway) at the
//           model's driving-lane centre (placeLanes ctr: the OSM lane stack fitted into the measured driving width),
//           smoothed along the whole segment (a running median, then two box passes: C1 blends, no point-by-point
//           shift), then held >= KERB_CLEAR m inside the measured driving ends by one smooth offset profile
//           (viewer/streets/laneOffset.js: ramps <= 1:10); on X stations (the OSM line > 1.5 m outside the measured
//           carriageway, or the stack does not fit it) one lane per direction, centred in its half of the measured
//           carriageway; a carriageway narrower than 2 KERB_CLEAR: one centred lane (the narrow-stretch rule of the sim
//           lets one direction through at a time). Stations with no measurement (O / G inside UrbIS, > 15 m gaps) take
//           the line between their measured neighbours. A segment end at a junction ends at the junction's MOUTH (the
//           model's arm mouth station); a degree-2 node inside a segment is one continuous curve (both pieces cut it at
//           the same station, at the same offset)
//   turns   at a model junction, from the entry lane's end to the exit lane's start: a quintic Hermite curve with the
//           lanes' end tangents AND curvatures (G2), its handle length chosen so it stays inside the junction polygon
//           (or the floor disc round the node); the handle giving the lowest peak curvature among those that stay inside
//   other   rings, u-turns, continuations and every connector with an uncovered end keep the engine's shape, their ends
//           moved onto the new lane ends (faded along them)
//
// A road is model-covered when its segment has at least one measured station (M / D driving ends, E = no UrbIS at all:
// the drawn road is the engine's own strip, X with measured ends). Everything else keeps the old fit (fitToSurface,
// laneShifter, roadFollowTurns) as ?streetlanes=old does everywhere.
import { CONF, pip2 } from "./model.js";
import { laneOffsetProfile } from "../streets/laneOffset.js";

/** a carriageway narrower than this carries ONE centred lane (two-way: two clearances and a car's width between the
 *  two directions' lanes would not fit; the sim's narrow-stretch rule lets one direction through at a time) */
export const NARROW_TWO = 3.2;
const narrowW = (two) => (two ? NARROW_TWO : 2 * KERB_CLEAR);
/** how far a lane may sit off the carriageway's middle, as a share of its normal room (0 = centred), by width W: a
 *  CONTINUOUS ramp over NARROW_BAND m above the narrow width (a hard switch flipped lanes between centred and split on a
 *  street whose measured width hovers round it: Boomgaardstraat A5, a slalom of 100 m) */
const NARROW_BAND = 1.0, NARROW_FREE = 0.5, CENTRE_FREE = 0.3;
const narrowF = (W, two) => Math.max(0, Math.min(1, (W - narrowW(two)) / NARROW_BAND));
export const KERB_CLEAR = 1.0;           // m: a lane centre this far inside the measured driving ends (plan 4 invariant 3)
const BODY = 0.9, BLD_REACH = 5;         // m: a car body's half width; how far a lane in a building looks for a clear offset
const FADE = 20;                         // m: a long faded turn takes each end's move over this much of it
const FAR_END = 40;                      // m: a model lane end this far from its junction's node is not the junction's
const NO_J = 15;                         // m: a lane end at a junction the tile's model does not hold: at most this from its node
const UNMEASURED_PAD = 2;                // m: an unmeasured arm's lanes end at most this far past the junction's floor disc
const MIXED_MOVE = 3;                    // m: a mixed turn's end moved further than this is laid anew
const CUT_MAX = 8;                       // m: the most a lane end is cut back for a blocked turn
const DUAL_OFF = 1.5;                    // m: the OSM line this far outside a two-way segment's measured carriageway: a dual carriageway's half
const AX_JUMP = 1.5;                     // m per station: a measured axis moving faster than this has jumped carriageways
const SUPPORT = 0.5;                     // a lane piece is built from the model where at least this share of its stations is measured
const SLIP = 1.5;                        // m: how far a lane point off the drawn carriageway looks for it
const RAY = 4;                           // m: how far a lane point looks sideways for a kerb line
const PARK_CLEAR = 1.13;                 // m: a lane centre this far from a parked car's box (trafficGraph.js TP_HALF + TP_FIT: a car; a wider vehicle moves out round it in the sim, trafficSim.js)
const BOX_HW = 0.925, BOX_HL = 2.365;    // m: a parked car's plan box (trafficGraph.js TP_BOX_HW / TP_BOX_HL)
const MED = 7, BOX = 5, END_N = 0, END_W = 4;                 // m: running median, then two box passes, over +-these
const MIN_PIECE = 3;                     // m: a lane piece shorter than this between its junction mouths is not rebuilt
const CONT_GAP = 0.5;                    // m: at a continuation node with a connector, each lane stops this short of it
const IN_TOL = 0.3;                      // m: a turn point this near the junction polygon counts as inside
const LAMBDA = [0.35, 0.45, 0.55, 0.7, 0.85, 1.0, 1.2];   // quintic handle lengths, x the chord
const K_MAX = 0.25;                      // 1/m: the end curvature handed to a turn is at most this (a 4 m radius)

const cumOf = (P) => { const c = [0]; for (let k = 1; k < P.length; k++) c.push(c[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return c; };

/** running median of v over +-w stations (no NaN in v) */
function median(v, w) {
  const n = v.length, out = new Float64Array(n), buf = [];
  for (let i = 0; i < n; i++) { buf.length = 0; for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) buf.push(v[j]); buf.sort((a, b) => a - b); out[i] = buf[buf.length >> 1]; }
  return out;
}
/** box average over +-w stations, the window shrunk symmetrically at the ends (an end keeps its own value's weight) */
function box(v, w) {
  const n = v.length, out = new Float64Array(n);
  // (the last END_N stations of a segment keep a narrower window: a lane end at a junction mouth follows its measured
  // street, not the average of the street behind it)
  for (let i = 0; i < n; i++) { const h = Math.min(Math.min(i, n - 1 - i) < END_N ? END_W : w, i, n - 1 - i); let s = 0; for (let j = i - h; j <= i + h; j++) s += v[j]; out[i] = s / (2 * h + 1); }
  return out;
}

/** valid station i of segment E: its driving ends measured (M / D), or no UrbIS at all (E), or X with measured ends */
const measured = (E, i) => E.drive.confL[i] <= CONF.D && E.drive.confR[i] <= CONF.D;
const validAt = (E, i) => measured(E, i) || E.axConf[i] === CONF.E;
const isX = (E, i) => E.lanes.conf[i] === CONF.X || E.axConf[i] === CONF.X;

/**
 * The lane-centre offset profile of segment E (from the station line: axOff + centre) for direction d (+1 with the
 * segment, -1 against it) and rank r (0 = the lane nearest its kerb) when the engine drives m(i) lanes that way and
 * mo(i) the other way at station i. -> Float64Array(n) | null (no measured station)
 */
function laneProfile(E, d, r, m, mo, cars = [], K = null, inB = null, drv = null) {
  const n = E.n, D = E.lanes.D, raw = new Float64Array(n).fill(NaN);
  let any = false;
  for (let i = 0; i < n; i++) {
    if (!validAt(E, i)) continue;
    const lo = E.drive.offR[i], hi = E.drive.offL[i], mi = Math.max(1, m[i]);
    const own = [], oth = [];
    for (let j = 0; j < D; j++) { const c = E.lanes.ctr[i * D + j], dir = E.lanes.cdir[i * D + j]; if (Number.isNaN(c) || !dir) continue; (dir === d ? own : oth).push(c); }
    own.sort((a, b) => (a - b) * d);             // from this direction's kerb inward
    const two = mo[i] > 0;
    let c;
    if (isX(E, i) || own.length < mi) {
      // one lane per direction centred in its half (X), or the engine's lanes spread evenly over this direction's span
      let a = d > 0 ? lo : hi, b = d > 0 ? hi : lo;
      if (two) {
        const ownIn = own.length ? own[own.length - 1] : null, othIn = oth.length ? oth.sort((x, y) => (x - y) * -d)[oth.length - 1] : null;
        b = !isX(E, i) && ownIn != null && othIn != null ? (ownIn + othIn) / 2 : (lo + hi) / 2;
      }
      c = a + ((b - a) * (Math.min(r, mi - 1) + 0.5)) / mi;
    } else c = own[Math.min(r, own.length - 1)];
    { const m = (lo + hi) / 2, f = narrowF(hi - lo, two); c = Math.max(lo + KERB_CLEAR, Math.min(hi - KERB_CLEAR, c)); if (hi - lo < 2 * KERB_CLEAR) c = m; c = m + (c - m) * f; }
    raw[i] = E.axOff[i] + c; any = true;
  }
  if (!any) return null;
  // the unmeasured stations: the line between their measured neighbours (held at the ends)
  let prev = -1;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(raw[i])) continue;
    if (prev < 0) for (let k = 0; k < i; k++) raw[k] = raw[i];
    else for (let k = prev + 1; k < i; k++) raw[k] = raw[prev] + ((raw[i] - raw[prev]) * (E.s[k] - E.s[prev])) / (E.s[i] - E.s[prev]);
    prev = i;
  }
  for (let k = prev + 1; k < n; k++) raw[k] = raw[prev];
  let v = box(box(median(raw, MED), BOX), BOX);
  // held >= KERB_CLEAR inside the measured driving ends and PARK_CLEAR clear of the parked cars (the tile's width parking,
  // viewer/streets/parkPlace.js: the street's parking, which the stack does not know): one smooth profile over the
  // needs (never under a need; gaps under 30 m between two cars held: no diving in between them). Where both sides
  // cannot be kept, the far side's cars go first, then this side's (the parked-car check drops what is still touched)
  const lbC = new Float64Array(n).fill(-Infinity), ubC = new Float64Array(n).fill(Infinity);
  for (const c of cars) for (let i = c.i0; i <= c.i1; i++) {
    const t = c.t;
    if (t < v[i]) lbC[i] = Math.max(lbC[i], t + c.half + PARK_CLEAR); else ubC[i] = Math.min(ubC[i], t - c.half - PARK_CLEAR);
  }
  // (and KERB_CLEAR clear of the MEASURED kerb / street-edge lines themselves, where the model's driving ends do not see
  // them: a build-out, a refuge island, a bay's end, the street beside an unmeasured stretch: rays from the lane point)
  const kA = new Float64Array(n).fill(-Infinity), kB = new Float64Array(n).fill(Infinity);
  // (the drawn carriageway's classes too (drv: roadway / tram roadway / parking on the tile's class raster): a tram
  // reservation inside the measured drive span, a median the kerb lines do not outline)
  const two0 = mo.some((v2) => v2 > 0);
  const dRay = (x, z, nx, nz) => { for (let t = 0.25; t <= RAY; t += 0.25) if (!drv(x + nx * t, z + nz * t)) return t - 0.125; return Infinity; };
  for (let i = 0; i < n; i++) {
    if (!K && !drv) break;
    const o = v[i] - E.axOff[i], x = E.ax[i] + E.nx[i] * o, z = E.az[i] + E.nz[i] * o, nx = E.nx[i], nz = E.nz[i];
    let dl = Infinity, dr = Infinity;
    if (drv && !drv(x, z)) {
      // (off the drawn carriageway: onto the drawn carriageway within SLIP, KERB_CLEAR inside it; further than that is
      // another street (a junction's cross street), not this lane's)
      for (let t = 0.25; t <= SLIP; t += 0.25) { if (drv(x + nx * t, z + nz * t)) { kA[i] = v[i] + t + KERB_CLEAR - 0.125; break; } if (drv(x - nx * t, z - nz * t)) { kB[i] = v[i] - t - KERB_CLEAR + 0.125; break; } }
      continue;
    }
    if (drv && !(drv(x + nx * KERB_CLEAR, z + nz * KERB_CLEAR) && drv(x - nx * KERB_CLEAR, z - nz * KERB_CLEAR))) { dl = dRay(x, z, nx, nz); dr = dRay(x, z, -nx, -nz); }
    if (K && K.near(x, z, KERB_CLEAR + 0.05)) { dl = Math.min(dl, K.ray(x, z, nx, nz, RAY)); dr = Math.min(dr, K.ray(x, z, -nx, -nz, RAY)); }
    if (dl === Infinity && dr === Infinity) continue;
    // (a carriageway about two clearances wide or less: no per-station need (its lane is the model's centred one; held
    // to each station's middle between the two lines, the lane copied their noise: Rue des Pecheurs F6, 108 m slalom))
    if (dl + dr < 2 * KERB_CLEAR + NARROW_FREE) continue;
    if (dl < RAY && dr < RAY) {
      // (between two lines: their middle, narrowed toward it continuously below NARROW_TWO + NARROW_BAND)
      const ctr = v[i] + (dl - dr) / 2, hw = Math.max(0, (dl + dr) / 2 - KERB_CLEAR) * narrowF(dl + dr, two0);
      kA[i] = ctr - hw; kB[i] = ctr + hw; continue;
    }
    if (dr < RAY) kA[i] = v[i] - dr + KERB_CLEAR;
    if (dl < RAY) kB[i] = v[i] + dl - KERB_CLEAR;
  }
  // (and its car body (+- BODY m) out of the drawn buildings: the nearest clear offset within BLD_REACH m, the harder
  // truth still: an OSM line through the houses where UrbIS has no carriageway to say where the street is)
  const bA = new Float64Array(n).fill(-Infinity), bB = new Float64Array(n).fill(Infinity);
  if (inB) for (let i = 0; i < n; i++) {
    if (measured(E, i)) continue;          // (a measured carriageway is the street: the 2 m roof grid is not finer than it)
    const body = (o) => { const t = o - E.axOff[i], x = E.ax[i] + E.nx[i] * t, z = E.az[i] + E.nz[i] * t; return inB(x, z) || inB(x + E.nx[i] * BODY, z + E.nz[i] * BODY) || inB(x - E.nx[i] * BODY, z - E.nz[i] * BODY); };
    if (!body(v[i])) continue;
    for (let s = 0.25; s <= BLD_REACH; s += 0.25) { if (!body(v[i] + s)) { bA[i] = v[i] + s; break; } if (!body(v[i] - s)) { bB[i] = v[i] - s; break; } }
  }
  const need = new Float64Array(n);
  let anyNeed = false;
  for (let i = 0; i < n; i++) {
    const meas = measured(E, i);
    if (!meas && lbC[i] === -Infinity && ubC[i] === Infinity && kA[i] === -Infinity && kB[i] === Infinity && bA[i] === -Infinity && bB[i] === Infinity) continue;
    const lo = E.axOff[i] + E.drive.offR[i], hi = E.axOff[i] + E.drive.offL[i];
    let a = meas ? lo + KERB_CLEAR : -Infinity, b = meas ? hi - KERB_CLEAR : Infinity, want;
    if (a > b) { a = b = (lo + hi) / 2; }
    // (a narrow carriageway: its middle, within +-CENTRE_FREE x (1 - f): pinned to each station's own middle, the lane copied
    // the noise of the measured edges, F6 Rue des Pecheurs)
    else if (meas) { const m = (lo + hi) / 2, f = narrowF(hi - lo, two0), t = CENTRE_FREE * (1 - f); a = m + (a - m) * f - t; b = m + (b - m) * f + t; }
    // (the kerb lines are the harder truth: where they and the driving ends disagree, the lines)
    if (Math.max(a, kA[i]) <= Math.min(b, kB[i])) { a = Math.max(a, kA[i]); b = Math.min(b, kB[i]); }
    else if (kA[i] > -Infinity || kB[i] < Infinity) { a = kA[i] > -Infinity ? kA[i] : -Infinity; b = kB[i] < Infinity ? kB[i] : Infinity; if (a > b) a = b = (a + b) / 2; }
    // (out of a building first of all)
    // (where the measured carriageway / kerbs hold it elsewhere, they win: the roof grid is coarse (2 m) and a narrow
    // street between two houses has no clear place on it)
    if (bA[i] > -Infinity || bB[i] < Infinity) { if (Math.max(a, bA[i]) <= Math.min(b, bB[i])) { a = Math.max(a, bA[i]); b = Math.min(b, bB[i]); } else if (a === -Infinity && b === Infinity) { a = b = bA[i] > -Infinity ? bA[i] : bB[i]; } }
    if (a === b) want = a;
    else {
      // own side first: the cars on this direction's kerb side, then the far side's
      const [own, far] = d > 0 ? [[lbC[i], 0], [ubC[i], 1]] : [[ubC[i], 1], [lbC[i], 0]];
      for (const [lim, up] of [own, far]) { const a2 = up ? a : Math.max(a, lim), b2 = up ? Math.min(b, lim) : b; if (a2 <= b2) { a = a2; b = b2; } }
      want = Math.max(a, Math.min(b, v[i]));
    }
    need[i] = want - v[i];
    if (Math.abs(need[i]) > 0.02) anyNeed = true; else need[i] = 0;
  }
  if (anyNeed) { const p = laneOffsetProfile(need, E.s); v = v.map((x, i) => x + p[i]); }
  return v;
}

/** the point of segment E at chain station s and station-line offset o (interpolated between stations) */
function pointAt(E, prof, s) {
  const n = E.n;
  let i = Math.max(0, Math.min(n - 2, Math.floor(s / ((E.s[n - 1] || 1) / (n - 1)))));
  while (i > 0 && E.s[i] > s) i--;
  while (i < n - 2 && E.s[i + 1] < s) i++;
  const f = Math.max(0, Math.min(1, (s - E.s[i]) / Math.max(1e-6, E.s[i + 1] - E.s[i])));
  const at = (k) => { const o = prof[k] - E.axOff[k]; return [E.ax[k] + E.nx[k] * o, E.az[k] + E.nz[k] * o]; };
  const a = at(i), b = at(i + 1);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
/** the lane polyline of E between chain stations sa < sb (every station between), in direction d */
function laneLine(E, prof, sa, sb, d) {
  const P = [pointAt(E, prof, sa)];
  for (let i = 0; i < E.n; i++) if (E.s[i] > sa + 0.3 && E.s[i] < sb - 0.3) { const o = prof[i] - E.axOff[i]; P.push([E.ax[i] + E.nx[i] * o, E.az[i] + E.nz[i] * o]); }
  P.push(pointAt(E, prof, sb));
  // (an offset curve on the inner side of a bend tighter than the offset turns back: those points go)
  const out = [P[0]];
  for (let k = 1; k < P.length; k++) {
    const q = out[out.length - 1], s = sa + ((sb - sa) * k) / (P.length - 1);
    const i = Math.max(0, Math.min(E.n - 1, Math.round(s)));
    const tx = -E.nz[i], tz = E.nx[i];
    if ((P[k][0] - q[0]) * tx + (P[k][1] - q[1]) * tz > 0.05 || k === P.length - 1) out.push(P[k]);
  }
  if (out.length >= 3) { const a = out[out.length - 2], b = out[out.length - 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) out.splice(out.length - 2, 1); }
  return d > 0 ? out : out.reverse();
}

/** polyline P (cumulative c) between arc lengths d0 < d1 */
function cutLine(P, c, d0, d1) {
  const at = (d) => { let k = 1; while (k < P.length - 1 && c[k] < d) k++; const f = Math.max(0, Math.min(1, (d - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1]))); return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f]; };
  const out = [at(d0)];
  for (let k = 0; k < P.length; k++) if (c[k] > d0 + 0.05 && c[k] < d1 - 0.05) out.push([P[k][0], P[k][1]]);
  out.push(at(d1));
  return out;
}

/** nearest station of E to (x, z) within stations [i0, i1]: { i, t (offset from the axis), s } */
function project(E, x, z, i0 = 0, i1 = E.n - 1) {
  let bi = i0, bd = Infinity;
  for (let i = i0; i <= i1; i++) { const d = (E.ax[i] - x) ** 2 + (E.az[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  const dx = x - E.ax[bi], dz = z - E.az[bi];
  return { i: bi, t: dx * E.nx[bi] + dz * E.nz[bi], s: E.s[bi] + dx * -E.nz[bi] + dz * E.nx[bi] };
}

/** the measured kerb / street-edge lines as a ray-cast index: near(x, z, r) -> bool, ray(x, z, nx, nz, R) -> the first
 *  crossing's distance along (nx, nz) within R (Infinity: none) */
export function kerbIndex(lines, C = 4) {
  const segs = [], g = new Map(), key = (i, j) => i * 131071 + j;
  for (const P of lines || []) for (let k = 1; k < P.length; k++) {
    const ax = P[k - 1][0], az = P[k - 1][1], bx = P[k][0], bz = P[k][1], id = segs.push([ax, az, bx, bz]) - 1;
    for (let i = Math.floor(Math.min(ax, bx) / C); i <= Math.floor(Math.max(ax, bx) / C); i++) for (let j = Math.floor(Math.min(az, bz) / C); j <= Math.floor(Math.max(az, bz) / C); j++) { const q = key(i, j); let l = g.get(q); if (!l) g.set(q, (l = [])); l.push(id); }
  }
  const cells = (x0, z0, x1, z1) => { const out = new Set(); for (let i = Math.floor(Math.min(x0, x1) / C); i <= Math.floor(Math.max(x0, x1) / C); i++) for (let j = Math.floor(Math.min(z0, z1) / C); j <= Math.floor(Math.max(z0, z1) / C); j++) for (const id of g.get(key(i, j)) || []) out.add(id); return out; };
  return {
    near(x, z, r) {
      for (const id of cells(x - r, z - r, x + r, z + r)) { const [ax, az, bx, bz] = segs[id], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-12, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); if (Math.hypot(x - ax - dx * u, z - az - dz * u) < r) return true; }
      return false;
    },
    ray(x, z, nx, nz, R) {
      let best = Infinity;
      for (const id of cells(x, z, x + nx * R, z + nz * R)) {
        const [ax, az, bx, bz] = segs[id], sx = bx - ax, sz = bz - az, d = nx * sz - nz * sx;
        if (Math.abs(d) < 1e-12) continue;
        const qx = ax - x, qz = az - z, t = (qx * sz - qz * sx) / d, w = (qx * nz - qz * nx) / d;
        if (w >= 0 && w <= 1 && t >= 0 && t <= R && t < best) best = t;
      }
      return best;
    },
  };
}

// ---------------------------------------------------------------- the turns (G2)

/** quintic Hermite p(u) from P0 (tangent T0, curvature k0) to P1 (T1, k1), handles lam: [[x, z]] every ~0.5 m */
function quintic(P0, T0, k0, P1, T1, k1, lam) {
  const N0 = [-T0[1], T0[0]], N1 = [-T1[1], T1[0]];
  const V0 = [T0[0] * lam, T0[1] * lam], V1 = [T1[0] * lam, T1[1] * lam];
  const A0 = [N0[0] * k0 * lam * lam, N0[1] * k0 * lam * lam], A1 = [N1[0] * k1 * lam * lam, N1[1] * k1 * lam * lam];
  const Q = [];
  const M = 64;
  for (let q = 0; q <= M; q++) {
    const u = q / M, u2 = u * u, u3 = u2 * u, u4 = u3 * u, u5 = u4 * u;
    const h0 = 1 - 10 * u3 + 15 * u4 - 6 * u5, h1 = u - 6 * u3 + 8 * u4 - 3 * u5, h2 = 0.5 * u2 - 1.5 * u3 + 1.5 * u4 - 0.5 * u5;
    const h3 = 0.5 * u3 - u4 + 0.5 * u5, h4 = -4 * u3 + 7 * u4 - 3 * u5, h5 = 10 * u3 - 15 * u4 + 6 * u5;
    Q.push([h0 * P0[0] + h1 * V0[0] + h2 * A0[0] + h3 * A1[0] + h4 * V1[0] + h5 * P1[0], h0 * P0[1] + h1 * V0[1] + h2 * A0[1] + h3 * A1[1] + h4 * V1[1] + h5 * P1[1]]);
  }
  // resampled to ~0.5 m by arc length
  const c = cumOf(Q), L = c[c.length - 1], n = Math.max(2, Math.ceil(L / 0.5)), out = [Q[0]];
  for (let k = 1, j = 1; k < n; k++) { const s = (L * k) / n; while (j < Q.length - 1 && c[j] < s) j++; const f = (s - c[j - 1]) / Math.max(1e-9, c[j] - c[j - 1]); out.push([Q[j - 1][0] + (Q[j][0] - Q[j - 1][0]) * f, Q[j - 1][1] + (Q[j][1] - Q[j - 1][1]) * f]); }
  out.push(Q[Q.length - 1]);
  return out;
}
/** signed curvature of a polyline at its end (fromEnd) or start, over ~`span` m */
function endCurvature(P, fromEnd, span = 2) {
  const n = P.length; if (n < 3) return 0;
  const c = cumOf(P), L = c[n - 1]; if (L < 2 * span * 0.75) return 0;
  const at = (d) => { let k = 1; while (k < n - 1 && c[k] < d) k++; const f = (d - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1]); return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f]; };
  const [a, b, d] = fromEnd ? [at(L - 2 * span), at(L - span), P[n - 1]] : [P[0], at(span), at(2 * span)];
  const cr = (b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(d[0] - b[0], d[1] - b[1]) * Math.hypot(d[0] - a[0], d[1] - a[1]);
  const k = l > 1e-9 ? (2 * cr) / l : 0;
  return Math.max(-K_MAX, Math.min(K_MAX, k));
}
function dirEnd(P, fromEnd, back = 2) {
  const n = P.length, c = cumOf(P), L = c[n - 1];
  if (fromEnd) { let k = n - 2; while (k > 0 && L - c[k] < back) k--; const dx = P[n - 1][0] - P[k][0], dz = P[n - 1][1] - P[k][1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; }
  let k = 1; while (k < n - 1 && c[k] < back) k++;
  const dx = P[k][0] - P[0][0], dz = P[k][1] - P[0][1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l];
}
const polyDist = (x, z, P) => { let m = Infinity; for (let i = 0, n = P.length / 2, j = n - 1; i < n; j = i++) { const ax = P[2 * j], az = P[2 * j + 1], dx = P[2 * i] - ax, dz = P[2 * i + 1] - az, L2 = dx * dx + dz * dz || 1e-12, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return m; };
/** (x, z) inside junction J: its polygon, its floor disc, or within IN_TOL of the polygon */
export const inJunction = (J, x, z, tol = IN_TOL) => (x - J.x) ** 2 + (z - J.z) ** 2 < J.floor * J.floor || pip2(x, z, J.poly) || polyDist(x, z, J.poly) <= tol;
const maxCurv = (P) => { let m = 0; for (let k = 1; k + 1 < P.length; k++) { const a = P[k - 1], b = P[k], c = P[k + 1]; const cr = Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])); const l = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]) * Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > 1e-9) m = Math.max(m, (2 * cr) / l); } return m; };
const turning = (P) => { let s = 0; for (let k = 1; k + 1 < P.length; k++) { const h0 = Math.atan2(P[k][1] - P[k - 1][1], P[k][0] - P[k - 1][0]), h1 = Math.atan2(P[k + 1][1] - P[k][1], P[k + 1][0] - P[k][0]); s += Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))); } return s; };

/** the G2 turn from lane a's end to lane b's start inside junction J (or no junction test when J is null) */
export function g2Turn(A, B, J, inB = null, drv = null) {
  const P0 = A[A.length - 1], P1 = B[0], T0 = dirEnd(A, true), T1 = dirEnd(B, false);
  const k0 = endCurvature(A, true), k1 = endCurvature(B, false);
  const chord = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
  if (chord < 0.3) return { pts: [P0, P1], out: 0 };
  const ang = Math.abs(Math.atan2(T0[0] * T1[1] - T0[1] * T1[0], T0[0] * T1[0] + T0[1] * T1[1]));
  let best = null;
  for (const f of LAMBDA) {
    const Q = quintic(P0, T0, k0, P1, T1, k1, f * chord);
    if (turning(Q) > ang + 1.2) continue;          // (a loop or an S the lanes do not ask for)
    let out = 0, bld = 0, off = 0, trk = 0;
    if (J) for (let k = 1; k + 1 < Q.length; k++) if (!inJunction(J, Q[k][0], Q[k][1])) out++;
    // (and on the drawn carriageway: a corner the junction polygon's straight edge cuts off is pavement)
    if (drv) for (let k = 1; k + 1 < Q.length; k++) if (!drv(Q[k][0], Q[k][1])) { out++; off++; }
    // (never through a building: the car body, +- BODY m across)
    // (a trunk weighs as a point off the drawn street: a street tree stands on the pavement)
    if (inB) for (let k = 1; k + 1 < Q.length; k++) { const a = Q[k - 1], b = Q[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l; let bH = false, tH = false; for (const o of [0, BODY, -BODY]) { const v = +inB(Q[k][0] + nx * o, Q[k][1] + nz * o); if (v === 1) bH = true; else if (v === 2) tH = true; } if (bH) bld++; else if (tH) trk++; }
    const kk = maxCurv(Q), ot = out + trk;
    if (!best || bld < best.bld || (bld === best.bld && (ot < best.ot || (ot === best.ot && kk < best.k - 1e-6)))) best = { pts: Q, out, off, bld, trk, ot, k: kk };
  }
  return best ?? { pts: quintic(P0, T0, k0, P1, T1, k1, 0.55 * chord), out: -1, off: 0, bld: 0, trk: 0, ot: 0, k: 0 };
}

/** (x, z) -> true in a drawn building (inB) or on a street tree's trunk (its collider radius, viewer/drive/colliders.js,
 *  + 0.45: a car body is sampled every 0.9 m across) | null when neither is given */
export function blockedTest(inB, trees) {
  const TG = new Map(), TK = (i, j) => i * 65536 + j;
  for (const t of trees || []) { const k = TK(Math.floor(t.x / 4), Math.floor(t.z / 4)); let l = TG.get(k); if (!l) TG.set(k, (l = [])); l.push([t.x, t.z, Math.min(0.5, Math.max(0.22, 0.16 + 0.012 * (t.height || 10)))]); }
  const onTrunk = (x, z) => { const i0 = Math.floor(x / 4), j0 = Math.floor(z / 4); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const [tx, tz, r] of TG.get(TK(i, j)) || []) if ((tx - x) ** 2 + (tz - z) ** 2 < (r + 0.45) ** 2) return true; return false; };
  if (!inB && !TG.size) return null;
  return (x, z) => (inB && inB(x, z) ? 1 : TG.size && onTrunk(x, z) ? 2 : 0);     // (1 a building, 2 a trunk)
}

/**
 * The last pass over EVERY junction turn of the built graph (an old-fit one too: its lanes were moved after the model
 * stage, by the parked-car fit, the joins and the kink rounding): a turn whose car body meets a building / a trunk or
 * leaves the drawn carriageway is laid again as the G2 turn between its lanes' ends where that one does better
 * (I2 Av. Churchill: an old-fit turn faded over the corner's horse chestnut). paths: the final paths (mutated). -> n
 */
export function repairTurns(paths, blocked, drivable) {
  if (!blocked && !drivable) return 0;
  const by = new Map(paths.map((p) => [p.id, p]));
  const score = (Q) => { let m = 0; for (let k = 1; k + 1 < Q.length; k++) { const a = Q[k - 1], b = Q[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l; for (const o of [0, BODY, -BODY]) { const x = Q[k][0] + nx * o, z = Q[k][1] + nz * o; if (blocked?.(x, z)) m += 10; else if (o === 0 && drivable && !drivable(x, z)) m++; } } return m; };
  let n = 0;
  for (const c of paths) {
    if (c.kind === "lane" || !(c.turn === "left" || c.turn === "right" || c.turn === "straight")) continue;
    const a = by.get(c.prev?.[0]), b = by.get(c.next?.[0]);
    if (!a || !b || a.kind !== "lane" || b.kind !== "lane" || a.pts.length < 2 || b.pts.length < 2) continue;
    const s0 = score(c.pts); if (!s0) continue;
    const T = g2Turn(a.pts.map((v) => [v[0], v[1]]), b.pts.map((v) => [v[0], v[1]]), null, blocked, drivable);
    if (score(T.pts) >= s0) continue;
    c.pts = T.pts; c.cum = cumOf(T.pts); c.len = c.cum[c.cum.length - 1]; n++;
  }
  return n;
}

// ---------------------------------------------------------------- the stage

/**
 * The model's lanes on the engine's lane graph. net: the road network (roadsById); model: buildStreetModel's result;
 * paths: the lane graph's paths (kind lane / connector, id, roadId, prev / next, pts, stop) — not changed: covered
 * paths come back as new objects. -> { paths, covered: Set(path id), turns: Map(connector id -> junction id | null), stats }
 */
export function modelLaneStage(net, model, paths, parked = null, kerbs = null, inBuilding0 = null, drivable = null, trees = null) {
  // (the hard things a car body must not meet: the drawn buildings, and the street trees' trunks (OSM / registry / LiDAR,
  // the tile's final list: drivecheck met G2 turns over a corner's tree, F8 Av. Jacqueline Harpman)
  const inBuilding = blockedTest(inBuilding0, trees);
  const K = kerbs?.length ? kerbIndex(kerbs) : null;
  const stats = { segments: 0, lanes: 0, lanesKept: 0, short: 0, turns: 0, turnsOut: 0, turnsNoJ: 0, faded: 0, xStations: 0, spread: 0 };
  const covered = new Set(), turns = new Map();
  if (!model?.segments?.length) return { paths, covered, turns, stats };
  const segOf = new Map();
  for (const E of model.segments) E.sources.roads.forEach((id, p) => segOf.set(id, [E, p]));
  const jOf = new Map(model.junctions.map((J) => [J.node, J])), jById = new Map(model.junctions.map((J) => [J.id, J]));
  /** the confidence of segment E's arm at its end (0 = A, 1 = B) of a junction the tile's model holds (else O) */
  const armConf = (E, end) => jById.get(end ? E.junctionB : E.junctionA)?.arms.find((a) => a.seg === E.id && a.end === end)?.conf ?? CONF.O;
  const byId = new Map(paths.map((p) => [p.id, p]));
  const isConn = (id) => byId.get(id)?.kind === "connector";
  // lane pieces by segment, with their direction and their mean offset from the axis
  const bySeg = new Map();
  for (const p of paths) {
    if (p.kind !== "lane" || p.pts.length < 2) continue;
    const q = segOf.get(p.roadId); if (!q) continue;
    const [E, part] = q;
    let i0 = E.n, i1 = -1; for (let i = 0; i < E.n; i++) if (E.part[i] === part) { if (i < i0) i0 = i; i1 = i; }
    if (i1 < 0) continue;
    const P = p.pts, a = project(E, P[0][0] ?? P[0].x, P[0][1] ?? P[0].z, i0, i1), b = project(E, P[P.length - 1][0] ?? P[P.length - 1].x, P[P.length - 1][1] ?? P[P.length - 1].z, i0, i1);
    let t = 0; for (const v of P) t += project(E, v[0] ?? v.x, v[1] ?? v.z, i0, i1).t; t /= P.length;
    const d = b.s >= a.s ? 1 : -1;
    if (!bySeg.has(E)) bySeg.set(E, []);
    bySeg.get(E).push({ p, part, i0, i1, d, t, sa: Math.min(a.s, b.s), sb: Math.max(a.s, b.s) });
  }
  const newPts = new Map();
  for (const [E, list] of bySeg) {
    stats.segments++;
    const n = E.n, L = E.s[n - 1];
    // per part and direction: the engine's lanes (distinct lane ids), ranked from their kerb
    const lanesOf = new Map();         // `${part}|${d}` -> [laneId] (rank order)
    for (const q of list) { const k = `${q.part}|${q.d}`; if (!lanesOf.has(k)) lanesOf.set(k, new Map()); const M = lanesOf.get(k); const e = M.get(q.p.laneId) || { s: 0, w: 0 }; e.s += q.t; e.w++; M.set(q.p.laneId, e); }
    const rankOf = new Map();
    for (const [k, M] of lanesOf) { const d = +k.split("|")[1]; [...M.entries()].sort((a, b) => (a[1].s / a[1].w - b[1].s / b[1].w) * d).forEach(([id], r) => rankOf.set(`${k}|${id}`, r)); }
    const m = (d) => { const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = lanesOf.get(`${E.part[i]}|${d}`)?.size ?? 0; return a; };
    const mF = m(1), mB = m(-1);
    const twoWay = mF.some((v2) => v2 > 0) && mB.some((v2) => v2 > 0);
    for (let i = 0; i < n; i++) if (isX(E, i)) stats.xStations++;
    const profs = new Map();
    // the parked cars on this segment's carriageway: their station span and offset from the axis, half width across it
    const cars = [];
    if (parked) for (const c of parked) {
      if (c.x < E.x0 - 3 || c.x > E.x1 + 3 || c.z < E.z0 - 3 || c.z > E.z1 + 3) continue;
      const q = project(E, c.x, c.z);
      if (q.t < E.kerbR.off[q.i] - 0.6 || q.t > E.kerbL.off[q.i] + 0.6 || Math.abs(q.s - E.s[q.i]) > 1.5) continue;
      const tx = -E.nz[q.i], tz = E.nx[q.i], ca = Math.abs(Math.cos(c.yaw) * tx - Math.sin(c.yaw) * tz), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
      const along = BOX_HL * ca + BOX_HW * sa, half = BOX_HW * ca + BOX_HL * sa;
      let i0 = q.i, i1 = q.i; while (i0 > 0 && E.s[i0 - 1] >= q.s - along - 0.5) i0--; while (i1 < n - 1 && E.s[i1 + 1] <= q.s + along + 0.5) i1++;
      cars.push({ i0, i1, t: E.axOff[q.i] + q.t, half });          // (t: from the station line)
    }
    stats.cars = (stats.cars || 0) + cars.length;
    // (rank 0, the lane at its kerb, keeps clear of the parked cars; an inner lane keeps the model's own lane centre:
    // both held off the same row of cars collapsed onto one line, two lanes 0.3 m apart, Av. De Fré F3)
    const profOf = (d, r) => { const k = `${d}|${r}`; if (!profs.has(k)) profs.set(k, laneProfile(E, d, r, d > 0 ? mF : mB, d > 0 ? mB : mF, r === 0 ? cars : [], K, inBuilding0, drivable)); return profs.get(k); };
    // the part boundaries (halfway between the last station of a part and the first of the next)
    const partS = (part) => { let i0 = -1, i1 = -1; for (let i = 0; i < n; i++) if (E.part[i] === part) { if (i0 < 0) i0 = i; i1 = i; } return [i0 > 0 ? (E.s[i0] + E.s[i0 - 1]) / 2 : 0, i1 < n - 1 ? (E.s[i1] + E.s[i1 + 1]) / 2 : L]; };
    for (const q of list) {
      const { p, part, d } = q;
      const rr = net.roadsById?.get(p.roadId);
      const [pa, pb] = partS(part);
      // the piece's span on the segment: its road's own section cut mapped onto the part, its road ends replaced by the
      // part boundary (inside the segment), the junction mouth (at a model junction) or the engine's trim (else)
      const RL = rr?.L ?? rr?.smp?.s?.[rr.smp.s.length - 1] ?? null, rev = !!E.stacks[part]?.rev;
      const map = (sr) => (RL ? (rev ? pb - (sr / RL) * (pb - pa) : pa + (sr / RL) * (pb - pa)) : null);
      let sa = q.sa, sb = q.sb;
      // (a junction end: the arm's MEASURED mouth; an arm the model could not measure (its mouth is the 40 m search cap)
      // ends where the engine trims it, never further out)
      // (a roundabout end: the engine's own end, its ring is the engine's)
      const ring = (nd) => net.nodesById?.get(nd)?.kind === "roundabout";
      // (an unmeasured arm: at the engine's trim, at most the junction's floor radius + UNMEASURED_PAD from its node)
      // (a junction outside this tile's model: no floor known, at most NO_J m: an engine trim far up the road (a 5-arm
      // node at a grazing angle) made a 135 m turn, M5 Ch. de La Hulpe)
      const cap = (jid, trim) => { const J = jById.get(jid); return J ? Math.min(trim, Math.max(J.floor, 4) + UNMEASURED_PAD) : Math.min(trim, NO_J); };
      // (a measured mouth further out than the engine's trim (a square whose arms settle 30 m out) is not where a car
      // starts its turn either: the lane runs on to the trim, held off the kerbs, and the turn is the junction's part)
      const mA = E.junctionA ? (ring(E.A) ? q.sa : armConf(E, 0) === CONF.M ? Math.min(E.mouthA, Math.max(q.sa, 4)) : Math.min(E.mouthA, cap(E.junctionA, q.sa))) : 0;
      const mB = E.junctionB ? (ring(E.B) ? L - q.sb : armConf(E, 1) === CONF.M ? Math.min(E.mouthB, Math.max(L - q.sb, 4)) : Math.min(E.mouthB, cap(E.junctionB, L - q.sb))) : 0;
      const atRoadStart = (s) => Math.abs(s - (rr?.s0 ?? -1)) < 0.6, atRoadEnd = (s) => Math.abs(s - (rr?.s1 ?? -1)) < 0.6;
      // (the piece's cut stations along its road, in the segment's direction)
      if (RL && p.s0 != null && p.s1 != null) {
        const x0 = map(p.s0), x1 = map(p.s1);
        const lo0 = Math.min(x0, x1), hi0 = Math.max(x0, x1);
        const loEnd = rev ? atRoadEnd(p.s1) : atRoadStart(p.s0), hiEnd = rev ? atRoadStart(p.s0) : atRoadEnd(p.s1);
        sa = loEnd ? (pa > 0 ? pa : E.junctionA ? mA : q.sa) : lo0;
        sb = hiEnd ? (pb < L ? pb : E.junctionB ? L - mB : q.sb) : hi0;
      } else {
        if (pa > 0) sa = pa; else if (E.junctionA) sa = mA;
        if (pb < L) sb = pb; else if (E.junctionB) sb = L - mB;
      }
      // (a connector at a continuation node: the lanes stop short of it, so it keeps a length)
      const startConn = (p.prev || []).some(isConn), endConn = (p.next || []).some(isConn);
      if (d > 0) { if (sa === pa && pa > 0 && startConn) sa += CONT_GAP; if (sb === pb && pb < L && endConn) sb -= CONT_GAP; }
      else { if (sb === pb && pb < L && startConn) sb -= CONT_GAP; if (sa === pa && pa > 0 && endConn) sa += CONT_GAP; }
      sa = Math.max(0, sa); sb = Math.min(L, sb);
      if (sb - sa < MIN_PIECE) { stats.short++; continue; }
      // (a piece the model barely measures (one kerb found, the other side a guess: a tram reservation between two
      // carriageways, a street UrbIS maps in part) keeps the old fit)
      // (E stations whose OSM line runs through a building (a block's inner way, an OSM line off a street UrbIS maps
      // beyond the model's reach): the data contradict each other there, the old fit's far snap looks further)
      const bodyIn = (i) => inBuilding0 && [0, BODY, -BODY].some((w) => inBuilding0(E.ax[i] + E.nx[i] * w, E.az[i] + E.nz[i] * w));
      // (and a station whose OSM line lies outside its measured carriageway by more than X_OFF while the engine drives
      // both ways on it: one roadway of a dual carriageway drawn as one OSM way (Av. Churchill I2, the tram between),
      // the other direction's roadway is not this one)
      const dual = (i) => twoWay && Math.abs(E.axOff[i]) > (E.drive.offL[i] - E.drive.offR[i]) / 2 + DUAL_OFF;
      let sup = 0, tot = 0, eIn = 0; for (let i = 0; i < n; i++) if (E.s[i] >= sa && E.s[i] <= sb) { tot++; if (E.axConf[i] === CONF.E && bodyIn(i)) eIn++; else if (validAt(E, i) && !dual(i)) sup++; }
      if (!tot || sup < SUPPORT * tot || eIn >= 2) { stats.unsupported = (stats.unsupported || 0) + 1; continue; }
      // (an axis that jumps between two measured carriageways (a dual carriageway drawn as one OSM way: the model takes
      // one roadway here, the other there) is no lane line either: the old fit)
      // (a piece into / out of an engine roundabout: the ring is the engine's (its connectors run round the node, refined
      // onto the raster with its arms' lanes): kept on the old fit with it)
      if ([...(p.prev || []), ...(p.next || [])].some((id) => byId.get(id)?.turn === "ring")) { stats.roundabout = (stats.roundabout || 0) + 1; continue; }
      let jump = false; for (let i = 1, prev = -1; i < n; i++) { if (E.s[i] < sa || E.s[i] > sb || !measured(E, i)) continue; if (prev >= 0 && Math.abs(E.axOff[i] - E.axOff[prev]) > AX_JUMP * (i - prev)) { jump = true; break; } prev = i; }
      if (jump) { stats.axisJump = (stats.axisJump || 0) + 1; continue; }
      const prof = profOf(d, rankOf.get(`${part}|${d}|${p.laneId}`) ?? 0);
      if (!prof) { stats.lanesKept++; continue; }
      newPts.set(p.id, laneLine(E, prof, sa, sb, d));
      covered.add(p.id); stats.lanes++;
    }
  }
  // (a model lane whose end at a junction lies far from that junction's node (the model's segment and the engine's
  // road disagree about where the junction is: a node the network passes through, M5 Ch. de La Hulpe): the old fit,
  // a turn across 100 m is no turn)
  for (const c of paths) {
    if (c.kind === "lane" || !c.nodeId || !(c.turn === "left" || c.turn === "right" || c.turn === "straight") || !(jOf.has(c.nodeId) || isJunctionNode(net, c.nodeId))) continue;
    const N = net.nodesById?.get(c.nodeId); if (!N) continue;
    for (const [id, atEnd] of [[c.prev?.[0], true], [c.next?.[0], false]]) {
      const P = newPts.get(id); if (!P) continue;
      const e = atEnd ? P[P.length - 1] : P[0];
      if (Math.hypot(e[0] - N.x, e[1] - N.z) > FAR_END) { covered.delete(id); newPts.delete(id); stats.farEnd = (stats.farEnd || 0) + 1; stats.lanes--; }
    }
  }
  // the new paths: lanes, then connectors
  const out = paths.map((p) => {
    if (!covered.has(p.id)) return p;
    const pts = newPts.get(p.id), cum = cumOf(pts), len = cum[cum.length - 1];
    let stop = p.stop;
    if (stop) {
      // a painted hold line: the same place projected onto the new lane; else the same distance before its end
      let at = Math.max(0, len - (p.len - stop.at));
      if (stop.line) { const P = p.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), c0 = cumOf(P); let k = 1; while (k < P.length - 1 && c0[k] < stop.at) k++; const f = Math.max(0, Math.min(1, (stop.at - c0[k - 1]) / Math.max(1e-9, c0[k] - c0[k - 1]))), X = [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f]; let bd = Infinity; for (let j = 1; j < pts.length; j++) { const a = pts[j - 1], b = pts[j], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-12, u = Math.max(0, Math.min(1, ((X[0] - a[0]) * dx + (X[1] - a[1]) * dz) / L2)), dd = Math.hypot(X[0] - a[0] - dx * u, X[1] - a[1] - dz * u); if (dd < bd) { bd = dd; at = cum[j - 1] + u * Math.sqrt(L2); } } }
      stop = { ...stop, at: Math.max(0, Math.min(len - 0.3, at)) };
    }
    return { ...p, pts, cum, len, stop, model: 1 };
  });
  // TIGHT OR BLOCKED TURNS (the engine's widenTightTurns, laneGraph.js, for the model's lanes): a junction turn between
  // two model lanes whose body meets a building / a trunk / the pavement: its lanes stop 1 m earlier at that end, again,
  // up to CUT_MAX m while the end stays inside the junction, each lane keeping max(3 m, 40 %) of itself; the turn
  // is then laid from the new ends (F8 Av. Jacqueline Harpman: a 4.6 m chord round a corner tree)
  {
    const byO = new Map(out.map((p) => [p.id, p]));
    const turnsJ = out.filter((c) => c.kind !== "lane" && (c.turn === "left" || c.turn === "right" || c.turn === "straight") && covered.has(c.prev?.[0]) && covered.has(c.next?.[0]) && (jOf.has(c.nodeId) || isJunctionNode(net, c.nodeId)));
    const cut = new Map(), key = (id, e) => `${id}|${e}`;
    const trimmed = (p) => { let P = p.pts; const ce = cut.get(key(p.id, 1)) || 0, cs = cut.get(key(p.id, 0)) || 0; if (!ce && !cs) return P; const c0 = cumOf(P), L = c0[c0.length - 1]; return cutLine(P, c0, cs, L - ce); };
    const room = (p, e) => { const L = p.len, other = cut.get(key(p.id, 1 - e)) || 0, mine = cut.get(key(p.id, e)) || 0; return mine + 1 <= CUT_MAX && L - other - mine - 1 >= Math.max(3, 0.4 * L); };
    for (let it = 0; it < CUT_MAX; it++) {
      let changed = false;
      for (const c of turnsJ) {
        const a = byO.get(c.prev[0]), b = byO.get(c.next[0]);
        const J = jOf.get(c.nodeId) ?? null, A = trimmed(a), B2 = trimmed(b);
        const T = g2Turn(A, B2, J, inBuilding, drivable);
        if (!(T.trk > 0)) continue;
        // (only while the new end stays in the junction (a turn begun up the road is no junction turn), unless the turn
        // meets a building / a trunk: that is the harder rule)
        const stays = (P, atEnd) => { if (!J) return true; const c0 = cumOf(P), L = c0[c0.length - 1], q = cutLine(P, c0, atEnd ? 0 : 1, atEnd ? L - 1 : L); const e = atEnd ? q[q.length - 1] : q[0]; return inJunction(J, e[0], e[1]); };
        if (room(a, 1) && (T.trk > 0 || stays(A, true))) { cut.set(key(a.id, 1), (cut.get(key(a.id, 1)) || 0) + 1); changed = true; }
        if (room(b, 0) && (T.trk > 0 || stays(B2, false))) { cut.set(key(b.id, 0), (cut.get(key(b.id, 0)) || 0) + 1); changed = true; }
      }
      if (!changed) break;
    }
    for (const [k2, m] of cut) { if (!m) continue; stats.turnCuts = (stats.turnCuts || 0) + 1; stats.cutMetres = (stats.cutMetres || 0) + m; }
    for (let k = 0; k < out.length; k++) {
      const p = out[k];
      if (p.kind !== "lane" || !(cut.get(key(p.id, 0)) || cut.get(key(p.id, 1)))) continue;
      const pts = trimmed(p), cum = cumOf(pts), len = cum[cum.length - 1], cs = cut.get(key(p.id, 0)) || 0;
      out[k] = { ...p, pts, cum, len, stop: p.stop ? { ...p.stop, at: Math.max(0, Math.min(len - 0.3, p.stop.at - cs)) } : p.stop };
    }
  }
  const by2 = new Map(out.map((p) => [p.id, p]));
  for (let k = 0; k < out.length; k++) {
    const c = out[k];
    if (c.kind === "lane") continue;
    const a = by2.get(c.prev?.[0]), b = by2.get(c.next?.[0]);
    const ca = a && covered.has(a.id), cb = b && covered.has(b.id);
    if (!ca && !cb) continue;
    const J = c.nodeId ? jOf.get(c.nodeId) ?? null : null;
    // (a turn with one end on an old-fit lane: laid anew only where that end moved far along its road (fading the engine's
    // turn by it bent it into a loop); a short move keeps the engine's turn, faded, as the old fit's own turns are)
    const moved = (lane, atEnd) => { if (!lane) return 0; const q = atEnd ? lane.pts[lane.pts.length - 1] : lane.pts[0], o = atEnd ? c.pts[0] : c.pts[c.pts.length - 1]; return Math.hypot((q[0] ?? q.x) - (o[0] ?? o.x), (q[1] ?? q.z) - (o[1] ?? o.z)); };
    const farMove = Math.max(ca ? moved(a, true) : 0, cb ? moved(b, false) : 0) > MIXED_MOVE && (!a || !b || Math.hypot((a.pts[a.pts.length - 1][0] ?? 0) - (b.pts[0][0] ?? 0), (a.pts[a.pts.length - 1][1] ?? 0) - (b.pts[0][1] ?? 0)) < 40);   // (not across 40 m: an old-fit lane's far turn follows its road)
    if (a && b && a.pts.length >= 2 && b.pts.length >= 2 && (ca && cb || farMove) && (c.turn === "left" || c.turn === "right" || c.turn === "straight") && (J || isJunctionNode(net, c.nodeId))) {
      // (a turn with one end on an old-fit lane is laid the same way, from the ends as they are now: the old fit's later
      // sideways shift of that lane fades along it, trafficGraph.js fitToSurface; fading the engine's turn by a lane end
      // that moved along its road (mouth vs engine trim) bent it into a loop)
      const T = g2Turn(a.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), b.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), J, inBuilding, drivable);
      const cum = cumOf(T.pts);
      out[k] = { ...c, pts: T.pts, cum, len: cum[cum.length - 1], model: 2 };
      if (ca && cb) { covered.add(c.id); turns.set(c.id, J?.id ?? null); stats.turns++; if (!J) stats.turnsNoJ++; else if (T.out > 0) stats.turnsOut++; }
      else stats.turnsMixed = (stats.turnsMixed || 0) + 1;
      continue;
    }
    // the engine's shape, its ends moved onto the new lane ends (faded along it)
    const P = c.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), cc = cumOf(P), Lc = cc[cc.length - 1] || 1;
    const E0 = ca ? a.pts[a.pts.length - 1] : P[0], S1 = cb ? b.pts[0] : P[P.length - 1];
    const s0 = [E0[0] - P[0][0], E0[1] - P[0][1]], s1 = [S1[0] - P[P.length - 1][0], S1[1] - P[P.length - 1][1]];
    // (a long turn (an old-fit lane's far turn laid along its road, roadFollowTurns): each end's move fades over FADE m
    // from that end, not along its whole length: faded over 150 m it slid off its road onto the pavement, M5)
    const wS = (d) => (Lc > 2 * FADE ? Math.max(0, 1 - d / FADE) : 1 - d / Lc), wE = (d) => (Lc > 2 * FADE ? Math.max(0, 1 - (Lc - d) / FADE) : d / Lc);
    let Q = P.map((v, j) => { const a2 = wS(cc[j]), b2 = wE(cc[j]); return [v[0] + s0[0] * a2 + s1[0] * b2, v[1] + s0[1] * a2 + s1[1] * b2]; });
    // (a junction turn faded so it now cuts over the pavement / into a building: the G2 turn where it keeps more of
    // the car on the drawn street (an OSM street tree on the corner, Av. Churchill I2))
    if (drivable && a && b && a.pts.length >= 2 && b.pts.length >= 2 && (c.turn === "left" || c.turn === "right" || c.turn === "straight")) {
      const bad = (R) => { let m = 0; for (let j = 1; j + 1 < R.length; j++) { const u = R[j - 1], w = R[j + 1], l = Math.hypot(w[0] - u[0], w[1] - u[1]) || 1, nx = -(w[1] - u[1]) / l, nz = (w[0] - u[0]) / l; for (const o of [0, BODY, -BODY]) if (!drivable(R[j][0] + nx * o, R[j][1] + nz * o) || inBuilding?.(R[j][0] + nx * o, R[j][1] + nz * o)) m++; } return m / R.length; };
      const T = g2Turn(a.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), b.pts.map((v) => [v[0] ?? v.x, v[1] ?? v.z]), null, inBuilding, drivable);
      if (bad(T.pts) + 0.02 < bad(Q)) { Q = T.pts; stats.turnsMixed = (stats.turnsMixed || 0) + 1; }
    }
    const cum = cumOf(Q);
    out[k] = { ...c, pts: Q, cum, len: cum[cum.length - 1] };
    if (ca && cb) covered.add(c.id);
    stats.faded++;
  }
  return { paths: out, covered, turns, stats };
}
const JN = new WeakMap();
function isJunctionNode(net, id) {
  if (!id || !net?.nodes) return false;
  let m = JN.get(net); if (!m) { m = new Map(net.nodes.map((nd) => [nd.id, nd])); JN.set(net, m); }
  const nd = m.get(id);
  return !!nd && (nd.kind === "junction" || nd.kind === "split");
}
