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

`?upscale=0` native + MSAA · `?instmotion=0` no per-instance / skinned / wind motion · `?thinaa=old` hard-edged
cards + full-strength wires · `?dynres=0` fixed scale · `?rscale=0.75` the scale (alone it fixes it; with `?dynres=1`
it is the start) · `?quality=` · `?gputarget=14` · `?taasharp=` · (debug) `?taakernel=1.6`, `?mipbias=-0.3|off`, `?taamoving=0.03`.

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
  dithered parts speckle while it moves (fixed: "Moving objects" below).
- SSR, AO, bloom, haze: unchanged in look (their inputs are at the internal size; SSR on wet roads not checked).

## Moving objects + thin geometry (branch claude/motionvec, 2026-11-15)

The motion output (`PreviousWorld` in viewer/upscale.js) is built per material x object kind: where this fragment's
surface point was LAST frame, before the object's rigid motion (`ObjectMotionMatrix` on top, the camera in the resolve):

| what | how | data / cost |
|---|---|---|
| traffic cars (`traffic/trafficFleet.js`), traffic two-wheelers (`moto/cityTwoWheelers.js`), trams (`tram2Model.js`), trains (`rail/trainModel.js`), pigeons (`falconFlight/pigeons.js`) | `viewer/instMotion.js` `InstancePrev`: one STORAGE row (vec4) per drawn instance, read at (mesh base + instanceIndex) in the vertex stage: `prev = rotY(p - O, dyaw) + c + O` (a yaw-only delta about the instance origin + its translation; O = a per-frame origin at the camera, the same f32 on CPU and GPU). The CPU keeps each mover's last drawn pose by key (sim index + generation; trip + piece) and writes c / dyaw where it writes the instance matrix | 16 B per drawn instance per frame, static buffer + update ranges (one per mesh written, adjacent ones merged). Measured 2.8-2.9 KB / frame at Place Saint-Job (26 cars 416 B, 150 pigeons 2.4 KB, a tram 160 B, a train 64 B). No vertex buffer (the fleets' geometries sit near WebGPU's 8, past which three makes object-specific builds) |
| sky flocks (`birds/skyFlocks.js`, GPU compute) | no buffer: this frame's move pass did `p += v dt`, so last frame = `p - v dt` (velocity and dt are in the storage buffer / uniforms already); the turn and wing beat between two frames are left out | 3 ALU per vertex |
| skinned meshes (falcons, characters) | three's own previous-bone skinning: `NodeBuilder.needsPreviousData()` answers true for SkinnedMeshes in the scene pass (never for instanced / batched meshes: three would copy every instance-matrix array), the motion reads `positionPrevious` | one bone-matrix copy per skeleton per frame + a second skin transform (scene pass only) |
| wind foliage (hedges, garden hedges, ivy x2, plants x2: the `foliage/wind.js` users) | `windAt` / `flutter` take the time at graph construction; `windPrev(build)` builds the same offset again with last rendered frame's wind time (`wind.uTimePrev`, an onFrameUpdate uniform) and the material gets the difference | the wind evaluated twice in those vertex shaders (scene pass only) |

The city's stylized street trees run with `windAmp: 0` (no sway): nothing to do there. Not covered: the pedestrians
(crowd, later), the old `trees.js` cards (three's `time`), grass (default off), the flags' cloth. A mover not drawn
last frame (spawned, entering the view) writes 0. `?instmotion=0` = none of this (no buffer, no shader change); live
A/B in one page: `window.instMotion.set(false)` (a uniform multiplies the motion away; same shaders). The resolve's
extra current-frame weight on pixels with their own motion is 0.03 now that the motion is exact (0.08 with
`?instmotion=0`; `?taamoving=`): the stochastic see-through glass of a followed car averages calmer, edges unchanged.

**Thin geometry** (`?thinaa=old` = as merged before): the WIRES (`thinWire()`: tram catenary, railway wires) are
BLENDED (transparent) under the TAAU: the ribbon's minimum half-width is 0.6 INTERNAL pixels (`wireHalfPx`, set per
frame from the fov and the internal height; native keeps 0.0011 per metre) and its alpha = true width / ribbon width
(the coverage), so a 12 mm wire reads as a soft, continuous, faint line: no dots, never darker than its coverage.
The other alpha-to-coverage materials (tree / hedge / ivy cards, welded-mesh fences) get a per-frame stochastic alpha
in the scene pass (`a < ditherNoise()` discards, the noise phase moving each frame): their alpha is 1 inside a leaf
and only falls off over the pixel-wide alpha-test band (or over a wide even veil far away), so dropped pixels always
sit next to kept ones and the history averages them into A2C's soft edge (the earlier "dotted wire" failure was a
lone sub-pixel feature, which the wires no longer are).

Image checks (`docs/upscale/motion/`, 1600 x 828, internal 0.75 unless said; `debug/motionShots.js`, the main loop
stepped at 1/60 s; OFF row = `instMotion.set(false)`, ON row = default; the two rows are two cars / the same tram with
its clock rewound):
- `car_pass_075_off_on.jpg`: a car passing a fixed camera 9 m away: OFF speckles the lower body and staircases the
  wheel arches and outline; ON clean (wheels, sills, roof line).
- `chase_075_off_on.jpg`: chase camera behind a car (the followed car still on screen, the world moving): ON crisp,
  plate readable.
- `night_chase_auto_off_on.jpg` (night, auto quality): OFF smears the car ahead into headlight streaks and a white
  ghost and jags the followed car; ON clean.
- `tram_pass_075_off_on.jpg`: tram 92 passing at 12 m: OFF staircased window frames and ghosted seat silhouettes; ON
  straight frames. The see-through glass dither stays visible in both (weak spot 1).
- `birds_075_off_on_x3.jpg`: near birds of a flock at ~22 m: OFF the history clamp ERASES them (a faint ghost at
  most); ON they read as birds.
- `thin_wire_crown_old_new_x2.jpg`, `thin_stjob_old_new.jpg`, `thin_ivy_old_new.jpg`: the catenary dark and heavy
  (old) vs soft and continuous (new); crown and ivy edges anti-aliased like A2C, no visible dither when still.

Cost (preflight YELLOW: free-memory warning; another agent's WebGPU tab opened mid-run, mine kept in front): Place
Saint-Job street at 0.75 fixed, 3 x 5 s per load, loads alternated: default GPU p50 8.2-10.9 ms (median ~8.8),
`?instmotion=0&thinaa=old` 7.8-11.8 ms (median ~9.3): no difference measurable under the +-1.5 ms contention noise;
CPU per frame unchanged (8.8-10.5 vs 8.9-9.4 ms). The shader work is added only in the scene pass of the movers and the
wind foliage (a storage read + ~12 ALU per vertex for the fleets). A clean GREEN re-measure is still worth doing.

## Weak spots / next

1. (done 2026-11-15, "Moving objects" above) per-instance motion. Left: the see-through glass (car packs, tram,
   train) is a per-pixel stochastic coverage: on a moving vehicle the history cannot average all of it, a fine dither
   shows in the windows (most on trams seen close). A real fix: the glass as its own blended draw. Pedestrians have no
   motion yet. The yaw-only delta ignores a pitch / lean change between two frames (sub-pixel) and the wheels' spin.
2. (done 2026-11-15, above) thin geometry. The wires are now transparent draws (sorted, after the opaques): a wire
   crossing a moving car overwrites the car's motion with its own (0) on its pixels.
3. The native twin in `debug/upscaleAB.js liveViews` compiles its 4x pipelines lazily: at views it has not seen it
   skips not-yet-compiled objects (lawn: 232 vs 250 draws), so its native number there is a little LOW.
4. GPU contention from other tabs / apps raises the measured GPU time, so the DR lowers the scale then too (right for
   a game sharing the GPU, misleading for A/B measurements: measure at fixed scales, `?dynres=0`).
5. Text on shop signs at 0.6: legible but soft (the sharpen helps); the "auto" floor 0.6 is a choice.
6. (done 2026-11-15 for the wind.js foliage) Grass (default off) and the flags' cloth are not in the motion.

## Sharp while moving (branch claude/sharp, 2026-11-17)

Owner's playtest: "anything at a distance is blurry and pixelized: the motorbikes, the falcon when it flies"; the player's
car's plate and thin lines shimmer and break into blocks in the chase view; "the quality is bad as soon as I move with
the car" (the WHOLE image soft while driving); shadows swim and the light through the foliage sparkles; façade windows
grainy / blocky. Images: `docs/sharp/`. Every fix has its own `?key=old`; `?sharp=old` = all of the TAAU / DR ones.

### Causes found (code review first, then the browser)

1. **The player's car / a falcon flown from behind kept NO history** (`?taadepth=old`). The resolve's disocclusion test
   (three's TAAU: `closestDepth - previousDepth > 0.0005`) compares this frame's depth with last frame's depth at the
   reprojected uv, seen from this frame's camera. For an object that moves on its own ALONG the view, last frame's
   surface was elsewhere in depth: the car driving away from the chase camera was 0.2-0.4 m nearer last frame, at 6 m
   with near 0.3 that is 0.002-0.003 in depth, 4-6 x the threshold, so every non-edge pixel of the car was a
   "disocclusion": weight 1, the current low-res frame only, every frame (from ~4 km/h up). That is the shimmer and the
   plate "in blocks". Fix: the motion MRT's `.z` carries the surface point's own view-z change this frame (metres,
   this frame's camera: `viewMatrix x (p - p_prev)`, p_prev from the object's / instance's / skeleton's motion); the
   resolve adds it to last frame's view z before the test. Zero for static geometry (no change there).
2. **The whole image soft while driving** (static geometry):
   - the history fetched BILINEARLY (`?taahist=old`): each frame of camera motion resamples it at a fractional offset;
     at a current-frame weight of ~0.1 that is ~10 bilinear passes deep: a heavy blur. Now a 5-tap Catmull-Rom
     (Jimenez 2016: the 4 x 4 bicubic as 5 bilinear fetches; FSR2 / UE do the same);
   - the reconstruction kernel WIDENED with motion (`exp(-2.29 x 0.45 d^2)` at >= 32 px of motion and on every
     disocclusion, `?taarecon=old`): a soft blob of the low-res frame. Now the sharp kernel stays, and low-confidence
     pixels mix toward a Lanczos-2 (FSR2's polynomial) deringed to the 2 x 2 nearest input texels;
   - under motion the clip box shrank to 0.5 sigma and the current frame got + the whole motion factor; jitter halved
     while moving (`?taablend=old`). Now >= 0.8 sigma, half the motion weight, full jitter (FSR2 / DLSS always jitter).
3. **The followed car's plate flickered even with history**: the thin-feature lock was off on every pixel with its own
   motion. Now it stays on where the total screen motion is < 1.5 input px (`?taalock=old`).
4. **Sharpening**: a clamped 5-tap unsharp mask 0.2-0.4. Now RCAS (AMD FSR 1's robust contrast-adaptive sharpening,
   MIT) on a reversible tonemap of the HDR resolve: lobe share 0.5 at scale 1 -> 1 at <= 0.65 (`?rcas=old`).
5. **Dynamic resolution dropped to 0.6** on the owner's laptop (RTX 4050 in power-saving clocks, 855-1200 MHz): the
   timestamp GPU time reads high at low clocks while 60 fps still holds, the DR lowered the scale, the load fell, the
   clocks stayed low. Now (`?drrule=old`): lowers only when the GPU p75 is over the target AND frames are late (> 20 ms
   intervals in > 10 % of the window, or GPU p75 > 16 ms); a soft floor 0.75 in the auto preset that it crosses only
   with frames missed for 3 s at > 1.25 x the target (hard floor 0.6); steps 0.05 down / 0.025 up, >= 1 s apart. The
   HUD stats line shows `render 0.80 auto`.
6. **Sparkle** (`?taafire=old`): the reconstruction taps weighted 1 / (1 + luma) (Karis 2014): a sub-pixel glint (the
   low sun through leaves, a specular spark) no longer dominates a pixel for one frame.
7. **Shadows swim** (`?shadownoise=old`): three r187's PCF rotates its 5 Vogel taps by interleaved gradient noise of the
   SCREEN pixel, fixed per pixel: under the TAAU the penumbra noise is locked to the screen and the shadows slide under
   it while driving. Now the noise phase moves each frame (lodFade.js `ditherFrame`), the history averages it.
8. **Mip bias**: already on (`log2(scale) - 0.3` on the scene pass, upscale.js `TextureNode.generateSnippet`): checked.
9. **Kit glass room seed** (no switch, worker): the kit glass recovered the building hash from
   `rnd + 2 door + 4 French + 1024 maison de maître` in one float32 (~1.2e-4 precision past 1024, the shader rounds it
   to 1/4096): about half the maisons de maître's kit windows showed another room / curtain than the painted window
   they hand over to. Packed quantised now (exact).

10. **The flying falcon was a ghost** (`?skinprev=old`): an ATTACHED skinned mesh skins with world-space bone matrices
    and its bindMatrixInverse follows its matrixWorld, so `modelWorld x positionPrevious` (last frame's bones) is
    already last frame's world position, flight included; the rigid delta (ObjectMotionMatrix) on top counted the flight
    twice: the history came from one frame of flight away and the trees showed through the bird (pre-existing; old and
    new both, `docs/sharp/falcon_060_old_new.jpg`). Now the delta is left out for attached skinned meshes (falcons, the
    third-person character). Wing tips on the downstroke still smear a little (articulation within a frame).
11. **The dynamic resolution's clock trap** (`?drrule=old`; the coordinator measured the owner's laptop: RTX 4050 at P4,
    780-900 MHz of 3105, 12-15 W, "SW Power Cap"; Chrome ignores powerPreference on Windows). The driver keeps the clock
    low while the work looks light; the old rule saw long GPU ms at that clock, lowered the scale, the work got lighter,
    the clock never rose: the city sat at 0.6. Now the DR decides on MISSED FRAMES only (rAF intervals > 20.8 ms):
    late windows lower it only after 3 s (the clock ramps when busy), 0.05 a step, the soft floor 0.75 crossed only
    after 6 s with > 25 % missed; on-time frames for 1.5 s raise it 0.05 (eager), not past the scale that was too heavy
    for 20 s. The HUD stats line: `render 0.95 auto (missed 0 %)` next to fps and GPU ms.
12. **Debug harness** (`viewer.step`): the paused loop skipped three's per-frame node update, so FRAME-type nodes (the
    TAAU resolve) never ran in stepped frames and every stepped frame showed the same image (earlier stepped captures,
    e.g. `debug/motionShots.js`, were affected). `viewer.step` now updates the node frame.

### Measured (this laptop, browser turn 2026-11-17; `debug/sharpCheck.js`, Place Saint-Job street, no traffic, the main
loop stepped at 1/60 s, chase view at 10 m/s = 36 km/h)

| | internal 0.75 old | 0.75 new | 0.6 old | 0.6 new |
|---|---|---|---|---|
| street sharpness parked (Laplacian var.) | 136 | 155 | 70 | 84 |
| street sharpness driving | 40 | 75 (x1.9) | 26 | 55 (x2.1) |
| driving / parked | 0.29 | 0.49 | 0.38 | 0.65 |

- The followed car: `docs/sharp/taadebug_chase_old_rejected.jpg` (`?taadebug=1`, red = history rejected): old, the
  whole car rejected while driving; new, kept (cyan = own motion, valid). `docs/sharp/plate_chase_075_old_new.jpg`:
  two consecutive frames x3 + their difference x4: old the plate breaks into blocks and changes every frame, new
  stable (the remaining difference is the car's real sub-pixel bob on the road). The high-pass frame difference is
  not a clean shimmer number here (the old car is so soft it has little high-pass to change): the images are the proof.
- Parked stability (frame-to-frame high-pass luma, x / 255, 40 frames): foliage 0.242 old / 0.255 new, facade 0.335 /
  0.318, road 0.096 / 0.113. A first RCAS schedule (0.5 at 1.0 -> 1 at 0.65, no denoise) raised it 40 % (foliage
  0.35): RCAS now has FSR's noise removal and 0.35 at 1.0 -> 0.7 at 0.6.
- GPU (fixed 0.75, Place Saint-Job street): 11.83 ms new vs 11.79 ms old (p50 11.73 / 11.60): no measurable cost.
- Dynamic resolution, full city, the boulenger drive path (85 s, auto): old rule 0.8 -> 0.6 in 2 s (during the load,
  GPU 31 / 18 ms) and 0.60 for the whole drive while frames held 16.7 ms and GPU p50 was 11.5 ms; new rule mean 0.976,
  min 0.85, 6 changes, frame p50 16.7 ms, GPU p50 12.2 ms at ~1.0.
- `motionCoverage()` with traffic, trams, birds: PASS (24 instanced movers with motion, the falcon skinned, 5 rigid).
- Windows (owner images 69 / 70): NOT reproduced. Looked at the same building (Rue Marie Depage, the red-brick block
  with white bands, ~500, -1612) and Saint-Job facades, still and moving, at 0.6 / 0.75, old and new, quick mode
  with / without weather + night, wx=rain, and in the full city: panes clean in all. Fixed on the way: the kit glass's
  room seed (item 9). Next step: the owner's exact URL / state (weather live? night? quality preset?) when it shows.

### Movers and their motion (rule 1)

Covered: traffic cars + two-wheelers, trams, trains, pigeons (InstancePrev), sky flocks (p - v dt), skinned falcons and
characters (last frame's bones), wind foliage (windPrev), everything moved by its matrix (the player's car / motorbike,
standing police props, the beacon: ObjectMotionMatrix). Known gaps (warned by the audit): pedestrians (GPU pose buffer,
no previous pose; 2 cm / frame), flags' cloth, wind grass (default off), the falcon lab's thermal hints (hidden in the
city).

### WHY IT HAPPENED + RULE

- **Root cause.** (and the laptop: the DR was tuned on GPU ms at full clocks; on the owner's power-managed RTX 4050
  the ms read long at 800 MHz and the DR locked itself at 0.6.) The TAAU (2026-11-15) was judged on still or slowly orbiting views and on a car passing a FIXED
  camera; the per-instance motion work (claude/motionvec) fixed the motion vectors but nobody checked the history's
  VALIDITY test, which three's TAAUNode built for objects whose depth only changes with the camera. The chase view (an
  object moving along the view, the main game view) was never measured; neither was "sharpness while moving" against
  "standing still". The bilinear history and the widened kernel were taken over from three / added as "soft instead of
  staircase" without a moving-camera sharpness number. The DR was tuned on a desktop-class GPU at full clocks.
- **Rules.** (1) Every moving mesh writes motion vectors (its own motion, in x / y AND depth), counted ONCE (a skinned mesh's
  bones may already carry its flight). (2) With upscaling, a
  sharpen (RCAS) is always on, the history fetch is bicubic, the texture mip bias follows the scale. (3) The auto
  render scale stays >= 0.75 unless frames are really missed; the dynamic resolution decides on missed frames, never on
  raw GPU ms (a laptop GPU's clock follows the load: lowering on its ms is a trap). (4) Every image-quality change is measured MOVING (chase
  at 50 km/h) against standing still, not only on stills.
- **Automated checks.** `node tools/audit/mergeGate.mjs` runs `tools/audit/motionAudit.mjs` (static, PASS / FAIL): every
  viewer file that writes instance matrices or deforms geometry over time is a listed MOVER with a motion hook or a
  listed STATIC with the reason (a new one fails until classified), and the upscaler's guarantees (own-motion depth,
  Catmull-Rom history, RCAS default on, mip bias, soft floor >= 0.75, skinned previous bones). Browser gates
  (`debug/sharpCheck.js`): `motionCoverage()` (every mesh that moved over 30 frames has a motion source) and
  `drive()` (sharpness while driving / parked, the followed car's frame-to-frame shimmer, the upper image's noise).
