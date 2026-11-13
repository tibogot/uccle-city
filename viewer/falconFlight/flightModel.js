// THE FALCON FLIGHT MODEL (Falcon Flight Lab, labs/falcon-flight-lab.html): a semi-physical point-mass peregrine.
// Lift ~ CL(alpha) q S, drag = body + wing profile + induced (+ the stall and the flare), gravity, flapping thrust from a
// stamina budget, all against the AIR (the wind, thermals and updrafts of air.js), not the ground. Pure JS (no three),
// so node can test it (tools/falconFlightTest.mjs).
//
// Controls (FlightControls, any input device fills them):
//   pitch  -1..1   push (nose down) .. pull (nose up): asks for a load factor ABOVE / BELOW the one that holds the path
//   roll   -1..1   bank left .. right (target bank = roll * 80 deg; let go = the wings level themselves)
//   fold    0..1   wings spread .. half folded ("diamond", ~0.5) .. tucked (the stoop, 1)
//   flap    0..1   wingbeats (thrust while stamina lasts; opens the wings)
//   brake   0..1   the flare: wings forward, tail fanned down (more lift and much more drag: landing)
// Neutral pitch HOLDS the flight path (a "flight-path hold": the lift that keeps the climb / dive angle, also in a
// banked turn); pulling asks for more g, pushing for less. What the wings cannot give, they do not give: ask for more
// lift than CLmax allows and the path droops (the stall: the nose drops, speed builds, control comes back; no spin).
//
// Frame: world metres, +y up, +x east, +z south (CONTRACT). Angles: gamma = flight-path angle (up > 0), heading = the
// yaw of the air velocity (three.js convention: 0 = toward -z, positive = turning left), phi = bank (> 0 = right wing
// down, a right turn).

export const G = 9.81, RHO = 1.2;

/** Peregrine numbers (a ~1 kg female juvenile; see docs/FALCON_FLIGHT.md for where they come from). */
export const FALCON = {
  mass: 1.0,                     // kg
  bodyCDA: 0.0011,               // m^2: the body's drag area (CD x frontal area), every configuration
  nMax: 7,                       // g: the structural / muscle limit of the pull-out
  bankMax: 80 * Math.PI / 180,
  // wing configurations: S wing area (m^2), AR aspect ratio, cd0 wing profile drag (on S), clMax, the roll rate (rad/s)
  spread: { S: 0.13, AR: 7.7, cd0: 0.016, clMax: 1.45, roll: 2.4 },
  half:   { S: 0.07, AR: 4.0, cd0: 0.030, clMax: 1.15, roll: 3.4 },
  tuck:   { S: 0.018, AR: 1.6, cd0: 0.020, clMax: 0.60, roll: 4.5 },
  flare:  { clMax: 0.5, cd: 0.9 },  // added at brake = 1 (wings forward + alula + fanned tail)
  thrust: 0.42,                  // g: peak flapping thrust at zero airspeed (fades to 0 at vFlap)
  vFlap: 30,                     // m/s: beyond this, flapping adds nothing
  stamina: { drain: 0.075, regen: 0.035, perchRegen: 0.25, low: 0.15 },   // per second
  brushDrag: 2.5,                     // 1/s at the full depth of a crown's leaves (world.column brush 0..1): brushing through
  pull: 3.6, push: 2.0,          // g asked above / below the path-holding load at full pitch input (pull grows to nMax - 1 by 60 m/s)
  trim: [13, 20], trimGain: 2.2, // m/s: hands-off speeds, spread / half folded (the tuck has none: it holds the dive)
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** wing configuration at fold f (0 spread, 0.5 half, 1 tuck): piecewise linear */
export function wingAt(f, W = FALCON) {
  const [A, B, t] = f < 0.5 ? [W.spread, W.half, f / 0.5] : [W.half, W.tuck, (f - 0.5) / 0.5];
  return { S: lerp(A.S, B.S, t), AR: lerp(A.AR, B.AR, t), cd0: lerp(A.cd0, B.cd0, t), clMax: lerp(A.clMax, B.clMax, t), roll: lerp(A.roll, B.roll, t) };
}

/** Lift coefficient for an angle of attack (rad): the lift slope 2 pi AR / (AR + 2), a soft stall beyond CLmax (the
 *  lift falls to ~55 % over 15 deg, never to zero: forgiving), and the stall's extra drag. */
export function polar(alpha, w, brake = 0, W = FALCON) {
  const a = 2 * Math.PI * w.AR / (w.AR + 2);
  const clMax = w.clMax + W.flare.clMax * brake, aS = clMax / a;
  let cl, cdStall = 0;
  if (alpha <= aS && alpha >= -0.6 * aS) cl = a * alpha;
  else if (alpha > aS) { const k = smooth(alpha, aS, aS + 0.26); cl = clMax * (1 - 0.45 * k); cdStall = 1.1 * Math.sin(alpha - aS) ** 2 + 0.25 * k; }
  else { const k = smooth(-alpha, 0.6 * aS, 0.6 * aS + 0.26); cl = -0.6 * clMax * (1 - 0.45 * k); cdStall = 1.1 * Math.sin(-alpha - 0.6 * aS) ** 2; }
  return { cl, cdStall, a, aS, clMax };
}

export class FlightControls {
  constructor() { this.pitch = 0; this.roll = 0; this.fold = 0; this.flap = 0; this.brake = 0; }
}

/**
 * The falcon. step(dt, controls, air, world):
 *   air.sample(x, y, z, t, out) -> out {x, y, z}: the air's velocity there (wind + gusts + thermals + updrafts)
 *   world.floor(x, z): the highest solid (ground, roof, church), world.ground(x, z): the terrain (optional)
 * After a step: pos, vel (ground), va (air-relative), V (airspeed), gamma, heading, phi, alpha, n (g), lift (m/s
 * of updraft here), stall (0..1), stamina, contact (null or the last collision), wing (the configuration).
 */
export class FalconFlight {
  constructor(params = FALCON) {
    this.P = params;
    this.pos = { x: 0, y: 0, z: 0 }; this.vel = { x: 0, y: 0, z: -14 }; this.va = { x: 0, y: 0, z: -14 };
    this.V = 14; this.gamma = 0; this.heading = 0; this.phi = 0; this.alpha = 0.06; this.n = 1;
    this.fold = 0; this.flapLevel = 0; this.brake = 0; this.stamina = 1; this.stall = 0; this.cl = 0;
    this.mass = params.mass; this.extraMass = 0;     // + the prey
    this.air = { x: 0, y: 0, z: 0 }; this.lift = 0;
    this.contact = null; this.stun = 0; this.t = 0;
    this.forces = { lift: 0, drag: 0, thrust: 0 };
  }

  /** start in free flight: position, heading (rad), airspeed, path angle */
  launch(x, y, z, heading, speed = 14, gamma = 0, air = null) {
    Object.assign(this.pos, { x, y, z });
    this.heading = heading; this.gamma = gamma; this.phi = 0; this.V = speed;
    const c = Math.cos(gamma);
    Object.assign(this.va, { x: -Math.sin(heading) * c * speed, y: Math.sin(gamma) * speed, z: -Math.cos(heading) * c * speed });
    // the ground velocity = the airspeed along the heading + the wind there (the bird starts in balance with the air)
    const w = air ? air.sample(x, y, z, this.t, { x: 0, y: 0, z: 0 }) : { x: 0, y: 0, z: 0 };
    Object.assign(this.vel, { x: this.va.x + w.x, y: this.va.y, z: this.va.z + w.z });
    this.stun = 0; this.contact = null;
  }

  step(dt, C, air, world) {
    // substeps: one per ~8 ms, more at stoop speeds (a 90 m/s bird moves 0.7 m in 8 ms)
    const n = Math.min(8, Math.max(1, Math.ceil(dt / (this.V > 50 ? 0.004 : 0.008))));
    for (let i = 0; i < n; i++) this.sub(dt / n, C, air, world);
  }

  sub(dt, C, air, world) {
    const P = this.P, m = this.mass + this.extraMass, W = m * G;
    this.t += dt;
    if (this.stun > 0) this.stun -= dt;
    const stunned = this.stun > 0;
    // ---- the wings: fold eases (tucking ~0.25 s, opening ~0.35 s); flapping opens them; stunned: spread (recovery)
    const wantFold = stunned ? 0 : C.flap > 0.05 ? Math.min(C.fold, 0.35) : C.fold;
    this.fold = ease(this.fold, wantFold, wantFold > this.fold ? 5 : 3.5, dt);
    this.brake = ease(this.brake, stunned ? 0.3 : C.brake, 5, dt);
    this.flapLevel = ease(this.flapLevel, stunned ? 0 : C.flap, 8, dt);
    const w = wingAt(this.fold, P);
    // ---- the air here, the air-relative velocity
    air.sample(this.pos.x, this.pos.y, this.pos.z, this.t, this.air);
    const vax = this.vel.x - this.air.x, vay = this.vel.y - this.air.y, vaz = this.vel.z - this.air.z;
    const V = Math.max(Math.hypot(vax, vay, vaz), 0.5);
    const ex = vax / V, ey = vay / V, ez = vaz / V;
    const h = Math.hypot(ex, ez);
    if (h > 0.05) this.heading = Math.atan2(-ex, -ez);   // straight down: keep the last heading
    this.gamma = Math.asin(clamp(ey, -1, 1));
    // the lift frame: r = right of the path (horizontal), u0 = up perpendicular to the path, bank phi about it
    const hx = -Math.sin(this.heading), hz = -Math.cos(this.heading);       // horizontal heading
    const rx = -hz, rz = hx;                                                 // right = heading x up (y)
    // u = r x e (perpendicular to the path, toward the bird's back at zero bank)
    let ux = 0 * ez - rz * ey, uy = rz * ex - rx * ez, uz = rx * ey - 0 * ex;
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    // ---- bank: toward the command at the configuration's roll rate; let go = level (a little slower)
    // (the forgiving stall: a stalled bird levels its wings and lowers its nose by itself: no spin, no spiral)
    const phiCmd = stunned ? 0 : clamp(C.roll, -1, 1) * P.bankMax * (1 - 0.75 * this.stall);
    const rate = w.roll * (Math.abs(phiCmd) > Math.abs(this.phi) ? 1 : 0.8) * clamp(V / 10, 0.35, 1);
    this.phi += clamp(phiCmd - this.phi, -rate * dt, rate * dt);
    const cphi = Math.cos(this.phi), sphi = Math.sin(this.phi);
    const lx = ux * cphi + rx * sphi, ly = uy * cphi, lz = uz * cphi + rz * sphi;   // the lift direction
    // ---- the load factor asked for: neutral holds the path (also in the turn), pull / push add / take g
    const cg = Math.cos(this.gamma);
    const hold = cg / Math.max(Math.cos(this.phi), 0.25);
    let u = stunned ? 0.15 : clamp(C.pitch, -1, 1);
    if (this.stall > 0) u = Math.min(u, 0.6 - 1.6 * this.stall);
    if (u < 0 && this.gamma < -1.2) u *= smooth(this.gamma, -1.45, -1.2);   // no outside loop past the vertical dive
    if (u > 0 && this.gamma > 1.2) u *= smooth(-this.gamma, -1.45, -1.2);    // no loop over the top
    // pulling asks for more g the faster the bird goes (the stoop's pull-out uses up to nMax)
    const pullG = P.pull + (P.nMax - 1 - P.pull) * smooth(V, 25, 60);
    let nCmd = hold + (u > 0 ? u * pullG : u * P.push);
    // TRIM: hands off, a bird slower than its configuration's trim speed lowers the nose a little (a trimmed glider
    // settles at its best glide instead of hanging at the stall); faster than trim: the path is held (dives stay dives)
    const vTrim = lerp(P.trim[0], P.trim[1], clamp(this.fold / 0.5, 0, 1)) * (this.fold > 0.75 ? 0 : 1);
    if (V < vTrim) nCmd -= P.trimGain * (vTrim - V) / vTrim * (1 - Math.abs(u)) * cg;
    else if (this.fold < 0.25 && C.flap < 0.05) nCmd += 0.5 * Math.min(1, (V - vTrim) / vTrim) * (1 - Math.abs(u)) * cg * (1 - this.fold / 0.25);   // spread: back toward trim
    // ---- what the wings can give at this airspeed: CL = n W / (q S), up to the stall
    const q = 0.5 * RHO * V * V, qS = q * w.S;
    const pol0 = polar(0, w, this.brake, P);
    const clNeed = nCmd * W / Math.max(qS, 1e-3);
    // the angle of attack that gives it (linear part); past CLmax the alpha keeps growing toward the stall's
    let alpha = clNeed / pol0.a;
    const aLim = pol0.aS + 0.3;                                              // the bird can be pulled into the stall
    alpha = clamp(alpha, -0.6 * pol0.aS - 0.2, aLim);
    // ease alpha (the body pitches at a finite rate: ~8 rad/s)
    this.alpha = ease(this.alpha, alpha, 14, dt);
    const pol = polar(this.alpha, w, this.brake, P);
    let L = pol.cl * qS;
    const Lmax = P.nMax * W;
    if (L > Lmax) L = Lmax; else if (L < -0.5 * Lmax) L = -0.5 * Lmax;     // the bird will not break its wings
    const clEff = L / Math.max(qS, 1e-3);
    this.cl = clEff;
    this.stall = clamp((this.alpha - pol.aS) / 0.2, 0, 1);
    // ---- drag: body + wing profile + induced (k = 1 / (pi e AR)) + the stall + the flare
    const k = 1 / (Math.PI * 0.85 * w.AR);
    const cdW = w.cd0 + k * clEff * clEff + pol.cdStall + P.flare.cd * this.brake * (1 - this.fold);
    const D = q * (P.bodyCDA + cdW * w.S);
    // ---- flapping thrust (along the path), from stamina
    const st = P.stamina;
    const tired = clamp(this.stamina / st.low, 0, 1);
    const T = this.flapLevel * P.thrust * W * clamp(1 - V / P.vFlap, 0, 1) * (0.25 + 0.75 * tired) * (1 - this.fold);
    // flapping at very low airspeed also lifts (a take-off / hover burst), from the same budget
    const Tup = this.flapLevel * W * 0.55 * clamp(1 - V / 9, 0, 1) * tired;
    this.stamina = clamp(this.stamina + (this.flapLevel > 0.1 ? -st.drain * this.flapLevel * (1 + this.extraMass) : st.regen) * dt, 0, 1);
    // ---- acceleration
    const ax = (L * lx - D * ex + T * ex) / m;
    const ay = (L * ly - D * ey + T * ey + Tup) / m - G;
    const az = (L * lz - D * ez + T * ez) / m;
    this.n = L / W;
    this.forces.lift = L; this.forces.drag = D; this.forces.thrust = T;
    this.vel.x += ax * dt; this.vel.y += ay * dt; this.vel.z += az * dt;
    const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    this.V = V; this.lift = this.air.y;
    this.va.x = vax; this.va.y = vay; this.va.z = vaz;
    if (world) this.collide(px, py, pz, world);
    // the leaves: brushing through a crown's soft shell (world.column: the city) slows the bird (a drag that grows with
    // the depth; the dense core is a hit, in collide)
    this.brush = 0;
    if (world?.column) {
      const b = world.column(this.pos.x, this.pos.z, this.pos.y).brush;
      if (b > 0) {
        const k = Math.exp(-P.brushDrag * b * dt);
        this.vel.x *= k; this.vel.y *= k; this.vel.z *= k;
        this.brush = b; this.brushT = this.t;
      }
    }
    if (this.pos.y > 1400) { this.pos.y = 1400; if (this.vel.y > 0) this.vel.y = 0; }
  }

  /**
   * A real collision against the city's solids (world.floor = max(ground, roofs, the church)): the segment of this
   * substep is swept in 0.4 m steps; at the first point under the surface + the bird's radius the velocity's normal
   * part is reflected with a little restitution and the tangential part keeps most of its speed (a glancing hit
   * skims, a head-on hit bounces back). The normal: a WALL (the floor jumps up by more than a metre between two steps:
   * the bird hit a façade, normal = against the motion, horizontal) or a SLOPE (the floor's gradient). A soft, slow,
   * level touch-down is a landing (contact.land = true: the game perches the bird there); a hard one stuns it for a
   * moment (the wings open by themselves, then control comes back).
   * A world with column(x, z, y) (the city: cityStream.js) is a solid AT A HEIGHT: the floor under the bird and a
   * CEILING over it (a bridge's arch, a tree crown's underside), so it can fly under them; rising into a ceiling is a
   * hit from below (normal down). The lab's world (floor only) is a heightfield as before.
   */
  collide(px, py, pz, world) {
    const R = 0.35;
    const dx = this.pos.x - px, dy = this.pos.y - py, dz = this.pos.z - pz;
    const len = Math.hypot(dx, dy, dz);
    const steps = Math.max(1, Math.ceil(len / 0.4));
    const C = world.column ? world : null;
    let prevF, prevC = Infinity;
    if (C) { const c = C.column(px, pz, py); prevF = c.floor; prevC = c.ceil; } else prevF = world.floor(px, pz);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = px + dx * t, y = py + dy * t, z = pz + dz * t;
      let f, ceil = Infinity, hitTree = null, ceilTree = null;
      if (C) { const c = C.column(x, z, y); f = c.floor; ceil = c.ceil; hitTree = c.tree; ceilTree = c.ceilTree ?? null; } else f = world.floor(x, z);
      if (y >= f + R && y <= ceil - R) { prevF = f; prevC = ceil; continue; }
      // contact: which kind?
      const t0 = (s - 1) / steps, x0 = px + dx * t0, z0 = pz + dz * t0, y0 = py + dy * t0;
      let nx, ny, nz, wall = false, under = false;
      if (y >= f + R && ceil < prevC - 1) {
        // a ceiling that came down across the path (flying level into the low side of a crown, an arch's spandrel):
        // the side of a solid, a wall
        const hl = Math.hypot(dx, dz) || 1;
        nx = -dx / hl; ny = 0; nz = -dz / hl; wall = true; hitTree = ceilTree;
        this.pos.x = x0; this.pos.y = y0; this.pos.z = z0;
      } else if (y >= f + R) {
        // a ceiling (an arch, a crown's underside) risen into from below: pushed down under it, normal down
        nx = 0; ny = -1; nz = 0; under = true; hitTree = ceilTree;
        this.pos.x = x; this.pos.z = z; this.pos.y = Math.max(f + R, ceil - R);
      } else
      if (f - prevF > 1.0 && y0 < f + R - 0.05) {
        // a façade: stop at the last free point, normal against the horizontal motion
        const hl = Math.hypot(dx, dz) || 1;
        nx = -dx / hl; ny = 0; nz = -dz / hl; wall = true;
        this.pos.x = x0; this.pos.y = y0; this.pos.z = z0;
      } else {
        const e = 0.8;
        const fl = C ? (a, b) => C.column(a, b, y).floor : (a, b) => world.floor(a, b);
        const gx = (fl(x + e, z) - fl(x - e, z)) / (2 * e), gz = (fl(x, z + e) - fl(x, z - e)) / (2 * e);
        const gl = Math.hypot(gx, 1, gz);
        nx = -gx / gl; ny = 1 / gl; nz = -gz / gl;
        if (ny < 0.35) { const hl = Math.hypot(nx, nz) || 1; nx /= hl; nz /= hl; ny = 0; wall = true; this.pos.x = x0; this.pos.z = z0; this.pos.y = Math.max(y0, y); }
        else { this.pos.x = x; this.pos.z = z; this.pos.y = f + R; }
      }
      const vn = this.vel.x * nx + this.vel.y * ny + this.vel.z * nz;
      const speed = Math.hypot(this.vel.x, this.vel.y, this.vel.z);
      const land = !wall && !under && ny > 0.85 && -vn < 4.5 && speed < 13;
      if (vn < 0) {
        const rest = land ? 0 : 0.3, fric = land ? 0.5 : wall ? 0.55 : 0.8;
        // tangential part kept (scaled), normal part reflected
        const tx = this.vel.x - vn * nx, ty = this.vel.y - vn * ny, tz = this.vel.z - vn * nz;
        this.vel.x = tx * fric - rest * vn * nx; this.vel.y = ty * fric - rest * vn * ny; this.vel.z = tz * fric - rest * vn * nz;
        // a minimum bounce off a façade so the bird is not left pressed against it
        if (wall) { const out = Math.max(2.5, -vn * 0.3); this.vel.x += nx * out; this.vel.z += nz * out; this.vel.y = Math.max(this.vel.y, 1.5); }
      }
      const hard = -vn > 9 || (wall && -vn > 6);
      if (hard) { this.stun = 0.9; this.stamina = Math.max(0, this.stamina - 0.15); }
      this.contact = { t: this.t, x: this.pos.x, y: this.pos.y, z: this.pos.z, nx, ny, nz, vn: -vn, speed, wall, land, hard, under, tree: hitTree };
      return;
    }
  }
}
