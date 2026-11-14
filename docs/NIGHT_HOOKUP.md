# Night lights into the city: the hookup plan (research, 2026-11-14, read-only)

The city does not import viewer/nightLights/ (lab: labs/night-lab.html; lab results docs/NIGHT_LIGHTS.md: 0.59-0.66 ms
GPU for ~89 real lights / ~460 sources, CPU 15 µs, measured on a shared GPU). Rules checked: no lights added / removed
at runtime (LightPool: 256 fixed slots, weight 0 = parked; the K shadow spots stay, intensity 0), no DynamicDrawUsage,
small whole-buffer uploads by design (~40 KB / frame: measure vs addUpdateRange).

## What goes in as is / what must be written

As is: nightLighting.js (LightPool + NightLightsNode on three r187 ClusteredLightsNode), lightSelect.js (NearestN,
StaticSources, ShadowLamps), glare.js, lightCones.js, the shader half of groundLight.js, lowBeamK, wetSurface.
To write: a city source registry with addTile / removeTile (the lab's sources are one fixed street); real facade normals
(the window / shop / sign code assumes facades face ±z: nightSources.js:201-205, 113-114, groundLight.js:61-74; the
shader and culling planes are already direction-agnostic); a ground light map that scales (the lab's 0.25 m map would be
64 MB per tile: 1 m texels or a camera-centred scrolling map, baked in the tile worker); stand the city's own lamp code
down (lamps.js lampLightPool's 6 PointLights, lampLight.js's lamp map) or the ground gets lamp light twice.

## What the city must provide

Lamp heads WITH y (lamps.js:184-190 returns x, z only); lit windows as a CPU list (today decided in the shader:
facades.js:78-83, 131-163: a CPU copy of the lit hash in the worker); shops / signs with normal, width, colour
(streetlife layout.js; nightSources() allocates: call on tile add / remove only); traffic from cityTraffic.sim (alive,
x/y/z, yaw, pitch, type, bits) + per-type head / tail offsets from carFleet's _kind; the PLAYER's car headlights
(drive/carModel.js carLights.head: the lab has no slot); trams (tramLine.positions() allocates: 5 Hz; N trams x 5 slots
or nearest only); env.uNight, env.uWetness; the post chain is the same as the lab's.

## Where in viewer/main.js (lines as of 2026-11-14)

renderer.lighting = new NightLighting(pool) between renderer creation (~744) and renderer.init() (~749), boot flag only;
K shadow spots / cones / glare / dynamic ground mesh before the warm-up (openBootPipelines ~760 / warmBoot ~1302); skip
lampLightPool (~772) under night mode (decided at boot, never toggled); loadTile: lamps after buildLamps / addLamps
(~627-631), street life after streetLifeP (~669), stops (~646), windows from the worker result (~573); dispose (~675-691):
removeTile next to lamps.release(); after createCityTraffic (~1106): hand over cityTraffic.sim; per frame: after the
updaters loop (~1175), before renderFrame (~1176), also in viewer.renderFrame / stateAt (~1399, ~1434).

## Risks found

Glare has no bounds check (glare.js:40-47): thousands of city lamps would overflow its 256 cards: cap to nearest /
visible. Cluster storage growth or a material's groundLight flag set after compile can rebuild shaders (check the first
lit render is at full size; test a resize). Every lit material pays the cluster loop, also by day (measure). The K shadow
spots re-render dense city geometry near the camera. Streaming tiles must fade their lamps in (tile fade) or they pop;
ShadowLamps indices must be remapped when sources rebuild. Bridges: the 2-D ground map bakes deck lamps onto the road
below (lampLight.js already does). Far plane 6 km (20 km with the horizon) vs 1.5 km in the lab: coarser depth slices.
Lab-only settings: PCFSoftShadowMap, near 0.2 / far 1500. Tied to three r187 internals (overrides _create etc.).
Police car round 2's beam should go through this pool (BeaconLights.toPool, untested).

## Step by step (each behind ?night=1, measured with debug/gpuAB.js on GREEN in the 4 views of perf step 8 + long tasks
## and synchronous pipelines while driving / flying)

0. Lighting model only, empty pool: the fixed cost of the loop by day and by night, boot warm-up, 0 sync pipelines.
1. Lamps as pool lights (registry, tile fade, lampLightPool skipped, lampLight kept for the ground with the lamps baked).
2. K = 2 shadowed lamps. 3. Traffic + the player's headlights, the dynamic ground layer. 4. Glare with a 256 cap.
5. Shops / signs with real normals. 6. Lit windows from the worker. 7. The ground light map per tile in the worker
(replace lampLight.js; addSpill on walls / hedges). 8. Wetness, cones (wet only), trams, stop posters as signs.
9. Default on (?night=0 off) when within budget (<= 1 ms at street level at night, ~0 by day); delete the duplicates.

# STEPS 0-3 DONE (branch claude/night, 2026-11-14): lamps, 2 shadowed lamps, cars - behind `?night=1`

Everything is behind the boot flag `?night=1` (`viewer/nightLights/nightMode.js` NIGHT, read once at load, never toggled).
Without it the city is unchanged: main.js imports `cityNight.js` only under the flag, `lampLight.js` takes the old
paths, `lamps.js` / `traffic.js` only expose one more value each (`heads[].y`, `T.alpha`).

## What each step does

- **Step 0, the lighting model** (`cityNight.js` installNightLighting, before `renderer.init()`):
  `renderer.lighting = new NightLighting(pool)`, a 256-slot LightPool. Two city fixes in `nightLighting.js`:
  (1) the cluster storage is sized at once for the screen x pixel ratio (`maxPixels`; only for targets at least a
  quarter of that size) - growing it on a resize / full screen would rebuild every lit material; (2) no texture upload
  at all while the pool stays empty (by day). The extra textures pushed the facade kit's opaque shader (built to
  WebGPU's 16) over the per-stage limits: the device now asks for the adapter's `maxSampledTexturesPerShaderStage`
  (capped 32), and a material at its 16-SAMPLER budget (`kit opaque*`, or `userData.lampShadow === false`) takes the
  shadowed lamps' light without their shadow (`NightLighting.skipShadow`). `?nightpool=0`: the model with an empty
  pool (A/B); `__night.master = 0`: every night light off in a running page (A/B).
- **Step 1, street lamps**: `LampRegistry` (cityNight.js): every loaded tile's lamp heads (main.js loadTile ->
  `cityNight.addTile`, dispose -> `removeTile`), stable ids in fixed typed arrays (16384), a 32 m grid per tile, the
  query adapter made once per tile (no per-frame closure). A tile's lamps fade in over 4 s (frame time capped at
  1/30 s: a long task while streaming does not jump it), and while fading they are OFFERED FARTHER by (1 - fade) x
  75 m: a lamp entering at weight 0 used to take a slot and move the NearestN cut-off - every other lamp's weight - at a
  stroke (measured: 0.49 jumps); now it enters through the cut-off's own fade. The 24 nearest are real LANTERN pool
  lights, faded out over 40-60 m; ground materials (everything through `addLampLight`) get `userData.groundLight` and
  skip them (the city's lamp MAP lights the ground, as before); walls take the map only beyond the same 40-60 m band
  (`farBand`) so near walls are not lit twice. `lampLightPool`'s 6 PointLights are not created under the flag (main.js,
  decided at boot).
- **Step 2, K = 2 shadowed lamps**: two SpotLights (512 px PCF) in the scene from boot on, cross-faded with the 2
  nearest lamps (ShadowLamps). City changes: the spot is wider (1.35 rad, penumbra 0.3 - three's spot curve at the
  lab's 1.22 / 0.65 left the walls beside a lamp dark) and carries 65 % of the lamp (`nightParams.shadowShare`; the
  lantern's up light stays a pool light). Their shadow maps render only while they give light (by day: never). A lamp
  whose tile unloads is released (`ShadowLamps.release`) before its id can be reused. Their casters are a LAYER of
  their own (6): street-scale casters only (instanced, skinned, anything < 12 m; never `buildings-*` / `kit *`) -
  before that each lamp pass drew whole building chunks (~1.1 M triangles, night GPU +5.8 ms; now ~+1 ms).
- **Step 3, cars**: every live traffic car at its DRAWN pose (sim px/x interpolated by `T.alpha`, as trafficFleet
  does) plus the player's car (drive mode; its model's vertex kinds 2 / 3, else its size, through `car.root`'s matrix,
  slope included). Head / tail offsets per type from the parked fleet's `_kind` centroids (both lamps merged: one low
  beam, one rear light per car; brake: rear x 1.6). A car's lights fade in over 1.5 s; a car that leaves the sim
  (parked in, removed, its slot re-used) hands its last light data to one of 64 GHOST slots that fade out over 1.2 s;
  a fading car is offered 40 m farther per unit of fade (nightSources.js). The 12 nearest heads / rears are real; every
  other car within a 320 m camera-centred square draws its road pool into the DYNAMIC GROUND LAYER (groundLight.js
  createDynamic, 0.5 m half-float target, recentred on whole texels, its pipeline compiled for its own target at
  boot), which the ground materials add through `nightMode.js dynIrradiance` (albedo / pi x E).

## Numbers (RTX 4050 laptop, 1400 x 850, DPR 1; preflight YELLOW with my tab idle - RED while another agent rendered;
## single runs: read +-0.5 ms as noise)

| | GPU p50 ms | draws | notes |
|---|---|---|---|
| reference view (`ring=1&far=1&time=golden&traffic=0`), default | 10.09 / 10.81 (2 loads) | 334 / 332 | boot 20.5 / 24.9 s |
| same, `&night=1` (by day) | 11.01 | 330 | boot 24.1 s |
| St-Job street view, golden: default / `night=1` | 11.34 / 10.88 | 724 / 734 | |
| St-Job street view, night: default (6 PointLights) | 12.06 (p95 21: another tab active) | 694 | |
| St-Job street view, night: `night=1&nightpool=0` (model, empty pool) | 11.27 | 688 | |
| St-Job street view, night: `night=1` before the caster layer | 17.1 | 1155 | 2 x ~1.1 M tris of buildings |
| St-Job street view, night: `night=1` | 12.19 | 978 | |
| in-page A/B, `__night.master` 0 / 1, 6 rounds | 9.45 / 10.50: **+1.05 ms** (spread -0.72 .. +3.34) | 690 / 981 | 2 x ~149 shadow draws (trees, cars, posts), +1 dyn |

- **By day the fixed cost is under the noise** (by construction: one compute dispatch over the clusters with an empty
  slice range - an immediate break - and one storage load + compare per lit fragment; no upload, no shadow pass, no
  dyn pass). At night the whole hookup (24 lamps + 2 shadowed, 12 + 12 car lights, ~60-120 far-car ground pools) costs
  ~1 ms, most of it the 2 lamp shadow passes (StylizedTrees and car batches are the bulk of their 149 draws).
- **CPU**: the night update 0.21-0.34 ms / frame at night (`__night.stats.msAvg`; NightSources.update alone 32-46 us,
  the rest the 768-slot car pass, the pop metric and the dyn pass's `renderer.render` call); by day 3-8 us.
- **Uploads / frame** at night: light textures ~40 KB (lights 16 KB, profiles 8 KB, planes 16 KB) + the dyn layer's
  instance buffers ~27 KB (written whole: `renderDynamic` sets needsUpdate without ranges); by day 0.
- **Pipelines**: a 122 s street-level drive down the Chaussée d'Alsemberg at night (`debug/perfRun.js` "alsemberg",
  tiles streaming): **0 synchronous, 0 async pipelines** created; switching golden -> night at runtime: 0 pipelines,
  but 5 long tasks of 66-182 ms in the next seconds (default: one of 53 ms) - the first lamp shadow passes' render
  objects, probably. No console errors.
- **Pops** (same drive, 4133 frames without a hitch > 25 ms and without a camera jump > 3 m): lamps' largest
  frame-to-frame weight change 0.147 (41 frames > 0.05; before the fixes 456 frames and 0.72); cars (per car, real
  head / rear weight, brake factored out) 10 frames > 0.1 and one event of 0.91 (not explained yet: see below).
- Cluster storage: (W/32) x (H/32) x 24 x 12 ivec4 for the screen x DPR (1920 x 1080 at DPR 1: ~9 MB; at DPR 1.5:
  ~21 MB).

## Images (docs/night/hookup/)

`stjob_street_night1.jpg` / `stjob_street_default.jpg` (Place Saint-Job, eye 2 m, toward the Chaussée de Saint-Job),
`alsemberg_night1.jpg` / `alsemberg_default.jpg` (Chaussée d'Alsemberg), `drive_player_night1.jpg` (drive mode: the
player's lamps; the white rear is a traffic car's low beam 4 m behind, stopped for us).

Against real night views of Uccle streets (looked at only): the default's 6 unshadowed PointLights flood whole facades
up to the roofs; real Uccle streets show warm pools on the pavement under each lamp, the facades lit near the lamps and
dark above the first floor - which is what `night=1` gives (lantern profile, 16 m range, real headlight pools and red
rear glows on the road). The kiosk on the Place and the facades beside a lamp are lit; the facades between lamps are
darker than in the default (closer to the photos, but the street reads darker overall).

## Weak spots / leftovers

- One unexplained car light jump (0.91 in 4133 frames): a sim car whose pose itself jumps, or the 64 ghosts all busy
  (a tile unloading kills many cars at once) - to trace with `__night.stats.carJumpMax` + the sim slot.
- The 2 lamp shadow passes are the cost: tree batches are drawn whole (tile-wide instanced meshes). Options: no tree
  casters (`layers.disable(6)` on StylizedTrees), shadow maps at 30 Hz alternating, or 1 lamp.
- The facade kit gets no lamp shadows (sampler budget). The device limit is raised to 32 sampled textures: a GPU with
  only 16 fails those materials (warned in the console).
- Runtime day -> night switch: 5 long tasks (66-182 ms) the first time the lamp shadows render.
- Close traffic headlights (1000 cd low beams, the lab's value) overexpose a pale car body a few metres ahead.
- CPU 0.2-0.35 ms at night (lab 15 us): the car pass walks all 768 sim slots; the pop metric and `Track` over 16384
  lamp ids run every frame (make them debug-only); the dyn layer's instance buffers are uploaded whole (add ranges).
- Not hooked yet (next steps): glare cards (4), shops / signs (5), lit windows (6), the per-tile ground map (7; the
  lamps still light the ground through lampLight.js' R8 map), wetness / cones / trams (8). The tram's 5 pool slots are
  reserved and off. The dyn layer is drawn every night frame even high above the city (fly): clamp it by height.
- Not measured: the 4 views of perf step 8 and a flight (only the street views above, the Alsemberg drive and the
  reference view); GPU numbers are single runs on a shared machine.

## Files touched

New: `viewer/nightLights/cityNight.js` (the hookup), `viewer/nightLights/nightMode.js` (flag + dyn layer texture,
imported by lampLight.js). Lab modules (the lab behaves as before, except that its wrapping cars are now also offered farther while they fade): `nightLighting.js` (storage presize, no upload when
empty, skipShadow), `lightSelect.js` (ShadowLamps.release), `nightSources.js` (pluggable lamp query + fade, CAR.GY,
shadowShare, fading cars offered farther), `groundLight.js` (dynamic-only mode, recentre). City: `main.js` (8 small
hunks, each commented `?night=1`: the import; `let cityNight`; loadTile addTile after addLamps; dispose removeTile
after lamps.release(); installNightLighting before `renderer.init()`; lampLightPool skipped / startCityNight;
setTraffic after createCityTraffic; setDriver after `new Driver`), `lampLight.js` (flag-only branches), `lamps.js`
(heads with y), `traffic/traffic.js` (`T.alpha`).

# ROUND 2 (branch claude/night2, 2026-11-14): round 1's leftovers fixed, steps 4 and 5 - all behind `?night=1`

Without `?night=1` the city is as before (one exception, not night-related: the dev panel's light theme is now opaque,
see 1b). Debug switches: `?nightdebug=1` (the pop metric, `__night.debug`), `?nightshadow=full` (round 1's every-frame
lamp shadows; `__night.shadowMode` live), `?nightglare=0` (no glare cards). Probes: `debug/nightSwitch.js` (the
runtime day -> night switch: long tasks, pipelines, new render objects per pass, slow frames), `debug/nightShadowCost.js`
(the lamp shadow passes' draws / triangles / maps per frame, smart vs full, night CPU, uploads).

**Measuring conditions: preflight RED the whole session** (GPU 90-100 % busy before we start: another agent's tab
rendering, 1 GB free RAM, power cap); the page ran at 10-20 fps with ~1 s rAF stalls and 50-330 ms long tasks every
second even when idle. In-page GPU A/B (`gpuAB.alternate`) gave p50s of 80-90 ms: meaningless, not reported. The
numbers below are by construction (draws, triangles, maps rendered, render objects, uploads) or CPU (inflated by the
load: compare before / after only).

## 1a. The lamp shadow passes (most of round 1's +1.05 ms)

Measured first (St-Job street view, both maps every frame): **~196 draws, ~740 k triangles per frame**; trees 76 draws /
335 k (their LOD 1 buckets 245 k: tile-wide batches of the trees 40-120 m from the camera), bollards 176 k, lamps 67 k,
cars. Options weighed: dropping the trees loses the canopy shadows under the lamps (the most visible lamp shadows);
dropping only the LOD 1 buckets makes a tree's lamp shadow switch on / off as it crosses 40 m (a pop); 30 Hz alternation
makes moving car shadows step. Chosen: **a shadowed lamp stands still, so its map is re-rendered only when something in
it changes** (cityNight.js, the shadow schedule):
- the frame its lamp changes, and every frame a **mover** is within its reach (24 + 7 m): a traffic car (drawn pose),
  the player's car, a tram (`tramLine.drawn`, +36 m for its length), the camera itself moving (the walker /
  third-person character) - moving shadows are never stale;
- when the camera has moved 2 m since its last render (the trees' cards morph with the view distance, LOD
  re-buckets): one of the two maps per frame for that;
- otherwise the map is kept (`shadow.autoUpdate = false`, `needsUpdate` on demand). No light is added or removed.

| St-Job street view, night | maps / frame | draws / frame | k triangles / frame |
|---|---|---|---|
| round 1 (`?nightshadow=full`) | 2 | 195-198 | 736-740 |
| round 2, cars waiting at the crossing under one lamp | 1 (50 % skipped) | 97-107 | 365-439 |
| round 2, nothing moving near the 2 lamps | 0 | 0 | 0 |
| Alsemberg drive (122 s, `debug/perfRun.js` "alsemberg", traffic all along) | 1.53 (23 % skipped) | - | - |

Leftovers: on a busy street (and when driving: the player's car is always a mover) the saving is small; the cost is
then the per-pass content (trees). Not movers: trains (rare near lamps), flags, falcons (their lamp shadows refresh
with the camera's 2 m rule only).

## 1b. The white diagonal streaks near Saint-Job church

**Not a render artefact: the city seen THROUGH the dev panel.** The light-theme panel was 95 % opaque
(`viewer/panelUI.js`): at night the church's lit lancet windows (and rose windows) behind it, near white on a black
canvas, lifted the panel's pale grey by ~13 levels - slanted pale streaks over the "Trams / Sky / Weather" rows, exactly
where the church's right side is in the overview. Found by: the streaks stay on the panel while the camera turns, sit
where the lancets are behind it, vanish with the panel hidden; no other canvas / overlay; canvas alpha 1. Fixed: the
light theme is opaque (the dark theme keeps its 0.9: dark on dark, no visible bleed). Proof:
`round2/stjob_overview_streaks_before.jpg` (round 1: the streaks on the panel, right), `round2/stjob_overview_panel_after.jpg`.
Seen while looking (not this): the tram rails catch the low beams as a bright specular line (real rails glint, but it
reads too white: `round2/stjob_street_night1.jpg`) - a candidate if a street-level streak was meant.

## 1c. The 0.91 car-light jump

Cause (by construction): when a tile unloads, every car of that tile leaves the sim at once and each took one of the 64
GHOST slots (fade-outs) - cars hundreds of metres away included; with all 64 busy, `toGhost` overwrote the OLDEST ghost,
which could be a car fading out right in front of the camera: its light jumped to another car's. Fixed: only a car that
was within CAR_R (250 m: its light data offered) gets a ghost, 128 ghosts, and when all are busy the FAINTEST one is
reused (`stats.ghostSteal` counts it: 0 on the drive). The pop metric now separates hitch / jump frames (dt > 50 ms or
a camera step > 2 m): during this machine's stalls the camera moves 15 m in a frame and every weight jumps.
Drive (Alsemberg, `?nightdebug=1`): 1440 frames, 827 clean, **largest per-car weight jump 0.046, no frame over 0.1**
(round 1: one 0.91 and 10 frames > 0.1 in 4133); 0 ghost steals; 0 sync / 0 async pipelines.

## 1d. Runtime day -> night switch

`debug/nightSwitch.js`, golden -> night, St-Job street view, cold page each time (~80 s after boot):

| | new render objects at the switch (lamp shadow / main / sun shadow) | first two lamp shadow passes | first main pass | pipelines |
|---|---|---|---|---|
| round 1 | 377 in all (lamp shadow 87-180) | 25.6 + 19.6 ms | 89.7 ms | 0 |
| round 2 | **8** / 5 / 7 | 4.7 + 4.8 ms | 15-19 ms | 0 |

What was lazy: the lamp shadow passes' render objects (one per caster per light: each light has its own shadow
material) and the dyn layer's first draw (~14 ms). Fixed: **casters are warmed BY DAY**: each newly tagged caster is
drawn once into both lamp maps (light at intensity 0, from 350 m up, a 155 deg / 2.5 km cone, on a layer of its own
(7) so nothing else is drawn), 4 s after it was tagged and only once it is shown (not hidden while its tile compiles,
not on lodFade's fading material copies, not an empty instanced bucket: those made render objects the night never
used - found by diffing the render-object chain keys); three's SpotLightShadow does not re-project when `camera.far` is
set directly (the first warm-ups drew almost nothing: projection updated by hand). The dyn layer is drawn once (a black
quad) at boot. The 8 left: empty traffic car batches by day. The long tasks still seen in the seconds after the switch
are this machine's background rate (50-330 ms every ~1 s with no switch at all): re-measure on GREEN.

## 1e. Night CPU

| St-Job street view, night (same machine, same load) | night update ms / frame |
|---|---|
| round 1 | 0.30-0.42 (the round 1 doc's 0.21-0.34 on a quieter machine) |
| round 2 | **0.18-0.22** (dyn pass 0.09, NightSources.update 0.077, lamp queries 0.008) |

- the pop metric + nightSources' `Track` (fill + scan of 16384 lamp ids per frame) only with `?nightdebug=1`;
- the dyn layer's pass at 30 Hz (it was ~0.2 ms: a whole `renderer.render`), at once on a camera jump > 40 m; its
  origin follows the camera only when it is drawn (texture and origin always match);
- update ranges: the dyn layer's 4 buffers (108 B per quad, ~30-60 quads: 3-6 KB at 30 Hz, was 27 KB whole every frame),
  the glare cards' 3 (44 B per card); empty meshes hidden;
- the car pass skips cars beyond CAR_R + 20 m (no light data, no ghost; their fade goes on). All 768 sim slots are still
  scanned (a dead slot costs two compares: the sim keeps no alive list);
- the dyn layer fades out between 120 and 200 m above the ground (its 320 m square's edge would show from the air), no
  pass at all above (`groundAt` from main.js).

## 1f. The night lab

`labs/night-lab.html` loads and runs with round 1 + 2's shared modules: no console error, the same image and light count
(89) as with the modules of before round 1 (checked by swapping them back in); glare cards hidden when empty with range
uploads; the aperture / sign code takes the lab's +-z street as before (its sources carry no `nx`).

## Step 4: far glare cards (glare.js)

256 additive billboards: the 192 nearest lamp heads within 600 m (NearestN: the cut-off fades, no pop; the tile fade-in
too) + the 32 nearest cars (a front card along the beam, a red rear card; the 33rd car's distance is the cut-off, faded
the same way). Near the camera the emissive glass + bloom carry the glow (the card fades in 30 -> 90 m). The lamp cards
are re-selected every other frame (static lights; their 600 m query was most of the glare CPU), the car cards every
frame. Compiled off the frame (`compileAsync`) on the first update. Proof: `round2/overview_glare_cards.jpg` (far
streets read as strings of lights). Mr.doob's slop-newyork draws its far lights the same way (sprites that light
nothing); three.js' lensflare example is per light (too heavy for hundreds).

## Step 5: shop windows and signs with real facade normals

The street life's shopfront layout (`viewer/shops/shopLayout.js`) now also writes `night.lights` records (stride 11:
kind, centre, outward normal, half width / height, colour; through the street-life worker): every LIT shop window
(kind 0: its real glass opening, `litAtNight`) and lit sign (kind 1: the fascia - the letters' colour when backlit, the
board's when a lightbox, the goosenecks' warm wash; the blade sign; the pharmacy's green cross, lit all night).
cityNight.js keeps them in two registries like the lamps' (per-tile fade-in, stable ids; main.js loadTile after the
street life resolves; removed with the tile). `nightSources.js`: the APERTURE light uses the source's own normal (the
light 2 m inside behind the real opening, the beam along the normal; the cluster planes were already
direction-agnostic), signs too; the city's shops / signs are NOT flagged baked (the city's ground map holds the lamps
only: they light the ground through the loop). 8 shop + 6 sign pool slots (67 of the pool's 256 reserved). Shop cd 32
(the lab's tuned value). Proof: `round2/shopfront_lights_off.jpg` / `round2/shopfront_lights_on.jpg` (Avenue du Prince
de Ligne: the spill on the sidewalk and the fascias), `round2/prince_de_ligne_shops.jpg`. Against night views of Uccle
shop streets (looked at only): the windows glow, the sidewalk catches a soft band in front - subtle, as here.
Leftovers: `?shops=old` (the old flat fronts) writes no records (no shop lights there); tune shopI with the owner.

## Step 6 (lit windows from the worker): not done

Needs a CPU copy of the facade shader's lit-window hash in the tile worker (facades.js:78-83, 131-163), per window with
its normal: next round.

## Weak spots / leftovers (round 2)

- GPU cost not measured (RED all session): re-run `debug/gpuAB.js alternate(master 0/1)` and
  `debug/nightShadowCost.js compare()` on GREEN in the 4 views of perf step 8.
- Busy streets / driving: the lamp shadows still render ~1.5 maps per frame (the movers); next lever: a cheaper caster
  set per pass (the trees' LOD 1 buckets only within the lamp's reach).
- The tram rails' specular line under low beams reads too white; close headlights still overexpose a pale car ahead.
- 8 lamp-shadow render objects still made at the switch (empty traffic batches by day).
- Seen with the defect eye, not mine: a pale irregular patch on the sidewalk at Place Saint-Job (also by day); speckled
  far roofs in the overview; trees still very green at night; the lab's low-poly crown lit as a flat yellow block by the
  lamp's up light.
- Steps 6 (windows), 7 (the ground map per tile), 8 (wet, cones, trams), 9 (default on) to do.

## Files touched (round 2)

`viewer/nightLights/cityNight.js` (schedule, warm-up, ghosts, CPU, glare, shops / signs), `nightSources.js` (Track
on / off, facade normals, per-source fade on shops / signs, `baked` per kind), `groundLight.js` (update ranges),
`glare.js` (update ranges, hidden when empty); shared: `viewer/main.js` 3 lines (761: addShops after the street life;
880: `groundAt` into startCityNight; 1059: `setTram` after the tram line), `viewer/tramline.js` (`drawn`: the drawn
trams' fronts, preallocated), `viewer/shops/shopLayout.js` + `viewer/streetlife/layout.js` + `streetlifeWorker.js`
(`night.lights` records), `viewer/panelUI.js` (light theme opaque). New: `debug/nightSwitch.js`,
`debug/nightShadowCost.js`.
