# Mesh audit: furniture2.glb

2,074 triangles, 1,076 welded vertices, 0 open edges, 0 rays, 230 ms.

**0 blocking**, 299 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 3 |
| sliver | warn | 292 |
| nonmanifold | warn | 4 |
| seam | info | 31 |
| backtoback | info | 38 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.14, 0.66, 0.11 | bin_column/bin_green + bin_column/rubber_black | 3 | 1 | 0 | 60 | 0.46 | false | 0 + -1 + 0 |
| 0.01, 0.66, 0.11 | bin_column/bin_green + bin_column/rubber_black | 3 | 20.9 | 0 | 60 | 0.46 | false | 0 + -1 + 0 |
| -0.08, 0.66, 0.11 | bin_column/bin_green + bin_column/rubber_black | 3 | 9.9 | 0 | 60 | 0.46 | false | 0 + -1 + 0 |

## sliver (warn, 292)

| at | part | aspect | longest |
|---|---|---|---|
| 0.17, 0.26, -0.07 | bin_column/bin_green | 115 | 0.6 |
| 0.17, 0.46, -0.07 | bin_column/bin_green | 115 | 0.6 |
| 0.17, 0.26, -0.07 | bin_column/bin_green | 115 | 0.6 |
| 0.17, 0.46, -0.07 | bin_column/bin_green | 115 | 0.6 |
| 0.17, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.17, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.16, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.16, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.16, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.16, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| 0.15, 0.26, -0.09 | bin_column/bin_green | 115 | 0.6 |
| 0.15, 0.46, -0.09 | bin_column/bin_green | 115 | 0.6 |
| -0.15, 0.26, -0.09 | bin_column/bin_green | 115 | 0.6 |
| -0.15, 0.46, -0.09 | bin_column/bin_green | 115 | 0.6 |
| -0.16, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.16, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.16, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.16, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.26, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.46, -0.08 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.26, -0.07 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.46, -0.07 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.26, -0.07 | bin_column/bin_green | 115 | 0.6 |
| -0.17, 0.46, -0.07 | bin_column/bin_green | 115 | 0.6 |
| -0.06, 0.66, -0.08 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.66, -0.08 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.66, -0.08 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.66, -0.09 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.86, -0.08 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.86, -0.08 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.86, -0.08 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.86, -0.09 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.66, -0.06 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.66, -0.06 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.66, -0.06 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.66, -0.06 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.86, -0.06 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.86, -0.06 | bin_column/bin_green | 108 | 0.332 |
| -0.06, 0.86, -0.06 | bin_column/bin_green | 108 | 0.332 |
| 0.06, 0.86, -0.06 | bin_column/bin_green | 108 | 0.332 |

(252 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.17, 0.86, -0.07 | bin_column/bin_green | 3 |
| 0.00, 0.86, -0.08 | bin_column/bin_green | 3 |
| 0.17, 0.86, -0.07 | bin_column/bin_green | 3 |
| 0.00, 0.86, -0.06 | bin_column/bin_green | 3 |

## seam (info, 31)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.03, 0.25, -0.09 | bin_column/frame_dark + bin_column/frame_dark | 0.46 | 60 | 67.5 |
| -0.03, 0.70, -0.09 | bin_column/frame_dark + bin_column/frame_dark | 0.46 | 60 | 67.5 |
| 0.17, 0.66, -0.07 | bin_column/bin_green + bin_column/bin_green | 0.71 | 51 | 22.5 |
| 0.10, 0.06, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.12 | 50 | 90 |
| -0.15, 0.66, 0.10 | bin_column/bin_green + bin_column/bin_green | 0.1 | 37 | 67.5 |
| -0.03, 0.66, 0.13 | bin_column/bin_green + bin_column/bin_green | 0.68 | 36 | 90 |
| 0.15, 0.66, 0.10 | bin_column/bin_green + bin_column/bin_green | 0.1 | 36 | 67.5 |
| 0.15, 0.74, -0.06 | bin_column/bin_green + bin_column/galvanised | 0.13 | 33 | 81.6 |
| -0.03, -0.09, -0.09 | bin_column/bin_green + bin_column/frame_dark | 0.55 | 28 | 90 |
| 0.17, 0.66, 0.11 | bin_column/bin_green + bin_column/bin_green | 0.37 | 26 | 22.5 |
| -0.06, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.05 | 26 | 90 |
| -0.04, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.05 | 26 | 90 |
| -0.01, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.05 | 26 | 90 |
| 0.03, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.05 | 26 | 90 |
| 0.07, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.05 | 26 | 90 |
| 0.04, 0.91, -0.06 | bin_column/bin_green + bin_column/bin_green | 0.73 | 26 | 81 |
| 0.10, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.03 | 25 | 22.5 |
| -0.10, 0.11, 0.18 | bin_column/bin_green + bin_column/bin_green | 1.03 | 25 | 22.5 |
| 0.12, 0.74, -0.06 | bin_column/bin_green + bin_column/galvanised | 0.17 | 24 | 90 |
| -0.17, 0.66, 0.11 | bin_column/bin_green + bin_column/bin_green | 0.37 | 22 | 22.5 |
| -0.17, 0.66, -0.06 | bin_column/bin_green + bin_column/bin_green | 0.43 | 19 | 22.5 |
| 0.17, 0.66, -0.06 | bin_column/bin_green + bin_column/bin_green | 0.43 | 19 | 22.5 |
| -0.04, 0.25, -0.09 | bin_column/bin_green + bin_column/frame_dark | 0.26 | 18 | 22.5 |
| -0.04, 0.75, -0.09 | bin_column/bin_green + bin_column/frame_dark | 0.26 | 18 | 22.5 |
| -0.13, 0.66, -0.06 | bin_column/bin_green + bin_column/rubber_black | 0.92 | 14 | 90 |
| -0.14, 0.66, 0.10 | bin_column/bin_green + bin_column/rubber_black | 0.6 | 14 | 67.5 |
| -0.14, 0.68, 0.11 | bin_column/bin_green + bin_column/rubber_black | 0.57 | 10 | 90 |
| 0.14, 0.66, -0.02 | bin_column/bin_green + bin_column/rubber_black | 0.34 | 7 | 22.5 |
| -0.14, 0.67, -0.05 | bin_column/bin_green + bin_column/rubber_black | 0.34 | 7 | 22.5 |
| -0.14, 0.67, 0.11 | bin_column/rubber_black + bin_column/rubber_black | 0.57 | 6 | 90 |
| -0.09, 0.66, -0.06 | bin_column/bin_green + bin_column/rubber_black | 0.59 | 5 | 22.5 |

## backtoback (info, 38)

| at | parts | area |
|---|---|---|
| 0.12, 0.06, 0.17 | bin_column/bin_green + bin_column/bin_green | 0.00005 |
| 0.13, 0.06, 0.16 | bin_column/bin_green + bin_column/bin_green | 0.00032 |
| 0.11, 0.06, 0.17 | bin_column/bin_green + bin_column/bin_green | 0.00011 |
| 0.09, 0.06, 0.18 | bin_column/bin_green + bin_column/bin_green | 0.00005 |
| -0.07, 0.06, 0.06 | bin_column/bin_green + bin_column/bin_green | 0.0212 |
| 0.02, 0.06, 0.11 | bin_column/bin_green + bin_column/bin_green | 0.0004 |
| -0.10, 0.06, 0.17 | bin_column/bin_green + bin_column/bin_green | 0.00017 |
| -0.11, 0.06, 0.18 | bin_column/bin_green + bin_column/bin_green | 0.00006 |
| -0.12, 0.06, 0.16 | bin_column/bin_green + bin_column/bin_green | 0.0004 |
| -0.12, 0.06, 0.17 | bin_column/bin_green + bin_column/bin_green | 0.00007 |
| -0.15, 0.06, 0.14 | bin_column/bin_green + bin_column/bin_green | 0.00005 |
| -0.13, 0.06, 0.14 | bin_column/bin_green + bin_column/bin_green | 0.00068 |
| -0.15, 0.06, 0.13 | bin_column/bin_green + bin_column/bin_green | 0.00023 |
| -0.16, 0.06, -0.02 | bin_column/bin_green + bin_column/bin_green | 0.00097 |
| -0.17, 0.06, -0.04 | bin_column/bin_green + bin_column/bin_green | 0.00062 |
| -0.01, 0.06, -0.01 | bin_column/bin_green + bin_column/bin_green | 0.04048 |
| 0.14, 0.06, 0.07 | bin_column/bin_green + bin_column/bin_green | 0.0078 |
| 0.12, 0.06, 0.05 | bin_column/bin_green + bin_column/bin_green | 0.0012 |
| 0.17, 0.06, -0.04 | bin_column/bin_green + bin_column/bin_green | 0.00062 |
| 0.16, 0.06, -0.02 | bin_column/bin_green + bin_column/bin_green | 0.00097 |
| 0.17, 0.06, 0.12 | bin_column/bin_green + bin_column/bin_green | 0.00006 |
| 0.15, 0.06, 0.15 | bin_column/bin_green + bin_column/bin_green | 0.00004 |
| -0.13, 0.06, 0.16 | bin_column/bin_green + bin_column/bin_green | 0.00035 |
| -0.15, 0.06, 0.14 | bin_column/bin_green + bin_column/bin_green | 0.00015 |
| -0.12, 0.06, 0.05 | bin_column/bin_green + bin_column/bin_green | 0.0012 |
| -0.14, 0.06, 0.07 | bin_column/bin_green + bin_column/bin_green | 0.0078 |
| -0.16, 0.06, -0.08 | bin_column/bin_green + bin_column/bin_green | 0.00005 |
| 0.15, 0.06, 0.14 | bin_column/bin_green + bin_column/bin_green | 0.00007 |
| 0.14, 0.06, 0.14 | bin_column/bin_green + bin_column/bin_green | 0.00063 |
| 0.12, 0.06, 0.15 | bin_column/bin_green + bin_column/bin_green | 0.00077 |
| -0.04, 0.67, -0.06 | bin_column/bin_green + bin_column/rubber_black | 0.00144 |
| 0.09, 0.67, -0.06 | bin_column/bin_green + bin_column/rubber_black | 0.00059 |
| 0.14, 0.67, 0.03 | bin_column/bin_green + bin_column/rubber_black | 0.00082 |
| 0.14, 0.67, 0.08 | bin_column/bin_green + bin_column/rubber_black | 0.0003 |
| -0.14, 0.67, 0.04 | bin_column/bin_green + bin_column/rubber_black | 0.00081 |
| -0.14, 0.67, -0.02 | bin_column/bin_green + bin_column/rubber_black | 0.00031 |
| 0.00, 0.67, 0.11 | bin_column/rubber_black + bin_column/rubber_black | 0.00084 |
| -0.07, 0.67, 0.11 | bin_column/rubber_black + bin_column/rubber_black | 0.00082 |


Nodes: bin_column. Distances: {"bin_column":60}. Quantum 0.000 mm. Offset 0,0,0.
