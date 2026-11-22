# The villa on Avenue du Prince d'Orange (claude/villa1)

Owner, 2026-11-20 / 2026-11-22: a big modern luxury villa on Av. du Prince d'Orange, with a gate that opens, grounds you
can drive into, a garage with cars, a swimming pool and a big interior with stairs to a first floor, without hurting
performance. Look between real and stylised (docs/LOOK_NTE.md; the owner's NTE shots were a style reference only).
The villa is FICTIONAL (no owner, no brand); its plot and ground are real. `?villa=0` = the UrbIS house as before.

## Plot

UrbIS solid 543176 (BU 1588559, tile H9): a detached house on the avenue's west side, 25 x 29 m, the nearest building 27 m
away, ~28 m back from the axis. `tools/villa/site.mjs` writes the frame (u into the plot, w south along the avenue; three
local x = u, z = w, y = TAW - 100) and the city's terrain sampled in it (heightmap.js `surface`, the tile's own DTM) to
`models/villa/site.json`. The DTM shows the old house's two basement ramps (2.5 m deep, beside the house): the south one
became the villa's garage, the north one lies under the living wing; the garden behind is a flat lawn at ~117.7 m.

Plot (frame): u 9.6 (the property line: the avenue's half width 9.2 m) .. 58, w -34 .. 30 (64 x 48 m).

## Design (tools/blender/villa.py)

- Ground floor at 118.40 m on a blue-stone plinth (the terrain under the footprint reaches 118.28): white render, a glass
  curtain wall onto the garden; a double-height living pavilion (w -23 .. -8) with a sunken lounge (channel-tufted sofas,
  a marble fireplace wall with a linear fire), kitchen island + dining, the hall with a floating walnut stair (LED under
  each nosing) between a marble feature wall and a dark slat screen, a brass mesh panel, the lounge with walnut wall
  cabinetry (brass handles), a wall TV, a lit coffee niche, an LED cove ceiling with downlights.
- A cantilevered upper box (dark timber, vertical slats over the front and the south side) at 122.40 m: the mezzanine
  gallery over the living room (glass balustrade), a study, bedroom 2, the master suite.
- Garage under the lounge, in the old basement ramp, entered from the front (door w 18 .. 22.6); the drive runs straight
  from the gate. A black saloon in the left bay and a motorbike at the back; the right bay is the player's; a white SUV
  waits on the forecourt (the city's own car pack / bike models until the luxury cars come).
- The swing gate (two dark aluminium leaves with timber slats) in a rendered boundary wall with blue-stone piers; clipped
  hedges on the other three sides; the paved drive / forecourt / garage floor drape on the city's ground (JS).
- The terrace (blue stone) with the pool (16 x 4.5 m), its steps down to the lawn, a pergola on two dark columns.

Materials: named slots only, no colour baked. Exterior: render_white / stone_blue from the shared library (shipped
scans), wood_cladding, metal_dark, glass_window, concrete_soffit, glow, hedge (TSL stand-ins in viewer/villa/villaModel.js),
pool_water (one opaque TSL material: the basin is ray-traced in the fragment against the pool's box: mosaic, depth
absorption, caustics, night LEDs; lit by the scene, the sky's reflection from the env map). Interior: 12 unlit slots +
glass (viewer/villa/villaInterior.js), colour in TSL, light from the bakes.

Quality: flat normals on every plane (soft furnishings smooth, weighted normals), every opening a rectangle grid, faces
split on a world grid (welded seams: rule welded-seams), bevelled steps / copings / frames / furniture, walls and steps
sunk 0.3 m under the ground (rule model-meets-ground). Mesh audit before the pack: 0 blocking (the kit plants' open
leaves listed in models/villa/audit/interior.allow.json; the soft node skips streak / bentflat, which guard flat
architecture). Cycles on OptiX (the script refuses a CPU bake).

## Build

```
node --import ./tools/road_audit/register.mjs tools/villa/site.mjs
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/villa.py -- models/villa --samples 256 [--preview DIR] [--no-bake]
node tools/villa/pack.mjs
```
~90 s on the RTX 4050 (AO 2 s, sky / sun / night per-corner bakes 6-10 s each, five Cycles previews).

## Runtime (viewer/villa/)

| file | what |
|---|---|
| villaPlot.js | the frame + rings, synchronous for main.js: the plot clears the generated garden pieces / shrubs (and 2.5 m over the property line: the old house's front wall), the built rings clear the LiDAR trees and the grass |
| villaModel.js | the exterior GLB, its materials, LOD0 < 70 m, LOD1 < 240 m, LOD2 (dithered cross-fades), the animated parts, the pool water |
| villaGrounds.js + villaGroundsGeom.js | the paved grounds (one mesh, one draw; the garage floor's drape smoothed) |
| villaCars.js | the parked cars (one merged mesh each) + the bike; their rings for the car's colliders |
| villaInterior.js | the interior cell: per-corner baked light, the glass fading in over the exterior's, probes for the walker |
| villaCity.js | hide list, background load + precompile + shadow-pass warm-up, LOD fades, the gate (opens < 13 m of the car / walker / camera; colliders = closed rings or open leaves, never a moving leaf), the pivot door (< 3.5 m while the interior shows), interior streaming (fetch < 60 m, show < 30 m, hide > 45 m), third-person hooks (cell colliders, terrain off in the house and the pool, probe-lit walker) |

The villa root's LOD0 is in viewer/heroColliders.js HERO_ROOTS: its walls, plinth, terrace, hedges and garage are the
car's blockers and the walker's triangles; the gate leaves and the door live outside the root (they move).

## Perf (round 1)

See the report of claude/villa1 (numbers at the villa vs ?villa=0, same camera, GREEN preflight). Gate row `villa`
(tools/audit/villaCheck.mjs) holds the budgets; the browser row `villa` the stream-in hitch.

## Left for round 2

- Luxury car models; a garage door; the pedestrian gate; interior doors.
- The interior's first floor rooms are sparse (no bathrooms, no wardrobes); the master suite needs a dressing / bath.
- The slat façade aliases at 40-80 m (thin bars: a pack-side prefilter like docs/JITTER.md §2).
- LOD1 is meshopt of LOD0 (its packed audit reports normal streaks): a scripted mid level would be cleaner.
- Night: the interior's night bake and the exterior glow are set by eye; a night pass against NTE's blue hour.
- The pool: an infinity edge; a swimming animation for the walker.
