---
class: F
title: Road lines off the carriageway / skewed
row: | F. Road lines off the carriageway / skewed | `markings.mjs` | of 121.8 km of painted strokes (53.7 km on unmeasured streets, not judged): 6.0 km off the measured carriageway, 0.96 km on a kerb line, 0.41 km skewed > 12° to a straight kerb; 401 runs | no owner image to match | the asphalt shader lines (`viewer/roadPaint.js`, aEdges) laid out by `vendor/roads` laneRoadMesh from the OSM centre line + lane stack, fitted by `viewer/roadBuild.js fitRoadWidths`, overlaid by `viewer/surfaces.js buildSurfaceRoads` | The engine's lines follow the OSM centre line, not the measured street, and the overlay keeps engine strips (with their lines) on sidewalks, ramps and pits. The paint decal (v2) is clipped by construction (3 % raster noise). |
---

### Worst spots

**F:** F3 Av. Henri Elleboudt (-195.9, -682.7) 461 m off street (sidewalk / ramp / pit); K4 Av. du Vivier d'Oie (2010.5,
-277) 227 m on sidewalk; I5 Av. Latérale (1261.1, 348.5) 211 m; E4 Rue des Fidèles (-758.2, -417.9) 206 m; C5 / C4 Rue Gatti
de Gamond (-1546.1, 4) 163 m + (-1564, -112.6) 128 m; G5 Dieweg (323, 154.4) 112 m; H8 Av. Dolez (515.9, 1902.7) 102 m;
E4 Rue De Broyer (-999.5, -321.5) 94 m; M5 Av. du Pérou (3404.6, 92.1) 93 m. Skewed lines: J7 Vieille rue du Moulin
(1531.9, 1018.8) 44 m, E4 Av. Brugmann (-891.9, -167.7) 35 m, K4 Av. de Boitsfort (2359.1, -13.6) 35 m.

### Fixed

- **F (claude/markings, rule 33 provisional, gate row `markings`).** WHY: the lines along a road are the engine's lane
  strips, swept from the OSM centre line with one lane stack per road; `fitRoadWidths` scaled it to the road's MEDIAN
  kerb-to-kerb width and skipped one-way stacks, and `buildSurfaceRoads` kept the strips (with their lines) wherever the
  street was raised over them. FIX: `viewer/streets/lineFit.js fitLinesToStreet` (after the bend trim, before the
  overlay): at every engine sample the carriage interval round the centre line is measured along the normal (class
  raster, ends refined on the kerb / street-edge lines; junction mouths and samples > 1.5 m off the road's median shift
  not used), smoothed (30 m median, 12 m mean, slope <= 1:8), and every lane-strip vertex moves across its road so the
  stack's [curbR, curbL] lands on it (linear across, uv untouched: the lines move with their strips); edge lines sit
  0.3 m inside the kerb measured at their station (a 6 m median). `buildSurfaceRoads` (opts.lineClip) splits each
  engine triangle at the kerb lines crossing it and zeroes the line codes of the parts not on roadway / tram roadway /
  parking. The traffic lanes (net) are not moved. City-wide (120 tiles, `docs/census/markings_fit.json` vs
  `markings_old.json`): off the street 6,020 -> 511 m, along a kerb 957 -> 406 m, skewed 411 -> 313 m, runs 401 -> 220
  (of 123.5 km; 53.7 km on unmeasured streets not judged); worker +40-50 ms a tile (`line fit`). The bicycle: the
  Brussels Mobility survey holds ONE template (P09, 608 in the city: 1.50 x 0.92 m, wheels side by side across the lane,
  upright for the road user, anamorphic x 3.3) and the chevron (P10, 1.50 x 0.90 m, two at 1.59 / 2.38 m ahead of the
  bicycle); `viewer/streets/bikeGlyph.js` draws the standard pictogram (round wheels, diamond frame, saddle, bar, crank)
  to that outline, the paint shader evaluates it (and the chevron polygon) as signed distances box-filtered by their
  own footprint (decal kind 3, one quad a glyph: decal triangles 123,811 -> 73,585). Surveyed P09s face the way their
  frame side points (the outline's paint between the wheels); OSM shared lanes get bicycle + 2 chevrons. Switches
  `?roadlines=old`, `?bikemark=old`. Still flagged: I10 Drève Pittoresque 27 m, I7 Av. d'Andrimont 19 m skew, short
  roads whose OSM line lies > 6 m off their carriageway (E7 Saint-Job -714, 1003), kerb-raster noise at ramps.
  Round 2 (coordinator: cars drove up to 1 m off the new lines): the fit is measured once (`measureLineFit`) and
  applied to the strips AND to the traffic lanes (`laneGraph.js refineLaneGraph` opts.laneShift, in place of its own
  centring; its keep-on-carriage push at 1.0 m instead of 1.4 m for those lanes: at 1.4 m on the 0.5 m raster it pushed
  lanes up to 1 m off their paint into the next lane). A side whose stack has no parking lane is fitted to the
  roadway, not the parking bays; two fits meet without a step at an OSM way split; a tram road band between two roadway
  parts stops the fit. Lane centre vs painted lane centre: p95 0.08 m over 334k lane points (gate <= 0.25 m; counted
  apart: 23k where the painted lane is off the carriageway, 88k in painted lanes under 2.5 m where the lane keeps 1 m off
  the kerb). Lines after (round 2): 507 / 396 / 309 m. A LiDAR tree kept on a measured tram road but standing in a painted
  driving lane (+ 0.3 m) is moved / dropped like the carriageway ones (`viewer/tileData.js`, `roadTrees.js
  paintedDriveLanes`), unless it stands in a ROW on the tram road (two more within 12 m): Avenue Churchill's
  reservation (one OSM road whose stack spans it) keeps its trees (G2 / H2 / I2: 0 moved by this pass), H5 Carsoel
  (664, 472) moves 1. drivecheck back within its ceilings (211 places, tree 0).
  Browser turn (tour vs foundation2 + spot shots `docs/markings/*.jpg`): the bicycle reads upright with round wheels
  from the approaching road user (P09 at Alsemberg D5, the shared-lane bicycle + chevrons at Saint-Job I6); two fixes:
  (1) a narrow street's stretched stack squeezed its parking lane under a car's width (Av. Henri Elleboudt: the parked
  cars stood on the line): each sample's lanes are laid out again, a parking lane keeps min(its width, 2.0 m), the other
  lanes share the rest (one mode per road); (2) the moved strips stretched the paving texture (laid out in uv): the
  lateral uv is now the planar offset and the line positions go through the same map (lines unchanged, texture not
  stretched). The census reads each line's t per vertex (as the shader interpolates it) and keeps one sample per 1 m
  cell and side. City-wide after: 472 / 366 / 341 m (old 6,018 / 957 / 411), lane p95 0.08 m.
