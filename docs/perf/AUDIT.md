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

## Step 11: the 2026-11-14 audit (today's foundation, 00d9412d + this branch claude/perf2)

**Machine.** `tools/perf/preflight.ps1` first **RED**: an orphaned `find / -name NodeMaterial.js` (a dead agent shell's
disk-wide search) burnt one core for 70+ min (CPU 34 % busy at rest); the script printed YELLOW anyway (PowerShell 5.1:
`.Count` of ONE PSCustomObject is null, so a single FAIL was not counted: fixed, `@(...).Count`). The coordinator stopped
it; from then **YELLOW** all session: CPU 9 % at rest, 5 GB free (warn), GPU 9-11 % at rest (the GPU process: the
owner's own windows), port 8820 listening (an idle server, left alone); later the IDE took 0.7 of a core at times.
Page check (`debug/preflight.js`, no baseline file yet): CPU bench 77.4 ms, fixed view GPU 8.32 ms / 366 draws at the
start, 76.0 ms / 7.47 ms / 353 draws at the end (same band). **Every absolute number below is YELLOW**: the deltas from
interleaved A/B (alternated live in one page, or page loads alternated D, X, Y, D ...) are the reliable part. Setup as
the baseline: `?ring=1&far=1`, 1280 x 720 at DPR 1 (DevTools viewport emulation), one tab in front. Raw output (not
committed, scratchpad): `suite_20261114.json`, `suite_20261114_after.json`, traces `trace_flight.json.gz` (before),
`trace_flight2.json.gz` (after), `trace_still.json.gz`, `trace_boot.json.gz`.

New helpers: `debug/featureAB.js` (hold the camera at a `places.js` place, GPU p50 / p95 + the render loop's CPU + draws /
tris / named passes; live A/B), `debug/drawBreakdown.js` (draws and triangles per pass and per layer, `deep` drill-down),
`debug/colliderCost.js` (the furniture collider build per loaded tile).

### 11.1 The suite vs the 2026-11-13 baseline (before this branch's fixes)

| path | frames > 33 ms (r1 / r2) | worst frames (ms) | main-thread long tasks | sync pipelines | GPU p50 / p95 (ms) | draws | tris (M) |
|---|---|---|---|---|---|---|---|
| flight | 194 / 237 (baseline 196 / 371; after step 2: 45 / 70) | 617, 567, 516 / 683, 667, 600 | 38 / 29, up to **668 ms** | 0 / 0 | 7.7 / 13.4 · 8.9 / 14.2 (6.6-7.0) | 410 / 415 (331) | 4.3 (4.0) |
| stjob | 140 / 208 (96 / 53; 55 / 16) | **1,350**, 900, 584 / **1,400**, 600 | 27 / 29, up to 585 ms | 0 / 0 | 10.8 / 13.0 · 10.4 / 12.1 (9.4) | 572 / 547 (420) | 5.2 / 5.0 (4.7) |
| alsemberg | 243 / 223 (155 / 788; 65 / 223) | 667, 617, 600 / 633, 617, 600 | 44 / 45, up to 674 ms | 0 / 0 | 9.8 / 12.0 · 9.5 / 10.8 (8.9 / 7.7) | 500 / 515 (350) | 4.0 / 4.1 (3.3) |
| turn | 31 / 32 (19 / 39) | 383, 333 / 417, 300 | 11 / 8 | 0 / 0 | 7.2 / 9.2 · 7.7 / 10.6 (7.1) | 478 / 469 (300) | 3.5 / 3.4 (3.0) |
| orbit | 12 / 22 (21 / 99) | 183 / 200 | 4 / 6 | 0 / 0 | 9.1 / 10.9 · 10.5 / 13.9 (8.7 / 9.0) | 393 / 392 (365) | 4.8 (4.5) |

JS heap 1.9-4.0 GB during the paths (baseline 1.2-1.4 GB).

**GPU split (round 1, share of the sampled pass time):** flight scene 51 % / sun shadow 38 % / AO 3 % / SSR 2 % / rest
6 %; stjob 59 / 25 / 6 / 4 / 6; alsemberg 59 / 22 / 7 / 5 / 7; turn 58 / 23 / 8 / 3 / 8; orbit 81 / 6 / 4 / 2 / 7.
Draws at Place Saint-Job, street level (`debug/drawBreakdown.js`): scene 430, sun shadow 205, post 27 per frame.

**Startup (two loads with `debug/bootTimeline.js`):** cover **23.3 / 20.4 s** (baseline 14.4 s; step 10: 13.6-16.5 s on
a RED machine); long tasks before the cover 14.2 / 13.4 s, longest 3.8 / 4.0 s; 28 / 19 synchronous pipelines after the
cover (~0 ms each, cached); after the cover **20 / 18 long tasks, 2.9 / 2.7 s**, frame gaps > 50 ms 32 / 36 (worst
1,083 / 683 ms); node builds 509-539, 6.9-7.6 s; heap 1.6 GB 25 s after the cover.

**What got worse and why:**
1. **Stutter: 300-1,400 ms frames while streaming (new).** A profile of the long tasks (`trace_flight.json.gz`): ~75 %
   of every 300-850 ms task is `main.js preCompile -> lodFade.fadeProxies -> fadeVariant -> material.clone()`, and in it
   three r187's `NodeMaterial.copy`, which deep-copies `userData` with `JSON.parse(JSON.stringify(...))`. Three
   `userData` entries hold whole objects: `wxDry` (the weather merge: the dry colour / roughness / normal NODES of 133
   materials, up to 20 MB of JSON each), `atlas` (the road marking atlas on every tile's asphalt material, typed arrays:
   37 MB), `fadeOf` (a fade copy's source material, 30 MB). Node.toJSON walks the graph down to DataTextures and
   serialises them with `Array.from` of every texel: one clone took 100-580 ms, and the heap went to 3-4 GB of garbage.
2. **Draws +80-150 per frame on the paths**: today's merges at street level: roof kit +53-58, front gardens +24-45
   (back on by default since step 9), shops +17-34, Héros +11, street kit +5 (table 11.2).
3. **GPU p50 +0.4-1.4 ms**: mostly the roofs (+0.65-1.1 ms on every view), then gardens / shops (+0.3-0.5 each).
4. **Startup 20-25 s (baseline 14.4 s)**: the long tasks are still the first frames' node builds (`trace_boot.json.gz`:
   the 4.0 s task at 3 s is `stepLoop -> render -> getForRender -> build`, 2.3 s in `warmNow`, 1.3 s in the next
   frame); more features = more materials. Not changed here.

### 11.2 Per feature (interleaved page loads D, X, Y, D, ...: 5 default loads; GPU spread between D loads +-0.3 ms)

Views: Place Saint-Job street (`places.js stjob-street`), Saint-Job from 45 m (`stjob`), a front-garden street
(1470, 900 -> 1434, 640), the Esso Ch. de Waterloo station (J6); Square des Héros (`?tile=E4`: `heros`, `heros-steps`).
"Cost" = default minus the `?x=old` load (GPU p50 ms; draws and triangles at the same view).

| feature (switch) | view | GPU p50 cost | GPU p95 cost | draws | tris (M) | CPU / frame |
|---|---|---|---|---|---|---|
| roofs (`?roofs=old`, 2 loads) | street / 45 m / garden / station | **+0.85 / +1.06 / +0.65 / +1.10** | +0.9 / +0.9 / +0.4 / +1.2 | +56 / +58 / +61 / +63 | +0.45 / +0.35 / +0.54 / +0.66 | +0.5 ms |
| - of it the kit pools (live hide, 4 rounds) | street / 45 m | +0.64 / +0.28 | +0.88 / +0.37 | +54 / +53 | +0.31 / +0.23 | +0.7 / +0.6 ms |
| - of it the kit's shadows (live) | street / 45 m | ~0 (-0.07 / +0.08) | | +18 | +0.1 | ~0 |
| shops (`?shops=old`) | street / 45 m | +0.46 / +0.38 | +1.1 / +0.7 | +34 / +17 | +0.13 / +0.03 | +0.6 ms |
| front gardens (`?gardens=0`) | street / 45 m / garden | +0.33 / +0.38 / +0.13 | +0.3 / +0.7 / -1.0 | +45 / +24 / +39 | +0.14 / +0.06 / +0.15 | +0.7 ms |
| weather, clear (`?weather=old`) | street / 45 m / station | +0.33 / +0.05 / +0.58 | +0.6 / +0.4 / +0.6 | 0 | 0 | ~0 |
| ground fit (`?groundfit=old`) | all four | ~0 (-0.9 .. +0.05) | | 0 | +0.08 | ~0 |
| street kit (`?streetkit=old`) | all four | ~0 (-0.5 .. 0) | | +5 | ~0 | ~0 |
| visual fixes 2 (`?vfix2=old`) | street / 45 m | noise (+0.66 / -0.67) | | +47 / 0 | **+0.74** / +0.08 | noise |
| petrol stations (`?fuel=old`) | station / street | ~0 (+0.05) / +0.4 | | ~0 | +0.09 | ~0 |
| Héros (`?heros=old`, E4, 3 loads) | 55 m / foot of the steps | +0.0-0.13 / ~0 | +0.2 / +0.1 | +11 / +3-14 | +0.12 | ~0 |
| weather presets (live, `debug/weatherCity.js costSplit`, 4 rounds, Place street) | overcast dry / wet / rain / snow cover / snowfall | +0.32 / +0.46 / +0.46 / **+1.37 / +1.31** | | | | |
| - snow: the volumetric layer (live hide) | Place street, snow cover | **+0.72** (fragment 0.37, vertex + raster 0.35) | +0.33 | +33 | +0.28 | +0.3 ms |
| night lights (`?night=1&time=night`, master 0 / 1 live) | Place street | **+0.98 / +1.09** | +0.7 | **+199-275** | +0.8-1.0 | +1.5-2.2 ms |
| dev panel shown (sections closed) vs hidden | Place street | -0.02 | | 0 | 0 | -0.2 (noise) |
| dev panel, each of the 14 sections open (2 rounds; the one outlier rechecked over 4 rounds) | Place street | within +-0.45 | | | | within +-0.3 after the recheck |

Rain is +0.46 here (the merge said +1.3 on a RED machine): the staged gates and distance skips work, and the overcast
sky (Firmament's cloud deck) is +0.32 of it. Snow is still over the lab budget (+0.62): the layer alone is +0.72.

### 11.3 The top costs (a still frame at street level + the paths)

1. **Main-thread long tasks while tiles stream** (300-850 ms, 30-45 a path): the JSON deep copy above. **Fixed** (11.4).
2. **CPU per frame, ~10-12 ms at street level** (`trace_still.json.gz`): three's `renderObject` path 39 % of the main
   thread, the sun shadow pass's `updateShadow` 11 %, `updateMatrixWorld` 3 %, the Firmament exposure meter 1.5 %; our
   GPU timing (`sampleGpu` + `resolveTimestampsAsync`) shows as 7 % of the samples but saves only **0.16 ms** when
   switched off live (not worth a default change). The 33.3 ms frames left are vsync misses of this loop plus jitter.
3. **Draws**: 430 scene + 205 shadow + 27 post at the Place. The city trees are the biggest block: 108 scene + 54 shadow
   draws (9 tiles x the species-band meshes x leaves / depth / bark), their far bark LOD **776 k triangles**.
4. **Sun shadow pass**: 22-38 % of the GPU while moving (38 % in the flight: the box grows with altitude).
5. **Scene pass**: 51-81 % of the GPU.
6. **Roofs**: +0.65-1.1 ms GPU, +56 draws, +0.35-0.45 M triangles everywhere (the kit pools half of it at street level).
7. **Night lights** (opt-in): +1 ms GPU, +200-275 draws: both lamp shadow maps re-rendered every frame where traffic moves
   (the "smart" schedule never skipped at the Place), each drawing ~135 objects (every loaded tile's instanced sets).
8. **Snow**: the volumetric layer +0.72 ms; the overcast sky +0.32 ms in every non-clear preset.
9. **Startup**: ~525 node builds, 7-8 s of main thread in 3-4 long tasks (4.0 / 2.3 / 1.3 s), cover 20-25 s.
10. **Tile landing slices**: the street-furniture car colliders 20-110 ms per tile (13.7 k garden-wall boxes for the 9
    start tiles, each rasterised per instance), the landmark collider build in 90-120 ms slices. **Fixed** (11.4).

Also: GTAO 3-8 %, SSR 2-5 % of the GPU, Firmament clouds ~1.2 ms of compute (step 7); vfix2 +0.74 M triangles at street.

### 11.4 What changed (each behind a switch, rows in `viewer/features.js`)

| change | switch (old) | before | after |
|---|---|---|---|
| **Fade copies clone without three's JSON userData copy** (`lodFade.js cloneMaterial`: the clone gets an empty userData, then a shallow copy of the source's) | `?fadeclone=old` | fast flight (40 m/s, 55 s): long tasks 604, 509, 487, 411, 322, 311 ms (24 > 50 ms), worst frame 617 ms | 334, 116, 92 ms (15), worst 333 ms; a traced rerun: longest task 123 ms, worst frame 117 ms |
| **Street-furniture car colliders**: a box (garden walls, pillars, gates) = its plan rectangle from the instance matrix (>= 0.25 m thick, >= 0.30 m tall), the other pieces rasterised once per geometry x scale and placed by yaw + position (`drive/driveMode.js`) | `?colcache=0` | 33-76 ms per tile (9 start tiles) | **0.4-4.8 ms**; blocked area 928 vs 1,557 m2 on I6 (the old 0.25 m raster padded every thin wall; the boxes are now their true footprint, never thinner than one old cell) |
| **Landmark collider slices** checked the clock every 16,384 triangles -> every 64 (`heroColliders.js`) | `?heroslice=old` | 90-123 ms slices (`poll -> carBlockers`) | <= 6 ms slices (as designed) |
| **Timed landmark LOD cross-fades** (`lodFade.js settleRamp`: the band's middle, with hysteresis, picks the level; the dissolve runs 0.6 s, eased): Saint-Job church, town hall, Saint-Pierre, Saint-Augustin, Russian church, Rosaire, Stalle, Observatory, Héros, the rail bridges | `?lodsettle=0` | standing 145-195 m from Saint-Job: the church drawn twice (LOD0 + LOD1, discarding fade materials), split pixel by pixel by the static screen dither | one LOD, whole, no dither (`lodsettle_spire_170m_x4.jpg`, `lodsettle_before_170m.jpg` / `lodsettle_after_170m.jpg`); crossing the switch at 15 m/s: one 0.6 s dissolve (170.0 -> 180.5 m), monotonic, no pop; GPU at that view ~0 (7.47 vs 7.41 ms, one load each) |
| **Night: lamp shadow maps gated by tile reach** (a tile's instanced sets stay in the lamp layer only while a shadowed lamp is within 38 m of the tile's square; `nightLights/cityNight.js`) | `?lampreach=0` | 271 draws, 1.03 M triangles a frame for the 2 lamp maps (`nightShadowCost`, full) | 220 draws, 0.88 M (the trees of 2 tiles instead of 9) |
| Night: **"alt" lamp shadow schedule** (at most one lamp map a frame while both have movers, alternating: a moving car's lamp shadow at 30 Hz) | `?nightshadow=alt` (OPT-IN; the default stays "smart") | | -0.38..-0.46 ms GPU, -0.7..-1.0 ms CPU, -107..-131 draws (live, 3-4 rounds) |
| Preflight verdict counted a single FAIL as none (`tools/perf/preflight.ps1`) | | a RED machine reported YELLOW | fixed |

**The suite after (same session, YELLOW, 2 rounds):**

| path | frames > 33 ms | worst frames (ms) | long tasks (n, longest) | sync pipelines | GPU p50 / p95 | draws | tris (M) |
|---|---|---|---|---|---|---|---|
| flight | 168 / 126 (was 194 / 237) | **350, 133 / 467, 100** (was 617-683) | 5 / 1, 358 ms (was 38 / 29, 668 ms) | 0 / 0 | 7.3 / 13.4 · 7.2 / 13.3 | 411 / 418 | 4.4 |
| stjob | 85 / 98 (was 140 / 208) | **117, 67 / 50** (was 1,350 / 1,400) | 2 / 0, 111 ms (was 27 / 29) | 0 / 0 | 10.0 / 11.9 · 10.2 / 12.4 | 585 / 591 | 5.3 / 5.4 |
| alsemberg | 281 / 224 (was 243 / 223) | 500, 83 / **67** (was 667 / 633) | 3 / 1, 75 ms (was 44 / 45) | 0 / 0 | 10.0 / 11.6 · 10.1 / 11.7 | 508 / 504 | 4.1 |
| turn | 28 / 32 (was 31 / 32) | **83 / 67** (was 383 / 417) | 2 / 4, 70 ms | 0 / 0 | 7.2 / 9.6 · 7.1 / 9.5 | 485 / 477 | 3.6 |
| orbit | 8 / 13 (was 12 / 22) | **33 / 33** (was 183 / 200) | 0 / 0 | 0 / 0 | 9.8 / 11.4 · 10.7 / 12.1 | 383 / 385 | 4.8 |

The long stalls are gone; the frames > 33 ms left are single missed vsyncs (33.3 ms) of the ~11 ms main loop (most on
the fast street-level Alsemberg drive). Startup after (2 loads): cover 25.2 / 21.4 s (noise: the boot itself is
unchanged), long tasks after the cover **16 / 6 tasks, 1.65 / 0.97 s** (was 20 / 18, 2.9 / 2.7 s), frame gaps > 50 ms
27 / 18 (was 32 / 36).

### 11.5 Left / next (in order)

1. **CPU per draw** (the frame's real limit on this machine): the city trees as ONE city-wide pool per species-band
   (like the roof kit: 108 -> ~12 scene draws, 54 -> ~6 shadow draws), the roof kit's 45 meshes merged per LOD material,
   `scene.matrixWorldAutoUpdate = false` with explicit updates (step 1: -0.6 ms).
2. **Roofs +0.65-1.1 ms GPU**: split the rest (parapets in the wall mesh, the flat-roof membrane shader `facades.js
   flatRoofLook`, procedural on every roof pixel) with live A/B; the kit's LOD2 band (to 480 m) is long for 1-2 px pieces.
3. **Snow layer +0.72 ms**: chunk LOD (the outer 48 of 64 chunks at 25 cm, the seams stitched from the L / R / U / D
   heights the vertex shader already reads: -56 % vertices), the sparkle / micro bump behind per-pixel distance branches.
4. **Night**: make "alt" the default once the owner has seen a moving car under a lamp at 30 Hz; cull a tile's trees per
   cell by the lamp frustum (the trees of 2 tiles are still ~36 draws a map).
5. **Tree crown dither at mid distance**: the trees' impostor hand-over (400 m, 30-50 m band) is per instance, so the
   timed settle above does not reach it; a still frame in the band shows the IGN split. Options: a narrower band now
   that the impostors match the trees, or a per-instance timed fade (instance state in the gather). Not done.
6. **Startup**: unchanged (node builds); fewer unique materials (one terrain / road material for all tiles).
7. A GREEN re-run of every absolute number above (the deltas are interleaved; the absolutes are YELLOW).

## Step 12: perf pass 2, draw calls (2026-11-15, branch claude/perf3)

**Machine.** `tools/perf/preflight.ps1`: **YELLOW** at the start (4.9 GB free), **RED** later (CPU 52 % busy, 1.7 GB free,
Chrome 7 GB, GPU 73 C with power cap / SW thermal): two other agents had city tabs open and RENDERING (night3 at night
with traffic and `nightShadowCost`, then a snow lab on :8891), and kept taking the front tab, which throttles ours
(rAF fell to 1.5 Hz while `visibilityState` still said "visible"). Page check (`debug/preflight.js`): CPU bench 83.8 ms,
GPU 10.3 ms / 352 draws (no baseline file). **GPU deltas below ~1 ms could not be measured** (live A/B spread +-2.5..4 ms,
even as the median of 12 paired rounds); every GPU number here needs a GREEN re-run. What is solid: render-object counts
(`debug/drawBreakdown.js`: they do not depend on load), vertex counts, the CPU render loop measured with our tab brought
to the front right before each run (checked: focus + visible), and before / after screenshots.

Note: `renderer.info.render.drawCalls` (the HUD's "draw calls", featureAB's `draws`) does NOT count indirect draws
(r187 counts direct draws only): compare render objects (drawBreakdown) or `MultiDrawSet.stats()` instead.

### 12.1 What changed (each behind a switch; rows in `viewer/features.js`, section A/B, sub "Perf")

| change | switch (before) | what |
|---|---|---|
| **Multi-draw sets** (`viewer/multiDraw.js`) | `?multidraw=0` (all of them) | many instanced pieces sharing a material in ONE render object: their vertices back to back in one geometry, one `drawIndexedIndirect` per piece and chunk (`geometry.setIndirect` with an offset list; WebGPU feature `indirect-first-instance`, else the old pools). Each part's instances in its own region of shared instance buffers (static, update ranges; regions re-laid in place while they fit). **Culling per pass**: instances arrive cell by cell from the StreamPool gather; consecutive cells form chunks (<= 160 m, <= 48 a part), one indirect record each; the mesh's `onBeforeRender` picks the records whose box meets THAT pass's camera (view, sun shadow, lamp shadows, weather bake): no upload per pass, one cull per set, camera and frame |
| **City tree pool** (`treesStylized.js makeTreePool`) | `?treepool=old` | the street trees of every loaded tile in one pool: per LOD a set of the 6 variants, drawn by 3 meshes (leaves, their depth pre-pass twin, bark) = **9 render objects (4 in the shadow pass) instead of 54 a tile** (108 scene + 54 shadow at the Place). Tiles are streaming sources (instanceStream.js, time-sliced gather in the city budget); a tree's LOD = the vendor's rule (distance from the gather centre to its foot; lodDist / farDist / impostor start + lodSlack, live from the dev panel); the tile fade is a FadeSlots slot read by the pool's copies of the shared materials (`cloneMaterial`, dithered as lodFade) |
| **Roof kit 45 -> 4 meshes** (`roofKit.js RoofMulti`) | `?roofmerge=old` | per LOD one mesh for the 15 pieces (LOD1 in two: the small pieces still cast no shadow there); same materials, bands, sources |
| **Street kits merged** (`multiDraw.js mergeStreamPools`, called by `Streamer.start`) | `?kitmerge=old` | gardens, street kit, furniture, street life + shops, stops: a kit's StreamPool meshes sharing material / shadow flags / layers / instance columns become one multi-draw mesh (24 merged meshes at the Place); left alone: transparent materials, instance colours, own onBeforeRender |
| **Roofs: one look per pixel** (`facades.js roofMaterial(kind)`, `splitRoofs`) | `?roofsplit=old` | every roof pixel shaded BOTH the pitched tiles and the flat-roof membrane (~20 noise lookups + fwidths) and mixed them by the flat flag; now two meshes a tile (pitched, flat), each with its own look only (same nodes, the flag folded in). +1 render object a tile |
| **Snow layer chunk LOD** (`weather/snowLayer.js`) | `?snowlod=old` | the outer 48 of the 64 chunks (past ~16 m of the window centre, which follows the camera) take every other grid node (25 cm); a full chunk's border vertex at an odd node next to a coarse chunk sits on its two neighbours' mean (`snowStitch`): no crack. **269 k -> 119 k vertices** (each reads 5 map texels + 5 track cells) |
| **Public art fade copies** (`parkKit.js fadeCopy`) | `?fadeclone=old` | `mat.clone()` deep-copied userData through JSON (the weather's dry nodes, textures: `serializeImage`): a **923 ms long task** when the public art landed during the Saint-Job drive (traced). Now lodFade's `cloneMaterial` |

### 12.2 Render objects and CPU (Place Saint-Job; page loads alternated, our tab in front)

| view | before (`?multidraw=0`): scene + shadow | after | change | render loop CPU p50 before -> after |
|---|---|---|---|---|
| street (`stjob-street`) | 424-437 + 200-208 | 179-249 + 81-101 | **-44 .. -59 %** | 10.4 -> 8.8 ms (one valid pair; later pairs contaminated: 25-49 ms) |
| 45 m (`stjob`) | 369 + 127 | 209-214 + 81-86 | **-39 %** | 8.9 -> 7.0 ms |

Per change at the street view: roof kit 430 + 206 -> 396 + 186; trees 108 + 54 -> 9 + 4 render objects (plus ~80-230
cheap indirect commands); live hide of the trees: the per-tile trees cost **3.1 ms CPU** at the street view (1.0 ms at
45 m), the pool **0.25-0.4 ms**. Kits: the rest (gardens 39, streetkit 28, streetlife 31, stops 15 render objects -> 24
merged meshes). Scene objects: 1,927 after (the per-tile tree meshes are gone).

Traces (scratchpad, not committed): `trace_still_before/after.json.gz`, `trace_stjob_after.json.gz`. In the after trace
at the street view the main thread waited in `createCommandEncoder` (the GPU process busy with the other tabs): with the
draws gone, this machine's frame is GPU / GPU-process bound under that load.

### 12.3 Moving paths (`debug/perfRun.js`, 1 round each, RED machine, other agents rendering)

| path | frames > 33 ms before / after | worst frames before / after (ms) | long tasks before / after | sync pipelines |
|---|---|---|---|---|
| flight | 122 / **97** | 350, 50 / 400, 167 | 2 (352 ms) / 5 (404 ms) | 0 / 0 |
| stjob | 70 / **40** | 150, 117 / 317, 83 | 1 (96) / 2 (87) | 0 / 0 |
| alsemberg | 934 (contaminated) / 106 | 2,417 / 500, 117 | 80 / 2 | 0 / 0 |
| turn | invalid (throttled) / 9 | - / 67, 67 | 11 / 2 | 0 / 0 |

Later after-runs (another agent's snow tab rendering) gave 353-384 frames > 33 ms on stjob and GPU p95 21-22 ms:
contaminated, not counted. The traced one found the 923 ms parkKit clone (fixed above) and a 294 ms synchronous
pond-water shader build (wolvendaelCity.js / pondWater.js, left). The multi-draw regions grew 31 times on a Saint-Job +
Alsemberg drive (each a new GPU buffer + whole upload); now they are re-laid in place while they fit and the kits' parts
start at 192 instances. **A GREEN re-run of this suite is needed** before these deltas can be trusted.

### 12.4 Visual checks

Same view, before vs after (1280 x 720, mean |RGB diff| of 765): trees + roof kit at 45 m 0.54 (a first try showed the
solar panels / roof windows without their cell lines: the merged geometry had dropped `uv` because the procedural stack
had none; fixed: the attributes are the union, zero-filled); street view 1.46 (dither noise, the far impostor band).
Roofs split vs one material, same page: 0.28 (TAA / AO noise only). Snow layer old vs new at the Place: 0.73, the cut
edge along kerbs 16-25 m away a little coarser, no seam line. Night (`?night=1&time=night`): the pooled trees and merged
kits are in the lamp-shadow layer (tagCasters' sweep) and each lamp camera draws only the chunks in its frustum
(night3's per-tile proxies do not apply to them: they belong to no tile; the fallback is the chunk cull: more instances
than a proxy, never a missing shadow). Not verified by eye: LOD / shadow transitions while moving (the screenshot capture
returned blank frames while another agent held the front tab).

### 12.5 Left / next

1. **GREEN re-run** of every number above (GPU especially: roofs split, snow LOD, the pools' chunk culling vs the old
   per-tile culling; LOD2 tree chunks are up to 160 m).
2. Facade kit (52 scene + 14 shadow render objects, `facadeKit/kitField.js`) and the parked-car fleet (26 + 11): not
   StreamPools; the same multi-draw set applies.
3. `matrixWorldAutoUpdate`: one full `updateMatrixWorld` is 0.225 ms (1,927 objects); the tile groups are static.
4. Sun shadow: unchanged apart from the pooled casters' chunk culling (shadow render objects about -50 %); next: the
   details mesh (420 k shadow triangles at 45 m, DoubleSide shadow) and the roof kit's LOD2 band (480 m).
5. Night lamp maps: a per-chunk proxy of the tree pool (instances within REACH) if the lamp maps' triangles matter.
6. The pond water shader built synchronously on first sight (294 ms); other `material.clone()` calls on weatherized
   materials (the JSON userData copy).

## Step 13: perf pass 3 (2026-11-15, branch claude/perf4)

**Machine.** `tools/perf/preflight.ps1`: **YELLOW** at the start (CPU 12 % at rest, 4.8 GB free), then **RED for the rest
of the session**: another agent's city tab (:8902, later a night city) rendering on the same GPU, GPU 81-83 C with a
power cap, 0.5-1.2 GB free, Chrome 6-8 GB. Page check (`debug/preflight.js`, start): CPU bench 71.6 ms, fixed view GPU
9.5 ms / 285 draws (no baseline file). Live frame A/B was useless (render loop 27-35 ms a frame at times). What was used:
- **`debug/groupBench.js` (new)**: the render loop paused; the whole scene (`full`) or some groups + the tile layers
  (`only`) rendered N times into an off-screen 4x MSAA target from a fixed camera; GPU timestamps; variants alternated
  with the order reversed every other round; median of 6-10 rounds. Absolute numbers drift from run to run (the GPU's
  clocks / the other tab): only deltas WITHIN one run are quoted. Also `VIEWS` (street / garden / ivy / lawn, I6 + F4),
  `lightToggle`, `ivyState` (the ivy before / after, live), `cullStats`.
- render-object and triangle counts (load-independent): `debug/drawBreakdown.js`, `cullStats()`.

### 13.1 What changed (each behind a switch; rows in `viewer/features.js`, section A/B, sub "Perf")

| change | switch (before) | what |
|---|---|---|
| **Foliage lit per vertex** (`viewer/foliage/vertexLight.js`) | `?vlight=old` | plants (3 LOD materials), ivy cards, ivy far quads: the sun's BRDF (Lambert x (1 - F) + GGX, f0 0.04) in the VERTEX stage, packed in one vec2 varying; the shadow (in the light's colour), the albedo, the sky (PMREM) and the DFG multi-scatter stay per fragment (a `PhysicalLightingModel` whose `direct()` reads the varyings) |
| **Foliage takes sun + sky only** | `?foliagelamps=old` | plants, ivy, mulch beds, window boxes: `lightsNode = lights([sun, hemisphere])` + the lamp light map (`addLampLight`), as the grass already did; before, every fragment evaluated the six pooled lamp point lights (intensity 0 by day) |
| **Ivy cards cropped** (`cityIvy.js cardGeometry`) | `?ivycrop=old` | the card quad = the spray's opaque box in its 128 px texture (texels 18-107 x 19-120): 54 % of the square, the same pixels, -46 % fragments |
| **Ivy far LOD** (`cityIvy.js`, `ivyWorker.js bakeFar`) | `?ivyfar=0` | the worker splats every wall's leaves into a coverage mask (shelf-packed into the tile's 512 x 512 region of ONE 2048 x 2048 R8 atlas, up to 10 px a metre, 16 regions, 5.6 MB with mips); past 22 m one quad per wall draws the mask (bilinear, cut by the spray texture tiled at 0.3 m, alpha to coverage, mean-matched colour, normal tilted up 0.3) instead of 4-9 layers of cards; the cards dither out 17.6-22 m and collapse to a point in the vertex stage past their end (no fragments), the quads dither in (the complement) and out at 60-75 m as before; stems already ended at 12 m. A tile with no free region keeps its cards to 75 m. Live tuning: `__ivy.farU` |
| **Facade kit merged** (`facadeKit/kitField.js`) | `?kitfield=old` | the 15 pieces of each (kind, LOD) as parts of ONE `MultiDrawSet` (opaque / glass x 2 LODs); the per-piece meshes stay as the bucket's targets, out of the scene; `aKitV` + `aKitW` (two Uint8 x 4) interleaved into one vertex buffer (the glass view needed 9, WebGPU allows 8) |
| **Parked-car fleet merged** (`carFleet.js mergeBatches`) | `?carmerge=old` | the 64 batches (8 types x 4 LODs x plain / fade) grouped by (material, casts shadow) into 6 sets; the fleet already culls per car on the CPU, so a part = one chunk; the four materials are compiled async on the merged views |
| **Tile buildings culled per cell and pass** (`viewer/cellCull.js`, `cellSort.js`, `cellCullWorker.js`) | `?cellcull=old` | a tile's walls / roofs / flat roofs / details: the triangles re-ordered by 40 m cell in a worker (~20 ms for 90 k triangles: off the main thread; the mesh draws whole until it lands), one indexed indirect record per cell, the mesh's `onBeforeRender` keeps the cells in THAT pass's frustum (view, sun shadow, lamp shadows) |
| **Details' sun shadow fades with distance** (`facades.js` detail material `maskShadowNode`) | `?cellcull=old` | the details (cornices, sills, frames: 20-40 cm) cast a sun shadow dithered out 100-140 m from the eye; their cells past 142 m skip the sun's pass (nothing left to draw there: no pop) |
| Static tile layers (`viewer/staticFreeze.js`) | OPT-IN `?freeze=1` | `matrixWorldAutoUpdate = false` on the 4 tile layers + an `Object3D.add` hook (a late child gets its world matrix once); `checkFrozen()` found 0 stale objects at the Place and from 45 m. Not default: no measurable gain (13.5) |
| Grass lit per vertex | OPT-IN `?grassvl=1` | measured slower (13.4) |

### 13.2 Ivy (target <= 0.3 ms near a wall): met

Ivy wall I6 (camera 1382, 606 -> 1372, 588; 6,091 cards in range, wall at 10-25 m), 1600 x 828. Same run, 8 rounds.

| view | before (the four ivy / foliage switches old) | after | |
|---|---|---|---|
| ivy wall at 10-25 m, whole scene off screen | +0.81 ms | **+0.26 ms** | met |
| same, the ivy alone over the tile layers | +1.21 | +0.36 | |
| the same wall from ~30 m, whole scene | +0.14 | ~0 (-0.06) | |

Split (one run, isolated, 10 rounds): whole squares + per-fragment light 1.27 ms; per-vertex light 0.72; cropped 0.88;
both **0.49**; then the far LOD takes the cards past 22 m. Earlier probes: the six dead lamp lights about half of the lit
cost, the sun's shadow sampling ~0.04, the environment ~0.03-0.07: the cost was per-fragment lighting x the cards'
overdraw.

Look (scratchpad, not committed): `ivy30_cards.jpeg` / `ivy30_far3.jpeg`, the same ivy at 25-30 m, cards vs far quads:
same outline and colour; the quads are a little flatter (less per-leaf light / dark) and their edge a little less leafy.
The 17.6-22 m band is a complementary dither (as every LOD band); checked in a still only, a tree in front.

### 13.3 Plants (target <= 0.3 ms at street level): NOT shown met

RED machine: the whole-scene deltas swung (street: per-fragment +0.07 / per-vertex +0.70 in one run). Isolated over the
tile layers (one run, 8 rounds): street 1.07 -> 1.04 ms, garden 0.61 -> 0.56 ms (per-vertex light is a small win here:
the plants' colour was already per vertex). Per object at the street view (isolated, ms): mulch beds 0.15 (17 beds),
window boxes LOD0 0.23 (5 boxes), plants LOD0 0.14 (7 instances), LOD1 0.16 (25), LOD2 0.16 (215). The beds and window
boxes were standard materials with all the scene's lights: they now take sun + sky only (`?foliagelamps=old`), not
re-measured. Not done: far cards / impostors, quantised instance data, fewer instances (13.7).

### 13.4 Grass (target ~0.3-0.4 ms on a lawn): NOT reached

Per-vertex sun light on the blades (`?grassvl=1`) measured SLOWER (grassBench, Wolvendael lawn, one run: 1.72 -> 2.36 ms
with two vec3 varyings): a blade is 1-2 px wide, so it has about as many vertices as fragments, and the varyings cost.
The re-measure with one packed vec2 was invalid (RED, and a variant-order bug in the probe left the grass hidden in some
rounds). Kept as an opt-in. Next lever: per-BLADE lighting in the compute pass (one evaluation per blade: a 5th vec4 in
the blade data), and the lamp lights (13.7 item 1: the grass already skips them).

### 13.5 Render objects, triangles, CPU

| what | before | after |
|---|---|---|
| facade kit, Place Saint-Job street (scene + shadow render objects) | 57 + 16 | **4 + 1** |
| parked cars, same view | 24 + 9 | **5 + 3** |
| buildings in the sun's pass at 45 m (`stjob`): details / walls / roofs + flat roofs (k triangles) | 205 / 47 / 23 | **21 / 21 / 8** |
| buildings in the view pass at 45 m: details / walls | 205 / 47 | **112 / 23** |
| `scene.updateMatrixWorld` (1,355 objects, Place street) | 0.129 ms | 0.134 (tile layers frozen); 0.184 vs 0.191 (44 more static roots frozen): noise |

CPU per frame for the merges could not be measured (RED: the render loop's CPU time was dominated by waits). Visual
check at 45 m (`stjob`, before = `?cellcull=old`): mean |RGB diff| 4.6 / 765, TAA noise and two parapet-shadow strips
100+ m away (`stjob45_zoom.jpg`, scratchpad: the same shadows, a few pixels). Facade kit and parked cars after the merge:
`stjob_after.jpeg` (scratchpad), windows / doors / cars all drawn.

### 13.6 Moving paths (`debug/perfRun.js`, one round each, RED: another city rendering on the GPU)

| path | frames > 33 ms before / after | worst frames before / after (ms) | long tasks before / after (max ms) | sync pipelines before / after | GPU p50 / p95 before -> after |
|---|---|---|---|---|---|
| stjob | 1,023 / **576** (2 repeats: 800, 1,141) | 200, 183 / 750, 633 (repeats 1,433, 883; 100, 83) | 13 (191) / 5 (162) (repeats 10 (781); 0) | 5 / 8 | 14.6 / 24.5 -> 12.5 / 20.8 |
| turn | 114 / **49** | 983, 783 / 1,250, 133 | 0 / 0 | 0 / 0 | 11.3 / 17.6 -> 11.6 / 18.7 |
| flight | 760 / 894 | 850, 567 / 800, 683 | 7 (343) / 7 (566) | 12 / 13 | 12.6 / 24.4 -> 13.4 / 25.9 |

The synchronous pipelines are streetlife-box:fade, the grass bake, MeshBasic and the falcon nest props (none from this
pass). Not conclusive: three after-runs of the same path gave 576-1,141 frames > 33 ms and 0-10 long tasks (the third,
with a long-animation-frame observer: nothing over 102 ms); the big worst frames have no matching long task (GPU
contention). **A GREEN re-run is needed.**

### 13.7 Left / next

1. **The six pooled lamp point lights by day**: intensity 0, but every lit material evaluates them per fragment. Hiding
   them (a full shader rebuild: a test only) made the whole street view **~2.2 ms faster** off screen (16.1 -> 13.9 ms,
   8 rounds, RED but consistent). The foliage skips them now; the ground / roads / walls / roofs (most pixels) still
   pay. Option: the big ground materials take `lights([sun, hemi])` + the lamp light map they already read; the point
   lights stay for cars / trees / walls (the fixed light count is kept); needs the owner's eye at night.
2. A GREEN re-run of everything above (plants and grass especially; the suite).
3. Grass: per-blade lighting in the compute pass.
4. Plants: far cards / impostors past ~30 m, quantised instance data (96 B an instance), the LOD0 / window-box close-up
   cost, fewer instances where they don't read.
5. Ivy far LOD: per-leaf light / dark in the mask (a second channel); more than 16 tile regions with ring 2.
6. Cell culling: a tile's meshes are sorted once first rendered (the boot tiles: at their first frame); the tile cache
   could keep the sorted index.

## Step 14: the night default + a quiet-machine re-measure (2026-11-15, branch claude/nightdef)

**Machine.** `tools/perf/preflight.ps1` **YELLOW** at the start (CPU 12 % at rest: 1 warn; 6.2 GB free; GPU 0 % at
rest, 50 C; port 8820: the owner's idle server, left alone), **YELLOW** at the end (CPU 5 %, 3.4 GB free, Chrome 4.9
GB: 2 warns). No other agent. Page check (`debug/preflight.js`): CPU bench 74.3 ms, fixed view 10.03 / 11.34 ms GPU,
218 draws (no baseline file). 1600 x 828, DPR 1, one tab in front. Mid-run the first version of the new harness
leaked every loaded city (6 GB heap, preflight RED): those runs were dropped and re-done.

**Harness (new): `debug/loadAB.js`** - page loads alternated in ONE tab (the city in a full-window iframe; per round
the variants' order reversed), a job module run in the iframe's realm per load, results copied as JSON, `summary()`
= paired per-round differences. Jobs in `debug/nightDefault.js` (views incl. the bench views of `groupBench.js`, live
`__night.master` / snow A/B, the day / night switch check). After a teleport the draw count must hold 4 s (2 %).

### 14.1 The night default (details: docs/NIGHT_HOOKUP.md round 4)

`?night=1` was **+0.5-1.0 ms GPU by day** (its 2 shadowed lamp spots were evaluated per fragment at intensity 0 with
their shadow lookups, and the cluster pass ran every frame for an empty pool) - not the -2.2 ms expected. Fixed (the
spots in a uniform branch, the empty cluster pass skipped; `?nightgate=0` = before), then flipped to the default
(`?night=0` = the old 6 PointLights + R8 map). GPU p50, paired median over 10 load pairs, new minus old:

| | overview | Saint-Job 45 m | Place Saint-Job street | Stalle (D5) | Saint-Augustin (E1) | Alsemberg |
|---|---|---|---|---|---|---|
| by day (traffic off) | **-1.18** | **-0.65** | 0.00 (mean -0.59) | -0.06 | -0.06 | - |
| at night (traffic on) | - | -0.22 | **+1.28** (mean +1.41 +- 0.28) | - | - | **-0.95** |
| CPU per frame, day / night | +0.5 / - | +0.4 / +1.05 | +0.4 / +1.6 | +0.5 / - | +0.2 / - | - / +1.25 |

Boot to the cover by day 22.9 -> 23.6 s. Day -> night -> day switches: 0 pipelines, 0 long tasks (3 settled loads).

### 14.2 The "needs GREEN" list, re-measured (YELLOW, quiet)

**Page loads**, default vs the switch, 3 rounds x 7 variants (21 loads, traffic off); cost = default minus the
switched-off load, GPU p50: paired median (mean +- s.e.). With n = 3 a load pair still swings +-1-1.6 ms at the
street view: only the bold cells are outside 2 s.e.

| switch | Place Saint-Job street | front-garden street (I6) | ivy wall I6 | Wolvendael lawn (F4) |
|---|---|---|---|---|
| default, absolute (GPU p50 / p95, CPU, draws) | 10.49 / 11.27, 8.1, 199 | 12.52 / 14.16, 8.1, 231 | 11.21 / 12.78, 7.7, 196 | **16.38 / 18.22**, 7.4, 172 |
| plants (`?plants=0`) | +1.90 (+1.44 +- 1.36) | 0.00 (-0.06 +- 0.59) | **+1.31 (+1.24 +- 0.36)** | +0.19 (+0.46 +- 0.40) |
| ivy (`?ivy=0`) | +1.51 (+1.07 +- 1.38) | -0.19 (+0.20 +- 0.43) | +0.59 (+0.92 +- 0.39) | -1.25 (-1.14 +- 0.18) (noise: no ivy there) |
| grass (`?grass=0`) | +0.53 (+1.32 +- 0.92) | -0.06 (+0.18 +- 0.31) | +0.06 (+0.07 +- 0.23) | -0.86 (-0.61 +- 0.45) |
| weather, clear (`?weather=old`) | -0.06 (+0.83 +- 1.17) | **+0.85 (+0.74 +- 0.29)** | -0.32 (+0.09 +- 0.55) | +0.45 (-0.05 +- 0.50) |
| building types (`?styles=old`) | -0.98 (-0.41 +- 1.61) | +0.46 (-0.04 +- 0.54) | +0.59 (+0.31 +- 0.53) | -1.11 (-0.72 +- 0.89) |
| perf pass 3, all 7 switches old: what pass 3 saves | -1.11 (-0.50 +- 1.06) | -0.13 (-0.55 +- 0.95) | **-1.57 (-1.55 +- 0.66)** | -0.92 (-1.31 +- 0.82) |
| - pass 3: draws / CPU saved | -144 / -1.8 ms | -129 / -1.8 ms | -154 / -2.4 ms | -31 / -0.4 ms |

**Live in one page** (tighter: the objects hidden / shown, or the preset switched, alternated; 6 rounds; default
city, i.e. the night system by day):

| what | view | GPU p50 cost (mean; spread of the rounds) | draws / tris |
|---|---|---|---|
| plants (the `plants` pools: beds, window boxes, box balls) | front-garden street / Place street / ivy wall | **-0.13 / -0.05 / -0.13 (spreads within +-0.9): ~0, the 0.3 ms target is met** | +1-3 / ~0 |
| ivy (cards, stems, far quads) | ivy wall I6 | **+0.46** (+0.13 .. +0.66) | +2 / +0.02 M |
| grass | Wolvendael lawn | +1.07 (-0.66 .. +5.6: one round); a second run -0.02 with no draw / triangle change (the hidden group no longer the drawn one): **inconclusive** | +11 / +0.1 M |
| snowfall vs clear (`cityWeather` preset) | Place street | **+2.21** (+0.86 .. +4.19), p95 +1.7, CPU +1.5 ms | +56 / +0.44 M |

Readings: the plants are no longer a cost at street level (the load A/B's +1.3 at the ivy wall is not seen live: load
noise); the ivy wall is +0.46 live vs pass 3's +0.26 off-screen; snowfall is still the most expensive switch (+2.2,
the lab budget was +0.62); perf pass 3's merges are worth ~130-150 draws and ~2 ms CPU at street level; the lawn view
(F4, 16.4 ms p50 / 18.2 p95) is the slowest view measured today (over 16.7 ms at p95): the next target with grass.
Raw results (scratchpad, not committed): `green.json`, `day_D_vs_Ngated.json`, `night_O_vs_N*.json`.

## Step 15: temporal upscaling + dynamic resolution (2026-11-15, branch claude/upscale, docs/UPSCALE.md)

**Machine.** `tools/perf/preflight.ps1`: **YELLOW** at the start with my tab parked (CPU 14 % at rest, 5.4 GB free);
**RED** with my city tab open next to the game-kit agent's (port 8905: 0.6 GB free, Chrome 8 GB, GPU 82 C, 93 % busy
at rest); **YELLOW** again for the day block (the other agents' tabs parked: CPU 19 %, 5.4 GB free, GPU 16 % at rest);
the night block and the paths ran while a third agent (port 8907, a night police game) rendered: **RED**, read only the
direction. Page check (`debug/preflight.js`, native): CPU bench 81.6 ms, fixed view 9.9 / 11.4 ms GPU, 248 draws (no
baseline file). 1600 x 828, DPR 1, my tab in front while measuring.

**Harness (new): `debug/upscaleAB.js`**: `liveViews` builds a native TWIN pipeline in the page (post.js
`createPipeline` without the upscaler, 4x MSAA scene target) and alternates N / TAAU 1.0 / 0.75 / auto per view and
round (order reversed every round); page loads A/B swung +-3 ms under the other agents' load, the live A/B +-0.3 ms in
the quiet window. Caveat: the twin compiles its 4x pipelines lazily, so where it has not drawn yet it skips objects
(lawn: 232 vs 250 draws): its number there is LOW. `dr` (the DR's trace), `tramPass` (a tram past a still camera).

### 15.1 GPU p50 / p95 ms, day (live interleaved, 4 rounds, medians; YELLOW, quiet)

| view | native (MSAA 4x) | TAAU 1.0 | TAAU 0.75 | auto (scale) | 0.75 vs native |
|---|---|---|---|---|---|
| Saint-Job from 45 m (`stjob`) | 10.16 / 11.34 | 7.73 / 8.39 | 5.18 / 5.77 | 6.68 / 7.73 (0.95) | **-4.98** |
| Place Saint-Job street | 9.57 / 10.94 | 7.93 / 8.59 | 5.96 / 6.75 | 7.08 / 8.06 (0.95) | **-3.61** |
| front-garden street I6 (`gstreet`) | 12.85 / 13.70 | 11.67 / 12.32 | 8.26 / 8.91 | 10.42 / 11.34 (0.95) | **-4.59** |
| ivy wall I6 | 10.55 / 11.80 | 9.57 / 10.16 | 7.08 / 7.67 | 8.39 / 9.31 (0.95) | **-3.47** |
| Wolvendael lawn F4 (native short 18 draws) | 18.02 / 21.30 | 18.48 / 21.43 | 14.75 / 18.02 | 12.85 / 15.86 (0.6-0.8) | -3.27 |

CPU per frame equal within 0.6 ms (7-9.5 ms); draws equal. TAA at full resolution is already 1-2.4 ms cheaper than
MSAA 4x (the 3 HalfFloat MRT targets x 4 samples + their resolve), except the lawn (equal: grass / fragment bound);
0.75 is 34-49 % less. "auto" had 6 s to climb from 0.8 (0.05 per 2.5-4 s), hence 0.95 under budget; on the lawn
it held 0.6-0.8 for a p50 under 14 ms. The resolve itself: ~0.37 ms at 1600 x 828 (`TAAUNode.resolve` pass).

### 15.2 Night (`time=night`, traffic on, 4 rounds; RED: a third city rendering)

| view | native | TAAU 1.0 | TAAU 0.75 | auto (scale) |
|---|---|---|---|---|
| Saint-Job 45 m | 19.92 / 27.53 | 10.75 / 20.71 | 8.13 / 18.42 | 12.98 (0.6-0.9) |
| Place Saint-Job street | 17.69 / 27.79 | 15.66 / 23.40 | 14.48 / 19.40 | 13.89 (0.6) |
| front-garden street | 17.56 / 29.03 | 16.91 / 27.53 | 14.48 / 23.46 | 15.40 (0.6) |
| Wolvendael lawn | 23.27 / 42.01 | 19.99 / 31.92 | 20.05 / 30.74 | 17.37 (0.6) |

Same direction as by day; absolute values inflated by the shared GPU (the DR dropped to its floor there).

### 15.3 Moving paths (`debug/perfRun.js`, page loads, 1 round; YELLOW-RED)

| path | frames > 33 ms N / U | GPU p50 / p95 N | GPU p50 / p95 U | worst frame N / U |
|---|---|---|---|---|
| stjob (street) | 946 / 702 | 13.7 / 23.1 | 11.6 / 17.5 | 650 / 233 |
| turn | 166 / 89 | 13.7 / 21.8 | 12.2 / 15.5 | 50 / 50 |
| orbit | 552 / 217 | 13.8 / 24.4 | 5.4 / 12.7 | 83 / **6,783** |
| orbit, re-run alone | 568 / 114 | 11.8 / 23.1 | 8.9 / 14.0 | 450 / 467 |

The 6.8 s frame (no long task on the main thread: a GPU-side stall, another agent's city rendering) did not come back in
two U re-runs (1,717 ms in one with the same pattern, 467 ms in the other); 0 pipelines compiled synchronously more
than native on the paths. Needs a GREEN re-run.

### 15.4 Left
GREEN re-measure (same tables, plus the auto DR with time to settle); per-instance motion for the traffic fleet; the
wires' width under TAAU; the canvas itself (antialias false now) and DPR 1.5 at the owner's screen.
