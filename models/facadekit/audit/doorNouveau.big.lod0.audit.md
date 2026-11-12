# Kit audit: doorNouveau.big LOD0

3,072 triangles, 1,610 welded vertices, 49 open edges, 19,882 rays, 85 ms.

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
| -0.55, 0.82, 0.01 | doorNouveau.lod0/stone_blue | 75 | 2.483 |
| -0.55, 0.82, 0.04 | doorNouveau.lod0/stone_blue | 530 | 2.483 |
| -0.55, 0.82, 0.04 | doorNouveau.lod0/stone_blue | 530 | 2.484 |
| -0.56, 0.82, 0.04 | doorNouveau.lod0/stone_blue | 531 | 2.486 |
| -0.56, 0.83, 0.04 | doorNouveau.lod0/stone_blue | 532 | 2.49 |
| -0.73, 0.88, 0.04 | doorNouveau.lod0/stone_blue | 313 | 2.657 |
| -0.73, 0.88, 0.03 | doorNouveau.lod0/stone_blue | 62 | 2.663 |
| -0.18, 2.48, 0.04 | doorNouveau.lod0/stone_blue | 235 | 1.101 |
| -0.18, 2.48, 0.04 | doorNouveau.lod0/stone_blue | 236 | 1.104 |
| -0.19, 2.48, 0.04 | doorNouveau.lod0/stone_blue | 238 | 1.111 |
| -0.19, 2.49, 0.04 | doorNouveau.lod0/stone_blue | 240 | 1.119 |
| -0.24, 2.65, 0.04 | doorNouveau.lod0/stone_blue | 172 | 1.454 |
| 0.55, 1.65, 0.01 | doorNouveau.lod0/stone_blue | 75 | 2.483 |
| 0.55, 1.65, 0.04 | doorNouveau.lod0/stone_blue | 530 | 2.484 |
| 0.55, 1.65, 0.04 | doorNouveau.lod0/stone_blue | 531 | 2.486 |
| 0.56, 1.66, 0.04 | doorNouveau.lod0/stone_blue | 532 | 2.49 |
| 0.56, 1.66, 0.04 | doorNouveau.lod0/stone_blue | 533 | 2.495 |
| 0.73, 1.77, 0.04 | doorNouveau.lod0/stone_blue | 314 | 2.663 |
| 0.73, 1.77, 0.03 | doorNouveau.lod0/stone_blue | 62 | 2.663 |
| -0.81, 2.56, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.56, 0.01 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.47, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.82, 2.47, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.47, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.47, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.56, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.73, 2.56, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.56, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.56, 0.01 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.47, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.73, 2.47, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.47, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.47, 0.00 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.81, 2.56, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| 0.82, 2.56, 0.04 | doorNouveau.lod0/stone_blue | 58 | 0.268 |
| -0.08, 2.55, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| -0.08, 2.55, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| 0.09, 2.65, -0.01 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| 0.09, 2.65, -0.02 | doorNouveau.lod0/stone_blue | 63 | 0.289 |
| -0.09, 2.65, 0.07 | doorNouveau.lod0/stone_blue | 63 | 0.289 |

(320 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.48, 0.00 | doorNouveau.lod0/stone_blue | 3 |

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
| -0.32, 0.26, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 2.38 | 80 | 65.3 |
| -0.37, 1.51, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 1.15 | 64 | 90 |
| -0.07, 2.48, 0.01 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.71 | 48 | 84.3 |
| -0.55, 0.00, -0.13 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 1 | 29 | 67.5 |
| -0.05, 2.54, 0.08 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.74 | 26 | 67.4 |
| -0.37, 0.94, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.33 | 26 | 44.5 |
| 0.37, 0.94, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.33 | 26 | 44.5 |
| -0.12, 1.01, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/painted_metal_white | 0.55 | 26 | 67.2 |
| -0.04, 1.66, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.16 | 26 | 37.9 |
| -0.48, 1.76, -0.14 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.31 | 24 | 44.5 |
| 0.48, 1.76, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.31 | 24 | 44.5 |
| -0.01, 2.40, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.05 | 24 | 90 |
| -0.01, 1.85, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.05 | 24 | 90 |
| 0.04, 1.76, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.16 | 24 | 37.9 |
| -0.37, 1.75, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.6 | 23 | 65.7 |
| 0.37, 1.75, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.6 | 23 | 65.7 |
| -0.48, 2.47, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.27 | 21 | 44.7 |
| 0.48, 2.47, -0.21 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.27 | 21 | 44.7 |
| -0.37, 0.01, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.53 | 21 | 44.7 |
| 0.37, 0.00, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.53 | 21 | 44.7 |
| -0.57, -0.01, 0.30 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 2.81 | 18 | 45 |
| -0.02, 1.76, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.12 | 16 | 37.9 |
| 0.04, 1.76, -0.17 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.12 | 16 | 37.9 |
| 0.10, 2.75, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.74 | 14 | 90 |
| 0.42, 1.03, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/painted_metal_white | 0.07 | 14 | 90 |
| -0.69, -0.06, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.35 | 12 | 90 |
| 0.70, -0.01, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.35 | 12 | 90 |
| -0.47, 2.40, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.96 | 11 | 90 |
| -0.47, 1.85, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.96 | 11 | 90 |
| -0.55, 1.00, -0.21 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 5.31 | 10 | 22.5 |
| 0.55, 0.24, -0.21 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 5.31 | 10 | 22.5 |
| -0.02, 1.85, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 10 | 45.9 |
| 0.02, 1.85, -0.15 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 10 | 45.9 |
| -0.55, 1.24, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 7.99 | 9 | 90 |
| 0.55, 1.24, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 7.99 | 8 | 90 |
| -0.73, 2.52, 0.04 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 1.14 | 8 | 22.5 |
| -0.47, 1.02, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 3.67 | 8 | 22.2 |
| 0.47, 0.20, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 3.67 | 8 | 22.2 |
| 0.41, 2.40, -0.16 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/cast_iron_green | 0.06 | 8 | 64.5 |
| -0.36, 1.05, -0.18 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/glass_window | 0.74 | 8 | 90 |

(34 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.26 | doorNouveau.lod0/stone_blue | 1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.26 | doorNouveau.lod0/stone_blue | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.26 | doorNouveau.lod0/stone_blue | -1 + 0 + 0 | 2.483 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.73, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 66)

| at | parts | area |
|---|---|---|
| -0.55, 0.96, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.07379 |
| -0.55, 1.08, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.03235 |
| 0.55, 0.38, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00384 |
| 0.55, 0.43, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.04516 |
| -0.52, 2.48, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.50, 2.48, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.08, 2.48, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0288 |
| -0.04, 2.48, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01353 |
| -0.73, 2.52, 0.04 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00061 |
| 0.73, 2.45, 0.02 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| 0.73, 2.56, 0.03 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| -0.79, 2.56, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| -0.73, 2.58, 0.02 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00442 |
| 0.76, 2.56, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| 0.23, -0.06, -0.10 | doorNouveau.lod0/stone_blue + ground/ground | 0.40413 |
| -0.50, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.52, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.40, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00225 |
| 0.12, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01661 |
| -0.44, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00225 |
| -0.12, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01661 |
| 0.43, 0.00, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00127 |
| 0.39, 0.00, -0.18 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00116 |
| -0.55, 2.10, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00391 |
| -0.55, 2.04, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.04534 |
| 0.55, 1.52, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.07386 |
| 0.55, 1.40, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.03254 |
| 0.36, 2.48, -0.20 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00087 |
| 0.32, 2.48, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.01614 |
| 0.50, 2.48, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| 0.52, 2.48, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00198 |
| -0.73, 2.47, 0.03 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/stone_blue | 0.00382 |
| -0.76, 2.47, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| 0.79, 2.47, 0.00 | doorNouveau.lod0/stone_blue + wall/wall | 0.01045 |
| -0.23, -0.06, 0.10 | doorNouveau.lod0/stone_blue + ground/ground | 0.40413 |
| 0.52, 0.00, -0.19 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00195 |
| 0.45, 0.00, -0.18 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00098 |
| 0.50, 0.00, -0.17 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.00197 |
| 0.41, 0.00, -0.16 | doorNouveau.lod0/stone_blue + doorNouveau.lod0/wood_frame_dark | 0.0011 |
| -0.47, 1.02, -0.20 | doorNouveau.lod0/wood_frame_dark + doorNouveau.lod0/wood_frame_dark | 0.01404 |

(26 more in the JSON)
