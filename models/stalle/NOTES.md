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

## Round 3 (2026-11-10, the owner's review "~1000 years old, make it AAA"; status: models/stalle/ROUND3_RESUME.md)
The shared mesh audit (tools/mesh_audit, README) now runs before every pack (tools/stalle_pack.mjs, per LOD group) and
stops it on blocking items. Checker counts, raw files, same checker (round 2 -> round 3): exterior LOD0 582 -> 0 (1
justified, audit/stalle.allow.json), far 73 -> 0, packed LOD1 1,506 -> 0 (LOD1 is now the far variant), packed LOD2 106
-> 0, interior 1,478 -> 0 (2 justified); bentflat (bent normals on flat walls) 188 -> 0.
- Gable corner z-fight: the clerestory's flashing ledge had end caps flush with the west front and the aisle's east face
  (now from inside the gable mass); the aisle roofs stop at the gable's inner face; the slates' borders 1 cm short of
  walls / copings / hips (odd courses 3.5 mm more: no two border faces in one plane).
- West door: the bright line was the astragal stopping 4 mm above the threshold (a 3 x 4 mm hole into the nave): it now
  goes into the threshold; the ring plate sits on the leaf. Flicker test (strafe, door close-up): no blink at the
  leaf / frame, only edge aliasing on the 12 mm quoin sides.
- Oculus -> lancet streak, black dashes: planar fills never take per-vertex AO (their slivers did: dark rays), flat walls
  keep flat normals (planar regions >= 0.3 m2 sharp against any non-coplanar face), a support ring of points 8 and 22 cm
  round every opening in the CDT fills; tracery plates run 1.2 cm into their reveals. Rubble: no derivative bump.
- "Bathroom tiles": crisper stone corners, arris radius 0.9-1.7 cm (was 2.2-4), each stone tilted, rough faces.
- Slates: real geometry (tools/blender/roofkit.py, 0.24 x 0.145 m, was 0.22 x 0.135), butts down into the deck, an
  under-eave strip, ridge cap 5 cm; 39.5k triangles, LOD0 only, faded out at 42 +- 10 m to the deck's painted courses,
  no shadow; GPU +0.26 ms (north side, 7.5 m) / +0.33 ms (c05, 4 m), interleaved A/B, 8 rounds. Lichen: soft rosettes.
- Statue: tools/blender/stalle_statue.py v2 (posed metaball / skin bodies, script-sculpted heads and drapery, voxel
  remesh, weathering) -> meshopt 14k triangles, largest piece only, smooth-shaded to 45 deg. Better than round 2's lathe
  figure, not yet the photo's quality (see ROUND3_RESUME.md "Open").
- Interior: choir window hole = its splay (it was 2-5 cm larger: light leak), voussoirs stop short of the responds and
  the soffits' feet run into them (the coplanar strip at the east responds), creased cove sides, finer figure rings,
  64-segment capitals with per-corner light smoothed 8 passes, door ring on the boards.
- Triangles: LOD0 33,015 + slates 39,507 + door 218; LOD1 = LOD2 = the far variant 6,417; interior 101,707. GLB 2.29 MB,
  interior.glb 3.08 MB.
- GPU (lab bench, median of 3 rounds, + = the chapel, round 2 -> round 3, same tab back to back): c00 L0 +0.52 -> +0.39,
  L1 +0.52 -> +0.26, L2 +0.33 -> -0.13; c05 L0 +0.13 -> +0.72, L1 -0.07 -> +0.46, L2 +0.07 -> +0.46; overview +0.07 ->
  +0.07. Noise +-0.3 ms (other agents' tabs on the same GPU).
- Round 3b (coordinator review): west door as c00 (plain chamfered opening in the rubble, red-brown painted leaves,
  no strap hinges, plaque, notice board; the photo's flush soldier course of rubble over it is not modelled), west
  window without hood mould, lancets to 61 % of its height, two quatrefoils; rubble irregular (thin and tall courses,
  long thin stones), cream-grey, soft joints, darker base on all sides; slate lichen = rare soft metre-scale patches
  (flicker strafe at 7 / 20 / 40 m: 48 / 20 / 56 ppm, no clusters on the roofs); interior: round moulded corbels on the
  shafts (the box corbels sat in the capitals), moulded imposts, per-corner light smoothed along shading normals (the
  stepped capitals); the far variant (LOD1/2) keeps the statue (900 tris, faceted) and the west window's tracery: no
  dark hole in the 66-94 m hand-over. City (`?stalle=1`, D5): approaches checked while moving (trees hide the chapel
  from most directions; with trees off the 112-75 m cross-fade shows no pop). Images: docs/stalle/round3/*3b*.
- Round 4 (coordinator review vs springer_AFTER_3b / side_round3b_west_c00): interior: the stair-stepped line on the
  capital bells was the albedo's per-face UV cells (it stayed in the light-only view after 24-pass smoothing: not the
  shadow), stone_white indoors now tones from world position; abacus = moulded octagon (fillet, cove, cavetto, flat
  group, sharp facets), bead under it lathed at 64, figure heads 24; voussoir rings = the intrados offset along its
  normal (one-sided tangents at the pointed apex), 11 stones, 1.5 mm joints, flush backing on the extrados polyline and
  the arcade wall cut at it (the dark "hairs" were wall lightmap texels under the ring); chancel imposts swept ogee;
  lightmap: texels darker than 30 % of their 7x7 median lifted. Exterior: rubble courses wander (+-4 cm), vertical
  joints lean, deeper softer mortar, rain streaks; window head ring of 2 x 7 radial rubble voussoirs and a 13-stone
  flush segmental relieving course over the door (single stones, COLOR_0.b seed, 4 mm proud); door leaves 15-19.5 cm
  back (was 37); plinth 3.5 cm (was 7). Flicker west front 5 m 291 ppm (statue edges only), 40 m 31 ppm.
- Triangles round 4: LOD0 33,073 + slates 39,507 + door 188; far 8,197; interior 115,259. stalle.glb 2.47 MB,
  interior.glb 3.24 MB. Audits: exterior 0 blocking (LOD0 + far; packed LOD0 4 gutter slivers, report-only), interior 0
  before the pack (packed 4, quantization, report-only).
- GPU round 3 -> round 4 (lab bench, median of 3, + = the chapel): c00 L0 +0.39 -> +0.00, L1 +0.26 -> +0.07, L2 -0.13
  -> +0.07; c05 L0 +0.72 -> +0.13, L1 +0.46 -> -0.20, L2 +0.46 -> -0.52; overview +0.07 -> +0.33 / +0.66 (timer steps
  0.065 ms, noise +-0.3 ms: no measurable change). Images: docs/stalle/round3/*_r4*.
- Images: docs/stalle/round3/ (flicker heat maps, frame strips, grazing before / after); side-by-sides
  docs/stalle/side_round3_*.jpg (git-ignored: they hold the photos).

## Screenshots (docs/stalle/)
- `preview_*.png`, `blender_*.png`: Cycles previews (exterior / interior day + night).
- `lab_*`: the lab at the photos' solved viewpoints and inside; `city_*`: the city (street, LOD cross-fade at 70 m,
  the interior from the nave, third person in the nave).
- Side-by-sides `side_*.jpg` are git-ignored (they hold the photos): west c00 (Commons CC BY-SA 3.0), north-west c05
  (Commons CC BY 4.0), north P01 (inventory, reference only), interior nave + choir (reflexcity, reference only).
