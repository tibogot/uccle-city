// THE ARCADE MOTORBIKE: a two-wheeler on the drive base (viewer/drive/carPhysics.js: the same forward-speed curve, the
// same friction circle, 120 Hz substeps, the same colliders and impact pushes through carEnv.js), plus what makes a bike:
//   LEAN     the bike turns by leaning: the yaw rate is g tan(lean) / v (a coordinated turn); the lean follows the
//            steering input with a lag that grows with speed (the gyroscope), max ~46 deg, less when the tyres are
//            also braking / accelerating (the friction circle); at walking pace it steers like a scooter (handlebar).
//            Counter-steer feel: the front wheel first turns AWAY from the corner while the lean builds, then into it.
//   WHEELIE  pitch about the rear contact from the drive force against gravity (a h vs g l); full gas (Shift + W) at
//            low speed lifts the front; the rider holds it near the balance point (arcade: never loops)
//   STOPPIE  the same about the front contact under a hard front brake
//   SLIDE    Space = rear brake: the rear locks, the tail steps out; braking hard at full lean, or a big hit, = a crash:
//            the bike falls on its side and slides, the rider tumbles off, respawn after ~2.5 s at the last safe pose
//   ENGINE   6 gears, rpm for the sound and the HUD; a shift cuts the drive for 80 ms
// Heading convention as the car: forward = (sin h, cos h) in x / z; h grows turning left; lean > 0 = leaning left.
// Pure JS (no three).

/** Handling: every field a dev-panel slider candidate. */
export const MOTO = {
  topSpeed: 74,          // m/s (266 km/h, drag-limited near 250)
  reverseSpeed: 1.2,     // m/s: paddling backwards with the feet
  power: 10,             // m/s² at low speed (0-100 km/h ~ 3 s)
  powerSpeed: 20,        // above it (m/s) the engine's power limits the pull (a ~ power * powerSpeed / v)
  boost: 1.32,           // Shift: full gas (the clutch dumped): more drive at low speed
  brakeFront: 11.5,      // m/s² at full lever
  brakeRear: 4.2,        // m/s² (Space)
  rolling: 0.15, drag: 0.00042, coast: 0.95,
  wheelbase: 1.45,
  grip: 12,              // m/s²: the tyres' budget (lean 45 deg = 9.8 m/s² sideways)
  maxLean: 0.80,         // rad (46 deg)
  leanRate: 5,           // 1/s at low speed (falls with speed: the gyroscope)
  lowSteer: 0.55,        // rad of handlebar at walking pace
  cgHeight: 0.66, cgToRear: 0.72, cgToFront: 0.73,
  wheelieMax: 0.62, stoppieMax: 0.30,
  crashSpeed: 8.5,       // m/s into an obstacle (head-on part) = a crash
  gravity: 9.81,
  bounce: 0.2,
  respawn: 2.6,          // s on the ground before the respawn
};

/** The bike's box (half width, half length), narrow: it filters between cars. */
export const MOTO_BODY = { hx: 0.40, hz: 1.06, height: 1.2 };

const GEARS = [17, 28, 38, 48, 59, 74];    // m/s at the 11,800 rpm redline per gear
export const RPM = { idle: 1350, red: 11800, up: 11200, down: 5200 };

export function createMotoState(x, z, heading) {
  return {
    x, z, y: 0, heading, speed: 0, vx: 0, vz: 0, angularVel: 0, steerAngle: 0,
    pitch: 0, roll: 0, pitchVel: 0, rollVel: 0, heave: 0, heaveVel: 0,
    slopePitch: 0, slopeRoll: 0, wheelSpin: 0, frontSpin: 0, braking: false, reversing: false,
    lean: 0, leanTarget: 0, wheelie: 0, wheelieVel: 0, slide: 0, tuck: 0,
    gear: 1, rpm: RPM.idle, shiftT: 0, shifts: 0, throttle: 0, frontBrake: 0, rearBrake: 0, boost: 0,
    crashed: false, crashT: 0, crashes: 0, crashDir: 1, overGrip: 0,
    safe: { x, z, heading, t: 0 },
    hits: 0, lastHit: null, accel: 0,
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** forward speed after dt (carPhysics driveSpeed with the bike's two brakes) */
function driveSpeed(speed, throttle, brake, dt, H, boost) {
  const m = Math.abs(speed);
  const decel = H.rolling + (throttle > 0 ? 0 : H.coast * (m > 2 ? 1 : 0.3)) + brake;
  const coasting = Math.max(0, m - decel * dt) / (1 + H.drag * m * dt);
  if (throttle <= 0 || brake > 0.5) return Math.sign(speed) * coasting;
  const a = H.power * (1 + (boost - 1) * smooth(26, 8, m)) * H.powerSpeed / Math.max(H.powerSpeed, m);
  return Math.min(Math.max(H.topSpeed, coasting), coasting + throttle * a * dt);
}

/**
 * Advance the bike by dt seconds.
 * input: { throttle 0..1 (W), brake 0..1 (S, the front lever; at a standstill: paddle back), rear bool (Space),
 *          steer -1..1 (left +), boost bool (Shift) }
 * env:   carEnv.js (ground, prepare, collide) made with MOTO_BODY and motoHit
 */
export function stepMoto(c, input, dt, env, H = MOTO) {
  if (dt <= 0) return;
  dt = Math.min(dt, 0.1);
  const prevX = c.x, prevZ = c.z;
  let throttle = input.throttle > 0 ? input.throttle : 0;
  let front = input.brake > 0 ? input.brake : 0;
  const rear = input.rear ? 1 : 0, steerIn = input.steer || 0;
  c.boost = input.boost ? 1 : 0;
  // at a standstill S paddles backwards (no reverse gear on a bike)
  let paddle = 0;
  if (front > 0 && c.speed < 0.4 && !throttle) { paddle = front; front = 0; }
  if (c.crashed) { throttle = 0; front = 0; paddle = 0; }
  c.throttle = throttle; c.frontBrake = front; c.rearBrake = rear;
  c.braking = (front > 0.05 || rear > 0) && Math.abs(c.speed) > 0.3;
  c.reversing = c.speed < -0.2;

  // the ground under the two wheels (+ two samples across for the HUD's roll: the bike itself stays upright)
  let sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
  const L = H.wheelbase / 2;
  const hF = env.ground(c.x + sinH * L, c.z + cosH * L), hB = env.ground(c.x - sinH * L, c.z - cosH * L);
  const grade = (hF - hB) / H.wheelbase;
  c.slopePitch = Math.atan(grade);
  c.slopeRoll = 0;
  const gAlong = -H.gravity * grade / Math.sqrt(1 + grade * grade);
  env.prepare?.(c, Math.abs(c.speed) * dt + 6);

  // gearbox (sound / HUD; a shift cuts the drive)
  const v0 = Math.abs(c.speed);
  if (c.shiftT > 0) c.shiftT -= dt;
  const rpmOf = (g, v) => Math.max(RPM.idle, (v / GEARS[g - 1]) * RPM.red);
  if (v0 < 1.5) c.gear = 1;
  else if (c.shiftT <= 0) {
    if (c.gear < 6 && rpmOf(c.gear, v0) > RPM.up && throttle > 0.2) { c.gear++; c.shiftT = 0.08; c.shifts++; }
    else if (c.gear > 1 && rpmOf(c.gear, v0) < RPM.down && rpmOf(c.gear - 1, v0) < RPM.up * 0.92) { c.gear--; c.shiftT = 0.05; c.shifts++; }
  }
  let rpmT = rpmOf(c.gear, v0);
  if (v0 < 4 && throttle > 0) rpmT = Math.max(rpmT, 2500 + throttle * (c.boost ? 7500 : 4200) * (1 - v0 / 6));   // the clutch slipping off the line
  if (c.shiftT > 0 && throttle > 0) rpmT *= 0.9;
  if (c.crashed) rpmT = RPM.idle * 1.2;
  c.rpm += (Math.min(RPM.red, rpmT) - c.rpm) * (1 - Math.exp(-dt * (rpmT > c.rpm ? 14 : 9)));
  const drive = c.shiftT > 0 ? throttle * 0.15 : throttle;

  const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps;
  const tireResponse = 1 - Math.exp(-6 * step);
  let accel = 0;
  for (let i = 0; i < steps; i++) {
    sinH = Math.sin(c.heading); cosH = Math.cos(c.heading);
    const vx = sinH * c.speed + c.vx, vz = cosH * c.speed + c.vz;
    const forward = vx * sinH + vz * cosH, sideways = vx * cosH - vz * sinH;
    const v = Math.abs(forward);
    // brakes: the front loses effect in a stoppie's air time... no: the rear does (it is off the ground)
    const rearOn = c.wheelie > -0.03 ? 1 : 0, frontOn = c.wheelie < 0.03 ? 1 : 0;
    const brake = front * H.brakeFront * frontOn + rear * H.brakeRear * rearOn + (c.crashed ? 6.5 : 0);
    let speed;
    if (paddle) speed = Math.max(-H.reverseSpeed, forward - paddle * 2.5 * step);
    else if (forward < 0) speed = Math.min(0, forward + (2 + brake + (throttle ? 6 : 0)) * step);
    else speed = driveSpeed(forward, drive * (c.crashed ? 0 : 1) * rearOn, brake, step, H, c.boost ? H.boost : 1);
    if (Math.abs(speed) > 0.3 || throttle) speed += gAlong * step;
    if (!throttle && !paddle && Math.abs(speed) < 0.3 && Math.abs(gAlong) < 1.5) speed *= Math.exp(-8 * step);   // feet down: held still
    const acceleration = (speed - forward) / step;
    accel = acceleration;

    // the friction circle: what is left for cornering
    const tireAcc = acceleration + H.drag * forward * Math.abs(forward) - gAlong;
    const lat = Math.sqrt(Math.max(0, H.grip * H.grip - tireAcc * tireAcc));

    // ---- lean (the steering)
    const vs = Math.max(v, 0.01);
    if (!c.crashed) {
      const speedLean = H.maxLean * smooth(1.2, 9, v);
      const gripLean = Math.atan(lat / H.gravity) + 0.06;
      c.leanTarget = steerIn * Math.min(speedLean, gripLean + 0.05);
      const rate = H.leanRate / (1 + v / 20);
      c.lean += (c.leanTarget - c.lean) * (1 - Math.exp(-rate * step));
      // over the grip (braking / gassing hard at full lean): the front tucks -> a low-side
      const need = H.gravity * Math.tan(Math.abs(c.lean));
      c.overGrip = need > lat + 1.2 && v > 6 ? c.overGrip + step : Math.max(0, c.overGrip - step * 2);
      if (c.overGrip > 0.35) crash(c, Math.sign(c.lean) || 1, H);
    } else {
      // on its side: the fall, then lying
      const tgt = 1.42 * c.crashDir;
      c.lean += (tgt - c.lean) * (1 - Math.exp(-9 * step));
    }
    // yaw: kinematic at walking pace (handlebar), coordinated turn from the lean above (g tan(lean) / v)
    const wLean = smooth(2.5, 6.5, v);
    const bar = steerIn * H.lowSteer * (1 - wLean);
    let yaw = c.crashed ? c.angularVel * Math.exp(-2.5 * step)
      : (1 - wLean) * speed * Math.tan(bar) / H.wheelbase + wLean * Math.sign(speed) * H.gravity * Math.tan(c.lean) / Math.max(vs, 3);
    // the rear brake slide: the tail steps out, steering pushes it further (a drift-ish skid)
    if (rear && v > 4 && !c.crashed) { yaw += steerIn * 0.45 * smooth(4, 12, v); c.slide = Math.min(1, c.slide + step * 3); }
    else c.slide = Math.max(0, c.slide - step * 2.5);
    c.angularVel += (yaw - c.angularVel) * (1 - Math.exp(-(c.crashed ? 30 : 12) * step));
    c.heading += c.angularVel * step;

    // the front wheel: steady-state steer + the counter-steer flick while the lean builds
    const ss = wLean * Math.atan(H.wheelbase * c.angularVel / Math.max(vs, 3)) + bar;
    const counter = -0.16 * (c.leanTarget - c.lean) * smooth(3, 10, v);
    c.steerAngle += (clamp(ss + counter, -0.6, 0.6) - c.steerAngle) * (1 - Math.exp(-14 * step));

    // momentum into the new heading; the tyres remove the sideways slip (less in a slide / when down)
    const ns = Math.sin(c.heading), nc = Math.cos(c.heading);
    const wx = sinH * speed + cosH * sideways, wz = cosH * speed - sinH * sideways;
    c.speed = wx * ns + wz * nc;
    const slip = wx * nc - wz * ns;
    const latGrip = c.crashed ? 5 : lat * (1 - 0.55 * c.slide) + 2;
    const corr = clamp(-slip * tireResponse, -latGrip * step, latGrip * step);
    c.vx = nc * (slip + corr); c.vz = -ns * (slip + corr);
    c.x += (ns * c.speed + c.vx) * step;
    c.z += (nc * c.speed + c.vz) * step;
    env.collide?.(c, step);

    // ---- wheelie / stoppie: pitch about the rear (> 0) or the front (< 0) contact
    if (!c.crashed) {
      const h = H.cgHeight, w = c.wheelie, aw = Math.abs(w), cw = Math.cos(aw), sw = Math.sin(aw);
      // front up: the drive force (a h) against gravity's arm to the rear contact (shrinks as it rises: the balance point)
      const up = Math.max(0, acceleration) * (c.boost && throttle ? 1 + 0.28 * smooth(24, 12, v) : 1) * h * cw - H.gravity * (H.cgToRear * cw - h * sw) - (throttle ? 0 : 6);
      // rear up: the braking force (d h) against gravity's arm to the front contact
      const down = Math.max(0, -acceleration) * (front > 0.8 ? 1.12 : 0.9) * h * cw - H.gravity * (H.cgToFront * cw - h * sw);
      let torque = 0;                                 // > 0 lifts the front
      if (w > 0 || (w === 0 && up > 0)) torque = up - Math.max(0, w - H.wheelieMax * 0.8) * 60;     // (the rider eases the gas at the top)
      else if (w < 0 || down > 0) torque = -(down - Math.max(0, aw - H.stoppieMax * 0.75) * 70);
      const I = 1.05;        // (h² + l²): the rotational inertia per unit mass
      c.wheelieVel += (torque / I) * step;
      c.wheelieVel *= Math.exp(-1.8 * step);
      const nw = w + c.wheelieVel * step;
      if ((w > 0 && nw <= 0) || (w < 0 && nw >= 0)) { c.wheelie = 0; c.heaveVel -= Math.min(1.2, Math.abs(c.wheelieVel) * 0.6); c.wheelieVel = 0; }   // touch down
      else c.wheelie = clamp(nw, -H.stoppieMax, H.wheelieMax + 0.05);
      if (c.wheelie === 0 && torque <= 0 && w === 0) c.wheelieVel = 0;
      if (c.wheelie >= H.wheelieMax + 0.05) c.wheelieVel = Math.min(0, c.wheelieVel);
      if (c.wheelie <= -H.stoppieMax) c.wheelieVel = Math.max(0, c.wheelieVel);
    } else { c.wheelie *= Math.exp(-6 * step); c.wheelieVel = 0; }

    // chassis on its springs: dive / squat (small), heave
    const tp = -clamp(acceleration / 12, -1, 1) * 0.028;
    c.pitchVel += ((tp - c.pitch) * 90 - c.pitchVel * 13) * step;
    c.pitch = clamp(c.pitch + c.pitchVel * step, -0.07, 0.07);
    c.heaveVel += (-c.heave * 110 - c.heaveVel * 12) * step;
    c.heave = clamp(c.heave + c.heaveVel * step, -0.06, 0.08);
  }
  // the bike's height: the wheels on the ground (y = midway), lifted in a wheelie / stoppie by the pivot
  c.y = (hF + hB) / 2;
  c.accel = accel;
  // the rider tucks at speed (visual)
  c.tuck += (smooth(18, 45, Math.abs(c.speed)) * (throttle > 0.2 ? 1 : 0.6) - c.tuck) * (1 - Math.exp(-dt * 2.5));
  const fwd = (c.x - prevX) * Math.sin(c.heading) + (c.z - prevZ) * Math.cos(c.heading);
  const TAU = Math.PI * 2;
  if (!(c.wheelie < -0.03 && c.speed > 0)) c.wheelSpin = (c.wheelSpin + (rear && !c.crashed ? fwd * 0.1 : fwd) / 0.32) % TAU;   // the rear locks under the rear brake
  c.frontSpin = (c.frontSpin + fwd / 0.30) % TAU;
  // crash timer -> respawn; the last safe pose (upright, moving, nothing touching)
  if (c.crashed) {
    c.crashT += dt;
    if (c.crashT > H.respawn) respawn(c);
  } else if (Math.abs(c.lean) < 0.25 && Math.abs(c.speed) > 1.5 && !env.contacts && Math.abs(c.wheelie) < 0.05) {
    c.safe.t += dt;
    if (c.safe.t > 0.5) { c.safe.x = c.x; c.safe.z = c.z; c.safe.heading = c.heading; c.safe.t = 0; }
  }
}

function crash(c, dir, H = MOTO) {
  if (c.crashed) return;
  c.crashed = true; c.crashT = 0; c.crashes++; c.crashDir = dir; c.overGrip = 0;
  c.wheelieVel = 0;
}

/** after a crash: upright at the last safe pose (half a second or more before), stopped */
export function respawn(c) {
  c.crashed = false; c.crashT = 0;
  c.x = c.safe.x; c.z = c.safe.z; c.heading = c.safe.heading;
  c.speed = 0; c.vx = 0; c.vz = 0; c.angularVel = 0; c.lean = 0; c.leanTarget = 0; c.wheelie = 0; c.wheelieVel = 0; c.slide = 0;
  c.gear = 1; c.respawned = (c.respawned || 0) + 1;
}

/**
 * Impact response for one contact (carEnv push: n = out of the obstacle, the position already pushed).
 * A glancing touch keeps the speed and turns the bike along the wall; a hard hit (> crashSpeed into it) = a crash.
 */
export function motoHit(c, nx, nz, kind, H = MOTO) {
  const sinH = Math.sin(c.heading), cosH = Math.cos(c.heading);
  const tvx = sinH * c.speed + c.vx, tvz = cosH * c.speed + c.vz;
  const vn = -(tvx * nx + tvz * nz);
  if (vn <= 0.4) return 0;
  const headOn = Math.abs(sinH * nx + cosH * nz), side = cosH * nx - sinH * nz;
  if (vn > H.crashSpeed && !c.crashed) {
    crash(c, side >= 0 ? -1 : 1, H);
    c.speed *= 0.35 * (1 - headOn * 0.6); c.vx += nx * vn * 0.3; c.vz += nz * vn * 0.3;
    c.angularVel += side * 3.5;
  } else if (headOn > 0.72) {
    c.speed = -c.speed * H.bounce; c.vx *= 0.5; c.vz *= 0.5;
  } else {
    c.vx += nx * vn * 0.5; c.vz += nz * vn * 0.5;
    c.speed *= 1 - 0.5 * headOn;
    c.angularVel += side * (sinH * nx + cosH * nz >= 0 ? -1 : 1) * Math.min(2.5, vn * 0.2);
  }
  c.heaveVel += Math.min(1.2, vn * 0.1);
  c.hits++;
  if (vn > 2) c.lastHit = { x: c.x, z: c.z, nx, nz, speed: vn, kind, t: performance.now() };
  return vn;
}

/** How far to lift the bike so nothing of it sinks into the ground at this lean (tyre crowns, then the bar ends,
 *  pegs, mirrors once it lies on its side). */
export function leanLift(lean, crownR = 0.095) {
  const a = Math.abs(lean), s = Math.sin(a), k = Math.cos(a);
  let lift = crownR * (1 - k);
  for (let i = 0; i < SIDE_PTS.length; i += 2) lift = Math.max(lift, SIDE_PTS[i] * s - SIDE_PTS[i + 1] * k);
  return lift;
}
// (|y|, z) of the parts that touch the ground first when it falls (moto.json frame)
const SIDE_PTS = [0.40, 1.04, 0.42, 1.19, 0.27, 0.34, 0.24, 0.42, 0.2, 0.97];
