// ALLOCATION BUDGET GATE (gate row `allocbudget`, rule alloc-rate; claude/allocrate2).
//   node tools/perf/allocBudget.mjs [--quiet] [--seconds 25] [--measure] [--query "&villadeck=old"]     exit 1 over budget (or no run)
// WHY: the villa merge (claude/villa1) put the villa's drive deck into world.decks with no box test and a destructured
// ring walk: 2.9 MB of garbage a frame of the falcon flight (66 % of all sampled JS, ~6.5 GB a minute), and no gate saw
// it: the allocation was only measured by hand (tools/perf/allocSample.mjs). The owner's #1 complaint is lag.
// RULE: every merge that touches viewer/ (or models/, the debug drivers, the sampler) runs a short falcon flight and a
// short police drive under the allocation sampler and keeps the sampled JS KB a frame under the budget in
// tools/perf/allocBudget.json (the measured value + 25 %). KB a frame holds up under load (unlike frame times), so the
// row is valid on a busy machine. A real increase is re-measured (--measure) and the budget raised in the same merge,
// with the reason in docs/rules/alloc-rate.md.
// How: takes C:/Users/tibog/Downloads/uccle-jobs/browser.lock (one city page across all agents; tools/gate/lock.mjs:
// waits --lock-wait s, then exit 76 = lock busy), serves THIS checkout (tools/tour/serve.mjs: its own fresh tile-worker build) on a free port, runs
// allocSample.mjs (its own Chrome, temp profile, --mute-audio, uccle-sound=off) for --mode falcon then --mode police,
// kills every child process tree and releases the lock in finally.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquire, LOCK_BUSY_EXIT } from "../gate/lock.mjs";
import { sweepProfiles } from "../gate/chromeProfile.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const QUIET = argv.includes("--quiet"), MEASURE = argv.includes("--measure"), SECONDS = +opt("seconds", 25), QUERY = opt("query", "");   // (--query "&villadeck=old": the row must fail)
if (opt("lock", null)) process.env.UCCLE_BROWSER_LOCK = opt("lock", null);
const LOCK_WAIT_S = +opt("lock-wait", process.env.UCCLE_LOCK_WAIT_S || 300);
const ME = `allocbudget(${path.basename(ROOT)})`;
const BUDGET_FILE = path.join(ROOT, "tools/perf/allocBudget.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => { if (!QUIET) console.log(...a); };
const kids = new Set();
const killTree = (p) => { if (!p || p.exitCode != null) return; if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" }); else try { p.kill("SIGKILL"); } catch { /* gone */ } };
// rule browser-lock-helper (claude/tooling2): browser.lock through tools/gate/lock.mjs: never taken while its holder
// lives and beats (the old 20-min rule here overwrote a lock xmasperf4 still used); busy past --lock-wait (300 s)
// -> exit 76: mergeGate runs the row again later, a busy lock is not a FAIL. The children (allocSample) get our owner
// name, so their own acquire is nested. Rule chrome-profiles-removed: a sampler killed by a timeout skips its exit
// handler, so the profiles are swept here at the start and in finally.
let lock = null;
const cleanup = () => { for (const k of kids) killTree(k); kids.clear(); lock?.release(); lock = null; sweepProfiles({ log }); };
process.on("exit", cleanup);
for (const s of ["SIGINT", "SIGTERM", "SIGBREAK"]) process.on(s, () => { cleanup(); process.exit(130); });
process.env.UCCLE_LOCK_OWNER = ME;
const freePort = () => new Promise((r, j) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); s.on("error", j); });
function run(cmd, args, { timeoutS = 900 } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    kids.add(p);
    let out = "";
    p.stdout.on("data", (d) => { out += d; }); p.stderr.on("data", (d) => { out += d; });
    const t = setTimeout(() => { out += `\n(timeout after ${timeoutS} s)`; killTree(p); }, timeoutS * 1000);
    p.on("exit", (code) => { clearTimeout(t); kids.delete(p); resolve({ code, out }); });
  });
}

const budget = fs.existsSync(BUDGET_FILE) ? JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8")) : null;
let fails = 0, busy = null;
try {
  sweepProfiles({ log });
  lock = await acquire("browser", { owner: ME, waitS: LOCK_WAIT_S, onWait: log });
  const port = await freePort();
  const server = spawn(process.execPath, [path.join(ROOT, "tools/tour/serve.mjs"), "--root", ROOT, "--port", String(port), "--any-port", "--out", path.join(ROOT, ".tour")]   /* (own temp Chrome profile: rule local-origins-capped does not apply) */, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  kids.add(server);
  await new Promise((r, j) => { let s = ""; const to = setTimeout(() => j(new Error("serve.mjs did not start in 120 s")), 120000); server.stdout.on("data", (d) => { s += d; if (/serving /.test(s)) { clearTimeout(to); r(); } }); server.on("exit", (c) => j(new Error(`serve.mjs exited ${c}`))); });
  const got = {};
  for (const mode of ["falcon", "police"]) {
    const out = path.join(ROOT, ".tour", `allocbudget-${mode}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    try { fs.rmSync(out, { force: true }); } catch { /* none */ }
    // (a CDP port of its own per run, and one retry: a Chrome just killed can still hold its port, "no page target")
    let r = null;
    for (let attempt = 0; attempt < 2 && !(r && r.code === 0 && fs.existsSync(out)); attempt++) {
      if (attempt) { log(`${mode}: retry (${r.out.trim().split(/\n/).pop()})`); await sleep(5000); }
      r = await run(process.execPath, [path.join(ROOT, "tools/perf/allocSample.mjs"), "--base", `http://localhost:${port}`, "--mode", mode, "--seconds", String(SECONDS), ...(QUERY ? ["--query", QUERY] : []), "--top", "8", "--port", String(9400 + (port % 400) + (mode === "police" ? 1 : 0) + attempt * 2), "--out", out]);
    }
    if (r.code === LOCK_BUSY_EXIT) { busy = r.out.trim().split("\n").pop(); break; }
    if (r.code !== 0 || !fs.existsSync(out)) { fails++; console.log(`FAIL allocbudget ${mode}: the sampler did not finish (exit ${r.code}): ${r.out.trim().split("\n").slice(-3).join(" | ")}`); continue; }
    const j = JSON.parse(fs.readFileSync(out, "utf8"));
    got[mode] = { KBperFrame: j.KBperFrame, frames: j.frames, top: j.ours.slice(0, 5).map((o) => `${o.KBperFrame} ${o.fn}`) };
    if (MEASURE) { console.log(`${mode}: ${j.KBperFrame} KB a frame (${j.frames} frames)`); continue; }
    const lim = budget?.[mode]?.budgetKB;
    if (!lim) { fails++; console.log(`FAIL allocbudget ${mode}: no budget in tools/perf/allocBudget.json`); continue; }
    const okk = j.KBperFrame <= lim;
    if (!okk) fails++;
    if (!okk || !QUIET) console.log(`${okk ? "ok  " : "FAIL"} allocbudget ${mode}: ${j.KBperFrame} KB of sampled JS a frame over ${j.frames} frames (budget ${lim}${okk ? "" : `; the top of ours: ${got[mode].top.join(" ; ")}. A real increase: re-measure with --measure and raise the budget with its reason (docs/rules/alloc-rate.md)`})`);
  }
  if (MEASURE) console.log(JSON.stringify(got));
} catch (e) { if (e.code === LOCK_BUSY_EXIT) busy = e.message; else { fails++; console.log(`FAIL allocbudget: ${e.message}`); } }
finally { cleanup(); }
if (busy && !fails) { console.log(`allocbudget: LOCK BUSY (not run, not a failure): ${busy}`); process.exit(LOCK_BUSY_EXIT); }
console.log(fails ? `allocbudget: ${fails} FAIL` : "allocbudget: within budget");
process.exit(fails ? 1 : 0);
