# Roads round 5 (2026-11-13, branch claude/roads5 from claude/foundation 85685ba)

Brief: the lane graph's jumping "next" links and too-tight turns, the road / terrain joins (road ledges from the
collisions audit), Rue Edith Cavell's centre line. Before = 85685ba, after = this branch. Images: `docs/roads/round5/`.

New checkers (node, headless, the tile worker's road stage):
- `tools/road_audit/lane_links.mjs T...`: next-links whose ends do not touch (> 5 cm), and the tightest radius of each
  of the tile's own junction connectors (3 points 1.5 m apart along it; u-turns apart).
- `tools/road_audit/road_edges.mjs T...`: every open edge of the road meshes against the terrain as drawn (where the
  DTM has data): metres of edge standing more than 10 / 30 / 50 cm over the ground.

## 1. Lane "next" links that jump: fixed (all 120 tiles: 6,595 -> 0)

- **Cause** (road engine, read-only): a junction connector starts at `armPoint(arm, arm.trim, t)`, a point on the
  arm's STRAIGHT frame line from the node, while the lane piece ends at station `s = trim` along the road's fitted
  ALIGNMENT. Where the alignment bends inside the trim (big junctions, radius-clamped bends, "road-swallowed" roads
  whose trim is longer than the road) the two are metres apart. At continuation / split nodes the engine links lane
  to lane with no geometry between lanes up to 2.6 m apart sideways. Our own fits (laneGraph.js centring,
  trafficGraph.js fitToSurface) then moved lane ends one path at a time and reopened some joins.
- **Fix** (`viewer/streets/laneGraph.js joinLaneGraph`, called on the engine's output in `roadBuild.js`, again at the
  end of `refineLaneGraph` and after `fitToSurface` in `trafficGraph.js`): a junction connector off its lanes by 1 m
  or more is rebuilt the way the engine builds one (a cubic with 0.56 x the tangent-intersection handles) from the real
  lane end to the real lane start; smaller offsets, ring and u-turn connectors keep their shape and take the offsets
  faded along their length; a lane-to-lane gap bends one lane end onto the other over up to 12 m. The class raster
  covers the tile's core only: off it, `refineLaneGraph` no longer counts the ground as "off the carriageway" (that
  pulled the edge junctions' connectors into S shapes, `lanes_i6_big_junction_*`).

| tile | links | gaps > 5 cm before | after | largest gap before |
|---|---|---|---|---|
| I6 | 526 | 48 | 0 | 19.2 m |
| H5 | 773 | 73 | 0 | 14.4 m |
| E4 | 801 | 170 | 0 | 92.2 m (a road swallowed by its junction) |
| D10 | 573 | 82 | 0 | 16.4 m |
| G10 | 227 | 36 | 0 | 6.8 m |
| all 120 | 52,289 | 6,595 | 0 | 315 m |

In the city (`window.__trafficTiles`, D10 with its ring C9 D9 E9 E10): 0 gaps. Plots (lane paths over the measured
classes, black = lanes, blue / red / green = straight / left / right connectors): `round5/lanes_e4_swallowed_road_*`,
`lanes_i6_big_junction_*`, `lanes_i6_side_street_*`, `lanes_g10_tight_*`.

## 2. Too-tight turns: better, not all >= 5 m

- **Cause**: the connector starts where its lane ends (the arm's trim); where a side street's lanes run up to the
  crossing road (small trim, oblique arm) a left / right turn has 3-7 m to happen in: radii of 0.8-2 m.
  `refineLaneGraph`'s smoothing keeps the ends fixed, so it could not widen them.
- **Fix** (`laneGraph.js widenTightTurns`): the entry lane's end and / or the exit lane's start are cut back 1 m at a
  time (every connector at that lane end is rebuilt from the new point) until the turn's tightest radius is >= 5 m,
  within limits: a lane keeps max(3 m, 40 %) of its length, at most 8 m per end, an approach never ends before its
  painted stop / give-way line, no rebuilt connector gets more points off the measured carriageway, no connector at
  that end gets tighter.

| tile (own connectors) | min radius before -> after | p10 before -> after | under 5 m before -> after |
|---|---|---|---|
| I6 | 0.76 -> 2.87 m | 2.09 -> 4.29 m | 46 -> 22 |
| H5 | 0.77 -> 3.27 | 2.09 -> 4.34 | 44 -> 21 |
| E4 | 1.19 -> 1.32 | 2.30 -> 3.68 | 70 -> 43 |
| D10 | 1.95 -> 1.95 | 4.55 -> 4.03 | 15 -> 19 |
| G10 | 1.39 -> 3.07 | 1.71 -> 4.84 | 16 -> 6 |
| all 120 | 0.56 -> 0.75 (worst tile) | median of tiles 2.37 -> 4.04 | 3,153 -> 1,756 |

D10 got slightly worse: its old connectors were smooth but did not touch their lanes (gaps up to 16 m); joined, a few
must bend more. What is left under 5 m: the cut is limited by a painted line or a short lane, or the junction is
an engine cluster of nodes close together (E4 (-900, -150), D10 (-1000, 2780)); E4's roundabout ring connectors wobble
(minR 1.3 m, `keepOnCarriage` on the ring).

## 3. Road ledges / road-terrain joins: fixed at the three named places, 183 km -> 12.5 km of edges over 30 cm

Three causes, three fixes:

1. **D10 Rue de la Brasserie / Vieux Chemin (-1265, 2663), road 1.1-1.4 m over the terrain**: the engine's
   `relaxNodeHeights` moves junction heights until every road can climb within its type's grade limit (local 12 %,
   collector 9 %, avenue 8 %); Uccle's real streets are steeper, so junctions were lifted / sunk up to 2.7 m and their
   roads with them. Fix `viewer/streets/roadLevels.js relevelRoads` (between `buildRoadNetwork` and the meshes): a
   junction the relaxation moved by 0.2-3 m goes back to its DTM-fitted height and its roads get their terrain profile
   again (grade limit raised to what the measured climb needs). Left alone: junctions over no DTM data (outside the
   region, off the tile's grid), on ground that is no plane (RMS > 0.5 m: a cutting, a wall, a bridge), moves over 3 m,
   roads with a bridge / tunnel or an authored profile. D10 spot: 1.27 -> 0.14 m over the terrain.
2. **Every road edge over a lower ground (G10 Avenue Buysdelle (148, 2677): sidewalk 0.43 m over the lawn)**: the
   terrain was only ever carved DOWN under roads. Fix `viewer/heightmap.js weld` (called in `roadBuild.js` after the
   carve, on the drawn road meshes): under a drawn surface the terrain comes UP to the carve depth (0.12 m) under it,
   beside it a 1.5 m shoulder at its edge's height, then a bank down at 0.7 m/m (at most 4 m out). Only raises; not
   where the rise would pass 2 m (a structure), where the DTM has no data, under the hero bridges' decks. Steep faces
   (kerb faces, skirts) cover nothing. Worker time +60-140 ms a tile.
3. **Verrewinkel SE end, street 0.1-0.2 m under the deck on its SW half**: the measured street's height field
   (least-squares planes over 6 m cells) cannot follow the deck end. Fix `viewer/rail/railData.js roadDeckPins` +
   `roadBuild.js o.levelPins`: the street's carriageway is blended onto the deck's level (with its grade) over 6 m past
   each end, between the kerb lines. Street at the joint, raycast: 0.15 m under -> 0.01 m.

| tile | road edges > 30 cm over the terrain, before -> after | > 50 cm |
|---|---|---|
| I6 | 2,510 -> 52 m | 258 -> 3 |
| H5 | 2,085 -> 30 | 214 -> 4 |
| E4 | 808 -> 10 | 25 -> 0 |
| D10 | 3,679 -> 51 | 2,102 -> 20 |
| G10 | 3,905 -> 191 | 1,589 -> 89 |
| F7 | 1,165 -> 140 | 241 -> 90 |
| D9 | 2,147 -> 489 | 895 -> 433 |
| E10 | 5,073 -> 1,739 | 3,146 -> 1,683 |
| all 120 | 183.5 km -> 12.5 km | 49.4 km -> 8.0 km |

(all-120 after counted with the 1.6 m relevel limit, raised to 3 m at the end: D10 226 -> 51 m.) No tile got worse.

In the city (`viewer.collisionTest`, drive "invisible hit" on a ledge = a step over 0.5 m with no wall, and
`viewer.contactAudit("roads:<tile>")`):

| tile | ledge hits before -> after | contact overhang (m) | contact floating (m) | blocking |
|---|---|---|---|---|
| D10 | 7 -> 5 | 288 -> 166 | 1,839 -> 1,679 | 1,037 -> 930 |
| G10 | 1 -> 1 | 262 -> 33 | 1,355 -> 1,247 | 1,054 -> 844 |
| E10 | 9 -> 7 | 237 -> 120 | 1,960 -> 2,078 | 1,284 -> 1,510 |
| D9 | 10 -> 6 | 148 -> 64 | 1,712 -> 1,648 | 985 -> 1,114 |

The contact check counts an edge 2 cm-0.3 m over the ground as "floating" and over 0.3 m (at street level) as
"overhang": raising the ground turned many overhangs into small floats, so "blocking" went up on E10 / D9 while the
gaps got smaller. What is left: the engine-only roads (no UrbIS surfaces: no skirts) stand 5-12 cm over their carve
along their edges by design; D10's 3 ledges at (-1060..-1113, 2898..2919) and E10's at the region border are roads
over the DTM's no-data plain (see below); D10 (-1016..-1020, 2722) is a road CUT 3 m into the slope (a vertical
earth wall, unchanged from before: a retaining wall to draw); G10 (481.5, 2751.3) not looked at.

Images (street level): `round5/d10_brasserie_{before,after}.png`, `g10_buysdelle_{before,after}.png`,
`g10_buysdelle_close_{before,after}.png`, `verrewinkel_se_{before,after}.png`, `verrewinkel_nw_after.png`.

**Found, not fixed (big)**: outside the Brussels region the DTM has no data and the tile grid holds the tile's lowest
value there (D10: 43.8 m, a third of the tile): a flat dark plain 5-10 m under the real ground, with earth cliffs at
the region border, roads over it floating 10-20 m (the engine even calls them bridges) and a hole at (-1020, 2930).
Needs terrain for the Flemish side (another DEM) or the roads / terrain clipped at the border.

## 4. Rue Edith Cavell's centre line: fixed

The street is OSM tertiary -> engine "collector", whose default stack has a dashed centre line; the measured-paint rule
removes guessed centre lines on residential types only (owner decision 1). The 2024 orthophoto shows no centre line at
(569, -1300), (540, -1040), (600, -760), (632, -640) (parking bays both sides, a SCHOOL legend), and UrbIS Topo has
none. Fix: `data/overrides.json centreLine` (OSM way 30528461 and 27861247 -> "none", with why / source), applied by
`roadBuild.js applyRoadOverrides` (the worker, the checker's `tile.mjs` and the Road Lab; it also does the old
roadSurface override). Images `round5/cavell_{before,after}.png` (H3, looking NE up the street).

## 5. Kerb gaps: not done

## Cost

- Road triangles: unchanged (I6 80,038, D10 36,472, G10 32,588).
- Terrain triangles after the mesh simplification (the ground now follows every road edge): I6 100,250 -> 113,900
  (+13.6 %), D10 85,876 -> 93,474 (+8.8 %), G10 97,258 -> 101,498 (+4.4 %). Tried and not helping: leaving the ground
  under roads alone except near edges, a shorter / steeper bank.
- Worker: terrain weld 60-140 ms a tile; lane graph ~+20 ms (tight-turn search); relevel < 5 ms.
- Road checker (I6 H5 E4 D10 G10): unchanged except C22 kerb warnings 569 -> 544, C21 concrete normals 5 -> 7 and C9
  coplanar 174 -> 175 (cm² pairs on the relevelled engine roads).
- No GPU claims (shared GPU).

## Shared files touched (merge carefully)

`viewer/tileData.js` (imports `applyRoadOverrides`, `roadDeckPins`; passes `levelPins` to `buildRoadData`),
`viewer/roadBuild.js`, `viewer/heightmap.js` (new `weld` method), `viewer/rail/railData.js` (new `roadDeckPins`),
`viewer/traffic/trafficGraph.js` (imports `joinLaneGraph`), `viewer/streets/laneGraph.js`, `labs/road-lab.js`,
`tools/road_audit/tile.mjs`, `data/overrides.json`, `viewer/tileWorker.bundle.js` (rebuilt). No tile data changed (no
manifest bump). main.js not touched.
