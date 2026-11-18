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
| E. Tram rails into the sidewalk / kerb | `tramRails.mjs` | 48 runs, 421 m of rail on a raised class + 152 m in the kerb line (of 47.4 km of rail); FIXED (claude/tramfit): 7 runs, 26 m + 1 m (arc-length sampler, before 41 / 310 m / 109 m) | yes (92, Ch. d'Alsemberg E2 -887.5, -1051.8: 37.5 m) | `viewer/tileData.js` (OSM tram lines -> `viewer/track.js smoothPolyline`) + `viewer/main.js featureObjects` (rail top = max(drawn surface, profile)) | The OSM track lines are never fitted to the measured tram road / kerbs, and smoothing moves them further. Over a raised class the rail climbs onto it. |
| F. Road lines off the carriageway / skewed | `markings.mjs` | of 121.8 km of painted strokes (53.7 km on unmeasured streets, not judged): 6.0 km off the measured carriageway, 0.96 km on a kerb line, 0.41 km skewed > 12° to a straight kerb; 401 runs | no owner image to match | the asphalt shader lines (`viewer/roadPaint.js`, aEdges) laid out by `vendor/roads` laneRoadMesh from the OSM centre line + lane stack, fitted by `viewer/roadBuild.js fitRoadWidths`, overlaid by `viewer/surfaces.js buildSurfaceRoads` | The engine's lines follow the OSM centre line, not the measured street, and the overlay keeps engine strips (with their lines) on sidewalks, ramps and pits. The paint decal (v2) is clipped by construction (3 % raster noise). |
| G. Coplanar z-fighting | `zfight.mjs` (`--heroes`) | tiles: 32,001 pairs, ~33,100 m², in 3,301 buildings; 46 kit openings on an uncut painted wall; heroes: Saint-Pierre 49 / 118 / 59 m² (L0 / L1 / L2), town hall LOD1 134 m² | 87 / 93 NOT flagged (no coplanar pair at Maison Dandoy E3 / I5 or the Calzedonia front E4) | details: `viewer/facadeGeom.js` `box()` strips at corners (24,924 pairs); walls / roofs: UrbIS duplicate solids passed through (`pipeline/build_buildings.py` -> `analyseBuildings`, e.g. Av. Hamoir 8 J5: one solid twice); heroes: `tools/hero_pack.mjs` meshopt LOD1 | The UrbIS duplicates are not deduplicated, facade boxes overlap at corners, and LOD1 simplification collapses parts into each other. The window shimmer in 87 / 93 is not in the static geometry: likely the painted-window / interior shader, ivy cards or TAA (browser). |

## Class A, heroes: fixed (claude/heroshell, 2026-11-18)

Gate row `heroshell` (tools/audit/heroShell.mjs, rule 29 provisional): the probe below on all 17 heroes (the Square des
Heros monument added) at every LOD, party walls against a neighbour's solid and 4 intended openings
(tools/audit/heroShell.allow.json) excluded, ceilings = this after-count (tools/audit/heroShell.ceil.json). The probe's
"through" fail now also needs the ray to come out from under the roof (a ray grazing under a cornice into a re-entrant
corner counted before: most of the 1-direction clusters at ground level).

| hero | cause (generator) | open m2 before L0 / L1 / L2 | after |
|---|---|---|---|
| Saint-Pierre | stpierre.py: the porch bay cut at nave bay 4 (the porch is under bay 3): two overlapping holes in one fill, a broken triangulation (screenshot 88); the south side ended at u 33.3, nothing above the south-east annex; the upper register's north side wound inward; LOD2 slits between slots (hero_pack) | 56.2 / 56 / 85.9 | 0 / 0 / 11.8 |
| Saint-Augustin | augustin.py: every swept profile (plinth, copings, bands, sills) clockwise = facing inward (1,116 back-face fails) | 32.2 / 12.7 / 13 | 0 / 0 / 2 (+ the open lantern, allowed) |
| Saint-Job | stjob.py: one corner chapel's arc centre fitted OUTSIDE the church: its walls and roof faced inward (~20 m2) | 32.1 / 34.3 | 4.4 / 5.2 (+ the dome lantern, allowed) |
| Van Buuren, police station | party walls against UrbIS 509389 / 531654 (hidden by the neighbour in the city) | 29.2 / 12.5 | 0 / 0 |
| Saint-Marc, Calevoet | the front colonnade porch, the platform canopy: open by design (allowed) | 16.3 / 10.3 | 0 / 0 |

Left under the ceilings (not fixed, listed for their own pass): Observatory 25.2 / 31.3 / 23.1 (scattered 1-direction
clusters <= 2.4 m2 across the site, not traced), Russian church 10.9 / 12.6 / 8.3 (a grazing gap between the round
turret and the tower, 1-2 directions), town hall 5.2 / 4.8 / 37.9, police L1 / L2 10.5 / 24.6, Rosaire L2 24.9 (its
scripted far variant), Papenkasteel L2 13.4, Saint-Pierre L2 11.8, Wolvendael L2 9, Sacre-Coeur 3.9 / 0 / 2.7. The L2
levels are the meshopt far levels of the town hall / police / Papenkasteel / Wolvendael packers (their own
`*_pack.mjs`, no LockBorder yet: a rebuild of each in Blender + its pack) and are seen from > ~450 m.

## Class J, thin bars: fixed (claude/jitter, 2026-11-18)

Strokes (bars, rails, grilles, glazing bars under 3 cm) drawn as geometry where they project under 1 internal px:
garden ironwork 421 -> 12 per piece set (1.57 M -> 18.6 k stroke-instances city-wide), façade kit 312 -> 11.
Detector tools/audit/census/thinBars.mjs (`--old`, `--heroes`), gate row `jitter`, docs/JITTER.md, rule 35.

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


**Class D fixed (claude/streetprops, rule 30, gate row `streetprops`).** Census (as the city draws it, `--old` =
`?streetprops=old`) before -> after: post plates off their post 237 -> 0; C1 + F19 to the same traffic 25 -> 0 (each carriageway of a one-way pair keeps its own C1 / F19 on its own post, a carriageway between them: C1 47 of 53 asked, F19 29 of 51; where both landed on one kerb the F19 goes, the C1 tries the far kerb); signs facing
across every street 53 -> 8; pieces in a driven lane / on a tram track 389 (367 after the false positives below) -> 47: post boxes
25 -> 0, Villo stations 11 -> 0 (round 2: docks off paving 109 -> 0, bent rows 9 -> 0; 18 rows laid out again, Coghen + Rittweger dropped), signs 108 -> 9, plate posts 131 -> 8, furniture2 39 -> 2, stop poles 70 -> 28 (20 are `platform`
poles of the stops builder the detector finds no OSM tram platform under (browser 2026-11-18: Messidor's pole IS on a drawn
platform: likely the platform way lives in the neighbour tile's features, a detector gap), 8 bus poles at the kerb within 1.3 m of a track or
in a lane: the stops keep out of the tram test on purpose (island stops); both need a browser look), shelters 5 -> 0.
False positives verified: 51 tram stop poles on a drawn OSM tram platform (Globe, Churchill, ...): the stops builder puts
them on the platform's centre line, UrbIS calls the spot tram road; the detector now skips them (`onPlatform`).

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

- **B (claude/balcony, rule 28, gate row `balconies`).** `viewer/facadeGeom.js` `balcony()`: the slab and a
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

- **E (claude/tramfit, rule 32 provisional, gate rows `tramrails` + `tramsnap`).** Cause: the OSM tram ways were
  drawn as they are (`viewer/track.js smoothPolyline` only rounds them, per tile) and nothing held them to the measured
  UrbIS street; OSM is ~0.3-1.3 m off (Ch. d'Alsemberg E2: a track 0.3 m from the tram road's kerb; Av. Churchill: the
  two tracks 3.7 m apart on a 4.75 m UrbIS tram site between paved medians), and the rail top = max(drawn surface,
  profile) climbs onto the paving. Fix: `tools/tramfit/build_tramfit.mjs` -> `data/tramfit/<T>.json` (33 tiles, 400 KB):
  the OSM ways chained across tile seams (as the tram profile), smoothed once, sampled every 0.5 m; per sample the
  offsets where both rails are clear of the DRAWN street's raised classes (the runtime class raster of every tile) and
  >= 0.2 m from every drawn kerb; a lateral offset per sample by projection sweeps from 0 (the smallest smooth move):
  inside that interval, two parallel tracks >= min(OSM spacing, 2.75 m), |o'| <= 0.05, |o''| <= 1/300 m, switch ends
  tied to the track they branch off; a track that would have to cross a kerb running > 20 deg to it (a site entrance,
  the Stalle terminus) is left as OSM draws it. Cut back into tiles (224 seam ends, all matched to 1 cm). The worker
  (`viewer/tileData.js` -> `track.js tramTracks`) swaps them in when the fit was made from that tile's OSM ways (a
  signature), so rails, wire + poles, the bridge deck, tram 92's snap, the parking / prop keep-clear all follow;
  `?tramfit=old` = before. Moves: 2.4 km of track moved, p50 0.17 m, p90 0.9 m, max 2.47 m (Ch. de Ruisbroek B4: the
  stubs along the Brussels sidewalk moved into the unmeasured Drogenbos side). Census (arc-length sampler; the first
  per-segment sampler counted dense bends twice: 421 / 152 m, `--persegment`): before 41 runs, 310 m raised + 109 m
  kerb (`docs/census/tramRails_old.json`), after 7 runs, 26 m + 1 m (`tramRails_fit.json`): the Rue de Stalle terminus
  crossing (B5, 18.5 m, the tracks cross the sidewalk into the roundabout: legit, left alone), the Saint-Job tram
  bridge's west end (H6, 9.5 m on the sidewalk polygon at the abutment), F1 1.5 m, H6 1 m ramp. Av. Churchill: UrbIS
  has the tracks on a tram site ("C") between paved medians (no promenade over the rails): fitted (centres 2.55-3.4 m apart, median 2.76 m, OSM had 2.8-3.7) and
  clean. Tram 92 (`tools/tramfit/tramSnap.mjs`): unsnapped points 1,920 = before, sideways step p99.9 0.36 -> 0.12 m,
  yaw rate p99.9 5.28 -> 5.32 deg/m, sub-18 m radii 245 -> 242 (browser turn: each fitted way keeps its OSM direction;
  chaining had reversed some, and tramline.js prefers the track running the shape's way, so tram 92 jumped 1 m across
  the Vanderkindere crossover, 6 deg/m in the browser). Found, not fixed (pre-existing, another
  class): 713 m of rail lie under an OSM tram platform as `tram.js` draws it (a 2.6 m band centred on the OSM line,
  often the platform EDGE in OSM): 688 m after the fit. Round 2 fixed it: `viewer/streets/tramPlatforms.js`
  `fitPlatforms` (tile worker, after the tracks) keeps every tram platform's track-side edge 1.25 m from the track centre
  (T3000 / T4000 2.30 m wide + ~10 cm boarding gap: ~0.5 m from the rail) by the smallest move: a line platform's band
  (OSM `width`, else 2.6 m) slides across point by point, an island between two tracks takes the gap minus both
  clearances (>= 1.2 m), an area platform's outline vertices are pushed out of the clearance on its own side; 63 of
  100 platforms moved, max 1.28 m. tram.js (slab, edges, shelters at its middle), the drive surface
  (`colliders.js tramPlatformSurface`, the band's width) and tram 92's platform segments read the moved ones; the STIB
  poles data/stops puts on a platform follow it (`platformFollow`, main.js; an area platform's pole sat on its outline,
  half off the slab: now 0.4 m in). Rail under a platform (census, as drawn): 705 m (`--old`) -> 0; platform poles off
  every platform: 44 -> 16 (no OSM platform within 3 m of them in their tile: data/stops, pre-existing).
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

- **G (claude/zfight, rule 34 provisional, gate row `zfight`).** City-wide (120 tiles, `docs/census/zfight_after.json`;
  before `zfight.json`): 32,001 coplanar pairs / 33,117 m2 in 3,301 buildings -> 4,825 / 634 m2 in 1,401 (124 >= 1 m2).
  Causes found (the census guessed "box() strips at corners": wrong, the strips were already mitred): (1) 24,900
  details+details pairs were the MAITRE door steps (`facadeGeom.js typeDetails`): three stacked boxes each run down to
  0.3 m under the ground, their soffits in one buried plane, and two flights in one place where two parallel street faces
  a step apart each got a painted door (Homborch 10). Fix: no soffit on the buried boxes; a flight whose plan meets one
  already placed in the tile is left out. (2) walls / roofs: UrbIS triangles overlapping inside ONE solid (roof polygons
  triangulated into overlapping fans: Rue de Stalle 73 807 m2, Rue Zeecrabbe 24, Av. Dolez 143A; a wall given twice at
  two heights: Av. Adolphe Dupuich 24) and one solid twice (Av. Hamoir 8: 760045 = 761186, the only exact duplicate of
  25,459 solids). Fix: `viewer/coplanarClean.js`, in `analyseBuildings` for the whole tile in the buildings' order: every
  triangle minus the coplanar same-facing (2 deg, 6 mm) triangles already kept, convex clip in its own plane, the
  remainder fanned back on that plane; what is drawn is the union it was (no visible change but the fight), a solid
  wholly under another is gone (J5: 190 triangles dropped, 2,015 m2). Cost: façade analysis +2-8 % (E4 2.33 -> 2.38 s,
  J5 1.20 -> 1.33 s in node), triangles +-0.5 %. (3) landmarks: meshopt LOD1 / LOD2 collapse a slot's face 2-7 cm proud
  of another into that slot's plane (`tools/lodNoFight.mjs`: pairs between two slots that LOD0 lacks there: lock the
  LOD0 vertices round the pair and the slot's borders with its neighbours, simplify that slot again, repeat). LOD1
  pairs LOD0 lacks: observatory 2,663 / 1,528 m2 -> 106 / 13.7 m2 (66,233 -> 77,166 triangles), Saint-Pierre 1,023 /
  73.5 m2 -> 67 / 17.8 m2 (12,519 -> 15,432; the rest are one slot folded onto itself, left: re-simplifying a slot from
  the decoded GLB opened its west door frame, heroshell 5 m2). The raw Blender exports are not kept, so the shipped GLBs
  were rewritten in place (`tools/heroLodFix.mjs`: only the LOD1 index views; heroshell passes); `hero_pack.mjs` /
  `observatory_pack.mjs` do it at LOD1 themselves. Left (gate ceiling heroNew 842 m2, before ~2,410): the town hall
  (LOD1 134 m2, LOD2 26: its LOD1 carries a Blender AO bake keyed by the exact triangles: re-export, port the lock to
  `townhall_pack.mjs`, re-bake `townhall_lod1_ao.py`), the far levels LOD2 (observatory 542 m2, Saint-Pierre 71: the
  same fix at LOD2 opened probe holes on the observatory / Russian church, heroshell, so not applied), Rosaire LOD1 15.5
  (one slot), and the LOD0 pairs of the Blender models
  (Saint-Job 28 m2, Saint-Pierre 33, observatory 101: generator work in tools/blender). (4) image 87, Maison Dandoy:
  the leaves over the right shop window are the IVY (data/plants/E3.ivy.json: a 3.5 % street-front wall whose avoid list
  had the windows but no shopfront; 288 of its 339 sprays on the front, 4-9 cm out and tilted through the interior-mapped
  glass 7.5 cm out, fluttering in the wind). 19 walls city-wide (4,518 sprays); fix: `g.shop` no-grow rects from the
  street-life fronts (`tools/plants/build_ivy.mjs --shops` patched the data, every other byte unchanged), merged into
  the avoid list by `viewer/plants/cityIvy.js` (?zfight=old: not). `?zfight=old` = all of (1), (2), (4) as before.
  Residual (city): small strip / band ends 3-30 cm2 each, eaves boards over cornice pieces, kit walls on roofs (17).
  (5) the window shimmer (image 93; the mottled lower half of Maison Dandoy's first-floor French window in 87): NOT
  geometry. Browser A/B (`debug/zfightCheck.js`, knobs): only "kit off" or "the kit glass's painted room off" killed it.
  Cause: the façade kit packs integer codes into float vertex attributes (aKitF.w = building hash + 2 street + 4 French
  code (+ 1024 maître), aKit.w = the French code) and DECODED them in the fragment stage: interpolated, they arrive with
  last-bit errors at their magnitude (aKitF.w ~1,100: ~1e-4), so the hash's 1/4096 quantisation and the French code's
  mod / floor (17 = bay 0, floor 1 -> 16.99999) flipped per pixel and per TAAU jitter: gold blotches crawling over the
  glass (the room / lit-window hashes) and the wall cut under a French window coming and going (brick through the
  lace). The same bug was fixed for the painted walls' aBld in 2026-11 (rnd quantised, zq rounded) but not for the kit.
  Fix: `kitMaterials.js kitGlassMaterial` decodes in the VERTEX stage (varyings) and rounds the integers per pixel;
  `facades.js` rounds the kit walls' French code and paintedGlass's frCode, and the shop paint decode takes an epsilon
  (30 = paint 3, no shop). Still camera, crop frame-to-frame |dY| (x/255): the house right of Dandoy 3.06 -> 0.27,
  the French window 3.84 -> 0.62; zfightCheck ab() still-camera hot pixels: dandoyNext 0.64 % -> 0.04 %, dandoyFrench
  0.69 -> 0.18 %, dandoyShop moving 5.6 -> 4.0 % (the ivy). What remains on the French window moving is its Juliet
  railing's bars (rule 26's class, not z-fighting). `?zfight=old` = the fragment-stage decode as before.

## Not detected here (needs the browser, or not located)

- G: found in the browser (claude/zfight browser turn), fixed: see G (5) under Fixed.
- A: whether the heroes' see-through clusters at ground level are real porches / canopies (Calevoet, town hall, Russian
  church).
- C: images 77 (blocky grass and gravel bump) and 89 (a raised asphalt slab with an edge line and kerb faces) could not
  be located without a position. The terrain scan lists lumps / spikes city-wide but has not been validated on those two
  spots. 89 looks like an engine strip kept over the measured ground (a contact / floating-edge case: the browser's
  `debug` contact audit, or `tools/mesh_audit/contact.js`).
- The runtime layers the node builds do not cover: ivy, interior windows, street-life boxes, collider view.
- Thresholds (C: 0.5 m lump / hole / spike, 15 % sidewalk / 12 % road cross-fall; D2: 45°; F: 12°, 0.10 m) are first
  guesses tuned on the spots above. Each fix job should re-tune its own class before it becomes a gate row.
