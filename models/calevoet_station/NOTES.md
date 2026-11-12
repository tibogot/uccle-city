# Gare d'Uccle-Calevoet (the passenger building on line 124, Chaussee d'Alsemberg 1067): the scripted hero

Why this building: the brief's first choice, the Moulin du Nekkersgat, has ONE usable free photo (see
models/nekkersgat/NOTES.md: its north-east range, courtyard and 2013 wheel are never seen); the second, the Eglise du
Precieux-Sang, has ONE Commons photo. The Calevoet station building has 40 Commons files 2007-2025, the whole track front
seen from both ends, near-frontally and close up (window detail), both gables, and Street View (look-only) on the car-park
side from the Dieweg.

A 19th-century halt building of the Etat Belge type (painted brick, zinc roofs): from north to south a small red-tiled
pavilion, a flat-roofed wing, a one-and-a-half-storey zinc-roofed wing, the TWO-STOREY MAIN BLOCK (5 bays, zinc roof,
slate-hung south gable), a one-storey zinc link, the RED-TILED SOUTH PAVILION (towards the Dieweg) with a box bay on the
platform side; a cast-iron platform canopy before the main block. Replaces UrbIS solid **534568** (BU_ID building/1585341,
tile D6), the whole range in one solid.

## Sources
- Photos: Wikimedia Commons, full-size originals in `data/raw/refs/calevoet/full/` (git-ignored; SOURCES.md, full.json =
  urls, sizes, sha1 checked against the API): c00 c01 c02 (Stratoswift 2018-09-01, Sony HX80, CC BY-SA 4.0), c03 (window
  detail, 2019), c04 c05 (Stratoswift 2024-03-04, RX100 V, CC BY 4.0), c06 c07 (Japplemedia 2021, iPhone, the south end
  from the street / platform), c08 (2007, older state: brown tiles, glazed bay, brick main gable), c09 (Rudolphous 2008,
  the main block near-frontal), c10 c11 (2019). References only, never shipped.
- Look-only (not stored, not traced): Google Street View from the Dieweg (2014) up the car-park lane: the car-park side.
- Measured: UrbIS 3D solids + DSM / DTM 2021 0.5 m (CC0): `tools/calevoet_measure.py` -> `site.json`, `site_dtm.*`.

## Frame (tools/calevoet_measure.py)
Origin city (-1224.677, 790.173), rotation 63.967 deg. u runs ALONG the tracks (u+ = south-south-east, the Dieweg end),
w across (w+ = the track / platform side, west-south-west). UrbIS footprint (frame): track face w 3.03..3.28 (steps:
north pavilion 3.10 to u -20.16, flat wing 3.03, zinc wing 3.23 from -13.06, main block 3.27-3.28 from -6.69 to 10.84,
link 3.14, south pavilion's bay 4.12 from 16.18 to 24.49); car-park face w -4.0 / -4.12 from u -21.02, the north pavilion
w -2.12 (u -24.52..-21.02). Ground: the platform 52.45 (DTM, flat), the platform edge at w 7.2 (the tracks 51.6), the
car-park side 51.7-52.4, the south end 52.5.

## Camera poses (tools/calevoet_photopose.py, picks in tools/calevoet_picks.json -> photo_views.json)
Lines = wall corners through UrbIS footprint corners; points = the two gable apexes (back-projected consistently from
two photos: main block 61.45-61.49 at w -0.15/-0.21, south pavilion 58.96-58.99 at w -0.48/-0.56), window crowns of the
main block (measured on c04), corner feet on the platform; priors: EXIF focal, the eye ~1.6 m over platform 2.
- **c04** (2024, 32 mm eq.): f 4817 (EXIF 4864), camera u 36.3 w 17.8 h 54.5 (platform 2), mean **2.8 px**: the
  reference pose (heights).
- **c00** (2018, 24 mm eq.): f 3393 (EXIF 3395), camera u 32.1 w 15.5 h 54.4, mean 5.4 px.
- **c01** (2018, from the north, 31 mm eq.): f 4635 (EXIF 4385), camera u -34.2 w 15.5 h 54.1, mean 8.2 px (the far
  left of the photo is the weakest: north-end heights +-0.3 m).
- **c09** (2008, near-frontal, 47.6 mm eq.): f 3569, mean 7.7 px: used for the WIDTHS of the main block's openings only
  (its heights disagree with c04 by 0.6 m: only window crowns and corners pin it).

## Counted on the full-size photos, FACADE BY FACADE (before modelling)
Positions back-projected on the facade planes (u, m TAW); widths are the openings (reveal to reveal).

TRACK FRONT (w+, platform 1; c00 c01 c02 c04 c05 c07 c08 c09 c10 c11), north to south:
1. NORTH PAVILION (u -24.52..-20.16, w -2.12..3.10): one storey, red/brown pantile roof, ridge along u at w 0.49,
   apex ~56.95 (DSM 56.9; c01 57.06), eaves ~55.2 (35 deg; c01 verge foot 55.22). Track wall: TWO narrow windows (u
   -22.98..-22.52 and -21.72..-21.21, head 54.6, sill 53.6), boarded grey (c01). North gable: white bargeboards, a
   round-headed small door (w 1.94..2.79, crown 54.1; black, graffiti), the rest of the gable hidden by ivy (ESTIMATED:
   plain).
2. FLAT WING (u -20.16..-13.06, w -4.0..3.03): one storey, flat roof (DSM 55.9-56.0) behind a moulded cornice with a
   gutter; a shallow pilaster at its north end; a boarded rectangular window (u -18.68..-17.72, 52.9..54.36) and a
   glazed segmental-arched window (u -14.76..-13.65, sill 52.73, crown 54.66), net curtains (c01).
3. ZINC WING (u -13.06..-6.69, w -4.0..3.23): one and a half storeys, zinc standing-seam roof (41 deg, apex 58.91 at w
   -0.1 / DSM -0.5), its NORTH GABLE above the flat wing's roof with a small round-headed window (c01); track wall: ONE
   tall segmental-arched window (u -10.2..-8.4, crown 54.6, sill 52.8: c01 + c04 agree to 0.3 m).
4. MAIN BLOCK (u -6.69..10.84, w -4.12..3.27): TWO storeys, 5 bays, painted brick (white ground floor, cream first floor
   in 2008, both white-ish since), corner pilasters (UrbIS steps of 8-9 cm at -6.69 / -5.69), a brick string course at
   55.55-55.7, an eaves cornice ~57.8-58.1 (c04 corner 58.13), zinc standing-seam roof 43 deg (track verge measured 43
   deg from 61.45 down to 58.24 at the wall), apex 61.5 at w -0.43 (DSM 61.6), 3 chimneys.
   - FIRST FLOOR: 5 windows, centres u -4.1, -0.9, 2.3, 5.5, 8.7 (c04 / c09 averaged; symmetric about 2.3), ~1.0 wide
     (c09), sill ~55.7, SEGMENTAL heads (c09 frontal: springing ~57.25, crown 57.62-57.70 on c04), two-leaf casements +
     a transom light, brown frames; a raised brick label over the CENTRE window only (c09); cast-iron wall anchors
     (fleur-de-lis) between the windows (c09: 6) - modelled as small plates.
   - GROUND FLOOR: 5 segmental-arched openings under raised brick labels with ears (c03 detail, c09), same axes:
     bay 1 (u -4.1) a double door with a brass grille (c09), bay 2 window (grille), bay 3 window, bay 4 door (dark), bay
     5 window; crowns 54.41-54.59 (c04), springing ~54.25, window sills ~52.95, bluestone sills on a corbel (c03).
   - CANOPY before it: u -1.3..11.0 (DSM), the platform side to w 7.2, top 55.6 at the wall falling to ~55.0 at the
     front fascia (DSM 55.6 -> 54.9); THREE cast-iron columns with curved brackets: u ~1.6, 5.8, 10.0 at w ~6.45
     (ESTIMATED +-0.7 m: c00 / c04 / c09 disagree on the columns' depth), a hanging clock (2008).
   - The SOUTH GABLE above the link: slate-hung (2018+; brick in 2007), two chimney stacks astride the ridge near it (u
     ~10.45, w +0.5 and -0.65, tops ~61.85: c00 + c04 + c01 back-projections), the middle stack at u ~0.5 on the ridge
     (top ~61.75, three photos agree to 0.2 m). The NORTH GABLE above the zinc wing: painted brick (c01).
5. LINK (u 10.84..16.18, w -4.12..3.14): one storey, zinc roof (40 deg, apex ~58.85), eaves 55.89 (c04); track wall: a
   double door u 12.60..14.33 (segmental, crown 54.66, a raised label 54.84), the rest plain; the bay's fascia starts at
   its south end.
6. SOUTH PAVILION (u 16.18..24.50, w -4.12..3.20): one storey, NEW RED interlocking tiles (2024; dark brown in 2007),
   apex 58.98 at w -0.5, 41 deg (verge feet 56.15 / 56.05 measured), a moulded cornice band 55.69-55.92; its north gable
   stands a little above the link's roof (the diagonal verge in c00 / c04) with a chimney on its apex (u 16.3, top
   ~59.4). On the track side a BOX BAY u 16.41..24.33 to w 4.12 (c04: front back-projected at u 16.41 and 24.33),
   flat-roofed (fascia 55.0-55.5, dark grey), TWO boarded shop windows (u 16.79..19.67 and 21.3..24.15, sills 53.5,
   heads 54.9) and a narrow one on its south end; a cabinet before it (not modelled).
   SOUTH GABLE (c00 c04 c06 c10): verge coping, recessed stepped brick panels along both verges (3 per side + one under
   the apex) and a band at the eaves line, a door (w ~2.0..2.85, crown 54.83) and two segmental windows (w 0.0..1.29 and
   -2.51..-1.02, sills 53.4, crowns 54.84), boarded; the station sign (not modelled: a plain panel).

CAR-PARK SIDE (w-, Street View 2014 look-only, from the Dieweg: oblique, the south half): the main block repeats the track
rhythm (5 first-floor windows with segmental heads, ground-floor openings under labels, a door in the middle bays); the
south pavilion shows one segmental window; the link a zinc roof. **ESTIMATED**: the openings' exact positions (the track
axes mirrored), the north half (flat wing, zinc wing, north pavilion: one or two windows each, as on the track side).

NORTH END: the north pavilion's gable (c01) + the flat wing's end face (w -4.0..-2.12, ESTIMATED plain).

## Roof read from the DSM (site.json profiles)
- North pavilion: apex 56.9 (w 0.5), slopes ~35 deg (DSM blur), eaves ~55.2.
- Flat wing: 55.8-56.0 flat.
- Zinc wing, link: apex 58.9-59.0 (w -0.5), ~40 deg.
- Main block: apex 61.6 (DSM blur) at w -0.4..-0.6, 43-45 deg, eaves ~58.0.
- South pavilion: 58.8-59.0 at w -0.5.
- Canopy: u -1..10.5, w 3.3..7.2, 55.6 -> 54.6.

## Still to settle by the side-by-sides
The canopy columns' u; the north end's heights (c01's weakest corner); the car-park side.
