# Shadows research, 2026-11: is baking the answer?

Desk study, 2026-11-23. The code was read on `claude/foundation` (a9f6025f), along with three r187's own source
(`tools/worker/node_modules/three`, 0.187.0). The web sources were fetched the same day. **Nothing was measured in a browser**
(another agent was measuring perf on the laptop). Every ms figure below is either one of our measured numbers (the doc
it comes from is named) or an estimate, and estimates are labelled as such.

Read with: docs/PERF_RESEARCH_2026-11.md (ideas 5 and 7, the Job C result), docs/PERF_GAME.md round 3 (the cache),
docs/perf/AUDIT.md (GPU split), docs/SMOOTH_LOD.md (shadow fade, texel snap), docs/SLOP_NEWYORK_AUDIT.md.

## For the owner, in plain words

**Yes, we already "bake" the sun shadows of everything that doesn't move, and have done since 2026-11-16.** We just
don't bake them into textures in Blender. We bake them at runtime into a **cache**:
- The shadows of buildings, roofs, trees, landmarks and street furniture are drawn once into a stored shadow picture.
- Each frame that picture is copied back (0.33 ms), and only the things that move are drawn on top: your car,
  traffic, trams, trains, two-wheelers, the falcon, birds, flags and people.
- The full redraw costs 1.91 ms and happens on about 1 frame in 9.
- The result was -2 ms a frame in the police game (docs/PERF_GAME.md round 3).

**Classic baking (lightmaps made in Blender) is not the answer for sun shadows,** because our sun moves. A lightmap
stores the shadow for ONE sun position. Move the sun and the baked shadow points the wrong way. Games with a day-night
cycle (Cyberpunk 2077, Far Cry, Unreal's Virtual Shadow Maps) all do what we do: draw the static shadows rarely, keep
them, and redraw only what moves. Baking is still right for what does NOT depend on the sun's direction: ambient
occlusion and sky visibility (dark corners, under eaves, under trees). We already bake those for the landmarks
(the `wrapAO` lightmaps) and add GTAO on screen.

**The one real gap: a moving sun.** The cache is keyed on the sun's direction to 6 decimals (lighting.js:157). The
moment the sun moves (the dev panel's sun speed, or a future day-night cycle), the key changes every frame, so the cache
is redrawn every frame. That is the 1.91 ms full cost, back on every frame. This is read from the code, not measured
yet (step 0 of the first job measures it). The fix is cheap and well known: let the shadow sun move in small steps,
not continuously. At real-time speed it then redraws a few times a minute. For a fast day cycle, prepare the next
step's shadows over several frames and fade across, so nothing snaps. That is the first job proposed below.

**Other gains are smaller and come after:**
- Shadow stand-ins (simple black shapes that cast the shadow instead of the detailed buildings, as in Mr.doob's
  slop-newyork) make each redraw cheaper.
- A smaller shadow texture saves 64-96 MB of video memory.
- Screen-space contact shadows (built into three r187) add fine detail.

## 1. What we do today (read from the code)

### The sun shadow: one map that follows the camera, with a static cache

Code: `viewer/lighting.js`, lines 70-195 (nodes) and 553-630 (`Lighting.update`).

- **One DirectionalLight**, created once and never added or removed (the fixed light pools rule).
  - Map: **4096 x 4096**.
  - `bias` -0.0002, `normalBias` 0.05.
  - Filter: three's PCF (5 Vogel taps of hardware 2x2 compares), with our `temporalPCF` rotation per frame
    (`?shadownoise=old`).
  - The PCF radius grows with the texel size, eased, from 1 to 2.25 texels (lighting.js:613-620).
- **The box follows the camera.**
  - Half sizes come from fixed levels: **60 / 90 / 135 / 200 / 300 / 400 m**. The texel is 2.9-19.5 cm, and 3.9 cm at
    street level with the 80 m box.
  - The box grows at once and shrinks with hysteresis.
  - Its centre is texel-snapped across the sun's view, so edges stand still.
  - `FadedShadowNode` fades the shadow out toward a damped radius inside the box (`uRadius` ~0.9, band 0.22), so a
    shadow never ends at a hard line (docs/SMOOTH_LOD.md S1-S3).
- **Depth range** (`?shadowfar=old`): the far plane = 900 + box x 1.42 + 110 m (+ 25 m with the cache). Casters
  further from the sun than the deepest receiver are not drawn.
- **`CachedSunShadowNode`** (`?sunshadowcache=old` = off):
  - **Two depth32float 4096² textures**: the live map and the cache. That is ~64 MB each, ~128 MB together.
  - **Full redraw**: the movers are hidden, all static casters are drawn into the map, and it is copied to the cache
    (`copyTextureToTexture`).
  - **Every other frame**: the cache is laid back by a depth-writing quad, SHIFTED by the whole texels the box moved.
    This is exact because the light's distance along the sun is quantised in `SUN_QZ` = 25 m steps.
  - **Movers on top, every frame**: the scene's top-level groups whose name matches `MOVER_TOP` (car, traffic,
    train(s), tram, twowheel, falcon, player-falcon, pigeons, sky-birds, bird, flag, People, character, police-props,
    waypoint), anything with `userData.sunMover`, and the shader warm-up groups (`-warm`).
- **When the cache redraws** (`why` at lighting.js:162; counters in `sunCache.stats`):
  - `dirty`: `markSunShadowDirty()`, called by main.js on tile add (2292), tile fade start (2073), and tile dispose
    (2007-2015).
  - `key`: the box size, the far plane, the **sun direction (6 decimals)** or the 25 m depth step changed.
  - `shift`: the box moved further than the fade's outer band (~200 texels at 4096: ~16 m in the 80 m box).
  - `fade`: a tile fade is running, at most every 3rd frame.
  - `refresh`: every 30 frames (`?sunshadowrefresh=`), for tree wind, LOD hand-overs and the pools: at most ~0.5 s
    stale.
- **What is drawn in a full redraw**:
  - Every static caster in the light frustum: terrain does not cast; walls, roofs, the roof kit, the façade kit, the
    street kits (multi-draw), landmarks, bridges, the tree pool (LOD0 casts; alpha-tested leaves), hedges and ivy.
  - Small kit pieces cast no shadow past LOD0.
  - About **150 render objects** in the police drive (PERF_GAME.md profile). Job C counted **up to 2,087 indirect draws
    and up to 41 distinct indirect buffers** in a cache redraw at the Saint-Job street view, and up to 1,973 / 36 in
    the police drive. Pooling cut the buffers to 1.
- **The sun's direction** comes from the preset's solar hour (`?hour=`, `?time=`). It **does not move in the games
  today**. It moves only with the dev panel's "sun speed (x real)" (devPanel.js:317), which changes the hour every
  frame.
- `?sunlight=1` swaps in three r187's cascaded `SunLight`: 2 x 2048 cascades, far 220 m. It has no cache and stays
  opt-in.

### How moving objects get shadows

- **Cast**: the player's car, traffic, trams, trains, two-wheelers, the falcon and people are drawn into the sun map
  every frame, on top of the laid-back cache. Their shadows are therefore never stale and never snap. Parked cars are
  static casters inside the cache, with dithered fades (carFleet.js).
- **Beyond the box**: `impostorKit/contact.js` puts a soft SDF contact quad under parked cars (slop-newyork's
  technique) where mesh LODs no longer cast.
- **Receive**: everything samples the same map.

### Other shadow and light systems (for completeness)

- **Night lamps**: a fixed pool of SpotLight shadows (`nightLights/`). The "smart" schedule is the default and `?nightshadow=alt`
  is opt-in. Lamp maps are gated by tile reach. These are separate from the sun and out of scope here.
- **Cloud shadows**: Firmament's cumulus shadow multiplies the key light (`sun.colorNode`, lighting.js:372).
- **Sun shafts** ray-march the sun's shadow map (`postProcess`).
- **Baked**:
  - Landmark AO lightmaps (`wrapAO` in the ~15 `*Model.js`: a Blender-baked AO texture on uv1 x vertex AO).
  - The far city's merged colour (farMerge.js).
  - Per-vertex foliage lighting (vertexLight.js: a lighting-cost trick, not a bake).
- **Screen**: GTAO in the post chain.

### What it costs (our measured numbers)

| measure | value | source |
|---|---|---|
| shadow pass, laid-back frame | **0.33 ms** | PERF_GAME.md round 3 |
| shadow pass, full static redraw | **1.91 ms** | same |
| share of frames that redraw (spawn + drive) | **~11 %** (box moved ~2 m, tile fades every 3rd frame, refresh every 30) | same |
| frame with the cache vs `?sunshadowcache=old` | shadow pass **-1.5 ms**, frame **-2 ms**; police spawn CPU 9.8-10.2 -> 7.7-8.8 ms | same |
| render objects a frame | ~390 (main ~240 + shadow ~150) at ~10-12 us each | PERF_RESEARCH "Where we stand" |
| sun shadow share of the GPU (round 1, before the cache) | flight 38-40 %, stjob 28 %, street 26 %, orbit 9 % | perf/AUDIT.md |
| indirect draws in one cache redraw | up to 2,087 (street), 1,973 (police) | PERF_RESEARCH Job C |
| VRAM | 2 x 64 MB (map + cache, FloatType 4096²) | PERF_RESEARCH idea 7 |

**The two earlier ideas** (PERF_RESEARCH_2026-11.md):
- **Idea 5, shadow stand-ins:** CPU -1..-1.3 ms on the ~11 % of frames that redraw (~150 -> ~30 shadow objects).
- **Idea 7, map size and format A/B:** VRAM -64..-96 MB, GPU -0.5..-1.5 ms on redraw frames.

Its summary ranks shadows second ("about 1 ms"). The Sundial paged shadows were set aside: "our static cache already
gets most of that".

**What the numbers say.** With a fixed sun, the average shadow cost is already low: ~0.33 + 0.11 x 1.58 ≈ **0.5 ms a
frame** of shadow pass. What is left is (a) the **redraw frames**, each a 1.6 ms spike on top of a frame already near
budget, and (b) **any moving sun**, which today turns every frame into a redraw frame.

## 2. Online research

### three.js r187: what it has natively

| feature | what it does | static/dynamic split? | fit for us |
|---|---|---|---|
| `LightShadow.autoUpdate` / `needsUpdate` (ShadowNode.updateBefore, r187 source :806) | `autoUpdate = false` skips the whole shadow render; `needsUpdate = true` renders it once | **no**: all or nothing. A frozen map loses the movers' shadows | our cache is a finer version of this (movers every frame) |
| `ShadowNode` subclassing (`setupShadowFilter`, `renderShadow`, `setupRenderTarget`) | the hooks we already use | we built it on top | **in use** |
| `shadow.camera.layers` (ShadowNode.updateShadow :674-713) | if the shadow camera has only layer 0 it takes the VIEW camera's layers; otherwise its own mask. r187 #34670 aligned WebGL to this | lets a shadow-only layer work (stand-ins) | needed for stand-ins |
| `SunLight` + `SunLightShadow` + `SunShadowNode` (r186 #34221, "reduced to 2 cascades" 52184ab) | 2 cascades in one atlas, fitted and texel-snapped to the view each frame, 10 % fade band; no VSM | **no cache**: both cascades redraw every frame | already behind `?sunlight=1`; Mr.doob's choice. Drawing both cascades every frame means 2 x the casters, against our cache |
| `CSMShadowNode` (examples/jsm/csm) | N cascades (default 3), practical / uniform / log splits, `lightMargin` | no cache | older path. SunLight replaces it for one sun |
| `TileShadowNode` (examples/jsm/tsl/shadows) | one big map split into tilesX x tilesY tiles, each with its own light / camera (default 2 x 2); no VSM | no cache, but the per-tile cameras are exactly what a **sliced redraw** needs | worth reading for the slicing pattern |
| `SSSNode` (`sss()`, examples/jsm/tsl/display) | screen-space (contact) shadows for ONE directional light; ray march in depth; `maxDistance` (default 0.1 m, "should not exceed 1 m"), `quality`, `thickness`, optional temporal filtering | n/a (screen space) | **yes for small detail**: it could let kerbs, bollards and window reveals drop out of the sun map |
| filters: `BasicShadowMap`, `PCFShadowMap` (Vogel + IGN + hardware compare; textureGatherCompare since r185 #33534), `VSMShadowMap`; PCFSoft **removed** in r186 (#33987) | | | VSM is not supported by SunLight / TileShadowNode and needs a blur pass. Stay on PCF |
| shadows not rendered during `compileAsync` (r186 #33924) | | | why our `-warm` groups count as movers (FALCON_STUTTER) |

r187 release notes (30 Oct 2026, shadow items): point-light seams #35267, "make shadows more node compatible" for
BatchedMesh #34829, shadow camera layers #34670, PCF bias with reversed depth #34892. **Nothing about caching or a
static/dynamic split.** That part we build ourselves, as we already did.

### Mr.doob's slop-newyork

- **Shadow map** (`js/lighting.js`):
  - SunLight with 2 cascades of 2048 px in a 4096 x 2048 atlas.
  - Far plane 220 m, growing with altitude to a 600 m cap.
  - The cascade cameras are pushed back up the sun for tall towers.
  - **No caching**: everything redraws every frame.
- **Stand-ins** (`js/scene-culling.js`):
  - Which casters: big static ones whose material has no alpha test, no transparency and no vertex-moving or depth
    nodes. A caster qualifies with `>= 8,000` triangles and a radius `> 350 m`, or by opting in with
    `userData.shadowStandIn`.
  - **Cells**: casters are cut into **500 m cells** (instances by position, triangles by centroid).
  - **The stand-in meshes**: one position-only mesh per cell and face side (an InstancedMesh for instanced sources).
    They share ONE black `MeshBasicNodeMaterial` ("a cell costs one draw").
  - **Layers**: the stand-ins go on **layer 3**, and every cascade camera has layer 3 enabled. The originals get
    `castShadow = false` (they still receive).
  - Stand-ins of one kind share one pipeline (`sharesPipelineWith`).
- **Contact shadows under cars**: a rounded-box SDF quad. We already took this (contact.js).

### Game practice: a moving sun over a mostly static world

- **Static/dynamic split with a cache** is the standard answer. Examples:
  - **Unreal's Virtual Shadow Maps** keep "two copies of depth, one for static and one for dynamic geometry"; the
    static invalidation count "should be near 0".
  - **Cyberpunk 2077's local lights** "split each shadow map into static and dynamic slices in order to cache as many
    meshes as possible".
  - **Insomniac's "CSM Scrolling"** (SIGGRAPH 2012) treats geometry still for ~5 s as static, caches it, scrolls the
    cache as the camera moves, and redraws only the non-static geometry. Our shifted lay-back is the same idea.
  - **Sundial** (three.js WebGPU, 2026-10) copies cached static depth back and draws only the movers. 40 moving casters
    cost ~0.05 ms vs ~0.37 ms to re-render everything, on an Intel Xe iGPU.
- **The moving sun is the cache's weak spot everywhere.** Unreal: "Any light movement or rotation will invalidate all
  cached pages for that light". Its moving lights use a lower resolution and ease back when the light stops. The
  answers fall into three groups:
  - **Step the light.** Redraw when the sun has moved enough, not every frame. This is the usual practice; it needs a
    fade or a small step so the edges don't jump.
  - **Spread the redraw over frames.**
    - Cyberpunk's **distant shadows** (4 levels, the last covering the whole 256 km² map) are "refreshed
      periodically, where rendering is spread over multiple frames … the shadow map is refreshed every few seconds",
      on a per-frame budget.
    - Near cascades stay per frame.
    - CryEngine's **cached shadows** render the far cascades once and re-render them on a trigger. The cost: dynamic
      objects in them don't update.
    - An Unreal forum thread warns that alternating heavy and light frames "feels worse than a steady lower frame
      rate". It recommends spreading the work as a subset of tiles each frame.
  - **Cull by sun angle.** Cyberpunk bakes, every 2 hours of game time, which meshes are completely inside other
    meshes' shadows, and drops them from the shadow pass at that hour: "millions" of triangles fewer.
- **Lower update rate for far cascades**: Cyberpunk (distant levels every few seconds) and CryEngine (cached far
  cascades). For us the equivalent is a second, low-resolution cached map for the far ring (flight, orbit).
- **Proxies and simplified casters**:
  - slop-newyork (above).
  - Cyberpunk swaps character meshes rendered into shadows on weaker machines.
- **Baked lightmaps**:
  - Fixed sun only. A moving sun can't use baked direct shadow (see "What baking can still give" below).
- **Screen-space / contact shadows**: Bend Studio's screen space shadows (Days Gone, 2019, first use for the sun)
  "complement shadow maps by capturing small details". three r187's `SSSNode` cites that work.
- **SDF / heightfield occlusion**:
  - Unreal's distance field shadows cover the distance past the cascades. They work "much more gracefully in the
    distance, doing shadowing work only for visible pixels", with any light direction. The fields are built offline
    for rigid meshes.
  - Our equivalent would be a **2.5D height texture of the city** (terrain + building heights, already in our data),
    ray-marched toward the sun for receivers beyond the shadow box. It is correct for any sun angle because the
    heights don't move.

### What baking can still give us with a moving sun

| baked | depends on sun direction? | status |
|---|---|---|
| ambient occlusion (crevices, under eaves) | no | **done for landmarks** (Blender AO lightmaps, `wrapAO`) + GTAO on screen |
| sky visibility / bent normals (how much sky a point sees: dims the sky fill in narrow streets) | no | not done; could extend the same Blender bake to tile walls, or ship a per-tile low-res "sky openness" texture (candidate, not ranked) |
| city height field (for far SDF / heightfield sun occlusion) | no (the march uses the live sun) | not done: option 6 below |
| which casters are hidden at each hour (Cyberpunk) | per hour, interpolated | not done: option 7 |
| direct sun shadow in a lightmap | **yes** | **impossible with a moving sun**. With a fixed preset hour it would work, but it would also lock out the day cycle and the dev panel's hour slider |

## 3. Ranked options

The gains are for the RTX 4050 laptop, at the street view or police drive unless stated. "Native" means three r187
gives it to us; "build" means our code.

| # | option | expected gain | risk | effort | native / build |
|---|---|---|---|---|---|
| 1 | **Sun-step cache for a moving sun** (first job, below): the cache key uses a STEPPED shadow-sun direction. The step is the angle at which the longest street shadow's tip moves ≤ 1 texel of the current box. Lighting (N·L, colour) stays continuous. Phase B, only if needed: the next step's cache is built over 4 frames (4 quadrant sub-cameras, the TileShadowNode pattern) into a 3rd texture, then crossfaded over ~0.5 s | **With the sun moving: from a 1.91 ms redraw every frame (estimate from code) back to ~0.5 ms average** (the fixed-sun figure plus a few redraws a second at a fast day speed). **0 with a fixed sun.** It is what makes a day-night cycle affordable | low in phase A (the shadow sun lags the true sun by < 1 step: invisible); medium in phase B (two maps sampled during a fade; +64 MB for the 3rd texture unless option 3 halves it) | A: S; B: M | build (ShadowNode subclass, ours) |
| 2 | **Shadow stand-ins** (PERF_RESEARCH idea 5, slop-newyork): per tile, the static opaque casters (walls, roofs, roof kit, flat roofs, bridges, landmark far shells) merged into 1-2 position-only meshes, one shared black material, layer 3. The shadow camera layers set to {0, 3}; the originals `castShadow = false` | CPU **-1..-1.3 ms on each redraw frame** (~150 -> ~30 objects x ~10 us; PERF_RESEARCH estimate). It flattens the 1.6 ms spikes and makes every redraw in option 1 cheaper. GPU: one vertex stream, one pipeline. Fewer shadow node builds at boot | medium: alpha-tested casters (trees, ivy, fences) stay real. A stand-in must fade with its tile (no popping shadow at a tile fade). Lamp layer tagging at night | M | build (layers are native) |
| 3 | **Map size and format A/B** (idea 7): 4096² -> 3072² or 2048² for the live map and the cache | VRAM **-64..-96 MB**; GPU **-0.5..-1.5 ms on redraw frames** (estimate: a quarter of the texels to clear and rasterise). Cheaper sampling | medium: a texel of 3.9 -> 7.8 cm at the 80 m box. The street look is the owner's call. The cache must stay depth32float to be copyable (or move the copy to a quad) | S | native settings |
| 4 | **Contact shadows `SSSNode`** for fine detail (maxDistance 0.3-1 m, quality 0.5, temporal on under the TAAU), then drop the smallest casters (kerbs, bollards, kit trims, window reveals) from the sun map | GPU +0.2-0.5 ms for SSS (estimate: one depth-only ray march at render resolution); minus whatever the dropped casters cost in redraws. **Mainly a look gain**: crisp contact under cars, sills and kerbs that a 3.9 cm texel blurs | medium: screen-space misses off-screen casters, and halos at depth edges. Needs a blur, per three's doc comment | S-M | **native** (r187 addon) |
| 5 | **Fewer redraw triggers**: today `fade` redraws every 3rd frame during a tile fade, and `refresh` every 30 frames for tree wind. Make tree-wind motion part of the movers (or accept it static: leaf shadows barely move at 3.9 cm), and redraw on a fade's start and end, not during it | redraw share ~11 % -> maybe 4-6 % (estimate) = **-0.1 ms average, and fewer 1.6 ms spikes** | low-medium: a fading tile's shadow must fade too (today it is redrawn as it fades). Check by eye while moving | S | build |
| 6 | **Far heightfield sun occlusion** for the flight and orbit views: a city height texture (terrain + building tops, ~2 m cells, ~20 MB for the loaded ring), ray-marched toward the live sun for receivers past the box's fade. It replaces growing the box to 300-400 m in flight | flight GPU: the sun shadow was **38-40 % of the GPU** in flight (perf/AUDIT.md, before the cache). A smaller box in flight plus a cheap march could save **~1-2 ms GPU in flight** (estimate) | medium-high: soft, blocky shadows from roofs and building edges at distance. The hand-over from map to march must fade (no seam) | M-L | build (TSL) |
| 7 | **Caster culling by sun hour** (Cyberpunk): offline, per tile and per 2 h, list the casters fully inside other casters' shadows; skip them | small for Uccle (low-rise; few casters fully hidden). It mostly matters for dense, tall cities | low | M-L | build (offline tool) |
| 8 | **Cascades (`SunLight`, 2 x 2048)** in place of our box | none on its own: both cascades redraw every frame, which is worse than the cache. Only worth it combined with a per-cascade cache (the far cascade cached and sliced, the near one cached plus movers): a larger rewrite of what option 1 + 6 give | high (re-does smooth-LOD work S1-S3) | L | native cascades, cache built |
| 9 | **Paged / virtual shadows (Sundial)** | its own iGPU numbers are 6.43 vs 7.08 ms for CSM 3 x 2048 (village). Our cache already gets the static/dynamic part. It is pinned to r186 internals | high (three internals, MIT third-party) | L | third-party |
| 10 | **Baked direct-sun lightmaps** | the shadow pass would be ~0 | **rules out the moving sun**; lightmap memory for a whole city | L | n/a |

Rejected: drawing the movers at half rate (30 Hz). A car's shadow would stutter against the car (the "no snapping"
rule). Night lamp shadows already do this only as the opt-in `alt`.

## 4. Visual trade-offs

- **Stepped shadow sun (1)**: the shadow lags the lit shading by less than one step. Edges move in ≤ 1-texel jumps,
  which the TAAU and the PCF penumbra hide. At a low sun and a fast day speed the step gets small, so the redraw rate
  rises. Phase B's crossfade swaps the jump for a 0.5 s blend, with a faint double edge during the blend.
- **Stand-ins (2)**: the shape is exact (same positions), so nothing changes if every opaque caster is covered. Risks:
  a stand-in left behind after its tile fades out (a ghost shadow), and one-sided casters (shadowSide).
- **Smaller map (3)**: softer, blurrier street shadows (railings, lamp posts, thin branches). This is the owner's
  call, from screenshots at 2 m / 45 m / flight.
- **SSS (4)**: crisp contact under objects and darker crevices in sunlight. Sun shadows may halo at silhouettes, and
  shadows from casters that are off screen are lost (that is why the map stays the base).
- **Heightfield far (6)**: far shadows soft and simplified, but present (today they fade out beyond the box).
- **Fewer triggers (5)**: tree-leaf shadows may hold still up to ~1 s longer while the wind moves the leaves.

## 5. First job: `sunstep`, the moving-sun cache (option 1, phase A)

One agent, 1-2 items. The switch is `?sunstep=old`, with a row in `viewer/features.js`. Lights are never added or
removed: the job changes only the shadow camera's direction and a cache key, and adds no lights and no new
materials at runtime. No buffers are created; DynamicDrawUsage is not touched.

**Step 0 (30 min, decides the job):** confirm the problem on a GREEN preflight, one city tab (browser.lock).
- Run the police spawn with the dev panel's sun speed at 60x, then at 1x.
- Read `sunCache.stats` (full / frames and the `key` count) and the shadow pass ms over 20 s, against the speed at 0.
- **Expected from the code**: `key` ≈ frames at any speed > 0.
- If redraws stay ~11 %, stop and record it.

**WHY** (for the rule doc): the static shadow cache keys on the light state. The sun direction went into the key
at full float precision (`toFixed(6)`, lighting.js:157), so any continuous sun motion invalidated the cache every frame
and silently undid the -2 ms of perfgame round 3.

**Rule** (`docs/rules/sun-shadow-step.md`): *a cached shadow keys on a QUANTISED light state. The quantum is derived
from the largest visible error (≤ 1 texel of the current box at the reference caster height), never from float
precision. The shading direction stays continuous; only the shadow camera steps.*

**The change** (lighting.js only):
- The shadow sun direction is a stepped copy of `sunDir`. It is re-stepped when the angle between them exceeds
  `θmax`, where:
  - `θmax = texel x sin²(elevation) / Href`, with Href = 30 m (the tallest street-scale caster) and the current box's
    texel;
  - θmax is clamped to [0.002°, 0.5°].
- At a fixed sun nothing changes (the same key as today).
- The shadow camera position (`update`, :626) and the cache key use the stepped direction. The light's colour and
  intensity, and `sun.colorNode`, use the live one.
- The stepped direction is snapped once at the box's quantised depth (SUN_QZ), so the shift lay-back stays exact.

**Automated checks** (a new row `sunshadowstep` in `tools/audit/mergeGate.mjs`):
1. **Node unit test** of the step function (pure, in its own module):
   - θmax rises with the box texel and with elevation, and stays inside the clamp.
   - A simulated day (06:00-21:00, Brussels, day 200) at 1x and at 60x gives a redraw count and a maximum shadow-tip
     error ≤ 1 texel at Href.
   - Thresholds: ≤ 1 redraw / 5 s at 1x for elevations > 15°; ≤ 25 % of frames at 60x.
2. **Text check**: the cache key in lighting.js does not format the live `sunDir`, `cam.matrixWorld` z column or
   `toFixed(6)` (it must use the stepped direction).
3. **Browser part** (quick mode, police spawn, 20 s, sun speed 60x):
   - `sunCache.stats.full / frames` ≤ 25 % (default) vs ≈ 100 % with `?sunstep=old`. The ratio is printed.
   - Shadow pass p50 under 0.6 ms.
   - No console or validation errors.

**Smoothness check** (the "smooth LOD, no popping" rule): at 60x, capture a 3 s strip at the Place Saint-Job (2 m
eye) and at the 45 m view.
- The per-frame diff of the shadow edge band must stay within the TAA noise of a still sun (the round 3 measure:
  ~0.2 % > 20), apart from ≤ 1-texel steps.
- If a step reads as a tick by eye, phase B (sliced build plus crossfade) becomes the next job, not a bigger step.

**Then**:
- `docs/PERF_GAME.md`: a line with the A/B numbers.
- The fixed city tour vs the baseline before merging (the city-tour-before-merge rule), plus the full merge gate.
  Fast lane is not enough: it changes the city-wide shadow.

**Second job** (after this one): option 2, shadow stand-ins (PERF_RESEARCH idea 5's gate row: shadow render objects
by `debug/drawBreakdown.js`, the redraw ms 1.91 -> target ≤ 0.8, a screenshot diff at the Place + the station). Option
3's map-size A/B fits in the same measuring session and is the owner's look call.

## Sources (fetched 2026-11-23 unless stated)

- three.js r187 source, local: `tools/worker/node_modules/three` 0.187.0, `src/nodes/lighting/ShadowNode.js` (updateBefore
  :797-830, updateShadow layers :667-716), `src/lights/LightShadow.js` (autoUpdate :148), `examples/jsm/lights/SunLightShadow.js`,
  `SunShadowNode.js`, `examples/jsm/tsl/shadows/TileShadowNode.js`, `examples/jsm/csm/CSMShadowNode.js`,
  `examples/jsm/tsl/display/SSSNode.js`, `src/nodes/lighting/ShadowFilterNode.js`.
- three.js releases (r185 01 Jul, r186 24 Sep, r187 30 Oct 2026): https://github.com/mrdoob/three.js/releases
- three.js docs: https://threejs.org/docs/pages/LightShadow.html ; https://threejs.org/docs/pages/SunLightShadow.html ;
  https://threejs.org/docs/pages/CSMShadowNode.html ; https://threejs.org/docs/pages/TileShadowNode.html (as cited in
  PERF_RESEARCH_2026-11, fetched 2026-11-22)
- Mr.doob slop-newyork: https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/scene-culling.js ;
  https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/lighting.js
- Sundial, paged sun shadows for WebGPURenderer (posted 2026-10-01, r186):
  https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912
- three.js forum, shadow `autoUpdate` for cached shadows (2024, WebGL era):
  https://discourse.threejs.org/t/when-three-js-version-bigger-than-164-the-shadowmap-cant-be-cache-this-leads-to-a-decrease-in-rendering-performance/67687
- Dybisz and Witanowski, "Shadows Optimizations in Cyberpunk 2077", SIGGRAPH 2021 Talks:
  https://history.siggraph.org/wp-content/uploads/2022/06/2021-Talks-Dybisz_Shadows-Optimizations-in-Cyberpunk-2077.pdf
- Acton, "CSM Scrolling", Insomniac, SIGGRAPH 2012 (summary via search; the slides' text could not be extracted):
  https://advances.realtimerendering.com/s2012/insomniac/Acton-CSM_Scrolling(Siggraph2012).pdf
- CRYENGINE, Cached Shadows: https://cryengine.com/docs/static/engines/cryengine-3/categories/1114113/pages/21267738
- Unreal Engine, Virtual Shadow Maps (caching, moving lights):
  https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine
- Unreal Engine, Distance Field Soft Shadows:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/distance-field-soft-shadows-in-unreal-engine
- Unreal forum, CSM caching / spreading cascades over frames: https://forums.unrealengine.com/t/csm-caching-repurpose/2683688
- Bend Studio, Inside Bend: Screen Space Shadows: https://www.bendstudio.com/blog/inside-bend-screen-space-shadows/
- Our docs: docs/PERF_GAME.md (round 3), docs/PERF_RESEARCH_2026-11.md (ideas 5, 7, Job C), docs/perf/AUDIT.md,
  docs/SMOOTH_LOD.md, docs/SLOP_NEWYORK_AUDIT.md.
