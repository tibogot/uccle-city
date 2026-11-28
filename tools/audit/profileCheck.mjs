// Gate row `profiles` (rule chrome-profiles-removed, claude/tooling2): a tool that starts its own Chrome leaves no
// temp profile behind. Everything runs in a scratch temp folder (UCCLE_PROFILE_TMP) with scratch locks (UCCLE_LOCK_DIR).
//   P1 tools/gate/chromeProfile.mjs makeProfile: removed on a normal exit, an uncaught throw and process.exit
//   P2 a hard-killed maker (taskkill /F: what a row timeout does) leaves it; sweepProfiles removes it (maker dead)
//   P3 the sweep keeps: a profile whose maker is alive, an old tool's profile (no marker) under 2 h, a uccle-* folder
//      that is not a Chrome profile; it removes an old tool's profile over 2 h
//   P4 tools/perf/allocSample.mjs, a real run with a stand-in "Chrome" that never answers: exits, no uccle-* left, its
//      lock released; killed hard mid-run, the sweep (allocBudget's finally) leaves none
//   P5 static: no tool makes a uccle-* profile with its own mkdtemp; allocBudget sweeps at the start and in cleanup
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "profcheck-"));
const ENV = { ...process.env, UCCLE_PROFILE_TMP: tmp, UCCLE_LOCK_DIR: tmp };
for (const k of ["UCCLE_GATE_LOCK", "UCCLE_BROWSER_LOCK", "UCCLE_LOCK_OWNER", "NODE_OPTIONS", "GATE_TRACE_OUT"]) delete ENV[k];
process.env.UCCLE_PROFILE_TMP = tmp;
const { sweepProfiles, MARKER } = await import("../gate/chromeProfile.mjs");
const MOD = path.join(HERE, "tools/gate/chromeProfile.mjs").replace(/\\/g, "/");
const left = () => fs.readdirSync(tmp).filter((n) => /^uccle-/.test(n));
const child = (code) => {
  const p = spawn(process.execPath, ["--input-type=module", "-e", `import * as P from "file:///${MOD}";\n${code}`], { env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  p.out = ""; p.stdout.on("data", (d) => { p.out += d; }); p.stderr.on("data", (d) => { p.out += d; });
  p.done = new Promise((r) => p.on("close", r));
  return p;
};
const untilOut = async (p, re, ms = 15000) => { const t = Date.now(); while (!re.test(p.out) && Date.now() - t < ms) await sleep(50); return re.test(p.out); };
const hardKill = (pid) => spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
const fakeProfile = (name, { marker = null, hoursOld = 0, chrome = true } = {}) => {
  const d = path.join(tmp, name), sub = path.join(d, chrome ? "Default" : "logs"); fs.mkdirSync(sub, { recursive: true });
  if (chrome) fs.writeFileSync(path.join(d, "Local State"), "{}");
  fs.writeFileSync(path.join(sub, "big.bin"), Buffer.alloc(64 * 1024));
  if (marker) fs.writeFileSync(path.join(d, MARKER), JSON.stringify(marker));
  const t = new Date(Date.now() - hoursOld * 3600e3);
  for (const f of [d, path.join(d, "Local State"), path.join(d, MARKER)]) { try { fs.utimesSync(f, t, t); } catch { /* none */ } }
  return d;
};

try {
  // P1
  for (const [what, tail] of Object.entries({ "a normal exit": "", "an uncaught throw": `throw new Error("boom");`, "process.exit(1)": "process.exit(1);" })) {
    const c = child(`const p = P.makeProfile("alloc"); (await import("node:fs")).writeFileSync(p.dir + "/Local State", "{}"); console.log("MADE " + p.dir); ${tail}`);
    await c.done;
    check(`P1 a profile is removed on ${what}`, /MADE/.test(c.out) && !left().length, left().join(", ") || "none left");
  }
  // P2
  {
    const c = child(`const p = P.makeProfile("alloc"); (await import("node:fs")).writeFileSync(p.dir + "/Local State", "{}"); console.log("MADE"); setTimeout(() => {}, 60000);`);
    await untilOut(c, /MADE/); hardKill(c.pid); await c.done;
    const n0 = left().length, s = sweepProfiles();
    check("P2 a hard-killed maker leaves its profile; the sweep removes it (maker dead)", n0 === 1 && s.removed.length === 1 && !left().length, `left after the kill ${n0}, swept ${s.removed.join(", ")}`);
  }
  // P3
  {
    const alive = child(`console.log("UP"); setTimeout(() => {}, 60000);`); await untilOut(alive, /UP/);
    fakeProfile("uccle-alloc-live1", { marker: { pid: alive.pid }, hoursOld: 5 });
    fakeProfile("uccle-ab-young1", { hoursOld: 1 });
    fakeProfile("uccle-ab-old1", { hoursOld: 3 });
    fakeProfile("uccle-gpuwatch", { hoursOld: 9, chrome: false });
    const s = sweepProfiles();
    check("P3 the sweep removes an old tool's profile over 2 h, keeps a live maker's, one under 2 h and a non-profile uccle-* folder",
      s.removed.join() === "uccle-ab-old1" && ["uccle-alloc-live1", "uccle-ab-young1", "uccle-gpuwatch"].every((n) => left().includes(n)), `removed ${s.removed.join(", ") || "-"}; kept ${s.kept.join(", ")}`);
    hardKill(alive.pid); await alive.done;
    for (const n of left()) fs.rmSync(path.join(tmp, n), { recursive: true, force: true });
  }
  // P4: allocSample with a stand-in Chrome (node.exe rejects the Chrome flags and exits: "no page target")
  {
    const args = [path.join(HERE, "tools/perf/allocSample.mjs"), "--base", "http://127.0.0.1:9", "--mode", "falcon", "--seconds", "1", "--chrome", process.execPath, "--port", String(19400 + Math.floor(Math.random() * 400))];
    const r = spawnSync(process.execPath, args, { cwd: HERE, env: { ...ENV, UCCLE_CDP_WAIT_S: "1" }, encoding: "utf8", timeout: 60000 });
    check("P4 allocSample run (Chrome never answers): it exits and leaves no uccle-* profile, its browser.lock released", r.status !== 0 && /no page target/.test(r.stdout + r.stderr) && !left().length && !fs.existsSync(path.join(tmp, "browser.lock")), `exit ${r.status}; left ${left().join(", ") || "none"}`);
    const c = spawn(process.execPath, args, { cwd: HERE, env: { ...ENV, UCCLE_CDP_WAIT_S: "30" }, stdio: "ignore" });
    for (let i = 0; i < 100 && !left().length; i++) await sleep(100);
    const made = left().length;
    hardKill(c.pid); await new Promise((r) => c.on("close", r));
    const n0 = left().length, s = sweepProfiles();
    check("P4 allocSample killed hard mid-run (a row timeout): the sweep in allocBudget's finally leaves no profile", made === 1 && n0 === 1 && !left().length, `made ${made}, left after the kill ${n0}, swept ${s.removed.length}`);
    try { fs.unlinkSync(path.join(tmp, "browser.lock")); } catch { /* none */ }
  }
  // P5
  {
    const bad = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); } else if (/\.(mjs|js)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8"), rel = path.relative(HERE, p).replace(/\\/g, "/");
      if (rel !== "tools/gate/chromeProfile.mjs" && /mkdtemp\w*\([^)]*["'`]uccle-/.test(s)) bad.push(`${rel} makes a uccle-* folder with its own mkdtemp`);
      if (/--user-data-dir=/.test(s) && /spawn\(/.test(s) && !/makeProfile\(/.test(s) && !["tools/gate/chromeProfile.mjs", "tools/audit/lockCheck.mjs", "tools/audit/profileCheck.mjs"].includes(rel)) bad.push(`${rel} starts Chrome with a profile not from makeProfile`);
    } } };
    walk(path.join(HERE, "tools"));
    const ab = fs.readFileSync(path.join(HERE, "tools/perf/allocBudget.mjs"), "utf8");
    if (!/const cleanup = [^\n]*sweepProfiles\(/.test(ab)) bad.push("tools/perf/allocBudget.mjs cleanup does not sweep the profiles");
    check("P5 every Chrome profile comes from makeProfile; allocBudget's cleanup sweeps", !bad.length, bad.join("; ") || "allocSample, gpuTrace: makeProfile; allocBudget: swept");
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(fails ? `profiles: ${fails} FAIL` : "profiles: all pass");
process.exit(fails ? 1 : 0);
