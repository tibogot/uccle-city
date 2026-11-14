# Mesh audit: streetkit plate_rect

1,108 triangles, 576 welded vertices, 0 open edges, 0 rays, 40 ms.

**0 blocking**, 84 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 84 |
| seam | info | 8 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 84)

| at | part | aspect | longest |
|---|---|---|---|
| 0.30, -0.14, -0.00 | plate_rect/sign_back | 235 | 0.83 |
| 0.30, 0.14, -0.00 | plate_rect/sign_back | 235 | 0.83 |
| 0.09, 0.45, -0.00 | plate_rect/sign_back | 150 | 0.53 |
| -0.09, 0.45, -0.00 | plate_rect/sign_back | 150 | 0.53 |
| -0.30, 0.14, -0.00 | plate_rect/sign_back | 235 | 0.83 |
| -0.30, -0.14, -0.00 | plate_rect/sign_back | 235 | 0.83 |
| -0.09, -0.45, -0.00 | plate_rect/sign_back | 150 | 0.53 |
| 0.09, -0.45, -0.00 | plate_rect/sign_back | 150 | 0.53 |
| 0.30, -0.14, -0.01 | plate_rect/sign_back | 47 | 0.83 |
| 0.30, 0.14, -0.01 | plate_rect/sign_back | 47 | 0.83 |
| -0.30, 0.14, -0.01 | plate_rect/sign_back | 47 | 0.83 |
| -0.30, -0.14, -0.01 | plate_rect/sign_back | 47 | 0.83 |
| -0.09, 0.25, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.25, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.25, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.25, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.29, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.29, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.29, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.29, -0.04 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.25, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.25, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.25, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.25, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.29, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.29, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.29, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| 0.09, 0.29, -0.02 | plate_rect/sign_rail | 224 | 0.514 |
| -0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| -0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.30, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| -0.09, 0.30, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.30, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| -0.09, 0.30, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| -0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| 0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |
| -0.09, 0.24, -0.04 | plate_rect/sign_rail | 457 | 0.525 |

(44 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.27, -0.06 | plate_rect/galvanised + plate_rect/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.27, -0.06 | plate_rect/galvanised + plate_rect/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.27, -0.06 | plate_rect/galvanised + plate_rect/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.27, -0.06 | plate_rect/galvanised + plate_rect/bolt_steel | 0.07 | 34 | 23.1 |
| -0.26, -0.27, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 1.1 | 6 | 22.5 |
| -0.26, 0.27, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 1.1 | 6 | 22.5 |
| -0.26, 0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 1.1 | 6 | 22.5 |
| -0.26, -0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 1.1 | 6 | 22.5 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| 0.04, -0.26, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00672 |
| -0.03, -0.28, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00865 |
| -0.22, 0.29, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00009 |
| -0.23, 0.27, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00202 |
| 0.23, -0.27, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00202 |
| 0.22, -0.29, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00009 |
| 0.03, 0.28, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00865 |
| -0.04, 0.26, -0.02 | plate_rect/sign_back + plate_rect/sign_rail | 0.00672 |
| 0.03, 0.28, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00362 |
| -0.17, 0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00512 |
| 0.17, 0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00512 |
| -0.03, 0.26, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00362 |
| 0.03, -0.26, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00362 |
| -0.17, -0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00512 |
| 0.17, -0.27, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00512 |
| -0.03, -0.28, -0.04 | plate_rect/sign_rail + plate_rect/sign_rail | 0.00362 |


Nodes: plate_rect. Distances: {"plate_rect":320}. Quantum 0.000 mm. Offset 0,0,0.
