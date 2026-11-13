// Tile worker: builds a tile's CPU data off the main thread (see tileData.js).
// The browser loads the bundled copy, tileWorker.bundle.js (node tools/build_worker.mjs), because module
// workers don't see the page's import map and vendor/roads imports three's earcut by bare name.
// Built tiles are kept in IndexedDB (viewer/tileCache.js): a second visit reads them back instead (?tilecache=0: off).
import { buildTileData, buildLiteData, transferables } from "./tileData.js";
import { cached } from "./tileCache.js";

self.onmessage = async (e) => {
  const { id, entry, base, lite } = e.data;
  try {
    const r = await cached(entry, lite, base, () => (lite ? buildLiteData : buildTileData)(entry, base));
    self.postMessage({ id, r }, [...transferables(r)]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.stack || err) });
  }
};
