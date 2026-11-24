// THE GYM FLIGHT CONTROLLER (labs/falcon-gym.html; the design and the why: docs/FALCON_GYM.md). One simple, consistent
// set of rules, pure JS (node tests it: tools/falconGymTest.mjs), next to the city game's controller
// (viewer/falconFlight/flightModel.js + flightAssist.js + falconFun.js, untouched) so the owner can compare.
//
//   steer    the mouse aim (or A/D W/S) is a DIRECTION: the falcon banks and pitches to fly there (a coordinated turn
//            whose lift is limited by the speed: slow = wide turns, fast = tight ones, up to nMax g). Let go = it holds
//            its heading and levels its path (auto-level).
//   cruise   level, hands off: flap-flap-glide bursts hold ~21 m/s (76 km/h) as a real peregrine's flapping flight
//   Space    POWER: hard wingbeats while stamina lasts: up to ~31 m/s (112 km/h) level (the chase), or a 3-5 m/s climb
//   stoop    hold Shift / right button: the wings tuck, the falcon dives where you point (at least 35 deg down) and
//            gravity does the rest: 300+ km/h from a few hundred metres, the 389 km/h record as the ceiling
//            (terminal 108 m/s); let go = the wings half open and it pulls out (up to 8 g); a ground guard pulls out
//            for you when the floor comes too close
//   walls    a look-ahead banks and climbs away from what is ahead; a touch SLIDES along the wall (the normal part of the
//            speed is taken off, never bounced); a tumble only for a head-on hit over 13 m/s normal speed
//   ground   standing on anything (the ground, a roof, a sill, the spire): W walks, A/D turn, the mouse turns. Space:
//            room above the wings -> a JUMP + hard wingbeats, nearly vertical and slow, out of an alley; a free drop in
//            front (a ledge, a roof edge) -> a forward launch off the edge; no room (a covered passage) -> it walks /
//            hops to the nearest spot it can launch from, then launches. Walking off an edge launches too.
//   land     E with a ledge / top surface ahead (< 35 m, < 26 m/s): a final glide and the FLARE onto it; or fly slowly
//            (< 11 m/s) onto any top face and it touches down
// Frame: world metres, +y up; heading 0 = toward -z, positive = turning left (three.js yaw, as flightModel.js).

export const G = 9.81, RHO = 1.2;
export const GYM = {
  mass: 1.0,                      // kg (a juvenile female)
  cruise: 21,                     // m/s: level hands-off speed (flap-glide)
  stallV: { spread: 8.0, half: 12.5, tuck: 32 },       // m/s: 1 g of lift at CLmax; n available = (V / stallV)^2
  nMax: 6, nMaxStoop: 8,          // g: the pull limit (the stoop's pull-out a little more, the arcade stoop has 9)
  cda: { spread: 0.0035, half: 0.0045, tuck: 0.0043 },  // m^2: parasite drag area (body + wing profile)
  kInd: { spread: 59, half: 135, tuck: 300 },           // N m^2/s^2: induced drag = kInd n^2 / V^2
  thrust0: 0.55,                  // g: hard wingbeats at rest, falling as 1 - (V / vFlapMax)^2
  vFlapMax: 40,
  stoopPush: 2.0,                 // x g x sin(dive) x tuck: the stoop's compression (docs/FALCON_GYM.md: a 300 m drop
                                  // gives ~200 km/h in pure physics; the gym and the city are only a few hundred m tall)
  bankMax: 75 * Math.PI / 180, rollRate: 3.2,          // rad, rad/s (the tuck rolls faster: x1.5)
  stamina: { power: 1 / 22, cruise: 1 / 160, regen: 1 / 35, rest: 1 / 4 },   // per second
  ceiling: [900, 1200],           // m over the ground: the wingbeats fade (thin air, a tired bird); thermals still lift
  stunVn: 13,                     // m/s of normal speed into a wall for a tumble (a 15 deg graze at 31 m/s is 8)
  radius: 0.35,                   // m: the body's collision sphere
  span: 1.05,                     // m: the life-size wingspan (room for a vertical take-off: 0.7 m each side)
  walk: 1.0, hop: 2.6,            // m/s on the ground
  look: 1.25,                     // s of flight the wall look-ahead covers
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const cfg = (fold, k) => (fold < 0.5 ? lerp(GYM[k].spread, GYM[k].half, fold / 0.5) : lerp(GYM[k].half, GYM[k].tuck, (fold - 0.5) / 0.5));

/** the controls (any device fills them): aimYaw / aimPitch (rad, null = no aim), turn (+1 left), vert (+1 nose up),
 *  power 0..1 (Space), stoop 0..1 (Shift), half 0..1 (C), brake 0..1 (Q), land (E, one-shot), jump (Space press) */
export class GymControls {
  constructor() { this.aimYaw = null; this.aimPitch = 0; this.turn = 0; this.vert = 0; this.power = 0; this.stoop = 0; this.half = 0; this.brake = 0; this.land = false; this.jump = false; this.talons = 0; }
}

export class GymFlight {
  constructor(world, P = GYM) {
    this.world = world; this.P = { ...P };
    this.pos = { x: 0, y: 0, z: 0 }; this.vel = { x: 0, y: 0, z: 0 }; this.va = { x: 0, y: 0, z: -1 };
    this.V = 0; this.heading = 0; this.gamma = 0; this.phi = 0; this.alpha = 0;
    this.fold = 0; this.flapLevel = 0; this.brake = 0; this.n = 1; this.lift = 0; this.stun = 0;
    this.stamina = 1; this.extraMass = 0;
    this.mode = "ground";           // ground | hop | launch | fly | land
    this.walkV = 0; this.burst = 0; this.burstOn = false;
    this.events = [];               // { kind, ... } one-shot messages for the HUD / tests
    this.stats = { maxV: 0, stuns: 0, wallTouches: 0, grazes: 0, guard: 0, launches: 0, hops: 0, landings: 0 };
    this._h = {}; this._r = {}; this._air = { x: 0, y: 0, z: 0 }; this.t = 0;
    this.hopT = null; this.launchT = null; this.landT = null; this.after = null;
    this.avoid = { yaw: 0, pitch: 0, d: Infinity };
    this.air = null;
  }

  say(kind, s) { this.events.push({ kind, s, t: this.t }); if (this.events.length > 20) this.events.shift(); }

  /** stand at (x, y = feet, z) facing heading */
  placeOnGround(x, y, z, heading = 0) {
    Object.assign(this.pos, { x, y: y + this.P.radius, z }); Object.assign(this.vel, { x: 0, y: 0, z: 0 });
    this.heading = heading; this.gamma = 0; this.phi = 0; this.V = 0; this.mode = "ground"; this.walkV = 0; this.fold = 0; this.brake = 0; this.stun = 0;
  }
  /** free flight from a point */
  launchAt(x, y, z, heading, V = 18, gamma = 0) {
    Object.assign(this.pos, { x, y, z }); this.heading = heading; this.gamma = gamma; this.V = V; this.phi = 0;
    this.mode = "fly"; this.fold = 0; this.stun = 0; this.syncVel();
  }
  syncVel() {
    const c = Math.cos(this.gamma), hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);
    this.va.x = hx * c * this.V; this.va.y = Math.sin(this.gamma) * this.V; this.va.z = hz * c * this.V;
    this.vel.x = this.va.x + this._air.x; this.vel.y = this.va.y + this._air.y; this.vel.z = this.va.z + this._air.z;
  }
  get feetY() { return this.pos.y - this.P.radius; }
  agl() { return this.pos.y - this.world.column(this.pos.x, this.pos.z, this.pos.y).floor; }

  step(dt, C) {
    this.t += dt;
    const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1, h = dt / n;
    for (let i = 0; i < n; i++) this.sub(h, C, i === 0);
    C.land = false; C.jump = false;
  }

  sub(dt, C, first) {
    switch (this.mode) {
      case "ground": return this.groundStep(dt, C, first);
      case "hop": return this.hopStep(dt, C);
      case "launch": return this.launchStep(dt, C);
      case "land": return this.landStep(dt);
      default: return this.flyStep(dt, C, first);
    }
  }

  // ------------------------------------------------------------------------------------------------ the air
  airAt(dt) {
    const a = this._air;
    if (this.air) { this.air.sample(this.pos.x, this.pos.y, this.pos.z, this.t, a); this.lift = a.y; }
    else { a.x = a.y = a.z = 0; this.lift = 0; }
    return a;
  }

  // ------------------------------------------------------------------------------------------------ flight
  flyStep(dt, C, first) {
    const P = this.P, w = this.world, m = P.mass + this.extraMass;
    let V = Math.max(this.V, 4);
    // --- the wings: stoop (tuck), half fold (C), spread; brake (the flare)
    const diveOk = this.gamma < -0.3 || V > 35;
    const foldT = this.guarding ? 0.45 : C.stoop > 0.5 ? (diveOk ? 1 : 0.55) : C.half > 0.5 ? 0.5 : 0;
    this.fold = ease(this.fold, foldT, foldT > this.fold ? 5 : 3.5, dt);
    this.brake = ease(this.brake, C.brake, 6, dt);
    // --- the target direction
    let psiT = this.heading, gamT = 0;
    if (C.aimYaw != null) { psiT = C.aimYaw; gamT = C.aimPitch; }
    else {
      if (C.turn) psiT = this.heading + C.turn * 0.9;
      gamT = C.vert ? C.vert * 0.7 : 0;                      // let go: level (auto-level)
    }
    if (C.stoop > 0.5) gamT = Math.min(gamT, -0.6);            // the stoop: at least ~35 deg down
    // slow and climbing: keep flying (no stall): the path target eases down as the speed nears the stall
    const vs = cfg(this.fold, "stallV");
    if (gamT > 0 && C.power < 0.5) gamT *= smooth(V, vs + 1, vs + 8);
    else if (gamT > 0) gamT *= smooth(V, vs - 1, vs + 4);
    if (V < vs + 1.5) gamT = Math.min(gamT, -0.15 * (vs + 1.5 - V));
    // --- the look-ahead: walls and the ground (first substep of a frame only: cheap)
    if (first) this.lookAhead(V);
    psiT += this.avoid.yaw; gamT = Math.max(gamT, -1.45) + this.avoid.pitch;
    // the ground guard: the height the pull-out needs at this speed and dive (+ a 0.35 s reaction, 3 m margin)
    const nPull = Math.min(this.fold > 0.5 ? P.nMaxStoop : P.nMax, (V / cfg(Math.min(this.fold, 0.5), "stallV")) ** 2);
    const R = V * V / (G * Math.max(nPull - 1, 0.5)), sinD = Math.max(0, -Math.sin(this.gamma));
    const need = R * (1 - Math.cos(Math.asin(sinD))) + V * sinD * 0.35 + 3;
    const fl = this.floorAhead(V);
    this.guarding = sinD > 0.05 && this.pos.y - fl < need;
    if (this.guarding) { gamT = Math.max(gamT, 0.05); this.stats.guard++; }
    gamT = clamp(gamT, -1.45, 1.2);
    // --- coordinated flight: the wanted turn and pitch rates -> the lift vector (bank + load), limited by the wing
    const kPsi = 1.6, kGam = 2.4;
    const dPsi = wrap(psiT - this.heading), dGam = gamT - this.gamma;
    const cg = Math.max(Math.cos(this.gamma), 0.15);
    const aLat = clamp(kPsi * dPsi, -1.2, 1.2) * V * cg;                 // m/s^2 sideways (a turn)
    const aUp = kGam * dGam * V * 0.6 + G * Math.cos(this.gamma);          // m/s^2 along the lift's up
    let nAvail = (V / vs) ** 2 * (1 + 0.6 * this.brake) + (C.power > 0.5 || this.burstOn ? 0.35 : 0);
    nAvail = Math.min(nAvail, this.fold > 0.5 || this.guarding ? P.nMaxStoop : P.nMax);
    // bank: toward the wanted lift direction, at the roll rate, capped
    // (pushing over into a dive asks for less than 0 g along the lift's up: the wings unload, down to -1 g, wings level)
    const push0 = aUp < 0.5;
    const phiT = push0 ? 0 : clamp(Math.atan2(aLat, aUp), -P.bankMax, P.bankMax);
    const rr = P.rollRate * (1 + 0.5 * smooth(this.fold, 0.5, 1));
    this.phi += clamp(phiT - this.phi, -rr * dt, rr * dt);
    let aL, aU;
    if (push0) { aU = Math.max(aUp, -G); aL = clamp(aLat, -0.3 * G, 0.3 * G); this.n = Math.abs(aU) / G; }
    else {
      const L = Math.min(Math.hypot(aLat, aUp), nAvail * G);
      // the lift along the bank: the part that turns, the part that holds / changes the path angle
      aL = L * Math.sin(this.phi); aU = L * Math.cos(this.phi);
      this.n = L / G;
    }
    // --- along the path: thrust, drag, gravity, the stoop's push
    const q = 0.5 * RHO * V * V;
    const D = q * (cfg(this.fold, "cda") + 0.03 * this.brake) + cfg(this.fold, "kInd") * this.n * this.n / (V * V);
    const agl = this.pos.y - fl;
    const thin = 1 - smooth(agl, P.ceiling[0], P.ceiling[1]);
    const Tmax = P.thrust0 * G * m * Math.max(0, 1 - (V / P.vFlapMax) ** 2) * thin * (this.stamina > 0.02 ? 1 : 0.3);
    // cruise: flap-flap-glide bursts hold the cruise speed when level and the player does not ask for power
    let u = 0;
    if (C.power > 0.05) u = C.power;
    else if (this.fold < 0.3 && this.gamma > -0.12) {
      const need = (D + m * G * Math.sin(this.gamma) + m * (P.cruise - V) * 0.6) / Math.max(Tmax, 1e-3);
      const duty = clamp(need, 0, 0.85);
      this.burst -= dt;
      if (this.burst <= 0) { this.burstOn = !this.burstOn && duty > 0.05; this.burst = this.burstOn ? 0.9 : (duty > 0.05 ? 0.9 * (1 - duty) / duty : 0.5); this.burst = Math.min(this.burst, 3); }
      u = this.burstOn ? 1 : 0;
    } else this.burstOn = false;
    if (C.power > 0.05) this.burstOn = false;
    const T = Tmax * u;
    this.flapLevel = ease(this.flapLevel, u > 0 ? (C.power > 0.05 ? 1 : 0.55) : 0, 8, dt);
    this.stamina = clamp(this.stamina - (C.power > 0.05 ? P.stamina.power * C.power : u * P.stamina.cruise) * dt + (u === 0 ? P.stamina.regen * dt : 0), 0, 1);
    const push = P.stoopPush * G * Math.max(0, -Math.sin(this.gamma)) * smooth(this.fold, 0.55, 1);
    const Vdot = (T - D) / m - G * Math.sin(this.gamma) + push;
    // --- integrate the path
    V = Math.max(1, V + Vdot * dt);
    this.gamma = clamp(this.gamma + (aU - G * Math.cos(this.gamma)) / V * dt, -1.48, 1.35);
    this.heading = wrap(this.heading + aL / (V * Math.max(Math.cos(this.gamma), 0.15)) * dt);
    this.V = V; this.alpha = clamp(0.05 + 0.25 * (this.n - 1) / Math.max(nAvail, 1) + 0.4 * this.brake, 0, 0.6);
    if (this.stun > 0) this.stun -= dt;
    this.airAt(dt);
    this.syncVel();
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    this.stats.maxV = Math.max(this.stats.maxV, V);
    this.collideFly(dt);
    if (C.land && this.mode === "fly") this.tryLand();
  }

  /** the highest floor under the next ~1.2 s of path */
  floorAhead(V) {
    const w = this.world, hx = -Math.sin(this.heading), hz = -Math.cos(this.heading), c = Math.cos(this.gamma);
    let f = -Infinity;
    for (let s = 0; s <= 1.2; s += 0.3) {
      const d = V * c * s;
      const y = this.pos.y + Math.sin(this.gamma) * V * s;
      f = Math.max(f, w.column(this.pos.x + hx * d, this.pos.z + hz * d, Math.max(y, this.pos.y - 2)).floor);
    }
    return f;
  }

  /** wall look-ahead: three rays (ahead, +-28 deg) over GYM.look s of flight; blocked ahead -> turn toward the freer
   *  side and climb if the obstacle's top is near, fading as the way clears (soft, never a snap) */
  lookAhead(V) {
    const w = this.world, P = this.P, L = clamp(V * P.look, 8, 70), p = this.pos, c = Math.cos(this.gamma), sg = Math.sin(this.gamma);
    const dir = (dy) => { const a = this.heading + dy; return [-Math.sin(a) * c, sg, -Math.cos(a) * c]; };
    const d0 = dir(0), dl = dir(0.5), dr = dir(-0.5);
    const f0 = w.ray(p.x, p.y, p.z, d0[0], d0[1], d0[2], L), fl = w.ray(p.x, p.y, p.z, dl[0], dl[1], dl[2], L), fr = w.ray(p.x, p.y, p.z, dr[0], dr[1], dr[2], L);
    const A = this.avoid;
    let yaw = 0, pitch = 0;
    if (this.landT == null && (f0 < L || Math.min(fl, fr) < L * 0.5)) {
      const k = f0 < L ? 1 - f0 / L : 0.5 * (1 - Math.min(fl, fr) / (L * 0.5));
      yaw = (fl > fr ? 1 : -1) * 1.1 * k;
      // a low obstacle (its top within ~12 m over the bird): over it instead
      const top = w.column(p.x + d0[0] * Math.min(f0, L) * 1.02, p.z + d0[2] * Math.min(f0, L) * 1.02, p.y + 50).floor;
      if (f0 < L && top - p.y < 12 && top - p.y > -2) { pitch = 0.6 * k; yaw *= 0.4; }
    }
    A.yaw = ease(A.yaw, yaw, 6, 1 / 60); A.pitch = ease(A.pitch, pitch, 6, 1 / 60); A.d = f0;
  }

  /** the sphere against the boxes: slide along (the normal part of the speed taken off), touch down on top faces when
   *  slow, a tumble only for a hard head-on hit */
  collideFly(dt) {
    const P = this.P, H = this.world.sphereHit(this.pos.x, this.pos.y, this.pos.z, P.radius, this._h);
    if (H.soft > 0) { const k = Math.exp(-2.2 * H.soft * dt); this.V *= k; }    // brushing through a crown's leaves
    if (!H.hit) return;
    this.pos.x += H.nx * H.depth; this.pos.y += H.ny * H.depth; this.pos.z += H.nz * H.depth;
    const vn = -(this.va.x * H.nx + this.va.y * H.ny + this.va.z * H.nz);
    if (vn <= 0) return;
    // touch-down: a top face, slow enough, not diving hard
    if (H.ny > 0.7 && this.V < 11 && this.va.y > -4) {
      this.say("touchdown", "touched down");
      this.placeOnGround(this.pos.x, this.pos.y - P.radius, this.pos.z, this.heading);
      this.stats.landings++; return;
    }
    this.stats.wallTouches++;
    // a tumble only head-on into a big solid; thin things (a sill, a railing, a low wall) only deflect: a small mistake
    const thin = H.kind === "sill" || H.kind === "parapet" || H.kind === "balcony" || H.kind === "wall" || H.kind === "bench" || H.kind === "trunk";
    if (vn > P.stunVn && !thin) { this.stun = 0.7; this.stats.stuns++; this.say("tumble", `hit the ${H.kind} at ${vn.toFixed(0)} m/s: tumbling`); }
    else this.stats.grazes++;
    // the new air velocity: the tangent part, a little friction for the scrape; heading / path from it
    const tx = this.va.x + vn * H.nx, ty = this.va.y + vn * H.ny, tz = this.va.z + vn * H.nz;
    const Vt = Math.hypot(tx, ty, tz), k = vn > P.stunVn && !thin ? 0.35 : 1 - 0.25 * vn / Math.max(this.V, 1);
    this.V = Math.max(Vt * k, 3);
    if (Vt > 0.5) { this.heading = Math.atan2(-tx, -tz); this.gamma = Math.asin(clamp(ty / Vt, -1, 1)); }
    // bank away from the wall for a moment (the look-ahead's yaw toward the free side)
    const side = Math.sign(-Math.sin(this.heading) * H.nz + Math.cos(this.heading) * H.nx) || 1;
    this.avoid.yaw = clamp(this.avoid.yaw - side * 0.4, -1.2, 1.2);
    this.syncVel();
  }

  // ------------------------------------------------------------------------------------------------ landing
  /** the landing target ahead: a ledge or any top surface 8-35 m ahead, below the bird or a little over it */
  landingTarget() {
    const w = this.world, p = this.pos, hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);
    if (this.V > 26) return null;
    let best = null, bd = 35;
    for (const l of w.ledges) {
      const dx = l.x - p.x, dy = l.y - p.y, dz = l.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d > bd || d < 2) continue;
      if ((dx * hx + dz * hz) / Math.max(Math.hypot(dx, dz), 0.1) < 0.45 || dy > 6 || dy < -30) continue;
      if (!this.clearLine(p, l)) continue;
      bd = d; best = { x: l.x, y: l.y, z: l.z, yaw: l.yaw, name: l.kind };
    }
    if (best) return best;
    // any level top surface ahead (10-25 m on)
    for (let d = 10; d <= 25; d += 3) {
      const x = p.x + hx * d, z = p.z + hz * d, c = w.column(x, z, p.y), f = c.floor;
      if (p.y - f < 1 || p.y - f > 30) continue;
      let flat = true;
      for (const [a, b] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) if (Math.abs(w.column(x + a, z + b, p.y).floor - f) > 0.3) flat = false;
      if (flat && this.clearLine(p, { x, y: f, z })) return { x, y: f, z, yaw: this.heading, name: f > w.Y0 + 1 ? "roof" : "ground" };
    }
    return null;
  }
  clearLine(p, q) {
    const dx = q.x - p.x, dy = q.y + 0.6 - p.y, dz = q.z - p.z, d = Math.hypot(dx, dy, dz);
    return this.world.ray(p.x, p.y, p.z, dx / d, dy / d, dz / d, d - 0.8) === Infinity;
  }
  tryLand() {
    const q = this.landingTarget();
    if (!q) { this.say("noland", "nowhere to land ahead (a ledge or a roof < 35 m, under 26 m/s)"); return; }
    const p0 = { ...this.pos }, v0 = { ...this.va }, d = Math.hypot(q.x - p0.x, q.y - p0.y, q.z - p0.z);
    const T = clamp(d / Math.max(this.V * 0.6, 4), 0.9, 2.8);
    const fx = -Math.sin(q.yaw), fz = -Math.cos(q.yaw);
    this.landT = { q, p0, v0, v1: { x: fx * 0.8, y: -0.6, z: fz * 0.8 }, T, t: 0, p1: { x: q.x, y: q.y + this.P.radius, z: q.z } };
    this.mode = "land"; this.stun = 0;
    this.say("land", `landing on the ${q.name}: the flare`);
  }
  landStep(dt) {
    const L = this.landT; L.t += dt;
    const s = clamp(L.t / L.T, 0, 1), s2 = s * s, s3 = s2 * s, T = L.T;
    const h0 = 2 * s3 - 3 * s2 + 1, h1 = s3 - 2 * s2 + s, h2 = -2 * s3 + 3 * s2, h3 = s3 - s2;
    const d0 = 6 * s2 - 6 * s, d1 = 3 * s2 - 4 * s + 1, d2 = -6 * s2 + 6 * s, d3 = 3 * s2 - 2 * s;
    for (const k of ["x", "y", "z"]) {
      this.pos[k] = h0 * L.p0[k] + h1 * T * L.v0[k] + h2 * L.p1[k] + h3 * T * L.v1[k];
      this.va[k] = this.vel[k] = (d0 * L.p0[k] + d2 * L.p1[k]) / T + d1 * L.v0[k] + d3 * L.v1[k];
    }
    this.V = Math.hypot(this.va.x, this.va.y, this.va.z);
    const hv = Math.hypot(this.va.x, this.va.z);
    if (hv > 0.5) this.heading += wrap(Math.atan2(-this.va.x, -this.va.z) - this.heading) * (1 - Math.exp(-6 * dt));
    if (s > 0.75) this.heading += wrap(L.q.yaw - this.heading) * (1 - Math.exp(-8 * dt));
    this.gamma = Math.atan2(this.va.y, Math.max(hv, 0.3));
    this.alpha = 0.25 + 0.75 * smooth(s, 0.45, 0.95); this.phi *= Math.exp(-4 * dt);
    this.brake = smooth(s, 0.3, 0.8); this.fold = ease(this.fold, 0, 6, dt); this.flapLevel = s > 0.82 ? 1 : 0;
    if (s >= 1) { const h = L.q.yaw; this.landT = null; this.placeOnGround(L.p1.x, L.q.y, L.p1.z, h); this.stats.landings++; this.say("perched", "perched"); }
  }

  // ------------------------------------------------------------------------------------------------ the ground
  groundStep(dt, C, first) {
    const P = this.P, w = this.world;
    this.V = this.walkV; this.fold = 0; this.brake = 0; this.flapLevel = ease(this.flapLevel, 0, 6, dt); this.n = 1; this.phi = 0; this.gamma = 0; this.alpha = 0;
    this.stamina = Math.min(1, this.stamina + P.stamina.rest * dt);
    // turn: the mouse aim (its yaw) or A / D; walk: W (S = slow step back)
    if (C.aimYaw != null) this.heading += wrap(C.aimYaw - this.heading) * (1 - Math.exp(-5 * dt));
    else this.heading = wrap(this.heading + C.turn * 2.4 * dt);
    const want = C.vert < -0.3 ? (C.stoop > 0.5 ? P.hop : P.walk) : C.vert > 0.3 ? -0.4 : 0;
    this.walkV = ease(this.walkV, want, 6, dt);
    if (Math.abs(this.walkV) > 0.02) {
      const hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);
      const nx = this.pos.x + hx * this.walkV * dt, nz = this.pos.z + hz * this.walkV * dt;
      const c = w.column(nx, nz, this.feetY + 0.45), f = c.floor;
      if (f > this.feetY + 0.45 || c.ceil < f + 0.5) this.walkV = 0;               // a step too high / a wall: stop
      else if (f < this.feetY - 0.6) { this.edgeLaunch(nx, nz); return; }            // walked off an edge: launch
      else { this.pos.x = nx; this.pos.z = nz; this.pos.y = f + P.radius; }
    } else {
      const f = w.column(this.pos.x, this.pos.z, this.feetY + 0.3).floor;
      if (f < this.feetY - 0.05) this.pos.y = Math.max(f, this.feetY - 9.81 * dt) + P.radius;   // (the floor went: settle)
    }
    this.syncGround();
    if (C.jump) this.takeoff();
  }
  syncGround() { const hx = -Math.sin(this.heading), hz = -Math.cos(this.heading); this.va.x = this.vel.x = hx * this.walkV; this.va.z = this.vel.z = hz * this.walkV; this.va.y = this.vel.y = 0; }

  /**
   * Space on the ground. The order a real falcon chooses in:
   *   1. a free drop in front (a ledge, a roof edge, the spire): a forward launch off the edge (the cheapest)
   *   2. room above the wings: the JUMP + hard wingbeats, nearly vertical and slow, until clear of what is round it
   *   3. neither (a covered passage, under a roof): walk / hop to the nearest spot where 1 or 2 works, then launch
   */
  takeoff() {
    const w = this.world, p = this.pos, f = this.feetY, hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);
    const drop = f - w.column(p.x + hx * 1.0, p.z + hz * 1.0, f + 0.3).floor;
    if (drop > 3 && w.ray(p.x, p.y + 0.2, p.z, hx, 0, hz, 6) === Infinity) { this.edgeLaunch(p.x + hx * 0.4, p.z + hz * 0.4); return "edge"; }
    if (w.clearUp(p.x, p.y, p.z, this.P.span * 0.6, 6)) { this.verticalLaunch(); return "vertical"; }
    const spot = this.findLaunchSpot();
    if (!spot) { this.say("boxed", "no room for the wings here and nowhere to hop to: walk out (W)"); return "none"; }
    this.hopT = { from: { x: p.x, y: f, z: p.z }, to: spot, t: 0, T: clamp(Math.hypot(spot.x - p.x, spot.z - p.z) / (spot.walk ? this.P.hop : 3.5), 0.45, 4), walk: spot.walk };
    this.mode = "hop"; this.stats.hops++;
    this.say("hop", spot.walk ? "no room for the wings: walking out to open sky" : `no room for the wings: hopping to the ${spot.kind}`);
    return "hop";
  }
  /** the nearest spot within 14 m from which a launch works, reachable by walking (the same floor, nothing between) or
   *  one hop (up to 3 m up, 6 m away, a clear arc): ledges first, then a ring search for open sky on this floor */
  findLaunchSpot() {
    const w = this.world, p = this.pos, f = this.feetY, r = this.P.span * 0.6;
    let best = null, bd = Infinity;
    for (const l of w.ledges) {
      const d = Math.hypot(l.x - p.x, l.z - p.z), dy = l.y - f;
      if (d > 6 || dy > 3 || dy < -6 || d >= bd) continue;
      const mid = { x: (p.x + l.x) / 2, y: Math.max(f, l.y) + 1.0, z: (p.z + l.z) / 2 };
      if (!this.segFree({ x: p.x, y: p.y + 0.3, z: p.z }, mid) || !this.segFree(mid, { x: l.x, y: l.y + 0.4, z: l.z })) continue;
      bd = d; best = { x: l.x, y: l.y, z: l.z, yaw: l.yaw, kind: l.kind, walk: false };
    }
    for (let R = 1.5; R <= 14 && bd > R; R += 1.5) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = p.x + Math.cos(a) * R, z = p.z + Math.sin(a) * R;
      const fl = w.column(x, z, f + 0.4).floor;
      if (Math.abs(fl - f) > 0.4 || !w.clearUp(x, fl + this.P.radius, z, r, 6)) continue;
      if (!this.segFree({ x: p.x, y: f + 0.4, z: p.z }, { x, y: f + 0.4, z })) continue;
      if (R < bd) { bd = R; best = { x, y: fl, z, yaw: Math.atan2(-(x - p.x), -(z - p.z)), kind: "open ground", walk: true }; }
    }
    return best;
  }
  segFree(a, b) { const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz); return d < 0.05 || this.world.ray(a.x, a.y, a.z, dx / d, dy / d, dz / d, d) === Infinity; }

  hopStep(dt, C) {
    const H = this.hopT; H.t += dt;
    const s = clamp(H.t / H.T, 0, 1), a = H.from, b = H.to;
    this.pos.x = lerp(a.x, b.x, s); this.pos.z = lerp(a.z, b.z, s);
    const arc = H.walk ? Math.abs(Math.sin(s * Math.PI * Math.max(2, Math.round(H.T * 3)))) * 0.12 : Math.sin(s * Math.PI) * (0.8 + Math.max(0, b.y - a.y));
    this.pos.y = lerp(a.y, b.y, s) + arc + this.P.radius;
    const hd = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    if (Math.hypot(b.x - a.x, b.z - a.z) > 0.2) this.heading += wrap(hd - this.heading) * (1 - Math.exp(-10 * dt));
    this.walkV = H.walk ? this.P.hop : 0; this.flapLevel = H.walk ? 0 : 0.8 * Math.sin(s * Math.PI);
    this.syncGround();
    if (s >= 1) {
      this.hopT = null; this.placeOnGround(b.x, b.y, b.z, H.walk ? this.heading : b.yaw);
      const how = this.takeoff();                                   // and off it goes
      if (how === "hop" || how === "none") this.mode = "ground";
    }
  }

  /** off an edge: a forward jump and three hard beats, the speed from the drop */
  edgeLaunch(x, z) {
    this.launchAt(x, this.feetY + 0.5, z, this.heading, 6.5, -0.35);
    this.burst = 1.2; this.burstOn = true; this.stamina = Math.max(this.stamina, 0.25);
    this.stats.launches++; this.say("launch", "launch off the edge: a drop and three wingbeats");
  }
  /** the jump + hard wingbeats: nearly vertical and slow while walls are round it, then out along the open way */
  verticalLaunch() {
    const w = this.world, p = this.pos;
    // the way out: the free-est of eight horizontal directions (an alley's axis), the current heading preferred
    let best = this.heading, bd = -1;
    for (let k = 0; k < 8; k++) {
      const a = this.heading + k * Math.PI / 4, d = w.ray(p.x, p.y + 0.5, p.z, -Math.sin(a), 0, -Math.cos(a), 40) - (k ? 0.5 : 0);
      if (d > bd + 0.1) { bd = d; best = a; }
    }
    this.launchT = { t: 0, y0: this.feetY, out: best, vy: 3.2, vh: 0.8 };
    this.heading = best; this.mode = "launch"; this.stats.launches++;
    this.say("launch", "take-off: a jump and hard wingbeats");
  }
  launchStep(dt, C) {
    const L = this.launchT, P = this.P, w = this.world, p = this.pos; L.t += dt;
    const hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);
    // boxed in: walls near ahead / beside and the bird below their tops -> climb slowly almost straight up
    const ahead = w.ray(p.x, p.y, p.z, hx, 0.25, hz, 12), up = w.column(p.x, p.z, p.y).ceil;
    let side = Infinity;
    for (const a of [Math.PI / 2, -Math.PI / 2]) side = Math.min(side, w.ray(p.x, p.y, p.z, -Math.sin(this.heading + a), 0, -Math.cos(this.heading + a), 6));
    const boxed = ahead < 12 || side < 4;
    const vhT = boxed ? 1.2 : clamp(2 + L.t * 4, 2, 11), vyT = boxed ? 3.6 : 2.2;
    L.vh = ease(L.vh, vhT, 1.6, dt); L.vy = ease(L.vy, up - p.y < 2 ? 0 : vyT, 3, dt);
    // keep the wingtips off the walls: steer the heading to the alley's axis (the free-est way) and centre the bird
    this.heading += wrap(L.out - this.heading) * (1 - Math.exp(-3 * dt));
    this.pos.x += hx * L.vh * dt; this.pos.z += hz * L.vh * dt; this.pos.y += L.vy * dt;
    const H = w.sphereHit(p.x, p.y, p.z, P.span * 0.5, this._h);
    if (H.hit && H.kind !== "ground") { const k = Math.min(H.depth, 2 * dt); p.x += H.nx * k; p.z += H.nz * k; if (H.ny < -0.5) { p.y -= k; L.vy = 0; } }
    this.flapLevel = 1; this.fold = 0; this.brake = 0.3 * (1 - smooth(L.t, 0.5, 1.5)); this.phi *= 0.9;
    this.V = Math.hypot(L.vh, L.vy); this.gamma = Math.atan2(L.vy, L.vh); this.alpha = 0.5 * (1 - smooth(L.vh, 3, 9));
    this.stamina = Math.max(0, this.stamina - P.stamina.power * dt * 0.8);
    this.va.x = this.vel.x = hx * L.vh; this.va.z = this.vel.z = hz * L.vh; this.va.y = this.vel.y = L.vy;
    if ((!boxed && L.vh > 8.5) || L.t > 12) { this.launchAt(p.x, p.y, p.z, this.heading, Math.max(this.V, 9), Math.min(this.gamma, 0.25)); this.burst = 1.5; this.burstOn = true; this.launchT = null; this.say("airborne", "airborne"); }
  }
}
