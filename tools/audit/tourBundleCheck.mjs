// Gate row `tourbundle` (rule tour-fresh-bundle): a branch's tour draws the branch's tiles.
//
//   1. tools/tour/freshBundle.mjs builds byte for byte what tools/build_worker.mjs commits: on a checkout whose bundle
//      was built from its own sources, the fresh build's code hash equals the committed stamp. Checked on the merge
//      base's tree (git worktree-free: `git show` of the committed bundle vs a build of the same commit's sources in a
//      temp dir) only when the committed bundle claims to be current; on a branch whose worker sources changed, the
//      committed bundle is stale by design, so the check is the build reproducing foundation's stamp instead.
//   2. tools/tour/serve.mjs, started on this checkout, serves the FRESH build at /viewer/tileWorker.bundle.js, and
//      the committed file with --committed-bundle.
//   3. A planted worker-side change (a temp copy of the checkout's viewer/ with one marker line in tileWorker.js)
//      shows up in what serve.mjs sends: the case the tour missed (claude/parking1 and claude/lanes5 were toured on
//      foundation's bundle, 2026-11-22/23).
import { spawn, spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle, committedHash } from "../tour/freshBundle.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };

// 1. the fresh build reproduces the committed stamp, built IN PLACE (the committed bundle is built from the working
// copy, CRLF on Windows: a git-archive copy has LF and hashes differently) when no worker input changed since the
// merge base; on a branch that changed one, the committed bundle is stale by design (only tools/merge.mjs rebuilds it)
const git = (...a) => execFileSync("git", a, { cwd: HERE, encoding: "utf8" }).trim();
let base = null;
try { base = git("merge-base", "HEAD", "claude/foundation"); } catch { base = git("rev-parse", "HEAD"); }
const here = await buildBundle(HERE), stampHere = await committedHash(HERE);
const changed = git("diff", "--name-only", base, "--", ...here.inputs).split(/\r?\n/).filter(Boolean);
if (changed.length) check("build reproduces the committed bundle", true, `skipped: ${changed.length} worker input(s) changed since ${base.slice(0, 8)} (${changed.slice(0, 4).join(", ")}${changed.length > 4 ? ", ..." : ""}): the committed bundle is stale by design, the tour builds fresh`);
else check("build reproduces the committed bundle", here.hash === stampHere, `fresh in-place build ${here.hash}, committed stamp ${stampHere} (${here.inputs.length} worker inputs, none changed since ${base.slice(0, 8)})`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tourbundle-"));
try {
  const tar = path.join(tmp, "src.tar");
  execFileSync("git", ["archive", "--format=tar", "-o", tar, "HEAD", "viewer", "vendor"], { cwd: HERE });
  execFileSync("tar", ["-xf", "src.tar"], { cwd: tmp });   // (relative: GNU tar reads "C:..." as a remote host)

  // 3 (prepared): a planted worker-side change in a copy
  const marker = `/* tourbundle-marker-${Date.now()} */`;
  const tw = path.join(tmp, "viewer", "tileWorker.js");
  fs.writeFileSync(tw, fs.readFileSync(tw, "utf8") + `\nself.__tourbundleMarker = ${JSON.stringify(marker)};\n`);

  // 2 + 3. serve.mjs on the planted copy, fresh and --committed-bundle
  const serveOnce = (extra) => new Promise((resolve, reject) => {
    const port = 18800 + Math.floor(Math.random() * 900);
    const p = spawn(process.execPath, [path.join(HERE, "tools/tour/serve.mjs"), "--root", tmp, "--port", String(port), "--any-port", "--out", path.join(tmp, "out"), ...extra], { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    const done = (v, e) => { p.kill(); e ? reject(e) : resolve(v); };
    const t = setTimeout(() => done(null, new Error(`serve.mjs did not start: ${log}`)), 60000);
    p.stdout.on("data", async (d) => {
      log += d;
      if (!/open http/.test(log)) return;
      clearTimeout(t);
      try { const r = await fetch(`http://127.0.0.1:${port}/viewer/tileWorker.bundle.js`); done({ text: await r.text(), log }); } catch (e) { done(null, e); }
    });
    p.stderr.on("data", (d) => { log += d; });
  });
  const fresh2 = await serveOnce([]);
  check("serve.mjs sends the fresh build", fresh2.text.includes(marker), `a marker planted in the served checkout's viewer/tileWorker.js ${fresh2.text.includes(marker) ? "is" : "is NOT"} in /viewer/tileWorker.bundle.js; server said: ${(/tile worker built[^\n]*/.exec(fresh2.log) || ["(nothing)"])[0]}`);
  check("serve.mjs reports a stale committed bundle", /STALE/.test(fresh2.log), "the start-up line names the committed bundle as stale when the sources differ");
  const old = await serveOnce(["--committed-bundle"]);
  check("--committed-bundle serves the file", !old.text.includes(marker) && old.text.includes("__TILE_CODE_HASH"), "the committed bundle, without the planted marker");

  // rule serve-rebuilds-worker (claude/tooling2): a server left running while the worker's sources change (a merge, a
  // checkout, an edit) serves the NEW build, never its start-up one (20 false tour flags, 2026-11-28)
  {
    const port = 18800 + Math.floor(Math.random() * 900);
    const p = spawn(process.execPath, [path.join(HERE, "tools/tour/serve.mjs"), "--root", tmp, "--port", String(port), "--any-port", "--out", path.join(tmp, "out")], { stdio: ["ignore", "pipe", "pipe"] });
    let log = ""; p.stdout.on("data", (d) => { log += d; }); p.stderr.on("data", (d) => { log += d; });
    try {
      for (let i = 0; i < 600 && !/open http/.test(log); i++) await new Promise((r) => setTimeout(r, 100));
      const get = async () => (await fetch(`http://127.0.0.1:${port}/viewer/tileWorker.bundle.js`)).text();
      const a = await get();
      const marker2 = `/* tourbundle-rebuild-${Date.now()} */`;
      fs.appendFileSync(tw, `\nself.__tourbundleMarker2 = ${JSON.stringify(marker2)};\n`);
      await new Promise((r) => setTimeout(r, 1200));
      const b = await get();
      check("serve.mjs rebuilds when the worker sources change", a.includes(marker) && !a.includes(marker2) && b.includes(marker2) && /WORKER SOURCES CHANGED[^\n]*rebuilt/.test(log),
        `a marker added to viewer/tileWorker.js while the server ran ${b.includes(marker2) ? "is" : "is NOT"} in the next /viewer/tileWorker.bundle.js; server said: ${(/WORKER SOURCES CHANGED[^\n]*/.exec(log) || ["(no rebuild line)"])[0]}`);
      // a source that no longer builds: 503, never the stale build
      fs.appendFileSync(tw, "\nthis is not javascript (((\n");
      await new Promise((r) => setTimeout(r, 1200));
      const bad = await fetch(`http://127.0.0.1:${port}/viewer/tileWorker.bundle.js`);
      check("a failed rebuild is refused, not served stale", bad.status === 503 && /REFUSING/.test(log), `HTTP ${bad.status}`);
    } finally { p.kill(); }
  }

  // rule local-origins-capped: a port outside the pool is refused; /sw.js is the self-removing worker; --keep-sw = real
  const refused = spawnSync(process.execPath, [path.join(HERE, "tools/tour/serve.mjs"), "--root", tmp, "--port", "18999", "--committed-bundle", "--out", path.join(tmp, "out")], { encoding: "utf8", timeout: 60000 });
  check("a port outside the pool is refused", refused.status === 2 && /refused/.test(refused.stderr), `exit ${refused.status}: ${(refused.stderr || "").trim().slice(0, 120)}`);
  const swOnce = (extra) => new Promise((resolve, reject) => {
    const port = 18800 + Math.floor(Math.random() * 900);
    const p = spawn(process.execPath, [path.join(HERE, "tools/tour/serve.mjs"), "--root", HERE, "--port", String(port), "--any-port", "--committed-bundle", "--out", path.join(tmp, "out"), ...extra], { stdio: ["ignore", "pipe", "pipe"] });
    let log = ""; const t = setTimeout(() => { p.kill(); reject(new Error("serve.mjs did not start")); }, 60000);
    p.stdout.on("data", async (d) => { log += d; if (!/open http/.test(log)) return; clearTimeout(t); try { const r = await fetch(`http://127.0.0.1:${port}/sw.js`); const txt = await r.text(); p.kill(); resolve(txt); } catch (e) { p.kill(); reject(e); } });
  });
  const kill = await swOnce([]), real = await swOnce(["--keep-sw"]);
  check("/sw.js is the self-removing worker on local checks", /unregister\(\)/.test(kill) && /caches\.delete/.test(kill) && kill.length < 600, `${kill.length} bytes`);
  check("--keep-sw serves the real sw.js", real === fs.readFileSync(path.join(HERE, "sw.js"), "utf8"), `${real.length} bytes`);
  const tourJs = fs.readFileSync(path.join(HERE, "debug/tour.js"), "utf8");
  check("tour.js stops on a throttled page", /const pageFps = /.test(tourJs) && /page throttled/.test(tourJs) && /fps < 30/.test(tourJs), "debug/tour.js measures its rAF rate before each view (rule tour-page-in-front)");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `tourbundle: ${fails} FAIL` : "tourbundle: all pass");
process.exit(fails ? 1 : 0);
