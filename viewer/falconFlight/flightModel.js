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
/** ?falconhit=old: the falcon's contact response before collisions round 2 (normal against the motion on every wall,
 *  fixed tangential factors, touch-down under 13 m/s) */
const TRIM_OLD = typeof location !== "undefined" && /[?&]falcontrim=old(&|$)/.test(location.search);
const FALCON_HIT_OLD = typeof location !== "undefined" && /[?&]falconhit=old(&|$)/.test(location.search);
/** ?falconcol=old: the contact response of collisions round 2 (falconfix, 2026-11-16, is round 3: see collide()) */
const COL_OLD = FALCON_HIT_OLD || (typeof location !== "undefined" && /[?&]falconcol=old(&|$)/.test(location.search));

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
    this.assisted = false;         // flown by flightAssist.js: no hands-off trims (the assist holds the path), cheap light beats
    this.r3 = !COL_OLD;            // collisions round 3 (falconfix)
    this.noLand = 0;               // s: no touch-down (just took off)
    this.forces = { lift: 0, drag: 0, thrust: 0 };
    // FALCON FUN (claude/falconfun, docs/rules/falcon-catch-fun.md; ?falconfun=old = null): the game's arcade feel, set
    // by falconGame.js. null = the pure model (the lab, the old game). { dive, diveDrag, sprint, sprintV }: see sub()
    this.arcade = null;
    this.sprint = 0;               // s left of a flap sprint (falconGame.js starts it; arcade only)
    this.boostA = 0;               // m/s^2: the arcade push along the path this substep (dive boost + sprint), for the HUD
    this.chaseA = 0;               // m/s^2: the auto-dive's pursuit push (falconGame.js, set every frame; arcade only)
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
    if (this.noLand > 0) this.noLand -= dt;
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
    // (round 3: stunned = no pull: the old 0.15 asked up to +0.9 g at speed, so a bird that hit the ground or a wall
    // climbed away from it during the "stun": the "falls, then shoots up" of the owner's playtest)
    let u = stunned ? (this.r3 ? 0 : 0.15) : clamp(C.pitch, -1, 1);
    if (this.stall > 0) u = Math.min(u, 0.6 - 1.6 * this.stall);
    if (u < 0 && this.gamma < -1.2) u *= smooth(this.gamma, -1.45, -1.2);   // no outside loop past the vertical dive
    if (u > 0 && this.gamma > 1.2) u *= smooth(-this.gamma, -1.45, -1.2);    // no loop over the top
    // pulling asks for more g the faster the bird goes (the stoop's pull-out uses up to nMax)
    const pullG = P.pull + (P.nMax - 1 - P.pull) * smooth(V, 25, 60);
    let nCmd = hold + (u > 0 ? u * pullG : u * P.push);
    if (stunned && this.r3) nCmd = 0.6 * hold;                             // the tumble: a short sink, no lift surge
    const trims = !this.assisted && !(stunned && this.r3);
    // TRIM: hands off, a bird slower than its configuration's trim speed lowers the nose a little (a trimmed glider
    // settles at its best glide instead of hanging at the stall); faster than trim: the path is held (dives stay dives)
    const vTrim = lerp(P.trim[0], P.trim[1], clamp(this.fold / 0.5, 0, 1)) * (this.fold > 0.75 ? 0 : 1);
    if (trims && V < vTrim) nCmd -= P.trimGain * (vTrim - V) / vTrim * (1 - Math.abs(u)) * cg;
    else if (trims && this.fold < 0.25 && C.flap < 0.05) nCmd += 0.5 * Math.min(1, (V - vTrim) / vTrim) * (1 - Math.abs(u)) * cg * (1 - this.fold / 0.25);   // spread: back toward trim
    // PATH TRIM (collisions round 2, ?falcontrim=old = the pure path hold): hands off, the held path angle relaxes to
    // the configuration's glide angle (spread ~ -4 deg at L/D 14.5, half folded ~ -7.5 deg), time constant ~1 s, as a
    // statically stable glider / a bird that is not being steered does. Before, neutral held ANY angle forever: the
    // nest launch at -11 deg went on into the roofs hands-off ("hit the ground at 11 m/s: stunned" seconds after the
    // intro), a dive released at -40 deg stayed a -40 deg dive. The tuck keeps its dive (no trim, as before); a turn
    // keeps its bank (only the path's climb / dive angle is trimmed).
    if (!TRIM_OLD && trims && !stunned && this.fold < 0.75 && C.flap < 0.05) {
      const gTrim = -Math.atan(1 / lerp(14.5, 7.6, clamp(this.fold / 0.5, 0, 1)));
      nCmd += 1.2 * clamp(gTrim - this.gamma, -0.6, 0.6) * (1 - Math.abs(u)) * (1 - this.fold / 0.75);
    }
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
    let D = q * (P.bodyCDA + cdW * w.S);
    // ---- FALCON FUN, the arcade stoop and sprint (this.arcade, null in the lab / ?falconfun=old): a real 50 m stoop
    // ends at ~90 km/h and 200 m of drop are needed for 140 km/h, so over the city's roofs the player never felt the
    // speed (owner playtest 2026-11-24: "I was only doing like 70 km/h max"). A tucked bird going DOWN gets a push along
    // its path of `dive` x g x sin(dive angle) (gravity's own share along a steep path, scaled up) and `diveDrag` of its
    // drag taken off (both grow with the tuck): a 50 m stoop reaches ~150 km/h, 150 m ~250 km/h (tools/falconFunTest.mjs).
    // The sprint: a few strong beats in level flight (`sprint` g along the path, fading to 0 at `sprintV` m/s).
    let Tb = 0;
    const AR = this.arcade;
    if (AR && !stunned) {
      const tuck = smooth(this.fold, 0.55, 1), down = Math.max(0, -ey);
      Tb = AR.dive * W * down * tuck;
      D *= 1 - AR.diveDrag * tuck * Math.min(1, down * 1.6);
      if (this.sprint > 0) { this.sprint -= dt; Tb += AR.sprint * W * clamp(1 - V / AR.sprintV, 0, 1); }
      Tb += this.chaseA * m;
    }
    this.boostA = Tb / m;
    // ---- flapping thrust (along the path), from stamina
    const st = P.stamina;
    const tired = clamp(this.stamina / st.low, 0, 1);
    const T = this.flapLevel * P.thrust * W * clamp(1 - V / P.vFlap, 0, 1) * (0.25 + 0.75 * tired) * (1 - this.fold);
    // flapping at very low airspeed also lifts (a take-off / hover burst), from the same budget
    const Tup = this.flapLevel * W * 0.55 * clamp(1 - V / 9, 0, 1) * tired;
    // (assisted: light cruise beats cost little, as a flap-gliding bird's; full beats cost as before: the regain falls
    // with the beat level, the drain grows with its square)
    if (this.assisted) this.stamina = clamp(this.stamina + (st.regen * (1 - this.flapLevel) - st.drain * this.flapLevel * this.flapLevel * (1 + this.extraMass)) * dt, 0, 1);
    else this.stamina = clamp(this.stamina + (this.flapLevel > 0.1 ? -st.drain * this.flapLevel * (1 + this.extraMass) : st.regen) * dt, 0, 1);
    // ---- acceleration
    const ax = (L * lx - D * ex + (T + Tb) * ex) / m;
    const ay = (L * ly - D * ey + (T + Tb) * ey + Tup) / m - G;
    const az = (L * lz - D * ez + (T + Tb) * ez) / m;
    this.n = L / W;
    this.forces.lift = L; this.forces.drag = D; this.forces.thrust = T;
    this.vel.x += ax * dt; this.vel.y += ay * dt; this.vel.z += az * dt;
    const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    this.V = V; this.lift = this.air.y;
    this.va.x = vax; this.va.y = vay; this.va.z = vaz;
    if (world) { if (this.r3) this.collide3(px, py, pz, world, dt); else this.collide(px, py, pz, world); }
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
      // collisions round 2 (?falconhit=old = before): a wall's REAL normal (the solid round the hit point at the bird's
      // height), not "against the motion": a glancing touch of a façade / crown side then slides along it instead of
      // stopping the bird dead (and stunning it above 6 m/s, whatever the angle)
      if (!FALCON_HIT_OLD && wall) {
        const w = this._wallN(x0, y0, z0, dx, dz, world);
        // (falcon game round 1, 2026-11-15: only when that normal opposes the velocity; else the bird, held at the last
        // free point every substep with no normal speed to reflect, stayed PINNED there flying at 10+ m/s: seen
        // squeezed between the setts and a low crown on the Place, and against thin walls by the church)
        if (w && this.vel.x * w[0] + this.vel.z * w[1] < -0.3) { nx = w[0]; nz = w[1]; ny = 0; }
      }
      const vn = this.vel.x * nx + this.vel.y * ny + this.vel.z * nz;
      // (falcon game round 1: already moving OUT of a wall contact (an edge the bird sits a few cm inside, a roof's
      // rim): set on top of the solid here, so the next substep is free; before it was held at the same point forever)
      if (!FALCON_HIT_OLD && wall && vn > -0.05) {
        const fh = C ? C.column(this.pos.x, this.pos.z, this.pos.y).floor : world.floor(this.pos.x, this.pos.z);
        if (this.pos.y < fh + R + 0.02) this.pos.y = fh + R + 0.02;
      }
      const speed = Math.hypot(this.vel.x, this.vel.y, this.vel.z);
      if (!FALCON_HIT_OLD) { this._respond(nx, ny, nz, vn, speed, wall, under, hitTree); return; }
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

  /**
   * COLLISIONS ROUND 3 (falconfix, 2026-11-16; ?falconcol=old = round 2 above). The owner: "too many issues with
   * collision, it goes up after falling down". Found:
   *   - the stun asked for +0.15 pull (up to +0.9 g at speed): a bird that hit something climbed away during the stun
   *     (fixed in sub(): no pull, a short sink);
   *   - a hard wall hit added 1.5 m/s UP, a floor hit bounced with 30 % restitution, and a slope (a pitched roof, a
   *     crown's shoulder) turned the whole tangential speed upward: a bird skimming into a roof was thrown over it;
   *   - a contact could set the bird ON TOP of a solid it met from the side when the floor jumped by under 1 m between
   *     two sweep points (a crown's rim, a dormer), and the "moving out of a wall" fix of round 1 set it on top of
   *     whatever it was beside: pops of up to several metres;
   *   - a bird starting a substep inside the solid (a roof tile streamed in under it, a pop) was held at the "last free
   *     point" inside it, and a bird sliding along a bent facade could stay pinned at the same point.
   * Now: the same 0.4 m sweep through the solid AT THE BIRD'S HEIGHT (column), but
   *   - a TOP surface only when it is at most 0.6 m above the last free point (else it is the side of the solid: a wall);
   *     never lifted more than that;
   *   - no bounce off a top (restitution 0), 0.15 off a wall + a 0.6 m/s push-out, the tangential speed kept minus a
   *     Coulomb scrape (slides along facades and roofs), and the vertical speed after any contact at most what it was
   *     (+1 m/s up a top's slope): a contact never launches the bird upward;
   *   - landing: a top within 37 deg of level, under 6 m/s into it, slower than 9 m/s (12 flaring); none for 0.6 s after
   *     a take-off;
   *   - a crash (into a top > 9 m/s, a wall > 7, a ceiling > 6): a 0.7 s tumble (wings open, no control, a short sink;
   *     the assist recovers after it);
   *   - inside the solid at the start of a substep, or 0.3 s on walls without getting free: out to the nearest free
   *     point (8 directions x 3 distances, then up), the velocity turned that way.
   */
  collide3(px, py, pz, world, dt) {
    const R = 0.35, C = world.column ? world : null;
    let f0, c0 = Infinity;
    if (C) { const c = C.column(px, pz, py); f0 = c.floor; c0 = c.ceil; } else f0 = world.floor(px, pz);
    if (py < f0 + R - 0.05 && py <= c0 - R) {
      // started inside: a shallow one is stepped up, a deep one is moved out sideways
      if (f0 + R - py < 0.6) { this.pos.y = Math.max(this.pos.y, f0 + R); if (this.vel.y < 0) this.vel.y = 0; return; }
      this._getOut(px, py, pz, world);
      return;
    }
    const dx = this.pos.x - px, dy = this.pos.y - py, dz = this.pos.z - pz;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.4));
    let prevC = c0;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, x = px + dx * t, y = py + dy * t, z = pz + dz * t;
      let f, ceil = Infinity, tree = null, ceilTree = null;
      if (C) { const c = C.column(x, z, y); f = c.floor; ceil = c.ceil; tree = c.tree; ceilTree = c.ceilTree ?? null; } else f = world.floor(x, z);
      if (y >= f + R && y <= ceil - R) { prevC = ceil; continue; }
      const t0 = (s - 1) / steps, x0 = px + dx * t0, y0 = py + dy * t0, z0 = pz + dz * t0;
      let nx = 0, ny = 1, nz = 0, kind = "top";
      if (y >= f + R) {
        if (ceil < prevC - 1) { kind = "wall"; tree = ceilTree; this.pos.x = x0; this.pos.y = y0; this.pos.z = z0; }
        else { kind = "under"; ny = -1; tree = ceilTree; this.pos.x = x; this.pos.z = z; this.pos.y = Math.max(f + R, Math.min(y, ceil - R)); }
      } else if (f + R - y0 > 0.6) {
        kind = "wall"; this.pos.x = x0; this.pos.y = y0; this.pos.z = z0;
      } else {
        const e = 0.8;
        const gx = (this._fl(world, x + e, z, y) - this._fl(world, x - e, z, y)) / (2 * e);
        const gz = (this._fl(world, x, z + e, y) - this._fl(world, x, z - e, y)) / (2 * e);
        const gl = Math.hypot(gx, 1, gz);
        nx = -gx / gl; ny = 1 / gl; nz = -gz / gl;
        if (ny < 0.35) { kind = "wall"; this.pos.x = x0; this.pos.y = y0; this.pos.z = z0; }
        else { this.pos.x = x; this.pos.z = z; this.pos.y = f + R; }
      }
      if (kind === "wall") {
        const hl = Math.hypot(dx, dz) || 1;
        nx = -dx / hl; ny = 0; nz = -dz / hl;
        const w = this._wallN(x0, y0, z0, dx, dz, world);
        if (w && this.vel.x * w[0] + this.vel.z * w[1] < -0.3) { nx = w[0]; nz = w[1]; }
        // (a tiny step out along the normal: the next sweep starts free)
        this.pos.x += nx * 0.03; this.pos.z += nz * 0.03;
      }
      this.wallT = kind === "top" ? 0 : (this.wallT || 0) + dt;
      this._respond3(nx, ny, nz, kind, tree);
      if (this.wallT > 0.3) { this.wallT = 0; this._getOut(this.pos.x, this.pos.y, this.pos.z, world); }
      return;
    }
    this.wallT = 0;
  }
  _fl(world, x, z, y) { return world.column ? world.column(x, z, y).floor : world.floor(x, z); }
  _free(world, x, z, y) {
    const R = 0.35;
    if (world.column) { const c = world.column(x, z, y); return y >= c.floor + R + 0.05 && y <= c.ceil - R - 0.05; }
    return y >= world.floor(x, z) + R + 0.05;
  }
  /** out of the solid: the nearest free point round (x, y, z) (8 directions x 0.8 / 1.6 / 2.8 m at the bird's height, then
   *  1 / 2.5 / 5 m up), the velocity turned along that way (a third of its speed lost) */
  _getOut(x, y, z, world) {
    let bx = 0, bz = 0, by = 0, found = false;
    for (let di = 0; di < 3 && !found; di++) {
      const d = di === 0 ? 0.8 : di === 1 ? 1.6 : 2.8;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, qx = x + Math.cos(a) * d, qz = z + Math.sin(a) * d;
        if (this._free(world, qx, qz, y)) { bx = qx - x; bz = qz - z; found = true; break; }
      }
    }
    for (let ui = 0; ui < 3 && !found; ui++) { const u = ui === 0 ? 1 : ui === 1 ? 2.5 : 5; if (this._free(world, x, z, y + u)) { by = u; found = true; } }
    if (!found) { by = Math.max(0, this._fl(world, x, z, y + 60) + 0.4 - y); }
    this.pos.x = x + bx; this.pos.y = y + by; this.pos.z = z + bz;
    const v = this.vel, sp = Math.hypot(v.x, v.y, v.z) * 0.66, L = Math.hypot(bx, by, bz);
    if (L > 1e-3) {
      const ux = bx / L, uy = by / L, uz = bz / L, vn = v.x * ux + v.y * uy + v.z * uz;
      // the part of the velocity into the solid removed, then a little speed out
      if (vn < 0) { v.x -= vn * ux; v.y -= vn * uy; v.z -= vn * uz; }
      v.x += ux * 1.0; v.z += uz * 1.0;
      const k = Math.min(1, sp / (Math.hypot(v.x, v.y, v.z) || 1)); v.x *= k; v.y *= k; v.z *= k;
      if (v.y > 1) v.y = 1;
    }
    this._setContact(0, 1, 0, 0, sp, true, false, false, false, null, true);
  }
  /** round 3's contact record: one object reused (a bird sliding on a roof touches it every substep) */
  _setContact(nx, ny, nz, vn, speed, wall, land, hard, under, tree, out = false) {
    const c = (this._c ??= {});
    c.t = this.t; c.x = this.pos.x; c.y = this.pos.y; c.z = this.pos.z; c.nx = nx; c.ny = ny; c.nz = nz; c.vn = vn; c.speed = speed;
    c.wall = wall; c.land = land; c.hard = hard; c.under = under; c.tree = tree; c.out = out;
    this.contact = c;
  }
  _respond3(nx, ny, nz, kind, tree) {
    const v = this.vel, vyB = v.y, wall = kind === "wall", under = kind === "under", top = kind === "top";
    const vn = v.x * nx + v.y * ny + v.z * nz, speed = Math.hypot(v.x, v.y, v.z);
    const land = top && ny > 0.8 && this.noLand <= 0 && -vn < 6 && (speed < 9 || (this.brake > 0.3 && speed < 12));
    if (vn < 0) {
      const rest = top ? 0 : wall ? 0.15 : 0.1, mu = land ? 0.8 : wall ? 0.3 : 0.25;
      const tx = v.x - vn * nx, ty = v.y - vn * ny, tz = v.z - vn * nz, tl = Math.hypot(tx, ty, tz);
      const k = land ? 0.5 : tl > 1e-6 ? Math.max(0, tl - mu * -vn) / tl : 0;
      v.x = tx * k - rest * vn * nx; v.y = ty * k - rest * vn * ny; v.z = tz * k - rest * vn * nz;
      if (wall) { v.x += nx * 0.6; v.z += nz * 0.6; }
    }
    // a contact never launches the bird upward
    const vyMax = Math.max(vyB, 0) + (top ? 1 : 0);
    if (v.y > vyMax) v.y = vyMax;
    const hard = top ? -vn > 9 : wall ? -vn > 7 : -vn > 6;
    if (hard) { this.stun = 0.7; this.stamina = Math.max(0, this.stamina - 0.1); }
    // (several substeps a frame: the frame reports its hardest contact, or a landing; the game clears it each frame)
    const c = this.contact;
    if (c && c.t > this.t - 0.06 && !land && (c.hard || c.vn > -vn)) return;
    this._setContact(nx, ny, nz, -vn, speed, wall, land, hard, under, tree);
  }

  /** the horizontal outward normal of the solid round (x, y, z): the directions (8, at 0.7 and 1.5 m) where the bird's
   *  sphere would be inside the solid, averaged and reversed; null when nothing is found (a thin solid: the caller keeps
   *  the against-the-motion normal) */
  _wallN(x, y, z, dx, dz, world) {
    const R = 0.35, C = world.column ? world : null;
    let sx = 0, sz = 0;
    for (const d of [0.7, 1.5]) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, ux = Math.cos(a), uz = Math.sin(a), qx = x + ux * d, qz = z + uz * d;
      let solid;
      if (C) { const c = C.column(qx, qz, y); solid = y < c.floor + R || y > c.ceil - R; } else solid = y < world.floor(qx, qz) + R;
      if (solid) { const wgt = d < 1 ? 1.5 : 1; sx += ux * wgt; sz += uz * wgt; }
    }
    const L = Math.hypot(sx, sz);
    if (L < 0.5) return null;
    let nx = -sx / L, nz = -sz / L;
    // it must face the motion (the bird ran into it)
    const hl = Math.hypot(dx, dz) || 1;
    if ((nx * dx + nz * dz) / hl > 0.2) return null;
    return [nx, nz];
  }

  /** the contact response (collisions round 2): the normal part of the velocity reflected with a little restitution,
   *  the tangential part kept minus a Coulomb scrape (mu x the normal speed, as a rigid body sliding; before: a fixed
   *  x0.55 / x0.8 per contact, so skimming a roof or a façade bled 20-45 % of the speed EVERY 8 ms substep); a small
   *  push off a wall (0.6 m/s, before 2.5 m/s + 1.5 m/s up: a glancing touch kicked the bird away); a touch-down only
   *  when it is really landing (slow: under 7 m/s, or flaring under 10), not any gentle contact under 13 m/s (the
   *  bird used to "perch" whenever it skimmed a roof). */
  _respond(nx, ny, nz, vn, speed, wall, under, hitTree) {
    const v = this.vel;
    const land = !wall && !under && ny > 0.85 && -vn < 3.5 && (speed < 7 || (this.brake > 0.3 && speed < 10));
    if (vn < 0) {
      const rest = land ? 0 : -vn > 4 ? 0.3 : 0.1, mu = land ? 0.8 : wall ? 0.35 : 0.3;
      const tx = v.x - vn * nx, ty = v.y - vn * ny, tz = v.z - vn * nz, tl = Math.hypot(tx, ty, tz);
      const k = land ? 0.5 : tl > 1e-6 ? Math.max(0, tl - mu * -vn) / tl : 0;
      v.x = tx * k - rest * vn * nx; v.y = ty * k - rest * vn * ny; v.z = tz * k - rest * vn * nz;
      if (wall) { v.x += nx * 0.6; v.z += nz * 0.6; }
    }
    const hard = -vn > 9 || (wall && -vn > 6);
    if (hard) { this.stun = 0.9; this.stamina = Math.max(0, this.stamina - 0.15); if (wall) v.y = Math.max(v.y, 1.5); }
    this.contact = { t: this.t, x: this.pos.x, y: this.pos.y, z: this.pos.z, nx, ny, nz, vn: -vn, speed, wall, land, hard, under, tree: hitTree };
  }
}
