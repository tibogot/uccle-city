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
// error. Opt-in: ?tilecache=1 in the page (entry.cache === true); off otherwise.

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
        if ([STORE, META].every((s) => d.objectStoreNames.contains(s))) return res(d);
        const next = d.version + 1; d.close(); open(next).then(res);
      };
      q.onerror = () => res(null);
      q.onblocked = () => res(null);
    } catch { res(null); }
  });
  return (dbP ||= new Promise((res) => {
    try { const q = indexedDB.open(DB); q.onsuccess = () => { const v = Math.max(VERSION, q.result.version); q.result.close(); open(v).then(res); }; q.onerror = () => res(null); }
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
const codeHash = () => (codeP ||= fetch(self.location.href, { cache: "no-cache" }).then((r) => r.text()).then(hash).catch(() => null));

export function cacheKey(entry, lite, base, code) {
  const { cache, ...e } = entry;
  return hash(JSON.stringify({ e, lite: !!lite, base, code }));
}

const tagOf = (r) => r.headers.get("etag") || r.headers.get("last-modified") || null;
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

/** Build through the cache: returns the result (the caller then transfers its buffers). */
export async function cached(entry, lite, base, build) {
  const hit = await cacheGet(entry, lite, base);
  if (hit) { hit.times = { ...(hit.times || {}), cache: true }; return hit; }
  const deps = new Map();
  recording.add(deps);
  let r;
  try { r = await build(); } finally { recording.delete(deps); }
  for (const [u, tg] of everFetched) if (!deps.has(u)) deps.set(u, tg);
  if (entry.cache === true) await cachePut(entry, lite, base, r, deps).catch(() => {});
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
