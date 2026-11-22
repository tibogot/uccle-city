// ASSET COMPRESSION CHECK (rule asset-compression, docs/rules/asset-compression.md, claude/assetgz), node, no browser:
//   1. types     every file type the service worker lists is either a brotli-sibling type (tools/asset_hashes.mjs
//                BR_EXT) or on the INCOMPRESSIBLE list, and every KTX2 is supercompressed (zstd / BasisLZ: a raw KTX2
//                would go out uncompressed, Vercel does not compress image/ktx2); a sample of the incompressible ones
//                really is (brotli-3 > 95 %)
//   2. vercel    vercel.json's build runs tools/asset_hashes.mjs, which .vercelignore keeps and which imports only
//                node: builtins; a header rule gives every <file>.br `Content-Encoding: br`; the dev server does too
//   3. build     the build (--br) into a temp folder on a sample (the I6 / E4 tiles, the boot GLBs, kits, JSON): every
//                eligible file has a sibling (or is not worth one), its brotli decode == the source byte for byte,
//                the list's raw size + hash are the source's; the sample's bytes shrink >= MIN_GAIN against brotli-3
//                (what Vercel sends today: its on-the-fly level, measured 2026-11-22)
//      + a second build from its cache writes the same siblings
//   4. sw        sw.js run in node with stub fetch / caches: an entry with a sibling answers the source bytes (decoded
//                by the "network"); a sibling the CDN sent still encoded, a missing sibling, or a wrong-hash sibling
//                answers the plain file (byte-identical) and turns the siblings off; ?assetbr=old fetches plain files
//                only; a lone ?v= stamp is handled like the bare path (another query untouched); the answer carries the
//                plain file's ETag (the tile cache re-checks it); no list = no respondWith (the dev server path)
//   node tools/audit/assetGzCheck.mjs [--quiet]
//   node tools/audit/assetGzCheck.mjs --live <site>    after a deploy: a few siblings fetched from the CDN, decoded == the hash
import { readFileSync, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import os from "node:os";
import vm from "node:vm";
import zlib from "node:zlib";
import { createHash, webcrypto } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
// --live <site>: after a deploy, does the CDN send the siblings as built? (not a gate step: the network)
const LIVE = process.argv.includes("--live") ? process.argv[process.argv.indexOf("--live") + 1] : null;
if (LIVE) {
  const base = LIVE.replace(/\/$/, ""), H = { "user-agent": "asset-check/1.0", "accept-encoding": "br, gzip" };
  const list = await (await fetch(`${base}/asset_hashes.json`, { headers: H, cache: "no-store" })).json();
  const br = Object.entries(list.br ?? {}); let bad = 0;
  if (!br.length) { console.log(`FAIL live: ${base}/asset_hashes.json has no br map (ASSET_BR=0, or the build is older)`); process.exit(1); }
  const pick = [...br.filter(([p]) => /\.glb$/.test(p)).slice(0, 3), ...br.filter(([p]) => /\.(bin|u16)$/.test(p)).slice(0, 2), ...br.filter(([p]) => /\.json$/.test(p)).slice(0, 2)];
  for (const [p, size] of pick) {
    const r = await fetch(`${base}${p}.br?__h=${list.files[p]}`, { headers: H });
    const b = Buffer.from(await r.arrayBuffer()), ok = r.status === 200 && b.length === size && createHash("sha1").update(b).digest("hex").slice(0, 12) === list.files[p];
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"} live ${p}.br: ${r.status} content-encoding ${r.headers.get("content-encoding")}, decoded ${b.length} B (want ${size})`);
  }
  console.log(bad ? `assetgz live: ${bad} FAIL (the worker falls back to the plain files)` : `assetgz live: PASS (${br.length} siblings listed)`);
  process.exit(bad ? 1 : 0);
}
const AH = await import(pathToFileURL(join(ROOT, "tools/asset_hashes.mjs")).href);
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
const sha = (b) => createHash("sha1").update(b).digest("hex");
const br3 = (b) => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 3 } }).length;   // = what Vercel sends (live, 2026-11-22: E4 buildings.bin 461,136 B, brotli-3 461,141 B)
// already entropy-coded (measured 2026-11-22, brotli-11 99-100 %), or compressed on the fly by Vercel (svg)
const INCOMPRESSIBLE = new Set(["ktx2", "png", "jpg", "jpeg", "webp", "avif", "ogg", "mp3", "svg", "pbf"]);
const MIN_GAIN = 0.25;

// ---------------------------------------------------------------- 1. types
const all = AH.listFiles(ROOT);
const ext = (p) => p.slice(p.lastIndexOf(".") + 1).toLowerCase();
const types = new Map();
for (const [site, , size] of all) { const e = ext(site); const t = types.get(e) ?? { n: 0, b: 0 }; t.n++; t.b += size; types.set(e, t); }
const stray = [...types.keys()].filter((e) => !AH.BR_EXT.test("x." + e) && !INCOMPRESSIBLE.has(e));
check("types", !stray.length, stray.length ? `type(s) neither a brotli-sibling type nor incompressible: ${stray.join(", ")} (add to BR_EXT or prove incompressible)`
  : [...types].map(([e, t]) => `${e} ${t.n}`).join(", "));
const rawKtx = all.filter(([s]) => s.endsWith(".ktx2")).filter(([, f]) => { const b = readFileSync(f); return b.length < 48 || b.readUInt32LE(44) === 0; });
check("ktx2", !rawKtx.length, rawKtx.length ? `KTX2 without supercompression (sent raw): ${rawKtx.slice(0, 5).map((r) => r[0]).join(", ")}` : `${all.filter(([s]) => s.endsWith(".ktx2")).length} KTX2, all supercompressed`);
{ // the incompressible sample: the biggest file of each such type
  const big = new Map();
  for (const r of all) { const e = ext(r[0]); if (INCOMPRESSIBLE.has(e) && e !== "svg" && (!big.has(e) || big.get(e)[2] < r[2])) big.set(e, r); }
  const soft = [...big.values()].map(([s, f]) => { const b = readFileSync(f); return [s, br3(b) / b.length]; }).filter(([, r]) => r < 0.95);
  check("incompressible", !soft.length, soft.length ? `compresses after all: ${soft.map(([s, r]) => `${s} ${(r * 100).toFixed(0)} %`).join(", ")}` : `${big.size} types sampled, >= 95 %`);
}

// ---------------------------------------------------------------- 2. vercel config
const vj = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
check("build", /node tools\/asset_hashes\.mjs/.test(vj.buildCommand ?? ""), `buildCommand "${vj.buildCommand}"`);
const vi = readFileSync(join(ROOT, ".vercelignore"), "utf8");
check("vercelignore", /^!tools\/asset_hashes\.mjs\s*$/m.test(vi), ".vercelignore keeps tools/asset_hashes.mjs (tools/* is ignored)");
const imports = [...readFileSync(join(ROOT, "tools/asset_hashes.mjs"), "utf8").matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
check("builtins", imports.every((m) => m.startsWith("node:")), `asset_hashes.mjs imports ${imports.join(", ")} (only node: builtins exist in the Vercel build)`);
const brRule = (vj.headers ?? []).filter((h) => new RegExp(`^${h.source}$`).test("/models/stjob/stjob.glb.br") && h.headers.some((x) => /^content-encoding$/i.test(x.key) && x.value === "br"));
const plainHit = (vj.headers ?? []).filter((h) => new RegExp(`^${h.source}$`).test("/models/stjob/stjob.glb") && h.headers.some((x) => /^content-encoding$/i.test(x.key)));
check("header", brRule.length === 1 && !plainHit.length, `<file>.br gets Content-Encoding: br (${brRule.length} rule), a plain file none (${plainHit.length})`);
check("devserver", /endsWith\("\.br"\)[^\n]*content-encoding": "br"/.test(readFileSync(join(ROOT, "tools/tour/serve.mjs"), "utf8")), "tools/tour/serve.mjs serves .br like vercel.json");

// ---------------------------------------------------------------- 3. build on a sample
const bySite = new Map(all.map((r) => [r[0], r]));
const SAMPLE = all.map((r) => r[0]).filter((s) => /^\/data\/tiles\/(I6|E4)\//.test(s) ||
  /^\/models\/(stjob\/stjob|rail\/stjob|cars\/cars2|gardens\/gardens|roofs\/roofkit)\.glb$/.test(s) || s === "/models/facadekit/kit.bin" ||
  s === "/data/roads/network.json" || s === "/data/tiles/manifest.json");
const tmp = mkdtempSync(join(os.tmpdir(), "assetgz-"));
let built;
try {
  const cacheDir = join(tmp, "_cache");
  const { json } = await AH.build({ root: ROOT, out: tmp, br: true, only: SAMPLE, quiet: true, cache: cacheDir });
  built = json;
  { // the build cache (Vercel: .vercel/cache/assetbr): a second build from it writes the same siblings
    const out2 = join(tmp, "_again"), t = Date.now();
    const { json: j2 } = await AH.build({ root: ROOT, out: out2, br: true, only: SAMPLE, quiet: true, cache: cacheDir });
    const ms = Date.now() - t, diff = Object.keys(json.br).filter((s) => sha(readFileSync(join(tmp, s.slice(1) + ".br"))) !== sha(readFileSync(join(out2, s.slice(1) + ".br"))));
    check("cache", !diff.length && JSON.stringify(j2.br) === JSON.stringify(json.br), `rebuilt from the cache in ${ms} ms, ${diff.length} sibling(s) differ`);
  }
  const missing = SAMPLE.filter((s) => !bySite.has(s)); check("sample", SAMPLE.length >= 20 && !missing.length, `${SAMPLE.length} files`);
  let bad = [], raw = 0, now = 0, after = 0, n = 0, skipped = [];
  for (const s of SAMPLE) {
    const [, file, size] = bySite.get(s); const src = readFileSync(file);
    if (json.files[s] !== AH.hash12(src)) bad.push(`${s}: list hash`);
    const elig = AH.brEligible(s, size), sib = join(tmp, s.slice(1) + ".br");
    const v = br3(src); raw += size; now += AH.BR_EXT.test(s) ? Math.min(v, size) : size;
    if (!elig) { after += AH.BR_EXT.test(s) ? Math.min(v, size) : size; if (json.br?.[s] || existsSync(sib)) bad.push(`${s}: sibling though not eligible`); continue; }
    if (!json.br?.[s]) { skipped.push(s); after += Math.min(v, size); if (existsSync(sib)) bad.push(`${s}: sibling not listed`); continue; }
    n++;
    const dec = zlib.brotliDecompressSync(readFileSync(sib));
    if (sha(dec) !== sha(src)) bad.push(`${s}: decoded != source`);
    if (json.br[s] !== size) bad.push(`${s}: listed size ${json.br[s]} != ${size}`);
    after += statSync(sib).size;
  }
  check("identical", !bad.length, bad.length ? bad.slice(0, 6).join("; ") : `${n} siblings decode to their source byte for byte (sha1), list hashes + sizes right; ${skipped.length} not worth one`);
  const gain = 1 - after / now;
  check("gain", gain >= MIN_GAIN, `sample ${(raw / 1048576).toFixed(1)} MB raw: brotli-3 (Vercel today) ${(now / 1048576).toFixed(1)} MB -> siblings ${(after / 1048576).toFixed(1)} MB (-${(gain * 100).toFixed(0)} %, floor ${MIN_GAIN * 100} %)`);

  // -------------------------------------------------------------- 4. the service worker in node
  const swSrc = readFileSync(join(ROOT, "sw.js"), "utf8");
  const ORIGIN = "https://city.test";
  const probe = Object.keys(json.br).find((s) => s.endsWith(".glb")) ?? Object.keys(json.br)[0];
  const plainSite = SAMPLE.find((s) => !json.br[s] && json.files[s]);
  const srcOf = (s) => readFileSync(bySite.get(s)[1]);
  const makeSW = (mode, { list = json } = {}) => {
    const handlers = {}, store = new Map(), log = [];
    const cache = { match: async (k) => store.get(String(k))?.clone(), put: async (k, r) => { store.set(String(k), r); }, keys: async () => [...store.keys()].map((k) => ({ url: ORIGIN + k })), delete: async (k) => store.delete(k.url ? k.url.slice(ORIGIN.length) : k) };
    const fetchStub = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const u = new URL(url, ORIGIN), method = init?.method ?? "GET"; log.push(`${method} ${u.pathname}${u.search}`);
      if (method === "HEAD") return new Response(null, { status: 200, headers: { etag: `"plain-${u.pathname}"` } });
      if (u.pathname === "/asset_hashes.json") return list ? new Response(JSON.stringify(list), { status: 200 }) : new Response("nf", { status: 404 });
      if (u.pathname.endsWith(".br")) {
        const site = u.pathname.slice(0, -3), sib = join(tmp, site.slice(1) + ".br");
        if (mode === "missing" || !existsSync(sib)) return new Response("not found", { status: 404 });
        const enc = readFileSync(sib);
        if (mode === "reencoded") return new Response(enc, { status: 200 });                       // the CDN encoded it twice: one layer left
        if (mode === "stale") return new Response(Buffer.concat([srcOf(site), Buffer.from([0])]), { status: 200 });
        return new Response(zlib.brotliDecompressSync(enc), { status: 200 });                      // the browser decoded Content-Encoding: br
      }
      return new Response(srcOf(u.pathname), { status: 200, headers: { etag: `"plain-${u.pathname}"` } });
    };
    const self = { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: () => {}, clients: { claim: async () => {}, matchAll: async () => [] } };
    const ctx = vm.createContext({ self, caches: { open: async () => cache, keys: async () => [], delete: async () => true }, fetch: fetchStub, crypto: webcrypto,
      Response, Headers, URL, console: { warn: () => {}, log: () => {} }, location: { origin: ORIGIN }, setTimeout });
    vm.runInContext(swSrc, ctx, { filename: "sw.js" });
    const request = (path, extra = {}) => ({ method: extra.method ?? "GET", url: ORIGIN + path, mode: extra.mode ?? "cors", headers: { has: () => false } });
    const go = async (path, extra) => { let p = null; handlers.fetch({ request: request(path, extra), respondWith: (x) => { p = Promise.resolve(x); } }); return p ? await p : null; };
    return { go, log, store };
  };
  const bytesOf = async (r) => Buffer.from(await r.arrayBuffer());
  const want = srcOf(probe);
  for (const mode of ["ok", "reencoded", "missing", "stale"]) {
    const sw = makeSW(mode);
    await sw.go("/viewer/index.html", { mode: "navigate" });
    const r1 = await sw.go(probe); const b1 = r1 && await bytesOf(r1);
    const viaBr = sw.log.some((l) => l.startsWith(`GET ${probe}.br`)), plain = sw.log.includes(`GET ${probe}`);
    const tagOk = r1 && r1.headers.get("etag") === `"h-${json.files[probe]}"`;   // the content hash's tag (the tile cache re-checks it with a HEAD)
    const ok = b1 && sha(b1) === sha(want) && tagOk && (mode === "ok" ? viaBr && !plain : viaBr && plain);
    let extra = "";
    if (mode !== "ok") { // the siblings stay off: the next one goes straight to the plain file
      const other = Object.keys(json.br).find((s) => s !== probe);
      const before = sw.log.length; const r2 = other && await sw.go(other);
      const off = !other || (!sw.log.slice(before).some((l) => l.endsWith(".br?__h=" + json.files[other])) && sha(await bytesOf(r2)) === sha(srcOf(other)));
      extra = `, then off (${off})`; if (!off) fails++;
    } else { // a cache hit second time: no network
      const before = sw.log.length; const r2 = await sw.go(probe);
      const hit = sw.log.length === before && sha(await bytesOf(r2)) === sha(want); extra = `, cached (${hit})`; if (!hit) fails++;
    }
    check(`sw:${mode}`, ok, `${probe}: ${b1 ? (sha(b1) === sha(want) ? "source bytes" : "WRONG bytes") : "no response"} via ${viaBr ? "sibling" : ""}${viaBr && plain ? " + " : ""}${plain ? "plain" : ""}, tag ${tagOk ? "h-hash" : "WRONG " + r1?.headers.get("etag")}${extra}`);
  }
  { // the tile cache's dependency check: a HEAD answered from the list (no request), the same tag as the GET
    const sw = makeSW("ok"); await sw.go("/viewer/index.html", { mode: "navigate" });
    const g = await sw.go(probe); const n = sw.log.length; const hd = await sw.go(probe, { method: "HEAD" });
    check("sw:head", hd && hd.headers.get("etag") === g.headers.get("etag") && sw.log.length === n, `HEAD ${probe}: ${hd?.headers.get("etag")} == GET's, no request`);
    const sw2 = makeSW("ok"); await sw2.go("/viewer/index.html?assetbr=old", { mode: "navigate" });
    check("sw:headold", !(await sw2.go(probe, { method: "HEAD" })) && (await sw2.go(probe)).headers.get("etag") === `"plain-${probe}"`, "?assetbr=old: HEAD to the network, the GET keeps the server's tag, as before");
  }
  { // a ?v= build stamp (the tiles' files): handled like the bare path, through the sibling
    const stamped = Object.keys(json.br).find((s) => s.startsWith("/data/tiles/")) ?? probe;
    const sw = makeSW("ok"); await sw.go("/viewer/index.html", { mode: "navigate" });
    const r = await sw.go(stamped + "?v=202611161956"); const b = r && await bytesOf(r);
    check("sw:stamp", b && sha(b) === sha(srcOf(stamped)) && sw.log.some((l) => l.startsWith(`GET ${stamped}.br`)), `${stamped}?v=...: source bytes via sibling`);
    const r2 = await sw.go(stamped + "?x=1");
    check("sw:query", !r2, "any other query string: untouched");
    const sw2 = makeSW("ok"); await sw2.go("/viewer/index.html?assetbr=old", { mode: "navigate" });
    check("sw:stampold", !(await sw2.go(stamped + "?v=202611161956")), "?assetbr=old: a ?v= URL untouched, as before");
  }
  { const sw = makeSW("ok"); await sw.go("/viewer/index.html?assetbr=old", { mode: "navigate" });
    const r = await sw.go(probe); const b = await bytesOf(r);
    check("sw:old", sha(b) === sha(want) && !sw.log.some((l) => l.includes(".br")), `?assetbr=old: ${probe} plain only`); }
  if (plainSite) { const sw = makeSW("ok"); await sw.go("/viewer/index.html", { mode: "navigate" });
    const r = await sw.go(plainSite); const b = await bytesOf(r);
    check("sw:plain", sha(b) === sha(srcOf(plainSite)) && !sw.log.some((l) => l.includes(".br")), `${plainSite} (no sibling): plain`); }
  { const sw = makeSW("ok", { list: null }); await sw.go("/viewer/index.html", { mode: "navigate" });
    const r = await sw.go(probe); const r2 = await sw.go(probe);
    const passthrough = !r2 && (!r || sha(await bytesOf(r)) === sha(want)) && !sw.log.some((l) => l.includes(".br"));
    check("sw:nolist", passthrough, "no /asset_hashes.json (the dev server): the network, untouched, no sibling"); }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `assetgz: ${fails} FAIL` : `assetgz: PASS (${Object.keys(built?.br ?? {}).length} sample siblings)`);
process.exit(fails ? 1 : 0);
