// CAR CONTROL (docs/CARCTL.md): the drive mode's / police game's car, round 3 of the handling: CONTROL FIRST.
// ?carctl=old = round 2 (carFeel.js stepFeel, slip-angle tyres); ?carfeel=old = round 1 (carPhysics.js stepCar).
// Pure JS, no three, no allocation per step, 120 Hz substeps like the others; same state fields (carModel.js, the
// cameras, the traffic and the games read them) plus steerS / thrS (the shaped input), loose, roadY / roadPitch.
//
// Owner, 2026-11-17: "the car feels uncontrollable, not able to turn well ... it should be on point". Round 2 let the
// TYRES decide the turn (slip angles, load transfer, counter-steer and yaw-cap assists patching the result): the yaw
// rate you got from a key press depended on speed, load, slip history; a keyboard's full lock at 50 km/h ploughed or
// stepped out. Here (the owner's own engine, game-engine-v1 arcadeCar.js "STEERING SETS THE TURN RATE", Mario Kart /
// Burnout / GTA V arcade handling, Unity Arcade Car Physics' steering curves):
//   - STEERING SETS THE YAW RATE: the front wheel angle (lock eased with speed) maps to the kinematic yaw rate
//     r* = u tan(d) / L (a real car's geometry: what you see the wheels do is what the car does), never more than the
//     grip can carry (|r*| <= latG / v). The body's yaw rate follows r* with a ~60 ms lag. Same input -> same turn.
//   - GRIP KEEPS THE CAR ON ITS NOSE: the sideways speed is taken away at up to mu g (all of it at a small slide, ~70 %
//     once sliding: the owner's grip curve), so the path follows the nose with < 1.5 deg of crab. No understeer plough
//     (the yaw target is always within the grip), no random oversteer (the yaw rate is not free).
//   - SLIDES ON PURPOSE: the handbrake drops the side grip, boosts the yaw target: the tail swings; let go and the nose is
//     drawn back onto the travel (an assist, as the engine's drift exit); a hit spins the car for a moment (loose).
//   - INPUT SHAPING: keyboard steer ramps in (slower at speed), returns to centre faster, swaps side at once through zero;
//     throttle / brake ramp in ~0.15-0.25 s; an analog pad (input.analog) only gets a light filter.
//   - BODY: the same four-spring plate as round 2 (kerbs, slopes, lawns), critically damped (zeta ~1), weight transfer at
//     40 % of round 2's: < 1 deg of dive / roll. roadY / roadPitch = the ground under the wheels (the camera's reference,
//     not the body: no suspension in the picture).

import { HANDLING, BODY } from "./carPhysics.js";
import { createFeelState } from "./carFeel.js";

export const CTL = {
  topSpeed: 40, reverseSpeed: 10,
  power: 6.4, powerSpeed: 12.5,      // m/s², a = power * powerSpeed / v above powerSpeed (0-100 ~6 s)
  brake: 10.5, coast: 0.9, rolling: 0.15, drag: 0.0011,
  mu: 1.12, muTerrain: 0.92, terrainRoll: 0.5,
  // steering geometry: full lock maxSteer up to the speed where it would ask more than latG; then tan(d) = L latG / v²
  maxSteer: 0.56,                    // rad (32 deg): 4.6 m radius at the rear axle (Uccle's tight corners)
  latG: 0.82,                        // share of the grip a full lock asks at speed (a margin: never at the limit)
  yawResp: 16,                       // 1/s: the yaw rate's approach to r* (~60 ms)
  sideK: 28,                         // 1/s: the side speed taken away (a stiff tyre; capped by the grip curve)
  peakSlip: 8, slideSlip: 30, slideGrip: 0.7,   // deg: the grip curve (the owner's ARCADE.grip)
  // input shaping (keyboard): 1/s of the -1..1 range
  steerIn: 8, steerInFast: 4.5, steerFastAt: 28, steerOut: 9, steerSwap: 14,
  throttleIn: 5, throttleOut: 10, brakeIn: 7,
  analogRate: 20,                    // 1/s: a pad's filter
  // handbrake: rear locked
  hbSideGrip: 0.32, hbDecel: 5, hbYaw: 1.7, hbYawCap: 2.4, hbMin: 4,
  align: 8,                          // rad/s per rad of slide: no handbrake, a slide past alignFrom: the nose drawn back onto the travel
  alignFrom: 0.05,
  loose: 0.3, looseResp: 3,          // s after a contact the yaw control is soft (a hit's spin plays out)
  // suspension (per unit mass): ~1.65 Hz heave, zeta ~1 heave / pitch / roll
  springK: 27, springC: 5.2, bump: 0.1, maxRise: 2.2, maxGroundV: 6, pitchI: 1.55, rollI: 0.6,
  cgHeight: 0.52, transfer: 0.4,     // load transfer into the plate's pitch / roll (visual): x0.4 of round 2
  airGravity: 1.7, gravity: 9.81,
};

const G = 9.81, DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const WX = [1, -1, 1, -1], WZ = [1, 1, -1, -1];
const gW = [0, 0, 0, 0];

export function createCtlState(x, z, heading) {
  const c = createFeelState(x, z, heading);
  c.steerS = 0; c.thrS = 0; c.loose = 0; c.roadY = NaN; c.roadPitch = 0; c.roadRoll = 0; c.ctl = true;
  return c;
}

/** the keyboard / pad input shaped toward the raw input (steer -1..1 left +, throttle -1..1) */
function shapeInput(c, input, dt, F, speed) {
  const sIn = clamp(input.steer || 0, -1, 1), tIn = clamp(input.throttle || 0, -1, 1);
  if (input.analog) {
    const k = 1 - Math.exp(-F.analogRate * dt);
    c.steerS += (sIn - c.steerS) * k; c.thrS += (tIn - c.thrS) * k;
    return;
  }
  // steer: in (slower at speed), back to centre faster, across zero at once
  const s = c.steerS;
  let rate;
  if (sIn * s < 0) rate = F.steerSwap;
  else if (Math.abs(sIn) > Math.abs(s)) rate = F.steerIn + (F.steerInFast - F.steerIn) * smooth(6, F.steerFastAt, Math.abs(speed));
  else rate = F.steerOut;
  c.steerS = s + clamp(sIn - s, -rate * dt, rate * dt);
  if (sIn * s < 0 && c.steerS * sIn < 0 && Math.abs(c.steerS) < 0.05) c.steerS = 0;
  // pedals: a press ramps in, a release drops fast; braking (against the motion) ramps quicker
  const t = c.thrS, brakingIn = tIn * speed < -0.3;
  const tr = tIn === 0 || tIn * t < 0 ? F.throttleOut : brakingIn ? F.brakeIn : F.throttleIn;
  c.thrS = t + clamp(tIn - t, -tr * dt, tr * dt);
  if (tIn * t < 0 && Math.abs(c.thrS) < 0.1) c.thrS = 0;
}

/**
 * Advance the car by dt seconds (stepCar / stepFeel's signature).
 * input: { throttle -1..1, steer -1..1 (left +), handbrake, analog? }
 * env:   { ground(x, z), collide(c, step), prepare(c, reach), surface?(x, z), contacts }
 */
export function stepCtl(c, input, dt, env, F = CTL) {
  if (dt <= 0) return;
  const hb = input.handbrake ? 1 : 0;
  const L = HANDLING.wheelbase || 2.65, a = L / 2, b = L / 2;
  const track = Math.max(0.6, (c.bodyHx ?? BODY.hx) * 0.86);
  const prevX = c.x, prevZ = c.z;
  if (c.steerS === undefined) { c.steerS = 0; c.thrS = 0; c.loose = 0; c.roadY = NaN; c.roadPitch = 0; c.roadRoll = 0; }
  shapeInput(c, input, dt, F, c.speed);
  const throttle = c.thrS, steerIn = c.steerS;

  env.prepare?.(c, Math.hypot(c.speed, c.vx, c.vz) * dt + 8);
  c.surface = env.surface ? env.surface(c.x, c.z) : 0;
  const mu = c.surface ? F.muTerrain : F.mu;

  if (c.init && (Math.abs(c.x - c.lastX) + Math.abs(c.z - c.lastZ) > 6 || Math.abs(env.ground(c.x, c.z) - c.y) > 4)) c.init = false;
  if (!c.init || !Number.isFinite(c.y)) {
    c.y = env.ground(c.x, c.z);
    const s = Math.sin(c.heading), k = Math.cos(c.heading);
    const hF = env.ground(c.x + s * a, c.z + k * a), hB = env.ground(c.x - s * b, c.z - k * b);
    const hL = env.ground(c.x + k * track, c.z - s * track), hR = env.ground(c.x - k * track, c.z + s * track);
    c.slopePitch = Math.atan((hF - hB) / L); c.slopeRoll = Math.atan((hL - hR) / (2 * track));
    c.vy = c.pitchV = c.rollV = 0;
    for (let i = 0; i < 4; i++) { c.gPrev[i] = NaN; c.wy[i] = 0; }
    c.roadY = c.y; c.roadPitch = c.slopePitch; c.roadRoll = c.slopeRoll;
    c.init = true;
  }

  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  let ax = 0;
  for (let it = 0; it < steps; it++) {
    const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    // ---------------------------------------------------------------- suspension (round 2's plate, damped)
    let P = c.slopePitch, R = c.slopeRoll;
    let fSum = 0, fP = 0, fR = 0, front = 0, rear = 0;
    const preload = G / 4;
    for (let i = 0; i < 4; i++) {
      const lx = WX[i] * track, lz = WZ[i] > 0 ? a : -b;
      const wx = c.x + sinH * lz + cosH * lx, wz = c.z + cosH * lz - sinH * lx;
      const g = env.ground(wx, wz);
      gW[i] = g;
      const hub = c.y + lz * Math.sin(P) + lx * Math.sin(R);
      const ci = g - hub;
      let vg = Number.isFinite(c.gPrev[i]) ? (g - c.gPrev[i]) / h : 0;
      vg = clamp(vg, -F.maxGroundV, F.maxGroundV);
      c.gPrev[i] = g;
      const vh = c.vy + lz * c.pitchV + lx * c.rollV;
      let f = 0;
      if (ci > -preload / F.springK) {
        f = Math.max(0, preload + F.springK * ci + F.springC * (vg - vh));
        if (WZ[i] > 0) front++; else rear++;
      }
      c.wy[i] = clamp(ci, -preload / F.springK, F.bump);
      fSum += f; fP += f * lz; fR += f * lx;
    }
    const grounded = (front + rear) / 4;
    const tk = F.transfer * F.cgHeight;
    c.vy += (fSum - F.gravity * (grounded === 0 ? F.airGravity : 1)) * h;
    c.pitchV += (fP + c.axLag * tk) / F.pitchI * h;
    c.rollV += (fR + c.ayLag * tk * 0.5) / F.rollI * h;
    c.vy = clamp(c.vy, -25, 12);
    c.pitchV = clamp(c.pitchV, -2.5, 2.5); c.rollV = clamp(c.rollV, -2.5, 2.5);
    c.y += c.vy * h;
    P = clamp(P + c.pitchV * h, -0.6, 0.6); R = clamp(R + c.rollV * h, -0.5, 0.5);
    for (let i = 0; i < 4; i++) {
      const lx = WX[i] * track, lz = WZ[i] > 0 ? a : -b;
      const e = gW[i] - (c.y + lz * Math.sin(P) + lx * Math.sin(R)) - F.bump;
      if (e <= 0) continue;
      c.y += e * 0.4; P += e * 0.3 / lz; R += e * 0.3 / lx;
      const vUp = Math.min(Math.max(0, e / h), F.maxRise);
      const want = Math.min(c.vy + vUp * 0.4, Math.max(c.vy, (gW[i] - c.y) / h * 0.4));
      if (want > c.vy) c.vy = Math.min(want, Math.max(c.vy, F.maxRise));
      if (lz * c.pitchV < 0) c.pitchV *= 0.5;
      if (lx * c.rollV < 0) c.rollV *= 0.5;
    }
    c.slopePitch = P; c.slopeRoll = R;
    c.grounded = grounded;
    // the road under the wheels (the camera's reference: the ground, not the body on its springs)
    const Pg = Math.atan(((gW[0] + gW[1]) - (gW[2] + gW[3])) / (2 * L));
    const Rg = Math.atan(((gW[0] + gW[2]) - (gW[1] + gW[3])) / (4 * track));
    c.roadY = (gW[0] + gW[1] + gW[2] + gW[3]) / 4; c.roadPitch = Pg; c.roadRoll = Rg;

    // ---------------------------------------------------------------- the plane
    let u = c.speed, v = c.vx * cosH - c.vz * sinH, r = c.angularVel;   // forward, left, yaw rate
    const V = Math.hypot(u, v);
    // pedals (round 2's rules: W forward / S brake then reverse; a crawl against the pedal = at rest)
    const u0 = u * throttle < 0 && Math.abs(u) < 0.3 ? 0 : u;
    let uT = u0;
    const braking = u0 * throttle < 0;
    const m = Math.abs(u0);
    const decel = F.rolling + (c.surface ? F.terrainRoll : 0) + (!throttle ? F.coast : braking ? Math.abs(throttle) * F.brake : 0);
    const coasting = Math.max(0, m - decel * h) / (1 + F.drag * m * h);
    if (!throttle || braking) uT = Math.sign(u0) * coasting;
    else {
      const limit = throttle < 0 ? F.reverseSpeed : F.topSpeed * (c.surface ? 0.8 : 1);
      const acc = F.power * F.powerSpeed / Math.max(F.powerSpeed, m);
      uT = Math.sign(throttle) * Math.min(Math.max(limit, coasting), coasting + Math.abs(throttle) * acc * h);
    }
    let axP = (uT - u) / h;
    if (hb && Math.abs(u) > 0.05) axP -= Math.sign(u) * Math.min(Math.abs(u) / h, F.hbDecel);
    const axMax = mu * G * Math.max(0.05, grounded) * 1.05;
    axP = clamp(axP, -axMax, axMax);
    const gx = -F.gravity * Math.sin(Pg), gy = -F.gravity * Math.sin(Rg) * 0.5;
    const hold = !throttle && !hb && Math.abs(u) < 0.3 && Math.abs(Pg) < 0.38;

    // steering -> the wheel angle -> the yaw rate the geometry gives, within the grip
    const latA = F.latG * mu * G;
    const lock = Math.min(F.maxSteer, Math.atan(L * latA / Math.max(1e-3, u * u)));
    const dWant = steerIn * lock;
    c.steerAngle = dWant;                                              // (the shaped input: no lag of its own)
    let rT = u * Math.tan(c.steerAngle) / L;
    const capBase = mu * G / Math.max(1, V);
    let cap = capBase * 0.95;
    const hbOn = hb && Math.abs(u) > F.hbMin;
    if (hbOn) { rT *= F.hbYaw; cap = capBase * F.hbYawCap; }
    // the slide: travel off the nose (+ = to the left); past alignFrom (no handbrake, driving forward) the nose is drawn
    // onto the travel: a slide (after the handbrake, a hit) straightens out by itself, steering still adds
    const beta = V > 2 && u > 0 ? Math.atan2(v, u) : 0;
    if (!hbOn && u > 2) rT += F.align * (beta - clamp(beta, -F.alignFrom, F.alignFrom)) * Math.min(1, V / 6);
    rT = clamp(rT, -cap, cap);
    let du = 0, dv = 0;
    if (grounded > 0) {
      const resp = c.loose > 0 ? F.looseResp : F.yawResp;
      r += (rT - r) * (1 - Math.exp(-resp * grounded * h));
      // grip: the side speed taken away (the curve: all of it near the nose, slideGrip once sliding)
      const slide = Math.atan2(Math.abs(v), Math.max(1, Math.abs(u))) / DEG;
      const curve = slide <= F.peakSlip ? 1 : slide >= F.slideSlip ? F.slideGrip : 1 - (1 - F.slideGrip) * (slide - F.peakSlip) / (F.slideSlip - F.peakSlip);
      const use = Math.min(0.85, Math.abs(axP) / Math.max(0.1, axMax));
      let gripA = mu * G * curve * grounded * Math.sqrt(1 - use * use * 0.6) * (hbOn ? F.hbSideGrip : 1);
      gripA = Math.max(gripA, 0.5);
      // at a crawl: the kinematic car (no sideways creep when parking)
      const kin = 1 - smooth(1.5, 5, V);
      const sideK = F.sideK + kin * 60;
      dv = -clamp(v * sideK, -gripA - kin * 30, gripA + kin * 30);
      if (Math.abs(dv * h) > Math.abs(v)) dv = -v / h;
      du = axP;
    }
    du += hold ? 0 : gx; dv += hold ? 0 : gy;
    u += du * h; v += dv * h;
    if (hold) { u = 0; if (Math.abs(v) < 0.3) v *= 0.8; }
    if (grounded === 0) r *= Math.exp(-0.5 * h);
    // the frame turns: world velocity kept, re-projected on the new heading
    const wvx = sinH * u + cosH * v, wvz = cosH * u - sinH * v;
    c.heading += r * h;
    const ns = Math.sin(c.heading), nc = Math.cos(c.heading);
    c.speed = wvx * ns + wvz * nc;
    const lat = wvx * nc - wvz * ns;
    c.vx = nc * lat; c.vz = -ns * lat;
    c.angularVel = r;
    c.x += wvx * h; c.z += wvz * h;
    ax = du;
    const ay = u * r;
    c.axLag += (clamp(grounded > 0 ? axP : 0, -14, 14) - c.axLag) * Math.min(1, h / 0.12);
    c.ayLag += (clamp(grounded > 0 ? ay : 0, -14, 14) - c.ayLag) * Math.min(1, h / 0.12);
    c.slip = beta;
    const n0 = env.contacts || 0;
    env.collide?.(c, h);
    c.loose = (env.contacts || 0) > n0 && Math.abs(c.angularVel - r) > 0.15 ? F.loose : Math.max(0, c.loose - h);
  }
  const g0 = env.ground(c.x, c.z);
  if (c.y < g0 - 0.3) { c.y = g0 - 0.05; c.vy = Math.max(0, c.vy); }
  c.lastX = c.x; c.lastZ = c.z;
  c.pitch = c.roll = 0; c.heave = 0;
  c.accel = ax;
  c.braking = c.speed * throttle < -0.01 || (hb && Math.abs(c.speed) > 0.3);
  c.reversing = c.speed < -0.2;
  const fwd = (c.x - prevX) * Math.sin(c.heading) + (c.z - prevZ) * Math.cos(c.heading);
  c.wheelSpin = (c.wheelSpin + fwd / 0.317) % (Math.PI * 2);
}
