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
| `townhall.glb` | 1.62 MB (EXT_meshopt_compression + KHR_mesh_quantization; 4.8 MB raw). Nodes `TownHall` (LOD0, 49.0k tris), `TownHall_lod1` (22.0k, meshopt of LOD0, shares its vertex buffers), `TownHall_far` (3.4k, the script's far variant), `TownHall_lod2` (3.0k, far trimmed). One primitive per slot: 9 / 9 / 7 draw calls per LOD (+ shadow pass) |
| `townhall_ao.png` | Cycles AO (4 m, 96 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.885 (16 px/m mean, walls more: roofs and decks shrunk), far above; u > 0.994 a reserved column of AO 1.0 for the THIN faces, whose AO is baked per vertex instead (COLOR_0.g: 15k faces, 58k corners: glazing bars, sills' edges, quoin joints, balusters, railings) |
| `townhall.json` | slots, codes, placement, the measurements used, triangles per slot, lightmap density |
| `townhall.lods.json` | LOD triangle counts, GLB sizes |
| `site.json`, `site_dtm.*` | the measurements (input of the Blender script), the DTM patch (lab ground, AO bake) |

## Materials (the owner's rule: no colour or pattern baked; only lighting)
- GLB slots: brick_red_brussels, stone_white, stone_blue, slate, zinc_roof, wood_frame_white, wood_frame_dark,
  glass_window, cast_iron_green. COLOR_0.r = per-face code / 16 + 1/32 (plain, band, surround, cornice, plinth,
  pilaster, sill, keystone, pediment, baluster, column, interior, seam, coping, console, door); COLOR_0.g = vertex AO.
- TEXCOORD_0 = world metres per face (walls u along / v up; mouldings: path length x profile length; lathed parts arc).
- `viewer/townhallModel.js`: `SLOT_TABLE` (GLB slot -> any of the 18 library names) and the ONE line `const SOURCE =
  "temp"` -> `"./materials/library.js"` (createMaterial(name, { mapping: "uv" }), or getMaterial / materials[name]).
  Every material is cloned with the AO (`aoNode` = lightmap x vertex AO, + a share on the colour) and the city's LOD
  fade. Live: `model.setSlotMaterial(slot, material)`; the lab's "Material slots (adapter table)" panel swaps any slot to
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
  68.70, string course 66.95, ground-floor windows 63.80-66.20, wings' cornice 0.85 m lower (73.75). The overlay in the
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
- Triangles: LOD0 49,002 · LOD1 21,980 · LOD2 3,031. Draw calls 9 / 9 / 7 (+ shadow pass).
- LOD switch by distance to the building's box: LOD0 < 110 m (+-18 m fade), LOD1 < 420 m (+-50 m); dithered
  cross-fades (lodFade.js objectFade, the shadow pass follows).
- GPU (lab benchmark, median whole frame, + = the building): portico close-up (fills the screen) L0 +0.92 ms; the 3557
  view (60 m) L0 +0.46 ms, L1 +0.33; south-east corner L0 +0.20; 900 m L2 +0.2 (noise level).
- Load: GLB + AO 86-210 ms (decode in workers); shaders 1.3-3.1 s through the precompile queue before it shows (city:
  in the background). City flight 900 m -> 45 m -> orbit (24 s, LOD states 100/110/010/011/001 crossed): median
  16.6 ms, worst frame 26.7 ms, none > 34 ms.
- Lab: a live slot swap (precompiled) costs one or two frames of 80-100 ms (node builds of the new material on the
  main thread): fine for a tool, not for gameplay.
