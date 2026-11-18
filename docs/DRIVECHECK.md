# Drive check: colliders on the carriageway (branch `claude/drivecheck`, 2026-11-18)

Owner playtest 2026-11-18 (car, live site): "the car is blocked here behind lycee francais close to saugrenue where the
bridge is, its like everywhere its blocked". The collider view showed tall wall colliders standing across the cobbled
Rue de Verrewinkel at the hero bridge (models/rail/verrewinkel, `bridge-verrewinkel`, F7, -269, 1308), some hanging down.
Rule 27 (provisional) in docs/QUALITY_RULES.md. Offline turn, no browser.

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
  there) so the node check can use them without THREE. No tile worker change (nothing in the worker bundle changed).

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
(274) and no new hero place (3).

The 3 hero places left (E8, Rue des Bigarreaux under the Engeland railway bridge, -688, 1805 / -699, 1794 / -705, 1786):
not the colliders: the drive surface inside the carriageway has a 3-6 m cliff there (67.0 -> 61.3 m within 1.5 m, OSM band
over the embankment beside the street under the bridge), the abutment's foot is measured from the lower side. A terrain /
road-fit defect of its own (open).

Found on the way (info, not counted): the traffic graph's two lanes on the Verrewinkel bridge run at +-1.5 m on a 4.2 m deck
(OSM band 7 m): a car body on them overlaps the parapets by 0.3-0.5 m (864 edge contacts): the lane data, not the
colliders (open).

Browser check (next turn): `?at=-269,1308&view=drive` default vs `&heroground=old`, drive both ways over the bridge with
the collider view (G): no wall across the road on or before the deck; parapets still stop the car at the sides.
