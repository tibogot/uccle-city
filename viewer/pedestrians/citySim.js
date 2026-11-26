// THE PEDESTRIANS' SIMULATION IN THE CITY (claude/peds2, rules peds-density, peds-no-alloc, peds-crossings-only): the
// lab's sim (viewer/pedestrians/sim.js: carrot steering on the graph, kerb queues, zebras with a glance, signals with a
// reaction delay, benches, platforms, groups, dives) on the city's walk graph (viewer/pedestrians/cityGraph.js), with:
//   population  people live within R m of the focus (the player / the orbit target); the target count is the walk
//               graph's length there weighted by place and hour (DENSITY x the place's hour curve x weekday x rain);
//               a new person is placed on a random edge (weighted the same way) OUT OF VIEW (or past FADE_FROM m, with
//               the 0.5 s dithered fade-in); people leave out of view only (past R_KEEP, or the farthest hidden ones
//               when over the target): no pop
//   cost        no allocation a frame: the next edge picked without arrays, one spot / kerb object per person reused,
//               the neighbour grid in typed arrays (sim.js); people past FAR m step at 20 Hz (their drawn state is
//               15 Hz past 64 m anyway: crowd.js)
//   tiles       people on a tile that unloads are taken out (that tile is far by then)
import { PedSim } from "./sim.js";
import { PLACE } from "./walkGraph.js";

export const R_SPAWN = 230, R_KEEP = 270;          // m from the focus
const FADE_FROM = 140;                              // m: a spawn in view is allowed this far (faded in), else hidden only
const FAR = 90;                                     // m: people this far from the camera step at 20 Hz
// people per metre of walk graph at the place's peak (weekday). Calibrated on Place de Saint-Job at 08:30 (~40-60 in view
// on a weekday morning, the owner's figure): docs/PEDESTRIANS.md "City"
export const DENSITY = { [PLACE.home]: 0.007, [PLACE.shop]: 0.028, [PLACE.transit]: 0.032, [PLACE.park]: 0.012, [PLACE.square]: 0.035 };
// the share of the peak by hour (0-23) per place (weekday; shops shut after 19:00 and on Sunday mornings, parks fill in
// the afternoon, transit has the two rush hours)
const H_HOME = [0.03, 0.02, 0.01, 0.01, 0.02, 0.06, 0.2, 0.6, 0.9, 0.6, 0.45, 0.5, 0.6, 0.55, 0.45, 0.55, 0.75, 0.9, 0.8, 0.55, 0.35, 0.22, 0.12, 0.06];
const H_SHOP = [0.02, 0.01, 0.01, 0.01, 0.01, 0.03, 0.1, 0.35, 0.6, 0.8, 0.9, 1.0, 1.0, 0.95, 0.9, 0.95, 1.0, 1.0, 0.9, 0.55, 0.3, 0.18, 0.08, 0.04];
const H_TRANSIT = [0.03, 0.01, 0.01, 0.01, 0.03, 0.15, 0.55, 1.0, 1.0, 0.6, 0.4, 0.45, 0.5, 0.45, 0.45, 0.6, 0.9, 1.0, 0.85, 0.5, 0.3, 0.2, 0.12, 0.06];
const H_PARK = [0.0, 0.0, 0.0, 0.0, 0.0, 0.02, 0.1, 0.3, 0.4, 0.45, 0.55, 0.65, 0.75, 0.8, 0.85, 0.9, 1.0, 1.0, 0.85, 0.5, 0.2, 0.06, 0.02, 0.0];
const H_SQUARE = [0.03, 0.02, 0.01, 0.01, 0.01, 0.04, 0.15, 0.55, 0.8, 0.8, 0.85, 1.0, 1.0, 0.9, 0.85, 0.9, 1.0, 1.0, 0.9, 0.6, 0.4, 0.25, 0.12, 0.05];
const CURVES = { [PLACE.home]: H_HOME, [PLACE.shop]: H_SHOP, [PLACE.transit]: H_TRANSIT, [PLACE.park]: H_PARK, [PLACE.square]: H_SQUARE };
const lerpH = (k, h) => { const i = Math.floor(h) % 24, f = h - Math.floor(h); return k[(i + 24) % 24] + (k[(i + 25) % 24] - k[(i + 24) % 24]) * f; };
/** people per metre at place `pl` at hour h (0-24); weekday 1 / weekend 0; rain 0..1 */
export function densityAt(pl, h, { weekend = false, rain = 0 } = {}) {
  let d = DENSITY[pl] * lerpH(CURVES[pl], h);
  if (weekend) d *= pl === PLACE.park ? 1.5 : pl === PLACE.transit ? 0.5 : pl === PLACE.shop ? (h < 12 ? 0.7 : 0.5) : 0.8;
  return d * (1 - 0.55 * Math.min(1, rain));
}

export class CitySim extends PedSim {
  constructor(world, opts = {}) {
    super(world, opts);
    this.focus = { x: 0, z: 0 };
    this.hour = 8.5; this.weekend = false; this.densityK = 1;
    this.cand = []; this.candW = new Float64Array(1024); this.candN = 0; this.candT = -1; this.candVer = -1; this.weighted = 0;
    this.frame = 0; this.scan = 0;
    this.counters.spawnFar = 0; this.counters.leftFar = 0; this.counters.tileDrop = 0; this.counters.carDives = 0; this.counters.carSteps = 0;
    while (this.people.length < this.max) { const p = this._newPerson(); p._acc = 0; p._spotO = { x: 0, z: 0 }; p._kerbO = { e: null, node: null, into: 0, t0: 0, glanced: false, walkFor: 0 }; p.carStep = null; p._carStepO = { dx: 0, dz: 0, t: 0 }; this.people.push(p); }
    this.alive = 0;
  }

  // ---------------------------------------------------------------- population
  /** the edges round the focus with their weights (1 Hz, or when the graph changed) */
  _candidates() {
    const g = this.w.graph, f = this.focus, R2 = R_SPAWN * R_SPAWN;
    this.candN = 0; let cum = 0;
    const opt = { weekend: this.weekend, rain: this.rain };
    const D = this._dens || (this._dens = new Float64Array(8));
    for (let pl = 0; pl < 5; pl++) D[pl] = densityAt(pl, this.hour, opt) * this.densityK;
    for (const T of g.tiles.values()) {
      if (!T.ready) continue;
      for (let i = 0; i < T.walk.length; i++) {
        const e = T.walk[i];
        if (e.dead) continue;
        const mx = (e.a.x + e.b.x) * 0.5 - f.x, mz = (e.a.z + e.b.z) * 0.5 - f.z;
        if (mx * mx + mz * mz > R2) continue;
        if (this.candN >= this.candW.length) { const W = new Float64Array(this.candW.length * 2); W.set(this.candW); this.candW = W; }
        cum += e.len * D[e.place];
        this.cand[this.candN] = e; this.candW[this.candN] = cum; this.candN++;
      }
    }
    this.weighted = cum;
    this.target = Math.min(this.max - 8, Math.round(cum));
    this.candT = this.t; this.candVer = g.version;
  }
  _pickEdge() {
    if (!this.candN) return null;
    const k = this.r() * this.weighted, W = this.candW;
    let lo = 0, hi = this.candN - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (W[m] < k) lo = m + 1; else hi = m; }
    return this.cand[lo];
  }
  /** place p on edge e at s (dir random); dressed anew */
  _placeOn(p, e, s, dir) {
    const r = this.r();
    p.gen = (p.gen || 0) + 1;
    if (!p.keepDress) this.dress(p); p.keepDress = false;
    p.leader = null; p.companion = null; p.action = null; p.talkT = 0; p.standUntil = 0; p.dive = null; p.diveTime = -1; p.backed = 0; p.seatNode = null; p.handHeld = false; p.seat = null;
    p.alive = true; p.edge = e; p.dir = dir; p.s = s; p.onCrossing = null; p.holding = false; p.tramWait = false; p.boarding = false; p.spotUntil = 0; p.glance = 0;
    p.fadeDir = 0; p.face = null; p.lane = (r - 0.5) * Math.min(0.9, e.width * 0.5); p.state = "walk"; p.hold = false; p.timer = 0; p.kerb = null; p.spot = null;
    p.leaving = false; p.v = p.vPref * 0.8; p.look = 0; p._acc = 0; p.carStep = null; p.dodge = 0; p.speed = p.v; p.turnRate = 0;
    const c = this._carrot(p, _c);
    p.x = c.x - dir * e.ux * 0.5; p.z = c.z - dir * e.uz * 0.5;
    p.yaw = Math.atan2(dir * e.ux, dir * e.uz);
    p.y = this.w.ground(p.x, p.z); p.gy = p.y;
  }
  _free() { for (let i = 0; i < this.people.length; i++) if (!this.people[i].alive) return this.people[i]; return null; }
  /** one spawn attempt: an edge by weight, a point on it; out of view, or in view past FADE_FROM m (faded in) */
  _spawnOne(initial) {
    const p = this._free(); if (!p) return false;
    for (let tries = 0; tries < 6; tries++) {
      const e = this._pickEdge(); if (!e) return false;
      const s = this.r() * e.len, x = e.a.x + e.ux * s, z = e.a.z + e.uz * s;
      const y = this.w.ground(x, z), seen = !initial && this.w.inView(x, y + 0.9, z);
      // in view and near: only on a tile that has just come in (it fades in itself: its people fade in with it)
      if (seen && this.w.camDist(x, y, z) < FADE_FROM && !(this.w.graph.tiles.get(e.tile)?.readyAt > performance.now() - 2000)) continue;
      this._placeOn(p, e, s, this.r() < 0.5 ? 1 : -1);
      if (seen) { p.fade = 0; p.fadeDir = 1 / 0.5; this.counters.spawnFaded++; this.counters.spawnFar++; } else { p.fade = 1; this.counters.spawnHidden++; }
      this.alive++;
      if (this.alive < this.target && p.age !== "child" && this.r() < this.groupShare) { this._companion(p, seen); }
      return true;
    }
    return false;
  }
  _companion(p, faded) {
    const q = this._free(); if (!q) return;
    const child = p.age === "adult" && !p.pram && this.r() < 0.45;
    const toddler = child && this.r() < 0.45 && !p.dog;
    this.dress(q, toddler ? "toddler" : child ? "child" : p.age === "old" ? "old" : "adult"); q.keepDress = true;
    this._placeOn(q, p.edge, p.s, p.dir);
    q.leader = p; q.side = this.r() < 0.5 ? 0.62 : -0.62; if (child) q.side = Math.sign(q.side) * 0.5;
    if (toddler) { p.family = "holdL"; p.style &= ~(64 | 16); p.vPref = Math.min(p.vPref, 1.0); q.side = 0.6 * (p.scale / 0.95); q.handHeld = true; }
    q.x = p.x + Math.cos(p.yaw) * q.side; q.z = p.z - Math.sin(p.yaw) * q.side; q.yaw = p.yaw; q.y = q.gy = this.w.ground(q.x, q.z);
    q.vPref = p.vPref; q.fade = faded ? 0 : 1; q.fadeDir = faded ? 1 / 0.5 : 0;
    p.companion = q; this.alive++;
  }
  /** take p out at once (it is out of view, or its tile went) */
  _drop(p) { p.alive = false; p.fade = 1; p.fadeDir = 0; if (p.seatNode && p.seatNode.taken === p) p.seatNode.taken = null; p.seatNode = null; this.alive--; }

  /** the tile `name` unloads: its people go (they are > 250 m away by then) */
  dropTile(name) {
    for (const p of this.people) if (p.alive && p.edge && p.edge.tile === name) { this._drop(p); this.counters.tileDrop++; }
  }

  step(dt) {
    this.t += dt; this.frame++;
    const g = this.w.graph;
    if (this.t - this.candT > 1 || this.candVer !== g.version) this._candidates();
    // count (cheap, exact: drops / fades change it outside this loop too)
    let alive = 0; for (let i = 0; i < this.people.length; i++) if (this.people[i].alive) alive++;
    this.alive = alive;
    // (boot, a teleport: nobody alive and a target: everyone placed at once, the loader covers it)
    const initial = this._refill || (this.alive === 0 && this.target > 0);
    let budget = initial ? 400 : 4;
    while (this.alive < this.target && budget-- > 0) if (!this._spawnOne(initial)) break;
    this._refill = false;
    // leaving: out of view only. Past R_KEEP from the focus (or off a dead edge); over the target, the farthest hidden
    // ones (a slice of the list each frame)
    const over = this.alive - Math.round(this.target * 1.08);
    const n = this.people.length, chunk = Math.min(n, 48);
    for (let k = 0; k < chunk; k++) {
      const p = this.people[(this.scan + k) % n];
      if (!p.alive || p.leader) continue;
      const fx = p.x - this.focus.x, fz = p.z - this.focus.z, far = fx * fx + fz * fz > R_KEEP * R_KEEP;
      const dead = p.edge && p.edge.dead && !p.kerb;
      if (dead || ((far || (over > 0 && p.dist > 60)) && !p.inView)) {
        if (p.companion && p.companion.alive) { this._drop(p.companion); this.counters.leftFar++; }
        this._drop(p); this.counters.leftFar++;
      }
    }
    this.scan = (this.scan + chunk) % Math.max(1, n);
    this._buildGrid();
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i];
      if (!p.alive) continue;
      // far people step at 20 Hz (not while crossing or queueing: they are the traffic's obstacles)
      if (p.dist > FAR && !p.onCrossing && !p.kerb && !p.dive && ((i + this.frame) % 3)) { p._acc += dt; continue; }
      const d = dt + p._acc; p._acc = 0;
      if (p.carStep) this._carStep(p, d);
      this._stepPerson(p, Math.min(d, 0.1));
    }
  }

  // ---------------------------------------------------------------- the graph (no arrays a frame)
  _pickNext(p, node, e0) {
    const r = this.r(), E = node.edges;
    let tot = 0, cnt = 0;
    for (let i = 0; i < E.length; i++) { const e = E[i]; if (e === e0 || e.dead) continue; tot += this._w(e, p); cnt++; }
    if (!cnt) { if (!e0.dead) { this._enter(p, e0, node); return true; } this._drop(p); return false; }   // a dead end: back
    let k = r * tot, e = null;
    for (let i = 0; i < E.length; i++) { const x = E[i]; if (x === e0 || x.dead) continue; k -= this._w(x, p); e = x; if (k <= 0) break; }
    if (e.kind === "cross" || e.kind === "zebra") {
      const into = e.a === node ? 1 : -1;
      const nx = -e.uz, nz = e.ux, lat = (this.r() - 0.5) * Math.max(0, e.width - 0.8), back = 0.25 + this.r() * 0.6;
      const K = p._kerbO; K.e = e; K.node = node; K.into = into; K.t0 = this.t; K.glanced = false; K.walkFor = 0;
      p.kerb = K;
      p.spot = p._spotO; p.spot.x = node.x + nx * lat - e.ux * into * back; p.spot.z = node.z + nz * lat - e.uz * into * back;
      p.face = Math.atan2(e.ux * into, e.uz * into);
      p.delay = 0.2 + this.r() * 1.3;
      p.redRunner = this.r() < this.redRunnerShare;
      return false;
    }
    this._enter(p, e, node);
    return true;
  }
  _w(e, p) {
    // crossings a little less taken than going on; seats not with a pram / dog / toddler; links less
    if (e.kind === "cross" || e.kind === "zebra") return 0.6;
    const o = e.b.sit ? e.b : e.a.sit ? e.a : null;
    if (o) return p.pram || p.dog || p.family === "holdL" || (o.taken && o.taken.alive && o.taken.seat) ? 0 : e.weight;
    return e.weight;
  }
  _atNode(p, node, dt) {
    if (p.kerb) return this._crossing(p, dt);
    if (p.tramWait) return this._tram(p, node);
    if (node.kind === "pause" && p.state !== "pause" && this.r() < (node.pause || 0.4)) {
      if (node.sit && ((node.taken && node.taken.alive && node.taken.seat && node.taken !== p) || p.pram || p.dog || p.family === "holdL")) return this._pickNext(p, node, p.edge);
      p.state = "pause"; p.timer = (node.minT ?? 3) + this.r() * ((node.maxT ?? 15) - (node.minT ?? 3));
      p.spot = p._spotO;
      if (node.sit) { p.spot.x = node.x; p.spot.z = node.z; p.seat = node.sit; node.taken = p; p.seatNode = node; }
      else { p.spot.x = node.x + (this.r() - 0.5) * (node.spread ?? 1); p.spot.z = node.z + (this.r() - 0.5) * (node.spread ?? 1); }
      p.face = node.face ?? p.yaw;
      return false;
    }
    if (p.state === "pause") return false;
    if (node.kind === "board" && node.board && !p.leader && this.r() < 0.6) return this._tram(p, node);
    return this._pickNext(p, node, p.edge);
  }
  _crossing(p, dt) {
    const k = p.kerb, w = this.w, e = k.e;
    if (e.dead) { p.kerb = null; p.spot = null; p.face = null; return this._pickNext(p, k.node, e); }
    const arrived = Math.hypot(p.x - p.spot.x, p.z - p.spot.z) < 0.35;
    if (!arrived) return false;
    let go = false;
    if (e.kind === "cross") {
      if (w.signal.walk(e.signal)) { k.walkFor += dt; go = k.walkFor > p.delay; }
      else { k.walkFor = 0; if (p.redRunner && this.t - k.t0 > 2 && w.carsNear(e, k.node).clear) { go = true; this.counters.redRunners++; this.counters.redCrossings++; } }
    } else {
      if (!k.glanced) { k.glanced = true; p.glance = 1.6; return false; }
      if (p.glance > 0) return false;
      go = w.carsNear(e, k.node).canGo;
    }
    if (!go) return false;
    const lx = p.spot.x, lz = p.spot.z;
    p.kerb = null; p.spot = null; p.face = null;
    this._enter(p, e, k.node);
    const nx = -e.uz, nz = e.ux;
    p.lane = ((lx - k.node.x) * nx + (lz - k.node.z) * nz) * p.dir;
    return true;
  }
  /** the tram stop: wait spread along the platform; when a tram stands there with its doors open, to the nearest door,
   *  fade out there (boarded); else after a while walk on */
  _tram(p, node) {
    const T = node.tram;                                // (cityPeds.js: { docked, doors: Float32Array x z, n })
    if (!p.tramWait) {
      p.tramWait = true; p.state = "pause"; p.timer = 60 + this.r() * 240;
      const B = node.board, along = (this.r() - 0.5) * (node.spreadZ ?? 10), across = (this.r() - 0.5) * 0.8;
      p.spot = p._spotO; p.spot.x = node.x + B.ux * along - B.uz * across; p.spot.z = node.z + B.uz * along + B.ux * across;
      p.face = null;
      return false;
    }
    if (T && T.docked && T.n) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < T.n; i++) { const d = (T.doors[i * 2] - p.x) ** 2 + (T.doors[i * 2 + 1] - p.z) ** 2; if (d < bd) { bd = d; bi = i; } }
      const dx = T.doors[bi * 2], dz = T.doors[bi * 2 + 1];
      p.boarding = true; p.spot.x = dx; p.spot.z = dz; p.state = "walk"; p.timer = 0;
      if (bd < 0.5 * 0.5) { p.tramWait = false; p.boarding = false; this.counters.boarded++; p.fadeDir = -1 / 0.35; this.counters.removedFaded++; }
      return false;
    }
    if (p.boarding) { p.boarding = false; p.state = "pause"; p.timer = 10; }
    if (p.state !== "pause") { p.tramWait = false; p.spot = null; return this._pickNext(p, node, p.edge); }   // waited enough
    return false;
  }
  /** people step off a tram at door (x, z), onto the platform's board node */
  alightAt(x, z, node) {
    const p = this._free(); if (!p || !node.edges.length) return;
    const e = node.edges[Math.floor(this.r() * node.edges.length)];
    this._placeOn(p, e, e.a === node ? 0.01 : e.len - 0.01, e.a === node ? 1 : -1);
    p.x = x; p.z = z; p.y = p.gy = this.w.ground(x, z);
    p.fade = 0; p.fadeDir = 1 / 0.35; p.spotUntil = this.t + 1.2; p.spot = p._spotO; p.spot.x = node.x + (this.r() - 0.5) * 2; p.spot.z = node.z + (this.r() - 0.5) * 2;
    this.alive++; this.counters.alighted++; this.counters.spawnFaded++;
  }
  _seatNear(L) {
    const s = L.seatNode; if (!s) return null;
    for (const e of s.edges) { const o = e.a === s ? e.b : e.a; for (const f of o.edges) { const n = f.a === o ? f.b : f.a; if (n !== s && n.sit && (!n.taken || !n.taken.alive || !n.taken.seat)) return n; } }
    return null;
  }

  // ---------------------------------------------------------------- cars (the player's, the traffic's)
  /** a calm step back from a slow car: (dx, dz) away, over ~0.9 s */
  stepBack(p, dx, dz) {
    if (p.carStep || p.dive || !p.alive) return;
    const l = Math.hypot(dx, dz) || 1, S = p._carStepO; S.dx = dx / l; S.dz = dz / l; S.t = 0.9; p.carStep = S;
    this.counters.carSteps++;
  }
  _carStep(p, dt) {
    const S = p.carStep, k = Math.min(dt, S.t);
    p.x += S.dx * 1.3 * k; p.z += S.dz * 1.3 * k; S.t -= dt;
    if (S.t <= 0) p.carStep = null;
  }
}
const _c = { x: 0, z: 0 };
