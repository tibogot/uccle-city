# Mesh audit: chute lod1

516 triangles, 267 welded vertices, 0 open edges, 0 rays, 20 ms.

**0 blocking**, 16 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| seam | info | 4 |
| backtoback | info | 56 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| -0.80, 0.00, 0.27 | chute.lod1 | 281 | 1.592 |
| -0.80, 0.01, -0.27 | chute.lod1 | 281 | 1.592 |
| 0.27, 0.01, -0.80 | chute.lod1 | 281 | 1.592 |
| -0.27, 0.00, -0.80 | chute.lod1 | 281 | 1.592 |
| 0.80, 0.01, 0.27 | chute.lod1 | 281 | 1.592 |
| 0.80, 0.00, -0.27 | chute.lod1 | 281 | 1.592 |
| 0.27, 0.00, 0.80 | chute.lod1 | 281 | 1.592 |
| -0.27, 0.01, 0.80 | chute.lod1 | 281 | 1.592 |
| -0.76, 0.01, 0.25 | chute.lod1 | 357 | 1.514 |
| -0.76, 0.01, -0.25 | chute.lod1 | 357 | 1.514 |
| 0.25, 0.01, -0.76 | chute.lod1 | 357 | 1.514 |
| -0.25, 0.01, -0.76 | chute.lod1 | 357 | 1.514 |
| 0.76, 0.01, 0.25 | chute.lod1 | 357 | 1.514 |
| 0.76, 0.01, -0.25 | chute.lod1 | 357 | 1.514 |
| 0.25, 0.01, 0.76 | chute.lod1 | 357 | 1.514 |
| -0.25, 0.01, 0.76 | chute.lod1 | 357 | 1.514 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.10, 0.88, 0.28 | chute.lod1 + chute.lod1 | 0.6 | 44 | 22.5 |
| 0.26, 1.10, 0.06 | chute.lod1 + chute.lod1 | 1.69 | 29 | 37.4 |
| -0.76, 0.01, 0.04 | chute.lod1 + chute.lod1 | 6.07 | 18 | 90 |
| -0.25, 0.01, -0.03 | chute.lod1 + chute.lod1 | 1.68 | 17 | 32 |

## backtoback (info, 56)

| at | parts | area |
|---|---|---|
| -0.20, 0.01, -0.17 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.20, 0.01, -0.17 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.11, 0.01, -0.08 | chute.lod1 + chute.lod1 | 0.00488 |
| 0.02, 0.01, 0.07 | chute.lod1 + chute.lod1 | 0.02734 |
| -0.01, 0.01, 0.12 | chute.lod1 + chute.lod1 | 0.01698 |
| -0.08, 0.01, 0.13 | chute.lod1 + chute.lod1 | 0.02766 |
| -0.19, 0.01, 0.07 | chute.lod1 + chute.lod1 | 0.02213 |
| -0.19, 0.01, -0.16 | chute.lod1 + chute.lod1 | 0.00109 |
| -0.17, 0.01, -0.14 | chute.lod1 + chute.lod1 | 0.00177 |
| -0.15, 0.01, -0.12 | chute.lod1 + chute.lod1 | 0.00105 |
| -0.17, 0.01, 0.20 | chute.lod1 + chute.lod1 | 0.00188 |
| -0.19, 0.01, 0.15 | chute.lod1 + chute.lod1 | 0.00364 |
| 0.17, 0.01, 0.20 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.17, 0.01, -0.20 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.14, 0.01, -0.21 | chute.lod1 + chute.lod1 | 0.00156 |
| 0.04, 0.01, -0.25 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.10, 0.01, 0.01 | chute.lod1 + chute.lod1 | 0.03157 |
| 0.14, 0.01, 0.11 | chute.lod1 + chute.lod1 | 0.00911 |
| -0.07, 0.01, -0.21 | chute.lod1 + chute.lod1 | 0.01401 |
| 0.03, 0.01, -0.14 | chute.lod1 + chute.lod1 | 0.03468 |
| 0.08, 0.01, -0.07 | chute.lod1 + chute.lod1 | 0.01594 |
| 0.21, 0.01, -0.15 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.20, 0.01, 0.17 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.24, 1.10, 0.12 | chute.lod1 + chute.lod1 | 0.00031 |
| -0.22, 1.10, 0.15 | chute.lod1 + chute.lod1 | 0.00031 |
| -0.09, 1.10, -0.25 | chute.lod1 + chute.lod1 | 0.00064 |
| 0.15, 1.10, -0.22 | chute.lod1 + chute.lod1 | 0.00031 |
| 0.10, 1.10, -0.24 | chute.lod1 + chute.lod1 | 0.00031 |
| 0.24, 1.10, 0.09 | chute.lod1 + chute.lod1 | 0.00148 |
| 0.26, 1.10, 0.03 | chute.lod1 + chute.lod1 | 0.0004 |
| -0.02, 1.10, 0.27 | chute.lod1 + chute.lod1 | 0.00032 |
| 0.02, 1.10, 0.27 | chute.lod1 + chute.lod1 | 0.00028 |
| -0.08, 1.10, 0.11 | chute.lod1 + chute.lod1 | 0.00943 |
| -0.25, 1.10, 0.03 | chute.lod1 + chute.lod1 | 0.00249 |
| -0.22, 1.10, 0.12 | chute.lod1 + chute.lod1 | 0.00235 |
| -0.15, 1.10, -0.06 | chute.lod1 + chute.lod1 | 0.00941 |
| -0.07, 1.10, -0.07 | chute.lod1 + chute.lod1 | 0.01822 |
| 0.20, 1.10, 0.14 | chute.lod1 + chute.lod1 | 0.00329 |
| 0.13, 1.10, 0.04 | chute.lod1 + chute.lod1 | 0.02248 |
| 0.12, 1.10, 0.21 | chute.lod1 + chute.lod1 | 0.00453 |

(16 more in the JSON)
