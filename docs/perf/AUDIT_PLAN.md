# Performance + optimisation audit: the plan (prepared 2026-11-13, run on a QUIET GPU)

Owner: "as soon as we make it a game it has to run smoothly with no lags"; "check Mr.doob or anywhere anything that
could make the best perf". This is the plan; nothing here is measured yet unless it says so.

## 0. How we measure (or the numbers are worthless)

- **Quiet machine:** no agent running, ONE Chrome tab (other WebGPU tabs, even in the background, skew GPU time; a
  background tab is throttled to ~1 fps, so the tab under test must be in front).
- **Scripted, repeatable paths:** the 85 s flight I6 -> E4 (`window.viewer` camera script, see the freeze
  diagnosis 2026-11-13), a street-level drive through Saint-Job + Alsemberg, a walk on the Place, the orbit overview.
- **What to record per path:** frame-time histogram (p50 / p95 / p99 / max), frames > 33 ms while moving (target 0),
  long tasks > 50 ms with their cause, GPU ms per pass (scene, shadow, post: `renderer.resolveTimestampsAsync`),
  draw calls, triangles, GPU memory, render pipelines created synchronously mid-frame (hook on
  `GPUDevice.prototype.createRenderPipeline` vs `...Async`: target 0 after boot).
- **The runner (ready 2026-11-13): `debug/perfRun.js`.** In the page: `const P = await import("/debug/perfRun.js");
  await P.suite({ rounds: 2 })`. Clock-driven camera paths (a slow frame never changes the route): `flight` (the 85 s
  freeze-diagnosis flight, 70 m up), `stjob` (street level: Avenue Carsoel, round the Place, down the Montagne de
  Saint-Job), `alsemberg` (street level, 1.8 km north to south across the D/E tiles), `turn` (360 deg on the Place),
  `orbit` (380 m out, 240 m up). Per path: frame histogram + p50/p95/p99/max + frames > 33 ms, long tasks, SYNC vs async
  pipelines with labels, GPU p50/p95 + per-pass ms, draws, triangles, GPU objects, JS heap. A hidden or throttled tab
  marks the run INVALID. Pass keys are r187 render-context uids (`r:<context>:<n>`, unnamed, stable in one page load):
  naming them shadow / scene / post is the first audit step.
- **A/B:** alternating rounds (A B A B ...), at least 4, report the spread; a change under the spread is "no change".
- **Two machines:** this GPU + a mid-range one (`?ring=1` default, `?ring=2`).
- **Budgets:** 60 fps at street level on this GPU (16.6 ms), 30 fps floor on mid-range; boot to first frame < 10 s;
  no frame over 33 ms while driving / flying, ever.

## 1. Stalls first (what the owner feels)

| # | Item | Known so far | Approach |
|---|---|---|---|
| 1.1 | Long freeze while driving / flying | FIXED 2026-11-13 (lamp lights per tile changed the light count -> ~72 sync pipelines). | Keep the device hook as a regression test in the flight script. |
| 1.2 | `ShadowMaterial_730` re-created synchronously every ~20 s | seen 4x in one flight | Find the variant that toggles (an object switching side / instancing / a cache eviction); create once. |
| 1.3 | Boot long tasks 3.2 s + 4.1 s | seen 2026-11-13 | Trace boot; split / move to the worker / precompile in parallel (Mr.doob: 16 parallel `compileAsync` + one shadow warm-up frame, `js/main.js:608-674`). |
| 1.4 | Tile streaming slices (trees ~147-350 ms, parked cars 52 ms, rails, furniture) | tile logs | Build in the worker as typed arrays; main thread only wraps buffers; slice to < 4 ms. |
| 1.5 | Hero shaders 12-40 s in the background | async, not a freeze | Fewer unique materials (shared library slots); prove no hero material compiles synchronously on first view. |
| 1.6 | GC pauses | unknown | Allocation profile on the flight; preallocate per-frame arrays (as done for the lamp pool). |

## 2. GPU time (biggest pass first: measure the per-pass split before touching anything)

| # | Idea | Source | Expected | Notes |
|---|---|---|---|---|
| 2.1 | Sun shadow: 2048 px tiles, far 220 m, altitude growth capped | Mr.doob `c8a904d` (`js/lighting.js:192-195`, "56 % less shadow texel fill") | big on the shadow pass | We have it behind `?sunlight=1` (smallfixes): make the default if the A/B agrees. |
| 2.2 | Small things don't cast sun shadows (kerbs, bollards, small kit pieces, markings) | `c8a904d` (`js/city-grid.js:1595`) | shadow pass | Check each: kerb shadow is invisible at the sun angles we use. |
| 2.3 | Skip faded-out detail with a branch instead of computing it and multiplying by zero | Mr.doob `91dc313` (roads), `95e455c` (sidewalks / kerbs), `f3635e7` (interior raycast only on glazed pixels) | fragment cost on roads / sidewalks / facades | Our new kerb joints and paving pattern (roads round 3, +0.3-0.4 ms) are the first target. |
| 2.4 | Per-part shader branching instead of one shader doing every part | `ab33d1b` | fragment cost | Facade kit's single shader (also blocked by the 16-texture limit). |
| 2.5 | Bloom at 0.35 resolution | `c8a904d` (`js/post-processing.js:50`) | post pass | Check our post chain (AO / SSR / bloom) resolutions one by one. |
| 2.6 | One shared terrain / ground material for all tiles (bounds as uniforms) | our TODO | fewer pipelines + draws | |
| 2.7 | The clouds look blocky at street level | seen 2026-11-13 | quality (+ maybe cost) | Firmament cloud resolution / upsampling. |

## 3. CPU + draw calls

| # | Idea | Source | Expected | Notes |
|---|---|---|---|---|
| 3.1 | `scene.matrixWorldAutoUpdate = false`, only moving roots updated | Mr.doob `js/main.js:206-215, 727-728` | -0.3-1 ms CPU (estimate, SLOP audit) | Streaming: update a tile's root once when it lands. MISSING in ours. |
| 3.2 | Chunk + cull big instanced sets by cell (trees, markings, lamps, cars, kit pieces) | Mr.doob `e35c06c` (cell-hierarchical tree culling), `997185d` (road markings), `c8a904d` thresholds (32 instances / radius 800 / 8k instance-tris) | fewer vertices + CPU | Our tree impostor kit is one draw for 60-120k instances: check what it costs off-screen. |
| 3.3 | **InstancedMesh2 1.0 (beta)** (agargaro, MIT; `@three.ez/instanced-mesh@1.0.0-beta.1`, npm 2026-11-04): per-instance frustum culling, dynamic BVH, LOD + shadow LOD, sorting, per-instance uniforms (`instancedUniform` TSL node), skinning / morphs | npm package README + BREAKING-CHANGES.md (read 2026-11-13; owner pointed at the WebGPU release) | draws + vertices + shadow pass | **Native WebGPURenderer + TSL supported** ("every feature on each renderer"). CATCH: three is a peer dependency pinned to **r186 (>=0.186.0 <0.187.0)** and the package patches the renderer (`installInstancedRenderer`, a render-cache-key patch): we are on **r187**. Test it in a lab on r187 first (trees, lamps, parked cars, kit pieces); if it breaks, ask / wait for r187 support rather than downgrading the city. Culling is on the CPU today; GPU culling / sorting / update are on its roadmap. Chromium note in its README: `writeBuffer` below 4 MiB is synchronous and costlier per byte (large partial updates can be slower than a full upload). Custom ShaderMaterial instancing not supported (we use node materials: fine). |
| 3.3b | **InstancedMesh2 beta vs r187, read on paper (2026-11-13)** | the 1.0.0-beta.1 tarball vs three r186 / r187 builds | decides the Perf Lab setup | It **refuses to start on r187**: `prepareInstancedRenderer` throws unless `renderer._isPreCompiling` is a boolean; r187 removed that flag (pre-compilation reworked into `_beginPreCompile()` + `_compilationPromises`). Everything else it patches exists in r187 and is wrapped, not replaced (`NodeMaterial.setupDiffuseColor` / `setupObserver` / `setupPosition`, `MaterialReferenceNode.setup`, `ShadowNode.updateShadow`, `nodes.getForRenderCacheKey`, `onBefore/AfterRender/Shadow`); the r186 -> r187 changes there (vertex-colour chain, shadow `matrixWorldAutoUpdate`, VSM moved) don't touch what the patches do, and the patches only act on InstancedMesh2 objects. **Perf Lab plan:** a 3-line shim (a `_isPreCompiling` getter on r187's pre-compile state) before `prepareInstancedRenderer`; prove shadows, shadow LOD, `compileAsync` warm-up and colour/opacity correct there. The city only once it is proven, or once upstream supports r187 (an issue to agargaro asking for r187 is the clean path). How it draws: CPU culling (linear or BVH) writes the visible ids into a draw-index buffer and sets `count`; instance data stays put (storage buffers on WebGPU) and small changes are scattered on the GPU instead of re-uploading. One dependency: `bvh.js`. |
| 3.4 | Facade kit: 62 street-level meshes / +80 draws -> merge rare piece types, per-slot multi-draw | fixes / kit notes | draws | |
| 3.5 | Instance matrices as vertex attributes, static usage, update ranges | Mr.doob `21f71bd` | have (cars, tram, trees) | Check the new systems (kit, tree kit, flags, pedestrians later) do the same. |
| 3.6 | Fixed pools (lights, cars, pedestrians) with a degenerate instance so pipelines exist | Mr.doob + our 2026-11-13 freeze | stalls | Rule: never add / remove lights at runtime. |
| 3.7 | Roads: triangles +20 % after round 3 | roads round 4 (running) | vertices | distance LOD for kerb / ramp detail, flat far roads. |

## 4. Memory + download

GPU memory budget per ring, texture sets (9 shipped = 24 MB GPU, 17 MB download), KTX2 everywhere, LOD GLBs with
meshopt, unload by distance with hysteresis, a loading indicator. Vercel: what the first visit downloads.

## 4b. The Perf Lab (owner 2026-11-13: test techniques cleverly, not by piling things into the city)

`labs/perf-lab.html`: one real tile's instanced content (its trees, lamps, parked cars, facade-kit pieces) loaded once,
the same scripted camera paths (drive, fly, turn on the spot), and switchable options per system: today's per-tile
culling / cell culling (Mr.doob's approach, our own code) / InstancedMesh2 1.0 beta (if it runs on r187). Per option:
GPU ms main + shadow pass, CPU ms, draws, vertices, in alternating rounds. The lab narrows the choice; the winner is
then checked ONCE in the real city with the scripted flight + drive (shadow distance and post costs only show there).
New tricks found later are tested there first.

## 5. Order of work

1. Measure the baseline (section 0) on the quiet machine: all paths, per-pass GPU, stall list.
2. Stalls (section 1) until no frame > 33 ms while moving.
3. The biggest GPU pass from the split (section 2), one change at a time with A/B.
4. CPU / draws (section 3); InstancedMesh2 WebGPU test in a lab.
5. A mid-range GPU run; a written result table (before / after per item) in `docs/perf/AUDIT.md`.
