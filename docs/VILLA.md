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
| villaModel.js | the exterior GLB, its materials, LOD0 < 70 m, LOD1 < 240 m (scripted), LOD2 (dithered cross-fades), the animated parts, the open bay's far pane, the pool water |
| villaGrounds.js + villaGroundsGeom.js | the paved grounds (one mesh, one draw; the garage floor's drape smoothed) |
| villaCars.js | the parked cars (one merged mesh each) + the bike; their rings for the car's colliders |
| villaInterior.js | the interior cell: per-corner baked light, the glass fading in over the exterior's, probes for the walker |
| villaCity.js | hide list, background load + precompile + shadow-pass warm-up, LOD fades, the gate (opens < 13 m of the car / walker / camera; colliders = closed rings or open leaves, never a moving leaf), the pivot door (< 3.5 m while the interior shows), interior streaming (fetch < 60 m, show < 30 m, hide > 45 m), third-person hooks (cell colliders, terrain off in the house and the pool, probe-lit walker) |

The villa root's LOD0 is in viewer/heroColliders.js HERO_ROOTS: its walls, plinth, terrace, hedges and garage are the
car's blockers and the walker's triangles; the gate leaves and the door live outside the root (they move).

## Perf (round 1)

See the report of claude/villa1 (numbers at the villa vs ?villa=0, same camera, GREEN preflight). Gate row `villa`
(tools/audit/villaCheck.mjs) holds the budgets; the browser row `villa` the stream-in hitch.

## Round 2 (2026-11-22, the coordinator's review)

| defect | why | fix | rule / check |
|---|---|---|---|
| leaves inside the living room | trees were cleared by trunk only; a 9.5 m tree 2.7 m north of the living wing kept its crown | trees whose crown disc (+0.5 m) reaches the house or the terrace are cleared too (villaPlot.js crownHits): 23 more trees | tree-crowns-clear-villa, `villa` row |
| the drive rolled up at the garage, the floor followed the old ramp | the paving was draped on the DTM, which is the old basement ramp there | the drive + garage floor are ONE designed surface (villa.json drive_plane: 115.74 -> 115.80 m over 4.65 m, then flat); the car drives it (world.decks), the walker stands on it, the cars park on it; the garage narrowed to where the ramp is lowest | villa-drive-plane, `villa` row |
| rooms too empty for their size | round 1 furnished only the essentials | the lounge split by a double-sided walnut shelving wall (books, vases): a media lounge (sofa, cushions, two armchairs, side table + lamp, arc lamp, rug, planters, art) and a dining room for 8 under three pendants with a bar (counter, stools, bottle shelves); the living room: art, a credenza with books and objects, planters, side tables + lamps, cushions, the fireplace wall off the north window; first floor: a bathroom (freestanding tub, double basin vanity, mirror, stone floor) and the master bed set (cushions, throw, bench, lamps, art) | villa-budgets (200k tris, 16 draws) |
| a 40 m blank wall on the street | a 1.75 m rendered wall along the whole front | a low wall (0.75 m) with clipped hedges behind, the forecourt open; box hedges along the living wing's plinth; climbers between three slot windows; the entrance recessed 1.2 m (walnut-lined) under a dark fascia canopy with downlights; a mailbox and the house number on the gate's piers | `villa` row (joins, budgets) |

New interior slots: ceramic_white, books (a palette per code: spines, bottles), art (abstract canvases per code): 15 + glass
= 16 draws. Repeated items (books, chairs, bottles) are merged per slot at build time (one draw per slot).

## Left for round 3

- Luxury car models; a garage door; the pedestrian gate; interior doors.
- The interior's first floor rooms are sparse (no bathrooms, no wardrobes); the master suite needs a dressing / bath.
- The slat façade aliases at 40-80 m (thin bars: a pack-side prefilter like docs/JITTER.md §2).
- (done in round 3a: LOD1 scripted.)
- Night: the interior's night bake and the exterior glow are set by eye; a night pass against NTE's blue hour.
- The pool: an infinity edge; a swimming animation for the walker.

## Round 3a (claude/villa2, 2026-11-23): every level closed (gate `heroshell`)

The `heroshell` probe read the villa for the first time (rule gate-dir-deps): 17.7 / 23.2 / 6.8 m2 open at L0 / L1 / L2.
A diagnostic copy of the probe (each failing ray's entry / exit / hit in the villa frame) sorted the clusters:

| cluster | cause | done | rule / check |
|---|---|---|---|
| L0-L2: front u 12..14, the south strip, the back overhang, the pergola (16.5 m2 at L0, all "through", 0 back) | open air under the cantilevered upper box: rays graze under the soffit and come out at its ends | allowed: 4 capsule entries in heroShell.allow.json (new `to` = a segment, `noBack` = never excuses a cluster with a back hit) | villa-lod-shells, `heroshell` |
| L0: 1.2 m2, 6 back hits at the back (u 37.8, w 7.1) | the hall's OPEN BAY (its panel parked open for the walker): from 30 to 70 m the interior is not shown and the street saw the front wall's inside | a far pane in its own node `Villa_bay` (outside the root: never a collider), drawn while LOD0 is, hidden with the far glass when the interior shows (villaCity.js) | villa-lod-shells, `villa` row |
| L1: back hits through the entrance; packed audit 7,847 blocking | LOD1 was meshopt of LOD0: the recess's back wall kept the door's hole (the leaf is Villa_door), reveals collapsed, flat faces bent | a SCRIPTED LOD1 (villa.py lod1, 8.1k tris, 7 draws, its own AO bake): walls with openings, reveals, glass panes (the bay too), box frames and mullions, the recess closed, the slat screens as one plane (codes screen / channel: anti-aliased stripes in the wood_cladding TSL, dark glass in the gaps over the ribbon windows, lit at night), stepped hedge boxes; hero_pack.mjs keeps a raw <Name>_lod1. Raw and packed audits 0 blocking | villa-lod-shells, `villa` row (LOD1 scripted) |
| L2: the overhang rays only (the far box was closed) | (a duplicate roof face: the living box's top under the LPAR rect) | the far box's street side: flush dark panes in the front / side openings, the recess as walnut, the upper box's front + south as the screen codes; the duplicate face removed (170 tris) | villa-lod-shells |

Ceilings (heroShell.ceil.json): villa L0 0, L1 0, L2 0. Budgets: LOD0 56,994 tris / 8 draws, LOD1 8,098 / 7, LOD2 170 / 6,
download 5.50 MB, interior 179,420 / 16.
