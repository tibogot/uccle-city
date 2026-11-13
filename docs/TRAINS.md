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
| `viewer/rail/trainModel.js` | One node material for the whole fleet: slot index per vertex -> a palette of uniforms (`trainLook.setLivery("sncb" / "grey" / {...})`: a livery is a palette, never baked), AO, lights (the leading cab's white headlights, red tails behind, the LED display, saloon light at night), see-through glass (alpha-to-coverage, opaque on the far bodies). `trainPose()`: each car carried by its two bogies (height AND pitch from the bogie points), bogies tangent, gangways, the pantograph on the mid car; a coupled pair is the second unit reversed. `createTrainFleet()`: InstancedMeshes per piece and LOD (storage-buffer path, no recompiles), LOD decided per CAR (an 80 m unit spans bands), dithered cross-fades +-8 % / +-10 % at 60 / 450 m (90 m until round 3), far fade 2150-2400 m. LOD0 / LOD1 / LOD2 = 69.6k / 15.3k / 4.8k triangles per unit (bridges: St-Job 49.4k / 14.8k / 2.9k, Calevoet 26.5k / 7.9k / 1.6k). |
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

## Round 3 (2026-11-07): the AM08 nose, the LOD0 band

- **Nose as photographed** (`tools/blender/am08.py`; photos am08_stjob_2025 / am08_calevoet_2025): profile re-raked
  (windscreen foot 1.95 m at 1.50 m reach, top 3.10 m at 0.78: ~33 deg), the plan's superellipse exponent now by height
  (3.4 blunt at the crash front -> 2.2 round over the glazing, `super_at`), denser rows 2-4 m. Materials: ONE black
  glazed field (windscreen 1.99-3.12, display 3.20-3.40, top light) from the windscreen's foot up and over to the roof,
  framed by yellow pillars chosen by the face's plan sweep parameter (so the frame follows the mesh rows and the
  curvature, no steps), the yellow front panel 1.16-1.94 with the headlights at its foot, the grey crash front below
  (coupler, ribbed crash boxes, plough), the cab sides yellow above 1.40 m. Named slots unchanged, AO re-baked.
  EndCar 28.3k / MidCar 23.6k triangles (LOD0 per unit ~112k, was 104k); LODs re-derived by meshoptimizer at load.
- Side by sides (`docs/trains/compare/`): `am08_stjob_2025.jpg` (photo | before | after, front 3/4 from the platform),
  `am08_calevoet_2025.jpg` (photo | before | after, the front), `am08_side_round3.jpg` (before | after, profile). Same
  camera for before / after (S19 4006 frozen at Saint-Job station, 07:10:30, camera offsets from its head).
- **LOD0 band 90 -> 60 m** (`TRAIN_LODS[0].until`). Motion checks: `frames/train_lod0_lod1_fade_60m.jpg` (camera
  receding 33 -> 65 m from the nose along the track, zoom holding the size: the end car crosses the hand-over, no jump,
  frame differences even 7-9), `frames/pass_stjob_bridge_60m.jpg` (S5 3357 over the bridge, 1 s steps, the cars going
  LOD1 -> LOD0 one by one): **0 appeared / 0 vanished** in view.
- **GPU, bridge street view** (photo viewpoint "along the road", S5 3357 frozen on the bridge, 1 car LOD0 + 2 LOD1 at
  60 m vs 2 + 1 at 90 m), debug/gpuAB.js, 8 alternating rounds each, in one page: LOD band 90 vs 60 m: **-0.20 ms
  medians** (-0.25 mean); railway on / off with the 60 m band **+0.29 ms medians** (+0.74 mean), with the 90 m band +0.84
  medians (+0.55 mean). Frame times were 9-13 ms (round 2: ~6) because another session's browser shared the GPU:
  the spreads are large; the band A/B is the cleanest number. To re-measure on an idle GPU.

## Round 4 (2026-11-07): the AM08 nose by outline fitting

- **Method** (`tools/fit/am08/`, README there): two photos solved jointly, `am08_stjob_2025` (front 3/4) and
  `am08_calevoet_2025` (near front; no usable side-on photo exists in refs): both cameras (pose + focal) and the nose's
  centre-line features (B logo, headlights, windscreen foot, yellow panel foot, display, glass top) as unknowns, the red door
  leaves (semi-automatic mask) and the far cab-side outline (y = 1.43) as metric: **rms 3.25 px**; cameras 2.2 / 2.4 m above
  rail (platform eye height, a check, not imposed hard). Measured: yellow panel foot 1.53 m, headlights 1.61 m (1.44 m apart),
  windscreen foot 2.31 m, display 3.33 m **1.53 m behind the tip**. Round 3 had the features ~0.4 m too low and a 1.6 m
  nose with a 33 deg windscreen: the real one rakes ~48 deg and the visor meets the roof ~2.8 m behind the tip (the boxy read).
- **Rebuild** (`am08.py`): NOSE_L 1.62 -> 2.90, the reach table now a setback S(z) from the measurements; rings
  parametrised by the x fraction (even rows along the long sides, dense at the tip); feature heights / slot boundaries from the
  fit (grey crash front < 1.50, yellow panel to 2.30, glass 2.34-3.24, display 3.30-3.50, top light 3.80, wipers 2.38,
  headlights 1.62 at +-0.76, crash boxes to 1.40, coupler 0.98); the yellow pillar on the cab side sweeps back and up
  (rear edge 0.75 m at the windscreen foot -> 3 m at the roof), white behind it. The upper setback (x0.95) and the plan
  exponents (4.0 -> 4.8 between 2.2 and 3.6 m: the top's roundness is the section's, the plan keeps tight corners) were then
  optimised against hand-traced outlines in both photos. The long glass looks into the nose: dark cab desk, ceiling and side
  linings close it. EndCar 28.1k triangles (was 28.3k), same draws, AO re-baked; LODs still by meshoptimizer at load.
- **Outline deviation** (traced outline -> rendered silhouette from the solved camera, mean / max px at 1920 px):
  Saint-Job 12.9 / 29.8 -> **2.0 / 6.0**; Calevoet 8.6 / 13.9 -> **5.8 / 13.0** (the residual there is the camera, rms 3 px,
  and the top-left of the visor). Sheets: `compare/am08_fit_stjob.jpg`, `compare/am08_fit_cal25.jpg` (photo | before |
  after | 50 % overlay with both outlines and the traced points).
- **Motion**: Saint-Job station, camera receding 40 -> 60 m along the track (zoom holding the size), 1 m steps: the end car
  goes LOD0 -> LOD1 at 51 -> 52 m, frame differences 5.0 / 5.1 / 4.7 (no spike), in-view pops counter unchanged
  (`frames/am08_round4_lod0_lod1.jpg`).
- **GPU**: same view as the St-Job photo (2 cars LOD0), old vs new glb alternated (reload each): medians 3.34 (old) vs
  3.37 ms (new, 6 samples 2.8-3.5): unchanged within noise (the GPU is shared; triangles -0.06 %).

## Rue de Verrewinkel road bridge (branch claude/verrewinkel, 2026-11-11)

The brick road bridge over L26 at the Parc de la Sauvagère's west entrance, a hero like the two rail bridges (`?trains=1`).
Notes, measures, counts, what is estimated: `models/rail/verrewinkel_NOTES.md`; resume: `models/rail/verrewinkel_RESUME.md`.

- **Generator** `tools/blender/roadBridge.py` (road over rail; preset `verrewinkel`): three elliptical brick arches (A 8 m
  over the NW slope, B 11 m over the tracks, C 8 m over the SE slope) with rowlock rings, a corbelled arcade of 18 small
  brick arches on 17 blue-stone consoles (sheared with the 4.9 % road grade), the rounded blue-stone bolster coping in
  V-jointed blocks, wings flared as UrbIS, end piers, the road deck (asphalt, NE sidewalk with dropped kerbs, SW strip), the
  2022 footbridge (precast deck, terracotta resin, glass parapet with leaning white fins, splayed tube supports, the two OSM
  benches) and the galvanised mesh railings (wire panels drawn as a box-filtered pattern with alpha-to-coverage). Three
  nodes: `verrewinkel`, `verrewinkel_fine` (arch rings: LOD0 only), `verrewinkel_foot` (2022 work: hidden for the 2021 photo).
  Faces flat / smooth by flag, bevel chamfers flat, n-gons triangulated by Blender (beauty), slivers < 0.3 mm dropped.
- **Photo**: `tools/verrewinkel_photopose.py` solves s05's camera against the model (consoles, coping line, near track,
  SE fold; EXIF focal): `models/rail/verrewinkel_photo_views.json` (bridge + city frames), side by side
  `docs/trains/verrewinkel/s05_city_compare.jpg`.
- **City** (`viewer/rail/bridgeModel.js`, `railData.js`, `tileData.js`, `main.js`): the hero footprint polygon replaces the
  UrbIS ROB slab, trees cleared on it, the terrain kept 0.12 m under the deck, arch B's floor carved, the catenary dips under
  the arches (0.3 m under the intrados, 1:12 back up), no mast under a hero; the road engine and the measured surfaces get the
  deck as ground over the cutting (`roadDeckGround`); walk / drive / third person stand on the deck (`deckHeightFn`), the
  parapets are drive colliders; OSM furniture with layer >= 1 is not dropped into the cutting any more. All bridges now draw
  their fading copies only inside the LOD bands; `warmBridge` precompiles (+ fading copies) and warms the shadow pass.
- **Checker**: LOD0 0 blocking (34,073 tris), LOD1 0 (24,417, an exact subset), LOD2 534 (5,725, meshoptimizer: to redo).
- **Measured** (city, this machine, GPU shared with another session, bridge vs moved away, 5 alternating rounds, medians):
  road approach +0.19 ms, from the track -0.13 (noise), overview at ~100 m +0.13; +22 draws, +67.6k triangles (incl.
  shadows) at LOD0. 20 s flight 900 -> 40 -> 900 m: LOD states 100/110/010/011/001, long frames come and go with the bridge
  off too (city / GPU contention). Flicker (strafe 24 frames): road approach 3964 -> 679 ppm after the wire panels (the rest:
  sky, leaves, a city kerb), NE face 601, footbridge 569 (bench shadow), SE join 257.
- Frames: `docs/trains/verrewinkel/lod_band_*.jpg` (dolly through both bands, zoom holding the size: no jump),
  `city_*.jpg` (both deck ends, the NE face, the footbridge, from the track).

## What still looks weak (honest list)

- **AM08 nose (round 4)**: the yellow pillar's rear edge on the cab side steps across the ring rows (a diagonal on a
  row grid; needs a seam row along it); the lower front (plough, crash boxes) was not refitted: in the overlays the plough sits
  ~0.2 m too low / too long; a sliver of sky still shows through the top corner of the glass from some angles; the near
  side's cab door window is the old recess.
- **AM08 nose (round 3)**: the windscreen is flat glass (no curved reflection); the pillars' yellow should taper
  inwards at the roof (they run straight up); the plough reads as a pale block; no "B" logo, fleet number or wipers'
  arms on the glass; the cab sides' yellow / grey line is level (the photos show it rising backwards: a slanted line
  stepped across the 0.6 m rows, so it was dropped).

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
- Round 2 (branch claude/bridges2, docs/trains/BRIDGES_ROUND2.md Results): Rue de Stalle, Engeland (L26 + chord), Bigarreaux, Kauwberg and Rue de Linkebeek are heroes now (?bridges2=0 = without). Still not modelled (Chemin du Puits, the Moensberg crossings):
  the track crosses the gap on its ballast ribbon with nothing under it.
- Platforms are bare (no Calevoet / Stalle station canopies with cast-iron columns, no station buildings, signs,
  lighting); shelters are boxes. Masts are generic H-columns with one cantilever type (Infrabel uses portals too).
- A few tracks still kink near the L124 / L26/5 junctions in D9/E9 (grade relaxation at 3.5 %) - visible as a small bump.
- IC trains are drawn as two AM08 (seen on photos), but most ICs on L124 are M6/M7 double-decks with an HLE18: to model.
- The dithered LOD band shows a fine screen-door pattern on the white body for ~20 m around 90 m (no TAA here).
- Done in round 2: the carve and the rail meshes are built in the tile worker.
