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
| `viewer/rail/railway.js` | Per tile: ballast ribbons (shader draws the sleepers and rails as box-filtered stripes beyond the geometry), rails (8-point profile, polished head / rusty sides), concrete sleepers every 0.6 m (instanced, dithered out at 110-140 m), catenary masts every 60 m on the outer side (stepped off platforms, cantilever stretched back), contact + catenary wires with droppers as "AA wires" (>= ~1 px, coverage as alpha-to-coverage), platforms (paving, white coping, yellow line, shelters), slabs for roads over the line. `carveTerrain()`: the tile's terrain pushed under the ballast and under platforms, raised to a 1:1.5 fill where a track runs above the ground off a bridge (the end of a viaduct), normals redone locally. |
| `viewer/rail/keepClear.js` | No LiDAR "trees" on rail bridges (they are the deck in the canopy model), on platforms or within 3.2 m of a track. |
| `tools/blender/railBridge.py` -> `models/rail/{stjob,calevoet}.glb + _ao.png + .json` | The hero bridges (see RESEARCH): parametric masonry: face walls with the openings, skewed ruled vaults, arch rings with stone voussoirs, the hood moulding and its scrolls, quoined capped pilasters, the corbel table, cornice, parapet, coping, end quoins; Calevoet: three round arches, dentil archivolts, imposts, railing. Bevels (Bevel modifier, 2.5 cm / 1.2 cm), UV0 in metres, AO baked in UV1 (2048) with the DTM site as occluder. NAMED slots `brick_red_brussels`, `stone_blue`, `concrete`, `painted_metal_white` (the Material Lab's names); no colour baked. St-Job 49.4k triangles, Calevoet 26.5k. |
| `viewer/rail/bridgeModel.js` | Loads a bridge; LOD1 / LOD2 by meshoptimizer (welded, 30 % / 6 % + prune), dithered cross-fades at 140 / 420 m; `materialFor(slot)` uses `viewer/materials/library.js` when that branch is merged, else procedural stand-ins (running-bond brick with recessed joints, weathered petit granit) on the same UV0 contract. |
| `tools/blender/am08.py` -> `models/rail/am08.glb + .json` | The AM08 Desiro: lofted body with a superelliptic nose, real window / door recesses (inset + extruded), plug doors with their windows and the seam, a saloon behind see-through glass (seats, floor, ceiling), bogies (wheels, flanges, discs, axle boxes, springs, air springs, dampers), obstacle deflector, lamps, wipers, mirrors, roof fairings, gangways, single-arm pantograph raised to the wire; a "_far" variant per body (openings painted on). AO baked into COLOR_0. 13 named slots (paint_body, paint_cab, paint_door, paint_skirt, paint_grey, paint_roof, rubber, glass, metal_dark, lamp_white, lamp_red, display, interior). |
| `viewer/rail/trainModel.js` | One node material for the whole fleet: slot index per vertex -> a palette of uniforms (`trainLook.setLivery("sncb" / "grey" / {...})`: a livery is a palette, never baked), AO, lights (the leading cab's white headlights, red tails behind, the LED display, saloon light at night), see-through glass (alpha-to-coverage, opaque on the far bodies). `trainPose()`: each car carried by its two bogies (height AND pitch from the bogie points), bogies tangent, gangways, the pantograph on the mid car; a coupled pair is the second unit reversed. `createTrainFleet()`: InstancedMeshes per piece and LOD (storage-buffer path, no recompiles), LOD decided per CAR (an 80 m unit spans bands), dithered cross-fades +-12 % / +-10 % at 90 / 450 m, far fade 2150-2400 m. LOD0 / LOD1 / LOD2 = 69.6k / 15.3k / 4.8k triangles per unit (bridges: St-Job 49.4k / 14.8k / 2.9k, Calevoet 26.5k / 7.9k / 1.6k). |
| `viewer/rail/trains.js` | The timetable runner: per trip, the nose's distance along its route by interpolating between timetable points (accelerate / cruise / brake at 0.75 m/s², standing at platforms), poses, the fleet, pop counters (`stats.appearInView / vanishInView`), `positions()` (for traffic later), clock = the city clock. **Live feed hook**: `setSource({ delay(trip, T), cancelled(trip) })` - a GTFS-RT TripUpdates adapter (SNCB publishes one on the same NAP) plugs in there; nothing else changes. |
| `labs/train-lab.html/.js` | The lab (see above), our own `viewer/panelUI.js`. |
| `viewer/main.js` | `?trains=1`: carve + rail meshes per tile (inside the tile's own groups: they stream and fade with it), trees dropped, the bridges placed (shown while their tile or its far LOD is loaded), the trains. |

## Verified (2026-11-06, WebGPU, Chrome; the GPU was shared with another agent's lab tab: spreads are reported)

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

- **The AM08 nose** reads right in shape and livery at 20 m+, but up close the windscreen frame is a flat black area (no
  curved glass, no cab detail beyond a wall), the headlights are simple discs, the lower front lacks the moulded
  bumper / coupler cover shapes; the bogies are blocky (boxes + cylinders); the cab yellow tends to orange under ACES.
- **Brick and stone** are the procedural stand-ins until the Material Lab library is merged (then `materialFor()` uses it
  with the same slot names, no re-export). The stand-in brick is too uniform next to the photos (they show darker
  headers, soot, repairs).
- **Ground at the bridges**: the 1 m DTM draws the embankment ends as sandy mounds in front of the walls (the land
  cover paints them bare), and the Saint-Job bridge's side arches are half buried by the DTM slope under them. The
  embankment fill at the Calevoet viaduct ends is a coarse earth cone.
- **Roads over the line** (Carsoel, Waterloo, Chênaie, Verrewinkel, Merlo, Tilleuls...) are plain concrete slabs at the
  DTM height, no parapets, and the road surface on them is the terrain (UrbIS level +1 surfaces are not drawn).
- Other rail bridges (Rue de Stalle 17 m high, Kauwberg, Rue de Linkebeek, Engeland, Moensberg crossings) are not modelled:
  the track crosses the gap on its ballast ribbon with nothing under it.
- Platforms are bare (no Calevoet / Stalle station canopies with cast-iron columns, no station buildings, signs,
  lighting); shelters are boxes. Masts are generic H-columns with one cantilever type (Infrabel uses portals too).
- A few tracks still kink near the L124 / L26/5 junctions in D9/E9 (grade relaxation at 3.5 %) - visible as a small bump.
- IC trains are drawn as two AM08 (seen on photos), but most ICs on L124 are M6/M7 double-decks with an HLE18: to model.
- The dithered LOD band shows a fine screen-door pattern on the white body for ~20 m around 90 m (no TAA here).
- The rail meshes per tile are built on the main thread; the worker should build them (and the carve) to keep streaming
  frames short.
