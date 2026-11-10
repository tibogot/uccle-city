# Uccle town hall (Maison communale, Place Jean Vander Elst 29): the scripted building

1872-1882 (inaugurated 1882), probably Baptiste Van der Elst; "Louis XIII" / eclectic: "son avant-corps central muni de
deux ailes en retrait, ses facades a l'ordonnancement classique en maconnerie de pierre et de brique, ses hautes
toitures" (Bruxelles Patrimoines 18, 2016). Heritage inventory 27585 (legal inventory 19 Aug 2024; no description
online). The administration left for rue de Stalle 77 in March 2022. No tower, no belfry, no clock on this building.

```
python tools/townhall_measure.py [--dump]              # UrbIS solid + DSM/DTM -> site.json, site_dtm.bin (1 s)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/townhall.py -- models/townhall [--no-bake] [--previews]
node tools/townhall_pack.mjs models/townhall/townhall.raw.glb models/townhall/townhall.glb     # LODs + meshopt (tools/worker: npm ci)
```
Blender ~45 s (AO bake 25 s CPU, vertex AO 1 s), ~110 s with `--previews` (docs/townhall/preview_*.png). Pack 2 s.
Viewer: `viewer/townhallModel.js` (loader, slot adapter table), `viewer/townhallCity.js` (city, `?townhall=1`),
`labs/townhall-lab.html` (the lab).

## Files
| file | what |
|---|---|
| `townhall.glb` | 1.77 MB (EXT_meshopt_compression + KHR_mesh_quantization; 5.6 MB raw). Nodes `TownHall` (LOD0, 54.7k tris), `TownHall_lod1` (22.5k, meshopt of LOD0, shares its vertex buffers), `TownHall_far` (3.4k, the script's far variant), `TownHall_lod2` (3.0k, far trimmed). One primitive per slot: 10 / 10 / 9 draw calls per LOD (+ shadow pass; the paving apron casts none) |
| `townhall_ao.png` | Cycles AO (4 m, 96 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.885 (16 px/m mean, walls more: roofs and decks shrunk), far above; u > 0.994 a reserved column of AO 1.0 for the THIN faces, whose AO is baked per vertex instead (COLOR_0.g: 15k faces, 59k corners: glazing bars, sills' edges, quoin joints, balusters, railings) |
| `townhall.json` | slots, codes, placement, the measurements used (levels_taw: door head, portico soffit, balcony floor), triangles per slot, lightmap density, `flag_poles` (see below) |
| `townhall.lods.json` | LOD triangle counts, GLB sizes |
| `site.json`, `site_dtm.*` | the measurements (input of the Blender script), the DTM patch (lab ground, AO bake) |

## Materials (the owner's rule: no colour or pattern baked; only lighting)
- GLB slots: brick_red_brussels, stone_white, stone_blue, slate, zinc_roof, wood_frame_white, wood_frame_dark,
  glass_window, cast_iron_green, cobbles (polish 2: the forecourt paving apron; a library name, so SOURCE switches it too). COLOR_0.r = per-face code / 16 + 1/32 (plain, band, surround, cornice, plinth,
  pilaster, sill, keystone, pediment, baluster, column, interior, seam, coping, console, door); COLOR_0.g = vertex AO.
- TEXCOORD_0 = world metres per face (walls u along / v up; mouldings: path length x profile length; lathed parts arc).
- `viewer/townhallModel.js`: `SLOT_TABLE` (GLB slot -> any of the 18 library names) and the ONE line `const SOURCE =
  "temp"` -> `"./materials/library.js"` (createMaterial(name, { mapping: "uv" }), or getMaterial / materials[name]).
  Every material is cloned with the AO (`aoNode` = lightmap x vertex AO, + a share on the colour); the LOD fade is on a
  fading COPY (lodFade `fadeVariant`), drawn only inside the hand-over bands (`setLodFades`, polish 2). Live: `model.setSlotMaterial(slot, material)`; the lab's "Material slots (adapter table)" panel swaps any slot to
  any library name with the shaders built first (docs/townhall/lab_swap_*.png: stone_white -> brick_yellow,
  slate -> copper_patina).

## Measured (UrbIS 3D solid 547183 / BU_ID 1596445, UrbIS DSM/DTM 2021 0.5 m, CC0)
- Building frame: rotation 1.92 deg (length-weighted footprint edges), origin city (-1147.98, -506.24); the footprint
  is symmetric about its E-W axis to 0.1 m, so the plan is the mean of the mirror pairs: east facade 22.70 m, portico
  3.42 x 1.76 m, wings 10.73 x 4.33 m (set back 4.48 m from the east facade), west blocks 6.28 x 2.35 m, west pavilion
  11.42 x 1.79 m.
- Roof levels (DSM p50 inside each part): main terrasson top 81.26 (p90), its curb 79.85 (where the shallow slope
  starts on the DSM grid), east pavilion top 82.15, west pavilion 79.41, wings 78.37 / 78.45, west blocks 77.92 / 77.91;
  balcony balustrade 67.9 (DSM p50 over the portico). Brisis insets read on the DSM grid (`--dump`): 1.2 m east, 1.9 m
  north/south, wings 0.7-1.0, pavilion front 1.44 over 7.6 m (bell-cast).
- Ground (DTM, 1 m out): east 61.05 (the perron: 11 risers to the 62.95 floor), west 62.37, north/south 61.3-62.3.

## From the photos (data/raw/refs/townhall/SOURCES.md), facade by facade
- EAST (Commons 3557, D. Edgar, CC BY-SA 3.0, full size; the heritage inventory's frontal and SE views): main block 5
  bays (outer, three in the pavilion, outer), the recessed wings 1 bay each; first floor pediments seg / tri / balcony
  door (straight hood) / tri / seg, ground floor tri / seg / door / seg / tri; basement windows under each; rusticated
  quoins at the corners, pilasters at +-5.05 m (the pavilion) and +-1.35 m (the centre bay, answering the portico's two
  Tuscan columns); framed brick fields in the outer bays; architrave, brick frieze with dies, modillion cornice;
  pavilion: bell-cast slate, flat top with a zinc rim and four finials, a stone attic with pedestals, one big dormer
  (segmental) and two oculi; main mansard: a triangular-pediment dormer over each outer bay; south wing: an oculus,
  north wing: a flat-topped dormer.
- Scale and storeys: the photo's facade (22.70 m UrbIS) spans 1395 px -> 61.5 px/m; cornice 74.60, first-floor sill
  68.70, string course 66.95, ground-floor window heads 66.20; their sills (hidden by shrubs in 3557) at 63.25 and the
  plinth top at 63.00 from the inventory views (ground-floor windows nearly as tall as the first-floor ones), wings' cornice 0.85 m lower (73.75). The overlay in the
  lab (view "east facade (Commons 3557)") lands on the photo at the same time as the DSM's roof levels.
- SOUTH (the inventory's corner view only): main block's return 1 bay; wing south face 3 bays, the middle one a wide
  three-light window; one dormer on the wing's south slope, an oculus on the main roof above the return; south-west
  block 2 bays with a dormer. NORTH = mirror of the south (plan + roof symmetric).

## Estimated (no photo, or not measurable)
- The WEST facade (no photo anywhere free or not): pavilion 3 bays + a dormer, blocks' west faces 2 bays each + a
  dormer: modelled from the plan's rhythm.
- Mouldings, consoles, modillion pitch (0.62 m), quoin courses (0.36 m), window joinery, the perron's railing design,
  the stone attic's panels. The inventory's thumbnails are stretched ~1.33x vertically (window proportions against the
  full-size Commons photo): the lab shows them squeezed back (INV_SY) and uses them for counts, not for alignment.

## Numbers (2026-11-05, this machine, other tabs and agents running)
- Triangles: LOD0 49,570 · LOD1 22,201 · LOD2 3,017. Draw calls 9 / 9 / 7 (+ shadow pass).
- LOD switch by distance to the building's box: LOD0 < 110 m (+-18 m fade), LOD1 < 420 m (+-50 m); dithered
  cross-fades (lodFade.js objectFade, the shadow pass follows).
- GPU (lab benchmark, median whole frame, + = the building): portico close-up (fills the screen) L0 +0.92 ms; the 3557
  view (60 m) L0 +0.46 ms, L1 +0.33; south-east corner L0 +0.20; 900 m L2 +0.2 (noise level).
- Load: GLB + AO 86-210 ms (decode in workers); shaders 1.3-3.3 s through the precompile queue before it shows (city:
  in the background, no long task from the moment the model is added). The lab records one 52 ms task on its first frame. City flight 900 m -> 45 m -> orbit (24 s, LOD states 100/110/010/011/001 crossed): median
  16.6 ms, worst frame 26.7 ms, none > 34 ms.
- Lab: a live slot swap (precompiled) costs one or two frames of 80-100 ms (node builds of the new material on the
  main thread): fine for a tool, not for gameplay.

## Screenshots (docs/townhall/)
- `preview_*.png`: Cycles previews (Blender, `--previews`).
- `lab_east_3557.png` (the model alone at the photo's viewpoint), `lab_swap_*.png` (live slot swap), `city_*.png`.
- Side-by-sides `side_*.jpg` are git-ignored (they hold the photos): `side_east_3557.jpg` (Commons, CC BY-SA 3.0),
  `side_east_frontal_inventory.jpg`, `side_southeast_inventory.jpg` (inventory thumbnails, reference only).

## Polish round 2 (2026-11-10, branch claude/townhall2)
SPEED (Saint-Pierre's fix, bb30b74, applied here; lodFade.js unchanged):
- `setLodFades` (viewer/townhallModel.js): a level draws its slot materials' FADING COPIES (lodFade `fadeVariant`, the
  dithered `discard`) only while its fade is strictly inside a band, its own opaque materials otherwise (early-z kept).
  The copies are compiled with the model (`fadeProxies` -> the precompile queue, city and lab), so the first hand-over
  builds nothing. The lab's "A/B: LOD-fade discard on every material" puts the old way back for timing.
- `noSSR` MRT on cast_iron_green (railings, bars, flag poles) and zinc_roof (rims, finials, seams); the GTAO weight stays.
- The temporary TSL materials are each ONE `Fn` with `.toVar()` intermediates and a sin-free hash (SOURCE = "temp" and
  the adapter table unchanged).
- Lab benchmark (labs/townhall-bench.js: off / L0 / L1 / L2 interleaved in 1.2 s windows x 6 cycles, mean GPU ms of the
  whole frame, + = the building; this machine, 1608 x 850 canvas, dpr 1, another Chrome session sharing the GPU). BEFORE =
  claude/foundation's lab and model (49.6k tris), AFTER = this branch (54.7k tris: + panel, poles, apron), two runs:

  | view | before L0 / L1 / L2 | after L0 / L1 / L2 |
  |---|---|---|
  | portico close-up ("portico and perron") | +1.53 / +1.34 / +0.96 | +1.39-1.42 / +1.13-1.14 / +0.90-0.92 |
  | the 3557 view (60 m) | +0.68 / +0.60 / +0.39 | +0.54-0.55 / +0.39-0.40 / +0.27-0.37 |
  | south-east corner | +1.25 / +1.24 / +0.85 | +0.97-1.03 / +0.73-0.81 / +0.63-0.67 |
  | 900 m | +0.03 (noise) | +0.07-0.11 (noise, ±0.1) |

  Same page, same model, A/B (L0): fade discard on every material +0.06 to +0.12 ms; old -> new temp materials -0.17 to
  -0.23 ms. A plain grey material on the same geometry costs nearly as much as ours (portico +1.40 vs +1.57 with ours, same
  page and run): the rest of the close-up cost is the geometry (depth complexity, the shadow pass ~0.2 ms)
  and the post chain over it, not the shading. (The round-1 figures above, +0.92 / +0.46, were taken at another canvas size.)
- City flight (debug/townhallFlight.js: 900 m -> 45 m -> orbit -> 900 m in 24 s, LOD states 001/011/010/110/100 and back,
  run twice): 1440 frames each, median 16.7 ms, p99 16.9, worst 17.0 / 17.2, 0 frames > 25 ms, no long task, pixel coverage
  of the shown levels 1.000 in every frame (no hole, no double layer), the fading copies drawn exactly while inside a band.
  Moving sequences through both bands: docs/townhall/city_lod0_band_moving.jpg (95 -> 131 m: L0 2.03 -> L1 alone),
  city_lod1_band_moving.jpg (384 -> 484 m). The shadow pass uses the same objectFade (the copies' maskNode), so the
  shadow fades with the level; seen no snap in the sequences.

VISUAL FIXES:
- PLINTH too dark: the baked AO there is normal (lab "debug: AO only (white)": the plinth reads like the wall above);
  the cause was the temporary stone_blue (dark polished blue-grey 0x575c62-0x6b7075). Now a bush-hammered, weathered petit
  granit, pale grey (0xa4a5a1-0xb2b2ac) with tooling speckle, as on P01 / P03 (docs/townhall/lab_southeast_plinth.png,
  city_perron_apron_plinth.png). When SOURCE points at the library, its stone_blue decides (the slot could be pointed at
  a paler library stone in SLOT_TABLE if the library's reads dark).
- THE PORTICO RE-MEASURED on the full-size 3557 (61.5 px/m): the door's head is level with the ground-floor windows'
  heads (66.20, y 1235), the entablature's soffit 35 px higher (66.77), its top 48 px higher again (67.55 = the balcony's
  floor). Round 1 had the soffit at 66.30 and the balcony floor at 67.00, no room above the door: raised (DOOR_HEAD 66.22,
  PORTICO_SOFFIT 66.78, BALC_FLOOR 67.55; the balcony door's sill follows). docs/townhall/side_portico_3557.jpg (ignored).
- THE CARVED PANEL over the door (`door_panel`): a stone tablet between the centre pilasters from the door's surround to
  the soffit (1.92 x 0.49 m), a bead frame, a domed cartouche with a rolled rim, an inner bead ring and an eight-petal
  rosette, C-scrolls with bosses, two laurel branches (9 leaf pairs each, domed lens leaves) tied by a ribbon knot with
  loops; ~4k tris, AO baked (vertex AO on the small parts). The photos are too small to read the carving: its MOTIF is
  estimated, its place and size are measured. docs/townhall/lab_door_panel.png, preview_portico.png.
- FLAG POLES only (the owner's flag system comes later; no cloth, no flag slots): three painted iron poles in
  cast_iron_green as on P01 (south: EU there, Belgium on 3557; centre: Belgium; north: Uccle), from the balustrade's front
  corner dies (leaning 38 deg out and forward, 3.9 m) and the middle of the front rail (16 deg forward, 3.5 m); sockets
  with a lip, a bracket plate with bolt heads or a saddle clamp, a stay, a ball finial. `townhall.json flag_poles`: base,
  tip, axis (building frame u/w/TAW and city x/y/z), length, radius and the flag each photo shows. Approximate tips (city):
  south (-1132.6, 71.26, -502.36), centre (-1132.86, 71.22, -505.73), north (-1132.38, 71.26, -509.08).
- THE PAVING APRON (`paving_apron`, slot cobbles): the city drew grass from the facade to the UrbIS sidewalk polygon
  (street surface 140243, inner edge 4.9 m out, u 17.27) beside the perron; the steps' foot already lands on that
  sidewalk. Not a city bug (the plot is a garden in UrbIS Land cover), so the fix is on the town hall side: setts from the
  facade to the sidewalk's edge, 6.6 m wide (1.1 m beyond each newel), on the DTM + 5 cm, blue-stone kerbs on the sides
  (4 cm proud, chamfered) and a blue-stone edge down below the ground on the front (the city's ground there lies up to
  25 cm under the DTM). Temporary material: grey setts 14 x 10 cm, sanded joints. docs/townhall/city_perron_apron_plinth.png.
- Lab + Cycles previews rebuilt (preview_*.png). Load: GLB + AO 83-107 ms, shaders 0.24-1.5 s before it shows.
