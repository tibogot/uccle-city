// CAR FEEL (docs/POLICE_FEEL.md): the drive mode's / police game's car, round 2 of the handling. ?carfeel=old = the
// previous model (carPhysics.js stepCar). Pure JS, no three, no allocation per step; stepped at 120 Hz like the old one.
//
// What changed against carPhysics.js stepCar (the owner, 2026-11-16: "the car and its physics make it not fun ... it
// should be able to go on slopes and many places, if not we feel blocked"):
//   - RAYCAST SUSPENSION: four springs, each on the drive surface under its own wheel (Space Dust Racing / Very Very
//     Valet style, a ray per wheel = one ground() sample per wheel per substep). The body is a rigid plate with
//     heave / pitch / roll; a kerb lifts one wheel then the other, the body rocks, the wheel rises into its arch.
//     Weight transfer is the same plate: braking dives the nose, throttle squats, cornering rolls. A bump stop never
//     lets a wheel sink in, the upward speed it hands the body is capped (no launch off a kerb), and the body is snapped
//     back onto the surface if it ever ends under it (never through the ground).
//   - TYRES: a two-axle model with slip angles and a saturating curve (peak ~8 deg, ~70 % kept once sliding): grip is
//     strong, a slide is real but holds on and is easy to catch. Each axle's grip follows its load (static + the
//     braking / throttle transfer): a lift or a brake into a turn tucks the nose in, the throttle settles it.
//   - STEERING: speed-sensitive lock (full lock to ~25 km/h, the grip limit above), eased on a keyboard, and AUTO
//     COUNTER-STEER: once the tail is out, the front wheels turn toward the travel (as a driver does): no spin-outs from
//     a keyboard tap. A light stability assist pulls a slide past ~30 deg back unless the handbrake is held.
//   - HANDBRAKE: rear grip drops to ~38 %, rear brake: the tail swings round; release + throttle and it drives out.
//   - POWER: quicker (0-100 ~6 s), stronger brakes (1.1 g), traction-limited; climbs 15-25 % streets from a standstill.
//   - SURFACE: bare terrain (lawns, verges, park paths: the drive grid with no deck) has less grip and more rolling
//     drag (a lawn slides, slows you, never stops you).
// State fields are the old ones (carModel.js, the camera, the traffic and the games read them), plus wy (the four
// wheels' travel), vy, pitchV, rollV, grounded, surface, slip.

import { HANDLING, BODY } from "./carPhysics.js";

export const FEEL = {
  topSpeed: 40,        // m/s (144 km/h)
  reverseSpeed: 10,
  power: 6.4,          // m/s² at low speed
  powerSpeed: 12.5,    // above this the engine's power limits the pull (a = power * powerSpeed / v): 0-100 ~6 s
  brake: 11,           // m/s²
  coast: 0.7, rolling: 0.15, drag: 0.0011,
  mu: 1.12,            // tyre grip (g) on a paved surface
  muTerrain: 0.92,     // on bare terrain (grass, verges, park paths; also some paved yards drawn as terrain: kept mild)
  terrainRoll: 0.5,    // extra rolling drag on terrain (m/s²)
  frontGrip: 0.93,     // front / rear grip balance (< 1: a touch of understeer at the limit = stable)
  peakSlip: 0.14,      // rad: the tyre's peak (sin(1.5 atan(B a)) peaks here)
  cgHeight: 0.52, transfer: 0.45,   // load transfer (m; share of the real one kept: arcade)
  yawInertia: 1.5,     // Iz / m (m²): lower = nimbler
  maxSteer: 0.62, steerG: 10.5, minSteer: 0.012,   // lock: atan(L * steerG / v²) within [minSteer, maxSteer]
  steerRate: 3.2, steerReturn: 6,  // rad/s toward the input, rad/s back to centre
  counterSteer: 0.85, counterFrom: 0.08,   // auto counter-steer share of the body slip past counterFrom rad
  stability: 6, stableSlip: 0.5,         // yaw assist (1/s²) per rad of body slip past stableSlip (no handbrake)
  yawCap: 1.08, yawCapHb: 2.3, yawCapRate: 9,   // the yaw rate is held under yawCap * grip / speed (x yawCapHb with the handbrake)
  handbrakeGrip: 0.33, handbrakeDecel: 6,
  // suspension (per unit mass): k per wheel (1/s²), damper (1/s), travel up to the bump stop, pitch / roll inertia
  springK: 21, springC: 2.6, bump: 0.1, maxRise: 2.2, maxGroundV: 6, pitchI: 1.55, rollI: 0.6,
  airGravity: 1.7,     // x gravity while no wheel touches and the ground is near (a crest at speed: a hop, never a launch)
  gravity: 9.81,
};

const G = 9.81;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** the tyre: lateral force share for a slip angle (rad), peak 1 at FEEL.peakSlip, ~0.71 fully sliding */
function tyre(alpha, B) { return Math.sin(1.5 * Math.atan(B * alpha)); }

export function createFeelState(x, z, heading) {
  return {
    x, z, y: 0, heading, speed: 0, vx: 0, vz: 0, angularVel: 0, steerAngle: 0,
    pitch: 0, roll: 0, pitchVel: 0, rollVel: 0, heave: 0, heaveVel: 0,
    slopePitch: 0, slopeRoll: 0, wheelSpin: 0, braking: false, reversing: false,
    hits: 0, lastHit: null, accel: 0,
    // feel
    vy: 0, pitchV: 0, rollV: 0, wy: [0, 0, 0, 0], gPrev: [NaN, NaN, NaN, NaN], grounded: 1, surface: 0, slip: 0, axLag: 0, ayLag: 0, init: false, lastX: x, lastZ: z,
  };
}

/** wheel layout: [left (+) offset, along offset] for FL, FR, RL, RR */
const WX = [1, -1, 1, -1], WZ = [1, 1, -1, -1];
const gW = [0, 0, 0, 0];

/**
 * Advance the car by dt seconds (same signature as carPhysics stepCar).
 * input: { throttle -1..1, steer -1..1 (left +), handbrake }
 * env:   { ground(x, z), collide(c, step), prepare(c, reach), surface?(x, z) -> 0 paved / 1 terrain }
 */
export function stepFeel(c, input, dt, env, F = FEEL) {
  if (dt <= 0) return;
  const throttle = input.throttle || 0, steerIn = input.steer || 0, hb = input.handbrake ? 1 : 0;
  const L = HANDLING.wheelbase || 2.65, a = L / 2, b = L / 2;
  const track = Math.max(0.6, (c.bodyHx ?? BODY.hx) * 0.86);
  const prevX = c.x, prevZ = c.z;
  const B = 1.732 / F.peakSlip;

  env.prepare?.(c, Math.hypot(c.speed, c.vx, c.vz) * dt + 8);
  // the surface under the car, once per frame
  c.surface = env.surface ? env.surface(c.x, c.z) : 0;
  const mu = c.surface ? F.muTerrain : F.mu;

  // first step after a reset or a teleport (the game kit moves the state): the body on the ground, level with it
  if (c.init && (Math.abs(c.x - c.lastX) + Math.abs(c.z - c.lastZ) > 6 || Math.abs(env.ground(c.x, c.z) - c.y) > 4)) c.init = false;
  if (!c.init || !Number.isFinite(c.y)) {
    c.y = env.ground(c.x, c.z);
    const s = Math.sin(c.heading), k = Math.cos(c.heading);
    const hF = env.ground(c.x + s * a, c.z + k * a), hB = env.ground(c.x - s * b, c.z - k * b);
    const hL = env.ground(c.x + k * track, c.z - s * track), hR = env.ground(c.x - k * track, c.z + s * track);
    c.slopePitch = Math.atan((hF - hB) / L); c.slopeRoll = Math.atan((hL - hR) / (2 * track));
    c.vy = c.pitchV = c.rollV = 0;
    for (let i = 0; i < 4; i++) { c.gPrev[i] = NaN; c.wy[i] = 0; }
    c.init = true;
  }

  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  let ax = 0;
  for (let it = 0; it < steps; it++) {
    const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
    // ---------------------------------------------------------------- suspension (vertical plate)
    let P = c.slopePitch, R = c.slopeRoll;
    let fSum = 0, fP = 0, fR = 0, front = 0, rear = 0;
    const preload = G / 4;
    for (let i = 0; i < 4; i++) {
      const lx = WX[i] * track, lz = WZ[i] > 0 ? a : -b;
      const wx = c.x + sinH * lz + cosH * lx, wz = c.z + cosH * lz - sinH * lx;
      const g = env.ground(wx, wz);
      gW[i] = g;
      const hub = c.y + lz * Math.sin(P) + lx * Math.sin(R);
      const ci = g - hub;                                        // + = the ground over the wheel's rest contact
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
    // weight transfer: the plate pitches / rolls with the body's accelerations (lagged a little)
    c.vy += (fSum - F.gravity * (grounded === 0 ? F.airGravity : 1)) * h;
    c.pitchV += (fP / F.pitchI + c.axLag * F.cgHeight / F.pitchI) * h;
    c.rollV += (fR / F.rollI + c.ayLag * F.cgHeight / F.rollI * 0.5) * h;
    c.vy = clamp(c.vy, -25, 12);
    c.pitchV = clamp(c.pitchV, -2.5, 2.5); c.rollV = clamp(c.rollV, -2.5, 2.5);
    c.y += c.vy * h;
    P = clamp(P + c.pitchV * h, -0.6, 0.6); R = clamp(R + c.rollV * h, -0.5, 0.5);
    // bump stop: no wheel sinks past its travel (the plate is moved, not bounced)
    for (let i = 0; i < 4; i++) {
      const lx = WX[i] * track, lz = WZ[i] > 0 ? a : -b;
      const e = gW[i] - (c.y + lz * Math.sin(P) + lx * Math.sin(R)) - F.bump;
      if (e <= 0) continue;
      c.y += e * 0.4; P += e * 0.3 / lz; R += e * 0.3 / lx;
      // (the speed the stop hands the body: what the wheel's ground does, capped: a kerb at speed is a jolt, not a jump)
      const vUp = Math.min(Math.max(0, e / h), F.maxRise) + Math.max(0, gW[i] - (Number.isFinite(c.gPrev[i]) ? c.gPrev[i] : gW[i])) * 0;
      const want = Math.min(c.vy + vUp * 0.4, Math.max(c.vy, (gW[i] - c.y) / h * 0.4));
      if (want > c.vy) c.vy = Math.min(want, Math.max(c.vy, F.maxRise) );
      if (lz * c.pitchV < 0) c.pitchV *= 0.5;
      if (lx * c.rollV < 0) c.rollV *= 0.5;
    }
    c.slopePitch = P; c.slopeRoll = R;
    c.grounded = grounded;

    // ---------------------------------------------------------------- the plane: tyres, pedals, steering
    let u = c.speed, v = c.vx * cosH - c.vz * sinH, r = c.angularVel;   // forward, left, yaw rate
    const V = Math.hypot(u, v);
    const fwdMove = u > 0.5;
    // pedals: W forward / S brake then reverse (the old driveSpeed rules)
    // (a crawl against the pedal = at rest: rolled back a little on a hill, W drives up again; browser check 2026-11-16:
    // without this, gravity re-made the crawl every substep and the car sat on a 10 % street with W held)
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
    if (hb && Math.abs(u) > 0.05) { const d = Math.min(Math.abs(u) / h, F.handbrakeDecel); axP -= Math.sign(u) * d * 0.5; }
    // traction: the pedals' pull is limited by the grip under the wheels that touch
    const axMax = mu * G * Math.max(0.05, grounded) * 1.05;
    axP = clamp(axP, -axMax, axMax);
    // gravity along the plate (auto-hold at a standstill without throttle, as before; not on a > 40 % slope)
    // (the ground's own slope under the wheels, not the body's: its dive / squat is not a hill)
    const Pg = Math.atan(((gW[0] + gW[1]) - (gW[2] + gW[3])) / (2 * L)), Rg = Math.atan(((gW[0] + gW[2]) - (gW[1] + gW[3])) / (4 * track));
    const gx = -F.gravity * Math.sin(Pg), gy = -F.gravity * Math.sin(Rg) * 0.5;
    const hold = !throttle && !hb && Math.abs(u) < 0.3 && Math.abs(Pg) < 0.38;
    // loads (per unit mass, g units of grip): static + the transfer
    const tr = c.axLag * F.cgHeight / L * F.transfer;
    const nF = Math.max(0.15, (b / L) - tr / G) * (front / 2), nR = Math.max(0.15, (a / L) + tr / G) * (rear / 2);
    // steering: speed-sensitive lock, eased, auto counter-steer
    const lock = clamp(Math.atan(L * F.steerG / Math.max(1, u * u)), F.minSteer, F.maxSteer);
    const beta = V > 2 && u > 0 ? Math.atan2(v, u) : 0;            // body slip (+ = travel to the left of the nose)
    const excess = beta - clamp(beta, -F.counterFrom, F.counterFrom);
    const target = clamp(steerIn * lock + (fwdMove ? F.counterSteer * excess : 0), -F.maxSteer, F.maxSteer);
    const rate = (Math.abs(target) < Math.abs(c.steerAngle) ? F.steerReturn : F.steerRate) * h;
    c.steerAngle += clamp(target - c.steerAngle, -rate, rate);
    const d = c.steerAngle, cd = Math.cos(d), sd = Math.sin(d);
    // front axle: velocity in the wheel's frame
    const vfx = u, vfy = v + a * r;
    const wl = vfx * cd + vfy * sd, wt = -vfx * sd + vfy * cd;
    const muF = mu * F.frontGrip * G * nF;
    let Ff = -muF * tyre(Math.atan2(wt, Math.max(Math.abs(wl), 0.4)), B);
    Ff = clamp(Ff, -Math.abs(wt) / h * 0.5, Math.abs(wt) / h * 0.5);       // never past the slip it takes away (no chatter)
    // rear axle: the friction circle with the pedals, the handbrake
    const vry = v - b * r;
    const muR0 = mu * G * nR * (hb ? F.handbrakeGrip : 1);
    const useR = Math.min(0.9, Math.abs(axP * 0.6) / Math.max(0.1, mu * G * nR));
    const muR = muR0 * Math.sqrt(1 - useR * useR);
    let Fr = -muR * tyre(Math.atan2(vry, Math.max(Math.abs(u), 0.4)), B);
    Fr = clamp(Fr, -Math.abs(vry) / h * 0.5, Math.abs(vry) / h * 0.5);
    // body accelerations
    const FyF = Ff * cd, FxF = -Ff * sd;
    let du = (grounded > 0 ? axP + FxF : 0) + (hold ? 0 : gx);
    let dv = (grounded > 0 ? FyF + Fr : 0) + (hold ? 0 : gy);
    let dr = grounded > 0 ? (a * FyF - b * Fr) / F.yawInertia : 0;
    // stability assist: a slide past stableSlip is pulled back (not with the handbrake held)
    if (!hb && fwdMove && grounded > 0) dr += F.stability * (beta - clamp(beta, -F.stableSlip, F.stableSlip)) * Math.min(1, V / 8);
    // the yaw cap (arcade): never turning faster than the grip can carry the path round (no spin from a brake + full lock)
    if (grounded > 0 && V > 3) {
      const cap = (hb ? F.yawCapHb : F.yawCap) * mu * G / V, over = Math.abs(r) - cap;
      if (over > 0) dr -= Math.sign(r) * over * F.yawCapRate;
    }
    u += du * h; v += dv * h; r += dr * h;
    if (hold) { u = 0; if (Math.abs(v) < 0.3) v *= 0.8; }
    // low speed: the kinematic bicycle (no slip at a crawl / parking)
    const kin = 1 - smooth(1.5, 5, V);
    if (kin > 0 && grounded > 0) {
      r += (u * Math.tan(d) / L - r) * kin * Math.min(1, 25 * h);
      v *= 1 - kin * Math.min(1, 20 * h);
    }
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
    const axT = grounded > 0 ? axP + FxF : 0, ay = grounded > 0 ? FyF + Fr : 0;   // (what the tyres do: the load transfer)
    c.axLag += (clamp(axT, -14, 14) - c.axLag) * Math.min(1, h / 0.09);
    c.ayLag += (clamp(ay, -14, 14) - c.ayLag) * Math.min(1, h / 0.09);
    c.slip = beta;
    env.collide?.(c, h);
  }
  // never under the surface (a layer change, a teleport, a missed step): back on it
  const g0 = env.ground(c.x, c.z);
  if (c.y < g0 - 0.3) { c.y = g0 - 0.05; c.vy = Math.max(0, c.vy); }
  c.lastX = c.x; c.lastZ = c.z;
  c.pitch = c.roll = 0; c.heave = 0;          // (the plate carries the body's attitude: carModel's chassis springs idle)
  c.accel = ax;
  c.braking = c.speed * throttle < -0.01 || (hb && Math.abs(c.speed) > 0.3);
  c.reversing = c.speed < -0.2;
  const fwd = (c.x - prevX) * Math.sin(c.heading) + (c.z - prevZ) * Math.cos(c.heading);
  c.wheelSpin = (c.wheelSpin + fwd / 0.317) % (Math.PI * 2);
}
