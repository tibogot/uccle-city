# Street surfaces: setts, pavers, slabs, asphalt (branch `claude/paving`, 2026-11-14)

The street ground used to be drawn by live procedural shaders: setts as box-filtered `courses()` in
`viewer/roadPaint.js`, Voronoi-style setts in `viewer/cobbles.js`, procedural 30 cm slabs, and noise asphalt. It now
comes from **baked textures in real units**, one texture array shared by every street material.
`?paving=old` restores the old look; it is the A/B switch.

## 1. What the streets of Uccle are made of

Sources: Google Street View (looked at only, nothing traced, stored or shipped), Wikimedia Commons photos (linked,
not copied), Brussels heritage publications, and our own OSM data (`data/roads/network.json`, `surface=`).

**OSM.** The network has 227 `sett` roads, 178 `paving_stones`, 6 `unhewn_cobblestone`, 4 `cobblestone`,
11 `compacted`, 7 `gravel` and 2,377 `asphalt`. 1,800 roads have no tag; they are drawn as asphalt. Each road is
cut into several pieces per tile; the brief's 528 sett pieces count those.

The longest sett roads are Geleytsbeek, Verrewinkel, Avenue de la Chênaie, Square Coghen, Homborch, Derby, Dolez
(part), Percke, Drève des Gendarmes and Forêt. The unhewn cobbles are Chemin des Silex, Rue du Château d'Eau and
Rue de l'Abreuvoir. "Rue du Puits" is OSM's *Chemin du Puits / Borreweg* (one sett piece).

| Place | What it is (what I saw) | Source |
|---|---|---|
| Rue Geleytsbeek | Blue-grey porphyry setts about 13-16 cm, in rows across the road. The tops are rounded and dark, the joints narrow and dark. Cars park on the setts. | Street View (look only) |
| Avenue de la Chênaie / Eikenboslaan | A sunken lane (*chemin creux*) of big blue-grey pavés in rows across the road, with worn rounded tops and a wooden fence. | Street View |
| Chemin du Crabbegat | A sunken lane of big rounded pavés, about 15-20 x 20-25 cm, sandstone and porphyry mixed, worn and uneven. A walking guide warns it is very uneven for wheelchairs and strollers. It was restored in 2025 ("restauration du pavage"). | [Commons, Sjenghai 2025, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Uccle-Ukkel_-_Chemin_du_Crabbegat-Crabbegatweg_x_Sentier_du_Crabbegat-Crabbegatpad_-_2025-03-20.jpg), [Commons, GdML 2018, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Crabbegat3.jpg), [bx1](https://bx1.be/communes/uccle/lemblematique-chemin-du-crabbegat-renove/) |
| Drève des Renards / Vossendreef | Rectangular setts in straight rows across the road, with dark joints. At night, under the lamps, the wet tops shine. | [Commons, Sjenghai 2024, CC BY 4.0](https://commons.wikimedia.org/wiki/File:Uccle-Ukkel_-_Dr%C3%A8ve_des_Renards-Vossendreef_-_2024-10-29.jpg) |
| Place de Saint-Job | Light grey granite setts, about 11-13 x 13-15 cm, regular, in straight rows. Light joints, with a drain gutter. | Street View, plus the owner's photos (`viewer/plazas.js`) |
| Square Coghen | Small grey setts (about 10 cm) laid in arcs on the carriageway. The sidewalk is older, bigger brown-grey sandstone pavés with mossy joints. Blue-stone kerb. | Street View |
| Avenue De Fré | Asphalt carriageway. The parking strip is setts, the sidewalk small grey concrete pavers. | [Commons, Sjenghai 2026, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Uccle-Ukkel_-_Avenue_De_Fr%C3%A9laan_-_2026-03-19.jpg) |
| Dolezlaan, Verrewinkelstraat | Asphalt with crack seals. Sidewalks of grey concrete pavers (about 22 x 11 cm, stretcher bond), blue-stone kerbs. | Street View |
| Rue de Percke (villa part) | Sidewalk of 30 x 30 cm grey concrete slabs. Driveways of herringbone concrete pavers. Asphalt road. | Street View |
| Brussels centre (comparison) | Small grey setts in rows, blue-stone gutters. | [Commons, -wuppertaler 2022, CC BY 4.0](https://commons.wikimedia.org/wiki/File:BEL_Brussels,_Rue_des_Eperonniers_001.jpg) |

**Sizes on record.** In 1853 the Grand-Place area got Quenast porphyry setts of 16 x 16 to 18 cm, almost square
(*Bruxelles Patrimoines / Erfgoed Brussel* no. 32, articles 3-4). A Brussels order of 1777 asked for white pavés of
at least 12.5 cm wide and 17.5-20 cm deep. Today's porphyry setts come in classes 4/6 to 14/18 cm, ±1 cm.

The old Uccle setts I saw fall in two families:
- small setts of 10-16 cm (porphyry; Saint-Job's light granite);
- big worn pavés of 15-20 x 20-25 cm (Crabbegat, the sunken lanes).

All sit in sand or soil joints of 1-2 cm, with dark joints and rounded, polished tops. The wheel paths are darker
and smoother. Utility trenches are often patched with asphalt.

**Sidewalks.** I saw three kinds:
- grey 30 x 30 cm concrete slabs: the Brussels standard, and Percke;
- grey concrete pavers about 22 x 11 cm: Dolez, Verrewinkel, De Fré;
- old sandstone pavés: Coghen.

All have Belgian blue-stone (*petit granit*) kerbs.

## 2. What each surface uses now, and why

All four layers sit in **one pair of texture arrays**. The albedo array is sRGB. The `nra` array holds the normal
x,y, the roughness and the AO, the library's scan format. Both are KTX2 UASTC, transcoded to BC7 / ASTC, 1024 px,
with mips.

| Layer | Set | Real size | Why this one |
|---|---|---|---|
| 0 asphalt | Texture factory `tf_asphalt_a`: aged AC-10 with porphyry chips (the library's shipped asphalt) | 2.0 m repeat, isotropic | The factory verdict was a tie with the scans. The set was already shipped and is in Brussels colours. |
| 1 setts | CC0 scan, Poly Haven `cobblestone_floor_08` (the library's shipped "cobbles") | 10 rows per repeat | The factory verdict: "scan wins". Its stones are worn, rounded and irregular, with real relief (the factory setts read too regular). Scaled per surface, see below. |
| 2 pavers | **New** texture factory set `tf_pavers_a`: grey concrete pavers 22 x 11 cm, stretcher bond, mixed batches, sand joints with moss, stains (`tools/texturefactory/materials/ground.py` `pavers`, seed 71) | 1.8 m, lattice [8, 16] | Nothing in the library had them. The Street View sidewalks and `paving_stones` roads are these. |
| 3 slabs | Texture factory `tf_paving_concrete_a`: Brussels 30 x 30 cm tiles (the library's shipped one) | 1.8 m (6 x 6) | The factory verdict: "factory wins". |

Where each layer is used:
- **Carriageways** (`roadPaint.js asphaltMaterial`, layer picked per pixel from `aSurf`):
  - **asphalt**: layer 0, plus metre-scale patchiness and polished wheel paths.
  - **sett / cobblestone**: layer 1 with the courses **across** the road (texture v along the station). Each road
    gets its own stone size, rows 14-18 cm (a 1.4-1.8 m repeat), and its own stone, regraded between blue-grey
    porphyry and brown-grey sandstone. The scan's AO darkens the joints (damp, shadowed), the wheel paths are
    polished and darker, and asphalt trench patches (about 22 % of 6 m cells, 1.2-3.7 x 1.4-3 m, ragged) are drawn
    as a box-filtered overlay.
  - **unhewn_cobblestone**: the same scan at a 2.2 m repeat (22 cm rows), browner.
  - **paving_stones**: layer 2.
  - **gravel / compacted**: still procedural.
- **Sidewalks** (`roadPaint.js concreteMaterial`): layer 3 in the kerb frame, so the slabs run along the street,
  regraded a touch darker and greyer as before. The 15 cm blue-stone kerb band, the kerb faces and the aprons stay
  procedural.
- **Measured squares** (`cobbles.js texturedSquare`) and **override plazas** (`plazas.js`): layer 1 at 1.3 m
  (13 cm rows), regraded to Saint-Job's light grey granite, plus big wear / shade patches.
- **Tree pits, kerb faces, markings, rails**: unchanged (procedural; they were already filtered).

**Sampling** (`viewer/streets/paving.js`). The sampler hex-tiles like `materials/antitile.js` and the textured
ground (Mikkelsen 2022):
- structured layers take offsets snapped to whole units and pairs of courses; the asphalt takes free offsets and
  rotation; every hex tile gets a ±5 % tone;
- **one tap per map** where one hex tile owns the pixel (most pixels), three only in the blend zones;
- explicit gradients with anisotropic 8x filtering, so the mips carry the far average;
- specular anti-aliasing: the roughness rises with the normal's variation across the pixel and with the texel
  density, and the normal fades as the density grows.

The normal map uses a cotangent frame built from the screen derivatives, so no tangent attribute is needed.

**Joins.** Nothing in the geometry changed. Kerbs, the front-garden edges and the lawn-strip fix of
claude/gardens2 are untouched (only shading).

## 3. Comparisons with the references (`docs/street-surfaces/`, before | after)

| Shot | What it shows | Against the references |
|---|---|---|
| `geleytsbeek_day.jpg`, `geleytsbeek_golden.jpg` | Rue Geleytsbeek at eye level | **Before:** small flat "tiles" in a perfect grid. **After:** rounded stones in rows across the street with dark joints, like the Street View of the same street (blue-grey stones, cars parked on them). Stones a little bigger than the Street View ones on this road: the per-road size is random in 14-18 cm. |
| `geleytsbeek_close_day.jpg`, `geleytsbeek_close_golden.jpg`, `geleytsbeek_close_day_after.jpg` | The setts at 2-6 m | Domed, worn, polished tops; dark joints catch the shadow; sun and shade across them. Reads like the Crabbegat and Vossendreef photos. |
| `geleytsbeek_car_golden.jpg` | Driver height | The setts keep their texture to the end of the street. No band and no tiling repeat. |
| `stjob_day.jpg`, `stjob_golden.jpg`, `stjob_day_after.jpg` | Place de Saint-Job | **Before:** a honeycomb of soft polygons. **After:** regular light grey setts in straight rows, close to Street View's light grey granite. In golden light they warm up, as the façades do. |
| `stjob_sidewalk_day.jpg`, `stjob_sidewalk_golden.jpg`, `stjob_sidewalk_golden_after.jpg` | Sidewalk, tree pit, kerb | 30 cm slabs with chamfers, stains, and per-slab tone and settling, instead of flat lines. Blue-stone kerb unchanged. |
| `stjob_car_day.jpg`, `stjob_car_golden.jpg` | From a car | Slabs, asphalt, square and markings together. Markings, rails and crossings unchanged. |
| `stjob_car_night.jpg` | Night | The lamp light map and the markings work as before. |
| `montagne_golden.jpg` | Montagne de Saint-Job (OSM paving_stones) | Concrete pavers on the engine strip. The UrbIS base beside it is asphalt: a data mismatch, pre-existing, also before. |

## 4. Flicker (labs/flickerTest.js, strafe 24 frames, step 0.6 mm, threshold 0.06; ppm = blinking pixels per million)

Measured **in one page**: `debug/pavingShots.js ab()` swaps every road mesh between the old and the new material,
so both see the same frame, lights and GPU load.

| View | Old | New |
|---|---|---|
| Geleytsbeek, eye level (golden) | 138 | 93 |
| Geleytsbeek, setts close (golden) | 379 | 397 |
| Geleytsbeek, driver (golden) | 56 | 76 |
| Saint-Job square (midday) | 61 | 51 |
| Saint-Job sidewalk (midday) | 649 | 613 |
| Saint-Job driver (midday) | 473 | 639 |
| Aerial 60 m over Saint-Job (golden; noise from trees / church, not the roads, in both) | 124-333 | 295-338 |
| Far, 120 m up (golden) | 85 | 72 |

So nothing is worse than today, within run-to-run noise. **Bug found and fixed on the way:** the first version blinked
at 13,000-22,000 ppm on sett roads. The per-road stone size came from the interpolated `aPiece` phase, whose float
noise (~1e-4) multiplied by a station of hundreds of metres jittered the texture by whole texels from frame to frame.
The per-road randoms now come from the phase rounded to its 0.01 grid. The sampling coordinate is also kept small
(offset from the hex centre + `fract` of the tile offset).

## 5. Cost

**GPU**, same page, materials alternated 5 rounds by `debug/gpuAB.js alternate()`. Another agent (front gardens) was
using the GPU at the same time; preflight was YELLOW (free memory). The alternation cancels the shared background.

| View | Old | New | Diff |
|---|---|---|---|
| Geleytsbeek street level | 7.54 ms | 7.63 ms | +0.09 (range -0.26 .. +0.46) |
| Geleytsbeek driver | 7.39 ms | 7.36 ms | -0.03 (-0.26 .. +0.26) |
| Saint-Job square, eye level | 17.01 ms | 17.21 ms | +0.20 (-0.73 .. +0.99), heavier background load at the time |
| Saint-Job driver | 15.98 ms | 15.82 ms | -0.16 |
| Aerial over Saint-Job | 15.82 ms | 15.77 ms | -0.05 |

→ **cost-neutral within noise.** The textured road drops the old shader's 3 `courses()`, the grain noise and the
procedural sett / paver / cobble branches. It adds 2 array taps in most pixels (6 in hex blend zones).

**Texture memory.** 10.7 MB on the GPU: 4 layers x 2 maps x 1024² BC7 with mips.

**Download.** 8.8 MB of KTX2:

| Layer | Size |
|---|---|
| asphalt | 2.45 MB |
| setts | 2.65 MB |
| pavers | 1.86 MB |
| slabs | 1.85 MB |

Only the pavers files (1.86 MB) are new in git. The other three are the library's shipped sets, which the city did
not download before (`shipped.js GROUND_HOLD`).

**Boot.** The sets load in parallel with the library's (one shared KTX2 transcoder). In the log: "street surfaces: 4
baked layers, 10.7 MB GPU, ~640 ms", awaited at the same point as the library's sets, before the first tile.

## 6. Switches, tools

- `?paving=old`: the procedural surfaces of before (no street texture is loaded).
- `debug/pavingShots.js`:
  - `go(view)`: the fixed views of this doc;
  - `flicker(view)`;
  - `ab()`: the live old / new material swap for `gpuAB.alternate` and the flicker comparison.
- Texture factory: `python -E -P tools/texturefactory/build.py pavers:a` then `encode.py pavers`, and copy
  `viewer/materials/generated/pavers/a/pavers_1k_{albedo,nra}.ktx2` to `viewer/materials/textures/streets/`.
- Layer manifest: `viewer/materials/textures/streets/streets.json` (files, sizes, lattices, licences, means).

## 7. Left / next

- **Sidewalk kinds per street.** Uccle has slabs, pavers and old sandstone pavés, but the data does not say which
  street has which: all measured sidewalks get the 30 cm slabs. The pavers layer is ready for a per-street choice
  once a source is found (UrbIS does not carry it; an OSM `sidewalk:surface` survey is sparse).
- **Small arched setts** (Square Coghen's fan pattern) and the gutters of blue stone are not modelled.
- **Mismatches between the UrbIS base and OSM.** Where the engine strip and the measured base under it disagree in
  surface (Montagne de Saint-Job: pavers on the strip, asphalt on the base), both show. The thin crack lines along
  the engine strip's triangle edges also show the base (pre-existing; more visible now that the two layers have
  different textures).
- **Wet look.** `uWetness` still drives nothing; the setts would be the first to benefit (damp joints, glossy tops
  after rain, the Vossendreef night photo).
- **`shipped.js GROUND_HOLD`.** If the library ever stops holding asphalt / paving_concrete / cobbles, it would load
  the same files a second time. Share `pavingTextures()` instead.
