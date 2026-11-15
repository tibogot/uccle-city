# Public art kit, round 1 (branch claude/art1, 2026-11-15)

The first public artworks in the city come from the ranked list in `docs/PUBLIC_ART.md` (data:
`data/publicart/inventory.json`). **The kit is on by default; `?art=old` gives the city without it**, and the monoliths'
UrbIS boxes come back. The dev panel's Go to has a "Public art" group: Dix Monolithes (street and from above),
La Victoire, Monument René Gobert, Borne 5 km.

| piece | where (city x, z) | model |
|---|---|---|
| **Dix Monolithes** (Florence Freson, 1992-94) | Rue de Stalle roundabout, island centre (-2240.0, 376.0) | 7 standing + 3 lying blue-stone blocks, the island's kerb, the planted bed, 2 hornbeam hedges |
| **La Victoire**, monument aux evades de guerre (Raymond Glorie, 2001) | Square Georges Marlow (-651.3, -280.0) | the stainless steel V on a dressed block in a rubble cairn, broken chain, laurel branch, gravel circle, 2 inscribed slabs |
| **Monument a Rene Gobert** (M. Chabot arch. 1943, J. Witterwulghe sc.) | Avenue De Fre (-503.1, -439.7) | pier with the bronze portrait relief and the inscription, 2 dated panels with gilt figures, forecourt, beds, flanking walls |
| **Borne "5 km"** (listed, 1745-1815) | 817 Chaussee de Waterloo (1375.7, -1320.4) | the milestone kit (instanced), numeral 5 |
| milestones "0" / "1" | Vert Chasseur (1823.9, -89.8) / Ch. de Saint-Job (865.0, 663.3) | the same kit, numerals from OSM (**form NOT verified**) |
| Charles V boundary stones (2) | (2576.8, 1167.0), (64.6, 1153.8) | a rough-dressed upright with the Burgundy cross (**form NOT verified**), instanced |

As briefed, Churchill and Cavell-Depage (hard figurative pieces) are skipped. On the coordinator's call (2026-11-15),
L'Accueil, Zerlina and the Ukkelbeek fountain are left for a later round.

## 1. References and positions (checked 2026-11-14/15; looked at only, nothing traced, stored or shipped)

| piece | references | position | what they showed |
|---|---|---|---|
| Monolithes | heritage photo OM2020_097_001 (collections.heritage.brussels object 54251: "hauteur 600 cm, longueur 145, largeur 145", 7 standing + 3 lying, recycled setts and 2 hornbeam hedges); Google Street View June 2024; Google aerial | **9 of the 10 stones are UrbIS 3D solids** (514510, 514511, 514570, 514571, 514572, 514644, 515111, 515290, 515953). Their positions, sections, orientations and tops are used as they are, and the solids are hidden. The island is the UrbIS median street surface 40050: circle fit r 19.92 m, residual 0.13 m. **The 7th standing stone is not in UrbIS**: it is placed by eye from the aerial (south-west group, between 514510 and 515111) with its neighbours' section and the record's 6.00 m. The island centre is 0.4 m from the OSM node | split blue-stone columns, some faces with **rows of horizontal drill channels** (the "stacked" look), others rough split or point-tooled; a sawn blue-stone kerb about 0.3 m high; **in 2024 the bed is planted (heather, ornamental grasses), no longer setts**; two clipped hedges across the middle (aerial) |
| La Victoire | 11 heritage photos (object 70329: stainless steel + blue stone); aerial | the OSM node is the centre of the gravel circle in the lawn | two square stainless bars in a V on a cairn of split blue-stone rubble on a gravel circle (about 5.2 m; the aerial scale is 10.7 px/m); a broken black chain hanging from the bars, a black laurel branch between them; two inscribed slabs (FR / NL) on two posts each, one on each side |
| Gobert | 8 heritage photos (object 70356) | OSM way 245080563 (6.6 m: the pier + the 2 panels); it faces Avenue De Fre (13 m away, the nearest road) | a pale weathered stone pier with a bronze head-and-shoulders relief in a recess and the inscription below; 2 panels with gilt figures "1914-1918" / "1940-1943" over a carved laurel band; lower cream ashlar walls on either side; stone flags and flower beds in front |
| Borne 5 km | monument.heritage.brussels 38737 photo; Street View June 2024 | at no. 817, at the back of the east sidewalk against the hedge, medallion toward the road: the OSM node is right | square plinth, torus, round shaft with domed top, sunk medallion with an incised 5; weathered, mossy |
| milestones 0 / 1, Charles V stones | none found (web search; the 1520-66 forest boundary stones are documented as "marquees de la Croix de Bourgogne") | OSM nodes as they are; each faces its nearest road | forms NOT verified (section 7) |

Inscriptions (only the real texts, read on the photos; `tools/publicart/letters.py`):
- La Victoire, FR slab: "1914-1918 / 1940-1945 / EN MEMOIRE DE CEUX / QUI SE SONT EVADES / DES CAMPS ET DES TERRITOIRES /
  OCCUPES PAR L'ENNEMI / POUR SE JOINDRE PAR DES VOIES / CLANDESTINES ET PERILLEUSES / AUX COMBATTANTS DE LA LIBERTE".
  NL slab: "TER HERINNERING / AAN DIE WELKE ONTSNAPTEN / UIT DE KAMPEN EN UIT DE GEBIEDEN / DIE DOOR DE VIJAND BEZET
  WAREN / OM LANGS CLANDESTIENE EN GEVAARLIJKE WEGEN / DE VRIJHEIDSSTRIJDERS TE VERVOEGEN". The accents are not legible
  on the photos, so none are drawn.
- Gobert pier: "L'UNION DES / ANCIENS COMBATTANTS / D'UCCLE / A SON VENERE PRESIDENT / RENE GOBERT / FUSILLE PAR LES
  ALLEMANDS / LE 17 SEPTEMBRE 1943 / LIEUTENANT S.R.A" (this matches OSM's inscription tag); the panels read "1914-1918" and "1940-1943".

## 2. Sizes (from the data, else from the photos with people / cars for scale)

- **Monolithes**: standing 1.23-1.54 x 1.32-1.44 m (UrbIS), tops 6.0-6.4 m over the DTM (UrbIS tops 34.07-34.30 m TAW);
  lying 5.89-6.01 x 1.29-1.44 m, 1.5-1.7 m high. Island: r 19.92 m. The kerb is 0.20 m wide, its top 0.30 m over the road
  and at least 6 cm over the island the city draws. Hedges are 1.2 m wide, 1.7 m high, about 27 and 31 m long. Their
  rows (E-W at z -7.3 and -1.2 from the centre) are placed by eye from the aerial.
- **La Victoire**: bars 0.15 m square, 4.3 m long, 19 deg off the vertical, top about 4.7 m over the lawn (photo: about
  3.2 x a car's height); dressed block 0.92 m, top 0.62 m; cairn about 3 m across, 0.7 m high (40 stones); gravel circle
  r 2.62 m; slabs 1.05 x 0.62 x 0.10 m at 15 deg on 2 posts, 3.15 m either side.
- **Gobert**: 13.2 m in all. Pier 1.2 x 0.7 x 2.62 m (with its cap) and bronze plaque 0.50 x 0.52 m. Panels 2.7 x 0.42 x
  1.63 m. Walls 3.3 m each, 1.27 m high. Forecourt flags 6.6 x 1.4 m. Beds 2.5 x 0.6 m.
- **Milestone**: 1.11 m: plinth 0.60 m square, torus, shaft 0.34 m, domed top, medallion 0.17 m centred 0.83 m up.
- **Boundary stone**: 0.36 x 0.26 x 0.72 m (assumed).

## 3. How it is built

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/publicart/build_site.py    # models/publicart/site.json (UrbIS, OSM, DTM, roads)
python tools/publicart/letters.py                                                  # models/publicart/publicart_letters.png + .json
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/publicart.py -- [--previews] [--samples 32] [--rebuild-stones] [--reuse]
node tools/publicart_pack.mjs                                                      # LODs + mesh audit -> models/publicart/publicart.glb
```

- **Blender** (`tools/blender/publicart.py`, everything scripted, `kitlib.py` primitives):
  - **Sculpted stone** (the monoliths, the cairn, the boundary stone, the hedges): a bevelled box, voxel-remeshed
    (2.5 cm) and displaced along the normal (split faces, point-tooled striations, chipped arrises). The shipped
    low-poly is a coarse remesh (14 cm) shrink-wrapped onto it. The sculpt is **baked** onto it with Cycles on the GPU
    (OptiX), each piece ALONE on its own ground plane, into one 2048 atlas (TEXCOORD_1): a tangent-space normal map
    `publicart_nrm.jpg` and AO `publicart_ao.png` (reach 1.5 m for the monoliths, 0.5 m for the rest). The monoliths'
    sculpts take about 15 min of Python displacement and are cached in `models/publicart/work/stones.blend`
    (git-ignored; `--rebuild-stones` redoes them).
  - **The drill channels** are not baked: a 2048 atlas gives a 6 m stone about 3 cm per texel, too coarse for 4 cm
    grooves. The drilled faces carry code "drill" and the stone's pitch (11.5-15 cm) in COLOR_0.b. The city's stone
    material draws the soft round-bottomed channels as a bump plus a shade, sharp at any distance and faded out with
    the pixel footprint (no shimmer).
  - **Hard parts** (bars, chain, laurel, slabs, kerb, plinths, the Gobert stones) are modelled with real bevels. Their
    high-poly is a copy, so their normal map stays flat. The bake cage for hard pieces is 6 mm, so no ray starts
    inside the next box.
  - **The Gobert portrait**: a 100 x 104 height-field low relief (head, hair, ears, collar, tie, lapels), baked into
    the plaque's normal map.
  - **Normals**: the custom normals the map is baked against are also the ones shipped (triangulated first). Planar
    regions (> 0.2 m2) are flat; other corners average within 60 deg; stretched triangles with diverging corners are
    flat (the mesh audit's bentflat / streak rules).
  - **Named slots, no colour**: stone_blue, stone_kerb, stone_pale, stone_cream, steel_stainless, iron_black, bronze,
    gravel, bed_planting, hedge_hornbeam. COLOR_0.r = code / 16 + 1/32 (plain, split, kerb, letters, medallion,
    ashlar, cross, gilt, relief, coping, step, chain, drill). TEXCOORD_0 is in metres; on lettered faces it is
    1000 (cell + 1) + s, with v = t in metres.
  - **The Monolithes island** is fitted to the surface the city DRAWS there (the UrbIS median with its measured kerb
    lift, sampled in the viewer: `models/publicart/monolithes_drawn.json`). The bed lies 5 cm over the highest drawn
    sample within 2.3 m; the kerb top is 0.30 m over the road and 6 cm over the drawn rim, as an upper envelope
    smoothed round the ring. The kerb face goes 0.5 m into the road and the stones 0.5 m into the bed (JOINS).
- **Pack** (`tools/publicart_pack.mjs`, from `tools/park_kit_pack.mjs`):
  - LOD0 = the Blender mesh as made.
  - LOD1 / LOD2 = welded and simplified with meshoptimizer, using a per-piece error, with per-slot multipliers so the
    kerb and the bed keep apart. The AO is sampled from the atlas into the vertices, and the normals are rebuilt with
    a crease.
  - Output is EXT_meshopt_compression, with TEXCOORD_0 at 24 bits so the lettering survives quantization.
  - The mesh audit runs on every piece and LOD, and a LOD is re-made with another error while it blocks.
- **Lettering**: `tools/publicart/letters.py` writes the atlas (Times New Roman for La Victoire's Roman capitals and
  the gilt figures, Century Gothic for the Gobert pier's sans-serif; 2048 x 1424, 63 KB). The city reads it as one
  8-bit channel.

## 4. In the city (`viewer/publicart/`)

- `artCity.js` `addPublicArt` is called with the landmarks (main.js, `?art=old` = off). It reads
  `models/publicart/site.json` and pushes the 9 UrbIS solids onto the hide list before the first tile.
  - **Monolithes, La Victoire, Gobert**: a landmark each. They have three levels, cross-faded by distance with the
    landmarks' TIMED settle (lodFade.js `settleRamp`: standing still = one level drawn whole; crossing a switch = a
    0.6 s dissolve; the shadow pass follows). Nothing is drawn beyond the last band.
    - Bands (switch m): Monolithes 70 / 220 / 1100, V 35 / 110 / 500, Gobert 35 / 110 / 450.
    - The V and Gobert are set on the surface the city draws (`world.walkY`) once their tile is in, and only then
      join the scene (the collider builder reads them there). The V's gravel circle is draped vertex by vertex onto
      the lawn.
  - **Milestones and boundary stones**: INSTANCED through `viewer/parkKit.js` `KitField`, one draw per slot and level
    for all five, with per-instance bands (14 / 45 / 140 m and 12 / 40 / 110 m) and the dithered hand-over. The
    numeral comes per instance: `MEDALLIONS` is a uniform array of (x, z, cell), and the nearest one wins. The stones
    are set on the walking surface (the sidewalk) once their tile is loaded.
  - **Colliders**: each piece has a root `art-<id>` with an `_lod0` child, and `ART_ROOTS` was added to
    `heroColliders.js`, `contactAudit.js` and `drive/collisionTest.js`. In the city: the V 12.9 k walk triangles and
    11 car blocks (before the chain / laurel rebuild: now 14.5 k); Gobert 1.1 k and 35; the monoliths 54 k.
- `artKit.js` holds the loader and the slot materials (TSL):
  - blue stone: weathered grey, rain-washed tops, streaks, a little moss low in the crevices, incised letters, the
    medallion with its numeral, the Burgundy cross, the drill channels;
  - Gobert's pale stone: 0.48 m ashlar courses (none across the inscription), heavy rain streaks, incised and gilt
    letters;
  - cream walls: the library's shipped sandstone scan when loaded;
  - brushed stainless (lengthwise roughness), black iron, patinated bronze, dolomite gravel, planted bed (mulch,
    leaves, heather, straw), hornbeam (brown in winter).
  - All of them get the baked AO (floored at 0.42), the weather layer (`wxMat`) and geometric specular anti-aliasing.
    Emissive: none (fixed light count). No DynamicDrawUsage.
- **Street plates**: the street-life layer had put 5 wall-mounted street plates on the monoliths' UrbIS boxes. With the
  kit on they would float, so they are dropped (`ART_CLEAR` in `artRoots.js`, through the street-life worker).

## 5. Checks

- **Mesh audit** (`models/publicart/audit/`): **0 blocking** over the 15 LOD groups (5 pieces x 3 LODs). LOD0 of every
  piece is clean with no allowances. `publicart.allow.json` allows 5 small bent normals on the monoliths' far levels
  (3-25 deg on 0.02-0.14 m2 triangles at stone and hedge feet / an arris, drawn at 70+ m only), with reasons.
- **Contact (JOINS)**: `await viewer.contactAudit("art-evades")`: 14,514 tris, 255 edges checked, **0 floating,
  0 overhang**. `"art-gobert"` and `"art-km5"`: 0 floating, no edge even near the ground (everything set into it) (plinths 0.35 m, the forecourt 0.3 m, the
  beds 0.2 m). The monoliths: the bed is fitted over the drawn island, the kerb skirts 0.5 m into the road, the stones
  go 0.5 m into the bed. Milestones and stones: plinths 0.25-0.3 m into the sidewalk / ground.
- **LOD flight** (`debug/publicartFlight.js`, monoliths, 1200 m -> 12 m -> 1200 m, 14 s each way, 8 m up):
  **0 pops**; states 001@529 011@188 010@153 110@69 100@55 110@71 010@87 011@221 001@269 (every switch through an
  overlap).
- **Console**: no errors. The warnings are the existing ones (library names, texture serialisation, the inline-Fn
  return, "uv not found" as listed in HEROS.md).

## 6. Cost

`renderer.info`, the kit drawn minus hidden at the same view (main + shadow passes), median of 12 frames:

| view | level | draws | triangles |
|---|---|---|---|
| monoliths, street, 9 m from the box | LOD0 | +8 | +109 k |
| monoliths, 120 m, 30 m up | LOD1 | +8 | +26 k |
| monoliths, 400 m, 60 m up | LOD2 | +7 | +14 k |
| La Victoire, 10 m in front | LOD0 | +8 | +29 k |
| Gobert, 10 m across the sidewalk | LOD0 | +10 | +2.2 k |
| milestone 5 km at 5 m (instanced field) | LOD0 | +2 | +2.8 k |

Triangles per LOD (LOD0 / LOD1 / LOD2): monoliths 54,418 / 14,229 / 7,000 (4 slots); V 14,514 / 5,939 / 2,416 (4);
Gobert 1,112 / 896 / 794 (5); milestone 1,386 / 802 / 206 (1); boundary stone 1,630 / 1,024 / 290 (1).

Files:

| file | size |
|---|---|
| `publicart.glb` (meshopt) | 2.5 MB |
| normal atlas (jpg) | 0.47 MB |
| AO atlas (png) | 0.85 MB |
| lettering | 63 KB |

On the GPU: the normal atlas is 2048² RGBA (16 MB + mips), the AO atlas R8 (5.6 MB), the lettering R8 (2.9 MB).

The kit loads in the background (about 12 s on this machine, including up to 6 s waiting for the library's sandstone
scan); its shaders build through the precompile queue (about 33 s in the background while the city ran) before
anything shows.

**GPU ms: not claimed.** `tools/perf/preflight.ps1` was RED (other agents' Chrome tabs and Blender bakes on the machine).

## 7. Images (`docs/publicart/`, our renders only)

- `monolithes_street.jpg` (the heritage photo's angle, from the ring road) and `monolithes_before_artold.jpg` (the
  same view with `?art=old`).
- `monolithes_drill.jpg`, `monolithes_aerial.jpg`.
- `evades_front.jpg`, `evades_detail.jpg`, `evades_slab.jpg`.
- `gobert_front.jpg`, `gobert_pier.jpg`.
- `km5.jpg`.

**Against the references**:
- **Monolithes (street vs OM2020_097_001 / Street View 2024)**: the same composition from the ring road. Standing grey
  columns, the lying block in front, the long hedge behind, the sawn kerb in front of the bed. The faces show the rows
  of drill channels (the "stacked" faces of the photo) and the split faces between them.
  - Differences: the real stones are darker and more weathered, with crisper split edges; our arrises are softer (the
    14 cm low-poly).
  - The 2024 planting (heather and tall ornamental grasses) is only a bed texture.
  - The second hedge row and the stone positions inside the groups are placed by eye from the aerial.
- **La Victoire (front vs photos 2 / 1)**: the V of brushed steel on the dressed block, the dark rubble cairn on the
  pale gravel circle, the chain hanging from the bars, the laurel branch across, the two tilted slabs on posts either
  side.
  - Differences: the rubble is smoother, rounder and darker than the photo's split blocks; the chain and wreath are
    simplified; the slabs' exact spots are by eye.
- **Gobert (front vs OM_2022_061_001 / 002)**: the pier with the portrait plaque and the inscription, the two panels
  with the gilt "1914-1918" / "1940-1943", the lower cream walls either side, the flags and beds in front: it matches.
  - Differences: the portrait is only a blurred low relief at the atlas's resolution (section 8); the photos' carved
    laurel band behind the figures is not modelled; the beds are a plain planted texture.
- **Borne 5 km (vs the heritage photo / Street View)**: the plinth, torus, shaft, dome and sunk medallion with "5" at the
  back of the sidewalk. Ours is cleaner (no moss streaks or green staining).

## 8. Left / weak spots

- **Forms not verified**: milestones "0" and "1" (the 5 km form assumed) and both Charles V boundary stones (a generic
  rough upright with the Burgundy cross). Check them on site / Street View, and fix their models or data.
- **The Gobert portrait** is far too low-res in the shared 2048 atlas (about 30 px across): a dark plaque with a vague
  head. It needs its own small normal map (512²) or the statue-slot pattern (a dropped-in relief model).
- **The rubble cairn** reads too dark and rounded: its stones are voxel blobs with small atlas islands. Splitting it
  into flat-faced chopped blocks (like the boundary stone's) with lighter AO would bring it closer.
- **Island kerb**: the kerb line still undulates a little (it must stay above the jagged drawn median rim). A flatter
  kerb needs the drawn median itself lowered at the rim (roads / tile worker), which is not done here.
- **Peter-panning**: from 40-60 m up, a thin lit line shows at the foot of the stones and hedges (shadow bias,
  city-wide).
- The bed is a texture, not 3D plants (the 2024 heather and grasses); the hedges are smooth clipped bodies (no leaf
  cards).
- **Rebuilding** one piece re-bakes the whole atlas (no `--only` re-bake into an existing atlas yet). The monoliths'
  sculpts are cached; a full run is about 20 min.
- **GPU ms** on a GREEN machine.
- **Round 2**: L'Accueil (Strebelle, organic bronze; OSM area 1.5 m), Zerlina (Dodeigne, 2.10 x 0.90 x 0.80 m on a
  0.65 m base), the Ukkelbeek fountain (verify the position first), then Churchill / Cavell-Depage with the statue
  slot.

**Shared files touched**:

| file | change |
|---|---|
| `viewer/main.js` | +import `addPublicArt`; `heroes.push(() => addPublicArt(...))` after Saint-Augustin (`?art=old` off) |
| `viewer/heroColliders.js`, `viewer/contactAudit.js`, `viewer/drive/collisionTest.js` | `...ART_ROOTS` in the hero lists (+import from `viewer/publicart/artRoots.js`) |
| `viewer/streetlife/cityStreetLife.js`, `streetlife.js`, `streetlifeWorker.js` | option `dropWallPlates` (ART_CLEAR): wall plates on the hidden monolith boxes dropped |
| `viewer/features.js` | row `old("art", ...)` (A/B, Places & assets) |
| `viewer/places.js` | "Public art" group (5 places) |
| `data/publicart/inventory.json`, `docs/PUBLIC_ART.md` | status / verification notes / sizes of the built items; monoliths' position = the island centre |
| `.gitignore` | `models/publicart/work/`, raw glb, previews, audit json (allow file kept) |
