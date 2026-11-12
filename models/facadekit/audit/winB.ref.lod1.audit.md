# Kit audit: winB.ref LOD1

453 triangles, 294 welded vertices, 119 open edges, 14,324 rays, 26 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 20 |
| nonmanifold | warn | 12 |
| tjunction | warn | 8 |
| seam | info | 60 |
| opening | info | 35 |
| backtoback | info | 217 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 20)

| at | part | aspect | longest |
|---|---|---|---|
| -0.73, 0.53, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| -0.60, 1.07, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| 0.60, 0.53, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| 0.73, 1.07, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| -0.73, 1.07, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| -0.60, 0.53, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| 0.60, 1.07, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| 0.73, 0.53, 0.00 | winB.lod1/brick_red_brussels | 267 | 1.6 |
| -0.53, 0.52, -0.12 | winB.lod1/wood_frame_white | 137 | 1.552 |
| -0.59, 0.53, -0.11 | winB.lod1/wood_frame_white | 141 | 1.595 |
| 0.54, 1.04, -0.11 | winB.lod1/wood_frame_white | 138 | 1.558 |
| 0.60, 1.06, -0.12 | winB.lod1/wood_frame_white | 141 | 1.6 |
| -0.02, 0.40, -0.12 | winB.lod1/wood_frame_white | 62 | 0.985 |
| 0.02, 0.73, -0.12 | winB.lod1/wood_frame_white | 62 | 0.985 |
| -0.54, 1.04, -0.11 | winB.lod1/wood_frame_white | 138 | 1.558 |
| -0.60, 1.06, -0.12 | winB.lod1/wood_frame_white | 141 | 1.6 |
| 0.53, 0.52, -0.12 | winB.lod1/wood_frame_white | 137 | 1.552 |
| 0.59, 0.53, -0.11 | winB.lod1/wood_frame_white | 141 | 1.595 |
| -0.02, 0.73, -0.11 | winB.lod1/wood_frame_white | 62 | 0.985 |
| 0.02, 0.40, -0.11 | winB.lod1/wood_frame_white | 62 | 0.985 |

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| -0.48, 1.05, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.48, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.05, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| -0.05, 1.05, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.00, 0.56, -0.17 | winB.lod1/wood_frame_white | 3 |
| 0.00, 1.05, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.14 | winB.lod1/wood_frame_white | 3 |
| 0.00, 0.56, -0.12 | winB.lod1/wood_frame_white | 3 |
| 0.05, 1.05, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.05, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.48, 0.07, -0.14 | winB.lod1/wood_frame_white | 4 |
| 0.48, 1.05, -0.14 | winB.lod1/wood_frame_white | 4 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| 0.60, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.604 |
| -0.60, 0.00, 0.00 | winB.lod1/brick_red_brussels | 1.604 |
| -0.53, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.552 |
| 0.53, 0.07, -0.17 | winB.lod1/wood_frame_white | 1.552 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 60)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.31, 1.70, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 1.25 | 36 | 90 |
| -0.60, 0.00, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 3.82 | 35 | 5 |
| -0.51, 1.56, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.92 | 30 | 90 |
| -0.50, -0.01, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 1.2 | 24 | 87.9 |
| -0.10, 1.73, 0.00 | winB.lod1/brick_red_brussels + winB.lod1/brick_red_brussels | 0.8 | 12 | 90 |
| -0.53, 1.06, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.49 | 12 | 45 |
| -0.21, 1.64, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 12 | 45 |
| 0.19, 1.65, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 12 | 45 |
| -0.21, 1.29, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.05 | 12 | 90 |
| 0.19, 1.30, -0.14 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 1.05 | 12 | 90 |
| -0.00, 0.07, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.06 | 11 | 90 |
| 0.00, 1.05, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 1.06 | 11 | 90 |
| -0.53, 0.00, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 8 | 45 |
| 0.53, 0.62, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 4.04 | 8 | 45 |
| -0.53, 0.56, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 4.03 | 7 | 45 |
| -0.48, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.05, 0.07, -0.16 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.21, 1.13, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.19, 1.13, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.23, 1.05, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.27, 1.05, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.53, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.53, 0.07, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.01, 0.07, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.09 | 5 | 90 |
| -0.53, 1.05, -0.14 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.50, 1.05, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.00, 1.03, -0.12 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.99 | 5 | 90 |
| -0.01, 1.05, -0.11 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.09 | 5 | 90 |
| -0.60, 0.00, -0.01 | winB.lod1/brick_red_brussels + sill.lod1/stone_blue | 0.06 | 4 | 89.9 |
| -0.73, 0.80, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.47 | 4 | 90 |
| 0.60, 0.80, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 3.47 | 4 | 90 |
| -0.05, 0.07, -0.15 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| 0.03, 0.07, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| -0.03, 1.05, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| 0.03, 1.05, -0.17 | winB.lod1/wood_frame_white + winB.lod1/wood_frame_white | 0.15 | 4 | 90 |
| -0.48, 1.00, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| -0.36, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.05, 1.00, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.17, 0.15, -0.15 | winB.lod1/wood_frame_white + winB.lod1/glass_window | 0.43 | 4 | 90 |
| 0.80, -0.02, 0.00 | sill.lod1/stone_blue + wall/wall | 0.5 | 4 | 84 |

(20 more in the JSON)

## opening (info, 35)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.55, -0.22 | winB.lod1/brick_red_brussels | 1 + 0 + 0 | 1.604 |
| -0.55, 1.62, -0.22 | winB.lod1/brick_red_brussels | 0.38 + -0.93 + 0 | 0.108 |
| -0.45, 1.66, -0.22 | winB.lod1/brick_red_brussels | 0.31 + -0.95 + 0 | 0.105 |
| -0.35, 1.69, -0.22 | winB.lod1/brick_red_brussels | 0.24 + -0.97 + 0 | 0.103 |
| -0.25, 1.71, -0.22 | winB.lod1/brick_red_brussels | 0.17 + -0.98 + 0 | 0.102 |
| -0.15, 1.72, -0.22 | winB.lod1/brick_red_brussels | 0.1 + -0.99 + 0 | 0.101 |
| -0.05, 1.73, -0.22 | winB.lod1/brick_red_brussels | 0.03 + -1 + 0 | 0.1 |
| 0.05, 1.73, -0.22 | winB.lod1/brick_red_brussels | -0.03 + -1 + 0 | 0.1 |
| 0.15, 1.72, -0.22 | winB.lod1/brick_red_brussels | -0.1 + -0.99 + 0 | 0.101 |
| 0.25, 1.71, -0.22 | winB.lod1/brick_red_brussels | -0.17 + -0.98 + 0 | 0.102 |
| 0.35, 1.69, -0.22 | winB.lod1/brick_red_brussels | -0.24 + -0.97 + 0 | 0.103 |
| 0.45, 1.66, -0.22 | winB.lod1/brick_red_brussels | -0.31 + -0.95 + 0 | 0.105 |
| 0.55, 1.62, -0.22 | winB.lod1/brick_red_brussels | -0.38 + -0.93 + 0 | 0.108 |
| -0.60, -0.01, -0.17 | winB.lod1/brick_red_brussels | 0 + 1 + 0.04 | 0.22 |
| 0.60, 0.05, -0.22 | winB.lod1/brick_red_brussels | -1 + 0 + 0 | 1.604 |
| 0.60, -0.01, -0.17 | winB.lod1/brick_red_brussels | 0 + 1 + 0.04 | 0.22 |
| -0.60, 0.05, -0.17 | winB.lod1/wood_frame_white | -1 + 0 + 0 | 1.6 |
| 0.60, 1.55, -0.17 | winB.lod1/wood_frame_white | 1 + 0 + 0 | 1.6 |
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
| 0.60, 1.85, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 217)

| at | parts | area |
|---|---|---|
| -0.60, 0.47, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.03778 |
| -0.60, 0.76, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02287 |
| 0.60, 0.44, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00774 |
| 0.60, 0.23, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.02258 |
| -0.57, 1.61, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00295 |
| -0.55, 1.62, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00115 |
| -0.48, 1.65, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0004 |
| -0.48, 1.65, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00225 |
| -0.45, 1.66, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00112 |
| -0.43, 1.66, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00022 |
| -0.37, 1.68, -0.13 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00144 |
| -0.36, 1.68, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00247 |
| -0.27, 1.70, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00265 |
| -0.26, 1.71, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00121 |
| -0.18, 1.72, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00039 |
| -0.14, 1.72, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00101 |
| -0.18, 1.72, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00223 |
| -0.13, 1.72, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00018 |
| -0.07, 1.73, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00229 |
| 0.03, 1.73, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0028 |
| 0.05, 1.73, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.001 |
| 0.13, 1.72, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00055 |
| 0.16, 1.72, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0006 |
| 0.13, 1.72, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00256 |
| 0.17, 1.72, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0001 |
| 0.33, 1.69, -0.14 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00262 |
| 0.30, 1.70, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0004 |
| 0.35, 1.69, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00088 |
| 0.43, 1.67, -0.12 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00063 |
| 0.46, 1.65, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00056 |
| 0.43, 1.66, -0.15 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0027 |
| 0.47, 1.65, -0.17 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.0001 |
| 0.54, 1.63, -0.16 | winB.lod1/brick_red_brussels + winB.lod1/wood_frame_white | 0.00234 |
| -0.42, 1.86, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00304 |
| -0.34, 1.80, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.01498 |
| -0.40, 1.85, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.0007 |
| -0.28, 1.86, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00522 |
| -0.30, 1.82, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00101 |
| -0.30, 1.71, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.00006 |
| -0.25, 1.81, 0.00 | winB.lod1/brick_red_brussels + wall/wall | 0.01188 |

(177 more in the JSON)
