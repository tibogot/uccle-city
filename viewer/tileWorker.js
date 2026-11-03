// Tile worker: builds a tile's CPU data off the main thread (see tileData.js).
// The browser loads the bundled copy, tileWorker.bundle.js (node tools/build_worker.mjs), because module
// workers don't see the page's import map and vendor/roads imports three's earcut by bare name.
import { buildTileData, transferables } from "./tileData.js";

self.onmessage = async (e) => {
  const { id, entry, base } = e.data;
  try {
    const r = await buildTileData(entry, base);
    self.postMessage({ id, r }, [...transferables(r)]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.stack || err) });
  }
};
