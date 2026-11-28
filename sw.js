// THE CITY'S SERVICE WORKER (docs/BOOT.md, boot2 2026-11-15): return visits read the city's data from Cache Storage
// instead of the network (~150 MB per boot; the HTTP cache revalidates every model / script: hundreds of round trips).
//
// Safe invalidation: only files listed in /asset_hashes.json (tools/asset_hashes.mjs, written by the Vercel build:
// path -> content hash) are cached, each under its path + hash; a deploy that changes a file changes its hash, so the
// old copy is never served again and is pruned. The list is fetched fresh (no-store) on every page load, before the
// page's own requests. No list (a local dev server), or a file not in it (the code: viewer/*.js, the HTML): straight
// to the network, untouched. three.js and meshoptimizer from the CDN are pinned versions: cached as they are.
//   ?sw=0 on the page: unregister and clear (viewer/loader/loader.js), the plain network as before.
//
// Brotli siblings (rule docs/rules/asset-compression.md, claude/assetgz): the list's `br` map (path -> raw size) names
// the files the Vercel build also wrote as <path>.br (brotli 11, served with Content-Encoding: br, vercel.json). For
// those the worker fetches the sibling, and keeps it only if the decoded bytes have the raw size AND the content hash;
// any difference (the CDN re-encoding it, a missing sibling, an old copy) = the plain file, and the siblings are off
// until the next page load. ?assetbr=old on the page: the plain files, as before. The cached copy is the same.
const CACHE = "uccle-assets-1";
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(three@0\.187\.0|meshoptimizer@1\.2\.0)\//;
let hashes = null, brs = null, hashesP = null, loaded = false, brOff = false, brOld = false;

const loadHashes = () => {
  hashesP = fetch("/asset_hashes.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { hashes = j && j.files ? j.files : null; brs = (hashes && j.br) || null; loaded = true; if (hashes) prune(); return hashes; })
    .catch(() => { loaded = true; brs = null; return (hashes = null); });
  return hashesP;
};

async function prune() {
  const c = await caches.open(CACHE);
  for (const req of await c.keys()) {
    const u = new URL(req.url);
    if (u.origin !== location.origin) continue;
    const h = u.searchParams.get("__h");
    if (!h || hashes[u.pathname] !== h) await c.delete(req);
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("uccle-") && k !== CACHE) await caches.delete(k);
  await self.clients.claim();                 // the first visit's own later requests already fill the cache
  // (the first visit's page loaded before this worker: read its ?assetbr= here)
  for (const c of await self.clients.matchAll({ type: "window" })) if (/[?&]assetbr=old(?:&|$)/.test(c.url)) brOld = brOff = true;
})()));

const TYPES = { glb: "model/gltf-binary", gltf: "model/gltf+json", json: "application/json", geojson: "application/geo+json", wav: "audio/wav" };
async function sha12(buf) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-1", buf));
  let s = ""; for (let i = 0; i < 6; i++) s += d[i].toString(16).padStart(2, "0");
  return s;
}
/** the brotli sibling, decoded by the browser's network stack, checked against the raw size + content hash; null = use the plain file */
async function viaBr(path, h, size) {
  try {
    const res = await fetch(`${path}.br?__h=${h}`);
    if (!res.ok || res.status !== 200) throw new Error(`status ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== size || (await sha12(buf)) !== h) throw new Error(`decoded ${buf.byteLength} B, want ${size} B / ${h}`);
    const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    return new Response(buf, { status: 200, headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "content-length": String(size) } });
  } catch (e) {
    if (!brOff) console.warn(`[sw] brotli sibling of ${path} refused (${e.message}): plain files until the next page load`);
    brOff = true;
    return null;
  }
}
// The tag of a listed file is its content hash: every answer from here carries ETag "h-<hash>", and a HEAD of a listed
// file is answered from the list (no request). The tile cache (viewer/tileCache.js) stores a dependency's tag from
// its GET and re-checks it with a HEAD: both now pass here and agree exactly when the content does (a sibling's or a
// cached copy's own ETag would never match the plain file's). Without this worker both go to the network, as before.
const tagged = (res, h) => {
  if (brOld || !res.ok) return res;
  const hd = new Headers(res.headers); hd.set("etag", `"h-${h}"`);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: hd });
};

async function cached(req, key, br, h) {
  const c = await caches.open(CACHE);
  const hit = await c.match(key);
  if (hit) return h ? tagged(hit, h) : hit;
  const res = (br && !brOff && (await viaBr(br.path, br.h, br.size))) || (await fetch(req));
  if (res.ok && res.status === 200) c.put(key, res.clone()).catch(() => { /* quota: just the network next time */ });
  return h ? tagged(res, h) : res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if ((req.method !== "GET" && req.method !== "HEAD") || req.headers.has("range")) return;
  const u = new URL(req.url);
  // a page load: refresh the hash list first (in parallel with the page itself)
  if (req.mode === "navigate") { loaded = false; hashes = null; brs = null; brOld = brOff = /[?&]assetbr=old(?:&|$)/.test(u.search); loadHashes(); return; }   // (the page's requests wait for it)
  if (req.method === "HEAD" && brOld) return;
  if (CDN.test(req.url)) { if (req.method === "GET") e.respondWith(cached(req, req.url)); return; }
  // (a lone ?v=<stamp> build stamp, the tiles' and the AO maps': the content hash below is the stricter key, so it is
  // handled like the bare path; any other query: untouched. ?assetbr=old: every query untouched, as before)
  if (u.origin !== location.origin || (u.search && (brOld || !/^\?v=[\w.-]+$/.test(u.search)))) return;
  if (loaded && !(hashes && hashes[u.pathname])) return;          // known not cached: untouched (no SW in the way)
  e.respondWith((async () => {
    const H = hashes ?? (await (hashesP ?? loadHashes()));
    const h = H && H[u.pathname];
    if (!h) return fetch(req);
    if (req.method === "HEAD") return new Response(null, { status: 200, headers: { etag: `"h-${h}"` } });
    const size = brs && brs[u.pathname];
    return cached(req, `${u.pathname}?__h=${h}`, size ? { path: u.pathname, h, size } : null, h);
  })());
});
