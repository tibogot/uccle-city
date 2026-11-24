// THE POLICE JOBS' PREMISES (claude/missions, rule mission-premise, docs/POLICE_GAME.md "Missions"): what each job says
// is happening, and the code that makes it TRUE in the world where the job plays, checks it, and says when it broke.
// No three.js: the mission audit (tools/audit/missionAudit.mjs) runs these same functions headless on the real tram
// timetable (viewer/tramSched.js) and the real traffic sim.
//
// Why: the owner's playtest (2026-11-23): "move a car so the tram can pass" fired with no tram anywhere near. The job put
// a car on the rails at a stop picked by distance alone and set the block when the job was accepted; a tram reached it
// only if the timetable happened to bring one (night: never), so the player found a car on empty rails, and "Tram 92 is
// stuck behind it" was never true at the call. The other jobs had the same blind spot: the accident's cars stood
// wherever the junction point was when no road snap came back, the stolen car was looked for only after the call was
// accepted (none: the job FAILED and cost reputation), the radar's speeder was any car "heading this way", often on
// another street, so no speeder ever came past.
//
// The rule: a job declares its premise (PREMISES), the dispatch only offers it where the premise can be made true, makes
// it true AT THE CALL (the world state exists before the radio says it does), and the game watches it (1 Hz) until the
// premise has done its job; when it breaks the call is cancelled without a penalty (?missions=old: as before).
export { MISSIONS_OLD } from "../tramSched.js";

/** every job type: the systems it needs (any off: never offered) and the premise it states */
export const PREMISES = {
  tram: { needs: ["trams"], says: "a car parked on the tram 92 rails with a tram held right behind it: held at the call, or due there before you can possibly arrive (the timetable says when)" },
  speed: { needs: ["traffic"], says: "traffic driving past the speed-limit sign; the car the radar flags is one on its way past the sign (it passes within 22 m)" },
  accident: { needs: ["map"], says: "two damaged cars standing on the road at the junction (snapped to its carriageway), placed at the call, hazard lights on" },
  stolen: { needs: ["traffic"], says: "the stolen car driving in the traffic 90-320 m from you, held by the job (never culled) from the call on" },
};

// ------------------------------------------------------------------------------------------------ tram
/** the car on the rails: `past` m after the stop (the tram stands at its platform behind it), the block's radius and the
 *  gap the tram keeps to the car (tramline setBlock) */
export const TRAM_BLOCK = { past: 16, gap: 7, r: 4.6 };
/** the quickest the player can reach a spot D m away (s): reached at the step's 32 m radius, 1.25 x the straight line
 *  (streets) at 17 m/s (61 km/h average with the siren: faster than the town average the time budget uses) */
export const arriveMin = (D) => Math.max(0, D - 32) * 1.25 / 17;
export const TRAM_LEN = 33;

/** a tram's body (front d, length TRAM_LEN) over (x, z) within r? (the car is never put inside a tram) */
function tramOver(tl, x, z, r, T) {
  for (const [shape, d] of tl.fronts(T)) for (let k = 0; k <= TRAM_LEN; k += 3) {
    const p = tl.shapePoint(shape, d - k);
    if (p && (p.x - x) ** 2 + (p.z - z) ** 2 < r * r) return true;
  }
  return false;
}

/**
 * The spot for a blocked-tram job: a stop of a shape (not its last) whose block point is min..max m from the player, no
 * tram over it now, and the next tram of that shape reaches the block line (by the timetable, its delay counted) no later
 * than the quickest the player can get there; where(x, z): the built city (kit.places.inBuilt). -> { shape, d, name, at { x, z, heading }, car { x, z, heading }, D, eta (real
 * s, 0 = held at once) } or null (no tram due anywhere near: night, trams off, ...).
 *   tl: viewer/tramline.js (or the audit's tramSched + stubs): clockSecs, timescale, spots(), shapePoint(), etaTo(), fronts()
 */
export function pickTramSpot(tl, P, rng, { min = 250, max = 2600, prefer = null, where = null } = {}) {
  if (!tl) return null;
  const T = tl.clockSecs, k = tl.timescale || 1, out = [];
  for (const s of tl.spots()) {
    if (s.end) continue;
    const at = tl.shapePoint(s.shape, s.d + TRAM_BLOCK.past);
    if (!at) continue;
    const D = Math.hypot(at.x - P.x, at.z - P.z);
    if (D < min || D > max || (where && !where(at.x, at.z))) continue;
    const lim = arriveMin(D);
    const eta = tl.etaTo(s.shape, s.d + TRAM_BLOCK.past - TRAM_BLOCK.gap, T, lim * k + 1) / k;
    if (!(eta <= lim)) continue;
    const h = at.heading, car = { x: at.x - Math.cos(h) * 0.7, z: at.z + Math.sin(h) * 0.7, heading: h + 0.12 };   // (0.7 m right)
    if (tramOver(tl, car.x, car.z, 3.2, T)) continue;
    out.push({ shape: s.shape, d: s.d, id: s.id, name: s.name, at, car, D, eta, lim });
  }
  if (!out.length) return null;
  const pref = prefer ? out.filter((s) => prefer.test(s.name)) : [];
  const pool = pref.length ? pref : out;
  return pool[Math.floor(rng() * pool.length)];
}
/** the block the spot's car makes (tramline setBlock) */
export const tramBlock = (spot) => ({ x: spot.car.x, z: spot.car.z, heading: null, r: TRAM_BLOCK.r, gap: TRAM_BLOCK.gap });
/**
 * The blocked-tram premise at `elapsed` real s after the block was set: { ok, held, why }. Holds while a tram stands
 * behind the car, or one is still within its promised time (spot.eta + 4 s); breaks when the trams are gone (tl null),
 * the block is gone, or the promised tram never came.
 */
export function tramPremise(tl, spot, elapsed) {
  if (!tl) return { ok: false, held: 0, why: "the trams are not running" };
  const b = tl.blockState();
  if (!b.on) return { ok: false, held: 0, why: "the tram line is clear again" };
  if (b.held > 0) return { ok: true, held: b.held };
  if (elapsed <= spot.eta + 4) return { ok: true, held: 0 };
  return { ok: false, held: 0, why: "no tram came up behind the car" };
}

// ------------------------------------------------------------------------------------------------ speed check
/**
 * The speeder: a free driving car 70-220 m from the check point heading for it; new: its line passes within 25 m of the
 * point (it is on its way past the sign, not on a parallel street). -> the sim index or -1.
 */
export function pickSpeeder(sim, at, { old = false, skip = null } = {}) {
  let best = -1, bs = 1e9;
  for (let i = 0; i < sim.cap; i++) {
    if (!sim.alive[i] || sim.state[i] !== 0 || sim.keep[i] || sim.ctl[i] || sim.types[sim.type[i]]?.two) continue;
    if (skip && skip.has(i * 4096 + (sim.gen[i] & 4095))) continue;
    const dx = at.x - sim.x[i], dz = at.z - sim.z[i], d = Math.hypot(dx, dz);
    if (d < 70 || d > 220) continue;
    const fx = Math.sin(sim.yaw[i]), fz = Math.cos(sim.yaw[i]), toward = (fx * dx + fz * dz) / d;
    if (toward < 0.75) continue;
    if (!old && Math.abs(fx * dz - fz * dx) > 25) continue;          // (its line misses the point by > 25 m)
    if (d < bs) { bs = d; best = i; }
  }
  return best;
}
/** a picked speeder that went past without coming within 22 m of the point (it turned off): drop it, pick another.
 *  rec = { min } carried between calls */
export function speederMissed(sim, i, at, rec) {
  const d = Math.hypot(sim.x[i] - at.x, sim.z[i] - at.z);
  rec.min = Math.min(rec.min ?? Infinity, d);
  return rec.min > 22 && d > rec.min + 30;
}

// ------------------------------------------------------------------------------------------------ accident
/**
 * The crash at junction j: car A just past the junction on the right lane (askew), car B rammed into its left side, three
 * cone spots behind (the way the traffic comes). snap(x, z) -> { x, z, yaw } | { none: true } (the map worker's road
 * snap). New: no road under the junction = no scene (null), not two cars at the raw point (on a pavement, in a hedge).
 * -> { A: car, B: car, cones: [[x, z] x3], x, z, onRoad } | null
 */
export async function placeAccident(j, snapRaw, rng, { old = false, alive = () => true } = {}) {
  const snap = async (x, z, ref = null) => {
    const r = snapRaw ? await snapRaw(x, z) : { none: true };
    if (r.none) return { x, z, h: ref ?? 0, none: true };
    let h = Math.PI / 2 - r.yaw;
    if (ref != null && Math.cos(h - ref) < 0) h += Math.PI;
    return { x: r.x, z: r.z, h };
  };
  const J = await snap(j.x, j.z);
  if (!alive()) return null;
  if (J.none && !old) return null;
  const h = J.h, fx = Math.sin(h), fz = Math.cos(h);
  const A = await snap(j.x + fx * 6, j.z + fz * 6, h);
  if (!alive()) return null;
  if (A.none && !old) return null;
  const ha = A.h + 0.3, ra = [-Math.cos(A.h), Math.sin(A.h)];
  const ax = A.x + ra[0] * 1.5, az = A.z + ra[1] * 1.5;
  const la = [Math.cos(ha), -Math.sin(ha)];
  const types = ["hatch_c", "saloon", "estate", "hatch_s"], ta = types[Math.floor(rng() * 4)], tb = types[(types.indexOf(ta) + 1 + Math.floor(rng() * 3)) % 4];
  const bx = ax + la[0] * 3.05, bz = az + la[1] * 3.05, hb = Math.atan2(-la[0], -la[1]) + 0.32;
  const carA = { x: ax, z: az, heading: ha, type: ta, paint: [0xb9bcc0, 0xd8d4c8, 0x1d3f6e][Math.floor(rng() * 3)], damage: { sx: 1, sz: 1, depth: 0.18 } };
  const carB = { x: bx, z: bz, heading: hb, type: tb, paint: [0x8a1414, 0x24483a, 0x34383d][Math.floor(rng() * 3)], damage: { sx: 1, sz: 1, depth: 0.22 } };
  const back = await Promise.all([12, 18, 24].map((b) => snap(A.x - Math.sin(A.h) * b, A.z - Math.cos(A.h) * b, A.h)));
  if (!alive()) return null;
  const cones = back.map((q, k) => { const off = 2.7 - k * 0.65; return [q.x - Math.cos(q.h) * off, q.z + Math.sin(q.h) * off]; });
  return { A: carA, B: carB, cones, x: ax, z: az, onRoad: !J.none && !A.none, road: { x: A.x, z: A.z, h: A.h } };
}
/** the accident premise: both damaged cars standing (in props.cars) within 12 m of the scene; before the scene is built,
 *  `wait` s of grace (the road snap is async) */
export function accidentPremise(scene, cars, elapsed, wait = 6) {
  if (scene.failed) return { ok: false, why: scene.failed };
  if (!scene.ready) return elapsed <= wait ? { ok: true } : { ok: false, why: "the scene never got set up" };
  if (scene.cleared) return { ok: true };
  for (const c of [scene.a, scene.b]) {
    if (!c || !cars.includes(c)) return { ok: false, why: "the damaged cars are gone" };
    if (Math.hypot(c.x - scene.x, c.z - scene.z) > 12) return { ok: false, why: "the damaged cars are not at the scene" };
  }
  return { ok: true };
}

// ------------------------------------------------------------------------------------------------ stolen car
/** the stolen-car premise: the job's traffic car still driving (alive, ours) */
export function stolenPremise(e, sim) {
  if (!sim) return { ok: false, why: "the traffic is off" };
  if (!e || !e.alive) return { ok: false, why: "the stolen car left the area" };
  return { ok: true };
}
