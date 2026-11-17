// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. To add one: one line in CHECKS (name, script, args, what it guards). Keep it simple.
// node tools/audit/mergeGate.mjs [name ...]   (only those)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = [
  { name: "carctl", script: "tools/carctlTest.mjs", args: [], guards: "car handling targets (radius, response, slip, kerb, hill, braking), camera jitter, trams / trains solid (docs/CARCTL.md)" },
  { name: "bridges", script: "tools/audit/bridgeAudit.mjs", args: ["--quiet"], guards: "every road-rail crossing resolves to a built structure: road bridges' decks cover their UrbIS polygon, no slab in a cutting, no open cutting under a road, roads under the line under a rail bridge, catenary under the decks (docs/VIVIER.md)" },
  { name: "deckjoins", script: "tools/audit/deckJoins.mjs", args: [], guards: "measured (plan) bridge decks meet the streets / ground on every edge: joined, skirted or railed, no street over the deck at a joint (docs/VIVIER.md)" },
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
