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
