# Our grass (`viewer/grass/`) and the Grass Lab

Branch `claude/grass` (from claude/foundation 743c9f2), 2026-11-13. Lab: `labs/grass-lab.html` (`?scene=garden|park|verge`,
`?time=golden|midday|night|...`, `?preset=low|medium|high|ultra`, `?day=1..365`, `?grass=0`, `?cam=x,y,z,tx,ty,tz`).
In the city: **`?grass=1` (default OFF**, the owner decides), `?grasspreset=`.

## 1. What it is

Grass blades grow on the city's real lawns, parks, verges and meadows near the camera and sink into the textured
ground (docs/materials/GROUND.md) with distance. Each frame a single compute pass picks the blades. They are drawn
in 3 indirect draws. The CPU only writes a few uniforms (0.1-0.2 ms a frame, measured in the lab).

| File | What |
|---|---|
| `viewer/grass/grassTypes.js` | per tile, a 1 m raster of grass TYPES from real data (density, length, dryness, flowers) |
| `viewer/grass/grassField.js` | the FIELD: a top-down render around the camera of the city's own terrain, street meshes and buildings (height + type + "may grass grow here") |
| `viewer/grass/grass.js` | the system: compute (culling, thinning, LOD, per-blade shape / wind / push / colour), 3 LOD meshes, material, presets, seasons |
| `viewer/grass/grassPush.js` | the PUSH FIELD (car wheels, walker, falcon landing lay the grass down; it stands back up) |
| `viewer/grass/cityGrass.js` | the city hook (`?grass=1`) |
| `tools/grass/build_osm_grass.mjs` -> `data/grass/osm_grass.json` | OSM kinds the tile features fold away: 78 meadows, grassland, heath, 13 village greens, pitch surface + sport |
| `labs/grass-lab.html/.js` | the lab: real tiles (D8, F4, C8) with the city's terrain, textured ground, measured streets, UrbIS buildings, trees, lamps, light, post chain |

## 2. What came from where

- **alezen9/revo-realms (MIT), read only, no code copied:** the engine room: a compute pass per frame with GPU frustum
  culling, LOD by distance into indirect draws (Revo: 6/4/2 segments, ours: 5/3/1), stochastic thinning with
  distance, clumps, camera-following zone. Revo puts all LODs in one list with `firstInstance` offsets, which needs
  the WebGPU feature "indirect-first-instance". **Ours does not need it:** one data buffer with a region per LOD and
  one draw-argument buffer with a byte offset per LOD (`geometry.setIndirect(args, offset)`). That is 3 storage
  buffers in the compute stage; WebGPU's default limit is 8, and a first try with 16 was refused.
- **game-engine-v1 Hybrid grass (`hybridGrassSystem.js`), read only, nothing copied into vendor/:**
  - per-blade work done ONCE in compute (height, facing, clump, wind, push), not per vertex;
  - Voronoi clumps over 3x3 cells: facing, lean, height and shade per clump;
  - the view-thicken turn for edge-on blades;
  - lighting normals that are mostly "up", so the field reads like the ground it fades into;
  - the far colour converging to the ground's colour;
  - root AO and hue / saturation / dry variation.

  From the Revo port (`revoGrassSystem.js`): a painted density used as a probability, and the push-field idea.
- **Our earlier Foliage Lab grass (`viewer/foliage/grass.js`, still used by the foliage lab):**
  - the stateless world grid: the same cell always gives the same blade, deterministic, no swimming;
  - grow / sink with distance;
  - a pixel floor on blade width;
  - the shared wind field (`viewer/foliage/wind.js`, imported).
- **Ours (new):**
  - **Thinning by level.** Candidates sit in 4.5 cm cells. A cell's level is how many times both of its indices
    divide by 2 (capped at 3). A level-k blade jitters inside its 2^k block and gets a rank in [4^-(k+1), 4^-k).
    It is kept while the density p(d) = min(1, (d0/d)^2) is above its rank.
    - As p falls, the finest level goes first, so the blades that stay are always evenly spread (a jittered quadtree:
      no clumps or holes from random thinning).
    - The count per pixel stays about constant.
    - Each level has its own dispatch, over the box of cells its distances can reach.
    - Blades grow out of the ground (`smoothstep(0, .35, 1 - r/p)`) and widen 1/sqrt(p) (capped 2.6x).
  - **Dispatch box from the view sector.** The CPU limits each level's dispatch to the axis-aligned box around the
    camera's horizontal view sector (plus 3 m around the camera; the full square when looking down): about 4x
    fewer threads.
  - **A rank pre-test before any memory read**, against the most generous type (a meadow's d0).
  - **The FIELD (the top-down render of the real drawn geometry):** see §4.
  - The Uccle TYPES from data: see §3.
  - **Blades lit through toward the sun.** The face normal turns toward the sun, not the camera, so a backlit lawn
    glows instead of reading as black stubble (`garden_D8_golden_backlit_on.jpeg`).
  - A dithered LOD hand-over (each blade's LOD distance x 0.85-1.15).
  - The blade colour taken from the textured ground's own mean colours (lawn / rough / dry scans, ground.json) and
    its noise taps. Up close the blades vary around that colour; far away they converge to it, so the last blades
    sinking into the ground change the picture little.

## 3. Types (data first)

`grassTypes.js` paints, per tile (500 x 500 px at 1 m), density / length / dry / flowers:

| Where (data) | Type | Blade height |
|---|---|---|
| default: private gardens, unmapped green | mown lawn (length 0.06) | 5-8 cm |
| OSM `garden`; pitch with surface=grass, or no surface and soccer / football / rugby | mown (0.04 / 0) | 5-7 cm |
| OSM `park`, `village_green` (Wolvendael) | park grass (0.28-0.3), clumpy | 10-16 cm |
| OSM `landuse=grass` (public greens, roundabouts, embankments) | 0.42, a little dry | 16-22 cm |
| terrain within 1.7 m of a measured carriageway / parking (UrbIS surfaces.json), not across a sidewalk | **roadside verge** (0.62), dry 0.55 | 25-35 cm |
| traffic islands / medians (the road mesh's "grass" part) | mown verge (0.22) | ~10 cm |
| OSM meadow (`landuse=meadow`, 78 in Uccle), `natural=grassland` / `heath`, orchard | **meadow with wildflowers** (0.75-1) | 35-55 cm |
| OSM `scrub`, the soft edge of a wood (land-cover mask R) | long rough (0.8) | ~40 cm |
| under LiDAR / OSM tree crowns (crown radius) | density x 0.45, fewer flowers | |
| pitch: tennis clay, hockey turf, asphalt, sand ...; playground sand, paths, water, steep banks, inside woods | **no grass** | |

On top of that, the bake reads the textured ground's own noise (ground.js `noiseTex`, same taps and formulas):
- its "rough" patches make the grass longer;
- its "dry" patches thin it out and dry it;
- its worn spots leave bare soil.

So the blades follow the scans under them.
Flowers: 5 % of a meadow's blades carry a head (buttercup yellow, oxeye white, clover pink, knapweed purple).

## 4. Clean edges, exact heights: the FIELD

`grassField.js` renders, top-down and orthographic, a 128 m window around the camera into a 1024² RGBA32F target
(12.5 cm texels, 16 MB). It uses proxy meshes that share the city's own geometry buffers:
1. **Grass surfaces, depth tested:** each tile's terrain mesh and the street's grass islands. Output R = the drawn
   surface's height, G = pack(density, flowers), B = pack(length, dry), A = 1.
2. **Solids, with no depth test:** every other road part (carriageway, sidewalks, kerbs, squares, tree pits),
   every building, and a disc per tree trunk. Output A = 0.

So grass never grows on a road, sidewalk, square, path or water, nor inside a building or a trunk. It stops at the
real outline of the kerb and the wall (`garden_D8_midday_on.jpeg`: lawn to the wall foot; the verge strip: lawn to
the paving edge). Blades stand on the drawn triangles: the compute's own bilinear filter weights the height by A, so a
blade by a kerb never takes the kerb's height (the JOINS rule: nothing floating, nothing through a surface).

The window centre snaps to the texel grid, so a world point always lands on the same texel centre and a re-bake
changes nothing under a blade. It re-bakes when the camera is more than 12 m from the centre or a tile comes or
goes: one render of a few dozen draws, every ~9 s on foot and ~1.5 s at 30 km/h. That is 30-36 ms of CPU, almost
all of it the first bake's shader build; the later ones are 1-3 ms (to re-measure). There were **0 synchronous
pipelines** after warm-up while driving in the lab and during a 41 s street-level flight across 3 newly streamed
tiles in the city (65 bakes).

## 5. Light, night, seasons, wind, push

- `MeshStandardNodeMaterial` (Lambert with `?grasslambert=1` and the low / medium presets), double sided, taking
  only the sun and the hemisphere light in the city (`lightsNode`):
  - the city's sun and sky;
  - **the sun's shadow map** (receives the shadows of trees and buildings; casts none);
  - the city's fog;
  - the **street-lamp light map** at night (`addLampLight`).

  It adds no light objects, so the light count stays fixed.
- Seasons, from `viewer/seasons/season.js` (`grass.syncSeason()`): drought in late July to August (more straw blades),
  an olive tint in winter, growth, and hoar frost on the tips when the month's mean is < 5 °C
  (`season_winter_20jan_frost.jpeg`, `season_summer_3aug_dry.jpeg`).
- Wind: the shared field (`viewer/foliage/wind.js`). The lean is computed per blade in compute; a 2-sine flutter is
  added per vertex. Long grass moves; lawns barely do.
- **Push field API:** `grass.push.set(i, { x, y, z, radius, strength, vx, vz, ground })` for up to 8 pushers a
  frame, and `grass.push.clear(i)`.
  - Storage: a 64 m toroidal buffer of 25 cm cells.
  - Blades lean away from a pusher (turned toward its motion) and flatten to 30 %, then recover with a 3.5 s time
    constant. A pusher more than 0.4 m above the ground does nothing.
  - The stamp pass is skipped entirely when nothing has pushed for 14 s.
  - The lab's drive puts the car's 4 wheels in. The city hook does not wire the car / walker / falcon yet (next step).

## 6. Budget and measurements

The rule: ≤ ~1 ms GPU at street level on the RTX 4050 Laptop, on a quiet machine. GPU ms are the renderer's
timestamps (render + compute), A/B in alternating rounds, 1280x720 at DPR 1.5 in the lab.

**Preflight** (`tools/perf/preflight.ps1`):
- **YELLOW** for the lab block below, with the lab frozen and the coordinator's tab parked (GPU load at rest 0 %,
  64 °C, no limit active; free memory 2.1 GB: memory FAIL line, Chrome 5.8 GB).
- RED at other times: the coordinator's city tab was rendering (GPU busy 21-57 % at rest). Those numbers are
  marked "(noisy)" below.

Final grid (4.5 cm cells), lab, Standard material, all lights (lab), YELLOW, coordinator's tab parked:

| Scene (lab) | Preset | Blades drawn (LOD0 / 1 / 2) | GPU grass on - off (pairs) |
|---|---|---|---|
| Wolvendael lawn F4, golden, standing | high | 16.9k / 32.3k / 13.5k | **+0.59 ms** (0.59-0.92) |
| Wolvendael lawn F4 | low | 7.7k / 7.7k / 0.3k | **+0.26 ms** (0.00-0.46) |
| Front gardens D8, golden, standing | ultra / high / medium / low | 59k / 47k / 28k / 13k in all | +0.66 / **+0.20** / +0.13 / +0.20 ms (noisy pairs, -0.5..+1.3) |
| Rue Zandbeek verge C8, parked car | high | 4.8k / 18.3k / 3.9k | **+0.20 ms** (-0.07-0.39) |
| Rue Zandbeek, driving 30 km/h | high | 0 / 2.4k / 1.3k | +0.07 ms (-0.33-0.46) |

City `?grass=1`, D8 lawn at 1.6 m (Rue des Griottes, 9 full tiles + far ring, 1280x720), `debug/gpuAB.js alternate`,
6 rounds:

| City variant | Blades | GPU grass on - off |
|---|---|---|
| Standard, all lights; coordinator's tab rendering (RED) | 54.5k | +0.41 ms (-0.85..+1.57), +1.24 ms (0.92..2.16): noisy, not counted |
| Standard, all the city's lights (its lamp light pool too), tab parked | 54.5k | +0.81 ms (0.46..1.18) |
| Standard, **sun + hemisphere only** (`lightsNode`), tab parked | 54.5k | +0.78 ms (0.39..1.37); a later, steadier run: **+0.47 ms (0.40..0.53)** |
| Lambert, sun + hemisphere (`?grasslambert=1`, presets low / medium) | 54.5k | **+0.43 ms** (0.13..0.66) |

**Within the ~1 ms budget at street level.** The cost is the blade fragments: compute on its own is within noise
(the "compute only" mode equals "off"). In the city most of it comes from the lights every fragment evaluates. The
blades now take only the sun and the sky (`lights([sun, hemi])`); at night the lamp light map lights them.
Lambert is ~45 % cheaper but loses the grazing specular that makes a lawn glow into a low sun (black stubble
backlit), so Standard stays the default for high / ultra.

0 synchronous pipelines in the lab drive (68 at the lab's warm-up), and 0 during a 41 s city flight at street level
across 3 newly streamed tiles (65 field bakes). Field re-bake: ~0.7 ms CPU after the first (31-36 ms with its shader
build).

Presets (`?preset=`, `grass.setPreset()`: uniforms only, no shader rebuild; the buffer caps are fixed at
construction): `low` (density 0.55, reach 0.6, 28 m), `medium` (0.8, 0.8, 38 m), `high` (1, 1, 48 m, default),
`ultra` (1, reach 1.1, full-density radius x 1.3). Without the WebGPU backend (WebGL2 fallback): no grass, the
textured ground alone (`Grass.supported()`). The WebGPU feature "indirect-first-instance" is not needed.

Shimmer: the flicker test (sub-pixel strafe, 24 frames, `flicker_garden_strafe_heat.jpeg`) shows **1,013-1,114 ppm**
blinking with grass, against 286 without. The blinks are single pixels at blade tips, the far lawn's edge against
a wall's foot and a shadow edge; there are no bands. At 2 cm/frame (walking speed) any thin-blade field changes
most pixels (227k ppm, against the textured ground's own 93k), so that number says nothing about popping.
Moving strips (`strip_park_walk.jpeg` at 5 km/h, `strip_verge_drive.jpeg` at 30 km/h; 0.2-0.25 s apart) show no
pops, bands or changes in density between frames.

Memory:
- field: 16 MB + 4 MB depth;
- blade buffers: 22 MB (350k blades x 64 B, preset high);
- push field: 1 MB;
- type rasters: 1 MB per tile.

Download: 13 KB (osm_grass.json); the city fetches each tile's surfaces.json once more for the verges (~0.4 MB).

## 7. Images (`docs/grass/`)

| File | What |
|---|---|
| `garden_D8_midday_on.jpeg` / `_off.jpeg` | front-garden lawn, D8, midday, grass on / off (the textured ground alone) |
| `garden_D8_golden_backlit_on.jpeg` | the same lawn into the golden-hour sun: lit-through blades, the tree's shadow |
| `garden_D8_night_on.jpeg` | night (lamp pools on the street; the lawn dark) |
| `park_F4_golden_on.jpeg` / `_off.jpeg` | Wolvendael lawns, golden hour |
| `park_F4_lod_tint.jpeg` | the three LODs tinted (red 5 segments < ~7 m, green 3 < ~18 m, blue 1 beyond) |
| `season_winter_20jan_frost.jpeg`, `season_summer_3aug_dry.jpeg` | the season hook |
| `strip_park_walk.jpeg`, `strip_verge_drive.jpeg` | moving frame strips |
| `flicker_garden_strafe_heat.jpeg` | shimmer heat map |
| `city_D8_grass1.jpeg` / `city_D8_grass0.jpeg` | the city with `?grass=1` / without (D8, Rue des Griottes; the `_grass0` shot was taken with the Lambert test build, no difference without grass) |

## 8. What's left

- A re-measure on a fresh machine (preflight GREEN: free memory stayed at 2-3 GB, YELLOW at best): the lab x presets, the city from a car and at golden hour / night.
- City: wire the pushers (`driver` wheels, `walker` feet, the falcon landing).
- Move `grassTypeData` (38 ms per tile on the main thread) and the surfaces.json fetch into the tile worker.
- Landmark models (Saint-Job, the Observatory, ...) are not yet solids in the field (the UrbIS solid they replace is
  hidden): grass can grow under their floors (unseen) and at their outer foot.
- A real translucency term needs the shadow factor (an emissive glow would also glow in shade); the sun-facing
  normal gives most of it.
- Flowers are blade-tip heads; proper flower meshes (the foliage lab's) would read better in meadows close up.
- Verges are found by distance to the carriageway: a garden directly behind a carriageway with no mapped sidewalk
  reads as a verge.
- The night: the lamp light map lights blades like the ground, but blades are not darker in the pools' shadows.
