# Game performance + the play loader (branch claude/perfgame, 2026-11-16)

Owner's top items (docs/TODO.md "OWNER PLAYTEST 2026-11-16" 1-2): the police game "very laggy" with nothing else open;
at the start the scene was still filling in. This round fixes the HITCHES and the START. The steady per-frame CPU
(three's draw submission) is the follow-up job (see "Next").

## Machine / method
RTX 4050 laptop, 16 GB, Chrome, 1600x828 viewport, one tab (the only agent loading the city). Preflight **RED**: 1.1-1.8
GB free RAM (Chrome 5-8 GB with the owner's tabs, Cursor ~1.3 GB), CPU at rest 16 %. Measured anyway, alternating
before / after page loads: 3 repeats for the police game, 2 for the falcon, 1 for the default viewer. Read the spread,
not the second decimal. "Before" = the same build with every switch of this branch off:
`&asyncpipes=old&playloader=old&gameboot=old&streamorder=old&hudskip=old&holdworkers=0&rayswarm=old`.
Harness: `debug/gamePerf.js` (`bench()` = after the start: 20 s standing at the spawn, a 40 s drive from the station
towards Saint-Job at up to 58 km/h on a kinematic autopilot along the GPS route, a 30 s stolen-car chase; `falcon()`,
`idle()`); `tools/perf/trace_cpu.py` for traces. avg / 1 % low / worst = frame time (rAF), CPU = the main loop's ms,
GPU = timestamp queries, draws = renderer.info.

## Before / after (means of the repeats; ranges where they spread)

| run | variant | avg ms | 1 % low fps | worst ms | frames > 50 ms | CPU ms | GPU ms | draws | pipelines created |
|---|---|---|---|---|---|---|---|---|---|
| police: first 20 s at the spawn | before | 21.9 | 6.4 | 383-617 | 13 | 10.9 | 12.5 | 223 | 228-366 |
| | **after** | **18.1** | **22.1** | **50-100** | **3** | 11.5 | 13.4 | 359 | 15-34 |
| police: 40 s drive | before | 21.5 | 9.0 | 350-950 | 24 | 11.0 | 14.7 | 186 | 66-145 |
| | **after** | **19.5** | **19.9** | **67-83** | **9** | 12.6 | 14.0 | 264 | 5-6 |
| police: 30 s chase | before | 19.7 | 24.1 | 50-67 | 3 | 12.3 | 14.0 | 243 | 12-14 |
| | after | 19.9 | 19.1 | 67-83 | 6 | 13.4 | 14.6 | 295 | 2-10 |
| falcon: first 15 s | before | 27.0 | 3.0 | 917-967 | 31 | 11.8 | 9.9 | 125 | 201-269 |
| | **after** | **17.2** | **27.0** | **50** | **0.5** | 11.3 | 12.1 | 236 | 0 |
| falcon: 35 s flight | before | 24.0 | 7.5 | 300-400 | 33 | 12.9 | 12.4 | 189 | 422-502 |
| | **after** | **18.5** | **21.4** | **50-100** | **8** | 11.7 | 12.1 | 221 | 4-9 |
| viewer: overview, 10-30 s after the cover | before | 24.6 | 7.7 | 233 | 24 | 10.9 | 12.3 | 213 | 387 |
| | after | 23.7 | 8.9 | 200 | 16 | 10.3 | 13.6 | 205 | 376 |
| viewer: street walk (perfRun stjob) | before | 17.9 | 15.2 | 250 | 20 | 10.7 | 12.0 | 247 | 144 |
| | after | 17.7 | 16.8 | 233 | 10 | 11.1 | 12.1 | 247 | 126 |

Reading it:
- **Hitches gone in the games**: worst frames 350-970 ms -> 50-100 ms, 1 % lows 3-9 fps -> 20-27 fps, pipelines
  created while playing 66-500 -> 0-34 (and those are async now: no frame waits for them).
- **The steady cost did not move** (CPU 11-13 ms, GPU 12-15 ms a frame): "after" draws MORE (the station's whole area
  is built: 264 vs 186 draws in the drive) at the same CPU. The chase is within noise (the "before" ran with fewer tiles
  built). Cutting that cost is the follow-up job.
- **Default viewer: no regression** (it does not use the loader; its first seconds after the cover still compile in
  the background, the same in both).
- **Time to play** (page load -> control): police before 39-43 s (then ~25 s of the city filling in round the car, see
  `police_before_t0.jpg`: the car on bare ground, no station), after 63-70 s with everything built; falcon before
  18-20 s (then the worst start: 1 % low 3 fps), after 58 s (last build). The loader waits for the near full tiles
  (3-15 s each in the worker; E4 19 s uncached) and, after a game boot, for the far landmarks' staggered loads, so the
  first minute of play does not carry them.

## Causes found
1. **Sync pipelines mid-play = the big hitches.** Every synchronous `createRenderPipeline` (street-life fade copies,
   façade-kit far walls, ShadowMaterial_*, the haze's god-ray passes) lined up with a 150-950 ms frame.
2. **Game start**: `?game=police` booted Saint-Job then streamed the station in front of the player (only E4 full at
   spawn, the ring ~6 s a tile), and ~25 far landmarks / bridges loaded during the first minute of play.
3. **Steady CPU ~11-13 ms/frame** (CPU-bound): ~85 % is three r187's render submission (~350 main + ~120 shadow render
   objects at ~25-35 us each; shadow pass ~2 ms; updateMatrixWorld ~1 ms; instanceStream gather ~1 ms; the player's
   car 21 draws + 9 shadow; the station's patrol cars 30 shadow draws). GC: a minor GC every ~0.3 s (20-25 MB/s),
   pauses small. JS heap 1.5-1.9 GB (full tiles unload only 3 tiles away).
4. The drive mode's hidden speed line was rewritten every 6th frame in games (small).

## Changes (each with a ?x=old switch and a row in viewer/features.js)
| switch | what |
|---|---|
| `asyncpipes=old` | `viewer/asyncPipes.js`: after the boot, a new pipeline of the city scene is created ASYNC (hook on three's `Pipelines._getRenderPipeline`), the object shows a few frames later; bakes into a target with `.syncPipes` (weather overhead map) stay sync |
| `rayswarm=old` | `viewer/lighting.js` hazeHook: the god-ray passes (mask + 3 blurs, 4 MeshBasic pipelines of their own scene) drawn once under the boot cover; they were built sync the first time the sun came on screen (~17 s into every drive, a 100-120 ms frame) |
| `playloader=old` | `viewer/loader/playLoader.js` + `areaReady()` (main.js): game start (kit.startGame), Go to (camera placed via `after` first), map teleport. Holds until: the ring's full tiles within 300 m (550 m for an orbit / flight view), far tiles within 600 m (4 at a time), those tiles not fading, near landmarks' compile jobs done, no async pipeline pending, 8 quiet frames; after a game BOOT also the far landmarks' staggered loads + no > 200 ms frame for 1.5 s. Max 45 s (+25 s). The falcon game waits for the eyrie's area before its intro |
| `gameboot=old` | `?game=police` boots at the spawn (tile E4); the boot cover hands over to the play loader |
| `holdworkers=0` | up to 2 extra full-tile workers while the loader holds |
| `streamorder=old` | the ring tile nearest the player streams first |
| `hudskip=old` | the hidden drive HUD line is not rewritten in games |

## Visual checks (docs/perfgame/)
- `police_before_t0.jpg`: the old start, the car on bare ground (station, yard, trees not there yet).
- `police_loader.jpg`, `police_after_t0.jpg` / `_t8.jpg`: the loader, then the first frame after the fade and 8 s
  later: identical (no fill-in).
- `falcon_t0.jpg` / `_t6.jpg`: the eyrie start after the loader, then the launch: complete.
- `map_loader.jpg`, `map_t0.jpg` / `_t8.jpg`: a teleport to the Chaussée d'Alsemberg (walk): identical but for traffic.
- `goto_loader.jpg`, `goto_t0.jpg` / `_t8.jpg`: Go to Place Saint-Job from above: a few far blocks of the ring still
  cross-faded in after the fade (taken BEFORE the 550 m radius for orbit / flight views: recheck).
- Async pipelines: no flicker seen in the before/after frames (an object whose pipeline is still compiling is skipped
  whole for a few frames, not drawn half): watch for it while playing.

## Budget (police drive, after; ms per frame, main thread)
render submission (all passes) ~10-11 (scene ~8, sun shadow ~2, post ~0.5) · updateMatrixWorld ~1 · instance pools
(gardens / stops / furniture / street life gather) ~1 · lighting.update 0.25-0.35 · driver (physics + chase cam)
0.2-0.3 · minimap 0.1-0.15 · game kit < 0.05 · traffic ~0.1-0.2 · falcons / birds ~0.2. GPU 13-15 ms (TAAU at
~0.85 scale, dynamic resolution target 14 ms).

## Next (follow-up job, ranked by expected gain)
1. Draw count / CPU: merge the player's police car (21 -> ~3 draws), the yard's patrol cars (instanced, no shadow past
   LOD0), shadow casters only inside the shadow box; tile unload by distance (> tile + 200 m) instead of 3 tiles
   (heap 1.9 GB, per-tile updaters, shadow casters). Expected -2..-4 ms CPU.
2. The default viewer's first seconds after the cover (overview 1 % low 8 fps, ~380 pipelines): the same `settle` idea
   (or a short hold of the cover) for the free-roam boot.
3. Loader time: tiles take 3-15 s in the worker; throttle the frames behind the loader so the compile queue gets more
   time; the tile cache (first visit to E4 uncached = 19 s).
4. Measure again on a GREEN machine (RAM was the limit today).

## Round 2 (2026-11-16, after the citydefects merge; preflight GREEN, 1 run each unless noted)

"Before" = round 1 as merged = this build with the round-2 switches off:
`&carmerge=old&patrolmerge=old&lampcull=old&shadowfar=old&unloadgap=old&gamefast=old&boothold=old&compileboost=old&holdthrottle=old`.

| run | before | after |
|---|---|---|
| police, standing at the spawn (after the hold, 15 s): CPU ms / draws main+shadow / 1 % low | 11.0 / 300 + 190 / 30 fps | **8.9 / 238 + 151 / 59 fps** |
| police drive 40 s: CPU ms / draws / 1 % low / worst | 10.7 / 310 / 26.5 / 67 ms | 10.2-10.6 / 240 / 24-26 / 50-67 ms |
| police time to play (page load -> control) | 58.8-60.7 s | 52.9 s (settle all, default); 40.8 s with `?settlejobs=loads` (first 20 s: 1 % low 12.5 fps) |
| falcon time to play / flight CPU / draws / 1 % low | 59.0 s / 10.7 / 286 / 28.6 | 55.6 s / 10.2 / 239 / 27.4 (50 s with `?settlejobs=loads`, first 15 s 1 % low 12) |
| free-roam boot: page -> smooth city | cover 17-18 s, then ~30 s of stutter (1 % low 8-9 fps) | 56.8 s behind the loader, then 60 fps (1 % low 55-59); 29.9 s with `?settlejobs=loads` (first 20 s 1 % low 10) |
| full tiles after a 2 km drive / JS heap | 15 / 2.17 GB | 7 / 2.14 GB |

Reading it:
- **CPU -2.1 ms where the draws were** (the station: the police car kit 16 -> 5, the patrol cars 30 -> 2 per level, the
  lamps culled, the shadow depth trimmed: 490 -> 389 render objects). Away from the station the drive is -0.1..-0.5 ms:
  the remaining ~10 ms is ~7-8 ms of fixed per-frame cost (post chain, updaters, the shadow pass's own overhead, three's
  per-object refresh) + ~12-15 us per render object. The -2..-4 ms target is met at the spawn only.
- **Heap**: full tiles now unload by distance (15 -> 7 loaded) but the heap barely moves: it is NOT dominated by tiles
  (landmark GLB data, colliders, CPU copies of geometry kept after upload: next item).
- **Time to play**: the spawn's tiles now build during the boot (2 extra workers); what the loader waits on longest
  after that is the precompile queue of the ~25 far landmarks + bridges (194 jobs, ~37 s serial after the cover;
  compileboost / holdthrottle did not shorten it: the jobs wait on GPU pipeline compiles, one job at a time). Two
  defaults are possible: wait for them (smooth from the first frame, default) or not (`?settlejobs=loads`: ~10-20 s
  sooner, a stuttering first 20 s). The < 35 s target is not met without the stutter.
- Free-roam hold (`?boothold=old` to switch off): the default viewer now waits ~57 s instead of revealing at ~17 s.
  The owner should choose: this is the "no stutter" rule applied to the boot.

New switches (rows in viewer/features.js): `carmerge`, `patrolmerge`, `lampcull`, `shadowfar`, `unloadgap` + `unloadmargin`
(60 m), `gamefast`, `boothold` (`=ring`: the near ring in full too), `compileboost`, `holdthrottle`, `settlejobs`.

Checks: no console error on the police / falcon / free-roam starts; the merged kit looks the same with L on
(`docs/perfgame/kit_old.jpg` vs `kit_merged.jpg`: beacon, visor flash, grille heads, wig-wag); lamps culled by the
sphere of the lamps each LOD mesh draws (conservative; the shadow pass culls with the sun's frustum, same sphere).
NOT visually checked: the distance unload while driving out and back (it hands over to the far tile with the same
fade as before, > 560 m behind the player).

Next (ranked): (1) the far landmarks' compile queue (37 s serial): compile them during the BOOT under the cover in
parallel with the start tile, or overlap queue jobs on their pipeline wait (needs a safe split of r187's compileAsync),
or LOD2-only first; (2) the fixed ~7-8 ms per frame: profile the post chain and the shadow pass (half-rate static
shadow cache), three's per-object refresh; (3) heap: drop the CPU copies of static geometry after upload where no
collider / raycast reads them; (4) the per-tile street lamps into one city pool (6 meshes per tile).

## Round 3 (code first, 2026-11-16) — per-frame cost analysis (trace of the 40 s police drive, round-2 build)

Main thread ms per second of trace (tracing inflates call-heavy code ~1.5-2x; read the proportions):
| what | ms/s | note |
|---|---|---|
| three render submission, scene pass objects (`_renderObjects`) | ~430 | ~390 render objects a frame (main ~240 + shadow ~150): ~10-12 us each untraced; per object: bindings update (~120), node updates (~40), draw (~70), geometry attribute version checks (~40) |
| of which the sun shadow pass (`renderShadow`) | ~106 | ~150 objects; casters only in the light frustum since round 2 |
| `updateMatrixWorld` (the whole scene graph, every frame) | ~45 | compose ~16: objects with matrixAutoUpdate; `?freeze=1` (static tile layers) measured within noise |
| instance pools (gardens, stops, furniture, street life: `instanceStream` gather) | ~40 | time-sliced at 0.3 ms a frame; re-gathers every few m while driving |
| frustum culling (`project`, `intersectsObject`) | ~40 | |
| sky + haze + god rays (firmament update, hazeHook) | ~25 | |
| SSR + bloom + GTAO + TAAU passes (CPU side) | ~25 | |
| per-object node updates by type: lodFade / object fades, upscale motion matrix (2.4), kit fades | ~20 | |
| trees tick, roofs, plants, grass, falcons, flyer, minimap, map, traffic, car fleet | ~5-10 each | |
| an open `parallelPipelines` window (isReady wrapper on every draw) | ~4.6 | a landmark / flyer window never closed: close it |

So the "fixed" ~7-8 ms is mostly per-object submission (~390 objects), not post or updaters. Ideas, by gain:
1. Fewer render objects in the SHADOW pass: static casters into a cached shadow map re-rendered only when the box moves
   a texel / the sun moves (dynamic casters every frame into the same map: a second depth pass merged by min), or the
   shadow map at half rate while the camera is still: -1..-2 ms.
2. Per tile: merge the layer meshes that share a material across the 9 ring tiles (terrain, roads, walls, roofs are one
   material per layer: 1 draw per layer for the ring instead of 9) with multi-draw (viewer/multiDraw.js exists): -1..-2 ms.
3. Street lamps: one city pool (6 meshes per tile now) through instanceStream: -0.3 ms.
4. Close the stray parallel-pipelines window; landmark LOD2 in one draw (vertex colours, far only): -0.3..-0.5 ms.
5. matrixAutoUpdate = false on static objects under the tile and landmark roots (no compose per frame): -0.2..-0.4 ms.

Round 3 changes so far (code only, not measured): `?readysweep=old` (idea 4: the stale window wrapper dropped), `?compilepar=` (default 3 compile jobs in flight, 1 = before),
`?landmarksearly=old` (far landmarks load during the boot when the loader will hold), `debug/heapAudit.js` (what
holds the heap, by root / path, without a snapshot).

## Round 3 results (2026-11-16, browser; preflight RED at start (a transient 23 % GPU load), then quiet; 1 run each)

| run | round 2 (merged) | round 3 |
|---|---|---|
| police time to play | 52.9 s | **49.6 s** (49.7-54.6 over 3 loads), first 15 s 1 % low 53 fps, worst 33 ms |
| police at the spawn: CPU (cache vs `?sunshadowcache=old`, same build) | 9.8-10.2 ms | **7.7-8.8 ms** |
| police 40 s drive: CPU / 1 % low | 11.4 ms / 20.6 (cache off, same build) | **9.3-9.8 ms / 25-26** |
| falcon time to play | 55.6 s | **48.4 s** (`landmarksearly` off); 56.5 s with it on |
| free roam: page -> smooth city | 56.8 s | **48.9 s**, first 15 s 60 fps, CPU 7.1 ms |
| compile queue 1 -> 3 in flight + landmarks early (police) | 59.1 s to play | 40-42 s, but the first 15 s stuttered (ring still streaming): fixed by settling on the whole ring |

The sun shadow cache (`?sunshadowcache=old` = before): a frame that lays back the cache costs 0.33 ms of shadow pass, a
full static redraw 1.91 ms; ~11 % of frames redraw (box moved ~2 m, tile fades every 3rd frame, refresh every 30): the
shadow pass -1.5 ms, the frame -2 ms (spawn and drive). Checks: the shifted frame equals a full redraw at the same view
(pixel diff 0.19 % > 20, the TAA noise; with the shift's sign flipped 1.6 %: the test sees an error; images
`docs/perfgame/sunshadow_*.jpg`); no console / validation error; standing still, two frames 0.3 s apart differ by the
same TAA noise in the old path (no visible leaf-shadow motion to freeze). Stale-after-unload / LOD switch: covered by
the redraw triggers (tile fade, dispose, ~2 m of motion, 30 frames), not caught on screen.

Switches added in round 3: `sunshadowcache`, `sunshadowrefresh`, `compilepar` (3), `landmarksearly` (OFF: measured
worse), `settlering`, `holdparallel`, `readysweep`; tile cache read deadline 8 -> 2.5 s and connections closed on
versionchange (the IndexedDB never answered in this session, in every worker: still to find out why; a working cache
would cut the cover's start-tile build, 19 s for E4).

Findings for next jobs:
- **Time to play < 35 s is not reached** (48-50 s): the cover is 20-31 s (start tile built in the worker: the tile
  cache never answers here), then ~20 s of loader for the ring's 8 full tiles (2-11 s each, 3 at once now).
- **Material sharing**: 705 pipelines, 639 distinct programs, 878 materials in use; the landmarks clone each library
  slot per model (`wrapAO`: their AO texture + per-model look uniforms) -> 264 hero materials (stone_blue x14,
  glass_window x14, ...), each its own program. Sharing needs one wrapAO factory with the AO texture as a material
  parameter for all landmarks (a refactor across ~15 model loaders).
- **Heap 2.3-2.5 GB**: typed arrays reachable from the page = 781 MB (`debug/heapAudit.js`): three's render-object
  cache 425 MB of geometry (incl. 274 MB in 342 geometries no longer in the scene: warm-up / precompile stand-ins and
  bake proxies keep their render objects, and those keep the pipelines alive: dispatching 'dispose' on them would drop
  precompiled pipelines too), street life 74 MB, instance pools 64 MB, tree kit atlases 48 MB. The other ~1.6 GB is
  plain JS objects: needs a heap snapshot (2.5 GB: do it on a fresh machine).

## Round 4 (2026-11-16, browser; preflight RED: 29 % GPU busy at rest from another app, 1 run each)

**Tile cache.** Why the IndexedDB store "never answered": its deadline measured WALL time, and a tile worker holds
several requests at once: while one request's build ran (seconds without yielding), another request's cache read could
not even start -> past the deadline -> "cache off for this session" (it happened with an EMPTY cache too). Plus the
worker fetched its own 670 KB bundle to hash it, behind the boot's downloads. Fixed (Cache API store, default;
`?tilecache=idb` = before, `?tilecache=0` off): one packed blob per tile (viewer/tilePack.js keeps shared references,
buffers and views like a structured clone; checked: a cached I6 equals a fresh build field by field), the code hash
baked into the bundle by tools/build_worker.mjs, no "cache off" on a slow read (30 s safety net per tile), dependency
checks in parallel and once per URL, 404 dependencies cached as stable tags (they made tiles uncacheable), a byte cap
(800 MB) instead of a count (the far tiles pushed the full ones out). Disk: ~720 MB for the police ring + the far ring.

| second visit (cache filled) | before (tile build) | after (Cache API) |
|---|---|---|
| police: start tile stage | 12.8 s (worker build) | 5.5 s (read 0.5 s + the tile's main-thread work, waiting on kits) |
| police: cover / time to play | 29.8 s / 58.4 s (`?tilecache=0`) | 29.9 s / 55.7 s (and 62 s in one noisy run) |
| falcon: cover / time to play | 17.8 s / 55.4 s (first visit) | **14.6 s** / 51.3 s |

The cache works (a full tile reads back in ~0.5 s instead of 3-19 s), but the second-visit target (< 20 s) is far:
- the boot cover is now bound by the shader warm-up (early warm-up 436 drawables in 14.7 s, warm-up 11.2 s; it ran
  hidden behind the tile build before);
- after the cover the loader waits ~25-37 s for the far landmarks' compile jobs (settle): the serial precompile queue.
  `?compilepar=3` overlapped them but three r187's compileAsync is not re-entrant (an await inside a job's node build
  lets another job begin / finish the shared precompile state: "Cannot destructure ... _precompilationState" seen):
  back to 1 by default.

**Material sharing (debug/pipelineAudit.js).** 706 pipelines, 648 fragment programs, 881 materials. Landmarks that
build identical code ALREADY share (Saint-Pierre and the Russian church: glass_window, zinc_roof byte-identical,
one program). The remaining duplicates per slot (glass_window: 15 materials / 13 programs, stone_blue 15 / 10,
cast_iron_green 12 / 9, zinc_roof 11 / 8 ...) come from per-model shader features (streaks, moss, the thin-part fade,
AO floors, weather variants): unifying them changes those models' looks; ~100 programs could go at most. Not done.

Next (ranked): (1) the far landmarks' compile wall after the cover: compile their FAR LOD only at boot and the near
LODs / fading copies when the player comes within ~600 m, or a re-entrant wrapper around three's precompile state;
(2) the boot warm-up (~25 s of node builds across cover + early warm-up): cache generated WGSL per material key in
the Cache API (three would need a hook in NodeBuilder), or fewer distinct materials (the per-model features above);
(3) heap (round 3 findings).

## Round 6 (plan, code reading 2026-11-16): one shared ground / asphalt material across tiles

What the code does today (viewer/ground.js texturedGround, viewer/main.js terrainMesh, viewer/roadPaint.js asphaltMaterial):
- Each full tile builds its OWN ground material: its land-cover mask (DataTexture RGBA8 500 x 500, 1 m/px, no mips, or
  the SDF version), its orthophoto (ortho.jpg, the far colour), its bounds. The bounds are already UNIFORMS (the
  2026-11 fix: constants in the WGSL made every tile compile its own shader) and the scans are shared arrays (GT), so
  every tile's ground material builds the SAME WGSL: one program, one pipeline already (confirmed in round 4's audit:
  `ground:textured` 9 materials -> 3 programs, the 3 = render-pass variants). Same for the asphalt (per tile: its
  marking atlas texture only).
- So "one shared material" alone saves no pipeline; the only gain is in the DRAWS: 9 ring tiles = 9 terrain + 9 asphalt
  render objects in the scene pass (terrain casts no shadow, receives only) -> 2 with a merge. At ~10-12 us a render
  object: ~0.15-0.2 ms a frame.

What a merge needs (all of it, or no gain):
1. per-tile data as LAYERS: the masks in a DataArrayTexture (500 x 500 x N, RGBA8, linear, clamp: the same filtering /
   edges as now, so no new seam), the orthos in a second array (decoded to RGBA8 per tile: createImageBitmap + an
   OffscreenCanvas read in a worker; all orthos the same size), the marking atlases in a third (R8, equal sizes needed:
   today they are sized per tile), N fixed slots (ring 9 + hysteresis), one layer uploaded per tile (three r187
   `addLayerUpdate`), bounds in a uniformArray indexed by slot;
2. the slot per vertex (an `aTile` attribute written into the terrain / road geometry at load);
3. ONE draw for the layer: a BatchedMesh (r187: multi-draw in one render object, per-instance culling) holding each
   tile's terrain geometry as an instance, the asphalt likewise;
4. and what the per-tile meshes do now must move onto the batch: the tile's dithered fade-in / fade-out (lodFade swaps a
   FADING COPY of the material per object, Fader drives a per-object fade uniform: per instance in a batch = an
   instance attribute + a fading variant of the shared material), the per-cell culling of the tile meshes
   (viewer/cellCull.js onBeforeRender per pass), the interior house cut, the weather wrap, the lamp light map
   (addLampLight: per-tile ground light texture = a 4th array), the A/B ground (viewer.groundAB), contour lines.

Verdict: ~0.2 ms for a refactor that touches the tile fade, cell culling, lamp light maps and three texture families,
with seam / filtering risk at every tile border. Not started: the per-frame CPU is better spent on (ranked):
- the far LOD of each landmark in ONE draw (8-16 draws each today: bridge-verrewinkel lod2 8, observatory 10, police 16
  at the spawn, ...): merge each far level's meshes by material into vertex-coloured single meshes is a look change;
  a per-landmark BatchedMesh of its far level keeps the materials only if they are one: needs the per-slot materials
  unified first (round 4 audit: per-model shader features) -> start with the hero bridges (one material per slot);
- the street lamps as one city pool (6 instanced meshes per tile today, culled since round 2): -0.1..-0.3 ms;
- the shadow pass's movers (round 3: the player's car, traffic, trams drawn every frame): already small.
If the owner wants the ground merge anyway, the order above (1 -> 4) is the plan, behind ?groundshare=old, with a
border-seam check (screenshots across all four borders of a tile at 1 m, 50 m, 300 m) and the A/B pixel diff.

## Rounds 5-6 results (2026-11-16, browser; preflight RED: CPU 29 % / GPU 32 % busy at rest, the owner's session; 1 run each)

| check | before | after |
|---|---|---|
| boot crash found + fixed | round 5 code put the staged-compile setup in `loadTile` instead of `main()`: the boot stopped at "Placing the landmarks" (never merged) | fixed (b1931ef3) |
| police time to play, `?stagedlod=old` vs staged | 51.0 s | 48.8 s (one later run 59.8 s: machine busy) |
| staged landmarks at a police boot | all 25 compile in full | 16 far ones compile their far LOD only; flying toward the town hall released 8 of them as they came within 1000 m |
| early cover warm-up (`__earlyChunks`) | 10 chunks, render-call time 3.9 s (the rest of its 14.7 s is the GPU drain between chunks): Saint-Job + falcons 0.5 s, street life 0.55 s, plants / stops / roofs / kit 0.8 s, Stalle / Saint-Pierre 0.5 s, Russian / town hall / Wolvendael 0.4 s | not trimmed: each is on screen at the Saint-Job start or right after it |
| lamp pool (Place Saint-Job, eye level): lamp draws main / shadow | 12 / 6 | 6 / 0 (pool + sun shadow cache); pixel diff vs per-tile lamps: 0.09 % > 20 |
| hero bridge far LOD (Saint-Job rail bridge at 540 m) | 3 draws | 1 draw; pixel diff in a x10 zoom of the bridge: 0.8 % > 20 (TAA / trees), same colours (docs/perfgame/farlod_bridge_old_merged_diff.jpg): ON by default |

Where time to play goes now (police, cache warm): cover 24-30 s (tiles 5 s, neighbours 6 s, warm-up 10 s), "Getting
ready" 5 s (game kit, car), the ring's 8 full tiles 15 s (main-thread tile steps + their compile jobs: 22-30 jobs in
the queue the whole time), the landmarks' settle 5-9 s. Not under 35 s. Next: the ring tiles' compile jobs (their
fading copies compiled later, after the reveal, like the start tile's: `warmLater`), the game kit's 5 s, and the
landmarks' far-LOD AO-free bake for the landmark far merge (their wrapAO bakes the AO map into the colour).
Not checked: night lamp shadows with the pool (the pool's near bucket joins the lamp shadow layer by itself).

## Round 7 (code, 2026-11-16; not measured yet)
1. **Tiles under the loader at once** (`?holdfast=old`): while the play loader covers the screen, a landing tile is shown at once (no fade): its materials get built in the hidden frames, its fading copies (`fadeProxies`) are compiled in the background through the precompile queue, so they are ready before the first fade after the reveal (no first-draw builds).
2. **Game code during the boot** (`?gamepreload=old`): a `?game=` start imports the game kit (cityGame.js), the game (policeGame.js / falconGameDef.js) and the faceted police car pack during the boot instead of after the cover. Timing marks now land in `globalThis.__gameTimes` (start, cover->kit, waypoint, map wait, spots, car install, props + warm, spawn) to see what of the 5 s still blocks.
3. **Landmarks' far LOD in one draw** (`?farlodlm=1`, OFF until pixel-diffed): the 12 landmarks' wrapAO now keeps the AO-free colour graph (`material.userData.farBase`) and its AO setup (`userData.farAO = { aoTex, look }`). farMerge.js bakes slot means from farBase and re-applies AO the wrapAO way (AO map x vertex AO `COLOR_0.g`, aoStrength into aoNode, aoDirect into the colour). The renderer comes from `setFarMergeRenderer` (main.js). heros (statue wrapper) left out.

Browser checks to do: time to play police / falcon with and without `holdfast` + `gamepreload` (alternate), `__gameTimes` breakdown, no pipeline builds on first draw after the reveal (pipelineAudit), `?farlodlm=1` pixel diff of each landmark at its far distance + draw counts.

## Round 7 results (2026-11-16, browser; preflight RED: CPU 26 % / GPU 27 % busy at rest from another app; alternated, 1-2 runs each)

Time to play now read from `__playAt` (playLoader.js stamps the moment the loader fades out); `__gameTimes` = ms after the cover.

| check | before (`?holdfast=old&gamepreload=old&gamelazy=old&panelwait=old`) | after (default) |
|---|---|---|
| police time to play (cover at) | 52.2 s (27.5 s): 24.7 s after the cover | 48.5 s (26.3), 49.3 s (28.6), 48.5 s (28.0), 52.4 s (31.1): 20.5-22.2 s after the cover |
| falcon time to play (cover at) | 53.2 s (19.6 s): 33.6 s after the cover | 45.2 s (16.2 s): 29.0 s after the cover |
| cover -> game kit started | 2.6-3.0 s (dev panel 0.35-0.6 s, then the police AND falcon game code, 1.6 s for the falcon's) | 0.3-0.6 s (`gamelazy`, `panelwait` added this round after the marks showed it) |
| police "spawn" (teleport + area under the loader) | 20.4 s | 14.8-16.7 s (`holdfast`) |
| sync pipelines during a 25-30 s police drive after the reveal | - | 0 (25-31 shader modules, all async) |
| landmarks' far LOD draws (`farlodlm`) | 5-16 each, 117 for the 13 landmarks | 1 each (13); Van Buuren left out (its last level shows from 55 m: flat means read as flat there) |
| `farlodlm` same-page A/B at 800 m, x10-x20 zoom | | same colours (mean RGB within 1-2 levels); pixels > 20: 0.3-4.4 % (texture detail) on 9 landmarks; 10-25 % on police / St-Pierre / Wolvendael / Russian / Latour from trees and tiles streaming in between the two shots (docs/perfgame/r7_farlodlm_*.jpg) |

Found + fixed on the way (farMerge.js): a mesh with its own transform had its SHARED positions moved by `applyMatrix4` (bridges were all identity, landmarks are not): now copied first. A slot bake after the boot drew nothing on the first try (a new pipeline still compiling: target left at its clear alpha 0): now redrawn until alpha is 1 (2 s cap). Load-time bakes checked equal to the A/B ones (town hall brick 0.211 / 0.089 / 0.053).

Remaining: the cover itself (26-31 s on this busy machine) and the area wait under the loader (15 s: the ring's 8 full tiles + landmark settle) are the two big blocks; under 35 s needs the cover cut, not the game setup any more. One police drive had a 306 ms frame with 40 ms of script (GPU / compositor stall with the other app busy), not reproduced.
