# The copper beech (Fagus sylvatica 'Atropunicea' / f. purpurea)

Branch `claude/copper-beech` (2026-11-14). **Lab only**: the city is unchanged (nothing in `viewer/main.js` or the city's
tree code reads it). For the owner's verdict before more species.

**Why this tree.** Of Uccle's 1,597 live regional-road trees (Bruxelles Mobilité inventory, CC0;
`docs/trees/SPECIES_DATA.md`), 520 are copper beeches (32.6 %). **All 520 are on the Drève de Lorraine** (one more on the
Square des Héros): "Alignement multiple", crowns "Semi-libre". Their inventory classes:

| | heights (m) | crown diameter (m) | trunk circumference (cm) |
|---|---|---|---|
| 10th / 25th / 50th / 75th / 90th percentile | 10 / 25 / 30 / 30 / 35 | 6 / 9 / 12 / 14 / 15 | 60 / 127 / 160 / 192 / 221 |

Most are mature 25-35 m trees with 12-15 m crowns (tall ovals, ~2.3 x as tall as wide) and 1.5-2 m trunks; about a
tenth are young 10 m replacements with 6 m crowns. That set the avenue form below.

## How to see it

Serve the worktree (`python tools/serve_nocache.py 8859`) and open
`http://127.0.0.1:8859/labs/tree-lab.html?species=copperbeech`. Panel "Scene & species":
- **species**: `copperbeech` (the street trees, plane and beech are still there, unchanged, for comparison);
- **copper beech season**: summer / spring / autumn / winter (rebuilds the species: its spray, palette and both impostor
  bakes);
- **copper beech far: impostor kit** (on): its far trees through the impostor kit, as the city's street trees;
- **layout** "Drève de Lorraine (inventory, 520 copper beeches)": the 520 real trees at their inventory positions,
  heights and crown sizes (`data/trees/bm_copper_beech.json`, made by `tools/trees/copper_beech_rows.py` from the raw
  inventory), seen down the drève from its north end;
- **variant**: auto = the avenue form (0-3) on the street of 50 and the drève, the park form (4-5) in the park cluster;
  `0`-`3` avenue, `4`-`5` park.

URL: `species=copperbeech`, `cbseason=spring|summer|autumn|winter`, `farkit=0` (old impostors), the usual `layout=`,
`variant=`, `h=`, `crown=`, `time=`. Performance folder: "benchmark: beech vs copper beech", "plane vs copper beech",
"flicker test". `window.lab.flicker()`, `lab.kits`, `lab.dreveTrees`.

## What it is

Code: `viewer/treesCopperBeech.js` (the species), through the city's chain (`viewer/treesStylized.js makeSpecies`:
nested LODs with the card morph, depth pre-pass, shadow fade, impostors).

**Two forms.**
- **Avenue, the Drève de Lorraine tree** (variants 0-3, built ~30 m): a straight bole clear to 7.5-10 m (pruned: the old
  branch scars are the bark's "eyes"), 5-7 steep laterals (40-65°), a V fork 4-7 m higher into 2-3 stems, a dense, tall
  oval crown 12.6-15 m across, broad down to its flat underside, rounded and a little flattened on top. Pads pulled
  softly toward 5 horizontal layers (the beech's layered sprays).
- **Open-grown park tree** (variants 4-5, ~22 m tall, 23-26 m across): a short bole, 6-7 big limbs fanning out, the
  low ones drooping at their tips, a broad dome skirting down to ~2 m.

**The beech's weak points, fixed here** (docs/TREES.md §6: "lumpy open crown, regular cool trunks"):
- **Smoother crown**: the pads overlap (radius ~0.85 of their spacing) on a gently lobed envelope (2nd and 3rd harmonics
  only, no scallops), an inner layer (15-18 % more pads at ~55 % depth) fills the holes, and most of the crown's dome
  goes into the shading normal (`crownNormal` 0.72; beech 0.5, plane 0.2). The crown reads as one dense mass, the
  sprays as texture inside it, not as balls (compare `avenue_48m_*.jpg` with the beech's "broccoli").
- **Irregular trunks** (own `barkMesh`): an elliptic section turning slowly up the bole, swellings along it,
  buttress roots of random size at random angles, a little lean and sweep. A function of height and angle only, so
  LOD 0 / 1 keep the same outline.
- **Bark colour**: a near-neutral silver-grey (the procedural beech bark read cool / blue).

**Leaves: texture factory spray** (`tools/texturefactory/materials/leaves.py` "copperbeech", CC0 by construction): the
beech's ovate, wavy-edged leaves on zigzag twigs, smaller and more of them than the beech spray (a leaf ~9 % of the
card), with per season:
- **summer**: maroon to purple-brown, a few bronze shade leaves, 10 % undersides paler and greener (olive-bronze);
- **spring**: ruby red, pinker undersides;
- **autumn**: copper and orange-brown with browned margins and spots;
- **winter**: marcescent: 5 % of the leaves stay on (tan, spotted), the twigs show (thicker twig lines). It reads as
  a bare tree with a few brown leaves. Young / clipped trees keep many more (not modelled separately yet).
Each season has its palette (`COPPER_SEASONS`) that the spray's own colour spread (65 % of it) multiplies; glossy
(roughness 0.7), a ruby glow when backlit.

**Bark: texture factory set** (`materials/bark.py beech_skin`, "bark_copperbeech" a, 1 m tile): a mature beech's
elephant skin: big soft silver / grey mottles, grey-brown stemflow streaks running down, fine horizontal creases in
wavy clusters, raised lenticel dashes, crustose lichen patches with a dark rim line carrying script lichen (black
squiggles), powdery algae. Mapped triplanar in tree space (`viewer/treeTextures.js scanBark`, graded to a neutral
silver-grey, the species' algae side / damp foot / paler limbs, a third back toward neutral grey), with the beech's
branch-collar **"eyes"** (dark almond scar, pale rim, wide dark chevron "eyebrow") drawn live on the trunk's own
cylinder on top: they never repeat with the tile, and they are denser on the pruned bole below 12 m.

**Far trees: the impostor kit** (`viewer/impostorKit/`, as the city): one atlas per species (16 x 16 hemi views x 64 px,
63.8 MB), baked from LOD 2 at the 400 m hand-over WITH the spray's coverage and colours (the kit's tree source now reads
`shared.leafAtlas` when a species has one), one instanced draw per pass. Today's impostors (`viewer/impostors.js`)
are still baked by `makeSpecies` and drawn in the "LOD chain" layout's 4th slot.

**Textures shipped** (`viewer/trees/textures/`, manifest `tree_textures.json`, by `tools/trees/ship_factory_tree_textures.py`):

| file | KB | GPU (BC7 + mips) |
|---|---|---|
| `bark_tf_copperbeech_albedo.ktx2` + `_nra.ktx2` | 567 + 934 | 2.7 MB |
| `leaf_copperbeech_n.ktx2` (shared by the seasons) | 424 | 1.3 MB |
| `leaf_copperbeech[_spring / _autumn / _winter]_a.ktx2` | 366 / 386 / 400 / 77 | 1.3 MB each |

One season in use: 5.3 MB GPU, ~2.3 MB download. The lab preloads all four seasons (9.3 MB GPU).

Rebuild: `python -E -P tools/texturefactory/build.py leaf_copperbeech:a bark_copperbeech:a`, then
`python -E -P tools/texturefactory/encode.py bark_copperbeech`, then
`python -E tools/trees/ship_factory_tree_textures.py leaf_copperbeech bark_copperbeech:a`.

## Screenshots (`docs/trees/copper_beech/`) and the reference photos

| file | what |
|---|---|
| `dreve_midday.jpg`, `dreve_golden.jpg` | the Drève de Lorraine layout at eye height (520 inventory trees) |
| `dreve_far_kit_impostors.jpg` | the whole drève from ~700 m, 120 m up: the far trees are the kit's impostors |
| `avenue_48m_midday.jpg`, `avenue_48m_golden.jpg` | one avenue tree (variant 1, 30 m) at 48 m |
| `park_55m_midday.jpg` | the park form (variant 4, 23 m) at 55 m |
| `leaves_14m_midday.jpg`, `leaves_14m_golden.jpg` | under the park tree's skirt: the spray's leaves |
| `bark_2m_midday.jpg`, `bark_2m_golden.jpg` | the bark at 2 m (in the crown's shade at midday) |
| `season_spring_48m.jpg`, `season_autumn_48m.jpg`, `season_winter_48m.jpg` | the seasons (summer = `avenue_48m_midday.jpg`) |
| `lod_chain_golden.jpg` | LOD 0 / 1 / 2 / old impostor with triangles (variant 1) |

Reference photos (Wikimedia Commons; looked at, not stored in the repo, not traced):

| photo | licence | what it shows / how the lab compares |
|---|---|---|
| [Fagus sylvatica 'Atropunicea' - Mariemont 1](https://commons.wikimedia.org/wiki/File:Fagus_sylvatica_%27Atropunicea%27_-_Mariemont_1.jpg), Jean-Pol Grandmont, 2009-04 | CC BY 3.0 | a huge Belgian park copper beech in April: young leaves coppery red-orange, see-through, long horizontal limbs; massive fluted root flare. Our spring is redder and denser; our park form is a closed dome, theirs an old open giant. |
| [Fagus sylvatica 'Atropunicea' Buk pospolity 2020-08-05 01](https://commons.wikimedia.org/wiki/File:Fagus_sylvatica_%27Atropunicea%27_Buk_pospolity_2020-08-05_01.jpg), Agnieszka Kwiecień, 2020-08 | CC BY-SA 4.0 | the same cultivar in August: shaded leaves turn dark bronze-GREEN, lit tops olive-bronze. Our summer is the June look (purple-maroon); a "late summer" step toward bronze-green is a palette change. |
| [Fagus sylvatica 'Atropunicea' Buk pospolity 2019-04-06 01](https://commons.wikimedia.org/wiki/File:Fagus_sylvatica_%27Atropunicea%27_Buk_pospolity_2019-04-06_01.jpg), same author | CC BY-SA 4.0 | early April, bare: grey branch structure, no marcescent leaves on a mature tree (as our sparse winter). |
| [Copper Beech Fagus sylvatica purpurea trunk 01](https://commons.wikimedia.org/wiki/File:Copper_Beech_Fagus_sylvatica_purpurea_trunk_01.jpg), B137, 2016 | CC0 | an old trunk: smooth grey elephant skin, deep flutes and buttresses, folds at the fork. Our bark colour and smoothness match; our flare is far milder (right for avenue trees, too mild for old park trees). |
| [Copper beech - foliage, geograph 5391022](https://commons.wikimedia.org/wiki/File:Copper_beech_(Fagus_sylvatica_f._purpurea)_-_foliage_-_geograph.org.uk_-_5391022.jpg), Evelyn Simak, 2017-05 | CC BY-SA 2.0 | (not opened; listed for the owner) May foliage |
| [The crown of a Copper beech, geograph 5748022](https://commons.wikimedia.org/wiki/File:The_crown_of_a_Copper_beech_(Fagus_sylvatica_f._purpurea)_-_geograph.org.uk_-_5748022.jpg), [The foot of a Copper beech, geograph 5748023](https://commons.wikimedia.org/wiki/File:The_foot_of_a_Copper_beech_(Fagus_sylvatica_f._purpurea)_-_geograph.org.uk_-_5748023.jpg), Evelyn Simak, 2018-04 | CC BY-SA 2.0 | (not opened) crown and foot |
| [Copper Beech ... Autumn Tree 2000px](https://commons.wikimedia.org/wiki/File:Copper_Beech_Fagus_sylvatica_f._purpurea_Autumn_Tree_2000px.jpg), Derek Ramsey, 2007-11 | GFDL 1.2 | (not opened) autumn |

No Street View look at the Drève de Lorraine in this round (time); worth a look before the city hook-up (look only).

## Cost (lab, 2026-11-14)

**Conditions**: `tools/perf/preflight.ps1` said GREEN, but **free memory was 2.1 GB of 15.7 (FAIL line)** and the owner was
test-driving the city on this laptop, so the GPU was shared. A/B alternated in one page (5 rounds x 2.5 s), 1400 x 850,
pixel ratio 1. Read anything under ~0.5 ms as noise; the spreads below are large.

**Triangles per tree** (mean of the 6 variants; the avenue form alone: LOD 0 5.2 k = 725 cards + 3.75 k bark, LOD 1 2.1 k,
LOD 2 730):

| LOD | copper beech | beech | plane |
|---|---|---|---|
| LOD 0 | 5,928 | 3,423 | 4,045 |
| LOD 1 | 2,128 | 1,185 | 1,505 |
| LOD 2 | 775 | 417 | 481 |
| impostor | 2 | 2 | 2 |

**GPU** (copper minus the other, ms; mean, spread over 5 rounds):

| view | vs beech | vs plane |
|---|---|---|
| one tree (25 m) at 40 m | +0.25 (+0.07 .. +0.72) | -0.58 (-2.62 .. +0.59) |
| street of 50 (25 m) | +0.20 (-3.28 .. +1.70) | -0.84 (-1.51 .. +1.05) |

Street of 50, same view: copper 173 k tris / 83 draws, beech 88 k / 97, plane 145 k / 97. **The 520-tree Drève, trees on vs
off: +1.30 ms** (+0.20 .. +2.36), 255 k triangles, 76 draws in total.

So: about the beech's cost per pixel (it is fragment-bound and its crowns are not bigger on screen), ~2x its triangles
(the bark of the LOD 0 secondaries and twigs: 3.7 k of the 5.2 k), fewer draws (one bark draw: the kit takes the far
trees). Cheaper than the plane.

**Memory**: built trees 2.8 MB (6 variants x 3 LODs), factory textures 5.3 MB (one season), kit atlas 63.8 MB, and the
old impostor atlas 64 MB that `makeSpecies` still bakes (unused by the fields when the kit is on: drop it before the city).

**LOD walk** (pop meter, frozen view, 60 steps 2 -> 1,200 m, one 30 m tree at 45 m, 40° lens; max step change %):
copper (avenue, kit far): morph 1 0.81, morph 2 1.04, impostor hand-over 1.27, dissolve **14.5** at the last step: the
kit fades its far trees toward the FAR ground colour and stops at 1,100 m; in the city that colour is the orthophoto
under them, on the lab's lawn the last step shows (the lab, not the tree). Beech (open form, old impostors), same walk:
5.0 / 5.6 / 14.9 (its old impostor hand-over) / 1.2.

**Flicker** (`labs/flickerTest.js`, 24 frames, strafe 0.6 mm, time frozen), the Drève layout:
- near (eye height, down the drève): copper **48 ppm** (57 px), beech 66 ppm, plane 99 ppm (same view);
- far (the whole drève from ~700 m, the kit's impostors): **0 ppm**.

## Shared files touched (for the merge)

- `labs/tree-lab.js`: imports (+ treesCopperBeech, impostorKit, flickerTest); the Drève data + `dreveTrees`; `S.cbSeason`,
  `S.farKit`; `DEFS.copperbeech` + `COPPER_TEX` preload; `SPECIES_NAMES`; `variantFn` (copper auto forms; `copperbeech`
  in `forms`); `placementsFor` + `LAYOUTS` + `VIEWS` (the Drève); the field loop's `attachKit`; `kitFor` / `disposeKit` /
  `attachKit` (new, before `buildChain`); `applySeason` skips `def.seasonal`; `resetView` (no sun turn on the Drève);
  panel (species list, season, far kit, `rebuildCopper`, 3 buttons); `disposeSpecies` disposes the kit; `memText`;
  the loop's `K.updateView`; `flicker()` and `window.lab` additions. Plane / beech / street paths unchanged.
- `viewer/impostorKit/sources/stylizedTrees.js`: reads `shared.leafAtlas` (coverage + colour) when set; species without
  one (the city's street trees) unchanged.
- `viewer/treeTextures.js loadLeafAtlas`: `e.n_file ?? \`${name}_n.ktx2\`` (the factory seasons share one normal map).
- `tools/texturefactory/materials/leaves.py`: + `copperbeech` (LAST in the dict: the seeds go by position, the other
  species keep theirs), `under`, `petiole_col`, an optional `winter` season with its own coverage. `tf/leaves.py`:
  `colour()` takes `under`; twig width `twig_w` (default as before).
- `tools/texturefactory/materials/bark.py`: + `beech_skin`, `COPPER`, `bark_copperbeech`.
- `viewer/materials/generated/generated.json` (factory manifest: + copper entries), `viewer/trees/textures/tree_textures.json`
  (+ 4 leaves, 1 bark).
- New: `viewer/treesCopperBeech.js`, `tools/trees/*.py`, `data/trees/bm_copper_beech.json` (CC0 derived),
  `viewer/trees/textures/*copperbeech*`, `docs/trees/copper_beech/`, this file.

## Weak points / next

- **Winter**: the branch network is thin (LOD 1 and 2 drop the secondaries' bark, which a bare tree needs at every
  distance); one marcescent density for all trees (young / clipped ones should hold many more leaves).
- **Late summer** turns bronze-green (August photo): add it as a fifth season or a summer slider.
- **Golden hour close up** (`leaves_14m_golden.jpg`): sunlit leaves go coral; the palette may want a darker top under
  warm light. Midday reads right.
- The radial spray pattern (twigs meeting in the card's centre) shows close up (< 15 m).
- Triangles ~2x the beech: the LOD 0 bark (secondaries 4 sides x 3 rings, twigs) could drop to 3 sides or lose the twigs.
- The old impostor atlas (64 MB) is baked for nothing when the kit is on.
- Old park trees: the root flare and the folds of the trunk photo are much stronger than ours.
- The Drève in the lab is on a flat lawn without its road; its trees use the inventory's 5 m height classes, so rows of
  identical heights.
- City hook-up (after the verdict): the 520 inventory positions + species directly, one field per species per tile,
  the kit for the far trees.
