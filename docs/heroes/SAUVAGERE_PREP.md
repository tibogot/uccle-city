# Parc de la Sauvagère: preparation (phase 1, 2026-11-11; the temple is NOT modelled yet)

Parc de la Sauvagère, Uccle: 4.5 ha between railway line 26 (north-west), the Verrewinkel cemetery and the Lycée
français (south / west) and the Avenue de la Chênaie (east), facing the Kauwberg. OSM relation 18270753 (tiles F7 /
G7, city x −259…78, z 1025…1340). Created ~1910 for the industrialist Albert Blieck: villa by Fritz Seeldrayers
(demolished 1957, its site is today's playground), landscape by **Jules Buyssens**, rockwork by **François
Dumilieu**. Listed 1997, Natura 2000 (station II14). Managed by Bruxelles Environnement since 2018-19, which
**restored** it (works 2024-26, €490,000, inaugurated 16 June 2026): the temple brought back to its 1910 look from the
Blieck family's 1910 photos, the cascade ("cascatelle", ~150 m of rock-lined channel, buried for decades) dug out and
re-fed by the restored pumps, the pond re-made for amphibians with vegetated rafts, the drainage re-routed into the
pond, paths and viewpoints re-done. **We model the restored state** (older photos show it degraded).

City frame: x = Lambert72 E − 148643, z = 165394 − N (z grows to the south), heights m TAW. Everything below measured
by me on our data unless marked otherwise; "look-only" = an image we looked at but do not store (owner's rule).

## 1. Sources

**Free, stored** (`data/raw/refs/sauvagere/`, git-ignored, list + licences in `SOURCES.md`; Wikimedia Commons,
Category:Sauvagère Park, all CC BY-SA 4.0):
- `s00`-`s03` GdML 2015-12-04: the temple from the path (`s00`), **the temple close (`s01`)**, swans and water
  (`s02`), the pond from the west shore (`s03`). Pre-restoration.
- `s05` Stratoswift 2021-02-11: the Rue de Verrewinkel bridge over L26.
- Excluded after checking: `Le Labrador.jpg` (a painting), `Parc de la sauvagère.jpg` (Jfcoue 2021: Château de la
  Sauvagère in France, not Uccle).

**Look-only** (read for shapes, colours, layout; nothing traced or stored in the repo):
- Bruxelles Environnement project report (27 Jan 2026) + its photo of the restored cascade (24 Apr 2025):
  https://environnement.brussels/citoyen/politique-regionale/rapports-des-projets-environnementaux/restauration-du-patrimoine-et-de-la-nature-au-parc-de-la-sauvagere
- **The pre-works historical study** (Noémie Pons-Rotbardt, dir. Chloé Deligne, July 2021, 50 p.):
  https://document.environnement.brussels/opac_css/elecfile/Sauvagere_Etude_Historique.pdf — the 1910 photo of the pond
  with the temple (fig. 21), 1990s-2021 photos of the rockwork, the grotto with the pumps, the cascade's damaged
  channel, aerial photos 1944 / 1953 / 1961 / 2012, maps 1891 / 1913 / 1924-33.
- La Libre 2026-06-16 and BX1 (inauguration; the animals' removal, BX1 2022-11-01), Ucclensia 269 (March 2018,
  Marc De Brouwer's history of the park), Bruxelles Patrimoines 23-24 (2017: the restoration of the Ixelles ponds'
  rocaille: the technique, ochre / olive colouring), Uccle council question 2020-10-01 (playground equipment list),
  Komoot highlight 3047380 (text only).
- Google Maps photos (Sauvagèrepark, Speelplein Sauvagèrepark): **Feb 2026, the restored temple and cliff** (Alessio
  Aguzzi), June 2025, Aug 2017, the playground 2018 / 2022.
- Not found: a heritage-inventory sheet on monument.heritage.brussels (searched; the park is a listed SITE, the
  inventory has no building sheet for it); Street View does not reach inside the park.

**Our data:** UrbIS DSM / DTM 2021 (0.5 m, sheet 148164), orthophoto 2024 (0.25 m, F7 / G7), OSM (2026-11-04),
UrbIS 3D buildings, our tiles. Working files (scratchpad): park OSM features in city coordinates, DTM / DSM grids
and hillshades round the pond.

## 2. The parts, where they are, the evidence

| part | where (city x, z) | ground (m TAW) | evidence |
|---|---|---|---|
| pond (concrete basin, 1910) | outline OSM way 1229838619 (relation 16802190), x −97…−69, z 1214…1247, **661 m²** | water **88.5** (DTM flat; the 2021 survey, before the re-make) | OSM, DTM, photos |
| islet | OSM 1229838620, centre (−84.5, 1222.6), 22 m² | ~88.9 | 1910 photo (a flat lawn islet), 2026 photo (planted, stones) |
| rock cliff + temple promontory | east shore, x −72…−58, z 1210…1250; the cliff face runs N-S along x ≈ −70 | foot 88.5, top **93.3-94.3** (≈ 5 m) | DTM profile (below), photos |
| temple | OSM 1520963969 "Temple grec", circle **5.2 m Ø**, centre **(−62.4, 1230.8)** | floor ≈ 93.8 | OSM, DTM, s01, 2026 photo |
| grotto(s) / pump room | in the cliff at the water: dark cave mouths under the temple (1990s photo); the pump "grotto" in the rockwork | ~88.5-89.5 | study fig. 32 / 37, photos |
| a hollow S-E of the temple | (−59, 1212): DTM 1.5-2 m lower than round it | ~89.9 | DTM: probably the cascade's upper basin or the "trop-plein" structure (study fig. 32): check with the owner |
| cascade ("cascatelle", ~150 m) | not in OSM; from the hollow / the cliff down to the pond; the 2025 photo shows a winding channel through woodland | 89-94 | BE report + photo; to place with the owner's photos |
| the old stream + its "source" | "below the Sequoia" (Ucclensia); stream abandoned, partly buried | ? | text only |
| playground (on the villa's site) | OSM playgrounds 908360019 (125 m², centre (0, 1200.9)), 1229841001 (52 m², (13.7, 1201.3)), 1521035769 (42 m², (25.3, 1202.6), "improve geometry") | plateau **96.2-97.3** | OSM, DTM, ortho (clearings), photos |
| basketball / soccer court (concrete) | OSM 1554647389, (52.8, 1253.4) | ~99 | OSM |
| sports hall (1971) | UrbIS solid 539117, (73.5, 1246.9), 337 m² | 98.3 | UrbIS |
| conciergerie (gate lodge, "cottage", ~1910-13) | UrbIS solid 538842, (56.0, 1198.6), 134 m², base 96.9, top 104.0 | 96.9 | UrbIS, Ucclensia ("English cottage", the keeper's house) |
| underground shooting range (1972-75) | its entrance and vents near the hall (small solids at (70-89, 1266-1296)) | ~99 | Ucclensia, UrbIS |
| main entrance | Avenue de la Chênaie 83: gate node (73.1, 1211.9) between two pilasters clad in Meuse stone | ~96 | OSM, Ucclensia |
| west entrance | gate node (−239.4, 1321.9), by the Rue de Verrewinkel bridge (behind the cemetery); the owner says one entrance is by the Avenue du Lycée Français | ~80 | OSM |
| other gates | (−261.3, 1337.4) "closes at 16:00", (13.7, 1271.4) / (56.9, 1236.7) (court), (−25.5, 1034.2), (24.4, 1001.3) | | OSM |
| paths | OSM paths 166220694 / 166220696 / 933251858-62 / 1423261854-58 (loops round the pond and the plateau); "chemins creux" (sunken lanes) in the south-west part (spoil of the 1925-28 railway cutting); the steep paths were concreted ~1991 | | OSM, study |
| benches | (−86.2, 1247.3) and (−87.1, 1246.4) by the pond; (−186.8, 1269.3) wooden; two on the bridge footway (−270.6, 1313.8), (−276.3, 1308.6) | | OSM |
| animal enclosures (REMOVED) | two large enclosures 1990-2022 (one near the railway, one near the playground; sheep, goats, donkeys, poultry, rabbits; swans and ducks on the pond); the animals went to educational farms (BX1 2022-11-01) | | study, BX1 |
| former structures | the villa (1910-1957) on the playground's site; greenhouses (1930s-40s, under the sports hall); the 1921-44 tennis court -> second basketball court (1971, abandoned 1980s); a "parcours santé" (1974-91); a faux-wood bridge over the artificial stream (1910, Ucclensia) | | study, Ucclensia |

**The cliff in the DTM** (2021, 0.5 m; rows z, columns x; heights m TAW): along z = 1230 the ground is 88.5 from
x −104 to −71, then 91.0 at x −68, 93.2 at −65, 93.8 at −62 (the temple) and 94 behind: a **4.5-5.3 m drop over 3-4 m**
of horizontal distance, from z ≈ 1215 to 1245 (≈ 30 m of face), lower (89.2-90.1) and gentler north of z 1240 and south of
z 1215. The DSM shows only canopy there (trees 13-23 m over the temple): **the temple and the rock cannot be measured in
the DSM**; their size comes from OSM (the 5.2 m circle) and the photos.

### The temple (to model in phase 2, after the owner's photos and OK)
- Form: a **monopteros**: a round podium (5.2 m) with a low curb / step, a **low curved parapet wall with a bench
  seat inside** (open on one side: the entrance faces the path, not the pond), **fluted columns** on square pedestals
  that are part of the parapet (Commons `s01`, 2015: 4 left standing, cracked floor slab). The 1910 photo shows the full
  ring: about **8 columns** under a continuous entablature ring (to count on the owner's photos).
- Restored 2025-26 (Google Maps, Feb 2026): podium and columns **white** (fresh lime / mineral paint), and a
  **dark-red (oxide-red) ring on top of the columns** (an entablature / pergola ring, apparently with vertical slats or
  brackets: material unknown, painted metal or wood?). Columns ~3 m (from `s01`: ~10 drum heights of the parapet's 1 m).
- BE calls it a "temple en fausse rocaille": the podium sits ON the rockwork, and the rock is part of the composition.
- Not known: the order (the capitals look plain / Tuscan in `s01`), the ring's exact profile, the floor finish.

### The rockwork (the rock kit's brief)
- Technique (study, after Odile De Bruyn): **no natural stone at all**: cement sprayed on an iron mesh, 3-6 cm thick,
  hollow behind (damaged pieces show the void), hand-finished with a finer render, tinted. Dumilieu's speciality:
  rocks made to be planted (fissures with soil behind, not "holy-water stoups").
- Shapes (photos 1910, 1990s, 2017, 2021, 2025, 2026): **massive stratified blocks** split by near-vertical joints and
  horizontal bedding planes, columns of blocks stepping in and out (ledges 20-50 cm), sharp-ish arrises rounded by
  hand, angular faceted tops, **fine horizontal bedding lines** on the faces (2025 cascade photo: clearly layered),
  hairline cracks, **dark cave mouths at the water line** under the temple, flat slabs projecting over the water
  (a landing / stepping slab on the south side).
- Colour: restored = **pale cream / sand** (ochre in low sun), darker grey-brown weathering in streaks, moss on
  ledges and in joints; the cascade bed uses **dark grey slabs** (schist-like) between the pale blocks. Pre-restoration:
  grey-green, mossy, black streaks.

### The pond and water features (the park-water module, claude/wolvendael: reference it, do not build water here)
- A **concrete basin** (the 1997 listing: "bassin artificiel en béton"; the burgomaster in 2008: "entirely cast in
  concrete"), closed circuit (no natural inflow), now fed by the re-routed drainage too. Water at **88.5 m** (DTM 2021;
  the 2026 level may differ by ~0.2 m), 661 m² + the islet.
- Edge: a concrete rim with a rounded lip on the west / north shore (s03), the rockwork on the east, a reedbed on the
  south shore (1970s). Vegetated **rafts** (2026), water lilies and duckweed (2025 photos), an aerator (2008-2021).
- The cascade: water pumped from the pond runs back through the cascatelle channel; its course has to come from the
  owner's photos (not in OSM, under canopy in the ortho).

### The playgrounds (the playground kit's brief)
- Uccle council 2020: toddlers' playground = a sandpit, a playhouse, a structure with a slide; older children's =
  swings, a playhouse, a slide, a pirate bridge, a suspension bridge, a climbing net, the basketball courts.
- Google photos 2018 / 2022 (look-only): stained square pine posts with turned caps, orange-brown HPL panels, green
  leaf-shaped roofs, a galvanised curved hoop ladder with red rungs, dark rope nets, a stainless / brown slide, two
  A-frame swing sets of round poles (2 seats each), spring riders (a red / green animal on a galvanised coil), a
  bench, rubber mat patches, bark chips under the climbing frames, half-buried round-log borders, a toddler area
  fenced with a green welded-mesh fence (~1 m) with a gate. A train-shaped play house in the sandpit.
- Exact equipment positions: to take from the owner's photos (the three OSM polygons are rough: "fixme improve
  geometry").

### Trees (LiDAR)
- Canopy over the park: median 15.5 m, p90 23 m, max **35 m at (29, 1185)** (next to the playground: probably the
  **giant sequoia** of the legal inventory; to confirm). Other peaks 30-32 m at (−54, 1281), (−30, 1306), (−20, 1244),
  (−116, 1241), (−65, 1244) (over the cliff), (−107, 1240).
- Listed remarkable trees (study): Atlas cedar, giant sequoia, Japanese cryptomeria, holly 'Albomarginata' (legal
  inventory); pedunculate oak, copper beech, tulip tree (scientific inventory). Undergrowth: laurels, rhododendron
  ponticum, holly, ivy, ferns, bluebells.

### The Rue de Verrewinkel bridge (west entrance, over L26)
- OSM 28030783 (layer 1, width 2.1 m), footbridge 1026190364 alongside, at (−268, 1308); L26 ways 209187151 /
  209080749 / 209187139 below. Commons `s05`: **red-brick, three arches** (a wide one over the tracks, two smaller
  side arches), a frieze of small corbelled brick arches under a **blue-stone coping**, damaged parapet (2021).
- In our work: claude/trains (docs/TRAINS.md) lists Verrewinkel among the "roads over the line" drawn as **plain
  concrete slabs at the DTM height, no parapets**; the brick bridge is not modelled (railBridge.py made the Saint-Job
  one). Today in the city: a flat deck over the cutting (screenshot `docs/heroes/sauvagere/city_today_verrewinkel_bridge.jpeg`).
  Suggestion: a second variant of tools/blender/railBridge.py (three arches + corbel frieze) when the trains work is merged.

### What the city draws there today (screenshots, `docs/heroes/sauvagere/`)
`city_today_aerial_se.jpeg` (a forest of LiDAR trees), `city_today_aerial_se_notrees.jpeg` (paths, the OSM pond
with its islet, sand patches), `city_today_pond_cliff_notrees.jpeg` (the cliff is a grass slope, nothing at the temple),
`city_today_temple_from_se.jpeg` (inside the canopy), `city_today_verrewinkel_bridge.jpeg` (flat deck).
The lab shows them too (Park Kit Lab -> "what the city shows there today").

## 3. Plan and budgets

Target: **≤ 0.5-1 ms GPU walking through the park, ~0 from the streets** (the park is closed by trees: from the
Avenue de la Chênaie or the bridge nothing of the cliff is visible; cull everything beyond ~200 m and behind the canopy).

1. **Temple: a small hero** (tools/blender/sauvagereTemple.py, the town hall's method: named slots, UV0 metres, AO in
   UV1, meshoptimizer LODs, checker 0 blocking). ~15-25k tris LOD0 (8 fluted columns, parapet with bench, podium,
   the red ring), 4k LOD1, 600 LOD2; slots `stone_white` (or a new `render_white_lime`), `paint_oxide_red`,
   `concrete_rocaille` under it. ~0.1 ms close, sits on the cliff's rock pieces.
2. **Cliff: the rock kit** (done in this phase, see 4): ~30-40 pieces along the 30 m east shore, 5 m high, the
   grotto pieces at the water under the temple, ledges and the landing slab on the south side; placed from the
   DTM profile and the owner's photos, by a placement JSON (piece, position, yaw, scale) like the furniture work;
   **~0.6-1.2 ms with 40 pieces at walking distance today (measured, section 4): the budget's main risk**.
3. **Pond: the park-water module** being built on claude/wolvendael (do NOT build water here): basin outline =
   OSM 1229838619, level 88.5, the islet, a concrete-rim strip on the west shore (procedural in JS), the vegetated
   rafts (a few low meshes), lilies near the shore; reflections of the cliff and temple are the main picture.
4. **Cascade**: the rock kit's `rk_channel` pieces chained along the course (to draw from the owner's photos), dark
   slabs (`nat_slab`) in the bed, a thin water ribbon from the water module.
5. **Playground: the playground kit** (done in this phase): one fenced toddler area + the main area, ~15-25 pieces,
   bark / rubber / sand surfaces; ~0.2-0.4 ms when you are in it (section 4).
6. **Planting near only**: ferns, ivy and moss patches on the rocks' ledges, shrubs (holly, rhododendron, laurel)
   round the pond, within ~60 m of the pond; the LiDAR trees stay as they are (the sequoia / cedar species heights
   could be checked).
7. Later / optional: the conciergerie (UrbIS solid, a small cottage hero), the Verrewinkel brick bridge (trains
   work), benches from the furniture work at the OSM bench nodes, the court.

## 4. The kits made in this phase

See the lab (labs/park-kit-lab.html) and models/parkkit/*.json for the numbers (triangles per LOD, draws, checker).
Rock kit: 9 rocaille pieces (`rk_boulder_a/b`, `rk_ledge`, `rk_face_a/b`, `rk_corner`, `rk_step`, `rk_grotto`,
`rk_channel`) + 2 natural (`nat_boulder` sandstone, `nat_slab` dark schist). Playground kit: `pg_swing`, `pg_slide`,
`pg_climb`, `pg_spring`, `pg_sandpit`, `pg_seesaw`, `pg_bench`, `pg_fence`, `pg_gate`, `pg_surface`.

Measured 2026-11-11 (Park Kit Lab, GPU timestamp medians, kit drawn vs not, interleaved windows, one WebGPU tab):

| view | kit cost |
|---|---|
| 40-piece sample cliff, walking 12 m | **1.64 ms** (was 5.3 ms before the LOD bands were tightened and the noise moved to a texture) |
| same, from the path 30 m | 0.92 ms |
| same, from 120 m | 0.26 ms |
| same, grazing close-up 3 m | 2.23 ms |
| sample playground (52 instances incl. 26 fence panels), walking 10 m | 0.98 ms |
| same, from 60 m | 0.39 ms |

Rock LOD bands 14 / 45 / 200 m (fade over the last 15 %), playground 20 / 55 / 160 m. Checker (tools/mesh_audit,
as-is from claude/stalle): **0 blocking on every piece and LOD of both kits** (models/parkkit/audit/). Images:
docs/heroes/sauvagere/lab_rock_grazing.jpeg, lab_rock_dolly_strip.jpg (12-19 m through the LOD0/1 band: no visible
pop), lab_playground_walking.jpeg; Blender previews in models/parkkit/previews/ (git-ignored, re-made by --previews).

## 5. Risks

1. **The cliff's cost.** Stratified rock needs geometry near (the bedding and joints are the look); 40 pieces at
   LOD0 were 1 M triangles (5 ms) on the first try; with the bands tightened it is still the budget's main item. If the
   real arrangement needs more than ~25 pieces in view, the next steps are a baked normal map per piece (LOD0 at
   1 cm + normal detail) and LOD1 as the shadow caster.
2. The cliff's real shape: the DTM only gives a 5 m slope; the block layout, the grotto mouths and the landing slab
   come from photos: **without the owner's photos the cliff would be invented**.
3. The temple's 1910 / 2026 details (column count, the red ring) are read from small photos.
4. Water: depends on the park-water module (claude/wolvendael), not merged; the cascade's ribbon of water too.
5. Instancing with per-instance LOD fades is new (viewer/parkKit.js): to review with the smooth-LOD rules in the city.
6. The canopy: 15-35 m trees over the pond and temple: the scene is dark and green most of the year; the LiDAR tree
   placement must not put a trunk in the pond or through the temple.
7. Materials are temporary stand-ins (named slots ready for the shared library).

## 6. What the owner's photos must show (the shot list)

1. **The temple**, all round (4-8 shots), plus close-ups: a column (base, shaft fluting, capital), the red ring on top
   (its profile, how it meets the columns), the parapet / bench and the entrance gap, the floor, the podium's curb.
2. **The cliff** from the west shore (the whole face, 2-3 overlapping shots at the water's level) and from the north
   and south ends; close-ups of the rock (a 1 m patch at grazing light: bedding lines, joints, colour), a grotto mouth.
3. **The cascade**: its whole course, from where the water comes out to the pond (one photo every ~10 m, with the path
   in the frame), the basins, the dark slabs, the source / pump room door.
4. **The pond's edges**: the concrete rim, the landing slab, the islet, the rafts; the water level against the rock.
5. **The playgrounds**: each area from its corners (to place the pieces) and each piece close (2 sides), the fences and
   gates, the surfaces.
6. The two entrances (Avenue de la Chênaie gate with its Meuse-stone pilasters; the Verrewinkel / Lycée français side)
   and the bridge from the path.
7. If possible: one photo with a known size in it (a person, a bench) at the temple and at the cliff.
