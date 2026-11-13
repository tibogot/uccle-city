// Round 2: the lane graph traffic drives on (net.graph.paths, built by the vendored engine, read-only), repaired in
// our code after the network is built (paint v2, where UrbIS maps the street). docs/roads/ROUND2.md "Lane graph".
//
//   1. loops and cusps: where a bend is tighter than a lane's offset from the road axis, the engine's offset curve
//      turns back on itself (a saw-tooth hook up to 345°/m, I6 r14387667_0): the loop is cut at its self-crossing,
//      a cusp (a vertex turning > 120°) is dropped
//   2. centring: on a measured carriageway with a simple stack (one lane per direction, or a one-way lane, no parking
//      lane), each lane point moves to the measured lane centre (the kerb-to-kerb width split between the lanes);
//      the move is limited to 1.5 m and smoothed along the path; a connector follows its lanes' end moves, faded
//      over its length, so the graph stays joined
//   3. smoothing: 1 m resampling and three [1/4 1/2 1/4] passes with both ends fixed (G1 at the joins: the
//      connectors start on the lanes' last direction)
//   4. hold points: a lane that ends at a painted stop / give-way line (rd.inventory.stops) holds at that line
//      (p.stop.at, p.stop.line), not at the engine's own station 4-6 m away
// Plain JS, no three.js. Returns stats.
const CARRIAGE = new Set([0, 1, 2, 3]);
const XY = (q) => [q[0] ?? q.x, q[1] ?? q.z];

function cumulative(P) { const c = [0]; for (let k = 1; k < P.length; k++) c.push(c[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return c; }
function segX(p, q, r, s) {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6 ? [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] : null;
}
/** cut self-crossing loops (look-ahead 60 vertices) and drop cusps */
function unloop(P, st) {
  let changed = true, guard = 0;
  while (changed && guard++ < 50) {
    changed = false;
    outer: for (let i = 0; i + 1 < P.length; i++) for (let j = i + 2; j + 1 < P.length && j < i + 60; j++) {
      const h = segX(P[i], P[i + 1], P[j], P[j + 1]);
      if (!h) continue;
      P.splice(i + 1, j - i, h); st.loops++; changed = true; break outer;
    }
  }
  for (let pass = 0; pass < 5; pass++) {
    let any = false;
    for (let k = 1; k + 1 < P.length; k++) {
      const a = P[k - 1], b = P[k], c = P[k + 1];
      const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
      const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
      if (lu < 1e-4 || lv < 1e-4 || (ux * vx + uz * vz) / (lu * lv) < -0.5) { P.splice(k, 1); st.cusps++; any = true; k--; }
    }
    if (!any) break;
  }
  return P;
}
function resample(P, step) {
  const c = cumulative(P), L = c[c.length - 1];
  if (L < 2 * step) return P.map((p) => [p[0], p[1]]);
  const n = Math.max(2, Math.round(L / step)), out = [];
  let k = 1;
  for (let i = 0; i <= n; i++) {
    const s = (L * i) / n;
    while (k < c.length - 1 && c[k] < s) k++;
    const t = (s - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1]);
    out.push([P[k - 1][0] + (P[k][0] - P[k - 1][0]) * t, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * t]);
  }
  return out;
}
function smooth(P, passes = 3) {
  for (let r = 0; r < passes; r++) {
    const Q = P.map((p) => [p[0], p[1]]);
    for (let k = 1; k + 1 < P.length; k++) { Q[k][0] = 0.25 * P[k - 1][0] + 0.5 * P[k][0] + 0.25 * P[k + 1][0]; Q[k][1] = 0.25 * P[k - 1][1] + 0.5 * P[k][1] + 0.25 * P[k + 1][1]; }
    P = Q;
  }
  return P;
}

// ---------------------------------------------------------------- round 5: every "next" link joins paths that touch
// The engine (read-only) starts a junction connector at armPoint(arm, arm.trim, t): the arm's STRAIGHT frame line from
// the node, while the lane piece ends at station s = trim along the road's fitted ALIGNMENT. Where the alignment bends
// inside the trim (big junctions, radius-clamped bends, "road-swallowed" roads whose trim is longer than the road)
// the two are metres apart: I6 48 links 0.4-19 m, E4 170 links up to 92 m; a car following one jumped. And at
// continuation / split nodes the engine links lane to lane (lateralLinks: no geometry) between lanes up to 2.6 m apart
// sideways. Fixed here, on the engine's output, before the rest of the refinement:
//   - a junction connector (straight / left / right) whose ends are off its lanes is rebuilt as the engine builds one
//     (a cubic with ~0.56 x the tangent-intersection handles, a circle-like arc) from the real end of its entry lane
//     (its last direction) to the real start of its exit lane (its first direction);
//   - ring / u-turn connectors (an arc of their own in the middle), and any connector off by less than 1 m, keep their
//     shape and take the end offsets, faded along their length;
//   - a lane-to-lane link with a gap bends the end of the entry lane (it has one next) or the start of the exit lane
//     (it has one prev) onto the other over up to 12 m; a link where neither can move without tearing another link
//     is dropped when the entry lane has another, touching, next; else it is kept and counted (stats.joinLeft).
const JOIN_EPS = 0.05;
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function dirOver(P, fromEnd, back = 3) {
  // unit direction of the last (fromEnd) or first `back` m of P, in travel direction
  const n = P.length;
  if (fromEnd) { let k = n - 2; while (k > 0 && dist2(P[k], P[n - 1]) < back) k--; const dx = P[n - 1][0] - P[k][0], dz = P[n - 1][1] - P[k][1], L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; }
  let k = 1; while (k < n - 1 && dist2(P[k], P[0]) < back) k++;
  const dx = P[k][0] - P[0][0], dz = P[k][1] - P[0][1], L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L];
}
function cubicJoin(p0, d0, p3, d3) {
  const D = dist2(p0, p3);
  // tangent lines p0 + d0 u and p3 - d3 v
  const den = d0[0] * -d3[1] - d0[1] * -d3[0], wx = p3[0] - p0[0], wz = p3[1] - p0[1];
  let u = D / 3, v = D / 3;
  if (Math.abs(den) > 1e-9) {
    const hu = (wx * -d3[1] - wz * -d3[0]) / den, hv = (wx * d0[1] - wz * d0[0]) / den;
    if (hu > 0.2 && hv > 0.2 && hu < D * 3 && hv < D * 3) { u = hu * 0.56; v = hv * 0.56; }
  }
  const p1 = [p0[0] + d0[0] * u, p0[1] + d0[1] * u], p2 = [p3[0] - d3[0] * v, p3[1] - d3[1] * v];
  const n = Math.max(6, Math.ceil(D / 2)), out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t, a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, e = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]]);
  }
  return out;
}
/** Move the last (atEnd) or first points of P by (dx, dz), faded to 0 over `reach` m. */
function bendEnd(P, atEnd, dx, dz, reach) {
  const c = cumulative(P), L = c[c.length - 1], R = Math.min(reach, L * 0.5) || 1;
  return P.map((q, k) => {
    const s = atEnd ? L - c[k] : c[k], f = s >= R ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * s) / R);
    return [q[0] + dx * f, q[1] + dz * f, ...q.slice(2)];
  });
}
export function joinLaneGraph(net) {
  const st = { links: 0, gapsBefore: 0, maxGapBefore: 0, rebuilt: 0, faded: 0, laneBent: 0, dropped: 0, joinLeft: 0 };
  if (!net?.graph) return st;
  const by = net.graph.byId, paths = net.graph.paths;
  const gap = (a, b) => dist2(a.pts[a.pts.length - 1], b.pts[0]);
  for (const a of paths) for (const id of a.next) { const b = by.get(id); if (!b) continue; st.links++; const d = gap(a, b); if (d > JOIN_EPS) { st.gapsBefore++; st.maxGapBefore = Math.max(st.maxGapBefore, d); } }
  const reset = (p) => { p.cum = cumulative(p.pts); const L0 = p.len; p.len = p.cum[p.cum.length - 1]; if (p.stop && L0 > 0) p.stop.at = Math.max(0, Math.min(p.len, p.stop.at + (p.len - L0))); };
  // 1. lane -> lane links (continuations, splits): bend one side onto the other
  for (const a of paths) {
    if (a.kind !== "lane") continue;
    for (const id of [...a.next]) {
      const b = by.get(id); if (!b || b.kind !== "lane") continue;
      const E = a.pts[a.pts.length - 1], S = b.pts[0], d = dist2(E, S);
      if (d <= JOIN_EPS) continue;
      if (a.next.length === 1) { a.pts = bendEnd(a.pts, true, S[0] - E[0], S[1] - E[1], 12); reset(a); st.laneBent++; }
      else if (b.prev.length === 1) { b.pts = bendEnd(b.pts, false, E[0] - S[0], E[1] - S[1], 12); reset(b); st.laneBent++; }
      else if (a.next.some((o) => o !== id && gap(a, by.get(o)) <= JOIN_EPS)) {
        a.next = a.next.filter((o) => o !== id); b.prev = b.prev.filter((o) => o !== a.id); st.dropped++;
      } else st.joinLeft++;
    }
  }
  // 2. connectors: rebuilt (junction turns) or end-shifted (ring, u-turn) onto their lanes
  for (const c of paths) {
    if (c.kind !== "connector") continue;
    const a = by.get(c.prev[0]), b = by.get(c.next[0]);
    const E = a ? a.pts[a.pts.length - 1] : c.pts[0], S = b ? b.pts[0] : c.pts[c.pts.length - 1];
    const d0 = dist2(E, c.pts[0]), d1 = dist2(S, c.pts[c.pts.length - 1]);
    if (d0 <= JOIN_EPS && d1 <= JOIN_EPS) continue;
    if (Math.max(d0, d1) < 1 || c.turn === "ring" || c.turn === "uturn" || !a || !b || a.pts.length < 2 || b.pts.length < 2) {
      const s0 = [E[0] - c.pts[0][0], E[1] - c.pts[0][1]], s1 = [S[0] - c.pts[c.pts.length - 1][0], S[1] - c.pts[c.pts.length - 1][1]];
      const cc = cumulative(c.pts), L = cc[cc.length - 1] || 1;
      c.pts = c.pts.map((q, k) => { const f = cc[k] / L; return [q[0] + s0[0] * (1 - f) + s1[0] * f, q[1] + s0[1] * (1 - f) + s1[1] * f]; });
      st.faded++;
    } else {
      c.pts = cubicJoin([E[0], E[1]], dirOver(a.pts, true), [S[0], S[1]], dirOver(b.pts, false));
      st.rebuilt++;
    }
    reset(c);
  }
  return st;
}

export function refineLaneGraph(net, prep, inventory) {
  const st = { paths: 0, loops: 0, cusps: 0, centred: 0, centredPts: 0, holds: 0 };
  if (!net?.graph) return st;
  // round 5: off the class raster (it covers the tile's core square only; the graph reaches 150 m beyond) nothing is
  // known: count it as carriageway, so junctions on the tile edge are not pulled out of shape toward their centre
  const RG = prep?.grid;
  const offRaster = (x, z) => !RG || x < RG.x0 || z < RG.z0 || x >= RG.x0 + RG.nx * RG.step || z >= RG.z0 + RG.nz * RG.step;
  const cls = (x, z) => (prep ? (offRaster(x, z) ? 0 : prep.classAt(x, z)) : -1);
  const roadById = new Map(net.roads.map((r) => [r.id, r]));
  const nodeById = new Map(net.nodes.map((n) => [n.id, n]));
  const simple = (p) => {
    const rr = roadById.get(p.roadId); if (!rr?.stack) return null;
    const drive = (side) => (rr.stack.sides[side] || []).filter((l) => l.type === "driving" || l.type === "bus").length;
    const me = drive(p.side), other = drive(p.side === "left" ? "right" : "left");
    if (me !== 1 || other > 1) return null;
    if ((rr.stack.sides[p.side] || []).some((l) => l.type === "parking")) return null;
    return { oneWay: other === 0 };
  };
  const ray = (x, z, dx, dz) => { for (let d = 0.1; d < 15; d += 0.1) if (!CARRIAGE.has(cls(x + dx * d, z + dz * d))) return d; return null; };
  // round 3: a path point off the measured carriageway, or closer than CLEAR to its kerb, moves across the path to the
  // nearest place with CLEAR on both sides (or the middle of a carriageway narrower than 2 x CLEAR); the moves get a
  // tent envelope over +-6 points and the path is smoothed after, so it bends instead of denting. A lane whose engine
  // centreline left the measured street (J1's south-west arm) comes back onto it this way
  const CLEAR = 1.4;
  const clearAt = (x, z, nx, nz) => { if (!CARRIAGE.has(cls(x, z))) return -1; const a = ray(x, z, nx, nz) ?? 15, b = ray(x, z, -nx, -nz) ?? 15; return Math.min(a, b, CLEAR + 0.01) >= CLEAR ? CLEAR : Math.min(a, b) >= (a + b) / 2 - 0.15 ? CLEAR : Math.min(a, b); };
  const keepOnCarriage = (P, stt) => {
    if (P.length < 3) return P;
    const mv = P.map((q, k) => {
      const o = P[Math.max(0, k - 1)], n2 = P[Math.min(P.length - 1, k + 1)], tx = n2[0] - o[0], tz = n2[1] - o[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      if (clearAt(q[0], q[1], nx, nz) >= CLEAR) return null;
      for (let d = 0.2; d <= 8; d += 0.2) for (const sg of [1, -1]) {
        const x = q[0] + nx * d * sg, z = q[1] + nz * d * sg;
        if (clearAt(x, z, nx, nz) >= CLEAR) return [nx * d * sg, nz * d * sg];
      }
      return null;
    });
    if (!mv.some(Boolean)) return P;
    stt.keptOn = (stt.keptOn || 0) + 1;
    const M = mv.map((_, k) => { let bx = 0, bz = 0, bw = 0; for (let j = Math.max(0, k - 6); j <= Math.min(mv.length - 1, k + 6); j++) { if (!mv[j]) continue; const w = 1 - Math.abs(j - k) / 7; const L = Math.hypot(mv[j][0], mv[j][1]) * w; if (L > bw) { bw = L; bx = mv[j][0] * w; bz = mv[j][1] * w; } } return [bx, bz]; });
    return P.map((q, k) => [q[0] + M[k][0], q[1] + M[k][1]]);
  };
  const endMove = new Map();       // path id -> { a: [dx, dz] at its start, b: at its end }
  // ---- lanes first (loops, centring, smoothing), then connectors (loops, following their lanes' end moves)
  const lanes = net.graph.paths.filter((p) => p.kind === "lane"), others = net.graph.paths.filter((p) => p.kind !== "lane");
  for (const p of lanes) {
    st.paths++;
    const L0 = p.len;
    let P = unloop(p.pts.map(XY), st);
    P = resample(P, 1.0);
    const kind = prep ? simple(p) : null;
    const a0 = [P[0][0], P[0][1]], b0 = [P[P.length - 1][0], P[P.length - 1][1]];
    if (kind && P.length >= 4) {
      const shift = P.map(() => null);
      for (let k = 0; k < P.length; k++) {
        const q = P[Math.min(P.length - 1, k + 1)], o = P[Math.max(0, k - 1)];
        const tx = q[0] - o[0], tz = q[1] - o[1], tl = Math.hypot(tx, tz) || 1;
        const rx = -tz / tl, rz = tx / tl;                // right of travel (x east, z south)
        const [x, z] = P[k];
        if (!CARRIAGE.has(cls(x, z))) continue;
        const dr = ray(x, z, rx, rz), dl = ray(x, z, -rx, -rz);
        if (dl == null || dr == null) continue;
        const W = dl + dr, want = kind.oneWay ? W / 2 : W / 4;     // distance to the right kerb (right-hand traffic)
        let m = dr - want;                                         // move right by m (negative: left)
        if (!kind.oneWay && W < 5.0) continue;                     // too narrow to split: leave it
        m = Math.max(-1.5, Math.min(1.5, m));
        shift[k] = [rx * m, rz * m];
      }
      // fill gaps (no measurement) by the neighbours, then smooth the shift itself along the path
      let last = null;
      for (let k = 0; k < shift.length; k++) if (shift[k]) last = shift[k]; else if (last) shift[k] = last;
      last = null;
      for (let k = shift.length - 1; k >= 0; k--) if (shift[k] && !last) last = shift[k]; else if (!shift[k] && last) shift[k] = last;
      if (shift.every(Boolean)) {
        let S = shift;
        for (let r = 0; r < 6; r++) S = S.map((s, k) => { const a = S[Math.max(0, k - 1)], b = S[Math.min(S.length - 1, k + 1)]; return [0.25 * a[0] + 0.5 * s[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * s[1] + 0.25 * b[1]]; });
        P = P.map((p, k) => [p[0] + S[k][0], p[1] + S[k][1]]);
        st.centred++; st.centredPts += P.length;
      }
    }
    P = unloop(P, st);
    // (simple stacks only: two lanes of one direction pushed to the same clear place crossed each other)
    if (prep && kind) P = keepOnCarriage(P, st);
    P = smooth(P, 3);
    endMove.set(p.id, { a: [P[0][0] - a0[0], P[0][1] - a0[1]], b: [P[P.length - 1][0] - b0[0], P[P.length - 1][1] - b0[1]] });
    p.pts = P;
    p.cum = cumulative(P); p.len = p.cum[p.cum.length - 1];
    if (p.stop && L0 > 0) p.stop.at = Math.max(0, p.stop.at * (p.len / L0));
  }
  for (const p of others) {
    st.paths++;
    let P = unloop(p.pts.map(XY), st);
    // follow the lanes' end moves: the start by the previous lane's end move, the end by the next lane's start move,
    // faded linearly along the connector
    const prev = (p.prev || []).map((id) => endMove.get(id)?.b).find(Boolean), next = (p.next || []).map((id) => endMove.get(id)?.a).find(Boolean);
    if (prev || next) {
      const c = cumulative(P), L = c[c.length - 1] || 1;
      P = P.map((q, k) => { const f = c[k] / L, a = prev || [0, 0], b = next || [0, 0]; return [q[0] + a[0] * (1 - f) + b[0] * f, q[1] + a[1] * (1 - f) + b[1] * f]; });
    }
    if (P.length >= 3) { P = resample(P, 1.0); P = smooth(P, 2); }
    // a connector that cuts over a kerb corner (its arc wider than the measured corner) is pulled toward the
    // junction's centre, point by point, until it is 0.9 m inside the carriageway (half a car), then smoothed again
    const node = p.nodeId ? nodeById.get(p.nodeId) : null;
    if (prep && node && P.length >= 3) {
      const clear = (x, z) => CARRIAGE.has(cls(x, z)) && [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].every(([a, b]) => CARRIAGE.has(cls(x + a, z + b)));
      // the pull each point needs, then a tent envelope over +-5 points (so the curve bends, it does not dent)
      const need = P.map((q, k) => {
        if (k === 0 || k === P.length - 1 || clear(q[0], q[1])) return 0;
        const dx = node.x - q[0], dz = node.z - q[1], L = Math.hypot(dx, dz);
        for (let d = 0.25; d <= Math.min(6, L - 0.5); d += 0.25) if (clear(q[0] + (dx / L) * d, q[1] + (dz / L) * d)) return d;
        return 0;
      });
      if (need.some((d) => d > 0)) {
        const env = need.map((_, k) => { let m = 0; for (let j = Math.max(0, k - 5); j <= Math.min(need.length - 1, k + 5); j++) m = Math.max(m, need[j] * (1 - Math.abs(j - k) / 6)); return m; });
        const f = (k) => Math.min(k, P.length - 1 - k) / 3;           // the ends stay on their lanes
        P = P.map((q, k) => { const dx = node.x - q[0], dz = node.z - q[1], L = Math.hypot(dx, dz) || 1, d = env[k] * Math.min(1, f(k)); return [q[0] + (dx / L) * d, q[1] + (dz / L) * d]; });
        P = smooth(P, 4); st.pulledIn = (st.pulledIn || 0) + 1;
        // no turn tighter than a car can drive (R >= 4 m, 14°/m): smooth on until it holds (ends fixed)
        P = resample(P, 0.5);
        const maxTurn = (Q) => { let m = 0; for (let k = 1; k + 1 < Q.length; k++) { const h0 = Math.atan2(Q[k][1] - Q[k - 1][1], Q[k][0] - Q[k - 1][0]), h1 = Math.atan2(Q[k + 1][1] - Q[k][1], Q[k + 1][0] - Q[k][0]); m = Math.max(m, Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) / 0.5); } return (m * 180) / Math.PI; };
        for (let r = 0; r < 40 && maxTurn(P) > 14; r++) P = smooth(P, 1);
      }
    }
    if (prep && P.length >= 5) {
      // ends stay joined to their lanes: only the inner points are kept on the carriageway
      const inner = keepOnCarriage(P, st);
      P = P.map((q, k) => { const f = Math.min(1, Math.min(k, P.length - 1 - k) / 3); return [q[0] + (inner[k][0] - q[0]) * f, q[1] + (inner[k][1] - q[1]) * f]; });
      P = smooth(P, 2);
    }
    p.pts = P;
    p.cum = cumulative(P); p.len = p.cum[p.cum.length - 1];
  }
  // ---- round 3: every path ends with no turn tighter than a car drives (R >= 4 m, 14°/m; U-turns excepted), ends fixed
  const maxTurn = (Q) => { let m = 0; for (let k = 1; k + 1 < Q.length; k++) { const a = Q[k - 1], b = Q[k], c = Q[k + 1]; const h0 = Math.atan2(b[1] - a[1], b[0] - a[0]), h1 = Math.atan2(c[1] - b[1], c[0] - b[0]), l = (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1])) / 2 || 1; m = Math.max(m, Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) / l); } return (m * 180) / Math.PI; };
  for (const p of net.graph.paths) {
    if (p.turn === "uturn" || p.pts.length < 4) continue;
    const L0 = p.len;
    let P = resample(p.pts.map(XY), 0.5);
    for (let r = 0; r < 60 && maxTurn(P) > 14; r++) P = smooth(P, 1);
    p.pts = P; p.cum = cumulative(P); p.len = p.cum[p.cum.length - 1];
    if (p.stop && L0 > 0 && !p.stop.line) p.stop.at = Math.max(0, p.stop.at * (p.len / L0));
  }
  // ---- the moves above (centring, keep-on-carriage, smoothing) are per path: lane-to-lane joins drift apart again
  st.rejoined = joinLaneGraph(net).gapsBefore;
  // ---- hold points at the painted lines
  if (inventory?.stops?.length) {
    // a lane that ends at a junction holds at the painted line its last 30 m cross (the line extended 0.5 m at each
    // end: a line spans its approach, the lane centre lies inside it)
    const ends = new Map();
    for (const s of inventory.stops) { if (s.ring) continue; const [A, B] = s.line; ends.set(s, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]); }
    for (const p of lanes) {
      if (!p.next?.length) continue;
      const E = p.pts[p.pts.length - 1];
      let best = null;
      for (const [s, m] of ends) {
        if (Math.hypot(m[0] - E[0], m[1] - E[1]) > 40) continue;
        const [A, B] = s.line, L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ex = (B[0] - A[0]) / L * 0.5, ez = (B[1] - A[1]) / L * 0.5;
        for (let k = p.pts.length - 1; k >= 1 && p.len - p.cum[k] < 30; k--) {
          const h = segX(p.pts[k - 1], p.pts[k], [A[0] - ex, A[1] - ez], [B[0] + ex, B[1] + ez]);
          if (h) { const at = p.cum[k - 1] + Math.hypot(h[0] - p.pts[k - 1][0], h[1] - p.pts[k - 1][1]); if (!best || at > best.at) best = { at, s }; break; }
        }
      }
      if (!best) continue;
      p.stop = { ...(p.stop || {}), at: Math.max(0, best.at - 0.6), line: best.s.id, control: p.stop?.control ?? (best.s.kind === "giveway" ? "yield" : "stop") };
      st.holds++;
    }
  }
  // ---- round 5: no junction turn tighter than a car turns (R >= 5 m)
  Object.assign(st, widenTightTurns(net, cls));
  return st;
}

/** Tightest radius of polyline P over chords of `span` m (three points span apart along it). */
export function tightestRadius(P, span = 1.5) {
  const c = cumulative(P);
  let m = Infinity;
  for (let k = 0, a = 0, b = 0; k < P.length; k++) {
    while (a < k && c[k] - c[a + 1] >= span) a++;
    while (b < P.length - 1 && c[b] - c[k] < span) b++;
    if (c[k] - c[a] < span * 0.6 || c[b] - c[k] < span * 0.6) continue;
    const [ax, az] = P[a], [kx, kz] = P[k], [bx, bz] = P[b];
    const A = Math.hypot(kx - ax, kz - az), B = Math.hypot(bx - kx, bz - kz), C = Math.hypot(bx - ax, bz - az);
    const cr = Math.abs((kx - ax) * (bz - az) - (kz - az) * (bx - ax));
    if (cr > 1e-9) m = Math.min(m, (A * B * C) / (2 * cr));
  }
  return m;
}
/** P cut at distance d along it: the part before d, or the part after it when `after`. */
function cutAt(P, d, after) {
  const c = cumulative(P);
  let k = 1; while (k < P.length - 1 && c[k] < d) k++;
  const f = Math.max(0, Math.min(1, (d - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1])));
  const q = [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f];
  return after ? [q, ...P.slice(f >= 1 - 1e-6 ? k + 1 : k)] : [...P.slice(0, f <= 1e-6 ? k - 1 : k), q];
}

/**
 * TIGHT TURNS (roads round 4 leftover; owner 2026-11-13 "blocky turns"): the engine starts every junction connector at
 * its arm's trim station, so where a side street's lanes run right up to the crossing road (a small trim, an oblique
 * arm) a left / right turn has to happen in 3-7 m: radii of 0.8-2 m, a car pivots. A real car (turning circle ~10-11 m
 * kerb to kerb) starts the turn earlier. Here the turn starts earlier: the entry lane's end and / or the exit lane's
 * start are cut back 1 m at a time (every connector at that lane end is rebuilt from the new point, as the engine
 * builds them) until the turn's tightest radius is >= RMIN, while
 *   - a lane keeps at least max(3 m, 40 %) of its length and a cut is at most CUT_MAX m,
 *   - an approach never ends before its hold point at a painted stop / give-way line (+ 0.6 m),
 *   - no rebuilt connector has more points off the measured carriageway than before,
 *   - no connector at that lane end gets tighter.
 * U-turns and roundabout rings keep their own shape.
 */
const RMIN = 5, CUT_STEP = 1, CUT_MAX = 8;
export function widenTightTurns(net, cls = null) {
  const st = { tightBefore: 0, tightAfter: 0, laneCuts: 0, cutMetres: 0 };
  if (!net?.graph) return st;
  const by = net.graph.byId;
  const turning = (c) => c.kind === "connector" && (c.turn === "left" || c.turn === "right" || c.turn === "straight");
  const cons = net.graph.paths.filter((c) => turning(c) && c.prev.length === 1 && c.next.length === 1 &&
    by.get(c.prev[0])?.kind === "lane" && by.get(c.next[0])?.kind === "lane");
  const offCount = (P) => { if (!cls) return 0; let n = 0; for (const q of P) { const k = cls(q[0], q[1]); if (!(k >= 0 && k <= 3)) n++; } return n; };
  const cur = new Map(cons.map((c) => [c, c.pts]));
  const rad = new Map(cons.map((c) => [c, tightestRadius(c.pts)]));
  st.tightBefore = cons.filter((c) => rad.get(c) < RMIN).length;
  const cut = new Map();           // "laneId|b" (entry lane, cut at its end) / "laneId|a" (exit lane, at its start) -> m
  // the room left for one more cut at end e of lane p: both its cuts together leave max(3 m, 40 %) of it, and an
  // approach keeps its painted hold point
  const budget = (p, e) => {
    const L = p.len, other = cut.get(`${p.id}|${e === "b" ? "a" : "b"}`) || 0;
    let mx = Math.min(CUT_MAX, L - Math.max(3, 0.4 * L) - other);
    if (e === "b" && p.stop?.line) mx = Math.min(mx, L - (p.stop.at + 0.6));
    return Math.max(0, mx);
  };
  const lanePts = (p) => {
    let P = p.pts;
    const da = cut.get(`${p.id}|a`) || 0, db = cut.get(`${p.id}|b`) || 0;
    if (db) P = cutAt(P, p.len - db, false);
    if (da) P = cutAt(P, da, true);
    return P;
  };
  const build = (c) => {
    const A = lanePts(by.get(c.prev[0])), B = lanePts(by.get(c.next[0]));
    return resample(cubicJoin(A[A.length - 1], dirOver(A, true), B[0], dirOver(B, false)), 0.5);
  };
  const atEnd = new Map();         // lane end key -> the connectors that start / end there
  for (const c of cons) for (const k of [`${c.prev[0]}|b`, `${c.next[0]}|a`]) { if (!atEnd.has(k)) atEnd.set(k, []); atEnd.get(k).push(c); }
  for (let it = 0; it < CUT_MAX / CUT_STEP; it++) {
    let changed = false;
    for (const c of cons) {
      if (rad.get(c) >= RMIN) continue;
      const ka = `${c.prev[0]}|b`, kb = `${c.next[0]}|a`;
      let best = null;
      for (const keys of [[ka], [kb], [ka, kb]]) {
        const ok = keys.every((k) => { const [id, e] = k.split("|"); return (cut.get(k) || 0) + CUT_STEP <= budget(by.get(id), e) + 1e-6; });
        if (!ok) continue;
        for (const k of keys) cut.set(k, (cut.get(k) || 0) + CUT_STEP);
        const affected = new Set(keys.flatMap((k) => atEnd.get(k)));
        const trial = new Map();
        let fine = true, gain = 0;
        for (const x of affected) {
          const P = build(x), r = tightestRadius(P), r0 = rad.get(x);
          if (r < Math.min(r0, RMIN) - 0.05 || offCount(P) > offCount(cur.get(x))) { fine = false; break; }
          gain += Math.min(r, RMIN) - Math.min(r0, RMIN);
          trial.set(x, [P, r]);
        }
        for (const k of keys) cut.set(k, cut.get(k) - CUT_STEP);
        if (fine && gain > 0.05 && (!best || gain > best.gain)) best = { keys, trial, gain };
      }
      if (!best) continue;
      for (const k of best.keys) cut.set(k, (cut.get(k) || 0) + CUT_STEP);
      for (const [x, [P, r]] of best.trial) { cur.set(x, P); rad.set(x, r); }
      changed = true;
    }
    if (!changed) break;
  }
  // apply: the lanes cut, their connectors rebuilt
  const cutLanes = new Set();
  for (const [k, d] of cut) if (d) { cutLanes.add(k.split("|")[0]); st.laneCuts++; st.cutMetres += d; }
  for (const id of cutLanes) {
    const p = by.get(id), da = cut.get(`${id}|a`) || 0;
    p.pts = lanePts(p);
    p.cum = cumulative(p.pts); p.len = p.cum[p.cum.length - 1];
    if (p.stop) p.stop.at = Math.max(0, Math.min(p.stop.at - da, p.len - 0.3));
  }
  for (const c of cons) {
    if (cur.get(c) === c.pts) continue;
    c.pts = cur.get(c); c.cum = cumulative(c.pts); c.len = c.cum[c.cum.length - 1];
  }
  st.tightAfter = cons.filter((c) => rad.get(c) < RMIN).length;
  st.cutMetres = Math.round(st.cutMetres);
  return st;
}
