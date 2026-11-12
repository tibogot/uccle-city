# Église Saint-Pierre d'Uccle (Parvis Saint-Pierre): the scripted hero

Neoclassical church, J.-F. Wincqz 1778-82, façades J. Baes 1883-84, fourth nave + annexes G.-C. Veraart 1938-50,
protected 1938, restored by Arter 2013-14. Research, sources, the measurements: `docs/saint-pierre/RESEARCH.md`; image
credits / licences: `data/raw/refs/saint-pierre/SOURCES.md` (git-ignored, with the photos).

```
python tools/stpierre_measure.py [--dump]          # UrbIS solid + DSM/DTM (two sheets mosaicked) -> site.json, site_dtm.*
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stpierre.py -- models/stpierre [--no-bake] [--previews]
node tools/hero_pack.mjs models/stpierre/stpierre.raw.glb models/stpierre/stpierre.glb 12000 1500 --name StPierre   # LODs + meshopt (tools/worker: npm ci)
python tools/stpierre_photopose.py                 # the photos' camera poses -> photo_views.json (lab overlays)
python tools/stpierre_sidebyside.py <photo> <lab screenshot> docs/saint-pierre/side_<name>.jpg "<title>" --crop x,y,w,h [--blend]
```
Blender ~45 s (UV 15 s, AO bake 23 s CPU), pack 2 s. Kit: `tools/blender/stpierre_common.py` = the generic part of the
Stalle kit (branch claude/stalle); `tools/hero_pack.mjs` = the Stalle packer with the node name as a parameter.
Viewer: `viewer/stpierreModel.js` (loader, adapter table, temporary materials), `viewer/stpierreCity.js` (city,
`?stpierre=1`), `labs/saint-pierre-lab.html`.

## Files
| file | what |
|---|---|
| `stpierre.glb` | EXT_meshopt_compression + KHR_mesh_quantization. Nodes `StPierre` (LOD0), `StPierre_lod1` (meshopt of LOD0, shares its vertex buffers), `StPierre_far` / `StPierre_lod2` (the script's far variant, trimmed) |
| `stpierre_ao.png` | Cycles AO (3 m, 96 samples) in TEXCOORD_1, 2048 px: LOD0 in v 0..0.86 (15 px/m mean), far above; u > 0.994 = AO 1 for the thin faces (AO per vertex in COLOR_0.g) |
| `stpierre.json` | slots, codes, placement (hides BU_ID 1594643), levels, plan, triangles per slot, what is estimated |
| `photo_views.json` | the photos' solved cameras (pose, focal, principal point, reprojection errors) |
| `site.json`, `site_dtm.*` | the measurements (input of the Blender script), the DTM patch (lab ground, AO bake) |

## Materials (no colour or pattern baked; only lighting)
- Slots: `brick_red_brussels`, `stone_white`, `stone_blue`, `slate`, `copper_brown` (**NEW name**: copper sheet in its
  brown state, the dome), `copper_patina` (finial, cross, cockerel, gutters / downpipes by code), `zinc_roof` (flat
  roofs, lead ridges), `wood_frame_dark` (doors by code; louvres by code), `glass_window`, `cast_iron_green` (bars;
  the clocks: dial / gilt by code). COLOR_0.r = code / 16 (plain, coping, surround, cornice, plinth, band, sill,
  sculpture, ridge, louvre, gutter, gilt, door, dial, quoin, lead), COLOR_0.g = vertex AO of thin parts. TEXCOORD_0 =
  world metres per face.
- ONE line switches every slot to the library: `const SOURCE = "temp"` → `"./materials/library.js"` in
  `viewer/stpierreModel.js`; `copper_brown` stays on the temporary material until the library has it. Live swap in the
  lab ("Material slots (adapter table)": shaders built first, then the switch).
- The temporary materials follow the 2014 restoration facts: brick in **cross bond** (Spanish format 48 x 115 x 240,
  stretcher / header courses, burnt headers, lime joints), ashlar of grès lédien with Savonnières crowning tones and a
  Gobertange plinth, petit granit with chisel striations, Spanish slates 20 x 30.

## Modelled (counted on the photos)
West front 19.56 m: corner piers, side bays (+0.3 m) and the central bay (+0.6 m, footprint); plinth, entablature
(architrave, frieze, moulded cornice); the portal (blue-stone piers with sunk panels, triglyph capitals with guttae, a
lintel and cornice, a fanlight with an 11-spoke fan under an archivolt with keystone, two panelled leaves, 3 steps);
two side doors (round heads, blue-stone surrounds, imposts, keystones, fans, panelled leaves, 2 steps); the two small
windows (moulded frames, sills with guttae, glazing bars) above a stone band; the upper register (brick panel, eared
blue-stone window frame with a grid of bars, the cartouche, pilaster strips, cornice, attic); the concave ailerons
(moulded coping, volutes, brick infill, backs); four urns on pedestals (gadrooned bellies, lids, flames).
Tower: octagon (6.1 m, 0.85 m cuts), long-and-short quoins on every edge, base / string / top cornices round the
octagon, 4 louvred openings (8 boards, blue-stone frames, sills), the slit window, 4 clocks (stone ground rising into a
segmental hood over the cornice, dial, gilt ring, hour marks, hands; west one larger), the copper dome (24 standing
seams, curb, west lucarne), the finial (pine-cone bulb with 4 rings of scales, cross with a ring, the cockerel).
South side: corner pier, bay 1, the urn pilaster, 5 bays (stone piers + flat pilasters, ~3 m brick panels, tall
round-arched windows with moulded surrounds, keystones, sills, leaded glass on iron grids), plinth, entablature, the
parapet behind the cornice (box gutter), downpipes, the porch. North: bay 1, the fourth nave (west face from P03).
Roofs: the main roof (ridge 67.7, hipped east end + the steep apse roof from the DSM), the fourth nave's hipped roof
(its valley falls out at 60.0 as the DSM shows), lead ridges, copper gutters.

## Estimated (no photo or not measurable) — also in stpierre.json "estimated"
The east end (main block's east wall, the apse's walls, the apse windows), all annex walls and windows (only their
footprints and the DSM's 54 m roofs are measured), the fourth nave's north wall (7 bays in the south side's rhythm) and
east wall, the porch's sides and door, the window over the porch, the N / E / S dial sizes, the cartouche and urns
(stylised), wall thicknesses. The photo poses: P02 good (level camera, 10 px), c10 20 px, P01 16 px; **P03's pose is
approximate** (the overlay is visibly shifted although the reported error is 13 px: few, clustered points).

## Interior
References: 1 interior photo (inventory P04: Tuscan columns, round arches, barrel vault, apse) + Veraart's 1938
section. Not enough for a credible cell → **next**: find more interior photos (owner's own, the parish, the 2014-16
phase-2 reports), then the Stalle approach (portal, baked lightmaps, probes, door).

## Numbers (2026-11-07, RTX 4050 laptop, Chrome WebGPU, one tab)
- Triangles LOD0 30,910 · LOD1 12,486 (meshopt of LOD0) · LOD2 1,671 (far variant trimmed); 10 / 10 / 10 draws (one per
  slot; + the shadow pass). GLB 1.00 MB (meshopt; 2.96 MB raw), AO 2048² PNG 2.5 MB / 5.3 MB GPU.
- LOD switch to the building's box: LOD0 < 110 m (±18 m dithered band), LOD1 < 420 m (±50 m).
- City GPU, church on vs off, alternating (debug/gpuAB.js), medians: street view on the parvis (13.7 m, LOD0)
  **+0.24 ms** (6 rounds, range 0.14-0.40; 12.09 → 12.32 ms); 236 m (LOD1) −0.05 (noise, 4 rounds); 559 m (LOD2) −0.05
  (noise, 4 rounds).
- Lab GPU (lab benchmark, median of 3 rounds, + = vs nothing): P02 frontal view L0 +0.66 / L1 +0.59 / L2 +0.33 ms;
  overview L0 +0.13 / L1 +0.07 / L2 +0.07; the P01 view (church filling a 1359 x 900 canvas) L0 +1.84 / L1 +1.70 /
  L2 +1.11 — and **+1.38 ms vs the UrbIS solid** it replaces (4 alternations): mostly fragment cost of the procedural
  temporary materials at full screen (L2 with 1.7k triangles already costs +1.11).
- Streaming in the running city: fetch + decode 103 ms (workers), shaders 677 ms through the async precompile, **no long
  task**. Lab: load 73 ms, shaders 1.2 s before it shows.
- MOVING through every LOD hand-over: city flight 700 m → 25 m → 700 m in 30 s, twice: 1800 frames each, median
  16.7 ms, p99 16.9 ms, 0 frames > 34 ms, LOD states 001 → 011 → 010 → 110 → 100 → 110 → 010 → 011 → 001 (fades at
  470 / 370 m and 127 / 92 m), 8 visibility switches, **0 pops** (worst visible share at a switch 0.1 %). Lab flight
  (24 s): 1440 frames, median 16.7, p99 17.9, 0 > 34 ms, 0 pops, coverage 1.00. Frame sequence while moving (canvas
  grabbed every ~0.4 s through both bands): `docs/saint-pierre/city_lod_sequence_moving.jpg`.

## Polish round 2 (coordinator's review of the c10 / P01 sheets)
- **Close-up cost found and cut**: on the P01 full-screen view the church cost +1.38 ms vs the UrbIS solid. Measured by
  swapping materials in place: (a) the dithered LOD fade's `discard` sat on every material ALL the time (no early-z):
  now `setLodFades` (viewer/stpierreModel.js) draws a level with lodFade's fading copies only while it is inside a band
  (the copies are precompiled with the model, lab + city); (b) the screen-space reflections traced the small metal
  parts (gutters, bars, dome, finial) → `noSSR` MRT on those materials (the glass gets a cheap fresnel x sky term
  instead); (c) the TSL materials are one `Fn` each with `.toVar()` intermediates, a sin-free hash, one value noise at
  most (no shared sub-expression re-emitted per use). Now **+0.65 ms vs the UrbIS solid, the same as a plain grey
  material on the same geometry (+0.59)**: the rest is the geometry and the post chain over its depth detail. City,
  parvis view: **+0.04 ms** (was +0.24; 6 rounds, range 0.00-0.13); LOD1 / LOD2: 0.00 / +0.03 (noise).
- Brick: dark red-brown per brick (world-space hash on UV0 metres = non-repeating), burnt headers, a few orange ones,
  pale lime joints kept as a coursing tone in the far field. Stone: pale cream / sand (the 2014 cleaning), lighter
  joints, light weathering (less grime at the foot). Blue stone stays dark grey-blue.
- Windows: leaded clear glass (0.22 x 0.3 quarries, pale lead lines, view-angle fresnel x sky colour, no extra draw),
  the iron glazing grids painted pale grey (photos); belfry louvres dark.
- Clock dials: the big pale hoods replaced by a thin disc + a small moulding following the dial's upper half.
- Dome: the reliable P02 pose (level camera) showed the round-1 dome (top 78.9) HIDDEN behind the cornice while the
  photo's dome rises clearly above it: raised to **79.6** (the DSM's 79.4 at 0.75 m from the axis). So the photos and
  the DSM agree here; it does not read squatter once posed.
- AO: 3072² (was 2048²): LOD0 **23.9 px/m** (was 15); GPU 12.6 MB (R8 + mips; was 5.3).
- Poses: P01 and P03 now solved as level cameras with a yaw (rectified inventory photos, EXIF focal, eye 1.5 m):
  18 / 17 px; their overlays are still approximate (the rectification is not a pure pinhole; the P01 overlay drifts
  ~7 % vertically at the base). P02 (10 px) and c10 (21 px) unchanged.
- Re-checked: city flights 700 m → 25 m → 700 m (30 s, twice): 1800 frames, median 16.7, p99 16.8, 0 > 34 ms, 8
  switches, **0 pops** (worst share 0.2 %; the first run's 3 events at t = 0.02 s are the teleport to the start, not
  motion). Lab flight: 1433 frames, p99 17.9, 1 frame > 34 ms, 0 pops. Lab GPU vs nothing: P02 L0 +0.39 / L1 +0.33 /
  L2 +0.20; P01 L0 +1.11 / L1 +1.05 / L2 +0.72; overview 0.00. Streaming in the running city: 156 ms + shaders
  (with the fading copies) 942 ms in the background, no long task.

## Screenshots (docs/saint-pierre/)
`preview_*.png` (Cycles, no AO), `lab_*_view.jpg` (the lab at the solved photo viewpoints), `city_parvis_southwest.png`,
`city_lod_sequence_moving.jpg`. Side-by-sides `side_*.jpg` are git-ignored (they hold the photos): west P02 (+50 %
overlay), west c10 (+overlay), south-west P01, north-west P03.
