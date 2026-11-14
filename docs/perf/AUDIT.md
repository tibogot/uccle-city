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

## Step 8: the whole city with everything on (2026-11-14, ~01:40; no agent running; preflight YELLOW: 5 GB free)

Reference overview (page check): 12.12 ms GPU, 312 draws, CPU 71.6 ms (boot 17.7 s) - was 13.11 ms / 399 draws earlier
tonight before the new content. Four views, `debug/gpuAB.js measure` (p50 / p95 GPU ms), everything on vs the night's
additions off (`?stops=old&furniture=old&bridges2=0&augustin=0&russian=0&rosaire=0&railcar=0`), separate page loads:

| view | everything on | additions off | difference |
|---|---|---|---|
| Place Saint-Job, street level (stops, furniture) | 12.12 / 14.68, 500 draws, 5.01 M tris | 12.19 / 14.02, 454 draws, 4.92 M | ~0 ms, +46 draws |
| under the Rue de Stalle viaduct (D5) | 11.60 / 12.65, 441 draws | 11.99 / 13.11, 432 draws | ~0 (noise), +9 draws |
| Saint-Augustin, Altitude Cent (E1) | 10.49 / 12.32, 185 draws | 10.03 / 11.01, 175 draws | +0.46 ms (the church) |
| overview | 12.85 / 14.75, 314 draws | (invalid: measured before the view settled) | - |

Verdict: the night's content (stops, furniture, six rail bridges, three churches, rail fences) costs ~0-0.5 ms where it is
seen; every view stays under 13 ms p50 / 15 ms p95 (60 fps on the RTX 4050 laptop). Not measured here: front gardens
(off by default), grass (opt-in, ~0 ms measured), horizon (+1.3 ms from 500 m, opt-in).

## Step 9: driving stutter from the city-wide instance pools (2026-11-14, branch claude/gather-perf)

The trigger: driving the camera at 14 m/s along Avenue Alphonse XIII / Boulenger (I6), the front gardens made 31 frames
> 33 ms vs 2 without (coordinator). Their pools re-gathered 1.5-4.7 ms of main-thread CPU every 2 m of travel, and
EVERY FRAME while any tile faded (the tile fade rode in each instance's iBand.w). The stops, furniture 2 and street-life
pools were copies of the same code; the façade kit re-bucketed every frame of a tile's 0.9 s fade too.

**Machine: RED** (`tools/perf/preflight.ps1`: another agent's city tab rendering, GPU 72 % busy at rest, 0.6 GB free).
Frames > 33 ms are therefore mostly GPU / vsync misses of the shared GPU (the same build and URL gave 23 and 501 in two
runs); the reliable numbers are the main-thread ones (the pools' own cost per frame, the main loop's CPU per frame).

### The harness: `debug/driveStutter.js`
`D.start({ repeats: 3, pops: true })` then `D.status()` (or `await D.run(...)`): the camera along a fixed street path
(default the coordinator's (1470, 900) -> (1434, 640), 262 m; `stjob` = the Saint-Job route) at 14 m/s, eye height
(walk surface + 1.6 m), moved by the rAF clock; a warm-up out-and-back, then `repeats` measured out-and-back legs. Per
leg: frame p50 / p95 / p99 / max, frames > 25 / 33 ms, long tasks and long animation frames, the main loop's CPU per
frame (three r187 `renderer._animation._animationLoop` timed: updates + render submission, independent of the GPU), GPU
ms, each pool's update (gardens, stops, furniture 2, street life, façade kit: max, ms/s, frames > 0.5 ms), the gathers
forced whole (the camera outran the margin), and EVERY per-frame updater of the viewer (`viewer.updaters`, profiled
through the array's own iterator so tiles still remove theirs by identity; grouped by source). `pops: true` adds two
untimed legs that check, every frame, that each instance a pool mesh's shader may draw is inside that mesh's held band
(0 = no pop). The tab must be in front (chrome-devtools `select_page` with `bringToFront`), else rAF is throttled and
the run is marked invalid.

### What changed
- **`viewer/instanceStream.js`** (new, shared): `FadeSlots` (the tile fade as ONE uniform float per tile slot, the
  instances carry the slot: a fading tile changes a float, nothing re-gathers), `buildSource` / `sourceFromYaw` (a
  tile's instances turned ONCE into columns in the pool's layout, sorted in 50 m cells, with a centre + half extent per
  instance), `StreamPool` (a gather copies whole cells, or runs of accepted instances, with one typed-array `set` each;
  only cells on a band edge are tested instance by instance; grown back arrays, no allocation per gather; commit = copy
  into the static attributes + `addUpdateRange` over the live count + `needsUpdate`; never DynamicDrawUsage; empty
  meshes hidden), `Streamer` (a gather every TRIGGER = 2 m, each LOD holding its band + MARGIN = 6 m, run as a generator
  TIME-SLICED over frames; forced whole only if the camera gets 0.9 x MARGIN from the drawn centre: a teleport),
  `frameBudget` (ONE streaming budget a frame, 0.45 ms, shared by every streamer, the façade kit and the tree fields; a
  job past it still moves on by a 0.08 ms sliver so it ends before the margin is used up).
- The front gardens, STIB stops, furniture kit 2 and street-life props run on it (their labs keep a synchronous
  `pool.gather(tiles, camera)`).
- Façade kit (`viewer/facadeKit/kitField.js`): the re-bucket is a generator into back arrays committed at its end,
  0.25 ms a frame inside the shared budget, MOVE 2 -> 2.5 m, MARGIN 3 -> 5 m (the slack covers the frames a re-bucket
  takes), finished at once on a teleport or a turn past 80 % of the cone margin; the tile fade is a slot (`kitFades`): a
  fading tile no longer re-buckets every frame.
- Trees (`viewer/treesStylized.js`, `viewer/impostors.js`; vendor untouched): every tile's field and far impostor field
  re-bucketed in the SAME frame each 5 m (1-4 ms). Now a tile is due after 3 m and served within the frame budget, at
  once past 4.5 m (the vendor's own 5 m trigger stays the backstop; its re-bucket is forced by a 1e-6 nudge of
  `lodSlack`, part of its key); the impostor re-bucket writes its arrays directly (no array literal per tree).
- Heroes, rail bridges, tunnels (11 `*City.js`, `main.js` x 2, `rail/tunnelModel.js`): every 30 frames each checked
  `scene.getObjectByName(home + "-lite")`, a walk of the whole scene graph when the home tile was not loaded
  (0.5-1.3 ms, a > 0.5 ms frame every ~4 frames while driving); now `viewer/liteShown.js` asks the viewer's map of lite
  tiles (`window.viewer.lite`).
- Hedges (`viewer/gardens/gardenHedge.js`): the "speckle" close up was the leaf noise's last octave (9 mm and 2.5 mm
  grain at its 0.55 / 0.16 m scales): a mip bias of 1.5 drops it (leaf-sized clumps). Flicker test (Gardens Lab, street
  view, hedge region, 24 frames): strafe / dolly / orbit 23 / 5 / 7 blinking px after vs 24 / 5 / 7 before: the hedge
  never shimmered (the lab's blinks are the railing bars' edges).

### Per pool: its cost in a frame while driving (6 legs, ~2,700 frames a run)
| pool / updater | before: max ms / frames > 0.5 ms | after |
|---|---|---|
| front gardens | 3.9-9.4 / 624-688 | 0.6-0.9 / 1-5 |
| STIB stops | 0.2-0.3 / 0 | 0.1-0.3 / 0 |
| furniture kit 2 | 0.2 / 0 | 0.2-0.3 / 0 |
| street-life props | 0.2-0.3 / 0 | 0.2-0.4 / 0 |
| façade kit | 0.5-2.5 / 1-5 (and every frame of a tile fade) | 0.5-0.6 / 0-1 (a turn-around) |
| tree fields + impostors | 1.9-3.9 / ~300 | 0.8-1.2 / 38-91 |
| heroes' lite check | 1.0-1.4 / 381-617 | gone from the list |

Pops: 0 missing in 6.1-6.3 M instance-LOD checks (gardens), 85 k (stops), 3 k (furniture), 11 k (street life).

### Drive-stutter runs (Boulenger, 14 m/s, 3 out-and-back repeats; RED machine)
| build, URL | frames > 33 ms | frame p95 per leg | CPU p50 / p95 per leg (ms) | CPU frames > 16.7 ms |
|---|---|---|---|---|
| before, `?gardens=1` | 541 / 201 | 33.3 / 16.8-17.2 | 9.9-11.0 / 11.6-17.1 | 111 / 52 |
| before, default (gardens off) | 390 / 289 | 16.9-33.3 | 9.0-9.9 / 10.5-15.9 | 37 / 84 |
| after, default (gardens ON) | 23 / 389 / 501 | 16.8 / 33.3 | 10.0-11.1 / 11.4-17.5 | 31 / 73 / 50 |
| after, `?gardens=0` | 241 / 134 | 16.8-33.3 | 9.2-10.4 / 10.9-13.9 | 50 / 31 |

(Two or three runs per row, separate page loads, interleaved; the GPU was shared with another agent's tab throughout.)

Verdict: the pool spikes are gone (the gardens' > 0.5 ms frames 624-688 -> 1-5) and nothing pops. Frames > 33 ms on
this machine follow the other tab's GPU load (23 to 501 for one build), so gardens on vs off are within that noise; the
one real difference left is the gardens' DRAWS: +0.8 ms main-thread CPU p50 a frame (~25-35 more meshes at street
level and their shadow passes), not a spike. **The front gardens are ON by default again** (`?gardens=0` off). To
re-check on a GREEN machine: `D.start({ repeats: 3 })` with `?gardens=0` and the default, alternated.

### Left (seen by the updater profile while driving)
- Traffic (`viewer/traffic/cityTraffic.js` update): 0.5-2.6 ms in 50-95 frames of 2,700; the car fleet's bound update
  (rare 1-7 ms); the falcon flyer (rare ~1-1.5 ms). Not pools; not touched.
- The gardens' draws (above): a BatchedMesh / multi-draw per LOD material would cut the +0.8 ms.

## Step 10: startup and a loading scene (2026-11-14, branch claude/boot)

**Machine: RED all session** (`tools/perf/preflight.ps1`: another agent's city tab, GPU 91 % busy at rest, CPU 30 %
busy, 2.3 GB free). Same-machine numbers swung 2-3x between minutes (the tile worker's road step: 1.3 s to 4.7 s for
the same tile), so every comparison below is paired (base / new alternated, minutes apart); single runs are noisy.

### The harness: `debug/bootTimeline.js`
An init script (`navigate_page({ initScript })`, loaded by a sync XHR) that records, per boot: the first GPU submit,
the first full tile, the cover, all 9 full tiles, the far LOD done, the landmarks' "shaders ... ms" lines, the last
SYNCHRONOUS pipeline; every render pipeline (sync / async, ms, label), every TSL node build (main.js calls
`window.__bootHook(renderer)`: ms per build, material name; shadow builds named by their source material), the compile
queue's jobs (`warmup.js` records them when the probe is in), downloads (resource timing), long tasks / long animation
frames, frame gaps after the cover. `__boot.report()`.
Cold = a fresh isolated browser context per run (empty HTTP cache), local server. A warm HTTP cache could NOT be
measured here: the DevTools harness bypasses the HTTP cache (a `max-age=3600` file is re-transferred in full); the
caching server for it (`tools/serve_cached.py`, the live site's vercel.json headers) is in the repo. The live site was
measured once, cold, as it is (claude/foundation): **cover 40.8 s, first tile 20.6 s, 90 MB before the cover, last
byte at 31 s**: there the boot is a waterfall of awaits (material library 2.4-5.8 s, kit / furniture / gardens / stops
one after another, eleven landmarks one notes-file round trip each 7.9-12.6 s, the ground textures only asked for at
12.7 s, the first tile at 16.3 s).

### Where the boot went (base, local, cold)
- Node builds (three building each material's TSL graph into WGSL on the main thread): **739 builds, 7.5-8.5 s**, almost
  all in two long tasks (1.8 s at the first frames, 5.6-7.1 s in the warm-up's forced frames). Biggest: the shadow pass
  **346 builds / 1.7 s** (r187 `_getShadowNodes` plugs every material's whole colour graph into the shadow override,
  only to read its alpha: one shadow shader per material), the façade kit **52 builds / 1.5 s** (9 geometry attributes
  + the instance matrix > three's 8: every kit mesh `objectSpecific`, its own build; one more mid-play whenever a mesh
  grew), unnamed MeshStandard 55 / 0.7 s, fade copies 29 / 0.35 s.
- Pipelines: 627 (48 sync, ~0 ms each; the rest async, median 0.6-0.7 s in the GPU process).
- The tile worker idled from ~11 s to the cover (the next tile was asked for after it), then built one tile per step;
  the third tile waited 4.4 s more in the compile queue behind eleven landmarks and the bridges (one serial queue).
- Downloads locally ~2 s (not the bottleneck locally; on the live site they are).

### What changed
1. **Fewer shader builds** (always on): the façade kit binds only the per-instance attributes its shader reads (opaque
   aKitI / aKitJ, glass + aKitF; `kitField.js`) -> the kit shares 2 builds; `warmup.js shareShadowNodes`: an opaque
   material (no alphaTest / transparent / alphaMap / mask / castShadowNode) gives the shadow pass its vertex code only,
   not its colour graph -> shadow builds 346 -> 179 (`?shadowshare=0`: three's own; live A/B:
   `renderer._getShadowNodes = renderer.__shadowNodes.own`). Node builds 742 -> ~420-500, 7.5 s -> 3.5-4.8 s.
2. **Boot order** (`main.js`): kit / street life / furniture / gardens / stops start together, the eleven landmarks
   together (each awaits only its notes), the ground textures and tram profile from the start (`?bootorder=old`).
3. **Worker prefetch**: as soon as the hide list is complete the worker gets the start tile and then the ring, ONE
   build at a time (a worker runs every request it holds at once: four sent together made the first one 11.7 s), at
   most 2 full tiles held; a **second worker builds far tiles only** (`?liteworker=0`, `?bootprefetch=0`). The hide
   list sent to the worker is sorted (the landmarks now push in any order; the tile cache keys on it).
4. **Early warm**: camera, sky and post pipeline are set up before the first tile; one forced frame (`warmNow`) builds
   what is already in the scene while the worker builds the first tile (`?early=0`). Not `compileAsync`: r187 keeps at
   most 16 pipelines in flight, the same scene took 8.5 s and blocked the queue.
5. **Compile queue**: tiles first (`precompile(..., { first })`), the landmarks' background compiles after.
6. **Under the cover**: the start tile + ONE full neighbour (a second full tile emits other WGSL: without it the first
   tile after the cover waited ~4 s on 15 new pipelines) + **the whole ring as far tiles** (before: two far tiles): the
   first view is a neighbourhood, not a tile in the void; the full ring fades in over it; the far ring now streams
   ALONGSIDE the full tiles (it waited for all of them before). The start tile's fading copies are drawn in the
   warm-up. `?bootlite=0`: as before.
7. **The loading scene** (`viewer/loader/`): below.

### Boot timeline, paired cold runs (local server, seconds from navigation start)
| | base (claude/foundation) | new (claude/boot) |
|---|---|---|
| something on screen | blank cover | **aerial view at 0.5-1.0 s** (loader ready) |
| first GPU submit | 5.1-6.9 | 1.5-2.1 |
| first full tile | 5.3-7.2 | 7.1-7.5 (the worker is slower: everything else now runs alongside it) |
| cover lifts (playable) | **19.2 / 19.3 / 23.1** | **13.6 / 15.3 / 16.0 / 16.5** (one 28.9 run, worker 3x slowed by the other agent) |
| all 9 full tiles | 47.8 / 49.2 / 57.2 | **33.8 / 34.6 / 37.1** |
| far LOD complete | 50.3 / 51.8 / 60.0 | 35.1 / 36.0 / 38.7 |
| landmarks' shaders done | 28.7 / 29.9 / 35.8 | 29.0 / 29.0 / 34.4 |
| node builds | 683-742, 7.2-8.5 s | 425-500, 3.5-4.8 s |
| long tasks before the cover | 10.8-12.9 s, longest 6.1-7.1 s | 7.9-10.3 s, longest 1.8-2.8 s |
| sync pipelines after the cover | 10 (~0 ms each) | 15-24 (~0 ms each, cached) |
| frame gaps > 50 ms after the cover | 16-17 (worst 150-250 ms; 1,083 ms in an earlier run) | 18-24 (worst 500-1,100 ms) |
| downloads | 134 MB | 136 MB (+2.7 MB the loading scene) |
| JS heap after | 1.22-1.25 GB | 1.12-1.25 GB |

`?early=0` (one run): cover 18.6 s, all 9 at 43.1 s; the first tile 2 s sooner (the early frame's pipeline compiles slow
the worker) but a 5.0 s warm-up long task: early warm kept.

### The loading scene (`viewer/loader/loader.js` + `loaderWorker.js`; `?loader=0` off)
A slow aerial flight over the REAL Uccle: the horizon ring's data (`data/horizon/`: the region's 20 m DTM, 105 k
triangles, and the 5 m/px orthophoto of the city + 1 km; 2.7 MB) drawn in a worker on an OffscreenCanvas with its own
small WebGPU device (one ground draw + one sky draw, 4x MSAA, mipmapped photo, the city preset's sun / sky / haze
colours, an ACES curve), so the boot's long tasks never freeze it. It orbits the start view's target, closing in; when
the warm-up starts, `land(pose)` flies it onto the city's first camera; the cover then cross-fades (1.1 s) into the
city's first frames from the same camera (checked at 50 %: the photo's roads and parks line up with the 3D streets; a
focus pull, no pop), then the worker stops (`?loaderhold=s` keeps it, for checks). Over it: "Uccle", the boot's stage
(main.js `bootStage`: materials, landmarks, streets, shaders, neighbourhood, "Compiling shaders (n / N)" from the
pipelines actually done), MB downloaded, a bar. The dev HUD is hidden while loading. References: Mr.doob's
slop-newyork has no loading scene (it streams in view); the three.js examples show a progress bar or nothing; this
follows the game pattern of a cheap real-data flyover with an honest readout.
**Cost:** ready 0.5-1.0 s after navigation (worker build 0.32-0.80 s), 45-60 fps during the boot on the RED machine,
2.7 MB download, ~10 MB GPU; stopped 1.4 s after the reveal. Not separately A/B'd for boot time (no quiet machine); the
boot numbers above include it.

### Steady state (same tab, alternated loads, fixed views: GPU p50 / p95 ms, draws)
| view | base | new |
|---|---|---|
| Saint-Job close-up | 8.85 / 9.90, 559 · 8.52 / 9.11, 560 | 8.65 / 9.50, 549 · 8.45 / 9.11, 552 |
| overview | 9.04 / 9.83, 401 · 8.98 / 9.57, 393 | 9.31 / 11.01, 396 · 9.11 / 11.01, 394 |

Shared shadow nodes, live A/B (4 rounds, Saint-Job): shared 9.0-10.4 vs own 8.7-10.5: no change. Steady state: the same
within the noise (the overview p95 +1.2 ms in both new runs: re-check on a quiet GPU).

### Left
- The tile cache (`?tilecache=1`) could not be confirmed: two primed loads still built the start tile (no hit); the hide
  list is now sorted, which should make the key stable: re-check with `tileCache.js` DEBUG = true.
- The live site: the boot-order change targets its 16 s waterfall; measure after a deploy (cold, isolated context).
- Frame gaps of 0.5-1.1 s in the first seconds after the reveal (no script in the long-animation-frame entries:
  GPU-process side), and 15-24 cached sync shadow pipelines after it.
- The landmarks still finish ~13 s after the reveal (their fade copies compile in the background queue).
- Node builds left: ~40 unnamed MeshStandard (per-tile materials: one shared terrain / road material, AUDIT_PLAN 2.6),
  20 kit glass builds (8 geometry attributes + instancing > 8: still per mesh), 179 shadow builds (materials with their
  own positionNode / mask).
- Re-measure all of this on a GREEN machine.
