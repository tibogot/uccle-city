# Mesh audit: streetkit villo_totem

2,713 triangles, 1,462 welded vertices, 121 open edges, 3,712 rays, 267 ms.

**0 blocking**, 296 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 296 |
| seam | info | 21 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 296)

| at | part | aspect | longest |
|---|---|---|---|
| -0.18, 0.65, 0.15 | villo_totem/villo_body | 767 | 2.3 |
| -0.18, 1.41, 0.15 | villo_totem/villo_body | 767 | 2.3 |
| 0.18, 0.65, 0.15 | villo_totem/villo_body | 767 | 2.3 |
| 0.18, 1.41, 0.15 | villo_totem/villo_body | 767 | 2.3 |
| 0.19, 0.65, 0.15 | villo_totem/villo_body | 147 | 2.3 |
| 0.18, 1.41, 0.15 | villo_totem/villo_body | 147 | 2.3 |
| 0.20, 0.65, 0.14 | villo_totem/villo_body | 147 | 2.3 |
| 0.20, 1.41, 0.15 | villo_totem/villo_body | 147 | 2.3 |
| 0.22, 0.65, 0.14 | villo_totem/villo_body | 147 | 2.3 |
| 0.21, 1.41, 0.14 | villo_totem/villo_body | 147 | 2.3 |
| 0.23, 0.65, 0.12 | villo_totem/villo_body | 147 | 2.3 |
| 0.23, 1.41, 0.13 | villo_totem/villo_body | 147 | 2.3 |
| 0.24, 0.65, 0.11 | villo_totem/villo_body | 147 | 2.3 |
| 0.23, 1.41, 0.12 | villo_totem/villo_body | 147 | 2.3 |
| 0.24, 0.65, 0.10 | villo_totem/villo_body | 147 | 2.3 |
| 0.24, 1.41, 0.10 | villo_totem/villo_body | 147 | 2.3 |
| 0.24, 0.65, 0.08 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.09 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.07 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.07 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.06 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.06 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.05 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.05 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.03 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.04 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.02 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.03 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, 0.01 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.01 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, -0.00 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, 0.00 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, -0.01 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, -0.01 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, -0.03 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, -0.02 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, -0.04 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, -0.03 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 0.65, -0.05 | villo_totem/villo_body | 182 | 2.3 |
| 0.24, 1.41, -0.05 | villo_totem/villo_body | 182 | 2.3 |

(256 more in the JSON)

## seam (info, 21)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.18, 2.15, 0.15 | villo_totem/villo_body + villo_totem/villo_head | 1.5 | 266 | 28.8 |
| -0.18, 0.33, 0.15 | villo_totem/villo_body + villo_totem/villo_body | 0.99 | 62 | 82.9 |
| 0.02, 1.16, 0.19 | villo_totem/villo_body + villo_totem/villo_screen | 0.39 | 28 | 67.5 |
| 0.07, 1.11, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 28 | 67.5 |
| 0.10, 1.07, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 28 | 67.5 |
| 0.09, 1.09, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 28 | 67.5 |
| 0.12, 1.03, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 28 | 67.5 |
| 0.09, 1.10, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.11, 1.05, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.11, 1.07, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.11, 1.10, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.07, 1.03, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.07, 1.05, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.07, 1.07, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.09, 1.03, 0.17 | villo_totem/villo_body + villo_totem/villo_dark | 0.11 | 24 | 67.5 |
| 0.01, 2.31, -0.15 | villo_totem/villo_body + villo_totem/villo_head | 1.66 | 6 | 22.5 |
| -0.04, 1.18, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.36 | 6 | 22.5 |
| -0.13, 0.53, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 1.21 | 6 | 22.5 |
| -0.01, 0.92, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.27 | 6 | 22.5 |
| 0.09, 1.37, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.82 | 6 | 22.5 |
| 0.07, 1.07, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.3 | 4 | 22.5 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| 0.00, 2.31, -0.10 | villo_totem/villo_body + villo_totem/villo_head | 0.03937 |
| 0.19, 2.31, 0.04 | villo_totem/villo_body + villo_totem/villo_head | 0.04153 |
| -0.19, 2.31, -0.04 | villo_totem/villo_body + villo_totem/villo_head | 0.04128 |
| -0.01, 2.31, 0.11 | villo_totem/villo_body + villo_totem/villo_head | 0.03912 |
| 0.03, 1.22, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.00013 |
| -0.01, 1.20, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.00387 |
| 0.03, 1.18, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.00233 |
| -0.01, 1.16, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.00167 |
| 0.09, 1.08, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.0027 |
| 0.10, 1.05, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.0027 |
| -0.05, 0.65, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.04164 |
| -0.11, 0.73, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.00276 |
| 0.04, 0.54, 0.15 | villo_totem/villo_body + villo_totem/villo_dark | 0.0444 |
| -0.02, 0.94, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.00046 |
| -0.01, 0.93, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.00097 |
| 0.10, 1.46, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.00452 |
| -0.07, 0.93, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.00062 |
| -0.06, 0.93, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.00011 |
| -0.00, 1.51, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.02061 |
| 0.02, 1.43, 0.15 | villo_totem/villo_dark + villo_totem/villo_dark | 0.01609 |


Nodes: villo_totem. Distances: {"villo_totem":320}. Quantum 0.000 mm. Offset 0,0,0.
