# Kit audit: doorB.big LOD1

280 triangles, 202 welded vertices, 58 open edges, 19,940 rays, 13 ms.

**0 blocking**, 28 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 18 |
| nonmanifold | warn | 6 |
| tjunction | warn | 4 |
| seam | info | 80 |
| opening | info | 9 |
| backtoback | info | 117 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 18)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.82, -0.07 | doorB.lod1/stone_white | 125 | 2.496 |
| -0.56, 0.82, 0.03 | doorB.lod1/stone_white | 88 | 2.483 |
| -0.70, 0.87, 0.04 | doorB.lod1/stone_white | 372 | 2.633 |
| -0.70, 0.88, 0.02 | doorB.lod1/stone_white | 68 | 2.638 |
| -0.19, 2.48, 0.03 | doorB.lod1/stone_white | 40 | 1.12 |
| -0.23, 2.63, 0.04 | doorB.lod1/stone_white | 199 | 1.405 |
| 0.56, 1.66, 0.03 | doorB.lod1/stone_white | 88 | 2.503 |
| 0.70, 1.75, 0.04 | doorB.lod1/stone_white | 373 | 2.638 |
| 0.70, 1.75, 0.02 | doorB.lod1/stone_white | 68 | 2.638 |
| -0.56, 1.66, 0.03 | doorB.lod1/stone_white | 88 | 2.503 |
| -0.70, 1.75, 0.04 | doorB.lod1/stone_white | 373 | 2.638 |
| -0.70, 1.75, 0.01 | doorB.lod1/stone_white | 68 | 2.638 |
| 0.18, 2.49, 0.03 | doorB.lod1/stone_white | 40 | 1.14 |
| 0.23, 2.63, 0.04 | doorB.lod1/stone_white | 199 | 1.41 |
| 0.55, 0.82, 0.01 | doorB.lod1/stone_white | 124 | 2.483 |
| 0.56, 0.82, 0.03 | doorB.lod1/stone_white | 88 | 2.483 |
| 0.70, 0.87, 0.04 | doorB.lod1/stone_white | 372 | 2.633 |
| 0.70, 0.88, 0.01 | doorB.lod1/stone_white | 68 | 2.638 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.47, 2.48, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.47, 2.48, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 1.86, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 1.86, -0.17 | doorB.lod1/wood_frame_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 80)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.55, 0.00, -0.12 | doorB.lod1/stone_white + doorB.lod1/stone_blue | 0.88 | 21 | 90 |
| -0.55, 1.06, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.41 | 12 | 90 |
| 0.55, 0.00, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.41 | 10 | 90 |
| -0.70, 2.63, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 2.89 | 10 | 45 |
| -0.24, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.72 | 10 | 90 |
| 0.18, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.72 | 10 | 90 |
| -0.55, 0.09, 0.00 | doorB.lod1/stone_white + wall/wall | 5.43 | 9 | 90 |
| 0.55, 1.14, 0.00 | doorB.lod1/stone_white + wall/wall | 5.43 | 8 | 90 |
| -0.47, 1.94, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.48 | 8 | 90 |
| 0.47, 1.86, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.48 | 8 | 90 |
| -0.38, 1.03, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.68 | 8 | 90 |
| 0.38, 0.89, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.68 | 8 | 90 |
| -0.04, 0.20, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| 0.00, 0.89, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| -0.01, 1.38, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.16 | 8 | 90 |
| 0.01, 1.41, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.16 | 8 | 90 |
| 0.00, 2.78, -0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 4.64 | 7 | 90 |
| -0.47, 1.09, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.88 | 7 | 90 |
| 0.47, 0.00, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.88 | 7 | 90 |
| -0.44, 2.48, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 2.05 | 6 | 90 |
| -0.01, 2.78, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.06, 2.82, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.47, 0.00, -0.19 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.3 | 6 | 90 |
| 0.38, 0.00, -0.17 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.31 | 6 | 90 |
| -0.47, 2.40, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| -0.22, 1.94, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| 0.01, 1.86, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.61 | 6 | 90 |
| -0.38, 1.41, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.00, 1.75, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.01, 1.03, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.38, 1.38, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.25, 1.41, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.01, 1.38, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.14, 1.41, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.26, 0.00, 0.00 | doorB.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| -0.47, 1.86, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| 0.47, 1.86, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| -0.38, 1.75, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| 0.02, 1.03, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| -0.04, 2.48, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 4 | 90 |

(40 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.24 | doorB.lod1/stone_white | 1 + 0 + 0 | 2.483 |
| 0.55, 0.05, -0.24 | doorB.lod1/stone_white | -1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.24 | doorB.lod1/stone_white | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.83, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 117)

| at | parts | area |
|---|---|---|
| -0.55, 1.02, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.09006 |
| -0.55, 1.10, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.03959 |
| 0.55, 0.27, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00232 |
| 0.55, 0.38, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.0493 |
| -0.55, 2.06, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00051 |
| -0.55, 1.68, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00382 |
| -0.53, 2.48, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.50, 2.48, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.38, 2.48, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.01287 |
| -0.25, 2.48, -0.14 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00451 |
| -0.21, 2.78, -0.01 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02996 |
| -0.53, 2.78, 0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02254 |
| 0.46, 2.78, 0.03 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.0345 |
| 0.55, 1.44, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.09063 |
| 0.55, 1.33, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04365 |
| -0.04, 2.48, -0.19 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.02275 |
| 0.17, 2.48, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.03112 |
| 0.50, 2.48, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| 0.53, 2.48, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.55, 2.21, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00238 |
| -0.55, 2.10, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04954 |
| -0.14, 2.78, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.018 |
| -0.50, 0.00, -0.18 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00281 |
| -0.53, 0.00, -0.15 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00281 |
| -0.41, 0.00, -0.18 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00275 |
| 0.13, 0.00, -0.18 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.02062 |
| -0.44, 0.00, -0.16 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00275 |
| -0.13, 0.00, -0.16 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.02062 |
| 0.52, 0.00, -0.20 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00126 |
| 0.44, 0.00, -0.18 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00235 |
| 0.48, 0.00, -0.18 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00052 |
| 0.40, 0.00, -0.16 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00216 |
| 0.53, 0.00, -0.17 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00155 |
| 0.47, 0.00, -0.15 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.0004 |
| 0.50, 0.00, -0.15 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00229 |
| 0.44, 0.00, -0.14 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.00059 |
| -0.47, 1.09, -0.19 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.01743 |
| -0.47, 1.60, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.0178 |
| -0.47, 1.89, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00286 |
| -0.47, 1.92, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00181 |

(77 more in the JSON)
