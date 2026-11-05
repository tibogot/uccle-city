# Perf + dev panel pass (branch claude/perf-panel, 2026-11-05/06)

Three tasks: (1) dev panel re-audit after the car-fleet and smooth-LOD merges, (2) the start-up / streaming freezes,
(3) the street-level GPU cost the smooth-LOD merge added. Base for every A/B: `claude/foundation` 90d2758.

## How to measure (tools in `debug/`)

- Serve with `Cache-Control: no-cache`: python's plain `http.server` let Chrome serve STALE js from its heuristic
  cache (edits did not load). Any static server that sends that header; the base was served from a `git archive
  90d2758` copy on another port with `data/` linked in.
- `debug/bootProbe.js`, injected before the page (Chrome DevTools `navigate_page` initScript:
  `(function(){var x=new XMLHttpRequest();x.open('GET','/debug/bootProbe.js',false);x.send();(0,eval)(x.responseText);})();`):
  long tasks, long animation frames (with blocking time and scripts), every frame time, every GPU pipeline created,
  the console log with timestamps; `__probe.report()`. It installs `debug/renderProbe.js` once `window.viewer` exists:
  per frame node builds (`(pre)` = inside a compileAsync), attribute / texture uploads with the mesh they belong to.
- `debug/moveTest.js`: `run({ mode: "walk" | "fly" | "glide", seconds })`, frames over 17.5 / 25 / 34 ms while moving.
- `debug/panelAudit.js`: the dev panel controls driven through the panel, engine values / URL / picture checked.
- `debug/gpuAB.js`: `measure()` and `alternate(a, b)` (live A/B in one page, alternating, so both see the same
  background GPU load).

**The machine was shared** during most of this work: another agent's Blender (Cycles, 30-95 % of the GPU), its
Interior Lab and later its own city tab, and the laptop GPU at 80-83 °C with power / thermal throttling. GPU times
swung 11-27 ms for the SAME view (an A/A alternation gave ±3 ms), so only main-thread numbers (long tasks, blocking
time, node builds) are solid; GPU numbers are reported with their spread.

## 1. Dev panel

Full table: `docs/PANEL_AUDIT.md` (93 controls). Fixed:
- Time & sun: preset / "back to the preset's time" did nothing on a page opened with `?hour=` (`lighting.urlHour`).
- Smoothness: the tree LOD sliders only reached the tiles already loaded (later tiles started from the defaults);
  impostor start / band / end, tree shadows end and tile cross-fade now mirror into their URL parameters; the copy
  link carries the whole folder; "trees drawn" counted disposed tiles (`window.__stylizedTrees` leaked every tile's
  field: now pruned).
- "↻ reload with these" dropped the close-up view (`view=stjob`).
- Copy link: an opened link stayed in the address bar and was re-applied over every later change on reload.
- Removed: "cascaded sun (reload)": `?sunlight=1` only acts with the old sky (`?sky=old`), with Firmament it did nothing.

## 2. Freezes

### What froze, and the fixes

| Cause (measured) | Fix |
|---|---|
| Every per-tile material (terrain + land cover, asphalt + atlas, lamps, furniture, tram, far-tile photo) and every smooth-LOD fading copy is a new TSL graph: three built it on the main thread on its first draw, 5-17 ms each, 10-20 per tile hand-over in 1-2 frames (50-290 ms frames); the originals were built AGAIN when the fade ended, and new copies at fade-out | `warmup.js precompile()`: compileAsync on the hidden tile and on stand-ins with its fading copies (`lodFade.js fadeProxies`) BEFORE it shows; one compileAsync queue for the page; `_beginPreCompile/_finishPreCompile` patched so the work items build for the scene pass's MRT target and the MRT does not leak between frames (without it the post chain's last pipeline failed validation). Fading copies kept until the tile is disposed. Tiles streamed under the boot cover compile their originals in the background and their fade-in keeps the copies until that is done. `?precompile=0` = old |
| Tram line re-snap 28-44 ms per tile with tracks | async, 3 ms slices, each shape swapped in whole (`tramline.js`) |
| Tree LOD re-bucket (every 5 m of motion) uploaded every instance buffer of every tile whole: ~30 MB, 15-25 ms in one frame | used range only (vendor/stylized-trees CHANGES #11; same in impostors.js, lamps.js) |
| Tram meshes / car batches DynamicDrawUsage: three r187 re-uploads those whole in every render pass of every frame (~15 uploads a frame) | static usage + used range (they set needsUpdate when they change) |
| Removing the opaque loading cover: a 200-500 ms frame right after the reveal (also on the base): with a fully opaque layer over it Chrome stops compositing the WebGPU canvas | the cover at opacity .99 (measured: 1 -> 0: 300-350 ms frame; .99 -> 0: 33-50 ms) |
| Per-tile main-thread slices up to 135 ms (rails + trees + lamps + furniture + tram + cars in one task) | one frame per step: rails, trees, lamps, lamp light map, furniture, tram, cars, bollards, show, tram snap; the tile log lists every slice over 4 ms |

### Numbers

Boot at I6 `view=stjob`, warm cache (HTTP + shader cache), 1500 x 800. Alternated base / new back to back.

| | base 90d2758 | this branch |
|---|---|---|
| cover lifts (s), 3 alternations | 8.85 / 7.39 / 7.59 | 8.96 / 7.32 / 8.80 (and 8.70, 7.45) |
| long tasks after the cover | 7 / 2 / 3, worst 114 / 102 / 185 ms | 0 / 0 / 0 (one run: one of 54 ms) |
| worst frame after the cover | 533 / 267 / 267 ms | 34 / 34 / 50 ms (quiet GPU) |
| render-time shader builds after the cover | 15 pipelines, 10-20 builds per tile | 0-3 builds of 2-10 ms per tile, never 2 in a frame except one of 27 ms (rare) |

Cold HTTP cache (a fresh isolated browser context, first load of each origin; GPU heavily shared with the other
agent's city tab, so the frame counts are inflated on both):

| | base | this branch |
|---|---|---|
| cover lifts | 17.2 s | 15.4 s |
| long tasks after the cover | 221, 147, 95, 88 ms | 65, 59, 58, 55 ms |
| worst blocking (LoAF) after the cover | 171 ms | 21 ms |

Moving (this branch, warm, quiet GPU unless noted; base numbers from the same tests before the fixes):

| Test | before | after |
|---|---|---|
| walk 45 s at 12 m/s, frames > 25 / > 34 ms | 52 / 5 (worst 50 ms) | 17-21 / 0 (worst 33 ms) |
| glide 40 s at 30 m/s (115 m up) through 6 new tiles | - | 57 > 25 ms, 0 > 34 ms, no long task (GPU at 13-22 ms: the 33 ms frames are GPU-bound) |
| teleport 1 km (streams 6 tiles + far tiles) | 286 ms frame | not re-run after the last fixes |
| long tasks while moving | 54-114 ms | none |

### What remains (task 2)

- 0-3 render-time shader builds of 2-10 ms per streamed tile (`node:` without `(pre)` in the render probe): some
  render objects do not find the precompiled node state (lamps / tram / furniture instanced meshes, a few fading
  copies). Rebuilt in isolation they DO hit the cache, so the key differs only in the real stream (suspects: the
  object-specific instancing path or a state set between the compile and the first draw). One frame of 27 ms seen once.
- Per-tile slices still up to ~8 ms (parked cars: `carSites` against the measured kerbs; the lamp light map paint).
  Moving `carSites` into the tile worker needs `streetFit` in the worker (bundle rebuild).
- The lamp light map re-uploads its whole 11 MB R8 texture per tile (~1 ms main thread, a GPU copy).
- The 33 ms frames left while moving are GPU-bound (fades draw two LODs, uneven GPU load), not the main thread.
- Fly test with the falcon not run (the glide covers streaming at altitude).

## 3. Street-level GPU cost

Done: the far-tree impostors (depth twin + lit pass) now draw AFTER the opaque city (renderOrder 1 / 2, was -1 / 0):
at street level they are mostly behind houses and are now rejected by the depth test instead of rasterised first.
Identical picture (frozen-view diff 0.00 %), so nothing can pop. `?implate=0` = before.

Measured at the walk start (eye height, Place de Saint-Job), live alternation, 6 rounds of 3 s, GPU shared:
- impostors drawn early vs late: early slower by **+0.75 ms** mean (per-round spread -0.98 .. +3.0); the A/A
  alternation in the same session had a mean of +1.0 (spread -0.8 .. +2.9): **not significant** on this machine today.
- impostors off entirely: -1.5 ms mean (spread -2.6 .. -0.85), so they still cost about what the smooth-LOD merge
  measured (0.5 ms on a quiet GPU), more on a throttled one.
- trees' LOD 1 shadows off: -1.3 ms mean (spread -3.6 .. +2.4).

Not done (to try on a quiet GPU, each needs a moving check):
- Tree shadows only where they can be seen: a `castShadowPositionNode` on the leaf / bark materials that collapses a
  tree whose whole shadow lands outside the shadow fade radius (light-space test on `treePos` with a margin for
  the crown and its height). Exact (no visible change), but the box is only 1.0-1.6x the fade radius, so the gain is
  small at street level; worth it in the orbit views.
- Shadow map every second frame (`shadow.autoUpdate = false`, `needsUpdate` on alternate frames): about half the
  shadow pass, but moving shadows (trams, the driven car, the character, the tree sway) would update at 30 Hz.
- A cheaper LOD 1 caster (LOD 2's 3 cards in the shadow pass only) changes the shadow's density at the 40 m switch:
  rejected (it would bring back the shadow pop the smooth-LOD work removed).

## URLs (served from the worktree, no-cache)

- `/viewer/index.html?tile=I6&view=stjob` (boot), `&view=walk` (street), `&precompile=0` (old streaming compile path),
  `&implate=0` (impostors drawn first), `&panel=0` (no dev panel).
