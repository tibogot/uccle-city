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

**Fix (default; `?lyceerail=old` = as before, `?lyceerail=blend` = the A/B variant).** viewer/lyceeFront.js:
- a **coverage card** per panel and for the gate: one quad in the bars' mid plane whose alpha is the bars' box-filtered
  coverage of the pixel (tslkit `filteredPulse` over `fwidth`, the railway fence's method; analytic, so no texture or
  mipmaps): far, an even 21 % veil; near, the exact bar edges. Alpha-to-coverage (MSAA native; under the TAAU the
  stochastic coverage of upscale.js `seeThrough`, which the history averages); `blend`: blended at the same coverage;
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
