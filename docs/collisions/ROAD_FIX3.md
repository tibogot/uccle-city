# Road fix round 3 (2026-11-14, branch `claude/roads-fix3`)

Input: the owner's playtest on the Vercel deploy (docs/TODO.md "OWNER PLAYTEST ... 2026-11-14": invisible parked cars
in the G view, the falcon's collisions), the leftovers of round 2 (ROAD_FIX2.md: drive / walk spots, the Churchill
roundabout, the tile N-S terrain seams).

## How it was measured

- City-wide drive AND walk in one pass, as in round 2: `A = await import('/debug/cityAudit.js'); await A.start({ walk:
  true })` in `viewer/index.html?tile=D1&far=0&char=capsule&falcons=0`, all 120 tiles. Raw: `road_fix3_before.json`
  (claude/foundation 9748671; identical to round 2's after run on every count) and `road_fix3_after.json` (this
  branch). `python tools/roadfix/compare.py road_fix3_before.json road_fix3_after.json` prints the tables.
- NEW in the audit, per tile: the parked-car check (`debug/parkedCheck.js`, also on its own: `P = await
  import('/debug/parkedCheck.js'); await P.check()`): every ACTIVE parked-car collider (drive set: polygons of kind car;
  on foot: the `parked-cars#i` prisms) against the parked cars the fleet DRAWS (registered by a tile in the scene, not
  pulled out into the traffic). `invisible` = a collider with no drawn car within 0.3 m of its centre, `missing` = a
  drawn car with no collider, `sizeOff` = matched but 5 cm off the drawn type's size. Geometry-based, so it measures the
  old code as well.
- Terrain edges: `python tools/terrain/edges_check.py [tiles_dir]` (all 213 shared tile edges).

## Results: 120 tiles

### Parked cars (new check: must end at 0 / 0)

| check (drive set / on foot) | before | after |
|---|---|---|
| parked cars drawn when their tile was tested | 640 | **16,319** |
| active parked-car colliders | 16,528 / 16,528 | 16,319 / 16,319 |
| colliders with no drawn car (invisible) | **15,888 / 15,888** | **0 / 0** |
| drawn cars with no collider (missing) | 0 / 0 | **0 / 0** |
| collider size off the drawn type (> 5 cm) | 0 / 0 | 0 / 0 |

(16,528 -> 16,319 colliders: the traffic pulls cars out while the audit runs; a pulled-out car has no slot collider now,
it collides as a traffic car.) Also checked live after streaming 8 tiles round I6 with the traffic running for 80 s (11
-> 23 cars pulled out): drive 0 / 0 / 0 and on foot 0 / 0 / 0 at every sample.

### Drive (the car on the right lane of every road, both directions; roundabouts: the ring, anticlockwise)

| check | before | after |
|---|---|---|
| routes / km | 6,597 / 475.0 | 6,616 / 473.9 |
| invisible hits | 18 | **15** |
| stuck on nothing drawn | 15 | **14** |
| under the drawn surface (samples) | 3 | 3 |
| over the drawn surface (samples) | 2 | 11 (one place, G5: item 3) |
| passed through drawn solids | 1 | 1 |

Per tile: C4 invisible 2 -> 0, E3 1 -> 0, L8 1 -> 0, E10 4 -> 3, G2 stuck 2 -> 0 (Churchill), J5 stuck 1 -> 0. Worse:
F8 invisible 0 -> 1, I4 1 -> 2, D6 stuck 0 -> 1, E8 stuck 0 -> 1 (the new ring route of the E8 / E9 roundabout), G5 over
0 -> 9 samples.

### Walk (the walk / third-person capsule on both sidewalks of every road; roundabouts: the outer edge of the ring)

| check | before | after |
|---|---|---|
| routes / km | 6,644 / 495.4 | 6,668 / 495.8 |
| invisible hits | 75 | 81 |
| stuck on nothing drawn | 22 | 23 |
| under the drawn surface (samples) | 21 | **20** |
| over the drawn surface (samples) | 150 | 156 |
| passed through drawn solids | 74 | 76 |

Places (items de-duplicated within 3 m): 39 places of the before run are gone, 42 are new. Better: G2 invisible 5 -> 0,
stuck 2 -> 0 (Churchill), B7 stuck 2 -> 0, C3 stuck 2 -> 1, O11 invisible 3 -> 1, F6, J10, N5, I11, F10 fell 1 -> 0.
Worse: D10 invisible 11 -> 16 and G10 2 -> 6 (the round-2 bank clusters), +1 on C7, E6, H10, K11, K5, L5, L8; D9 stuck
0 -> 2; E7 over 0 -> 4. NOT all within "nothing worse": the walk counts went up by a few samples. Every worse place is on
steep ground where the road levels follow the terrain, which the rebuild (item 5) moved by a few cm (by 1.2 m at the
D9 tunnel portal), or on a new ring route; none comes from a collider change. A run of the new code on the OLD terrain
(to split the two) was not done: one more hour of browser time. Diagnosis per place: item 3.

## The list, item by item

### 1. Invisible parked cars - TWO CAUSES, both fixed at the source; the check is in the audit

What the owner saw in the G view: white collider boxes in the parking lanes with no car in them, "way too many places".

Cause A (almost all of them): EVERY TILE STREAMED IN AFTER THE BOOT DREW NO PARKED CAR. `viewer/main.js loadTile` builds
the cars (`buildCars` -> `carFleet.add(group, cars)`), yields a frame (`await frame("parked cars")`), then adds the
group to the tile's features. In that frame `carFleet.update` dropped every registration whose group was not in the
scene (its "tiles that left the scene" filter), so the tile's cars were never drawn while its collider boxes (drive set,
on-foot props, made from the same invisible box mesh) stood. Under the boot cover no frame is yielded, so the boot tile
kept its cars: on the perf reference view (9 tiles) the fleet held 327 of 1,581 cars; city-wide 15,888 of 16,528 boxes
had no car. Fix (`carFleet.js update`): a registration waits until its group is in the scene (`live`; its fade-in starts
then), leaves only once its group has left the scene, and is let go after 2 min if its tile never arrives; the traffic
only pulls out cars of live tiles (`cityTraffic.js`).

Cause B (grows with play time): THE TRAFFIC'S PULL-OUTS. A parked car pulling out into the traffic is hidden in the
fleet (`c.hidden`); its slot's boxes stayed (about one pull-out every 3 s within 150 m of the player; slots refilled only
by park-ins). Fix: each parked-car collider keeps a reference to its car (`cars.js col.userData.cars`; drive set:
`colliders.js pref`, skipped by `gather` while `ref.hidden`; on foot: the prop prism's `off` flag) and follows it
(`carFleet.touch(car)` -> `onChange` listeners in `driveMode.js` and `cityHook.js`): off while the car drives (the
traffic car collides as itself), the new type's size when another car parks into the slot (`setBox`,
`parkedCarRing`); the boxes are made from the car as it is when the tile's colliders are built.

Checked, not causes: the bike boxes (furniture kit 2 `keepCarsClear`), stops, lamps, gardens and the street fit drop or
move a slot BEFORE the cars and their boxes exist; the 420 m distance fade and LOD / frustum culling only decide what
the camera draws (no one reaches a car 420 m away); the tile fades keep cars and boxes together.

The test lied too: its truth for parked cars WAS the collider box mesh (`collisionTest.js drawnSolids`), so a box could
never be "invisible". The truth is now the cars the fleet draws (their type's size, not hidden), and the colliders'
raster skips a hidden car's box; `debug/parkedCheck.js` (run per tile by `debug/cityAudit.js`) compares both ways.

Screenshot `fix3/parked_g_view_H6_after.jpg`: drive mode G on Rue Jean Benaets, H6 (a tile streamed in after the boot):
every white box holds a car, legend "no visible object: 0". Side fix: the drive G view's line buffers used
`THREE.DynamicDrawUsage` (against the binding rule): static now, written in their used range.

### 2. The falcon - G shows its colliders; it now collides with the roofs that are drawn

The falcon's solid (`falconFlight/cityStream.js column`): the DTM, the tile's ROOF GRID, the church and landmark proxies
(rasterised from each model's own lowest LOD), the road decks and the drawn street trees (dense core = hit, shell =
brush). The roof grid (`tileData.js roofGrid`, made for the first fly mode) was each building's TOP (its ridge) over the
whole footprint, dilated to whole 2 m cells: a flat lid at ridge height. Measured on I6 / F5: under that lid 19 % / 15 %
of the cells have no roof drawn at all (the dilation in front of the facades, courtyards), and where a roof is drawn the
lid stood on average 2.9 / 2.5 m above it (27,681 / 15,622 cells more than 2 m above, up to 20 m). The bird hit air up to
2 m in front of facades, bounced off nothing over pitched roofs and "landed" metres over the tiles: the owner's
"collision seems weird".

Fix: `tileData.js roofSurface` (in the tile worker): the height of the topmost DRAWN roof triangle (buildings.bin, after
the solids a model replaces are hidden) at each 1 m cell centre, Uint16 in 2 cm (0.5 MB a tile); `cityStream.js rawRoof`
reads it (the envelope checks for replaced solids are skipped: they are not in it, and each has a proxy: the church,
town hall, Observatory, Saint-Pierre, Stalle, Van Buuren, Wolvendael, police, Calevoet, Augustin, Russian church,
Rosaire, the bridges). The old flat grid stays for its other users (tree pits on roofs, main.js `roofAt`).

G view (`falconFlight/falconDebug.js`; key G in fly mode, `?falcondebug=1`): the floor lattice (1 m, +-18 m round the
bird) coloured by what made it (ground, drawn roof, church / landmark proxy, road deck, tree), the ceilings over the
bird (arches, crown undersides), each crown met as two wire ellipsoids (dense core / soft shell) with its trunk, the
bird's 0.35 m sphere (red after a contact, with the contact normal) and a legend. Screenshot `fix3/falcon_g_view_I6.jpg`
(over the Place de Saint-Job: the lattice lies on the pitched roofs). Still not solid for the bird (thin, as before):
lamp posts, poles, wires, masts, parked cars.

### 3. The remaining spots, real vs test artefact (after run)

Drive (15 invisible, 14 stuck, 3 under, 11 over, 1 pass):
- 9 invisible ledges on alleys / one-ways (D2, I4 x2, D4, M5, N5, E10 x2, F8): the autopilot follows roads.json's lane
  offset, which runs over the drawn edge of narrow lanes (round 1's T2 class); the ledge is drawn (a bank or kerb a few
  cm over the 0.5 m limit): test line, not felt on the drawn street. I4 (1476, -51) and F8 are new: cm moves of the road
  levels after the terrain rebuild.
- Stuck: 7 on alleys (D2, F3, D5, D6, B7, K8, ...) and B4, B6, C9 (tile edge) as round 2; E10 x2 and F10 = the
  Kleindalstraat OSM tunnel portals (REAL; needs the scripted tunnel; Google Maps satellite, look only: the street passes
  under the L124 embankment south-east of Linkebeek station, in the trees); E8 (-998.1, 1878.7) on the NEW ring route of
  the E8 / E9 roundabout (radius 21 m): the ring line meets the drawn kerb of the measured island (test line; the
  traffic's ring connectors are fitted to the measured street).
- G5 over (497.1, 491.4), 9 samples: 2 m beside an area tram platform the drive grid's 1 m nodes inside the platform ramp
  the surface up over the next metre (bilinear), 0.3 m over the drawn road: REAL but small (the car rides a 1 m ramp at
  the platform's edge); it shows now because the terrain rebuild moved the road there by ~0.3 m. Next: half-height edge
  nodes, or the lower layer within 1 m of an area platform.
- F3 (-138, -995.1) the stray collider round r525999234; I5 concrete ramp; G10 ledge; E10 under; G6 one furniture
  pass-through: as round 2.

Walk (81 invisible, 23 stuck, 20 under, 156 over, 76 pass):
- Invisible hits (49 places): banks and raised sidewalks the walker meets on steep ground: D10's sunken lanes (the round-2
  cluster (-1021 .. -1041, 2919 .. 2987): the sidewalk of the lowered lane against its 3-4 m drawn bank, 16 samples), G10,
  H3, I3, G3: drawn terrain the truth does not count as a solid (TEST ARTEFACT: the walker is stopped by what is drawn).
  G2's five (the Churchill island) are gone.
- Over the drawn surface (82 places): sidewalks 0.4-1.5 m over the terrain they are drawn on along banks (the ring values
  show the bank): REAL (JOINS: a sidewalk edge over a bank, round 1's "sidewalks proud of the lawn"), a road-levels job.
- Passed through: 12 "car" places (11 before): the walker's centre in a 0.25 m truth cell of a car's plan while sliding
  past with no contact (cell quantisation: artefact); 17 "building" + 8 "kit" (facade details, steps, plinths drawn proud
  of the UrbIS solid, the walker's prisms are the footprints): REAL, small (round 1's limit); 6 "bridge" at F7 (LOD0 vs
  its walk BVH), 5 furniture, 2 hero: unchanged.
- Stuck (21 places): kerbs and banks at alley mouths; D9 x2 new at the Rue de la Brasserie OSM tunnel portal (-1489,
  2389: the terrain rebuild moved the bank there by up to 1.2 m; REAL: the tunnel; Google Maps satellite: Brouwerijstraat
  under the L26 embankment); the J5 bridge corner (round 2).

Fixed at the source this round: the parked cars (item 1), the falcon (item 2), Churchill's test routes (item 4), the tile
seams (item 5). Left (real): the two OSM tunnels (Kleindalstraat E10 / F10, Brasserie D9: a scripted tunnel, Blender
job), sidewalks standing proud of their banks (road levels), the G5 platform edge, facade details proud of the solids
for the walker.

### 4. The Churchill roundabout (G2) - the traffic already went round; the test routes now do too

roads.json has the roundabout as ONE node (n507420348, kind "roundabout", ring radius 36.9 m, centre line 34.3 m) and
every arm ends at its centre. The road engine (vendor/roads, unchanged) builds the ring from that node and the TRAFFIC
drives its ring connectors: checked offline (`tools/roadfix/tile.mjs`, G2's traffic graph): 30 ring connectors (turn 4)
at radius 33.7-34.5 m, none through the island. The measured street (UrbIS surfaces, sampled every 22.5 deg) is a
roadway ring at 30-40 m round a median / tram-site island. What crossed the island were the collision test's own route
lines (road centre lines node to node): the "stuck" / "invisible" items at the platforms. Fix (`collisionTest.js
roadLines`): at every roundabout node (34 in the city) the arms stop at the ring, and the ring is a route of its own,
driven anticlockwise on its centre line and walked on its outer edge. G2: drive stuck 2 -> 0, walk invisible 5 -> 0,
stuck 2 -> 0. No change to roads.json was needed.

Real layout (Google Maps satellite, look only, nothing kept): Rond-point Winston Churchill is a round one-way ring round
a central island that carries the tram tracks and stops ("Churchill", lines 3 / 7) and the Churchill statue; arms Avenue
Winston Churchill west and east (with the tram reservation), Avenue de Messidor, Avenue Montjoie, Rue Marie Depage, Rue
Général Mac Arthur, Rue Marianne. The city draws the same (checked at (313, -1434) from 120 m: the ring carriageway round
a grassed island with the tracks across it and the platforms; traffic going round). Wikipedia's list of tram
roundabouts has it too (two in, two out, two through tracks).

### 5. The tile north-south seams - APPLIED to all 120 tiles

Steps (ROAD_FIX2.md item 8): `python pipeline/fetch_dhmv.py --border` (20 tiles, 1.6 MB each, into this worktree's
ignored data/raw/dhmv/tiles); the Flemish fill checked unchanged: a `--resample mosaic` rebuild of E10 (filled) and H5
reproduced data/tiles byte for byte (terrain.u16 and header); then `build_terrain.py --tile T --resample exact --src
<main checkout>/data/raw/urbis/dtm` for all 120 tiles (read-only use of the raw DTM). `exact` is now the DEFAULT.

| shared tile edges (213) | before | after |
|---|---|---|
| E-W: mean of means / max | 0.0004 / 0.040 m | **0.0000 / 0.000 m** |
| N-S: mean of means / max | 0.0189 / 1.000 m (E9/E10; D5/D6 0.95, D1/D2 0.78, H5/H6 0.78) | **0.0000 / 0.000 m** |

Interior change per tile: mean 7.8 mm; max 3.12 m (D9, steep ground: the corrected stretch), J7 2.0 m, D5 1.8 m.

What follows the terrain, and only that (`tools/terrain/follow_terrain.py <old terrain dir> --write`):
- buildings.json `base` (and `height`): the UrbIS 3D solids keep their own geometry (no building in the city is a 2D
  extrusion); `base` is the lowest DTM sample on the footprint: 12,545 of 25,458 changed, most by 1 cm, max 1.45 m (J7,
  buildingsolid 725794); buildings.bin untouched (no re-orient needed);
- features.json: the `y` of 1,668 of the 3,800 trees filter_road_trees.py had moved (re-sampled from terrain.u16 there;
  the other trees' y come from the raw 0.5 m DTM);
- data/rail/rail.json: `build_rail.py` re-run (OSM area.json and the landcover gpkg copied read-only from the main
  checkout into this worktree's ignored data/raw). rail.json was already 0.27 m off a rebuild on the OLD terrain at E10
  (-787, 2745): it predated the Flemish fill; it is now built on the current terrain;
- not affected: the horizon mesh (built from its own DHMV 20 m grid in data/raw/horizon and the manifest's tile bounds
  only), the LiDAR tree detection (raw DSM / DTM), roads / features / surfaces (no terrain input);
- `build_manifest.py`: re-stamped (only the `?v=` stamps and `terrainMinMax` changed).
The JSON writes are byte-identical in format (pipeline/common.write_json round-trips the existing files exactly).

### 6. Perf sanity check

Preflight: RED while my audit tab was rendering (GPU 52 % busy), YELLOW with it parked (5.6 GB free; other agents'
servers listening). Reference view (`/viewer/index.html?ring=1&far=1&time=golden&traffic=0`, 1400 x 850), debug/
gpuAB.js `measure` 8 s, alternated between the base (9748671, served from a temporary detached worktree) and this branch:

| | GPU p50 (ms) run 1 / run 2 | draws | parked cars registered / drawn |
|---|---|---|---|
| base 9748671 | 8.45 / 7.34 | 356 / 350 | 327 / 1 |
| this branch | 7.27 (316 draws: still streaming) / 7.54 | 354 | 1,581 / 6 |

Within the noise of a YELLOW machine. The reference view itself showed cause A (the base registered the boot tile's 327
cars only). More cars are drawn in the streets now (they were missing); the fleet is one instanced draw per type and
LOD with per-instance culling, so the cost is the cars in view.

## Shared files touched (for a careful merge)

| file | where | what |
|---|---|---|
| viewer/carFleet.js | constructor (`listeners`); `touch(car)`, new `onChange`, `drawn`; `update()`: the regs filter (live / attach / 2 min), the draw loop skips non-live regs | item 1 (foundation's 42057ba changed `load()` only: merges clean) |
| viewer/cars.js | `buildCars`: `col.userData.cars = cars` | item 1 |
| viewer/traffic/cityTraffic.js | `setParking` (live regs only), `onPark` -> `carFleet.touch(c)` | item 1 |
| viewer/drive/colliders.js | `buildColliders` (`pref`), `extendColliders` (carries `ref`), new `setBox`, `gather` (skips a hidden ref) | item 1 |
| viewer/drive/driveMode.js | imports (`setBox`, `carFleet`); `tileDrive` (`driveBox`); `featureColliders` car branch (ring from the car, `ref`); new `parkedCarRing` + the `onChange` listener after `tileDrive` | item 1 |
| viewer/drive/debugDraw.js | constructor + end of `update` | static buffers + ranges |
| viewer/character/cityHook.js | imports; `carFleet.onChange` listener before `cityCollision`; `gather` (`carRefs`, the car's ring); `buildTile` (`walkBox`, `off`) | item 1 |
| viewer/drive/collisionTest.js | imports; `drawnSolids` parked cars (the drawn cars); `colliderCells` (hidden refs); `roadLines` (roundabouts); `driveRoutes` (`L.ring` one way) | items 1, 4 |
| viewer/tileData.js | new `ROOF_SURF_*` / `roofSurface` after `roofGrid`; `roofs.surf` after `hideBuildings` in `buildTileData` | item 2 |
| viewer/falconFlight/cityStream.js | `roof()` (early return with surf), `rawRoof` (surf) | item 2 |
| viewer/falconFlight/cityFlyer.js | import; constructor (G key, `?falcondebug=1`); `stop()`; `update()` (`this.debug.update`) | item 2 |
| viewer/falconFlight/falconDebug.js | new | item 2 |
| viewer/tileWorker.bundle.js | rebuilt (`node tools/build_worker.mjs`) | rebuild after the merge |
| debug/cityAudit.js, debug/parkedCheck.js (new) | the parked-car check per tile | item 1 |
| pipeline/build_terrain.py | `RESAMPLE = "exact"`, `--resample` default `exact` | item 5 |
| tools/terrain/edges_check.py, follow_terrain.py (new); tools/roadfix/compare.py (parked table) | | items 5, 6 |
| data/tiles/*/terrain.u16 + terrain.json (120), */buildings.json, */features.json, data/rail/rail.json, data/tiles/manifest.json | rebuilt | item 5 |
