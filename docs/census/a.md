---
class: A
title: Open meshes / missing walls
row: | A. Open meshes / missing walls | `openMeshes.mjs` (`--heroes` for the landmark GLBs) | tiles: 1,524 of 25,412 buildings, ~12,800 m²; heroes: 11 of 16 open, Saint-Pierre 53.5 m² at LOD0 (80 m² at LOD2) | yes (88, Saint-Pierre: south side) | Saint-Pierre: `tools/blender/stpierre.py` (`side_elevation` / `porch_bay`, the estimated east and annex walls); tiles: `viewer/facadeGeom.js analyseBuildings` + `viewer/wallRepair.js` | The checks never see the heroes: `shellGate`/`wallAudit` read only the UrbIS solids, and every hero's solid is hidden. The pack-time `mesh_audit` treats a wide hole as an "opening" (info only), and 4 heroes were never pack-audited. In the tiles, UrbIS triangles face inward, or there are gaps off the footprint edges `wallAudit` tests. |
---

### Heroes: fixed (claude/heroshell, 2026-11-18)

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

### Worst spots

**A (tiles):** F7 Rue de Verrewinkel 95D (-368.8, 1378.8) 434 m²; F7 Verrewinkel 95C (-386.5, 1372.7) 391; H1 Rue Dodonée 92
(911.9, -1557.2) 154; D5 (-1499.7, 349.3) 152; K6 (2018.9, 568.2) 102; D5 Rue de Stalle 70 (-1193, 110.2) 101; J4 Ch. de
Waterloo 964 (1677.1, -353.9) 100; F1 Rue Vanderkindere 112 (-397.7, -1645.7) 97; I1 Rue Lincoln 78 (992.7, -1634.7) 96;
E5 Rue Rittweger 6 (-998.4, 150.7) 87. **Heroes (LOD0 m²):** Saint-Pierre 53.5, Augustin 35.6, Van Buuren 33.9,
Saint-Marc 32, Saint-Job 28.6, Calevoet 25.8 (mostly ground-level see-through: porches? check), town hall 19.9, Russian
church 7, police 6.4, Observatory 3.7.

### Not detected here

- A: whether the heroes' see-through clusters at ground level are real porches / canopies (Calevoet, town hall, Russian
  church).
