# Plan

## Where things stand (end of session 1b, 2026-11-02)

Session 1 (no network) wrote the vendored road lab, the contract, the pipeline
and the 2D debug page. Session 1b downloaded the real data and built the
sample tile **G4**. It is committed in `data/tiles/G4/` (1.7 MB) with
`data/tiles/manifest.json`.

### Data sources (all found, licences checked)

| Dataset | Where | Licence | Notes |
|---|---|---|---|
| OSM | Overpass, `overpass.kumi.systems` mirror | ODbL | `overpass-api.de` reset every connection from this environment. The mirror's data is from **2026-06-01** (5 months old). `fetch_osm.py` now falls back to the mirror on its own. Refetch from the main server when it is reachable. |
| UrbIS - 3D Constructions | datastore.brussels, per 1 km sheet | CC0 | SHP, one MultiPolygon Z per building solid. Release 2026-10-03. |
| Digital terrain model 2021 | datastore.brussels, per 1 km sheet | CC0 | 0.5 m GeoTIFF, no CRS tag in the files (only `.tfw`). |
| UrbIS - Transport networks | datastore.brussels, per 1 km sheet | CC0 | GPKG: `StreetAxes`, `StreetNodes`, `Railways`. Release 2026-10-02. Downloaded, used only for the alignment check below. |

How to find more sheets: every dataset has an INSPIRE Atom feed (URL in
`pipeline/sources.json`, key `atom`) that lists each sheet and each release
with its bbox. Sheet `EEENNN` covers E EEE000–EEE999, N NNN000–NNN999
(EPSG:31370). The full 32-tile grid (E 146643–150643, N 164394–166394) needs
sheets E 146–150 × N 164–166 (15 sheets per dataset); a whole-region archive also exists (sheet code
`21001` for vector, `04000` for the DTM).

### G4 results

```
../venv/bin/python pipeline/fetch_osm.py
../venv/bin/python pipeline/fetch_urbis.py
../venv/bin/python pipeline/run_tile.py G4 --id-field INSPIRE_ID --layer BuildingSolids
node tools/check_roads.mjs G4
```

- **Roads:** 92 roads, 89 nodes (23 cut at the 150 m buffer, 20 roads with a
  tram, 3 signal nodes, 0 roundabouts). `buildRoadNetwork` (style `eu`, `ground`
  from `terrain.u16`) runs in Node 22 in about 0.3 s. Result: 44 junctions,
  4 continuations, 41 ends, 468 lane-graph paths, 7 blocks. The format is right:
  no `dangling` or parse errors, and the lab's Import accepts it (it only checks
  for `nodes` and `roads` arrays). The engine reports **28 errors and 93
  warnings**, all geometric:
  - `road-swallowed` ×16: short OSM pieces between close junctions;
  - `tight-bend` ×12: OSM kinks next to a junction, where the engine has to
    shrink the PI radius to about 0 m;
  - `overlap` ×5, `arm-overlap` ×2, `sharp-junction` ×2;
  - info: `radius-clamped` ×47, `short-blend` ×22, `design-radius` ×15.

  These are Session 2's work (see below). Same counts with `--flat`.
- **Buildings:** 598 UrbIS solids (1,109 read from 2 sheets; the others have
  their centroid outside G4). 45k vertices, 26k triangles. Heights 1.6–58 m,
  median 10.6 m. Every mesh has positive volume, so the winding is outward.
  111 of 9,598 roof triangles face down (soffits and overhangs, flipped up by
  the roof rule).
- **Terrain:** 65.3–97.0 m, no nodata. Place de Saint-Job is at 70.5 m, inside
  the expected 65–80 m. Sheets are mosaicked before resampling, so there is no
  seam at E 150000 (which crosses G4).
- **Alignment:** OSM road centrelines (non-service) are a median 0.54 m from
  the UrbIS street axes (p90 1.9 m, max 8 m around the Place de Saint-Job
  square). No road centreline runs through a UrbIS building.
- **Debug page:** `docs/img/debug-G4.png` (whole tile) and
  `docs/img/debug-G4-saint-job.png` (zoomed on the square) show roads, the
  buffer, buildings by height, 1 m contours with height tint, the tram line, a
  park, and points. No console errors.

### Data problems found

1. **The DTM GeoTIFFs have no CRS.** The pipeline assumes EPSG:31370 (it says so
   in the log). The metadata does not name the height datum either. The values
   agree with the UrbIS 3D heights to about 1 m, so the DTM is taken as TAW.
2. **UrbIS walls go below the DTM.** The lowest vertex of a building is a median
   1.0 m under the lowest DTM sample around its footprint (5 %–95 %: 1.5 m
   below to 0.1 m below). The 3D model and the 2021 LiDAR disagree slightly, or
   the walls are modelled down to a lower ground. `base` stays the DTM value
   (CONTRACT 5.2).
3. **OSM data is 5 months old** (mirror lag, see above).
4. **Few OSM trees:** 3 tree nodes in G4, no tree rows. OSM does not map
   Uccle's street trees densely. A municipal or Brussels Environment tree
   inventory could fill this later; none is used now.
5. **Place de Saint-Job is not a roundabout in OSM**, so G4 has no roundabout to
   test the ring code against. The real roundabout test has to come from
   another tile.

### Other changes in 1b

- `pipeline/build_terrain.py`: mosaics the 31370 sheets before bilinear
  resampling, and treats float32-min as nodata.
- `pipeline/build_buildings.py` / `run_tile.py`: `--layer` matches a substring
  (UrbIS layer names carry the sheet number). Input paths are recorded relative
  to `data/raw/urbis/<key>/`, so they include the release folder and its date.
- `pipeline/fetch_osm.py`: falls back to the kumi mirror.
- `tools/check_roads.mjs`: builds a tile's `roads.json` with the road engine and
  prints issues grouped by code. Exit code 1 if there are errors. This also
  confirms that `vendor/roads` runs in Node 22 as plain ES modules
  (`vendor/roads/ORIGIN.md` still says this is unchecked; it is left untouched
  under the vendor rule).
- `docs/CONTRACT.md` is now **v0.2** (clarifications only, see its change list).
- `data/LICENSE` (ODbL, with attributions).

## Session 2b (done early): minimal 3D viewer of G4

`viewer/index.html` + `viewer/main.js`, no build step. three.js **0.180.0** from
jsDelivr through an import map (`three/webgpu`, `three/tsl`, `three/addons/`, and
`three/src/` so `vendor/roads/mesh/triangulate.js` finds earcut).

- **Terrain:** a 501 × 501 vertex mesh from `terrain.u16`. A TSL material
  colours it by height and slope, with optional 1 m / 5 m contour lines.
- **Buildings:** `buildings.bin` split into a roof mesh and a wall mesh. Flat
  normals, a small colour jitter per building, and shadows.
- **Roads:** built live with `buildRoadNetwork(roads, { ground })` and
  `buildLaneRoadMesh(net, { markings: false })`, giving asphalt, concrete
  (kerbs and sidewalks) and grass. Triangles outside the tile are dropped.
  Under every road triangle the terrain grid is carved to 12 cm below the road
  surface, plus a one-cell shoulder, so the ground doesn't poke through.
  Polygon offset on the road materials.
- **Features:** tram lines and paths as one `LineSegments` each, draped on the
  ground; the 3 OSM trees as instanced trunks and crowns.
- **Camera:** orbit (Overview, Saint-Job), and Walk: WASD, drag to look, eye at
  1.7 m, starting on the road nearest Place de Saint-Job. Stats overlay with
  draw calls, triangles and fps; a load log with timings and road-engine errors.
- **Measured** in headless Chromium (no GPU, so WebGL2 on SwiftShader): load
  about 0.6–1 s, 14 draw calls including the shadow pass, 581k triangles drawn,
  about 45 fps at 1400 × 900. Screenshots: `docs/img/viewer-G4-*.png`.
  **Not tested on real WebGPU**: there was no adapter in headless Chromium.

Not done yet (Session 3 proper): road markings (the asphalt paint shader is in
game-engine-v1, not vendored), neighbour tiles and streaming, a proper sky,
park polygons, picking. The road-engine errors (Session 2) show as gaps and
oversized junction pads, mostly around Place de Saint-Job.

## Session 2: full-area road import — part 1 done (2026-11-02)

### Done

- **Data for all 32 tiles.** `pipeline/find_sheets.py` reads each dataset's
  Atom feed and writes the newest release of every sheet the grid needs into
  `sources.json` (15 sheets × 3 datasets, all published). `fetch_urbis.py`
  downloaded them (about 790 MB in `data/raw/`, git-ignored).
- **All 32 tiles built** (`run_tile.py --all --network`, 80 s): terrain,
  buildings, features and roads everywhere. 38 MB in `data/tiles/`. Only C2
  (the Uccle centre) is over the 2 MB target, at 2.4 MB.
- **One road network, cut into tiles.** `build_roads.py --all` →
  `refine_roads.mjs` → `cut_roads.py`, so ids are shared across tiles
  (CONTRACT 0.3, 5.1 "Pipeline").
- **`refine_roads.mjs`** runs the road engine in a loop and fixes what it
  reports (tighter kerb radii, junction-cluster merges, dropped stubs, dropped
  bend points, kinks made into corners), with a rollback when a change makes
  roads cross. Whole network: **386 → 58 errors** (1,280 → 1,117 roads).
- **`tools/check_roads.mjs --all`**: one line per tile, counting only errors
  inside the tile (the 150 m buffer has cut stubs by design), plus the network.
  **55 errors inside tiles; 16 of 32 tiles have none, G4 included.**
- Viewer: tile picker.

### Part 2 (done 2026-11-02): dual carriageways and roundabouts

- **`pipeline/dual.py`** (called by `build_roads.py`) collapses OSM dual
  carriageways and junction/roundabout flares into one two-way road with a
  median (CONTRACT 0.4). 33 stretches: Avenue Brugmann (6, median 6–8 m),
  Chaussée de Saint-Job (4), Rue de Stalle (3, 1.1 km), Wolvendael,
  l'Observatoire, Prince de Ligne, and short flares on about 20 streets.
  Lesson learned: chains must only link through nodes no other way uses,
  otherwise an exit flare and an entry flare become one U-shaped "road".
- **Roundabouts:** refine now tightens kerb fillets, removes parking on short
  arms and, last, grows the ring by up to 3 m. Crowded rings 9 → 4.
- **Result:** network errors 58 → **43**; errors inside tiles 55 → **39**;
  **23 of 32 tiles clean** (G4 included).
  `docs/img/viewer-C4-roundabout.png` shows the Saint-Job roundabout (Chaussée
  de Saint-Job / Rue Papenkasteel) as one ring with single two-way arms.

### Part 3 (done 2026-11-02): overrides and the last junction types

- **refine** gained `join-ring` (a junction inside a roundabout's footprint
  joins the ring), `unsplit` and `drop-slip`. A rollback whose culprit is unclear
  no longer bans the whole round; refine redoes it one change per round.
  Fixed: the roundabout fix marked rings as "touched" every round, which
  silently blocked every other fix at roundabouts.
- **dual.py** skips short runs whose end is a split (the narrow tip of a wide
  "eye" island) and no longer leaks node remaps from abandoned runs.
- **`pipeline/overrides.json`** (9 entries, each with a `why`): Avenue du
  Prince de Ligne island (H3), the tram track and a service loop at the
  Brugmann/Wolvendael roundabout (C2), the Wolvendael split. Written with
  **`tools/plot_area.mjs`** (SVG of ids and errors around a point).
- **Result:** network errors 43 → **17**; inside tiles 39 → **14**;
  **23 of 32 tiles clean**. `docs/img/viewer-C2-brugmann-ring.png` shows the
  Brugmann/Wolvendael roundabout with its dual arms.

### Left (part 4, small)

14 errors inside tiles, 17 in the network, at about 12 places. Each is one
override or a close look: the Chaussée d'Alsemberg / Brugmann sharp Y (C2,
x -919 z -105; a 25° junction), two crowded roundabouts (C4 Saint-Job / Rue
Papenkasteel; F2 Square Charles Lagrange, 6 arms), Rue Engeland, Dieweg,
Avenue Joseph Jongen, Clos Dandoy. List them with `node tools/check_roads.mjs
--all`, look with `tools/plot_area.mjs`, fix in `overrides.json`. Then: lane
tags (`turn:lanes`), bridges / tunnels, the UrbIS name check.

### Original Session 2 plan (for reference)

Goal: `data/roads/network.json` for the whole study box, one road-lab network
that `buildRoadNetwork(data, { ground })` builds with **no errors** and few
warnings, plus per-tile `roads.json` cut from it.

0. Data first: add the remaining sheets to `pipeline/sources.json` (E 146–150 ×
   N 164–166 for all three UrbIS datasets, from the Atom feeds), then build
   terrain and buildings for all 32 tiles. Try `overpass-api.de` again for
   fresher OSM, and record which endpoint was used.
1. Run `build_roads.py --all`. Load the result in the road lab: either wrap
   `vendor/roads/road-lab.html` in a `tools/road-lab.html` whose imports point
   at `../vendor/roads/`, or use the lab's Import button. Extend
   `tools/check_roads.mjs` (it already does this for one tile) to read
   `data/roads/network.json` with `ground` stitched from all terrain tiles.
   Make this the regression check. Baseline on G4 alone: 28 errors, 93 warnings.
2. Fix the converter against the issue list. Expected trouble spots:
   - **dual carriageways and split junctions:** two one-way OSM ways become two
     `oneWay` roads. Decide whether to merge them into one two-way road with a
     `raised` centre (`lanes.center`), or keep them separate and rely on the
     engine's `split` nodes;
   - **short pieces:** `road-swallowed` errors (16 in G4) come from junction trims longer
     than the road. Merge nodes closer than about 8 m into one junction (the
     classic OSM "junction cluster" problem);
   - **roundabouts:** check that `ring.radius` against real kerbs gives no
     `ring-small` errors. Flared one-way entries into a ring may need `split`
     nodes;
   - **mini roundabouts** and **turning circles**: decide how to show them;
   - **`tight-bend` errors** (12 in G4): a PI close to a junction gets the type
     radius (25 m local, 80 m avenue), the engine shrinks it to almost 0 because
     the tangent is too short, and then the road is narrower than its bend.
     Fix in the converter: drop PIs closer to an end node than the junction trim
     (about road width + corner radius), and/or cap `r` by the available tangent
     length. Tune `SIMPLIFY_TOL` / `MIN_PI_RADIUS` after that;
   - **Place de Saint-Job** is a square of separate residential ways in OSM
     (`r14387667_0`, `r32234433_0` both report `tight-bend`). Check it against
     the UrbIS axes and the orthophoto before deciding how to model it;
   - **bridges and tunnels:** the railway crossings around Uccle-Stalle /
     Saint-Job (line 124). Use `layer` / `bridge` from `meta` to set
     `profile.mode` and grade separation.
3. Lane stacks: check the tag coverage (`lanes`, `cycleway*`, `parking:*`,
   `sidewalk*`) on the real data. Add `turn:lanes` → `sections` (turn pockets)
   where OSM has it.
4. Trams: the road engine has no tram lane. Keep `meta.tram` on roads and draw
   the rails from `features.lines` (kind `tram`) in the viewer. Lines 4, 92 and
   97 pass through or near the area (unverified). Optionally add a `tram`
   entry to the lane types upstream in game-engine-v1, never in `vendor/`.
5. Use the UrbIS transport network to check OSM street names and connectivity.
   Report gaps but don't merge the geometries. The GPKG has `StreetAxes`
   (fields `STRNAMEFRE`, `STRNAMEDUT`, `HIERARCHY`, `LVL`, `SLOPE`,
   `STARTSN_ID`/`ENDSN_ID`), `StreetNodes` and `Railways`. In G4 the OSM
   centrelines are a median 0.54 m from these axes.
6. Junction control: signals on approach nodes are already mapped. Add
   `crossing` nodes → crosswalk placement when the engine supports it.
7. Per-tile cut: build every tile's `roads.json` from `network.json`, so all
   tiles share one id space. Update the manifest.

Done when: the check script reports 0 errors for the full network, all 32
tiles have `roads.json`, and the debug page shows them.

## Realism roadmap (revised 2026-11-02: street level first)

The geometry is already real (UrbIS LoD2 roofs and heights, the 2021 LiDAR
terrain, OSM road layout). What's missing is surface detail, and the target is
a **street-level game** (driving, walking). That rules out draping aerial
photos on what the player sees up close: 5 cm/px is mush at 1 m, parked cars
and shadows are baked flat into the road, and photos have no façades. So, like
street-level games do, close surfaces come from **material libraries and
modular kits**, and real data only decides **which material goes where**.

1. **Roads (first, it's a car game).** Tiling PBR asphalt / paving / setts
   (cobblestones) chosen per road from OSM `surface=`; the engine's lane
   markings drawn by a paint shader (port or vendor upstream
   `v3/render/roads/laneRoadPaint.js`); kerb stone and sidewalk paving
   materials; wear and puddle variation in TSL.
   **Done 2026-11-02 (first pass), `viewer/roadPaint.js`:**
   - asphalt: two-scale noise (patches, grain), per-road tone, polished wheel
     paths from `aLateral`;
   - OSM `surface=` per road → `aSurf` per vertex via the mesh's per-road hash
     (`aPiece.x`): granite setts (72 roads, e.g. Avenue Vanderaey), 20 × 10 cm
     pavers, unhewn cobbles, gravel. Pads take their roads' majority surface.
     Stone patterns fade to their average tone with distance (no moiré);
   - paint: lines along the road decoded from `aEdges` (width, dash pattern
     and phase, yellow, double), junction markings from the engine's
     signed-distance atlas (crosswalks, stop lines, arrows, ring lines),
     parking-bay ticks, noise wear;
   - sidewalks: 30 cm concrete tiles; kerbs: Belgian blue stone; roundabout
     aprons: red setts; grass verges;
   - tram rails: grooved steel rails at 1.435 m gauge along OSM tram lines
     (replacing the pink debug lines); shadow box follows the camera
     (PCF soft, 4096²).
   Screenshots: `docs/img/viewer-G4-street.png`, `viewer-C3-setts.png`,
   `viewer-C2-brugmann-ring.png`.
   **Still to do on roads:** a normal/bump response for setts and kerbs (they
   are flat-shaded colour now); metal needs an environment map (step 5); wet
   look; manholes and drains; the marking atlas is 3300 × 3700 RG8 per tile
   (about 24 MB of GPU memory), so page or shrink it before 9-tile streaming.
2. **Façades: modular kit.** Window, door, shopfront, balcony and cornice
   modules stacked per storey (about 3 m, from the UrbIS height), on the wall
   segments of each building. The street-facing wall (nearest road) gets the
   door; party walls (shared with a neighbour) stay blank. Palettes from what
   Uccle is built of: red/brown brick, white or cream render, some stone.
   Variation seeded per building id so it is stable.
   **Done 2026-11-03 (first pass, procedural rather than a mesh kit), `viewer/facades.js`:**
   - at load, wall triangles are grouped into planar faces; each vertex gets
     face coordinates (`aWall`: along-face metres, face width, height above
     base, eaves height);
   - party walls detected by probing 0.35 m outside each face for another
     footprint (G4: 1,597 of 8,007 faces), no windows; street faces (a road
     centreline within 30 m in front) get the front door (2,102 faces);
   - style per building from a hash of its UrbIS `BU_ID`: red / brown / yellow
     brick (real brick courses), white / cream / grey render; tall blocks lean
     to render. Blue-stone plinth, cornice band;
   - storeys 3.4 m + 3.0 m, window bays sized to each face, frames (mostly
     white), mullion and transom, sills, glass with a sky gradient and some
     curtains; panelled front doors in Brussels colours;
   - roofs in slope coordinates: clay tiles, dark glazed tiles or slate, moss;
     flat roofs bitumen/gravel.
   Screenshots: `docs/img/viewer-G4-saint-job.png`, `viewer-G4-street.png`,
   `viewer-C2-brugmann-street.png`. Costs about 0.2-0.4 s per tile at load.
   **Next:** real relief (window reveals, sills, cornices as geometry or
   parallax), shopfronts from OSM `shop=*` points, gable attic windows, the
   church and other landmarks treated by hand, roof colour from the
   orthophoto (step 4).
2b. **Lighting, post and interiors (2026-11-03), after studying mrdoob/slop-newyork (MIT):**
   three.js r180 -> **r187**. `viewer/lighting.js`: physical sky with clouds baked into an
   environment map (IBL), sun with camera-fitted shadows (the cascaded `SunLight` is
   behind `?sunlight=1`: it cast no shadows in our WebGL2 tests), hemisphere canyon bounce,
   sky-coloured aerial fog, presets golden / midday / overcast / twilight / night
   (`?time=`, HUD selector). `viewer/post.js`: GTAO ambient occlusion, screen-space
   reflections, bloom, colour grade, vignette (`?fx=0` turns them off). Reversed depth
   buffer (`?rdepth=0` to disable). `viewer/tslkit.js`: ported helpers (box-filtered
   pulses, surface-gradient bump, value noise). Façades: box-filtered window grid with
   corner piers, **interior-mapped rooms** behind every window (adapted from slop-newyork:
   floors, rugs, lamps, doors, pictures, drapes and Belgian lace half-curtains, lit or not),
   Fresnel glass reflecting the sky (and SSR), reveal shadows, bump relief (bricks,
   recessed openings, sills, plinth, cornice), soot streaks, height AO, glowing windows
   at night.
   **Next:** real trees (leaf-card crowns, wind; ours are icosahedra), street lamps with
   a pooled set of lights for night, shopfronts, exposed party-wall treatment, wet roads.

3. **Ground materials.** UrbIS **Land cover** (CC0, same 1 km sheets) plus OSM
   areas say where grass, garden, paving, water and woodland are. Tiling grass,
   soil, gravel and paving materials, plus hedges along garden edges.
4. **Roofs and trees from the aerial photo used as data.** Orthophoto 2024
   (CC0, 5 cm, RGB + NIR): sample each roof's colour to pick clay tile / slate
   / flat roof material; detect tree canopy (NDVI from the NIR band, minus
   buildings) to place 3D tree models where OSM has none. A Brussels street-tree
   inventory, if one is published, is better for street trees.
5. **Sky, sun and atmosphere:** physical sky, Brussels sun position, fog, tuned
   shadows.
6. **Street furniture and props** from OSM points: lamps, benches, bus and tram
   stops, signals; tram rails and overhead wires along `features.lines`.
7. **Distance only:** the draped orthophoto is fine as a cheap far level of
   detail (hillsides across the valley, beyond a few hundred metres).

Aim: a recognisable, game-quality Uccle (the real Saint-Job church, the real
streets and houses with plausible windows and walls), not photogrammetry.

## Session 3: 3D viewer (three.js WebGPURenderer + TSL)

Goal: `viewer/index.html` streams tiles from the manifest and renders terrain,
buildings and the road engine's meshes in one y-up scene in local metres.
Steps 1–5 exist for a single tile (Session 2b above); what is left is
streaming (6), markings, the 9-tile performance target, and checking it on a
real GPU with WebGPU.

1. Setup: three.js r17x+ through an import map (pin an exact version) with
   `three/webgpu` and `three/tsl`. Use `WebGPURenderer` with its WebGL2
   fallback, and an orbit camera plus a street-level fly or walk mode.
2. Terrain: per tile, a `PlaneGeometry(500, 500, 500, 500)` displaced on the
   CPU from `terrain.u16`. Or upload the u16 data as a texture and displace in
   a TSL vertex node. Shared edges make the seams exact. Shade with a TSL
   slope/height material for now.
3. Buildings: one `BufferGeometry` per tile from `buildings.bin` (index
   buffer, computed flat normals). Roof and wall groups get separate materials
   from the per-building `roof` / `walls` ranges. G4 is 598 buildings, 26k
   triangles, so one draw call per material per tile is plenty. Walls reach
   about 1 m under the terrain (CONTRACT 5.2): let them sink, don't clip.
   `attrs.BU_ID` groups solids into buildings for picking.
4. Roads: build the network with `buildRoadNetwork(data, { ground })`, using
   `ground` from the terrain tiles (`loadGround` in `tools/check_roads.mjs` is
   the reference lookup). Until Session 2 is done, expect the G4 errors listed
   above; skip or flag roads with `error` issues rather than failing the tile. Turn it into meshes with
   `vendor/roads/mesh/laneRoadMesh.js` (needs `three` resolvable for earcut).
   Lift the road a few cm, or use polygonOffset. Make sure the terrain doesn't
   poke through: flatten the heightmap under the road corridor, see the
   upstream terrain grading in game-engine-v1.
5. Trees and features: instanced trees from `features.trees`, flat park
   polygons, tram rails as thin extrusions along `features.lines`.
6. Streaming: load tiles in a ring around the camera from `manifest.json` and
   dispose them outside it. Show a stats overlay (draw calls, triangles, tiles).
7. Check against reality: Place de Saint-Job, Avenue De Fré and Chaussée
   d'Alsemberg / Uccle centre seen at street level. Note mismatches for the
   data sessions.

Done when: tile G4 plus its 8 neighbours render at 60 fps on a mid laptop, and
roads sit on the terrain with no z-fighting.
