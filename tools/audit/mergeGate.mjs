<<<<<<< HEAD
#!/usr/bin/env node
// THE MERGE GATE: one script running every gate check before a branch is merged (owner's rule 2026-11-17: each fixed
// defect leaves an automated check behind). node tools/audit/mergeGate.mjs  -> exit 1 when any check fails.
// Add a check: one entry in CHECKS (a node script whose exit code is its verdict; keep it fast and offline).
// Browser-side gates (need the viewer running) are listed in BROWSER for the merger to run on a browser turn.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKS = [
  { name: "motion vectors + upscale guarantees", script: join(HERE, "motionAudit.mjs"), from: "claude/sharp" },
];
const BROWSER = [
  "debug/sharpCheck.js  motionCoverage(): every mesh that moved over 30 frames has a motion source (claude/sharp)",
  "debug/sharpCheck.js  stability(): frame-to-frame luma noise + Laplacian sharpness while parked / driving (claude/sharp)",
];

let bad = 0;
for (const c of CHECKS) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [c.script], { encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) bad++;
  const last = (r.stdout || "").trim().split("\n").pop();
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  (${Date.now() - t0} ms)  ${last}`);
  if (!ok) console.log((r.stdout || "").split("\n").filter((l) => l.startsWith("FAIL")).join("\n") + (r.stderr || ""));
}
console.log(`\nbrowser gates (run on a browser turn):\n  ${BROWSER.join("\n  ")}`);
console.log(`\nmergeGate: ${CHECKS.length - bad} / ${CHECKS.length} pass`);
process.exitCode = bad ? 1 : 0;
=======
// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. To add one: one line in CHECKS (name, script, args, what it guards). Keep it simple.
// node tools/audit/mergeGate.mjs [name ...]   (only those)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = [
  { name: "carctl", script: "tools/carctlTest.mjs", args: [], guards: "car handling targets (radius, response, slip, kerb, hill, braking), camera jitter, trams / trains solid (docs/CARCTL.md)" },
];

const only = process.argv.slice(2);
const rows = [];
let failed = 0;
for (const c of CHECKS) {
  if (only.length && !only.includes(c.name)) continue;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, c.script), ...c.args], { cwd: ROOT, encoding: "utf8", timeout: 10 * 60 * 1000 });
  const ok = r.status === 0;
  if (!ok) failed++;
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n");
  const fails = out.filter((l) => /FAIL/.test(l)).slice(0, 3).map((l) => l.trim().slice(0, 120));
  rows.push([c.name, ok ? "PASS" : "FAIL", ((Date.now() - t0) / 1000).toFixed(1) + " s", ok ? c.guards : fails.join(" / ") || `exit ${r.status}`]);
}
console.log("| check | result | time | guards / failures |\n|---|---|---|---|");
for (const r of rows) console.log("| " + r.join(" | ") + " |");
console.log(failed ? `\n${failed} gate check(s) FAILED` : "\nall gate checks pass");
process.exitCode = failed ? 1 : 0;
>>>>>>> claude/foundation
