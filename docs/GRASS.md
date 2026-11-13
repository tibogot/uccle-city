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
| `labs/grass-lab.html/.js` | the lab: real tiles (D8, F4, C8, G7 `?scene=meadow`) with the city's terrain, textured ground, measured streets, UrbIS buildings, trees, lamps, light, post chain |

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
| OSM meadow (`landuse=meadow`, 78 in Uccle), `natural=grassland` / `heath`, orchard | **meadow with wildflowers and seed heads** (0.75-1, dry 0.15 / 0.25) | 35-55 cm, seed stalks +15 % |
| OSM `scrub`, the soft edge of a wood (land-cover mask R) | long rough (0.8) | ~40 cm |
| under LiDAR / OSM tree crowns (crown radius) | density x 0.45, fewer flowers | |
| pitch: tennis clay, hockey turf, asphalt, sand ...; playground sand, paths, water, steep banks, inside woods | **no grass** | |

On top of that, the bake reads the textured ground's own noise (ground.js `noiseTex`, same taps and formulas):
- its "rough" patches make the grass longer;
- its "dry" patches thin it out and dry it;
- its worn spots leave bare soil.

So the blades follow the scans under them.
Flowers: 2.5 % of a meadow's blades are a thin stem with a round 2-4 cm head (buttercup yellow, oxeye white, clover
pink, knapweed purple); 20 % of the long grass's blades carry a seed head (§8.1).

**Inside woods:** an OSM grass / meadow area drawn inside a wood polygon is a clearing (`landcover.js`, §8.4).

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
  - The lab's drive puts the car's 4 wheels in; in the city the car's wheels and the walker push (§8.6), the falcon not yet.

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
| `flicker_garden_strafe_heat.jpeg` | shimmer heat map (round 1) |
| `flicker_garden_low_before.jpeg` / `_after.jpeg` | shimmer heat map, garden low view, before / after round 2 |
| `meadow_G7_*.jpeg`, `city_G7_kauwberg_meadow.jpeg`, `city_G9_meadow.jpeg` | round 2: the meadows (§8) |
| `city_D8_grass1.jpeg` / `city_D8_grass0.jpeg` | the city with `?grass=1` / without (D8, Rue des Griottes; the `_grass0` shot was taken with the Lambert test build, no difference without grass) |

## 8. Round 2 (branch `claude/grass2`, 2026-11-13)

### 8.1 Fluffy meadows (`grass.js`)
Looked at game-engine-v1's off-road grass (`games/stylized-lab/cliffTopGrass.js` -> `v3/render/grass/revoGrassSystem.js`,
read only, nothing copied): what makes it read full is broad blades (7 cm x 1.1 m there), a strong dark-root to bright-tip
ramp, a big per-blade brightness scatter and a wind tint. Ours now (all per blade in compute or per vertex, no texture,
no alpha):
- **Broad long grass:** width = 5 mm + len^1.5 x 7.5 mm (`grassU.wideLong`): a meadow blade is ~1.25 cm (one blade
  stands for a tuft), a lawn's is unchanged. With the 1/sqrt(p) widening, the long grass's full-density radius dropped
  from 10 to 8.5 m (`D0_LONG`): -23 % meadow blades (125k -> 98k at G7) for the same cover.
- **Seed heads:** `grassU.seedHeads` (0.2) of the long-grass blades are a thin stalk 15 % above the leaves, leaning 30 %
  more (it nods), with a soft spindle over its top third, straw / green-straw / reddish brown, ripening with the drought.
- **Flowers:** a thin stem and a ROUND head of 2-4 cm (absolute, not the blade's width): the flower's rows crowd to the
  top (h' = 1 - (1 - h)^2.5) so its last rows make a small head; the head shrinks 60 % from 10 to 32 m (no confetti
  band). 2.5 % of a meadow's blades (was 5 %).
- **Wind sheen:** a gust front (the wind field's gust, packed in the blade data with the push crush) brightens bent long
  grass by up to `grassU.sheen` (22 %) toward the tip: waves you see crossing the meadow.
- Meadow / grassland types less straw-dry (0.15 / 0.25, were 0.3 / 0.4): green with straw, not hay.

Images: `meadow_G7_golden_before.jpeg` (round 1: thin blades, coloured-leaf flowers) / `meadow_G7_golden_after.jpeg`,
`meadow_G7_midday_after.jpeg`, `meadow_G7_closeup_midday.jpeg`; in the city `city_G7_kauwberg_meadow.jpeg`,
`city_G9_meadow.jpeg`.

### 8.2 Blade-tip shimmer
The blades ended in a POINT: the last rows went sub-pixel and blinked in and out under a sub-pixel move. Now:
- the blade strip ends in a **flat tip** (one more row; LOD2 is a quad, not a triangle);
- the **pixel floor is per row, in the vertex stage** (`minPixels` 1.0 x distance / pixel scale), not on the base width
  in compute: no row, tip included, is ever thinner than a pixel. The compute stores the true width.
- `?grasscov=1` (constructor option `coverage`) pays the added width back as MSAA coverage (alpha to coverage) plus a
  soft tip. **Off by default:** alpha to coverage turns the early depth test into a late one: +1.2 ms in the G7 meadow
  (A/B in one page load: +1.57 ms on every LOD vs +0.39 ms off; on LOD1-2 only still ~+1 ms) for ~15 % less shimmer
  than the floor alone. Free in the garden (+0.20 vs +0.26 ms).

Flicker test (lab, 1280x720, DPR 1, strafe 24 frames, step 0.0006, threshold 0.06; the same views before and after;
"off" = the same frame without grass; each "on" run twice, identical):

| View (lab) | Before | After (default) | After, `?grasscov=1` | Grass off |
|---|---|---|---|---|
| garden D8 home (golden) | 1,515 | **438** | 355 | 282 |
| garden D8 low, 1.0 m, toward the wall (`flicker_garden_low_before/_after.jpeg`) | 3,274 | **411** | 350 | 343 |
| garden D8 near, 1.65 m | 2,760 | **949** | 561 | 166 |
| meadow G7 home (golden) | 14,000 | **854** (1,123 before the 8.5 m radius) | 956 | 301 |
| meadow G7 near | 9,076 | **1,796** | 1,786 | 1,430 |

(Round 1's 1,013-1,114 ppm was another garden view; these views were measured before and after in this round.) What
still blinks in the garden is mostly the trees' leaf cards (the heat map's clusters) and the far lawn's 1 px tips.

### 8.3 GPU cost (lab, Standard material, golden, 1280x720, `lab.bench()`: 6 alternating on / off pairs)
Preflight **YELLOW** (power cap / SW thermal limit flagged, free memory 3.6 GB, GPU load at rest 5 %, the coordinator's
tab parked); the old and the new code measured back to back in the same window:

| Scene | Old (round 1) | New (round 2) |
|---|---|---|
| meadow G7, standing in it (125k / 98k blades) | +1.31 ms (1.11-2.16) | **+1.25 ms** (0.98-1.84) |
| garden D8 home | +0.26 ms (0.13-0.39) | **+0.19 / +0.46 ms** (two runs) |

The meadow costs no more than before for the fuller look; standing inside a meadow stays the worst case (> 1 ms: every
pixel below the horizon is blades). With the coordinator's tab rendering (RED) the same pairs read +2.0 / +2.6 ms.

### 8.4 The meadow under the woods (G7, `osm:w96769197`)
**What OSM says:** the Kauwberg is ONE `landuse=forest` + `leisure=nature_reserve` polygon (`osm:w16396691`, operator
Bruxelles Environnement) drawn round the whole reserve; its 4 meadows (`landuse=meadow`, `source=Bing`: w96769197 of
5.3 ha, w96823598, w96823599, w96823601, w96823602) are separate polygons inside it (49 of the G7 meadow's 50 nodes lie
inside the forest polygon). On the OSM map the meadow is drawn over the forest: a clearing.
**Why it showed forest floor:** `viewer/landcover.js` painted the wood (R) under everything inside the forest polygon;
the grass field grows no grass inside woods (R > 0.6) and the ground shows litter. The trees are real: 64 LiDAR crowns
(`urbis-chm`, 3-20 m, mostly 5-8 m bushes and hedgerow trees) inside its 5.3 ha; none are invented.
**Fix (the OSM rendering rule):** the more specific area wins: no wood (R) under a features area of kind `grass`
(landuse grass / meadow / village_green). 28 clearings in Uccle get their grass and ground back: the Kauwberg's meadows
(G6-H8), the Avijl (H6-H7), Keyenbempt (C6-C7), Verrewinkel (H9), Kinsendael (E8), the meadows inside wood relation
r10031575 (F8, G8-G9: the 2.8 ha one at x 320, z 2035 was round 1's test spot), the Sonian Forest edge (L6, L11, M11).

### 8.5 Verified links
Eye-level orbit views (a `?cam=` height <= 3 m now keeps the target at eye level, 8.6); `tile=` makes the boot tile the
one the camera stands on (the camera's ground comes from the boot tile's heightmap):
- **Kauwberg meadow** (G7): `viewer/index.html?grass=1&tile=G7&at=205,1095&cam=232,1062,1.7&view=stjob&time=golden`:
  counts [15570, 61399, 46008] (before the 8.5 m radius), `city_G7_kauwberg_meadow.jpeg`.
- **Meadow at G9** (round 1's test spot): `viewer/index.html?grass=1&tile=G9&at=352,2070&cam=320,2035,1.7&view=stjob&time=golden`:
  counts [13694, 64681, 46611], `city_G9_meadow.jpeg`.
- Walk mode (`view=walk`) lands on the nearest road: from the Kauwberg that is Avenue de la Chênaie in the wood.

**Round 1's G9 orbit test, [0, 0, 31170]:** not a grass bug. (1) The orbit target was 12 m up and OrbitControls' polar
limit (89 deg) lifted the 2.2 m camera to the target's height; (2) without `tile=G9` the camera's ground came from the
boot tile's (I6) heightmap; (3) the spot was a meadow under a wood polygon (8.4).

### 8.6 City hook and shared files
- `viewer/main.js` views.stjob: a `?cam=` height <= 3 m keeps the orbit target no higher than the camera (church links
  with a higher camera keep the +12 m target).
- **Types in the worker:** `tileData.js` builds the grass types raster when `entry.grass` (set by `main.js` when
  `?grass=1`): 40 ms in the worker instead of the main thread, from the surfaces.json the worker already fetches (the
  grass no longer fetches it a second time; with `?roads=engine` the roads still get none) and osm_grass.json fetched
  once per worker. The main thread keeps the old path when there is no worker.
- **Push:** `cityGrass.pushFrame`: the driver's 4 wheels (pushers 0-3, 0.4 m) and the walker (4, 0.32 m), a few uniform
  writes a frame, cleared once when they stop (`main.js` sets `cityGrass.pushers = { driver, walker }`).

## 9. What's left

- A re-measure on a fresh machine (preflight GREEN: free memory stayed at 2-3 GB, YELLOW at best): the lab x presets, the city from a car and at golden hour / night.
- City: the falcon landing and the third-person character as pushers (the car's wheels and the walker are done).
- Landmark models (Saint-Job, the Observatory, ...) are not yet solids in the field (the UrbIS solid they replace is
  hidden): grass can grow under their floors (unseen) and at their outer foot.
- A real translucency term needs the shadow factor (an emissive glow would also glow in shade); the sun-facing
  normal gives most of it.
- Flowers are round heads on a stem now; proper flower meshes (the foliage lab's) would read better close up. Seed heads
  are a spindle shape, not a real panicle.
- Standing inside a meadow costs ~1.25 ms GPU (over the ~1 ms budget): the next lever is fewer LOD1 blades in long
  grass (LOD1 = 48k of the 98k) or a shorter `lod1` for long grass.
- Alpha to coverage (`?grasscov=1`) would take the near-lawn shimmer from 949 to 561 ppm but costs a late depth test.
- Verges are found by distance to the carriageway: a garden directly behind a carriageway with no mapped sidewalk
  reads as a verge.
- The night: the lamp light map lights blades like the ground, but blades are not darker in the pools' shadows.

## 10. The Grass Field Lab (`labs/grass-field.html`, branch `claude/grass-field-lab`)

The city's grass alone on a gently rolling 600 m test field (a lab showcase ground, not Uccle data): the city's textured
ground (`ground.js`, land cover all grass, no orthophoto), the city's sky / sun / fog / post chain (`lighting.js`,
`post.js`), one `Grass` built as `cityGrass.js` builds it (sun + sky lights, the quality preset at construction). Loads in
~5 s. The field is one grass type, or a type with a patch of another (an edge, `mix`). Orbit, walk (WASD + drag, eye
1.7 m, Shift runs; the walker pushes the grass as in the city) and preset views (eye level, low grazing 35 cm, 20 m up,
backlit golden hour, the patch's edge). Read-out: fps, GPU ms (renderer timestamps, render + compute), blades per LOD,
compute threads, field bakes.

**Live vs rebuild.** Everything is live (uniforms) except:
- type values, field type, patch: the types raster is repainted and the field re-baked (a few ms, no shader build);
- `hills x`: the ground mesh is rebuilt (instant);
- quality preset: reloads the page (`?preset=`: the blade buffer caps and Lambert vs Standard are fixed at construction, as
  in the city; the settings survive the reload).

**Settings** live in the URL hash (`#s=...`) and localStorage (`grassFieldLab.v1`); "Reset" returns to the city's
defaults (read from the code at load). **"Copy settings"** copies a JSON of only what differs from the city's defaults:

| JSON key | Goes to (city code) |
|---|---|
| `grassU.<name>` | `viewer/grass/grass.js`, `export const grassU = { ... }`: the `uniform(...)` / `col(r, g, b)` default of that name (colours are linear RGB, as written there) |
| `preset.{density, d0, reach, rmax}` (+ `name`) | `viewer/grass/grass.js` `PRESETS[name]` (the quality preset the lab ran; the city uses `high` unless `?grasspreset=`) |
| `types.<id>` = `[density, length, dry, flowers]` | `lawn` -> `grassTypes.js` `LAWN`; `verge` -> `grassTypes.js` `ROADSIDE_VERGE`; `island` -> `grassField.js` `ISLAND_VERGE`; any other id -> `grassTypes.js` `KIND.<id>`. **Then rebuild the worker bundle** (`node tools/build_worker.mjs`): the city builds the types raster in the tile worker |
| `wind.{speed, direction, gust}` | `viewer/foliage/wind.js` `wind.speed / direction / gust` |
| `wind.{gustSize, gustSpeed}` | `viewer/foliage/wind.js` `uScale` / `uRate` |
| `ground.{groundRough, groundDry}` | `viewer/ground.js` `setGroundTextures`: `uRough` / `uDry` (they change the textured ground too) |
| `season.*` | not defaults: the lab's override of what the day of year drives (`grass.syncSeason()` in `grass.js`); retune `syncSeason` if wanted |
| `lab.*` | the lab's own state (type shown, mix, time, hour, day, view): nothing to apply |

What the per-type values do: the types raster carries only density, length, dryness and flowers per type. Everything else
follows the LENGTH: blade height = `hBase + len^hPow x hLong` (x `hVar` spread, x season), width = `wBase + len^1.5 x
wideLong`, and the clumping, clump size, rest lean, wind lean, full-density radius and reach are mixed from a "lawn" value
(length 0) to a "long" value (length 1). Seed heads grow on long grass (`seedHeads` x smoothstep(0.5, 0.9, len)); a
flower is `flowerShare` x the type's flowers. The blades' mid colour is the textured ground's mean colour under them
(`colLawn` / `colRough` / `colDry`, from ground.json), darkened to `root` and brightened to `tip`.

**Default-neutral (2026-11-13).** The constants were moved into `grassU` (`grass.js`), `wind.uScale / uRate`
(`wind.js`), `LAWN / ROADSIDE_VERGE / KIND` exported (`grassTypes.js`), `ISLAND_VERGE` (`grassField.js`) with the same
values. Lab captures (`labs/grass-lab.html`, 1280x720, wind time fixed, same view) before / after: G7 meadow midday
mean |diff| 1.16 / 255 in the lower half, 0.013 % of pixels > 8, max 13, against 0.81 / 0.008 % / 14 between two runs
of the SAME code (sky and haze noise); D8 garden golden 0.24 / 0 % / 5. `fieldlab_neutral_meadow_G7_before.jpeg` /
`_after.jpeg`. The worker bundle needs no rebuild (its copy of `grassTypes.js` paints the same values).

Images: `fieldlab_meadow_backlit_golden.jpeg`, `fieldlab_park_meadow_patch_midday.jpeg`.
