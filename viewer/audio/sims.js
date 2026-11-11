// Small simulations that turn "a car / tram / train / bird / bell" into engine sources and events. Shared by
// the Sound Lab (live) and the offline renders (same code, explicit clock). step(t, dt) per control step.
import { createCarVoice, playDoor, playHorn } from "./vehicles.js";
import { createTramVoice, createTrainVoice, playBogieClack, playTramBell, playTramChime, playTramDoors, playTrainHorn } from "./transit.js";
import { BIRDS, birdActivity, barkBuffer, playHourStrikes } from "./ambience.js";
import { playBuffer, clamp } from "./util.js";

// ---- paths ------------------------------------------------------------------------------------------------
// A polyline of straights and arcs: [{ len }] or [{ arc: radius, angle (rad, +left) }], from (x, z, heading).
export function makePath(x0, z0, h0, parts) {
  const segs = []; let x = x0, z = z0, h = h0, s = 0;
  for (const p of parts) {
    if (p.len) { segs.push({ s, len: p.len, x, z, h, k: 0 }); x += Math.sin(h) * p.len; z += Math.cos(h) * p.len; s += p.len; }
    else { const len = Math.abs(p.angle) * p.arc, k = Math.sign(p.angle) / p.arc; segs.push({ s, len, x, z, h, k });
      // integrate the arc exactly
      const h1 = h + p.angle; x += (Math.cos(h) - Math.cos(h1)) / k; z += (Math.sin(h1) - Math.sin(h)) / k; h = h1; s += len; }
  }
  const total = s;
  return {
    length: total,
    at(sq) {
      sq = clamp(sq, 0, total);
      let g = segs[segs.length - 1]; for (const q of segs) if (sq < q.s + q.len) { g = q; break; }
      const u = sq - g.s;
      if (!g.k) return { x: g.x + Math.sin(g.h) * u, z: g.z + Math.cos(g.h) * u, h: g.h, k: 0 };
      const h1 = g.h + g.k * u;
      return { x: g.x + (Math.cos(g.h) - Math.cos(h1)) / g.k, z: g.z + (Math.sin(h1) - Math.sin(g.h)) / g.k, h: h1, k: Math.abs(g.k) };
    },
  };
}

// ---- car ----------------------------------------------------------------------------------------------------
// profile: "cycle" (idle 3 s, pull away to 50 km/h, cruise 5 s, brake to a stop, repeat), "cruise" (constant
// speed v), "dyno" (does not move: speed/load from the cycle, for hearing the engine alone), "manual".
export class CarSim {
  constructor(engine, bank, { path, s0 = 0, profile = "cycle", v = 13.9, kind = "petrol", surface = "asphalt", loop = true, priority = 1.2 } = {}) {
    Object.assign(this, { engine, bank, path, s: s0, profile, vCruise: v, loop });
    this.phase = "idle"; this.tPhase = 0;
    const src = this.src = { category: "traffic", priority, ref: 3.5, range: 260, doppler: true, x: 0, y: 0.5, z: 0, speed: profile === "cruise" ? v : 0, load: 0, kind, surface, seed: Math.random(),
      create: (ctx, input, now) => createCarVoice(ctx, bank, input, src, now) };
    this.place(); engine.add(src);
  }
  place() { const p = this.path.at(this.s); const s = this.src; s.x = p.x; s.z = p.z; s.heading = p.h; s.vx = this.profile === "dyno" ? 0 : Math.sin(p.h) * s.speed; s.vz = this.profile === "dyno" ? 0 : Math.cos(p.h) * s.speed; }
  step(t, dt) {
    const s = this.src;
    if (this.profile === "cycle" || this.profile === "dyno") {
      this.tPhase += dt;
      let a = 0;
      if (this.phase === "idle") { s.load = 0; if (this.tPhase > 3) { this.phase = "pull"; this.tPhase = 0; } }
      else if (this.phase === "pull") { s.load = 0.85; a = 2.4 * (1 - s.speed / (this.vCruise * 1.05)); if (s.speed >= this.vCruise * 0.98) { this.phase = "cruise"; this.tPhase = 0; } }
      else if (this.phase === "cruise") { s.load = 0.22; a = (this.vCruise - s.speed) * 0.5; if (this.tPhase > 5) { this.phase = "brake"; this.tPhase = 0; } }
      else if (this.phase === "brake") { s.load = -0.6; a = -3.2; if (s.speed <= 0.05) { s.speed = 0; this.phase = "idle"; this.tPhase = 0; } }
      s.speed = Math.max(0, s.speed + a * dt);
    } else if (this.profile === "cruise") { s.load = 0.22; s.speed = this.vCruise; }
    if (this.profile !== "dyno") { this.s += s.speed * dt; if (this.loop && this.s > this.path.length) this.s -= this.path.length; }
    this.place();
  }
  door(close = true) { const s = this.src; return this.engine.event({ category: "traffic", priority: 1.5, ref: 2, range: 60, x: s.x + 1, y: 0.8, z: s.z }, (ctx, out, when) => playDoor(ctx, this.bank, out, when, close, Math.floor(Math.random() * 3))); }
  horn(len = 0.37) { const s = this.src; return this.engine.event({ category: "traffic", priority: 3, ref: 8, range: 300, x: s.x, y: 0.7, z: s.z, vx: s.vx, vz: s.vz, doppler: true, follow: s, dy: 0.2 }, (ctx, out, when) => playHorn(ctx, this.bank, out, when, len)); }
}

// ---- tram 92 ------------------------------------------------------------------------------------------------
// Runs along a path with a speed limit per position (curves), stops at `stop` (s position): bell before the
// curve and when leaving, doors + chime at the stop. Two sources (front bogie with traction, rear), 28 m apart.
export class TramSim {
  constructor(engine, bank, { path, s0 = 0, stop = null, dwell = 18, vmax = 11, vCurve = 4.5, loop = true, squealHz = [1250, 3240] } = {}) {
    Object.assign(this, { engine, bank, path, s: s0, stop, dwell, vmax, vCurve, loop, v: 0, a: 0, dwellLeft: 0, bellAt: -1, rangBefore: false });
    this.params = { squeal: 1, motorGain: 1, rollGain: 1, squealHz, bellHi: 1046, bellLo: 784 };
    this.parts = ["front", "rear"].map((part) => {
      const src = { category: "transit", priority: 1.6, ref: 5, range: 320, doppler: true, x: 0, y: 0.6, z: 0, part, seed: Math.random(), speed: 0, accel: 0, curvature: 0,
        create: (ctx, input, now) => createTramVoice(ctx, bank, input, src, now) };
      engine.add(src); return src;
    });
    this.place();
  }
  limitAhead(s) { let v = this.vmax; for (let d = 0; d <= 40; d += 4) { const p = this.path.at(s + d); if (p.k > 1 / 60) v = Math.min(v, Math.sqrt(this.vCurve ** 2 + 2 * 1.0 * d)); } return v; }
  place() {
    this.parts.forEach((src, i) => {
      const p = this.path.at(this.s - i * 28 - 4); Object.assign(src, { x: p.x, z: p.z, heading: p.h, curvature: p.k, speed: this.v, accel: this.a,
        vx: Math.sin(p.h) * this.v, vz: Math.cos(p.h) * this.v, squeal: this.params.squeal, motorGain: this.params.motorGain, rollGain: this.params.rollGain, squealHz: this.params.squealHz });
    });
  }
  step(t, dt) {
    if (this.dwellLeft > 0) {
      this.dwellLeft -= dt; this.v = 0; this.a = 0;
      if (this.dwellLeft <= this.dwell - 1.5 && !this.chimed) { this.chimed = true; this.chime(); }
      if (this.dwellLeft <= 4 && !this.doorsClosed) { this.doorsClosed = true; this.doors(); }
      if (this.dwellLeft <= 0) { this.bell(); this.left = true; }
    } else {
      let target = this.limitAhead(this.s);
      if (this.stop != null && !this.left) { const d = this.stop - this.s; if (d > 0) target = Math.min(target, Math.sqrt(2 * 1.1 * Math.max(0, d - 0.5))); }
      const a = clamp((target - this.v) * 1.2, -1.3, 1.2);
      this.a = a; this.v = Math.max(0, this.v + a * dt); this.s += this.v * dt;
      if (this.stop != null && !this.left && this.v < 0.05 && this.stop - this.s < 1.5) { this.dwellLeft = this.dwell; this.chimed = this.doorsClosed = false; this.doors(); }
      // Ring before entering the curve (the Saint-Job curve has a crossing).
      const ahead = this.path.at(this.s + 35);
      if (ahead.k > 1 / 60 && !this.rangBefore) { this.rangBefore = true; this.bell(); }
      if (ahead.k === 0) this.rangBefore = false;
      if (this.loop && this.s - 32 > this.path.length) { this.s = 0; this.left = false; }
    }
    this.place();
  }
  at() { return this.parts[0]; }
  _ev(spec, fn) { const f = this.parts[0]; return this.engine.event({ category: "transit", priority: 2.5, ref: 4, range: 260, x: f.x, y: 2.5, z: f.z, vx: f.vx, vz: f.vz, doppler: true, follow: f, dy: 1.9, ...spec }, fn); }
  bell() { return this._ev({ priority: 3, ref: 6 }, (ctx, out, when) => playTramBell(ctx, this.bank, out, when, { hi: this.params.bellHi, lo: this.params.bellLo })); }
  chime() { return this._ev({ ref: 2, range: 50, wet: 0.5 }, (ctx, out, when) => playTramChime(ctx, this.bank, out, when)); }
  doors() { return this._ev({ ref: 2.5, range: 70, y: 1.2 }, (ctx, out, when) => playTramDoors(ctx, this.bank, out, when)); }
}

// ---- AM08 train -----------------------------------------------------------------------------------------------
// Three 27 m cars along a straight line; per car one rolling source (motored end cars carry traction whine).
// Joints / switches at fixed positions: every bogie crossing a joint fires a two-axle clack AT the joint
// (bogie wheelbase 2.6 m, bogie centres 19 m apart in a car) -> the "ta-dum ... ta-dum" rhythm.
export class TrainSim {
  constructor(engine, bank, { x0 = -600, z = 0, dir = 1, v = 33, joints = [0], hornAt = null, len = 600 } = {}) {
    Object.assign(this, { engine, bank, x: x0, z, dir, v, joints, hornAt, len, horned: false });
    this.cars = [0, 1, 2].map((i) => {
      const src = { category: "transit", priority: 1.8, ref: 8, range: 700, doppler: true, x: 0, y: 1, z, motored: i !== 1, speed: v, accel: 0, seed: Math.random(),
        create: (ctx, input, now) => createTrainVoice(ctx, bank, input, src, now) };
      engine.add(src); return src;
    });
    // Axle-pair (bogie) offsets behind the train front, metres.
    this.bogies = []; for (let c = 0; c < 3; c++) for (const b of [4, 23]) this.bogies.push(c * 27 + b);
    this.place();
  }
  place() { this.cars.forEach((s, i) => { s.x = this.x - this.dir * (i * 27 + 13.5); s.speed = this.v; s.vx = this.dir * this.v; s.vz = 0; }); }
  step(t, dt) {
    const x1 = this.x + this.dir * this.v * dt;
    for (const j of this.joints) for (let b = 0; b < this.bogies.length; b++) {
      const off = this.bogies[b], p0 = this.x - this.dir * off, p1 = x1 - this.dir * off;
      if ((p0 - j) * (p1 - j) <= 0 && p0 !== p1) {
        const when = t + Math.abs((j - p0) / (p1 - p0)) * dt;
        this.engine.event({ category: "transit", priority: 1.4, ref: 3, range: 400, x: j, y: 0.3, z: this.z }, (ctx, out) => playBogieClack(ctx, this.bank, out, when, 2.6 / this.v, b), when);
      }
    }
    if (this.hornAt != null && !this.horned && this.dir * (this.x - this.hornAt) >= 0) { this.horned = true; this.horn(); }
    this.x = x1; this.place();
    if (this.dir * this.x > this.len) { this.x = -this.dir * this.len; this.horned = false; }
  }
  horn() { const c = this.cars[0], s = { x: c.x + this.dir * 13, y: 3.6, z: this.z, vx: this.dir * this.v, vz: 0, follow: c, dy: 2.6 }; return this.engine.event({ category: "transit", priority: 3, ref: 12, range: 900, doppler: true, ...s }, (ctx, out, when) => playTrainHorn(ctx, this.bank, out, when)); }
}

// ---- birds ----------------------------------------------------------------------------------------------------
const PAUSE = { blackbird: [3, 7], robin: [2.5, 6], greattit: [5, 12], woodpigeon: [8, 18], magpie: [10, 40], crow: [8, 30] };
export class BirdChorus {
  constructor(engine, bank, perches, clock) { Object.assign(this, { engine, bank, perches, clock }); this.birds = perches.map((p) => ({ ...p, next: Math.random() * 4 })); this.density = 1; }
  step(t) {
    const { hour, month } = this.clock();
    for (const b of this.birds) {
      if (t < b.next) continue;
      const act = birdActivity(b.species, hour, month) * this.density;
      if (Math.random() < act) {
        const v = Math.floor(Math.random() * 4), buf = this.bank.song(b.species, v);
        this.engine.event({ category: "nature", priority: 0.7 + act * 0.5, ref: b.species === "woodpigeon" ? 2 : 3, range: b.species === "crow" || b.species === "magpie" ? 260 : 160, x: b.x, y: b.y, z: b.z, wet: 0.8 },
          (ctx, out, when) => playBuffer(ctx, buf, out, when, { gain: 0.6, rate: 0.98 + Math.random() * 0.04 }));
        const [a, c] = PAUSE[b.species]; b.next = t + buf.duration + a + Math.random() * (c - a);
      } else b.next = t + 2 + Math.random() * 4;
    }
  }
}

// ---- bells on the hour ------------------------------------------------------------------------------------------
export class BellTowers {
  constructor(engine, bank, towers, clock) { Object.assign(this, { engine, bank, towers, clock }); this.lastHour = null; }
  ring(hour, t) {
    for (const tw of this.towers) {
      const when = t + (tw.delay ?? 0);
      this.engine.event({ category: "bells", priority: 3, ref: 25, range: 3000, x: tw.x, y: tw.y, z: tw.z, wet: 1.2, noOcclusion: false },
        (ctx, out) => playHourStrikes(ctx, this.bank, out, when, hour, tw), when);
    }
  }
  step(t) { const { hour, minute } = this.clock(); const h = Math.floor(hour); if (this.lastHour !== null && h !== this.lastHour && (minute ?? 0) < 1) this.ring(h, t); this.lastHour = h; }
}

// ---- a dog in a garden ------------------------------------------------------------------------------------------
export class Dog {
  constructor(engine, ctx, pos, { every = [25, 70], size = 1 } = {}) { Object.assign(this, { engine, pos, every }); this.bufs = [1, 2, 3].map((s) => barkBuffer(ctx, s, size)); this.next = 3; }
  bark(t) { const b = this.bufs[Math.floor(Math.random() * 3)]; this.engine.event({ category: "people", priority: 1.3, ref: 3, range: 220, ...this.pos }, (ctx, out, when) => playBuffer(ctx, b, out, when, { gain: 0.8 }), t); }
  step(t) { if (t >= this.next) { this.bark(t); this.next = t + this.every[0] + Math.random() * (this.every[1] - this.every[0]); } }
}

export { BIRDS };
