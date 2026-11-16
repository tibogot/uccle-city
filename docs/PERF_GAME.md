# Game performance + the play loader (branch claude/perfgame, 2026-11-16) — HANDOVER (paused for a laptop restart)

Owner's top item (docs/TODO.md "OWNER PLAYTEST 2026-11-16" 1-2): the police game "very laggy"; the scene filling in at
the start. Measurements were taken while ANOTHER agent's city (port 8812) rendered in the same Chrome / GPU process
(preflight YELLOW): GPU ms and some 0.5-1.7 s frame gaps are contaminated by that tab (trace: its renderer took the GPU
process' turns while ours waited, no work on our threads). CPU / pipeline / draw numbers are reliable. Redo the A/B
tables on a GREEN machine.

## Tools (new)
- `debug/gamePerf.js`: `police({ seconds, chase })` (KINEMATIC autopilot along the map worker's GPS route from the
  station: the car physics, traffic, streaming, HUD all run; repeatable, cannot get stuck), `falcon()`, `idle()`, `brief()`.
  Reports frame avg / p99 / 1 % low / worst / >33 / >50, loop CPU, GPU, draws, tris, pipelines created (sync ones with a
  stack), long animation frames with script attribution, GC drops, tile events, per-updater ms.
- `tools/perf/trace_cpu.py trace.json.gz [--incl]`: main-thread self / inclusive time per function, GC.

## Found (police drive, default settings, 1600x828)
1. **Sync pipelines mid-play = the big hitches.** Each synchronous `createRenderPipeline` (streetlife-box:fade, walls
   (kit, far), ShadowMaterial_*, MeshBasicNodeMaterial x4) lined up with a 150-800 ms frame. First 15 s after the
   spawn: 153-253 pipeline/shader creations.
2. **Game start: the city boots at Saint-Job (I6) then teleports** to the station (E4): only E4 full at spawn, the ring
   tiles stream in for ~25 s in front of the player (6 s each), and the ~25 far landmarks / bridges load after the cover
   (long tasks 0.7-1.4 s) during the first minute of play.
3. **Steady CPU ~11-15 ms/frame** (CPU-bound, GPU ~8-13 ms here): ~85 % is three r187's render submission
   (~350 main + ~120 shadow render objects at ~25-35 us each; shadow pass ~2 ms; updateMatrixWorld ~1 ms;
   instanceStream gather ~1 ms; the player's police car = 21 draws main + 9 shadow; the station's 5 patrol cars 30
   shadow draws). GC: minor every ~0.3 s (20-25 MB/s garbage), pauses small. Heap 1.5-1.9 GB (tile hysteresis keeps up
   to 5x5 full tiles: unload only at dist >= 3).
4. Drive HUD innerHTML rewritten every 6th frame while the game hides it (small).

## Done (commits on claude/perfgame; every change has a ?x=old row in viewer/features.js)
- `viewer/asyncPipes.js` (`?asyncpipes=old`): after the boot, a new pipeline for the city scene is created async (hook on
  three's `Pipelines._getRenderPipeline`; the boot / landmark windows swap backend.createRenderPipeline and dropped a
  wrapper there). Bakes into a target with `.syncPipes` (weather overhead map) stay sync. Result in the 45 s drive:
  sync pipelines 14 -> 0 (only 4 MeshBasic of another scene left, see next), worst frame 416-933 ms -> 117 ms,
  frames > 50 ms 22-36 -> ~22 (noise from the other tab).
- PLAY LOADER `viewer/loader/playLoader.js` (`?playloader=old`) + `areaReady()` in main.js: game starts (kit.startGame),
  dev-panel Go to (camera placed via `after` before the check), map teleports. Holds until: full tiles within 300 m,
  far tiles within 600 m (loaded 4 at a time), those tiles not fading, near landmarks' compile jobs done, no async
  pipeline pending, 8 quiet frames; after a game BOOT also the far landmarks' staggered loads done + no >200 ms frame
  for 1.5 s (`settle`). Extra 2 tile workers while it holds (`?holdworkers=0`). Max 45 s (+25 s settle).
- `?game=police` boots at the spawn (tile E4, `?gameboot=old`); the boot cover hands over to the play loader.
- Streaming: nearest wanted tile to the player first (`?streamorder=old`; float tie bug fixed with Math.round).
- Hidden drive HUD not written in games (`?hudskip=old`).
- Last measured police boot (uncommitted-before-pause state, now committed): cover 35 s -> loader "Ready" 71 s;
  first 15 s of play after it: worst frame 117 ms, 2 spikes > 70 ms (before: first 20 s of play had 253 pipelines,
  worst 567 ms, the ring filling in visibly; and with the loader but no settle: worst 900 ms, 13.8 fps).

## Next (in order)
1. GREEN-machine A/B: `G.police({seconds:45})`, `G.police({chase:true})`, `G.falcon()`, default viewer
   (`debug/perfRun.js` stjob / orbit), old vs new (`?asyncpipes=old&playloader=old&gameboot=old`), fill the tables here.
2. Check the falcon game start + a Go to + a map teleport by eye (loader shows, no fill-in, fade OK); screenshots
   before/after the same views (DEFECT EYE: async pipelines = an object a few frames late, check no flicker).
3. The 4 MeshBasicNodeMaterial sync pipelines ~17 s into every drive (another scene, new materials each time: find the
   bake that makes new materials; likely periodic).
5. Tile hysteresis: unload by distance from the player (e.g. > tile + 200 m) instead of dist >= 3 tiles (heap 1.9 GB,
   per-tile updaters, shadow casters).
6. CPU per frame: merge the player's police car (21 -> few draws), patrol cars instanced/merged + no shadow LOD1+,
   shadow casters near the box only, instanceStream gather cost, updateMatrixWorld on static tile groups.
7. Loader time: tiles take 3-15 s each in the worker (E4 19 s uncached); throttle rendering behind the loader to give
   compile slices more time; budget table per feature (ms) into this doc.
8. Remove the debug fields (st.missing, compileJobNames) once stable, or keep them in the time-limit log line only.
