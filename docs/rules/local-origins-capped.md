---
status: provisional
added: 2026-11-24
check: `tourbundle` (tools/audit/tourBundleCheck.mjs: a port outside the pool is refused; /sw.js on a local check is the self-removing worker; --keep-sw serves the real file)
---
**Rule.** Local checks serve the city only on the fixed port pool 8837-8842 (`tools/tour/serve.mjs` refuses any other port; `--any-port` only for a tool that runs its own throwaway Chrome profile: allocBudget, tourBundleCheck). On local checks `/sw.js` is a worker that deletes its asset caches and unregisters itself (`--keep-sw` serves the real one for a test that needs it); the live site keeps its sw.js. Job briefs name a port from the pool, not a free one.

**Why.** On 2026-11-24 the owner's C: had 57 GB free; the DevTools Chrome profile held 43 GB, 41 GB of it in Service Worker/CacheStorage. Each localhost port is its own browser origin, and each origin keeps its own tile cache (viewer/tileCache.js CAP_BYTES = 800 MB) plus the service worker's uncapped asset copy. Tours and agents had used about 50 ports, so about 50 copies of the city. Cleared by hand (only that folder, with only the DevTools Chrome closed): 97 GB free.
