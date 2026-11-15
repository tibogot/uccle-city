// FALCON GAME AUTOPILOT (docs/FALCON_GAME.md "Verification"): drives the falcon of a running ?game=falcon through the
// flight's own input (FalconInput.script: the same controls a player fills), to validate the mission flows when the
// tab cannot be played by hand. Not a tuning tool: the feel is tuned by playing.
//   const A = await import("/debug/falconGameAuto.js");
//   A.go({ climb: 90 })            climb in circles to 90 m over the floor (flapping)
//   A.go({ to: [x, z], alt: 90 })  fly there at that height
//   A.go({ hunt: true })           stoop on the strike's target (pursuit with lead, tuck, talons) until a catch
//   A.go({ home: true })           back to the eyrie and land on the ledge
//   A.stop()                       hands off      A.state()   a summary
const G = 9.81;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let job = null, log = [];

const fl = () => window.__flyer, game = () => window.__flyer.game;
const steer = (f, hT, gT, bankMax = 1) => ({ roll: clamp(-wrap(hT - f.heading) * 2.2, -bankMax, bankMax), pitch: clamp((gT - f.gamma) * 3.5, -1, 1) });
const headingTo = (f, x, z) => Math.atan2(-(x - f.pos.x), -(z - f.pos.z));

function script() {
  const g = game(), f = g.f, J = job;
  if (!J) return { pitch: 0, roll: 0, flap: 0, fold: 0, brake: 0 };
  J.t = (J.t || 0) + 1 / 60;
  const C = { pitch: 0, roll: 0, flap: 0, fold: 0, brake: 0 };
  if (g.mode === "perch") { if (J.t % 2 < 0.1) g.input.actions?.add?.("land"); return { ...C, flap: 1, pitch: 0.4 }; }
  if (J.climb != null) {
    const agl = f.pos.y - g.world.ground(1153.1, 540.1);
    if (agl >= J.climb) { log.push(`climbed to ${agl.toFixed(0)} m`); J.climb = null; J.done = !J.to && !J.hunt && !J.home; return C; }
    // circles round the Place (a 70 m orbit), a gentle climbing path; rests (glides) when tired
    const dx = f.pos.x - 1153, dz = f.pos.z - 540, r = Math.hypot(dx, dz), tang = Math.atan2(-(-dz), -(dx)) ;
    const hT = r > 90 ? headingTo(f, 1153, 540) : f.heading + 0.25;
    J.rest = f.stamina < 0.06 ? true : f.stamina > 0.5 ? false : J.rest;
    Object.assign(C, steer(f, hT, J.rest ? -0.06 : 0.12, 0.5)); C.flap = J.rest ? 0 : 1; void tang; return C;
  }
  if (J.to) {
    const [x, z] = J.to, d = Math.hypot(x - f.pos.x, z - f.pos.z);
    if (d < 40) { log.push(`reached ${x},${z}`); J.to = null; if (!J.hunt && !J.home) J.done = true; return C; }
    const floor = g.world.floor(f.pos.x, f.pos.z), want = floor + (J.alt ?? 80);
    Object.assign(C, steer(f, headingTo(f, x, z), clamp((want - f.pos.y) * 0.02, -0.25, 0.2), 0.8));
    C.flap = f.pos.y < want - 5 && f.V < 22 && f.stamina > 0.2 ? 1 : 0; C.fold = f.V > 18 ? 0.5 : 0;
    return C;
  }
  if (J.chase) {
    const M = J.chase;      // the game's Mobbers: fly at the nearest crow still harassing
    let bi = -1, bd = Infinity;
    for (let i = 0; i < 7; i++) if (M.state[i] === 1) { const d = Math.hypot(M.p[i * 3] - f.pos.x, M.p[i * 3 + 1] - f.pos.y, M.p[i * 3 + 2] - f.pos.z); if (d < bd) { bd = d; bi = i; } }
    if (bi < 0) { log.push("crows gone"); J.chase = null; J.done = !J.home; return C; }
    const o = bi * 3, tti = clamp(bd / Math.max(f.V, 8), 0, 2);
    const lx = M.p[o] + M.v[o] * tti, ly = M.p[o + 1] + M.v[o + 1] * tti, lz = M.p[o + 2] + M.v[o + 2] * tti;
    Object.assign(C, steer(f, headingTo(f, lx, lz), Math.atan2(ly - f.pos.y, Math.hypot(lx - f.pos.x, lz - f.pos.z)), 1));
    C.flap = f.V < 16 && f.stamina > 0.05 ? 1 : 0; C.fold = f.V > 20 ? 0.3 : 0;
    return C;
  }
  if (J.hunt) {
    const at = J.at || [1153.1, 540.1], W0 = J.waitH || 85;
    const w = g.window, h = f.pos.y - g.world.ground(at[0], at[1]);
    if (g.score.catches > (J.c0 ??= g.score.catches)) { log.push(`caught at ${Math.round(g.lastCatch?.V * 3.6)} km/h`); J.hunt = false; g.input.talons = false; if (!J.home) J.done = true; return C; }
    let P = null, p = null;
    if (w && w.d < 160) { P = g.pigeons; p = P.pos(w.i, {}); }
    // a stoop only on a bird well below (the speed comes from the height); else wait on high over the Place
    const below = p ? f.pos.y - p.y : 0;
    if (J.stoop && (!p || below < -3)) J.stoop = false;
    if (!J.stoop && p && below > 12 && w.d < 120) J.stoop = true;
    // a flock point given (J.aim(): the murmuration's leader): from above, stoop at the flock itself
    const q = J.aim?.();
    if (!J.stoop && q && !p && f.pos.y - q.y > 30 && Math.hypot(q.x - f.pos.x, q.z - f.pos.z) < 160) {
      const gT = Math.atan2(q.y - f.pos.y, Math.hypot(q.x - f.pos.x, q.z - f.pos.z));
      Object.assign(C, steer(f, headingTo(f, q.x, q.z), gT, 1)); C.fold = gT < -0.3 ? 1 : 0.5; return C;
    }
    if (!J.stoop) {
      const r = Math.hypot(f.pos.x - at[0], f.pos.z - at[1]);
      const hT = r > 70 ? headingTo(f, at[0], at[1]) : f.heading + 0.3;
      Object.assign(C, steer(f, hT, clamp((W0 - h) * 0.02, -0.3, 0.2), 0.6));
      C.flap = h < W0 - 5 && f.stamina > 0.05 ? 1 : 0;
      // over the Place a fast pass (> 30 m/s) flushes the flock from the roofs and the setts (above the church: 60 m)
      if (!J.at && r < 110 && h > 66 && f.stamina > 0.3) { C.fold = 0.5; C.pitch = Math.min(C.pitch, -0.25); C.flap = 0; }
      g.input.talons = false; return C;
    }
    const v = P.vel(w.i, {}), tti = clamp(w.d / Math.max(w.closing, 8), 0, 3);
    const lx = p.x + v.x * tti, ly = p.y + v.y * tti, lz = p.z + v.z * tti;
    const hT = headingTo(f, lx, lz), gT = Math.atan2(ly - f.pos.y, Math.hypot(lx - f.pos.x, lz - f.pos.z));
    Object.assign(C, steer(f, hT, gT, 1));
    C.fold = w.d > 18 && gT < -0.3 ? 1 : 0.5;
    g.input.talons = w.d < 16;
    return C;
  }
  if (J.home) {
    const fam = window.__falcons;
    if (!fam || g.mode === "land") return C;
    if (g.score.delivered > (J.d0 ??= g.score.delivered)) { log.push("delivered"); J.home = false; J.done = true; return C; }
    const E = fam.toWorld(fam.perch.ledge.pos.clone());
    const o = fam.perch.ledge.facing;
    const ang = fam.group.rotation.y, ox = o.x * Math.cos(ang) + o.z * Math.sin(ang), oz = -o.x * Math.sin(ang) + o.z * Math.cos(ang);
    // first out in front of the ledge (35 m along its facing), then straight in, slow, E
    const Ax = E.x + ox * 35, Az = E.z + oz * 35;
    if (!J.final && Math.hypot(Ax - f.pos.x, Az - f.pos.z) < 14) J.final = true;
    const tx = J.final ? E.x : Ax, tz = J.final ? E.z : Az, d = Math.hypot(tx - f.pos.x, tz - f.pos.z);
    const want = E.y + (J.final ? Math.min(6, d * 0.12) : 8);
    Object.assign(C, steer(f, headingTo(f, tx, tz), clamp((want - f.pos.y) * 0.05, -0.4, 0.3), 0.8));
    C.flap = f.pos.y < want - 2 && f.stamina > 0.1 ? 1 : 0;
    C.brake = J.final && f.V > 13 ? 1 : 0;
    if (J.final && d < 38 && (J.lt = (J.lt || 0) + 1) % 15 === 0) g.input.actions.add("land");
    if (J.final && d > 70) J.final = false;
    return C;
  }
  return C;
}

export function go(spec) {
  job = { ...spec };
  const inp = fl().game.input;
  inp.script = () => { const C = script(); if (job?.done) { job = null; } return C; };
  return job;
}
export function stop() { job = null; const inp = fl()?.game?.input; if (inp) inp.script = null; }
export function state() {
  const g = game(), f = g.f;
  return { mode: g.mode, V: +f.V.toFixed(1), agl: +(g.agl ?? 0).toFixed(0), x: +f.pos.x.toFixed(0), y: +f.pos.y.toFixed(0), z: +f.pos.z.toFixed(0), sta: +f.stamina.toFixed(2),
    win: g.window ? { d: +g.window.d.toFixed(0), ok: g.window.ok, kind: g.pigeons.kind?.(g.window.i) } : null, score: { ...g.score }, prey: !!fl().bird.prey, job: job ? Object.keys(job).join(",") : null, log: log.slice(-8),
    kit: window.__game?.info().objective };
}
