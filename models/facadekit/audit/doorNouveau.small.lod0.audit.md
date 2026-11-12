# Kit audit: doorNouveau.small LOD0

3,072 triangles, 1,610 welded vertices, 49 open edges, 19,802 rays, 89 ms.

**0 blocking**, 365 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 360 |
| nonmanifold | warn | 1 |
| tjunction | warn | 4 |
| seam | info | 74 |
| opening | info | 9 |
| backtoback | info | 66 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 360)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.80, 0.01 | doorNouveau.lod0/stone_blue | 74 | 2.425 |
| -0.55, 0.80, 0.04 | doorNouveau.lod0/stone_blue | 518 | 2.425 |
| -0.55, 0.81, 0.04 | doorNouveau.lod0/stone_blue | 518 | 2.426 |
| -0.56, 0.81, 0.04 | doorNouveau.lod0/stone_blue | 519 | 2.429 |
| -0.56, 0.81, 0.04 | doorNouveau.lod0/stone_blue | 520 | 2.432 |
| -0.73, 0.86, 0.04 | doorNouveau.lod0/stone_blue | 306 | 2.599 |
| -0.73, 0.86, 0.03 | doorNouveau.lod0/stone_blue | 61 | 2.605 |
| -0.18, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 235 | 1.101 |
| -0.18, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 236 | 1.104 |
| -0.19, 2.43, 0.04 | doorNouveau.lod0/stone_blue | 238 | 1.111 |
| -0.19, 2.43, 0.04 | doorNouveau.lod0/stone_blue | 240 | 1.119 |
| -0.24, 2.60, 0.04 | doorNouveau.lod0/stone_blue | 172 | 1.454 |
| 0.55, 1.61, 0.01 | doorNouveau.lod0/stone_blue | 74 | 2.425 |
| 0.55, 1.61, 0.04 | doorNouveau.lod0/stone_blue | 518 | 2.426 |
| 0.55, 1.61, 0.04 | doorNouveau.lod0/stone_blue | 519 | 2.429 |
| 0.56, 1.62, 0.04 | doorNouveau.lod0/stone_blue | 520 | 2.432 |
| 0.56, 1.62, 0.04 | doorNouveau.lod0/stone_blue | 520 | 2.437 |
| 0.73, 1.73, 0.04 | doorNouveau.lod0/stone_blue | 307 | 2.605 |
| 0.73, 1.73, 0.03 | doorNouveau.lod0/stone_blue | 61 | 2.605 |
| -0.81, 2.51, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.51, 0.01 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.42, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.42, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.51, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.51, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.51, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.51, 0.01 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.42, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.42, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.42, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.81, 2.51, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.51, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.08, 2.49, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| -0.08, 2.49, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| 0.09, 2.59, -0.01 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| 0.09, 2.59, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| -0.09, 2.59, 0.07 | doorNouveau.lod0/stone_blue | 63 | 0.289 |

(320 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.42, 0.00 | doorNouveau.lod0/stone_blue | 3 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 74)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.32, 0.26, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 2.35 | 80 | 65.6 |
| -0.37, 1.47, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 1.13 | 64 | 90 |
| -0.07, 2.42, 0.01 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.71 | 48 | 84.3 |
| -0.55, 0.00, -0.13 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 1 | 29 | 67.5 |
| -0.05, 2.48, 0.08 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.74 | 26 | 67.4 |
| -0.37, 0.92, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.33 | 26 | 44.8 |
| 0.37, 0.92, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.33 | 26 | 44.8 |
| -0.12, 0.99, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/painted_metal_white | 0.55 | 26 | 67.5 |
| -0.04, 1.62, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.16 | 26 | 37 |
| -0.48, 1.72, -0.14 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.3 | 24 | 44.8 |
| 0.48, 1.72, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.3 | 24 | 44.8 |
| -0.01, 2.35, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.05 | 24 | 90 |
| -0.01, 1.80, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.05 | 24 | 90 |
| 0.04, 1.71, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.16 | 24 | 37 |
| -0.37, 1.71, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.58 | 23 | 66.4 |
| 0.37, 1.71, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.58 | 23 | 66.4 |
| -0.48, 2.42, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.27 | 21 | 44.7 |
| 0.48, 2.42, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.27 | 21 | 44.7 |
| -0.37, 0.01, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.53 | 21 | 44.7 |
| 0.37, 0.00, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.53 | 21 | 44.7 |
| -0.57, -0.01, 0.30 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 2.81 | 18 | 45 |
| -0.02, 1.71, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.12 | 16 | 37 |
| 0.04, 1.71, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.12 | 16 | 37 |
| 0.10, 2.69, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.74 | 14 | 90 |
| 0.42, 1.01, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/painted_metal_white | 0.07 | 14 | 90 |
| -0.69, -0.06, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.35 | 12 | 90 |
| 0.70, -0.01, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.35 | 12 | 90 |
| -0.47, 2.35, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.96 | 11 | 90 |
| -0.47, 1.80, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.96 | 11 | 90 |
| -0.55, 0.98, -0.21 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 5.2 | 10 | 22.5 |
| 0.55, 0.24, -0.21 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 5.2 | 10 | 22.5 |
| -0.02, 1.80, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 10 | 44.9 |
| 0.02, 1.80, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 10 | 44.9 |
| -0.55, 1.21, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 7.82 | 9 | 90 |
| 0.55, 1.21, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 7.82 | 8 | 90 |
| -0.73, 2.46, 0.04 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 1.14 | 8 | 22.5 |
| -0.47, 0.99, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 3.58 | 8 | 22.5 |
| 0.47, 0.20, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 3.58 | 8 | 22.5 |
| 0.41, 2.35, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 8 | 64.5 |
| -0.36, 1.03, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.74 | 8 | 90 |

(34 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.26 | doorNouveau.lod0/stone_blue | 1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.26 | doorNouveau.lod0/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.26 | doorNouveau.lod0/stone_blue | -1 + 0 + 0 | 2.425 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.67, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 66)

| at | parts | area |
|---|---|---|
| -0.55, 0.94, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.07207 |
| -0.55, 1.05, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0316 |
| 0.55, 0.37, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00375 |
| 0.55, 0.42, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0441 |
| -0.52, 2.42, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.50, 2.42, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.08, 2.42, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0288 |
| -0.04, 2.42, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01353 |
| -0.73, 2.46, 0.04 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00062 |
| 0.73, 2.39, 0.02 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| 0.73, 2.51, 0.03 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| -0.79, 2.51, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| -0.73, 2.53, 0.02 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| 0.76, 2.51, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| 0.23, -0.06, -0.10 | doorNouveau.lod0/stone_blue + ground/ground | 0.40413 |
| -0.50, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.52, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.40, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00225 |
| 0.12, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01661 |
| -0.44, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00225 |
| -0.12, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01661 |
| 0.43, 0.00, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00127 |
| 0.39, 0.00, -0.18 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00116 |
| -0.55, 2.05, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00382 |
| -0.55, 2.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.04428 |
| 0.55, 1.48, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.07214 |
| 0.55, 1.36, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.03179 |
| 0.36, 2.42, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00087 |
| 0.32, 2.42, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01614 |
| 0.50, 2.42, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| 0.52, 2.42, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.73, 2.42, 0.03 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.0038 |
| -0.76, 2.42, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| 0.79, 2.42, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| -0.23, -0.06, 0.10 | doorNouveau.lod0/stone_blue + ground/ground | 0.40413 |
| 0.52, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00195 |
| 0.45, 0.00, -0.18 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00098 |
| 0.50, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00197 |
| 0.41, 0.00, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0011 |
| -0.47, 0.99, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.01363 |

(26 more in the JSON)
