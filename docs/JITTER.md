# Thin bars shimmer while moving (claude/jitter, 2026-11-18)

Owner playtest 2026-11-18: "gates, fences and window grilles jitter / shimmer when the camera moves". Not z-fighting
(that is claude/zfight): aliasing of thin geometry. Offline turn: census, fix behind `?jitter=old`, gate row `jitter`
(tools/audit/jitterCheck.mjs), rule 35 (provisional). The browser turn measures (section 5).

## 1. Why

Under the TAAU at Auto's floor (1080 x 0.6 internal rows, fov 55) one internal pixel is `d / 622` m wide at `d` m:
9.6 mm at 6 m, 16 mm at 10 m, 45 mm at 28 m, 0.24 m at 150 m. The bars:

| source | bars | drawn as | where 1 px is wider than the bar |
|---|---|---|---|
| garden railings / gates (models/gardens/gardens.glb, 9 pieces, 3 scripted LODs) | 8-16 mm square / flat bars every 11-12.5 cm, rails, rings, lances | geometry out to 150-160 m (LOD0 0-24 m, LOD1 20-66 m, LOD2 54-150 m) | beyond 5-10 m: nearly everywhere they are seen |
| façade kit (models/facadekit/kit.bin): balconies, balconnets, cellar (`soup`) and door fanlight grilles, glazing bars, garage | 8-30 mm | geometry, LOD0 0-28 m, LOD1 22-115 m (the kit's `thinPart` only tints sub-pixel parts) | all of LOD1, most of LOD0 |

A stroke under ~1 px is hit by some jitter phases and missed by others; the history's neighbourhood clamp throws the
misses away, so the bar blinks and crawls as the camera moves (rule 23's mechanism, the Lycée railing's, docs/LYCEE.md).
Already pre-filtered before this branch (listed by the census, unchanged): the Lycée railing (analytic card, claude/lycee),
the railway line fences (analytic card, A2C), the wires (thinWire), the painted façade bars (filteredPulse in the
shader). Bridge deck railings are 3.5-6 cm rails with posts every 1.5 m (no bar rows): left as they are.

## 2. Census (class J, tools/audit/census/thinBars.mjs)

A STROKE = a welded part whose width 4V / A is under 3 cm, elongated, not a plate (viewer/thinBars.js `strokes()`);
SUBPX = a stroke drawn as geometry somewhere it projects under 1 internal px (at the far end of its colour range).

| | old (`?jitter=old`) | new (default) |
|---|---|---|
| garden ironwork, subpx strokes per piece set (9 pieces x their LODs) | **421** | **12** (2 a gate piece: 9 mm parts at 6 m = 0.9 px) |
| garden ironwork x instances from data/gardens (13,713 + 8,189 + 3,792 rail modules, 3,858 gates, 5,464 drive-gate leaves) | **1,565,985** | **18,644** (-98.8 %) |
| façade kit, subpx strokes (all pieces, both LODs) | **312** | **11** (5 strokes kept as geometry: 3 in winB's arched head, 2 stone thresholds; the rest 5-8 mm parts at their 4.5 m floor) |

Heroes (`--heroes`, report only): their GLBs carry thin strokes too (ironwork, tracery); not changed here (one model
at a time, per the hero method) - the census lists them for a later round. LOD0 strokes under 1 px at 20 m: La Tour de
Frein 969, police station 730, Papenkasteel 652, Wolvendael château 303 (+ 42 at L2), town hall 161 (+ 97 L1),
Saint-Pierre 144 (+ 160 L1), Square des Héros 146, Sacré-Coeur 84, Stalle 66, Calevoet 54, Observatory 51 (+ 24 L1),
Van Buuren 30, Rosaire L1 203; Saint-Job / Saint-Marc none.

**Heroes: plan, not built** (coordinator 2026-11-18: the load-time path only if it applies cleanly). What the four
worst carry (LOD0, the census' stroke test per node / slot):

| hero | strokes | what | widths | planes |
|---|---|---|---|---|
| La Tour de Frein | 968 | wood_frame_white glazing bars | 27-29 mm | every façade (long axis y 472, z 308, x 188) |
| police station | 642 + 86 | cast_iron_green (a 3-5 mm mesh / grille) + galvanised steel posts 17 mm | 3-5 mm | mostly vertical, two orientations |
| Papenkasteel | 649 | wood_frame_white glazing bars | 18-21 mm | every façade |
| Wolvendael château | 269 + 34 | wood_frame_white glazing bars, zinc | 5-28 mm | every façade |

The bake itself (viewer/thinBars.js: strokes, coverage raster, box-mipped atlas) applies; the way it is hooked into the
garden / kit draw does NOT, for four reasons: (1) a hero level is ONE merged mesh per slot material (no instance, no
spare per-vertex channel to flag a stroke for the near dither, as aKitW.w does in the kit); (2) its strokes lie in
every façade plane of the building, at arbitrary orientations, not the kit's front / side planes in a piece frame;
(3) each hero has its own loader, LOD hand-over and fade copies (lodFade fadeVariant / settleRamp, the staged
landmarks' shadow warm-up), so a load-time split would be four different hooks into code that the stutter gates guard;
(4) the LOD1 / LOD2 are meshopt-simplified, so their strokes do not match LOD0's one for one (the kit's 2 cm middle match).
**Plan (pack-side, one generic viewer hook):**
1. at pack time (the hero's tools/blender/<hero>.py export, or a node step after it reading the GLB with
   tools/mesh_audit/glb.mjs): run thinBars `strokes()` on each level, move the stroke triangles into their own node
   `<name>_thin` (LOD0 only; on LOD1 / LOD2 drop them: the card carries them) and cluster them by plane with a general
   plane fit (normal from the stroke's cross axes + the façade it touches; merge within 3 cm and 5 deg);
2. per plane a card quad in node `<name>_thincards`, its coverage rasterised into one atlas per hero (`rasterCoverage` +
   `packAtlas`, the slot shares as channels), shipped as a KTX2 with the box mips precomputed (no boot bake);
3. viewer: one generic hook in the hero placement (the place every hero GLB already passes, e.g. the heroes' shared
   loader): `_thin` gets a near-dither mask (rampTo at max(4.5 m, w x 622 / 1.3), its shadow as before), `_thincards`
   the blended card material (viewer/thinCards.js, the kit card's look with the hero's slot colours) inside the same
   LOD / fade group as LOD0 + LOD1;
4. census: the heroes' rows turn from report-only into ceilings in tools/audit/jitterCheck.mjs (the after-counts), and
   heroshell must still pass (the card nodes listed as see-through by design);
5. order: police station first (3-5 mm, the worst per stroke), then La Tour de Frein, Papenkasteel, Wolvendael. One
   hero per job, a browser A/B each (the hero method: max 2 agents).

## 3. Fix (default; `?jitter=old` = as before)

Pre-filtering, not removing detail (Mr.doob / three.js first: three r187 WebGPU has no sampler LOD bias or per-material
MSAA here and the city runs under the TAAU at 1 sample; the Lycée A/B showed alpha-to-coverage, i.e. the TAAU's
stochastic coverage, only -5..-15 %, a blended coverage card -43..-60 %):

- **A coverage card** in the bars' plane: one quad a garden piece (its mid plane), one card per stroke plane a kit piece
  (fronts by z, balcony returns by x). Its texture is the bars' exact coverage, **rasterised at load from the LOD0**
  (viewer/thinBars.js `ironCards` / `kitCards`: 3 x 3 supersampled, 200 texels/m gardens, 128 kit) into one atlas each
  (gardens 1024 x 1024, kit 2048 x 512, RGBA8) with **box mips** built by hand: every level the exact mean of the one
  above, the bars' true share of the footprint (no alpha test, so no coverage-preserving rescale is needed), trilinear +
  8 x anisotropic. Channels: gardens tip share / steel share / AO / coverage (the paint and gilded tips per instance as
  before); kit wood-frame share (the building's variant picks white or dark) / cast iron / light metals / coverage.
  **Blended** (transparent, no depth write, no shadow).
- **The modelled bars kept close up** and dithered out (viewer/lodFade.js dither: no pop): garden pieces to 4 m, gone by
  6 m; kit strokes while they are >= 1.3 px (`strokeEnd`: 4.5-12 m by width, e.g. a 16 mm balcony bar to 7.7 m),
  flagged per vertex in `aKitW.w`. The card fades in under them first (2.5-3.5 m: no halo of its magnified edge).
- **Kit cards stretch like the strokes**: their quads are cut at the 9-slice lines and each quad takes its middle's
  class; a stroke whose own class would move it more than 12 mm off the card under a +0.6 m stretch stays geometry
  (none today), as do arched (bent) and stone / brick strokes.
- **Shadows unchanged**: the garden iron's LOD0 keeps its old 0-24 m shadow band (its colour pass discards past 6 m);
  the kit's opaque keeps the plain mask in the shadow pass.

Cost: gardens 2 draws a piece instead of 3 (LOD1 / LOD2 geometry no longer drawn); kit +1 multi-draw per LOD (the card
set); fixed light count, static buffers. Boot: the two bakes ~100 + ~110 ms (node, idle machine), 5.6 + 5.6 MB of
texture with mips.

Files: viewer/thinBars.js (pure: strokes, raster, atlas, plans), viewer/thinCards.js (the texture), viewer/gardens/gardenKit.js,
viewer/facadeKit/kitField.js, viewer/facadeKit/kitMaterials.js, viewer/features.js (`jitter` row).

## 4. Gate and rule

`node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/audit/jitterCheck.mjs` (mergeGate row
`jitter`): census ceilings 12 / 11 (old 421 / 312 shown failing), full mip chains keeping level 0's coverage, every
carded stroke on its card's coverage, the kit stretch fit, the cards blended (no alpha test / A2C / shadow), the card
and near materials compile to WGSL headless, shadows unchanged, the switch, no DynamicDrawUsage / light.
Rule 35 (provisional) in docs/QUALITY_RULES.md.

## 5. Browser turn (to do)

- `?quick=1`, slow sideways pans (1.5 m/s and 8 m/s, e.g. a dolly like debug/lyceeCheck.js) past: garden gates and
  railings at 3, 8, 20, 40 m (a Saint-Job street; the railings round Wolvendael); a façade with balconies and door
  grilles at 8, 20, 40 m. Each A/B with `?jitter=old`: crop shimmer + hot pixels of the default <= old.
- Close up: no pop / seam where the modelled bars hand over (gardens 4-6 m, kit 4.5-12 m) or where the card fades in
  (2.5-3.5 m); the gilded tips and the paints read the same on the card; the kit card follows a stretched balcony.
- Shadows of railings identical in both modes; console 0 WebGPU errors; no new pipeline after boot; boot time of the
  kit / gardens start in the log (`window.__kit.cards`).
