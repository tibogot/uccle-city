# Église Saint-Augustin, Place de l'Altitude Cent (Forest): the scripted hero

Reinforced-concrete Art Deco church by Léon Guiannotte and André Watteyne, built 1933-35, consecrated 25 March 1935,
inaugurated 1936, finished by 1950, renovated 1996-98. Greek-cross plan under a 54 m central tower, in the middle of the
Place de l'Altitude Cent (eight avenues in a star; one of the highest points of Brussels). OSM way 40614983
("Église Saint-Augustin - Sint-Augustinuskerk", `ref:UrbIS` 5077320), wikidata Q3581005. It stands in **Forest**, about
180 m north of Uccle's border: the tower is the landmark on the skyline from the north of Uccle.

```
../venv/Scripts/python tools/augustin_measure.py [--dump]     # UrbIS solid + DSM/DTM (sheet 147167) -> models/augustin/site.json, site_dsm.*, site_dtm.*
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/augustin.py -- models/augustin [--no-bake] [--fast] [--previews] [--only=entrance,apse,...]
node tools/hero_pack.mjs models/augustin/augustin.raw.glb models/augustin/augustin.glb 11000 2600 --name Augustin   # LODs + meshopt (tools/worker: npm ci)
node tools/mesh_audit/cli.mjs models/augustin/augustin.raw.glb --nodes Augustin --range Augustin=175 --ignore-below -1.8 --out models/augustin/audit/lod0
node tools/mesh_audit/cli.mjs models/augustin/augustin.raw.glb --nodes Augustin_far --range Augustin_far=3000 --ignore-below -1.8 --out models/augustin/audit/far
```
The measure script needs the pipeline venv (pyogrio + rasterio; `pipeline/requirements.txt`). Raw data from the main
checkout's `data/raw/urbis/` (found automatically from a sibling worktree).

## Where it is in the city (tiles, switch)
- Local position: frame origin (the tower axis) at city x -896.27, z -1961.18 → tile **E1** (x -1000..-500, z
  -2000..-1500). E1's terrain (UrbIS DTM) covers the Place, and the road engine draws its roundabout (node
  `n40528115`, ring radius ~50 m) round the church. **E1 has no buildings outside Uccle** (the tiles keep Uccle's only),
  so the church's UrbIS solid 514999 (BU_ID building/1732283) was never drawn: **nothing is hidden**.
- Shown when E1 is loaded (full or far ring: the default far ring of 3 tiles reaches it from ~1.5 km, i.e. from the north
  half of Uccle) and always when the horizon ring is on (`?horizon=1`, its ground under it). Camera far plane 6 km.
- **Switch: `?augustin=0`** (no model). `?libmat=0` / `?libmat=-augustin`: the temporary materials only.

## Measured vs estimated
MEASURED (UrbIS 3D solid 514999, 376 faces, base 100.46, top 154.70; DSM/DTM 2021 0.5 m; all CC0):
- the frame: origin = the centre of the solid's top face (the cross, 154.70); rotation 246.47° from the tower's square
  faces at 132.71 (u = towards the entrance arm, w to its right);
- every part's plan and top: porches 106.36 (×3) and the ambulatory 106.36, the side blocks 108.8, the quadrant wings
  113.24, the entrance front's corner piers 116.43, the transepts 116.85, the drum 117.15, the arms 117.75, the crossing
  120.4, the tower shoulders 132.71, piers 139.06, core 139.5, the lantern 147.87 / 148.68 / 148.88, the pedestal 150.46,
  the cross 154.70 (= the tower 54 m over the Place, as the information panel on the Place says);
- curved walls: circles fitted to the solid's arc vertices: the quadrant wings (centre ±7.4, ±7.6, r 9.13, residual
  ≤ 0.13 m), the apse drum (19.5, 0; r 5.71; 0.01), the ambulatory front (19.35, 0; r 10.69; 0.04);
- the ground: DTM 101.56-102.29 round the walls (the church on a slight mound), 100.3-101.9 at 30-45 m.
SYMMETRISED: the solid's halves differ by up to 0.3 m (digitising); the model uses their means. The ambulatory's small
corner bulges (u 25.6-28.5, |w| 8.6-9.0) are squared off (they bent flat walls' normals; ≤ 0.4 m).
ESTIMATED (from the photos; in `augustin.json` "estimated"): every opening (count, size, height), the pilasters and their
stepped crowns, the bands, the reliefs (the crosses on the fronts, the winged relief on the apse side of the tower), the
louvres, the open stage of the lantern (139.5-144.3) and its fins, the cross arms (2.6 m span), the floor level, the
plinth (102.55), doors and steps, the terrace railing, the downpipes.

## References (looked at; not traced, not shipped)
Wikimedia Commons, Category "Church of St. Augustine, Forest" (thumbnails kept git-ignored in `data/raw/refs/augustin/`
with `SOURCES.md`):
| id | file | author | licence | what it showed |
|---|---|---|---|---|
| c01, c02 | Altitude Cent (DSC01454 / DSC01455).jpg | Trougnouf (Benoit Brummer), 2022 | CC BY 4.0 | an arm front with its three tall lights between stepped pilasters, the low porch, the tower's front (three lights, louvre pair), the lantern and the cross edge-on |
| c04 | Church of Saint Augustinus.jpg | Karmakolle, 2017 | CC0 | the lit cross at night |
| c09 | Photo altitude 100.png | Tram Bruxelles, 2019 | CC BY-SA 4.0 | the apse end: the drum's three tall windows, the curved wings with square windows, the low ambulatory with three windows and the rubble plinth, the tower's apse side (louvres on the shoulders, winged relief, small window) |
| c10 | Saintt Augustine's Church.jpg | yellow book, 2011 | CC BY 2.0 | a quadrant wing (ring of square windows, corbelled sill band, slab cornice), a transept front with its porch |
| c11 | Sint Augustinuskerk Vorst.jpg | Ijzermans1, 2019 | CC BY 4.0 | close-up: diamond-leaded panes, the stepped corner block with three ribs, the cross relief, the flaking paint |
| c12, c13 | Sint-Augustinuskerk Vorst 01 / 02.jpg | FrDr, 2024 | CC BY-SA 4.0 | the information panel: 54 m tower, architects, 1936 |
| c14, c15 | St Augustin Forest 2012-08 A / B.jpg | Zinneke, 2012 | CC BY-SA 3.0 | the tower down an avenue: lantern with the open stage and ribbed corners, the terrace railing, the louvre pairs |
| c17 | VorstAugustinuskerk.JPG | Friedrich Tellberg (assumed), 2006 | CC BY-SA 3.0 | a quadrant wing, a transept front, the tower shoulders with slits |
| c18 | Église Saint-Augustin (Forest-Brussels).jpg | Guywets, 2018 | CC BY-SA 4.0 | the tower's stepped composition and lights |
Google Maps / Street View: looked at only, for the Place's ground (lawn round the church) and the door positions; nothing stored.
Text: fr.wikipedia "Église Saint-Augustin de Bruxelles" (dates, architects, concrete, apse, four pylons).

## Comparison with the photos (our Blender previews `docs/landmarks/augustin/preview_*.png`, city screenshots `city_*.png`)
- **Apse end vs c09** (preview_apse): the same stack — low ambulatory with three windows and the dark plinth, the
  quadrant wings' window rings left and right, the drum with three tall windows (centre wider) and its slab cornice,
  then the tower with louvres on the stepped shoulders, the winged relief and the small window, the lantern and the cross.
  Differences: in c09 the drum's windows start a little lower and its centre light has two mullions; the photo's
  ambulatory front reads flatter (its radius is measured, 10.7 m).
- **Arm fronts vs c01 / c10 / c11** (preview_entrance, preview_diagonal): three tall gridded lights between four
  pilasters rising above the parapet with stepped crowns, two bands across the parapet, the cross relief at the top,
  the low porch in front with its door; the entrance front's corner blocks with three ribs (c11). Differences: the porch
  in c01 has a shallow sloping roof, ours is flat with a slab cornice; the real Passion reliefs on the west part are
  not modelled (a plain panel over the door).
- **Quadrant wings vs c10 / c17**: the ring of square windows high up with a mullion and transom, the corbels under the
  piers, the thin band over the windows and the heavy slab cornice: matches. c17's wings show two small windows lower
  down that we do not have.
- **Tower vs c14 / c15 / c18** (preview_tower): the core with the pier carrying the three lights and the louvre pair,
  the shoulders with four lights and louvres on their ends, slits on the narrow faces, the terrace railing, the lantern
  with an open lower stage and ribbed rounded corners, the cross. Differences: the photos' lantern openings are taller
  and narrower; the corner ribs are more numerous (we have 7).
- **Colour**: the photos show a cream / ivory paint, greyed, flaking in patches (c11): the temporary concrete material
  follows that (pour lines, rain streaks, flaked patches, grime at the foot).

## Numbers
(filled below by the city checks)
