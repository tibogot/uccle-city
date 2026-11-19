# Class R: the road graph and the street edges (branch `claude/roads`, 2026-11-18/19)

Owner playtest 2026-11-18 round 2 (docs/TODO.md "CLASS R"): traffic cars slalom; a white car on the Chaussée de
Waterloo leaves the road and drives through a house; a white line on the Avenue du Prince de Ligne runs diagonally
across the lane near the right kerb; bush clumps stand on the Chaussée de Waterloo carriageway; the player's car drives
onto front lawns (Rue Papenkasteel). The owner: not one by one: the cause of each class, a rule, an automated check.

Rule 38 (docs/QUALITY_RULES.md), gate rows `roads` + `roadsim` (tools/audit/mergeGate.mjs), switch `?roads=old`
(viewer/features.js, the "road surfaces" select: "measured, class R as before").

## 1. Research: how road systems build drivable lane paths

**What good systems do.**

- **The centre line is an alignment, not a polyline.** Highway design (AASHTO "Green Book", ch. 3; the Euler spiral /
  clothoid transition) fits the road's line as tangent - spiral - arc - spiral - tangent, so curvature changes linearly
  along the road and a driver turns the wheel at a steady rate. Our engine (vendor/roads/roadAlignment.js, read-only)
  already does this: every PI of the OSM line becomes spiral - arc - spiral, curvature continuous ("k(u) = k0 + (k1 -
  k0) u / len"). So the road lines are G2; the wobble comes AFTER them.
- **A lane is an offset curve of the alignment at a smooth offset.** OpenDRIVE (ASAM OpenDRIVE 1.6, "lane offset" and
  "lane width" records) describes every lane by a lateral offset that is a cubic polynomial in s per record, with C1
  joins: a lane changes its offset only through a smooth transition, it is not shifted point by point. The offset of a
  curve has no cusp as long as 1 - k t > 0 (rule 24 already trims the inner side where it fails).
- **Mr.doob's slop-newyork** (js/road-network.js, js/traffic.js; read 2026-11-19): every edge is straight between
  shape nodes, "lanes are only dropped, never shifted along an edge" (a constant per-edge offset; an obstacle drops the
  lane), the turns at junctions are cubic Béziers with 0.552 handles ("a quarter-circle-like arc"; an S-bend for a
  straight lane shift), and the car follows the path with a Stanley-style steering controller whose steering angle
  and yaw rate are rate-limited: the trajectory is smooth even where the path is not.
- **Junction connectors** in traffic simulators (SUMO netconvert "internal lanes"; CARLA / OpenDRIVE junction
  "connecting roads") are short arcs or spirals INSIDE the junction area only; the approach lanes follow their roads up
  to the junction's edge. A connector is never longer than the junction.
- **Who drives where.** Routing engines keep through traffic off restricted / service ways: OSRM's car profile
  (profiles/car.lua) blacklists access=private / no / customers / delivery and penalises highway=service;
  SUMO's OSM typemap gives highway.service the lowest priority. Our city's own rule for "where cars drive"
  (viewer/streets/carriageway.js NOT_DRIVEN: footway, path, cycleway, service, track, ...) was not the traffic
  graph's: the traffic drove the 2,360 service ways too.
- **Smoothing measured data.** Fitting a line to noisy measurements with a running median holds a constant; a robust
  local LINE (Theil-Sen: the median of the pairwise slopes) follows a trend and keeps the median's robustness to
  outliers (bulb-outs, lay-bys).

**What the city's data offers.** OSM: highway class, lanes, oneway, width (rare), parking:lane (rare), service /
access (in data/raw/osm/area.json, not carried into roads.json); UrbIS: the measured street surfaces (roadway,
parking, sidewalk, median ... classes, kerb lines BR0101L), the topo lines (driveways CR42L on the property line,
markings CR21L / CR22L), the building footprints. The measured carriageway is the truth where UrbIS maps the street;
the OSM band (the stack's width round the OSM line) only where it does not.

**Applied here:** lanes keep one offset and change it only by smooth reverse curves (1:10 ramps, C1 blends); a
junction turn is an arc in the junction, the lanes follow their roads to it; traffic drives the streets the city calls
carriageway; the line fit follows trends with a robust local line.

## 2. Census (before = `?roads=old`, city-wide, 120 tiles)

Detectors: `tools/audit/census/roads.mjs` (the graph, the plants, the frontage; shares lib_street.mjs / lib_mesh.mjs,
the wobble detector in lib_path.mjs) and `tools/audit/census/roadSim.mjs` (the sim's cars). Reports:
`docs/census/roads_old.json` (before), `docs/census/roads_after.json` (after). Positions in local metres (x east, z
south): `?quick=1&at=x,z`.

**How the slalom is measured.** Each lane piece's points are put in its road's frame (lineFit.js `roadFrameOf`:
station and lateral t on the engine's alignment of the OSM line), so the road's own bends drop out; t(s) every 1 m
minus its local quadratic fit over +-15 m (Savitzky-Golay) is the wobble. Flagged: |wobble| >= 0.2 m (wobble
metres); two opposite deviations >= 0.15 m within 25 m (slalom metres). Every flagged place is traced back through the
graph's build stages (trafficGraph.js `trace`) to the first one where it appears: the cause. The sim run records each
car's POSE while it drives a lane piece and judges it the same way (so the eased passes, joins and hand-overs count).

| class | measure | before (`?roads=old`) | after |
|---|---|---|---|
| a. slalom (graph) | slalom / wobble metres, of 425.7 km of lane | **58,261 / 34,863** | **7,889 / 4,260** (of 340.2 km: the service ways are out) |
| | by first stage | fit 47,618, refine 10,191, alignment 6,222, kinks 649 | refine 6,274 (lanes fitted to their paint swerving round kerb build-outs / chicane islands), alignment 1,597, fit 809, join 160, kinks 99 |
| | heading change per metre on straight roads, p99 / p99.9 | 7.7 / 23.7 deg/m | 2.7 / 6.3 deg/m |
| a. slalom (the sim's cars, I6 E7 J6 D6, 120 s) | slalom / wobble metres per km driven | **122.6 / 71.6** | **10.0 / 7.1** |
| b. traffic in a building | places (m of path) | **191** (3,078 m) | **35** (624 m) |
| b. traffic off the drawn carriageway (> 0.5 m) | places (m) | 723 (95.3 km: mostly service ways) | 337 (10.6 km) |
| c. painted lines | see section 4 (markings census, new laneSkew / tick measures) | | |
| d. plants on the carriageway | shrubs on / crown > 0.3 m in; beds on | **878 / 51; 17** | **0 / 2; 0** |
| e. private land the test called carriageway (nothing drawn) | metres of street side | **8,136** | **550** |
| e. garden kit dropped as "on the carriageway" | metres of walls / railings / hedges | **4,761** | **1,787** |

Worst before (x, z): slalom B6 Petite Drève du Maréchal (-2104, 616) 340 m, fit; I3 Avenue De Fré (1120, -589) 340 m,
refine; K8 Avenue Van Bever (2389, 1539) 230 m, refine; F6 / H6 Chaussée de Saint-Job (-338, 756) 201 m, (816, 689)
200 m, fit; E3 Chaussée d'Alsemberg (-901, -629) 126 m, fit. In a building: C5 Rue de Stalle (-1702, 273) 308 m, 12.4 m
deep (a private service road through the depot); G3 Chemin de la Source (277, -522); J6 (1664, 830): the two 154-157 m
turns of the Chaussée de Waterloo junction n30151547 (1754, 816) running straight across the block from the service
alley behind the houses (the owner's car "through a house"); J6 Chaussée de Waterloo (1733, 930), a service ramp
(layer 1) through a building. Plants: J5 / J6 Chaussée de Waterloo (1720.6, 329.3), (1726.1, 571.3), (1726.4, 575.4):
laurels on the engine asphalt drawn past the measured kerb (the owner's bushes); G7 Avenue de la Chênaie (28, 1007),
E6 Dieweg (-955, 781). Band on private land: E6 Rue Papenkasteel (-731, 942.5) 52 m, 2.8 m deep, E7 (-583, 1153) 54 m,
7.8 m deep (the owner's lawns), K10 Chaussée de Waterloo (2328, 2617).

**The causes.**

- **a. Slalom: the lane fit moved each POINT.** `trafficGraph.js fitToSurface` gives every lane point the shift it
  needs (off the kerb raster, clear of a parked car), then smoothed it with a +-6 point average, "never less than the
  point needs" and 0.2 m/m ramps (trafpark): the lane went out round every parked car and back into every gap between
  two (Av. Hippolyte Boulenger I6: from t 1.5 to -0.2 and back every 10-20 m). The same tent-per-point in
  `laneGraph.js keepOnCarriage` made lanes weave past every kerb build-out (Av. Van Bever's chicane islands). 82 % of
  the wobble first appears at the fit, 17 % at the refinement. The engine's alignment (spiral - arc - spiral) itself is
  smooth; "alignment" (11 % before) is OSM shape noise on short winding lanes.
- **b. Through houses: two causes.** (1) The traffic drove the service ways (OSM highway=service: alleys behind the
  houses, private estate roads, car-park ramps: 85 km of lane), which the city's own carriageway test
  (carriageway.js NOT_DRIVEN) never calls carriageway. (2) A junction whose arm trim is longer than the junction (a
  5-arm node on the Chaussée de Waterloo, J6) ended its lane piece 128 m up the road, and the rebuilt turn
  (joinLaneGraph's cubic from lane end to lane start) cut straight across the block.
- **c. The Prince de Ligne line.** The census did not miss it: J5 (1590, 362.7) and (1670, 352) were in its skew count
  (8 m each), under the ceiling the markings merge set (341 m). The cause: the line fit's running median (lineFit.js
  `smooth`, 30 m) holds a CONSTANT, and on a short road (r220837890, 37.7 m: every sample within one window of an end,
  the 6 m mouths unmeasured) one value held the whole road: the strips stayed parallel to the OSM line, which meets the
  measured kerb at an angle, so the lines (and the lanes, moved with them) ran diagonally toward the kerb. The census
  judged strokes against the kerb only (not the lanes) and never traced the parking-bay ticks: both added (laneSkew,
  tickSkew / tickLane; 3 / 2 / 0 m on the owner's 9 tiles: not the cause).
- **d. Bushes on the road.** tools/plants/build_plants.py keeps shrubs off the UrbIS street SURFACES, by the centre cell
  only; the city also DRAWS engine asphalt where no measured edge cuts it (a forecourt mouth on the Chaussée de
  Waterloo) and over unmeasured streets; nothing at load checked the plants against the drawn carriageway (the garden
  kit, the signals and the tram poles all are).
- **e. Lawns.** `carriageway.js inside` fell back to the OSM band (the stack's width round the OSM line: 5.4 m for Rue
  Papenkasteel's driving + parking lanes) wherever the point was not a measured surface, INCLUDING private land beside a
  measured street: main.js drops every garden piece "on the carriageway" (`drivenAt.inside(x, z, 0.3)`), so the front
  walls, railings and hedges the kit had placed on the property line went (4.8 km city-wide) and the lawn behind the
  sidewalk opened. **Decision (what is drivable):** the carriageway and the paving (sidewalk, square, ramp, a driveway
  mouth) are drivable, the kerb is ridden up (docs/CARCTL.md: kerbs climbed by design, the police game mounts
  sidewalks); private land is closed where the data has a boundary: the garden kit's walls / railings are hard, its
  hedges soft (drag), its car gates open where UrbIS draws a driveway (CR42L) or a ramp. Where no data holds a boundary
  the lawn stays open (a real car could cross it too): the frontage census counts it, for the front-gates job (TODO
  "REALITY CHECKS: FRONT GATES"): 221 km of 404 km of street side reaches private land with nothing drawn between
  (54 %; 155 km of it behind a measured kerb); hard 37 km, hedge 12 km, gate / driveway 82 km, building 43 km. The
  worst open runs are the Flemish edge (B6 Sterstraat, B7 Brouwerijstraat, K12 Waterloose Steenweg: no UrbIS, no kit)
  and the forest drèves. An invisible collider would break rule 25 (every collider stands for something drawn); the
  missing fronts are the gates job's to draw.

## 3. Fix by cause (`?roads=old` = all of it off; tile entry `roadsR`)

- **Lane offsets as a road system lays them** (viewer/streets/laneOffset.js `laneOffsetProfile`, used by trafficGraph.js
  fitToSurface and laneGraph.js keepOnCarriage): the needs as left / right envelopes, gaps under 30 m held, dilated by
  8 m, ramped <= 1:10 (5.7 deg), box-averaged twice over +-4 m (C1 blends, never under a need), a side switch
  slope-limited too. As OpenDRIVE's lane offsets and Mr.doob's per-edge lanes: one offset, smooth transitions.
  Not for a lane fitted to its painted lines (rule 33, laneGraph.js `fitted`): it stays on its paint (the paint already
  follows the kerbs, smoothed over 30 m) and keeps the short tent past a kerb build-out; held there, the profile put
  lanes 0.2-0.5 m off their paint over whole stretches (the markings gate's lane-to-paint p95 0.08 -> 0.5 m). That is
  the 6.3 km "refine" left: lanes swerving round measured build-outs / chicane islands their painted lane runs into
  (Avenue Van Bever K8 690 m: real chicanes, alternate islands every 12-30 m; Avenue De Fré, Rue de Stalle, Avenue
  Brugmann). On the owner's streets (Ch. de Saint-Job, d'Alsemberg, de Waterloo) 320 m are left city-wide (before:
  F6 / H6 Ch. de Saint-Job alone 401 m).
- **Junction turns inside their junction** (laneGraph.js `roadFollowTurns`, start of refineLaneGraph): a turn end more
  than 20 m from its node follows its road's alignment at the lane's offset to 10 m from the node; only that last part
  is the cubic arc.
- **The traffic drives what the city calls carriageway** (trafficGraph.js buildTrafficGraph): lanes on NOT_DRIVEN roads
  (service, track ...) and their turns are left out. The engine still draws those ways; the player drives them.
- **The OSM band only off measured streets** (carriageway.js `bandOnMeasured` / `drawn`, `drawnTest`): where the road's
  own centre is on a measured surface, private land is carriageway only where a street is DRAWN there (the drive
  raster's road pieces; main.js, driveCheck, colliderAudit and the census alike). The garden kit's pieces on the lawns
  stay (Rue Papenkasteel's hedges at 5.0 m, walls at 4.5 m from the centre line). The worker's LiDAR-tree step keeps
  the band as before (no drawn raster there yet; a trunk moved out of a garden's first metres is cheap).
- **No plant on the drawn carriageway** (viewer/plants/plantsClear.js, main.js before the plants are added): a shrub
  whose foot is on the carriageway or whose crown (0.4 x its height) reaches > 0.15 m into it is not drawn; a bed
  likewise by its strip (854 of 89,225 shrubs, 57 of 5,638 beds).
- **The line fit follows trends on short roads** (lineFit.js `smoothTrend`, roads under 42 m): a Theil-Sen local line in
  place of the running median, outliers judged against the road's own robust line, the slope cap 1:5 (was 1:8).

Perf: all in the tile build (no per-frame work, no allocation per frame, no draw call): laneOffsetProfile is
O(points x window) per lane, roadFollowTurns runs on the few far turns, plantsOffCarriageway once per tile on the main
thread (about 9 point tests a plant). Worker code changed (trafficGraph, laneGraph, laneOffset, lineFit, roadBuild,
carriageway): the worker bundle is rebuilt in the main repo at merge (rule 12).

## 4. Painted lines (markings census, rule 33's gate row)

markings.mjs now also measures `laneSkew` (a stroke crossing the driven lane it lies on, judged against the lane, not the
kerb, wherever the lane is straight: the junction / build-out exclusions of the kerb test do not apply) and the
parking-bay ticks the shader paints (`tickSkew`: not square to the road; `tickLane`: on a driven lane); `--roadsold`
for the A/B. City-wide (120 tiles, `--roadsold` vs default): off the street 472 -> 474 m, at a kerb 366 -> 366 m, skew
341 -> 338 m, laneSkew 29 -> 29 m, lane-to-paint p95 0.08 -> 0.08 m. The trend fit runs only on roads shorter than
42 m (two median windows + mouths, where the median held one value): on longer roads it tilted lines at junction
flares (Av. de Boitsfort K4 +22 m skew, Av. Brugmann F1 +13 m), so there the median stays. Found on the way: the
parking-bay ticks are not square to their road on 250 m of tick (both modes; tickLane 11 m on a driven lane): the
engine's tick iso-lines follow the strip's station, which the bend trim and the line fit skew (a next job). Left: J5 (1586.6, 362.5), 9 m:
r220837890 is a 37.7 m piece INSIDE the junction funnel of the dual carriageway's split (its right kerb runs from -9.5
to -3.1 m in 37 m, a refuge island at 4-10 m): a junction mouth an along-road fit cannot follow.

## 5. Rule 38, gate, browser turn

Rule 38 (provisional) in docs/QUALITY_RULES.md. Gate rows (tools/audit/mergeGate.mjs): `roads` (ceilings at the
after-counts: slalomM 7889, wobbleM 4260, headP999 6.3, inBuildingPlaces 35, offCarriagePlaces 337, plantsOn 0,
plantsReach 2, bedsOn 0, bandOnPrivateM 550, gardenDroppedM 1787) and `roadsim` (perKm 12, wobblePerKm 8.5: 10.0 / 7.1
measured, a margin for the sim's time-sliced steps). `?roads=old` fails both: slalomM 58,261, wobbleM 34,863, headP999
23.7, inBuildingPlaces 191, plantsOn 878, bedsOn 17, bandOnPrivateM 8,136, gardenDroppedM 4,761; the sim 122.6 / 71.6
per km. Rows lowered by this branch: `drivecheck` --max 211 -> 157 (the traffic off the service ways and the far turns
along their roads: 54 fewer blocked places), `markings` skew 341 -> 338 (offStreet 472 -> 474: +2 m on H6 Avenue
Latérale (885.5, 510.6), one stroke the short-road trend fit moves 0.1 m; atKerb 366, laneP95 0.08 unchanged).

Left (named, not fixed here): slalom "refine" 6,274 m (above), "alignment" 1,597 m (OSM shape noise on short winding lanes: E1 Avenue Saint-Augustin
(-754, -1969), B4 Rue Jean d'Osta), "refine" 923 m (G7 Rue de Verrewinkel (68, 1349) at the hero bridge deck squeeze,
C8 Rue Zandbeek); in a building 35 places (C6 / C5 Clos des Myosotis (-1700, 513): a residential clos whose OSM line
runs through the houses; F1 Rue Vanderkindere (-146, -1640), the Avenue Albert lane through a block interior,
docs/DRIVECHECK.md cause a; G6 Chaussée de Saint-Job (212, 798) turns; E6 (-524, 929) the band lane inside a building;
J6 Chaussée de Waterloo (1723, 546): its OSM line ~10 m east of the measured carriageway, the lane fitted 7 m back
but 2.4 m short); off the carriageway 337 places (the Flemish edge's unmeasured roads, K11 Chaussée de Waterloo).

**Browser turn** (the coordinator's; mergeGate BROWSER "ROADS"): the owner's spots with `?roads=old` alternated: Ch. de
Waterloo J6 &at=1700,815 (no car turning into the alley / across the block), the bushes &at=1726,573 and
&at=1720.6,329.3, Av. du Prince de Ligne &at=1590,362, Rue Papenkasteel &at=-729,949&view=drive (the hedges / walls
stand, the car stops at them; a lawn behind a gap in them is still open); a few minutes of traffic on Ch. de Saint-Job
(&at=-338,756, &at=816,689), Ch. d'Alsemberg (&at=-901,-629), Ch. de Waterloo (&at=1729,607): no weaving between
parked cars, no sideways jumps. The tour will flag views where garden pieces come back and plants go: intended.
Worker bundle: rebuild in the worktree for the browser turn only (rule 12).

## 6. Round 2 (coordinator, 2026-11-19): the in-building places fixable by cause

The 35 places left were sorted by cause. **The OSM line far off the measured street** (no carriageway within 9 m
of the lane, the lane through the houses): `trafficGraph.js fitToSurface`, with the worker's building test
(`opts.inBuilding`: tileData.js onRoof, the roof grid): a run of >= 6 lane points with no fit within 9 m that runs
THROUGH A BUILDING takes the measured carriageway found within 14 m on one side only (never a guess between two
streets), at the lane's own offset from its road's centre line (lineFit.js roadFrameOf), >= 1 m inside its edges,
only where that carriageway runs WITH the lane (clear 4 m ahead and behind); the offset profile blends it in (1:10).
Snapped blind (no building test), it put 2 km more lane off the carriageway (lanes over open ground: park roads,
private lanes) and is not used.

City-wide: in a building 35 -> **31** places (624 -> 546 m), off the carriageway 337 -> 332 places; slalom 7,889 ->
7,924 m, wobble 4,260 -> 4,280 m (the 1:10 blends into the snapped stretches). Gone: J6 Ch. de Waterloo (1722.8,
546.3), D6 Ch. d'Alsemberg (-1218.7, 946) and (-1218.3, 917.5), D7 Ch. d'Alsemberg (-1254.1, 1000.3), F1 Rue
Vanderkindere (-145.9, -1639.6). New: D6 Ch. d'Alsemberg (-1228.9, 898.2) 13.5 m, 1.2 m deep (the snap's blend end);
D6 (-1238.9, 964.1) 20 -> 33 m, 1.7 m deep. Gate `roads` ceilings: inBuildingPlaces 31, offCarriagePlaces 332, slalomM
7924, wobbleM 4280.

Left, by cause (not this rule's fix):
- **A residential clos whose OSM line runs through the houses and UrbIS has no carriageway within 14 m on one side**
  (C6 / C5 Clos des Myosotis (-1700, 513), (-1728, 487), (-1720, 565)): the street data itself (TODO step 1).
- **Pedestrian courts / alleys the data calls roadway** (F1 Carré Cassimans (-473, -1542)): routing data
  (docs/COLLIDER_AUDIT.md).
- **Junction turns crossing a building corner** (G6 Ch. de Saint-Job / Kauwberg (212, 798), (221, 801), K11 Ch. de
  Waterloo (2326, 3354), I6 Vieille rue du Moulin (1141, 967), B5, F1 Brugmann, J4): the junction's own geometry
  (the cubic over a tight corner: a next job, per junction class).
- **A lane within 1-3 m of a façade on a narrow street** (D7 Rue du Roseau (-1016, 1400), F4 Av. Paul Stroobant
  (-194, -135), E6 Ch. de Saint-Job (-524, 929), F6 Rue Geleytsbeek, E3 Square Coghen, D8 Rue de la Cueillette, G6 Clos
  du Drossart): the carriageway there is within 9 m, the lane fit reaches it, the body still clips the footprint
  (UrbIS footprints overhanging the measured street, or the lane on the band of an unmeasured stretch).
The trafpark / twinlink audits build the graph without the building test (they see the lane before the snap); the
worker's own parked-car check (parkedKept) runs on the snapped graph.
