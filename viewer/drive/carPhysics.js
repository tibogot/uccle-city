// THE ARCADE CAR: a bicycle model with a tyre grip budget, stepped at 120 Hz, no physics library. Pure JS (no three):
// the Car Lab and drive mode share it.
//
// After mrdoob's slop-newyork js/controllers.js updateCar (MIT, (c) 2026 Mr.doob): the forward speed follows the
// throttle / brake / drag curve, braking and cornering share one tyre grip (friction circle), the chassis does not
// rotate its momentum instantly (sideways slip is removed by a bounded tyre force), steering lock falls with speed,
// collisions push out and kick yaw / pitch / roll / heave, a spring-damped body rides on top. And from slop-egara
// (Terrassa, real relief): pitch and roll of the ground from four samples round the car, and gravity along the slope.
// Ours adds a real handbrake (Space: rear grip drops, the tail steps out).
//
// Heading convention: forward = (sin h, cos h) in x / z; left = (cos h, -sin h); h grows turning left.

/** Handling. Every field is a panel slider in the Car Lab. */
export const HANDLING = {
  topSpeed: 36,        // m/s (130 km/h)
  reverseSpeed: 9,     // m/s
  power: 4.6,          // m/s² at low speed (0-100 km/h ~ 8.5 s with powerSpeed)
  powerSpeed: 14.5,    // above this (m/s) the engine's power limits the pull (a ~ power * powerSpeed / v)
  brake: 9,            // m/s² at full pedal
  rolling: 0.18, drag: 0.0012, coast: 0.6,
  wheelbase: 2.62,
  grip: 9.5,           // m/s²: the tyres' budget, shared by braking / accelerating and cornering
  cornering: 10.5,     // m/s²: how hard the steering asks the car to turn (sets lock vs speed)
  maxSteer: 0.6,       // rad, full lock at parking speed
  steerRate: 10,       // 1/s, how fast the wheels follow the input
  handbrakeGrip: 0.3,  // rear grip left with the handbrake on (0..1)
  handbrakeDecel: 5,   // m/s² it brakes
  springK: 68, damping: 11.2,       // body pitch / roll spring (1/s²) and damper (1/s)
  pitchGain: 0.026, rollGain: 0.012, // body attitude per unit of acceleration (rad)
  heaveK: 85, heaveDamping: 12,
  gravity: 9.81,
  bounce: 0.25,        // head-on hits bounce back at this fraction of the speed
};

/** The car's body box: half width, half length (m). */
export const BODY = { hx: 0.9, hz: 2.15, height: 1.47 };

export function createCarState(x, z, heading) {
  return {
    x, z, y: 0, heading, speed: 0, vx: 0, vz: 0, angularVel: 0, steerAngle: 0,
    pitch: 0, roll: 0, pitchVel: 0, rollVel: 0, heave: 0, heaveVel: 0,
    slopePitch: 0, slopeRoll: 0, wheelSpin: 0, braking: false, reversing: false,
    hits: 0, lastHit: null, // lastHit = { x, z, nx, nz, speed, kind } of the latest impact > 2 m/s
  };
}

/** Forward speed after dt under throttle (-1..1; against the motion = brake). (slop-newyork driveSpeed) */
function driveSpeed(speed, throttle, dt, H) {
  if (speed * throttle < 0 && Math.abs(speed) < 0.05) speed = 0;
  const braking = speed * throttle < 0;
  const m = Math.abs(speed);
  const decel = H.rolling + (!throttle ? H.coast : braking ? Math.abs(throttle) * H.brake : 0);
  const coasting = Math.max(0, m - decel * dt) / (1 + H.drag * m * dt);
  if (!throttle || braking) return Math.sign(speed) * coasting;
  const limit = throttle < 0 ? H.reverseSpeed : H.topSpeed;
  const a = H.power * H.powerSpeed / Math.max(H.powerSpeed, m);
  return Math.sign(throttle) * Math.min(Math.max(limit, coasting), coasting + Math.abs(throttle) * a * dt);
}

/**
 * Advance the car by dt seconds.
 * input: { throttle -1..1 (W = +1, S = -1), steer -1..1 (left +), handbrake bool }
 * env:   { ground(x, z) -> y, collide(state, body) -> resolves contacts (calls hit() below for each), prepare?(state, reach) }
 */
export function stepCar(c, input, dt, env, H = HANDLING) {
  if (dt <= 0) return;
  const throttle = input.throttle || 0, steerIn = input.steer || 0, hb = input.handbrake ? 1 : 0;
  c.braking = c.speed * throttle < -0.01 || (hb && Math.abs(c.speed) > 0.3);
  c.reversing = c.speed < -0.2;
  const prevX = c.x, prevZ = c.z;

  // the ground under the car: four samples (front, back, right, left), once per frame
  const sx = 1.3, sw = 0.75;
  let sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
  const hF = env.ground(c.x + sinH * sx, c.z + cosH * sx), hB = env.ground(c.x - sinH * sx, c.z - cosH * sx);
  const hL = env.ground(c.x + cosH * sw, c.z - sinH * sw), hR = env.ground(c.x - cosH * sw, c.z + sinH * sw);
  const grade = (hF - hB) / (2 * sx);
  c.slopePitch = Math.atan(grade);                 // nose up = positive
  c.slopeRoll = Math.atan((hL - hR) / (2 * sw));   // left side up = positive
  const gAlong = -H.gravity * grade / Math.sqrt(1 + grade * grade);

  env.prepare?.(c, Math.abs(c.speed) * dt + 8);

  const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps;
  const steerResponse = 1 - Math.exp(-H.steerRate * step), yawResponse = 1 - Math.exp(-5 * step), tireResponse = 1 - Math.exp(-4 * step);
  let accel = 0, corr = 0;
  for (let i = 0; i < steps; i++) {
    sinH = Math.sin(c.heading); cosH = Math.cos(c.heading);
    const vx = sinH * c.speed + c.vx, vz = cosH * c.speed + c.vz;
    const forward = vx * sinH + vz * cosH, sideways = vx * cosH - vz * sinH;
    let speed = driveSpeed(forward, throttle, step, H);
    // handbrake: a brake on the rear wheels
    if (hb) speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - H.handbrakeDecel * step);
    // gravity along the slope (held still at a standstill with no throttle, as an auto-hold)
    if (Math.abs(speed) > 0.3 || throttle) speed += gAlong * step;
    const acceleration = (speed - forward) / step;
    accel = acceleration;
    const tireAcc = acceleration + H.drag * forward * Math.abs(forward) - gAlong;
    const grip = Math.sqrt(Math.max(0, H.grip * H.grip - tireAcc * tireAcc));
    const slide = hb * Math.min(1, Math.abs(forward) / 5);
    const lateralGrip = grip * (1 - (1 - H.handbrakeGrip) * slide);
    const steeringGrip = grip + (H.grip - grip) * slide;

    const turn = H.wheelbase * H.cornering;
    const maxSteer = Math.atan(turn / Math.max(speed * speed, turn / Math.tan(H.maxSteer)));
    c.steerAngle += (steerIn * maxSteer - c.steerAngle) * steerResponse;
    const yawLimit = steeringGrip / Math.max(2, Math.abs(speed)) * (1 + 0.6 * slide);
    const targetYaw = Math.max(-yawLimit, Math.min(yawLimit, speed * Math.tan(c.steerAngle) / H.wheelbase * (1 + 0.5 * slide)));
    const yawStep = steeringGrip * 0.65 * step;
    c.angularVel += Math.max(-yawStep, Math.min(yawStep, (targetYaw - c.angularVel) * yawResponse));
    c.heading += c.angularVel * step;

    const ns = Math.sin(c.heading), nc = Math.cos(c.heading);
    const wx = sinH * speed + cosH * sideways, wz = cosH * speed - sinH * sideways;
    c.speed = wx * ns + wz * nc;
    const slip = wx * nc - wz * ns;
    const correction = Math.max(-lateralGrip * step, Math.min(lateralGrip * step, -slip * tireResponse));
    corr = correction / step;
    c.vx = nc * (slip + correction); c.vz = -ns * (slip + correction);
    c.x += (ns * c.speed + c.vx) * step;
    c.z += (nc * c.speed + c.vz) * step;
    env.collide?.(c, step);

    // the body on its springs: squat / dive with acceleration, lean with the cornering force
    const tp = -Math.max(-1, Math.min(1, acceleration / H.power)) * H.pitchGain;
    const tr = Math.max(-0.09, Math.min(0.09, corr * H.rollGain));
    c.pitchVel += ((tp - c.pitch) * H.springK - c.pitchVel * H.damping) * step;
    c.rollVel += ((tr - c.roll) * H.springK - c.rollVel * H.damping) * step;
    c.pitch = Math.max(-0.22, Math.min(0.22, c.pitch + c.pitchVel * step));
    c.roll = Math.max(-0.26, Math.min(0.26, c.roll + c.rollVel * step));
    c.heaveVel += (-c.heave * H.heaveK - c.heaveVel * H.heaveDamping) * step;
    c.heave = Math.max(-0.08, Math.min(0.14, c.heave + c.heaveVel * step));
  }
  c.y = env.ground(c.x, c.z);
  c.accel = accel;
  const fwd = (c.x - prevX) * Math.sin(c.heading) + (c.z - prevZ) * Math.cos(c.heading);
  c.wheelSpin = (c.wheelSpin + fwd / 0.317) % (Math.PI * 2);
}

/**
 * Impact response for one contact (n = push direction out of the obstacle, already applied to the position).
 * (slop-newyork resolveHorizontalCollision) Head-on bounces back, a glancing hit keeps most speed and yaws the car.
 */
export function hit(c, nx, nz, kind, H = HANDLING) {
  return HIT_OLD ? hitLegacy(c, nx, nz, kind, H) : hitSlide(c, nx, nz, kind, H);
}
/** the response before collisions round 2 (?carhit=old) */
export function hitLegacy(c, nx, nz, kind, H = HANDLING) {
  const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
  const tvx = sinH * c.speed + c.vx, tvz = cosH * c.speed + c.vz;
  const vn = -(tvx * nx + tvz * nz);          // approach speed into the obstacle
  if (vn <= 0.5) return 0;
  const headOn = Math.abs(sinH * nx + cosH * nz), side = cosH * nx - sinH * nz;
  if (headOn > 0.72) {                        // head-on: the forward speed bounces back (slop also adds 0.42 vn: too lively)
    c.speed = -c.speed * H.bounce;
    c.vx *= 0.5; c.vz *= 0.5;
  } else {
    c.vx += nx * vn * 0.42; c.vz += nz * vn * 0.42;
    c.speed *= 1 - 0.62 * headOn;
    c.angularVel += side * (sinH * nx + cosH * nz >= 0 ? -1 : 1) * Math.min(3.2, vn * 0.22);
  }
  c.pitchVel += (sinH * nx + cosH * nz) * Math.min(14, vn) * 0.16;
  c.rollVel -= side * Math.min(14, vn) * 0.22;
  c.heaveVel += Math.min(1.4, vn * 0.11);
  c.hits++;
  if (vn > 2) c.lastHit = { x: c.x, z: c.z, nx, nz, speed: vn, kind, t: performance.now() };
  return vn;
}

// ---------------------------------------------------------------- collisions round 2 (docs/COLLISIONS.md)
/** ?carhit=old: the impact response before collisions round 2 (hit() above): each substep a contact with more than
 *  0.5 m/s into the wall bounced / yawed the car again while the forward speed kept pushing it in: a car scraping a wall
 *  stuttered, lost speed in steps and was kicked round (the owner's "sticky walls"). */
export const HIT_OLD = typeof location !== "undefined" && /[?&]carhit=old(&|$)/.test(location.search);

/**
 * The impact response, collide-and-slide with a rigid-body impulse at the corner that hit (Unity / Godot character
 * controllers slide the velocity along the contact; Chris Hecker's "Physics, Part 3: Collision Response" gives the
 * impulse with rotation; slop-newyork resolveHorizontalCollision only pushes and kicks). The contact point is the car's
 * corner deepest along the push; the point's velocity into the obstacle (the car's velocity + its yaw rate at that
 * corner) is removed by an impulse j = vn (1 + e) / (1 + a^2 / I) (e: a small restitution, only for a hit that is mostly
 * head-on; I / m = (L^2 + W^2) / 12, a = the lever arm of the normal), a Coulomb scrape takes up to mu j along the wall,
 * and the normal impulse turns the car (a front corner hitting a wall swings the car parallel to it, as a real car does).
 * The result is split back into the forward speed + the sideways slip (the tyres then take the slip out as in a
 * skid). After the first substep the corner no longer moves into the wall, so a car pressed along a wall slides on with
 * no new kick: no stutter, no "sticky" wall, no launch; the body kicks (pitch / roll / heave) come once per impact.
 */
const MU_WALL = 0.35, YAW_KICK_MAX = 2.2;
/** HEDGES SOLID (rule hedge-wall): a tall clipped hedge (KIND.hedgeWall = 9, viewer/drive/colliders.js) stops the car as
 *  a wall but gives: its head-on restitution is HEDGE_BOUNCE x a brick wall's (the twigs take the hit), the scrape softer */
export const HEDGE_BOUNCE = 0.35, HEDGE_MU = 0.6;
const HEDGE_WALL_KIND = 9;
export function hitSlide(c, nx, nz, kind, H = HANDLING, dims = null) {
  const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
  const hx = dims?.hx ?? c.bodyHx ?? BODY.hx, hz = dims?.hz ?? c.bodyHz ?? BODY.hz;
  const Im = (4 * hx * hx + 4 * hz * hz) / 12;
  // the corner that hit: the deepest along -n (forward = (sin, cos), left = (cos, -sin))
  const fn = sinH * nx + cosH * nz, ln = cosH * nx - sinH * nz;
  const sf = Math.abs(fn) < 0.05 ? 0 : fn > 0 ? -1 : 1, sl = Math.abs(ln) < 0.05 ? 0 : ln > 0 ? -1 : 1;
  const rx = sinH * hz * sf + cosH * hx * sl, rz = cosH * hz * sf - sinH * hx * sl;
  // the corner's velocity (a yaw rate w moves a point at r by w (rz, -rx))
  const w = c.angularVel;
  const tvx = sinH * c.speed + c.vx, tvz = cosH * c.speed + c.vz;
  const pvx = tvx + w * rz, pvz = tvz - w * rx;
  const vn = -(pvx * nx + pvz * nz);           // the corner's approach speed into the obstacle
  if (vn <= 0.02) return 0;
  const headOn = Math.abs(fn);
  const hw = kind === HEDGE_WALL_KIND;
  const e = vn > 1.5 ? H.bounce * headOn * headOn * (hw ? HEDGE_BOUNCE : 1) : 0;
  const a = nx * rz - nz * rx;
  const j = vn * (1 + e) / (1 + a * a / Im);
  let dvx = nx * j, dvz = nz * j, dw = a * j / Im;
  // the scrape along the wall
  const ptx = pvx + nx * vn, ptz = pvz + nz * vn, pt = Math.hypot(ptx, ptz);
  if (pt > 1e-4) {
    // (linear only: the scrape's torque at the nose would screw a car pushed along a wall round into it)
    const tx = ptx / pt, tz = ptz / pt, jt = Math.min(MU_WALL * (hw ? HEDGE_MU : 1) * j, pt);
    dvx -= tx * jt; dvz -= tz * jt;
  }
  dw = Math.max(-YAW_KICK_MAX, Math.min(YAW_KICK_MAX, dw));
  const wx = tvx + dvx, wz = tvz + dvz;
  const fwd = wx * sinH + wz * cosH, lat = wx * cosH - wz * sinH;
  c.speed = fwd; c.vx = cosH * lat; c.vz = -sinH * lat;
  c.angularVel = w + dw;
  if (vn > 0.8) {
    const kk = hw ? 0.6 : 1;                    // (a hedge: a softer jolt)
    c.pitchVel += fn * Math.min(14, vn) * 0.12 * kk;
    c.rollVel -= ln * Math.min(14, vn) * 0.16 * kk;
    c.heaveVel += Math.min(1.0, vn * 0.08) * kk;
  }
  c.hits++;
  if (vn > 2) c.lastHit = { x: c.x, z: c.z, nx, nz, speed: vn, kind, t: performance.now() };
  return vn;
}
