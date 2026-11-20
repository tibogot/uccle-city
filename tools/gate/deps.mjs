// What a gate row reads (docs/SPEED_PLAN.md job 9: "a simple static import crawl is fine for now; the tracer comes later").
// rowDeps(row) = the files its script (and its --import hooks) import, crawled through relative / root imports, plus every
// repo path written as a string literal in those files ("viewer/main.js", `data/tiles/${T}/x.json` -> the prefix
// data/tiles/), plus the row's own `deps` ([file | dir/]) and its gate.d file.
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./rowFiles.mjs";

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

export function rowDeps(row) {
  const files = new Set([row.file]), prefixes = new Set();
  const roots = [row.script, ...row.node.filter((a, i) => row.node[i - 1] === "--import" && a.startsWith("."))];
  for (const r of roots) { const c = crawl(r); c.files.forEach((x) => files.add(x)); c.prefixes.forEach((x) => prefixes.add(x)); }
  for (const d of row.deps || []) (d.endsWith("/") ? prefixes : files).add(d);
  return { files, prefixes };
}

/** does a changed path touch these deps? */
export const touches = (deps, p) => deps.files.has(p) || [...deps.prefixes].some((d) => d && p.startsWith(d));
