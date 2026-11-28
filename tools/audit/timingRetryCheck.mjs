// TIMING RETRY SELF-TEST (claude/gateflakes, rule timing-rows-alone, gate row `timingretry`): the gate's retry of a
// timing-only failure (tools/gate/retry.mjs, used by tools/audit/mergeGate.mjs) absorbs a noisy read but never a real
// regression.
//   R1 the policy      withRetries on scripted results: 75 75 75 75 -> FAIL after 4 runs (3 retries); 75 0 -> PASS on
//                      run 2; 1 -> FAIL at once (a structural failure is never retried); 75 1 -> FAIL on run 2; a
//                      timeout -> FAIL at once
//   R2 a fixture row   tools/audit/timingRetryFixture.mjs as a child (the gate's way): quiet -> PASS; GATE_SLOW=fixture
//                      (its timed path 4 x dearer) -> exit 75 on every one of 4 runs -> FAIL; --structural -> exit 1, 1 run
//   R3 a real row      tools/propsTest.mjs with GATE_SLOW=props GATE_SLOW_X=8 (the 24-body solver block 8 x dearer): exit 75 (a
//                      timing-only failure, so the gate retries it) with its "cost" check FAILED: the same slowed path on
//                      every retry fails it (R2). --no-real: skip R3
//   node tools/audit/timingRetryCheck.mjs [--quiet] [--no-real]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRetries, RETRIES, TIMING_EXIT } from "../gate/retry.mjs";
import { gateExit } from "../gate/timing.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2), QUIET = argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };

// ---- R1 the policy
const scripted = async (seq) => { let i = 0; return withRetries(() => { const s = seq[Math.min(i++, seq.length - 1)]; return s === "t" ? { code: null, timedOut: true } : { code: s, timedOut: false }; }, { pauseMs: 0 }); };
{
  const a = await scripted([75, 75, 75, 75, 75, 75]);
  ok(!a.ok && a.attempts === RETRIES + 1 && a.code === TIMING_EXIT, `R1 always over budget: FAIL after ${a.attempts} runs (${a.codes.join(" ")}; want ${RETRIES + 1})`);
  const b = await scripted([75, 0]);
  ok(b.ok && b.attempts === 2, `R1 one noisy read then a pass: PASS on run ${b.attempts}`);
  const c = await scripted([1, 0]);
  ok(!c.ok && c.attempts === 1, `R1 a structural failure: FAIL at once (${c.attempts} run)`);
  const d = await scripted([75, 1, 0]);
  ok(!d.ok && d.attempts === 2 && d.code === 1, `R1 a timing then a structural failure: FAIL on run ${d.attempts} (exit ${d.code})`);
  const e = await scripted(["t", 0]);
  ok(!e.ok && e.attempts === 1, `R1 a timeout: FAIL at once (${e.attempts} run)`);
}

// ---- R2 a fixture timing row, as the gate runs it (a child process, exit codes)
const run = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, env: { ...process.env, GATE_SLOW: "", ...env }, encoding: "utf8", windowsHide: true, timeout: 600000 });
  return { code: r.status, timedOut: r.error?.code === "ETIMEDOUT", out: (r.stdout || "") + (r.stderr || "") };
};
const FX = "tools/audit/timingRetryFixture.mjs";
{
  const q = await withRetries(() => run(FX), { pauseMs: 0 });
  ok(q.ok, `R2 the fixture quiet: PASS (${q.attempts} run${q.attempts > 1 ? "s" : ""}: ${q.codes.join(" ")})`);
  const s = await withRetries(() => run(FX, [], { GATE_SLOW: "fixture" }), { pauseMs: 0 });
  ok(!s.ok && s.attempts === RETRIES + 1 && s.codes.every((x) => x === TIMING_EXIT), `R2 the fixture's path 4 x dearer (GATE_SLOW=fixture): FAIL after ${s.attempts} runs, exits ${s.codes.join(" ")} (want ${RETRIES + 1} x ${TIMING_EXIT})`);
  const t = await withRetries(() => run(FX, ["--structural"]), { pauseMs: 0 });
  ok(!t.ok && t.attempts === 1 && t.code === 1, `R2 the fixture's structural failure: exit ${t.code} after ${t.attempts} run (never retried)`);
}

// ---- R3 a real timing row, its path slowed
if (!argv.includes("--no-real")) {
  const p = run("tools/propsTest.mjs", ["--quiet"], { GATE_SLOW: "props", GATE_SLOW_X: "8" });
  const costFail = /FAIL cost:/.test(p.out), others = p.out.split("\n").filter((l) => /^\s*FAIL /.test(l) && !/FAIL cost:/.test(l));
  ok(p.code === TIMING_EXIT && costFail && !others.length, `R3 propsTest with its 24-body solver block 8 x dearer (GATE_SLOW=props GATE_SLOW_X=8; its budget sits ~3-4 x over the quiet cost): exit ${p.code} (want ${TIMING_EXIT}: timing only, retried, and the same path fails every retry), cost ${costFail ? "FAILED" : "passed"}${others.length ? `; other failures: ${others.slice(0, 2).join(" / ")}` : ""}${costFail ? ": " + (p.out.match(/FAIL cost:[^\n]*/)?.[0] || "").slice(0, 160) : ""}`);
}

console.log(fails ? `timingRetryCheck: ${fails} FAILED` : `timingRetryCheck: PASS (R1 policy, R2 fixture${argv.includes("--no-real") ? "" : ", R3 propsTest slowed"})`);
process.exit(gateExit(fails));
