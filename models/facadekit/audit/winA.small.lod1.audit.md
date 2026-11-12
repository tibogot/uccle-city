# Kit audit: winA.small LOD1

404 triangles, 262 welded vertices, 71 open edges, 14,838 rays, 18 ms.

**0 blocking**, 62 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 1 |
| sliver | warn | 34 |
| nonmanifold | warn | 19 |
| tjunction | warn | 8 |
| seam | info | 101 |
| opening | info | 10 |
| backtoback | info | 150 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.01, 0.02 | hood.lod1/stone_white + hood.lod1/stone_white | 1.3 | 1.4 | 4.5 | 119 | 0.91 | false | 0 + 1 + 0.08 |

## sliver (warn, 34)

| at | part | aspect | longest |
|---|---|---|---|
| -0.59, 0.56, 0.06 | winA.lod1/stone_white | 41 | 1.679 |
| -0.62, 0.57, 0.07 | winA.lod1/stone_white | 95 | 1.714 |
| -0.21, 1.72, 0.07 | winA.lod1/stone_white | 70 | 1.244 |
| 0.60, 1.13, 0.07 | winA.lod1/stone_white | 41 | 1.714 |
| 0.63, 1.15, 0.07 | winA.lod1/stone_white | 96 | 1.732 |
| -0.60, 1.13, 0.07 | winA.lod1/stone_white | 41 | 1.714 |
| -0.63, 1.15, 0.07 | winA.lod1/stone_white | 96 | 1.732 |
| 0.20, 1.72, 0.07 | winA.lod1/stone_white | 70 | 1.262 |
| 0.59, 0.56, 0.06 | winA.lod1/stone_white | 41 | 1.679 |
| 0.62, 0.57, 0.07 | winA.lod1/stone_white | 95 | 1.714 |
| -0.13, 1.02, -0.08 | winA.lod1/wood_frame_white | 113 | 0.796 |
| -0.13, 1.03, -0.08 | winA.lod1/wood_frame_white | 54 | 0.796 |
| -0.01, 0.39, -0.10 | winA.lod1/wood_frame_white | 60 | 0.957 |
| 0.01, 0.71, -0.10 | winA.lod1/wood_frame_white | 60 | 0.957 |
| -0.00, 0.71, -0.11 | winA.lod1/wood_frame_white | 43 | 0.957 |
| 0.00, 0.71, -0.09 | winA.lod1/wood_frame_white | 43 | 0.957 |
| 0.13, 1.02, -0.07 | winA.lod1/wood_frame_white | 113 | 0.796 |
| 0.13, 1.03, -0.08 | winA.lod1/wood_frame_white | 54 | 0.796 |
| -0.01, 0.71, -0.10 | winA.lod1/wood_frame_white | 60 | 0.957 |
| 0.01, 0.39, -0.10 | winA.lod1/wood_frame_white | 60 | 0.957 |
| 0.00, 0.39, -0.11 | winA.lod1/wood_frame_white | 43 | 0.957 |
| -0.00, 0.39, -0.09 | winA.lod1/wood_frame_white | 43 | 0.957 |
| -0.20, 1.84, 0.03 | hood.lod1/stone_white | 98 | 1.176 |
| 0.20, 1.75, 0.03 | hood.lod1/stone_white | 98 | 1.176 |
| 0.23, 1.90, 0.05 | hood.lod1/stone_white | 63 | 1.408 |
| 0.23, 1.88, 0.03 | hood.lod1/stone_white | 49 | 1.364 |
| -0.22, 2.01, 0.00 | hood.lod1/stone_white | 45 | 1.336 |
| 0.22, 1.88, 0.00 | hood.lod1/stone_white | 45 | 1.336 |
| 0.20, 1.84, 0.04 | hood.lod1/stone_white | 98 | 1.176 |
| -0.20, 1.75, 0.04 | hood.lod1/stone_white | 98 | 1.176 |
| -0.23, 1.89, 0.05 | hood.lod1/stone_white | 63 | 1.4 |
| -0.22, 1.88, 0.04 | hood.lod1/stone_white | 49 | 1.392 |
| 0.22, 2.01, 0.01 | hood.lod1/stone_white | 45 | 1.336 |
| -0.22, 1.88, 0.01 | hood.lod1/stone_white | 45 | 1.336 |

## nonmanifold (warn, 19)

| at | part | uses |
|---|---|---|
| -0.40, 1.56, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.40, 0.00, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.40, 0.00, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.40, 1.56, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.35, 1.03, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.35, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.03, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.03, 1.03, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.00, 0.55, -0.16 | winA.lod1/wood_frame_white | 3 |
| 0.00, 1.03, -0.13 | winA.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winA.lod1/wood_frame_white | 3 |
| 0.00, 0.55, -0.11 | winA.lod1/wood_frame_white | 3 |
| 0.03, 1.03, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.03, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.35, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.35, 1.03, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.00, 1.88, 0.02 | hood.lod1/stone_white | 3 |
| -0.67, 1.88, 0.01 | hood.lod1/stone_white | 3 |
| 0.67, 1.88, 0.01 | hood.lod1/stone_white | 3 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| -0.40, 1.03, -0.10 | winA.lod1/wood_frame_white | 0.029 |
| 0.40, 1.03, -0.10 | winA.lod1/wood_frame_white | 0.029 |
| 0.67, 2.01, -0.01 | hood.lod1/stone_white | 0.13 |
| -0.67, 2.01, -0.01 | hood.lod1/stone_white | 0.13 |
| -0.47, -0.00, 0.00 | wall/wall | 5.2 |
| 0.47, -0.00, 0.00 | wall/wall | 1.2 |
| -0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 101)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 1.56, -0.02 | winA.lod1/stone_white + winA.lod1/stone_white | 0.73 | 24 | 86.7 |
| -0.47, 0.00, -0.01 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.51 | 16 | 6 |
| -0.06, 1.75, 0.03 | winA.lod1/stone_white + hood.lod1/stone_white | 0.41 | 16 | 86.7 |
| -0.02, 1.72, -0.02 | winA.lod1/stone_white + hood.lod1/stone_white | 0.63 | 13 | 86.7 |
| -0.47, 0.65, -0.17 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 3.53 | 12 | 90 |
| 0.70, 2.00, 0.00 | hood.lod1/stone_white + wall/wall | 0.3 | 12 | 90 |
| -0.76, 2.00, 0.00 | hood.lod1/stone_white + wall/wall | 0.3 | 12 | 90 |
| -0.00, 0.07, -0.11 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 1.01 | 11 | 90 |
| 0.00, 1.03, -0.11 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 1.01 | 11 | 90 |
| 0.47, 0.00, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 3.53 | 10 | 90 |
| -0.31, 1.73, 0.04 | winA.lod1/stone_white + hood.lod1/stone_white | 1.36 | 10 | 90 |
| 0.47, 1.75, 0.04 | hood.lod1/stone_white + hood.lod1/stone_white | 2.53 | 10 | 90 |
| -0.47, 0.15, 0.00 | winA.lod1/stone_white + wall/wall | 3.63 | 9 | 90 |
| 0.47, 0.62, 0.00 | winA.lod1/stone_white + wall/wall | 3.63 | 8 | 90 |
| -0.40, 1.06, -0.17 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.42 | 8 | 90 |
| 0.40, 1.03, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.42 | 8 | 90 |
| -0.17, 1.88, -0.01 | hood.lod1/stone_white + hood.lod1/stone_white | 2.61 | 8 | 90 |
| -0.37, 1.56, -0.17 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 1.72 | 6 | 90 |
| 0.06, 1.68, 0.00 | winA.lod1/stone_white + wall/wall | 0.71 | 6 | 90 |
| -0.40, 0.60, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 2.01 | 6 | 90 |
| 0.40, 0.07, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 2.01 | 6 | 90 |
| -0.12, 1.50, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.13, 1.50, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.35, 0.07, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.73 | 6 | 90 |
| 0.03, 0.07, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.73 | 6 | 90 |
| -0.13, 1.10, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.12, 1.10, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.17, 1.03, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.73 | 6 | 90 |
| 0.19, 1.03, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.73 | 6 | 90 |
| -0.35, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.03, 0.56, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.26, 0.15, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.32 | 6 | 90 |
| -0.24, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.32 | 6 | 90 |
| 0.03, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.35, 0.56, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.03, 0.98, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.32 | 6 | 90 |
| 0.03, 0.56, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.32 | 6 | 90 |
| -0.13, 1.10, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.4 | 6 | 90 |
| -0.12, 1.35, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.4 | 6 | 90 |
| 0.12, 1.10, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.4 | 6 | 90 |

(61 more in the JSON)

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.47, 1.52, -0.20 | winA.lod1/stone_white | 1 + 0 + 0 | 1.569 |
| 0.47, 0.04, -0.20 | winA.lod1/stone_white | -1 + 0 + 0 | 1.569 |
| -0.42, 1.56, -0.20 | winA.lod1/stone_white | 0 + -1 + 0 | 0.936 |
| -0.42, -0.00, -0.20 | winA.lod1/stone_white | 0 + 1 + 0.04 | 0.936 |
| -0.67, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.67, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| 0.47, 2.02, 0.00 | wall/wall | 0 + 0 + 1 | 2.435 |
| -0.42, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.936 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 150)

| at | parts | area |
|---|---|---|
| -0.47, 0.61, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.04853 |
| -0.47, 0.65, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.01876 |
| 0.47, 0.17, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00131 |
| 0.47, 0.23, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02597 |
| -0.47, 1.26, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00097 |
| -0.47, 1.04, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00592 |
| -0.45, 1.56, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.32, 1.56, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00898 |
| -0.42, 1.56, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.22, 1.56, -0.11 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.0029 |
| -0.63, -0.00, 0.04 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00051 |
| 0.47, 0.91, -0.15 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.04955 |
| 0.47, 0.83, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02489 |
| -0.04, 1.56, -0.15 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.01689 |
| 0.13, 1.56, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02297 |
| 0.42, 1.56, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| 0.45, 1.56, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.47, 1.39, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00136 |
| -0.47, 1.33, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02618 |
| -0.56, -0.00, 0.01 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00429 |
| -0.51, -0.00, 0.03 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00275 |
| -0.60, -0.00, 0.04 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00141 |
| -0.40, 0.03, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.0001 |
| -0.40, 0.61, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00852 |
| -0.40, 0.90, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00677 |
| -0.40, 1.05, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00208 |
| -0.40, 1.08, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00111 |
| -0.40, 1.51, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00227 |
| -0.40, 1.55, -0.12 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.40, 0.05, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00227 |
| 0.40, 0.02, -0.12 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.40, 0.69, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.01752 |
| 0.40, 0.25, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.01586 |
| 0.40, 1.07, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00124 |
| 0.40, 1.03, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00027 |
| 0.40, 1.54, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.0001 |
| 0.40, 1.55, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.12, 1.50, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00022 |
| 0.13, 1.50, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00009 |
| -0.40, 0.02, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |

(110 more in the JSON)
