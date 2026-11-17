# Curved roads broken at sharp bends (claude/curvedroads)

Owner playtest 2026-11-16: "some curved roads are broken at sharp bends". Offline turn (no browser): root cause, fix,
audit over all 120 tiles. Quality rule 24, gate row `roadbends`.

## Root cause

Every engine road strip (vendor/roads, read-only) is a **sweep**: the edge of a strip at lateral offset t is
C(s) + N(s) t at each sample of the fitted alignment. Where the alignment's radius R is smaller than |t| on the inner
side (1 + k t < 0) the edge runs **backwards**: the strip folds over itself (a swallowtail): flipped triangles, the
incoming and outgoing strips lying over each other, the inner edge over the carriageway.

Why R is that small: `roadAlignment.js fitVertices` puts an arc at every OSM vertex, then shrinks the radii until
each leg holds both tangents **plus a straight lead at junction mouths** (`avail = max(0.01, leg - lead)`, lead =
junction trim + 5 m). An OSM vertex a few metres from a junction therefore gets a tangent of 0.01 m: R = 0.01-0.3 m, a
sharp corner with no inner join at all. Sampled on 6 tiles: 43 of 53 folding vertices are the first / last vertex of a
road with its tangent at that 0.01 m floor, the other 10 sit between two short legs; none at its design radius. City-
wide 194 of the 233 defect places have R < 0.5 m. The engine only logs `tight-bend`; viewer/surfaces.js then dropped
the minority-oriented triangles (`dropFolds`): the lane-paint layer broke at the bend, folds that were the majority
of a short piece stayed, and where UrbIS maps nothing the drop left a hole.

## Fix

`viewer/streets/roadBends.js trimBendFolds`, called in viewer/roadBuild.js right after `buildLaneRoadMesh`
(`?roadbend=old`: off, features.js row "road strips folded at sharp bends"). For every road and every lateral value t
its strips use, the raw offset polyline at t (extended straight past both road ends along the end headings, the
junction pad's direction) is cut at its own **self-intersection** around each fold run; the vertices whose station lies
between the two crossing points move to the crossing (one height). That is the trimmed offset curve, the exact inner
join (every point of it at distance |t| from the centre line): no fold, no overlap, nothing narrower than the street,
no spike. The outer side of such a corner is already round (the engine's fan of rows). Strip vertices are identified
by their uv (station, lateral) AND their position (piece phases collide); a road's skirt wall follows its moved edge
(same piece, same station; never a junction pad's corner at the same spot). Triangles left with no plan area, or a mm
sliver still facing backwards, are dropped. Everything else keeps its Float32 values bit for bit.

Browser turn: the engine's sidewalk / verge strips (concrete, grass parts) ARE drawn where UrbIS maps nothing
(viewer/surfaces.js keeps them for unmapped roads), and they folded the same way: the visible "broken bend" on those
roads was a sidewalk slab or kerb wedge lying across the roadway. The trim now runs on all three parts (no aPiece in
the concrete / grass parts: roads found by their box; a kerb / skirt wall follows its moved edge at the very same
station within 15 cm). Audit: sidewalks / verges folded 5,519 (420.4 m2) -> 0, overlap 361.1 -> 6.1 m2, narrow
4,386 -> 25.

Cost: 13-18 ms per tile in the worker's road stage (1.8 s over all 120 tiles in node). viewer/surfaces.js `dropFolds`
stays as a safety net; on I6 / J4 / D7 it now drops 0 triangles (was 127 / 231 / 106).

## Audit (node --import ./tools/road_audit/register.mjs tools/audit/roadBends.mjs, ~30 s, 12 threads)

Engine asphalt strips, in-tile triangles / vertices, 120 tiles, as built (`roadBend: false`) -> trimmed:

| metric | before | after |
|---|---|---|
| folded triangles (plan vs (s, t) frame) | 4,203 (509.4 m2) | **0** |
| strips over themselves (0.25 m lattice) | 450.0 m2 | **0** |
| edge vertices nearer the centre line than their offset - 0.10 m ("narrow") | 5,352 | **0** |
| spikes (vertex farther than its offset + 0.10 m) | 0 | 0 |
| cracks between a row's copies (> 1 cm) | 0 | 0 |
| carriageway cells no engine asphalt covers | 19,642 | 19,672 |
| ... of them with no measured UrbIS surface either ("exposed") | 812 | **812** |

The 30 added engine-layer cells (7.5 m2: Rue du Bourdon D7, Rue Basse G6, Av. Brugmann E3) are pad corners where the
road's outgoing piece is shorter than the swallowtail; all lie on the measured street (its base is drawn there, only
lane paint is absent, as inside any junction). Identity: 21,495 vertices changed (21,377 strip + their walls), **all
within 15 m of a folding bend, 0 on roads without one**; the kept triangles are the originals in order; the default
build path (`o.roadBend` on) equals the audited trim. 233 places on 225 roads in 74 tiles.

Worst tiles (folded, m2, overlap m2, narrow, exposed holes, vertices moved):

| tile | folded | fold m2 | overlap m2 | narrow | exposed | moved |
|---|---|---|---|---|---|---|
| F3 | 123 -> 0 | 24.6 -> 0 | 21.5 -> 0 | 147 -> 0 | 0 -> 0 | 501 |
| D1 | 148 -> 0 | 20.2 -> 0 | 17.9 -> 0 | 183 -> 0 | 1 -> 1 | 523 |
| B7 | 134 -> 0 | 18.0 -> 0 | 19.1 -> 0 | 252 -> 0 | 2 -> 2 | 322 |
| J4 | 150 -> 0 | 17.6 -> 0 | 15.4 -> 0 | 234 -> 0 | 0 -> 0 | 633 |
| D2 | 141 -> 0 | 17.3 -> 0 | 15.7 -> 0 | 208 -> 0 | 0 -> 0 | 724 |
| J5 | 118 -> 0 | 16.3 -> 0 | 15.1 -> 0 | 196 -> 0 | 0 -> 0 | 541 |
| I6 | 135 -> 0 | 15.4 -> 0 | 14.4 -> 0 | 115 -> 0 | 0 -> 0 | 484 |

## Worst 20 places (for the browser check; x, z = viewer metres, `?at=x,z`)

Before -> after (fold / overlap m2, narrow = summed metres of edge over the road, paint = engine-layer cells missing
over the measured base):

- B7 -2263.4, 1296.5  Brouwerijstraat (r15221324_0, half width 3.5 m; PI R 0.01 m of 25, 91 deg)  fold 7.1, overlap 7.9, narrow 168.6  ->  clean
- J4 1593.3, -50.6  (unnamed) (r219444246_1, half width 3.8 m; PI R 0.65 m of 7, 70 deg)  fold 8.1, overlap 7.1, narrow 153.2  ->  clean
- C7 -1602.4, 1131.4  Rue Keyenbempt (r36330129_0, half width 7.7 m; PI R 0.02 m of 21, 50 deg)  fold 11.8, overlap 10.5, narrow 101.6  ->  clean
- B7 -2429.3, 1067.3  (unnamed) (r785989897_0, half width 3.8 m; PI R 0.01 m of 8, 90 deg)  fold 5.3, overlap 5.8, narrow 137.9  ->  clean
- F6 -130.5, 675.9  (unnamed) (r173052948_0, half width 4.8 m; PI R 0.03 m of 25, 41 deg)  fold 10.3, overlap 8.8, narrow 79.2  ->  clean
- K6 2292.4, 940  (unnamed) (r509181429_0, half width 3.8 m; PI R 0.01 m of 8, 92 deg)  fold 5.4, overlap 4.7, narrow 84  ->  clean
- D4 -1344.6, -168.6  Avenue de la Princesse Paola (r14384663_0, half width 4.6 m; PI R 0.03 m of 25, 38 deg)  fold 7.4, overlap 7.3, narrow 57.1  ->  clean
- D1 -1134.9, -1587  Avenue Pénélope (r14372821_0, half width 5.5 m; PI R 0.03 m of 25, 37 deg)  fold 8.1, overlap 6.7, narrow 45.6  ->  clean
- F3 -103.5, -955.1  Avenue de la Ferme Rose (r16310155_0, half width 5.5 m; PI R 0.63 m of 25, 45 deg)  fold 8.5, overlap 7.6, narrow 32.6  ->  clean
- D2 -1295, -1067.9  Rue Roosendael (r40529129_0, half width 5.1 m; PI R 0.02 m of 25, 46 deg)  fold 8.9, overlap 7.4, narrow 30.5  ->  clean
- D7 -1339.9, 1292.3  Rue du Bourdon (r1029158279r1_0, half width 7.9 m; PI R 0.06 m of 25, 18 deg)  fold 11.4, overlap 9.3, narrow 7.6  ->  paint 6
- E3 -520.5, -620.8  Avenue Brugmann (r31669511d668087230_0, half width 7.9 m; PI R 0.04 m of 80, 27 deg)  fold 8.8, overlap 7.3, narrow 28.5, paint 19.5  ->  paint 19.8
- G4 38.1, -310.3  Avenue du Vieux Cornet (r14385570_0, half width 4.3 m; PI R 0.03 m of 25, 41 deg)  fold 7.2, overlap 7.1, narrow 34.6  ->  clean
- B4 -2300, -488.3  (unnamed) (r40753236_3, half width 6.3 m; PI R 0.04 m of 25, 32 deg)  fold 6.9, overlap 6.5, narrow 36.8  ->  clean
- J5 1862.1, 141.4  Avenue des Chênes (r419671379_0, half width 2.1 m; PI R 0.02 m of 18, 49 deg)  fold 4.3, overlap 3.9, narrow 61.3  ->  clean
- D5 -1078, 168.3  Rue Camille Van Exter (r243989760_0, half width 6.9 m; PI R 9.93 m of 12, 23 deg)  fold 5.4, overlap 3.1, narrow 53.7  ->  clean
- H2 769.5, -1392.5  Rue Gabrielle (r13764877_0, half width 7.3 m; PI R 0.03 m of 25, 35 deg)  fold 6.9, overlap 5.3, narrow 29.8  ->  clean
- C3 -1776.5, -977.4  Avenue Fontaine Vanderstraeten (r548871426_1, half width 5.0 m; PI R 0.04 m of 25, 29 deg)  fold 7.6, overlap 7.3, narrow 15.3  ->  clean
- J5 1686.9, 366  Avenue du Prince de Ligne (r40459754d40793691_0, half width 7.8 m; PI R 0.05 m of 80, 22 deg)  fold 8, overlap 7.5, narrow 11.9  ->  clean
- D2 -1323, -1179.8  (unnamed) (r335899391_0, half width 2.1 m; PI R 0.02 m of 14, 45 deg)  fold 4, overlap 4.1, narrow 47.1  ->  clean

## Browser turn: what to check

- `?quick=1&at=x,z` at the worst places above, `?roadbend=old` vs default, day light, low and grazing camera: the lane
  edge lines and the engine asphalt follow the inner corner (no torn / doubled paint, no dark z-fight wedge, no
  terrain showing); the unnamed roads (B7 r785989897, F6 r173052948, K6 r509181429, J4 r219444246) may be ones UrbIS
  does not map (the engine layer is all there is): no hole at the inner corner.
- Rue du Bourdon (D7 -1339.9, 1292.3), Rue Basse (G6 198.9, 761), Av. Brugmann (E3 -520.5, -620.8): the pad corners
  with no engine layer: the measured base must show there, no gap.
- The city tour against the foundation baseline (no change expected away from these corners).
- The worker bundle must be rebuilt in main first (viewer/roadBuild.js, viewer/tileData.js and the new
  viewer/streets/roadBends.js are worker code); tile-cache keys change (`roadBend` in the entry): one rebuild per tile.

## Not covered

- The lane graph (traffic paths) at these corners is untouched.
- "Road widths too narrow in places": at bends it was this cause (the inner edge lying over the road, 5,352 -> 0
  vertices); elsewhere the drawn width is the measured UrbIS street or the width fit (fitRoadWidths), a different cause,
  not taken here.

## Browser turn (2026-11-17): what the screens show

Quick boots (`?quick=1&at=..&radius=150&time=midday&xmas=0&still=1`), each place default vs `?roadbend=old`, a 14 m
oblique and a 2 m grazing camera; pixel diffs first, every changed view looked at. Crops (old | default) in docs/roads/.

| place | result | crop |
|---|---|---|
| B7 Brouwerijstraat (-2265, 1296) | FIXED: two sidewalk strips crossing the zebra / roadway gone, the island's inner corner sharp. The junction's other crossing sidewalk bands (node pieces) stay: a different, pre-existing junction defect | bends-b7-brouwerijstraat-top.jpg |
| B7 unnamed r785989897 (-2431, 1068) | FIXED: a kerbed sidewalk slab across the road (grazing view: a 13 cm wall in the lane) gone | bends-b7-r785989897-top.jpg, -low.jpg |
| J4 unnamed r219444246 (1595, -50) | FIXED: sidewalk wedge sticking into the road at the island corner gone, no hole | bends-j4-r219444246-top.jpg |
| K6 unnamed r509181429 (2291, 940) | FIXED: folded sidewalk fan over the roadway gone, inner corner an L, no hole | bends-k6-r509181429-top.jpg |
| D2 unnamed r335899391 (-1323, -1179) | FIXED: sidewalk piece lying over the zebra gone | bends-d2-r335899391-top.jpg |
| D7 Rue du Bourdon pad corner (-1342, 1293) | no visible change, no gap (measured base) | bends-d7-bourdon-padcorner-top.jpg |
| E3 Av. Brugmann, G6 Rue Basse pad corners | no visible change, no gap | - |
| C7, F6, D4, D1, F3, D2 Roosendael, G4, B4, J5 x2, D5, H2, C3 (mapped / named) | no visible change (the measured base and the old dropFolds hid the asphalt folds) | - |
| normal bends (Place Saint-Job I6, Saint-Job slope) | no change (and bit-identical by the audit) | - |

STILL VISIBLE (same cause, outer side, NOT fixed here): on the OUTER side of every R ~ 0 corner the engine's rows fan
round one point, so the strip's (station, lateral) uv collapses there: the asphalt / setts texture (sampled in (t, s),
viewer/roadPaint.js texturedRoad) draws concentric rings and the edge line curls (D1 Av. Pénélope, D4 Av. de la
Princesse Paola, Keyenbempt setts, B7, K6): bends-d1-penelope-outer-fan.jpg, bends-d4-paola-outer-fan-low.jpg. Fix
options for a next job: sample plain asphalt in world space (isotropic; a look change on every road, tour + owner),
or give the fan's vertices an arc-length u with a blend back over a few metres; or avoid R ~ 0 at the source (an OSM
vertex inside the junction lead merged into the road end, before the engine).

HEAP line: 5 boots (`?gamemenu=0&orbitcam2=old`, default, `?gamemenu=0&tilecache=0`, `?game=police` + gamePerf police
45 s, `?game=falcon`): 0 console errors, tripCounts {}, queueSkips flush 0 / 10 / 0 / 0 / 0. Tour `curvedroads` vs
uccle-tour/.tour/foundation: 21 of 22 ok, traffic-alsemberg flagged by a moving car only (its documented noise source,
no road change in the view).
