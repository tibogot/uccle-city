# Boot: the loading screen and the startup (boot2 + boot3, 2026-11-15; boot3 = section 5)

Owner, 2026-11-15: the loader's live aerial flight JUMPS ("nothing more annoying than jumps"), and the startup regressed
(cover 14.4 s on 2026-11-13, 20-25 s on 2026-11-14). Branch `claude/boot2`. Earlier boot work: docs/perf/AUDIT.md
step 10 (the flight, the boot order, the warm-up) and step 11.

**Machine state for every number below: YELLOW / RED** (preflight: 2.5-3.4 GB free, another agent's city tab and a
Blender bake on the GPU / CPU for part of the session, GPU 33-99 % busy at rest). Absolute times are 1.5-2x what a quiet
machine gives; compare only the pairs taken back to back. All runs local (`tools/serve_nocache.py`), the tab in front.

## 1. The loading screen

![loader, Saint-Job](boot/loader_stjob.jpg)
![loader, town hall](boot/loader_townhall.jpg)

- **Three stills of the city itself** at golden hour: Place Saint-Job and the church, the Royal Observatory, the town
  hall on Place Vander Elst (`viewer/loader/stills/*.avif`, 258-289 KB; `.jpg` fallbacks 292-301 KB; 1920 x 1080).
  Rendered by the city: `debug/loaderShots.js` (frames the view, waits for streaming, renders at ~1.6x and downsamples,
  posts the PNG to a local receiver) then `python tools/loader_stills.py <png folder>` (AVIF + JPG at the best quality
  under 300 KB). Change a view: edit `VIEWS` in debug/loaderShots.js, boot `?tile=<its tile>`, shoot, encode.
- **Only CSS moves** (index.html `#loaderUi`): each slide zooms slowly (scale 1 -> 1.05 over 11.5 s) and the three
  cross-fade (9 s each, 2.5 s fades, a 27 s loop); the bottom slide never fades (no dip to the background), each zoom
  resets while its slide is hidden. Compositor animations (checked in the trace: lsZoom / lsMid / lsTop / the bar run
  composited; the one main-thread animation, a no-op opacity, was removed). The place's name fades with its slide.
  `prefers-reduced-motion`: no zoom, the cross-fades only.
- **Mr.doob's bar** (slop-newyork js/main.js:30-75, 751-766): one bar through every stage (`data, renderer, materials,
  landmarks, tiles, tile, neighbours, warmup, gpu`), each stage's share sized by its measured median (STAGES in
  `viewer/loader/loader.js`), the fill glides to the stage's end as a linear CSS transition lasting the stage's typical
  time x the machine's pace (how fast the earlier stages ran vs the table, 0.5-4x). Counted progress (the warm-up's
  pipelines) only ever moves it forward (retargeting a running transition starts from its current value: no jump).
  `__loader.times` gives each stage's start (re-calibrate STAGES from a few `debug/bootSummary.js` runs).
- **The cover stays until the GPU finished a real frame** (main.js `gpu` stage: a frame, then
  `queue.onSubmittedWorkDone()`), then fades out (1.1 s) while the bar completes.
- `?loader=flight`: the old aerial flight (viewer/loader/flight.js + loaderWorker.js), `?loader=0`: the plain cover.

### Jumps: what stalls a CSS animation during the boot

A trace of the boot (`performance_start_trace`, `python tools/perf/trace_frames.py trace.json.gz --from A --to B --gpu
100`) counts the compositor frames actually presented (viz `Swap`) and lists the GPU process' main-thread tasks.
Finding: **the page's compositor frames are drawn on the GPU process' main thread**, the same thread that executes the
boot's WebGPU work. During every stall the GPU main thread was 100 % busy (5.4-7.4 s: 1,995 ms busy of a 2,005 ms gap;
17.4 s: 603 of 606 ms) while the viz and renderer compositor threads idled. So "compositor-only" CSS is necessary but
not sufficient: a boot that floods the GPU process freezes ANY loading screen. `debug/gpuCalls.js` (an init script
logging every WebGPU call, with `sync@ms` marks to align with the trace) showed what floods it: texture creation +
uploads (22-92 MB `createTexture`, 64 MB `writeTexture`, 28 MB `copyExternalImageToTexture` in one window), ~1,800
`createBuffer`s, shader modules; pipelines were a small part (async ones compile on Dawn's worker threads).

The biggest flood was the **early warm-up** (main.js: one forced frame drawing all 309 kit drawables while the worker
builds the first tile). It now runs in **chunks of 40 drawables, one frame each, `queue.onSubmittedWorkDone()` between
them** (`warmNowChunked`, `?warmchunk=N`, `?warmchunk=0` = one frame as before). The warm-up takes 4.3 s instead of
1.6-2.1 s, inside the ~10 s the worker needs anyway (the first tile did not come later).

| boot (same session, back to back) | presented fps under the cover | gaps > 100 ms | > 250 ms | longest | GPU-main tasks >= 100 ms |
|---|---|---|---|---|---|
| before: `?loader=flight`, one-frame warm-up (f1) | 41.8 | 23 | 12 | **2,099 ms** (3 gaps of ~2 s) | 25, 5.2 s |
| stills, one-frame warm-up (s1) | 57.3 | 23 | 10 | 2,005 ms | 26, 5.1 s |
| **stills + chunked warm-up (s2, the default)** | **56.7** | **19** | **3** | **581 ms** | **18, 2.8 s** |

With the slow zoom, the longest remaining stall (0.58 s) moves the picture by ~0.25 % (2-3 px at the frame's edge, 0 at
the focus point) and the bar by ~2 % of its width: a hesitation, not a jump. The flight's camera moved several metres in
a 2 s stall. Proof files (not committed, 35-50 MB each): the traces t_f1 / t_s1 / t_s2 in the session's scratchpad.

## 2. Startup

### Where the time goes (the regression 14.4 -> 20-25 s)

The cover's critical path is **the tile worker building the start tile**: the "tiles" stage is 7-11.7 s of every boot
(I6, worker log "tile I6 built in the worker"): roads 3.5-5.7 s (surfaces + width fit 0.9-1.5, road meshes + carve
1.4-3.3; step 10 measured 1.3-4.7 s for the road step), **drive colliders 1.3-2.2 s** (the collisions work, 2026-11-13),
**facade analysis 0.9-1.6 s** (155 ms when the facade kit landed: street life, ground fit, storeys since), terrain
simplify 0.5-1.1 s. The worker competes for the CPU with the main thread's node builds. Then the neighbourhood (far ring
+ one full tile, 2-7 s) and the boot warm-up (4.3-6.5 s).

**The weather's materials** (`?weather=old` A/B, same session): node builds before the cover 400 / 8.7 s and 364 /
7.0 s (default) vs **319 / 4.7 s** (weather=old): +45-80 builds and **+2.3-4 s of main-thread node building**. It runs
in parallel with the worker, so the cover barely moved (31.6 vs 31.9 s), but it is the biggest main-thread long-task
source (the early warm-up's 2-6 s tasks). Without storeys + ground fit (`?storeys=old&groundfit=old`) the worker saved
~0.3-0.7 s (facade analysis 903 ms, no wall feet). Not changed here: the next levers (below).

### Changes (each behind a switch)

| change | switch | measured |
|---|---|---|
| stills loader (no WebGPU device or 3D scene of its own) | `?loader=flight` / `0` | cover in the same band (26-32 s on this machine either way) |
| chunked early warm-up | `?warmchunk=0` = before | loading-screen stalls 2.0 s -> 0.58 s max; cover unchanged |
| **tile cache ON by default** (built tiles in IndexedDB, viewer/tileCache.js) | `?tilecache=0` = off | return visit: the start tile read back instead of built; **cover 30-31 s -> 20.2 / 25.4 s**, first tile 16-18 s -> 9.6-12.6 s |
| **service worker** (`/sw.js`): the city's data in Cache Storage, keyed by content hash | `?sw=0` = unregister + clear | return visit: **147.7 -> 10.6 MB from the network** (the code only) |
| far landmarks / bridges after the cover (viewer/bootGate.js) | `?bootdefer=1` (OFF by default) | 146 -> 109 MB and 359 -> 226 pipelines before the cover, but no cover gain beyond noise and **2.2-3.8 s of long tasks right after the reveal** (their processing moved there): kept off |
| async pipelines paced N at a time | `?pipepace=N` (0 = off, default) | not a win: the stalls were uploads, not pipelines; left off |

Boot timelines (debug/bootSummary.js; RED/YELLOW machine; cold = no service-worker list, no tile cache hit):

| run | loader | cover | first tile | long tasks before cover | node builds before cover | net MB before cover | after-cover long tasks |
|---|---|---|---|---|---|---|---|
| B1 old (`?loader=flight&bootdefer=0`) | flight | 31.6 s | 18.9 s | 45, 18.3 s (max 6.0 s) | 407, 9.2 s | 146.3 | 0.7 s |
| N2 stills | stills | 29.8 s | 15.7 s | 49, 17.9 s | 400, 8.7 s | 146.3 | 0.6 s |
| N1 / N3 stills + bootdefer | stills | 26.2 / 31.7 s | 14.0 / 18.1 s | 38 / 41, 13.4 / 15.2 s | 335 / 336, 5.8 / 6.5 s | 109.1 | **3.0 / 3.8 s** |
| W1 warm service worker | stills | 31.9 s | 17.7 s | 57, 16.5 s | 364, 7.0 s | **9.8** | 0.6 s |
| TC5 warm SW + tile cache (today's default on a return visit) | stills | **20.2 s** | **9.6 s** | 34, 13.4 s | 400, 7.6 s | 9.8 | 0.4 s |

Chrome's GPU shader disk cache: every local run here was already "warm" for it (dozens of boots of the same WGSL); not
separable on this machine. On the live site the cold / warm difference includes it.

### The service worker (sw.js)

- Only files listed in `/asset_hashes.json` are cached, each under `path?__h=<content hash>`; the list is fetched fresh
  (no-store) on every page load, before the page's own requests; a changed file has a new hash, the old copy is pruned.
  Code (viewer/*.js, the HTML) is never cached by it. three.js / meshoptimizer from the CDN (pinned versions) are.
- `/asset_hashes.json` is written by the **Vercel build**: `vercel.json` `buildCommand: node tools/asset_hashes.mjs`
  (2,057 files hashed in ~3 s; .gitignored). No list (a local dev server) = the service worker passes everything through.
  To test return visits locally: `node tools/asset_hashes.mjs` once, boot twice; delete the file afterwards (or a data
  edit is served stale from the cache until the list is regenerated).
- `/sw.js` and `/asset_hashes.json` are served `no-cache` (vercel.json).

## 3. Measure on the live site (coordinator)

After the deploy (https://uccle-city-pipeline.vercel.app/), with chrome-devtools, ONE tab in front:

1. **Cold boot**: a fresh context (no cache, no service worker, no IndexedDB):
   `new_page({ url: "about:blank", isolatedContext: "boot-cold-<n>" })`, then
   `navigate_page({ url: "https://uccle-city-pipeline.vercel.app/viewer/index.html", initScript: <the text of debug/bootTimeline.js> })`
   (or the one-liner `(function(){var x=new XMLHttpRequest();x.open('GET','/debug/bootTimeline.js',false);x.send();(0,eval)(x.responseText)})()`),
   then `evaluate_script({ sourcePath: "<repo>/debug/bootSummary.js" })` (copy it into the MCP's workspace if the path
   is refused). Note `cover`, `firstTile`, `stages`, `netMB`, `longTasksBeforeCover`, `gapsAfterCover`.
2. **Return visit**: in the SAME tab, navigate again to the same URL with the same init script (the service worker and
   the tile cache are now filled), summary again. `viaServiceWorker` > 0 and `netMB` ~10 show the cache works.
3. A/B: `?sw=0` (also clears it), `?tilecache=0`, `?loader=flight`, `?warmchunk=0`.
4. Jumps: `performance_start_trace({ reload: true, autoStop: false, filePath })`, wait for the cover, stop, then
   `python tools/perf/trace_frames.py <trace> --from 1500 --to <cover ms> --gpu 100` (gaps > 250 ms, the longest).
5. Run `tools/perf/preflight.ps1` before; note the verdict with the numbers. Close the isolated tab / park on about:blank.

## 4. Weak spots / next levers

- **The tile worker is the cover's critical path** (7-11.7 s for I6): roads (surfaces + width fit, meshes + carve),
  drive colliders, facade analysis. Profile the worker; precompute the start tile offline (it never changes between
  deploys) or ship the tile cache's record for I6 as a static file.
- **The weather's node graphs**: +2.3-4 s of main-thread node builds; share one wx graph per material family / build the
  snow / wet variants after the cover (asked by the owner, not done here).
- **Remaining loading-screen stalls** (max 0.58 s, three > 250 ms): tile landing (11.5 s) and the neighbour tile (17.1 s):
  their geometry / texture uploads in one task; the boot warm-up's forced frames (vendor warmGamePipelines) could be
  chunked like the early warm-up.
- **Big uploads that need not be**: the street-life atlas (16 pages 2048 x 1024 RGBA, ~128 MB GPU), the rail bridges' /
  landmarks' AO maps as 2.2 MB PNGs (`copyExternalImageToTexture` + mip generation on the GPU): KTX2 / JPG would cut
  both the download (~10 MB) and the GPU-process time.
- A ~2 s frame gap 3-4 s after the reveal appeared in most runs (also before this branch): not attributed yet.
- `?bootdefer=1` would save 37 MB before the cover once the landmarks' processing no longer makes long tasks (their
  material clones / fade variants, AUDIT step 11).
- The stills are golden hour whatever `?time=` the city boots with; re-shoot them when the city's look changes a lot.
- The tile cache stores ~37 MB per full tile in IndexedDB (600 MB cap, LRU); a first visit's stores are in the worker.

## 5. Boot3 (2026-11-15, branch `claude/boot3`): cover 20-22 s -> 13.0-13.3 s

**Machine state: GREEN / YELLOW** (preflight GREEN at the start; YELLOW for the final runs = only "another city server
listening"; the measured tab in front; local `tools/serve_nocache.py`). Final runs in FRESH isolated contexts (no
IndexedDB tile cache; no service-worker list locally), new and old alternated; "old" = every boot3 switch set back:
`?bootdefer=0&bootquiet=all&bootfull=1&fadedefer=old&tileshadowwarm=0&earlygate=old&colband=old&fadewarm=old&groundnote=old&aodecode=old`.

### What the cover really waited for

Measured first (a trace of the boot, `debug/bootTimeline.js`, `tools/boot3/profile.mjs`): the boot is **main-thread
bound**, not worker bound. In a traced 30 s boot the main thread was idle 0.7 s; node builds (three building TSL graphs
into WGSL) were 10.7 s of it (traced), the rest landmark GLB parsing / model building, collider slices, AO decodes, tile
landings. The chain to the cover was: the start tile (worker) -> **the early warm-up** (the `neighbours` stage waited
for its last chunk) -> **the first full neighbour's worker build** (H5, serial after I6: ~4 s) -> the boot warm-up,
whose quiet test (`awaitPipelinesQuiet`: the whole DEVICE quiet for 12 frames) **waited for the background compiles of
every landmark in Uccle** (Saint-Pierre / Villa van Buuren / town hall / public art jobs of 8-12 s: the precompile queue
builds about one shader per frame and the frames under the cover are slow), although a landmark outside the boot's ring
cannot be on screen at the reveal (it shows only with its home tile, and is added to the scene only once compiled).

### Changes (each behind a switch, rows in `viewer/features.js`)

| change | switch (= before) | effect |
|---|---|---|
| far landmarks / bridges after the cover, now **ON by default** (bootGate.js) | `?bootdefer=0` | ~40 MB and ~120 node builds less before the cover |
| the boot warm-up waits only for the FRAMES' pipelines + the compile jobs the first view needs (the tiles' `first` jobs, the models in the ring, the public art when a piece is within its drawing range of the reveal camera: `bootGate.js neededAtReveal / revealCheck`); under the cover those jobs go first in the queue (`warmup.js bootQuiet`) | `?bootquiet=all` | the cover no longer waits for far landmarks' shaders (nothing builds on a frame: each model is added once compiled) |
| **no full neighbour under the cover** (it was held at fade 0: the reveal frame showed its far tile anyway); the worker still builds it right after the start tile, it streams in after the reveal, its pipelines compiled before it shows | `?bootfull=1` | ~4 s off the `neighbours` stage |
| the early warm-up runs beside the neighbours' loading; the boot warm-up awaits it | `?earlygate=old` | 2-4 s off the `neighbours` stage |
| the start tile's fading copies compiled AFTER the cover (`warmup.js warmLater`: compileAsync + their shadow pass, 2 meshes a frame far under the city) | `?fadedefer=old` | ~1.0-1.5 s of the warm-up's forced frames |
| a streamed tile's shadow pass compiled before it shows (`warmup.js warmShadows`, 2 meshes a frame) | `?tileshadowwarm=0` | its first shadow node builds were one 60-100 ms frame at its landing |
| a held tile's OWN materials in the boot warm-up (`lodFade.js ownProxies`) | `?fadewarm=old` | (with `?bootfull=1`) the 9-16 node builds + sync pipelines ~1 s after the reveal (a 160-260 ms task) gone |
| drive colliders (tile worker, `colliders.js buildingBlocks`) and the landmarks' LOD0 car blockers (`heroColliders.js`): only the rows of wall samples that can fall in the 0.3-1.3 m car band | `?colband=old` | I6 drive colliders 1.47 -> 0.84 s (node); the SAME colliders: tile build hash-identical on I6, F4, C5, G7 (`profile.mjs --hash`), Saint-Job / Observatory blockers identical in the browser |
| the ramp-kerb test (`surfaces.js rampKerbPoints`) through a 2 m segment grid | (none: hash-identical) | ~0.2 s of I6's road stage |
| the tree kit's ground colour: `createImageBitmap` resize instead of drawImage + readback of each far orthophoto | `?groundnote=old` | 0.9-1.0 s of main thread (traced) |
| the rail bridges' AO PNGs decoded in a worker (`viewer/aoDecode.js`) | `?aodecode=old` | 0.38 s of main thread (traced) |
| the warm-up's log line says where its time goes (`settle / forced / quiet / pipelines / frames`) | | |
| tried, kept OFF: a second full-tile worker for the boot ring (`?bootworker=1`): the start tile built ~1 s slower beside it (CPU-bound), the cover did not move. Tried and removed: compile yields as plain tasks under the cover (a document.hidden / scheduler.yield override): no gain | | |

### Before / after (cold = fresh isolated context; return = the same context again, tile cache filled)

| run | cover | first tile | I6 worker done | long tasks before cover | node builds before cover | MB before cover | 20 s after the cover: long tasks, max | max frame gap | sync pipelines after cover |
|---|---|---|---|---|---|---|---|---|---|
| OLD cold (o1) | 20.1 s | 9.0 s | 8.5 s | 42, 13.8 s | 454, 7.1 s | 150.3 | 6, 0.71 s, 216 ms | 1,067 ms (3 > 250) | 30 |
| **NEW cold (n1)** | **13.2 s** | **7.4 s** | 7.1 s | **27, 7.0 s** | **242, 2.9 s** | **110.4** | 10, 1.22 s, 675 ms | 600 ms (1 > 250) | 10 |
| OLD return (o1 again) | 22.2 s | 7.6 s | 3.2 s (cache) | 50, 14.7 s | 472, 8.1 s | 149.8 | 9, 0.92 s, 188 ms | 600 ms (2 > 250) | 28 |
| **NEW return (n1 again)** | **13.0 s** | **4.7 s** | 3.4 s (cache) | 25, 6.9 s | 260, 2.8 s | 109.7 | 10, 1.12 s, 553 ms | 600 ms (1 > 250) | 10 |
| **NEW cold (n2)** | **13.3 s** | **8.0 s** | 7.7 s | 29, 7.4 s | 248, 2.9 s | 110.1 | 10, 1.26 s, 550 ms | 617 ms (1 > 250) | 10 |

Loader stages (n2, ms from navigation): data 27, renderer 509, materials 740, landmarks 2,026, tiles 2,064, tile 7,983,
neighbours 8,462, warmup 9,887, gpu 13,234, ready 13,314; warm-up 3.3 s (settle 0.56, forced 1.28, quiet 1.46).
`?tilecache=0` pairs in the same tab during the session: new 13.7-17.7 s (as the changes landed), old 21.0-22.8 s.
`?weather=old` on top of the new defaults: 15.5 vs 16.8 s (same moment): the weather's node graphs are still ~1.3 s.

Visual check: the same view at cover + 20 s, old vs new (screenshots in the session's scratchpad): the same city; the
new boot has fewer full tiles in at that moment (the fill-in after the reveal starts later: weak spots).

### The tile worker, step by step (node, `tools/boot3/profile.mjs`, median of 3 runs, the city's exact entry)

| step (ms) | I6 old | I6 new | F4 old | F4 new | C5 old | C5 new | G7 old | G7 new |
|---|---|---|---|---|---|---|---|---|
| **total** | 4826 | 4424 | 3413 | 3140 | 6051 | 5236 | 1721 | 1596 |
| roads | 1962 | 2031 | 1615 | 1618 | 2654 | 2478 | 722 | 710 |
| surfaces + width fit | 409 | 450 | 320 | 319 | 488 | 458 | 183 | 167 |
| road meshes + carve | 1039 | 1086 | 827 | 822 | 1369 | 1283 | 326 | 326 |
| **drive colliders** | 1471 | 844 | 737 | 535 | 1804 | 1058 | 317 | 309 |
| facade analysis | 819 | 832 | 336 | 400 | 996 | 940 | 61 | 53 |
| terrain simplify | 230 | 233 | 250 | 235 | 234 | 285 | 212 | 227 |
| road network | 197 | 221 | 195 | 194 | 373 | 349 | 72 | 67 |
| terrain weld | 166 | 161 | 178 | 161 | 167 | 165 | 95 | 88 |
| traffic graph | 126 | 118 | 123 | 137 | 184 | 182 | 95 | 92 |
| lane graph | 79 | 87 | 99 | 100 | 196 | 189 | 71 | 86 |
| land cover* | 84 | 95 | 107 | 94 | 78 | 92 | 95 | 92 |
| wall feet | 66 | 65 | 29 | 29 | 81 | 84 | 8 | 8 |

(* land cover / grass types: node paints on a no-op canvas; their browser times are in the worker log line. "old" = `--set colBand=false`; the kerb grid is in both.)

In the browser the worker is ~1.6x slower than in node (fetches, the real land-cover / grass canvases, the CPU shared
with the main thread, the far-tile worker and Dawn's compile threads): I6 7.1-7.7 s cold in the final boots.
`node --import ./tools/road_audit/register.mjs tools/boot3/profile.mjs I6 F4 --runs 3 [--set colBand=false] [--hash]`.

### The frame gap after the reveal (target 3)

Old boots had one to three 0.6-1.1 s gaps 1-3 s after the reveal: (1) the full neighbour held at fade 0 under the cover
ended its fade ~1 s after the reveal and swapped its OWN materials in: 9-16 node builds + sync pipelines in one frame
(fixed: no held neighbour by default; `ownProxies` when there is one); (2) frames held by the GPU process (LoAFs with
~30 ms of script: texture / GLB uploads of landmarks finishing just after the reveal). **Left in the new boot: one
0.55-0.68 s task 1-1.5 s after the reveal** = the first deferred landmark's GLB parse + model build on the main thread
(`Worker.onmessage@stpierreModel.js` -> GLTFLoader + its material setup; the town hall's too). The fix belongs in the
landmark loaders (parse / build in slices or in a worker); not done here (the landmark agents' files). The pond-water
shader's synchronous build on first sight (perf pass 2) was not reproduced or changed here (needs a flight to the
Wolvendael pond).

### Weak spots / next levers (boot3)

- **The weather's node graphs** (~1.3 s of the cover now, ~25 % of every node build): build the materials DRY when the
  boot weather is clear and weatherize them later through a compiled twin: clone, `wxMat` the clone, `compileAsync` it
  on stand-ins with the same geometries, then give the original the clone's colour / roughness / metalness / normal
  NODES (the same node objects = the same cache key: three reuses the twin's build, nothing builds on a frame); the
  fading copies (`fadeVariant`) and every material cloned from a weatherized one need the same. Not done: too many
  couplings for this pass.
- **The fill-in after the reveal**: the first full neighbour shows ~8-12 s after the reveal (before: it faded in ~1 s
  after, built under the cover): its compile waits in the single precompile queue behind the late fading-copy warm-up and
  any running landmark job (compileAsync jobs cannot be pre-empted). `?bootfull=1` = before.
- The tile worker is still ~7 s of the cover in the browser: roads (surfaces + width fit, meshes + carve) ~2 s, the
  facade analysis ~0.9 s (the per-building forEach: string keys / Maps in `smoother` and the face grouping), terrain
  simplify ~0.25 s. Shipping a prebuilt start tile would mean ~37 MB (the tile cache's record) per tile.
- The main thread, not the worker, is the limit: the return visit (tile cache: first tile 4.7 s) lifts the cover at
  13.0 s too.
- `[tilecache] read <T>: no answer in 8000 ms, cache off for this session` seen in a cold context (IndexedDB busy with
  the first visit's 37 MB writes): the cache then stays off for that session (boot2 mechanism).
- Not done: KTX2 for the big AO PNGs (40 PNGs over 300 KB, up to 5.3 MB, `models/*/*_ao.png`, uploaded as R8 + GPU mips;
  BC4 / UASTC would cut the download and the GPU-process time; `C:/Program Files/KTX-Software/bin/ktx.exe` is installed),
  the street-life atlas (16 x 2048x1024 RGBA).
- Measure on the live site (section 3) after the deploy: the remote downloads add to the `landmarks` / `tiles` stages.
