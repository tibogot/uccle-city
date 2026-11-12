# Kit audit: doorNouveau.small LOD1

508 triangles, 308 welded vertices, 42 open edges, 19,688 rays, 17 ms.

**0 blocking**, 51 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 41 |
| nonmanifold | warn | 6 |
| tjunction | warn | 4 |
| seam | info | 67 |
| opening | info | 9 |
| backtoback | info | 95 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 41)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.80, -0.08 | doorNouveau.lod1/stone_blue | 75 | 2.443 |
| -0.55, 0.81, 0.04 | doorNouveau.lod1/stone_blue | 264 | 2.429 |
| -0.73, 0.86, 0.04 | doorNouveau.lod1/stone_blue | 306 | 2.599 |
| -0.73, 0.86, 0.03 | doorNouveau.lod1/stone_blue | 61 | 2.605 |
| -0.19, 2.43, 0.04 | doorNouveau.lod1/stone_blue | 122 | 1.116 |
| -0.24, 2.60, 0.04 | doorNouveau.lod1/stone_blue | 172 | 1.454 |
| 0.55, 1.61, 0.04 | doorNouveau.lod1/stone_blue | 264 | 2.429 |
| 0.56, 1.62, 0.04 | doorNouveau.lod1/stone_blue | 266 | 2.437 |
| 0.73, 1.73, 0.04 | doorNouveau.lod1/stone_blue | 307 | 2.605 |
| 0.73, 1.73, 0.03 | doorNouveau.lod1/stone_blue | 61 | 2.605 |
| -0.23, -0.01, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.31 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.01, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.56, 1.62, 0.04 | doorNouveau.lod1/stone_blue | 266 | 2.437 |
| -0.73, 1.73, 0.04 | doorNouveau.lod1/stone_blue | 307 | 2.605 |
| -0.73, 1.73, 0.01 | doorNouveau.lod1/stone_blue | 61 | 2.605 |
| 0.18, 2.42, 0.04 | doorNouveau.lod1/stone_blue | 121 | 1.107 |
| 0.18, 2.43, 0.04 | doorNouveau.lod1/stone_blue | 122 | 1.124 |
| 0.24, 2.60, 0.04 | doorNouveau.lod1/stone_blue | 172 | 1.46 |
| 0.55, 0.80, 0.03 | doorNouveau.lod1/stone_blue | 58 | 2.425 |
| 0.73, 0.86, 0.04 | doorNouveau.lod1/stone_blue | 306 | 2.599 |
| 0.73, 0.86, 0.01 | doorNouveau.lod1/stone_blue | 61 | 2.605 |
| 0.23, -0.01, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.31 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.01, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.01, 1.98, -0.16 | doorNouveau.lod1/cast_iron_green | 47 | 0.566 |
| 0.01, 2.17, -0.16 | doorNouveau.lod1/cast_iron_green | 47 | 0.566 |
| -0.04, 1.58, -0.16 | doorNouveau.lod1/cast_iron_green | 41 | 0.407 |
| 0.04, 1.58, -0.16 | doorNouveau.lod1/cast_iron_green | 41 | 0.407 |
| -0.39, 2.22, -0.16 | doorNouveau.lod1/cast_iron_green | 53 | 0.293 |
| 0.39, 2.22, -0.15 | doorNouveau.lod1/cast_iron_green | 53 | 0.293 |
| -0.01, 2.17, -0.16 | doorNouveau.lod1/cast_iron_green | 47 | 0.566 |
| 0.01, 1.98, -0.16 | doorNouveau.lod1/cast_iron_green | 47 | 0.566 |
| -0.06, 1.45, -0.16 | doorNouveau.lod1/cast_iron_green | 41 | 0.407 |

(1 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.47, 2.42, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.47, 2.42, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| -0.36, 1.71, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| -0.36, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.36, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.36, 1.71, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 67)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.06, 2.42, -0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.72 | 26 | 84.1 |
| -0.55, 0.00, -0.13 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 1 | 19 | 88.8 |
| 0.04, 1.62, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.09 | 19 | 24.1 |
| -0.36, 1.60, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 1.14 | 18 | 90 |
| -0.05, 1.62, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.09 | 17 | 24.1 |
| -0.07, 0.26, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 2.36 | 16 | 90 |
| 0.55, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 5.29 | 10 | 90 |
| -0.55, 0.13, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 5.4 | 10 | 89.3 |
| -0.48, -0.01, 0.30 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 2.8 | 10 | 60 |
| -0.02, 1.71, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 9 | 24.1 |
| 0.02, 1.71, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 9 | 24.1 |
| 0.55, 1.07, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 5.39 | 8 | 90 |
| 0.73, 2.34, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.68 | 8 | 45 |
| -0.47, 1.80, -0.19 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.5 | 8 | 90 |
| 0.47, 1.71, -0.20 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.5 | 8 | 90 |
| 0.41, 2.35, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 8 | 71.6 |
| -0.36, 1.03, -0.19 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.59 | 8 | 90 |
| 0.36, 0.91, -0.19 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.59 | 8 | 90 |
| -0.40, 2.35, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 8 | 71.6 |
| -0.01, 2.35, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 90 |
| -0.02, 1.80, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 46.4 |
| -0.01, 1.80, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 90 |
| 0.04, 1.80, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 46.4 |
| -0.01, 1.03, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.04 | 8 | 73.6 |
| 0.02, 1.03, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.04 | 8 | 73.6 |
| -0.73, 2.32, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.68 | 7 | 45 |
| -0.47, 0.97, -0.21 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 3.6 | 7 | 90 |
| 0.47, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 3.6 | 7 | 90 |
| -0.47, 1.71, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.39 | 7 | 90 |
| 0.08, 2.53, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.74 | 6 | 90 |
| -0.36, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 1.58 | 6 | 90 |
| 0.47, 0.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.3 | 6 | 90 |
| 0.36, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.34 | 6 | 90 |
| -0.47, 2.35, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.96 | 6 | 90 |
| -0.22, 1.80, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.96 | 6 | 90 |
| -0.36, 1.71, -0.21 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 1.58 | 6 | 90 |
| -0.16, 1.03, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.74 | 6 | 90 |
| -0.55, 1.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 3.55 | 5 | 90 |
| -0.06, 2.42, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 2.2 | 5 | 89.3 |
| -0.28, 0.00, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |

(27 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.26 | doorNouveau.lod1/stone_blue | 1 + 0 + 0 | 2.425 |
| 0.55, 0.05, -0.26 | doorNouveau.lod1/stone_blue | -1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.26 | doorNouveau.lod1/stone_blue | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.67, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 95)

| at | parts | area |
|---|---|---|
| -0.55, 0.96, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.08695 |
| -0.55, 1.04, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.03692 |
| 0.55, 0.29, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00283 |
| 0.55, 0.37, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04808 |
| -0.55, 1.95, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00095 |
| -0.55, 1.62, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00555 |
| -0.73, 2.44, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00063 |
| -0.53, 2.42, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.50, 2.42, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.38, 2.42, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.01331 |
| -0.25, 2.42, -0.15 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00429 |
| 0.73, 2.43, 0.01 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00618 |
| 0.73, 2.52, 0.03 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00473 |
| -0.73, 2.52, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00618 |
| -0.79, 2.51, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.76, 2.51, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| -0.50, 0.00, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.53, 0.00, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.40, 0.00, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00319 |
| 0.18, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.02113 |
| -0.44, 0.00, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00319 |
| -0.01, 0.00, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.02116 |
| 0.49, 0.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00011 |
| 0.43, 0.00, -0.20 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00169 |
| 0.48, 0.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00005 |
| 0.38, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00139 |
| 0.23, -0.06, -0.10 | doorNouveau.lod1/stone_blue + ground/ground | 0.42 |
| 0.55, 1.43, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.08796 |
| 0.55, 1.30, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04271 |
| -0.03, 2.42, -0.20 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.02231 |
| 0.17, 2.42, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.03133 |
| 0.50, 2.42, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| 0.53, 2.42, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.55, 2.13, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00289 |
| -0.55, 2.05, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04832 |
| -0.73, 2.40, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.0041 |
| -0.76, 2.41, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.79, 2.41, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.36, 0.00, -0.15 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00004 |
| 0.52, 0.00, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00271 |

(55 more in the JSON)
