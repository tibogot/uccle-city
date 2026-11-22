// The gate's tile cache (docs/SPEED_PLAN.md job 8, rule tile-cache, docs/rules/tile-cache.md): a tile built once in node
// is kept in .cache/tiles/ and every later row (and every later gate run) reads it back instead of rebuilding it.
//
//   cached({ kind, tile, opts, code, build, pack, unpack }) -> { value, hit, ms }
//
// KEY (content-addressed, two levels, like ccache's direct mode):
//   base  = sha256(format, kind, tile, node version, the CODE hash, the canonical build options, the globals the build
//           sees: location.search, the OffscreenCanvas stand-in)
//   code  = the content of every file in the import closure of `code` (repo modules crawled through their static and
//           literal dynamic imports; a bare package by its package.json version). For the worker build that closure is
//           the worker bundle's own inputs (viewer/tileWorker.js: what tools/build_worker.mjs bundles and merge.mjs hashes
//           as __TILE_CODE_HASH); the meta row checks the two sets are the same (esbuild's metafile).
//   inputs = every file the build read (fetch of a file: URL, fs reads), every existsSync answer and every directory
//           listing, RECORDED while the build ran, stored in idx/<base>.json (the last 8 such sets). A lookup re-hashes
//           each set as its files are now: key = sha256(base, their current hashes). A changed / added / deleted input
//           is a different key: a miss. A build an input of which changed while it ran is not stored.
// VALUE: obj/<key>.bin = a header (sha1 + length of the payload) + the payload: v8's structured-clone format (the base
//   v8.Serializer, so typed arrays keep their own buffers and views that share one buffer still share it, as postMessage
//   does), deflated (level 1: a 45-60 MB tile is 12-15 MB on disk, ~0.1 s to inflate). Only PLAIN data is stored: objects / arrays / Map / Set / typed arrays / primitives; a function or a class
//   instance anywhere and the value is not stored (the build's own value is returned, logged "uncacheable").
//   A hit and a miss return the same thing: the payload read back (so a row behaves the same cold or warm).
// LOCK: one process builds a missing tile at a time (lock/<base>.lock, made with O_EXCL; a dead pid's or a 15 min old
//   lock is broken); another asking the same tile meanwhile waits (up to 5 min) and reads its object: the gate's rows
//   walk the tiles in the same order, so without it they built each tile together.
// WRITES are atomic (a temp file + rename; a lost race to the same key is fine: same key, same bytes). The cache is
//   capped (TILE_CACHE_MB, default 4096) with LRU eviction (a hit touches the file's mtime); a store is skipped when the
//   disk has less than 10 GB free.
// OFF: `--no-tile-cache` on the command line (it sets TILE_CACHE=0, so the row's children inherit it) or TILE_CACHE=0.
//   TILE_CACHE=verify: every hit is also built fresh and compared byte for byte (canonicalHash; a mismatch throws).
// TRACER (tools/gate/trace.mjs): a hit re-reads every recorded input to hash it (fs.readFileSync), and the code closure
//   is read the same way, so the row's trace still lists the tile's true inputs; .cache/ itself is never traced.
// LOG: one JSON line a lookup in .cache/tiles/log.jsonl (row = GATE_ROW, set by mergeGate.mjs), for the speed report.
import fs from "node:fs";
import path from "node:path";
import v8 from "node:v8";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIR = path.resolve(process.env.TILE_CACHE_DIR || path.join(ROOT, ".cache/tiles"));
export const FORMAT = 1;
const CAP = (+process.env.TILE_CACHE_MB || 4096) * 1048576;
const MIN_FREE = 10 * 1073741824;
const MAGIC = Buffer.from("UTC2");            // (2: the payload deflated, level 1: ~4x smaller, ~0.1 s to inflate a 50 MB tile)

if (process.argv.includes("--no-tile-cache")) process.env.TILE_CACHE = "0";
/** "on" | "off" | "verify" */
export const mode = () => (process.env.TILE_CACHE === "0" || process.env.TILE_CACHE === "off" ? "off" : process.env.TILE_CACHE === "verify" ? "verify" : "on");

const { readFileSync, existsSync, statSync, readdirSync } = fs;   // (the originals: our own reads are never recorded)
const sha = (alg = "sha256") => createHash(alg);
const relOf = (abs) => { const r = path.relative(ROOT, abs).replace(/\\/g, "/"); return r.startsWith("..") || path.isAbsolute(r) ? abs.replace(/\\/g, "/") : r; };
const absOf = (rel) => (path.isAbsolute(rel) ? rel : path.join(ROOT, rel));

// ------------------------------------------------------------------------------------------------ serialization
/** v8 structured clone (the base Serializer: native typed arrays, shared buffers kept shared) */
export function serialize(v) { const s = new v8.Serializer(); s.writeHeader(); s.writeValue(v); return s.releaseBuffer(); }
export function deserialize(buf) { const d = new v8.Deserializer(buf); d.readHeader(); return d.readValue(); }

const PLAIN_PROTO = new Set([Object.prototype, Array.prototype, Map.prototype, Set.prototype, null]);
const VIEW_PROTO = new Set([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array, DataView].map((C) => C.prototype));
/** the paths of the first `max` values a structured clone would not give back as they are ([] = plain data) */
export function notPlain(root, max = 6) {
  const bad = [], seen = new Set(), st = [[root, "$"]];
  while (st.length && bad.length < max) {
    const [v, p] = st.pop();
    const t = typeof v;
    if (t === "function" || t === "symbol") { bad.push(`${p}: ${t}`); continue; }
    if (v === null || t !== "object") continue;
    if (seen.has(v)) continue;
    seen.add(v);
    const pr = Object.getPrototypeOf(v);
    if (v instanceof ArrayBuffer) { if (pr !== ArrayBuffer.prototype) bad.push(`${p}: ${pr?.constructor?.name}`); continue; }
    if (ArrayBuffer.isView(v)) { if (!VIEW_PROTO.has(pr)) bad.push(`${p}: ${pr?.constructor?.name}`); continue; }
    if (!PLAIN_PROTO.has(pr)) { bad.push(`${p}: ${pr?.constructor?.name ?? "?"} instance`); continue; }
    if (Object.getOwnPropertySymbols(v).length) { bad.push(`${p}: symbol keys`); continue; }
    if (v instanceof Map) { let i = 0; for (const [a, b] of v) { st.push([a, `${p}<key ${i}>`], [b, `${p}<${i++}>`]); } continue; }
    if (v instanceof Set) { let i = 0; for (const a of v) st.push([a, `${p}<${i++}>`]); continue; }
    const arr = Array.isArray(v);
    for (const k of Object.keys(v)) {
      if (!arr || !/^\d+$/.test(k)) { const d = Object.getOwnPropertyDescriptor(v, k); if (d.get || d.set) { bad.push(`${p}.${k}: accessor`); continue; } }
      st.push([v[k], arr ? `${p}[${k}]` : `${p}.${k}`]);
    }
  }
  return bad;
}

/** JSON with sorted keys (the options part of the key); throws on what JSON cannot say exactly */
export function canonical(v) {
  const walk = (x) => {
    if (x === undefined) return null;
    if (typeof x === "number" && !Number.isFinite(x)) return `#${x}`;
    if (typeof x === "function" || typeof x === "symbol" || typeof x === "bigint") throw new Error(`tile cache: an option is a ${typeof x}`);
    if (x === null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(walk);
    if (Object.getPrototypeOf(x) !== Object.prototype) throw new Error(`tile cache: an option is a ${x.constructor?.name}`);
    const o = {};
    for (const k of Object.keys(x).sort()) if (x[k] !== undefined) o[k] = walk(x[k]);
    return o;
  };
  return JSON.stringify(walk(v));
}

// ------------------------------------------------------------------------------------------------ the code hash
const IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+)["']|(?:^|[^\w$.])import\s*\(\s*["']([^"']+)["']\s*\)/g;
const NM = [path.join(ROOT, "tools/worker/node_modules"), path.join(ROOT, "node_modules")];
function resolveSpec(from, spec) {
  if (/^(node:|https?:|data:)/.test(spec)) return null;
  if (spec.startsWith("/") || spec.startsWith(".")) {
    const p = (spec.startsWith("/") ? path.join(ROOT, spec) : path.resolve(path.dirname(from), spec)).replace(/[?#].*$/, "");
    for (const c of [p, `${p}.js`, `${p}.mjs`, path.join(p, "index.js")]) if (existsSync(c) && statSync(c).isFile()) return { file: c };
    return { missing: relOf(p) };
  }
  // a bare package: its package.json (the version is what matters; tools/road_audit/hooks.mjs maps three/src/* and
  // meshoptimizer/* to tools/worker/node_modules, as the worker bundle does)
  const name = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
  for (const d of NM) { const pj = path.join(d, name, "package.json"); if (existsSync(pj)) return { pkg: pj }; }
  return { missing: `pkg:${name}` };
}
/** every file of the import closure of the given repo modules: { files: [repo path], missing: [...] } */
export function codeClosure(roots) {
  const files = new Set(), missing = new Set(), todo = roots.map((r) => absOf(r));
  while (todo.length) {
    const f = todo.pop(), r = relOf(f);
    if (files.has(r)) continue;
    files.add(r);
    if (!/\.m?js$/.test(f)) continue;
    let src = "";
    try { src = readFileSync(f, "utf8"); } catch { missing.add(r); continue; }
    for (const m of src.matchAll(IMPORT)) {
      const t = resolveSpec(f, m[1] ?? m[2]);
      if (!t) continue;
      if (t.file) todo.push(t.file); else if (t.pkg) files.add(relOf(t.pkg)); else missing.add(t.missing);
    }
  }
  return { files: [...files].sort(), missing: [...missing].sort() };
}
const codeMemo = new Map();
export const _resetCodeMemo = () => codeMemo.clear();      // (the self test: a code edit inside one process)
/** sha256 over the closure's files (path + content), once per process; read with fs.readFileSync so the tracer sees them */
export function codeHash(roots) {
  const k = roots.join("|");
  if (codeMemo.has(k)) return codeMemo.get(k);
  const { files, missing } = codeClosure(roots);
  const h = sha();
  for (const f of files) { h.update(f + "\0"); try { h.update(fs.readFileSync(absOf(f))); } catch { h.update("<missing>"); } h.update("\0"); }
  h.update("missing:" + missing.join(","));
  const out = { hash: h.digest("hex").slice(0, 32), files: files.length };
  codeMemo.set(k, out);
  return out;
}

// ------------------------------------------------------------------------------------------------ input recording
const recorders = new Set();
let restore = null;
const note = (kind, p, extra) => {
  if (!recorders.size || p == null) return;
  let abs;
  try {
    if (p instanceof URL) { if (p.protocol !== "file:") return; abs = fileURLToPath(p); }
    else if (Buffer.isBuffer(p)) abs = p.toString();
    else if (typeof p === "string") abs = p.startsWith("file:") ? fileURLToPath(p.replace(/[?#].*$/, "")) : p;
    else return;                                                  // (a file descriptor: its open was recorded)
  } catch { return; }
  abs = path.resolve(abs);
  if (abs.toLowerCase().startsWith(DIR.toLowerCase() + path.sep)) return;
  for (const r of recorders) r.add(`${kind} ${relOf(abs)}${extra ?? ""}`);
};
function patch() {
  const saved = [];
  const wrap = (obj, name, before) => {
    const orig = obj[name];
    if (typeof orig !== "function") return;
    saved.push([obj, name, orig]);
    obj[name] = Object.defineProperty(function (...a) { try { before(...a); } catch {} return orig.apply(this, a); }, "name", { value: name });
  };
  for (const o of [fs, fs.promises]) {
    wrap(o, "readFile", (p) => note("f", p));
    wrap(o, "open", (p, fl) => { if (!(typeof fl === "string" && /[wa+]/.test(fl))) note("f", p); });
    wrap(o, "readdir", (p) => note("d", p));
    wrap(o, "stat", (p) => note("s", p));
  }
  wrap(fs, "readFileSync", (p) => note("f", p));
  wrap(fs, "openSync", (p, fl) => { if (!(typeof fl === "string" && /[wa+]/.test(fl))) note("f", p); });
  wrap(fs, "readdirSync", (p) => note("d", p));
  wrap(fs, "statSync", (p) => note("s", p));
  wrap(fs, "existsSync", (p) => note("s", p));
  wrap(fs, "createReadStream", (p) => note("f", p));
  const fetch0 = globalThis.fetch;
  if (typeof fetch0 === "function") {
    globalThis.fetch = function (u, o) { try { const s = String(u?.url ?? u); if (s.startsWith("file:")) note("f", s); } catch {} return fetch0.call(this, u, o); };
  }
  syncBuiltinESMExports();
  return () => { for (const [o, n, f] of saved.reverse()) o[n] = f; if (typeof fetch0 === "function") globalThis.fetch = fetch0; syncBuiltinESMExports(); };
}
/** run fn() (async) and return [its value, the recorded inputs]; nested / concurrent recordings each see every input */
async function recording(fn) {
  const rec = new Set();
  recorders.add(rec);
  if (recorders.size === 1) restore = patch();
  try { return [await fn(), rec]; }
  finally { recorders.delete(rec); if (!recorders.size && restore) { restore(); restore = null; } }
}

/** the signature of one recorded input as it is NOW (read with fs.* so the tracer records it) */
function signature(entry) {
  const kind = entry[0], rel = entry.slice(2), abs = absOf(rel);
  if (kind === "f") { try { return sha("sha1").update(fs.readFileSync(abs)).digest("hex"); } catch { return fs.existsSync(abs) ? "unreadable" : "absent"; } }
  if (kind === "s") { try { const s = fs.statSync(abs); return s.isDirectory() ? "dir" : s.isFile() ? "file" : "other"; } catch { return "absent"; } }
  if (kind === "d") { try { return sha("sha1").update(fs.readdirSync(abs).sort().join("\n")).digest("hex"); } catch { return "absent"; } }
  return "?";
}
const inputKey = (base, inputs, sigs = new Map()) => {
  const h = sha().update(base);
  for (const e of inputs) { if (!sigs.has(e)) sigs.set(e, signature(e)); h.update(`\n${e}=${sigs.get(e)}`); }
  return h.digest("hex").slice(0, 40);
};
/** the recorded inputs a file / folder of which changed after t (ms epoch): built from what it was, keyed on what it is */
const movedSince = (inputs, t) => inputs.filter((e) => { if (e[0] === "s") return false; try { return statSync(absOf(e.slice(2))).mtimeMs > t; } catch { return false; } });
const SETS = 8;   // (the input sets an idx keeps: a file that comes and goes, two branches' data: each finds its object)

// ------------------------------------------------------------------------------------------------ the store
const objPath = (k) => path.join(DIR, "obj", `${k}.bin`);
const idxPath = (b) => path.join(DIR, "idx", `${b}.json`);
function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmp, data);
  try { fs.renameSync(tmp, file); }
  catch (e) { try { fs.unlinkSync(tmp); } catch {} if (!existsSync(file)) throw e; }   // (lost a race: the winner wrote the same key)
}
function readObj(k) {
  let buf;
  try { buf = readFileSync(objPath(k)); } catch { return null; }
  try {
    if (buf.length < 8 || !buf.subarray(0, 4).equals(MAGIC)) return null;
    const hl = buf.readUInt32LE(4), head = JSON.parse(buf.subarray(8, 8 + hl).toString("utf8")), body = buf.subarray(8 + hl);
    if (body.length !== head.bytes || sha("sha1").update(body).digest("hex") !== head.sha1) return null;   // (torn / damaged: a miss)
    try { const t = new Date(); fs.utimesSync(objPath(k), t, t); } catch {}                                  // LRU: a hit is recent
    return zlib.inflateSync(body);
  } catch { return null; }
}
function freeBytes() { try { const s = fs.statfsSync(DIR); return s.bavail * s.bsize; } catch { return Infinity; } }
/** LRU eviction down to 90 % of the cap; stray temp files older than an hour go too */
export function prune(cap = CAP) {
  const d = path.join(DIR, "obj");
  let names = [];
  try { names = readdirSync(d); } catch { return { files: 0, bytes: 0, evicted: 0 }; }
  const now = Date.now(), files = [];
  for (const n of names) {
    const p = path.join(d, n);
    let s; try { s = statSync(p); } catch { continue; }
    if (n.endsWith(".tmp")) { if (now - s.mtimeMs > 3600e3) try { fs.unlinkSync(p); } catch {} continue; }
    files.push({ p, bytes: s.size, t: s.mtimeMs });
  }
  let total = files.reduce((a, f) => a + f.bytes, 0), evicted = 0;
  if (total > cap) {
    files.sort((a, b) => a.t - b.t);
    for (const f of files) { if (total <= cap * 0.9) break; try { fs.unlinkSync(f.p); total -= f.bytes; evicted++; } catch {} }
  }
  return { files: files.length - evicted, bytes: total, evicted };
}
const LOG = path.join(DIR, "log.jsonl");
function log(rec) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    try { if (statSync(LOG).size > 32 * 1048576) fs.renameSync(LOG, path.join(DIR, "log.old.jsonl")); } catch {}
    fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), row: process.env.GATE_ROW || null, pid: process.pid, ...rec }) + "\n");
  } catch {}
}
/** the log's lookups since `since` (ms epoch) */
export function logSince(since = 0) {
  let txt = "";
  try { txt = readFileSync(LOG, "utf8"); } catch { return []; }
  return txt.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && r.t >= since && r.kind);
}
/** one line for the gate's table: lookups / hits / misses, per row, the cache's size */
export function runSummary(since) {
  const L = logSince(since).filter((r) => r.hit !== undefined);
  if (!L.length) return null;
  const by = new Map();
  for (const r of L) { const k = r.row || "-"; const o = by.get(k) || { n: 0, hit: 0, unc: 0 }; o.n++; if (r.hit) o.hit++; else if (r.uncacheable) o.unc++; by.set(k, o); }
  const hits = L.filter((r) => r.hit).length, unc = L.filter((r) => r.uncacheable).length, st = stats();
  const rows = [...by].sort((a, b) => b[1].n - a[1].n).map(([k, o]) => `${k} ${o.hit}/${o.n}${o.unc ? ` (${o.unc} uncacheable)` : ""}`).join(", ");
  return `${L.length} tile builds asked, ${hits} from the cache, ${L.length - hits} built (${unc} uncacheable); hits per row: ${rows}; ${st.files} tiles cached, ${(st.bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * what the build sees besides its options and its files: location.search (viewer/drive/colliders.js, rail/tunnels.js
 * read ?x=old switches from it; no location = ""), globalThis.__levelsDebug (streets/roadLevels.js), and what the
 * OffscreenCanvas stand-in the rows install does (landcover.js / grassTypes.js paint on it): a white fill read back,
 * by behaviour, not by its source text (the rows' copies differ only in indentation)
 */
function canvasKey() {
  const C = globalThis.OffscreenCanvas;
  if (!C) return null;
  try {
    const ctx = new C(4, 4).getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 4, 4);
    const d = ctx.getImageData(0, 0, 4, 4)?.data;
    return d ? sha("sha1").update(Buffer.from(d.buffer, d.byteOffset, d.byteLength)).digest("hex").slice(0, 12) : "no data";
  } catch (e) { return `throws ${e?.message}`; }
}
const globalsKey = () => ({ search: globalThis.location?.search || "", levelsDebug: !!globalThis.__levelsDebug, canvas: canvasKey() });

// ------------------------------------------------------------------------------------------------ the build lock
const LOCK_WAIT = 300e3, LOCK_STALE = 900e3;         // (wait up to 5 min for another process's build; a lock older than 15 min is dead)
const lockPath = (b) => path.join(DIR, "lock", `${b}.lock`);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
/** take the base's build lock: { waited (ms, 0 = taken at once), release() }; after one wait it never waits again */
async function takeLock(base) {
  const f = lockPath(base), t0 = Date.now();
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch {}
  const mine = () => ({ waited: 0, release: () => { try { if (readFileSync(f, "utf8").startsWith(`${process.pid} `)) fs.unlinkSync(f); } catch {} } });
  let sawOther = false;
  for (;;) {
    try { const fd = fs.openSync(f, "wx"); fs.writeSync(fd, `${process.pid} ${Date.now()}`); fs.closeSync(fd); return sawOther ? { ...mine(), waited: Math.max(1, Date.now() - t0) } : mine(); }
    catch (e) { if (e.code !== "EEXIST") return { waited: 0, release: () => {} }; }       // (no lock possible: just build)
    let pid = 0, at = 0;
    try { [pid, at] = readFileSync(f, "utf8").split(" ").map(Number); } catch { continue; }   // (released meanwhile: retry)
    if (!pid || !alive(pid) || Date.now() - at > LOCK_STALE) { try { fs.unlinkSync(f); } catch {} continue; }
    sawOther = true;
    if (Date.now() - t0 > LOCK_WAIT) return { waited: Date.now() - t0, release: () => {} };   // (waited long enough: build without it)
    await new Promise((r) => setTimeout(r, 250));
    if (!existsSync(f)) return { waited: Math.max(1, Date.now() - t0), release: () => {} };    // (its build is done: look it up)
  }
}

/**
 * the cached build.
 *   kind     a name for the builder ("worker")
 *   tile     the tile name (only for the log / the key)
 *   opts     the build options (canonical JSON: part of the key)
 *   code     the repo modules whose import closure is the builder's code
 *   build()  async: the live value
 *   pack(v)  the live value -> the plain value to store (default: itself)
 *   unpack(p) the stored plain value -> what the caller gets (default: itself); applied to the hit and the miss alike
 * -> { value, hit, ms, stored }
 */
export async function cached({ kind, tile, opts, code, build, pack = (v) => v, unpack = (p) => p }) {
  const m = mode(), t0 = performance.now();
  if (m === "off") { const v = await build(); return { value: v, hit: false, ms: performance.now() - t0, stored: false, off: true }; }
  const c = codeHash(code);
  let optsKey;
  try { optsKey = canonical(opts); }
  catch (e) { log({ kind, tile, hit: false, uncacheable: e.message }); const v = await build(); return { value: v, hit: false, ms: performance.now() - t0, stored: false }; }
  const base = sha().update(JSON.stringify({ f: FORMAT, kind, tile, node: process.version, code: c.hash, opts: optsKey, g: globalsKey() })).digest("hex").slice(0, 40);
  // 1. the input sets this build read before (the most recent first), each hashed as its files are now
  const lookup = async () => {
    let idx = null;
    try { idx = JSON.parse(readFileSync(idxPath(base), "utf8")); } catch {}
    const sets = Array.isArray(idx?.sets) ? idx.sets : [], sigs = new Map();
    for (const set of sets) {
      const key = inputKey(base, set, sigs), body = readObj(key);
      if (!body) continue;
      const value = unpack(deserialize(body)), ms = performance.now() - t0;
      if (m === "verify") {
        if (!sameBytes(pack(await build()), deserialize(body))) throw new Error(`tile cache: ${kind} ${tile}: the cached build differs from a fresh build (key ${key})`);
      }
      log({ kind, tile, hit: true, ms: Math.round(ms), bytes: body.length, inputs: set.length, ...(waited ? { waitedMs: Math.round(waited) } : {}) });
      return { value, hit: true, ms, stored: false, key };
    }
    return null;
  };
  let waited = 0;
  const first = await lookup();
  if (first) return first;
  // (another process building the same tile right now: the gate's rows walk the tiles in the same order, so without
  // this they all built tile A5 at once; wait for its result instead, once, then build if it brought none)
  const lock = process.env.TILE_CACHE_LOCK === "0" ? { waited: 0, release: () => {} } : await takeLock(base);   // (TILE_CACHE_LOCK=0: no lock, the self test's store race)
  try {
    if (lock.waited) {
      waited = lock.waited;
      const after = await lookup();
      if (after) return after;
    }
    return await buildAndStore();
  } finally { lock.release(); }

  async function buildAndStore() {
    // 2. a miss: build, recording what the build reads
    const tb = performance.now(), tStart = Date.now();
    const [live, rec] = await recording(build);
    const buildMs = performance.now() - tb;
    let plain;
    try { plain = pack(live); } catch (e) { log({ kind, tile, hit: false, uncacheable: `pack: ${e.message}`, buildMs: Math.round(buildMs) }); return { value: live, hit: false, ms: performance.now() - t0, stored: false }; }
    const bad = notPlain(plain);
    if (bad.length) { log({ kind, tile, hit: false, uncacheable: bad.join("; "), buildMs: Math.round(buildMs) }); return { value: live, hit: false, ms: performance.now() - t0, stored: false }; }
    const body = serialize(plain);
    const inputs = [...rec].sort();
    const key = inputKey(base, inputs);
    let stored = false;
    const moved = movedSince(inputs, tStart);
    if (moved.length) log({ kind, tile, notStored: `inputs changed while it built: ${moved.slice(0, 3).join(", ")}` });
    else if (freeBytes() > MIN_FREE) {
      const z = zlib.deflateSync(body, { level: 1 });
      const head = Buffer.from(JSON.stringify({ sha1: sha("sha1").update(z).digest("hex"), bytes: z.length, raw: body.length, z: "deflate", kind, tile, base, at: new Date().toISOString() }));
      const hl = Buffer.alloc(4); hl.writeUInt32LE(head.length);
      try {
        atomicWrite(objPath(key), Buffer.concat([MAGIC, hl, head, z]));
        // (re-read: another process may have added a set meanwhile; a lost update only costs that set a rebuild)
        let now = null; try { now = JSON.parse(readFileSync(idxPath(base), "utf8")); } catch {}
        const mine = JSON.stringify(inputs), keepSets = [inputs, ...(Array.isArray(now?.sets) ? now.sets : []).filter((x) => JSON.stringify(x) !== mine)].slice(0, SETS);
        atomicWrite(idxPath(base), JSON.stringify({ kind, tile, code: c.hash, opts: JSON.parse(optsKey), sets: keepSets }));
        stored = true;
        prune();
      } catch (e) { log({ kind, tile, storeError: e.message }); }
    }
    const value = unpack(deserialize(body));
    log({ kind, tile, hit: false, buildMs: Math.round(buildMs), bytes: body.length, inputs: inputs.length, stored });
    return { value, hit: false, ms: performance.now() - t0, stored, key, buildMs };
  }
}

/** the keys that change from one identical build to the next (wall times: `times`, `totalMs`, `fitMs`...): left out of
 *  comparisons (they are stored as built) */
export const volatileKey = (k) => k === "times" || k === "ms" || /Ms$/.test(k);

/**
 * the canonical bytes of a plain value, hashed (sha256): "byte for byte" without V8's own representations (a small int
 * held as a double, a one- or two-byte string, a holey array). It encodes, in order: type tags, numbers as float64
 * (-0 and NaN kept), strings as UTF-8, object keys in their order (volatile keys left out), array holes, Map / Set
 * entries, every typed array as its type + offset + length + its buffer (by first-seen id; the buffer's bytes the first
 * time), and a repeated object as a back-reference (so shared structure counts too).
 */
class Mark { constructor(t) { this.t = t; } }
export function canonicalHash(root, { skip = volatileKey } = {}) {
  const h = sha(), ids = new Map(), bufs = new Map();
  const f64 = new Float64Array(1), f8 = new Uint8Array(f64.buffer);
  const num = (x) => { f64[0] = x; h.update(f8); };
  const tag = (t) => h.update(t);
  const str = (x) => { const b = Buffer.from(x, "utf8"); num(b.length); h.update(b); };
  const st = [root];
  while (st.length) {
    const v = st.pop();
    if (v instanceof Mark) { tag(v.t); continue; }
    const t = typeof v;
    if (v === undefined) { tag("u"); continue; }
    if (v === null) { tag("n"); continue; }
    if (t === "boolean") { tag(v ? "T" : "F"); continue; }
    if (t === "number") { tag("d"); num(v); continue; }
    if (t === "string") { tag("s"); str(v); continue; }
    if (t === "bigint") { tag("b"); str(v.toString()); continue; }
    if (t !== "object") throw new Error(`tile cache: canonicalHash: a ${t}`);
    if (ids.has(v)) { tag("@"); num(ids.get(v)); continue; }
    ids.set(v, ids.size);
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
      const buf = v instanceof ArrayBuffer ? v : v.buffer;
      tag(v instanceof ArrayBuffer ? "A" : `V${v.constructor.name}`);
      if (ArrayBuffer.isView(v)) { num(v.byteOffset); num(v.byteLength); }
      if (bufs.has(buf)) { tag("B@"); num(bufs.get(buf)); }
      else { bufs.set(buf, bufs.size); tag("B"); num(buf.byteLength); h.update(new Uint8Array(buf)); }
      continue;
    }
    if (v instanceof Map) { tag("M"); num(v.size); st.push(new Mark("m")); const e = [...v]; for (let i = e.length - 1; i >= 0; i--) st.push(e[i][1], e[i][0]); continue; }
    if (v instanceof Set) { tag("S"); num(v.size); st.push(new Mark("z")); const e = [...v]; for (let i = e.length - 1; i >= 0; i--) st.push(e[i]); continue; }
    if (Array.isArray(v)) {
      tag("["); num(v.length); st.push(new Mark("]"));
      for (let i = v.length - 1; i >= 0; i--) st.push(i in v ? v[i] : new Mark("_"));    // (a hole)
      continue;
    }
    tag("{"); st.push(new Mark("}"));
    const ks = Object.keys(v).filter((k) => !skip(k));
    for (let i = ks.length - 1; i >= 0; i--) { st.push(v[ks[i]]); st.push(new Mark("k" + ks[i].length + ":" + ks[i])); }
  }
  return h.digest("hex");
}
export const sameBytes = (a, b) => canonicalHash(a) === canonicalHash(b);

/** { files, bytes } in the cache now */
export function stats() { return prune(Infinity); }
