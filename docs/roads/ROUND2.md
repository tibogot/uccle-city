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

## Road Checker round 2 (C14-C22)

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

NUMBERS_PLACEHOLDER

## Images (`docs/roads/round2/`)

IMAGES_PLACEHOLDER

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

REMAINING_PLACEHOLDER
