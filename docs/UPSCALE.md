# Temporal upscaling + dynamic resolution (branch claude/upscale, 2026-11-15)

Top item of the performance backlog (docs/TODO.md, "REFERENCES": dgreenheck/tidewater does TAAU + sharpening + dynamic
resolution on raw WebGPU). **On by default**; `?upscale=0` = the native path as before (MSAA 4x, every pass at the
drawing buffer's size). Code: `viewer/upscale.js` (new), `viewer/post.js` (the chain), small delimited hooks in
`viewer/main.js` (`--- upscale` comments). GPU numbers: docs/perf/AUDIT.md step 15.

## How it works

```
scene (internal res, no MSAA, jittered)  MRT: output, normal, metalRough, motion (new)
  -> haze + vfog + meter (internal res) -> GTAO / SSR (half of internal) -> lit HDR composite (rtt, internal res)
  -> TAAU resolve (output res; history output res)
  -> bloom (half output) + grade + clamped 5-tap sharpen (output res) -> canvas
```

- **Internal resolution** = `floor(drawing buffer x scale)` per axis, scale 0.4-1 on a 0.025 grid. The scene target,
  the haze, AO and SSR follow it (their `resolutionScale` = 0.5 x scale); bloom and the grade stay at the output size,
  after the resolve. The HUD, minimap and dev panel are DOM: always native.
- **TAAU resolve**: three r187's `TAAUNode` (examples/jsm/tsl/display, MIT) subclassed (`CityTAAU`): 9-tap
  Blackman-Harris reconstruction of the jittered input at each output pixel, variance clipping of the history, the
  thin-feature lock, flicker reduction. Changes:
  - **motion from depth + an object-motion MRT, not three's `velocity`**: `velocity` in the MRT makes every
    `InstancedMesh` copy its whole instance-matrix array each frame (`needsPreviousData` -> `previousInstanceMatrix.array.set`),
    adds a vertex buffer (object-specific builds past 8) and per-object work everywhere. Here the camera's motion is
    rebuilt in the resolve from the dilated tap's depth (last frame's unjittered view-projection, as Tidewater's
    `CameraVelocity.js` for static geometry), and a 4th MRT target `motion` carries only the objects' OWN rigid motion:
    a per-object uniform `lastWorld x inverse(world)` (identity when the object did not move, so the whole static city
    writes exactly 0). The tram, the player's vehicles and anything moved by its matrix reproject correctly.
    Instanced movers (the traffic fleet, birds) and skinning keep the camera's motion: the variance clip handles them.
  - the jitter (Halton 2,3, 16 phases) is set around OUR scene render (`begin` / `end`; post.js renders the scene itself
    before the RenderPipeline, three's hook would jitter only the post chain); half amplitude while the camera moves
    (Tidewater's `jitterMoving`).
  - reconstruction kernel sharper when the history is good (`exp(-2.29 x 1.6 d^2)`, `?taakernel=`) and wide (x0.45)
    where it counts for little (disocclusion, fast motion): a soft upscale, not the input's pixel staircase.
  - camera cuts (> 25 m or > 0.6 rad in a frame) drop the history for one frame.
- **Mip bias** `log2(scale) - 0.3` on the scene pass's fragment texture samples (FSR2's rule: else bricks and cobbles
  take the mips of the smaller image). WebGPU samplers have no LOD bias, so it is `textureSampleBias` in the shader:
  `TextureNode.generateSnippet` is wrapped (upscaled only) for samples with no level / bias / grad / compare of their
  own, in builds whose MRT is the scene's (not shadows, not post). `?mipbias=-0.3` / `?mipbias=off`.
- **Sharpen**: 5 taps of the resolve, clamped to the cross's min / max (no halo), inline in the grade; strength
  0.2 at scale 1 to 0.4 at 0.6 (`?taasharp=`).
- **Dithered fades** (lodFade.js `ditherNoise`: every LOD cross-fade, tile fade, impostor hand-over) get a per-frame
  phase (`ditherFrame`, Jimenez's 5.588238 px step): the history blends a cross-fade into a smooth dissolve instead of
  a checker (`docs/upscale/day_dither_fade_x2.jpg`: the native checker on the far facade, smooth with TAAU).
- **See-through glass** (car packs, tram, train: one opaque draw made see-through by alpha-to-coverage, which needs
  MSAA): flagged `userData.seeThrough`, they keep a stochastic coverage (pixel dropped when alpha < the per-frame
  dither), averaged by the history. NOT the coverage cards / wires (trees, hedges, ivy, catenary, mesh fences): tried,
  a thin stochastic feature is clipped away by the neighbourhood clamp (dotted wires); they keep three's 1-sample
  fallback (a hard alpha edge) which the jitter + history anti-alias.

## Dynamic resolution

Input: the GPU time of each sampled frame (timestamp queries, main.js `sampleGpu` -> `upscale.gpuSample`). Target
`?gputarget=14` ms (60 Hz with margin). Over 24+ samples since the last change (>= 0.75 s):
- p75 > 1.04 x target: down to `scale x sqrt(0.94 x target / p75)`, at most -0.1 per change;
- p75 < 0.8 x target for 2.5 s and the predicted cost of +0.05 (`p75 x (s'/s)^2`) < 0.92 x target: up 0.05.
The hold band between (and the predicted-cost check) is the hysteresis: no oscillation seen in the traces. A change only
resizes the internal targets (no pipeline, no history reset: the history is at the output size), and the TAAU
accumulates the new scale in a few frames: the scale steps read as a slight sharpness change, not a pump.
Traces (`debug/upscaleAB.js dr`): Wolvendael lawn (shared GPU) 0.8 -> 0.75 -> 0.7 -> 0.6 in 4 s then steady; Place
Saint-Job overview, quiet GPU: 0.8 -> 1.0 in 0.05 steps every ~4 s, then steady. No GPU timing (`?gpu=0`): DR holds.

## Quality presets (the game's settings menu)

```js
import { cityQuality } from "./upscale.js";   // also window.cityQuality
cityQuality.set("high");     // "native" | "high" | "medium" | "low" | "auto"
cityQuality.get();           // "high"
cityQuality.presets;         // { native: "Native (TAA, full resolution)", high: "High", ... } (menu labels)
cityQuality.stats();         // { upscale, quality, scale, dynres, range, targetMs, sharpen, changes, recent, motion }
```

| preset | internal scale (DR range, start) | effects |
|---|---|---|
| native | 1.0 fixed (TAA at full resolution) | all |
| high | 0.85-1.0, 0.92 | all |
| medium | 0.7-0.85, 0.77 | all |
| low | 0.55-0.7, 0.6 | SSR pass skipped |
| auto (default) | 0.6-1.0, 0.8 | all |

Effects switch with `pipe.setEffects({ ao, ssr })`: a pass switched off is not run (its `updateBefore` skipped, weight
0); no shader is rebuilt, no pipeline compiled. With `?upscale=0` the presets only switch the effects. `?quality=` sets
the preset at boot.

## Switches (rows in viewer/features.js, Lighting & post > Upscaling)

`?upscale=0` native + MSAA · `?dynres=0` fixed scale · `?rscale=0.75` the scale (alone it fixes it; with `?dynres=1`
it is the start) · `?quality=` · `?gputarget=14` · `?taasharp=` · (debug) `?taakernel=1.6`, `?mipbias=-0.3|off`.

## Image checks (`docs/upscale/`, 1600 x 828 at DPR 1)

- `day_facades.jpg`, `day_trees_wires.jpg`, `day_street_plate_brick_x3.jpg`: native MSAA vs TAAU 1.0 / 0.75 / 0.6 at
  Place Saint-Job street. Facades, window frames and the street plate hold at 0.75; bricks keep their pattern (mip
  bias + sharper kernel; a first version without them was visibly soft even at 1.0). 0.6 is softer on fine texture.
- `day_dither_fade_x2.jpg`: dithered fades smooth (native: checkers on the far facade and the bush).
- `night_place.jpg`: night at 0.75 vs native: lamp pools, lit windows, bloom, glare as native (traffic differs).
- Wires: the catenary ribbons (opacity = radius / pixel width, faint with A2C) now draw at full strength over ~1
  internal pixel: thin, stable, darker than native (closer to the real wires in photos, but a change).
- Foliage cards: hard alpha edge + TAA instead of A2C: slightly denser crowns.
- Moving objects: `tram_close_before_motion_mrt.jpg` = the first version (camera motion only): a tram passing 14 m away
  showed the input's staircase on its window edges; fixed by the object-motion MRT + the wide kernel at low history
  confidence. `moving_car_instanced_x3.jpg`: a traffic car (instanced, camera motion only): its trailing edge and its
  dithered parts speckle while it moves; the remaining weak spot.
- SSR, AO, bloom, haze: unchanged in look (their inputs are at the internal size; SSR on wet roads not checked).

## Weak spots / next

1. Instanced movers (traffic fleet, birds) have no per-instance motion: speckled trailing edges in motion. Next: the
   fleet writes a previous-position instance attribute (it keeps `lastPos` already) and the motion output reads it.
2. Coverage-as-alpha wires / fences / cards lost their A2C softness (hard edge + TAA): could draw the wire ribbons at
   their true radius under TAAU (the jitter then gives the coverage) instead of widening them to a pixel.
3. The native twin in `debug/upscaleAB.js liveViews` compiles its 4x pipelines lazily: at views it has not seen it
   skips not-yet-compiled objects (lawn: 232 vs 250 draws), so its native number there is a little LOW.
4. GPU contention from other tabs / apps raises the measured GPU time, so the DR lowers the scale then too (right for
   a game sharing the GPU, misleading for A/B measurements: measure at fixed scales, `?dynres=0`).
5. Text on shop signs at 0.6: legible but soft (the sharpen helps); the "auto" floor 0.6 is a choice.
6. Vegetation wind / vertex animation is not in the motion (camera + rigid only): leaves rely on the clamp.
