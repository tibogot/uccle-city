# Impostor kit (`viewer/impostorKit/`) and the Impostor Lab

A generic octahedral impostor system for three.js r187 WebGPU + TSL. This covers phases 0-2 of
`docs/IMPOSTORS_RESEARCH.md` §5 (trees) and phase 4 (parked cars, §5 below) and runs in the lab only. Trees move to it after the owner's tree-branch review
(`docs/TODO.md`). Lab: `labs/impostor-lab.html` (`?scene=single|row50|forest|far`, `?mode=kit|today|mesh|none`,
`?w=&h=` canvas size). Branch `claude/impostors`.

## 1. Results (2026-11-11, measured)

Setup: 1280 x 720 canvas, pixel ratio 1, FOV 55, city lighting (`midday`) and post chain on, 4x MSAA. Lab time is
frozen during the meter runs, and the GPU is shared with other agents' tabs. **mesh** = the real stylized-tree LODs
out to the horizon (the reference). **today** = `viewer/impostors.js` as the city uses it. **kit** = the defaults
below.

### Jitter meter

Each cell gives blink share / second temporal difference d2 x1000, over the far trees' pixels (bands 420 m and
beyond). Lower is steadier.

| Scene · path (24 frames) | mesh | today | kit | kit / mesh (d2) |
|---|---|---|---|---|
| row of 50 · orbit 0.02°/frame | 8.4 % / 32.3 | 51.4 % / 134 | 1.5 % / 16.5 | **0.51** (today 4.2) |
| row of 50 · strafe 0.12 m/frame | 13.0 % / 45.0 | 51.2 % / 137 | 2.7 % / 23.6 | **0.53** (today 3.1) |
| row of 50 · dolly 1 m/frame | 8.5 % / 34.9 | 52.6 % / 151 | 2.0 % / 18.0 | **0.52** (today 4.3) |
| row of 50 · bird path | 10.8 % / 40.9 | 53.5 % / 145 | 2.0 % / 22.7 | **0.56** (today 3.6) |
| forest (2,008 LiDAR trees of M8) · orbit | 4.6 % / 24.2 | 70.2 % / 178 | 0.07 % / 10.2 | **0.42** (today 7.4) |
| forest · strafe | 20.2 % / 53.1 | 71.7 % / 181 | 1.3 % / 26.1 | **0.49** (today 3.4) |
| forest · dolly | 19.3 % / 50.5 | 71.7 % / 186 | 2.9 % / 26.3 | **0.52** (today 3.7) |
| forest · bird path | 21.5 % / 58.9 | 71.3 % / 188 | 3.8 % / 34.1 | **0.58** (today 3.2) |

- **Per band.** The picture is the same in every distance band (420-600, 600-800, 800-1100, > 1100 m); the numbers
  are in the lab's `lab.results`.
- **Before the crispness tuning (§3.2).** The kit was at 0.35-0.45x the mesh (first run: row50 orbit 1.6 % / 14.4,
  forest orbit 0.06 % / 8.4). The tuning traded a little of that stability to get the leafy breakup back.

### What we see

The owner saw small dots on the foliage that crawl while the camera moves. Today's impostors have that halftone /
hatched crown (`impostors/strip_row50_orbit.png`, middle row), and the kit has none of it. Images:
- `impostors/strip_row50_orbit_v2.png`: 12 consecutive orbit frames, 3x, rows mesh / today / kit, final defaults.
- `impostors/strip_row50_orbit.png`: the first cut, which was softer.
- `impostors/boil_orbit_600m.jpg`: slow orbit, a frame every 0.5° over 6°, one tree at 600 m. Rows: mesh, today, kit
  (default), kit with 1-step parallax, kit with the dominant view only. No boiling is visible in any kit row, and the
  three kit variants look the same.
- `impostors/sbs_430m_fov55_x6_kit_mesh_diff.png`: the same tree at 430 m at the city's FOV, 6x: kit | mesh |
  |diff| x4. They match pixel for pixel to within a few edge pixels.
- `impostors/sbs_handover_405m_kit_mesh_diff.png`: telephoto, before the crispness tuning.
- `impostors/far_fade_compare.jpg`: the far end. Kit fade into the orthophoto mean vs a cut, today's dither, and no
  trees.

### Brightness and crispness

Measured with `lab.treeStats(mode)` over the far trees' pixels in one frozen frame. Mean luminance 0-255; crisp =
mean |Laplacian| of luminance inside the crowns.

| | mesh | today | kit (final) |
|---|---|---|---|
| row of 50, against the sky: mean / inner | 93.7 / 87.0 | ~71 (darker, hatched) | 94.3 / 86.9 |
| row of 50: crisp | 319 | 334 | 308 |
| forest from above: mean | 108.2 | 53.6 | 110.1 |
| forest: crisp | 314 | 392 | 320 |

Today's "crispness" is its hatching. With alpha-to-coverage gain 4 the kit was 8 % darker than the mesh against the
sky: the mesh's far leaves let the sky through, and gain 1 does too.

### GPU

Frame ms are medians of 3-4 rounds x 2 s, alternating modes; each figure is the delta over "none" (no far trees).

| Scene | mesh | today | kit |
|---|---|---|---|
| row of 50 | +0.00 | +0.00 | +0.00 |
| forest patch (2,008 trees, 420-1,100 m) | +1.77 | +0.98 | **+0.92** |
| far forest (83,208 LiDAR trees within 1.6 km of L8, view from 140 m) | (not run: too heavy) | +2.88 (to 1,100 m) | **+1.84** (to 1,500 m), +1.64 (to 1,100 m) |

- **The ≤ 1 ms target** from the research holds for the forest patch. The 83k-tree far forest is a dense crown carpet
  seen at a grazing angle, and every impostor system pays its overdraw: today 2.9 ms, the kit 1.8 ms.
- **Depth output** (`pdo`) on the 400-600 m ring alone cost +2.7 ms in the far forest (`frag_depth` turns early-z off,
  so every card fragment of the EQUAL colour pass shades). The meter saw no stability gain from it, so trees default
  to no depth output and no parallax. Both stay in the kit for types that need ground contact (cars), with a near / far
  ring split (`ring`, `view.ringSplit`, field `farMats`).
- **Front-to-back instance order** (`field.sort(eye)`): about -0.1 ms.

### Bake, memory, main thread

| | kit | today |
|---|---|---|
| Layout | 16 x 16 hemi views x 64 px (56 inside a 4 px gutter), 6 variants = 6 layers of 1024², 4 per-cell mip levels | 8 x 8 views x 128 px, 2048 x 3072 x 2 |
| Memory | **63.8 MB** | 64 MB |
| Bake | ~2.9-3.6 s wall: 108-152 ms of main-thread render submits spread over 96 frames (one grid row per frame), ~1.2-1.3 s in the worker | 100-160 ms, synchronous, one long task |

A Chrome performance trace of a re-bake (`lab.bakeKit()` with a `longtask` observer) found **0 long tasks**.

### Hand-over

The research recommended an object-anchored dither (Wyman-McGuire hashed). Measured on one tree inside the 370-400 m
hand-over band, telephoto, 0.02 m/frame strafe, d2:

| mesh only | today | kit, object-anchored | kit, screen IGN |
|---|---|---|---|
| 29.7 | 174 | 44.8 | **19.3** |

Object cells at the pixel scale are resampled by sub-pixel motion, which is worse than the fixed screen pattern when
both sides of the split already look alike. **The kit therefore uses the screen IGN** (`makeFade({ noise: 0 })`). The
object-anchored noise stays as an option (`noise: 1`; `meshKeep` / `impostorKeep` stay complementary either way). The
real fix for the hand-over was baking from the mesh state at that distance (LOD 2, morph complete).

## 2. How it works

| File | What |
|---|---|
| `octa.js` | Grid ↔ direction (hemi default, full optional), the 3-view triangle and its weights, frame basis. CPU and TSL from the same formulas. |
| `bake.js` | `bakeAtlas(renderer, source, spec)`. Per grid row, the views go into a strip at `ss` = 4 x 4 supersampling (MRT: `output` = albedo + 1, `aux` = octahedral-encoded view-space normal, depth over the sphere, a type scalar). A GPU resolve pass gives fractional coverage. Async read-back. `bakeWorker.js` does dilation, per-cell coverage-preserving mips (Castaño) and the octagon card. Upload into two `DataArrayTexture`s: level 0 through three, levels 1+ with `device.queue.writeTexture`, because r187 uploads only level 0 of an array. `bakeMaterial({ albedo, normal, aux, discard, positionNode })` is the G-buffer contract for sources. |
| `material.js` | `impostorMaterials(atlas, opts)` returns `{ depth, colour }`: a depth pre-pass (alpha-to-coverage, hand-over mask, optional depth out) and a lit EQUAL colour pass. **Vertex stage:** the camera-facing octagon card, a distance cull, the 3 views, per-view homogeneous ray / plane-hit varyings (exact under interpolation), and a per-instance analytic mip level. **Fragment stage:** per view, optional 1-2 step parallax, then albedo + aux taps (6 taps without parallax); one weighted alpha; colour, normal and aux weighted by coverage; lighting by the type's `shade`; far fade into `FAR.ground`. |
| `field.js` | `impostorField(mats, placements, { card, farMats })`: one InstancedMesh pair per material for every instance; `sort(eye)`; `updateView(view, camera, renderer)` each frame. |
| `fade.js` | `makeFade`, `handoverT` / `meshKeep` / `impostorKeep` (the mesh LOD uses the same noise and `t`), `farT`, `objectNoise` (option). |
| `types.js` | Presets (`tree`, `car`, `prop`), `FAR.ground`, `treeShade(U)` (the stylized leaf lighting on baked inputs, per-tree tint). |
| `sources/stylizedTrees.js` | The city's stylized trees as a source, baked at the hand-over state (LOD 2 with its cards grown 1.7x). |

### Defaults

These are the meter's choices; every one is a lab toggle.

| Setting | Default |
|---|---|
| Views | 3-view barycentric |
| Parallax / depth out | 0 / off (trees) |
| Alpha | `a2c-ramp`, `coverage = saturate((alpha - 0.5) x gain + 0.5)`, gain 1, mip bias -1 |
| Card | octagon |
| Hand-over noise | screen IGN |
| Far fade | `ground` (the shading fades into the orthophoto's mean albedo + up normal; instances culled past `end`) |
| Distances | hand-over 400 m (band 30), end 1,500 m (band 300) |

The `ground` far fade drops no pixels.

### Alpha path

What fixed the dots, in order of effect:
1. Supersampled coverage in the bake: a real fractional alpha instead of a 0/1 staircase.
2. Per-cell coverage-preserving mips, with no union and no mip boost.
3. One per-instance mip level computed analytically (no `fwidth` noise).
4. One coherent alpha, the weighted sum of the 3 views.

The coverage ramp itself barely matters. Sweep on the forest strafe, d2:

| ramp gain 1 | ramp gain 2 | ramp gain 4 | Golus `fwidth` ramp | cutout |
|---|---|---|---|---|
| 20.6 | 20.5 | 17.8 | 20.1 | 26.5 |

All of them are far below today's 182.

## 3. Using the kit for a new object type

1. **A source** (`sources/<type>.js`) with:
   - `count` (variants = layers);
   - `sphere(v)`: the object-space bounding sphere;
   - `object(v)`: an Object3D at the identity, drawn with `bakeMaterial({ albedo, normal, aux, discard, positionNode })`
     built from the type's own nodes (albedo **before** any per-instance tint, so it can be tinted live);
   - optionally `beforeRender` / `afterRender` (put the source in the state it has at the hand-over: LOD, morph).
2. **A preset** in `types.js`:
   - grid and cell: a cell texel ≈ a screen pixel at the hand-over (cars 12 x 12 x 48, props 8 x 8 x 40);
   - `fade` distances;
   - `material` options. Cars want `pdo: true` (ground contact) and `parallax: 1`.
3. **A shade function** `({ m, albedo, nW, aux, far, inst }) => {...}` that sets `m.colorNode` / `normalNode` /
   `aoNode` / `emissiveNode` from the baked inputs (see `treeShade`). Cars add a paint-mask channel to `aux` and tint by
   `inst`.
4. **At runtime:**
   - `const atlas = await bakeAtlas(renderer, source, TYPES.x)`;
   - `const fade = makeFade(TYPES.x.fade), view = makeView()`;
   - `const mats = impostorMaterials(atlas, { ...TYPES.x.material, fade, view, shade })`;
   - `const field = impostorField(mats, placements)` with placements `{ x, y, z, yaw, scale, variant }`;
   - `scene.add(field.group)`, and every frame `updateView(view, camera, renderer)` and `lodEye` (`viewer/lodFade.js`)
     set to the camera.
5. **The mesh LOD it hands over from:** give its last LOD material `maskNode = meshKeep(fade, distance,
   fadeNoise(fade, anchorOf(fade, foot, scale), footSeed(foot)))`. The lab does exactly this for the stylized trees'
   LOD 2 (`farMask` in `labs/impostor-lab.js`).
6. **Measure it in the lab:** add a scene, run the meter (mesh / today / kit), the strips, the side by side and the
   bench, and keep the numbers here.

## 4. Weak points / not done

- **Telephoto.** At FOV ≤ 20 the impostor is magnified past its 56-px cell and looks softer than the mesh
  (`boil_orbit_600m.jpg`). A 96-px cell (+125 % memory) or KTX2 compression would buy that back.
- **Far colour.** The stylized tree palette is brighter / yellower than the orthophoto at 1-1.5 km. The far fade
  softens it but does not solve it; that is a tree-colour question, not the kit's.
- **Ground contact.** No depth output for trees means flat card depth against the ground and between crowns. It was not
  visible in the scenes here, and it is available per type.
- **The meter.** d2 measures frame-to-frame flicker, not slow swimming; boiling was checked by eye on slow strips only.
- **EQUAL depth with `depthNode`.** Not checked on other GPUs (the `colourDepth: "lequal"` option exists). Full
  octahedral layout untested. Shadows: receive only, no casting proxy.
- **Not done:**
  - the lab's building / rock slots are empty (cars: §5);
  - KTX2;
  - the city migration (phase 3, after the tree-branch review);
  - the WebGL2 fallback: the kit needs WebGPU for `writeTexture`.

## 5. Phase 4: parked cars (2026-11-12, lab only)

Lab: `labs/impostor-lab.html?scene=cars` (`labs/impostor-cars.js`; `&mode=kit|today|mesh|none`, `&start=`, `&grid=`,
`&cell=`, `&full=1`, `&lod=`, `&pdo=0`, `&parallax=0`, `&time=night`). A straight street of **300 parked cars**, 150 per
kerb, in real slots (the fleet's type mix `TYPE_MIX` and slot lengths `slotNeed`, 0.2-1.3 m gaps, a driveway now and
then; 900 m), terraced facades, the city's lighting and post chain. The cars are the city's own: the faceted family made
into LODs by the city's worker (`viewer/carLodWorker.js`), drawn with `packMaterial` and `carFleet.js`'s batching and
LOD / cross-fade loop (copied into the lab, because the fleet is a singleton whose distances are module constants).

Modes:
- **mesh**: the LODs to 1.5 km (LOD 3 past 130 m). This is the reference.
- **today**: the city as it is (fade-out at 380-420 m).
- **kit**: the mesh LODs to the hand-over, then impostors.
- **none**: no cars.

### 5.1 How it is built

| Piece | What |
|---|---|
| `sources/fleetCars.js` | One layer per car type (8: hatch_s, hatch_c, estate, saloon, suv, van_c, van_p, taxi), baked from the worker's LOD arrays. **Paint as a linear split:** `A.rgb` = the colour of everything that is not paint (0 on the paint), `B.a` = the paint's shade (its vertex colour is a grey that the paint multiplies). At runtime colour = `A.rgb + B.a x paint`. This stays exact through the resolve, dilation, mips and bilinear taps. |
| `types.js` `carShade` | packMaterial's far material (MeshStandard: paint roughness 0.34 / metalness 0.25, the rest 0.62 / 0), the paint from `inst.tint`, far fade into `FAR.road`. |
| `field.js` | New per-instance `ikTint` (rgb, default 1; sorted with the other attributes). The taxi passes its own paint. |
| `contact.js` | `contactShadows(items)`: Mr.doob's contact quad (his `createContactShadowMaterial`: footprint + 0.33 m wide, + 0.55 m long, 1.8 cm up), one instanced transparent draw, culled past the kit's end. |
| Hand-over | Screen IGN, complementary on both sides. The mesh's LOD 3 fade batch keeps h < 1 - t (`lodFade = 2 - t`, packMaterial's "incoming" range); the impostor keeps h >= 1 - t. Both sides take t from the distance to the **bake sphere centre**. |

**First cut, rejected.** It stored a neutral albedo plus a paint *mask* and computed colour = albedo x mix(1, paint,
mask). Every texel straddling a paint border leaked the white neutral shade, which drew bright lines along the window
line and the sills. A black car measured 76 against the mesh's 26 (luminance). With the split above it measures 29 vs 20
at 80 m, 26 vs 22 at 160 m and 44 vs 39 at 300 m.

### 5.2 Decisions, with the evidence

Each variant was measured two ways:
- the jitter meter: d2 x1000 per band, on the drive and fly paths;
- **mad**: the mean |kit - mesh| (0-255) over the far cars' pixels (bands past 150 m), from three views: street level,
  a first-floor window, and above (55 m).

Absolute luminances drift between runs (the lab's exposure adapts in between), so compare only within one run.

| Variant | Atlas MB | mad street / above / window | drive 150-250 | fly 150-250 |
|---|---|---|---|---|
| **hemi 12 x 12 x 48, LOD 3, PDO + parallax 1 (default)** | **26.9** | **19.8 / 18.8 / 24.5** | 15.7 | 130 |
| full 12 x 12 x 48 | 26.9 | 21.4 / 19.6 / 25.5 | 16.4 | 128 |
| full 16 x 16 x 48 | 47.8 | 21.1 / 18.7 / 24.5 | 16.7 | 132 |
| hemi 16 x 16 x 48 | 47.8 | 20.3 / 17.9 / 23.3 | 16.1 | 131 |
| hemi 8 x 8 x 48 | 12.0 | 20.3 / 21.9 / 24.7 | 15.8 | 131 |
| hemi 12 x 12 x 64 | 47.8 | 19.3 / 18.9 / 24.9 | 15.4 | 131 |
| hemi 12 x 12 x 32 | 11.8 | 18.2 / 18.8 / 25.2 | 16.7 | 121 |
| bake from LOD 0 | 26.9 | 27.4 / 25.3 / 31.4 | 15.5 | 143 |
| bake from LOD 2 | 26.9 | 27.9 / 24.9 / 32.5 | 16.3 | 142 |
| no parallax | 26.9 | 26.1 / 26.8 / 32.7 | 14.9 | 123 |
| no depth out | 26.9 | 25.2 / 24.0 / 31.5 | 14.7 | 129 |
| neither | 26.9 | 24.9 / 26.1 / 32.4 | 14.5 | 118 |

- **Hemi, not full.**
  - The check: every parked-car slot of every tile against eye points 1.6 m over the roads, 150-600 m apart, with a
    terrain line of sight, on the city's DTM and road graph.
  - Result: 43 % of the visible pairs see the car from slightly *below* its centre, but only by median -0.9°, p99
    -3.5°, worst -4.7°.
  - Hemi clamps those views to the horizon row. The error stays under the 12 x 12 grid's ~8° view spacing.
  - Full octahedral halves the side views' density for the same memory, and it measured worse (21.4 vs 19.8). Views
    from above (fly, windows) are on the hemisphere anyway.
- **12 x 12.** 16 x 16 buys about 1 point of error for +78 % memory; 8 x 8 loses 3 points from above.
- **48 px.** 32 px measures the same at 720p. But a 40-px cell over the ~5 m sphere gives a texel per pixel at 150 m at
  1440p (the owner's screen). 64 px costs +78 % memory for no measurable gain.
- **Bake from LOD 3**, the mesh the kit hands over from. LOD 0 and LOD 2 bakes are 7-8 points further from the mesh.
- **Depth out + 1 parallax step ON.**
  - Cost: a little stability (drive 15.7 vs 14.5), and +0.016 ms GPU for 250 impostors (one timestamp step).
  - Gain: the impostor sits much closer to the mesh (mad 19-25 vs 25-33).
  - Why: the card's flat depth clipped the lower body against the road and kerb, and let the contact quad draw over it
    from above.
- **Coverage gain 2** (`TYPES.car.view`). Cars are solid. At gain 1 (the trees' setting) the soft edge let the bright
  background through: at night, 250-600 m, the kit measured 61 / 77 against the mesh's 48 / 60. Kit / mesh luminance
  over the far cars:

  | | street | above | window |
  |---|---|---|---|
  | midday, gain 1 | 78.5 / 69.2 | 87.1 / 88.8 | 83.0 / 81.1 |
  | **midday, gain 2** | 69.7 / 63.8 | 83.8 / 86.0 | 76.9 / 79.6 |
  | midday, gain 4 | 67.2 / 63.2 | 82.6 / 85.7 | 75.3 / 79.1 |
  | night, gain 1 | 27.6 / 20.1 | 36.0 / 32.2 | 41.3 / 32.2 |
  | **night, gain 2** | 24.5 / 20.7 | 31.2 / 31.8 | 32.7 / 31.8 |
  | night, gain 4 | 22.6 / 20.6 | 29.9 / 31.8 | 29.3 / 31.8 |

- **Hand-over at 150 m**, band 12 m (clear of the LOD 2 -> 3 cross-fade at 130 m ± 5 %).
  - Starts at 100, 150, 200 and 250 m all measured at or under the mesh's jitter in the band that holds the hand-over
    (drive, 100-150 m: kit 25 with a 100 m start, mesh 42).
  - 150 m is where a texel is a pixel at 1440p, so the impostor is not magnified there.
  - Strip: `impostors/cars_handover_strip_132_156m.png` (FOV 20, x3, the centre car from 132 to 156 m; mesh row, kit
    row). The only change is the dither inside the band: no pop, same paint.
- **Night.** Parked cars have their lights off on both sides: packMaterial gets no `lights`, and the impostor bakes the
  unlit lamp colours. Image: `impostors/cars_sbs_night_above_x3.png`.

### 5.3 Jitter meter (final defaults, 24 frames, 1280 x 720)

Each cell gives blink share / d2 x1000. Bands are measured from the path's start eye; the "100-150" band holds the
hand-over.

| Path | Band | mesh | today | kit |
|---|---|---|---|---|
| drive-by at 30 km/h, eye 1.25 m | 100-150 | 12.5 % / 54.0 | 12.5 % / 54.2 | 12.7 % / 53.3 |
| | 150-250 | 1.5 % / 24.1 | 1.5 % / 24.0 | **0.6 % / 18.0** |
| | 250-400 | 1.3 % / 11.2 | 1.3 % / 12.6 | **0 % / 6.4** |
| | 400-600 | 0 % / 8.3 | 0 % / 7.1 (19 px, fading out) | **0 % / 3.4** |
| orbit 0.02°/frame around 260 m | 150-250 | 49 % / 89.1 | 48.6 % / 88.7 | **38.2 % / 79.5** |
| | 400-600 | 34.7 % / 75.7 | 45.5 % / 58.0 | **22.5 % / 57.1** |
| strafe 5 cm/frame | 150-250 | 61.3 % / 99.4 | 60.3 % / 99.9 | **48.4 % / 86.3** |
| | 250-400 | 52.9 % / 96.4 | 45.7 % / 92.5 | **32.6 % / 83.4** |
| fly 0.6 m/frame, 45-60 m up | 150-250 | 30.8 % / 115 | 31.1 % / 117 | 40.0 % / 125 |
| | 400-600 | 21.1 % / 67.0 | 20.0 % / 56.4 | **5.3 % / 41.8** |
| | > 600 | 20.4 % / 71.1 | (no cars) | **1.6 % / 34.5** |

- **Mask sizes.** At street level the masks are small: cars at 150-600 m seen from 1.6 m up cover a few hundred pixels
  in every mode. The fly path's masks are 3-12k px.
- **Result.** The kit is at or under the mesh everywhere except fly 150-250 m (+9 % d2), the first impostor band seen
  from above.

### 5.4 GPU and memory

**Isolated cost** (`lab.microBench()`):
- the cars alone in their own scene, with no shadows and no post;
- 60 renders per sample, 6 alternating rounds, timestamp medians;
- the timestamps step by 0.016 ms, and the GPU is shared with other tabs, so treat ±0.02 ms as noise.

| View | mesh LODs, all 300 | today (to 420 m) | **kit, all 300** | mesh past 150 m | **kit past 150 m** | contact quads |
|---|---|---|---|---|---|---|
| street level | 0.23-0.30 | 0.18-0.25 | **0.20-0.25** | 0.066 | **0.033-0.049** | < 0.016 |
| above (55 m) | 0.12-0.21 | 0.07-0.13 | **0.07-0.15** | 0.05-0.12 | **0.016-0.049** | < 0.016 |

- **Target met:** 300 cars ≤ 0.3 ms with impostors beyond 150 m. The near mesh cars are most of that cost.
- **Impostors vs LOD 3:** the impostors cost a third to a half of the LOD 3 meshes they replace, and they draw every car
  out to 900 m, where the city drops cars at 420 m.
- **Whole-frame bench** (`lab.bench()`): it could not separate the cars from the shared GPU's noise (±0.2 ms between
  rounds). Its medians agreed with the isolated numbers: none 0.92-0.98, mesh +0.46-0.52, today +0.46, kit
  +0.39-0.46 ms.

**Memory and bake:**
- Atlas: 26.9 MB (8 layers x 576² x 2 RGBA8 textures, 4 mip levels).
- Mesh LODs (all 4 LODs of the 8 types): 13.0 MB of geometry.
- Bake: 2.1-3.0 s wall time, of which 53-114 ms are main-thread render submits spread over 96 frames, and 0.4-0.5 s
  run in the worker.

### 5.5 Adding a car type

1. Add the car to `tools/blender/carFaceted.py` (the GLB contract: Body / Wheel_* children, `_KIND`, `COLOR_0`; paint
   is kind 1 with a grey shade; `extras.keepPaint` / `paint` for fixed-colour cars), and to `carFleet.js` `TYPE_MIX` /
   `SIZES`.
2. Nothing changes in the kit: `fleetCarSource(lodData.cars)` makes one layer per car in the worker's output (+3.4 MB
   per type).
3. Placements carry `tint` = the car's paint (linear), or the car's own `extras.paint`.

### 5.6 Images

- `impostors/cars_street_kit.jpg`, `impostors/cars_above_kit.jpg`: the scene in kit mode.
- `impostors/cars_sbs_above_140_300m_x3.png`: kit | mesh | |diff| x4 from above, 140-300 m.
- `impostors/cars_sbs_street_150_400m_x6.png`: the same at street level (cars of 5-15 px).
- `impostors/cars_handover_strip_132_156m.png`: across the hand-over.
- `impostors/cars_sbs_night_above_x3.png`: night.
- `impostors/cars_contact_on_off_x4.png`: contact quads on / off at 150-230 m (a subtle darkening under the bodies).

### 5.7 Weak points

- **No glass channel.**
  - The split uses `B.a` for the paint, so glass (roughness 0.06) is shaded as "the rest" (0.62).
  - LOD 3 has almost no glass faces (its windows are interior / dark kinds), so the far material still matches.
  - What is lost: a glossy window glint at 150-300 m. A third texture would bring it back (+13 MB).
- **Street-level brightness** at 150-600 m is still +9 % (midday) / +18 % (night) over the mesh at gain 2, on a few
  hundred pixels. From above and from windows it is within ±3 %.
- **Fly path, first impostor band** (150-250 m seen from above): d2 is 9 % over the mesh.
- **Hand-over dither:** the screen IGN band (138-150 m) is visible in a magnified view (FOV 20), as on the city's own
  LOD fades.
- **Telephoto:** below FOV ~20, a car past 150 m is magnified beyond its 40-px cell and goes soft.
- **The lab's mesh fleet is a copy** of `carFleet.js`'s loop (with live distances). The city switch must add the
  hand-over to `carFleet.js` itself (TODO).
- **Quad card:** drew nothing in a quick test with cars. The octagon is the default and was used throughout; not
  investigated.
- **Hemi below the horizon:** argued from the DTM statistics (worst -4.7°), not rendered from a slope in the lab.
- **GPU numbers** are at the timestamp resolution (0.016 ms), on a GPU shared with other tabs.
