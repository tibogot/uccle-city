// Gate row `mergetool` (rule merge-gate-base): tools/merge.mjs gates the merge against the commit BEFORE the merge.
//   1. static: the --no-merge base is fixed from the merge commit (`${base}^1`) before the tool's first commit, and
//      no "HEAD^1" is read after it (the bundle-rebuild commit moves HEAD: HEAD^1 is then the merge commit itself).
//   2. behaviour in a throwaway git repo: a merge commit, then a "bundle" commit on top: `${base}^1` names the pre-merge
//      commit, while HEAD^1 (the old code) names the merge commit, which is what let claude/lanes5 out with 68 rows skipped.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };

const src = fs.readFileSync(path.join(HERE, "tools/merge.mjs"), "utf8");
const fixAt = src.indexOf('preMergeFixed = git("rev-parse", `${base}^1`)');
const firstCommit = src.search(/git(Try)?\(\s*"commit"|\["commit"|"commit",/);
check("base fixed before any commit", fixAt > 0 && (firstCommit < 0 || fixAt < firstCommit), `preMergeFixed at ${fixAt}, first commit call at ${firstCommit}`);
check("no HEAD^1 read for the base", !/preMerge\s*=.*HEAD\^1/.test(src), "the preMerge line does not read HEAD^1");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mergetool-"));
try {
  const g = (...a) => execFileSync("git", a, { cwd: tmp, encoding: "utf8" }).trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t"); g("config", "user.name", "t"); g("config", "commit.gpgsign", "false");
  const w = (f, s) => fs.writeFileSync(path.join(tmp, f), s);
  w("a.txt", "1"); g("add", "."); g("commit", "-qm", "pre");
  const pre = g("rev-parse", "HEAD");
  g("checkout", "-qb", "job"); w("b.txt", "2"); g("add", "."); g("commit", "-qm", "job");
  g("checkout", "-q", "main"); w("c.txt", "3"); g("add", "."); g("commit", "-qm", "main moved");
  const pre2 = g("rev-parse", "HEAD");
  g("merge", "-q", "--no-ff", "job", "-m", "merge");
  const base = g("rev-parse", "HEAD");
  w("bundle.js", "rebuilt"); g("add", "."); g("commit", "-qm", "bundle");
  const fixed = g("rev-parse", `${base}^1`), old = g("rev-parse", "HEAD^1");
  check("the fixed base is the pre-merge commit", fixed === pre2 && pre !== pre2, `${base.slice(0, 7)}^1 = ${fixed.slice(0, 7)} (pre-merge ${pre2.slice(0, 7)})`);
  check("the old HEAD^1 was the merge commit", old === base, `HEAD^1 after the bundle commit = ${old.slice(0, 7)} (the merge ${base.slice(0, 7)}): what the old code gated against`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `mergetool: ${fails} FAIL` : "mergetool: all pass");
process.exit(fails ? 1 : 0);
