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
