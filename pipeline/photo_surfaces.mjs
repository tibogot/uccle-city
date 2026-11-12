// Round 2: what the 2024 UrbIS orthophoto (25 cm, CC0) shows on the measured tram sites, squares and medians, so the
// road stage draws the surface that is really there instead of a class default (a tram site was always setts: on
// Ch. d'Alsemberg / Av. Brugmann they are asphalt the trams share, so they read as "grey raised islands").
// For every surface of class roadway (0), tram road (1), tramSite (2), square (4), median (6) in data/tiles/<T>/surfaces.json it writes
//   photo: { veg (share of green samples), lum (mean grey 0..1), n (samples) [, tram sites: road (its street's
//            roadway grey), look "asphalt" | "default"] }
// The road stage (viewer/surfaces.js) reads it. Run after build_surfaces.py:
//   node pipeline/photo_surfaces.mjs [T ...]
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { orthoSampler } = await import(pathToFileURL(join(ROOT, "tools/road_audit/ortho.mjs")).href);
const CLASSES = new Set([0, 1, 2, 4, 6]);
const LOOK_SAME = 0.07;            // grey 0..1: a tram site this close to its street's roadway is that asphalt
const pip = (x, z, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const args = process.argv.slice(2);
const tiles = args.length ? args : readdirSync(join(ROOT, "data/tiles")).filter((T) => existsSync(join(ROOT, "data/tiles", T, "surfaces.json")));
for (const T of tiles) {
  const f = join(ROOT, "data/tiles", T, "surfaces.json");
  const s = JSON.parse(readFileSync(f, "utf8"));
  const o = orthoSampler(T);
  if (!o) { console.log(T, "no ortho"); continue; }
  let n = 0;
  for (const q of s.surfaces) {
    if (!CLASSES.has(q.c)) continue;
    const ring = q.rings[0];
    let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
    for (const [x, z] of ring) { xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
    let k = 0, veg = 0, lum = 0;
    for (let x = xa + 0.25; x < xb; x += 0.5) for (let z = za + 0.25; z < zb; z += 0.5) {
      if (!pip(x, z, ring)) continue;
      const g = o.at(x, z);
      if (g == null) continue;
      k++; lum += g; if (o.greenAt(x, z) > 0.04) veg++;
    }
    q.photo = k ? { veg: Math.round((veg / k) * 100) / 100, lum: Math.round((lum / k) * 1000) / 1000, n: k } : null;
    n++;
  }
  // a tram site as bright as the roadway of its own street (within LOOK_SAME) is the same asphalt, shared with the
  // trams (look "asphalt"); a lighter or darker one keeps the class default (setts / concrete / ballast)
  const road = new Map(); let all = 0, alln = 0;
  for (const q of s.surfaces) if (q.c <= 1 && q.photo) { const r = road.get(q.name) || [0, 0]; r[0] += q.photo.lum * q.photo.n; r[1] += q.photo.n; road.set(q.name, r); all += q.photo.lum * q.photo.n; alln += q.photo.n; }
  for (const q of s.surfaces) {
    if (q.c !== 2 || !q.photo) continue;
    const r = road.get(q.name), ref = r && r[1] > 400 ? r[0] / r[1] : alln ? all / alln : null;
    q.photo.road = ref == null ? null : Math.round(ref * 1000) / 1000;
    q.photo.look = ref != null && q.photo.veg < 0.2 && Math.abs(q.photo.lum - ref) < LOOK_SAME ? "asphalt" : "default";
  }
  writeFileSync(f, JSON.stringify(s));
  console.log(T, n);
}
