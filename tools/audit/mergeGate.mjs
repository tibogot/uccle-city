// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. One file per row: tools/audit/gate.d/<name>.mjs (export default { name, script, node?, args,
// guards, deps?, timing?, alone?, heavy?, timeout? (s, default 600), meta? }); browser-side gates (need the viewer running) are
// tools/audit/gate.d/browser/<name>.mjs ({ name, text }): the merger runs them on a browser turn. docs/WORKFLOW.md.
//   node tools/audit/mergeGate.mjs [name ...]     every row (or only those), the memo on
//     --full              ignore the memo: run every picked row
//     --changed [--base REF]   only the rows whose deps changed vs REF (default: the merge base with claude/foundation),
//                         + meta (tools/merge.mjs auto)
//     --serial            one row at a time (default: the timing rows alone first, then the rest in parallel)
//   (rule timing-rows-alone: a row that exits 75, every failure a timing verdict (tools/gate/timing.mjs gateExit), is
//   run again ALONE up to 3 more times (tools/gate/retry.mjs): the timing rows at once, a parallel row after the
//   parallel phase; it fails only when every run failed. A structural failure (exit 1) is never retried)
//     --jobs N            the parallel CPU budget (default: the logical cores); --mem MB the memory budget (60 % of RAM)
//     --list              the row names, one a line
//     --no-tile-cache     the rows build every tile fresh (TILE_CACHE=0; tools/gate/tileCache.mjs, rule tile-cache)
//     --no-lock           do not take gate.lock (tools/merge.mjs, which holds it for the whole merge, passes it)
//     --lock-check        take gate.lock, say so, release it, exit (the `locks` row's self-test)
//   (rule gate-lock-held: the gate takes C:/Users/tibog/Downloads/uccle-jobs/gate.lock for its whole run through
//   tools/gate/lock.mjs (owner, pid, start, a heartbeat a minute); a lock held by a live, beating holder is waited for
//   (a line a minute; GATE_LOCK_WAIT_S caps it: exit 76); released on exit, a crash and Ctrl-C; a dead holder's is
//   taken over. Rule browser-lock-helper: a row that exits 76 (its lock busy) is run again alone after the others, up
//   to BUSY_RETRIES times BUSY_PAUSE_S apart; still busy = BUSY in the table, the gate exits 76, never a FAIL)
// Every row runs traced (tools/gate/trace.mjs): its deps land in .cache/gate/deps/<row>.json, a PASS's memo key in
// .cache/gate/pass/<row>.json, its full output in .cache/gate/logs/<row>.txt (docs/SPEED_PLAN.md jobs 4-7).
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";
import { existsSync, symlinkSync, realpathSync, lstatSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { loadRows, loadBrowser } from "../gate/rowFiles.mjs";
import { rawDir, collectTrace, readTrace, CACHE } from "../gate/deps.mjs";
import { rowKey, writePass, saveHashes } from "../gate/memo.mjs";
import { selectRows, gitChanges } from "../gate/select.mjs";
import { withRetries, timingOnly, RETRIES, PAUSE_MS } from "../gate/retry.mjs";
import { acquire, LOCK_BUSY_EXIT } from "../gate/lock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = await loadRows(ROOT);
const BROWSER = (await loadBrowser(ROOT)).map((b) => b.text);
const argv = process.argv.slice(2);
if (argv.includes("--list")) { for (const c of CHECKS) console.log(c.name); process.exit(0); }
const VALUED = new Set(["--base", "--jobs", "--mem"]);
const BUSY_RETRIES = +(process.env.GATE_BUSY_RETRIES ?? 3), BUSY_PAUSE_S = +(process.env.GATE_BUSY_PAUSE_S ?? 120);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const NO_TILE_CACHE = argv.includes("--no-tile-cache");
const FULL = argv.includes("--full"), CHANGED = argv.includes("--changed"), SERIAL = argv.includes("--serial");
const CPU = Math.max(1, +opt("--jobs", 0) || os.cpus().length);
const MEM = +opt("--mem", 0) || Math.round((os.totalmem() / 2 ** 20) * 0.6);

// ------------------------------------------------------------------ gate.lock (rule gate-lock-held)
// (before the worktree links and the row pick: nothing of the run starts until the lock is ours)
const GATE_OWNER = (process.env.UCCLE_LOCK_OWNER || `mergeGate(${path.basename(ROOT)})`).replace(/\s+/g, "_");
let gateLock = null;
if (!argv.includes("--no-lock")) {
  try {
    gateLock = await acquire("gate", { owner: GATE_OWNER, waitS: process.env.GATE_LOCK_WAIT_S ? +process.env.GATE_LOCK_WAIT_S : Infinity, pollS: 15, onWait: (m) => console.log(`[gate.lock] ${m}`) });
    console.log(`[gate.lock] ${gateLock.nested ? "held by our caller (nested)" : `taken by ${GATE_OWNER} (pid ${process.pid})`}: ${gateLock.file}`);
  } catch (e) {
    if (e.code !== LOCK_BUSY_EXIT) throw e;
    console.log(`[gate.lock] ${e.message}: the gate did not run (exit ${LOCK_BUSY_EXIT}, lock busy)`); process.exit(LOCK_BUSY_EXIT);
  }
}
if (argv.includes("--lock-check")) { console.log("lock-check: gate.lock held, releasing"); gateLock?.release(); process.exit(0); }

// A git worktree lacks the main checkout's untracked inputs (node_modules, the raw data): link them in (junctions),
// so a gate in a worktree tests the code, not the folder. All are git-ignored.
const LOCAL_ONLY = ["tools/worker/node_modules", "tools/road_audit/node_modules", "data/raw"];
try {
  const main = path.dirname(spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim());
  if (main && path.resolve(main) !== path.resolve(ROOT)) {
    for (const p of LOCAL_ONLY) {
      const here = path.join(ROOT, p), there = path.join(main, p);
      if (!existsSync(here) && existsSync(there)) { symlinkSync(there, here, "junction"); console.log(`linked ${p} -> ${there}`); }
    }
  }
} catch (e) { console.log(`(worktree links skipped: ${e.message})`); }
// the junctions' targets, so the tracer records their files by their repo path
const LINKS = [];
for (const p of LOCAL_ONLY) {
  const here = path.join(ROOT, p);
  try { const real = realpathSync(here); if (path.resolve(real).toLowerCase() !== path.resolve(here).toLowerCase()) LINKS.push([real, p]); } catch {}
}

const only = argv.filter((a, i) => !a.startsWith("--") && !VALUED.has(argv[i - 1]));
const unknown = only.filter((n) => !CHECKS.some((c) => c.name === n));
if (unknown.length) { console.log(`unknown gate row(s): ${unknown.join(", ")} (node tools/audit/mergeGate.mjs --list)`); process.exit(2); }

// ------------------------------------------------------------------ which rows
const T0 = Date.now();
let changes = null;
if (CHANGED) {
  const g = gitChanges(opt("--base"));
  changes = g.changes;
  console.log(`--changed: ${changes.length} file(s) changed vs ${g.ref.slice(0, 12)}${changes.length ? ": " + changes.slice(0, 8).map((c) => c.path).join(", ") + (changes.length > 8 ? " ..." : "") : ""}`);
}
const { run: RUN, skip: SKIP } = selectRows(CHECKS, { only, changes, full: FULL });
if (SKIP.length) {
  console.log(`skipped ${SKIP.length} row(s):`);
  for (const s of SKIP) console.log(`  ${s.row.name.padEnd(16)} ${s.why}`);
}
console.log(`running ${RUN.length} row(s)${FULL ? " (--full: memo off)" : ""}:`);
for (const r of RUN) console.log(`  ${r.name.padEnd(16)} ${[r.because && `touched by ${r.because}`, r.memoWhy].filter(Boolean).join("; ")}`);

// ------------------------------------------------------------------ running one row (traced)
const LOGS = path.join(CACHE, "logs");
mkdirSync(LOGS, { recursive: true });
const TRACE = pathToFileURL(path.join(ROOT, "tools/gate/trace.mjs")).href;
const results = new Map();

function treeKill(p) {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
  else try { process.kill(-p.pid, "SIGKILL"); } catch { p.kill("SIGKILL"); }
}

function runOnce(c, { timeoutScale = 1 } = {}) {
  return new Promise((done) => {
    const raw = rawDir(c.name), t0 = Date.now(), limit = c.timeout * timeoutScale;
    const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${TRACE}`.trim(), GATE_TRACE_OUT: raw, GATE_TRACE_ROOT: ROOT, GATE_TRACE_LINKS: JSON.stringify(LINKS), GATE_ROW: c.name, ...(NO_TILE_CACHE ? { TILE_CACHE: "0" } : {}) };
    const p = spawn(process.execPath, [...c.node, path.join(ROOT, c.script), ...c.args], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32", windowsHide: true });
    let out = "", timedOut = false;
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { out += b; });
    const timer = setTimeout(() => { timedOut = true; treeKill(p); }, limit * 1000);
    p.on("close", (code) => {
      clearTimeout(timer);
      done({ code, timedOut, out, t0, raw, limit, secs: (Date.now() - t0) / 1000 });
    });
  });
}

// one row: run, and while it is a timing-only failure (exit 75) and `retry`, again (alone: the caller's job), then
// the bookkeeping. retry false: a timing-only failure is handed back ({ again: true }) for the alone phase
const busyRows = [];
async function runRow(c, { timeoutScale = 1, retry = true, prior = 0 } = {}) {
  const first = await runOnce(c, { timeoutScale });
  // (rule browser-lock-helper) its lock was busy: not a verdict, run again after the others
  if (!first.timedOut && first.code === LOCK_BUSY_EXIT) {
    console.log(`     ${c.name.padEnd(16)} lock busy (exit ${LOCK_BUSY_EXIT}, ${first.secs.toFixed(1)} s): run again after the other rows`);
    busyRows.push({ c, first }); return { again: false, busy: true };
  }
  if (!retry && timingOnly(first)) {
    console.log(`     ${c.name.padEnd(16)} timing-only failure (exit 75, ${first.secs.toFixed(1)} s): re-run alone after the parallel rows`);
    return { again: true };
  }
  const r = !timingOnly(first) ? { ...first, attempts: 1, codes: [first.code] } : await withRetries((a) => (a === 0 ? first : runOnce(c)), {
    retries: RETRIES - prior, pauseMs: PAUSE_MS,
    onRetry: (a, x) => { console.log(`     ${c.name.padEnd(16)} timing-only failure (exit 75, ${x.secs.toFixed(1)} s): retry ${a + prior}/${RETRIES} alone in ${PAUSE_MS / 1000} s`); },
  });
  finish(c, r, prior);
  return { again: false };
}

function finish(c, { code, timedOut, out, t0, raw, limit, secs, attempts }, prior) {
  const ok = code === 0 && !timedOut, tries = attempts + prior;
  writeFileSync(path.join(LOGS, `${c.name}.txt`), out);
  const trace = collectTrace(c, raw, { links: LINKS, secs, ok });
  // the memo: a PASS whose deps did not change while it ran (a file edited mid-run is not what it tested)
  let memo = "";
  if (ok) {
    const moved = trace.files.filter((f) => { try { return statSync(path.join(ROOT, f)).mtimeMs > t0; } catch { return false; } });
    if (moved.length) memo = `not memoised: ${moved.slice(0, 3).join(", ")} changed while it ran`;
    else writePass(c.name, rowKey(c, trace), { secs: +secs.toFixed(1), files: trace.files.length });
  }
  const lines = out.trim().split("\n");
  const fails = lines.filter((l) => /FAIL/.test(l)).slice(0, 3).map((l) => l.trim().slice(0, 120));
  const why = timedOut ? `timeout after ${limit} s` : `exit ${code}${code === 75 ? ` (timing only, every one of ${tries} runs over budget)` : ""}`;
  const runs = tries > 1 ? ` (${tries} runs: the earlier ${tries - 1} timing-only failures)` : "";
  results.set(c.name, { ok, secs, text: ok ? c.guards + (tries > 1 ? ` [passed on run ${tries}]` : "") : [fails.join(" / "), why].filter(Boolean).join(" / "), memo, trace });
  console.log(`[${String(results.size).padStart(2)}/${RUN.length}] ${c.name.padEnd(16)} ${ok ? "PASS" : "FAIL"} ${secs.toFixed(1).padStart(6)} s  (${((Date.now() - T0) / 1000) | 0} s in)${runs}${ok ? "" : `  log: .cache/gate/logs/${c.name}.txt`}${memo ? "  " + memo : ""}`);
}

// ------------------------------------------------------------------ the scheduler
// cost estimates from the row's last trace (else from its args): memory = its processes' peak, CPU = its peak node
// threads (or --jobs / --threads), heavy = declared, or >= 2 GB, or a tile build over many tiles
function cost(c) {
  const t = readTrace(c.name);
  const argN = (k) => { const i = c.args.indexOf(k); return i >= 0 ? +c.args[i + 1] || 0 : 0; };
  const jobsArg = argN("--jobs") || argN("--threads");
  const guessHeavy = c.args.includes("--all") || jobsArg > 1;
  const mem = t?.peakMB || (guessHeavy ? 3000 : 500);   // (measured 2026-11-20: tile rows 1.6-3.0 GB, the rest < 0.8 GB)
  const threads = t ? Math.max(1, (t.peakThreads || 1) - (t.procs > 1 ? 1 : 0)) : 0;
  const cpu = Math.min(CPU, Math.max(1, jobsArg || threads || (guessHeavy ? 4 : 1)));
  const heavy = c.heavy ?? (mem >= 2000 || guessHeavy);
  return { mem: Math.min(mem, MEM), cpu, heavy, secs: t?.secs || (guessHeavy ? 300 : 20) };
}

// (alone: a row that runs in the alone group without a wall-time assert, e.g. allocbudget: it drives a city page; claude/allocrate2)
const timing = RUN.filter((c) => c.timing || c.alone), rest = RUN.filter((c) => !c.timing && !c.alone);
if (timing.length) console.log(`\n== timing group (alone, one at a time): ${timing.map((c) => c.name).join(" ")}`);
for (const c of timing) await runRow(c);
if (SERIAL) {
  if (rest.length) console.log(`\n== the other rows, one at a time (--serial)`);
  for (const c of rest) await runRow(c);
} else if (rest.length) {
  const again = [];
  const HEAVY_MAX = 3;
  const C = new Map(rest.map((c) => [c.name, cost(c)]));
  console.log(`\n== the other ${rest.length} rows in parallel (CPU ${CPU}, memory ${MEM} MB, heavy <= ${HEAVY_MAX}; heavy: ${rest.filter((c) => C.get(c.name).heavy).map((c) => c.name).join(" ") || "-"})`);
  // longest first (the makespan); the timeouts doubled (the rows share the machine)
  const queue = rest.slice().sort((a, b) => C.get(b.name).secs - C.get(a.name).secs);
  let mem = 0, cpu = 0, heavy = 0;
  const live = new Set(), started = [];
  // the machine's own free memory too (other jobs share it): a row starts only while what is free, less what the rows
  // started in the last 30 s have not taken yet, keeps 1 GB spare; a timer re-pumps while rows wait on memory
  const FREE_SPARE = 1024, RAMP_MS = 30000;
  let timer = null;
  await new Promise((allDone) => {
    const pump = () => {
      const now = Date.now();
      while (started.length && now - started[0].t > RAMP_MS) started.shift();
      let free = os.freemem() / 2 ** 20 - started.reduce((s, x) => s + x.mem, 0);
      for (let i = 0; i < queue.length; i++) {
        const c = queue[i], k = C.get(c.name);
        const fits = !live.size || (mem + k.mem <= MEM && free - k.mem >= FREE_SPARE && cpu + k.cpu <= CPU && (!k.heavy || heavy < HEAVY_MAX));
        if (!fits) continue;
        queue.splice(i--, 1);
        mem += k.mem; cpu += k.cpu; heavy += k.heavy ? 1 : 0; free -= k.mem;
        started.push({ t: now, mem: k.mem });
        const pr = runRow(c, { timeoutScale: 2, retry: false }).then((x) => { if (x.again) again.push(c); mem -= k.mem; cpu -= k.cpu; heavy -= k.heavy ? 1 : 0; live.delete(pr); pump(); });
        live.add(pr);
      }
      clearTimeout(timer);
      if (queue.length) timer = setTimeout(pump, 5000);
      if (!live.size && !queue.length) allDone();
    };
    pump();
  });
  // (rule timing-rows-alone) the parallel rows whose only failures were timing verdicts: again, alone, one at a time
  if (again.length) console.log(`\n== timing-only failures under the parallel load, again alone: ${again.map((c) => c.name).join(" ")}`);
  for (const c of again) await runRow(c, { prior: 1 });
}
// (rule browser-lock-helper) the rows whose lock was busy: again, alone, BUSY_PAUSE_S apart; still busy = BUSY, not FAIL
const BUSY = new Map();
for (let a = 1; busyRows.length && a <= BUSY_RETRIES; a++) {
  console.log(`\n== lock-busy rows, try ${a}/${BUSY_RETRIES} in ${BUSY_PAUSE_S} s: ${busyRows.map((b) => b.c.name).join(" ")}`);
  await new Promise((r) => setTimeout(r, BUSY_PAUSE_S * 1000));
  for (const b of busyRows.splice(0)) await runRow(b.c);
}
for (const b of busyRows) {
  BUSY.set(b.c.name, (b.first.out.trim().split("\n").filter((l) => /busy/i.test(l)).pop() || "lock busy").trim().slice(0, 160));
  writeFileSync(path.join(LOGS, `${b.c.name}.txt`), b.first.out);
}
saveHashes();

// ------------------------------------------------------------------ the table (the rows' own order)
// a row that writes a file another row reads: a race when they run together (listed: fix the writer)
if (!SERIAL) {
  for (const [a, ra] of results) for (const [b, rb] of results) if (a !== b) {
    const both = (ra.trace.writes || []).filter((w) => rb.trace.files.includes(w));
    if (both.length) console.log(`WARNING: ${a} writes ${both.slice(0, 3).join(", ")}, which ${b} reads (parallel rows: a race)`);
  }
}
let failed = 0;
console.log("\n| check | result | time | guards / failures |\n|---|---|---|---|");
for (const c of CHECKS) {
  const r = results.get(c.name), s = SKIP.find((x) => x.row === c);
  if (BUSY.has(c.name)) console.log(`| ${c.name} | BUSY | - | not run: ${BUSY.get(c.name)} (rule browser-lock-helper: run it again, node tools/audit/mergeGate.mjs ${c.name}) |`);
  else if (r) { if (!r.ok) failed++; console.log(`| ${c.name} | ${r.ok ? "PASS" : "FAIL"} | ${r.secs.toFixed(1)} s | ${r.text} |`); }
  else if (s) console.log(`| ${c.name} | SKIP | - | ${s.why} |`);
}
console.log(`\nbrowser gates (run on a browser turn):\n  ${BROWSER.join("\n  ")}`);
{ // the tile cache this run (tools/gate/tileCache.mjs: .cache/tiles/log.jsonl)
  const { runSummary } = await import("../gate/tileCache.mjs");
  const t = runSummary(T0);
  if (t) console.log(`\ntile cache${NO_TILE_CACHE ? " (--no-tile-cache: off)" : ""}: ${t}`);
}
console.log(`\n${RUN.length} run, ${SKIP.length} skipped,${((Date.now() - T0) / 1000).toFixed(0)} s wall`);
console.log(failed ? `${failed} gate check(s) FAILED` : BUSY.size ? `no failure, but ${BUSY.size} row(s) NOT RUN, their lock busy: ${[...BUSY.keys()].join(" ")} (exit ${LOCK_BUSY_EXIT}: run them again, node tools/audit/mergeGate.mjs ${[...BUSY.keys()].join(" ")})` : "all gate checks pass");
process.exitCode = failed ? 1 : BUSY.size ? LOCK_BUSY_EXIT : 0;
gateLock?.release();
