// PERF HARNESS GATE (claude/perf5, rule docs/rules/perf-fresh-tab.md): every timed run in a FRESH tab, and the harnesses
// say whether theirs was.  node tools/audit/perfHarnessCheck.mjs [--quiet]      exit 1 on a failure
// Checks: debug/tabLoads.js counts page loads per tab in sessionStorage (simulated: a reload in the same tab counts up, a
// new tab starts at 1, no storage = 1); debug/gamePerf.js / playTime.js / perf5Run.js import it, report tabLoads /
// freshTab, and gamePerf's `valid` needs a fresh tab; their headers name the rule.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
// ---- the counter, simulated (a tab = one sessionStorage; a page load = a fresh module + window)
const url = pathToFileURL(path.join(ROOT, "debug/tabLoads.js")).href;
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const load = async (ss, i) => { globalThis.window = {}; globalThis.sessionStorage = ss; const warn = console.warn; console.warn = () => {}; try { return (await import(`${url}?load=${i}`)).tabInfo(); } finally { console.warn = warn; } };
const tab = store();
const a = await load(tab, 1), b = await load(tab, 2), c = await load(tab, 3), fresh = await load(store(), 4);
ok(a.tabLoads === 1 && a.freshTab, "the first page load in a tab is fresh (tabLoads 1)");
ok(b.tabLoads === 2 && !b.freshTab && c.tabLoads === 3, "reloads in the same tab count up and are not fresh");
ok(fresh.tabLoads === 1 && fresh.freshTab, "a new tab starts at 1");
globalThis.sessionStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
ok((await load(globalThis.sessionStorage, 5)).tabLoads === 1, "no storage: counted as 1 (never blocks a run)");
// ---- the harnesses
for (const f of ["debug/gamePerf.js", "debug/playTime.js", "debug/perf5Run.js"]) {
  const s = src(f);
  ok(/from "\.\/tabLoads\.js"/.test(s) && /tabInfo\(\)/.test(s), `${f} imports tabLoads.js and reports tabInfo()`);
}
const gp = src("debug/gamePerf.js");
ok(/valid: !hidden && tabInfo\(\)\.freshTab/.test(gp), "gamePerf: a report is valid only on a fresh tab");
ok(/FRESH TAB/.test(gp) && /perf-fresh-tab/.test(gp), "gamePerf's header names the rule (perf-fresh-tab)");
ok(/perf-fresh-tab/.test(src("docs/perf/PREFLIGHT.md")), "docs/perf/PREFLIGHT.md tells the fresh-tab step");
if (!QUIET || fails) console.log(fails ? `${fails} FAIL` : "perfharness: all ok");
process.exit(fails ? 1 : 0);
