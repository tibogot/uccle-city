// THE FALCON'S FLIGHT ASSIST (falconfix, 2026-11-16; ?falconctl=old = the raw stick controls of round 1): the player says
// WHERE to go, the assist flies the bird there with the same flight model (flightModel.js: lift, drag, stall, thermals
// all still real). After the friendly schemes of bird / plane games: Eagle Flight's look-to-steer, War Thunder's and
// GTA's mouse aim (the bird turns toward the aim, the camera looks at the aim), Ace Combat's "standard" controls (the
// stick turns, the plane banks by itself and levels when let go), Sky's auto-flapping glide, Microsoft Flight
// Simulator's assists (auto-level, altitude hold, stall / ground protection).
//
//   steer     mouse aim (pointer lock): the heading toward the aim; A / D (stick x): a turn at up to ~1 rad/s; the bank
//             is chosen for that turn (coordinated, at most 60 deg); hands off = wings level
//   height    hands off = ALTITUDE HOLD (the height when you let go, captured with a little lead; rising air lifts it:
//             circle in a thermal and the bird climbs with it); W / S (stick y): a
//             gentle descent / climb (20 deg); the mouse aim's pitch (past 4 deg) the same; Space: a flapping climb
//   speed     auto-flapping toward a cruise of ~14 m/s (light beats: they cost little stamina, see flightModel.js
//             `assisted`), no flapping in a descent; Space = full beats (the stamina gauge)
//   stoop     Shift: tuck and dive (63 deg, W steeper, S shallower, or the mouse aim's pitch past 20 deg); let go = wings open, pull
//             out, hold the height where the pull-out ends (no zoom climb)
//   protect   below ~9 m/s the nose goes down and the wings beat (no stall); with AVOID on (default; the start menu, or
//             ?falconavoid=0): three probes along the path (0.6 / 1.2 / 2 s ahead) against the city's solid at the
//             bird's height: a roof, a crown or the ground in the way -> climb over it (2.5 m clear); too tall to climb
//             -> also turn toward the freer side; a stoop too low to pull out -> the pull-out starts by itself
// Pure JS (no three), no allocation per frame; ~20 column queries a frame at most (microseconds).

const G = 9.81;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const ASSIST = {
  cruise: 14,              // m/s: the speed the auto-flapping keeps (spread wings' best glide is ~13)
  vMin: 9.5,               // m/s: under this the nose goes down and the wings beat
  turnRate: 1.0,           // rad/s: A / D full
  aimGain: 2.2,            // 1/s: heading error -> turn rate (mouse aim)
  bankMax: 60 * Math.PI / 180,
  stoopBank: 70 * Math.PI / 180,
  slope: 0.35,             // rad: W / S full (20 deg)
  climb: 0.42,             // rad: Space (24 deg asked; the beats give what they can)
  stoop: 1.1,              // rad: Shift (63 deg dive)
  pathGain: 2.6,           // 1/s: path angle error -> path rate
  pathRate: 1.6,           // rad/s: at most
  hold: 0.9,               // 1/s: height error -> vertical speed (at most +-3.5 m/s)
  clear: 2.5,              // m: the avoid assist's clearance over a roof / crown / the ground
  probes: [0.6, 1.2, 2.0], // s ahead
};

export class FlightAssist {
  constructor(params = ASSIST) {
    this.P = params;
    this.avoid = true;      // the obstacle assist (menu option / ?falconavoid=0)
    this.hT = null;         // the held height (m TAW); null = not holding
    this.mode = "level";    // for the HUD: level | hold | turn | climb | descend | stoop | pullout | avoid | slow | tumble
    this.avoiding = 0;      // 0..1 (eased): the avoid assist is acting
    this.turnS = 0;         // the eased A / D
    this.pull = false;      // a stoop's pull-out in progress
    this.guard = false;     // the ground guard pulled a dive out (latched while Shift is held)
    this.override = null;   // { psi, gamma } this frame: another assist steers (the hunt's aim assist)
    this.cost = 0;
  }

  /** the falcon took off / was placed: forget the held height */
  reset() { this.hT = null; this.pull = false; this.guard = false; this.turnS = 0; this.avoiding = 0; }

  /**
   * dt (s); f: the FalconFlight; I: the input's intent { turn, vert, climb, stoop, half, brake, aim: { yaw, pitch } |
   * null }; C: the FlightControls to fill; world: { column(x, z, y) | floor(x, z) }
   */
  apply(dt, f, I, C, world) {
    const t0 = performance.now();
    const P = this.P, V = Math.max(f.V, 0.5), gam = f.gamma, psi = f.heading, y = f.pos.y;
    C.brake = I.brake; C.fold = I.stoop ? 1 : I.half ? 0.5 : 0; C.flap = 0;
    if (f.stun > 0) {
      // the tumble after a crash: the model opens the wings and steadies; we forget the height and wait
      this.hT = null; this.pull = false; this.mode = "tumble";
      C.pitch = 0; C.roll = 0; C.fold = 0; C.flap = 0;
      this.cost = performance.now() - t0;
      return C;
    }
    // ---------------------------------------------------------------- where to: turn rate and path angle asked
    this.turnS += (I.turn - this.turnS) * (1 - Math.exp(-6 * dt));
    let omega = 0, gd = 0, holding = false, mode = "level";
    const ov = this.override;
    if (ov) {
      omega = clamp(P.aimGain * wrap(ov.psi - psi), -1.3, 1.3);
      gd = ov.gamma; this.hT = null; mode = "strike";
    } else {
      if (I.aim && !I.turn) omega = clamp(P.aimGain * wrap(I.aim.yaw - psi), -1.3, 1.3);
      else omega = this.turnS * P.turnRate;
      if (Math.abs(omega) > 0.15) mode = "turn";
      if (I.stoop) {
        const want = I.aim && I.aim.pitch < -0.35 ? Math.max(I.aim.pitch, -1.45) : -P.stoop + 0.4 * I.vert * (I.vert > 0 ? 1.2 : 0.75);
        gd = want; this.hT = null; this.pull = true; mode = "stoop";
      } else if (I.climb) { gd = P.climb; this.hT = null; mode = "climb"; }
      else if (I.vert) { gd = I.vert * P.slope; this.hT = null; mode = I.vert > 0 ? "climb" : "descend"; }
      else if (I.aim && Math.abs(I.aim.pitch) > 0.07) { gd = clamp(I.aim.pitch, -0.9, 0.5); this.hT = null; mode = I.aim.pitch > 0 ? "climb" : "descend"; }
      else holding = true;
    }
    // the stoop's pull-out (Shift let go, still fast and steep): pull to level first, then hold that height
    if (!I.stoop && this.pull) {
      if (gam < -0.12 && V > 20) { holding = false; gd = 0; mode = "pullout"; } else this.pull = false;
    }
    if (holding) {
      if (this.hT == null) this.hT = y + clamp(f.vel.y * 0.6, -4, 4);
      // rising air (a thermal, a façade's updraft) lifts the held height with it: soaring stays free
      if (f.lift > 0.3 && y > this.hT) this.hT = y;
      const vz = clamp(P.hold * (this.hT - y), -3.5, 3.5);
      gd = Math.asin(clamp(vz / Math.max(V, 4), -0.5, 0.5));
      if (mode === "level") mode = "hold";
    }
    // ---------------------------------------------------------------- protection: speed
    if (V < P.vMin && !I.stoop) {
      gd = Math.min(gd, -0.25 * (P.vMin - V) / P.vMin - 0.02);
      if (mode !== "turn") mode = "slow";
    }
    // ---------------------------------------------------------------- protection: the avoid assist
    let avoid = 0;
    if (this.avoid && world) {
      const vx = f.vel.x, vy = f.vel.y, vz = f.vel.z, vh = Math.max(Math.hypot(vx, vz), 1);
      let gNeed = -Infinity, tall = false;
      for (let k = 0; k < P.probes.length; k++) {
        const T = P.probes[k], s = Math.max(T, (5 + 4 * k) / vh);          // at least 5 / 9 / 13 m ahead when slow
        const px = f.pos.x + vx * s, pz = f.pos.z + vz * s, py = y + vy * s;
        const fl = floorAt(world, px, pz, Math.max(py, y));
        const clr = ov ? 1 : P.clear;                                      // (a strike may go lower)
        const need = fl + clr - py;
        if (need <= 0) continue;
        const g = Math.atan2(fl + clr - y, vh * s);
        if (g > gNeed) gNeed = g;
        if (g > 0.55) tall = true;
      }
      // a dive too low to pull out: the pull-out radius at ~4 g is V^2 / 3g, the drop to level r (1 - cos gamma) (+25 %,
      // + the 0.3 s it takes to start, + 8 m); the ground under the path half a radius ahead. Latched while Shift is held
      // (let go and press again to dive again): no porpoising over the ground
      if (!I.stoop) this.guard = false;
      if (gam < -0.2 && V > 15) {
        const r = V * V / (3 * G), px = f.pos.x + vx / vh * r * 0.5, pz = f.pos.z + vz / vh * r * 0.5;
        const below = y - Math.max(floorAt(world, px, pz, y), floorAt(world, f.pos.x, f.pos.z, y));
        if (below < r * (1 - Math.cos(gam)) * 1.25 + V * 0.3 * Math.sin(-gam) + 8) this.guard = true;
      }
      if (this.guard) {
        C.fold = Math.min(C.fold, 0.5); this.pull = true; gNeed = Math.max(gNeed, 0); mode = "pullout";
        if (!I.stoop && gam > -0.05) this.guard = false;
      }
      if (gNeed > -Infinity && gNeed > gd) {
        gd = Math.min(gNeed, 0.6); avoid = 1; mode = "avoid";
        if (holding) this.hT = null;
        if (tall) {
          // too tall to climb in time: also turn toward the freer side (probes 0.9 s ahead, 35 deg each side)
          const s = Math.max(0.9, 7 / vh), a = 0.6;
          const side = (sg) => {
            const h = psi + sg * a, dx = -Math.sin(h) * vh * s, dz = -Math.cos(h) * vh * s;
            return floorAt(world, f.pos.x + dx, f.pos.z + dz, y);
          };
          const L = side(1), R = side(-1);          // (heading +: turning left)
          if (Math.min(L, R) < y - 1) omega = clamp(omega + (L < R ? 1 : -1) * 0.9, -1.3, 1.3);
        }
      }
    }
    this.avoiding += (avoid - this.avoiding) * (1 - Math.exp(-5 * dt));
    // ---------------------------------------------------------------- the bank for the turn rate (coordinated)
    const bmax = I.stoop ? P.stoopBank : P.bankMax;
    const phiD = clamp(Math.atan(V * omega / G), -bmax, bmax);
    // (heading + = turning left; the model's bank + = right wing down = a right turn)
    C.roll = clamp(-phiD / f.P.bankMax, -1, 1);
    // ---------------------------------------------------------------- the path angle -> the model's pitch input
    const gdot = clamp(P.pathGain * (gd - gam), -P.pathRate, P.pathRate);
    const cphi = Math.max(Math.cos(f.phi), 0.3);
    const u = V * gdot / (G * cphi);                                   // g asked over the path-holding load
    const pullG = f.P.pull + (f.P.nMax - 1 - f.P.pull) * smooth(V, 25, 60);
    C.pitch = clamp(u > 0 ? u / pullG : u / f.P.push, -1, 1);
    // ---------------------------------------------------------------- the wingbeats (auto: hold the cruise speed)
    if (I.climb && !I.stoop) C.flap = 1;
    else if (C.fold < 0.75) {
      const tired = clamp(f.stamina / f.P.stamina.low, 0, 1);
      const avail = f.P.thrust * clamp(1 - V / f.P.vFlap, 0, 1) * (0.25 + 0.75 * tired);
      const need = Math.sin(gd) + 1 / 12 + 0.12 * (P.cruise * (1 - 0.4 * I.brake) - V) / P.cruise * 4;
      C.flap = gd < -0.1 && V > P.vMin ? 0 : clamp(need / Math.max(avail, 0.04), 0, 1);
      if (V < P.vMin) C.flap = 1;
      // tired: lighter beats (they still let the stamina come back; the bird sinks a little instead)
      if (f.stamina < f.P.stamina.low) C.flap = Math.min(C.flap, 0.45);
    }
    this.mode = mode;
    this.cost = performance.now() - t0;
    return C;
  }
}

/** the solid under height y at (x, z): the city's column (crowns, arches), else the floor */
function floorAt(world, x, z, y) { return world.column ? world.column(x, z, y).floor : world.floor(x, z); }
