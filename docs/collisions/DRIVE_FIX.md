# Drive fix (2026-11-14, branch `claude/drive-fix`)

The owner: "can I use the city by car without issues? on and under the bridges? won't I go through the road in some
parts?" Input: the city-wide drive audit of 2026-11-13 (`city_audit_2026-11-13.json`, debug/cityAudit.js running
viewer/drive/collisionTest.js on all 120 tiles: 6,618 routes, 474 km).

## How it was measured

- `A = await import('/debug/cityAudit.js'); A.start({ walk: false })` in a city page
  (`viewer/index.html?tile=D1&far=0&char=capsule&falcons=0`, ring 1), poll `A.status()`, results in `A.results()`.
- New in the audit: it waits for the tile's built NEIGHBOURS too (a car near an edge stands on the next tile's drive
  surface), keeps up to 200 items per tile with the route's road id / type and the collider kind, and DIAGNOSES every
  item (`why`: the car's drive surface there and 2.5 m round it, the deck, the tile, the DTM, the drawn meshes under
  it: `debug/driveProbe.js`, which also has `grid(x, z)` = the drive grid's two layers round a point).
- Runs (raw, per tile, with positions): `drive_fix_run0_before.json` (the code of df9c2d2 = the 2026-11-13 audit, same
  totals), `drive_fix_run1_testonly.json` (the corrected TEST on the old city: what was a test artefact),
  `drive_fix_run_after.json` (the corrected test on the fixed city); the walk pass: `drive_fix_walk_before.json` /
  `drive_fix_walk_after.json`.

## Root causes

### Real (a player feels them) - fixed

| # | cause | what the player got | items (before) | fix |
|---|---|---|---|---|
| R1 | the tram platforms (viewer/tram.js: OSM platform lines, a slab 25 cm over the road, several lying over the outer half of a lane: Lancaster on Avenue Carsoel H5, G2, G5, F5, E3, E4, D6, D7, B6, I6) were not in the drive surface | the car sank 0.3-0.46 m into the slab | ~110 "under" samples, the lines at H5 x 523-560, G5, F5, E4, D7, G2 ... | `colliders.js tramPlatformSurface` (worker, tileData.js): the platform top is in the drive grid like a sidewalk, the car rides up its kerb (MAX_STEP 0.5). tram.js now takes its dimensions from the same constants (`TRAM_PLATFORM`, `isTramPlatform`) |
| R2 | the page's OSM bridge decks (bridgeDecks.js `deckHeight`) also covered the 6 m extensions past each end and returned the bare DTM where it was over the deck line; the deck always won over everything | Chaussée de Waterloo (J5): a car on the street passing the bridge end held 4 m in the air; Avenue des Hospices (E10): 0.4 m under the drawn road | J5 ~10, E10 ~4 | `deckHeight(d, ground, { drawn: true })` on the page: only over the drawn slab, null where the ground is at / over the deck; the car takes the higher of the deck and the drawn road when they are within 1.5 m (OSM decks only), the layer nearest the car otherwise (a street under the bridge) (driveMode.js) |
| R3 | the deck profile was a straight line between the grounds past the ends, also where the DTM keeps a hump on the bridge | Avenue des Hospices: the slab ran up to 0.6 m under the drawn road, its parapets 0.35 m proud of the street but 1 m walls for the car | E10 2 | `bridgeDescriptors`: the profile `d.prof` (1 m samples) = max(line, DTM on the centre line) over the span |
| R4 | every wall collider was an infinitely tall 2D wall | the platforms of Moensberg (under Rue du Bourdon, D9) and Linkebeek (under Avenue des Hospices, E10) stations stopped cars ON the road bridges over them; the same for rail fences under a deck and for parapets over a street | D9 4, E10 2 | walls carry their vertical extent (`top` / `base`): platforms (rail.json `top`), fences (ground + FENCE_H), parapets (coping / slab underside, now one piece per 2 m); `colliders.js heightClear` skips a wall the car is over or under (carEnv.js and the test) |
| R5 | `world.at(x, z)` off every loaded tile returned `tiles[0]`, any tile, whose clamped edge could be 30 m off | at a neighbour still streaming in / the edge of the built map: a wall or a cliff | D5 "29.7 m", F2 "17.9 m over", C9, E10, F10, B7, E5, I1, H2 ~15 | `main.js world.at`: the NEAREST loaded tile (its grid clamps to its edge there) |
| R6 | the road stage sampled the tile's own DTM grid only: past the edge `Heightmap.sample` CLAMPS, so a junction across the edge was fitted to a flat continuation of the edge row, the grade rule carried it back into the tile and the level pass skipped it as "no data" | Rue de la Brasserie 3.4 m over the ground (C9 / D9) with a hole in the road and the car falling into it; Kleindalstraat 7.5 m up at the E10 / F10 corner | C9 3, D9 2, F10 1 | `tileData.js paddedGround`: the 8 neighbours' terrain.u16 (raw: no data stays no data) answer past the edge for the road stage; `roadBuild.js` takes the worker's `noData` (`?padroads=0`: as before) |
| R7 | the engine's grade limit (local street 12 %) held 'terrain' roads up between junctions wherever the DTM falls faster: the Linkebeek sunken lanes (holle wegen, 15-30 %) and Rue de la Brasserie | roads drawn 2-9 m over the ground: causeways the car fell off or drove into the walls of | E10 ~12, D9 / C9 / D10 ~6 | `roadLevels.js dropLifts` (in relevelRoads): a terrain road (not an OSM bridge / tunnel, not authored) more than 1 m over the DTM gets its profile again with a 32 % grade limit, its ground the LOWER of the DTM and its current profile (it only comes down: a road kept under a hump stays), end stretches on their junction planes; 10-15 roads per Linkebeek tile, a few elsewhere (`net.levels.lifted`, `maxLift`) |
| R8 | 1 m drive-grid nodes falling into a seam between two road pieces read the terrain under the road (3.3 m down under Brasserie, 1.2 m at Hospices) | a pit in the drive surface the car dropped into | C9, E10 | `colliders.js driveGround`: a node with no surface but surface on both sides and on 6 of 8 neighbours at one level takes their mean (cracks only: a real 2 m hole stays a hole) |

### Test artefacts - the test fixed so it stops lying

| # | artefact | items (before) | fix (viewer/drive/collisionTest.js, debug/cityAudit.js) |
|---|---|---|---|
| T1 | the OSM deck mesh was wound inside out (top facing down, soffit up; drawn double-sided so it looked right) and the test's drawn-surface raster keeps up-facing triangles: it read the soffit 0.93 m under the deck as the road | 140 "over the drawn surface" at C4 (Merlo), H6 (Carsoel), D9 (Tilleuls, Bourdon), J5 | fixed at the source: `bridgeDecks.js deckMesh` winds every quad with its normal |
| T2 | a ledge (drive surface stepping > 0.5 m) was "invisible" whenever no SOLID was drawn near, also where the drawn TERRAIN steps the same way (a bank beside a narrow lane, the edge of a sunken lane, a lawn bank at a driveway); "stuck" the same | ~65 invisible + ~75 stuck (alleys and narrow lanes where the autopilot's lane offset, from roads.json, runs over the drawn edge) | a ledge / a stop where the drawn surface itself rises more than MAX_STEP over the car's drawn surface (the drive surface there within 0.3 m of the drawn one) is visible (`drawnSteps`, `blocked`), as the walk routes already did; checked on screen at K5 Drève des Gendarmes, L8, E10 Place Communale |
| T3 | the tile was tested as soon as its own drive data came in, its neighbours possibly still streaming: the car near an edge stood on a clamp of some other tile | D5, F2, E5, C9, E10, F10, I1, H2 (part of R5's list) | cityAudit.js waits for the built neighbours (90 s max, `missingNeighbours` recorded: none in the after run) |
| T4 | a deck parapet was never in the truth band (the band is measured from the LOWEST ground within 1 m: the street / cutting under the deck edge) | the parapet hits on decks read "invisible" | road-group walls also count from their upper side |
| T5 | a route that starts inside a building solid (an alley into a porte-cochère the UrbIS solid closes): the car was spawned inside the collider and pushed about by its inner 8 m chunk edges | E1, F1, F2 / F3, D5, J6, E8 (~10) | the route starts where the car stands clear (`startsInside` counted) |

## Results: 120 tiles, drive

| check | before (2026-11-13) | test fixed, city as before | after |
|---|---|---|---|
| routes / km | 6,618 / 474 | 6,618 / 475 | 6,613 / 476 |
| invisible hits | 99 | 34 | **27** |
| stuck on nothing drawn | 94 | 19 | **13** |
| under the drawn surface (samples) | 124 | 125 | **3** |
| over the drawn surface (samples) | 140 | 138 | **6** |
| passed through drawn solids | 6 (1 in the re-run) | 1 | 1 |

(The "before" column is the coordinator's run; re-run here with the same code: 99 / 94 / 124 / 140 / 1 pass-through.)

Items of the BEFORE run by root cause (items = places, de-duplicated within 3 m; the counts above are samples):
deck winding T1 35, drawn steps / banks and unloaded neighbours T2 / T3 118, tram platforms R1 29, decks / parapets /
platforms under decks R2-R4 26, off-tile clamp R5 11, other 54 (lifted roads R7, cracks R8, building passages T5,
alleys). The test-only column was measured with the test of commit d33af38 (T1 is a city fix, T5 came later).

Nothing new of substance in the after run: of its 43 items, 36 are the places of the before run (several changed kind,
e.g. an "over" at the Waterloo bridge foot is now the ledge there); the 7 others are the same clusters or banks beside
narrow alleys (N5, L8, E10 Place Communale: checked on screen, a drawn bank), a stop at the edge of the tram platform in
the lane at G2 (a 0.48 m drawn kerb, just under the test's 0.5 m), and one E10 sample 0.33 m under a re-levelled
street's edge.

## Walk pass on the worst tiles

The 8 worst tiles (E10, D9, D10, G9, H2, E6, H5, J5: 605 sidewalk routes), the same test before (the old city) and after:

| on foot | before | after |
|---|---|---|
| invisible hits | 24 | 22 |
| stuck on nothing drawn | 1 | 2 |
| under the drawn surface (samples) | 12 | 18 |
| over the drawn surface (samples) | 78 | 13 |
| passed through | 7 | 7 |

Better: the OSM decks (D9: 38 -> 0 "over", E10 18 -> 1). Worse: E10 "under" 1 -> 8 samples: the Linkebeek lanes came
down to the DTM while some junction plateaus there stay up (their ground is too rough for the level pass), so a
walker can step off a 2 m sidewalk edge at Rue des Sables / Rue de la Station (-870, 2875); J5: the slab end of the
Chaussée de Waterloo bridge stands 0.41 m over the sidewalk at (1742.7, 312.3) (a step a walker does not climb; tapering
the deck's profile at its ends was tried and dropped: it brought back 14 "over" samples on D9 / E10). D10's 18
invisible hits are the walls of Vieux Chemin / Rue de la Brasserie (known, before: 21).

## What is left, and why

- **Linkebeek, road levels (roads agent).** Kleindalstraat at the E10 / F10 corner: still ~8 m up on the F10 side
  (-458, 2998.6: the junction past the region's edge); its middle part is tagged `tunnel=yes layer=-1` in OSM and is
  kept as an OSM structure (2 stuck at (-648.6, 2852.9), (-675.2, 2884.4)); rough junctions (plane RMS > 0.5 m) are not
  re-levelled, so their plateaus stand over the lowered lanes (walk above). Next: re-level rough junctions to the lane
  bottom (the min of the inner ring), see docs/HORIZON.md.
- **D10** Rue de la Brasserie / Vieux Chemin junction 1.9 m over the ground (-1292, 2620.7) and the earth wall at
  (-1016.6, 2722.6): known, unchanged.
- **Bridge ends.** Rue du Bourdon (D9): the deck's north end 1.4 m over the junction just past it, no road drawn between
  (-1202, 2236); Chaussée de Waterloo (J5): the street at the bridge foot (1723.8, 325.7) meets a 3 m bank, and the slab
  end is 0.41 m over the sidewalk (walk). The OSM deck ends need landing pieces / the junctions their height (JOINS).
- **G7 (33.6, 1019.5):** alley r28030785 drawn as a concrete strip 7 m over the railway with open drops on both sides.
- **Building passages:** D5 alleys r243989844 / r1127735605 and F3 r525999234 run into UrbIS solids that close the
  passage (porte-cochère): the car meets the collider's inner chunk edges there (drawn wall at the footprint).
- **Alleys and narrow lanes:** ledges and stops at banks the drive grid and the drawn surface disagree on by a few cm
  near the 0.5 m threshold (D2, E3, I4, D4, C4, M5, N5, L8, C8, E10 x2), stops on roads.json alleys with no drawn
  surface (B4, B6, B7, K8, C8, D5, D2) and C9 (-1817, 2499) at the tile edge: the autopilot follows roads.json lane
  offsets, wider than the drawn lane there. Not felt on the drawn streets.
- G2: a tram platform lies across the lane (OSM position): the car rides up its 0.25-0.48 m kerb or stops at it.
- I5 (1383.4, 406.3): a concrete ramp 0.44 m over the drive grid; G10 (491.1, 2748.4) known ledge; G6 (196.1, 771.5)
  one pass-through (furniture).

## Shared files touched (for a careful merge)

| file | where | what |
|---|---|---|
| viewer/main.js | `addBridgeDecks` (~l. 309) | `deckHeight(..., { drawn: true })`, fn tagged `osm` |
| viewer/main.js | `tileData()` entry (~l. 474) | `padRoads: params.get("padroads") !== "0"` |
| viewer/main.js | `world.at` (~l. 775) | nearest loaded tile instead of `tiles[0]` |
| viewer/tileData.js | imports; new `paddedGround()` before `buildTileData`; the road stage (`pad`, `baseGround`, `noData`); the drive walls (`top` / `base`); `tramPlatformSurface` after the rail fences | |
| viewer/roadBuild.js | `relevelRoads(...)` call (~l. 91) | takes `o.noData` |
| viewer/streets/roadLevels.js | import `profileAt`; end of `relevelRoads`; new `dropLifts` | lifted roads come down |
| viewer/streets/bridgeDecks.js | `bridgeDescriptors` (`d.prof`), `deckHeight` (`drawn`, null at / under the ground), `profY` / `at`, `deckMesh` quad winding, `parapetRings` (pieces with top / base) | |
| viewer/tram.js | imports; the platform block (~l. 197-213) | `TRAM_PLATFORM`, `isTramPlatform` from drive/colliders.js |
| viewer/drive/colliders.js | `heightClear`, walls with extent in `buildDriveData`, crack fill in `driveGround`, `TRAM_PLATFORM` / `tramPlatformSurface` | |
| viewer/drive/carEnv.js, driveMode.js | `heightClear` in `collide`; `Driver.ground` deck / road / layer rule | |
| viewer/drive/collisionTest.js, debug/cityAudit.js, debug/driveProbe.js | the test changes (T2-T5), diagnostics | |
| viewer/tileWorker.bundle.js | rebuilt (`node tools/build_worker.mjs`) | rebuild after the merge |

No data was rebuilt (no pipeline run, no manifest re-stamp): every change is runtime code; the tile worker bundle
(`viewer/tileWorker.bundle.js`) was rebuilt with `node tools/build_worker.mjs`.
