// TRAFFIC THROUGH PARKED CARS (trafpark 2026-11-17, owner playtest: "the traffic cars can go through the parked cars").
// Runs WITHOUT the browser: per tile the worker's road stage (tools/road_audit/tile.mjs), the parking by measured width
// (viewer/streets/parkPlace.js widthParking) and the traffic graph built around it (viewer/traffic/trafficGraph.js),
// exactly as viewer/tileData.js builds them. Then every driven path (lane pieces + junction connectors, the polylines
// the sim drives: graph xy) against every parked car's plan footprint (an oriented box of the widest / longest common
// type, 1.85 x 4.73 m): the distance from the path's centre line to the box. A traffic car (half width CAR_HALF) touches
// the parked car when that distance is under CAR_HALF: an OVERLAP. Under CAR_HALF + MARGIN: a TIGHT pass (counted, not
// failed).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/trafParkAudit.mjs [--old] [--out FILE] [--max N] T... | --all
//
//   --old    the graph as before trafpark (?trafpark=old)
//   --max N  the gate: exit 1 when more than N parked cars overlap a driven path over the tiles run (default 0)
//
// Classes of each overlapping (car, path) pair:
//   connector   a junction connector (its geometry is the blend of its entry / exit lane shifts: never tested)
//   laneEnd     a lane piece within 6 m of its end (junction mouth)
//   noRoom      the lane points beside the car found no shift within the carriageway clear of it (the road-only fit)
//   smoothing   the points were cleared, the line between them / the moving average / the kink rounding was not
//   tram        (an attribute) the lane carries tram tracks
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, allTiles, ROOT } from "../road_audit/tile.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const OUT = opt("--out", null), MAX = +opt("--max", 0), OLD = flag("--old"), ALL = flag("--all"), QUIET = flag("--quiet");
const TILES = ALL ? allTiles() : argv.map((t) => t.toUpperCase());
if (!TILES.length) { console.error("usage: trafParkAudit.mjs [--old] [--out FILE] [--max N] T... | --all"); process.exit(2); }

export const CAR_HALF = 0.9, MARGIN = 0.15, BOX_HW = 0.925, BOX_HL = 2.365, STEP = 0.25, END = 6;

/** distance from point (x, z) to the car's box */
function boxDist(c, x, z) {
  const ax = Math.cos(c.yaw), az = -Math.sin(c.yaw);      // along the car (local +x = bonnet)
  const dx = x - c.x, dz = z - c.z;
  const u = Math.abs(dx * ax + dz * az) - BOX_HL, v = Math.abs(dx * az - dz * ax) - BOX_HW;
  return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
}

const results = [], sum = { tiles: 0, cars: 0, overlapCars: 0, tightCars: 0, pairs: 0, overlapM: 0, classes: {}, tram: 0, narrowCovered: 0, removed: 0, ms: 0 };
for (const T of TILES) {
  const t0 = Date.now();
  let tile;
  try { tile = loadTile(T); } catch (e) { console.error(`${T}: ${e.message}`); continue; }
  const { roads, feats, bounds, rd } = tile;
  if (!rd.surfaceData) { if (!QUIET) console.log(`${T}: no measured surfaces (no width parking)`); continue; }
  const fit = streetFit(rd.surfaceData);
  const wp = widthParking(roads, feats, bounds, fit);
  const trace = {};
  const g = buildTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, trace, old: OLD });
  const cars = process.env.TP_ALL ? wp.sites : g.parkedKept ?? wp.sites;   // (trafpark: the graph drops cars no lane can pass; TP_ALL=1: classes of all, before the drop)
  // grid of cars
  const G = new Map(), key = (i, j) => (i + 4096) * 8192 + (j + 4096), CELL = 6;
  cars.forEach((c, ci) => { const k = key(Math.floor(c.x / CELL), Math.floor(c.z / CELL)); if (!G.has(k)) G.set(k, []); G.get(k).push(ci); });
  const rawById = new Map(trace.raw.map((p) => [p.id, p]));
  const pairs = new Map();          // "car,path" -> { ci, pi, min, m, cls }
  const carMin = new Float32Array(cars.length).fill(Infinity);
  for (let pi = 0; pi < g.paths; pi++) {
    const a = g.off[pi], b = g.off[pi + 1];
    for (let k = a + 1; k < b; k++) {
      const x0 = g.xy[(k - 1) * 2], z0 = g.xy[(k - 1) * 2 + 1], x1 = g.xy[k * 2], z1 = g.xy[k * 2 + 1];
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / STEP));
      for (let s = 0; s <= n; s++) {
        const t = s / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, along = g.cum[k - 1] + L * t;
        const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const ci of G.get(key(i0 + di, j0 + dj)) || []) {
          const d = boxDist(cars[ci], x, z);
          if (d < carMin[ci]) carMin[ci] = d;
          if (d >= CAR_HALF) continue;
          const h = ci * 65536 + pi;
          let P = pairs.get(h);
          if (!P) pairs.set(h, (P = { ci, pi, min: d, n: 0, at: along, x, z }));
          P.n++; if (d < P.min) { P.min = d; P.at = along; P.x = x; P.z = z; }
        }
      }
    }
  }
  const R = { tile: T, cars: cars.length, removed: wp.sites.length - cars.length, overlapCars: 0, tightCars: 0, pairs: pairs.size, overlapM: 0, classes: {}, tram: 0, narrowCovered: 0, worst: [] };
  for (let ci = 0; ci < cars.length; ci++) { if (carMin[ci] < CAR_HALF) R.overlapCars++; else if (carMin[ci] < CAR_HALF + MARGIN) R.tightCars++; }
  for (const P of pairs.values()) {
    R.overlapM += P.n * STEP;
    const src = trace.src[P.pi];
    let cls;
    if (g.kind[P.pi]) cls = "connector";
    else if (P.at < END || P.at > g.len[P.pi] - END) cls = "laneEnd";
    else {
      // the raw lane point nearest the overlap: how did the fit treat it?
      const raw = rawById.get(src.id), how = trace.fit?.get(src.id);
      let best = -1, bd = Infinity;
      if (raw) raw.pts.forEach((q, k) => { const dd = (q[0] - P.x) ** 2 + (q[1] - P.z) ** 2; if (dd < bd) { bd = dd; best = k; } });
      const hv = how && best >= 0 ? Math.max(how[Math.max(0, best - 1)], how[best], how[Math.min(how.length - 1, best + 1)]) : 0;
      cls = hv >= 2 ? "noRoom" : "smoothing";
    }
    R.classes[cls] = (R.classes[cls] || 0) + 1;
    if (g.tram[P.pi]) R.tram++;
    // a narrow stretch (one way at a time) covering the spot? (the give-way does not make driving through a car right)
    for (let k = g.nOff[P.pi]; k < g.nOff[P.pi + 1]; k++) if (P.at >= g.nS0[k] - 2 && P.at <= g.nS1[k] + 2) { R.narrowCovered++; break; }
    if (R.worst.length < 25) R.worst.push({ cls, d: +P.min.toFixed(2), x: +P.x.toFixed(1), z: +P.z.toFixed(1), path: src.id, w: cars[P.ci].w != null ? +cars[P.ci].w.toFixed(2) : null });
  }
  R.worst.sort((p, q) => p.d - q.d);
  R.overlapM = Math.round(R.overlapM);
  R.ms = Date.now() - t0;
  results.push(R);
  sum.tiles++; for (const k of ["cars", "removed", "overlapCars", "tightCars", "pairs", "overlapM", "tram", "narrowCovered", "ms"]) sum[k] += R[k];
  for (const [k, v] of Object.entries(R.classes)) sum.classes[k] = (sum.classes[k] || 0) + v;
  if (!QUIET) console.log(`${T}: ${cars.length} cars${R.removed ? ` (${R.removed} removed)` : ""}, overlapping a driven path ${R.overlapCars}, tight ${R.tightCars} | pairs ${R.pairs} (${Object.entries(R.classes).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}; tram ${R.tram}, under a narrow stretch ${R.narrowCovered}), ${R.overlapM} m of lane (${R.ms} ms)`);
}
console.log(JSON.stringify(sum));
if (OUT) writeFileSync(resolve(ROOT, OUT), JSON.stringify({ old: OLD, summary: sum, tiles: results }, null, 1));
if (sum.overlapCars > MAX) { console.error(`FAIL trafpark: ${sum.overlapCars} parked cars overlap a driven path (gate: <= ${MAX})`); process.exit(1); }
console.log(`PASS trafpark: ${sum.overlapCars} parked cars overlap a driven path (gate: <= ${MAX})`);
