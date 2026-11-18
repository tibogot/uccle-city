# Foliage / planting kit (`viewer/foliage/`) and the Foliage Lab

Branch `claude/foliage` (from `claude/foundation`), lab only: nothing in the city changed. Research:
`docs/FOLIAGE_RESEARCH.md`. Lab: `labs/foliage-lab.html` (`?scene=street|garden`, `?view=`, `?time=`, `?w=&h=`).

## 1. What is in the lab

| Scene | What |
|---|---|
| `street` (default) | Tile D8, the villa streets east of the railway (x -1240..-1000, z 1660..1900): UrbIS DTM 1 m, UrbIS street surfaces (ground colour), UrbIS building solids, gardens from the orthophoto's green on private land, 47 hedge runs (654 m) along the garden fronts, 430 shrubs / bed plants, GPU grass. The perf scene. |
| `garden` | A 48 x 48 m test bed: mowed lawn (with daisies), long verge, meadow with wildflowers, a gravel path, a bed between two box edgings with one plant of every type, hedges of every species, a lawn with 14 shrubs. |

Panel (own `viewer/panelUI.js`): view, light preset, post chain; **Season** (month slider 1-12.99, spring /
summer / autumn / winter buttons, snow amount for the weather lab); **Wind** (speed m/s, direction, gustiness,
freeze); **Grass and ground fields** (each layer on/off, density, min blade px, tint layers = shows the bands);
**Measure** (GPU benchmark with alternating on/off rounds, flicker test). `window.lab` exposes everything
(`lab.bench(rounds, views)`, `lab.runFlicker(move)`, `lab.strip(path, opts)`).

## 2. Ground fields: grass, wildflowers, litter (`grass.js`)

- A compute pass per layer walks a **stable world grid** around the camera (one candidate per cell, jittered by a
  hash of the integer cell), reads the foliage mask (R cover, G kind 0 lawn / .5 verge / 1 meadow, B flowers,
  A litter receptivity), the ground height (same triangles as the drawn ground: no floating), and appends the
  survivors to a buffer feeding an **indirect draw**. Same cell = same blade whatever the camera does.
- **Density by distance without popping**: keep while `r < p(d)`; height x `smoothstep(0, .12, p - r)` so blades
  grow out of / sink into the ground; survivors widen 1/sqrt(p) (capped); a **pixel floor** on blade width (0.8 px)
  so far blades never become sub-pixel crawlers.
- Layers: `near` 7 cm grid to 14 m (fade 6-14), `main` 17 cm grid to 46 m (fade 22-46), `flowers` 32 cm grid to
  40 m, `litter` 16 cm grid to 26 m. Blades: 5 / 4 segments, curved lean (rest lean + wind + pushers), view-space
  widening when edge-on (GoT), rounded normals leaned 55 % to up, root AO, back-light translucency.
- **The far hand-over**: the ground under grass takes `grassGroundColor()`: the blades' own average colour (the same
  `grassAlbedo()` function, same world noise), darker near the camera (the thatch between blades), converging over
  the main layer's fade band. From the sky (camera higher above the ground than a layer's far radius) the layer is
  hidden and its compute skipped on the CPU (one comparison).
- Kinds: lawn 7.5 cm, verge 32 cm, meadow 48 cm (x the season's growth); wildflowers (buttercup, oxeye daisy,
  clover, cornflower, poppy) on verge / meadow, daisies / dandelions on lawns.
- Trample: `grassU.push[0..3]` = (x, y, z, radius) pushers (feet, wheels): blades lean away and flatten.

## 3. Hedges (`hedges.js`, procedural JS)

Per polyline: smoothed, resampled every 0.4 m, a clipped section swept along it (battered sides, rounded top
corners), lumps of 1.5-5 cm by species, rounded ends + caps, UV0 in metres. Leaf-mass shading from the shared noise
in UV metres (clumps, leaves, dark crevices, bump normals). **Leaf-spray cards** (code-drawn per species,
`cards.js`, coverage-preserving mips) tilted out of the surface; they shrink into the body between 10 and 18 m (30 % fewer than first built), so
no alpha far away. Species: privet, beech (keeps brown leaves in winter), hornbeam (half), laurel, box. One merged
body mesh + one instanced card mesh per species (2 draws). Bodies cast shadows; cards do not.

## 4. Blender plants (`tools/blender/plants.py` -> `models/foliage/plants.glb`, `plants.js`)

Blender 5.0 headless `--factory-startup`, ~13 s. Box ball (shell + 900 leaves), cherry laurel, rhododendron
(trusses), mophead hydrangea (florets in layered balls), bush rose (5-leaflet leaves, cupped blooms), lavender clump
(spikes), spring bulbs (tulips + daffodils), zonal geranium; a scripted far shell for each shrub. Named slots (leaf,
leaf_mass, stem, flower_a, flower_b, flower_centre), UV0 metres, Cycles AO in UV1.x, per-leaf random in UV1.y, the
part's base + kind in UV2 / UV3 (the exporter writes v as 1-v: `plants.js` undoes it for the data channels).

Runtime: per type, one compute pass picks each instance's LOD (frustum + distance) into 3 indirect draws:
LOD0 the model to 7 m, LOD1 **leaf thinning** (keep 40 % of leaves / florets by their own random, grown
1/sqrt(.4) about their base; stems through meshoptimizer 1.5 cm) to 16 m, LOD2 the far shell to 65 m; 2 m
complementary screen-IGN dither bands at each hand-over and at the end. All slots of a plant in one geometry +
one material (slot id per vertex): 3 draws per type. Seasons: deciduous leaves shrink to their base by the leaf
amount (each its own threshold), flowers by the species' bloom, hydrangea heads brown in winter, bulbs only in
spring, lavender greys out of bloom.

Plant triangles (LOD0 / LOD1 / LOD2): box ball 5,214 / 2,742 / 80, laurel 7,654 / 6,502 / 80, rhododendron
19,626 / 10,854 / 80, hydrangea 17,282 / 8,492 / 80, rose 5,392 / 3,010 / 80, lavender 5,880 / 2,064 / 80,
bulbs 1,188 / 170, geranium 3,132 / 814.

## 5. Placement (`placement.js`) — data vs rules

`MaskBuilder` paints the mask from polygons / polylines (canvas, per channel); `frontGardens(tile, mb)` = private
land (not a UrbIS street surface, not a UrbIS building) x the orthophoto's green (G above R and B), plus OSM areas
(meadow, grass, park, wood / scrub = litter); `hedgeRuns(tile, mb, gardens)` walks every UrbIS street edge every
0.5 m and keeps the stretches with front garden 0.8-1.4 m behind them, one decision per run (78 % hedge; privet 34 %,
beech 26 %, box 16 %, laurel 16 %, hornbeam 8 %), set 0.45 m inside the garden; `scatterPlants` = a jittered 1.6 m
grid on front-garden cover: beds within 2.2 m of a wall (hydrangea, rose, lavender, box, bulbs), an occasional shrub
on the lawn. **Data:** where gardens, streets and buildings are. **Rules (seeded by world position):** species and
which runs get a hedge (no Uccle plant inventory exists; OSM has 6 `barrier=hedge` in the whole area).
Deterministic: the same tile always grows the same garden.

## 6. Seasons hook (`seasons.js`) and wind (`wind.js`)

`season.month` (1-12.99) -> uniforms by a mid-month table (grass root / tip colours, dryness, growth, leaf amount,
autumn colouring, beech hold, bloom of bulbs / rose / lavender / hydrangea / geranium / wild / daisy, litter),
plus `season.snow` / `season.wet` for the weather lab (`season.apply()` after changes). `wind.speed`,
`wind.direction`, `wind.gust`, `wind.update(dt)`, `windAt(xz)` (TSL) are read by grass, flowers, hedges' cards
and plants.

## 7. Measurements (2026-11-11)

**Noise warning:** every number below was taken while two other agents' labs ran in the same Chrome (a Pedestrian
Lab with 300-450 people, a Weather Lab). Timestamps step in ~0.065 ms. Re-measure on a quiet machine.

GPU, 1280 x 720, pixel ratio 1, midday, post chain on, 4x MSAA; median of alternating rounds (0.5 s settle,
1.3-1.5 s sample), whole frame (render + compute timestamps); street scene (654 m of hedges, 430 plants, grass):

| View | none | all foliage | delta | grass | plants | hedges |
|---|---|---|---|---|---|---|
| street level | 2.43 | 2.82 | **+0.39** | +0.00 | +0.07 | +0.13 |
| down the street | 2.43 | 2.69 | **+0.26** | +0.13 | +0.13 | +0.20 |
| front gardens close | 2.43 | 2.75 | **+0.33** | +0.07 | +0.20 | +0.20 |
| from the sky (300 m) | 1.64 | 1.70 | **+0.07** | 0 | +0.07 | +0.07 |

Budget (<= 0.8 ms at street level, ~0 from the sky): met in this run. Before batching every foliage dispatch into ONE
compute pass (12 separate passes: 4 grass layers + 8 plant types) the same views cost +0.8 / +1.25 / +1.5 / +0.13:
the per-pass overhead was most of it. Culling grass candidates before any memory read and skipping idle layers
(litter in summer, flowers in winter) also landed in that round. CPU: the foliage's per-frame JS (uniform writes +
one compute call) reads 0.18-0.21 ms in the lab's EMA read-out, which includes the WebGPU command encoding of the
dispatches; no per-instance CPU work. The lab's "compute" read-out (0.8-1.1 ms) disagrees with the on/off delta; I
trust the alternating on/off delta (the compute timestamp likely spans queue gaps).

**Flicker test** (`lab.runFlicker("strafe")`, 24 frames, 4 mm / frame, front gardens view): foliage off 129 ppm,
foliage on 2,615 ppm with plant LOD0 to 11 m / LOD1 to 28 m, **1,887 ppm** after LOD0 to 7 m / LOD1 to 16 m. Left:
one thinned-leaf shrub at ~12 m and the far edge of a garden's grass (20-30 m). Images: `foliage/flicker_strafe_front_gardens.png`
(before), `foliage/flicker_strafe_front_gardens_v2.png` (after).

**Moving strip** (`foliage/strip_garden_walk_bands.png`): a 30 m walk along the verge / meadow, layers tinted: the
near and main bands hand over with no line and no pop; the far grass merges into the ground colour.

**Mesh audit** (tools/mesh_audit from `claude/stalle` 076ce46, per plant node, `--skip-checks leak`:
`foliage/audit_summary.txt`): far shells 0 blocking; box ball 1, rose 2, hydrangea 9, geranium 17, lavender 26,
bulbs 36, laurel 40, rhododendron 117 (petals / leaves crossing or coplanar at 1-3 mm). NOT yet 0. The `leak`
check is skipped for foliage: it casts rays with back faces culled, and every plant material is double-sided by
design (open leaf / petal sheets); with it the counts were 13-478 per plant. Flat normals on all leaves / petals /
stems (streak and flipped went from 1,402 / 97 to 0) and parallel-transported stem frames fixed the real topology
issues.

Images: `foliage/street_level_july.png`, `foliage/garden_hedges_january.png` (beech hedge holding its brown leaves).

## 8. Round 2 (coordinator review, 2026-11-11 evening)

**Front-garden scene** (`?scene=front`, `labs/foliage-front.js`): three terraced houses drawn with the city's own
façade material (`viewer/facades.js` `wallMaterial`, imported read-only, on quads carrying its `aWall / aBld / aFN`
attributes; the window grid is recomputed in JS to place the window boxes and cut the ivy round the openings); a low
brick wall + coping + gate on the street line, gravel path, lawns, privet / laurel / beech hedges, box edging,
beds, box balls, a rhododendron, ivy, window boxes of geraniums, 30 cm concrete sidewalk tiles, kerb, asphalt.
Images: `foliage/front_from_sidewalk_july.png`, `foliage/front_facade_ivy_boxes.png`,
`foliage/front_across_street_june.png` / `..._january.png` (beech hedge brown, window boxes empty, ivy evergreen).
NOT done: side-by-sides with online photos of Uccle front gardens (look-only); no time left.

**Ivy** (`viewer/foliage/ivy.js`): grown on a wall plane (roots, up-pull + wander + branching, cut back round windows),
stems as ribbons, ivy leaf-spray cards (coverage mips, a2c) shrinking 12-22 m into a **mantle** (a quad whose alpha
is the ivy's blurred coverage with coverage-preserving mips): stable from afar. **Window boxes**
(`viewer/foliage/windowBoxes.js`): painted / terracotta planters with brackets and soil, geraniums from the plants
system (explicit y).

**Hedges v2**: denser swept shell (rings every 33 cm, section points every 16 cm) displaced by world-space 3D value
noise (bulges ~0.6 m, clumps ~0.2 m, roughness), cards standing out 42 % of their size (they break the top and
sides), more on the top corners, holes into a dark interior in the body shader, lighter species colours.
654 m of hedges in D8: 105,752 triangles, 30,714 cards.

**Grass v2**: tufts (~0.3 m) and clumps (~1.2 m) shared by blades and ground; a textured far ground (mipmapped
grain for lawns, streaks for long grass); lawn 9 cm, stronger clump height; far blades converge 85 % to the field
colour between 6 and 26 m; mown-lawn blades hand over 1.45x sooner, lawn daisies 2.6x; pixel floor 1.1 px; flower
heads floored at ~1.2 px.

**Plants v2**: mesh audit **0 blocking on every plant and far shell** (`foliage/audit_summary.txt`; checked at the
LOD's real draw distance, `leak` skipped because every plant material is double-sided by design: open leaf / petal
sheets). How: a disc-overlap test when placing each leaf / petal (turned and retried, else dropped), alternating
petal whorls (3 mm, 0.36 rad), stems keep clear of each other, children start on the parent's surface, then an exact
BVH pass in Blender removes any part that still crosses or lies within 1.5 mm of another at < 16 deg (rhododendron
127 parts, rose 26, geranium 19, ...). Caveat: LOD1 (leaf thinning, grown 1/sqrt(.4)) is made in JS and is not
audited. Crown normals by distance (no light / dark flipping of tiny flat leaves), LODs 6 / 12 / 65 m, far shells 320
tris with bloom patches. **Packed** (`tools/foliage_pack.mjs`: meshopt compression, octahedral normals, uint16
AO): plants.glb **7.22 MB -> 1.82 MB** (no textures in it: every card texture is drawn in code at load).

**Flicker** (strafe, 24 frames, D8 "front gardens close"; foliage off = 129-141 ppm):
2,615 (round 1) -> 1,887 (LOD 7/16) -> 1,620 (look pass) -> 818 (LOD 6/12, flowers thinned) -> 489 (lawn hands
over sooner) -> **404 ppm** (blade convergence); orbit 399 vs 128 off. Front scene from across the street:
124 ppm vs 20 off. Heat maps `foliage/flicker_strafe_front_gardens_v3..v5.png`. What is left: the lawn at 10-20 m
(blade tips) and roof edges (baseline).

**GPU** (VERY noisy: another agent's Pedestrian Lab with 300 people and a Weather Lab ran in the same Chrome; the
lab's own fps read 30 at times): D8 street level +0.33, down the street +0.66, front gardens close +0.52, sky +0.07
ms (6 alternating rounds); front scene from the sidewalk +1.64, façade view +1.44, down the street +0.92 ms (5
rounds; the close views draw several LOD0 plants of 12-15k triangles, 12 geraniums, dense near grass and close hedge
cards). Per-part runs in this state were not additive (grass alone > all), so trust none of them to better than
+-0.4 ms; re-measure on a quiet machine. The front scene is a close-up worst case, not the street budget.

## 9. Polish (2026-11-11, late)

**Ivy grows like ivy** (`viewer/foliage/ivy.js` `growIvy`; the lab's ivy wall is now the whole main façade, 8.3 m, with
the same three roots). The old ivy grew straight up and died at every window: tall columns between the windows. Now:
- the colony is a **mound over each root** (height 72-100 % of `maxHeight`, lateral spread 0.42-0.64 x `reach`), its
  top ragged by two sines; it decides how far the ivy spreads, not the wall's edge;
- stems climb with an up-pull (main stems 0.3, side shoots 0.12), branch often (5-7.5 % per 4 cm step, up to 320),
  side shoots start sideways, and every stem is **pushed away from what is already covered** (a 6 cm density grid);
  a stem stops when the wall there is full;
- at a window (or the envelope) a stem **deflects** (turns 40 / 75 / 110 deg, the emptier side first) instead of
  dying, so the ivy hugs the frames, fills the spandrels and goes over lintels and under sills;
- leaves: **patchy** (a 0.8 m / 0.3 m value noise: thin places where the brick shows), **thinning to a ragged margin**
  near the envelope (0.9 m band), at most 2 sprays per 6 cm cell, none more than 6 cm inside an opening; cards still
  overhang the frames a little ("wrapping");
- **trailing stems** (up to 40): from the top edge (30-100 cm) and over window heads (8-22 cm), standing off the wall
  as they hang, with a few sprays;
- the **mantle** coverage is painted smaller (8 cm discs, was 11) so the cards cover it near, and the openings are
  cleared from it (the far mass never covers glass).
Front scene: 2,792 leaf cards (was 3,756), 16.4k stem triangles. Images: `foliage/polish_ivy_before.png`,
`polish_ivy_after.png`, `polish_ivy_close_after.png`.

**Hedge body holes** (`hedges.js`): were the 1-3 cm leaf noise dipping (dotty close up). Now fewer, bigger, softer gaps
from a 40 cm / 12 cm noise (dark core + soft rim), the edge widened by the noise's own footprint, the share converging
to its mean (7 %) as the texel footprint grows (the procedural form of coverage-preserving mips); leaf crevice contrast
a little lower (0.62-1.12, was 0.5-1.15). Gotcha: the first try put the hole mask (which contains `fwidth`) into the
bump height: differentiated twice, it flickered (front view 241 -> 1,036 ppm); the bump now takes a smooth
hole depth. Images: `foliage/polish_hedge_close_before.png` / `_after.png` (1 m from the privet).

**Flicker** (strafe, 24 frames; before -> after): front scene "façade, ivy, window boxes" (4 mm steps) **241 -> 261 ppm**
(run-to-run noise; the clusters are the hedge tops and cards, the ivy shows none:
`polish_flicker_facade_before.png` / `_after.png`); hedge close-up at 1 m (0.6 mm steps) **5,648 -> 5,563 ppm**
(clusters: the bed plants' leaves against the sky and the hedge top at grazing angles).

Weak (polish): where the ivy is sparse at its edge the mantle shows as flat dark blobs at 1-2 m; no aerial roots /
adventitious rootlets; the ivy on the façade is still one plane (no wrap onto the reveal / round the corner); hedge
tops at grazing angles still sparkle (leaf noise, unchanged); no mesh audit for the ivy (procedural ribbons + cards).


## 10. City (branch `claude/plants`, 2026-11-15): plants, beds, window boxes, ivy ON by default

Switches: `?plants=0` (all of it), `?ivy=0`, `?windowboxes=0`, `?hedgemip=old` (the garden hedges' old leaf grain);
rows in `viewer/features.js` (dev panel, section World / City).

### What is in the city and where it comes from

| kind | count (120 tiles) | placement data | rules (seeded by world position) |
|---|---|---|---|
| shrubs (box ball, laurel, rhododendron, hydrangea, rose, lavender) | 89,225 plants in all | the LiDAR canopy height model (UrbIS DSM - DTM 2021, 0.5 m): 0.35-3.2 m over the orthophoto's green = a real shrub mass, outside tree crowns (features.json trees), filled blob by blob at ~its own size | species by measured height and zone; scale = measured height / model height (rose / lavender <= 1.15) |
| bed plants (hydrangea, rose, lavender, box, spring bulbs, rhododendron) | (in the 89 k) | front-garden ground within 1.6 m of a façade, green, low CHM; squares / islands where green and low | 45 % of fronts get a façade bed; squares 50 % / islands 30 % of green blobs |
| mulch beds | 5,638 | the bed blobs above (PCA strips <= 4 m), plus one under every shrub blob on a square / island | a plant on a paved square or island stands in a bed or not at all; no bed without plants |
| shrub rows behind railings | (in the 89 k) | the front-garden kit's railings (data/gardens) | 30 % of the runs, 0.55 m behind the bars |
| window boxes + geraniums | 393 boxes / 1,419 geraniums on the 7 tiles round I6 | the façade kit's own sills (B.kit `sill`: the windows the city draws) | maisons de maître 30 % of houses, other kit fronts 9 %; floors 0-2; 60 % / 85 % of the house's windows |
| ivy | 6,166 walls (792 blind, 4,089 side / back, 1,285 fronts) incl. 1,891 garden-wall pieces; 2,328 railing climbers | the façade analysis (analyseBuildings + faceOpenings: the painted / kit windows are cut out), the gardens kit's brick walls >= 0.7 m and railings | blind wall 15 %, side 4.5 %, street front 2.5 % (old types 5 %), garden wall runs 25 %, railings 10 % |

Zones (`tools/plants/build_plants.py`): front (private land within 16 m of a UrbIS street surface), park (OSM park /
garden / cemetery), square (UrbIS class 4, green), island (class 6, green), scrub (OSM natural=scrub). Railway land
(OSM rail +- 8 m), the gardens kit's walls / hedges / pillars, tree trunks and footprints are kept clear. Split:
front 75,851, park 10,623, island 991, square 638, scrub 1,122. Data: `data/plants/<T>.json` (3 MB) +
`<T>.ivy.json` (wall descriptors only, 2.8 MB: the ivy is GROWN in a worker at load, `viewer/plants/ivyWorker.js` ->
`viewer/foliage/ivyGrow.js`, the lab's growth extracted to pure JS; the lab's `ivy.js` now uses it too).
Build: `venv python tools/plants/build_plants.py --all --raw <main checkout>/data/raw` (~2 min), `node
tools/plants/build_ivy.mjs --all` (~1 min).

### How it is drawn (`viewer/plants/`)

- `cityPlants.js`: one StreamPool per plant type x 3 LODs (viewer/instanceStream.js: 50 m cells, time-sliced gathers,
  static buffers + update ranges, never DynamicDrawUsage, count-0 meshes hidden), ONE material per LOD for all 8
  types (`plantMaterial.js`, per-type constants in uniform arrays) so `mergeStreamPools` makes ONE multi-draw object
  per LOD; beds 1 draw, window boxes 2. LOD0 the Blender model to 4 m; LOD1 = leaf thinning to 30 % (the lab's
  `thinLeaves`, exported) PLUS a dark inner crown (the far shell shrunk 24 %: the thinned crown shows foliage through
  its gaps, not the street) to 9-11 m; LOD2 the far shell with lumps (radial noise displacement: no egg outline) and a
  fragment leaf grain, to 45-90 m by size; per-pixel dithered hand-overs and tile fade. No shadow casting.
- Vertex buffers: the GLB's uv1 / uv2 / uv3 / slot repacked into `pdat` + `pbase` (WebGPU allows 8 vertex buffers
  with the instance columns; the first city run failed pipeline validation with 9).
- `cityIvy.js`: two pools (leaf cards with the lab's ivy coverage-mip texture + alpha to coverage; stem ribbons to
  12 m). City density: one 40 cm spray per 13 cm cell (the lab: two 24 cm per 6 cm, ~6x the overdraw). Far: density
  by distance (kept while r < p(d), p 1 -> 0.3 between 14 and 45 m, survivors grown 1/sqrt(p)), dithered out 60-75 m.
- `plantKit.js`: the mulch bed is a unit SUPERELLIPSE mound (48 outline points, smooth at any length / width: no
  saw-tooth) with an 18 cm skirt; the grass bake takes the same outlines as solids (`cityGrass.addTile extraSolids`),
  so the grass stops at the bed's own smooth edge. Window box: procedural planter (lip, soil, brackets), 6 paints.
- Ground: plants and beds on the DRAWN ground (main.js `treeGround`: the measured squares / medians' lift); a plant
  sinks 4 cm; a bed is a plane fit raised over the ground's bumps, dropped where the ground bends > 14 cm.
  JOINS (`__plants.contact(tile, ground)`): 0 floating plants, 0 floating beds on I6 H5 I5 J5 H6.
- Season: the city's day (`viewer/seasons/season.js`) now drives the foliage season month (plants AND the gardens'
  hedges: beech brown in winter, hydrangea heads, bulbs in spring, geraniums cut back in winter; rhododendron and
  laurel bloom tables of their own). Snow: up-facing crown whitening (season.uSnow) + snow caps on box / laurel /
  rhododendron / hydrangea shells (`cityCaps.js`, family "hedge"); wet: `wxMat` on every plant / bed / box / ivy material.

### Lab weak spots

- **Dotty hedges up close** (fixed): the gardens hedge's leaf noise used `bias(1.5)` also when MAGNIFIED, so 1-2 m from
  a hedge the leaves were the coarse mip's texels sharpened into square dots. Now the level = the footprint's own +
  1.5, clamped at 0 (`?hedgemip=old` = before).
- **Ivy columns** (fixed): the city ivy is grown with the lab's mound / spread / deflection rules
  (`plants/after_ivy_wall_july.jpg`).
- **Saw-tooth beds** (fixed): superellipse beds + the same outline in the grass bake.
- **Lawn tips 10-20 m**: NOT addressed (the city grass is `viewer/grass/`, another system).

### Cost (GPU p50 deltas, A/B alternated in one page: plants + ivy hidden / shown, 1600 x 828)

Preflight RED for most of the session (another agent's city on the same GPU; 1.6 GB free): those runs swung +-4 ms
and are discarded. One YELLOW run (CPU 16 %, 4.9 GB free, tab in front), 5 rounds:

| view | off | on | delta (min .. max) |
|---|---|---|---|
| street level, Avenue Alphonse XIII | 12.03 | 12.53 | +0.50 (-1.18 .. +1.18) |
| front garden close (1452, 716) | 10.49 | 11.42 | +0.93 (+0.06 .. +1.44) |
| ivy wall at 12 m (7.4 k cards) | 8.54 | 9.51 | +0.97 (+0.33 .. +1.25) |
| from the sky (160 m) | 7.69 | 7.72 | +0.03 |

After it the LOD bands were tightened (LOD0 4 m, LOD1 9-11 m at 30 %) and the ivy thinned (13 cm cells, stems to 12 m):
front-close plant triangles 292 k -> 234 k, ivy-wall cards 7.4 k -> 6.1 k; not re-measured (the tab could not stay in
front: another Chrome user). **The <= 0.3 ms street-level target is NOT shown met: re-measure on GREEN.**
Draws: plants 1-3 merged objects + beds 1 + boxes 2 + ivy 2. Streaming: max slice 0.6 ms (plants), 1.0 ms (ivy,
on teleports). CPU per frame: the streamers' update + a season check every 60 frames.

### Images (`docs/plants/`; before = `?plants=0`, same cameras, midday)

`before_` / `after_` villa_front_july, villa_street_july, terrace_boxes_july, park_july (Observatory grounds),
island_july (Chaussée de Saint-Job), square_july (Place Saint-Job), ivy_wall_july; seasons `after_villa_front_october`
/ `_snow`, `after_island_october` / `_snow`, `after_ivy_wall_snow`; `after_sky_july` (nothing drawn from 160 m).

Street View (look only, 56 Avenue Alphonse XIII, 04/2019): a 1.2 m clipped hedge on the line, then a CONTINUOUS
2-3 m shrub mass behind it, ivy up a tree trunk. The city draws the hedge and separate shrubs on the lawn: villa
gardens read too open ("ball garden"; the CHM is capped at 3.2 m, taller masses count as trees).

### Weak spots

- villa gardens: isolated round shrubs instead of continuous 2-4 m masses; far shells still blob-like at 15-30 m;
  LOD1 + inner crown a little dark; the rose LOD0 is lanky close up; visible dither at the 4 m hand-over
- squares: a mulch strip on cobbles is not a real planter (no kerb / raised edge); snow: a bed's rim reads as a slab
- ivy: one plane per face (no wrap round corners); behind an annex it emerges at the roof line; 285 k stem pieces on 7
  tiles (~18 MB of instance data); nothing beyond 75 m
- window boxes only where the façade kit draws (none with `?kit=0` or on painted fronts)
- GPU cost not measured on GREEN; no flicker test on the city views

## 11. Bushes as tree foliage (branch `claude/bushes`, 2026-11-18; `?bushes=old` = section 10's shrubs)

Owner playtest 2026-11-18: "green balls that fade out weirdly when I come close; use the trees' foliage technique,
bushes are foliage without trunks".

**Cause of the fade.** The shrubs' LOD hand-overs were at 4 m (Blender model -> 30 % of its leaves + a dark inner
shell) and 9-11 m (-> an 80-triangle lumpy shell), each a per-PIXEL dither cross-fade (by the pixel's own distance)
between two different models. The chase / walk cameras keep the nearby bushes inside those bands: each one drew half
one model and half the other, which the TAA history averages into a see-through ghost, and every bush past ~10 m was
the 80-triangle ball. Rule: no LOD dither / fade of a bush inside 30 m; the LOD switch is a morph (the same pixels on
both sides). Check: `tools/audit/bushGate.mjs` (merge gate row `bushes`).

**Now** (`viewer/plants/bushes.js`, `viewer/treesStylized.js` makeTreePool, `viewer/plants/cityPlants.js`):
- the shrub types (box ball, laurel, rhododendron, hydrangea, rose, lavender) are crowns of the street trees' leaf
  cards without a trunk: 6 shapes (round-fine, round, wide, low, tall, tall-loose: rings of clumps on a mound profile,
  a top clump, a core), built by the vendor's own builder (`createStylizedTrees` with `bushShape`), so the same leaf
  mask, clump domes, baked occlusion (darker at the base and under other clumps), sun shadows on the cards, light
  through the leaves; each type picks among its shapes per position and has its own colour on the trees' palette
  (`BUSH_TYPES` tint: box / laurel darker, lavender grey). Bulbs and window-box geraniums stay the Blender models.
- drawn as extra PARTS of the trees' city-wide multi-draw sets (LOD 0 and 1): 0 more draws, the trees' depth
  pre-pass; LOD 0 -> 1 at the trees' 40 m with their card morph (LOD 1's dropped cards shrink away from 26 m); each
  bush dithers out at its own far end (50-95 m by type and size, over its last 20 %). `treeSlot` = slot + 128 x kind +
  1024 x end (kind 0 = a tree: unchanged).
- wind: the foliage wind (`viewer/foliage/wind.js`, as the hedges / grass) leans the crown and flutters the cards,
  with motion vectors (bushes only: an `If` on the kind, the trees untouched).
- ground: the foot on the lowest drawn ground under the footprint, sunk 6 % of the height; the lowest ring's cards
  reach below the foot. Sun shadows cast to 32 m (dithered out 24-32 m, shadow pass only).
- triangles per bush: LOD 0 118-184, LOD 1 52-70 (old: 5-20 k / 2-11 k / 80). Gate: worst 25 m-grid view on all
  tiles 69 k bush triangles (F5; old there 150 k).
- lost vs the old shrubs (follow-ups if wanted): flower colours / seasonal blooms and deciduous leaf loss (the trees
  have none either), the shells' snow caps (the cards' crown-top snow instead).

### Browser turn (2026-11-18)

- Boot (`?quick=1&place=stjob-street`): 0 console errors with the new bushes and with `?bushes=old`; trees unchanged.
- JOINS: `__plants.contact(tile)` (the tile's own drawn ground by default now) on I6 / I5 / H5 / H6: 4,463 bushes, 0 floating.
- Approach 40 -> 12 -> 4 m to the Place Saint-Job bed (`docs/bushes/approach_*`): no dissolve at any distance (the old
  shot at 4 m: `approach_4m_old.png`). The approach / garden shots are BEFORE the tune below (lighter, smaller cards).
- Tune after the tour: cards ~25 % larger, LOD 1 a card more per clump (fuller crowns, the old shells' mass), the
  type tints darker (the first run read light yellow-green next to the trees). `docs/bushes/tour_*.png`: baseline | new | diff.
- Perf (preflight RED: CPU throttled, GPU 52 % busy before start, other agents' headless jobs: INDICATIVE only), GPU p50
  ms / draws, old (2 loads) vs new (2 loads), quick boot round Saint-Job:
  | view | old | new |
  |---|---|---|
  | street (stjob-street) | 4.85 / 5.51 ms, 90-94 draws | 4.19 / 4.46 ms, 90-91 draws |
  | front garden (712, 418) 5 m up | 5.44 / 6.03 ms, 116-119 | 4.26 / 5.70 ms, 114-117 |
  | sky 160 m | 5.37 / 5.18 ms, 114-118 | 4.52 / 4.92 ms, 115-117 |
  Plant triangles drawn: street 113 k -> 71 k, garden 288 k -> 26 k (+ bush cards 22 k in the trees' pool). Draws:
  the shrubs' 2-3 merged plant objects gone (bulbs / geraniums: 0-2), the bushes in the trees' views: <= old.
- Tour vs `.tour/foundation`: 12 of 22 flagged. From the merges (expected): wolvendael-park, coghen-blocks,
  brugmann-maisons, stjob-station, lycee-front, stpierre-parvis. From the bushes (the diff boxes sit on bushes only):
  stjob-shops, ham-terrace, orange-villas, defre-villas, waterloo-fortjaco, cortenbosch-lane: the old dark balls
  replaced by the leaf-card shrubs (airier, a lighter green than the old shells even after the tune).

### Round 2 (coordinator's defect eye, 2026-11-18)

- **Too sparse** -> CLIPPED shapes for box (`clipped-ball`) and laurel (`clipped-tall`): an inner ring of clumps
  inside the outer one, bigger cards (0.9-0.95 of a clump), a darker inside (aoFloor 0.18, aoOverhead 0.78), a rounder
  crown normal; the informal types (rhododendron, hydrangea, rose, lavender) keep the loose shapes. Per-shape budget
  now 260 / 130 triangles (clipped-ball 226 / 126, clipped-tall 232 / 116).
- **Beds planted edge to edge** -> `bushes.js fillBed`: every drawn mulch bed filled on a grid at 0.7 x the crown's
  width with its own shrubs' type and median height (its shrubs replaced), the outer crowns ~25 % of their width over
  the rim; a bed holding only bulbs is left; an empty one gets a low type. Data-wide: 5,332 beds, 26,674 bushes,
  crowns over 96 % of a bed on average (gate row `beds`).
- **Yellow-white tips** -> the bushes' light through the leaves + fill x 0.55 (`BUSH_GLOW`) and the type tints with
  less red (the trees' top colour lit by the low sun read lime on the bushes).
- Contact: 5,473 bushes on I6 / I5 / H5 / H6, 0 floating. Gate: worst 25 m-grid view 88 k bush triangles (E1, many
  filled beds; old there 15 k), worst old view 391 k (new there 22 k).
- Perf (preflight RED as before: INDICATIVE), GPU p50 ms / draws, one load each:
  | view | old | new (round 2) |
  |---|---|---|
  | street | 5.51 / 94 | 5.24 / 93 |
  | front garden | 5.83 / 115 | 5.37 / 114 |
  | Place Saint-Job bed at 4 m | 6.03 / 128 | 5.90 / 129 |
  | sky 160 m (no bushes drawn) | 5.18 / 114 | 5.31 / 115 |
- Tour (the 6 bush views again, `.tour/bushes3`): all six still flag, on bushes only; stjob-shops = the Place
  Saint-Job bed now planted; defre-villas = a lone informal shrub that reads smaller and airier than the old dark ball.
  Shots: `docs/bushes/round2_*`.
