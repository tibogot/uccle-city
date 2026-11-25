// THE TRAM TIMETABLE MATHS, no three.js (claude/missions): the shapes' arc length / tangents, a point at a distance along
// a shape, a trip's state at a clock time (dwell, accelerate, cruise, brake), and the police game's BLOCKED TRACK (a car
// parked on the rails: the trams of the line stop behind it). viewer/tramline.js draws the trams from it; the mission
// audit (tools/audit/missionAudit.mjs) runs the same code headless, so what it proves is what the city does.
//
// claude/missions (rule mission-premise): the blocked track can say what it holds (blockState: the trams standing at the
// line now) and when the next tram reaches a line (etaTo, from the timetable + each trip's delay), and the stops along
// each shape (spots) for the dispatch to pick from. Two fixes under the same switch (?missions=old: as before):
//   - a trip runs until its last arrival PLUS its delay (it vanished `delay` seconds early: a tram held near its
//     terminus disappeared from behind the car while the player drove there);
//   - a held trip stands exactly where it stopped (its delay = the clock minus the time it stopped at), not "+ the frame's
//     dt clamped to 5 s" (a frame gap over 5 s let the held tram creep through the car).
export const MISSIONS_OLD = /[?&]missions=old(&|$)/.test(globalThis.location?.search || "");

/** arc length + tangents of a shape { pts } (in place) */
export function finishShape(s) {
  const { pts } = s, n = pts.length;
  s.cum = new Float64Array(n);
  for (let i = 1; i < n; i++) s.cum[i] = s.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  s.tan = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    s.tan[i * 2] = dx / L; s.tan[i * 2 + 1] = dz / L;
  }
  return s;
}
/** the doc's shapes densified to 1 m: { id: { orig, snap, pts, cum, tan } } */
export function densifyShapes(doc) {
  const shapes = {};
  for (const [id, line] of Object.entries(doc.shapes)) {
    const pts = [];
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    shapes[id] = { orig: pts.map((p) => p.slice()), snap: pts.map((p) => p.slice()), pts };
    finishShape(shapes[id]);
  }
  return shapes;
}
/** THE TRACK SNAP (claude/tramfix: out of tramline.js, so the tramsnap gate row runs the city's own code; rule
 *  no-undefined-refs). The shape points inside the added tiles snapped onto their tram tracks (within 3 m), two
 *  [1 2 1]/4 passes along them (no kink where two tiles' tracks meet), then each shape's pts / cum / tan swapped in
 *  together, so a tram never reads a half-snapped line.
 *    addTracks(tracks, box)  one tile's tram tracks ([[x, z], ...] lines) into ONE 4 m grid of segments with global
 *                            line ids (a shape snaps across tile seams in one pass, its track continuity carried over)
 *    snapAll()               re-snaps every shape (points outside every added box keep their last snap)
 *  alloc: the by-index loop (claude/allocrate2, rule alloc-rate), false = ?tramalloc=old (the destructuring loop);
 *  slice(): awaited every 256 points and per shape (tramline.js: yield to the next frame after 3 ms); hits: keep
 *  s.hit per point (1 = on a track, 0 = no track within 3 m) for the audit. */
export function createTrackSnap(shapes, { alloc = true, slice = null, hits = false } = {}) {
  const grid = new Map(), gk = (i, j) => i * 100003 + j, boxes = [];
  let lineCount = 0;
  const loaded = (x, z) => boxes.some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
  function addTracks(tracks, b) {
    boxes.push(b);
    tracks.forEach((l) => { const li = lineCount++; for (let k = 1; k < l.length; k++) {
      const [ax, az] = l[k - 1], [cx, cz] = l[k];
      for (let i = Math.floor((Math.min(ax, cx) - 3) / 4); i <= Math.floor((Math.max(ax, cx) + 3) / 4); i++)
        for (let j = Math.floor((Math.min(az, cz) - 3) / 4); j <= Math.floor((Math.max(az, cz) + 3) / 4); j++) {
          const key = gk(i, j);
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push([ax, az, cx, cz, li]);
        }
    } });
  }
  // A GTFS shape runs between the two tracks of a street (~0.6-1.5 m off), so "nearest segment" flips from one
  // track to the other and the tram wiggles across the street. Stay on the track of the previous point until it
  // leaves its 3 m reach (a junction), and prefer a track running the shape's way.
  // (claude/allocrate2) by index reads: no destructuring of the grid's segment tuples or of the shape's points, the
  // previous snapped point in two numbers (21 KB a frame flying)
  const snapFlat = async (s, snap, hit) => {
    let prevLine = -1, hasPrev = false, ppx = 0, ppz = 0;
    const o = s.orig;
    for (let i = 0; i < o.length; i++) {
      if (slice && (i & 255) === 0) await slice();
      const x = o[i][0], z = o[i][1];
      if (!loaded(x, z)) { prevLine = -1; hasPrev = false; continue; }
      const a0 = o[Math.max(0, i - 1)], a1 = o[Math.min(o.length - 1, i + 1)];
      const sx = a1[0] - a0[0], sz = a1[1] - a0[1], sl = Math.hypot(sx, sz) || 1;
      let best = Infinity, bx = x, bz = z, bl = -1;
      const cell = grid.get(gk(Math.floor(x / 4), Math.floor(z / 4)));
      if (cell) for (let c = 0; c < cell.length; c++) {
        const sg = cell[c], ax = sg[0], az = sg[1], cx = sg[2], cz = sg[3], li = sg[4];
        const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
        const d2 = (px - x) ** 2 + (pz - z) ** 2;
        if (d2 > 9) continue;
        const back = (dx * sx + dz * sz) / (Math.sqrt(L2) * sl) < 0 ? 1 : 0;
        const cont = li === prevLine || (hasPrev && (px - ppx) ** 2 + (pz - ppz) ** 2 < 2.25 && Math.abs(Math.hypot(px - ppx, pz - ppz) - Math.hypot(x - o[Math.max(0, i - 1)][0], z - o[Math.max(0, i - 1)][1])) < 0.5);
        const cost = d2 + (prevLine >= 0 && !cont ? 100 : 0) + back;
        if (cost < best) { best = cost; bx = px; bz = pz; bl = li; }
      }
      snap[i] = [bx, bz];
      if (hit) hit[i] = bl >= 0 ? 1 : 0;
      prevLine = bl; hasPrev = true; ppx = bx; ppz = bz;
    }
  };
  // ?tramalloc=old: the same snap as before claude/allocrate2
  const snapOld = async (s, snap, hit) => {
    let prevLine = -1, prevPt = null;
    for (let i = 0; i < s.orig.length; i++) {
      if (slice && (i & 255) === 0) await slice();
      const [x, z] = s.orig[i];
      if (!loaded(x, z)) { prevLine = -1; prevPt = null; continue; }
      const o = s.orig, a0 = o[Math.max(0, i - 1)], a1 = o[Math.min(o.length - 1, i + 1)];
      const sx = a1[0] - a0[0], sz = a1[1] - a0[1], sl = Math.hypot(sx, sz) || 1;
      let best = Infinity, bx = x, bz = z, bl = -1;
      for (const [ax, az, cx, cz, li] of grid.get(gk(Math.floor(x / 4), Math.floor(z / 4))) || []) {
        const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
        const d2 = (px - x) ** 2 + (pz - z) ** 2;
        if (d2 > 9) continue;
        const back = (dx * sx + dz * sz) / (Math.sqrt(L2) * sl) < 0 ? 1 : 0;
        // same line, or the next tile's piece of it (its point is within 1.5 m of the previous snapped point)
        const cont = li === prevLine || (prevPt && (px - prevPt[0]) ** 2 + (pz - prevPt[1]) ** 2 < 2.25 && Math.abs(Math.hypot(px - prevPt[0], pz - prevPt[1]) - Math.hypot(x - o[Math.max(0, i - 1)][0], z - o[Math.max(0, i - 1)][1])) < 0.5);
        const cost = d2 + (prevLine >= 0 && !cont ? 100 : 0) + back;     // switch only when the track left the 3 m reach
        if (cost < best) { best = cost; bx = px; bz = pz; bl = li; }
      }
      snap[i] = [bx, bz];
      if (hit) hit[i] = bl >= 0 ? 1 : 0;
      prevLine = bl; prevPt = [bx, bz];
    }
  };
  async function snapAll() {
    for (const s of Object.values(shapes)) {
      const snap = s.snap.slice(), hit = hits ? (s.hit ? s.hit.slice() : new Uint8Array(s.orig.length)) : null;
      await (alloc ? snapFlat : snapOld)(s, snap, hit);
      s.snapNext = snap; s.hitNext = hit;
    }
    // two passes of a [1 2 1]/4 filter along the snapped points: no kink where two tiles' tracks meet (on a 25 m
    // curve it moves the line by under 1 cm)
    for (const s of Object.values(shapes)) {
      if (slice) await slice();
      let p = s.snapNext;
      for (let pass = 0; pass < 2; pass++) {
        const q = p.map((v) => v.slice());
        for (let i = 1; i + 1 < p.length; i++) { q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4; q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4; }
        p = q;
      }
      // swapped in together (pts, its arc length and tangents), in one task
      const t = finishShape({ pts: p });
      s.snap = s.snapNext; delete s.snapNext;
      if (s.hitNext) s.hit = s.hitNext; delete s.hitNext;
      s.pts = t.pts; s.cum = t.cum; s.tan = t.tan;
    }
  }
  return { addTracks, snapAll, loaded, grid, boxes };
}
/** point + heading at distance d along a shape (heading from the interpolated tangent): [x, z, h] */
export function shapeAt(s, d) {
  const { pts, cum, tan } = s, n = pts.length;
  d = Math.max(0, Math.min(cum[n - 1], d));
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
  const tx = tan[lo * 2] * (1 - f) + tan[hi * 2] * f, tz = tan[lo * 2 + 1] * (1 - f) + tan[hi * 2 + 1] * f;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(-tz, tx)];
}
/** shapeAt() into o[0..2] (no allocation) */
export function shapeAtInto(s, d, o) {
  const { pts, cum, tan } = s, n = pts.length;
  d = Math.max(0, Math.min(cum[n - 1], d));
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
  const tx = tan[lo * 2] * (1 - f) + tan[hi * 2] * f, tz = tan[lo * 2 + 1] * (1 - f) + tan[hi * 2 + 1] * f;
  o[0] = a[0] + (b[0] - a[0]) * f; o[1] = a[1] + (b[1] - a[1]) * f; o[2] = Math.atan2(-tz, tx);
  return o;
}

/** the timetable + the blocked track over `shapes` (read live: tramline.js swaps a shape's pts in when it snaps) */
export function createTramSched({ shapes, trips, doc = null, old = MISSIONS_OLD }) {
  const at = shapeAt;
  // between two stops: accelerate at ACC, cruise, brake at ACC (a T3000 does ~1.1 m/s²), so the speed never jumps;
  // a hop too short for that profile falls back to a smoothstep (also continuous speed)
  const ACC = 1.0;
  const mo = { brake: 0 };                                          // travel()'s side result: braking now (0 / 1)
  const travel = (D, T, t) => {
    mo.brake = 0;
    const disc = T * T - 4 * D / ACC;
    if (D <= 0 || T <= 0) return 0;
    if (disc <= 0) { const f = Math.min(1, Math.max(0, t / T)); mo.brake = f > 0.5 && f < 1 ? 1 : 0; return D * f * f * (3 - 2 * f); }
    const v = ACC * (T - Math.sqrt(disc)) / 2, ta = v / ACC;
    if (t <= 0) return 0;
    if (t < ta) return 0.5 * ACC * t * t;
    if (t < T - ta) return 0.5 * ACC * ta * ta + v * (t - ta);
    if (t < T) { mo.brake = 1; return D - 0.5 * ACC * (T - t) ** 2; }
    return D;
  };
  // the dwell at the start of each hop (s) and the doors' opening over it (0..1: open 1-3.5 s in, closed 0.5 s before)
  const dwellOf = (hop) => Math.max(6, Math.min(18, hop * 0.25));
  const doorAt = (t, dw) => Math.max(0, Math.min(1, (t - 1) / 2.5, (dw - 0.5 - t) / 2.5));
  /** trip state at clock time tt: { d, doors (0..1), stop (index or -1), brake } (one shared object) */
  const st8 = { d: 0, doors: 0, stop: -1, brake: 0 };
  const tripState = (t, tt) => {
    const st = t.stops;
    st8.d = st[0][0]; st8.doors = 0; st8.stop = -1; st8.brake = 0;
    for (let i = 0; i < st.length - 1; i++) {
      const [d0, , dep0] = st[i], [d1, arr1] = st[i + 1];
      if (tt < st[i][1]) break;
      if (tt <= dep0) { st8.d = d0; break; }                         // standing at stop i (GTFS: never, arr = dep)
      if (tt <= arr1) {
        // the dwell never squeezes the run below what ACC allows (2 * sqrt(D / ACC)): no smoothstep fallback, no > ACC
        const hop = Math.max(1, arr1 - dep0), dw = Math.max(0, Math.min(dwellOf(hop), hop - 2 * Math.sqrt(Math.max(0, d1 - d0) / ACC) - 2)), te = tt - dep0;
        if (te < dw) { st8.d = d0; st8.doors = dw >= 6 ? doorAt(te, dw) : 0; st8.stop = i; }
        else { st8.d = d0 + travel(d1 - d0, hop - dw, te - dw); st8.brake = mo.brake; }
        break;
      }
      st8.d = d1;
    }
    return st8;
  };
  const tripD = (t, tt) => tripState(t, tt - (t.delay || 0));
  /** the trip's time frame for clock T (s of the day): T, T + 1 day (trips past midnight) or -1 (not running) */
  const tripTime = (t, T) => {
    const st = t.stops, first = st[0][2], last = st[st.length - 1][1] + (old ? 0 : t.delay || 0), Tn = T + 86400;
    return T >= first && T <= last ? T : Tn >= first && Tn <= last ? Tn : -1;
  };

  // ---- POLICE GAME (docs/POLICE_GAME.md): a BLOCKED TRACK. setBlock({ x, z, heading }) finds the shapes whose track
  // passes within 2.5 m of (x, z) in that direction (a car parked on the rails); a tram of such a shape whose front
  // reaches the block's line (5 m before it) stops there: its trip gathers a delay (the timetable time it is held), so
  // when the block is cleared it carries on from where it stood (late), no jump. setBlock(null) clears it. Trips keep
  // their delay (they run late, as after a real blockage). No block: nothing changes (one null test per trip).
  let block = null, lastClock = null;
  const setBlock = (b) => {
    for (const t of trips) { t._bd = null; t._be = null; t._held = false; }
    if (!b) { block = null; return []; }
    const hx = Math.sin(b.heading ?? 0), hz = Math.cos(b.heading ?? 0), out = new Map();
    for (const [id, s] of Object.entries(shapes)) {
      const P = s.pts, C = s.cum;
      let best = b.r ?? 2.5, bd = -1;
      for (let i = 1; i < P.length; i++) {
        const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L = Math.hypot(dx, dz) || 1e-9;
        if (b.heading != null && (dx * hx + dz * hz) / L < 0.6) continue;
        const u = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.z - az) * dz) / (L * L)));
        const e = Math.hypot(ax + dx * u - b.x, az + dz * u - b.z);
        if (e < best) { best = e; bd = C[i - 1] + u * L; }
      }
      if (bd >= 0) out.set(id, bd - (b.gap ?? 5));
    }
    block = out.size ? out : null;
    return [...out.entries()];
  };
  /** the nearest track point to (x, z) within maxD: { x, z, heading (forward = (sin, cos)), shape, d } or null */
  const trackNear = (x, z, maxD = 30) => {
    let best = null, bd = maxD;
    for (const [id, s] of Object.entries(shapes)) {
      const P = s.pts, C = s.cum;
      for (let i = 1; i < P.length; i++) {
        const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L = Math.hypot(dx, dz) || 1e-9;
        if (Math.abs(ax - x) > maxD + L || Math.abs(az - z) > maxD + L) continue;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
        const e = Math.hypot(ax + dx * u - x, az + dz * u - z);
        if (e < bd) { bd = e; best = { x: ax + dx * u, z: az + dz * u, heading: Math.atan2(dx, dz), shape: id, d: C[i - 1] + u * L, off: e }; }
      }
    }
    return best;
  };
  /** the point d metres along the shape: { x, z, heading } */
  const shapePoint = (id, d) => { const s = shapes[id]; if (!s) return null; const [x, z, h] = at(s, d); return { x, z, heading: Math.atan2(Math.cos(h), -Math.sin(h)) }; };
  const holdTrips = (T) => {
    const dt = lastClock == null ? 0 : Math.max(0, Math.min(5, T - lastClock));
    lastClock = T;
    if (!block) return;
    for (const t of trips) {
      const line = block.get(t.shape);
      if (line == null) { t._bd = null; t._held = false; continue; }
      const tt = tripTime(t, T);
      if (tt < 0) { t._held = false; continue; }
      const d = tripD(t, tt).d;
      // held: it was before the line and the timetable would take it past: the clock stops for this trip
      if (d > line && t._bd != null && t._bd <= line + 0.5) {
        if (old || t._be == null) t.delay = (t.delay || 0) + dt;
        else {
          // (exactly AT the line whatever the frame gap: the first held frame finds when its front reached the line, so
          // a 7 s gap does not leave it 100 m back up the street; then it stands there)
          if (!t._held) {
            let lo = t._be, hi = tt - (t.delay || 0);
            for (let k = 0; k < 24 && hi - lo > 0.01; k++) { const m = (lo + hi) / 2; if (tripState(t, m).d > line) hi = m; else lo = m; }
            t._be = lo; t._bd = tripState(t, lo).d;
          }
          t.delay = tt - t._be;
        }
        t._held = true;
      } else { t._bd = d; t._be = tt - (t.delay || 0); t._held = false; }
    }
  };
  /** the blocked track now: { on, held (trams standing at the line), lines: [[shape, line d]] } */
  const blockState = () => {
    let held = 0;
    if (block) for (const t of trips) if (t._held && block.has(t.shape)) held++;
    return { on: !!block, held, lines: block ? [...block.entries()] : [] };
  };
  /** clock seconds until the next tram of `shape` (not one held now) brings its front past distance `line`, from clock T,
   *  within maxT (else Infinity). A trip's d never goes back, so: the first time by bisection. */
  const etaTo = (shape, line, T, maxT = 300) => {
    let best = Infinity;
    for (const t of trips) {
      if (t.shape !== shape || t._held) continue;
      const st = t.stops, first = st[0][2], last = st[st.length - 1][1] + (old ? 0 : t.delay || 0);
      if (st[st.length - 1][0] <= line) continue;                    // (its run ends before the line)
      for (const b of [T, T + 86400]) {
        if (b + maxT < first || b > last) continue;
        if (tripD(t, b).d > line) continue;                          // already past it
        const hi0 = Math.min(b + Math.min(maxT, best), last);
        if (tripD(t, hi0).d <= line) continue;
        let lo = b, hi = hi0;
        for (let k = 0; k < 14 && hi - lo > 0.25; k++) { const m = (lo + hi) / 2; if (tripD(t, m).d > line) hi = m; else lo = m; }
        best = Math.min(best, hi - b);
      }
    }
    return best;
  };
  // the stops along each shape (from the trips that run it): { shape, id, name, d, x, z, end (the shape's last stop) }
  let spotList = null;
  const spots = () => {
    if (spotList) return spotList;
    const by = new Map();
    for (const t of trips) {
      const st = t.stops;
      for (let i = 0; i < st.length; i++) {
        const key = t.shape + "|" + st[i][3];
        const e = by.get(key) || { shape: t.shape, id: st[i][3], d: st[i][0], end: true };
        if (i < st.length - 1) e.end = false;
        by.set(key, e);
      }
    }
    spotList = [...by.values()].map((e) => {
      const s = doc?.stops?.[e.id], p = shapes[e.shape] ? at(shapes[e.shape], e.d) : [0, 0];
      return { ...e, name: s?.name || e.id, x: s?.x ?? p[0], z: s?.z ?? p[1] };
    });
    return spotList;
  };
  /** the running trams' fronts at clock T: [[shape, d], ...] (the dispatch never puts a car inside a tram) */
  const fronts = (T) => { const out = []; for (const t of trips) { const tt = tripTime(t, T); if (tt >= 0) out.push([t.shape, tripD(t, tt).d]); } return out; };
  return { travel, tripState, tripD, tripTime, setBlock, trackNear, shapePoint, holdTrips, blockState, etaTo, spots, fronts, get blocked() { return !!block; } };
}
