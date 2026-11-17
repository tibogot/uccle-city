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
  the coarse octave and a streak noise in ONE 512^2 RGBA8 tiling texture (53 m period), the micro bump's value and
  analytic gradient in a 256^2 one; periodic value noise with the same smoothstep interpolation, mipmapped, read with
  an explicit level from the pixel footprint (valid in per-pixel branches). One fetch replaces 8-16 hash evaluations.
- **Per-pixel branch on the slope**: the cover's whole graph (mask, tracks, sparkle, colour, normal) runs only where
  `up > upLo` (the cover's lower bound; trunks with wind plaster keep their windward walls). Below it the old mask is
  exactly 0, so nothing changes on screen; walls (most of a street view) skip it.
- **Overhead map only where it matters**: inside its window and on faces that are not walls (texel loads in a
  per-pixel branch).
- **Normal without derivatives**: the micro bump from the baked gradient on the geometry normal (near only), the
  tracks' groove slope only near and only where trodden (explicit-level taps).
- **Layer**: the baked noise, the sparkle and the trail taps only where they can show.
- **Flakes**: a flake that cannot show (inside the 0.8 m lens fade, past the window's round edge) collapses to a point
  in the vertex stage (no fragments; the ones at the lens were the biggest quads on screen); the step compute runs on
  the drawn flakes only (`renderer.compute(step, n)`), not the whole 64 k population.
- No new pipeline (the same materials, the same draws), no light added, no DynamicDrawUsage.

The three.js snow / rain examples (`webgpu_compute_particles_snow`, `_rain`) and slop-newyork (uniform-driven road
wetness masks) were checked first (docs/WEATHER_RESEARCH.md): neither has a cheaper cover scheme than a
normal.y + noise mask; the saving here is in not computing it where it cannot show and not computing it twice.

### Numbers
(filled in after the browser turn)

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
The pale patches (Latour de Frein, Sacré-Cœur) were the library's moss: `finish()` mixes an ABSOLUTE moss colour
(linear 0.045-0.11) into the slate (linear ~0.045): up to twice the slate's brightness, rough (no sky reflection), read
as pale lichen in the sun and as thaw holes under snow. The texture itself is even (p50 0.246, p99.5 0.312). A dark
material's moss (`darkMoss` in its DEF: the slate) is now a darker, greener shade of its own colour.

### Saint-Marc's brick and forecourt (`?marcbrick=old`, `?forecourts=old`)
- Brick: the library's `brick_dark` (shipped clinker scan) read too dark and red; the photos (Street View, look only)
  show a lighter, warmer grey-mauve brown. `CHURCHES.saintmarc.looks` tints the scan toward it on that material's own
  uniforms (`scanTint` 1, the scan's detail kept).
- Forecourt: the land cover drew lawn over the whole front. The UrbIS 2024 orthophoto (CC0, 25 cm) shows a paved walk
  from the pavement to the entrance between two lawns, and a paved drive along the east side. Both are now
  `data/overrides.json` grounds with a new `surface: "pavers"` (`viewer/grounds.js`: the street texture array's pavers
  layer in rows along `courseDeg`, skirted, no grass on them, no generated plants), and the hard grounds take the
  weather (`wxMat`: they stayed dry asphalt under snow past the layer's window).

## Switches
`?snowfast=old`, `?snowsteep=old`, `?slatemoss=old`, `?marcbrick=old`, `?forecourts=old` (features.js rows).
