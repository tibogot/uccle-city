# Roads round 3 (2026-11-12, branch claude/roads2)

Round 2 (`ROUND2.md`) was honest that it was not clean. Round 3 worked down the coordinator's 8 points. **It is still
not "perfectly right"**: what is clean and what is not is listed per point, with the numbers. Before = commit 6c70e37
(the start of round 2, its own markings), after = this branch, both measured with the round-3 checker
(`docs/roads/audit/r3before`, `r3after`).

## 1. Ramps (dropped kerbs) and the triangle budget

- **Cause** of the 0.6-1 cm open steps: the bateau's height depended on the distance to the ramp's outline, and UrbIS's
  ramp outline and its sidewalk's outline do not coincide (up to 5 cm).
- **Fix** (`viewer/surfaces.js`): each ramp's bateau is defined in its own kerb frame (station s0..s1 along its kerb,
  distance d): low at the kerb, back to KERB at d = 0.85 x RAMP_DEPTH and at both ends over the wings. Every edge that
  is not on the kerb is therefore at the sidewalk's height whatever the outline mismatch. The height is linear between
  the two wing lines, so a ramp is cut along those two lines only (no grid). This was done at load in the road stage,
  not in `build_surfaces.py` (no snapping needed once the heights agree; the data is unchanged).
- **Numbers**: ramp-related cracks gone (concrete T-cracks 2-5 mm: from 753 to 149 city-wide after the back-edge rule;
  pit cracks 1,535 -> 0). Open concrete steps 2,443 -> 2,206: **not ~0**. What remains are mostly 1.5-2 cm steps where a
  median's 15 cm kerb band meets a 13 cm sidewalk, and 0.6-0.9 cm steps at sidewalk / forecourt seams. Not fixed.
- **Triangles: 5.28 M -> 6.37 M over the 120 tiles (+20.5 %). Not within +10 %.** Round 2 was +55 %. Cuts made: the
  ramp mesh (E4 ramps 29.6 k -> 9.2 k base triangles), no kerb chamfer row (the arris is drawn in the shader), no
  skirt inside houses, no sidewalk splitting at bends. Without the curve refinement of point 4 the tiles measured
  +0.6 % (I6) / +9 % (E4); the curves cost the rest. An attempt to skip measured base asphalt under the engine layer
  (-5 %) was reverted: the engine layer has up to 8 mm steps that the base fills.
- City view triangles (I6 / E4 / E1 walk views): +1.4 % / +2 % / +2 %.

## 2. Painted glyphs (Alsemberg / Brugmann)

Checked 7 m above each type against the orthophoto (`round3/glyphs_sheet.jpg`):
- P01 / P04 (arrows): drawn as surveyed.
- P09 (bicycle): the survey keeps only the OUTER outline, so the wheels were filled blobs. Now drawn as the Belgian
  bicycle pictogram (ring wheels, frame) at the surveyed place and heading.
- P53 ("U"), P19 / P08 (fragments of a few cm²), P10, P13: no legend, nothing clear on the photo: **not drawn**.

## 3. The owner's narrowing (I2 1288,-1455)

- **Cause** of the remaining notch: the taper moved the step's corner along the kerb, and the new diagonal crossed a
  ramp polygon cut over the corner, which folded it into a triangle (the light wedge).
- **Fix**: a taper is accepted only if its wedge holds no other ring vertex (shorter tapers are tried); a ramp placed
  over the step's corner becomes plain sidewalk. `round3/pairs/owner1_narrowing[_plan]_before_r3.jpg`: one continuous
  taper, no notch. Kerb notches city-wide 2,570 -> 478 (not 0: U-shaped bays and steps whose wedge would fold are
  left).

## 4. Curves by chord error

- Every kerb and edge vertex turning 1-75° (long arcs included) is refined between its measured points on a
  centripetal Catmull-Rom spline, piece length from the chord error (1.5 cm). Every ring, kerb, edge and flank sharing
  the edge gets the same points.
- C23 now measures the sagitta over the shorter piece: vertices with chord error > 2 cm 18,986 -> 1,338, max 432 cm ->
  3.5 cm. **Not 0**: the 1,338 are spline knots where the turn concentrates (2-3.5 cm). Corners sharper than 75° are left
  as corners.

## 5. C18 as a gate, normal jumps

- C18 counts cracks only between TOP surfaces of ONE layer: the engine layer over the base (1.6 cm apart by design)
  and its tier / crease steps over the base (< 12.5 mm, the base fills them) are excluded, as are vertical faces (kerb
  faces, skirts, pit faces); offsets > 5 mm are steps (checked for a closing face separately).
- Pit cracks: one plane per tree pit -> 1,535 to 0. Asphalt T-cracks 169 -> 142, concrete 69 -> 149 (the ramp cuts;
  was 753 before the back-edge rule). **C18 is a real gate now, but not at 0.**
- Normal jumps where non-UrbIS roads meet: those triangles now take the smooth height field's normal: asphalt normal
  jumps 7,862 -> 0.

## 6. Lane graph

- A lane point (single-lane stacks) off the measured carriageway or < 1.4 m from a kerb moves across the path to the
  nearest place with 1.4 m clearance (or the middle of a narrow carriageway), with a tent envelope; connectors' inner
  points likewise; then every path is smoothed to R >= 4 m with its ends fixed (U-turns excepted). J1's south-west lane
  is back on the street (`round3/pairs/j1_lanes_before_r3.jpg`).
- 120 tiles: points < 1 m from a kerb 234,786 -> 92,945 (C22 kerb errors 23,484 -> 9,345), off-centre 67,208 ->
  17,633, paths with a kink 4,752 -> 1,557, lanes crossing 0. **Not clean**: max turn 327 °/m remains on tight-corner
  connectors whose lane ends leave no room for a 4 m radius, and multi-lane stacks are not centred.

## 7. Every junction, residential and curved streets

Sheets: `round3/sheets/j01..j10_after.jpg`, `round3/sheets/res_sheet.jpg` (Rue Basse, Av. Hamoir, Rue Égide Van
Ophem), `round3/sheets/cur_sheet.jpg` (Rue Edith Cavell, Av. du Directoire, Opstalweg). Seen and fixed this round:
paving zig-zag at corners (one frame per triangle: kerb frame on straight kerbs, the sidewalk's straight frame round
corners: `round3/pairs/curve_corner_*`), tree pits poking over a kerb (25 cm margin), J5 glyphs. Seen and NOT fixed:
- J1: a thin dark line in the NE corner sidewalk (plan view), not traced yet.
- J2, J9, J10: bridges / the underpass at ground level (levels, phase 4).
- J3, J4: tram sites are plain surfaces (no rails in the lab).
- Rue Edith Cavell (a "collector"): a dashed centre line the photo does not show (the phase-1 rule removes guessed centre
  lines on residential types only).
- Rue Basse: engine parking-bay ticks (OSM-tagged parking) the photo cannot confirm.
- Opstalweg (Flemish side, no UrbIS): engine road over the terrain (owner decision 3: engine rules there).
- In the lab, sidewalk edges against houses now show no skirt (it would be inside the building; the lab draws no
  buildings).

## 8. Moving check

The drive strip now follows the lane graph through the junction (`lab.stripLane`): `round3/after/strip_j{1,5,6}_drive.png`
start and stay on the road; walks `strip_j{1,5,6}_walk.png`. Flicker test (24 frames, sub-pixel strafe): J1 45 blinking
px (round 2: 8; the kerb end next to the SE zebra: the new kerbstone joints / arris alias there even after fading them
earlier), J5 82 (the far kerb skirt edge, as before). **Not clean at J1.**

## Checker, 120 tiles (errors; C23 warnings)

| check:kind | before | after |
|---|---|---|
| C14 overlap / photo | 41 / 3 | 26 / 0 |
| C15 decal over decal / hidden / lane through crossing / stop on crossing | 82 / 13 / 79 / 4 | 12 / 1 / 11 / 4 |
| C16 short / stray | 45 / 8 | 3 / 1 |
| C18 asphalt step / T | 1,502 / 169 | 896 / 142 |
| C18 concrete step / T | 2,443 / 69 | 2,206 / 149 |
| C18 pits T | 1,535 | 0 |
| C19 notch / gap | 2,570 / 47 | 478 / 162 |
| C20 paving uv | 265 | 85 |
| C21 asphalt normals / tone | 7,862 / 205,464 | 0 / 0 |
| C22 kerb / kink | 23,484 / 4,530 | 9,345 / 1,331 |
| C23 facets (> 2 cm) | 18,986 | 1,201 |

C19 gaps went UP (47 -> 162): paved islands are now sidewalk class and some meet the carriageway with no kerb line in
the data. Not fixed.

Per junction (errors within 60 m): see `docs/roads/audit/r3after/<T>.json`; e.g. J1 before C1 1, C14 1, C16 2, C18 4,
C19 2, C20 1, C21 304, C22 93, C3 1, C4 2, C8 6, C9 5 -> after C1 1, C18 2, C22 26, C4 2, C8 6, C9 5; J5 C18 3, C19 1,
C21 365, C22 106, ... -> C18 2, C19 1, C22 57, ...; J8 -> C18 2 only.

## City (A = 6c70e37, B = this branch; walk view, 8 s of GPU timestamps after load, GPU quieter than in round 2)

| place | A draws / tris / GPU ms | B draws / tris / GPU ms |
|---|---|---|
| I6 | 411 / 4.10 M / 6.11 | 410 / 4.16 M / 6.54 |
| E4 | 399 / 4.35 M / 6.29 | 399 / 4.44 M / 6.59 |
| E1 | 374 / 3.34 M / 6.63 | 368 / 3.41 M / 7.00 |

No console errors. Draw calls same or fewer. **GPU time +0.3-0.4 ms (+5-7 %) in all three, one round each: likely
real** (the richer concrete shader: kerbstone joints and arris; and +2 % triangles). Not "same or better".

## What claude/traffic must adapt (in addition to ROUND2.md)

Lane paths are now 0.5 m resampled after the radius smoothing; single-lane paths may be moved up to 8 m sideways to
stay on the measured street. `p.stop.at` is rescaled to the new length when no painted line is crossed.
