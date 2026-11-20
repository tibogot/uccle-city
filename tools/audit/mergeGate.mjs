// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. One file per row: tools/audit/gate.d/<name>.mjs (export default { name, script, node?, args,
// guards, deps?, timing?, timeout? (s, default 600), meta? }); browser-side gates (need the viewer running) are
// tools/audit/gate.d/browser/<name>.mjs ({ name, text }): the merger runs them on a browser turn. docs/WORKFLOW.md.
// node tools/audit/mergeGate.mjs [name ...]   (only those)      --list: the row names, one a line
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, symlinkSync } from "node:fs";
import { loadRows, loadBrowser } from "../gate/rowFiles.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = await loadRows(ROOT);
const BROWSER = (await loadBrowser(ROOT)).map((b) => b.text);
if (process.argv.includes("--list")) { for (const c of CHECKS) console.log(c.name); process.exit(0); }

// A git worktree lacks the main checkout's untracked inputs (node_modules, the raw data): link them in (junctions),
// so a gate in a worktree tests the code, not the folder. Both paths are git-ignored.
const LOCAL_ONLY = ["tools/worker/node_modules", "data/raw"];
try {
  const main = path.dirname(spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim());
  if (main && path.resolve(main) !== path.resolve(ROOT)) {
    for (const p of LOCAL_ONLY) {
      const here = path.join(ROOT, p), there = path.join(main, p);
      if (!existsSync(here) && existsSync(there)) { symlinkSync(there, here, "junction"); console.log(`linked ${p} -> ${there}`); }
    }
  }
} catch (e) { console.log(`(worktree links skipped: ${e.message})`); }

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const unknown = only.filter((n) => !CHECKS.some((c) => c.name === n));
if (unknown.length) { console.log(`unknown gate row(s): ${unknown.join(", ")} (node tools/audit/mergeGate.mjs --list)`); process.exit(2); }
const rows = [];
let failed = 0;
for (const c of CHECKS) {
  if (only.length && !only.includes(c.name)) continue;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [...c.node, path.join(ROOT, c.script), ...c.args], { cwd: ROOT, encoding: "utf8", timeout: c.timeout * 1000, maxBuffer: 64 << 20 });
  const ok = r.status === 0;
  if (!ok) failed++;
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n");
  const fails = out.filter((l) => /FAIL/.test(l)).slice(0, 3).map((l) => l.trim().slice(0, 120));
  const why = r.error?.code === "ETIMEDOUT" ? `timeout after ${c.timeout} s` : r.error ? r.error.message : `exit ${r.status}`;
  rows.push([c.name, ok ? "PASS" : "FAIL", ((Date.now() - t0) / 1000).toFixed(1) + " s", ok ? c.guards : [fails.join(" / "), r.error ? why : ""].filter(Boolean).join(" / ") || why]);
}
console.log("| check | result | time | guards / failures |\n|---|---|---|---|");
for (const r of rows) console.log("| " + r.join(" | ") + " |");
console.log(`\nbrowser gates (run on a browser turn):\n  ${BROWSER.join("\n  ")}`);
console.log(failed ? `\n${failed} gate check(s) FAILED` : "\nall gate checks pass");
process.exitCode = failed ? 1 : 0;
