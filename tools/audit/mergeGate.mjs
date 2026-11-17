// MERGE GATE (owner rule 2026-11-17): run before every merge. Runs every gate audit (each exits non-zero on a violation
// of its rule, in seconds over all tiles) and prints one table; exit 1 if any gate fails.
//   node tools/audit/mergeGate.mjs
// To add a gate: one line in GATES (a name, the rule it enforces, the command). Keep each under ~30 s.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATES = [
  { name: "shell", rule: "every building's outer shell is closed from the street (no wall wound inward, no open edge)", cmd: ["tools/audit/shellGate.mjs"] },
  { name: "garden z-fight", rule: "no two garden pieces draw a face in one plane over the same area (<= 40 small ones known)", cmd: ["tools/audit/gardenZfight.mjs", "--all", "--max", "40"] },
];
const rows = [];
for (const g of GATES) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, g.cmd.map((c) => (c.endsWith(".mjs") ? join(ROOT, c) : c)), { cwd: ROOT, encoding: "utf8" });
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  rows.push({ gate: g.name, result: r.status === 0 ? "PASS" : "FAIL", seconds: ((Date.now() - t0) / 1000).toFixed(1), rule: g.rule });
}
console.log("\nMERGE GATE");
console.table(rows);
process.exitCode = rows.every((r) => r.result === "PASS") ? 0 : 1;
