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

Round 3 changes so far (code only, not measured): `?compilepar=` (default 3 compile jobs in flight, 1 = before),
`?landmarksearly=old` (far landmarks load during the boot when the loader will hold), `debug/heapAudit.js` (what
holds the heap, by root / path, without a snapshot).
