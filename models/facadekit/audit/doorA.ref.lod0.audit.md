# Kit audit: doorA.ref LOD0

3,964 triangles, 2,114 welded vertices, 99 open edges, 20,472 rays, 267 ms.

**0 blocking**, 711 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 696 |
| nonmanifold | warn | 3 |
| tjunction | warn | 8 |
| seam | info | 160 |
| opening | info | 10 |
| backtoback | info | 164 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.82, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 1.5 | 1.8 | 4.1 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.39, 2.82, 0.05 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 103.7 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| 0.43, 2.81, 0.06 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 977 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.29, 2.81, 0.09 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 1224.9 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |

## sliver (warn, 696)

| at | part | aspect | longest |
|---|---|---|---|
| -0.74, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.75, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.56, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.55, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| -0.75, 0.98, 0.02 | doorA.lod0/stone_blue | 41 | 2.017 |
| -0.55, 1.65, 0.02 | doorA.lod0/stone_blue | 41 | 2.017 |
| -0.76, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.77, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
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
| 0.56, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.55, 0.98, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.74, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.75, 1.65, 0.05 | doorA.lod0/stone_blue | 439 | 2.016 |
| 0.55, 0.98, 0.02 | doorA.lod0/stone_blue | 41 | 2.017 |
| 0.75, 1.65, 0.02 | doorA.lod0/stone_blue | 41 | 2.017 |
| 0.56, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.55, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.76, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.77, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.58, 1.57, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.58, 1.57, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.58, 1.00, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.58, 1.00, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.72, 1.00, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.72, 1.00, 0.05 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.72, 1.57, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.72, 1.57, 0.06 | doorA.lod0/stone_blue | 750 | 1.722 |
| 0.58, 1.00, 0.06 | doorA.lod0/stone_blue | 287 | 1.722 |
| 0.72, 1.57, 0.06 | doorA.lod0/stone_blue | 287 | 1.722 |

(656 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.83, 2.67, 0.01 | doorA.lod0/stone_blue | 3 |
| -0.83, 2.67, 0.01 | doorA.lod0/stone_blue | 3 |
| 0.00, 2.67, 0.02 | doorA.lod0/stone_blue | 3 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| 0.55, 0.01, 0.00 | doorA.lod0/stone_blue | 2.452 |
| -0.55, 0.01, 0.00 | doorA.lod0/stone_blue | 2.452 |
| 0.83, 2.82, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.83, 2.82, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 160)

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

(120 more in the JSON)

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

## backtoback (info, 164)

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
| -0.62, 2.32, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0006 |
| -0.65, 0.30, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00251 |
| -0.58, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00199 |
| -0.65, 2.33, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00284 |
| -0.72, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00177 |
| -0.63, 0.29, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00088 |
| -0.63, 0.00, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00603 |
| -0.71, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00295 |
| -0.55, 2.37, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00024 |
| -0.59, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00303 |
| -0.66, 2.39, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00371 |
| -0.73, 2.39, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00246 |
| -0.56, 2.42, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0003 |
| -0.60, 2.39, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0039 |
| -0.66, 2.45, 0.00 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0006 |
| -0.70, 2.45, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00593 |
| 0.65, 2.32, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0006 |
| 0.66, 0.30, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00303 |
| 0.72, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00158 |
| 0.65, 2.33, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00245 |
| 0.59, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00205 |
| 0.66, 0.29, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00088 |
| 0.65, 0.00, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00295 |
| 0.60, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00326 |
| 0.76, 2.37, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00024 |
| 0.71, 2.33, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00281 |
| 0.66, 2.39, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00323 |
| 0.59, 2.39, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00282 |
| 0.77, 2.42, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0003 |
| 0.73, 2.39, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0036 |
| 0.64, 2.45, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00609 |
| 0.61, 2.45, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00044 |

(124 more in the JSON)
