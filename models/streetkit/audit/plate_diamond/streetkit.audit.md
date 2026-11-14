# Mesh audit: streetkit plate_diamond

1,084 triangles, 564 welded vertices, 0 open edges, 0 rays, 112 ms.

**0 blocking**, 80 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 80 |
| seam | info | 8 |
| backtoback | info | 18 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 80)

| at | part | aspect | longest |
|---|---|---|---|
| 0.23, 0.12, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| 0.12, 0.23, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| -0.12, 0.23, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| -0.23, 0.12, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| -0.23, -0.12, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| -0.12, -0.23, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| 0.12, -0.23, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| 0.23, -0.12, -0.00 | plate_diamond/sign_back | 130 | 0.46 |
| -0.07, 0.09, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.09, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.09, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.09, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.13, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.13, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.13, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.13, -0.04 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.09, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.09, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.09, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.09, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.13, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.13, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.13, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| 0.07, 0.13, -0.02 | plate_diamond/sign_rail | 183 | 0.421 |
| -0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.08, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| -0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |
| 0.07, 0.14, -0.04 | plate_diamond/sign_rail | 376 | 0.432 |

(40 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.11, -0.06 | plate_diamond/galvanised + plate_diamond/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.11, -0.06 | plate_diamond/galvanised + plate_diamond/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.11, -0.06 | plate_diamond/galvanised + plate_diamond/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.11, -0.06 | plate_diamond/galvanised + plate_diamond/bolt_steel | 0.07 | 34 | 23.1 |
| 0.20, -0.13, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.91 | 10 | 22.5 |
| -0.21, 0.10, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.91 | 10 | 22.5 |
| -0.21, 0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.91 | 6 | 22.5 |
| -0.21, -0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.91 | 6 | 22.5 |

## backtoback (info, 18)

| at | parts | area |
|---|---|---|
| 0.21, -0.12, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00007 |
| -0.07, -0.10, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00172 |
| -0.11, -0.11, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00528 |
| -0.10, 0.12, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00187 |
| -0.12, 0.11, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00537 |
| -0.21, 0.12, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00007 |
| 0.12, -0.11, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00537 |
| 0.10, -0.12, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00187 |
| 0.11, 0.11, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00528 |
| 0.07, 0.10, -0.02 | plate_diamond/sign_back + plate_diamond/sign_rail | 0.00172 |
| 0.02, 0.12, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00297 |
| -0.14, 0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00419 |
| 0.14, 0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00419 |
| -0.02, 0.10, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00297 |
| 0.02, -0.10, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00297 |
| -0.14, -0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00419 |
| 0.14, -0.11, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00419 |
| -0.02, -0.12, -0.04 | plate_diamond/sign_rail + plate_diamond/sign_rail | 0.00297 |


Nodes: plate_diamond. Distances: {"plate_diamond":320}. Quantum 0.000 mm. Offset 0,0,0.
