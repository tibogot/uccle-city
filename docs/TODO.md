# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).

## NEXT SESSION (agreed order, 2026-11-04)

1. [x] **Roof collision for fly mode**: a 2 m roof-height grid per tile (tile worker), `world.heightAt` = max(ground, roofs).
   Driving will need real wall collision (BVH) later.
2. **Parked cars from Blender**: 4-6 scripted body types, meshoptimizer LODs, a **Car Lab** first, owner approves,
   then they replace the boxes (also a GPU saving: cars are ~784k triangles per view).
3. **All of Uccle**: re-fetch raw data on this machine, set up the Python pipeline, extend the grid (section 1).
Then: road fixes (z-fighting, breaks in curves, grooved tram rails), STIB tram model (Tram Lab), rain / wet roads,
winter (7b), dev panel teleports to named places.

**Rules agreed with the owner (keep):** every new asset gets a lab in `labs/` first and goes into the city only after
the owner approves it there; panels and labs use our own `viewer/panelUI.js` (never lil-gui); game-engine-v1 is
read-only (copy into `vendor/` with ORIGIN.md); measure GPU ms before / after (stats line, `viewer.gpuStats()`).

**Open owner decisions / inputs:**
- The fly-mode bird: the current model (repainted peregrine, original clips only) is weak; the owner is looking for a
  better rigged, animated peregrine falcon (CC0 / CC-BY) to drop into `models/bird/` (+ `bird.json`). Then: falcon
  nest in the Saint-Job belfry, takeoff / landing clips. Procedural flight layers are off (`?birdlayers=1`).
- Setts: procedural is the default; the Poly Haven scan stays as `?setts=tex` for a later texture pass (KTX2).
- Volumetric fog is opt-in only (`?vfog=1`, dev panel) until it is tuned.
- Tree impostors off (`?impostors=1`) until 16x16 views + depth atlas.

## Done 2026-11-04 (details: docs/RENDER_PLAN.md, docs/RESEARCH.md)
Streaming freezes fixed (per-tile shader constants), boot warm-up, Vercel deploy, GPU timer, terrain simplified,
stylized branch trees + depth pre-pass, Firmament sky + haze + night look, every lamp lights the street, foliage /
window bugs (hash of interpolated values), Place de Saint-Job setts, the Blender lamp with LODs, fly mode with the
falcon, labs (Bird, Lamp), the dev panel.

## 0. Check first (needs a real browser with WebGPU)
- [ ] Frame rate on a mid-range GPU with `?ring=1` (default) and `?ring=2`; draw calls, GPU memory.
- [ ] Stutter while tiles stream in (worker is on; remaining main-thread slice: tree field ~350 ms
      on the first tile in software rendering; should be much less after the shared-assets fix).
- [ ] Night-window speckle seen in the software renderer; SSR / GTAO quality; shadow acne.
- [ ] Tram 92 timing against the real STIB app at a known stop (Place Saint-Job).

## 1. Coverage: more city
- [ ] The built area is lon 4.327–4.372 × lat 50.7905–50.8075 (Uccle centre to Saint-Job,
      ~6 km² inside a 4 × 2 km grid of 32 tiles): about a quarter of Uccle (~23 km²).
      Extend the grid to all of Uccle, then the Brussels region (UrbIS covers all of it, CC0).
      Needs: bigger OSM extract (split requests), more UrbIS sheets (`find_sheets.py`), a tile
      naming scheme beyond A–H / 1–4, `run_tile.py --all --network`.
- [ ] Road network: ~12 bad spots left (Alsemberg / Brugmann sharp Y, crowded rings in C4 / F2;
      `node tools/check_roads.mjs --all`).

## 2. Streaming and performance
- [x] Far LOD (`?far=`, default 3): orthophoto-draped 4 m terrain + flat-coloured solids, 2 draw calls
      per tile (`buildLiteData` in tileData.js, `loadLiteTile` in main.js). Next: impostors for far trees.
- [x] Tree assets shared between tiles: streamed tiles now cost 20–115 ms main-thread work each
      (first tile ~265 ms, it builds the shared assets).
- [x] Road marking atlas R8 at half resolution (8x less GPU memory, e.g. 20 MB -> 2.5 MB).
- [ ] Unload by distance with hysteresis; cap GPU memory; a loading indicator.
- [ ] One shared terrain / ground material for all tiles (bounds as uniforms), fewer shader variants.
- [ ] Profile and cap point lights / shadow casters at night.

## 3. Assets from Blender (see `docs/BLENDER.md`)
- [ ] Kit: window frames with real depth (3–4 Uccle types), doors, cornices, balconies, dormers,
      chimneys, shopfronts, gutters / downpipes; trim-sheet textures; LOD0–2 each.
- [ ] Vehicles: STIB T3000/T4000 tram, 4–6 car body types, a STIB bus; LODs.
- [ ] Street furniture: Brussels lamp post types, bins, bollards ("potelets"), benches, bike hoops,
      STIB shelter and pole, signs.
- [ ] Hero landmarks: Saint-Job church (from photos), then other recognisable buildings.
- [ ] Export glTF + meshopt + KTX2; load once; place with InstancedMesh / BatchedMesh.

## 4. Buildings
- [ ] Shop names on fascias (text atlas from OSM `name`).
- [ ] Gable attic windows, dormers, balconies, bay windows (common in Uccle).
- [ ] Garage doors on street faces of detached houses; garden walls and gates.
- [ ] Church: compare materials with a photo; oculi on the dome drum; lantern detail.
- [ ] Optional interiors: hand-made for a few buildings (church, a café, a shop); procedural
      rooms for others, generated only near the player.

## 5a. Place de Saint-Job and other squares (owner photos 2026-11-04)
- [x] Place de Saint-Job: setts plaza instead of grass, its streets setts (data/overrides.json, viewer/plazas.js).
- [ ] Fold data/overrides.json into the pipeline on the next full rebuild (raw data not on this machine).
- [ ] Other squares and pedestrian areas: fetch OSM `amenity=parking`, `area:highway`, `highway=pedestrian` areas,
      `place=square` (Overpass was overloaded on 2026-11-04) so no square falls back to grass.
- [ ] Setts look pass 2: rounder, less regular stones, slightly less blue; parking on the plaza itself.
- [x] Brussels swan-neck street lamp (dark green, white globe): Blender, in the city with LODs (Lamp Lab).

## 5. Ground, vegetation, water
- [ ] UrbIS Land cover (CC0) for gardens vs paving vs lawns; driveways, terraces.
- [ ] Hedges along garden edges; flower beds; low walls.
- [ ] Trees: real species from the Brussels street-tree inventory if published; seasonal colours,
      bare trees in winter; tree LOD / impostors.
- [ ] Real water surfaces (ponds in parks) with reflections.

## 6. Traffic, transit, life
- [ ] Live STIB positions (VehiclePositions feed, Belgian Mobility platform; key + small CORS proxy).
- [ ] More lines: trams 4, 51, 97, buses (`pipeline/build_transit.py --line N`); the viewer is
      wired to line 92 only.
- [ ] Waiting-time display at stops (WaitingTimes feed).
- [ ] AI traffic on the road engine's lane graph; traffic lights in sync; pedestrians on sidewalks.
- [ ] Tram vehicle sound, bells; ambient city sound; church bells on the hour.

## 7. Atmosphere
- [ ] Real sun position for date and time (Brussels lat/lon); the clock shared with the trams.
- [ ] Weather: rain (wet roads, puddles, drops), fog, snow; clouds moving.
- [ ] Seasons for trees and grass.

## 7b. Winter (owner, 2026-11-04: "it's going to snow in a month")
- [ ] A winter version: snow on roofs, ground and kerbs (slope- and exposure-aware), bare deciduous
      trees (branch skeletons already exist), winter sun path (Firmament `?day=` ~350), low sun, frost /
      wet roads, falling snow. Switchable by date or a preset.

## 8. Game / app
- [x] Driving (branch claude/drive): Car Lab + drive mode, arcade car on the drivable-surface grid, footprint / island /
      trunk / lamp colliders per tile (viewer/drive/, `?view=drive`). Next: parked cars and trams as colliders (oriented
      boxes), car-vs-car (slop vehicle-physics.js SAT), per-wheel ground (one wheel on a kerb), engine / tyre sound,
      headlight beams at night without adding scene lights (light count change = shader recompiles), the Blender car
      replacing the parked boxes (instanced LOD1/2, colour per instance).
- [ ] Modes: walk, bike, drive, drone / photo mode; minimap with real street names.
- [ ] Missions or uses: deliveries, taxi, "find this place", time slider (historic maps).
- [ ] Multiplayer (later).

## 8b. Dev panel (owner, 2026-11-04: "a better dev panel, well organized")
Replace the left HUD with a collapsible, tabbed panel (lil-gui folders, state in the URL so a view can be shared):
- [ ] **Time & sun**: time of day slider (Firmament's real sun, Brussels), date / day of year, time speed, freeze;
      presets (golden, midday, misty, twilight, night).
- [ ] **Sky & clouds** (Firmament params): coverage, cloud type (stratus..cumulus..storm), base / thickness, wind,
      cirrus, haze, aerosols, sun size; exposure (auto, EV bias, night EV).
- [ ] **Weather**: volumetric fog (on, density, layer top, falloff), rain / wet roads (later), snow (winter, later).
- [ ] **Lighting & post**: lamp pools on/power, near lamp lights, AO / SSR / bloom / haze toggles and strengths,
      shadows (on, resolution, distance), colour grade.
- [ ] **World**: tiles ring / far LOD, layers (terrain, buildings, roads, trees, props, tram, cars), tree mode
      (stylized / slop), impostors, LOD distances.
- [ ] **Camera & modes**: orbit / walk / fly, teleport (Saint-Job, Wolvendael, ...), fly speed / camera distance,
      field of view, photo mode (hide UI, screenshot).
- [ ] **Performance**: fps, GPU ms (avg, p95), per-pass GPU times, draw calls, triangles, GPU memory, shader count,
      a 10-second benchmark that logs the three standard views.
- [ ] **Debug**: wireframe, normals, LOD colours, light map / land cover overlays, the dev log.

## 9. Housekeeping
- [ ] README: update for the worker build (`node tools/build_worker.mjs`) and new URL params.
- [ ] CONTRACT: document `data/transit/*.json`, features `shop` points and `platform` lines.
- [ ] Tests: road check in CI, a headless screenshot smoke test.
