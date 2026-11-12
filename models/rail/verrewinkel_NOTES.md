# Rue de Verrewinkel road bridge over L26: notes (written BEFORE modelling, 2026-11-11)

Road bridge (layer 1) carrying the Rue de Verrewinkel over railway line 26 in its cutting, at the Parc de la Sauvagère's
west entrance, next to the Lycée français. Red brick, three arches, a corbelled brick arcade on blue-stone consoles under a
rounded blue-stone coping. Since 2022 a separate cyclo-pedestrian footbridge (white precast concrete deck on steel tube
supports, glass parapet with leaning white fins) runs along its south-west face.

Marks: **[M]** measured on our data, **[P]** read on the free photo s05 (solved camera, see below), **[E]** estimated,
**[L]** look-only reference (Google Street View 2024 / BX1 2022 press photo: read for WHAT is there, nothing traced, stored
or shipped; no dimension was taken from them except where marked).

## Sources
- `data/raw/refs/sauvagere/s05.jpg`: Stratoswift, 2021-02-11, CC BY-SA 4.0 (Commons "Pont de la rue de Verrewinkel,
  11 février 2021"). Sony DSC-HX95, f = 4.25 mm (24 mm equiv.) -> 3370 px at 4896 px. Shows the **south-west face** in
  sun (12:51, sun ~SSE), from the NW bank. Works had started (heras fence, the SW parapet's NW end broken down).
- OSM (ODbL): road bridge way 28030783 (bridge=yes, layer 1, width 2.1) (-282.5, 1295.3) -> (-254.3, 1321.5);
  footway 1026190364 (bridge=yes, layer 1, the 2022 footbridge) ~6 m SW of it; benches 10574619052 / 053 (layer 1) on it;
  rails 209080749 + 209187139 (L26) + crossover 209187151 cross the bridge axis at right angles (89-90 deg: NO skew).
- UrbIS Land cover 2026 Bridges ROB 879 (201 m2): centroid (-268.81, 1308.28), axis 42.9 deg, 39.7 m long (X +-19.85),
  **+-2.46 m** wide, flaring to +-3.3 m over the last 2.6 m at both ends (the wing walls). StreetSurfaces level +1 on it:
  roadway (TYPE S, 139.5 m2) and two strips (SW, 30-31 m2, ~0.85 m) along both parapets.
- DTM / DSM 2021 0.5 m (sheet 148164); city terrain 1 m (data/tiles/F7).

## Frame
Bridge frame (Blender): **X along the road, NW -> SE** (direction (0.733, 0.681) in city x/z), **+Y = north-east**, Z up;
origin = UrbIS centroid (-268.81, 1308.28) at **70.30 m TAW** (the cutting floor). The photographed face is the SW face (-Y).

## Measured
| what | value | how |
|---|---|---|
| cutting floor (ballast) | 70.2-70.4 TAW, from X -7.1 to +4.9 (12 m) | DTM across the cutting at 5-14 m either side of the faces [M] |
| rail top | 70.60-70.62 | data/rail/rail.json [M] |
| tracks at the axis | X -2.96 (209080749), -0.95 (crossover), +0.73 (209187139) | OSM x rail.json [M, OSM +-1 m] |
| cutting slopes | ~1:2, NW bank top 76.8 at X -19.5, SE bank 78.7 at X +19.5 | DTM [M] |
| road at the deck ends | **76.79** (X -19.85) and **78.73** (X +19.85): grade 4.9 % up to the SE | city terrain (F7) at the polygon ends [M] |
| deck width | 4.9 m (UrbIS) / ~5.5 m (DSM raised band) | [M] |
| road layout on the deck | NE sidewalk ~0.9, roadway ~3.0, SW strip ~0.45 + parapets | UrbIS level +1 surfaces [M] + SV [L] |
| no skew | tracks at 89.4-89.8 deg to the road | [M] |

## Read on s05 (camera solved: tools/verrewinkel_photopose.py)
Camera solved jointly with the frieze, the coping line and the near track: f fixed by EXIF (prior 3372 px), the 17
console centroids (equal pitch, on one line parallel to the coping), the coping's lower shadow line (fitted, rms 1.7 px),
the two rails of the near track (gauge 1.435 m, at OSM X +-0.5 m), the eye 1.6 m over the DTM, brick course height
(6.3 cm) at 5 places as a vertical scale. Result: camera on the NW bank top (X -19, 10 m SW of the face, eye ~78.7 TAW),
console fit rms 7.5 px (centroid noise), coping 1.7 px. The absolute scale is weak (the parapet comes out 0.5-0.9 m higher
over the measured road than Street View shows): **positions along X and heights relative to the coping are used, the
absolute level comes from the measured road.**

| counted / read | value |
|---|---|
| big arches | **3**: A (NW, over the NW slope), B (middle, over the tracks), C (SE, over the SE slope) [P] |
| shape | elliptical ("anse de panier"), vertical jambs from the ground, the ring running smoothly into them [P] |
| spans (clear) | A 8.0, **B 11.0**, C 8.0 m; piers 1.5 m; B centred on the cutting [P +-0.5 m; A and C made equal: E] |
| crowns | all three intrados crowns **2.55 m under the coping's underside** (they follow the road grade) [P] |
| rises | A 3.4, B 3.3, C 3.4 m (springings ~72.1-72.9 TAW) [P +-0.3] |
| big arch ring | brick, ~0.45 m deep (two rowlock rings), flush / barely proud, no stone voussoirs, no imposts seen [P] |
| corbel arcade | **17 blue-stone consoles** visible (C1-C17), equal pitch; 18 small brick segmental arches; the wall above them corbels out [P] |
| pitch | 2.09 m on the solve; set to 1.91 m (18 bays between the wing folds at X +-17.2) [P / E] |
| console | two-step blue-stone block: top slab ~0.48 wide x 0.17, lower block ~0.36 x 0.15, rounded underside [P] |
| console top | coping underside - 1.50 m (24 courses) [P] |
| small arches | segmental, rise ~0.47, one rowlock ring ~0.28-0.30 m, spring from the console tops [P] |
| corbelling | the wall above the springing line projects ~0.12 m over the wall below (shadow down the jambs) [P / E depth] |
| wall over the small arches | ~0.7 m (11 courses) to the coping, a dark course under the coping (soldiers / dentils) [P] |
| coping | blue stone, rounded "bolster" top, ~0.27 high, ~0.55 wide, blocks ~1.25 m with V joints [P] |
| bond | mixed: header courses between stretcher courses; old hand-made bricks, light lime joints [P] (texture: library brick) |
| parapet height | coping top ~1.15 m over the road [L, SV: the SW parapet next to the roadway] |
| the far (NE) face | **not photographed**: assumed identical to the SW face (mirror) [E] |
| abutments / wings | the parapets flare out over the last ~2.6 m (UrbIS) and end at a brick end pier [M + L], wing geometry [E] |

## The 2022 footbridge (separate structure, SW side)
Commune / Beliris "passerelle cyclo-piétonne du Verrewinkel" (BX1, 2022-01-29: frame + deck placed, guard rail March,
works from Feb. 2021). [L] what: precast white concrete deck (~0.9 m deep, faceted edge), on splayed white steel tubes from
concrete footings beside the tracks, glass parapet with leaning white flat fins on the outer edge, a galvanised mesh
railing along the old SW parapet, a terracotta resin walking surface, two benches (OSM nodes). [M] plan: OSM footway ~6 m
SW of the road axis, orthophoto 2024: the deck ~6.5 m wide (wider at the NW end). [E] everything else: deck top 0.25 m
under the road (the small arches show over it, as on the BX1 photo), two 4-tube supports at the pier lines.
Also [L]: a galvanised mesh railing on the NE coping.

## Chênaie bridge (way 28030785, ~(37, 1022)) - NOT modelled
Avenue de la Chênaie (living street, no motor vehicles) over **L26** too (UrbIS ROB 899, 219 m2, 46.5 m long, ~4.7 m
wide, ~78 deg to the tracks): deck ~79.5 TAW (N) to ~77.5 (S) over a floor at 71.2 (a ~8 m deep cutting), setts on the
deck, a narrow sidewalk, brick parapets with the SAME rounded blue-stone bolster coping [L]: the same 1920s L26 family as
Verrewinkel (arches unconfirmed: no free photo of the faces found). A second preset of this generator later.

## Not known / estimated (honest list)
- the NE face (mirror of the SW face), the arch soffits' brick (texture), what is under the deck (solid fill);
- spans and pier widths +-0.5 m, the pitch of the arcade (1.91 vs 2.09 m), the corbel depth (0.12);
- the footbridge's supports, its exact plan and level; the wing walls and end piers' shape;
- the catenary under the bridge (lowered to fit: contact ~4.9 m, messenger ~5.3 m over the rail) [E].

## Built (2026-11-11, tools/blender/roadBridge.py)
Final layout (bridge frame): arches A -15.0..-7.0, B -5.5..5.5, C 7.0..15.0 (semi-ellipses sampled at equal normal turns,
crowns 1.65 m under the road, rises 3.4 / 3.3 / 3.4), piers 1.5 m; 17 consoles at a 1.99 m pitch centred on the axis, end
bays 1.20 m to the wing folds (s05: the last arch is ~0.65 of a bay); corbel 0.12 m; coping bottom road + 0.90, top + 1.17;
wings flare 0.8 m from |X| 17.2 to 19.85 (UrbIS), end piers with stone caps; NE sidewalk +0.13 with dropped kerbs at the
ends; SE apron (2.5 m, -0.45 m) into the city street. s05 camera vs the built model: consoles 41 px mean, coping 3 px, arch
crowns 21-43 px, rails 47-52 px, SE fold 9 px (4896 px wide): the pitch on the photo alone was 2.04-2.21 m (scale weakly
determined), the layout keeps the UrbIS footprint. Side by side: docs/trains/verrewinkel/s05_city_compare.jpg.

Mesh: LOD0 34,073 tris (bridge 31,411 incl. the arch-ring node, footbridge 2,662), 12 primitives; LOD1 24,417 (an exact
subset: no rings / railing posts / mesh panels / benches), 8; LOD2 5,725 (meshoptimizer error 0.06 + prune, flat), 7.
Checker: LOD0 0 blocking, LOD1 0 blocking, LOD2 534 blocking (leaks / coplanar from the simplification; see TODO).
GLB 3.1 MB (uncompressed), AO 2048 PNG 2.4 MB.
