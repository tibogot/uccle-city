// Gate row `gatedirdeps` (rule gate-dir-deps): the --changed selection sees a new sub-directory under a directory a
// row LISTED. claude/villa1 added models/villa/; heroshell lists models/ (it scans it for placed heroes); the old
// parent-only test (dirname(p) in dirs) missed it, heroshell never ran on that merge.
import { touches, ancestors } from "../gate/deps.mjs";
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) fails++; if (!c || !QUIET) console.log(`${c ? "PASS" : "FAIL"} ${m}`); };
const deps = { files: new Set(["tools/audit/heroShell.mjs"]), prefixes: new Set(), dirs: new Set(["models", "models/stjob"]) };
ok(touches(deps, "models/villa/villa.json", "A"), "an added file in a NEW sub-directory of a listed dir touches the row (models/villa/villa.json vs dir models)");
ok(touches(deps, "models/stjob/new.json", "A"), "an added file directly in a listed dir touches the row");
ok(touches(deps, "models/villa/villa.json", "D"), "a deleted one too");
ok(!touches(deps, "models/stjob/stjob.glb", "M"), "a MODIFIED file in a listed (not read) dir does not");
ok(!touches(deps, "data/x/y.json", "A"), "an added file outside every listed dir does not");
ok(touches(deps, "tools/audit/heroShell.mjs", "M"), "a read file modified does");
ok(JSON.stringify(ancestors("a/b/c/d.json")) === JSON.stringify(["a/b/c", "a/b", "a"]), "ancestors of a/b/c/d.json = a/b/c, a/b, a");
console.log(fails ? `gatedirdeps: ${fails} FAIL` : "gatedirdeps: all pass");
process.exit(fails ? 1 : 0);
