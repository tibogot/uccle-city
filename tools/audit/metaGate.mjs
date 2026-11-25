// META GATE (claude/speed1, docs/SPEED_PLAN.md job 3, docs/WORKFLOW.md): the cheap text checks every feature row used to do
// itself on viewer/features.js / viewer/main.js, in ONE row, so a change to those two files no longer runs 14 rows.
//   node tools/audit/metaGate.mjs [--quiet]                                exit 1 on a failure
// WHY: 14 rows read features.js / main.js as text (a switch row exists, main.js wires the feature, no light added, no
// DynamicDrawUsage), so every merge that touched either file ran all of them (~3-4 min). And a branch that did not boot
// (a comment swallowed an export) passed the gate: nothing loaded every module.
// What it checks:
//   1. every gate row's `meta` (tools/audit/gate.d/<name>.mjs):
//        features: [key | { key, ...fields }]  a viewer/features.js row with that key (and those fields; options: [urlValue, ...]
//                                               = those select values present)
//        clean:    [file | dir/]               no DynamicDrawUsage, no light made (rules 7, 8), comments not counted
//        text:     [{ file, what, test(src, { rd, files }) }]  a wiring check on a file's text (main.js mostly); test returns
//                                               true, or { ok, why }; rd(path) reads another file, files(dir) lists a folder's .js
//   2. viewer/features.js: it imports, every row on ONE line (git merges it with merge=union, .gitattributes), no key twice
//   3. every viewer/, debug/ and tools/ .js / .mjs file parses as an ES module and its static imports link (esbuild bundles
//      them all, bare packages external): a missing export or an unclosed comment fails here, not on the browser turn.
//   4. docs/QUALITY_RULES.md and docs/CENSUS.md are what tools/docs/rulesIndex.mjs makes from docs/rules/, docs/census/
//   6. no viewer/ debug/ tools/ module calls a name it never declares, imports or has as a global (tools/audit/undefRefs.mjs;
//      claude/tramfix, rule no-undefined-refs: a moved helper left `finish(t)` in tramline.js, which parsed and linked)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { loadRows, ROOT } from "../gate/rowFiles.mjs";

const QUIET = process.argv.includes("--quiet");
let fails = 0, oks = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else { oks++; if (!QUIET) console.log("ok  ", m); } return c; };
const rd = (p) => readFileSync(path.join(ROOT, p), "utf8");

// ------------------------------------------------------------------ helpers
/** the source without comments (a // only after whitespace / line start or ; , ) { so URLs in strings survive) */
export const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[\s;,){}])\/\/[^\n]*/g, "$1");
export const DYNAMIC = /DynamicDrawUsage|setUsage\([^)]*Dynamic/;
export const LIGHT = /new\s+(THREE\.)?\w*Light\b|\b(PointLight|SpotLight|DirectionalLight|RectAreaLight|HemisphereLight|AmbientLight|LightProbe)\s*\(/;
const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const n of readdirSync(d)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = path.join(d, n), st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (/\.m?js$/.test(n)) out.push(p);
  }
  return out;
};
const filesOf = (p) => (p.endsWith("/") ? walk(path.join(ROOT, p)).map((f) => path.relative(ROOT, f).replace(/\\/g, "/")) : [p]);
const fieldsMatch = (row, want) => Object.entries(want).every(([k, v]) => {
  if (k === "key") return true;
  if (k === "options") return Array.isArray(row.options) && v.every((o) => row.options.some(([u]) => u === o));
  return row[k] === v;
});

// ------------------------------------------------------------------ 2. features.js
// keys that are knowingly two rows (one URL key read by two features), with the count allowed
const SHARED_KEYS = { carmerge: 2 };   // ?carmerge=old: the parked-car fleet (carFleet.js, ab) AND the police kit merge (police/kitMerge.js, perf)
const featSrc = rd("viewer/features.js");
let FEATURES = [];
try { ({ FEATURES } = await import(pathToFileURL(path.join(ROOT, "viewer/features.js")).href)); ok(Array.isArray(FEATURES) && FEATURES.length > 0, `viewer/features.js imports (${FEATURES.length} rows)`); }
catch (e) { ok(false, `viewer/features.js does not import: ${e.message}`); }
{
  const L = featSrc.split(/\r?\n/);
  const a = L.findIndex((l) => l.startsWith("export const FEATURES = [")), b = L.findIndex((l, i) => i > a && l.startsWith("];"));
  const bad = [], keys = new Map();
  let lines = 0;
  for (let i = a + 1; i < b; i++) {
    const l = L[i];
    if (/^\s*(\/\/.*)?$/.test(l)) continue;
    const m = /^  (on|opt|old|sel|num|txt)\("([^"]+)",.*\),\s*(\/\/.*)?$/.exec(l);
    if (!m) { bad.push(i + 1); continue; }
    keys.set(m[2], [...(keys.get(m[2]) || []), i + 1]);
    lines++;
  }
  ok(a > 0 && b > a && !bad.length, `viewer/features.js: every FEATURES row on one line ("  kind(\\"key\\", ... ),") ${bad.length ? `: lines ${bad.slice(0, 8).join(", ")}` : ""}`);
  const dup = [...keys].filter(([k, v]) => v.length > (SHARED_KEYS[k] || 1));
  ok(!dup.length, `viewer/features.js: no key twice${dup.length ? `: ${dup.map(([k, v]) => `${k} (lines ${v.join(", ")})`).join("; ")}` : ""}`);
  ok(lines === FEATURES.length, `viewer/features.js: ${lines} row lines = ${FEATURES.length} rows`);
}

// ------------------------------------------------------------------ 1. every row's meta
const rows = await loadRows(ROOT);
let nMeta = 0;
for (const r of rows) {
  const m = r.meta;
  if (!m) continue;
  nMeta++;
  for (const want of m.features || []) {
    const w = typeof want === "string" ? { key: want } : want;
    const f = FEATURES.find((x) => x.key === w.key);
    ok(f && fieldsMatch(f, w), `${r.name}: a features.js row for ?${w.key}${Object.keys(w).length > 1 ? ` (${JSON.stringify({ ...w, key: undefined })})` : ""}`);
  }
  if (m.clean?.length) {
    const bad = [], files = m.clean.flatMap(filesOf);
    for (const p of files) {
      if (!existsSync(path.join(ROOT, p))) { bad.push(`${p}: missing`); continue; }
      const code = stripComments(rd(p));
      const d = DYNAMIC.exec(code), l = LIGHT.exec(code);
      if (d) bad.push(`${p}: ${d[0]}`);
      if (l) bad.push(`${p}: ${l[0]}`);
    }
    ok(!bad.length, `${r.name}: no DynamicDrawUsage, no light made (${files.length} files)${bad.length ? `: ${bad.join(", ")}` : ""}`);
  }
  for (const t of m.text || []) {
    let pass = false, err = "";
    try { const res = t.test(rd(t.file), { rd, files: (dir) => filesOf(dir.endsWith("/") ? dir : dir + "/") }); pass = res === true || res?.ok === true; if (res?.ok === false && res.why) err = `: ${res.why}`; } catch (e) { err = `: ${e.message}`; }
    ok(pass, `${r.name}: ${t.file}: ${t.what}${err}`);
  }
}
ok(nMeta > 0, `${nMeta} rows declare meta checks`);

// ------------------------------------------------------------------ 1b. timing rows (rule timing-rows, docs/SPEED_PLAN.md job 6)
{
  // a `timing: true` row measures through tools/gate/timing.mjs (calibrated budgets, best of N); no gate row script
  // times a window with process.cpuUsage() (15.6 ms ticks on Windows)
  const bad = [];
  for (const r of rows) {
    if (!existsSync(path.join(ROOT, r.script))) continue;
    const code = stripComments(rd(r.script));
    if (r.timing && !/gate\/timing\.mjs["']/.test(code)) bad.push(`${r.name}: a timing row whose script does not import tools/gate/timing.mjs`);
    if (r.name !== "meta" && /process\.cpuUsage\s*\(/.test(code)) bad.push(`${r.name}: ${r.script} times with process.cpuUsage() (15.6 ms ticks on Windows: use performance.now through tools/gate/timing.mjs)`);
  }
  ok(!bad.length, `timing rows measure through tools/gate/timing.mjs, no process.cpuUsage() in a row script (rule timing-rows)${bad.length ? `: ${bad.join("; ")}` : ""}`);
}

// ------------------------------------------------------------------ 3. every module parses and links
{
  const req = createRequire(path.join(ROOT, "tools/worker/package.json"));
  let esbuild = null;
  try { esbuild = req("esbuild"); } catch (e) { ok(false, `esbuild not found (tools/worker/node_modules): ${e.message}`); }
  if (esbuild) {
    const files = ["viewer", "debug", "tools"].flatMap((d) => walk(path.join(ROOT, d)));
    const t0 = Date.now();
    let errors = [];
    try {
      await esbuild.build({ entryPoints: files, bundle: true, write: false, outdir: "meta-out", format: "esm", splitting: true, packages: "external", external: ["node:*"], platform: "neutral", target: "esnext", logLevel: "silent", absWorkingDir: ROOT,
        // the viewer serves the repo root: "/debug/x.js" and "/viewer/x.js" are files of this checkout
        // (and "./x.js?old" is ./x.js: a second module instance in the browser, the same source here)
        plugins: [{ name: "root", setup(b) {
          b.onResolve({ filter: /^\/[^/]|^\.\.?\/.*[?#]/ }, (a) => {
            const p = a.path.replace(/[?#].*$/, "");
            return { path: p.startsWith("/") ? path.join(ROOT, p) : path.resolve(a.resolveDir, p) };
          });
        } }] });
    } catch (e) { errors = e.errors || [{ text: e.message }]; }
    ok(!errors.length, `${files.length} viewer/ debug/ tools/ modules parse and link (${((Date.now() - t0) / 1000).toFixed(1)} s)${errors.length ? ": " + errors.slice(0, 6).map((x) => `${x.location ? `${x.location.file}:${x.location.line}` : ""} ${x.text}`).join(" / ") : ""}`);
  }
}

// ------------------------------------------------------------------ 6. no call to a name the module never has
// (rule no-undefined-refs, claude/tramfix: esbuild links imports but takes an unknown bare name for a global; the
// refactor that moved tramline.js finish() to tramSched.js finishShape left one call, ReferenceError on every tram tile)
{
  const { scan } = await import("./undefRefs.mjs");
  const { files, found } = scan(ROOT);
  ok(!found.length, `${files} viewer/ debug/ tools/ modules call no name they never declare, import or have as a global (rule no-undefined-refs)${found.length ? ": " + found.slice(0, 8).map((r) => `${r.file}:${r.line} ${r.name}()`).join(", ") : ""}`);
}

// ------------------------------------------------------------------ 5. the tile cache's code key covers the worker bundle
// (rule tile-cache: the gate's tile cache keys a worker build on the import closure of viewer/tileWorker.js,
// tools/gate/tileCache.mjs codeClosure; every file esbuild bundles into viewer/tileWorker.bundle.js must be in it, else
// an edit to that file would not change the key and the cache would serve a stale tile)
{
  const req = createRequire(path.join(ROOT, "tools/worker/package.json"));
  let esbuild = null;
  try { esbuild = req("esbuild"); } catch {}
  if (esbuild) {
    const { codeClosure } = await import("../gate/tileCache.mjs");
    const { CODE } = await import("../gate/tileBuild.mjs");
    const mine = codeClosure(CODE);
    let inputs = [], err = null;
    try {
      const r = await esbuild.build({ entryPoints: ["viewer/tileWorker.js"], bundle: true, write: false, metafile: true, format: "esm", target: "es2022", outfile: "meta-out/w.js", nodePaths: ["tools/worker/node_modules"], logLevel: "silent", absWorkingDir: ROOT });
      inputs = Object.keys(r.metafile.inputs).map((f) => f.split(path.sep).join("/"));
    } catch (e) { err = e.message; }
    // a package file counts as its package.json (the closure keys a package by its version)
    // (tools/worker/node_modules may be a junction: esbuild names its real path; a package is "pkg:<name>" on both sides)
    const asKey = (f) => { const i = f.lastIndexOf("node_modules/"); if (i < 0) return f; const rest = f.slice(i + 13).split("/"); return `pkg:${rest[0].startsWith("@") ? rest.slice(0, 2).join("/") : rest[0]}`; };
    const have = new Set(mine.files.map(asKey));
    const missing = [...new Set(inputs.map(asKey))].filter((f) => !have.has(f));
    ok(!err && inputs.length > 0 && !missing.length && !mine.missing.length, `the tile cache's code key (tools/gate/tileBuild.mjs CODE, ${mine.files.length} files) covers all ${inputs.length} inputs of the worker bundle (rule tile-cache)${err ? `: esbuild: ${err}` : ""}${missing.length ? `: not in the key: ${missing.slice(0, 5).join(", ")}` : ""}${mine.missing.length ? `; unresolved imports: ${mine.missing.slice(0, 5).join(", ")}` : ""}`);
  }
}

// ------------------------------------------------------------------ 4. the generated indexes are current
{
  const { rulesIndex, censusIndex } = await import("../docs/rulesIndex.mjs");
  const marks = ["docs/rules", "docs/census"].flatMap((d) => readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".md") && /convertBranch:/.test(rd(`${d}/${f}`))).map((f) => `${d}/${f}`));
  ok(!marks.length, `no convertBranch block left to merge by hand${marks.length ? `: ${marks.join(", ")}` : ""}`);
  for (const [out, make] of [["docs/QUALITY_RULES.md", rulesIndex], ["docs/CENSUS.md", censusIndex]]) {
    const have = existsSync(path.join(ROOT, out)) ? rd(out).replace(/\r\n/g, "\n") : "";
    ok(have === make(ROOT), `${out} is what docs/${out.includes("RULES") ? "rules" : "census"}/*.md make (else: node tools/docs/rulesIndex.mjs; never edit the index by hand)`);
  }
}

console.log(fails ? `${fails} meta check(s) FAILED (of ${fails + oks})` : `meta checks pass (${oks})`);
process.exit(fails ? 1 : 0);
