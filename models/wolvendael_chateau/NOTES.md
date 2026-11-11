# Château de Wolvendael (Parc de Wolvendael, Uccle; today the École d'art d'Uccle): the scripted hero + its pond

18th century house of the Vanderborght, later the Mosselman du Chenoy; white render, stone quoins, a slate mansard.
Replaces UrbIS solids **537523** (the house: an L, BU_ID null in the tile) and **538880** (the low annex behind the
south-west part, BU_ID building/1587095). The Louis XV pavilion (537211) is NOT part of this job.

## Sources
- Photos: Wikimedia Commons, full-size originals in `data/raw/refs/wolvendael/full/` (git-ignored; `full.json` = urls,
  sizes, sha1): w00 (Edison McCullen 2026-01-06, CC BY 4.0, Galaxy S23, HDR-processed and cropped), w01-w04
  (Donarreiskoffer 2019-03-24 16:34-16:35, CC BY-SA 4.0, SM-A750FN 27 mm eq.; w03 the 18 mm ultra-wide), w15 (Nels
  postcard, public domain, older state: awnings, an iron-and-glass porch over the arches). w16 is the Wolvendael of
  Brussegem (excluded). References only, never shipped.
- Measured: UrbIS 3D solids + DSM / DTM 2021 0.5 m (CC0): `tools/wolvendael_measure.py` -> `site.json`, `site_dtm.*`.
- Pond: OSM way 31664019 (natural=water, ODbL). UrbIS Land cover has NO water block here (the whole park is green block
  28215, checked in the 2026-10-02 GeoPackage), so the outline is OSM's; the level is measured (below).

## Frame
Origin city (-468.703, -365.572), rotation -33.569 deg (the prep's). u runs along the long pond front (u+ = the
north-east end), w across (w- = the pond side, north-west). Footprint (537523, frame): pond front w -11.38 / -11.33 from
u 20.55 (NE corner) to -12.69 (SW corner); NE end u 20.5 (8.8 m); back of the main block w -2.57 / -2.87 (u 20.4 ->
-0.54); the SW part runs back to w 3.39 (u -12.67 -> -0.64). Annex 538880: u -6.6..-0.6, w 3.1..7.7.

## Camera poses (tools/wolvendael_photopose.py -> photo_views.json)
Points: the two chimney stacks' front top edges (DSM positions); lines: the wall corners through the UrbIS footprint
corners; priors: EXIF focal (35 mm eq. on the diagonal) and the eye 1.6 m over the far bank.
- **w04**: f 3601 px (EXIF 3602), camera u 28.08 w -62.89 h 48.40 (across the pond), mean 3.3 px (lines 0.6-2.3 px,
  chimneys 9 px).
- **w02**: f 3594, camera u 28.13 w -63.16 h 48.46 (the same spot 12 s earlier, other framing), mean 5.5 px.
- **w00**: f 5495, camera u 43.6 w -58.8 h 50.8, mean 13.8 px on 8160 px: APPROXIMATE (HDR-processed, cropped sensor:
  principal point assumed central). Used only for the north-east end's bays.
- Back-projection: the cornice top picked on w04 lands at **57.91 m**, the UrbIS eaves exactly (57.91): the pose and
  the solid agree.

## Counted on the full-size photos, FAÇADE BY FAÇADE (before modelling)
Bays numbered from the NE end (photo LEFT, u+) to the SW end (photo RIGHT, u-). Positions back-projected from w04 on the
pond front's plane (photo_measured.json): bay centres u, widths of the openings, levels m TAW.

POND FRONT (north-west; w02, w04 full-size, w01, w00, w03; the postcard w15 for the older state): 33.2 m, 12 bays.
- Composition: NE corner quoins (u 20.55 -> 19.95) | B1, B2 | rusticated strip A (u 13.96 -> 13.39) | B3, B4, B5, B6,
  B7 (the centre, symmetric about B5) | strip B (2.19 -> 1.61, a downpipe beside it) | B8, B9 | strip C (-4.45 -> -5.04)
  | B10, B11, B12 (the SW part) | SW corner quoins (-12.11 -> -12.67, a downpipe). The main block B1-B9 is symmetric
  about B5 (u 7.9 = the middle of 20.55 and -4.75).
- Bay centres (u): B1 18.62, B2 15.23, B3 12.35, B4 10.16, B5 7.88, B6 5.64, B7 3.29, B8 0.36, B9 -3.19, B10 -6.4,
  B11 -8.7, B12 -10.7. Openings 1.10-1.25 m wide.
- GROUND FLOOR: 12 openings. B1, B2, B3, B7, B8, B9 = tall rectangular French windows (head 52.95, glass from the floor
  ~50.4), each with TWO louvred shutters folded back against the wall (12 shutters, grey); B4, B5, B6 = round-arched
  French windows (springing 52.47, crown 52.92), shutters folded between them (6 arched-top shutters); B10, B11, B12 =
  rectangular windows (head 52.80) boarded with timber X braces in 2019 (works), shutters only at the outer ends (left
  of B10, right of B12: 2). Total GF shutters seen: 20 leaves.
- FIRST FLOOR: 11 windows (B11 has NONE: plain render between B10 and B12, w00 + w04): two-leaf casements, 3 panes per
  leaf, sill 54.50 (stone sill on two small blocks), head 56.30, 1.15-1.25 wide; no shutters on the first floor.
- STRING COURSE between the floors: 53.76-53.99 (a flat stone band); over the centre (B4-B6, u 4.6..11.3) a deeper band
  53.32-53.91 with a moulded frieze and a keystone console over each arch; the lettering "École d'Art d'Uccle" on a
  panel over B5 (a sign: modelled as a plain panel).
- ENTABLATURE: architrave 57.11, frieze, cornice soffit 57.40, cornice top 57.91 (all round).
- Rusticated strips and corner quoins: alternating long / short blocks (~0.30 m courses), stone, 0.57 m wide.
- ROOF (front): the mansard's steep lower slope (brisis) from the cornice to the break at ~59.9 (a zinc roll), slate.
  DORMERS: 4 on the main block over B2, B4, B6, B8 (window head ~59.4, sill ~58.0, slate-hung cheeks, a small hipped
  roof with a zinc-edged eave ~59.7 and its apex ~60.3), 1 on the SW part over B10; 1 roof window (skylight) between B8
  and B9 dormers on the main roof; on the SW part over B12 a SHORT chimney stack clad in zigzag slate with 4 pots.
- CHIMNEYS: 2 tall stacks on the ridge (DSM: u 13.23 w -6.66 and u 1.84 w -7.58, tops 64.2), slate-hung (a zigzag
  pattern), a projecting cap, pots: NE stack 1 pot, centre stack 3 pots.
- STEPS: a perron before the arches B4-B6 (the lawn ~48.8 to the floor ~50.35: ~9 risers), benches; a hedge along the
  rest of the front (the plinth hidden: ESTIMATED plinth with no openings).
- Downpipes: 2 (by strip B and at the SW corner) + 1 at the NE corner (w04).

NORTH-EAST END (w00 frontal-oblique, w01, w04 side-on): 8.8 m, 2 bays, symmetric.
- First floor 2 windows, ground floor 2 French windows each with 2 shutters (4 leaves), same levels as the front
  (w00 back-projection: FF 54.45-56.4, GF heads 52.8-52.95); corner quoins at both corners; brisis with 2 dormers
  (over the bays: positions ESTIMATED, w00's pose too rough for them).

SOUTH-WEST END and the ENTRANCE SIDE (south-east), the annex: NO usable photo (w01's right edge shows only a low roof
by the street). **ESTIMATED**: the entrance side of the main block with the pond front's rhythm (9 bays, a door in
place of B5 with a stone surround and three steps), the SW part's back and SW end 3 bays each, the annex as a plain
rendered one-storey block with a hipped slate roof. Street View may be LOOKED at for colours later (not traced).

## Roof read from the DSM (`python tools/wolvendael_measure.py --dump`, site.json "roof" / "profiles")
- Main block: mansard; the brisis from 57.91 (cornice) to ~60.0-60.3, set back ~1.0-1.2 m (DSM across u 7.5 and 16:
  55.5 -> 60.3 between w -11.5 and -10.0); the terrasson ~37-39 deg up to the ridge **62.94** along u at **w -6.9**
  (the main block's middle, -6.97); hipped at the NE end.
- SW part: its own higher pavilion roof (the photos' "wing with its own hipped roof"): a short ridge along w at
  **u -6.7, 63.6-63.9** from w ~-5.3 to ~-2.6, hipped all round (~33 deg), over u -12.7..-0.6; the pond-side slope of
  the main roof runs on under it (DSM along w -9: flat 61.2 from u -11.75 to 18.5).
- Chimneys: NE u 13.23 w -6.66 top 64.23 (DSM extent ~1.15 x 2.15 m incl. blur), centre u 1.84 w -7.58 top 64.21.
- Ground (DTM, 1 m out): pond front 46.95 (SW corner) rising to 48.3-48.8 (u -9..4) and 50.0 at the perron (u 5..11),
  49.2 at the NE corner; NE end 49.2-49.4; back 49.4-49.8; the SW end 46.85-47.0 (the street side, low: ~3.4 m of
  plinth there). UrbIS base 46.93.

## The pond
- OSM 31664019 polygon 577 m2 (it includes the reed / shrub fringe); open water seen by the LiDAR (DSM = DTM, flat)
  190 m2. **Water level 46.72 m TAW** (p20 of the DTM where the DSM returns the same; the open water reads 46.72-46.74).
- Banks 0.3-0.7 m above the water (DTM 47.0-47.5 round it); the lawn rises to the house (48.3-50).
- Photos w01-w04: near-mirror reflections of the house, the sky and the trees, a few reeds and some debris; no lilies
  in March 2019 (lilies are summer: placed sparsely, near the edges).
