# Sidewalks level with the kerb, banks from the street edge (claude/sidewalk, 2026-11-18)

Census class C (docs/CENSUS.md), owner playtest 2026-11-18 images 91 (Av. Brugmann 349: "this sidewalk is unusable",
62 % across), 81 (a saw-tooth bank), 77 (a blocky terrain bump beside a sidewalk), 89 (a raised asphalt slab).
Switch: `?sidewalk=old` (entry `sidewalkLevel: false`, a features.js A/B row) = everything as before.

## Why it happened

1. **Sidewalk up the bank (91).** The measured street's height field `prep.H` (viewer/surfaces.js) is a 6 m grid of
   corners, each a least-squares plane through the DTM at the street points round it. Under a sidewalk at the foot of a
   bank the 1 m LiDAR DTM already climbs (the bank's toe lies inside UrbIS's polygon: +0.8 m over the back 1.5 m at
   Brugmann 349), and a corner with only a few street points round it took the raw DTM under it, i.e. the bank. Nothing
   said "a sidewalk is level with its kerb". The same plane fits pulled the carriageway next to it (road cross-fall bumps).
2. **Saw-tooth bank foot (81, 91).** `clampUnder` held the terrain beside a street to +0.1 m per m out to 1.5 cells and
   the vertices under it to its height. A 1 m terrain triangle from a vertex under the sidewalk to one 1 m out rose over
   the sidewalk's edge in a zig-zag along the grid, and the real bank stood up one cell out: a stepped bank foot.
3. **Blocky mounds (77).** The weld's shoulder / bank was measured from the nearest COVERED grid vertex (a 1 m raster
   distance), not from the edge: the bank's contour lines were offsets of the grid's stair-steps.

## Rule 31 (provisional)

A raised street surface (sidewalk, paved island, dropped kerb, tree pit) is level with its kerb: its cross-section
follows the kerb top with a real cross-fall (<= 4 % rising away from the kerb, <= 2 % falling), its long profile follows
the street. Only a surface that runs on to ANOTHER street at another level (a paved slope between two streets) keeps its
own ground. The terrain meets every street edge by a signed-distance bank from the EXACT edge (never a raster distance):
above the street a 45 degree bank cut down to the edge (its mirror under the edge, hidden, so a straddling grid triangle
crosses the street's height on the edge), below it the weld's shoulder and 0.7 bank.

## The fix (generators)

- `viewer/surfaces.js prepareSurfaces` (`opts.kerbLevel`): `groundAt` = the DTM at the sample's nearest kerb point +
  the DTM's rise from there clamped to `KERB_FALL_UP` 0.04 / `KERB_FALL_DOWN` 0.02 per m, blended back to the DTM from
  `KERB_BAND` 4 m to 8 m from the kerb (forecourts), not for a surface that walks on to another street > 0.5 m off its
  kerb's level (B4 -2302, -482); a corner with < 6 street points round it takes their mean, not the DTM under it.
  (The kerb-frame block moved above the height field, unchanged.)
- `viewer/heightmap.js edgeField`: exact plan distance to the streets' outer edges (near-flat triangle edges used once
  whose outward side no surface covers) + the edge's height, per grid vertex within 4 m.
- `heightmap.js clampUnder` (`bank` = `BANK_SLOPE` 1.0, roadBuild.js): beside the street `y(edge) + d`, under it
  `y(edge) - d` within 1.5 cells; never deeper than maxDrop under a surface; beside it a cut needing more than maxDrop
  fades out to none at 4 m (a structure), continuous (skipping it left a 1 m step).
- `heightmap.js weld` (`field`): the shoulder (0.75 m from the true edge) and the 0.7 bank from the exact distance.
- Switch plumbing: viewer/main.js `sidewalkLevel` (`?sidewalk=old`), viewer/tileData.js -> roadBuild.js `kerbLevel`,
  viewer/features.js row. **Worker code changed** (surfaces.js, heightmap.js, roadBuild.js, tileData.js): rebuild
  `viewer/tileWorker.bundle.js` in the main repo (rule 12).

## Counts (all 120 tiles, tools/audit/census/ground.mjs, same detector both ways)

| sub-class | ?sidewalk=old | default | |
|---|---|---|---|
| sidewalk tilt > 15 % across the kerb | 4,052 groups / 29,510 m2 | 804 / 4,691 m2 | -80 % / -84 % |
| road cross-fall > 12 % | 1,462 / 24,092 m2 | 392 / 6,685 m2 | -73 % / -72 % |
| terrain drawn over a street (new) | 361 / 2,932 m2 | 296 / 2,616 m2 | -18 % |
| weld lumps > 0.5 m | 1,232 / 15,842 m2 | 867 / 11,988 m2 | -30 % |
| grid spikes (re-tuned) | 463 / 1,511 m2 | 491 / 1,395 m2 | +6 % groups, -8 % m2 |
| holes under the street (re-tuned) | 3 / 320 m2 | 45 / 547 m2 | see below |

Brugmann 349 (image 91): 18 m2 at 62 % -> two 1 m2 slivers at the ramp ends (69-72 %, ramp wings). Raw results:
docs/census/ground_old.json / ground_new.json (the census's own run stays docs/census/ground.json).

Detector re-tune (before it became a gate row): the census's 3,038 "holes" were almost all the old 1-cell clamp ring and
the railway: a lowered cell now counts only when it is lower than the street within 4 m (- 0.3 m), and cells within
15 m of the railway's ballast / rails / platforms / fences or 12 m of an OSM bridge deck's line are intended
earthworks. Spikes skip a cell whose neighbour lies under a street (the hidden notch) and the crease of a bank cut to a
street's edge. New sub-class `over`: the drawn terrain (as terrainArrays splits it) > 2 cm over the highest street
surface, sampled every 0.25 m. The 45 holes left: Wolvendael pond bed (F4, intended), the sunken engine lanes of E10 /
D10 (an OSM road the engine lays 3-4 m under the DTM: the cut fades out at 4 m, terrain still over them, `over` 5.8 m
D10 -1041, 2947), Dieweg 4 / Alsemberg 1010A (D6), Wansart 2 (D4).

## Performance

Road triangles: 71,862 -> 69,902 a tile (-2.7 %: the street's creases densify less on level sidewalks). No runtime or
GPU cost: the terrain mesh is the same grid, simplified as before. Worker only (the tile build; a tile-cache hit
skips it).

Build ms, paired in one node process (6 tiles F2 E6 I6 G6 H6 D5, each built old / new / new / old, mean of the 12
pairs' differences; this machine was loaded, so the absolute times swing 2x, the paired difference is what holds):

| | terrain weld + edge field | surfaces + width fit |
|---|---|---|
| first cut (commit a34a7e4d) vs `?sidewalk=old` | +183 ms | +68 ms |
| optimised vs `?sidewalk=old` | **+83 ms** | +20 ms |

What made edgeField cheaper (heightmap.js; census counts unchanged, `over` 298 -> 296): vertices welded by exact
position before the once-used-edge test (the paving frames split vertices: 43k candidate edges to probe for 6.6k real
outer edges, 123k edge entries), an open-addressing edge table (typed arrays, first-use order kept) instead of a Map,
the coverage buckets as a flat CSR grid holding each triangle's plan corners, flatness without Math.hypot, each raster
row clipped to the capsule's own stretch (a 50 m kerb edge's box is ~7x its capsule), Math.sqrt for the distances.
The roadBuild lap "edge field" now reports it apart from "terrain weld".

Time to play: on a cold tile cache (a first visit, or once after the worker bundle is rebuilt: rule 12) the spawn
waits for its start tile + 8 ring tiles across 3 workers, about 3 tile builds on the critical path: ~+0.3 s on police
~43 s / falcon ~39 s (< 1 %). Warm cache: 0. Far (lite) tiles do not run the road stage.

## Left / needs a browser look

- The screenshot spots: Brugmann 349 (F2 -275.5, -1191.7, `?quick=1&at=-275.5,-1191.7`), A/B with `&sidewalk=old`:
  the sidewalk level, the bank from its back edge, no paving zig-zag.
- The steepest new banks: C3 (-1838, -793: a 3.5 m bank behind a sidewalk, cut 45 degrees, the rest faded),
  H6 Rue Baron Perelman 4 (672, 517), G10 Rue de Percke 161 (329, 2789: still 164 m2 at 91 %: stairs / terraced
  sidewalk? check), F9 Rue Engeland 501, B4 (-2296, -468).
- Image 77 / 89 not located (no position). 89 class (an engine strip standing over the measured street): a drive-grid step
  scan finds few (I6 4, E4 2, F3 13 groups of > 0.22 m steps next to unmeasured strips), e.g. F3 (-18, -851) 0.82 m,
  F3 (-407, -525), E4 (-609, -253): look there. Not fixed here (vendor/roads heights, unmapped engine strips kept as
  built in surfaces.js buildSurfaceRoads).
- Weld lumps up to 2 m beside UNMEASURED engine roads laid flat across a cross-slope (E6 Ch. de Saint-Job 253, G6
  Carsoel 126B, K10): the weld bank to their edges is now smooth, but the roads themselves still float / sink; a fix
  is the engine strips' cross-fall (unmapped roads) - next job.

## Browser turn (2026-11-18, after merging foundation dafe786b)

Visual tour (docs/TOUR.md). The new baseline `.tour/foundation2` was taken on foundation dafe786b (main checkout,
served read-only): 22/22 views ready, 0 errors.
- `?sidewalk=old` on the branch (a views copy with `sidewalk=old` in the common switches) vs foundation2: **0 of 22
  flagged**. The switch gives back foundation exactly.
- The branch default vs foundation2: **20 of 22 flagged** (all but f3-loggia-blocks and far-300m). Looked at:
  ham-terrace, lycee-front, stjob-station, police-station, churchill-blocks. What changed in them is the street and
  ground heights. Quick-mode cameras stand 1.7 m over the drawn ground, so a street moved by a few cm shifts the whole
  picture by a few pixels. Also: the grass bank behind ham-terrace's sidewalk (smooth from the back edge), the
  parked cars and garden plants on the new levels, and trees whose ground moved. The stjob-station tree to the right
  of the stop is a different crown in the run: probably a tree seed or LOD pick that depends on its ground height.
  Not traced: say if it matters.

Spots, A/B with `&sidewalk=old` (docs/sidewalk/shots/*-new.jpg / *-old.jpg):
- F2 Brugmann 349 (image 91): old, the paving climbs the bank in a triangle. New: level sidewalk, the bank starts at
  its back edge. The 45 degree cut shows as the steep-slope earth material (brown), not grass.
- C3 (-1838, -793): old, the paving runs 3 m up a 70 % bank and a parked car tilts on it. New: level sidewalk and
  car, a cut earth bank behind.
- H6 Rue Baron Perelman 4: old, a wide paved slope up to the garden gate. New: level paving and a ~1.5 m earth cut
  under the hedge; the gate piers and hedge stay at the garden level, so the gate is now on top of the cut. Gardens
  are not re-seated on the cut. The real place is probably steps / a sloped forecourt: needs a look by the owner.
- B4 (-2296, -468): no change (the "two street levels" rule keeps the paved slope). Before and after alike: a wavy
  kerb band and a leaning lamp (not this branch).
- G10 Percke: a paved slope up between houses, camera blocked by a house; the slope is kept (two-level rule).
- E10 (-895, 2855): an unmeasured engine road 3-4 m under the DTM at the region's edge, grass over it. The same before
  (`over` sub-class, not fixed here).
- F3 (-18, -851), a 0.82 m step spot: a forest path whose asphalt edge jogs where the engine strip meets it. Small,
  not the image 89 slab.
