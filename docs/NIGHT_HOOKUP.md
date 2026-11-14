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
