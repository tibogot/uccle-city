// THE SHARED LOCKS (rules gate-lock-held + browser-lock-helper, claude/tooling2). One module for both lock files every
// job agent shares on the one laptop: C:/Users/tibog/Downloads/uccle-jobs/gate.lock (one gate at a time) and
// browser.lock (one city page / one test Chrome at a time).
//
//   import { acquire, LOCK_BUSY_EXIT, LockBusy } from "../gate/lock.mjs";
//   const h = await acquire("browser", { owner: "allocbudget(tooling2)", waitS: 300 });   // throws LockBusy (exit 76)
//   ... work ...  h.release();       // (also released on exit, an uncaught throw and Ctrl-C)
//
//   node tools/gate/lock.mjs browser|gate|<file> status
//   node tools/gate/lock.mjs browser hold --owner xmasperf4 [--wait 1800] [--max-min 120]   a detached holder process
//        (its pid in the lock, its heartbeat every minute) until `release`, or --max-min; exit 76 when still busy
//   node tools/gate/lock.mjs browser release --owner xmasperf4     only a lock that names that owner (never a blind rm)
//
// The protocol:
//   - the file is one line: `<owner> <heartbeat ISO> pid=<pid> since=<start ISO> host=<name>` (the owner first and the
//     heartbeat the first ISO time: the older per-agent scripts, uccle-jobs/*-lock.mjs and release-lock.mjs, read it);
//   - created with the exclusive flag (wx): never overwritten while held;
//   - the holder rewrites its heartbeat every minute (UCCLE_LOCK_BEAT_MS);
//   - a lock is STALE only when its pid is dead, or it has had no heartbeat for > 10 min (UCCLE_LOCK_STALE_MS: a hung
//     holder, or a pid Windows reused); a legacy lock with no pid (an older script) only after 120 min with no refresh
//     (UCCLE_LOCK_LEGACY_STALE_MS: claude/xmasperf4 lost a 38-min lock it was still using to a 20-min rule);
//   - a stale lock is taken over under a guard file (<lock>.takeover, wx) after a re-read: two waiters never both win;
//   - a lock whose owner equals ours (UCCLE_LOCK_OWNER passes it to children) or held by our parent process is ours
//     already: a nested acquire, a no-op release (merge.mjs -> mergeGate, allocBudget -> allocSample);
//   - a row that finds the lock busy past its wait exits LOCK_BUSY_EXIT (76): mergeGate runs it again later, a busy
//     lock is never a FAIL.
// Every acquire / take-over / release is one line in <lock>.log. The lock folder: UCCLE_LOCK_DIR (the self-tests use a
// scratch folder), or one file: UCCLE_GATE_LOCK / UCCLE_BROWSER_LOCK.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const LOCK_BUSY_EXIT = 76;
const IS_DAEMON = process.argv[3] === "_daemon";
export const DEFAULT_DIR = "C:/Users/tibog/Downloads/uccle-jobs";
const envMs = (k, d) => (Number.isFinite(+process.env[k]) && process.env[k] !== "" && process.env[k] != null ? +process.env[k] : d);
export const BEAT_MS = () => envMs("UCCLE_LOCK_BEAT_MS", 60e3);
export const STALE_MS = () => envMs("UCCLE_LOCK_STALE_MS", 10 * 60e3);
export const LEGACY_STALE_MS = () => envMs("UCCLE_LOCK_LEGACY_STALE_MS", 120 * 60e3);
const ISO = /\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z/;

export class LockBusy extends Error {
  constructor(file, info, waitedS) {
    super(`${path.basename(file)} busy: ${describe(info)} (waited ${waitedS | 0} s)`);
    this.code = LOCK_BUSY_EXIT; this.file = file; this.info = info;
  }
}

/** the lock file for "gate" / "browser" (or a path) */
export function lockPath(name) {
  if (name.includes("/") || name.includes("\\") || name.endsWith(".lock")) return path.resolve(name);
  const env = process.env[`UCCLE_${name.toUpperCase()}_LOCK`];
  if (env) return path.resolve(env);
  return path.join(process.env.UCCLE_LOCK_DIR || DEFAULT_DIR, `${name}.lock`);
}

export function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

/** the lock's content, or null when there is none */
export function readLock(file) {
  let raw, st;
  try { raw = fs.readFileSync(file, "utf8"); st = fs.statSync(file); } catch { return null; }
  const line = raw.trim();
  const owner = line.split(/\s+/)[0] || "";
  const pid = +(/\bpid=(\d+)/.exec(line)?.[1] || 0) || 0;
  const iso = ISO.exec(line)?.[0];
  const since = /\bsince=(\S+)/.exec(line)?.[1] || iso || null;
  // the heartbeat: the first ISO time on the line, or the file's mtime, whichever is later
  const beat = Math.max(iso ? Date.parse(iso) : 0, st.mtimeMs);
  return { raw, owner, pid, beat, since, legacy: !pid, empty: !line, mtime: st.mtimeMs };
}

/** { stale, why } for a lock read now */
export function judge(info, now = Date.now()) {
  if (!info) return { stale: true, why: "no lock" };
  const age = now - info.beat, min = (ms) => `${(ms / 60e3).toFixed(1)} min`;
  if (info.empty) return age > 60e3 ? { stale: true, why: `empty for ${min(age)} (a holder died mid-write)` } : { stale: false, why: "being written" };
  if (info.legacy) return age > LEGACY_STALE_MS() ? { stale: true, why: `a legacy lock (no pid) not refreshed for ${min(age)}` } : { stale: false, why: `a legacy lock (no pid), refreshed ${min(age)} ago` };
  if (!pidAlive(info.pid)) return { stale: true, why: `its pid ${info.pid} is dead` };
  if (age > STALE_MS()) return { stale: true, why: `pid ${info.pid} alive but no heartbeat for ${min(age)} (hung, or the pid reused)` };
  return { stale: false, why: `pid ${info.pid} alive, heartbeat ${Math.round(age / 1000)} s ago` };
}

export function describe(info) {
  if (!info) return "free";
  return `held by ${info.owner || "?"}${info.pid ? ` (pid ${info.pid})` : " (no pid: an older script)"} since ${info.since || "?"}; ${judge(info).why}`;
}

const line = (owner, since) => `${owner} ${new Date().toISOString()} pid=${process.pid} since=${since} host=${os.hostname()}${IS_DAEMON ? " kind=hold" : ""}\n`;
const clean = (o) => String(o).replace(/\s+/g, "_");
const logTo = (file, what) => { try { fs.appendFileSync(`${file}.log`, `${new Date().toISOString()} ${what}\n`); } catch { /* best effort */ } };

function tryCreate(file, owner, since) {
  try { fs.writeFileSync(file, line(owner, since), { flag: "wx" }); return true; } catch (e) { if (e.code === "EEXIST") return false; throw e; }
}

// a stale lock: removed under a guard file and a re-read, so two waiters never both take it
function takeOverStale(file, seen, why, owner) {
  const guard = `${file}.takeover`;
  try { const st = fs.statSync(guard); if (Date.now() - st.mtimeMs > 30e3) fs.unlinkSync(guard); } catch { /* none */ }
  try { fs.writeFileSync(guard, `${owner} pid=${process.pid}`, { flag: "wx" }); } catch { return false; }
  try {
    const now = readLock(file);
    if (now && (now.raw !== seen.raw || !judge(now).stale)) return false;   // it changed under us: not stale any more
    if (now) { fs.unlinkSync(file); logTo(file, `TAKE-OVER by ${owner} (pid ${process.pid}) of: ${seen.raw.trim()} [${why}]`); }
    return true;
  } catch { return false; } finally { try { fs.unlinkSync(guard); } catch { /* gone */ } }
}

const handles = new Set();
let hooked = false;
function hookExit() {
  if (hooked) return; hooked = true;
  const all = () => { for (const h of [...handles]) h.release(); };
  process.on("exit", all);
  for (const s of ["SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"]) {
    try { process.on(s, () => { all(); if (process.listenerCount(s) <= 1) process.exit(130); }); } catch { /* not on this platform */ }
  }
}

/**
 * Take a lock. owner: a name (default UCCLE_LOCK_OWNER, else the script name). waitS: how long to wait for a busy lock
 * (Infinity = until free); then LockBusy (code 76). onWait(msg): a waiting line (default console.log, one a minute or
 * when the holder changes). Returns { file, nested, release(), lost }.
 */
export async function acquire(name, { owner = process.env.UCCLE_LOCK_OWNER || path.basename(process.argv[1] || "node"), waitS = Infinity, pollS = 10, onWait = (m) => console.log(m) } = {}) {
  owner = clean(owner);
  const file = lockPath(name), since = new Date().toISOString(), t0 = Date.now();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let lastSaid = "", lastAt = 0;
  for (;;) {
    if (tryCreate(file, owner, since)) break;
    const info = readLock(file);
    if (!info) continue;   // released between the two calls
    const j = judge(info);
    // ours already: the same owner (alive), or our parent holds it (merge.mjs -> mergeGate)
    if (!j.stale && (info.owner === owner || info.pid === process.ppid) && info.pid !== process.pid) {
      return { file, nested: true, release() {}, lost: false, info };
    }
    if (j.stale) { if (takeOverStale(file, info, j.why, owner)) onWait(`${path.basename(file)}: took over a stale lock (${j.why}): ${info.raw.trim()}`); continue; }
    const waited = (Date.now() - t0) / 1000;
    if (waited >= waitS) throw new LockBusy(file, info, waited);
    const say = `${path.basename(file)} busy: ${describe(info)}; ${owner} waits (${waited | 0} s${Number.isFinite(waitS) ? ` of ${waitS} s` : ""}, every ${pollS} s)`;
    if (info.raw !== lastSaid || Date.now() - lastAt > 60e3) { onWait(say); lastSaid = info.raw; lastAt = Date.now(); }
    await new Promise((r) => setTimeout(r, Math.max(50, Math.min(pollS * 1000, (waitS - waited) * 1000 + 50))));
  }
  logTo(file, `ACQUIRE ${owner} (pid ${process.pid})`);
  const h = {
    file, nested: false, lost: false, owner,
    ours() { const i = readLock(file); return !!i && i.pid === process.pid && i.since === since; },
    beat() {
      if (h.lost || h.released) return;
      if (!h.ours()) { h.lost = true; clearInterval(timer); console.log(`WARNING ${path.basename(file)}: no longer ours (${describe(readLock(file))})`); return; }
      try { fs.writeFileSync(file, line(owner, since)); } catch { /* the next beat */ }
    },
    release() {
      if (h.released) return; h.released = true; clearInterval(timer); handles.delete(h);
      try { if (h.ours()) { fs.unlinkSync(file); logTo(file, `RELEASE ${owner} (pid ${process.pid})`); } } catch { /* gone */ }
    },
  };
  const timer = setInterval(() => h.beat(), BEAT_MS());
  timer.unref();
  handles.add(h); hookExit();
  return h;
}

/** remove a lock only when it names `owner` (the CLI release; a blind rm -f once deleted another agent's lock) */
export function releaseOwned(name, owner) {
  owner = clean(owner);
  const file = lockPath(name), info = readLock(file);
  if (!info) return "no lock";
  if (info.owner !== owner) return `NOT released: ${describe(info)}`;
  // (only a `hold` process is stopped: a gate or a row that names the same owner finishes on its own)
  if (/kind=hold/.test(info.raw) && info.pid !== process.pid && pidAlive(info.pid)) { try { process.kill(info.pid); } catch { /* gone */ } }
  try { if (readLock(file)?.raw === info.raw) fs.unlinkSync(file); } catch { /* gone */ }
  logTo(file, `RELEASE (cli) ${owner}`);
  return "released";
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [name, cmd = "status", ...rest] = process.argv.slice(2);
  const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
  if (!name) { console.log("usage: node tools/gate/lock.mjs browser|gate|<file> status|hold|release [--owner NAME] [--wait S] [--max-min M]"); process.exit(2); }
  const owner = opt("owner", process.env.UCCLE_LOCK_OWNER);
  if (cmd === "status") { const i = readLock(lockPath(name)); console.log(`${lockPath(name)}: ${describe(i)}${i ? `\n  ${i.raw.trim()}` : ""}`); process.exit(0); }
  if (!owner) { console.log("--owner NAME (or UCCLE_LOCK_OWNER) is required"); process.exit(2); }
  if (cmd === "release") { console.log(releaseOwned(name, owner)); process.exit(0); }
  if (cmd === "hold" || cmd === "acquire") {
    // a detached holder process: the lock names ITS pid, it beats every minute, it exits after --max-min
    const d = spawn(process.execPath, [fileURLToPath(import.meta.url), name, "_daemon", "--owner", owner, "--wait", opt("wait", "1800"), "--max-min", opt("max-min", "120")], { detached: true, stdio: "ignore", windowsHide: true, env: process.env });
    d.unref();
    const file = lockPath(name), end = Date.now() + (+opt("wait", "1800") + 30) * 1000;
    let said = "";
    for (;;) {
      const i = readLock(file);
      if (i && i.pid === d.pid) { console.log(`acquired ${file} for ${owner}: holder pid ${d.pid}, heartbeat every ${BEAT_MS() / 1000} s, ends after ${opt("max-min", "120")} min; release: node tools/gate/lock.mjs ${name} release --owner ${owner}`); process.exit(0); }
      if (!pidAlive(d.pid) || Date.now() > end) { console.log(`lock busy: ${describe(i)}`); process.exit(LOCK_BUSY_EXIT); }
      const s = describe(i); if (s !== said) { console.log(`waiting: ${s}`); said = s; }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (cmd === "_daemon") {
    try {
      const h = await acquire(name, { owner, waitS: +opt("wait", "1800"), onWait: () => {} });
      setTimeout(() => { h.release(); process.exit(0); }, +opt("max-min", "120") * 60e3);
      setInterval(() => { if (h.lost) process.exit(0); }, 5000);
    } catch { process.exit(LOCK_BUSY_EXIT); }
  } else { console.log(`unknown command ${cmd}`); process.exit(2); }
}
