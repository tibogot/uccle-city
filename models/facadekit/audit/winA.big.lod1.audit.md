# Kit audit: winA.big LOD1

404 triangles, 262 welded vertices, 71 open edges, 15,726 rays, 22 ms.

**0 blocking**, 62 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 1 |
| sliver | warn | 34 |
| nonmanifold | warn | 19 |
| tjunction | warn | 8 |
| seam | info | 101 |
| opening | info | 11 |
| backtoback | info | 150 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.08, 0.02 | hood.lod1/stone_white + hood.lod1/stone_white | 1.3 | 1.6 | 4.5 | 119 | 0.91 | false | 0 + 1 + 0.08 |

## sliver (warn, 34)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.58, 0.06 | winA.lod1/stone_white | 42 | 1.754 |
| -0.75, 0.59, 0.07 | winA.lod1/stone_white | 99 | 1.789 |
| -0.25, 1.79, 0.07 | winA.lod1/stone_white | 85 | 1.508 |
| 0.73, 1.18, 0.07 | winA.lod1/stone_white | 43 | 1.789 |
| 0.76, 1.20, 0.07 | winA.lod1/stone_white | 100 | 1.807 |
| -0.73, 1.18, 0.07 | winA.lod1/stone_white | 43 | 1.789 |
| -0.76, 1.20, 0.07 | winA.lod1/stone_white | 100 | 1.807 |
| 0.25, 1.80, 0.07 | winA.lod1/stone_white | 85 | 1.526 |
| 0.72, 0.58, 0.06 | winA.lod1/stone_white | 42 | 1.754 |
| 0.75, 0.59, 0.07 | winA.lod1/stone_white | 99 | 1.789 |
| -0.18, 1.08, -0.09 | winA.lod1/wood_frame_white | 48 | 1.06 |
| -0.18, 1.08, -0.08 | winA.lod1/wood_frame_white | 143 | 1.06 |
| -0.18, 1.09, -0.08 | winA.lod1/wood_frame_white | 67 | 1.06 |
| -0.18, 1.10, -0.09 | winA.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.41, -0.10 | winA.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.75, -0.10 | winA.lod1/wood_frame_white | 64 | 1.016 |
| 0.18, 1.08, -0.09 | winA.lod1/wood_frame_white | 48 | 1.06 |
| 0.18, 1.08, -0.07 | winA.lod1/wood_frame_white | 143 | 1.06 |
| 0.18, 1.09, -0.08 | winA.lod1/wood_frame_white | 67 | 1.06 |
| 0.18, 1.11, -0.09 | winA.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.75, -0.10 | winA.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.41, -0.10 | winA.lod1/wood_frame_white | 64 | 1.016 |
| -0.24, 1.92, 0.03 | hood.lod1/stone_white | 120 | 1.44 |
| 0.24, 1.83, 0.03 | hood.lod1/stone_white | 120 | 1.44 |
| 0.28, 1.97, 0.05 | hood.lod1/stone_white | 75 | 1.672 |
| 0.28, 1.96, 0.03 | hood.lod1/stone_white | 58 | 1.628 |
| -0.27, 2.08, 0.00 | hood.lod1/stone_white | 53 | 1.6 |
| 0.27, 1.95, 0.00 | hood.lod1/stone_white | 53 | 1.6 |
| 0.24, 1.92, 0.04 | hood.lod1/stone_white | 120 | 1.44 |
| -0.24, 1.83, 0.04 | hood.lod1/stone_white | 120 | 1.44 |
| -0.28, 1.97, 0.05 | hood.lod1/stone_white | 75 | 1.664 |
| -0.27, 1.96, 0.04 | hood.lod1/stone_white | 58 | 1.656 |
| 0.27, 2.08, 0.01 | hood.lod1/stone_white | 53 | 1.6 |
| -0.27, 1.95, 0.01 | hood.lod1/stone_white | 53 | 1.6 |

## nonmanifold (warn, 19)

| at | part | uses |
|---|---|---|
| -0.53, 1.64, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.53, 0.00, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.53, 0.00, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.53, 1.64, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.48, 1.09, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.48, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.05, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| -0.05, 1.09, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.00, 0.58, -0.16 | winA.lod1/wood_frame_white | 3 |
| 0.00, 1.09, -0.13 | winA.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winA.lod1/wood_frame_white | 3 |
| 0.00, 0.58, -0.11 | winA.lod1/wood_frame_white | 3 |
| 0.05, 1.09, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.05, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.48, 0.07, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.48, 1.09, -0.13 | winA.lod1/wood_frame_white | 4 |
| 0.00, 1.95, 0.02 | hood.lod1/stone_white | 3 |
| -0.80, 1.95, 0.01 | hood.lod1/stone_white | 3 |
| 0.80, 1.95, 0.01 | hood.lod1/stone_white | 3 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| -0.53, 1.09, -0.10 | winA.lod1/wood_frame_white | 0.031 |
| 0.53, 1.09, -0.10 | winA.lod1/wood_frame_white | 0.031 |
| 0.80, 2.08, -0.01 | hood.lod1/stone_white | 0.13 |
| -0.80, 2.08, -0.01 | hood.lod1/stone_white | 0.13 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 101)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.07, 1.64, -0.02 | winA.lod1/stone_white + winA.lod1/stone_white | 0.79 | 24 | 84.6 |
| -0.60, 0.00, -0.01 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.51 | 16 | 6 |
| -0.10, 1.92, 0.03 | winA.lod1/stone_white + hood.lod1/stone_white | 0.41 | 16 | 84.6 |
| -0.03, 1.79, -0.02 | winA.lod1/stone_white + hood.lod1/stone_white | 0.78 | 13 | 84.6 |
| -0.60, 0.68, -0.17 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 3.68 | 12 | 90 |
| 0.84, 2.08, 0.00 | hood.lod1/stone_white + wall/wall | 0.3 | 12 | 90 |
| -0.89, 2.08, 0.00 | hood.lod1/stone_white + wall/wall | 0.3 | 12 | 90 |
| -0.00, 0.07, -0.11 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 1.09 | 11 | 90 |
| 0.00, 1.09, -0.11 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 1.09 | 11 | 90 |
| 0.60, 0.00, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 3.68 | 10 | 90 |
| -0.37, 1.80, 0.04 | winA.lod1/stone_white + hood.lod1/stone_white | 1.62 | 10 | 90 |
| -0.16, 1.92, 0.04 | hood.lod1/stone_white + hood.lod1/stone_white | 3.06 | 10 | 90 |
| -0.60, 0.16, 0.00 | winA.lod1/stone_white + wall/wall | 3.78 | 9 | 90 |
| 0.60, 0.65, 0.00 | winA.lod1/stone_white + wall/wall | 3.78 | 8 | 90 |
| -0.53, 1.16, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.44 | 8 | 90 |
| 0.53, 1.09, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.44 | 8 | 90 |
| -0.20, 1.95, -0.01 | hood.lod1/stone_white + hood.lod1/stone_white | 3.14 | 8 | 90 |
| -0.48, 1.64, -0.17 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 2.25 | 6 | 90 |
| 0.09, 1.76, 0.00 | winA.lod1/stone_white + wall/wall | 0.79 | 6 | 90 |
| -0.53, 0.63, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 2.13 | 6 | 90 |
| 0.53, 0.07, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 2.13 | 6 | 90 |
| -0.19, 1.57, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.21, 1.57, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.48, 0.07, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.05, 0.07, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.21, 1.16, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.19, 1.16, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.23, 1.09, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.27, 1.09, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.48, 0.60, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.05, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.48, 1.03, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| -0.48, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| -0.34, 0.60, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.60, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.48, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.05, 1.03, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.58, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| 0.19, 0.60, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.43 | 6 | 90 |
| -0.21, 1.17, -0.14 | winA.lod1/wood_frame_white + winA.lod1/glass_window | 0.42 | 6 | 90 |

(61 more in the JSON)

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.59, -0.20 | winA.lod1/stone_white | 1 + 0 + 0 | 1.644 |
| -0.60, -0.01, -0.15 | winA.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| 0.60, 0.05, -0.20 | winA.lod1/stone_white | -1 + 0 + 0 | 1.644 |
| -0.55, 1.64, -0.20 | winA.lod1/stone_white | 0 + -1 + 0 | 1.2 |
| 0.60, -0.01, -0.15 | winA.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| -0.80, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.18, 0.00 | wall/wall | 0 + 0 + 1 | 2.36 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 150)

| at | parts | area |
|---|---|---|
| -0.60, 0.64, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.05087 |
| -0.60, 0.68, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.01967 |
| 0.60, 0.18, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00137 |
| 0.60, 0.24, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02722 |
| -0.60, 1.33, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00101 |
| -0.60, 1.09, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.0062 |
| -0.58, 1.64, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.43, 1.64, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.01253 |
| -0.55, 1.64, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.29, 1.64, -0.11 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00398 |
| -0.76, -0.00, 0.04 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00052 |
| 0.60, 0.95, -0.15 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.05193 |
| 0.60, 0.87, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02608 |
| -0.04, 1.64, -0.15 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02192 |
| 0.18, 1.64, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.03047 |
| 0.55, 1.64, -0.14 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| 0.58, 1.64, -0.12 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00228 |
| -0.60, 1.46, -0.16 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.00142 |
| -0.60, 1.40, -0.13 | winA.lod1/stone_white + winA.lod1/wood_frame_white | 0.02743 |
| -0.69, -0.00, 0.01 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00429 |
| -0.64, -0.00, 0.03 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00275 |
| -0.74, -0.00, 0.04 | winA.lod1/stone_white + sill.lod1/stone_blue | 0.00142 |
| -0.53, 0.03, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00009 |
| -0.53, 0.65, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00908 |
| -0.53, 0.95, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00732 |
| -0.53, 1.11, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00226 |
| -0.53, 1.15, -0.14 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00122 |
| -0.53, 1.59, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00227 |
| -0.53, 1.62, -0.12 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.05, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00227 |
| 0.53, 0.02, -0.12 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.73, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.01849 |
| 0.53, 0.26, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.01682 |
| 0.53, 1.13, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00132 |
| 0.53, 1.09, -0.15 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00028 |
| 0.53, 1.61, -0.16 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00009 |
| 0.53, 1.62, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |
| 0.20, 1.57, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00037 |
| 0.21, 1.57, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00018 |
| -0.53, 0.02, -0.13 | winA.lod1/wood_frame_white + winA.lod1/wood_frame_white | 0.00218 |

(110 more in the JSON)
