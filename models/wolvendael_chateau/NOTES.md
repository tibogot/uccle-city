# Château de Wolvendael (Parc de Wolvendael, Uccle; today the École d'art d'Uccle): the scripted hero + its pond

18th century house of the Vanderborght, later the Mosselman du Chenoy; white render, stone quoins, a slate mansard.
Replaces UrbIS solids **537523** (the house: an L, BU_ID null in the tile) and **538880** (the low annex behind the
south-west part, BU_ID building/1587095). The Louis XV pavilion (537211) is NOT part of this job.

## Sources
- Photos: Wikimedia Commons, full-size originals in `data/raw/refs/wolvendael/full/` (git-ignored; `full.json` = urls,
  sizes, sha1): w00 (Edison McCullen 2026-01-06, CC BY 4.0, Galaxy S23, HDR-processed and cropped), w01-w04
  (Donarreiskoffer 2019-03-24 16:34-16:35, CC BY-SA 4.0, SM-A750FN 27 mm eq.; w03 the 18 mm ultra-wide), w15 (Nels
  postcard, public domain, older state: awnings, an iron-and-glass porch over the arches). w16 is the Wolvendael of
  Brussegem (excluded). References only, never shipped.
- Measured: UrbIS 3D solids + DSM / DTM 2021 0.5 m (CC0): `tools/wolvendael_measure.py` -> `site.json`, `site_dtm.*`.
- Pond: OSM way 31664019 (natural=water, ODbL). UrbIS Land cover has NO water block here (the whole park is green block
  28215, checked in the 2026-10-02 GeoPackage), so the outline is OSM's; the level is measured (below).

## Frame
Origin city (-468.703, -365.572), rotation -33.569 deg (the prep's). u runs along the long pond front (u+ = the
north-east end), w across (w- = the pond side, north-west). Footprint (537523, frame): pond front w -11.38 / -11.33 from
u 20.55 (NE corner) to -12.69 (SW corner); NE end u 20.5 (8.8 m); back of the main block w -2.57 / -2.87 (u 20.4 ->
-0.54); the SW part runs back to w 3.39 (u -12.67 -> -0.64). Annex 538880: u -6.6..-0.6, w 3.1..7.7.

## Camera poses (tools/wolvendael_photopose.py -> photo_views.json)
Points: the two chimney stacks' front top edges (DSM positions); lines: the wall corners through the UrbIS footprint
corners; priors: EXIF focal (35 mm eq. on the diagonal) and the eye 1.6 m over the far bank.
- **w04**: f 3601 px (EXIF 3602), camera u 28.08 w -62.89 h 48.40 (across the pond), mean 3.3 px (lines 0.6-2.3 px,
  chimneys 9 px).
- **w02**: f 3594, camera u 28.13 w -63.16 h 48.46 (the same spot 12 s earlier, other framing), mean 5.5 px.
- **w00**: f 5495, camera u 43.6 w -58.8 h 50.8, mean 13.8 px on 8160 px: APPROXIMATE (HDR-processed, cropped sensor:
  principal point assumed central). Used only for the north-east end's bays.
- Back-projection: the cornice top picked on w04 lands at **57.91 m**, the UrbIS eaves exactly (57.91): the pose and
  the solid agree.

## Counted on the full-size photos, FAÇADE BY FAÇADE (before modelling)
Bays numbered from the NE end (photo LEFT, u+) to the SW end (photo RIGHT, u-). Positions back-projected from w04 on the
pond front's plane (photo_measured.json): bay centres u, widths of the openings, levels m TAW.

POND FRONT (north-west; w02, w04 full-size, w01, w00, w03; the postcard w15 for the older state): 33.2 m, 12 bays.
- Composition: NE corner quoins (u 20.55 -> 19.95) | B1, B2 | rusticated strip A (u 13.96 -> 13.39) | B3, B4, B5, B6,
  B7 (the centre, symmetric about B5) | strip B (2.19 -> 1.61, a downpipe beside it) | B8, B9 | strip C (-4.45 -> -5.04)
  | B10, B11, B12 (the SW part) | SW corner quoins (-12.11 -> -12.67, a downpipe). The main block B1-B9 is symmetric
  about B5 (u 7.9 = the middle of 20.55 and -4.75).
- Bay centres (u): B1 18.62, B2 15.23, B3 12.35, B4 10.16, B5 7.88, B6 5.64, B7 3.29, B8 0.36, B9 -3.19, B10 -6.4,
  B11 -8.7, B12 -10.7. Openings 1.10-1.25 m wide.
- GROUND FLOOR: 12 openings. B1, B2, B3, B7, B8, B9 = tall rectangular French windows (head 52.95, glass from the floor
  ~50.4), each with TWO louvred shutters folded back against the wall (12 shutters, grey); B4, B5, B6 = round-arched
  French windows (springing 52.47, crown 52.92), shutters folded between them (6 arched-top shutters); B10, B11, B12 =
  rectangular windows (head 52.80) boarded with timber X braces in 2019 (works), shutters only at the outer ends (left
  of B10, right of B12: 2). Total GF shutters seen: 20 leaves.
- FIRST FLOOR: 11 windows (B11 has NONE: plain render between B10 and B12, w00 + w04): two-leaf casements, 3 panes per
  leaf, sill 54.50 (stone sill on two small blocks), head 56.30, 1.15-1.25 wide; no shutters on the first floor.
- STRING COURSE between the floors: 53.76-53.99 (a flat stone band); over the centre (B4-B6, u 4.6..11.3) a deeper band
  53.32-53.91 with a moulded frieze and a keystone console over each arch; the lettering "École d'Art d'Uccle" on a
  panel over B5 (a sign: modelled as a plain panel).
- ENTABLATURE: architrave 57.11, frieze, cornice soffit 57.40, cornice top 57.91 (all round).
- Rusticated strips and corner quoins: alternating long / short blocks (~0.30 m courses), stone, 0.57 m wide.
- ROOF (front): the mansard's steep lower slope (brisis) from the cornice to the break at ~59.9 (a zinc roll), slate.
  DORMERS: 4 on the main block over B2, B4, B6, B8 (window head ~59.4, sill ~58.0, slate-hung cheeks, a small hipped
  roof with a zinc-edged eave ~59.7 and its apex ~60.3), 1 on the SW part over B10; 1 roof window (skylight) between B8
  and B9 dormers on the main roof; on the SW part over B12 a SHORT chimney stack clad in zigzag slate with 4 pots.
- CHIMNEYS: 2 tall stacks on the ridge (DSM: u 13.23 w -6.66 and u 1.84 w -7.58, tops 64.2), slate-hung (a zigzag
  pattern), a projecting cap, pots: NE stack 1 pot, centre stack 3 pots.
- STEPS: a perron before the arches B4-B6 (the lawn ~48.8 to the floor ~50.35: ~9 risers), benches; a hedge along the
  rest of the front (the plinth hidden: ESTIMATED plinth with no openings).
- Downpipes: 2 (by strip B and at the SW corner) + 1 at the NE corner (w04).

NORTH-EAST END (w00 frontal-oblique, w01, w04 side-on): 8.8 m, 2 bays, symmetric.
- First floor 2 windows, ground floor 2 French windows each with 2 shutters (4 leaves), same levels as the front
  (w00 back-projection: FF 54.45-56.4, GF heads 52.8-52.95); corner quoins at both corners; brisis with 2 dormers
  (over the bays: positions ESTIMATED, w00's pose too rough for them).

SOUTH-WEST END and the ENTRANCE SIDE (south-east), the annex: NO usable photo (w01's right edge shows only a low roof
by the street). **ESTIMATED**: the entrance side of the main block with the pond front's rhythm (9 bays, a door in
place of B5 with a stone surround and three steps), the SW part's back and SW end 3 bays each, the annex as a plain
rendered one-storey block with a hipped slate roof. Street View may be LOOKED at for colours later (not traced).

## Roof read from the DSM (`python tools/wolvendael_measure.py --dump`, site.json "roof" / "profiles")
- Main block: mansard; the brisis from 57.91 (cornice) to ~60.0-60.3, set back ~1.0-1.2 m (DSM across u 7.5 and 16:
  55.5 -> 60.3 between w -11.5 and -10.0); the terrasson ~37-39 deg up to the ridge **62.94** along u at **w -6.9**
  (the main block's middle, -6.97); hipped at the NE end.
- SW part: its own higher pavilion roof (the photos' "wing with its own hipped roof"): a short ridge along w at
  **u -6.7, 63.6-63.9** from w ~-5.3 to ~-2.6, hipped all round (~33 deg), over u -12.7..-0.6; the pond-side slope of
  the main roof runs on under it (DSM along w -9: flat 61.2 from u -11.75 to 18.5).
- Chimneys: NE u 13.23 w -6.66 top 64.23 (DSM extent ~1.15 x 2.15 m incl. blur), centre u 1.84 w -7.58 top 64.21.
- Ground (DTM, 1 m out): pond front 46.95 (SW corner) rising to 48.3-48.8 (u -9..4) and 50.0 at the perron (u 5..11),
  49.2 at the NE corner; NE end 49.2-49.4; back 49.4-49.8; the SW end 46.85-47.0 (the street side, low: ~3.4 m of
  plinth there). UrbIS base 46.93.

## The pond
- OSM 31664019 polygon 577 m2 (it includes the reed / shrub fringe); open water seen by the LiDAR (DSM = DTM, flat)
  190 m2. **Water level 46.72 m TAW** (p20 of the DTM where the DSM returns the same; the open water reads 46.72-46.74).
- Banks 0.3-0.7 m above the water (DTM 47.0-47.5 round it); the lawn rises to the house (48.3-50).
- Photos w01-w04: near-mirror reflections of the house, the sky and the trees, a few reeds and some debris; no lilies
  in March 2019 (lilies are summer: placed sparsely, near the edges).

## Pipeline (2026-11-11)
```
python tools/wolvendael_measure.py [--dump]                  # site.json (frame, roof, ground, pond), site_dtm.* (1 s)
python tools/wolvendael_photopose.py [--measure] [--undistort]  # poses, back-projected openings, lab overlays (undist/, git-ignored)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/wolvendael_chateau.py -- models/wolvendael_chateau [--no-bake] [--previews] [--fast]
node tools/wolvendael_pack.mjs models/wolvendael_chateau/wolvendael.raw.glb models/wolvendael_chateau/wolvendael.glb   # audit, LOD2, meshopt
python tools/wolvendael_sidebyside.py <screenshot> w04.jpg docs/wolvendael/side_w04_city.jpg                          # (git-ignored output)
```
Blender ~25 s with the AO bake (2048 px, 96 samples), ~60 s with previews; pack ~60 s (mostly the audits).
Kit: `tools/blender/wolvendael_kit.py` (builder, frames, boxes, chamfered blocks, profile sweeps round a polygon, lathes,
pipes, knobs). Viewer: `viewer/wolvendaelModel.js` (loader, slot table, temporary TSL materials, AO, anti-sparkle, LOD
fades), `viewer/wolvendaelCity.js` (`?wolvendael=1`), `labs/wolvendael-lab.html` (Château Lab), `debug/wolvendaelFlight.js`
(city flight + GPU A/B). The pond: `viewer/water/pondBed.js` + `viewer/water/pondWater.js` (reusable), the wave texture in
`vendor/slop-water/` (Mr.doob, MIT, ORIGIN.md).

## Model (what is geometry)
- Walls as quad grids round the openings (no fans; arches: vertical strips from the arc to the crown line); reveals 22 cm.
- Stone: corner quoins (alternating 57 / 40 cm, the corner block wrapping by its projection as its own closed box) and
  rusticated strips A / B / C (23 courses of 29 cm, 12 mm chamfers, 1.2 cm joints showing the plate behind), string course,
  the centre's deeper band over the arches with three keystones, plinth cap, chamfered sills, the entablature (architrave,
  frieze, bed mould 6 facets, corona, cavetto 8 facets: flat-shaded, the checker reads long smooth moulding strips as bent
  flat walls) swept round the L with mitres.
- Joinery: casements (frame, leaves, glazing bars 5 mm behind the leaves, panes), ground-floor transom lights, the arched
  fanlights (ring, transom, hub, radiating bars), 54 louvred shutter leaves (stiles, rails, 45 deg slats; bi-fold beside
  the arches), the back door (ESTIMATED: panels + transom).
- Roof: the brisis as one ring (cornice 57.91 -> break 60.05, 0.8 m in); the terrasson = Blender exact-boolean UNION of two
  convex hip roofs from the DSM (A main 62.94, B the SW pavilion 63.85 with its pond hip in A's plane); zinc rolls
  (16-sided, flat) on every convex edge (collinear pieces merged), the break and the brisis arrises, knobs where they meet;
  12 dormers (5 pond front, 2 NE end, 3 back + 2 SW end ESTIMATED): slate-hung fronts and cheeks, white casing, segmental
  head, zinc sill, hipped cap with zinc edges; a roof window; 3 chimneys slate-hung (the zigzag in the material) with caps,
  3 pots + 1 cowl + 4 small pots (SW stack, size ESTIMATED); the terrace (DTM 50.0 out to 3 m) with 5 risers and rendered
  cheeks; 2 downpipes on the front (+2 ESTIMATED); the annex (ESTIMATED).
- Triangles per slot LOD0: shutters 16.9k, joinery 13.8k, zinc 10.7k, stone 7.2k, terracotta 1.9k, render 1.8k, glass 1.0k,
  slate 0.7k, blue stone 0.3k. Lightmap LOD0 17 px/m, far 9.5 px/m; 19.6k thin faces with vertex AO.

## Mesh audit (tools/mesh_audit @ a3d14ab)
- Raw, before every pack: LOD0 **0 blocking** (54,274 tris; warnings: 8.8k slivers = long cornice / roll strips, 1.5k
  T-junctions, non-manifold box joints), far **0 blocking** (11,299). Five rounds to get there (thresholds' bottoms on the
  plinth cap, fanlight ring vs jambs, corner quoin ends, coincident roll facets at corners -> knobs, dormer casing vs
  reveals, smooth cornice curves -> flat, 12-sided rolls -> 16, a slit beside the door leaf).
- Packed (report only): LOD0 12 (crossings round knobs, 7 slits at dormer eave ends after quantization), LOD1 0, LOD2 86
  (meshopt collapses: thresholds onto the plinth cap, frames; LOD2 only beyond ~440 m, the building < 60 px wide).

## LODs
LOD0 54,274 tris / 9 draws; LOD1 (scripted far variant) 11,299 / 8; LOD2 (meshopt of LOD1, target 4.5k, 0.12 m) 4,556 / 8.
Switch by distance to the box: LOD0 < 90 m (+-15), LOD1 < 400 m (+-40). GLB 1.97 MB (raw 6.2 MB), AO PNG 1.9 MB (5.3 MB GPU).

## The pond (viewer/water/)
- Bed: water cells = the OSM ring grown 1 m where the DTM < level + 14 cm; a bowl 0.9 m deep with a 3 m ramp (chamfer
  distance). The tile worker carves it (tileData.js carvePonds, before the terrain mesh) and the shader's depth texture uses
  the same grid from the same F4 DTM; the OSM water area leaves the land-cover mask (no blue paint under the bank).
- Surface: a 1 m grid at 46.72, transparent, no depth write: the shoreline is where the terrain rises through it, the water
  fading by depth (body opaque from 30 cm, reflection from 10 cm): no z-fight. Three small LEAN wave layers (slope rms ~1 %),
  Fresnel (Schlick, F0 0.02), a murky olive body lit by the scene, a sun glint.
- Reflection: our own planar pass (three's ReflectorNode camera maths + the oblique plane, reversed depth handled) at half
  resolution, drawing only POND_LAYER: the château (all levels, fading copies), the sky dome, the terrain of the pond's
  tiles, the reeds and LOW-POLY TREE PROXIES (icosahedron crowns + trunks from the LiDAR trees within 95 m; the real tree
  field cost +1.8 ms). Only while the pond is on screen, the camera above it and < 220 m (fade 170-220 m); else the analytic
  sky. The shadow map is not re-rendered for it. An object joins the reflection only after a precompile for its target.
- Reeds (patches on the shallow fringe and wet bank, swaying) and lilies (shallow water near the edges) shrink to nothing
  between 85 and 110 m.

## Verification (this machine, one Chrome tab of mine; another agent's WebGPU tab on port 8822 ran for part of it)
- Side-by-sides at the solved poses (git-ignored, they hold the photos): docs/wolvendael/side_w04_city.jpg, side_w02_city.jpg
  (city, the photos' sun: day 83, 15.9 h), side_w04_lab.jpg; side_w00_city.jpg is not usable (the w00 pose is approximate
  and a LiDAR tree trunk stands at the photographer's place). Renders without the photos: city_w04_pose.png,
  city_w02_pose.png. The model lands on the photo's edges (facade, cornice, dormers, chimneys, the SW pavilion's roof); the
  reflections of the house, the sky and the trees sit where the photo has them.
- Grazing light (a June sunset skimming the pond front): lab_grazing_arches.png, lab_grazing_dormer_cornice.png: flat walls
  clean, reveals and sills cast crisp shadows, the slate courses read.
- Moving through the bands: lab_lod0_band_moving.png (47 -> 112 m: L0, L0+L1, L1), lab_lod1_band_moving.png (306 -> 474 m):
  no pop seen; the pond: lab_pond_walk_strip.png (walking the far bank at eye height).
- Flicker (lab, 24 frames): w04 view with the pond hidden: fixed 0 / strafe 2 / dolly 11 ppm (lab_flicker_w04_strafe_nopond.png);
  NE corner at 30 m: 0 / 53 / 35 ppm. With the pond: 1400-1800 ppm = its own animated ripples and reed sway (the test does
  not stop TSL time): not z-fight, but the shoreline under a frozen clock is NOT proven.
- GPU, lab bench (median whole frame, + = the part, 3 interleaved cycles): w04 view L0 +0.59 / L1 +0.52 / L2 +0.52, pond
  +0.20 (no trees in the lab); arches close-up L0 +1.84 / L1 +1.44 / L2 +1.44; NE corner +0.85 / +0.66 / +0.59, pond +0.13;
  pond close-up L0 +0.46, pond +0.26; 500 m: +0.07 / 0 / 0, pond 0.
- GPU, city at the w04 pose (pond on / off, 4 cycles): +0.98 ms (reflection CPU 1.25 ms); with the real tree field +2.49 ms
  (CPU 4.5 ms); reflection at 0.35 scale +0.36 ms. The château in the city ~0 (it hides the trees behind it).
- City flight (debug/wolvendaelFlight.js, 900 m -> 45 m -> orbit -> 900 m, 24 s), the last pair: run 1 1290 frames, median
  16.7, p99 50, worst 300 ms (18 frames > 34 ms at 6.2-9.6 s, no long task, one reflection pipeline built on the frame:
  terracotta's fading copy; the other agent's tab changed preset then); run 2 1383 frames, median 16.7, p99 33.4, worst
  33.5, none > 34. Coverage 1.000 and the right material (opaque / fading copy) in every frame of every run. The pair
  before the second warm camera: worst 66.7 / 34.0 ms; before the warm fix: 450-1870 ms frames.
- Load: GLB + AO 113-406 ms; shaders 2.2 s (lab) / 5-15 s in the city's background queue + 0.6-1.1 s shadow and reflection
  warm, before anything shows.

## Still weak
- The entrance side, the SW end, the annex and the back dormers are ESTIMATED (no photo; Street View not looked at yet).
- The central band is plain (the photo shows a moulded frieze with consoles); the sign has no lettering.
- The city's trees are summer-green stylized trees, the photos are March (bare): the reflections differ in kind; the tree
  proxies in the reflection are round blobs.
- Water seen steeply from above reads very dark (low Fresnel, dark body).
- The first flight after load still builds one fading-copy pipeline on a frame (~60 ms); run-1 frames of 50-300 ms under
  GPU contention are not fully explained.
- Packed LOD2: 86 audit items (> 440 m); packed LOD0: 12.
- Window frames still read darker than the photo's white at 50 m.
