# Kit audit: doorA.small LOD1

654 triangles, 404 welded vertices, 55 open edges, 18,094 rays, 19 ms.

**0 blocking**, 104 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 1 |
| sliver | warn | 84 |
| nonmanifold | warn | 9 |
| tjunction | warn | 10 |
| seam | info | 122 |
| opening | info | 9 |
| backtoback | info | 182 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.79, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 1.5 | 1.8 | 4.1 | 119 | 0.91 | false | 0 + 1 + 0.07 |

## sliver (warn, 84)

| at | part | aspect | longest |
|---|---|---|---|
| 0.32, 2.78, 0.16 | doorA.lod1/stone_blue | 194 | 1.94 |
| 0.29, 2.66, 0.06 | doorA.lod1/stone_blue | 67 | 1.751 |
| 0.28, 2.65, 0.05 | doorA.lod1/stone_blue | 95 | 1.731 |
| 0.28, 2.64, 0.03 | doorA.lod1/stone_blue | 93 | 1.697 |
| -0.28, 2.79, 0.00 | doorA.lod1/stone_blue | 55 | 1.66 |
| 0.28, 2.64, 0.00 | doorA.lod1/stone_blue | 55 | 1.66 |
| -0.23, -0.01, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.31 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.01, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.32, 2.77, 0.16 | doorA.lod1/stone_blue | 194 | 1.94 |
| -0.29, 2.65, 0.06 | doorA.lod1/stone_blue | 67 | 1.741 |
| -0.29, 2.64, 0.04 | doorA.lod1/stone_blue | 95 | 1.714 |
| -0.28, 2.64, 0.03 | doorA.lod1/stone_blue | 93 | 1.678 |
| 0.28, 2.79, 0.01 | doorA.lod1/stone_blue | 55 | 1.66 |
| -0.28, 2.64, 0.01 | doorA.lod1/stone_blue | 55 | 1.66 |
| 0.23, -0.01, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.31 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.01, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.16, 1.79, -0.13 | doorA.lod1/wood_frame_dark | 89 | 0.94 |
| -0.16, 1.80, -0.13 | doorA.lod1/wood_frame_dark | 78 | 0.94 |
| -0.16, 1.81, -0.13 | doorA.lod1/wood_frame_dark | 49 | 0.94 |
| -0.16, 1.82, -0.15 | doorA.lod1/wood_frame_dark | 50 | 0.94 |
| -0.10, 1.14, -0.19 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| -0.32, 1.39, -0.19 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| 0.32, 1.14, -0.19 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| 0.10, 1.39, -0.19 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| 0.16, 1.79, -0.13 | doorA.lod1/wood_frame_dark | 89 | 0.94 |
| 0.16, 1.80, -0.13 | doorA.lod1/wood_frame_dark | 78 | 0.94 |
| 0.16, 1.82, -0.14 | doorA.lod1/wood_frame_dark | 49 | 0.94 |
| 0.16, 1.82, -0.15 | doorA.lod1/wood_frame_dark | 50 | 0.94 |
| -0.10, 1.39, -0.18 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| -0.32, 1.14, -0.18 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| 0.32, 1.39, -0.18 | doorA.lod1/wood_frame_dark | 40 | 0.767 |
| 0.10, 1.14, -0.18 | doorA.lod1/wood_frame_dark | 40 | 0.767 |

(44 more in the JSON)

## nonmanifold (warn, 9)

| at | part | uses |
|---|---|---|
| -0.83, 2.64, 0.01 | doorA.lod1/stone_blue | 3 |
| 0.83, 2.64, 0.01 | doorA.lod1/stone_blue | 3 |
| 0.00, 2.64, 0.02 | doorA.lod1/stone_blue | 3 |
| -0.47, 2.42, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.47, 2.42, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| -0.36, 1.80, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| -0.36, 0.00, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.36, 0.00, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.36, 1.80, -0.20 | doorA.lod1/wood_frame_dark | 4 |

## tjunction (warn, 10)

| at | part | edge_m |
|---|---|---|
| 0.55, 0.30, 0.00 | doorA.lod1/stone_blue | 2.425 |
| -0.55, 0.30, 0.00 | doorA.lod1/stone_blue | 2.425 |
| 0.83, 2.79, -0.01 | doorA.lod1/stone_blue | 0.15 |
| -0.83, 2.79, -0.01 | doorA.lod1/stone_blue | 0.15 |
| -0.47, 1.80, -0.16 | doorA.lod1/wood_frame_dark | 0.039 |
| 0.47, 1.80, -0.16 | doorA.lod1/wood_frame_dark | 0.039 |
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 122)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.14, 2.12, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.18 | 40 | 81 |
| -0.41, 2.12, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| -0.31, 2.12, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| -0.21, 2.12, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.21, 2.11, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.32, 2.11, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.42, 2.11, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.88, 2.79, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.38 | 15 | 86.5 |
| -0.95, 2.78, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.38 | 15 | 86.5 |
| -0.55, 0.97, -0.24 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 5.32 | 10 | 90 |
| 0.55, 0.00, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 5.32 | 10 | 90 |
| -0.48, -0.01, 0.30 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 2.8 | 10 | 60 |
| -0.23, 0.24, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.22 | 10 | 90 |
| 0.18, 0.24, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.22 | 10 | 90 |
| -0.23, 0.88, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.97 | 10 | 90 |
| 0.18, 0.88, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.97 | 10 | 90 |
| -0.47, 1.85, -0.24 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.51 | 8 | 90 |
| 0.47, 1.80, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.51 | 8 | 90 |
| -0.36, 0.76, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.75 | 8 | 90 |
| 0.36, 0.68, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.75 | 8 | 90 |
| 0.00, 1.69, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.05, 0.20, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.05, 0.84, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| 0.00, 0.68, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.55, 0.00, -0.15 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.61 | 7 | 90 |
| -0.31, 2.64, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 3.16 | 7 | 90 |
| -0.47, 1.05, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 3.78 | 7 | 90 |
| 0.47, 0.00, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 3.78 | 7 | 90 |
| -0.07, 2.42, -0.24 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 2.04 | 6 | 90 |
| -0.60, 2.64, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 1.6 | 6 | 18.8 |
| -0.01, 2.79, 0.00 | doorA.lod1/stone_blue + wall/wall | 2.2 | 6 | 90 |
| 0.47, 0.00, -0.22 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.32 | 6 | 90 |
| 0.36, 0.00, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.34 | 6 | 90 |
| -0.47, 2.34, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/glass_window | 0.95 | 6 | 90 |
| -0.23, 1.89, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/glass_window | 0.95 | 6 | 90 |
| 0.00, 1.80, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.56 | 6 | 90 |
| -0.70, 0.00, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.45 | 5 | 90 |
| 0.55, 0.00, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.45 | 5 | 90 |
| -0.28, 0.00, 0.00 | doorA.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| 0.21, 2.34, -0.18 | doorA.lod1/wood_frame_dark + doorA.lod1/cast_iron_green | 0.03 | 5 | 89.6 |

(82 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.30 | doorA.lod1/stone_blue | 1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.30 | doorA.lod1/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.30 | doorA.lod1/stone_blue | -1 + 0 + 0 | 2.425 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.87, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 182)

| at | parts | area |
|---|---|---|
| -0.55, 0.92, -0.21 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.09154 |
| -0.55, 1.02, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.03748 |
| 0.55, 0.38, -0.23 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.00522 |
| 0.55, 0.45, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.05913 |
| -0.52, 2.42, -0.21 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.0032 |
| -0.51, 2.42, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.0032 |
| -0.09, 2.42, -0.22 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.03639 |
| -0.06, 2.42, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.01588 |
| -0.65, 2.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00341 |
| -0.72, 2.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00209 |
| -0.65, 0.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00304 |
| -0.58, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00246 |
| -0.65, 1.80, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.20011 |
| -0.72, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00352 |
| -0.63, 0.00, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00741 |
| -0.70, 0.20, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.033 |
| -0.66, 2.36, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00454 |
| -0.73, 2.36, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00299 |
| -0.59, 2.30, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00373 |
| -0.66, 2.35, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.00645 |
| -0.63, 2.42, 0.00 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00078 |
| -0.72, 2.42, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00734 |
| -0.58, 2.36, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00489 |
| -0.67, 2.41, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.0069 |
| 0.65, 2.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00298 |
| 0.58, 2.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00252 |
| 0.65, 0.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00362 |
| 0.72, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00188 |
| 0.62, 1.63, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.20011 |
| 0.59, 0.30, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00398 |
| 0.65, 0.00, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00384 |
| 0.62, 0.20, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.033 |
| 0.66, 2.36, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.004 |
| 0.58, 2.36, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00352 |
| 0.72, 2.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00337 |
| 0.62, 2.34, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.00645 |
| 0.68, 2.42, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00754 |
| 0.60, 2.42, 0.05 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00058 |
| 0.74, 2.36, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00442 |
| 0.61, 2.40, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.0069 |

(142 more in the JSON)
