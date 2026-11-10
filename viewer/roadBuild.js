// The tile's road stage, shared by the tile worker (viewer/tileData.js), the Road Checker (tools/road_audit/) and the
// Road Lab (labs/road-lab.js), so all three see exactly the same streets. Plain JS, no three.js, runs in node.
//
//   prepareSurfaces  measured UrbIS street surfaces (viewer/surfaces.js)
//   fitRoadWidths    the engine's lane stacks fitted into the measured kerb-to-kerb widths
//   buildRoadNetwork the vendored road engine (vendor/roads, read-only)
//   buildLaneRoadMesh engine meshes + the junction marking atlas
//   buildSurfaceRoads measured meshes + the engine's asphalt (which carries the lane paint) over them
//
// `paint` picks the marking rules: "v1" = the engine's own (a zebra on every arm, guessed stop lines, default centre /
// bike / parking lines), "v2" = docs/ROADS_V2_RESEARCH.md phase 1, "stop inventing" (viewer/streets/measuredPaint.js).
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";
import { buildLaneRoadMesh } from "../vendor/roads/mesh/laneRoadMesh.js";
import { surfaceAttribute } from "./roadData.js";
import { prepareSurfaces, fitRoadWidths, buildSurfaceRoads } from "./surfaces.js";

export const CARVE = 0.12;         // terrain is pushed this far under any road surface

const now = () => (globalThis.performance ?? Date).now();

/** Keep only triangles whose centroid is inside the tile (the 150 m buffer is for complete junctions only). */
export function clipToTile(part, b) {
  const p = part.position, src = part.index, keep = [];
  for (let t = 0; t < src.length; t += 3) {
    const a = src[t] * 3, bb = src[t + 1] * 3, c = src[t + 2] * 3;
    const x = (p[a] + p[bb] + p[c]) / 3, z = (p[a + 2] + p[bb + 2] + p[c + 2]) / 3;
    if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) keep.push(src[t], src[t + 1], src[t + 2]);
  }
  return Uint32Array.from(keep);
}

/** The engine's RG8 atlas -> R8 at half resolution (the shader only reads R, the signed distance). */
function compactAtlas(at) {
  if (!at) return null;
  const W2 = Math.ceil(at.width / 2), H2 = Math.ceil(at.height / 2), src = at.data, d8 = new Uint8Array(W2 * H2);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    let sum = 0, n = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = 2 * x + dx, yy = 2 * y + dy;
      if (xx < at.width && yy < at.height) { sum += src[(yy * at.width + xx) * 2]; n++; }
    }
    d8[y * W2 + x] = Math.round(sum / n);
  }
  return { data: d8, width: W2, height: H2, format: "R8", scale: at.scale, range: at.range, texel: at.texel * 2,
    stats: { regions: at.stats?.regions, bytes: d8.length, bytesBefore: at.data.length } };
}

/**
 * @param {object} o
 *   roads, surf (surfaces.json or null), markings (markings.json or null), hm (Heightmap), bounds {x0,x1,z0,z1},
 *   trees (feature trees, for the pits; null = no pits), onBuilding(x, z), paint ("v1" | "v2"), keep (true: also
 *   return the live engine objects prep / built for the checker and the lab; `net` is always returned: never post it
 *   across a worker boundary)
 * @returns plain data: { parts, atlas, carvedCells, triangles, surfaceStats, surfaceData, netInfo, inventory, times }
 */
export function buildRoadData(o) {
  const { roads, surf, hm, bounds, onBuilding = () => false } = o;
  const times = {};
  let t0 = now();
  const lap = (k) => { const t = now(); times[k] = Math.round(t - t0); t0 = t; };
  // measured surfaces first, then the engine's lane stacks fitted into the measured kerb-to-kerb widths
  const prep = surf ? prepareSurfaces(surf, hm.ground, bounds, o.trees ?? null) : null;
  const widthFit = prep ? fitRoadWidths(roads, prep) : null;
  lap("surfaces + width fit");
  const net = buildRoadNetwork(roads, { ground: hm.ground });
  lap("buildRoadNetwork");
  const errors = net.issues.filter((i) => i.level === "error");
  const byCode = {};
  for (const i of errors) byCode[i.code] = (byCode[i.code] || 0) + 1;
  const netInfo = { roads: net.roads.length, nodes: net.nodes.length, errors: errors.length, byCode, warnings: net.issues.length - errors.length };

  const built = buildLaneRoadMesh(net, { markings: true });
  const parts = {};
  let carvedCells = 0, triangles = 0, surfaceStats = null, surfaceData = null;
  if (surf) {
    // measured surfaces + the engine's markings clipped to them (viewer/surfaces.js)
    const S = buildSurfaceRoads(prep, built, surfaceAttribute(net, built.asphalt), roads, onBuilding);
    for (const c of S.carve) carvedCells += hm.carve(c.position, c.index, CARVE);
    for (const [name, part] of Object.entries(S.parts)) {
      parts[name] = { position: part.position, normal: part.normal, uv: part.uv, attributes: part.attributes, index: part.index, aSurf: part.extra };
      triangles += part.index.length / 3;
    }
    surfaceStats = { ...S.stats, widthFit };
    surfaceData = { grid: S.grid, kerbs: S.kerbs, bollards: S.bollards };
  }
  for (const name of surf ? [] : ["asphalt", "concrete", "grass"]) {
    const part = built[name];
    if (!part.vertexCount) continue;
    const index = clipToTile(part, bounds);
    carvedCells += hm.carve(part.position, index, CARVE);
    const attributes = {};
    for (const [k, a] of Object.entries(part.attributes)) attributes[k] = { array: a.array, itemSize: a.itemSize };
    parts[name] = { position: part.position, normal: part.normal, uv: part.uv, attributes, index,
      aSurf: name === "asphalt" ? surfaceAttribute(net, part) : null };
    triangles += index.length / 3;
  }
  const atlas = compactAtlas(built.atlas);
  lap("road meshes + carve");
  const out = { parts, atlas, carvedCells, triangles, surfaceStats, surfaceData, netInfo, times, net };
  if (o.keep) Object.assign(out, { prep, built });
  return out;
}
