# Roads round 2: the Road Lab, made right (2026-11-12, branch claude/roads2)

The owner rejected the Road Lab of phase 1 ("so many errors… only accept it when it's perfectly right"). This round
reproduces every defect he and the coordinator listed, counts each class in the Road Checker, fixes the causes, and
shows before / after images of the 10 lab junctions. Resume note: `ROUND2_RESUME.md`.

## What was wrong, why, and what changed

| # | Defect (who saw it) | Cause in the code | Fix |
|---|---|---|---|
| 1 | Asphalt faceted into large triangles of different brightness (J1); a darker wedge where two asphalt pieces overlap at a narrowing (owner 1); a seam between the junction polygon and an arm (owner 2) | `roadPaint.js asphaltMaterial`: the tone (`fract(aPiece * 7.31)`) and the repair-patch noise (`n3(x, aPiece, z)`) depended on the PIECE (each engine road / pad / measured polygon has its own `aPiece`). Wherever two pieces meet or overlap, the shade changed along a straight edge | Tone and patches in world space only (`ASPHALT_PIECE_TONE = 0` in `roadData.js`). Normals were not the cause (all asphalt vertices take `nrmAt`, the smooth height-field normal; C21 normal jumps = 0) |
| 2 | Crossings stacked 2-3 deep at different angles (J5); 5 zebras where the photo shows 3, two in an L (J1) | (a) `build_markings.py` matched an OSM crossing node to a measured crossing by distance to its CENTRE (6 m): the long diagonal BM polygons of Alsemberg / Brugmann have their centres 9-12 m from the OSM nodes on the tram and car ways they cross, so each node became its own 3.5 m band; (b) no overlap test between drawn crossings; (c) a measured crossing the 2024 photo does not show (J1 `bm:13395`, Place de Saint-Job was redesigned) was drawn; (d) the tram sites in the middle of the J5 diagonals were "setts" and not markable, so each diagonal zebra was cut in two bands with a grey island between | (a) an OSM node within 3 m of a measured OUTLINE is that crossing; (b) one crossing per real crossing: BM, then Topo, then OSM, a band overlapping one already drawn is dropped; OSM-only nodes within 8 m of a kept measured outline are that crossing unless the photo shows bars along the road axis there (score e >= 0.5); (c) `pipeline/verify_crossings.mjs` scores the 2024 orthophoto (25 cm, CC0) for zebra bars on every record (`photo` in markings.json); a record is dropped only when the photo can tell (no trees, not in deep shadow) and shows no bars on the outline, its 2.4 m windows, nor the outline grown by 3 m (calibrated on a contact sheet: the first, looser rule dropped 103 records, most of them real crossings with their bars 1-3 m off the outline; the final rule drops the few the photo clearly contradicts); (d) `pipeline/photo_surfaces.mjs`: a tram site the photo shows as its street's own asphalt (grey within 0.07 of the street's roadway) is tram-shared roadway (asphalt, markable): 49 of 83 tram sites |
| 3 | Stop lines floating diagonally inside the junction, tiny stray dashes (J1) | Derived stop lines (OSM signals) were placed on every arm of every signal node, including the short internal link between the two nodes of Place de Saint-Job (`r14387667_1`), whose "approach" is inside the junction; a kerb ray hitting the painted island gave a 1.5 m line | No derived stop line on an internal link (< 30 m between two mapped junction nodes), never with its middle inside the measured junction polygon, never shorter than 2.5 m |
| 4 | A stop line spanning half its approach; crooked, misaligned give-way / stop dashes (owner 2, coordinator) | Topo CR2302L / CR2303L lines are digitised as 2-3 pieces at slightly different angles; each piece was drawn on its own; the survey sometimes stops 1-3 m short of the kerb | One straight line per surveyed record (first to last point), its kerb end carried on to the measured kerb (0.3 m short) when the survey stops < 3.5 m before it; kerb to kerb on a one-way approach |
| 5 | Broken turn arrows (J5) | The engine's own arrows (from its guessed lane stack) on mapped junctions, half cut by the measured clip | No engine glyphs on mapped junctions. The Brussels Mobility inventory's painted glyphs (polygon types P*: arrows, bicycles, pictograms, chevrons) are drawn as surveyed (regional roads) |
| 6 | Grey raised islands the photo doesn't show (J5); the square read as flat brown dirt (owner 2) | Tram sites always drawn as setts (light grey); `cobbles.js`: brown stone mean and near-black joints | Tram sites from the photo (row 2 d); medians the photo shows paved (green share < 25 %: 145 of 191) drawn as paving, not grass; the setts' far mean grey granite, lighter than the asphalt, light sandy joints (owner photos) |
| 7 | A black spike from the kerb into the sidewalk at a curve vertex, a white notch in the kerb, the paving sheared across the seam (owner 3) | A dropped kerb (UrbIS "ramp") was a plane sloping from 2 cm at the kerb to 13 cm 1 m back, inside a sidewalk at 13 cm: its sides were vertical walls ("flanks") seen as a wedge, black in shadow; the ramp had its own paving frame (another polygon) | Dropped kerbs are bateaux: the ramp rises to the sidewalk's height toward its sides over 0.45 m (sloped wings), so it meets the sidewalk at one height (no wall, no crack); its warped part is cut on a 0.6 m grid; it shares its host sidewalk's paving frame and welded vertices; the kerb top follows it every 0.25 m |
| 8 | Paving pattern sheared / kinked along lines from the kerb into the sidewalk | The paving uv is (station, distance) to the nearest kerb point: at a corner of the kerb polyline the nearest point jumps or folds across the bisector; big triangles interpolated it linearly | The paving frame comes from a smoothed copy of each kerb (Chaikin, 2 rounds); sidewalk triangles where the kerb bends (R < 25 m) are split to 2 m |
| 9 | A narrowing: rectangular notch / step in the sidewalk, a sharp protruding corner, the edge line stops at the taper (owner 1) | UrbIS draws kerb extensions as steps (two right angles 0.15-3 m apart) | `surfaces.js taperSteps`: a step becomes a taper (its first corner moves back along the run before it, 2.5 x the step, 1-6 m), in every ring, kerb, edge and flank that shares that vertex, so roadway and sidewalk stay complementary |
| 10 | Lane lines crossing crossings (mid-block zebras) | Lane lines only ended at crossings on junction arms (markRange) | The engine asphalt is split by every drawn crossing outline; inside, its line codes are zeroed (`surfaces.js splitByCuts`) |
| 11 | Lane graph: zigzags and saw-tooth hooks behind the stop line, fans at odd angles, lanes off-centre and over the kerb (coordinator, Traffic Lab) | Offset curves of the engine's lanes loop back where a bend is tighter than the lane's offset (up to 345°/m); lanes sit on the engine's fitted width, not the measured one; connectors' arcs cut kerb corners | `viewer/streets/laneGraph.js refineLaneGraph`: loops cut at their self-crossing, cusps dropped; on simple stacks every lane point moves to the measured lane centre (max 1.5 m, smoothed); 1 m resampling and smoothing with the ends fixed; connectors follow their lanes' end moves and are pulled off kerb corners with a smooth envelope, then smoothed to R >= 4 m; hold points at the painted stop / give-way lines |


| 12 | Curves blocky and faceted (owner, second request) | UrbIS draws kerb radii and curved edges as a few chords (up to 60° per vertex, chord error up to 2.6 m on long arcs) | `surfaces.js smoothCurves`: every curved run (3-60° per vertex, pieces < 12 m) of the kerbs and outer edges gets points on a centripetal Catmull-Rom spline through the MEASURED vertices (which stay), <= 3° per piece, pieces >= 0.3 m; the same points go into every ring, kerb, edge and flank sharing that edge, so roadway, kerb face, sidewalk and paving follow one curve. Kerb faces keep per-vertex mitred normals (smooth along the curve); flat tops keep the height-field normal |
| 13 | Sidewalks: Brussels kerbs (owner, second request) | Kerb faces were one flat colour; the painted 15 cm band had no stones | Blue-stone kerbstones 1 m long: joints on the face and on the painted band at the same stations (both use the station along the smoothed kerb), each stone a touch different, joints fade with distance; a 12 mm top chamfer (shading normals half way to up); dropped kerbs as bateaux (row 7); the paving keeps the kerb frame round corners (fanning like laid tiles) instead of cross-fading two patterns |
| 14 | Paint hidden under asphalt (found by the new C15 check: the NW zebra of Saint-Job vanished after fix 10) | Engine-asphalt parts split by a crossing were drawn on their triangle's plane without the crease test: up to 15 cm over the paint. Also DEV (12 mm) + LIFT + tiers reached 22.5 mm, over the 20 mm paint lift | Split parts keep the crease rule of the whole triangle; DEV 8 mm, paint 22 mm (3.5 mm clear); unmapped engine triangles are dropped when any corner, edge middle or centre is on the measured street |

## Road Checker round 2 (C14-C23)

`tools/road_audit/mesh_checks.mjs`, wired in `road_audit.mjs` (blocking: errors of C14, C15, C16, C18, C19, C20, C21,
C22). Findings are clustered per 2 m cell (one crack 10 m long = 5 findings).

| Check | What it counts |
|---|---|
| C14 | crossings drawn twice (outlines overlapping > 0.5 m², or centres < 3 m), a drawn crossing the photo contradicts, a crossing clipped to < 60 % of its measured width |
| C15 | a lane line inside a drawn crossing (from the asphalt mesh's line codes), a stop line on a crossing, decal paint over decal paint |
| C16 | a stop / give-way line < 2 m (stray dash), not reaching the kerb by > 0.6 m, > 10° off square (Topo as surveyed: warnings) |
| C17 | sliver triangles (> 40:1, > 25 cm) on flat faces |
| C18 | T-junction cracks (a vertex inside another triangle's open edge, not welded) and open steps (an open top edge with another surface > 6 mm away beside it, no wall face along it) |
| C19 | kerb notches / steps (two > 50° corners < 3 m apart along a kerb), kerb gaps (a raised square / sidewalk / median meeting the carriageway with no kerb line within 0.75 m) |
| C20 | paving uv jumps > 2 cm at a shared position |
| C21 | normal jumps > 2° at a shared position; asphalt pieces of different tone meeting (per-piece tone) |
| C22 | lane graph: kinks > 20°/m (U-turn connectors excluded), lane points > 1 m off the measured lane centre (simple stacks), < 1 m clearance to a kerb, lanes of one road and direction crossing |
| C23 | curves (warning): kerb / edge vertices on a curved run turning > 5°; stats: vertices > 2.5°, max turn, max chord error |
| C15 also | paint under, or within 3 mm of, the asphalt it lies on (hidden / z-fighting) |

## Numbers: 120 tiles, before (commit 6c70e37, old markings) vs after (this branch), same checker

Errors (C23: warnings). Full reports: `docs/roads/audit/r2before/summary.md`, `docs/roads/audit/r2after/summary.md`.

| check:kind | before | after | note |
|---|---|---|---|
| C14 overlap (crossings drawn twice) | 41 | 26 | the rest: two measured outlines (BM + Topo) of one crossing that build_markings does not pair |
| C14 photo (drawn, photo shows none) | 3 | 0 | |
| C15 laneX (lane line through a crossing) | 79 | 11 | |
| C15 decal over decal | 82 | 23 | mostly a BM glyph touching a crossing |
| C15 paint hidden under asphalt | 13 | 1 | |
| C15 stop line on a crossing | 4 | 4 | Topo as surveyed |
| C16 stop line short of the kerb | 45 | 3 | |
| C16 stray dash (< 2 m) | 8 | 1 | |
| C19 kerb notches / steps | 2,570 | 495 | |
| C19 kerb gaps | 47 | 48 | |
| C20 paving uv shear | 265 | 125 | |
| C21 per-piece tone seams | 205,464 | 0 | the asphalt facets / wedge |
| C21 normal jumps (asphalt) | 7,862 | 7,831 | unmapped engine roads keep the engine's normals at their joins: not fixed |
| C18 asphalt open steps | 1,502 | 829 | |
| C18 concrete open steps | 2,443 | 5,890 | WORSE: 0.6-1 cm steps where a ramp's ring and its sidewalk's ring do not coincide in the data, visible now that ramps are warped (see Remaining) |
| C18 T-junctions (asphalt / concrete / pits) | 55,758 / 42,527 / 10,806 | 50,147 / 44,017 / 10,732 | mostly the engine layer's vertices on the base's edges (1.6 cm apart by design) and the tree-pit slabs: a weak metric, see Remaining |
| C22 lane kinks (> 20°/m) | 4,530 | 1,134 | paths with a kink 4,752 -> 1,150; max 359 -> 119 °/m |
| C22 lanes < 0.5 m from a kerb | 23,484 | 15,814 | points < 1 m: 234,786 -> 153,464 |
| C22 lanes > 1 m off the lane centre (warn, points) | 67,208 | 15,129 | simple stacks |
| C23 faceted curve vertices (warn) | 16,885 | 19,013 | more vertices are counted (the refined curves); max chord error on a curve 258 cm -> 70 cm |
| C3 stop / give-way lines (phase-1 check) | 89 | 35 | |

Per junction (errors within 60 m of the lab junction; C18 is mostly the T-junction metric above):

| J | tile | before | after |
|---|---|---|---|
| 1 | I6 | C1 1, C14 1, C16 2, C18 138, C19 2, C20 1, C21 304, C22 93, C3 1, C4 2, C8 6, C9 5 | C1 1, C18 143, C22 51, C4 2, C8 6, C9 5 |
| 2 | H6 | C18 81, C19 1, C21 108, C22 21, C4 3, C8 2, C9 1 | C18 75, C22 13, C4 3, C8 1, C9 1 |
| 3 | G2 | C18 203, C19 11, C21 455, C22 13, C8 5, C9 6 | C18 190, C19 4, C8 5, C9 10 |
| 4 | E4 | C16 2, C18 177, C19 16, C20 3, C21 476, C22 143, C3 5, C4 4, C8 7, C9 28 | C18 182, C19 4, C20 3, C21 2, C22 89, C3 5, C4 4, C8 7, C9 28 |
| 5 | E4 | C18 115, C19 1, C21 365, C22 106, C3 2, C4 2, C9 6 | C18 93, C19 1, C22 90, C3 2, C4 1, C9 4 |
| 6 | E1 | C15 1, C18 185, C19 15, C21 416, C22 44, C3 3, C8 2, C9 9 | C15 1, C18 165, C19 2, C22 13, C3 1, C8 2, C9 10 |
| 7 | I2 | C16 6, C18 166, C19 18, C21 345, C22 66, C4 3, C5 2, C8 4, C9 3 | C18 169, C19 11, C22 50, C4 3, C5 2, C8 4, C9 1 |
| 8 | J7 | C18 105, C21 182, C22 4, C9 1 | C18 93 |
| 9 | D8 | C18 59, C21 102, C22 26, C8 2 | C18 56, C22 14, C8 2 |
| 10 | J5 | C1 1, C18 87, C21 174, C22 6, C3 2, C4 1, C9 1 | C1 1, C18 91, C21 1, C22 3, C4 1, C9 1 |

Lane graph, 120 tiles: paths with a kink 4,752 -> 1,150, max heading change 359 -> 119 °/m (U-turns excluded; p95 ~7
°/m both), off-centre points 67,208 -> 15,129, points < 1 m from a kerb 234,786 -> 153,464, lanes of one road and
direction crossing 0 -> 0. Hold points at a painted line: 0.6 m before it.

Cost: road triangles over the 120 tiles 5.28 M -> 8.19 M (+55 %: warped ramps cut on a 1 m grid, refined curves, the
kerb chamfer row); road stage median per tile 1,036 -> 987 ms (Node; the faster nearest-kerb search pays for the rest).
City, walk view `?tile=..&at=..&view=walk`, after the initial load, 8 s of GPU timestamps (two other agents on the GPU:
noisy). A = before (6c70e37 served from a scratch worktree), B = after, worker bundle rebuilt:

| place | A draws / tris / GPU avg ms | B draws / tris / GPU avg ms |
|---|---|---|
| I6 Saint-Job | 423 / 4.13 M / 21.8 | 408 / 4.35 M / 20.2 |
| E4 Alsemberg / Brugmann | 399 / 4.35 M / 12.3 | 400 / 4.75 M / 8.6 |
| E1 Vanderkindere | 374 / 3.34 M / 12.1 | 368 / 3.65 M / 11.1 |

No console errors. Draw calls the same or fewer, GPU time within noise, scene triangles +5-10 %. One round per place
(A then B, B then A at E1): not enough rounds to call the GPU difference anything but noise.


## Images (`docs/roads/round2/`)

All captures: the Road Lab at 1400 x 900, the same cameras before (6c70e37, served from a scratch worktree) and after.

- `round2/before/`, `round2/after/`: per junction `j<N>_{plan_photo, plan, close_photo, close, oblique, street, street2}.jpg`
  (photo = the 2024 orthophoto drawn over the roads, same camera).
- `round2/sheets/j<NN>_{before,after}.jpg`: photo | ours | oblique | street per junction.
- `round2/pairs/j<NN>_<view>_before_after.jpg`: before | after for close, plan_photo, oblique, street, street2.
- The owner's spots, before | after: `pairs/owner1_narrowing[_plan]_before_after.jpg` (a step tapered, I2 1288,-1455),
  `pairs/owner2_stjob_zebra_square_before_after.jpg`, `pairs/owner2_stjob_nw_zebra_before_after.jpg` (no floating stop
  line, no seam), `pairs/owner3_ramp_spike_before_after.jpg`, `pairs/owner3_ramp_wide_before_after.jpg` (I6 1058,548).
- Curves and kerbs at street level: `pairs/curve_corner_{street,kerb_close,j6}_before_after.jpg`.
- Lane graph (lanes=1, measured + our paint on): `pairs/j{1,5,6}_lanes_before_after.jpg`.
- Moving: `before|after/strip_j{1,5,6}_{walk,drive}.png` (labs/frameStrip.js, 8 frames of a 4-6 s move at 60 fps; the
  first three frames of the J1 drive start off the road, in the terrain). Flicker test (labs/flickerTest.js, 24
  frames, sub-pixel strafe, street level): J1 43 -> 8 blinking px, J5 82 -> 83 (in both: the far kerb skirt's sub-pixel
  edge at the left, not z-fighting; the paint does not blink). `before|after/flicker_j{1,5}.png`.
- `round2/photo_dropped_crossings.jpg`: the 2 measured crossings the photo check drops (contact sheet, calibration).
- City: `before|after/city_e1_j6_walk.jpeg`.
- Working images of this round (not before / after): `round2/wip*/`.


## Lane graph: what claude/traffic must adapt

- Traffic takes `rd.net` after the roads2 road stage: the lane paths (`net.graph.paths`) are now changed by
  `viewer/streets/laneGraph.js` after the network is built (paint v2): `pts`, `cum`, `len` are new arrays (1 m
  resampled, smoothed); ids, `prev` / `next`, `kind`, `roadId`, `side`, `laneId`, `nodeId`, `turn` are unchanged.
- Hold points: a lane whose last 30 m cross a painted stop / give-way line holds 0.6 m before it: `p.stop.at` (station
  along the new path) and `p.stop.line` (the inventory id); `p.stop.control` is kept when the engine had one, else
  "stop" / "yield" from the line's kind. Lanes with no painted line keep the engine's station (rescaled to the new
  length). Read `rd.inventory.stops` for the lines themselves.
- `fitToSurface` in claude/traffic (lane positions fitted to the measured street) should now be a no-op on simple
  stacks: the graph is centred already. Multi-lane stacks are still the engine's widths fitted to the median measured
  width.

## What remains (honest)

- **Ramps (dropped kerbs)**: the bateau removed the owner's spike, but where UrbIS's ramp ring and its sidewalk's ring
  do not coincide (up to 5 cm apart) a 0.6-1 cm open step remains along part of the ramp side (C18 concrete-step 2,443
  -> 5,890), and a ramp whose host sidewalk is not found by shared vertices keeps its own paving frame (a pattern
  change, seen at J5's south-west crossing). Fix: snap ramp rings to their host sidewalk's edges in `build_surfaces.py`.
- **Tactile paving, gutter strips, façade joints**: no data. UrbIS / BM have no tactile or gutter layer we fetch;
  Street View shows tactile tiles at most signalised crossings and a 2-3 sett gutter on many streets, but nothing was
  invented. The sidewalk meets the façades through the outer-edge skirt as before (unchanged this round).
- **BM inventory surfaces (S*: hatched / coloured areas: the painted island box at Saint-Job, red plateaus)**: not
  drawn: the `mark_type` legend is unknown (asked of Brussels Mobility, `brussels_mobility_request.md`). Topo arrows
  (CR2401P / 2402P / 2410P) likewise: kinds unknown, not drawn (the BM P* glyphs, which ARE the shapes, are drawn).
- **J5**: the left diagonal BM outline extends over a surface UrbIS does not class as carriageway: the zebra is cut
  there (the photo shows the bars continuing).
- **J1**: one lane path still runs over the SW sidewalk (the engine road's centreline leaves the measured street: C8).
- **J3, J4**: the tram sites are plain light concrete / setts surfaces (no rails in the lab; the city draws the tram
  track separately). J4's corner "gardens" were grass medians: the photo shows them paved, now paving.
- **Levels (J2, J9, J10)**: bridges and the underpass are drawn at ground level (phase 4, unchanged).
- **C18 T-junction metric**: it counts vertices of the 1.6 cm engine layer lying on the base's edges (no visible crack)
  and the tree-pit slabs' butt joints; it needs a layer filter before it can gate a build.
- **Normal jumps (C21, 7,831)**: unmapped engine roads (outside UrbIS) keep the engine's normals where they meet.
- **Cost**: +55 % road triangles (8.2 M over all 120 tiles; +5-10 % of a city view). The ramp grid is the biggest share
  (E4: ramp base triangles 4.9 k -> 29.6 k); a ramp-only quad strip along the kerb would cut it ~5x.
- **Curves**: arcs whose UrbIS pieces are longer than 12 m and corners sharper than 60° are left as drawn (max chord
  error 70 cm remains on such long arcs).
- **Photo check**: the stripe scan is noisy (shadows, cars, outlines 1-3 m off their paint); only records the photo
  clearly contradicts are dropped (2 of 1,326). Measured outlines offset from their paint are drawn where measured.
- **Not all images were looked at one by one**: I reviewed J1, J3, J4, J5, J6, J7, J8, J10 sheets, the owner spots, the
  curve pairs, the lanes pairs and the J1 / J5 strips; J2 and J9 only through their checker numbers and thumbnails.

