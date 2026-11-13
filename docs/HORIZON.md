# Region border + horizon ring (branch claude/horizon, 2026-11-13)

Two problems from the edges of the data, both fixed from real open data (nothing invented or hand-edited).

## 1. The Brussels region border (ON by default: it is data)

**Before.** The UrbIS DTM stops at the Brussels region border. 20 of the 120 tiles reach into Flanders (Drogenbos,
Linkebeek, Sint-Genesius-Rode, Beersel: A5 B5 B6 B7 B8 C8 C9 D10 E10 F10 G10 H11 I11 J11 K11 K12 L12 M12 N11 O11) and
had 1,347,428 NODATA cells, which the viewer fills with the tile's lowest height: a flat plain 5-20 m low, roads
floating over it, a pit at D10 (-1020, 2930). Their small orthophotos (ortho.jpg) were WHITE past the border (the far
tiles showed white patches from the falcon).

**Source.** DHMV II, the Flemish 1 m DTM (Digitaal Vlaanderen), from its INSPIRE WCS
`https://geo.api.vlaanderen.be/el-dtm/wcs`, coverage `EL.GridCoverage.DTM` (covers Flanders AND Brussels). Notes: the
WCS 2.0.1 interface 403s on CRS URLs in the query (an Azure gateway rule) and only subsets in EPSG:4258; the 1.0.0
interface takes `crs=EPSG:31370&bbox=..&resx=1&resy=1&format=GeoTIFF&interpolation=bilinear` and returns a plain
GeoTIFF already on our grid (pixel centres on whole Lambert-72 metres = the tiles' terrain corners).

**Alignment check** (`tools/terrain/border_check.py`, 4.57 M cells where both DTMs exist, the 20 tiles + 32 m margins):

| | value |
|---|---|
| vertical datum | the same (TAW): mean UrbIS - DHMV **+0.04 m**, median of the tile medians **+0.007 m** |
| per tile median | -0.009 .. +0.035 m; p5 / p95 about -0.2 / +0.4 m (vegetation, 2021 vs 2013-15 earthworks) |
| horizontal shift (least squares on slopes) | **0.085 m E, 0.09 m N** (per tile -0.2 .. +0.37 m): sub-cell, no correction applied |
| max abs difference | 8.6 m (E10: earthworks / a building pit between the two surveys) |

**Fix.** `pipeline/fetch_dhmv.py --border` fetches each border tile's DHMV (tile + 32 m, 1.6 MB each, 32 MB in
`data/raw/dhmv/tiles/`, not committed). `pipeline/build_terrain.py` fills the UrbIS NODATA from it: UrbIS values are
never changed (building bases, rail, trees stay valid; 0 changed cells in D10 / B6, <= 5 cm on 9 % of E10 where a
second UrbIS sheet's mosaic now sees the margin); the Flemish side gets the local UrbIS - DHMV residual (box-smoothed
over 9 m along the seam) faded out over 12 m, so the seam has no step; the work runs on the tile + margin grid, so both
sides of a tile edge get identical values. Result: 0 NODATA cells left; the steps across the seam are the size of the
tile's own steps (p99 0.1-1.0 m on 1 m cells vs the tile's own p99 0.2-0.9 m). Re-run:
`python pipeline/fetch_dhmv.py --border && python pipeline/build_terrain.py --tile <T>` (per tile) and
`python pipeline/build_manifest.py`. The tile's `terrain.json` now has `"source": "urbis-dtm+dhmv2"` and a `fill` record.

Ortho: `pipeline/fill_ortho_border.py` replaces the white pixels of those tiles' `ortho.jpg` with the Flemish
orthophoto (OMWRGB25VL, winter 2025, colour-matched to the Brussels summer photo with a per-channel CDF match measured
where both exist). 18 tiles changed (1.5-71 % of the photo).

**Roads** (`tools/terrain/road_float.mjs`: road + sidewalk vertices over the DRAWN terrain, the 20 tiles, 1.09 M vertices):

| | before | after |
|---|---|---|
| > 1 m over the terrain | 52,367 | **14,599** |
| > 5 m | 23,136 | **2,574** |
| max | 21.0 m (I11), 19.7 m (D10 -1025, 2930) | 9.3 m (F10) |

Plus one road-levels change (viewer/streets/roadLevels.js, see "shared code"): only OSM-tagged bridges / tunnels keep
a junction off the ground; the engine's own "bridges" (its profile > 3 m over the DTM because of its grade limit on a
steep street) no longer do. City-wide only D10 changes (6,804 -> 3,038 vertices > 1 m); all other 119 tiles identical.

What is left (road engine, not terrain; for the roads agent):
- **E10 / F10 Linkebeek sunken lanes** (Kleindalstraat and others, 10,073 + 774 vertices > 1 m, up to 8-9 m): the
  1 m DTM shows the real holle wegen (2-4 m deep trenches, 15-30 % climbs). The engine's grade limit (12 % local)
  holds the profile up and marks "bridges"; the junctions there are rough (plane RMS > 0.5 m) so relevel skips them.
  Also: a road leaving the tile samples the CLAMPED edge height beyond it (Heightmap.sample), which made a fake
  82 m plateau at E10's corner. Ideas: relevel rough junctions to the lane bottom (min of the ring, not the mean);
  let 'terrain' profiles follow the DTM where the OSM way is tagged `sunken` / where the trench is under it.
- **D10 Rue de la Brasserie / Vieux Chemin** junctions (-1300, 2627) and (-1315, 2606) sit 1.5-1.8 m up (rough ground
  at a ravine edge, RMS 1.0-1.1 m); before the fill the fake pit beyond hid this.
- D10 (-1018, 2722) "earth wall" and G10 (481.5, 2751.3) "ledge": both are INSIDE the Brussels DTM (unchanged by this
  work, checked cell by cell): real terrain features (a retaining wall / a step), not border artefacts.
- Pre-existing, NOT from this work: neighbouring tiles' shared NORTH-SOUTH edge rows differ (mean 3-9 cm, max 0.8-1 m
  on steep ground; east-west edges agree to 1 cm): the UrbIS mosaic + resample gives slightly different values on a
  tile's last row and the next tile's first row. Worth a look (build_terrain.urbis_grid; a padded grid as used for the
  fill would fix it, but every tile and building base would change).

Screens: `docs/horizon/D10_road_gap_before.jpg` / `D10_road_gap_after_terrain.jpg` (road vertices coloured by height
over the terrain: green < 0.5 m, orange < 1 m, red < 5 m, magenta more; tile hillshade + ortho).

## 2. The horizon ring (`?horizon=1`, OFF by default: the owner decides)

**Before.** Beyond the streamed far tiles the sky paints a flat floor (#686c67, lighting.js groundAlbedo); from the
falcon (120-650 m) a flat grey-green band. `docs/horizon/before_south_520m.jpg` vs `after_south_520m.jpg` (looking
south over Linkebeek from 520 m), `after_north_650m.jpg` (from over Beersel back to the city).

**What it is.** One static mesh, 32 x 32 km round the city (local x -15240..16760, z -15000..17000):
- heights: a 20 m grid (`pipeline/build_horizon.py`): DHMV II fetched at 10 m (16 WCS chunks, 49 MB raw) and
  tent-filtered to 20 m; Wallonia (no DHMV) from **Copernicus DEM GLO-30** (a DSM: forests / buildings in it;
  EGM2008), read as a COG over HTTP (only the blocks needed), shifted to TAW by the median GLO - DHMV over open ground
  in the overlap (**-1.17 m**, 1.85 M cells; -0.74 m over all ground) and faded into the DHMV over 400 m at the
  language border. The Quenast quarries (Rebecq, -72 m TAW) are real and kept (heights stored with a -100 m base).
- mesh: `tools/terrain/build_horizon_mesh.mjs` simplifies the 5.1 M-triangle grid with meshoptimizer, the allowed
  error growing with the distance to the edge of the city's tiles (0.5 m at the edge, where the ring is seen from the
  street; x6 faster inside the tiles, where it only shows past the far ring; 1 + d / 700 m outside): **105,162
  triangles, 55,782 vertices, horizon.bin 1.82 MB** (quantised: u16 grid col / row / height, i8 normal from the full
  20 m grid).
- colour: two orthophoto mosaics, `colour_inner.jpg` (the tile grid + 1 km, 1900 x 1600, 5 m/px, 0.87 MB) and
  `colour_outer.jpg` (the 32 km, 2048², 15.6 m/px, 1.38 MB): Brussels UrbIS Ortho2024NS (summer), Flanders OMWRGB25VL
  (winter 2025, CDF-matched to the Brussels summer photo), Wallonia SPW ORTHO_2021 (CDF-matched to the matched
  Flemish countryside). The inner one fades into the outer one over its last 300 m.
- drawing (`viewer/horizon.js`): MeshStandardNodeMaterial (roughness 0.95, as the far tiles), the scene's fogNode
  (the same aerial haze as everything else: the outer edge at 16 km is fully in the haze from any falcon height),
  no shadows cast or received, one draw, renderOrder 10 (after the city: covered pixels fail the depth test), 0.6 m
  under the DTM (the far tiles sit 0.3 m under).
- hand-over to the tiles (smooth LOD, no gap, no z-fight, no pop): the ring also runs under the city, and a 15 x 12
  float texture (one texel per grid tile, 2.9 KB, re-uploaded only while tiles stream / fade) holds each tile's current
  fade; the ring keeps a pixel only where no drawn tile does, with the SAME screen dither as lodFade.js (a tile fading
  in keeps n < f, the ring n >= f; fading out the other way round), so every pixel is drawn exactly once during a
  0.9 s fade. Along the edge of the drawn tiles the ring stays 3 m into the tile where the cell across is not drawn:
  under the tile's ground there, it closes the open edge seen from outside (joins rule) and stays hidden from above.
- camera far plane 6 km -> 20 km with the ring on (reversed-Z depth: no precision issue; the night lights' log
  z-slices get ~10 % coarser).

**Cost.** GPU: **not measured cleanly**: `tools/perf/preflight.ps1` was RED (the grass agent was measuring on the same
GPU). Paired on/off A/B in the falcon view (8 x 2 s each, p50 of the GPU frame time): medians between -0.07 ms and
+0.4 ms, the noise between samples +-1 ms; Lambert instead of Standard and no mask made no measurable difference in
that noise. Target <= 0.2 ms: re-measure on a quiet GPU (`?horizon=1` vs `window.__horizon.mesh.visible = false`).
Cuts if needed: `--err 0.75` (~60 k triangles), Lambert, a smaller outer photo. CPU: the mask update loops over the
<= 60 drawn tiles a frame (microseconds). Load: 4 MB download, one decode loop over 55 k vertices (not timed), two textures (inner 1900 x 1600,
outer 2048², ~38 MB GPU with mipmaps).

**A/B.** `?horizon=1` on, default off. In the page: `window.__horizon.mesh.visible = false` (and
`viewer.camera.far = 6000`) = before. `?skyground=old` still restores the old brown sky floor.

**Left / ideas.** Close to the city edge (street level at the region border) the ring is a 5 m/px photo on a 20 m mesh:
fine from 200 m, soft from 20 m; a finer band (2 m/px, 10 m) along the edge would cost ~2 MB. No buildings / trees in
the ring (only the photo): from 1.5 km the photo's roofs read as town, but the forests are flat (the Sonian forest edge
has no height: GLO-30's canopy is only used in Wallonia); a canopy height (DSM - DTM) lift for woods would make the
Sonian edge stand up on the horizon. Flemish winter vs summer: the CDF match fixes the tones, not the leafless woods'
texture. The Walloon / Flemish photos meet in a visible staircase at the Sonian forest's south edge. The ring is
static round Uccle: flying 15 km out shows its edge (fully in the haze for every preset's fog).

## Shared code touched (for a careful merge)

- `viewer/streets/roadLevels.js` `relevelRoads`: `fixedRoad` now only counts bridges / tunnels on roads OSM tags
  `bridge` / `tunnel` / `layer` (+ comment). Rebuilt `viewer/tileWorker.bundle.js` (that one function).
- `viewer/main.js`: one block after `const lite = new Map();` in the streaming section (`?horizon=1` only: creates the
  ring, extends camera.far, pushes one updater).
- `viewer/index.html` #credits: "· Digitaal Vlaanderen".
- `pipeline/build_terrain.py`: refactored into `urbis_grid` (unchanged maths) + the fill (`fill_grid`, `seam_fill`);
  without a DHMV file a tile builds byte-identical to before (checked on I6).
- Data: 20 tiles' `terrain.u16` / `terrain.json`, 18 tiles' `ortho.jpg`, `data/tiles/manifest.json` (re-stamped).
- New: `pipeline/fetch_dhmv.py`, `pipeline/build_horizon.py`, `pipeline/fill_ortho_border.py`,
  `tools/terrain/{border_check.py, road_float.mjs, build_horizon_mesh.mjs}`, `viewer/horizon.js`, `data/horizon/`
  (4.1 MB: horizon.bin 1.82 MB, colour_outer.jpg 1.38 MB, colour_inner.jpg 0.87 MB, heights.json), `docs/horizon/`.
