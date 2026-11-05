# Perf / panel branch status (claude/perf-panel, 2026-11-05)

Resume here. Three tasks: (1) dev panel re-audit, (2) start-up / streaming freezes, (3) street-level GPU cost.

## How to measure

- Serve with `Cache-Control: no-cache` (python's plain http.server let Chrome serve STALE js from its heuristic
  cache: edits did not load). A tiny server: SimpleHTTPRequestHandler with `end_headers` adding the header, port 8777.
- Boot probe: Chrome DevTools `navigate_page` with initScript
  `(function(){var x=new XMLHttpRequest();x.open('GET','/debug/bootProbe.js',false);x.send();(0,eval)(x.responseText);})();`
  then after ~28 s `__probe.report()` (cover time, long tasks / frames / pipelines after the cover).
- Render probe: `import("/debug/renderProbe.js").then(m => m.install(viewer.renderer))`; `__rprobe.top()`:
  per frame node builds, attribute uploads (MB), textures, pipelines, with names.
- Moving test: `(await import("/debug/moveTest.js")).run({ mode: "walk"|"fly"|"glide", seconds: 45 })`.

## Task 2: freezes (done so far, committed)

Causes found (measured):
1. Every per-tile material (terrain + land cover, asphalt + atlas, lamps, furniture, tram, far-tile ortho) and
   every smooth-LOD fading copy (lodFade.js fadeVariant) is a new TSL graph: three builds it on the main
   thread on its first draw, 5-17 ms each; a tile hand-over did 10-20 of them in 1-2 frames (50-290 ms frames).
   The originals were built AGAIN when the fade ended (never drawn before), and new copies at fade-out.
   Fix: `viewer/warmup.js precompile()` (compileAsync on the hidden tile, then on `fadeProxies()` stand-ins,
   before it shows; one compileAsync queue for the page; patched `_beginPreCompile/_finishPreCompile` so the
   items build for the scene pass's target + MRT and the MRT does not leak between frames: without it the
   post chain's last pipeline failed validation). Fading copies kept until the tile is disposed
   (`dropFadeVariant`). `?precompile=0` = A/B.
2. Tram line snap (tramline.js snapTile) 28-44 ms sync per tile with tracks: now async in 3 ms slices.
3. Tree LOD re-bucket uploaded every instance buffer of every tile whole (~30 MB, 15-25 ms) every 5 m of
   motion: vendor/stylized-trees CHANGES #11 (used range only), same in impostors.js and lamps.js.
4. Tram meshes (and car fleet batches) were DynamicDrawUsage: three r187 re-uploads them whole in every pass
   of every frame (~15 uploads/frame). Now static + ranges.

Numbers (I6 view=stjob, warm cache, RTX laptop, 1 run each, other tabs idle):

| | before | after |
|---|---|---|
| cover lifts | 7.56-7.74 s | 7.45-7.6 s |
| long tasks after cover | 127, 100, 94, 85, 75 ms | none |
| worst frame after cover (boot streaming) | 267-300 ms | 34 ms |
| teleport 1 km (stream) worst frame | 286 ms | not re-measured |
| walk 45 s at 12 m/s: frames > 25 ms / > 34 ms | 52 / 5 (50 ms) | 21 / 0 (33 ms max) |

Still open in task 2: remaining 33-41 ms frames while walking (one frame with 15-18 MB attr upload = a new
tile's first draw, and tile textures created on show: precompile does not upload textures); features+trees
slice 5-12 ms and parked cars 4-10 ms per tile (move to worker or slice); fly + glide tests; cold-cache run;
a back-to-back A/B vs claude/foundation (serve `git archive 90d2758` on another port).

## Task 1: dev panel re-audit: NOT STARTED

Read so far (devPanel.js / smoothPanel.js), suspicions to check in the browser:
- Smoothness folder: no control mirrors into the URL or the share link (?impend=, ?impstart=, ?treeshadow*
  exist as URL params): decide and fix.
- "parked cars" toggle: check it hides `parked-cars-fleet` (carFleet group) and the box cars.
- "tree impostors (reload)": default on, ?impostors=0 off: check the reload applies it.
- `window.__stylizedTrees` grows with every streamed tile (never removed): the Smoothness "trees drawn"
  read-out filters on `group.parent`; leak to fix.
Every control: change, verify engine value / picture, URL, copy link, reload switches.

## Task 3: street GPU cost: NOT STARTED

Ideas: LOD1 tree shadow casters cheaper (fewer cards / proxy in the shadow pass only), far cascade / shadow
cache updated less often, impostor shading cost, overdraw. A/B several runs, check no popping.
