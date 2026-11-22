# Perf research, 2026-11: what is left to win (frame time, loading, memory)

Desk study, 2026-11-22. Code and docs read on `claude/foundation` (ae17ba81); web sources fetched the same day. **Nothing
was measured in a browser**: every gain below is an estimate with its reasoning, and each idea names how to measure it.
Local file checks only (gzip ratios, GLB extension scan, three r187 source in `tools/worker/node_modules/three`).

Read with: docs/PERF_GAME.md (rounds 1-9), docs/perf/AUDIT.md (steps 1-15), docs/BOOT.md, docs/HEAP.md,
docs/perf/FALCON_STUTTER.md, docs/AGARGARO.md, docs/SLOP_NEWYORK_AUDIT.md.

## Where we stand (from our own measured docs)

- **Police drive**: main-thread CPU 9.3-9.8 ms, GPU 13-15 ms (TAAU, dynamic resolution holding 14 ms), 1 % low 25-26 fps,
  worst 50-67 ms (PERF_GAME round 3). Standing at the spawn: CPU 7.7-8.8 ms.
- **What the CPU frame is**: ~390 render objects (main ~240 + shadow ~150) at ~10-12 us each = most of it; this is three
  r187's per-object cost (bindings / node updates / draw encoding, one object-scope UBO per object, three issue #30560,
  still open). updateMatrixWorld ~1 ms, instance pools ~1 ms.
- **What the lag is now**: not the average but the spikes. Major GC pauses of 50-100 ms (the falcon flight allocates
  3-4.5 GB a minute, ~0.9 MB of JS objects a frame), GPU-process stalls when tiles or landmarks upload (150-450 ms,
  once 1.2-1.4 s), main-thread tile and landmark steps of 18-66 ms, single missed vsyncs.
- **Time to play** (GREEN, local server, warm caches): police 43 s, falcon 39 s, free roam 32 s. The cover takes 12-21 s:
  node builds (~640 fragment programs, ~880 materials) plus the start tile. The loader's hold is mostly the precompile
  queue.
- **All of those were measured on a LOCAL server.** The owner plays the Vercel site. A cold visit downloads ~110 MB
  before the cover (BOOT.md). That network time has never been in our numbers (see idea 1).
- **Heap**: 1.5-1.9 GB. The CPU copies were dropped after the GPU upload: -475 MB (HEAP.md).

## What we already do well (keep it)

| area | what | where |
|---|---|---|
| hitches | New pipelines are created async after the boot. 0 sync pipelines while playing. | viewer/asyncPipes.js |
| hitches | Play loader: it holds until the area is built (tiles, landmark jobs, pipelines, quiet frames), so there is no fill-in in front of the player. | viewer/loader/playLoader.js, main.js `areaReady` |
| shaders | Precompile queue. Compile flush in chunks under the loader. Staged landmark LODs (far LOD only at boot). Fade graphs shared (`fadeshare`). WGSL strings interned. | viewer/warmup.js, lodFade.js, wgslIntern.js |
| draws | Multi-draw indirect sets for the street kits. City tree pool (108+54 -> 9+4 render objects). Roof kit 45 -> 4 meshes. Lamp pool. Landmark and bridge far LODs in 1 draw. Police car 16 -> 5. Patrol cars 30 -> 2. | multiDraw.js, treesStylized.js, roofKit.js, farMerge.js |
| shadows | Static sun shadow cache: a redraw on ~11 % of frames, 0.33 ms instead of 1.91 ms. Casters only in the light frustum. Texel-snapped box. No shadow from small kit pieces past LOD0. | lighting.js (`sunshadowcache`) |
| GPU | TAAU + dynamic resolution (-3.5..-5 ms against native MSAA). AO, SSR and bloom at half the internal resolution. Foliage lit per vertex. Foliage takes sun + sky only. Ivy far LOD. Snow chunk LOD. | upscale.js, post.js, foliage/vertexLight.js |
| uploads | No DynamicDrawUsage (r187 re-uploads such buffers in every pass): static + update ranges. Fixed light count (never a shader rebuild). | memory rules, gate `meta` |
| streaming | Tile worker. Tile cache in the Cache API: a full tile reads back in ~0.5 s instead of 3-19 s. Distance unload. Content-hashed service worker: a return visit downloads 10 MB instead of 148 MB. | tileWorker.js, tileCache.js, tilePack.js, sw.js |
| memory | `heapdrop` CPU copies, `rosweep` stale render objects, `atlaskeep`, BC4 KTX2 AO maps, R8 SDF street-life atlas, meshopt decode in workers. | heapDrop.js, roSweep.js, aoTexture.js |
| loader | Compositor-only stills with Mr.doob's staged bar. Chunked early warm-up (GPU-process floods). The cover stays up until `onSubmittedWorkDone`. | viewer/loader/, BOOT.md |

**Tried and rejected (do not redo without a new reason):**
- `matrixWorldAutoUpdate` freeze: within noise (`?freeze=1`).
- `compilepar` > 1: three r187's precompile state is not re-entrant across our awaits.
- agargaro's libs: WebGL-only, or overwritten by r187's own BatchedMesh path (AGARGARO.md).
- One shared ground material: only ~0.2 ms for a large refactor.
- Persisting WGSL across visits: unsafe, `NodeBuilderState` points at live nodes.
- `pipepace` and `bootworker`: no gain.
- `landmarksearly` and `fadelast`: measured worse.

**A memory note to fix.** MEMORY.md "three.js expert repos" says "InstancedMesh2 HAS WebGPU now". Our own read
(AGARGARO.md, 2026-11-17) found it WebGL-only. The author wrote on 2026-10-21 that his WebGPU port is "significantly
slower than WebGL" for partial matrix updates (https://discourse.threejs.org/t/the-dawn-of-inadequacy/95624). Its latest
GitHub release says nothing about WebGPU (https://api.github.com/repos/agargaro/instanced-mesh/releases?per_page=5).
Treat the memory note as wrong until a release says otherwise.

## Top 15, ranked (gain x confidence / effort x risk)

Gains are estimates. The "why" column gives the arithmetic. The effort scale is S = one agent in under a day, M = 1-2 agent turns, L = several.

| # | idea | where in our code | expected gain (why) | effort | risk | how to measure | sources |
|---|---|---|---|---|---|---|---|
| 1 | **Compress the binary assets the live site serves raw.** Vercel compresses only allowlisted MIME types (JSON, JS, CSS, wasm, ...). `.glb`, `.bin`, `.u16`, `.f32` and `.ktx2` go out uncompressed. Pre-gzip them at build (`vercel.json` buildCommand, beside asset_hashes.mjs) and have sw.js fetch `path.gz` and answer with a `DecompressionStream('gzip')` body, so no loader changes. Run gltfpack/meshopt on the 15 GLBs that have no meshopt yet. | vercel.json, tools/asset_hashes.mjs, sw.js, models/cars/cars2.glb, models/stjob/stjob.glb, models/rail/*.glb, kits | **Cold live visit -40..-60 MB before the cover. On a 50-100 Mbit/s line that is -4..-9 s.** Measured here with gzip -9: stjob.glb 24 %, rail/stjob 30 %, gardens 19 %, cars2 44 %, observatory (already meshopt) 45 %, E4 buildings.bin 31 %, terrain.u16 56 %. There are 49 MB of non-meshopt GLBs > 500 KB, and the tile .bin/.u16 total 100 MB. A return visit is unchanged (service worker), but Cache Storage gets smaller if the compressed form is cached. | S-M | low: byte-identical after decompression, and `?sw=0` stays the plain path. Medium for gltfpack (node names, `COLOR_0` AO, quantisation: use `-noq`, keep names) | Live cold boot in a fresh isolated context (BOOT.md section 3): `netMB` and `cover` before / after. Locally: a node script sums the boot request list's bytes raw vs gz. | https://vercel.com/docs/compression ; https://github.com/zeux/meshoptimizer/blob/master/README.md (meshopt output is meant to be compressed further) ; https://raw.githubusercontent.com/mrdoob/slop-newyork/main/PORTING.md (his data ships as `.bin.gz`) |
| 2 | **Cut per-frame JS allocation (the GC spikes).** Run an allocation-sampling profile (CDP `HeapProfiler.startSampling`) of the police drive and the falcon flight, then remove the top sources. One known source: the exposure meter's `readRenderTargetPixelsAsync` (~48 KB) most frames. Throttle it from our side (lighting.js `hazeHook`), every 4th-8th frame with a smoothed value, because vendor/ is read-only. | lighting.js hazeHook, post.js renderScene, instanceStream.js, multiDraw.js cull lists, facades.js splitRoofs | **Major GC 50-100 ms pauses: 1-2 a flight -> ~0. Minor GC every 0.3-0.6 s -> every 1-2 s.** At ~0.9 MB/frame (FALCON_STUTTER round 2) the young generation fills several times a second. Halving the rate halves the minor GCs and delays the major ones. This is the "laggy" feel, not the average. | M | low | `debug/falconStutter.js` `allocMB` / `gcMB` / `gc` per minute, frames > 50 ms, p99. Police: `debug/gamePerf.js` drive 1 % low. | https://github.com/mrdoob/three.js/releases (r187 #35120 "Avoid cache key allocations in `_update()`", same disease inside three) |
| 3 | **One indirect-args buffer for all our indirect draws.** Chrome/Dawn on D3D12 (our Windows laptop) validates indirect draws with a compute dispatch per indirect buffer. Toji measured ~3 ms of a 6 ms pass for 412 indirect draws, ~10 us after the args were packed into one buffer. We create one `IndirectStorageBufferAttribute` per multi-draw set, per cell-culled tile mesh, per grass / plants LOD and per flock. r187 `setIndirect(attr, offset)` already takes an offset into a shared attribute. | multiDraw.js:147, cellCull.js:56, foliage/grass.js:234, grass/grass.js:146, foliage/plants.js:165, birds/skyFlocks.js:78 | **GPU -0.3..-2 ms a frame IF validation shows in our trace.** The scaling is Toji's (per buffer, D3D12). We have tens of indirect buffers in each of 2 passes. Unverified for us: count them first. | S (count) / M (pool) | medium: the args offsets, growth of the shared pool, cellCull / multiDraw re-lay | A hook on `GPURenderPassEncoder.drawIndexedIndirect` counts distinct buffers a pass. GPU ms at the stjob street view in `debug/groupBench.js`, `?indpool=old` A/B. A Chrome trace with the gpu / dawn categories for the validation dispatches. | https://toji.dev/webgpu-best-practices/indirect-draws ; https://threejs.org/docs/pages/BufferGeometry.html (setIndirect offsets) ; https://threejs.org/docs/pages/IndirectStorageBufferAttribute.html |
| 4 | **Shared node builds for the landmarks' per-model materials.** About 264 hero materials are `wrapAO` clones: their AO texture + look uniforms, so each slot builds its own graph. That gives 15 glass_window / 15 stone_blue materials -> 10-13 programs each. Use r187 `NodeMaterialInstance` + `materialReference` (textures too), so one build serves every model, and do the same for the weather twin (BOOT.md "weak spots"). | the ~15 `*Model.js` loaders (wrapAO), materials/, weather/ | **Cover -1..-3 s, loader hold -3..-8 s.** Node builds are the cover's main-thread cost (2.8-3 s before the cover, more after: the 17-25 s hold is the compile queue, town hall alone 9.1 s). PERF_GAME round 4 counted ~100 removable programs. Each shared build also removes its fading and shadow variants. | M-L | medium: per-model shader features (streaks, moss, AO floors) must become uniforms or materialReferences, or the look changes | `?buildaudit=1` + `debug/buildAudit.js`: builds, repeats, ms before / after the cover. `debug/pipelineAudit.js` programs. `__playAt` police / falcon. | https://github.com/mrdoob/three.js/releases (r184 #33120 compile 3x; r187 #34821 release programs on cache switch) ; https://discourse.threejs.org/t/the-dawn-of-inadequacy/95624 (#33821: 10k unique materials 2100 ms on WebGPU vs 131 ms WebGL) |
| 5 | **Shadow stand-ins** (slop-newyork `scene-culling.js`). Per tile or 500 m cell, merge the static casters (walls, roofs, roof kit, bridges, landmark far shells) into 1-2 position-only meshes with ONE shared depth material, on a layer only the sun shadow camera sees. The originals get `castShadow = false`. | lighting.js sun cache redraw, facades.js:1014, roofKit.js, main.js loadTile | **CPU -1..-1.3 ms on the ~11 % cache-redraw frames (~150 -> ~30 shadow objects x ~10 us). GPU shadow pass cheaper** (one vertex stream, one pipeline). Fewer shadow node builds at boot: shadowshare already cut 346 -> 179, this goes further. Smooths the redraw frames, which are spikes. | M | medium: alpha-tested casters (trees, ivy, fences) stay as they are. LOD fades need the stand-in swapped with its tile's fade. Night lamp maps (they tag casters). | `debug/drawBreakdown.js` shadow render objects. `sunshadowcache` redraw cost (0.33 / 1.91 ms today). Screenshot diff of shadows at the Place + the station (TAA noise ~0.2 %). | https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/scene-culling.js |
| 6 | **BundleGroup for each tile's static layers** (terrain, roads, walls, roofs). In r187, a bundle that does not need re-recording skips culling and draw encoding. Each object then only gets `needsRefresh()`; when that says NONE there is no bindings or node update at all (three.webgpu.js `_renderBundle`, line ~23995). | main.js loadTile (the tile group), lodFade.js (bump `bundle.needsUpdate` on fades / LOD swaps), cellCull.js | **CPU -0.6..-1.2 ms** (40-60 static render objects in the ring x ~8 of the ~10-12 us saved). | M | **high**: projection is frozen at record time, so children need `frustumCulled = false` (more GPU) or a re-record when the camera crosses a cell. cellCull's per-pass `onBeforeRender` does not run on replay. Fades need a version bump. No occlusion queries inside bundles. | `debug/groupBench.js` CPU of the render loop with the ring tiles bundled vs not. Police drive CPU p50. drawBreakdown. Pixel diff. | https://threejs.org/docs/pages/BundleGroup.html ; https://github.com/mrdoob/three.js/releases (r185 #33839 InstancedMesh in bundles; r184 #33335) ; https://toji.dev/webgpu-best-practices/render-bundles |
| 7 | **Sun shadow map size and format A/B on a GREEN machine.** Today: one 4096² box ±150 m plus a **FloatType 4096² cache DepthTexture**, so 2 x 64 MB. Try 2048² (texel 7.3 -> 14.6 cm at ±150 m), or the r187 `SunLight` 2 x 2048 cascades (already `?sunlight=1`; Mr.doob's choice), and a 16- or 24-bit cache. | lighting.js:124 (cache), :284-317 (mapSize) | **VRAM -64..-96 MB. GPU -0.5..-1.5 ms on redraw frames** (a quarter of the texels to rasterise and clear). The shadow pass was 26-40 % of the GPU before the cache. Sampling is also cheaper with a smaller map (cache hits). | S | medium: the look (shadow sharpness at street level) is the owner's call. | groupBench GPU A/B, `renderer.info` memory (r184 Memory tab). Screenshots at 2 m / 45 m / flight. | https://threejs.org/docs/pages/SunLightShadow.html ; https://threejs.org/docs/pages/TileShadowNode.html ("UnsignedShortType halves the memory") ; https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/lighting.js |
| 8 | **Fetch priority on the cover's critical path.** The start tile + its ring (worker fetches) get `priority: 'high'`. Far landmarks, far tiles, Christmas, interiors and sounds get `'low'`. Today the worker's ~3 MB start tile competes with ~100 MB of other downloads on a cold visit. | tileData.js / tileWorker fetches, the landmark loaders, bootGate.js | **Cold live visit: first tile -1..-4 s** (inference: HTTP/2 shares bandwidth by priority, and today all `fetch()` calls default to High). Locally: 0. | S | low | Live cold `firstTile` / `cover` (bootSummary). DevTools network priority column. | https://web.dev/articles/fetch-priority |
| 9 | **Service worker for the code too, by content hash**, plus `modulepreload` for the static import graph. `viewer/*.js` (~450 modules) is served `max-age=0, must-revalidate` and the SW skips it, so every load revalidates ~450 files along the import waterfall. | tools/asset_hashes.mjs (drop the `viewer/*.js` exclusion), sw.js, viewer/index.html | **Return visit -0.3..-1.5 s to the renderer stage on the live site** (~450 conditional requests and a dependency-depth waterfall at the live RTT). Cold visit: modulepreload flattens the waterfall. | S | low-medium: the hash list is fetched no-store every load, so stale code only appears if the list is wrong. `?sw=0` stays the plain path. | Live `__loader.times` data -> renderer stage, request count in the network log. | https://vercel.com/docs/headers/cache-control-headers ; https://web.dev/articles/fetch-priority |
| 10 | **Pace GPU uploads by bytes per frame** (the GPU-process stalls). Tile and landmark buffers and textures are created + written in one task when they land: 22-92 MB `createTexture`, 64 MB `writeTexture` in one window (BOOT.md). Give a budget (~8-16 MB a frame) through `renderer.initTexture()` and staged geometry first-use, and slice the disposals (buffer destroys) too. | main.js loadTile landing, landmark loaders, roSweep.js | **Spikes 150-450 ms (and the 1.2-1.4 s stalls) -> < 50 ms while streaming.** AUDIT step 1 traced the 333 ms frame to ONE GPU-process task during an upload burst, not to the main thread. | M | medium: an object must not show before its buffers are in. Use the async-pipeline "skip until ready" path. | `debug/perfRun.js` flight (frames > 50 ms). Trace with the gpu category, `tools/perf/trace_frames.py --gpu 100`. | https://threejs.org/docs/pages/Renderer.html (`initTexture`) ; https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync |
| 11 | **Landmark GLB build off the main thread / in slices.** One 0.55-0.68 s task 1-1.5 s after the reveal is the first deferred landmark's GLTFLoader parse + material setup on the main thread (meshopt decode is already in workers). Parse the GLB JSON + build the geometry in a worker (transferables), and set up the materials in slices. | stpierreModel.js, townhallModel.js and the other `*Model.js` | **The 0.55-0.68 s post-reveal task -> 3-5 x < 50 ms.** It also helps the falcon flight (staged near LODs land mid-flight). | M | medium (per-loader) | bootSummary "20 s after the cover: long tasks, max"; falconStutter long frames | https://github.com/gkjohnson/three-mesh-bvh (worker BVH pattern: `GenerateMeshBVHWorker`) |
| 12 | **Conservative street-level occlusion culling** for the cell-culled tile meshes and multi-draw chunks. Uccle is 2.5D: rasterise the building blocks' footprint heights into a coarse horizon or depth buffer in `cellCullWorker.js` (a CPU "occlusion horizon", as in driving-through-a-city work), then cull the cells fully behind it. | cellCullWorker.js, cellCull.js, multiDraw.js chunks | **Street level: GPU -1..-3 ms, draws -20..-40 %** (the scene pass is 51-81 % of the GPU, and at street level most blocks behind the first row are hidden). Gain is ~0 from the air. | L | medium-high: it must be conservative (one frame late = popping, against the smooth-LOD rule). Needs hysteresis + a margin. | groupBench at the street views, drawBreakdown, a pop check while driving (the city tour) | https://docs.vtk.org/en/latest/release_details/9.4/webgpu-occlusion-culler.html (Hi-Z in WebGPU compute) ; https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_occlusion.html (three's per-object queries, one frame late) |
| 13 | **The compile flush's extra city passes.** Each chunk under the loader draws the whole city pass again (round 9 "left" 3): 0.9 s chunks cost +1.3..3 s. Draw only the chunk's holder into the pass's target + MRT layout. | warmup.js flushJobs | **Loader hold -1..-3 s** (round 9 numbers) | M | low-medium: the MRT and pass layout must match what the real frame compiles, or the pipelines differ. | `__flushes[i].chunks`, `__playAt` | (ours: PERF_GAME round 9) |
| 14 | **Upload the KTX2 mip chains without keeping them, and check the street-life / grass GPU buffers** (memory). Compressed textures keep `mipmaps` after upload (~45 MB, HEAP round 9). Grass storage 21 MB, night index buffer 9 MB. Also cap the tile cache's footprint per tile (37 MB a record). | aoTexture.js, interior KTX2 arrays, heapDrop.js (`ktxdrop` exists: check its coverage) | **Heap -30..-60 MB** | S | low: every texture dispose / version-bump path must be checked first (HEAP.md rule) | `debug/heapAudit.js`, heap snapshot via `tools/perf/heapsnap.mjs` | https://github.com/mrdoob/three.js/releases (r187 #34919 "Clear texture update ranges after upload") |
| 15 | **Track three r188+ for the per-object UBO fix** (#30560: one object-scope UBO per render object, bound + updated every frame). The `Object3D.static` skip is still commented out in r187's `RenderObject.needsUpdate` (line ~6179 here). When it lands, mark the tile / landmark meshes static. | tools/worker/node_modules/three, the importmap pin (0.187.0) | **CPU: possibly -2..-4 ms** (most of the ~10-12 us per object is bindings + node updates). A watch item, not a job yet. | S (when released) | medium (upgrade) | the police drive CPU p50, render objects unchanged | https://github.com/mrdoob/three.js/issues/30560 ; https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904 |

**Why this order:**
- 1 and 8 act on the live site the owner plays and have never been measured.
- 2, 10 and 11 are the spikes the owner feels as "lag".
- 3 is cheap to check and could be large on D3D12.
- 4 is the biggest loader lever left, but it touches looks.
- 5-7 shave the average.
- 12 is the big GPU item at street level, but L effort and LOD-popping risk.
- 15 is free when it comes.

**Considered, not ranked:**
- BatchedMesh in place of our multi-draw sets. On native WebGPU it issues one draw per instance (2026-10 benchmark: 1,001 render calls for 1k instances; https://discourse.threejs.org/t/three-js-plant-instancing-benchmark-240-desktop-samples-csv-json-and-a-standalone-harness/95719). Our `multiDraw.js` already does what it should.
- Rendering from an OffscreenCanvas in a worker: an L job, and the GPU process stays the bottleneck.
- `renderer.highPrecision`: not compatible with InstancedMesh.
- Sundial paged shadows (https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912): our static cache already gets most of that.

## First 3 jobs (one agent each; switch-guarded `?x=old`; a row in viewer/features.js)

### Job A: compressed binaries on the live site (idea 1, loading)

> **Done differently (claude/assetgz, 2026-11-22; rule docs/rules/asset-compression.md).** Measured live: Vercel DOES
> compress glb / bin / u16 / json (brotli on the fly, about level 3); only KTX2 / images / wav go raw, and ours are
> compressed inside (all 113 KTX2 are zstd). gzip-9 would have saved ~2 %. Shipped instead: brotli-11 `<file>.br`
> siblings from the Vercel build, taken by sw.js only after a content-hash check (-24..-37 % on those types; cold
> boot before the cover 118 -> 96 MB on a local 50 Mbit/s stand-in). The cold boot is 64 % KTX2 bytes (92 of 145 MB),
> and 40 GLBs (56 MB) have no meshopt: those are the next download levers.

- **Do:**
  - In the Vercel build step (`vercel.json` buildCommand), gzip -9 every hashed file of type
    glb / bin / u16 / i16 / u8 / f32 / dat / ktx2 over 32 KB into a `.gz` sibling. Use node zlib, in the same script
    that writes asset_hashes.json, and record `gz: true` per entry.
  - In sw.js: for an entry with `gz`, fetch `path.gz?__h=` and respond with
    `new Response(res.body.pipeThrough(new DecompressionStream('gzip')), { headers: <original content-type> })`.
    Cache the compressed response, so Cache Storage also shrinks.
  - The page and the worker change nothing. With `?sw=0` or no list, the plain files are served as today.
  - Optional second step: gltfpack the 15 non-meshopt GLBs with names kept and no quantisation. Only after a mesh_audit and
    contact check per model.
- **Check first:** whether the first visit's requests are SW-controlled. `clients.claim()` is in place. The tile worker
  is created after the claim? Count `viaServiceWorker` in bootSummary on a cold visit.
- **Gate row `assetgz`** (tools/audit/gate.d/assetgz.mjs, node, no browser):
  - Run the build script into a temp folder.
  - Every eligible file has a `.gz` whose gunzip is byte-identical (hash).
  - The summed bytes of the boot set (data/tiles/E4 + ring, the landmark GLBs, kits) shrink by >= 40 %.
  - sw.js answers a fake `gz` entry with the decompressed bytes. Test the fetch handler with a stub `caches` / `fetch`
    in node 22, which has DecompressionStream.
- **Measure (browser, live deploy):** BOOT.md section 3. A cold isolated context, `netMB` and `cover`, 2 runs each with `?gz=old`
  and default. Expect -40..-60 MB and -4..-9 s on the owner's line.

### Job B: per-frame allocation diet (idea 2, the lag spikes)

- **Do:**
  - Add `debug/allocSample.js`, or a node CDP script under tools/perf/: `HeapProfiler.startSampling` for 40 s of the
    falcon flight and 40 s of the police drive, dumped as the top-30 allocating functions with bytes per frame.
  - Fix the top 3-5 our side, for example:
    - the exposure meter readback (lighting.js hazeHook: every 4th-8th frame + a reused target, the meter value eased);
    - closures / arrays per frame in instanceStream gather, multiDraw cull lists, the drive HUD, minimap.
  - vendor/ is read-only, so wrap it, do not edit it.
- **Gate row `allocrate`:**
  - A text check: no `readRenderTargetPixelsAsync` from the per-frame path without the throttle.
  - The browser row: `debug/falconStutter.js` `allocMB` per minute <= 50 % of today's 3.5 GB/min, and `gc` drops
    > 300 MB = 0 in a 60 s flight. GREEN preflight, best of 2.
- **Measure:** falconStutter over50 / p99 / gcMB, and the police drive 1 % low (gamePerf.js), before and after, alternated.

### Job C: count, then pool, the indirect buffers (idea 3, GPU)

- **Step 1 (30 min, decides the job):** `debug/indirectCount.js`. Wrap
  `GPURenderPassEncoder.prototype.drawIndirect` / `drawIndexedIndirect` and count draws and DISTINCT buffers per
  pass at the stjob street view and in the police drive. Take one Chrome trace with the `gpu` and `dawn` categories,
  looking for indirect-validation dispatches. **If there are fewer than ~10 distinct buffers a pass, stop and record the
  numbers.**
- **Step 2:** `viewer/indirectPool.js`: one growing `IndirectStorageBufferAttribute` (one GPUBuffer). Each user (multiDraw sets,
  cellCull, grass, plants, flocks) gets a slot range and calls `setIndirect(pool.attr, offsets)`. Growth re-lays all users
  once (rare, like the multi-draw regions). Behind `?indpool=old`.
- **Gate row `indirectpool`:**
  - A text check: `new THREE.IndirectStorageBufferAttribute` appears only in indirectPool.js (plus listed exceptions).
  - A node unit test of slot allocation, growth and free (no overlap, offsets 5-word aligned).
  - The browser part: indirectCount distinct buffers per pass <= 2.
- **Measure:** `debug/groupBench.js` GPU ms at the street + 45 m views, `?indpool=old` vs default, 6-10 alternated rounds.
  Expect -0.3..-2 ms if step 1 saw validation, ~0 otherwise.

## Sources (all fetched 2026-11-22 unless marked)

- three.js releases r181-r187 (compileAsync fixes, parallel compile #34816, render bundles + InstancedMesh #33839,
  occlusion fixes, SunLight #34221, #35120, #34919): https://github.com/mrdoob/three.js/releases
- three.js docs: Renderer (compileAsync, initTexture, isOccluded, highPrecision) https://threejs.org/docs/pages/Renderer.html ;
  BundleGroup https://threejs.org/docs/pages/BundleGroup.html ; LightShadow https://threejs.org/docs/pages/LightShadow.html ;
  SunLightShadow https://threejs.org/docs/pages/SunLightShadow.html ; CSMShadowNode https://threejs.org/docs/pages/CSMShadowNode.html ;
  TileShadowNode https://threejs.org/docs/pages/TileShadowNode.html ; BufferGeometry.setIndirect
  https://threejs.org/docs/pages/BufferGeometry.html ; IndirectStorageBufferAttribute
  https://threejs.org/docs/pages/IndirectStorageBufferAttribute.html ; KTX2Loader https://threejs.org/docs/pages/KTX2Loader.html
- three issue #30560 (UBO per render object): https://github.com/mrdoob/three.js/issues/30560
- WebGPU vs WebGL CPU, many meshes (r183): https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904
- mrdoob/slop-newyork: https://raw.githubusercontent.com/mrdoob/slop-newyork/main/PORTING.md ,
  https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/scene-culling.js ,
  https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/main.js ,
  https://raw.githubusercontent.com/mrdoob/slop-newyork/main/js/lighting.js
- gkjohnson: https://github.com/gkjohnson/three-mesh-bvh ; https://discourse.threejs.org/t/more-robust-three-mesh-bvh-and-batchedmesh-integration/96951 ;
  3DTilesRendererJS queues + LRU budget: https://raw.githubusercontent.com/NASA-AMMOS/3DTilesRendererJS/master/src/core/renderer/API.md
- agargaro: https://raw.githubusercontent.com/agargaro/instanced-mesh/master/README.md ; https://github.com/agargaro/batched-mesh-extensions/ ;
  https://threejs.org/examples/webgl_batch_lod_bvh.html ; https://discourse.threejs.org/t/the-dawn-of-inadequacy/95624
- jeantimex: no WebGPU culling repo found in this search (the tokyo `performance.md` lamp-light-map idea is already in
  docs/TODO.md).
- BatchedMesh vs InstancedMesh on WebGPU: https://discourse.threejs.org/t/three-js-plant-instancing-benchmark-240-desktop-samples-csv-json-and-a-standalone-harness/95719 ;
  https://discourse.threejs.org/t/batchedmesh-setmatrixat-delay-with-webgpu/89108
- Toji, WebGPU best practices: https://toji.dev/webgpu-best-practices/indirect-draws ; https://toji.dev/webgpu-best-practices/render-bundles
- Occlusion: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_occlusion.html ;
  https://discourse.threejs.org/t/renderer-isoccluded-returns-null-is-my-setup-correct/88356 ;
  https://docs.vtk.org/en/latest/release_details/9.4/webgpu-occlusion-culler.html
- Shadows: https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912
- Loading: https://vercel.com/docs/compression ; https://vercel.com/docs/headers/cache-control-headers ;
  https://web.dev/articles/fetch-priority ; https://github.com/zeux/meshoptimizer/blob/master/README.md ;
  https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md
- GPU limits and pipelines: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits ;
  https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync ;
  https://chromium.googlesource.com/chromium/src/+/HEAD/gpu/command_buffer/service/gpu_persistent_cache.cc
