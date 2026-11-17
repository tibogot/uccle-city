// THE MERGE GATE: one script running every automated check a branch must pass before it is merged (owner's rule
// 2026-11-17: a fix is not done without an automated check that keeps it fixed). Each gate is a node command that exits
// non-zero on failure; this runs them in order and exits 1 when any failed.
//
//   node tools/audit/mergeGate.mjs            every gate (full: all tiles where a gate has a tile list)
//   node tools/audit/mergeGate.mjs --quick    the quick variant of each gate (a few sample tiles)
//   node tools/audit/mergeGate.mjs --only trafpark,trafparksim
//
// ADDING A GATE: push { id, what, full: [args...], quick: [args...] } to GATES (args after `node`, run from the repo
// root). Keep the quick variant under ~1 min.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REG = ["--import", "./tools/road_audit/register.mjs"];
const SAMPLE = ["I6", "E4", "J5", "G5", "H6"];

export const GATES = [
  { id: "trafpark", what: "no parked car's box within a traffic car's half width (0.9 m) of any driven path (lanes + junction connectors, the posed body on bends)",
    full: [...REG, "tools/audit/trafParkAudit.mjs", "--quiet", "--max", "0", "--all"], quick: [...REG, "tools/audit/trafParkAudit.mjs", "--max", "0", ...SAMPLE] },
  { id: "trafparksim", what: "the running traffic sim: no traffic car body into a parked car (static, 40 shoved, pull over)",
    full: [...REG, "tools/trafParkSimTest.mjs", "--tile", "I6", "--secs", "240"], quick: [...REG, "tools/trafParkSimTest.mjs", "--tile", "I6", "--secs", "60"] },
];

const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick");
const oi = argv.indexOf("--only"), ONLY = oi >= 0 ? new Set(argv[oi + 1].split(",")) : null;
const results = [];
for (const g of GATES) {
  if (ONLY && !ONLY.has(g.id)) continue;
  const args = QUICK ? g.quick : g.full, t0 = Date.now();
  console.log(`\n=== gate ${g.id}: ${g.what}\n    node ${args.join(" ")}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 1 << 26 });
  const tail = `${r.stdout || ""}${r.stderr || ""}`.trim().split("\n").slice(-4).join("\n    ");
  console.log(`    ${tail}`);
  const ok = r.status === 0;
  results.push({ id: g.id, ok, s: ((Date.now() - t0) / 1000).toFixed(0) });
  console.log(`    -> ${ok ? "PASS" : "FAIL"} (${results.at(-1).s} s)`);
}
console.log(`\nmerge gate${QUICK ? " (quick)" : ""}: ${results.map((r) => `${r.id} ${r.ok ? "PASS" : "FAIL"}`).join(", ")}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
