// node tools/bike/bikeTest.mjs [--quiet]: the kid's BMX (viewer/bike/bikePhysics.js) without a browser (docs/BIKE.md).
// Rides scripted inputs on the lab's test ground (viewer/bike/bikeGround.js) and on synthetic grounds; prints one row
// per check; exit 1 if any fails. THE TARGETS (docs/BIKE.md "Targets"): determinism (same input twice bit-identical, a
// frame-rate split = the same steps); kid speeds (flat seated 22-28 / sprint 28-35 km/h, a 12 % descent 38-60 km/h,
// 0-20 km/h seated 4-11 s / standing 2.5-6 s); never tunnels (kicker / table / kerb / rollers at 58 km/h: no wheel deeper
// than the bottom-out + 1 cm; the wall never passed); the 15 cm kerb (a hop clears it; no hop: stopped / over the bars;
// 6 cm rolls; the drop off it ridden); 12 % pedalled seated at 1-3.5 m/s, 20 % = pushing, no roll-back; sand slows;
// landings (1 m level / 10 deg nose up ridden, 35 deg nose down = over the bars, 35 deg sideways = crash, 4 m flat = hard,
// 2.6 m crouched ridden, the kicker / table ridden hands-off, a held trick = crash); brakes (skid 6-11 m, full front
// < 6 m no endo, + lean forward = endo); the manual (assist holds, none loops out); pumping beats coasting; hop heights;
// the 25 cm log; turning; 10 minutes of random input (4 seeds): finite, never under the ground; cost; every constant a
// panel slider; the lab's model + camera with three in node (run with --import ./tools/heap/register.mjs).
import { DT, BIKE, SURF, createBikeState, stepBike, groundQuery, bikeSpeed, stateHash, advanceBike, restHeight, wheelPoints, BIKE_RANGES } from "../../viewer/bike/bikePhysics.js";
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
  const a = drop(0), b = drop(0.17), c = drop(-0.61), d = drop(0, { yaw: 0.61 }), e = drop(0, { h: 4 }), e2 = drop(0, { h: 2.6, absorb: true });
  check("1 m drop, level: ridden", a.crashes === 0 && a.lastLanding, `${a.lastLanding?.cause} vn ${f1(a.lastLanding?.vn)}`, "no crash");
  check("1 m drop, 10 deg nose up (rear first): ridden", b.crashes === 0 && b.lastLanding?.wheel === "rear", `${b.lastLanding?.cause}, ${b.lastLanding?.wheel} first`, "no crash, rear first");
  check("1 m drop, 35 deg nose down: over the bars", c.crashes === 1 && /bars/.test(c.crashCause), `"${c.crashCause}"`, "over the bars");
  check("1 m drop, 35 deg sideways: crash", d.crashes === 1 && /sideways/.test(d.crashCause), `"${d.crashCause}"`, "landed sideways");
  check("4 m flat drop: hard landing", e.crashes === 1 && /hard/.test(e.crashCause), `"${e.crashCause}" vn ${f1(e.lastLanding?.vn)}`, "hard landing");
  check("2.6 m drop absorbed (crouched): ridden", e2.crashes === 0, `${e2.lastLanding?.cause} vn ${f1(e2.lastLanding?.vn)}`, "no crash");
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
  const env = labEnv(), s = spawn(env, 0, 0, 0), inputs = randomInputs(5, 120 * 30);
  const t0 = process.hrtime.bigint();
  for (const i of inputs) stepBike(s, i, env);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / inputs.length;
  check("cost per step (node)", us < 20, `${f2(us)} us`, "< 20 us (x2 steps a frame)");
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

if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) console.log("| " + r.join(" | ") + " |");
}
console.log(failed ? `\n${failed} bike check(s) FAIL` : `\nall ${rows.length} bike checks pass`);
process.exitCode = failed ? 1 : 0;
