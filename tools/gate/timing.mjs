// Wall-time asserts that hold on a busy machine (docs/SPEED_PLAN.md job 6, docs/WORKFLOW.md "Timing rows").
// A gate row that asserts a wall time (a slice <= 3 ms, a cull <= 20 us) measured one sample of a machine that may be
// running a census next to it: 4 of 13 logged gate runs failed on timing alone. Here:
//   - calibrate(): a fixed CPU loop, the best of 7 (~2 ms each): how fast this process runs right now;
//   - measure(fn): calibrate, run fn, calibrate again; when the two differ by more than 15 % the machine changed speed
//     during the measurement (a turbo / power state, a burst of other work): the run is discarded and measured again
//     (up to 5 times; then the steadiest run is kept and marked unsteady);
//   - k: the slow-down vs the fastest calibration this machine ever gave (.cache/gate/calib.json), >= 1, capped at 3:
//     budgets are `budget * k`, so a check asks "as fast as the code allows on this machine as it is now";
//   - bestOf(n, fn): the worst-step checks take the best of n repeats (one preemption is not the code's step).
// Never process.cpuUsage() for a window under 1 s on Windows: it counts in 15.6 ms ticks.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CALIB = path.join(ROOT, ".cache/gate/calib.json");
const TOL = 0.15, TRIES = 5, K_MAX = 3;

let sink = 0;
function loop() {
  // float math + a typed array walk + a small allocation: the mix the checks measure
  const a = new Float64Array(4096);
  let s = 0;
  for (let r = 0; r < 160; r++) for (let i = 0; i < a.length; i++) { a[i] = a[i] * 0.5 + Math.sqrt(i + r) * 1e-3; s += a[i]; }
  sink += s;
}
/** ms of the fixed loop, the best of `reps` */
export function calibrate(reps = 7) {
  loop();
  let best = Infinity;
  for (let i = 0; i < reps; i++) { const t = performance.now(); loop(); best = Math.min(best, performance.now() - t); }
  return best;
}

let ref = null;
function reference(c) {
  if (ref == null) { try { ref = JSON.parse(readFileSync(CALIB, "utf8")).ms; } catch { ref = Infinity; } }
  if (c < ref) {
    ref = c;
    try { mkdirSync(path.dirname(CALIB), { recursive: true }); writeFileSync(CALIB, JSON.stringify({ ms: c, at: new Date().toISOString(), node: process.version })); } catch {}
  }
  return ref;
}

/**
 * fn() between two calibrations, again while they differ by > 15 %. Returns { value, k, drift, tries, steady, note }:
 * value = fn's result of the kept run; k = the slow-down (budgets * k); note = a short text for the check's message
 */
export async function measure(fn, { tries = TRIES } = {}) {
  let best = null;
  for (let t = 1; t <= tries; t++) {
    const c0 = calibrate();
    const value = await fn();
    const c1 = calibrate();
    const drift = Math.abs(c1 - c0) / Math.min(c0, c1);
    const r = { value, c0, c1, drift, tries: t, steady: drift <= TOL };
    if (!best || drift < best.drift) best = r;
    if (r.steady) break;
  }
  const c = Math.max(best.c0, best.c1), k = Math.min(K_MAX, Math.max(1, c / reference(Math.min(best.c0, best.c1))));
  best.k = k;
  best.note = `k ${k.toFixed(2)}, calibration drift ${(best.drift * 100).toFixed(0)} %${best.steady ? "" : " (UNSTEADY: kept the steadiest of " + best.tries + ")"}${best.tries > 1 ? `, ${best.tries} tries` : ""}`;
  return best;
}

/** the smallest of n results of fn() (fn returns a number, or an object with the number at `key`) */
export async function bestOf(n, fn, key = null) {
  let best = null;
  for (let i = 0; i < n; i++) {
    const r = await fn(i);
    if (best == null || (key ? r[key] < best[key] : r < best)) best = r;
  }
  return best;
}

/**
 * A sliced builder's steps, timed without the machine's noise: drain the generator `runs` times (makeGen() makes a
 * fresh one, the same steps each time), time every step (one next() call) and keep each step's best over the runs: a
 * preemption lands on one run's step, not on the same step of every run. Returns { value, steps, maxStep, slices(ms),
 * longest(ms) }: slices / longest = what a slicer cutting at `ms` makes of the clean steps. A step that is long in every
 * run (a piece too big) shows; the slicer's own yields are checked on a real run against slices(ms).
 */
export function cleanSteps(makeGen, runs = 5) {
  let mins = null, value;
  for (let r = 0; r < runs; r++) {
    const g = makeGen(), t = [];
    let a = performance.now(), x;
    while (!(x = g.next()).done) { const b = performance.now(); t.push(b - a); a = b; }
    t.push(performance.now() - a);
    value = x.value;
    if (!mins) mins = t; else for (let i = 0; i < Math.min(mins.length, t.length); i++) mins[i] = Math.min(mins[i], t[i]);
  }
  const sim = (ms) => { let s = 0, n = 1, longest = 0; for (const d of mins) { s += d; if (s > ms) { longest = Math.max(longest, s); n++; s = 0; } } return { slices: n, longest: Math.max(longest, s) }; };
  return { value, steps: mins.length, maxStep: Math.max(...mins), slices: (ms) => sim(ms).slices, longest: (ms) => sim(ms).longest };
}

/**
 * A COST RATIO that holds on a loaded machine (claude/parking1, rule timing-rows): A's cost per unit of work over B's,
 * in this process's CPU time, not wall time. A wall-time A/B counts the time another process held the core as the
 * code's own: the trafmix "sim cost" row read x1.04-1.17 for the same code depending on what ran beside it (x1.138 on
 * claude/foundation with two jobs on the laptop, a pass alone). Here:
 *   - a and b: n runners each (n even), run() does one fixed batch of work and returns its work units (cars x steps);
 *   - rounds of A B B A blocks (a0 b0 b1 a1, a2 b2 b3 a3, ...), the order rotated each round, each block `batches`
 *     calls of run(): the same work, so the same traffic, every time the check runs;
 *   - each runner's CPU time (process.cpuUsage, user + system) is SUMMED over its blocks: a block of 150 steps is
 *     ~40 ms, too short to time on its own with Windows' 15.6 ms ticks, but a tick's error is random per reading and
 *     averages out over the rounds (30 blocks: ~2 %); the time another process takes the core is not this process's
 *     CPU time at all;
 *   - ratio = the a runners' costs (CPU per unit, each runner's total) summed over the b runners'.
 *   - `reps` times on fresh runners (make()): the same traffic again, the CPU summed: more of it against the ticks.
 * Returns { ratio, twin (b0 against b1: the floor of what this measures), a, b (us per unit, the runners' mean), cpuMs,
 * ms (wall) }.
 */
export function cpuAB({ make, reps = 4, rounds = 30, batches = 3 }) {
  // (make(): fresh runners { a: [...], b: [...] } (n of each, n even), built the same each time: every rep repeats the
  // same work on the same traffic; the CPU time and the units are summed over the reps (4 reps: ~2 % tick error))
  let us = null, units = null, kind = null, n = 0;
  const t0 = performance.now();
  for (let rep = 0; rep < reps; rep++) {
    const { a, b } = make(), R = [], kd = [];
    n = Math.min(a.length, b.length);
    for (let p = 0; p + 1 < n; p += 2) { R.push(a[p], b[p], b[p + 1], a[p + 1]); kd.push(0, 1, 1, 0); }
    if (!us) { us = new Float64Array(R.length); units = new Float64Array(R.length); kind = kd; }
    for (let r = 0; r < rounds; r++) for (let q = 0; q < R.length; q++) {
      const k = (q + r) % R.length, c0 = process.cpuUsage();
      for (let m = 0; m < batches; m++) units[k] += R[k]();
      const c = process.cpuUsage(c0); us[k] += c.user + c.system;
    }
  }
  const cost = Array.from(us, (u, k) => u / Math.max(1, units[k]));
  let sa = 0, sb = 0, na = 0, nb = 0; cost.forEach((c, k) => { if (kind[k]) { sb += c; nb++; } else { sa += c; na++; } });
  return { ratio: sa / sb, twin: cost[1] / cost[2], a: sa / na, b: sb / nb, cpuMs: us.reduce((x, y) => x + y, 0) / 1000, reps, rounds, runners: us.length, ms: performance.now() - t0 };
}
