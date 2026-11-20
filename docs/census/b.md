---
class: B
title: Balconies open at the sides
row: | B. Balconies open at the sides | `balconies.mjs` | 20,061 of 20,663 balcony slabs open (36,791 open ends) in 1,162 buildings | yes (84: Ch. d'Alsemberg 1033E D6, 860 / 905 E5, 997 D5) | `viewer/facadeGeom.js` `typeDetails`, the BLOCK "BALCONIES" branch | By design: slab + front parapet only, no side panels and no returns. The facade kit's own balconies (`tools/blender/facadeKit.py` `railing(returns=True)`, 1,836 placed) are closed. |
---

### Worst spots

**B:** H2 Av. Winston Churchill 163 (769.4, -1269.9) 358 open slabs; H4 (612.6, -281.1) 301; G3 (186.5, -692.6) 275; D6
Ch. d'Alsemberg 1033E (-1243.9, 563.4) 256; J3 Ch. de Waterloo 963 (1534.9, -809.6) 270; F3 Av. Château de Walzin 3
(-228.6, -918.5) 264; J6 Ch. de Waterloo 1322 (1797.2, 924.4) 217; J4 (1523.9, -39) 175; F3 Av. de Boetendael 51
(-340.2, -871.3) 144; I3 Av. De Fré 265 (1217, -538.5) 138.

### Fixed

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
