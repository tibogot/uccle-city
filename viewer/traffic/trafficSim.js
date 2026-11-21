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
import { TWIN_OLD } from "./trafficWorld.js";
import { ROLE, routeProject, routePoint } from "./trafMix.js";   // TRAFMIX (docs/TRAFMIX.md): the service roles

export const STEP = 1 / 20;
const IDM = { a: 1.5, b: 2.2, T: 1.25, s0: 2.2 };
const HOLD = { none: 0, signal: 1, stop: 2, yield: 3, busy: 4, full: 5, park: 6 };
/** ?bikeroom=old: the traffic makes no room for the filtering motorbike (before collisions round 2) */
const ROOM_OLD = typeof location !== "undefined" && /[?&]bikeroom=old(&|$)/.test(location.search);
// trafpark (2026-11-17, owner: "the traffic cars can go through the parked cars"): ?trafpark=old = the traffic blind to
// the parked cars at run time (the lanes are built clear of them, viewer/traffic/trafficGraph.js; this guard covers the
// ones that moved: shoved by the player, a game's prop) and the pull-over / yield shifts not clamped by them
const TP_OLD = typeof location !== "undefined" && /[?&]trafpark=old(&|$)/.test(location.search);
// (claude/deckrail, docs/TOUR.md "Determinism") the visual tour (?still=1, tools/tour/views.json common switches) freezes
// the random parked-car pull-outs / reverse-ins: whether a car in view had pulled out before the capture depended on the
// boot's length (traffic-alsemberg's van came and went from run to run). Normal play keeps 1.
/** the parking rate (pull-outs / reverse-ins) for a page's query string: 0 under ?still=1 (the tour), else 1 */
export const parkRateFor = (search) => (/[?&]still=1(&|$)/.test(search || "") ? 0 : 1);
const TP_TOUCH = 0.05;
const TP_BLOCK = 0.96;          // m: a parked box this close to a lane's line blocks it (the widest traffic type: 0.975 half width; built lanes keep 0.98)          // m: a parked car's box within CAR_HALF_W - TP_TOUCH of a lane's line blocks it (built: >= 0.9 m clear)
const FAIR_T = 20;               // s: held this long for room on an exit, a car claims it (rule junction-entry-room)
const ROOM_GAP = 2;             // m: the room a car needs past a junction turn beyond its own length (rule junction-entry-room)
const CYCLE_T = 10, CREEP_T = 3;  // s: a wait this old is checked for a wait-for loop; a car breaking one creeps on this long
const RUN_ROOM = 0.4, RUN_OUT = 0.5;    // m: a car pulled over this far is passed by a run, which eases this far out
const PROGRESS = 3;             // m: moved this far since a wait began, the wait starts over (a queue, not a stuck car)
const PATIENCE = 8, NEAR_ONC = 14;      // s refused before the far oncoming traffic lets a car out; m: the near ones still hold it
const CF_SHORT = 1.5;           // m: a standing car's front this far short of a conflict point leaves it free
const PASS_GAP = 0.6;           // m: easing out past a parked car, the least gap kept to a car in the other half of the street
const TP_PASS = 1.3;            // m: the most a car eases sideways to pass a parked car standing into its lane
// (carhit, docs/CARHIT.md: knocked = hit by the player, off its lane: viewer/drive/carHit.js drives its pose, the sim
// skips it; it rejoins through rejoin() below, or stays as a wreck)
const ST = { drive: 0, outWait: 1, out: 2, inStop: 3, inRev: 4, knocked: 5 };
const ROUTE = 4;
const blendF = (t) => (t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t * (3 - 2 * t));     // twinlink: the handover blend's S                 // planned paths ahead
const MAN = 16;                  // maneuver polyline points
const OBS_MAX = 512, OBS_ENTRIES = 8192;          // (trafpark: parked-car obstacles, ~10 entries each over the tiles' copies)
const CAR_HALF_W = 0.95;          // m: a traffic car's half width (the box obstacles' lane test)
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
   * world: TrafficWorld; opts: { cap, types: [{ name, len, wb, wheelR, w, h, weight }], paints: [[r,g,b]], ground(x, z, near) -> y (the mover ground, viewer/drive/moverGround.js: the layer nearest near),
   *   seed }
   */
  constructor(world, { cap = 768, types, paints, ground, seed = 1 } = {}) {
    this.W = world; this.cap = cap; this.types = types; this.paints = paints; this.ground = ground;
    this.rs = seed >>> 0 || 1;
    const F = (n = 1) => new Float32Array(cap * n), I = (n = 1, v = 0) => new Int32Array(cap * n).fill(v), U = (n = 1) => new Uint8Array(cap * n);
    Object.assign(this, {
      alive: U(), path: I(1, -1), prev: I(1, -1), d: new Float64Array(cap), v: F(), acc: F(), route: I(ROUTE, -1),
      rin: F(ROUTE),                                 // twinlink: where each planned path is entered (m along: a twin may begin before its copy)
      pin: F(),                                      // twinlink: where the current path was entered
      bdx: F(), bdz: F(), bS: new Float64Array(cap), bL: F(), odo: new Float64Array(cap),
      pbdx: F(), pbdz: F(), pbS: new Float64Array(cap), pbL: F(),       // twinlink: the blend the previous path (the other tile) was under   // twinlink: the handover blend (gap bdx / bdz, from odometer bS over bL m; bL 0 = none), the odometer
      type: U(), half: F(), wb: F(), wr: F(), paint: F(3), aMax: F(), Tg: F(), v0f: F(),
      state: U(), hold: U(), holdT: F(), stopDone: I(1, -1), committed: I(1, -1), waitT: F(), bits: U(),
      nxt: I(1, -1),
      keep: U(),                                     // 1 = held by the game kit (a mission target): populate() never removes it                                 // next car on the same path (ascending d)
      x: F(), z: F(), y: F(), yaw: F(), pitch: F(), px: F(), pz: F(), py: F(), pyaw: F(), ppitch: F(),
      spin: F(), pspin: F(), steer: F(), offX: F(), offZ: F(), age: F(), seen: U(),
      manPts: F(MAN * 2), manCum: F(MAN), manLen: F(), manT: F(), manDir: new Int8Array(cap), slot: new Array(cap).fill(null),
      onPath: I(1, -1), onD: new Float64Array(cap),
      gen: new Uint32Array(cap), handoff: U(), parkPath: I(1, -1),         // pop checks: a spawn counter per slot; 1 = came from / went to a parked car
      // POLICE GAME (docs/POLICE_GAME.md): ctl 0 normal, 1 FLEE (a stolen car: faster, overtakes, runs lights, turns
      // away from the police), 2 PULL OVER (slows to a stop on the right), 3 STOPPED (stands on the right);
      // speedF a speed factor (a speeder); yr the sideways room a car wants (m, + left: yielding pulls right);
      // overT an overtaking flee car's timer (s)
      ctl: U(), speedF: F(), yr: F(), overT: F(),
      // CARHIT (docs/CARHIT.md, viewer/drive/carHit.js): knock 0 on its lane, 1 sliding (a rigid body), 2 settled (hazards,
      // rejoins), 3 wreck, 4 a shoved parked car standing; dmg the crumpled corners (3 bits each: FL FR RL RR, 4 cm a
      // level), drawn by the fleet's vertex shader; kT the time since it settled (s)
      knock: U(), dmg: new Uint16Array(cap), kT: F(),
      // TRAFMIX (docs/TRAFMIX.md, sim.mix set: ?trafmix=old none): role (trafMix.js ROLE), rst the role's state (0 driving,
      // 1 stopping, 2 stopped: a bus at its stop, a delivery / bin lorry stop), rT its timer (s) / the odometer of the next
      // stop (bin), bv the bus's route (sim.mix.routes index, -1 none / off its route), rp how far along it (m), ns its
      // next stop, offT the time it has been off its line (s), stopD where a stopping car stops (odometer), indT the
      // pull-out indicator's time left
      role: U(), rst: U(), rT: F(), wide: F(), bv: new Int16Array(cap).fill(-1), rp: F(), ns: new Int16Array(cap), offT: F(), stopD: new Float64Array(cap), indT: F(),
      room: F(),                                     // collisions round 2: the sideways shift (m, + = left) a car makes for a filtering motorbike
      gap: F(), lead: U(),                            // debug: the gap IDM used and what it was to (1 car, 2 obstacle, 3 hold)   // where a maneuvering car sits on its lane (for followers)
    });
    this.free = []; this.freeLater = [];
    for (let i = cap - 1; i >= 0; i--) this.free.push(i);
    this.count = 0;
    // obstacles: points with a radius and a velocity; entries = obstacle projected on a path
    this.obs = { n: 0, x: new Float32Array(OBS_MAX), z: new Float32Array(OBS_MAX), r: new Float32Array(OBS_MAX), vx: new Float32Array(OBS_MAX),
      vz: new Float32Array(OBS_MAX), cross: new Uint8Array(OBS_MAX),
      // an oriented box obstacle (the motorbike): heading, half width across, half length along; bx < 0 = a circle
      bh: new Float32Array(OBS_MAX), bx: new Float32Array(OBS_MAX), bz: new Float32Array(OBS_MAX),
      park: new Uint8Array(OBS_MAX) };                // trafpark: 1 = a parked car (blocks only when it really stands into the lane)
    // the filtering motorbike (cityTraffic.js sets it each step): cars in a queue beside / ahead of it shift aside
    this.bike = { on: false, x: 0, z: 0, h: 0, v: 0 };
    // POLICE GAME: the emergency car (lights + siren on: the police game sets it each step): the traffic ahead pulls
    // right and stops, oncoming cars slow, cars at junctions wait; flee cars turn away from `chaser`
    this.emerg = { on: false, x: 0, z: 0, h: 0, v: 0 };
    this.chaser = { x: 0, z: 0 };
    // TRAFMIX: the traffic's own emergency vehicles on a run (ctl 4: beacons + siren), rebuilt each step: everybody yields
    // to them as to the police game's car (emerg); the delivery vans standing in the lane (obstacles)
    this.mix = null; this.emN = 0; this.emI = new Int32Array(8); this.emX = new Float32Array(8); this.emZ = new Float32Array(8); this.emH = new Float32Array(8);
    this.dvCar = new Array(cap).fill(null); this._rnd = () => this.rand(); this._rp = new Float64Array(4);
    this.extraObs = [];                              // static obstacles a game adds ({ x, z, r }): an accident, cones
    this._fi = -1;                                   // (fillRoute's car, for the flee route choice)
    this.tmp4 = new Float64Array(4);
    this.oe = { n: 0, d: new Float32Array(OBS_ENTRIES), r: new Float32Array(OBS_ENTRIES), v: new Float32Array(OBS_ENTRIES), nxt: new Int32Array(OBS_ENTRIES),
      need: new Float32Array(OBS_ENTRIES), k: new Int16Array(OBS_ENTRIES) };          // trafpark: the sideways shift (m, + left) that clears a parked car's entry (0: not a parked car)
    // trafpark: the parked cars near the traffic (a grid rebuilt every 2 s) and the ones that moved off their slot
    this.pk = { grid: new Map(), moved: new Set(), at: -1, size: null, car: [] };
    this.pw = new Float32Array(this.cap); this.pwT = new Float32Array(this.cap);
    this.pwWait = new Float32Array(this.cap);        // a refused pass is not asked again for 0.6 s (perf)
    this.pwSum = new Float32Array(this.cap);
    this.claims = new Map();                         // (claude/street4) exit path gid -> the car that waited longest for room on it
    this.wf = new Int32Array(this.cap).fill(-1); this.creep = new Float32Array(this.cap); this.wfMark = new Uint32Array(this.cap); this._wfM = 0; this._blk = -1;   // (claude/street4) the wait-for links and the cycle breaker
    this.holdP = new Int32Array(this.cap).fill(-1); this.holdD = new Float32Array(this.cap);   // (claude/street4) where a car's current wait began         // (claude/street4) how long this car has been refused a pass, in a row
    this.tpLA = new Float64Array(this.cap).fill(-1); // the shifted-body look-ahead's hit (m along its route, -1 none), every 4th step   // a car's pass shift round a parked car, its timer
    this.tmp = new Float64Array(4); this.tmp2 = new Float64Array(4); this.tmp3 = new Float64Array(4);
    this.t = 0; this.acc_ = 0; this.steps = 0;
    this.params = { density: 1, speed: 1, hour: 9, radius: 470, minSpawnDist: 45, parkRate: parkRateFor(typeof location !== "undefined" ? location.search : ""),
      runs: parkRateFor(typeof location !== "undefined" ? location.search : ""),   // (TRAFMIX: emergency runs; 0 under ?still=1, the tour)
      signals: true, maxCars: cap,
      narrow: !(typeof location !== "undefined" && /[?&]narrow=0/.test(location.search)) };   // one way at a time on narrow stretches
    this.stats = { yielding: 0, cars: 0, target: 0, spawned: 0, removed: 0, stepMs: 0, stepMsMax: 0, holds: [0, 0, 0, 0, 0, 0, 0], pullOuts: 0, parkIns: 0, handovers: 0, laneKm: 0 };
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
    for (let k = a; k < b; k++) tot += this.nextWeight(g, g.nextIdx[k]) * this.fleeWeight(g, g.nextIdx[k]) * this.busWeight(g, g.nextIdx[k]);
    let r = this.rand() * tot, j = g.nextIdx[a];
    for (let k = a; k < b; k++) { const w = this.nextWeight(g, g.nextIdx[k]) * this.fleeWeight(g, g.nextIdx[k]) * this.busWeight(g, g.nextIdx[k]); if (r < w) { j = g.nextIdx[k]; break; } r -= w; }
    const gj = (g.slot << 16) | j;
    this._pickAt = 0;
    if (g.core[j] || g.twin[j] < 0) return gj;
    if (!TWIN_OLD) this._pickAt = g.twinAt[j];          // (twinlink: the copy's start, part-way along its twin)
    return g.twin[j];
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
  /** POLICE GAME: a fleeing car prefers the junction exit that leads away from the chaser (x 12 straight away,
   *  x 0.08 towards it); 1 for everybody else */
  fleeWeight(g, j) {
    const i = this._fi;
    if (i < 0 || this.ctl[i] !== 1 || !g.kind[j]) return 1;
    const T = this.tmp4, gid = (g.slot << 16) | j;
    this.W.point(gid, 0, T); const x0 = T[0], z0 = T[1];
    this.W.point(gid, g.len[j], T);
    const dx = T[0] - x0, dz = T[1] - z0, l = Math.hypot(dx, dz) || 1;
    let ax = x0 - this.chaser.x, az = z0 - this.chaser.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
    const ex = l > 2 ? dx / l : T[2], ez = l > 2 ? dz / l : T[3];
    return Math.exp(2.5 * (ex * ax + ez * az));
  }
  /** TRAFMIX: a bus on its line prefers the exit that stays on its route (its OSM relation): the exit's end within a few
   *  metres of the route ahead (the next 400 m) and along it; 1 for everybody else */
  busWeight(g, j) {
    const i = this._fi;
    if (i < 0 || this.role[i] !== ROLE.bus || this.bv[i] < 0 || !this.mix) return 1;
    const r = this.mix.routes[this.bv[i]], T = this.tmp4, Q = this._rp, gid = (g.slot << 16) | j;
    this.W.point(gid, g.len[j], T);
    routeProject(r, T[0], T[1], this.rp[i] - 20, this.rp[i] + 400, Q);
    const d = Q[1];
    routePoint(r, Q[0], Q);
    const al = T[2] * Q[2] + T[3] * Q[3];
    return Math.exp(-((d / 4) ** 2)) * (al > 0.3 ? 1 : 0.02) + 1e-6;
  }
  fillRoute(i) {
    this._fi = i;
    const R = this.route, o = i * ROUTE;
    let last = this.path[i];
    for (let k = 0; k < ROUTE; k++) {
      if (R[o + k] < 0) { R[o + k] = last >= 0 ? this.pickNext(last) : -1; this.rin[o + k] = R[o + k] >= 0 ? this._pickAt : 0; }
      last = R[o + k];
      if (last < 0) { for (let m = k + 1; m < ROUTE; m++) R[o + m] = -1; break; }
    }
    this._fi = -1;
  }
  shiftRoute(i) {
    const R = this.route, o = i * ROUTE;
    for (let k = 0; k < ROUTE - 1; k++) { R[o + k] = R[o + k + 1]; this.rin[o + k] = this.rin[o + k + 1]; }
    R[o + ROUTE - 1] = -1; this.rin[o + ROUTE - 1] = 0;
    this.fillRoute(i);
  }

  // ------------------------------------------------------------------ cars
  /** A new car on path gid at d (no checks). Returns its index or -1. */
  spawnAt(gid, d, v, typeIdx = -1, paintRGB = null) {
    if (!this.free.length) return -1;
    const i = this.free.pop();
    if (typeIdx < 0) { let r = this.rand() * this.typeWeights.reduce((a, b) => a + b, 0); typeIdx = 0; for (let k = 0; k < this.types.length; k++) { if (r < this.typeWeights[k]) { typeIdx = k; break; } r -= this.typeWeights[k]; } }
    const T = this.types[typeIdx];
    this.room[i] = 0;
    this.alive[i] = 1; this.path[i] = gid; this.prev[i] = -1; this.pin[i] = 0; this.bL[i] = 0; this.pbL[i] = 0; this.d[i] = d; this.v[i] = v; this.acc[i] = 0;
    for (let k = 0; k < ROUTE; k++) this.route[i * ROUTE + k] = -1;
    this.fillRoute(i);
    this.type[i] = typeIdx; this.half[i] = T.len / 2; this.wb[i] = T.wb; this.wr[i] = T.wheelR;
    const p = paintRGB || this.paints[Math.floor(this.rand() * this.paints.length)];
    this.paint[i * 3] = p[0]; this.paint[i * 3 + 1] = p[1]; this.paint[i * 3 + 2] = p[2];
    // (motorbike round 2: a two-wheeler type pulls away quicker / rides a little faster or slower: T.accel, T.speed)
    this.aMax[i] = IDM.a * (0.8 + this.rand() * 0.4) * (T.accel ?? 1); this.Tg[i] = IDM.T * (0.8 + this.rand() * 0.5); this.v0f[i] = (0.9 + this.rand() * 0.18) * (T.speed ?? 1);
    this.state[i] = ST.drive; this.hold[i] = 0; this.holdT[i] = 0; this.stopDone[i] = -1; this.committed[i] = -1; this.waitT[i] = 0; this.bits[i] = 0;
    this.spin[i] = this.rand() * 6.28; this.steer[i] = 0; this.offX[i] = 0; this.offZ[i] = 0; this.age[i] = 0; this.seen[i] = 0;
    this.slot[i] = null; this.onPath[i] = -1; this.gen[i]++; this.handoff[i] = 0; this.keep[i] = 0;
    this.ctl[i] = 0; this.speedF[i] = 1; this.yr[i] = 0; this.overT[i] = 0;
    this.knock[i] = 0; this.dmg[i] = 0; this.kT[i] = 0;
    this.role[i] = 0; this.rst[i] = 0; this.rT[i] = 0; this.wide[i] = 0; this.bv[i] = -1; this.rp[i] = 0; this.ns[i] = 0; this.offT[i] = 0; this.indT[i] = 0;
    this.half[i] = T.len / 2 + Math.abs(T.zc || 0);         // (TRAFMIX: a long vehicle's longer end, its body off the axles' middle)
    if (this.pw) { this.pw[i] = 0; this.pwT[i] = 0; this.pwWait[i] = 0; this.pwSum[i] = 0; this.tpLA[i] = -1; this.creep[i] = 0; this.wf[i] = -1; }
    this.y[i] = NaN;                                 // (rule mover-ground: no height yet: pose() takes the top layer)
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
  // twinlink: a tile handover is a gentle lane change, not a slide. The twin's points are moved by the gap between the
  // two copies (this path's end -> the twin's entry), fading out along the twin over blendLen metres (an S, smoothstep):
  // each axle follows it, so the heading turns with the drift; the same blend is kept on the current path after the
  // handover (bdx / bdz from bS over bL), so nothing jumps. (?twinlink=old: the centre offset decaying 10 % a step.)
  routePoint(i, s, out) {
    let gid = this.path[i];
    const p0 = this.pin[i];
    if (s < p0) {
      const pv = this.prev[i];
      if (pv >= 0 && this.W.slots[pv >>> 16]) {
        this.W.point(pv, this.plen(pv) + s - p0, out);
        // (the previous path in the same tile is under the current blend; across a handover, under the one it had)
        if (!TWIN_OLD) {
          const same = pv >>> 16 === gid >>> 16, L = same ? this.bL[i] : this.pbL[i];
          if (L > 0) {
            const f = blendF((this.odo[i] + s - this.d[i] - (same ? this.bS[i] : this.pbS[i])) / L);
            out[0] += (same ? this.bdx[i] : this.pbdx[i]) * f; out[1] += (same ? this.bdz[i] : this.pbdz[i]) * f;
          }
        }
        return out;
      }
      if (s < 0) { this.W.point(gid, 0, out); out[0] += out[2] * s; out[1] += out[3] * s; return out; }
    }
    // (the blend runs on the car's odometer: a point's odometer = the car's + its route distance ahead of the car)
    const r = s - this.d[i];
    let k = 0, bs = 0, bl = 0, bx = 0, bz = 0;
    if (!TWIN_OLD && this.bL[i] > 0) { bs = this.bS[i]; bl = this.bL[i]; bx = this.bdx[i]; bz = this.bdz[i]; }
    while (s > this.plen(gid)) {
      const nx = this.route[i * ROUTE + k];
      if (nx < 0 || k >= ROUTE - 1) {                 // past the end of the known route: straight on
        this.W.point(gid, this.plen(gid), out); const over = s - this.plen(gid); out[0] += out[2] * over; out[1] += out[3] * over;
        break;
      }
      const at = this.rin[i * ROUTE + k];
      if (!TWIN_OLD && nx >>> 16 !== gid >>> 16) {
        // a tile handover ahead: the twin and what follows it are moved by the gap, fading out from the entry
        const eo = this.odo[i] + r - (s - this.plen(gid));          // (the entry's odometer)
        if (bl > 0) { const f = blendF((eo - bs) / bl); this.gapR = f; } else this.gapR = 0;
        const rx = bx * this.gapR, rz = bz * this.gapR;               // (what is left of a blend still running there)
        bl = 0;
        if (this.crossGap(gid, nx, at, rx, rz)) { bx = this.gap2[0]; bz = this.gap2[1]; bs = eo; bl = this.blendLen(); }
      }
      s -= this.plen(gid); gid = nx; s += at; k++;
    }
    if (s <= this.plen(gid)) this.W.point(gid, s, out);
    if (bl > 0) { const f = blendF((this.odo[i] + r - bs) / bl); out[0] += bx * f; out[1] += bz * f; }
    return out;
  }
  /** the gap from path a's end to path b at `at` (a tile handover) into this.gap2; false when >= 4 m (not blended: a jump, as before) */
  crossGap(a, b, at, rx = 0, rz = 0) {
    const A = this.gapA || (this.gapA = new Float64Array(4)), B = this.gapB || (this.gapB = new Float64Array(4)), G = this.gap2 || (this.gap2 = new Float64Array(2));
    this.W.point(a, this.plen(a), A); this.W.point(b, at, B);
    G[0] = A[0] + rx - B[0]; G[1] = A[1] + rz - B[1];
    return G[0] * G[0] + G[1] * G[1] < 16;
  }
  /** how far the gap (this.gap2) fades: 6 m per m of gap + 6 m, 8-30 m: the S's steepest part moves the car <= 0.2 m
   *  sideways per m forward (a brisk lane change, ~11 deg; ~1.5 m/s at 30 km/h). Longer is gentler but keeps the car
   *  off the neighbour's lane (fitted round ITS parked cars) for longer: a 45 m blend put one into a parked car */
  blendLen() { const G = this.gap2; return Math.min(30, Math.max(8, 6 * Math.hypot(G[0], G[1]) + 6)); }
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
    const rm = this.room[i];
    const x = (F[0] + R[0]) / 2 + this.offX[i] + Math.cos(yaw) * rm, z = (F[1] + R[1]) / 2 + this.offZ[i] - Math.sin(yaw) * rm;
    // (claude/ground, rule mover-ground) the mover ground, the layer nearest the car's own height (NaN on a new car: the top layer)
    const yn = this.y[i], yf = this.ground(F[0], F[1], yn), yr = this.ground(R[0], R[1], yn);
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
    O.x[k] = x; O.z[k] = z; O.r[k] = r; O.vx[k] = vx; O.vz[k] = vz; O.cross[k] = crossOnly; O.bx[k] = -1; O.park[k] = 0;
  }
  /** an oriented box obstacle (collisions round 2: the motorbike, 0.8 x 2.1 m, was two 0.55 m circles): heading h
   *  (forward = (sin h, cos h)), half width hx, half length hz. A lane is blocked by it when the box, measured across
   *  that lane, comes within a car's half width (+ a margin) of the lane's line; along the lane it is as long as its
   *  extent there (a bike crossing a lane blocks 2.1 m of it, one riding along a lane 0.8 m of the width). */
  addBoxObstacle(x, z, h, hx, hz, vx = 0, vz = 0) {
    const O = this.obs;
    if (O.n >= OBS_MAX) return;
    const k = O.n++;
    O.x[k] = x; O.z[k] = z; O.r[k] = Math.hypot(hx, hz); O.vx[k] = vx; O.vz[k] = vz; O.cross[k] = 0;
    O.bh[k] = h; O.bx[k] = hx; O.bz[k] = hz; O.park[k] = 0;
    return k;
  }
  addObsEntry(gid, along, lat, tx, tz) {
    const O = this.obs, k = this._projCtx.k, E = this.oe;
    let r = O.r[k];
    if (O.bx[k] >= 0) {
      const c = Math.abs(tx * Math.sin(O.bh[k]) + tz * Math.cos(O.bh[k])), s = Math.sqrt(Math.max(0, 1 - c * c));
      const extLat = O.bz[k] * s + O.bx[k] * c;
      const turnM = O.park[k] && this.W.slots[gid >>> 16]?.kind[gid & 0xffff] ? 0.3 : 0;   // (a junction turn: the body sweeps wider)
      if (lat - extLat > (O.park[k] ? TP_BLOCK + turnM : CAR_HALF_W + 0.3) || E.n >= OBS_ENTRIES) return;
      r = O.bz[k] * c + O.bx[k] * s;
      if (O.park[k]) {
        // which side of the lane it stands: the shift away from it that clears it by 0.1 m
        const T = this.tmp4;
        this.W.point(gid, along, T);
        const side = (O.x[k] - T[0]) * tz - (O.z[k] - T[1]) * tx;          // + = left of the lane
        const into = TP_BLOCK + turnM + 0.12 - (lat - extLat);
        this._need = side > 0 ? -into : into;
      }
    } else if (lat > O.r[k] + 1.15 || E.n >= OBS_ENTRIES) return;
    // tram look-ahead points: only lanes that CROSS the track (not the tram's own lane, cars in front would stop)
    const vl = Math.hypot(O.vx[k], O.vz[k]);
    if (O.cross[k] && vl > 0.1 && Math.abs((O.vx[k] * tx + O.vz[k] * tz) / vl) > 0.85) return;
    if (this._rec) { this._rec.push(gid, along, r, O.park[k] ? this._need || 1e-3 : 0); return; }   // (a parked car's entries, cached)
    const g = this.W.slots[gid >>> 16], pi = gid & 0xffff;
    const e = E.n++;
    E.d[e] = along; E.r[e] = r; E.v[e] = O.vx[k] * tx + O.vz[k] * tz; E.nxt[e] = g.ohead[pi]; g.ohead[pi] = e;
    E.need[e] = O.park[k] ? this._need || 1e-3 : 0; E.k[e] = k;
  }
  projectObstacles() {
    this.oe.n = 0;
    const O = this.obs;
    for (let k = 0; k < O.n; k++) {
      this._projCtx.k = k;
      if (!O.park[k]) { this.W.project(O.x[k], O.z[k], O.r[k] + 1.15, this._proj); continue; }
      // (trafpark: a parked car stands still: its entries are projected once per pose / set of graphs, then copied)
      const c = this.pk.car[k];
      let C = c._tpE;
      if (!C || C.x !== c.x || C.z !== c.z || C.h !== c.heading || C.ver !== this.W.version) {
        this._rec = [];
        this.W.project(O.x[k], O.z[k], O.r[k] + 1.15, this._proj);
        C = c._tpE = { x: c.x, z: c.z, h: c.heading, ver: this.W.version, list: this._rec };
        this._rec = null;
      }
      const E = this.oe, L = C.list;
      for (let q = 0; q < L.length && E.n < OBS_ENTRIES; q += 4) {
        const g = this.W.slots[L[q] >>> 16];
        if (!g) continue;
        const pi = L[q] & 0xffff, e = E.n++;
        E.d[e] = L[q + 1]; E.r[e] = L[q + 2]; E.v[e] = 0; E.nxt[e] = g.ohead[pi]; g.ohead[pi] = e; E.need[e] = L[q + 3]; E.k[e] = k;
      }
    }
  }
  /** Nearest obstacle on path gid ahead of position `from`: gap from `from` to its near edge, into out[0] (gap), out[1] (v). */
  obsAhead(gid, from, out) {
    const g = this.W.slots[gid >>> 16], E = this.oe;
    let e = g.ohead[gid & 0xffff], best = Infinity, bv = 0, be = -1;
    const car = this._oaCar ?? -1;
    while (e >= 0) {
      const edge = E.d[e] - E.r[e];
      // (trafpark: a parked car this car is already passing, eased out beside it, is not in its way)
      if (E.d[e] + E.r[e] > from && edge - from < best && !(car >= 0 && E.need[e] && this.passingEntry(car, g.ohead[gid & 0xffff], e, from))) { best = Math.max(0, edge - from); bv = Math.max(0, E.v[e]); be = e; }
      e = E.nxt[e];
    }
    out[0] = best; out[1] = bv; out[2] = be;
    return best;
  }

  // ------------------------------------------------------------------ trafpark: parked cars at run time
  /** a parked car's plan size [w, l] (cityTraffic.js sets this.pk.size = carFleet.sizeOf) */
  parkWL(c) { const S = this.pk.size?.(c.type); return S ? [S[0], S[2]] : [1.85, 4.73]; }
  /** a parked car moved (carFleet onChange: shoved by the player, a game's prop): from now on an obstacle candidate */
  noteParked(c) { if (!TP_OLD && c) this.pk.moved.add(c); }
  /** the grid of the parked cars (every 40 steps) + their first-seen poses: a car off its pose is a moved one */
  parkedGrid() {
    const P = this.pk;
    if (!this.parked || (P.at >= 0 && this.steps - P.at < 40)) return;
    P.at = this.steps; P.grid.clear();
    // (trafpark round 2: when the loaded lane graphs change, every parked car is checked against the tiles' CORE lanes:
    // one a lane runs through (a neighbour tile's lane past the border, viewer/traffic/borderPark.js) is an obstacle)
    const recheck = P.ver !== this.W.version;
    P.ver = this.W.version;
    for (const c of this.parked()) {
      const lt = recheck && !c.hidden && !c._tpLane ? this.laneThrough(c) : 0;
      if (lt) {
        // under a tile's own lane, far from the player (> 250 m): it goes (as the border drop at load does; never seen
        // leaving); near, or under a twinless copy: an obstacle
        if (lt === 2 && (c.x - P.fx) ** 2 + (c.z - P.fz) ** 2 > 250 * 250 && !c.busy) { c.hidden = true; c.busy = true; c._tpLane = 1; this.onPark?.(c, true); this.stats.parkBorderHidden = (this.stats.parkBorderHidden || 0) + 1; }
        else P.moved.add(c);
      }
      // (hidden ones too: a car that pulled out comes back into its slot between two rebuilds; the queries skip hidden)
      if (!c._tp0) c._tp0 = [c.x, c.z, c.heading];
      else if (Math.abs(c.x - c._tp0[0]) + Math.abs(c.z - c._tp0[1]) > 0.03 || Math.abs(c.heading - c._tp0[2]) > 0.01) P.moved.add(c);
      const k = (Math.floor(c.x / 8) + 4096) * 8192 + Math.floor(c.z / 8) + 4096;
      let l = P.grid.get(k); if (!l) P.grid.set(k, (l = [])); l.push(c);
    }
  }
  rerouteTwins() {
    const R = this.route;
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i] || this.state[i] !== ST.drive) continue;
      // on such a copy now: onto the twin at the same distance (the lateral difference blended out, as a handover)
      const cp = this.path[i], cg = this.W.slots[cp >>> 16];
      if (cg && !cg.core[cp & 0xffff] && cg.twin[cp & 0xffff] >= 0) {
        const tw = cg.twin[cp & 0xffff], T = this.tmp, T2 = this.tmp2;
        // (twinlink: the copy may start part-way along its twin: the same spot on the twin, not the same distance)
        this.W.point(cp, this.d[i], T);
        const dt = TWIN_OLD ? this.d[i] : this.W.alongNear(tw, T[0], T[1]);
        if (dt < this.plen(tw)) {
          this.W.point(tw, dt, T2);
          const ex = T[0] - T2[0], ez = T[1] - T2[1];
          if (ex * ex + ez * ez < 16) {
            this.path[i] = tw; this.prev[i] = -1; this.pin[i] = 0; this.d[i] = dt; this.bL[i] = 0; this.pbL[i] = 0;
            if (TWIN_OLD) { this.offX[i] += ex; this.offZ[i] += ez; }
            else { const G = this.gap2 || (this.gap2 = new Float64Array(2)); G[0] = ex; G[1] = ez; this.bdx[i] = ex; this.bdz[i] = ez; this.bS[i] = this.odo[i] + this.wb[i] / 2; this.bL[i] = this.blendLen(); }   // (from the front axle: both axles keep the copy's line, then the S)
            for (let k = 0; k < ROUTE; k++) R[i * ROUTE + k] = -1;
            this.fillRoute(i); this.committed[i] = -1;
            this.stats.rerouted = (this.stats.rerouted || 0) + 1;
            continue;
          }
        }
      }
      // a planned path on a copy that now has a twin (or on a tile gone): from there on, planned again
      const o = i * ROUTE;
      for (let k = 0; k < ROUTE; k++) {
        const q = R[o + k];
        if (q < 0) break;
        const g = this.W.slots[q >>> 16], j = q & 0xffff;
        if (g && (g.core[j] || g.twin[j] < 0)) continue;
        if (g) { R[o + k] = g.twin[j]; this.rin[o + k] = TWIN_OLD ? 0 : g.twinAt[j]; k++; }
        for (; k < ROUTE; k++) R[o + k] = -1;
        this.fillRoute(i);
        this.stats.rerouted = (this.stats.rerouted || 0) + 1;
        break;
      }
    }
  }
  /** does a driven lane (core, or a buffer copy without a twin) of a loaded graph run within a traffic car's half width (- TP_TOUCH) of parked car c's box? */
  laneThrough(c) {
    const [w, l] = this.parkWL(c), hx = w / 2, hz = l / 2, h = c.heading;
    let yes = 0;
    this.W.project(c.x, c.z, Math.hypot(hx, hz) + 1.15, (gid, along, lat, tx, tz) => {
      if (yes === 2) return;
      const g = this.W.slots[gid >>> 16];
      // (a tile's own lanes (2), or a buffer copy with no twin (1): the cars drive it as it is, now and then)
      if (!g || (!g.core[gid & 0xffff] && g.twin?.[gid & 0xffff] >= 0)) return;
      const lvl = g.core[gid & 0xffff] ? 2 : 1;
      const cc = Math.abs(tx * Math.sin(h) + tz * Math.cos(h)), ss = Math.sqrt(Math.max(0, 1 - cc * cc));
      // (a junction turn: the body's corners sweep ~0.3 m outside its centre line)
      if (lat - (hz * ss + hx * cc) < TP_BLOCK + (g.kind[gid & 0xffff] ? 0.3 : 0)) yes = Math.max(yes, lvl);
    });
    return yes;
  }
  /** the moved parked cars as box obstacles (only they can stand in a lane: the lanes are built clear of the slots) */
  addParkedObstacles(fx, fz) {
    for (const c of this.pk.moved) {
      if (c.hidden || (c.x - fx) ** 2 + (c.z - fz) ** 2 > 430 * 430) continue;          // (the fleet fades out at 380-420 m)
      const [w, l] = this.parkWL(c);
      const k = this.addBoxObstacle(c.x, c.z, c.heading, w / 2, l / 2);
      if (k != null) { this.obs.park[k] = 1; this.pk.car[k] = c; }
    }
  }
  /** the least distance from car i's body, shifted s m sideways (+ left), to a parked car's box */
  parkClear(i, s, ahead = 0, hwMax = Infinity) {
    let yw = this.yaw[i], bx = this.x[i] - Math.cos(yw) * this.room[i], bz = this.z[i] + Math.sin(yw) * this.room[i];
    const st = this.state[i];
    if (ahead > 0 && (st === ST.drive || st === ST.inStop)) {
      // ahead along its ROUTE (the lane bends), posed as pose() does: the axles on the path
      const F = this._pcF ||= new Float64Array(4), R = this._pcR ||= new Float64Array(4), hw2 = this.wb[i] / 2, d = this.d[i] + ahead;
      this.routePoint(i, d + hw2, F); this.routePoint(i, d - hw2, R);
      yw = Math.atan2(F[0] - R[0], F[1] - R[1]); bx = (F[0] + R[0]) / 2 + this.offX[i]; bz = (F[1] + R[1]) / 2 + this.offZ[i];
    }
    const lx = Math.cos(yw), lz = -Math.sin(yw);
    return this.bodyClear(bx + lx * s, bz + lz * s, yw, this.half[i], Math.min(hwMax, Math.max(0.92, (this.types[this.type[i]]?.w ?? 1.84) / 2)));
  }
  /** the least distance from a car body (centre x0 / z0, heading yw, half length hl, half width hw) to a parked car's
   *  box, `skip` (its own slot) left out */
  bodyClear(x0, z0, yw, hl, hw, skip = null) {
    const fx = Math.sin(yw), fz = Math.cos(yw);
    let best = Infinity;
    const i0 = Math.floor(x0 / 8), j0 = Math.floor(z0 / 8);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const c of this.pk.grid.get((i0 + di + 4096) * 8192 + j0 + dj + 4096) || []) {
      if (c.hidden || c === skip) continue;
      const [w, l] = this.parkWL(c), reach = hl + hw + l / 2 + 0.6, ddx = c.x - x0, ddz = c.z - z0;
      if (ddx * ddx + ddz * ddz > reach * reach) continue;                 // (far: no test)
      const ax = Math.sin(c.heading), az = Math.cos(c.heading);
      // the car's axis sampled every 0.4 m or less, each a disc of its half width, against the parked box
      const span = Math.max(0, hl - hw), nT = Math.max(1, Math.ceil((2 * span) / 0.4));
      for (let m = 0; m <= nT; m++) {
        const t = -span + (2 * span * m) / nT;
        const px = x0 + fx * t - c.x, pz = z0 + fz * t - c.z;
        const u = Math.abs(px * ax + pz * az) - l / 2, v = Math.abs(px * az - pz * ax) - w / 2;
        const d = Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - hw;
        if (d < best) best = d;
      }
    }
    return best;
  }
  /** passing(): the parked car of entry e on this path's entry list (head h) as a whole: its largest need over the
   *  lane, and how far ahead of `from` it reaches */
  passingEntry(i, h, e, from) {
    const E = this.oe, k = E.k[e];
    let need = 0, far = 0;
    if (E.d[e] - E.r[e] - from > 30) return false;                      // (far ahead: an obstacle for now, decided nearer)
    for (let f = h; f >= 0; f = E.nxt[f]) if (E.k[f] === k) { if (Math.abs(E.need[f]) > Math.abs(need)) need = E.need[f]; far = Math.max(far, E.d[f] + E.r[f] - from); }
    return this.passing(i, need, far);
  }
  /** car i passing a parked car standing into its lane by `need` (m, + left: the shift that clears it), `reach` m ahead
   *  of its nose at most: eased out far enough? It asks to ease out when the shifted corridor is free of other parked
   *  cars and the other side of the traffic (no oncoming car within 35 m, nobody alongside); else it waits behind it */
  passing(i, need, reach = 8) {
    if (TP_OLD) return false;
    const sg = Math.sign(need), span = reach + 2 * this.half[i];
    // the corridor at shift s (+ left), from here to past the parked car: its body clear of every parked car by `m`
    const corridor = (sv, m) => { for (let a = 0; a <= span; a += 1.5) if (this.parkClear(i, sv, a) < m) return false; return true; };
    // (claude/street4: the entry's need is the lane's estimate for a car's width; where this vehicle's own body already
    // passes clear where it is (the lane keeps 1.13 m from the box: a car passes, so may anything its corridor shows
    // clear), it is not in the way: a bus held behind a parked car it had 1.3 m from, trafmix (every 4th step))
    // (a vehicle wider than a car may ease out by its extra half width more: the lanes keep a car's clearance)
    const wide = Math.max(0, Math.max(0.92, (this.types[this.type[i]]?.w ?? 1.84) / 2) - 0.92), PASS = TP_PASS + wide;
    // (only for a vehicle wider than a car: a car's own estimate is the lane's, as before; no extra cost for the cars)
    if (wide > 0 && !(this.pwT[i] > 0)) {
      if ((this.steps + i) % 4 && this.pcOk?.[i] !== undefined) { if (this.pcOk[i]) return true; }
      else { const ok = corridor(this.room[i], 0.05); (this.pcOk ||= new Uint8Array(this.cap))[i] = ok ? 1 : 0; if (ok) return true; }
    }
    if (Math.abs(need) > PASS + 0.3) return false;
    if (this.pwT[i] > 0 && Math.sign(this.pw[i]) === sg) {
      this.pwT[i] = 1.5;                                                   // (committed: held while the car is ahead)
      if (Math.abs(this.room[i]) < Math.abs(this.pw[i]) - 0.03) return false;        // still easing out: wait behind it
      // eased out: clear over its stopping distance (3 m/s2) + 3 m? (else a little further out when that is free, and
      // wait meanwhile)
      // (every 4th step; between, the last answer)
      if ((this.steps + i) % 4 && this.pwOk?.[i] !== undefined) { if (this.pwOk[i]) return true; }
      else {
        const v = this.v[i], look = Math.min(span, (v * v) / 6 + 4);
        let ok = true;
        for (let a2 = 0; a2 <= look && ok; a2 += 1) if (this.parkClear(i, this.room[i], a2) < 0.02) ok = false;
        (this.pwOk ||= new Uint8Array(this.cap))[i] = ok ? 1 : 0;
        if (ok) return true;
        const more = this.pw[i] + sg * 0.2;
        if (Math.abs(more) <= PASS && corridor(more, 0.05)) this.pw[i] = more;
      }
      return false;
    }
    if (this.pwWait[i] > 0) return false;
    const refuse = () => { this.pwWait[i] = 0.6; this.pwSum[i] += 0.6; this.stats.parkWaits = (this.stats.parkWaits || 0) + 1; return false; };
    // (claude/street4: after PATIENCE s refused, the far oncoming traffic lets it out (as drivers flash a waiting bus
    // out past a parked car): only the near ones (within NEAR_ONC m) and anybody alongside still hold it; with steady
    // oncoming traffic a bus behind a parked car waited for good, trafmix "removed as stuck (hold 6)")
    const onc = this.pwSum[i] > PATIENCE ? NEAR_ONC : 35;
    // give way: no oncoming car within 35 m on that side, nobody alongside there
    const yw = this.yaw[i], fx = Math.sin(yw), fz = Math.cos(yw), lx = Math.cos(yw), lz = -Math.sin(yw);
    for (let j = 0; j < this.cap; j++) {
      if (!this.alive[j] || j === i) continue;
      const dx = this.x[j] - this.x[i], dz = this.z[j] - this.z[i], al = dx * fx + dz * fz, lat = (dx * lx + dz * lz) * sg;
      // (claude/street4: the other car is in the way only if the eased-out body would come within PASS_GAP of it: a bus
      // (half width 1.27) easing 0.2-0.5 m past a parked car on a street with oncoming traffic stayed in its own half and
      // waited forever (trafmix: buses removed as stuck once the lanes kept a car's clearance, 1.13 m, from the parked
      // cars); the widths are each vehicle's own, the rest as before)
      const hwI = Math.max(0.92, (this.types[this.type[i]]?.w ?? 1.84) / 2), hwJ = Math.max(0.92, (this.types[this.type[j]]?.w ?? 1.84) / 2);
      if (al < -10 || al > onc || lat < 0.5 || lat - hwI - hwJ > Math.abs(need) + PASS_GAP) continue;
      const dot = Math.sin(this.yaw[j]) * fx + Math.cos(this.yaw[j]) * fz;
      if (dot < -0.3 || (al < 8 && al > -8)) return refuse();
    }
    // the least shift whose corridor is clear (measured on the bodies: the entry's need is an estimate)
    // (from the least shift up: the entry's need is the lane's estimate round the parked car's bounding disc (r = its half
    // length), well over what a body passing beside it needs; starting there, a bus with a car parked across the street
    // too found no clear corridor and waited for good: trafmix, D6)
    for (let sv = wide > 0 ? 0.1 : Math.max(0.1, Math.abs(need) - 0.3); sv <= PASS + 1e-3; sv += 0.15) {
      if (!corridor(sg * sv, 0.08)) continue;
      this.pw[i] = sg * sv; this.pwT[i] = 1.5; this.pwSum[i] = 0; this.stats.parkPasses = (this.stats.parkPasses || 0) + 1;
      return false;
    }
    return refuse();
  }

  // ------------------------------------------------------------------ junction decisions
  /** Should car i wait at the hold point of lane `L` (gid) before connector `C` (gid, may be -1)? -> HOLD.* */
  decide(i, L, C, X, dStop) {
    const g = this.W.slots[L >>> 16], li = L & 0xffff, c = g.ctrl[li], v = this.v[i];
    // POLICE GAME: a fleeing car runs about 2 lights / stop signs / give-ways in 3 (decided per car x lane: stable)
    const runs = (this.ctl[i] === 1 && (((L * 2654435761) ^ (i * 40503)) >>> 0) % 100 < 65) || this.ctl[i] === 4;   // (TRAFMIX: a run)
    if (runs) { if (C < 0) return 0; }
    else if (c === CTRL.signal && this.params.signals) {
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
      const courtesy = this.holdT[i] > 3.5 + (i % 5) * 0.8 || runs;
      for (let k = gc.cfOff[ci]; k < gc.cfOff[ci + 1]; k++) {
        const O = (gc.slot << 16) | gc.cfOther[k], atO = gc.cfOtherAt[k], yl = gc.cfYield[k];
        // (a) somebody on the other connector who has not cleared the conflict point: never go
        // (claude/street4: a car STANDING on the other connector with its front still well short of the conflict point is
        // not in the way: a queue waiting at the next junction's red light, its tail inside this junction's turn, held
        // the crossing ambulance for good (D7 Ch. d'Alsemberg, two signals a few metres apart); a moving one, or one at
        // the conflict point, still is)
        if (!(this.creep[i] > 0)) for (let j = gc.head[gc.cfOther[k]]; j >= 0; j = this.nxt[j]) { const pj = this.posOn(j); if (pj - this.half[j] < atO + 1.2 && !(this.v[j] < 0.5 && pj + this.half[j] < atO - CF_SHORT)) { this._blk = j; return HOLD.busy; } }
        if (yl !== 1 || courtesy) continue;
        // (b) the ones with priority that will be there soon: cars on the other connector's entry lane heading for it
        const E = gc.prevOff[gc.cfOther[k]] < gc.prevOff[gc.cfOther[k] + 1] ? gc.prevIdx[gc.prevOff[gc.cfOther[k]]] : -1;
        if (E < 0) continue;
        if (this.comingTo((gc.slot << 16) | E, O)) return HOLD.yield;
        const tw = gc.twin[E];
        if (tw >= 0 && this.comingTo(tw, O)) return HOLD.yield;
      }
    }
    // (c) JUNCTION ENTRY ROOM (claude/street4, rule junction-entry-room): a car starts a junction turn only when its exit
    // has free room for its length + ROOM_GAP after the turn, counted against the cars already in turns heading to the
    // same exit (a reservation, released as each leaves its turn); else it waits at its line. Before, the room was
    // judged by the exit's last car only: cars from several approaches entered at once, stopped inside their turns
    // and blocked the crossing traffic (a gridlock at the close Ch. d'Alsemberg junctions, D6 / D7, trafmix). A run (an
    // ambulance / fire engine) is not held by it; nor a car the cycle breaker lets creep on (below)
    if (X >= 0 && gc.kind[ci] && this.W.slots[X >>> 16] && this.ctl[i] !== 4 && !(this.creep[i] > 0)) {
      const gx = this.W.slots[X >>> 16], xi = X & 0xffff, need = this.half[i] * 2 + ROOM_GAP;
      let free = 0, blk = -1;
      // the exit's free length from its start to its last car (a moving last car leaves room growing), on along the
      // route past an exit lane too short to hold the car
      {
        const R = this.route, o = i * ROUTE;
        let k = 0; while (k < ROUTE && R[o + k] !== X) k++;
        for (let q = k; q < ROUTE && R[o + q] >= 0 && free < need + 1; q++) {
          const gq = this.W.slots[R[o + q] >>> 16]; if (!gq) { free = Infinity; break; }
          const pq = R[o + q] & 0xffff;
          let m = gq.head[pq]; if (m === i) m = this.nxt[m];
          if (m >= 0) { if (this.v[m] >= 2.5) free = Infinity; else { free += this.posOn(m) - this.half[m]; blk = m; } break; }
          free += gq.len[pq];
          if (q === ROUTE - 1) free = Infinity;
        }
        if (k >= ROUTE) free = Infinity;
      }
      // the reservations: every car on a turn into this exit (but this one)
      for (let n = gx.prevOff[xi]; n < gx.prevOff[xi + 1] && free < Infinity; n++) {
        const P = gx.prevIdx[n]; if (!gx.kind[P]) continue;
        for (let m = gx.head[P]; m >= 0; m = this.nxt[m]) if (m !== i) { free -= this.half[m] * 2 + ROOM_GAP; if (blk < 0) blk = m; }
      }
      // (fairness: a car held FAIR_T s for this exit claims it; the others wait behind its claim until it has gone in, so a
      // bus needing 14 m is not starved by the cars taking every 6 m gap first)
      const cl = this.claims.get(X);
      const held = (c) => c !== undefined && c !== i && this.alive[c] && this.hold[c] !== 0 && this.holdT[c] > FAIR_T && this.route[c * ROUTE + 1] === X;
      if (held(cl)) { this._blk = cl; return HOLD.full; }
      if (free < need) {
        if (this.holdT[i] > FAIR_T) this.claims.set(X, i);
        this._blk = blk; return HOLD.full;
      }
      if (cl === i) this.claims.delete(X);
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
    this._blk = -1;
    let v0 = g.speed[pi] * this.v0f[i] * this.params.speed * this.speedF[i];
    let gap = Infinity, vL = 0, lead = 0;
    const tmp = this.tmp;
    // POLICE GAME: control (flee / pull over / stopped) and yielding to the emergency car
    const ctl = this.ctl[i];
    let yieldCap = Infinity, yieldHold = false;
    this.yr[i] = 0;
    if (ctl === 1) { v0 = Math.max(v0 * 1.75, 15); if (this.overT[i] > 0) { this.overT[i] -= STEP; this.yr[i] = 2.7; } }
    else if (ctl === 2) { v0 = Math.max(0.05, v * 0.78); this.yr[i] = -0.9; if (v < 0.4) { this.ctl[i] = 3; this.v[i] = 0; } }
    else if (ctl === 3) { this.yr[i] = -0.9; this.acc[i] = -8; this.hold[i] = 0; this.gap[i] = 0; return; }
    else if (ctl === 4) v0 = Math.max(v0 * 1.3, Math.min(13.9, v0 * 1.6));      // (TRAFMIX: an ambulance / fire engine on a run)
    else if (this.emerg.on || this.emN) {
      // the police game's car (emerg) and the traffic's emergency vehicles on a run (TRAFMIX: emI / emX / emZ / emH)
      for (let q = this.emerg.on ? -1 : 0; q < this.emN; q++) {
        let ex0, ez0, eh;
        if (q < 0) { ex0 = this.emerg.x; ez0 = this.emerg.z; eh = this.emerg.h; }
        else { if (this.emI[q] === i) continue; ex0 = this.emX[q]; ez0 = this.emZ[q]; eh = this.emH[q]; }
        const dx = this.x[i] - ex0, dz = this.z[i] - ez0;
        if (dx * dx + dz * dz >= 95 * 95) continue;
        const ex = Math.sin(eh), ez = Math.cos(eh), along = dx * ex + dz * ez, lat = Math.abs(dx * ez - dz * ex);
        const dir = Math.sin(this.yaw[i]) * ex + Math.cos(this.yaw[i]) * ez;
        // (claude/street4: a car INSIDE a junction turn clears the junction first, as a driver does: crawling there for an
        // ambulance behind it held the ambulance itself, which waits until nobody stands before its conflict point
        // (decide HOLD.busy): a deadlock the trafmix gate saw on Ch. d'Alsemberg D6 once the turns were laid anew)
        const inTurn = g.kind[pi] === 1;
        if (dir > 0.6 && along > 2 && along < 80 && lat < 7) {                 // ahead, same way: pull right, stop
          this.yr[i] = -0.8;                                                   // (as far right as parked cars allow)
          if (!inTurn) yieldCap = Math.min(yieldCap, along < 45 ? Math.max(0.05, v * 0.8) : 4);
          this.stats.yielding++;
        } else if (dir < -0.6 && along > 0 && along < 70 && lat < 12) {       // oncoming: slow, keep right
          this.yr[i] = Math.min(this.yr[i], -0.5); if (!inTurn) yieldCap = Math.min(yieldCap, 3.5); this.stats.yielding++;
        } else if (dir <= 0.6 && dir >= -0.6 && along > -25 && along < 75) yieldHold = true;   // across: wait at the line
      }
    }
    // TRAFMIX: a bus at its stop, a delivery van / bin lorry at a stop: stands (pulled right where it can)
    if (this.rst[i] === 2) { this.yr[i] = this.role[i] === ROLE.bin ? 0 : -0.7; this.acc[i] = v > 0.05 ? -3 : 0; this.hold[i] = 0; this.gap[i] = 0; this.holdT[i] = 0; return; }
    if (yieldCap < v0) v0 = yieldCap;
    // the car ahead on this path, an obstacle on it (an overtaking flee car ignores the cars)
    let j = this.nxt[i];
    // (TRAFMIX: a delivery van standing in the lane is an obstacle (rolesPre): passed like a parked car where there is
    // room, else waited behind; the car past it leads)
    if (j >= 0 && this.rst[j] === 2 && this.role[j] === ROLE.delivery) j = this.nxt[j];
    // (claude/street4: an ambulance / fire engine on a run passes the cars that pulled over for it: a leader standing
    // pulled right (room <= -RUN_ROOM) is passed on the left, eased out by the room it left; before, the run crawled
    // behind a yielding car that crawled for the run, 100 s, trafmix D7)
    if (ctl === 4) while (j >= 0 && this.v[j] < 2 && this.room[j] <= -RUN_ROOM && this.ctl[j] !== 4) { this.yr[i] = Math.max(this.yr[i], RUN_OUT); j = this.nxt[j]; }
    const over = ctl === 1 && this.overT[i] > 0;
    if (j >= 0 && !over) { gap = this.posOn(j) - d - this.half[j] - half; vL = this.v[j]; lead = 1; }
    if (ctl === 1 && j >= 0 && this.overT[i] <= 0) {
      const gj = this.posOn(j) - d - this.half[j] - half;
      if (gj < 22 && this.v[j] < v0 * 0.7 && this.v[i] > 3) this.overT[i] = 3.2;    // a slow car ahead: out and past it
    }
    this._oaCar = TP_OLD ? -1 : i;
    let parkBlk = false;
    if (this.obsAhead(p, d + half, tmp) < gap) { gap = tmp[0]; vL = tmp[1]; lead = 2; parkBlk = tmp[2] >= 0 && this.oe.need[tmp[2]] !== 0; }
    // along the route: speed limits ahead (braked for), the last car / obstacle on each next path
    v0 = this.curveLimit(g, pi, d + half, 0, d + half + 45, v0);
    let dist = g.len[pi] - d;                  // car centre -> end of this path
    let hold = 0;
    // hold point on this path
    if (g.holdAt[pi] >= 0 && this.committed[i] !== p) {
      const dStop = g.holdAt[pi] - (d + half);
      if (dStop > -0.6) {
        hold = this.decide(i, p, R[o], R[o + 1], dStop);
        if (!hold && yieldHold && dStop > 1.5) hold = HOLD.yield;                 // (police game: the emergency car)
        if (!hold && dStop < (v * v) / (2 * 3.5) + 1) this.committed[i] = p;     // decided and close: go
        if (hold && dStop < gap) { gap = Math.max(0.05, dStop); vL = 0; lead = 3; }
      }
    }
    // NARROW STRETCH (citydefects 2026-11-16; trafficGraph.js narrowStretches): the street's two directions overlap
    // beside its parked cars: wait before the stretch while an oncoming car is in (or just entering) the opposing one;
    // two cars arriving together: the lower index goes first (no standoff). ?narrow=0: off.
    if (!hold && g.nOff && this.params.narrow !== false) {
      for (let k = g.nOff[pi]; k < g.nOff[pi + 1]; k++) {
        const dStop = g.nS0[k] - (d + half);
        if (dStop < 0.3 || dStop > 45 || dStop >= gap) continue;
        const op = g.nOpp[k], o0 = g.nO0[k], o1 = g.nO1[k];
        let blocked = false;
        for (let jj = g.head[op]; jj >= 0 && !blocked; jj = this.nxt[jj]) {
          const pj = this.posOn(jj), hj = this.half[jj];
          if (pj + hj > o0 && pj - hj < o1) blocked = true;                                   // inside it
          else if (pj + hj <= o0 && o0 - (pj + hj) < 6 && this.v[jj] > 0.5 && jj < i) blocked = true;   // entering, has the turn
        }
        if (blocked) { gap = Math.max(0.05, dStop - 0.5); vL = 0; lead = 3; hold = HOLD.yield; this.stats.narrowWaits = (this.stats.narrowWaits || 0) + 1; break; }
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
      const rin = this.rin[o + k];                // (twinlink: entered part-way along a twin; dist = to that entry)
      const vq = gq.speed[qi] * this.params.speed, room = Math.max(0, dist - half);
      const allowed = Math.sqrt(vq * vq + 2 * 1.4 * room);
      if (allowed < v0) v0 = allowed;
      if (!gq.kind[qi] && room < 45) v0 = this.curveLimit(gq, qi, rin, room, rin + 45 - room, v0);
      if (gap === Infinity && !over) {
        let h = gq.head[qi];
        while (h >= 0 && rin > 0 && this.posOn(h) < rin) h = this.nxt[h];
        if (h >= 0 && h !== i) { gap = dist + this.posOn(h) - rin - this.half[h] - half; vL = this.v[h]; lead = 1; }
      }
      if (gap === Infinity || dist < gap) {
        if (this.obsAhead(q, rin, tmp) < Infinity && dist + tmp[0] - half < gap) { gap = dist + tmp[0] - half; vL = tmp[1]; lead = 2; }
      }
      // the hold point on the next lane (a junction ahead of this lane piece)
      if (!hold && gq.holdAt[qi] >= rin && !gq.kind[qi] && this.committed[i] !== q && dist + gq.holdAt[qi] - rin - half < 70) {
        const dStop = dist + gq.holdAt[qi] - rin - half;
        hold = this.decide(i, q, k + 1 < ROUTE ? R[o + k + 1] : -1, k + 2 < ROUTE ? R[o + k + 2] : -1, dStop);
        if (!hold && yieldHold && dStop > 1.5 && dStop < 35) hold = HOLD.yield;
        if (hold && dStop < gap) { gap = Math.max(0.05, dStop); vL = 0; lead = 3; }
      }
      dist += gq.len[qi] - rin;
    }
    this._oaCar = -1;
    // (trafpark: waiting behind a parked car that stands into the lane counts as a hold: a car stuck there a minute, out
    // of sight, is taken away like any stuck car, populate())
    if (!hold && parkBlk && lead === 2 && gap < 4) hold = HOLD.park;
    // (trafpark: a car shifted sideways (pull over, yield, the bike's room, a pass) looks along its shifted body: a
    // parked car there within its stopping distance + 3 m is a leader)
    if (!TP_OLD && this.pk.grid.size && Math.abs(this.room[i]) > (this.types[this.type[i]].w > 2.1 ? 0.45 : 0.05)) {   // (TRAFMIX: a wide body's own easing is not a pass)
      if ((this.steps + i) % 4 === 0 || this.tpLA[i] < 0 && Math.abs(this.room[i]) < 0.1) {
        this.tpLA[i] = -1;
        const look = Math.min(30, (v * v) / 6 + 4);
        // (TRAFMIX: a body wider than the lanes' design car is looked along at the design width: the lanes are fitted
        // round the parked cars for a car; a bus beside them would otherwise stop for good)
        const hwL = this.types[this.type[i]].w > 2.1 ? 0.95 : Infinity;
        for (let a2 = 1; a2 <= look; a2 += 1) if (this.parkClear(i, this.room[i], a2, hwL) < 0.02) { this.tpLA[i] = d + a2; break; }
      }
      if (this.tpLA[i] >= 0) { const g2 = this.tpLA[i] - d - 1; if (g2 < gap) { gap = Math.max(0.05, g2); vL = 0; lead = 2; } }
    } else this.tpLA[i] = -1;
    if (ctl === 1) v0 = Math.max(v0, Math.min(15, v0 * 1.4));                // (police game: a fleeing car takes the bends faster)
    if (ctl === 4 && (g.kind[pi] || g.len[pi] - d < 25)) v0 = Math.min(v0, 7);   // (TRAFMIX: a run slows through junctions)
    if (this.wide[i] && !this.yr[i]) this.yr[i] = 0.4 * Math.sign(this.wide[i]);   // (TRAFMIX: a wide body eases off the parked cars)
    if (this.role[i] >= ROLE.bus) {                                            // (TRAFMIX: a bus's stop, a delivery / bin stop)
      const sg = this.roleStop(i);
      if (sg < gap) { gap = Math.max(0.05, sg); vL = 0; lead = 3; }
    }
    this.hold[i] = hold; this.gap[i] = gap; this.lead[i] = gap < Infinity ? lead : 0;
    // (who this car waits for, for the cycle breaker: the car its hold names, else the stopped car it follows)
    this.wf[i] = hold === HOLD.busy || hold === HOLD.full ? this._blk : lead === 1 && v < 0.3 ? this.nxt[i] : -1;
    // (claude/street4: a car that has moved on PROGRESS m (or onto another path) since its wait began is in a slow queue,
    // not stuck: the wait starts over. Before, a minute of creeping through a congested junction's queue (D6 Ch.
    // d'Alsemberg at 8 h) counted as stuck and the car was taken away, trafmix "removed as stuck")
    if (hold && (this.holdP[i] !== p || Math.abs(d - this.holdD[i]) > PROGRESS)) { this.holdP[i] = p; this.holdD[i] = d; this.holdT[i] = 0; }
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
  /** THE CYCLE BREAKER (rule junction-entry-room, a safety net): a car waiting CYCLE_T s whose wait-for chain (the car
   *  its hold names, else the stopped car it follows) loops back to it: the car of that loop with the oldest wait,
   *  inside a junction turn where one is, creeps on for CREEP_T s (its busy / full holds waived); counted in
   *  stats.cycleBreaks (the trafmix gate keeps it near 0) */
  breakCycles() {
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i] || this.holdT[i] < CYCLE_T || this.wf[i] < 0 || this.creep[i] > 0) continue;
      const m = ++this._wfM;
      let j = i, n = 0;
      while (j >= 0 && n < 64 && this.wfMark[j] !== m) { this.wfMark[j] = m; j = this.alive[j] ? this.wf[j] : -1; n++; }
      if (j !== i) continue;
      let best = i, bestT = -1, k = i;
      do {
        const inTurn = this.W.slots[this.path[k] >>> 16]?.kind[this.path[k] & 0xffff] ? 1e6 : 0;
        if (this.holdT[k] + inTurn > bestT) { bestT = this.holdT[k] + inTurn; best = k; }
        k = this.wf[k];
      } while (k !== i && k >= 0);
      this.creep[best] = CREEP_T; this.stats.cycleBreaks = (this.stats.cycleBreaks || 0) + 1;
    }
  }
  step(ctx) {
    const t0 = performance.now();
    this.t = signalClock.now();
    while (this.freeLater.length) this.free.push(this.freeLater.pop());
    if (!TP_OLD && this._wver !== this.W.version) { this._wver = this.W.version; this.rerouteTwins(); }   // (trafpark, rerouteTwins)
    this.buildLists();
    for (let k = 0; k < this.extraObs.length; k++) { const o = this.extraObs[k]; this.addObstacle(o.x, o.z, o.r); }
    this.stats.yielding = 0;
    // (trafpark: a tile came in or went: routes chosen before it were planned on the old tiles' buffer copies, never
    // fitted round the new tile's parked cars: from the next path on they take the new tile's own lanes (twins))
    if (!TP_OLD && this.parked) { this.pk.fx = ctx.fx; this.pk.fz = ctx.fz; this.parkedGrid(); this.addParkedObstacles(ctx.fx, ctx.fz); }
    if (this.mix) this.rolesPre();
    this.projectObstacles();
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      // its road graph was unloaded under it (a long camera jump): retire the car instead of reading a null graph
      if (!this.W.slots[this.path[i] >>> 16]) { this.kill(i); continue; }
      const st = this.state[i];
      if (st === ST.knocked) continue;                   // (carhit: its pose is the rigid body's, carHit.js)
      this.copyPrev(i);
      if (this.pwWait[i] > 0) this.pwWait[i] -= STEP;
      if (this.creep[i] > 0) this.creep[i] -= STEP;
      if (st === ST.drive || st === ST.inStop) this.accel(i);
    }
    if (this.steps % 10 === 0) this.breakCycles();
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      const st = this.state[i];
      if (st === ST.knocked) { this.age[i] += STEP; continue; }
      if (st === ST.drive || st === ST.inStop) this.move(i);
      else this.maneuver(i, ctx);
      if (!this.alive[i]) continue;
      if (this.room[i] || this.bike.on || this.yr[i] || this.pwT[i] > 0) this.makeRoom(i, st === ST.drive || st === ST.inStop);
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

  /** Collisions round 2 (?bikeroom=old = none): a slow car (a queue, a jam) with the motorbike filtering past it (beside
   *  it or coming up from behind, 0.9-3.2 m to one side) eases up to 0.45 m away from it, as drivers do, and back
   *  when it has gone (0.5 m/s: no jump). */
  makeRoom(i, driving) {
    const B = this.bike;
    let want = 0;
    if (driving && B.on && !ROOM_OLD && this.v[i] < 7) {
      const yw = this.yaw[i], sy = Math.sin(yw), cy = Math.cos(yw), dx = B.x - this.x[i], dz = B.z - this.z[i];
      const along = dx * sy + dz * cy, lat = dx * cy - dz * sy, al = Math.abs(lat);
      const behind = this.half[i] + 12, ahead = this.half[i] + 1.5;
      if (along > -behind && along < ahead && al > 0.9 && al < 3.2 && (B.v > this.v[i] + 0.5 || along > -this.half[i] - 2)) {
        want = -Math.sign(lat) * 0.45 * Math.min(1, (3.4 - al) / 1.2);
      }
    }
    if (!want && this.yr[i]) want = this.yr[i];                           // (police game: yielding / overtaking)
    // trafpark: easing out round a parked car standing into the lane (passing()), held 1.5 s after the last ask
    if (this.pwT[i] > 0) { this.pwT[i] -= STEP; if (driving) want = this.pw[i]; if (this.pwT[i] <= 0) this.pw[i] = 0; }
    const d = want - this.room[i], m = (want ? (this.ctl[i] === 1 ? 1.6 : 0.6) : 0.35) * STEP;
    const next = this.room[i] + (d > m ? m : d < -m ? -m : d);
    // trafpark: no sideways move (pull over, yield right, the bike's room, back from a pass) into a parked car: a move
    // that brings the body within TP_TOUCH of one, closer than it is, waits
    if (!TP_OLD && this.pk.grid.size && next !== this.room[i]) {
      const dn = this.parkClear(i, next);
      if (dn < TP_TOUCH && dn < this.parkClear(i, this.room[i])) { this.stats.parkClamped = (this.stats.parkClamped || 0) + 1; return; }
    }
    this.room[i] = next;
  }

  move(i) {
    const v = this.v[i], a = this.acc[i];
    let nv = v + a * STEP;
    if (nv < 0) nv = 0;
    const ds = (v + nv) * 0.5 * STEP;
    this.v[i] = nv;
    this.d[i] += ds; this.odo[i] += ds;
    if (this.bL[i] > 0 && this.odo[i] - this.bS[i] > this.bL[i] + 5) this.bL[i] = 0;      // (twinlink: the blend is over, both axles past it)
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
        this.W.point(this.path[i], this.plen(this.path[i]), T);
        // (twinlink: a twin may begin before the copy it stands for: the car enters it where the copy began)
        const at = this.rin[i * ROUTE];
        if (at > 0.05) { this.d[i] += at; this.stats.twinEntries = (this.stats.twinEntries || 0) + 1; }
        this.W.point(nx, at, T2);
        let ex = T[0] - T2[0], ez = T[1] - T2[1];
        const eo = this.odo[i] - (this.d[i] - at);                    // (the entry's odometer)
        if (!TWIN_OLD) {
          // (a blend still running at the entry: its rest goes into the new gap; the previous path keeps it)
          this.pbdx[i] = this.bdx[i]; this.pbdz[i] = this.bdz[i]; this.pbS[i] = this.bS[i]; this.pbL[i] = this.bL[i];
          if (this.bL[i] > 0) { const f = blendF((eo - this.bS[i]) / this.bL[i]); ex += this.bdx[i] * f; ez += this.bdz[i] * f; }
        }
        this.bL[i] = 0;
        if (ex * ex + ez * ez < 16) {
          if (TWIN_OLD) { this.offX[i] += ex; this.offZ[i] += ez; }
          else { const G = this.gap2 || (this.gap2 = new Float64Array(2)); G[0] = ex; G[1] = ez; this.bdx[i] = ex; this.bdz[i] = ez; this.bS[i] = eo; this.bL[i] = this.blendLen(); }
        }
        this.stats.handovers++;
        this.pin[i] = at;
      } else this.pin[i] = 0;
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
        dist += g.len[q & 0xffff] - this.rin[o + k];
      }
      if (st === ST.inStop) b |= 8;
      // on a connector: keep the indicator while turning
      const g = this.W.slots[this.path[i] >>> 16], pi = this.path[i] & 0xffff;
      if (g.kind[pi]) { const t = g.turn[pi]; if (t === 1) b |= 4; else if (t === 2) b |= 8; }
    } else if (st === ST.outWait || st === ST.out) b |= 4;
    else if (st === ST.inRev) b |= 16 | 8;
    if (this.role[i]) {                                                         // (TRAFMIX)
      if (this.ctl[i] === 4) b |= 2;                                            // beacons flashing + dipped beams
      if (this.rst[i] === 2 && this.role[i] !== ROLE.bus) b = (b & ~12) | 12;   // hazards at a delivery / bin stop
      if (this.indT[i] > 0) { this.indT[i] -= STEP; b = (b & ~8) | 4; }         // a bus pulling out of its stop: left indicator
    }
    this.bits[i] = b;
  }

  // ------------------------------------------------------------------ TRAFMIX: the service roles (docs/TRAFMIX.md)
  /** give car i its role (trafMix.js ROLE): patrols cruise a little slower; ambulances (40 %) / fire engines (60 %) on a
   *  run (ctl 4: beacons + siren, the traffic yields, lights / signs / priorities run at <= 7 m/s, never into a busy
   *  junction); bin lorries crawl stop to stop; delivery vans stop now and then */
  setRole(i, role) {
    this.role[i] = role; this.rst[i] = 0;
    if (role === ROLE.patrol) this.speedF[i] = 0.9;
    else if (role === ROLE.ambulance || role === ROLE.fire) { if (this.rand() < (role === ROLE.fire ? 0.6 : 0.4) * this.params.runs) this.ctl[i] = 4; }
    else if (role === ROLE.bin) { this.speedF[i] = 0.55; this.rp[i] = 15 + this.rand() * 30; }
    else if (role === ROLE.delivery) this.rT[i] = 15 + this.rand() * 90;
  }
  /** each step before the obstacles are projected: the emergency sources, the buses' progress along their lines, the
   *  delivery / bin stops (a delivery van standing in its lane is a box obstacle: passed where there is room) */
  rolesPre() {
    this.emN = 0;
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i] || !this.role[i]) continue;
      if (this.ctl[i] === 4 && this.state[i] === ST.drive && this.emN < 8) { const k = this.emN++; this.emI[k] = i; this.emX[k] = this.x[i]; this.emZ[k] = this.z[i]; this.emH[k] = this.yaw[i]; }
      if (this.state[i] !== ST.drive) continue;
      const role = this.role[i];
      // a body wider than the lanes were fitted for (> 2.1 m: bus, fire engine, bin lorry): beside a parked car within
      // 5 cm, ahead or here, it eases 0.4 m toward the centre line for 1.5 s (rechecked every 4 steps)
      if (this.wide[i]) { const w = this.wide[i] - Math.sign(this.wide[i]) * STEP; this.wide[i] = w * this.wide[i] > 0 ? w : 0; }
      // (one sample every 6 steps, here and 6 m ahead in turn; the side test only on a hit)
      if ((this.steps + i) % 6 === 0 && this.v[i] > 0.5 && this.pk.grid.size && (this.types[this.type[i]].w || 0) > 2.1 && this.rst[i] !== 2) {
        const a = (this.types[this.type[i]].zc || 0) + (((this.steps + i) / 6) & 1 ? 6 : 0);
        if (this.parkClear(i, this.room[i], a) < 0.05) this.wide[i] = (this.parkClear(i, this.room[i] + 0.3, a) > this.parkClear(i, this.room[i] - 0.3, a) ? 1 : -1) * 1.5;
      }
      if (role === ROLE.bus) { this.busTrack(i); continue; }
      if (role !== ROLE.delivery && role !== ROLE.bin) continue;
      if (this.rst[i] === 2) {
        this.rT[i] -= STEP;
        if (this.rT[i] <= 0) {
          this.rst[i] = 0;
          if (role === ROLE.delivery) this.rT[i] = 60 + this.rand() * 150; else this.rp[i] = 20 + this.rand() * 30;
        } else if (role === ROLE.delivery) this.deliveryObstacle(i);
      } else if (this.rst[i] === 0) {
        if (role === ROLE.delivery) { this.rT[i] -= STEP; if (this.rT[i] <= 0 && !this.tryStop(i, 20 + this.rand() * 25)) this.rT[i] = 4; }
        else { this.rp[i] -= this.v[i] * STEP; if (this.rp[i] <= 0 && !this.tryStop(i, 7 + this.rand() * 9)) this.rp[i] = 6; }
      }
    }
  }
  /** a stop ahead of car i on its lane piece (not near a junction, a lane of a street not a boulevard / alley, no tram;
   *  a delivery van only where it can pull 0.7 m right clear of the parked cars). -> started? */
  tryStop(i, dwell) {
    if (this.emN) return false;
    const p = this.path[i], g = this.W.slots[p >>> 16], pi = p & 0xffff;
    if (!g || g.kind[pi] || g.rank[pi] < 1 || g.rank[pi] > 3 || g.tram?.[pi]) return false;
    const v = this.v[i], ahead = Math.max(5, (v * v) / (2 * 1.6) + 2), at = this.d[i] + ahead;
    if (at > g.len[pi] - 12 - this.half[i] || at < this.half[i] + 4) return false;
    if (g.holdAt[pi] >= 0 && Math.abs(g.holdAt[pi] - at) < 22) return false;
    if (this.role[i] === ROLE.delivery && this.pk.grid.size && (this.parkClear(i, -0.7, ahead) < 0.05 || this.parkClear(i, -0.7, ahead + 3) < 0.05)) return false;
    if (this.role[i] === ROLE.delivery) {                                     // nobody right behind it (a queue only forms later)
      for (let j = g.head[pi]; j >= 0; j = this.nxt[j]) if (j !== i && this.posOn(j) < this.d[i] && this.d[i] - this.posOn(j) < 40) return false;
      const pv = this.prev[i] >= 0 ? this.W.slots[this.prev[i] >>> 16] : null;
      if (pv && this.d[i] < 40) for (let j = pv.head[this.prev[i] & 0xffff]; j >= 0; j = this.nxt[j]) if (j !== i) return false;
    }
    this.rst[i] = 1; this.stopD[i] = this.odo[i] + ahead; this.rT[i] = dwell;
    return true;
  }
  /** a standing delivery van as a box obstacle (the trafpark pass: followers ease round it when the other side is free) */
  deliveryObstacle(i) {
    let c = this.dvCar[i];
    if (!c) c = this.dvCar[i] = { x: 0, z: 0, heading: 0, type: "van_p", hidden: false, busy: true };
    c.x = this.x[i]; c.z = this.z[i]; c.heading = this.yaw[i]; c.type = this.types[this.type[i]].name;
    const T = this.types[this.type[i]], k = this.addBoxObstacle(c.x, c.z, c.heading, T.w / 2, T.len / 2);
    if (k != null) { this.obs.park[k] = 1; this.pk.car[k] = c; }
  }
  /** the gap (m, IDM's stop-line sense) to car i's planned stop: a bus's next stop on its line (front door at the pole),
   *  a delivery / bin stop; Infinity when none. Arriving: it stands (rst 2). */
  roleStop(i) {
    const role = this.role[i];
    if (role === ROLE.bus) {
      const b = this.bv[i];
      if (b < 0 || this.rst[i] === 2) return Infinity;
      const S = this.mix.routes[b].stops;
      let n = this.ns[i];
      while (n < S.length && S[n].at - 4.7 < this.rp[i] - 2.5) { n++; this.stats.busMissed = (this.stats.busMissed || 0) + 1; }
      this.ns[i] = n;
      if (n >= S.length) return Infinity;
      const g = S[n].at - 4.7 - this.rp[i];
      if (g > 70) return Infinity;
      if (g < 25) this.yr[i] = -0.55;                                    // towards the kerb
      if (this.v[i] < 0.3 && g < 1.2) {
        const h = this.params.hour, peak = (h >= 7 && h < 9.5) || (h >= 16 && h < 19);
        this.rst[i] = 2; this.rT[i] = (12 + this.rand() * 14) * (peak ? 1.3 : 1);
        this.stats.busStops = (this.stats.busStops || 0) + 1;
        return 0.05;
      }
      return g + 1.1;
    }
    if ((role === ROLE.delivery || role === ROLE.bin) && this.rst[i] === 1) {
      const g = this.stopD[i] - this.odo[i];
      if (g < -3) { this.rst[i] = 0; this.rT[i] = 10; this.rp[i] = 10; return Infinity; }   // (overshot: later)
      if (role === ROLE.delivery && g < 15) this.yr[i] = -0.7;
      if (this.v[i] < 0.25 && g < 0.9) { this.rst[i] = 2; this.stats.roleStops = (this.stats.roleStops || 0) + 1; return 0.05; }
      return g + 1.1;
    }
    return Infinity;
  }
  /** a bus's progress along its line (its OSM route): projected every 5 steps (every step near a stop); 4 s off the
   *  line (9 m) or past its end in the city: it leaves the line (removed out of sight); at a stop: the dwell */
  busTrack(i) {
    const b = this.bv[i];
    if (b < 0) return;
    const r = this.mix.routes[b];
    if (this.rst[i] === 2) { this.rT[i] -= STEP; if (this.rT[i] <= 0) { this.rst[i] = 0; this.ns[i]++; this.indT[i] = 3; } return; }
    const S = r.stops, n = this.ns[i], near = n < S.length && S[n].at - this.rp[i] < 90;
    if (!near && (this.steps + i) % 5) return;
    const Q = this._rp;
    routeProject(r, this.x[i], this.z[i], this.rp[i] - 10, this.rp[i] + 60, Q);
    if (Q[1] < 9) { this.rp[i] = Q[0]; this.offT[i] = 0; }
    else if ((this.offT[i] += near ? STEP : 5 * STEP) > 4) { this.bv[i] = -1; this.stats.busOff = (this.stats.busOff || 0) + 1; }
    if (this.rp[i] > r.len - 15) { this.bv[i] = -1; this.stats.busEnd = (this.stats.busEnd || 0) + 1; }
  }
  /** the buses: each line through the focus radius at its headway for the hour (sim.mix.headway): the expected number on
   *  its part in the radius = that length / (4.5 m/s x headway), spawned out of sight on the lane under its route */
  busPopulate(ctx, R, fx, fz) {
    const M = this.mix, h = this.params.hour;
    if (M.busIdx < 0 || !M.ready("bus")) return;
    const routes = M.routes;
    if (!this._busN || this._busN.length !== routes.length) { this._busN = new Int16Array(routes.length); this._busU = new Float32Array(routes.length); this._busUT = -1e9; }
    const N = this._busN; N.fill(0);
    for (let i = 0; i < this.cap; i++) if (this.alive[i] && this.role[i] === ROLE.bus && this.bv[i] >= 0) N[this.bv[i]]++;
    const now = this.steps * STEP;
    if (now - this._busUT > 120) { for (let k = 0; k < routes.length; k++) this._busU[k] = this.rand(); this._busUT = now; }
    const R2 = R * R, m2 = this.params.minSpawnDist ** 2;
    for (let v = 0; v < routes.length; v++) {
      const r = routes[v];
      if (!r.box) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let k = 0; k < r.x.length; k++) { a = Math.min(a, r.x[k]); b = Math.max(b, r.x[k]); c = Math.min(c, r.z[k]); d = Math.max(d, r.z[k]); } r.box = [a, b, c, d]; }
      if (fx < r.box[0] - R || fx > r.box[1] + R || fz < r.box[2] - R || fz > r.box[3] + R) continue;
      const hw = M.headway(r, h);
      if (!hw) continue;
      const X = r.x, Z = r.z, n = X.length;
      // (its length inside the radius: kept while the focus stays within 25 m)
      if (!(Math.abs(fx - (r.linX ?? 1e9)) < 25 && Math.abs(fz - r.linZ) < 25)) {
        let Lin = 0;
        for (let k = 0; k + 5 < n; k += 5) if ((X[k] - fx) ** 2 + (Z[k] - fz) ** 2 < R2) Lin += r.cum[k + 5] - r.cum[k];
        r.lin = Lin; r.linX = fx; r.linZ = fz;
      }
      const Lin = r.lin;
      if (Lin < 50) continue;
      const E = Lin / (4.5 * hw);
      if (N[v] >= Math.floor(E + this._busU[v])) continue;
      for (let t = 0; t < 6; t++) {
        const k = Math.floor(this.rand() * n), d2 = (X[k] - fx) ** 2 + (Z[k] - fz) ** 2;
        if (d2 > R2 || d2 < m2) continue;
        if (this.spawnBus(v, r.cum[k], ctx)) { N[v]++; break; }
      }
    }
  }
  /** a bus of line v at `at` m along it: on the lane under the route there (a lane piece heading its way, within 7 m),
   *  out of sight, with room (22 m on its lane, 20 m round), its route planned along its line */
  spawnBus(v, at, ctx) {
    const M = this.mix, r = M.routes[v], Q = this._rp;
    routePoint(r, at, Q);
    const x = Q[0], z = Q[1], dx = Q[2], dz = Q[3];
    if (ctx.visible(x, this.ground(x, z), z, 7)) return false;
    let best = -1, bl = 1e9, bAlong = 0;
    this.W.project(x, z, 7, (gid, along, lat, tx, tz) => {
      const g = this.W.slots[gid >>> 16], j = gid & 0xffff;
      if (!g || g.kind[j] || !g.core[j] || tx * dx + tz * dz < 0.85) return;
      if (lat < bl) { bl = lat; best = gid; bAlong = along; }
    });
    if (best < 0) return false;
    const g = this.W.slots[best >>> 16], j = best & 0xffff;
    if (bAlong < 8 || bAlong > g.len[j] - 8) return false;
    for (let q = g.head[j]; q >= 0; q = this.nxt[q]) if (Math.abs(this.posOn(q) - bAlong) < 22) return false;
    for (let q = 0; q < this.cap; q++) if (this.alive[q] && (this.x[q] - x) ** 2 + (this.z[q] - z) ** 2 < 400) return false;
    if (this.obsAhead(best, bAlong - 10, this.tmp) < 24) return false;
    const i = this.spawnAt(best, bAlong, g.speed[j] * 0.5, M.busIdx, M.busPaint(r));
    if (i < 0) return false;
    this.role[i] = ROLE.bus; this.bv[i] = v; this.rp[i] = at; this.speedF[i] = 0.92;
    let n = 0;
    while (n < r.stops.length && r.stops[n].at - 4.7 < at + 3) n++;
    this.ns[i] = n;
    for (let k = 0; k < ROUTE; k++) this.route[i * ROUTE + k] = -1;
    this.fillRoute(i);
    this.insertInList(i); this.stats.spawned++; this.stats.busSpawned = (this.stats.busSpawned || 0) + 1;
    return true;
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
      const vis = ctx.visible(this.x[i], this.y[i], this.z[i], Math.max(3.5, this.half[i] + 1));   // (TRAFMIX: a long vehicle by its far end)
      this.seen[i] = vis ? 1 : 0;
      const stuck = this.holdT[i] > 60 || (this.v[i] < 0.01 && this.route[i * ROUTE] < 0);
      if (this.keep[i]) continue;               // a game kit target (viewer/game/entities.js): never culled
      if (this.role[i] === ROLE.bus && this.bv[i] < 0 && !vis) { this.kill(i); this.stats.removed++; continue; }   // (TRAFMIX: a bus off its line / past its end)
      if (!vis && (d2 > (R + 25) * (R + 25) || stuck || (this.count > want + 6 && d2 > 60 * 60 && this.rand() < 0.2))) { this.kill(i); this.stats.removed++; }
    }
    if (this.mix?.routes) this.busPopulate(ctx, R, fx, fz);
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
      // (claude/ground, rule mover-ground) not where two drive layers stack (a street under a deck): a new car has no height to
      // pick its layer by; it gets there along its lane, on its own layer
      if (this.ground(x, z, -1e9) < y - 1.5) continue;
      if (ctx.visible(x, y, z, 4)) continue;
      if (d2 < P.minSpawnDist * P.minSpawnDist) continue;
      // room: nobody within 14 m on this path, not right before its hold point
      let ok = true;
      for (let j = g.head[i]; j >= 0; j = this.nxt[j]) if (Math.abs(this.posOn(j) - d) < 14) { ok = false; break; }
      if (ok) for (let j = 0; j < this.cap; j++) if (this.alive[j] && (this.x[j] - x) ** 2 + (this.z[j] - z) ** 2 < 100) { ok = false; break; }
      if (!ok || (g.holdAt[i] >= 0 && Math.abs(g.holdAt[i] - d) < 10)) continue;
      if (!TP_OLD && this.obsAhead(gid, d - 8, this.tmp) < 18) continue;       // (trafpark: never spawned into a parked car / obstacle)
      let ty = -1, paint = null, role = 0;
      if (this.mix) {                                                          // (TRAFMIX: the type and role by hour and place)
        const p = this.mix.pick(this._rnd, P.hour, x, z, g.rank[i]);
        ty = p.type; paint = p.paint; role = p.role;
        const T = this.types[ty], need = T.len / 2 + Math.abs(T.zc || 0) + 8;
        if (T.heavy && ctx.visible(x, y, z, need - 7)) continue;              // (out of sight by its far end)
        if (need > 14) {                                                       // a long vehicle needs a longer gap
          let ok2 = d > need - 6 && d < g.len[i] - 4;
          for (let j = g.head[i]; j >= 0 && ok2; j = this.nxt[j]) if (Math.abs(this.posOn(j) - d) < need + this.half[j]) ok2 = false;
          if (!ok2) continue;
        }
      }
      const k = this.spawnAt(gid, d, g.speed[i] * 0.6, ty, paint);
      if (k >= 0) { if (role) this.setRole(k, role); this.insertInList(k); made++; this.stats.spawned++; }
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
      if (!TP_OLD && this.pk.moved.has(slot)) return;                      // (trafpark: a shoved slot stands into the lane: never parked into; its car comes back when the tile reloads)
      const lane = this.laneAt(slot.x, slot.z, Math.sin(slot.heading), Math.cos(slot.heading));
      if (!lane) return;
      const { gid, along } = lane, g = this.W.slots[gid >>> 16];
      // a driving car 25-80 m before the slot, on its lane or on a lane leading into it (heading for it), its type fits
      if (along + 9 > g.len[gid & 0xffff]) return;
      const pi = gid & 0xffff;
      for (let e = -1; e < g.prevOff[pi + 1] - g.prevOff[pi]; e++) {
        const lane2 = e < 0 ? pi : g.prevIdx[g.prevOff[pi] + e], base = e < 0 ? 0 : g.len[lane2];
        for (let j = g.head[lane2]; j >= 0; j = this.nxt[j]) {
          if (this.state[j] !== ST.drive || this.hold[j] || this.keep[j] || this.ctl[j] || this.role[j] || (!TP_OLD && (this.room[j] || this.pwT[j] > 0))) continue;
          if (e >= 0 && this.route[j * ROUTE] !== gid) continue;
          const ahead = along + base - this.d[j];
          if (ahead < 25 || ahead > 80) continue;
          if (this.types[this.type[j]].len + 0.5 > (slot.room ?? 6) || this.types[this.type[j]].two) continue;   // (two-wheelers never park into car slots)
          this.state[j] = ST.inStop; this.slot[j] = slot; this.onD[j] = along + 9; this.parkPath[j] = gid;
          this.freeSlots.splice(k, 1);
          return;
        }
      }
    }
  }
  /** The lane piece (drive direction ~ (hx, hz)) nearest (x, z) within 4.5 m: { gid, along } or null. */
  laneAt(x, z, hx, hz, maxLat = 3.6, minDot = 0.8) {   // (carhit rejoin: minDot 0.45, a car left at up to 63 deg to its lane)   // a parallel slot sits ~2.5 m beside its lane; farther = a lane across a wide street
    let best = null, bl = maxLat;
    this.W.project(x, z, maxLat, (gid, along, lat, tx, tz) => {
      const g = this.W.slots[gid >>> 16];
      if (g.kind[gid & 0xffff] || !g.core[gid & 0xffff] || tx * hx + tz * hz < minDot || lat >= bl) return;
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
    // maneuver: an S-curve from the slot to the lane 10 m on (cubic Bezier, sampled); trafpark: the first of a few
    // S-curves (sharper out of the slot, or longer) whose body sweep clears the cars parked ahead / behind, else none
    this.manDir[i] = 1;
    let ok = false;
    for (const [k0, k3, ahead] of TP_OLD ? [[3.5, 4.5, 10]] : [[3.5, 4.5, 10], [2.2, 4.5, 10], [1.4, 5, 11], [1.0, 6, 12]]) {
      if (along + ahead + 2 > L) continue;
      this.W.point(gid, along + ahead, this.tmp);
      this.bezier(i, c.x, c.z, hx, hz, this.tmp[0], this.tmp[1], this.tmp[2], this.tmp[3], k0, k3);
      this.d[i] = along + ahead;
      if (this.manClear(i, c)) { ok = true; break; }
    }
    if (!ok) { this.kill(i); c.busy = true; this.stats.pullOutsSkipped = (this.stats.pullOutsSkipped || 0) + 1; return; }
    const dAt = this.d[i];
    this.state[i] = ST.outWait; this.manT[i] = 0; this.manDir[i] = 1; this.slot[i] = c;
    this.onPath[i] = -1; this.onD[i] = along;
    this.v[i] = 0; this.d[i] = dAt; this.offX[i] = this.offZ[i] = 0;
    this.pose(i); this.copyPrev(i);
    // the parked car is now this traffic car (same pose, type, paint): hide it in the parked fleet, same frame
    c.hidden = true; c.busy = true;
    this.onPark?.(c, true);
    this.stats.pullOuts++; this.handoff[i] = 1;
  }
  /** POLICE GAME: a car standing at (x, z, heading) off the lanes (a car parked on the tram rails) joins the traffic:
   *  the pull-out maneuver without a parked-fleet slot. Returns its index or -1. */
  joinFrom(x, z, heading, typeIdx, rgb) {
    const hx = Math.sin(heading), hz = Math.cos(heading);
    const lane = this.laneAt(x, z, hx, hz, 7);
    if (!lane) return -1;
    const { gid, along } = lane, L = this.plen(gid);
    const at = Math.min(L - 1, along + Math.min(12, Math.max(4, L - along - 2)));
    const i = this.spawnAt(gid, at, 0, typeIdx, rgb);
    if (i < 0) return -1;
    this.W.point(gid, at, this.tmp);
    this.bezier(i, x, z, hx, hz, this.tmp[0], this.tmp[1], this.tmp[2], this.tmp[3], 3, 3.5);
    this.state[i] = ST.out; this.manT[i] = 0; this.manDir[i] = 1; this.slot[i] = null;
    this.onPath[i] = gid; this.onD[i] = along; this.v[i] = 0.5; this.offX[i] = this.offZ[i] = 0;
    this.pose(i); this.copyPrev(i);
    this.insertInList(i);
    return i;
  }
  /** CARHIT (docs/CARHIT.md): knocked car i, standing where it stopped, joins the traffic again IN PLACE (same index, gen,
   *  type, paint, damage: a game's entity on it stays valid): the joinFrom() pull-out from its pose. A flee car (ctl 1)
   *  goes at once; the others wait for a gap with the indicator (outWait). -> 1 joined, 0 not now (no room: retry),
   *  -1 no lane its way within 7 m (a wreck). */
  rejoin(i) {
    const x = this.x[i], z = this.z[i], hx = Math.sin(this.yaw[i]), hz = Math.cos(this.yaw[i]);
    const lane = this.laneAt(x, z, hx, hz, 7, 0.45);
    if (!lane) return -1;
    const { gid, along } = lane, L = this.plen(gid);
    if (L - along < 4.5) return 0;
    const at = Math.min(L - 0.5, along + Math.min(12, Math.max(4, L - along - 2)));
    this.path[i] = gid; this.prev[i] = -1; this.pin[i] = 0; this.bL[i] = 0; this.pbL[i] = 0; this.d[i] = at; this.acc[i] = 0;
    for (let k = 0; k < ROUTE; k++) this.route[i * ROUTE + k] = -1;
    this.fillRoute(i);
    this.hold[i] = 0; this.holdT[i] = 0; this.stopDone[i] = -1; this.committed[i] = -1; this.waitT[i] = 0;
    this.room[i] = 0; this.offX[i] = this.offZ[i] = 0; this.yr[i] = 0; this.overT[i] = 0;
    if (this.pw) { this.pw[i] = 0; this.pwT[i] = 0; this.pwWait[i] = 0; this.pwSum[i] = 0; this.tpLA[i] = -1; this.creep[i] = 0; this.wf[i] = -1; }
    this.W.point(gid, at, this.tmp);
    this.bezier(i, x, z, hx, hz, this.tmp[0], this.tmp[1], this.tmp[2], this.tmp[3], 3, 3.5);
    this.manDir[i] = 1; this.manT[i] = 0; this.slot[i] = null;
    if (!this.manClear(i, null)) return 0;
    this.knock[i] = 0; this.kT[i] = 0;
    if (this.ctl[i] === 1) { this.state[i] = ST.out; this.onPath[i] = gid; this.v[i] = 0.5; }
    else { this.state[i] = ST.outWait; this.onPath[i] = -1; this.v[i] = 0; }
    this.onD[i] = along;
    this.pose(i); this.copyPrev(i);
    if (this.state[i] === ST.out) this.insertInList(i);
    return 1;
  }
  /** trafpark: car i's manoeuvre polyline (pull-out / reverse-in) as pose() drives it, clear of every parked car but
   *  `skip` (its own slot)? */
  manClear(i, skip) {
    if (TP_OLD || !this.pk.grid.size) return true;
    const hw = this.wb[i] / 2, F = this.tmp2, R = this.tmp3, L = this.manLen[i], dir = this.manDir[i] || 1;
    const half = Math.max(0.92, (this.types[this.type[i]]?.w ?? 1.84) / 2);
    for (let m = 0; m <= L + 1e-3; m += 0.5) {
      this.manPoint(i, m + hw * dir, F); this.manPoint(i, m - hw * dir, R);
      const yaw = Math.atan2(F[0] - R[0], F[1] - R[1]);
      if (this.bodyClear((F[0] + R[0]) / 2, (F[1] + R[1]) / 2, yaw, this.half[i], half, skip) < 0.03) return false;
    }
    return true;
  }
  /** trafpark: another car pulling out / reversing in within r m of car i? (two manoeuvres side by side cross) */
  nearManeuver(i, r = 14) {
    if (TP_OLD) return false;
    for (let j = 0; j < this.cap; j++) {
      if (j === i || !this.alive[j]) continue;
      const st = this.state[j];
      if ((st === ST.out || st === ST.inRev) && (this.x[j] - this.x[i]) ** 2 + (this.z[j] - this.z[i]) ** 2 < r * r) return true;
    }
    return false;
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
      // (trafpark: the S-curve checked again when it goes: a neighbour may have parked back meanwhile; blocked 20 s:
      // it stays parked)
      if (clear && (this.nearManeuver(i) || !this.manClear(i, this.slot[i]))) {
        clear = false;
        if (this.waitT[i] > 20 && !this.slot[i]) this.waitT[i] = 1.6;     // (carhit: a car rejoining after a knock waits on, it never vanishes)
        else if (this.waitT[i] > 20) { const c = this.slot[i]; if (c) { c.hidden = false; c.busy = true; this.onPark?.(c, false); } this.handoff[i] = 1; this.kill(i); this.stats.pullOutsSkipped = (this.stats.pullOutsSkipped || 0) + 1; return; }
      }
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
      if (p === this.parkPath[i] && ds < 1.8 && this.v[i] < 0.15 && (TP_OLD || (Math.abs(this.room[i]) < 0.03 && !this.nearManeuver(i)))) {   // (trafpark: back on its lane line first)
        // stopped: reverse into the slot
        const c = this.slot[i];
        if (!c) { this.state[i] = ST.drive; return baseMove.call(this, i); }
        const hx = Math.sin(this.yaw[i]), hz = Math.cos(this.yaw[i]);
        const shx = Math.sin(c.heading), shz = Math.cos(c.heading);
        // reverse: the polyline runs from the car's position backwards (tangent -heading) into the slot (tangent -slot heading)
        // (trafpark: the first reverse curve whose body sweep misses the slot's neighbours, else it drives on)
        this.manDir[i] = -1;
        let ok = false;
        for (const [k0, k3] of TP_OLD ? [[3.4, 3.4]] : [[3.4, 3.4], [2.6, 4.2], [4.2, 2.6], [2.0, 5.0]]) {
          this.bezier(i, this.x[i], this.z[i], -hx, -hz, c.x, c.z, -shx, -shz, k0, k3);
          if (this.manClear(i, c)) { ok = true; break; }
        }
        if (!ok) { this.slot[i] = null; this.state[i] = ST.drive; c.busy = true; this.stats.parkInsSkipped = (this.stats.parkInsSkipped || 0) + 1; return baseMove.call(this, i); }
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
