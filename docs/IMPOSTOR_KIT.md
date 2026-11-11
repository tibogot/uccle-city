# Impostor kit (`viewer/impostorKit/`) and the Impostor Lab

A generic octahedral impostor system for three.js r187 WebGPU + TSL. This covers phases 0-2 of
`docs/IMPOSTORS_RESEARCH.md` §5 and runs in the lab only. Trees move to it after the owner's tree-branch review
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
  - the lab's car / building / rock slots are empty;
  - KTX2;
  - the city migration (phase 3, after the tree-branch review);
  - the WebGL2 fallback: the kit needs WebGPU for `writeTexture`.
