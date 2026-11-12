# Kit audit: winB.small LOD0

4,879 triangles, 2,688 welded vertices, 183 open edges, 17,272 rays, 246 ms.

**0 blocking**, 372 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 362 |
| nonmanifold | warn | 4 |
| tjunction | warn | 6 |
| seam | info | 134 |
| opening | info | 43 |
| backtoback | info | 323 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 362)

| at | part | aspect | longest |
|---|---|---|---|
| -0.58, 1.58, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.57, 1.58, 0.00 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| -0.58, 1.67, 0.01 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| -0.58, 1.67, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| 0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.58, 1.58, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.57, 1.58, 0.01 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| 0.58, 1.58, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| -0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| -0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.58, 1.58, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.57, 1.58, 0.01 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| -0.58, 1.58, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.58, 1.58, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.57, 1.58, 0.00 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| 0.58, 1.67, 0.01 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| 0.58, 1.67, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.58, 1.67, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.13, 0.07, -0.17 | winB.lod0/wood_frame_white | 206 | 0.79 |
| 0.13, 0.07, -0.17 | winB.lod0/wood_frame_white | 206 | 0.79 |
| -0.13, 0.07, -0.11 | winB.lod0/wood_frame_white | 206 | 0.79 |
| -0.13, 0.07, -0.11 | winB.lod0/wood_frame_white | 206 | 0.79 |
| -0.13, 0.00, -0.17 | winB.lod0/wood_frame_white | 206 | 0.79 |
| -0.13, 0.00, -0.17 | winB.lod0/wood_frame_white | 206 | 0.79 |
| 0.13, 0.00, -0.11 | winB.lod0/wood_frame_white | 206 | 0.79 |
| 0.13, 0.00, -0.11 | winB.lod0/wood_frame_white | 206 | 0.79 |
| 0.13, 1.10, -0.17 | winB.lod0/wood_frame_white | 213 | 0.79 |
| 0.13, 1.10, -0.17 | winB.lod0/wood_frame_white | 208 | 0.79 |
| -0.13, 1.10, -0.11 | winB.lod0/wood_frame_white | 213 | 0.79 |
| -0.13, 1.10, -0.11 | winB.lod0/wood_frame_white | 208 | 0.79 |
| -0.13, 1.03, -0.17 | winB.lod0/wood_frame_white | 213 | 0.79 |
| -0.13, 1.03, -0.17 | winB.lod0/wood_frame_white | 208 | 0.79 |
| 0.13, 1.03, -0.11 | winB.lod0/wood_frame_white | 213 | 0.79 |
| 0.13, 1.03, -0.11 | winB.lod0/wood_frame_white | 208 | 0.79 |
| -0.40, 0.51, -0.12 | winB.lod0/wood_frame_white | 135 | 1.527 |
| -0.46, 0.52, -0.11 | winB.lod0/wood_frame_white | 138 | 1.561 |
| 0.40, 1.02, -0.11 | winB.lod0/wood_frame_white | 135 | 1.531 |
| 0.47, 1.04, -0.12 | winB.lod0/wood_frame_white | 138 | 1.565 |

(322 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.00, 1.02, -0.14 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.14 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.55, -0.16 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.55, -0.12 | winB.lod0/wood_frame_white | 3 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| 0.47, 0.00, 0.00 | winB.lod0/brick_red_brussels | 1.569 |
| -0.47, 0.00, 0.00 | winB.lod0/brick_red_brussels | 1.569 |
| -0.47, -0.00, 0.00 | wall/wall | 5.2 |
| -0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 134)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.47, 0.00, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 4.26 | 62 | 43 |
| -0.40, 0.00, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.49 | 48 | 27.6 |
| -0.40, 1.03, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.5 | 48 | 27.9 |
| -0.39, 1.53, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.6 | 44 | 90 |
| 0.01, 0.08, -0.10 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.07 | 30 | 48.3 |
| -0.13, 1.61, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.09 | 28 | 57.7 |
| 0.12, 1.62, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.09 | 28 | 57.7 |
| -0.01, 0.08, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.07 | 28 | 48.3 |
| -0.13, 1.10, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.09 | 26 | 32.3 |
| 0.12, 1.10, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.09 | 26 | 32.3 |
| -0.00, 0.07, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 1.91 | 25 | 33.6 |
| -0.39, -0.01, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.94 | 24 | 87.9 |
| 0.00, 0.07, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 1.91 | 24 | 33.6 |
| -0.35, 0.07, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 21 | 44.7 |
| -0.35, 1.02, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 45 |
| -0.03, 0.07, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 28.9 |
| -0.03, 1.02, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 28.9 |
| 0.03, 0.07, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 28.9 |
| 0.03, 1.02, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 28.9 |
| 0.35, 0.07, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.35, 1.02, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 45 |
| -0.37, 1.61, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.31 | 18 | 90 |
| -0.13, 1.10, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.03 | 17 | 90 |
| 0.12, 1.10, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.03 | 16 | 90 |
| -0.39, 1.83, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 12 | 44.5 |
| -0.24, 1.67, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 12 | 44.9 |
| -0.39, 1.61, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.52 | 10 | 44.1 |
| 0.22, 1.74, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 10 | 44.9 |
| 0.29, 1.73, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 10 | 44.5 |
| -0.34, 0.98, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.32 | 10 | 90 |
| -0.34, 0.15, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.32 | 10 | 90 |
| 0.03, 0.98, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.32 | 10 | 90 |
| 0.03, 0.15, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.32 | 10 | 90 |
| -0.14, 1.69, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.49 | 8 | 44.9 |
| -0.09, 1.69, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.49 | 8 | 44.9 |
| -0.02, 1.80, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.49 | 8 | 45 |
| 0.08, 1.74, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.49 | 8 | 44.9 |
| 0.14, 1.69, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.49 | 8 | 44.9 |
| 0.37, 1.70, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.52 | 8 | 44.1 |
| -0.18, 1.68, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.5 | 6 | 45 |

(94 more in the JSON)

## opening (info, 43)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.47, 1.52, -0.22 | winB.lod0/brick_red_brussels | 1 + 0 + 0 | 1.569 |
| -0.42, 1.59, -0.22 | winB.lod0/brick_red_brussels | 0.46 + -0.89 + 0 | 0.113 |
| -0.32, 1.64, -0.22 | winB.lod0/brick_red_brussels | 0.35 + -0.94 + 0 | 0.107 |
| -0.23, 1.67, -0.22 | winB.lod0/brick_red_brussels | 0.25 + -0.97 + 0 | 0.084 |
| -0.16, 1.68, -0.22 | winB.lod0/brick_red_brussels | 0.17 + -0.99 + 0 | 0.063 |
| -0.09, 1.69, -0.22 | winB.lod0/brick_red_brussels | 0.1 + -0.99 + 0 | 0.063 |
| -0.03, 1.69, -0.22 | winB.lod0/brick_red_brussels | 0.03 + -1 + 0 | 0.062 |
| 0.03, 1.69, -0.22 | winB.lod0/brick_red_brussels | -0.03 + -1 + 0 | 0.062 |
| 0.09, 1.69, -0.22 | winB.lod0/brick_red_brussels | -0.1 + -0.99 + 0 | 0.063 |
| 0.16, 1.68, -0.22 | winB.lod0/brick_red_brussels | -0.17 + -0.99 + 0 | 0.063 |
| 0.23, 1.67, -0.22 | winB.lod0/brick_red_brussels | -0.25 + -0.97 + 0 | 0.084 |
| 0.32, 1.64, -0.22 | winB.lod0/brick_red_brussels | -0.35 + -0.94 + 0 | 0.107 |
| 0.42, 1.59, -0.22 | winB.lod0/brick_red_brussels | -0.46 + -0.89 + 0 | 0.113 |
| 0.47, 0.04, -0.22 | winB.lod0/brick_red_brussels | -1 + 0 + 0 | 1.569 |
| -0.42, -0.00, -0.22 | winB.lod0/brick_red_brussels | 0 + 1 + 0.04 | 0.936 |
| -0.47, 0.05, -0.17 | winB.lod0/wood_frame_white | -1 + 0 + 0 | 1.565 |
| -0.22, 1.67, -0.17 | winB.lod0/wood_frame_white | -0.24 + 0.97 + 0 | 0.061 |
| -0.17, 1.68, -0.17 | winB.lod0/wood_frame_white | -0.19 + 0.98 + 0 | 0.048 |
| -0.07, 1.69, -0.17 | winB.lod0/wood_frame_white | -0.08 + 1 + 0 | 0.048 |
| -0.02, 1.69, -0.17 | winB.lod0/wood_frame_white | -0.03 + 1 + 0 | 0.048 |
| 0.02, 1.69, -0.17 | winB.lod0/wood_frame_white | 0.03 + 1 + 0 | 0.048 |
| 0.07, 1.69, -0.17 | winB.lod0/wood_frame_white | 0.08 + 1 + 0 | 0.048 |
| 0.17, 1.68, -0.17 | winB.lod0/wood_frame_white | 0.19 + 0.98 + 0 | 0.048 |
| 0.22, 1.67, -0.17 | winB.lod0/wood_frame_white | 0.24 + 0.97 + 0 | 0.061 |
| 0.47, 1.52, -0.17 | winB.lod0/wood_frame_white | 1 + 0 + 0 | 1.565 |
| -0.62, 0.00, -0.03 | sill.lod0/stone_blue | 0 + 1 + 0.02 | 1.336 |
| -0.67, -0.05, -0.03 | sill.lod0/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.67, -0.05, -0.03 | sill.lod0/stone_blue | 1 + 0 + 0 | 0.102 |
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

(3 more in the JSON)

## backtoback (info, 323)

| at | parts | area |
|---|---|---|
| -0.47, 0.46, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.03695 |
| -0.47, 0.74, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.02237 |
| 0.47, 0.43, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00756 |
| 0.47, 0.22, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.02208 |
| -0.44, 1.58, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0022 |
| -0.43, 1.59, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00201 |
| -0.35, 1.62, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00081 |
| -0.32, 1.64, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00097 |
| -0.35, 1.63, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00189 |
| -0.30, 1.64, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00038 |
| -0.26, 1.66, -0.12 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00013 |
| -0.23, 1.66, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00132 |
| -0.26, 1.66, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00094 |
| -0.22, 1.67, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0008 |
| -0.17, 1.68, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00109 |
| -0.14, 1.68, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00006 |
| -0.16, 1.68, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00124 |
| -0.12, 1.69, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00049 |
| -0.09, 1.69, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00055 |
| -0.11, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00115 |
| -0.08, 1.69, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0002 |
| -0.06, 1.69, -0.12 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00012 |
| -0.04, 1.69, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.001 |
| -0.06, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00069 |
| -0.03, 1.69, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00056 |
| 0.01, 1.69, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00128 |
| 0.03, 1.69, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00109 |
| 0.08, 1.69, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00068 |
| 0.10, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00033 |
| 0.08, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00125 |
| 0.10, 1.69, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00011 |
| 0.13, 1.69, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00023 |
| 0.15, 1.68, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00087 |
| 0.13, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00089 |
| 0.16, 1.68, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00042 |
| 0.21, 1.67, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00159 |
| 0.19, 1.68, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00024 |
| 0.23, 1.66, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00134 |
| 0.29, 1.64, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00128 |
| 0.33, 1.63, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0005 |

(283 more in the JSON)
