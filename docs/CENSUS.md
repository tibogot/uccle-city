# Defect census (claude/census, 2026-11-18)

After the owner's playtest of 2026-11-18 (docs/TODO.md "OWNER PLAYTEST 2026-11-18"), the owner asked for each defect
CLASS to be counted across the whole city before anything is fixed. Each class below has a detector that runs headless
in node: it builds every tile with the city's own code and checks what is drawn. Nothing is fixed yet and no detector is
a gate row yet. When a class is fixed, its detector becomes that fix's row in `tools/audit/mergeGate.mjs`.

All the detectors run as `node --import ./tools/road_audit/register.mjs tools/audit/census/<script>.mjs --all [--out FILE]`,
and `T ...` runs single tiles. Raw results are in `docs/census/*.json`. Positions are in local metres (x east, z south),
so a spot can be opened with `?quick=1&at=x,z`.

## Summary

| class | detector | count (city-wide, 120 tiles) | owner spot flagged? | generator | root-cause guess |
|---|---|---|---|---|---|
| A. Open meshes / missing walls | `openMeshes.mjs` (`--heroes` for the landmark GLBs) | tiles: 1,524 of 25,412 buildings, ~12,800 m²; heroes: 11 of 16 open, Saint-Pierre 53.5 m² at LOD0 (80 m² at LOD2) | yes (88, Saint-Pierre: south side) | Saint-Pierre: `tools/blender/stpierre.py` (`side_elevation` / `porch_bay`, the estimated east and annex walls); tiles: `viewer/facadeGeom.js analyseBuildings` + `viewer/wallRepair.js` | The checks never see the heroes: `shellGate`/`wallAudit` read only the UrbIS solids, and every hero's solid is hidden. The pack-time `mesh_audit` treats a wide hole as an "opening" (info only), and 4 heroes were never pack-audited. In the tiles, UrbIS triangles face inward, or there are gaps off the footprint edges `wallAudit` tests. |
| B. Balconies open at the sides | `balconies.mjs` | 20,061 of 20,663 balcony slabs open (36,791 open ends) in 1,162 buildings | yes (84: Ch. d'Alsemberg 1033E D6, 860 / 905 E5, 997 D5) | `viewer/facadeGeom.js` `typeDetails`, the BLOCK "BALCONIES" branch | By design: slab + front parapet only, no side panels and no returns. The facade kit's own balconies (`tools/blender/facadeKit.py` `railing(returns=True)`, 1,836 placed) are closed. |
| C. Terrain / sidewalk ground | `ground.mjs` | sidewalk tilt 4,052 groups / 29,510 m²; road cross-fall bumps 1,462 / 24,092 m²; terrain lumps 1,273 / 16,701 m²; holes 3,038 / 16,850 m²; spikes 675 / 2,751 m² | 91 yes (Av. Brugmann 349, F2 -275.5, -1191.7: 18 m² at a 62 % cross-fall); 77 / 89 not located | sidewalks / roads: `viewer/surfaces.js` `prepareSurfaces` / `buildSurfaceRoads` (the street height field `prep.H` follows the DTM); terrain: `viewer/heightmap.js` `weld` / `clampUnder` / `carve` | The measured street's height comes from the DTM, so a sidewalk at the foot of a bank climbs the bank: there is no "level with the kerb" rule. Weld banks go up to 2 m (maxRise) to a surface edge, and clamp / carve drop cells up to 1.2 m. The terrain list is noisy: rail cuttings and tunnels (D9 / E9 / G6) are intended. |
| D1. Street-name plate away from its post | `streetProps.mjs` | 237 of 748 post plates (gap > 0.15 m, up to 6.5 m) | yes (78, Rue Papenkasteel E6: 4.07 m) | `viewer/main.js` loadTile `snap(skDoc, [["signs"], ["posts"]])` (`viewer/streets/carriageway.js docOffLanes`) | The load-time snap moves the street kit's post out of the lane, but the street-life layer (`viewer/streetlife/layout.js`, plates) still draws the plate at the baked spot. They are two layers with one position and only one of them is moved. |
| D2. Signs facing wrongly | `streetProps.mjs` | 78 of 1,792 poles: 25 show a no-entry C1 and a one-way F19 to the same traffic (one pole, or poles under 4 m apart); 53 face across every street within 12 m | yes (79, E6 -685.1, 999.7: C1 + F19 on one pole at the Papenkasteel / Ch. de Saint-Job junction) | `tools/streetkit/build_streetkit.py` `place_tile` (the one-way rule: F19 at the flow start, C1 at the flow end) + pole sharing | Two one-way pieces meet at one junction: one piece's end (C1) and the next piece's start (F19) land on one corner and are merged onto one pole. Also 78 signs moved > 1.5 m by the load-time snap (onto another kerb). |
| D3. Furniture in the carriageway / on tram tracks | `streetProps.mjs` | 389 of 4,977 pieces still in a driven lane or within 1.3 m of a tram track after the load-time moves (369 lane, 34 tram): 25 post boxes, 11 Villo stations, 108 signs, 131 plate posts, 70 stop poles, 39 furniture2 pieces, 5 shelters | yes (85 bpost:4405 Ch. d'Alsemberg E5 -986.4, 312.6; 86 Villo Rittweger E5 -939.2, 144.6, 4 of 29 pieces on the tracks) | post boxes / Villo: `tools/streetlife/build_streetlife.py` (WFS point kept as is, only turned to the road) and `tools/streetkit/build_streetkit.py` `place_villo`; the rest: `docOffLanes` gives up (no kerb within 6 m, no measured street in Flanders) | Post boxes and Villo stations are not in main.js's snap list at all. The snap tests lanes only, not the tram tracks. |
| E. Tram rails into the sidewalk / kerb | `tramRails.mjs` | 48 runs, 421 m of rail on a raised class + 152 m in the kerb line (of 47.4 km of rail) | yes (92, Ch. d'Alsemberg E2 -887.5, -1051.8: 37.5 m) | `viewer/tileData.js` (OSM tram lines -> `viewer/track.js smoothPolyline`) + `viewer/main.js featureObjects` (rail top = max(drawn surface, profile)) | The OSM track lines are never fitted to the measured tram road / kerbs, and smoothing moves them further. Over a raised class the rail climbs onto it. |
| F. Road lines off the carriageway / skewed | `markings.mjs` | of 121.8 km of painted strokes (53.7 km on unmeasured streets, not judged): 6.0 km off the measured carriageway, 0.96 km on a kerb line, 0.41 km skewed > 12° to a straight kerb; 401 runs | no owner image to match | the asphalt shader lines (`viewer/roadPaint.js`, aEdges) laid out by `vendor/roads` laneRoadMesh from the OSM centre line + lane stack, fitted by `viewer/roadBuild.js fitRoadWidths`, overlaid by `viewer/surfaces.js buildSurfaceRoads` | The engine's lines follow the OSM centre line, not the measured street, and the overlay keeps engine strips (with their lines) on sidewalks, ramps and pits. The paint decal (v2) is clipped by construction (3 % raster noise). |
| G. Coplanar z-fighting | `zfight.mjs` (`--heroes`) | tiles: 32,001 pairs, ~33,100 m², in 3,301 buildings; 46 kit openings on an uncut painted wall; heroes: Saint-Pierre 49 / 118 / 59 m² (L0 / L1 / L2), town hall LOD1 134 m² | 87 / 93 NOT flagged (no coplanar pair at Maison Dandoy E3 / I5 or the Calzedonia front E4) | details: `viewer/facadeGeom.js` `box()` strips at corners (24,924 pairs); walls / roofs: UrbIS duplicate solids passed through (`pipeline/build_buildings.py` -> `analyseBuildings`, e.g. Av. Hamoir 8 J5: one solid twice); heroes: `tools/hero_pack.mjs` meshopt LOD1 | The UrbIS duplicates are not deduplicated, facade boxes overlap at corners, and LOD1 simplification collapses parts into each other. The window shimmer in 87 / 93 is not in the static geometry: likely the painted-window / interior shader, ivy cards or TAA (browser). |

## 10 worst per class

**A (tiles):** F7 Rue de Verrewinkel 95D (-368.8, 1378.8) 434 m²; F7 Verrewinkel 95C (-386.5, 1372.7) 391; H1 Rue Dodonée 92
(911.9, -1557.2) 154; D5 (-1499.7, 349.3) 152; K6 (2018.9, 568.2) 102; D5 Rue de Stalle 70 (-1193, 110.2) 101; J4 Ch. de
Waterloo 964 (1677.1, -353.9) 100; F1 Rue Vanderkindere 112 (-397.7, -1645.7) 97; I1 Rue Lincoln 78 (992.7, -1634.7) 96;
E5 Rue Rittweger 6 (-998.4, 150.7) 87. **Heroes (LOD0 m²):** Saint-Pierre 53.5, Augustin 35.6, Van Buuren 33.9,
Saint-Marc 32, Saint-Job 28.6, Calevoet 25.8 (mostly ground-level see-through: porches? check), town hall 19.9, Russian
church 7, police 6.4, Observatory 3.7.

**B:** H2 Av. Winston Churchill 163 (769.4, -1269.9) 358 open slabs; H4 (612.6, -281.1) 301; G3 (186.5, -692.6) 275; D6
Ch. d'Alsemberg 1033E (-1243.9, 563.4) 256; J3 Ch. de Waterloo 963 (1534.9, -809.6) 270; F3 Av. Château de Walzin 3
(-228.6, -918.5) 264; J6 Ch. de Waterloo 1322 (1797.2, 924.4) 217; J4 (1523.9, -39) 175; F3 Av. de Boetendael 51
(-340.2, -871.3) 144; I3 Av. De Fré 265 (1217, -538.5) 138.

**C** (full lists in docs/census/ground.json). **Sidewalk tilt:** G10 Rue de Percke 161 (327.8, 2790.9) 306 m² up to
86 %; F9 (-164.9, 2035.7) 147 m²; D6 Av. Ilya Prigogine 9 (-1407.9, 803.9) 111 m²; G6 Rue Basse 56 (62.6, 650.2) 90 m²;
H6 Rue Baron Perelman 3 (691.3, 534) 69 m² at 72 %; H7 Vieille rue du Moulin 81 / 85A (936.9, 1126.5) 109 + 93 m²; C3
(-1850.6, -797.3) 51 m² at 72 %; F2 Av. Brugmann 349 (-275.5, -1191.7) 18 m² at 62 % (image 91). **Road cross-fall:** C3
(-1848.1, -792.3) 446 m² at 72 %; G7 Av. de la Chênaie 85 (114.4, 1260.3) 378 m² at 50 %; L5 (2695.1, 103.4); N5
(3757.2, 256.5); G10 Rue de Percke 161; H6 Rue Baron Perelman 4 at 72 %; D6 Rue François Vervloet 10; G4 Av. Kamerdelle 91.
**Terrain lumps:** K10 (2324, 2877) 615 m², +1.7 m; D9 (-1037, 2412) +4 m; G6 Av. Carsoel 126B (129, 530) 175 m², +2 m;
F7 (-277, 1469); E6 Ch. de Saint-Job 253 (-535, 936) 165 m², +2 m; K6 Av. du Maréchal 33 (2128, 621). **Holes:** D9 / E9
(rail cutting, intended); G6 Ch. de Saint-Job 454 (444, 782) -7 m; F4 (-471, -418) 316 m²; D5 (-1412, 360) -3.8 m.
**Spikes:** D10 (-1038, 2941); E10 (-649, 2859) 7.9 m; E8 Rue Engeland 340 (-697, 1784) 3.8 m.

**D1 plates off their post:** E3 Av. de l'Échevinage (-522.9, -591.8) 6.5 m; K10 Av. de la Petite Espinette 6.5; F5 Dieweg
(-119.8, 321.2) 6.4; N5 Ch. de La Hulpe 6.4; D4 Rue Victor Gambier (-1108.4, -7.3) 6.3; M10 Drève Saint-Hubert 6.3; F3 Square
De Fré 6.3; E4 Rue Rouge 6.2; E1 Av. Coghen 6.0; E10 Av. des Mûres 6.0 (Papenkasteel E6 (-677, 988.7) 4.1).
**D2 signs:** C1 + F19 conflicts at B4 Ch. de Ruisbroek (-2422.2, -14.2), Rue des Lutins (-2396.7, -42.4), D6 Rue Engeland
(-1179.8, 862.7) and (-1154.4, 898.6), D7 Rue du Bourdon (-1350.6, 1279.3) and (-1334.2, 1290.7), D7 Ch. d'Alsemberg
(-1350.3, 1210.3), E1 Rue de l'Escrime (-894.8, -1965.8), E4 Av. Wolvendael (-617.9, -240.7), E6 Ch. de Saint-Job
(-685.1, 999.7). **D3 in the road:** C3 bpost:4305 Rue Gatti de Gamond (-1513.4, -617.7); E5 bpost:4405 Ch. d'Alsemberg
(-986.4, 312.6, on the tram tracks); E5 Villo Rittweger (-939.2, 144.6); E4 stop "Globe" poles Av. Brugmann (-862.3,
-177.2) (tram island? check); B5 Carrefour Stalle stop poles (-2068.1, 338); B6 glass banks Kuikenstraat (-2494.9, 570.9);
A5 C1 Ch. de Ruisbroek (-2685.4, 126); B5 B5 sign (-2012.3, 220.2); C3 plate post Av. Fontaine Vanderstraeten
(-1573.9, -914.5); B8 plate post Rue du Bois (-2019.2, 1874.9). In Flanders (A-B tiles) nothing moves anything at load,
because there is no measured street there.

**E:** H2 Av. Winston Churchill (853, -1379.6) 178 m, (701.3, -1378.7) 121 m, (992.3, -1391.7) 46.5 m; I2 Churchill
(1246.3, -1437) 96 m; G2 Churchill (220, -1464) 49 m (Churchill: the tracks run beside the central promenade's paving.
Check whether UrbIS maps the reservation as sidewalk); E3 Ch. d'Alsemberg (-908.1, -551.4) 74 m; E5 Alsemberg (-943.1,
178.7) 50.5 m; B4 Ch. de Ruisbroek (-2334.4, -58) 47.5 m; E2 Alsemberg (-887.5, -1051.8) 37.5 m (image 92) and
(-834.5, -1284.8) 37.5 m.

**F:** F3 Av. Henri Elleboudt (-195.9, -682.7) 461 m off street (sidewalk / ramp / pit); K4 Av. du Vivier d'Oie (2010.5,
-277) 227 m on sidewalk; I5 Av. Latérale (1261.1, 348.5) 211 m; E4 Rue des Fidèles (-758.2, -417.9) 206 m; C5 / C4 Rue Gatti
de Gamond (-1546.1, 4) 163 m + (-1564, -112.6) 128 m; G5 Dieweg (323, 154.4) 112 m; H8 Av. Dolez (515.9, 1902.7) 102 m;
E4 Rue De Broyer (-999.5, -321.5) 94 m; M5 Av. du Pérou (3404.6, 92.1) 93 m. Skewed lines: J7 Vieille rue du Moulin
(1531.9, 1018.8) 44 m, E4 Av. Brugmann (-891.9, -167.7) 35 m, K4 Av. de Boitsfort (2359.1, -13.6) 35 m.

**G:** J5 Av. Hamoir 8 (1749.2, 89) 1,940 m² (UrbIS solid 760045 = 761186); D5 Rue de Stalle 73 (-1369.6, 159.3) 816; G3
Rue Zeecrabbe 24 (395.8, -786.9) 802; I1 (1120.3, -1677.4) 663; G2 Av. Adolphe Dupuich 24 (195.3, -1138.4) 620; F5
(-143.4, 11.1) 551; F8 Clos Jean-Pierre de Launoit 5 (-263.6, 1656.3) 539; E2 (-710.4, -1482.4) 505; G8 Av. Dolez 143A
(443.3, 1986.9) 444; C7 Ch. de Drogenbos 176A (-1876.7, 1470) 369. Shop fronts buried in their wall: Barat (E3), Brico (G3),
Le Chemin des Vignes (F1), Battery Centre (I1).

## Fixed

- **B (claude/balcony, rule 27 provisional, gate row `balconies`).** `viewer/facadeGeom.js` `balcony()`: the slab and a
  U-shaped parapet (front + both sides, the front's material, 1.16 m, 6 cm) as one shell: one soffit, mitred parapet
  tops, no hidden / doubled faces, no T-junction, nothing in the wall; 22 triangles a balcony, as many as the old open
  slab + parapet. Balconies touching side by side get one shared divider (none does in the city today: the spans keep
  0.3 m gaps; the shell test covers the case). `balcClear()` cuts a balcony back where it would run into another
  balcony (inside corners), one of its own building's other walls (an inside corner's other wing), its own roof
  sloping through it or a taller neighbour; a roof high over it (an upper storey overhanging a loggia, G3 380, -570)
  or a lower roof (a terrace) keeps it (browser turn: a first cut that dropped every balcony under its own roof removed
  the G3 loggia balconies). City-wide (120 tiles): before 20,658 slabs / 36,782 open ends (?balcony=old), after 20,387
  slabs / 0 open ends (`docs/census/balconies_closed.json`, `balconies_old.json`); detail triangles 4,463,540 ->
  4,460,680 (-2,860, the balconies cut back at inside corners / walls; 0 per balcony), no draw call added (the tile's
  detail mesh). zfight on H2 / H4 / G3 / D6: 1,544 -> 1,504 coplanar pairs. Detector changes: the U-shaped parapet top
  counts as a parapet (fill < 0.4), a slab is >= 1.15 m deep and filled (the 1.1 m BLOCK entrance canopy was taken for a
  slab under the closed balcony's U top), `--old`, `--max`, the shell self-test.

## Not detected here (needs the browser, or not located)

- G: the window shimmer in 87 / 93 is not static geometry. It needs a browser A/B (window shader, interior glass, ivy
  cards, TAA).
- A: whether the heroes' see-through clusters at ground level are real porches / canopies (Calevoet, town hall, Russian
  church).
- C: images 77 (blocky grass and gravel bump) and 89 (a raised asphalt slab with an edge line and kerb faces) could not
  be located without a position. The terrain scan lists lumps / spikes city-wide but has not been validated on those two
  spots. 89 looks like an engine strip kept over the measured ground (a contact / floating-edge case: the browser's
  `debug` contact audit, or `tools/mesh_audit/contact.js`).
- The runtime layers the node builds do not cover: ivy, interior windows, street-life boxes, collider view.
- Thresholds (C: 0.5 m lump / hole / spike, 15 % sidewalk / 12 % road cross-fall; D2: 45°; F: 12°, 0.10 m) are first
  guesses tuned on the spots above. Each fix job should re-tune its own class before it becomes a gate row.
