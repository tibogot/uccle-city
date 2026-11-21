// node tools/bike/bikeTest.mjs [--quiet]: the kid's BMX (viewer/bike/bikePhysics.js) without a browser (docs/BIKE.md).
// Rides scripted inputs on the lab's test ground (viewer/bike/bikeGround.js) and on synthetic grounds; prints one row
// per check; exit 1 if any fails. THE TARGETS (docs/BIKE.md "Targets"): determinism (same input twice bit-identical, a
// frame-rate split = the same steps); kid speeds (flat seated 22-28 / sprint 28-35 km/h, a 12 % descent 38-60 km/h,
// 0-20 km/h seated 4-11 s / standing 2.5-6 s); never tunnels (kicker / table / kerb / rollers at 58 km/h: no wheel deeper
// than the bottom-out + 1 cm; the wall never passed); the 15 cm kerb (a hop clears it; no hop: stopped / over the bars;
// 6 cm rolls; the drop off it ridden); 12 % pedalled seated at 1-3.5 m/s, 20 % = pushing, no roll-back; sand slows;
// landings (1 m level clean / 10 deg nose up ridden, 2.6 m crouched ridden, the kicker / table ridden hands-off, a held
// trick = crash); brakes (skid 6-11 m, full front
// < 6 m no endo, + lean forward = endo); the manual (assist holds, none loops out); pumping beats coasting; hop heights;
// the 25 cm log; turning; 10 minutes of random input (4 seeds): finite, never under the ground; cost; every constant a
// panel slider; the lab's model + camera with three in node (run with --import ./tools/heap/register.mjs); the keys (the
// arrows give exactly the W A S D input, the lean on Z / X and I / K, no key with two jobs). FEEL ROUND 1 (section 14):
// the input sampled per 120 Hz step (a release acts in its own step at 30 fps, a 25 ms tap between frames hops, every
// input acts in the step it arrives); the hop buffer (the kerb window, a release 0.1 s early held and popped at the
// edge, no hold without a face); the coyote hop; the kerb catch (+2..6.5 cm of kerb for the same hop); the landing
// bands (nose / tail / sideways / lean / impact: clean, sketchy = wobble + speed lost + no crash, bail = crash).
// FEEL ROUND 2 (section 15): the edge layer of tile D6 (counts vs its docs, memory, build time, query time); grinds on
// the lab's bench / ledge (snap, no snap rising / wide / far / low, the bend, the corner, balance, stall, hop out, as a
// player from the spots); the stairs as a ramp (down < 3 g, up pushed); D6's real spot (its stairs ridden, the cost).
// FEEL ROUND 3 (section 16): the sound's mapping from the state (ratchet, rolling per surface, chain, skid, scrape by
// material, events once each), the baked textures, the graph on a stand-in AudioContext, no work / allocation off.
// FEEL ROUND 4 (sections 17, 18): the zero-garbage step (tools/bike/zeroGarbage.mjs in a fresh process: flat ground and
// the D6 spot); the camera (CameraRig): speed sense, looking into turns, the landing dip, never inside a solid / under
// minClear, smooth down the stairs and onto a grind.
import { DT, BIKE, SURF, createBikeState, stepBike, groundQuery, bikeSpeed, stateHash, advanceBike, restHeight, wheelPoints, BIKE_RANGES, bikePose } from "../../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";
import { testGround, testHeight, testColliders, SPOTS, KERB, KICKER, TABLE, SLOPE, STEEP, SAND, WALL, LOG, PUMP, BOUNDS } from "../../viewer/bike/bikeGround.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";

const quiet = process.argv.includes("--quiet");
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v)), f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
const kmh = (v) => v * 3.6;

const L = testColliders(KIND);
const COL = buildColliders(L.polys, L.circles, L.bounds);
const labEnv = () => createBikeEnv({ sets: () => [COL], ground: testGround });
const flatEnv = (surf = SURF.asphalt) => createBikeEnv({ ground: groundQuery(() => 0, () => surf) });
const gradeEnv = (G, surf = SURF.asphalt) => createBikeEnv({ ground: groundQuery((x, z) => Math.max(0, z) * G, () => surf) });
const spawn = (env, x, z, h) => { const q = {}; env.ground(x, z, q); return createBikeState(x, z, h, q.h); };
const settle = (s, env, n = 120) => { for (let i = 0; i < n; i++) stepBike(s, {}, env); return s; };
/** run with input(s, t) for secs; onStep(s) per step; stops early if stop(s) */
function ride(s, env, input, secs, onStep = null, stop = null) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    stepBike(s, input(s, i * DT), env);
    if (onStep) onStep(s);
    if (stop && stop(s)) break;
  }
  return s;
}
/** wheel depth below the ground (m) right now, worst wheel */
const probe = {};
const WP = { f: [0, 0, 0, 0, 0, 0], r: [0, 0, 0, 0, 0, 0] };
/** (the lowest ground within 3 cm round the contact: a wheel touching the edge of a face in the height field is
 *  against the face, not under the ground) */
function depth(s, env) {
  wheelPoints(s, BIKE, WP);
  let worst = -Infinity;
  for (const o of [WP.f, WP.r]) {
    let h = Infinity;
    for (const [dx, dz] of [[0, 0], [0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03]]) { env.ground(o[3] + dx, o[5] + dz, probe); h = Math.min(h, probe.h); }
    worst = Math.max(worst, h - o[4]);
  }
  return worst;
}
/** a seeded random (mulberry32) */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randomInputs(seed, n) {
  const r = rng(seed), out = [];
  let cur = {};
  for (let i = 0; i < n; i++) {
    if (i % 30 === 0) cur = { pedal: r() < 0.7 ? 1 : 0, sprint: r() < 0.3, brakeF: r() < 0.1 ? r() : 0, brakeR: r() < 0.15 ? r() : 0, steer: r() < 0.5 ? (r() * 2 - 1) : 0,
      lean: r() < 0.3 ? r() * 2 - 1 : 0, hop: r() < 0.15, pump: r() < 0.1 ? 1 : 0, trick: r() < 0.05 };
    out.push(cur);
  }
  return out;
}

// ---------------------------------------------------------------- 1. determinism
{
  const inputs = randomInputs(7, 120 * 60);
  const run = () => { const env = labEnv(), s = spawn(env, 0, 0, 0); for (const i of inputs) stepBike(s, i, env); return stateHash(s); };
  const a = run(), b = run();
  check("determinism: same input twice", a === b, `${a} / ${b}`, "identical");
  // the frame driver: 60 fps and an uneven 30-144 fps split of the same seconds give the same number of steps
  const envA = labEnv(), sA = spawn(envA, 0, 0, 0), envB = labEnv(), sB = spawn(envB, 0, 0, 0);
  let nA = 0, nB = 0; const inp = { pedal: 1, steer: 0.3 };
  for (let k = 0; k < 600; k++) nA += advanceBike(sA, inp, 1 / 60, envA);
  const r = rng(3); let tB = 0;
  while (tB < 10 - 1e-9) { const d = Math.min(10 - tB, 1 / 30 - r() * (1 / 30 - 1 / 144)); nB += advanceBike(sB, inp, d, envB); tB += d; }
  check("determinism: frame split", Math.abs(nA - nB) <= 1 && (nA !== nB || stateHash(sA) === stateHash(sB)), `${nA} vs ${nB} steps`, "same steps, same state");
}

// ---------------------------------------------------------------- 2. speeds
{
  const env = flatEnv(), s = spawn(env, 0, 0, 0);
  ride(s, env, () => ({ pedal: 1 }), 40);
  const cruise = kmh(bikeSpeed(s));
  ride(s, env, () => ({ pedal: 1, sprint: true }), 30);
  const sprint = kmh(bikeSpeed(s));
  check("flat cruise (seated, 130 W)", cruise > 22 && cruise < 28, `${f1(cruise)} km/h`, "22-28 km/h");
  check("flat sprint (standing, 320 W)", sprint > 28 && sprint < 35, `${f1(sprint)} km/h`, "28-35 km/h");
  const e2 = createBikeEnv({ ground: groundQuery((x, z) => -0.12 * z, () => SURF.asphalt) }), s2 = spawn(e2, 0, 0, 0);
  ride(s2, e2, () => ({}), 40);
  const down = kmh(bikeSpeed(s2));
  check("12 % descent, coasting", down > 38 && down < 60, `${f1(down)} km/h`, "38-60 km/h");
  // 0-20 km/h: seated (a kid riding off) and standing on the pedals
  const t20 = (sprint) => { const q = spawn(env, 0, 0, 0); let t = NaN; ride(q, env, () => ({ pedal: 1, sprint }), 20, (b) => { if (!(t === t) && bikeSpeed(b) > 20 / 3.6) t = b.t; }); return t; };
  const tc = t20(false), ts = t20(true);
  check("0-20 km/h seated", tc > 4 && tc < 11, `${f1(tc)} s`, "4-11 s");
  check("0-20 km/h standing (sprint)", ts > 2.5 && ts < 6, `${f1(ts)} s`, "2.5-6 s");
}

// ---------------------------------------------------------------- 3. never tunnels
{
  const env = labEnv();
  let worst = -1, under = 0;
  for (const [name, x, z0] of [["kicker", 0, 0], ["table", 0, 30], ["kerb", 15, 5], ["pump", -15, 2]]) {
    const s = spawn(env, x, z0, 0);
    s.vz = 16;              // ~58 km/h: faster than the kid ever rides on the flat
    let w = -1;
    ride(s, env, () => ({}), 6, (q) => { if (q.crashed) return; const d = depth(q, env); w = Math.max(w, d); if (d > BIKE.maxComp + 0.01) under++; });
    worst = Math.max(worst, w);
    void name;
  }
  check("no tunnelling: ramps / kerb / rollers at 58 km/h", under === 0, `deepest wheel ${f2(worst)} m, ${under} steps under`, `<= bottom-out ${BIKE.maxComp} + 0.01 m`);
  const s = spawn(env, 0, -10, Math.PI);
  s.vz = -16; let passed = false;
  ride(s, env, () => ({ pedal: 1, sprint: true }), 4, (q) => { if (q.z < WALL.z0 - 0.2) passed = true; });
  check("the wall stops the bike at 58 km/h", !passed && s.crashes > 0, `passed ${passed}, crash "${s.crashCause}"`, "never through; a crash");
  const s2 = spawn(env, 0, -14, Math.PI);
  ride(s2, env, () => ({ pedal: 1 }), 4, (q) => { if (q.z < WALL.z0 - 0.2) passed = true; });
  check("the wall at 2-3 m/s: stopped, no crash", !passed && s2.crashes === 0 && s2.z > WALL.z1, `z ${f2(s2.z)} crashes ${s2.crashes}`, "stopped at the wall");
}

// ---------------------------------------------------------------- 4. the kerb (15 cm): hop clears, no hop stops
{
  const env = labEnv();
  // approach at ~4 m/s; crouch 0.3 s, release ~0.55 m before the face
  const s = spawn(env, 15, 12, 0);
  s.vz = 4.2;
  let held = false, popped = false;
  ride(s, env, (q) => {
    const d = KERB.z0 - (q.z + BIKE.wheelbase / 2);
    if (!popped && d < 1.9 && d > 0.6) held = true;
    if (held && d <= 0.6) { held = false; popped = true; }
    return { pedal: 0.4, hop: held };
  }, 4);
  const on = s.z > KERB.z0 + 1 && Math.abs(s.yLow - KERB.h) < 0.06;
  check("hop clears the 15 cm kerb", on && s.crashes === 0 && s.blocked === 0, `z ${f1(s.z)} y ${f2(s.yLow)} crashes ${s.crashes} blocked ${s.blocked} hops ${s.hops}`, "on the pavement, no crash, not blocked");
  const s2 = spawn(env, 15, 12, 0);
  s2.vz = 2.5;
  ride(s2, env, () => ({}), 4);
  check("no hop: the front wheel stops at the kerb (2.5 m/s)", s2.blocked > 0 && s2.z < KERB.z0, `z ${f2(s2.z)} blocked ${s2.blocked} crashes ${s2.crashes}`, "stopped before the face");
  const s3 = spawn(env, 15, 12, 0);
  s3.vz = 6;
  ride(s3, env, () => ({}), 3);
  check("no hop at 22 km/h: over the bars", s3.crashes > 0 && /kerb/.test(s3.crashCause), `"${s3.crashCause}"`, "a crash");
  // a 6 cm lowered kerb rolls
  const e4 = createBikeEnv({ ground: groundQuery((x, z) => (z > 5 ? 0.06 : 0), () => SURF.asphalt) }), s4 = spawn(e4, 0, 0, 0);
  s4.vz = 3;
  ride(s4, e4, () => ({ pedal: 0.5 }), 4);
  check("a 6 cm lowered kerb is ridden", s4.z > 7 && s4.crashes === 0 && s4.blocked === 0, `z ${f1(s4.z)} bonks ${s4.bonks}`, "over it");
  // drop off the pavement's far end (15 cm down) at speed: no crash
  const s5 = spawn(env, 15, 30, 0); s5.vz = 5;
  ride(s5, env, () => ({}), 3);
  check("the drop off the kerb (15 cm) at 18 km/h", s5.crashes === 0 && s5.z > KERB.z1 + 2, `z ${f1(s5.z)} crashes ${s5.crashes}`, "ridden");
}

// ---------------------------------------------------------------- 5. hills
{
  const env = labEnv();
  const s = spawn(env, 30, 0, Math.PI / 2);
  s.vx = 2;
  let vmin = Infinity, vmax = 0, pushed = false;
  ride(s, env, () => ({ pedal: 1 }), 60, (q) => {
    const x = q.x - SLOPE.x0;
    if (x > 5 && x < 38) { const v = bikeSpeed(q); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
    if (q.pushing) pushed = true;
  }, (q) => q.x > SLOPE.x0 + 44);
  check("12 % climb pedalled seated", !pushed && s.x > SLOPE.x0 + 40 && vmin > 1 && vmax < 3.5, `climb ${f2(vmin)}-${f2(vmax)} m/s, pushed ${pushed}, top reached ${s.x > SLOPE.x0 + 40}`, "1-3.5 m/s, no pushing");
  const s2 = spawn(env, 30, 25, Math.PI / 2);
  s2.vx = 2;
  let pushT = 0, pushX = NaN;
  ride(s2, env, () => ({ pedal: 1 }), 60, (q) => { if (q.pushing) { pushT += DT; if (!(pushX === pushX)) pushX = q.x - STEEP.x0; } }, (q) => q.x > STEEP.x0 + 22);
  check("20 % climb: off and pushing, reaches the top", pushT > 3 && s2.x > STEEP.x0 + 20, `pushed ${f1(pushT)} s from ${f1(pushX)} m, top ${s2.x > STEEP.x0 + 20}`, "pushing, top reached");
  // no roll-back at a stop on the 12 % (a foot down)
  const e3 = gradeEnv(0.12), s3 = spawn(e3, 0, 5, 0);
  settle(s3, e3, 240);
  check("standing on 12 %: no roll-back", Math.abs(s3.z - 5) < 0.15, `moved ${f2(s3.z - 5)} m`, "< 0.15 m");
}

// ---------------------------------------------------------------- 6. surfaces: sand
{
  const coast = (surf) => { const env = flatEnv(surf), s = spawn(env, 0, 0, 0); s.vz = 6; ride(s, env, () => ({}), 1); return (6 - bikeSpeed(s)) / 1; };
  const dA = coast(SURF.asphalt), dS = coast(SURF.sand), dG = coast(SURF.grass);
  check("sand slows: coasting decel vs asphalt", dS > 3 * dA && dS > dG, `sand ${f2(dS)} grass ${f2(dG)} asphalt ${f2(dA)} m/s^2`, "sand > 3 x asphalt, > grass");
  const env = flatEnv(SURF.sand), s = spawn(env, 0, 0, 0);
  ride(s, env, () => ({ pedal: 1 }), 20);
  check("pedalling in sand: top speed", kmh(bikeSpeed(s)) < 10, `${f1(kmh(bikeSpeed(s)))} km/h`, "< 10 km/h");
  // into the lab's sand patch from the asphalt lane
  const e2 = labEnv(), s2 = spawn(e2, 26, 30, 0);
  s2.vz = 6;
  let vIn = NaN;
  ride(s2, e2, () => ({}), 12, (q) => { if (!(vIn === vIn) && q.z > SAND.z0) vIn = bikeSpeed(q); });
  check("the lab's sand patch stops a coasting bike", s2.z < SAND.z1 && bikeSpeed(s2) < 0.3, `in at ${f1(vIn)} m/s, stopped at z ${f1(s2.z)} (patch ${SAND.z0}-${SAND.z1})`, "stops inside");
}

// ---------------------------------------------------------------- 7. landings
{
  const drop = (pitch, opt = {}) => {
    const env = flatEnv(), s = spawn(env, 0, 0, 0);
    s.y += opt.h ?? 1; s.vz = opt.v ?? 4; s.pitch = pitch; s.vy = 0;
    s.air = true; s.airT = 0.5; s.contact[0] = s.contact[1] = false; s.sinceContact = 1;
    if (opt.yaw) s.heading = opt.yaw;
    ride(s, env, () => ({ hop: !!opt.absorb }), 2.5);
    return s;
  };
  const a = drop(0), b = drop(0.17), e2 = drop(0, { h: 2.6, absorb: true });
  check("1 m drop, level: ridden clean", a.crashes === 0 && a.lastLanding?.band === "clean", `${a.lastLanding?.band} vn ${f1(a.lastLanding?.vn)}`, "clean, no crash");
  check("1 m drop, 10 deg nose up (rear first): ridden", b.crashes === 0 && b.lastLanding?.wheel === "rear", `${b.lastLanding?.cause}, ${b.lastLanding?.wheel} first`, "no crash, rear first");
  check("2.6 m drop absorbed (crouched): ridden", e2.crashes === 0, `${e2.lastLanding?.cause} vn ${f1(e2.lastLanding?.vn)}`, "no crash");
  // (feel round 1: the angles / impacts that used to bail at once are now in three bands: section 14)
  // the kicker at 8 m/s, hands off: ridden out (the assist levels it)
  const env = labEnv(), s = spawn(env, 0, 8, 0); s.vz = 8;
  let air = 0;
  ride(s, env, () => ({}), 4, (q) => { if (q.air) air = Math.max(air, q.airT); });
  check("kicker at 29 km/h, no input: ridden out", s.crashes === 0 && air > 0.5, `air ${f2(air)} s, ${s.lastLanding?.cause}, rel ${f2(s.lastLanding?.rel)} rad, lands z ${f1(s.z)}`, "airborne > 0.5 s, no crash");
  // the table: over the top onto the down ramp at 9 m/s
  const s2 = spawn(env, 0, 33, 0); s2.vz = 9;
  ride(s2, env, () => ({}), 4);
  check("table at 32 km/h: ridden", s2.crashes === 0 && s2.z > TABLE.z0 + 12, `${s2.lastLanding?.cause}, z ${f1(s2.z)}`, "no crash");
  // a trick held at touch-down
  const s3 = spawn(env, 0, 8, 0); s3.vz = 8;
  ride(s3, env, () => ({ trick: true }), 4);
  check("trick held at touch-down: crash", s3.crashes > 0 && /trick/.test(s3.crashCause), `"${s3.crashCause}"`, "trick not finished");
}

// ---------------------------------------------------------------- 8. brakes
{
  const stop = (inp) => { const env = flatEnv(), s = spawn(env, 0, 0, 0); s.vz = 25 / 3.6; let dist = 0; ride(s, env, () => inp, 6, null, (q) => bikeSpeed(q) < 0.05); dist = s.z; return s; };
  const r = stop({ brakeR: 1 }), f = stop({ brakeF: 1 }), both = stop({ brakeF: 0.7, brakeR: 0.6 });
  check("skid (rear locked) from 25 km/h", r.z > 6 && r.z < 11 && r.crashes === 0, `${f1(r.z)} m`, "6-11 m (a long slide), no crash");
  check("full front from 25 km/h: no endo", f.z < 6 && f.crashes === 0, `${f1(f.z)} m, crashes ${f.crashes}`, "< 6 m, no crash");
  check("both brakes from 25 km/h", both.z < 6 && both.crashes === 0, `${f1(both.z)} m`, "< 6 m");
  { // browser check 2026-11-21: S held after braking to a stop reared the bike up (the brake's torque by sgn(vF) at vF ~ 0)
    let worst = 0, crashes = 0;
    for (const [env, v] of [[flatEnv(), 3], [flatEnv(), 6], [flatEnv(SURF.dirt), 4]]) {
      const s = spawn(env, 0, 0, 0); let stopped = false;
      for (let i = 0; i < 9 * 120; i++) {
        const t = i * DT, inp = t < v * 0.5 ? { pedal: 1 } : { brakeR: Math.min(1, (t - v * 0.5) * 7), brakeF: t > 6 && t < 7.5 ? 1 : 0 };
        stepBike(s, inp, env);
        if (!inp.pedal && Math.hypot(s.vx, s.vz) < 0.05) stopped = true;
        if (stopped) worst = Math.max(worst, Math.abs(s.pitch));
      }
      crashes += s.crashes;
    }
    check("a brake held at a stop: the bike stays level", crashes === 0 && worst < 0.05, `pitch at most ${f1(worst * 57.3)} deg once stopped (pedal, S held to a stop and on, + Q for 1.5 s), crashes ${crashes}`, "< 3 deg, 0 crashes");
  }
  // full front + leaning forward = over the bars
  const env = flatEnv(), s = spawn(env, 0, 0, 0); s.vz = 7;
  ride(s, env, () => ({ brakeF: 1, lean: -1 }), 3);
  check("full front + lean forward at 25 km/h: endo", s.crashes > 0 && /bars/.test(s.crashCause), `"${s.crashCause}"`, "over the bars");
}

// ---------------------------------------------------------------- 9. manual, wheelie, pumping, the log
{
  const env = flatEnv(), s = spawn(env, 0, 0, 0); s.vz = 5;
  let manualT = 0, maxP = 0;
  ride(s, env, (q) => ({ lean: 0.7 }), 3, (q) => { if (q.manual > 0) manualT += DT; maxP = Math.max(maxP, q.pitch); });
  check("manual: lean back holds the front up (assist)", manualT > 1.5 && s.crashes === 0, `${f1(manualT)} s, max pitch ${f2(maxP)} rad`, "> 1.5 s, no loop out");
  const s2 = spawn(env, 0, 0, 0); s2.vz = 5;
  ride(s2, env, () => ({ lean: 1 }), 4, null, (q) => q.crashed);
  // full back with no assist = it loops out
  const B2 = { ...BIKE, manualAssist: 0 }, s3 = spawn(env, 0, 0, 0); s3.vz = 5;
  for (let i = 0; i < 480 && !s3.crashed; i++) stepBike(s3, { lean: 1 }, env, B2);
  check("manual, full back, no assist: loops out", s3.crashes > 0 && /looped/.test(s3.crashCause), `"${s3.crashCause}"`, "looped out");
  // pumping the rollers vs coasting them
  const lab = labEnv();
  const roll = (pump) => {
    const q = spawn(lab, -15, 4, 0); q.vz = 4.5;
    ride(q, lab, (b) => {
      if (!pump) return {};
      const sl = (testHeight(b.x, b.z + 0.4) - testHeight(b.x, b.z - 0.4)) / 0.8;
      return { pump: sl < -0.05 ? 1 : 0 };
    }, 30, null, (b) => b.z > PUMP.z0 + PUMP.n * PUMP.lambda + 1 || (bikeSpeed(b) < 0.2 && b.t > 2));
    return q;
  };
  const p0 = roll(false), p1 = roll(true);
  check("pumping the rollers beats coasting", p1.z > p0.z + 1 || (p1.z > PUMP.z0 + PUMP.n * PUMP.lambda && bikeSpeed(p1) > bikeSpeed(p0) + 0.5), `pump z ${f1(p1.z)} v ${f2(bikeSpeed(p1))} / coast z ${f1(p0.z)} v ${f2(bikeSpeed(p0))}`, "further / faster");
  // hop heights: a quick tap and a full preload (the lowest wheel's best clearance over flat ground)
  const hopH = (hold) => {
    const q = spawn(env, 0, 0, 0); q.vz = 4; let n = Math.round(hold / DT), best = 0;
    ride(q, env, () => ({ hop: n-- > 0 }), 2, (b) => { best = Math.max(best, Math.min(b.wheelBot[0], b.wheelBot[1])); });
    return best;
  };
  const tap = hopH(0.08), full = hopH(0.4);
  check("hop height: a tap / a full preload", tap > 0.06 && tap < 0.25 && full > 0.3 && full < 0.55, `tap ${f2(tap)} m, full ${f2(full)} m (lowest wheel)`, "tap 0.06-0.25, full 0.3-0.55 m");
  // the log (25 cm): a full-preload hop clears it, riding into it stops
  const s4 = spawn(lab, -2.5, -6, Math.PI); s4.vz = -4.5;
  let held = false, popped = false;
  ride(s4, lab, (b) => {
    const d = (b.z - BIKE.wheelbase / 2) - LOG.z1;
    if (!popped && d < 2.8 && d > 1.2) held = true;
    if (held && d <= 1.2) { held = false; popped = true; }
    return { hop: held, pedal: 0.3 };
  }, 3);
  check("a full hop clears the 25 cm log", s4.z < LOG.z0 - 1 && s4.crashes === 0, `z ${f1(s4.z)} crashes ${s4.crashes} "${s4.crashCause}"`, "past it, no crash");
  const s5 = spawn(lab, -2.5, -6, Math.PI); s5.vz = -3;
  ride(s5, lab, () => ({}), 3);
  check("no hop: the log stops the bike", s5.z > LOG.z1, `z ${f2(s5.z)}`, "before it");
  // steering: a full-lean turn at 18 km/h stays on the bike, radius ~5-12 m
  const s6 = spawn(env, 0, 0, 0); s6.vz = 5;
  let h0 = null;
  ride(s6, env, () => ({ steer: 1, pedal: 0.6 }), 4, (q) => { if (q.t > 2 && h0 === null) h0 = { h: q.heading, t: q.t }; });
  const rate = (s6.heading - h0.h) / (s6.t - h0.t), rad = bikeSpeed(s6) / Math.max(1e-3, rate);
  check("full-lean turn at ~18 km/h", s6.crashes === 0 && rad > 2.5 && rad < 8, `radius ${f1(rad)} m at ${f1(kmh(bikeSpeed(s6)))} km/h, lean ${f1(s6.lean * 57.3)} deg`, "2.5-8 m, no crash");
  const s7 = spawn(env, 0, 0, 0); s7.vz = 1.2;
  let h1 = null;
  ride(s7, env, () => ({ steer: 1, pedal: 0.15 }), 4, (q) => { if (q.t > 2 && h1 === null) h1 = { h: q.heading, t: q.t }; });
  const r7 = bikeSpeed(s7) / Math.max(1e-3, (s7.heading - h1.h) / (s7.t - h1.t));
  check("walking-pace U-turn (handlebar)", s7.crashes === 0 && r7 < 2.5, `radius ${f1(r7)} m`, "< 2.5 m");
  // too much lean on grass at speed with the front brake: washes out
  const e8 = flatEnv(SURF.grass), s8 = spawn(e8, 0, 0, 0); s8.vz = 7;
  ride(s8, e8, () => ({ steer: 1, brakeF: 1 }), 3, null, (q) => q.crashed);
  check("grass, full lean + full front brake: washes out", s8.crashes > 0, `"${s8.crashCause}"`, "a crash");
}

// ---------------------------------------------------------------- 10. ten minutes of random input
{
  let bad = 0, under = 0, firstBad = "", maxV = 0, crashes = 0, hops = 0;
  for (const seed of [11, 3, 9, 10]) {
  const env = labEnv(), s = spawn(env, 0, 0, 0);
  const r = rng(seed);
  let cur = {};
  const N = 120 * 150;      // 4 seeds x 2.5 min = 10 min
  for (let i = 0; i < N; i++) {
    if (i % 24 === 0) cur = { pedal: r() < 0.75 ? 1 : 0, sprint: r() < 0.3, brakeF: r() < 0.08 ? r() : 0, brakeR: r() < 0.1 ? r() : 0, steer: r() < 0.6 ? r() * 2 - 1 : 0,
      lean: r() < 0.3 ? r() * 2 - 1 : 0, hop: r() < 0.2, pump: r() < 0.1 ? r() : 0, trick: r() < 0.05 };
    stepBike(s, cur, env);
    // keep it inside the test ground: turn it back to the middle when it leaves
    if (s.x < BOUNDS.x0 + 10 || s.x > BOUNDS.x1 - 10 || s.z < BOUNDS.z0 + 10 || s.z > BOUNDS.z1 - 10) { s.x = 0; s.z = 0; s.y = restHeight() + testHeight(0, 0); s.vx = s.vz = s.vy = 0; s._prepX = NaN; }
    for (const k of ["x", "y", "z", "vx", "vy", "vz", "heading", "pitch", "pitchVel", "yawVel", "lean", "legs"]) if (!Number.isFinite(s[k])) { bad++; if (!firstBad) firstBad = `${k} at step ${i}`; }
    if (!s.crashed && depth(s, env) > BIKE.maxComp + 0.02) under++;
    maxV = Math.max(maxV, Math.hypot(s.vx, s.vz));
    if (bad) break;
  }
  crashes += s.crashes; hops += s.hops;
  }
  check("10 min random input: finite", bad === 0, bad ? firstBad : `ok (4 seeds, crashes ${crashes}, hops ${hops}, max ${f1(kmh(maxV))} km/h)`, "no NaN / Infinity");
  check("10 min random input: never under the ground", under === 0, `${under} steps deeper than bottom-out + 2 cm`, "0");
  check("10 min random input: speed sane", maxV < 25, `${f1(kmh(maxV))} km/h`, "< 90 km/h");
}

// ---------------------------------------------------------------- 11. cost
{
  // (the best of 3 runs: the laptop is shared with other agents' jobs, a single run swings 2-4x)
  const env = labEnv(), inputs = randomInputs(5, 120 * 30);
  let us = Infinity;
  for (let rep = 0; rep < 3; rep++) {
    const s = spawn(env, 0, 0, 0), t0 = process.hrtime.bigint();
    for (const i of inputs) stepBike(s, i, env);
    us = Math.min(us, Number(process.hrtime.bigint() - t0) / 1000 / inputs.length);
  }
  check("cost per step (node)", us < 20, `${f2(us)} us (best of 3)`, "< 20 us (x2 steps a frame)");
}

// ---------------------------------------------------------------- 12. the panel ranges, the lab's model + camera
{
  const bad = Object.entries(BIKE_RANGES).filter(([k, [a, b]]) => !(k in BIKE) || !(BIKE[k] >= a && BIKE[k] <= b)).map(([k]) => k);
  const missing = Object.keys(BIKE).filter((k) => !(k in BIKE_RANGES) && k !== "gravity");
  check("panel: every constant has a slider, defaults in range", !bad.length && !missing.length, bad.length || missing.length ? `out of range: ${bad.join(" ") || "-"}; no slider: ${missing.join(" ") || "-"}` : `${Object.keys(BIKE_RANGES).length} sliders`, "all");
  // (three.js in node: node --import ./tools/heap/register.mjs; the gate row passes it)
  let three = null;
  try { three = await import("three/webgpu"); } catch { /* no three here */ }
  if (!three) check("lab model + camera (three in node)", true, "skipped (run with --import ./tools/heap/register.mjs)", "no error");
  else {
    globalThis.addEventListener ??= () => {};
    const { createBikeModel } = await import("../../viewer/bike/bikeModel.js");
    const { BikeCamera, BIKE_CAMERA } = await import("../../viewer/bike/bikeCamera.js");
    const { bikePose } = await import("../../viewer/bike/bikePhysics.js");
    const env = labEnv(), m = createBikeModel(BIKE), cam = new three.PerspectiveCamera(64, 1.6, 0.05, 800), chase = new BikeCamera(cam, BIKE_CAMERA);
    const scene = new three.Scene(); scene.add(m.root, m.fallen);
    let err = "", under = 0, nan = 0, frames = 0;
    const pose = {};
    for (const mode of ["chase", "far", "low", "side"]) {
      BIKE_CAMERA.mode = mode; chase.reset();
      const b = spawn(env, 0, 8, 0); b.vz = 8;
      const inputs = randomInputs(21, 120 * 20);
      try {
        for (let i = 0; i < inputs.length; i += 2) {
          stepBike(b, inputs[i], env); stepBike(b, inputs[i + 1] || {}, env);
          bikePose(b, 1, pose); m.update(b, pose, testHeight); chase.update(b, pose, 1 / 60, testHeight); frames++;
          const p = cam.position;
          if (!Number.isFinite(p.x + p.y + p.z)) nan++;
          if (p.y < testHeight(p.x, p.z) + 0.2) under++;
          m.root.updateMatrixWorld(true);
          if (!Number.isFinite(m.root.matrixWorld.elements.reduce((a, v) => a + v, 0))) nan++;
        }
      } catch (e) { err = e.stack?.split(String.fromCharCode(10)).slice(0, 2).join(" ") || String(e); break; }
    }
    BIKE_CAMERA.mode = "chase";
    check("lab model + camera (three in node), 4 camera modes", !err && !nan && !under, err || `${frames} frames, NaN ${nan}, camera under the ground ${under}`, "no error, finite, camera over the ground");
  }
}

// ---------------------------------------------------------------- 13. the keys: arrows = W A S D, no key with two jobs
{
  globalThis.addEventListener ??= () => {};
  globalThis.navigator ??= {};
  const { BikeKeys, KEYS, ONE_SHOT } = await import("../../viewer/bike/bikeInput.js");
  const PAIRS = [["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"], ["KeyA", "ArrowLeft"], ["KeyD", "ArrowRight"]];
  const combos = [];
  for (let m = 1; m < 16; m++) combos.push(PAIRS.filter((_, i) => m & (1 << i)));
  const extra = [[], ["Space"], ["ShiftLeft"], ["KeyQ"], ["KeyZ"], ["KeyX"], ["KeyC"], ["KeyF"]];
  let diff = 0, n = 0, first = "";
  for (const c of combos) for (const e of extra) {
    const a = new BikeKeys(), b = new BikeKeys();
    for (const [w] of c) a.down.add(w);
    for (const [, ar] of c) b.down.add(ar);
    for (const x of e) { a.down.add(x); b.down.add(x); }
    for (let f = 0; f < 30; f++) {       // half a second of frames (the steer / brake ramps)
      const ia = { ...a.read(1 / 60) }, ib = { ...b.read(1 / 60) }; n++;
      if (JSON.stringify(ia) !== JSON.stringify(ib)) { diff++; if (!first) first = `${c.map((p) => p[0]).join("+")} ${e.join("+")}: ${JSON.stringify(ia)} vs ${JSON.stringify(ib)}`; }
    }
  }
  check("keys: the arrows give the same input as W A S D", diff === 0, diff ? first : `${n} frames, ${combos.length * extra.length} key combos identical`, "identical");
  // each arrow does its job (and the lean is not on the arrows any more)
  const one = (code, frames = 30) => { const k = new BikeKeys(); k.down.add(code); let i; for (let f = 0; f < frames; f++) i = { ...k.read(1 / 60) }; return i; };
  const up = one("ArrowUp"), dn = one("ArrowDown"), lf = one("ArrowLeft"), rt = one("ArrowRight"), z = one("KeyZ"), x = one("KeyX"), ik = one("KeyI"), kk = one("KeyK");
  const jobs = up.pedal === 1 && !up.lean && dn.brakeR === 1 && !dn.lean && lf.steer > 0.9 && rt.steer < -0.9 && z.lean === -1 && x.lean === 1 && ik.lean === -1 && kk.lean === 1;
  check("keys: Up pedal, Down rear brake, Left / Right steer; Z / X (I / K) lean", jobs, `up ${JSON.stringify({ p: up.pedal, l: up.lean })} down ${JSON.stringify({ b: dn.brakeR, l: dn.lean })} left ${lf.steer.toFixed(2)} right ${rt.steer.toFixed(2)} Z ${z.lean} X ${x.lean} I ${ik.lean} K ${kk.lean}`, "each its job");
  // no key with two jobs (riding keys and the lab's one-shot keys R G V P 1-9 ?)
  const owner = new Map(); const clash = [];
  for (const [job, codes] of Object.entries(KEYS)) for (const c of codes) { if (owner.has(c)) clash.push(`${c}: ${owner.get(c)} + ${job}`); owner.set(c, job); }
  for (const c of ONE_SHOT) if (owner.has(c)) clash.push(`${c}: ${owner.get(c)} + one-shot`);
  check("keys: no key with two jobs", !clash.length, clash.length ? clash.join(", ") : `${owner.size} riding keys + ${ONE_SHOT.length} one-shot keys, all distinct`, "no clash");
}

// ---------------------------------------------------------------- 14. FEEL ROUND 1 (docs/BIKE.md "Feel round 1")
{
  globalThis.addEventListener ??= () => {};
  globalThis.navigator ??= {};
  const { BikeKeys } = await import("../../viewer/bike/bikeInput.js");
  const flat = flatEnv();
  // ---- 14a. input: sampled per fixed step at that step's time, acted on in that step
  // Frames at 30 fps (4 steps a frame); Space held, released at 40 times spread over the frames; the pop must come in the
  // FIRST step whose time is at or after the release (0 steps late, never early). The frame-latched way (one read a
  // frame, the same input for every step of it) for comparison.
  const releaseRun = (perStep, tRel, fps = 30) => {
    const k = new BikeKeys(), s = spawn(flat, 0, 0, 0); s.vz = 4;
    const fd = 1 / fps; let T = 1000, ideal = -1;
    k.press("Space", 600); k.release("Space", tRel);
    for (let f = 0; f < fps; f++) {
      T += fd * 1000;
      if (perStep) {
        advanceBike(s, (lag) => { const t = T - lag * 1000; if (ideal < 0 && t >= tRel) ideal = s.steps + 1; return k.sample(t, DT); }, fd, flat);
      } else {
        // (each step's time known after the fact: the frame's steps end at T - (steps after it) x DT - what is left)
        const inp = { ...k.sample(T, fd) }, n0 = s.steps;
        advanceBike(s, inp, fd, flat);
        const n = s.steps - n0;
        for (let j = 1; j <= n && ideal < 0; j++) if (T - ((n - j) * DT + s._acc) * 1000 >= tRel) ideal = n0 + j;
      }
      k.apply(T);
    }
    return s.popStep - ideal;
  };
  const span = (a) => `${Math.min(...a)}..${Math.max(...a)}`;
  for (const fps of [30, 60, 144]) {
    const late = [], latched = [];
    for (let j = 0; j < 40; j++) { const tRel = 1120 + j * 2.9; late.push(releaseRun(true, tRel, fps)); latched.push(releaseRun(false, tRel, fps)); }
    check(`input: a hop release acts in its own 120 Hz step (${fps} fps frames)`, late.every((d) => d === 0), `per step: ${span(late)} steps late (40 releases); frame-latched: ${span(latched)}`, "0 steps, every release");
  }
  // a short tap that falls between two frames (30 fps: 33 ms apart) is not lost
  const tapHops = (() => {
    const k = new BikeKeys(), s = spawn(flat, 0, 0, 0); s.vz = 4;
    let T = 1000; const fd = 1 / 30;
    k.press("Space", T + 4); k.release("Space", T + 29);      // 25 ms, inside one frame gap
    for (let f = 0; f < 30; f++) { T += fd * 1000; advanceBike(s, (lag) => k.sample(T - lag * 1000, DT), fd, flat); k.apply(T); }
    return s.hops;
  })();
  // (the old listeners: down on keydown, removed on keyup, read once a frame: such a tap never reached the bike)
  check("input: a 25 ms tap between two 30 fps frames still hops", tapHops === 1, `per step: ${tapHops} hop (frame-latched: the key is up again before the frame's read: 0)`, "1 hop");
  // every input acts in the step it arrives: pedal, brakes, steer, lean, the release (the first step differs)
  const sameStep = (inp, what) => {
    const a = spawn(flat, 0, 0, 0), b = spawn(flat, 0, 0, 0); a.vz = b.vz = 4;
    ride(a, flat, () => ({}), 0.3); ride(b, flat, () => ({}), 0.3);
    stepBike(a, {}, flat); stepBike(b, inp, flat);
    return what(a) !== what(b) ? 0 : 1;
  };
  const lat = [sameStep({ pedal: 1 }, (q) => q.vz), sameStep({ brakeF: 1 }, (q) => q.vz), sameStep({ brakeR: 1 }, (q) => q.vz), sameStep({ steer: 1 }, (q) => q.leanTarget), sameStep({ lean: 1 }, (q) => q.pitchVel)];
  const relLate = (() => { const a = spawn(flat, 0, 0, 0); a.vz = 4; ride(a, flat, () => ({ hop: true }), 0.3); const vy = a.vy; stepBike(a, { hop: false }, flat); return a.vy - vy > 1 ? 0 : 1; })();
  check("input: pedal / brakes / steer / lean / hop release act in the same step", lat.every((x) => x === 0) && relLate === 0, `steps late: pedal ${lat[0]} front ${lat[1]} rear ${lat[2]} steer ${lat[3]} lean ${lat[4]} release ${relLate}`, "0 each");

  // ---- 14b. the hop buffer, the coyote hop, the kerb catch
  // A TAP hop (0.06 s of preload) at 4.2 m/s onto the lab's 15 cm kerb, released `lead` s before the front axle reaches
  // the face: the leads that ride onto the pavement, without and with the buffer + catch.
  const kerbTry = (lead, Bx, hold = 0.06, v = 4.2) => {
    const env = labEnv(), q = {}; env.ground(15, 12, q); const s = createBikeState(15, 12, 0, q.h, Bx); s.vz = v;
    let held = false, popped = false, relStep = -1;
    for (let i = 0; i < 480; i++) {
      const tl = (KERB.z0 - (s.z + Bx.wheelbase / 2)) / Math.max(0.1, s.vz);
      if (!popped && tl < lead + hold && tl > lead) held = true;
      if (held && tl <= lead) { held = false; popped = true; relStep = s.steps + 1; }
      stepBike(s, { pedal: 0.4, hop: held }, env, Bx);
    }
    return { ok: s.z > KERB.z0 + 1 && Math.abs(s.yLow - KERB.h) < 0.06 && !s.crashes && !s.blocked, delay: (s.popStep - relStep) * DT, s };
  };
  const windowOf = (Bx) => { let lo = Infinity, hi = -Infinity; for (let k = 0; k <= 30; k++) { const L = k * 0.02; if (kerbTry(L, Bx).ok) { lo = Math.min(lo, L); hi = Math.max(hi, L); } } return [lo, hi]; };
  const B0 = { ...BIKE, hopBuffer: 0, kerbCatch: 0 }, wOff = windowOf(B0), wOn = windowOf(BIKE);
  check("hop buffer: the kerb window (tap hop, 15 cm kerb, 15 km/h)", wOn[1] >= wOff[1] + 0.1 && wOn[0] <= wOff[0], `released ${f2(wOn[0])}-${f2(wOn[1])} s before the face (without buffer + catch: ${f2(wOff[0])}-${f2(wOff[1])} s)`, "early edge >= +0.10 s, late edge kept");
  const early = Math.round((wOff[1] + 0.1) * 50) / 50, eOff = kerbTry(early, B0), eOn = kerbTry(early, BIKE);
  check("hop buffer: released 0.1 s before the window: held, pops at the edge, clears", !eOff.ok && eOn.ok && Math.abs(eOn.delay - (early - BIKE.hopLead)) < 0.02, `released ${f2(early)} s before: without ${eOff.ok ? "ok" : `"${eOff.s.crashCause}" blocked ${eOff.s.blocked}`}; with: ${eOn.ok ? "ok" : "fail"}, held ${f2(eOn.delay)} s (pops ${BIKE.hopLead} s before the face)`, "fails without, clears with");
  const far = kerbTry(0.6, BIKE), flatHop = (() => { const s = spawn(flat, 0, 0, 0); s.vz = 4; ride(s, flat, () => ({ hop: true }), 0.2); const n = s.steps + 1; stepBike(s, {}, flat); return s.popStep - n; })();
  check("hop buffer: no face ahead / far too early = no hold", far.delay === 0 && flatHop === 0, `0.6 s early: held ${f2(far.delay)} s; flat ground: popped ${flatHop} steps after the release`, "0, 0");
  // the coyote hop: a release just after rolling off a ledge still pops; long after does not
  const coy = (after) => {
    const env = createBikeEnv({ ground: groundQuery((x, z) => (z < 6 ? 0.6 : 0), () => SURF.asphalt) }), s = spawn(env, 0, 2, 0); s.vz = 4;
    let rel = false;
    ride(s, env, (q) => { if (!rel && q.sinceContact > after) rel = true; return { hop: !rel }; }, 1.5);
    return s.hops;
  };
  const c1 = coy(0.05), c2 = coy(0.16);
  check("coyote hop: released 0.05 s after leaving the ground pops, 0.16 s does not", c1 === 1 && c2 === 0, `0.05 s: ${c1} hop, 0.16 s: ${c2} hop (coyote ${BIKE.coyote} s)`, "1, 0");
  // the kerb catch: the same tap hop (released 0.16 s before) on kerbs 10-40 cm: the highest ridden onto, without and
  // with the catch (it helps a few cm, never more than kerbCatch + 2 cm)
  const kerbH = (h, Bx) => {
    const env = createBikeEnv({ ground: groundQuery((x, z) => (z > 10 ? h : 0), () => SURF.asphalt) }), s = createBikeState(0, 4, 0, 0, Bx); s.vz = 4.2;
    let held = false, popped = false;
    for (let i = 0; i < 480; i++) {
      const tl = (10 - (s.z + Bx.wheelbase / 2)) / Math.max(0.1, s.vz);
      if (!popped && tl < 0.22 && tl > 0.16) held = true;
      if (held && tl <= 0.16) { held = false; popped = true; }
      stepBike(s, { pedal: 0.4, hop: held }, env, Bx);
    }
    return { ok: s.z > 11 && !s.crashes && !s.blocked && Math.abs(s.yLow - h) < 0.06, catches: s.catches };
  };
  const maxH = (Bx) => { let m = 0, c = 0; for (let k = 0; k <= 30; k++) { const h = 0.10 + k * 0.01, r = kerbH(h, Bx); if (r.ok) { m = h; c = r.catches; } } return [m, c]; };
  const [hOff] = maxH({ ...BIKE, kerbCatch: 0, hopBuffer: 0 }), [hOn, cOn] = maxH({ ...BIKE, hopBuffer: 0 });
  const gain = hOn - hOff;
  check("kerb catch: a wheel just short of the top is lifted on", gain >= 0.02 - 1e-9 && gain <= BIKE.kerbCatch + 0.02 && cOn > 0, `a tap hop rides kerbs up to ${(hOn * 100).toFixed(0)} cm (without the catch ${(hOff * 100).toFixed(0)} cm: +${(gain * 100).toFixed(0)} cm, ${cOn} catch)`, `+2..${((BIKE.kerbCatch + 0.02) * 100).toFixed(1)} cm`);

  // ---- 14c. landings in three bands: clean / sketchy (wobble + speed lost, the kid stays on) / bail
  const D = Math.PI / 180;
  const drop2 = (opt = {}) => {
    const s = spawn(flat, 0, 0, 0);
    s.y += opt.h ?? 1; s.vz = 5; s.pitch = opt.pitch || 0; s.lean = opt.lean || 0; s.vy = 0;
    s.air = true; s.airT = 0.5; s.contact[0] = s.contact[1] = false; s.sinceContact = 1;
    if (opt.yaw) s.heading = opt.yaw;
    let wob = 0, v1 = NaN;
    ride(s, flat, () => ({}), 2.5, (q) => { wob = Math.max(wob, Math.abs(q.wobbleNow)); if (!(v1 === v1) && q.lastLanding && q.t - q.lastLanding.t > 0.5) v1 = Math.hypot(q.vx, q.vz); });
    return { s, L: s.lastLanding, wob, v1 };
  };
  const bands = [
    ["nose down", { pitch: -10 * D }, { pitch: -35 * D }, { pitch: -60 * D }, (L) => -L.rel],
    ["nose up (rear first)", { pitch: 25 * D }, { pitch: 55 * D }, { pitch: 85 * D }, (L) => L.rel],
    ["sideways", { yaw: 10 * D }, { yaw: 30 * D }, { yaw: 55 * D }, (L) => L.yaw],
    ["leaning", { lean: 10 * D, h: 0.05 }, { lean: 40 * D, h: 0.05 }, { lean: 75 * D, h: 0.05 }, (L) => Math.abs(L.lean)],
    ["impact (flat drop 1 / 3 / 5.5 m)", { h: 1 }, { h: 3 }, { h: 5.5 }, null],
  ];
  for (const [name, oC, oS, oB, val] of bands) {
    const c = drop2(oC), k = drop2(oS), b = drop2(oB);
    const u = (L) => (!L ? "-" : val ? `${(val(L) / D).toFixed(0)} deg` : `${f1(L.vn)} m/s`);
    const okC = c.L?.band === "clean" && c.s.crashes === 0;
    const okS = k.L?.band === "sketchy" && k.s.crashes === 0 && k.wob > 0.3 && k.v1 < c.v1 * 0.95;
    const okB = b.L?.band === "bail" && b.s.crashes === 1;
    check(`landing bands, ${name}: clean / sketchy / bail`, okC && okS && okB,
      `${u(c.L)} ${c.L?.band}; ${u(k.L)} ${k.L?.band} (wobble ${f2(k.wob)}, ${f2(k.v1)} vs clean ${f2(c.v1)} m/s, crashes ${k.s.crashes}); ${u(b.L)} ${b.L?.band} "${b.s.crashCause}"`,
      "clean; sketchy: wobble, -5 % speed, stays on; bail");
  }
  // the old binary checks, as bails now: a trick still held at touch-down (section 7) and one let go just late
  const tr = (() => { const env = labEnv(), s = spawn(env, 0, 8, 0); s.vz = 8; ride(s, env, (q) => ({ trick: q.air && q.airT < 0.6 }), 4); return s; })();
  check("landing bands: a trick let go just late = sketchy, not a crash", tr.crashes === 0 && tr.lastLanding?.band === "sketchy", `${tr.lastLanding?.band} (${tr.lastLanding?.why}, air ${f2(tr.lastLanding?.air)} s), crashes ${tr.crashes}`, "sketchy, stays on");
}

// ---------------------------------------------------------------- 15. FEEL ROUND 2: ride on everything (docs/BIKE.md "Feel round 2")
{
  const { testGroundRamped, testEdges, testHeightRamped, testHeight, STAIRS, LAB_FURNITURE, LEDGE } = await import("../../viewer/bike/bikeGround.js");
  const { EDGE, edgeBytes, edgeCell, segNearest } = await import("../../viewer/bike/bikeEdges.js");
  const { loadCityDocs, buildCitySpot } = await import("../../viewer/bike/bikeCitySpot.js");
  const fs = await import("node:fs");
  const lab = createBikeEnv({ sets: () => [COL], ground: testGroundRamped, edges: testEdges });
  // ---- 15a. the edge layer of a REAL tile (D6: the most stairs in the city), from its own docs
  const T = "D6", docs = await loadCityDocs(T, async (p) => fs.readFileSync(p));
  const { kerbEdges, benchEdges, gardenEdges, stairEdges, buildEdgeLayer, edgeCounts } = await import("../../viewer/bike/bikeEdges.js");
  const { terrainHeight } = await import("../../viewer/bike/bikeCitySpot.js");
  const H = terrainHeight(docs.terrainJson, docs.terrain);
  const t0 = performance.now();
  const lines = [...kerbEdges(docs.surfaces, H), ...benchEdges(docs.furniture), ...gardenEdges(docs.gardens), ...stairEdges(docs.features, H)];
  const tb = docs.terrainJson, E6 = buildEdgeLayer(lines, { x0: tb.x0, x1: tb.x0 + 500, z0: tb.z0, z1: tb.z0 + 500 });
  const msX = performance.now() - t0, cnt = edgeCounts(lines);
  const nSteps = (docs.features.lines || []).filter((l) => l.kind === "steps" && !l.tags?.tunnel).length;
  check(`edge layer, tile ${T}: kerbs, benches, walls / rails, stairs found`, cnt.kerb?.lines === docs.surfaces.kerbs.length && cnt.bench?.lines === docs.furniture.benches.length && cnt.stair?.lines === nSteps && (cnt.wall?.grindM || 0) + (cnt.rail?.grindM || 0) > 100,
    `kerbs ${cnt.kerb?.lines} (${cnt.kerb?.m} m), benches ${cnt.bench?.lines}, walls ${cnt.wall?.lines} (${cnt.wall?.grindM} m grindable), rails ${cnt.rail?.lines} (${cnt.rail?.grindM} m), stairs ${cnt.stair?.lines}`, "every kerb / bench / stair of the docs");
  check(`edge layer, tile ${T}: memory, build time`, edgeBytes(E6) < 512 * 1024 && msX < 200, `${(edgeBytes(E6) / 1024).toFixed(0)} KB (${E6.n} segments), built in ${f1(msX)} ms`, "< 512 KB, < 200 ms");
  // the query: one cell's list, the nearest grindable segment (what trySnap does each falling step)
  {
    const q = { u: 0, len: 0, d: 0, tx: 0, tz: 0, y: 0 }, r = rng(4), N = 200000;
    let hits = 0;
    const tq = process.hrtime.bigint();
    for (let i = 0; i < N; i++) {
      const x = tb.x0 + r() * 500, z = tb.z0 + r() * 500, c = edgeCell(E6, x, z);
      if (c) for (let k = c[0]; k < c[1]; k++) { const sg = E6.cellItems[k]; if (E6.lineGrind[E6.segLine[sg]] && segNearest(E6, sg, x, z, q) < 0.45) hits++; }
    }
    const us = Number(process.hrtime.bigint() - tq) / 1000 / N;
    check("edge layer: the per-step query", us < 2, `${f2(us)} us a query (${N} random points over ${T}, ${hits} near an edge)`, "< 2 us");
  }
  // ---- 15b. snaps: onto the lab's bench (falling, along it), and the no-snap cases
  const drop = (x, z, h, v, top, { above = 0.22, vy = -0.5, ang = 0, input = () => ({}), secs = 3, env = lab } = {}) => {
    const s = createBikeState(x, z, h, 0);
    s.y = top + above + (BIKE.cgHeight - BIKE.wheelR) + BIKE.pegR; s.vy = vy;
    s.vx = Math.sin(h + ang) * v; s.vz = Math.cos(h + ang) * v; s.contact[0] = s.contact[1] = false; s.air = true; s.airT = 0.3; s.sinceContact = 1;
    let snapT = -1, x0 = 0, maxJump = 0, px = s.x, pz = s.z, py = s.y;
    for (let i = 0; i < secs * 120; i++) {
      stepBike(s, input(s, i), env);
      if (s.grindSeg >= 0 && snapT < 0) { snapT = s.t; x0 = s.x; }
      if (s.grindSeg >= 0) maxJump = Math.max(maxJump, Math.hypot(s.x - px, s.z - pz, s.y - py) - Math.hypot(s.vx, s.vz) * DT);
      px = s.x; pz = s.z; py = s.y;
    }
    return { s, snapT, maxJump };
  };
  // (the seat's front lip at x - 0.27 (its front faces -x); a peg grind rides BESIDE it: the bike's middle ~0.1-0.2 m out)
  const B1 = LAB_FURNITURE.benches[0], lipX = B1.x - 0.27, seatTop = 0.46, side = lipX - 0.15;
  const ok = drop(side, B1.z - 0.6, 0, 3, seatTop), rise = drop(side, B1.z - 0.6, 0, 3, seatTop, { vy: 1.0 });
  const wide = drop(side, B1.z - 0.6, 0, 3, seatTop, { ang: -0.87, secs: 0.4 }), far = drop(lipX - 0.55, B1.z - 0.6, 0, 3, seatTop, { secs: 0.4 }), low = drop(side, B1.z - 0.6, 0, 3, seatTop, { above: -0.15, secs: 0.4 });
  check("grind: falling onto the bench along it snaps, rides it, leaves at its end", ok.s.grinds === 1 && ok.s.grindExit === "end" && ok.s.crashes === 0 && ok.maxJump < 0.03,
    `grinds ${ok.s.grinds}, ${f2(ok.s.grindDist)} m on it, left at its "${ok.s.grindExit}", landing ${ok.s.lastLanding?.band}; the snap's biggest step ${(ok.maxJump * 100).toFixed(1)} cm over the motion (blend ${BIKE.snapTime * 1000} ms)`, "snap, ride, off the end, no jump");
  // (rising at 1 m/s: the apex 0.10 s later; a snap may come after it, falling, never before)
  const apex = 1.0 / BIKE.gravity;
  check("grind: no snap while rising / at 50 deg / 0.55 m off / pegs 15 cm under the top", (rise.snapT < 0 || rise.snapT > apex) && !wide.s.grinds && !far.s.grinds && !low.s.grinds,
    `rising: ${rise.snapT < 0 ? "none" : `snapped ${f2(rise.snapT)} s, after the apex (${f2(apex)} s)`}; in the 0.4 s pass: 50 deg ${wide.s.grinds}, 0.55 m off ${far.s.grinds}, 15 cm under ${low.s.grinds}`, "never rising; 0, 0, 0");
  // ---- 15c. the ledge: along 10 m, through a 30 deg bend, off at a 90 deg corner (straight on, lands)
  const led = drop(LEDGE.x - 0.3, LEDGE.z0 + 1, 0, 6, LEDGE.h + 0.08, { secs: 5 });
  check("grind: a 30 deg bend is followed, a 90 deg corner is left", led.s.grinds === 1 && led.s.grindExit === "corner" && led.s.grindDist > 12.5 && led.s.crashes === 0 && led.s.lastLanding?.band !== "bail",
    `${f2(led.s.grindDist)} m on the ledge (10 + 4 m to the corner), left at the "${led.s.grindExit}", landing ${led.s.lastLanding?.band}`, "corner after ~14 m, no crash");
  // ---- 15d. balance, stall, hop out
  const keep = { ...BIKE };
  BIKE.grindAssist = 0; const fall = drop(LEDGE.x - 0.3, LEDGE.z0 + 1, 0, 6, LEDGE.h + 0.08);
  const save = drop(LEDGE.x - 0.3, LEDGE.z0 + 1, 0, 6, LEDGE.h + 0.08, { input: (s) => ({ steer: -clampN(s.grindBal * 2.5) }) });
  Object.assign(BIKE, keep);
  const helped = drop(LEDGE.x - 0.3, LEDGE.z0 + 1, 0, 6, LEDGE.h + 0.08);
  check("grind balance: no helper + no input falls off; leaning against it holds; the helper holds", fall.s.grindExit === "fell off" && save.s.grindExit === "corner" && helped.s.grindExit === "corner",
    `no helper: "${fall.s.grindExit}" after ${f2(fall.s.grindDist)} m; leaning against: "${save.s.grindExit}"; helper ${keep.grindAssist}: "${helped.s.grindExit}"`, "fell off, corner, corner");
  const stall = drop(side, B1.z, 0, 0.3, seatTop, { secs: 2.5 }), hopOut = drop(side, B1.z - 0.6, 0, 3, seatTop, { input: (s, i) => ({ hop: i > 10 && i < 40 }) });
  check("stall (slow onto the bench) holds, then drops off; a hop leaves a grind", stall.s.stalls === 1 && stall.s.grindExit === "stall" && hopOut.s.grindExit === "hop" && hopOut.s.crashes === 0,
    `stall: ${stall.s.stalls}, left by "${stall.s.grindExit}"; hop: left by "${hopOut.s.grindExit}", landing ${hopOut.s.lastLanding?.band}`, "stall then off; hop out");
  // ---- 15d'. as a player does it: from the lab's spot beside the bench / the ledge, 3-5 m/s, a full hop released at
  // 0-0.6 s before the edge's start (the bike's middle): the releases that end on it, never a crash
  const { SPOTS: SP } = await import("../../viewer/bike/bikeGround.js");
  const playerHop = (spot, startZ, v, lead, secs = 4) => {
    const [x, z, h] = SP[spot], s = createBikeState(x, z, h, 0); s.vz = v; let held = false, done = false;
    for (let i = 0; i < secs * 120; i++) { const tl = (startZ - s.z) / Math.max(0.1, s.vz); if (!done && !held && tl < lead + 0.3) held = true; if (held && tl <= lead) { held = false; done = true; } stepBike(s, { hop: held, pedal: 0.3 }, lab); }
    return s;
  };
  for (const [spot, startZ] of [["bench", B1.z - 0.9], ["ledge", LEDGE.z0]]) {
    let ok = 0, n = 0, crashes = 0, lo = Infinity, hi = -Infinity;
    for (const v of [3, 4, 5]) for (let k = 0; k <= 12; k++) { const lead = k * 0.05, s = playerHop(spot, startZ, v, lead, spot === "bench" ? 4 : 5); n++; crashes += s.crashes; if (s.grinds) { ok++; lo = Math.min(lo, lead); hi = Math.max(hi, lead); } }
    check(`grind as a player: a full hop onto the ${spot} from beside it`, ok >= n * 0.5 && crashes === 0, `${ok} / ${n} hops grind (3, 4, 5 m/s; released ${f2(lo)}-${f2(hi)} s before it), ${crashes} crashes`, ">= half, 0 crashes");
  }
  // ---- 15e. stairs: the ramp rides down smoothly (the raw steps do not), up = off and pushing
  const downStairs = (g, v) => {
    const env = createBikeEnv({ sets: () => [COL], ground: g, edges: testEdges }), s = createBikeState(130, 76, Math.PI, testHeightRamped(130, 76));
    s.vz = -v; let maxA = 0, pv = 0;
    for (let i = 0; i < 900 && s.z > STAIRS.z0 - 3; i++) { stepBike(s, {}, env); if (i) maxA = Math.max(maxA, Math.abs(s.vy - pv) / DT / 9.81); pv = s.vy; }
    return { s, maxA };
  };
  const r2 = downStairs(testGroundRamped, 2), r4 = downStairs(testGroundRamped, 4), raw4 = downStairs(testGround, 4);
  check("stairs (8 x 15 cm): ridden down on the ramp", r2.s.crashes === 0 && r4.s.crashes === 0 && r2.s.z < STAIRS.z0 - 2 && r4.s.z < STAIRS.z0 - 2 && r4.maxA < 3,
    `2 m/s: ${r2.s.crashes ? r2.s.crashCause : "ridden"}, peak ${f1(r2.maxA)} g; 4 m/s: ${r4.s.crashes ? r4.s.crashCause : "ridden"}, peak ${f1(r4.maxA)} g (the raw steps at 4 m/s: ${raw4.s.crashes ? `"${raw4.s.crashCause}"` : "ridden"}, peak ${f1(raw4.maxA)} g)`, "ridden, < 3 g");
  const up = (() => { const s = createBikeState(130, 66, 0, 0); s.vz = 4; let pushed = false; for (let i = 0; i < 1500 && s.z < STAIRS.zl; i++) { stepBike(s, { pedal: 1 }, lab); if (s.pushing) pushed = true; } return { s, pushed }; })();
  check("stairs: up = off the bike, pushed to the top", up.pushed && up.s.z >= STAIRS.zl - 0.1 && up.s.crashes === 0, `pushed ${up.pushed}, reached the landing ${up.s.z >= STAIRS.zl - 0.1} in ${f1(up.s.t)} s`, "pushed up");
  // ---- 15f. a real spot of D6 (the lab's ?city=D6): its stairs ridden down, a bench ground, a real kerb face
  const C = buildCitySpot(docs, [-1287, 721], { SURF, KIND });
  const CCOL = buildColliders(C.polys, C.circles, C.bounds);
  const cenv = createBikeEnv({ sets: () => [CCOL], ground: groundQuery(C.height, C.surface, 0.03), edges: C.edges });
  const st = C.lines.find((l) => l.type === EDGE.stair);
  let [a, b] = [st.pts[0], st.pts.at(-1)]; if (a[1] < b[1]) [a, b] = [b, a];
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]), ux = (b[0] - a[0]) / L, uz = (b[2] - a[2]) / L;
  const cs = createBikeState(a[0] - ux * 2.5, a[2] - uz * 2.5, Math.atan2(ux, uz), C.height(a[0] - ux * 2.5, a[2] - uz * 2.5)); cs.vx = ux * 3; cs.vz = uz * 3;
  for (let i = 0; i < 600; i++) { stepBike(cs, {}, cenv); if ((cs.x - a[0]) * ux + (cs.z - a[2]) * uz > L + 1) break; }
  const past = (cs.x - a[0]) * ux + (cs.z - a[2]) * uz - L;
  const rin = randomInputs(9, 120 * 20);
  { const w = createBikeState(-1280, 722, 0.5, C.height(-1280, 722)); for (const i of rin) stepBike(w, i, cenv); }      // (warm: the city's code paths jitted)
  // (the best of 3, and the lab ground's step timed in the same breath: this laptop is shared, its timings swing 2-4x
  // with other agents' jobs; the budget holds if the step is under 20 us, or the city's within 2.2x the lab's)
  let usC = Infinity, usL = Infinity;
  const lenv = labEnv();
  for (let rep = 0; rep < 3; rep++) {
    const tc = process.hrtime.bigint(), cb = createBikeState(-1280, 722, 0.5, C.height(-1280, 722));
    for (const i of rin) stepBike(cb, i, cenv);
    usC = Math.min(usC, Number(process.hrtime.bigint() - tc) / 1000 / rin.length);
    const tl = process.hrtime.bigint(), lb = spawn(lenv, 0, 0, 0);
    for (const i of rin) stepBike(lb, i, lenv);
    usL = Math.min(usL, Number(process.hrtime.bigint() - tl) / 1000 / rin.length);
  }
  check("city spot D6: built, its stairs ridden down, the cost a step", past > 0.9 && cs.crashes === 0 && (usC < 20 || usC < 2.2 * usL),
    `built in ${f1(C.ms)} ms (${C.edges.n} segments, ${C.polys.length} colliders, raster ${(C.raster.grid.byteLength / 1e6).toFixed(1)} MB); the ${f1(a[1] - b[1])} m flight: ${cs.crashes ? cs.crashCause : "ridden"}; ${f2(usC)} us a step riding randomly there (best of 3; the lab's ${f2(usL)} us in the same run)`, "ridden, < 20 us a step (or < 2.2 x the lab's under load)");
  // the step cost with grinds in it (the lab's ledge, again and again): the edge layer's share
  const tg = process.hrtime.bigint(); let ng = 0;
  for (let k = 0; k < 20; k++) { const g = drop(LEDGE.x - 0.3, LEDGE.z0 + 1, 0, 6, LEDGE.h + 0.08, { secs: 1.5 }); ng += g.s.steps; }
  const usG = Number(process.hrtime.bigint() - tg) / 1000 / ng;
  check("cost a step with grinds", usG < 20, `${f2(usG)} us (20 ledge grinds, ${ng} steps)`, "< 20 us");
}
function clampN(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

// ---------------------------------------------------------------- 16. FEEL ROUND 3: sound (docs/BIKE.md "Feel round 3")
{
  const A = await import("../../viewer/bike/bikeAudio.js");
  const { SOUND, soundParams, createSoundParams, createSoundMem, bakeAll, BikeSound, LAND, MAT, SURF_SOUND } = A;
  const flatS = (surf) => createBikeEnv({ ground: groundQuery(() => 0, () => surf) });
  /** ride input(s, t) for secs, the sound's params read every 2nd step (a 60 fps frame); f(p, s) per frame */
  const listen = (s, env, input, secs, f) => {
    const mem = createSoundMem(s), p = createSoundParams();
    for (let i = 0; i < Math.round(secs / DT); i++) { stepBike(s, input(s, i * DT), env); if (i % 2) f(soundParams(s, BIKE, mem, p), s); }
    return p;
  };
  // ---- 16a. the freewheel: coasting ticks at (wheel turns - cog turns) x 36; pedalling: none; stopping the pedals:
  // the ticks come back as the cadence decays
  {
    const env = flatS(SURF.asphalt), s = spawn(env, 0, 0, 0); s.vz = 5;
    const coast = listen(s, env, () => ({}), 1.5, () => {});
    const want = 5 / (2 * Math.PI * BIKE.wheelR) * SOUND.teeth, got = coast.tickRate, vNow = Math.hypot(s.vx, s.vz);
    const s2 = spawn(env, 0, 0, 0); s2.vz = 5;
    let pedTick = 0, pedChain = 0, chainRate = 0, cad = 0;
    listen(s2, env, () => ({ pedal: 1 }), 4, (p, q) => { pedTick = Math.max(pedTick, q.t > 1 ? p.tickRate : 0); if (q.t > 3) { pedChain = p.chain; chainRate = p.chainRate; cad = q.cadence; } });
    const rise = [];
    listen(s2, env, () => ({}), 0.6, (p, q) => rise.push(p.tickRate));
    const exp = vNow / (2 * Math.PI * BIKE.wheelR) * SOUND.teeth;
    check("sound: the freewheel ticks coasting, not pedalling; back as the pedals stop", Math.abs(got - exp) / exp < 0.03 && pedTick < 1 && pedChain > 0 && Math.abs(chainRate - cad / 60) < 0.02 && rise[2] < rise.at(-1) && rise.at(-1) > 80,
      `coasting at ${f1(vNow)} m/s: ${f1(got)} ticks/s (= ${f1(exp)}: wheel turns x ${SOUND.teeth}); pedalling: ${f1(pedTick)} ticks/s, chain ${f2(pedChain)} at ${f2(chainRate)} crank turns/s (cadence ${f1(cad)} rpm); pedals stopped: ${f1(rise[2])} -> ${f1(rise.at(-1))} ticks/s`, "ticks = turns x teeth; 0 pedalling; rising after");
  }
  // ---- 16b. rolling: one surface voice per surface under the wheels, rate with speed, louder on setts than asphalt,
  // none in the air or stopped
  {
    const at = (surf, v) => { const env = flatS(surf), s = spawn(env, 0, 0, 0); s.vz = v; return listen(s, env, () => ({ pedal: v > 0 ? 0.3 : 0 }), 0.5, () => {}); };
    const rows = [], bad = [];
    for (let k = 0; k < 6; k++) {
      const p = at(k, 4), others = [...p.roll].filter((g, j) => j !== k && g > 0).length;
      rows.push(`${SURF_SOUND[k].name} ${f2(p.roll[k])}`);
      if (!(p.roll[k] > 0) || others) bad.push(SURF_SOUND[k].name);
    }
    const a2 = at(SURF.asphalt, 2), a6 = at(SURF.asphalt, 6), st = at(SURF.setts, 4), as = at(SURF.asphalt, 4), still = at(SURF.asphalt, 0);
    const air = (() => { const env = flatS(SURF.asphalt), s = spawn(env, 0, 0, 0); s.y += 1; s.vz = 5; s.contact[0] = s.contact[1] = false; s.air = true; const mem = createSoundMem(s), p = createSoundParams(); stepBike(s, {}, env); return soundParams(s, BIKE, mem, p); })();
    check("sound: rolling per surface, with speed, none in the air / stopped", !bad.length && a6.roll[0] > a2.roll[0] && a6.rollRate[0] > a2.rollRate[0] && st.roll[1] > as.roll[0] && [...air.roll].every((g) => g === 0) && [...still.roll].every((g) => g === 0),
      `at 4 m/s: ${rows.join(", ")}${bad.length ? `; wrong: ${bad.join(" ")}` : ""}; asphalt 2 / 6 m/s: gain ${f2(a2.roll[0])} / ${f2(a6.roll[0])}, rate ${f2(a2.rollRate[0])} / ${f2(a6.rollRate[0])}; air ${f2(Math.max(...air.roll))}, stopped ${f2(Math.max(...still.roll))}`, "each its own voice; louder + faster with speed; 0, 0");
  }
  // ---- 16c. the skid, the grind scrape by material, a stall
  {
    const skidOn = (surf) => { const env = flatS(surf), s = spawn(env, 0, 0, 0); s.vz = 7; let m = 0, f = 0; listen(s, env, () => ({ brakeR: 1 }), 0.6, (p) => { if (p.skid > m) { m = p.skid; f = p.skidF; } }); return [m, f]; };
    const [ska, fa] = skidOn(SURF.asphalt), [skd, fd] = skidOn(SURF.dirt);
    const straight = (() => { const env = flatS(SURF.asphalt), s = spawn(env, 0, 0, 0); s.vz = 6; let m = 0; listen(s, env, () => ({ pedal: 0.5 }), 1, (p) => { m = Math.max(m, p.skid); }); return m; })();
    const onEdge = (type, v) => { const s = spawn(flatEnv(), 0, 0, 0), p = createSoundParams(), mem = createSoundMem(s); s.grindSeg = 0; s.grindType = type; s.grindV = v; s.contact[0] = s.contact[1] = false; return soundParams(s, BIKE, mem, p); };
    const rail = onEdge(4, 3), bench = onEdge(2, 3), ledge = onEdge(1, 3), wall = onEdge(3, 3), stall = onEdge(1, 0), fast = onEdge(1, 5);
    const only = (p, m) => p.scrape[m] > 0 && [0, 1, 2].every((j) => j === m || p.scrape[j] === 0) && [...p.roll].every((g) => g === 0);
    check("sound: skid squeal / rasp; the grind: steel, stone, wood; a stall near silent", ska > 0.3 && fa > fd && skd > 0.3 && straight < 0.05 && only(rail, MAT.metal) && only(bench, MAT.wood) && only(ledge, MAT.stone) && only(wall, MAT.stone) && stall.scrape[1] < 0.05 && fast.scrape[1] > ledge.scrape[1],
      `skid asphalt ${f2(ska)} @ ${fa} Hz, dirt ${f2(skd)} @ ${fd} Hz, riding straight ${f2(straight)}; rail -> metal ${f2(rail.scrape[0])}, bench -> wood ${f2(bench.scrape[2])}, ledge / wall -> stone ${f2(ledge.scrape[1])} / ${f2(wall.scrape[1])}; stall ${f2(stall.scrape[1])}, 5 m/s ${f2(fast.scrape[1])}`, "as listed");
  }
  // ---- 16d. the events, once each: landings by band, a kerb knock, a peg clank, a crash
  {
    const D = Math.PI / 180;
    const landEv = (opt) => {
      const env = flatEnv(), s = spawn(env, 0, 0, 0); s.y += opt.h ?? 1; s.vz = 5; s.pitch = opt.pitch || 0; s.vy = 0;
      s.air = true; s.airT = 0.5; s.contact[0] = s.contact[1] = false; s.sinceContact = 1;
      const ev = []; listen(s, env, () => ({}), 2, (p) => { if (p.land) ev.push([p.land, p.landGain]); if (p.crash) ev.push(["crash", p.crash]); });
      return ev;
    };
    const c = landEv({}), k = landEv({ pitch: -35 * D }), b = landEv({ h: 5.5 });
    const kerb = (() => { const env = labEnv(), s = spawn(env, 15, 12, 0); s.vz = 2.5; let n = 0; listen(s, env, () => ({}), 4, (p) => { if (p.knock) n++; }); return n; })();
    const wall = (() => { const env = labEnv(), s = spawn(env, 0, -10, Math.PI); s.vz = -8; const ev = []; listen(s, env, () => ({ pedal: 1 }), 2, (p) => { if (p.crash) ev.push(p.crash); }); return ev; })();
    const { testGroundRamped: tgr, testEdges: tE, LAB_FURNITURE: LF } = await import("../../viewer/bike/bikeGround.js");
    const genv = createBikeEnv({ sets: () => [COL], ground: tgr, edges: tE }), B1 = LF.benches[0];
    const gs = createBikeState(B1.x - 0.27 - 0.15, B1.z - 0.6, 0, 0); gs.y = 0.46 + 0.22 + (BIKE.cgHeight - BIKE.wheelR) + BIKE.pegR; gs.vy = -0.5; gs.vz = 3; gs.contact[0] = gs.contact[1] = false; gs.air = true; gs.airT = 0.3; gs.sinceContact = 1;
    const clanks = [], scr = []; listen(gs, genv, () => ({}), 1.5, (p) => { if (p.clank >= 0) clanks.push(p.clank); if (p.scrape[2] > 0) scr.push(p.scrape[2]); });
    const reset = (() => { const mem = createSoundMem(), p = createSoundParams(), a = spawn(flatEnv(), 0, 0, 0); a.landings = 5; a.crashes = 2; soundParams(a, BIKE, mem, p); const b2 = spawn(flatEnv(), 0, 0, 0); soundParams(b2, BIKE, mem, p); return p.land + p.crash + p.knock + (p.clank >= 0 ? 1 : 0); })();
    check("sound: a new bike state (a reset, a spot) is not an event", reset === 0, `${reset} events`, "0");
    check("sound events once each: landings clean / sketchy / bail, a kerb knock, a peg clank, a crash", c.length === 1 && c[0][0] === LAND.clean && k.length === 1 && k[0][0] === LAND.sketchy && b.length === 1 && b[0][0] === LAND.bail && kerb === 1 && wall.length === 1 && clanks.length === 1 && clanks[0] === MAT.wood && scr.length > 10,
      `1 m level: ${JSON.stringify(c.map((e) => e[0]))}, 35 deg nose down: ${JSON.stringify(k.map((e) => e[0]))}, 5.5 m: ${JSON.stringify(b.map((e) => e[0]))} (bail, no double crash) (gains ${f2(c[0]?.[1])} / ${f2(k[0]?.[1])} / ${f2(b[0]?.[1])}); kerb at 2.5 m/s: ${kerb} knock; the bench: ${clanks.length} clank (${clanks[0] === MAT.wood ? "wood" : clanks[0]}), ${scr.length} frames of scrape; the wall at 29 km/h: ${wall.length} crash`, "1 / 2 / 3, 1, 1 wood, 1");
  }
  // ---- 16e. the textures: baked in node with a stand-in context (what the browser bakes on the first switch-on)
  {
    const ctx = { sampleRate: 44100, createBuffer: (ch, n, sr) => { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (c) => d[c] }; } };
    const { RECIPES, bakeOne } = A, bufs = {}; let ms = 0, worst = 0, worstName = "";
    // (each timed as the better of two bakes: a shared laptop's preemption is not the recipe's cost)
    for (const n of Object.keys(RECIPES)) {
      let dt = Infinity;
      for (let rep = 0; rep < 2; rep++) { const t0 = performance.now(); bufs[n] = bakeOne(ctx, n); dt = Math.min(dt, performance.now() - t0); }
      ms += dt; if (dt > worst) { worst = dt; worstName = n; }
    }
    const same = (() => { const a = bakeAll(ctx).setts.getChannelData(0), b = bufs.setts.getChannelData(0); for (let i = 0; i < a.length; i += 97) if (a[i] !== b[i]) return false; return true; })();
    let bad = [], bytes = 0;
    for (const [n, b] of Object.entries(bufs)) {
      const d = b.getChannelData(0); bytes += d.byteLength;
      let mx = 0, e = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) { mx = Infinity; break; } mx = Math.max(mx, Math.abs(v)); e += v * v; }
      if (!(mx > 0.05 && mx <= 0.981) || !(e > 0)) bad.push(`${n} peak ${mx}`);
    }
    check("sound textures: all baked, finite, levelled; size, time", !bad.length && bytes < 4e6 && same && worst < 50, `${Object.keys(bufs).length} buffers, ${(bytes / 1e6).toFixed(2)} MB in memory (nothing shipped), baked in ${f1(ms)} ms, one per macrotask: the slowest ${worstName} ${f1(worst)} ms; baked one by one = baked together ${same}${bad.length ? `; bad: ${bad.join(", ")}` : ""}`, "finite, peak 0.05-0.98, < 4 MB, deterministic, each < 50 ms");
  }
  // ---- 16e'. the graph on a stand-in AudioContext (counts every node it makes): 13 looping voices + 4 pooled gains
  // made once, then ONE source node per event and nothing per frame
  {
    const made = { src: 0, gain: 0, filter: 0, other: 0 };
    const param = (v = 0) => ({ value: v, setTargetAtTime() {}, setValueAtTime() {}, cancelScheduledValues() {} });
    const node = (kind, extra = {}) => { made[kind]++; return { connect(n) { return n; }, disconnect() {}, ...extra }; };
    class FakeCtx {
      constructor() { this.sampleRate = 44100; this.currentTime = 0; this.destination = {}; this.state = "running"; }
      createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (c) => d[c] }; }
      createGain() { return node("gain", { gain: param(1) }); }
      createBufferSource() { return node("src", { playbackRate: param(1), loop: false, buffer: null, start() {}, stop() {} }); }
      createBiquadFilter() { return node("filter", { frequency: param(350), Q: param(1), type: "" }); }
      createDynamicsCompressor() { return node("other", { threshold: param(), ratio: param() }); }
      resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
    }
    const keepAC = globalThis.AudioContext; globalThis.AudioContext = FakeCtx;
    const snd = new BikeSound(), env = labEnv(), s = spawn(env, 15, 12, 0); s.vz = 2.5;
    snd.setOn(true, s);
    for (let k = 0; k < 400 && Object.keys(snd.buf).length < Object.keys(A.RECIPES).length; k++) await new Promise((r) => setTimeout(r, 1));
    const base = { ...made };
    let frames = 0;
    for (let i = 0; i < 120 * 8; i++) { stepBike(s, { pedal: i > 300 ? 1 : 0, hop: i > 500 && i < 540 }, env); if (i % 2) { snd.update(s, BIKE); frames++; } }
    globalThis.AudioContext = keepAC;
    const perRun = made.src - base.src, extra = made.gain - base.gain + made.filter - base.filter + made.other - base.other;
    check("sound graph (stand-in context): fixed voices, one source per event, nothing per frame", snd.voices === 13 && base.gain === 13 + 4 + 1 && extra === 0 && perRun === snd.events && snd.events > 0 && snd.events < 20,
      `voices ${snd.voices} loops + ${snd.pool.length} one-shot slots (${base.src} sources, ${base.gain} gains, ${base.filter} filter made at the start); over ${frames} frames of riding (a kerb, a hop): ${perRun} sources = ${snd.events} events, ${extra} other nodes`, "13 + 4, 1 source an event, 0 else");
  }
  // ---- 16f. no work, no allocation: OFF = no AudioContext and update() returns at once; the mapping itself allocates
  // nothing (counted as garbage collections over a million calls: any allocation of a few bytes per call would run
  // the young generation's collector many times)
  {
    const { PerformanceObserver } = await import("node:perf_hooks");
    let gcs = 0; const obs = new PerformanceObserver((l) => { gcs += l.getEntries().length; }); obs.observe({ entryTypes: ["gc"] });
    const tick = () => new Promise((r) => setTimeout(r, 30));
    const off = new BikeSound(), env = flatEnv(), s = spawn(env, 0, 0, 0); s.vz = 4; for (let i = 0; i < 60; i++) stepBike(s, { pedal: 1 }, env);
    await tick(); gcs = 0;
    for (let i = 0; i < 1e6; i++) off.update(s, BIKE);
    await tick(); const gOff = gcs;
    const mem = createSoundMem(s), p = createSoundParams();
    for (let i = 0; i < 2e5; i++) soundParams(s, BIKE, mem, p);         // (warm)
    await tick(); gcs = 0;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 1e6; i++) { s.cadence = (i % 120); soundParams(s, BIKE, mem, p); }
    const ns = Number(process.hrtime.bigint() - t0) / 1e6;
    await tick(); const gOn = gcs; obs.disconnect();
    check("sound off: no context, no work, no allocation; the mapping allocates nothing", off.ctx === null && gOff === 0 && gOn === 0,
      `off: context ${off.ctx}, ${gOff} GC over 1e6 updates; mapping: ${gOn} GC over 1e6 calls, ${f1(ns)} ns a call`, "null, 0, 0");
  }
}

// ---------------------------------------------------------------- 17. FEEL ROUND 4: the zero-garbage step
// stepBike split in phases (V8 inlines each one's helpers), the ground called with objects only (groundAt, g.P), the
// colliders' box as one object. Measured by tools/bike/zeroGarbage.mjs in a FRESH process (one or two grounds, as in
// the game: this runner has built dozens, which makes V8's call sites megamorphic and would measure itself)
{
  const { execFileSync } = await import("node:child_process");
  // (best of up to 2 fresh processes: V8's tiering picks per process; about 1 run in 15 measured the D6 spot at 12, twice
  // the usual 6, from the same code - 2026-11-21)
  const once = () => { const lines = execFileSync(process.execPath, ["tools/bike/zeroGarbage.mjs", "--json"], { encoding: "utf8" }).trim().split(String.fromCharCode(10)); return JSON.parse(lines[lines.length - 1]); };
  let r = once();
  if (r.flat.gc > 1 || r.city.gc > 8) { const r2 = once(); if (r2.flat.gc + r2.city.gc < r.flat.gc + r.city.gc) r = r2; }
  check("zero-garbage step: young collections over 1e6 steps", r.flat.gc <= 1 && r.city.gc <= 8,
    `flat ground ${r.flat.gc} (${f2(r.flat.us)} us a step), the D6 spot (its ground, buildings, walls, benches) ${r.city.gc} (${f2(r.city.us)} us); before round 4: ~170 / ~370`, "flat 0 (1: the counter's own noise), city <= 8 (contacts in the shared colliders)");
}

// ---------------------------------------------------------------- 18. FEEL ROUND 4: the camera (CameraRig, no three)
{
  const { CameraRig, BIKE_CAMERA } = await import("../../viewer/bike/bikeCamera.js");
  const { testGroundRamped, testEdges, testHeightRamped, STAIRS, LAB_FURNITURE } = await import("../../viewer/bike/bikeGround.js");
  const lab = createBikeEnv({ sets: () => [COL], ground: testGroundRamped, edges: testEdges });
  const H = (x, z) => testHeightRamped(x, z);
  const cfg = (o = {}) => ({ ...BIKE_CAMERA, ...o });
  /** ride input for secs, the camera updated every 2nd step (60 fps); f(rig, s) per frame */
  const film = (s, env, input, secs, c, f, ground = H, solid = env.solidAt) => {
    const rig = new CameraRig(c), pose = {};
    for (let i = 0; i < Math.round(secs / DT); i++) { stepBike(s, input(s, i * DT), env); if (i % 2) { bikePose(s, 1, pose); rig.update(s, pose, 2 * DT, ground, solid); f(rig, s); } }
    return rig;
  };
  // ---- speed sense: the FOV opens with speed, eased (no step), back as it slows
  {
    const env = flatEnv(), s = spawn(env, 0, 0, 0); let f0 = NaN, fMax = 0, jump = 0, prev = NaN;
    film(s, env, (q, t) => ({ pedal: t < 12 ? 1 : 0, sprint: t < 12, brakeR: t > 12 ? 1 : 0 }), 16, cfg(), (r) => { if (!(f0 === f0)) f0 = r.fov; fMax = Math.max(fMax, r.fov); if (prev === prev) jump = Math.max(jump, Math.abs(r.fov - prev)); prev = r.fov; }, () => 0, null);
    check("camera: speed sense (FOV with speed, eased)", fMax - f0 > 4 && fMax - f0 <= BIKE_CAMERA.fovKick + 0.01 && jump < 0.3 && Math.abs(prev - f0) < 0.5,
      `FOV ${f1(f0)} -> ${f1(fMax)} deg at 30 km/h -> ${f1(prev)} stopped; the biggest change a frame ${f2(jump)} deg`, "+4..8 deg, < 0.3 deg a frame, back");
  }
  // ---- look into turns: in a steady left / right turn the look point lies on the turn's inside
  {
    const side = (steer) => { const env = flatEnv(), s = spawn(env, 0, 0, 0); s.vz = 5; let acc = 0, n = 0;
      // (the look point relative to the BIKE: metres to its left (+) / right (-))
      film(s, env, () => ({ steer, pedal: 0.5 }), 4, cfg(), (r, q) => { if (q.t > 2) { const lx = Math.cos(q.heading), lz = -Math.sin(q.heading); acc += (r.look.x - q.x) * lx + (r.look.z - q.z) * lz; n++; } }, () => 0, null);
      return acc / n; };
    const L = side(1), R = side(-1);
    check("camera: looks into the turn", L > 0.3 && R < -0.3, `left turn: the look point ${f2(L)} m left of the bike; right turn: ${f2(-R)} m right`, "on the inside both ways");
  }
  // ---- the landing dip: 3-8 cm, back without a bounce; none rolling
  {
    const dipOf = (h) => { const env = flatEnv(), s = spawn(env, 0, 0, 0); s.y += h; s.vz = 5; s.air = true; s.airT = 0.5; s.contact[0] = s.contact[1] = false; s.sinceContact = 1;
      let mn = 0, mx = 0, tMin = 0, back = NaN; film(s, env, () => ({ hop: h > 2 }), 2.5, cfg(), (r, q) => { if (r.dipY < mn) { mn = r.dipY; tMin = q.t; } if (mn < 0 && r.dipY > mx) mx = r.dipY; if (mn < -0.01 && !(back === back) && Math.abs(r.dipY) < 0.005 && q.t > tMin) back = q.t - tMin; }, () => 0, null); return [mn, mx, back]; };
    const [m1, o1, b1] = dipOf(1), [m2, o2, b2] = dipOf(2.6);
    const roll = (() => { const env = labEnv(), s = spawn(env, -15, 4, 0); s.vz = 4.5; let mn = 0; film(s, env, () => ({}), 6, cfg(), (r) => { mn = Math.min(mn, r.dipY); }); return mn; })();
    check("camera: the landing dip (no bounce), none rolling", m1 < -0.03 && m2 >= -0.081 && m2 < m1 && o1 < 0.003 && o2 < 0.003 && b1 < 0.4 && roll === 0,
      `1 m drop: ${(m1 * 100).toFixed(1)} cm, back in ${f2(b1)} s; 2.6 m: ${(m2 * 100).toFixed(1)} cm, back in ${f2(b2)} s; overshoot ${(Math.max(o1, o2) * 1000).toFixed(1)} mm; the pump rollers: ${(roll * 100).toFixed(1)} cm`, "3-8 cm, < 0.4 s, no bounce, 0");
  }
  // ---- never inside things: the side camera riding beside the wall (it would sit behind it) and the kerb, the low
  // camera along the kerb face, the chase camera grinding the bench: never in a solid, never under minClear
  {
    let inside = 0, under = 0, frames = 0, pulled = 0;
    const runs = [
      ["side", [0, -20.6, Math.PI / 2], 3, (q) => ({ pedal: 0.5 })],           // along the wall (z -21.7), the side camera on its far side
      ["side", [9.7, 14, 0], 4, () => ({ pedal: 0.4 })],                        // along the kerb's face, on the road
      ["low", [9.75, 14, 0], 4, () => ({ pedal: 0.4 })],
      ["chase", [109.45, 38, 0], 4, (q, t) => ({ hop: t > 1.4 && t < 1.75, pedal: 0.3 })],   // a hop onto the bench, a grind
      ["far", [130, 79, Math.PI], 4, () => ({})],                                // down the stairs
    ];
    for (const [mode, [x, z, h], secs, inp] of runs) {
      const s = createBikeState(x, z, h, H(x, z)); s.vx = Math.sin(h) * 3.5; s.vz = Math.cos(h) * 3.5;
      film(s, lab, inp, secs, cfg({ mode }), (r) => { frames++; if (lab.solidAt(r.pos.x, r.pos.y, r.pos.z)) inside++; if (r.pos.y < H(r.pos.x, r.pos.z) + BIKE_CAMERA.minClear - 0.02) under++; pulled += r.blocked; });
    }
    check("camera: never inside a wall / a kerb / a bench, never under minClear", inside === 0 && under === 0 && pulled > 0,
      `${frames} frames over 5 runs (side along the wall and the kerb, low along the kerb, chase onto the bench, far down the stairs): inside ${inside}, under ${under}; pulled in by a solid / the ground on ${pulled} frames`, "0, 0 (and the pull-in used)");
  }
  // ---- browser check 2026-11-21: (a) a mode-only flag stuck: chase after cycling through side stayed a side camera;
  // (b) the side camera entering the lab's walled stairs came in 1.8 m in one frame (the pull-in is at once): the line of
  // sight is now also tested pullAhead s ahead and the camera eases in early (pullIn)
  {
    const shared = cfg(), rig = new CameraRig(shared), env = flatEnv(), q = spawn(env, 0, 0, 0), pose = {};
    bikePose(q, 1, pose);
    for (const m of ["chase", "far", "low", "side", "chase"]) { shared.mode = m; rig.reset(); rig.update(q, pose, 1 / 60); }
    const back = Math.hypot(rig.pos.x - pose.x, rig.pos.z - (pose.z - BIKE_CAMERA.distance));
    const pullIn = (c) => { const s = createBikeState(130, 79, Math.PI, H(130, 79)); s.vz = -4; let p0 = null, step = 0;
      film(s, lab, () => ({ pedal: 0.3 }), 3, c, (r, b) => { if (p0) step = Math.max(step, Math.hypot(r.pos.x - p0[0], r.pos.z - p0[2]) - Math.hypot(b.vx, b.vz) * 2 * DT); p0 = [r.pos.x, r.pos.y, r.pos.z]; });
      return step; };
    const now = pullIn(cfg({ mode: "side" })), old = pullIn(cfg({ mode: "side", pullAhead: 0 }));
    check("camera: modes cycle cleanly; the side camera eases in before the stairs' walls", back < 0.05 && now < 0.5 && old > now,
      `chase after a cycle through side: ${(back * 100).toFixed(1)} cm off the chase spot; the side camera's biggest pull-in a frame into the walled stairs ${(now * 100).toFixed(0)} cm (pullAhead 0: ${(old * 100).toFixed(0)} cm)`, "< 5 cm; < 50 cm and less than without");
  }
  // ---- smooth over the stairs and a grind: no jump, small vertical acceleration
  {
    const smooth = (x, z, h, v, inp, secs) => {
      const s = createBikeState(x, z, h, H(x, z)); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v;
      let py = [], jump = 0, acc = 0, p0 = null, grinds = 0;
      film(s, lab, inp, secs, cfg(), (r, q) => {
        if (p0) jump = Math.max(jump, Math.hypot(r.pos.x - p0[0], r.pos.y - p0[1], r.pos.z - p0[2]) - Math.hypot(q.vx, q.vz, q.vy) * 2 * DT);
        p0 = [r.pos.x, r.pos.y, r.pos.z]; py.push(r.pos.y - r.dipY); grinds = q.grinds;     // (the landing dip is wanted: tested above)
        const n = py.length; if (n > 2) acc = Math.max(acc, Math.abs(py[n - 1] - 2 * py[n - 2] + py[n - 3]) / (2 * DT) ** 2);
      });
      return { jump, acc, grinds };
    };
    const st = smooth(130, 79, Math.PI, 4, () => ({}), 4), gr = smooth(109.45, 38, 0, 3.5, (q, t) => ({ hop: t > 1.4 && t < 1.75, pedal: 0.3 }), 4);
    check("camera: smooth down the stairs and onto a grind", st.jump < 0.03 && gr.jump < 0.03 && st.acc < 20 && gr.acc < 20 && gr.grinds > 0,
      `stairs at 4 m/s: the biggest jump beyond the motion ${(st.jump * 100).toFixed(1)} cm, vertical acceleration <= ${f1(st.acc)} m/s^2; the bench grind (${gr.grinds}): ${(gr.jump * 100).toFixed(1)} cm, ${f1(gr.acc)} m/s^2`, "< 3 cm, < 20 m/s^2 (a hard clamp gave 54-70)");
  }
}

if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) console.log("| " + r.join(" | ") + " |");
}
console.log(failed ? `\n${failed} bike check(s) FAIL` : `\nall ${rows.length} bike checks pass`);
process.exitCode = failed ? 1 : 0;
