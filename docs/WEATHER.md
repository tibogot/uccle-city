# Weather + seasons (branch claude/weather, 2026-11-11)

Lab: `labs/weather-lab.html` (port 8828 in the agent's run: http://localhost:8828/labs/weather-lab.html). Research and
sources: `docs/WEATHER_RESEARCH.md`. Nothing in the city changed: new modules only, read-only imports of the city's
lighting, post chain, cobble / concrete materials, lamp model and faceted cars. Images: `docs/weather/`.

## The modules (all GPU-driven; CPU per frame = a few uniforms)

| Module | What | City adoption |
|---|---|---|
| `viewer/weather/weatherState.js` | `Weather`: inputs (rain mm/h, snowfall cm/h, temperature, wind + from-direction, cloud, visibility) crossfaded between presets, and the SIMULATED surface state: wet film, puddle level, snow depth, slush, frost, built up / decayed at real rates x `timeScale` (lab x60). Rain vs snow by temperature (> 1 C: snow input falls as rain). Exports the shared uniforms `wx`. | one `Weather` in main.js, `update(dt)` per frame |
| `viewer/weather/surfaceWeather.js` | `weatherize(material, opts)`: rewrites colour / roughness / metalness / normal of any MeshStandardNodeMaterial for the weather: wet darkening by porosity, smoother film, metalness so the existing SSR reflects; puddles from a low-spot noise field under the water level (grow / shrink), dark mirror + ripples while it rains; rivulets on walls, beads + trails on glass, beads on paint; snow cover (up-facing, exposed, less under crowns, noise-broken at the start), anti-aliased sparkle, slush; leaf litter, spring flowers, frost. Options per material: `porosity, puddles, puddleBias, streaks, glass, beads, slush, litter, flowers, frost, snow`. | call it in roadPaint / cobbles / facades / roofs / cars material factories |
| `viewer/weather/overheadMap.js` | The top-down bake (orthographic, SOLID_LAYER then CANOPY_LAYER, RGBA32F, read back once): base height per 12.5 cm cell, crown shelter, the snow SHAPE (slope shedding 38-62 deg, rounded taper at drop edges = eaves / kerbs / car roofs, drifts at wall feet, unevenness), cliffs. Used by particles (collision), materials (am I the topmost surface: dry under cars and eaves) and the snow layer. | per streamed area; re-bake when the camera moved ~1/4 of it (the CPU shape pass, ~100 ms for 512^2, should then go to a worker or compute) |
| `viewer/weather/precipitation.js` | Rain streaks (24k) + paired splashes (ring + crown), snow flakes (32k), autumn leaves (900, from the crowns). Storage buffer + compute (wind, wobble, tumble), wrap round a camera window (circular soft edge), collision with the overhead map, count = intensity. Streaks / flakes never thinner than ~1.5 px (alpha scaled instead): no sub-pixel specks. | as is |
| `viewer/weather/snowLayer.js` | VOLUMETRIC snow: a 512^2 grid (8 x 8 frustum-culled chunks) displaced in the vertex shader: base + depth x shape x crown shelter x (1 - packed track) + rims; cliff cells cut (discard). Track field = a storage buffer stamped by a compute pass in 4 x 4 m windows round up to 6 capsule stampers (feet, wheels), refilled by snowfall in 1/16 slices per frame. | one layer round the camera (sliding window, Tomb Raider style) |
| `viewer/weather/weatherFog.js` | `scene.fogNode`: exact height-integrated air fog from the visibility (Koschmieder beta = 3.912 / V) + a thin ground-mist layer with drifting patches; colour = Firmament's horizon radiance, greyed under a full deck. | replaces `Lighting.fogNode()` when weather is on |
| `viewer/weather/liveWeather.js` | Open-Meteo (free, no key, CC BY 4.0) `current=` for Uccle -> the inputs; attribution shown. | a toggle in the dev panel |
| `viewer/seasons/season.js` | The date -> uniforms `season.uLeafColor / uLeafAutumn / uLeafDensity / uLeafFall / uLitter / uGrass / uFlowers / uSpringGreen` (Brussels phenology), `sunInfo(day)` (sunrise / sunset / day length / noon elevation at 50.8 N), Uccle climate normals (monthly temperature, snow days). | the trees (claude/foliage) read `uLeafAutumn` (per-leaf random < it turns), `uLeafDensity` (per-leaf random > it is gone), `uLeafColor`; grass reads `uGrass` |

The sky follows the weather in the lab (`skyFromWeather()`): Firmament's own "overcast" cloud preset blended in by
cloud cover (weatherBias, low stratus base, thickness), more haze with precipitation and low visibility, and the key
light fades under a full deck (no hard shadows when overcast).

## The lab
Panel: Weather (presets: clear, overcast after rain, drizzle, heavy rain, morning mist, light snow, snowstorm, deep
snow + sun, thaw; every input; time scale; "use live weather (Uccle)"), Surface state (live, editable), Season + sun
(day of year, readouts, jumps to key dates), View (orbit, walk with footprints, drive with tyre tracks, fly over
roofs, 7 viewpoints), Systems A/B (each system on / off), Perf + tests. `window.lab`: `bench()`, `rounds()`,
`flicker()`, `strip()`, `preset()`, `setDay()`, `goLive()`.

Test street: 5 terraced houses (45 deg gable with 0.38 m eaves, mansard 67 / 18 deg, flat roof with parapets and a
skylight, 25 deg gable, steep 55 deg gable end to the street), window sills, cornice, party wall; a cambered road with
gutters, setts parking strip (city cobbles), sidewalks (city concrete tiles) + blue-stone kerbs, lawns, 4 procedural
trees (season leaves), 2 swan-neck lamps (city model, night pools), 4 parked faceted cars + 1 driving.

## GPU cost (street level, 1280 x 800 at DPR 1, interleaved A/B rounds: 4 x (0.4 s settle + 1.2 s), mean ms)
Machine NOT quiet: another agent's Pedestrian Lab tab ran in the same Chrome during all rounds; rounds disagree by
~0.1-0.2 ms. Treat as +/- 0.15 ms.

| Effect | Off | On | Cost | Budget |
|---|---|---|---|---|
| Rain drops (heavy rain, 21.6k streaks) | 3.456 | 3.666 | +0.21 | |
| Rain drops + splashes | 3.456 | 3.741 | **+0.29** | <= 0.6 |
| Wetness (all weatherized materials, puddles + ripples + streaks, vs dry materials) | 3.501 | 3.740 | **+0.24** (median +0.26) | ~0.1 |
| Snow flakes (32k) | 3.330 | 3.469 | +0.14 | |
| Snow layer (before chunking + baked noise) | 3.330 | 4.095 | +0.77 | |
| Snow layer (after: 8 x 8 culled chunks, no vertex noise) | 3.261 | 3.782 | +0.52 (median +0.26) | |
| Snow all (flakes + layer + material cover), after | 3.261 | 3.743 | **+0.48** (median +0.52) | <= 1.0 |

Compute: the stamp + refill passes are windowed (6 x 32^2 + 512^2 / 16 threads per frame); the lab's "compute" read-out
also contains Firmament's own compute passes, so it is not the weather's cost.
Wetness is over its ~0.1 ms target: it is the full weatherize() on EVERY material in this lab (puddles + ripples on
3 ground materials, streaks on all walls, glass beads); in the city the far tiles should take a light variant (wet
darkening + roughness only, no puddles / ripples / streaks past ~150 m) - see TODO.

## Flicker test (labs/flickerTest.js, copied from claude/stalle `git show claude/stalle:labs/flickerTest.js`, commit eebd3d6)
Frozen animation, 24 frames, threshold 0.06:

| Scene | Move | Blinking px | Where |
|---|---|---|---|
| wet street, puddles (low camera) | strafe 0.6 mm | 6 ppm (no cluster) | after fixing the lab's kerb / sidewalk coplanar faces (10 324 ppm before: z-fight, not weather) |
| deep snow, sun, car + sidewalk + facades | strafe 0.6 mm | 167-225 ppm | window sills (sill vs frame bar overlap in the lab geometry); none on snow |
| same | orbit 0.5 mrad | 1 149 ppm | car rims / plates (car model detail), brick mortar dots far away, sills; the snow surfaces and the sparkle are clean |

Heat maps: `docs/weather/flicker_wet_strafe.png`, `flicker_snow_strafe.png`, `flicker_snow_orbit.png`.

## Images (docs/weather/)
`rain_night_street.png` (heavy rain at 22:30: streaks, lamp reflections in puddles, dry patch under parked cars),
`snowstorm_street.png`, `deep_snow_houses.png` (roofs with thickness, car roofs, bare-tree shadows),
`autumn_lawn.png` (27 Oct), `live_weather.png` (Uccle 11 Nov 2026 13:00: overcast 5.4 C), strips
`strip_walk_snow.png` (walking, tyre tracks of the passing car), `strip_drive_rain.png`, `strip_fly_snow.png`.

## Bugs found on the way (worth knowing for the city)
- r187 clamped NEGATIVE colour output of the override-material bake (x < 0 came back as 0): the bake now writes
  positive offsets (y + 1000, x - origin + 1, z - origin + 1).
- Hashing `instanceIndex + frame * prime` ran past float precision: every particle got the same "random" respawn.
  Fixed with a per-particle hash moved along a golden-ratio sequence.
- Wrap-around windows teleport wind-blown particles INTO buildings on the upwind side (the street in their lee
  emptied): wrapped particles that land inside a solid respawn in the open column.
- Steps vs slopes in the shape pass: a kerb (13 cm) looked like a slope to a simple threshold; a ridge looked like a
  step. Rule now: a slope rises the same on both sides; a crease bends it (tolerance 2 x rise).

## Weak / not done
- The lab's trees are simple procedural skeletons (the real ones come from claude/foliage, which should read
  `season.js`). Their crowns are sparse.
- No side-by-side with real photos of Uccle / Brussels in rain and snow yet (look-only rule): next session.
- Snow layer resolution 12.5 cm: diagonal roof edges and car roofs stair-step a little; the snow on car roofs is
  lumpy (the car's top surface sampled at 12.5 cm). Window sills (one cell) get only the material cover, no thickness.
- No snow on tree branches beyond the up-facing material cover; no snow falling off roofs, no icicles.
- Rain streaks on glass are procedural columns (good at a distance, plain up close); no drips from eaves.
- Footprints read best in low sun; overcast light flattens them (true in life too).
- Glass in the lab is a dark mirror (no interior): night windows are black; the city's facade windows have interiors.
- Snow sparkle: dark specks were visible with large facet tilts; tilt reduced to 0.18 rad, re-check up close.
- GPU numbers taken with another lab running in the same Chrome: redo on a quiet machine.
