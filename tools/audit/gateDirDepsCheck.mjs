// Gate row `gatedirdeps` (rule gate-dir-deps): the --changed selection sees a new sub-directory under a directory a
// row LISTED. claude/villa1 added models/villa/; heroshell lists models/ (it scans it for placed heroes); the old
// parent-only test (dirname(p) in dirs) missed it, heroshell never ran on that merge.
import { touches, ancestors, CACHE } from "../gate/deps.mjs";
import { selectRows } from "../gate/select.mjs";
import fs from "node:fs";
import path from "node:path";
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
// rule gate-failed-reruns: a row whose last run FAILED is selected even when no change touches its (truncated) trace
{
  const name = "__gatedirdeps_selftest";
  const dir = path.join(CACHE, "deps"); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${name}.json`);
  const trace = { row: name, at: new Date().toISOString(), node: process.version, secs: 1, ok: false, files: ["nothing/read.js"], dirs: [], rdirs: [], writes: [], execs: [], procs: 1, peakMB: 1, peakThreads: 1 };
  try {
    fs.writeFileSync(f, JSON.stringify(trace));
    const row = { name, file: "tools/audit/gate.d/gatedirdeps.mjs", script: "x", args: [] };
    const a = selectRows([row], { changes: [{ path: "unrelated/file.txt", status: "M" }] });
    ok(a.run.length === 1 && /FAILED at its last run/.test(row.because || ""), "a row whose last run FAILED is re-run although no change touches its trace");
    fs.writeFileSync(f, JSON.stringify({ ...trace, ok: true }));
    const row2 = { name, file: "tools/audit/gate.d/gatedirdeps.mjs", script: "x", args: [] };
    const b = selectRows([row2], { changes: [{ path: "unrelated/file.txt", status: "M" }] });
    ok(b.run.length === 0, "the same row after a PASS is skipped as not touched");
  } finally { fs.rmSync(f, { force: true }); }
}
console.log(fails ? `gatedirdeps: ${fails} FAIL` : "gatedirdeps: all pass");
process.exit(fails ? 1 : 0);
