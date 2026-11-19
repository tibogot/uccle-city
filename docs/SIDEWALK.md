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

## Round 2: retaining walls in front of gardens, grass banks (2026-11-18)

WHY (browser turn): at H6 Rue Baron Perelman 4 the levelled sidewalk left the hedge and the gate posts on top of a
1.5-3.7 m bare earth cut. A garden above a sidewalk in Uccle sits behind a RETAINING WALL. Every cut was 45 degrees
of brown earth, and a sidewalk going 3.7 m up to the houses was pulled all the way down to its kerb.

Fix:
- `viewer/streets/retainWalls.js` (new). Every outer edge of the measured sidewalk mesh whose ground 1.2 m behind it is
  0.4-3.5 m over the edge, with PRIVATE land behind it, gets a wall:
  - private: not inside an OSM park / wood / grass / meadow / scrub area (tileData.js `publicAreas`), and a garden
    front (data/gardens, within 10 m) or a house (the footprint ray, within 25 m) behind it;
  - runs grow along the edge chains over lower private stretches (down to 0.1 m), so no one-edge gap shows the bank;
  - geometry: a blue-stone front face (the kerbs' material, aKind 1, merged into the concrete part), a 0.3 m coping, a
    lawn strip (grass part) at the garden level out to <= 2 m, end faces where a run stops. The garden level is the
    highest ground over the strip (a fan of +-35 degrees, 4 rounds). A HOLD quad (not drawn) holds the terrain behind
    the face at the sidewalk's height for clampUnder, so no 1 m terrain triangle rises in front of the face; the
    coping + lawn cover it.
  - Built in the worker after buildSurfaceRoads, before the terrain sees the street (roadBuild.js), from the outer
    edges edgeField collects (`collect`). Cost: see below.
- Garden pieces seat on what is DRAWN (viewer/main.js `gardenGround`: max of the terrain and the drive raster's
  street top), so a hedge / post on a wall's lawn strip stands on it. With `?sidewalk=old`: the terrain only.
- Banks: `BANK_SLOPE` 1.0 -> 0.6 (31 degrees); the ground shader's bare earth from ~35 degrees (normal.y 0.82 -> 0.74,
  was 0.9 -> 0.72, viewer/ground.js `SOIL`; `?sidewalk=old`: as before): the street banks are grass; the natural
  slopes over 35 degrees stay earth.
- `LEVEL_MAX` 2.5 m (viewer/surfaces.js): a sidewalk is never levelled more than 2.5 m under its own ground (deeper is
  a sidewalk going up to the houses, not a bank's toe). Under a drawn street surface clampUnder may lower the terrain
  to 3 m (`BANK_COVER_DROP`); beside it the 1.2 m guard stays.
- Census: new sub-class `gardenVoid` (a garden piece seated as the city seats it with the drawn ground > 5 cm under
  its base across its footprint); the `over` scan leaves the grass part out (a wall's lawn strip under the garden's
  own grass is not a defect).

Round 2 counts (all 120 tiles; `--old` re-run with the same detector): tilt 4,052 -> 816 (29,510 -> 4,887 m2),
roadTilt 1,462 -> 395, over 365 / 2,935 m2 -> 517 / 1,073 m2 (more, smaller groups: slivers at wall ends and bank
creases; -63 % area), lump 1,232 -> 1,206, spike 463 -> 454, hole 3 -> 3, gardenVoid 0 -> 5 (3 m2). Gate ceilings are
set to these counts.

Round 2 cost: retaining walls ~150 ms a tile (6 tiles F2 E6 I6 G6 H6 D5; ~960 m of wall a tile, mostly the extra
coverage pass of the edgeField collect call), edge field 64 ms; road triangles 45,026 -> 45,270 a tile (+0.5 %, the
walls merged into the concrete / grass parts: no new draw call). A follow-up could share one coverage pass between
the walls' collect call and the field.

Bug found and fixed on the way: clampUnder applied the bank to every vertex under a street (`inside` with no edge in
reach: cap -Infinity, clamped at the cover drop), which sank the terrain under every street 4.5 m. Trees and parked
cars went with it (tour coghen-blocks, first round-2 run). It now needs a finite distance to an edge.

Browser round 2 (docs/sidewalk/shots):
- h6-perelman-wall.jpg: a blue-stone retaining wall, with the hedge and gate posts on the garden on top.
- f2-brugmann349-r2.jpg: no wall (no garden or house behind). A 31 degree grass bank from the level sidewalk; the
  natural slope over 35 degrees above it stays earth.
- c3-bank-r2.jpg: the paving is level at the kerb and rises toward its back edge. It is levelled at most 2.5 m under
  its own ground (`LEVEL_MAX`) and the bank here is 3.3 m. Parked cars are level.
- e6-chateaudeau-wall.jpg: a hollow way with walls on both sides. There are no terrain teeth in front of the faces
  now; the hold covers 1.6 m behind every face.
- Tour vs foundation2: 20 of 22 views flagged (f3-loggia-blocks and far-300m ok), the same set as round 1. Diffs looked at:
  ham-terrace, orange-villas, coghen-blocks (small camera-height shifts, tree and hedge tone, garden plants on the new
  levels). Vs round 1: 14 of 22 flagged; the biggest are ham-terrace and coghen (3 % of pixels), lycee and police (2.5 %).

## Round 3: the wall's look, stepped tops and piers, cost (2026-11-18)

WHY: the H6 face read as a flat grey slab with panel seams every metre (the kerb's blue stone with its 1 m stone
joints along uv). At E6 a wall began as a tall sloped BLADE: its top followed each vertex's garden level, ramping
from 0 to ~2 m along a thin wedge. The walls cost ~150 ms a tile.

Fix:
- Material (viewer/roadPaint.js concreteMaterial, same concrete part and draw): aKind 4 = brick in the garden walls'
  four tones (gardens/gardenKit.js `BRICK`, `brickPattern`: their stretcher bond in WORLD space, 22 x 6.5 cm, no
  seams), aKind 5 = coursed stone (~0.5 x 0.24 m staggered stones, per-stone tone). A 0.3 m blue-stone plinth course
  (uv.y over the foot), blue-stone coping (aKind 1). Evaluated only on wall pixels (an `If`). One look per run, from a
  stable hash of the run (30 % stone, else brick in one of four tones), as the garden walls pick theirs.
- Stepped tops: each wall edge's top is flat, the mean garden level of its two ends rounded to 0.35 m, and at least
  0.4 m over its foot. Where two edges' tops differ there is a vertical step face across the wall's depth.
- Run ends: a 0.45 m pier, 0.12 m over the wall, stone-capped, closing the wall from the face to the strip's back.
  Never a knife edge.
- The garden level is now the middle of three ground samples 1.2 / 1.6 / 2.0 m behind the wall, not the highest
  point of a fan. The weld no longer raises the garden to a wall's top (edgeField `wallTop`: the field's nearest
  edge is a wall's coping / lawn), which made lumps. The hold stops where the strip stops.
- Cost: the sidewalk's outer edges come from its own once-used edges (heightmap.js `onceEdgeList`) tested against
  the street's class raster, not a coverage pass of every part. The garden index uses 5 m numeric buckets. The private
  test runs only where a wall could stand.
- Census: new sub-class `blade` (a wall face's TOP edge sloping more than 20 degrees, groups of more than 1 m of it;
  kerb and blue-stone faces counted too, so round 2's walls are seen). Gate ceiling 0.
- Two more fixes found by the census:
  - Walls are built only on MEASURED sidewalk edges. The concrete part also holds the engine's sidewalks; their outer
    side is the engine road, which is not in the raster, so walls stood along them.
  - A tile without islands has no grass part. The lawn went missing there while its hold was applied: a 1-cell trench
    of up to -2.4 m (G3 Rue Roberts Jones: spikes / holes). The part is now created.
- Behind a wall, clampUnder no longer cuts the garden (no bank from a wall's top, and no ring). The lawn strip is
  HOLD + 1.5 = 3.1 m deep, so a grid vertex always falls between the hold and the strip's back: no slit under its edge.

Round 3 counts (all 120 tiles; `?sidewalk=old` with the same detector in brackets): tilt 811 (4,052), roadTilt 395
(1,462), over 353 / 874 m2 (365 / 2,935 m2), lump 865 (1,232), spike 174 (463), hole 3 (3), gardenVoid 0 (0),
blade 0 (0). Round 2's walls had 35 blades on H6 + E6 + H7 alone. Gate ceilings: these counts, blade 0.

Round 3 cost (6 tiles F2 E6 I6 G6 H6 D5, worker): retaining walls 150 -> 59 ms a tile (~1,090 m of wall, 63 runs,
133 piers a tile), edge field 81-87 ms. Road triangles 45,026 (old) -> 45,836 a tile (+1.8 %: the walls' steps and
piers), in the concrete / grass parts: no new draw call. The brick / stone pattern is evaluated only on wall pixels.

## Round 3 browser turn (2026-11-18, after merging foundation: markings, zfight, birds2)

- The census after the merge, all 120 tiles: tilt 811, roadTilt 380 (395 before the merge: the markings merge's
  re-fitted road strips), over 352, lump 864, spike 174, hole 3, gardenVoid 0, blade 0. The ceilings are set to these.
- Walls re-measured after the last fixes: 48 ms a tile (6 tiles; ~780 m of wall, 47 runs, 99 piers a tile; fewer since
  the engine's sidewalks no longer get walls). Edge field ~100 ms.
- Fix found in the browser: the wall shader's `If` must be inside an `Fn` (TSL: "Cannot read properties of null
  (reading 'If')", the page did not boot).
- Shots (docs/sidewalk/shots):
  - r3-h6.jpg: H6 Perelman 4, a coursed-stone run, stepped tops, piers at the run ends, the hedge and gate posts
    on the garden. A short earth wedge shows between two runs at the gate.
  - r3-e6.jpg: E6 Château d'Eau, an orange-red brick run stepping up the bank, lawns between the steps. The left
    side is now a grass bank (no measured sidewalk edge there).
  - r3-i6-brick.jpg: I6 near (1143, 663). The camera landed in a garden; low walls along the front gardens show
    only their blue-stone plinth. Not a good brick shot: the brick look is best seen in r3-e6.
  - r3-g3-robertsjones.jpg: G3 Rue Roberts Jones. The lawn strips are drawn, and the trench is gone. But there are
    several stepped walls one behind another inside the garden: probably the sidewalk polygon's own back edges, not
    traced yet.
- Tour vs foundation2: 20 of 22 flagged (as round 2). Vs round 2 (sidewalk2): 11 flagged. Looked at:
  - stpierre-parvis: road lines and a parked car moved (markings merge).
  - defre-villas: lane lines (markings) and a tree.
  - ham-terrace: a far garden hedge and a tree, and the car's outline.
  All of these come from foundation's merges, not the walls.

## Round 4: one wall line, gaps closed (code, 2026-11-19)

- G3 Rue Roberts Jones, traced. The "stacked walls inside the garden" in r3-g3-robertsjones.jpg are ONE wall line: the
  camera stood on it, looking along it, so its stepped tops (a step face across the 3.1 m strip at every 0.35 m step)
  read as walls one behind the other. The census did find real stacking elsewhere (H6 Benaets 91, E6 Dieweg / Château
  d'Eau): a run's end pier standing 0.6 m behind the next run's face at a corner, and a few cases of two sidewalk
  edges with a strip of land between.
- Rules now in viewer/streets/retainWalls.js:
  - One wall line: where a wall edge has another wall edge of the same facing 0.5-4 m behind it, only the back one
    keeps its wall (the one farthest from the carriageway).
  - No pier where another wall line passes the run's end (within 0.8 m).
  - A pier stops short of another wall line along its depth (E6 Château d'Eau 120: a run-end pier's 3 m side ran
    0.5 m behind the next run's face at a corner, the last stacked case); an edge of the same facing on the run's own
    line is the same wall, not another line.
  - A gap bridge never lies along or across an existing wall (I9 Myrtilles 62: the outline doubles back over itself
    under other vertex ids; the bridge laid a face over the run's own face, both end piers were dropped and the bared
    earth past the end was a 0.6 m lump).
  - Gaps under 3 m between two runs are carried across: by the edge chain, or by a straight face between the two run
    ends when the outline turns into another polygon there. Not where a garden gate stands within 2 m (an opening,
    piers either side), the land behind is public, or a measured path / driveway goes into the garden. H6 tile: 31
    runs / 65 piers -> 29 runs / 52 piers (E6 82 / 169 -> 73 / 139, I6 67 / 142 -> 67 / 127; wall metres within 3 %).
- Census: new sub-class `stacked`. A wall's FRONT face (a measured street 0.5 m in front of it; triangles over 0.2 m2)
  with another front face of the same facing 0.5-4 m behind it; groups over 2 m2. Gate ceiling 0.

Round 4 counts (all 120 tiles): tilt 811, roadTilt 380, over 344 / 868 m2, lump 864, spike 173, hole 3, gardenVoid 0,
blade 0, stacked 0 (15 before the round-4 rules, on E6 / H6 / G3 and a few other tiles). Gate ceilings: these, stacked 0.

Round 4 cost: the new checks (gap bridges, one wall line, pier depth) run on small grids of the wall's segments, not on
every edge of the tile (same geometry, byte for byte, on E6 H6 G3 I9 F2). Timing: see the report (the machine was
loaded by the owner's play session during this round's measures).

## Round 4 browser turn (2026-11-19, after merging foundation: jitter, carhit)

- Census after the merge: the same counts (stacked 0, lump 864, over 344). Full gate: 38 / 38 PASS.
- r4-g3-robertsjones.jpg (the r3 camera) and r4-g3-across.jpg (from the far side of the street): G3 Rue Roberts Jones
  is ONE stepped wall along the sidewalk's back edge (x 272 -> 291, its top 86.5 -> 89.3 m). Seen along the street,
  every 0.35 m step's face across the 3.1 m lawn strip reads as a wall of its own. Behind the lawn strip, where the
  garden rises more than the wall holds, the bank is bare earth. Both are look issues of the wall design, not stacking:
  the strip's lawn could slope between steps (only the wall's own thickness stepped), and the earth behind could be
  grass. Not changed in this round.
- r4-h6.jpg (H6 Perelman 4, the r3 camera): the earth wedge at the gate is gone; the wall runs on across it. The two
  dark posts behind it are not in the garden data (no gate or pillar within 30 m), so the gap is not an opening.
  The run is now brick (its hash changed when the two runs became one).
- Tour, the 4 wall-heavy views vs round 3 (sidewalk3): coghen-blocks, orange-villas, defre-villas ok; ham-terrace
  flagged on one cell (a brick pier at a garden path, r4-tour-ham-terrace-vs-r3.png).
- Lesson: the worktree's tileWorker.bundle.js was foundation's (no retaining walls at all) until rebuilt; the first G3
  look showed no walls. Always rebuild the bundle before a browser look and check it holds the branch's code.

## Round 5: walls that read, the bank behind, gates, cost (code, 2026-11-19)

- BRICK NOT VISIBLE. WHY: the brick pattern (gardenKit brickPattern) fades out as a course shrinks under ~3 px, and it
  faded to the BARE base colour (tone 1, mortar 0): from ~6 m on every wall was one flat slab of the brick colour, and
  slightly too saturated and too dark (the mortar's 21 % share of the face gone). Not a wiring bug: close up the bond
  showed (r4-g3-robertsjones.jpg). FIX: viewer/streets/wallPattern.js, the walls' brick and coursed stone as ONE piece
  of math written against an ops table (TSL nodes in the shader, plain numbers in the gate's check): the bond kept to
  ~2 px a course, then the face's average (mortar share mixed in), a low-frequency patch tone (4 bricks x 3 courses) that
  survives 3x further, the mortar rougher than the brick (roughness). The garden walls keep their own pattern.
  RULE: a face reads as its material at the distances it is seen from, never the bare base colour. CHECK: `walllook`
  (tools/audit/wallLook.mjs): head-on with the game camera at 4-40 m, contrast >= 0.08 up to 12 m and the mean within
  8 % of the near face; round 3's brick rebuilt from the same pieces fails it (contrast 0.06 at 12 m, mean -11 % at
  20 m); roadPaint.js wired to it inside its Fn.
- G3 BARE EARTH BAND. WHY: clampUnder gave the walls' lawn tops no bank (round 3: the garden keeps its ground), so where
  the garden rises behind the 3.1 m strip faster than the soil threshold (~42 degrees) the bank between was bare earth.
  FIX: the bank from the strip's back edge as from a street edge (31 degrees, BANK_SLOPE), faded over the last 1.5 m of
  its reach, and the vertices round a cut that stand > 0.3 m over their 8 neighbours brought down (a hillside rising
  1-2 m a cell left single spikes). The census counts the earth band (`bareBank`: drawn terrain behind a wall face,
  not covered by the lawn, steeper than 42 degrees over > 0.3 m within 8 m): G3 + H6 + E6 + I9 144 -> 60; city 575
  left where the hillside rises > 1.2 m within the 3 m reach (a structure: no cut). The census's bank-cut exemption
  now includes a cut down to a wall's lawn (as to a street edge). The lawn stays stepped (the steps across the strip
  are the wall's own); not changed.
- H6 DARK POSTS. WHY: they are a garden GATE and its two pillars from H5's garden data (data/gardens/H5.json run 4,
  at 670.8, 518.4: H5's building, its garden front 18 m over the border into H6). The walls read only their own tile's
  garden doc, so the gate was unseen and round 4's gap closing built the wall across it. FIX: the tile's garden doc +
  the 4 neighbours' pieces within 30 m of its bounds (tileData.js gardenDocNear), and no wall edge with a gate up to
  2.75 m behind it (the run ends in piers either side: a ~1.1 m opening at Perelman 4). Not orphans: nothing to delete.
- COST: the one-wall-line check's grid keyed by cell AND facing (a cell holds 16 facing bins, 5 read), no Set / spread /
  closures in the hot loops, the gate test one query an edge first, round 3's run growth over the growable edges only
  with plain loops (the same exact tests: the census on G3 H6 E6 I9 unchanged; the growth's geometry byte for byte). In situ (the tile build's 'retaining walls'
  stage, 6 tiles F2 E6 I6 G6 H6 D5 x 3, round 3 and round 5 alternated in one process, CPU load 2-4 %): round 3 mean
  46 ms (median 42), round 5 mean 55 ms (median 46): <= 60.

## Round 5b: steps in the gate openings (WIP, 2026-11-19)

- Where a gate opening's garden stands > 0.3 m over the sidewalk, a flight of blue-stone steps (risers ~17 cm, treads
  30 cm) from the sidewalk's edge up to the garden level between the piers; the piers' returns only as deep as the
  flight + 0.1 m (viewer/streets/retainWalls.js GATE STEPS; treads marked aUv2.y = 1). The terrain round a flight is
  lowered under the line of its treads (retainWalls flightCap, applied in roadBuild.js after clampUnder): a 1 m grid
  triangle from a vertex held at the garden level beside a 1.1 m opening crossed over the lower treads (census 'over'
  45 -> 25 on H6 G3 E6 I6, the no-steps figure).
- Census `gateNoSteps` (tools/audit/census/ground.mjs): a gate in a wall (a face within 3 m), its garden (1.2-2 m behind)
  > 0.3 m over the lowest sidewalk top within 3 m, fewer than 2 tread heights within 2.5 m. H6 G3 E6 I6: 62 with no
  steps built -> 12 with the flights.
- LEFT for the next session: the 12 remaining gates (e.g. G3 Roberts Jones 55, H6 Perelman 1 at 698.5, 540.2: a gate
  the wall's gate test does not take as an opening, or the census's "in a wall" too loose; trace them to 0); the full
  census (new ceilings incl. gateNoSteps 0; bareBank rose 64 -> 76 on the 4 tiles round the flights: check), the full
  gate, the cost re-measure (quiet machine), the Chrome turn (H6 / G3 / a stone wall / brick beside a garden wall, the
  steps). Flights can be tall: Perelman 4 rises ~3.2 m (19 risers, 5.7 m deep).
