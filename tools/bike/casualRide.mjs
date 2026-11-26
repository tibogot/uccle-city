// THE CASUAL RIDER (docs/BIKE.md "Forgiving falls"): a node harness that rides the bike lab's spots the way a casual
// player does on a keyboard - W held the whole time (sometimes Shift), the steering in steps (A / D pressed and let go
// as the line drifts, through the keyboard's ramp, with a reaction time), no lean input (Z / X), the hop late or never,
// a few random taps - over many seeds, and logs every crash with its cause.
//   node tools/bike/casualRide.mjs [--seeds N] [--spot name] [--json]      (prints the causes table)
// Exports RUNS (the lab's spots as rides), rideCasual(run, seed) and causesTable(): tools/bike/forgivingTest.mjs (gate row
// `bikefall`) asserts on them.
import { DT, BIKE, createBikeState, stepBike, bikeSpeed } from "../../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";
import { testGroundRamped, testColliders, testEdges, PARK_WALLRIDES, KERB, SAND, PUMP, ROOTS, KICKER, TABLE, BOWL, SLOPE, STEEP, COBBLES, BUMPS, DROPS } from "../../viewer/bike/bikeGround.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";

const CL = testColliders(KIND);
const COL = buildColliders(CL.polys, CL.circles, CL.bounds);
export const labEnv = () => createBikeEnv({ sets: () => [COL], ground: testGroundRamped, edges: testEdges, wallrides: PARK_WALLRIDES });

/** a seeded random (mulberry32) */
export function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const D = Math.PI / 180;
/** a ride: start (x, z), heading h (0 = +z), the speed it arrives with [v0, v1] m/s, the line it follows (from the start
 *  along the heading, or `line` [x0, z0, x1, z1]), how far (m) / how long (s), extra: angle spread (deg) of the heading */
const R = (name, group, x, z, h, v, dist, extra = {}) => ({ name, group, x, z, h, v, dist, secs: extra.secs ?? 14, spread: extra.spread ?? 4, ...extra });
export const RUNS = [
  R("kerb up square", "kerb", 15, 12, 0, [1.5, 7.5], 14),
  R("kerb up 25 deg", "kerb", 13, 13, 25 * D, [2, 7.5], 12, { spread: 6 }),
  R("kerb up 45 deg", "kerb", 11, 14, 45 * D, [2, 7.5], 11, { spread: 6 }),
  R("kerb down square", "kerb", 15, 33, 0, [1.5, 7.5], 14),
  R("kerb down 45 deg", "kerb", 12, 34, 45 * D, [2, 7.5], 12, { spread: 6 }),
  R("kerb side 30 deg", "kerb", 6.5, 26, 60 * D, [2, 7], 10, { spread: 8 }),
  R("cobbles", "cobbles", COBBLES ? (COBBLES.x0 + COBBLES.x1) / 2 : 0, COBBLES ? COBBLES.z0 - 6 : 0, 0, [2, 8], COBBLES ? COBBLES.z1 - COBBLES.z0 + 8 : 1, { skip: !COBBLES }),
  R("bumps", "bumps", BUMPS ? (BUMPS.x0 + BUMPS.x1) / 2 : 0, BUMPS ? BUMPS.z0 - 6 : 0, 0, [2, 8], BUMPS ? BUMPS.z1 - BUMPS.z0 + 8 : 1, { skip: !BUMPS }),
  R("roots", "roots", (ROOTS.x0 + ROOTS.x1) / 2, ROOTS.z0 - 4, 0, [2, 7], ROOTS.z1 - ROOTS.z0 + 6),
  R("pump rollers", "pump", (PUMP.x0 + PUMP.x1) / 2, PUMP.z0 - 8, 0, [2, 9], PUMP.n * PUMP.lambda + 10),
  R("sand", "sand", (SAND.x0 + SAND.x1) / 2, SAND.z0 - 10, 0, [3, 8], SAND.z1 - SAND.z0 + 12, { secs: 12 }),
  R("sand turning", "sand", (SAND.x0 + SAND.x1) / 2, SAND.z0 - 6, 0, [3, 7], 30, { secs: 10, weave: 1 }),
  R("slope 12 % up + down", "slope", 30, 0, Math.PI / 2, [3, 7], 110, { secs: 40 }),
  R("slope 12 % down weaving", "slope", SLOPE.x0 + 50, 0, Math.PI / 2, [2, 5], 55, { secs: 14, weave: 1 }),
  R("steep 20 % up + down", "slope", 30, (STEEP.z0 + STEEP.z1) / 2, Math.PI / 2, [2, 6], 60, { secs: 40 }),
  R("kicker", "jump", 0, 6, 0, [3, 9.5], 28, { spread: 3 }),
  R("table", "jump", 0, 30, 0, [3, 10], 32, { spread: 3 }),
  R("bowl across", "bowl", BOWL.x, BOWL.z - BOWL.R - 6, 0, [3, 8], 2 * BOWL.R + 10, { spread: 10 }),
  R("bowl carving", "bowl", BOWL.x, BOWL.z - BOWL.R + 2, 0, [3, 7], 50, { secs: 16, weave: 1, spread: 20 }),
  R("small drops", "drop", DROPS ? DROPS.x : 0, DROPS ? DROPS.z0 - 6 : 0, 0, [2, 8], DROPS ? DROPS.len + 10 : 1, { skip: !DROPS }),
  R("hill 6 % down", "descent", 154, 38, Math.PI / 2, [0, 2], 280, { secs: 45, spread: 2 }),
  R("hill 12 % down", "descent", 154, 62, Math.PI / 2, [0, 2], 220, { secs: 35, spread: 2 }),
  R("plaza wandering", "plaza", 0, -2, Math.PI / 2, [2, 6], 60, { secs: 20, weave: 1, spread: 180 }),
];

/** One casual ride. Returns { crashes: [{cause, t, x, z, v}], blocked, landings: {clean, sketchy}, secs, dist } */
export function rideCasual(run, seed, { env = labEnv(), B = BIKE, onStep = null, input: inMod = null } = {}) {
  const r = rng(seed * 7919 + run.name.length * 104729 + 13);
  const h0 = run.h + (r() * 2 - 1) * run.spread * D;
  const q = {}; env.ground(run.x, run.z, q);
  const s = createBikeState(run.x, run.z, h0, q.h, B);
  const v0 = run.v[0] + (run.v[1] - run.v[0]) * r();
  s.vx = Math.sin(h0) * v0; s.vz = Math.cos(h0) * v0;
  // the rider's habits (per seed)
  const sprinter = r() < 0.3, react = 0.12 + r() * 0.2, dead = 0.06 + r() * 0.1;
  const hopper = r() < 0.5, tapper = r() < 0.6;
  const fx0 = Math.sin(h0), fz0 = Math.cos(h0);
  let steerKey = 0, steerK = 0, nextLook = 0, hopUntil = -1, hopAt = hopper ? 0.5 + r() * 4 : Infinity, tapUntil = -1, tapDir = 0, nextTap = 1 + r() * 3;
  let weaveDir = r() < 0.5 ? 1 : -1, nextWeave = 1 + r() * 2;
  const out = { crashes: [], blocked: 0, landings: { clean: 0, sketchy: 0, bail: 0 }, secs: 0, dist: 0, maxV: 0 };
  let landN = 0, crashN = 0, blockedPrev = 0;
  const n = Math.round(run.secs / DT);
  const inp = { pedal: 1, sprint: false, brakeF: 0, brakeR: 0, steer: 0, lean: 0, hop: false, pump: 0, trick: false };
  for (let i = 0; i < n; i++) {
    const t = i * DT;
    // the steering: every `react` s the rider looks: back toward the line (heading error + cross-track), A / D held while off
    if (t >= nextLook) {
      nextLook = t + react;
      const dx = s.x - run.x, dz = s.z - run.z, along = dx * fx0 + dz * fz0, cross = dx * fz0 - dz * fx0;   // cross > 0 = left of the line
      let want = h0 - Math.max(-0.6, Math.min(0.6, cross * 0.35));
      if (run.weave) { if (t > nextWeave) { weaveDir = -weaveDir; nextWeave = t + 1 + r() * 2; } want += weaveDir * 0.3; }
      let err = want - (s.heading + s.yawVel * 0.35); err -= Math.round(err / (2 * Math.PI)) * 2 * Math.PI;
      steerKey = s.crashed ? 0 : err > dead ? 1 : err < -dead ? -1 : 0;
      void along;
    }
    // random taps (a casual thumb)
    if (tapper && t > nextTap) { tapDir = r() < 0.5 ? 1 : -1; tapUntil = t + 0.08 + r() * 0.25; nextTap = t + 1.5 + r() * 3; }
    const key = t < tapUntil ? tapDir : steerKey;
    // the keyboard ramp (bikeInput.js compute)
    const rate = key === 0 || Math.sign(key) !== Math.sign(steerK) ? 7 : 3.4;
    steerK += Math.max(-rate * DT, Math.min(rate * DT, key - steerK));
    // the hop: late (a random moment, held 0.15-0.45 s), or never
    if (t >= hopAt) { hopUntil = t + 0.15 + r() * 0.3; hopAt = t + 2 + r() * 4; }
    inp.pedal = 1; inp.sprint = sprinter && !s.pushing; inp.steer = steerK; inp.hop = t < hopUntil;
    if (inMod) inMod(inp, s, t);
    stepBike(s, inp, env, B);
    if (onStep) onStep(s, t);
    out.maxV = Math.max(out.maxV, Math.abs(bikeSpeed(s)));
    if (s.crashes > crashN) {
      crashN = s.crashes;
      const L = s.lastLanding, landed = L && Math.abs(L.t - s.t) < DT * 1.5 && L.band === "bail";
      out.crashes.push({ cause: (landed ? "landing: " : "") + s.crashCause, t, x: +s.x.toFixed(2), z: +s.z.toFixed(2), v: +Math.hypot(s.vx, s.vz).toFixed(2), seed });
    }
    if (s.landings > landN) { landN = s.landings; const b = s.lastLanding.band; out.landings[b] = (out.landings[b] || 0) + 1; }
    if (s.blocked > blockedPrev) { out.blocked += s.blocked - blockedPrev; blockedPrev = s.blocked; }
    out.secs = t + DT;
    const dx = s.x - run.x, dz = s.z - run.z;
    out.dist = Math.max(out.dist, dx * fx0 + dz * fz0);
    if (!run.weave && out.dist > run.dist && !s.crashed) break;
  }
  out.state = s;
  return out;
}

/** all runs x seeds -> { byRun: { name: { rides, crashes, perMin, causes{}, blocked, sketchy, clean } }, causes{}, total } */
export function causesTable(seeds = 40, only = null, opts = {}) {
  const env = labEnv(), byRun = {}, causes = {};
  let total = 0, secs = 0;
  for (const run of RUNS) {
    if (run.skip || (only && !only.includes(run.name) && !only.includes(run.group))) continue;
    const row = byRun[run.name] = { group: run.group, rides: 0, crashes: 0, secs: 0, causes: {}, blocked: 0, clean: 0, sketchy: 0, examples: [] };
    for (let k = 0; k < seeds; k++) {
      const o = rideCasual(run, k + 1, { env, ...opts });
      row.rides++; row.secs += o.secs; row.blocked += o.blocked; row.clean += o.landings.clean; row.sketchy += o.landings.sketchy;
      for (const c of o.crashes) { row.crashes++; row.causes[c.cause] = (row.causes[c.cause] || 0) + 1; causes[c.cause] = (causes[c.cause] || 0) + 1; total++; if (row.examples.length < 3) row.examples.push(c); }
    }
    row.perMin = row.crashes / (row.secs / 60);
    secs += row.secs;
  }
  return { byRun, causes, total, perMin: total / (secs / 60), seeds };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:")}` || process.argv[1]?.endsWith("casualRide.mjs")) {
  const a = process.argv, seeds = +(a[a.indexOf("--seeds") + 1] || 0) || 40, spot = a.includes("--spot") ? a[a.indexOf("--spot") + 1].split(",") : null;
  const T = causesTable(seeds, spot);
  if (a.includes("--json")) { console.log(JSON.stringify(T, null, 1)); process.exit(0); }
  console.log(`casual rider: ${seeds} seeds a spot (W held, stepped steering, no lean, late / no hop)\n`);
  console.log("| ride | crashes / rides | per min | stops (blocked) | landings clean / sketchy | causes |");
  console.log("|---|---|---|---|---|---|");
  for (const [name, r] of Object.entries(T.byRun)) console.log(`| ${name} | ${r.crashes} / ${r.rides} | ${r.perMin.toFixed(2)} | ${r.blocked} | ${r.clean} / ${r.sketchy} | ${Object.entries(r.causes).map(([c, n]) => `${c} ${n}`).join(", ")} |`);
  console.log(`\nall: ${T.total} crashes, ${T.perMin.toFixed(2)} a minute`);
  console.log("| cause | crashes |\n|---|---|");
  for (const [c, n] of Object.entries(T.causes).sort((x, y) => y[1] - x[1])) console.log(`| ${c} | ${n} |`);
}
