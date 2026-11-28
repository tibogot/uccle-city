// THE TRAFFIC GRAPH of one tile, built in the tile worker from the road engine's lane graph (net.graph.paths: lane
// pieces per direction + junction connectors), i.e. the lanes as drawn, fitted to the measured UrbIS street widths.
// Plain typed arrays (posted to the main thread, zero-copy), no three.js.
//
// What a path carries (index i):
//   geometry   xy[off[i]*2 ..], cum[off[i] ..] (cumulative length), len[i]
//   kind       0 lane piece, 1 junction connector;  turn 0 straight, 1 left, 2 right, 3 u-turn, 4 ring
//   links      next / prev in CSR (nextOff / nextIdx, prevOff / prevIdx), indices into this tile's paths
//   speed      m/s: OSM maxspeed of the road (Brussels default 30 km/h where untagged), capped by curvature on
//              connectors (lateral 2.2 m/s2) — vmax only; the sim brakes ahead of it
//   rank       the road class (engine ROAD_TYPES rank: 0 alley .. 3+ arterial): density per class
//   tram       1 when the road carries tram tracks (OSM): cars share the lane with tram 92
//   core       1 when the path's midpoint is inside this tile (the 150 m buffer copies are handed over to the
//              neighbour's own copy at run time, viewer/traffic/trafficWorld.js)
//   hold       where a car waits on this lane before the junction it leads into: holdAt[i] (m along, -1 = none),
//              ctrl[i] 0 none, 1 signal, 2 stop sign, 3 give way, 4 priority to the right (Belgian default),
//              phase[i] (signals: 0 A / 1 B, signals.js signalPhases: the phase of this approach's road at the node), jnode[i] (junction id)
//   conflicts  per connector, CSR (cfOff / cfOther / cfAt / cfOtherAt / cfYield): the connectors it crosses or merges
//              with, where along each, and whether THIS one yields (1), the other yields (-1) or neither (0: the
//              signal phases keep them apart; still never entered while the other is inside)
// Junction control, from data only: OSM signals (roads.json node control = "signal", the pipeline's OSM
// traffic_signals); OSM stop / give_way points on an approach; else priorité de droite. The road engine's own
// guessed stop / yield lines are NOT obeyed (no data says they exist); their stop-line stations are used as the
// place to wait when there is one.
import { cumulative } from "../../vendor/roads/roadMath.js";
import { signalPhases } from "./signals.js";
import { joinLaneGraph } from "../streets/laneGraph.js";
import { NOT_DRIVEN } from "../streets/carriageway.js";
import { laneOffsetProfile } from "../streets/laneOffset.js";
import { roadFrameOf } from "../streets/lineFit.js";
import { modelLaneStage, repairTurns, blockedTest, kerbIndex, KERB_CLEAR } from "../street/lanes.js";

const TURN = { straight: 0, left: 1, right: 2, uturn: 3, ring: 4 };
export const CTRL = { none: 0, signal: 1, stop: 2, yield: 3, priority: 4 };
const ALAT = 2.2;           // m/s2: comfortable lateral acceleration in a turn

function minRadius(pts) {
  let R = Infinity;
  for (let i = 1; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], [cx, cz] = pts[i + 1];
    const a = Math.hypot(bx - ax, bz - az), b = Math.hypot(cx - bx, cz - bz), c = Math.hypot(cx - ax, cz - az);
    const cross = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax));
    if (cross < 1e-6 || a < 0.05 || b < 0.05) continue;
    R = Math.min(R, (a * b * c) / (2 * cross));
  }
  return R;
}

function pointAt(pts, cum, d) {
  let i = 1;
  while (i < pts.length - 1 && cum[i] < d) i++;
  const s = cum[i] - cum[i - 1], f = s > 1e-9 ? (d - cum[i - 1]) / s : 0;
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
}

/** First crossing of two polylines: [dA, dB] (distances along each) or null. */
function crossing(A, cA, B, cB) {
  for (let i = 1; i < A.length; i++) {
    const ax = A[i - 1][0], az = A[i - 1][1], bx = A[i][0], bz = A[i][1];
    for (let j = 1; j < B.length; j++) {
      const cx = B[j - 1][0], cz = B[j - 1][1], dx = B[j][0], dz = B[j][1];
      const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, den = rx * sz - rz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((cx - ax) * sz - (cz - az) * sx) / den, u = ((cx - ax) * rz - (cz - az) * rx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return [cA[i - 1] + t * (cA[i] - cA[i - 1]), cB[j - 1] + u * (cB[j] - cB[j - 1])];
    }
  }
  return null;
}

/**
 * THE BLOCKY TURNS (owner, 2026-11-13: "the car turning ... very bad, like blocky"): the lane paths had sharp vertices
 * (I6: lane pieces with ONE vertex turning 97, 45, 37 deg where the road bends, 0.6 m sideways hooks at lane ends,
 * u-turn connectors up to 162 deg) and sharp JOINS (90 of 526 lane-end -> connector-start joins turning > 30 deg): the
 * car drove straight, then pivoted. The whole lane network is smoothed as ONE graph: a junction point is shared by
 * the paths that end there and the ones that start there (their ends move together, so they still meet), and only
 * the points within KINK_REACH m of a vertex or join turning more than KINK_DEG move (Laplacian); straight runs and
 * gentle curves keep their measured centre line; true ends (dead ends, tile edges) stay put.
 */
const KINK_DEG = 8, KINK_REACH = 3, KINK_ITER = 30, JOIN_TOL = 0.05;
function roundKinks(paths, keep = null, pinned = null, pinKeep = null) {
  const P = paths.length, base = new Int32Array(P + 1);
  for (let i = 0; i < P; i++) base[i + 1] = base[i] + paths[i].pts.length;
  const N = base[P];
  // union the joins: path i's last point with each next path's first point (when they really touch)
  const parent = new Int32Array(N); for (let k = 0; k < N; k++) parent[k] = k;
  const find = (k) => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
  const byId = new Map(paths.map((p, i) => [p.id, i]));
  paths.forEach((p, i) => {
    const e = p.pts[p.pts.length - 1];
    for (const id of p.next || []) {
      const j = byId.get(id); if (j == null) continue;
      const s = paths[j].pts[0];
      if (Math.hypot(e[0] - s[0], e[1] - s[1]) <= JOIN_TOL) parent[find(base[i + 1] - 1)] = find(base[j]);
    }
  });
  const node = new Int32Array(N), x = [], z = [];
  const id = new Map();
  for (let i = 0; i < P; i++) paths[i].pts.forEach((v, k) => {
    const r = find(base[i] + k);
    let n = id.get(r); if (n == null) { n = x.length; id.set(r, n); x.push(v[0]); z.push(v[1]); }
    node[base[i] + k] = n;
  });
  const M = x.length, ins = Array.from({ length: M }, () => []), outs = Array.from({ length: M }, () => []);
  for (let i = 0; i < P; i++) for (let k = base[i]; k + 1 < base[i + 1]; k++) {
    const u = node[k], w = node[k + 1]; if (u === w) continue;
    if (!outs[u].includes(w)) outs[u].push(w); if (!ins[w].includes(u)) ins[w].push(u);
  }
  // kinks: the sharpest in -> out turn at each node
  const kink = new Uint8Array(M);
  for (let n = 0; n < M; n++) {
    let mx = 0;
    for (const u of ins[n]) for (const w of outs[n]) {
      const h1 = Math.atan2(x[n] - x[u], z[n] - z[u]), h2 = Math.atan2(x[w] - x[n], z[w] - z[n]);
      mx = Math.max(mx, Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1))));
    }
    if (mx * 180 / Math.PI > KINK_DEG) kink[n] = 1;
  }
  // free: within KINK_REACH m (along the network) of a kink, and not a true end
  const dist = new Float32Array(M).fill(Infinity), queue = [];
  for (let n = 0; n < M; n++) if (kink[n]) { dist[n] = 0; queue.push(n); }
  if (!queue.length) return paths;
  for (let h = 0; h < queue.length; h++) {
    const n = queue[h];
    for (const m of ins[n].concat(outs[n])) {
      const d = dist[n] + Math.hypot(x[m] - x[n], z[m] - z[n]);
      if (d <= KINK_REACH && d < dist[m]) { dist[m] = d; queue.push(m); }
    }
  }
  // (claude/lanes5: a street-model lane's points move only as far as they keep clear of the measured kerb lines
  // (pinKeep): the Laplacian shrank its bends toward their chords, 0.9-1.4 m inward on the winding Rue Jean d'Osta (B4)
  // and Rue Professeur Hustin (B6), onto the kerb. Not pinned outright: it also takes the measured axis' station noise
  // out of the lane, which the slalom census counts (pinned: 2.8x the slalom metres on C3 B4 E3 K12))
  const pin = new Uint8Array(M);
  if (pinned) for (let i = 0; i < P; i++) if (pinned(paths[i])) for (let k = base[i]; k < base[i + 1]; k++) pin[node[k]] = 1;
  const free = []; for (let n = 0; n < M; n++) if (dist[n] <= KINK_REACH && ins[n].length && outs[n].length) free.push(n);
  let X = Float64Array.from(x), Z = Float64Array.from(z);
  for (let it = 0; it < KINK_ITER; it++) {
    const nX = X.slice(), nZ = Z.slice();
    for (const n of free) {
      let sx = 0, sz = 0, c = 0;
      for (const m of ins[n]) { sx += X[m]; sz += Z[m]; c++; }
      for (const m of outs[n]) { sx += X[m]; sz += Z[m]; c++; }
      nX[n] = X[n] + 0.5 * (sx / c - X[n]); nZ[n] = Z[n] + 0.5 * (sz / c - Z[n]);
      const ok = pin[n] && pinKeep ? (a, b, c2, d) => (!keep || keep(a, b, c2, d)) && pinKeep(a, b, c2, d) : keep;
      if (ok && !ok(X[n], Z[n], nX[n], nZ[n])) {       // (trafpark: never into a parked car: as far as it stays clear)
        let f = 0.5;
        while (f > 0.1 && !ok(X[n], Z[n], X[n] + (nX[n] - X[n]) * f, Z[n] + (nZ[n] - Z[n]) * f)) f *= 0.5;
        if (f <= 0.1) f = 0;
        nX[n] = X[n] + (nX[n] - X[n]) * f; nZ[n] = Z[n] + (nZ[n] - Z[n]) * f;
      }
    }
    X = nX; Z = nZ;
  }
  return paths.map((p, i) => {
    let moved = false;
    const q = p.pts.map((v, k) => { const n = node[base[i] + k]; if (X[n] !== v[0] || Z[n] !== v[1]) moved = true; return [X[n], Z[n], ...v.slice(2)]; });
    if (!moved) return p;
    const cum = cumulative(q);
    return { ...p, pts: q, cum, len: cum[q.length - 1] };
  });
}

/**
 * net: buildRoadNetwork result; roads: roads.json (OSM meta); feats: features.json (signal / stop / give_way points);
 * bounds: the tile's core square.
 */
export function buildTrafficGraph(net, roads, feats, bounds, grid = null, opts = {}) {
  const t0 = performance.now();
  const fitStatsPre = {};
  let raw = net.graph.paths.filter((p) => p.len > 0.2 && p.pts.length >= 2);
  // class R (claude/roads, rule 38): the moving traffic drives where the city's carriageway test says cars drive
  // (viewer/streets/carriageway.js NOT_DRIVEN): not the service ways the engine also draws (alleys behind the houses,
  // private estate roads, car-park ramps: OSM highway=service, 2,360 ways). Before, a car turned off the Chaussée de
  // Waterloo into the service alley behind its houses (J6) and along a private road through the Stalle depot (C5).
  // Lanes on those roads and every turn into / out of them are left out (?roads=old: opts.roadsR false)
  if (opts.roadsR !== false && net.roadsById) {
    const off = new Set(raw.filter((p) => p.kind === "lane" && NOT_DRIVEN.has(net.roadsById.get(p.roadId)?.src?.meta?.highway)).map((p) => p.id));
    if (off.size) {
      const dropT = new Set(raw.filter((p) => p.kind !== "lane" && [...(p.prev || []), ...(p.next || [])].some((id) => off.has(id))).map((p) => p.id));
      raw = raw.filter((p) => !off.has(p.id) && !dropT.has(p.id));
      fitStatsPre.serviceLanes = off.size; fitStatsPre.serviceTurns = dropT.size;
    }
  }
  // claude/street4 (rule street-lanes, docs/STREET_MODEL_PLAN.md job 4): on the roads the street model covers, the lanes
  // are offset curves inside the measured carriageway and the junction turns G2 curves inside the junction polygons
  // (viewer/street/lanes.js, clear of the parked cars by one smooth profile); those paths skip the old fit below
  // (fitToSurface's kerb push, parked-car shifts and far snap; laneShifter / roadFollowTurns ran on the engine lanes
  // before and are replaced). opts.model: the street model (null = ?streetlanes=old, or no model on this tile)
  let covered = null;
  if (opts.model) {
    const tM = performance.now();
    const M = modelLaneStage(net, opts.model, raw, opts.parked?.length ? opts.parked : null, net.streetKerbs ?? null, opts.inBuilding ?? null, grid ? drivableOn(grid) : null, feats?.trees ?? null);
    raw = M.paths; covered = M.covered;
    fitStatsPre.model = { ...M.stats, ms: Math.round(performance.now() - tM) };
    if (opts.trace) opts.trace.afterModel = raw.filter((p) => covered.has(p.id)).map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((v) => [v[0], v[1]]) }));
  }
  const fitStats = { points: 0, moved: 0, maxShift: 0, ...fitStatsPre };
  // citydefects: the parked cars (viewer/streets/parkPlace.js widthParking, built in the worker too) are kept clear of:
  // each lane slides sideways to pass them by PARK_CLEAR where the measured carriageway lets it
  const TP = !opts.old;                       // trafpark (?trafpark=old: opts.old)
  const parked = opts.parked?.length ? parkedGrid(opts.parked, TP) : null;
  const raw2 = parked && TP ? densify(raw, 1.5) : raw;
  const tF = performance.now();
  const fitted = grid ? fitToSurface(raw2, grid, fitStats, parked, opts.trace, TP, opts.roadsR !== false, opts.inBuilding && !opts.noSnap ? laneOffOf(net) : null, opts.noSnap ? null : opts.inBuilding, covered) : raw2;
  fitStats.fitMs = Math.round(performance.now() - tF);
  if (opts.trace) opts.trace.afterFit = fitted.map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((v) => [v[0], v[1]]) }));
  // round 5: fitToSurface moves each lane on its own; lane-to-lane joins (continuations) are closed again
  if (grid) fitStats.rejoined = joinLaneGraph({ graph: { paths: fitted, byId: new Map(fitted.map((p) => [p.id, p])) } }).gapsBefore;
  if (opts.trace) opts.trace.afterJoin = fitted.map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((v) => [v[0], v[1]]) }));
  // (trafpark: the rounding pulled 70 of I6's 131 parked cars back under the lanes the fit had moved clear of them:
  // a node does not move closer to a parked car than the fit's clearance)
  const keepClear = parked && TP ? (x0, z0, x1, z1) => { const d1 = parked.dist(x1, z1); return d1 >= TP_HALF + TP_FIT * 0.5 || d1 >= parked.dist(x0, z0); } : null;
  const tK = performance.now();
  // (claude/lanes5: a model lane's point never moves nearer than KERB_CLEAR to a measured kerb line it was clear of)
  const KI = covered && net.streetKerbs?.length ? kerbIndex(net.streetKerbs) : null;
  // (and never into a drawn building it was clear of, a car body's half width round it: Rue de la Cueillette D8)
  const bodyIn = opts.inBuilding ? (x, z) => [[0, 0], [0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].some(([a, b]) => opts.inBuilding(x + a, z + b)) : null;
  const kerbOk = KI ? (x0, z0, x1, z1) => { const d1 = KI.dist(x1, z1, KERB_CLEAR + 0.5); return d1 >= KERB_CLEAR || d1 >= KI.dist(x0, z0, KERB_CLEAR + 0.5); } : null;
  const kerbKeep = covered && (kerbOk || bodyIn) ? (x0, z0, x1, z1) => (!kerbOk || kerbOk(x0, z0, x1, z1)) && (!bodyIn || !bodyIn(x1, z1) || bodyIn(x0, z0)) : null;
  const src = roundKinks(fitted, keepClear, covered ? (p) => p.kind === "lane" && covered.has(p.id) : null, kerbKeep);
  fitStats.kinkMs = Math.round(performance.now() - tK);
  // (claude/street4: no junction turn through a building, a street tree or over the pavement, whichever fit laid it)
  if (opts.model) fitStats.turnsRepaired = repairTurns(src.map((p, i) => (p === fitted[i] ? (src[i] = { ...p, pts: p.pts.map((v) => [v[0], v[1]]) }) : p)), blockedTest(opts.inBuilding ?? null, feats?.trees ?? null), grid ? drivableOn(grid) : null);
  if (opts.trace) { opts.trace.src = src; opts.trace.raw = raw2; }
  // trafpark: the check along every driven path, junction connectors too: a parked car any path still touches goes
  let parkedKept = opts.parked || null;
  if (parked && TP) {
    const tC = performance.now();
    const drop = new Set();
    // (claude/lanes5, rule street-lanes: a parked car a street-model lane cannot hold PARK_CLEAR from (its station's
    // measured room is too narrow for both) is not parked there: dropped as data, not squeezed past by the sim)
    if (covered) for (const p of src) {
      if (p.kind !== "lane" || !covered.has(p.id)) continue;
      const q = p.pts;
      for (let k = 1; k < q.length; k++) {
        const a = q[k - 1], b = q[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
        if (!parked.anyNear((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, L / 2 + 5.5)) continue;
        for (let m = 0; m <= n; m++) { const t = m / n; parked.each(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, LANE_PARK_DROP, (ci) => { if (!drop.has(ci)) { drop.add(ci); fitStats.laneClearDropped = (fitStats.laneClearDropped || 0) + 1; } }); }
      }
    }
    for (const p of src) {
      const q = p.pts;
      let any = false;
      for (let k = 1; k < q.length; k++) {
        const a = q[k - 1], b = q[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.25));
        if (!parked.anyNear((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, L / 2 + 5.5)) continue;     // (no car centre near this segment)
        any = true;
        for (let m = 0; m <= n; m++) { const t = m / n; parked.each(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, TP_HALF, (ci) => drop.add(ci)); }
      }
      // the BODY as the sim poses it (trafficSim.js pose: the axles on the path, the box along them): on a bend or a
      // junction turn its corners leave the centre line's disc (a 10 m radius: ~0.2 m)
      const c = p.cum || cumulative(q), len = c[c.length - 1];
      if (any) for (let sd = 0; sd <= len; sd += 0.5) {
        const F = pointAt(q, c, sd + TP_WB / 2), R = pointAt(q, c, sd - TP_WB / 2);
        const hx = F[0] - R[0], hz = F[1] - R[1], hl = Math.hypot(hx, hz) || 1;
        const body = { x: (F[0] + R[0]) / 2, z: (F[1] + R[1]) / 2, ax: hx / hl, az: hz / hl };
        parked.each(body.x, body.z, 2.6, (ci) => { if (!drop.has(ci) && boxesOverlap(body, parked.sites[ci])) drop.add(ci); });
      }
    }
    // (claude/parking1, rule service-vehicle-passage: no parked car within MOUTH_CLEAR m of a junction, as the Belgian
    // highway code has it (art. 24: 5 m from the crossing carriageway): measured from each junction turn's ends, the
    // lane mouths, to the parked box. The width parking keeps 12 m off a WAY's end, but a big junction (a dual
    // carriageway's merged node) has its mouths further out: Rue Engeland D7 had a car 1.9 m from a lane's end, inside
    // the posed turn's sweep; the car behind waited for it for good and a bus with it (trafmix, seed 23, old lanes))
    let mouthDropped = 0;
    const notJunction = new Set((net.nodes || []).filter((n) => n.kind === "continuation" || n.kind === "split" || n.kind === "end").map((n) => n.id));
    if (!MOUTH_OLD && opts.mouth !== false) for (const p of src) {
      if (p.kind !== "connector" || p.pts.length < 2 || notJunction.has(p.nodeId)) continue;      // (a junction's turns only)
      for (const e of [p.pts[0], p.pts[p.pts.length - 1]]) parked.within(e[0], e[1], MOUTH_CLEAR, (ci) => { if (!drop.has(ci)) { drop.add(ci); mouthDropped++; } });
    }
    fitStats.parkMouth = mouthDropped + (opts.mouthBefore || 0);
    fitStats.parkDropped = drop.size + (opts.droppedBefore || 0);
    fitStats.checkMs = Math.round(performance.now() - tC);
    if (drop.size) parkedKept = opts.parked.filter((c, ci) => !drop.has(ci));
    // the lanes were bent round cars that are now gone: built once more around the kept ones (then checked again)
    if (drop.size && !opts.droppedBefore) return buildTrafficGraph(net, roads, feats, bounds, grid, { ...opts, parked: parkedKept, droppedBefore: drop.size, mouthBefore: mouthDropped });
  }
  const idx = new Map(src.map((p, i) => [p.id, i]));
  const P = src.length;
  let nPts = 0;
  for (const p of src) nPts += p.pts.length;
  const xy = new Float32Array(nPts * 2), cum = new Float32Array(nPts), off = new Uint32Array(P + 1), pv = new Float32Array(nPts);
  const len = new Float32Array(P), speed = new Float32Array(P), kind = new Uint8Array(P), turn = new Uint8Array(P);
  const rank = new Uint8Array(P), tram = new Uint8Array(P), core = new Uint8Array(P), model = new Uint8Array(P);
  const holdAt = new Float32Array(P).fill(-1), ctrl = new Uint8Array(P), phase = new Uint8Array(P), jnode = new Int32Array(P).fill(-1);
  const nodeOf = new Int32Array(P).fill(-1);
  const roadOf = (p) => net.roadsById.get(p.roadId);
  const kmh = (rr) => { const v = parseFloat(rr?.src?.meta?.maxspeed); return v > 4 && v < 130 ? v : 30; };   // Brussels: 30 km/h unless signed
  let o = 0;
  src.forEach((p, i) => {
    off[i] = o;
    const c = p.cum || cumulative(p.pts);
    for (let k = 0; k < p.pts.length; k++) { xy[(o + k) * 2] = p.pts[k][0]; xy[(o + k) * 2 + 1] = p.pts[k][1]; cum[o + k] = c[k]; }
    o += p.pts.length;
    len[i] = p.len;
    kind[i] = p.kind === "connector" ? 1 : 0;
    turn[i] = TURN[p.turn] ?? 0;
    model[i] = covered?.has(p.id) ? (p.model === 2 ? 2 : 1) : 0;          // (claude/street4: 1 a model lane, 2 a G2 turn, 1 a connector between model lanes)
    const [mx, mz] = pointAt(p.pts, c, p.len / 2);
    core[i] = mx >= bounds.x0 && mx < bounds.x1 && mz >= bounds.z0 && mz < bounds.z1 ? 1 : 0;
  });
  off[P] = o;
  // links
  const csr = (key) => {
    const o2 = new Uint32Array(P + 1), list = [];
    src.forEach((p, i) => { o2[i] = list.length; for (const id of p[key]) { const j = idx.get(id); if (j != null) list.push(j); } });
    o2[P] = list.length;
    return [o2, Int32Array.from(list)];
  };
  const [nextOff, nextIdx] = csr("next"), [prevOff, prevIdx] = csr("prev");
  // speeds, classes, tram flags: lanes from their road; connectors from the roads they join
  src.forEach((p, i) => {
    if (kind[i]) return;
    const rr = roadOf(p);
    speed[i] = kmh(rr) / 3.6;
    rank[i] = rr?.type?.rank ?? 1;
    tram[i] = rr?.src?.meta?.tram ? 1 : 0;
    // per point: the curvature limit (radius over +-5 m of arc), braked for ahead by the sim (pv)
    const c = p.cum || cumulative(p.pts);
    for (let k = 0; k < p.pts.length; k++) {
      const a = pointAt(p.pts, c, Math.max(0, c[k] - 5)), b = pointAt(p.pts, c, Math.min(p.len, c[k] + 5));
      const R = minRadius([a, p.pts[k], b]);
      pv[off[i] + k] = Math.min(speed[i], Math.max(4, Math.sqrt(ALAT * R)));
    }
  });
  src.forEach((p, i) => {
    if (!kind[i]) return;
    let v = 50 / 3.6, rk = 0, tr = 0;
    for (let k = prevOff[i]; k < prevOff[i + 1]; k++) { v = Math.min(v, speed[prevIdx[k]] || v); }
    for (let k = nextOff[i]; k < nextOff[i + 1]; k++) { const j = nextIdx[k]; v = Math.min(v, speed[j] || v); rk = Math.max(rk, rank[j]); tr |= tram[j]; }
    const R = minRadius(p.pts);
    speed[i] = Math.max(2.5, Math.min(v, Math.sqrt(ALAT * R)));
    rank[i] = rk; tram[i] = tr;
    for (let k = off[i]; k < off[i + 1]; k++) pv[k] = speed[i];
  });

  // ---- junctions: control per approach from data, conflicts between connectors
  const pts = (feats.points || []);
  // the phases: one table per tile's roads, the one the drawn posts read too (rule signal-phase-road, signals.js)
  const PT = signalPhases(roads);
  const signPts = pts.filter((q) => q.kind === "stop" || q.kind === "give_way");
  const jnodes = [];
  const stats = { junctions: 0, signal: 0, stop: 0, yield: 0, priority: 0, conflicts: 0, pedSignals: 0 };
  const cf = [];          // per connector index: [{ other, at, otherAt, yieldsTo }]
  for (const node of net.nodes) {
    const cons = (node.connectors || []).map((c) => idx.get(c.id)).filter((i) => i != null);
    const osmSignal = node.src?.control === "signal";
    // pedestrian-crossing signals on a road (a 2-arm node with OSM signals): stop before the node on each approach
    if (!cons.length && osmSignal && node.arms?.length === 2) {
      for (const a of node.arms) for (const lane of a.approach) {
        const pid = a.road.laneEnds?.[a.end]?.in[lane.laneId], i = idx.get(pid);
        if (i == null) continue;
        if (PT.junctionOf(node.id, a.road.id)) continue;   // (coming out of the junction it is a signal of: not held, rule signal-phase-road)
        holdAt[i] = Math.max(0, len[i] - 4.5); ctrl[i] = CTRL.signal; jnode[i] = jnodes.length;
        phase[i] = PT.phaseAt(node.id, a.road.id, ...dirAtEnd(src[i], 20));
        stats.pedSignals++;
      }
      jnodes.push({ id: node.id, x: node.x, z: node.z, kind: "crossing", signal: true, cons: [] });
      continue;
    }
    if (!cons.length || node.kind === "continuation" || node.kind === "split" || node.kind === "end") continue;
    const J = jnodes.length;
    jnodes.push({ id: node.id, x: node.x, z: node.z, kind: node.kind, signal: osmSignal, cons });
    stats.junctions++;
    for (const ci of cons) nodeOf[ci] = J;
    // the approaches (incoming lane pieces) and their control
    const entries = new Map();      // lane index -> { arm, ctrl, phase }
    const lanes = [];
    for (const ci of cons) for (const id of src[ci].prev) { const li = idx.get(id); if (li != null && !lanes.includes(li)) lanes.push(li); }
    // OSM stop / give_way points within 25 m of the node: each to the approach lane whose end it is nearest
    const signOf = new Map();
    if (!osmSignal && node.kind !== "roundabout") for (const q of signPts) {
      if ((q.x - node.x) ** 2 + (q.z - node.z) ** 2 > 625) continue;
      let best = -1, bd = 14 * 14;
      for (const li of lanes) { const d = distToLaneEnd(src[li], q, 30); if (d < bd) { bd = d; best = li; } }
      if (best >= 0) signOf.set(best, q);
    }
    for (const li of lanes) {
      const lp = src[li];
      const arm = node.arms.find((a) => a.road.id === lp.roadId) || null;
      let c = CTRL.priority, ph = 0, ce = 0;
      if (node.kind === "roundabout") c = CTRL.yield;
      else if (osmSignal && !PT.junctionOf(node.id, lp.roadId)) {
        c = CTRL.signal;
        // the phase of the road this approach belongs to at this node: the posts facing it read the same table
        ph = PT.phaseAt(node.id, lp.roadId, ...dirAtEnd(lp, 20));
      } else if (osmSignal) {
        // (rule signal-phase-road) an approach signal of the junction this lane comes FROM (D7 n11224569284 / n169231590
        // round n150588281: its heads face the traffic going into that junction): not held here; a car that turned
        // there stopped 0-3 m on, inside the junction's turn, at a red no head showed it (trafmix stuck, D7)
        c = CTRL.priority;
      } else if (signOf.has(li)) c = signOf.get(li).kind === "stop" ? CTRL.stop : CTRL.yield;
      else if (PT.approachSignal(node.id, lp.roadId)) {
        // a junction whose signals are on its approaches: the cars from such an approach passed its green; against the
        // other approaches they keep apart by phase (no priority-to-the-right yield across phases, the D7 car that
        // yielded 0.4 m past the Rue du Chateau d'Or signal, inside its turn); still uncontrolled here (no second stop)
        ce = 1; ph = PT.phaseAt(node.id, lp.roadId, ...dirAtEnd(lp, 20));
      }
      // where to wait: the engine's stop line on this lane when it drew one, else the junction mouth
      const at = lp.stop ? lp.stop.at : Math.max(0, lp.len - 0.6);
      entries.set(li, { arm, c: ce ? CTRL.signal : c, ph });
      holdAt[li] = at; ctrl[li] = c; phase[li] = ph; jnode[li] = J;
      stats[c === CTRL.signal ? "signal" : c === CTRL.stop ? "stop" : c === CTRL.yield ? "yield" : "priority"]++;
    }
    // conflicts
    const cIn = (ci) => idx.get(src[ci].prev[0]);
    const head = (ci) => { const q = src[ci].pts; return [q[1][0] - q[0][0], q[1][1] - q[0][1]]; };
    for (let a = 0; a < cons.length; a++) for (let b = a + 1; b < cons.length; b++) {
      const ia = cons[a], ib = cons[b];
      const la = cIn(ia), lb = cIn(ib);
      if (la === lb) continue;                                         // same entry lane: they diverge
      const pa = src[ia], pb = src[ib];
      let at = null;
      if (pa.next[0] && pa.next[0] === pb.next[0]) at = [len[ia], len[ib]];   // merge into the same exit lane
      else at = crossing(pa.pts, pa.cum, pb.pts, pb.cum);
      if (!at) continue;
      // who yields
      const ea = entries.get(la), eb = entries.get(lb);
      let y = 0;                                                       // +1: a yields to b
      const [hax, haz] = norm(head(ia)), [hbx, hbz] = norm(head(ib));
      const opp = hax * hbx + haz * hbz < -0.6;
      // b comes from a's right when b's heading points to a's left: dot(hb, right(a)) < 0, right(a) = (-haz, hax)
      const bFromRight = hbx * -haz + hbz * hax < -0.35, aFromRight = hax * -hbz + haz * hbx < -0.35;
      const ta = turn[ia], tb = turn[ib];
      const rankOf = (e) => (e && (e.c === CTRL.stop || e.c === CTRL.yield) ? 0 : 1);
      if (ta === TURN.ring && tb !== TURN.ring) y = -1;
      else if (tb === TURN.ring && ta !== TURN.ring) y = 1;
      else if (ea?.c === CTRL.signal && eb?.c === CTRL.signal) {
        if (ea.ph !== eb.ph) y = 0;                                    // never green together
        else if (opp) y = ta === TURN.left && tb !== TURN.left ? 1 : tb === TURN.left && ta !== TURN.left ? -1 : 0;
        else y = bFromRight ? 1 : aFromRight ? -1 : 0;
      } else if (rankOf(ea) !== rankOf(eb)) y = rankOf(ea) < rankOf(eb) ? 1 : -1;
      else if (opp) y = ta === TURN.left && tb !== TURN.left ? 1 : tb === TURN.left && ta !== TURN.left ? -1 : 0;
      else y = bFromRight ? 1 : aFromRight ? -1 : 0;                  // priorité de droite
      (cf[ia] ||= []).push([ib, at[0], at[1], y]);
      (cf[ib] ||= []).push([ia, at[1], at[0], -y]);
      stats.conflicts++;
    }
  }
  const cfOff = new Uint32Array(P + 1), list = [];
  for (let i = 0; i < P; i++) { cfOff[i] = list.length; for (const c of cf[i] || []) list.push(c); }
  cfOff[P] = list.length;
  const cfOther = Int32Array.from(list, (c) => c[0]), cfAt = Float32Array.from(list, (c) => c[1]), cfOtherAt = Float32Array.from(list, (c) => c[2]);
  const cfYield = Int8Array.from(list, (c) => c[3]);
  const tW = performance.now(), clearW = laneClearWidths(src, P, grid, parkedKept);
  fitStats.clearMs = Math.round(performance.now() - tW);
  return {
    paths: P, xy, cum, off, pv, len, speed, kind, turn, rank, tram, core, model, nextOff, nextIdx, prevOff, prevIdx,
    holdAt, ctrl, phase, jnode, nodeOf, cfOff, cfOther, cfAt, cfOtherAt, cfYield,
    jnodes: jnodes.map((j) => ({ id: j.id, x: j.x, z: j.z, kind: j.kind, signal: !!j.signal })), parkedKept,
    ...narrowStretches(src, P), clearW,
    bounds, stats: { ...stats, paths: P, fit: fitStats, ms: Math.round(performance.now() - t0) },
  };
}

/** (lane path, x, z, its left normal) -> the lane's offset from its road's OSM centre line along that normal (m) */
function laneOffOf(net) {
  if (!net?.roadsById) return null;
  return (p, x, z, nx, nz) => {
    const rr = net.roadsById.get(p.roadId); if (!rr?.smp || !rr.al) return 0;
    const f = roadFrameOf(rr, x, z);
    return f.t * (f.nx * nx + f.nz * nz);
  };
}
const norm = ([x, z]) => { const L = Math.hypot(x, z) || 1; return [x / L, z / L]; };
/** Direction of lane piece p over its last `back` m. */
function dirAtEnd(p, back = 1) {
  const q = p.pts, n = q.length, [ax, az] = pointAt(q, p.cum, Math.max(0, p.len - back));
  return norm([q[n - 1][0] - ax, q[n - 1][1] - az]);
}
/** Squared distance of point q to the last `back` m of lane piece p (or its end, extended 15 m into the junction). */
function distToLaneEnd(p, q, back) {
  let bd = Infinity;
  const pts = p.pts, c = p.cum, n = pts.length;
  const seg = (ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.z - az) * dz) / L2));
    bd = Math.min(bd, (ax + dx * t - q.x) ** 2 + (az + dz * t - q.z) ** 2);
  };
  for (let i = n - 1; i > 0 && c[i] > p.len - back - 10; i--) seg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  const [ux, uz] = dirAtEnd(p, 5);
  seg(pts[n - 1][0], pts[n - 1][1], pts[n - 1][0] + ux * 15, pts[n - 1][1] + uz * 15);
  return bd;
}

// ---------------------------------------------------------------- lanes onto the MEASURED carriageway
// The engine's lane stacks are fitted into the measured kerb-to-kerb widths (surfaces.js fitRoadWidths), but where
// that fit is off (one-sided streets, a measured road the engine centres differently) a lane can run over a
// sidewalk. Each lane point whose car footprint (+-1 m) is not on roadway / tram roadway / parking is moved sideways
// to the nearest place where it is (at most 5 m), the shifts smoothed along the lane; connectors take the shift of
// their entry lane at their start and of their exit lane at their end, blended along their length. The graph's
// geometry only: the drawn markings stay the engine's.
const CARRIAGE = [true, true, false, true, false, false, false, false, false, false];
/** (x, z) on the drawn carriageway of class raster G (off the raster: unknown, true) */
const drivableOn = (G) => (x, z) => { const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step); if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return true; const c = G.data[j * G.nx + i] - 1; return c >= 0 && CARRIAGE[c]; };

// NARROW STRETCHES (citydefects 2026-11-16): where the two directions of a street come closer than NARROW m (a street
// whose free width beside its parked cars is under ~5.5 m: the lanes, kept clear of the cars, overlap), the sim lets ONE
// direction through at a time (trafficSim.js accel: a car waits before its stretch while an oncoming car is in the
// opposing one). CSR per path: nOff; per stretch nS0 / nS1 (m along this path), nOpp (the opposing path's index), nO0 /
// nO1 (m along it).
const NARROW = 2.3, END_SKIP = 6, MIN_RUN = 4, MERGE = 15;
function narrowStretches(src, P) {
  const pts = [], grid = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  const cums = src.map((p) => p.cum || cumulative(p.pts));
  src.forEach((p, i) => {
    if (p.kind === "connector") return;
    const q = p.pts;
    for (let k = 0; k < q.length; k++) {
      const a = q[Math.max(0, k - 1)], b = q[Math.min(q.length - 1, k + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const e = { i, s: cums[i][k], x: q[k][0], z: q[k][1], tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
      pts.push(e);
      const kk = key(Math.floor(e.x / 4), Math.floor(e.z / 4));
      if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(e);
    }
  });
  const hits = new Map();                         // "i,j" -> { s: [], o: [] }
  for (const e of pts) {
    const i0 = Math.floor(e.x / 4), j0 = Math.floor(e.z / 4);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const f of grid.get(key(i0 + di, j0 + dj)) || []) {
      if (f.i === e.i || e.tx * f.tx + e.tz * f.tz > -0.6) continue;     // another path, the other way
      if (e.s < END_SKIP || e.s > src[e.i].len - END_SKIP || f.s < END_SKIP || f.s > src[f.i].len - END_SKIP) continue;   // (junction mouths: the junction logic's)
      if (Math.hypot(f.x - e.x, f.z - e.z) > NARROW) continue;
      const h = `${e.i},${f.i}`;
      if (!hits.has(h)) hits.set(h, { i: e.i, j: f.i, s: [], o: [] });
      const H = hits.get(h); H.s.push(e.s); H.o.push(f.s);
    }
  }
  const per = Array.from({ length: P }, () => []);
  for (const H of hits.values()) {
    // contiguous runs along this path; the opposing interval = the run's partners' span
    const ord = H.s.map((v, k) => [v, H.o[k]]).sort((a, b) => a[0] - b[0]);
    let run = [ord[0]];
    const flush = () => {
      if (run.length < 2 && run[0]) { run = []; return; }
      const s0 = run[0][0], s1 = run[run.length - 1][0], os = run.map((r) => r[1]);
      if (s1 - s0 >= MIN_RUN) per[H.i].push([s0, s1, H.j, Math.min(...os), Math.max(...os)]);
      run = [];
    };
    // (gaps under MERGE m between parked cars merge: a car does not squeeze into a 10 m hole between two narrow bits,
    // and one stretch per row of cars is one wait, not a stop-and-go per car; browser check on Avenue Alphonse XIII)
    for (let k = 1; k < ord.length; k++) { if (ord[k][0] - ord[k - 1][0] > MERGE) { flush(); } run.push(ord[k]); }
    flush();
  }
  const nOff = new Uint32Array(P + 1), list = [];
  for (let i = 0; i < P; i++) { nOff[i] = list.length; list.push(...per[i]); }
  nOff[P] = list.length;
  return { nOff, nS0: Float32Array.from(list, (r) => r[0]), nS1: Float32Array.from(list, (r) => r[1]), nOpp: Int32Array.from(list, (r) => r[2]),
    nO0: Float32Array.from(list, (r) => r[3]), nO1: Float32Array.from(list, (r) => r[4]) };
}

// THE CLEAR WIDTH OF EVERY LANE (claude/parking1, rule service-vehicle-passage): what a vehicle on it can physically
// pass through. Every CW_STEP m along a lane piece (not its first / last CW_END m: the junction mouths), the open width
// across the lane point: rays left and right over the drawn carriageway (roadway / tram road / parking) until a class the
// traffic does not drive on (an unsurveyed cell beside the carriageway too) or a parked car's box. The lane's clearW is
// the least over two stations in a row of the wider one (Infinity: a junction turn, or nothing measured: a lane point off the carriageway,
// a ray leaving the tile's raster). The router keeps
// service vehicles (runs, buses, bin lorries) off a lane narrower than their width + 2 x 0.2 m (trafficSim.js
// clearWeight) and the trafmix gate counts the entries into a lane narrower than the vehicle itself: 0.
const CW_STEP = 3, CW_END = 6, CW_RAY = 8, CW_DR = 0.25;
function laneClearWidths(src, P, grid, parkedKept) {
  const out = new Float32Array(P).fill(Infinity);
  if (!grid) return out;
  const cls = (x, z) => { const i = Math.floor((x - grid.x0) / grid.step), j = Math.floor((z - grid.z0) / grid.step); if (i < 0 || j < 0 || i >= grid.nx || j >= grid.nz) return -2; return grid.data[j * grid.nx + i] - 1; };
  // the parked cars in 8 m cells; per station the ones within reach, tested as boxes
  const G = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  for (const c of parkedKept || []) { const k = key(Math.floor(c.x / 8), Math.floor(c.z / 8)); if (!G.has(k)) G.set(k, []); G.get(k).push(c); }
  const near = [];
  // the open distance from (x, z) along (nx, nz): an unsurveyed cell next to the carriageway is its edge too; off the
  // tile's raster: NaN (unknown)
  const ray = (x, z, nx, nz) => {
    for (let t = CW_DR; t <= CW_RAY; t += CW_DR) {
      const px = x + nx * t, pz = z + nz * t, c = cls(px, pz);
      if (c === -2) return NaN;
      if (c < 0 || !CARRIAGE[c]) return t - CW_DR / 2;
      for (let q = 0; q < near.length; q++) if (parkedBoxDist(near[q], px, pz) <= 0) return t - CW_DR / 2;
    }
    return CW_RAY;
  };
  src.forEach((p, i) => {
    if (p.kind === "connector") return;
    const c = p.cum || cumulative(p.pts), L = c[c.length - 1];
    let best = Infinity, prev = NaN;
    for (let sd = CW_END; sd <= L - CW_END; sd += CW_STEP) {
      const A = pointAt(p.pts, c, sd - 0.5), B = pointAt(p.pts, c, sd + 0.5), x = (A[0] + B[0]) / 2, z = (A[1] + B[1]) / 2;
      const k0 = cls(x, z); if (k0 < 0 || !CARRIAGE[k0]) continue;
      near.length = 0;
      const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8);
      for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) for (const q of G.get(key(i0 + di, j0 + dj)) || []) if ((q.x - x) ** 2 + (q.z - z) ** 2 < (CW_RAY + 2.5) ** 2) near.push(q);
      const tx = B[0] - A[0], tz = B[1] - A[1], tl = Math.hypot(tx, tz) || 1, nx = tz / tl, nz = -tx / tl;
      const w = ray(x, z, nx, nz) + ray(x, z, -nx, -nz);
      // (a narrowing holds over two stations in a row: one 0.5 m raster cell at one station is not the street)
      const m = Math.max(w, prev);
      if (m < best) best = m;                                    // (NaN never wins)
      prev = w;
    }
    out[i] = best;
  });
  return out;
}

const PARK_CLEAR = 1.95;          // m: lane centre to a parked car's centre (two half widths + 0.15)
export const MOUTH_CLEAR = 5;     // m: a junction turn's end (a lane mouth) to the nearest parked box (rule service-vehicle-passage)
const MOUTH_OLD = typeof location !== "undefined" && /[?&]parkmouth=old(&|$)/.test(location.search);
// trafpark (2026-11-17, owner: "the traffic cars can go through the parked cars"): the parked car as its plan box (the
// widest / longest common type, 1.85 x 4.73 m: viewer/carFleet.js SIZES) and the traffic car as its half width: a lane
// point is clear when its distance to the box is >= TP_HALF + TP_FIT; the built graph is then checked along every path
// (lanes AND junction connectors, every 0.25 m) and a car any path still comes within TP_HALF of is not parked
// (parkedKept). tools/audit/trafParkAudit.mjs measures the same; ?trafpark=old: the point test above, no check.
export const TP_HALF = 0.98, TP_FIT = 0.15, RAMP = 0.2, TP_BOX_HW = 0.925, TP_BOX_HL = 2.365;
const LANE_PARK_DROP = TP_HALF + TP_FIT - 0.05;      // m: a model lane this near a parked car's box drops the car (claude/lanes5)
export const TP_WB = 2.8, TP_BODY_HL = 2.37;   // a traffic car's wheelbase and half length (the longest common type)
/** a traffic body (centre, unit axis ax/az, half length TP_BODY_HL, half width TP_HALF) vs a parked site's box: SAT */
function boxesOverlap(b, c) {
  const cx = Math.cos(c.yaw), cz = -Math.sin(c.yaw);
  const A = [[b.ax, b.az, TP_BODY_HL], [-b.az, b.ax, TP_HALF]], B = [[cx, cz, TP_BOX_HL], [-cz, cx, TP_BOX_HW]];
  const dx = c.x - b.x, dz = c.z - b.z;
  for (const [ux, uz] of [...A, ...B]) {
    let r = 0;
    for (const [vx, vz, h] of A) r += h * Math.abs(vx * ux + vz * uz);
    for (const [vx, vz, h] of B) r += h * Math.abs(vx * ux + vz * uz);
    if (Math.abs(dx * ux + dz * uz) >= r) return false;
  }
  return true;
}
/** distance from (x, z) to a parked site's box (negative inside) */
export function parkedBoxDist(c, x, z) {
  const ax = Math.cos(c.yaw), az = -Math.sin(c.yaw), dx = x - c.x, dz = z - c.z;
  const u = Math.abs(dx * ax + dz * az) - TP_BOX_HL, v = Math.abs(dx * az - dz * ax) - TP_BOX_HW;
  return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
}
function parkedGrid(sites, boxed = false) {
  const g = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  sites.forEach((c, ci) => { const k = key(Math.floor(c.x / 4), Math.floor(c.z / 4)); if (!g.has(k)) g.set(k, []); g.get(k).push(ci); });
  const near = (x, z, f) => {
    const i0 = Math.floor(x / 4), j0 = Math.floor(z / 4);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const ci of g.get(key(i0 + di, j0 + dj)) || []) if (f(sites[ci], ci)) return true;
    return false;
  };
  return {
    sites,
    /** any car centre within r of (x, z)? */
    anyNear(x, z, r) {
      const n = Math.ceil(r / 4), i0 = Math.floor(x / 4), j0 = Math.floor(z / 4);
      for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) for (const ci of g.get(key(i0 + di, j0 + dj)) || []) { const c = sites[ci]; if ((c.x - x) ** 2 + (c.z - z) ** 2 < r * r) return true; }
      return false;
    },
    /** the nearest box distance (<= 4 m reach) */
    dist(x, z) { let b = Infinity; near(x, z, (c) => { const d = parkedBoxDist(c, x, z); if (d < b) b = d; return false; }); return b; },
    /** every car whose box comes within r of (x, z), any r (the cells its centre can be in): f(ci) */
    within(x, z, r, f) {
      const n = Math.ceil((r + 2.5) / 4), i0 = Math.floor(x / 4), j0 = Math.floor(z / 4);
      for (let di = -n; di <= n; di++) for (let dj = -n; dj <= n; dj++) for (const ci of g.get(key(i0 + di, j0 + dj)) || []) if (parkedBoxDist(sites[ci], x, z) < r) f(ci);
    },
    /** every car whose box comes within r of (x, z): f(ci) */
    each(x, z, r, f) { near(x, z, (c, ci) => { if (parkedBoxDist(c, x, z) < r) f(ci); return false; }); },
    clear(x, z) {
      if (boxed) return this.dist(x, z) >= TP_HALF + TP_FIT;
      return !near(x, z, (c) => {
        // the car is a 4.5 x 1.8 box: along its length the clearance reaches 2.2 m further
        const dx = x - c.x, dz = z - c.z, ax = Math.cos(c.yaw), az = -Math.sin(c.yaw);
        const along = Math.abs(dx * ax + dz * az), across = Math.abs(dx * az - dz * ax);
        return along < 2.3 + 0.9 && across < PARK_CLEAR;
      });
    },
  };
}
/** lane pieces densified to <= `step` m (the clearance is tested at the points: a long straight between two points
 *  passed a car unseen) */
function densify(paths, step) {
  return paths.map((p) => {
    if (p.kind === "connector") return p;
    const q = p.pts, out = [q[0]];
    for (let k = 1; k < q.length; k++) {
      const a = q[k - 1], b = q[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / step);
      for (let m = 1; m < n; m++) { const t = m / n; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ...a.slice(2)]); }
      out.push(b);
    }
    if (out.length === q.length) return p;
    return { ...p, pts: out, cum: cumulative(out) };
  });
}

const FAR_SNAP = 14, FAR_RUN = 6;           // m: how far a lane off its street looks for the measured carriageway (class R)
function fitToSurface(paths, G, st, parked = null, trace = null, TP = false, R38 = false, laneOff = null, inBuilding = null, skip = null) {
  const ok = (x, z) => {
    const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step);
    if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return true;          // off the raster: leave it
    const c = G.data[j * G.nx + i] - 1;
    return c >= 0 && CARRIAGE[c];
  };
  const fitsRoad = (x, z, nx, nz, s) => ok(x + nx * s, z + nz * s) && ok(x + nx * (s + 1), z + nz * (s + 1)) && ok(x + nx * (s - 1), z + nz * (s - 1));
  // (with parked cars: also clear of them; a point no shift clears keeps the road-only fit: a narrow stretch, given way on)
  let fits = fitsRoad;
  const shift = new Map();
  const out = new Map();
  const tangent = (q, k) => {
    const n = q.length, a = q[Math.max(0, k - 1)], b = q[Math.min(n - 1, k + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
    return [tx / L, tz / L];
  };
  const fitsPark = (x, z, nx, nz, s) => fitsRoad(x, z, nx, nz, s) && parked.clear(x + nx * s, z + nz * s);
  for (const p of paths) {
    if (p.kind === "connector" || skip?.has(p.id)) continue;           // (claude/street4: a model lane is final)
    const q = p.pts, n = q.length, off = new Float32Array(n), far = new Uint8Array(n);
    const how = trace || (TP && parked) ? new Uint8Array(n) : null;          // (audit: 0 no shift, 1 shifted clear of cars, 2 road-only fit, 3 none)
    if (trace) (trace.fit ??= new Map()).set(p.id, how);
    for (let k = 0; k < n; k++) {
      const [tx, tz] = tangent(q, k), nx = -tz, nz = tx, x = q[k][0], z = q[k][1];
      st.points++;
      let done = false;
      for (const f of parked ? [fitsPark, fitsRoad] : [fitsRoad]) {
        fits = f;
        if (fits(x, z, nx, nz, 0)) { done = true; if (how) how[k] = f === fitsRoad && parked ? 2 : 0; break; }
        for (let s = 0.25; s <= (f === fitsPark ? 4 : 9) && !done; s += 0.25) {
          if (fits(x, z, nx, nz, s)) { off[k] = s; done = true; }
          else if (fits(x, z, nx, nz, -s)) { off[k] = -s; done = true; }
        }
        if (how) how[k] = done ? (f === fitsPark ? 1 : 2) : 3;
        if (done) break;
        if (f === fitsPark) st.parkBlocked = (st.parkBlocked || 0) + 1;
      }
      if (!done) far[k] = 1;
    }
    // class R (rule 38, docs/ROADS_R.md "in a building"; with opts.inBuilding): a lane point with no carriageway within 9 m is a lane whose
    // OSM line runs far off the measured street (Ch. de Waterloo J6 1723, 546: ~10 m east of it, through the houses;
    // Ch. d'Alsemberg D6). Where the measured carriageway lies within FAR_SNAP m on ONE side only (never a guess
    // between two streets), the lane goes onto it at its own offset from its road's centre line (laneOff), held >= 1 m
    // inside the carriageway's edges; the offset profile below blends it in. ?roads=old: as before (left where it was)
    const snap = new Uint8Array(n), off0 = Float32Array.from(off);
    if (R38 && laneOff && far.some(Boolean)) for (let k = 0; k < n; k++) {
      if (!far[k]) continue;
      const [tx, tz] = tangent(q, k), nx = -tz, nz = tx, x = q[k][0], z = q[k][1];
      const hit = (sg) => { for (let d = 9.25; d <= FAR_SNAP; d += 0.25) if (fitsRoad(x, z, nx, nz, sg * d)) return d; return 0; };
      const dp = hit(1), dn = hit(-1);
      if (!!dp === !!dn) continue;
      const sg = dp ? 1 : -1, d0 = dp || dn;
      let d1 = d0; while (d1 < d0 + 30 && ok(x + nx * sg * (d1 + 0.25), z + nz * sg * (d1 + 0.25))) d1 += 0.25;
      let da = d0; while (da > 0.25 && ok(x + nx * sg * (da - 0.25), z + nz * sg * (da - 0.25))) da -= 0.25;
      const lo = sg * da, hi = sg * d1, a0 = Math.min(lo, hi) + 1, a1 = Math.max(lo, hi) - 1;
      const mid = (lo + hi) / 2, want = mid + laneOff(p, x, z, nx, nz);
      const u = a1 >= a0 ? Math.max(a0, Math.min(a1, want)) : mid;
      // (the carriageway found must run WITH the lane: clear 4 m ahead and behind along the lane's direction at that
      // offset; a cross street met sideways is not this road's)
      const px = x + nx * u, pz = z + nz * u;
      if (![4, -4].every((dd) => fitsRoad(px + tx * dd, pz + tz * dd, nx, nz, 0))) continue;
      snap[k] = 1; off[k] = u;
    }
    // (only a RUN of snapped points (>= FAR_RUN in a row) where the lane runs THROUGH A BUILDING (opts.inBuilding: the
    // drawn footprints) is the lane's own street off its OSM line; elsewhere (a lone point, a lane over open ground: a
    // private lane, a park road) it stays where it was: snapped blind, 2.0 km more lane went off the carriageway)
    if (R38) for (let k = 0; k < n;) {
      if (!snap[k]) { k++; continue; }
      let e = k; while (e < n && snap[e]) e++;
      let inB = 0; for (let m = k; m < e; m++) if (inBuilding(q[m][0], q[m][1])) inB++;
      if (e - k < FAR_RUN || inB < FAR_RUN) for (let m = k; m < e; m++) { off[m] = off0[m]; snap[m] = 0; }
      else st.farSnap = (st.farSnap || 0) + (e - k);
      k = e;
    }
    // smooth: a wide moving average (points are ~1-2 m apart), so a lane bends gently around a misfit
    const smooth = (hard) => {
      const sm = new Float32Array(n);
      for (let k = 0; k < n; k++) { let a = 0, w = 0; for (let m = Math.max(0, k - 6); m <= Math.min(n - 1, k + 6); m++) { const ww = 7 - Math.abs(m - k); a += off[m] * ww; w += ww; } sm[k] = a / w; }
      // never less than the point itself needs (the average pulled lane ends back onto the sidewalk), then a light pass
      if (TP && parked) {
        // (trafpark: as a ramp of at most RAMP m sideways per m along, not a step: the step left 20-30 deg kinks the
        // kink rounding then smoothed back into the parked cars)
        const c = p.cum || cumulative(q), pos = new Float32Array(n), neg = new Float32Array(n);
        for (let m = 0; m < n; m++) {
          const v = off[m]; if (Math.abs(v) <= Math.abs(sm[m])) continue;
          if (how[m] !== 1 || !fitsRoad(q[m][0], q[m][1], -tangent(q, m)[1], tangent(q, m)[0], 0)) { sm[m] = v; continue; }   // (a road-fit need: as before)
          for (let k = m; k < n && Math.abs(v) - RAMP * (c[k] - c[m]) > 0; k++) { const e = Math.abs(v) - RAMP * (c[k] - c[m]); if (v > 0) pos[k] = Math.max(pos[k], e); else neg[k] = Math.max(neg[k], e); }
          for (let k = m - 1; k >= 0 && Math.abs(v) - RAMP * (c[m] - c[k]) > 0; k--) { const e = Math.abs(v) - RAMP * (c[m] - c[k]); if (v > 0) pos[k] = Math.max(pos[k], e); else neg[k] = Math.max(neg[k], e); }
        }
        for (let k = 0; k < n; k++) {
          const e = pos[k] >= neg[k] ? pos[k] : -neg[k];
          if (Math.abs(e) > Math.abs(sm[k])) sm[k] = e;
        }
      } else for (let k = 0; k < n; k++) if (Math.abs(off[k]) > Math.abs(sm[k])) sm[k] = off[k];
      const sm2 = Float32Array.from(sm);
      for (let k = 1; k < n - 1; k++) sm[k] = (sm2[k - 1] + 2 * sm2[k] + sm2[k + 1]) / 4;
      if (hard) for (let k = 0; k < n; k++) if (hard[k]) sm[k] = off[k];
      return sm;
    };
    let sm = R38 ? laneOffsetProfile(off, p.cum || cumulative(q)) : smooth(null);
    // (the snap must not put the lane into ANOTHER building: its 1:10 blends reach past the snapped run. Where the
    // blended lane's body (centre +- 0.9 m) stands in a building it did not stand in without the snap, the snapped run
    // is lengthened over that point (it takes the run's end offset) and the profile laid again, up to 4 times; if a new
    // building contact is still left, the lane is not snapped at all (Ch. d'Alsemberg D6: the 14.7 m snap's blend ends
    // made two places worse). The no-snap profile is the reference)
    if (R38 && snap.some(Boolean)) {
      const cum = p.cum || cumulative(q);
      const smNo = laneOffsetProfile(off0, cum);
      const body = (k, o) => { const [tx, tz] = tangent(q, k), nx = -tz, nz = tx; return [0, 0.9, -0.9].some((w) => inBuilding(q[k][0] + nx * (o + w), q[k][1] + nz * (o + w))); };
      const fresh = () => { const f = []; for (let k = 0; k < n; k++) if (body(k, sm[k]) && !body(k, smNo[k])) f.push(k); return f; };
      let bad = fresh();
      for (let it = 0; it < 4 && bad.length; it++) {
        for (const k of bad) {
          if (snap[k]) continue;
          // the nearest snapped point's offset, carried over to k (and every point between)
          let a = k; while (a >= 0 && !snap[a]) a--; let b = k; while (b < n && !snap[b]) b++;
          const from = a >= 0 && (b >= n || k - a <= b - k) ? a : b < n ? b : -1;
          if (from < 0) continue;
          for (let m = Math.min(from, k); m <= Math.max(from, k); m++) if (!snap[m]) { snap[m] = 1; off[m] = off[from]; }
        }
        sm = laneOffsetProfile(off, cum);
        bad = fresh();
      }
      if (bad.length) { for (let k = 0; k < n; k++) { off[k] = off0[k]; snap[k] = 0; } sm = smNo; st.farSnapDropped = (st.farSnapDropped || 0) + 1; }
      else st.farSnapLanes = (st.farSnapLanes || 0) + 1;
    }
    // trafpark: the smoothing (the average, then the light pass) pulled lanes back toward the cars they had been moved
    // clear of: the smoothed line is checked against the cars, a point that touches one takes the nearest clear offset
    // as a hard constraint, smoothed again (at most 6 rounds)
    if (parked && TP) {
      const hard = new Uint8Array(n);
      for (let it = 0; it < 6; it++) {
        let bad = 0;
        for (let k = 0; k < n; k++) {
          const [tx, tz] = tangent(q, k), nx = -tz, nz = tx, x = q[k][0], z = q[k][1];
          if (parked.dist(x + nx * sm[k], z + nz * sm[k]) >= TP_HALF + TP_FIT * 0.5) continue;
          // the clear offset nearest the smoothed one (the road fit as well), within 4 m of the original line
          let best = null;
          for (let s = 0; s <= 4 && best == null; s += 0.25) for (const v of s ? [sm[k] + s, sm[k] - s] : [sm[k]]) {
            if (Math.abs(v) <= 4 && fitsPark(x, z, nx, nz, v)) { best = v; break; }
          }
          if (best == null || (hard[k] && best === off[k])) continue;
          off[k] = best; hard[k] = 1; bad++;
        }
        if (!bad) break;
        st.tpRounds = (st.tpRounds || 0) + 1;
        sm = R38 ? laneOffsetProfile(off, p.cum || cumulative(q)) : smooth(hard);
      }
    }
    const pts = q.map((pt, k) => {
      const [tx, tz] = tangent(q, k);
      if (Math.abs(sm[k]) > 0.05) st.moved++;
      st.maxShift = Math.max(st.maxShift, Math.abs(sm[k]));
      return [pt[0] - tz * sm[k], pt[1] + tx * sm[k]];
    });
    shift.set(p.id, [pts[0][0] - q[0][0], pts[0][1] - q[0][1], pts[n - 1][0] - q[n - 1][0], pts[n - 1][1] - q[n - 1][1]]);
    out.set(p.id, pts);
  }
  for (const p of paths) {
    if (p.kind !== "connector" || skip?.has(p.id)) continue;
    const a = shift.get(p.prev[0]), b = shift.get(p.next[0]);
    const s0 = a ? [a[2], a[3]] : [0, 0], s1 = b ? [b[0], b[1]] : [0, 0];
    const c = p.cum || cumulative(p.pts), L = c[c.length - 1] || 1;
    out.set(p.id, p.pts.map((pt, k) => { const f = c[k] / L; return [pt[0] + s0[0] * (1 - f) + s1[0] * f, pt[1] + s0[1] * (1 - f) + s1[1] * f]; }));
  }
  return paths.map((p) => {
    if (skip?.has(p.id)) return p;
    const pts = out.get(p.id) || p.pts, cum = cumulative(pts), len = cum[cum.length - 1];
    const stop = p.stop ? { ...p.stop, at: Math.max(0, len - (p.len - p.stop.at)) } : undefined;
    return { ...p, pts, cum, len, stop };
  });
}
