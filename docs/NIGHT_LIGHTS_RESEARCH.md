# Night lights: research (2026-11-11)

Goal: many real lights at night, cheaply, in our three.js r187 WebGPU city: headlights that light the road, lamps that
light walls / cars / trees (not only the ground), shop and window spill, the tram, wet-road reflections. This page is
what the Night Lights Lab (`labs/night-lab.html`, `docs/NIGHT_LIGHTS.md`) is built on. Sources are linked; where I only
had a secondary summary I say so.

## 1. Many lights: tiled and clustered forward shading

- **Olsson, Billeter, Assarsson, "Clustered Deferred and Forward Shading", HPG 2012**
  (https://www.cse.chalmers.se/~uffe/clustered_shading_preprint.pdf, record https://research.chalmers.se/en/publication/161725).
  Cut the view frustum into screen tiles x depth slices (exponential in depth), list the lights whose volume touches
  each cluster, shade each fragment with its cluster's list only. Better than 2-D tiles where lights overlap on screen
  at different depths (a street seen along its length: exactly our case). Companion: "Tiled and clustered forward
  shading: supporting transparency and MSAA" (https://research.chalmers.se/en/publication/161726).
- **Doom (2016), idTech 6** - clustered forward, 16 x 8 x 24 = 3072 clusters, logarithmic depth slices, up to 256
  lights, 256 decals and 256 cubemaps per cluster, lists built on the CPU and read through an offset + index buffer;
  a depth pre-pass and EQUAL depth test so lighting has no overdraw. From Adrian Courreges' frame study
  (https://www.adriancourreges.com/blog/2016/09/09/doom-2016-graphics-study/), which uses Sousa and Geffroy's
  SIGGRAPH 2016 talk "The Devil is in the Details: idTech 666".
- **Detroit: Become Human** - Quantic Dream moved from deferred to clustered forward on PS4 (GDC 2018 "Cluster
  Forward Rendering and Anti-Aliasing in Detroit: Become Human", https://gdcvault.com/play/1025420/Cluster-Forward-Rendering-and-Anti);
  AMD's PC-port notes confirm clustered forward (https://gpuopen.com/learn/porting-detroit-1/). The companion lighting
  talk moved all lights to photometric units (https://www.gamedeveloper.com/programming/video-the-lighting-technology-of-i-detroit-become-human-i-).
- **Unity HDRP** - fine-pruned tiled lighting (FPTL) for opaques + clusters for transparents; a per-tile cap of 31 or
  63 lights (`FPTLMaxLightCount`, ShaderConfig.cs; secondary sources). The cap is the thing to watch: a cluster that
  overflows drops lights, i.e. pops.
- **Unreal** - its forward renderer culls lights into a frustum-space grid (I found no official page in this search;
  Humus' "Practical Clustered Shading" (Avalanche, Just Cause 3) is the classic practical write-up:
  https://www.humus.name/Articles/PracticalClusteredShading.pdf).
- **Takeaways for us**: clusters (not tiles) because our streets are deep; exponential slices; a fixed per-cluster
  cap that is never reached (else popping); light lists rebuilt every frame; the light count itself is cheap, the cost
  is how many (light, pixel) pairs pass the tests.

## 2. three.js WebGPU: TiledLighting -> ClusteredLighting

- **TiledLighting** (`examples/jsm/lighting/TiledLighting.js`): r170 to r184 (checked on jsDelivr: present at 0.170 /
  0.180 / 0.183 / 0.184, absent at 0.185+). 2-D screen tiles, a compute pass per tile.
- **ClusteredLighting** (r185+, https://threejs.org/docs/pages/ClusteredLighting.html,
  https://threejs.org/docs/pages/ClusteredLightsNode.html; example `webgpu_lights_clustered`, reworked in r185 PR
  #33803): `renderer.lighting = new ClusteredLighting(maxLights = 1024, tileSize = 32, zSlices = 24, maxLightsPerCluster = 64)`.
  Read in r187 (`examples/jsm/tsl/lighting/ClusteredLightsNode.js`):
  - per frame on the CPU: every clustered light's world position / colour x intensity / spot / bounding sphere into a
    `maxLights x 4` RGBA32F DataTexture, lights sorted by view depth (`Array.sort` with a new comparator: a small
    allocation per frame), per depth slice the [first, last) range of lights that can touch it;
  - a compute pass: per cluster, sphere vs cluster-AABB for the lights in its slice range, indices into a storage
    buffer of ivec4 chunks;
  - the fragment loop: per light of the cluster, `directPointLight` (Frostbite windowed inverse square) x spot
    smoothstep -> the material's lighting model (full BRDF);
  - LIMITS: lights with `castShadow`, a `colorNode`, a projected `map` (cookie) or their own node (`IESSpotLight`,
    `ProjectorLight`) are NOT clustered (they take the default per-material path); no light profiles; lights are
    Object3Ds (matrices updated every frame); every light in the list costs CPU and GPU even at intensity 0 unless
    parked out of view; overflow of `maxLightsPerCluster` silently drops lights.
- **IES / cookies in three**: `IESSpotLight` (IES texture) and `ProjectorLight` / `SpotLight.map` exist but are not
  clustered -> one material light each, recompiles when the count changes: fine for 1-4 hero lights, not for 150.

## 3. Mr.doob's slop-newyork night (read as data, never run; HEAD 536a907, 2026-11-06)

`docs/SLOP_NEWYORK_AUDIT.md` row "Real dynamic lights at night"; code in the scratchpad clone:
- `js/main.js:92` `renderer.lighting = new ClusteredLighting(256, 32, 28, 48)`.
- `js/street-details.js:995-1134`: 36 cobra-head SpotLights (0.96 rad, penumbra 0.82, decay 1.25) + 48 point lights,
  fixed pools created once, parked at `y = -1000`, intensity 0. Sources in a 128 m cell grid; each frame
  `nearbyLights()` collects candidates (distance + a penalty for lights behind the camera), sorts them, and gives the
  i-th nearest a fade `smoothFade(d, 0.62 cutoff, cutoff)` where `cutoff = min(range, distance of the (N+1)-th)`.
  This is the key no-pop idea: the light that leaves the pool has faded to exactly 0 when it leaves.
- `js/traffic.js:443-470, 1765-1835`, `js/vehicle-lights.js`: 96 headlight spots (two per car, 0.14 rad, penumbra
  0.85, intensity 700, distance 36, pitched 0.145 rad down), the same nearest-N + cutoff fade per car; police roof
  lights as 6 pulsing points. Tail lights are emissive only.
- `js/buildings.js:656-680`: 28 storefront spots (0.84 rad) in warm / cool theme colours.
- Things I did NOT take: the behind-camera distance penalty (turning the head changes which lamps light the street in
  front of you: a visible change on rotation), sorting arrays of objects every frame (allocation), two spots per car.

## 4. Light cookies, IES profiles, headlights

- A cookie is a projected texture that shapes a light; engines use cookies to imitate IES photometric profiles
  (Valve: https://developer.valvesoftware.com/wiki/SteamVR/Environments/lightcookies/). An IES file is a table of
  candela per (vertical, horizontal) angle; for street lanterns the vertical curve is what matters (opal globe: a lot
  of light sideways and some upward; modern road luminaires: "batwing" peaks around 60-70 deg from nadir so the road
  is lit evenly between poles).
- **Low beam (ECE)**: a horizontally long, vertically narrow pattern with a SHARP upper cut-off about 1 % (0.57 deg)
  below the horizon on the oncoming side and a 15 deg rising kink on the kerb side (right-hand traffic); maximum
  intensity just below the cut-off line; a dimmer, wide foreground (patents summarised in the search, e.g.
  https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12215835). Not a round spot.
- **What we do**: profiles computed analytically in the light's own frame in the shading loop (no texture fetch, no
  extra light type, still clustered): low beam, lantern (up share + batwing), aperture (a window / shop front as a
  rectangular opening the light passes through - the window-shaped patch on the garden). A tabulated IES row
  (1-D vertical curve) is the natural next step for real luminaire data.

## 5. Big-city nights in games

- **GTA V** (Courreges, https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-2/): far lights are
  instanced 32x32 sprites, but they are real lights up close ("drive towards them and find the bulb"); far cars are
  reduced to "only 2 headlights"; each light is a deferred light volume; strong highlights on wet asphalt come from the
  lights themselves on a glossy surface. Part 3 (post): anamorphic streaks and lens flares at night; emissive traffic
  lights glow through the tone mapper rather than burning to white (secondary: simonschreibt.de).
- **Watch Dogs**: marketed on rainy nights, wet roads that dry in real time (press: gamingbolt / dsogaming); I found no
  rendering talk on its night lights. Its successor tech: the Far Cry 5 deck mentions techniques from AC Unity adapted
  in Watch Dogs 2 (https://www.advances.realtimerendering.com/s2018/The%20Challenges%20of%20Rendering%20an%20Open%20World%20in%20Far%20Cry%205%20(With%20Notes).pdf).
- **Cyberpunk 2077**: GDC 2022 "Bringing Light to Night City" (https://gdcvault.com/play/1027959/Advanced-Graphics-Summit-Cyberpunk-2077);
  RenderDoc analyses suggest clustered deferred (forum reverse engineering, unverified); RTXDI for the many-lights case
  with ray tracing (NVIDIA interview). The developers note that choosing which lights cast shadows was the classic
  limit: our "shadows on the K nearest lamps, cross-faded" is that compromise.
- **Wet roads**: "rain at night shows first as the long stretched highlight of the bright lights"; rougher = dimmer
  highlight; wet = darker albedo + stronger specular (fxguide game environments, https://www.fxguide.com/?p=43362;
  Lagarde's "Water drop" series; Tatarchuk, "Artist-directable real-time rain rendering in city environments",
  https://advances.realtimerendering.com/s2006/Chapter3-Artist-Directable_Real-Time_Rain_Rendering_in_City_Environments.pdf).
  In a GGX renderer the streaks come for free from the light itself once roughness drops; screen-space reflections add
  the emissive things (windows, signs, lamp globes).

## 6. Volumetric beams, emissive and bloom

- Cheap beams: additive cone geometry with view-angle (silhouette) and along-axis falloff, faded where it meets the
  ground and near the camera (no depth texture, no ray march). Real volumetric lighting (froxels) is the expensive
  alternative; our vendored volumetric fog could take the pool lights later.
- Emissive + bloom: the lamp globes, headlights, windows and signs are emissive at > 1 (HDR) so the post chain's
  bloom (viewer/post.js, "night" look: threshold 1.0, strength 0.3) halos them; the LIGHT on the surroundings is the
  pool's job, the GLOW is emissive + bloom. Keep emissive moderate: our shop fronts at x1.6 bloomed into white walls
  (lowered to x1.0).

## 7. Our current night (before this lab)

- `viewer/lamps.js`: up to 6 PointLights on the nearest lamps (no per-frame allocation since the audit fix), plus
  `viewer/lampLight.js`: a world-space R8 lamp light map painted per tile (2 m texels), read by ground materials:
  pools on the ground only; cars, trees and walls get nothing from lamps.
- `viewer/lighting.js` night: Firmament moonlight + night look (+0.6 EV since the smallfixes fix), `env.uNight`.
- `viewer/post.js`: SSR (half res), bloom (half res), GTAO.
- Cars (branch claude/traffic): headlights emissive only.
