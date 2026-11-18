// TRAFFIC LIGHT INSTANCES from the signal post sites (no three.js: viewer/tlights/cityTLights.js draws them,
// tools/audit/tlightsCheck.mjs checks them in node with the same code).
// The sites are viewer/streets/signalPlace.js signalSites (one post per OSM approach on its right kerb, facing the coming
// cars; one per kerb at a crossing away from a junction): this only chooses the piece and seats it.
//   piece   tl_post_bike where a cycle lane runs on the traffic's right up to the line (roads.json lanes "bike"), else
//           tl_post (tools/blender/trafficLights.py)
//   height  the post's foot on the drawn pavement: ground(x, z) + lift(x, z) (the measured surface's raise: the
//           sidewalk's kerb height, as the lamps), + 0.12 where the tile has no measured surface (the old rule)
//   record  x y z yaw phase 0 0 0 (stride 8; yaw: local -z = the heads' facing = toward the coming cars)

export const TL_PIECES = ["tl_post", "tl_post_bike"];
export const TL_STRIDE = 8;
/** triangle budgets per LOD of each piece (tools/audit/tlightsCheck.mjs checks the GLB against them): ~250 posts in the
 *  city, a handful inside LOD0's 25 m at once */
export const TRI_BUDGET = [9000, 1500, 300];
/** LOD band ends (m): the distance each LOD's mesh audit is run for */
export const LOD_END = [27.5, 88, 450];

/** the drawn pavement height under (x, z) */
export const seatY = (ground, lift, x, z) => ground(x, z) + (lift ? lift(x, z) : 0.12);

/** { <piece>: Float32Array (x y z yaw phase 0 0 0) } of the sites inside bounds; also `list` (the records as objects) */
export function tlightInstances(sites, ground, lift, bounds) {
  const L = Object.fromEntries(TL_PIECES.map((p) => [p, []]));
  const list = [];
  for (const s of sites || []) {
    if (bounds && (s.x < bounds.x0 || s.x > bounds.x1 || s.z < bounds.z0 || s.z > bounds.z1)) continue;
    const piece = s.bike ? "tl_post_bike" : "tl_post";
    const y = seatY(ground, lift, s.x, s.z);
    L[piece].push(s.x, y, s.z, s.yaw, s.phase || 0, 0, 0, 0);
    list.push({ ...s, y, piece });
  }
  const out = { list };
  for (const k of TL_PIECES) if (L[k].length) out[k] = new Float32Array(L[k]);
  return out;
}
