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

## Pipeline (2026-11-10)
```
python tools/vanbuuren_measure.py                       # site.json (villa frame, roof parts, profiles), site_dtm.* (1 s)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/vanbuuren.py -- models/vanbuuren [--no-bake] [--previews] [--quick]
python tools/vanbuuren_photopose.py [--undistort] [--write-measured]   # poses, photo-measured openings (iterate with Blender)
node tools/vanbuuren_pack.mjs models/vanbuuren/vanbuuren.raw.glb models/vanbuuren/vanbuuren.glb   # audit, then pack
python tools/vanbuuren_sidebyside.py <lab screenshot> v03.jpg docs/vanbuuren/side_v03.jpg
```
Blender ~2 min with the bake (AO 4 m, 96 samples, 2048 px), +1.5 min previews; pack ~40 s (most of it the audits).
Files: `vanbuuren.glb` (2.69 MB, meshopt + quantization; raw 8.75 MB), `vanbuuren_ao.png` (2048 px, 2.7 MB),
`vanbuuren.json` (slots, codes, placement, measured, counts), `vanbuuren_landmarks.json` (the photo poses' 3D points +
wall planes), `photo_views.json` (solved poses), `photo_measured.json` (openings measured on the photos), `audit/`.
Kit: `tools/blender/vanbuuren_kit.py` (builder, frames, boxes, lathe), `vanbuuren_walls.py` (course fields),
`vanbuuren_roof.py` (roof shell + tile courses + trims), `vanbuuren_parts.py` (joinery, slabs, box frames, gutters, lattice).

## Method, what was done
- PHOTOS FIRST: the 7 full-size Commons originals fetched (2 s between requests, one 429 backed off); upright copies
  (EXIF). Heritage inventory: no record online for n° 41; Mapillary not tried (token); Street View not needed.
- POSES (tools/vanbuuren_photopose.py, the Stalle method + more): the EXIF focal as a prior (27 mm / 18 mm eq.: 3602 /
  1697 px; the Sony 16.8 mm: 3038 px), radial distortion k1 k2 (the ultra-wide), wall-corner LINES (a pixel on the
  vertical edge through a footprint corner) besides points, a camera-height prior for v00. The openings' corners picked
  on the photos are back-projected on their wall planes and fed back to the model (photo_measured.json): three rounds
  converge. Mean reprojection: v03 (entrance, east) 7.4 px, v06 (garden, west) 8.4 px, v00 (south) 23 px (its points are
  nearly planar; the weakest: TODO). Lab overlays use the photos remapped to the solved pinhole camera.
- ROOF from the DSM: three crossing gable roofs (A north-south 106.85, B east-west 106.80, C east-west 105.60, pitches
  56-58 deg), the north wing's flat top 104.85 with 57 / 63 deg slopes; valley B/C at w 0.85 (DSM 0.85). The gable faces
  where each ridge ends on the DSM (east S gable 5.75 with its bay to 6.50: v04's side face; east N gable 5.30 behind the
  single-storey porch to 7.60 and the canopy to 8.92 = the footprint's porch), the footprint for the rest.
- GEOMETRY (all scripted): brick walls with the BED JOINTS RAKED 13 mm deep as geometry on a 62.5 mm course grid shared
  by every wall (perpends flush, in the material), convex / concave corner rules (no coplanar groove faces), reveals
  split per course, every face a ladder of quads (no fans, no T-junctions inside a field); the roof as the boolean union
  of convex plane slabs (exact valleys and crossings) laid with real tile COURSES (11 cm gauge, 12 mm butts) per plane,
  ridge caps, zinc valley flashings, raised verge boards, half-round gutters with stop ends, downpipes; white concrete
  hoods, canopy and slabs with drip grooves; two deep box frames with the folding grilles; the porch's stepped door
  recess, brick ribs, the oak door with four leaded panels, the leaded windows' deep white frames, blue-stone steps,
  planters; the chimney breast on a stepped corbel and its stack; the corbelled south-west corner oriel; the dormer;
  projecting-brick lattice panels and soldier bands in the gable tops; the three bays (west French-window bay with white
  piers, the west and south picture-window bays); the terrace's retaining wall with steps, the low south wall, the round
  basin on its green drum; the NW wing and its green veranda (ESTIMATED).
- MATERIALS: 12 named slots, no colour in the GLB (codes in COLOR_0.r); UV0 in metres aligned with the geometry's courses
  (walls: height above 90 m TAW; roofs: along the eave / up the slope), so the far LOD's painted courses fall where LOD0's
  geometry has them. Temporary TSL materials in viewer/vanbuurenModel.js, SOURCE = the one-line switch, the adapter table.
- AO: lightmap UV1 (course fields and roof planes keep one PLANAR island each; the raked joints' faces and the other thin
  parts take vertex AO: baked into the brick rows they had bled in as blotchy bands under grazing light; fixed).
- LODs: LOD0 = Villa + Villa_courses (105,453 tris: 15,955 + 89,498 courses; 15 draws), LOD1 = the scripted far variant
  (3,828 tris, 12 draws, its own AO bake). A LOD2 by meshopt of the far variant was tried and dropped (71 blocking audit
  items after packing for 1.6k triangles saved; `--lod2` keeps it). LOD0 < 55 m (+-10 m dithered band) to the box.
- Normals: every face flat except round parts (pipes, gutters, the basin). NB Blender 5's set_sharp_from_angle marks
  every face smooth: the smooth flags are set after it (that gave 5 bent soffits before).

## Mesh audit (tools/mesh_audit, copied as-is from claude/stalle @ a3d14ab)
- Raw GLB, per LOD group, before the pack (the pack stops on any blocking item; it stopped twice during the work):
  LOD0 **0 blocking** (6 items accepted in audit/vanbuuren.allow.json, each hidden: against 509389's wall, under roof D,
  underground), far **0 blocking**. Warnings: ~29k slivers = the course strips by design (5 cm x up to 8 m, lightmapped
  with planar islands, flat normals), 1.6k nonmanifold edges (course corners), ~280 T-junctions (field joins inside
  hoods / roofs).
- Packed (quantized, report only): LOD0 6 (five 4-30 mm slits at ridge-cap / NW-roof course ends, one 2 cm2 streak at
  roof C's split), LOD1 2. TODO.

## Verification (this machine, one Chrome tab, 1400 x 900, dpr 1)
- Side-by-sides at the solved poses (git-ignored, they hold the photos): docs/vanbuuren/side_v03.jpg, side_v06.jpg,
  side_v00.jpg (photo | model | blend + the photo's edges).
- Grazing light: docs/vanbuuren/lab_grazing_east_ff_window.png (December noon, the sun skimming the east wall: crisp raked
  joints, reveals, sill, hood drip), lab_grazing_west_boxframe.png (June evening on the west box frame and slabs).
- Moving through the LOD band: docs/vanbuuren/lab_lod_band_moving_east.png (lab, 31 -> 77 m, 8 frames of a 5 s move),
  city_lod_band_moving.jpg (city, 45 / 54 / 61 / 70 m): no pop seen. City: city_east_avenue.png.
- Flicker test (lab, 24 frames): fixed 0 ppm (25 m, 31 m); strafe 186 / 135 ppm, dolly 27 ppm: single pixels scattered
  over the roof courses and brick joints (sub-pixel geometry at 25-30 m), no clustered z-fight blobs
  (docs/vanbuuren/lab_flicker_east_strafe_25m.png).
- GPU (lab bench, median whole frame, + = the villa): porch close-up L0 +0.72 / L1 +0.46 ms; v03 view (~10 m) +0.59 /
  +0.20; south-east 40 m +0.13 / noise; 70 m +0.13 / +0.07; 400 m noise (timer quantum ~0.065 ms).
- Load: GLB + AO 103-274 ms; shaders 1.2 s (lab) / 4.2 s (city, in the background) before it shows.
- City flight (debug/vanbuurenFlight.js, 500 m -> 30 m -> orbit -> 500 m, 24 s, twice): 1431 / 1429 frames, median 16.7,
  p99 16.9 ms; coverage 1.000 every frame, fading copies right every frame, no long task; run 1: one 117 ms frame at 6.5 s
  (d 64 m, the session's first hand-over) + 3 at 33 ms; run 2: worst 33.4 ms (11 frames > 25 ms, at the 500 m end).

## Look round (2026-11-11, coordinator's review of side_v03 / side_v06)
- Black hoods / canopy: NOT lighting. Blender's smart_project left 1098 of the "Villa" object's faces (hoods, slabs, box
  frames, sills, frames) with no lightmap area (all four UVs at one point): they sampled AO 0 = black in every light.
  Fix (tools/blender/vanbuuren.py lightmap()): each object has its own lightmap region (Villa 0..0.34, courses
  0.345..0.86, far 0.865..1), and faces smart_project leaves empty get a planar projection of their own (metres on their
  plane) before the pack. Check (Blender, the AO png sampled at every face's UV centre): black-centre faces 2408 / 3609
  -> 538; the rest face the ground or are closed (304 with no free ray at all). Roof soffits inside the attic take
  vertex AO.
- Glass (viewer/vanbuurenModel.js glassReflection): the sky gradient (env's horizon / zenith) above a dark skyline band
  and the street, emissive, Fresnel 2.5 % head-on -> 47 % grazing; a dim room per window or net curtains (pleated) in
  about a third. Leaded glass per pane (the glass is now one face per pane, UV 0..1): code "lead" = the stair window's
  mosaic of blue-grey rectangles (each its own glint), code "panel" = the porch windows' and the door's symmetric panels
  (clear centre, cream squares in columns), far = the average.
- Wood: frames golden tan (0xc4935a / 0xae7d48), bargeboards / roof soffits dark brown (v04, v00). The door's black
  bead was a full box over the leaf (the door read black): now a 2.5 cm ring.
- Brick (temporary): calibrated on photo samples against the white concrete in the same frame (linear, per channel, so
  the camera's white balance and exposure drop out). Shade (v03, the north gable): photo 0.22 / 0.063 / 0.058, model
  0.25 / 0.070 / 0.060 (before: 0.24 / 0.030 / 0.020, too saturated). Sun (v06, the west gable): photo 0.50 / 0.145 /
  0.083, model 0.46 / 0.13 / 0.07. Lab light matched per photo: v03 day 75 15:30, v06 day 220 14:00, v00 day 75 14:00.
- NW wing roof: DSM least squares in the wing's frame (t along from the SW end, c across toward the house): a lean-to
  rising toward the house (z = 101.04 + 0.602 c + 0.758 t, rms 0.11 m) up to a flat roof at 104.85 (the plateau over the
  north-east part), a brick step under the flat roof's edge: modelled. The first ~2 m at the veranda end fit a second
  plane rising toward the SW end (z = 103.96 + 0.755 c - 0.671 t, rms 0.03 m) with a valley at t ~2.05: tried (two
  slabs, the crease into the flat part as one convex solid), the audit kept 5-11 blocking items (12-30 mm slits under
  the valley, a 2 mm2 coplanar at the house corner): reverted, TODO.
- LOD2: kept at 2 levels, with numbers: LOD1 is 3,815 tris / 12 draws; the city frame at the flight's start draws 422
  calls / 5.66 M tris (GPU 12.2 ms), so LOD1 is 0.07 % of the triangles and 2.8 % of the draws; at 400 m the villa
  costs +0.13 ms GPU (2 timer quanta, shadow pass included). A third level cannot go under ~6 draws (one per slot still
  visible far away) and would save < 3.8k tris; meshopt on the far variant gave 71 blocking audit items.
- First hand-over hitch (117 ms): the shadow pass is not in compileAsync, so the first frame a level cast a shadow built
  its shadow pipelines on the frame. viewer/vanbuurenCity.js now warms it before the model shows: every mesh and every
  fading copy drawn one frame (3 per frame) 4 km under the city with async pipeline creation (vendor
  parallelPipelines), then once more after the pipelines are in: 7 pipelines created, 14 draws skipped, 1.8 s in the
  background.
- Joints: the raked joints' colour and vertex AO go to the wall's mean once sub-pixel (vbLook.jointFade); the roof's
  course butts get region width 0.02 (the anti-sparkle bends them far away).
- Ridge-cap strips of ridges sharing a plane are staggered 3 mm (10 mm far) so they are never coplanar.

## Look round: verification (one Chrome tab of mine; another agent's WebGPU tab, port 8819, was open: GPU noisier)
- Side-by-sides: docs/vanbuuren/side_v03.jpg, side_v06.jpg, side_v00.jpg (git-ignored). Porch: lab_porch_look.png.
  Grazing: lab_grazing_east_ff_window.png, lab_grazing_west_boxframe.png. Moving: lab_lod_band_moving_east.png (31 -> 72
  m, L0 / L0+L1 / L1, no pop seen). Flicker heat map: lab_flicker_east_strafe_25m.png.
- Mesh audit: raw LOD0 0 blocking (108,838 tris), far 0 blocking (3,815 tris); packed (report only) LOD0 4, LOD1 1.
- GLB 2.80 MB; LOD0 108,838 tris / 15 draws, LOD1 3,815 / 12.
- Flicker (lab, 24 frames): east 25 m fixed 0, strafe 57-78 ppm (joint fade off: 63-91), dolly 8-10 (off: 13-33);
  SE 40 m fixed 0, strafe 61-103 (off: 58-104). Before the round: strafe 135-186. Single pixels on silhouettes,
  chimney cap, lattice; no clusters.
- GPU (lab, whole frame median, + = the villa, alternating off / L0 / L1): porch +1.18 / +0.78 ms, v03 +0.73 / +0.40,
  v06 +0.91 / +0.39, SE 40 m +0.33 / 0, 70 m +0.46 / +0.20, 400 m +0.26 / +0.13 (before: porch +0.72 / +0.46, v03
  +0.59 / +0.20; the per-pane glass with its reflection and the other tab account for the rise).
- City flight (debug/vanbuurenFlight.js, 24 s, twice): median 16.7 ms both, coverage 1.000 every frame, fading copies
  right every frame. Run 1: first hand-over at 6.39 s (65 m): no 117 ms frame; worst 50 ms (6.54 s, like the 50 ms
  frames before it while tiles stream); run 2: worst 83 ms at 11.6 s in the orbit (no LOD change then), 7 frames > 34 ms.

## Still weak
- The v00 pose (23 px) and so the south side's exact proportions; the NW wing (its SW end's second roof plane, windows,
  veranda placement).
- Glass in the low sun's glare (v03's lower-left window) reads brighter than the photo; frames 6.5 cm (the photos read
  ~10 cm on the first floor).
- The porch canopy's soffit picks up a warm brown bounce in the lab's post chain (white in the AO-only debug).
- Strafe flicker 57-103 ppm at 25-40 m (was 135-186).
- The east bay's ground floor, the south-east ground floor, the north side: plain brick (not seen).
- Leaded glass: two patterns (stair mosaic, porch / door panels) read from v04, not each pane's exact design.
