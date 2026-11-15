# Église Saint-Marc / Sint-Markuskerk, Avenue De Fré 76: the scripted hero

Branch `claude/landmark5` (worktree `uccle-landmark`), 2026-11-15. A brick church on a square plan, inaugurated on 6 June
1970, renovated in 2002 (nl.wikipedia "Sint-Markuskerk (Ukkel)": "the roof has four surfaces that curve upward toward the
centre; the two front ones rise less high than the two rear ones; the gap between them is closed with a glass wall").
Wikidata Q62570700, OSM way 225781790 (`ref:UrbIS` 7605637). No Commons photo, no inventory entry found; the front is
from Street View (2009 frontal views, 2024 oblique view: unchanged), looked at only.

```
python tools/landmark5_measure.py saintmarc [--dump]           # UrbIS solid 548515 + DSM/DTM sheet 149166 -> models/saintmarc/site.json, site_dsm.*, site_dtm.* (u16 above 50 m: the ground is ~67 m)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/saintmarc.py -- models/saintmarc [--no-bake] [--previews] [--checker --sunaz=100]
node tools/hero_pack.mjs models/saintmarc/saintmarc.raw.glb models/saintmarc/saintmarc.glb --nolod --name SaintMarc
node tools/mesh_audit/cli.mjs models/saintmarc/saintmarc.raw.glb --nodes SaintMarc --range SaintMarc=128 --ignore-below 17.4 --out models/saintmarc/audit/lod0
   (SaintMarc_far 470 -> audit/lod1, SaintMarc_xfar 6000 -> audit/lod2)
```

## In the city
- Tile **G3**. The UrbIS solid 548515 (BU_ID building/1719656) joins the hide list. **Switch: `?saintmarc=0`** = the UrbIS
  block back. Dev panel: Landmarks row "Saint-Marc", Go to "Saint-Marc church" (above, south-east) and "Saint-Marc,
  Avenue De Fré" (the street before the front). Same modules as the Sacré-Cœur (`viewer/landmark5City.js`,
  `viewer/landmark5Model.js`), same LOD bands (110 +-18 m, 420 +-50 m).
- Colliders from LOD0: 8,308 triangles (walk / third person: the porch columns, the screen, the slab's edge) + 78 car
  blocks; in `HERO_ROOTS`, `contactAudit`, `collisionTest`, the falcon's list, the boot gate.

## Measured vs estimated
Frame: u from the entrance front on Avenue De Fré (south; u 0 = the OSM ground-floor front) to the back (north), w to the
EAST; rotation -87.61 deg (the OSM back wall, 2.39 deg off the city's x).
MEASURED: the box (UrbIS u -5.3..26.2, w -18.4..13.1 with the coping; OSM walls u 5.1 / 25.3, w -17.6 / 12.2: the model's
walls u -5.0 / 25.5, w -17.8 / 12.6), the rim 76.18 all round (UrbIS: 222 vertices at that level; DSM 76.1-76.4) -> the
walls to 76.05 under a coping to 76.25; the roof from the DSM: the rear apex 85.4 at u 5.5, w -2.5 (DSM 85.2-85.6),
falling 0.49 m per m to the back along the axis; the front surfaces from the rim to 80.4 at the glass wall (DSM 80.35 at
u 3.75); both families concave (rounded-diamond contours), fitted as h = rim + (top - rim)(1 - t), t the superellipse
(p 1.6) of the distances to the apex line / the glass wall, run out onto the rim level by a soft minimum; the
cantilevered front over the entrance (UrbIS 69.92 under it); the east annex (UrbIS 75.08, u 2.85-22.89, w 13.1-17.2);
the ground (DTM 67.5-68.4).
FROM THE PHOTOS: the brown-grey brick, the blank upper front (71.25-76.05) over a concrete band, the recessed glazed
entrance (doors and mullions) behind square concrete columns, the dark metal cross right of the centre (upright
72.9-75.55, bar 2.5 m at 74.4), the clerestory: vertical glazing with dark mullions and a transom under the rear roof's
chevron overhang (0.9 m), its dark fascia and timber soffit, grey metal roofs (standing seam: modelled in planar strips,
flat shaded, as a curved zinc roof is laid).
ESTIMATED: the side, back and annex openings (none visible from the street: tall narrow windows, the annex's windows and
door), the columns' spacing (6.4 m), the screen's division and its three oak doors, the cross's size (+-0.3 m), the floor
(68.45). Not modelled: the ivy on the front's east half, the flagpole, the hedges and the forecourt (city ground).

## Model
| level | node | triangles | draws | shown |
|---|---|---|---|---|
| LOD0 | `SaintMarc` (roof grid 0.55 m) | 8,308 | 7 | < 110 m |
| LOD1 | `SaintMarc_far` (roof grid 1.6 m, no mullions / sills / door leaves / downpipes) | 1,884 | 7 | < 420 m |
| LOD2 | `SaintMarc_xfar` (roof grid 3 m, windows as shallow panels, no coping inner faces) | 694 | 7 | beyond |

The roof cells are split along the diagonal that runs toward the apex in each quadrant (the seams' direction): regular
strips under a grazing sun, no zig-zag (the first build split by height and showed a herringbone in the checker render).
GLB 0.37 MB; AO 2048 px. Slots: `brick_dark` (the library's shipped scan), `stone_blue` (shipped: the porch floor),
`zinc_roof`, `concrete_white` (temporary: band, columns, soffit, copings), `wood_oak` (temporary: doors, the overhang's
soffit), `glass_window` (night glow), `cast_iron_green` (cross, mullions, fascia).

## Checks (2026-11-15)
- **Mesh audit**: LOD0 / LOD1 / LOD2 **0 blocking**. On the way: the porch floor / soffit as single L-shaped slabs (a
  T-junction edge read as an overhang over the falling ground), the floor's skirts only where the box walls do not go
  down, door leaves clear of the mullions, the curved roofs flat shaded (smooth normals bled into the near-flat rim zones:
  "bentflat"), the chevron overhang trimmed where the rear roof meets the front roofs (it lay on them: coplanar flats
  and slits) with closed lateral ends, the front roof's end meeting the glass plane with no gap.
- **Shading**: checker renders with a low side sun (`saintmarc_*_checker.jpg`): the concave roofs read as fine regular
  strips, the walls flat, no black faces.
- **Contact (JOINS)**: `await viewer.contactAudit("saintmarc")`: 8,308 triangles: **0 floating, 0 overhang, 0 blocking**,
  7 "opening" infos (window sills). The porch slab's skirts and the walls go 0.3-1.1 m into the falling ground.
- **Collisions**: `viewer.collisionTest("G3")`: nothing within the church's box (static, drive, walk).
- **LOD flight** (`l5flight("saintmarc")`, 680 -> 12 -> 680 m, 12 s each way, tab in front): **0 pops**, 9 switches;
  states 011@678 001@670 011@416 010@340 110@109 100@89 110@111 010@132 011@434 001@536. Frame times, interleaved
  model on / held hidden / on (10 s legs): median 17.3 / 17.7 / 17.6 ms, p99 33.1 / 31.0 / 30.8 ms (noise; the first
  flight's p99 of 61-111 ms was tiles streaming in on the way out).
- **Cost** (renderer.info, shown vs held hidden; main + shadow passes): street, LOD0: **+15 draws, +16.5k triangles**;
  230 m, LOD1: +13, +3.7k; 610 m, LOD2: +11, +1.3k. GPU ms not measured (preflight RED: shared laptop).
- **Night** (`?hour=22`): the clerestory and the entrance screen glow warm (emissive only).

## Compared with the photos (in words)
Street View 2009 from Avenue De Fré vs `saintmarc_city_street.jpg` (also `saintmarc_city_aerial.jpg`, `saintmarc_city_night.jpg`, Blender `saintmarc_*.jpg`): the same composition — a long, blank brown-grey
brick front cantilevered over a dark glazed entrance on slim square concrete columns, a concrete band at the brick's
foot, the dark cross right of the centre, and behind the front the clerestory glass rising to a sharp peak under the
dark chevron of the rear roof. Differences: the real brick is warmer and lighter (a grey-mauve brown; the library's
`brick_dark` is a shade too dark and red), half the real front is under ivy, the real concrete band is thinner, the
photo's chevron eave is deeper with a heavier fascia; the forecourt in reality is paved with hedges and a lawn (the
city's ground there is grass). Aerial (the 2024 orthophoto): the four-surface roof with its radial creases and the
flat-cornered rim inside the square coping reads like the photo's dark grey metal roof.

## Weak spots / next
- Brick tone (library `brick_dark`) a little dark for this brick; a dedicated look would help.
- Hidden openings estimated; the east annex simplified (one block).
- The forecourt / ivy / flagpole not modelled.
