# Kit audit: winB.big LOD1

453 triangles, 294 welded vertices, 119 open edges, 14,324 rays, 14 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 20 |
| nonmanifold | warn | 12 |
| tjunction | warn | 8 |
| seam | info | 60 |
| opening | info | 36 |
| backtoback | info | 217 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 20)

| at | part | aspect | longest |
|---|---|---|---|
| -0.73, 0.55, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| -0.60, 1.09, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| 0.60, 0.55, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| 0.73, 1.09, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| -0.73, 1.09, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| -0.60, 0.55, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| 0.60, 1.09, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| 0.73, 0.55, 0.00 | winB.lod1/brick_red_brussels | 273 | 1.64 |
| -0.53, 0.53, -0.12 | winB.lod1/wood_frame_white | 141 | 1.592 |
| -0.59, 0.55, -0.11 | winB.lod1/wood_frame_white | 144 | 1.635 |
| 0.54, 1.06, -0.11 | winB.lod1/wood_frame_white | 141 | 1.598 |
| 0.60, 1.09, -0.12 | winB.lod1/wood_frame_white | 145 | 1.64 |
| -0.02, 0.41, -0.12 | winB.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.75, -0.12 | winB.lod1/wood_frame_white | 64 | 1.016 |
| -0.54, 1.06, -0.11 | winB.lod1/wood_frame_white | 141 | 1.598 |
| -0.60, 1.09, -0.12 | winB.lod1/wood_frame_white | 145 | 1.64 |
| 0.53, 0.53, -0.12 | winB.lod1/wood_frame_white | 141 | 1.592 |
| 0.59, 0.55, -0.11 | winB.lod1/wood_frame_white | 144 | 1.635 |
| -0.02, 0.75, -0.11 | winB.lod1/wood_frame_white | 64 | 1.016 |
| 0.02, 0.41, -0.11 | winB.lod1/wood_frame_white | 64 | 1.016 |

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| -0.48, 1.09, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.48, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.05, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.05, 1.09, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.00, 0.58, -0.17 | winB.lod1/wood_frame_white | 3 |
| 0.00, 1.09, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.58, -0.12 | winB.lod1/wood_frame_white | 3 |
| 0.05, 1.09, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.05, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.48, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.48, 1.09, -0.14 | winB.lod1/wood_frame_white | 4 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| 0.60, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.644 |
| -0.60, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.644 |
| -0.53, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.592 |
| 0.53, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.592 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 60)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.31, 1.74, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 1.25 | 36 | 90 |
| -0.60, 0.00, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 3.9 | 35 | 5 |
| -0.51, 1.60, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.93 | 30 | 90 |
| -0.50, -0.01, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 1.2 | 24 | 87.9 |
| -0.10, 1.77, 0.00 | winB.lod1/brick_red_brussels + winB.lod1/brick_red_brussels | 0.8 | 12 | 90 |
| -0.53, 1.09, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.51 | 12 | 45 |
| -0.21, 1.68, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 12 | 45 |
| 0.19, 1.69, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 12 | 45 |
| -0.21, 1.33, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.06 | 12 | 90 |
| 0.19, 1.34, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.06 | 12 | 90 |
| -0.00, 0.07, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.09 | 11 | 90 |
| 0.00, 1.09, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.09 | 11 | 90 |
| -0.53, 0.00, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 8 | 45 |
| 0.53, 0.64, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 4.17 | 8 | 45 |
| -0.53, 0.58, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 4.15 | 7 | 45 |
| -0.48, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.05, 0.07, -0.16 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.21, 1.16, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.19, 1.16, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.23, 1.09, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.27, 1.09, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.53, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.53, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.01, 0.07, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.09 | 5 | 90 |
| -0.53, 1.09, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.50, 1.09, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.00, 1.07, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.02 | 5 | 90 |
| -0.01, 1.09, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.09 | 5 | 90 |
| -0.60, 0.00, -0.01 | winB.lod1/brick_red_brussels + sill.lod1/stone_blue | 0.06 | 4 | 89.9 |
| -0.73, 0.82, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.55 | 4 | 90 |
| 0.60, 0.82, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.55 | 4 | 90 |
| -0.05, 0.07, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| 0.03, 0.07, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| -0.03, 1.09, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| 0.03, 1.09, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| -0.48, 1.03, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| -0.36, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.05, 1.03, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.17, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.80, -0.02, 0.00 | sill.lod1/stone_blue + wall/wall | 0.5 | 4 | 84 |

(20 more in the JSON)

## opening (info, 36)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.59, -0.22 | winB.lod1/brick_red_brussels | 1 + 0 + 0 | 1.644 |
| -0.55, 1.66, -0.22 | winB.lod1/brick_red_brussels | 0.38 + -0.93 + 0 | 0.108 |
| -0.45, 1.70, -0.22 | winB.lod1/brick_red_brussels | 0.31 + -0.95 + 0 | 0.105 |
| -0.35, 1.73, -0.22 | winB.lod1/brick_red_brussels | 0.24 + -0.97 + 0 | 0.103 |
| -0.25, 1.75, -0.22 | winB.lod1/brick_red_brussels | 0.17 + -0.98 + 0 | 0.102 |
| -0.15, 1.76, -0.22 | winB.lod1/brick_red_brussels | 0.1 + -0.99 + 0 | 0.101 |
| -0.05, 1.77, -0.22 | winB.lod1/brick_red_brussels | 0.03 + -1 + 0 | 0.1 |
| 0.05, 1.77, -0.22 | winB.lod1/brick_red_brussels | -0.03 + -1 + 0 | 0.1 |
| 0.15, 1.76, -0.22 | winB.lod1/brick_red_brussels | -0.1 + -0.99 + 0 | 0.101 |
| 0.25, 1.75, -0.22 | winB.lod1/brick_red_brussels | -0.17 + -0.98 + 0 | 0.102 |
| 0.35, 1.73, -0.22 | winB.lod1/brick_red_brussels | -0.24 + -0.97 + 0 | 0.103 |
| 0.45, 1.70, -0.22 | winB.lod1/brick_red_brussels | -0.31 + -0.95 + 0 | 0.105 |
| 0.55, 1.66, -0.22 | winB.lod1/brick_red_brussels | -0.38 + -0.93 + 0 | 0.108 |
| -0.60, -0.01, -0.17 | winB.lod1/brick_red_brussels | 0 + 1 + 0.04 | 0.22 |
| 0.60, 0.05, -0.22 | winB.lod1/brick_red_brussels | -1 + 0 + 0 | 1.644 |
| -0.55, -0.00, -0.22 | winB.lod1/brick_red_brussels | 0 + 1 + 0.04 | 1.2 |
| -0.60, 0.05, -0.17 | winB.lod1/wood_frame_white | -1 + 0 + 0 | 1.64 |
| 0.60, 1.59, -0.17 | winB.lod1/wood_frame_white | 1 + 0 + 0 | 1.64 |
| 0.65, 0.00, -0.03 | sill.lod1/stone_blue | 0 + 1 + 0.06 | 1.6 |
| -0.80, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.05, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.05, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.60, 1.89, 0.00 | wall/wall | 0 + 0 + 1 | 2.36 |
| 0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 217)

| at | parts | area |
|---|---|---|
| -0.60, 0.48, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.03873 |
| -0.60, 0.78, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02345 |
| 0.60, 0.45, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00793 |
| 0.60, 0.23, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02315 |
| -0.57, 1.65, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00295 |
| -0.55, 1.66, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00115 |
| -0.48, 1.69, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0004 |
| -0.48, 1.69, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00225 |
| -0.45, 1.70, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00112 |
| -0.43, 1.70, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00022 |
| -0.37, 1.72, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00144 |
| -0.36, 1.72, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00247 |
| -0.27, 1.74, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00265 |
| -0.26, 1.75, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00121 |
| -0.18, 1.76, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00039 |
| -0.14, 1.76, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00101 |
| -0.18, 1.76, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00223 |
| -0.13, 1.76, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00018 |
| -0.07, 1.77, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00229 |
| 0.03, 1.77, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0028 |
| 0.05, 1.77, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.001 |
| 0.13, 1.76, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00055 |
| 0.16, 1.76, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0006 |
| 0.13, 1.76, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00256 |
| 0.17, 1.76, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0001 |
| 0.33, 1.73, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00262 |
| 0.30, 1.74, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0004 |
| 0.35, 1.73, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00088 |
| 0.43, 1.71, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00063 |
| 0.46, 1.69, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00056 |
| 0.43, 1.70, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0027 |
| 0.47, 1.69, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0001 |
| 0.54, 1.67, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00234 |
| -0.42, 1.90, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00304 |
| -0.34, 1.84, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.01497 |
| -0.40, 1.89, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00072 |
| -0.28, 1.90, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.0052 |
| -0.30, 1.86, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00103 |
| -0.30, 1.75, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00006 |
| -0.25, 1.85, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.01188 |

(177 more in the JSON)
