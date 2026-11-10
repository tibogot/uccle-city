# Villa van Buuren: preparation for the hero model (2026-11-10, nothing modelled yet)

Avenue Léo Errera 41, Uccle. Built 1928 for David and Alice van Buuren (architects Léon Govaerts and Alexis
Van Vaerenbergh; Amsterdam School influence, Art Deco interior); today the Van Buuren Museum & Gardens.
Tile G2. Method: the hero-building method (UrbIS solid + LiDAR + photos façade by façade, named material slots,
photo camera poses, premium Blender, mesh checker clean before any merge).

## 1. Sources

- Photos: `data/raw/refs/vanbuuren/` (git-ignored, list + licences in `SOURCES.md`): 7 usable photos of the villa from
  Wikimedia Commons, CC BY-SA 3.0 / 4.0 (Donarreiskoffer 2019, Alberto Fernandez Fernandez 2011). They are
  references only (never shipped). `v07.jpg` shows a DIFFERENT house (a mansard building on the avenue): not used.
- Measured: `tools/vanbuuren_measure.py` -> `models/vanbuuren/site.json` (UrbIS 3D BuildingSolids, DSM / DTM 2021
  0.5 m, CC0). `--dump` prints the DSM on a building-frame grid.
- Allowed visual checks (owner, 2026-11-10): Google Street View / Maps to check colours, materials and the street
  side; never traced, stored or shipped.
- Still to find: the heritage inventory sheet (monument.heritage.brussels: the villa is listed, inventory text +
  photos), Mapillary on Avenue Léo Errera (the street side is the least covered by the Commons photos), the museum's
  own plan (for the room-by-room window rhythm).

## 2. Measured (UrbIS / LiDAR)

| | value |
|---|---|
| UrbIS solid of the villa | **550409** (BU 1776799): 233 m² footprint, 18 vertices, base 93.61, eaves 97.99, top 107.17 m TAW |
| NOT the villa | 509389 (BU 1726481, 118 m², top 113.2): the tall grey rendered building right behind it (visible in v01, v06) |
| plan orientation | −7.95° (length-weighted footprint edges), frame origin city (303.92, −1235.57) |
| DSM inside the villa | p50 104.4, p90 106.3, max 106.9 m: ridges ~13.3 m above the floor base; a long main ridge plus cross gables at ~13 m (dump rows w = 2…13.5); lower wing parts at 6–9 m |
| ground | 93.0–95.5 m around the footprint: the villa sits on a slope (the garden side lower, terrace walls) |

The `--dump` grid also shows the twin cross-gables (13 m) and the lower wings / veranda (4–9 m); read the roof parts
from it like the town hall (`docs` of tools/townhall_measure.py) once the façades are fixed from the photos.

## 3. Façade by façade (first read of the photos; counts to verify on the full-size files)

**Entrance front (avenue side; v03, v04, v05):** two steep brick gables side by side, roofs ~60°, dark brown-grey
flat tiles, thin dark timber bargeboards.
- Left gable (bigger): a tall brick chimney rising up the gable face and through the apex (corbelled where it leaves
  the wall); attic: 2 small square windows either side of the chimney; first floor: 2 windows, each under its own
  white concrete cantilevered hood (slab ~0.15 m thick, ~0.5 m out).
- Right gable: the gable top has a lattice of projecting bricks above a horizontal band; attic: 1 twin window; first
  floor: a big triple window with leaded / stained glass (the stair hall).
- Ground floor: one long white concrete canopy over the entrance bay; oak door with a column of leaded glass panels
  and black edging; vertical brick ribbing (pilaster strips) both sides of the door; a narrow leaded window in a deep
  white frame each side; brick planters with box balls; blue-stone steps; brick-paved path between box hedges; house
  number "41" on the brick. Left of it a French window in a white frame.
- Frames: varnished orange-brown wood upstairs, white-painted on the ground floor; a grey downpipe between the gables.

**Garden front (v00, v01, v02, v06):** two big gables (like the street side, without the chimney) + a lower wing on
the left ending in a glazed veranda with green frames.
- Ground floor: wide bay windows of white French windows under white cantilevered concrete slabs with a thin orange
  soffit band; brick terrace walls / planters in front; steps down to the lawn; a round raised basin / planter with a
  green-glazed drum (v06, right).
- Upper floors: deep projecting white concrete box frames (one per gable side, the "picture windows", with bars);
  corner windows; small square windows in the gable tops; patterned brick in the gable tops.
- The brick everywhere: orange-red, stretcher bond with strongly raked horizontal joints (horizontal emphasis),
  soldier / diaper patterns in the gable tops.

**Side façades:** partly seen in v02 (east/garden corner: a gabled side with a slab-hooded corner window) and v01; the
west side against the neighbour is not covered: would be ESTIMATED (flag it as such in the model notes).

## 4. Parts list (for the Blender script)

Walls (brick, raked joints), gable lattice brick, chimney (corbelled), roofs (flat tiles, steep; the shared slate
/ tile roof generator from the chapel `tools/blender/roofkit.py` once merged), bargeboards, white concrete hoods and
canopies (crisp, thin, with drip grooves), deep concrete box frames, window joinery (two families: varnished timber /
white), leaded and stained glass (pattern per window from the photos), oak door, downpipes and gutters, brick terrace
walls, planters, steps, the veranda (green steel / timber frames), the round basin.
Named material slots (no baked colour): `brick_orange_amsterdam`, `brick_pattern`, `concrete_white`, `roof_tiles_flat_dark`,
`wood_varnished`, `wood_frame_white`, `glass_window`, `glass_leaded`, `oak_door`, `metal_green_veranda`, `zinc_gutter`,
`stone_blue` (steps). New library names to propose: `brick_orange_amsterdam`, `roof_tiles_flat_dark`, `concrete_white`.

## 5. Difficult bits / risks

1. The gable lattice and raked joints: geometry near, material far (the town hall's region-width filter against
   sparkle).
2. Leaded / stained glass: pattern per window; must not sparkle at distance (mip-friendly lead lines).
3. The street side is the hardest to see (hedges, trees): Street View check + Mapillary before modelling.
4. The ground slope: the terrace walls and steps must sit on the DTM exactly.
5. Mesh checker clean (no coplanar hoods / walls, sealed frames) and the owner's no-bad-shading rule (support loops
   round every opening, flat normals on the walls).

## 6. Next steps (when the owner says go)

1. Full-size photos (the 1600 px thumbs are enough to count, not to fit): fetch the originals; heritage inventory +
   Mapillary + Street View check of the avenue side.
2. Camera poses for v02, v04, v06 (tools/stalle_photopose.py method), overlays in a Villa Lab.
3. Window counts façade by façade on the full-size photos, roof parts from the DSM dump.
4. Blender script, LODs (meshoptimizer in JS), checker, lab, then the city behind `?vanbuuren=1`.
