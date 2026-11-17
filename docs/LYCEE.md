# Lycée Français front + Chemin privé 't Cortenbosch's old lane (claude/lycee, 2026-11-17)

Two owner notes from the same view (TODO NOW, "Lycée Français gate" and "Chemin du Cortenbosch"). Offline turn: causes,
fixes behind switches, the gate row `lycee` (tools/audit/lyceeCheck.mjs). The browser turn measures (section 3).

## 1. The fence left of the vehicle gate jitters

**Which fence.** From the avenue facing the gate (OSM service way 16293784, the gate across its mouth at x -316, z 1154),
left is south-east: the gatehouse (UrbIS 533140) and then the white railing of viewer/lyceeFront.js, which runs from the
gatehouse along the roundabout and up the avenue (RAIL, 23 panels of 2.5 m, ~52 m).

**Suspects, offline:**

| suspect | finding |
|---|---|
| (a) sub-pixel bars | 2.5 cm bars every 11.9 cm (railing, white) and every 11 cm (gate, black). At fov 55 and 1080 x 0.6 internal (Auto's floor) a bar is 2.6 px at 6 m, 0.78 px at 20 m, 0.52 px at 30 m: everything the avenue sees is under the TAAU's ~1.5-2 px. Rule 23's mechanism (jitter phases whose 3 x 3 neighbourhood misses a bar clip it from the history): **the cause** |
| (b) coplanar / overlapping faces | the gate's bar tops lay in its top rail's top face: **120 doubled faces** (lyceeCheck 1a, within 1 mm over >= 1 cm2), seen from above only. The railing's plinth and rails overlap in a wedge at the polyline's corners (volume), but the two tops part by > 1 mm off the corner line: no measurable fight. No garden wall / hedge / pillar / plant on the line after main.js's clear rings (the data has a hornbeam hedge and a brick wall on it: both cleared); no building wall in any face's plane (35 wall faces within 4 m, the gate's posts stand 0.28 m off the gatehouse) |
| (c) anything moving | nothing at that spot: the mesh is static in tile F7's features group (fades only while the tile streams), no LOD switch, no per-frame transform; the flags fly on the right (and were off in quick mode, below); the small trees at the railing's far end sway in the wind as everywhere |

**Fix (default; `?lyceerail=old` = as before, `?lyceerail=cover` = the coverage variant).** viewer/lyceeFront.js:
- a **filtered card** per panel and for the gate: one quad in the bars' mid plane whose alpha is the bars' box-filtered
  coverage of the pixel (tslkit `filteredPulse` over `fwidth`, the railway fence's method; analytic, so no texture or
  mipmaps): far, an even 21 % veil; near, the exact bar edges. **Blended** at that coverage (transparent, no depth
  write); the browser A/B (section 4) chose it over alpha-to-coverage (`cover`: the TAAU's per-frame stochastic
  coverage, which the history did not average well enough: only -5..-15 %);
- the **modelled bars kept close up** in their own mesh (they hide the card, which lies inside them), dithered out
  between 4 and 6 m (lodFade's dither, no pop); a bar at 6 m is 2.6 px. Their shadow is drawn at every distance
  (`maskShadowNode`): the sun's shadow never changes;
- the plinth and rails **mitred** at the corners; the gate's bars stop 1 cm into its top rail.
Cost: +2 draws (+ their shadow pass for the bars), +24 quads; the old mesh lost the bars (same triangles in total).

**Also fixed (same view):** the three flag poles stood bare in quick mode: `?quick=1` sets `flags=0` when the town hall
is outside the radius, and the Lycée's flags read the same switch. viewer/quick.js now keeps `flags` when the Lycée's
poles are within the radius.

## 2. "The second, paved part" of the Chemin privé 't Cortenbosch

OSM has two ways: 30498114 (the 1990s part east of the avenue's end) and 1235727248 (living_street, oneway=yes,
sidewalk=both: from Rue Geleytsbeek at x -330.6, z 819.8 down to the avenue's end at x -196.9, z 1028.0, 247 m, parallel
to the avenue). **Offline it is built**, every metre:

| suspect | finding |
|---|---|
| dropped in the road build | no: roads.json F6 (and F7's buffer) r1235727248_0..2, type oneWay, in the OSM node order; the engine network has all three (buildRoadNetwork) |
| measured surface | UrbIS 149914 + 30121 (F6) and the mouth 27386 (F7) cover the centre line at all 249 stations, 3-5 m wide; drawn by viewer/surfaces.js (the offline tile build: asphalt part with the sett surface, 0.11 m over the drawn ground) |
| joins | the Geleytsbeek end lies on Rue Geleytsbeek's surface 27387, the avenue end on 27386: no gap, no floating edge |
| under the terrain | no (drawn 0.1-0.15 m above the drawn ground everywhere sampled) |
| covered | after the city's own clear (gardenRestyle + clearRoads with the measured carriageway): 0 garden walls / pillars / gates / hedge points / plants / beds / tree trunks on it, no building over its middle 2 m; 15 real tree crowns (UrbIS canopy) hang over it |
| traffic | in the graph: three driven paths follow it (tile F6) |
| sidewalks | none drawn: UrbIS maps the lane as one street surface, no sidewalk polygons; OSM's sidewalk=both on a 3-5 m living street is the flush paver strip Street View showed in round 1 (docs/CORTENBOSCH.md) |

Round 1's screenshot `docs/cortenbosch/oldlane_after.jpg` shows it (setts between hedges). So no code changed for it:
**a fix needs to know what the owner sees as missing** (a stretch elsewhere, the paved look instead of setts, the edge
strips, or a view where tile F6 was not in). The browser turn looks at it (section 3) and the question goes to the owner.
The gate row keeps it built (lyceeCheck 2: surface every metre >= 2.5 m, joined, one-way in the OSM direction, nothing on it).

(Refactor: viewer/gardens/gardenClear.js holds cityGardens' `clearRoads` / `restyleHedges` unchanged, pure, so the gate
runs the city's own clear.)

## 3. Browser turn

- **Fence, measured:** `?quick=1&at=-309.0,1143.9&look=-304.3,1150.3,1.2&dynres=0&rscale=0.8` (the `rail8` spot), then
  `const L = await import("/debug/lyceeCheck.js"); await L.ab({ rounds: 2 })`: modes old / new / blend x views rail3,
  rail8, rail20 (facing the railing's first run at 3 / 8 / 20 m) and gate3, gate8, gate20 (facing the gate), the camera
  dollying sideways at 1.5 m/s; also `ab({ speed: 8 })` (a car passing). Keep the default if its fence / gate shimmer and
  hot pixels are <= old at every view; pick blend over coverage only if it measures better. `L.strip({ view: "rail8",
  modes: ["old", "new", "blend"] })` for the sheet; look close up (`L.go("rail3")`): bars modelled, no seam at 4-6 m.
- **Flags:** the same quick URL: three flags fly (Belgium / EU / France).
- **Lane:** `?quick=1&at=-256,936&look=-269,920.6,2` (round 1's oldLane view) and the mouths: `at=-322,834&look=-312,850`
  (Geleytsbeek end), `at=-205,1030&look=-215,1005` (avenue end). Compare with Street View (look only) and ask the owner
  which stretch is missing.

(The modes were renamed after the A/B: the blended card is now the default "new", the coverage card is `cover`.)

## 4. Browser turn results (2026-11-18, RTX 4050 laptop, one tab, 1280 x 720, rscale 0.8 fixed)

Fence / gate crop shimmer (mean |high-pass change| per frame, x/255) and hot pixels (% of the crop changing > 8/255),
medians over 2 rounds, the camera dollying sideways. old = modelled bars; cover = coverage card (A2C, the offline
turn's default); blend = blended card (now the default).

| view | old fence / hot | cover fence / hot | blend fence / hot | old gate / hot | cover gate / hot | blend gate / hot |
|---|---|---|---|---|---|---|
| 1.5 m/s rail3 | 9.06 / 31.6 | 8.60 / 31.5 | 8.80 / 31.7 | - | - | - |
| rail8 | 14.15 / 46.9 | 13.31 / 44.5 | **7.42 / 26.8** | - | - | - |
| rail20 | 7.51 / 32.8 | 6.38 / 28.3 | **3.48 / 11.6** | 1.66 / 3.8 | 1.63 / 3.6 | 1.61 / 3.5 |
| gate3 | 3.65 / 11.6 | 3.66 / 11.7 | 3.68 / 11.7 | 4.45 / 16.1 | 4.30 / 15.2 | 4.15 / 14.4 |
| gate8 | 1.75 / 3.5 | 1.77 / 3.6 | 1.78 / 3.6 | 6.31 / 24.2 | 5.67 / 21.7 | **2.53 / 6.1** |
| gate20 | 6.39 / 18.3 | 5.60 / 16.5 | **3.56 / 12.0** | 4.31 / 14.4 | 3.95 / 13.0 | **2.51 / 7.2** |
| 8 m/s rail3 | 8.65 / 33.0 | 8.88 / 33.9 | 9.06 / 34.6 | - | - | - |
| rail8 | 11.75 / 42.9 | 11.44 / 41.6 | **8.04 / 28.3** | - | - | - |
| rail20 | 6.21 / 27.9 | 5.44 / 22.8 | **4.76 / 17.3** | 3.63 / 12.6 | 3.57 / 12.3 | 3.41 / 11.2 |
| gate3 | 4.78 / 14.6 | 4.77 / 14.9 | 4.67 / 14.2 | 3.71 / 8.8 | 3.61 / 9.1 | 3.47 / 8.3 |
| gate8 | 3.91 / 14.2 | 3.63 / 13.1 | **3.26 / 10.9** | 5.25 / 18.2 | 5.09 / 17.1 | **4.04 / 12.7** |
| gate20 | 5.22 / 16.6 | 4.91 / 15.8 | 4.73 / 15.4 | 7.74 / 28.6 | 7.22 / 26.4 | 6.89 / 26.3 |

rail3 (the modelled bars' zone) re-run 4 rounds each: 8 m/s old 9.56 / blend 9.66 (per-run spread 7.3-9.7), 1.5 m/s
old 8.79 / blend 8.42: equal within noise. The gate-view "fence" crops (gate3 / gate8) hold almost no railing: equal.
Re-measured after making blend the default (fresh boot, 2 rounds): rail8 14.10 -> 7.36, rail20 7.47 -> 3.46, gate8 gate
5.57 -> 2.31, gate20 4.19 -> 2.46. Sharpness of the far fence drops with it (the veil is the bars' true average: the
lost "sharpness" is the aliasing). Close up (3 m, looking along the railing) the modelled bars hand over to the card in
the 4-6 m band with no seam or pop visible; the frame-difference strip at rail8 shows the old bars' bright crawling
pattern gone. Tour: lycee-front flagged as expected (the far railing reads as a soft veil instead of crawling bars, and
the three flags now fly: the tour's quick view had flags=0).

**Flags:** fly in quick mode (Belgium / EU / France). HEAP boots: 0 heapDrop / WebGPU errors, tripCounts {} in all five
(one police boot logged "no answer from the tile worker in 45 s" for E3 / E5 on the first boot after the merged worker
bundle; the tiles came in, a second police boot was clean).

**The lane (OSM 1235727248) against Street View (Apr 2024, look only):** it is in the city and it is the right street;
what differs from reality:
- **width:** real: 2.5-3 m of setts, the hedges / walls / house fronts tight against it, a lamp post at the edge; city:
  the UrbIS surface 3-5 m, grass verges then clipped hedges set back: it reads wider and more open than it is;
- **paving:** real: grey setts with a narrow flush edge (a row of setts or a kerbless gutter line), and on the middle
  stretch (n. 15) a parallel strip of red-brown brick pavers 1.5-2 m wide on one side where cars park, plus setts
  forecourts; city: setts only, no paver strip, no parked cars (the lane has none: parking:both=no);
- **painted words:** real: "Private Weg" / "Cortenbosch" painted on the setts at the Geleytsbeek end (n. 5), at n. 15 and
  at the avenue end (n. 42); city: the words only on the 1990s part (round 2), none on this lane;
- **edges:** real: ivy and privet / beech hedges, a timber fence, house walls right at the edge, green cast-iron lamp
  posts (lanterns); city: privet hedges, grass banks, small trees; no lamp posts seen on the lane;
- **slope / ends:** both right: it climbs ~16 m from Rue Geleytsbeek to the avenue; the Geleytsbeek mouth has the one-way
  and living-street signs, the avenue end the no-entry sign (in the city too);
- **sidewalks:** none in reality either (a woonerf: shared surface); OSM's sidewalk=both is not what is there.
So nothing is MISSING in the city; it looks wider, greener and plainer than the real lane. Question for the owner:
which stretch looked missing, or is it the look (narrow setts, brick parking strip, painted words, lamps)?
