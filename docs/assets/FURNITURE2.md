# Street furniture kit 2: benches, bike hoops, bike boxes, bins, glass banks (branch claude/furniture2, 2026-11-13)

Kits 3 ("seating and bikes") and 5 ("cleanliness") of `docs/assets/STREET_KITS.md`, built like the STIB stops kit
(`docs/assets/STOPS.md`). **On by default.** `?furniture=old` gives back the city as it was: furniture.js's placeholder
benches and bike racks at the OSM points, the street life's glass bubbles, no bins, no bike boxes.

## What was built

| piece | LOD0 / 1 / 2 triangles | bands (m) | what it is |
|---|---|---|---|
| `bench_street` | 1764 / 258 / 154 | 25 / 70 / 220 | The Uccle street bench (Av. Bourgmestre Jean Herinckx): three wide wooden seat slats, two back slats, two dark steel side frames with a low stretcher, foot plates, carriage bolts. 1.8 m, seat 0.46 m |
| `bench_park` | 5572 / 544 / 220 | 25 / 70 / 220 | The classic park / square bench: curved cast side frames (cabriole front leg, raked back support, scrolled armrest), five narrow seat slats, three back slats, long stretcher. 1.9 m |
| `bench_backless` | 2172 / 266 / 106 | 25 / 70 / 220 | Five slats on two flat-bar U frames (OSM `backrest=no`) |
| `hoop` | 920 / 436 / 78 | 18 / 50 / 140 | The Brussels "arceau": inverted U of 48 mm dark-grey tube, 0.80 m high, 0.70 m between the legs, paving collars |
| `bikebox` | 3780 / 799 / 177 | 35 / 110 / 350 | The parking.brussels covered bike box (OSM `bicycle_parking=shed`, 5 bikes): a ribbed dark barrel shell between two light-grey end panels perforated with a bicycle drawing (dots 3 mm proud), the door with handle, lock and a blank user plate on the walkway side, a galvanised base on levelling feet. 1.98 x 2.1 x 1.35 m |
| `bin_round` | 4128 / 870 / 270 | 20 / 60 / 180 | The Bruxelles-Propreté classic round bin (Square des Héros, Place Saint-Job): dark green pebbled drum on a ribbed foot, the dark red bag band, a 16-flute dome lid with the round mouth |
| `bin_column` | 2074 / 316 / 115 | 20 / 60 / 180 | The slim dark-green column bin of the STIB stops (Dieweg): fluted front, the open mouth under a sloping hood, on its own square post |
| `glassbank` | 4218 / 1051 / 136 | 35 / 110 / 320 | The Bruxelles-Propreté glass bank (Tenreuken, Auderghem): three bays (the middle one taller with the lifting hook), a round mouth with its ring per bay, a blank label plate, moulding seams, on a galvanised skid. ONE mesh, two palettes per instance: white glass (white bays, black rings) and coloured glass (grey bays, a dark petrol middle bay, orange / green rings). It replaces the street life's round "bubbles" (the real Brussels banks are these three-bay boxes) |

- Script: `tools/blender/streetFurniture.py` → `models/furniture2/furniture2.glb` (+ `furniture2_ao.png`, `furniture2.json`,
  `previews/`). Named slots only (`wood_slat`, `frame_dark`, `cast_green`, `hoop_grey`, `galvanised`, `alu_panel`,
  `box_shell`, `rubber_black`, `white_plate`, `bin_green`, `bin_band`, `bank_hull`, `bank_bay`, `bank_ring`,
  `bank_ring_mid`); the palette is in `viewer/furniture2/furnitureKit.js` SLOTS, with an A / B colour per slot mixed
  by the instance's `iVar.x` (metal-slatted benches: OSM `material=metal`; white / coloured glass banks).
- Wood: per-instance tone (weathered grey-brown to freshly oiled), and at LOD0 a grain from UV0 (metres along the slat).
- Bevels 4-12 mm (2 segments, each step its own flat facet), swept rounded-rectangle bars for the frames, 14-48 sided
  round parts. AO: one Cycles lightmap for the kit (1024 px, contact AO on a ground plane); LOD1/2 take it per vertex
  from the lightmap at their triangles' centroids (a corner's own texel lies in the bake margin: LOD1 came out darker).
- Mesh audit (`tools/mesh_audit`, per piece, reports in `models/furniture2/audit/`): **0 blocking** for every piece.
  Warnings are slivers along bevel strips, the bike box's dots (decals 3 mm proud) and the glass bank's moulding.
- JOINS: legs, posts, feet and the glass bank's skid run 0.3 m below the origin; the column bin's plinth 0.15 m. The
  contact check (`tools/mesh_audit/contact.js` on every instance's LOD0 at its city matrix against the tile's terrain and
  roads): **0 floating, 0 overhang** on E1 (90 pieces) and F5 (38 pieces, park benches on slopes).
- LODs: meshoptimizer at load (absolute error per piece, crease 25 deg; 45-50 deg for the round bin and the hoop, whose
  simplified sides meet at 30 deg), the dithered hand-over of `viewer/lodFade.js` in colour and shadow (same noise).
  Small pieces cast no shadow at LOD2 (their shadow dithers out with LOD1); the bike box and glass bank keep it.
- Night: nothing glows, no light added (fixed light count).

## Placement (`tools/furniture/build_furniture.py` → `data/furniture/<T>.json`, 98 files + `summary.json`, ~350 KB)

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/furniture/build_furniture.py --all --raw <main checkout>/data/raw
```

Deterministic, ~10 s for all of Uccle. Reuses the stops builder's street (`tools/stops/build_stops.py` Street: the
measured UrbIS sidewalks / squares, the kerb walk, buildings, trees, doors = house numbers, driveways) and keeps clear of
the STIB poles, shelters and ad panels in `data/stops/<T>.json`. Only inside the Uccle study area (as the tiles' OSM
features: outside it no buildings are drawn). Local frame of every piece: x along the kerb, +z = the road side.

- **Benches** (OSM `amenity=bench`, 215 in Uccle): `backrest=no` → backless; on a measured sidewalk / square near a road
  (or within 3 m of one: points are often drawn at the kerb) → street bench facing the road, its front at least 0.6 m
  behind the kerb; anything else (parks, greens, squares away from roads) → park bench at its own point facing the
  nearest footpath (or road). OSM `direction=` wins when mapped (6). Clear of buildings, trees (0.35 m), doors (0.9 m),
  driveways, crossings, signals / lamps / fountains, the STIB furniture; slid up to 3 m along / 1 m back. 26 were moved
  (at most 2.3 m); 13 had no clear spot and were kept at the OSM point (2 of them on a slope > 0.27 m sit lower uphill,
  never floating downhill).
- **Bike hoops** (OSM `bicycle_parking=stands / rack / safe_loops`): `ceil(capacity / 2)` hoops (2 bikes each; 3 without
  a capacity; at most 10) in a row along the kerb. Sidewalk >= 3.0 m: each hoop's plane ACROSS the sidewalk (bikes
  perpendicular to the kerb), 1.0 m apart, 1.15 m behind the kerb; 2.0 - 3.0 m: plane ALONG the kerb (bikes parallel to
  it), 2.2 m apart, 0.7 m behind; narrower: none. A hoop with its bikes' envelope that hits something is dropped, the row
  slides up to 4 m. Away from roads: the row at the OSM point. `wall_loops` (3) and painted `floor` bays: not drawn.
- **Bike boxes** (OSM `bicycle_parking=shed`, parking.brussels, capacity 5): on the sidewalk along the kerb when the OSM
  point is on a sidewalk >= 4.2 m deep (door to the walkway, 1.5 m left), else in the parking lane against the kerb
  (door to the sidewalk) when the kerb is >= 3.6 m from the centreline, never within 1.65 m of a tram track. The parked
  cars on its space are dropped (`cityFurniture.keepCarsClear`).
- **Bins** (OSM maps 1 waste basket in all of Uccle: rule-based, 1.5 m walkway always left, clear of trees, doors,
  driveways, crossings 2 m, the STIB furniture, benches, hoops, boxes, >= 15 m apart except stop / bench bins 8 m):
  1. every STIB stop (not on a tram island): a column bin 1.6 - 2.9 m along the kerb from the pole, away from the
     shelter, 0.45 m behind the kerb, mouth to the walkway;
  2. every group of benches (within 12 m): a round bin 0.45 m beyond a bench's end;
  3. every UrbIS square >= 300 m2: a round bin per 800 m2 (max 4) 1.2 m inside its edge;
  4. main roads (trunk .. tertiary): a column bin every 100 m of road, sides alternating, where no bin stands within 50 m.
- **Glass banks**: at the street life's glass-container sites (OSM, Bruxelles-Propreté; the 7 underground chutes stay with
  the street life): a white-glass + a coloured-glass bank side by side; mouths to the walkway on a sidewalk (6 sites),
  to the street on a verge / green (9 sites).
- **Height**: the walking surface (DTM + measured kerb lift) under the footprint's corners; the piece stands at the
  highest corner minus 3 cm; a drop > 0.27 m is rejected (slid / dropped / noted).
- **Lamps** (procedural): a lamp that lands on a piece (+0.5 m) slides 3 / 5 m along the kerb, else is dropped
  (`cityFurniture.keepLampsClear`, chained after the stops kit's).

**Counts (Uccle):**

| what | count | notes |
|---|---|---|
| benches | 215 | 42 street, 165 park / square, 8 backless; 16 with metal slats |
| bike parkings (OSM) | 242 | → 120 hoop rows (53 across, 46 along, 23 away from roads) with **367 hoops** (474 wanted: 80 had no room on a sidewalk < 2 m, 27 dropped one by one), **69 bike boxes** (52 in the parking lane, 16 on the sidewalk, 1 free; 21 no room, 15 lane spots refused next to a tram track) |
| bins | 413 | 91 at stops, 129 by benches, 10 on squares, 183 along main roads; 51 stops' sidewalks too narrow, 41 stops blocked, 319 main-road spots too narrow |
| glass banks | 30 | at 15 sites |
| lamps moved / dropped | e.g. E1 1 / 0 | runtime |
| parked cars dropped for bike boxes | e.g. E1 7, I6 1 | runtime |

Busiest tiles: F5 (21 benches on the Dieweg / Wolvendael square), F1 / E4 (hoops), D1 / E4 (bins).

## Performance

- ONE pool per piece for the whole city (`FurniturePool`, like `StopPool`), refilled every 2 m of camera travel (or every
  frame while a tile fades): 8 pieces x 3 LODs = at most 24 meshes, 3 shared materials (one per LOD) for every piece of
  the kit. Static instanced buffers with update ranges over the live count; a pool mesh with nothing to draw is hidden.
- Collision stand-ins are per tile, never drawn.

| where | measured |
|---|---|
| Furniture Lab, one of each (9 pieces) | 9 kit meshes, 17 draws for the whole frame (with shadows, 4 ground meshes), 41.6 k triangles |
| Furniture Lab, LOD row (40 of each = 320 pieces down 400 m) | 23 kit meshes, 43 draws for the whole frame, 170 k triangles |
| city E1, bench + bike box + hoop rows camera | 9 kit meshes drawn (bench 2 / 1 / 0, hoops 10 / 15 / 0, boxes 2 / 1 / 9, bins 2 / 2 / 0 per LOD): ~44 k kit triangles per pass; the pools' gather 0.2-0.8 ms every 2 m |
| kit load | 140-190 ms (GLB 2.0 MB uncompressed, AO, meshopt) |

**GPU ms: not claimed.** `tools/perf/preflight.ps1` was **RED** (0.7 GB free memory, 7.7 GB in Chrome, GPU 95 % busy at
rest under a power cap and SW thermal limit; another agent's city tab on port 8854 and its Blender job were running).
Indicative only, under that load: the lab 1.1 ms (one of each) and 1.5 ms (LOD row) for the whole frame. The city's
whole-frame draws / triangles swung 144-302 between frames from traffic, trams and shadow cascades, so a with / without
difference there is not claimed either.

## Collisions (`window.viewer.collisionTest(tile, { walk: true })`, ring 0)

| tile | before (`?furniture=old`) | after |
|---|---|---|
| I6 static: invisible / missing | 0 / 5 (buildings) | 0 / 5 (the same buildings) |
| I6 drive: invisible hits / passed through / fell / stuck | 0 / 0 / 2 / 1 | 0 / 0 / 2 / **0** (contacts 51 → 52, blocked 40 → 42) |
| I6 walk: invisible / passed through | 0 / 3 | 0 / 3 (the same three: a façade-kit piece, the known tram-platform shelter, a parked car) |
| E1 static / drive / walk | 0 / 0; 2 / 0 / 0 / 1; 0 / 0 | the same (contacts 59 → 61, blocked 54 → 55) |
| F5 (21 square benches) static / drive / walk | 0 / 1; 0 / 0 / 15 / 1; 1 / 0 | identical (the test's road routes do not reach the square) |

How: each tile carries an InstancedMesh per piece named `furniture-bench`, `furniture-bikes` (one instance per hoop),
`furniture-bikebox`, `furniture-bin`, `furniture-glassbank`, holding LOD1's triangles clipped at the ground, at the drawn
matrices, `visible = false`. The car (`featureColliders`: box kind, sliced at car height), the walker / third person
(`cityHook`: bench / hoop / bin as body-only "post" boxes, bike box and glass bank as "prop" boxes for body and camera)
and the collision test read them. The bike box's stand-in carries a plate over its footprint at 0.7 m: without it the
shell's inside (the roof is above the 1.3 m car slice) showed as "missing furniture" cells in the static test (11 on E1).

## Switches

- `?furniture=old`: everything as before (see the top). The street life keeps its bubbles then.
- Furniture Lab: `labs/furniture-lab.html` (`?layout=lod`, `?view=<preset>`): a street with each piece (bench + bin,
  park bench, backless bench, a hoop row, the bike box in the parking lane, the column bin, white + coloured glass banks),
  a LOD row, night, metal slats, wood tone, shadows, wireframe, camera presets, draws / triangles / GPU ms.

## Shared files touched (for a careful merge)

| file | change |
|---|---|
| `viewer/main.js` | +1 import (`cityFurniture`). In `loadTile`: `furnP = cityFurniture.fetchTile(...)` after `stopsP`; `furnDoc = await furnP` beside `stopsDoc`; lamps `place: cityFurniture.keepLampsClear(cityStops.keepLampsClear(...), furnDoc)`; the furniture.js point filter becomes a `dropKinds` set (bus stops as before + bench / bicycle_parking when the kit is on); `cityFurniture.addTile(...)` + a `say(...)` after `cityStops.addTile`; `buildCars(..., { place: cityFurniture.keepCarsClear(fit?.placeCar, furnDoc) })`; `cityFurniture.removeTile` in dispose. `await cityFurniture.start(...)` before `cityStops.start` |
| `viewer/streetlife/cityStreetLife.js` | `StreetLife.create(scene, { stopsBase, noBubbles: ?furniture !== "old" })` |
| `viewer/streetlife/streetlife.js` | constructor option `noBubbles`, passed in the worker message |
| `viewer/streetlife/streetlifeWorker.js` | with `noBubbles`, `doc.glass` keeps the underground sites only (chutes) |
| `viewer/drive/driveMode.js` | `bikebox|bin|glassbank` added to the furniture box regex |
| `viewer/character/cityHook.js` | `furniture-bikebox` / `furniture-glassbank` are "prop"; `bin` added to the "post" regex |
| `labs/index.html` | Furniture Lab card |

No tile-worker change (no bundle rebuild). New: `viewer/furniture2/{furnitureKit,cityFurniture}.js`,
`tools/blender/streetFurniture.py`, `tools/furniture/build_furniture.py`, `models/furniture2/`, `data/furniture/`,
`labs/furniture-lab.*`, `docs/assets/furniture2/`. Note: the old unmerged branch `claude/furniture` (2026-11-04) also has a
`labs/furniture-lab.html` and `tools/blender/furniture.py` (another, older kit): if it is ever merged, rename one lab.

## Sources (look only: nothing traced, stored in the repo or shipped)

- Google Street View, Uccle, April 2024: the bike box and the hoops at the corner of Rue de Stalle / Chaussée de
  Saint-Job (Stillelaan 2): the box's ribbed dark shell, light end panels perforated with a bicycle, the plain dark hoops.
- Wikimedia Commons (downloaded to a scratch folder to look at, not kept):
  - "Uccle-Ukkel - Héros-Helden x De Fré x Wolvendael x Rouge-Rode - 2025-11-05.jpg", Sjenghai, CC BY-SA 4.0: the
    round bins (pebbled drum, ribbed foot and lid, the bag band);
  - "Uccle-Ukkel - Avenue Wolvendaellaan - STIB-MIVB - arrêt-halte Dieweg - 2025-09-29.jpg", Sjenghai, CC BY-SA 4.0:
    the column bin at the stop;
  - "Uccle-Ukkel - Bourgmestre-Burgemeester Jean Herinckx x Château-Kasteel de Walzin - 2024-10-24.jpg", Sjenghai,
    CC BY 4.0: the street bench;
  - "Glass salvage containers in front of Park Tenreuken during the day (Auderghem, Belgium, DSCF2709).jpg", Trougnouf,
    CC BY 4.0: the white and coloured glass banks;
  - "Benches, Brussels.jpg" (Silver Dovelet, CC BY-SA 4.0) and "Banc parc Brugmann av Messidor Uccle (Belgique).jpg"
    (Matilde69, CC BY-SA 4.0) were looked at and not used (a perforated steel bench, a log bench).
  - The list of the earlier furniture branch (`claude/furniture` `docs/furniture/SOURCES.md`) pointed at these photos.
- Data: OpenStreetMap (benches, bike parkings, parks; ODbL), UrbIS (CC0) via the tiles, `data/stops` (STIB / OSM),
  `data/streetlife` (OSM glass sites).

## Screenshots (`docs/assets/furniture2/`) and previews (`models/furniture2/previews/`)

- `city_square_benches_F5.jpg`: the park benches on the Dieweg / Wolvendael square.
- `city_glass_banks_F2_before_facing_fix.jpg`: two sites of white + coloured banks on a green by Rue Émile Lecomte (taken
  before the off-sidewalk sites were turned to face the street).
- `lab_bench_lod0_22m.jpg`, `lab_bench_lod0_forced_28m.jpg`, `lab_bench_lod1_28m.jpg`: the LOD0 → LOD1 hand-over of
  the street bench and the round bin (the LOD1 wood stays 3-10 % darker than LOD0: inside the 5 m dither band).

## Left to do

- Measure GPU ms on a GREEN preflight (lab + city, `?furniture=old` A/B).
- Hoop rows on the carriageway ("corrals" in a parking space) are common in Brussels; today the rows go on the sidewalk
  only (80 hoops had no room). A corral rule (a parking space with a kerb-side frame) would place them.
- Bins by rule: no data to check against (OSM has none). Uccle's own bins on residential streets are not placed.
- The glass banks' mouths: the side (walkway / street) is a rule from the site; a few may face the wrong way.
- Villo docks and textile containers are not in this kit (the street life still draws the Villo docks).
- The GLB is uncompressed (2.0 MB): meshopt compression in a pack step would cut it.
- `bench_park` LOD0 is 5.6 k triangles (swept cast frames): fine at 25 m, could be trimmed.
