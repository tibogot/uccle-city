# Kit audit: doorA.ref LOD0

4,252 triangles, 2,258 welded vertices, 99 open edges, 22,072 rays, 277 ms.

**0 blocking**, 753 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 740 |
| nonmanifold | warn | 3 |
| tjunction | warn | 6 |
| seam | info | 151 |
| opening | info | 10 |
| backtoback | info | 126 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.82, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 1.5 | 1.8 | 4.1 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.39, 2.82, 0.05 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 103.7 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| 0.43, 2.81, 0.06 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 977 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.29, 2.81, 0.09 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 1224.9 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |

## sliver (warn, 740)

| at | part | aspect | longest |
|---|---|---|---|
| -0.74, 1.65, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.75, 1.65, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.74, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.75, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.56, 0.98, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.55, 0.98, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.56, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.55, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.75, 0.98, 0.02 | doorA.lod0/stone_blue | 47 | 2.016 |
| -0.55, 1.65, 0.02 | doorA.lod0/stone_blue | 47 | 2.016 |
| -0.76, 0.20, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.77, 0.20, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.76, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.77, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.56, 0.10, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.55, 0.10, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.56, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.55, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.72, 1.57, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.72, 1.57, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.72, 1.00, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.72, 1.00, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.58, 1.00, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.58, 1.00, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.58, 1.57, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.58, 1.57, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| -0.72, 1.00, 0.06 | doorA.lod0/stone_blue | 287 | 1.722 |
| -0.58, 1.57, 0.06 | doorA.lod0/stone_blue | 287 | 1.722 |
| 0.56, 1.65, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.55, 1.65, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.56, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.55, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.74, 0.98, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.75, 0.98, 0.00 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.74, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.75, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.55, 0.98, 0.02 | doorA.lod0/stone_blue | 47 | 2.016 |
| 0.75, 1.65, 0.02 | doorA.lod0/stone_blue | 47 | 2.016 |
| 0.56, 0.20, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.55, 0.20, 0.00 | doorA.lod0/stone_blue | 46 | 0.284 |

(700 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.83, 2.67, 0.01 | doorA.lod0/stone_blue | 3 |
| -0.83, 2.67, 0.01 | doorA.lod0/stone_blue | 3 |
| 0.00, 2.67, 0.02 | doorA.lod0/stone_blue | 3 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| 0.83, 2.82, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.83, 2.82, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 151)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.14, 2.15, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.17 | 72 | 81 |
| 0.47, 2.15, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/cast_iron_green | 0.12 | 68 | 22.5 |
| -0.42, 2.15, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| -0.31, 2.15, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| -0.21, 2.15, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.21, 2.13, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.32, 2.13, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.42, 2.13, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.88, 2.81, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.38 | 34 | 90 |
| -0.95, 2.81, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.38 | 34 | 90 |
| -0.31, 0.25, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.21 | 34 | 74.7 |
| 0.10, 0.25, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.21 | 34 | 74.7 |
| -0.31, 0.90, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.97 | 34 | 74.7 |
| 0.10, 0.90, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.97 | 34 | 74.7 |
| -0.58, 1.57, 0.06 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 3.73 | 26 | 90 |
| 0.72, 1.57, 0.06 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 3.73 | 26 | 90 |
| -0.36, 0.69, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.41 | 26 | 44.7 |
| 0.36, 0.81, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.41 | 26 | 44.7 |
| 0.02, 1.72, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 44.7 |
| -0.04, 0.20, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 44.7 |
| -0.04, 0.85, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 44.7 |
| 0.02, 0.69, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 44.7 |
| 0.07, 0.79, -0.17 | doorA.lod0/wood_frame_dark + doorA.lod0/painted_metal_white | 0.61 | 26 | 67.5 |
| -0.47, 1.83, -0.16 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 24 | 44.7 |
| 0.47, 1.83, -0.24 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 24 | 44.7 |
| -0.47, 2.44, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| 0.47, 2.44, -0.24 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| -0.36, 0.01, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.49 | 20 | 44.7 |
| -0.36, 1.82, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 20 | 44.7 |
| 0.36, 0.00, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.49 | 20 | 44.7 |
| 0.36, 1.82, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 20 | 44.7 |
| -0.57, -0.01, 0.30 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 2.81 | 18 | 45 |
| -0.04, 0.20, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.98 | 16 | 90 |
| 0.05, 0.69, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.98 | 16 | 90 |
| -0.04, 0.84, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.74 | 16 | 90 |
| 0.05, 1.71, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.74 | 16 | 90 |
| 0.36, 1.72, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| -0.36, 0.84, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| 0.36, 0.69, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| -0.42, 1.92, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/cast_iron_green | 0.02 | 14 | 31.9 |

(111 more in the JSON)

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.40, -0.30 | doorA.lod0/stone_blue | 1 + 0 + 0 | 2.452 |
| -0.50, 2.45, -0.30 | doorA.lod0/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.04, -0.30 | doorA.lod0/stone_blue | -1 + 0 + 0 | 2.452 |
| 0.79, 2.81, 0.16 | doorA.lod0/zinc_roof | 0 + 1 + 0.06 | 1.67 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.88, 0.00 | wall/wall | 0 + 0 + 1 | 1.552 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 126)

| at | parts | area |
|---|---|---|
| -0.55, 0.92, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.07768 |
| -0.55, 1.04, -0.18 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.0328 |
| 0.55, 0.41, -0.23 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00507 |
| 0.55, 0.45, -0.20 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.04983 |
| -0.52, 2.45, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00231 |
| -0.50, 2.45, -0.19 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00231 |
| -0.09, 2.45, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.03044 |
| -0.05, 2.45, -0.18 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.01371 |
| -0.68, 1.65, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.1895 |
| -0.64, 0.30, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00201 |
| -0.58, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00159 |
| -0.68, 2.33, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00227 |
| -0.72, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0014 |
| -0.69, 0.20, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.02897 |
| -0.63, 0.00, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00531 |
| -0.71, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00271 |
| -0.69, 2.37, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00438 |
| -0.59, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00277 |
| -0.69, 2.39, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.003 |
| -0.73, 2.39, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00198 |
| -0.70, 2.42, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0042 |
| -0.59, 2.39, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00352 |
| -0.68, 2.45, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00524 |
| 0.62, 1.65, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.1895 |
| 0.68, 0.30, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00244 |
| 0.72, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00124 |
| 0.64, 2.33, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00195 |
| 0.58, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00164 |
| 0.63, 0.20, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.02897 |
| 0.65, 0.00, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0026 |
| 0.59, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00297 |
| 0.62, 2.37, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00438 |
| 0.71, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00258 |
| 0.65, 2.39, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0026 |
| 0.59, 2.39, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00228 |
| 0.63, 2.42, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0042 |
| 0.73, 2.39, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00328 |
| 0.64, 2.45, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00486 |
| 0.61, 2.45, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00041 |
| -0.66, 2.57, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.04322 |

(86 more in the JSON)
