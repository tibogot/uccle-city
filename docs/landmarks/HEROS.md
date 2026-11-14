# Square des Héros (Heldensquare), Uccle: the hero place (branch claude/heros, 2026-11-14)

Owner's playtest complaint #7: "Square des Héros done far too cheaply". **On by default; `?heros=old` = the city as
before** (the square drawn as one raised setts plaza with a brick-faced octagonal block in the middle).

## 1. What the square really is (references)

The triangle between Avenue Brugmann (west, trams 4 / 92 and the Héros tram stop), Avenue De Fré (south, the bus
platforms) and the one-way Square des Héros street (north-east, a row of big limes); named Square des Héros since
4 December 1937 (before: Square de Wolvendael). In the middle, on a raised terrace, **the war memorial (Monument aux
morts) by Léandre Grandmoulin, 1925** (engineer Van Hoey, bronze cast by Verbeyst), enlarged in 1948:

- a **truncated obelisk of blue stone** on a pedestal, crowned by a **gilded bronze group: a winged Victory (an angel,
  or the Fatherland) holding a dying nude soldier**, her left arm raised high, two great wings, his arm stretched out;
- on the front (south, toward the steps and the Wolvendael park): a **bas-relief of Saint Peter** (Uccle's patron) over
  the inscription "ÉRIGÉ PAR LA COMMUNE D'UCCLE À LA MÉMOIRE DE SES ENFANTS MORTS POUR LA PATRIE 1914-1918"; the names
  of the 138 dead of 1914-1918 on the other faces;
- **1948**: an **octagonal enclosure of blue-stone benches** carrying the names of the 193 dead of 1940-1945 ("1940-1945"
  carved in the front seat), **rose bouquets and small animals (a frog...) carved at the corners**, a black
  **wrought-iron railing with a row of rings** on the wall top, ornamental grasses / flowers in the bed;
- the memorial on a **low round platform** on a **dolomite** terrace ~2 m above Avenue De Fré, **12 stone steps with
  green handrails** down to De Fré (south), **4 steps** to the Brugmann sidewalk (west), **lawns** with grassy banks
  round it, **dolomite paths** with crisp lawn edges; big **Crimean limes** (Tilia x euchlora, 15-22 m) along the
  Square des Héros street and on Brugmann; dark-green Brussels litter bins at the path mouths.

| ref | source | what it showed |
|---|---|---|
| H1 | heritage.uccle.be "Monument aux Morts" IMG_0059 | the bronze group from the front, below: the pose, the wings, the cap's two steps, the rock |
| H2 | heritage.uccle.be DSC_4594 (summer 2025) | the whole memorial from the south-east: round platform, octagonal benches, railing, grasses, obelisk proportions, dolomite, lawn mound, lamps |
| H3 | heritage.uccle.be IMG_0040 | a bench: the names' panel (Art Deco capitals, dot separators), "1940-1945" on the seat, the railing with rings, rose bouquets |
| H4 | heritage.uccle.be DSC_4602 | a corner: the frog on its block, the rose bouquet, the panels |
| C1 | Commons "Square Héros Bxl 01.jpg" | from the foot of the 12 steps: handrails, grass banks, the memorial gilded (2010s) |
| C2 | Commons "Uccle-Ukkel - Héros-Helden x De Fré x Wolvendael x Rouge-Rode - 2025-11-05.jpg" | the dolomite paths, lawns, the mound, bins, an ornate green lamp column, the bus platforms |
| C3 | Commons "STIB 8001 ... 98 Héros-Ceria 2014" | the Square des Héros street under the limes |
| text | heritage.uccle.be, fr.wikipedia "Square des Héros (Uccle)", be-monumen.be, Brussels heritage inventory | sculptor, dates, materials, inscription, the 1948 enlargement |

Google Maps aerial / Street View were not used (the photos above covered every part); nothing traced, stored or
shipped: the thumbnails were looked at in a temporary folder and deleted.

**Data**: OSM (park w23542633, lawns w1154611804/08/09, dolomite footways `surface=compacted`, steps w1154611802 (12,
handrail) / w1154611806 (4), the memorial's outline = flowerbed multipolygon r15607183: octagonal retaining wall
w225781827 (circumradius 3.04 m) + obelisk base w1154611811 (2.38 x 2.25 m)), the UrbIS DTM / DSM 2021 0.5 m (terrace
50.46-50.60 m; the obelisk's top 57.34 m in the DSM), UrbIS StreetSurfaces, the Bruxelles Mobilité tree inventory
(21 trees: 13 Tilia x euchlora 16-22 m on the Square des Héros street, 4 on Brugmann, sycamores across De Fré, a young
Atlas cedar). `tools/heros_measure.py` -> `models/heros/site.json`.

## 2. What was wrong (the city before)

| | before (`?heros=old`) | real |
|---|---|---|
| ground | the whole triangle one **raised setts plaza** (UrbIS maps the square as ONE street surface, class "square": `be/id/streetsurface/40047`) | lawns, banks, dolomite paths, a raised terrace |
| memorial | **a 1.35 m octagonal UrbIS block** (buildingsolid 534309) with a brick façade | obelisk + gilded bronze group + bench enclosure, ~10 m tall |
| steps | none (the terrace slope was smoothed into the plaza) | 12 steps with handrails + 4 steps |
| paths | none | dolomite, crisp lawn edges |

`docs/landmarks/heros/before_*.jpg` / `after_*.jpg` (same views: `debug/herosViews.js`).

## 3. What was built

**Ground (the biggest gap).** `data/overrides.json` "parkSquares" (written by `tools/heros_measure.py`): the UrbIS square
surface MINUS the OSM park, cut into 4 pieces without holes, drawn as sidewalk paving (the paved strip round the park
stays); the tile worker swaps the tile's clipped surface for them (`viewer/heros/herosSurface.js applyParkSquares`).
The park itself is now terrain (UrbIS DTM, the real 2 m terrace and its banks) with the city's lawn, and on top a
**dolomite mesh** (`viewer/heros/herosGround.js`): park minus lawns minus the platform minus the steps (305 m²), draped on
the drawn terrain + 3 cm, 0.5 m triangles, a 12 cm skirt down every edge, the ground textures' gravel scan sampled
twice (no repeat), a greener rim at the lawn, lamp-pool lit. The park's OSM path lines are left out of the land-cover
raster (else a blurred 1.6 m gravel band crossed the lawns). The terrain is carved under both flights
(`carveFlights`: 35 cm under the nosing line inside, no higher than the cheek kerbs beside).

**The memorial + the steps** (`tools/blender/heros.py`, Blender 5.0 headless, everything scripted; frame = the OSM
octagon's centroid, front = south):
- round platform r 4.05 (64 cut stones), one low step;
- the 1948 enclosure on the OSM octagon: 8 benches (seat 0.45, 0.42 deep) with recessed names' panels as backs,
  "1940-1945" lettered in the front seat, corner blocks with an animal (frog / tortoise) and a pilaster with a bouquet
  of 13 roses, ONE octagonal coping ring, the black railing (square posts with ball finials, three rails as closed
  rings, square bars every 12 cm, a row of rings), soil bed with 34 clumps of ornamental grass (closed wedge blades);
- the obelisk on the OSM base: pedestal, moulded plinth, tapering shaft (1.6 x 1.5 -> 1.26 x 1.16 m, 3.7 m), the
  Saint Peter relief plaque (robe, head, halo, keys), the lettered panels, a cornice slab + upper block (top 57.13 m;
  DSM 57.34);
- **the bronze group** (`tools/blender/heros_statue.py`, the method of the Stalle Virgin: metaball bodies on posed
  skeletons, sculpted heads and hair, script-sculpted robe / loincloth / scarf, feathered wings, a rock; voxel-remeshed
  into one cast, 864 k tris -> `tools/heros_statue_pack.mjs` meshoptimizer 20 k (0.9 mm) / far 900): 3.81 m, top
  ~60.9 m (~10.4 m over the terrace, as the photos' proportions);
- the 12 south steps (OSM line, risers 0.18 m, treads 0.42 m, 3.0 m wide: blue-stone nosings, setts treads, cheek
  kerbs, green handrails both sides on capped posts) and the 4 west steps (2.4 m, no handrail, as OSM);
- named slots, no baked colour: `stone_blue` (the library's shipped blue-stone scan, lifted to the weathered ash grey of
  the photos; lettered faces read the lettering atlas), `bronze_gilt` (gold on raised parts, dark bronze in the hollows),
  `cast_iron_black`, `cast_iron_green`, `soil_bed`, `plant_grass`, `cobbles` (the streets' setts scan);
- Cycles AO lightmap (2048², LOD0 + far) + per-vertex AO of the thin parts; **two scripted LODs** (LOD0 43,253 tris,
  far 2,216: no bars / rings / roses / animals / blades, the bronze at 900 tris), packed with `hero_pack.mjs --nolod`
  (a meshopt LOD1 failed the audit: 1,545 streaks), dithered hand-over at 90 m ± 15.
- **Lettering** (`tools/heros_letters.py` -> `textures/heros/heros_letters.png`, 244 KB): the front inscription and
  "1940-1945" are the real texts; **the names' panels carry PLACEHOLDER rows of random letters** (the real lists of 138 +
  193 names are not in our data). See "left".

**In the city**: `viewer/heros/herosCity.js` (`addHeros`, called before the first tile: hides solid 534309, hands the
worker its carves + path ids), `herosModel.js` (loader, slot materials), `herosGround.js`, `herosSurface.js` (worker).

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/heros_measure.py           # site.json, site_dtm, overrides "parkSquares"
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros_statue.py -- models/heros [--preview dir]
node tools/heros_statue_pack.mjs models/heros 20000 0.01
python tools/heros_letters.py
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros.py -- models/heros [--no-bake] [--previews]
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/heros_measure.py           # again: the dolomite minus the steps' footprints (heros.json)
node tools/hero_pack.mjs models/heros/heros.raw.glb models/heros/heros.glb --nolod --name Heros
node tools/build_worker.mjs                                                         # the tile worker bundle (tileData.js changed)
```

## 4. Comparison with the references (`after_*.jpg` vs the photos)

- **From the foot of the 12 steps (after_steps vs C1)**: the same composition: the flight between grass banks with green
  handrails both sides, the enclosure with its railing at the top, the obelisk with the relief plaque, the gilded group
  with the raised wing on the right and the soldier's arm out to the left. Differences: C1's treads are rough rubble
  stones (ours: setts with stone nosings); the real obelisk reads a little stouter; C1 has flowers in the bed (ours:
  the grasses of the 2025 photos).
- **The enclosure (after_enclosure vs H2 / H3 / H4)**: round platform, octagonal benches with the names' backs, rose
  bouquets and animals at the corners, the black railing with rings, grasses inside: matches. Differences: our roses and
  animals are simple carved forms (H4's frog and bouquet are far more detailed); the names are placeholders; the scan's
  ashlar coursing (0.25 m) is finer than the real large blocks.
- **The bronze (vs H1)**: a winged woman upright, left arm raised with an open hand, the great wing behind it, the nude
  soldier sinking against her right side with his arm stretched out, a rock base, gilded: the silhouette and the reading
  match from the ground. Differences: our figures are smoother and stiffer (no anatomy, simpler drapery), the soldier is
  more upright than in H1, the second wing is lower and less feathered.
- **The square (after_defre / after_herosst vs C2 / C3)**: lawns with the raised terrace and its banks, dolomite paths
  from the corners to the monument, the lime row on the Square des Héros street, the bus platforms on De Fré. Differences:
  C2's ornate green lamp column and the two bins at the path mouth are not placed (no data; see left); the lawn is the
  city's lawn shader (darker than C2's).
- **Tram stop (after_tram)**: unchanged (the stops kit's platforms and shelters on Brugmann); the memorial now shows behind
  the platforms instead of a brick block.

## 5. Checks

- **Mesh audit** (tools/mesh_audit, `models/heros/audit/*/*.md`): raw LOD0 43,253 tris **0 blocking** (4 allowed in
  `heros.allow.json`: three 0.6-0.8 cm² folds and one 8 mm slit in the bronze, 8.4-9.7 m up, with reasons), raw far 2,216
  **0**, packed LOD0 **0**, packed far **0**. Fixed on the way (from 1004 blocking): per-side coping boxes and rails
  overlapping at the octagon's corners (now closed rings), coincident roses, doubled grass blades (now closed wedges),
  open handrail posts (capped), shallow-angle smoothing on the cheek kerbs (stone sharp above 2.5 deg), meshopt slivers
  on the bronze (stretched triangles flat-shaded).
- **Contact (JOINS)** `await viewer.contactAudit("heros")`: 43,253 tris, **0 floating at the ground except one 0.2 m
  edge** at the south flight's top landing corner (the landing 5 cm proud of the dolomite; gap <= 8 cm) and 10
  "overhang" items that are the bench seats' 5 cm projection 0.36 m over the model's own platform (the audit compares
  with the terrain only). The platform goes 0.35 m into the terrace, the steps' blocks 0.5 m and the cheek kerbs 0.7 m
  into the bank, the pedestal 0.4 m into the bed; the dolomite has its 12 cm skirt.
- **Colliders** (from LOD0, `heros` in HERO_ROOTS / collision test / contact audit / falcon proxies): 43 k triangles for
  walk / third person (treads climbable, railing / benches / obelisk / handrails stop), 55 car blocks. `G` shows them.
  `viewer.collisionTest("E4", {drive, walk})`: identical to `?heros=old` (static 8 invisible / 16 missing, drive 0 / 0 /
  0 / 0 / 0, walk 0 invisible, 3 pass-through + 1 float all 300 m away at (-501, -171)); nothing new near the square.
- **LOD hand-over** (`debug/herosFlight.js`, 400 m -> 12 m -> 400 m, 12 s each way, twice): **0 pops**, states
  01@396 -> 11@105 -> 10@75 -> 11@75 -> 01@105; median 17 ms, p99 33.7 ms (RED machine).

## 6. Cost

`renderer.info`, the model + dolomite on minus off at the same view (main + shadow passes), median of 10:

| view | LOD | draws | triangles |
|---|---|---|---|
| foot of the steps (1 m from the box) | LOD0 | +15 | +90 k |
| 20 m, eye height | LOD0 | +16 | +109 k |
| 130 m, 40 m up | far | +8 | +11 k |

(7 slots LOD0 / 5 far, each + its shadow, + the dolomite 1 + shadow-receiving only.) Files: `heros.glb` 1.56 MB
(meshopt), `heros_ao.png` 2.1 MB, lettering 244 KB, dolomite 10.6 k tris built once on the three tiles. Model load
~0.7 s, shaders in the background through the precompile queue.
**GPU ms: not claimed.** `tools/perf/preflight.ps1` was **RED** (0.6 GB free, Chrome 8.2 GB, GPU 85 % busy at rest,
power cap: another agent rendering). Indicative `gpuAB.alternate` (8 rounds at 20 m): +0.2 ms mean, range -3.9..+3.4:
noise. Re-measure on GREEN.

## 7. Switches, files

- `?heros=old`: the city as before (setts plaza, the UrbIS block, no carve, paths in the land cover).
- `debug/herosViews.js` (the fixed views), `debug/herosFlight.js` (LOD flight); `window.heros` (model, root, state,
  ground()).

**Shared files touched (careful merge):**

| file | change |
|---|---|
| `viewer/main.js` | +import `addHeros`; consts `HEROS` (`?heros=old`), `HEROS_TILE`; tile entry `heros: HEROS ? HEROS_TILE : null`; `heroes.push(() => addHeros(...))` after the Russian church |
| `viewer/tileData.js` (+ `viewer/tileWorker.bundle.js` rebuilt) | +import from `./heros/herosSurface.js`; `applyParkSquares` after `applyRoadOverrides`; `carveFlights` after the pond beds; `landCoverData(withoutLines(feats, entry.heros?.paths), ...)` |
| `data/overrides.json` | + `"parkSquares"` (one entry, 4 pieces) |
| `viewer/heroColliders.js`, `viewer/drive/collisionTest.js`, `viewer/contactAudit.js`, `viewer/falconFlight/cityFlyer.js` | + `"heros"` in the hero lists |
| `.gitignore` | `models/heros/statue_raw.json`, `models/heros/*.raw.glb`, `models/heros/audit/*/*.json` |

## 8. Left / weak spots

- **The names**: placeholder random-letter rows on the shaft and the benches; typeset the real 138 + 193 names (the
  commune's / Ucclensia's lists) into `tools/heros_letters.py`.
- **The bronze** is a credible silhouette, not Grandmoulin's sculpture: anatomy, drapery folds, feathers are simplified;
  the soldier should sag lower and further back (H1).
- **Lamps and bins**: C2 shows an ornate green cast-iron lamp column and two Brussels bins at the north-east path mouth;
  the city lamp kit only places swan-neck lamps along roads and OSM has no lamp / bin points here: not placed (would need
  a lamp-site hook in `viewer/lamps.js` and the column type modelled).
- The obelisk's stone: the library scan's 0.25 m ashlar coursing is finer than the real big blocks; the stone lift is a
  per-model multiply (3.8x) rather than a proper "weathered blue stone" library entry.
- Rose bouquets / animals are coarse (fine at 5+ m, crude up close).
- The terrain under the steps is carved on the 1 m grid; the cheek kerbs' outer faces show 0.2-0.5 m above the bank at the
  top of the south flight.
- The lawn is the city's lawn (darker than the photos); no flower beds.
- GPU ms on a GREEN machine.
