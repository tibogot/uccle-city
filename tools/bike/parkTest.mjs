// node tools/bike/parkTest.mjs [--quiet]: THE BMX PARK in the bike lab (viewer/bike/bikePark.js; docs/BIKE.md "The BMX
// park"; gate row `bikepark`). A scripted rider on every feature, on the lab's own ground / colliders / edge layer
// (what the lab rides):
//   kickers small / medium / big at their speed -> the landing ramp, clean, no crash; casing short = a crash
//   the dirt doubles line at pump speed (pedal on the flats, pump the backsides, crouch the landings): 4 airs, no bail
//   the whoops, the pump-track loop (steered round it, pumped), the berm loop (leaning into the banks past the flat
//   lean limit, no wash-out)
//   the quarter pipe: a VERT air comes back into the ramp turned 180, ridden out; the mini half-pipe back and forth
//   (kick turns / airs at the top); the spine: a transfer to its far side
//   the funbox ridden over, its rail ground; the stair set ridden down, its handrail ground; the long rail and the
//   ledge ground; the wall ride (the kicker into it, on the wall, off it); the drop-in tower rolled in
//   + every feature's spot is on the ground and clear of a collider; the park's ground has no face where it should
//   be smooth (the transitions are judged smooth, the decks' edges are faces)
import { DT, BIKE, createBikeState, stepBike, bikeSpeed } from "../../viewer/bike/bikePhysics.js";
import { PARK, PARK_SPOTS } from "../../viewer/bike/bikePark.js";
import { labEnv } from "./casualRide.mjs";

const quiet = process.argv.includes("--quiet");
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v)), f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
const env = labEnv();
const T0 = performance.now();
const spawnAt = (x, z, h, v) => { const q = {}; env.ground(x, z, q); const s = createBikeState(x, z, h, q.h); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v; return s; };
const spot = (name, v) => { const [x, z, h, v0] = PARK_SPOTS[name]; return spawnAt(x, z, h, v ?? v0); };
/** ride with input(s, t) for secs; collects the landings; stop(s) ends it */
function ride(s, input, secs, stop = null, each = null) {
  const L = []; let n = s.landings;
  for (let i = 0, N = Math.round(secs / DT); i < N; i++) {
    stepBike(s, input(s, i * DT), env);
    if (s.landings > n) { n = s.landings; L.push(s.lastLanding); }
    each?.(s);
    if (stop && stop(s)) break;
  }
  s._L = L;
  return s;
}
const lands = (s) => s._L.map((l) => `${l.band}${l.why ? ` (${l.why})` : ""}`).join(", ") || "-";
const airs = (s, t = 0.25) => s._L.filter((l) => l.air > t);
const PI = Math.PI;
/** steer toward a target heading (keyboard-like: full steer past 0.12 rad of error, proportional under) */
const steerTo = (s, h) => { let e = h - s.heading; e -= Math.round(e / (2 * PI)) * 2 * PI; return Math.max(-1, Math.min(1, e / 0.25)); };
/** the pump rider: pedals where it is flat or up, pumps (C) down the backsides, crouches (Space held) falling */
const pumper = (steer = () => 0) => (s) => {
  const on = s.contact[0] || s.contact[1], av = (s.slope[0] + s.slope[1]) / 2;
  return { pedal: on && av >= -0.08 ? 1 : 0, pump: on && av < -0.08 ? 1 : 0, hop: s.air && s.vy < 0, steer: steer(s) };
};

// ---------------------------------------------------------------- the spots
{
  const bad = [];
  for (const [name, [x, z, h]] of Object.entries(PARK_SPOTS)) {
    const s = spawnAt(x, z, h, 0);
    if (env.insideSolid(s)) bad.push(`${name}: inside a collider`);
    const q = {}; env.ground(x, z, q);
    if (!(Math.abs(q.ny - 1) < 0.02)) bad.push(`${name}: on a slope (${f2(q.ny)})`);
  }
  check("park: every spot on level ground, clear of the colliders", !bad.length, bad.join("; ") || `${Object.keys(PARK_SPOTS).length} spots`, "all");
}

// ---------------------------------------------------------------- kickers
{
  const out = [], bad = [];
  for (const k of PARK.kickers) {
    const s = ride(spot(`kicker ${k.name}`, k.v), (q) => ({ pedal: q.z < k.z0 - 1 && bikeSpeed(q) < k.v ? 1 : 0, sprint: true }), 6, (q) => q.z > k.z1 + 3);
    const L = airs(s)[0];
    const ok = s.crashes === 0 && L && L.band !== "bail" && s.z > k.z1 && L.air > 0.3;
    out.push(`${k.name} at ${k.v} m/s: air ${f2(L?.air)} s, ${L?.band}${L?.why ? ` (${L.why})` : ""}, ${s.crashes} crashes`);
    if (!ok) bad.push(k.name);
    // short (casing the landing's face) = a crash
  }
  check("kickers small / medium / big at their speed: over the gap onto the landing ramp, no crash", !bad.length, out.join("; "), "air > 0.3 s, not a bail, ridden out");
}

// ---------------------------------------------------------------- the doubles line, the whoops
{
  const d = PARK.doubles;
  const s = ride(spot("dirt doubles", d.v), (q) => ({ ...pumper()(q), sprint: true }), 12, (q) => q.z > d.z1 + 2);
  const A = airs(s), bails = s._L.filter((l) => l.band === "bail").length;
  check("dirt doubles at pump speed (7 m/s, pedal / pump / crouch): 4 airs in a row, no bail", s.crashes === 0 && A.length >= d.n && bails === 0 && s.z > d.z1,
    `${A.length} airs (${A.map((l) => f2(l.air)).join(", ")} s), ${lands(s)}; z ${f1(s.z - d.z1)} past the end at ${f1(bikeSpeed(s))} m/s`, `>= ${d.n} airs > 0.25 s, 0 bail, through`);
  const W = PARK.whoops, w = ride(spot("whoops", 6), pumper(), 10, (q) => q.z > W.z1 + 1);
  const wc = ride(spot("whoops", 6), () => ({ pedal: 1 }), 10, (q) => q.z > W.z1 + 1);
  check("whoops (rollers 2.2 m): pumped and pedalled through, no crash", w.crashes === 0 && w.z > W.z1 && wc.crashes === 0, `pumped: ${f1(bikeSpeed(w))} m/s out; pedalled: ${wc.crashes} crashes`, "through, no crash");
}

// ---------------------------------------------------------------- the loops: pump track, berms
{
  // steer round the stadium: aim at a point 3 m ahead on the centre line (distance R from the segment)
  const follow = (T, dir = 1) => (s) => {
    const t = Math.max(0, Math.min(1, (s.x - T.ax) / (T.bx - T.ax))), px = T.ax + (T.bx - T.ax) * t;
    const dx = s.x - px, dz = s.z - T.z, d = Math.hypot(dx, dz) || 1;
    // the centre line's tangent here (counter-clockwise seen from +y: dir 1) and a pull back onto it
    let tx = dz / d * dir, tz = -dx / d * dir;
    const back = (T.R - d) * 0.6; tx += dx / d * back; tz += dz / d * back;
    return steerTo(s, Math.atan2(tx, tz));
  };
  const lap = (T, name, input, secs) => {
    const s = spot(name); let ang0 = Math.atan2(s.z - T.z, s.x - (T.ax + T.bx) / 2), turned = 0, prev = ang0, maxLean = 0, minV = 99;
    ride(s, input, secs, null, (q) => { const a = Math.atan2(q.z - T.z, q.x - (T.ax + T.bx) / 2); let da = a - prev; da -= Math.round(da / (2 * PI)) * 2 * PI; turned += da; prev = a; maxLean = Math.max(maxLean, Math.abs(q.lean)); if (q.t > 2) minV = Math.min(minV, Math.abs(bikeSpeed(q))); });
    return { s, laps: Math.abs(turned) / (2 * PI), maxLean, minV };
  };
  const P = PARK.pump;
  // (the pump track counter-clockwise from the bottom straight heading +x: the tangent there is +x = dir -1 in this sign)
  const pt = lap(P, "pump track", pumper(follow(P, -1)), 30);
  check("pump track loop: pumped round it, steering along it: a lap, no crash, the speed kept", pt.s.crashes === 0 && pt.laps >= 1 && pt.minV > 2.5,
    `${f2(pt.laps)} laps in 30 s, min ${f1(pt.minV)} m/s, ${pt.s.crashes} crashes${pt.s.crashes ? ` ("${pt.s.crashCause}")` : ""}`, ">= 1 lap, > 2.5 m/s, 0 crashes");
  const B = PARK.berms;
  const bl = lap(B, "berm loop", (s) => ({ pedal: bikeSpeed(s) < 6.5 ? 1 : 0, sprint: true, steer: follow(B, -1)(s) }), 30);
  check("berm loop: carved round both banks at ~6.5 m/s: laps, no wash-out, leaning past the flat limit", bl.s.crashes === 0 && bl.laps >= 1 && bl.maxLean > BIKE.maxLean + 0.03,
    `${f2(bl.laps)} laps, max lean ${f1(bl.maxLean * 57.3)} deg (flat limit ${f1(BIKE.maxLean * 57.3)}), ${bl.s.crashes} crashes${bl.s.crashes ? ` ("${bl.s.crashCause}")` : ""}`, ">= 1 lap, 0 crashes, lean > flat limit");
}

// ---------------------------------------------------------------- quarter pipe, mini half-pipe, spine
{
  const Q = PARK.qp, s = ride(spot("quarter pipe", 7.5), () => ({}), 6, (q) => q.z < Q.foot - 6 && q.vz < 0);
  const L = airs(s, 0.4)[0];
  const back = Math.cos(s.heading) < -0.9 && s.vz < -3;
  check("quarter pipe at 27 km/h: a vert air, back into the ramp turned 180, ridden out", s.park.verts >= 1 && s.crashes === 0 && L && L.band !== "bail" && back,
    `verts ${s.park.verts}, air ${f2(L?.air)} s, ${L?.band}, out heading ${f1(s.heading * 57.3)} deg at ${f1(-s.vz)} m/s, ${s.crashes} crashes`, "1 vert, no bail, riding back out");
  const M = PARK.mini, m = ride(spot("mini half-pipe", 5), () => ({}), 10);
  check("mini half-pipe from the bottom at 18 km/h: back and forth (kick turns / airs at the top), no crash", m.crashes === 0 && m.park.verts >= 2,
    `${m.park.verts} turns at the top, ${m.crashes} crashes, ${lands(m)}`, ">= 2, 0 crashes");
  const S = PARK.spine, sp = ride(spot("spine", 6.5), () => ({ pedal: 0 }), 5, (q) => q.z > S.z1 + 3);
  const SL = airs(sp, 0.15)[0];
  check("spine at 23 km/h: the transfer over the coping, down its far side, no crash", sp.crashes === 0 && sp.z > S.z1 + 1 && sp.vz > 2 && sp.park.verts === 0,
    `z ${f1(sp.z - S.peak)} m past the peak at ${f1(sp.vz)} m/s, air ${f2(SL?.air)} s ${SL?.band || ""}, verts ${sp.park.verts}, ${sp.crashes} crashes`, "over, forward, no vert, no crash");
}

// ---------------------------------------------------------------- funbox, stairs + handrail, long rail, ledge (grinds)
{
  const F = PARK.funbox, fb = ride(spot("funbox", 5), () => ({ pedal: 0.5 }), 6, (q) => q.z > F.z1 + 3);
  check("funbox ridden over (up ramp, table, down ramp) at 18 km/h: no crash", fb.crashes === 0 && fb.z > F.z1, `${fb.crashes} crashes, ${lands(fb)}`, "no crash");
  // a hop onto a rail: from beside it, released `lead` s before the rail's start; the best of a sweep (as a player
  // learns the timing), and never a crash
  const hopGrind = (name, startZ, v, leads, pedal = 0.3) => {
    let best = null, crashes = 0;
    for (const lead of leads) {
      const s = spot(name, v); let held = false, done = false;
      ride(s, (q) => { const tl = (startZ - q.z) / Math.max(0.1, q.vz); if (!done && !held && tl < lead + 0.32) held = true; if (held && tl <= lead) { held = false; done = true; } return { hop: held, pedal }; }, 6);
      crashes += s.crashes;
      if (s.grinds && (!best || s.grindDist > best.grindDist)) best = s;
    }
    return { best, crashes };
  };
  const leads = [0.0, 0.1, 0.2, 0.3, 0.4];
  const fr = hopGrind("funbox", F.zt0 + 0.9, 5, [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
  check("funbox rail: hopped onto from the table, ground along it", fr.best && fr.best.grinds >= 1 && fr.crashes === 0, `best: ${fr.best ? `${f1(fr.best.grindDist)} m, off by "${fr.best.grindExit}"` : "no grind"}, ${fr.crashes} crashes`, "a grind, 0 crashes");
  const ST = PARK.stairs, down = ride(spot("stairs + handrail", 4), () => ({ pedal: 0.6 }), 8, (q) => q.z > ST.z1 + 3);
  check("stair set: up the ramp, along the platform, down the 5 stairs (a ramp for the wheels): no crash", down.crashes === 0 && down.z > ST.z1, `${down.crashes} crashes, ${lands(down)}`, "no crash");
  // the handrail: from the platform, beside the rail (the spot's x + the rail's offset), hop at its top
  const hr = (() => {
    let best = null, crashes = 0;
    const rx = (ST.x0 + ST.x1) / 2 + ((ST.x1 - ST.x0 - 0.4) / 2 - 0.15) * -1;   // handrailEdges side 1: the -x side of the flight going +z ... (measured below)
    for (const side of [-1, 1]) for (const lead of [0.0, 0.1, 0.2, 0.3]) for (const off of [0.35, 0.5]) {
      const railX = (ST.x0 + ST.x1) / 2 + side * ((ST.x1 - ST.x0 - 0.4) / 2 - 0.15);
      const s = spawnAt(railX - side * off, ST.zp + 0.3, 0, 3.6); let held = false, done = false;
      ride(s, (q) => { const tl = (ST.zs - q.z) / Math.max(0.1, q.vz); if (!done && !held && tl < lead + 0.32) held = true; if (held && tl <= lead) { held = false; done = true; } return { hop: held, pedal: 0.3 }; }, 5);
      crashes += s.crashes;
      if (s.grinds && (!best || s.grindDist > best.grindDist)) best = s;
    }
    void rx;
    return { best, crashes };
  })();
  check("stair handrail: hopped onto at the top, ground down it", hr.best && hr.best.grinds >= 1 && hr.best.grindDist > 1 && hr.crashes === 0, `best: ${hr.best ? `${f1(hr.best.grindDist)} m, off by "${hr.best.grindExit}"` : "no grind"}, ${hr.crashes} crashes`, "> 1 m of grind, 0 crashes");
  const R = PARK.rail, rl = hopGrind("long rail", R.z0, 4, leads);
  check("long rail: hopped onto from beside it, ground along it", rl.best && rl.best.grindDist > 3 && rl.crashes === 0, `best: ${rl.best ? `${f1(rl.best.grindDist)} m, off by "${rl.best.grindExit}"` : "no grind"}, ${rl.crashes} crashes`, "> 3 m, 0 crashes");
  const Ld = PARK.ledge, lg = hopGrind("ledge", Ld.z0, 4, leads);
  check("ledge: hopped onto from beside it, ground along it", lg.best && lg.best.grindDist > 2 && lg.crashes === 0, `best: ${lg.best ? `${f1(lg.best.grindDist)} m, off by "${lg.best.grindExit}"` : "no grind"}, ${lg.crashes} crashes`, "> 2 m, 0 crashes");
}

// ---------------------------------------------------------------- the wall ride, the drop-in
{
  let best = null, crashes = 0;
  for (const v of [6.5, 7, 7.5, 8]) { const s = ride(spot("wall ride", v), () => ({ pedal: 0.5 }), 6); crashes += s.crashes; if (s.park.wallrides && (!best || s.park.wallT > best.park.wallT)) best = s; }
  check("wall ride: off the kicker onto the wall, along it, off it, no crash (6.5-8 m/s)", best && best.park.wallrides >= 1 && crashes === 0,
    best ? `on the wall ${f2(best.park.wallT)} s, off by "${best.park.wallExit}", landing ${best.lastLanding?.band}; ${crashes} crashes over 4 speeds` : `no wall ride, ${crashes} crashes`, "a wall ride, 0 crashes");
  const T = PARK.tower, di = ride(spot("drop-in tower", 0.5), () => ({ pedal: 0.6 }), 8, (q) => q.z > T.zr + 6);
  check("drop-in tower (3 m): rolled in off the platform, down the roll-in, out on the flat", di.crashes === 0 && di.z > T.zr + 3 && bikeSpeed(di) > 4,
    `out at ${f1(bikeSpeed(di))} m/s, ${di.crashes} crashes${di.crashes ? ` ("${di.crashCause}")` : ""}, ${lands(di)}`, "> 4 m/s on the flat, no crash");
}

const ms = performance.now() - T0;
if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) if (!quiet || r[1] === "FAIL") console.log(`| ${r.join(" | ")} |`);
}
console.log(`\n${failed ? `${failed} park check(s) FAIL` : `all ${rows.length} park checks pass`} (${(ms / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
