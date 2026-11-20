---
class: G
title: Coplanar z-fighting
row: | G. Coplanar z-fighting | `zfight.mjs` (`--heroes`) | tiles: 32,001 pairs, ~33,100 m², in 3,301 buildings; 46 kit openings on an uncut painted wall; heroes: Saint-Pierre 49 / 118 / 59 m² (L0 / L1 / L2), town hall LOD1 134 m² | 87 / 93 NOT flagged (no coplanar pair at Maison Dandoy E3 / I5 or the Calzedonia front E4) | details: `viewer/facadeGeom.js` `box()` strips at corners (24,924 pairs); walls / roofs: UrbIS duplicate solids passed through (`pipeline/build_buildings.py` -> `analyseBuildings`, e.g. Av. Hamoir 8 J5: one solid twice); heroes: `tools/hero_pack.mjs` meshopt LOD1 | The UrbIS duplicates are not deduplicated, facade boxes overlap at corners, and LOD1 simplification collapses parts into each other. The window shimmer in 87 / 93 is not in the static geometry: likely the painted-window / interior shader, ivy cards or TAA (browser). |
---

### Worst spots

**G:** J5 Av. Hamoir 8 (1749.2, 89) 1,940 m² (UrbIS solid 760045 = 761186); D5 Rue de Stalle 73 (-1369.6, 159.3) 816; G3
Rue Zeecrabbe 24 (395.8, -786.9) 802; I1 (1120.3, -1677.4) 663; G2 Av. Adolphe Dupuich 24 (195.3, -1138.4) 620; F5
(-143.4, 11.1) 551; F8 Clos Jean-Pierre de Launoit 5 (-263.6, 1656.3) 539; E2 (-710.4, -1482.4) 505; G8 Av. Dolez 143A
(443.3, 1986.9) 444; C7 Ch. de Drogenbos 176A (-1876.7, 1470) 369. Shop fronts buried in their wall: Barat (E3), Brico (G3),
Le Chemin des Vignes (F1), Battery Centre (I1).

### Fixed

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

### Not detected here

- G: found in the browser (claude/zfight browser turn), fixed: see G (5) under Fixed.
