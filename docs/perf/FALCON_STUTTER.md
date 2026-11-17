# Falcon flight stutter (branch claude/falconstutter, 2026-11-17)

Goal (owner: performance first): a smooth falcon flight. During a 60 s scripted flight over the city after the reveal:
**no frame over 50 ms, p99 under ~25 ms, steady CPU not worse.** Earlier rounds (docs/PERF_GAME.md perfgame, perf8, perf9;
docs/perf/AUDIT.md steps 1-3, 11) took the worst frames from 300-967 ms to ~50-100 ms; what is left lines up with tiles
streaming in and out.

## The harness: `debug/falconStutter.js`

```js
const F = await import("/debug/falconStutter.js");   // ?game=falcon, after the play loader
const r = await F.run({ seconds: 60 });               // r.summary, r.long (frames > 33 ms with their causes), r.causes
F.table(r);                                           // the long frames as rows
const ab = await F.ab({ legs: 4 });                   // same-page A/B, out and back, ABBA (A = compile slices on, B = off, live)
```

- **The flight**: the flight model's step replaced for the run by a kinematic one (as debug/gamePerf.js does for the
  police car): Place Saint-Job -> Parc de Wolvendael -> Chaussée d'Alsemberg (Chaikin-smoothed, 2.3 km), 165 m TAW
  (~65-95 m over the ground), speed = length / seconds (60 s: ~38 m/s, a fast falcon); bank from the turn rate. The game
  runs as when playing (bird pose, chase camera, pigeons, hunt, HUD, sky flocks). Same route, height, speed every run.
- **Per frame** (rAF interval): ms, the main loop's CPU, render() CPU, the most expensive updater, full / far tiles in
  and out, the viewer's log lines, pipelines created (sync / async), node builds (count, ms), render objects created /
  disposed, GPU calls (buffers created / destroyed + MB, writeBuffer MB, texture MB, bind groups, submits), JS heap
  drops (GC), fades running, staged-reveal / sliced-dispose activity, compile jobs left; long animation frames with
  their scripts matched afterwards. `causes()` tags each long frame (most likely first); a frame with no script and
  nothing counted is "GPU / compositor" (then the previous frame's work is shown).
- GC: `performance.measureUserAgentSpecificMemory` needs cross-origin isolation (not here): heap drops > 3 MB between
  frames stand for a GC; a DevTools trace of the worst frames is the confirmation.

## Candidate causes (code reading, phase 1)

| # | candidate | evidence in the code | fix here |
|---|---|---|---|
| 1 | **Tile fade = a burst of render objects.** A fade-in swaps EVERY mesh of the tile to its fading copy in one frame (lodFade.js swapIn) and back in its last frame (restore). three r187 keys a render object by (object, material, render context, lights[, source material in the shadow pass]) (RenderObjects.get) and makes it at the first draw: bindings, per-object uniform buffers, bind groups. The precompile builds node graphs + pipelines (shared by key) but its render context is keyed by call depth (RenderContexts.get), so the real objects' render objects in the scene pass (if the post chain renders it at another call depth: to confirm in the browser, the harness counts render objects made per frame) and in the shadow pass are made by the frames. A tile = hundreds of meshes x 2 passes, twice per fade. | AUDIT step 3: the spikes did not follow the MB of uploads (bind-group / render-object counts were not measured); the 50-100 ms frames left line up with tile events | **`?fadeslice`** (lodFade.js stageIn + Fader): before the fade the meshes enter the passes 32 a frame behind a hidden stand-in material, at fade 0 (drawing nothing), the sun shadow cache marked dirty each slice; after the fade-in the own materials come back 32 a frame (at fade 1 the copy draws every pixel: no visible change) |
| 2 | **Retired tile freed in one frame**: the fade-out's last frame disposes every geometry / material of the tile (render objects of every pass dropped, GPU buffers destroyed) | main.js loadTile dispose | **`?disposeslice`**: out of the scene at once (rule 15), freed <= 48 meshes / 1.5 ms a frame (disposeLater) |
| 3 | Tile landing slices on the main thread (façades, trees, furniture, parked cars, kit / roof pools in the show step) | loadTile `frame()` slices: "longest slice" in its log line | measure first (the harness keeps the log line with the frame) |
| 4 | Far tile landing unsliced: features.json parse + far tree field + preCompile in one task | main.js loadLiteTile | measure |
| 5 | Landmarks' near LODs released while flying (stagedCompile.js: within 1000 m or 25 s ahead: the Wolvendael château on the route): compileAsync node builds (a single material build 5-17 ms, not split) + their geometry uploads (MB in one frame) | warmup.js precompile, stagedCompile.js release | measure (node-build ms, new-buffer MB per frame) |
| 6 | Retire's fading-copy compile for leaving tiles (`compileFor(px, { first })`) | main.js retire | measure |
| 7 | Falcon systems: landmark height proxies read whole on the main thread (cityStream.js addProxy, during the first ~2 min); a pigeon flock built when the camera comes within 900 m of a square (the Wolvendael lawn is on the route: Pigeons + warm()); the lift grid's blur passes run whole inside the 1.5 ms budget loop; gpuPrey read-backs | cityFlyer.js background / syncSquares, cityStream.js updateLift | **`?proxyslice`**: proxies in <= 3 ms slices; the rest: measure |
| 8 | GC: heap 1.5-1.9 GB, ~37 MB of arrays per full tile build | docs/PERF_GAME.md round 9 | measure (heap drops), trace the worst |
| 9 | Render-object sweep (roSweep.js) every 5 s, up to 400 disposals in one task after tiles retire | its log line "render-object sweep ... ms" | measure |
| 10 | GPU-process stalls with no script: texture uploads + mipmaps (orthophotos per tile), bind group bursts | AUDIT step 3 | after 1-2, re-trace with the GPU categories if still there |

(Phase 2 measured candidates 1, 2 and the proxies as NOT causes: those fixes were dropped; the causes found are in Results.)

Rules kept: no DynamicDrawUsage, no light added or removed, fixed pools; vendor/ untouched.

## Switches (rows in viewer/features.js, section Performance, sub "Stutter")

`slicesplit`, `dropslice`, `herosslice`, `compileslice` (+ `compileslicems`, 4; live `window.__fineCompile.on`), `warmmover`,
`stagedshadow`, `grassbake`: `=old` = before. (`fadeslice`, `disposeslice`, `proxyslice` of phase 1: dropped, see Results.)

## Gate

Rule 22 (docs/QUALITY_RULES.md), `stutter` in tools/audit/mergeGate.mjs (tools/audit/stutterCheck.mjs: fineCompile and the
heap-drop slices run on stand-ins in node, the other fixes by their sources), and the browser line FALCON STUTTER.

## Phase 2 protocol (browser turn)

1. tools/perf/preflight.ps1 + debug/preflight.js; one tab, in front.
2. `?game=falcon` boot, after the play loader: `F.ab({ legs: 4 })` (and page loads alternated default / `&fadeslice=old&disposeslice=old&proxyslice=old` for the boot-time paths).
3. Attribute every frame > 33 ms (`F.table`), fix what is left, re-measure; a DevTools trace of the worst frames when the cause is "GPU / compositor".
4. HEAP browser line (5 boots), the visual tour vs `uccle-tour/.tour/foundation` (not during the node gate), `node tools/audit/mergeGate.mjs`.

## Results (browser turn, 2026-11-17)

Machine: preflight YELLOW (5.2 GB free; CPU / GPU idle at rest, no throttling), page check YELLOW (no baseline file;
CPU bench 72 ms, fixed view GPU 12.8 ms). One tab, local `tools/serve_cached.py`, a fresh tab per variant, `?game=falcon`,
the flight started 5 s after the play loader. "Before" = this build with every kept switch off
(`&slicesplit=old&dropslice=old&herosslice=old&compileslice=old&warmmover=old&stagedshadow=old&grassbake=old`; the
first two before-runs predate the last switches, which did not exist yet = before as well).

### First flight after the reveal (60 s, Saint-Job -> Wolvendael -> Alsemberg, 2.3 km at 38 m/s, 165 m TAW)

| run | p50 | p99 | worst | > 20 ms | > 33 ms | > 50 ms | > 100 ms | CPU p50 / p99 |
|---|---|---|---|---|---|---|---|---|
| before 1 | 16.7 | 49.9 | 300 | 215 | 47 | 12 | 2 | 8.8 / 24.7 |
| before 2 | 16.7 | 49.8 | 319 | 211 | 52 | 13 | 1 | 9.3 / 25.3 |
| before 3 | 16.7 | 50.0 | 300 | 231 | 47 | 19 | 1 | 8.9 / 26.3 |
| after 1 | 16.7 | 33.4 | 83 | 123 | 13 | 3 | 0 | 8.7 / 24.4 |
| after 2 | 16.7 | 33.4 | 67 | 133 | 25 | 6 | 0 | 8.6 / 24.5 |
| after 3 | 16.7 | 49.9 | 83 | 142 | 42 | 12 | 0 | 9.0 / 23.2 |
| after 4 (HEAP boot) | 16.7 | 33.4 | 83 | 123 | 33 | 7 | 0 | 8.9 / 22.5 |
| **mean before / after** | 16.7 / 16.7 | ~50 / ~33 | 300-319 / 67-83 | 219 / 130 | 49 / 28 | 15 / 7 | 1.3 / 0 | 9.0 / 8.8 |

Second flight on the same page (reversed, everything compiled): before 27-30 > 33 ms, 6-8 > 50 ms, worst 100-500 ms;
after 8-20 > 33 ms, 5-9 > 50 ms, worst 67-183 ms (the 183 ms: no script, GPU / compositor).
`?compileslice` alone, same page, live ABBA (2 legs each): > 33 ms 79 -> 35, > 50 ms 27 -> 10, > 100 ms 5 -> 0.
Steady CPU not worse (main loop p50 8.6-9.0 ms both). GPU 7.9-10.6 ms p50 (noise).

**Goal not reached yet**: 3-12 frames > 50 ms remain per first flight and p99 is one missed vsync (33.4 ms), not < 25.

### Causes found (each: why / rule / check: rule 22, gate `stutter`)

| cause (measured) | why it happened | fix (switch) |
|---|---|---|
| Square des Heros dolomite + lawn: one 290-345 ms task (traced: herosGround.js lawnGeometry + terrainTrianglesIn) when its park tiles came in, ~50 s into the route | a scripted ground built synchronously "once the tiles are in" = while the player moves in | generators in <= 4 ms slices (`herosslice`) |
| compile slices: three's compileAsync works 8 ms + a node-build stage (20-30 ms builds) on top of a ~9 ms frame: dozens of 34-50 ms frames | three's CompileScheduler interval is fixed at 8 ms | node builds yield between stages after 4 ms while playing (`compileslice`, `compileslicems`) |
| landmark LOD fading copies' SHADOW builds on screen (Saint-Pierre, town hall, Russian church, police station: 4-5 sync builds, 44-52 ms frames) | the shadow-warm stand-ins (`*-warm` groups) were static casters for the sun shadow cache (perfgame round 3), drawn only on its full redraws: most were never drawn in the shadow pass | `*-warm` groups are movers (`warmmover`); a released staged landmark's shadow pass is warmed (`stagedshadow`) |
| heap-drop check: 24-58 ms tasks every second while tiles stream (bounds of every newly uploaded geometry) | one tick did the whole pending set | <= 3 ms a task, continued 50 ms later (`dropslice`) |
| tile landing "tram" step 25-90 ms (tram + stops + furniture + street kit + fuel + gardens + plants in one frame) | one frame() between steps that grew with every data layer | frames between them (`slicesplit`): longest slice now "gardens" 18-40 ms |
| grass field re-bake 35-45 ms at tile changes, 80 m up | the bake ran before the "blades can show" test | baked only while blades can show (`grassbake`) |

Dropped (did not measure): the staged tile reveal / sliced material restore (`fadeslice`): the before-runs showed no
render-object bursts at fade starts / ends (0-10 a frame: the precompile already makes them); the sliced tile dispose
(`disposeslice`): 100 MB destroy frames were 16-33 ms; the sliced landmark proxies (`proxyslice`): <= 10 ms each.
So the sun shadow cache redraws were not touched (520-610 full redraws per 60 s, before and after).

### Left (ranked, all attributed by the harness)
1. `walls (kit, far):fade` SHADOW build on a retiring tile: 31-56 ms, 1-2 per flight. The kit walls have more vertex
   attributes than three caches a build for (object-specific): a stand-in cannot warm it; options: a fade-out that keeps
   the plain material's shadow (castShadowNode), or fewer kit-wall attributes.
2. Major GC: 450-1170 MB heap drops, 50-100 ms pauses (1-2 per flight); allocation per tile (worker results, typed arrays).
3. Tile landing "gardens" slice 18-40 ms (cityGardens.addTile with the lane / clear-ring tests per piece): slice inside it.
4. `streetlife-box:fade` main-pass sync build 8-9 ms per tile (per-tile material).
5. Hero collider poll 37-66 ms (heroTriangles of a landmark's LOD0 in one go); rare GPU / compositor stalls (no script) 50-183 ms.

Checks: HEAP line (5 boots: `?gamemenu=0&orbitcam2=old`, default, `?gamemenu=0&tilecache=0`, `?game=police` + 45 s
drive, `?game=falcon` + flight): 0 console errors, 0 WebGPU errors, `__heapDrop.tripCounts` {}. Visual tour run
`falconstutter` vs `foundation`: 21 / 22 ok, `traffic-alsemberg` flagged (a moving car in the baseline frame, not in the
run: the same 89.5 % cell flag as the mdraw run; no other view changed). Node gate: all pass.
