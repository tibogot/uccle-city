# Look: fine-tuning toward NTE (Neverness to Everness)

The owner (2026-11-20) wants the city kept between realistic and stylised, with NTE (Hotta Studio / Perfect World, UE5)
as the art reference: a stylised city with cars that still reads as real.
References: 20 official press screenshots in `data/raw/refs/nte/` (git-ignored; sources in `data/raw/refs/nte/SOURCES.md`).
Our comparison shots are in `data/raw/refs/nte/ours/`, plus `docs/cars2/city_close_cars2.jpg` and `docs/weather/city/stjob_rain_dusk.jpg`.
These images are for look-dev only: never commit them, never ship them, never trace them.

## 1. What makes NTE read as "stylised but real"

- **Grade.** The colour is saturated but not cartoon-like. The day white balance is cool: the sky is a deep blue and the shadows are blue and lifted.
  - Shadows are never crushed. The darkest 5 % of pixels (p5) sits around 0.08-0.15.
  - The highlights stop short of clipping (p95 ≈ 0.8).
  - Contrast is moderate. Most of the "pop" comes from colour, not contrast.
- **Sky / fog.** The blue is deep and saturated. The cumulus clouds are big, crisp and bright.
  - Aerial perspective is clear: distant towers fade to a pale blue, so the scene reads in layers.
  - The golden-hour shots use strong backlight, a hot sun disc and long cast shadows.
- **AO and bevels.** Contact AO is soft but obvious, under cars, railings and kerbs.
  - Every manufactured edge is bevelled and catches a highlight: kerbs, window frames, railings, car body panels.
- **Materials.** Textures are clean and low-noise: almost no grime, no high-frequency speckle.
  - Asphalt is a dark, even blue-grey with soft large-scale patches.
  - Paving is big, clean tiles with crisp grout.
  - Roughness is low-to-mid everywhere, so surfaces pick up sky reflections.
- **Car paint.** The paint colours are saturated: red, light blue, white, yellow taxi.
  - The clear coat is strong, with sharp sky and street reflections.
  - Tyres are a clean black. Rims are bright metal.
  - Tail lights are emissive and bloom.
- **Road markings.** The paint is plentiful, fresh and high-albedo: double centre lines, box junctions, arrows, diamonds, kerb lines.
  - Markings are part of the composition and draw strong leading lines.
- **Vegetation.** Trees are painterly clumps with saturated greens and bright rims, very close to our stylised trees.
  - There are lots of low green: hedges, planters and kerbside bushes.
- **Density.** Every ground floor is a lit, coloured shopfront. There are blade signs, banners, posters, AC units and pipes.
  - Kerbside railings and bollards repeat along the streets.
  - There are many pedestrians and steady traffic.
  - Even the side streets feel lived in.
- **Night.** Night is a long "blue hour": a readable cyan-blue ambient (mean luma 0.23-0.42) against warm sodium practicals and neon.
  - Everything is wet. Reflections of signs and lamps streak down the road.
  - Bloom is generous on every practical light. Volumetric haze shows under the streetlights.
- **Outlines.** NTE has none on the environment. Toon shading and outlines are used only on the characters.
- **Camera.** The driving camera is low and wide (about 65-70° field of view).
  - Driving shots have speed motion blur. Photo and showcase shots have depth of field.
- **UI.** The UI is clean white with one accent colour, a round minimap and round action buttons. Our menu and minimap are already in this family.

## 2. Where we differ

Numbers come from the same crop and statistics on both sets:

| | NTE | ours |
|---|---|---|
| day mean saturation (HSV) | 0.40-0.49 | 0.26-0.31 |
| day shadow floor (p5 luma) | 0.08-0.15 | 0.03-0.08 (crushed) |
| day highlight (p95 luma) | 0.77-0.82 | 0.69-0.74 (a little dull) |
| day white balance (R/B mean) | 0.6-0.8 (cool) | 0.87-0.95 (neutral) |
| night mean luma | 0.23-0.42 | 0.11 (Saint-Job), rain dusk 0.06 |
| night shadow floor (p5) | 0.04-0.13 | 0.00 |

What the shots show:

- **Day.** Our frames are grey-neutral and slightly flat. Asphalt is light grey with fine speckle (Fort-Jaco shot).
  - Shadows go near-black under trees and on north faces.
  - The sky is a good blue, but the midday clouds are thin and sparse.
  - There is little aerial perspective, so the distance does not separate into layers.
- **Materials.** The Sacré-Cœur stone reads as a patchwork of high-contrast blocks. NTE would keep stone tone variance low.
  - Brick and render facades are fine but plain: few AC units, pipes, signs or awnings.
- **Cars.** The paint is matte and greyish (fleet `packLook.clearcoat` 0.7, base roughness 0.6). Little sky reflection, weak colour.
- **Markings.** Our markings are correct and sparse. We have no arrows, no coloured cycle lanes and no bus lanes.
- **Night.** Night is a true dark (stars, black shadows), lit only in lamp pools. Rain at dusk is almost black.
  - Wet reflections exist but have little to reflect: one lamp, a few windows.
  - The warm/cool split is missing. The ambient is too dark to read as blue.
- **Density.** Shopping streets have shopfronts but few signs, lit panels or people. Residential streets are realistic, and the gap there is small.

## 3. Fine-tuning steps, ranked from cheap to expensive

Every step needs the merge gate and the city tour before merge.

Steps 1-3 shift every tour view, so they should land as one deliberate "look" merge with before/after shots and a new tour baseline.

1. **Grade, day looks** (`viewer/post.js`, `LOOKS` and `outputNode`). A few constants.
   - midday: saturation 1.06 → about 1.15; vibrance 0.10 → about 0.18 (protects already-saturated pixels).
   - Add a small shadow lift: a toe of about +0.015 linear before the contrast pow, aiming for a p5 of about 0.07.
   - Make the shadow tint cooler: (0.965, 1.005, 1.045) → about (0.94, 1.0, 1.07).
   - midday balance: (1.015, 1, 0.985) → neutral or slightly cool.
   - Keep golden warm: golden stays the default and warm, and only gains the shadow lift.
   - Target: day saturation about 0.36-0.40. The rest of the gap is content (step 8), not grade.
2. **Sky fill, day** (`viewer/lighting.js`, `PRESETS.midday` / `golden`).
   - midday hemiIntensity 1.55 → about 1.8, with a slightly bluer `hemiSky`.
   - envIntensity 0.6 → about 0.75.
   - This gives blue, readable shadows instead of black ones, without adding lights (fixed-light rule).
   - midday clouds 0.38 → about 0.45 for bigger cumulus.
   - Stronger blue aerial haze at distance through the haze hook or fogDensity, so the far city separates into layers.
3. **Night = blue hour** (`PRESETS.night`, `LOOKS.night`).
   - hemiIntensity 0.6 → about 1.0, with a brighter `hemiSky` (about 0x34507e).
   - skyExposure 0.022 → about 0.04.
   - Night exposure up about +0.5 stop.
   - Bloom 0.30 → about 0.42; threshold 1.0 → about 0.85.
   - Target: night mean luma about 0.2 and p5 at least 0.03.
   - Keep the sodium lamps warm. The warm/cool split is the point of this step.
4. **Car paint** (`viewer/drive/carPacks.js` `packLook`, `viewer/carFleet.js` palette).
   - clearcoat 0.7 → 1.0, with a low clearcoatRoughness (about 0.05).
   - Paint roughness 0.6 → about 0.4.
   - Shift about 30 % of the fleet palette to saturated colours: red, light blue, white, yellow, bottle green.
   - Keep the rest as Belgian greys, silvers and blacks, for realism.
   - Raise the emissive strength of tail lights and headlights so they bloom at night.
5. **Asphalt and markings** (`viewer/roadPaint.js`).
   - Asphalt albedo slightly darker and bluer, with less high-frequency grain and more soft large-scale patching.
   - Paint a touch brighter and fresher on main roads.
   - Add direction arrows at signalled junctions.
   - Add red or ochre cycle lanes where OSM has `cycleway=lane`, and bus lanes where tagged.
   - Keep Belgian conventions: white lines, no yellow centre lines.
   - Needs data-audit rows for the new marking classes.
6. **Wet look** (`viewer/weather/surfaceWeather.js`, SSR weight in `post.js`).
   - When wet: lower film roughness and raise the SSR weight, so lamps, shop windows and tail lights streak.
   - Default night wetness is already 0.6, so check that the reflections are visible from the driving camera.
   - Rain dusk should read about 0.15 mean luma, not 0.06. That comes mostly from step 3 plus more emissive sources to reflect.
7. **Foliage and low green** (`viewer/foliage`, `viewer/gardens`, `viewer/treeLeafLook.js`).
   - Trees: keep them. Our stylised trees are already NTE-like. At most, a small saturation lift on the leaf colour.
   - Add kerbside planters and hedges on shopping streets. Make the grass verges a little more saturated.
8. **Shopfront signage and night practicals** (`viewer/shops`, `viewer/streetlife`, `viewer/nightLights`). This is the largest content gap.
   - Lit fascia signs and blade signs with invented names (no real brands).
   - Awnings in colour, pharmacy green crosses, posters on bus shelters.
   - All are emissive panels, not new lights (fixed pools only). They feed both the bloom and the wet reflections.
   - Do this with Shops v2 (`docs/SHOPS_V2_PLAN.md`).
9. **Facade clutter and stone tone** (materials library `viewer/materials/library.js`, facade kit).
   - Lower the tone variance of the block-stone materials (the Sacré-Cœur patchwork).
   - Add AC units, downpipes and small rooftop kit as procedural instanced props, following the Blender quality bar for anything hero.
10. **People density on shopping streets** (`viewer/pedestrians`). More visible walkers near shops and stops, within the perf budget.
11. **Camera feel, the most expensive** (`viewer/drive/chaseCamera.js`, `post.js`).
    - Speed-based field of view: 60° → about 68° at speed.
    - A light speed motion blur when driving.
    - Depth of field in photo mode (H) only.
    - These are new passes and have to pass the perf preflight first.

## 4. What NOT to change

- **Real Uccle stays real.** Keep the real streets, buildings, brick and render, setts and cobbles, tram, Belgian signs and white markings. No neon-Tokyo makeover, no invented skyscrapers.
- **Firmament sky and ACES tone mapping stay.** Tune the looks; do not swap the pipeline.
- **No environment outlines or toon shading.** NTE has none either.
- **The golden preset stays the default and stays warm.** The owner likes it.
- **The stylised trees and the Quaternius character style stay.**
- **Realistic baked material library first.** Only "cleaner" (less grime and speckle), not flatter or untextured.
- **Fixed light count.** Every "more light" here is emissive, bloom or ambient, never new runtime lights.
- **No shipped or traced NTE imagery, ever.**
