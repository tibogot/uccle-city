# Front-garden kit: walls, railings, pillars, gates, hedges (branch claude/gardens, 2026-11-13)

Kit 7 "front gardens" of `docs/assets/STREET_KITS.md`, built like the furniture kits (`docs/assets/FURNITURE2.md`,
`docs/assets/STOPS.md`). **On by default since round 2 (branch claude/gardens2, 2026-11-14), hedges included.**
`?gardens=0` gives back the city without them (house fronts meeting the sidewalk bare); `?gardenhedges=0` = without the
hedges.

## Round 2 (claude/gardens2, 2026-11-14): what changed and why it can be on

### 1. The lawn strip between the drawn sidewalk and the wall: cause and fix

The placement data was right (the walls stand on the measured UrbIS paving edge). The strip came from how the city
DRAWS that edge: `viewer/surfaces.js smoothCurves` refines curved kerbs and outer edges with a centripetal Catmull-Rom
spline, and on an OUTER edge (the sidewalk's back edge, against the gardens) it also splined long STRAIGHT pieces that end
at a corner of a much shorter piece. I6 Avenue Alphonse XIII (1434, 732): the UrbIS sidewalk's back edge is ONE 39 m chord
after a 1.1 m corner piece; splined, it bowed up to **0.75 m into the sidewalk**, and the terrain (lawn) showed between the
drawn paving and the wall. A J6 corner (1752, 723) lost 1.3 m the same way (a 15.6 m chord between two 50 deg turns).

- `smoothCurves`: on outer edges, a piece more than 4 x longer than its neighbour across a vertex keeps its own tangent at
  that end (the piece stays straight); real curves (drawn with similar chords) are refined as before; kerbs unchanged.
  Tile worker bundle rebuilt (`node tools/build_worker.mjs`).
- `tools/gardens/drawnSurfaces.mjs`: the street surfaces EXACTLY as the city draws them (`taperSteps`, `smoothCurves`,
  `rampKerbPoints` of `viewer/surfaces.js`, bundled in memory with the worker build's esbuild); `build_gardens.py` places
  the runs on these rings, so whatever the drawing does to an edge, the wall follows it (JOINS by construction).
- Measured on screen (every wall segment: the first drawn paving triangle from the wall's centre line toward the street,
  9 tiles round I6, `roads-*` meshes; the wall face is 12.5 cm from its centre line):

| tile | segments | gap > 0.3 m before | after the spline fix | after the drawn-surface placement |
|---|---|---|---|---|
| I6 | 629 | 50 | 4 | **0** |
| H5 | 649 | 60 (18 over 1 m) | 18 | **0** |
| J6 | 490 | 62 | 18 | **0** |
| I7 | 668 | 52 | 8 | 1 |
| J7 | 1 123 | 19 | 5 | 1 |
| I5 / J5 / H6 / H7 | 525 / 564 / 576 / 443 | 1 / 7 / 27 / 8 | 1 / 2 / 6 / 2 | 1 / 2 / 3 / 2 |

  The few left (0.35-0.5 m) sit on tile borders (H6 733.9, 496.7: the H5 mesh draws that paving) or where no paving is
  drawn within 3 m (private lanes). Screenshot: `gardens/r2_I6_alphonse_top_after.jpg` (the round-1 strip:
  `gardens/city_I6_boulenger_sidewalk.jpg`, right).
- Terrain: all 120 terrains were rebuilt on claude/foundation (exact resampling); the gardens' base heights come from
  the DTM, so **all 120 tiles of `data/gardens/` were rebuilt** (3 times this round: new terrain, drawn surfaces, style
  mix + gate widths). JOINS (`window.__gardens.contact(tile)`, now with the hedges): I6, H5, I5, J5, H6, J6, H7, I7, J7, D8:
  **0 floating segments, 0 buried railings, 0 floating pillars, 0 floating hedge modules** (8 932 modules checked).

### 2. Look check against real images (LOOK only: nothing traced, stored or shipped)

Google Street View (looked at in the browser, 2026-11-14) and Wikimedia Commons photos:

| where | what is really there | what the city drew (round 1) | change |
|---|---|---|---|
| Avenue Alphonse XIII 53 (I6, Street View 04/2024) | a clipped privet-like hedge ~1.5 m ON the sidewalk's back edge, a wooden gate; hedges and shrubs along the street | brick wall + lance railing (street's dominant style), no hedge (hedges were off) | hedges on; villa mix hedge-heavier |
| Avenue Hippolyte Boulenger 16 (I6, Street View 06/2014) | sloping street: red-brick low walls and brick planters stepping with the slope, a grey concrete retaining wall with a planted bank behind | low klinker walls + lance railings, pillars | retaining walls already grow with the garden (416 runs); walls without railings are now likelier (wall + hedge front) |
| Rue de Calevoet (D8, Street View 05/2009) | a green welded-mesh fence with a conifer hedge behind; rendered walls opposite | hedges (laurel) with gate pillars | matches the hedge; no mesh-fence piece yet (left to do) |
| Avenue Brugmann 422 (F3, Street View 10/2020) | a low clipped box / privet hedge on a stone edging round an apartment block | n/a (forecourt rules) | box hedges 0.5-0.75 m kept |
| Avenue Henri Pirenne (F3, Street View 04/2024) | a tall (~1.8 m) brick garden wall with ivy / a hedge spilling over | villa walls 0.6-1.5 m | villa walls now 0.7-1.8 m |
| Avenue Albert Lancaster (H5; Commons, Sjenghai 2025, CC BY-SA 4.0) | villas behind clipped hedges, low brick walls with a hedge, tall ivy fences | rail / wall / hedge mix | hedge-heavier villa mix, new "low wall + hedge" front |
| Avenue Adolphe Dupuich (Commons, charles lecompte, CC BY-SA 3.0) | villas: yew / beech hedges 1-2 m, brick walls with piers and stone caps and a hedge behind | as above | as above |
| Avenue Brunard (Commons, Sjenghai 2026, CC BY-SA 4.0) | a rubble-stone low wall with a hedge, tall laurel / ivy hedges opposite | as above | as above (no rubble-stone wall material yet) |
| Rue Dodonée, Avenue Beau-Séjour, Avenue Molière (terraces; Commons: GdML CC BY-SA 4.0, Sjenghai CC BY-SA 4.0, charles lecompte CC BY-SA 3.0) | shallow fronts: a low brick / stone plinth with a black wrought-iron railing (~0.8-1 m), brick piers (some with white stone ball finials), shrubs behind | low wall + railing 36 %, + hedge 16 % | kept (rail 34 %, rail + hedge 20 %); ball finials left to do |
| Avenue du Hoef (Commons, charles lecompte, CC BY-SA 3.0) | a 1960s apartment block: a low brick wall with a clipped hedge behind | modern / wall | "low wall + hedge" front |
| Rue Xavier De Bue (Commons, GdML, CC BY-SA 4.0) | shops on the sidewalk line: no front gardens | none (shop rule) | correct |

Result (`build_gardens.py` TERRACE_MIX / VILLA_MIX): terraces rail 34 %, rail + hedge 20 %, brick wall 16 %, low wall +
hedge 10 % (new), hedge 10 %, modern 5 %, open 5 %; villas 8 / 20 / 8 / 14 / 38 / 6 / 6 %; villa brick walls 0.7-1.8 m;
the low wall + hedge front: a 0.3-0.6 m wall, a 1.1-1.7 m hedge 0.5 m behind it. Wall heights (0.32-0.6 m under railings
of 0.75-1.05 m), railing types (lance bars, black / anthracite / dark green), brick piers with caps and the brick tones
matched the photos; the photos' hedges were the big miss.

### 3. Mesh audit (`tools/mesh_audit`) and the LOD hand-over

- Ironwork (`node tools/mesh_audit/cli.mjs models/gardens/gardens.glb --nodes <piece>_lod<k>`, each of the 27 pieces x
  LODs alone): round 1 had 1 516-6 188 blocking items per LOD set (coplanar side faces: the spear gates' bars doubled
  through the top rail, the rings railing's 14 mm bars in a 14 mm rail, gate rails ending flush in the stiles = a slit).
  Fixed in `tools/blender/gardenKit.py` (one bar through the rail, rails 20 mm deep, rails 5 mm into the stiles and the
  stiles 5 mm past the rails), GLB rebuilt with the AO bake and previews: **0 blocking on all 27**. Warnings left:
  slivers (bars are long and thin by nature), "near" (bars through rails, 2-3 mm).
- JS pieces (`node tools/gardens/auditJsPieces.mjs`: wall, slab / saddle coping, pillar, pier cap, hedge, 3 LODs each):
  **0 blocking** (the hedge body had smooth section normals over planar strips, "bentflat": now flat per strip).
- LOD hand-over (`debug/gardensLodFlight.js`): every frame, every instance a LOD's shader band may draw must be in that
  LOD's pool (round 2: re-gathered every 2 m with a 4 m margin; since 2026-11-14 streamed with a 6 m margin, the same
  check in `debug/driveStutter.js` popCheck; the hand-over is the dithered band). Avenue Alphonse XIII, 169 m at
  14 m/s at eye height (659 frames, 78 re-gathers, 2.04 M instance-LOD checks) and at 30 m/s 30 m up (278 frames,
  0.85 M checks): **0 missing (no pop)**.

### 4. Hedges: instanced modules, on

Round 1's city hedges were the foliage system's merged meshes (`buildHedges`): one mesh per tile per species, body +
cards (up to 10 draws a tile, 90-200 k triangles a tile, every card of the tile drawn wherever the camera stood, a new
material set per tile: ~+75 draws / ~400 k triangles at I6). Now `viewer/gardens/gardenHedge.js`: each run cut into
~1 m modules of ONE unit clipped-hedge piece (battered sides, rounded top corners, closed ends; LOD0 160 / LOD1 54 / LOD2
20 triangles; bands 30 / 90 / 300 m), sheared to the slope and scaled to the run's height and width, lumps displaced in
the vertex stage from a noise in RUN metres (continuous over module joints), the foliage hedge's shading (clumps,
crevices, soft holes, bump, the species colour by season, snow), the species per instance; leaf cards (64 per module,
coverage-preserving mips, spread in world metres in the vertex stage) near only (shrink 10-18 m, band 22 m). Drawn
through the kit's pools like everything else: **4 draws for the whole city (3 body LODs + cards) and one fixed material
set**. JOINS: each module goes down to the lowest ground along it (0 floating). Collisions: each module a stand-in box.
City counts: 64.5 km of hedge (round 1: 46.5 km), ~8 000 modules over the 9 tiles round I6.

### 5. Cost (another agent's tab rendered the city on the same GPU all session: `tools/perf/preflight.ps1` **RED**
(CPU 42 % busy at rest, 1.3 GB free, Chrome 7.4 GB, GPU 100 % busy at rest / power cap). A/B alternated in one page
(`debug/gpuAB.js alternate`, 6 rounds, garden group hidden / shown), so both sides see the same load:

| view | draws | triangles | GPU p50 |
|---|---|---|---|
| street level, Avenue Alphonse XIII (1462, 725, eye height), 9 tiles, `traffic=0&trams=0` | 537 → 573 (+36, shadows included) | 6.68 M → 6.90 M (+0.22 M) | 10.37 → 10.83 ms (+0.46, per round +0.13 .. +0.92) |
| the same, hedges only (hidden / shown) | +6 | +52 k | +0.00 (-0.13 .. +0.13) |
| reference view (`?ring=1&far=1&time=golden&traffic=0`, 1400 x 850) | 369 → 369 | 4.886 M → 4.886 M | nothing drawn (the overview camera is beyond every band); the 0.89 ms "difference" there is the background noise |

Kit per pass at street level: 157-165 k triangles, 32 kit meshes; gather 1.5-4.7 ms every 2 m of travel (9 tiles,
~60 k instances + 8 k hedge modules) - **since 2026-11-14 (claude/gather-perf) streamed time-sliced: <= ~0.5 ms in any
frame, see Performance**. **GPU ms on a GREEN machine: still to re-measure** (the owner's perf session).

### 6. Collisions before / after (`window.viewer.collisionTest(tile, { walk: true })`, `ring=0`) and the gate walk

| tile | static invisible / missing | drive contacts / passed / blocked | walk contacts / passed / fell / stuck / blocked |
|---|---|---|---|
| I6 `?gardens=0` | 0 / 5 | 70 / 0 / 41 | 8 / 3 / 1 / 0 / 31 |
| I6 gardens on | 0 / 5 | 79 / 0 / 44 | 120 / 4 / 1 / 0 / 33 |
| D8 `?gardens=0` | 360 / 13 (pre-existing) | 36 / 0 / 33 | 3 / 1 / 0 / 1 / 10 |
| D8 gardens on | 360 / 14 | 41 / 0 / 35 | 155 / 1 / 0 / 1 / 12 |

The one new I6 "passed" is a walker going through an open opening between two pillars (1035.2, 637.5 / 1036.4, 636.6):
meant to be walkable. D8's one new static "missing" is a 0.38 m2 cell at the tile border (-1076.3, 1999.7). Walls are
solid for the walker (contacts 8 → 120, 3 → 155) and the car; 0 invisible hits.

Gate walk (`debug/gardensWalk.js run(tile)`: the third-person controller walks from 1.5 m out on the sidewalk through
each open pedestrian gate into the garden, and at the middle of wall / railing stretches and hedges). Round 1's
pedestrian openings were 1.1 m between the pillars' centres (0.74 m clear) and some led into a building standing right
behind the line; now 1.3 m (0.94 m clear, a real garden gate) and no gate where a building is within 0.6 m behind the
line (606 dropped city-wide):

| tile | open gates walked through | walls / railings held | hedges held |
|---|---|---|---|
| D8 (villas) | **21 / 22** (the one: a LiDAR tree trunk 0.32 m behind the gate) | **60 / 60** | **54 / 54** |
| I6 | **39 / 52** | **60 / 60** | 59 / 60 |

I6's 13: 5 where the garden rises 0.9-2.4 m within 1.5 m of the line (Montagne de Saint-Job, Chaussée de Saint-Job: no
front steps are drawn, the walker does not climb that), 2 where a pillar of the NEIGHBOURING front stands in the
opening, 6 where the walker stops at a 10-20 cm lip at the sidewalk's back edge (the sidewalk mesh's edge face where the
garden lies higher than the paving: the city's ground, not the gate). The one hedge a walker got through (1131.5, 864.4)
is a 0.73 m box hedge: it stepped over the end of it. Left to do (below).

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
| hedges (round 1) | (the foliage system's) | hidden past 260 m | `viewer/foliage/hedges.js buildHedges` on runs 0.45-0.5 m behind the wall line (not a second hedge system): with `?gardenhedges=1`, a coarser body (`{ step: 0.6, split: 0.32, cards: 0.6 }`) |

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

## Placement (`tools/gardens/build_gardens.py` → `data/gardens/<T>.json`, 120 files + `summary.json`, 12 MB)

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
- **Openings**: the front door projected along the face normal onto the run: a 1.3 m opening (round 2; 1.1 m in round 1) with a pedestrian gate,
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

**Counts (Uccle, round 2 build):** 16 750 runs (866 open lawns); **51.9 km of wall, 27.4 km of railing, 64.5 km of hedge**;
3 858 pedestrian gates (open; 606 dropped where a building stands right behind the line), 2 732 closed driveway gates,
7 839 open driveway openings, 412 retaining runs. (Round 1: 15 993 runs, 53.1 km wall, 37.6 km railing, 46.5 km hedge,
4 110 pedestrian gates.)

## Performance

- ONE pool per piece for the whole city (15 pieces x 3 LODs), STREAMED by `viewer/instanceStream.js` (2026-11-14,
  docs/perf/AUDIT.md "Step 9"): each tile's instances become per-piece sources once (columns in the pool's layout,
  sorted in 50 m cells; a gather copies whole cells / runs, tests instances only in cells on a band edge, allocates
  nothing); a gather every 2 m of travel, each LOD holding its band + 6 m, TIME-SLICED over 1-4 frames inside the
  city's streaming budget (0.45 ms a frame shared with the other pools, the façade kit and the trees); the tile fade is
  a uniform per tile slot (`gardenFades`, iBand.w = the slot): a fading tile never re-gathers. Driving 14 m/s: the
  gardens' update over 0.5 ms in 1-5 of ~2,700 frames (was 624-688), max 0.6-0.9 ms (was 3.9-9.4); 0 pops
  (`debug/driveStutter.js` pop check, 6 M instance-LOD checks). THREE shared materials (one per LOD) for the whole kit. Static instanced
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

- On by default. `?gardens=0`: no gardens (the city as before). `?gardenhedges=0`: without the hedges.
- Gardens Lab: `labs/gardens-lab.html` (`?layout=lod`, `?slope=0.08`, `?view=<preset>`, `?night=1`, `?hedges=0`).
- `window.__gardens.report()` (instances, live per LOD, triangles per pass, gather ms), `.contact(tile)` (JOINS check, hedges included).
- Checks: `debug/gardensLodFlight.js` (`fly({ path, speed, height })`: LOD pool vs band every frame),
  `debug/gardensWalk.js` (`run(tile)`: gates / walls / hedges with the third-person controller),
  `node tools/gardens/auditJsPieces.mjs` (mesh audit of the JS pieces), `node tools/gardens/drawnSurfaces.mjs <T>`.

## Shared files touched (for a careful merge)

Round 2 (claude/gardens2):

| file | change |
|---|---|
| `viewer/surfaces.js` | `smoothCurves`: the loop over pieces (after `const curve = ...`): `EDGE_RATIO` / `bends()`; an outer-edge piece > 4 x its neighbour keeps its tangent; `radius(k, on)` takes the bent flag. Kerbs unchanged |
| `viewer/tileWorker.bundle.js` | rebuilt (`node tools/build_worker.mjs`): only that change (12 lines) |
| `viewer/main.js` | two comments only (the gardens are on by default) |
| `docs/TODO.md` | the FRONT GARDENS entry |

New in round 2: `viewer/gardens/gardenHedge.js`, `tools/gardens/{drawnSurfaces.mjs,auditJsPieces.mjs}`,
`debug/{gardensLodFlight.js,gardensWalk.js}`, `docs/assets/gardens/r2_*.jpg`. `viewer/foliage/hedges.js` is no longer used by
the gardens (its `opts` from round 1 stay, harmless). `tools/worker`: `npm ci` there is needed for the two node tools.

Round 1:


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
- Look (round 1): from knowledge of Brussels / Uccle front gardens. Round 2: checked against Google Street View (LOOK
  only, nothing stored) and Wikimedia Commons photos (authors and licences in "Round 2, 2. Look check"; none is shipped).

## Screenshots (`docs/assets/gardens/`) and previews (`models/gardens/previews/`)

- Round 2: `r2_I6_alphonse_top_after.jpg` (Avenue Alphonse XIII from above: the wall on the paving's back edge, no lawn
  strip), `r2_I6_alphonse_street.jpg` (the same street at eye height), `r2_D8_calevoet_hedges.jpg` (Rue de Calevoet: the
  instanced laurel hedges with gate pillars). Previews re-rendered with the fixed ironwork.

- `city_I6_boulenger_sidewalk.jpg`: Avenue Hippolyte Boulenger from the sidewalk, low klinker walls with blue-stone
  copings and lance railings, hedges behind (`?gardenhedges=1`).
- `city_I6_boulenger_villas.jpg`: the same street's villas: sand-brick walls, pillars, railings and hedges.
- `plan_I6_villas.png`, `plan_I6_terraces.png`: the builder's plan view (`--debug`): faces with a garden (green), doors
  (blue), runs (red), walls (dark red), railings (black), hedges (green), pillars (orange), gates (blue = pedestrian,
  magenta = driveway), ramps (light orange).
- `models/gardens/previews/gardens_lod0.jpg`, `gardens_close.jpg`, `gardens_lods.jpg` (Cycles).

## Left to do

- GPU ms on a GREEN machine (this round's A/B ran under a RED preflight: another agent's tab on the GPU).
- Gates the walker cannot use: front steps where the garden rises behind the gate (I6 Montagne de Saint-Job); a
  neighbouring front's pillar in an opening (drop it at build time); the 10-20 cm lip at the sidewalk's back edge where
  the garden is higher (a city-ground item: the sidewalk's edge face vs the welded terrain).
- Look: green welded-mesh panel fences (very common round villas, e.g. Rue de Calevoet) and wooden fences (OSM fences
  are drawn as hedges); rubble-stone walls (Avenue Brunard); white stone ball finials on piers (Rue Dodonée); ivy on
  walls and fences. Garage ramps / driveway paving are not drawn (the openings are); the driveway gates are closed boxes
  for the car.
- The painted façade draws a door on every street face of the buildings the façade kit does not take: those get a gate
  too; a façade-kit house's second street face gets none.
- Data size (12 MB): could be compacted (integer centimetres, no per-garden list). The gather is time-sliced now (see
  above); what is left is the draws: ~25-35 garden meshes drawn at street level (+ shadow passes), ~0.8 ms more
  main-thread render CPU a frame with the gardens on (driving harness, cpu p50 10.3-10.9 vs 9.2-9.7 ms): a BatchedMesh /
  multi-draw of the pieces that share a material (one per LOD) would cut it.
