# The horse chestnut (Aesculus hippocastanum, "marronnier")

Branch `claude/horse-chestnut` (2026-11-14). **Lab only**: the city is unchanged (nothing in `viewer/main.js` or the
city's tree code reads it). For the owner's verdict. The copper beech round (`docs/trees/COPPER_BEECH.md`) was the
template: species module, factory bark + seasonal leaf sprays, avenue + park forms, impostor-kit far trees, an
inventory layout.

**Why this tree.** The owner: "most trees are green, a lot of big chestnut trees; they change colours with the
seasons". Of Uccle's 1,597 live regional-road trees (Bruxelles Mobilité inventory, CC0; `docs/trees/SPECIES_DATA.md`),
276 are horse chestnuts (17.3 %; the 4 red horse chestnuts, *A. x carnea*, of the Avenue Brugmann left out):
**233 on the Avenue Winston Churchill** (its central berms, multiple alignments), 41 on the Avenue de Fré, 2 on the
Chaussée d'Alsemberg. Crowns "Semi-libre". Inventory classes:

| | heights (m) | crown diameter (m) | trunk circumference (cm) |
|---|---|---|---|
| 10th / 25th / 50th / 75th / 90th percentile | 9 / 10 / 15 / 20 / 25 | 4 / 6 / 9 / 12 / 12 | 48 / 72 / 115 / 203 / 238 |

So a mix: about half are big old trees (20-25 m, 12-14 m crowns, 2-2.4 m round trunks), the rest younger
replacements. The forms below are built as the old trees and scaled to each tree's inventory height.

## How to see it

Serve the worktree (`python tools/serve_nocache.py 8860`) and open
`http://127.0.0.1:8860/labs/tree-lab.html?species=horsechestnut`. Panel "Scene & species":
- **species**: `horsechestnut` (street, plane, beech and copper beech are still there, unchanged);
- **horse chestnut season**: summer / spring / autumn / winter (rebuilds the species: its spray, palette and bakes);
- **copper beech / horse chestnut far: impostor kit** (on): the far trees through the impostor kit, as the city;
- **layout** "Avenue Winston Churchill + Avenue de Fré (inventory, 276 horse chestnuts)": the real trees at their
  inventory positions and heights (`data/trees/bm_horse_chestnut.json`, by `tools/trees/horse_chestnut_rows.py` from
  the raw inventory), 2.7 km south of the lab's other layouts, seen from the avenue's west end at eye height;
- **variant**: auto = the avenue form (0-3) on the street of 50 and the avenue layout, the park form (4-5) in the park
  cluster; `0`-`3` avenue, `4`-`5` park.

URL: `species=horsechestnut`, `hcseason=spring|summer|autumn|winter`, `farkit=0`, the usual `layout=`, `variant=`,
`h=`, `time=`. Performance folder: "benchmark: copper beech / beech / plane vs horse chestnut (A/B)", "flicker
test". `window.lab.HC_TEX`, `lab.chestnutTrees`.

## What it is

Code: `viewer/treesHorseChestnut.js`, through the city's chain (`viewer/treesStylized.js makeSpecies`: nested LODs
with the card morph, depth pre-pass, shadow fade, impostors).

**Two forms.**
- **Avenue tree** (variants 0-3, built ~20 m, crowns ~16 m across): a THICK, short trunk (0.95 m across above the
  flare, a root flare with buttresses), narrowing into an **early main fork at 3-4 m** where 3-5 big limbs climb
  (30-55° off vertical), plus 3-4 **low limbs that sweep out and down to the hem and turn up at their tips**. A
  broad, heavy dome: the widest a third of the way up, a rounded top, the hem low and wide (a skirt), billows on it
  (harmonics 2-7 in azimuth and elevation: the horse chestnut's lumpy "cumulus" crown, not a smooth ball).
- **Open-grown park tree** (variants 4-5, ~21 m tall, ~27 m across, a 1.3 m trunk): a huge rounded dome, wider than
  tall, 6-8 limbs, the low half sweeping far out and down to ~3 m and curving up.

**The copper beech's weak points, avoided here.**
- *Thin straight trunk under a blocky crown*: thick short trunk, early fork, visible limbs, a domed and billowed crown
  (`crownNormal` 0.5: the billows read; the copper beech 0.72).
- *Coral leaves at golden hour*: translucency colour yellow-green (`#9cc048`, 0.3), and the palette is the spray's own
  green (below): `avenue_40m_golden.jpg` stays green / olive.
- *The star of twigs at the card's centre*: the spray is laid out as rosettes at shoot tips spread over the card
  (Poisson disc), the shoots running DOWN out of each rosette; no twig reaches the centre.

**Upright sprays** (`def.maxCardSpin` 0.45 rad, a new optional field of `makeSpecies`): the vendor spins every card
at random; this species keeps them within ±26°, so the candles stand up and the winter twig tips curve up.

**The spray brings its colours**: the palette (top / bottom colours) is the spray's own mean albedo (x 1.12 top,
x 0.62 bottom in summer), with 85-100 % of its colour spread kept. A palette multiplies every texel, so a green
palette would have turned the white candles green and the autumn's mix of yellow, rust and green into one tint.

**Leaves: texture factory sprays** (`tools/texturefactory/tf/chestnut.py`, `materials/leaves.py` `make_chestnut`,
CC0 by construction; `docs/trees/horse_chestnut/sprays_factory_preview.jpg`):
- leaves: palmate compound, 7 (25 %: 5) obovate leaflets on a long petiole, the middle one the longest, the outer ones
  about half; leaflets with a short drawn-out point, a double-toothed margin, 16 straight vein pairs, folded and
  arched; one foreshortening per leaf; 4-6 leaves per rosette in crossing pairs, drooping a little; 8 rosettes and 10
  loose leaves per card, coverage 0.39;
- **summer**: rich mid-to-dark green, a few leaf-miner blotches (*Cameraria ohridella*: every Brussels horse
  chestnut has them by August), paler undersides;
- **spring**: fresh light green **with the white flower candles**: upright panicles of 110-150 florets (white /
  cream, some with a yellow or pink-red blotch) on a green stalk over 80 % of the rosettes; its own normal + thickness
  map (the florets are domes, thicker than leaves);
- **autumn**: early and patchy: yellow-ochre, rust, brown and some leaves still green, browned margins, many
  leaf-miner blotches, each leaflet a little apart in value and warmth, 15 % of the leaves already fallen;
- **winter**: bare: stout grey-brown twigs entering from the card's rim, opposite branching, the **tips curving up**,
  big glossy red-brown **sticky buds** at the tips, smaller paired buds; its own normal map (round twigs).

**Bark: texture factory** (`materials/bark.py chestnut_plates`, `bark_horsechestnut` variant **b**, 1 m tile; variant
a, the old "scales", untouched): grey-brown thin plates (columns cut by wavy cross cracks), lifting paler edges, a few
fallen showing the orange-brown under-bark, algae in the cracks, crustose lichen. Mapped triplanar
(`scanBark`, graded to a grey-brown). The **spiral** of old trunks is in the mesh: five ridges winding up the bole at
~30° with the elliptic section turning with them.

**Far trees: the impostor kit** (as the copper beech: one atlas, 63.8 MB, baked from LOD 2 with the season's spray).

**Textures shipped** (`viewer/trees/textures/`, manifest `tree_textures.json`):

| file | KB | GPU (BC7 + mips) |
|---|---|---|
| `bark_tf_horsechestnut_albedo.ktx2` + `_nra.ktx2` | 746 + 1,246 | 2.7 MB |
| `leaf_horsechestnut_n.ktx2` (summer, autumn) / `_spring_n` / `_winter_n` | 585 / 604 / 165 | 1.3 MB each |
| `leaf_horsechestnut[_spring / _autumn / _winter]_a.ktx2` | 514 / 571 / 539 / 129 | 1.3 MB each |

One season in use: **5.3 MB GPU** (as the copper beech), ~2.4 MB download. The lab preloads all four (11.8 MB GPU).

Rebuild: `python -E -P tools/texturefactory/build.py leaf_horsechestnut bark_horsechestnut:b`, then
`python -E -P tools/texturefactory/encode.py bark_horsechestnut`, then
`python -E tools/trees/ship_factory_tree_textures.py leaf_horsechestnut bark_horsechestnut:b`.

## Screenshots (`docs/trees/horse_chestnut/`)

| file | what |
|---|---|
| `avenue_42m_midday.jpg` | summer, avenue form (variant 1, 20 m) at 42 m |
| `season_spring_42m.jpg`, `season_autumn_42m.jpg`, `season_winter_42m.jpg` | the other seasons, same view |
| `candles_13m_midday.jpg` | spring at 13 m: the candles and the palmate leaves |
| `park_58m_spring_midday.jpg` | the park form (variant 4, 21 m) in flower |
| `avenue_40m_golden.jpg` | golden hour (stays green; taken before the fork was narrowed and the bark darkened) |
| `under_6m_midday.jpg` | under the crown: trunk, fork, limbs, leaves from below |
| `churchill_eye_midday.jpg`, `churchill_overview_midday.jpg` | the inventory layout (276 trees) |
| `churchill_far_kit_870m.jpg` | the whole layout from ~870 m: the kit's impostors |
| `lod_chain_midday.jpg` | LOD 0 / 1 / 2 / old impostor with triangles |
| `sprays_factory_preview.jpg` | the four factory sprays (summer, spring, autumn, winter), as the cards show them |

**Reference photos** (Wikimedia Commons; looked at, not stored, not traced):

| photo | licence | what it shows / how the lab compares |
|---|---|---|
| [Aesculus hippocastanum bark Siemianowice](https://commons.wikimedia.org/wiki/File:Aesculus_hippocastanum_bark_Siemianowice.jpg), Adrian Tync, 2025 | CC BY-SA 4.0 | an old trunk: plates 10-20 cm outlined by thin, wavy dark cracks, a lot of green algae. Ours: the right plate size and grey-brown, too little algae, the cracks straighter. |
| [Aesculus hippocastanum Paris 3](https://commons.wikimedia.org/wiki/File:Aesculus_hippocastanum_Paris_3.jpg), Awinch1001, 2026-04 | CC0 | looking up into a flowering street tree: drooping palmate leaves, candles over them, dark sinuous limbs. Ours (`candles_13m_midday.jpg`) has the leaves and candles; the real crown is more see-through from inside, with many more visible limbs. |
| [Aesculus hippocastanum in Golden Valley Tree Park, May 2022 01](https://commons.wikimedia.org/wiki/File:Aesculus_hippocastanum_in_Golden_Valley_Tree_Park,_May_2022_01.jpg), Calistemon | CC BY-SA 4.0 | (licence checked, not opened) a park tree in May |
| [Zwellende bladknop van een witte paardenkastanje, 16-03-2022](https://commons.wikimedia.org/wiki/File:Zwellende_bladknop_van_een_witte_paardenkastanje_(Aesculus_hippocastanum)_16-03-2022._(d.j.b).jpg), Dominicus Johannes Bergsma | CC BY-SA 4.0 | (licence checked, not opened) the sticky bud |

No Street View look at the Avenue Winston Churchill in this round (time); worth a look before the city hook-up (look only).

## Cost (lab, 2026-11-14)

**No GPU timings**: `tools/perf/preflight.ps1` said **RED** (2 GB of 15.7 free, the GPU at its power cap, 52 % busy
at rest: another city tab on :8861 was rendering; the owner or another agent was using the city), so no A/B GPU
benchmark was run. The lab has the buttons ("benchmark: copper beech / beech / plane vs horse chestnut (A/B)") for
a GREEN run. Below: geometry, draws and memory, which do not depend on the load.

**Triangles per tree** (mean of the 6 variants; avenue variant 0: LOD 0 683 cards + 2,452 bark):

| LOD | horse chestnut | copper beech | beech | plane |
|---|---|---|---|---|
| LOD 0 | **4,590** | 5,928 | 3,423 | 4,045 |
| LOD 1 | **2,024** | 2,128 | 1,185 | 1,505 |
| LOD 2 | **760** | 775 | 417 | 481 |
| impostor | 2 | 2 | 2 | 2 |

**Street of 50** (20 m trees, the same view): horse chestnut 145 k tris / 83 draws, copper beech 172 k / 81, beech
88 k / 97, plane 145 k / 99. **The 276-tree avenue layout**: 134-190 k triangles, 67-103 draws depending on the view.

So: **about the copper beech's cost or less** in geometry (-23 % LOD 0: the secondaries 3-sided, no twig layer), the
same card counts and the same fragment work per card (the same chain, one more texture fetch-free branch), the same
draws. GPU time to be confirmed on a GREEN preflight.

**Memory**: built trees 2.8 MB (6 variants x 3 LODs), factory textures 5.3 MB per season, kit atlas 63.8 MB, plus the
old impostor atlas 64 MB that `makeSpecies` still bakes (unused by the fields when the kit is on: as for the copper
beech, drop it before the city).

**LOD walk** (pop meter, frozen view, 60 steps 2 -> 1,200 m, one 20 m tree at 45 m, 40° lens; max step change %):
morph 0->1 0.91, morph 1->2 1.02, impostor hand-over 1.15, end dissolve 12.9 (the kit fading toward the far ground
colour at 1,100 m over the lab's lawn: the lab, not the tree; the same as the copper beech's 14.5).

**Flicker** (`labs/flickerTest.js`, 24 frames, strafe 0.6 mm, time frozen), the avenue layout:
- near (eye height at the avenue's west end): **25 ppm** (30 px) (the copper beech's drève: 48 ppm);
- mid (150 m up, 400 m away): 19 ppm;
- far (the whole layout from ~870 m, the kit's impostors): **0 ppm**.

## Shared files touched (for the merge)

- `viewer/treesStylized.js` `makeSpecies` `calibrate()`: after `createStylizedTrees(...)`, the optional
  `def.maxCardSpin` scales every card's spin (`cardSpin` attribute) down to ±that angle. Species without it unchanged.
- `labs/tree-lab.js`: header comment; import (`treesHorseChestnut.js`); the avenue data + `chestnutTrees`,
  `CHURCHILL_Z`, `CHESTNUT_LAYOUT` (after `dreveTrees`); `S.hcSeason`; `DEFS.horsechestnut` + `HC_TEX` preload;
  `SPECIES_NAMES`; `variantFn` (horse chestnut auto forms; in `forms`); `placementsFor`, `LAYOUTS`, `VIEWS`
  (the avenue); the field loop's `attachKit` (also for `horsechestnut`); `resetView` (no sun turn on the avenue);
  panel (species list, "horse chestnut season", the far-kit label, `rebuildCopper` now calls the generic
  `rebuildSeasonal(key)`, 3 benchmark buttons); `memText`; `window.lab` (+ `HC_TEX`, `chestnutTrees`).
- `tools/texturefactory/materials/leaves.py`: the `horsechestnut` dict REPLACED (same position: the other species'
  seeds unchanged) and `make_chestnut` + an override of `MATERIALS["leaf_horsechestnut"]` at the end.
- `tools/texturefactory/materials/bark.py`: + `chestnut_plates`, `CHESTNUT_OLD`, `bark_horsechestnut` variant `b`.
- `tools/trees/ship_factory_tree_textures.py`: a season may have its own normal map (manifest `n_file`).
- `viewer/materials/generated/generated.json` (+ / changed horse chestnut entries only),
  `viewer/trees/textures/tree_textures.json` (+ 4 leaves, 1 bark), `labs/index.html` (Tree Lab card),
  `CREDITS.md` (inventory row), `docs/TREES.md` §7.
- New: `viewer/treesHorseChestnut.js`, `tools/texturefactory/tf/chestnut.py`, `tools/trees/horse_chestnut_rows.py`,
  `data/trees/bm_horse_chestnut.json` (CC0 derived), `viewer/trees/textures/*horsechestnut*`,
  `docs/trees/horse_chestnut/`, this file.

## Weak points / next

- **GPU cost not measured** (preflight RED): run the three A/B buttons on a GREEN machine.
- **Inside the crown** (looking up from below): darker and less see-through than the photo, too few visible limbs
  beyond the main ones.
- **Winter**: reads as a bare tree at 40 m, but dark against the sky, and LOD 1 / 2 drop the secondaries' bark (the
  sprays carry the fine twigs); the sticky buds only show close up.
- **Bark**: needs more green algae and wavier cracks (photo); the spiral is geometric only (no spiral in the texture).
- The candles are a little grey-cream at distance (the card's occlusion darkens them).
- Crowns follow the inventory HEIGHT only (scaled forms); the inventory crown diameters are not used per tree.
- The old impostor atlas (64 MB) is still baked for nothing when the kit is on (as the copper beech).
- The avenue in the lab is on a flat lawn without its road and berms; the inventory's 5 m height classes give rows of
  identical heights.
- City hook-up (after the verdict): the 276 inventory positions + species directly, one field per species per tile,
  the kit for the far trees; the season from the city's date.
