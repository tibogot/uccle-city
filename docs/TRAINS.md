# Trains (branch `claude/trains`)

The SNCB railway of Uccle: tracks with ballast, sleepers, catenary, platforms; the two hero railway bridges; AM08
Desiro trains on the real timetable. Lab first: `labs/train-lab.html`; in the city behind `?trains=1`.
Research (lines, stations, every road crossing, sources, licences): `docs/trains/RESEARCH.md`.

## Look at it

- Lab: `/labs/train-lab.html` (sites: the Saint-Job bridge, the Calevoet viaduct, Saint-Job / Calevoet / Stalle stations,
  Moensberg); "photo viewpoint" puts the camera where a Commons photo was taken and overlays it (`photo overlay`, the
  photos live in `data/raw/refs/trains/`, never shipped); "Trains" folder: clock, time scale, LOD, livery, "jump to the
  next train past this site"; "Performance": railway on / off A/B.
- City: `/viewer/index.html?tile=G6&trains=1&at=430,800&view=stjob` (the Saint-Job bridge), `?tile=D7&trains=1` (Calevoet
  viaduct), `?tile=H6&trains=1` (Saint-Job station). `&clock=08:10&timescale=10` for traffic. The trains follow the city
  clock (tram 92's: the dev panel's clock moves both).
- Side by side with photos: `docs/trains/compare/*.jpg`. Frame sequences: `docs/trains/frames/*.jpg`.

## Pieces

| File | What |
|---|---|
| `pipeline/build_rail.py` -> `data/rail/rail.json` (0.8 MB) | Every OSM track touching a built tile, 2 m points, rail top fitted to the DTM: per point the 75th percentile of the DTM in a 2.5 m disc (the ballast crest), outliers vs a 300 m median rejected (decks of roads over the line are in the DTM), a 30 m robust smoothing, bridges / tunnels / roads-over interpolated, switch ends pulled together, any way still steeper than 3.5 % relaxed. Platforms (OSM areas, 0.76 m), UrbIS bridges + tunnels with the roads under them, stations, and six ROUTES for the timetable found by Dijkstra on the directed track graph (`preferred_direction=forward`: Belgian left-hand running comes from OSM): 124S/N, 26W/E, 9W/E (the S9/S19 chord). |
| `pipeline/build_trains.py` -> `data/transit/sncb-uccle.json` (155 kB) | The SNCB GTFS, three service days (Tue 10, Sat 7, Sun 8 Nov 2026): 572 trips put on the routes by line and direction; stations beyond the route ends get an extrapolated distance; calls with no dwell in the feed get 20 s either side. |
| `viewer/rail/railData.js` (round 2) | Worker-safe: `prepRail`, `carveGrid` (terrain carve on the tile's 1 m grid), `railKeepClear`, `railVerges`, `railTileData` (every rail mesh as typed arrays). Runs in the tile worker (`viewer/tileData.js`); the lab calls the same code. |
| `viewer/rail/railway.js` | Per tile: ballast ribbons (shader draws the sleepers and rails as box-filtered stripes beyond the geometry), rails (8-point profile, polished head / rusty sides), concrete sleepers every 0.6 m (instanced, dithered out at 110-140 m), catenary masts every 60 m on the outer side (stepped off platforms, cantilever stretched back), contact + catenary wires with droppers as "AA wires" (>= ~1 px, coverage as alpha-to-coverage), platforms (paving, white coping, yellow line, shelters), slabs for roads over the line. `carveTerrain()`: the tile's terrain pushed under the ballast and under platforms, raised to a 1:1.5 fill where a track runs above the ground off a bridge (the end of a viaduct), normals redone locally. |
| `viewer/rail/keepClear.js` | No LiDAR "trees" on rail bridges (they are the deck in the canopy model), on platforms or within 3.2 m of a track. |
| `tools/blender/railBridge.py` -> `models/rail/{stjob,calevoet}.glb + _ao.png + .json` | The hero bridges (see RESEARCH): parametric masonry: face walls with the openings, skewed ruled vaults, arch rings with stone voussoirs, the hood moulding and its scrolls, quoined capped pilasters, the corbel table, cornice, parapet, coping, end quoins; Calevoet: three round arches, dentil archivolts, imposts, railing. Bevels (Bevel modifier, 2.5 cm / 1.2 cm), UV0 in metres, AO baked in UV1 (2048) with the DTM site as occluder. NAMED slots `brick_red_brussels`, `stone_blue`, `concrete`, `painted_metal_white` (the Material Lab's names); no colour baked. St-Job 49.4k triangles, Calevoet 26.5k. |
| `viewer/rail/bridgeModel.js` | Loads a bridge; LOD1 / LOD2 by meshoptimizer (welded, 30 % / 6 % + prune), dithered cross-fades at 140 / 420 m; `materialFor(slot)` uses `viewer/materials/library.js` when that branch is merged, else procedural stand-ins (running-bond brick with recessed joints, weathered petit granit) on the same UV0 contract. |
| `tools/blender/am08.py` -> `models/rail/am08.glb + .json` | The AM08 Desiro: lofted body with a superelliptic nose, real window / door recesses (inset + extruded), plug doors with their windows and the seam, a saloon behind see-through glass (seats, floor, ceiling), bogies (wheels, flanges, discs, axle boxes, springs, air springs, dampers), obstacle deflector, lamps, wipers, mirrors, roof fairings, gangways, single-arm pantograph raised to the wire; a "_far" variant per body (openings painted on). AO baked into COLOR_0. 13 named slots (paint_body, paint_cab, paint_door, paint_skirt, paint_grey, paint_roof, rubber, glass, metal_dark, lamp_white, lamp_red, display, interior). |
| `viewer/rail/trainModel.js` | One node material for the whole fleet: slot index per vertex -> a palette of uniforms (`trainLook.setLivery("sncb" / "grey" / {...})`: a livery is a palette, never baked), AO, lights (the leading cab's white headlights, red tails behind, the LED display, saloon light at night), see-through glass (alpha-to-coverage, opaque on the far bodies). `trainPose()`: each car carried by its two bogies (height AND pitch from the bogie points), bogies tangent, gangways, the pantograph on the mid car; a coupled pair is the second unit reversed. `createTrainFleet()`: InstancedMeshes per piece and LOD (storage-buffer path, no recompiles), LOD decided per CAR (an 80 m unit spans bands), dithered cross-fades +-12 % / +-10 % at 90 / 450 m, far fade 2150-2400 m. LOD0 / LOD1 / LOD2 = 69.6k / 15.3k / 4.8k triangles per unit (bridges: St-Job 49.4k / 14.8k / 2.9k, Calevoet 26.5k / 7.9k / 1.6k). |
| `viewer/rail/trains.js` | The timetable runner: per trip, the nose's distance along its route by interpolating between timetable points (accelerate / cruise / brake at 0.75 m/s², standing at platforms), poses, the fleet, pop counters (`stats.appearInView / vanishInView`), `positions()` (for traffic later), clock = the city clock. **Live feed hook**: `setSource({ delay(trip, T), cancelled(trip) })` - a GTFS-RT TripUpdates adapter (SNCB publishes one on the same NAP) plugs in there; nothing else changes. |
| `labs/train-lab.html/.js` | The lab (see above), our own `viewer/panelUI.js`. |
| `viewer/main.js` | `?trains=1`: carve + rail meshes per tile (inside the tile's own groups: they stream and fade with it), trees dropped, the bridges placed (shown while their tile or its far LOD is loaded), the trains. |

## Round 2 (2026-11-06)

- **Carve + rail meshes in the tile worker** (`viewer/rail/railData.js`, worker-safe, called from `viewer/tileData.js`;
  bundle rebuilt): the terrain carve (ballast lowering, platforms, the hero bridges' openings carved to their floors,
  1:1.5 embankment fill), the LiDAR tree keep-clear, the verges for the land cover and every rail mesh (ballast, rails,
  sleeper / mast matrices, wires, platforms, shelters, decks) are built as typed arrays next to the terrain; the main
  thread only wraps them (`railTileMeshes`). Worker time per rail tile: carve ~6 ms, meshes ~8 ms. **Trace** (CDP,
  40 s glide along L26 F7 -> H6/I5 at 30 m/s, tiles streaming): railway code ~23 ms of main thread in total over 40 s,
  **at most 0.85 ms of railway work inside any one task**; the long tasks in that trace belong to other systems (render /
  post, trees, warm-up). Per-tile logs: the "railway" slice is under 4 ms on every streamed tile (G6, F7, G7...); 6 ms
  once on the first tile at start-up (materials created).
- **Calevoet viaduct rebuilt from the photo**: 5 semicircular arches (13 m span, 3.2 m piers, 82 m), thick stepped
  pale-brick rings (`brick_yellow` slot), impost bands, pier pilasters with stepped corbels, string course, parapet +
  railing; stray blocks removed; the arches carved to the road in the worker.
- **Ground**: railway verges painted as undergrowth (green, not sand), wooded banks no longer bare earth; the Saint-Job
  side arches open (carved to their floors). Still a small earth cone under the north side arch (DTM).
- **AM08 close-up pass**: the front as photographed (black visor + windscreen with rounded corners in the yellow wrap,
  yellow lower panel, headlight pods, top light, Scharfenberg coupler, ribbed crash boxes, V plough, parked wipers), dark
  cab behind the windscreen; bogies with shaped frames, coil springs, dampers, axlebox covers, brake units, motor /
  gearbox; body raised so the bogies show; SNCB yellow `#f4d52b` (no longer orange). The far bodies keep the full
  profile (no shading change at the hand-over). LOD0 / LOD1 / LOD2 = **103.7k / 25.4k / 8.5k** triangles per unit
  (EndCar 24.8k, MidCar 20.9k, Bogie 5.3k x6).
- Side by sides redone in the city (`docs/trains/compare/`: Saint-Job x3 at eye height, Calevoet from the photo's
  viewpoint, the AM08 close-ups at Saint-Job station). Frame sequences redone in the city (`docs/trains/frames/`).

### Verified round 2 (same machine, GPU shared with another agent's tab; one Chrome tab, CDP)

- **Street view at the Saint-Job bridge, S9 on the bridge (3 cars LOD0)**, 8 alternating rounds railway on / off:
  on 6.42 / off 5.87 ms mean (**+0.55 ms**; medians 6.36 / 5.92, **+0.44**; first round the outlier, per-round
  +0.28 .. +1.04), **+24 draw calls**, +301k triangles. The train alone (8 rounds): **+0.21 ms** mean (medians +0.29),
  +10 draws, +207k triangles; its shadow pass costs nothing measurable (castShadow on / off: -0.01 ms). So the
  heavier LOD0 train put the bridge view at the edge of the +0.5 ms budget: see the to-do (LOD0 band, glass).
- **Overview** over L26 (bridge LOD1, train LOD1): on 7.56 / off 7.21 mean (**+0.35 ms**; medians 7.43 / 7.20, +0.23),
  **+40 draws**, +216k triangles.
- **Moving frame sequences** (`docs/trains/frames/`): `pass_stjob_bridge.jpg` (S9 3279 over the bridge, 0.8 s steps),
  `train_lod0_lod1_fade.jpg` (camera backing off 76 -> 104 m with the zoom holding the car's size: the dithered
  LOD0 -> LOD1 hand-over at ~90 m shows no jump, the windows / doors / cab stay put), `enter_view_edge.jpg` (0.25 s
  steps: the nose appears at the frame's edge, drawn from the frame its car's sphere touches the frustum).
  In-view pop counters over all three: **0 appeared / 0 vanished**.

## Verified round 1 (2026-11-06, WebGPU, Chrome; the GPU was shared with another agent's lab tab: spreads are reported)

- **Cost, city, street view at the Saint-Job bridge with an S5 on it (LOD0 train + bridge LOD0 + tracks + catenary in view)**,
  six alternating rounds railway on / off (debug/gpuAB.js `alternate`): on 7.73 / off 7.32 ms mean (**+0.41 ms**; medians
  7.53 / 7.34, +0.19; per-round differences -0.79 .. +0.73 ms), **+27 draw calls**, +236k triangles.
- **Overview** over L26 (two tiles of track, the bridge LOD1, a train at LOD2): on 7.96 / off 7.61 mean (**+0.35 ms**;
  medians +0.17), **+44 draw calls** (per tile: ballast, rails, sleepers, masts, wires, platforms, shelters, decks, each with
  its shadow pass where it casts).
- **CPU**: `trains.update` 0.013 ms per frame (334 trips scanned, 1-2 units drawn). Per streamed tile, on the main thread,
  in two separate slices: the terrain carve 1-5 ms (min of 5 runs; up to 15 ms with GC, D9 / D6 the busiest) and the rail
  meshes 3-12 ms (up to 20-30 ms in D9 / C4 when the GC hits). Still longer than the 4-9 ms slices of the rest of a tile's
  build: **moving both into the tile worker is the first to-do**.
- **Pops**: 2 x 30 s real time at x20 (20 simulated minutes, 4-6 trains running; the bridge street view and an overview):
  **0 trains appeared and 0 vanished in view** (counters in trains.js), 1569 + 899 frames. Trains only start / end at
  the routes' ends, all outside the tiles; LOD changes are dithered cross-fades per car (`docs/trains/frames/train_lod0_lod1_fade.jpg`:
  the camera backs off a car with the zoom holding its size, 76 -> 104 m: no jump; the far LOD has the windows and doors
  painted on, found and fixed in this check: it first had none); a train entering the view is drawn from the frame
  its bounding sphere touches the frustum, still at the edge (`docs/trains/frames/enter_view_edge.jpg`); the pass over the
  bridge: `docs/trains/frames/pass_stjob_bridge.jpg`.
- Side by side with photos: `docs/trains/compare/` (St-Job bridge x3 in the city, Calevoet viaduct and the two AM08 views in
  the lab).

## What still looks weak (honest list)

- **The AM08 at LOD0** is now 104k triangles a unit: right at close range (round 2), but the street view at the
  Saint-Job bridge costs +0.44 ms (medians) with it, at the budget's edge. The windscreen is flat (no curved glass
  reflection), the cab interior is a dark volume.
- **Brick and stone** are the procedural stand-ins until the Material Lab library is merged (then `materialFor()` uses it
  with the same slot names, no re-export). The stand-in brick is too uniform next to the photos (they show darker
  headers, soot, repairs).
- **Ground at the bridges**: verges are green now and the side arches open, but a small sandy DTM cone still sits
  in front of the Saint-Job north side arch (visible in the bridge sheets), and the Calevoet embankment ends are coarse.
- **Roads over the line** (Carsoel, Waterloo, Chênaie, Verrewinkel, Merlo, Tilleuls...) are plain concrete slabs at the
  DTM height, no parapets, and the road surface on them is the terrain (UrbIS level +1 surfaces are not drawn).
- Other rail bridges (Rue de Stalle 17 m high, Kauwberg, Rue de Linkebeek, Engeland, Moensberg crossings) are not modelled:
  the track crosses the gap on its ballast ribbon with nothing under it.
- Platforms are bare (no Calevoet / Stalle station canopies with cast-iron columns, no station buildings, signs,
  lighting); shelters are boxes. Masts are generic H-columns with one cantilever type (Infrabel uses portals too).
- A few tracks still kink near the L124 / L26/5 junctions in D9/E9 (grade relaxation at 3.5 %) - visible as a small bump.
- IC trains are drawn as two AM08 (seen on photos), but most ICs on L124 are M6/M7 double-decks with an HLE18: to model.
- The dithered LOD band shows a fine screen-door pattern on the white body for ~20 m around 90 m (no TAA here).
- Done in round 2: the carve and the rail meshes are built in the tile worker.
