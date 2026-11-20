// BRANCH CONVERSION to the one-file-per-row / per-rule formats (claude/speed1, docs/SPEED_PLAN.md "Branch conversion").
// A branch made before claude/speed1 edits the old single files: tools/audit/mergeGate.mjs CHECKS / BROWSER,
// docs/QUALITY_RULES.md, docs/CENSUS.md (and multi-line viewer/features.js rows). On the branch, in its worktree:
//   git merge claude/foundation          (conflicts in those files are expected: do not resolve them by hand)
//   node tools/gate/convertBranch.mjs    [--foundation claude/foundation] [--dry-run]
//   (resolve what it lists as left, then) node tools/audit/mergeGate.mjs meta && git commit
// What it does, from the branch's own changes (its tip vs the fork point with foundation):
//   1. every CHECKS row the branch added or changed -> tools/audit/gate.d/<name>.mjs (a changed row keeps foundation's
//      `meta`); a row it removed -> its file deleted; BROWSER strings the same -> gate.d/browser/<name>.mjs;
//      tools/audit/mergeGate.mjs = foundation's (the loader);
//   2. every rule the branch added or changed -> docs/rules/<slug>.md (a changed numbered rule keeps its file; a NEW rule
//      gets a slug and NO number: it lists where the branch says "rule N" so they can be renamed); census changes ->
//      appended to the class file they belong to inside a convertBranch marker (merge the text, delete the marker: the
//      meta row fails while one is left); both indexes regenerated;
//   3. viewer/features.js: conflict hunks resolved as a union (both sides' lines), multi-line rows joined onto one line.
// It stages what it writes (git add) and lists every file still in conflict.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import path from "node:path";
import { ROOT, parseLegacyGate, rowSource, browserSource, browserName, loadRows, loadBrowser } from "./rowFiles.mjs";
import { parseLegacyRules, loadRules, ruleSource, slugOf, rulesIndex, censusIndex } from "../docs/rulesIndex.mjs";

const argv = process.argv.slice(2);
const FOUND = argv.includes("--foundation") ? argv[argv.indexOf("--foundation") + 1] : "claude/foundation";
const DRY = argv.includes("--dry-run");
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).replace(/\r\n/g, "\n");
const gitOk = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }).status === 0;
const show = (rev, p) => { try { return git("show", `${rev}:${p}`); } catch { return null; } };
const wrote = [], removed = [], notes = [];
const put = (rel, text) => { if (!DRY) writeFileSync(path.join(ROOT, rel), text); wrote.push(rel); };
const del = (rel) => { if (!DRY && existsSync(path.join(ROOT, rel))) unlinkSync(path.join(ROOT, rel)); removed.push(rel); };

// the branch's tip: HEAD during a merge (MERGE_HEAD = foundation), HEAD^1 after the merge commit, else HEAD
const merging = gitOk("rev-parse", "--verify", "--quiet", "MERGE_HEAD");
const isMerge = !merging && git("log", "-1", "--format=%P").trim().includes(" ");
const tip = merging || !isMerge ? git("rev-parse", "HEAD").trim() : git("rev-parse", "HEAD^1").trim();
const base = git("merge-base", tip, FOUND).trim();
console.log(`branch tip ${tip.slice(0, 8)}, fork point with ${FOUND} ${base.slice(0, 8)}${merging ? " (merge in progress)" : isMerge ? " (after the merge commit)" : ""}`);
if (!existsSync(path.join(ROOT, "tools/audit/gate.d/meta.mjs"))) { console.log(`STOP: merge ${FOUND} first (no tools/audit/gate.d here yet)`); process.exit(2); }

// ------------------------------------------------------------------ 1. gate rows
{
  const B = parseLegacyGate(show(base, "tools/audit/mergeGate.mjs") || "") || { checks: [], browser: [] };
  const T = parseLegacyGate(show(tip, "tools/audit/mergeGate.mjs") || "");
  if (!T) console.log("1. the branch's mergeGate.mjs has no CHECKS array: nothing to convert");
  else {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const Frows = await loadRows(ROOT), have = new Set(Frows.map((r) => r.name));
    const FIELDS = ["script", "node", "args", "guards"], norm = (r, k) => JSON.stringify(k === "node" || k === "args" ? r?.[k] ?? [] : r?.[k]);
    for (const r of T.checks) {
      const old = B.checks.find((x) => x.name === r.name);
      if (old && same(old, r)) continue;
      const rel = `tools/audit/gate.d/${r.name}.mjs`;
      // three-way per field: base (fork point), the branch, foundation now (its gate.d file)
      const F = Frows.find((x) => x.name === r.name), row = { name: r.name }, both = [];
      for (const k of FIELDS) {
        const b = norm(old, k), t = norm(r, k), fv = norm(F, k);
        const pick = !F || !old ? t : t === b ? fv : fv === b || fv === t ? t : (both.push(k), t);
        if (pick !== undefined && pick !== "undefined") row[k] = JSON.parse(pick);
      }
      if (F && !old) both.push("the whole row (foundation has one of that name)");
      let src = rowSource(row);
      const cur = existsSync(path.join(ROOT, rel)) ? readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n") : "";
      const keep = (k) => { const m = new RegExp(`\\n  ${k}: [^\\n]*`).exec(cur); return m && !new RegExp(`\\n  ${k}: `).test(src) ? m[0] : ""; };
      const meta = /\n  meta: \{[\s\S]*?\n  \},/.exec(cur)?.[0] ?? "";
      const extra = keep("timing") + keep("timeout") + keep("deps") + meta;
      if (extra) src = src.replace(/\n\};\n$/, `${extra}\n};\n`);
      put(rel, src);
      notes.push((both.length ? `CHECK row ${r.name}: the branch AND foundation changed ${both.join(", ")}: the branch's value taken, merge them by hand. ` : "") + (old ? `row ${r.name}: the branch changed it${meta ? " (foundation's meta kept: drop any features.js / main.js / no-light text check the branch's script still does)" : ""}` : `row ${r.name}: new`));
    }
    for (const r of B.checks) if (!T.checks.some((x) => x.name === r.name)) { del(`tools/audit/gate.d/${r.name}.mjs`); notes.push(`row ${r.name}: removed by the branch`); }
    const files = await loadBrowser(ROOT), taken = new Set(files.map((f) => f.name));
    for (const t of B.browser) if (!T.browser.includes(t)) { const f = files.find((x) => x.text === t); if (f) { del(f.file); taken.delete(f.name); notes.push(`browser row ${f.name}: removed / changed by the branch`); } }
    for (const t of T.browser) if (!B.browser.includes(t)) {
      let n = browserName(t), i = 2;
      while (taken.has(n) && files.find((x) => x.name === n)?.text !== t && !removed.includes(`tools/audit/gate.d/browser/${n}.mjs`)) n = `${browserName(t)}-${i++}`;
      taken.add(n);
      put(`tools/audit/gate.d/browser/${n}.mjs`, browserSource({ name: n, text: t }));
      notes.push(`browser row ${n}: from the branch`);
    }
    put("tools/audit/mergeGate.mjs", show(FOUND, "tools/audit/mergeGate.mjs"));
  }
}

// ------------------------------------------------------------------ 2. rules + census
{
  const B = parseLegacyRules(show(base, "docs/QUALITY_RULES.md") || ""), Tsrc = show(tip, "docs/QUALITY_RULES.md") || "";
  const T = /\n\| \d+( \(provisional\))? \| /.test(Tsrc) && !/GENERATED by tools\/docs\/rulesIndex/.test(Tsrc) ? parseLegacyRules(Tsrc) : [];
  const now = loadRules(ROOT), taken = new Set(now.map((r) => r.slug));
  const today = new Date().toISOString().slice(0, 10);
  const changedFiles = git("diff", "--name-only", base, tip).split("\n").filter((f) => f && existsSync(path.join(ROOT, f)) && /\.(m?js|md)$/.test(f));
  for (const r of T) {
    const old = B.find((x) => x.number === r.number);
    if (old && old.rule === r.rule && old.why === r.why && old.check === r.check && old.status === r.status) continue;
    const mine = now.find((x) => x.number === r.number);
    if (old && mine) { put(mine.file, ruleSource({ ...r, number: r.number })); notes.push(`rule ${r.number} (${mine.slug}): changed by the branch`); continue; }
    const slug = slugOf(r.rule, taken); taken.add(slug);
    put(`docs/rules/${slug}.md`, ruleSource({ ...r, number: null, added: today }));
    const refs = changedFiles.filter((f) => new RegExp(`\\brule ${r.number}\\b`).test(readFileSync(path.join(ROOT, f), "utf8")));
    notes.push(`rule ${r.number} of the branch -> docs/rules/${slug}.md (a new rule has no number: rename the slug if you like, and say "rule ${slug}" in: ${refs.join(", ") || "(no file mentions it)"})`);
  }
  // census: the branch's changed lines, by the class they sit under
  const cb = show(base, "docs/CENSUS.md") || "", ct = show(tip, "docs/CENSUS.md") || "";
  if (ct && ct !== cb && !/GENERATED by tools\/docs\/rulesIndex/.test(ct)) {
    const d = spawnSync("git", ["diff", "--unified=0", base, tip, "--", "docs/CENSUS.md"], { cwd: ROOT, encoding: "utf8" }).stdout.replace(/\r\n/g, "\n");
    const T2 = ct.split("\n"), byClass = new Map();
    const classAt = (n) => { for (let i = n; i >= 0; i--) { const l = T2[i] || ""; const m = /^## Class (\w)\b/.exec(l) || /^- \*\*(\w)\b/.exec(l) || /^\*\*Class (\w)\b/.exec(l) || /^\*\*(\w)\d?\b[^*]*:?\*\*/.exec(l) || /^\| (\w)\d?\. /.exec(l) || /^- (\w): /.exec(l); if (m) return m[1].toLowerCase(); } return "_tail"; };
    for (const h of d.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@[^\n]*\n((?:[-+][^\n]*\n?)*)/gm)) {
      const added = h[3].split("\n").filter((l) => l.startsWith("+")).map((l) => l.slice(1));
      const gone = h[3].split("\n").filter((l) => l.startsWith("-")).map((l) => l.slice(1));
      if (!added.length && !gone.length) continue;
      const c = classAt(+h[1] - 1);
      byClass.set(c, [...(byClass.get(c) || []), ...(gone.length ? [`(the branch replaced: ${gone.join(" ").slice(0, 300)}${gone.join(" ").length > 300 ? " ..." : ""})`] : []), ...added]);
    }
    for (const [c, lines] of byClass) {
      const rel = `docs/census/${c}.md`;
      const cur = existsSync(path.join(ROOT, rel)) ? readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n") : `---\nclass: ${c.toUpperCase()}\ntitle: (name it)\n---\n`;
      put(rel, `${cur.trimEnd()}\n\n<!-- convertBranch: from the branch's docs/CENSUS.md: merge into the text above (summary rows go in the frontmatter as row: lines), then delete this block -->\n${lines.join("\n")}\n<!-- /convertBranch -->\n`);
      notes.push(`census ${c}: ${lines.length} lines from the branch in ${rel}: merge them by hand, delete the marker`);
    }
  }
  if (!DRY) { writeFileSync(path.join(ROOT, "docs/QUALITY_RULES.md"), rulesIndex(ROOT)); writeFileSync(path.join(ROOT, "docs/CENSUS.md"), censusIndex(ROOT)); }
  wrote.push("docs/QUALITY_RULES.md", "docs/CENSUS.md");
}

// ------------------------------------------------------------------ 3. features.js
{
  const rel = "viewer/features.js", f = path.join(ROOT, rel);
  let s = readFileSync(f, "utf8");
  const eol = s.includes("\r\n") ? "\r\n" : "\n";
  let L = s.split(/\r?\n/), hunks = 0;
  if (L.some((l) => l.startsWith("<<<<<<< "))) {
    const out = [];
    for (let i = 0; i < L.length; i++) {
      if (!L[i].startsWith("<<<<<<< ")) { out.push(L[i]); continue; }
      hunks++;
      const seen = new Set();
      for (i++; i < L.length && !L[i].startsWith(">>>>>>> "); i++) {
        if (L[i].startsWith("=======") || L[i].startsWith("||||||| ")) { if (L[i].startsWith("||||||| ")) { while (i + 1 < L.length && !L[i + 1].startsWith("=======")) i++; } continue; }
        if (!seen.has(L[i])) { seen.add(L[i]); out.push(L[i]); }
      }
    }
    L = out;
  }
  const a = L.findIndex((l) => l.startsWith("export const FEATURES")), b = L.findIndex((l, i) => i > a && l.startsWith("];"));
  const out = []; let joined = 0;
  for (let i = 0; i < L.length; i++) { const l = L[i]; if (i > a && i < b && /^ {3,}\S/.test(l) && !/^\s*\/\//.test(l)) { out[out.length - 1] = out[out.length - 1].replace(/\s+$/, "") + " " + l.trim(); joined++; } else out.push(l); }
  if (hunks || joined) { put(rel, out.join(eol)); notes.push(`features.js: ${hunks} conflict hunk(s) kept as a union, ${joined} continuation line(s) joined: check it with node tools/audit/mergeGate.mjs meta`); }
}

// ------------------------------------------------------------------ stage + report
if (!DRY) {
  const add = [...new Set(wrote)].filter((r) => existsSync(path.join(ROOT, r)));
  if (add.length) spawnSync("git", ["add", "--", ...add], { cwd: ROOT });
  const rm = removed.filter((r) => gitOk("ls-files", "--error-unmatch", r));
  if (rm.length) spawnSync("git", ["rm", "-q", "--cached", "--", ...rm], { cwd: ROOT });
  for (const r of removed) if (existsSync(path.join(ROOT, r))) unlinkSync(path.join(ROOT, r));
}
console.log(`\n${DRY ? "(dry run) would write" : "wrote + staged"} ${wrote.length} file(s), removed ${removed.length}`);
for (const n of notes) console.log(`  - ${n}`);
const left = spawnSync("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
console.log(left ? `\nstill in conflict (real code: resolve by hand):\n  ${left.split("\n").join("\n  ")}` : "\nno conflict left");
console.log("then: node tools/audit/mergeGate.mjs meta   (and the rows your branch touches), git commit");
