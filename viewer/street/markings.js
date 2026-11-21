// THE LINES ALONG THE ROADS FROM THE STREET MODEL (claude/street2, rule street-model; the model's first consumer,
// docs/STREET_MODEL_PLAN.md 3 "conservative fallbacks"). Plain JS, tile worker + node.
//
//   edge lines        offset curves of the MEASURED kerbs: the line's centre EDGE_IN inside the kerb line, square to
//                     the kerb (not to the OSM line), only where that kerb is M; none across a mouth, a bay, an O / G /
//                     X station
//   lane / centre     only from M (a UrbIS Topo / Brussels Mobility line) or D lanes (both driving ends M on a stable
//                     width, viewer/street/model.js placeLanes)
//   nowhere           inside a junction (polygon or floor disc), over a measured crossing (+ CROSS_PAD), inside another
//                     segment's carriageway crossed at more than 30 deg, on O / G / X
// Style (width, dash pattern) = the engine's rule for that boundary (vendor/roads roadMarkings.js markingStyle via the
// lane stack); the dash phase runs from the segment's start, so both tiles of a seam cut the same dashes.
// Out: decal items for viewer/streets/measuredPaint.js paintMeshV2 (kind solid, one per run piece, `line` = a run id:
// u runs along the whole run, so the joins between pieces draw no seam; paintMeshV2 marks them as along-road lines).
import { decodeLineCode } from "../../vendor/roads/mesh/laneRoadMesh.js";
import { CONF, ROLE, pip2 } from "./model.js";
import { layoutEdges } from "../../vendor/roads/roadCrossSection.js";
import { roadMembers } from "../streets/roadBends.js";

export const EDGE_IN = 0.30;             // m: an edge line's centre inside the kerb (plan 3: "kerb - 0.30 m")
const MIN_RUN = 6;                       // m: a shorter run is not painted (a stub of line is no marking: a mouth, a gap end)
const NARROW = 0.5;                      // m: see the drawn-kerb test of lane / centre lines
const LANE_SLOPE = 0.07;                 // a lane / centre line turning more than this (4 deg) off its axis is not painted there
const STEP_OFF = 0.15;                   // m: a lane / centre line moving sideways more than this from one station to the next (its axis at a kerb step, a snap on / off a measured line): a new run
const MIN_PIECE = 0.3;                   // m: a shorter painted piece (a dash cut by a run end) is dropped
const JUMP_RUN = 1.6;                    // m: consecutive stations (1 m apart) of a run further apart than this: a new run
const DP_TOL = 0.02;                     // m: run polylines simplified to this
const CROSS_COS = Math.cos((30 * Math.PI) / 180);   // another segment's carriageway more than 30 deg off this one's: a crossing

/** both kerbs of E within STEADY m of their offset at station i over +-STEADY_N stations (no kerb step / taper there:
 *  a lane line beside a step is judged, and read, against the step) */
const STEADY = 0.3, STEADY_N = 7;          // (7 m: the drawn taper at a kerb step is up to 6 m long, viewer/surfaces.js taperSteps)
function steady(E, i) {
  // (the kerb points' sideways move against station i's normal)
  const side = (K2, j) => (E.ax[j] + E.nx[j] * K2.off[j]) * E.nx[i] + (E.az[j] + E.nz[j] * K2.off[j]) * E.nz[i];
  const l0 = side(E.kerbL, i), r0 = side(E.kerbR, i);
  for (let j = Math.max(0, i - STEADY_N); j <= Math.min(E.n - 1, i + STEADY_N); j++)
    if (Math.abs(side(E.kerbL, j) - l0) > STEADY || Math.abs(side(E.kerbR, j) - r0) > STEADY) return false;
  return true;
}

/** Douglas-Peucker on [[x, z, s]] */
function simplify(P, tol) {
  if (P.length <= 2) return P;
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let bi = -1, bd = tol;
    const ax = P[a][0], az = P[a][1], dx = P[b][0] - ax, dz = P[b][1] - az, L = Math.hypot(dx, dz) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - ax) * dz - (P[i][1] - az) * dx) / L; if (d > bd) { bd = d; bi = i; } }
    if (bi >= 0) { keep[bi] = 1; st.push([a, bi], [bi, b]); }
  }
  return P.filter((_, i) => keep[i]);
}

/** a polyline [[x, z, s]] (s increasing) cut to the station intervals where a dash is on (period from s = 0) */
function dashes(P, dash) {
  if (!dash) return [P];
  const [on, off] = dash, per = on + off, onAt = (s) => ((s % per) + per) % per < on, out = [];
  let cur = null;
  for (let k = 1; k < P.length; k++) {
    const a = P[k - 1], b = P[k], ds = b[2] - a[2];
    if (!(ds > 1e-9)) continue;
    const cuts = [a[2], b[2]];
    for (let q = Math.floor(a[2] / per); q <= Math.floor(b[2] / per); q++) for (const e of [q * per, q * per + on]) if (e > a[2] && e < b[2]) cuts.push(e);
    cuts.sort((x, y) => x - y);
    const at = (s) => { const f = (s - a[2]) / ds; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, s]; };
    for (let m = 1; m < cuts.length; m++) {
      if (onAt((cuts[m - 1] + cuts[m]) / 2)) { if (!cur) cur = [at(cuts[m - 1])]; cur.push(at(cuts[m])); }
      else if (cur) { out.push(cur); cur = null; }
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** a polyline [[x, z]] of width w -> mitered quads as paint items with a continuous u (run id `id`) */
function quads(P, w, id, items) {
  const n = P.length, cum = [0];
  for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const L = cum[n - 1];
  if (L < 0.05) return;
  const dir = [];
  for (let k = 0; k + 1 < n; k++) { const dx = P[k + 1][0] - P[k][0], dz = P[k + 1][1] - P[k][1], l = Math.hypot(dx, dz) || 1e-9; dir.push([dx / l, dz / l]); }
  // the miter at each vertex (left normal (dz, -dx) of the travel, averaged; length limited)
  const off = P.map((_, k) => {
    const a = dir[Math.max(0, k - 1)], b = dir[Math.min(dir.length - 1, k)];
    let mx = a[1] + b[1], mz = -(a[0] + b[0]); const ml = Math.hypot(mx, mz);
    if (ml < 1e-6) { mx = b[1]; mz = -b[0]; } else { mx /= ml; mz /= ml; }
    const c = Math.max(0.5, mx * b[1] + mz * -b[0]);
    return [(mx * w) / 2 / c, (mz * w) / 2 / c];
  });
  for (let k = 0; k + 1 < n; k++) {
    const [ux, uz] = dir[k], bx = uz, bz = -ux;      // b: across, right -> left
    const p0 = P[k], p1 = P[k + 1];
    const R0 = [p0[0] - off[k][0], p0[1] - off[k][1]], R1 = [p1[0] - off[k + 1][0], p1[1] - off[k + 1][1]];
    const L1 = [p1[0] + off[k + 1][0], p1[1] + off[k + 1][1]], L0 = [p0[0] + off[k][0], p0[1] + off[k][1]];
    const o = [p0[0] - (bx * w) / 2, p0[1] - (bz * w) / 2];
    items.push({ kind: "solid", poly: [R0, R1, L1, L0], frame: { o, a: [ux, uz], b: [bx, bz], u0: -cum[k], u1: L - cum[k], v0: 0, vLen: w }, line: id });
  }
}

/**
 * The model's lines as paint items. model = buildStreetModel's result; opts.near(x, z) limits the work to the runs that
 * reach this tile (paintMeshV2 cuts them on the seam); opts.drawn = lineQuery(this tile's drawn kerbs + street edges).
 * Returns { items, stats }.
 */
export function modelLineItems(model, opts = {}) {
  const items = [], stats = { runs: 0, metres: 0, edgeM: 0, laneM: 0, byConf: { M: 0, D: 0 } };
  const inJ = model.junctionAt;
  // another segment's carriageway crossed at an angle (a dead-end lane or driveway laid onto a street, a crossing the
  // network has no node for): no along-road line of this one there
  const G = new Map(), GK = (i, j) => i * 131071 + j;
  model.segments.forEach((E, k) => { for (let i = Math.floor(E.x0 / 32); i <= Math.floor(E.x1 / 32); i++) for (let j = Math.floor(E.z0 / 32); j <= Math.floor(E.z1 / 32); j++) { const q = GK(i, j); let l = G.get(q); if (!l) G.set(q, (l = [])); l.push(k); } });
  const crossOther = (self, x, z, tx, tz) => {
    for (const k of G.get(GK(Math.floor(x / 32), Math.floor(z / 32))) || []) {
      const O = model.segments[k];
      if (O === self || x < O.x0 || x > O.x1 || z < O.z0 || z > O.z1 || !pip2(x, z, O.ring)) continue;
      let bi = 0, bd = Infinity; for (let i = 0; i < O.n; i++) { const d = (O.ax[i] - x) ** 2 + (O.az[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
      if (Math.abs(-O.nz[bi] * tx + O.nx[bi] * tz) < CROSS_COS) return true;
    }
    return false;
  };
  const near = opts.near ?? (() => true);
  let id = 1;
  for (const E of model.segments) {
    const { n, lanes } = E, B = lanes.B;
    for (let b = 0; b < B; b++) {
      let run = [], code = 0, role = 0;
      const flush = () => {
        if (run.length >= 2 && run[run.length - 1][2] - run[0][2] >= MIN_RUN && run.some((p) => near(p[0], p[1]))) {
          const st = decodeLineCode(code), Ps = role === ROLE.edgeR || role === ROLE.edgeL ? edgeCurves(E, run, role, opts.drawn ?? null) : [run.map((q) => [q[0], q[1], q[2]])];
          for (const P of Ps) {
            if (P[P.length - 1][2] - P[0][2] < MIN_RUN / 2) continue;      // (an edge run the drawn kerb cut short)
            for (const piece of dashes(simplify(P, DP_TOL), st.dash)) {
            let len = 0; for (let k = 1; k < piece.length; k++) len += Math.hypot(piece[k][0] - piece[k - 1][0], piece[k][1] - piece[k - 1][1]);
            if (len < MIN_PIECE) continue;
            quads(piece, st.width, id++, items);
            stats.metres += len; if (role === ROLE.edgeR || role === ROLE.edgeL) stats.edgeM += len; else stats.laneM += len;
            }
          }
          stats.runs++;
        }
        run = [];
      };
      for (let i = 0; i < n; i++) {
        const k = i * B + b, c = lanes.code[k], bc = lanes.bconf[k], r = lanes.role[k];
        const edge = r === ROLE.edgeR || r === ROLE.edgeL;
        const off = lanes.off[k];
        const x = E.ax[i] + E.nx[i] * off, z = E.az[i] + E.nz[i] * off;
        // (an edge line along a raised kerb only, not a flush street edge; a lane / centre line only where it runs within
        // LANE_SLOPE of its axis: a taper's slant is no lane line)
        const K2 = r === ROLE.edgeL ? E.kerbL : E.kerbR;
        const lat = (j) => (E.ax[j] + E.nx[j] * lanes.off[j * B + b]) * E.nx[i] + (E.az[j] + E.nz[j] * lanes.off[j * B + b]) * E.nz[i];
        const slope = !edge && i > 0 && i < n - 1 ? Math.abs(lat(i + 1) - lat(i - 1)) / Math.max(1e-6, E.s[i + 1] - E.s[i - 1]) : 0;
        let paint = c > 0 && !Number.isNaN(off) && (edge ? bc === CONF.M && (K2.kind[i] === 1 || K2.kind[i] === 2) : bc <= CONF.D && !(slope > LANE_SLOPE) && steady(E, i)) && !E.cross[i] && !inJ(x, z) && !crossOther(E, x, z, -E.nz[i], E.nx[i]);
        // (a lane / centre line where THIS tile's drawn kerb comes NARROW m nearer than the model's kerbs (a taper, a
        // build-out the drawn street rounds): none there)
        if (paint && !edge && opts.drawn) { const want = Math.min(off - E.kerbR.off[i], E.kerbL.off[i] - off); if (want > NARROW) { const d = opts.drawn(x, z, want - NARROW); if (d) paint = false; } }
        // (a new run at a change of style, and where the line would jump sideways: never a diagonal across the street)
        const last = run[run.length - 1];
        if (!paint || (run.length && (c !== code || r !== role || Math.hypot(x - last[0], z - last[1]) > JUMP_RUN || (!edge && Math.abs((x - last[0]) * E.nx[i] + (z - last[1]) * E.nz[i]) > STEP_OFF)))) flush();
        if (!paint) continue;
        code = c; role = r;
        run.push([x, z, E.s[i], i, off]);
        if (bc === CONF.M) stats.byConf.M++; else stats.byConf.D++;
      }
      flush();
    }
  }
  stats.metres = Math.round(stats.metres); stats.edgeM = Math.round(stats.edgeM); stats.laneM = Math.round(stats.laneM);
  return { items, stats };
}

/** an edge line's run: the offset curve EDGE_IN inside the kerb, square to it, toward the axis. The model's kerb is the
 *  surveyed one; with `drawn` (this tile's DRAWN kerb / street-edge lines, tapered and splined by viewer/surfaces.js) each
 *  point is refined onto the drawn kerb within REFINE m (else the run breaks there: no line where the drawn kerb is not
 *  the measured one). -> [run [[x, z, s]]] */
const REFINE = 0.5;
function edgeCurves(E, run, role, drawn) {
  const K2 = role === ROLE.edgeL ? E.kerbL : E.kerbR, out = [];
  let cur = [];
  const P = run.map(([, , s, i]) => [E.ax[i] + E.nx[i] * K2.off[i], E.az[i] + E.nz[i] * K2.off[i], s, i]);
  for (let k = 0; k < P.length; k++) {
    const i = P[k][3];
    let qx, qz, kx = P[k][0], kz = P[k][1];
    const d = drawn ? drawn(kx, kz, REFINE) : null;
    if (drawn && !d) { if (cur.length >= 2) out.push(cur); cur = []; continue; }
    if (d) { kx = d.x; kz = d.z; qx = d.uz; qz = -d.ux; }
    else { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1e-9; qx = tz / l; qz = -tx / l; }
    if (qx * (E.ax[i] - kx) + qz * (E.az[i] - kz) < 0) { qx = -qx; qz = -qz; }   // toward the axis
    cur.push([kx + qx * EDGE_IN, kz + qz * EDGE_IN, P[k][2]]);
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

/** nearest-point query on polylines (a grid): (x, z, reach) -> { x, z, ux, uz, d } | null */
export function lineQuery(lines, CELL = 4) {
  const segs = [], grid = new Map(), key = (i, j) => i * 131071 + j;
  for (const pts of lines) for (let k = 1; k < pts.length; k++) {
    const [ax, az] = pts[k - 1], [bx, bz] = pts[k], id = segs.push([ax, az, bx, bz]) - 1;
    for (let i = Math.floor(Math.min(ax, bx) / CELL); i <= Math.floor(Math.max(ax, bx) / CELL); i++)
      for (let j = Math.floor(Math.min(az, bz) / CELL); j <= Math.floor(Math.max(az, bz) / CELL); j++) { const q = key(i, j); let l = grid.get(q); if (!l) grid.set(q, (l = [])); l.push(id); }
  }
  return (x, z, reach) => {
    let best = null;
    for (let i = Math.floor((x - reach) / CELL); i <= Math.floor((x + reach) / CELL); i++) for (let j = Math.floor((z - reach) / CELL); j <= Math.floor((z + reach) / CELL); j++)
      for (const id of grid.get(key(i, j)) || []) {
        const [ax, az, bx, bz] = segs[id], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; if (L2 < 1e-10) continue;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(x - px, z - pz);
        if (d <= reach && (!best || d < best.d)) { const L = Math.sqrt(L2); best = { x: px, z: pz, ux: dx / L, uz: dz / L, d }; }
      }
    return best;
  };
}

/**
 * D-ENGINE LINES (coordinator 2026-11-21, rule street-model): where UrbIS measures nothing at all along a road (every
 * station of its segment part bare, none X: the Flemish fringe, unmapped private lanes) the DRAWN road is the engine's
 * own strip swept from this OSM line, so lines laid on that strip cannot disagree with what is drawn. On those roads
 * the engine asphalt keeps its centre line (t = 0, the engine's own style) and its edge lines (the engine paints one only
 * where its stack has no kerb), moved EDGE_IN inside the strip's edge; every other line code (lane, bike, parking) and
 * every line inside a model junction goes. Every other road: no line code (its lines come from the model). In place on
 * the engine asphalt (aEdges), before the measured overlay. -> stats
 */
export function engineLineCodes(net, part, model) {
  const st = { bareRoads: 0, centreVerts: 0, edgeVerts: 0, cut: 0, ids: [] };
  const E = part?.attributes?.aEdges?.array;
  if (!E) return st;
  const U = part.uv, P = part.position, nv = P.length / 3;
  const segOf = new Map();
  for (const S of model.segments) S.sources.roads.forEach((id, p) => segOf.set(id, [S, p]));
  const bare = net.roads.map((rr) => {
    const q = segOf.get(rr.id); if (!q) return false;
    const [S, p] = q; let any = false;
    for (let i = 0; i < S.n; i++) if (S.part[i] === p) { any = true; if (!S.bare[i] || S.axConf[i] === CONF.X) return false; }
    return any;
  });
  net.roads.forEach((rr, ri) => { if (bare[ri]) { st.bareRoads++; st.ids.push(rr.id); } });
  const member = st.bareRoads ? roadMembers(net, part) : null;
  for (let v = 0; v < nv; v++) {
    const ri = member ? member[v] : -1;
    if (ri < 0 || !bare[ri] || model.junctionAt(P[v * 3], P[v * 3 + 2])) { if (E[v * 4 + 2] || E[v * 4 + 3]) st.cut++; E[v * 4 + 2] = 0; E[v * 4 + 3] = 0; continue; }
    const rr = net.roads[ri], S0 = rr.smp, s = U[v * 2];
    let lo = 0, hi = S0.s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S0.s[m] < s) lo = m; else hi = m; }
    const e = layoutEdges(rr.lays[Math.abs(S0.s[hi] - s) < Math.abs(S0.s[lo] - s) ? hi : lo]);
    for (let k = 0; k < 2; k++) {
      if (E[v * 4 + 2 + k] < 1) continue;
      const lt = E[v * 4 + k];
      if (Math.abs(lt - e.curbL) < 0.03) { E[v * 4 + k] = lt - EDGE_IN; st.edgeVerts++; }
      else if (Math.abs(lt - e.curbR) < 0.03) { E[v * 4 + k] = lt + EDGE_IN; st.edgeVerts++; }
      else if (Math.abs(lt) < 0.05) st.centreVerts++;
      else { E[v * 4 + 2 + k] = 0; st.cut++; }
    }
  }
  return st;
}
