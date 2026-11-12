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
