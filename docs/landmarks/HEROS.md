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
  "1940-1945" lettered in the front seat, corner blocks with an animal (frog / tortoise) and a pilaster carrying a carved
  bouquet (ONE smooth carved form: a fluted sheaf flaring into an egg of rose heads in four staggered tiers of seven,
  each with a spiral petal groove, as the clustered bouquets of IMG_0040 / DSC_4602; the first version was a pile of
  loose blobs that read as mushrooms), ONE octagonal coping ring, the black railing (square posts with ball finials, three rails as closed
  rings, square bars every 12 cm, a row of rings), soil bed with 34 clumps of ornamental grass (closed wedge blades);
- the obelisk on the OSM base: pedestal, moulded plinth, tapering shaft (1.6 x 1.5 -> 1.26 x 1.16 m, 3.7 m), the
  Saint Peter relief plaque (robe, head, halo, keys), the lettered panels, a cornice slab + upper block (top 57.13 m;
  DSM 57.34);
- **the bronze group** (`tools/blender/heros_statue.py`, the method of the Stalle Virgin: metaball bodies on posed
  skeletons, sculpted heads and hair, script-sculpted robe / loincloth / scarf, feathered wings, a rock; voxel-remeshed
  into one cast, 864 k tris -> `tools/heros_statue_pack.mjs` meshoptimizer 20 k (0.9 mm) / far 900): 3.81 m, top
  ~60.9 m (~10.4 m over the terrace, as the photos' proportions);
- the 12 south steps (OSM line, risers 0.18 m, treads 0.42 m, 3.0 m wide: blue stone treads, risers and nosings (the
  photos: grey stone; the first version used the streets' dark setts and the AO bake buried the risers under the uncarved
  DTM: they read black; the bake's ground is now carved as the city's), cheek kerbs, green handrails both sides on capped
  posts) and the 4 west steps (2.4 m, no handrail, as OSM);
- named slots, no baked colour: `stone_blue` (the library's shipped blue-stone scan, lifted to the weathered ash grey of
  the photos; lettered faces read the lettering atlas), `bronze_gilt` (gold on raised parts, dark bronze in the hollows),
  `cast_iron_black`, `cast_iron_green`, `soil_bed`, `plant_grass`, `cobbles` (the streets' setts scan);
- Cycles AO lightmap (2048², LOD0 + far) + per-vertex AO of the thin parts; **two scripted LODs** (LOD0 43,253 tris,
  far 2,216: no bars / rings / roses / animals / blades, the bronze at 900 tris), packed with `hero_pack.mjs --nolod`
  (a meshopt LOD1 failed the audit: 1,545 streaks), dithered hand-over at 90 m ± 15.
- **Lettering** (`tools/heros_letters.py` -> `textures/heros/heros_letters.png`, 30 KB): ONLY the real texts: the front
  inscription with "1914 - 1918", and "1940-1945" on the front seat. Every lettered face is written "read from in front"
  in `letters_face` (s along the reader's right = Z x outward normal, checked; the glTF exporter's v flip compensated),
  checked in the city render (`after_front.jpg`, `after_bench.jpg`).
- **The names' panels are UNINSCRIBED** (the 138 names of 1914-1918 on the shaft's three other faces, the 193 of
  1940-1945 on the benches' backs): plain recessed stone. Searched (2026-11-14): heritage.uccle.be, the Brussels heritage
  inventory, bel-memorial.org, Ucclensia. The only list found is Ucclensia 156 (1995, bel-memorial.org): 251 Uccle dead of
  1940-1945 compiled by a parish from civil records: NOT a transcription of the monument (193 names, its own layout), and
  nothing for 1914-1918 (Ucclensia 251 announces a revised survey). One bench panel is legible in photo IMG_0040, not the
  rest. So no names are drawn rather than invented or approximated.

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
  bouquets and animals at the corners, the black railing with rings, grasses inside: matches. Differences: our bouquets and
  animals are simpler carved forms than H4's; the names' panels are blank (no transcription, see above); the scan's
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

- **Mesh audit** (tools/mesh_audit, `models/heros/audit/*/*.md`; re-run after the review fixes): raw LOD0 56,949 tris **0 blocking** (4 allowed in
  `heros.allow.json`: three 0.6-0.8 cm² folds and one 8 mm slit in the bronze, 8.4-9.7 m up, with reasons), raw far 2,216
  **0**, packed LOD0 **0**, packed far **0**. Fixed on the way (from 1004 blocking): per-side coping boxes and rails
  overlapping at the octagon's corners (now closed rings), coincident roses, doubled grass blades (now closed wedges),
  open handrail posts (capped), shallow-angle smoothing on the cheek kerbs (stone sharp above 2.5 deg), meshopt slivers
  on the bronze (stretched triangles flat-shaded).
- **Contact (JOINS)** `await viewer.contactAudit("heros")`: 56,949 tris, **0 floating at the ground except one 0.2 m
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

- **The names**: the panels are blank; when a reliable transcription of the monument's 138 + 193 names turns up (the
  commune, the Cercle d'histoire d'Uccle), typeset it in `tools/heros_letters.py` (cells + lettered quads in heros.py).
- **The bronze** is a credible silhouette, not Grandmoulin's sculpture: anatomy, drapery folds, feathers are simplified;
  the soldier should sag lower and further back (H1).
- **Lamps and bins**: C2 shows an ornate green cast-iron lamp column and two Brussels bins at the north-east path mouth;
  the city lamp kit only places swan-neck lamps along roads and OSM has no lamp / bin points here: not placed (would need
  a lamp-site hook in `viewer/lamps.js` and the column type modelled).
- The obelisk's stone: the library scan's 0.25 m ashlar coursing is finer than the real big blocks; the stone lift is a
  per-model multiply (3.8x) rather than a proper "weathered blue stone" library entry.
- The animals are still simple blob forms (fine at 5+ m, crude up close); the bouquets are clean but stylised.
- The terrain under the steps is carved on the 1 m grid; the cheek kerbs' outer faces show 0.2-0.5 m above the bank at the
  top of the south flight.
- The lawn is the city's lawn (darker than the photos); no flower beds.
- GPU ms on a GREEN machine.

## 9. Review round (2026-11-14, coordinator)

1. Mirrored "1914-1918" (read "8161-4161"): `letters_face` now orders every lettered quad for the reader (right = Z x
   outward normal, asserted outward) and writes v as 1 - v (the glTF exporter flips v); checked from in front in the city:
   `after_front.jpg` (the inscription, "1914 - 1918"), `after_bench.jpg` ("1940-1945").
2. No placeholder names: uninscribed panels (section 3), the atlas holds only the real texts.
3. Treads / risers: blue stone; the AO bake's ground carved under the flights (the risers were buried in it): `after_treads.jpg`.
4. Bouquets remodelled as one carved form: `after_enclosure.jpg`.
Not done (optional): the south flight's cheek kerbs still stand 0.2-0.5 m proud of the bank at its top (the bank drops
beside the terrace edge); the contact audit has the same 1 floating 0.2 m edge as before.
Mesh audit: raw / packed LOD0 and far **0 blocking**. Contact: 56,949 tris, 1 floating (0.2 m, the landing corner), 10
overhangs = the seats over the platform. LOD0 grew 43 k -> 57 k triangles (the bouquets: 8 x 2 k).

## 10. Round 3 (branch claude/heros3, 2026-11-14): the owner's photos

Inputs: the owner's two photos of the real monument (the front close-up with the inscription; the whole monument from the
foot of the 12 steps: looked at, never stored or shipped), Commons C2 (2025, the Brugmann path mouth: the ornate lamp
column, the two bins, the obelisk's west face and the corner bouquets), the round 2 references. The owner's decisions
(docs/TODO.md 2026-11-14): the statue becomes a SWAPPABLE slot (his own model, made in Tripo AI); our bronze itself is NOT
re-sculpted now (it reads well from afar); the names come later from the commune archives.

### 10.1 The bronze group: a swappable slot

`models/heros/statue_slot.json` is always there. `"glb": null` = our scripted bronze (inside heros.glb, unchanged:
3.81 m); when a model has gone through the pipeline it names `statue.glb` and the city shows that instead
(`viewer/heros/herosStatue.js`), our bronze + rock primitive left out. **`?herostatue=ours` forces ours** (A/B).

**The pipeline** (any source: Tripo's .glb / .gltf, .obj, .fbx, .ply, .stl, or our statue_raw.json):

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros_statue_slot.py -- <source>
    [--height 4.5] [--yaw 0] [--rock 0.36] [--lod 26000,7000,1600] [--tex 2048] [--keep-scale]
```

1. import, join, apply transforms, triangulate, turn by `--yaw`;
2. normalise: metres, scaled to `--height`, the pivot = the centre of the base's footprint (the lowest 8 % of the
   height) at the origin, sunk 2 cm (the base sits INTO the cap: JOINS);
3. LOD0 = the source simplified by meshoptimizer (`tools/heros_statue_lods.mjs`, the project's rule: never Blender's
   decimate) to ~26 k triangles; unwrapped (smart projection run on a smoothed copy of the same topology, so the islands
   follow limbs / wing panels / robe folds instead of crumbling on a remeshed surface, then average island scale + pack);
   the SOURCE's detail baked onto it with Cycles: a tangent-space **normal map** (2048², selected-to-active, cage 1.2 cm)
   and **ambient occlusion** (1024², LOD0 on its own);
4. LOD1 (~7 k) and LOD2 (~1.6 k, meshopt "Permissive": it may collapse across UV seams) = LOD0 simplified again, keeping
   LOD0's UVs: the same two maps serve all three;
5. `--rock`: the faces entirely under that height become the `stone_rock` part (grey stone: the photos show a stone rock,
   not gilded);
6. writes `statue.glb` (meshopt-packed by `tools/hero_pack.mjs --nolod`), `statue_normal.png`, `statue_ao.png`,
   `statue_slot.json`.

**The contract of statue.glb** (what the city expects, whatever made it):

| | |
|---|---|
| nodes | `Statue_LOD0`, `Statue_LOD1`, `Statue_LOD2` (a missing level reuses the one above) |
| frame | metres, **+Y up**, the group's **front toward +Z** (glTF's front; the city turns it to the monument's front, south, toward the 12 steps) |
| pivot | (0, 0, 0) = the centre of the statue's base standing on the obelisk's cap (the rock's foot), the base 2 cm below it |
| height | **4.5 m** expected from the foot of the rock to the tip of the raised wing (measured on the owner's photos: 1.0-1.15 x the visible shaft, ~3.0-3.2 x the shaft's top width; Commons C2 agrees within 5 %): 4.2-4.8 m is plausible. Our scripted bronze is 3.81 m (kept as it is) |
| placement | the cap top, `heros.json statue_slot.base_local` = (0, 7.15, 0) in the monument's frame (57.15 m TAW); the cap is 1.40 x 1.30 m |
| triangles | LOD0 20-30 k with the normal map, LOD1 ~7 k, LOD2 ~1.6 k |
| attributes | POSITION, NORMAL, TANGENT, TEXCOORD_0; no colour, no texture inside |
| materials | by NAME: `bronze_gilt` (everything bronze) and optionally `stone_rock` (a name containing rock / stone); our materials replace them: the bronze of `herosModel.js bronzeMaterial` (three tones: dark brown-black in the folds and hollows from the AO map, the brown bronze body, gold on the raised parts facing the sky, a little verdigris in the deepest folds; the normal map on top), the rock in the grey of our stone |
| LOD distances | `statue_slot.json lod_m` [40, 110] m with dithered bands `band_m` [6, 12] m (lodFade.js through setLodFades: no pop) |
| colliders | LOD2 as an invisible mesh inside the monument's `heros_lod0` group (heroColliders.js / contactAudit.js read it) |

Tested end to end with OUR statue_raw.json (864 k triangles) as the source: 26,000 / 6,990 / 1,590 triangles, 0.8 MB +
2.9 MB normal + 0.9 MB AO, 21 s on half the CPU; `slot_test_*.jpg`. That test output was deleted again (the slot is empty:
our bronze shows) - the owner's model goes through the same command.

### 10.2 The inscription, against the owner's front photo

`tools/heros_letters.py` now lays the front out as the photo shows it, on the stones it is cut in: the FRENCH stone
"ERIGE / PAR LA COMMUNE / D'UCCLE / A LA MEMOIRE / DE SES ENFANTS / MORTS POUR LA PATRIE" with "1914-1918" larger (9 cm
capitals against 6.2) and bolder (the stroke widened) at its foot, a bed joint, the DUTCH stone "OPGERICHT / DOOR DE
GEMEENTE UKKEL / TER GEDACHTENIS / HARER KINDEREN / VOOR 'T VADERLAND / GESNEUVELD" (6.4 cm). No accents (the stone has
none). Every line's height in its stone, the cap heights and the longest line's width (MORTS POUR LA PATRIE 0.78 of the
face, DOOR DE GEMEENTE UKKEL 0.87, 1914-1918 0.37) are fractions measured on the photo. Centred lines, sans-serif
capitals (Century Gothic Bold: round O's, the G as a C with a short bar, as cut).
- **Incised**: the stone material reads the mask's slope as a 4.5 mm V-cut (surface-gradient bump, only on the lettered
  faces) on top of the darkening; the mask is blurred 1.1 px for that slope.
- **The shaft's four stones** (the photos: a plain top stone, the French one, the Dutch one, the relief stone) are now real
  stones: 1.6 cm V-groove bed joints all round (`JOINTS`), each stone face its own quad. The shaft is stouter (1.68 x 1.58 m
  at the foot, 1.48 x 1.38 at the top, 4.25 m: photo proportions 2.7 : 1, taper 0.89), its moulded plinth just over the
  railing's top, a thin cap slab (cap top 57.15 m; DSM 57.34).
- Lettered faces now carry METRIC planar UVs (the tapered faces had corner-pinned UVs that sheared one triangle of each:
  slanted letters).

### 10.3 The names: ready to engrave

`models/heros/names.json` (EMPTY; never invented names): `"1914-1918"` (138, spread in order over the shaft's west, back
and east faces, upper then lower stone), `"1940-1945"` (193, over the eight bench backs from the front, turning west),
`"panels"` (a list for one named panel). Every names panel is ALREADY a lettered face in the model (cells
`shaft_<w|n|e>_<1|2>`, `bench_0..7`: heros.json `lettering.cells`), so engraving the names is only:

```
python tools/heros_letters.py          # lays the names out in centred columns (1-5 columns, the tallest capitals that fit, <= 4.5 cm)
```

(no Blender run, no repack). A cell with no names is absent from `heros_letters.json` and reads as plain stone. The atlas
packs the tallest cells first; the viewer uploads it as ONE 8-bit channel (R8 with mipmaps: 2048 x 2432 with every panel
filled = 5 MB + mips instead of 20 MB RGBA). Tested locally with clearly fake strings ("PLACEHOLDER 001", "TEST NAME 001":
`names_test_shaft_west.jpg`, `names_test_bench.jpg`: 2 columns x 12 rows of 4.5 cm capitals per shaft stone, 4 x 7 of
3.3 cm per bench back), then the empty file restored.

### 10.4 The rest of the list

- **Railing** (the owner's photo, C2): dark green painted iron (cast_iron_green), round bars every 11 cm rising 8 cm over
  the top rail to square spear tips, posts with a ball finial on a neck at every corner and mid-side, top + bottom rails as
  closed rings (21 mm thick: the bars end inside them), 0.62 m (was black, 0.74 m, with a row of rings: the 2025 railing
  has plain spear bars).
- **Flower bed** (the owner's photo: orange / yellow marigolds, red begonias): ~95 overlapping low leafy domes, smooth
  shaded, dotted with round 2 cm flowers by the shader (seen from above) and two 3D heads each; far: fewer domes, no heads.
- **Saint Peter relief**: a 0.66 x 0.78 m panel sunk 3 cm into the lowest stone, the relief a 56 x 66 height field
  (1.2 cm cells, 7.3 k triangles) of carved "pillow" forms: the saint seated before a throne back, halo, bearded head,
  mantle and robe with folds to the feet on a footstool, the right arm bent holding up the two crossed keys, the left hand
  on a book on the knee (was a flat silhouette).
- **Steps** (the owner's photo: rough worn mossy stone): treads dip 4-12 mm toward a 2.5 cm worn chamfered nosing; the
  stone material darkens the steps to a brown-grey, coursed rubble (bending courses, random stones, dark joints) on the
  risers and the cheek kerbs, moss by noise in the joints and on the risers; six handrail posts a side (was three).
- **Corner pieces** (the "lion-like" blocks beside the top of the steps in the owner's photo = the carved rose bouquets,
  also in C2): the bouquets now sit ON the low corner pedestals (six front and side corners), crowns near the coping, as
  the photos; the frog and the tortoise on the two back corners.
- **The lawn**: a layer on the DRAWN terrain's own triangles clipped to the three OSM lawns (5.4 k triangles, +1 cm, the
  terrain's normals): the ground scan's lawn layer lifted to the photos' fresh mown green (`lawnLook.tone`);
  `?heroslawn=city` keeps the city's lawn. (A free drape sank under the simplified terrain in polygonal patches: the
  terrain mesh is the 1 m grid simplified, so the layer is built from the mesh itself.)
- **South cheek kerbs (JOINS)**: the bank beside both flights is built UP to the kerbs (`carve.fill`: up to 6 cm under the
  kerb top, flat 0.3 m, then down at the bank's slope, beside the flight only), in the tile worker (herosSurface.js
  carveFlights) and in the AO bake's ground: the kerbs no longer stand 0.2-0.5 m proud (`after_kerb.jpg`).
- **Lamp column + bin + floodlight**: at the top of the west flight (C2): the ornate green column (moulded base, fluted
  drum and shaft, collar, hexagonal lantern under a domed roof, the glass glowing at night only: emissive, no light) on the
  north side and ONE Brussels bin (ribbed green drum, red band, domed hood) on the south side (the city's furniture already
  stands a round bin in the middle of this path mouth: the two read as C2's pair); the monument's floodlight (a grey lamp box
  on a short post, right of the 12 steps' top: the owner's photo), tilted at the obelisk, emissive glass only.
- Our bronze: NOT re-sculpted (the owner); its rock is now grey stone (the photos), and the shared bronze material is
  browner, with gold only on the raised, sky-facing parts (the owner's front photo).

### 10.5 Checks and cost

- Mesh audit (`models/heros/audit`): raw LOD0 61,257 triangles **0 blocking**, raw far 3,242 **0**, packed LOD0 **0**,
  packed far **0**. Fixed on the way: rails / posts smoothed at the octagon's corners (streaks: round shading now only on
  lathed parts, stretched faces flat), bars ending on the rail faces (rails thickened), coplanar flower-dome bottoms (each
  at its own depth). Three new allow entries: a flower head touching a neighbouring dome (0.5 cm2, hidden among flowers).
- Contact audit `viewer.contactAudit("heros")`: 61,257 tris, **1 floating (the same 0.2 m landing corner as round 2)**,
  10 overhangs (the seats over the platform, as before).
- LOD flight (`debug/herosFlight.js`, 400 -> 12 -> 400 m): **0 pops**, states 01@395 11@105 10@75 11@76 01@105.
- Cost, `renderer.info` model + ground on minus off, median of 10 (main + shadow passes): foot of the steps **+12 draws,
  +136 k triangles**; 20 m **+10 / +132 k**; 158 m (far) **+12 / +19 k**. LOD0 61 k (was 57 k), far 3.2 k; the lawn layer
  5.4 k once. GLB 2.0 MB, AO 1.9 MB, lettering 117 KB (R8 on the GPU). GPU ms not claimed: preflight RED.
- No console errors; `?heros=old` unchanged.
- Shared files touched this round: `viewer/tileWorker.bundle.js` (rebuilt: herosSurface.js changed), `.gitignore`
  (`models/heros/statue_work/`), `docs/TODO.md`. Everything else is under viewer/heros/, tools/, models/heros/, textures/heros/, debug/herosViews.js.

Images (`docs/landmarks/heros3/`, our renders only: the owner's photos are not stored): `before_* / after_*` from the same
cameras (golden hour, the city's default): `steps` (the owner's angle from the foot of the 12 steps), `front` (his front
close-up angle, portrait), `enclosure`, `relief`, `kerb`, `brugmann`, `aerial`; `pair_front_before_after.jpg`,
`pair_steps_before_after.jpg`; midday: `after_midday_photo46 / photo47 / insc / relief / bed / kerb / mouth`;
`slot_test_front / statue` (the slot pipeline on our own statue), `names_test_*` (the names path with fake strings).
Views: `debug/herosViews.js` (photo46, photo47, insc, relief, bed, kerb, mouth added).

### 10.6 Left / weak spots

- The library's blue-stone scan still draws its 0.25 m ashlar coursing over the obelisk, the benches and the platform;
  the real stones are big and smooth (now with real joints of their own): a "weathered blue stone" library material
  without coursing is the fix (shared library: not done here).
- The relief is a carved height field: legible as a seated saint with keys and book from the platform, not a sculptor's
  relief; the real panel's composition is only seen small in the owner's photo.
- The flower domes read as a planted bed from the steps; up close they are smooth domes with painted flowers.
- The bin and the lamp are placed from C2 by eye (no OSM points).
- Our bronze is unchanged (owner's decision); the slot waits for his model. The pipeline's unwrap is a smart projection
  (no seam-aware unwrap in headless Blender): islands follow the forms but are many; fine for a bronze seen from 5 m+.
- `THREE.AttributeNode: Vertex attribute "uv" not found` and an inline-Fn return warning show with the hero place on
  (warnings, not errors; not traced to a single mesh).
- GPU ms on a GREEN machine.
