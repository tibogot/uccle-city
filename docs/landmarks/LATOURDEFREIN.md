# Château Latour de Frein / Domaine de Latour de Freins, Rue Engeland 555: the scripted hero

Branch `claude/castle1` (worktree `uccle-castle`), 2026-11-15. The largest château of Uccle (OSM `historic=castle`,
~1,430 m² footprint), Wikidata Q127161341 (inception 1899, architect Q3131561 = Henri Maquet), OSM way 30498629
(`ref:UrbIS` 5015555, `building:architecture=eclectic`). Built from 1899 to 1903 as the convalescent hospital
"Refuge de Latour de Freins" of the Brussels Hospices, to Henri Maquet's plans "dans le style Renaissance", the front in
red Silesian brick, the side wings raised by a storey thanks to Georges Brugmann; the park is by Edouard Fuchs (Ucclensia
221, "La création de l'Institut médical de Latour de Freins"). Today the Brussels International School (BIS). No Commons
category, no image on Wikidata, no entry found in the Brussels heritage inventory (the site's protection procedure covers
the domain, not a description of the building).

## References (looked at only; never traced, stored or shipped)
- Ucclensia 221 (text: dates, architect, style, brick, the inscriptions on the north front, the blank cartouches, the
  rear cartouches either side of the central window, the stone to Brugmann on the south front).
- Google Maps user photos: the north front from the drive (2020), a pavilion close up (2017), the Rue Engeland gate.
- The 2024 orthophoto (data/raw/ortho G9, true ortho): the roofs, the dormers, the salmon terrace on the gallery, the
  skylights on the back slope, the grey east gallery roof.
- UrbIS 3D solid 538562 (LoD2 levels), DSM / DTM 2021 (0.5 m), OSM outline.

**Visible from public space:** the park is private (a school; OSM `access=customers`, the drives `access=private`). From
Rue Engeland the north front is seen through the gate down the ~100 m drive (Go to "Latour de Frein, Rue Engeland gate"):
the front, the avant-corps, the roofs and chimneys. The sides, the wings and the courtyard are not visible from any
street (trees all round); they are modelled from the DSM / UrbIS / orthophoto, their openings estimated.

```
python tools/landmark5_measure.py latourdefrein [--dump]        # UrbIS solid 538562 + DSM / DTM sheet 148163 -> models/latourdefrein/site*.{json,bin}
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/latourdefrein.py -- models/latourdefrein [--no-bake] [--fast] [--previews] [--checker --sunaz=200] [--views=north,door]
node tools/hero_pack.mjs models/latourdefrein/latourdefrein.raw.glb models/latourdefrein/latourdefrein.glb --nolod --name LatourDeFrein
python tools/textures/ao_ktx2.py latourdefrein                  # the AO map as BC4 KTX2 (+ viewer/aoKtx2List.js)
node tools/mesh_audit/cli.mjs models/latourdefrein/latourdefrein.raw.glb --nodes LatourDeFrein --range LatourDeFrein=128 --ignore-below 49.5 --out models/latourdefrein/audit/lod0
   (LatourDeFrein_far 470 -> audit/lod1, LatourDeFrein_xfar 6000 -> audit/lod2)
```
Blender builds in ~35 s (the AO bake on the RTX 4050 through OptiX 9-11 s for the three levels, each baked alone, 64
samples + denoise). `--no-bake` exports without the thin faces' vertex AO: always finish with a baked build.

## In the city
- Tile **G9** (far south, 2.3 km from Saint-Job). The UrbIS solid 538562 (BU_ID building/1594647) joins the hide list.
  **Switch: `?latourdefrein=0`** = the UrbIS block back. Dev panel: Landmarks row "Latour de Frein"; Go to "Château Latour
  de Frein" (above the front lawn), "Latour de Frein, Rue Engeland gate" (the public view) and "Latour de Frein, the
  front" (on the drive, the photo's viewpoint).
- Loader: the landmark5 modules (`viewer/landmark5City.js` + `viewer/landmark5Model.js`, entry `latourdefrein`), three
  scripted levels cross-faded by distance (timed settle ramp), bands 120 (+-20) m and 450 (+-55) m. The boot gate
  (`viewer/bootGate.js`): loads after the cover unless the start ring contains it.
- Colliders (`viewer/heroColliders.js` `HERO_ROOTS`): from LOD0, 46,012 triangles (walk / third person) + 638 car
  blocks; also in `contactAudit`, `collisionTest`, the falcon's landmark list (proxy 75 x 62 m, top 122.4 m TAW).

## Measured vs estimated
Frame (`tools/landmark5_measure.py`): u from the north front (u 0 = the avant-corps' front, OSM) INTO the building
(119.5 deg in the city: the OSM front walls run at 29.5 deg), w to the WEST (w > 0 = the west wing); heights m TAW.
MEASURED (UrbIS levels, DSM 2021 on a 0.25 m building-frame grid, OSM, DTM):
- the plan: main block u 7.75-19.75 x w -31.47..31.55; avant-corps u 0-7.75 x w +-6.94; end pavilions w 31.55-34.47 /
  -31.47..-34.43 x u 10.6-16.0; wings w 20.91-30.0 (to u 38.51) and -20.66..-29.88 (to u 38.75); the courtyard gallery
  u 19.75-22.3 + the wings' inner strips to w +-17.9;
- eaves 115.0 (UrbIS 114.82-115.09); main ridge 120.85 at u 13.75 (DSM 120.83-120.92, UrbIS 120.97), 44 deg, hipped
  ends (ridge ends |w| ~27, DSM); avant-corps ridge 120.75 (DSM 120.7 at w 0, u 6-12) with a front hip and side slopes
  into the main front slope; the stone lucarne (UrbIS 115.06 base, +-1.78 m; DSM 119.2-119.5); wings' ridges 119.55 at
  w +-25.3 (DSM 119.5-119.7), hipped south ends (ridge ends u ~35); gallery terrace 109.15 (UrbIS 109.13-109.16);
  pavilions' low roofs (UrbIS eaves 112.2-112.6, top 113.8-114.0); the roof lantern 2.5 x 2.9 m (UrbIS 120.93 -> 122.48);
  three chimneys (DSM 121.1-121.4 at (5.75, +-4.0) and (15.25, 26.75)); the front dormers' bays (DSM bumps to 117.45 at
  |w| 11.75 / 18.75 / 25.25 -> 7 bays a side at 3.45 m); the rear lucarne (DSM ridge 119.2, u 15.5-19); the perron
  (DSM 103.7 -> 102.6 over u -1 .. -3); the ground (DTM 102.2 at the front; light wells at a few wall feet, 100.3-100.9).
FROM THE PHOTOS (calibrated on the eaves 115.0 and the ground 102.2, +-0.3 m): the red brick with white stone bands
(sill / transom / lintel lines, string course 109.25, frieze with brick squares 113.75-114.3, moulded cornice), quoins
and harped window surrounds, stone cross windows (GF 104.6-108.1, FF 110.2-113.25) with white glazing bars, louvred
basement vents in blue-stone frames, the round-arched door with fanlight under a segmental pediment on consoles, the
lucarne (cross window, pediment, oculus, finial), two small dormers on the avant-corps' hip, the two rows of dormers on
the main roof (big over the even bays, small higher over the odd ones), the pavilion's double cross window, blank
cartouche, four iron anchors and top window.
ESTIMATED (`latourdefrein.json` "estimated"): every opening of the sides, back, wings, courtyard and gallery (the front's
rhythm and details repeated), the wing dormers (one a bay; the orthophoto shows 4-5 a wing), the back slope's skylights
(5 a side from the orthophoto; sizes estimated), the rear cartouches (blank), the door panelling, the lantern's louvres,
the downpipes, the wall depths. NOT modelled: the inscriptions ("Refuge de Latour de Freins", "Hôpital pour
convalescents": positions unknown, nothing invented), the gate and its brick piers, the park, the sunken garden south of
the courtyard, the light wells.

## Model
| level | node | triangles | draws | shown |
|---|---|---|---|---|
| LOD0 | `LatourDeFrein` | 46,012 | 10 | < 120 m (+-20 m band) |
| LOD1 | `LatourDeFrein_far` (no harps, frieze squares, glazing bars, louvres, sills, anchors, finials; flat stone crosses; simpler mouldings; flat shaded) | 9,199 | 9 | < 450 m (+-55 m) |
| LOD2 | `LatourDeFrein_xfar` (windows as shallow panels, no crosses / bands' details / rolls, dormers as wedges) | 3,602 | 9 | beyond |

GLB 1.37 MB (meshopt; raw 5.0 MB); AO lightmap 2048 px (`latourdefrein_ao.png` 2.1 MB -> `latourdefrein_ao.ktx2` BC4 1.2 MB;
11.7 px/m on LOD0). LOD0 triangles by slot: stone_white 23.5k (bands, quoins, harps, crosses, mouldings), brick 11.4k,
wood_frame_white 7.0k (frames, glazing bars, dormer fronts), stone_blue 1.7k, the rest < 1k each.
Slots (one primitive each per level): `brick_red_brussels`, `stone_white`, `slate`, `stone_blue` (the library's shipped
scans), `zinc_roof`, `wood_frame_white`, `wood_frame_dark` (door, louvres), `glass_window`, `cast_iron_green` (anchors,
finial, vane) (the library names; their temporary looks until the library ships them), and one new name,
`terrace_tiles` (the gallery's salmon terrace: temporary TSL look, weatherized). Codes in COLOR_0.r as the churches;
the glass code `gilt` marks the windows lit at night.

New shared kit: `tools/blender/castle_kit.py` (for the next brick-and-stone châteaux): the **Facade rasteriser** (a wall
face from rectangles: openings, bands, quoins, harped jambs, insets; all flush, classified on the grid of their edges,
merged into rectangles, T-junction vertices inserted on LOD0 so the wall is watertight), cross windows, basement vents,
gabled dormers on any roof plane, chimneys, roof faces from (u, w) polygons. Every roof face is an exact plane polygon
(hips, valleys, the lucarne notches computed), no boolean.

## Checks (2026-11-15)
- **Mesh audit**: LOD0 / LOD1 / LOD2 **0 blocking** (ranges 128 / 470 / 6000 m). Fixed on the way: the pavilion's two
  sills overlapping under the double window (one sill now), the lucarne ridge rolls' end caps in the pediment's plane,
  the lantern's pyramid fascia flush with its cornice, the hip rolls meeting the ridge rolls at 7 deg (stopped 0.4 m
  short), smooth normals bled into the flat faces of the mouldings / the door's reveal (all flat shaded now). Warnings
  left: slivers (bands), T-junctions round the openings' reveals, back-to-back sills.
- **Shading**: checker renders under a grazing sun (`castle1/latourdefrein_*_checker.jpg`): flat walls, clean reveals
  and mouldings, no black faces, no blotches.
- **Contact (JOINS)**: `await viewer.contactAudit("latourdefrein")`: **0 floating, 0 overhang, 0 blocking**, 14 "opening"
  infos. (Before the T-junction fix: 24 floating edges at the plinth's top, the faces above sharing no vertex with it.)
  Walls go down to 100.0 (ground 100.3-103.3: the light wells and the raised courtyard middle are covered).
- **Collisions**: `viewer.collisionTest("G9")`: nothing within the château's box (static; drive 93 routes; walk 93).
- **LOD hand-overs while moving** (`l5flight("latourdefrein", { far: 720 })`, 720 m -> 12 m -> 720 m, 12 s each way, tab
  in front): 1,289 frames, median 17.8 ms, p99 33.0 ms, 9 > 34 ms, 9 switches, **0 pops**; states 111@719 001@559
  011@445 010@363 110@118 100@97 110@121 010@148 011@456 001@559.
- **Cost** (renderer.info, shown vs held hidden at the same view; main + shadow passes): street (the drive, LOD0): **+19
  draws, +91.7k triangles** (4 samples: 17-21 / 91,683-91,687); 230 m (LOD1): +17, +18.1k; 555 m (LOD2): +15, +7.0k.
  GPU ms **not measured cleanly**: preflight GREEN at the start, but another agent's WebGPU city tab (port 8903) kept
  taking the front during the A/B (frame counts 5-460 per 8 s leg); the HUD GPU time on / off overlapped (13.1-18.5 ms).
- **Night** (`?hour=22`): ~30 % of the windows glow warm (a per-window flag baked in Blender: the glass code `gilt`; the
  loader multiplies the emissive by it; no light added), the door's fanlight lit.
- **Snow** (`?wx=snow_cover`): snow on the slate (main, avant-corps, wings, dormers), cornices and the terrace.
- **Console**: no error from the model (load in the background; the AO map decoded as KTX2). Two 404s in the page's
  console were not from the castle's files (glb / json / lods / png / ktx2 all 200).

## Compared with the photos (in words)
North front from the drive (Google Maps photo 2020) vs `latourdefrein_city_front.jpg` / `latourdefrein_north.jpg`: the
same composition — a long two-storey red-brick front banded with white stone, seven bays a side with stone cross windows,
the three-bay avant-corps with the round-arched door under its curved pediment, the stone lucarne with pediment and
oculus between the two tall chimneys, a tall slate roof with a row of larger dormers at the eaves and smaller ones higher
up, quoined corners. Differences: the photo's stone bands read whiter and a little broader against a brighter, more
orange brick (the library's Brussels brick in the city is darker and browner, the city's stone a beige grey); the real
lower dormers are larger with white pediment-like gables, and the dormer rhythm on the photo is denser; the real roof is
an even dark blue-grey where the library slate shows pale lichen patches; the real ground floor sits over a slightly
taller basement; the door's surround in the photo has more relief (pilasters). The pavilion (2017 photo) vs
`latourdefrein_pavilion.jpg`: the double cross window, the blank cartouche between four iron anchors and the top window
match; the real frieze carries stone lozenges (modelled as brick squares), and the louvres are larger. From above
(orthophoto vs `latourdefrein_city_aerial.jpg`, `latourdefrein_court.jpg`): the E-shaped plan, the hipped roofs, the
lantern, the courtyard gallery with its salmon terrace on the back and west strips, the grey east strip and the skylights
match the orthophoto.

Images (`docs/landmarks/castle1/`): Blender `latourdefrein_{north,door,northwest,aerial,court,pavilion}.jpg`, checker
`latourdefrein_{door,court,north}_checker.jpg`, city `latourdefrein_city_{front,gate,aerial,night,snow}.jpg`.

## Weak spots / next
- Every opening off the north front is estimated (not visible from a street); the courtyard gallery's design is a guess.
- The library slate's pale patches and the brick's tone (darker than the photo's bright red brick); the stone bands could
  be a brighter stone.
- The real dormers are bigger and denser than modelled; the inscriptions and the gate piers are not modelled.
- GPU ms on a quiet machine (no other WebGPU tab).
