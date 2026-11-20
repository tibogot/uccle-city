// What a gate row reads (docs/SPEED_PLAN.md jobs 4-5, docs/WORKFLOW.md "Memo and --changed").
// 1. The TRACED set (preferred): .cache/gate/deps/<row>.json, written by mergeGate.mjs after each run of the row from
//    what tools/gate/trace.mjs recorded in the row's processes (modules loaded, files read, directories listed; the
//    files it wrote are its outputs and left out), plus the row's gate.d file and its declared `deps`.
// 2. The STATIC crawl (a row never run here yet): the files its script (and its --import hooks) import, crawled through
//    relative / root imports, plus every repo path written as a string literal in those files ("viewer/main.js",
//    `data/tiles/${T}/x.json` -> the prefix data/tiles/), plus the row's own `deps` ([file | dir/]) and its gate.d file.
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./rowFiles.mjs";
import { urlToRepo, collapse } from "./trace.mjs";

export const CACHE = path.join(ROOT, ".cache/gate");
export const DEPS_DIR = path.join(CACHE, "deps");
export const RAW_DIR = path.join(CACHE, "raw");

const IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+)["']|(?:^|[^\w$.])import\s*\(\s*["']([^"']+)["']\s*\)/g;
const REPO_PATH = /["'`]((?:viewer|tools|debug|data|models|vendor|docs)\/[^"'`\s]*)["'`]/g;
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

function resolve(from, spec) {
  if (/^(node:|https?:)/.test(spec)) return null;
  let p;
  if (spec.startsWith("/")) p = path.join(ROOT, spec);
  else if (spec.startsWith(".")) p = path.resolve(path.dirname(from), spec);
  else return null;                                         // a package (three, esbuild...): not ours
  p = p.replace(/[?#].*$/, "");
  for (const c of [p, `${p}.js`, `${p}.mjs`, path.join(p, "index.js")]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

const cache = new Map();
/** { files: Set<repo path>, prefixes: Set<dir prefix> } of one file and everything it imports */
export function crawl(entry) {
  const files = new Set(), prefixes = new Set(), todo = [path.resolve(ROOT, entry)];
  while (todo.length) {
    const f = todo.pop(), r = rel(f);
    if (files.has(r)) continue;
    files.add(r);
    let src = cache.get(f);
    if (src == null) { try { src = readFileSync(f, "utf8"); } catch { src = ""; } cache.set(f, src); }
    if (!/\.m?js$/.test(f)) continue;
    for (const m of src.matchAll(IMPORT)) { const t = resolve(f, m[1] ?? m[2]); if (t) todo.push(t); }
    for (const m of src.matchAll(REPO_PATH)) {
      const s = m[1], cut = s.indexOf("${");
      if (cut >= 0) { const pre = s.slice(0, cut); prefixes.add(pre.slice(0, pre.lastIndexOf("/") + 1)); continue; }
      if (s.endsWith("/")) { prefixes.add(s); continue; }
      const abs = path.join(ROOT, s);
      if (existsSync(abs) && statSync(abs).isDirectory()) prefixes.add(s + "/");
      else if (/\.m?js$/.test(s) && existsSync(abs)) todo.push(abs);
      else files.add(s);
    }
  }
  return { files, prefixes };
}

/** the static crawl of a row (no trace yet) */
export function staticDeps(row) {
  const files = new Set([row.file]), prefixes = new Set();
  const roots = [row.script, ...row.node.filter((a, i) => row.node[i - 1] === "--import" && a.startsWith("."))];
  for (const r of roots) { const c = crawl(r); c.files.forEach((x) => files.add(x)); c.prefixes.forEach((x) => prefixes.add(x)); }
  for (const d of row.deps || []) (d.endsWith("/") ? prefixes : files).add(d);
  return { files, prefixes, dirs: new Set(), traced: false };
}

/** the last trace of a row (.cache/gate/deps/<row>.json), or null */
export function readTrace(name) {
  try { return JSON.parse(readFileSync(path.join(DEPS_DIR, `${name}.json`), "utf8")); } catch { return null; }
}

/** what a row reads: the traced set when there is one (+ the gate.d file and the declared deps), else the static crawl */
export function rowDeps(row) {
  const t = readTrace(row.name);
  if (!t) return staticDeps(row);
  const files = new Set([row.file, ...t.files]), prefixes = new Set(t.rdirs.map((d) => (d === "." ? "" : d + "/"))), dirs = new Set(t.dirs);
  for (const d of row.deps || []) (d.endsWith("/") ? prefixes : files).add(d);
  return { files, prefixes, dirs, traced: true, at: t.at };
}

/**
 * does a changed path touch these deps? status: git's letter (M modified, A added, D deleted, R renamed): an added or
 * deleted file also touches a directory the row listed
 */
export const touches = (deps, p, status = "M") =>
  deps.files.has(p) || [...deps.prefixes].some((d) => p.startsWith(d)) ||
  (status !== "M" && !!deps.dirs?.has(path.posix.dirname(p)));

// ------------------------------------------------------------------ turning a run's raw trace into deps/<row>.json
/** the raw trace folder of a row's run (made empty) */
export function rawDir(name) {
  const d = path.join(RAW_DIR, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  return d;
}

/**
 * read <raw>/*.txt (tools/gate/trace.mjs), write .cache/gate/deps/<row>.json and return it:
 * { row, at, node, secs, ok, files[], dirs[], rdirs[], writes[], execs[], procs, peakMB, peakThreads }
 * peakMB: the most memory the row's processes held at once (the sum of the maxRSS of the processes alive together:
 * an upper bound), peakThreads: the most node threads alive at once; the parallel runner's estimates.
 */
export function collectTrace(row, raw, { links = [], secs = 0, ok = false } = {}) {
  const reads = new Set(), dirs = new Set(), rdirs = new Set(), writes = new Set(), execs = new Set(), procs = new Map(), threads = [];
  let names = [];
  try { names = readdirSync(raw); } catch {}
  for (const n of names) {
    let txt = "";
    try { txt = readFileSync(path.join(raw, n), "utf8"); } catch { continue; }
    for (const line of txt.split("\n")) {
      if (line.length < 3) continue;
      const k = line[0], v = line.slice(2).trim();
      if (k === "r" || k === "m") reads.add(v);
      else if (k === "u") { const r = urlToRepo(v, ROOT, links); if (r) reads.add(r); }
      else if (k === "d") dirs.add(v);
      else if (k === "D") rdirs.add(v);
      else if (k === "w") writes.add(v);
      else if (k === "x") execs.add(v);
      else if (k === "p") { try { const p = JSON.parse(v); threads.push({ t0: p.t0, t1: p.t1, rssMB: 1 }); const o = procs.get(p.pid); procs.set(p.pid, { pid: p.pid, t0: Math.min(p.t0, o?.t0 ?? Infinity), t1: Math.max(p.t1, o?.t1 ?? 0), rssMB: Math.max(p.rssMB, o?.rssMB || 0) }); } catch {} }
    }
  }
  const files = [...reads].map((f) => collapse(f)).filter((f) => f && f !== "." && !writes.has(f) && !isDir(f));
  const out = {
    row: row.name, at: new Date().toISOString(), node: process.version, secs: +secs.toFixed(1), ok,
    files: [...new Set(files)].sort(), dirs: [...dirs].filter((d) => !writes.has(d)).sort(), rdirs: [...rdirs].sort(),
    writes: [...writes].sort(), execs: [...execs].sort(), procs: procs.size, peakMB: peakOf([...procs.values()]),
    peakThreads: peakOf(threads),
  };
  mkdirSync(DEPS_DIR, { recursive: true });
  writeFileSync(path.join(DEPS_DIR, `${row.name}.json`), JSON.stringify(out, null, 1));
  rmSync(raw, { recursive: true, force: true });
  return out;
}
function isDir(f) { try { return statSync(path.join(ROOT, f)).isDirectory(); } catch { return false; } }
/** the most memory held at once: sweep the process intervals (an upper bound: each process at its own peak) */
function peakOf(procs) {
  const ev = [];
  for (const p of procs) { ev.push([p.t0, p.rssMB]); ev.push([p.t1, -p.rssMB]); }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, peak = 0;
  for (const [, d] of ev) { cur += d; peak = Math.max(peak, cur); }
  return Math.round(peak);
}
