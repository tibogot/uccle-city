# Road fix round 2 (2026-11-14, branch `claude/roads-fix2`)

Input: docs/collisions/DRIVE_FIX.md "What is left", docs/TODO.md "ROAD FIX ROUND 2", docs/HORIZON.md road leftovers.
Every fix is at the source (road levels, deck data, terrain grids, platform geometry), no invisible ramps, no collider
removed. Switches to get the old behaviour back: `?roughlanes=0`, `?abutments=0`, `?underpasslevel=0`.

## How it was measured

- City-wide, drive AND walk in one pass: `A = await import('/debug/cityAudit.js'); await A.start({ walk: true })` in
  `viewer/index.html?tile=D1&far=0&char=capsule&falcons=0` (debug/cityAudit.js, viewer/drive/collisionTest.js), all 120
  tiles, ~28 min. Raw results: `road_fix2_before.json` (claude/foundation 7cd501e, the code of round 1's merge) and
  `road_fix2_after.json` (this branch). Intermediate runs: `road_fix2_after_run1.json` (first full run, before the
  E9 / abutment corrections below), `road_fix2_check1.json`, `road_fix2_check2.json` (tile subsets).
  `python tools/roadfix/compare.py before.json after.json` prints the tables; `tools/roadfix/items.py` the places.
- Offline, no browser (new, `tools/roadfix/`): the tile worker's whole build in node (`tile.mjs`, the city's default
  flags), so road levels / the drive grid can be checked on all 120 tiles without touching the owner's Chrome:
  `metrics.mjs` (road / sidewalk vertices over the drawn terrain, junctions over the DTM), `probe.mjs` (a junction's
  arms and the DTM along them), `decks.mjs` (OSM decks, their ends, the drive grid round a point; `OLD=1` = the round-2
  switches off), `sweep.mjs` (every tile, JSON lines: `road_fix2_levels_before.jsonl` / `_after.jsonl`), `where.mjs`.
  Run with `node --import ./tools/road_audit/register.mjs tools/roadfix/<script>.mjs ...`.

## Results: 120 tiles

### Drive (the car on the right lane of every road, both directions)

| check | round 1 after | before (this round) | after |
|---|---|---|---|
| routes / km | 6,613 / 476 | 6,613 / 475.6 | 6,597 / 475.0 |
| invisible hits | 27 | 27 | **18** |
| stuck on nothing drawn | 13 | 13 | 15 |
| under the drawn surface (samples) | 3 | 3 | **3** |
| over the drawn surface (samples) | 6 | 6 | **2** |
| passed through drawn solids | 1 | 1 | **1** |

### Walk (the third-person / walk-mode capsule on both sidewalks of every road; first city-wide walk pass)

| check | before | after |
|---|---|---|
| routes / km | 6,644 / 494.1 | 6,644 / 495.4 |
| invisible hits | 119 | **75** |
| stuck on nothing drawn | 20 | 22 |
| under the drawn surface (samples) | 32 | **21** |
| over the drawn surface (samples) | 162 | **150** |
| passed through drawn solids | 76 | **74** |

Per tile (drive): C8 invisible 1 -> 0; D10 invisible 1 -> 0, over 1 -> 0; D5 invisible 5 -> 0, over 0 -> 1; D6 invisible
0 -> 1; D9 over 2 -> 0; G2 stuck 1 -> 2; G7 invisible 2 -> 0; J5 invisible 1 -> 0, stuck 0 -> 1, over 2 -> 0.
Per tile (walk): D10 invisible 18 -> 11, over 4 -> 3; D5 invisible 2 -> 0; D7 invisible 3 -> 0, stuck 0 -> 1, over 3 -> 2;
D9 under 8 -> 6, pass 1 -> 0; E10 under 8 -> 0, over 1 -> 8; E4 invisible 3 -> 0; E6 invisible 2 -> 1, over 6 -> 0; E9 under
1 -> 0, over 8 -> 0; F1 invisible 9 -> 0; F5 1 -> 0; F6 3 -> 2; G2 invisible 17 -> 5, stuck 0 -> 2; G7 over 1 -> 0; G9 over
1 -> 0; H6 invisible 8 -> 3, stuck 1 -> 0, over 1 -> 0; J5 pass 1 -> 0. No tile errors, no missing neighbours.

The after file is the full run of this branch with the 21 tiles whose roads.json carries an OSM bridge re-run after the
last change (FILL_MAX 4 -> 5 m in `deckAbutments`, which only those tiles run; `road_fix2_check3_decktiles.json`: identical
except E9 walk stuck 1 -> 0); the full run before that change is `road_fix2_after_fill4.json`.
Worse, all explained in item 9: drive stuck 13 -> 15, D6 invisible 0 -> 1, walk stuck 20 -> 22, E10 walk "over" 1 -> 8.
16 routes fewer: building-passage routes cut at the facade (item 5).

### Road levels (offline sweep, all 120 tiles, `road_fix2_levels_*.jsonl`)

| | before | after |
|---|---|---|
| road + sidewalk vertices > 0.5 m over the drawn terrain | 22,167 | 11,826 |
| ... > 1 m | 19,093 | 9,195 |
| ... > 2 m | 15,412 | 6,813 |
| junctions > 1 m over the DTM | 51 | 32 (dead ends left as they were: see item 1) |
| junctions > 1 m under the DTM | 11 | 4 |
| junctions re-levelled | 425 | 734 (306 by their lanes) |

Per tile, > 1 m: E10 5,649 -> 1,536, D10 4,668 -> 79, D6 1,442 -> 84, D9 441 -> 385; worse: H2 264 -> 421, G9 72 -> 135,
F9 4 -> 32 (junctions brought up to their lanes' level: the measured sidewalks beside them now stand over a bank, e.g.
H2 (806, -1315), a junction the engine had 1.1 m UNDER its lanes; not seen by the car or walk tests). The vertices more
than 0.3 m UNDER the drawn terrain went 267,224 -> 268,323 (+0.4 %: sidewalk edges of lowered lanes now in their banks).

## The list, item by item

### 1. Linkebeek rough junctions (E10 / F10 / D10) - FIXED (except the two OSM tunnels)

Cause: `relevelRoads` (viewer/streets/roadLevels.js) puts a junction back on the DTM only when the ground round it is a
plane (ring RMS <= 0.5 m). At the bottom of the Linkebeek sunken lanes the ring climbs their 2-4 m banks, so every such
junction was skipped and stayed where the engine's grade rule had lifted it: Rue des Sables / Rue de la Station
(-856, 2881) 3.55 m over its lanes (whose DTM is smooth, 70.2-72.3 m), (-782, 2956) 5.6 m, (-692, 2899) 2.3 m; round 1
brought the lanes down but these plateaus stayed up (the 2 m sidewalk drop for walkers at (-870, 2875)).

Fix (`laneFit`): a rough junction with two or more arms is fitted to the DTM sampled along its arms' centre lines out to
its reach (the lanes, not the banks): a least-squares plane, accepted when the lanes stray < 0.5 m from their own plane,
its slope capped at the engine's junction grade (5 %); MOVE_MAX 3 -> 8 m (the old 3 m guard dated from before the
lifted roads came down). Dead ends are left alone (N5 (3704, 350): a dead end's lane ran down a garage ramp the DTM
sees). `?roughlanes=0` = as before.

Proof: E10 junctions > 1 m over the DTM 5 -> 2, road vertices > 1 m 5,649 -> 1,536; D10 5 -> 0 and 4,668 -> 79;
walk "under the drawn surface" on E10 8 -> 0 samples (the sidewalk drop at Sables / Station is gone). Screenshot check
from (-880, 2850): the junction sits at the bottom of the sunken lanes with its banks either side.

Left: the two OSM tunnels. Kleindalstraat r430168935 (E10 / F10, (-642, 2849) - (-680, 2887)) and Rue de la Brasserie
r775790690 (D9, (-1463, 2414) - (-1485, 2392)) are tagged `tunnel=yes layer=-1` in OSM: they really pass UNDER the
railway embankments (L124 rail top ~80 m over Kleindalstraat's 58.9 m; L26 ~63.7 m over Brasserie's 47.3 m; the DTM
rises 11-15 m over them). The terrain is a height field and cannot hold a tunnel, so their junctions stay 3-5 m up and the
car stops at the "portals" (2 stuck on E10, unchanged). The fix is a scripted tunnel (portals, barrel, the embankment
top) like the round-2 rail underpasses: a Blender job, not a road-level one.

### 2. D10 Rue de la Brasserie / Vieux Chemin - FIXED; the earth wall is real

The junction (-1300, 2627) 1.95 m up and (-1315, 2606) 1.65 m up: rough junctions, fixed by item 1 (D10 has 0
junctions > 1 m over the DTM now; the (-1292, 2620.7) "over the drawn surface" item is gone). The "earth wall" at
(-1016.6, 2722.6): the DTM there is the Brussels UrbIS DTM (docs/HORIZON.md: checked cell by cell), a real 0.8 m step
beside Vieux Chemin; the junction next to it (-1019, 2721) is now on its lanes (77.4 m) and the drive invisible hit there
is gone (D10 drive: invisible 1 -> 0, over 1 -> 0). D10 walk invisible hits 18 -> 11: the rest are the sidewalks of
the lowered lanes meeting their banks (-1023 .. -1038, 2926 .. 2976), drawn banks.

### 3. Bridge ends - FIXED (Bourdon, Waterloo), see the deck-edge fix in item 4

Cause: the OSM decks (viewer/streets/bridgeDecks.js) run between the ground 6 m past each end, but the bare-earth DTM
has the cutting's slope right up to the drawn slab's end: a dip between the slab and the next junction (Bourdon D9:
1.4 m), the end node 3 m over the DTM (Waterloo J5), the slab end over the sidewalk (J5: 0.41 m). Round 1 tapered the
deck: the step moved onto the slab.

Fix (`deckAbutments`, called in tileData.js before the roads sample the ground): the GROUND comes up to the deck, like
the hero bridges' `abutmentFill`: over each approach (from 6 m out to the slab's end, and 1.5 m under the slab's end,
10 cm under its top: the 1 m grid cannot hold a cliff on an oblique end line) and the deck's width, raised to the deck
line, with 1:1 banks beside it and wing banks beside the slab's ends; only raised, at most FILL_MAX = 5 m (a deeper dip
is a cutting / a street under the end: J5's railway runs under the bridge's oblique end), never past the deck line's
outer ends, an opening + closing on the fill mask (no lone 3-4 m spikes, no pits). Plus: no LiDAR "tree" growing through
an OSM deck from the cutting under it. `?abutments=0` = as before.

Proof: D9 drive "over" 2 -> 0 (Bourdon), J5 drive invisible 1 -> 0 and over 2 -> 0 (the bridge foot), J5 walk pass-through
1 -> 0, the 0.41 m slab-end step at (1742.7, 312.3) is gone (the ring there has no step up any more). Left at J5: a walker
stuck at the corner (1743.1, 312.3) where the measured sidewalk is wider than the deck (the route runs off the slab's
side into the cutting: the deck's width from roads.json lanes, narrower than UrbIS's sidewalk), and a car stuck at
(1719.9, 330.2) where its lane offset leaves the drawn street at the bridge foot (terrain 0.4-0.6 m under the filled
approach).

### 4. G7: the alley 7 m over the railway - FIXED (it is Avenue de la Chenaie's bridge)

What it is: OSM way 28030785, Avenue de la Chenaie, `highway=living_street bridge=yes layer=1`, over the L26 (UrbIS
bridge 899, ROB). Cause: the OSM deck is only built by a tile whose height grid holds BOTH extended ends; this bridge
starts 0.8 m inside G7 and its extended end is in G6, so no tile carried it: no deck, no parapets, a bare road strip.
Same for the eastern deck of Avenue des Tilleuls (D9 / E9). Fix (tileData.js): with the neighbours' grids (round 1's
`paddedGround`) every tile that covers both ends knows the deck (its roads' ground, its parapet walls); the tile holding
the deck's middle draws it (one deck, one world deck; main.js's world deck takes the nearest tile's ground). Proof: G7
drive invisible 2 -> 0, walk over 1 -> 0; screenshot: the deck and parapets over the L26 cutting.

### 5. D5 / F3 alleys into closed building passages - D5: the route now ends; F3: not a passage

D5 r243989844 and r1127735605 are `highway=service tunnel=building_passage` (real porte-cocheres, Chaussee d'Alsemberg).
The UrbIS solid closes them: a vertical probe at the passage finds the roof (63.9 m) and the terrain, no passage ceiling;
a horizontal ray from the street end at 1.2 m meets the drawn facade 4.0 m in. Opening the solid is a buildings-pipeline
job (UrbIS 3D), so the passage is a dead end at the facade: the collision test now ENDS a route on a building passage
(`tunnel=building_passage` / `covered=yes`) where it meets the solid, as round 1 made it START where the car stands clear
(T5). D5 drive invisible 5 -> 0, walk 2 -> 0 (16 routes fewer city-wide: passages shorter than 4 samples). F3 r525999234
has no passage tag and no UrbIS building within 6 m of the item: its "building" collider is not a UrbIS solid (a landmark's
LOD0 collider round the service road); left, 1 invisible hit as before.

### 6. G2: the tram platform across the lane - FIXED at the source; the stop that remains is the road data

Cause: 53 of Uccle's 100 OSM tram platforms are mapped as AREAS (closed ways: Churchill, Globe, Dieweg, Vanderkindere,
Stalle...); tram.js drew every platform as a 2.6 m band along its way, so an area became a hollow ring band reaching 1.3 m
past the platform into the lane, and the drive surface did the same. Also the railway stations' own platforms
(`railway=platform` without `tram=yes`: Moensberg, Calevoet, Saint-Job, Stalle, Linkebeek, Vivier d'Oie) got a tram slab
band round their outline, 1.3 m out onto the track bed. Fix (drive/colliders.js `platformRing`, `isTramPlatform`,
tram.js): tram=yes only; an area platform is drawn and driven as its polygon (earcut top, kerb faces, the light edge strip
inside the edge, the shelter at its middle). Proof: G2 walk invisible hits 17 -> 5; screenshot of Churchill: two
platform slabs on their OSM outlines.

Left: G2 drive stuck 1 -> 2, walk stuck 0 -> 2. roads.json merges the Churchill roundabout into ONE node at its centre
(313, -1434): every arm (Leo Errera, Marie Depage, Messidor, Montjoie, Marianne...) routes straight through the
roundabout's island, which UrbIS maps as median + tram site (no carriageway). The autopilot's line crosses the platforms
there (a 0.45-0.51 m step against the 0.5 m climb limit). A road-data issue (pipeline/refine_roads.mjs node merging),
not a platform one.

### 7. Kauwberg underpass cobbles - FIXED

Cause: the measured street (UrbIS Kauwberg polygon, 9.5-11 m wide; the arch opening 8.6 m) reaches past the cut's floor
onto the underpass banks and onto the approach cutting's sides; its height field followed them (saw-tooth up the banks).
Fix (rail/railData.js `underpassGround`, the road stage's ground only): within 25 m before / after each hero underpass and
hw + 4 m of its axis, the ground is at most the street's level on the axis (only lowers, at most 4 m); the drawn terrain
keeps its banks, the street's carve meets them at the street's edge. All 5 hero underpasses (Kauwberg, Bigarreaux,
Engeland, Engeland chord, Rue de Linkebeek). `?underpasslevel=0` = as before. Proof: screenshot from (286.5, 895.5) at
street level: the cobbles flat up to the arch, the banks rising from their edges (compare
docs/trains/compare/r2_kauwberg_city_after.jpg).

### 8. Tile north-south edge rows - CAUSE FOUND, FIX WRITTEN AND PROVEN, NOT APPLIED to data/tiles

Measured (tools/roadfix-style check over all 213 shared edges): east-west edges match (mean of means 0.000 m, max
0.04 m); north-south edges differ, mean of means 0.019 m, worst pairs H5/H6 mean 0.087 m, E9/E10 max 1.00 m, D5/D6 max
0.95 m. Cause: `pipeline/build_terrain.py urbis_grid` mosaics the 0.5 m UrbIS sheets with `rasterio.merge` onto bounds
that are not on the sheets' pixel grid (the sheets' origins sit at x.134 / y.072 m); merge reads each sheet through a
fractional window rounded to whole pixels, so the part of a tile taken from the SECOND sheet comes out stretched by a
fraction of a pixel, growing away from the sheet seam (H5: rows 394-500, i.e. south of northing 165,000, the sheet seam,
up to 0.09 m mean and 1.4 m on steep ground). The next tile's mosaic starts at its own seam, so the shared rows differ.

Fix (in pipeline/build_terrain.py, opt-in: `--resample exact`, `urbis_grid_exact`): the sheets are mosaicked on their
own pixel grid (bounds snapped outward: a plain copy, no resampling), then every 1 m corner is a separable tent filter of
half-width 1 m over the 0.5 m pixels round its exact L72 position (GDAL's bilinear when downsampling 0.5 -> 1 m is that
tent: the tiles the bug does not touch match it to 3-4 mm mean). Every value depends on its own position only.
Trial (`--out` to a scratch folder, H5 H6 D5 D6 D1 D2): shared edges H5/H6 0.087 -> 0.000 m mean, 0.78 -> 0.000 max;
D5/D6 0.95 -> 0.000 max; D1/D2 0.78 -> 0.000 max. Interior change: on the tiles the bug touches mean 1.2-1.5 cm, p99
0.16-0.25 m, max 1.4-1.8 m (the corrected stretch); elsewhere 3 mm mean, p99 3 cm.

Not applied because it is bigger than this round: (a) the Flemish fill needs `data/raw/dhmv/tiles/` (not on this machine
any more: `python pipeline/fetch_dhmv.py --border` first, 32 MB from the Flemish WCS); (b) everything built FROM the
terrain would have to follow, or it floats / sinks by up to the correction: building bases (`build_buildings.py`: base =
min DTM under the footprint; a corner where the ground drops would show a gap), rail.json track heights
(`build_rail.py`), the road tree filter (`filter_road_trees.py`), the horizon mesh's inner ring; (c) ~60 MB of binary churn.
Exact steps for the round that does it:
```
python pipeline/fetch_dhmv.py --border
for T in <all 120>; do python pipeline/build_terrain.py --tile $T --resample exact; done
python pipeline/run_tile.py --all --skip-terrain          # buildings (base), features, tree filter
python pipeline/build_rail.py; node tools/terrain/build_horizon_mesh.mjs
python pipeline/build_manifest.py                         # re-stamp
python <edges check: tools/roadfix-style, all N-S / E-W pairs = 0>; the city drive + walk audit
```
Make `exact` the default in build_terrain.py when that is done.

### 9. City-wide walk + drive, before / after - DONE (tables above)

Nothing new of substance was left unexplained; what got worse and why:
- drive stuck +2: G2 (the merged roundabout, item 6), J5 (1719.9, 330.2) (lane offset off the street at the
  bridge foot, item 3);
- drive D6 invisible 0 -> 1 at (-1059.3, 863.8): the alley's far junction (-1051, 918) came down 2.2 m to its lanes
  (item 1), the route now gets round the alley's tight corner, where its lane offset meets the drawn bank;
- walk stuck: G2 x2 (item 6) and D7 (-1096.7, 1113) (a walker on Rue de Stalle's paint / asphalt by a 0.3-0.4 m kerb; H6 1 -> 0); walk "over the drawn surface" E10 1 -> 8 samples: the
  lowered sunken-lane junction's measured sidewalks (-887.7, 2872.2) stand 0.3-0.4 m over the lane banks' drawn
  terrain;
- test changes (documented, both make the test say what the player sees): T6 a route on a building passage ends at the
  solid (item 5); T7 the drawn-surface truth includes the OSM decks other tiles draw (a deck crossing a tile edge,
  Avenue des Tilleuls D9 / E9: without it the first after run counted 37 + 50 "over" samples on E9 of a car / walker ON
  the drawn deck).

## Shared files touched (for a careful merge)

| file | where | what |
|---|---|---|
| viewer/streets/roadLevels.js | header consts (MOVE_MAX 8, MOVE_MAX_OLD, MOVE_MAX_LANE, LANE_GRADE), new `laneFit`, `relevelRoads(net, ground, noData, { roughLanes })` node loop, debug stats | rough junctions by their lanes |
| viewer/roadBuild.js | `relevelRoads(...)` call (~l. 91) | passes `o.roughLanes` |
| viewer/tileData.js | imports (bridgeDecks: `deckAbutments`, `deckHeight`; railData: `underpassGround`); the bridge block: `pad` moved BEFORE the decks, `known` / `mid` / `ownDeck`, `deckAbutments`, trees under decks; `roadGround0` / `underpassGround`; `buildRoadData({... roughLanes })`; `netInfo.deckAbutments`; the result: `bridgeDecks: ...filter(ownDeck)`, `keepNet` (node checks only) | items 1, 3, 4, 7 |
| viewer/streets/bridgeDecks.js | `SLAB` unchanged; new `deckAbutments` (+ FILL_MAX, BANK, UNDER) before `bridgeDecks()` | item 3 |
| viewer/rail/railData.js | new `underpassGround` before `roadDeckGround` | item 7 |
| viewer/drive/colliders.js | `isTramPlatform` (tram=yes only), new `platformRing`, `inRing2`; `tramPlatformSurface` area branch | item 6 |
| viewer/tram.js | import `platformRing`; the platforms loop: area branch first | item 6 |
| viewer/main.js | `tileData()` entry flags (`roughLanes`, `deckAbutments`, `underpassLevel`, after `padRoads`); `addBridgeDecks` ground from the nearest tile | switches, item 4 |
| viewer/drive/collisionTest.js | `driveRoutes`: `insideAt`, routes on passages end inside the solid (`endsInside`); `roadLines`: `passage`; `drawnGround`: every tile's road-bridge-deck meshes | T6, T7 |
| pipeline/build_terrain.py | new `urbis_grid_exact`, `RESAMPLE`, `--resample`, `--out`, header `resample` | item 8 (opt-in, data unchanged) |
| viewer/tileWorker.bundle.js | rebuilt (`node tools/build_worker.mjs`) | rebuild after the merge |
| tools/roadfix/ (new) | node checks, compare / items scripts, the POST sink `receive.py` (saves browser results into the worktree) | |

No data was rebuilt: data/tiles, the manifest and rail.json are unchanged.
