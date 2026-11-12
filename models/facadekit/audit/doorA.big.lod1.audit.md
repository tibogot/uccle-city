# Kit audit: doorA.big LOD1

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
| 0.00, 2.85, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 1.5 | 1.8 | 4.1 | 119 | 0.91 | false | 0 + 1 + 0.07 |

## sliver (warn, 84)

| at | part | aspect | longest |
|---|---|---|---|
| 0.32, 2.83, 0.16 | doorA.lod1/stone_blue | 194 | 1.94 |
| 0.29, 2.72, 0.06 | doorA.lod1/stone_blue | 67 | 1.751 |
| 0.28, 2.70, 0.05 | doorA.lod1/stone_blue | 95 | 1.731 |
| 0.28, 2.70, 0.03 | doorA.lod1/stone_blue | 93 | 1.697 |
| -0.28, 2.85, 0.00 | doorA.lod1/stone_blue | 55 | 1.66 |
| 0.28, 2.70, 0.00 | doorA.lod1/stone_blue | 55 | 1.66 |
| -0.23, -0.01, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.31 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.01, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.32, 2.83, 0.16 | doorA.lod1/stone_blue | 194 | 1.94 |
| -0.29, 2.71, 0.06 | doorA.lod1/stone_blue | 67 | 1.741 |
| -0.29, 2.70, 0.04 | doorA.lod1/stone_blue | 95 | 1.714 |
| -0.28, 2.70, 0.03 | doorA.lod1/stone_blue | 93 | 1.678 |
| 0.28, 2.85, 0.01 | doorA.lod1/stone_blue | 55 | 1.66 |
| -0.28, 2.70, 0.01 | doorA.lod1/stone_blue | 55 | 1.66 |
| 0.23, -0.01, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.29 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.31 | doorA.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.01, 0.30 | doorA.lod1/stone_blue | 115 | 1.38 |
| -0.16, 1.84, -0.13 | doorA.lod1/wood_frame_dark | 88 | 0.94 |
| -0.16, 1.85, -0.13 | doorA.lod1/wood_frame_dark | 76 | 0.94 |
| -0.16, 1.86, -0.13 | doorA.lod1/wood_frame_dark | 48 | 0.94 |
| -0.16, 1.87, -0.15 | doorA.lod1/wood_frame_dark | 50 | 0.94 |
| -0.10, 1.17, -0.19 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| -0.32, 1.43, -0.19 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| 0.32, 1.17, -0.19 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| 0.10, 1.43, -0.19 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| 0.16, 1.84, -0.13 | doorA.lod1/wood_frame_dark | 88 | 0.94 |
| 0.16, 1.85, -0.13 | doorA.lod1/wood_frame_dark | 76 | 0.94 |
| 0.16, 1.87, -0.14 | doorA.lod1/wood_frame_dark | 48 | 0.94 |
| 0.16, 1.88, -0.15 | doorA.lod1/wood_frame_dark | 50 | 0.94 |
| -0.10, 1.43, -0.18 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| -0.32, 1.17, -0.18 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| 0.32, 1.43, -0.18 | doorA.lod1/wood_frame_dark | 42 | 0.792 |
| 0.10, 1.17, -0.18 | doorA.lod1/wood_frame_dark | 42 | 0.792 |

(44 more in the JSON)

## nonmanifold (warn, 9)

| at | part | uses |
|---|---|---|
| -0.83, 2.70, 0.01 | doorA.lod1/stone_blue | 3 |
| 0.83, 2.70, 0.01 | doorA.lod1/stone_blue | 3 |
| 0.00, 2.70, 0.02 | doorA.lod1/stone_blue | 3 |
| -0.47, 2.48, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.47, 2.48, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| -0.36, 1.85, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| -0.36, 0.00, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.36, 0.00, -0.20 | doorA.lod1/wood_frame_dark | 4 |
| 0.36, 1.85, -0.20 | doorA.lod1/wood_frame_dark | 4 |

## tjunction (warn, 10)

| at | part | edge_m |
|---|---|---|
| 0.55, 0.30, 0.00 | doorA.lod1/stone_blue | 2.483 |
| -0.55, 0.30, 0.00 | doorA.lod1/stone_blue | 2.483 |
| 0.83, 2.85, -0.01 | doorA.lod1/stone_blue | 0.15 |
| -0.83, 2.85, -0.01 | doorA.lod1/stone_blue | 0.15 |
| -0.47, 1.85, -0.16 | doorA.lod1/wood_frame_dark | 0.041 |
| 0.47, 1.85, -0.16 | doorA.lod1/wood_frame_dark | 0.041 |
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 122)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.14, 2.18, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.18 | 40 | 81 |
| -0.41, 2.18, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| -0.31, 2.18, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| -0.21, 2.18, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.21, 2.17, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.32, 2.17, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.42, 2.17, -0.18 | doorA.lod1/cast_iron_green + doorA.lod1/cast_iron_green | 0.06 | 16 | 60 |
| 0.88, 2.85, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.38 | 15 | 86.5 |
| -0.95, 2.84, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.38 | 15 | 86.5 |
| -0.55, 0.99, -0.24 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 5.44 | 10 | 90 |
| 0.55, 0.00, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 5.44 | 10 | 90 |
| -0.48, -0.01, 0.30 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 2.8 | 10 | 60 |
| -0.23, 0.24, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.24 | 10 | 90 |
| 0.18, 0.24, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.24 | 10 | 90 |
| -0.23, 0.90, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 2.02 | 10 | 90 |
| 0.18, 0.90, -0.19 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 2.02 | 10 | 90 |
| -0.47, 1.94, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.53 | 8 | 90 |
| 0.47, 1.85, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.53 | 8 | 90 |
| -0.36, 0.78, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.77 | 8 | 90 |
| 0.36, 0.69, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.77 | 8 | 90 |
| 0.00, 1.74, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.05, 0.20, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.05, 0.86, -0.21 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| 0.00, 0.69, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| -0.55, 0.00, -0.15 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.61 | 7 | 90 |
| -0.31, 2.70, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 3.16 | 7 | 90 |
| -0.47, 1.08, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 3.88 | 7 | 90 |
| 0.47, 0.00, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 3.88 | 7 | 90 |
| -0.07, 2.48, -0.24 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 2.04 | 6 | 90 |
| -0.60, 2.70, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 1.6 | 6 | 18.8 |
| -0.00, 2.85, 0.00 | doorA.lod1/stone_blue + wall/wall | 2.2 | 6 | 90 |
| 0.47, 0.00, -0.22 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.32 | 6 | 90 |
| 0.36, 0.00, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.34 | 6 | 90 |
| -0.47, 2.40, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/glass_window | 0.95 | 6 | 90 |
| -0.23, 1.94, -0.20 | doorA.lod1/wood_frame_dark + doorA.lod1/glass_window | 0.95 | 6 | 90 |
| 0.00, 1.85, -0.23 | doorA.lod1/wood_frame_dark + doorA.lod1/wood_frame_dark | 1.56 | 6 | 90 |
| -0.70, 0.00, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.45 | 5 | 90 |
| 0.55, 0.00, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.45 | 5 | 90 |
| -0.28, 0.00, 0.00 | doorA.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| 0.21, 2.40, -0.18 | doorA.lod1/wood_frame_dark + doorA.lod1/cast_iron_green | 0.03 | 5 | 89.6 |

(82 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.30 | doorA.lod1/stone_blue | 1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.30 | doorA.lod1/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.30 | doorA.lod1/stone_blue | -1 + 0 + 0 | 2.483 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.94, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 182)

| at | parts | area |
|---|---|---|
| -0.55, 0.95, -0.21 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.09372 |
| -0.55, 1.04, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.03837 |
| 0.55, 0.39, -0.23 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.00534 |
| 0.55, 0.46, -0.20 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.06054 |
| -0.52, 2.48, -0.21 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.0032 |
| -0.51, 2.48, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.0032 |
| -0.09, 2.48, -0.22 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.03639 |
| -0.06, 2.48, -0.18 | doorA.lod1/stone_blue + doorA.lod1/wood_frame_dark | 0.01588 |
| -0.65, 2.36, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00341 |
| -0.72, 2.36, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00209 |
| -0.65, 0.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00304 |
| -0.58, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00246 |
| -0.68, 1.67, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.20586 |
| -0.72, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00352 |
| -0.63, 0.00, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00741 |
| -0.70, 0.20, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.033 |
| -0.66, 2.42, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00454 |
| -0.73, 2.42, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00299 |
| -0.59, 2.36, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00373 |
| -0.69, 2.40, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.00645 |
| -0.63, 2.48, 0.00 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00078 |
| -0.72, 2.48, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00734 |
| -0.58, 2.42, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00489 |
| -0.67, 2.46, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.0069 |
| 0.65, 2.36, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00298 |
| 0.58, 2.36, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00252 |
| 0.65, 0.30, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00362 |
| 0.72, 0.30, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00188 |
| 0.62, 1.67, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.20586 |
| 0.59, 0.30, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00398 |
| 0.65, 0.00, 0.02 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00384 |
| 0.62, 0.20, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.033 |
| 0.66, 2.42, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.004 |
| 0.58, 2.42, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00352 |
| 0.72, 2.36, 0.03 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00337 |
| 0.62, 2.40, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.00645 |
| 0.68, 2.48, 0.01 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00754 |
| 0.60, 2.48, 0.05 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00058 |
| 0.74, 2.42, 0.04 | doorA.lod1/stone_blue + doorA.lod1/stone_blue | 0.00442 |
| 0.63, 2.46, 0.00 | doorA.lod1/stone_blue + wall/wall | 0.0069 |

(142 more in the JSON)
