# Visual fixes (owner playtest 2026-11-14, items 3, 4, 10 + the black squares)

Branch `claude/visual-fixes`. Each item: what the owner saw, the cause found in the city, the fix at the source,
before / after from the same view (`docs/visual-fixes/`), the cost. Reference checks were look-only (Wikimedia
Commons photos, Google Street View); nothing from Google was stored.

## 1. Car fronts "all look wrong" (faceted:hatch_c at Place Saint-Job)

**Cause.** Two things, shared by all eight types of `tools/blender/carFaceted.py`:

- **Normals.** The exporter wrote one FLAT normal per triangle (`tri_soup`), on purpose (the "faceted" style). With
  the clear-coat paint every facet mirrors a different patch of sky, so the bonnet, the doors and the bumper break
  into hard bright / dark bands (`car_front_before.jpg`, `car_side_before.jpg`). No inverted faces were found: the
  shading was flat by design, not broken.
- **Proportions.** The nose was low (bonnet edge 0.73-0.75 m) and almost vertical down to a bumper flush with the
  lamps; the head lamps were a 12 cm strip on the fascia only, with an amber facet at the corner; the lamp inside
  was a grid of 1 cm chrome rims round each facet.

**Mr.doob's cars (slop-newyork, `js/cars.js`).** No such bands: his bodies are lofted from ~45 smooth cross-sections
with smooth normals (rounded plan corners, a bonnet that rolls into the fascia), and all the small detail (lamps,
grilles, seams) is painted by one TSL material from object-space position / normal. His lamps are wide and low
(head lamp half-width 0.24 m, half-height 0.05 m, at |x| 0.6). Our cars keep real geometry for the detail (inset
lamps, grille slats, plates), so the fix takes his lesson (smooth panels) without his method.

**Real cars (look only).** Golf VIII (Commons), Mazda 2 / Polo / Octavia parked in Uccle (Street View, Brugmann and
Victor-Emmanuel III): smooth glossy panels; slim wide head lamps right under the bonnet edge that wrap round the
corner onto the wing; a big dark lower intake in a bumper that stands proud of the lamps; tail lamps that wrap from
the tailgate onto the rear quarter, dark smoked red by day.

**Fix (Blender, `tools/blender/carFaceted.py`, rebuilt `models/cars/faceted.glb`).**

- `smooth_shade()`: smooth shading with WEIGHTED normals (Blender's Weighted Normal modifier, face area, keep sharp):
  hard edges where faces meet at more than 35 degrees, where the material changes (paint / lamp / trim / seam grooves)
  and on open borders; long thin faces (length^2 / area > 12) stay flat (no streaks); the underbody n-gon and the arch
  liners stay flat; zero-area triangles from n-gon triangulation are dropped. `tri_soup` exports Blender's corner
  normals instead of face normals.
- Fascia: noses 2-3 cm higher (HN), lamp bands 2 cm taller (lampH 0.17 -> 0.19 default), the fascia raked back
  (L3 / L4 / L5 rakes 0.025 / 0.10 / 0.16 -> 0.06 / 0.13 / 0.19) so the lamps sit back on a sloped nose and the bumper
  stands proud below them.
- Wrap-round lamps: a new side station just behind each fascia corner (`z_wrapF`, `z_wrapR`); head lamps and tail
  lamps that reach the corner continue 11-20 cm along the wing / quarter (vans excepted).
- Lamp insides: ONE lens per lamp (region inset) instead of per-facet chrome rims; head lamps get a bright DRL ring
  round a smoked reflector (`head_in`, palette entry 30) and keep the projector cups (front-facing facets only); no
  amber facet. Saloon: the full-width chrome boot garnish (a white slab in daylight) removed.

LODs (`viewer/drive/carLod.js`, `PACK_SOURCES.faceted.smooth`): the near LOD (< 2 cm error) welds on the normal too,
so hard edges stay seams and the panels keep their normals; the far LODs weld as before (position + colour + kind)
and give each vertex the mean of its corners' normals; LOD3 (loose) the same. Before, every LOD rebuilt flat normals.

Images: `car_front_before/after.jpg`, `car_side_before/after.jpg` (city, Place Saint-Job, same camera),
`car_lods_after.jpg` (LOD0 14 m / LOD1 38 m / LOD2 95 m), Cycles sheets `docs/cars/faceted_*` (after) and
`docs/visual-fixes/cars_before/` (before).

## 2. Tail lights grainy, sparkling red (white saloon)

**Cause.** Geometry, not a texture: each tail-lamp facet was inset on its own (`inset_individual`) with a 4-8 mm dark
red rim and a 1.2 cm recess between facets, so a lamp was bright-red tiles separated by dark grooves 1-2 px wide at
15-40 m, which crawl and sparkle as the camera moves (and the LOD simplifier cut them differently per LOD). The
emissive at night is a plain colour (no noise / hash in `packMaterial`).

**Fix.** One lens per lamp: dark-red rim (2 cm) and a bright inner lens, no grooves; the lamps wrap round the corner
like real ones. Flicker test (strafe, 24 frames, region = the tail lamps of the hatch_c at Place Saint-Job): 12 m
41 -> 19 blinking pixels; 24 m 59 -> 56 (that box includes the car's silhouette edges, which blink under any move).
Night: the traffic's tail lamps glow as one clean shape (`tail_night_after.jpg`).
Images: `car_tail_before/after.jpg`, `tail_24m_before/after.jpg`, `tail_night_after.jpg`.

## 3. Blank party walls: empty, with aliased dashed black lines

**The dashed lines (cause).** In the painted façade shader (`viewer/facades.js` `wallMaterial`) the window grid's
vertical pulses used `filteredPulse`, which is PERIODIC. A door's pulse starts at the storey floor (0), so the box
filter of the pixel row just under each storey line (h = 3.4 m) picked up the NEXT storey's door: a 1-3 px row of
"opening" (frame colour + a 12 cm bump step) over every door bay. The bump normal turns that row lit or dark per 2x2
pixel quad: a dashed black line. On a normal façade the next storey's window hides it; on a blank wall (windows
off above the eaves, or a party wall) it stands alone. Found with the shader term switched off one by one.
**Fix:** the y pulses are box-filtered over the pixel on the storey's OWN coordinate (`pulseY`, `yl = gy - floor(gy)`),
not periodic. Images: `dashes_before/after.jpg` (6 degree zoom on Place Saint-Job's side wall).

**Also on those walls: the tram contact wire.** A 1.2 cm, 4-sided instanced cylinder: sub-pixel from ~10 m, so MSAA
caught it on some pixels only (a dotted dark line across the walls behind it). Now the railway catenary's AA wire
(`viewer/rail/railway.js`): a camera-facing ribbon widened to >= ~1 px in the vertex shader, its real width as
alpha-to-coverage (`viewer/tram.js`, `?aawire=0` = the old cylinders). 2 triangles per 4 m segment instead of 16.
Images: `wires_before/after.jpg`.

**Life on blind walls.** Brussels gables left bare above a lower neighbour keep the ghost of an older, taller
neighbour: the outline of its roof with the black bitumen flashing along it, the old room plaster inside it (half
fallen off on brick), a soot-dark flue strip; grey cement repair patches; rain streaks under the coping. Painted in
the same shader on blind walls (`aBld.y` = 999: separate buildings) and on the windowless wall above the eaves of
faces 4 m+ wide (the blank upper walls the window grid leaves, Place Saint-Job's): 70 % get a ghost (pitched,
35-45 degrees, eaves 5.2-7.6 m, or one in three a flat-roofed block), rendered walls only a weathered tint inside
it. Every edge is box-filtered over the pixel (no new aliased line), only low-frequency noise. Images:
`partywall_before/after.jpg`. Not done: real murals, Eternit / slate cladding, the real neighbour's roof height
(the shader has no neighbour height; `facadeGeom.js` could pass it).

## 4. Black squares under the recycling bins (E4, -634, -256)

**Cause.** The two underground-container chutes (`viewer/streetlife/kits.js` `chute`) stand on a 1.6 m platform
modelled as a 2 cm slab of `steel_dark` (albedo 0.045, metalness 0.75): in the shade it renders black. The slab also
sat ON the paving (2 cm proud, floating edges on a cross-fall).
**Fix.** A matt galvanized tread plate (new slot `galvanized`, appended to SLOTS) in a dark steel rim, both sunk 4-5 cm
into the paving (top 6 / 12 mm proud: the JOINS rule), the column seated on it. Images: `bins_before/after.jpg`.
Not checked: Street View of that exact spot (the square's panoramas did not show the chutes); the platform follows
the common Brussels pattern of a metal plate round the inlet column.

## Cost

GPU time: NOT measured. Preflight was RED all session (another agent rendering: GPU 72 % busy at rest, 1 GB RAM
free), so no GPU ms are quoted. Counts:

| car fleet | before | after |
|---|---|---|
| draws | one InstancedMesh per type x LOD (plain + fade) | unchanged |

Triangles per car type and LOD (merged body + wheels; LOD distances 22 / 55 / 130 / 420 m):

| type | LOD0 | LOD1 | LOD2 | LOD3 |
|---|---|---|---|---|
| hatch_s | 7,671 -> 7,736 | 4,125 -> 5,552 | 2,063 -> 2,036 | 276 -> 279 |
| hatch_c | 7,588 -> 7,727 | 4,196 -> 5,709 | 2,162 -> 2,147 | 309 -> 303 |
| estate | 8,229 -> 8,331 | 4,499 -> 5,973 | 2,321 -> 2,248 | 306 -> 317 |
| saloon | 8,114 -> 8,261 | 4,308 -> 5,857 | 2,260 -> 2,197 | 324 -> 325 |
| suv | 7,862 -> 8,024 | 4,274 -> 5,817 | 2,270 -> 2,247 | 310 -> 307 |
| van_c | 7,778 -> 7,859 | 4,214 -> 5,579 | 2,214 -> 2,141 | 310 -> 296 |
| van_p | 7,554 -> 7,622 | 3,988 -> 5,306 | 2,108 -> 2,012 | 302 -> 290 |
| taxi | 8,639 -> 8,773 | 4,895 -> 6,411 | 2,315 -> 2,258 | 307 -> 315 |
| all 8 | 63,435 -> 64,333 (+1 %) | 34,499 -> 46,204 (+34 %) | 17,713 -> 17,286 (-2 %) | 2,444 -> 2,432 (-0 %) |

GLB 4.55 MB / 106k vertices -> 2.9 MB / ~60k vertices (smooth panels share their vertices). LOD1 costs more because
the hard edges are seams the simplifier must keep; in a street view ~10-30 cars sit in the 22-55 m band (+1.4k
triangles each).

Façade shader: a handful of extra ALU per wall pixel (3 hashes, 3 value-noise taps, box filters), no texture.
Tram wire: same draw count, 87 % fewer triangles. Chutes: 12 more triangles per chute.

## Mesh audit (`tools/mesh_audit`, cars at 55 m)

All 8 types together at 55 m (the cars overlap at the origin, so most coplanar / crossing items are car-against-car
and pre-existing): before 22,816 blocking (coplanar 17,864, crossing 4,952), after: coplanar 18,101, crossing 5,393,
flipped 0, streak 28, bentflat 165. The new kinds come with smooth normals: streak = a few stretched triangles at
tailgate corners and under the car; bentflat = 4-6 degree bends across near-coplanar roof / shoulder facets (the
intended curvature) and pieces of the boolean-cut underbody near the arches. Guards in `smooth_shade` / `tri_soup`
took them from 76 streak / 176 bentflat / 4 flipped to these numbers. Cycles sheets in `docs/cars/` were rendered
one guard earlier (corner normals on a few hidden triangles differ; geometry identical).

## Shared files touched (for the merge)

- `tools/blender/carFaceted.py`: TYPES (HN / lampH of hatch_s, hatch_c, estate, saloon, taxi), REAR saloon garnish,
  PAL (+ `head_in` at the END), `Ls` rakes, SZ wrap stations, `band_mat` (wrap branch at its top), the lamp inset
  block, `smooth_shade()` (new, before "bake + export"), `tri_soup` (corner normals, zero-area skip), main loop
  (`smooth_shade` after `build_car`).
- `models/cars/faceted.glb`, `docs/cars/faceted_*.png` (regenerated).
- `viewer/drive/carLod.js`: `simplifyWelded`, `simplifyLoose`, `flatten`, `lodMesh`, `lodOpts` (new `smooth` option).
- `viewer/drive/carPacks.js`: `PACK_SOURCES.faceted.smooth = true`.
- `viewer/carFleet.js:103`, `labs/night-lab.js:101`, `labs/impostor-cars.js:101`: pass `smooth` to the LOD worker.
- `viewer/facades.js` `wallMaterial`: `pulseY` after `const fl`, the 7 `filteredPulse(gy, ...)` calls, the blind-wall
  block after `if (wl) col = wl.col;`.
- `viewer/tram.js`: imports, `WIRE_R` / `wireMaterial()` after the constants, the contact wire block.
- `viewer/streetlife/kits.js`: SLOTS (+ `galvanized` at the END), `chute()`.

## Left

- Car bodies are still built from 7 plan loops: the smooth normals remove the banding, but silhouettes stay
  polygonal close up (a lofted body like Mr.doob's, or subdivision of the tub, is the next step); tail lamps have no
  light-guide graphics; the grille is taller than a Golf's slim one.
- LOD1 (22-55 m) costs ~34 % more triangles than before (normal seams constrain the simplifier); averaging the
  normals there too (as LOD2-3) would bring it back to the old count at the price of softer creases at mid range.
- Remaining mesh-audit items on the family are mostly pre-existing (coplanar / crossing: lamp and plate insets).
- GPU ms before / after on a GREEN preflight.
- Seen on the way: the white saloon at Montagne de Saint-Job (1136, 690) is parked ON the sidewalk (for the parked-car
  work).
