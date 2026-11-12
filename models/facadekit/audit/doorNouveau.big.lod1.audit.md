# Kit audit: doorNouveau.big LOD1

508 triangles, 308 welded vertices, 42 open edges, 19,752 rays, 17 ms.

**0 blocking**, 55 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 45 |
| nonmanifold | warn | 6 |
| tjunction | warn | 4 |
| seam | info | 67 |
| opening | info | 9 |
| backtoback | info | 95 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 45)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.82, -0.08 | doorNouveau.lod1/stone_blue | 76 | 2.5 |
| -0.55, 0.82, 0.04 | doorNouveau.lod1/stone_blue | 271 | 2.486 |
| -0.73, 0.88, 0.04 | doorNouveau.lod1/stone_blue | 313 | 2.657 |
| -0.73, 0.88, 0.03 | doorNouveau.lod1/stone_blue | 62 | 2.663 |
| -0.19, 2.48, 0.04 | doorNouveau.lod1/stone_blue | 122 | 1.116 |
| -0.24, 2.65, 0.04 | doorNouveau.lod1/stone_blue | 172 | 1.454 |
| 0.55, 1.65, 0.04 | doorNouveau.lod1/stone_blue | 271 | 2.486 |
| 0.56, 1.66, 0.04 | doorNouveau.lod1/stone_blue | 273 | 2.495 |
| 0.73, 1.77, 0.04 | doorNouveau.lod1/stone_blue | 314 | 2.663 |
| 0.73, 1.77, 0.03 | doorNouveau.lod1/stone_blue | 62 | 2.663 |
| -0.23, -0.01, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.03, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.02, 0.31 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.23, -0.01, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.56, 1.66, 0.04 | doorNouveau.lod1/stone_blue | 273 | 2.495 |
| -0.73, 1.77, 0.04 | doorNouveau.lod1/stone_blue | 314 | 2.663 |
| -0.73, 1.77, 0.01 | doorNouveau.lod1/stone_blue | 62 | 2.663 |
| 0.18, 2.48, 0.04 | doorNouveau.lod1/stone_blue | 121 | 1.107 |
| 0.18, 2.49, 0.04 | doorNouveau.lod1/stone_blue | 122 | 1.124 |
| 0.24, 2.66, 0.04 | doorNouveau.lod1/stone_blue | 172 | 1.46 |
| 0.55, 0.82, 0.03 | doorNouveau.lod1/stone_blue | 60 | 2.483 |
| 0.73, 0.88, 0.04 | doorNouveau.lod1/stone_blue | 313 | 2.657 |
| 0.73, 0.88, 0.01 | doorNouveau.lod1/stone_blue | 62 | 2.663 |
| 0.23, -0.01, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.29 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.03, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.02, 0.31 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| 0.23, -0.01, 0.30 | doorNouveau.lod1/stone_blue | 115 | 1.38 |
| -0.01, 2.03, -0.16 | doorNouveau.lod1/cast_iron_green | 48 | 0.575 |
| 0.01, 2.22, -0.16 | doorNouveau.lod1/cast_iron_green | 48 | 0.575 |
| -0.04, 1.63, -0.16 | doorNouveau.lod1/cast_iron_green | 42 | 0.42 |
| -0.05, 1.61, -0.16 | doorNouveau.lod1/cast_iron_green | 40 | 0.4 |
| 0.05, 1.61, -0.16 | doorNouveau.lod1/cast_iron_green | 40 | 0.4 |
| 0.04, 1.63, -0.16 | doorNouveau.lod1/cast_iron_green | 42 | 0.42 |
| -0.39, 2.28, -0.16 | doorNouveau.lod1/cast_iron_green | 52 | 0.294 |
| 0.39, 2.28, -0.15 | doorNouveau.lod1/cast_iron_green | 52 | 0.294 |
| -0.01, 2.22, -0.16 | doorNouveau.lod1/cast_iron_green | 48 | 0.575 |

(5 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.47, 2.48, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.47, 2.48, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| -0.36, 1.76, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| -0.36, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.36, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |
| 0.36, 1.76, -0.18 | doorNouveau.lod1/wood_frame_dark | 4 |

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
| -0.06, 2.48, -0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.72 | 26 | 84.1 |
| -0.55, 0.00, -0.13 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 1 | 19 | 88.8 |
| 0.04, 1.66, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.09 | 19 | 24.8 |
| -0.36, 1.64, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 1.15 | 18 | 90 |
| -0.05, 1.66, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.09 | 17 | 24.8 |
| -0.07, 0.26, -0.17 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 2.4 | 16 | 90 |
| 0.55, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 5.41 | 10 | 90 |
| -0.55, 0.14, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 5.51 | 10 | 89.3 |
| -0.48, -0.01, 0.30 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 2.8 | 10 | 60 |
| -0.02, 1.76, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 9 | 24.8 |
| 0.02, 1.76, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 9 | 24.8 |
| 0.55, 1.10, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 5.51 | 8 | 90 |
| 0.73, 2.40, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.68 | 8 | 45 |
| -0.47, 1.80, -0.21 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| 0.47, 1.76, -0.20 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.52 | 8 | 90 |
| 0.41, 2.40, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 8 | 71.6 |
| -0.36, 1.05, -0.19 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.6 | 8 | 90 |
| 0.36, 0.93, -0.19 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.6 | 8 | 90 |
| -0.40, 2.40, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.05 | 8 | 71.6 |
| -0.01, 2.40, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 90 |
| -0.02, 1.85, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 47.3 |
| -0.01, 1.85, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 90 |
| 0.04, 1.85, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.06 | 8 | 47.3 |
| -0.01, 1.05, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.04 | 8 | 74.1 |
| 0.02, 1.05, -0.16 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/cast_iron_green | 0.04 | 8 | 74.1 |
| -0.73, 2.38, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.68 | 7 | 45 |
| -0.47, 0.99, -0.21 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 3.69 | 7 | 90 |
| 0.47, 0.00, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 3.69 | 7 | 90 |
| -0.47, 1.76, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 0.39 | 7 | 90 |
| 0.08, 2.58, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.74 | 6 | 90 |
| -0.36, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 1.58 | 6 | 90 |
| 0.47, 0.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.3 | 6 | 90 |
| 0.36, 0.00, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.34 | 6 | 90 |
| -0.47, 2.40, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.96 | 6 | 90 |
| -0.22, 1.85, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.96 | 6 | 90 |
| -0.36, 1.76, -0.21 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/wood_frame_dark | 1.58 | 6 | 90 |
| -0.16, 1.05, -0.18 | doorNouveau.lod1/wood_frame_dark + doorNouveau.lod1/glass_window | 0.74 | 6 | 90 |
| -0.55, 1.02, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 3.63 | 5 | 90 |
| -0.06, 2.48, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 2.2 | 5 | 89.3 |
| -0.28, 0.00, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |

(27 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.26 | doorNouveau.lod1/stone_blue | 1 + 0 + 0 | 2.483 |
| 0.55, 0.05, -0.26 | doorNouveau.lod1/stone_blue | -1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.26 | doorNouveau.lod1/stone_blue | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.73, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 95)

| at | parts | area |
|---|---|---|
| -0.55, 0.98, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.08902 |
| -0.55, 1.07, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.03779 |
| 0.55, 0.29, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.0029 |
| 0.55, 0.38, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04923 |
| -0.55, 2.00, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00097 |
| -0.55, 1.66, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00568 |
| -0.73, 2.50, 0.04 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00062 |
| -0.53, 2.48, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.50, 2.48, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.38, 2.48, -0.18 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.01331 |
| -0.25, 2.48, -0.15 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00429 |
| 0.73, 2.45, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00618 |
| 0.73, 2.60, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00473 |
| -0.73, 2.58, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00618 |
| -0.79, 2.56, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.76, 2.56, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
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
| 0.55, 1.46, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.09005 |
| 0.55, 1.33, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04372 |
| -0.03, 2.48, -0.20 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.02231 |
| 0.17, 2.48, -0.16 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.03133 |
| 0.50, 2.48, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| 0.53, 2.48, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00281 |
| -0.55, 2.18, -0.21 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00296 |
| -0.55, 2.10, -0.17 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.04947 |
| -0.73, 2.46, 0.02 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/stone_blue | 0.00411 |
| -0.76, 2.47, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.79, 2.47, 0.00 | doorNouveau.lod1/stone_blue + wall/wall | 0.0126 |
| 0.36, 0.00, -0.15 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00004 |
| 0.52, 0.00, -0.19 | doorNouveau.lod1/stone_blue + doorNouveau.lod1/wood_frame_dark | 0.00271 |

(55 more in the JSON)
