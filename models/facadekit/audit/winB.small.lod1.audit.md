# Kit audit: winB.small LOD1

453 triangles, 304 welded vertices, 143 open edges, 14,452 rays, 16 ms.

**0 blocking**, 48 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 24 |
| nonmanifold | warn | 12 |
| tjunction | warn | 12 |
| seam | info | 61 |
| opening | info | 34 |
| backtoback | info | 213 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 24)

| at | part | aspect | longest |
|---|---|---|---|
| -0.60, 0.52, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| -0.47, 1.04, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| 0.47, 0.52, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| 0.60, 1.04, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| -0.60, 1.04, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| -0.47, 0.52, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| 0.47, 1.04, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| 0.60, 0.52, 0.00 | winB.lod1/brick_red_brussels | 261 | 1.565 |
| -0.40, 0.51, -0.12 | winB.lod1/wood_frame_white | 135 | 1.525 |
| -0.46, 0.52, -0.11 | winB.lod1/wood_frame_white | 138 | 1.561 |
| 0.40, 1.02, -0.11 | winB.lod1/wood_frame_white | 135 | 1.53 |
| 0.47, 1.04, -0.12 | winB.lod1/wood_frame_white | 138 | 1.565 |
| -0.01, 0.39, -0.12 | winB.lod1/wood_frame_white | 60 | 0.957 |
| 0.01, 0.71, -0.12 | winB.lod1/wood_frame_white | 60 | 0.957 |
| -0.00, 0.71, -0.12 | winB.lod1/wood_frame_white | 43 | 0.957 |
| 0.00, 0.71, -0.10 | winB.lod1/wood_frame_white | 43 | 0.957 |
| -0.40, 1.02, -0.11 | winB.lod1/wood_frame_white | 135 | 1.53 |
| -0.47, 1.04, -0.12 | winB.lod1/wood_frame_white | 138 | 1.565 |
| 0.40, 0.51, -0.12 | winB.lod1/wood_frame_white | 135 | 1.525 |
| 0.46, 0.52, -0.11 | winB.lod1/wood_frame_white | 138 | 1.561 |
| -0.01, 0.71, -0.11 | winB.lod1/wood_frame_white | 60 | 0.957 |
| 0.01, 0.39, -0.11 | winB.lod1/wood_frame_white | 60 | 0.957 |
| 0.00, 0.39, -0.12 | winB.lod1/wood_frame_white | 43 | 0.957 |
| -0.00, 0.39, -0.10 | winB.lod1/wood_frame_white | 43 | 0.957 |

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| -0.35, 1.03, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.35, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.03, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.03, 1.03, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.00, 0.55, -0.17 | winB.lod1/wood_frame_white | 3 |
| 0.00, 1.03, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.55, -0.12 | winB.lod1/wood_frame_white | 3 |
| 0.03, 1.03, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.03, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.35, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.35, 1.03, -0.14 | winB.lod1/wood_frame_white | 4 |

## tjunction (warn, 12)

| at | part | edge_m |
|---|---|---|
| 0.47, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.569 |
| -0.47, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.569 |
| -0.19, 1.67, 0.00 | winB.lod1/brick_red_brussels | 0.084 |
| -0.06, 1.69, 0.00 | winB.lod1/brick_red_brussels | 0.063 |
| 0.06, 1.69, 0.00 | winB.lod1/brick_red_brussels | 0.063 |
| 0.19, 1.67, 0.00 | winB.lod1/brick_red_brussels | 0.084 |
| -0.40, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.525 |
| 0.40, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.525 |
| -0.47, -0.00, 0.00 | wall/wall | 5.2 |
| -0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 61)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.47, 0.00, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 3.95 | 44 | 5 |
| -0.19, 1.67, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 1.01 | 34 | 90 |
| -0.38, 1.54, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.68 | 30 | 90 |
| -0.39, -0.01, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.94 | 24 | 87.9 |
| -0.37, 1.61, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.31 | 18 | 90 |
| -0.06, 1.69, 0.00 | winB.lod1/brick_red_brussels + winB.lod1/brick_red_brussels | 0.62 | 12 | 90 |
| -0.40, 1.03, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.48 | 12 | 45 |
| -0.13, 1.61, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 12 | 44.9 |
| 0.12, 1.61, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 12 | 45.1 |
| -0.13, 1.27, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.05 | 12 | 90 |
| 0.12, 1.28, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.05 | 12 | 90 |
| -0.00, 0.07, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.01 | 11 | 90 |
| 0.00, 1.03, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.01 | 11 | 90 |
| -0.40, 0.00, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 8 | 45 |
| -0.40, 0.55, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 3.93 | 8 | 45 |
| 0.40, 0.61, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 3.93 | 8 | 45 |
| -0.35, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.73 | 6 | 90 |
| 0.03, 0.07, -0.16 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.73 | 6 | 90 |
| -0.13, 1.10, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.12, 1.10, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.17, 1.03, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.73 | 6 | 90 |
| 0.19, 1.03, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.73 | 6 | 90 |
| -0.40, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.40, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.01, 0.07, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.06 | 5 | 90 |
| -0.40, 1.03, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.40, 1.03, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.00, 1.01, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.96 | 5 | 90 |
| -0.01, 1.03, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.06 | 5 | 90 |
| -0.47, 0.00, -0.01 | winB.lod1/brick_red_brussels + sill.lod1/stone_blue | 0.06 | 4 | 89.8 |
| -0.60, 0.78, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.4 | 4 | 90 |
| 0.47, 0.78, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.4 | 4 | 90 |
| -0.03, 0.07, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 4 | 90 |
| 0.02, 0.07, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 4 | 90 |
| -0.02, 1.03, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 4 | 90 |
| 0.02, 1.03, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.11 | 4 | 90 |
| -0.35, 0.98, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.32 | 4 | 90 |
| -0.26, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.32 | 4 | 90 |
| 0.03, 0.98, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.32 | 4 | 90 |
| 0.12, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.32 | 4 | 90 |

(21 more in the JSON)

## opening (info, 34)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.47, 1.52, -0.22 | winB.lod1/brick_red_brussels | 1 + 0 + 0 | 1.569 |
| -0.42, 1.59, -0.22 | winB.lod1/brick_red_brussels | 0.46 + -0.89 + 0 | 0.113 |
| -0.32, 1.64, -0.22 | winB.lod1/brick_red_brussels | 0.35 + -0.94 + 0 | 0.107 |
| -0.23, 1.67, -0.22 | winB.lod1/brick_red_brussels | 0.25 + -0.97 + 0 | 0.084 |
| -0.16, 1.68, -0.22 | winB.lod1/brick_red_brussels | 0.17 + -0.99 + 0 | 0.063 |
| -0.09, 1.69, -0.22 | winB.lod1/brick_red_brussels | 0.1 + -0.99 + 0 | 0.063 |
| -0.03, 1.69, -0.22 | winB.lod1/brick_red_brussels | 0.03 + -1 + 0 | 0.062 |
| 0.03, 1.69, -0.22 | winB.lod1/brick_red_brussels | -0.03 + -1 + 0 | 0.062 |
| 0.09, 1.69, -0.22 | winB.lod1/brick_red_brussels | -0.1 + -0.99 + 0 | 0.063 |
| 0.16, 1.68, -0.22 | winB.lod1/brick_red_brussels | -0.17 + -0.99 + 0 | 0.063 |
| 0.23, 1.67, -0.22 | winB.lod1/brick_red_brussels | -0.25 + -0.97 + 0 | 0.084 |
| 0.32, 1.64, -0.22 | winB.lod1/brick_red_brussels | -0.35 + -0.94 + 0 | 0.107 |
| 0.42, 1.59, -0.22 | winB.lod1/brick_red_brussels | -0.46 + -0.89 + 0 | 0.113 |
| 0.47, 0.04, -0.22 | winB.lod1/brick_red_brussels | -1 + 0 + 0 | 1.569 |
| -0.42, -0.00, -0.22 | winB.lod1/brick_red_brussels | 0 + 1 + 0.04 | 0.936 |
| -0.47, 0.05, -0.17 | winB.lod1/wood_frame_white | -1 + 0 + 0 | 1.565 |
| 0.47, 1.52, -0.17 | winB.lod1/wood_frame_white | 1 + 0 + 0 | 1.565 |
| -0.67, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.67, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| -0.43, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| -0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| -0.27, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| -0.20, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| -0.12, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| -0.04, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.04, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.12, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.20, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.27, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.47, 1.82, 0.00 | wall/wall | 0 + 0 + 1 | 2.435 |
| 0.43, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.078 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 213)

| at | parts | area |
|---|---|---|
| -0.47, 0.46, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.03695 |
| -0.47, 0.74, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02237 |
| 0.47, 0.43, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00756 |
| 0.47, 0.22, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02208 |
| -0.44, 1.58, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00307 |
| -0.43, 1.58, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00121 |
| -0.31, 1.64, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00111 |
| -0.30, 1.64, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00024 |
| -0.24, 1.66, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0021 |
| -0.17, 1.68, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00165 |
| -0.16, 1.68, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00075 |
| -0.12, 1.69, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00024 |
| -0.09, 1.69, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00063 |
| -0.11, 1.69, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00139 |
| -0.08, 1.69, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00011 |
| -0.04, 1.69, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00094 |
| -0.04, 1.69, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00143 |
| 0.01, 1.69, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00174 |
| 0.02, 1.69, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00062 |
| 0.08, 1.69, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00034 |
| 0.10, 1.69, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00038 |
| 0.08, 1.69, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00159 |
| 0.11, 1.69, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00006 |
| 0.14, 1.68, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00107 |
| 0.15, 1.68, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00133 |
| 0.21, 1.67, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00224 |
| 0.23, 1.66, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00069 |
| 0.29, 1.64, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00072 |
| 0.30, 1.64, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00265 |
| -0.32, 1.85, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.0004 |
| -0.27, 1.82, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.007 |
| -0.31, 1.84, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00027 |
| -0.19, 1.81, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.01171 |
| -0.23, 1.80, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00072 |
| -0.15, 1.89, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00019 |
| -0.17, 1.75, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.0024 |
| -0.12, 1.85, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00986 |
| -0.15, 1.79, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00059 |
| -0.04, 1.89, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00304 |
| -0.07, 1.86, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00051 |

(173 more in the JSON)
