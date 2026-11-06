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
 * net: buildRoadNetwork result; roads: roads.json (OSM meta); feats: features.json (signal / stop / give_way points);
 * bounds: the tile's core square.
 */
export function buildTrafficGraph(net, roads, feats, bounds, grid = null) {
  const t0 = performance.now();
  const raw = net.graph.paths.filter((p) => p.len > 0.2 && p.pts.length >= 2);
  const fitStats = { points: 0, moved: 0, maxShift: 0 };
  const src = grid ? fitToSurface(raw, grid, fitStats) : raw;
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
    jnodes: jnodes.map((j) => ({ id: j.id, x: j.x, z: j.z, kind: j.kind, signal: !!j.signal })),
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
function fitToSurface(paths, G, st) {
  const ok = (x, z) => {
    const i = Math.floor((x - G.x0) / G.step), j = Math.floor((z - G.z0) / G.step);
    if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return true;          // off the raster: leave it
    const c = G.data[j * G.nx + i] - 1;
    return c >= 0 && CARRIAGE[c];
  };
  const fits = (x, z, nx, nz, s) => ok(x + nx * s, z + nz * s) && ok(x + nx * (s + 1), z + nz * (s + 1)) && ok(x + nx * (s - 1), z + nz * (s - 1));
  const shift = new Map();
  const out = new Map();
  const tangent = (q, k) => {
    const n = q.length, a = q[Math.max(0, k - 1)], b = q[Math.min(n - 1, k + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
    return [tx / L, tz / L];
  };
  for (const p of paths) {
    if (p.kind === "connector") continue;
    const q = p.pts, n = q.length, off = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const [tx, tz] = tangent(q, k), nx = -tz, nz = tx, x = q[k][0], z = q[k][1];
      st.points++;
      if (fits(x, z, nx, nz, 0)) continue;
      for (let s = 0.25; s <= 9; s += 0.25) {
        if (fits(x, z, nx, nz, s)) { off[k] = s; break; }
        if (fits(x, z, nx, nz, -s)) { off[k] = -s; break; }
      }
    }
    // smooth: a wide moving average (points are ~1-2 m apart), so a lane bends gently around a misfit
    const sm = new Float32Array(n);
    for (let k = 0; k < n; k++) { let a = 0, w = 0; for (let m = Math.max(0, k - 6); m <= Math.min(n - 1, k + 6); m++) { const ww = 7 - Math.abs(m - k); a += off[m] * ww; w += ww; } sm[k] = a / w; }
    // never less than the point itself needs (the average pulled lane ends back onto the sidewalk), then a light pass
    for (let k = 0; k < n; k++) if (Math.abs(off[k]) > Math.abs(sm[k])) sm[k] = off[k];
    const sm2 = Float32Array.from(sm);
    for (let k = 1; k < n - 1; k++) sm[k] = (sm2[k - 1] + 2 * sm2[k] + sm2[k + 1]) / 4;
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
