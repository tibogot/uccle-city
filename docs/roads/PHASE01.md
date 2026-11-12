# Road System v2: phases 0 and 1 (2026-11-10, branch claude/roads2)

Research and plan: `docs/ROADS_V2_RESEARCH.md`. Owner decisions (2026-11-10): (1) residential streets get no centre
line unless measured, after an orthophoto sample; (2) write to Brussels Mobility (`brussels_mobility_request.md`, the
owner sends it); (3) roads UrbIS does not map keep the current method; (4) no OpenDRIVE export.

## Phase 0: measure

- **Data**: `pipeline/fetch_markings.py` caches 7 WFS layers per tile in `data/raw/markings/` (UrbIS Topo marking
  line / point, BM crossing polygons, BM marking inventory lines / polygons / points, BM traffic signs);
  `pipeline/build_markings.py` writes `data/tiles/<T>/markings.json` (crossings bm / topo / osm with their outline and
  road axis, Topo stop and give-way lines, Topo lines, arrows, the BM inventory as it is, B1 / B5 signs, OSM crossing
  and control nodes). Listed in the manifest (`files.markings`). Uccle totals (unique): 1,293 BM crossing polygons,
  2,201 CR2301L, 80 CR2302L, 50 CR2303L, 590 CR21* / CR22* lines, 307 CR24*P, 3,271 + 2,631 + 883 BM inventory items,
  349 B1 / 14 B5 signs.
- **Road Checker v0**: `tools/road_audit/road_audit.mjs` (see its header for the CLI). It runs the worker's own road
  stage (`viewer/roadBuild.js`, now shared by the worker, the checker and the lab) headless, implements C1-C9 and
  C10-C13 (C7 = the engine's hold points against the painted lines; C11 = bridges / tunnels at ground level; C12 =
  orthophoto stripe score, soft). It writes JSON + Markdown with world positions and exits 1 on blocking errors.
  Findings with no measured surface within 3 m are "outside UrbIS" (info), in both runs alike.
- **Road Lab**: `labs/road-lab.html`, with the 10 junctions over the 25 cm orthophoto, measured vs our paint, the
  checker markers (click to fly), the engine lane graph, and a v1 / v2 toggle (v1 = the engine rules on the old network,
  `labs/data/roads-v1`). `window.lab.go(j, paint, view)` is there for scripts.
- **Centre-line sample** (`tools/road_audit/centreline_sample.mjs`, `docs/roads/centreline_sample/`): 80 random
  residential stretches of 40 m, inspected by eye on contact sheets. 1 with a centre line (Rue Basse, G6, dashed;
  not in UrbIS Topo), 51 clearly without, 28 too hidden by trees or shadow to tell. The automatic ridge score agreed
  (4 / 80 above 0.056 against 8 / 12 on the calibration streets where Topo has a line). This confirms decision 1.

## Phase 1: stop inventing (our code only; vendor/ untouched)

- `viewer/streets/measuredPaint.js` (paint **v2**, the default; `?paint=v1` = the old rules):
  - **Engine inputs**: no engine zebras on mapped junctions (`crosswalks = false`); no stop / yield lines from road
    rank (`control = "priority"` unless OSM has signals; roundabouts keep their ring-entry teeth).
  - **Residential streets**: no centre line unless a Topo line runs along the street (decision 1).
  - **Cycle lanes**: no guessed cycle lane; OSM `shared_lane` becomes sharrows (325 symbols) inside the traffic lane.
  - **Parking**: guessed parking strips keep their space (parked cars, traffic lane positions) but lose their paint.
  - **Crossings**: the measured ones (BM polygon, then Topo pair, then an OSM marked node as a 3.5 m band; that band is
    dropped when it overlaps a measured outline or spans more than 14 m), drawn kerb to kerb on the measured carriageway.
    Lane lines end before a crossing on a junction arm.
  - **Stop / give-way lines**: Topo as surveyed. Otherwise only with a controller (OSM signal junction, OSM stop /
    give_way node, BM B5 / B1 sign on that approach), 1 m upstream of the arm's crossing (or 0.5 m past the measured
    junction polygon), across the incoming lanes only, never on a crossing.
  - **Roads / junctions UrbIS does not map**: they keep the engine (decision 3).
- **Decal paint mesh** (`paintMeshV2`, `viewer/roadPaint.js paintMaterial`): one draw per tile, clipped to the measured
  low carriageway triangle by triangle, 2 cm above H. Box-filtered stripes / edges (no texture, no far shimmer).
- **Z-fighting** (`viewer/surfaces.js`): engine pieces that overlap get lift tiers (1.5 mm apart, junction pads, then
  the higher road rank on top). Folded strip triangles (uv orientation disagrees with their piece) are dropped.
- **Curves** (`pipeline/refine_roads.mjs`): no more PI deletion (drop-pi 1,021 to 0). In order: fit-curve (the PIs
  become one arc through the drawn curve, at most 1.2 m off), split-corner (a > 50° PI becomes a two-arm junction
  node, a kerbed corner), narrow-sidewalk, slim-road (no guessed parking strip, 0.5 m engine sidewalks), keep-tight
  (flagged). Network: fit-curve 415, split-corner 107, narrow 527, slim 442, keep-tight 84. Engine tight-bend errors
  left: 317 (11 before, but at the cost of the chords).

## Checker, 120 tiles, before (v1 rules, old network) vs after (v2, new network)

| Check | before err / warn | after err / warn |
|---|---|---|
| C1 zebra on one arm | 2,088 / 1,254 | 90 / 214 |
| C2 zebra square and full | 2,481 / 711 | 12 / 373 |
| C3 stop line before the junction | 517 / 37 | 89 / 326 |
| C4 paint on the carriageway | 4,319 / 80 | 387 / 65 |
| C5 paint = evidence | 3,566 / 0 | 73 / 0 |
| C6 lanes on the street (warn) | 6,764 | 6,852 |
| C7 hold points vs paint (warn) | 135 | 255 |
| C8 curve continuity | 1,064 (49 folds) | 1,142 (159 folds) |
| C9 coplanar overlaps (clusters) | 3,333 | 3,391 (pairs 85,710 to 65,120, area 7,109 to 4,582 m²) |
| C10 seams (warn) | 250 | 268 |
| C11 levels (warn) | 21 | 21 |
| C12 ortho review | 2,698 | 768 |
| **blocking total** | **17,368** | **5,184** |

Inventory after: crossings bm 1,261 / topo 65 / osm 105 / engine (unmapped) 391; stop lines topo 162 / osm 327 /
bm 25 / engine (unmapped) 127; ring teeth 103; sharrows 325.

## Performance

- **Worker road stage**, Node, sequential, 120 tiles: median 747 to 937 ms per tile (+25 %). The time goes to the
  overlap tiers and fold test in `buildSurfaceRoads`; measured paint takes 3-10 ms and the decal 5-7 ms.
- **Paint decal**: 84,550 triangles over the whole of Uccle (I6 841, E4 2,871).
- **Marking atlas**: I6 1614 x 1776 to 1120 x 1180 texels (fewer junction marks to rasterise); E4 about the same.
- **GPU**, city at Saint-Job, fixed camera, 3 × 8 s: v1 13.4 / 14.2 / 13.7 ms against v2 10.4 / 11.8 / 14.4 ms;
  451 draw calls in both. This is within noise: other agents' tabs were using the GPU, so take it as "no measurable
  cost".

## Images

- `img/junctions/junction_NN.jpg`: photo | before | after for the 10 lab junctions.
- `img/city_stjob_moving_v2.jpg`, `img/city_i2_moving_v2.jpg`, `img/city_e1_moving_v2.jpg`: the city, moving camera.

## Traffic (claude/traffic, not edited)

`tools/road_audit/traffic_check.mjs` runs that branch's `trafficGraph.js` (a scratch copy) on v1 and v2. The graph
builds the same way on both: I6 32 to 36 junctions, signal 5 to 8, priority 99 to 105; E4 and E1 alike. Phase 3 needs:

1. Hold points from `rd.inventory.stops` (`line`, `node`, `road`, `end`, `controller`) instead of the engine's lane
   `stop` station. Today they sit 4-6 m (median) from the painted line.
2. Delete `fitToSurface` once lanes come from the street model.
3. `tileData.js` now calls `buildRoadData`. The traffic step must take `rd.net` and `road.surfaceData` from it: a
   small merge conflict.
4. Pedestrian-signal 2-arm nodes on I6 went from 2 to 0 with the new network (node topology changed in the refine):
   check when merging.
