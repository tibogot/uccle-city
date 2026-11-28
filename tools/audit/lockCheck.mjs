// Gate row `locks` (rules gate-lock-held + browser-lock-helper, claude/tooling2): the shared lock helper
// (tools/gate/lock.mjs) and every tool that takes gate.lock / browser.lock through it. All behaviour runs on lock files
// in a scratch folder (UCCLE_LOCK_DIR): the live C:/Users/tibog/Downloads/uccle-jobs/*.lock are never touched.
//   L  the helper: a free lock is taken with owner / pid / start / heartbeat; a live, beating holder is NEVER taken
//      (busy -> LockBusy code 76, the file unchanged); stale = the pid dead, or no heartbeat for > the stale time; a
//      legacy lock (no pid) 38 min old is NOT stale (the 2026-11-28 take-over), 130 min old is; released on a normal
//      exit, an uncaught throw and process.exit; a hard kill leaves it and the next acquire takes it over; the same
//      owner nests; 4 waiters racing for one stale lock: exactly one wins; the holder's heartbeat moves
//   G  mergeGate takes gate.lock for its run: waits for a live holder (GATE_LOCK_WAIT_S -> exit 76, lock unchanged),
//      takes and releases a free one, --no-lock skips it, run by a parent that holds it = nested (merge.mjs ->
//      mergeGate: no self-deadlock); merge.mjs takes it for the whole merge, runs mergeGate async with --no-lock
//   B  browser rows: allocBudget with browser.lock busy exits 76 (not 1) in seconds and leaves the lock as it was;
//      mergeGate re-runs a 76 row later and reports BUSY, not FAIL; no tool writes browser.lock / gate.lock by itself
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLock, judge, LOCK_BUSY_EXIT } from "../gate/lock.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOCKMOD = path.join(HERE, "tools/gate/lock.mjs").replace(/\\/g, "/");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lockcheck-"));
const lockFile = (n) => path.join(tmp, `${n}.lock`);
const ENV = { ...process.env, UCCLE_LOCK_DIR: tmp, UCCLE_PROFILE_TMP: tmp };
for (const k of ["UCCLE_GATE_LOCK", "UCCLE_BROWSER_LOCK", "UCCLE_LOCK_OWNER", "GATE_LOCK_WAIT_S", "NODE_OPTIONS", "GATE_TRACE_OUT"]) delete ENV[k];
process.env.UCCLE_LOCK_DIR = tmp;
for (const k of ["UCCLE_GATE_LOCK", "UCCLE_BROWSER_LOCK", "UCCLE_LOCK_OWNER"]) delete process.env[k];
const { acquire } = await import("../gate/lock.mjs");

// a child node process running `code` (an ES module body; `L` = the lock module)
const child = (code, env = {}) => {
  const p = spawn(process.execPath, ["--input-type=module", "-e", `import * as L from "file:///${LOCKMOD}";\n${code}`], { env: { ...ENV, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.out = ""; p.stdout.on("data", (d) => { p.out += d; }); p.stderr.on("data", (d) => { p.out += d; });
  p.done = new Promise((r) => p.on("close", (code) => r(code)));
  return p;
};
const untilOut = async (p, re, ms = 15000) => { const t = Date.now(); while (!re.test(p.out) && Date.now() - t < ms) await sleep(50); return re.test(p.out); };
const hardKill = (pid) => spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
const age = (file, min) => { const t = new Date(Date.now() - min * 60e3); fs.utimesSync(file, t, t); };

try {
  // ---------------------------------------------------------------- L. the helper
  {
    const h = await acquire("browser", { owner: "lockcheck", onWait: () => {} });
    const i = readLock(lockFile("browser"));
    check("L1 a free lock is taken with owner / pid / start", i && i.owner === "lockcheck" && i.pid === process.pid && !!i.since && !h.nested, i ? i.raw.trim() : "no file");
    h.release();
    check("L1 release removes it", !fs.existsSync(lockFile("browser")), "the file is gone");
  }
  {
    const holder = child(`const h = await L.acquire("browser", { owner: "holder" }); console.log("HELD"); setTimeout(() => {}, 60000);`, { UCCLE_LOCK_BEAT_MS: "300" });
    await untilOut(holder, /HELD/);
    const before = fs.readFileSync(lockFile("browser"), "utf8");
    let err = null; const t0 = Date.now();
    try { await acquire("browser", { owner: "intruder", waitS: 1, pollS: 0.2, onWait: () => {} }); } catch (e) { err = e; }
    check("L2 a live, beating holder is never taken: busy -> code 76", err && err.code === LOCK_BUSY_EXIT && Date.now() - t0 < 5000, err ? err.message : "acquired a held lock!");
    await sleep(800);
    const after = readLock(lockFile("browser"));
    check("L2 the holder's heartbeat moves; the lock still names the holder", after.owner === "holder" && after.raw !== before && Date.now() - after.beat < 2000, after.raw.trim());
    hardKill(holder.pid); await holder.done;
    const dead = readLock(lockFile("browser"));
    check("L3 a hard-killed holder leaves its lock with a dead pid: stale", dead && judge(dead).stale && /dead/.test(judge(dead).why), dead ? judge(dead).why : "no file");
    const h = await acquire("browser", { owner: "taker", waitS: 2, onWait: () => {} });
    const log = fs.readFileSync(`${lockFile("browser")}.log`, "utf8");
    check("L3 the next acquire takes the dead holder's lock over (logged)", readLock(lockFile("browser")).owner === "taker" && /TAKE-OVER by taker[^\n]*holder/.test(log), "TAKE-OVER line in browser.lock.log");
    h.release();
  }
  {
    // a live pid whose heartbeat stopped (hung, or the pid reused)
    const sleeper = child(`console.log("UP"); setTimeout(() => {}, 60000);`);
    await untilOut(sleeper, /UP/);
    fs.writeFileSync(lockFile("gate"), `hung ${new Date(Date.now() - 11 * 60e3).toISOString()} pid=${sleeper.pid} since=x\n`); age(lockFile("gate"), 11);
    const j1 = judge(readLock(lockFile("gate")));
    fs.writeFileSync(lockFile("gate"), `beating ${new Date(Date.now() - 4 * 60e3).toISOString()} pid=${sleeper.pid} since=x\n`); age(lockFile("gate"), 4);
    const j2 = judge(readLock(lockFile("gate")));
    check("L4 stale = no heartbeat for > 10 min (pid alive); 4 min without one is not", j1.stale && !j2.stale, `${j1.why} / ${j2.why}`);
    hardKill(sleeper.pid); await sleeper.done;
    fs.writeFileSync(lockFile("gate"), `xmasperf4 ${new Date(Date.now() - 38 * 60e3).toISOString()}`); age(lockFile("gate"), 38);
    const j3 = judge(readLock(lockFile("gate")));
    fs.writeFileSync(lockFile("gate"), `xmasperf4 ${new Date(Date.now() - 130 * 60e3).toISOString()}`); age(lockFile("gate"), 130);
    const j4 = judge(readLock(lockFile("gate")));
    check("L5 a legacy lock (no pid) 38 min old is NOT stale (2026-11-28), 130 min old is", !j3.stale && j4.stale, `${j3.why} / ${j4.why}`);
    fs.unlinkSync(lockFile("gate"));
  }
  {
    const ends = { "a normal exit": `setTimeout(() => {}, 300);`, "an uncaught throw": `setTimeout(() => { throw new Error("boom"); }, 100);`, "process.exit(3)": `setTimeout(() => process.exit(3), 100);` };
    for (const [what, tail] of Object.entries(ends)) {
      const c = child(`const h = await L.acquire("browser", { owner: "ender" }); console.log("HELD"); ${tail}`);
      const held = await untilOut(c, /HELD/); await c.done;
      check(`L6 released on ${what}`, held && !fs.existsSync(lockFile("browser")), fs.existsSync(lockFile("browser")) ? `left: ${fs.readFileSync(lockFile("browser"), "utf8").trim()}` : "gone");
    }
  }
  {
    const outer = await acquire("browser", { owner: "same-owner", onWait: () => {} });
    const c = child(`const h = await L.acquire("browser", { owner: "same-owner", waitS: 2 }); console.log(h.nested ? "NESTED" : "OWN"); h.release();`);
    await c.done;
    check("L7 the same owner nests; its release leaves the outer lock", /NESTED/.test(c.out) && readLock(lockFile("browser"))?.pid === process.pid, c.out.trim());
    outer.release();
  }
  {
    // 4 waiters on one stale (dead-pid) lock at once: exactly one wins
    fs.writeFileSync(lockFile("gate"), `deadone ${new Date().toISOString()} pid=999999 since=x\n`);
    const cs = [0, 1, 2, 3].map((i) => child(`try { const h = await L.acquire("gate", { owner: "racer${i}", waitS: 0.5, pollS: 0.1, onWait: () => {} }); console.log("WON"); setTimeout(() => h.release(), 2500); } catch (e) { console.log("BUSY " + e.code); }`));
    await Promise.all(cs.map((c) => c.done));
    const won = cs.filter((c) => /WON/.test(c.out)).length, busy = cs.filter((c) => /BUSY 76/.test(c.out)).length;
    check("L8 four waiters race for one stale lock: exactly one wins, the rest are busy (76)", won === 1 && busy === 3, `won ${won}, busy ${busy}`);
  }

  // ---------------------------------------------------------------- G. mergeGate + merge.mjs
  const gate = (args, env = {}) => spawnSync(process.execPath, [path.join(HERE, "tools/audit/mergeGate.mjs"), ...args], { cwd: HERE, env: { ...ENV, ...env }, encoding: "utf8", timeout: 120000 });
  {
    const holder = child(`const h = await L.acquire("gate", { owner: "otheragent" }); console.log("HELD"); setTimeout(() => {}, 60000);`);
    await untilOut(holder, /HELD/);
    const before = fs.readFileSync(lockFile("gate"), "utf8");
    const r = gate(["--lock-check"], { GATE_LOCK_WAIT_S: "2" });
    check("G1 mergeGate waits for a live holder of gate.lock (a clear line), then exit 76; the lock untouched", r.status === LOCK_BUSY_EXIT && /gate\.lock busy: held by otheragent/.test(r.stdout) && fs.readFileSync(lockFile("gate"), "utf8").split(" pid=")[1] === before.split(" pid=")[1], `exit ${r.status}: ${(r.stdout.match(/\[gate\.lock\][^\n]*/g) || []).slice(-1)[0] || r.stderr.slice(0, 200)}`);
    const r2 = gate(["--lock-check", "--no-lock"]);
    check("G2 --no-lock does not wait (merge.mjs holds it)", r2.status === 0 && readLock(lockFile("gate"))?.owner === "otheragent", `exit ${r2.status}`);
    hardKill(holder.pid); await holder.done;
    const r3 = gate(["--lock-check"]);
    check("G3 a dead holder's gate.lock is taken over; the gate takes it with owner + pid and releases it on exit", r3.status === 0 && /took over a stale lock/.test(r3.stdout) && /taken by mergeGate\(/.test(r3.stdout) && !fs.existsSync(lockFile("gate")), `exit ${r3.status}: ${(r3.stdout.match(/\[gate\.lock\][^\n]*/g) || []).join(" | ").slice(0, 300)}`);
    // a parent that holds gate.lock (merge.mjs) runs mergeGate without --no-lock: nested, not a self-deadlock
    const GATE = path.join(HERE, "tools/audit/mergeGate.mjs").replace(/\\/g, "/");
    const par = child(`const h = await L.acquire("gate", { owner: "merge(x)" }); const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, ["${GATE}", "--lock-check"], { encoding: "utf8", env: { ...process.env, GATE_LOCK_WAIT_S: "3" } }); console.log("CHILD " + r.status + " " + /nested/.test(r.stdout)); h.release();`);
    await par.done;
    check("G4 mergeGate under a parent that holds gate.lock: nested, exit 0 (no self-deadlock)", /CHILD 0 true/.test(par.out), par.out.trim().slice(-200));
  }
  {
    const m = fs.readFileSync(path.join(HERE, "tools/merge.mjs"), "utf8"), g = fs.readFileSync(path.join(HERE, "tools/audit/mergeGate.mjs"), "utf8");
    const takeAt = m.search(/acquire\(\s*"gate"/), runAt = m.indexOf('"tools/audit/mergeGate.mjs"'), mergeAt = m.indexOf('gitTry("merge"');
    check("G5 merge.mjs takes gate.lock before the merge and the gate, runs mergeGate async with --no-lock", takeAt > 0 && takeAt < mergeAt && takeAt < runAt && /spawn\(process\.execPath, \["tools\/audit\/mergeGate\.mjs", \.\.\.gateArgs, "--no-lock"\]/.test(m) && !/spawnSync\(process\.execPath, \["tools\/audit\/mergeGate/.test(m), `acquire at ${takeAt}, merge at ${mergeAt}, gate at ${runAt}`);
    check("G6 mergeGate takes gate.lock (tools/gate/lock.mjs), honours --no-lock, re-runs a lock-busy (76) row and reports BUSY, not FAIL", /acquire\("gate"/.test(g) && /--no-lock/.test(g) && /LOCK_BUSY_EXIT/.test(g) && /\| BUSY \|/.test(g) && /busyRows/.test(g), "static");
  }

  // ---------------------------------------------------------------- B. browser rows
  {
    const holder = child(`const h = await L.acquire("browser", { owner: "xmasperf4-like" }); console.log("HELD"); setTimeout(() => {}, 60000);`);
    await untilOut(holder, /HELD/);
    const before = readLock(lockFile("browser"));
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(HERE, "tools/perf/allocBudget.mjs"), "--lock-wait", "2"], { cwd: HERE, env: ENV, encoding: "utf8", timeout: 60000 });
    const after = readLock(lockFile("browser"));
    check("B1 allocbudget with browser.lock busy: exit 76 (lock busy, not a FAIL) in seconds, the holder's lock untouched", r.status === LOCK_BUSY_EXIT && /LOCK BUSY/.test(r.stdout) && !/FAIL/.test(r.stdout) && after?.pid === before.pid && after.owner === before.owner && Date.now() - t0 < 30000, `exit ${r.status} in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${r.stdout.trim().split("\n").pop()}`);
    hardKill(holder.pid); await holder.done;
    try { fs.unlinkSync(lockFile("browser")); } catch { /* gone */ }
  }
  {
    // no tool writes a lock file by itself: every reader / writer of browser.lock or gate.lock in tools/ goes through the helper
    const bad = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|gate\.d/.test(e.name)) walk(p); } else if (/\.(mjs|js)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8"), rel = path.relative(HERE, p).replace(/\\/g, "/");
      if (["tools/gate/lock.mjs", "tools/gate/chromeProfile.mjs", "tools/audit/lockCheck.mjs", "tools/audit/profileCheck.mjs"].includes(rel)) continue;
      const writes = /writeFileSync\([^)]*(LOCK|\.lock)/i.test(s) || /flag:\s*"wx"/.test(s) && /lock/i.test(s);
      const startsChrome = /--user-data-dir=/.test(s) && /spawn\(/.test(s);
      if (writes) bad.push(`${rel} writes a lock file itself`);
      if (startsChrome && !/gate\/lock\.mjs/.test(s)) bad.push(`${rel} starts its own Chrome without browser.lock (tools/gate/lock.mjs)`);
    } } };
    walk(path.join(HERE, "tools"));
    check("B2 no tool writes browser.lock / gate.lock itself; every tool that starts its own Chrome takes browser.lock through tools/gate/lock.mjs", !bad.length, bad.join("; ") || "tools/perf/allocBudget.mjs, allocSample.mjs, gpuTrace.mjs: through the helper");
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(fails ? `locks: ${fails} FAIL` : "locks: all pass");
process.exit(fails ? 1 : 0);
