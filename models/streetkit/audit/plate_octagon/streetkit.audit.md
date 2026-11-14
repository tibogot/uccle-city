# Mesh audit: streetkit plate_octagon

1,012 triangles, 528 welded vertices, 0 open edges, 0 rays, 96 ms.

**0 blocking**, 72 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 72 |
| seam | info | 8 |
| backtoback | info | 28 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 72)

| at | part | aspect | longest |
|---|---|---|---|
| -0.08, 0.13, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.13, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.13, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.13, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.13, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.13, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.13, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.13, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.17, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.17, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.17, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, 0.17, -0.02 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.12, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| -0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.18, -0.04 | plate_octagon/sign_rail | 430 | 0.494 |
| 0.08, 0.12, -0.04 | plate_octagon/sign_rail | 494 | 0.494 |
| -0.08, 0.12, -0.04 | plate_octagon/sign_rail | 494 | 0.494 |
| -0.08, 0.18, -0.04 | plate_octagon/sign_rail | 494 | 0.494 |
| 0.08, 0.18, -0.04 | plate_octagon/sign_rail | 494 | 0.494 |
| -0.08, -0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, -0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| -0.08, -0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |
| 0.08, -0.17, -0.04 | plate_octagon/sign_rail | 210 | 0.483 |

(32 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.06 | plate_octagon/galvanised + plate_octagon/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.15, -0.06 | plate_octagon/galvanised + plate_octagon/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.15, -0.06 | plate_octagon/galvanised + plate_octagon/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.15, -0.06 | plate_octagon/galvanised + plate_octagon/bolt_steel | 0.07 | 34 | 23.1 |
| -0.10, -0.17, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 1.03 | 12 | 22.5 |
| -0.04, 0.13, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 1.03 | 12 | 22.5 |
| -0.24, 0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 1.03 | 6 | 22.5 |
| -0.24, -0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 1.03 | 6 | 22.5 |

## backtoback (info, 28)

| at | parts | area |
|---|---|---|
| -0.09, -0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0007 |
| -0.10, -0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00141 |
| -0.03, 0.16, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00282 |
| -0.03, 0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00352 |
| 0.21, 0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00178 |
| 0.21, 0.13, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00008 |
| 0.18, -0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0035 |
| 0.16, -0.16, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00048 |
| 0.15, 0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00171 |
| 0.16, 0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0004 |
| 0.03, -0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00352 |
| 0.03, -0.16, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00282 |
| 0.10, 0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00141 |
| 0.09, 0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0007 |
| -0.21, -0.13, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00008 |
| -0.21, -0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00178 |
| -0.16, 0.16, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00048 |
| -0.18, 0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0035 |
| -0.16, -0.14, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.0004 |
| -0.15, -0.15, -0.02 | plate_octagon/sign_back + plate_octagon/sign_rail | 0.00171 |
| 0.03, 0.16, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.0034 |
| -0.16, 0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.00481 |
| 0.16, 0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.00481 |
| -0.03, 0.14, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.0034 |
| 0.03, -0.14, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.0034 |
| -0.16, -0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.00481 |
| 0.16, -0.15, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.00481 |
| -0.03, -0.16, -0.04 | plate_octagon/sign_rail + plate_octagon/sign_rail | 0.0034 |


Nodes: plate_octagon. Distances: {"plate_octagon":320}. Quantum 0.000 mm. Offset 0,0,0.
