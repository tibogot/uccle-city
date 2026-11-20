// PHYSICS PROPS (docs/PROPS.md, rule physics-props; ?props=old = the street furniture as static colliders, as before).
// Owner playtest 2026-11-18: "we should have more objects we could hit with the car: the parked motorbikes and other
// things". A small 3D rigid-body world for the street's movable things, pure JS (no three.js: the gate runs it headless),
// fixed-size typed arrays, no allocation per step (carHit.js's style):
//
//   classes   light  (knocked over, they fly and tumble): bins, cones, café chairs / tables, Villo bikes in their docks
//             heavy  (pushed, they tip over and slide): parked motorbikes and scooters
//             post   (bend, then snap above a speed): road-sign posts (+ their plates), bollards
//             Lamps, trees, walls, buildings, Villo docks / totems, benches, bike boxes, glass banks stay solid: they are
//             not props (no `prop` on their collider), real ones stop a car.
//   rest      a prop at rest is the layer's own instance + its static drive collider (colliders.js: the collider's `ref`
//             carries `.prop`); nothing runs for it
//   wake      the player's vehicle (carEnv.js collide -> touch()) closing on a prop's collider wakes it: a body in one of
//             N = 24 slots, its collider off (ref.hidden), the layer's instance hidden and drawn by the props' proxies
//             (cityProps.js); a body flying into another prop's collider wakes that one too (a chain)
//   body      a box (centre, half extents from the drawn geometry) of the class's mass, a quaternion, linear + angular
//             velocity (world), inertia of the box; contact POINTS per shape (box corners, cylinder rims, a cone's base
//             + tip, a two-wheeler's tyres + side stand + bars / pegs / mirrors: it stands on its stand, tips over and
//             lies on its side) against the ground (a plane sampled round the body: height + slope), impulses with
//             restitution + Coulomb friction, position correction capped per substep; the drive colliders round it in
//             plan (buildings, walls, posts, lamps, trees, kerb walls: pushed out, an impulse at the side); other awake
//             props as spheres; 120 Hz substeps only while something is awake
//   player    the player's car / two-wheeler (2D: x, z, yaw, vx, vz, yaw rate, mass, yaw inertia) against every awake or
//             displaced prop (plan box vs the prop's footprint, the height band of the bumper .. roof): ONE impulse with
//             BOTH masses at the contact point (bumper height: a low hit tips a tall thing), its normal tilted up for a
//             light prop (the bonnet scoops it up: it flies); the car keeps the reaction's plan part: it loses speed by
//             the mass ratio (a 18 kg bin barely slows a 1.4 t car, a 190 kg motorbike does)
//   posts     below bendV: a wall as before; bendV..snapV: a plastic hinge at the foot (the post bends away from the car
//             by the car's travel into it, resisting with a constant force: the car loses that work), flattened past
//             flatDeg (its collider off: the car rolls over it); above snapV: it snaps (the break costs the car breakJ)
//             and flies as a body. A two-wheeler's rider: posts and parked motorbikes are walls (its crash rules, rule
//             40), the light props are knocked
//   settle    below sleepV / sleepW for sleepT s on the ground: asleep, its pose kept (displaced: drawn there, hit again
//             it wakes) while the tile is loaded; the tile unloads: its props reset (the layer rebuilds them at rest)
//   walker    the third person kicks the light ones (walk(): a 75 kg body at its walking speed)
//   traffic   every awake / displaced prop in reach is a box obstacle of the traffic sim (addObstacles)
//   events    "propHit" { kind, impulse (N s), point { x, y, z }, speed }: a hit by the player / walker, a landing or a
//             wall hit over 2 m/s (for the sound job; at most one per prop per 0.15 s; no audio here)
//
// Frames: x right, y up, z = three's convention; a yaw `h` turns +z toward +x (forward = (sin h, cos h)), as carHit.
// The player's vehicle: carHit.js load / store conventions (c.speed along the heading + c.vx / c.vz lateral).
import { gather, itemContact, heightClear, KIND } from "../drive/colliders.js";
import { obbObb } from "../drive/obb.js";

export const PROPS_OLD = typeof location !== "undefined" && /[?&]props=old(&|$)/.test(location.search);
const G = 9.81;
/** kg, m/s, N, N s, deg. bendV / snapV: the closing speed of the player's vehicle at the first touch */
export const CLASSES = {
  bin: { name: "bin", type: "light", mass: 18, shape: "cyl", mu: 0.5, e: 0.3, lift: 0.32, walk: true },
  bin_column: { name: "bin_column", type: "light", mass: 24, shape: "box", mu: 0.5, e: 0.2, lift: 0.28, walk: true },
  cone: { name: "cone", type: "light", mass: 3.5, shape: "cone", mu: 0.7, e: 0.4, lift: 0.4, walk: true },
  chair: { name: "chair", type: "light", mass: 5, shape: "box", mu: 0.45, e: 0.25, lift: 0.35, walk: true },
  table: { name: "table", type: "light", mass: 14, shape: "box", mu: 0.45, e: 0.2, lift: 0.25, walk: true, group: "chair" },
  villo: { name: "villo", type: "light", mass: 23, shape: "bike", mu: 0.5, e: 0.15, lift: 0.18, walk: true },
  moto: { name: "moto", type: "heavy", mass: 190, shape: "moto", mu: 0.6, e: 0.1, lift: 0.06 },
  scooter: { name: "scooter", type: "heavy", mass: 120, shape: "moto", mu: 0.6, e: 0.1, lift: 0.06 },
  sign: { name: "sign", type: "post", mass: 16, shape: "box", mu: 0.5, e: 0.15, lift: 0.1, bendV: 1.5, snapV: 9, Fy: 2200, flatDeg: 76, breakJ: 420, hinge: 0.5 },
  bollard: { name: "bollard", type: "post", mass: 38, shape: "cyl", mu: 0.5, e: 0.1, lift: 0.05, bendV: 4, snapV: 11, Fy: 24000, flatDeg: 48, breakJ: 2300, hinge: 0.45 },
};
export const PROP = {
  N: 24, D: 512,                   // awake bodies; displaced props tracked (awake + asleep off their rest pose + bent)
  wake: 0.25,                      // m/s closing speed that wakes a light / heavy prop
  sleepV: 0.08, sleepW: 0.2, sleepT: 0.45, maxAwake: 14,
  corr: 0.015,                     // m of position correction per substep at most (a torn-out foot rises, no explosion)
  eSlow: 1.0,                      // m/s: no bounce below this closing speed (resting contact)
  linDamp: 0.04, angDamp: 0.25, roll: 3.0,   // per s: air; rolling resistance on the ground (a bin does not roll on for ever)
  wallE: 0.2, wallMu: 0.35,
  bumper: 0.42, band0: 0.3, band1: 1.45,     // m over the vehicle's wheels: the contact height; the band it hits (lower: driven over)
  walkM: 75, walkR: 0.32,
  hitEv: 2,                        // m/s change of speed that emits a landing / wall propHit
};
const MAXP = 16;                   // contact points per shape
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const SH_CODE = { box: 0, cyl: 1, cone: 2, bike: 3, moto: 4 };

export class PropWorld {
  /** sets(x, z, r) -> collider sets (driveMode.js), ground(x, z, nearY) -> the drive surface */
  constructor({ sets = null, ground = null } = {}) {
    this.sets = sets; this.ground = ground || (() => 0);
    const N = PROP.N, F = (n) => new Float64Array(n);
    // bodies: centre (COM), quaternion, velocity, angular velocity (world), mass, body-frame inverse inertia, half extents
    Object.assign(this, { px: F(N), py: F(N), pz: F(N), qx: F(N), qy: F(N), qz: F(N), qw: F(N), vx: F(N), vy: F(N), vz: F(N),
      wx: F(N), wy: F(N), wz: F(N), iM: F(N), m: F(N), iIx: F(N), iIy: F(N), iIz: F(N), hx: F(N), hy: F(N), hz: F(N), rad: F(N),
      still: F(N), age: F(N), evT: F(N), mu: F(N), e: F(N), gground: F(N * 4), lastHitV: F(N), drag: F(N) });
    this.act = new Uint8Array(N); this.nAwake = 0;
    this.prop = new Array(N).fill(null);          // the prop object of each body
    this.pts = new Float64Array(N * MAXP * 3); this.npt = new Uint8Array(N);   // contact points (body frame, from the COM)
    this.near = Array.from({ length: N }, () => []);
    // displaced props (drawn by the proxies): their foot frame (position + quaternion), the prop
    const D = PROP.D;
    this.dprop = new Array(D).fill(null); this.dN = 0;
    this.dpos = F(D * 3); this.dq = F(D * 4); this.dgen = new Uint32Array(D); this.dmoved = new Uint8Array(D);
    this.R = F(9);                                  // scratch rotation (body -> world)
    this.ct = { nx: 0.5, nz: 0.5, depth: 0.5, kind: 0 }; this.box = { hx: 0.5, hz: 0.5, cos: 0.5, sin: 0.5 }; this.ob = { nx: 0.5, nz: 0.5, depth: 0.5 };
    this.pv = F(8);                                 // scratch: the player 2D body (x, z, vx, vz, w, iM, iI, yaw)
    this.listeners = [];
    this.onWake = null; this.onReset = null; this.onResolve = null;   // cityProps.js: hide / restore the layer's instances, fill a prop's rest frame + shape
    this.stats = { awake: 0, displaced: 0, wakes: 0, snaps: 0, bends: 0, flattened: 0, resets: 0, solves: 0, statics: 0, ms: 0, frameMs: 0, msMax: 0, events: 0 };
    this.consumed = 0; this.framed = 0; this.moved = 0; this.fx = 0; this.fz = 0;
    this.sleepAll = false;
  }
  on(ev, f) { if (ev !== "propHit") return () => {}; this.listeners.push(f); return () => { const k = this.listeners.indexOf(f); if (k >= 0) this.listeners.splice(k, 1); }; }
  emit(k, impulse, x, y, z, speed) {
    if (!this.listeners.length || this.age[k] - this.evT[k] < 0.15) return;
    this.evT[k] = this.age[k]; this.stats.events++;
    const e = { kind: this.prop[k]?.cls.name, impulse, point: { x, y, z }, speed };
    for (const f of this.listeners) try { f(e); } catch (err) { console.warn("[props] listener:", err); }
  }

  // ---------------------------------------------------------------- props (made by the layers, cityProps.js)
  /** a prop: cls (CLASSES), x y z yaw (its foot at rest), ref (its collider's ref, or null), tile; rest (Float64Array 16,
   *  the rest frame, column-major) + shape filled by onResolve at its first wake */
  static make(cls, x, y, z, yaw, tile = null) {
    return { cls, x, y, z, yaw, tile, ref: null, state: 0, slot: -1, d: -1, rest: null, shape: null, theta: 0, ax: 0, az: 0, adv: 0, members: null, group: null, gen: 0 };
  }
  resolve(p) {
    if (!p.rest) {
      p.dead = false;
      this.onResolve?.(p);
      if (this.onResolve && !p.rest) { p.dead = true; return p; }          // (nothing drawn for it yet: its pool not loaded)
      if (!p.rest) { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); p.rest = Float64Array.of(c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, p.x, p.y, p.z, 1); }
      if (!p.shape) p.shape = { cx: 0, cy: 0.45, cz: 0, hx: 0.3, hy: 0.45, hz: 0.3 };
    }
    return p;
  }

  // ---------------------------------------------------------------- displaced list
  dalloc(p) {
    if (p.d >= 0) return p.d;
    if (this.dN >= PROP.D) {
      // full: the settled one farthest from the last focus goes back to rest
      let far = -1, fd = -1;
      for (let q = 0; q < this.dN; q++) {
        const o = this.dprop[q]; if (o.slot >= 0) continue;
        const dx = this.dpos[q * 3] - this.fx, dz = this.dpos[q * 3 + 2] - this.fz, d = dx * dx + dz * dz;
        if (d > fd) { fd = d; far = q; }
      }
      if (far < 0) return -1;
      this.reset(this.dprop[far]);
    }
    const q = this.dN++;
    this.dprop[q] = p; p.d = q; this.dgen[q]++; this.dmoved[q] = 2;
    return q;
  }
  /** a prop back to its rest state (its layer instance + collider), out of every list */
  reset(p) {
    if (p.slot >= 0) this.freeBody(p.slot);
    this.dfree(p);
    p.state = 0; p.theta = 0; p.adv = 0;
    this.hideRef(p, false);
    this.onReset?.(p);
    this.stats.resets++;
  }
  dfree(p) {
    if (p.d >= 0) {
      const q = p.d, last = this.dN - 1;
      if (q !== last) {
        const o = this.dprop[last]; this.dprop[q] = o; o.d = q;
        for (let k = 0; k < 3; k++) this.dpos[q * 3 + k] = this.dpos[last * 3 + k];
        for (let k = 0; k < 4; k++) this.dq[q * 4 + k] = this.dq[last * 4 + k];
        this.dgen[q] = this.dgen[last]; this.dmoved[q] = 2;
      }
      this.dprop[last] = null; this.dN--; p.d = -1;
    }
  }
  /** every prop of a tile (its layer unloaded it): back to rest, forgotten */
  removeTile(tile) {
    for (let q = this.dN - 1; q >= 0; q--) { const p = this.dprop[q]; if (p && p.tile === tile) this.reset(p); }
  }
  clear() { for (let q = this.dN - 1; q >= 0; q--) this.reset(this.dprop[q]); }

  // ---------------------------------------------------------------- bodies
  alloc() {
    const N = PROP.N;
    for (let k = 0; k < N; k++) if (!this.act[k]) return k;
    // full: the slowest one that is down on the ground goes to sleep where it is
    let best = -1, bv = 0.6;
    for (let k = 0; k < N; k++) {
      const v = hyp(hyp(this.vx[k], this.vy[k]), this.vz[k]);
      if (v < bv && this.gground[k * 4 + 3] > 0) { bv = v; best = k; }
    }
    if (best < 0) return -1;
    this.sleep(best);
    return best;
  }
  /** wake prop p as a body (its rest pose or its displaced pose): -> slot or -1 */
  wake(p) {
    if (p.slot >= 0) return p.slot;
    this.resolve(p);
    if (p.dead) return -1;
    const fresh = p.d < 0;
    if (this.dalloc(p) < 0) return -1;
    const k = this.alloc();
    if (k < 0) { if (fresh) this.dfree(p); return -1; }
    const q = p.d, S = p.shape, cls = p.cls;
    // the foot frame: the rest frame (fresh) or the displaced pose
    let fx, fy, fz, Qx, Qy, Qz, Qw;
    if (fresh || p.state === 0) {
      const M = p.rest;
      fx = M[12]; fy = M[13]; fz = M[14];
      matToQuat(M, this.dq, q * 4);
      Qx = this.dq[q * 4]; Qy = this.dq[q * 4 + 1]; Qz = this.dq[q * 4 + 2]; Qw = this.dq[q * 4 + 3];
      this.dpos[q * 3] = fx; this.dpos[q * 3 + 1] = fy; this.dpos[q * 3 + 2] = fz;
    } else {
      fx = this.dpos[q * 3]; fy = this.dpos[q * 3 + 1]; fz = this.dpos[q * 3 + 2];
      Qx = this.dq[q * 4]; Qy = this.dq[q * 4 + 1]; Qz = this.dq[q * 4 + 2]; Qw = this.dq[q * 4 + 3];
    }
    this.qx[k] = Qx; this.qy[k] = Qy; this.qz[k] = Qz; this.qw[k] = Qw;
    this.rot(k);
    const R = this.R;
    this.px[k] = fx + R[0] * S.cx + R[3] * S.cy + R[6] * S.cz;
    this.py[k] = fy + R[1] * S.cx + R[4] * S.cy + R[7] * S.cz;
    this.pz[k] = fz + R[2] * S.cx + R[5] * S.cy + R[8] * S.cz;
    this.vx[k] = this.vy[k] = this.vz[k] = this.wx[k] = this.wy[k] = this.wz[k] = 0;
    const m = cls.mass + (p.extraMass || 0);
    this.m[k] = m; this.iM[k] = 1 / m;
    const a = 2 * S.hx, b = 2 * S.hy, c = 2 * S.hz, f = cls.shape === "cyl" || cls.shape === "cone" ? 0.85 : 1;
    this.iIx[k] = 12 / (m * (b * b + c * c) * f); this.iIy[k] = 12 / (m * (a * a + c * c) * f); this.iIz[k] = 12 / (m * (a * a + b * b) * f);
    this.hx[k] = S.hx; this.hy[k] = S.hy; this.hz[k] = S.hz;
    this.rad[k] = Math.min(0.9, Math.max(0.12, (S.hx + S.hz) * 0.5));
    // air drag: 1/2 rho Cd A / m (A: the box's largest face, Cd 1): a cone or a chair slows in the air, a motorbike hardly
    this.drag[k] = 0.5 * 1.2 * 1.0 * 4 * Math.max(S.hx * S.hy, S.hy * S.hz, S.hx * S.hz) / m;
    this.mu[k] = cls.mu; this.e[k] = cls.e;
    this.still[k] = 0; this.age[k] = 0; this.evT[k] = -1; this.lastHitV[k] = 0;
    this.points(k, p);
    this.gground[k * 4 + 3] = 0;
    this.sampleGround(k);
    this.act[k] = 1; this.nAwake++;
    this.prop[k] = p; p.slot = k;
    if (p.state === 0) { this.hideRef(p, true); this.onWake?.(p); this.stats.wakes++; }
    p.state = 1; p.gen++;
    this.dmoved[q] = 2;
    this.gatherNear(k);
    return k;
  }
  freeBody(k) {
    if (!this.act[k]) return;
    this.act[k] = 0; this.nAwake--;
    const p = this.prop[k];
    if (p) p.slot = -1;
    this.prop[k] = null;
  }
  /** body k at rest: its foot pose into the displaced list, the slot free */
  sleep(k) {
    const p = this.prop[k];
    if (p) { this.writePose(k); p.state = 2; this.dmoved[p.d] = 2; }
    this.freeBody(k);
  }
  /** the contact points of prop p's shape (body frame, from the COM) */
  points(k, p) {
    const S = p.shape, P = this.pts, o = k * MAXP * 3, hx = S.hx, hy = S.hy, hz = S.hz;
    let n = 0;
    const put = (x, y, z) => { P[o + n * 3] = x; P[o + n * 3 + 1] = y; P[o + n * 3 + 2] = z; n++; };
    const code = SH_CODE[p.cls.shape] ?? 0;
    if (code === 1) {                                  // cylinder about y: 8 points per rim
      const r = Math.min(hx, hz);
      for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; put(Math.cos(a) * r, s * hy, Math.sin(a) * r); }
    } else if (code === 2) {                           // cone: the square base plate, the rim over it, the tip
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; put(Math.cos(a) * hx * 1.35, -hy, Math.sin(a) * hz * 1.35); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; put(Math.cos(a) * hx * 0.75, -hy + 0.06, Math.sin(a) * hz * 0.75); }
      put(0, hy, 0);
    } else if (code === 3 || code === 4) {             // a two-wheeler: tyres on its centre line, then bars / pegs / mirrors / saddle
      // (the tyres run on the model's centre line x = 0 of its own frame: -cx from the box centre, a leaning model's box
      // sits off it toward its stand)
      const b = -hy, zf = S.wf ?? hz - 0.3, zr = S.wr ?? -hz + 0.3, w = hx * 0.92, x0 = -S.cx;
      put(x0, b, zf); put(x0, b, zr);
      if (code === 4 && S.stand) put(x0 + S.stand * 0.3, b, (zf + zr) / 2 - 0.12);   // the side stand (parked motorbike)
      if (code === 4 && !S.stand) { put(x0 + 0.16, b, (zf + zr) / 2); put(x0 - 0.16, b, (zf + zr) / 2); }   // a scooter's centre stand
      const yb = b + 2 * hy * 0.78, yp = b + 2 * hy * 0.3, ym = b + 2 * hy;
      put(w, yb, zf - 0.12); put(-w, yb, zf - 0.12);            // bar ends
      put(w * 0.6, yp, (zf + zr) / 2); put(-w * 0.6, yp, (zf + zr) / 2);   // pegs / engine / pedals
      put(w * 0.75, ym, zf - 0.05); put(-w * 0.75, ym, zf - 0.05);           // mirrors / bar top
      put(w * 0.45, b + 2 * hy * 0.65, zr + 0.15); put(-w * 0.45, b + 2 * hy * 0.65, zr + 0.15);   // saddle / rear
      put(x0, b + 0.12, zf + 0.25); put(x0, b + 0.12, zr - 0.25);          // tyre fronts (it ends on its nose)
    } else {                                           // box: 8 corners (+ the long edges' middles)
      for (let i = 0; i < 8; i++) put(i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz);
      const L = Math.max(hx, hy, hz);
      if (L > 2.5 * Math.min(hx, hy, hz)) {
        if (L === hy) for (let i = 0; i < 4; i++) put(i & 1 ? hx : -hx, 0, i & 2 ? hz : -hz);
        else if (L === hx) for (let i = 0; i < 4; i++) put(0, i & 1 ? hy : -hy, i & 2 ? hz : -hz);
        else for (let i = 0; i < 4; i++) put(i & 1 ? hx : -hx, i & 2 ? hy : -hy, 0);
      }
    }
    this.npt[k] = n;
  }
  /** body k's rotation into this.R (column-major 3x3: R[0..2] = the body's x axis in the world) */
  rot(k) {
    const x = this.qx[k], y = this.qy[k], z = this.qz[k], w = this.qw[k], R = this.R;
    R[0] = 1 - 2 * (y * y + z * z); R[1] = 2 * (x * y + z * w); R[2] = 2 * (x * z - y * w);
    R[3] = 2 * (x * y - z * w); R[4] = 1 - 2 * (x * x + z * z); R[5] = 2 * (y * z + x * w);
    R[6] = 2 * (x * z + y * w); R[7] = 2 * (y * z - x * w); R[8] = 1 - 2 * (x * x + y * y);
  }
  /** body k's foot frame into its displaced slot (the proxies draw it) */
  writePose(k) {
    const p = this.prop[k]; if (!p || p.d < 0) return;
    const q = p.d, S = p.shape, R = this.R;
    this.rot(k);
    this.dpos[q * 3] = this.px[k] - (R[0] * S.cx + R[3] * S.cy + R[6] * S.cz);
    this.dpos[q * 3 + 1] = this.py[k] - (R[1] * S.cx + R[4] * S.cy + R[7] * S.cz);
    this.dpos[q * 3 + 2] = this.pz[k] - (R[2] * S.cx + R[5] * S.cy + R[8] * S.cz);
    this.dq[q * 4] = this.qx[k]; this.dq[q * 4 + 1] = this.qy[k]; this.dq[q * 4 + 2] = this.qz[k]; this.dq[q * 4 + 3] = this.qw[k];
    this.dmoved[q] = 2;
  }
  /** the ground under body k: a plane (height at the sample point, slope) */
  sampleGround(k) {
    const x = this.px[k], z = this.pz[k], G4 = this.gground, o = k * 4;
    const near = this.py[k];
    const g0 = this.ground(x, z, near), gx = this.ground(x + 0.25, z, near), gz = this.ground(x, z + 0.25, near);
    G4[o] = Number.isFinite(g0) ? g0 : -1e4;
    G4[o + 1] = Number.isFinite(gx) && Number.isFinite(g0) ? Math.max(-3, Math.min(3, (gx - g0) / 0.25)) : 0;
    G4[o + 2] = Number.isFinite(gz) && Number.isFinite(g0) ? Math.max(-3, Math.min(3, (gz - g0) / 0.25)) : 0;
    this.gsx_[k * 2] = x; this.gsx_[k * 2 + 1] = z;
  }
  gsx_ = new Float64Array(PROP.N * 2);
  gatherNear(k) {
    const L = this.near[k];
    L.length = 0;
    if (!this.sets) return;
    const r = hyp(this.hx[k], this.hz[k]) + this.hy[k] + hyp(this.vx[k], this.vz[k]) * 0.12 + 1;
    for (const col of this.sets(this.px[k], this.pz[k], r)) gather(col, this.px[k], this.pz[k], r, L);
  }

  // ---------------------------------------------------------------- the solver
  /** an impulse j along n (unit) at the world point offset r (from the COM) of body k */
  applyImpulse(k, rx, ry, rz, jx, jy, jz) {
    const iM = this.iM[k];
    this.vx[k] += jx * iM; this.vy[k] += jy * iM; this.vz[k] += jz * iM;
    // dw = Iw^-1 (r x J), Iw^-1 = R diag R^T
    const tx = ry * jz - rz * jy, ty = rz * jx - rx * jz, tz = rx * jy - ry * jx;
    this.invI(k, tx, ty, tz);
    this.wx[k] += this.t3[0]; this.wy[k] += this.t3[1]; this.wz[k] += this.t3[2];
  }
  t3 = new Float64Array(3);
  /** Iw^-1 t into this.t3 (this.R must hold body k's rotation) */
  invI(k, tx, ty, tz) {
    const R = this.R;
    const bx = (R[0] * tx + R[1] * ty + R[2] * tz) * this.iIx[k], by = (R[3] * tx + R[4] * ty + R[5] * tz) * this.iIy[k], bz = (R[6] * tx + R[7] * ty + R[8] * tz) * this.iIz[k];
    this.t3[0] = R[0] * bx + R[3] * by + R[6] * bz; this.t3[1] = R[1] * bx + R[4] * by + R[7] * bz; this.t3[2] = R[2] * bx + R[5] * by + R[8] * bz;
  }
  /** the inverse effective mass of body k along n at offset r: 1/m + n . ((Iw^-1 (r x n)) x r) */
  kEff(k, rx, ry, rz, nx, ny, nz) {
    const tx = ry * nz - rz * ny, ty = rz * nx - rx * nz, tz = rx * ny - ry * nx;
    this.invI(k, tx, ty, tz);
    const a = this.t3[0], b = this.t3[1], c = this.t3[2];
    return this.iM[k] + nx * (b * rz - c * ry) + ny * (c * rx - a * rz) + nz * (a * ry - b * rx);
  }
  /** a contact of body k at offset r with a static surface of normal n (unit, out of the surface): -> the normal
   *  impulse (0: separating); restitution e, friction mu */
  contactStatic(k, rx, ry, rz, nx, ny, nz, e, mu) {
    let ux = this.vx[k] + this.wy[k] * rz - this.wz[k] * ry, uy = this.vy[k] + this.wz[k] * rx - this.wx[k] * rz, uz = this.vz[k] + this.wx[k] * ry - this.wy[k] * rx;
    const vn = ux * nx + uy * ny + uz * nz;
    if (vn >= 0) return 0;
    const ee = -vn < PROP.eSlow ? 0 : e;
    const j = -(1 + ee) * vn / this.kEff(k, rx, ry, rz, nx, ny, nz);
    this.applyImpulse(k, rx, ry, rz, nx * j, ny * j, nz * j);
    // friction (Coulomb, <= mu j, never more than stops the sliding)
    ux = this.vx[k] + this.wy[k] * rz - this.wz[k] * ry; uy = this.vy[k] + this.wz[k] * rx - this.wx[k] * rz; uz = this.vz[k] + this.wx[k] * ry - this.wy[k] * rx;
    const d = ux * nx + uy * ny + uz * nz, tx0 = ux - d * nx, ty0 = uy - d * ny, tz0 = uz - d * nz, vt = Math.sqrt(tx0 * tx0 + ty0 * ty0 + tz0 * tz0);
    if (vt > 1e-6 && mu > 0) {
      const tx = tx0 / vt, ty = ty0 / vt, tz = tz0 / vt;
      const jt = Math.min(mu * j, vt / this.kEff(k, rx, ry, rz, tx, ty, tz));
      this.applyImpulse(k, rx, ry, rz, -tx * jt, -ty * jt, -tz * jt);
    }
    this.stats.solves++;
    return j;
  }
  /** advance body k by h: gravity, damping, the integration */
  integrate(k, h) {
    this.vy[k] -= G * h;
    const ld = Math.max(0, 1 - PROP.linDamp * h), ad = Math.max(0, 1 - (PROP.angDamp + (this.gground[k * 4 + 3] > 0 ? PROP.roll : 0)) * h);
    const sp = Math.sqrt(this.vx[k] * this.vx[k] + this.vy[k] * this.vy[k] + this.vz[k] * this.vz[k]), dd = ld / (1 + this.drag[k] * sp * h);
    this.vx[k] *= dd; this.vy[k] *= dd; this.vz[k] *= dd; this.wx[k] *= ad; this.wy[k] *= ad; this.wz[k] *= ad;
    this.px[k] += this.vx[k] * h; this.py[k] += this.vy[k] * h; this.pz[k] += this.vz[k] * h;
    // q += 0.5 (w, 0) q h
    const wx = this.wx[k], wy = this.wy[k], wz = this.wz[k], x = this.qx[k], y = this.qy[k], z = this.qz[k], w = this.qw[k], hh = 0.5 * h;
    let nx = x + hh * (wx * w + wy * z - wz * y), ny = y + hh * (wy * w + wz * x - wx * z), nz = z + hh * (wz * w + wx * y - wy * x), nw = w - hh * (wx * x + wy * y + wz * z);
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw) || 1;
    this.qx[k] = nx / L; this.qy[k] = ny / L; this.qz[k] = nz / L; this.qw[k] = nw / L;
    this.age[k] += h;
  }
  /** body k on the ground plane: every point under it, two passes; the deepest one lifts the body (capped) */
  groundContact(k) {
    const G4 = this.gground, o = k * 4, R = this.R, P = this.pts, po = k * MAXP * 3, n = this.npt[k];
    const sx = this.gsx_[k * 2], sz = this.gsx_[k * 2 + 1], g0 = G4[o], gx = G4[o + 1], gz = G4[o + 2];
    // the plane's normal (-gx, 1, -gz) normalised
    const L = Math.sqrt(gx * gx + 1 + gz * gz), nx = -gx / L, ny = 1 / L, nz = -gz / L;
    let deep = 0, touch = 0;
    const vy0 = this.vy[k], v0 = hyp(hyp(this.vx[k], this.vy[k]), this.vz[k]);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const lx = P[po + i * 3], ly = P[po + i * 3 + 1], lz = P[po + i * 3 + 2];
        const rx = R[0] * lx + R[3] * ly + R[6] * lz, ry = R[1] * lx + R[4] * ly + R[7] * lz, rz = R[2] * lx + R[5] * ly + R[8] * lz;
        const wx = this.px[k] + rx, wy = this.py[k] + ry, wz = this.pz[k] + rz;
        const gy = g0 + gx * (wx - sx) + gz * (wz - sz), pen = (gy - wy) * ny;
        if (pen <= -0.005) continue;
        touch++;
        if (pen > deep) deep = pen;
        this.contactStatic(k, rx, ry, rz, nx, ny, nz, this.e[k], this.mu[k]);
      }
      if (!touch) break;
    }
    G4[o + 3] = touch ? 1 : 0;
    if (deep > 0) { const c = Math.min(deep * 0.8, PROP.corr); this.px[k] += nx * c; this.py[k] += ny * c; this.pz[k] += nz * c; }
    // a landing (for the sound job)
    if (touch && vy0 < -PROP.hitEv && this.listeners.length) this.emit(k, this.m[k] * (this.vy[k] - vy0), this.px[k], this.py[k] - this.hy[k], this.pz[k], v0);
  }
  /** body k's plan footprint (an oriented box about its centre: the projection of its box) into this.box */
  footprint(k) {
    const R = this.R, B = this.box;
    // its heading: the body's longer horizontal axis (x or z) projected
    let fx = R[6], fz = R[8];
    if (hyp(fx, fz) * this.hz[k] < hyp(R[0], R[2]) * this.hx[k]) { fx = -R[2]; fz = R[0]; }
    const L = hyp(fx, fz);
    if (L < 1e-6) { fx = 0; fz = 1; } else { fx /= L; fz /= L; }
    const ux = fz, uz = -fx;                                       // across (cos, -sin) with forward (sin, cos)
    const ex = this.hx[k], ey = this.hy[k], ez = this.hz[k];
    B.hx = ex * Math.abs(R[0] * ux + R[2] * uz) + ey * Math.abs(R[3] * ux + R[5] * uz) + ez * Math.abs(R[6] * ux + R[8] * uz);
    B.hz = ex * Math.abs(R[0] * fx + R[2] * fz) + ey * Math.abs(R[3] * fx + R[5] * fz) + ez * Math.abs(R[6] * fx + R[8] * fz);
    B.cos = fz; B.sin = fx;
    return B;
  }
  /** the body's lowest point over its centre (m, world) */
  bottom(k) { const R = this.R; return this.py[k] - (this.hx[k] * Math.abs(R[1]) + this.hy[k] * Math.abs(R[4]) + this.hz[k] * Math.abs(R[7])); }
  top(k) { const R = this.R; return this.py[k] + (this.hx[k] * Math.abs(R[1]) + this.hy[k] * Math.abs(R[4]) + this.hz[k] * Math.abs(R[7])); }
  /** body k against the drive colliders gathered round it: buildings, walls, posts, lamps, trees (pushed out, an impulse
   *  at its side); a resting prop's collider: that prop wakes (a chain) when hit hard enough */
  statics(k) {
    const L = this.near[k];
    if (!L.length) return;
    const B = this.footprint(k), ct = this.ct, y0 = this.bottom(k), y1 = this.top(k);
    for (let q = 0; q < L.length; q += 2) {
      const col = L[q], id = L[q + 1];
      let ref = null;
      if (id < col.P) {
        const kd = col.pkind[id];
        if (kd === KIND.island || kd === KIND.hedge) continue;
        if (heightClear(col, id, y0) || (col.ptop[id] < 1e3 && y0 > col.ptop[id] - 0.02) || (col.pbase[id] > -1e3 && y1 < col.pbase[id])) continue;
        ref = col.pref ? col.pref[id] : null;
      } else ref = col.cref ? col.cref[id - col.P] : null;
      if (ref !== null && ref !== undefined && ref.hidden) continue;
      if (!itemContact(col, id, this.px[k], this.pz[k], B, ct)) continue;
      if (ct.kind === KIND.hedge) continue;
      const pr = ref ? ref.prop : null;
      if (pr && pr !== this.prop[k] && pr.cls.type !== "post") {
        // another prop at rest: it wakes and takes the hit as a body (next substep); else it is a wall
        const vn = -(this.vx[k] * ct.nx + this.vz[k] * ct.nz);
        if (vn > 0.8 && this.wake(pr) >= 0) continue;
      }
      this.wall(k, ct.nx, ct.nz, Math.min(ct.depth, 0.4), B);
    }
  }
  /** body k pushed out of a static along plan n by depth: positional + an impulse at its side, at its centre's height */
  wall(k, nx, nz, depth, B) {
    this.px[k] += nx * depth; this.pz[k] += nz * depth;
    // the contact: the footprint's extent along -n, at the COM height
    const cs = B.cos, sn = B.sin, ext = B.hx * Math.abs(nx * cs - nz * sn) + B.hz * Math.abs(nx * sn + nz * cs);
    const vbefore = this.vx[k] * nx + this.vz[k] * nz;
    const j = this.contactStatic(k, -nx * ext, 0, -nz * ext, nx, 0, nz, PROP.wallE, PROP.wallMu);
    this.stats.statics++;
    if (j > 0 && -vbefore > PROP.hitEv && this.listeners.length) this.emit(k, j, this.px[k] - nx * ext, this.py[k], this.pz[k] - nz * ext, -vbefore);
  }
  /** two awake bodies as spheres */
  pair(i, j) {
    const dx = this.px[i] - this.px[j], dy = this.py[i] - this.py[j], dz = this.pz[i] - this.pz[j], r = this.rad[i] + this.rad[j];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r || d2 < 1e-10) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, pen = r - d, iMi = this.iM[i], iMj = this.iM[j], s = iMi + iMj;
    this.px[i] += nx * pen * iMi / s; this.py[i] += ny * pen * iMi / s; this.pz[i] += nz * pen * iMi / s;
    this.px[j] -= nx * pen * iMj / s; this.py[j] -= ny * pen * iMj / s; this.pz[j] -= nz * pen * iMj / s;
    const vn = (this.vx[i] - this.vx[j]) * nx + (this.vy[i] - this.vy[j]) * ny + (this.vz[i] - this.vz[j]) * nz;
    if (vn >= 0) return;
    const jn = -(1 + 0.2) * vn / s;
    this.vx[i] += nx * jn * iMi; this.vy[i] += ny * jn * iMi; this.vz[i] += nz * jn * iMi;
    this.vx[j] -= nx * jn * iMj; this.vy[j] -= ny * jn * iMj; this.vz[j] -= nz * jn * iMj;
    this.still[i] = this.still[j] = 0;
  }
  /** every awake body by h */
  substep(h) {
    if (!this.nAwake) return;
    const N = PROP.N;
    for (let k = 0; k < N; k++) {
      if (!this.act[k]) continue;
      this.integrate(k, h);
      this.rot(k);
      // the ground plane: sampled again once the body is 0.3 m from where it was
      const dx = this.px[k] - this.gsx_[k * 2], dz = this.pz[k] - this.gsx_[k * 2 + 1];
      if (dx * dx + dz * dz > 0.09) this.sampleGround(k);
      this.groundContact(k);
      this.rot(k);
      this.statics(k);
    }
    for (let i = 0; i < N; i++) {
      if (!this.act[i]) continue;
      for (let j = i + 1; j < N; j++) if (this.act[j]) this.pair(i, j);
    }
  }

  // ---------------------------------------------------------------- the player's vehicle
  /** the 2D player state (carHit.js load conventions) into this.pv */
  loadP(c, m, box) {
    const s = Math.sin(c.heading), k = Math.cos(c.heading), V = this.pv;
    V[0] = c.x; V[1] = c.z; V[2] = s * c.speed + (c.vx || 0); V[3] = k * c.speed + (c.vz || 0); V[4] = c.angularVel || 0;
    V[5] = 1 / m; V[6] = 1 / (m * (4 * box.hx * box.hx + 4 * box.hz * box.hz) / 12 * 0.85); V[7] = c.heading;
  }
  storeP(c) {
    const V = this.pv, s = Math.sin(c.heading), k = Math.cos(c.heading), wx = V[2], wz = V[3];
    c.x = V[0]; c.z = V[1];
    const lat = wx * k - wz * s;
    c.speed = wx * s + wz * k; c.vx = k * lat; c.vz = -s * lat;
    c.angularVel = Math.max(-4, Math.min(4, V[4]));
  }
  /** after a hit: the car takes the whole 2D state back; a two-wheeler only its position and its speed along its heading
   *  (its own state keeps its lean / slip: motoPhysics.js) */
  storeTwo(c, two) {
    if (!two) { this.storeP(c); return; }
    const V = this.pv, s = Math.sin(c.heading), k = Math.cos(c.heading);
    c.x = V[0]; c.z = V[1];
    c.speed = V[2] * s + V[3] * k - (c.vx || 0) * s - (c.vz || 0) * k;
  }
  /**
   * A static collider with prop p touched by the player's vehicle c (carEnv.js collide, pass 0): contact = the push of
   * the vehicle out of it. -> true when the prop takes the hit (the caller does NOT push the vehicle out as off a wall),
   * false: a wall as before. m: the vehicle's mass, two: a two-wheeler (posts are walls for it), h: the substep.
   */
  touch(p, c, contact, box, m, two, h) {
    if (p.state !== 0 && p.state !== 3) return false;                   // (awake / displaced: not a collider any more)
    const cls = p.cls, s = Math.sin(c.heading), k = Math.cos(c.heading);
    const vn = -((s * c.speed + (c.vx || 0)) * contact.nx + (k * c.speed + (c.vz || 0)) * contact.nz);
    this.fx = c.x; this.fz = c.z;
    if (cls.type !== "post") {
      if (vn <= PROP.wake || (two && cls.type === "heavy")) return false;   // (a rider into a parked motorbike: a wall, its crash rules)
      const slot = this.wake(p);
      if (slot < 0) return false;
      if (cls.group && p.group) for (const g of p.group) if (g.state === 0) this.wake(g);   // (a terrace table: its chairs)
      return true;
    }
    if (two) return false;                                               // (a rider: its own crash rules on a post)
    if (p.state === 0 && vn >= cls.snapV) return this.snap(p, c, contact, box, m, vn);
    if (p.state === 0 && vn < cls.bendV) return false;
    // a plastic hinge at the foot: the post bends away by the vehicle's travel into it, resisting with Fy
    this.resolve(p);
    if (p.dead) return false;
    if (p.state === 0) {
      if (this.dalloc(p) < 0) return false;
      p.state = 3; p.ax = -contact.nz; p.az = contact.nx;                // the hinge axis: across the push (the top goes away from the car)
      p.nx0 = contact.nx; p.nz0 = contact.nz;
      p.theta = 0; p.adv = 0; this.onWake?.(p); this.stats.bends++;
      const q = p.d; for (let i = 0; i < 3; i++) this.dpos[q * 3 + i] = p.rest[12 + i];
    }
    if (vn > cls.snapV * 1.15) return this.snap(p, c, contact, box, m, vn);
    // (the push direction of the first touch: the post's foot may pass under the car's middle meanwhile)
    const vb = -((s * c.speed + (c.vx || 0)) * p.nx0 + (k * c.speed + (c.vz || 0)) * p.nz0);
    if (vb > 0) {
      p.adv += vb * h;
      const th = Math.atan2(p.adv, cls.hinge);
      if (th > p.theta) { p.theta = th; this.bendPose(p); this.syncCols(p); }
      // the post's resistance (its plastic moment over the bumper height): the work it takes
      const dv = Math.min(vb, cls.Fy * h / m);
      this.loadP(c, m, box);
      this.pv[2] += p.nx0 * dv; this.pv[3] += p.nz0 * dv;
      this.storeP(c);
      if (p.theta * 180 / Math.PI >= cls.flatDeg) { this.stats.flattened++; this.bendPose(p, true); this.hideRef(p, true); }
    }
    return true;
  }
  /** rule 25 (every collider stands for something drawn): prop p's colliders follow it. Hidden (woken, snapped,
   *  flattened): its drive collider (colliders.js skips a hidden ref) AND its walker posts (ref.walk: [set, item, top],
   *  viewer/character/cityHook.js) off; back at rest: on again at their rest tops. Bent: still standing at its foot (the
   *  collider's foot is drawn there), its tops lowered to the leaning post's drawn top (cos theta): ref.drive
   *  [col, id, top, base] (driveMode.js tileDrive), the walker posts' tops */
  hideRef(p, v) {
    if (!p.ref) return;
    p.ref.hidden = v;
    this.syncCols(p);
  }
  syncCols(p) {
    const r = p.ref;
    if (!r) return;
    const off = r.hidden ? 1 : 0, c = p.state === 3 && !r.hidden ? Math.cos(p.theta) : 1;
    if (r.walk) for (let i = 0; i < r.walk.length; i++) {
      const W = r.walk[i], S = W[0], k = W[1], base = S.iy[k * 2];
      S.off[k] = off;
      S.iy[k * 2 + 1] = base + (W[2] - base) * c;
    }
    if (r.drive) for (let i = 0; i < r.drive.length; i++) {
      const D = r.drive[i], col = D[0], id = D[1];
      if (D[2] < 1e3 && D[3] > -1e3) col.ptop[id] = D[3] + (D[2] - D[3]) * c;
    }
    this.onCols?.(p);
  }
  /** a bent post's foot pose: its rest frame turned about the hinge axis by theta at its foot */
  bendPose(p, flat = false) {
    const q = p.d; if (q < 0) return;
    if (flat) p.theta = Math.max(p.theta, (p.cls.flatDeg + 6) * Math.PI / 180);
    const a = p.theta / 2, sa = Math.sin(a), L = hyp(p.ax, p.az) || 1;
    // the hinge turn (about (ax, 0, az)) times the rest rotation
    const hx = p.ax / L * sa, hz = p.az / L * sa, hw = Math.cos(a);
    const r = this.qtmp; matToQuat(p.rest, r, 0);
    const x = r[0], y = r[1], z = r[2], w = r[3];
    this.dq[q * 4] = hw * x + hx * w + 0 * z - hz * y;
    this.dq[q * 4 + 1] = hw * y - hx * z + 0 * w + hz * x;
    this.dq[q * 4 + 2] = hw * z + hx * y - 0 * x + hz * w;
    this.dq[q * 4 + 3] = hw * w - hx * x - 0 * y - hz * z;
    this.dmoved[q] = 2;
  }
  qtmp = new Float64Array(4);
  /** a post snaps: a body (the car pays breakJ); the impulse exchange follows in playerStep */
  snap(p, c, contact, box, m, vn) {
    if (p.state === 3) p.state = 2;                                      // (bent: it breaks from its bent pose)
    const slot = this.wake(p);
    if (slot < 0) return false;
    this.hideRef(p, true);
    const dv = Math.min(vn * 0.5, p.cls.breakJ / m);
    this.loadP(c, m, box);
    this.pv[2] += contact.nx * dv; this.pv[3] += contact.nz * dv;
    this.storeP(c);
    this.stats.snaps++;
    return true;
  }
  /**
   * The player's vehicle against every awake / displaced prop near it, for one substep h (carEnv.js collide, after the
   * cars): bodies advance by h, then the contacts (a displaced asleep prop hit wakes). box: { hx, hz } half sizes.
   */
  playerStep(c, box, h, m, two) {
    const t0 = performance.now();
    this.substep(h); this.consumed += h;
    this.fx = c.x; this.fz = c.z;
    const yc = Number.isFinite(c.y) ? c.y : NaN, o = this.ob;
    // the displaced props near the vehicle (awake or not)
    for (let q = 0; q < this.dN; q++) {
      const p = this.dprop[q];
      if (p.state === 3) continue;                                       // (bent: its collider at the foot does the work)
      const dx = this.dpos[q * 3] - c.x, dz = this.dpos[q * 3 + 2] - c.z, r = box.hz + 3.5;
      if (dx * dx + dz * dz > r * r) continue;
      let k = p.slot;
      if (k < 0) {
        // asleep: its box in plan (from its pose) first, woken only when the vehicle closes on it
        if (!this.sleeperHit(p, q, c, box, yc)) continue;
        k = this.wake(p);
        if (k < 0) continue;
      }
      this.rot(k);
      const B = this.footprint(k), y0 = this.bottom(k), y1 = this.top(k);
      if (yc === yc && (y1 < yc + PROP.band0 || y0 > yc + PROP.band1)) continue;
      if (!obbObb(c.x, c.z, c.heading, box.hx, box.hz, this.px[k], this.pz[k], Math.atan2(B.sin, B.cos), B.hx, B.hz, o)) continue;
      this.playerHit(c, box, k, o.nx, o.nz, o.depth, m, two, yc, B);
    }
    this.stats.ms += performance.now() - t0;
  }
  /** an asleep displaced prop: does the vehicle's box overlap its footprint (from its pose), closing? */
  sleeperHit(p, q, c, box, yc) {
    const S = p.shape, Q = this.dq, o = q * 4;
    const x = Q[o], y = Q[o + 1], z = Q[o + 2], w = Q[o + 3], R = this.R;
    R[0] = 1 - 2 * (y * y + z * z); R[1] = 2 * (x * y + z * w); R[2] = 2 * (x * z - y * w);
    R[3] = 2 * (x * y - z * w); R[4] = 1 - 2 * (x * x + z * z); R[5] = 2 * (y * z + x * w);
    R[6] = 2 * (x * z + y * w); R[7] = 2 * (y * z - x * w); R[8] = 1 - 2 * (x * x + y * y);
    const cx = this.dpos[q * 3] + R[0] * S.cx + R[3] * S.cy + R[6] * S.cz, cz = this.dpos[q * 3 + 2] + R[2] * S.cx + R[5] * S.cy + R[8] * S.cz;
    const cy = this.dpos[q * 3 + 1] + R[1] * S.cx + R[4] * S.cy + R[7] * S.cz;
    const ey = S.hx * Math.abs(R[1]) + S.hy * Math.abs(R[4]) + S.hz * Math.abs(R[7]);
    if (yc === yc && (cy + ey < yc + PROP.band0 || cy - ey > yc + PROP.band1)) return false;
    const r = Math.max(S.hx, S.hz, S.hy) + 0.05, dx = cx - c.x, dz = cz - c.z;
    // the vehicle's box vs a circle of the prop's reach (cheap; the exact test follows once it is a body)
    const cs = Math.cos(c.heading), sn = Math.sin(c.heading), u = dx * cs - dz * sn, v = dx * sn + dz * cs;
    const qu = Math.max(-box.hx, Math.min(box.hx, u)), qv = Math.max(-box.hz, Math.min(box.hz, v));
    if ((u - qu) ** 2 + (v - qv) ** 2 > r * r) return false;
    const s = Math.sin(c.heading), k = Math.cos(c.heading), vx = s * c.speed + (c.vx || 0), vz = k * c.speed + (c.vz || 0);
    return vx * dx + vz * dz > 0.02 * Math.sqrt(dx * dx + dz * dz);         // (closing at all: a knocked prop is pushed, never driven through)
  }
  /** the vehicle vs awake body k: n = the push of the vehicle out of the prop (plan), both masses at the bumper */
  playerHit(c, box, k, nx, nz, depth, m, two, yc, B) {
    this.loadP(c, m, box);
    const V = this.pv, iP = V[5], iK = this.iM[k], s = iP + iK;
    // positional: shared by the inverse masses (a light prop moves, the car barely)
    this.px[k] -= nx * depth * iK / s; this.pz[k] -= nz * depth * iK / s;
    V[0] += nx * depth * iP / s; V[1] += nz * depth * iP / s;
    // the contact point: the prop's side facing the car, at bumper height (clamped into the prop)
    const cs = B.cos, sn = B.sin, ext = B.hx * Math.abs(nx * cs - nz * sn) + B.hz * Math.abs(nx * sn + nz * cs);
    const px = this.px[k] + nx * ext, pz = this.pz[k] + nz * ext;
    const y0 = this.bottom(k), y1 = this.top(k);
    const py = Math.max(y0 + 0.03, Math.min(y1 - 0.03, (yc === yc ? yc : y0) + PROP.bumper));
    const rx = px - this.px[k], ry = py - this.py[k], rz = pz - this.pz[k];
    const qx = px - V[0], qz = pz - V[1];
    // the normal on the prop (pushed away from the car), tilted up: the bonnet scoops a light prop up
    const lift = this.prop[k].cls.lift, Ln = Math.sqrt(1 + lift * lift), Nx = -nx / Ln, Ny = lift / Ln, Nz = -nz / Ln;
    // relative velocity at the point (prop - car): the car's point (plan) v + w x r
    const cvx = V[2] + V[4] * qz, cvz = V[3] - V[4] * qx;
    const ux = this.vx[k] + this.wy[k] * rz - this.wz[k] * ry - cvx, uy = this.vy[k] + this.wz[k] * rx - this.wx[k] * rz, uz = this.vz[k] + this.wx[k] * ry - this.wy[k] * rx - cvz;
    const vn = ux * Nx + uy * Ny + uz * Nz;                                // < 0: the car closing on the prop
    this.still[k] = 0;
    if (vn >= 0) { this.storeTwo(c, two); return; }
    const cls = this.prop[k].cls, e = -vn < PROP.eSlow ? 0 : cls.e + 0.1;
    // the car's share: plan normal (Nx, Nz) at q, yaw inertia
    const crq = qz * Nx - qx * Nz;
    const Kc = iP * (Nx * Nx + Nz * Nz) + crq * crq * V[6];
    const j = -(1 + e) * vn / (this.kEff(k, rx, ry, rz, Nx, Ny, Nz) + Kc);
    this.applyImpulse(k, rx, ry, rz, Nx * j, Ny * j, Nz * j);
    // friction along the bumper (spins the prop; <= 0.3 j)
    {
      const wx = this.vx[k] + this.wy[k] * rz - this.wz[k] * ry - cvx, wz = this.vz[k] + this.wx[k] * ry - this.wy[k] * rx - cvz;
      const d = wx * Nx + wz * Nz, tx0 = wx - d * Nx, tz0 = wz - d * Nz, vt = hyp(tx0, tz0);
      if (vt > 1e-5) { const tx = tx0 / vt, tz = tz0 / vt, jt = Math.min(0.3 * j, vt / (this.kEff(k, rx, ry, rz, tx, 0, tz) + iP)); this.applyImpulse(k, rx, ry, rz, -tx * jt, 0, -tz * jt); V[2] += tx * jt * iP * (two ? 0 : 1); V[3] += tz * jt * iP * (two ? 0 : 1); }
    }
    // the car takes the reaction's plan part (a two-wheeler too: by its own mass)
    V[2] -= Nx * j * iP; V[3] -= Nz * j * iP; V[4] -= crq * j * V[6];
    this.storeTwo(c, two);
    if (this.listeners.length && j * iK > 0.5) this.emit(k, j, px, py, pz, -vn);
    this.stats.solves++;
  }

  // ---------------------------------------------------------------- the walker (third person)
  /** the walker at (x, y, z) moving (vx, vz) m/s: kicks the light props it walks into (rest ones via `rest`: a list of
   *  the props near it the caller found, awake / displaced ones directly) */
  walk(x, y, z, vx, vz, rest = null) {
    const r0 = PROP.walkR, v = hyp(vx, vz);
    for (let k = 0; k < PROP.N; k++) if (this.act[k] && this.prop[k].cls.walk) this.kick(k, x, y, z, vx, vz);
    if (v < 0.3) return;
    for (let q = 0; q < this.dN; q++) {
      const p = this.dprop[q];
      if (p.slot >= 0 || !p.cls.walk || p.state !== 2) continue;
      const dx = this.dpos[q * 3] - x, dz = this.dpos[q * 3 + 2] - z;
      if (dx * dx + dz * dz > 1.5 * 1.5) continue;
      const S = p.shape, rr = r0 + Math.max(S.hx, S.hz) * 0.9;
      if (dx * dx + dz * dz < rr * rr && (vx * dx + vz * dz) > 0) { const k = this.wake(p); if (k >= 0) this.kick(k, x, y, z, vx, vz); }
    }
    if (rest) for (let i = 0; i < rest.length; i++) {
      const p = rest[i];
      if (p.state !== 0 || !p.cls.walk || (p.ref && p.ref.hidden)) continue;
      const dx = p.x - x, dz = p.z - z, rr = r0 + 0.28;
      if (dx * dx + dz * dz > rr * rr || (vx * dx + vz * dz) <= 0) continue;
      const k = this.wake(p);
      if (k >= 0) this.kick(k, x, y, z, vx, vz);
    }
  }
  /** the walker (a 75 kg body, its shin at 0.3 m) against awake body k */
  kick(k, x, y, z, vx, vz) {
    const r0 = PROP.walkR;
    this.rot(k);
    const dx = this.px[k] - x, dz = this.pz[k] - z, d = hyp(dx, dz), R = r0 + this.rad[k];
    if (d > R || this.bottom(k) > y + 1.6 || this.top(k) < y + 0.05) return;
    const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
    this.px[k] += nx * (R - d) * 0.8; this.pz[k] += nz * (R - d) * 0.8;
    const vrel = (vx - this.vx[k]) * nx + (vz - this.vz[k]) * nz;
    if (vrel <= 0) return;
    const cls = this.prop[k].cls, py = Math.max(this.bottom(k) + 0.03, Math.min(this.top(k) - 0.03, y + 0.3));
    const rx = -nx * this.rad[k] * 0.8, ry = py - this.py[k], rz = -nz * this.rad[k] * 0.8;
    const lift = cls.lift * 0.6, Ln = Math.sqrt(1 + lift * lift), Nx = nx / Ln, Ny = lift / Ln, Nz = nz / Ln;
    const j = (1 + 0.25) * vrel / (this.kEff(k, rx, ry, rz, Nx, Ny, Nz) + 1 / PROP.walkM);
    this.applyImpulse(k, rx, ry, rz, Nx * j, Ny * j, Nz * j);
    this.still[k] = 0;
    if (this.listeners.length && vrel > 0.6) this.emit(k, j, x + nx * r0, py, z + nz * r0, vrel);
  }

  // ---------------------------------------------------------------- once per frame
  /** the rest of the frame's time for the bodies (after the player's substeps), settle / sleep, the poses. fx, fz: the
   *  player / camera (focus) */
  frame(dt, fx = 0, fz = 0) {
    const t0 = performance.now();
    this.fx = fx; this.fz = fz;
    const rem = Math.min(0.1, dt - this.consumed);
    this.consumed = 0;
    if (rem > 1e-4 && this.nAwake) { const n = Math.ceil(rem * 120 - 1e-6), h = rem / n; for (let s = 0; s < n; s++) this.substep(h); }
    let moved = 0;
    for (let k = 0; k < PROP.N; k++) {
      if (!this.act[k]) continue;
      const finite = Number.isFinite(this.px[k]) && Number.isFinite(this.py[k]) && Number.isFinite(this.pz[k]) && Number.isFinite(this.qw[k]);
      if (!finite) { const p = this.prop[k]; this.freeBody(k); if (p) this.reset(p); continue; }   // (never: the gate proves it)
      const v2 = this.vx[k] ** 2 + this.vy[k] ** 2 + this.vz[k] ** 2, w2 = this.wx[k] ** 2 + this.wy[k] ** 2 + this.wz[k] ** 2;
      const rest = v2 < PROP.sleepV ** 2 && w2 < PROP.sleepW ** 2 && this.gground[k * 4 + 3] > 0;
      this.still[k] = rest ? this.still[k] + dt : 0;
      this.writePose(k);
      moved++;
      if (this.still[k] >= PROP.sleepT || this.sleepAll || (this.age[k] > PROP.maxAwake && this.gground[k * 4 + 3] > 0)) { this.sleep(k); continue; }
      this.gatherNear(k);
    }
    this.moved = moved;
    this.stats.awake = this.nAwake; this.stats.displaced = this.dN;
    const ms = performance.now() - t0 + this.stats.ms;
    this.stats.ms = 0;
    this.stats.frameMs = this.stats.frameMs * 0.95 + ms * 0.05;
    this.stats.msMax = Math.max(this.stats.msMax * 0.995, ms);
    this.framed++;
  }
  /** the traffic's obstacle hook (cityTraffic.js): every displaced prop off its rest spot (or awake) in reach is a box */
  addObstacles(sim, fx, fz, reach = 220) {
    let n = 0;
    for (let q = 0; q < this.dN && n < 96; q++) {
      const p = this.dprop[q], S = p.shape;
      if (!S) continue;
      const x = this.dpos[q * 3], z = this.dpos[q * 3 + 2];
      if ((x - fx) ** 2 + (z - fz) ** 2 > reach * reach) continue;
      if (p.state === 3 && p.ref && !p.ref.hidden) continue;           // (bent, still standing at its foot: as before)
      const k = p.slot, R = Math.max(S.hx, S.hz, S.hy);
      sim.addBoxObstacle(x, z, p.yaw, R + 0.1, R + 0.1, k >= 0 ? this.vx[k] : 0, k >= 0 ? this.vz[k] : 0);
      n++;
    }
    return n;
  }
}

/** the rotation of a column-major 4x4 (rigid, any scale divided out) as a quaternion into out[o..o+3] */
export function matToQuat(M, out, o = 0) {
  const sx = Math.sqrt(M[0] * M[0] + M[1] * M[1] + M[2] * M[2]) || 1, sy = Math.sqrt(M[4] * M[4] + M[5] * M[5] + M[6] * M[6]) || 1, sz = Math.sqrt(M[8] * M[8] + M[9] * M[9] + M[10] * M[10]) || 1;
  const m00 = M[0] / sx, m10 = M[1] / sx, m20 = M[2] / sx, m01 = M[4] / sy, m11 = M[5] / sy, m21 = M[6] / sy, m02 = M[8] / sz, m12 = M[9] / sz, m22 = M[10] / sz;
  const tr = m00 + m11 + m22;
  let x, y, z, w;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (m21 - m12) * s; y = (m02 - m20) * s; z = (m10 - m01) * s; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
  const L = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  out[o] = x / L; out[o + 1] = y / L; out[o + 2] = z / L; out[o + 3] = w / L;
}

/** a displaced prop's foot frame (pos + quat) as a column-major 4x4 into out (Float32Array / Float64Array, offset o) */
export function poseMatrix(px, py, pz, x, y, z, w, out, o = 0) {
  out[o] = 1 - 2 * (y * y + z * z); out[o + 1] = 2 * (x * y + z * w); out[o + 2] = 2 * (x * z - y * w); out[o + 3] = 0;
  out[o + 4] = 2 * (x * y - z * w); out[o + 5] = 1 - 2 * (x * x + z * z); out[o + 6] = 2 * (y * z + x * w); out[o + 7] = 0;
  out[o + 8] = 2 * (x * z + y * w); out[o + 9] = 2 * (y * z - x * w); out[o + 10] = 1 - 2 * (x * x + y * y); out[o + 11] = 0;
  out[o + 12] = px; out[o + 13] = py; out[o + 14] = pz; out[o + 15] = 1;
}
