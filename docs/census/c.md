---
class: C
title: Terrain / sidewalk ground
row: | C. Terrain / sidewalk ground (**fixed: claude/sidewalk, docs/SIDEWALK.md, gate row `ground`**) | `ground.mjs` (re-tuned: railway / deck earthworks and the bank cut to a street edge intended; new `over`) | sidewalk tilt 4,052 groups / 29,510 m²; road cross-fall bumps 1,462 / 24,092 m²; terrain lumps 1,273 / 16,701 m²; holes 3,038 / 16,850 m²; spikes 675 / 2,751 m² | 91 yes (Av. Brugmann 349, F2 -275.5, -1191.7: 18 m² at a 62 % cross-fall); 77 / 89 not located | sidewalks / roads: `viewer/surfaces.js` `prepareSurfaces` / `buildSurfaceRoads` (the street height field `prep.H` follows the DTM); terrain: `viewer/heightmap.js` `weld` / `clampUnder` / `carve` | The measured street's height comes from the DTM, so a sidewalk at the foot of a bank climbs the bank: there is no "level with the kerb" rule. Weld banks go up to 2 m (maxRise) to a surface edge, and clamp / carve drop cells up to 1.2 m. The terrain list is noisy: rail cuttings and tunnels (D9 / E9 / G6) are intended. |
---

### Worst spots

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

### Not detected here

- C: images 77 (blocky grass and gravel bump) and 89 (a raised asphalt slab with an edge line and kerb faces) could not
  be located without a position. The terrain scan lists lumps / spikes city-wide but has not been validated on those two
  spots. 89 looks like an engine strip kept over the measured ground (a contact / floating-edge case: the browser's
  `debug` contact audit, or `tools/mesh_audit/contact.js`).
