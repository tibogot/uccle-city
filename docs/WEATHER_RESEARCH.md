# Weather + seasons: research (2026-11-11)

Goal: a WEATHER + SEASONS LAB (`labs/weather-lab.html`) whose modules (`viewer/weather/`, `viewer/seasons/`) the
city can adopt later: rain, wet surfaces, puddles, fog / mist, falling snow, snow accumulation with real thickness,
seasons (leaf colour, bare trees, the sun for the date) and a live-weather hook. This file is what I read and what I
took from it. Build notes: `docs/WEATHER.md`.

Legend: **took** = what the lab does because of this source; **not taken** = considered and why not.

## 1. The physics everyone starts from

### Sébastien Lagarde, "Water drop" series (Dontnod, Remember Me, 2012-2013)
- Blog: https://seblagarde.wordpress.com/2012/12/10/observe-rainy-world/ (part 1, observation),
  https://seblagarde.wordpress.com/2013/01/03/water-drop-2a-dynamic-rain-and-its-effects/ (2a: rain, splashes,
  ripples, streaks), https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/ (3b),
  https://seblagarde.wordpress.com/2013/03/19/water-drop-3a-physically-based-wet-surfaces/ (3a);
  summarised by fxguide, https://www.fxguide.com/?p=43362 ("making wet environments") and
  https://www.fxguide.com/?p=42356 ("rain").
- What matters:
  1. **Wet = darker diffuse + smoother + a water layer.** Water fills pores: porous materials (asphalt, brick,
     concrete, soil) lose roughly half their albedo, non-porous ones (metal, glass, painted car body) barely change
     colour; all get smoother. His formula family: `diffuse *= lerp(1, 0.2..0.5, porosity * wet)`,
     `gloss = lerp(gloss, 1, wet)` (more for non-porous), F0 toward water's 0.02.
  2. **Two states: damp film vs standing water.** Puddles form in low spots first, then spread as the "water level"
     rises over a height / puddle mask; in a puddle the surface is a near-mirror with the submerged surface's normal
     flattened.
  3. **Rain on the surface**: ripples (expanding rings, animated normal map) in puddles; on vertical surfaces
     streaks flowing down; drops beading on non-porous surfaces (glass, cars).
  4. **Drying is not instant and not uniform**: the film dries before the puddles; a road a few hours after rain is
     damp with puddles.
- **Took**: all four. `viewer/weather/surfaceWeather.js` darkens by a per-material porosity, lowers roughness,
  keeps two fields (film `uWet`, puddle level `uPuddle`) and the puddle mask grows with the level (threshold over a
  noise "low spot" field), ripples only inside puddles and only while it rains, streaks on walls / glass, beads on
  glass and car paint.

### Natalya Tatarchuk, "Artist-directable real-time rain rendering in city environments" (ATI ToyShop, SIGGRAPH 2006)
- https://advances.realtimerendering.com/s2006/Tatarchuk-Rain.pdf and the course chapter
  https://advances.realtimerendering.com/s2006/Chapter3-Artist-Directable_Real-Time_Rain_Rendering_in_City_Environments.pdf
- Rain = many layers: falling streaks (motion-blurred, lit by the light sources they pass), splashes on impact,
  ripples, streaks on windows, wet reflections stretched vertically, fog / halos round lights, droplets dripping
  off ledges. Streak brightness comes from the light *behind* the drop (they are tiny lenses), never white.
- **Took**: the layer list as the lab's checklist; streaks tinted cool-grey and faint, brighter near lamps at night
  (the drops take the scene's lamp light in their colour); splashes paired with drops.

### The game-engine-v1 rain (owner's engine, read-only): `games/modular-road-v3/modularRoadWorldRain.js`, `v3/render/roads/wetRoad.js`
- A port of three.js' `webgpu_compute_particles_rain` example (https://threejs.org/examples/#webgpu_compute_particles_rain):
  drops in a storage buffer moved by a compute shader in a window around the camera; **collision = one texture
  fetch** in a top-down "world position" map rendered by an orthographic camera looking straight down (only objects
  on a collider layer); the drop respawns at the top and its paired splash starts at the hit point.
  Lessons written in that file: fp32 (half float quantises heights 2 m at 2 km), alpha as a validity flag, drops
  WRAP around the moving window (constant population), spawn height above everything the bake can see, a circular
  soft edge so the square window never shows, near fade (a drop touching the lens fills the screen), measured cost:
  compute ~free, drops + splashes are pure fill.
- `wetRoad.js`: "mostly not a reflection": albedo drop first, a smooth layer second, Fresnel third; the field has
  FILM and POND channels; ponding shaped by geometry (up-facing only, camber, wheel paths dry first); ripples as
  procedural rings in jittered cells (3 x 3 neighbourhood), slopes summed then packed once.
- `modularRoadWeather.js`: presets are claims about which values move together (coverage, sun, haze, wetness, rain
  crossfaded together); "wetness and rain are two numbers, not one: a road does not dry when the rain stops".
- **Took**: the top-down map (extended: it is ALSO our snow exposure and the volumetric snow's base height, see §4),
  wrap-around window, circular edge fade, near fade, rain/wet as separate numbers with a crossfade, ripples in jittered
  cells. Written fresh in our modules (no copy).

## 2. Engines and plugins

### Unreal Engine 5
- **Niagara** rain / snow: GPU sprites in a camera-following box, depth-buffer collision for splashes, "Niagara Fluids"
  not needed. https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine
  (GPU particles + scene-depth collision). **Took**: GPU-only, camera box. Our collision is the top-down map, not the
  screen depth (screen-depth collision misses everything off screen and fails behind the camera).
- **Ultra Dynamic Sky & Weather** (Everett Gunther, Fab marketplace, https://www.fab.com/listings/84fda27a-c79f-49c9-8458-82401fb37cfb):
  the reference "one weather dial" product: cloud coverage, rain, snow, thunder, fog, dust, wind as one state,
  material functions for wetness / snow cover / puddles that every material calls, snow and wetness that build up and
  dry over time, "weather masks" (volumes) to keep interiors dry, a temperature that turns rain into snow.
  **Took**: one weather state with build-up / decay over time (`viewer/weather/weatherState.js`), one material
  function every material calls (`weatherize()`), temperature deciding rain vs snow, slush when melting.
- **The Matrix Awakens / City Sample** (Epic, 2021): wet city at night: wetness and puddles from a material function
  on the road with a puddle mask, rain-on-glass decals, the reflections are Lumen; puddles read mostly through
  reflections of lit signs. https://dev.epicgames.com/documentation/en-us/unreal-engine/city-sample-project-unreal-engine-demonstration
  **Took**: night is where wet shines (the lab has a night toggle with the city's lamps), puddles must mirror the
  sky and lamps: we use the city's existing SSR (`viewer/post.js`) by giving puddles a metalness the SSR mask reads
  (slop-newyork does the same: "Fresnel via metalness for SSR").
- **Substrate** (UE 5.2+): layered materials ("slabs"): a water / coat slab over the base slab, horizontal mixing
  for puddles. https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-substrate-materials-in-unreal-engine
  **Took**: the idea of a *coat over the base* (here: roughness and normal lerp to the water layer's, the base
  darkens under it). **Not taken**: a real second specular lobe (three's clearcoat would cost a full extra lobe on every
  ground pixel; slop-newyork and the engine show the darken + smooth + Fresnel mix carries the look).
- **Virtual Heightfield Mesh** (UE5): a heightfield mesh displaced from a runtime virtual texture rendered top-down,
  used for snow and deformable ground. https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-heightfield-mesh-in-unreal-engine
  **Took**: the core of our volumetric snow: a grid mesh displaced in the vertex shader from a top-down height bake of
  the scene (our rain map!) + a snow depth; deformation (tracks) as a field it reads.

### Unity
- **Enviro 3** (Hendrik Haupt, https://assetstore.unity.com/packages/tools/particles-effects/enviro-3-sky-and-weather-236601):
  weather types blend over time; global wetness and snow shader properties that materials read; seasons switch
  (spring / summer / autumn / winter) driving the date and temperature. **Took**: the season as one global driving
  shader globals (`viewer/seasons/season.js`).
- **Weather Maker** (Digital Ruby, https://assetstore.unity.com/packages/tools/particles-effects/weather-maker-unity-weather-system-sky-water-volumetric-clouds-and-lightning-60955):
  precipitation intensity drives particle count and audio; fog with "fog density by visibility". **Took**: intensity
  -> *draw count* (not emission rate: the instanced draw just draws fewer instances, the population is fixed).
- **HDRP wetness** (Unity HDRP Lit: "coat mask" and the HDRP sample "rain / wet" shader graphs,
  https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Mask-Map-and-Detail-Map.html):
  coat + smoothness up + albedo down, a world-space puddle mask. Same model as Lagarde.

### Godot
- **Sky3D** (TokisanGames, https://github.com/TokisanGames/Sky3D) and **Godot weather / rain shaders**
  (godotshaders.com: "rain drops on surfaces", "snow shader with displacement", https://godotshaders.com/?s=snow):
  the snow shaders do what everyone does: cover = smoothstep on world normal.y, displacement up by cover.
  **Took** the normal.y cover with noise break-up for the *material* snow; the displacement-by-cover approach is the
  one I rejected for volumetric snow (it needs dense, watertight meshes: our houses are low-poly boxes, so a vertex
  push opens gaps at every edge, see §4).

### three.js / WebGPU
- `webgpu_compute_particles_rain` (three.js example, sunag): compute + `instancedArray` + top-down collision map,
  splashes. https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_compute_particles_rain.html  **Took**: the TSL
  pattern (`instancedArray`, `Fn().compute(n)`, `renderer.compute`).
- `webgpu_compute_particles_snow` (three.js example): snow flakes with a collision map and a "snow height" that grows.
  https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_compute_particles_snow.html  **Took**: flakes as
  soft round billboards with a slow wobble.
- **mrdoob/slop-newyork** (MIT): `uRoadWetness` with puddle field, damp / standing water / film masks on roads and
  sidewalks (`js/tsl-materials.js:1775-1801`, see `docs/SLOP_NEWYORK_AUDIT.md`). **Took**: the three-mask split and
  "SSR reads metalness" for puddles.
- Codrops "Rain & water effect experiments" (screen-space rain on glass, https://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/):
  drops on a lens / pane as refractive blobs + trails. **Took**: for window panes, the bead + trail pattern in the
  glass material (no screen-space lens rain: the camera is a pedestrian, not behind a windscreen).

## 3. Games and talks

### Rain in cities: Watch Dogs (Ubisoft, 2014), The Division (Massive, 2016)
- Watch Dogs' wet Chicago: wet shader on every material + planar-ish / screen-space reflections of the lit city, rain
  streaks lit by lights; GDC 2014 "Watch Dogs: rendering" coverage,
  (GDC Vault, talk id not verified; Digital Foundry analyses). The Division: wetness
  accumulates per material, puddle masks painted per asset, snow version of the same system (Massive, "Rendering The
  Division", GDC 2016, GDC Vault; id not verified).
  **Took**: wet must be global (every material calls `weatherize`), reflections via SSR, puddles from a mask.

### Snow
- **Batman: Arkham Origins**, "Deformable Snow Rendering" (Colin Barré-Brisebois, GDC 2014):
  https://www.gdcvault.com/play/1020177/Deformable-Snow-Rendering-in-Batman ,
  slides https://www.slideshare.net/colinbb/gdc2014-deformable-snow-rendering-in-batman-arkham-origins .
  Snow as a heightfield over the ground; characters render their footprint into a top-down "deformation" texture
  around the camera that moves with it; tessellation (PC) or relief (console) displaces the snow; filled back
  slowly by falling snow. **Took**: the deformation field near the player (a GPU buffer the snow vertex shader reads,
  stamped by a compute pass for the walker and the car), refilled by snowfall.
- **Rise of the Tomb Raider**, "Deferred Snow Deformation" (Anton Kai Michels, Peter Sikachev, GPU Pro 7; SIGGRAPH
  2015 Labs talk https://history.siggraph.org/learning/labs-rd-rendering-techniques-in-rise-of-the-tomb-raider ):
  a deformation heightmap around the player in a sliding window (toroidal addressing), deformers as ellipsoids
  rendered into it, the snow trail *raised at its rims* (the snow pushed aside), tessellation on the snow mesh.
  **Took**: rims round tracks (the stamp raises a band at its edge), sliding window idea noted for the city.
- **Red Dead Redemption 2** (Rockstar, 2018): deep snow with persistent trails, snow on characters and horses,
  displacement on terrain; no public talk, Digital Foundry tech analysis
  https://www.eurogamer.net/digitalfoundry-2018-red-dead-redemption-2-tech-analysis . **Took**: snow that sticks to
  up-facing surfaces of objects (car roofs, branches) on top of the displaced ground layer.
- **Assassin's Creed Valhalla / Shadows** (Ubisoft Anvil): Shadows (2025) has seasons, snow that accumulates and
  melts over time, "Atmos" weather sim (https://wccftech.com/assassins-creed-shadows-atmos-real-time-weather-simulation-anvil/);
  Valhalla's material workflow uses world-aligned snow layers with height blending
  (https://80.lv/articles/a-look-at-the-material-workflow-in-assassin-s-creed-valhalla). **Took**: snow cover
  thresholded against a height / noise so it starts in the crevices and grows over the tops (height-blend), a melting
  phase that goes through slush on roads.
- **"The evolution of snow rendering"** (Digital Foundry, https://recapio.com/digest/the-evolution-of-snow-rendering-from-flat-polygons-to-path-traced-lighting-sponsored-by-digital-foun):
  from white paint to parallax to tessellated displacement; the big visual win is *thickness at edges* (the snow
  slab on a roof edge, the rounded lip). **Took**: our snow layer tapers to the edge with a rounded (quarter-ellipse)
  profile and stands *above* the roof: the eave edge shows a soft rounded lip.

### Sparkle without crawling
- Snow glints in games are a classic source of temporal aliasing (sub-pixel bright specks that blink). Known fixes:
  "Real-time rendering of glinty appearances" (Zirr & Kaplanyan 2016, https://cg.ivd.kit.edu/publications/2016/glints/glints_preprint.pdf):
  filter the glint density by the pixel footprint so the *expected* brightness stays and the specks never go
  sub-pixel. **Took**: glint cells of a fixed world size, only where a cell covers >= ~2 px; beyond that the glints
  fade into a slightly brighter mean (no dots); glints are a low-roughness facet in the normal (so the sun's real
  shadow and BRDF drive them, a shadowed glint is dark).

### Fog / mist
- Height fog: exponential in height, Koschmieder visibility V = 3.912 / β (β: extinction per metre;
  https://en.wikipedia.org/wiki/Visibility#Meteorological_visibility). **Took**: live weather's visibility (m)
  -> fog density directly. Ground mist in parks: a thin second exponential (scale height 2-4 m) with slow noise,
  added in the same fog node (one node, no extra pass). Our Firmament sky already gives the fog colour
  (`sky.light().horizon`) and the volumetric fog exists for the heavy case (`vendor/volumetric-fog`, `?vfog=1`).

## 4. Volumetric snow: the options and the choice

| Option | How | Pros | Cons | Verdict |
|---|---|---|---|---|
| White paint (normal.y cover) | material only | free, any mesh | no thickness at all | kept as the *base* layer on every surface (and it hides the snow layer's edge) |
| Vertex push along +y / normal | per-mesh shell | real thickness | needs dense watertight meshes; our low-poly boxes open gaps at every edge, walls get pulled up | no |
| Parallax occlusion (POM) | heightfield in the pixel shader | cheap on flat ground | no silhouette, wrong at roof edges (exactly where thickness shows), shimmer at grazing angles | no |
| Tessellated terrain (Batman, Tomb Raider) | hardware tessellation | best | WebGPU has no tessellation stage | no |
| **Virtual-heightfield mesh** (UE5 VHM) | a grid mesh displaced from a top-down height bake + depth | thickness on ground, roofs, car roofs, kerbs at once; silhouettes; tracks are a buffer it reads; one draw; no per-object work | resolution-bound (12.5 cm cells in the lab), cliffs need care | **chosen** |

How ours works (`viewer/weather/snowLayer.js`): (1) the top-down bake (shared with rain collision) gives the topmost
solid height per 12.5 cm cell and, from a second pass, the tree canopy above it; (2) a one-off compute turns that into a
per-cell *shape*: slope (steep roofs shed: 0 above ~60 deg), distance to a drop edge (rounded taper at eaves, kerbs and
car roofs), distance to a wall (drifts), canopy (less snow under trees: x0.35), low-frequency noise; cliffs (cells next
to a big height step) are flagged; (3) a grid mesh reads base height, shape and the track field in its vertex shader:
`y = base + depth x shape x (1 - track)`; cliff triangles are discarded; (4) every material's own snow cover (white paint
on up-facing exposed surfaces) sits under it and fills the cut edges.

## 5. Seasons

- Phenology of Brussels street trees (plane, lime, horse chestnut, maple): leaf-out mid / late April, full green May -
  September, colour from late September, peak late October, leaf fall through November, bare December - March.
  Sources: KMI/IRM (Uccle is the Royal Meteorological Institute's own station) phenology notes
  https://www.meteo.be/fr/climat/climat-de-la-belgique/climat-a-uccle and Pan-European phenology database PEP725
  (http://www.pep725.eu/) mean dates for Aesculus / Tilia in Belgium. **Took**: a day-of-year curve per stage
  (`viewer/seasons/season.js`), per-leaf random so the change is progressive (not all at once).
- Uccle climate normals 1991-2020 (KMI/IRM, https://www.meteo.be/fr/climat/climat-de-la-belgique/climat-a-uccle):
  January mean ~3.6 C, July ~18.9 C, ~850 mm/yr, rain on ~190 days, snow on ~15 days/yr (mostly Dec - Feb), frost on
  ~45 days. **Took**: monthly mean temperature and snow-day chance tables (rounded) for the "snow chance" readout.
- Sun for any date: Firmament's own `sunDirection({ hours, dayOfYear, latitude })` (vendor/firmament, solar time),
  daylight length from the declination: cos H0 = -tan(lat) tan(dec) (with -0.83 deg refraction / disc correction).
  At 50.8 N: ~16 h 30 at the June solstice, ~7 h 50 at the December solstice, noon sun 62.6 deg vs 15.8 deg.

## 6. Live weather
- **Open-Meteo** (free, no key, CC BY 4.0 data, https://open-meteo.com/en/docs): one GET with `current=` fields
  (`temperature_2m, precipitation, rain, showers, snowfall (cm), snow_depth (m), cloud_cover (%), visibility (m),
  wind_speed_10m, wind_direction_10m, weather_code (WMO), is_day, relative_humidity_2m`). Tested 2026-11-11 19:30 for
  50.80 N 4.33 E: 5.6 C, 100 % cloud, 7.9 km visibility, 2.9 m/s from 36 deg, no precipitation, code 3 (overcast).
  Attribution required ("Weather data by Open-Meteo.com"): shown in the lab.

## 7. What we did NOT take (and why)
- Screen-space lens rain / droplets on the camera: a pedestrian city camera; would read as a bug.
- Planar reflections: one extra scene render per frame; the city already pays for SSR, which handles puddles at
  street level; the SSR misses (off-screen) fall back to the sky's environment map, fine for overcast Brussels.
- Lightning / thunder: rare in Uccle, sound lab territory; noted in TODO.
- Clearcoat second lobe for wet: cost on every ground pixel; darken + smooth + metalness-for-SSR carries it.
