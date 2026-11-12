# Façade kit pilot (branch claude/facade-kit, behind `?kit=1`)

Premium Blender pieces placed by rules on the UrbIS street façades, exactly where the procedural façade shader
(viewer/facades.js) paints its windows and doors; within ~115 m the pieces draw, beyond they dither back to the painted
façade. Lab: `labs/kit-lab.html` (`?mode=row` for real I6 houses). City: `viewer/index.html?tile=I6&kit=1&view=stjob`.

## Round 3 (2026-11-12): sealed, anti-aliased, more pieces

Owner's review of round 2: "the kit is nice; we will need more pieces, as long as everything stays very optimized";
close up while moving: thin BRIGHT LINES along a door and its frame, ALIASED / shimmering edges, SAW-TOOTH shadows in
the lab.

| Item | What changed | Result |
|---|---|---|
| 1. gaps | every piece through the shared mesh checker (`tools/mesh_audit/`, copied from `claude/stalle` a3d14ab) with `tools/facadekit/auditKit.mjs`: the PACKED kit as the city draws it (groups that stand together, the wall with the opening cut and NOTHING behind it: in the city the building's inside is culled back faces, so any slit shows daylight), LOD0 (to 28 m) and LOD1 (to 115 m), 3 opening sizes (9-slice), runs at outside / inside / straight joins. Fixed in `tools/blender/facadeKit.py`: surrounds start on the wall plane at the opening edge and share their vertices with the reveal lining (was a 4 mm overlap), the casements meet at x = 0 under a full-height astragal (was a 4 mm slit at the meeting stiles), panes tucked 4 mm into their members, no frame bottom / reveal bottom buried under door thresholds, window B's frame one mitred sweep, bricks / quoins / door surround stacked without shared faces, closed handrail section, plain railings (`balconyP` / `balconnetP`) under 1.1 m, blocks standing on the wall keep their BACK edges sharp (a bevel there was a 6 mm groove against the wall that blinked) | 3558 blocking items before (round 2 kit) -> **0 blocking on every group, both LODs, every size, leak included**; reports in `models/facadekit/audit/` |
| 2. LOD1 | every piece has a scripted FAR variant (no bevels, beads, bolections, knobs; coarser profiles) = its LOD1 source, then meshoptimizer gently (3 mm cap, LockBorder; 8-10 mm on solid mouldings). Round 2 simplified LOD0 by 15 mm: closed parts shrank and opened slits | 0 blocking at LOD1 too; some LOD1s grew (balcony 566 -> 1234 tris) |
| 3. normals | made in `packKit.mjs` per LOD: angle-limited (32 deg) area x angle weighted smoothing, clamped 14.5 deg off the face (no streaks), flat regions flat (no bentflat) | 0 streak / bentflat |
| 4. aliasing | `kitMaterials.js`: (a) SPECULAR AA, the Tokuyoshi & Kaplanyan kernel as Filament's normalFiltering / Unreal's: sigma^2 = 0.25 x (dn/dx^2 + dn/dy^2) of the shading normal, alpha^2 += min(2 sigma^2, 0.18); on top of three r187's own `getGeometryRoughness` (it adds max abs(dFdx / dFdy normalViewGeometry) to the perceptual roughness inside `getRoughness`); (b) the town hall's REGION-WIDTH filter: the packer writes each face's region width (faces joined through < 50 deg turns, the middle principal extent) into `aKitW.x`; once a pixel is wider (0.6 -> 1.6 x) the part shades with the wall's normal and its albedo tends to its covered share; (c) Mr.doob's `filteredPulse` (slop-newyork js/tsl-materials.js, MIT) box-filters the joints, speckle, grain, leaded lights, the number plate's border; per-unit colour jitter fades to its mean below a pixel. Mr.doob has no specular AA of his own: he relies on three's geometric roughness and filters his procedural patterns, so (a) is ours | live switches in the lab panel "Anti-aliasing" |
| 5. corners | cornices, plinths and the new string course are continuous MITRED strips: the end rings of a run shear by z x tan(turn / 2) in the vertex shader (`sliceDelta`), `placement.js joinRuns` joins run ends of the same piece tile-wide (corners, adjoining houses) on their common corner; free ends stop 2 mm short; the 4 mm-overlap corner piece is gone. Arched heads bend onto the true arch of the stretched width (the city cuts that circle) | I6: 230 run joins; no run end cap in the next wall's plane (the city's own cornice flicker cause, docs/CITY_MESH_AUDIT.md: not touched here) |
| 6. lab | the city's shadow box size for the view (main.js orbit formula) instead of a fixed 40 m, gallery walls are closed blocks with the opening cut in the front only (no dark room plane: leaks show as in the city), every new piece, a mitred cornice + string course corner, a dormer on a roof, the flicker test (`labs/flickerTest.js`) and the AA switches in the panel | the saw-tooth came from the single-plane walls and the smaller box; see the screenshots |
| 7. pieces | doorNouveau (curved glazing under an arched rail, whiplash ironwork, crossettes), doorDeco (stepped surround and crown, chevron grille, sunburst fanlight), doorModern (1960s aluminium, side light with the LETTER SLOT and bell plate), garage (sectional, ribbed; built, NOT placed: the façade shader has no garage openings), winC (window A with a leaded stained-glass transom: slot glass_stained), shutter (louvred, folded open), bay (canted oriel, sealed inside), dormer (zinc, over the cornice, only where the roof rises >= 30 deg behind the eaves: `roofAt` from facadeGeom), band (string course), numPlate (blank Brussels enamel plate; the figures come from streetlife) | I6: 40 Nouveau, 52 Deco, 50 1960s doors, 249 winC, 39 shutter pairs, 18 bays, 79 dormers, 103 string-course runs, 282 number plates |

New slots (appended; library names where the library has them): slate, brick_dark, render_white, copper_patina; kit-only
looks: glass_stained, metal_anodised, enamel_blue. kit.json version 3 (a 4th vertex block `aKitW`).

### Round 3 verification

**Flicker test** (`labs/flickerTest.js`, 24 frames, strafe 0.6 mm / dolly 2 mm per frame, golden hour, lab row mode =
real I6 walls with the openings cut and nothing behind), the SAME door A and first-floor window A in both builds: round
2 (d63cca9, served from a separate worktree) vs round 3. Blinking pixels counted on the piece itself (the full-frame
counts are dominated by the painted French-window glass behind the balconies, `facades.js paintedGlass`, ~15k px in both
builds: not the kit):

| view | round 2 | round 3 |
|---|---|---|
| door A, strafe | 77 | 60 |
| door A, dolly | 8 | 23 |
| window A, strafe | 348 | 303 |
| window A, dolly | 40 | 49 |

The vertical blinking line along the door's pilaster / reveal (the owner's "thin bright lines") is gone after the last
fix (back edges of blocks on the wall kept sharp): `round3_flicker_door_*_before / _after.jpg`. What still blinks: the
fanlight's 12 mm iron bars in front of the bright glass and a few dots on frame arrises (geometric coverage, below the
thin-part filter's 0.6 px threshold) and the neighbouring window B's arch soffit at the frame edge. Dolly counts are
small and noisy (8 -> 23, 40 -> 49).

**GPU** (city `?tile=I6&kit=1`, kit toggled inside the page, 3 alternations per view, p50 ms; `tools/facadekit/abInPage.js`).
The owner's other tabs were open and the GPU was busy: the aerial view has NO kit drawn and still moved -0.7 .. +1.4 ms.
These are noise-limited:

| run | street | avenue | close-up | aerial (no kit: noise) |
|---|---|---|---|---|
| 1 | +1.77 (17-19 ms frames: contention) | +3.82 (one 16 ms outlier) | +1.86 | +0.74 |
| 2 | +0.74 | +1.27 | +1.27 | +1.39 |
| 3 | -0.39 | -0.30 | +0.18 | -0.74 |

Draws at street level +80-83 (round 2: +50): 62 kit meshes in use (more piece types; each type with instances in range =
1 opaque + 1 glass draw per LOD). Kit triangles drawn 341-410k (round 2 320-403k). A quiet-machine A/B is still needed;
the per-slot multi-draw (or merging the rare piece types into shared meshes) is the next optimisation.

**Images**: `round3_lab_doors.jpg`, `round3_lab_windows.jpg`, `round3_lab_mitred_corner.jpg`, `round3_lab_corner_dormer.jpg`
(midday, city shadows), `round3_city_street_strip.jpg` (walking the street east of Place de Saint-Job, `?kit=1`),
`round3_lab_row_strip.jpg`, `wip/blender_*.png` (Cycles previews of every piece, baked).

**Weak points**: the lab's 2.9 cm shadow texels still show stair steps under the cornice (that is the city's shadow
setup itself, now the same in both: the clean-buildings pass in docs/TODO.md); garage doors are not placed; the number
plates are blank; LOD1 of the balconies grew to 1.1-1.2k triangles to stay leak-free; 62 kit meshes at street level;
the painted French-window glass blinks under motion (facades.js); doors on sloping streets still start at the façade
base (DTM bank in front, see the strip).

## Round 2 (2026-11-06)

| Item | What changed | Result |
|---|---|---|
| 1. rooms behind the glass | the kit glass runs the painted window's own code (`facades.js paintedGlass`: same window grid, interior-mapped room, lace / drapes, lit rooms at night via env.uNight, dirt, analytic sky); per instance the face it sits on (aKitF = u0, width, base, rnd + door street + French code) | the kit windows show the same rooms as the painted ones: the hand-over at 85-115 m is no longer a hollow-to-room change (`round2_sbs_close_r1.jpg`) |
| 2. draw calls | one OPAQUE draw per piece x LOD (the named slot per vertex in aKitV.w, the building's variant per instance: stone white -> blue, frames white -> dark, brick red -> yellow, switched in the shader) + one GLASS draw per piece x LOD with windows | kit meshes in a busy street 65 -> 37; total draws added by the kit (in-page A/B, kit walls included both ways) +50 at street level (37 meshes + LOD0 shadow casters); 4 kit materials instead of 20 |
| 3. fade | band 20 -> 30 m (85-115 m); same IGN dither both sides; rooms matching makes the dither between similar pixels | pop meter (`tools/facadekit/popMeter.js`, the SMOOTH_LOD metric, frozen view, LOD eye walks 200 m in 50 steps): steps > 1.5 % = 2 with or without the kit (the same two steps: other systems); per-step change inside the kit band 0.34 % -> 0.23 % |
| 4a. steps | the DTM under each tread (both sides of the door); a buried step and those after it are dropped; step blocks run 0.6 m down (never float) | I6: 70 steps -> 28 (42 were buried) |
| 4b. one front door per house | a pre-pass per building: the widest street face carries the door; on its other street faces the door bay is a window (the kit walls paint a window there too: aKit.z, also in the far "no cut" wall material, so nothing changes at the hand-over) | I6: 511 doors -> 280 |
| 4c. French window | new pieces `frenchWin` (storey floor to window head, panelled kick rail, tall casements, transom) + `balconnet` (shallow slab, 0.95 m railing) + `balcony` rebuilt for it (0.95 m railing, stretches along x only); the wall cut / painted window run down to the floor for that bay (aKit.w) | 53 French windows on I6 (24 balconies, 29 balconnets); no balcony in front of an ordinary window any more |
| 5a. window B LOD1 | scripted far variant `winBfar` (the arch as one band, quoins as strips) used as LOD1 | 1233 -> 317 triangles |
| 5b. skipped faces | an opening wholly off a face (stepped wall, annex, gable) no longer disqualifies it; a partly covered one still does | I6 kit faces 555 -> 741, skipped 262 -> 76 |

GPU, kit toggled inside one page (3 alternations, p50 ms, another agent's tab possibly rendering):

| View | kit off | kit on | delta | draws off -> on | kit triangles |
|---|---|---|---|---|---|
| street level, row east of Saint-Job | 6.88 / 7.14 / 6.82 | 7.60 / 7.73 / 7.27 | +0.59 (round 1 ~ +1.0) | 415 -> 465 | 341k |
| down Chaussée de Saint-Job | 5.70 / 5.70 / 6.23 | 6.49 / 6.42 / 6.23 | +0.50 | 420 -> 470 | 320k |
| close-up of the row (6 m) | 6.62 / 6.95 / 7.14 | 8.26 / 7.54 / 8.32 | +1.14 | 430 -> 480 | 403k |
| aerial 230 m | 7.08 / 7.21 / 7.34 | 7.34 / 7.93 / 7.21 | +0.28 (in the spread; no kit drawn) | 401 -> 401 | 0 |

Main thread: re-bucket 0.3-0.5 ms (max 1.9-2.7 ms), adding a tile's kit 3.7-3.9 ms once; moving camera (6 s dolly 170 -> 8 m,
fresh load): p50 16.6 ms, 2 frames of ~30 ms, no long task, no buffer growth.

Pieces now (LOD0 / LOD1 triangles): winA 2696 / 351, hood 364 / 60, winB 5051 / 317, frenchWin 3188 / 408, sill 62 / 14,
soup 430 / 66, doorA 4262 / 504, doorB 2482 / 306, balcony 4686 / 566, balconnet 3822 / 454, cornice 142 / 30,
cornCorner 140 / 28, modillion 320 / 38, plinth 34 / 10, step 38 / 14.

Still weak after round 2: a few UrbIS solids hold two houses, so "one door per house" can leave one of them doorless;
doors on sloping streets still start at the façade base (the door itself can be partly below the DTM); the opaque
material evaluates every slot look in a branch per pixel (cheap with the stand-ins, to re-check with the library's heavy
materials: switch per piece then); 37 kit meshes is "a few dozen" but a per-slot multi-draw would still halve it.

## Pipeline

| Step | Where |
|---|---|
| 13 pieces, scripted (mitred moulding sweeps, bevels, real reveals), Cycles per-vertex AO with the wall / ground as occluders; named library slots; UV0 in metres | `tools/blender/facadeKit.py` (`blender --factory-startup -b -P tools/blender/facadeKit.py -- models/facadekit/src [--previews docs/facadekit/wip] [--only a,b]`) |
| weld, 9-slice classes, uv flags, meshoptimizer LOD1 (position-welded, the town hall's method), compact planar binary | `node tools/facadekit/packKit.mjs` -> `models/facadekit/kit.json` + `kit.bin` (1.5 MB) |
| placement rules (in the tile worker, inside `analyseBuildings`): openings from `viewer/interior/facadeWindows.js` with the shader's float32 values, every opening checked on the face's triangles, plane depth read under each opening | `viewer/facadeKit/placement.js`, `viewer/facadeGeom.js` (opts.kit), `viewer/tileData.js` |
| kit faces in their own wall mesh; its material cuts the openings (window B's segmental head too) where the kit draws; out of reach the plain wall material (early-z back) | `viewer/facades.js` `wallMaterial({ kit: true })` |
| one shared instanced field: piece x LOD x (slot -> material); 24 m cells, widened view cone, re-bucket on 2 m / 8 degrees | `viewer/facadeKit/kitField.js` |
| fades: kit <-> painted 95-115 m, LOD0 <-> LOD1 22-28 m (LOD0 casts shadows: they fade with it), per-tile fade with streaming; the wall and the pieces use the same dither, so a pixel shows exactly one | `viewer/facadeKit/kitFade.js` |
| materials: slot adapter table + the ONE line `SOURCE` ("temp" stand-ins now, `../materials/library.js` once claude/materials lands), AO, 9-slice stretch, uv follows the stretch | `viewer/facadeKit/kitMaterials.js` |
| city hook (3 lines in main.js), exclusions (interior BU 1786120 with ?interior=1, Observatory + town hall BU_IDs) | `viewer/facadeKit/cityKit.js` |

## Pieces (triangles LOD0 / LOD1)

| piece | tris | slots |
|---|---|---|
| winA: white-stone architrave + keystone, 20 cm reveal, casements + transom light | 2696 / 351 | stone_white, wood_frame_white, glass_window |
| hood: frieze + hood cornice (dropped under low eaves) | 364 / 60 | stone_white, zinc_roof |
| winB: segmental brick arch (rowlock), brick quoins, arched frame | 5051 / 1054 | brick_red_brussels, wood_frame_white, glass_window |
| sill: blue stone, drip groove, rounded nose | 62 / 14 | stone_blue |
| soup: soupirail block, grille, dark glass | 430 / 66 | stone_blue, glass_window, cast_iron_green |
| doorA: pilasters, frieze + hood, 4-panel oak leaf with bolection mouldings, fanlight + iron ring, threshold | 4262 / 504 | stone_blue, wood_frame_dark, glass_window, cast_iron_green, painted_metal_white, zinc_roof |
| doorB: chamfered band surround, lintel, half-glazed leaf, transom | 2482 / 306 | stone_white, stone_blue, wood_frame_white, glass_window, painted_metal_white |
| cornice run (1 m, stretched) | 142 / 30 | stone_white, zinc_roof |
| cornCorner (mitred outside corner) | 140 / 28 | stone_white |
| modillion | 320 / 38 | stone_white |
| plinth run (1 m, stretched) | 34 / 10 | stone_blue |
| step (1.5 m) | 38 / 14 | stone_blue |
| balcony: moulded slab, scrolled consoles, cast-iron railing with C-scrolls | 4686 / 570 | stone_white, cast_iron_green |

Variants per building (BU_ID hash, wall style): stone_white -> stone_blue, wood white -> dark (= the shader's own dark
frames), brick red -> yellow. Tile I6: 555 kit faces, ~6.3k instances (885 windows, 511 doors, 53 balconies, 263
soupiraux, 279 cornice runs + 1524 modillions, 1326 plinth runs, 70 steps).

## Numbers (2026-11-05, this machine, Chrome WebGPU, 1280x720 x1.5)

Measured while another agent's Tree Lab tab was rendering on the same GPU, so absolute GPU ms drift run to run (kit=0
street 5.7 -> 7.2 ms over the session); the A/B below toggles the kit INSIDE one page, alternating, same frames:

| view | GPU p50 kit off | GPU p50 kit on (3 alternations) | delta |
|---|---|---|---|
| street level, terraced row east of Saint-Job | 6.88 / 6.88 / 6.82 | (9.24) / 7.73 / 8.00 | ~ +1.0 ms |
| down Chaussée de Saint-Job to the church | 6.42 / 6.29 / 5.77 | 7.67 / 6.62 / 6.75 | ~ +0.6 ms |
| aerial (230 m) | 7.34 / 7.27 / 7.27 | 7.93 / 7.34 / 7.47 (cut forced on) | ~ 0 with the automatic plain-wall swap |

Separate reloads, kit=0 vs kit=1 (spread over 3+ runs each): street 5.74 / 6.69 / 7.16 vs 7.32 / 7.42 / 7.66 / 8.06 /
8.15 / 8.39 ms; aerial 6.63 / 7.46 / 7.87 vs 6.88 / 7.27 / 7.38 / 8.07 / 8.28 / 8.97 ms.

- draws at street level: +65 kit instanced meshes in use (+73 total with the kit walls); aerial +12 (kit walls only)
- kit instances drawn at street level: 1764 (365k triangles); all 9 loaded tiles hold 33.6k instances
- main thread: re-bucket 0.1-0.5 ms (max 3.3 ms), tile add (cells) 3.6-4.4 ms once per tile; the placement runs in the
  worker (façade analysis 155 ms incl. the kit for I6); no shader build after boot (84 meshes compiled in the warm-up)
- moving camera (6 s dolly 170 m -> 8 m through both bands): kit off 0 frames > 25 ms (max 22.8); kit on 4-5 frames
  of 25-33 ms, in runs (GPU-bound frames at the vsync edge with the other tab rendering, not CPU hitches: re-bucket max
  1.2 ms during the dolly)

## Screenshots

- `sbs_street.jpg`, `sbs_close.jpg`, `sbs_g6_corner.jpg`: before / after (city_*_before / _after.png)
- real photo vs our street: `data/raw/refs/facadekit/sbs_g6_corner_photo.jpg` (git-ignored; Commons CC BY-SA 4.0, see
  SOURCES.md there)
- `lab_gallery.png`, `wip/blender_*.png` (Cycles previews of every piece)

## What still looks weak (honest list)

- Temporary materials: flat-ish stand-ins until the library (claude/materials) is switched on (one line, SOURCE).
- Glass is a dark reflective pane; the painted windows had interior-mapped rooms and curtains, the kit windows look
  emptier up close (next: reuse facades.js interiorRoom on the kit glass).
- The 95-115 m dither band reads as screen-door noise on a still frame (no TAA here); a narrower band or TAA would hide it.
- Draw calls: ~65 kit meshes in a dense street, more than "a few dozen": one InstancedMesh per piece x slot x variant x
  LOD. Next: merge per slot (BatchedMesh / multi-draw indirect) or bake variants into per-instance parameters.
- winB LOD1 stays at ~1050 triangles (63 separate bricks can't collapse): needs a scripted far variant (arch as one band).
- Data limits: UrbIS eaves sometimes sit one storey low (the rue Basse corner house has 2 storeys, the grid sees 1);
  doors land on the facade base, so on sloping streets the steps and thresholds are often buried in the DTM bank, and
  corner houses get a door on each street face.
- Balcony: a slab + railing in front of an ordinary window (real ones go with French windows: needs the cut to extend
  the opening down).
- 32 % of eligible street faces are skipped (an opening not fully on the face: mostly gable triangles that are their own
  face); those stay painted.
- No kit on render style 5, flats > 16 m, shopfront ground floors (kept painted).

## Next piece sets

1. Interior-mapped kit glass + net curtains; French window + balconnet (opening cut to the floor).
2. Dormers and roof pieces (zinc dormer, roof window, chimney pots), gutters + downpipes.
3. Bay windows (oriels) and bow windows, the most typical Uccle 1900-1930 feature.
4. Art nouveau / art deco set (sgraffito panels, horseshoe arches, wrought-iron), brick banding and string courses.
5. Shopfronts (fascia, pilasters, roller shutter box) on the OSM shop faces; garage doors.
6. Corner pieces: cut-corner door, quoins (stone / brick toothing).
