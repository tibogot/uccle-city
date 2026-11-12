# Slop New York vs Uccle 3D: gap audit (2026-11-10)

A read-only study of Mr.doob's **mrdoob/slop-newyork** (https://github.com/mrdoob/slop-newyork, demo
https://mrdoob.github.io/slop-newyork/) against our city. Goal: list everything his city has that ours lacks or does
worse, what it would cost us, and what to take first. Our earlier notes: `docs/RESEARCH.md` sections A (rendering,
culling) and E (driving, collision). This file does not repeat those details; it points to them.

How to read the references: `his js/file.js:123` = his repo at the commit below; `ours viewer/file.js:123` = our
`claude/foundation` at 5a28945; `branch claude/x` = one of our unmerged branches. Costs marked *estimate* are my
judgement, not a measurement (he publishes start-up timings, not per-feature frame costs).

## His repo today

- **HEAD: `536a907c605964421563f12f15c5e00d735fc94f`, 2026-11-06** ("Improve pedestrian jump and landing
  animation"). three.js r187 from jsDelivr, no build step, no workers, plain ES modules (`index.html` import map).
- **Since our pinned commit 737b769 (2026-11-03) only 6 commits:**
  1. `c8a904d` (a contributor's PR, "Optimize GPU frame time"): sun shadow tiles fixed at 2048 px instead of 3072
     (`js/lighting.js:192`, "56 % less shadow texel fill"), shadow far 300 -> 220 m and the altitude growth capped at
     600 m (`js/lighting.js:195, 315`), bloom at 0.35 resolution instead of 0.5 (`js/post-processing.js:50`), kerbs no
     longer cast shadows (`js/city-grid.js:1595, 1604`), more objects chunked / given shadow stand-ins (thresholds
     roughly halved, `js/scene-culling.js:179-182, 247, 256`), MSAA off on Firefox (`js/main.js:83-87`).
  2. `6b191ee`: storefront sign / spotlight heights fixed.
  3. `e17cde4`: tall towers no longer sliced out of the sun shadow: each cascade camera is pushed back along the sun
     direction by `550 / sunDir.y` (`js/lighting.js:199-215`). Not needed for Uccle (no 500 m towers), but the same
     clipping can hit our tall heroes at low sun if we use `SunLight` (`?sunlight=1`).
  4. `df5a3b9`: bicycle braking / Space handbrake.
  5. `63df441`, `536a907`: pedestrian walk / run / turn gait and jump / landing reworked (`js/pedestrians.js`, +830
     lines of tests).
- **Our copy of his trees is still current**: `js/trees.js` and `js/building-collision.js` are unchanged since 737b769
  (`git diff --stat 737b769 HEAD`), so `vendor/slop-trees/` needs no update.
- Licence: MIT, "Copyright (c) 2026 Mr.doob" (`LICENSE`). Any code we copy goes into `vendor/<name>/` with his licence
  file and an `ORIGIN.md`, like `vendor/slop-trees/`. His *data* (NYC Open Data, OSM) is irrelevant to us.

## The big picture in one paragraph

His city is a **game**: four ways to move (walk, car, bicycle, helicopter), 340 procedural pedestrians, 200 cars + 12
buses + highway traffic, full procedural sound, a minimap and a searchable full map with teleport, touch and gamepad
controls, a polished HUD. It renders one fixed island built entirely at start-up. Ours is a **real place**: real
relief, measured streets, LiDAR trees, streaming 120 tiles, Blender heroes, a physical sky, smooth LOD, real
timetables. What we lack is mostly the *life and the interface layer*: people, sound, a map, real lights on moving
things, wet roads, touch controls. Where he is ahead in rendering, it is a handful of specific tricks, listed below.

## Feature table

Legend for "ours": **have** = on `claude/foundation`; **branch** = done on an unmerged branch; **missing**;
**worse** = we have it but his is better; **ahead** = ours is better. Cost: dev effort S (< 1 day), M (2-5 days),
L (1-3 weeks); runtime in ms per frame (*estimates* unless said).

### Rendering

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| Real dynamic lights at night | `ClusteredLighting(256, 32, 28, 48)` (`js/main.js:92`) with fixed pools parked at intensity 0: 36 street spots + 48 points (`js/street-details.js:995-1134`), 28 shop spots (`js/buildings.js:656-680`), 96 car headlight spots + 6 police lights (`js/traffic.js:443-470, 1775-1835`), 28 highway spots (`js/traffic.js:2184`). Nearest-first, faded at the pool edge, never toggled (no shader rebuilds). | **worse**: lamp light *map* lights only ground materials (`viewer/lampLight.js:1-8`), plus 6 point lights on the main tile (`viewer/lamps.js:172-189`); car headlights emissive only (branch claude/traffic, `docs/TRAFFIC.md` "Headlights are emissive only"). Cars, people, tree trunks and walls get no lamp light. `docs/RENDER_PLAN.md:203` already plans it. | **Yes, high.** The biggest night-time realism jump: headlight beams on the road, lamps lighting cars and façades. | M; *estimate* +0.5-1.5 ms GPU at night (clustered forward), ~0 by day (his pools sit at 0). | Idea + pool pattern; tiny code, rewrite. |
| Sun shadows | `SunLight` addon, 2 cascades in one atlas, 2048 px tiles, far 220 m growing with altitude (`js/lighting.js:188-215, 315`). Cascade pushed back for tall towers (`:199-215`). | **have** (DirectionalLight 4096 following the camera by default, `viewer/lighting.js:158`; SunLight behind `?sunlight=1`, still on the old 3072 / 300 m values, `viewer/lighting.js:152-155`); our shadows fade instead of stopping (`docs/SMOOTH_LOD.md`): **ahead** on smoothness. | Take his new numbers for the `?sunlight=1` path; no change to the default. | S; saves GPU fill (his "56 %" on shadow texels). | Numbers only. |
| Shadow stand-ins + chunked culling | City-wide instanced meshes cut into 250-600 m cells, hidden past `size x 1100` (`js/scene-culling.js:15-20, 77-147`); big casters get position-only black proxies in 500 m cells on a shadow-only layer (`:202-340`). | **missing** (planned, `docs/RENDER_PLAN.md:200`). Our tiles are already 500 m chunks, so the culling half matters less; the shadow-proxy half (cheap shadow pass for façades, heroes) is new. | **Yes**, for GPU at street level and from the air. | M; *estimate* -0.3-1 ms GPU in shadow passes. | Code reusable (MIT), adapt per tile. |
| Bloom / post | Our chain *is* his (SSR, bloom, grade: `viewer/post.js:3-5` credits him). He now runs bloom at 0.35 scale (`js/post-processing.js:50`). | **have**, plus GTAO + denoise (`viewer/post.js:79-91`) and Firmament haze: **ahead**. Bloom still 0.5 (`viewer/post.js:113`). | Take bloom 0.35 (one line), check the look. | S; *estimate* -0.1-0.2 ms. | Already credited. |
| Sky, fog | `SkyMesh` + clouds, aerial fog from PMREM + height fog (`js/lighting.js:143-252`); 4 presets: golden, midday, blue hour, 23:00 (`js/lighting.js:27-128`). | **ahead**: Firmament physical sky, real sun, eye adaptation, volumetric fog option, 6 looks (`viewer/lighting.js`, `viewer/post.js:16-23`). | No. | - | - |
| Wet roads, puddles | One `uRoadWetness` uniform (`js/tsl-materials.js:79`, set per preset `js/lighting.js:302`): puddle field + damp / standing water / film masks (`js/tsl-materials.js:1775-1801`), used by road and sidewalk materials. | **missing**: we have a `uWetness` uniform (`viewer/lighting.js:105`) that **no material reads** (grep: only `lighting.js` uses it). | **Yes**: Brussels is wet; also the base for the weather lab and live weather (TODO "Live weather"). | M; ~0 ms (a few ALU in ground shaders, SSR already pays for reflections). | Code reusable (MIT). |
| Road and sidewalk wear | Asphalt: utility patches, tar snakes, cracks, potholes, stronger bump (`js/tsl-materials.js:1812-1911, 1913-2111`); sidewalk flags with joints, heaved flags, stains, chewing gum (`:2182-2330`); detail skipped where faded instead of x0 (`fadedDetail`, `:1803-1810`). | **worse**: asphalt patches / grain / wheel polish and paint wear (`viewer/roadPaint.js:72-77, 161-165`), real paving and setts (`viewer/surfaces.js`, `viewer/cobbles.js`); no cracks, tar snakes, potholes, manholes. | **Yes**, the cracks / tar snakes / manholes pass, and the `fadedDetail` trick for GPU. | M; ~0 ms if `fadedDetail` is used. | Code reusable. |
| Water | FFT ocean-spectrum normal texture made at boot (`js/tsl-materials.js:2734-2893`), murky body colour, Fresnel via metalness for SSR, analytic night skyline reflections; calmer variant for park lakes (`:2894-3130`). | **missing**: water is a flat glossy colour in the ground mask (`viewer/ground.js:54-62`); TODO 5 "Real water surfaces (ponds in parks)". | **Yes, the pond variant** (Wolvendael, Kinsendael, Montjoie ponds). The harbour parts do not apply. | M; ~0.1-0.3 ms when a pond is on screen. | Code reusable. |
| Windows / interiors | Box-filtered window grids, apartment interior raycast with drapes, distant lit windows (`js/tsl-materials.js:116-187, 230-421`). | **have** (interior-mapped windows in `viewer/facades.js`, adapted from his); façade kit with rooms behind glass on branch claude/facade-kit. | No (done). | - | - |
| Shop windows | Storefronts every ~7.5 m on 55 % of tall buildings (`js/buildings.js:353`): parallax interior with shelves, goods, counter, ceiling lamps; lit fascia sign from an 8-label atlas (`js/tsl-materials.js:511-634`); awnings + lit signs as instanced boxes (`js/buildings.js:598-647`). | **worse**: shopfronts on real OSM shops, painted frame + glass + simple shelf hint (`viewer/facades.js:243-266`); no parallax depth, no lit sign. | **Yes**: copy the parallax room (counter + shelves) into our OSM shopfront; put the **real OSM shop name** on the sign (he uses 8 fake names, `js/tsl-materials.js:515-516`). | M; ~0.1 ms (ground-floor pixels only). | Code reusable. |
| Street-canyon AO | `canyonSkyAONode` darkens low walls by street height (`js/tsl-materials.js:190-201`). | We replaced it with 1 in the trees (`vendor/slop-trees/ORIGIN.md`); GTAO covers contact shading. | No (Uccle is low-rise). | - | - |
| Party walls, ghost signs | Brick / parging on party walls, faded painted adverts on broad blank walls (`js/tsl-materials.js:1005-1060`). | **missing** (our blank side walls get the normal façade). | Maybe: blank *mitoyen* walls are everywhere in Uccle; ghost ads are rarer. | S-M; ~0 ms. | Code reusable. |
| Contact shadows under cars | One instanced quad per car with a rounded-box SDF darkening (`js/traffic.js:369-412`, `js/tsl-materials.js:3409-3445`). | **missing** for parked / moving cars beyond the shadow range. | **Yes**, cheap and grounds the 1,000s of parked cars beyond the shadow box. | S; ~0.05 ms. | Code reusable. |
| Steam, god rays, billboards | Steam stacks, god-ray cones, Times Square LED billboards (`js/tsl-materials.js:2376-2733, 3185-3407`). | missing | No (Manhattan props). Smoke texture maybe for chimneys in winter later. | - | - |

### City content

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| **Pedestrians** | 340 people (`js/pedestrian-system.js:7`), fully procedural bodies (lofted rings, 8 parts, male / female, hair, palettes: `js/pedestrians.js:107-760`), **one instanced skinned draw per LOD** with 15-bone poses in a storage buffer (`:966-1035`), near / far LOD at 34 m, planted footsteps + two-bone IK (`:1036+`), sidewalk tracks, kerb queues, conversations, crossing on WALK only, diving away from cars (`js/pedestrian-system.js:1-60`, `js/pedestrian-routes.js`). | **missing** everywhere (no branch has a crowd). We have one player character (claude/capsule, claude/character2). | **Yes, high**: the city is empty without people. His body generator fits our "all assets scripted" rule; the crowd pattern (pose buffer, one draw) is the part to copy. | L; *estimate* 0.3-1 ms CPU for ~150 people near the camera (he spent `1fe128d` optimising it; `tools/benchmark-pedestrians.mjs` exists, no published number). | Code reusable (MIT); bodies are generated, no asset licence. |
| Moving traffic | 200 cars + 12 buses with IDM following, signals, yielding, front-wheel steering, dodging the player (`js/traffic.js:28-60`); separate highway traffic (`:2033-2466`). | **branch** claude/traffic: real lane graph, real OSM signals, priorité de droite, parking in / out, 0 pops, +0.32 ms GPU (`docs/TRAFFIC.md` on that branch): **ahead** on rules and smoothness. Missing vs his: buses, dodging, headlight beams (see lights). | Only buses (STIB buses on real GTFS like tram 92) and the player-dodge reaction. | M for buses. | - |
| Traffic lights | Signal heads lit by a shared clock uniform (`js/street-details.js:52-103`), pedestrian WALK / flashing hand signals, traffic obeys the same clock. | **have / branch**: OSM signal posts (`viewer/furniture.js:1-8`) lit by the cycle in `viewer/traffic/signals.js` (claude/traffic) and the Blender kit with Belgian cycle + pedestrian phase (claude/furniture `viewer/furnitureModel.js:11-13`). | No (once merged). | - | - |
| Street lamps | Cobra heads + post-top globes as instances, lit by the pools above. | **have**, better models (Blender swan-neck lamp, `viewer/lampModel.js`), light map. | Only the real-lights part (see lights). | - | - |
| Street name signs | Green blade on every signal pole... but **one texture for all: "5TH AVE · 42 ST"** (`js/street-details.js:139-141, 286-290`). | **missing**; planned bilingual plates (TODO plan step 4). | His is not worth copying; do ours with real names (one text atlas). | M. | - |
| Shop / place text | 8 generic shop names (`js/tsl-materials.js:515-516`), 10-ish fake fascia themes (`js/buildings.js:616-622`), 4 pier signs (`js/city-grid.js:645-678`), bus destination signs (`js/traffic.js:66-106`). Canvas atlases, alpha-tested, lit at night. | **missing** (TODO 4: shop names from OSM `name`). | Take the **atlas technique** (canvas -> one texture, rows per label, mip-aware sampling `js/tsl-materials.js:557-565`), with our real OSM names. | M; ~0 ms. | Code reusable. |
| Rooftop details | Water towers, HVAC penthouses, cornices, fire escapes, streamed around the player from fixed pools with a quadtree (`js/buildings.js:500-706`, `js/fire-escapes.js`). | Partial: chimneys, eaves, gutters (`viewer/facadeGeom.js`); façade kit on branch. | The *pool + quadtree streaming* pattern only; the objects are New York. | - | - |
| Small street props | Hydrants, mailboxes, food carts, steam stacks, sawhorses, scaffolding sheds, subway entrances (`js/street-details.js:547-815`, `js/street-props.js`, `js/subway-entrances.js`). | **branch** claude/furniture: bollards, bins, benches, bike hoops, Villo docks, STIB pole + shelter, signals, road signs, bottle banks (`viewer/furnitureModel.js:23-27`). Missing: bpost red mail boxes, hydrant marker plates, scaffolding. | Add bpost boxes / hydrant plates to the kit later (Brussels versions). | S each. | - |
| Trees | 3 LODs + crown cards, hard switches with 6 m hysteresis (`js/trees.js:809-811, 1099-1160`). | **have** (his trees, vendored) on LiDAR positions, plus smooth cross-fades and impostors: **ahead** on popping. | No. | - | - |
| Parks / plazas | Hand-built Central Park, Bryant Park, plazas. | **have** (land cover, setts squares). | No. | - | - |
| Far city | ~80k generic instanced far buildings, borough skylines (`js/boroughs.js`). | **ahead**: real far tiles with orthophoto (`buildLiteData`). | No. | - | - |

### Wayfinding

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| **Minimap** | Canvas 2D radar 288 x 184 px, bottom left (`css/style.css:679-690`), grid-north up, from the same data as the city (`js/nyc-map.js`). Details in the section below. | **missing** (TODO plan step 3). | **Yes, first.** | M. | ~300 lines reusable. |
| **Full map + teleport** | `M` key / click the radar: pan, wheel-zoom about the cursor, street + landmark search, click to teleport, scale bar, compass, pins with collision-free labels (`js/nyc-map.js:489-746, 1076-1263`). | **missing**: teleport only through URL params and dev-panel views (`viewer/devPanel.js:45-48`). | **Yes**, with the minimap. | M (same work). | Reusable. |
| Location HUD | "Where you are" drawn as a pair of NYC street signs (place name over the corner), from the nearest roads (`js/main.js:443-482`, `js/city-config.js:647-671`). | **missing**. | **Yes**, as Brussels blue / white bilingual street plates. | S. | Idea; small code. |
| Teleport points | A popover of 8 named places (`index.html:171-178`, `js/main.js:513-523`); a safe spot finder on the sidewalk (`js/controllers.js:403-465`). | dev-panel views only. | Yes (Saint-Job, Saint-Pierre, town hall, Observatory, Stalle, Wolvendael...). | S. | - |
| GPS route | An L-shaped line along the grid (x then z), not real routing (`js/nyc-map.js:395-409`). | missing | The idea yes, his code no (Uccle is not a grid; we have the road graph, so A* on `data/roads/network.json` is easy). | S-M. | - |

### Gameplay

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| Driving + collisions | Arcade bicycle model, 120 Hz substeps, polygon colliders in 48 m cells, car-vs-car SAT (`docs/RESEARCH.md` E). | **have** (claude/drive merged: `viewer/drive/`), car-vs-traffic SAT on claude/traffic. | Done. | - | - |
| Bicycle mode | Pedalling rig, lean, braking, Space handbrake (`js/controllers.js:629-787, 1321-1387`). | **missing**. | Maybe: Brussels has Villo bikes and many cyclists; reuses the drive physics. | M. | Reusable. |
| Walking | Procedural person with planted feet and IK as the player (`js/controllers.js:466-508, 1157-1227`). | **have**, different: capsule controller + Quaternius / Y Bot (claude/capsule, claude/character2), foot IK. | No. His gait work (`63df441`) is a reference for our feet audit. | - | - |
| Flying | Helicopter with rotor, skids, its own sound (`js/helicopter.js`, `js/controllers.js:1388+`). | **have**, different: the falcon fly mode (`viewer/flight.js`, `viewer/falcons.js`). | No. | - | - |
| Cameras | 3 follow cameras (chase, low action, first person) + 8 scenic presets + an auto-director drone (`js/cameras.js:6-18, 314+`), mouse / touch orbit and zoom. | **have** per mode (drive: chase / far / bumper / orbit; walk; third; fly); photo mode (`viewer/devPanel.js:69`). | The **auto-director drone** (a cinematic idle camera) is nice for the site's front page. | S-M. | Reusable. |
| Save position | Player state to `localStorage` every 5 s and on leave (`js/main.js:149-176, 715-718`). | URL share link only (`viewer/devPanel.js:6`). | Yes, cheap. | S. | - |

### Interface, input, sound

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| HUD | Mode switch with sliding pill, speed meter, altitude, FPS, per-mode key hints, native `[popover]` menus, hide HUD (H), all keyboard shortcuts (`js/main.js:265-600`, `index.html`, `css/style.css` 1,400+ lines with 9 breakpoints). | Dev panel (own `viewer/panelUI.js`) + stats; no player HUD. | **Yes**, a visitor HUD separate from the dev panel (our own UI, no lil-gui). | M. | Look / CSS ideas. |
| Loading screen | One bar filling through every start-up stage, each stage sized by its measured time, compositor-animated so it moves while the main thread is busy; stays up until the GPU finished the first frame (`js/main.js:30-75, 751-766`). | "Loading Uccle…" text (`viewer/index.html:47`). | Yes (S). For streaming tiles, a small "loading area" indicator (TODO 2 "a loading indicator"). | S. | Reusable. |
| Touch controls | Virtual stick + per-mode buttons, pointer capture, hybrid-device detection (`js/touch-controls.js:1-167`). | **missing** (TODO "phones and tablets"). | **Yes**, once we test phones. | M (plus mobile perf work, which is the real cost). | Reusable. |
| Gamepad | Steering, triggers, mode / camera cycling, map toggle (`js/gamepad-controls.js`). | **missing**. | Yes, small. | S. | Reusable. |
| **Sound** | All procedural, **no audio files**: per-vehicle engine voices (cylinders, diesel, `js/audio-synthesis.js:39-96`), rotor, turbine, bicycle chain and ratchet, sirens; event sounds: footsteps, speech fragments, horns, crashes, wind gusts, pedestrian signal ticks (`js/audio-events.js:39-290`); HRTF panners, nearest-sources ranking at 10 Hz, muffling behind buildings by tracing the collider grid, one shared convolution reverb (`js/audio-system.js:13-75, 163-172`, `js/audio-acoustics.js`, `js/audio-sources.js:3-6`). Mute key N, horn B. | **missing** everywhere (no `AudioContext` in any branch). TODO 6: tram sound, bells, ambience. | **Yes, high**: sound is half of "feels real". Ours would add the tram (wheels, bell), church bells on the hour, birds (the falcons!), rain. | L; ~0.1-0.3 ms main-thread at 10 Hz control rate (*estimate*), audio runs on its own thread. | Code reusable; no sample licences needed. |

### Performance and engineering

| Feature | His (how, where) | Ours | Worth taking? | Cost | Licence note |
|---|---|---|---|---|---|
| Shader warm-up | Precompile everything under the loading screen, 16 parallel `compileAsync`, then a shadow warm-up frame (`js/main.js:608-674, 731-758`). | **have**, adapted to streaming (`viewer/warmup.js:1-9`, game-engine-v1 machinery). | Done. | - | - |
| Fixed pools | Empty pools keep one degenerate instance so pipelines exist (`js/pedestrians.js:977-1018`, `docs/RESEARCH.md` A). | **have** (car fleet, trees, lamps). | Done. | - | - |
| Static matrices | `scene.matrixWorldAutoUpdate = false`, only moving roots updated each frame (`js/main.js:206-215, 727-728`). | **missing** (grep: no `matrixWorldAutoUpdate` in `viewer/`). | **Yes**: free CPU with 1000s of static objects per tile. Needs care with streaming (update a tile's root once when it lands). | S-M; *estimate* -0.3-1 ms CPU. | Idea. |
| Instance buffer uploads | Static usage + update ranges, never `DynamicDrawUsage` (re-uploaded in every pass) (`21f71bd`). | **have** (`viewer/carFleet.js:162`, `viewer/tramModel.js:310`, `viewer/treesStylized.js:350`). | Done. | - | - |
| Unit tests | 30 Node test files with a three.js stub: traffic, signals, collisions, map, shadows, LOD (`tests/*.test.cjs`). | Lab-scripted tests only (Capsule Lab, traffic lab); TODO 9 "Tests". | Yes for the pure-logic modules (traffic sim, colliders, map labels). | S per module. | Pattern. |
| Workers / streaming | None: everything on the main thread at boot. | **ahead**: tile worker, collider worker, car LOD worker, 120 tiles streamed. | No. | - | - |

## Top 10 to take, in order

1. **Minimap + full map with teleport** (`js/nyc-map.js`). Already the agreed next step after the combined build; his
   code is clean, MIT, and 60 % of it (tiled Path2D layers, map view, label placement, pan / zoom / search / teleport
   handling, scale bar) transfers almost unchanged. It also gives the owner a fast way to test the whole city.
2. **Real lights on moving things at night** (`ClusteredLighting` + fixed pools). Today a car at night has glowing
   headlights that light nothing, and lamps do not light cars, people or walls. This is the largest night-time gap and
   fixes a weak point already listed in `docs/TRAFFIC.md`. Must be one fixed pool, never resized (shader rebuilds).
3. **Procedural sound** (`js/audio-*.js`). Nothing in our city makes a sound. Start with the cheap set: tram wheels and
   bell, our traffic's engine voices, footsteps, wind, church bells on the hour; reuse his source ranking, building
   muffling (our drive colliders already have the 48 m cell grid it needs) and shared reverb.
4. **Pedestrians** (`js/pedestrians.js`, `js/pedestrian-system.js`). An empty city reads as a model. His crowd (one
   instanced skinned draw per LOD, pose buffer, scripted bodies) fits our rules; routes come from our measured
   sidewalks and crossings, permissions from `viewer/traffic/signals.js`. The biggest job on this list.
5. **Wet roads and puddles** (`roadWetMasks`, `js/tsl-materials.js:1775-1801`). Our `uWetness` exists and does nothing;
   this is cheap, very Brussels, and the foundation for rain and live weather.
6. **Shadow stand-ins** (`js/scene-culling.js`) plus his newest shadow / bloom numbers (2048 tiles, 220 m, bloom 0.35).
   GPU savings that make room for items 2 and 4.
7. **Location HUD + real text atlas**: the "you are here" street-sign HUD (`js/main.js:443-482`) and his canvas text
   atlas technique for shop names, bilingual street plates and STIB stop names, filled with *real* names (his are fake).
8. **Shop window depth**: his parallax shop interior (`js/tsl-materials.js:567-625`) inside our OSM shopfronts, with a
   lit name sign. Streets like Chaussée d'Alsemberg are mostly shops at eye level.
9. **Pond water** (`createWaterMaterial`, lake variant): Wolvendael, Kinsendael, Montjoie and the Geleytsbeek ponds are
   flat colour today.
10. **Static matrices + contact shadows**: `matrixWorldAutoUpdate = false` per tile (CPU), and the SDF contact quad
    under parked cars beyond the shadow box (looks). Both small, both free-ish.

Next in line: touch + gamepad controls and a visitor HUD (needed before any public / phone launch), the save-position
and loading-bar polish, road cracks / tar snakes / manholes with `fadedDetail`, bicycle mode, the auto-director drone
camera, STIB buses, unit tests for the logic modules.

## His minimap, exactly

**What it is** (`js/nyc-map.js`, 1,266 lines, one class `NYCMapSystem` at `:428`):

- **Data**: the same geography the 3D city uses: boroughs, Manhattan's coastline, piers, parks, every kerb island
  (block), Central Park lawns / drives / ponds, building footprints in 3 height tones, landmark lots, highways,
  bridges (`:204-291`). Nothing is pre-rendered offline.
- **Vector layers, built once**: each layer is a set of `Path2D` objects in *world metres*, split into 500 m (or 1 km)
  square tiles (`TiledLayer`, `:160-201`), so a view only fills the tiles it overlaps. Drawing = set one canvas
  transform (world -> pixels, `MapView.world`, `:355-358`) and `ctx.fill(path)` per tile and layer, with level-of-detail
  rules by zoom (blocks outlined above 0.22 px/m, footprints above 0.18, edges above 0.6, main roads only below 0.16:
  `:752-866`).
- **Street names**: anchors computed once along each straight run of every named centreline, one every ~260 m, with the
  run's angle flipped so text is never upside down (`:290-336`). At draw time: candidates in view are scored (search
  hit > highway > major road > long run > near the centre), sorted, then placed greedily with rotated bounding boxes,
  no overlaps, one label per name per 180-300 px (`:878-936`). Text widths are cached per font (`:738-746`) and
  re-measured when the web font arrives (`:479-485`).
- **The radar (minimap)**: 288 x 184 CSS px at up to 2x pixel ratio (`:956-966`), **grid-north up, it does not
  rotate**; only the player arrow and a camera view cone rotate (`:1049-1069`). The ground and street names are drawn
  into an **off-screen cache canvas twice the radar's size**; each frame just copies the right part of it
  (`drawImage`, `:984-1017`) and adds the live parts: waypoint + route, landmark dots, view cone, arrow
  (`:1022-1069`). The cache is redrawn only when the player nears its edge, the zoom drifts by more than 12 % or the
  buildings change (`:988-990`). The radar zooms out smoothly with altitude (helicopter, `:971-973`). Hidden radar =
  no work (`:953`). Traffic dots were removed on 2026-11-02 (`343a0f9`).
- **The full map** (`M`, or click the radar): its own canvas capped at ~6 megapixels (`:706-716`); its static layers
  are cached in a second canvas keyed by view + search + data version (`:1092-1103`), so moving the mouse or the
  pulsing player blip only costs a copy. Pan with pointer capture, a click is a drag under 5 px (`:552-612`); wheel
  zoom keeps the point under the cursor fixed (`:625-637`); search highlights every stretch of matching streets and
  frames them, or flies to a landmark (`:644-680`); landmark pins and neighbourhood / borough labels placed collision
  free, printed-atlas letter spacing (`:1158-1228`); scale bar in round metres (`:1230-1263`); compass needle to true
  north (`:447`); hover text "street & street · Click to teleport here" (`:587`); click teleports, clamped onto
  land (`:592-612, 732-736`), and sets a waypoint.
- **Where-am-I text** comes from `getLocationLabel` (`js/city-config.js:647-671`): landmark within 80 m, else the
  nearest "avenue & street" pair; Manhattan-specific (avenues vs streets by direction).

**Cost**: he publishes no number. It runs every frame, unthrottled, on the main thread (`js/main.js:724`). Per frame it
is one canvas-to-canvas `drawImage` plus a few dozen arcs and paths: *estimate* 0.1-0.3 ms CPU, GPU-composited by the
browser. A cache rebuild fills every visible tile path and places up to 28 labels: *estimate* 3-15 ms, once every few
hundred metres of travel; that rebuild is a small hitch on the frame it lands on.

**What we copy** (into `vendor/slop-map/` with his licence, then adapt): `TiledLayer`, `MapView`, `addRing` /
`addLine`, the label anchor + greedy placement code, text-width cache, the full-map interaction code (pan, wheel zoom,
click-vs-drag, search), scale bar, the "cache twice the size, copy each frame" idea, the palette approach (dark
graphite, a shade lighter for streets).

**What we must change or add** (the owner's list):

- **Rotating, heading-up and round**: draw the cache *square*, covering the radar's diagonal, and `ctx.rotate(-heading)`
  before the copy; a circular clip. Street names must stay upright, so they are **not** baked into the rotating cache:
  place them in a separate pass at 5-10 Hz with angle = street angle - heading, flipped into (-90°, 90°], drawn on top.
  A small north needle on the rim.
- **Real street names from our data**: `data/roads/network.json` already holds all of Uccle's 4,531 roads, 3,334 of them
  named, with OSM's bilingual names ("Rue Jean Benaets - Jean Benaetsstraat"). Show FR or NL by a setting (split on
  " - "). UrbIS's own street-axis names would be the authoritative source; not fetched yet (to check). **Current
  street + next cross street**: nearest road segment (spatial hash), then walk the graph ahead in the travel direction
  to the next junction ("next: Avenue de Fré").
- **Landmarks**: our heroes (Saint-Job, Saint-Pierre, town hall, Observatory, Chapelle de Stalle, Wolvendael) as icons
  with labels, plus OSM POIs later (pharmacies, stations).
- **Tram and rail**: tram 92's real shape and stops from `data/transit/stib-92.json` (shapes, stops), in STIB red with
  stop names; railway lines from claude/trains; **live tram dots** from our timetable sim are cheap and fun (his
  traffic dots were clutter, ours would be 2-6 trams).
- **Relief and buildings**: footprints need a baked map file (loading 120 tiles' `buildings.json`, ~400 KB each, just
  for the map is too much): one pipeline step writing simplified footprints + roads + land cover for all of Uccle into
  one compact binary (*estimate* 1-3 MB gzipped). Optional hill-shading from the DTM under it; or the orthophoto
  tiles we already have (`data/tiles/*/ortho.jpg`) as a "satellite" toggle.
- **Do the expensive part off the main thread**: rebuild the cache in an `OffscreenCanvas` in a worker (Path2D works
  there), so the rebuild never lands in a frame; the main thread only copies and rotates. Throttle the radar to 30 Hz.
- **Full map with teleport**: his interaction code, plus a streaming step: show a short "loading area" veil, request the
  target tiles, place the player on the ground from the heightmap / drivable grid once they are in. Clamp to the
  commune boundary instead of his Manhattan clamp.
- **Real routing** instead of his L-shaped line: A* on the road graph, drawn on both maps.
- **OSM credit** in the map corner ("© OpenStreetMap contributors", plus UrbIS / CIRB credit), as the TODO asks.

Effort: M (about 3-5 days including the baked map file); runtime *estimate* 0.1-0.2 ms main thread per frame.

## What does not fit us (skip)

- **Build everything at boot**: his whole island, its colliders and its shader set exist from the first frame
  (`js/main.js:110-140`), so the minimap, the pedestrian network, the traffic network and the audio occlusion all
  assume global, static data. Ours streams 120 tiles; every borrowed system needs a per-tile add / remove path (our
  traffic branch already shows how: `trafficWorld.js`).
- **Manhattan grid logic**: "avenue & street" labels by direction (`js/city-config.js:647-671`), the grid-north map
  rotation (`js/nyc-map.js:39`), the L-shaped GPS route (`:395-409`), road networks inferred from kerb gaps
  (`js/road-network.js:11-17`), old-frame coordinate tables (`js/city-config.js:673+`).
- **Flat ground**: his walking / driving / audio all assume y = 0 or kerb height (`js/controllers.js:876-893`); we have
  real relief everywhere.
- **New York objects**: fire escapes, water towers, steam stacks, food carts, subway entrances, Times Square billboards,
  scaffolding sheds, NYPD / taxi liveries, the helicopter, the Roosevelt Island tramway, Central Park specifics, shore
  highways, harbour water, the 80k generic far buildings, street-canyon AO for skyscrapers, the tall-tower shadow
  cascade fix.
- **Fake signage**: his single street-blade texture and generic shop names; we want real names.
- **Hard LOD switches** (trees with 6 m hysteresis): our smooth cross-fades are the owner's rule and already better.
- **SkyMesh sky**: Firmament is ahead.

## Where we are already ahead (for balance)

Real relief and measured street surfaces; LiDAR trees with smooth LODs and impostors; streaming with workers; a
physical sky with eye adaptation and haze; GTAO; real timetable trams (and trains on a branch); Blender heroes
checked against photos; a lane-graph traffic sim with Belgian priority rules (branch); real OSM shops, signals, stops.

## Small finds in our own code while comparing

- `viewer/lamps.js:187` sorts every lamp of the tile and allocates a new array every frame at night (`lamp.map(...).sort`);
  a fixed-size nearest-N pass (as his `nearbyLights`, `js/street-details.js:1043-1066`, with a cell index) avoids it.
- `uWetness` (`viewer/lighting.js:105`) is set by presets and the sky but read by no material.
- `?sunlight=1` still uses his old shadow settings (3072 px tiles, far 300 m: `viewer/lighting.js:152-155`); his
  current ones are cheaper.
