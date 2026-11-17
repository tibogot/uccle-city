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
//              phase[i] (signals: 0 A / 1 B, the phase of the OSM post on this approach), jnode[i] (junction id)
//   conflicts  per connector, CSR (cfOff / cfOther / cfAt / cfOtherAt / cfYield): the connectors it crosses or merges
//              with, where along each, and whether THIS one yields (1), the other yields (-1) or neither (0: the
//              signal phases keep them apart; still never entered while the other is inside)
// Junction control, from data only: OSM signals (roads.json node control = "signal", the pipeline's OSM
// traffic_signals); OSM stop / give_way points on an approach; else priorité de droite. The road engine's own
// guessed stop / yield lines are NOT obeyed (no data says they exist); their stop-line stations are used as the
// place to wait when there is one.
import { cumulative } from "../../vendor/roads/roadMath.js";
import { nearestRoad, phaseOfDir } from "./signals.js";
import { joinLaneGraph } from "../streets/laneGraph.js";

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
function roundKinks(paths, keep = null) {
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
  const free = []; for (let n = 0; n < M; n++) if (dist[n] <= KINK_REACH && ins[n].length && outs[n].length) free.push(n);
  let X = Float64Array.from(x), Z = Float64Array.from(z);
  for (let it = 0; it < KINK_ITER; it++) {
    const nX = X.slice(), nZ = Z.slice();
    for (const n of free) {
      let sx = 0, sz = 0, c = 0;
      for (const m of ins[n]) { sx += X[m]; sz += Z[m]; c++; }
      for (const m of outs[n]) { sx += X[m]; sz += Z[m]; c++; }
      nX[n] = X[n] + 0.5 * (sx / c - X[n]); nZ[n] = Z[n] + 0.5 * (sz / c - Z[n]);
      if (keep && !keep(X[n], Z[n], nX[n], nZ[n])) {       // (trafpark: never into a parked car: as far as it stays clear)
        let f = 0.5;
        while (f > 0.1 && !keep(X[n], Z[n], X[n] + (nX[n] - X[n]) * f, Z[n] + (nZ[n] - Z[n]) * f)) f *= 0.5;
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
  const raw = net.graph.paths.filter((p) => p.len > 0.2 && p.pts.length >= 2);
  const fitStats = { points: 0, moved: 0, maxShift: 0 };
  // citydefects: the parked cars (viewer/streets/parkPlace.js widthParking, built in the worker too) are kept clear of:
  // each lane slides sideways to pass them by PARK_CLEAR where the measured carriageway lets it
  const TP = !opts.old;                       // trafpark (?trafpark=old: opts.old)
  const parked = opts.parked?.length ? parkedGrid(opts.parked, TP) : null;
  const raw2 = parked && TP ? densify(raw, 1.5) : raw;
  const tF = performance.now();
  const fitted = grid ? fitToSurface(raw2, grid, fitStats, parked, opts.trace, TP) : raw2;
  fitStats.fitMs = Math.round(performance.now() - tF);
  if (opts.trace) opts.trace.afterFit = fitted.map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((v) => [v[0], v[1]]) }));
  // round 5: fitToSurface moves each lane on its own; lane-to-lane joins (continuations) are closed again
  if (grid) fitStats.rejoined = joinLaneGraph({ graph: { paths: fitted, byId: new Map(fitted.map((p) => [p.id, p])) } }).gapsBefore;
  if (opts.trace) opts.trace.afterJoin = fitted.map((p) => ({ id: p.id, kind: p.kind, pts: p.pts.map((v) => [v[0], v[1]]) }));
  // (trafpark: the rounding pulled 70 of I6's 131 parked cars back under the lanes the fit had moved clear of them:
  // a node does not move closer to a parked car than the fit's clearance)
  const keepClear = parked && TP ? (x0, z0, x1, z1) => { const d1 = parked.dist(x1, z1); return d1 >= TP_HALF + TP_FIT * 0.5 || d1 >= parked.dist(x0, z0); } : null;
  const tK = performance.now();
  const src = roundKinks(fitted, keepClear);
  fitStats.kinkMs = Math.round(performance.now() - tK);
  if (opts.trace) { opts.trace.src = src; opts.trace.raw = raw2; }
  // trafpark: the check along every driven path, junction connectors too: a parked car any path still touches goes
  let parkedKept = opts.parked || null;
  if (parked && TP) {
    const tC = performance.now();
    const drop = new Set();
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
    fitStats.parkDropped = drop.size + (opts.droppedBefore || 0);
    fitStats.checkMs = Math.round(performance.now() - tC);
    if (drop.size) parkedKept = opts.parked.filter((c, ci) => !drop.has(ci));
    // the lanes were bent round cars that are now gone: built once more around the kept ones (then checked again)
    if (drop.size && !opts.droppedBefore) return buildTrafficGraph(net, roads, feats, bounds, grid, { ...opts, parked: parkedKept, droppedBefore: drop.size });
  }
  const idx = new Map(src.map((p, i) => [p.id, i]));
  const P = src.length;
  let nPts = 0;
  for (const p of src) nPts += p.pts.length;
  const xy = new Float32Array(nPts * 2), cum = new Float32Array(nPts), off = new Uint32Array(P + 1), pv = new Float32Array(nPts);
  const len = new Float32Array(P), speed = new Float32Array(P), kind = new Uint8Array(P), turn = new Uint8Array(P);
  const rank = new Uint8Array(P), tram = new Uint8Array(P), core = new Uint8Array(P);
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
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const pts = (feats.points || []);
  const sigPts = pts.filter((q) => q.kind === "traffic_signals").map((q) => {
    const nr = nearestRoad(roads, N, q.x, q.z);
    return { x: q.x, z: q.z, phase: nr ? phaseOfDir(nr.ux, nr.uz) : 0, road: nr?.road?.id };
  });
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
        const s = nearestSig(sigPts, node.x, node.z, 30);
        holdAt[i] = Math.max(0, len[i] - 4.5); ctrl[i] = CTRL.signal; jnode[i] = jnodes.length;
        phase[i] = s ? s.phase : phaseOfDir(Math.cos(a.th), Math.sin(a.th));
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
      let c = CTRL.priority, ph = 0;
      if (node.kind === "roundabout") c = CTRL.yield;
      else if (osmSignal) {
        c = CTRL.signal;
        // the phase of the OSM post this approach passes (the signal point nearest the last 30 m of the lane);
        // an approach with no post drawn takes the same rule from its own direction
        const s = nearestOnLane(sigPts.filter((q) => q.road === lp.roadId), lp, 30, 14);   // a post of THIS road (its drawn head faces this approach)
        ph = s ? s.phase : phaseOfDir(...dirAtEnd(lp, 20));
      } else if (signOf.has(li)) c = signOf.get(li).kind === "stop" ? CTRL.stop : CTRL.yield;
      // where to wait: the engine's stop line on this lane when it drew one, else the junction mouth
      const at = lp.stop ? lp.stop.at : Math.max(0, lp.len - 0.6);
      entries.set(li, { arm, c, ph });
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
  return {
    paths: P, xy, cum, off, pv, len, speed, kind, turn, rank, tram, core, nextOff, nextIdx, prevOff, prevIdx,
    holdAt, ctrl, phase, jnode, nodeOf, cfOff, cfOther, cfAt, cfOtherAt, cfYield,
    jnodes: jnodes.map((j) => ({ id: j.id, x: j.x, z: j.z, kind: j.kind, signal: !!j.signal })), parkedKept,
    ...narrowStretches(src, P),
    bounds, stats: { ...stats, paths: P, fit: fitStats, ms: Math.round(performance.now() - t0) },
  };
}

const norm = ([x, z]) => { const L = Math.hypot(x, z) || 1; return [x / L, z / L]; };
/** Direction of lane piece p over its last `back` m. */
function dirAtEnd(p, back = 1) {
  const q = p.pts, n = q.length, [ax, az] = pointAt(q, p.cum, Math.max(0, p.len - back));
  return norm([q[n - 1][0] - ax, q[n - 1][1] - az]);
}
function nearestSig(list, x, z, r) {
  let best = null, bd = r * r;
  for (const s of list) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } }
  return best;
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
/** The point of `list` nearest the last `back` m of lane piece p, within r of it. */
function nearestOnLane(list, p, back, r) {
  let best = null, bd = r * r;
  const q = p.pts, c = p.cum;
  for (const s of list) {
    for (let i = q.length - 1; i > 0 && c[i] > p.len - back - 10; i--) {
      const ax = q[i - 1][0], az = q[i - 1][1], bx = q[i][0], bz = q[i][1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (s.z - az) * dz) / L2));
      const d = (ax + dx * t - s.x) ** 2 + (az + dz * t - s.z) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
  }
  return best;
}

// ---------------------------------------------------------------- lanes onto the MEASURED carriageway
// The engine's lane stacks are fitted into the measured kerb-to-kerb widths (surfaces.js fitRoadWidths), but where
// that fit is off (one-sided streets, a measured road the engine centres differently) a lane can run over a
// sidewalk. Each lane point whose car footprint (+-1 m) is not on roadway / tram roadway / parking is moved sideways
// to the nearest place where it is (at most 5 m), the shifts smoothed along the lane; connectors take the shift of
// their entry lane at their start and of their exit lane at their end, blended along their length. The graph's
// geometry only: the drawn markings stay the engine's.
const CARRIAGE = [true, true, false, true, false, false, false, false, false, false];

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

const PARK_CLEAR = 1.95;          // m: lane centre to a parked car's centre (two half widths + 0.15)
// trafpark (2026-11-17, owner: "the traffic cars can go through the parked cars"): the parked car as its plan box (the
// widest / longest common type, 1.85 x 4.73 m: viewer/carFleet.js SIZES) and the traffic car as its half width: a lane
// point is clear when its distance to the box is >= TP_HALF + TP_FIT; the built graph is then checked along every path
// (lanes AND junction connectors, every 0.25 m) and a car any path still comes within TP_HALF of is not parked
// (parkedKept). tools/audit/trafParkAudit.mjs measures the same; ?trafpark=old: the point test above, no check.
export const TP_HALF = 0.9, TP_FIT = 0.2, RAMP = 0.2, TP_BOX_HW = 0.925, TP_BOX_HL = 2.365;
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

function fitToSurface(paths, G, st, parked = null, trace = null, TP = false) {
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
    if (p.kind === "connector") continue;
    const q = p.pts, n = q.length, off = new Float32Array(n);
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
    let sm = smooth(null);
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
        sm = smooth(hard);
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
    if (p.kind !== "connector") continue;
    const a = shift.get(p.prev[0]), b = shift.get(p.next[0]);
    const s0 = a ? [a[2], a[3]] : [0, 0], s1 = b ? [b[0], b[1]] : [0, 0];
    const c = p.cum || cumulative(p.pts), L = c[c.length - 1] || 1;
    out.set(p.id, p.pts.map((pt, k) => { const f = c[k] / L; return [pt[0] + s0[0] * (1 - f) + s1[0] * f, pt[1] + s0[1] * (1 - f) + s1[1] * f]; }));
  }
  return paths.map((p) => {
    const pts = out.get(p.id) || p.pts, cum = cumulative(pts), len = cum[cum.length - 1];
    const stop = p.stop ? { ...p.stop, at: Math.max(0, len - (p.len - p.stop.at)) } : undefined;
    return { ...p, pts, cum, len, stop };
  });
}
