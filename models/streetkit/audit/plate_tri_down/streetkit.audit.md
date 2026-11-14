# Mesh audit: streetkit plate_tri_down

1,090 triangles, 567 welded vertices, 0 open edges, 0 rays, 101 ms.

**0 blocking**, 42 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 42 |
| seam | info | 8 |
| backtoback | info | 17 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 42)

| at | part | aspect | longest |
|---|---|---|---|
| -0.22, 0.08, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| -0.13, -0.08, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| 0.13, -0.08, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| 0.22, 0.08, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| 0.09, 0.30, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| -0.09, 0.30, -0.00 | plate_tri_down/sign_back | 159 | 0.561 |
| -0.07, 0.10, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.10, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.10, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.10, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.14, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.14, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.14, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.14, -0.04 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.10, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.10, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.10, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.10, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.14, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.14, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.14, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| 0.07, 0.14, -0.02 | plate_tri_down/sign_rail | 184 | 0.423 |
| -0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| -0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.15, -0.04 | plate_tri_down/sign_rail | 378 | 0.434 |
| 0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 434 | 0.434 |
| -0.07, 0.09, -0.04 | plate_tri_down/sign_rail | 434 | 0.434 |

(2 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.12, -0.06 | plate_tri_down/galvanised + plate_tri_down/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, 0.12, -0.06 | plate_tri_down/galvanised + plate_tri_down/bolt_steel | 0.07 | 34 | 23.1 |
| -0.05, -0.04, -0.06 | plate_tri_down/galvanised + plate_tri_down/bolt_steel | 0.07 | 34 | 23.1 |
| 0.05, -0.04, -0.06 | plate_tri_down/galvanised + plate_tri_down/bolt_steel | 0.07 | 34 | 23.1 |
| -0.12, -0.03, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.54 | 10 | 22.5 |
| -0.21, 0.12, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.91 | 8 | 22.5 |
| -0.21, 0.12, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.91 | 6 | 22.5 |
| -0.12, -0.04, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.54 | 6 | 22.5 |

## backtoback (info, 17)

| at | parts | area |
|---|---|---|
| -0.10, -0.02, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00005 |
| -0.10, -0.04, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00091 |
| -0.19, 0.12, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.0012 |
| 0.04, -0.04, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00399 |
| 0.02, -0.05, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00286 |
| 0.01, 0.13, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00673 |
| 0.01, 0.11, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00596 |
| 0.20, 0.12, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00043 |
| -0.11, -0.05, -0.02 | plate_tri_down/sign_back + plate_tri_down/sign_rail | 0.00027 |
| 0.02, 0.13, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00298 |
| -0.14, 0.12, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00421 |
| 0.14, 0.12, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00421 |
| -0.02, 0.11, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00298 |
| 0.01, -0.03, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00169 |
| -0.08, -0.04, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00235 |
| 0.08, -0.04, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00235 |
| -0.01, -0.05, -0.04 | plate_tri_down/sign_rail + plate_tri_down/sign_rail | 0.00169 |


Nodes: plate_tri_down. Distances: {"plate_tri_down":320}. Quantum 0.000 mm. Offset 0,0,0.
