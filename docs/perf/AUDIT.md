# Performance audit: results

Plan and method: `docs/perf/AUDIT_PLAN.md`. Runner: `debug/perfRun.js`.

## Baseline (2026-11-13, claude/foundation 2fdc449, quiet GPU)

**Setup.** This machine, one Chrome tab in front, no agent running. City at `?ring=1&far=1`, 1280x720 at DPR 1. Two
rounds of the five paths (`P.suite({ rounds: 2 })`); all 10 runs valid. Raw output:
`scratchpad/baseline_suite.json` (not committed). Frames are capped by vsync at 60 Hz, so p50 16.7 ms means "on time".

### Startup (one load with a long-task / pipeline probe)

| | measured | budget |
|---|---|---|
| Cover gone (first usable frame) | **14.4 s** | < 10 s |
| Long tasks before the cover | 3.24 s + 2.59 s + 0.65 + 0.32 + 0.31 ... (8.7 s in total) | none > 1 s |
| Where | the first renders: three's `update` building every material's nodes (`three.webgpu.js`, long-animation-frame script attribution), during the worker's first tiles and the cloud texture load | |
| Pipelines before the cover | 38 sync + 296 async | |
| Pipelines in the 20 s after the cover | **15 sync** + 195 async | 0 sync |

### Moving (two rounds; numbers per round: round 1 / round 2)

| path | frames > 33 ms | worst frames (ms) | sync pipelines | GPU p50 / p95 (ms) | draws | tris (M) |
|---|---|---|---|---|---|---|
| flight (85 s, 70 m up) | 196 / 371 (4-8 %) | 300, 233, 133 / 233 | 0 / 0 | 6.6 / 12.3 · 7.0 / 12.5 | 331 | 4.0 |
| stjob (street, 71 s) | 96 / 53 (1-2 %) | 67, 50 / 50 | 0 / 0 | 9.4 / 11.1 · 9.4 / 11.3 | 420 | 4.7 |
| alsemberg (street, 122 s) | 155 / **788 (10 %)** | 300 / 283, 283, 183 | 0 / 0 | 8.9 / 10.0 · 7.7 / 9.3 | 350 | 3.3 |
| turn (16 s on the Place) | 19 / 39 | 284 / **3,633, 3,167, 1,217** | 0 / 0 | 7.1 / 8.5 · 7.1 / 9.9 (max 79) | 300 | 3.0 |
| orbit (40 s, 240 m up) | 21 / 99 | 33 / 50 | 0 / 0 | 8.7 / 10.2 · 9.0 / 10.0 | 365 | 4.5 |

**GPU split (share of the sampled pass time, round 1):** the main scene and the sun shadow map are almost all of it.

| path | scene | sun shadow | AO (GTAO) | SSR | bloom + rest |
|---|---|---|---|---|---|
| flight | 45 % | **40 %** | 3 % | 1 % | ~11 % |
| stjob | 55 % | 28 % | 5 % | 2 % | ~10 % |
| alsemberg | 54 % | 26 % | 5 % | 3 % | ~12 % |
| turn | 54 % | 26 % | 5 % | 3 % | ~12 % |
| orbit | 78 % | 9 % | 4 % | 1 % | ~8 % |

(Pass times are summed over the frames the timestamp pool holds, so read them as shares, not as ms per frame; the GPU
p50 / p95 column is the per-frame total.)

**JS heap:** 1.2-1.4 GB, swinging by -830 to +490 MB within one path. **GPU geometries:** 1,664 during the first
flight, 5,155 at the end of the session (to check: more tiles held, or a leak).

### What it says

1. **The GPU is not the limit on this machine:** 6.5-9.5 ms median, p95 under 12.5 ms, everywhere. The frames over
   33 ms are main-thread (CPU) frames: the GPU p95 stays far under 16.7 ms while they happen.
2. **No freeze from shaders while moving:** 0 synchronous pipelines on every path (the 2026-11-13 lamp-pool fix holds).
3. **Stutter is tile streaming:** the 130-300 ms frames land where tiles load or unload (flight, Alsemberg). The 10 %
   of 33 ms frames on the Alsemberg drive (round 2) is the main thread over budget while tiles stream.
4. **One 3.6 s + 3.2 s stall** came in the turn right after the Alsemberg drive: the camera jumped 2 km back to
   Saint-Job, so many tiles unloaded and loaded at once. No JS long task was recorded during it (only 118 and 81 ms),
   and it did NOT come back in two reruns of the turn with the tiles already there -> a GPU-process stall from the mass
   unload / upload (buffer destroys, texture uploads). The falcon's fast flight streams the same way: trace it.
5. **The sun shadow is the biggest GPU item after the scene:** 26-40 % of the GPU (40 % in the flight, where the shadow
   box grows with altitude). Mr.doob's settings (2048 px tiles, far 220 m) and no shadows from small things are the
   first GPU changes to A/B.
6. **Startup 14.4 s** with 3.2 s + 2.6 s blocking material builds; 15 synchronous pipelines still appear in the first
   20 s after the cover (each a possible hitch).
7. **Heap 1.2-1.4 GB with ~800 MB swings:** large garbage-collection work; find what allocates per frame / per tile.

## Step 1: the streaming stall + per-frame CPU (2026-11-13, same session)

**Trace of a fast 30 s flight over 9 tiles** (`scratchpad/trace_stream.json.gz`, analysed with a small script): the
worst frame (333 ms) is ONE 333 ms task in the **GPU process** (`CrGpuMain`), not on the page's main thread; the main
thread had no task over 83 ms. No sub-events in the trace (default categories).

**Not shader compiles:** a 35 s flight into unloaded tiles created **0** render pipelines (sync or async) and still had
283 ms and 150 ms frames.

**Found and fixed: buffers re-uploaded in every render pass.** three r187 (`Attributes.update`) uploads a buffer when
`data.version < attribute.version || attribute.usage === DynamicDrawUsage`: a DynamicDrawUsage buffer goes up WHOLE in
every render pass of every frame, changed or not (the car fleet, trams and trees already avoid it, with that comment).
Newer systems still used it: the facade kit (aKitI / aKitJ / aKitF / aVar + instance matrices, 47 meshes), the park kit
and plants, the pigeons, the falcon's hints and camera streaks, the flags. All of them already set `needsUpdate` (+ update
ranges) when they write, so DynamicDrawUsage is dropped there (7 files; the two debug-draw helpers keep it).

| | before | after |
|---|---|---|
| uploads per frame, moving at street level | 200 calls, **857 KB** (kit: 164 calls, 664 KB) | 112 calls, **56 KB** |
| uploads per frame, standing still | ~166 calls, ~730 KB (44 MB/s) | 31 calls, **41 KB** |

The kit still rebuckets every few frames when nothing moves (25 small uploads per frame standing still): to look at.

**Stutter after the fix (2 rounds, frames > 33 ms):** flight 196 / 371 -> 231 / 141, stjob 96 / 53 -> 99 / 143,
Alsemberg 155 / 788 -> 210 / 264. **No clear change: within the spread between rounds.** The uploads were waste (main
thread + GPU-process copies every frame) and are gone, but they were not the cause of the stutter.

**Where the main thread's frame goes (street level, 1,238 frames):** the animation loop takes p50 **8.6 ms**, p90 11,
p99 19, max 194; three's own `render()` CPU is most of it (28 render calls a frame: scene, shadow, post passes; ~800
draws in all). `scene.updateMatrixWorld` costs 0.7 ms a frame (1,934 objects; Mr.doob's `matrixWorldAutoUpdate = false`
would save most of it). The frames at exactly 33.3 ms are frames that just missed the 16.7 ms deadline: the main thread
is close to its budget on every frame, so any extra slice (a tile landing, GC) tips it over.

## Step 2: empty draws (2026-11-13, same session)

**Draws per frame at street level (Rue du Ham):** 806 = scene 353 + shadow 265 + the rest. Of the 806, **358 drew
nothing**: instanced meshes with `count = 0` still cost a draw (and its CPU) in every pass. Mostly the city trees (54
meshes a tile: 6 species x 3 distance bands x leaves / depth twin / bark, most of them empty at any moment), then the
lamps' LOD meshes, the facade kit's meshes in the shadow pass, trains and trams not in view.

**Fix:** `visible = count > 0` where the count is set: `treesStylized.js` (after each field update), `lamps.js`,
`facadeKit/kitField.js`, `rail/trainModel.js`, `tramModel.js`, `tram2Model.js`, `tramline.js`. Draws 806 -> **439** per
frame for the same picture. 0 synchronous pipelines in the runs (showing a mesh for the first time did not build a
shader mid-frame: the materials are shared and already built).

| path (2 rounds) | frames > 33 ms: baseline | after the upload fix | after the empty-draw fix |
|---|---|---|---|
| flight | 196 / 371 | 231 / 141 | **45 / 70** |
| stjob | 96 / 53 | 99 / 143 | **55 / 16** |
| alsemberg | 155 / 788 | 210 / 264 | **65 / 223** |
| sum | 1,659 | 1,088 | **474** (-71 %) |

p99 is now ~17 ms on half the runs (33 ms before). GPU unchanged (6-10 ms p50). **The page's main-thread loop did NOT
get faster** (street level p50 8.6 -> 9.2 ms, p90 11 -> 13: noise): the gain is on Chrome's side, the GPU process gets
half the draw commands and almost no re-uploads, so frames are presented on time. That fits step 1: the stalls live in
the GPU process. Remaining draws: scene 267 (city trees 108 = one per tile x species x band), shadow ~125 (small
things ~25: little left to gain there). The 180-500 ms spikes when tiles
stream are still there (the GPU-process stall, next).

## Step 3: the tile-streaming spikes (2026-11-13, same session)

**Method:** every WebGPU call the page makes, logged per frame (an init script wrapping `GPUQueue.writeBuffer /
writeTexture / submit`, `GPUDevice.createBuffer / createTexture`, `GPUBuffer.destroy`), over a 60 s flight across fresh
tiles, then the spikes (> 90 ms) against the work sent in the 3 frames and the 1 s before them.

**Per second while flying:** 17 MB of buffer writes (a normal frame: ~390 `writeBuffer`s, ~370 KB: per-object uniforms),
8 MB of new buffers, 5.7 MB destroyed, 3.4 MB of texture uploads, ~37 queue submits a frame. Over the 60 s: 6,549 buffers
created (555 MB), 3,912 destroyed (351 MB), 34 textures (132 MB).

**No link between the spikes and that work:** the busiest second (185 MB of buffers destroyed as tiles unloaded) had no
spike; the two spikes of that run (273 ms, 361 ms) followed ordinary seconds (31 MB of buffers + an 11 MB texture; 26 MB
of writes). The spikes are rare now: 59 frames > 33 ms in 60 s of fast flight (1.7 %), 2-5 spikes a minute.

**Not solved:** what the GPU process does in those 270-360 ms needs a trace WITH the GPU categories (`gpu`, `dawn`,
`disabled-by-default-gpu.dawn`), which the DevTools MCP trace can't select: a separate Chrome started with
`--trace-startup=<categories>` (or chrome://tracing by hand) is the way. Suspects: Dawn's D3D12 resource residency /
heap allocation under ~900 MB of churn a minute, the transfer ring for `writeBuffer` (Chrome copies small writes
through a shared ring; 17 MB/s of them), or a tree-impostor bake (render-to-texture) landing with a tile.

## Step 4: startup (2026-11-13, same session): tried, reverted

**Where the boot goes (Performance trace of a load):** one 7.1 s main-thread task (traced; 3.2 s + 2.6 s untraced) =
`warmBoot`'s forced frames (vendor `warmGamePipelines`): `renderFrame` -> three `render` -> `renderObject` -> TSL
`build`: every node material of ~700 drawables built SYNCHRONOUSLY in the first frames. Plus the hero colliders
(`heroColliders.js carBlockers`, 0.4 s), the first tile's tree field + drive colliders (0.24 s), GLTF parsing.

**Tried (one load each, same machine, ?ring=1&far=1):**

| boot | cover lifts | longest task before it | sync pipelines in the 15 s after |
|---|---|---|---|
| today | 17.9 s (14.4 s in the baseline session) | 5.2 s | 5 |
| whole scene through `precompile()` (async compileAsync) with the frames paused, then warmBoot | 25.9 s | 0.87 s | 15 |
| `compileFor` created before the landmarks + first tile (camera + pipeline moved up) | 17.5 s | 3.5 s | 25 |
| both | 22.5 s | 0.85 s | 15 |

The async route (three's `compileAsync`, sliced every ~8 ms) is ~2x slower in total than the synchronous build (12 s vs
7.5 s for the same scene), so it removes the long tasks under the cover but adds 5-8 s; under the cover a long task
is not felt as a stutter. Nothing kept (main.js reverted).

**What would really cut it (to decide):**
- **Fewer unique shaders:** ~700 drawables -> ~300-400 render pipelines + their node builds. Shared library materials
  instead of per-model / per-tile ones, fewer fade variants (lodFade fadeVariant doubles materials), one terrain
  material for all tiles (AUDIT_PLAN 2.6).
- **Show the city earlier:** lift the cover once the start tile and the materials in view are built, and let the
  rest (far tiles, landmarks out of view) compile async behind the visible frames (the async route is then a gain,
  it runs while the player already looks around). Perceived startup ~8-10 s, at the price of possible pop-in of
  far content in the first seconds (to check with the no-popping rule).

## Step 5: show the city earlier + a tile-worker pool (2026-11-13, same session): tried, all opt-in

**Show earlier (`?earlyshow=1`):** the far tiles load after the cover lifts. Cover 12.5 s instead of ~17-18 s, but the
start tile then shows ALONE in the void (the neighbour tiles also land after it), only 5 tiles after 20 s, 35 frames
> 33 ms and two of 467 + 617 ms in the first 20 s, 31 synchronous pipelines. Worse to look at: not the default.

**The bottleneck found:** a full tile takes ~3-4 s of worker CPU (roads 1.3-1.4 s, surfaces + width fit 0.5 s, drive
colliders 0.64 s, road meshes 0.6 s, terrain simplify 0.25 s, facade analysis 0.25 s) and ONE worker built every tile
one after another; streaming adds one full tile per step.

**Tile-worker pool (`?workers=3`) + prefetch of the next wanted tiles:** the 9 tiles around the start were in 10-12 s
sooner (32.6 vs 42.3 s; 42.0 vs 54.2 s), but one 30 s fast flight had a **7.5 s freeze** (one worker, same machine,
minutes later: 217 ms). Boot prefetch of the start ring (`?bootprefetch=1`, with the pool): no gain, likely CPU
contention with the landmarks loading. **Both opt-in**; the default is one worker as before.

**The measurements drifted:** the same configuration went from 19.7 s to 29.9 s to the cover within ten minutes, the
landmarks' background shaders from 12-25 s to 20-23 s: the machine was worn after hours of Chrome / GPU work. Startup and
streaming A/B need a FRESH machine (Chrome restarted, cool), several alternating loads each.

**What to do with this:** (1) re-test the pool on a fresh machine and find the 7.5 s (several tiles landing back to
back? memory of 3 workers?): if it holds, cap the main-thread landing to one tile per N frames; (2) make the worker build
itself faster: roads (1.3 s) and drive colliders (0.64 s) are the biggest steps; (3) cache built tile data (IndexedDB) so
a second visit skips the worker build entirely.

### Next, in order (updated)

1. **CPU per draw (the main thread's biggest item):** fewer draws: no sun shadow from small things (kerbs, bollards,
   kit pieces, markings: fewer shadow draws), r187 `BundleGroup` for static tile content (records the draws once),
   cell culling of instanced sets, merging the kit's 47 meshes, `matrixWorldAutoUpdate = false` (-0.6 ms).
2. **The GPU-process stalls when tiles stream** (150-450 ms): trace again with the `gpu` / `dawn` categories to see what
   the GPU process does (buffer creation + uploads of a tile's meshes, texture uploads, destroys); spread a tile's
   uploads over several frames.
3. Sun shadow GPU A/B (2.1, 2.2), startup (1.3), heap (1.6).

### Next, in order (baseline)

1. Trace the streaming stall (teleport + fast flight) with a Performance trace: what the main thread and the GPU
   process do in the 200-300 ms frames and in the multi-second stall.
2. Tile streaming slices (AUDIT_PLAN 1.4): what runs on the main thread when a tile lands / leaves; target < 4 ms per slice.
3. Sun shadow A/B (AUDIT_PLAN 2.1, 2.2).
4. Startup: parallel pre-compile (AUDIT_PLAN 1.3) + the 15 late synchronous pipelines.
5. Heap: allocation profile; geometries 1,664 -> 5,155.

## Step 6: a cache of built tiles (2026-11-13 evening): built, OPT-IN (`?tilecache=1`)

`viewer/tileCache.js`, inside the tile worker: a built tile (full: ~37 MB of typed arrays) kept in IndexedDB. Measured
on I6: build 3,007 ms in the worker, IndexedDB write 76 ms, read back 40 ms. Never stale: the key holds the tile entry
(its files carry the manifest's ?v= stamp, every option flag), lite / full, the data base and a hash of the worker's
own code; every unstamped file the worker fetched (rail.json, overrides.json, hero notes, street life, osm_grass...)
is stored with its ETag / Last-Modified and re-checked (HEAD) on a hit. Cap 600 MB, least recently used out.
Verified: a reload with `?tilecache=1` reads the tiles back (`cache true` in the tile's build log), a stray database
without stores is repaired, no console errors; with it off nothing is stored.
NOT YET A MEASURED WIN: with two agents sharing the machine, the time to nine full tiles was 162 s cold vs 150 s warm;
the first tile waits ~30 s for the startup shader warm-up (293 pipelines) whatever the worker does, so the worker
build is not today's bottleneck. Re-measure on a quiet machine (preflight GREEN) before turning it on by default;
the next startup lever is the warm-up itself.

## Step 7: tonight's features measured on a GREEN machine (2026-11-13, ~20:50; no agent running)

`tools/perf/preflight.ps1` GREEN (GPU 12 % at rest, 6.1 GB free, no power / thermal cap; my tab parked during the
check); page check at the reference URL YELLOW only for "no baseline yet" (bootMs 16.6 s, GPU 13.1 ms p50, 399 draws).
All by `debug/gpuAB.js alternate`, 6 rounds, the two variants switched live in one page.

| what | view | off / before | on / after | difference |
|---|---|---|---|---|
| one-sided buildings (FrontSide + shadowSide FrontSide) vs DoubleSide | reference overview | 13.11 ms | 12.84 ms | **-0.26 ms** (-2 %; -0.53 .. +0.26) |
| horizon ring `?horizon=1` (+ far 20 km) | reference overview | 13.71 | 13.75 | +0.04 (noise) |
| horizon ring | 500 m up, looking south (the falcon view) | 8.45 (steady rounds) | 9.76 | **+1.3 ms**: over the 0.2 ms target: stays opt-in; next: coarser mesh / cheaper material |
| city grass `?grass=1`, standing in the Kauwberg meadow (96k blades) | render timestamps | 12.73 .. 13.35 | 12.57 .. 12.67 | **~0** (on is not slower: the blades hide ground pixels) |
| same, compute timestamps | | 1.16 .. 1.34 | 1.19 .. 1.39 | **~0**: the 1.3 ms of compute a frame is NOT the grass |

Lead found: **~1.3 ms of GPU compute every frame** in the city with grass off (renderer.backend.timestampQueryPool
.compute): find which system dispatches it (pigeons? water? wind? flags?) and whether it can skip idle frames.
The lab's +1.25 ms for a meadow (measured RED) is not confirmed in the city.
Lead followed: the ~1.3 ms of compute a frame is (almost all) the **Firmament volumetric clouds** (vendor/firmament/
firmamentClouds.js: trace + resolve every frame, cloud shadow / panorama passes): compute 1.24-1.27 ms at the default
`resolutionScale` 1, 1.13 at 0.75, 0.96 at 0.5 (live in the page, look not judged): the resolution only buys ~0.3 ms;
the rest is the fixed passes. For the sky and clouds rework (owner: later): a cheaper cloud path (update the fixed
passes every N frames, a lower trace lattice far from the sun, or baked cloud layers when the camera is low).
