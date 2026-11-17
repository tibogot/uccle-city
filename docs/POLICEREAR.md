# The police car's rear while driving (branch claude/policerear, TODO 8c)

Owner playtest 2026-11-16: *"Police car rear: bad lines while moving (default chase view)"*: aliasing / shimmer on the
back of the car. Since then claude/sharp (the chase car kept no TAAU history: fixed) and the player's solid glass
(`?carglass=old`, policefeel) were merged; this job finds what is left.

## Phase 1 (offline, code + GLB; no browser)

### Candidates, with the evidence

The player's car in the chase view: rear 3.8 m from the camera (CAR_CAM.chase 6.0 m / 2.0 m, fov 60-61), on the owner's
1080p at the auto scale 0.8 (H 864 internal) **5.2 mm per internal pixel** (7.2 mm at sharpCheck's 1600 x 828 x 0.75).
`node tools/cars/rearThin.mjs` rasterises the car's albedo from the chase camera (x8 supersampled, depth-tested, the
player's solid glass hiding the interior) and simulates the TAAU input: per pixel the 16 Halton jitter phases, and the
**clamp miss** (a class truly covering part of a pixel that none of a phase's 3 x 3 neighbourhood samples hits: the
resolve's clip then drops it from the history that frame; an ordinary edge never has this, a thin line does).

| # | candidate | evidence | fix (switch) |
|---|---|---|---|
| 1 | **The rear plate is geometry**: 4 mm red border, 5 x 7-cell characters of 8.6 mm strokes, 0.6 mm over the white plate (cars2.py `plate()`) | 0.8 px border, 1.7 px strokes; unmarked estate: plate red 74 % + plate white 17 % of the rear's clamp miss (18.8 total); with a textured plate 1.78 (-91 %). Marked police estate 24.2 -> 7.6 | the plate a pre-filtered TEXTURE quad over the modelled one (viewer/police/plateDecal.js; mipmaps + 8x anisotropic; +1 draw) `?carplate=old` |
| 2 | **Specular lines on sub-pixel bevels**: the spoiler (2.4 cm slab, 8 mm bevels), roof rear edge, top of the rear window: 7 mm strips whose normals turn > 20 deg, under the 0.05 clear coat on the DARK unmarked paint (max contrast for a sky reflection) | estate rear: ~5.8 m of such strips at y 1.3-1.45 m (~1.3 px wide); three's own geometric roughness (max abs dN) is in, but no variance filter | Filament's normal-variance specular AA on paint, glass and clear coat (carPacks.js specAA) `?carspec=old`, live `playerLook.specAA` **dropped: measured nothing** |
| 3 | **SSR on the player's car**: half internal res, quality 0.25, binary refine; added to the beauty BEFORE the TAAU; the car holds still on screen while the reflected street streams over it, so its history (which follows the car) never matches | code: post.js metalRough.r = metalness (paint 0.25, glass 0.1) under roughness 0.75 -> SSR weight 1 on the paint (0.34) and glass (0.06) | the player material writes SSR weight 0 (its own mrtNode; environment reflections stay) `?carssr=old`, live `playerLook.noSsr` **dropped: measured nothing** |
| 4 | **Shut lines** (paint_seam, 6 mm: bumper and tailgate across the rear, the gate's sides) | 1.2 px at H 864, 0.8 px at 621; unmarked: small (dark on dark: 0.76 of the clamp miss), marked white: 3.5 | contrast by footprint (6 mm / pixel size, full at 1.5 px, floor 0.35) `?carseam=old`, live `playerLook.seam` **dropped: measured nothing** |
| 5 | lamp surrounds / smoked rims (5 mm trim insets round the tail lamps) | the "black trim / gloss" 0.89 (unmarked) / 3.9 (marked) left after the plate | not fixed yet (browser first) |
| 6 | self-shadow stepping (the sun map snapped to world texels, 2.9 cm at the 60 m box: ~5 px at the rear; the car slides through it) | temporalPCF already rotates its taps per frame (claude/sharp): likely small | isolation knob only (`no-self-shadow`) |
| 7 | motion vectors on a child mesh (kit, plate) | ObjectMotionMatrix is per OBJECT (every mesh's own matrixWorld): the merged kit and the plate quad get the chassis' motion | none needed |
| 8 | emissive tail lamps under the firefly weighting / bloom | by day the tail is 0 unless braking; at night 0.4 | night check in the browser |
| 9 | kit merge (`?carmerge=old`) | the kit is on the roof / grille, nothing at the rear | isolation only |

## Phase 2: the browser (2026-11-17, RTX 4050 laptop, system preflight GREEN, one tab, 1280 x 720 at DPR 1)

Setup: `?game=police&dynres=0&rscale=0.8&traffic=0` (internal 1024 x 576), golden hour; the car put on the longest
straight of the yard -> Saint-Job route (Avenue Wolvendael, x -366.4, z 169.8, heading 0.995), the loop stepped at 1/60 s
(debug/rearCheck.js): 40 frames parked, accelerate to 50 km/h, 60 frames straight, 45 frames with steer 0.15. Rear crop =
the body's rear box projected (about 280 x 144 px); plate crop = its [0.28, 0.62, 0.44, 0.32]. Shimmer = median mean
|delta high-pass luma| (x / 255), hot = % of pixels whose high-pass changed > 8 / 255 in a frame. Medians of 2-3
alternated rounds; each run starts from the same pose with the same inputs (a camera cut: a fresh history).

### Every fix against its ?x=old (live A/B in one page)

2 rounds, rear crop, the car receiving NO shadow (so the street's tree shadows do not drown the fixes; see below):

| knob | straight shimmer | straight hot % | turn shimmer | turn hot % |
|---|---|---|---|---|
| all old | 0.888 | 1.79 | 1.228 | 3.06 |
| all new | 0.804 | 1.53 | 1.127 | 2.62 |
| old + plate texture | 0.844 | 1.55 | 1.126 | 2.80 |
| old + specular AA | 0.910 | 1.62 | 1.246 | 3.13 |
| old + no SSR | 0.901 | 1.63 | 1.247 | 3.21 |
| old + shut-line pre-filter | 0.874 | 1.72 | 1.191 | 3.23 |

Specular AA, no-SSR and the shut-line pre-filter measured nothing (within a few %, not better than old in both phases):
**dropped** (carPacks.js is back to foundation's; the player material is exactly as before; the switches are gone).
Their GPU cost was within the noise as well (p50 11.2-11.5 ms, 4 alternated rounds each).

### The kept fix: the plate texture (?carplate=old), final runs (3 alternated rounds, after the text fix)

| crop / phase | old (modelled plate) | new (texture) | change |
|---|---|---|---|
| plate: parked shimmer | 0.651 | 0.363 | -44 % |
| plate: straight shimmer / hot % | 2.027 / 5.82 | 1.650 / 4.74 | -19 % / -19 % |
| plate: turn shimmer / hot % | 4.921 / 17.6 | 4.191 / 16.1 | -15 % / -9 % |
| rear: parked shimmer | 0.170 | 0.132 | -22 % |
| rear: straight shimmer / hot % | 1.438 / 4.06 | 1.419 / 3.78 | -1 % / -7 % |
| rear, no shadow on the car: straight shimmer / hot % | 0.888 / 1.66 | 0.859 / 1.47 | -3 % / -12 % |

(The first 2-round run: plate straight 2.201 -> 1.621, -26 %, hot 7.77 -> 4.54, -42 %.) Cost: +1 draw (181 -> 182; not
in the shadow pass), GPU p50 11.40 ms vs 11.53 ms old (noise), frame 16.7 ms both; one 512 x 108 texture + mips.
The plate reads the same: the same characters (2-XDK-032: the modelled estate's), right way round, same place and size,
sharper and steadier (`docs/policerear/rear_parked_1to1_old_new.png` 1:1, `plate_parked_x3_old_new.png` x3; old left,
new right). The car's material is unchanged: side and front identical by construction (only a quad over the rear plate).

### The biggest remaining source: the street's shadows sweeping over the car (NOT fixed here)

| rear crop, all fixes on | straight shimmer / hot % | turn shimmer |
|---|---|---|
| default | 1.39 / 3.66 | 1.93 |
| the car receives no shadow | 0.79 / 1.40 | 1.17 |
| the car casts no shadow (no self-shadow) | 1.32 / 3.74 (= default) | 1.88 |
| ?shadownoise=old (claude/sharp's per-frame PCF rotation off) | 1.35 / 3.64 (= default) | 1.86 |
| PCF radius 3 instead of 1 | 1.37 / 3.91 (= default) | 1.89 |
| SSR off everywhere / clear coat off | 1.38 / 3.86, 1.39 / 3.76 (= default) | 1.85 / 1.88 |

So ~43 % of the rear's frame-to-frame change while driving is the low golden-hour sun's tree shadows (the planes along
Avenue Wolvendael) sweeping over the car: moving light, not the car's own shadow, not the PCF noise, not the filter
width. The strips show it as a lit band with a ragged, sparkly edge sliding across the tailgate
(`docs/policerear/strip_shadow.png`: top with the car's shadows, bottom without; `strip_old_new_x2.png`: old / new).
The history cannot help (the light moves relative to the car while the motion vectors follow the car), so each frame
shows the raw shadow map (2.9 cm texels) of alpha-tested leaf cards. Next job candidate: a smoother received sun shadow
for the player's car and near movers (e.g. a blurred / lower-frequency foliage shadow), measured with
`rearCheck.ab({ knobs: ["new", "new+no-self-shadow"] })`.

### HEAP line (5 boots, localStorage cleared each)
`?gamemenu=0&orbitcam2=old` (JS heap 1.9 GB), default (1.0 GB), `?gamemenu=0&tilecache=0` (2.1 GB), `?game=police` +
gamePerf police 45 s (54.8 fps, GPU 11.6 ms, 178 draws), `?game=falcon` (2.2 GB): 0 console errors, 0 WebGPU errors,
`__heapDrop.tripCounts` {} in all five.

### Tour and gate
Visual tour `policerear` vs `uccle-tour/.tour/foundation`: 0 of 22 flagged (worst cell: lycee-front 21.2 %, its known
noise; 0 console errors). Then `node tools/audit/mergeGate.mjs`: all 18 checks pass (policerear 8 / 8).

## Switch (viewer/features.js, Look)
`?carplate=old` the modelled plate alone. (`?carspec`, `?carssr`, `?carseam` were tried and dropped: above.)

## Tools
- `node tools/cars/rearThin.mjs [--car estate,police] [--H 864] [--plate-texture]`: the offline evidence above.
- `debug/rearCheck.js`: `police()`, `measure()`, `ab()`, `strip()` (header); knobs combine (`old+no-self-shadow`).
- Gate `policerear` (tools/audit/policeRear.mjs), QUALITY_RULES row 23.
