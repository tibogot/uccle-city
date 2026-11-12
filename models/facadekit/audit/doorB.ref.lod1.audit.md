# Kit audit: doorB.ref LOD1

280 triangles, 202 welded vertices, 58 open edges, 19,956 rays, 21 ms.

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
| -0.55, 0.81, -0.07 | doorB.lod1/stone_white | 124 | 2.466 |
| -0.56, 0.81, 0.03 | doorB.lod1/stone_white | 87 | 2.452 |
| -0.70, 0.86, 0.04 | doorB.lod1/stone_white | 368 | 2.602 |
| -0.70, 0.86, 0.02 | doorB.lod1/stone_white | 67 | 2.607 |
| -0.19, 2.46, 0.03 | doorB.lod1/stone_white | 40 | 1.12 |
| -0.23, 2.60, 0.04 | doorB.lod1/stone_white | 199 | 1.405 |
| 0.56, 1.64, 0.03 | doorB.lod1/stone_white | 87 | 2.472 |
| 0.70, 1.73, 0.04 | doorB.lod1/stone_white | 369 | 2.607 |
| 0.70, 1.73, 0.02 | doorB.lod1/stone_white | 67 | 2.607 |
| -0.56, 1.64, 0.03 | doorB.lod1/stone_white | 87 | 2.472 |
| -0.70, 1.73, 0.04 | doorB.lod1/stone_white | 369 | 2.607 |
| -0.70, 1.73, 0.01 | doorB.lod1/stone_white | 67 | 2.607 |
| 0.18, 2.46, 0.03 | doorB.lod1/stone_white | 40 | 1.14 |
| 0.23, 2.60, 0.04 | doorB.lod1/stone_white | 199 | 1.41 |
| 0.55, 0.81, 0.01 | doorB.lod1/stone_white | 123 | 2.452 |
| 0.56, 0.81, 0.03 | doorB.lod1/stone_white | 87 | 2.452 |
| 0.70, 0.86, 0.04 | doorB.lod1/stone_white | 368 | 2.602 |
| 0.70, 0.86, 0.01 | doorB.lod1/stone_white | 67 | 2.607 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.47, 2.45, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.47, 2.45, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 1.83, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 1.83, -0.17 | doorB.lod1/wood_frame_white | 4 |

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
| -0.55, 1.04, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.35 | 12 | 90 |
| 0.55, 0.00, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.35 | 10 | 90 |
| -0.70, 2.60, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 2.89 | 10 | 45 |
| -0.24, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.7 | 10 | 90 |
| 0.18, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.7 | 10 | 90 |
| -0.55, 0.09, 0.00 | doorB.lod1/stone_white + wall/wall | 5.37 | 9 | 90 |
| 0.55, 1.13, 0.00 | doorB.lod1/stone_white + wall/wall | 5.37 | 8 | 90 |
| -0.47, 1.91, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| 0.47, 1.83, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| -0.38, 1.02, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.67 | 8 | 90 |
| 0.38, 0.88, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.67 | 8 | 90 |
| -0.04, 0.20, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| 0.00, 0.88, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| -0.01, 1.36, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.16 | 8 | 90 |
| 0.01, 1.39, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.16 | 8 | 90 |
| 0.00, 2.75, -0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 4.64 | 7 | 90 |
| -0.47, 1.08, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.83 | 7 | 90 |
| 0.47, 0.00, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.83 | 7 | 90 |
| -0.44, 2.45, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 2.05 | 6 | 90 |
| -0.01, 2.75, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.06, 2.79, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.47, 0.00, -0.19 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.3 | 6 | 90 |
| 0.38, 0.00, -0.17 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.31 | 6 | 90 |
| -0.47, 2.37, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| -0.22, 1.91, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| 0.01, 1.83, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.61 | 6 | 90 |
| -0.38, 1.39, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.00, 1.73, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.01, 1.02, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.38, 1.36, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.25, 1.39, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.01, 1.36, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.14, 1.39, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.26, 0.00, 0.00 | doorB.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| -0.47, 1.83, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| 0.47, 1.83, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| -0.38, 1.73, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| 0.02, 1.02, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| -0.04, 2.45, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 4 | 90 |

(40 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.40, -0.24 | doorB.lod1/stone_white | 1 + 0 + 0 | 2.452 |
| 0.55, 0.04, -0.24 | doorB.lod1/stone_white | -1 + 0 + 0 | 2.452 |
| -0.50, 2.45, -0.24 | doorB.lod1/stone_white | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.88, 0.00 | wall/wall | 0 + 0 + 1 | 1.552 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 117)

| at | parts | area |
|---|---|---|
| -0.55, 1.00, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.08895 |
| -0.55, 1.08, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.0391 |
| 0.55, 0.26, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00229 |
| 0.55, 0.37, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04869 |
| -0.55, 2.03, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.0005 |
| -0.55, 1.66, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00377 |
| -0.53, 2.45, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.50, 2.45, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.38, 2.45, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.01287 |
| -0.25, 2.45, -0.14 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00451 |
| -0.21, 2.75, -0.01 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02996 |
| -0.53, 2.75, 0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02254 |
| 0.46, 2.75, 0.03 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.0345 |
| 0.55, 1.42, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.08951 |
| 0.55, 1.31, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04311 |
| -0.04, 2.45, -0.19 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.02275 |
| 0.17, 2.45, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.03112 |
| 0.50, 2.45, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| 0.53, 2.45, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.55, 2.18, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00235 |
| -0.55, 2.07, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04893 |
| -0.14, 2.75, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.018 |
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
| -0.47, 1.08, -0.19 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.01715 |
| -0.47, 1.58, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.01749 |
| -0.47, 1.85, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00282 |
| -0.47, 1.89, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00177 |

(77 more in the JSON)
