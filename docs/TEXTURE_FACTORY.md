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

## Verdicts

See the final report section in this file (filled after the review renders) and docs/TODO.md.
