// The gate's dependency tracer (docs/SPEED_PLAN.md job 4, docs/WORKFLOW.md "Memo and --changed").
// mergeGate.mjs runs every row with NODE_OPTIONS="--import=<this file>" and GATE_TRACE_OUT=<dir>, so the row's own
// process, every node child it spawns and every worker thread load it first. Each one records, as repo paths:
//   m <path>   a module loaded (ESM through a load hook, CJS through fs.readFileSync)
//   r <path>   a file read (readFileSync / readFile / promises.readFile / open(Sync) for reading / createReadStream /
//              copyFile source)
//   d <path>   a directory listed (readdir(Sync) / promises.readdir / opendir(Sync)); D <path>: listed recursively
//   w <path>   a file written (writeFile / appendFile / open for writing / createWriteStream / copyFile / rename target):
//              a file the row writes is its output, not its input (tools/gate/deps.mjs drops it)
//   x <cmd>    a program other than node run through child_process (its reads are not traced)
//   p <json>   this process at exit: pid, ppid, thread, start / end (ms since epoch), maxRSS (MB)
// into <dir>/<pid>-<thread>.txt (the load hook: <pid>-<thread>-h.txt). Paths outside the repo are dropped, except the
// worktree junctions (GATE_TRACE_LINKS: [[target, repo path]]), which map back to their repo path; a file inside a
// node_modules package is recorded as that package's package.json (its version is what matters). Without
// GATE_TRACE_OUT this file does nothing.
import fs from "node:fs";
import path from "node:path";
import { register, syncBuiltinESMExports, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { threadId } from "node:worker_threads";

const OUT = process.env.GATE_TRACE_OUT;
if (OUT) install();

function install() {
  const ROOT = path.resolve(process.env.GATE_TRACE_ROOT || process.cwd());
  let LINKS = [];
  try { LINKS = JSON.parse(process.env.GATE_TRACE_LINKS || "[]").map(([t, r]) => [path.resolve(t).toLowerCase(), r]); } catch {}
  const t0 = Date.now();
  const file = path.join(OUT, `${process.pid}-${threadId}.txt`);
  const { appendFileSync, mkdirSync } = fs;
  try { mkdirSync(OUT, { recursive: true }); } catch {}
  const rootL = ROOT.toLowerCase() + path.sep;
  const seen = new Set();
  let buf = [];
  const flush = () => { if (!buf.length) return; try { appendFileSync(file, buf.join("")); } catch {} buf = []; };

  /** a repo path ("viewer/main.js") for a path / file URL, or null when it is not in the repo */
  const repoPath = (p) => {
    if (p == null) return null;
    if (typeof p !== "string") {
      if (p instanceof URL) { if (p.protocol !== "file:") return null; p = fileURLToPath(p); }
      else if (Buffer.isBuffer(p)) p = p.toString();
      else return null;
    }
    if (p.startsWith("file:")) { try { p = fileURLToPath(p); } catch { return null; } }
    let abs = path.resolve(p), low = abs.toLowerCase(), rel = null;
    for (const [t, r] of LINKS) if (low === t || low.startsWith(t + path.sep)) { rel = r + abs.slice(t.length).replace(/\\/g, "/"); break; }
    if (rel == null) {
      if (low + path.sep === rootL) return ".";
      if (!low.startsWith(rootL)) return null;
      rel = abs.slice(rootL.length).replace(/\\/g, "/");
    }
    return collapse(rel);
  };
  const rec = (kind, p) => {
    const rel = repoPath(p);
    if (rel == null) return;
    const k = kind + rel;
    if (seen.has(k)) return;
    seen.add(k);
    buf.push(`${kind} ${rel}\n`);
    if (buf.length > 400) flush();
  };
  const isWrite = (flags) => typeof flags === "string" ? /[wa+]/.test(flags) : typeof flags === "number" ? (flags & 3) !== 0 : false;

  // ---- fs: wrap the exported functions (node's own fs code calls its internal ones, so no recursion)
  const wrap = (obj, name, fn) => { const orig = obj[name]; if (typeof orig !== "function") return; obj[name] = Object.defineProperty(function (...a) { try { fn(...a); } catch {} return orig.apply(this, a); }, "name", { value: name }); };
  for (const o of [fs, fs.promises]) {
    wrap(o, "readFile", (p) => rec("r", p));
    wrap(o, "writeFile", (p) => rec("w", p));
    wrap(o, "appendFile", (p) => rec("w", p));
    wrap(o, "readdir", (p, opt) => rec(opt?.recursive ? "D" : "d", p));
    wrap(o, "opendir", (p, opt) => rec(opt?.recursive ? "D" : "d", p));
    wrap(o, "open", (p, flags) => rec(isWrite(flags) ? "w" : "r", p));
    wrap(o, "copyFile", (a, b) => { rec("r", a); rec("w", b); });
    wrap(o, "rename", (a, b) => rec("w", b));
  }
  wrap(fs, "readFileSync", (p) => rec("r", p));
  wrap(fs, "writeFileSync", (p) => rec("w", p));
  wrap(fs, "appendFileSync", (p) => rec("w", p));
  wrap(fs, "readdirSync", (p, opt) => rec(opt?.recursive ? "D" : "d", p));
  wrap(fs, "opendirSync", (p, opt) => rec(opt?.recursive ? "D" : "d", p));
  wrap(fs, "openSync", (p, flags) => rec(isWrite(flags) ? "w" : "r", p));
  wrap(fs, "copyFileSync", (a, b) => { rec("r", a); rec("w", b); });
  wrap(fs, "renameSync", (a, b) => rec("w", b));
  wrap(fs, "createReadStream", (p) => rec("r", p));
  wrap(fs, "createWriteStream", (p) => rec("w", p));
  syncBuiltinESMExports();

  // ---- child_process: a program that is not node (its reads are not traced: listed, so a reader can see it)
  {
    const cp = createRequire(import.meta.url)("node:child_process");
    const prog = (cmd) => { const b = path.basename(String(cmd)).toLowerCase().replace(/\.exe$/, ""); if (b !== "node" && cmd !== process.execPath) { const k = "x" + b; if (!seen.has(k)) { seen.add(k); buf.push(`x ${b}\n`); } } };
    for (const n of ["spawn", "spawnSync", "execFile", "execFileSync"]) wrap(cp, n, (cmd) => prog(cmd));
    for (const n of ["exec", "execSync"]) wrap(cp, n, (cmd) => prog(String(cmd).trim().split(/\s+/)[0]));
    syncBuiltinESMExports();
  }

  // ---- ESM: a load hook (it runs on the loader thread: it writes its own file)
  const hook = `
import { appendFileSync } from "node:fs";
let file = null, seen = new Set();
export function initialize(d) { file = d.file; }
export async function load(url, ctx, next) {
  if (file && url.startsWith("file:") && !seen.has(url)) { seen.add(url); try { appendFileSync(file, "u " + url + "\\n"); } catch {} }
  return next(url, ctx);
}`;
  try { register("data:text/javascript," + encodeURIComponent(hook), { data: { file: path.join(OUT, `${process.pid}-${threadId}-h.txt`) } }); } catch {}

  process.on("exit", () => {
    let rss = 0;
    try { rss = process.resourceUsage().maxRSS / 1024; } catch {}
    buf.push(`p ${JSON.stringify({ pid: process.pid, ppid: process.ppid, thread: threadId, t0, t1: Date.now(), rssMB: Math.round(rss) })}\n`);
    flush();
  });
}

/** a repo path as recorded: null for .cache/ and .git/; a file in a node_modules package -> that package's package.json */
export function collapse(rel) {
  if (rel.startsWith(".cache/") || rel.startsWith(".git/") || rel === ".git") return null;
  const nm = rel.lastIndexOf("node_modules/");
  if (nm >= 0) {
    const rest = rel.slice(nm + 13).split("/");
    const pkg = rest[0].startsWith("@") ? rest.slice(0, 2).join("/") : rest[0];
    rel = `${rel.slice(0, nm + 13)}${pkg}/package.json`;
  }
  return rel;
}

/** used by deps.mjs to read a hook file's "u <url>" lines with the same mapping */
export function urlToRepo(url, root, links) {
  let abs; try { abs = path.resolve(fileURLToPath(url)); } catch { return null; }
  const low = abs.toLowerCase();
  for (const [t, r] of links) { const tl = path.resolve(t).toLowerCase(); if (low === tl || low.startsWith(tl + path.sep)) return collapse(r + abs.slice(tl.length).replace(/\\/g, "/")); }
  const rootL = path.resolve(root).toLowerCase() + path.sep;
  return low.startsWith(rootL) ? collapse(abs.slice(rootL.length).replace(/\\/g, "/")) : null;
}
