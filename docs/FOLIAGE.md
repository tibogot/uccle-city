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
`cards.js`, coverage-preserving mips) tilted out of the surface; they shrink into the body between 14 and 24 m, so
no alpha far away. Species: privet, beech (keeps brown leaves in winter), hornbeam (half), laurel, box. One merged
body mesh + one instanced card mesh per species (2 draws). Bodies cast shadows; cards do not.

## 4. Blender plants (`tools/blender/plants.py` -> `models/foliage/plants.glb`, `plants.js`)

Blender 5.0 headless `--factory-startup`, ~13 s. Box ball (shell + 900 leaves), cherry laurel, rhododendron
(trusses), mophead hydrangea (florets in layered balls), bush rose (5-leaflet leaves, cupped blooms), lavender clump
(spikes), spring bulbs (tulips + daffodils), zonal geranium; a scripted far shell for each shrub. Named slots (leaf,
leaf_mass, stem, flower_a, flower_b, flower_centre), UV0 metres, Cycles AO in UV1.x, per-leaf random in UV1.y, the
part's base + kind in UV2 / UV3 (the exporter writes v as 1-v: `plants.js` undoes it for the data channels).

Runtime: per type, one compute pass picks each instance's LOD (frustum + distance) into 3 indirect draws:
LOD0 the model to 11 m, LOD1 **leaf thinning** (keep 40 % of leaves / florets by their own random, grown
1/sqrt(.4) about their base; stems through meshoptimizer 1.5 cm) to 28 m, LOD2 the far shell to 65 m; 2 m
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

## 7. Measurements

See §8 of `docs/FOLIAGE_RESUME.md` for the raw numbers; the summary is filled in below once measured.
