// node --expose-gc tools/carHitTest.mjs: two-way car contact without a browser (docs/CARHIT.md, rule 37).
// The player's car is the real one (carCtl.js stepCtl through carEnv.js with the CarHitWorld, 60 fps frames, 120 Hz
// substeps); the hit cars are free bodies of viewer/drive/carHit.js on a flat ground, walls from colliders.js
// buildColliders. Checks (exit 1 on a failure):
//   head-on 50 km/h      the hit car shoved on along the line (3-16 m), barely turned (< 12 deg); the player slowed
//   T-bone 30 km/h       the hit car shoved sideways (lateral > 1 m, more than along), little spin (< 30 deg)
//   rear-corner nudge    a moving car nudged at its rear quarter spins (> 35 deg) while a centred side push does not
//   tap 5 km/h           a car standing in a queue barely moves (< 0.25 m)
//   van vs small car     the same T-bone moves a panel van < 0.6 x what it moves a small hatchback
//   wall                 a car sliding sideways into a building, a parked car pushed into a wall by the player:
//                        never more than 5 cm inside the wall at any substep, the player never inside the car
//   momentum             200 random car-car impulses: linear + angular momentum kept (< 0.1 %)
//   NaN                  500 random hits (any angle, speed, type, spin): every value finite, every car settles
//   cost                 the solver per contact pair (us), a body's substep (us)
//   allocation           20 000 substeps of 4 bodies sliding into walls and each other: no heap growth (< 32 KB)
import { register } from "node:module";
import { measure, timed, gateExit } from "./gate/timing.mjs";

const STUB = `export class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} }`;
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(s, c, n) { if (s === "three/webgpu") return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(STUB)}), shortCircuit: true }; return n(s, c); }`));
globalThis.addEventListener = () => {};

const { createCtlState, stepCtl } = await import("../viewer/drive/carCtl.js");
const { createCarEnv } = await import("../viewer/drive/carEnv.js");
const { HANDLING } = await import("../viewer/drive/carPhysics.js");
const { buildColliders } = await import("../viewer/drive/colliders.js");
const { CarHitWorld, HIT, massOf } = await import("../viewer/drive/carHit.js");
const { obbObb: OBB } = await import("../viewer/drive/obb.js");

const DT = 1 / 60, KMH = 1 / 3.6, DEG = 180 / Math.PI;
const SZ = { hatch_s: [1.77, 4.09, 2.56], hatch_c: [1.81, 4.31, 2.66], estate: [1.85, 4.70, 2.69], suv: [1.84, 4.33, 2.64], van_p: [1.95, 5.03, 3.0] };
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const out = [];
function check(name, ok, msg) { out.push(`| ${name} | ${ok ? "pass" : "**FAIL**"} | ${msg} |`); if (!ok) { fails++; console.log(`  FAIL ${name}: ${msg}`); } }
const wrap = (a) => { a %= 2 * Math.PI; return a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a; };
const f2 = (x, d = 2) => x.toFixed(d);

/** a scene: walls (axis boxes [x0, z0, x1, z1]) */
function scene(walls = []) {
  const polys = walls.map(([x0, z0, x1, z1]) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind: 0 }));
  const col = buildColliders(polys, [], { x0: -200, x1: 200, z0: -200, z1: 200 });
  const sets = () => [col];
  const world = new CarHitWorld({ sets, ground: () => 0 });
  world.player.m = massOf("hatch_c");
  const env = createCarEnv({ sets, ground: () => 0, handling: HANDLING, feel: true, carHit: world });
  return { world, env, walls };
}
function body(W, type, x, z, h, o = {}) {
  const [w, len, wb] = SZ[type];
  return W.world.addBody({ x, z, h, type, w, len, wb, ...o });
}
/** the player's car at (x, z, heading) at speed v (m/s); input each frame: (t, c) -> { throttle, steer } */
function player(W, x, z, h, v) {
  const c = createCtlState(x, z, h);
  c.y = 0;
  stepCtl(c, { throttle: 0, steer: 0 }, DT, W.env);
  c.x = x; c.z = z; c.heading = h; c.speed = v; c.vx = c.vz = 0; c.angularVel = 0;
  return c;
}
/** run frames; each(t) after each frame */
function run(W, c, secs, input = () => ({ throttle: 0, steer: 0 }), each = null) {
  for (let f = 0, t = 0; f < secs / DT; f++, t += DT) {
    if (c) stepCtl(c, input(t, c), DT, W.env);
    W.world.frame(DT, c ? c.x : 0, c ? c.z : 0);
    each?.(t);
  }
}
const pose = (w, k) => ({ x: w.x[k], z: w.z[k], h: w.h[k] });

// ---------------------------------------------------------------- 1 head-on: hatch at 50 km/h into a standing hatch, nose to nose
{
  const W = scene(), k = body(W, "hatch_c", 0, 14, Math.PI, { braking: false }), c = player(W, 0, 0, 0, 50 * KMH);
  const p0 = pose(W.world, k);
  let v1 = null;
  run(W, c, 5, () => ({ throttle: 0, steer: 0 }), () => { if (v1 === null && W.world.player.hits) v1 = c.speed; });
  const p = pose(W.world, k), d = Math.hypot(p.x - p0.x, p.z - p0.z), turn = Math.abs(wrap(p.h - p0.h)) * DEG;
  check("head-on 50 km/h", d > 3 && d < 16 && turn < 12 && v1 !== null && v1 < 0.6 * 50 * KMH && p.z > p0.z,
    `hit car shoved ${f2(d)} m along the line, turned ${f2(turn, 1)} deg; player 13.9 -> ${f2(v1 ?? NaN)} m/s at the hit; player dent ${f2(W.world.player.damage)}`);
}
// ---------------------------------------------------------------- 2 T-bone: 30 km/h into the middle of a standing car's side
function tbone(type, kmh = 30) {
  const W = scene(), k = body(W, type, 0, 9, Math.PI / 2, { braking: true }), c = player(W, 0, 0, 0, kmh * KMH);
  const p0 = pose(W.world, k);
  run(W, c, 5);
  const p = pose(W.world, k), h0 = p0.h;
  const dx = p.x - p0.x, dz = p.z - p0.z;
  const along = Math.abs(dx * Math.sin(h0) + dz * Math.cos(h0)), lat = Math.abs(dx * Math.cos(h0) - dz * Math.sin(h0));
  return { lat, along, turn: Math.abs(wrap(p.h - h0)) * DEG, W, c };
}
{
  const r = tbone("hatch_c");
  check("T-bone 30 km/h", r.lat > 1 && r.lat > r.along && r.turn < 30, `shoved sideways ${f2(r.lat)} m (along ${f2(r.along)} m), turned ${f2(r.turn, 1)} deg`);
}
// ---------------------------------------------------------------- 3 rear-corner nudge vs a centred side push, both cars moving at 30 km/h
function nudge(offset) {
  // the hit car drives north at 30 km/h; the player alongside on its left, 2 km/h faster, its nose level with the
  // point `offset` m along the hit car (from its centre), angled 7 deg in and steering into it for a second
  const W = scene(), v = 30 * KMH, k = body(W, "hatch_c", 0, 0, 0, { vz: v });
  const c = player(W, 2.4, offset - 2.155, -0.12, v + 0.6);
  const h0 = W.world.h[k];
  let maxW = 0;
  run(W, c, 4, (t) => ({ throttle: t < 1 ? 0.6 : 0, steer: t < 1 ? -0.4 : 0 }), () => { maxW = Math.max(maxW, Math.abs(W.world.w[k])); });
  return { turn: Math.abs(wrap(W.world.h[k] - h0)) * DEG, maxW, hit: W.world.player.hits };
}
{
  const rear = nudge(-1.2), mid = nudge(0.3);
  check("rear-corner nudge spins it", rear.hit > 0 && rear.turn > 35 && rear.turn > 2 * mid.turn,
    `rear quarter: turned ${f2(rear.turn, 1)} deg (peak ${f2(rear.maxW)} rad/s); same push at the middle: ${f2(mid.turn, 1)} deg`);
}
// ---------------------------------------------------------------- 4 tap: 5 km/h into the back of a car standing in a queue
{
  const W = scene(), k = body(W, "hatch_c", 0, 6, 0, { braking: true }), c = player(W, 0, 0, 0, 5 * KMH);
  const p0 = pose(W.world, k);
  run(W, c, 3, (t, cc) => (W.world.player.hits ? { throttle: -1, steer: 0 } : { throttle: cc.speed < 5 * KMH ? 0.4 : 0, steer: 0 }));
  const p = pose(W.world, k), d = Math.hypot(p.x - p0.x, p.z - p0.z);
  check("tap 5 km/h", W.world.player.hits > 0 && d < 0.25 && W.world.player.damage === 0, `moved ${f2(d, 3)} m, no dent (player damage ${W.world.player.damage})`);
}
// ---------------------------------------------------------------- 5 mass: the same T-bone into a panel van and a small hatchback
{
  const van = tbone("van_p"), small = tbone("hatch_s");
  check("van vs small car", van.lat < 0.6 * small.lat, `van shoved ${f2(van.lat)} m, small hatch ${f2(small.lat)} m (ratio ${f2(van.lat / small.lat)}; masses ${massOf("van_p")} / ${massOf("hatch_s")} kg)`);
}
// ---------------------------------------------------------------- 6 walls
/** deepest penetration (m) of body k's corners into the axis boxes */
function inside(w, k, walls) {
  let worst = 0;
  const s = Math.sin(w.h[k]), c = Math.cos(w.h[k]);
  for (let q = 0; q < 4; q++) {
    const su = q & 1 ? 1 : -1, sw = q & 2 ? 1 : -1;
    const px = w.x[k] + su * w.hx[k] * c + sw * w.hz[k] * s, pz = w.z[k] - su * w.hx[k] * s + sw * w.hz[k] * c;
    for (const [x0, z0, x1, z1] of walls) if (px > x0 && px < x1 && pz > z0 && pz < z1) worst = Math.max(worst, Math.min(px - x0, x1 - px, pz - z0, z1 - pz));
  }
  return worst;
}
{
  // a car sliding sideways at 12 m/s into a building front
  const walls = [[-20, 10, 20, 30]];
  const W = scene(walls), k = body(W, "hatch_c", 0, 4, Math.PI / 2, { vz: 12 });
  let worst = 0;
  const w = W.world, sub = w.substep.bind(w);
  w.substep = (h) => { sub(h); worst = Math.max(worst, inside(w, k, walls)); };
  run(W, null, 3);
  const edge = w.z[k] + w.hx[k];
  check("slid into a building", worst < 0.05 && edge <= 10.05 && Math.hypot(w.vx[k], w.vz[k]) < 0.1, `deepest ${f2(worst * 100, 1)} cm inside at any substep; stops with its side at z ${f2(edge)} (wall 10)`);
}
{
  // the player pushes a parked car (handbrake) into a wall at full throttle for 4 s
  const walls = [[-20, 14, 20, 30]];
  const W = scene(walls), k = body(W, "hatch_c", 0, 9.5, 0, { parked: true }), c = player(W, 0, 0, 0, 3);
  let worst = 0, inCar = 0;
  const w = W.world, sub = w.substep.bind(w);
  w.substep = (h) => { sub(h); worst = Math.max(worst, inside(w, k, walls)); };
  const ob = { nx: 0, nz: 0, depth: 0 };
  run(W, c, 5, () => ({ throttle: 1, steer: 0 }), () => {
    if (OBB(c.x, c.z, c.heading, 0.905, 2.155, w.x[k], w.z[k], w.h[k], w.hx[k], w.hz[k], ob)) inCar = Math.max(inCar, ob.depth);
  });
  check("pushed into a wall", worst < 0.05 && inCar < 0.12 && w.z[k] + w.hz[k] <= 14.05,
    `parked car: deepest ${f2(worst * 100, 1)} cm in the wall, nose at z ${f2(w.z[k] + w.hz[k])} (wall 14); the player at most ${f2(inCar * 100, 1)} cm in it (end of frame)`);
}
// ---------------------------------------------------------------- 7 momentum (linear + angular about the origin) over the impulse alone
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
{
  const R = rnd(7), W = scene(), w = W.world, types = Object.keys(SZ);
  let worstP = 0, worstL = 0, n = 0;
  for (let t = 0; t < 200; t++) {
    for (let k = 0; k < 16; k++) w.free(k);
    const a = body(W, types[Math.floor(R() * 5)], 0, 0, R() * 6.28, { vx: (R() - 0.5) * 30, vz: (R() - 0.5) * 30, yawRate: (R() - 0.5) * 4 });
    const ang = R() * 6.28, b = body(W, types[Math.floor(R() * 5)], Math.sin(ang) * 3.2, Math.cos(ang) * 3.2, R() * 6.28, { vx: (R() - 0.5) * 30, vz: (R() - 0.5) * 30, yawRate: (R() - 0.5) * 4 });
    const o = { nx: 0, nz: 0, depth: 0 };
    if (!OBB(w.x[a], w.z[a], w.h[a], w.hx[a], w.hz[a], w.x[b], w.z[b], w.h[b], w.hx[b], w.hz[b], o)) continue;
    // positional separation first (pair() does it), then measure across the impulse only
    const iA = w.iM[a], iB = w.iM[b], s = iA + iB;
    w.x[a] += o.nx * o.depth * iA / s; w.z[a] += o.nz * o.depth * iA / s; w.x[b] -= o.nx * o.depth * iB / s; w.z[b] -= o.nz * o.depth * iB / s;
    const mom = () => {
      let px = 0, pz = 0, L = 0;
      for (const k of [a, b]) { const m = w.m[k]; px += m * w.vx[k]; pz += m * w.vz[k]; L += w.w[k] / w.iI[k] + m * (w.z[k] * w.vx[k] - w.x[k] * w.vz[k]); }
      return [px, pz, L];
    };
    const [px0, pz0, L0] = mom();
    w.pairPoint(a, b, o.nx, o.nz);
    const jn = w.impulse(a, b, w.cp[0], w.cp[1], o.nx, o.nz, w.rest(3), HIT.muBody);
    if (!(jn > 0)) continue;
    const [px1, pz1, L1] = mom();
    const P0 = Math.hypot(px0, pz0) + jn;
    worstP = Math.max(worstP, Math.hypot(px1 - px0, pz1 - pz0) / P0);
    worstL = Math.max(worstL, Math.abs(L1 - L0) / (Math.abs(L0) + jn * 3));
    n++;
  }
  check("momentum kept", n > 50 && worstP < 1e-3 && worstL < 1e-3, `${n} impulses: linear error <= ${(worstP * 100).toExponential(1)} %, angular <= ${(worstL * 100).toExponential(1)} %`);
}
// ---------------------------------------------------------------- 8 NaN / settle: 500 random hits with the real player car, walls round
{
  const R = rnd(11), walls = [[-40, -40, 40, -30], [-40, 30, 40, 40], [-40, -30, -30, 30], [30, -30, 40, 30], [-3, -3, 3, 3]];
  let bad = 0, unsettled = 0, deepest = 0, runs = 0;
  for (let t = 0; t < 500; t++) {
    const W = scene(walls), w = W.world, types = Object.keys(SZ);
    const ang = R() * 6.28, k = body(W, types[Math.floor(R() * 5)], 12 * Math.cos(ang), 12 * Math.sin(ang), R() * 6.28, { braking: R() < 0.5, parked: R() < 0.3 });
    const toward = Math.atan2(w.x[k] - (-12 * Math.cos(ang)), w.z[k] - (-12 * Math.sin(ang))) + (R() - 0.5) * 0.4;
    const c = player(W, 12 * Math.cos(ang + 0.9), 12 * Math.sin(ang + 0.9), toward, (5 + R() * 70) * KMH);
    c.heading = Math.atan2(w.x[k] - c.x, w.z[k] - c.z) + (R() - 0.5) * 0.5;
    const sub = w.substep.bind(w);
    w.substep = (h) => { sub(h); deepest = Math.max(deepest, inside(w, k, walls)); };
    run(W, c, 6, (tt) => ({ throttle: tt < 1.5 ? 0.5 : 0, steer: (R() - 0.5) * 0.4 }));
    runs++;
    for (const a of [w.x[k], w.z[k], w.h[k], w.vx[k], w.vz[k], w.w[k], c.x, c.z, c.heading, c.speed]) if (!Number.isFinite(a)) bad++;
    if (w.act[k] && Math.hypot(w.vx[k], w.vz[k]) > 0.3) unsettled++;
  }
  check("no NaN, settles", bad === 0 && unsettled <= 5 && deepest < 0.08, `${runs} random hits (5-75 km/h, any angle / type, parked or not): ${bad} non-finite, ${unsettled} still sliding after 6 s, deepest in a wall ${f2(deepest * 100, 1)} cm`);
}
// ---------------------------------------------------------------- 9 cost
{
  const W = scene([[-20, 10, 20, 30], [5, -20, 8, 20]]), w = W.world;
  const a = body(W, "hatch_c", 0, 0, 0), b = body(W, "suv", 0.6, 4.0, 0.3);
  const o = { nx: 0, nz: 0, depth: 0 };
  const N = 200000;
  // (between two calibrations, the budgets * k: tools/gate/timing.mjs; once: the loops change the world)
  const MT = await measure(() => {
  let t0 = performance.now();
  for (let i = 0; i < N; i++) {
    w.x[a] = 0; w.z[a] = 0; w.h[a] = 0; w.vx[a] = 0; w.vz[a] = 10; w.w[a] = 0;
    w.x[b] = 0.6; w.z[b] = 4.0; w.h[b] = 0.3; w.vx[b] = 0; w.vz[b] = 0; w.w[b] = 0;
    if (OBB(w.x[a], w.z[a], w.h[a], w.hx[a], w.hz[a], w.x[b], w.z[b], w.h[b], w.hx[b], w.hz[b], o)) w.pair(a, b, o.nx, o.nz, o.depth);
  }
  const usPair = (performance.now() - t0) * 1000 / N;
  // a body's substep: tyres + statics against the gathered walls (2 bodies sliding)
  for (let k = 0; k < 16; k++) w.free(k);
  const c1 = body(W, "hatch_c", 0, 4, 1.2, { vx: 3, vz: 6 }), c2 = body(W, "van_p", 3, -4, 0.2, { vx: 1, vz: 2 });
  w.frame(DT);
  const M = 20000;
  t0 = performance.now();
  for (let i = 0; i < M; i++) {
    if (i % 2000 === 0) { w.x[c1] = 0; w.z[c1] = 4; w.vx[c1] = 3; w.vz[c1] = 6; w.x[c2] = 3; w.z[c2] = -4; w.vx[c2] = 1; w.vz[c2] = 2; w.act[c1] = w.act[c2] = 1; w.nAwake = 2; }
    w.substep(1 / 120);
  }
  const usBody = (performance.now() - t0) * 1000 / M / 2;
  return { usPair, usBody };
  }, { tries: 1 });
  const { usPair, usBody } = MT.value;
  check("solver cost", timed(usPair < 5 * MT.k && usBody < 20 * MT.k), `${f2(usPair, 2)} us per contact pair (SAT + point + impulse + friction + dents), ${f2(usBody, 2)} us per body substep (tyres + walls + body pairs); 16 awake bodies at 120 Hz < ${f2(usBody * 16 * 120 / 1000, 2)} ms/s (${MT.note})`);
}
// ---------------------------------------------------------------- 10 allocation in the step (V8's sampling heap profiler)
{
  const { Session } = await import("node:inspector/promises");
  const walls = [[-20, 12, 20, 30], [6, -20, 9, 20]];
  const W = scene(walls), w = W.world;
  for (let k = 0; k < 4; k++) body(W, ["hatch_c", "suv", "van_p", "hatch_s"][k], 0, 0, 0, { parked: k === 3 });
  const X = [0, 2, -4, -2], Z = [2, -2, 0, 5], VX = [0, 8, 0, 0], VZ = [9, 3, 7, 0], H = [1.57, 0.4, 0, 0], YR = [0, 1, 0, 0];
  const set = () => { for (let k = 0; k < 4; k++) { w.act[k] = 1; w.x[k] = X[k]; w.z[k] = Z[k]; w.vx[k] = VX[k]; w.vz[k] = VZ[k]; w.w[k] = YR[k]; w.h[k] = H[k]; w.y[k] = 0; } w.nAwake = 4; };
  const loop = () => { for (let r = 0; r < 20; r++) { set(); for (let k = 0; k < 4; k++) w.gatherNear(k); for (let i = 0; i < 1000; i++) w.substep(1 / 120); } };
  loop(); loop(); loop();                                            // (JIT warm)
  const ses = new Session(); ses.connect();
  await ses.post("HeapProfiler.enable");
  // two measured runs: garbage made per step shows in both (>= 16 B a step = 320 KB a run); a tier-up / deopt's
  // one-off allocation (a few KB, now and then) in one at most
  const runs = [];
  let events = 0;
  for (let m = 0; m < 3; m++) {
    const s0 = w.stats.solves + w.stats.statics;
    await ses.post("HeapProfiler.startSampling", { samplingInterval: 64 });
    for (let r = 0; r < 20; r++) { set(); for (let i = 0; i < 1000; i++) w.substep(1 / 120); }
    const { profile } = await ses.post("HeapProfiler.stopSampling");
    let bytes = 0;
    const ours = /\/(carHit|carEnv|colliders|obb)\.js$/;
    const walk = (n, inOurs) => { const o = inOurs || ours.test(n.callFrame.url); if (o) bytes += n.selfSize; for (const c of n.children) walk(c, o); };
    walk(profile.head, false);
    runs.push(bytes); events = w.stats.solves + w.stats.statics - s0;
  }
  ses.disconnect();
  const least = Math.min(...runs);
  check("no allocation in the step", least < 2048 && events > 100,
    `20 000 substeps x 4 bodies (${events} impulses on walls / cars) per run: ${runs.join(" / ")} bytes in carHit / carEnv / colliders / obb (V8 sampling heap profiler, 64 B; per-step garbage would be >= 320 000)`);
}

console.log(`\n## carHitTest (docs/CARHIT.md, rule 37)\n| check | result | measured |\n|---|---|---|\n${out.join("\n")}`);
if (!QUIET || fails) console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks pass");
process.exitCode = gateExit(fails);   // (75: only timing verdicts failed, rule timing-rows-alone)
