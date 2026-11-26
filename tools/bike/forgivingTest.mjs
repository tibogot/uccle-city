// node tools/bike/forgivingTest.mjs [--quiet] [--seeds N]: FORGIVING FALLS (docs/BIKE.md "Forgiving falls", rule
// bike-falls-on-hard-hits; gate row `bikefall`). The owner (2026-11-25): "it's too easy to fall. With the BMX we should
// fall only if we hit something hard, but it should go easily over bumps and all."
//  1. the CASUAL RIDER (tools/bike/casualRide.mjs: W held, stepped steering, no lean, late / no hop) over N seeds on
//     every lab spot: kerbs up / down square and at 25 / 45 deg, cobbles, bumps, roots, the pump rollers, sand, the
//     slopes, the kicker / table, the bowl, small drops: ~0 crashes a minute;
//  2. the HARD HITS still crash: a wall / a car / a post head-on at 6 m/s, a landing nose down 70 deg, sideways 55 deg,
//     a 2 m drop onto the front wheel, a 5.5 m flat drop, Z held off a ledge (the player's override), off a high ledge
//     into a wall, a 30 cm face at 22 km/h; and the gentle ones do not: a wall at 70 deg (a glance), at 4 m/s, a 2 m
//     drop level, a 15 cm kerb at walking pace (stopped);
//  3. SKILL kept: a hop over the kerb keeps more speed than rolling it up; a crouched kicker landing is clean where
//     hands-off is sketchy; the casual rider's kicker landings are not all clean.
import { DT, BIKE, SURF, createBikeState, stepBike, groundQuery, bikeSpeed } from "../../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";
import { KERB, WALL, CAR, POSTS } from "../../viewer/bike/bikeGround.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";
import { causesTable, labEnv } from "./casualRide.mjs";

const quiet = process.argv.includes("--quiet");
const seeds = +(process.argv[process.argv.indexOf("--seeds") + 1] || 0) || 24;
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v)), f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
const D = Math.PI / 180;
const spawn = (env, x, z, h, B = BIKE) => { const q = {}; env.ground(x, z, q); return createBikeState(x, z, h, q.h, B); };
const ride = (s, env, input, secs, B = BIKE, onStep = null) => { for (let i = 0, n = Math.round(secs / DT); i < n; i++) { stepBike(s, input(s, i * DT), env, B); onStep?.(s); } return s; };
const flat = createBikeEnv({ ground: groundQuery(() => 0, () => SURF.asphalt) });
const T0 = performance.now();

// ---------------------------------------------------------------- 1. the casual rider
{
  const T = causesTable(seeds);
  const groups = {};
  for (const [name, r] of Object.entries(T.byRun)) { const g = groups[r.group] ||= { crashes: 0, secs: 0, rides: 0, causes: {}, runs: [] }; g.crashes += r.crashes; g.secs += r.secs; g.rides += r.rides; g.runs.push(name); for (const [c, n] of Object.entries(r.causes)) g.causes[c] = (g.causes[c] || 0) + n; }
  const want = { kerb: 0.05, cobbles: 0.05, bumps: 0.05, roots: 0.05, pump: 0.05, sand: 0.05, slope: 0.1, jump: 0.05, bowl: 0.05, drop: 0.05, descent: 0.05 };
  for (const [g, lim] of Object.entries(want)) {
    const G = groups[g], pm = G ? G.crashes / (G.secs / 60) : NaN;
    check(`casual rider, ${g} (${G?.runs.join(", ")})`, G && pm <= lim, `${G?.crashes} crashes in ${G?.rides} rides (${f2(pm)} a minute)${G && G.crashes ? ": " + Object.entries(G.causes).map(([c, n]) => `${c} ${n}`).join(", ") : ""}`, `<= ${lim} a minute (old tuning: kerbs 6.5-8.8, sand turning 1.5, bowl carving 1.0)`);
  }
  const P = groups.plaza;
  check("casual rider, the plaza (a wall, posts, a car, a log: real hits allowed)", P && P.crashes / (P.secs / 60) < 1, `${P?.crashes} crashes in ${P?.rides} rides (${f2(P?.crashes / (P?.secs / 60))} a minute): ${Object.entries(P?.causes || {}).map(([c, n]) => `${c} ${n}`).join(", ")}`, "< 1 a minute, only real hits (old tuning 1.50, 11 of them 'landed sideways')");
  const soft = Object.entries(T.causes).filter(([c]) => !/hit a (wall|car|post)|front wheel hit the kerb/.test(c)).reduce((a, [, n]) => a + n, 0);
  check("casual rider: no soft crash anywhere (landing / wash-out / endo / loop-out)", soft <= 1, `${soft} (all causes: ${Object.entries(T.causes).map(([c, n]) => `${c} ${n}`).join(", ") || "none"}; ${f2(T.perMin)} crashes a minute in all)`, "<= 1 over every ride");
}

// ---------------------------------------------------------------- 1b. downhill speed is physical (owner 2026-11-26)
{
  // coasting down an endless 6 / 10 / 12 % slope: the terminal speed against the physics - gravity along the slope =
  // rolling resistance + air drag (v_t^2 = g (sin a - Crr cos a) / drag) - within 10 %; crouched it goes faster
  const term = (G, crouch = false) => { const env = createBikeEnv({ ground: groundQuery((x, z) => -G * z, () => SURF.asphalt) }); const s = spawn(env, 0, 0, 0); s.vz = 3; ride(s, env, () => ({ hop: crouch }), 90); return bikeSpeed(s); };
  const out = [], bad = [];
  for (const G of [0.06, 0.10, 0.12]) {
    const a = Math.atan(G), vt = Math.sqrt(BIKE.gravity * (Math.sin(a) - 0.010 * Math.cos(a)) / BIKE.drag), v = term(G);
    out.push(`${G * 100} %: ${f1(v * 3.6)} km/h (physics ${f1(vt * 3.6)})`); if (Math.abs(v / vt - 1) > 0.1) bad.push(G);
  }
  const vc = term(0.12, true), vu = term(0.12);
  check("downhill: coasting terminal speed = gravity vs rolling + air drag (within 10 %), no cap; crouched faster", !bad.length && vc > vu * 1.04,
    `${out.join("; ")}; 12 % crouched ${f1(vc * 3.6)} km/h`, "within 10 %, crouched > upright");
}

// ---------------------------------------------------------------- 2. the hard hits (and the gentle ones)
{
  const lab = labEnv();
  const at = (x, z, h, v, secs, input = () => ({ pedal: 0.3 }), env = lab, B = BIKE) => { const s = spawn(env, x, z, h, B); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v; return ride(s, env, input, secs, B); };
  const wall6 = at(0, WALL.z1 + 4, Math.PI, 6, 2), wall4 = at(0, WALL.z1 + 4, Math.PI, 4, 2);
  // (a glance: 20 deg to the wall's face = 70 deg from square, ridden into it)
  const hG = Math.PI / 2 + 20 * D, wallG = at(-6, WALL.z1 + 1.2, hG, 6, 1.5);
  check("hard hit: a wall head-on at 6 m/s = a crash; at 4 m/s, or glancing at 6 m/s (70 deg from square) = none", wall6.crashes === 1 && /wall/.test(wall6.crashCause) && wall4.crashes === 0 && wallG.crashes === 0 && wallG.hits > 0,
    `6 m/s: "${wall6.crashCause}"; 4 m/s: ${wall4.crashes} crashes; glance: ${wallG.crashes} crashes (${wallG.hits} contacts)`, "crash, 0, 0");
  const car6 = at(CAR.x - 5, CAR.z, Math.PI / 2, 6, 2);
  const post = POSTS[0], post6 = at(post.x, post.z + 4, Math.PI, 6, 2);
  check("hard hit: a car / a post (a tree) head-on at 6 m/s = a crash", /car/.test(car6.crashCause) && /post/.test(post6.crashCause), `car: "${car6.crashCause}", post: "${post6.crashCause}"`, "hit a car, hit a post");
  // touch-downs (the band rules: the air assists off so the attitude set is the one judged)
  const BA = { ...BIKE, airLevel: 0, airLevelDamp: 0, airAlign: 0 };
  const drop = (h, o = {}) => {
    const s = spawn(flat, 0, 0, o.yaw || 0, BA); s.y += h; s.vx = Math.sin(o.vel || 0) * 4; s.vz = Math.cos(o.vel || 0) * 4; s.pitch = o.pitch || 0; s.lean = o.lean || 0;
    s.air = true; s.airT = 0.5; s.contact[0] = s.contact[1] = false; s.sinceContact = 1;
    ride(s, flat, () => ({}), 2.5, BA);
    return s;
  };
  const n70 = drop(0.4, { pitch: -70 * D }), s55 = drop(0.4, { yaw: 55 * D }), f2m = drop(2, { pitch: -40 * D }), l2m = drop(2), h55 = drop(5.5), n30 = drop(0.4, { pitch: -30 * D }), s30 = drop(0.4, { yaw: 30 * D });
  check("hard landing: nose down 70 deg / sideways 55 deg / 2 m onto the front wheel (40 deg) / 5.5 m flat = a crash", n70.crashes && s55.crashes && f2m.crashes && h55.crashes,
    `"${n70.crashCause}", "${s55.crashCause}", "${f2m.crashCause}" (vn ${f1(f2m.lastLanding?.vn)}), "${h55.crashCause}"`, "over the bars, landed sideways, over the bars, hard landing");
  check("gentle landing: 2 m level, nose down 30 deg, sideways 30 deg = ridden (sketchy at most)", !l2m.crashes && !n30.crashes && !s30.crashes,
    `2 m: ${l2m.lastLanding?.band}; nose 30: ${n30.lastLanding?.band} (${n30.lastLanding?.why}); sideways 30: ${s30.lastLanding?.band}`, "no crash");
  // the player's override: Z (lean forward) held in the air off a 1.5 m ledge = a nose dive
  const ledge = createBikeEnv({ ground: groundQuery((x, z) => (z < 6 ? 1.5 : 0), () => SURF.asphalt) });
  const zHeld = at(0, 2, 0, 5, 2.5, (q) => ({ lean: q.air ? -1 : 0 }), ledge), hands = at(0, 2, 0, 5, 2.5, () => ({}), ledge);
  check("the player overrides the air assist: Z held off a 1.5 m ledge = over the bars; hands off = ridden", zHeld.crashes === 1 && /bars/.test(zHeld.crashCause) && hands.crashes === 0,
    `Z held: "${zHeld.crashCause}" (${f2(zHeld.lastLanding?.rel / D)} deg); hands off: ${hands.lastLanding?.band}`, "over the bars; no crash");
  // off a 2 m ledge at 6 m/s into a wall 3 m beyond its foot
  const wallPoly = [{ rings: [[[-5, 9], [5, 9], [5, 9.6], [-5, 9.6]]], kind: KIND.building }];
  const WC = buildColliders(wallPoly, [], { x0: -20, x1: 20, z0: -20, z1: 30 });
  const ledgeWall = createBikeEnv({ sets: () => [WC], ground: groundQuery((x, z) => (z < 6 ? 2 : 0), () => SURF.asphalt) });
  const lw = at(0, 1, 0, 6, 2.5, () => ({ pedal: 1 }), ledgeWall);
  check("hard hit: off a 2 m ledge into a wall = a crash", lw.crashes >= 1 && /wall/.test(lw.crashCause), `"${lw.crashCause}"`, "hit a wall");
  // faces: a 30 cm one at 22 km/h (over the bars), the 15 cm kerb at walking pace (stopped, no crash)
  const face = createBikeEnv({ ground: groundQuery((x, z) => (z > 5 ? 0.3 : 0), () => SURF.asphalt) });
  const f30 = at(0, 0, 0, 6, 2, () => ({}), face), k1 = at(15, KERB.z0 - 3, 0, 1.2, 4, () => ({}));
  check("faces: 30 cm at 22 km/h = over the bars; the 15 cm kerb at 1.2 m/s = stopped, no crash", /kerb/.test(f30.crashCause) && k1.crashes === 0 && k1.z < KERB.z0 && Math.abs(bikeSpeed(k1)) < 0.3,
    `30 cm: "${f30.crashCause}"; 15 cm slow: z ${f2(k1.z)} (the face at ${KERB.z0}), ${f2(bikeSpeed(k1))} m/s, ${k1.crashes} crashes`, "a crash; stopped");
}

// ---------------------------------------------------------------- 3. skill kept
{
  const lab = labEnv();
  // the 15 cm kerb at 4.5 m/s: rolled up vs a timed hop (crouch 0.3 s, released 0.2 s before the face)
  const kerb = (hop) => {
    const s = spawn(lab, 15, 12, 0); s.vz = 4.5; let held = false, done = false, v0 = 0;
    ride(s, lab, (q) => { const tl = (KERB.z0 - (q.z + BIKE.wheelbase / 2)) / Math.max(0.1, q.vz); if (q.z < KERB.z0 - 1.5) v0 = bikeSpeed(q); if (hop && !done && tl < 0.5 && tl > 0.2) held = true; if (held && tl <= 0.2) { held = false; done = true; } return { hop: held }; }, 3);
    return { s, loss: 1 - bikeSpeed(s) / v0, wob: s.wobbleT };
  };
  const roll = kerb(false), hop = kerb(true);
  check("skill: a hop over the 15 cm kerb keeps more speed than rolling it up", roll.s.crashes === 0 && hop.s.crashes === 0 && hop.loss < roll.loss - 0.04 && roll.s.climbs + roll.s.catches > 0,
    `rolled up: ${(roll.loss * 100).toFixed(0)} % slower (climbs ${roll.s.climbs}, catches ${roll.s.catches}, bonks ${roll.s.bonks}); hopped: ${(hop.loss * 100).toFixed(0)} %`, "hop loses >= 4 points less, no crash");
  // the kicker at 9.5 m/s: hands off vs crouched for the landing (Space held from the apex)
  const kick = (crouch) => { const s = spawn(lab, 0, 8, 0); s.vz = 9.5; ride(s, lab, (q) => ({ hop: crouch && q.air && q.vy < 0 }), 4); return s; };
  const kh = kick(false), kc = kick(true);
  check("skill: the kicker at 34 km/h: crouched for the landing beats hands off", kh.crashes === 0 && kc.crashes === 0 && (kc.lastLanding?.severity ?? 9) < (kh.lastLanding?.severity ?? 0),
    `hands off: ${kh.lastLanding?.band} (severity ${f2(kh.lastLanding?.severity)}, ${kh.lastLanding?.why}); crouched: ${kc.lastLanding?.band} (severity ${f2(kc.lastLanding?.severity)})`, "both ridden, the crouched landing less severe");
  const T = causesTable(Math.min(seeds, 16), ["kicker"]), K = T.byRun.kicker;
  check("skill: the casual rider's kicker landings are not all clean", K.sketchy > 0.15 * (K.clean + K.sketchy), `${K.clean} clean / ${K.sketchy} sketchy`, "> 15 % sketchy (hands off is not perfect)");
}

const ms = performance.now() - T0;
if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) if (!quiet || r[1] === "FAIL") console.log(`| ${r.join(" | ")} |`);
}
console.log(`\n${failed ? `${failed} forgiving-falls check(s) FAIL` : `all ${rows.length} forgiving-falls checks pass`} (${(ms / 1000).toFixed(1)} s, ${seeds} seeds)`);
process.exit(failed ? 1 : 0);
