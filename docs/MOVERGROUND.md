# One ground for every mover (claude/ground, rule mover-ground)

Owner playtest 2026-11-19, shots 111 / 112: traffic cars 20-40 cm into the road on the Av. Carsoel deck (H6, by the
Saint-Job station), on Place de Saint-Job (setts, by Botanea / Pizza Hut) and in front of the Pasta Commedia.

## Cause

`viewer/main.js movingGround` gave the traffic (cityTraffic -> traffic.js -> trafficSim), tram 92 (createTramLine's
fallback) and, through `onDeck(hm.surface + CARVE)`, the parked cars / two-wheelers the carved terrain + 12 cm, with
only the road decks over it. The player's car drives the DRAWN drive surface: the road decks (world.decks) and the
tile's drive grid (viewer/drive/colliders.js driveGround: the drawn road / sidewalk / square / island / platform
triangles on the 1 m grid, two layers). Wherever the street is drawn off terrain + 12 cm (the carriageways and squares
the sidewalk and roads jobs levelled, the street next to and on a deck), the movers sank (up to 1.7 m) or floated.

Three more causes found by the census once the first was fixed:

1. **A plan deck walked over its own slab.** The Carsoel deck (H6) is an OSM plan deck fitted to its band, not to
   UrbIS; it had no drawn-top grid, so the walker / car / traffic stood on `planTop` (the fitted plane) while the
   mesh tucks the slab 0.13 m under it where a measured street covers it (`PLAN.sink` + `UNDER_STREET`).
2. **A step inside a grid cell.** Where a raised square / terrace (1.6 m, I6 1129 958) is drawn beside the street,
   the 1 m bilinear grid is a ramp: a car 0.5 m from the step rode 1.4 m up it.
3. **Kerb blend under parked cars.** The bilinear grid blends the kerb into the gutter: the kerb-side wheels of a
   parked car (0.2-0.4 m from the kerb) stood 5-10 cm in the air.
4. **Trams on the Carsoel deck** stood on the track profile, which is interpolated between the bridge's ends: 0.1-0.2 m
   under the deck's asphalt and up to 0.16 m over it; the rails were drawn there too.

## Fix

- `viewer/drive/moverGround.js moverGroundY(decks, tile, x, z, near)`: THE ground (the player car's logic, moved out
  of driveMode.js: decks, then the drive grid, the layer nearest the mover's height where two stack). Driver.ground,
  `world.moverY(x, z, near)` (the props job's API), main.js movingGround (traffic, knocked cars, tram 92) and the
  parked cars (`tileMoverGround`, the tile's own grid while it is built) all call it. No raycast, no allocation
  (unit test: 0 bytes / 200 steps; ~0.2 ms a step for 768 cars x 2 wheels).
- trafficSim: each car asks with its own height (`pose()`), a new car has none (`y = NaN`: the top layer) and is not
  spawned where two layers stack.
- grid step rule: in a cell whose four nodes span more than 0.5 m (`STEP_GAP`, the car's step height) and with the
  mover's height known, only the nodes on the mover's side count (the player car too: it no longer rides a ramp up a
  terrace edge; kerbs and slopes are unchanged).
- plan decks: `bridgeDecks.js deckTopGrid` takes `meshTopNodes(mesh)` (the deck mesh's asphalt / paving top on the
  1 m nodes) and never lies under it; built for every plan deck, not only the UrbIS-fitted ones (tile worker).
- parked cars: a wheel's contact is the lower of the ground under it and `PARK_IN` (0.45) x the half track in from it
  (viewer/cars.js wheelFit).
- trams: on a road deck the rails (main.js featureObjects) and the trams (tramline.js `deckAt`) lie on the deck's
  drawn top (`oneDeckY`), elsewhere on the track profile as before.
- hero road decks (`roadDeck.js deckHeightFn`): a circle test first, no array made away from the deck.
- `?movground=old`: all of it as before (features.js row; the worker entry's `movGround: false`).

Not changed: the walker's `world.walkY` (decks, else terrain + CARVE + the measured kerb lift). It is used by the
walk mode, third person, the Christmas firs, the falcon stream and the collision test; moving it onto the drive grid
drops it 12 cm on every lawn and needs its own job with the walk routes census.

## Check

`tools/audit/census/moverGround.mjs` (gate row `moverground`): every tile built by the worker's code in node; the
truth is the DRAWN street (the road parts' and the OSM deck meshes' up-facing triangles, surfaces within 1.5 m of
each other one layer seen from above, the hero decks' notes), never the drive grid. Counted: every 0.5 m of every
traffic lane / junction connector (marched like a car), every parked slot (its four wheels as wheelFit samples
them), every 1 m of every tram track (the seat tramline.js computes), |dy| > 5 cm. `--old` = ?movground=old.
`MG_PROBE=x,z[,r]` prints the layers round a point. `tools/audit/moverGroundTest.mjs` (row `movergroundunit`): the
grid = driveHeight off step cells, the player's ground as before, the step rule, the hero deck circle test, no
allocation, cost.

## Counts (all 120 tiles)

| | points | before (?movground=old) | after | gate ceiling |
|---|---|---|---|---|
| traffic lane / connector points (every 0.5 m) | 1,393,501 | 87,257 (42 km sinking; 50,527 points > 20 cm under) | 6,199 (1.0 km sinking, 2.1 km floating; 589 points > 20 cm) | 6,199 |
| parked slots (four wheels) | 11,596 | 5,982 (735 > 20 cm under) | 139 (all within 15 cm) | 139 |
| tram track points (every 1 m) | 35,767 | 1,480 | 1,423 | 1,423 |

Left (why the ceilings are not 0):
- traffic 5-20 cm (5,600 points): the 1 m drive grid against the drawn triangles: camber / kerb blend near lane
  edges and junction mouths. A finer or exact surface (the drawn triangles) is the next step, not a per-mover hack.
- traffic > 1 m at a dozen spots: E10 (-754, 2788) connector -3.4 m, D9 (-1057, 2091) under the viaduct (the
  street the deck cut removed: the lane drives on the terrain), I6 (1129, 958) beside a 1.6 m terrace (the step
  rule helps a car arriving on its own layer, not one spawned there), E8 (-525, 1523), C9 (-1704, 2114),
  E7 (-820, 1022), F4 (-208, -163), D10 (-1029, 2709): each needs its own look (a lane through a raised square,
  a ramp, a missing street piece).
- tram: the track profile off the decks (Ch. d'Alsemberg E2: -0.38 .. +0.31 m) is the tram profile's own fit
  against the levelled road, outside this job: on the Carsoel deck the trams / rails now lie on the deck (H6 tram 119 -> 66 points; on the deck 5-7 cm left, the deck grid's bilinear; 939.8 529.2 -0.14 at the east end; traffic on the deck 31 -> 33 points within 9.4 cm; the
  875.5 524 just off its west end, +0.64 m, is the profile's ramp).

## Browser list

?quick=1&with=traffic,trams, each with &movground=old alternated: the Av. Carsoel deck (H6, ~880-940, 520-533, by
the Saint-Job station), a tram 92 crossing it; Place de Saint-Job by Botanea / Pizza Hut (setts); in front of the
Pasta Commedia; parked cars' kerb-side wheels on a sloped street.

## Round 2: traffic under road decks (claude/defects2, 2026-11-24, rule deck-street-under)

claude/defects1's class 4b listed three "lanes under a road deck" and the Carsoel deck's west end. Each was traced
point by point (`MG_TRACE=x,z`, `MG_PROBE=x,z`): only one was the city's, the other three were the census's.

| place | what the census said | cause | fix | points before -> after |
|---|---|---|---|---|
| D9 (-1033, 2111) Av. des Tilleuls | lane -16.8 m under the deck | the Tilleuls lane ON its own deck, entering D9 from E9: the census marched it from E9 on D9's grid clamped at the border (70 m, no street) and the march kept that layer all along the deck. The city's car arrives on E9's ground (deck owner D9, rule deck-owner-checks) | census: a lane is walked only inside its tile (entering on the top layer); the decks a neighbour draws over the tile are the movers' and the truth's (E9's lanes on the D9 deck were "no drawn surface" before) | 235 -> 5 |
| F10 (-458, 2999) Kleindalstraat | traffic 8.7 m up "on a bridge" | no bridge: Kleindalstraat itself stood 8.7 m over its sunken lane at the city's edge. It leaves the city at z 3000 into no tile; roadLevels.js dropLifts kept the engine's LIFTED profile on that stretch ("nothing to come down to") and the 32 % grade brought it to the DTM only 30 m in: a causeway in the air | dropLifts holds a road's stretch off every grid at the DTM where it last has data (`heldGround`; `?edgelift=old` as before) | 92 -> 8 |
| E10 (-755, 2795) Kasteelstraat junction | cars -3.4 m under the drawn road | the census took the service deck's parapet coping as a surface and its 1.5 m layer chain ran coping -> slab -> soffit -> Square Maas 2.4 m under it | census: a deck mesh counts only by its walked top (-0.5 / +0.25 m of the deck line) | 45 -> 41 |
| H6 (879, 518) Carsoel west end | 12 points +0.26 m | the lane crosses the Saint-Job tram platform's west corner, a 25 cm slab tram.js draws and the drive grid holds (tramPlatformSurface); the census did not count platforms as drawn | census: the tram platforms are drawn surfaces (info `trafficOnPlatform`: 715 lane points city-wide run over a platform, the shared tram roads' boarding platforms) | 16 -> 7 (west end 0) |

City-wide: traffic 2,912 of 1,178,940 points (claude/defects1 measured 3,669 on the same city; the gate ceiling was
6,199), parked 127, tram 1,423 (unchanged: the track profile, see above).

**The check** (`underdeck`, same row): every lane point with a road deck over it (own, a neighbour's, a hero's) and the
mover more than 1.5 m under the deck must have its street drawn within 0.3 m and its drive-grid layer within 0.15 m of
that street. City-wide 9 such points; 5 fail, all at one spot:

- **E10 (-756, 2794), open.** Square Maas runs into the Kasteelstraat junction (n4294363596, 5 arms, reach 44 m) under
  the service road's deck (OSM 1002735650): the two bridge arms leave the node 20 degrees apart and overlap, the
  engine's junction pad there is not drawn (the junction and its mouths are bare terrain for ~10 m), and both decks
  start from the node at the DTM past their ends (84.5-85.3 m) over a junction levelled at 83.39 m. A car on Square Maas
  passes 2.4 m under the service slab's top. A profile + pad fix of its own (docs/DECKRAIL.md "Open"), registered by
  the ceiling 5.

Left in the top of the list (not deck classes): E8 (-945, 1926) -1.2 m, D10 (-1207, 2648) -1.2 m, E8 (-972, 1945)
-0.8 m, D10 (-1029, 2709) +0.8 m, E10 (-791, 2823) +0.6 m.
