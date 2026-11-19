// ONE BUILDER for a tile's traffic graph (claude/roads, rule 38): the tile worker (viewer/tileData.js) and every audit
// that checks the lanes (tools/audit/trafParkAudit.mjs, tools/trafParkSimTest.mjs, tools/audit/trafParkBorder.mjs,
// tools/audit/twinLink.mjs, the class R census, streetAudit) build it through this one call, with the same inputs: the
// road engine's net, the measured class raster, the parked cars by measured width and the tile's roof grid (the
// building test of the far-lane snap, trafficGraph.js fitToSurface). An audit that checks another lane than the one
// driven is a gap (round 2: the audits built it without the building test and saw the lanes before the snap).
// Plain JS, no three.js.
import { buildTrafficGraph } from "./trafficGraph.js";

/** (x, z) under a building of the roof grid (viewer/tileData.js roofGrid / onRoof: cells > 0) */
export const roofAt = (g, x, z) => {
  const i = Math.floor((x - g.x0) / g.step), j = Math.floor((z - g.z0) / g.step);
  return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.data[j * g.nx + i] > 0;
};

/** entry: the tile entry's switches (trafpark false = ?trafpark=old, roadsR false = ?roads=old); roofs: roofGrid of
 *  the tile's buildings.json (null: no building test, the snap is off); trace: buildTrafficGraph's audit trace */
export function tileTrafficGraph(net, roads, feats, bounds, grid, { parked = null, roofs = null, entry = {}, trace = undefined } = {}) {
  return buildTrafficGraph(net, roads, feats, bounds, grid, {
    parked, trace, old: entry.trafpark === false, roadsR: entry.roadsR !== false,
    inBuilding: roofs ? (x, z) => roofAt(roofs, x, z) : null,
  });
}
