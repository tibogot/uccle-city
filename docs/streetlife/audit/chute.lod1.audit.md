# Mesh audit: chute lod1

480 triangles, 247 welded vertices, 0 open edges, 0 rays, 15 ms.

**0 blocking**, 24 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 24 |
| seam | info | 3 |
| backtoback | info | 59 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 24)

| at | part | aspect | longest |
|---|---|---|---|
| -0.80, 0.01, 0.27 | chute.lod1 | 145 | 1.591 |
| -0.80, 0.01, -0.27 | chute.lod1 | 145 | 1.591 |
| -0.27, 0.01, -0.80 | chute.lod1 | 145 | 1.591 |
| 0.27, 0.01, -0.80 | chute.lod1 | 145 | 1.591 |
| 0.80, 0.01, -0.27 | chute.lod1 | 145 | 1.591 |
| 0.80, 0.01, 0.27 | chute.lod1 | 145 | 1.591 |
| 0.27, 0.01, 0.80 | chute.lod1 | 145 | 1.591 |
| -0.27, 0.01, 0.80 | chute.lod1 | 145 | 1.591 |
| -0.80, 0.00, 0.27 | chute.lod1 | 250 | 1.591 |
| -0.80, 0.00, -0.27 | chute.lod1 | 250 | 1.591 |
| 0.27, 0.00, -0.80 | chute.lod1 | 250 | 1.591 |
| -0.27, 0.00, -0.80 | chute.lod1 | 250 | 1.591 |
| -0.80, 0.02, 0.27 | chute.lod1 | 250 | 1.591 |
| -0.80, 0.02, -0.27 | chute.lod1 | 250 | 1.591 |
| 0.27, 0.00, 0.80 | chute.lod1 | 250 | 1.591 |
| -0.27, 0.00, 0.80 | chute.lod1 | 250 | 1.591 |
| 0.80, 0.00, 0.27 | chute.lod1 | 250 | 1.591 |
| 0.80, 0.00, -0.27 | chute.lod1 | 250 | 1.591 |
| 0.27, 0.02, -0.80 | chute.lod1 | 250 | 1.591 |
| -0.27, 0.02, -0.80 | chute.lod1 | 250 | 1.591 |
| 0.80, 0.02, 0.27 | chute.lod1 | 250 | 1.591 |
| 0.80, 0.02, -0.27 | chute.lod1 | 250 | 1.591 |
| 0.27, 0.02, 0.80 | chute.lod1 | 250 | 1.591 |
| -0.27, 0.02, 0.80 | chute.lod1 | 250 | 1.591 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.09, 0.88, 0.28 | chute.lod1 + chute.lod1 | 0.61 | 43 | 22.5 |
| 0.26, 1.10, 0.03 | chute.lod1 + chute.lod1 | 1.69 | 30 | 37.4 |
| -0.25, 0.02, -0.07 | chute.lod1 + chute.lod1 | 1.68 | 19 | 37.4 |

## backtoback (info, 59)

| at | parts | area |
|---|---|---|
| 0.06, 0.02, 0.17 | chute.lod1 + chute.lod1 | 0.01132 |
| -0.19, 0.02, 0.04 | chute.lod1 + chute.lod1 | 0.01823 |
| -0.15, 0.02, -0.04 | chute.lod1 + chute.lod1 | 0.02448 |
| -0.05, 0.02, 0.06 | chute.lod1 + chute.lod1 | 0.0243 |
| 0.02, 0.02, 0.13 | chute.lod1 + chute.lod1 | 0.01132 |
| 0.12, 0.02, 0.20 | chute.lod1 + chute.lod1 | 0.00446 |
| 0.09, 0.02, 0.23 | chute.lod1 + chute.lod1 | 0.00364 |
| -0.17, 0.02, 0.20 | chute.lod1 + chute.lod1 | 0.00188 |
| -0.19, 0.02, 0.15 | chute.lod1 + chute.lod1 | 0.00364 |
| -0.20, 0.02, 0.11 | chute.lod1 + chute.lod1 | 0.00579 |
| 0.04, 0.02, 0.25 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.00, 0.02, 0.26 | chute.lod1 + chute.lod1 | 0.00064 |
| 0.19, 0.02, 0.08 | chute.lod1 + chute.lod1 | 0.01809 |
| -0.02, 0.02, -0.26 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.02, 0.02, -0.24 | chute.lod1 + chute.lod1 | 0.00364 |
| -0.15, 0.02, -0.18 | chute.lod1 + chute.lod1 | 0.00318 |
| -0.02, 0.02, -0.14 | chute.lod1 + chute.lod1 | 0.04247 |
| 0.13, 0.02, -0.04 | chute.lod1 + chute.lod1 | 0.03658 |
| 0.20, 0.02, 0.17 | chute.lod1 + chute.lod1 | 0.00133 |
| 0.21, 0.02, -0.15 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.25, 0.02, 0.04 | chute.lod1 + chute.lod1 | 0.00188 |
| 0.19, 1.10, 0.19 | chute.lod1 + chute.lod1 | 0.00006 |
| 0.15, 1.10, 0.20 | chute.lod1 + chute.lod1 | 0.00182 |
| -0.12, 1.10, -0.24 | chute.lod1 + chute.lod1 | 0.00064 |
| 0.19, 1.10, -0.19 | chute.lod1 + chute.lod1 | 0.00064 |
| 0.24, 1.10, -0.04 | chute.lod1 + chute.lod1 | 0.00331 |
| 0.24, 1.10, 0.09 | chute.lod1 + chute.lod1 | 0.00033 |
| 0.26, 1.10, 0.02 | chute.lod1 + chute.lod1 | 0.00156 |
| 0.24, 1.10, 0.09 | chute.lod1 + chute.lod1 | 0.00032 |
| -0.07, 1.10, 0.26 | chute.lod1 + chute.lod1 | 0.00008 |
| -0.07, 1.10, 0.26 | chute.lod1 + chute.lod1 | 0.00056 |
| -0.13, 1.10, -0.22 | chute.lod1 + chute.lod1 | 0.00124 |
| -0.05, 1.10, -0.26 | chute.lod1 + chute.lod1 | 0.00064 |
| -0.10, 1.10, -0.21 | chute.lod1 + chute.lod1 | 0.0024 |
| 0.00, 1.10, -0.24 | chute.lod1 + chute.lod1 | 0.00538 |
| 0.09, 1.10, -0.24 | chute.lod1 + chute.lod1 | 0.00101 |
| 0.21, 1.10, -0.04 | chute.lod1 + chute.lod1 | 0.00728 |
| 0.15, 1.10, 0.15 | chute.lod1 + chute.lod1 | 0.01485 |
| 0.01, 1.10, 0.11 | chute.lod1 + chute.lod1 | 0.00943 |
| -0.03, 1.10, 0.10 | chute.lod1 + chute.lod1 | 0.01823 |

(19 more in the JSON)
