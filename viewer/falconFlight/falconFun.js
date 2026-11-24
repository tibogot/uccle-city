// FALCON FUN (claude/falconfun, 2026-11-24; rule docs/rules/falcon-catch-fun.md; ?falconfun=old = the game before).
// The owner's playtest: "why I can't catch pigeons, it seems too hard and not funny enough"; "I was only doing like 70
// km/h max". A catch needed the talons within ~2 m, a closing speed over 8 m/s, an approach within 35 deg and F in a
// 0.45 s window, with a pigeon that jinked unannounced at 7 m; the real stoop needs 200 m of drop for 140 km/h. Now:
//   LOCK-ON     the pigeon nearest the view centre (a 0.5 rad cone, 230 m) is locked (a soft ring); holding the strike
//               button (F / gamepad X / touch STRIKE, or Shift with a lock) = AUTO-DIVE: the falcon steers itself onto
//               the lead point (ramping in over ~0.4 s, A / D and W / S still nudge it), tucks when it is steep, and the
//               ground guard pulls out so it bottoms AT the prey (a swoop through it, never into the roof)
//   CATCH       anything within 5.5 m of the talons is grabbed automatically; speed and angle are BONUS points
//               (PERFECT STOOP x2, HEAD-ON +5, RACER x2, COMBO), never a miss. A short slow motion just before contact,
//               then the hit-stop
//   SPEED       an arcade stoop (flightModel.js arcade: 50 m of drop ~150 km/h, 150 m ~250 km/h), a 9 g pull-out, a flap
//               SPRINT (a quick tap of Space / gamepad RB: ~1 s of hard beats, 16 % stamina); the camera's FOV, the air
//               streaks and the wind come in earlier (falconCamera.js / falconAudio.js FUN tables)
//   PIGEONS     easy ones feeding (late to flush, slow off the ground), rarer fast racers (bonus), a dodge warned 0.3 s
//               before (big wingbeats + the ring flashing), tired after two escapes; a miss is soft (they flutter on)
//   GOALS       an arrow to the nearest pigeons, combos (a catch within 30 s of the last), a run "catch 5 in 2:00";
//               delivering to the eyrie is a bonus, hunting goes on with prey in the talons
//   FIRST CATCH a tame pigeon on a roof right below the eyrie's launch, with the hint "hold Shift to dive onto it"
// Pure JS (no three), no allocation per frame. Tested headless: tools/falconFunTest.mjs (gate row falconfun).

export const FUN_OLD = typeof location !== "undefined" && /[?&]falconfun=old(&|$)/.test(location.search);

export const FUN = {
  // flightModel.js arcade: the dive push (x g x sin(dive)), the drag taken off a tucked dive, the sprint (g, fading to
  // 0 at sprintV); flightAssist.js: the ground guard's pull-out (g), its lag (s) and margin (m)
  arcade: { dive: 2.2, diveDrag: 0.6, sprint: 0.65, sprintV: 34, guardG: 6, guardMargin: 4, guardLag: 0.4 },
  nMax: 9,                 // g: the arcade pull-out (the lab's juvenile: 7)
  sprintT: 1.1, sprintCost: 0.16, sprintMin: 0.2,
  lockRange: 230, lockCone: 0.5, keepCone: 1.0, viewDown: 0.12,
  reach: 5.5,              // m: the automatic grab
  ramp: 0.35,              // s: the auto-dive's time constant
  nudge: 0.35,             // rad: what A / D (W / S: half) still add to the auto-dive's aim
  chase: 24,               // m/s: the flapping speed in a level auto-dive
  chaseA: 4.5,             // m/s^2: at most, the auto-dive's pursuit push (flightModel.js chaseA)
  homeD: 14, home: 2.4,    // the homing: within 14 m of the locked bird, the path turned onto it at up to 2.4 rad/s
  tiredUp: 0.12,           // stamina under which the auto-dive does not climb at a bird
  catchStamina: 0.25,      // stamina back with each catch
  cool: 2.5,               // s after a catch before the next lock (the prey taken, the next bird picked)
  giveUp: 6,               // s held without getting closer: the lock lets that bird go (8 s skipped)
  slow: { tti: 0.3, scale: 0.35, max: 0.45 },   // the slow motion before contact: under 0.3 s to go, x0.35, at most 0.45 s a target
  combo: 30,               // s between catches for a combo
  run: { goal: 5, T: 120, bonus: 100 },
  carryMass: 0.1,          // kg in the talons (the old game: 0.33, and no hunting until delivered)
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** the square flock behind a prey index: the PreyMux (hunt.js: indices < 256 its .flock) or a Pigeons */
export function flockOf(P, i) {
  if (!P) return null;
  if (P.p && P.kind) return i < P.max ? P : null;
  if (P.flock && i < 256) return P.flock.kind ? P.flock : null;
  return null;
}

export class FunState {
  constructor() {
    this.w = 0;                  // the auto-dive's weight (0..1, eased)
    this.diving = false;         // the strike button held with a lock
    this.held = false;
    this.lock = -1;              // the locked prey index (= game.target)
    this.slowK = 1; this.slowUsed = 0; this.slowFor = -1;
    this.cool = 0; this.floorY = 0;
    this.bestD = Infinity; this.bestT = 0; this.skipUntil = 0; this.skipFlock = null;
    this.combo = 0; this.lastCatchT = -1e9;
    this.run = { t0: -1, n: 0, best: Infinity, done: 0 };
    this.arrow = { on: false, x: 0, y: 0, z: 0, d: 0 };
    this.arrowT = 0;
    this.starter = null;         // { i, flock } the tame first pigeon
    this.hint = "";
    this.last = null;            // the last catch's bonus card { pts, labels: [], kmh, kind }
    this.labels = [];
    this.view = { x: 0, y: 0, z: -1 };
    this.ov = { psi: 0, gamma: 0, floorY: null, clr: 1 };
    this.I = { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null };
  }

  /** the points of a catch: base 10 + km/h / 6 (as the kit's onCatch), x2 a perfect stoop (>= 30 m/s, diving > 17 deg),
   *  +5 head-on (within 15 deg), x2 a racer, x(1 + 0.5 (combo - 1)) */
  score(V, gamma, angle, kind, t) {
    const kmh = V * 3.6, L = this.labels;
    L.length = 0;
    this.combo = t - this.lastCatchT < FUN.combo ? this.combo + 1 : 1;
    this.lastCatchT = t;
    let mult = 1, add = 0;
    if (V >= 30 && gamma < -0.3) { mult *= 2; L.push("PERFECT STOOP x2"); }
    else if (V >= 22) L.push("FAST");
    if (angle < 0.26) { add += 5; L.push("HEAD-ON +5"); }
    if (kind === "racer") { mult *= 2; L.push("RACER x2"); }
    if (this.combo >= 2) { const k = Math.min(3, 1 + 0.5 * (this.combo - 1)); mult *= k; L.push(`COMBO ${this.combo} x${k}`); }
    const pts = Math.round((10 + kmh / 6) * mult + add);
    this.last = { pts, kmh: Math.round(kmh), kind, labels: L.slice(), combo: this.combo, t };
    return pts;
  }

  /** the run goal: catch FUN.run.goal in FUN.run.T s; returns a line to say, or "" */
  runTick(t, caught) {
    const R = this.run, G = FUN.run;
    if (R.t0 < 0) { R.t0 = t; R.n = 0; }
    if (caught) {
      R.n++;
      if (R.n >= G.goal) {
        const dt = t - R.t0; R.best = Math.min(R.best, dt); R.done++;
        R.t0 = t; R.n = 0;
        return `RUN COMPLETE: ${G.goal} in ${fmt(dt)}! +${G.bonus} · a new run`;
      }
      return "";
    }
    if (t - R.t0 > G.T) { const n = R.n; R.t0 = t; R.n = 0; return `time: ${n} / ${G.goal} in ${fmt(G.T)}. A new run: catch ${G.goal} in ${fmt(G.T)}`; }
    return "";
  }
  /** the run's HUD line */
  runLine(t) {
    const R = this.run, G = FUN.run;
    if (R.t0 < 0) return `Catch ${G.goal} in ${fmt(G.T)}`;
    return `Catch ${G.goal} in ${fmt(G.T)} · ${R.n} / ${G.goal} · ${fmt(Math.max(0, G.T - (t - R.t0)))} left`;
  }

  /** the arrow: the nearest pigeon of the hunted flock (not gone), every 0.25 s */
  arrowTick(dt, P, f) {
    if ((this.arrowT -= dt) > 0) return;
    this.arrowT = 0.25;
    const A = this.arrow, F = P ? (P.p && P.kind ? P : P.flock?.kind ? P.flock : null) : null;
    A.on = false;
    if (!F) return;
    let bd = Infinity;
    for (let i = 0; i < F.max; i++) {
      if (F.state[i] === 3 || i === F.skipI) continue;
      const o = i * 3, d = Math.hypot(F.p[o] - f.pos.x, F.p[o + 1] - f.pos.y, F.p[o + 2] - f.pos.z);
      if (d < bd) { bd = d; A.x = F.p[o]; A.y = F.p[o + 1]; A.z = F.p[o + 2]; }
    }
    if (bd < Infinity) { A.on = true; A.d = bd; }
  }

  /** the view direction: cam = the camera's forward (a unit vector, the city), else the assisted camera's (along the heading, the path damped, a
   *  little down) or the mouse aim */
  viewDir(cam, f, aim) {
    const v = this.view;
    if (cam) { v.x = cam.x; v.y = cam.y; v.z = cam.z; }
    else {
      const yaw = aim ? aim.yaw : f.heading, pt = aim ? aim.pitch : clamp(f.gamma * (f.fold > 0.7 ? 0.8 : 0.55), -1.2, 0.35) - 0.05;
      const cp = Math.cos(pt); v.x = -Math.sin(yaw) * cp; v.y = Math.sin(pt); v.z = -Math.cos(yaw) * cp;
    }
    // a little down: the prey is mostly below
    const c = Math.cos(FUN.viewDown), s = Math.sin(FUN.viewDown), h = Math.hypot(v.x, v.z) || 1e-6;
    const ny = v.y * c - h * s, nh = h * c + v.y * s;
    v.x *= nh / h; v.z *= nh / h; v.y = ny;
    return v;
  }

  /** the auto-dive: fills ov (the assist's override: heading, path angle, the swoop's floor) and the intent copy I;
   *  T / U the prey's position / velocity, floorY the solid under it, I0 the player's intent */
  dive(dt, f, T, U, floorY, I0, perched, lineMax = -Infinity, lineD = 0, under = -Infinity) {
    const I = this.I, ov = this.ov;
    Object.assign(I, I0);
    this.w += (1 - this.w) * (1 - Math.exp(-dt / FUN.ramp));
    const dx0 = T.x - f.pos.x, dy0 = T.y - f.pos.y, dz0 = T.z - f.pos.z, d = Math.hypot(dx0, dy0, dz0);
    const rvx = f.vel.x - U.x, rvy = f.vel.y - U.y, rvz = f.vel.z - U.z;
    const closing = (rvx * dx0 + rvy * dy0 + rvz * dz0) / Math.max(d, 0.1);
    const tti = clamp(d / Math.max(closing, 8), 0, 2.5);
    // the lead point (the prey's velocity x the time to go), a little over a bird near a solid (the talons reach down)
    const lx = T.x + U.x * tti * 0.9, lz = T.z + U.z * tti * 0.9;
    let ly = T.y + U.y * tti * 0.9;
    const low = perched || ly - floorY < 3;
    if (low) ly = Math.max(ly + 2.0, floorY + 2.5);           // (over it: the 5.5 m reach takes it from 2-3 m up)
    const dx = lx - f.pos.x, dy = ly - f.pos.y, dz = lz - f.pos.z, hd = Math.hypot(dx, dz);
    const psiT = Math.atan2(-dx, -dz), gT = Math.atan2(dy, Math.max(hd, 0.5));
    const w = this.w;
    ov.psi = f.heading + w * wrap(psiT - f.heading) + (I0.turn || 0) * FUN.nudge * (1 - 0.5 * w);
    let gW = gT;
    // the bird behind or well to the side: turn first, then dive (a descending turn over the roofs ended in them)
    const vh = Math.hypot(f.vel.x, f.vel.z) || 1, ch = (f.vel.x * dx + f.vel.z * dz) / (vh * Math.max(hd, 0.5));
    if (ch < 0.5 && hd > 8) gW = Math.max(gW, -0.05);
    // (and low after a pass: climb out of the street first, the walls round a square are 8-12 m)
    if (ch < 0.5 && f.pos.y - under < 12) gW = Math.max(gW, 0.3);
    // the highest solid on the way (lineMax at lineD m): stay 3 m over it until past it
    if (lineMax > -Infinity && f.pos.y < lineMax + 6) gW = Math.max(gW, Math.atan2(lineMax + 3 - f.pos.y, Math.max(lineD, 4)));
    ov.gamma = clamp(f.gamma + w * (gW - f.gamma) + (I0.vert || 0) * FUN.nudge * 0.5, -1.45, 0.6);
    // the swoop's floor (flightAssist.js guard): the pull-out bottoms at the aim's height, never under the solid + 1.5 m
    // (nor under the line's highest solid + 2 m while it is ahead)
    ov.floorY = Math.max(ly - 0.8, floorY + 2, lineMax + 2);
    ov.clr = hd < 14 ? 2 : 2.5;                    // (the avoid's clearance: 2 m over the last 14 m, else the full 2.5 m)
    // tuck when it is steep and not yet there, half folded on a long shallow chase, spread at the end (to turn)
    // (a tucked bird cannot turn or hold its height: only when the bird is ahead and the way down is clear)
    I.stoop = gW < -0.35 && ch > 0.8 && tti > 0.5 ? 1 : 0;
    I.half = !I.stoop && d > 30 && gT < 0.05 ? 1 : 0;
    I.climb = gT > 0.25 && d > 20 ? 1 : 0;
    I.aim = null; I.turn = 0; I.vert = 0;
    // the pursuit push (flightModel.js chaseA): on a level / rising chase the falcon always gains ~9 m/s on the bird
    const us = Math.hypot(U.x, U.y, U.z);
    // (not in a climb: a push up a climb is free height; a bird rising away is given up, falconGame.js giveUp)
    f.chaseA = gT > -0.35 && f.gamma < 0.12 && d < 90 ? clamp((us + 9 - f.V) * 1.2, 0, FUN.chaseA) : 0;
    return { d, closing, tti };
  }
  release(dt, f) { this.w *= Math.exp(-dt / 0.15); this.diving = false; if (f) f.chaseA = 0; }
}

function fmt(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

/**
 * THE FIRST CATCH (near-free): a tame pigeon on a roof / ridge right below the launch: 30-90 m ahead along `out`, 6-35 m
 * under the start, the nearest to 55 m ahead and 18 m down. F: the Pigeons; start {x, y, z}; out {x, z} (horizontal).
 * Moves one perched bird there (an easy one, tame: it stays until the falcon is 8 m off). Returns { i, r } or null.
 */
export function placeStarter(F, start, out) {
  if (!F?.roosts?.length || !F.kind) return null;
  const ol = Math.hypot(out.x, out.z) || 1, ox = out.x / ol, oz = out.z / ol;
  let best = -1, bs = Infinity;
  for (let k = 0; k < F.roosts.length; k++) {
    const q = F.roosts[k], dx = q.x - start.x, dz = q.z - start.z, h = Math.hypot(dx, dz), drop = start.y - q.y;
    if (h < 30 || h > 90 || drop < 6 || drop > 35) continue;
    if ((dx * ox + dz * oz) / h < 0.8) continue;
    // (straight ahead: the launch's view centre, where the lock looks)
    const side = Math.abs(dx * oz - dz * ox);
    const s = Math.abs(h - 50) + Math.abs(drop - 18) * 1.5 + side * 2 + (q.kind === "ground" ? 8 : 0);
    if (s < bs) { bs = s; best = k; }
  }
  if (best < 0) return null;
  // the bird: a perched easy one (not a racer, not a jackdaw), the farthest from there (no flock flushing round it)
  let bi = -1, bd = -1;
  const q = F.roosts[best];
  for (let i = 0; i < F.count; i++) {
    if (F.state[i] !== 0 || F.kind[i] !== 1 || F.jackdaw?.[i]) continue;
    const d = Math.hypot(F.p[i * 3] - q.x, F.p[i * 3 + 2] - q.z);
    if (d > bd) { bd = d; bi = i; }
  }
  if (bi < 0) return null;
  const owner = F.owner[best];
  if (owner >= 0 && owner !== bi) F.vanish(owner);
  F.perch(bi, best);
  F.tame[bi] = 1; F.timer[bi] = 600; F.esc[bi] = 0;
  return { i: bi, r: best, x: q.x, y: q.y, z: q.z };
}

/** the wind's loudness for the falcon's sound (falconAudio.js): the gain levels, a pure function so node can check the
 *  values (no AudioContext, nothing audible): fun = the earlier ramp (a 150 km/h stoop roars) */
export function windLevels(V, fold, fun = !FUN_OLD) {
  const ref = fun ? 22 : 30, h0 = fun ? 26 : 38, h1 = fun ? 70 : 95, sm = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  return { wind: 0.16 * clamp((V / ref) ** 1.6, 0.02, 2.2), hiss: 0.25 * sm(V, h0, h1), tuck: sm(fold, 0.6, 1) * sm(V, fun ? 26 : 35, fun ? 65 : 80) };
}
/** the camera's speed feel (falconCamera.js params): fov from fov0 to fov1 over fovV, streaks over streakV, the vignette over vigV */
export const CAM_FUN = { fov1: 88, fovV: [14, 70], streakV: [22, 60], vigV: [28, 75], fun: true };
