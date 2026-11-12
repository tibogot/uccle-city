# Kit audit: winC.big LOD1

322 triangles, 214 welded vertices, 66 open edges, 15,606 rays, 18 ms.

**0 blocking**, 44 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 22 |
| nonmanifold | warn | 16 |
| tjunction | warn | 6 |
| seam | info | 87 |
| opening | info | 11 |
| backtoback | info | 146 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 22)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.58, 0.06 | winC.lod1/stone_white | 42 | 1.754 |
| -0.75, 0.59, 0.07 | winC.lod1/stone_white | 99 | 1.789 |
| -0.25, 1.79, 0.07 | winC.lod1/stone_white | 85 | 1.508 |
| 0.73, 1.18, 0.07 | winC.lod1/stone_white | 43 | 1.789 |
| 0.76, 1.20, 0.07 | winC.lod1/stone_white | 100 | 1.807 |
| -0.73, 1.18, 0.07 | winC.lod1/stone_white | 43 | 1.789 |
| -0.76, 1.20, 0.07 | winC.lod1/stone_white | 100 | 1.807 |
| 0.25, 1.80, 0.07 | winC.lod1/stone_white | 85 | 1.526 |
| 0.72, 0.58, 0.06 | winC.lod1/stone_white | 42 | 1.754 |
| 0.75, 0.59, 0.07 | winC.lod1/stone_white | 99 | 1.789 |
| -0.18, 1.08, -0.09 | winC.lod1/wood_frame_white | 48 | 1.06 |
| -0.18, 1.08, -0.08 | winC.lod1/wood_frame_white | 143 | 1.06 |
| -0.18, 1.09, -0.08 | winC.lod1/wood_frame_white | 67 | 1.06 |
| -0.18, 1.10, -0.09 | winC.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.41, -0.10 | winC.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.75, -0.10 | winC.lod1/wood_frame_white | 64 | 1.016 |
| 0.18, 1.08, -0.09 | winC.lod1/wood_frame_white | 48 | 1.06 |
| 0.18, 1.08, -0.07 | winC.lod1/wood_frame_white | 143 | 1.06 |
| 0.18, 1.09, -0.08 | winC.lod1/wood_frame_white | 67 | 1.06 |
| 0.18, 1.11, -0.09 | winC.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.75, -0.10 | winC.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.41, -0.10 | winC.lod1/wood_frame_white | 64 | 1.016 |

## nonmanifold (warn, 16)

| at | part | uses |
|---|---|---|
| -0.53, 1.64, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.53, 0.00, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.53, 0.00, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.53, 1.64, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.48, 1.09, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.48, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.05, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.05, 1.09, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.00, 0.58, -0.16 | winC.lod1/wood_frame_white | 3 |
| 0.00, 1.09, -0.13 | winC.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winC.lod1/wood_frame_white | 3 |
| 0.00, 0.58, -0.11 | winC.lod1/wood_frame_white | 3 |
| 0.05, 1.09, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.05, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.48, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.48, 1.09, -0.13 | winC.lod1/wood_frame_white | 4 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| -0.53, 1.09, -0.10 | winC.lod1/wood_frame_white | 0.031 |
| 0.53, 1.09, -0.10 | winC.lod1/wood_frame_white | 0.031 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 87)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.07, 1.64, -0.02 | winC.lod1/stone_white + winC.lod1/stone_white | 0.79 | 24 | 84.6 |
| -0.60, 0.00, -0.01 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.51 | 16 | 6 |
| -0.60, 0.68, -0.17 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 3.68 | 12 | 90 |
| -0.00, 0.07, -0.11 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 1.09 | 11 | 90 |
| 0.00, 1.09, -0.11 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 1.09 | 11 | 90 |
| 0.60, 0.00, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 3.68 | 10 | 90 |
| -0.60, 0.16, 0.00 | winC.lod1/stone_white + wall/wall | 3.78 | 9 | 90 |
| 0.60, 0.65, 0.00 | winC.lod1/stone_white + wall/wall | 3.78 | 8 | 90 |
| -0.53, 1.16, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.44 | 8 | 90 |
| 0.53, 1.09, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.44 | 8 | 90 |
| -0.48, 1.64, -0.17 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 2.25 | 6 | 90 |
| 0.09, 1.76, 0.00 | winC.lod1/stone_white + wall/wall | 0.79 | 6 | 90 |
| -0.53, 0.63, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 2.13 | 6 | 90 |
| 0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 2.13 | 6 | 90 |
| -0.19, 1.57, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.21, 1.57, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.48, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.05, 0.07, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.21, 1.16, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.19, 1.16, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.23, 1.09, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.27, 1.09, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.48, 0.60, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.05, 0.58, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.48, 1.03, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.48, 0.58, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.34, 0.60, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.60, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.48, 0.58, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.05, 1.03, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.58, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.19, 0.60, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.21, 1.17, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.42 | 6 | 90 |
| -0.19, 1.42, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.42 | 6 | 90 |
| 0.19, 1.17, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.42 | 6 | 90 |
| 0.21, 1.42, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.42 | 6 | 90 |
| -0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.01, 0.07, -0.10 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.09 | 5 | 90 |
| -0.53, 1.09, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.25 | 5 | 90 |

(47 more in the JSON)

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.59, -0.20 | winC.lod1/stone_white | 1 + 0 + 0 | 1.644 |
| -0.60, -0.01, -0.15 | winC.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| 0.60, 0.05, -0.20 | winC.lod1/stone_white | -1 + 0 + 0 | 1.644 |
| -0.55, 1.64, -0.20 | winC.lod1/stone_white | 0 + -1 + 0 | 1.2 |
| 0.60, -0.01, -0.15 | winC.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| -0.80, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 1.89, 0.00 | wall/wall | 0 + 0 + 1 | 2.36 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 146)

| at | parts | area |
|---|---|---|
| -0.60, 0.64, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.05087 |
| -0.60, 0.68, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.01967 |
| 0.60, 0.18, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00137 |
| 0.60, 0.24, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02722 |
| -0.60, 1.33, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00101 |
| -0.60, 1.09, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.0062 |
| -0.58, 1.64, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.43, 1.64, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.01253 |
| -0.55, 1.64, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.29, 1.64, -0.11 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00398 |
| -0.76, -0.00, 0.04 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00052 |
| 0.60, 0.95, -0.15 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.05193 |
| 0.60, 0.87, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02608 |
| -0.04, 1.64, -0.15 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02192 |
| 0.18, 1.64, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.03047 |
| 0.55, 1.64, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| 0.58, 1.64, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.60, 1.46, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00142 |
| -0.60, 1.40, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02743 |
| -0.69, -0.00, 0.01 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00429 |
| -0.64, -0.00, 0.03 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00275 |
| -0.74, -0.00, 0.04 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00142 |
| -0.53, 0.03, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00009 |
| -0.53, 0.65, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00908 |
| -0.53, 0.95, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00732 |
| -0.53, 1.11, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00226 |
| -0.53, 1.15, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00122 |
| -0.53, 1.59, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00227 |
| -0.53, 1.62, -0.12 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.05, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00227 |
| 0.53, 0.02, -0.12 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.73, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.01849 |
| 0.53, 0.26, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.01682 |
| 0.53, 1.13, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00132 |
| 0.53, 1.09, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00028 |
| 0.53, 1.61, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00009 |
| 0.53, 1.62, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.20, 1.57, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00037 |
| 0.21, 1.57, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00018 |
| -0.53, 0.02, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |

(106 more in the JSON)
