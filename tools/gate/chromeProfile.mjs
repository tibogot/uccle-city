// TEMP CHROME PROFILES THAT GO AWAY (rule chrome-profiles-removed, claude/tooling2).
// Every tool that starts its own Chrome (tools/perf/allocSample.mjs, tools/perf/gpuTrace.mjs, ...) makes its
// --user-data-dir here: %TEMP%/uccle-<tag>-XXXXXX with a marker file naming the process that made it. It is removed
// on exit (normal, a throw, Ctrl-C) by that process, and every such tool sweeps at start-up: a uccle-* Chrome profile
// whose maker is dead (any age), or with no marker (an older tool) and older than 2 h, and that no running Chrome holds
// (the folder can be renamed: Windows refuses while Chrome has files open in it), is deleted. A hard kill
// (taskkill /F of the tree after a row's timeout) skips the exit handler: the parent's finally sweeps then
// (tools/perf/allocBudget.mjs). 28 left-over profiles (~1 GB each, uccle-alloc-* / uccle-ab-*) filled ~17 GB on 2026-11-28.
//   import { makeProfile, sweepProfiles } from "../gate/chromeProfile.mjs";
//   sweepProfiles();  const prof = makeProfile("alloc");  ... spawn(CHROME, [`--user-data-dir=${prof.dir}`]) ...
//   (after killing Chrome) prof.remove();
// The folder: UCCLE_PROFILE_TMP (the self-test uses a scratch folder), else os.tmpdir().
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const MARKER = ".uccle-profile.json";
export const SWEEP_AGE_MS = 2 * 3600e3;
export const tmpRoot = () => process.env.UCCLE_PROFILE_TMP || os.tmpdir();
const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
const sleepSync = (ms) => { const t = Date.now(); while (Date.now() - t < ms); };

/** delete a folder, retrying while a just-killed Chrome lets go of its files (~5 s) */
export function removeDir(dir, tries = 20) {
  for (let i = 0; i < tries; i++) {
    try { fs.rmSync(dir, { recursive: true, force: true }); if (!fs.existsSync(dir)) return true; } catch { /* busy */ }
    sleepSync(250);
  }
  return !fs.existsSync(dir);
}

const made = new Set();
let hooked = false;
function hook() {
  if (hooked) return; hooked = true;
  process.on("exit", () => { for (const p of [...made]) p.remove(); });
  for (const s of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
    try { process.on(s, () => { for (const p of [...made]) p.remove(); if (process.listenerCount(s) <= 1) process.exit(130); }); } catch { /* n/a */ }
  }
}

/** a fresh profile folder uccle-<tag>-XXXXXX with its marker; remove() deletes it (also on exit) */
export function makeProfile(tag) {
  const dir = fs.mkdtempSync(path.join(tmpRoot(), `uccle-${tag}-`));
  fs.writeFileSync(path.join(dir, MARKER), JSON.stringify({ pid: process.pid, at: new Date().toISOString(), script: process.argv[1] || "" }));
  const p = { dir, removed: false, remove() { if (p.removed) return true; p.removed = removeDir(dir); if (p.removed) made.delete(p); return p.removed; } };
  made.add(p); hook();
  return p;
}

const isProfile = (dir) => ["Local State", "Default", MARKER, "lockfile", "SingletonLock"].some((f) => fs.existsSync(path.join(dir, f)));

/**
 * Delete the left-over uccle-* Chrome profiles in the temp folder: maker dead (any age), or no marker and older than
 * maxAgeMs; never one a running Chrome holds (the rename test) or one whose maker is alive. Returns { removed, kept, bytes }.
 */
export function sweepProfiles({ root = tmpRoot(), maxAgeMs = SWEEP_AGE_MS, log = () => {} } = {}) {
  const out = { removed: [], kept: [], bytes: 0 };
  let names = [];
  try { names = fs.readdirSync(root); } catch { return out; }
  for (const n of names) {
    if (!/^uccle-/.test(n) || /\.sweep$/.test(n)) continue;
    const dir = path.join(root, n);
    let st; try { st = fs.statSync(dir); } catch { continue; }
    if (!st.isDirectory() || !isProfile(dir)) continue;
    let mk = null; try { mk = JSON.parse(fs.readFileSync(path.join(dir, MARKER), "utf8")); } catch { /* an older tool's */ }
    let newest = st.mtimeMs; for (const f of ["Local State", MARKER]) { try { newest = Math.max(newest, fs.statSync(path.join(dir, f)).mtimeMs); } catch { /* none */ } }
    const age = Date.now() - newest;
    if (mk && mk.pid === process.pid) { out.kept.push(`${n} (ours)`); continue; }
    if (mk && alive(mk.pid)) { out.kept.push(`${n} (maker pid ${mk.pid} alive)`); continue; }
    if (!mk && age < maxAgeMs) { out.kept.push(`${n} (no marker, ${(age / 60e3) | 0} min old)`); continue; }
    // a running Chrome keeps files open: Windows refuses the rename, so a live profile is never touched
    const gone = `${dir}.sweep`;
    try { fs.renameSync(dir, gone); } catch { out.kept.push(`${n} (in use)`); continue; }
    let bytes = 0; const du = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); try { if (e.isDirectory()) du(p); else bytes += fs.statSync(p).size; } catch { /* skip */ } } };
    try { du(gone); } catch { /* skip */ }
    if (removeDir(gone, 8)) { out.removed.push(n); out.bytes += bytes; } else out.kept.push(`${n} (delete failed)`);
  }
  // half-done sweeps of an earlier run
  for (const n of names) if (/^uccle-.*\.sweep$/.test(n)) removeDir(path.join(root, n), 2);
  if (out.removed.length) log(`chrome profiles: swept ${out.removed.length} left-over uccle-* profile(s), ${(out.bytes / 2 ** 20).toFixed(0)} MB (rule chrome-profiles-removed)`);
  return out;
}
