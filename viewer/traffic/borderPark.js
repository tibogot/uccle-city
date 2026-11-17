// trafpark round 2 (browser, 2026-11-17): PARKED CARS AT TILE BORDERS. Each tile's worker builds its traffic lanes
// clear of ITS OWN parked cars (trafficGraph.js), but a lane piece the tile owns (core: its midpoint inside the tile)
// runs on past the border into the neighbour, where the neighbour's parked cars stand (the worker's measured raster
// stops at the border, so it cannot place them). Node, D3 / D4 / E3 / E4: 29 of 632 cars under a neighbour's core
// lane. Here, no three.js:
//   laneHits(sites, graphs, own): the sites (worker parking slots { x, z, yaw }) a loaded neighbour's core lane runs
//   through (main.js drops them before the tile's cars are drawn: a car never appears there)
// The other order (the lanes arrive after the cars are drawn) is the sim's: trafficSim.js parkedGrid treats such cars
// as obstacles (no pop).
import { parkedBoxDist, TP_HALF } from "./trafficGraph.js";

const CELL = 8;
const key = (i, j) => (i + 32768) * 65536 + (j + 32768);
function hashOf(g) {
  if (g._tpHash) return g._tpHash;
  const h = new Map();
  for (let p = 0; p < g.paths; p++) {
    if (!g.core[p]) continue;
    for (let k = g.off[p]; k < g.off[p + 1] - 1; k++) {
      const x0 = g.xy[k * 2], z0 = g.xy[k * 2 + 1], x1 = g.xy[k * 2 + 2], z1 = g.xy[k * 2 + 3];
      for (let ci = Math.floor(Math.min(x0, x1) / CELL); ci <= Math.floor(Math.max(x0, x1) / CELL); ci++)
        for (let cj = Math.floor(Math.min(z0, z1) / CELL); cj <= Math.floor(Math.max(z0, z1) / CELL); cj++) {
          const kk = key(ci, cj); let l = h.get(kk); if (!l) h.set(kk, (l = [])); l.push(k);
        }
    }
  }
  return (g._tpHash = h);
}
/** does a core lane of graph g pass within TP_HALF of site c's box? */
function hits(g, c) {
  const h = hashOf(g), i0 = Math.floor(c.x / CELL), j0 = Math.floor(c.z / CELL);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const k of h.get(key(i0 + di, j0 + dj)) || []) {
    const x0 = g.xy[k * 2], z0 = g.xy[k * 2 + 1], x1 = g.xy[k * 2 + 2], z1 = g.xy[k * 2 + 3], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.25));
    for (let m = 0; m <= n; m++) { const t = m / n; if (parkedBoxDist(c, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t) < TP_HALF) return true; }
  }
  return false;
}
/** the indices of `sites` that a loaded neighbour's core lane runs through. graphs: Map name -> graph; own: this tile */
export function laneHits(sites, graphs, own) {
  const out = new Set();
  for (const [name, g] of graphs) {
    if (name === own || !g?.core || !g.bounds) continue;
    const b = g.bounds;
    sites.forEach((c, i) => {
      if (out.has(i) || c.x < b.x0 - 160 || c.x > b.x1 + 160 || c.z < b.z0 - 160 || c.z > b.z1 + 160) return;
      if (hits(g, c)) out.add(i);
    });
  }
  return out;
}
