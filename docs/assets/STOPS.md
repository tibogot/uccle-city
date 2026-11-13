# STIB stops, shelters and street ad panels (branch claude/stops, 2026-11-13)

Kit 1 of `docs/assets/STREET_KITS.md` plus the free-standing ad panel of kit 2. **On by default.** `?stops=old` gives
back the city as it was before: the street life's box shelters and flag poles, furniture.js's placeholder pole and
shelter (with `?streetlife=0`), and tram.js's placeholder shelters on the platforms.

## What was built

| piece | where | triangles LOD0 / 1 / 2 | notes |
|---|---|---|---|
| bus / tram shelter | `tools/blender/stibStops.py` → `models/stops/stibstops.glb` | 3964 / 548 / 304 | 3.9 x 1.45 m, 2.42 m high. Anthracite steel frame (80 mm posts), a 120 mm roof slab with a drip groove and an LED strip, two back glass panes in 50 mm rails with gaskets, a half-depth windbreak pane at the open end, a 4-slat steel bench on flat legs, a lean rail. At the other end the **lit double-sided poster case** (1.36 x 2.16 m) stands across the shelter as its end wall |
| STIB stop pole | same | 1996 / 228 / 100 | 76 mm grey tube, 3.4 m. The flag (0.56 x 0.80 m) has a red header band with a plain white roundel (no logo) over a white panel. The timetable case sits at eye height and faces the sidewalk |
| free-standing ad panel | same | 1408 / 236 / 96 | The same poster case (1.40 x 2.16 m, poster 1.185 x 1.75 m each side) on a foot pillar, with a crowned cap |
| poster atlas | `tools/stops/make_posters.py` → `textures/posters/stops_posters.jpg` (2048 x 1536, 319 KB) | | Eight posters we designed ourselves: abstract, typographic, and made-up city events (tree night, seasonal market, shapes exhibition, car-free Sunday, reading week, open-air cinema, lights festival, park party). No brands, logos, people or copied adverts. Every name and date is invented |

- **Material slots** are set by name only: `frame_anthracite`, `steel_brushed`, `pole_grey`, `stib_red`, `white_panel`,
  `light_strip`, `rubber_black`, `poster`, `glass`. The palette lives in `viewer/stops/stopKit.js` SLOTS. Every opaque
  slot of a piece is drawn in one material with a per-vertex slot index.
- **AO**: a Cycles AO lightmap (`stibstops_ao.png`, 1024 px, contact AO from a ground plane) is used at LOD0. At LOD1
  and LOD2 the AO is sampled per vertex.
- **Bevels**: 4-12 mm, 2 segments, each step its own flat facet. The mesh audit (`tools/mesh_audit`, per piece) reports
  **0 blocking** items for each piece. The reports are in `models/stops/audit/`. The remaining warnings are slivers
  along the long bevel strips.
- **Legs**: posts, plinths and foot pillars run 0.5 m below the origin (JOINS rule). The piece stands at its uphill
  foot minus 10 cm, and the downhill feet still reach into the ground.
- **LODs** are made in `viewer/stops/stopKit.js` with meshoptimizer at load time, never with Blender decimate:
  - LOD1 and LOD2: welded by position and slot, simplified to 6 mm and 2.5 cm, normals rebuilt with a 25 degree
    crease, AO per vertex.
  - Bands (switch 0→1, switch 1→2, end): shelter and panel 45 / 140 / 500 m, pole 30 / 100 / 320 m.
  - The hand-over uses the dithered cross-fade of `viewer/lodFade.js`. The shadow pass uses the same mask, so shadows
    do not snap.
  - The glass fades out by opacity before 170 m (shelter) and 60 m (pole case).
- **Night**: the posters, the poster case's light margin, the roof LED strip and the roof name board glow through
  their emissive slots, scaled by `env.uNight`. No light is added (fixed light count). The poster glow was lowered
  from 1.9 to 0.75 after the first city night check, where it blew out.
- **Text**: the flag carries the stop name (FR / NL) and the line numbers in their own GTFS colours. The shelter
  carries a name board under its roof front. Both are drawn as the street-life layer's SDF boxes (`viewer/streetlife/`,
  the shared atlas), so they cost no extra draw.

## Sources looked at (look only, nothing traced, stored or shipped)

- Google Street View, Avenue Circulaire / Ringlaan at the "Observatoire" stop, Uccle (April 2024), from two
  viewpoints. It shows the shelter's proportions, the poster case as the end wall, the open front to the road, the
  pole with its red-banded flag and the timetable case.
- Wikimedia Commons, "Bus shelters in Brussels" category (an older shelter type, not used).
- Data:
  - STIB stops: Brussels Mobility WFS `bm_public_transport:stib_stops`.
  - Served lines and line colours: the STIB-MIVB GTFS 2_25_20261109 (CC BY 4.0, "Source: STIB-MIVB - Open Data"),
    downloaded to `data/raw/gtfs/stib.zip` (git-ignored; the curl is in `pipeline/build_transit.py`).
  - Shelters: OSM `shelter=yes` on bus_stop / platform nodes (matched on `ref:STIB_MIVB`) and on bus platform ways.
  - Street: the UrbIS sidewalks / squares, footprints, trees, OSM points and house numbers already in `data/`.

## Placement (`tools/stops/build_stops.py` → `data/stops/<T>.json`, 121 files, 374 KB; deterministic)

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/stops/build_stops.py --all --raw <main checkout>/data/raw
```

- **Kerb**: from the WFS point, walk away from the road centreline to the first measured sidewalk or square. The WFS
  point is often in the carriageway. The sidewalk depth is how far that surface runs before a building. Where no
  sidewalk is measured, the road engine's half width is used.
- **Pole**: 0.45 m behind the kerb. If a tree, bench, rack, signal, door or driveway is in the way, it slides up to
  3 m along the kerb. Its flag looks along the street.
- **Pole on a tram island**: for a tram stop within 25 m of an OSM tram platform, the pole goes on the platform
  centreline (+25 cm).
- **Shelter**: where OSM says there is one. It is placed:
  - open to the road, roof edge 0.6 m behind the kerb, on a sidewalk of 2.45 m or more;
  - back to the road on a 2.1 - 2.45 m sidewalk (narrow Brussels pavements);
  - not at all on anything narrower.

  It goes beside the pole, with the pole at its open end, or on the other side, or further along (2.55 to 7 m).
  It keeps clear of trees (0.9 m), buildings, doors (house numbers, 1.2 m), driveways (service roads, 2.5 m) and
  benches / racks / signals (0.6 m). A spot with a foot drop over 0.42 m is rejected.
- **Tram-platform shelters**: tram.js still finds them (OSM platform ways, shelter=yes) but now hands them over as
  sites to the kit, which draws them with the new model. They are not doubled on the sidewalk.
- **Free ad panel** (rule-based: OSM maps almost none):
  - Candidates: 18 m along every main road (trunk / primary / secondary / tertiary) out of every junction where 3 or
    more roads meet, at least one of them main.
  - Ranking: more main roads first, a UrbIS square within 40 m first, the right-hand sidewalk first.
  - Greedy pick across the whole city: at least 150 m between panels, at least 25 m from any stop, at least 4 m from
    crossings.
  - Across the sidewalk (faces along the street) when it is 3.5 m or deeper, along it (faces the road) when 2.3 m or
    deeper. A 1.5 m walkway is always left.
- **Lamps** (procedural, `viewer/lamps.js`): a lamp that lands on a stop's footprint (+0.7 m) slides 3 or 5 m along
  the kerb, or is dropped. On I6, 1 lamp was moved and 0 were dropped.

**Counts**:

| what | count | notes |
|---|---|---|
| STIB stops | 278 | |
| poles | 278 | 95 of them on tram platforms |
| shelters with OSM shelter=yes | 106 | |
| sidewalk shelters placed | 85 | 80 open to the road, 5 back to the road |
| shelters with no room (sidewalk < 2.1 m) | 20 | |
| shelters blocked | 1 | |
| tram stops whose shelter is on the tram platform | 5 | drawn by tram.js's platform sites, plus all of tram.js's own platform shelters |
| free ad panels | 144 | 74 across the sidewalk, 70 along it |
| tiles with something | 78 | |

Busiest tiles: E1 (10 stops, 6 shelters, 4 panels), H3 (7 / 6 / 4), D1 (6 / 6 / 3), E10 (6 / 5 / 2), H6 (6 / 4 / 2).

Served lines come from the GTFS for 257 stops and from the WFS for 21. They differ from the WFS list for 94 stops:
the GTFS has the night lines (N10...), and the WFS still lists a line "210" at Saint-Job that the current feed serves
as N10. The GTFS is taken as the truth.

## Performance

How it is drawn:
- **One pool per piece for the whole city** (`StopPool`, like the street life's PropPool). It is refilled every 4 m
  of camera travel, or every frame while a tile fades (its fade rides in `iBand.w`).
- Static instanced buffers with `needsUpdate` and update ranges over the live count. No DynamicDrawUsage.
- A pool mesh with nothing to draw is not visible.
- Pipelines for every stop, shelter and panel in the city: 5 shared materials (3 opaque LODs, poster, glass).
- At most 13 meshes in total; usually 5-8 are drawn.
- Shadows: opaque LODs only (dithered). The posters and glass cast none.

| where | measured |
|---|---|
| Stops Lab, one of each | 7 stop meshes, 12 draws for the whole frame (with shadows) |
| Stops Lab, "street of 40" (120 pieces down 600 m, every LOD visible) | 13 stop meshes, 23 draws for the whole frame, 70 k triangles |
| city, Place Saint-Job, same camera (I6, ring 0) | 307 draws with the kit, 309 with `?stops=old` (the old box shelters were per-tile boxes in the street life's box draw). The pools' gather takes 0.3-0.7 ms every 4 m |
| kit load | 60-160 ms (GLB, AO, posters, meshopt) |

**GPU ms: not claimed.** `tools/perf/preflight.ps1` was **RED** during this work: CPU 100 % busy, 1.4 GB free memory,
6.7 GB in Chrome, GPU held back (power cap) and 78 % busy at rest. Another agent (claude/bridges2: Blender, its own
Chrome tab) was using the GPU. The lab reported ~1.1 ms (one of each) and ~1.4 ms (street of 40) for the whole frame
under that load; these numbers are indicative only.

## Collisions (`window.viewer.collisionTest('I6', { walk: false })`, tile I6, ring 0)

| | before (`?stops=old`) | after |
|---|---|---|
| static: invisible / missing | 0 / 5 (all buildings) | 0 / 5 (the same buildings) |
| drive: invisible hits / passed through / fell / stuck | 0 / 0 / 4 / 1 | 0 / 0 / 2 / 1 (pre-existing items, nowhere near a stop) |
| car colliders from the furniture (featureColliders) | 14 boxes, 51 posts. The 3 tram-platform shelters were colliders. The street life's 2 box shelters and 10 flag poles were drawn with **no collider** and were not in the test's truth | 17 boxes, 61 posts: 5 shelters (2 sidewalk + 3 tram platform), 1 ad panel, 10 stop poles |
| walk (`{ drive: false, walk: true }`): invisible / passed through | 0 / 2 | 0 / 3 |

How it works: each tile carries an InstancedMesh per piece named `furniture-shelter`, `furniture-stopPole` and
`furniture-adpanel`. It holds LOD1's triangles plus the glass at the drawn matrices, with `visible = false` (the pools
draw). The car (`viewer/drive` featureColliders), the walker / third person (`viewer/character/cityHook`: the shelter
and the panel as triangles in the BVH, so you walk in under the roof) and the collision test all read it.

The walk test's extra "passed through" (1194.0, 579.5) is the walker's centre 0.3 m behind the back glass of a
tram-platform shelter, i.e. the body touching the pane (radius 0.3 m). It is one cell, at the platform's edge. The old
placeholder there was not reached by the route.

## Switches

- `?stops=old`: everything as before (see the top).
- `?streetlife=0`: the kit is still drawn but has no text (the flags are blank white).
- Stops Lab: `labs/stops-lab.html`. It has one of each or a street of 40, day / night, the poster pick, shadows,
  wireframe, camera presets, and draws / triangles / GPU ms.

## Shared files touched (for a careful merge)

| file | change |
|---|---|
| `viewer/main.js` | +1 import (`cityStops`). In `loadTile`: `stopsP = cityStops.fetchTile(...)` after `streetLifeP`; `await stopsP` and `place: cityStops.keepLampsClear(fit?.placeLamp, stopsDoc)` in `buildLamps`; the bus-stop filter of furniture also when `cityStops.on`; `buildTram(..., { shelterSites: cityStops.on })` then `cityStops.addTile(...)` and a `say(...)`; `cityStops.removeTile` in dispose. `await cityStops.start(...)` after `cityStreetLife.start` |
| `viewer/tram.js` | `buildTram(..., opts = {})`: with `opts.shelterSites` the platform shelters are returned as sites (yaw - PI: +z toward the track) and the placeholder mesh is not built; the return has `shelterSites` |
| `viewer/furniture.js` | comment only (MODELS.stopPole / shelter are the `?stops=old` placeholders) |
| `viewer/streetlife/layout.js` | `layoutTile(doc, measure, stopsDoc = null)`: with a stops doc, the stop TEXT boxes (flag name, line badges in GTFS colours, the shelter's roof name board) at the kit's positions; the old stop poles / flags / box shelters only when it is null |
| `viewer/streetlife/streetlifeWorker.js` | reads `stopsUrl` from the message and fetches `data/stops/<T>.json` |
| `viewer/streetlife/streetlife.js` | constructor option `stopsBase`, passed as `stopsUrl` to the worker |
| `viewer/streetlife/cityStreetLife.js` | `StreetLife.create(scene, { stopsBase })` unless `?stops=old` |
| `viewer/drive/driveMode.js` | `furniture-adpanel` added to the box regex |
| `viewer/character/cityHook.js` | `furniture-adpanel` is a "mesh" like the shelter |
| `labs/index.html` | Stops Lab card |

No tile-worker change (no bundle rebuild needed). New: `viewer/stops/{stopKit,cityStops}.js`, `tools/blender/stibStops.py`,
`tools/stops/{build_stops,make_posters}.py`, `models/stops/`, `textures/posters/`, `data/stops/`, `labs/stops-lab.*`.

## Screenshots (`docs/assets/stops/`)

- `city_before_place_saint_job_old_boxes.jpg` / `city_after_place_saint_job_shelter.jpg`: the same camera, before and
  after. Before, the box shelter stood at the WFS point at the kerb, with the line "210". After, the kit stands on
  the measured sidewalk, with the name board.
- `city_after_flag_name_lines.jpg` (the flag with "Place Saint-Job / Sint-Jobplein" and N10 in its GTFS colour),
  `city_after_tram_platform_shelter.jpg`, `city_after_night.jpg`.
- `lab_day_street.jpg`, `lab_night_street.jpg`, `lab_inside_poster_close.jpg`, `lab_adpanel_back_face.jpg` (the
  back face reads correctly, not mirrored), `lab_lod1_up_close.jpg`, `lab_street_of_40_lods.jpg`.
- The Blender previews are in `models/stops/previews/`.

## Left to do

- The 5 tram stops whose shelter is on a tram platform get no roof name board: tram.js's sites carry no stop name.
- OSM-only (De Lijn / TEC) bus stops are not drawn: the kit takes the STIB WFS stops only. The old furniture.js poles
  for them came back only with `?streetlife=0`.
- 20 sheltered stops have no shelter because their sidewalk is under 2.1 m deep. A slim shelter variant would fit
  some of them.
- The walk-test grazing contact behind one platform shelter (see above).
- Night: the posters and margins glow. There is no light pool on the pavement (a lamp-light-map entry for each case
  would be the next step, with no new light).
- GPU ms must be measured on a GREEN preflight.
