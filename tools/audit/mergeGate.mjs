// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. To add one: one line in CHECKS (name, script, args, what it guards). Keep it simple.
// Browser-side gates (need the viewer running) go in BROWSER: the merger runs them on a browser turn.
// node tools/audit/mergeGate.mjs [name ...]   (only those)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = [
  { name: "carctl", script: "tools/carctlTest.mjs", args: [], guards: "car handling targets (radius, response, slip, kerb, hill, braking), camera jitter, trams / trains solid (docs/CARCTL.md)" },
  { name: "motion", script: "tools/audit/motionAudit.mjs", args: [], guards: "motion vectors on every mover + upscale guarantees (claude/sharp)" },
  { name: "shell", script: "tools/audit/shellGate.mjs", args: [], guards: "every building's outer shell closed from the street: no wall wound inward, no open edge (claude/holes)" },
  { name: "gardenzfight", script: "tools/audit/gardenZfight.mjs", args: ["--all", "--max", "40"], guards: "no two garden pieces draw a face in one plane over the same area, <= 40 small known (claude/holes)" },
];
const BROWSER = [
  "VISUAL TOUR (docs/TOUR.md): debug/tour.html on the branch vs the claude/foundation baseline, node tools/tour/compare.mjs; look at every flagged view (claude/tour)",
  "debug/sharpCheck.js  motionCoverage(): every mesh that moved over 30 frames has a motion source (claude/sharp)",
  "debug/sharpCheck.js  stability(): frame-to-frame luma noise + Laplacian sharpness while parked / driving (claude/sharp)",
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
console.log(`\nbrowser gates (run on a browser turn):\n  ${BROWSER.join("\n  ")}`);
console.log(failed ? `\n${failed} gate check(s) FAILED` : "\nall gate checks pass");
process.exitCode = failed ? 1 : 0;
