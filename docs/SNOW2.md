# SNOW 2 (branch `claude/snow2`, 2026-11-17)

FIX4.md item 4 (snowfall +1.8 ms GPU over clear) and the landmark snow looks of FIX4.md item 6.

## 1. Snow cost

### Where it went (before)
FIX4.md item 4 (Place Saint-Job street, RED machine): clear 9.67 ms, snowfall 11.45 ms (+1.78); the volumetric layer
0.2-0.5 ms, the falling flakes 0.2-0.4 ms, caps / trails ~0. docs/perf/AUDIT.md: the overcast sky alone (Firmament's
deck, the fog) +0.32 ms. The rest, ~1 ms, was the in-material snow cover (`cityWeatherize.js`, every lit material):

- the cover's value noise computed per pixel (`noise2D`: 4 `sin` hashes each, 2 lookups, 4 with the thin-snow
  drift), and ALL of it twice: once in the colour function, once again in the normal function;
- the overhead map read (5 texel loads for the smoothed exposure) on every ground pixel, also far outside the map's
  64 m window, where the result was thrown away by a select;
- the whole cover on every face, walls included (the mask is exactly 0 there);
- the normal's micro bump from screen derivatives and the snow tracks' 4-tap groove slope on every pixel (the tap
  results then discarded by a select far away);
- the layer's fragment: the same noise (2 + 1 + 2 lookups) and 4 trail taps per pixel always.

### What changed (`?snowfast=old` = all of it as before)
- **Baked snow noise** (`viewer/weather/snowNoise.js`): the cover mask (2 octaves), the thin-snow drift (2 octaves),
  the coarse octave and a streak noise in ONE 512^2 RGBA8 tiling texture (53 m period), periodic value noise with the
  same smoothstep interpolation, mipmapped, read with an explicit level from the pixel footprint (valid in per-pixel
  branches); the micro bump reads its coarse channel at 9 / m, its gradient from two more taps. ONE texture: a second
  one put the facade kit's material at 17 samplers (WebGPU allows 16 per stage: its pipeline failed, seen in the city).
- **Per-pixel branch on the slope**: the cover's whole graph runs only where `up > upLo` (the cover's lower bound;
  wind-plastered trunks keep their windward walls). Below it the old mask is exactly 0: walls skip it, nothing changes.
- **Colour -> normal share**: the normal function reads the mask, the packed (trodden) amount and the sparkle the colour
  function left in vars declared at its top (one evaluation a pixel instead of two). Guarded per build: only when the
  colour was built first in that build (three's NodeMaterial.setup builds the diffuse colour before the normal
  sub-build); else the normal computes its own as before. `?snowshare=old`: computed twice.
- **Overhead map, one filtered fetch**: a float RG copy of the map (base height, shelter; linear filter,
  float32-filterable) gives the exposure from one bilinear fetch instead of 4 texel loads + 1; read only inside the map's
  window and not on walls; the normal function reads it only for the puddles' ripples. `?snowlin=old`: the 5 loads.
- **Normal without derivatives**: the micro bump from the baked noise on the geometry normal (near only); the tracks'
  groove slope only near and only where trodden (explicit-level taps). A material without a normal map of its own skips
  the snow mask in its normal past the bump range (the snow normal is its geometry normal there).
- **Layer**: the baked noise, the sparkle and the trail taps only where they can show.
- **Flakes**: a flake that cannot show (inside the 0.8 m lens fade, past the window's round edge) collapses to a point
  in the vertex stage; the step compute runs on the drawn flakes only (`step.count = n`; `renderer.compute(node, n)` is
  refused for `compute(count)` nodes in r187).
- Tried and NOT kept: the layer drawn before the other opaque things (the ground under it rejected by the depth test
  early: -0.3 ms GPU-bound), but the roofs the layer lies on came out bare grey (Sacré-Cœur's crossing, flat roofs).
- No new pipeline (switchTest: 0 new pipelines / programs going clear -> snowfall -> snow cover -> clear), no light
  added, no DynamicDrawUsage.

The three.js snow / rain examples (`webgpu_compute_particles_snow`, `_rain`) and slop-newyork (uniform-driven road
wetness masks) were checked first (docs/WEATHER_RESEARCH.md): neither has a cheaper cover scheme than a
normal.y + noise mask; the saving here is in not computing it where it cannot show and not computing it twice.

### Numbers (2026-11-17, Place Saint-Job street view, preflight YELLOW: 5.8 GB free, Chrome 3.4 GB)
**How**: at the window's size the GPU ms says nothing: the dynamic resolution (`?quality=auto`) and the laptop GPU's clock
(P3, 855-1200 MHz) both settle to "just 60 fps", every state read ~11.5 ms. So: `?quality=native`, then
`debug/snow2.js bound(1.6)` (2560 x 1324, the GPU saturated at ~1.85-1.9 GHz, < 60 fps), and `pairs()`: the two states
back to back, 1.8 s each, 8 pairs in ABBA order (the second of two back-to-back samples reads ~0.3 ms high: the GPU
warming), the median of the per-pair differences. Same sky in both (custom states, cloud 1), so the overcast sky
(Firmament's deck, the fog: not snow) is out of the number. `autoPairs()` runs the set after a page load.

GPU ms at 2560 x 1324 (3.4 Mpx), median of the per-pair differences:

| | `?snowfast=old` | new (run 1 / run 2) |
|---|---|---|
| **snowfall vs overcast dry (the snow's whole cost)** | **+2.49** (an earlier run +2.68) | **+1.57 / +1.57** |
| materials' snow (layer hidden; includes the SSR on the salted roads' wet film, see below) | +1.31 | +0.92 / +0.79 |
| volumetric layer | +0.59 | +0.26 / +0.59 |
| falling flakes | +0.20 | +0.26 / +0.26 |

At the window's 1600 x 828 (1.32 Mpx) the fragment costs scale by ~0.39: about **+1.0 ms before, +0.6 ms now**.
The new total is -37 % (-0.9 ms at 3.4 Mpx). What is left, from cost-hunt runs (state variants in `debug/snow2.js`):
- ~0.6 ms of the "materials" share is NOT the snow maths: with the snow block reduced to a few ALU (temporary flags) the
  difference stayed; it follows the CONTENT: a salted carriageway in snow gets a wet film (metalness 0.12, low
  roughness), so the SSR pass traces it. That is the look (black wet asphalt between white kerbs), not overhead.
- the layer: its own lit fragment over the ground (drawn after it: the depth-first order was tried, see above);
- the gate on with the snow's sky / temperature: ~0.13-0.2; caps 0.07; foliage snow 0.
- the flakes' fragments: < 0.3.
Not reached: < 0.6 ms at 3.4 Mpx; it is ~0.6 ms at the window's size.

## 2. Landmark snow looks

### Sacré-Cœur's 54 deg slate (`?snowsteep=old`)
Was: blocky patches of cover in a 0.5-1 m pattern on the nave slope while the Rosaire's 45 deg slate (same material)
took a uniform cover. Two causes: (1) the snow layer's sliver cut dropped every triangle whose FLAT normal was past
55 deg, and the 12.5 cm heightfield's triangles on a 54 deg roof straddle that limit at random; (2) the material
cover in the partial-hold band (s = smoothstep(0.42, 0.78, up) ~ 0.45 at 54 deg) cut the isotropic value noise into
round blobs. Now: the layer cuts true slivers only (flat normal past ~66 deg) and judges the slope on its smooth field
normal (past 60 deg); the material cover in the partial band (~45-62 deg) turns its holes into STREAKS down the fall
line (narrow across, long along) over a thin veil, as winter photos of steep slate show; <= 40 deg roofs unchanged.

### The library slate's pale patches (`?slatemoss=old`)
The texture itself is even (p50 0.246, p99.5 0.312). The patches were the library's moss in `finish()`: its patches went
MATT (roughness 0.95) while the slate around them (~0.6) took the sky's grazing reflection, and that contrast read as
pale blotches from the street (seen in clear weather at the castle's front; also its absolute colour, linear
0.045-0.11, up to twice the slate's). A dark material (`darkMoss` in its DEF: the slate) now keeps its sheen under moss
and its moss is a darker, greener shade of its own colour: the roof reads even.

### Saint-Marc's brick and forecourt (`?marcbrick=old`, `?forecourts=old`)
- Brick: the library's `brick_dark` (shipped clinker scan) read too dark and red; the photos (Street View, look only)
  show a lighter, warmer grey-mauve brown. `CHURCHES.saintmarc.looks` tints the scan toward it on that material's own
  uniforms (`scanTint` 1, the scan's detail kept).
- Forecourt: the land cover drew lawn over the whole front. The UrbIS 2024 orthophoto (CC0, 25 cm) shows a paved walk
  from the pavement to the entrance between two lawns, and a paved drive along the east side. Both are now
  `data/overrides.json` grounds with a new `surface: "pavers"` (`viewer/grounds.js`: the street texture array's pavers
  layer in rows along `courseDeg`, skirted, no grass on them, no generated plants), and the hard grounds take the
  weather (`wxMat`: they stayed dry asphalt under snow past the layer's window).
- Sacré-Cœur: the front stands on Rue Vanderkindere's pavement (no forecourt); the paved passage along its east side
  (pale paving in the orthophoto, between the church's flat annex and the long low building) was a lawn: now a pavers
  ground too (`sacrecoeur_east_court`). The big panelled roof east of it (cars on it in the photo) is a building's roof.

### Defect check (shots in `docs/snow2/`)
- Saint-Job street, snowfall / snow cover: snow on kerbs, sidewalks, roofs, the wet salted road; walls clean; no stripes.
- Sacré-Cœur (`sacrecoeur_nave_old.jpg` = `?snowfast=old&snowsteep=old`, `_new.jpg`): the 54 deg nave's blocky patches
  are now streaks down the fall line over a white cover; the 45 deg crossing and flat roofs white as before; the layer's
  jagged comb along the eaves (its 55 deg triangle cut) is gone.
- Latour de Frein in clear weather (`latour_slate_old.jpg` / `_new.jpg`): the pale patches are gone, the slate even.
- Saint-Marc (`saintmarc_front_new.jpg`, `_snow_new.jpg`; before: `docs/landmarks/landmark5/saintmarc_city_street.jpg`).
- Sacré-Cœur's east passage (`sacrecoeur_east_court_old_lawn.jpg` = the lawn before, `_new.jpg`).
- Console: no error; 0 new pipelines switching clear / snowfall / snow cover / clear.

## Switches
`?snowfast=old` (all of task 1), `?snowshare=old`, `?snowlin=old` (two of its parts), `?snowsteep=old`, `?slatemoss=old`,
`?marcbrick=old`, `?forecourts=old` (features.js rows for the first and the last four).
