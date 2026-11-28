// Gate row `worktreeremove` (rule worktree-remove-safe): removing a job worktree never deletes through a junction.
// Builds a throwaway git repo + a worktree holding a JUNCTION to a "precious" folder outside it (like data/raw), runs
// tools/worktreeRemove.mjs on it, and checks: the worktree is gone, the precious folder still has every file, the
// junction was removed as a link. Also checks tools/merge.mjs still re-scans + counts before its own remove.
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, symlinkSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) fails++; if (!c || !QUIET) console.log(`${c ? "PASS" : "FAIL"} ${m}`); };

const base = mkdtempSync(path.join(os.tmpdir(), "wtremove-"));
const precious = path.join(base, "precious");
mkdirSync(path.join(precious, "sub"), { recursive: true });
for (let i = 0; i < 5; i++) writeFileSync(path.join(precious, `f${i}.txt`), "keep");
writeFileSync(path.join(precious, "sub", "deep.txt"), "keep");
const repo = path.join(base, "repo");
mkdirSync(repo);
const g = (...a) => execFileSync("git", a, { cwd: repo, encoding: "utf8" });
g("init", "-q", "-b", "main"); g("config", "user.email", "t@t"); g("config", "user.name", "t"); g("config", "commit.gpgsign", "false");
writeFileSync(path.join(repo, "a.txt"), "1"); g("add", "."); g("commit", "-qm", "init");
const wt = path.join(base, "wt");
g("worktree", "add", "-q", "--detach", wt);
mkdirSync(path.join(wt, "data"), { recursive: true });
symlinkSync(precious, path.join(wt, "data", "raw"), "junction");
ok(readdirSync(path.join(wt, "data", "raw")).length === 6, "the test worktree's data/raw junction shows the precious folder (6 entries)");

const r = spawnSync(process.execPath, [path.join(HERE, "tools/worktreeRemove.mjs"), wt, "--repo", repo], { encoding: "utf8" });
const files = (d) => { let n = 0; const w = (x) => { for (const e of readdirSync(x, { withFileTypes: true })) { if (e.isDirectory()) w(path.join(x, e.name)); else n++; } }; w(d); return n; };
ok(r.status === 0, `worktreeRemove exits 0 (${(r.stdout + r.stderr).trim().split("\n").slice(-1)[0]})`);
ok(!existsSync(wt), "the worktree folder is gone");
ok(existsSync(precious) && files(precious) === 6, `the junction's target keeps all its files (${existsSync(precious) ? files(precious) : 0} of 6)`);
ok(!g("worktree", "list").includes(wt.replace(/\\/g, "/")), "git no longer lists the worktree");

const m = readFileSync(path.join(HERE, "tools/merge.mjs"), "utf8");
ok(/raw1 !== raw0\) die/.test(m) && /raw2 !== raw0\) die/.test(m), "tools/merge.mjs counts data/raw before and after its own worktree removal");
console.log(fails ? `worktreeremove: ${fails} FAIL` : "worktreeremove: all pass");
console.log(`(test files left in ${base}: the OS temp folder clears them)`);
process.exit(fails ? 1 : 0);
