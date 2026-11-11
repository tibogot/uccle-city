# Impostor kit: resume notes (paused 2026-11-11, owner shut down)

Branch `claude/impostors` (worktree `.claude/worktrees/impostors`). Research: `docs/IMPOSTORS_RESEARCH.md`.
Serve: `python C:/Users/tibog/AppData/Local/Temp/uccle_nocache_server.py 8824 <worktree>`, open
`http://localhost:8824/labs/impostor-lab.html?scene=row50` (also `scene=single|forest|far`). WebGPU only.
Console API: `window.lab` (`meterAB(path)`, `meter(mode, path)`, `bench(modes)`, `sideBySide("kit")`,
`stripSet(path)`, `buildScene(id)`, `buildKitMats()`, `bakeKit()`, `dataURL(objectURL)`, `results`, `benches`).
Images are saved by `evaluate_script` with `filePath` returning `lab.dataURL(url)`, then decoded with a small Python
base64 script (no PIL on this machine).

## Done (verified in Chrome, WebGPU)
- `viewer/impostorKit/`: `octa.js` (hemi / full grid, 3-view triangle, CPU + TSL), `bake.js` (GPU MRT capture at 4x4
  supersampling per row strip, resolve pass = fractional coverage, async read-back, a row per frame: no long task;
  octahedral-encoded view-space normal + depth + aux), `bakeWorker.js` (dilation, per-cell Castano coverage mips,
  octagon cut-out card), `material.js` (3-view barycentric, homogeneous per-view uv from the vertex stage, 1-step
  parallax, ONE weighted alpha, a2c with a fixed-gain ramp, PDO depthNode, depth pre-pass + EQUAL colour pass,
  analytic per-instance mip level), `field.js` (one instanced draw per pass, shader distance cull), `fade.js`
  (hand-over helpers, object-anchored noise option), `types.js` (presets, tree shading), `sources/stylizedTrees.js`
  (bakes LOD 2 at the hand-over state). Array texture mips written with `device.queue.writeTexture` (three r187 only
  uploads level 0 of a DataArrayTexture).
- Lab `labs/impostor-lab.html/.js`, `labs/jitterMeter.js` (masks per distance band by hide/diff, blink share +
  second temporal difference d2), `labs/flickerTest.js` (copied from claude/stalle).
- Bake: 16x16 x 64 px, 6 layers, 4 levels, 63.8 MB (today: 64 MB). ~3 s wall (151 ms of main-thread renders spread
  over 96 frames, worker ~1.3 s). Today's bake: ~100-160 ms synchronous.

## Jitter meter (1280x720, pixel ratio 1, FOV 55, post on, 24 frames; blink share / d2 x1000, excess vs mesh)
| scene · path | mesh | today | kit |
|---|---|---|---|
| row50 orbit 0.02°/f | 10.3% / 37.9 | 52.7% / 162 (x4.3) | 1.6% / 14.4 (x0.38) |
| row50 strafe 0.12 m/f | 16.3% / 53.8 | 52.4% / 166 (x3.1) | 1.4% / 19.6 (x0.36) |
| row50 dolly 1 m/f | 11.1% / 41.7 | 53.3% / 185 (x4.4) | 1.3% / 15.6 (x0.38) |
| row50 bird | 12.7% / 44.1 | 54.1% / 158 (x3.6) | 1.8% / 18.2 (x0.41) |
| forest orbit | 4.5% / 24.2 | 70.5% / 179 (x7.4) | 0.06% / 8.4 (x0.35) |
| forest strafe | 20.2% / 53.0 | 72.1% / 182 (x3.4) | 0.6% / 20.4 (x0.39) |
| forest dolly | 19.2% / 50.5 | 71.9% / 186 (x3.7) | 0.8% / 20.2 (x0.40) |
| forest bird | 21.5% / 58.9 | 71.6% / 189 (x3.2) | 1.3% / 26.3 (x0.45) |
Per band numbers: `lab.results` after a run (all bands same picture). Single tree 600 m, FOV 10, orbit 0.2°/f:
mesh 8.8, today 118, kit 2.75 (d2). Kit option sweep (forest strafe, d2): a2c-ramp gain 2: 20.5, gain 4: 17.8,
a2c-sharp: 20.1, cutout: 26.5, no PDO 19.1, parallax 0: 19.7, 2: 20.4, dominant: 21.0, post off 18.4.
Hand-over (single tree at 385 m, FOV 10, strafe 0.02 m/f): mesh 29.7, today 174, kit object-anchored noise 44.8,
kit screen IGN 19.3 -> default switched to the screen IGN (the research's object-anchored hypothesis did not hold).
Strip: `docs/impostors/strip_row50_orbit.png` (today shows the dotted / hatched crowns, kit clean).
Side-by-side at the hand-over: `docs/impostors/sbs_handover_405m_kit_mesh_diff.png`.

## GPU (forest patch, 2,008 trees 420-1100 m, median of 3 x 2 s, whole frame; delta over "none")
mesh +1.25 ms, today +0.85, kit +1.44..1.51 (PDO on). Kit variants: no PDO +0.79, parallax 0 +1.11, no PDO and
no parallax +0.72, dominant +1.05, quad card +1.51 (octagon ~= quad here). Row50: all +0.07.
=> PDO costs ~0.65 ms in the forest (frag_depth kills early-Z in the EQUAL colour pass: every card fragment shades).

## Next steps, in order
1. PDO cost: make PDO per distance (off past ~600 m, or a far-ring material without PDO / parallax), or keep PDO only
   for types that need ground contact (cars); re-bench forest + far forest (`scene=far`, not yet benched; mesh mode is
   skipped there). Target forest to 1.5 km <= 1 ms.
2. Far fade check at 1,200-1,500 m (`far: "ground"`, FAR.ground colour) with the meter on `scene=far` / row50 >1100.
3. Performance trace of the bake (chrome devtools) to confirm no long task; record.
4. docs/IMPOSTOR_KIT.md (how to add a type, the numbers above), docs/TODO.md remaining phases (trees behind
   ?impkit=1 after the tree-branch review, cars, props, crowds, KTX2), labs/index.html card (not added yet).
5. Shadows: receive uses the PDO point; casting from a proxy not done.

## Not verified / open
- EQUAL with depthNode across GPUs (works on this one, no holes seen); `colourDepth: "lequal"` option exists.
- Parallax/blend effects on slow "boiling" are not captured by d2 (low frequency); needs eye checks on orbit strips.
- Full octahedral layout untested. Car / building / rock slots are placeholders only.
- Kit looks slightly softer and brighter than the mesh at the hand-over (see the diff image).
