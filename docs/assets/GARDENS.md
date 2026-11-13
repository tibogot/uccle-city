# Front-garden kit: walls, railings, pillars, gates, hedges (branch claude/gardens, 2026-11-13)

Kit 7 "front gardens" of `docs/assets/STREET_KITS.md`, built like the furniture kits (`docs/assets/FURNITURE2.md`,
`docs/assets/STOPS.md`). **On by default.** `?gardens=0` gives back the city as it was (house fronts meeting the sidewalk
bare). `?gardenhedges=1` adds the hedges (opt-in, see Performance).

## What was built

| piece | LOD0 / 1 / 2 triangles | bands (m) | what it is |
|---|---|---|---|
| `wall` | 24 / 24 / 8 | 35 / 90 / 220 | procedural (JS, `viewer/gardens/gardenGeom.js`): a 25 cm brick wall, a unit box stretched along the segment, SHEARED to its slope, scaled to the body height; a footing of 0.6 x the height below the base line (JOINS); vertex rings at the ground line and 25 cm for the contact AO |
| `cap` | 28 / 12 / 12 | 35 / 90 / 220 | the coping: a 32 x 8 cm slab with chamfered top edges and soffits (blue stone or concrete per instance), stretched + sheared like the wall, not scaled in height |
| `pillar` | 24 / 24 / 8 | 35 / 90 / 220 | a 36 x 36 cm brick (or rendered) pier, footing 0.4 x its height |
| `pcap` | 30 / 22 / 14 | 30 / 80 / 200 | the pier's cap: a 46 cm chamfered slab with a low pyramid |
| `rail_spear` | 1616 / 416 / 80 | 22 / 60 / 150 | Blender: the classic Uccle wrought-iron railing, a 1 m module: square bars every 12.5 cm through a flat top rail, each ending in a cast lance finial with its collar (gilded tips on ~30 % of the black / green ones), a flat bottom rail |
| `rail_flat` | 640 / 304 / 80 | 22 / 60 / 150 | Blender: the modern steel railing (flat bars on edge between a square-tube top rail and a bottom rail), anthracite |
| `rail_rings` | 2208 / 832 / 96 | 22 / 60 / 150 | Blender: the Art Deco railing, square bars with a band of rings between a middle rail and the top rail, a capping bar |
| `gate_<type>` x 3 | e.g. spear 2294 / 570 / 144 | 22 / 60 / 150 | Blender: the pedestrian gate, 1.0 m nominal leaf (scaled to the opening), tube frame, the type's infill, latch box + lever on the street side, two hinge knuckles; drawn OPEN (swung 70-100 deg into the garden) so the walker gets in at the door |
| `cargate_<type>` x 3 | e.g. spear 3496 / 872 / 240 | 25 / 70 / 160 | Blender: one leaf of the double driveway gate (1.6 m nominal), a middle rail, a drop bolt into the ground; two leaves per closed driveway |
| hedges | (the foliage system's) | hidden past 260 m | `viewer/foliage/hedges.js buildHedges` on runs 0.45-0.5 m behind the wall line (not a second hedge system): with `?gardenhedges=1`, a coarser body (`{ step: 0.6, split: 0.32, cards: 0.6 }`) |

- Script: `tools/blender/gardenKit.py` → `models/gardens/gardens.glb` (1.9 MB, + `gardens.json`, `previews/`). The three
  LODs are SCRIPTED (round segments 12 / 6, lances detailed / simple / none, extra rings for AO only at LOD0 / 1): no
  decimation. Named slots only: `iron_paint`, `iron_tip`, `steel_dark` (Blender) and `brick`, `stone` (JS). Palette and
  per-instance variants in `viewer/gardens/gardenKit.js` (`BRICK` 5 tones: red-brown, dark klinker, orange-red, sand,
  white render; `STONE` blue stone / concrete; `PAINT` black / anthracite / dark green; gilded lance tips).
- Brick: a stretcher bond in WORLD space (u along the face from its normal, v = height), 22 x 6.5 cm, 11 mm joints
  anti-aliased and faded to the mean colour once the courses fall under ~3 px; per-brick tone; dark mortar for the
  klinker, no joints on the white render; LOD2 = the mean colour. Stretched and sheared pieces keep real brick sizes and
  level courses.
- AO: Cycles AO baked per VERTEX for the ironwork (COLOR_0; each piece on a coping / the ground); analytic contact AO on
  the JS pieces (the ground line, the copings' soffits). Bevels / chamfers as their own facets, flat normals on flat
  faces; railing modules tile without doubled bars (bars at x = 0.125 k) and without hidden end faces.
- Night: nothing glows, no light (fixed light count).

## Placement (`tools/gardens/build_gardens.py` → `data/gardens/<T>.json`, 120 files + `summary.json`, 11 MB)

```
node tools/gardens/faces.mjs <T>      (called by the builder: the city's own street faces and doors)
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/gardens/build_gardens.py --all --raw <main checkout>/data/raw [--osm <dir with osm/barriers.json, osm/forecourts.json>] [--tile I6 --debug <dir>]
```

Deterministic, ~4 min for all of Uccle. Inputs: the faces / doors exactly as the façade code makes them
(`tools/gardens/faces.mjs` runs `viewer/facadeGeom.js analyseBuildings` + `viewer/interior/facadeWindows.js
faceOpenings`: the widest street face's door with the façade kit; the painted door of every street face the kit leaves
painted), the UrbIS street surfaces of the tile and its neighbours (rasterised at 20 cm), the DTM + measured kerb lift,
UrbIS Topo CR42L driveway lines (`<raw>/urbis/topo_poles/<T>.street_furniture_line.geojson`, drawn ON the property
line), the UrbIS ramp surfaces (dropped kerbs), OSM service roads, and two Overpass extracts kept in the worktree's
git-ignored `data/raw/osm/`: `barriers.json` (barrier=* ways + gate nodes in Uccle, 2026-11-13T20:58Z: 226 hedges,
135 walls, 128 fences, 12 retaining walls) and `forecourts.json` (amenity=parking, landuse=retail / commercial /
industrial, shop areas, 2026-11-13T21:05Z). **Copy both into the main checkout's `data/raw/osm/` when merging.**

Rules:

- **Strip**: every street face (not a party wall, not a landmark, >= 2 m wide) casts a ray every 0.5 m along its normal;
  the first UrbIS street surface it meets before any other building is the PROPERTY LINE (refined to ~1 cm with the
  polygons), the distance is the garden's depth. A face is a garden front when >= 50 % of its rays hit at 1 - 35 m with a
  median >= 1 m. No garden: houses on the sidewalk line (8 609 faces), faces facing no street surface (9 519), shops (a
  street-life shopfront on the face: 455; an OSM shop point in or within 6 m of the building: 2 130), and the samples
  whose ray crosses an OSM parking / commercial area (9 737 samples).
- **Plot**: the run follows the hit points (Douglas-Peucker 6 cm). Detached houses' runs extend up to 12 m past the
  face's ends while the rays keep hitting at a similar depth; a spot two fronts claim goes to the face it lies in front
  of, else the nearer face end (plots split half way between villas). Runs ending within ~2-3 m of each other at an
  angle get the corner point (249 mitred corners); straight neighbours meet end to end; consecutive segments that turn
  < 70 deg overlap by w/2 tan(a/2) (no wedge gap), bigger turns get a pillar.
- **Openings**: the front door projected along the face normal onto the run: a 1.1 m opening with a pedestrian gate,
  drawn open (4 110 gates; 2 713 doors fell inside a driveway and use it); driveways from CR42L (12 355), ramp hits where
  UrbIS Topo has none (26), OSM service roads crossing the run (27): pillars both sides, a closed double gate on ~55 % of
  2.2-4.6 m openings (2 548), else open (7 640).
- **Style**: per house (hash of BU_ID) but plausible per street: each street name has a dominant style that ~60 % of its
  houses take (and ~65 % of those the street's exact look). Terraced fronts (gap <= 5 m, party walls) draw from: low
  wall + railing 36 %, + hedge 16 %, brick wall 22 %, hedge 12 %, modern 6 %, open 8 %; villas (gap > 5 m or detached):
  12 / 24 / 12 / 30 / 10 / 12 %. No hedge in a strip under 2.5 m (it would block the door), hedges <= 1.3 m under 4 m.
  An OSM barrier within 1.2 m of >= 40 % of a run wins (100 runs: 54 hedge, 24 fence, 22 wall; height / material tags
  used; wooden / chain-link fences become a hedge: there are no wooden fence pieces).
- **Height**: the base line follows the lower of the sidewalk (DTM + measured kerb lift) and the garden (DTM), a vertex
  every <= 1.5 m. Where the garden is higher, the wall grows to retain it (coping >= garden + 0.25 m: 442 runs). In the
  city the instances are then SETTLED on the drawn ground (`gardenKit.js settle`): each segment end goes down until its
  footing reaches the lower side everywhere along it, and the wall grows where the drawn garden rises over the coping.

**Counts (Uccle):** 11 466 houses with a front: 15 993 runs (7 797 railing fronts, 2 947 wall fronts, 5 249 hedge fronts,
1 593 open lawns); **53.1 km of wall, 37.6 km of railing, 46.5 km of hedge**, 51 486 pillars, 48 594 wall segments,
4 110 pedestrian gates (open), 2 548 closed driveway gates. Busiest tiles: J7, F9 (~650 garden faces each).

## Performance

- ONE pool per piece for the whole city (13 pieces x 3 LODs = at most 39 meshes), refilled every 2 m of camera travel
  (or while a tile fades), the tiles' instances sorted into 50 m cells (a pool skips cells out of range: gather 0.4-1.2 ms
  every 2 m with 9 tiles, ~60 k instances). THREE shared materials (one per LOD) for the whole kit. Static instanced
  buffers with update ranges over the live count; a pool mesh with nothing to draw is hidden. Shadows: walls / pillars /
  copings from LOD0 + 1, the ironwork from LOD0 only; LOD2 never casts.
- Early cut-off: the ironwork ends at 150-160 m, walls / pillars at 200-220 m (the façade's painted look then).

| where | measured |
|---|---|
| Gardens Lab, street (8 fronts) | 74 draws for the whole frame, 156 k triangles, 21 kit meshes |
| Gardens Lab, LOD row (8 x 8 fronts down 420 m, no hedges) | 46 draws, 92 k triangles, 29 kit meshes |
| city, Avenue Hippolyte Boulenger (I6, walk camera at 1395, 812, 9 tiles, `traffic=0&trams=0`) | **442 → 481 draws (+39), 5.94 M → 6.17 M triangles (+233 k)**; 32 kit meshes, 153 k kit triangles per pass |
| the same with `?gardenhedges=1` | ~+75 more draws and up to ~400 k more triangles (4 tiles' hedges within 260 m; 90-200 k body triangles a tile, coarse) |
| kit load | 35-75 ms (GLB 1.9 MB uncompressed) |

**GPU ms: not claimed.** `tools/perf/preflight.ps1` was **RED** (5 fails: another agent's Blender jobs and Chrome tabs on
this 16 GB laptop). Indicative only, under that load: the lab 0.5 ms (LOD row) to 1.6-1.8 ms (street with hedges) for
the whole frame.

## Collisions (`window.viewer.collisionTest(tile, { walk: true })`, ring 0)

| tile | before (`?gardens=0`) | after |
|---|---|---|
| I6 static: invisible / missing | 0 / 5 (buildings) | 0 / 5 (the same) |
| I6 drive: contacts / invisible / passed / fell / stuck / blocked | 52 / 0 / 0 / 2 / 0 / 42 | 53 / 0 / 0 / 2 / 0 / 43 |
| I6 walk: contacts / invisible / passed / fell / stuck / blocked | 7 / 0 / 3 / 1 / 0 / 31 | 51 / 0 / 4 / 0 / 0 / 32 |
| D8 (villa streets) static | 360 / 13 (invisible walls: pre-existing) | 360 / 13 |
| D8 drive | 40 / 0 / 0 / 0 / 0 / 33 | 46 / 0 / 0 / 0 / 0 / 35 |
| D8 walk | 3 / 0 / 1 / 0 / 1 / 10 | 56 / 0 / 2 / 0 / 1 / 11 |

The one new "passed through" on each tile is a walker going through a front's pedestrian OPENING between its two gate
pillars (I6 1136.8, 974.5; D8 -1275.5, 1750.3: hedge fronts' gate pillars 1.1 m apart): the opening is meant to be
walkable; the test's 20 cm raster counts the pillars' cells. How: per tile, never-drawn InstancedMeshes of unit boxes
`furniture-gardenwall` (wall + coping + railing as one sheared box per segment), `furniture-gardenpillar`,
`furniture-gardengate` (the closed driveway gates); the open pedestrian gates have none. The car reads them as boxes
(`featureColliders`), the walker / third person as triangles (walls, gates) and posts (pillars).

JOINS (`window.__gardens.contact(tile)`, every segment sampled every 0.5 m on both faces, every pillar at its corners,
against the drawn ground): I6 2 291 samples, H5 2 414, D8 1 867: **0 floating, 0 buried railings, 0 floating pillars**
(before the settle pass on I6: 25 floating samples up to 0.30 m where the city carves its terrain, 6 buried railings).

## Switches

- `?gardens=0`: no gardens (the city as before). `?gardenhedges=1`: with the hedges.
- Gardens Lab: `labs/gardens-lab.html` (`?layout=lod`, `?slope=0.08`, `?view=<preset>`, `?night=1`, `?hedges=0`).
- `window.__gardens.report()` (instances, live per LOD, gather ms, hedge cost), `.contact(tile)` (JOINS check).

## Shared files touched (for a careful merge)

| file | change |
|---|---|
| `viewer/main.js` | +1 import (`cityGardens`); in `loadTile`: `gardensP = cityGardens.fetchTile(...)` after `furnP`; after `furnCounts = cityFurniture.addTile(...)`: `cityGardens.addTile(entry.name, await gardensP, own.features, (x, z) => hm.surface(x, z))` + a `say(...)`; `cityGardens.removeTile` in dispose; `await cityGardens.start(...)` after `cityFurniture.start` |
| `viewer/drive/driveMode.js` | `gardenwall|gardenpillar|gardengate` added to the furniture box regex in `featureColliders` |
| `viewer/character/cityHook.js` | `furniture-garden(wall|gate)` → "mesh", `furniture-gardenpillar` → "post" (two lines after the shelter line) |
| `viewer/foliage/hedges.js` | `buildHedges(runs, groundAt, opts = {})`: optional `{ step, split, cards }` (ring spacing, section point spacing, card density); defaults unchanged |
| `labs/index.html` | Gardens Lab card |
| `docs/assets/STREET_KITS.md` | kit 7: a pointer here |

No tile-worker change (no bundle rebuild). New: `viewer/gardens/{gardenGeom,gardenKit,cityGardens}.js`,
`tools/blender/gardenKit.py`, `tools/gardens/{build_gardens.py,faces.mjs}`, `models/gardens/`, `data/gardens/`,
`labs/gardens-lab.*`, `docs/assets/gardens/`.

## Sources

- Data: UrbIS (CC0: buildings, street surfaces, Topo CR42L driveways) via the tiles and the main checkout's raw cache;
  OpenStreetMap (ODbL: barrier ways, parking / commercial areas, shops, service roads), fetched from Overpass 2026-11-13.
- Look: from knowledge of Brussels / Uccle front gardens (low brick walls with blue-stone copings, lance railings, brick
  piers with stone caps, privet / beech hedges). **No photo was consulted for this round** (no Google imagery, no
  Commons photo): a look check against Street View (LOOK only) and Commons photos is left to do (below).

## Screenshots (`docs/assets/gardens/`) and previews (`models/gardens/previews/`)

- `city_I6_boulenger_sidewalk.jpg`: Avenue Hippolyte Boulenger from the sidewalk, low klinker walls with blue-stone
  copings and lance railings, hedges behind (`?gardenhedges=1`).
- `city_I6_boulenger_villas.jpg`: the same street's villas: sand-brick walls, pillars, railings and hedges.
- `plan_I6_villas.png`, `plan_I6_terraces.png`: the builder's plan view (`--debug`): faces with a garden (green), doors
  (blue), runs (red), walls (dark red), railings (black), hedges (green), pillars (orange), gates (blue = pedestrian,
  magenta = driveway), ramps (light orange).
- `models/gardens/previews/gardens_lod0.jpg`, `gardens_close.jpg`, `gardens_lods.jpg` (Cycles).

## Left to do

- Look check against Street View (look only) and Commons photos of Uccle streets; tune the style mix per street type.
- Hedges are opt-in (`?gardenhedges=1`): one group per tile per species costs up to ~10 draws and 90-200 k triangles a
  tile. The foliage city hookup should give them cells + LODs (or an instanced hedge segment with the foliage material).
- The mesh checker (`tools/mesh_audit`) was not run on the ironwork GLB yet; LOD flight pop counter not run (the
  hand-over is the furniture kits' dithered band, checked by eye in the LOD row).
- In some streets a strip of lawn shows between the drawn sidewalk and the wall (the wall stands on the UrbIS edge;
  the drawn sidewalk can stop short of it).
- The painted façade draws a door on every street face of the buildings the façade kit does not take: those get a gate
  too; a façade-kit house's second street face gets none (it shows a window there).
- Garage ramps / driveway paving are not drawn (the openings are); the driveway gates are closed boxes for the car.
- Data size (11 MB): could be compacted (integer centimetres, no per-garden list).
- Wooden and chain-link fences (OSM) are drawn as hedges: no fence pieces yet.
