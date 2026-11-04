# Research notes: what we can reuse (2026-11-04)

Three read-only studies made on 2026-11-04, kept here so nothing is lost. The plan that uses them
is `docs/RENDER_PLAN.md`. Line numbers are as of that date; re-check before copying.
Rule: `game-engine-v1` is never edited; copy into `vendor/<name>/` with an `ORIGIN.md`.

---------------------------------------------------------------------------------------------------

## A. Mr.doob's "slop" cities

- Mr.doob's own city: **mrdoob/slop-newyork** (https://github.com/mrdoob/slop-newyork, demo
  https://mrdoob.github.io/slop-newyork/), pinned to three r187. Forks on his account by others:
  slop-egara (Terrassa, real DEM), slop-newyork-desurfofficial (gameplay), SlopSonora.
- Index of ~70 community cities: **zz85/slop-cities** (https://github.com/zz85/slop-cities, map
  https://zz85.github.io/slop-cities/map/). Includes **Leuven** (https://leuven.exe.xyz/,
  github.com/basteau/leuven.social). No Brussels.
- Key difference: slop-newyork **does not stream**. It builds the whole city at boot, compiles every
  shader behind the loading screen, then only rewrites instance buffers in fixed pools.

Paths are in slop-newyork unless noted.

### Shader compiles / streaming
- Few shared materials with style values as `uniform()`s: `js/tsl-materials.js` 204-206, 710-728
  (curtain-wall cache), 896-898 (pre-war cache). Per-building values in vertex/instance attributes:
  `js/building-footprints.js` 22-100, `js/boroughs.js` 1830-1878 (`bInfo`, `bTint`).
- Boot precompile: `js/main.js` 603-676. One empty frame first (sets MSAA/depth), then
  `setRenderTarget(scenePass.renderTarget)` + `setMRT(sceneMRT)` so the pipelines match; 16 parallel
  `compileAsync(obj, camera, scene)`, grouped by material, frustum culling off.
- Shadow warm-up frame: `js/main.js` 727-746 (one representative per pipeline,
  `userData.sharesPipelineWith`: `scene-culling.js` 138, `trees.js` 1214-1220,
  `building-footprints.js` 96-98), then `device.queue.onSubmittedWorkDone()`.
- Fixed pools instead of new meshes: `js/buildings.js` 500-653, 686-706 (quadtree query in 560 m, restream
  after 18 m of movement, `addUpdateRange`). Empty pools keep one invisible degenerate instance
  so their pipeline exists: `traffic.js` 1865/2408, `pedestrians.js` 980, `fire-escapes.js` 321.
- Fixed light count: 28 SpotLights parked at intensity 0 (`buildings.js` 669-680, 843+) and
  `ClusteredLighting(256,32,28,48)` (`main.js` 89).
- Leaf atlas: `trees.js` 181-316, coverage-preserving mips 322-380 (built once at boot).

### Glass / aliasing
- Box-filtered window grids: `tsl-materials.js` 143-162 (`filteredPulse`, `boxCoverage`),
  116-141 (`lineAA`, `gridLine`); footprint `fwidth(gridU/V)` ~481. Sub-pixel windows fade to their mean.
- Analytic reflections, not sharp PMREM: curtain wall 765-800 (sky gradient uniforms, fake reflected
  towers with fwidth edges, Fresnel `pow(1-|v·n|, 2.1)`, clamped sun highlight power 48). Roughness 0.05-0.14.
- Bump fade: 840-856, 1137-1147. `bumpNormal` (surface gradient, 104-113) times
  `1 - smoothstep(18, 140, camDist)` and `1 - smoothstep(0.03, 0.1, fw)`; edges ramp over ≥ 2 px.
- Distant lit windows: `distantWindowLight` 164-187; far facades in `boroughs.js` 991-1026.
- Stable facade frame: axis chosen in the vertex shader, flat varying (208-215).
- SSR limits: `main.js` 223-255 (half res, roughness < 0.75, fade 180-360 m).

### Draw calls / culling
- **`js/scene-culling.js`** (362 lines, the most reusable): city-wide instanced meshes cut into
  250-600 m cells sharing geometry and material (`chunkInstancedMesh` 75-127); cell hidden beyond
  `size × 1100` clamped 300-2000 m, ×3 for emissive (16-20, 186-199); position-only **shadow proxies**
  in 500 m cells on layer 3 (shadow cameras only), one black `MeshBasicNodeMaterial` per side;
  originals stop casting (202-300+).
- One merged mesh per 1 km cell for footprints (`building-footprints.js` 22-100);
  `batchStaticGroupMeshes` (`city-grid.js` 180-224).
- Trees: 3 LODs + crown cards with hysteresis, 105 / 420 / 950-3000 m, 200 m cells
  (`trees.js` 806-815, 1180-1210), `matrixAutoUpdate=false` (1222-1227).
- Road paint chunked, culled beyond 1.65 km (`road-paint.js`).
- No BatchedMesh, no THREE.LOD, no impostors, no glTF/KTX2/meshopt/Draco.

### Memory
- Almost no textures (procedural TSL). Data as gzipped binary + `DecompressionStream`
  (`building-geodata.js` 5-10). `storeMultisampledColorBuffer=false` (`main.js` 219-222).
  2 shadow cascades in one atlas, 3072 px if a 6144 texture is supported else 2048 (`lighting.js` 191-196).

### Look
- `SkyMesh` with clouds, `colorNode` recalibration, reversed-depth vertex fix (`lighting.js` 143-180);
  `PMREMGenerator.fromScene` reusing one target (233-245).
- Aerial perspective fog: `scene.fogNode` sampling `pmremTexture(env, horizonDir)` + exponential
  height fog (210-231).
- `SunLight` addon, 2 cascades, shadow far 300 m growing with altitude to 720 m (186-200, 290-300);
  HemisphereLight bounce.
- `canyonSkyAONode` street-canyon AO from world height (`tsl-materials.js` 186-201).
- Post: `pass` + `mrt({output, normalView, metalRough})` -> SSR; bloom at half res, radiance clamp 8;
  ACES; per-time-of-day exposure/contrast/saturation/bloom presets (`post-processing.js` 19-88).
  `reversedDepthBuffer:true`, `setPixelRatio(1)`, far plane 60 km.
- Night: one `uInteriorGlow` uniform drives all emissives; interior mapping 2-3 bays wide with drapes
  (`tsl-materials.js` 216-410).
- slop-egara terrain: Int16 DEM in cm (`terrain.js` 13-40), `drapeGeometry` (578-590),
  `buildTerrainTiles` (592+), ~80k instanced generic far buildings (`surroundings.js` 32-55).

---------------------------------------------------------------------------------------------------

## B. game-engine-v1 (owner's engine, READ-ONLY) — `C:\Users\tibog\Downloads\game-engine-v1`

### Shader compiles (most of it measured in production games)
- `v3/render/parallelPipelines.js` — async pipelines while a window is open (16 pipelines 1.0 s -> 0.21 s).
  **Copied to `vendor/engine/`.**
- `games/shared-rts/pipelineWarmup.js` — `warmGamePipelines`, `awaitPipelinesQuiet`. **Copied.**
- `games/modular-road-v3/roadGame.js` 8545-8680 — compileAsync misses MRT/shadow variants; warming into an
  offscreen target does not count (pipelines keyed to target format); queue overlapping warm-ups.
- `games/thunderline/proto/kit/drive.js` 53-60 — keep the scene hidden until lights/MRT/shadow node are
  final; adding/removing/toggling a light recompiles every lit material.
- `games/thunderline/proto/kit/keepPipelines.js` — keep freed pipelines/programs so returning to an area
  does not recompile (r186 internals).
- `v3/render/instancePipeline.js` 70/82 `shareInstancePipeline`, `ATTRIBUTE_PATH_MIN=1025` — under 1024
  instances three writes the count into WGSL; pad past 1025 to share (41 -> 3 facade pipelines).
- `v3/render/serialCompile.js` (two compileAsync in flight crash on r187), `stableShaderNames.js`
  (stable WGSL names so Chrome's disk shader cache hits; `?buildlog=1`), `shadowBuildSharing.js`
  (opaque casters share one shadow build), `emptyDrawSkip.js` (skip count-0 draws),
  `sharedUniformOrder.js` (r187 fix), `desktop/main.cjs:18` (Electron GPU disk cache size).
- `v3/render/objects/rtsAtlasWorker.js` — canvas atlas on OffscreenCanvas in a worker (template for the leaf atlas).
- Rules docs: `games/shared-rts/PERF_RULES.md` (14 rules), `games/thunderline/PERF_AUDIT_2026_11.md`,
  `games/alg-rts/PERF_AUDIT.md` (measure GPU ms, not fps), `v3/WEBGPU_BEYOND_THREE.md`,
  `v3/OPTIMIZATION_INVENTORY.md`. Check tool: `games/shared-rts/perfCheck.js`.

### City code (`games/modular-road-v3`, the "Apex" city)
- `modularRoadCity.js` header: on WebGPU, BatchedMesh = one draw per visible instance (1150 vs 34
  instanced). Instanced is the default; only L0 casts shadows.
- `modularRoadCityFacade.js`: one material for all buildings, analytic relief, interior rooms,
  lit-window churn; aliasing note l.82 (each pattern fades to its mean below a cell per pixel);
  `glassRough: 0.18` (l.266); sun glint into bloom MRT (301-330); night params (457-495);
  shop light spill (~1921); normalNode sub-build pitfall (44-58).
- `modularRoadCityFacadeBaked.js` (spike): baked facade atlas + POM.
- `modularRoadCityStreets.js`: **`lampPool` l.881** — analytic street-lamp pools, 2 nearest lamps,
  ~30 ALU, no light objects; emissive add 1442-1460; `lampPoolFree` l.918 for cars/trees.
- `modularRoadCityLodView.js` (5 Hz LOD tick, 30 m margin); `modularRoadPassCull.js` (per-pass instance
  cull, shadow cameras test 4 side planes).
- Also: Roofs, Furniture (`createCityFurniture` l.623), Signs/RoadSigns, Markings, TreePreset,
  `modularRoadReflection.js` (planar wet-road reflection), `modularRoadHeadlightBeam.js`.
- Assets: `public/city-ads` (13 ads, 4×4 atlas), `public/city-signs`, `public/city-totems`.

### LOD / culling / impostors
- `v3/CULLING_LOD_SPEC.md` (rules R1-R10); `v3/render/culling/cpuCull.js` (`lodTier` l.34),
  `lodSettings.js:54`.
- Shadow-aware culling: `v3/render/culling/shadowCasters.js:45` (GPU), `v3/render/foliage/placedFoliage.js`
  248, 272-288 (shadow ground sphere).
- Impostors: `v3/render/foliage/octahedralCore.js` (`bakeAtlases` 206, `createImpostorMaterials` 399,
  `bakeColorAtlasFromObject` 757), `impostorBake.js:59`, `v3/render/trees/impostorFieldRenderer.js:29`.
- Mesh LOD: `v3/render/instancing/autoLod.js:44` (meshopt simplify), `tools/lod/autoLod.mjs`, `lodCheck.mjs`.
- `v3/render/staticInstanceBatch.js:42` (indirect batch); Hi-Z lab: `hizPyramid.js`, `gpuInstanceField.js`.

### Trees, grass
- `v3/render/foliage/treeLodRenderer.js:24`, `foliageLodRenderer.js:45`,
  `v3/render/trees/leafFieldRenderer.js:78` (GPU cull + indirect leaf cards, continuous LOD).
- `v3/render/foliage/alphaCoverageMips.js:66`, `v3/render/materials/alphaCutout.js:45` (alpha-to-coverage).
- Wind: `windTexture.js` l.78, `v3/render/instancing/plantSway.js`.
- Grass: `v3/render/grass/revoGrassSystem.js` (`precompile()` l.721), `hybridGrassSystem.js`,
  `v3/render/scatter/scatterField.js`.

### Sky, fog
- Firmament `v3/render/firmament/` (lab, forked from Sky Pro 2026-11-01: atmosphere, clouds with temporal
  resolve, cirrus, auto exposure with night EV, real sun/moon from date + latitude).
  Sky Pro `v3/render/skypro/` (frozen, in production).
- `v3/render/clouds/cloudShadowsLite.js`, `v3/render/fog/volumetricFog.js`, `games/shared-rts/fogBanks.js`.

### Roads
- `v3/roads` unchanged since our copy (`vendor/roads` is current).
- Not vendored: `v3/render/roads/wetRoad.js` (film + ponds, clearcoat, no textures), `asphaltSurface.js`,
  `laneRoadPaint.js`; `games/modular-road-v3/modularRoadMaterial.js` `roughAA` 904/1099;
  `games/thunderline/proto/kit/roadSurface.js:151` specular AA (fwidth(normal) -> roughness, cap 0.18).
- **No tram / grooved rail implementation anywhere.**

### Blender + assets (in production for alg-rts and Thunderline)
- `tools/blender/bkit.py` (kit library, procedural colour × AO baked to one atlas, Cycles GPU `--gpu`,
  `mipCheck`) + ~50 kit scripts (house.py, port.py, …).
- `tools/blenderKit.mjs` (per-part cache, merge, gates: size, coplanar, far-LOD shading).
- `tools/optimizeGlb.mjs` (resize, UASTC / ETC1S, normals UASTC, meshopt 16-bit positions).
- `tools/compressTextures.mjs` (+ `v3/render/textureLoad.js`, `v3/TEXTURE_COMPRESSION.md`).
- Checks: `glbInspect.mjs`, `glbCoplanarCheck.mjs`, `glbLodShadingCheck.mjs`, `facadeShaderSizes.mjs`, `shaderLint.mjs`.

### Glass, night, decals, post
- Speckle: specular AA, dissolve-to-mean, glass roughness ≥ 0.18, `v3/render/post/despeckleNode.js` (firefly clamp).
- Night: `v3/render/lighting/localLights.js` (clustered, pooled, never toggled; 128 lights +0.9 ms);
  `v3/render/post/purkinjeNode.js`; night EV in the sky exposure.
- Decals: `v3/render/decals/decalSystem.js`; `games/thunderline/proto/kit/carLivery.js`.
- Post: `v3/render/post/postFxPipeline.js` (N8AO, selective bloom MRT, TAAU, FXAA, grade),
  `v3/render/bloomMRT.js`; transparent surfaces wipe the emissive MRT -> `MaterialBlending` fix.
- Shadows: `games/thunderline/proto/kit/sunShadows.js` (static atlas once + 32 m live map, `textureLoad`, no samplers).

### Other
- Driving: `v3/play/modularRoadVehicle.js` (raycast, 1/120 s), `v3/play/gameCarMode.js`,
  `modularRoadBvh.js` + `roadBvhWorker.js`, `games/thunderline/proto/kit/arcadeCar.js`,
  `games/modular-road-v3/chaseCamera.js`, `gamepadInput.js`.
- Weather: `modularRoadWeather.js`, `modularRoadWorldRain.js`, `modularRoadRainLens.js`.
- Perf HUD: `games/shared-rts/perfHud.js`, `v3/render/gpuAbHarness.js`.

---------------------------------------------------------------------------------------------------

## C. three.js r187 (verified against the three@0.187.0 bundles)

### Cache keys (why shaders rebuild)
- `RenderObject.getCacheKey()` (three.webgpu.js ~5987-6110): `material.customProgramCacheKey()` (NodeMaterial:
  type + `getCacheKey()` of every assigned node slot), material properties (numbers as on/off), texture
  mapping/channel/sampler (not uuid), geometry attribute layout, instancing kind, `receiveShadow`,
  render-context `stateKey`, the lights node.
- `Node.customCacheKey()` returns `this.id` (three.tsl.js ~1463): graphs built per tile = new builds.
- **Plain JS numbers in a graph become WGSL constants** (our 2026-11-04 bug): use `uniform()`.
- Each `BatchedMesh` adds its matrices texture uuid to the key. InstancedMesh shares builds since r187 (#35007).
- Shadow pass: `renderer._getShadowNodes(material)` (~25912) builds per material with map/colorNode/mask/positionNode.
- `LightsNode.customCacheKey()` hashes each light's id and castShadow: a light added/removed/culled rebuilds all.
- `renderer.compileAsync(object, camera, targetScene)` (~23251): non-blocking since r184, `buildAsync`,
  16 pipelines in parallel (#34816). Since r186 shadow maps are not rendered during precompile.

### Draw calls, LOD
- BatchedMesh API (`addGeometry`, `addInstance`, `setGeometryAt`, `setColorAt`, `optimize`, …), r187 merges
  consecutive draws (#35259). No built-in BatchedMesh LOD. Example `webgpu_mesh_batch.html`.
- Indirect: `IndirectStorageBufferAttribute` + `geometry.setIndirect()`.
- Occlusion: `mesh.occlusionTest = true`, `renderer.isOccluded(mesh)` (`webgpu_occlusion.html`).
- **r187 experimental**: `MeshletDrawingPipeline` / `VisibilityBufferDrawingPipeline`
  (`three/addons/pipelines/`), GPU culling + meshlet LOD; static content in `BundleGroup`.
  Examples `webgpu_meshlets_city.html`, `webgpu_meshlets_instanced.html`.
- `THREE.LOD` exists; no official impostor example.

### Textures
- `KTX2Loader.setTranscoderPath().detectSupport(renderer)` after `renderer.init()`
  (`webgpu_loader_gltf_compressed.html`: KTX2 + meshopt). Meshopt decoder `examples/jsm/libs/meshopt_decoder.module.js`.
- `DataArrayTexture`, `CompressedArrayTexture` (`webgpu_textures_2d-array*.html`) for per-tile textures without per-tile graphs.
- `texture.mipmapsAutoUpdate` (r187). Watch `renderer.info.memory.programs`. `outputBufferType` option.

### Lighting, look
- `ClusteredLighting(maxLights, tileSize, zSlices, maxLightsPerCluster)` (r185, `webgpu_lights_clustered_city.html`);
  `DynamicLighting({ maxPointLights })` (uniform arrays, no recompiles; no shadow lights). `TiledLighting` removed r185.
- `CSMShadowNode`, `TileShadowNode`; static shadows `shadow.autoUpdate=false` + `needsUpdate=true`; VSM.
- Post: `RenderPipeline` (renamed from PostProcessing r183), `ao()`, `ssr()`, `ssgi()` (r181+), **`traa()`**
  (cure for glass/specular speckle, `webgpu_postprocessing_traa.html`), `taau()`, `temporalReproject` (r187).
- Fog: `rangeFogFactor`, `densityFogFactor`, `webgpu_fog_height.html`; `VolumeNodeMaterial`.

### Other
- GPU timing: `new WebGPURenderer({ trackTimestamp: true })`, `await renderer.resolveTimestampsAsync('render')`,
  `info.render.timestamp`. `renderer.inspector = new Inspector()` (r181+).
- `BundleGroup` (r169) for static content. `renderer.highPrecision` (not with InstancedMesh).
