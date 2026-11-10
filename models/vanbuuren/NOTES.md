# Villa van Buuren (Avenue Leo Errera 41, 1928): the scripted hero building

1928, Leon Govaerts and Alexis Van Vaerenbergh for David and Alice van Buuren (Amsterdam School outside, Art Deco
inside); today the Van Buuren Museum & Gardens. Replaces UrbIS solid **550409** (BU 1776799) only; 509389 is the tall
grey rendered building against its north side (NOT the villa, kept as UrbIS).

## Sources
- Photos: Wikimedia Commons, full-size originals in `data/raw/refs/vanbuuren/full/` (git-ignored; `full.json` = urls,
  sizes, sha1; the EXIF-rotated ones (v00, v04, v05) stored upright, originals kept as `*_orig.jpg`). Donarreiskoffer
  2019-03-24 (CC BY-SA 4.0; Samsung SM-A750FN: v00 / v04 main camera 27 mm eq., v01 / v02 / v03 / v05 the 18 mm eq.
  ultra-wide, barrel distortion) and Alberto Fernandez Fernandez 2011-09 (v06, CC BY-SA 3.0, Sony DSC-R1 16.8 mm).
  References only, never shipped. v07 is another house.
- Measured: UrbIS 3D solid 550409 + DSM / DTM 2021 0.5 m (CC0), `tools/vanbuuren_measure.py` -> `site.json`.
- Heritage inventory (monument.heritage.brussels): no record found for Avenue Leo Errera 41 on 2026-11-10 (the street
  pages 404, a web search finds none). Mapillary: needs an API token (not tried). Street View: not needed for the
  counts (v03 / v04 / v05 cover the avenue side frontally from the front garden).

## Orientation (read from the ortho + DSM + photos; the prep doc's "garden front" is the WEST side)
- EAST = the entrance front, facing the front garden and Avenue Leo Errera (v03, v04, v05).
- WEST = the garden front with the two big gables, the long white French-window bay and the veranda wing at its north
  end (v06, v02, v01).
- SOUTH = the third gable (the north-south roof's end) facing the lawn and the round basin (v00; obliquely v02, v06).
- NORTH = against 509389 (hidden: ESTIMATED) + the low NW wing (trees: partly ESTIMATED).

## Windows, doors, hoods: FACADE BY FACADE (counted on the full-size files, before modelling)
EAST (v03 frontal, v04 / v05 closer):
- South gable (left, the big one, with the chimney breast): attic 2 single windows (one each side of the breast, 4
  panes high); first floor 2 windows (left: 2 lights under its own white hood; right: 2 lights on the projecting brick
  bay, under the middle hood); ground floor 1 white French window at the far left under a small slab (v04 / v05); the
  bay's ground floor is hidden by the topiary (ESTIMATED: plain brick + the planter).
- Chimney: one tall stack rising up the south gable's face (a breast from a V-shaped corbel at the first floor up,
  free above the roof, top ~1.6 m above the apex).
- North gable (right, smaller): a lattice field of projecting bricks above a horizontal band at the top; attic 1 twin
  window (2 lights); first floor 1 triple window with stained / leaded glass (the stair hall, 3 lights x 8 panes).
- Porch (ground floor under the long canopy): 1 oak door (a column of 4 leaded panels, black edging) in a stepped
  brick recess with vertical brick ribbing both sides, 2 narrow leaded windows in deep white frames (one each side), 2
  brick planters with box balls, 2 blue-stone steps; the canopy's soffit steps down in an Amsterdam-School profile over
  the door with a glazed lantern. House number "41" on the brick (not modelled).
- North wing (lower, right): 1 dormer (3 lights) with a slab roof in the east roof slope; ground floor 1 timber door +
  1 window (3 lights) under a slab.
- Downpipes: 1 between the gables (at the bay's corner), 1 at the north wing.
- Totals east: 11 windows (+1 estimated), 2 doors, 6 white hoods / canopies.

WEST, the garden front (v06, v02, v01):
- North gable (left, smaller): attic 1 twin window; first floor 1 deep white concrete BOX FRAME (wide picture window
  with a folding grille); ground floor 1 projecting bay (a big fixed light between 2 narrow side lights) under a slab,
  a brick planter in front.
- South gable (right, bigger): attic 1 triple window (casements); first floor 1 twin window + 1 small single window
  (near the valley); ground floor the long bay of white French windows: 3 pairs (6 leaves) + the return at the corner,
  under one long slab with a thin orange soffit band; a brick planter wall in front.
- South-west corner: a corbelled first-floor corner oriel with windows on both faces under a slab that wraps the
  corner (v02, v00).
- North end: the low NW wing: first floor 1 window pair under the eave slab; ground floor the glazed veranda (green
  steel frames, 4 bays, flat slab roof).
- Downpipes: 2 (between the gables; the corner).
- Totals west: 9 windows + 6 French-window leaves pairs/returns + the veranda; 5 slabs / hoods + 1 box frame.

SOUTH (v00 frontal; v02 / v06 obliquely):
- The south gable (A): attic 1 triple window; first floor 1 box frame with a folding grille; ground floor 1 bay
  (picture window + 2 side lights) under a slab.
- Left of it (the set-back south-west part): the corner oriel's south window (2 lights) under its slab; ground floor a
  white French-window bay under a slab.
- Right of it (the set-back south-east part): first floor 1 window (2 lights) under a corner slab; ground floor hidden
  by the pines (ESTIMATED).
- Totals south: 5 windows (+1 estimated), 1 box frame, 4 slabs.

NORTH: hidden by 509389 and the trees: ESTIMATED (plain brick, no openings modelled against the neighbour).

## Roof (DSM 2021, read with tools/vanbuuren_measure.py --dump; see site.json "roof")
- One common eave level ~101.65 m TAW and a ~60 deg pitch everywhere.
- A: north-south gable roof, ridge 106.85 at u 0.55, its gable = the south front (w 8.45).
- B: east-west gable roof, ridge 106.85 at w ~3.7 (the big east gable with the chimney, the big west gable).
- C: east-west gable roof, ridge 105.55 at w -1.6 (the smaller east and west gables).
- D: the north wing: a flat top at 104.85 (u -4..3, w -2.3..-7.9) with 60 deg slopes down to ~98.7 east / ~99.1 west.
- The NW wing (the rotated wedge of the footprint): ~1.5 storeys, roof ~102 (trees over it on the DSM: ESTIMATED).

## Estimated (no photo, or not measurable)
- The whole north side (against 509389), the NW wing's north / east faces, the bay's ground floor on the east, the
  south-east ground floor; the exact depth of the projecting bays (from the side faces' widths in v04 / v02); the
  leaded / stained glass patterns (from the photos, not traced); the lattice brick pattern (read from v04 / v06).
