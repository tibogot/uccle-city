// The roof kit over the whole city, in Node (docs/assets/ROOFS.md): per piece instance counts, parapet metres, the
// façade analysis time with / without the kit. node tools/roofs/cityCounts.mjs [tiles...] [--time]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { roofCollector, PIECES, STRIDE } from "../../viewer/roofs/roofPlace.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2), time = args.includes("--time");
let tiles = args.filter((a) => !a.startsWith("--"));
if (!tiles.length) tiles = fs.readdirSync(path.join(ROOT, "data/tiles")).filter((t) => fs.existsSync(path.join(ROOT, "data/tiles", t, "buildings.bin")));
const tot = Object.fromEntries(PIECES.map((p) => [p, 0])), st = {};
let msOld = 0, msNew = 0, bytes = 0;
for (const t of tiles) {
  const dir = path.join(ROOT, "data/tiles", t);
  const doc = JSON.parse(fs.readFileSync(path.join(dir, "buildings.json"), "utf8"));
  const b = fs.readFileSync(path.join(dir, "buildings.bin")), buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const roads = JSON.parse(fs.readFileSync(path.join(dir, "roads.json"))), feats = JSON.parse(fs.readFileSync(path.join(dir, "features.json")));
  if (time) { const t0 = performance.now(); analyseBuildings(doc, buf, roads, feats); msOld += performance.now() - t0; }
  const t1 = performance.now();
  const a = analyseBuildings(doc, buf, roads, feats, { roofs: roofCollector() });
  msNew += performance.now() - t1;
  const k = a.roofKit;
  for (const [p, arr] of Object.entries(k.pieces)) { tot[p] += arr.length / STRIDE; bytes += arr.byteLength; }
  for (const [s, v] of Object.entries(k.stats)) st[s] = (st[s] || 0) + v;
  st.parapetStrips = (st.parapetStrips || 0) + (a.stats.parapets || 0);
}
console.log(JSON.stringify({ tiles: tiles.length, instances: tot, stats: Object.fromEntries(Object.entries(st).map(([k, v]) => [k, Math.round(v)])), instanceMB: +(bytes / 1048576).toFixed(1),
  analyseMs: { withKit: Math.round(msNew), without: time ? Math.round(msOld) : null, perTileWith: Math.round(msNew / tiles.length), perTileWithout: time ? Math.round(msOld / tiles.length) : null } }, null, 1));
