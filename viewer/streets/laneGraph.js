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

export function refineLaneGraph(net, prep, inventory) {
  const st = { paths: 0, loops: 0, cusps: 0, centred: 0, centredPts: 0, holds: 0 };
  if (!net?.graph) return st;
  const cls = (x, z) => (prep ? prep.classAt(x, z) : -1);
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
    if (prep) P = keepOnCarriage(P, st);
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
  return st;
}
