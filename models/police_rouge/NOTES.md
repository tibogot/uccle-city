# Uccle police station (Commissariat Central "Marlow", Rue Rouge 17, 1180 Uccle): the scripted hero + its yard

Police zone 5342 (Uccle / Watermael-Boitsfort / Auderghem), open 24/7, public access from Rue Rouge 17. In use since 1998
in a former school building of the commune (BX1, La Libre 2025: "obsolete", a move to Rue de Stalle 96 is planned but not
final, so Rue Rouge 17 is modelled). A three-storey 1960s-70s block in buff brick with a projecting flat concrete cornice,
two wings stepped round the public entrance, a parking yard for the patrol cars between it and Rue Rouge, behind a rubble
stone wall with a green mesh fence and a hedge. Replaces UrbIS solids **528055** (the station, BU building/1674458) and
**528772** (the low link behind it, the same BU). NOT replaced: 531654 (the school's stair block it abuts, BU 1726674)
and 528056 (the neighbour's double garage north of the yard, BU 1593213: seen on Street View behind the house at n° 13).

## Sources
FREE (shippable, CC0 / open):
- UrbIS 3D BuildingSolids, DSM / DTM 2021 0.5 m, Ortho 2024 (paradigm.brussels, CC0): `tools/police_measure.py` ->
  `site.json`, `site_dtm.*`; an 8 cm WMS crop of the ortho (Ortho2024NS, `data/raw/refs/police_rouge/ortho_2024_crop.jpg`,
  git-ignored) resampled in the building frame with a metre grid: `tools/police_ortho_frame.py` (roof equipment, solar
  rows, yard markings, cars, hedge, gate opening read in metres).
- police.be (zone 5342 pages: the address, 24/7, access from Rue Rouge 17), BX1 / La Libre 2025 (history, the planned move).
NOT FOUND: Wikimedia Commons has no photo of the station (searched: "Uccle police", "Rue Rouge" Uccle, geosearch 150 m
round the address: only the Wolvendael park photos); Mapillary's API needs a key (not used); the Brussels heritage
inventory (monument.heritage.brussels) has no entry for Rue Rouge 17 that the site's search reached (the gym said to be
listed by BX1 belongs to the school next door, not modelled here).
LOOK-ONLY (never traced, stored in the repo or shipped): Google Street View, April 2024, four panoramas on Rue Rouge
(n° 17 north and south of the entrance, n° 2 / 13 further north), looked at in one Chrome tab for proportions, counts and
colours; NO pose was solved on them (they are not stored), so the lab has no photo overlay: positions below are the
ortho's (metres) and the Street View proportions read by eye.

## Frame
Origin city (-514.182, -340.015), rotation -33.577 deg (both solids' plan). u runs north-east toward Rue Rouge (u+ =
the street, bearing 56 deg), w along the street (w+ = south-east, bearing 146 deg). Rue Rouge runs along w: its kerb
at u 29.8, the sidewalk u 26.5-29.8.
- Wing A (528055, the north block, 3 storeys): u -0.77..14.6, w -14.1..0.5 (15.4 x 14.6 m).
- Wing B (the south block, 3 storeys): u -4.8..5.35, w 0.5..12.6 (10.1 x 12.1 m), set back 9.3 m from wing A's front.
- The step between them: wing A's south face w 0.5 from u 5.3 (inner corner) to 14.6 (the outer corner = the public entrance).
- Link (528772, one storey): u -6.56..-0.75, w -3.78..2.4 (notched round wing B's corner), behind both wings.
- Ground (DTM, 1 m out): 47.65 at wing A's front, 47.87 at the step, 47.74 round wing B, 47.52 at the north face; the
  yard falls to 47.0 at the wall (u 26.5) and the street is 46.8-47.2; the gardens south of w 17 are 1-2 m higher.
- Roof (DSM): flat, 58.8-58.9 m bare (p5-p25), 59.1-59.2 on the solar rows; UrbIS eaves 58.69, top 58.85.

## Counted, FACADE BY FACADE (Street View look-only + ortho; before modelling)
Levels (Street View proportions on the UrbIS heights; ESTIMATED to +-15 cm): ground floor 47.85, first floor 51.35,
second 54.80, roof deck 58.62, cornice top 58.90 (a projecting concrete fascia slab 0.6 m tall, 0.35 m proud, mitred at
the corners). Plinth of grey stone to 48.25. A slim concrete band at the first floor (51.20-51.35). Windows: white
frames, three lights over a low row of three (transom at a third), concrete sill; exterior roller screens (beige
fabric) on most, lowered at various heights on about half (as seen). Brick: buff / sand-yellow, stretcher bond.

WING A FRONT (NE, u 14.6, w -14.1..0.5, 14.6 m; the face to the patrol-car yard; Street View n° 2 frontal, n° 17 oblique):
- 1st and 2nd floor: 3 windows each in the SOUTH half (centres 1.6 / 4.0 / 6.4 m from the outer corner, 1.9 m wide,
  0.5 m brick piers); the north half (8 m) blank brick.
- Ground floor: the grey corner pier (0.6 m), a glazed door unit (1.2 m, anthracite aluminium) beside it, a memorial
  plaque (stone, ~0.8 x 0.6 m), 4 windows 1.35 m wide (centres 4.0, 6.45, 10.1, 12.65 m from the corner; the two north
  ones with their screens down).
- A blue blade sign at first-floor level by the outer corner ("Police" + the official emblem on the real one: here a
  plain "POLICE / POLITIE" lettering slot, no emblem); 3 CCTV cameras on brackets (corner + mid-face); cable runs (not modelled).
- Three flagpoles in the yard in front of it (Belgium, Europe, Europe in April 2024).

THE STEP (SE face of wing A, w 0.5, u 5.3..14.6, 9.3 m; Street View n° 17 south):
- Ground floor: THE PUBLIC ENTRANCE: an anthracite aluminium glazed screen over nearly the whole width (u 6.2-13.6),
  two pairs of glass doors, a transom; the grey corner pier at the outer corner. NO canopy (none seen).
- Upper floors: blank brick but for the STAIR WINDOW: a tall narrow strip (1.0 m) by the inner corner (u 5.6-6.6) from
  the first floor to the top floor, a white spandrel at the half-landing.

WING B FRONT (NE, u 5.35, w 0.5..12.6, 12.1 m; the face to the south yard; Street View n° 17 south, n° 2 oblique):
- 1st and 2nd floor: 3 windows each by the inner corner (centres 2.25 / 4.65 / 7.05 m from it), the south 4.6 m blank.
- Ground floor: red-brown brick (the base storey of this wing), 2 windows (under the 1st and 3rd), a glazed door between
  them, a grey pier; the concrete band over it.

WING B SOUTH (SE, w 12.6, 10.1 m), WING B BACK (SW, u -4.8), WING A NORTH (NW, w -14.1, 15 m), the link: NO view
(the south one hidden by trees, the backs face the school's courtyard, the north one a narrow service strip).
**ESTIMATED**: the same window type and rhythm (wing B south: 3 per floor; wing A north: 4 per floor + a service door
and 2 windows on the ground floor; wing B back: 3 per upper floor), the link as a plain brick box with a flat roof.

ROOF (ortho + DSM): parapet = the cornice's top; bitumen membrane; SOLAR rows (portrait modules ~1.0 x 1.7 m, tilted
~12 deg to the south): wing A 2 rows u 1.6..11.4 at w -11.8..-8.2 and 4 rows u 6.4..11.4 at w -6.5..0.2; wing B 6 rows
u -3.0..2.0 at w 0.6..11.2. Equipment: a dark rooflight (u 3.1..4.8, w -7.2..-5.8), a ventilation box (u 3.4..4.5,
w -5.5..-3.9, DSM 59.9 = 1 m), 2 AC condensers (u 1.0..1.8 w -3..-2; u 3.0..3.8 w -2..-1), 2 vent pipes, a red unit
on the west edge (u -0.2..0.3, w -11..-9.5).

THE YARD AND ITS CLOSURE (ortho + Street View):
- Rue Rouge frontage: a rubble stone wall (grey sandstone, ~0.8 m above the sidewalk, coping stones) along u 26.4 from
  w -20 to 9.6, topped by a dark green welded-mesh fence (~1.1 m, posts every 2.5 m); a privet hedge behind it
  (u 25.2-26.2, w -15..9.5).
- THE VEHICLE GATE (south): the opening w 9.8..14.8 (5 m) between stone piers; a galvanised sliding mesh gate (open in
  April 2024, its leaf parked to the south: ESTIMATED where), a red "no entry except service vehicles" sign on the
  north pier (round sign + a blue plate: modelled as plain discs / plates, no lettering), a pedestrian lane painted to the
  entrance (two white lines, a walker pictogram), yellow-black bollards, a hatched no-parking box (u 13..17, w 11..16).
- THE NORTH GATE: a two-leaf dark green steel gate at w -18.5..-15.3 by the neighbour's pergola; bins behind it.
- Parking: 7 bays angled along the hedge in the north yard (u 20.5..25, w -10..+6, the patrol cars: white with the
  yellow-fluorescent pattern), 2 bays by wing B (u 6.5..11). Marked lines white.
- ESTIMATED: the gate leaf's parked position, the inner galvanised fence along the pedestrian lane (seen, position by
  eye), heights of the fence and gates (by eye), the bins.

## Pipeline (2026-11-12)
```
python tools/police_measure.py [--dump] [--yard]          # site.json (frame, solids, roof, equipment, ground, yard profiles), site_dtm.* (1 s)
python tools/police_ortho_frame.py <out.png> [u0 u1 w0 w1] # the 8 cm ortho crop in the building frame with a metre grid (reading positions)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/police_rouge.py -- models/police_rouge [--no-bake] [--previews] [--fast]
node tools/police_pack.mjs models/police_rouge/police.raw.glb models/police_rouge/police.glb   # audit (stops on blocking), LOD2, meshopt
```
Blender ~30 s with the AO bake (2048 px, 96 samples, the UrbIS neighbours within 45 m as occluders), ~70 s with the
previews (docs/police/preview_*.png, incl. three grazing-light renders); pack ~15 s (mostly the audits). The kit is the
Wolvendael one (tools/blender/wolvendael_kit.py: builder, frames, boxes, lathes, sweeps), imported as is.
Viewer: `viewer/policeModel.js` (loader, slot table, temporary TSL materials, AO, anti-sparkle, the LOD distance to the
building's own box, the lettering atlas), `viewer/policeYard.js` (the yard: asphalt + markings on the city's ground, JS),
`viewer/policeCars.js` (5 parked patrol cars: the faceted car family in a police livery), `viewer/policeCity.js`
(`?police=1`), `labs/police-lab.html` (Police Lab), `debug/policeFlight.js` (city flight + GPU A/B).

## Model (what is geometry)
- Walls as quad grids round the openings (no fans), zones: blue-stone plinth to 48.25, the ground storey (red-brown brick
  on wing B's street and south faces), the concrete band 51.20-51.35 (proud 2.5 cm, swept round the plan with mitres),
  the upper storeys to the cornice soffit 58.30. Reveals 13 cm (brick), the wall's hole 3 cm under each sill top (no slit).
- Windows: white frames (ring 6.8 cm, mullions / transom 8.5 cm, glazing beads back to the glass 4.5 cm behind), three
  lights over a low row (upper floors 1.90 m, ground floor 1.35 m with two lights), precast sills (sloped top, front,
  underside, lugs into the jambs), exterior roller screens (guides on the jambs, the bottom bar, the beige fabric lowered
  as seen); the stair window (1.0 x 5.8 m, a white spandrel at the half-landing); the public entrance (anthracite
  aluminium screen 7.4 m, two pairs of glass doors with push bars, a transom, a blue-stone step), 4 door units.
- The corner pier (blue stone, proud 4 cm on both faces up to the band), the blade sign (blue, POLICE / POLITIE
  lettering from a canvas atlas: no emblem), the memorial plaque, 4 CCTV cameras on arms.
- The cornice: a 0.6 m concrete fascia slab 0.355 m proud with chamfered edges, its top the coping, the parapet's inside
  down to the bitumen deck at 58.62 (cells of the rectilinear plan: no fans).
- Roof: 68 solar modules in 12 tilted rows (a 4 cm module slab, rails, feet, ballast trays), the rooflight, the
  ventilation box with louvres, 2 AC condensers with fan discs, 3 vent pipes with cowls, the red cabinet, a roof hatch
  (ESTIMATED). The link: a brick box with a door, a coping and a deck (ESTIMATED).
- Yard closure: the rubble wall (2.5 m segments following the sidewalk + 0.82 m, blue-stone copings, gate piers with
  caps), the green welded-mesh fence (posts every ~2.5 m, double rails, 4 mm wires every 5 cm: real geometry on LOD0,
  rails only on the far variant), the hedge (a chamfered box, 1.5 m), the galvanised sliding gate parked open south of
  the vehicle gate (bars every 12 cm, the ground rail, the guide post), the two-leaf green north gate (closed), the "no
  entry except service vehicles" disc + plate (lettering in the atlas), 4 yellow-black bollards, 3 flagpoles (tapered,
  ball) with the Belgian and European flags hanging in a light breeze (cloth with folds, two sheets + hems).
- Triangles per slot LOD0: cast_iron_green 5.7k (the fence wires), painted_metal_white 4.4k, galvanised 3.8k, brick
  1.2k, stone 1.0k, flags 0.8k, concrete 0.7k, glass 0.6k, alu 0.5k, signage 0.5k, the rest < 0.2k each.
  Lightmap LOD0 20.2 px/m, far 10.4 px/m, EVERY lightmapped face has texels (2647/2647, 2117/2117); 7.4k thin faces
  take vertex AO.

## Mesh audit (tools/mesh_audit)
- Raw, before the pack: LOD0 **0 blocking** (19,716 tris; warnings: 6.6k slivers = fence wires / rails / long strips,
  728 T-junctions, 12 non-manifold), far **0 blocking** (6,348). Two rounds (the solar feet and ballast trays' bottoms on
  the deck; the wall runs' end caps flush with the gate piers; a CCTV arm flush with its housing; the screen guides'
  bottoms crossing the sills' slope; the wall's hole edge right at the sill top = slits; the flag sheets' open edges;
  the sign disc's open rim; a 12-sided sign post).
- Packed (report only): LOD0 0, LOD1 0, LOD2 13 (meshopt collapses: 3 crossings, 2 depth, 8 slits at sill / gate-pier
  ends; LOD2 only beyond ~440 m, the station < 40 px wide there).

## LODs
LOD0 19,716 tris / 16 draws; LOD1 (scripted far variant) 6,348 / 16; LOD2 (meshopt of LOD1, target 2.5k, 0.12 m stop)
3,351 / 16. The yard: 6,032 tris / 1 draw, at every distance (no pop). Patrol cars: 5 cars, near (pack LOD1) 21,985
tris, far (pack LOD3) 1,538, ~30 draws near (one mesh per part: see weak points). Switch by distance to the BUILDING's
box (its frame): LOD0 < 90 m (+-15), LOD1 < 400 m (+-40); the cars 60 (+-10) and gone 260-340 m. GLB 0.83 MB (raw
2.4 MB), AO PNG 1.6 MB (5.3 MB GPU).

## Verification (this machine, one Chrome tab of mine; another WebGPU tab, a "Night Lights Lab" on port 8829, ran during
## the second half: GPU numbers are NOISY, +-0.1-0.2 ms)
- No photo side-by-side: the only street-level references are look-only (Street View); the lab's "street view n° ..."
  viewpoints stand near those panoramas and were compared BY EYE: window counts and places, the blank halves, the
  stepped corner, the stair strip, the corner pier, the blade sign, the flags, the wall / fence / hedge, the open gate,
  the red-brown base of wing B all match; the cornice reads a little thinner than on Street View.
- Cycles previews: docs/police/preview_street_north.png, preview_entrance.png, preview_aerial.png; GRAZING light
  (Cycles): preview_grazing_front_windows.png, preview_grazing_cornice_corner.png (flat walls clean, sills / reveals /
  cornice cast crisp shadows), preview_grazing_entrance.png (a 9 deg sun from the street along the step: the band, the
  CCTV arm and the mullions cast clean shadows, the wall stays flat); lab (WebGPU):
  docs/police/lab_grazing_front.png (a 9 deg sun skimming wing A's front: no streak), lab_entrance_corner.png.
- Moving through the bands (lab, neighbours hidden): docs/police/lab_lod0_band_moving.png (31 -> 104 m: L0, L0+L1),
  lab_lod1_band_moving.png (299 -> 479 m: L1, L1+L2, L2): no pop seen.
- Flicker (lab, 24 frames): street view n° 2 at 21 m: fixed 0 / strafe 25 / dolly 14 ppm; 95 m: 0 / 9 / 10 ppm
  (docs/police/lab_flicker_95m_dolly.png).
- GPU, lab bench (median whole frame, + = the part, 3 interleaved cycles): street view n° 2: L0 +0.07 / L1 -0.07 / L2
  -0.07, yard 0; the gate view: +0.20 / +0.13 / +0.13; 95 m: +0.26 / +0.07 / +0.07, yard -0.13; 500 m: 0 / +0.07 /
  +0.13 (all within the noise: the station hides what is behind it).
- GPU, city (debug/policeFlight.js bench, station + yard + cars on / off, 4 cycles): 33 m +0.13 ms, 114 m +0.07, 449 m
  -0.06 (noise).
- City flight (900 m -> 40 m -> orbit -> 900 m, 24 s, twice): run 1 1440 frames, median 16.7, p99 16.9, worst 17.3 ms,
  none > 25; run 2 1438 frames, median 16.7, p99 16.9, ONE 50 ms frame at 22.4 s (~450 m, no long task, the other tab
  running); coverage 1.000 and the right material (opaque / fading copy) in every frame of both runs; the cars too.
- Load (city): GLB + AO 517-633 ms; shaders 7.7 s in the city's background queue + 1.9-2.1 s shadow warm, before
  anything shows. City renders: docs/police/city_street_rue_rouge.png, city_aerial_with_wolvendael.png (ring=1).

## Still weak
- No free photo: the facades are the look-only Street View read by eye (no solved pose, no overlay); the back faces,
  wing B's south face, wing A's north face and the link are ESTIMATED; the levels +-15 cm.
- The entrance's glazing has no canopy (none seen) and no interior behind the glass (dark offices + reflection only).
- The yard reads navy in the lab's shade (sky light on a grey albedo; not SSR: switched off, no change); the city looks right.
- The patrol cars: one mesh per part (~30 draws for 5 cars near): instance them per type (carFleet style) if a game
  needs more; the livery has no lettering; the van's Battenburg follows the same 0.40-0.86 m band as the cars.
- The yard markings come from the ortho by eye (bays, lane, hatching); the inner galvanised fence along the pedestrian
  lane (seen) is NOT modelled; the bins and the bike rack are not modelled.
- The sliding gate's parked place is a guess (south, partly over the neighbour's garden line).
- Packed LOD2: 13 audit items (> 440 m).
