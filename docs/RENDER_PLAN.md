# Render plan: best look at the lowest frame cost

Written 2026-11-04 after the first real-GPU check (RTX 40-series, Chrome 156, WebGPU) and a
read-only study of three sources: mrdoob/slop-newyork (+ slop-egara), the owner's
`game-engine-v1` (READ-ONLY, never edit it; copy into `vendor/` with an `ORIGIN.md`), and the
three.js r187 source and release notes.

## Measured baseline (2026-11-04)

| View | fps | worst frame | draw calls | triangles | GPU memory |
|---|---|---|---|---|---|
| Overview G4 | 60 (vsync) | 17 ms | 599 | 7.0 M | 400 MB |
| Saint-Job, night | 60 | 17 ms | 433 | 6.0 M | 401 MB |
| Walk, `ring=2`, settled | 60 | 17 ms | 413 | 6.2 M | 387 MB |

**GPU time per frame** (stats line, `viewer.gpuStats()` / `viewer.gpuPasses()`; RTX 40-series, 1562×823,
pixel ratio 1, default `ring=1`), 2026-11-04: overview 11.1 ms, Saint-Job close-up 10.0 ms, walk 7.4 ms.
Scene pass ≈ 75 % of it (8.8 ms overview); AO + SSR + bloom + grade ≈ 1.5–2 ms.
Cost per layer (frame-time drop when hidden, median): overview: features (trees, cars, lamps, wires)
−5.1 ms, terrain/ground shader −4.1 ms, buildings −1.4, far LOD −0.6, roads −0.1; walk: features
−3.7, buildings −1.5, terrain −1.0, roads −0.8. **Trees + ground shader ≈ 80 % of the GPU budget:**
the first targets for optimisation (tree LOD/impostors; cheaper ground noise, e.g. fewer octaves
far away). A mid-range GPU (2–3× slower) would be at or over 16.7 ms in the overview today.

**Terrain fixed the same day:** the "terrain" cost was not the ground shader but the 1 m grid
(500k triangles a tile, half the scene). meshoptimizer in the tile worker (5 cm error, borders
locked; far tiles 25 cm): terrain 3.0 M -> 0.64 M, far LOD 630k -> 309k triangles. GPU now:
overview 8.0 ms (was 11.1), close-up 9.3 (10.0), walk 7.3 (7.4). Next GPU targets: trees
(~4–5 ms), parked cars (784k triangles: proper LODs with the Blender car kit).

**Problem: 300–570 ms freezes while tiles stream in** (10 in the first 20 s of `ring=2`).
CPU profile: ~394 ms in `NodeBuilder.build` / `getNodeBuilderState` / `createRenderPipeline` inside
`renderer.render` (shader building on first render), ~170 ms in `createLeafAtlas` (trees.js, canvas 2D).

## Root cause found and fixed (2026-11-04)

The freezes were **not** JavaScript (only ~450 ms of node builds in 22 s) but the **GPU process**
compiling shaders (DXC on Windows, ~450 ms for a 40 KB fragment shader). Per-tile JS numbers were
written into the WGSL as constants, so every tile produced new shader text and recompiled:
`groundMaterial` (tile bounds, 33 KB shader) and `asphaltMaterial` (marking atlas scale/range,
41 KB). Both are now `uniform()`s. Result, `ring=2` walk: after boot, no frame over 100 ms
(was ~10 freezes of 450–600 ms); programs 101 -> 79.

**Rule: never bake a per-tile / per-object JS number into a TSL graph; use `uniform()` or an
attribute.** Check: hook `GPUDevice.prototype.createShaderModule` and confirm no shader is created
when a new tile streams in.

How it was found (reusable): count `createShaderModule` / `createRenderPipeline` per freeze, then
diff the WGSL of two same-size modules.

## Why freezes can happen (r187 rules)

- A render object's cache key includes the **lights node**: adding, removing or toggling any light
  rebuilds every lit material. (`lamps.js` adds its 6 PointLights on the main tile only, so it was
  not the cause; keep it that way: one fixed pool, never per tile.)
- Node materials share a build only when they use the **same node objects**. `texture(tileTex)`,
  a fresh `uniform()` or `Fn()` per tile = a new build per tile. Plain material properties
  (`.map`, `.color`, `.roughness`) only enter the key as on/off, so per-tile textures go there.
- `compileAsync` does not render shadow maps (r186+), and pipelines are keyed to the render
  target format: warm up on the **real canvas** (game-engine-v1 `roadGame.js` 8545–8680 lesson).
- Two `compileAsync` in flight crash on r187: queue them (game-engine-v1 `v3/render/serialCompile.js`).
- InstancedMesh under 1025 instances bakes the count into WGSL (own pipeline each); pad past
  1025 to share (`v3/render/instancePipeline.js`).
- One BatchedMesh per tile = one build per tile, and on WebGPU it issued one draw per instance
  in game-engine-v1's measurement. Avoid.

## Phase 1: no freezes (before the Vercel deploy)

1. [x] Per-tile constants in ground / asphalt shaders -> uniforms (see above). The main fix.
2. [x] Boot warm-up (`viewer/warmup.js`, machinery copied to `vendor/engine/`): parallel async
   pipelines while a cover hides the canvas; the main tile, one neighbour and the first far tiles
   load under it (the first material built emits its shared TSL functions in another order than
   later ones, so a neighbour is needed to get the "later" WGSL); 2 frames with every drawable
   forced visible; wait for 12 quiet frames. Result: cover lifts at 2.1–2.7 s, **no shader compiled
   after it, worst frame 50 ms** (default and `ring=2`, cold cache). `?warmup=0` = old boot.
   Gotcha: warm only after the per-frame updaters ran a few frames (tree LOD state), or the
   restore hides the trees.
   Left: `keepPipelines.js` if unloading and returning to an area recompiles.
3. [ ] Remaining 100–200 ms main-thread slices per tile (tree field build, features).
   Optional: share ground/asphalt material instances to cut the ~10–25 ms CPU node build per tile.
4. [ ] Leaf atlas built once in the worker on an OffscreenCanvas (`v3/render/objects/rtsAtlasWorker.js`).
5. [ ] Target: no frame over 33 ms walking with `ring=2`.

## Trees (2026-11-04)

- `?trees=stylized` = game-engine-v1 fog-lab trees (`vendor/stylized-trees`, `viewer/treesStylized.js`).
  GPU vs default slop trees: overview 7.6 vs 8.0 ms, close-up 10.4 vs 9.3, walk 9.3 vs 7.3.
  Fog-lab LOD distances (150/450/1600 m) cost 14.8 ms in walk; street-level 40/120/900 m fixed most.
- In walk the leaf cards cost ~4.9 ms (their shadows ~1.2 ms): big overlapping alpha-to-coverage
  cards near the camera (MSAA, discard, no early-z).
- Next: depth pre-pass for alpha-tested cards (game-engine-v1 PERF_RULES: cedars 19 -> 6 ms);
  **octahedral impostors** for the far LOD (`v3/render/foliage/octahedralCore.js`,
  `impostorBake.js`, `v3/render/trees/impostorFieldRenderer.js`); shadows from LOD 0 only;
  colours tuned to the city's palette (top colour #7cc63c reads lime next to the muted streets).
- **Owner chose the stylized trees (2026-11-04); now the default** (`?trees=slop` for the old ones).
- Done: depth pre-pass (adapter only: an instanced depth twin per leaf mesh, lit pass EQUAL depth):
  overview 7.6 -> 5.8 ms, close-up 10.4 -> 6.6, walk 9.3 -> 6.3, image unchanged; now cheaper than
  the slop trees in every view (8.0 / 9.3 / 7.3). Olive palette (#8aa64e / #27441d, tint 0.3).
  `?prepass=0` for A/B.

### Tree plan (from docs/RESEARCH.md section D, 2026-11-04)
Quick wins first, then the big one:
1. [x] Tight card shape: TRIED, REJECTED. An octagon fitted to the mask (54 % of the quad) cost more:
   overview 7.1 -> 8.2 ms, close-up 7.7 -> 9.2, walk equal (vertex-bound: many small camera-facing
   cards). Kept as `?cardoct=1`.
2. [x] Shadows from LOD 0 only: walk 6.3 -> 6.0 ms.
3. [x] Coverage-preserving mips (R8, rescaled per level): distant crowns stay full, ~+0.2 ms.
   Result after 1-3: overview 7.1, close-up 7.7, walk 6.0 ms.
4. [x] Octahedral impostors, our own (`viewer/impostors.js`; octahedral maths credited to game-engine-v1
   octahedralCore.js). The bake stores the tree shader's INPUTS per view (albedo before tint + coverage;
   pad-dome normal + occlusion + leaf/bark flag), GPU-only straight into one 2048x3072 atlas pair for all
   6 variants (8x8 views, 128 px cells), 69 ms at boot; the impostor runs the leaves' lighting live (sun,
   sky, shadows, translucency, fill, per-tree tint) so it follows the time of day. One instanced quad
   mesh + one shader per tile; real trees stop at 90 m (`?impstart=`, `?impostors=0`).
   GPU: overview 7.1 -> 6.7 ms, close-up 7.7 -> 7.4, walk 6.0 -> 5.5. Starting at 60 or 45 m is slower
   (impostor fragments: 8 texture taps + lighting). Gotcha: bake viewport rows count from the top, so
   the atlas lookup flips the image inside each cell (found by eye: upside-down trees).
   Then fixed against hollow crowns (owner's report): weights renormalised over views inside their cell,
   coverage = union of contributing views, alpha raised with the mip level (clamped: fwidth can be
   infinite -> NaN -> opaque black squares), each view sampled where the VIEW RAY meets its plane
   (Brucks) instead of a projection of the billboard point.
   **Then turned OFF by default (`?impostors=1`)**: side by side, zoomed on 150-400 m from Saint-Job,
   the real trees were sharper and better lit, the impostors blurrier with some smeared crowns, at
   the same GPU time in that view (6.43 vs 6.44 ms). Revisit for the whole of Uccle with 16x16 views,
   a depth atlas (parallax), a 3-view triangle blend and a dithered crossfade.
5. [ ] Look: ground AO blob under each tree, crown-level AO gradient, translucency dimmed in shadow,
   per-pad hue jitter, 3-tier wind with world gusts.

## Sky: Firmament (2026-11-04)

- game-engine-v1's Firmament (`vendor/firmament`, unchanged; Tidewater MIT) is the default sky
  (`?sky=old` = the previous Preetham SkyMesh). Wired like the engine's lab: a DirectionalLight at
  intensity 1 whose colour is the key light x the cumulus shadow at the point, scene.environment =
  the sky's environment, exposure 0.55 (Tidewater units) x the look x the sky's eye adaptation
  (metered on our HDR scene target each frame). The presets are times of day on the real Brussels sun
  path (lat 50.8, `?day=` default 200 = mid July, `?hour=` solar time).
- GPU: overview 7.1 ms (= old sky), close-up 7.7 -> 8.8, walk 6.0 -> 7.3.
- Gotchas found: (1) the fog must be set before any material compiles (set later, the far-LOD tiles'
  fog-less build lit them like daytime at night); (2) a PMREM lookup of the sky's environment never
  refreshes (re-rendered in place): the fog uses `sky.light().horizon` instead.
- Haze + sun shafts done: post.js renders the scene itself into an MRT HDR target (what `pass()` did),
  copies the colour to a single-target HDR frame, runs `lighting.hazeHook` on it (Firmament
  `postProcess` with the sun's own ShadowNode for the shafts, seaLevel 40 m TAW, then `meter`), then the
  chain (AO, SSR, bloom, grade). `?haze=0` off.
- **CPU bottleneck found the same day:** the stylized trees' instance buffers were DynamicDrawUsage, which
  three r187 re-uploads in EVERY render pass of every frame: writeBuffer was 38 % of the main thread,
  ~14 ms CPU a frame (46-54 fps). Static usage (they only change on a LOD re-bucket, which uploads via
  needsUpdate): 2.5 ms CPU, steady 60 fps; GPU close-up 7.5 ms, walk 6.6 ms with the haze.
  Rule: never DynamicDrawUsage for per-instance data that is not rewritten every frame.
- Next: the night look (nightEV, Purkinje); the tram clock driving the sun; then volumetric fog.

## Phase 2: cheap look fixes

- [ ] Glass speckle: box-filtered window grid that fades to its mean below a pixel
  (slop-newyork `js/tsl-materials.js` 116–162), specular AA (fwidth(normal) into roughness,
  game-engine-v1 `games/thunderline/proto/kit/roadSurface.js:151`), glass roughness ≥ 0.18; TRAA later.
- [ ] Wet / varied asphalt (`v3/render/roads/wetRoad.js`, `asphaltSurface.js`).
- [ ] Grooved tram rails (no existing implementation anywhere: new).
- [ ] Night streets too dark: analytic lamp pools in the ground/asphalt shaders, lamp positions
  in a shared uniform/storage array (game-engine-v1 `games/modular-road-v3/modularRoadCityStreets.js`
  `lampPool` ~l.881); skyglow ambient; emissive lamp glass in bloom.

## Phase 3: scale to all of Uccle

- [ ] Shadow proxies + per-cell distance culling (slop-newyork `js/scene-culling.js`).
- [ ] Tree impostors (`v3/render/foliage/octahedralCore.js`), coverage mips (`alphaCoverageMips.js`).
- [ ] Static shadows: `shadow.autoUpdate = false`, `needsUpdate = true` when a tile lands.
- [ ] If many real lights are needed: `ClusteredLighting` (r185+) with a fixed pool, never toggled.

## Phase 4: Blender kit

game-engine-v1 `tools/blender/bkit.py`, `tools/optimizeGlb.mjs` (UASTC/ETC1S KTX2 + meshopt,
16-bit positions), `tools/compressTextures.mjs`, `tools/lod/autoLod.mjs`. See `docs/BLENDER.md`.

## Not now

MeshletDrawingPipeline (r187, experimental), Hi-Z culling (−0.18 ms in the engine lab), Firmament
sky (lab only in game-engine-v1; Sky Pro is the production one).
