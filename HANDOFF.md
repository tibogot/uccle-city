# Handoff: where the project stands and what's left

**Full list of open work: `docs/TODO.md`.**

Read this first when resuming (with Claude or by hand). Rendering and performance plan: `docs/RENDER_PLAN.md`; what we learned from slop-newyork, game-engine-v1 and three r187: `docs/RESEARCH.md`. Details are in `docs/PLAN.md`
(roadmap and history) and `docs/CONTRACT.md` (data format, v0.7).

## State on 2026-11-12: many systems built as labs, waiting for the owner's review

`claude/foundation` (main, last pushed to Vercel at aa07f5f) has the town hall hero merged (`?townhall=1`). Almost
everything else lives on its own branch / worktree (`.claude/worktrees/<name>`), lab first, NOT merged. The owner reviews
each page separately; the list with every URL is at the top of `docs/TODO.md` ("OWNER REVIEW LIST"); the merge order,
conflicts and dependencies are in **`docs/MERGE_PLAN.md`**. Review servers: `python %TEMP%/uccle_nocache_server.py
<port> <worktree>` (they die on shutdown; ports 8801-8832).

| system | branch | lab / doc | notes |
|---|---|---|---|
| Mesh checker (no z-fight, no bad shading) | stalle (copied into several) | `tools/mesh_audit/README.md`, `labs/flickerTest.js` | every hero 0 blocking before packing; city audit: `docs/CITY_MESH_AUDIT.md` |
| Heroes | stalle, saint-pierre, observatory, vanbuuren, wolvendael (+ pond / park water `viewer/water/`), police (Rue Rouge 17), nekkersgat (= the Calevoet STATION), trains (+ verrewinkel bridge) | each `labs/<name>-lab.html`, `models/<name>/NOTES.md` | method: `docs/heroes/*_PREP.md`, photos -> poses -> counts -> Blender -> checker |
| Roads v2 (measured markings, no invented zebras) | roads2 | `labs/road-lab.html`, `docs/ROADS_V2_RESEARCH.md`, `docs/roads/PHASE01.md` | phases 2-5 next; bridges / underpasses not built yet |
| Traffic | traffic | `labs/traffic-lab.html`, `docs/TRAFFIC.md` | adapt to roads v2 when merging |
| Impostor kit (trees, cars) | impostors | `labs/impostor-lab.html`, `docs/IMPOSTOR_KIT.md` | fixes the far-tree dots; trees switch after the tree-branch review |
| Weather + seasons + winter + live Open-Meteo | weather | `labs/weather-lab.html`, `docs/WEATHER.md` | `viewer/weather/`, `viewer/seasons/season.js` (shared hooks) |
| Foliage (grass, hedges, plants, ivy) | foliage | `labs/foliage-lab.html`, `docs/FOLIAGE.md` | placement API from land cover + ortho |
| Pedestrians | pedestrians | `labs/pedestrian-lab.html`, `docs/PEDESTRIANS.md` | Mr.doob's people (MIT) + bone tables + variety |
| Sound (all synthesised) | sound | `labs/sound-lab.html`, `docs/SOUND.md` | WAV renders for listening in `docs/sound/renders/` |
| Night lights (clustered + ground light map) | nightlights (on smallfixes) | `labs/night-lab.html`, `docs/NIGHT_LIGHTS.md` | the night-brightness fix is on `smallfixes` |
| Street life (shops, plates, stops, numbers) | streetlife | `labs/streetlife-lab.html`, `docs/STREETLIFE.md` | data licences to confirm before public |
| Minimap + full map | minimap | `labs/map-lab.html`, `docs/MAP.md` | `?map=1` |
| Flags (Verlet + baked loops) | flags | `labs/flag-lab.html`, `docs/FLAGS.md` | town hall poles `?flags=1` |
| Sauvagère park (rock cliff, playground kit) | sauvagere | `labs/park-kit-lab.html` | PAUSED: owner photos |
| Research | in main | `docs/SLOP_NEWYORK_AUDIT.md`, `docs/PEDESTRIANS_RESEARCH.md`, `docs/IMPOSTORS_RESEARCH.md`, `docs/MARKET.md` (refreshed) | |

Open questions to settle: an InstancedMesh seemed to add a fixed ~0.8 ms on an idle GPU in r187 (Street Life round 2):
measure on a quiet machine before merging instanced layers. Owner's standing rules for agents: max 2 heavy agents (3
allowed when worth it), one short-lived Chrome tab each, check three.js + Mr.doob's slop-newyork first for rendering,
LOOK-only use of Google imagery, never merge or push without the owner's OK.

## Drive mode (branch claude/drive)

"Drive" button / `?view=drive`. W/S throttle-brake-reverse, A/D steer, Space handbrake, R reset, C camera
(chase / far / bumper / orbit, drag to look, wheel = distance), G colliders, Esc out. Code: `viewer/drive/`
(`carPhysics.js` arcade model after slop-newyork, `colliders.js` polygon / circle colliders in 48 m cells, built per
tile in the worker by `buildDriveData` from tileData.js, lamp posts added on the main thread, `driveMode.js` the mode).
The ground is a drivable-surface grid (road deck + sidewalks over the carved terrain, cm per 1 m cell). Sidewalk kerbs
are climbed (as the road engine intends); building footprints, raised kerb islands / medians / roundabout centres,
tree trunks and lamp posts block. Not colliders yet: parked cars, trams, street furniture, garden walls / hedges.
Hero models: the drive colliders keep the UrbIS solids a model replaces (built before `hideBuildings`), and a model adds
what its footprint lacks through `driver.addStatic(polys)` (Saint-Job's front steps: `stjobModel.js stjobColliders`).
The car: one loader, `viewer/drive/carModel.js loadCarModel(spec)` (`scripted` = tools/blender/car.py, `kenney:<id>`,
`quaternius:<id>` = CC0 packs via `viewer/drive/carPacks.js`); `?car=<spec>` or `__driver.setCar(spec)`; `fitBody`
sizes the physics box to the model. Packs: `node tools/cars/convertPacks.mjs` (raw packs in data/raw/cars/, see CREDITS).

## The Saint-Job falcons (branch claude/falcons)

A peregrine family at the church, on by default (`?falcons=0` = none): the eyrie behind the falcons' louvred arch
(`tools/blender/falconNest.py` -> `models/falcons/nest.glb`), three eyases, the female and the tiercel with behaviour
state machines (perches from the church's `perch_*` nodes, thermals, stoops, the aerial food pass, feeding), all on the
fly-mode rig (`viewer/falcons.js`, baked Perch / Sit poses). Fly mode now starts at the nest (the young falcon's first
flight; `?flystart=spire` = the old start, `?birdskin=adult` = the old plumage). Lab `labs/falcon-lab.html`; method,
cost (GPU within noise, ~0.1-0.17 ms CPU), reference comparisons and weak points: `docs/FALCONS.md`.

## Interiors (branch claude/interior, pilot)

The first interior cell: a terraced house near Place de Saint-Job (UrbIS 1786120). Lab `labs/interior-lab.html`, city
`?interior=1` (tile I6; streams in within 40 m). Method (spec from the city's own façade analysis, Blender build + Cycles
bakes, per-corner light on pieces, ambient-cube probes, façade/terrain cut, portal, character hooks): `docs/INTERIOR.md`;
status and re-run commands: `docs/interior/STATUS.md`.

## Façade kit (branch claude/facade-kit, pilot, behind `?kit=1`)

Premium Blender pieces (tools/blender/facadeKit.py: windows A/B, sill, hood, soupirail, doors A/B, steps, cornice +
corner + modillions, plinth, balcony) placed in the tile worker exactly on the painted window grid, the walls cut their
openings, dithered fades to the painted façade beyond ~115 m. Lab `labs/kit-lab.html`; method, numbers, weak points and
next piece sets: `docs/facadekit/README.md`.

## Rules that still hold

- `github.com/tibogot/game-engine-v1` is a READ-ONLY reference: never modify or push to it.
- Don't edit `vendor/roads/` or `vendor/slop-trees/` (copied code, see their `ORIGIN.md`).
  If you must, log it in that folder's `CHANGES.md` with the reason.
- Never substitute mocked or made-up data: if a dataset can't be fetched, say so.
- Work on branch `claude/foundation`.
- Asset quality (Blender AND procedural JS), owner's rules: no z-fighting (no coplanar or near-coincident
  overlapping faces, sealed gaps, no light leaks) and no bad shading from topology / normals (no triangle fans
  around circles and openings, no streaks across flat walls, no faceted round parts): flat faces keep flat
  normals, support loops round openings, quality triangulation without slivers, enough segments + area-weighted
  normals on round parts, no shared vertices across hard edges. Check with the mesh checker (`tools/mesh_audit/`,
  on `claude/stalle` until merged) and grazing-light close-ups before claiming; no hero merges without a clean run.

## Smooth LOD

`docs/SMOOTH_LOD.md`: no LOD pops (nested tree LODs with a geomorph, impostors as the far LOD and on the far
tiles, dithered cross-fades via `viewer/lodFade.js`), shadows that fade instead of stopping (light-space texel
snap, fixed box sizes, `FadedShadowNode`), streamed tiles cross-fade. `?smooth=0` = the old hard switches; dev
panel folder "Smoothness".

## Dev panel

`viewer/devPanel.js` (top right, on by default; `?panel=0` = old HUD only), built on our own UI
`viewer/panelUI.js` (no lil-gui or other GUI library: the owner's rule). Sections: Time & sun, Sky & clouds,
Weather, Lighting & post, World (reload options), Camera & modes, Performance (live GPU ms, benchmark),
Debug. "Copy link to this view" puts the state + camera in `?dev=`. H = photo mode.

## Labs

`labs/` (open `/labs/`): one page per asset or system, to look at it on its own before it goes into the city
(the owner's game-engine-v1 practice). Bird, Lamp, Tram, Church, Car and Capsule labs done; Tree and Material labs planned. New assets get a
lab first, then go into the city. Capsule Lab: the third-person character (`viewer/character/`: controller, camera, collision, CC0 Quaternius character with foot IK; the "Third person" button / `?view=third` in the city, `?char=capsule|hoodie|casual`). Tram Lab: the STIB T3000 (`tools/blender/tram.py`, `viewer/tramModel.js`); in the city by default (`?tram=box` = the old boxes).
Car Lab (`labs/car-lab.html`): the driving model drive mode uses on a test ground (walls, courtyards, kerb island,
ramp, posts), handling / suspension / camera sliders, colliders drawn (G); the car model is swappable (`viewer/drive/carModel.js`,
`?car=scripted|kenney:<id>|quaternius:<id>|faceted:<id>`), plus a car-pack comparison and a parked-street benchmark (`?mode=compare`,
`?mode=street`, `labs/car-compare.js`; screenshots in `docs/cars/`). The city's parked cars are the faceted family
(default; `?cars=box` = the old boxes, `?cars=ab` = both, switched live with `__cars.mode("faceted"|"box"|"none")` for
A/B timing): `viewer/cars.js` places them as before (OSM parking lanes against the measured kerbs) and keeps per tile an
invisible InstancedMesh "parked-cars" of boxes sized to each car's type (the third-person colliders);
`viewer/carFleet.js` draws all loaded tiles' cars as ONE fleet (type mix, Brussels paints, instanced per type per LOD,
LOD0-1 rich material with clear coat and see-through glass, LOD2-3 plain, LOD3 casts no shadow, dithered fades in
separate small batches: LOD switches, the 380-420 m range end, tiles streaming in; `__carFleet.stats`, with a pop
counter; the LODs are built in viewer/carLodWorker.js (shared array code viewer/drive/carLod.js), the materials compiled async, the types go live one per frame: no main-thread hitch; each slot gets a type that fits its length, the mix kept: a panel van needs a 6 m slot). Our own faceted family (`tools/blender/carFaceted.py` -> `models/cars/faceted.glb`,
same contract as the packs: one material, COLOR_0 = palette x Cycles-baked AO, `_KIND` 0-8, per-instance paint; glass drawn
see-through with alpha-to-coverage in the same opaque draw): hatch_s, hatch_c, estate, saloon, suv, van_c, van_p, taxi;
`?mode=compare&layout=family`, `&faceted=<id>`; the street benchmark has it as an option. Polish pass: per-type
fascias / rears, lower-door character line, fuel flap, two-distance AO, clear-coat paint (MeshPhysicalNodeMaterial,
clearcoat on the paint mask, `packLook.clearcoat`), glass casts a light shadow (`maskShadowNode`), the Brussels taxi
livery; LODs (`PACK_SOURCES.faceted.lods`): body / wheel errors per LOD, LOD3 welded on position only with colour as
an attribute (`simplifyLoose`), Prune from LOD2; the street fleet cross-fades LODs with a dithered complementary mask
(`packMaterial({ crossFade })`, per-instance `lodFade`, +-10 % around each switch distance). Rebuild:
`blender --factory-startup -b -P tools/blender/carFaceted.py -- models/cars [--preview docs/cars] [--only id,id]`.

## How to run

```
python3 -m http.server 8765        # from the repo root
open http://localhost:8765/viewer/index.html?tile=I6   # Saint-Job (was G4)
```
Useful URL params: `roads=engine` (the road engine's guessed carriageways / sidewalks instead of the measured UrbIS street surfaces, which are the DEFAULT since 2026-11-05 on all 120 tiles: viewer/surfaces.js, pipeline/build_surfaces.py, docs/ROADS_RESEARCH.md), `far=0..6` (far-LOD ring), `clock=HH:MM`, `timescale=N`, `trams=0`, `tram=box` (the old box trams instead of the Blender T3000), `worker=0`, `tile=A1..O12` (120 tiles of all Uccle; Saint-Job = I6, the old G4), `ring=0|1|2` (neighbour tiles), `yaw=deg` (walk facing), `view=stjob|walk`, `at=x,z`, `cam=x,z,height`,
`view=drive` (drive mode: a car on a street near Saint-Job, or the road nearest `at=x,z`), `drivedebug=1` (draw the drive colliders), `car=faceted:<id>|scripted|kenney:<id>|quaternius:<id>` (the drive-mode car), `time=golden|midday|overcast|twilight|night`, `fx=0` (no post effects), `trees=slop` (slop-newyork trees), `trees=simple`
(old leaf-card trees), `sunlight=1` (cascaded shadows), `warmup=0` (no boot shader warm-up), `log=0` (dev log collapsed), `gpu=0` (no GPU timing). Use Chrome/Edge with WebGPU for real
speed; headless screenshots use the slower WebGL2 fallback.

Deploy (Vercel): static, no build step. `vercel.json` redirects `/` to `/viewer/index.html` and sets
cache headers; `.vercelignore` leaves out the pipeline, tools and docs. Import the repo in Vercel
(framework "Other") or run `vercel` from the repo root.

Pipeline (raw data must be fetched first, see README): `python pipeline/run_tile.py --all --network`.

## Done (all pushed)

- Data: UrbIS 3D buildings, DTM, DSM, transport, orthophoto 2024 (all CC0) + OSM (ODbL).
  All of Uccle: 120 tiles of 500 m (A1–O12, 15 × 12 grid, only tiles touching the commune) built
  2026-11-04. Old tile names (A1–H4) shifted: old G4 = I6 (docs/CONTRACT.md §3).
- Roads: full network through the road engine; 14 errors left inside tiles (23/32 tiles clean).
- Viewer (`viewer/`): three.js r187 WebGPU + TSL. Terrain, roads with painted markings and
  real surfaces (setts, pavers), tram rails, procedural façades with interior-mapped windows,
  real roof colours, landmarks (church) with stone, tracery and stained glass, cornices /
  ridge caps / buttresses as real geometry, slop-newyork trees on ~47k LiDAR tree positions,
  sky + IBL + shadows + GTAO/SSR/bloom, time-of-day presets, a walk mode.

## Remaining, in priority order

1. **Check on a real GPU (WebGPU)** in a browser: performance with all trees (1,600 per tile,
   47k total), the night-window speckle seen in software rendering, buttress/cornice look.
2. **Church**: done: deep (parallax) openings, tracery, rose window, belfry louvres,
   buttresses, ribs. Rose window on the main front. Left: compare materials with a photo of
   Saint-Job, oculi on the dome drum, lantern detail.
3. **Houses**: (chimneys, eaves + gutters done) shopfronts from OSM `shop=*`, gable attic
   windows, parallax window reveals.
4. **Night and props**: (street lamps done, procedural placement: `viewer/lamps.js`; bus stops,
   signals, bike racks, benches done from OSM points: `viewer/furniture.js`; shopfronts done from
   OSM shops; tram platforms, shelters and overhead wires done: `viewer/tram.js`) parked cars done
   (procedural, `viewer/cars.js`; drawn as the faceted family by `viewer/carFleet.js`). Tram 92 runs on STIB's real timetable
   (`viewer/tramline.js`, `pipeline/build_transit.py`). Left: shop name signs, bins, bollards,
   better car and tram models (Blender), live STIB vehicle positions, more lines.
5. **Ground**: OSM land-cover mask + procedural grass done (`viewer/ground.js`). Left: UrbIS
   Land cover (gardens / paving / lawns), hedges.
6. **Roads**: the ~12 remaining bad spots (Alsemberg/Brugmann sharp Y, crowded rings in
   C4/F2; run `node tools/check_roads.mjs --all`), bump on setts and kerbs, wet look,
   manholes; the marking atlas is ~24 MB per tile, so shrink it before streaming.
7. **Multi-tile streaming + LOD**: done: tiles load around the player and unload behind
   (`?ring=`), tile CPU work in a web worker (`viewer/tileWorker.bundle.js`, rebuild with
   `node tools/build_worker.mjs` after editing tileData.js / heightmap.js / facadeGeom.js /
   landcover.js / roadData.js; `cd tools/worker && npm install` first). Left: tree LOD /
   impostors, far tiles with the draped orthophoto. Whole Brussels region (~650 tiles,
   ~1.2 GB of tile data) is the realistic maximum with UrbIS.

## Continuing in Cursor / Claude (local machine)

1. Clone `tibogot/uccle-city`, branch `claude/foundation` (all work is there; nothing merged to main).
2. Serve the repo root: `python3 -m http.server 8765`, open
   `http://localhost:8765/viewer/index.html?tile=I6` in Chrome/Edge (WebGPU). Do the browser check
   in `docs/TODO.md` section 0 first.
3. Python pipeline: `python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt`.
   Raw data (`data/raw/`, git-ignored) is NOT in the repo: re-fetch with `fetch_osm.py`,
   `fetch_urbis.py`, the GTFS curl in `pipeline/build_transit.py`, and `build_roofcolors.py`
   (orthophoto). The built tiles in `data/tiles/` ARE committed, so the viewer works without them.
4. Tile worker bundle: after editing `viewer/tileData.js`, `heightmap.js`, `facadeGeom.js`,
   `landcover.js`, `roadData.js` or `vendor/roads/`: `cd tools/worker && npm install && cd ../.. &&
   node tools/build_worker.mjs` (commit `viewer/tileWorker.bundle.js`).
5. Tell the assistant: "read HANDOFF.md, docs/TODO.md, docs/PLAN.md and docs/CONTRACT.md, then
   continue with <item>". Suggested next: extend the area to all of Uccle (TODO section 1), then
   your Blender kit (`docs/BLENDER.md`, with your meshoptimizer rules).

## Blender assets

Plan for better houses/props made in Blender without losing performance: `docs/BLENDER.md`.

## Tips for the next session

- Pipeline order matters: `build_features.py` rewrites `features.json`, so run `build_trees.py`
  after it (as `run_tile.py` does). Python venv: `/home/user/venv` in the cloud container
  (`../venv` from the repo, see README).

- Start by asking Claude to read `HANDOFF.md`, `docs/PLAN.md` and `docs/CONTRACT.md`.
- Screenshots in headless Chromium take 1–3 minutes per frame (software WebGL2); keep the
  viewport small (about 1000 px wide).
