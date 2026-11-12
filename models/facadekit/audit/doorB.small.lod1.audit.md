# Kit audit: doorB.small LOD1

280 triangles, 202 welded vertices, 58 open edges, 19,852 rays, 11 ms.

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
| -0.55, 0.80, -0.07 | doorB.lod1/stone_white | 123 | 2.439 |
| -0.56, 0.80, 0.03 | doorB.lod1/stone_white | 86 | 2.425 |
| -0.70, 0.85, 0.04 | doorB.lod1/stone_white | 364 | 2.575 |
| -0.70, 0.86, 0.02 | doorB.lod1/stone_white | 66 | 2.58 |
| -0.19, 2.43, 0.03 | doorB.lod1/stone_white | 40 | 1.12 |
| -0.23, 2.57, 0.04 | doorB.lod1/stone_white | 199 | 1.405 |
| 0.56, 1.62, 0.03 | doorB.lod1/stone_white | 86 | 2.445 |
| 0.70, 1.71, 0.04 | doorB.lod1/stone_white | 365 | 2.58 |
| 0.70, 1.72, 0.02 | doorB.lod1/stone_white | 66 | 2.58 |
| -0.56, 1.62, 0.03 | doorB.lod1/stone_white | 86 | 2.445 |
| -0.70, 1.71, 0.04 | doorB.lod1/stone_white | 365 | 2.58 |
| -0.70, 1.72, 0.01 | doorB.lod1/stone_white | 66 | 2.58 |
| 0.18, 2.43, 0.03 | doorB.lod1/stone_white | 40 | 1.14 |
| 0.23, 2.57, 0.04 | doorB.lod1/stone_white | 199 | 1.41 |
| 0.55, 0.80, 0.01 | doorB.lod1/stone_white | 121 | 2.425 |
| 0.56, 0.80, 0.03 | doorB.lod1/stone_white | 86 | 2.425 |
| 0.70, 0.85, 0.04 | doorB.lod1/stone_white | 364 | 2.575 |
| 0.70, 0.86, 0.01 | doorB.lod1/stone_white | 66 | 2.58 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.47, 2.42, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.47, 2.42, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 1.81, -0.17 | doorB.lod1/wood_frame_white | 4 |
| -0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 0.00, -0.17 | doorB.lod1/wood_frame_white | 4 |
| 0.38, 1.81, -0.17 | doorB.lod1/wood_frame_white | 4 |

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
| -0.55, 1.03, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.29 | 12 | 90 |
| 0.55, 0.00, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 5.29 | 10 | 90 |
| -0.70, 2.57, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 2.89 | 10 | 45 |
| -0.24, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.68 | 10 | 90 |
| 0.18, 0.24, -0.16 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.68 | 10 | 90 |
| -0.55, 0.09, 0.00 | doorB.lod1/stone_white + wall/wall | 5.32 | 9 | 90 |
| 0.55, 1.11, 0.00 | doorB.lod1/stone_white + wall/wall | 5.32 | 8 | 90 |
| -0.47, 1.89, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| 0.47, 1.81, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| -0.38, 1.01, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.66 | 8 | 90 |
| 0.38, 0.87, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.66 | 8 | 90 |
| -0.04, 0.20, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| 0.00, 0.87, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.47 | 8 | 90 |
| -0.01, 1.35, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.15 | 8 | 90 |
| 0.01, 1.37, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.15 | 8 | 90 |
| 0.00, 2.72, -0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 4.64 | 7 | 90 |
| -0.47, 1.06, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.78 | 7 | 90 |
| 0.47, 0.00, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 3.78 | 7 | 90 |
| -0.44, 2.42, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 2.05 | 6 | 90 |
| -0.01, 2.72, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.06, 2.76, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 6 | 90 |
| 0.47, 0.00, -0.19 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.3 | 6 | 90 |
| 0.38, 0.00, -0.17 | doorB.lod1/stone_blue + doorB.lod1/wood_frame_white | 0.31 | 6 | 90 |
| -0.47, 2.35, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| -0.22, 1.89, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.96 | 6 | 90 |
| 0.01, 1.81, -0.20 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 1.61 | 6 | 90 |
| -0.38, 1.37, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.00, 1.71, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.01, 1.01, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.38, 1.35, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.25, 1.37, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.01, 1.35, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| 0.14, 1.37, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 6 | 90 |
| -0.26, 0.00, 0.00 | doorB.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| -0.47, 1.81, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| 0.47, 1.81, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.36 | 5 | 90 |
| -0.38, 1.71, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| 0.02, 1.01, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/glass_window | 0.37 | 5 | 90 |
| -0.04, 2.42, 0.00 | doorB.lod1/stone_white + wall/wall | 2.2 | 4 | 90 |

(40 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.24 | doorB.lod1/stone_white | 1 + 0 + 0 | 2.425 |
| 0.55, 0.05, -0.24 | doorB.lod1/stone_white | -1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.24 | doorB.lod1/stone_white | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.77, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 117)

| at | parts | area |
|---|---|---|
| -0.55, 0.99, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.08797 |
| -0.55, 1.07, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.03867 |
| 0.55, 0.26, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00226 |
| 0.55, 0.37, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04815 |
| -0.55, 2.01, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.0005 |
| -0.55, 1.64, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00373 |
| -0.53, 2.42, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.50, 2.42, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.38, 2.42, -0.17 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.01287 |
| -0.25, 2.42, -0.14 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00451 |
| -0.21, 2.72, -0.01 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02996 |
| -0.53, 2.72, 0.02 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.02254 |
| 0.46, 2.72, 0.03 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.0345 |
| 0.55, 1.41, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.08853 |
| 0.55, 1.30, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.04264 |
| -0.04, 2.42, -0.19 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.02275 |
| 0.17, 2.42, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.03112 |
| 0.50, 2.42, -0.18 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| 0.53, 2.42, -0.15 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00281 |
| -0.55, 2.16, -0.20 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.00232 |
| -0.55, 2.05, -0.16 | doorB.lod1/stone_white + doorB.lod1/wood_frame_white | 0.0484 |
| -0.14, 2.72, 0.04 | doorB.lod1/stone_white + doorB.lod1/stone_white | 0.018 |
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
| -0.47, 1.06, -0.19 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.01692 |
| -0.47, 1.56, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.01722 |
| -0.47, 1.83, -0.18 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00277 |
| -0.47, 1.87, -0.17 | doorB.lod1/wood_frame_white + doorB.lod1/wood_frame_white | 0.00174 |

(77 more in the JSON)
