// ONE-COMMAND MERGE (claude/speed1, docs/SPEED_PLAN.md job 9, docs/WORKFLOW.md "Merge a branch").
//   node tools/merge.mjs <branch> [--rows auto|full|a,b,c] [--message-file FILE] [--into claude/foundation]
//                                  [--no-push] [--keep-worktree] [--dry-run]
// Run it in the MAIN checkout, on the target branch (claude/foundation), with a clean tree. In order:
//   1. the branch must be in the new formats (gate rows in tools/audit/gate.d/, rules in docs/rules/): else run
//      tools/gate/convertBranch.mjs on the branch first;
//   2. git merge --no-ff <branch> -F <message file> (asked for when no --message-file and a terminal is attached);
//      a conflict stops here and lists the files (resolve, commit, then run again with --rows ... --no-merge);
//   3. viewer/tileWorker.bundle.js rebuilt HERE (rule 12: only in the main repo) by tools/build_worker.mjs; when its code
//      hash (self.__TILE_CODE_HASH) changed, the bundle is committed;
//   4. the gate rows: auto (default) = mergeGate --changed vs the pre-merge commit: `meta` + every row whose traced deps
//      (tools/gate/deps.mjs; the static crawl for a row never traced here) the merge touched, minus the rows the memo
//      skips (deps as at their last PASS here); full = every row, memo off (--full); a,b,c = those;
//   5. PASS: git push (never --force). FAIL: stop and print (the merge stays a local commit: fix on the branch, or
//      `git reset --hard ORIG_HEAD` yourself);
//   6. the branch's worktree (git worktree list: a path under Downloads/uccle-jobs/ or named uccle-*) loses its
//      junctions (data/raw, node_modules: rmdir, never a delete through them), then `git worktree remove`; data/raw's
//      file count is checked before and after. A worktree with uncommitted changes to tracked files is kept.
// Never deletes a branch, never force-pushes.
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { loadRows } from "./gate/rowFiles.mjs";
import { selectRows } from "./gate/select.mjs";
import { ROOT } from "./gate/rowFiles.mjs";

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(k);
const VALUED = new Set(["--rows", "--message-file", "--into"]);
const branch = argv.find((a, i) => !a.startsWith("--") && !VALUED.has(argv[i - 1]));
const INTO = opt("--into", "claude/foundation"), ROWS = opt("--rows", "auto"), DRY = flag("--dry-run");
if (!branch) { console.log("usage: node tools/merge.mjs <branch> [--rows auto|full|a,b,c] [--message-file FILE] [--no-push] [--keep-worktree] [--dry-run] [--no-merge]"); process.exit(2); }

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const gitTry = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" });
const die = (m, code = 1) => { console.log(`\nSTOP: ${m}`); process.exit(code); };
const step = (m) => console.log(`\n== ${m}`);

// ------------------------------------------------------------------ 0. where we are
const common = path.dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
if (path.resolve(common) !== path.resolve(ROOT) && !DRY) die(`run this in the main checkout (${common}), not in a worktree (rule 12: the bundle is built there)`);
const cur = git("rev-parse", "--abbrev-ref", "HEAD");
if (cur !== INTO && !DRY) die(`the main checkout is on ${cur}, not ${INTO}`);
if (gitTry("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`).status !== 0) die(`no local branch ${branch}`);
const dirty = git("status", "--porcelain", "--untracked-files=no");
const NO_MERGE = flag("--no-merge");
if (dirty && !NO_MERGE && !DRY) die(`the tree has uncommitted changes:\n${dirty}`);

// ------------------------------------------------------------------ 1. formats
{
  const has = (p) => gitTry("cat-file", "-e", `${branch}:${p}`).status === 0;
  const gate = gitTry("show", `${branch}:tools/audit/mergeGate.mjs`).stdout || "";
  if (/const CHECKS = \[/.test(gate) || !has("tools/audit/gate.d/meta.mjs")) die(`${branch} still has the old single-file gate / rules: on the branch, merge ${INTO} and run node tools/gate/convertBranch.mjs (docs/SPEED_PLAN.md "Branch conversion"), commit, then merge again`);
}

// ------------------------------------------------------------------ 2. merge
const base = git("rev-parse", "HEAD");
let changed;
// the commit the gate compares against, fixed HERE before this tool commits anything (rule merge-gate-base: with
// --no-merge, "HEAD^1" read AFTER the bundle-rebuild commit is the merge commit itself, so the gate saw only the bundle
// and skipped every row: claude/lanes5 went out with 68 rows skipped, 2026-11-23)
let preMergeFixed = null;
if (NO_MERGE) {
  if (!git("log", "-1", "--format=%P").includes(" ")) die("--no-merge: HEAD is not a merge commit (resolve and commit the merge first)");
  preMergeFixed = git("rev-parse", `${base}^1`);
  changed = git("diff", "--name-only", "HEAD^1", "HEAD").split("\n").filter(Boolean);
} else if (DRY) {
  changed = git("diff", "--name-only", `${INTO}...${branch}`).split("\n").filter(Boolean);
  step(`dry run: ${branch} into ${INTO} would change ${changed.length} files`);
} else {
  let msgFile = opt("--message-file");
  if (!msgFile) {
    if (!process.stdin.isTTY) die("no --message-file (write the merge message to a file: PowerShell splits a quoted -m, docs/WORKFLOW.md)");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(`merge message for ${branch} (end with an empty line):`);
    const lines = [];
    for (;;) { const l = await rl.question(""); if (!l && lines.length) break; if (l) lines.push(l); }
    rl.close();
    msgFile = path.join(mkdtempSync(path.join(tmpdir(), "merge-")), "msg.txt");
    writeFileSync(msgFile, lines.join("\n") + "\n");
  }
  if (!existsSync(msgFile)) die(`no message file ${msgFile}`);
  step(`git merge --no-ff ${branch} -F ${msgFile}`);
  const m = gitTry("merge", "--no-ff", branch, "-F", path.resolve(msgFile));
  process.stdout.write(m.stdout + m.stderr);
  if (m.status !== 0) {
    let un = gitTry("diff", "--name-only", "--diff-filter=U").stdout.trim();
    // the generated indexes (docs/QUALITY_RULES.md, docs/CENSUS.md) conflict whenever both sides add a rule: they are
    // rebuilt from docs/rules/ + docs/census/, so regenerate them and go on when they are the only conflicts
    const GEN = new Set(["docs/QUALITY_RULES.md", "docs/CENSUS.md"]);
    const list = un ? un.split("\n").filter(Boolean) : [];
    if (list.length && list.every((f) => GEN.has(f))) {
      step("regenerating the rule / census indexes (the only conflicts)");
      const r = spawnSync(process.execPath, [path.join(ROOT, "tools/docs/rulesIndex.mjs")], { cwd: ROOT, stdio: "inherit" });
      if (r.status === 0 && gitTry("add", ...GEN).status === 0 && gitTry("commit", "--no-edit", "-F", path.resolve(msgFile)).status === 0) un = "";
      else un = list.join("\n");
    }
    if (un || gitTry("rev-parse", "-q", "--verify", "MERGE_HEAD").status === 0) die(un ? `merge conflicts in:\n  ${un.split("\n").join("\n  ")}\nresolve them (tools/audit/gate.d, docs/rules: one file each, so mostly a real conflict), git commit, then: node tools/merge.mjs ${branch} --no-merge` : `git merge failed (exit ${m.status})`);
  }
  if (git("rev-parse", "HEAD") === base) die("the merge made no commit (already merged?)");
  changed = git("diff", "--name-only", "HEAD^1", "HEAD").split("\n").filter(Boolean);
}
console.log(`${changed.length} files changed by the merge`);

// ------------------------------------------------------------------ 3. the worker bundle
const BUNDLE = "viewer/tileWorker.bundle.js";
const hashOf = (s) => /self\.__TILE_CODE_HASH = "([0-9a-f]+)";\s*$/.exec(s)?.[1] ?? "?";
if (!DRY) {
  step("worker bundle (tools/build_worker.mjs, main repo)");
  const before = hashOf(readFileSync(path.join(ROOT, BUNDLE), "utf8"));
  const b = spawnSync(process.execPath, ["tools/build_worker.mjs"], { cwd: ROOT, encoding: "utf8" });
  if (b.status !== 0) die(`the bundle does not build:\n${b.stdout}${b.stderr}`);
  const after = hashOf(readFileSync(path.join(ROOT, BUNDLE), "utf8"));
  if (before === after) { gitTry("checkout", "--", BUNDLE); console.log(`code hash ${after}: unchanged`); }
  else {
    console.log(`code hash ${before} -> ${after}: committing the rebuilt bundle`);
    const f = path.join(mkdtempSync(path.join(tmpdir(), "merge-")), "bundle.txt");
    writeFileSync(f, `Rebuild ${BUNDLE} after merging ${branch} (code hash ${before} -> ${after}; tools/merge.mjs)\n`);
    git("add", BUNDLE);
    const c = gitTry("commit", "-F", f);
    if (c.status !== 0) die(`bundle commit failed:\n${c.stdout}${c.stderr}`);
    changed.push(BUNDLE);
  }
}

// ------------------------------------------------------------------ 4. the gate rows
// auto: mergeGate --changed vs the pre-merge commit (the rows whose traced deps the merge touched, + meta; the memo
// skips a row whose deps are as at its last PASS here); full: every row, memo off (--full); a,b,c: those rows
const rows = await loadRows(ROOT);
const NAMES = ROWS === "auto" || ROWS === "full" ? [] : ROWS.split(",").map((s) => s.trim()).filter(Boolean);
const preMerge = DRY ? git("merge-base", INTO, branch) : NO_MERGE ? preMergeFixed : base;
step(`gate base: ${preMerge.slice(0, 8)} (${git("log", "-1", "--format=%s", preMerge).slice(0, 70)})`);
const gateArgs = ROWS === "full" ? ["--full"] : ROWS === "auto" ? ["--changed", "--base", preMerge] : NAMES;
if (DRY && ROWS === "auto") {
  // the gate's own pick, on the dry run's changed files
  const status = Object.fromEntries(git("diff", "--name-status", "--no-renames", `${INTO}...${branch}`).split("\n").filter(Boolean).map((l) => { const [s, p] = l.split("\t"); return [p, s[0]]; }));
  const { run, skip } = selectRows(rows, { changes: changed.map((p) => ({ path: p, status: status[p] || "M" })) });
  step(`gate rows (auto): ${run.length} of ${rows.length}: ${run.map((r) => r.name).join(" ")}`);
  for (const s of skip) console.log(`  skip ${s.row.name.padEnd(16)} ${s.why}`);
} else step(`gate rows (${ROWS}): node tools/audit/mergeGate.mjs ${gateArgs.join(" ")}`);
if (DRY) { console.log("\n(dry run: nothing merged, built, run, pushed or removed)"); process.exit(0); }
const t0 = Date.now();
const g = spawnSync(process.execPath, ["tools/audit/mergeGate.mjs", ...gateArgs], { cwd: ROOT, stdio: "inherit" });
console.log(`(gate ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
if (g.status !== 0) die(`the gate FAILED (exit ${g.status}): nothing pushed. The merge is a local commit: fix on ${branch} and merge again, or undo it yourself (git reset --hard ORIG_HEAD)`);

// ------------------------------------------------------------------ 5. push
if (!flag("--no-push")) {
  step(`git push origin ${INTO}`);
  const p = gitTry("push", "origin", INTO);
  process.stdout.write(p.stdout + p.stderr);
  if (p.status !== 0) die("push failed (never --force: pull / merge the remote first)");
}

// ------------------------------------------------------------------ 6. the branch's worktree
if (flag("--keep-worktree")) process.exit(0);
step("worktree cleanup");
const wts = git("worktree", "list", "--porcelain").split(/\r?\n\r?\n/).map((b) => ({ path: /^worktree (.+)$/m.exec(b)?.[1], branch: /^branch refs\/heads\/(.+)$/m.exec(b)?.[1] }));
const wt = wts.find((w) => w.branch === branch && w.path && path.resolve(w.path) !== path.resolve(ROOT));
if (!wt) { console.log(`no worktree holds ${branch}: nothing to remove`); process.exit(0); }
const wtp = path.resolve(wt.path);
if (!(/[\\/]uccle-jobs[\\/]/i.test(wtp) || /^uccle-/i.test(path.basename(wtp)))) { console.log(`${wtp} is not a job worktree (Downloads/uccle-jobs/... or uccle-*): left alone`); process.exit(0); }
const wdirty = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: wtp, encoding: "utf8" }).stdout.trim();
if (wdirty) die(`${wtp} has uncommitted changes to tracked files: kept\n${wdirty}`);
const countFiles = (d) => { let n = 0; const w = (x) => { for (const e of readdirSync(x, { withFileTypes: true })) { if (e.isDirectory()) w(path.join(x, e.name)); else n++; } }; if (existsSync(d)) w(d); return n; };
const RAW = path.join(ROOT, "data/raw"), raw0 = countFiles(RAW);
// every junction / symlink inside the worktree (not descending into them), removed as a link only
const links = [];
const scan = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.name === ".git") continue; let st; try { st = lstatSync(p); } catch { continue; } if (st.isSymbolicLink()) links.push(p); else if (st.isDirectory()) scan(p); } };
scan(wtp);
for (const l of links) {
  const r = process.platform === "win32" ? spawnSync("cmd", ["/c", "rmdir", l], { encoding: "utf8" }) : spawnSync("rm", [l], { encoding: "utf8" });
  console.log(`unlinked ${path.relative(wtp, l)}${r.status ? ` (FAILED: ${r.stderr.trim()})` : ""}`);
  if (r.status) die(`could not unlink ${l}: worktree kept`);
}
const raw1 = countFiles(RAW);
if (raw1 !== raw0) die(`data/raw had ${raw0} files, now ${raw1}: STOP, look before anything else`);
const rm = gitTry("worktree", "remove", "--force", wtp);   // (--force: its untracked results; tracked changes were checked above)
process.stdout.write(rm.stdout + rm.stderr);
const raw2 = countFiles(RAW);
console.log(rm.status === 0 ? `removed ${wtp}; data/raw ${raw0} -> ${raw2} files` : `git worktree remove failed: remove ${wtp} by hand`);
if (raw2 !== raw0) die(`data/raw had ${raw0} files, now ${raw2}`);
console.log(`\nmerged ${branch} into ${INTO}${flag("--no-push") ? " (not pushed)" : ", pushed"}; the branch is kept`);
