# The procedural texture factory (`tools/texturefactory/`)

Branch `claude/texfactory` (2026-11-13, from `claude/materials`).

**Why.** The owner judged the live procedural materials "almost unusable" next to games whose materials are
authored in node tools and **baked**. The factory makes the materials offline, the same way, and ships them like
scans:
- scripted generators, numpy + OpenCV, every step in Python, CC0 by construction (no scans, no AI);
- tileable PBR sets, in real units;
- baked to the library's scan format (albedo + NRA, KTX2);
- used at runtime exactly like the CC0 scans: hex-tile anti-tiling + the library's live layers.

Toolchain choice and research: [TEXTURE_FACTORY_RESEARCH.md](TEXTURE_FACTORY_RESEARCH.md). In short: Material
Maker's CLI wrote no files, Blender bakes but has no per-unit control, and numpy is exact, fast enough
(15-50 s per 2K set) and has no new dependency.

## Run

```
python -E -P tools/texturefactory/build.py --list                        # materials, variants, notes
python -E -P tools/texturefactory/build.py brick_red_brussels:a --quick  # 1K lit preview only (tuning, ~5 s)
python -E -P tools/texturefactory/build.py [material[:variant] ...]      # 2K sources + 1K/2K WebP + KTX2 work files
python -E -P tools/texturefactory/encode.py [--2k] [filter]              # KTX2 (ktx create, UASTC 2 + RDO + zstd)
python -E -P tools/texturefactory/register.py                            # add / refresh tf_* in candidates.json
python -E -P tools/texturefactory/sheet.py <material>                    # offline sheet vs the CC0 candidates
python -E -P tools/texturefactory/tree_sheet.py                          # bark + leaf sprays vs the tree lab's sets
```

Everything is deterministic: a seed plus a parameter set gives the same images.

**What goes where:**

| Output | Where | In git? |
|---|---|---|
| 2K sources (albedo, normal, rough, ao, 16-bit height, preview, meta) | `data/raw/texfactory/out/<mat>/<variant>/` | no |
| Runtime sets: `<mat>_{1k,2k}_{albedo,nra}.{webp,ktx2}` | `viewer/materials/generated/<mat>/<variant>/` | no (local `.gitignore`, like the scan candidates) |
| Manifest | `viewer/materials/generated/generated.json` | yes |

The manifest uses the scans.json fields: source "texfactory", licence "CC0 (generated)", size_m, lattice, mean
colour and roughness, bytes, seed and category (surface or tree).

The KTX2 step needs KTX-Software (`C:/Program Files/KTX-Software/bin/ktx.exe`). The wasm encoder of
tools/textures took ~25 s per 1K map; `ktx create` takes 3-10 s.

## How a material is made

The building blocks are in `tf/`:

| Module | What |
|---|---|
| `core.Tex` | An N x N grid over size_m metres. FFT band-limited noise (low-passed at N/6: no aliasing), periodic Worley (with an anisotropic metric), wrap blur and warp, slope blur, curvature, horizon AO from the height, physical OpenGL normal, `per_unit` random values, lichen rosettes. |
| `units.courses()` | Tile Generator + Flood Fill, exact. Courses cut into units of their own length (a random partition that wraps). Per unit: height, offset, tilt and per-edge joints. Out: id, local coordinates and a rounded-box SDF. |
| `masonry.brick_wall()` | Stretcher or cross bond (kruisverband). Hand-moulded outline (3 cm wave + 4 mm ragged). Chips: grunge threshold on the arris band, more at corners, some bricks much more damaged. Relief: arris rounding, pillow, tilt, proud or sunk bricks, sand-faced grain, fire creases, pits. Mortar: recessed and tooled, with sand grains and smears. Colour per brick: palette + log-normal value + warm/cool, kiln flash, burnt headers, firing clouds, manganese blotches, lime and iron specks, paler chip cores, salt bloom, sun bleach, dust film, grime from AO x grunge. |
| `aggregate.stones()` | Crushed stone: shrunk Voronoi polygons with flattened (worn) tops, sized and coloured per stone. |
| `bake` | Derives normal and AO, writes the 2K sources, downsamples (renormalised normals) to 1K / 2K, packs albedo + NRA (normal x,y, roughness, AO; OpenGL) like `process_textures.py`, writes WebP fallbacks and KTX2 work files. |
| `leaves` | Leaf sprays drawn in 2D at 2x then area-downsampled. Per-species outlines (palmate lobes, ovate with teeth, obovate leaflets of a compound leaf), veins, fold, cupping, foreshortening, twigs and petioles. Coverage-preserving alpha mips and push-pull bleed (the algorithms of `process_tree_textures.py`). |

The materials are in `materials/*.py`, one parameter set per variant (a, b, c):

| Material | Real scale | Repeat | Lattice | Variants |
|---|---|---|---|---|
| brick_red_brussels | 21 x 6.5 cm bricks, 1 cm joints, 7.5 cm courses | 1.8 m (24 courses x 8 stretchers) | cross bond [8,12], stretcher [8,24] | a cross bond, lime joints · b stretcher, cleaner · c older, sooty, chipped, salt |
| brick_yellow | same | 1.8 m | same | a buff stretcher · b warmer cross · c sooty + bloom |
| brick_dark | same | 1.8 m | same | a purple-brown clinker, part glazed · b more glaze, pale mortar · c cross bond |
| asphalt | AC-10/14: porphyry 3-10 mm + sand in bitumen | 2.0 m | — | a aged, worn binder · b newer, coated chips · c pale, dusty, sealed cracks, oil |
| cobbles | Saint-Job setts 10-16 x 12.5 cm, 1.4 cm joints | 1.5 m (12 rows) | [1,12] | a grey-blue porphyry · b warmer sandstone, mossy · c darker, tight, polished |
| paving_concrete | Brussels 30 x 30 cm tiles, 4 mm joints | 1.8 m (6 x 6) | [6,6] | a grey, gum, stains · b newer · c old, chipped |
| stone_white | limestone ashlar, 30 cm courses, 40-95 cm blocks | 3.0 m | [1,10] | a cream, tooled · b whiter, sawn · c warmer, soiled |
| stone_blue | petit granit, 30 cm courses, drafted 2 cm margin | 2.4 m | [1,8] | a bush-hammered field + margin · b honed, crinoids, veins · c weathered pale |
| render_white | lime render | 2.0 m | — | a white-washed, cracks, patches · b fresh · c old, coarse |
| slate | 20-27 cm slates, 13 cm exposure | 2.1 m (16 courses) | [1,16] | a blue-black · b greyer, lichen · c regular, new |
| roof_tiles_red | S pantiles 21 x 26 cm | 2.1 m (10 x 8) | [10,8] | a red-orange, moss · b red-brown, clean · c old, black, lichen |
| bark_* (tree) | plane, beech, lime, horse chestnut, maple, oak, birch | 1.0 m | — | plane a/b, beech a/b, others a |
| leaf_* (tree) | plane, beech, lime, horse chestnut, maple sprays | card | — | summer + spring + autumn albedo, one normal + thickness |

## How the Material Lab shows them

`register.py` adds each set to `viewer/materials/candidates.json` as an extra candidate of its material: every 1K
set, plus the 2K of variant a. They are `kind: "cc0"`, `source: "texfactory"`, ids `tf_<mat>_<variant>_<1k|2k>`.
- The lab lists them with the scans with no lab change. The badge reads "CC0 texfactory", and they appear in
  "Versions shown" as "Factory <family> <variant> <res>".
- They render through `createMaterial(name, { variant: "scan", scan })`: hex-tile anti-tiling with the exact
  lattice, plus finish() weathering, per-tile tone and the material's live layers.
- `tools/textures/candidates.py` keeps unknown entries, so the scan pipeline does not drop them.
- On a merge conflict in candidates.json: take the other side, then run `register.py` again (idempotent).
- Tree sets (category "tree") are not lab candidates. They are in `generated.json` with the files at
  `viewer/materials/generated/bark_<sp>/` and `generated/trees/leaf_<sp>[_spring|_autumn]_a.ktx2` + `leaf_<sp>_n.ktx2`,
  in the formats of `viewer/treeTextures.js` (bark = scan format; leaves = `params.leafAtlas`).
- The Tree Textures lab is on claude/foundation, not on this branch. Comparison so far:
  `docs/img/texfactory/trees_sheet.jpg`.

Before a review, the generated files must exist locally (they are git-ignored). Run build + encode + register, or
review from this worktree, where they are built.

## Comparisons

- Offline sheets: `docs/img/texfactory/<mat>_sheet.jpg`, the generated variants next to every CC0 candidate. Rows:
  a 0.6 m crop lit at a grazing angle, 3 x 3 m tiled (the repeat, the 10 m look), and the albedo alone.
- Lab screenshots: `docs/img/texfactory/<mat>_lab.jpg`. Same wall, same sun, rows at 1 / 10 / 50 m. Columns: today's
  procedural, the best / current scan, factory a, factory b. The scan tint is set to 0 (raw) for all.

See "Verdicts" below for which wins.

## Verdicts (my read of the lab renders and sheets; the owner decides in the lab)

Lab conditions: same wall / floor / roof, same sun, rows at 1 / 10 / 50 m, scan tint 0 for all.

| Material | Factory vs best CC0 scan | Why |
|---|---|---|
| stone_blue | **factory wins clearly** | The CC0 "granite" scans are brown. The factory set is real petit granit: blue-grey, drafted margin, bush-hammered field, crinoids, veins. |
| slate | **factory wins** | The shipped roof_slates_02 reads as beige wooden shingles. The factory slates are blue-black with lapped tails and relief (the owner's "slates read flat" note). |
| paving_concrete | **factory wins** | The shipped concrete_tiles is a brown parquet-like pattern. The factory set is the grey Brussels 30 cm tile with joints, chamfers, gum and stains. |
| brick_dark | **factory wins on identity** | Purple-brown clinker with part-glazed bricks; the CC0 "dark" bricks are olive / khaki. The scans still have richer surface detail. |
| asphalt | **tie** (factory ≈ scan; both far above the old procedural) | Porphyry chips in a worn binder. Reads like acg_Asphalt015 / asphalt_02 at 1 and 10 m, with 3 variants (new / aged / pale). |
| brick_yellow | **tie** | The factory buff colour is closer to Uccle; Bricks105 has more natural surface detail. |
| render_white | **tie** | Comparable to Plaster002. |
| brick_red_brussels | **scan narrowly wins near**, tie at 10-50 m | ph_red_brick (the owner's pick) has softer, more irregular mortar and a real fired-clay surface at 1 m. The factory set has the right Brussels colours and the cross bond, but its bricks are still a little too clean and regular up close. |
| stone_white | **scan wins on surface**, factory on colour | The factory set is the right cream white stone, but its face grain is too uniform and the joints too faint. |
| cobbles | **scan wins** | Factory setts read too regular and a little blue. The scan's worn, rounded, irregular setts are more convincing. |
| roof_tiles_red | **scan wins clearly** | At 10 m the factory pantiles read as corrugated sheet: the rolls run on without a strong course break. Needs per-tile nose shadow and offset. |

Old procedural (live TSL) vs the factory: on every material the baked set is cleaner (no crawling, the
anti-tiled scan path) and more detailed per unit. This is the owner's original complaint, now addressed by the
pipeline.

Trees (`docs/img/texfactory/trees_sheet.jpg`):
- Barks: oak, lime and maple read as real fissured bark. Beech is the right smooth silver-grey; its branch-scar eyes
  are too few and repeat visibly on a 1 m tile. Plane reads as camouflage, but the CC0 Bark009 is still more natural
  (its fine flaking texture). Birch and horse chestnut are weak (birch speckled instead of lenticel bands; chestnut
  scales too small and uniform).
- Leaf sprays: legible species shapes (plane, beech, lime, maple; horse chestnut compound), 3 seasons. Coverage is
  0.32-0.39, which matches the lab's 0.37-0.43. They keep their mass at 24 px.
- Not yet checked inside the Tree Textures lab (it lives on claude/foundation; this branch is from claude/materials).

## Cost

Texture memory and download, per set (generated.json):

| Set | GPU memory (BC7 / ASTC, 2 maps + mips) | Download (KTX2 UASTC + zstd) |
|---|---|---|
| Factory 1K | 2.67 MB | 1.41-2.36 MB (mean 1.88) |
| Factory 2K | 10.67 MB | 4.83-8.77 MB (mean 6.61) |
| CC0 scan 1K, for comparison | 2.67 MB | 2.33 MB mean (68 candidates) |
| Leaf spray 1K (one season + the shared normal) | 2.67 MB | 0.76-0.94 MB |
| Each extra season | 1.33 MB | ~0.4 MB |
| Old procedural | 0 MB | 0 MB |

**GPU per pixel.** A factory set goes through exactly the same shader as a scan (`variant: "scan"`: 3 hex taps x
2 maps + the live layers), so its cost per pixel is the scan's. The library's quiet-GPU table in MATERIALS.md gives
for brick: proc 2.69 ms, scan 2.42 ms per full 2.7 Mpx screen, so the scan path is about 0.3 ms cheaper than the
live procedural one.

My bench (lab "cost", full-screen wall 1400 x 900, alternating rounds, 2026-11-13) was **not on a quiet GPU**: the
owner's other WebGPU tabs were active, and the lab tab was throttled to 1 fps behind them. Readings, ms over a plain
material:

| Material | procedural | scan | factory 1K | factory 2K |
|---|---|---|---|---|
| brick_red (2 rounds) | 2.03 / 2.03 | 1.51 / 1.44 | 1.57 / 2.69 | 2.56 / 1.18 |
| asphalt (last round) | 1.83 | 1.38 | 2.10 | 1.18 |

The scan and factory columns differ only by noise (the same shader and texture format; 1K and 2K swap places
between rounds). The one stable signal is the one MATERIALS.md already gives: textured is cheaper per pixel than
the live procedural.
- To re-measure on a quiet GPU: lab → cost ⟳ on a material with only that tab open.
- Perf note for the owner: baked sets cost **less GPU time per frame** than live procedural and the same as scans.
  The price is **memory and download**: 2.7 MB GPU and ~1.9 MB download per 1K material; 2K is 4x the memory (10.7
  MB) and ~3.5x the download. Ship 1K by default, 2K only where the owner sees the difference up close.

## Weak points / next

- Brick (red): too clean and regular at 1 m. Add mortar irregularity (slope-blur smears onto the faces), fewer
  pockmarks, uneven firing gradients per brick, occasional replaced bricks / repointed patches.
- Cobbles: too regular. Add irregular sett plan shapes (split faces), varied wear, darker sand joints, less blue.
- roof_tiles_red: needs the course break (nose shadow, per-tile offsets / tilt) so it stops reading as corrugated.
- stone_white: grain too uniform, joints too faint. Needs crust / gypsum blackening patterns and sharper joints.
- Tree barks: plane needs the fine flaking edges of Bark009; birch and horse chestnut need a rework; beech eyes vary
  per tile only (1 m repeat).
- Leaves: no Tree Textures lab check yet (merge or cherry-pick into claude/tree-textures / foundation and plug in as
  `params.leafAtlas`).
- 2K sets were made for variant a only (KTX2). Every variant has 2K sources and WebP.
- The bench needs a quiet GPU.


## Shipped defaults (owner's decision 2026-11-13)

The best-looking version of each material is the library's **default** and the city uses it. The Material Lab stays
for fine-tuning and for adding Megascans later. Ties go to the factory: real Brussels scale and colour, and CC0.

`tools/texturefactory/promote.py`:
- copies the pick's **1K KTX2 + WebP** into `viewer/materials/textures/<mat>_{albedo,nra}.*`, committed like the
  shipped scans (a fresh checkout or Vercel has them);
- writes its `scans.json` entry: source, lattice, mean colour, bytes and a default `tint` (0 for the factory sets,
  whose own colour is the target; 0.35 for the CC0 scans);
- marks it `current` in candidates.json. A previously shipped scan is restored from git into `textures/cand/` and
  stays reviewable.

`library.js createMaterial()` now defaults to `variant: "scan"` whenever the shipped set is loaded. The Material Lab
asks for "proc" explicitly.

| Material | Default (shipped) | Variant / why | Image |
|---|---|---|---|
| stone_blue | **factory** `tf_stone_blue_a` | bush-hammered field + 2 cm drafted margin: the Brussels plinth / sill finish (b = honed, c = weathered pale) | `docs/img/texfactory/choice_stone_blue.jpg` |
| slate | **factory** `tf_slate_c` | regular, dark Belgian slate: a and b mix in odd brown slates that read as a pattern in the 3 m tile | `choice_slate.jpg` |
| paving_concrete | **factory** `tf_paving_concrete_a` | grey 30 cm tiles with gum and stains (rebuilt: chips only on the edges, no holes mid-tile) | `choice_paving_concrete.jpg` |
| brick_dark | **factory** `tf_brick_dark_a` | purple-brown clinker, part glazed, grey joints | `choice_brick_dark.jpg` |
| brick_yellow | **factory** `tf_brick_yellow_a` | buff stretcher bond, grey lime joints. Looked again at 1 / 10 / 50 m: still a tie with Bricks105 (more natural surface) but closer to Uccle's buff; factory per the rule | `choice_brick_yellow.jpg` |
| asphalt | **factory** `tf_asphalt_a` | aged Brussels asphalt with porphyry chips. Not used by the city yet (roads switch later) | `choice_asphalt.jpg` |
| render_white | **factory** `tf_render_white_a` | white-washed lime render. In the city façades its relief is halved (it read as rough stucco under a low sun) | `choice_render_white.jpg` |
| roof_tiles_red | **CC0 scan** acg_RoofingTiles014B (new) | the Flemish pantile scan: dirty red pantiles in courses. The factory pantiles read as corrugated sheet | `choice_roof_tiles_red.jpg` |
| brick_red_brussels | **CC0 scan** ph red_brick (kept) | the owner's earlier pick | `choice_brick_red_brussels.jpg` |
| stone_white | **CC0 scan** ph sandstone_blocks_08 (kept) | the scan's real surface wins (the factory one is the better colour, but its grain is too uniform) | `choice_stone_white.jpg` |
| cobbles | **CC0 scan** ph cobblestone_floor_08 (kept) | the scan's worn setts win | `choice_cobbles.jpg` |
| copper_patina | **CC0 scan** Metal058C (kept) | no factory set | — |

## City switch (2026-11-13)

**How it works.**
- `main.js` loads the shipped sets once at boot: `loadScans`, in parallel, awaited before the first consumer. It
  skips the held ground sets: 9 sets, **24 MB GPU (BC7), 17.2 MB download**.
- Consumers take the library through **`viewer/materials/shipped.js`**, the city's view of it:
  - `createMaterial` / `getMaterial` / `DEFS` answer only for names **with a shipped set**, so every other slot
    keeps the consumer's own look. The library's live procedural versions were judged worse (2026-11-12).
  - The ground names (asphalt, paving_concrete, cobbles) are **held** (`GROUND_HOLD`) until the roads switch.
- A/B switch (`viewer/materials/libSwitch.js`): `?libmat=0` (all temporary), `?libmat=kit,townhall` (only those),
  `?libmat=-stalle` (all but). A consumer that regresses goes into `OFF`; none is in it today.
- No road / sidewalk / kerb / paint code was touched: roadBuild.js, roadPaint.js, cobbles.js and streets/ are as
  they were.

**Per consumer.** Each was measured one at a time: one page with only that consumer on the library
(`?libmat=<consumer>`), its library meshes swapped live to its own temporary materials (`debug/libAB.js`).
- Images: before / after at street level and ~50 m, `docs/img/texfactory/city/<consumer>_{street,far}_ab.jpg`.
- Flicker test: `labs/flickerTest.js`, 20 frames, strafe 0.6 mm, updaters frozen, both states in the same page.
- GPU: 4 alternating rounds of 30 frames rendered back to back, median per round; "b - a" = library minus own.

**GPU noise.** The GPU was shared with the roads agent's city and lab tabs, and my tab ran rAF at 1 fps behind them
(hence frames rendered back to back). Frames were 5-11 ms, except the kit page: 33 ms frames under heavy contention.
Read differences under ~0.3 ms as zero.

| Consumer | Library slots now (shipped) | Kept on its own look | GPU b - a (ms, 4 rounds: spread) | Flicker own → library (ppm) | Verdict |
|---|---|---|---|---|---|
| façade kit (THE ONE LINE: `libSource("kit", ...)`) | brick_red, brick_yellow, stone_white, stone_blue, render_white, slate (`scanLook`, 6 sets) | frames, glass, iron, zinc, stained glass, anodised metal, enamel, **copper_patina, brick_dark** (WebGPU's 16-textures-per-stage budget: the kit's single opaque shader already binds 4) | unresolved: page loads 9.5 → 12.8 / 10.4, in-page -1.6 (-9.2 .. +1.6) under the 33 ms contention | 5383 → 5362 (a balcony railing, both) | ON: warmer real stone surrounds, plinths |
| Stalle | stone_white, stone_blue, brick_red, slate (+ cobbles before the hold) | the rest | +0.05 (-0.33 .. +0.27) | 44 → 86 (tiny) | ON |
| town hall | brick_red, stone_white, stone_blue, slate | zinc, frames, glass, iron, cobbles (held) | -0.10 (-0.20 .. 0) | 104 → 114 | ON |
| police | brick_yellow, brick_red, stone_blue | the rest | -0.10 (-0.59 .. +0.26) | 88 → 88 | ON (the view shows the station only partly) |
| Calevoet station | stone_blue, slate | painted brick, zinc, terracotta, frames, iron, glass | +0.03 (-0.06 .. +0.19) | 74 → 74 | ON |
| Saint-Pierre | brick_red, stone_white, stone_blue, slate, copper_patina | copper_brown, zinc, frames, glass, iron | +0.07 (-0.07 .. +0.26) | 365 → 365 | ON |
| Wolvendael | stone_white, stone_blue, slate | lime render, zinc, frames, terracotta, glass | +0.06 (-0.13 .. +0.26) | 103 → 103 | ON |
| Van Buuren | stone_blue (2 meshes) | its own bricks, concrete, flat tiles, wood, glass, metals | -0.77 (-2.55 .. +0.07): noise | 153 → 153 | ON |
| Observatory (`getMaterial` added to shipped.js for its contract) | brick_red, stone_white, stone_blue, copper_patina, slate | painted metal, zinc, frames, glass, iron, gravel, lawn | **+0.52 (+0.39 .. +0.79)**, consistent: the campus is all brick / stone in that view | 63 → 78 | ON; the copper domes now show a real patina |
| hero bridges (`libOn("bridges")`) | brick_red, stone_blue, brick_yellow | concrete, painted metal, glazing; the Verrewinkel deck's asphalt / paving (held) | page loads: 10.0-10.4 → 10.2-11.2 (~+0.4, noisy) | 245 → 1204 **not from the materials**: swapping the library materials for a plain one left it at 1195; the blinking cluster is the trees at the left (wind) | ON |
| procedural façades `facades.js` (walls + roofs, via `viewer/facadeLib.js`; facadeGeom.js untouched) | walls: brick_red (style 0), brick_dark (1), brick_yellow (2), render_white scaled to white / cream / grey (3-5); roofs: roof_tiles_red / slate detail on each roof's orthophoto colour | landmark style 6 (procedural ashlar), windows, rooms, doors, shops, sills, plinth, cornice | -0.10 (-0.33 .. +0.13) | street 3498 → 3591 (railings, both); 50 m 51 → 51 | ON: brick reads as brick from 30-50 m (the procedural courses had faded to flat colour) |

**What stayed as it was, and why.**
- The ground everywhere (asphalt, sidewalks, setts, hero forecourts, the bridge deck): the road switch comes after
  claude/roads2 merges (TODO).
- Every slot without a shipped baked set (wood, glass, iron, zinc, painted metal, terracotta, Van Buuren's own
  bricks, ...): the consumers' own looks are better than the library's procedural versions.
- The kit's copper_patina and brick_dark slots: the texture-binding budget. Next step: a per-slot draw, or a raised
  `maxSampledTexturesPerShaderStage`, which this adapter supports at 48.
- `facades.js` landmark style 6.
- No consumer was put back on its own materials: none got worse in colour, scale or shimmer in these views.
