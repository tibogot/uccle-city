// THE CITY'S SERVICE WORKER (docs/BOOT.md, boot2 2026-11-15): return visits read the city's data from Cache Storage
// instead of the network (~150 MB per boot; the HTTP cache revalidates every model / script: hundreds of round trips).
//
// Safe invalidation: only files listed in /asset_hashes.json (tools/asset_hashes.mjs, written by the Vercel build:
// path -> content hash) are cached, each under its path + hash; a deploy that changes a file changes its hash, so the
// old copy is never served again and is pruned. The list is fetched fresh (no-store) on every page load, before the
// page's own requests. No list (a local dev server), or a file not in it (the code: viewer/*.js, the HTML): straight
// to the network, untouched. three.js and meshoptimizer from the CDN are pinned versions: cached as they are.
//   ?sw=0 on the page: unregister and clear (viewer/loader/loader.js), the plain network as before.
const CACHE = "uccle-assets-1";
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(three@0\.187\.0|meshoptimizer@1\.2\.0)\//;
let hashes = null, hashesP = null, loaded = false;

const loadHashes = () => {
  hashesP = fetch("/asset_hashes.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { hashes = j && j.files ? j.files : null; loaded = true; if (hashes) prune(); return hashes; })
    .catch(() => { loaded = true; return (hashes = null); });
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
})()));

async function cached(req, key) {
  const c = await caches.open(CACHE);
  const hit = await c.match(key);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) c.put(key, res.clone()).catch(() => { /* quota: just the network next time */ });
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const u = new URL(req.url);
  // a page load: refresh the hash list first (in parallel with the page itself)
  if (req.mode === "navigate") { loaded = false; hashes = null; loadHashes(); return; }   // (the page's requests wait for it)
  if (CDN.test(req.url)) { e.respondWith(cached(req, req.url)); return; }
  if (u.origin !== location.origin || u.search) return;
  if (loaded && !(hashes && hashes[u.pathname])) return;          // known not cached: untouched (no SW in the way)
  e.respondWith((async () => {
    const H = hashes ?? (await (hashesP ?? loadHashes()));
    const h = H && H[u.pathname];
    if (!h) return fetch(req);
    return cached(req, `${u.pathname}?__h=${h}`);
  })());
});
