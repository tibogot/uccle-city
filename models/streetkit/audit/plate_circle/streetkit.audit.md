# Mesh audit: streetkit plate_circle

1,252 triangles, 648 welded vertices, 0 open edges, 0 rays, 104 ms.

**0 blocking**, 72 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 72 |
| seam | info | 8 |
| backtoback | info | 25 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 72)

| at | part | aspect | longest |
|---|---|---|---|
| -0.08, 0.13, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.13, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.13, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.13, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.13, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.13, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.13, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.13, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.17, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.17, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.17, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, 0.17, -0.02 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.12, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| -0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.18, -0.04 | plate_circle/sign_rail | 405 | 0.465 |
| 0.08, 0.12, -0.04 | plate_circle/sign_rail | 465 | 0.465 |
| -0.08, 0.12, -0.04 | plate_circle/sign_rail | 465 | 0.465 |
| -0.08, 0.18, -0.04 | plate_circle/sign_rail | 465 | 0.465 |
| 0.08, 0.18, -0.04 | plate_circle/sign_rail | 465 | 0.465 |
| -0.08, -0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, -0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| -0.08, -0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |
| 0.08, -0.17, -0.04 | plate_circle/sign_rail | 198 | 0.454 |

(32 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.06 | plate_circle/galvanised + plate_circle/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.15, -0.06 | plate_circle/galvanised + plate_circle/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.15, -0.06 | plate_circle/galvanised + plate_circle/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.15, -0.06 | plate_circle/galvanised + plate_circle/bolt_steel | 0.07 | 34 | 23.1 |
| -0.16, -0.17, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.98 | 14 | 22.5 |
| -0.20, 0.13, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.98 | 12 | 22.5 |
| -0.23, 0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.98 | 6 | 22.5 |
| -0.23, -0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.98 | 6 | 22.5 |

## backtoback (info, 25)

| at | parts | area |
|---|---|---|
| -0.18, -0.14, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00033 |
| -0.17, -0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00242 |
| -0.19, 0.17, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.0001 |
| -0.20, 0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00153 |
| 0.22, -0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00025 |
| -0.22, -0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00048 |
| -0.22, 0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00025 |
| 0.12, 0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00558 |
| 0.11, 0.14, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00111 |
| 0.17, -0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00316 |
| 0.17, -0.17, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00038 |
| -0.06, 0.16, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00174 |
| -0.03, 0.14, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00319 |
| -0.01, -0.14, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00397 |
| -0.00, -0.16, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00441 |
| -0.15, 0.16, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00028 |
| -0.14, 0.15, -0.02 | plate_circle/sign_back + plate_circle/sign_rail | 0.00162 |
| 0.03, 0.16, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00319 |
| -0.15, 0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00452 |
| 0.15, 0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00452 |
| -0.03, 0.14, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00319 |
| 0.03, -0.14, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00319 |
| -0.15, -0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00452 |
| 0.15, -0.15, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00452 |
| -0.03, -0.16, -0.04 | plate_circle/sign_rail + plate_circle/sign_rail | 0.00319 |


Nodes: plate_circle. Distances: {"plate_circle":320}. Quantum 0.000 mm. Offset 0,0,0.
