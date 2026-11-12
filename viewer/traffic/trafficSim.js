// THE MOVING TRAFFIC: cars on the road engine's real lane graph (viewer/traffic/trafficWorld.js), on the main thread
// in fixed 20 Hz steps (render interpolates), structure of arrays, no allocation per step or per frame.
//
//   following    IDM (Treiber's Intelligent Driver Model): desired speed (OSM maxspeed, Brussels 30 km/h default,
//                curvature limits braked for ahead), gap, approach speed, comfortable braking; per-driver spread
//   junctions    the car waits at the stop line of its approach (the engine's drawn line, else the junction mouth):
//                red / amber (the shared cycle of viewer/traffic/signals.js, the same the signal heads show), stop
//                signs (full stop, then give way), give way, and priorité de droite (Belgian default) via the
//                conflict table of trafficGraph.js: never enters while a conflicting car is inside, yields to the
//                ones with priority that will arrive soon, and never enters when its exit has no room (no blocking).
//                A courtesy rule breaks four-way standoffs (the longest waiter goes).
//   obstacles    the player's car, the third-person walker and the trams (bodies + their track just ahead at
//                crossings) projected onto the lanes as virtual leaders: cars brake for them
//   parking      now and then a parked car (viewer/carFleet.js) pulls out (indicator, waits for a gap, an S-curve
//                into the lane), and a driving car reverses into a free slot (stops past it, reverses in, parks:
//                handed back to the parked fleet, same pose, type and paint: no pop)
//   population   a target per road class and hour (the city clock), spawned and removed only where the camera cannot
//                see (outside the frustum, or beyond the fleet's 420 m fade): never popping in sight
//   pose         rear and front axle points on the route (smooth heading through curves, the rear cuts in like a real
//                car), height + pitch from the ground under the axles, front-wheel steer from the path ahead
import { signalClock, signalState, untilGreen, RED, AMBER } from "./signals.js";
import { CTRL } from "./trafficGraph.js";

export const STEP = 1 / 20;
const IDM = { a: 1.5, b: 2.2, T: 1.25, s0: 2.2 };
const HOLD = { none: 0, signal: 1, stop: 2, yield: 3, busy: 4, full: 5, park: 6 };
const ST = { drive: 0, outWait: 1, out: 2, inStop: 3, inRev: 4 };
const ROUTE = 4;                 // planned paths ahead
const MAN = 16;                  // maneuver polyline points
const OBS_MAX = 160, OBS_ENTRIES = 1024;
// density (cars per km of lane at the busiest hour) per road class rank (0 alley .. 4 boulevard)
export const DENSITY = [1.5, 10, 18, 24, 26, 26];
/** share of the peak density at hour h (0..24), Brussels weekday shape */
export function hourFactor(h) {
  const P = [[0, 0.1], [5, 0.06], [6.5, 0.35], [8, 1], [9.5, 0.7], [12, 0.6], [16, 0.75], [17.5, 1], [19, 0.7], [21, 0.4], [23, 0.18], [24, 0.1]];
  h = ((h % 24) + 24) % 24;
  for (let k = 1; k < P.length; k++) if (h <= P[k][0]) { const [a, va] = P[k - 1], [b, vb] = P[k]; return va + (vb - va) * (h - a) / (b - a); }
  return 0.1;
}

export class TrafficSim {
  /**
   * world: TrafficWorld; opts: { cap, types: [{ name, len, wb, wheelR, w, h, weight }], paints: [[r,g,b]], ground(x, z) -> y,
   *   seed }
   */
  constructor(world, { cap = 768, types, paints, ground, seed = 1 } = {}) {
    this.W = world; this.cap = cap; this.types = types; this.paints = paints; this.ground = ground;
    this.rs = seed >>> 0 || 1;
    const F = (n = 1) => new Float32Array(cap * n), I = (n = 1, v = 0) => new Int32Array(cap * n).fill(v), U = (n = 1) => new Uint8Array(cap * n);
    Object.assign(this, {
      alive: U(), path: I(1, -1), prev: I(1, -1), d: new Float64Array(cap), v: F(), acc: F(), route: I(ROUTE, -1),
      type: U(), half: F(), wb: F(), wr: F(), paint: F(3), aMax: F(), Tg: F(), v0f: F(),
      state: U(), hold: U(), holdT: F(), stopDone: I(1, -1), committed: I(1, -1), waitT: F(), bits: U(),
      nxt: I(1, -1),                                 // next car on the same path (ascending d)
      x: F(), z: F(), y: F(), yaw: F(), pitch: F(), px: F(), pz: F(), py: F(), pyaw: F(), ppitch: F(),
      spin: F(), pspin: F(), steer: F(), offX: F(), offZ: F(), age: F(), seen: U(),
      manPts: F(MAN * 2), manCum: F(MAN), manLen: F(), manT: F(), manDir: new Int8Array(cap), slot: new Array(cap).fill(null),
      onPath: I(1, -1), onD: new Float64Array(cap),
      gen: new Uint32Array(cap), handoff: U(), parkPath: I(1, -1),         // pop checks: a spawn counter per slot; 1 = came from / went to a parked car
      gap: F(), lead: U(),                            // debug: the gap IDM used and what it was to (1 car, 2 obstacle, 3 hold)   // where a maneuvering car sits on its lane (for followers)
    });
    this.free = []; this.freeLater = [];
    for (let i = cap - 1; i >= 0; i--) this.free.push(i);
    this.count = 0;
    // obstacles: points with a radius and a velocity; entries = obstacle projected on a path
    this.obs = { n: 0, x: new Float32Array(OBS_MAX), z: new Float32Array(OBS_MAX), r: new Float32Array(OBS_MAX), vx: new Float32Array(OBS_MAX),
      vz: new Float32Array(OBS_MAX), cross: new Uint8Array(OBS_MAX) };
    this.oe = { n: 0, d: new Float32Array(OBS_ENTRIES), r: new Float32Array(OBS_ENTRIES), v: new Float32Array(OBS_ENTRIES), nxt: new Int32Array(OBS_ENTRIES) };
    this.tmp = new Float64Array(4); this.tmp2 = new Float64Array(4); this.tmp3 = new Float64Array(4);
    this.t = 0; this.acc_ = 0; this.steps = 0;
    this.params = { density: 1, speed: 1, hour: 9, radius: 470, minSpawnDist: 45, parkRate: 1, signals: true, maxCars: cap };
    this.stats = { cars: 0, target: 0, spawned: 0, removed: 0, stepMs: 0, stepMsMax: 0, holds: [0, 0, 0, 0, 0, 0, 0], pullOuts: 0, parkIns: 0, handovers: 0, laneKm: 0 };
    this.freeSlots = [];         // parking slots vacated by pull-outs (viewer/carFleet.js car objects)
    this._projCtx = { k: 0 };
    this._proj = (gid, along, lat, tx, tz) => this.addObsEntry(gid, along, lat, tx, tz);
    this.typeWeights = types.map((t) => t.weight);
  }

  rand() { let x = this.rs; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.rs = x >>> 0; return this.rs / 4294967296; }

  // ------------------------------------------------------------------ graph access (gid = slot << 16 | index)
  G(gid) { return this.W.slots[gid >>> 16]; }
  plen(gid) { return this.W.slots[gid >>> 16].len[gid & 0xffff]; }
  pickNext(gid) {
    const g = this.W.slots[gid >>> 16];
    if (!g) return -1;
    const i = gid & 0xffff, a = g.nextOff[i], b = g.nextOff[i + 1];
    if (a === b) return -1;
    let tot = 0;
    for (let k = a; k < b; k++) tot += this.nextWeight(g, g.nextIdx[k]);
    let r = this.rand() * tot, j = g.nextIdx[a];
    for (let k = a; k < b; k++) { const w = this.nextWeight(g, g.nextIdx[k]); if (r < w) { j = g.nextIdx[k]; break; } r -= w; }
    const gj = (g.slot << 16) | j;
    return g.core[j] || g.twin[j] < 0 ? gj : g.twin[j];
  }
  nextWeight(g, j) {
    let w = 1;
    if (g.kind[j]) { const t = g.turn[j]; w = t === 0 ? 3 : t === 3 ? 0.02 : 1; }
    // into an alley / driveway (rank 0): rarely
    const a = g.nextOff[j];
    const rk = g.kind[j] && a < g.nextOff[j + 1] ? g.rank[g.nextIdx[a]] : g.rank[j];
    if (rk === 0) w *= 0.12;
    return w;
  }
  fillRoute(i) {
    const R = this.route, o = i * ROUTE;
    let last = this.path[i];
    for (let k = 0; k < ROUTE; k++) {
      if (R[o + k] < 0) R[o + k] = last >= 0 ? this.pickNext(last) : -1;
      last = R[o + k];
      if (last < 0) { for (let m = k + 1; m < ROUTE; m++) R[o + m] = -1; break; }
    }
  }
  shiftRoute(i) {
    const R = this.route, o = i * ROUTE;
    for (let k = 0; k < ROUTE - 1; k++) R[o + k] = R[o + k + 1];
    R[o + ROUTE - 1] = -1;
    this.fillRoute(i);
  }

  // ------------------------------------------------------------------ cars
  /** A new car on path gid at d (no checks). Returns its index or -1. */
  spawnAt(gid, d, v, typeIdx = -1, paintRGB = null) {
    if (!this.free.length) return -1;
    const i = this.free.pop();
    if (typeIdx < 0) { let r = this.rand() * this.typeWeights.reduce((a, b) => a + b, 0); typeIdx = 0; for (let k = 0; k < this.types.length; k++) { if (r < this.typeWeights[k]) { typeIdx = k; break; } r -= this.typeWeights[k]; } }
    const T = this.types[typeIdx];
    this.alive[i] = 1; this.path[i] = gid; this.prev[i] = -1; this.d[i] = d; this.v[i] = v; this.acc[i] = 0;
    for (let k = 0; k < ROUTE; k++) this.route[i * ROUTE + k] = -1;
    this.fillRoute(i);
    this.type[i] = typeIdx; this.half[i] = T.len / 2; this.wb[i] = T.wb; this.wr[i] = T.wheelR;
    const p = paintRGB || this.paints[Math.floor(this.rand() * this.paints.length)];
    this.paint[i * 3] = p[0]; this.paint[i * 3 + 1] = p[1]; this.paint[i * 3 + 2] = p[2];
    this.aMax[i] = IDM.a * (0.8 + this.rand() * 0.4); this.Tg[i] = IDM.T * (0.8 + this.rand() * 0.5); this.v0f[i] = 0.9 + this.rand() * 0.18;
    this.state[i] = ST.drive; this.hold[i] = 0; this.holdT[i] = 0; this.stopDone[i] = -1; this.committed[i] = -1; this.waitT[i] = 0; this.bits[i] = 0;
    this.spin[i] = this.rand() * 6.28; this.steer[i] = 0; this.offX[i] = 0; this.offZ[i] = 0; this.age[i] = 0; this.seen[i] = 0;
    this.slot[i] = null; this.onPath[i] = -1; this.gen[i]++; this.handoff[i] = 0;
    this.pose(i); this.copyPrev(i);
    this.count++;
    return i;
  }
  kill(i) {
    if (!this.alive[i]) return;
    // not reusable until the next step: it is still linked in this step's per-path lists (a reuse now could close a loop)
    this.alive[i] = 0; this.path[i] = -1; this.count--; this.freeLater.push(i); this.slot[i] = null;
  }
  copyPrev(i) { this.px[i] = this.x[i]; this.pz[i] = this.z[i]; this.py[i] = this.y[i]; this.pyaw[i] = this.yaw[i]; this.ppitch[i] = this.pitch[i]; this.pspin[i] = this.spin[i]; }

  /** Point at s metres along car i's route from the start of its current path (s < 0: on the previous path). */
  routePoint(i, s, out) {
    let gid = this.path[i];
    if (s < 0) {
      const pv = this.prev[i];
      if (pv >= 0 && this.W.slots[pv >>> 16]) return this.W.point(pv, this.plen(pv) + s, out);
      this.W.point(gid, 0, out); out[0] += out[2] * s; out[1] += out[3] * s; return out;
    }
    let k = 0;
    while (s > this.plen(gid)) {
      const nx = this.route[i * ROUTE + k];
      if (nx < 0 || k >= ROUTE - 1) {                 // past the end of the known route: straight on
        this.W.point(gid, this.plen(gid), out); const over = s - this.plen(gid); out[0] += out[2] * over; out[1] += out[3] * over; return out;
      }
      s -= this.plen(gid); gid = nx; k++;
    }
    return this.W.point(gid, s, out);
  }
  /** Point on car i's maneuver polyline at m metres. */
  manPoint(i, m, out) {
    const P = this.manPts, C = this.manCum, o = i * MAN;
    const L = this.manLen[i];
    let over = 0;                                    // beyond either end: straight on along the end tangent
    if (m < 0) { over = m; m = 0; } else if (m > L) { over = m - L; m = L; }
    let k = 1;
    while (k < MAN - 1 && C[o + k] < m) k++;
    const s = C[o + k] - C[o + k - 1], f = s > 1e-9 ? (m - C[o + k - 1]) / s : 0;
    const ax = P[(o + k - 1) * 2], az = P[(o + k - 1) * 2 + 1], bx = P[(o + k) * 2], bz = P[(o + k) * 2 + 1];
    const tl = Math.hypot(bx - ax, bz - az) || 1;
    out[2] = (bx - ax) / tl; out[3] = (bz - az) / tl;
    out[0] = ax + (bx - ax) * f + out[2] * over; out[1] = az + (bz - az) * f + out[3] * over;
    return out;
  }
  /** Car i's pose from its route (or maneuver): axles, heading, height, pitch, steer. */
  pose(i) {
    const hw = this.wb[i] / 2, F = this.tmp, R = this.tmp2, A = this.tmp3;
    const st = this.state[i];
    if (st === ST.out || st === ST.inRev) {
      const m = this.manT[i], dir = this.manDir[i];       // dir +1: drives along the polyline nose first; -1: reverses (rear first)
      this.manPoint(i, m + hw * dir, F); this.manPoint(i, m - hw * dir, R);
      this.manPoint(i, m + (hw + 1) * dir, A);
    } else if (st === ST.outWait) {
      this.manPoint(i, hw, F); this.manPoint(i, -hw, R); this.manPoint(i, hw + 1, A);
    } else {
      const d = this.d[i];
      this.routePoint(i, d + hw, F); this.routePoint(i, d - hw, R); this.routePoint(i, d + hw + 1.2, A);
    }
    const fx = F[0] - R[0], fz = F[1] - R[1];
    const yaw = Math.atan2(fx, fz);
    const x = (F[0] + R[0]) / 2 + this.offX[i], z = (F[1] + R[1]) / 2 + this.offZ[i];
    const yf = this.ground(F[0], F[1]), yr = this.ground(R[0], R[1]);
    this.x[i] = x; this.z[i] = z; this.y[i] = (yf + yr) / 2;
    this.pitch[i] = Math.atan2(yf - yr, 2 * hw);
    // steer: the front path's direction against the body
    let sa = Math.atan2(A[0] - F[0], A[1] - F[1]) - yaw;
    sa = Math.atan2(Math.sin(sa), Math.cos(sa));
    sa = Math.max(-0.6, Math.min(0.6, sa));
    this.steer[i] += (sa - this.steer[i]) * 0.5;
    this.yaw[i] = yaw;
  }

  // ------------------------------------------------------------------ per-step lists
  buildLists() {
    for (const g of this.W.slots) if (g) { g.head.fill(-1); g.ohead.fill(-1); }
    const { alive, d, nxt } = this;
    for (let i = 0; i < this.cap; i++) {
      nxt[i] = -1;
      if (!alive[i]) continue;
      let gid = this.path[i], di = d[i];
      const st = this.state[i];
      if (st !== ST.drive && st !== ST.inStop) { gid = this.onPath[i]; di = this.onD[i]; if (gid < 0) continue; }
      const g = this.W.slots[gid >>> 16];
      if (!g) continue;
      const pi = gid & 0xffff;
      let h = g.head[pi];
      if (h < 0 || this.posOn(h) >= di) { nxt[i] = h; g.head[pi] = i; continue; }
      while (nxt[h] >= 0 && this.posOn(nxt[h]) < di) h = nxt[h];
      nxt[i] = nxt[h]; nxt[h] = i;
    }
  }
  posOn(i) { const s = this.state[i]; return s === ST.drive || s === ST.inStop ? this.d[i] : this.onD[i]; }
  pathOf(i) { const s = this.state[i]; return s === ST.drive || s === ST.inStop ? this.path[i] : this.onPath[i]; }

  // ------------------------------------------------------------------ obstacles
  /** Obstacles for this step: setObstacles(n) then obstacle(k, x, z, r, vx, vz, crossOnly). */
  clearObstacles() { this.obs.n = 0; }
  addObstacle(x, z, r, vx = 0, vz = 0, crossOnly = 0) {
    const O = this.obs;
    if (O.n >= OBS_MAX) return;
    const k = O.n++;
    O.x[k] = x; O.z[k] = z; O.r[k] = r; O.vx[k] = vx; O.vz[k] = vz; O.cross[k] = crossOnly;
  }
  addObsEntry(gid, along, lat, tx, tz) {
    const O = this.obs, k = this._projCtx.k, E = this.oe;
    if (lat > O.r[k] + 1.15 || E.n >= OBS_ENTRIES) return;
    // tram look-ahead points: only lanes that CROSS the track (not the tram's own lane, cars in front would stop)
    const vl = Math.hypot(O.vx[k], O.vz[k]);
    if (O.cross[k] && vl > 0.1 && Math.abs((O.vx[k] * tx + O.vz[k] * tz) / vl) > 0.85) return;
    const g = this.W.slots[gid >>> 16], pi = gid & 0xffff;
    const e = E.n++;
    E.d[e] = along; E.r[e] = O.r[k]; E.v[e] = O.vx[k] * tx + O.vz[k] * tz; E.nxt[e] = g.ohead[pi]; g.ohead[pi] = e;
  }
  projectObstacles() {
    this.oe.n = 0;
    const O = this.obs;
    for (let k = 0; k < O.n; k++) { this._projCtx.k = k; this.W.project(O.x[k], O.z[k], O.r[k] + 1.15, this._proj); }
  }
  /** Nearest obstacle on path gid ahead of position `from`: gap from `from` to its near edge, into out[0] (gap), out[1] (v). */
  obsAhead(gid, from, out) {
    const g = this.W.slots[gid >>> 16], E = this.oe;
    let e = g.ohead[gid & 0xffff], best = Infinity, bv = 0;
    while (e >= 0) {
      const edge = E.d[e] - E.r[e];
      if (E.d[e] + E.r[e] > from && edge - from < best) { best = Math.max(0, edge - from); bv = Math.max(0, E.v[e]); }
      e = E.nxt[e];
    }
    out[0] = best; out[1] = bv;
    return best;
  }

  // ------------------------------------------------------------------ junction decisions
  /** Should car i wait at the hold point of lane `L` (gid) before connector `C` (gid, may be -1)? -> HOLD.* */
  decide(i, L, C, X, dStop) {
    const g = this.W.slots[L >>> 16], li = L & 0xffff, c = g.ctrl[li], v = this.v[i];
    if (c === CTRL.signal && this.params.signals) {
      const s = signalState(g.phase[li], this.t);
      if (s === RED) return dStop > -0.3 ? HOLD.signal : 0;
      if (s === AMBER && dStop > (v * v) / (2 * 3.2) + 0.8) return HOLD.signal;
    } else if (c === CTRL.stop && this.stopDone[i] !== L) {
      if (v < 0.25 && dStop < 2.2) { this.waitT[i] += STEP; if (this.waitT[i] > 1.3) { this.stopDone[i] = L; this.waitT[i] = 0; } }
      if (this.stopDone[i] !== L) return HOLD.stop;
    }
    if (C < 0) return 0;
    const gc = this.W.slots[C >>> 16];
    if (!gc) return 0;
    const ci = C & 0xffff;
    if (gc.kind[ci]) {
      const courtesy = this.holdT[i] > 3.5 + (i % 5) * 0.8;
      for (let k = gc.cfOff[ci]; k < gc.cfOff[ci + 1]; k++) {
        const O = (gc.slot << 16) | gc.cfOther[k], atO = gc.cfOtherAt[k], yl = gc.cfYield[k];
        // (a) somebody on the other connector who has not cleared the conflict point: never go
        for (let j = gc.head[gc.cfOther[k]]; j >= 0; j = this.nxt[j]) if (this.posOn(j) - this.half[j] < atO + 1.2) return HOLD.busy;
        if (yl !== 1 || courtesy) continue;
        // (b) the ones with priority that will be there soon: cars on the other connector's entry lane heading for it
        const E = gc.prevOff[gc.cfOther[k]] < gc.prevOff[gc.cfOther[k] + 1] ? gc.prevIdx[gc.prevOff[gc.cfOther[k]]] : -1;
        if (E < 0) continue;
        if (this.comingTo((gc.slot << 16) | E, O)) return HOLD.yield;
        const tw = gc.twin[E];
        if (tw >= 0 && this.comingTo(tw, O)) return HOLD.yield;
      }
    }
    // (c) no room after the junction: wait at the line instead of blocking it
    if (X >= 0 && gc.kind[ci] && this.W.slots[X >>> 16]) {
      const gx = this.W.slots[X >>> 16];
      const j = gx.head[X & 0xffff];
      if (j >= 0 && j !== i && this.posOn(j) - this.half[j] < this.half[i] * 2 + 3 && this.v[j] < 2.5) return HOLD.full;
    }
    return 0;
  }
  /** Is a car on lane E (gid) about to drive into connector O within ~4.5 s (and not itself waiting at a light / sign)? */
  comingTo(E, O) {
    const g = this.W.slots[E >>> 16];
    if (!g) return false;
    const L = g.len[E & 0xffff];
    for (let j = g.head[E & 0xffff]; j >= 0; j = this.nxt[j]) {
      if (this.state[j] !== ST.drive || this.route[j * ROUTE] !== O) continue;
      const h = this.hold[j];
      if (h === HOLD.signal || h === HOLD.stop || h === HOLD.full) continue;
      const D = L - this.d[j] - this.half[j];
      if (D < 45 && D / Math.max(this.v[j], 0.6) < 4.5) return true;
    }
    return false;
  }

  /** v0 capped by the curvature limits (graph pv) of path pi from `from` to `to` m along it, braking 1.4 m/s2 over
   *  the distance (`base` = how far its start is ahead of the car's nose). */
  curveLimit(g, pi, from, base, to, v0) {
    const a = g.off[pi], b = g.off[pi + 1], cum = g.cum, pv = g.pv;
    let lo = a, hi = b - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= from) lo = m; else hi = m; }
    for (let k = lo; k < b && cum[k] <= to; k++) {
      const ahead = Math.max(0, base + cum[k] - from), vp = pv[k] * this.params.speed;
      const allowed = Math.sqrt(vp * vp + 2 * 1.4 * ahead);
      if (allowed < v0) v0 = allowed;
    }
    return v0;
  }

  // ------------------------------------------------------------------ the step
  accel(i) {
    const W = this.W, R = this.route, o = i * ROUTE, half = this.half[i];
    const p = this.path[i], d = this.d[i], v = this.v[i];
    const g = W.slots[p >>> 16], pi = p & 0xffff;
    let v0 = g.speed[pi] * this.v0f[i] * this.params.speed;
    let gap = Infinity, vL = 0, lead = 0;
    const tmp = this.tmp;
    // the car ahead on this path, an obstacle on it
    const j = this.nxt[i];
    if (j >= 0) { gap = this.posOn(j) - d - this.half[j] - half; vL = this.v[j]; lead = 1; }
    if (this.obsAhead(p, d + half, tmp) < gap) { gap = tmp[0]; vL = tmp[1]; lead = 2; }
    // along the route: speed limits ahead (braked for), the last car / obstacle on each next path
    v0 = this.curveLimit(g, pi, d + half, 0, d + half + 45, v0);
    let dist = g.len[pi] - d;                  // car centre -> end of this path
    let hold = 0;
    // hold point on this path
    if (g.holdAt[pi] >= 0 && this.committed[i] !== p) {
      const dStop = g.holdAt[pi] - (d + half);
      if (dStop > -0.6) {
        hold = this.decide(i, p, R[o], R[o + 1], dStop);
        if (!hold && dStop < (v * v) / (2 * 3.5) + 1) this.committed[i] = p;     // decided and close: go
        if (hold && dStop < gap) { gap = Math.max(0.05, dStop); vL = 0; lead = 3; }
      }
    }
    for (let k = 0; k < ROUTE && dist < 90; k++) {
      const q = R[o + k];
      if (q < 0) {                              // dead end of the known graph: stop at its end
        const ds = dist - half - 1;
        if (ds < gap) { gap = Math.max(0.05, ds); vL = 0; lead = 3; }
        break;
      }
      const gq = W.slots[q >>> 16], qi = q & 0xffff;
      if (!gq) break;
      const vq = gq.speed[qi] * this.params.speed, room = Math.max(0, dist - half);
      const allowed = Math.sqrt(vq * vq + 2 * 1.4 * room);
      if (allowed < v0) v0 = allowed;
      if (!gq.kind[qi] && room < 45) v0 = this.curveLimit(gq, qi, 0, room, 45 - room, v0);
      if (gap === Infinity) {
        const h = gq.head[qi];
        if (h >= 0 && h !== i) { gap = dist + this.posOn(h) - this.half[h] - half; vL = this.v[h]; lead = 1; }
      }
      if (gap === Infinity || dist < gap) {
        if (this.obsAhead(q, 0, tmp) < Infinity && dist + tmp[0] - half < gap) { gap = dist + tmp[0] - half; vL = tmp[1]; lead = 2; }
      }
      // the hold point on the next lane (a junction ahead of this lane piece)
      if (!hold && gq.holdAt[qi] >= 0 && !gq.kind[qi] && this.committed[i] !== q && dist + gq.holdAt[qi] - half < 70) {
        const dStop = dist + gq.holdAt[qi] - half;
        hold = this.decide(i, q, k + 1 < ROUTE ? R[o + k + 1] : -1, k + 2 < ROUTE ? R[o + k + 2] : -1, dStop);
        if (hold && dStop < gap) { gap = Math.max(0.05, dStop); vL = 0; lead = 3; }
      }
      dist += gq.len[qi];
    }
    this.hold[i] = hold; this.gap[i] = gap; this.lead[i] = gap < Infinity ? lead : 0;
    if (hold && v < 0.15) this.holdT[i] += STEP; else if (!hold) this.holdT[i] = 0;
    // IDM
    const a = this.aMax[i], b = IDM.b;
    v0 = Math.max(0.1, v0);
    let acc = a * (1 - Math.pow(v / v0, 4));
    if (gap < Infinity) {
      const sStar = IDM.s0 + Math.max(0, v * this.Tg[i] + (v * (v - vL)) / (2 * Math.sqrt(a * b)));
      // a stop line is not a car: stop ~0.8 m before it, not s0 (2.2 m) before it
      const gg = Math.max(0.1, gap - 0.3 + (this.lead[i] === 3 ? IDM.s0 - 0.8 : 0));
      acc -= a * (sStar / gg) * (sStar / gg);
    }
    this.acc[i] = Math.max(-8, acc);
  }

  /** Advance one fixed step. ctx: { visible(x, y, z, r) -> bool, fx, fz (the focus: player / camera) } */
  step(ctx) {
    const t0 = performance.now();
    this.t = signalClock.now();
    while (this.freeLater.length) this.free.push(this.freeLater.pop());
    this.buildLists();
    this.projectObstacles();
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      this.copyPrev(i);
      const st = this.state[i];
      if (st === ST.drive || st === ST.inStop) this.accel(i);
    }
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      const st = this.state[i];
      if (st === ST.drive || st === ST.inStop) this.move(i);
      else this.maneuver(i, ctx);
      if (!this.alive[i]) continue;
      // handover blend: the offset left by a tile-border twin decays
      if (this.offX[i] || this.offZ[i]) { this.offX[i] *= 0.9; this.offZ[i] *= 0.9; if (Math.abs(this.offX[i]) + Math.abs(this.offZ[i]) < 0.005) this.offX[i] = this.offZ[i] = 0; }
      this.pose(i);
      this.lights(i);
      this.age[i] += STEP;
    }
    if (this.steps % 10 === 0) this.populate(ctx);
    if (this.steps % 20 === 5) this.parking(ctx);
    this.steps++;
    const ms = performance.now() - t0;
    this.stats.stepMs = this.stats.stepMs * 0.95 + ms * 0.05;
    this.stats.stepMsMax = Math.max(this.stats.stepMsMax * 0.995, ms);
    this.stats.cars = this.count;
  }

  move(i) {
    const v = this.v[i], a = this.acc[i];
    let nv = v + a * STEP;
    if (nv < 0) nv = 0;
    const ds = (v + nv) * 0.5 * STEP;
    this.v[i] = nv;
    this.d[i] += ds;
    this.spin[i] += ds / this.wr[i];
    if (this.spin[i] > 6283.18) { this.spin[i] -= 6283.18; this.pspin[i] -= 6283.18; }
    let guard = 0;
    while (this.d[i] > this.plen(this.path[i]) && guard++ < 6) {
      const nx = this.route[i * ROUTE];
      if (nx < 0 || !this.W.slots[nx >>> 16]) { this.d[i] = this.plen(this.path[i]); this.v[i] = 0; break; }
      this.d[i] -= this.plen(this.path[i]);
      // tile handover: the twin's start may sit a little off the end of this path; carry the difference as an offset
      const T = this.tmp, T2 = this.tmp2;
      if (nx >>> 16 !== this.path[i] >>> 16) {
        this.W.point(this.path[i], this.plen(this.path[i]), T); this.W.point(nx, 0, T2);
        const ex = T[0] - T2[0], ez = T[1] - T2[1];
        if (ex * ex + ez * ez < 16) { this.offX[i] += ex; this.offZ[i] += ez; }
        this.stats.handovers++;
      }
      this.prev[i] = this.path[i]; this.path[i] = nx;
      this.shiftRoute(i);
      if (this.committed[i] !== this.prev[i]) this.committed[i] = -1;
    }
  }

  lights(i) {
    let b = 0;
    const st = this.state[i];
    if (this.acc[i] < -0.7 || (this.v[i] < 0.3 && st !== ST.out)) b |= 1;
    if (st === ST.drive || st === ST.inStop) {
      // indicator: the next turn within ~35 m
      let dist = this.plen(this.path[i]) - this.d[i];
      const o = i * ROUTE;
      for (let k = 0; k < 2 && dist < 35; k++) {
        const q = this.route[o + k];
        if (q < 0) break;
        const g = this.W.slots[q >>> 16];
        if (!g) break;
        if (g.kind[q & 0xffff]) { const t = g.turn[q & 0xffff]; if (t === 1) b |= 4; else if (t === 2) b |= 8; break; }
        dist += g.len[q & 0xffff];
      }
      if (st === ST.inStop) b |= 8;
      // on a connector: keep the indicator while turning
      const g = this.W.slots[this.path[i] >>> 16], pi = this.path[i] & 0xffff;
      if (g.kind[pi]) { const t = g.turn[pi]; if (t === 1) b |= 4; else if (t === 2) b |= 8; }
    } else if (st === ST.outWait || st === ST.out) b |= 4;
    else if (st === ST.inRev) b |= 16 | 8;
    this.bits[i] = b;
  }

  // ------------------------------------------------------------------ population
  populate(ctx) {
    const P = this.params, R = P.radius, fx = ctx.fx, fz = ctx.fz;
    // target: lane length within R per class x density x hour factor
    let want = 0, km = 0;
    const tiles = this.W.slots;
    for (const g of tiles) {
      if (!g) continue;
      const b = g.bounds;
      if (fx < b.x0 - R || fx > b.x1 + R || fz < b.z0 - R || fz > b.z1 + R) continue;
      if (!g.mid) this.prepTile(g);
      for (let i = 0; i < g.paths; i++) {
        if (g.kind[i] || !g.core[i]) continue;
        const dx = g.mid[i * 2] - fx, dz = g.mid[i * 2 + 1] - fz;
        if (dx * dx + dz * dz > R * R) continue;
        want += g.len[i] * DENSITY[Math.min(5, g.rank[i])] / 1000;
        km += g.len[i] / 1000;
      }
    }
    want = Math.min(P.maxCars, this.cap - 8, Math.round(want * hourFactor(P.hour) * P.density));
    this.stats.target = want; this.stats.laneKm = +km.toFixed(1);
    // remove: out of range, or stuck for a minute, or too many - only where nobody can see them
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i] || this.state[i] !== ST.drive) continue;
      const dx = this.x[i] - fx, dz = this.z[i] - fz, d2 = dx * dx + dz * dz;
      const vis = ctx.visible(this.x[i], this.y[i], this.z[i], 3.5);
      this.seen[i] = vis ? 1 : 0;
      const stuck = this.holdT[i] > 60 || (this.v[i] < 0.01 && this.route[i * ROUTE] < 0);
      if (!vis && (d2 > (R + 25) * (R + 25) || stuck || (this.count > want + 6 && d2 > 60 * 60 && this.rand() < 0.2))) { this.kill(i); this.stats.removed++; }
    }
    // spawn: a few per call, on lanes weighted by length x class density, where nobody can see
    let tries = 0, made = 0;
    while (this.count < want && tries < 24 && made < 6) {
      tries++;
      const g = this.pickTile(fx, fz, R);
      if (!g) break;
      const i = this.pickLane(g);
      if (i < 0) continue;
      const d = 4 + this.rand() * Math.max(0, g.len[i] - 8);
      const gid = (g.slot << 16) | i;
      this.W.point(gid, d, this.tmp);
      const x = this.tmp[0], z = this.tmp[1], dx = x - fx, dz = z - fz, d2 = dx * dx + dz * dz;
      if (d2 > R * R) continue;
      const y = this.ground(x, z);
      if (ctx.visible(x, y, z, 4)) continue;
      if (d2 < P.minSpawnDist * P.minSpawnDist) continue;
      // room: nobody within 14 m on this path, not right before its hold point
      let ok = true;
      for (let j = g.head[i]; j >= 0; j = this.nxt[j]) if (Math.abs(this.posOn(j) - d) < 14) { ok = false; break; }
      if (ok) for (let j = 0; j < this.cap; j++) if (this.alive[j] && (this.x[j] - x) ** 2 + (this.z[j] - z) ** 2 < 100) { ok = false; break; }
      if (!ok || (g.holdAt[i] >= 0 && Math.abs(g.holdAt[i] - d) < 10)) continue;
      const k = this.spawnAt(gid, d, g.speed[i] * 0.6);
      if (k >= 0) { this.insertInList(k); made++; this.stats.spawned++; }
    }
  }
  insertInList(i) {   // a car spawned mid-step joins its path's list
    const gid = this.pathOf(i), g = this.W.slots[gid >>> 16], pi = gid & 0xffff, di = this.posOn(i);
    let h = g.head[pi];
    if (h < 0 || this.posOn(h) >= di) { this.nxt[i] = h; g.head[pi] = i; return; }
    while (this.nxt[h] >= 0 && this.posOn(this.nxt[h]) < di) h = this.nxt[h];
    this.nxt[i] = this.nxt[h]; this.nxt[h] = i;
  }
  prepTile(g) {
    g.mid = new Float32Array(g.paths * 2);
    g.wsum = new Float64Array(g.paths);
    let s = 0;
    for (let i = 0; i < g.paths; i++) {
      const m = this.W.midOf(g, i);
      g.mid[i * 2] = m[0]; g.mid[i * 2 + 1] = m[1];
      if (!g.kind[i] && g.core[i] && g.len[i] > 12) s += g.len[i] * DENSITY[Math.min(5, g.rank[i])];
      g.wsum[i] = s;
    }
  }
  pickTile(fx, fz, R) {
    let n = 0, pick = null;
    for (const g of this.W.slots) {
      if (!g) continue;
      const b = g.bounds;
      if (fx < b.x0 - R || fx > b.x1 + R || fz < b.z0 - R || fz > b.z1 + R) continue;
      if (!g.mid) this.prepTile(g);
      n++;
      if (this.rand() * n < 1) pick = g;     // reservoir: uniform over the tiles in range
    }
    return pick;
  }
  pickLane(g) {
    const tot = g.wsum[g.paths - 1];
    if (!(tot > 0)) return -1;
    const r = this.rand() * tot;
    let lo = 0, hi = g.paths - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (g.wsum[m] < r) lo = m + 1; else hi = m; }
    return !g.kind[lo] && g.core[lo] ? lo : -1;
  }

  // ------------------------------------------------------------------ parking (pull out / reverse in)
  /** parked: () -> iterable of carFleet car objects { x, y, z, heading, type, col, room, hidden }; typeIndex(name) */
  setParking(parked, typeIndex) { this.parked = parked; this.typeIndex = typeIndex; }
  parking(ctx) {
    if (!this.parked || this.params.parkRate <= 0) return;
    // pull out: one candidate now and then, in view preferably (that is the point), 25-150 m away
    if (this.rand() < 0.35 * this.params.parkRate) {
      let best = null, bs = -1;
      for (const c of this.parked()) {
        if (c.hidden || c.busy) continue;
        const dx = c.x - ctx.fx, dz = c.z - ctx.fz, d2 = dx * dx + dz * dz;
        if (d2 < 20 * 20 || d2 > 150 * 150) continue;
        const s = this.rand() + (ctx.visible(c.x, c.y, c.z, 3) ? 1 : 0);
        if (s > bs) { bs = s; best = c; }
      }
      if (best) this.pullOut(best);
    }
    // reverse in: a driving car near a free slot
    if (this.freeSlots.length && this.rand() < 0.5 * this.params.parkRate) {
      const k = Math.floor(this.rand() * this.freeSlots.length), slot = this.freeSlots[k];
      if (slot.hidden !== true) { this.freeSlots.splice(k, 1); return; }    // taken back by its owner (tile reloaded)
      const lane = this.laneAt(slot.x, slot.z, Math.sin(slot.heading), Math.cos(slot.heading));
      if (!lane) return;
      const { gid, along } = lane, g = this.W.slots[gid >>> 16];
      // a driving car 25-80 m before the slot, on its lane or on a lane leading into it (heading for it), its type fits
      if (along + 9 > g.len[gid & 0xffff]) return;
      const pi = gid & 0xffff;
      for (let e = -1; e < g.prevOff[pi + 1] - g.prevOff[pi]; e++) {
        const lane2 = e < 0 ? pi : g.prevIdx[g.prevOff[pi] + e], base = e < 0 ? 0 : g.len[lane2];
        for (let j = g.head[lane2]; j >= 0; j = this.nxt[j]) {
          if (this.state[j] !== ST.drive || this.hold[j]) continue;
          if (e >= 0 && this.route[j * ROUTE] !== gid) continue;
          const ahead = along + base - this.d[j];
          if (ahead < 25 || ahead > 80) continue;
          if (this.types[this.type[j]].len + 0.5 > (slot.room ?? 6)) continue;
          this.state[j] = ST.inStop; this.slot[j] = slot; this.onD[j] = along + 9; this.parkPath[j] = gid;
          this.freeSlots.splice(k, 1);
          return;
        }
      }
    }
  }
  /** The lane piece (drive direction ~ (hx, hz)) nearest (x, z) within 4.5 m: { gid, along } or null. */
  laneAt(x, z, hx, hz, maxLat = 3.6) {   // a parallel slot sits ~2.5 m beside its lane; farther = a lane across a wide street
    let best = null, bl = maxLat;
    this.W.project(x, z, maxLat, (gid, along, lat, tx, tz) => {
      const g = this.W.slots[gid >>> 16];
      if (g.kind[gid & 0xffff] || !g.core[gid & 0xffff] || tx * hx + tz * hz < 0.8 || lat >= bl) return;
      bl = lat; best = { gid, along };
    });
    return best;
  }
  pullOut(c) {
    const hx = Math.sin(c.heading), hz = Math.cos(c.heading);
    const lane = this.laneAt(c.x, c.z, hx, hz);
    if (!lane) { c.busy = true; return; }
    const { gid, along } = lane, L = this.plen(gid);
    if (along + 12 > L || along < 4) { c.busy = true; return; }
    const ti = this.typeIndex(c.type);
    if (ti < 0) return;
    const i = this.spawnAt(gid, along + 10, 0, ti, [c.col.r, c.col.g, c.col.b]);
    if (i < 0) return;
    // maneuver: an S-curve from the slot to the lane 10 m on (cubic Bezier, sampled)
    this.W.point(gid, along + 10, this.tmp);
    this.bezier(i, c.x, c.z, hx, hz, this.tmp[0], this.tmp[1], this.tmp[2], this.tmp[3], 3.5, 4.5);
    this.state[i] = ST.outWait; this.manT[i] = 0; this.manDir[i] = 1; this.slot[i] = c;
    this.onPath[i] = -1; this.onD[i] = along;
    this.v[i] = 0; this.d[i] = along + 10; this.offX[i] = this.offZ[i] = 0;
    this.pose(i); this.copyPrev(i);
    // the parked car is now this traffic car (same pose, type, paint): hide it in the parked fleet, same frame
    c.hidden = true; c.busy = true;
    this.onPark?.(c, true);
    this.stats.pullOuts++; this.handoff[i] = 1;
  }
  bezier(i, x0, z0, h0x, h0z, x3, z3, h3x, h3z, k0, k3) {
    const P = this.manPts, C = this.manCum, o = i * MAN;
    const x1 = x0 + h0x * k0, z1 = z0 + h0z * k0, x2 = x3 - h3x * k3, z2 = z3 - h3z * k3;
    let s = 0;
    for (let n = 0; n < MAN; n++) {
      const t = n / (MAN - 1), u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const z = u * u * u * z0 + 3 * u * u * t * z1 + 3 * u * t * t * z2 + t * t * t * z3;
      if (n) s += Math.hypot(x - P[(o + n - 1) * 2], z - P[(o + n - 1) * 2 + 1]);
      P[(o + n) * 2] = x; P[(o + n) * 2 + 1] = z; C[o + n] = s;
    }
    this.manLen[i] = s;
  }
  maneuver(i, ctx) {
    const st = this.state[i];
    if (st === ST.outWait) {
      // indicator on, wait for a gap: nobody on the lane from 40 m behind to 8 m ahead of the slot, then go
      const gid = this.path[i], g = this.W.slots[gid >>> 16], pi = gid & 0xffff, at = this.onD[i];
      this.waitT[i] += STEP;
      let clear = this.waitT[i] > 1.6;
      for (let j = g.head[pi]; j >= 0 && clear; j = this.nxt[j]) { if (j === i) continue; const dj = this.posOn(j); if (dj > at - 40 && dj < at + 14) clear = false; }
      // also cars on the lanes leading into this one, within 40 m
      if (clear && at < 40) for (let k = g.prevOff[pi]; k < g.prevOff[pi + 1] && clear; k++) if (g.head[g.prevIdx[k]] >= 0) clear = false;
      if (clear && this.obsAhead(gid, at - 30, this.tmp) < 45) clear = false;
      if (clear) { this.state[i] = ST.out; this.waitT[i] = 0; this.onPath[i] = gid; }
      return;
    }
    if (st === ST.out) {
      const v = Math.min(3.2, this.v[i] + 1.1 * STEP);
      this.v[i] = v; this.manT[i] += v * STEP; this.spin[i] += v * STEP / this.wr[i];
      const f = this.manT[i] / this.manLen[i];
      this.onD[i] = this.d[i] - 10 + f * 10 - 1;           // where followers see it on the lane
      if (f >= 1) {                                         // on the lane: drive on
        this.state[i] = ST.drive; this.onPath[i] = -1;
        const c = this.slot[i]; this.slot[i] = null;
        if (c) this.freeSlots.push(c);                      // its slot is free now
      }
      return;
    }
    if (st === ST.inRev) {
      const v = Math.max(-1.3, this.v[i] - 0.8 * STEP);
      this.v[i] = v; this.manT[i] += -v * STEP; this.spin[i] += v * STEP / this.wr[i];
      if (this.manT[i] >= this.manLen[i]) {                 // in the slot: hand it back to the parked fleet
        const c = this.slot[i];
        if (c) {
          c.type = this.types[this.type[i]].name;
          c.col.setRGB(this.paint[i * 3], this.paint[i * 3 + 1], this.paint[i * 3 + 2]);
          c.hidden = false; c.busy = false;
          this.onPark?.(c, false);
        }
        this.stats.parkIns++; this.handoff[i] = 1;
        this.kill(i);
      } else if (this.manT[i] > this.manLen[i] * 0.6) this.onPath[i] = -1;
    }
  }
}

// inStop (driving up to stop past a free slot, then reversing in) lives in move(): see TrafficSim.prototype.move hook
const baseMove = TrafficSim.prototype.move;
TrafficSim.prototype.move = function (i) {
  if (this.state[i] === ST.inStop) {
    // a virtual stop 7.5 m past the slot (onD), on this car's path
    const target = this.onD[i];
    const p = this.path[i];
    if (p !== this.parkPath[i] && this.route[i * ROUTE] !== this.parkPath[i]) {      // went elsewhere: give the slot back
      if (this.slot[i]) this.freeSlots.push(this.slot[i]);
      this.slot[i] = null; this.state[i] = ST.drive;
      return baseMove.call(this, i);
    }
    if (p >= 0) {
      const ds = p === this.parkPath[i] ? target - this.d[i] : this.plen(p) - this.d[i] + target;
      if (p === this.parkPath[i] && ds < 1.8 && this.v[i] < 0.15) {
        // stopped: reverse into the slot
        const c = this.slot[i];
        if (!c) { this.state[i] = ST.drive; return baseMove.call(this, i); }
        const hx = Math.sin(this.yaw[i]), hz = Math.cos(this.yaw[i]);
        const shx = Math.sin(c.heading), shz = Math.cos(c.heading);
        // reverse: the polyline runs from the car's position backwards (tangent -heading) into the slot (tangent -slot heading)
        this.bezier(i, this.x[i], this.z[i], -hx, -hz, c.x, c.z, -shx, -shz, 3.4, 3.4);
        this.state[i] = ST.inRev; this.manT[i] = 0; this.manDir[i] = -1; this.v[i] = 0;
        this.onPath[i] = p; this.onD[i] = this.d[i];
        this.offX[i] = this.offZ[i] = 0;
        return;
      }
      // brake to the stop point (IDM already ran with the lane's leaders; add the stop as a leader)
      const half = this.half[i], v = this.v[i];
      const gap = Math.max(0.05, ds);
      const sStar = 1.0 + v * 1.0 + (v * v) / (2 * Math.sqrt(this.aMax[i] * IDM.b));
      const a2 = this.aMax[i] * (1 - Math.pow(v / 6, 4) - (sStar / gap) ** 2);
      this.acc[i] = Math.max(-4, Math.min(this.acc[i], a2));
      void half;
    }
  }
  return baseMove.call(this, i);
};
export { ST, HOLD };
