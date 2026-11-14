// The tile worker's whole build (viewer/tileData.js buildTileData) in node, with the city's default entry flags
// (main.js tileData: measured surfaces, pits, rail + round-2 bridges, rail car fixes, neighbour ground), so the road
// levels / drive surface can be checked without a browser (road fix round 2, docs/collisions/ROAD_FIX2.md).
//   node --import ./tools/road_audit/register.mjs tools/roadfix/<script>.mjs
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// fetch(file: URL) for the worker code (node's fetch has no file: scheme)
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(String(u));
  if (url.protocol !== "file:") return nodeFetch(u, o);
  try {
    const buf = await readFile(fileURLToPath(new URL(url.pathname, "file:///")));
    return new Response(buf, { status: 200 });
  } catch { return new Response(null, { status: 404 }); }
};
// land cover (viewer/landcover.js) paints on an OffscreenCanvas: a no-op stand-in (the land cover is not checked here)
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
  getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
const { buildTileData } = await import(pathToFileURL(join(ROOT, "viewer/tileData.js")).href);
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
export const tiles = manifest.tiles.filter((t) => t.status === "built");
export const entryOf = (T) => tiles.find((t) => t.name === T);
const BASE = pathToFileURL(join(ROOT, "data/tiles") + "/").href;

/** buildTileData for tile T with the city's defaults; opts override entry flags (e.g. { padRoads: false }) */
export async function buildTile(T, opts = {}) {
  const e = entryOf(T);
  if (!e) throw new Error(`no built tile ${T}`);
  const entry = { ...e, hide: ["https://databrussels.be/id/building/1587133"], ponds: [], surface: true, pits: true, kit: false, streetlife: false, grass: false,
    rail: true, bridges2: true, railFix: true, driveLegacy: false, driveKeepHidden: false, padRoads: true, ...opts };
  return buildTileData(entry, BASE);
}
