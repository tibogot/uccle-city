// Tile worker: builds a tile's CPU data off the main thread (see tileData.js).
// The browser loads the bundled copy, tileWorker.bundle.js (node tools/build_worker.mjs), because module
// workers don't see the page's import map and vendor/roads imports three's earcut by bare name.
// Built tiles are kept in IndexedDB (viewer/tileCache.js): a second visit reads them back instead (?tilecache=0: off).
import { buildTileData, buildLiteData, transferables } from "./tileData.js";
import { cached } from "./tileCache.js";

// errors outside a build's own try (a rejected promise nobody awaits, a throw in a callback) never reached the page:
// forwarded as { fatal } (main.js: console.error + the loader's error line)
self.addEventListener("unhandledrejection", (e) => self.postMessage({ fatal: String(e.reason?.stack || e.reason) }));
self.addEventListener("error", (e) => self.postMessage({ fatal: String(e.error?.stack || e.message) }));

self.onmessage = async (e) => {
  const { id, entry, base, lite } = e.data;
  try {
    const r = await cached(entry, lite, base, () => (lite ? buildLiteData : buildTileData)(entry, base));
    self.postMessage({ id, r }, [...transferables(r)]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.stack || err) });
  }
};
