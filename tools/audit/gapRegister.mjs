// GAP REGISTER CHECK (gate row `register`, rule gap-register, docs/STREET_MODEL_PLAN.md 4). The register itself:
//   - data/gaps.json parses; every entry has a stable id `<row>.<check>:<elementId>:<s0-s1>` (no wildcards), a cause
//     from tools/audit/gaps.mjs CAUSES, evidence { tile, at }, a decision and a date; no id twice;
//   - every entry's row is a gate row that judges the register (its args hold --register), so no entry sits in the
//     register that nothing checks. Whether each finding is registered and each entry still found is judged by those
//     rows themselves (markings, streetprops, markings2: a finding not in the register fails, a stale entry fails), on
//     the tiles they ran.
//   - prints the register's size by row and by cause.
//   node tools/audit/gapRegister.mjs [--quiet]
import { loadGaps, validate, CAUSES, GAPS_FILE } from "./gaps.mjs";
import { loadRows } from "../gate/rowFiles.mjs";
import { existsSync } from "node:fs";

const QUIET = process.argv.includes("--quiet");
let bad = 0;
if (!existsSync(GAPS_FILE)) { console.log("FAIL data/gaps.json missing"); process.exit(1); }
let doc;
try { doc = loadGaps(); } catch (e) { console.log(`FAIL data/gaps.json does not parse: ${e.message}`); process.exit(1); }
const probs = validate(doc);
for (const p of probs.slice(0, 30)) console.log(`FAIL ${p}`);
bad += probs.length;
const rows = await loadRows();
const judging = new Set(rows.filter((r) => (r.args || []).includes("--register")).map((r) => r.name));
const byRow = {}, byCause = {};
for (const e of doc.entries || []) {
  const row = String(e.id).split(".")[0];
  byRow[row] = (byRow[row] || 0) + 1; byCause[e.cause] = (byCause[e.cause] || 0) + 1;
}
for (const row of Object.keys(byRow)) if (!judging.has(row)) { console.log(`FAIL ${byRow[row]} entries of "${row}": no gate row named ${row} judges the register (--register)`); bad++; }
console.log(`register: ${(doc.entries || []).length} entries; by row ${JSON.stringify(byRow)}; by cause ${JSON.stringify(byCause)}`);
if (!QUIET) for (const [k, v] of Object.entries(CAUSES)) console.log(`  ${k}: ${v}`);
console.log(bad ? `FAIL register (${bad})` : "ok   register");
process.exit(bad ? 1 : 0);
