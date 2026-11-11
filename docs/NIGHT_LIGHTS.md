# Night lights (branch claude/nightlights, LAB ONLY)

Lab: `labs/night-lab.html` (port 8829: http://localhost:8829/labs/night-lab.html). Research: `docs/NIGHT_LIGHTS_RESEARCH.md`.
No city file changed: new modules in `viewer/nightLights/`, a lab card in `labs/index.html`, `labs/flickerTest.js`
copied from `claude/stalle` (commit eebd3d6).

## What is in the lab

A test street of the Uccle kind (`viewer/nightLights/nightStreet.js`, all procedural): 2 x ~60 row houses (brick per
house tone, pitched roofs), north side behind 4 m front gardens with hedges and garden trees, south side with shops on
~40 % of the ground floors (lit shop fronts, lit fascia signs with generic trade labels), 2.5 m sidewalks, kerbs, two
parking lanes, two traffic lanes, a tram track on setts in the middle; 873 openings (windows / doors / shop fronts,
~35-55 % of windows lit, warm or a TV-blue), 26 Brussels swan-neck lamps (the city's Blender model, 30 m apart per side,
staggered), 32 street / garden trees, ~90 parked cars + 2 x 16 driving cars (the faceted pack, the city's car material
with per-instance head / tail glow), a STIB T3000 (the city's model) going up and down the street. City lighting
(Firmament night, `viewer/lighting.js`) and post chain (`viewer/post.js`: GTAO, SSR, bloom "night" look).

Panel (our `viewer/panelUI.js`): camera orbit / drive / walk / fly; solar hour; wet street + wetness + puddles; pause
traffic; "tram: pass now"; post on / off; per-kind toggles and intensities; beams (cones) on / wet only / off; beam
haze; lamp shadows (0 / 2, reloads); Verify: live light counts, GPU ms, CPU of the light update, frame strips (drive /
walk / fly), flicker test, GPU A/B. Console: `lab.bench()`, `lab.strip(mode, n, step, cols, scale, png)`,
`lab.cpuTest(n)`, `lab.flicker(move)`, `lab.heat(true)` (lights per cluster), URL `?traffic=`, `?pools=heads:16,...`,
`?shadows=0|2`, `?clustered=0`, `?tile=`, `?slices=`, `?percluster=`, `?wet=1`, `?hour=`, `?view=`.

## How it works

1. **`nightLighting.js` - clustered lighting on a light POOL.** `renderer.lighting = new NightLighting(pool)`:
   three r187's `ClusteredLighting` (Forward+ clusters: 32 px tiles x 24 exponential depth slices, a compute pass lists
   the lights per cluster) with its node subclassed:
   - lights are NOT Object3Ds: a `LightPool` of 256 fixed slots in one Float32Array (position, range, colour x
     intensity, source radius, beam axis + cone, profile + 4 parameters, weight, flags). No Light objects, no matrices,
     no per-frame allocation; slots at weight 0 are skipped (not uploaded, not clustered);
   - `_updateLightsTexture` writes three's 4 data rows itself (insertion sort by view depth into Int32Arrays; three's
     sorts a JS array with a new comparator each frame) plus 2 rows of profile data; position and beam axis are written
     in VIEW space (the compute only reads the world-space bounds row), saving two matrix products per light per pixel;
   - the shading loop: cluster indices one ivec4 per 4 lights (three reloads the chunk per light), the 4 position rows
     fetched together, then range test -> cone test -> (low beam: above the cut-off?) -> only then the other rows,
     the profile and the BRDF. Profiles, analytic in the light's frame (beam axis + world up), no texture fetch:
     LOW BEAM (ECE pattern: sharp cut-off 1.2 % below the horizon on the oncoming side, 15 deg kink on the kerb side,
     hot band under the cut-off, dim wide foreground, nothing above the cut-off), LANTERN (an IES vertical curve in two
     numbers: up share 0.3 - walls and tree crowns get light - and a batwing peak at ~65 deg), APERTURE (a window /
     shop front: the light 1.2 / 2 m inside the room, clipped to the opening with soft edges and a mullion cross: the
     window-shaped patch on the garden / sidewalk that widens with distance). Falloff 1 / (d^2 + r^2) x Frostbite's
     window at the range (finite source: no hot dot on the lamp's own post). Soft sources (windows, shops, signs, rear
     lights, the tram saloon) light the diffuse term only; lamps and headlights keep the full BRDF (the long specular
     streaks on a wet road).
   - lights WITH shadows stay three's: the K nearest lamps (default 2) also carry a real `SpotLight` with a 512 px PCF
     shadow, in the scene for good (constant light count: no recompiles), intensity cross-faded with the lamp's pool
     light (`ShadowLamps`: shadowed share b, pool share 1 - b, b ramps over 0.5 s): the shadow fades in, never switches.
2. **`lightSelect.js` - which lights, without popping.** Per kind a fixed pool range; `NearestN` keeps the N nearest
   candidates (partial insertion into preallocated arrays) and weights them `smoothstep(cutoff, 0.62 cutoff, d)` with
   `cutoff = min(maxDist, distance of the (N+1)-th)` (Mr.doob's scheme): the light that leaves the pool has faded to 0,
   the one that enters starts at 0, so the sum of light is continuous; pure 3-D distance (no view bias: turning the head
   does not change the street's light). `StaticSources`: a 32 m grid over static sources (built once).
3. **`nightSources.js` - the kinds.** lamps (40 slots, LANTERN, 16 m), lit ground-floor windows (32, APERTURE, 9 m),
   shop fronts (10, APERTURE, 12 m), signs (8, coloured omni, 5 m), headlights (40, one LOW BEAM per car - the two lamps
   merged - 34 m, 0.55 rad), rear lights (32, red omni 60 cm behind the car, 4.5 m), the tram (5: symmetric low beam,
   rear red, 3 saloon lights). Moving lights come from a flat Float32Array the lab fills.
4. **`lightCones.js` - cheap beams.** One additive instanced cone mesh (lamps + headlights + tram): brightest at the
   source, silhouette-soft, faded at the ground and near the camera. Default "wet only" (~0.3 ms when on).
5. **Wet / dry.** `wetSurface()` in nightStreet.js: albedo darkened by porosity, roughness to a water film, puddles
   (mirror, a little metalness for SSR). `wet.uWet` / `wet.uPuddle` mean the same as the weather lab's `wx.uWet` /
   `wx.uPuddle` (branch claude/weather, `viewer/weather/weatherState.js`): `useWeather(wx)` before `buildStreet()`, or
   swap `wetSurface` for its `weatherize()`. The streaks are the pool lights' own GGX highlights on the wet road; SSR
   adds the lit windows / signs / globes.

## Measurements (NOISY: the owner was using the same Chrome / GPU; alternating rounds; 1280 x 800, DPR 1, NVIDIA Lovelace)

GPU = render + compute timestamps per frame, frames driven by the bench (a background tab gets 1 fps from rAF),
median per round, "on" vs "off" (pool + cones off, shadow maps not re-rendered), rounds alternated on/off/off/on...
Timestamp quantum ~0.066 ms; repeated runs of the same configuration spread by +-0.3 ms.

| scene (street view from 4.5 m, `lab.setView([-28,4.5,3.5],[5,1.2,-3])`) | lights drawn | lights delta (median of runs) |
|---|---|---|
| default (16 cars / lane), dry | 122 | 0.98 / 1.57 / (earlier 1.05, 1.31) ms -> **~1.0-1.6 ms** |
| default, wet | 122 | 1.38 ms |
| `?traffic=26` (stress) | 144 | 1.8-2.3 ms (before the budget tuning) |
| `?traffic=26&pools=heads:16,rear:12` | 108 | 1.6-2.2 ms |

Cost by kind (toggle A/B, `?traffic=26&pools=heads:16,rear:12`): headlights (16) ~0.85-1.2 ms (-0.5 ms with the
0.55 rad / 34 m beam now default), lamps (25) ~0.46, windows + shops (42) ~0.2-0.4, cones ~0.33, cluster compute
~0.15 over its empty-list cost. Full BRDF vs diffuse-only for ALL lights: 0.13 ms (the loop, not the BRDF, is the cost).
Tile 16 / 64 px and 16 slices: no gain over 32 px / 24.

**Target "<= 1.0 ms with ~150 lights": NOT met.** ~1.0-1.6 ms for ~120 lights; ~2 ms at ~145. What would close it (in
order): (1) a ground light map: the road / sidewalk (most of the pixels) sums the pool lights' DIFFUSE light from a
small camera-centred world-space texture rendered each frame (a 256^2 pass), and only non-ground surfaces + the wet
specular loop over the clusters; (2) far light LOD: beyond ~60 m headlights and lamps become pool sprites / decals on the
ground (GTA V's distant lights), cross-faded with the same weight; (3) a depth pre-pass so the loop runs once per pixel
(three r187 has none built in); (4) tighter bounds for low beams (a half-cone, not a sphere: three's compute only knows
spheres).

**CPU**: the whole light update (selection of all kinds + pool writes + shadow lamps + cones) **15-19 us** per frame
hot (`lab.cpuTest(20000)`); the in-page readout shows more in a background tab (cold caches, 1 fps). No `new`, no
arrays, no closures on the per-frame path (code review; three's `addUpdateRange` allocates a range object, so the cones
upload whole buffers instead). `performance.memory` is too coarse here to prove zero bytes (without
`--enable-precise-memory-info` it is quantised and lags), so "no allocation" rests on the code, not on a heap number.
Not ours and still allocating per frame: the city's `tramPose()` / tram fleet `inst.array.set([...])`.

## Verification

- **Frame strips** (lights updated at 60 Hz between the frames, the real fades): `docs/night/strip_drive.png` (8
  frames, 0.5 s, chase camera), `strip_walk.png` (8 x 1 s, sidewalk), `strip_fly.png` (8 x 1 s, 20 m over the
  street). Largest frame-to-frame change of any source's weight: drive 0.018, walk 0.006, fly 0.009 (1.0 = a pop);
  0 jumps > 0.1. I looked at every frame: no light popping, no shadow snapping.
- **Flicker test** (labs/flickerTest.js, 24 frames): street view dry, strafe 0.0006: 24 px (23 ppm), wet strafe 20 px
  (20 ppm), wet fixed 0 px. The one cluster (x 912, y 560) is a parked car's chrome / lamp edge under a sub-pixel move
  (MSAA edge), not the lights.
- Images: `docs/night/dry_street.png`, `docs/night/wet_tram.png` (wet, tram, reflections), `docs/night/shops.png`,
  `docs/night/flicker_wet_fixed.png`.

## Weak points

- GPU target not met (above). Headlights are the expensive kind.
- Shop fronts read as flat white panels (no interior: take the parallax shop room from slop-newyork, audit row "Shop
  windows"); signs are generic trade names (the city should use OSM names).
- Houses / hedges / trees in the lab are simple procedural boxes and blobs (stand-ins; the lights are the subject).
- Window spill only from ground-floor windows (budget); upper-floor windows only glow.
- The headlight cookie is analytic (ECE-like), not a measured headlamp; no high beams, no indicators / brake lights in
  the pool (the material supports brake glow).
- Lamp shadows: 2 nearest only; the shadowed SpotLight uses three's spot profile, not the lantern profile, so the light
  shape changes slightly while it cross-fades (0.5 s).
- Beams (cones) are geometry, not true volumetrics (no occlusion by cars).
- The tram turns at the street ends far from the camera (lights white / red swap there); "tram: pass now" teleports it
  (a visible jump, user-triggered).
- Cars wrap at +-262 m (lights faded over the last 40 m, the bodies jump far away).

## Into the city (not done: lab only)

1. `renderer.lighting = new NightLighting(pool)` in main.js before `renderer.init()`; replace `viewer/lamps.js`' 6
   PointLights by a `NightSources` lamp kind fed from every loaded tile's lamp heads (`StaticSources` per tile or one
   rebuilt on tile load); keep `lampLight.js` far away (or drop it once the ground light map exists).
2. Cars: the traffic branch's moving cars fill `night.carData` (head / tail centroids from the pack's vertex kinds, as
   the lab does).
3. Windows: the facade worker exports lit ground-floor windows (position, size, facing) per tile.
4. Weather: `useWeather(wx)` once claude/weather is merged.
