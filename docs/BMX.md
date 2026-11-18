# The kid's BMX asset (branch `claude/bmx`, 2026-11-18)

A 90s 20" chromoly freestyle BMX, every part scripted (`tools/blender/bmx.py`, Blender 5.0 headless, Cycles OPTIX).
Style: "stylised but grounded" (owner 2026-11-18): real proportions and parts, clean shapes, soft bevels, paint + chrome.
The physics lives on `claude/bike` (docs/BIKE.md); this is only the model, matched to the lab's numbers.

## Build
```
blender --factory-startup -b -P tools/blender/bmx.py -- --textures          # chain strip + spoke set renders (docs/bike/tex)
python tools/bike/bmx_textures.py                                           # -> models/bike/bmx_chain.ktx2, bmx_spokes.ktx2
blender --factory-startup -b -P tools/blender/bmx.py -- [--colourway blue|red|purple] [--renders] [--checker] [--no-bake]
node tools/bike/bmx_pack.mjs                                                # raw -> models/bike/bmx.glb (+ mesh audit)
python tools/bike/bmx_textures.py --sheet                                   # docs/bike/turntable.jpg (after --renders)
node tools/audit/bmxCheck.mjs                                               # gate row "bmx"
```
`--swatch` renders `docs/bike/colourway_<name>.jpg` without exporting.

## Contract for the game (glTF: x left, y up, z forward; root on the ground midway between the axles)
| node | parent | pivot / motion |
|---|---|---|
| `Body` | `BMX` | frame, saddle, rear brake, gyro lower plate, rear pegs, chain |
| `Steer` | `Body` | on the steering axis (head-tube middle), rotated so **local +Y is the axis** (16 deg back): steer = rotate about local +Y, + = left |
| `Wheel_F` | `Steer` | front axle, world-aligned at rest: spin about local +X, + = rolling forward |
| `Wheel_R` | `Body` | rear axle: spin about local +X |
| `Cog` | `Body` | rear axle: = crank angle x 44 / 16 while pedalling (freewheel when coasting) |
| `Crank` | `Body` | bottom bracket: + about local +X = pedalling forward; at rest the right arm points forward |
| `Pedal_L`, `Pedal_R` | `Crank` | pedal spindles: `rotation.x = -crank` keeps them level |

Empties (rider IK, UAL kid later): `Grip_L/R` (Steer), `Foot_L/R` (pedal tops), `Seat` (saddle top), `Peg_FL/FR`
(Steer), `Peg_RL/RR` (Body), `Contact_F/R` (the tyre contacts at rest). Each node holds `<Node>_LOD0/1/2` meshes: show
one level (suggested switch 12 m / 40 m). All numbers: `models/bike/bmx.json`.

Slots: `bmx_paint` (colourway colour, clear coat), `bmx_chrome`, `bmx_metal`, `bmx_black`, `bmx_rubber`, `bmx_grip`,
`bmx_saddle`, `bmx_pad`, `bmx_cable`, `bmx_chain` (alpha-tested strip; scroll `offset.x -= dCrank * 0.08901 * uvPerMetre`,
bmx.json `chain`), `bmx_spokes` (blended cone cards, pre-filtered: QUALITY_RULES 23, no sub-pixel spoke geometry on the
player's bike). COLOR_0 = baked vertex AO. Colourways (bmx.json `colourways`): blue / red / purple (paint, pads, grips,
saddle): recolour the slots at run time, no re-export needed.

Triangles: LOD0 15.8k, LOD1 8.1k, LOD2 1.8k. 717 KB GLB + 2 x ~120 KB KTX2.
