# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).

## NEXT SESSION (agreed order, 2026-11-04)

1. [x] **Roof collision for fly mode**: a 2 m roof-height grid per tile (tile worker), `world.heightAt` = max(ground, roofs).
   Driving will need real wall collision (BVH) later.
2. **Parked cars**: the owner rejected the scripted car's look; **owner to pick** in the Car Lab comparison
   (`labs/car-lab.html?mode=compare`, `?mode=street`, branch claude/cars): scripted vs Kenney Car Kit vs Quaternius Cars
   Pack (CC0, `models/cars/`, one material per pack, meshoptimizer LODs at load), and (branch claude/car-faceted) our own
   faceted family `faceted:<id>` (tools/blender/carFaceted.py: 7 types + taxi, ~7.4k tris, baked AO, see-through glass;
   previews docs/cars/faceted_*.png). Then the pick replaces the boxes in
   `viewer/cars.js` (instancing per model / LOD, as the street benchmark does; also a GPU saving: cars are ~784k
   triangles per view).
3. **All of Uccle**: re-fetch raw data on this machine, set up the Python pipeline, extend the grid (section 1).
Then: road fixes (z-fighting, breaks in curves, grooved tram rails), rain / wet roads,
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

## Third-person character (Capsule Lab, branch claude/capsule; waiting for the owner)
- [x] `viewer/character/`: kinematic capsule controller (120 Hz fixed step + interpolation, collide-and-slide, step-up
      by rolling over walkable edges + an explicit up-forward-down step, ground snap, slope limit, coyote / jump buffer),
      spring-arm camera with collision (shoulder ray + 5 probe rays, snap in / ease out, capsule fade), the character
      slot (`body.setModel(gltf, { clips, walkSpeed, runSpeed })`), collision world: own triangle BVH + footprint prisms
      (48 m cells, after claude/drive's colliders.js) + heightfield. Zero allocations per step (checked: 0 GCs in 200k steps).
- [x] `labs/capsule-lab.html`: test course + 30 scripted tests (T), benchmark, tunables, debug draw. Screens: `docs/capsule/`.
- [x] City test hook `?view=third` (I6, Place de Saint-Job): roads BVH from the tile's road meshes, UrbIS footprints,
      trunks, lamp posts, terrain. `?chardebug=1` = debug draw.
- [x] A real character in the slot: Quaternius "Hoodie" (Ultimate Modular Men, CC0; also "Casual"), `models/characters/`
      (`tools/characters/convertCharacters.mjs`), merged at load to one skinned mesh + one vertex-colour material (6.2k
      triangles); idle / walk / run with playback matched to the stride speed measured from the foot bones (walk 1.29,
      run 2.93 m/s); the pack has no jump clip: a held run stride stands in for jump / fall.
- [x] Foot IK (`viewer/character/footIK.js`): per-foot ray, two-bone leg IK with the animated knee as pole, foot tilt to
      the ground normal (<= 28°), pelvis drop to the lower planted foot (<= 16 cm), all eased; off in the air, softer at
      a run. ~0.03 ms per frame (whole character with animation ~0.16-0.19 ms). Screens `docs/capsule/ik-*.png`.
- [x] City: tram platforms (in the roads BVH), parked cars + bus / tram shelters (oriented boxes, also stop the camera),
      benches, stop poles, signals, bike racks, tram poles, trunks, lamp posts (body only, the camera ignores them),
      bollards (any InstancedMesh named *bollard*, ready for the roads branch). "Third person" button + dev panel entry.
      Roads BVH + buildings.json + prism hashing in `viewer/character/colliderWorker.js`; the main thread gathers in
      slices of <= 4 ms.
- [ ] A real jump / fall clip (Quaternius' Universal Animation Library retargets to this rig family); the controller's
      run speed (5.5 m/s) is faster than the clip's authored jog (2.9 m/s): playback runs ~1.9x, tune one or the other.
- [ ] Shelters are solid boxes (you can't step inside one yet); the open side needs its own shape.
- [ ] Interiors: exclude the entered house's footprint prism (`PrismSet.exclude(BU_ID)`) and add its interior BVH;
      sun light leaks at wall seams indoors (shadow normalBias 5 cm vs 20 cm walls): interior lighting needs its own pass.
- [ ] City: tram platforms, shelters, benches, bollards and parked cars are not colliders yet; build the roads BVH in
      the tile worker (25-60 ms on the main thread per tile today); a Third-person button in the UI.

## STIB tram model (approved by the owner 2026-11-04, merged)
- [x] T3000 (line 92's stock) scripted in Blender (`tools/blender/tram.py`), loader / LODs / placement `viewer/tramModel.js`,
      Tram Lab (`labs/tram-lab.html`), in the city by default (tramline.js; `?tram=box` = the old boxes). Per tram: LOD0 15.9k, LOD1 5.7k, LOD2 1.35k triangles.
- [x] Owner approved; the model is the default in tramline.js (boxes kept behind `?tram=box` and as the load-failure fallback).
- [ ] Interior (seats, poles) behind the glass; door opening at stops; pantograph height following the wire; the
      window AO / dirt pass; fleet numbers on the nose; T4000 (7 sections) if other lines come.
## Saint-Job hero church (approved 2026-11-04; in the city by default, `?stjob=0` = the UrbIS solid; +0.3 ms GPU, +9 draws at Saint-Job)
Done as planned below (hidden in façades + far LOD via `entry.hide`, kept in the roof grid; one THREE.LOD placed in main.js, shown while I6 is loaded).
Still open: the falcons do not use the `nest` node yet.
Scripted model `tools/blender/stjob.py` -> `models/stjob/` (notes: `models/stjob/NOTES.md`), loader + LODs + materials
`viewer/stjobModel.js`, lab `labs/church-lab.html`. LOD0 38.6k / LOD1 15.0k / LOD2 3.0k triangles, 4 draw calls per LOD,
AO lightmap 5.3 MB (R8 2048² + mips), GLB 4.0 MB (uncompressed).
**How it replaces the UrbIS solid in the city** (after approval):
1. `main.js`: `const stjob = params.get("stjob") !== "0" ? await loadStJob() : null` next to `loadLampModel()`; pass
   `STJOB_BU_ID` ("https://databrussels.be/id/building/1587133", solid buildingsolid/509924) to the tile builder.
2. Hide that building: in `tileData.js` skip every `bDoc.buildings` entry whose `attrs.BU_ID === STJOB_BU_ID` in the
   façade build (facadeGeom.js) and in the far-LOD solids (`buildLiteData`), i.e. filter before both loops; KEEP it in
   `roofGrid` (fly-mode roof collision: the UrbIS envelope is close to the model's). Rebuild the worker bundle
   (`node tools/build_worker.mjs`).
3. Place the model once (it is not per tile, but only while its tile is loaded): `root.position.set(1216.19, 75.40, 561.44)`,
   `root.rotation.y = 0.09225` (values in `models/stjob/stjob.json` "placement"); add `model.make(0..2)` groups and switch by
   camera distance to the octagon (`STJOB_LODS`: LOD0 < 170 m, LOD1 < 520 m, LOD2 beyond); beyond the full-tile ring the
   far tiles' flat solid still contains the church (fine at that distance) — or skip it there too and keep LOD2.
4. The falcons: the glTF node `nest` (church frame (-16.98, 20.95, -14.86), world = rotate by rotation.y + position) is on
   the belfry floor behind the right-hand louvred arch of the tower's outer (NW) face; `spire_tip` = fly-mode start.
5. Materials already read `env` (night glow); check shadows (the shadow box) and the city's fog on them; GTAO is off on glass.
Open: GLB compression (gltfpack -cc / meshopt), interior for the open lantern is just sky-through, the clock dials have
no numerals, the sacristy annex is simplified (3 gabled blocks), windows have no tracery apart from the roses.

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
- [x] **All of Uccle (2026-11-04):** the study area is the commune boundary (OSM rel. 58253) + the
      first box; 120 tiles on a 15 × 12 grid (A1..O12, old G4 = I6, see CONTRACT §3), 25,458
      buildings, 148 MB of tiles. Built in 11 min with 6 parallel `run_tile.py` groups, then
      `build_trees.py` for all (trees need the neighbours' buildings). Road network: 4,531 roads,
      135 refine errors left (was 17 on the small grid) to look at.
- [ ] **The Brussels region** (~650 tiles, ~1.2 GB): a one-command parallel build
      (`run_tile.py --jobs N`), cheaper far tiles, road quality at scale. Do it once Uccle holds 60 fps.
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
- [~] Hero landmarks: Saint-Job church done in the Church Lab (see "Saint-Job hero church" above), waiting for approval; then other recognisable buildings.
- [ ] Export glTF + meshopt + KTX2; load once; place with InstancedMesh / BatchedMesh.

## 4. Buildings
- [ ] Shop names on fascias (text atlas from OSM `name`).
- [ ] Gable attic windows, dormers, balconies, bay windows (common in Uccle).
- [ ] Garage doors on street faces of detached houses; garden walls and gates.
- [~] Church: superseded by the scripted Saint-Job model (drum oculi, lantern, materials from the photos) once approved.
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
