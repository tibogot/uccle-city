// Load one tile from data/tiles and run the tile worker's road stage on it (viewer/roadBuild.js), exactly as the
// worker does (same overrides, same order). Used by road_audit.mjs and the lab's capture scripts.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { buildRoadData, applyRoadOverrides } = await imp("viewer/roadBuild.js");
const { Heightmap } = await imp("viewer/heightmap.js");
const { roofGrid, onRoof } = await imp("viewer/tileData.js");

let manifest = null, overrides = null;
export const tileEntry = (T) => {
  manifest ??= JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  return manifest.tiles.find((t) => t.name === T);
};
export const allTiles = () => { tileEntry("I6"); return manifest.tiles.filter((t) => t.status !== "missing").map((t) => t.name); };
const json = (p) => JSON.parse(readFileSync(p, "utf8"));

/** { entry, bounds, roads, surf, markings, feats, hm, rd } for tile T. opts: { paint, roadsFile (another roads.json) } */
export function loadTile(T, opts = {}) {
  const entry = tileEntry(T);
  if (!entry) throw new Error(`no tile ${T}`);
  const d = join(ROOT, "data/tiles", T);
  const [x0, x1] = entry.bounds.x, [z0, z1] = entry.bounds.z;
  const bounds = { x0, x1, z0, z1 };
  const hdr = json(join(d, "terrain.json"));
  const buf = readFileSync(join(d, "terrain.u16"));
  const hm = new Heightmap(hdr, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const roads = json(opts.roadsFile || join(d, "roads.json"));
  const surf = existsSync(join(d, "surfaces.json")) ? json(join(d, "surfaces.json")) : null;
  const markings = existsSync(join(d, "markings.json")) ? json(join(d, "markings.json")) : null;
  const feats = json(join(d, "features.json"));
  overrides ??= existsSync(join(ROOT, "data/overrides.json")) ? json(join(ROOT, "data/overrides.json")) : {};
  applyRoadOverrides(roads, overrides);
  const roofs = roofGrid(json(join(d, "buildings.json")), bounds);
  const paint = opts.paint || "v2";
  const t0 = performance.now();
  const rd = buildRoadData({ roads, surf, markings: paint === "v2" ? markings : null, hm, bounds, paint, trees: feats.trees, keep: true,
    onBuilding: (x, z) => onRoof(roofs, x, z) });
  rd.totalMs = Math.round(performance.now() - t0);
  return { T, entry, bounds, roads, surf, markings, feats, hm, rd, paint };
}
