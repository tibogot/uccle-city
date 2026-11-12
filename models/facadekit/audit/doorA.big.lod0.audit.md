# Kit audit: doorA.big LOD0

3,964 triangles, 2,114 welded vertices, 99 open edges, 20,408 rays, 142 ms.

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
| 0.00, 2.85, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 1.5 | 1.8 | 4.1 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.39, 2.85, 0.05 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 103.7 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| 0.43, 2.85, 0.06 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 977 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |
| -0.29, 2.84, 0.09 | doorA.lod0/stone_blue + doorA.lod0/zinc_roof | 2.51 | 1224.9 | 0.7 | 32 | 0.24 | false | 0 + 1 + 0.07 |

## sliver (warn, 696)

| at | part | aspect | longest |
|---|---|---|---|
| -0.74, 0.99, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| -0.75, 0.99, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| -0.56, 1.67, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| -0.55, 1.67, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| -0.75, 0.99, 0.02 | doorA.lod0/stone_blue | 42 | 2.047 |
| -0.55, 1.67, 0.02 | doorA.lod0/stone_blue | 42 | 2.047 |
| -0.76, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.77, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.56, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.55, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| -0.72, 1.59, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.72, 1.59, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.72, 1.01, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.72, 1.01, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.58, 1.01, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.58, 1.01, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.58, 1.59, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.58, 1.59, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| -0.72, 1.01, 0.06 | doorA.lod0/stone_blue | 292 | 1.751 |
| -0.58, 1.59, 0.06 | doorA.lod0/stone_blue | 292 | 1.751 |
| 0.56, 0.99, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| 0.55, 0.99, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| 0.74, 1.67, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| 0.75, 1.67, 0.05 | doorA.lod0/stone_blue | 446 | 2.047 |
| 0.55, 0.99, 0.02 | doorA.lod0/stone_blue | 42 | 2.047 |
| 0.75, 1.67, 0.02 | doorA.lod0/stone_blue | 42 | 2.047 |
| 0.56, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.55, 0.10, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.76, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.77, 0.20, 0.07 | doorA.lod0/stone_blue | 46 | 0.284 |
| 0.58, 1.59, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.58, 1.59, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.58, 1.01, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.58, 1.01, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.72, 1.01, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.72, 1.01, 0.05 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.72, 1.59, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.72, 1.59, 0.06 | doorA.lod0/stone_blue | 762 | 1.751 |
| 0.58, 1.01, 0.06 | doorA.lod0/stone_blue | 292 | 1.751 |
| 0.72, 1.59, 0.06 | doorA.lod0/stone_blue | 292 | 1.751 |

(656 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.83, 2.70, 0.01 | doorA.lod0/stone_blue | 3 |
| -0.83, 2.70, 0.01 | doorA.lod0/stone_blue | 3 |
| 0.00, 2.70, 0.02 | doorA.lod0/stone_blue | 3 |

## tjunction (warn, 8)

| at | part | edge_m |
|---|---|---|
| 0.55, 0.01, 0.00 | doorA.lod0/stone_blue | 2.483 |
| -0.55, 0.01, 0.00 | doorA.lod0/stone_blue | 2.483 |
| 0.83, 2.85, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.83, 2.85, -0.01 | doorA.lod0/stone_blue | 0.15 |
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 160)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.14, 2.18, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.17 | 72 | 81 |
| 0.47, 2.18, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/cast_iron_green | 0.12 | 68 | 22.5 |
| -0.42, 2.18, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| -0.31, 2.18, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| -0.21, 2.18, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.21, 2.17, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.32, 2.17, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.42, 2.17, -0.18 | doorA.lod0/cast_iron_green + doorA.lod0/cast_iron_green | 0.06 | 38 | 90 |
| 0.88, 2.85, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.38 | 34 | 90 |
| -0.95, 2.84, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.38 | 34 | 90 |
| -0.31, 0.25, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.22 | 34 | 74.5 |
| 0.10, 0.25, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.22 | 34 | 74.5 |
| -0.31, 0.91, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 2 | 34 | 74.5 |
| 0.10, 0.91, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 2 | 34 | 74.5 |
| -0.58, 1.59, 0.06 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 3.79 | 26 | 90 |
| 0.72, 1.59, 0.06 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 3.79 | 26 | 90 |
| -0.36, 0.70, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.42 | 26 | 44.5 |
| 0.36, 0.82, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.42 | 26 | 44.5 |
| 0.02, 1.74, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 45.3 |
| -0.04, 0.20, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 44.7 |
| -0.04, 0.85, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 45.3 |
| 0.02, 0.69, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 26 | 45.3 |
| 0.07, 0.80, -0.17 | doorA.lod0/wood_frame_dark + doorA.lod0/painted_metal_white | 0.61 | 26 | 67.2 |
| -0.47, 1.86, -0.16 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.32 | 24 | 44.5 |
| 0.47, 1.86, -0.24 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.32 | 24 | 44.5 |
| -0.47, 2.47, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| 0.47, 2.47, -0.24 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| -0.36, 0.01, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.49 | 20 | 44.7 |
| -0.36, 1.85, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 20 | 44.3 |
| 0.36, 0.00, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.49 | 20 | 44.7 |
| 0.36, 1.85, -0.23 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.31 | 20 | 44.3 |
| -0.57, -0.01, 0.30 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 2.81 | 18 | 45 |
| -0.04, 0.20, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.99 | 16 | 90 |
| 0.05, 0.69, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.99 | 16 | 90 |
| -0.04, 0.85, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.77 | 16 | 90 |
| 0.05, 1.74, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 1.77 | 16 | 90 |
| 0.36, 1.74, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| -0.36, 0.85, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| 0.36, 0.69, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/wood_frame_dark | 0.64 | 14 | 90 |
| -0.42, 1.94, -0.19 | doorA.lod0/wood_frame_dark + doorA.lod0/cast_iron_green | 0.02 | 14 | 31.8 |

(120 more in the JSON)

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.30 | doorA.lod0/stone_blue | 1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.30 | doorA.lod0/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.30 | doorA.lod0/stone_blue | -1 + 0 + 0 | 2.483 |
| 0.79, 2.84, 0.16 | doorA.lod0/zinc_roof | 0 + 1 + 0.06 | 1.67 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.94, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 164)

| at | parts | area |
|---|---|---|
| -0.55, 0.93, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.07865 |
| -0.55, 1.05, -0.18 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.03321 |
| 0.55, 0.42, -0.23 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00513 |
| 0.55, 0.45, -0.20 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.05046 |
| -0.52, 2.48, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00231 |
| -0.50, 2.48, -0.19 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.00231 |
| -0.09, 2.48, -0.21 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.03044 |
| -0.05, 2.48, -0.18 | doorA.lod0/stone_blue + doorA.lod0/wood_frame_dark | 0.01371 |
| -0.62, 2.35, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0006 |
| -0.65, 0.30, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00251 |
| -0.58, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00199 |
| -0.65, 2.36, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00284 |
| -0.72, 2.36, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00177 |
| -0.63, 0.29, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00088 |
| -0.63, 0.00, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00603 |
| -0.71, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00295 |
| -0.56, 2.40, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00024 |
| -0.59, 2.36, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00303 |
| -0.66, 2.42, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00371 |
| -0.73, 2.42, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00246 |
| -0.56, 2.46, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0003 |
| -0.60, 2.42, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0039 |
| -0.66, 2.48, 0.00 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0006 |
| -0.70, 2.48, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00593 |
| 0.65, 2.35, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0006 |
| 0.66, 0.30, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00303 |
| 0.72, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00158 |
| 0.65, 2.36, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00245 |
| 0.59, 2.36, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00205 |
| 0.66, 0.29, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00088 |
| 0.65, 0.00, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00295 |
| 0.60, 0.30, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00326 |
| 0.76, 2.40, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.00024 |
| 0.71, 2.36, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00281 |
| 0.66, 2.42, 0.01 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00323 |
| 0.59, 2.42, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00282 |
| 0.77, 2.46, 0.00 | doorA.lod0/stone_blue + wall/wall | 0.0003 |
| 0.73, 2.42, 0.03 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.0036 |
| 0.64, 2.48, 0.02 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00609 |
| 0.61, 2.48, 0.04 | doorA.lod0/stone_blue + doorA.lod0/stone_blue | 0.00044 |

(124 more in the JSON)
