// TILE CACHE CHECK (rule tile-cache, docs/rules/tile-cache.md; docs/SPEED_PLAN.md job 8): the gate's tile cache
// (tools/gate/tileCache.mjs, tools/gate/tileBuild.mjs) can never serve a stale or a different tile.
//   node --import ./tools/road_audit/register.mjs tools/audit/tileCacheCheck.mjs [--quiet] [--tiles I6,H6,E9]
// A. the mechanism, on a synthetic build in a scratch cache (.cache/tiles-selftest/, a child process):
//    miss -> hit; an input edited / deleted / added to a listed folder / its existsSync answer changed -> a miss; the
//    options (any key order: the same key) and the code closure in the key; a function / class instance not stored;
//    a damaged object file a miss; TILE_CACHE=0 builds every time and stores nothing; verify mode throws on a cached
//    value that differs from a fresh build; 4 processes storing the same key at once (atomic: one file, no temp left);
//    LRU eviction keeps the recently hit; on a hit the dependency tracer (tools/gate/trace.mjs) still records the
//    build's input files and its code.
// B. parity on real tiles (default I6, H6, E9: dense, a plan deck, the rail): the tile worker's build through the cache
//    (a hit when another row / run stored it) == a fresh build, byte for byte (canonicalHash, wall times left out);
//    keepNet's kept parts (deckRings, net.streetModel.segments, hm) == the live ones; keepNet does not change the rest;
//    the second ask is a hit.
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const QUIET = argv.includes("--quiet");
const SCRATCH = path.join(ROOT, ".cache/tiles-selftest");
let fails = 0, oks = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else { oks++; if (!QUIET) console.log("ok  ", m); } return c; };

// ------------------------------------------------------------------------------------------------ child modes
if (argv[0] === "--race") {            // one of 4 racers: store the same key, then read it
  const tc = await import("../gate/tileCache.mjs");
  const r = await tc.cached({ kind: "race", tile: argv[2], opts: { a: 1 }, code: [argv[1]], build: async () => {
    fs.appendFileSync(path.join(SCRATCH, `builds-${argv[2]}.txt`), `${process.pid}\n`);
    await new Promise((d) => setTimeout(d, 1500));
    return { big: new Float64Array(2e6).fill(7), who: "any" };
  } });
  console.log(JSON.stringify({ ok: r.value.big[123] === 7 && r.value.big.length === 2e6 }));
  process.exit(0);
}
if (argv[0] === "--traced-hit") {       // a hit under the tracer: what does the trace hold?
  const tc = await import("../gate/tileCache.mjs");
  const r = await tc.cached({ kind: "trace", tile: "T", opts: {}, code: [argv[1]], build: async () => JSON.parse(fs.readFileSync(path.join(ROOT, "data/tiles/manifest.json"), "utf8")).tiles.length });
  console.log(JSON.stringify({ hit: r.hit, v: r.value }));
  process.exit(0);
}
if (argv[0] === "--self") { await selfTest(); console.log(JSON.stringify({ fails, oks })); process.exit(fails ? 1 : 0); }

async function selfTest() {
  const tc = await import("../gate/tileCache.mjs");
  const IN = path.join(SCRATCH, "in"), W = (f, s) => fs.writeFileSync(path.join(IN, f), s);
  fs.mkdirSync(path.join(IN, "list"), { recursive: true });
  W("a.json", '{"v":1}'); W("list/x.txt", "x");
  const codeFile = path.join(SCRATCH, "code", "builder.mjs");
  fs.mkdirSync(path.dirname(codeFile), { recursive: true });
  fs.writeFileSync(codeFile, `import "./helper.mjs";\nexport const v = 1;\n`);
  fs.writeFileSync(path.join(path.dirname(codeFile), "helper.mjs"), `export const h = 1;\n`);
  const code = [path.relative(ROOT, codeFile).replace(/\\/g, "/")];
  let builds = 0;
  const build = async () => {
    builds++;
    const a = JSON.parse(fs.readFileSync(path.join(IN, "a.json"), "utf8"));
    const extra = fs.existsSync(path.join(IN, "b.json")) ? JSON.parse(fs.readFileSync(path.join(IN, "b.json"), "utf8")) : null;
    const names = fs.readdirSync(path.join(IN, "list"));
    return { a, extra, names, arr: new Float32Array([1, 2, 3, NaN, -0]), m: new Map([["k", { deep: [1, , 3] }]]), times: { build: Math.random() } };
  };
  const ask = (opts = { o: 1 }, c = code, b = build) => tc.cached({ kind: "self", tile: "S", opts, code: c, build: b });
  let r = await ask();
  ok(!r.hit && r.stored && builds === 1, "a first ask builds and stores");
  r = await ask();
  ok(r.hit && builds === 1 && r.value.a.v === 1 && Object.is(r.value.arr[4], -0) && Number.isNaN(r.value.arr[3]) && !(1 in r.value.m.get("k").deep), "the second ask is a hit, the value exact (NaN, -0, a hole, a Map)");
  r = await ask({ o: 2 });
  ok(!r.hit && builds === 2, "other options: a miss");
  r = await ask({ o: 1, z: undefined });
  ok(r.hit, "the same options (an undefined key): a hit");
  W("a.json", '{"v":2}');
  r = await ask();
  ok(!r.hit && r.value.a.v === 2, "an input file edited: a miss, the new value");
  W("a.json", '{"v":1}');
  r = await ask();
  ok(r.hit && r.value.a.v === 1, "the edit reverted: the old object is a hit again");
  W("b.json", '{"b":1}');
  r = await ask();
  ok(!r.hit && r.value.extra?.b === 1, "a file the build only tested with existsSync appears: a miss");
  fs.unlinkSync(path.join(IN, "b.json"));
  r = await ask();
  ok(r.hit && r.value.extra === null, "...and gone again: a hit on the old object");
  W("list/y.txt", "y");
  r = await ask();
  ok(!r.hit && r.value.names.length === 2, "a file added to a folder the build listed: a miss");
  fs.unlinkSync(path.join(IN, "list/y.txt"));
  // an input edited WHILE the build runs: built from the old content, so never stored under the new one
  r = await ask({ mid: 1 }, code, async () => { const v = await build(); await new Promise((d) => setTimeout(d, 30)); W("a.json", '{"v":3}'); return v; });
  const r3 = await ask({ mid: 1 });
  ok(!r.stored && !r3.hit && r3.value.a.v === 3, "an input edited while the build ran: not stored (the next ask builds the new content)");
  W("a.json", '{"v":1}');
  // the code closure: an edit to a module the builder imports is a new key (codeHash is once a process: reset)
  tc._resetCodeMemo();
  fs.writeFileSync(path.join(path.dirname(codeFile), "helper.mjs"), `export const h = 2;\n`);
  const n0 = builds;
  r = await ask();
  ok(!r.hit && builds === n0 + 1, "an imported module of the builder's code edited: a miss");
  // uncacheable values
  r = await tc.cached({ kind: "self", tile: "F", opts: {}, code, build: async () => ({ f: () => 1 }) });
  const r2 = await tc.cached({ kind: "self", tile: "F", opts: {}, code, build: async () => ({ f: () => 1 }) });
  ok(!r.stored && !r2.hit && typeof r2.value.f === "function", "a value holding a function is never stored (the live value is returned)");
  class K { constructor() { this.x = 1; } }
  r = await tc.cached({ kind: "self", tile: "K", opts: {}, code, build: async () => ({ k: new K() }) });
  ok(!r.stored && tc.notPlain({ k: new K(), b: Buffer.from("x") }).length === 2, "a class instance (or a Buffer) is not plain: not stored");
  // a damaged object file
  const objs = () => fs.readdirSync(path.join(tc.DIR, "obj")).filter((n) => n.endsWith(".bin"));
  r = await ask();
  const key = r.key, f = path.join(tc.DIR, "obj", `${key}.bin`);
  const buf = fs.readFileSync(f); buf[buf.length - 3] ^= 0xff; fs.writeFileSync(f, buf);
  const n1 = builds;
  r = await ask();
  ok(!r.hit && builds === n1 + 1 && r.value.a.v === 1, "a damaged object file (sha1 of the payload) is a miss and is rebuilt");
  // verify mode: a cached value unlike a fresh build throws
  process.env.TILE_CACHE = "verify";
  let threw = null;
  try { await ask(undefined, code, async () => { builds++; return { a: { v: 999 } }; }); } catch (e) { threw = e.message; }
  ok(threw && /differs from a fresh build/.test(threw), "TILE_CACHE=verify: a cached value unlike a fresh build throws");
  delete process.env.TILE_CACHE;
  // off
  process.env.TILE_CACHE = "0";
  const nObj = objs().length, n2 = builds;
  r = await ask({ off: 1 }); await ask({ off: 1 });
  ok(builds === n2 + 2 && objs().length === nObj && r.off, "TILE_CACHE=0: every ask builds, nothing is stored");
  delete process.env.TILE_CACHE;
  // the race: 4 processes ask the same new tile at once. With the build lock (the default) one builds and the others
  // wait for its object; without it (TILE_CACHE_LOCK=0) all 4 build and store at once: the writes stay atomic
  const racers = (tile, env) => Promise.all([0, 1, 2, 3].map(() => new Promise((done) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), "--race", code[0], tile], { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; p.stdout.on("data", (b) => { out += b; }); p.on("close", (c) => done(c === 0 && /"ok":true/.test(out)));
  })));
  const nBuilds = (tile) => { try { return fs.readFileSync(path.join(SCRATCH, `builds-${tile}.txt`), "utf8").trim().split("\n").length; } catch { return 0; } };
  let race = await racers("L", {});
  ok(race.every(Boolean) && nBuilds("L") === 1, `4 processes ask one new tile at once: 1 builds, the others wait for it and read it back exact (${nBuilds("L")} builds, ${race.filter(Boolean).length}/4 exact)`);
  race = await racers("N", { TILE_CACHE_LOCK: "0" });
  const tmps = fs.readdirSync(path.join(tc.DIR, "obj")).filter((n) => n.endsWith(".tmp"));
  ok(race.every(Boolean) && nBuilds("N") === 4 && !tmps.length, `...without the lock, 4 processes store the same key at once: all read it back exact, no temp file left (${race.filter(Boolean).length}/4)`);
  // LRU: touch one, cap the cache to about one object: the touched one stays
  const all = objs().map((n) => path.join(tc.DIR, "obj", n));
  const old = new Date(Date.now() - 86400e3);
  for (const p of all) fs.utimesSync(p, old, old);
  r = await ask();                                                       // (a hit: its mtime is now)
  const keep = path.join(tc.DIR, "obj", `${r.key}.bin`);
  const res = tc.prune(fs.statSync(keep).size * 1.2);
  ok(r.hit && fs.existsSync(keep) && objs().length === 1 && res.evicted === all.length - 1, `LRU: capped to one object, the ${all.length - 1} older ones evicted, the one just hit kept`);
  // the tracer still sees a hit's inputs and code
  const tr = path.join(SCRATCH, "trace");
  fs.rmSync(tr, { recursive: true, force: true });
  const env = { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(path.join(ROOT, "tools/gate/trace.mjs")).href}`, GATE_TRACE_OUT: tr, GATE_TRACE_ROOT: ROOT };
  const first = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--traced-hit", code[0]], { env, encoding: "utf8" });
  fs.rmSync(tr, { recursive: true, force: true });
  const second = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--traced-hit", code[0]], { env, encoding: "utf8" });
  let recs = "";
  try { for (const n of fs.readdirSync(tr)) recs += fs.readFileSync(path.join(tr, n), "utf8"); } catch {}
  ok(/"hit":false/.test(first.stdout) && /"hit":true/.test(second.stdout) && /^r data\/tiles\/manifest\.json$/m.test(recs), `on a hit the tracer still records the build's input (data/tiles/manifest.json)${/"hit":true/.test(second.stdout) ? "" : ` (no hit: ${second.stdout.trim()} ${second.stderr.trim().slice(-200)})`}`);
}

// ------------------------------------------------------------------------------------------------ A: the self test
fs.rmSync(SCRATCH, { recursive: true, force: true });
{
  const p = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--self", ...(QUIET ? ["--quiet"] : [])], { cwd: ROOT, env: { ...process.env, TILE_CACHE_DIR: path.join(SCRATCH, "store"), TILE_CACHE: "", GATE_ROW: "tilecache-self" }, encoding: "utf8" });
  process.stdout.write(p.stdout.split("\n").filter((l) => !l.startsWith("{")).join("\n"));
  const last = p.stdout.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  const r = last ? JSON.parse(last) : null;
  ok(p.status === 0 && r && r.fails === 0, `the mechanism (a synthetic build, a scratch cache): ${r ? `${r.oks} checks pass, ${r.fails} fail` : `no result: ${p.stderr.trim().slice(-300)}`}`);
}
fs.rmSync(SCRATCH, { recursive: true, force: true });

// ------------------------------------------------------------------------------------------------ B: parity on real tiles
// (this row tests the cache, so it runs it even in a --no-tile-cache gate: then in a scratch store, cold, removed after)
const PARITY_SCRATCH = /^(0|off)$/.test(process.env.TILE_CACHE || "") ? path.join(SCRATCH, "parity") : null;
if (PARITY_SCRATCH) { process.env.TILE_CACHE = ""; process.env.TILE_CACHE_DIR = PARITY_SCRATCH; }
process.on("exit", () => { if (PARITY_SCRATCH) fs.rmSync(SCRATCH, { recursive: true, force: true }); });
{
  const tc = await import("../gate/tileCache.mjs");
  const tb = await import("../gate/tileBuild.mjs");
  const { readFile } = await import("node:fs/promises");
  globalThis.location ??= { search: "" };
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => { const url = new URL(String(u)); if (url.protocol !== "file:") return nodeFetch(u, o); try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); } };
  if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
  const { buildTileData } = await import(pathToFileURL(path.join(ROOT, "viewer/tileData.js")).href);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tiles/manifest.json"), "utf8"));
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/boot3/entries.json"), "utf8"));
  const base = pathToFileURL(path.join(ROOT, "data/tiles") + "/").href;
  const ti = argv.indexOf("--tiles"), TILES = ti >= 0 ? argv[ti + 1].split(",") : ["I6", "H6", "E9"];
  if (tc.mode() === "off") ok(false, "the parity check needs the cache on (TILE_CACHE / --no-tile-cache)");
  const quiet = async (fn) => { const l = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = l; } };
  for (const [i, T] of TILES.entries()) {
    const entry = { ...entries.find((e) => !e.lite).entry, ...manifest.tiles.find((t) => t.name === T), cache: false };
    const t0 = performance.now();
    const viaCache = await quiet(() => tb.tileData({ ...entry, keepNet: true }, base));
    const first = tb.lastInfo, tCache = performance.now() - t0;
    const t1 = performance.now();
    const live = await quiet(() => buildTileData({ ...entry, keepNet: true }, base));
    const tFresh = performance.now() - t1;
    const { net, hm, deckRings, ...plainLive } = live;
    const { net: cNet, hm: cHm, deckRings: cRings, ...plainCached } = viaCache;
    const hA = tc.canonicalHash(plainCached), hB = tc.canonicalHash(plainLive);
    ok(hA === hB, `${T}: the build through the cache (${first.hit ? "a hit" : "a miss, stored"}, ${(tCache / 1000).toFixed(1)} s) == a fresh build (${(tFresh / 1000).toFixed(1)} s), byte for byte (sha256 ${hA.slice(0, 12)}${hA === hB ? "" : ` vs ${hB.slice(0, 12)}`})`);
    ok(tc.canonicalHash(cRings) === tc.canonicalHash(deckRings ?? null) && tc.canonicalHash(cNet.streetModel?.segments ?? null) === tc.canonicalHash(net?.streetModel?.segments ?? null),
      `${T}: keepNet's kept parts == the live ones (deckRings: ${deckRings?.length ?? 0}, net.streetModel.segments: ${net?.streetModel?.segments?.length ?? 0})`);
    const hmKeys = (m) => Object.keys(m).sort().join(",");
    ok(tc.canonicalHash({ h: cHm.h, y: cHm.y, orig: cHm.orig }) === tc.canonicalHash({ h: hm.h, y: hm.y, orig: hm.orig }) && hmKeys(cHm) === hmKeys(hm) && cHm.ground(entry.bounds.x[0] + 37.3, entry.bounds.z[0] + 51.7) === hm.ground(entry.bounds.x[0] + 37.3, entry.bounds.z[0] + 51.7),
      `${T}: keepNet's hm (Heightmap.from(hdr, y, orig)) == the live Heightmap (fields ${hmKeys(hm)}, a sample of ground())`);
    let threw = false;
    try { void cNet.locate; } catch { threw = true; }
    ok(threw, `${T}: a part of keepNet's net the cache does not keep (net.locate) is a loud error, not undefined`);
    if (i === 0) {
      const plain = await quiet(() => buildTileData(entry, base));
      ok(tc.canonicalHash(plain) === hB, `${T}: keepNet changes nothing but net / hm / deckRings (so both askers share one cache entry)`);
    }
    const again = await quiet(() => tb.tileData(entry, base));
    ok(tb.lastInfo.hit && tc.canonicalHash(again) === hA, `${T}: the second ask is a hit (${tb.lastInfo.ms.toFixed(0)} ms) with the same bytes`);
  }
}

console.log(fails ? `${fails} tile cache check(s) FAILED (of ${fails + oks})` : `tile cache checks pass (${oks})`);
process.exit(fails ? 1 : 0);
