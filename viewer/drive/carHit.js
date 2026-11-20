// CAR-CAR CONTACT, BOTH WAYS (docs/CARHIT.md; ?carpush=old = before: the traffic cars were one-way obstacles, the
// player's car pushed out of their boxes as out of a wall, the parked cars shoved by a clamped nudge).
// Owner 2026-11-18: "we need collision with the cars, being able to push them".
//
// A small rigid-body solver on the ground plane (x, z, yaw; vx, vz, yaw rate; mass + yaw inertia per car type), pure JS,
// fixed-size typed arrays, no allocation per step:
//   contact     oriented box vs oriented box (obb.js SAT: normal + depth), the contact point = the corners of each box
//               inside the other (a corner nudge: that corner; bumper to bumper: the middle of the overlap); an impulse
//               j = -(1 + e) vn / (1/mA + 1/mB + (rA x n)^2 / IA + (rB x n)^2 / IB) with a speed-dependent restitution
//               (a bumper tap bounces, a crash crumples) + a Coulomb friction impulse <= mu j along the contact: so the
//               angle and the speed decide (a rear-corner nudge spins a car, a T-bone shoves it sideways, a tap barely
//               moves it, a van moves less than a small car); the player's car takes the reaction (its own mass)
//   knocked     a hit car leaves its lane (trafficSim ST.knocked): its four tyres, two axles, a friction circle each (the
//               driver brakes after a reaction time; a parked car is on its handbrake), a big hit takes grip away for a
//               moment (it slides), the lateral forces at the axles turn it (a spun car stops spinning on its tyres);
//               it collides with the drive colliders (buildings, walls, trees, posts, kerbs as ledges, trams: never
//               pushed into or through one), stops, hazards on, then rejoins the traffic (trafficSim rejoin(): the
//               joinFrom pull-out in place) after a few seconds, or stays as a wreck (cleared out of sight)
//   parked      a parked car hit by the player becomes a knocked car of the traffic sim (the pull-out hand-over: same
//               pose, type, paint, the parked one hidden the same frame), pushed the same way; where it stops it is
//               handed back to the parked fleet (undamaged) or stays standing there dented (while its tile is loaded)
//   awake       only the cars the player touched run the solver (<= 16 bodies, woken on contact, asleep when settled)
//   damage      per corner (FL FR RL RR), from the hit's change of speed; drawn by the fleet's vertex shader (carPacks.js
//               crumpleOffset, the accident props' fold) and on the player's car (one uniform)
//   player      `player.damage` 0..1, corner depths, and an event "carHit" { other, impulse, point, speed, damage }
//
// Heading convention (carPhysics.js): forward = (sin h, cos h), left = (cos h, -sin h); a yaw rate w moves the point
// at r by w (rz, -rx); the torque of an impulse J at r is rz Jx - rx Jz.
import { gather, itemContact, heightClear, KIND } from "./colliders.js";
import { stepContact } from "./carEnv.js";
import { obbObb } from "./obb.js";

export const CARPUSH_OLD = typeof location !== "undefined" && /[?&]carpush=old(&|$)/.test(location.search);
const G = 9.81;
const KNOCKED = 5;                     // trafficSim.js ST.knocked
/** kg, kerb weight + a driver (cars2 family, real classes: Polo / Golf / Passat estate / Passat / Tiguan / Caddy /
 *  Transit Custom loaded / Prius taxi) */
export const MASS = { hatch_s: 1150, hatch_c: 1300, estate: 1500, saloon: 1520, suv: 1800, van_c: 1650, van_p: 2300, taxi: 1530, police: 1580,
  police_t: 1650, ambulance: 4500, fire: 15000, bus: 13000, bin: 20000 };   // (claude/trafmix: the service vehicles)
/** kg, the player's two-wheelers with their rider */
export const MASS2 = { moto: 300, scooter: 200, villo: 100 };
export const massOf = (type) => MASS[type] ?? 1450;
/** yaw inertia of a w x l box of mass m, x0.85 (the mass sits between the axles more than a uniform box) */
export const inertiaOf = (m, hx, hz) => m * (4 * hx * hx + 4 * hz * hz) / 12 * 0.85;

export const HIT = {
  eTap: 0.3, eCrash: 0.06, eSpan: 10,  // restitution: 0.3 at a 1 m/s touch (bumpers spring back) down to 0.06 at 11 m/s (crumple)
  muBody: 0.4,                         // body on body (paint, bumpers)
  eWall: 0.1, muWall: 0.35,            // a knocked car on a wall / building / post
  muTyre: 0.95,                        // tyre on asphalt
  react: 0.45, roll: 0.06, brake: 0.85, // s before the hit car's driver brakes, g rolling before / braking after
  park: 0.55,                          // g: a parked car (handbrake on the rear wheels + in gear)
  gripMin: 0.25, gripAt: 4, gripBack: 1.6,   // a hit that changes the contact corner's speed by gripAt m/s takes the side grip down to gripMin (a
                                       // shaken car slides and spins on), back over gripBack s
  wakeTraffic: 0.5, wakeKnocked: 0.05, wakeParked: 0.08,   // m/s closing speed that wakes a driving / knocked / parked car
  sleepV: 0.05, sleepW: 0.03, sleepT: 0.4,                  // settled: below these for sleepT s
  rejoinT: 3.5, fleeRejoinT: 1.2,      // s standing (hazards on) before it drives on
  wreckDv: 7, wreckDepth: 0.4,         // this much change of speed over one wake (summed: a 60 km/h ram ~9), or this much crumple: a wreck
  dentFrom: 1.2, dentK: 0.024, dentHit: 0.14, dentCap: 0.28,  // m of crumple per m/s of change of speed over dentFrom
  clearNear: 70, clearFar: 280,        // a wreck goes when out of sight past clearNear m, or past clearFar
};
const N = 16, P = N;                   // body slots; slot P = the player's vehicle during a solve
const NEAR_T = 16;                     // traffic cars listed per body per frame
const KL = 64;                         // knocked sim cars tracked

const hyp = (a, b) => Math.sqrt(a * a + b * b);   // (Math.hypot allocates in some tiers: the step must not)

export class CarHitWorld {
  /** sets(x, z, r) -> collider sets (driveMode.js), ground(x, z, near) -> drive surface, movers: rail boxes (movers.js) */
  constructor({ sets = null, ground = null, movers = null } = {}) {
    this.sets = sets; this.ground = ground || (() => 0); this.movers = movers;
    const F = () => new Float64Array(N + 1);
    Object.assign(this, { x: F(), z: F(), h: F(), vx: F(), vz: F(), w: F(), iM: F(), iI: F(), m: F(), hx: F(), hz: F(), a: F(),
      y: F(), grip: F(), still: F(), age: F(), evT: F() });
    this.act = new Uint8Array(N); this.si = new Int32Array(N).fill(-1); this.gen = new Uint32Array(N); this.parked = new Uint8Array(N);
    this.dent = new Float64Array(N * 4);          // m per corner (a body's; copied to / from the sim's 3-bit code)
    this.hitDv = new Float64Array(N);              // the largest change of speed of this wake (wreck test)
    this.near = Array.from({ length: N }, () => []);   // the static items round each awake body (gathered per frame)
    this.tn = new Int32Array(N * NEAR_T); this.tc = new Int32Array(N);   // traffic cars near each body
    this.nAwake = 0; this.consumed = 0;
    this.player = { m: 1380, two: false, damage: 0, corners: new Float64Array(4), lastImpulse: 0, hits: 0 };
    this.cp = new Float64Array(3); this.ob = { nx: 0.5, nz: 0.5, depth: 0.5 }; this.ct = { nx: 0.5, nz: 0.5, depth: 0.5, kind: 0 };
    this.box = { hx: 0.5, hz: 0.5, cos: 0.5, sin: 0.5 }; this.bc = { x: 0.5, z: 0.5, y: 0.5 };   // (double fields from the start: no boxing on write)
    this.mbox = new Float32Array(24 * 7);
    this.jn = 0; this.vn = 0;
    this.listeners = [];
    this.onPlayerDamage = null;
    this.stats = { awake: 0, knocked: 0, pairs: 0, solves: 0, statics: 0, ms: 0, msMax: 0, wrecks: 0, rejoined: 0, parkedPushed: 0, handedBack: 0 };
    this.T = null; this.S = null;
  }
  on_(f) { this.listeners.push(f); return () => { const k = this.listeners.indexOf(f); if (k >= 0) this.listeners.splice(k, 1); }; }
  /** subscribe to "carHit" { other: { kind: "traffic" | "parked" | "body", index, type }, impulse (N s), point { x, z },
   *  speed (closing, m/s), damage (the player's, 0..1) } */
  on(ev, f) { return ev === "carHit" ? this.on_(f) : () => {}; }

  // ---------------------------------------------------------------- the traffic (viewer/traffic/traffic.js T)
  attachTraffic(T) {
    this.T = T; this.S = T.sim;
    const cap = this.S.cap;
    this.bodyOf = new Int16Array(cap).fill(-1);
    this.org = new Uint8Array(cap);              // 1 a traffic car, 2 a parked car shoved
    this.pobj = new Array(cap).fill(null);       // the parked fleet's car object (org 2)
    this.typeIdx = Object.create(null);
    T.types.forEach((t, k) => { this.typeIdx[t.name] = k; });
    this.kl = new Int32Array(KL); this.klGen = new Uint32Array(KL); this.klN = 0;
    this.tb = new Float32Array(32 * 7); this.ti = new Int32Array(32);
  }

  // ---------------------------------------------------------------- bodies
  alloc() { for (let k = 0; k < N; k++) if (!this.act[k]) return k; return -1; }
  setBody(k, x, z, h, vx, vz, w, m, hx, hz, a) {
    this.x[k] = x; this.z[k] = z; this.h[k] = h; this.vx[k] = vx; this.vz[k] = vz; this.w[k] = w;
    this.m[k] = m; this.iM[k] = 1 / m; this.iI[k] = 1 / inertiaOf(m, hx, hz); this.hx[k] = hx; this.hz[k] = hz; this.a[k] = a;
    this.grip[k] = 1; this.still[k] = 0; this.age[k] = 0; this.evT[k] = -1; this.hitDv[k] = 0;
    if (k < N) { this.act[k] = 1; this.nAwake++; for (let q = 0; q < 4; q++) this.dent[k * 4 + q] = 0; this.tc[k] = 0; }
  }
  /** a free body (no traffic car behind it: the tests, a game's prop). -> slot or -1 */
  addBody({ x, z, h = 0, type = "hatch_c", m = massOf(type), w = 1.81, len = 4.31, wb = 2.66, vx = 0, vz = 0, yawRate = 0, parked = false, braking = false, y = 0 }) {
    const k = this.alloc();
    if (k < 0) return -1;
    this.setBody(k, x, z, h, vx, vz, yawRate, m, w / 2, len / 2, wb / 2);
    this.si[k] = -1; this.parked[k] = parked ? 1 : 0; this.y[k] = y;
    if (braking) this.age[k] = HIT.react;                          // (standing in a queue: the foot on the brake)
    this.gatherNear(k);
    return k;
  }
  free(k) { if (this.act[k]) { this.act[k] = 0; this.nAwake--; } if (this.T && this.si[k] >= 0 && this.bodyOf[this.si[k]] === k) this.bodyOf[this.si[k]] = -1; this.si[k] = -1; }
  gatherNear(k) {
    const L = this.near[k];
    L.length = 0;
    if (!this.sets) return;
    const r = hyp(this.hx[k], this.hz[k]) + hyp(this.vx[k], this.vz[k]) * 0.12 + 1.5;
    for (const col of this.sets(this.x[k], this.z[k], r)) gather(col, this.x[k], this.z[k], r, L);
  }

  // ---------------------------------------------------------------- the solver
  /** restitution for a closing speed */
  rest(vn) { return Math.max(HIT.eCrash, HIT.eTap - (HIT.eTap - HIT.eCrash) * Math.max(0, vn - 1) / HIT.eSpan); }
  /** impulse at (px, pz), n = the push of i out of j (j < 0: a static, infinite mass); this.jn, this.vn <- normal
   *  impulse, closing speed. Returns jn (0: separating). */
  impulse(i, j, px, pz, nx, nz, e, mu) {
    const X = this.x, Z = this.z, VX = this.vx, VZ = this.vz, W = this.w, iM = this.iM, iI = this.iI;
    const rix = px - X[i], riz = pz - Z[i];
    let rjx = 0, rjz = 0, mj = 0, ij = 0;
    let vrx = VX[i] + W[i] * riz, vrz = VZ[i] - W[i] * rix;
    if (j >= 0) { rjx = px - X[j]; rjz = pz - Z[j]; vrx -= VX[j] + W[j] * rjz; vrz -= VZ[j] - W[j] * rjx; mj = iM[j]; ij = iI[j]; }
    const vn = vrx * nx + vrz * nz;
    this.jn = 0; this.vn = -vn;
    if (vn >= 0) return 0;
    const cri = riz * nx - rix * nz, crj = rjz * nx - rjx * nz;
    const jn = -(1 + e) * vn / (iM[i] + mj + cri * cri * iI[i] + crj * crj * ij);
    VX[i] += nx * jn * iM[i]; VZ[i] += nz * jn * iM[i]; W[i] += cri * jn * iI[i];
    if (j >= 0) { VX[j] -= nx * jn * mj; VZ[j] -= nz * jn * mj; W[j] -= crj * jn * ij; }
    // friction along the contact (Coulomb, <= mu jn; never more than stops the sliding)
    vrx = VX[i] + W[i] * riz; vrz = VZ[i] - W[i] * rix;
    if (j >= 0) { vrx -= VX[j] + W[j] * rjz; vrz -= VZ[j] - W[j] * rjx; }
    const d = vrx * nx + vrz * nz, tx0 = vrx - d * nx, tz0 = vrz - d * nz, vt = hyp(tx0, tz0);
    if (vt > 1e-5 && mu > 0) {
      const tx = tx0 / vt, tz = tz0 / vt, cti = riz * tx - rix * tz, ctj = rjz * tx - rjx * tz;
      const jt = Math.min(mu * jn, vt / (iM[i] + mj + cti * cti * iI[i] + ctj * ctj * ij));
      VX[i] -= tx * jt * iM[i]; VZ[i] -= tz * jt * iM[i]; W[i] -= cti * jt * iI[i];
      if (j >= 0) { VX[j] += tx * jt * mj; VZ[j] += tz * jt * mj; W[j] += ctj * jt * ij; }
    }
    this.jn = jn;
    this.stats.solves++;
    return jn;
  }
  /** the contact point of boxes i and j (n: the push of i out of j) into this.cp: the corners of each inside the other
   *  (2 cm slack), averaged; none (edge across edge): between the deepest corners */
  pairPoint(i, j, nx, nz) {
    const C = this.cp;
    C[0] = C[1] = C[2] = 0;
    this.inside(i, j); this.inside(j, i);
    if (C[2] > 0) { C[0] /= C[2]; C[1] /= C[2]; return; }
    this.deepest(i, -nx, -nz); const ax = C[0], az = C[1];
    this.deepest(j, nx, nz); C[0] = (C[0] + ax) / 2; C[1] = (C[1] + az) / 2;
  }
  inside(a, b) {
    const C = this.cp, sa = Math.sin(this.h[a]), ca = Math.cos(this.h[a]), sb = Math.sin(this.h[b]), cb = Math.cos(this.h[b]);
    const hxa = this.hx[a], hza = this.hz[a], hxb = this.hx[b] + 0.02, hzb = this.hz[b] + 0.02;
    for (let q = 0; q < 4; q++) {
      const su = q & 1 ? 1 : -1, sw = q & 2 ? 1 : -1;
      const px = this.x[a] + su * hxa * ca + sw * hza * sa, pz = this.z[a] - su * hxa * sa + sw * hza * ca;
      const dx = px - this.x[b], dz = pz - this.z[b], u = dx * cb - dz * sb, w = dx * sb + dz * cb;
      if (u <= hxb && u >= -hxb && w <= hzb && w >= -hzb) { C[0] += px; C[1] += pz; C[2]++; }
    }
  }
  /** the corner(s) of box a furthest along (dx, dz) (within 3 cm: averaged, a face) into this.cp */
  deepest(a, dx, dz) {
    const C = this.cp, s = Math.sin(this.h[a]), c = Math.cos(this.h[a]), hx = this.hx[a], hz = this.hz[a];
    let best = -Infinity;
    for (let q = 0; q < 4; q++) {
      const su = q & 1 ? 1 : -1, sw = q & 2 ? 1 : -1, d = (su * hx * c + sw * hz * s) * dx + (-su * hx * s + sw * hz * c) * dz;
      if (d > best) best = d;
    }
    let sx = 0, sz = 0, n = 0;
    for (let q = 0; q < 4; q++) {
      const su = q & 1 ? 1 : -1, sw = q & 2 ? 1 : -1, ox = su * hx * c + sw * hz * s, oz = -su * hx * s + sw * hz * c;
      if (ox * dx + oz * dz > best - 0.03) { sx += ox; sz += oz; n++; }
    }
    C[0] = this.x[a] + sx / n; C[1] = this.z[a] + sz / n;
  }
  /** crumple at body k's corners near (px, pz) for a change of speed dv (m/s), shared by where the point is (a centred
   *  head-on: both front corners; a corner: that one); -> the deepest corner's depth */
  dentAt(k, px, pz, dv) {
    const add = Math.min(HIT.dentHit, Math.max(0, (dv - HIT.dentFrom) * HIT.dentK));
    if (add <= 0) return 0;
    const s = Math.sin(this.h[k]), c = Math.cos(this.h[k]), dx = px - this.x[k], dz = pz - this.z[k];
    const u = (dx * c - dz * s) / this.hx[k], w = (dx * s + dz * c) / this.hz[k];
    const sL = Math.min(1, Math.max(0, 0.5 + u)), sF = Math.min(1, Math.max(0, 0.5 + w));
    const o = k === P ? 0 : k * 4, D = k === P ? this.player.corners : this.dent;
    D[o] = Math.min(HIT.dentCap, D[o] + add * sL * sF); D[o + 1] = Math.min(HIT.dentCap, D[o + 1] + add * (1 - sL) * sF);
    D[o + 2] = Math.min(HIT.dentCap, D[o + 2] + add * sL * (1 - sF)); D[o + 3] = Math.min(HIT.dentCap, D[o + 3] + add * (1 - sL) * (1 - sF));
    return Math.max(D[o], D[o + 1], D[o + 2], D[o + 3]);
  }
  /** the change of speed of body k's point (px, pz) under a normal impulse jn: the translation + the turn it starts */
  cornerDv(k, px, pz, nx, nz, jn) { const cr = (pz - this.z[k]) * nx - (px - this.x[k]) * nz; return jn * (this.iM[k] + cr * cr * this.iI[k]); }
  /** a hit on body k (not the player): the side grip goes for a moment, the wreck test */
  shaken(k, dv, dvLin = 0) {
    if (k >= N) return;
    this.grip[k] = Math.min(this.grip[k], 1 - (1 - HIT.gripMin) * Math.min(1, dv / HIT.gripAt));
    if (dvLin > 1.5) this.hitDv[k] += dvLin;                       // (the wreck test: the real hits of this wake, summed; a push is not one)
    this.still[k] = 0;
  }
  /** two awake bodies (i may be P) overlapping: n the push of i out of j, depth */
  pair(i, j, nx, nz, depth) {
    const iMi = this.iM[i], iMj = this.iM[j], s = iMi + iMj;
    this.x[i] += nx * depth * iMi / s; this.z[i] += nz * depth * iMi / s;
    this.x[j] -= nx * depth * iMj / s; this.z[j] -= nz * depth * iMj / s;
    this.pairPoint(i, j, nx, nz);
    const px = this.cp[0], pz = this.cp[1];
    // the closing speed first (the restitution depends on it)
    const rix = px - this.x[i], riz = pz - this.z[i], rjx = px - this.x[j], rjz = pz - this.z[j];
    const vn = -((this.vx[i] + this.w[i] * riz - this.vx[j] - this.w[j] * rjz) * nx + (this.vz[i] - this.w[i] * rix - this.vz[j] + this.w[j] * rjx) * nz);
    if (vn <= 0) return 0;
    const jn = this.impulse(i, j, px, pz, nx, nz, this.rest(vn), HIT.muBody);
    if (jn <= 0) return 0;
    this.stats.pairs++;
    const dvi = jn * iMi, dvj = jn * iMj;
    this.dentAt(i, px, pz, dvi); this.dentAt(j, px, pz, dvj);
    this.shaken(i, this.cornerDv(i, px, pz, nx, nz, jn), dvi); this.shaken(j, this.cornerDv(j, px, pz, nx, nz, jn), dvj);
    return jn;
  }
  /** body k pushed out of a static by depth along n: positional + an impulse at its deepest corner */
  wall(k, nx, nz, depth) {
    this.x[k] += nx * depth; this.z[k] += nz * depth;
    this.deepest(k, -nx, -nz);
    const jn = this.impulse(k, -1, this.cp[0], this.cp[1], nx, nz, HIT.eWall, HIT.muWall);
    if (jn > 0) { const dv = jn * this.iM[k]; this.dentAt(k, this.cp[0], this.cp[1], dv); if (dv > 2) this.shaken(k, dv * 0.5, dv); }
    this.stats.statics++;
  }

  // ---------------------------------------------------------------- one body's tyres
  /** two axles, a friction circle each (load m g / 2): the longitudinal force brakes (rolling, then the driver's brake;
   *  a parked car its handbrake), the lateral force takes the axle's side speed away (all of it within the grip, so a car
   *  at rest stays at rest); the lateral forces' torque about the centre turns / stops the turning of the car */
  tyres(k, h) {
    const s = Math.sin(this.h[k]), c = Math.cos(this.h[k]);
    let u = this.vx[k] * s + this.vz[k] * c, v = this.vx[k] * c - this.vz[k] * s, w = this.w[k];
    const m = this.m[k], I = 1 / this.iI[k], a = this.a[k], Nax = m * G / 2;
    const brk = (this.parked[k] ? HIT.park : this.age[k] < HIT.react ? HIT.roll : HIT.brake) * G * m / 2;
    const cap = HIT.muTyre * this.grip[k] * Nax, mLat = 1 / (1 / m + a * a / I);
    let Fu = 0, Fv = 0, tau = 0;
    for (let ax = 1; ax >= -1; ax -= 2) {
      const va = v + ax * w * a;
      let fu = -u * m * 0.25 / h;
      if (fu > brk) fu = brk; else if (fu < -brk) fu = -brk;
      let fv = -va * mLat * 0.5 / h;
      const L = hyp(fu, fv);
      if (L > cap) { fu *= cap / L; fv *= cap / L; }
      Fu += fu; Fv += fv; tau += ax * a * fv;
    }
    u += Fu / m * h; v += Fv / m * h; w += tau / I * h;
    this.vx[k] = s * u + c * v; this.vz[k] = c * u - s * v; this.w[k] = w;
    const g = this.grip[k];
    if (g < 1) this.grip[k] = Math.min(1, g + h / HIT.gripBack);
  }
  integrate(k, h) {
    this.tyres(k, h);
    this.h[k] += this.w[k] * h;
    this.x[k] += this.vx[k] * h; this.z[k] += this.vz[k] * h;
    this.age[k] += h;
  }
  /** body k against the drive colliders round it (gathered per frame), the ledges (kerbs climbed, walls not), the rails */
  statics(k) {
    const L = this.near[k], B = this.box, ct = this.ct;
    B.hx = this.hx[k]; B.hz = this.hz[k]; B.cos = Math.cos(this.h[k]); B.sin = Math.sin(this.h[k]);
    const y = this.y[k];
    for (let pass = 0; pass < 2; pass++) {
      let any = false;
      for (let q = 0; q < L.length; q += 2) {
        const col = L[q], id = L[q + 1];
        if (id < col.P) {
          const kd = col.pkind[id];
          if (kd === KIND.island || kd === KIND.hedge) continue;       // (ridden up / soft, as for the player's car)
          if (heightClear(col, id, y)) continue;
          const ref = col.pref?.[id];
          if (ref && ref.hidden) continue;                              // (a parked car out of its slot: drawn elsewhere)
        }
        if (!itemContact(col, id, this.x[k], this.z[k], B, ct)) continue;
        if (ct.kind === KIND.hedge) continue;
        // another parked car: it is pushed too (chain), when a slot is free; else it stands as a wall
        if (pass === 0 && this.T && id < col.P && col.pref?.[id] && this.closing(k, ct.nx, ct.nz) > HIT.wakeParked && this.wakeParked(col.pref[id]) >= 0) continue;
        this.wall(k, ct.nx, ct.nz, Math.min(ct.depth, 0.5));
        any = true;
      }
      if (!any) break;
    }
    const bc = this.bc;
    bc.x = this.x[k]; bc.z = this.z[k]; bc.y = y;
    if (Number.isFinite(y) && stepContact(bc, B, this.groundAt, ct)) this.wall(k, ct.nx, ct.nz, ct.depth);
    if (this.movers) {
      const n = this.movers.bodies(this.x[k], this.z[k], 8, this.mbox), M = this.mbox, o = this.ob;
      for (let q = 0; q < n; q++) {
        const r = q * 7;
        if (M[r + 5] > y + 1.6 || M[r + 5] + M[r + 6] < y + 0.2) continue;
        if (obbObb(this.x[k], this.z[k], this.h[k], B.hx, B.hz, M[r], M[r + 1], M[r + 2], M[r + 3], Math.abs(M[r + 4]) + (M[r + 4] < 0 ? 1.5 : 0), o)) this.wall(k, o.nx, o.nz, Math.min(o.depth, 0.5));
      }
    }
  }
  groundAt = (x, z) => this.ground(x, z, this.bc.y);
  /** body k's centre velocity into a static along n (approach speed, > 0 closing) */
  closing(k, nx, nz) { return -(this.vx[k] * nx + this.vz[k] * nz); }

  /** advance every awake body by h: tyres, then body on body, body on the traffic, body on the colliders */
  substep(h) {
    if (!this.nAwake) return;
    for (let k = 0; k < N; k++) if (this.act[k]) this.integrate(k, h);
    const o = this.ob;
    for (let i = 0; i < N; i++) {
      if (!this.act[i]) continue;
      for (let j = i + 1; j < N; j++) {
        if (!this.act[j]) continue;
        const dx = this.x[i] - this.x[j], dz = this.z[i] - this.z[j], r = this.hz[i] + this.hz[j] + 0.6;
        if (dx * dx + dz * dz > r * r || Math.abs(this.y[i] - this.y[j]) > 1.5) continue;
        if (obbObb(this.x[i], this.z[i], this.h[i], this.hx[i], this.hz[i], this.x[j], this.z[j], this.h[j], this.hx[j], this.hz[j], o)) this.pair(i, j, o.nx, o.nz, o.depth);
      }
    }
    if (this.T) for (let k = 0; k < N; k++) if (this.act[k] && this.tc[k]) this.bodyTraffic(k);
    for (let k = 0; k < N; k++) if (this.act[k]) this.statics(k);
  }

  // ---------------------------------------------------------------- the traffic's cars (sim indices)
  /** sim car i's drawn box into this.sb (x, z, yaw, hw, hl, y) and velocity (vx, vz) */
  simBox(i) {
    const S = this.S, a = this.T.alpha ?? 1, b = 1 - a, B = this.sb || (this.sb = new Float64Array(8)), ty = this.T.types[S.type[i]];
    let dy = S.yaw[i] - S.pyaw[i];
    if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
    B[0] = S.px[i] * b + S.x[i] * a; B[1] = S.pz[i] * b + S.z[i] * a; B[2] = S.pyaw[i] + dy * a;
    if (ty.zc) { B[0] += Math.sin(B[2]) * ty.zc; B[1] += Math.cos(B[2]) * ty.zc; }   // (claude/trafmix: a long body off the axles)
    B[3] = ty.w / 2; B[4] = ty.len / 2; B[5] = S.y[i];
    const v = S.state[i] === KNOCKED ? 0 : S.v[i];
    B[6] = Math.sin(B[2]) * v; B[7] = Math.cos(B[2]) * v;
    return B;
  }
  bodyTraffic(k) {
    const S = this.S, o = this.ob, base = k * NEAR_T;
    for (let q = 0; q < this.tc[k]; q++) {
      const i = this.tn[base + q];
      if (!S.alive[i] || this.bodyOf[i] >= 0) continue;
      const B = this.simBox(i);
      if (Math.abs(B[5] - this.y[k]) > 1.5) continue;
      if (!obbObb(this.x[k], this.z[k], this.h[k], this.hx[k], this.hz[k], B[0], B[1], B[2], B[3], B[4], o)) continue;
      const vn = -((this.vx[k] - B[6]) * o.nx + (this.vz[k] - B[7]) * o.nz);
      const thr = S.state[i] === KNOCKED ? HIT.wakeKnocked : HIT.wakeTraffic;
      const j = vn > thr ? this.wakeSim(i) : -1;
      if (j >= 0) this.pair(k, j, o.nx, o.nz, o.depth);
      else this.wall(k, o.nx, o.nz, Math.min(o.depth, 0.5));       // (it brakes for us: the sim's obstacle)
    }
  }
  /** wake sim car i as a body (a driving car: its lane speed and turn rate; a knocked one: at rest). -> slot or -1 */
  wakeSim(i) {
    const S = this.S, T = this.T;
    if (this.bodyOf[i] >= 0) return this.bodyOf[i];
    const ty = T.types[S.type[i]];
    if (!ty || ty.two || !S.alive[i]) return -1;
    if (ty.heavy && massOf(ty.name) > 3000) return -1;          // (claude/trafmix: a bus / truck is not shoved: a wall that brakes for us)
    if (S.state[i] !== KNOCKED && !this.listAdd(i)) return -1;
    const k = this.alloc();
    if (k < 0) return -1;
    const B = this.simBox(i);
    let w = 0;
    if (S.state[i] !== KNOCKED) {
      let dy = S.yaw[i] - S.pyaw[i];
      if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
      w = dy / 0.05;                                             // (the sim's 20 Hz step)
      if (!this.org[i]) this.org[i] = 1;
      if (S.slot[i]) { S.freeSlots.push(S.slot[i]); S.slot[i] = null; }   // (a car pulling out / parking: its slot is free)
    }
    this.setBody(k, B[0], B[1], B[2], B[6], B[7], w, massOf(ty.name), ty.w / 2, ty.len / 2, S.wb[i] / 2);
    this.si[k] = i; this.gen[k] = S.gen[i]; this.parked[k] = this.org[i] === 2 ? 1 : 0; this.y[k] = S.y[i];
    if (S.state[i] === KNOCKED || S.v[i] < 0.5) this.age[k] = HIT.react;   // (standing / settled: the foot on the brake already)
    const code = S.dmg[i];
    for (let q = 0; q < 4; q++) this.dent[k * 4 + q] = ((code >> (q * 3)) & 7) * 0.04;
    if (S.knock[i] === 3) this.hitDv[k] = HIT.wreckDv;              // (a wreck pushed again stays a wreck)
    this.bodyOf[i] = k;
    S.state[i] = KNOCKED; S.knock[i] = 1; S.kT[i] = 0; S.onPath[i] = -1; S.room[i] = 0; S.offX[i] = S.offZ[i] = 0; S.acc[i] = 0;
    S.x[i] = S.px[i] = B[0]; S.z[i] = S.pz[i] = B[1]; S.yaw[i] = S.pyaw[i] = B[2]; S.py[i] = S.y[i]; S.ppitch[i] = S.pitch[i];
    this.gatherNear(k);
    this.nearTraffic(k);
    return k;
  }
  /** a parked car (carFleet.js object) the player / a body hit: a knocked car of the traffic in its place (hidden in
   *  the parked fleet the same frame). -> slot or -1 (no traffic, no lane round it, no free slot) */
  wakeParked(c) {
    const S = this.S;
    if (!S || c.hidden || this.alloc() < 0 || this.klN >= KL) return -1;
    const ti = this.typeIdx[c.type];
    if (ti === undefined) return -1;
    // a path for the sim car (its tile: the lanes of the street it is parked in; unloaded with it)
    let gid = -1, along = 0, best = 40;
    S.W.project(c.x, c.z, 40, (g, al, lat) => { if (lat < best) { best = lat; gid = g; along = al; } });
    if (gid < 0) return -1;
    const i = S.spawnAt(gid, along, 0, ti, [c.col.r, c.col.g, c.col.b]);
    if (i < 0) return -1;
    if (!this.listAdd(i)) { S.handoff[i] = 1; S.kill(i); return -1; }
    S.state[i] = KNOCKED; S.knock[i] = 4; S.onPath[i] = -1; S.handoff[i] = 1; S.bits[i] = 32;
    const y = Number.isFinite(c.y) ? c.y : S.y[i];
    S.x[i] = S.px[i] = c.x; S.z[i] = S.pz[i] = c.z; S.yaw[i] = S.pyaw[i] = c.heading; S.y[i] = S.py[i] = y; S.pitch[i] = S.ppitch[i] = c.pitch || 0;
    this.org[i] = 2; this.pobj[i] = c;
    c.hidden = true; c.busy = true;
    S.onPark?.(c, true);                       // (carFleet.touch: its colliders drop, the fleet redraws without it)
    this.stats.parkedPushed++;
    return this.wakeSim(i);
  }
  /** track knocked sim car i (fixed list) -> false when full and nothing can make room */
  listAdd(i) {
    for (let q = 0; q < this.klN; q++) if (this.kl[q] === i && this.klGen[q] === this.S.gen[i]) return true;
    if (this.klN >= KL) {
      // room: a shoved parked car standing, else a wreck nobody sees
      let ev = -1;
      for (let q = 0; q < this.klN && ev < 0; q++) { const j = this.kl[q]; if (this.S.knock[j] === 4) ev = q; }
      for (let q = 0; q < this.klN && ev < 0; q++) { const j = this.kl[q]; if (this.S.knock[j] === 3 && !this.S.keep[j] && !(this.T.fleet.shown?.[j] >= 0)) ev = q; }
      if (ev < 0) return false;
      this.retire(ev, true);
    }
    this.kl[this.klN] = i; this.klGen[this.klN] = this.S.gen[i]; this.klN++;
    return true;
  }
  /** list entry q ends: a parked car goes back to the parked fleet (where it stands), a wreck is removed */
  retire(q, remove) {
    const S = this.S, i = this.kl[q];
    if (S.alive[i] && S.gen[i] === this.klGen[q]) {
      if (this.bodyOf[i] >= 0) this.free(this.bodyOf[i]);
      if (this.org[i] === 2) this.handBack(i);
      else if (remove) { S.kill(i); this.stats.wrecks++; }
    } else if (this.pobj[i]) { const c = this.pobj[i]; c.hidden = false; S.onPark?.(c, false); }   // (killed under us: show the parked car)
    this.org[i] = 0; this.pobj[i] = null;
    this.kl[q] = this.kl[this.klN - 1]; this.klGen[q] = this.klGen[this.klN - 1]; this.klN--;
  }
  /** a shoved parked car, standing: back into the parked fleet at its new pose (its colliders follow: carFleet.touch) */
  handBack(i) {
    const S = this.S, c = this.pobj[i];
    if (c) {
      const h = S.yaw[i], s = Math.sin(h), k = Math.cos(h);
      c.x = S.x[i]; c.z = S.z[i]; c.y = S.y[i]; c.heading = h; c.pitch = 0; c.roll = 0;
      const e = c.m?.elements;
      if (e) { e[0] = k; e[1] = 0; e[2] = -s; e[3] = 0; e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0; e[8] = s; e[9] = 0; e[10] = k; e[11] = 0; e[12] = c.x; e[13] = c.y; e[14] = c.z; e[15] = 1; }
      c.hidden = false;
      S.onPark?.(c, false);
      this.stats.handedBack++;
    }
    S.handoff[i] = 1;
    S.kill(i);
    this.pobj[i] = null; this.org[i] = 0;
  }
  /** the traffic cars within reach of body k (once per frame) */
  nearTraffic(k) {
    if (!this.T) return;
    const S = this.S, base = k * NEAR_T, r = this.hz[k] + 2.6 + hyp(this.vx[k], this.vz[k]) * 0.1;
    let n = 0;
    for (let i = 0; i < S.cap && n < NEAR_T; i++) {
      if (!S.alive[i] || this.bodyOf[i] === k) continue;
      const dx = S.x[i] - this.x[k], dz = S.z[i] - this.z[k], rr = r + 2.8;
      if (dx * dx + dz * dz > rr * rr) continue;
      this.tn[base + n++] = i;
    }
    this.tc[k] = n;
  }
  /** the traffic's obstacle hook (cityTraffic.js setObstacleSource): every knocked car is a box the cars brake for */
  addObstacles(sim) {
    if (!this.S) return;
    const S = this.S;
    for (let q = 0; q < this.klN; q++) {
      const i = this.kl[q];
      if (!S.alive[i] || S.gen[i] !== this.klGen[q] || S.state[i] !== KNOCKED) continue;
      const ty = this.T.types[S.type[i]], k = this.bodyOf[i];
      sim.addBoxObstacle(S.x[i], S.z[i], S.yaw[i], ty.w / 2 + 0.05, ty.len / 2 + 0.05, k >= 0 ? this.vx[k] : 0, k >= 0 ? this.vz[k] : 0);
    }
  }

  // ---------------------------------------------------------------- the player's vehicle (carEnv.js collide, per substep)
  load(c, box) {
    const s = Math.sin(c.heading), k = Math.cos(c.heading), m = this.player.m;
    this.x[P] = c.x; this.z[P] = c.z; this.h[P] = c.heading;
    this.vx[P] = s * c.speed + (c.vx || 0); this.vz[P] = k * c.speed + (c.vz || 0); this.w[P] = c.angularVel || 0;
    this.m[P] = m; this.iM[P] = 1 / m; this.hx[P] = box.hx; this.hz[P] = box.hz; this.iI[P] = 1 / inertiaOf(m, box.hx, box.hz);
    this.y[P] = c.y;
  }
  store(c) {
    const s = Math.sin(c.heading), k = Math.cos(c.heading), wx = this.vx[P], wz = this.vz[P];
    c.x = this.x[P]; c.z = this.z[P];
    const lat = wx * k - wz * s;
    c.speed = wx * s + wz * k; c.vx = k * lat; c.vz = -s * lat;
    c.angularVel = Math.max(-4, Math.min(4, this.w[P]));
  }
  /**
   * The player's vehicle c (box: { hx, hz } its half sizes) for one substep h (carEnv.js collide calls it where it
   * called env.dynamic): the awake bodies advance by h, then c against them (two-way impulses) and against the
   * traffic's other cars (woken on a real hit; a touch below wakeTraffic, a two-wheeler of the traffic: pushed out as
   * before). push(c, nx, nz, depth, kind) = carEnv's own (position + its impact response); two: a two-wheeler (it keeps
   * its own impact response and crash rules; the car it hits takes the impulse of the bike's mass).
   */
  playerStep(c, box, h, env, push, two) {
    const t0 = performance.now();
    this.substep(h); this.consumed += h;
    this.player.two = two;
    const o = this.ob;
    if (this.nAwake) {
      for (let k = 0; k < N; k++) {
        if (!this.act[k]) continue;
        const dx = c.x - this.x[k], dz = c.z - this.z[k], r = box.hz + this.hz[k] + 0.5;
        if (dx * dx + dz * dz > r * r) continue;
        if (Number.isFinite(c.y) && Math.abs(this.y[k] - c.y) > 1.5) continue;
        if (obbObb(c.x, c.z, c.heading, box.hx, box.hz, this.x[k], this.z[k], this.h[k], this.hx[k], this.hz[k], o)) this.playerHit(c, box, k, o.nx, o.nz, o.depth, env, push, two);
      }
    }
    if (this.T) {
      const n = this.T.boxesNear(c.x, c.z, 12, this.tb, this.ti), B = this.tb, S = this.S;
      for (let q = 0; q < n; q++) {
        const i = this.ti[q], r = q * 7;
        if (this.bodyOf[i] >= 0) continue;                            // (awake: tested above at its body's pose)
        if (Number.isFinite(c.y) && (B[r + 5] > c.y + 1.6 || B[r + 5] + B[r + 6] < c.y + 0.2)) continue;
        if (!obbObb(c.x, c.z, c.heading, box.hx, box.hz, B[r], B[r + 1], B[r + 2], B[r + 3], B[r + 4], o)) continue;
        const nx = o.nx, nz = o.nz, depth = o.depth;
        let k = -1;
        if (!this.T.types[S.type[i]]?.two) {
          const sv = S.state[i] === KNOCKED ? 0 : S.v[i], s = Math.sin(c.heading), cs = Math.cos(c.heading);
          const vn = -((s * c.speed + (c.vx || 0) - Math.sin(B[r + 2]) * sv) * nx + (cs * c.speed + (c.vz || 0) - Math.cos(B[r + 2]) * sv) * nz);
          if (vn > (S.state[i] === KNOCKED ? HIT.wakeKnocked : HIT.wakeTraffic)) k = this.wakeSim(i);
        }
        if (k >= 0) this.playerHit(c, box, k, nx, nz, depth, env, push, two);
        else push(c, nx, nz, depth, KIND.car);
      }
    }
    const ms = performance.now() - t0;
    this.stats.ms += ms;
  }
  /** the player's vehicle against awake body k: n the push of the player out of it */
  playerHit(c, box, k, nx, nz, depth, env, push, two) {
    this.load(c, box);
    const iP = this.iM[P], iK = this.iM[k], s = iP + iK;
    this.x[k] -= nx * depth * iK / s; this.z[k] -= nz * depth * iK / s;
    this.x[P] += nx * depth * iP / s; this.z[P] += nz * depth * iP / s;
    this.pairPoint(P, k, nx, nz);
    const px = this.cp[0], pz = this.cp[1];
    const rpx = px - this.x[P], rpz = pz - this.z[P], rkx = px - this.x[k], rkz = pz - this.z[k];
    const vn = -((this.vx[P] + this.w[P] * rpz - this.vx[k] - this.w[k] * rkz) * nx + (this.vz[P] - this.w[P] * rpx - this.vz[k] + this.w[k] * rkx) * nz);
    if (two) {
      // the bike: its own response (crash rules) against the car as a wall; the car takes the bike's impulse
      const vx0 = this.vx[P], vz0 = this.vz[P], w0 = this.w[P];
      const jn = vn > 0 ? this.impulse(P, k, px, pz, nx, nz, this.rest(vn), HIT.muBody) : 0;
      this.vx[P] = vx0; this.vz[P] = vz0; this.w[P] = w0;
      if (jn > 0) { this.dentAt(k, px, pz, jn * iK); this.shaken(k, this.cornerDv(k, px, pz, nx, nz, jn), jn * iK); }
      push(c, nx, nz, depth * iP / s, KIND.car);
      env.contacts--;                                                // (push counted it; counted once below)
      this.after(c, k, jn, vn, px, pz, nx, nz, false);
    } else {
      const jn = vn > 0 ? this.impulse(P, k, px, pz, nx, nz, this.rest(vn), HIT.muBody) : 0;
      this.store(c);
      if (jn > 0) {
        const dvP = jn * iP, dvK = jn * iK;
        this.dentAt(k, px, pz, dvK); this.shaken(k, this.cornerDv(k, px, pz, nx, nz, jn), dvK);
        if (this.dentAt(P, px, pz, dvP) > 0) this.playerDamaged();
        // the body's kick (carCtl's plate: pitchV / rollV; the older models: pitchVel / rollVel), once per impact
        if (vn > 0.8) {
          const sh = Math.sin(c.heading), ch = Math.cos(c.heading), fn = sh * nx + ch * nz, ln = ch * nx - sh * nz, kv = Math.min(14, vn);
          if (c.pitchV !== undefined) { c.pitchV += fn * kv * 0.05; c.rollV -= ln * kv * 0.08; }
          else if (c.pitchVel !== undefined) { c.pitchVel += fn * kv * 0.12; c.rollVel -= ln * kv * 0.16; c.heaveVel += Math.min(1, vn * 0.08); }
        }
      }
      this.after(c, k, jn, vn, px, pz, nx, nz, true);
    }
    env.contacts++;
  }
  after(c, k, jn, vn, px, pz, nx, nz, count) {
    if (jn <= 0) return;
    if (count) { c.hits = (c.hits || 0) + 1; if (vn > 2) c.lastHit = { x: c.x, z: c.z, nx, nz, speed: vn, kind: KIND.car, t: performance.now() }; }
    this.player.lastImpulse = jn; this.player.hits++;
    if (this.listeners.length && jn * this.iM[P] > 0.4 && this.age[k] - this.evT[k] > 0.25) {
      this.evT[k] = this.age[k];
      const i = this.si[k], S = this.S;
      const e = { other: { kind: i < 0 ? "body" : this.org[i] === 2 ? "parked" : "traffic", index: i, type: i >= 0 ? this.T.types[S.type[i]].name : null },
        impulse: jn, point: { x: px, z: pz }, speed: vn, damage: this.player.damage };
      for (const f of this.listeners) try { f(e); } catch (err) { console.warn("[carhit] listener:", err); }
    }
  }
  playerDamaged() {
    const C = this.player.corners;
    this.player.damage = Math.min(1, (C[0] + C[1] + C[2] + C[3]) / 0.6);
    this.onPlayerDamage?.(C);
  }
  resetPlayer() { this.player.corners.fill(0); this.player.damage = 0; this.player.lastImpulse = 0; this.onPlayerDamage?.(this.player.corners); }

  // ---------------------------------------------------------------- once per frame
  /** after the player's step (or alone when nobody drives): the rest of the frame's time for the bodies, settle /
   *  sleep, the sim's poses and lights, the knocked cars' rejoin / wreck clearing. fx, fz: the player (focus). */
  frame(dt, fx = 0, fz = 0) {
    const t0 = performance.now();
    const rem = Math.min(0.1, dt - this.consumed);
    this.consumed = 0;
    if (rem > 1e-4 && this.nAwake) { const n = Math.ceil(rem * 120), h = rem / n; for (let s = 0; s < n; s++) this.substep(h); }
    const S = this.S;
    for (let k = 0; k < N; k++) {
      if (!this.act[k]) continue;
      const i = this.si[k];
      if (i >= 0 && (!S.alive[i] || S.gen[i] !== this.gen[k])) { this.free(k); continue; }
      this.y[k] = this.ground(this.x[k], this.z[k], this.y[k]);
      if (!(Number.isFinite(this.x[k]) && Number.isFinite(this.z[k]) && Number.isFinite(this.h[k]))) { this.vx[k] = this.vz[k] = this.w[k] = 0; }   // (never: the test proves it)
      const still = hyp(this.vx[k], this.vz[k]) < HIT.sleepV && Math.abs(this.w[k]) < HIT.sleepW;
      this.still[k] = still ? this.still[k] + dt : 0;
      if (i >= 0) this.writeSim(k, dt);
      if (this.still[k] >= HIT.sleepT) {
        if (i >= 0) { this.sleep(k); continue; }
        this.vx[k] = this.vz[k] = this.w[k] = 0;                      // (a free body stays, at rest)
      }
      this.gatherNear(k);
      this.nearTraffic(k);
    }
    if (S) this.upkeep(dt, fx, fz);
    let a = 0;
    for (let k = 0; k < N; k++) a += this.act[k];
    this.stats.awake = a; this.stats.knocked = this.klN;
    const ms = performance.now() - t0 + this.stats.ms;
    this.stats.ms = 0;
    this.stats.frameMs = (this.stats.frameMs || 0) * 0.95 + ms * 0.05;
    this.stats.msMax = Math.max(this.stats.msMax * 0.995, ms);
  }
  sleep(k) {
    this.vx[k] = this.vz[k] = this.w[k] = 0;
    const i = this.si[k];
    if (i >= 0) {
      const S = this.S;
      S.knock[i] = this.org[i] === 2 ? 4 : this.hitDv[k] >= HIT.wreckDv || this.dentSum(k) >= HIT.wreckDepth ? 3 : 2;
      S.kT[i] = 0; S.v[i] = 0;
    }
    this.free(k);
  }
  dentSum(k) { const D = this.dent, o = k * 4; return D[o] + D[o + 1] + D[o + 2] + D[o + 3]; }
  /** body k's pose / lights / damage into its sim car (the fleet draws it; px = x: no interpolation) */
  writeSim(k, dt) {
    const S = this.S, i = this.si[k], s = Math.sin(this.h[k]), c = Math.cos(this.h[k]), a = this.a[k];
    let h = this.h[k] % (2 * Math.PI);
    if (h > Math.PI) h -= 2 * Math.PI; else if (h < -Math.PI) h += 2 * Math.PI;
    this.h[k] = h;
    const yf = this.ground(this.x[k] + s * a, this.z[k] + c * a, this.y[k]), yr = this.ground(this.x[k] - s * a, this.z[k] - c * a, this.y[k]);
    S.x[i] = S.px[i] = this.x[k]; S.z[i] = S.pz[i] = this.z[k]; S.yaw[i] = S.pyaw[i] = h;
    S.y[i] = S.py[i] = (yf + yr) / 2; S.pitch[i] = S.ppitch[i] = Math.atan2(yf - yr, 2 * a);
    const u = this.vx[k] * s + this.vz[k] * c, V = hyp(this.vx[k], this.vz[k]);
    S.v[i] = V;
    S.spin[i] += u * dt / (S.wr[i] || 0.32);
    if (S.spin[i] > 6283.18) S.spin[i] -= 6283.18;
    S.pspin[i] = S.spin[i]; S.steer[i] *= 0.9;
    S.bits[i] = this.org[i] === 2 ? 32 : 12 | (V > 0.3 && this.age[k] > HIT.react ? 1 : 0);
    let code = 0;
    for (let q = 0; q < 4; q++) code |= Math.min(7, Math.round(this.dent[k * 4 + q] / 0.04)) << (q * 3);
    S.dmg[i] = code;
  }
  /** the knocked cars standing: hazards, rejoin, wrecks cleared, shoved parked cars handed back */
  upkeep(dt, fx, fz) {
    const S = this.S;
    for (let q = this.klN - 1; q >= 0; q--) {
      const i = this.kl[q];
      if (!S.alive[i] || S.gen[i] !== this.klGen[q] || S.state[i] !== KNOCKED) {
        if (!S.alive[i] || S.gen[i] !== this.klGen[q]) this.retire(q, false);
        else { this.kl[q] = this.kl[this.klN - 1]; this.klGen[q] = this.klGen[this.klN - 1]; this.klN--; }
        continue;
      }
      const kn = S.knock[i];
      if (S.ctl[i] === 2 && S.v[i] < 0.4) S.ctl[i] = 3;              // (police game: told to pull over, it has stopped)
      if (kn === 1) continue;                                          // (sliding: its body)
      S.kT[i] += dt;
      const d2 = (S.x[i] - fx) ** 2 + (S.z[i] - fz) ** 2;
      if (kn === 4) { if (!S.dmg[i] && S.kT[i] > 0.5) this.retire(q, false); continue; }   // (undamaged: back to the parked fleet)
      if (kn === 2) {
        S.bits[i] = 12;                                                // hazards
        if (S.kT[i] > (S.ctl[i] === 1 ? HIT.fleeRejoinT : HIT.rejoinT) && S.ctl[i] !== 3 && d2 > 16) {
          const r = S.rejoin(i);
          if (r > 0) { this.kl[q] = this.kl[this.klN - 1]; this.klGen[q] = this.klGen[this.klN - 1]; this.klN--; this.org[i] = 0; this.stats.rejoined++; continue; }
          if (r < 0) S.knock[i] = 3; else S.kT[i] -= 1;                // (no lane its way: a wreck; no room yet: in 1 s)
        }
      }
      if (S.knock[i] === 3) {
        S.bits[i] = 12;
        if (!S.keep[i] && (d2 > HIT.clearFar * HIT.clearFar || (d2 > HIT.clearNear * HIT.clearNear && !(this.T.fleet.shown?.[i] >= 0)))) this.retire(q, true);
      }
    }
  }
}
