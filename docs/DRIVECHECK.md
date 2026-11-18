# Drive check: colliders on the carriageway (branch `claude/drivecheck`, 2026-11-18)

Owner playtest 2026-11-18 (car, live site): "the car is blocked here behind lycee francais close to saugrenue where the
bridge is, its like everywhere its blocked". The collider view showed tall wall colliders standing across the cobbled
Rue de Verrewinkel at the hero bridge (models/rail/verrewinkel, `bridge-verrewinkel`, F7, -269, 1308), some hanging down.
Rule 27 (provisional) in docs/QUALITY_RULES.md. Offline turns, no browser. Round 2 (census by cause, the LiDAR trunks, the
deck lanes): section at the end. **Tile worker change in round 2** (tileData.js, streets/roadTrees.js, rail/roadDeck.js,
streets/carriageway.js now in the worker): rebuild the worker bundle in the main repo (rule 12).

## Item 1: WHY IT HAPPENED + FIX

The hero models (landmarks, the hero bridges, the road tunnels) collide for the car by their LOD0 (viewer/heroColliders.js
`carBlockers`): every LOD0 triangle sampled every 12 cm, kept where it stands 0.30-1.30 m over "the drive surface", merged
into 0.25 m rectangles that are walls with NO height (top 1e4 / base -1e4: they stop the car at any height). Two causes
made the Verrewinkel bridge's own deck a field of such walls:

1. **The band was measured from the layer nearest the CAR.** The drive surface given to the builder was
   `driveMode.ground`, which, where there are two layers (a deck over a cutting, a street under a deck), answers with the
   layer nearest the car's current height (`state.y`, for the car's own wheels). The blockers are built ONCE in a 2 s poll,
   whenever the bridge's tiles come in, wherever the car is at that moment. With the car lower than ~73 m (the deck is at
   76.8-78.7 m, the railway cutting under it at ~70 m) the whole deck's band started on the cutting floor: the abutments,
   piers and spandrels became walls standing across the road at both deck ends and through it. The result depended on
   where the player happened to be driving.
2. **"The lowest surface within 1 m" crossed the deck's edge.** To stop a car from a wall's lower side, the builder takes
   the lowest surface within 1 m of each point. On a 4.2 m deck, that is the railway cutting 4-7 m under the deck's edges
   (and the footbridge 0.3 m under the road deck): from anywhere within ~1 m of a parapet the bridge's own brick
   spandrels, its slab and its road surface came into the band. This one held whatever the car's height (both
   `--near` runs below fail on the deck).

**Why no check caught it:** the collider audit (rule 25, tools/audit/colliderAudit.mjs) is offline but leaves the hero
models out ("browser turn"), and the browser collision test drives a few spots; nothing drove every street against the
hero colliders.

**Fix (default; `?heroground=old` = as before, viewer/features.js "hero colliders from the car's layer (old)"):**
- viewer/drive/surfaceLayers.js `surfaceLayers(decks, hm, ground, x, z)` -> `{ top, low, deck }`: the place's own layers
  with no car in them (top = what a car there drives on with no hint: a road deck, else the drive grid's top layer;
  low = the highest other surface > 1.5 m under it, else NaN). driveMode.js `groundLayers(x, z)` hands it to the builder.
- viewer/heroColliders.js `layeredBlockers`: two passes, one over `top` (the blocks carry `base` = their lowest sample:
  a car on a layer under them passes, carEnv heightClear) and one over `low` where there is one (`top` = their highest
  sample: the car on the deck over the piers passes). Rectangles merge only cells of one 0.5 m height step.
- On a deck (`deck` true) the "lowest within 1 m" takes only surfaces within 0.1 m of the point (the deck, the street
  joining it level); a lattice point at a deck's edge (a deck point 0.5 m away, > 1.5 m over it) takes the deck's
  height, so the parapets' samples round to the deck, not to the cutting: the parapets still block, the deck does not.
- The lattice of the drive surface is now built in slices too (rule 22: <= 3 ms a step while playing).
- viewer/rail/roadDeck.js: the hero road decks' frame / deck height / parapet rings moved out of bridgeModel.js (re-exported
  there) so the node check can use them without THREE. No tile worker change in round 1 (round 2 changes the worker: below).

## Item 2: the check (`drivecheck`, tools/audit/driveCheck.mjs, mergeGate)

`node tools/audit/driveCheck.mjs [--all | T ...] [--old [--near Y]] [--out F] [--max N] [--maxhero N]` (5.5-7 min for all
120 tiles, 4 processes). Per tile, the worker's whole build in node, then the car's colliders as the city completes them:
the worker's (buildings, islands, rail fences, deck parapets, trunks), lamps + bollards, the garden pieces the city keeps,
parked cars (soft: info), and every hero model within reach (29 models: the 17 landmarks, the 10 bridges, the 2
tunnels, 34 tile builds; GLB LOD0 = nodes without _far / _xfar / _lodN, placed by its placement) blocked by
heroColliders.js itself. Not covered: the 8 public-art roots and the Lycee front (no GLB + placement file; browser turn),
the kits' stand-ins (debug/drawnAudit.js). It walks every
driven lane / junction turn of the traffic graph AND every driven street's OSM centre line (carriageway.js NOT_DRIVEN
left out) with the car's body (half width 0.9 m) every 0.5 m on the carriageway, at the layer the path is on (followed
along it), and lists every hard collider the body meets that the car does not pass over / under and that reaches
>= 0.3 m INTO the carriageway (on a hero road deck: its roadway between the parapets, 0.5 m in from their faces). Hits are
grouped into places (one source, 6 m), each with tile, street, x / z, source, metres of path blocked.

| all 120 tiles | `--old` (car below, -1000) | `--old --near 1000` (car above) | after |
|---|---|---|---|
| places where a collider blocks the carriageway | **280** (1,600 m of path) | **280** (1,563 m) | **274** (1,466 m) |
| of them hero models | **9** (Verrewinkel 6, 136 m of path) | **9** (Verrewinkel 6, 99 m of path) | **3** (Verrewinkel 0) |

Reports: docs/drivecheck/before.json, before_carhigh.json, after.json (`list`: every place).

The other 271 places are NOT this branch's: buildings 100, garden pieces 73, trees 63, bollards 34, a wall 1 (E10
Kasteelstraat, the service deck's level, docs/DECKRAIL.md open). Many are the lane data cases the collisions browser turn
already judged (docs/COLLIDER_AUDIT.md: Carre Cassimans F1 is a pedestrian alley the data calls roadway, the Avenue Albert
lane runs through a block interior, the Kauwberg connector clips a house, Ch. de Saint-Job E6 a band lane inside a
building): the census for the next jobs (TODO step 1), not fixed here. The gate is a ceiling: no new place anywhere
(274 then; round 2: 211) and no new hero place (3).

The 3 hero places left (E8, Rue des Bigarreaux under the Engeland railway bridge, -688, 1805 / -699, 1794 / -705, 1786):
not the colliders: the drive surface inside the carriageway has a 3-6 m cliff there (67.0 -> 61.3 m within 1.5 m, OSM band
over the embankment beside the street under the bridge), the abutment's foot is measured from the lower side. A terrain /
road-fit defect of its own (open).

Found on the way (info, not counted): the traffic graph's two lanes on the Verrewinkel bridge run at +-1.5 m on a 4.2 m deck
(OSM band 7 m): a car body on them overlaps the parapets by 0.3-0.5 m (864 edge contacts): the lane data, not the
colliders (open).

Browser check (next turn): `?at=-269,1308&view=drive` default vs `&heroground=old`, drive both ways over the bridge with
the collider view (G): no wall across the road on or before the deck; parapets still stop the car at the sides.

## Round 2 (2026-11-18): the census by cause, the biggest generator class fixed

The owner: "it's like everywhere it's blocked". Every place now carries its anatomy (driveCheck.mjs `anatomy`): the
paths that meet it (lane / turn / centre line), how deep it reaches into the carriageway (0.3 .. 2.5 m), whether that is
a MEASURED roadway (UrbIS street surfaces) or only the OSM band where nothing is measured, the measured class under it.
Cause per place: tools/audit/driveCause.mjs (one definition, also in the gate's output and the JSON `list[].cause`).

| cause | before (`--set roadTrees=false --set deckLanes=false`) | after |
|---|---|---|
| a. the lane / centre line / OSM band runs through something real (drawn buildings 100; garden pieces where no roadway is measured or beside an alley whose path also runs into buildings 53) | 153 | 153 |
| b. the collider's generator is wrong (LiDAR trunks on the drawn carriageway 63; garden pieces reaching 0.3-2.5 m into a MEASURED roadway 20) | **83** | **20** (gardens) |
| c. a real obstacle where it stands (UrbIS-measured bollards on the roadway: the path should not use it) | 34 | 34 |
| d. the drive surface under the collider (E8 Bigarreaux cliff x 3, E10 Kasteelstraat service deck level) | 4 | 4 |
| **total** | **274** | **211** |

Examples (x, z; the biggest per street):
- a: F1 Carré Cassimans (-473.9, -1545.3, a cobbled alley the data calls roadway); F1 Rue Vanderkindere (-145.1, -1635,
  the Avenue Albert lane through a block interior); E6 Chaussée de Saint-Job (-524.2, 929.3, a band lane inside a building).
- b (after): D5 Rue Camille Van Exter (-1050.7, 151.1, a closed car gate 2.5 m in); G3 Chemin de la Source (259.4, -512.5,
  a garden wall); J4 Opstalweg (1656.5, -270.2, a garden wall). Before also: E6 Dieweg (-968.6, 798.1), C6 Rue Keyenbempt
  (-1680.7, 961), G6 Chaussée de Saint-Job (24.4, 788.4): trunks.
- c: I1 Rue De Praetere (1239.6, -1898.5); F1 Avenue Molière (-269.6, -1917.6); D1 Rue du Mystère (-1442.3, -1554).
- d: E10 Kasteelstraat (-755.4, 2795.4); E8 Rue des Bigarreaux (-688.4, 1804.6) and (-705.3, 1785.8).

**Fixed: b, the LiDAR trunks (63 places, the biggest generator class; `?roadtrees=old` = as before).** WHY: build_trees.py
puts a tree at each canopy-height PEAK; a street tree's crown leans over the road. pipeline/filter_road_trees.py moves
such trees off the carriageway, but only against the MEASURED UrbIS surfaces; where a street has none (private clos,
drèves, the streets past the region's edge, the forest lanes) the road is drawn from the OSM band and the trunk stood in
it, drawn and colliding (53 of the 63 had no measured surface under them; 10 were on a measured roadway the pipeline
missed). Fix: viewer/streets/roadTrees.js `treesOffCarriageway` at the tile build (viewer/tileData.js, after the road
stage, before parking / traffic / colliders / the drawn tree list read feats.trees): a LiDAR tree whose point is on the
DRAWN carriageway (carriageway.js: the measured class where there is one, else the OSM band) moves to the nearest point 0.6 m clear of it within about a crown radius
(clamp(0.8 crown, 1.5, 4) m; not in a building, in the tile), else, or onto another tree (< 1.8 m), it is dropped (the
pipeline's rule). A measured TRAM road keeps its trees (Avenue Churchill's tram reservation is "tram road" in UrbIS and
its two tree rows stand on it). City-wide 448 moved, 212 dropped of 211,330 trees (0.31 %); trees in kerb pits and
medians stay (browser turn: the first cut also moved trunks that only REACHED 0.3 m in and counted tram roads: 697 / 278,
Churchill's rows went; now the point alone decides, roadway / parking where measured, the OSM band elsewhere; the 63
places stay at 0, the reaching ones are "edge" info). Trunk places
63 -> 0 (gate: `--maxsrc tree=0`). Visible: trees shift off drawn roads in clos / drèves (tour views may flag).

**Also (simple): the Verrewinkel deck lanes (`?decklanes=old`).** The traffic lanes over the hero road deck come from the
OSM band (+-1.5 m on a 4.2 m deck): viewer/rail/roadDeck.js `squeezeDeckLanes` (tile worker, after the traffic graph)
holds every traffic point over the deck's span at most parapet_inner - 1.0 = 1.1 m off its axis, tapered back 0.15 m per
m past its ends. Parapet contacts of the lanes 864 -> 416: a car body now clears the drawn parapet face by 0.1 m; what is
left is the blockers' 0.25 m world-axis cells on the diagonal parapet (they reach up to 0.35 m in from the face). Two
cars pass 0.35 m apart there: the real bridge is narrow too.

Left, not generator bugs: a (153, the lane / band data: alleys, lanes through block interiors, connectors clipping houses:
the routing data, TODO step 1), c (34 measured bollards: the path should not use them, routing), d (4, drive surface),
b gardens (20: garden pieces that reach 0.3 m+ into a measured roadway; the strict garden test `?gardenlane=new` was
withdrawn after Carré Cassimans, docs/COLLIDER_AUDIT.md: a next job per spot). Reports: docs/drivecheck/round2_before.json,
after.json. Gate: `--max 211 --maxhero 3 --maxsrc tree=0`.

## Browser turn (2026-11-18, round 1 + 2; worker bundle rebuilt in the worktree only, not committed)

Quick boots `?quick=1&at=..&radius=..&time=midday&still=1&xmas=0`, the car driven by a waypoint follower on
`driver.autoInput` along Rue de Verrewinkel's OSM line (r14386610_5c1 -> the deck r28030783_0 -> r28030784_0).
Screenshots in the session scratchpad (paths in the merge message).

| check | default | old |
|---|---|---|
| Verrewinkel west -> east, over the deck | across, 0 contact frames | `&heroground=old`: stopped at the west deck end (X -20), 90 contact frames |
| Verrewinkel east -> west | across, 0-1 contact frames | stopped at the east deck end (X 18.8), 94 |
| collider view (G) at the west end | parapets along both sides, road open (`dc_verre_new_west.png`) | the owner's picture: rings across the road, "spikes" (`dc_verre_old_west.png`) |
| on the deck | parapets both sides, nothing across (`dc_verre_new_deck.png`) | |

Found and fixed in the browser turn:
- **The collider view drew the layered blockers as a curtain.** viewer/drive/debugDraw.js drew every polygon from the
  ground under the car's layer up 2.5 m: the pier blocks in the cutting (top 73-75 m) were drawn across the deck road
  (78 m) the car drives through. Now an item with a vertical extent is drawn at its own heights, and not at all when the
  car passes over / under it where it is now (`?heroground=old`: as before).
- **Dropped trees re-dressed whole streets.** The street trees' look is picked by the tree's INDEX in the tile's list
  (viewer/treesStylized.js variantOfIndex): one dropped tree shifted every later tree of the tile to another variant
  (tour: orange-villas, churchill-blocks, police-station ... 14 views flagged). roadTrees.js now gives every kept tree
  its index before the drops (`vi`) when it drops one, and treePlacements / the pool / impostors / the kit pick by it.
- **Trunks reaching into the road vs on it, tram roads** (above): the point decides, tram roads keep their trees.
- Spots: E6 Clos du Papenkasteel (-670, 875): old, two trunks in the loop's roadway / parking bays; new, on the island
  and the kerb (`dc_trees_papenkasteel_old/new.png`). K6 Avenue du Fort-Jaco (2208, 940): the trunk at the cobbled
  lane's edge is gone (dropped, a duplicate canopy peak), the verge reads normal (`dc_trees_fortjaco_old/new.png`).
- Not colliders, seen on the way: the west approach of the bridge rises ~1 m in 2 m (X -37..-35 local, beside the
  road's bend) where the car started off the road; the follower on the road line passes.

Tour (`node tools/tour/compare.mjs deckrail drivecheck2`, 22 views, the worktree's own worker bundle; then
`drivecheck3` for 4 views after the tram-road change): 1 flagged of 22. **wolvendael-park**: one corner cell (12.4 %,
top right, 250 m off): a street tree at the park's edge street moved off the drawn road: intended. churchill-blocks
(flagged in drivecheck2: the tram reservation's tree rows had been moved) ok after the tram-road change; the first run
(`drivecheck`, before the `vi` fix) flagged 14 views, all the index re-dress of the trees (orange-villas, police-station,
stjob-railbridge ...), ok in drivecheck2 / 3.
