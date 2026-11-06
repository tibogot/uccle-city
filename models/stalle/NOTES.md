# Chapelle de Stalle (Notre-Dame de Bon-Secours / des Affligés, rue de Stalle 50, Uccle): the scripted hero + its interior

Gothic chapel of the lords of Stalle (lands endowed 1369; the present building probably end of the 15th century),
reworked at the end of the 17th century (stucco ceiling 1693, choir paving 1697), the sacristan's house of 1711 against
its south-west corner, restored 1932-33 (I. Pauwels) and 1990-91, protected 8 March 1938 (heritage inventory 27945). Now
used by a Byzantine-rite community (no icons / iconostasis allowed in the protected interior: La Libre 2015).
Sources and licences: `data/raw/refs/stalle/SOURCES.md` (git-ignored, with the photos).

```
python tools/stalle_measure.py [--dump]          # UrbIS solids + DSM/DTM -> site.json, site_dtm.* (1 s)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stalle.py -- models/stalle [--no-bake] [--previews]
node tools/stalle_pack.mjs models/stalle/stalle.raw.glb models/stalle/stalle.glb          # LODs + meshopt (tools/worker: npm ci)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stalle_interior.py -- models/stalle --samples 768 [--preview docs/stalle]
node tools/stalle_pack.mjs models/stalle/interior.raw.glb models/stalle/interior.glb --nolod
python tools/stalle_photopose.py                 # the photos' camera poses (lab overlays) + probes of opening positions
```
Exterior: Blender ~2.5 min (UV 50 s, AO bake 40 s CPU), pack 2 s. Interior: ~2.5 min on the RTX 4050 (OptiX: three
lightmap + per-corner bakes, the probes, three Cycles previews); it imports `stalle.raw.glb` as the occluder of the bake,
so build the exterior first. Viewer: `viewer/stalleModel.js` (exterior loader, adapter table), `viewer/stalleInterior.js`
(the cell), `viewer/stalleCity.js` (city, `?stalle=1`), `labs/stalle-lab.html` (+ `stalle-lab-interior.js`).

## Files
| file | what |
|---|---|
| `stalle.glb` | EXT_meshopt_compression + KHR_mesh_quantization. Nodes `Stalle` (LOD0), `Stalle_lod1` (meshopt of LOD0, shares its vertex buffers), `Stalle_far` / `Stalle_lod2` (the script's far variant, trimmed), `Stalle_door` (the west door's leaves: hidden while the interior cell is shown) |
| `stalle_ao.png` | Cycles AO (3 m, 96 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.86 (38 px/m mean), far 0.865..0.94, door above; u > 0.994 = AO 1 for the THIN faces whose AO is per vertex (COLOR_0.g) |
| `stalle.json` | slots, codes, placement (hides BU_IDs 1714263 chapel + 1711913 house), the levels used, triangles per slot |
| `interior.glb` | nodes `Arch` (lightmapped: TEXCOORD_1), `Props` (per-corner light `_LSKY/_LSUN/_LNIGHT`), `Glass`, `DoorL` / `DoorR` (origins on the hinges), `Collider` |
| `lm_sky.png`, `lm_sun.png`, `lm_night.png` | the interior's Cycles lightmaps, RGBM gamma 2 (lin = (rgb·a·4)²), 1024², a-trous denoised in the charts |
| `interior.json` | probes (ambient cubes, 14), openings (portal), the room outline, door hinges, spawn points, levels |
| `photo_views.json` | the photos' solved cameras (pose, focal, principal point, reprojection error) |
| `site.json`, `site_dtm.*` | the measurements (input of both Blender scripts), the DTM patch (lab ground, AO bake) |

## Materials (the owner's rule: no colour or pattern baked; only lighting)
- Exterior slots: `sandstone_rubble` (NEW name), `stone_white`, `stone_blue`, `brick_red_brussels`, `slate`, `zinc_roof`,
  `wood_frame_dark`, `painted_wood_red` (NEW name), `glass_window`, `cast_iron_green`, `cobbles`. COLOR_0.r = face code / 16
  (plain, coping, surround, tracery, plinth, band, sill, sculpture, ridge, louvre, gutter, interior, door, bell, quoin,
  lead), COLOR_0.g = vertex AO of the thin parts. TEXCOORD_0 world metres per face (walls u along / v up; slopes: v up the
  slope; swept parts path x profile).
- Interior slots: `brick_red_brussels`, `stone_white`, `render_white`, `marble_chequer` (NEW), `wood_frame_white` (the
  retable; gilt by code), `wood_frame_dark` (oak chairs, rush seats by code), `painted_wood_red`, `glass_window`,
  `cast_iron_green`, `polychrome` (NEW: the statues' robe / mantle / skin, the hatchments, by code). Unlit: colour = the
  slot material's colour node x the baked light (sky / sun / night mixed by the city's light; eye adaptation inside).
- NEW names (not in the shared library, branch claude/materials; resolved to the temporary TSL in the loaders whatever
  SOURCE says, until the library has them): `sandstone_rubble` = rough-squared Brussels sandstone in IRREGULAR courses,
  non-repeating (every stone from world-space hashes: 0.62 m bands split into 2-3 courses of 0.15-0.4 m, stones 0.24-0.62 m
  with wandering joints, recessed lime joints of varying width, per-stone tone cream / ochre / grey / brownish, spalls,
  rounded arrises + a per-stone tilt in the bump, the lower walls browner and darker on the north);
  `marble_chequer` = black and white marble squares on the diagonal; `polychrome` = painted figures.
- The doors and shutters: GLB slot `painted_wood_red`, mapped by the adapter table to the library's `wood_frame_dark`
  (polish 2: the photo's door is varnished brown wood); the door face code gives the varnish. Swap it back in the lab.
- ONE line switches every slot to the library: `const SOURCE = "temp"` -> `"./materials/library.js"` in
  `viewer/stalleModel.js` (the interior takes its colours through the same `sourceMaterial`). Live swap: the lab's
  "Material slots (adapter table)" panel builds the new shaders first, then switches.

## Measured (UrbIS solids 530292 + 525640, tile D5, DSM / DTM 2021 0.5 m, CC0)
- Frame: rotation -28.07 deg (the chapel's axis runs ENE), origin = the middle of the west front's footprint edge (city
  -1150.18, 56.50). Footprint: west front 8.4 m (w -4.19 .. 4.21), north aisle to u 11.2, south aisle to 10.55 then the
  sacristy (u 10.5-15.2, w to 7.3), the choir walls (w -1.93 / +2.53 about the axis 0.3), a three-sided apse to u 16.88
  (east face 2.74 m). The house: 7.25 x 5.8 m west of the chapel's south aisle.
- DSM: ridge plateau 43.35 m TAW from the west gable to the apse; the aisles' eaves 37.25-37.6; the bell-cote's bump
  45.3 at u 6.5-7.0; the house's ridge 41.3. DTM: the forecourt 33.8-33.9, north 34.4-34.7, east 34.3.

## From the photos (camera poses solved: tools/stalle_photopose.py), facade by facade
- WEST (Commons EmDee c00, Stemgée c05, inventory P02/P03): door 1.40 x 2.10 with a lintel and a relieving arch, two
  steps; a three-light window with cusped heads and two trefoils (sill 37.35, apex 40.25); the Virgin and Child on a
  corbel in front of the middle light; an oculus in the gable (41.97); the aisles' sloping shoulders with kneelers; the
  stone cross; four iron anchors. Pose c00: 13 points, 24 px mean error (of 3872).
- NORTH (inventory P01 + c05, two poses that agree): aisle (west -> east) the lepers' window (u 1.0, low, mitre head,
  barred), oculus 1.72, T anchor 2.38, door 3.95-4.9, oculi 6.74 and 9.14 (centres 36.55); clerestory oculi 2.8, 5.3, 7.75
  (both photos within 0.1 m); the choir's two-light window with a quatrefoil (u 12.95) and a string course at the sill.
- EAST (reflexcity r_rear): the apse's east face with a two-light window (blind inside: the retable), hipped slate roof.
- The bell-cote: hexagonal, slate-clad base, open timber stage with louvres and a bell, flared cornice, bell-cast spire,
  ball and wrought-iron cross. DSM at u 6.8, P01's pose says ~5.8: modelled at 6.5.
- The house: north face (P04) small barred window, the Baroque arched door (imposts, keystone), the shuttered window;
  west gable (P02) two attic windows, three stone bands, chimneys on both gables.

## Estimated (no photo or not measurable)
The south side of the nave (mirror of the north: oculi, no door); the sacristy's openings; the house's south and east
faces; wall thicknesses (0.5-0.75); the bell-cote's spire and cross heights (the DSM under-samples thin parts); the
statue is a stylised figure. Interior: the furniture layout, the north aisle and the west wall inside (no photo), the
retable's upper storey, the statues' colours, the night lamps; the sun lightmap is baked for one sun (late afternoon, WSW).

## Interior (references: 2 photos + the door glimpse + 4 texts: enough for nave, aisles, choir; see SOURCES.md)
Nave 3.5 m wide between round white-stone piers (r 0.26, moulded capitals, octagonal abaci) carrying pointed arches with
real voussoir rings; aisles 1.5 m wide under sloping plastered ceilings; exposed red brick walls; a coved stucco ceiling
(1693) with a moulded frame and a rose; a pointed choir arch; the choir one step up; the apse closed by the white and gilt
Baroque retable (predella, twisted columns, the Virgin in a niche before a gilt sunburst, an angel above, urns, cartouche),
the altar, two candle stands, two diamond hatchments; 52 oak chairs with rush seats (a central aisle), a side altar, two
statues on corbels, a wrought-iron chandelier; the west door's leaves open as the player comes near.

## Polish round 2 (after the coordinator's review of the side-by-sides)
Irregular non-repeating rubble with bevelled stones and damp lower walls; weathered (not white) dressed stone and barely
proud quoins; no quoins on the choir / apse; varnished brown doors (adapter); charcoal slate; the west window's lancets
lower with cusped heads and two trefoils in the head; the statues' faces turned outward (they rendered inside-out, which
made them read dark) and pale stone outside; interior: 40-segment piers lit per corner (no lightmap facets), pointed
equilateral arcades (springing 36.8, the aisle ceilings meet the arcade at 39.08), real rush-seat chairs (turned legs,
stretchers, woven seat, curved ladder back, book rail), a gilt vine on the twisted columns, a 25-ray sunburst, the
choir spots on in the day bake, light ~15 % dimmer and warmer; lab: UrbIS street surfaces + a lawn-toned ground.
Numbers after polish 2 (the trains agent's lab rendering on the same GPU):
- Exterior LOD0 12,157 · LOD1 6,117 · LOD2 1,200 triangles, 13 / 13 / 9 draws, GLB 0.47 MB. Lab GPU (median of 3 rounds,
  + = the chapel): c00 L0 +0.26 / L1 +0.33 / L2 +0.20 ms; c05 +0.07 / +0.07 / 0.00; overview +0.20 / +0.13 / +0.13.
- Interior: 71.7k triangles (Props 64k after densifying for the per-corner bake: piers + 52 chairs), 16 draws,
  interior.glb 2.44 MB; full-screen in the nave the cell costs +1.2 ms GPU (3.3-3.5 vs 2.2-2.3 ms, 3 rounds).
- City flights (650 m -> 32 m -> orbit, twice): LOD sequence 001 -> 011 -> 010 -> 110 -> 100 (fades at 359 / 279 m and
  93 / 65 m), median 16.6-17.5 ms, p99 33-34 ms, 13 frames > 34 ms per run (worst 51-99 ms; the GPU is shared with the
  trains lab); the interior streamed with no long task.
- Walk-in (third person, city): forecourt 33.8 -> steps -> threshold 34.32 at u 0 -> inside at u 1.1 -> nave to u 10,
  door 64 -> 100 % then closing behind; frame median 16.7 ms, worst 31 ms, 0 frames > 34 ms; probes on inside.

## Numbers before polish 2 (2026-11-06, this machine: RTX 4050 laptop, other agents' tabs running)
- Exterior triangles: LOD0 11,821 · LOD1 6,102 (meshopt of LOD0) · LOD2 1,200 (far variant trimmed) + the west door
  192. Draw calls 13 / 13 / 9 (one per slot, + shadow pass). LOD switch to the building's box: LOD0 < 80 m (±14 m
  dithered fade), LOD1 < 320 m (±40 m).
- GLB 0.46 MB (meshopt; 1.28 MB raw), AO 2048² PNG 2.5 MB file / 5.3 MB GPU (R8 + mips).
- GPU (lab benchmark, median of 3 rounds, whole frame; + = the chapel, the interior cell present in all): the c00 west
  front L0 +0.26 ms; the c05 north-west view L0 +0.59, L1 +0.13, L2 +0.26; overview (300 m) +0.00..0.07 (noise).
- City flight 650 m -> 32 m -> orbit (26 s, LOD states 001 / 011 / 010 / 110 / 100 crossed): median 16.7 ms, p99 26.8,
  2 frames > 34 ms (worst 53 ms, while tiles were streaming). Exterior shaders 1.4-4.7 s in the background queue.
- Interior cell: 7.4k (Arch) + 22.4k (Props, densified for the per-corner bake) + 0.4k glass + 1.6k doors = ~31.7k
  triangles, 16 draws; interior.glb 1.07 MB (meshopt, per-corner light as RGBM uint8), lightmaps 3 x 1024² RGBM PNG
  ~4.5 MB on disk. City: fetched + decoded 133 ms, shaders 281 ms in the background, **no long task while streaming**.
- Portal (city, inside the choir looking at the south wall: no opening in view): 2.4 ms GPU / 36-38 draws sealed vs
  6.4 ms / 467 draws with the city drawn (3 rounds).
- Third person in the city: walked from the forecourt up the two steps, through the opening door, down the central
  aisle; floor 34.32 m, the choir one step up; lit by the probes inside.

## Screenshots (docs/stalle/)
- `preview_*.png`, `blender_*.png`: Cycles previews (exterior / interior day + night).
- `lab_*`: the lab at the photos' solved viewpoints and inside; `city_*`: the city (street, LOD cross-fade at 70 m,
  the interior from the nave, third person in the nave).
- Side-by-sides `side_*.jpg` are git-ignored (they hold the photos): west c00 (Commons CC BY-SA 3.0), north-west c05
  (Commons CC BY 4.0), north P01 (inventory, reference only), interior nave + choir (reflexcity, reference only).
