---
class: D
title: Street furniture: plates off posts, signs facing wrongly, pieces in the road
row: | D1. Street-name plate away from its post | `streetProps.mjs` | 237 of 748 post plates (gap > 0.15 m, up to 6.5 m) | yes (78, Rue Papenkasteel E6: 4.07 m) | `viewer/main.js` loadTile `snap(skDoc, [["signs"], ["posts"]])` (`viewer/streets/carriageway.js docOffLanes`) | The load-time snap moves the street kit's post out of the lane, but the street-life layer (`viewer/streetlife/layout.js`, plates) still draws the plate at the baked spot. They are two layers with one position and only one of them is moved. |
row: | D2. Signs facing wrongly | `streetProps.mjs` | 78 of 1,792 poles: 25 show a no-entry C1 and a one-way F19 to the same traffic (one pole, or poles under 4 m apart); 53 face across every street within 12 m | yes (79, E6 -685.1, 999.7: C1 + F19 on one pole at the Papenkasteel / Ch. de Saint-Job junction) | `tools/streetkit/build_streetkit.py` `place_tile` (the one-way rule: F19 at the flow start, C1 at the flow end) + pole sharing | Two one-way pieces meet at one junction: one piece's end (C1) and the next piece's start (F19) land on one corner and are merged onto one pole. Also 78 signs moved > 1.5 m by the load-time snap (onto another kerb). |
row: | D3. Furniture in the carriageway / on tram tracks | `streetProps.mjs` | 389 of 4,977 pieces still in a driven lane or within 1.3 m of a tram track after the load-time moves (369 lane, 34 tram): 25 post boxes, 11 Villo stations, 108 signs, 131 plate posts, 70 stop poles, 39 furniture2 pieces, 5 shelters | yes (85 bpost:4405 Ch. d'Alsemberg E5 -986.4, 312.6; 86 Villo Rittweger E5 -939.2, 144.6, 4 of 29 pieces on the tracks) | post boxes / Villo: `tools/streetlife/build_streetlife.py` (WFS point kept as is, only turned to the road) and `tools/streetkit/build_streetkit.py` `place_villo`; the rest: `docOffLanes` gives up (no kerb within 6 m, no measured street in Flanders) | Post boxes and Villo stations are not in main.js's snap list at all. The snap tests lanes only, not the tram tracks. |
---

### Fixed

**Class D fixed (claude/streetprops, rule 30, gate row `streetprops`).** Census (as the city draws it, `--old` =
`?streetprops=old`) before -> after: post plates off their post 237 -> 0; C1 + F19 to the same traffic 25 -> 0 (each carriageway of a one-way pair keeps its own C1 / F19 on its own post, a carriageway between them: C1 47 of 53 asked, F19 29 of 51; where both landed on one kerb the F19 goes, the C1 tries the far kerb); signs facing
across every street 53 -> 8; pieces in a driven lane / on a tram track 389 (367 after the false positives below) -> 47: post boxes
25 -> 0, Villo stations 11 -> 0 (round 2: docks off paving 109 -> 0, bent rows 9 -> 0; 18 rows laid out again, Coghen + Rittweger dropped), signs 108 -> 9, plate posts 131 -> 8, furniture2 39 -> 2, stop poles 70 -> 28 (20 are `platform`
poles of the stops builder the detector finds no OSM tram platform under (browser 2026-11-18: Messidor's pole IS on a drawn
platform: likely the platform way lives in the neighbour tile's features, a detector gap), 8 bus poles at the kerb within 1.3 m of a track or
in a lane: the stops keep out of the tram test on purpose (island stops); both need a browser look), shelters 5 -> 0.
False positives verified: 51 tram stop poles on a drawn OSM tram platform (Globe, Churchill, ...): the stops builder puts
them on the platform's centre line, UrbIS calls the spot tram road; the detector now skips them (`onPlatform`).

### Worst spots

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
