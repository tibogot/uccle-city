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
import { surfaceAttribute, hashPhase } from "./roadData.js";
import { prepareSurfaces, fitRoadWidths, buildSurfaceRoads } from "./surfaces.js";
import { preparePaintV2, afterNetworkV2, unpaintParking, paintMeshV2, roadTextMesh } from "./streets/measuredPaint.js";
import { refineLaneGraph, joinLaneGraph } from "./streets/laneGraph.js";
import { relevelRoads } from "./streets/roadLevels.js";
import { recentreRoads } from "./streets/recentre.js";
import { trimBendFolds } from "./streets/roadBends.js";
import { edgeField, onceEdgeList } from "./heightmap.js";
import { retainingWalls, appendToPart } from "./streets/retainWalls.js";

export const CARVE = 0.12;         // terrain is pushed this far under any road surface
// (claude/sidewalk, ?sidewalk=old = 0) the terrain higher than a street banks down to its outer edge at this slope (m per m,
// 31 degrees: the ground shader keeps grass up to ~33 degrees, viewer/ground.js), its mirror under the edge
// (viewer/heightmap.js clampUnder bank + edgeField): no saw-tooth bank foot, no terrain over the edge. (Round 1 had 45
// degrees: bare earth on every bank.) In front of a garden a retaining wall instead (viewer/streets/retainWalls.js)
export const BANK_SLOPE = 0.6;

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

/** data/overrides.json hand corrections on a tile's roads.json, before the road stage: roadSurface (road id -> OSM-style
 *  surface) and centreLine (OSM way id -> "none": no centre line where the orthophoto shows none; round 5). */
export function applyRoadOverrides(roads, ov) {
  for (const r of roads.roads) {
    const s = ov?.roadSurface?.[r.id]; if (s) (r.meta ??= {}).surface = s;
    const way = /^r(\d+)_/.exec(r.id)?.[1], c = way ? ov?.centreLine?.[way] : null;
    if (c === "none" && r.lanes) r.lanes = { ...r.lanes, center: { ...(r.lanes.center || {}), kind: "none" } };   // (built roads carry their stack)
  }
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
  const ground = o.ground ?? hm.ground;   // o.ground: e.g. the hero road bridges' decks over the cutting (rail/railData.js roadDeckGround)
  const prep = surf ? prepareSurfaces(surf, ground, bounds, o.trees ?? null, { clampH: o.clampH === true, kerbLevel: o.kerbLevel === true }) : null;
  // citydefects (OPT-IN, o.recentre true = ?recentre=1): each OSM centre line moved onto the middle of its measured
  // carriageway (viewer/streets/recentre.js). Road checker on I6 / E4 / J5: "leaves the measured street" 57 -> 48, C4
  // paint off the street 36 -> 29, but folds 14 -> 23 and coplanar overlaps 134 -> 225: not default until those are 0
  const recentre = prep && o.recentre === true ? recentreRoads(roads, prep) : null;
  // paint v2 needs the measured street; a tile without surfaces keeps the engine's rules
  const v2 = o.paint === "v2" && !!prep;
  const ctx = v2 ? preparePaintV2(roads, prep, o.markings ?? null, bounds) : null;     // edits the engine's inputs
  const widthFit = prep ? fitRoadWidths(roads, prep) : null;
  lap("surfaces + width fit");
  const net = buildRoadNetwork(roads, { ground });
  lap("buildRoadNetwork");
  // round 5: every lane-graph "next" link joins paths that touch (the engine's connectors start on the arm's straight
  // frame line, its lanes end on the bent alignment: gaps up to 92 m), on every tile (v1 too: traffic drives on it)
  const laneJoins = joinLaneGraph(net);
  // round 5: junctions the engine's grade rule lifted / sank off the measured ground go back to it (D10 floated 1.4 m)
  // (no DTM: outside the Brussels region the grid holds its lowest value; off the tile's grid it is clamped to its edge)
  const offGrid = (x, z) => { const h = hm.h; return x < h.x0 || z < h.z0 || x > h.x0 + (h.cols - 1) * h.step || z > h.z0 + (h.rows - 1) * h.step; };
  // o.noData: the tile worker's (tileData.js paddedGround: the neighbours' grids answer past the edge)
  const levels = relevelRoads(net, ground, o.noData ?? ((x, z) => offGrid(x, z) || (hm.h.min != null && hm.ground(x, z) <= hm.h.min + 0.02)), { roughLanes: o.roughLanes !== false, deckLevel: o.deckLevel ?? null });
  const pv = v2 ? afterNetworkV2(net, ctx, surf) : null;
  if (v2) lap("measured paint");
  // round 2: the lane graph traffic drives on, repaired (loops, centring, smoothing, hold points at the paint)
  const laneGraph = v2 ? refineLaneGraph(net, prep, pv.inventory) : null;
  if (v2) { pv.inventory.stats.laneGraph = laneGraph; pv.inventory.stats.laneJoins = laneJoins; lap("lane graph"); }
  const errors = net.issues.filter((i) => i.level === "error");
  const byCode = {};
  for (const i of errors) byCode[i.code] = (byCode[i.code] || 0) + 1;
  const netInfo = { levels, roads: net.roads.length, nodes: net.nodes.length, errors: errors.length, byCode, warnings: net.issues.length - errors.length };

  const built = buildLaneRoadMesh(net, { markings: true });
  if (v2) pv.inventory.stats.parkingVerticesUnpainted = unpaintParking(built, ctx);
  // curvedroads: where a bend is tighter than the road is wide (the engine shrinks the radius at an OSM vertex near a
  // junction mouth to ~0) its strips folded over themselves; each inner edge is cut at its own crossing (the trimmed
  // offset curve), everything else bit for bit as built (viewer/streets/roadBends.js, docs/roads/BENDS.md).
  // o.roadBend false (?roadbend=old): as built (then viewer/surfaces.js drops the minority-oriented folds, as before)
  // (all three parts: the engine's sidewalks / verges are drawn where UrbIS maps nothing, viewer/surfaces.js)
  let bend = null;
  if (o.roadBend !== false) {
    bend = {};
    for (const name of ["asphalt", "concrete", "grass"]) { const r = trimBendFolds(net, built[name]); built[name] = r.part; bend[name] = r.stats; }
  }
  lap("road bends");
  // (o.engineOnly: the engine stage only, for tools/audit/roadBends.mjs)
  if (o.engineOnly) return { net, built, prep, roadBend: bend, times };
  // paint v2: engine pieces that overlap get lift tiers (junction pads on top, then the higher road rank)
  let priority = null;
  if (v2) {
    const pr = new Map();
    for (const rr of net.roads) pr.set(hashPhase(rr.id), rr.type.rank ?? 1);
    for (const n of net.nodes) pr.set(hashPhase(n.id), 10);
    priority = (ph) => pr.get(ph) ?? 0;
  }
  const parts = {};
  let carvedCells = 0, triangles = 0, surfaceStats = null, surfaceData = null;
  const welds = [];
  let wallHold = null, weldsNoWalls = null, wallTops = null;                  // the road meshes the terrain is welded to (JOINS, after the carve)
  if (surf) {
    // measured surfaces + the engine's markings clipped to them (viewer/surfaces.js)
    const lineCuts = v2 ? pv.inventory.crossings.filter((c) => c.poly).map((c) => c.poly) : null;
    // round 5: o.levelPins (x, z) -> [y, w] | null: levels the measured street must meet exactly (a hero road bridge's
    // deck ends, viewer/rail/railData.js roadDeckPins): the street's height field blended toward them
    if (o.levelPins) {
      const H0 = prep.H, pin = o.levelPins;
      prep.H = (x, z) => { const h = H0(x, z), p = pin(x, z); return p ? h + (p[0] - h) * p[1] : h; };
    }
    const S = buildSurfaceRoads(prep, built, surfaceAttribute(net, built.asphalt), roads, onBuilding, { ...(priority ? { priority, dropFolds: true, lineCuts } : {}), wallRay: o.wallRay ?? null });
    // (claude/sidewalk round 2) retaining walls where a garden stands over a levelled sidewalk (viewer/streets/retainWalls.js):
    // into the concrete (blue stone, aKind 1) and grass (the lawn strip at the garden level) parts, before the terrain sees them
    if (o.kerbLevel === true && o.gardenNear && S.parts.concrete?.index?.length && hm.weld) {
      // (wallHold: the terrain behind each wall's face held at the sidewalk's height, for clampUnder only)
      // (the sidewalk's outer edges: its once-used edges whose outward side 0.3 m out is no measured street (the class
      // raster): no coverage pass of every part, round 3: 150 -> ~50 ms a tile)
      const tw = now(), names = Object.keys(S.parts), C = S.parts.concrete, covered = (x, z) => prep.classAt(x, z) >= 0;
      // (and only the MEASURED sidewalk's: the concrete part also holds the engine's sidewalks along roads UrbIS does not
      // map, whose outer side is the engine's road, not in the raster: walls stood along them)
      const SW = new Set([5, 8]), own = (e) => SW.has(prep.classAt((e[0] + e[3]) / 2 - e[6] * 0.3, (e[2] + e[5]) / 2 - e[7] * 0.3));
      const out = onceEdgeList(C.position, C.index, 0.02).filter((e) => own(e) && !covered((e[0] + e[3]) / 2 + e[6] * 0.3, (e[2] + e[5]) / 2 + e[7] * 0.3));
      out.covered = covered;
      const W = retainingWalls(out, ground, o.gardenNear, { wallRay: o.wallRay ?? null, publicAt: o.publicAt ?? null, covered: out.covered ?? null, slope: BANK_SLOPE, inTile: (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1 });
      if (W) { weldsNoWalls = names.map((k) => ({ position: S.parts[k].position, index: S.parts[k].index })); appendToPart(S.parts.concrete, W.stone, { aKind: (i) => W.stone.kind[i], aUv2: (i) => [W.stone.tone[i], 0] }); S.parts.grass ??= { position: new Float32Array(0), normal: new Float32Array(0), uv: new Float32Array(0), attributes: {}, index: new Uint32Array(0), vertexCount: 0, extra: null }; appendToPart(S.parts.grass, W.lawn);   /* (a tile with no island has no grass part: the lawn went missing over its hold, a trench) */ S.stats.retainWalls = { edges: W.edges, runs: W.runs, piers: W.piers, metres: W.metres }; wallHold = W.hold; wallTops = W.tops; }
      times["retaining walls"] = Math.round(now() - tw);
    }
    for (const c of S.carve) carvedCells += hm.carve(c.position, c.index, CARVE);
    // (the weld meets the DRAWN surfaces: a sidewalk is its kerb height above the carve's base)
    for (const part of Object.values(S.parts)) welds.push({ position: part.position, index: part.index });
    for (const [name, part] of Object.entries(S.parts)) {
      parts[name] = { position: part.position, normal: part.normal, uv: part.uv, attributes: part.attributes, index: part.index, aSurf: part.extra };
      triangles += part.index.length / 3;
    }
    surfaceStats = { ...S.stats, widthFit, recentre };
    surfaceData = { grid: S.grid, kerbs: S.kerbs, bollards: S.bollards };
  }
  for (const name of surf ? [] : ["asphalt", "concrete", "grass"]) {
    const part = built[name];
    if (!part.vertexCount) continue;
    const index = clipToTile(part, bounds);
    carvedCells += hm.carve(part.position, index, CARVE);
    welds.push({ position: part.position, index });
    const attributes = {};
    for (const [k, a] of Object.entries(part.attributes)) attributes[k] = { array: a.array, itemSize: a.itemSize };
    parts[name] = { position: part.position, normal: part.normal, uv: part.uv, attributes, index,
      aSurf: name === "asphalt" ? surfaceAttribute(net, part) : null };
    triangles += index.length / 3;
  }
  // round 5, JOINS: where a road or sidewalk edge stands over the terrain the ground comes up to it (a shoulder and a
  // bank), not where the DTM has no data, not under the hero bridges' decks (o.ground there is the deck, not the DTM)
  lap("road meshes + carve");
  const noDTM = hm.h?.min != null ? (x, z) => hm.ground(x, z) <= hm.h.min + 0.02 : () => false;
  const weldSkip = (x, z) => noDTM(x, z) || (ground !== hm.ground && Math.abs(ground(x, z) - hm.ground(x, z)) > 0.3);
  // (claude/sidewalk: both banks on the exact distance to the streets' outer edges, viewer/heightmap.js edgeField)
  const field = o.kerbLevel === true && hm.weld ? edgeField(wallTops ? weldsNoWalls.concat([wallTops]) : welds, hm.h, { reach: 4, minWidth: o.clampTop === true ? 0.02 : 0 }) : null;
  lap("edge field");
  const weldedCells = hm.weld ? hm.weld(weldsNoWalls ?? welds, { skip: weldSkip, nearest: o.weldNearest === true, field }) : 0;   // joins2: each cell banks on its nearest edge (heightmap.js weld)
  // joins2: then no terrain over any surface (heightmap.js clampUnder; ?groundweld=old: none)
  const clampedCells = hm.clampUnder && o.weldNearest === true ? hm.clampUnder(wallHold ? welds.concat([wallHold]) : welds, { skip: weldSkip, stackTop: o.clampTop === true, stackGap: 0.3, minWidth: o.clampTop === true ? 0.02 : 0, bank: o.kerbLevel === true ? BANK_SLOPE : 0, bankReach: 3, field }) : 0;
  const atlas = compactAtlas(built.atlas);
  lap("terrain weld");
  if (v2) {
    // the measured paint as its own decal mesh (one draw, viewer/roadPaint.js paintMaterial)
    const paintPart = paintMeshV2(pv.items, prep, bounds);
    if (paintPart) { parts.paint = paintPart; triangles += paintPart.index.length / 3; }
    // (cortenbosch2) words painted on the street (data/overrides.json roadTexts: "Private Weg" / "Cortenbosch")
    const textPart = o.roadTexts ? roadTextMesh(o.roadTexts, prep, bounds) : null;
    if (textPart) { parts.roadtext = textPart; triangles += textPart.index.length / 3; }
    lap("paint decal");
  }
  const out = { parts, atlas, carvedCells, weldedCells, clampedCells, triangles, surfaceStats, surfaceData, netInfo, roadBend: bend, times, net, inventory: pv?.inventory ?? null, paint: v2 ? "v2" : "v1" };
  if (o.keep) Object.assign(out, { prep, built });
  return out;
}
