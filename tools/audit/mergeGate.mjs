// MERGE GATE (owner rule 2026-11-17): run before every merge. Runs every gate audit (each exits non-zero on a violation
// of its rule) and prints one table; exit 1 if any gate fails. Then prints the MANUAL browser steps, which a node
// script cannot do (they need the coordinator's one Chrome tab): they are part of the gate all the same.
//   node tools/audit/mergeGate.mjs
// To add a gate: one line in GATES (a name, the rule it enforces, the command). Keep each under ~30 s.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATES = [
  // (automatic node gates: one line each)
];
// MANUAL browser steps (documented, not run here)
const MANUAL = [
  { name: "visual tour", rule: "~20 fixed views over Uccle match the foundation baseline (no hollow rows, missing layers, wrong looks)",
    how: "docs/TOUR.md: node tools/tour/serve.mjs --root <merge result>; open http://localhost:8837/debug/tour.html?run=<branch>; " +
      "node tools/tour/compare.mjs foundation <branch>; open every FLAG image (expected changes: say why in the merge message, refresh the baseline)" },
];
const rows = [];
for (const g of GATES) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, g.cmd.map((c) => (c.endsWith(".mjs") ? join(ROOT, c) : c)), { cwd: ROOT, encoding: "utf8" });
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  rows.push({ gate: g.name, result: r.status === 0 ? "PASS" : "FAIL", seconds: ((Date.now() - t0) / 1000).toFixed(1), rule: g.rule });
}
console.log("\nMERGE GATE");
if (rows.length) console.table(rows);
console.log("\nMANUAL BROWSER STEPS (required before the merge, not run by this script):");
for (const m of MANUAL) console.log(`- ${m.name}: ${m.rule}\n    ${m.how}`);
process.exitCode = rows.every((r) => r.result === "PASS") ? 0 : 1;
