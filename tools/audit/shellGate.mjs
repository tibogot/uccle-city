// SHELL GATE (holes 2026-11-17, owner rule: every fix ships with an automated check). Runs tools/audit/wallAudit.mjs on
// every tile, in parallel child processes (one per CPU, up to 12: ~10 s on the 16-thread laptop), merges the counts and
// FAILS (exit 1) when a building's outer shell is open from the street:
//   inwardRepair  > 0        a wall the repair made (viewer/wallRepair.js rebuilt strips / clipped remains) wound into
//                            its footprint: the FrontSide wall material culls it from the street (the 1,796 hollow fronts
//                            of 2026-11-16..17)
//   after         > AFTER    outer edges still open after the repair (uncovered, no party wall, and what the street sees
//                            through them is the inside of the solid): 4 known on 2026-11-17 (docs/HOLES.md)
//   inwardM2      > INWARD   m2 of UrbIS wall triangles on outer edges wound inward (ring slivers the repair cannot
//                            judge): 15 m2 on 2026-11-17
// Prints one table row per check. node tools/audit/shellGate.mjs [--json FILE] [--repair OLD_wallRepair.js]
import { spawn } from "node:child_process";
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, cpus } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIMITS = { inwardRepair: 0, after: 5, inwardM2: 25 };
const ji = process.argv.indexOf("--json"), JSON_OUT = ji >= 0 ? process.argv[ji + 1] : null;
const ri = process.argv.indexOf("--repair"), PASS = ri >= 0 ? ["--repair", process.argv[ri + 1]] : [];   // (the gate's own test: --repair <the old wallRepair.js> must FAIL)
const tiles = readdirSync(join(ROOT, "data/tiles")).filter((t) => existsSync(join(ROOT, "data/tiles", t, "buildings.bin")));
const N = Math.max(1, Math.min(12, cpus().length - 2)), tmp = mkdtempSync(join(tmpdir(), "shellgate-"));
const chunks = Array.from({ length: N }, () => []);
tiles.forEach((t, i) => chunks[i % N].push(t));
const t0 = Date.now();
const runs = chunks.filter((c) => c.length).map((c, i) => new Promise((ok, ko) => {
  const out = join(tmp, `part${i}.json`);
  const p = spawn(process.execPath, [join(ROOT, "tools/audit/wallAudit.mjs"), "--out", out, ...PASS, ...c], { stdio: ["ignore", "ignore", "inherit"] });
  p.on("exit", (code) => code === 0 ? ok(JSON.parse(readFileSync(out, "utf8"))) : ko(new Error(`wallAudit exited ${code} on ${c.join(" ")}`)));
}));
const parts = await Promise.all(runs);
rmSync(tmp, { recursive: true, force: true });
const sum = { buildings: 0, edges: 0, partial: 0, recess: 0, roofOnly: 0, after: 0, inwardUrbis: 0, inwardRepair: 0, inwardM2: 0 };
const lists = { afterList: [], worstInward: [] }, tilesOut = {};
for (const p of parts) {
  for (const k of Object.keys(sum)) sum[k] += p.summary[k] || 0;
  for (const k of Object.keys(lists)) lists[k].push(...(p.summary[k] || []));
  Object.assign(tilesOut, p.tiles);
}
lists.afterList.sort((a, b) => b.hole - a.hole); lists.worstInward.sort((a, b) => b.m2 - a.m2);
const rows = Object.entries(LIMITS).map(([k, lim]) => ({ check: k, value: sum[k], limit: lim, ok: sum[k] <= lim }));
console.log(`shell gate: ${tiles.length} tiles, ${sum.buildings} buildings, ${sum.edges} outer edges, ${((Date.now() - t0) / 1000).toFixed(1)} s (${N} processes)`);
console.log(`  (info: ${sum.partial} edges rebuilt by the repair, ${sum.recess} recesses left open on purpose, ${sum.roofOnly} roof-only solids)`);
for (const r of rows) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.check.padEnd(13)} ${String(r.value).padStart(6)}  (limit ${r.limit})`);
if (!rows.every((r) => r.ok)) {
  if (sum.after > LIMITS.after) console.log("  open edges:", JSON.stringify(lists.afterList.slice(0, 10)));
  if (sum.inwardM2 > LIMITS.inwardM2 || sum.inwardRepair) console.log("  inward:", JSON.stringify(lists.worstInward.slice(0, 10)));
}
if (JSON_OUT) writeFileSync(join(ROOT, JSON_OUT), JSON.stringify({ summary: sum, rows, ...lists, tiles: tilesOut }, null, 1));
process.exitCode = rows.every((r) => r.ok) ? 0 : 1;
