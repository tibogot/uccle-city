// The service worker's list (sw.js, docs/BOOT.md): every city data file the viewer fetches -> a short content hash,
// written to /asset_hashes.json. Run by the Vercel build (vercel.json buildCommand) on every deploy; locally only to
// test return visits (the file is .gitignored: without it the service worker caches nothing).
//   node tools/asset_hashes.mjs [--br] [--out <dir>] [--only <path,...>] [--jobs N]
//     --br     also write a brotli-11 sibling <file>.br of every compressible binary / JSON file (BR_EXT, >= BR_MIN bytes,
//              kept only if <= BR_KEEP of the raw size) and list it in the json's `br` map (path -> raw size). On by
//              default in the Vercel build (env VERCEL=1, ASSET_BR=0 turns it off); locally off (the siblings would
//              clutter the checkout; *.br is git-ignored). Rule docs/rules/asset-compression.md: Vercel brotli-compresses
//              these on the fly at a low level; the q11 siblings are ~25 % smaller still. sw.js fetches the sibling,
//              checks the decoded bytes against the content hash, and falls back to the plain file on any difference.
//     --out    write asset_hashes.json and the .br siblings under <dir> (same relative paths) instead of the repo
//              (the gate row `assetgz` builds into a temp folder)
//     --only   restrict to these site paths (comma list; the gate's quick sample)
//     --cache  a content-addressed store of the compressed bytes (sha1 of the source + the brotli settings), so a
//              deploy only compresses what changed; default in the Vercel build: .vercel/cache/assetbr (Vercel keeps
//              .vercel/cache between builds for a month). A first build is ~1000 CPU-s (331 MB at brotli 11).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import os from "node:os";
import zlib from "node:zlib";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
// the folders the viewer reads data from, and the file types worth caching (the code stays on the network: it changes
// with every deploy and is small)
const DIRS = ["data", "models", "textures", "clouds", "viewer", "sounds"];
const EXT = /\.(glb|gltf|bin|ktx2|png|jpg|jpeg|avif|webp|json|hdr|exr|ogg|mp3|wav|f32|u16|u8|i16|dat|pbf|geojson|svg)$/i;
const SKIP = /(^|\/)(raw|_before|audit|src|node_modules|__pycache__)(\/|$)/;
const MAX = 40 * 1048576;                  // (no single file this big is fetched by the viewer)
// brotli siblings: the types that compress. Not KTX2 (ours are all zstd-supercompressed) nor PNG / JPG / WebP / AVIF /
// OGG / MP3 (already entropy-coded): measured 99-100 % with brotli-11, a sibling would only cost a verify.
export const BR_EXT = /\.(glb|gltf|bin|json|geojson|f32|u16|u8|i16|dat|hdr|exr|wav)$/i;
export const BR_MIN = 16 * 1024, BR_KEEP = 0.95;
const BR_KEY = "q11w22";                   // (the cache key's settings part: change it with brotli11's parameters)
export const hash12 = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 12);
export const brotli11 = (buf) => zlib.brotliCompressSync(buf, { params: {
  [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 22, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });

/** every listed file: [site path, absolute file, size] */
export function listFiles(root = ROOT) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name), rel = relative(root, p).split(sep).join("/");
      if (SKIP.test(rel)) continue;
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (EXT.test(name) && st.size <= MAX && !(rel.startsWith("viewer/") && /\.js$/.test(name))) out.push(["/" + rel, p, st.size]);
    }
  };
  for (const d of DIRS) { try { walk(join(root, d)); } catch { /* missing folder */ } }
  return out;
}
export const brEligible = (site, size) => BR_EXT.test(site) && size >= BR_MIN;

// worker: compress one file, write the sibling if worth it, answer [site, kept raw size | 0, raw, packed]
if (!isMainThread) {
  parentPort.on("message", ({ site, file, dest, cache }) => {
    const b = readFileSync(file);
    let c = null, ck = null;
    if (cache) {
      ck = join(cache, `${createHash("sha1").update(b).digest("hex")}.${BR_KEY}.br`);
      if (existsSync(ck)) c = readFileSync(ck);
    }
    if (!c) {
      c = brotli11(b);
      if (ck) { try { mkdirSync(cache, { recursive: true }); writeFileSync(ck + ".tmp" + process.pid, c); renameSync(ck + ".tmp" + process.pid, ck); } catch { /* no cache: fine */ } }
    }
    if (c.length > b.length * BR_KEEP) return parentPort.postMessage([site, 0, b.length, c.length]);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, c);
    parentPort.postMessage([site, b.length, b.length, c.length]);
  });
}

/** compress `jobs` ([{site, file, size, dest}]) on a worker pool -> the kept ones (site -> raw size) + byte totals */
async function compressAll(jobs, n) {
  const kept = new Map(); let raw = 0, packed = 0;
  if (!jobs.length) return { kept, raw, packed };
  const q = [...jobs].sort((a, b) => b.size - a.size);   // the big ones first: the pool ends together
  await new Promise((done, fail) => {
    let busy = 0;
    const ws = Array.from({ length: Math.min(n, q.length) }, () => new Worker(new URL(import.meta.url)));
    const next = (w) => {
      if (q.length) { busy++; w.postMessage(q.shift()); return; }
      if (!busy) { ws.forEach((x) => x.terminate()); done(); }
    };
    for (const w of ws) {
      w.on("error", fail);
      w.on("message", ([site, keep, r, c]) => { busy--; raw += r; packed += keep ? c : r; if (keep) kept.set(site, keep); next(w); });
      next(w);
    }
  });
  return { kept, raw, packed };
}

export async function build({ root = ROOT, out = root, br = false, only = null, jobs = os.cpus().length, quiet = false, cache = null } = {}) {
  const t0 = Date.now();
  let list = listFiles(root);
  if (only) { const s = new Set(only); list = list.filter(([site]) => s.has(site)); }
  const files = {}, full = new Map(); let bytes = 0;
  for (const [site, file, size] of list) {
    const h = createHash("sha1").update(readFileSync(file)).digest("hex");
    files[site] = h.slice(0, 12); full.set(site, h); bytes += size;
  }
  let brMap = null, stat = null;
  if (br) {
    const todo = list.filter(([site, , size]) => brEligible(site, size)).map(([site, file, size]) => ({ site, file, size, cache, dest: join(out, site.slice(1) + ".br") }));
    stat = await compressAll(todo, jobs);
    brMap = Object.fromEntries([...stat.kept].sort());
    // the cache keeps only this build's entries (Vercel uploads the whole folder after every build)
    if (cache && !only && existsSync(cache)) {
      const used = new Set(todo.map((t) => `${full.get(t.site)}.${BR_KEY}.br`));
      for (const n of readdirSync(cache)) if (!used.has(n)) { try { unlinkSync(join(cache, n)); } catch { /* fine */ } }
    }
  }
  mkdirSync(out, { recursive: true });
  const json = { made: new Date().toISOString(), files, ...(brMap ? { br: brMap } : {}) };
  writeFileSync(join(out, "asset_hashes.json"), JSON.stringify(json));
  if (!quiet) console.log(`asset_hashes.json: ${list.length} files, ${(bytes / 1048576).toFixed(0)} MB hashed` +
    (stat ? `; ${stat.kept.size} brotli siblings (${(stat.raw / 1048576).toFixed(0)} MB -> ${(stat.packed / 1048576).toFixed(0)} MB)` : "") +
    ` in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return { json, stat };
}

if (isMainThread && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const vercel = process.env.VERCEL === "1";
  const br = a.includes("--br") || (vercel && process.env.ASSET_BR !== "0");
  const cache = opt("--cache") ?? (vercel ? join(ROOT, ".vercel", "cache", "assetbr") : null);
  await build({ br, cache, out: opt("--out") ?? ROOT, only: opt("--only")?.split(","), jobs: +opt("--jobs") || undefined });
}
