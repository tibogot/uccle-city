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
const ab = await F.ab({ legs: 4 });                   // same-page A/B, out and back, ABBA (A = defaults, B = the switches below off, live)
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

Rules kept: no DynamicDrawUsage, no light added or removed, fixed pools; vendor/ untouched.

## Switches (rows in viewer/features.js, section Performance)

| switch | default | what |
|---|---|---|
| `fadeslice=old` | staged | a tile fade swaps every mesh at once (before); `fadeslicen=N` meshes a frame (32) |
| `disposeslice=old` | sliced | a retired tile frees all its meshes in one frame (before) |
| `proxyslice=old` | sliced | the falcon's landmark proxies in one task (before) |

Live (same page): `__fadeSlice.on`, `__disposeSlice.on` (what `F.ab()` alternates).

## Gate

Rule 22 (docs/QUALITY_RULES.md), `stutter` in tools/audit/mergeGate.mjs (tools/audit/stutterCheck.mjs: the real lodFade.js
on three r187 in node + the sources of main.js / cityStream.js), and the browser line FALCON STUTTER.

## Phase 2 protocol (browser turn)

1. tools/perf/preflight.ps1 + debug/preflight.js; one tab, in front.
2. `?game=falcon` boot, after the play loader: `F.ab({ legs: 4 })` (and page loads alternated default / `&fadeslice=old&disposeslice=old&proxyslice=old` for the boot-time paths).
3. Attribute every frame > 33 ms (`F.table`), fix what is left, re-measure; a DevTools trace of the worst frames when the cause is "GPU / compositor".
4. HEAP browser line (5 boots), the visual tour vs `uccle-tour/.tour/foundation` (not during the node gate), `node tools/audit/mergeGate.mjs`.

## Results

(phase 2)
