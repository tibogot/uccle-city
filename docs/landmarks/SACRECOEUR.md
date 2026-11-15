# Église du Sacré-Cœur / Heilig Hartkerk, Rue Vanderkindere: the scripted hero

Branch `claude/landmark5` (worktree `uccle-landmark`), 2026-11-15. A 1952 church in coursed rubble sandstone with pale
stone dressings, between the shops of Rue Vanderkindere (De Kat, north Uccle). Wikidata Q62570896, OSM way 226396246
(`ref:UrbIS` 7598015). nl.wikipedia "Heilig Hartkerk (Ukkel)": not oriented; a nave of three bays, a wider crossing, a
narrower choir with a three-sided closure, the bell tower in the western angle of the choir and the crossing, the nave's
saddle roof running into the crossing's tent roof, the choir's lower saddle roof too; the portal on the north side under
nine (the photo: seven) tall narrow windows. No heritage-inventory entry and no Commons photo were found; the front is
from Street View (looked at only).

```
python tools/landmark5_measure.py sacrecoeur [--dump]          # UrbIS solid 729884 + DSM/DTM sheets 148166/148167 -> models/sacrecoeur/site.json, site_dsm.*, site_dtm.*
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/sacrecoeur.py -- models/sacrecoeur [--no-bake] [--previews] [--checker --sunaz=300] [--views=north,east]
node tools/hero_pack.mjs models/sacrecoeur/sacrecoeur.raw.glb models/sacrecoeur/sacrecoeur.glb --nolod --name SacreCoeur
node tools/mesh_audit/cli.mjs models/sacrecoeur/sacrecoeur.raw.glb --nodes SacreCoeur --range SacreCoeur=128 --ignore-below 51.7 --out models/sacrecoeur/audit/lod0
   (SacreCoeur_far 470 -> audit/lod1, SacreCoeur_xfar 6000 -> audit/lod2)
```
The church sits across two 1 km DSM / DTM sheets: the measure script samples each point from its own sheet. Blender
builds in ~1.5 min (the lightmap UVs; the AO bake on the RTX 4050 through OptiX takes 5-10 s for the three levels, each
baked alone).

## In the city
- Tile **F1**. The UrbIS solid 729884 (BU_ID building/1712839) joins the hide list (`placement.hides_bu_ids`), so the
  tiles draw neither its facade nor its far LOD. **Switch: `?sacrecoeur=0`** = the UrbIS block back; `?libmat=-landmark5`
  = the temporary materials only. Dev panel: Landmarks row "Sacré-Cœur", Go to "Sacré-Cœur church" (above, from the
  north-east) and "Sacré-Cœur, Rue Vanderkindere" (the street, before the front).
- Module: `viewer/landmark5City.js` (shared with Saint-Marc) + `viewer/landmark5Model.js` (loader, slots, temporary
  looks). Shown while F1 is loaded (full or far), three scripted levels cross-fade (dithered, the timed settle ramp).
- Colliders (`viewer/heroColliders.js` `HERO_ROOTS`): built from LOD0 once F1 is in: 17,266 triangles for walk / third
  person (the steps climb, the walls stop you) + 223 car blocks. Also in `contactAudit` / `collisionTest` / the falcon's
  landmark list / the boot gate.

## Measured vs estimated
Frame: u along the axis from the north front (u 0, the OSM front wall between the annexes) to the choir, w to the west;
rotation 87.2 deg (OSM side walls 87.03 / 87.40, the DSM ridge line drifts < 0.3 m over 28 m).
MEASURED (UrbIS LoD2 levels, DSM 2021 resampled at 0.25 m on the building frame, OSM, DTM):
- nave walls w +-6.07 (OSM); ridge 121.6 (DSM 121.5-121.7), 54 deg; the roof runs on down to 111.6 at |w| 7.2 over the
  aisles (UrbIS 111.61-111.65, DSM 112.0 at |w| 7.0), the eaves at the front walls 113.2 (UrbIS 113.21);
- aisles: lean-tos 108.0 -> 106.3 at the outer walls (DSM; UrbIS 106.18-106.31), outer walls w -9.8 / 10.2 (OSM);
- front annexes u -3.85 (east) / -3.5 (west) (OSM), their roofs sloping to the street 109.2 -> 106.3 (DSM), the dormers'
  bumps (DSM ~109);
- crossing u 22.5-37.0, w -8.1 / 7.6 (UrbIS 113.25-113.30 corners), tent roof apex 123.0 (DSM 123.0-123.1);
- choir walls w -5.0 / 4.5, eaves 110.2, ridge 117.0 (DSM, w -0.25 .. -0.6), the closure's hip down to 110.7 at u 49
  (DSM) -> end facet u 49.3, the west facet (46.7, 4.26) -> (48.97, 2.16) (OSM);
- tower: 3.4 m square centred (38.7, 5.1) (DSM), spire apex 129.3 (DSM), the cross to 130.1 (UrbIS top 130.06);
- west block gable ridge 112.6 at u 40.5 (UrbIS 112.58, DSM), south block flat 106.8 + gable ridge 109.8 at u 53 (DSM),
  its curved west bay (OSM);
- the ground: DTM 101.85-102.08 at the front, 102.0-103.5 round the walls (`site_dtm`).
FROM THE FRONT PHOTO (Street View 2023, two views; calibrated on the floor and the ridge, +-0.3 m):
the seven stepped lancets (apex 110.4 / 111.4 / 112.2 / 112.5, sills 107.6) on a sill band, the stone crucifix relief
(corbel 113.0, cross 113.5-118.8, bar at 116.3), the three portals (centre 2.5 m, sides 1.2 m; depressed pointed arches
in two stepped orders with a hood moulding, oak double / single doors), four steps across the portal bay, the annexes'
three small lancets each and their sill band, the gabled dormer (east annex) and the spired dormer (west annex), the
pale corner piers with two weathered set-offs, the gable's coping and kneelers.
ESTIMATED (not visible from public streets; `sacrecoeur.json` "estimated"): every opening of the side, crossing, choir,
tower and back walls (twin lancets a bay in the aisles, a small lancet a bay under the nave eaves, three lancets in each
crossing face, one per closure facet, two louvred lancets a face in the belfry), the buttresses' 4.6 m rhythm, the back
blocks' windows, the door panelling, wall thicknesses (reveals 0.25-0.35 m).

## Model
| level | node | triangles | draws | shown |
|---|---|---|---|---|
| LOD0 | `SacreCoeur` | 17,266 | 7 | < 110 m (+-18 m band) |
| LOD1 | `SacreCoeur_far` (scripted: no sills, bars, door rails, louvre slats, gutters, caps; 4-segment arches; flat shaded) | 8,410 | 7 | < 420 m (+-50 m) |
| LOD2 | `SacreCoeur_xfar` (also openings as shallow panels, no copings / buttress caps, 2-segment arches) | 2,965 | 7 | beyond |

GLB 0.79 MB (meshopt, raw 2.6 MB); AO lightmap 2048 px (`sacrecoeur_ao.png`, 2.3 MB; 16.6 px/m on LOD0).
Slots (one primitive each per level): `rubble_stone` (Rosaire's name; a new temporary look here: squared sandstone in
uneven courses, ochre / brown / grey / rust stones, pale recessed joints), `stone_white` (the library's shipped
limestone scan: the photo's pale dressings), `slate` (shipped scan), `zinc_roof` (gutters, ridge rolls, downpipes, the
flat back roof), `wood_oak` (**new name**: the oak doors, vertical boards; temporary), `glass_window` (leaded quarries,
warm glow at night through the emissive only), `cast_iron_green` (saddle bars, crosses). Every temporary look goes
through `wxMat` (rain, snow) like the library's. Codes in COLOR_0.r as Rosaire's.

The model is built from `tools/blender/church_kit.py` (new, shared with Saint-Marc): the Rosaire helpers made
importable, plus wall segments with top / bottom profiles (`vwall`), pointed openings with a U-shaped stone surround
(no zero-width strip at the sill), DEPRESSED pointed arches (`arch_pts`: rise under half the span; `pointed()` crossed
its centres there and the portals came out with a doubled arc and see-through slits: found in the city, fixed), planar
roof slabs, and the build -> mesh -> GPU bake -> GLB -> previews tail.

## Checks (2026-11-15)
- **Mesh audit**: LOD0 / LOD1 / LOD2 **0 blocking** each (ranges 128 / 470 / 6000 m). On the way: roof slab ends pulled
  1.2 cm off the walls they abut, the crossing walls stopped under the tent roof's slab (its edge no longer in their
  plane), the apse's eave loop order (a self-crossing offset loop made the hip facets cut the closure's walls), ridge /
  hip rolls stopped 0.35 m short of the apexes (they met at 10 deg), gutters short of the crossing corners, a bow-tie
  wall behind the east lean-to, the far levels flat shaded (4-segment arch reveals smoothed into their jambs:
  "bentflat"). Warnings left: slivers (mouldings), back-to-back faces (piers / sills against walls), T-junctions.
- **Shading**: checker renders under a low side sun (`docs/landmarks/landmark5/sacrecoeur_*_checker.jpg`): flat walls,
  clean reveals and mouldings, no black faces, no smoothing blotches.
- **Contact (JOINS)**: `await viewer.contactAudit("sacrecoeur")`: 17,266 triangles: **0 floating, 0 overhang, 0
  blocking**; 10 "opening" infos (window sills, not ground joins). Walls go down to 101.2 (ground 101.75-103.5), the
  steps 0.3 m into the ground.
- **Collisions**: `viewer.collisionTest("F1")`: nothing within the church's box (static, drive 80 routes, walk 82).
- **LOD hand-overs while moving** (`debug/landmark5.js` `l5flight("sacrecoeur")`, 680 m -> 12 m -> 680 m, 12 s each way,
  tab in front): 1,440 frames, median 16.7 ms, p99 21.4 ms, 1 frame > 34 ms, 8 switches, **0 pops**; states
  001@678 011@415 010@339 110@109 100@89 110@112 010@137 011@425 001@521.
- **Night** (`?hour=22`): the lancets glow warm (emissive only; no light added), the street lamp lights the front.
- **Snow** (`?wx=snow_cover`): snow on the slate, the annex roofs, sills and copings. The steep (54 deg) nave slope shows
  blocky patches of cover in a 0.5-1 m pattern, while the Rosaire's 45 deg slate (same library material) takes a uniform
  cover: the weather layer's slope rule on a 54 deg roof, not the model's geometry.
- **Cost** (renderer.info, model shown vs held hidden at the same view; main + shadow passes): street, LOD0: **+13 draws,
  +33.5k triangles**; 230 m, LOD1: +13, +16.3k; 630 m, LOD2: +13, +5.6k. GPU ms **not measured**: `tools/perf/preflight.ps1`
  RED (GPU 85 % busy at rest with other agents' tabs, power cap, 1.4 GB free memory).
- Console: no error from the model (load ~2 s in the background, shaders through the precompile queue 26-41 s during
  the city's boot, hidden until done).

## Compared with the photos (in words)
Street View 2023 from Rue Vanderkindere vs `sacrecoeur_city_street.jpg` / `sacrecoeur_north.jpg` (also
`sacrecoeur_city_aerial.jpg`, `sacrecoeur_city_night.jpg`, Blender `sacrecoeur_*.jpg`): the same front — the
gable between the two lower annexes, the crucifix high in the gable, seven lancets stepped to the middle on a sill band,
three pointed portals over four steps, the pale corner piers, the dormers (gabled east, spired west), the slate roofs.
Differences: the real lancets are a little slimmer and closer, and their stone mullion piers read paler and wider; the
real portals' arches are a shade more pointed; the photo's stone is browner and less orange in overcast light (the
city's sun warms it), with more grey stones; the gable's coping in the photo is less proud; the real annex fronts show a
plinth course and a plaque left of the portals (not modelled: no inscription invented). The sides and back (aerial
views vs the 2024 orthophoto and the DSM): the nave + crossing + choir roofs, the tower's spire, the back blocks match the
DSM's ridge lines within ~0.5 m; the tower's real shaft top is slightly lower (the DSM's 3.4 m square is the spire's base
smeared by 0.5 m pixels).

## Weak spots / next
- Openings of the hidden faces are estimated (nobody sees them from a street; the east side is visible from the car
  park beside the church).
- The forecourt is the city's ground (cobbles in reality, partly a parking); the low east neighbour blocks come from UrbIS.
- Snow coverage pattern on the 54 deg slate (the weather layer's slope rule).
- GPU timing on a GREEN machine.
