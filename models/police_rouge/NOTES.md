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
