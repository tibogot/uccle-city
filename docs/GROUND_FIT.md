# Ground fit: houses sunk into the ground, blocky ground (owner asks #13 / #14)

Branch `claude/groundfit`, 2026-11-14. Switch: **`?groundfit=old`** = everything as before (the façades' ground-floor
line at the lowest DTM point, the walls' feet as UrbIS has them, the fixed terrain diagonal). Default: on.

## 1. The scan (city-wide, measured, not by luck)

`tools/groundfit/scan.mjs` builds every one of the 120 tiles in node exactly as the tile worker does
(`tools/roadfix/tile.mjs` = `buildTileData` with the city's flags) and checks every UrbIS building (25,357) against the
ground **as drawn**: the terrain grid after carve / weld / rail / ponds (`hm.y`) and, on top of it, the measured street
surfaces the road stage draws (sidewalks, kerbs, squares: the highest near-flat road triangle, `viewer/groundFit.js
surfaceTop`). Per building, on the same wall faces the city paints / kits (`facadeGeom.js analyseBuildings`):

| metric | what |
|---|---|
| door | drawn ground 0.35 m in front of the front door (the widest street face's door bay, `faceOpenings`, max over the door's width) minus the door's threshold (the ground-floor line). > 0 = the pavement cuts across the door. Doors whose bay opens into another building are not counted. |
| front | the highest drawn ground along the street faces minus the ground-floor line (plinth 0.5 m, ground-floor sills 0.92 m) |
| lift | the ground-floor line over the ground in front of the door (a door in the air) |
| float | the largest gap between a wall's bottom edge and the drawn ground 0.35 m outside it (JOINS rule); gaps over 2.5 m are passages / overhangs and not counted |

```
node --import ./tools/road_audit/register.mjs tools/groundfit/scan.mjs [TILES...] [--old] [--out file.json]
```

Also: `tools/groundfit/trench.mjs` (terrain right at a wall vs 2.5 m out), `creases.mjs` (terrain slope breaks by origin:
weld bank / carve / DTM), `folds.mjs` (terrain cell folds, see 4), `cost.mjs` (worker ms old vs new, collider hashes).

## 2. Causes

**(a) Sunk houses: one cause, city-wide.** `pipeline/build_buildings.py` sets each building's `base` = the **lowest**
DTM point around its footprint (ring + centroid). Every door, the plinth, the window storeys (`viewer/facades.js`), the
façade kit (`viewer/facadeKit/placement.js`) and the shopfronts' floors stand on that line. Uccle is hilly: across a
footprint the DTM varies by 1.41 m (median, H5; p90 2.95 m, p99 5.4 m). Every house whose street is on its uphill side
had the pavement across its door and ground-floor windows: **8,798 of 25,357 buildings (35 %) had the ground > 15 cm
over the front door's threshold, 2,671 more than 1 m** (whole ground floors under the pavement, balconies at pavement
level: shots 1, 2, 6). The UrbIS 3D solids themselves are fine (their walls run ~1 m into the ground, p50 -1.03 m under
`base`); the drawn terrain and the measured sidewalks are fine; only the ground-floor line was wrong. (The street-life
shopfronts already took their floor from the pavement, `tools/streetlife/build_streetlife.py floor_y`: they disagreed
with the painted façade behind them.)

**(a') Floating walls (JOINS).** Where the drawn ground is lower than the solid's foot (small sheds and garages on banks,
street surfaces drawn lower than the DTM, carves) a wall's bottom edge stood over the ground: 2,622 buildings with a gap
> 5 cm (final check; shot: a garage on a bank, `blocky1` "before").

**(b) Blocky.** Looked for city-wide with numbers, then by eye (aerial 60-180 m, eye level, 15 views):
- terrain tile seams: **exact** (213 shared edges, max difference 0.00 m: the round-3 rebuild fixed them);
- road weld banks: few and mild (I6: 8 cells raised > 0.8 m); carve cuts off the streets: mostly the rail cutting;
- **the terrain triangulation**: every 1 m cell was split along the same diagonal (b-c). Where a bank, a garden step or
  a kerb shoulder runs diagonally across the grid, half of the cells fold ACROSS the slope and the bank's edge
  zig-zags cell by cell (the saw-tooth). Measured: see 4.
- DTM steps: 80,838 steps > 1 m between neighbouring 1 m cells city-wide; the ones off streets and buildings are real
  relief in the UrbIS DTM (garden terraces, ramps, light wells: e.g. I6 (1275, 948) drops 86.7 -> 84.4 m in 2 m, the
  0.5 m source shows the same). Left as measured (not smoothed: they are real).
- what else reads blocky and is NOT ground (listed, not touched here): the tree crowns' hard alpha cards at mid
  distance, the clouds at street level (docs/perf/AUDIT_PLAN.md 2.7), the far "lite" tiles' flat-coloured LoD2 boxes
  beyond the loaded ring, car bodies close up (TODO).

## 3. Fixes (at the source: the tile worker, no data rebuilt)

All in the worker (`viewer/tileData.js` -> `viewer/groundFit.js`, `viewer/facadeGeom.js`), behind `entry.groundFit`
(`?groundfit=old`). `buildings.json` / `buildings.bin` / terrain are unchanged (no `?v=` stamp needed): the colliders,
the heightmap and everything that reads the raw `base` (drive colliders, walker prisms, falcon grids) are untouched.

1. **The ground-floor line from the drawn ground at the front door** (`groundFit.js fitBase`, called in
   `analyseBuildings` once the first pass knows the faces): base = the highest drawn ground across the front door's
   width (widest street face, the door bay the shader / kit use) + 3 cm sill. A building with no street face (a villa
   in its garden, a back annex): the median drawn ground around its free walls. Clamped: at most eaves - 3 m (a storey
   with openings), never under the walls' own foot. The party heights move with it. Downhill sides then show a taller
   plinth / the soupiraux of a semi-basement, as real sloping-street houses do (shots 4, 6).
2. **Doors that cannot be used become windows.** The painted façade puts a door on EVERY street face; on a second
   street face along a slope (a corner house, a gable over a falling garden) that door stood in the air or in the
   ground. Now a painted door whose bay's ground is more than 25 cm off the ground-floor line is painted as a window
   (`streetA` in `facadeGeom.js`; 744 faces on I6). The kit's door steps read the drawn ground too (were the bare DTM).
3. **Wall feet down to the drawn ground** (`groundFit.js sinkFeet`, JOINS): every wall bottom edge (the lowest wall
   vertex at its x, z at both ends, less steep than 31 deg) is checked every 0.5 m against the drawn ground 0.35 m
   outside it (not inside another building); where the ground comes closer than 30 cm, the edge moves down parallel
   until it is 30 cm under the ground all along (vertices at one spot move together: no crack at a corner). Edges more
   than 2.5 m up (a passage, a wall on something else) are left. On the worker's own copy of `buildings.bin`, after
   the colliders and the roof grid read it.
4. **Terrain cells split along their flatter diagonal** (`tileData.js terrainArrays`): a crease follows the contour
   instead of crossing it. Triangle count per cell unchanged (the meshopt simplification afterwards drops 4-6 % MORE
   triangles: the surface is easier to simplify). The heightmap used for walking / placement is unchanged.

## 4. Numbers before / after (120 tiles, 25,357 buildings)

`tools/groundfit/scan.mjs` (`--old` = `?groundfit=old`), all 120 tiles:

| buildings with ... | before | after |
|---|---|---|
| drawn ground > 5 cm over the front door's threshold | 10,582 | 1,741 |
| > 15 cm (the door visibly cut) | **8,798** | **1,348** |
| > 0.5 m | 4,672 | 645 |
| > 1 m (ground floor under the ground) | **2,671** | **232** |
| street-face ground > 0.5 m over the ground-floor line (plinth) | 9,500 | 4,996 |
| street-face ground > 0.92 m (ground-floor sills) | 6,111 | 2,844 |
| front door > 0.5 m in the air | 173 | 1 |
| wall bottom edge > 5 cm over the drawn ground (JOINS; < 2.5 m) | **2,622** | **47** |
| ... > 30 cm | 2,303 | 41 |

(The early version of the float check counted differently, 3,626 / 447: it read the lowest face edge per 0.5 m and
caught walls standing on lower roofs; the final check uses exactly the edges `sinkFeet` handles.)

Terrain folds (`tools/groundfit/folds.mjs`, all 120 tiles, 30 M cells): twisted cells (|a + d - b - c| > 0.3 m)
290,367; of them folding ACROSS the slope (the saw-tooth): **147,169 before, 0 after**. Cells with a fold > 20 deg
330,330 -> 310,728, > 40 deg 53,361 -> 45,957 (the angle itself barely depends on the split; its direction does).
12.2 M cells (41 %, mostly near-flat) take the other diagonal.

## 5. Shots (same camera, `?groundfit=old` vs default), docs/groundfit/

| # | where | before | after |
|---|---|---|---|
| sunk 1 | H6 Rue Jean Benaets (959.8, 678.5) | whole ground floor under the pavement, the first-floor balcony on the pavement | door and kit plinth at the pavement |
| sunk 2 | E5 Rue de la Grasmus (-772.2, 20.1) | only the top of the ground-floor windows and a door's fanlight over the pavement | door, plinth, windows as on Street View |
| sunk 3 | G5 (116.7, 460.4) | a front-garden mound over the brick house's ground floor | door at the top of the garden |
| sunk 4 | H4 (669, -301.7) | the lawn up to the first-floor string course, half a door | door on the lawn, a plinth wedge on the downhill side |
| sunk 5 | I5 (1424.8, 147.8) | ground floor buried, only soupiraux | ground floor, door and windows at the lawn |
| sunk 6 | H5 Rue Copernic (996, 282) | doors cut by the lawn, a second door in the air | doors on the lawn; the off-ground door is a window; the white house's downhill semi-basement shows |
| blocky 1 | H5 garage on a bank (971.8, 88.1) | garage floating ~1 m over the bank (JOINS) | wall down into the bank |
| blocky 2 | H5 school (538, 245) | (terrain fold change hardly visible here) | |
| blocky 3 | H5 aerial (530, 240) | no visible difference at 60 m | |
| blocky 4 | I6 garden pit (1275, 948) | the DTM pit (real relief, left) | unchanged by design |

Honest: the diagonal fix is measurable (cross-slope folds 0 instead of half of the twisted cells) but its effect is
small on screen at these views; blocky 2-4 show no strong difference. The owner's "blocky" was not pinned down to a
ground cause beyond it (see 2b: foliage alpha, clouds, lite tiles, car bodies are other teams' items).

## 6. Real references (Street View: looked at, nothing traced or stored)

- **Rue de la Grasmus 31 (E5, sunk 2)**: Street View 2024: the front doors open at the pavement (one sill), a blue-stone
  plinth with cellar vents under the ground-floor window. Before: the pavement at the ground-floor sills (wrong).
  After: door at the pavement, plinth (matches).
- **Rue Jean Benaets 54 (H6, sunk 1)**: Street View 2024: garage doors and the entrance at pavement level, nothing
  sunk. Before: the whole ground floor under the pavement (wrong). After: at the pavement (matches; the façade style
  itself, a generic brick house vs the real modern block with garages, is a separate façade item).
- Real "below the street" houses exist (semi-basements, gardens below the road); the fit keeps them where the door
  ground would put the floor above the eaves - 3 m (232 doors still > 1 m under the ground after: mostly back annexes
  facing a higher street through a gap, and buildings on steep embankments, e.g. I6 Vieille rue du Moulin backs). Not
  checked one by one against Street View: see "left".

## 7. Cost

**Tile build (worker, node, `tools/groundfit/cost.mjs`, median of 3, shared busy machine: whole-tile times are noisy):**

| tile | build ms old -> new | new steps: ground fit / wall feet | terrain tris after meshopt | kit doors / steps |
|---|---|---|---|---|
| I6 | 4768 -> 4173 | 29 / 71 ms | 118,848 -> 114,096 | 287 -> 296 / 29 -> 3 |
| H5 | 3016 -> 3309 | 30 / 121 ms | 106,612 -> 100,150 | 99 -> 103 / 22 -> 0 |
| E5 | 7927 -> 5531 | 9 / 84 ms | 124,008 -> 116,830 | 321 -> 325 / 11 -> 1 |
| D9 | 2121 -> 2051 | 7 / 22 ms | 186,289 -> 172,559 | 50 -> 48 / 6 -> 0 |
| G10 | 1859 -> 3016 | 11 / 27 ms | 107,666 -> 102,664 | 41 -> 41 / 0 -> 2 |
| J7 | 6421 -> 5739 | 13 / 61 ms | 126,302 -> 115,836 | 146 -> 151 / 40 -> 2 |

The real added work is the two new steps: **+30 to +150 ms per tile** (the street-surface index + the per-edge ground
reads); the whole-tile differences above are noise (other processes). Full scan, 120 tiles: median buildTile 2304 ->
2458 ms (sequential runs, same noise).

**GPU:** no mesh, draw or material added. Terrain triangles 4-8 % FEWER (the flipped cells simplify better); wall
vertices +0-0.1 % (kit faces). Reference URL (`?ring=1&far=1&time=golden&traffic=0`), preflight YELLOW, another agent
rendering: the A/B is dominated by the other load (old 13.4 / 13.7 ms p50 with the other tab busy, new 8.06 / 8.00 ms
once it went idle, old again 13.7 / 14.3 with the coordinator's tab rendering), draws 330-370 / tris 4.3-5.1 M varying
with streaming state between loads. Nothing measurable from this change; a GREEN re-check is in "left".

## 8. Collisions

Drive colliders and the heightmap are byte-identical old vs new (hashes, `cost.mjs`): the drive / walk routes of the
city audit (debug/cityAudit.js, H5 + E5, walk on) gave the same results before / after: E5 drive 64 routes / 4.53 km,
0 invisible hits, 0 fell / stuck, blocked 41; walk 62 routes, 0 invisible hits, 2 floated / 2 stuck (same both); H5
drive 97 routes, 0 invisible hits; walk 96 routes, 1 floated (same both). The static drawn-vs-collider comparison moved
a little because drawn kit pieces moved (doors, steps, plinth runs at the new line): E5 invisible 1 -> 8 clusters
(4.4 -> 8.0 m2), missing 31 -> 37 (70 -> 77 m2); H5 invisible 6 -> 7 (1.4 -> 1.7 m2), missing 47 -> 49 (148 -> 150 m2).
Not diagnosed one by one. The falcon's roof grid gets the roof kit stamped as drawn (its pieces follow the new line).
The full 120-tile audit was not re-run (an hour of GPU on a shared machine; routes are identical by construction).

## 9. What is left

- 1,348 front doors still > 15 cm under the ground (232 > 1 m): clamped buildings (street above eaves - 3 m), doors
  facing a street through a gap between buildings, long façades on a slope (one ground-floor line for 30-80 m). A
  stepped ground floor per façade segment (or per UrbIS solid part) would fix the long ones.
- Street faces with the ground over the ground-floor sills: 6,111 -> 2,843 (long façades on slopes, corner houses).
- Downhill plinths can be tall (up to ~3 m): painted as the blue-stone plinth; a basement storey (brick, small windows,
  a plinth at the real ground) would read better on the tallest ones (needs the ground per wall in the shader).
- Door steps: base is now 3 cm over the pavement, so the kit's 1-3 steps (bel-étage stoops) are rarely placed; a hashed
  1-2 step rise on kit doors would add them back (with the painted façades on the same line).
- The DTM's own sharp relief (garden terraces, ramps) is real but drawn as grass slopes: retaining walls there would be
  the realistic fix.
- Float: 2,622 -> 47 buildings; the rest are walls whose outside is partly inside another building or edges near the
  2.5 m passage limit.
- GPU A/B on a GREEN machine (YELLOW / another agent rendering during this round).
