# Mesh audit: chute lod0

1,112 triangles, 565 welded vertices, 0 open edges, 0 rays, 72 ms.

**0 blocking**, 16 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| seam | info | 4 |
| backtoback | info | 408 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| -0.80, 0.00, 0.27 | chute.lod0 | 281 | 1.592 |
| -0.80, 0.01, -0.27 | chute.lod0 | 281 | 1.592 |
| 0.27, 0.01, -0.80 | chute.lod0 | 281 | 1.592 |
| -0.27, 0.00, -0.80 | chute.lod0 | 281 | 1.592 |
| 0.80, 0.01, 0.27 | chute.lod0 | 281 | 1.592 |
| 0.80, 0.00, -0.27 | chute.lod0 | 281 | 1.592 |
| 0.27, 0.00, 0.80 | chute.lod0 | 281 | 1.592 |
| -0.27, 0.01, 0.80 | chute.lod0 | 281 | 1.592 |
| -0.76, 0.01, 0.25 | chute.lod0 | 357 | 1.514 |
| -0.76, 0.01, -0.25 | chute.lod0 | 357 | 1.514 |
| 0.25, 0.01, -0.76 | chute.lod0 | 357 | 1.514 |
| -0.25, 0.01, -0.76 | chute.lod0 | 357 | 1.514 |
| 0.76, 0.01, 0.25 | chute.lod0 | 357 | 1.514 |
| 0.76, 0.01, -0.25 | chute.lod0 | 357 | 1.514 |
| 0.25, 0.01, 0.76 | chute.lod0 | 357 | 1.514 |
| -0.25, 0.01, 0.76 | chute.lod0 | 357 | 1.514 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.09, 0.88, 0.28 | chute.lod0 + chute.lod0 | 0.61 | 50 | 22.5 |
| 0.27, 1.10, 0.03 | chute.lod0 + chute.lod0 | 1.69 | 48 | 45.2 |
| -0.27, 0.01, -0.04 | chute.lod0 + chute.lod0 | 1.69 | 24 | 45.2 |
| -0.76, 0.01, 0.04 | chute.lod0 + chute.lod0 | 6.07 | 18 | 90 |

## backtoback (info, 408)

| at | parts | area |
|---|---|---|
| -0.24, 0.01, -0.02 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.20, 0.01, -0.04 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.22, 0.01, -0.08 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.19, 0.01, -0.09 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.19, 0.01, -0.14 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.16, 0.01, -0.14 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.14, 0.01, -0.05 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.11, 0.01, -0.05 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.12, 0.01, -0.09 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.09, 0.01, -0.08 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.05, 0.01, -0.04 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.02, 0.01, 0.24 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.04, 0.01, 0.20 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.08, 0.01, 0.22 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.09, 0.01, 0.19 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.14, 0.01, 0.19 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.14, 0.01, 0.16 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.18, 0.01, 0.15 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.17, 0.01, 0.12 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.22, 0.01, 0.10 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.20, 0.01, 0.07 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.23, 0.01, 0.04 | chute.lod0 + chute.lod0 | 0.00321 |
| -0.21, 0.01, 0.01 | chute.lod0 + chute.lod0 | 0.00212 |
| -0.05, 0.01, 0.14 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.05, 0.01, 0.11 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.09, 0.01, 0.12 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.08, 0.01, 0.09 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.11, 0.01, 0.09 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.10, 0.01, 0.07 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.14, 0.01, 0.06 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.11, 0.01, 0.04 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.14, 0.01, 0.02 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.12, 0.01, 0.01 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.15, 0.01, -0.01 | chute.lod0 + chute.lod0 | 0.00205 |
| -0.12, 0.01, -0.02 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.04, 0.01, 0.05 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.05, 0.01, 0.04 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.05, 0.01, 0.02 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.06, 0.01, 0.01 | chute.lod0 + chute.lod0 | 0.00103 |
| -0.06, 0.01, -0.01 | chute.lod0 + chute.lod0 | 0.00103 |

(368 more in the JSON)
