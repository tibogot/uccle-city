# Joins round 2 + terrain edges (claude/joins2, 2026-11-15)

Owner: "a path in a forest with saw-tooth edges makes it look very cheap"; nothing may float, gap or stair-step where
things meet the ground. Every change is behind a switch (dev panel, viewer/features.js). Images: docs/joins2/
(`<view>_before.jpg` / `<view>_after.jpg`, same camera, `?hour=15&day=200`, cameras in debug/joinsShots.js `VIEWS`).

## 1. Terrain texture edges + the saw-tooth along paths

**Two causes.**

1. *Geometry (the main saw-tooth).* Park / forest paths are measured UrbIS roadway surfaces (Wolvendael, Kauwberg: "Parc
   de Wolvendael", hier T). On a slope the terrain weld (`viewer/heightmap.js weld`) raised every grid cell beside a
   surface to the HIGHEST edge cell within 4 m (a flat 1.5 m shoulder). Along a climbing or cross-tilted path the highest
   edge cell stands grade x 1.5 m over the edge next to the cell, so 1 m terrain triangles drew OVER the path in a
   staircase of teeth (f4-air_before.jpg). Measured: `tools/joins2/buried.mjs` samples every near-flat surface triangle
   near its corners / edge midpoints against the terrain as meshed.
2. *Texture.* The land-cover mask (woods, OSM paths, playground sand, water) was a 1 m coverage raster, bilinear: every
   diagonal edge a stair / diamond pattern, 1.6 m gravel paths wobbly and blurred (g6-path_before, monolithes-air_before:
   the playground path on the left).

**Fixes.**

- `?groundweld=old` = before. The weld banks each cell on its NEAREST edge cell; then `heightmap.js clampUnder` holds every
  grid vertex of a cell a near-flat surface triangle touches UNDER it (y <= surface - 1.2 cm + 0.1 x distance; vertices
  under a surface take only the triangles over them; within 1.5 cells; never a drop > 1.2 m: roads through tunnels / under
  embankments keep their earth). A short bank one cell out, like a path cut into a slope.
- `?surfh=old` = before. The measured streets' 6 m height-field corners (`surfaces.js fitCorner`, a weighted plane fit)
  stay within 0.6 m of the street ground they were fitted to: on a narrow path the plane's cross slope is ill-conditioned
  and stood the Kauwberg path 3 m up in a "W" (d7-path_before / _after).
- `?groundsdf=old` = before. The land cover is baked in the tile worker as SIGNED DISTANCE FIELDS (`landcover.js coverSDF`):
  woods / sand / water from the canvas coverage through a sub-pixel EDT (Felzenszwalb; Mapbox TinySDF's edge handling),
  paths as the exact distance to their polylines minus the half width; +-4 m packed in 8 bits, the tile edge padded with
  its border (no fade at the seams). The shaders (`ground.js coverWeights`, textured and procedural ground) turn it into
  weights with an edge band shifted by noise already sampled (3 m / 11 m cells), anti-aliased by fwidth; the textured
  ground's existing height blend breaks the band up. Same single mask sample per pixel. References: Green 2007
  (alpha-tested magnification), Unreal / Unity / Godot height-blended splats (we already had the height blend; the
  weights were the problem).

**Counts** (`node --import ./tools/road_audit/register.mjs tools/joins2/cityScan.mjs`, all 120 tiles; `JOINS2_OLD=1` = this
round's worker changes off): see section 6.

**Cost.** Worker: land cover +~75 ms / tile (node), weld + clamp +~70 ms / tile, off the main thread. GPU (F4, interleaved
A/B in one page, `debug/gpuAB.js alternate`, machine RED: 2 GB free, owner's Chrome open): 15.85 -> 15.93 ms, +0.07 ms,
inside the noise.

## 2. Sidewalks to the facade (`?sidewalkfill=0` = none)

Cause: UrbIS sidewalks end at the property line; facades often stand 0.2-1.5 m behind it and the bare terrain showed
(Place Saint-Job, 1175, 549: stjob-gap_before). Fix (`surfaces.js`, after the skirts): along every raised outer edge a ray
every 0.5 m outward (`tileData.js wallRayOf`: footprint edges in a 4 m bucket grid); a wall within 1.8 m with no street
surface between -> the paving carries on to the wall and 15 cm into it, at the edge's height, same kerb paving frame.
Counted per tile in `road.surfaceStats.sidewalkFill` (gapLen = metres of edge with such a gap, len = metres filled).

## 3. Basements in tall downhill plinths (`?cellar=0` = before)

Cause: under the ground-floor line the wall shader painted blue stone, but its window grid ran on below the line: storey
-1 / -2 windows half buried or cut by the ground (cellar-*_before). Fix: `facadeGeom.js cellarOf` -> `aCel` per face =
the wall exposed under the line where the drawn ground is highest along the face foot. In `facades.js`: a row under the
line stands only if its window clears that ground by 0.3 m; such faces become a LOWER-GROUND FLOOR (the wall material
under a 35 cm blue-stone band, the grid's windows); otherwise, with >= 1.5 m of plinth, a barred SOUPIRAIL with a
blue-stone surround and sill under every bay but the door. The kit's own soupirail piece (0 .. 0.55 m over the line) does
not overlap. Same storeys (storeyK) as the rest of the face. Faces: see section 6.

## 4. Small fixes

| | cause | fix | switch |
|---|---|---|---|
| signs in the Dix Monolithes island | street-kit rule signs (C43) placed from the road graph inside the round island | signs inside a public-art island (models/publicart/site.json island.r) move out along the radius to the rim, foot height carried | `?artsigns=old` |
| tram wire a thick grey bar near the camera | 2.4 cm ribbon, flat-lit | 12 mm (r 6 mm), normal turning across the ribbon (lit round), still >= ~1 px with alpha | `?wire2=0` |
| dark smudges on zebras | paint wear = round 0.6 m patches down to bare asphalt | wear in streaks along the traffic, coverage never below 45 % | `?zebrawear=old` |
| near-black band along kerb faces | blue-stone kerb albedo 8 % | 14 % (weathered petit granit) | `?kerbtone=old` |
| snow: holes under benches, jagged cut round shelters | furniture baked as SOLID ground for the snow layer: its top = the layer's base, the cliff cut a hole | furniture2 / street kit / stops / street furniture / lamps / tram poles baked as SHELTER: thinner snow under them, no hole (snow-stop_*) | `?snowfurn=old` |

## 5. Tools

- `tools/joins2/buried.mjs [TILES] [--old] [--json f]`: terrain over surfaces (> 2 cm / 10 / 25 cm) and surfaces > 50 cm over
  the terrain, per tile; `probe.mjs T x z` (the triangles + grid round a point), `seams.mjs A B` (border vertices of two
  neighbour tiles), `pin.mjs`, `cityScan.mjs` (all tiles); `JOINS2_OLD=1` in tools/roadfix/tile.mjs.
- `debug/joinsShots.js`: `go(view, { noTrees })` parks the camera (trees can be hidden for ground audits from the air).

## 6. Results

See the end of this file (filled from docs/joins2/cityscan_before.json / cityscan_after.json).

### Numbers (all 120 tiles, node, `tools/joins2/cityScan.mjs`; before = `JOINS2_OLD=1`)

| | before | after |
|---|---|---|
| surface samples with the terrain drawn over them (> 2 cm) | 358,513 / 22.4 M | **23,601** (-93 %) |
| ... > 10 cm | 88,025 | 10,498 |
| ... > 25 cm (left: mostly roads under structures, the 1.2 m clamp limit) | 29,851 | 8,774 |
| surface samples > 50 cm over the terrain | 11,241 | 12,730 (+13 %: open, see left) |
| sidewalk edge with a facade 0.05-1.8 m behind over bare terrain | 7,326 m | 2,148 m (5,178 m filled; the rest isolated 0.5 m samples) |
| faces with a 1.5 m+ plinth: soupiraux / lower-ground floor | plain stone (+ half-buried rows) | 3,059 faces, 820 of them lower-ground floors |
| worker time, land cover / weld+clamp, sum over 120 tiles | 1.2 s / 4.7 s | 7.0 s / 10.0 s (+48 / +44 ms per tile, in the worker) |

Ground fit scan (`tools/groundfit/scan.mjs F4 I6 D7 E4 J7`): unchanged (doors > 15 cm 319 / 319, floating feet 6 / 6).
Contact audit in the city (`viewer.contactAudit("roads:T")`): floating items F4 1870 -> 1769, E3 2177 -> 2122, F3 2470 ->
2108, G3 1727 -> 1781; floating length +8-12 % (F4 3098 -> 3390 m, G3 3125 -> 3503 m): the items are capped at 0.3 m and
under the skirts; not yet explained (the nearest-edge weld leaves a cell next to a road AND a raised sidewalk on the
lower one). Tile seams (`seams.mjs`): unchanged (F4|G4 > 5 cm 23 -> 27, I6|I7 68 -> 68; the seams were already open
before this round: worst 0.98 m at I6|I7 (1432, 1000)).

## 7. Left

- surfaces > 50 cm over the terrain +13 % and the contact audit's floating length +8-12 %: look at a few (F4 -160, -267)
  and decide nearest vs highest edge per surface class (a sidewalk edge next to a road).
- tile seams open up to ~1 m (pre-existing): the terrain border vertices of two tiles differ after each tile's carve /
  weld; needs the neighbour's surfaces near the edge.
- the OSM footway's gravel stroke beside a measured park path draws a pale fringe beside the asphalt (f4-air_after):
  drop the path channel where a measured surface covers the line.
- Kauwberg D7: the measured path ends at the hollow way and the gravel line runs down into it (d7-path_after).
- the facade cellar overlay and the wire / paint changes are ALU only, not measured (RED all session); the land-cover
  A/B +0.07 ms is within noise: re-measure all on GREEN.
- night lights / interior pilot know nothing of the hidden storey -1 rows (they never placed them: the CPU grid starts at
  floor 0) and nothing of the soupiraux.
- snow under parked cars still cut (cars stay solids: their caps rely on it).
