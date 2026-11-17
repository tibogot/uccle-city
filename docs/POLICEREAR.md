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
| 2 | **Specular lines on sub-pixel bevels**: the spoiler (2.4 cm slab, 8 mm bevels), roof rear edge, top of the rear window: 7 mm strips whose normals turn > 20 deg, under the 0.05 clear coat on the DARK unmarked paint (max contrast for a sky reflection) | estate rear: ~5.8 m of such strips at y 1.3-1.45 m (~1.3 px wide); three's own geometric roughness (max abs dN) is in, but no variance filter | Filament's normal-variance specular AA on paint, glass and clear coat (carPacks.js specAA) `?carspec=old`, live `playerLook.specAA` |
| 3 | **SSR on the player's car**: half internal res, quality 0.25, binary refine; added to the beauty BEFORE the TAAU; the car holds still on screen while the reflected street streams over it, so its history (which follows the car) never matches | code: post.js metalRough.r = metalness (paint 0.25, glass 0.1) under roughness 0.75 -> SSR weight 1 on the paint (0.34) and glass (0.06) | the player material writes SSR weight 0 (its own mrtNode; environment reflections stay) `?carssr=old`, live `playerLook.noSsr` |
| 4 | **Shut lines** (paint_seam, 6 mm: bumper and tailgate across the rear, the gate's sides) | 1.2 px at H 864, 0.8 px at 621; unmarked: small (dark on dark: 0.76 of the clamp miss), marked white: 3.5 | contrast by footprint (6 mm / pixel size, full at 1.5 px, floor 0.35) `?carseam=old`, live `playerLook.seam` |
| 5 | lamp surrounds / smoked rims (5 mm trim insets round the tail lamps) | the "black trim / gloss" 0.89 (unmarked) / 3.9 (marked) left after the plate | not fixed yet (browser first) |
| 6 | self-shadow stepping (the sun map snapped to world texels, 2.9 cm at the 60 m box: ~5 px at the rear; the car slides through it) | temporalPCF already rotates its taps per frame (claude/sharp): likely small | isolation knob only (`no-self-shadow`) |
| 7 | motion vectors on a child mesh (kit, plate) | ObjectMotionMatrix is per OBJECT (every mesh's own matrixWorld): the merged kit and the plate quad get the chassis' motion | none needed |
| 8 | emissive tail lamps under the firefly weighting / bloom | by day the tail is 0 unless braking; at night 0.4 | night check in the browser |
| 9 | kit merge (`?carmerge=old`) | the kit is on the roof / grille, nothing at the rear | isolation only |

### Browser plan (phase 2)

1. Reproduce: `?quick=1&place=stjob-street&view=drive&dynres=0&rscale=0.8` (+ the police game URL), `R.police()`,
   `R.strip({ knobs: ["old", "new"] })` (8 consecutive rear crops x3 + differences x4), screenshot to `docs/policerear/`.
2. Measure: `R.ab({ rounds: 2 })` (straight 50 km/h + a turn, rear crop: shimmer, hot pixels, sharpness) over the knobs
   `old`, `new`, each fix alone on `old`, and the isolation states on `new` (SSR off everywhere, clear coat off, no self
   shadow); `?carglass=old`, `?instmotion=0`, `?upscale=0`, `?sharp=old`, `?carmerge=old` by page loads.
3. Keep what measures, drop what does not; re-measure; HEAP 5 boots, the tour vs foundation, `node tools/audit/mergeGate.mjs`.

## Switches (viewer/features.js, Look)
`?carplate=old` the modelled plate alone · `?carspec=old` no specular AA on the player's car · `?carssr=old` SSR on
the player's car · `?carseam=old` shut lines at full contrast. The three look ones are live uniforms too
(`carPacks.js playerLook.specAA / noSsr / seam`, 0 = old): one page A/B, no rebuild.

## Tools
- `node tools/cars/rearThin.mjs [--car estate,police] [--H 864] [--plate-texture]`: the offline evidence above.
- `debug/rearCheck.js`: `police()`, `measure()`, `ab()`, `strip()` (header).
- Gate `policerear` (tools/audit/policeRear.mjs), QUALITY_RULES row 22.
