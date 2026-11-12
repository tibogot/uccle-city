// Round 2: the 2024 UrbIS orthophoto (25 cm, CC0) as the latest survey of the crossings. For every crossing record of
// data/tiles/<T>/markings.json (BM polygon, Topo pair, OSM node) it measures whether the photo shows zebra bars
// there and writes the result into the record:
//   photo: { s (score 0..~1: the 0.9-1.15 m bar period's share of the brightness profile across the bars, the best
//            direction), w (number of 2.4 m windows scanned; >= 4: s is their 75th percentile, else one scan of the
//            whole outline), th (direction across the bars, rad), veg (share of green samples: trees over the road) }
// The road stage (viewer/streets/measuredPaint.js) reads it: it never CREATES paint from the photo, it only drops a
// record the photo clearly contradicts (no bars on open asphalt) and confirms an OSM-only node. Run after
// build_markings.py:  node pipeline/verify_crossings.mjs [T ...]      (default: every tile with markings.json)
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { orthoSampler, photoOf } = await import(pathToFileURL(join(ROOT, "tools/road_audit/ortho.mjs")).href);
const args = process.argv.slice(2);
const tiles = args.length ? args : readdirSync(join(ROOT, "data/tiles")).filter((T) => existsSync(join(ROOT, "data/tiles", T, "markings.json")));
for (const T of tiles) {
  const f = join(ROOT, "data/tiles", T, "markings.json");
  const m = JSON.parse(readFileSync(f, "utf8"));
  // a crossing near the tile edge lies partly on the neighbour's photo: score it with the tile its centre is in
  const cache = new Map();
  const ortho = (name) => { if (!cache.has(name)) cache.set(name, orthoSampler(name)); return cache.get(name); };
  const man = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
  const tileAt = (x, z) => man.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name;
  let n = 0;
  for (const c of m.crossings) {
    const o = ortho(tileAt(c.c[0], c.c[1]) || T);
    const band = (q) => { const ax = Math.cos(q.axis), az = Math.sin(q.axis), bx = -az, bz = ax, [x, z] = q.c; return [[-1.75, -3], [1.75, -3], [1.75, 3], [-1.75, 3]].map(([u, v]) => [x + ax * u + bx * v, z + az * u + bz * v]); };
    const others = m.crossings.filter((q) => q !== c && Math.hypot(q.c[0] - c.c[0], q.c[1] - c.c[1]) < 25).map((q) => q.poly || band(q));
    c.photo = o ? photoOf(o, c, others) : null;
    n++;
  }
  writeFileSync(f, JSON.stringify(m));
  console.log(T, n);
}
