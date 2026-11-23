// Which gate rows to run, and why the others are skipped (docs/SPEED_PLAN.md job 5, docs/WORKFLOW.md "Memo and --changed").
//   changed:  only the rows whose deps (tools/gate/deps.mjs: traced, else the static crawl) a changed file touches, + meta;
//             a changed data/ or models/ file that no row's deps name runs every row that has no trace yet
//   memo:     a row whose key (tools/gate/memo.mjs) equals the key of its last PASS is skipped (off with full)
import { spawnSync } from "node:child_process";
import { ROOT } from "./rowFiles.mjs";
import { rowDeps, touches, readTrace } from "./deps.mjs";
import { rowKey, readPass } from "./memo.mjs";

// programs a row may run without losing its memo: git (where the main checkout is), process control
const SEEN_EXEC = new Set(["git", "taskkill", "tasklist"]);
const git = (...a) => { const r = spawnSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${(r.stderr || "").trim()}`); return r.stdout; };

/** [{ path, status }] changed vs a ref: committed + staged + unstaged + untracked (not ignored). base null: vs the
 *  merge base with claude/foundation */
export function gitChanges(base) {
  const ref = base || git("merge-base", "HEAD", "claude/foundation").trim();
  const out = [];
  for (const l of git("diff", "--name-status", "--no-renames", ref).split("\n")) {
    const m = /^([A-Z])\d*\t(.+)$/.exec(l.trim());
    if (m) out.push({ path: m[2].replace(/\\/g, "/"), status: m[1] });
  }
  for (const l of git("ls-files", "--others", "--exclude-standard").split("\n")) if (l.trim()) out.push({ path: l.trim(), status: "A" });
  return { ref, changes: out };
}

/**
 * rows: loadRows() order. Returns { run: [row], skip: [{ row, why }] }.
 * opts: { only: [names], changes: [{path, status}] | null, full: bool }
 */
export function selectRows(rows, { only = [], changes = null, full = false } = {}) {
  const run = [], skip = [], D = new Map();
  const depsOf = (r) => { if (!D.has(r.name)) D.set(r.name, rowDeps(r)); return D.get(r.name); };
  const named = changes ? changes.filter((c) => /^(data|models)\//.test(c.path) && !rows.some((r) => touches(depsOf(r), c.path, c.status))) : [];
  for (const row of rows) {
    if (only.length && !only.includes(row.name)) continue;
    // (coordinator 2026-11-23, rule gate-failed-reruns: a row whose LAST run failed runs again until it passes. A failed
    // run's trace holds only what it read before it failed, so judging "touched?" on it skipped a failing row as "not
    // touched" (claude/indpool: a row FAILed in one --changed run, the next --changed run skipped it))
    const last = readTrace(row.name);
    if (last && last.ok === false) { row.because = `it FAILED at its last run (${String(last.at || "").slice(0, 16).replace("T", " ")}): re-run until it passes`; row.memoWhy = "no memo: last run failed"; run.push(row); continue; }
    if (changes && row.name !== "meta") {
      const deps = depsOf(row);
      const hit = changes.find((c) => touches(deps, c.path, c.status));
      const blind = !deps.traced && named[0];
      if (!hit && !blind) { skip.push({ row, why: `not touched by the ${changes.length} changed file(s) (${deps.traced ? `traced deps, ${deps.files.size} files` : "static crawl"})` }); continue; }
      row.because = hit ? `${hit.path} (${hit.status})` : `${blind.path}: named by no row, and this row has no trace yet`;
    }
    if (!full) {
      const pass = readPass(row.name), trace = readTrace(row.name);
      const blindExec = (trace?.execs || []).filter((x) => !SEEN_EXEC.has(x));
      if (blindExec.length) { row.memoWhy = `no memo: it runs ${blindExec.join(", ")} (what that reads is not traced)`; run.push(row); continue; }
      const key = pass && trace ? rowKey(row, trace) : null;
      if (key && key === pass.key) { skip.push({ row, why: `memo: its ${trace.files.length} traced files, ${trace.dirs.length + trace.rdirs.length} dirs and row file are as at its PASS of ${pass.at.slice(0, 16).replace("T", " ")} (${pass.secs ?? "?"} s)` }); continue; }
      row.memoWhy = !trace ? "no trace yet" : !pass ? "no PASS yet" : "its deps changed since its last PASS";
    }
    run.push(row);
  }
  return { run, skip };
}
