# Rail bridges, round 2: the ten structures without a model (research, 2026-11-13)

Source: `data/rail/rail.json` bridges of type RAB (rail above), crossed with every tile's `roads.json` and
`features.json` lines (what passes under each deck polygon). Saint-Job (692) and Calevoet (687) already have hero
models (`models/rail/stjob.*`, `calevoet.*`); Verrewinkel (`verrewinkel.*`) is the road bridge over the line (879).
Until these exist the track crosses each gap on its ballast alone. Positions: local metres (x east, z south).

| id | line | where (centre) | crosses | longest extent | deck area |
|---|---|---|---|---|---|
| 686 | L124 | -1489, 276 | Rue de Stalle (primary road) | ~69 m | 658 m² |
| 694 | L26 + L26/5 | -691, 1795 | Rue Engeland (residential) | ~63 m | 838 m² |
| 695 | L26/5 | -701, 1787 | Rue Engeland, the chord's own deck beside 694 | ~62 m | 371 m² |
| 688 | L124 | -1106, 1636 | Rue des Bigarreaux (residential) | ~20 m | 160 m² |
| 691 | L26 | 273, 869 | Kauwberg (residential street) | ~20 m | 145 m² |
| 706 | L26 | -1328, 2304 | Rue de Linkebeek (residential) | ~17 m | 123 m² |
| 693 | L26 | -456, 1511 | Chemin du Puits / Borreweg (footpath, in a wood) | ~15 m | 98 m² |
| 770 | L26/5 over L26 | -951, 2051 | rail flyover (Moensberg junction) | ~36 m | 460 m² |
| 771 | L26/5 over L124 | -1042, 2384 | rail flyover | ~76 m | 658 m² |
| 772 | L124 over L26 | -1117, 2165 | Moensberg station, over platforms 5 / 6 and a footway | ~31 m | 327 m² |

Suggested order: 686 Rue de Stalle (the most seen: a primary road), 694 + 695 Engeland (one model, two decks), then
the three small street bridges (688, 691, 706: likely one family of short spans with variants), 693 (footpath
underpass), the Moensberg group last (770, 771, 772: flyovers seen mainly from trains and the falcon).

Method (HANDOFF, hero-buildings method): Street View / Google Maps imagery LOOKED AT only (never traced, stored or
shipped) for type (masonry arch, steel deck, concrete), parapets, abutments, clearance; Blender 5.0 headless scripts
like `tools/blender/railBridge.py`; named material slots; the JOINS rule (abutments welded to the city ground, no
floating edge: the contact check); collisions (car under the deck: clearance; the road stays open); the deck carries
the existing ballast / rails; LODs without popping; mesh audit clean; a switch to turn each off.

## Results (branch claude/bridges2, 2026-11-13)

Done: **686 Rue de Stalle, 694 + 695 Rue Engeland, 688 Rue des Bigarreaux, 691 Kauwberg, 706 Rue de Linkebeek** (six
heroes, `models/rail/<name>.glb / .json / _ao.png`). Not done: **693 Chemin du Puits** (footpath in a wood: no Street
View panorama and no Commons photo found, nothing to read its type from; it would be a guess) and the **Moensberg group
770 / 771 / 772** (rail over rail, lowest priority; out of time). Both keep the old behaviour (track on its ballast).

Switch: **`?bridges2=0`** leaves all six out (no model, no ground cut, no tree clearing: the city as before). Names:
`HERO_BRIDGES2` in `viewer/rail/railData.js` (read by the tile worker and the page).

Rebuild: `"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/railBridge.py -- <name> models/rail [--preview <abs dir>]`,
`<name>` = ruestalle | engeland | engeland_chord | bigarreaux | kauwberg | linkebeek; then
`node tools/mesh_audit/cli.mjs models/rail/<name>.glb --out models/rail/audit --ignore-below -1.5` and, after railData.js
changes, `node tools/build_worker.mjs`.

### Per bridge

| id | model | type found (Street View 2013-2024, looked at only; UrbIS ortho 2024) | measured | estimated | LOD0 / 1 / 2 tris | draws (slots) |
|---|---|---|---|---|---|---|
| 686 | `ruestalle` | red-brick viaduct, 3 equal round arches on tall piers; pier strips rising to capped heads through the parapet; blue-stone imposts and plinths; stone string course; low parapet + welded-mesh safety fence | polygon 68.6 x 9.4 m, spans 16.2 / piers 2.4 / abutment pilasters from its notches, road 31.80, rail 49.59 (17.8 m) | springing 8.3 m (semicircles under the string course), ring 0.36 + header, parapet 0.9 m, fence 1.45 m | 12 632 / 3 787 / 1 051 | 5 |
| 694 | `engeland` | brick round-arch vault under a widened concrete deck: precast fascia panels on a lintel beam, both faces (3.90 m height-limit sign) | polygon 61.4 x 14.4, road 61.12 (on the UrbIS carriageway: the OSM line runs 5 m off it), rail 67.39 | span 4.8, springing 2.0 (crown 4.4) | 4 556 / 1 364 / 388 | 3 |
| 695 | `engeland_chord` | brick face, segmental arch with a concrete ring, small round arch beside it, brick parapet + post-and-rail railing | polygon 61.8 x 6.2, road 60.98, rail 69.66 | span 5.6 / rise 2.0 / springing 2.4; side arch 1.6 m, 5.2 m NE | 4 318 / 1 293 / 173 | 4 |
| 688 | `bigarreaux` | brick round-arch underpass under a precast concrete fascia + lintel (same family as 694) | polygon 17.2 x 9.4, road 55.52, rail 61.80 | span 4.6, springing 2.1 | 2 884 / 863 / 294 | 3 |
| 691 | `kauwberg` | brick segmental arch, end buttresses, stone string course, brick parapet + coping, post-and-rail railing | polygon 17.0 x 8.4 (+ buttress notches), span 8.6 from its narrowing, road 63.90, rail 69.94 | rise 2.4, springing 2.0 | 3 284 / 984 / 314 | 4 |
| 706 | `linkebeek` | brick stilted round arch, concrete capping beam with drip, lattice (X) railing | polygon 15.0 x 8.4, road 56.45, rail 63.47 | span 5.2, springing 2.7 | 2 844 / 849 / 279 | 4 |

All six: mesh audit **0 blocking** (`models/rail/audit/<name>.audit.md`; the warnings are slivers, bevel degenerates,
back-to-back faces), contact check (JOINS, `viewer.contactAudit('bridge-<name>')`) **0 floating, 0 overhang** each.
New generator rules for the round-2 styles (`STYLE` in railBridge.py; the round-1 bridges are unchanged): flat faces
flat-shaded, only curve tessellation (< 12 deg) smooth; arch rings as quad-strip bands (no ear-clipped annulus slivers),
hidden backs left out; no two boxes share a face plane; no bevel on the mass (it split the vault strips into bent
n-gons); the abutment end walls stop at the trough floor between the parapets (they stood out of the ballast at Rue de
Stalle). AO: 2048 px (Rue de Stalle), 1024 px for the small underpasses (bake ground = the DTM with the same cut).

### City

- Placement: the heroes' `.json` (as stjob / calevoet): their footprint replaces the UrbIS ring (tree keep-clear,
  embankment-fill stop, no mast in a hero); deck = ballast floor (rail top - 0.62): the ballast sits in the trough,
  nothing over air, no deck under the street.
- **Underpass cut** (`railData.js underpassCut`, run in `tileData.js` right after the abutment fill, BEFORE the roads):
  the LiDAR DTM interpolated the ground through the narrow underpasses and the road engine drew Rue Engeland and Rue des
  Bigarreaux **climbing 5-6 m over the embankment** (Linkebeek 0.5 m). Between two measured road points beyond the hump
  (`underpass.a / b` in the json) the drawn and the road engine's grids are lowered to the road's level (2 cm under), 1:1
  banks up to 7 m out, never inside a bridge footprint outside the corridor (the masonry keeps its ground). The trees on
  the corridor (+2 m) are cleared (`railKeepClear`). Before / after: `compare/r2_kauwberg_city_before.jpg` / `_after.jpg`
  (before: the ballast crossed the street in the air).
- Colliders: by LOD0 (`heroColliders.js` roots), car + walker; the `collisionTest` / `contactAudit` hero lists extended.
- LODs: the shared rail-bridge path (meshoptimizer 30 % / 6 %, dithered hand-overs at 140 / 420 m): states 100 / 110 /
  010 / 011 / 001 across the bands for all six, no hard switch.

### Collision tests (`viewer.collisionTest(tile)`, `?bridges2=0` = before)

The test's drawn-ground raster kept two layers per 0.5 m cell: under the Stalle viaduct (impost, ring, string course and
deck over the street) the street was lost and a walker read as fallen 11 m. It keeps four 1.5 m bands now
(`collisionTest.js drawnGround`); D5 before was identical with the old and the new raster.

| tile | bridge | drive before -> after | walk before -> after | static before -> after |
|---|---|---|---|---|
| D5 | 686 | identical (contacts 67, fell 0, floated 0, stuck 2 both: pre-existing, on the line N of the bridge) | contacts 12 -> 29 (the piers), fell 0, others identical | missing +1 (8 m2 on the deck at the N abutment: the railway, unreachable) |
| E8 | 694, 695 | identical (contacts 40, all 0) | identical (contacts 2, fell / floated 0) | invisible 575 -> 592 (+11 m2: the cut's edge inside the masonry), missing +22 (10.6 m2: parapets / railing on the decks at track level, unreachable, as St-Job's) |
| D8 | 688 | floated 1 -> 0 (the hump), contacts 53 -> 56 | fell 1 -> 0, floated 1 -> 0 | missing +3 (1.4 m2) |
| G6 | 691 | identical but contacts 71 -> 68 | identical (contacts 7) | invisible +3 (1.1 m2, at the face) |
| D9 | 706 | identical | fell 9 -> 8, floated 37 -> 36 (the Linkebeek hump items gone; the rest is Moensberg, pre-existing) | missing +1 (0.13 m2) |

No new fall, block or stuck anywhere; three hump artefacts removed.

### Cost

Per bridge: one draw per material slot (3-5) per shown level (+ the fading copies only inside a hand-over band) + the
shadow pass; triangles above. Warm-up (shaders + shadow pass, async, before showing) 27-32 s in parallel with the page's
own load. **GPU timing: not measured**: preflight RED (another agent's session on the shared GPU, frames 60-70 ms with or
without a bridge): any number would be noise. To do on a GREEN machine: Rue de Stalle street view on / off.

### Sheets

`compare/r2_<name>_city_*.jpg` (the city, from the Street View viewpoints), `compare/r2_blender_<name>_*.jpg` and
`r2_ruestalle_blender_*.jpg` (Cycles previews). No Street View image is stored anywhere.

### Left

- 693 Chemin du Puits (no imagery), Moensberg 770 / 771 / 772 (rail over rail; tracks and platforms at two levels).
- 695's small side arch: its purpose (footpath? relief arch?) and span are a guess from one panorama; the gap between
  694 and 695 is open to the sky (the DTM is open there; the OSM tracks crossing it are not checked).
- Rue de Stalle: the grey retaining walls along the street at the embankment toes are not modelled (terrain slopes there).
- Rue Engeland NW: the road engine's carriageway is wider than the chord's arch beside it (the asphalt meets the face left
  of the arch); Kauwberg: the UrbIS cobbled surface rides up the banks at its edges (pre-existing, also before).
- GPU A/B on a GREEN machine.
