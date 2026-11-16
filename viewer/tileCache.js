// TILE CACHE (2026-11-13, perf audit): a built tile (tileData.js, ~37 MB of typed arrays for a full tile) kept in the
// browser's IndexedDB, so a second visit skips the worker build: I6 builds in ~3,000 ms, reads back in ~40 ms.
// Runs INSIDE the tile worker (tileWorker.js): the main thread never waits on it.
//
// Never stale (each must match, else the tile is rebuilt):
//   - the KEY: the tile entry as the page sends it (its files carry the manifest's ?v= build stamp, and every option
//     flag: kit, grass, rail, hide...), lite or full, the data base URL, and a hash of THIS worker's code (any change
//     to the tile builder = a new bundle = new keys);
//   - the DEPENDENCIES: every other file the build fetched without a ?v= stamp (rail.json, overrides.json, the hero
//     bridges' notes, osm_grass.json, street life...): their ETag / Last-Modified are stored with the tile and
//     re-checked (HEAD, no-cache) on a hit. A file that gives neither header makes the tile uncacheable.
// Size: at most LIMIT bytes, oldest used first out. Any IndexedDB failure (quota, private mode) = no cache, never an
// error. On by default since boot2 (2026-11-15, docs/BOOT.md: return visits' cover 30-31 s -> 20-25 s); ?tilecache=0 in the page: off.

const DB = "uccle-tiles", STORE = "tiles", META = "meta", VERSION = 1;   // tiles: key -> { key, r }; meta: key -> { key, at, bytes, deps, name }
const LIMIT = 600 * 1048576;            // ~16 full tiles

let dbP = null;
function db() {
  // (a database opened elsewhere without our stores, e.g. by a console check: upgraded one version up to add them)
  const open = (v) => new Promise((res) => {
    try {
      const q = indexedDB.open(DB, v);
      q.onupgradeneeded = () => { for (const s of [STORE, META]) if (!q.result.objectStoreNames.contains(s)) q.result.createObjectStore(s, { keyPath: "key" }); };
      q.onsuccess = () => {
        const d = q.result;
        // (perfgame round 3) another worker's upgrade waits for every open connection to close: close ours (the next
        // request reopens), else its open hung until the 8 s deadline and the cache went off for the session
        d.onversionchange = () => { d.close(); dbP = null; };
        if ([STORE, META].every((s) => d.objectStoreNames.contains(s))) return res(d);
        const next = d.version + 1; d.close(); open(next).then(res);
      };
      q.onerror = () => res(null);
      q.onblocked = () => res(null);
    } catch { res(null); }
  });
  return (dbP ||= new Promise((res) => {
    try { const q = indexedDB.open(DB); q.onsuccess = () => { const v = Math.max(VERSION, q.result.version); q.result.close(); open(v).then(res); }; q.onerror = () => res(null); q.onblocked = () => res(null); }
    catch { res(null); }
  }));
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/** FNV-1a 32-bit over a string, twice with different seeds -> 16 hex chars */
function hash(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x01000197); }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

let codeP = null;
/** this worker's own code, hashed once (the bundle the browser loaded) */
// (perfgame round 4: the hash tools/build_worker.mjs writes into the bundle, at once; the fetch only for an old bundle)
const codeHash = () => (codeP ||= self.__TILE_CODE_HASH ? Promise.resolve(self.__TILE_CODE_HASH) : fetch(self.location.href, { cache: "no-cache" }).then((r) => r.text()).then(hash).catch(() => null));

export function cacheKey(entry, lite, base, code) {
  const { cache, cacheStore, ...e } = entry;
  return hash(JSON.stringify({ e, lite: !!lite, base, code }));
}

// (perfgame round 4: a missing optional file (404) is a stable state too: "status:404", re-checked like a tag; before,
// one optional file a tile looks for and does not find made the whole tile uncacheable)
const tagOf = (r) => (!r.ok ? `status:${r.status}` : r.headers.get("etag") || r.headers.get("last-modified") || null);
const stamped = (url) => /[?&]v=/.test(url);

// fetches made while a build runs (every build the worker runs at once records them: a superset, never a miss), and
// every unstamped file this worker ever fetched (shared files are fetched ONCE per worker, by the first build: rail.json,
// overrides.json...; later tiles use them without fetching, so each tile depends on all of them)
const recording = new Set();
const everFetched = new Map();
const realFetch = self.fetch.bind(self);
self.fetch = async (input, init) => {
  const r = await realFetch(input, init);
  {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    if (!url) return r;
    if (!stamped(url)) { everFetched.set(url, tagOf(r)); for (const deps of recording) deps.set(url, tagOf(r)); }
  }
  return r;
};

/** A cached tile for this request, or null. */
export async function cacheGet(entry, lite, base) {
  if (entry.cache !== true) return null;
  try {
    const [d, code] = await Promise.all([db(), codeHash()]);
    if (!d || !code) return null;
    const key = cacheKey(entry, lite, base, code);
    const meta = await req(d.transaction(META).objectStore(META).get(key));
    if (!meta) { say(entry, lite, "miss (not cached)", key); return null; }
    // the unstamped files it was built from: unchanged?
    for (const [url, tag] of meta.deps) {
      const r = await realFetch(url, { method: "HEAD", cache: "no-cache" }).catch(() => null);
      if (!r || !r.ok || tagOf(r) !== tag) { say(entry, lite, `miss (${url} changed: ${tag} -> ${r && tagOf(r)})`); drop(d, [key]); return null; }
    }
    const rec = await req(d.transaction(STORE).objectStore(STORE).get(key));
    if (!rec) { drop(d, [key]); return null; }
    d.transaction(META, "readwrite").objectStore(META).put({ ...meta, at: Date.now() });   // recently used (the small record only)
    return rec.r;
  } catch (e) { say(entry, lite, "miss (error " + (e?.message || e) + ")"); return null; }
}
const DEBUG = false;          // true: log why a tile missed the cache (worker console)
function say(entry, lite, msg, key = "") { if (DEBUG) console.log(`[tilecache] ${entry.name}${lite ? " (far)" : ""}: ${msg} ${key}`); }

// polish1 (2026-11-15): an IndexedDB that never answers (seen after a Chrome crash: the open / get fired no event at
// all) held the start tile forever, the boot stuck on "Compiling shaders" (stage "tiles"). Every cache step now has a
// deadline: past it the tile is a miss and is built (the cache is skipped for the rest of the session).
let dead = false;
const READ_MS = 2500;
const deadline = (p, ms, what) => Promise.race([p, new Promise((res) => setTimeout(() => { if (!dead) console.warn(`[tilecache] ${what}: no answer in ${ms} ms, cache off for this session`); dead = true; res(null); }, ms))]);

// ------------------------------------------------------------------------------------------------ the Cache API store
// perfgame round 4 (?tilecache=idb: the IndexedDB store above, as before). The IndexedDB store never answered in the
// play sessions of 2026-11-16 (every read past its deadline, in every worker: the cache was off, the start tile built
// again on every visit, 19 s for E4). Its weak points: up to 4 workers opening / upgrading the same database, ~37 MB
// readwrite transactions (a full tile) that every read queues behind, and the dependency check's HEAD requests one
// after another inside the read. The Cache API has no transactions, no versions, no blocking between workers: a tile
// is ONE Response body (viewer/tilePack.js: its typed arrays back to back + a JSON skeleton) and a small meta entry
// (its dependencies' ETags); the dependencies are checked IN PARALLEL and each URL once per worker session; the write
// happens after the tile went back to the page (packed first, then put in the background).
import { packTile, unpackTile } from "./tilePack.js";
if (typeof caches !== "undefined") caches.delete("tilecache-v1").catch(() => {});   // (v1: the packer without shared references)
const CNAME = "tilecache-v2", CAP_BYTES = 800 * 1048576;   // (~16 full tiles + the far ring)
let warnedNull = false;
const urlOf = (key, what) => `${self.location.origin}/__tilecache/${key}/${what}`;
const tagMemo = new Map();          // url -> Promise<tag> (one HEAD per url per worker session)
const tagNow = (url) => { if (!tagMemo.has(url)) tagMemo.set(url, realFetch(url, { method: "HEAD", cache: "no-cache" }).then((r) => tagOf(r)).catch(() => null)); return tagMemo.get(url); };
async function capiGet(entry, lite, base) {
  if (entry.cache !== true || typeof caches === "undefined") return null;
  const code = await codeHash(); if (!code) return null;
  const key = cacheKey(entry, lite, base, code), c = await caches.open(CNAME);
  const metaR = await c.match(urlOf(key, "meta"));
  if (!metaR) { say(entry, lite, "miss (not cached)", key); return null; }
  const meta = await metaR.json();
  const tags = await Promise.all(meta.deps.map(([u]) => tagNow(u)));
  if (meta.deps.some(([, t], i) => tags[i] !== t)) { say(entry, lite, "miss (a dependency changed)"); c.delete(urlOf(key, "meta")); c.delete(urlOf(key, "tile")); return null; }
  const res = await c.match(urlOf(key, "tile"));
  if (!res) return null;
  const r = unpackTile(await res.arrayBuffer());
  c.put(urlOf(key, "meta"), new Response(JSON.stringify({ ...meta, at: Date.now() }), { headers: { "content-type": "application/json" } })).catch(() => {});   // (recently used)
  return r;
}
function capiPut(entry, lite, base, r, deps) {
  if (entry.cache !== true || typeof caches === "undefined") return;
  if ([...deps.values()].some((t) => t == null)) {                         // a dependency we cannot re-check: not cached
    if (!warnedNull) { warnedNull = true; console.warn(`[tilecache] ${entry.name}${lite ? " (far)" : ""} not stored: no ETag / Last-Modified on ${[...deps].filter(([, t]) => t == null).map(([u]) => u).slice(0, 4).join(", ")}`); }
    return;
  }
  let blob;
  try { blob = packTile(r); } catch (e) { say(entry, lite, "not stored: " + e.message); return; }   // (packed now: the caller transfers r's buffers)
  (async () => {
    const code = await codeHash(); if (!code) return;
    const key = cacheKey(entry, lite, base, code), c = await caches.open(CNAME);
    await c.put(urlOf(key, "tile"), new Response(blob, { headers: { "content-type": "application/octet-stream" } }));
    await c.put(urlOf(key, "meta"), new Response(JSON.stringify({ name: entry.name, lite: !!lite, at: Date.now(), bytes: blob.byteLength, deps: [...deps.entries()] }), { headers: { "content-type": "application/json" } }));
    // over CAP_BYTES: the least recently used go (bytes, not a count: a far tile is ~2-4 MB, a full one ~40 MB; a count
    // cap let the far ring push out the full tiles)
    const metas = (await c.keys()).filter((q) => q.url.endsWith("/meta"));
    const info = await Promise.all(metas.map(async (q) => { const m = await (await c.match(q)).json(); return [q.url, m.at || 0, m.bytes || 0]; }));
    let total = info.reduce((n, x) => n + x[2], 0);
    if (total > CAP_BYTES) {
      info.sort((a, b) => a[1] - b[1]);
      for (const [u, , b] of info) { if (total <= CAP_BYTES) break; c.delete(u); c.delete(u.replace(/\/meta$/, "/tile")); total -= b; }
    }
  })().catch((e) => console.warn(`[tilecache] ${entry.name}${lite ? " (far)" : ""} not stored: ${e?.message || e}`));
}

/** Build through the cache: returns the result (the caller then transfers its buffers). */
export async function cached(entry, lite, base, build) {
  if (entry.cacheStore !== "idb") {
    // (the deadline stays as a safety net: a store that does not answer is a miss, not a stuck tile)
    // (round 4: no "cache off" on a slow read any more: the read's wall time includes OTHER tiles' builds on this worker
    // (a build runs for seconds without yielding; this worker holds several requests), which is what fired the 2.5-8 s
    // deadlines on 2026-11-16, with an empty cache too. A read past 30 s is a miss for that tile only)
    const hit = await Promise.race([capiGet(entry, lite, base).catch(() => null), new Promise((res) => setTimeout(() => res(null), 30000))]);
    if (hit) { hit.times = { ...(hit.times || {}), cache: true }; return hit; }
    const deps = new Map();
    recording.add(deps);
    let r;
    try { r = await build(); } finally { recording.delete(deps); }
    for (const [u, tg] of everFetched) if (!deps.has(u)) deps.set(u, tg);
    if (!dead) capiPut(entry, lite, base, r, deps);
    return r;
  }
  if (dead) entry = { ...entry, cache: false };
  // (perfgame round 3: 2.5 s, was 8: a hit answers in ~40-300 ms; an IndexedDB that hangs held the start tile 8 s)
  const hit = await deadline(cacheGet(entry, lite, base), READ_MS, `read ${entry.name}`);
  if (hit) { hit.times = { ...(hit.times || {}), cache: true }; return hit; }
  const deps = new Map();
  recording.add(deps);
  let r;
  try { r = await build(); } finally { recording.delete(deps); }
  for (const [u, tg] of everFetched) if (!deps.has(u)) deps.set(u, tg);
  if (entry.cache === true && !dead) await deadline(cachePut(entry, lite, base, r, deps).catch(() => {}), 8000, `write ${entry.name}`);
  return r;
}

function byteSize(o, seen = new Set()) {
  if (!o || typeof o !== "object" || seen.has(o)) return 0;
  seen.add(o);
  if (ArrayBuffer.isView(o)) return o.byteLength;
  if (o instanceof ArrayBuffer) return o.byteLength;
  let n = 0;
  for (const v of Array.isArray(o) ? o : Object.values(o)) n += byteSize(v, seen);
  return n;
}

async function cachePut(entry, lite, base, r, deps) {
  if ([...deps.values()].some((t) => t == null)) { say(entry, lite, "not stored: a file without ETag / Last-Modified: " + [...deps].filter(([, t]) => t == null).map(([u]) => u).join(", ")); return; }          // a dependency we cannot re-check: not cached
  const [d, code] = await Promise.all([db(), codeHash()]);
  if (!d || !code) return;
  const key = cacheKey(entry, lite, base, code), bytes = byteSize(r);
  const tx = d.transaction([STORE, META], "readwrite");
  tx.objectStore(STORE).put({ key, r });                                   // cloned now, before the caller transfers
  tx.objectStore(META).put({ key, name: entry.name, lite: !!lite, at: Date.now(), bytes, deps: [...deps.entries()] });
  await done(tx);
  // over the limit: the least recently used go (the small records only are read)
  const all = (await req(d.transaction(META).objectStore(META).getAll())).sort((a, b) => a.at - b.at);
  let total = all.reduce((n, x) => n + (x.bytes || 0), 0);
  const out = [];
  for (const x of all) { if (total <= LIMIT) break; if (x.key === key) continue; out.push(x.key); total -= x.bytes || 0; }
  if (out.length) drop(d, out);
}

const done = (tx) => new Promise((res) => { tx.oncomplete = res; tx.onerror = res; tx.onabort = res; });
/** remove these keys from both stores (best effort) */
function drop(d, keys) {
  try { const tx = d.transaction([STORE, META], "readwrite"); for (const k of keys) { tx.objectStore(STORE).delete(k); tx.objectStore(META).delete(k); } } catch {}
}
