// TRAFPARK BORDER CHECK (round 2, 2026-11-17): a tile is never checked alone. For a block of neighbouring tiles, each
// built as the worker builds it (parking by width, traffic graph, parkedKept), then the main thread's border drop
// (viewer/traffic/borderPark.js laneHits: a tile's parked cars under a LOADED neighbour's own lane are not drawn): count
// the parked cars any neighbour's own (core) path still runs within the widest traffic car's half width of (0.98 m;
// junction turns + 0.3 m for the body's sweep), measured here independently (every 0.25 m of every core path).
// Both load orders are covered: laneHits is applied for every pair as if each tile loaded after the others (in the
// browser the other order is the sim's: trafficSim.js parkedGrid hides / treats them as obstacles).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/trafParkBorder.mjs [--max N] T...   (default: D3 D4 E3 E4 H5 H6 I5 I6)
// Exit 1 when more than N (default 0) cars remain.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, ROOT } from "../road_audit/tile.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph, parkedBoxDist } = await imp("viewer/traffic/trafficGraph.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");   // (one builder with the worker, rule 38)
const { laneHits } = await imp("viewer/traffic/borderPark.js");

const argv = process.argv.slice(2);
const mi = argv.indexOf("--max"), MAX = mi >= 0 ? +argv.splice(mi, 2)[1] : 0;
const TILES = argv.length ? argv.map((t) => t.toUpperCase()) : ["D3", "D4", "E3", "E4", "H5", "H6", "I5", "I6"];
const HALF = 0.98, TURN = 0.3;

const T = new Map();
for (const name of TILES) {
  const { roads, feats, bounds, rd, roofs } = loadTile(name);
  if (!rd.surfaceData) continue;
  const wp = widthParking(roads, feats, bounds, streetFit(rd.surfaceData));
  const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites, roofs });
  T.set(name, { g, sites: g.parkedKept ?? wp.sites });
}
const graphs = new Map([...T].map(([n, t]) => [n, t.g]));
let before = 0, after = 0, dropped = 0, cars = 0;
for (const [b, B] of T) {
  const drop = laneHits(B.sites, graphs, b);                 // as main.js: every other tile loaded
  cars += B.sites.length; dropped += drop.size;
  for (const [a, A] of T) {
    if (a === b) continue;
    const g = A.g, bb = g.bounds;
    B.sites.forEach((c, ci) => {
      if (c.x < bb.x0 - 160 || c.x > bb.x1 + 160 || c.z < bb.z0 - 160 || c.z > bb.z1 + 160 || c._bHit) return;
      for (let p = 0; p < g.paths && !c._bHit; p++) {
        if (!g.core[p]) continue;
        const lim = HALF + (g.kind[p] ? TURN : 0);
        for (let k = g.off[p] + 1; k < g.off[p + 1] && !c._bHit; k++) {
          const x0 = g.xy[(k - 1) * 2], z0 = g.xy[(k - 1) * 2 + 1], x1 = g.xy[k * 2], z1 = g.xy[k * 2 + 1];
          if (Math.min(x0, x1) > c.x + 4 || Math.max(x0, x1) < c.x - 4 || Math.min(z0, z1) > c.z + 4 || Math.max(z0, z1) < c.z - 4) continue;
          const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25));
          for (let m = 0; m <= n; m++) if (parkedBoxDist(c, x0 + (x1 - x0) * m / n, z0 + (z1 - z0) * m / n) < lim) { c._bHit = 1; break; }
        }
      }
      if (c._bHit) { before++; if (!drop.has(ci)) after++; }
    });
  }
}
console.log(JSON.stringify({ tiles: [...T.keys()], cars, underNeighbourLane: before, droppedAtLoad: dropped, remaining: after }));
if (after > MAX) { console.error(`FAIL trafparkborder: ${after} parked cars under a neighbour tile's own lane (gate: <= ${MAX})`); process.exit(1); }
console.log(`PASS trafparkborder: ${after} parked cars under a neighbour tile's own lane after the border drop (gate: <= ${MAX})`);
