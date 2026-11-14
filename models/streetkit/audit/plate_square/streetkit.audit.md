# Mesh audit: streetkit plate_square

1,108 triangles, 576 welded vertices, 0 open edges, 0 rays, 41 ms.

**0 blocking**, 80 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 80 |
| seam | info | 8 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 80)

| at | part | aspect | longest |
|---|---|---|---|
| 0.30, -0.09, -0.00 | plate_square/sign_back | 150 | 0.53 |
| 0.30, 0.09, -0.00 | plate_square/sign_back | 150 | 0.53 |
| 0.09, 0.30, -0.00 | plate_square/sign_back | 150 | 0.53 |
| -0.09, 0.30, -0.00 | plate_square/sign_back | 150 | 0.53 |
| -0.30, 0.09, -0.00 | plate_square/sign_back | 150 | 0.53 |
| -0.30, -0.09, -0.00 | plate_square/sign_back | 150 | 0.53 |
| -0.09, -0.30, -0.00 | plate_square/sign_back | 150 | 0.53 |
| 0.09, -0.30, -0.00 | plate_square/sign_back | 150 | 0.53 |
| -0.09, 0.13, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.13, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.13, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.13, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.17, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.17, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.17, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.17, -0.04 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.13, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.13, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.13, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.13, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.17, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.17, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.17, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| 0.09, 0.17, -0.02 | plate_square/sign_rail | 224 | 0.514 |
| -0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.12, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| -0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |
| 0.09, 0.18, -0.04 | plate_square/sign_rail | 457 | 0.525 |

(40 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.06 | plate_square/galvanised + plate_square/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.15, -0.06 | plate_square/galvanised + plate_square/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.15, -0.06 | plate_square/galvanised + plate_square/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.15, -0.06 | plate_square/galvanised + plate_square/bolt_steel | 0.07 | 34 | 23.1 |
| -0.21, 0.13, -0.02 | plate_square/sign_back + plate_square/sign_rail | 1.1 | 8 | 22.5 |
| -0.26, -0.15, -0.02 | plate_square/sign_back + plate_square/sign_rail | 1.1 | 8 | 22.5 |
| -0.26, 0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 1.1 | 6 | 22.5 |
| -0.26, -0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 1.1 | 6 | 22.5 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| -0.22, 0.17, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00011 |
| -0.22, 0.15, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00234 |
| -0.01, -0.14, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00446 |
| -0.07, -0.16, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00818 |
| 0.21, -0.15, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.0028 |
| 0.21, -0.17, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00017 |
| 0.04, 0.16, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00857 |
| -0.03, 0.14, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00594 |
| -0.19, 0.17, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00006 |
| -0.17, 0.15, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00046 |
| 0.14, -0.15, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00148 |
| 0.16, -0.16, -0.02 | plate_square/sign_back + plate_square/sign_rail | 0.00039 |
| 0.03, 0.16, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00362 |
| -0.17, 0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00512 |
| 0.17, 0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00512 |
| -0.03, 0.14, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00362 |
| 0.03, -0.14, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00362 |
| -0.17, -0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00512 |
| 0.17, -0.15, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00512 |
| -0.03, -0.16, -0.04 | plate_square/sign_rail + plate_square/sign_rail | 0.00362 |


Nodes: plate_square. Distances: {"plate_square":320}. Quantum 0.000 mm. Offset 0,0,0.
