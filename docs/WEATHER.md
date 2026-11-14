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

---

# Round 2 (2026-11-11 evening): winter

## Photo side-by-sides (free Commons photos, kept in `data/raw/weather_refs/` with `SOURCES.md`, never shipped)
Composites (photo | lab render), local only: `data/raw/weather_refs/compare_after_snow_sun.jpg` (Uccle, Av. Churchill
after snow, charles lecompte CC BY-SA 3.0), `compare_snowfall_night.jpg` (Av. Churchill 17-01-2024, Sjenghai CC BY 4.0),
`compare_night_snow_demey.jpg` (Av. G. Demey, Szilas CC BY-SA 4.0), `compare_patchy_snow.jpg` (Bosveldweg, charles
lecompte CC BY-SA 3.0), `compare_rain_day.jpg` (rue des Fripiers in rain, charles lecompte CC BY-SA 3.0). Lab-only
renders: `docs/weather/r2_*.png`.

What the photos taught, and what changed:

| Photo says | Lab before | Now |
|---|---|---|
| Main roads are salted / ploughed: black WET asphalt, dirty slush only at the kerbs; snow stays on sidewalks, parking strips, lawns, cars (Av. Churchill, day) | the whole street white | `wx.uSalt` + a ROAD bake layer: the volumetric layer keeps almost nothing on carriageways; the road material (`weatherize({ road, edge })`) goes wet dark asphalt with grey-brown slush along the gutters; a slider for unsalted side streets |
| At night the snow is lit EVERYWHERE, warm (street lights + the glowing cloud deck) | black snow outside the two lamp pools | "urban sky glow": the lab's constant hemisphere light, warm, x night x cloud x snow cover (a finding for the city's night look) |
| Falling flakes near lamps are short streaks (exposure blur) | round dots | flakes stretched along their velocity by ~1/40 s; a "blizzard (dense)" preset (64k flakes, 12 m/s) |
| Snow plastered on the windward side of trunks | none | `weatherize({ plaster: true })` on bark |
| Snow on the upper side of every branch | only the cut ends | `snowOnBranches()` (thickness) + bark `snowUp: [0.12, 0.45]` (colour) |
| Thin snow (1 cm) is patchy; wheel tracks show the dark ground (Bosveldweg) | uniform white layer | full cover at 2.5 cm (was 1.2); the layer follows the same cover pattern; in thin snow packed tracks turn to dark wet ground |
| Sills and cornices carry rounded snow; sills under a high eave still whiten | sills grey (the overhead test said "sheltered") | ledge caps (instanced, rounded) + exposure that lets wind-blown snow under eaves > 1.2 m above |
| Wet day (setts with reflections, white sky) | close already | ripple normals softened (SSR flicker) |

Not matched yet: the orange cloud glow of the night sky itself (Firmament, not touched); trampled sidewalk snow; snow on
rails and fences; snow-covered windscreens.

## New in round 2
- **Shape pass in a worker** (`viewer/weather/overheadShape.js` pure, `overheadWorker.js` module worker, transferred
  buffers): ~150 ms of loops off the main thread (fallback: main thread). The GPU bake + readback stays async.
- **Smoother layer**: base heights `Hs` blurred twice across non-step neighbours (car roofs and gentle slopes lose
  their 12.5 cm terraces); lip at cuts 0.12 -> 0.04 (the cut's stair-step on diagonals is nearly flat).
- **Snow on branches + evergreens** (`viewer/weather/snowExtras.js`): `snowOnBranches(material)` (built on the
  instanced positionLocal: works for instanced trees), `snowOnFoliage(material, { heightNode })` for hedges / conifers
  (the hook for claude/foliage). Lab: a privet hedge (solid: the layer caps it) and two yews.
- **Ledge caps**: `createLedgeCaps([{ x, y, z, len, width, axis }])`, one instanced draw, height = min(0.8 depth,
  0.55 width), only where the layer cuts the ledge out (sills, a cornice under a wall); a cap on a ledge the layer also
  covers z-fights.
- **Icicles + drips**: `createEaveIce(map)`: sites from the overhead map (roof drop edges > 1.5 m, not wall ledges),
  ~1000 cones grown by `wx.uIcicle` (cold + snow on roofs, ~4 h; melt above +1 C), never thinner than ~1 px; drips
  vertex-animated (gravity, the real drop height) while melting or raining (`wx.uDrip`).
- **Lite weatherize** (`weatherize({ ..., lite: true })`): wet darkening + film + SSR metalness + one-octave snow cover
  + salted road: the far-tile path.
- **r187 gotcha**: `positionNode` REPLACES the instanced position (instancing is applied before it): instanced weather
  meshes carry their own per-instance attributes.

## GPU (street level, interleaved rounds, mean / median ms)
NOISY: the baseline itself moved from 3.3 to 4.2-4.9 ms between sessions (other GPU work on the machine); ~±0.2 ms.

| Effect | Cost |
|---|---|
| Rain drops + splashes (heavy rain) | +0.07 / +0.07 (round 1: +0.29) |
| Wetness, full weatherize on every material (7 rounds) | +0.47 / +0.39 |
| Wetness, LITE path (7 rounds) | -0.05 / -0.13: below the noise, ~0-0.1 |
| Snow flakes (46k, snowstorm) | +0.49 / +0.66 |
| Snow layer | +0.55 / +0.72 |
| Icicles + drips + caps | +0.13 / +0.26 |
| All snow (flakes + layer + cover + ice + caps + branches), 7 rounds | **+0.74 / +0.79** (budget 1.0) |

## Flicker (24 frames, strafe 0.6 mm unless noted)
| Scene | ppm | Where |
|---|---|---|
| deep snow, snowy branches, icicles, hedge | 237 (1 732 before fixing a lab z-fight: flat-roof slab coplanar with the parapet) | branch tips (thin tree geometry), a few icicle tips |
| blizzard street | 14 | - |
| heavy rain at night, puddles low | 884 (1 092 before softening the ripples) | SSR reflections of the rippled puddle right in front of the camera: the weakest spot |
| car close-up in snow, orbit 0.5 mrad | 983 | car model detail (rims, rails), not the snow |

## Images (round 2)
`docs/weather/r2_sills_icicles.png`, `r2_sill_close.png` (rounded sill caps), `r2_branches_hedge.png`,
`r2_after_snow_sun.png` (salted road), `r2_snowfall_night.png` (sky glow, streaked flakes), `r2_patchy_snow_setts.png`
(thin snow, dark tyre lines), `r2_rain_day.png`, `r2_blizzard.png`, `r2_car_roof_close.png`,
`r2_strip_walk_winter.png`, `r2_strip_fly_snow.png`; flicker heat maps `r2_flicker_branches.png`,
`r2_flicker_rain_night.png`.

## Weak (round 2)
- Puddle ripples + SSR still flicker close to the camera (884 ppm): filter the ripple normals for the SSR pass.
- The materials' "tracks in thin snow" sampler (`weatherize({ track })`, a storage-buffer read in the fragment) did not
  show in the test: not wired (the layer alone darkens the tracks).
- Thin-snow patchiness is one noise: blobby holes; real thin snow follows the ground texture (sett joints, grass).
- Wet asphalt still mirrors the bright snowy street at grazing angles more than in the photo.
- The night sky glow is a hemisphere light in the lab, not in Firmament.
- Lab trees are procedural skeletons (claude/foliage will replace them).

---

# Polish (2026-11-11, late)

**Puddle reflections at night (the round-2 weakest spot).** `weatherize()` puddles: the ripple slope is filtered by its
own screen footprint before it bends the reflection: `dv = fwidth(slope)`; the slope fades to its mean (flat) by
`1 / (1 + (30 dv)^2)` and the lost variance goes into roughness (`sqrt(0.025^2 + 16 dv^2 + 0.1 |slope|^2)`, max 0.22:
Toksvig-style specular AA), so the half-res SSR blur widens instead of neighbouring rays scattering; the rings' far fade
starts earlier (fw 0.8-2.5 cm, was 1.2-3.5). Ripples still read (`docs/weather/polish_rain_night_puddles.png`).

Flicker (heavy rain, 22:30, 15 Jan, "puddles low", strafe, 24 frames; the lab's own animation between samples, so each
sample freezes a different ripple phase; region = the puddle, x 0-900, y 430-800 of 1280 x 800):

| | whole frame, 0.6 mm (8 samples) | puddle region, 3 mm (8 samples) |
|---|---|---|
| before | mean 10 ppm (6-12) | mean 40, max 102 ppm (`polish_flicker_puddle_before.png`) |
| after | mean 10 ppm (6-11) | **0 in all 8** (`polish_flicker_puddle_after.png` is the intermediate try, 69 mean, before the roughness term) |

NOTE: round 2's 884 ppm did NOT reproduce today (the same view, before the change, measured 7-16 ppm): the lab's
moving car, the date and the ripple phase move the number a lot; the remaining whole-frame blinks are the parked cars'
plates / wheel rims, the lamp post and rain streaks, not the water. The background tab only renders when the script
pumps `lab.frame()` (rAF is throttled), so these tests drive frames by hand.

**Thin-snow holes follow the ground.** `weatherize({ ground })`: a node (1 = holds snow) or `{ lum: [lo, hi] }` (from
the dry colour: dark joints hold it). `snowMask(..., ground)`: while the cover is thin (< ~2.5 cm) the big blobby noise
drops to a soft drift and the texture decides the edge; the ground term fades to 0.5 where the texture is sub-pixel.
Lab: setts `ground: { lum: [0.065, 0.11] }` (snow stays in the joints, the domed stone tops show), lawn
`grassGround()` (tufts 25 cm set the patches, blades 4 cm and tips 1.5 cm rag the edges). The snow LAYER dissolves while
thin (its keep threshold rises to 1 as the cover drops below 0.75), except packed tracks, so the materials' textured
cover shows instead of the layer's noise edge. Images (1.4 cm, sun): `polish_thin_snow_setts_before/after.png`,
`polish_thin_snow_lawn_before/after.png`. Flicker at those views (0.6 mm strafe): setts 290 ppm, lawn 127 ppm, the
clusters on the far snowfield at the horizon and the trunk / fir edges, not the near setts or lawn.

Weak (polish): lawn patches at 5-15 m are still the tuft noise (smooth blobs); the sidewalk tiles have no `ground` yet;
the bare sett tops are clean-cut (no partial dusting); the far snowfield blinks a little at the horizon in thin snow.



---

# City hookup (branch claude/weather-city, 2026-11-14)

The weather is IN THE CITY, on by default, clear on load (the city as before). `?weather=old` = the city before the
hookup (no weather in any shader, no bake, nothing drawn). `?wx=clear|overcast|drizzle|rain|storm|snowfall|snow_cover|fog|live`
starts with a weather; `?wxmap=64` (32-128 m) sizes the overhead / snow window. Dev panel, section Weather (under the
fog controls): weather preset, time scale (simulated s per real s, default x20), live weather (Uccle, Open-Meteo, no
key, refreshed every 15 min, CC BY 4.0), inputs (rain, snowfall, temperature, wind, cloud, visibility), the simulated
surface state (wet, puddles, snow depth, slush), roads salted, wet darkening, snow sparkle. Rows in viewer/features.js.

## The modules
| File | What |
|---|---|
| `viewer/weather/cityWeather.js` | `cityWeather`: the one `Weather` (created at load; `window.__weather`: the falcon's wind), `start()` from main.js after the post pipeline, the per-frame update (an updater), presets, live, the overhead map round the camera, rain / snow / leaves, the snow layer, the sky / fog / grade coupling, `panel()` |
| `viewer/weather/cityWeatherize.js` | `wxMat(material, opts)`: the lab's weatherize() as a UNIFORM-GATED layer, called in the material factories |
| `debug/weatherCity.js` | views, presets, `switchTest()` (pipelines + long tasks per preset), `costSplit()` (GPU per state, in the background), `pump()` / `proofSet()` (shots from a background tab), `save()` (canvas to a local POST receiver) |

Shared files touched (small, delimited): `viewer/main.js` (+4 lines: the import, and `cityWeather.start(...)` in a
`// ---- WEATHER` block right after `await (pipeReady ?? setupPipe())`), `viewer/devPanel.js` (+3: `cityWeather.panel(fW,
setParam)` before `switches(fW, "weather")`), `viewer/features.js` (+4 rows), `viewer/lighting.js` fogNode (+8: the
weather's extinction / mist / grey uniforms `lighting.wxFog`, all 0 = the fog as before), `viewer/post.js` (+2: a
`grade` getter). Material factories, one `wxMat(...)` line each, before `addLampLight`: `roadPaint.js` asphalt (setts,
asphalt, pavers; `saltMask`: sett lanes and gravel hardly salted) / paint decals / concrete sidewalks + kerbs / verges,
`cobbles.js` setts / squares / tree pits, `ground.js` procedural + textured terrain, `facades.js` walls (porosity 0 on
the painted glass, rivulets on the wall, beads on the glass) + roofs, `facadeKit/kitMaterials.js` opaque + glass,
`roofs/roofKit.js`, `drive/carPacks.js` (parked, traffic, the player's car), `treesStylized.js` (bark: plaster + snow on
the limbs; leaf cards: snow on the crown tops, `wxCanopy` for the bake), `materials/library.js` createMaterial (every
library material with its own `weatherOpts()`: the landmarks, bridges), `stjobModel.js`, `heros/herosGround.js`,
`heros/herosModel.js`. The foliage family (hedges, garden plants, our grass) already reads `viewer/foliage/seasons.js`
uSnow / uWet: the weather drives those two uniforms.
Lab modules changed for the city (the lab keeps working): overheadMap `bake(scene, at)` re-centres (the new data and
the new origin swap together when the worker returns) + `setRenderer`; snowLayer built in the map's local frame (the
group follows the origin: `follow()`, chunk boxes `refit()`), `edgeFade` (the layer thins out over the window's round
edge into the materials' flat cover), `warm()`; precipitation `warm()`, `setTrees()`; weatherState `wx.uOn`.

## No shader rebuilds, ~0 cost in clear weather
Every material is compiled once at boot WITH the weather. `wxMat` wraps the dry colour / roughness / metalness in one
function: the inputs are snapshot at its top (`.toVar()`), then `If(wx.uOn)` (a uniform: no divergence) runs the
weather. Inside, every effect is its own uniform-gated stage (puddles if uPuddle, ripples if uRain, rivulets if uRain,
beads if uWet, frost if uFrost, snow if uSnowCover), plus per-pixel distance skips where the effect is sub-pixel anyway
(ripples at footprints < 2.5 cm, rivulets < 2 cm, glass beads < 8 mm, sparkle < 11.5 mm; their derivatives come from the
footprint: WGSL forbids fwidth in a per-pixel branch). The normal has its own gated function (the NORMAL sub-build),
recomputing only the masks it needs.
TSL lessons (three r187): code first built inside an `If` is emitted there, so a shared node first touched inside
(normalView, normalWorld, a material's own vars) ends up out of scope, or never assigned, outside: the branch reads
only snapshots + `normalWorldGeometry` / `normalViewGeometry`. `normalize(0)` = NaN made black walls (the lab's
glass-bead normal had the same bug: fixed in surfaceWeather.js too). The colour comes out as a vec3 (the impostor bake
reuses a leaf material's colorNode as an albedo; a vec4 broke it).
The weather draws (rain, splashes, flakes, leaves, the snow layer) are precompiled at boot through warmup.js
`precompile` on the scene pass's MRT target, their compute passes warmed, and one overhead bake runs at boot (its
override-material pipelines). Measured with a hook on `renderer._pipelines.getForRender` over a full preset cycle
(clear, overcast, drizzle, rain, storm, snowfall, snow cover, fog, clear): ONE new pipeline, a street-life box of a tile
streaming in; none from the weather.

## The overhead map in the city
64 m round the camera, 512^2 (12.5 cm), baked only while the weather needs it (rain, snow falling, snow on the ground,
wet), re-baked when the camera is 22 % of the window from its centre (the new centre 12 % ahead of the view) or every
12 s (cars, streamed tiles). Before a bake one `traverseVisible` marks SOLID (opaque meshes without a custom
positionNode: the kit's stretched pieces and anything wind-swayed are left out), CANOPY (`wxCanopy`) and ROAD
(`wxRoad`): 0.3-0.7 ms. A bake: the three GPU passes + readbacks 170-330 ms async (no main-thread stall), the shape pass
in the worker 90-120 ms. Moving at 10 m/s for 12 s in rain, then in snowfall: 6 bakes each, 0 long tasks, ~59 fps.
The ground families read it (exposure: dry under cars and eaves, less snow under crowns); the "topmost" tolerance is
0.25-0.6 m in the city (the lab's 0.06-0.3 left lawns half sheltered: blotchy snow at 15 cm).

## Sky, fog, grade (as the lab)
Blended in / out over ~3 s (`w`; at 0 everything is handed back exactly as the time preset / the panel had it):
Firmament's cloud deck from the cloud cover (weatherBias, low stratus, haze x wet air and visibility), the key light
x (1 - 0.88 deck); fog: Koschmieder extinction from the visibility (scale height 250 m over the valley floor) + ground
mist (fog preset), its colour greyed under the deck; the grade toward the overcast look with saturation x 0.88 and a
white balance that neutralises most of the horizon's tint (a full deck at golden hour read sepia; rainy Uccle is cool
grey); urban sky glow over snow at night (the hemisphere light, intensity only: fixed light count).

## Snow
Material cover on every up-facing surface (roofs, the kit's sills, car roofs, tree limbs and crown tops, terrain,
sidewalks, the landmarks' library materials, Saint-Job's roofs and dome), the volumetric layer over the 64 m window
(smooth: 12.5 cm cells, blurred bases, rounded tapers at drops, drifts at wall feet, cut at cliffs; its round edge fades
into the flat cover), salted main roads (black wet asphalt, grey slush at the kerbs), sett lanes and gravel hardly
salted (they stay white), slush when it thaws, frost on clear cold nights. Falling flakes fade between 0.8 and 3 m
from the lens (big cotton flakes at the lens read wrong). Icicles, ledge caps, footprints / tyre tracks: lab only.

## Cost (street level, Place de Saint-Job, 1400 x 850, interleaved rounds, GPU p50 medians)
Preflight RED all session (other agents' Chrome tabs and GPU work; frames of 40+ ms in some periods): +/- 0.3 ms; only
runs where clear sat at 9.5-10 ms are kept.

| State | Before staging | Staged |
|---|---|---|
| clear (gate shut) | ~0 by construction: one uniform `if` per material (`?weather=old` vs clear not A/B'd in one session) | same |
| gate open, nothing on the surfaces | +1.3 | **+0.26** |
| overcast, dry (sky only) | | ~0 |
| wet, no rain (wet film, puddles, beads) | | +0.8 |
| rain (+ drops, splashes, ripples, rivulets) | +1.75 | +1.3-1.4 |
| snow on the ground, nothing falling (cover + layer) | | +1.4 |
| snowfall (+ flakes) | +2.2 | +1.5-1.6 |

The per-pixel distance skips came after the last clean run (the GPU was contended since): not measured. Over the
lab's quiet-machine numbers (wetness +0.42, all snow +0.62): the city has several times the weatherized surface (every
facade, kit, roof, terrain, landmark) at full detail. Next: the lite path (`wxMat({ lite })`) for far-LOD tiles and
far landmarks, puddle + snow masks behind a distance branch with analytic footprints, the layer's fragment noise.

## Images (docs/weather/city/: same camera per place; clear / rain / snow x day / dusk)
`stjob_*` (Place de Saint-Job, street level), `venelle_*` (Venelle de Saint-Job: a residential sett lane with front
gardens), `heros_*` (Square des Heros, tile E4), `stjob_snow_roofs_close.jpg`, `stjob_snow_aerial.jpg` (snow cover from
70 m: roofs, the church dome, crowns, salted roads). The Heros set was taken before the exposure-tolerance fix (blotchy
lawn snow) and the Heros model hookup.

## Reference comparison (looked at, not stored)
The lab's round-2 composites (Av. Churchill after snow and in snowfall at night, Av. Demey, Bosveldweg, rue des
Fripiers in rain; Commons photos) hold in the city: salted main roads black and wet with slush at the kerbs, snow on
sidewalks, cars, lawns and roofs (Saint-Job); thin snow patchy; snow lit everywhere at night. Rain: wet Brussels
streets are dark with a sky sheen and lamp streaks, facades darker (matched; the first city rain read sepia at golden
hour: fixed by the white balance under the deck). Uccle's sett lanes stay white in snow (not salted).

## Weak spots / leftovers
- GPU cost over the lab's budget (table); a GREEN re-measure of every state and of `?weather=old` vs clear.
- Not weatherized yet: trams, trains and the bridges' own (non-library) materials, the pond, street furniture / signs /
  stops / lamps, garden walls, far-LOD (lite) tiles, the far impostor trees (baked once, dry), the other landmarks'
  non-library materials; the Heros steps looked dry in snow.
- Icicles, ledge caps, footprints / tyre tracks are lab-only; the kit's sills get cover, not the volumetric layer (the
  bake leaves out meshes with a custom positionNode); crowns are their instanced volume in the bake.
- A new mesh type streaming in could still compile an override pipeline at its first bake (not seen).
- Leaf crowns in snow read a little like blossom (real November snow on leafy trees is rare: the season could drop
  them).
- The weather's boot precompile waits behind the tiles in warmup's queue ("ready" 65-78 s after boot); the weather
  runs before that (a preset chosen before then compiles on first use).
- Rivulets are 3 cm procedural columns (plain up close); no drips from the eaves in the city.
