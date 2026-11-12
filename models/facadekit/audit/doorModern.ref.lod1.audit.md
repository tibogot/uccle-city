# Kit audit: doorModern.ref LOD1

220 triangles, 145 welded vertices, 38 open edges, 19,568 rays, 10 ms.

**0 blocking**, 72 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 60 |
| nonmanifold | warn | 8 |
| tjunction | warn | 4 |
| seam | info | 56 |
| opening | info | 9 |
| backtoback | info | 111 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 60)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.81, 0.01 | doorModern.lod1/stone_white | 146 | 2.456 |
| -0.58, 0.82, 0.02 | doorModern.lod1/stone_white | 41 | 2.465 |
| -0.62, 0.83, 0.02 | doorModern.lod1/stone_white | 297 | 2.516 |
| -0.62, 0.84, 0.01 | doorModern.lod1/stone_white | 140 | 2.522 |
| -0.19, 2.45, 0.02 | doorModern.lod1/stone_white | 122 | 1.116 |
| -0.21, 2.51, 0.02 | doorModern.lod1/stone_white | 146 | 1.234 |
| -0.21, 2.52, 0.01 | doorModern.lod1/stone_white | 69 | 1.24 |
| 0.55, 1.63, 0.01 | doorModern.lod1/stone_white | 267 | 2.456 |
| 0.56, 1.64, 0.02 | doorModern.lod1/stone_white | 269 | 2.464 |
| 0.60, 1.66, 0.02 | doorModern.lod1/stone_white | 48 | 2.516 |
| 0.62, 1.68, 0.02 | doorModern.lod1/stone_white | 297 | 2.522 |
| 0.62, 1.68, 0.01 | doorModern.lod1/stone_white | 140 | 2.522 |
| -0.56, 1.64, 0.02 | doorModern.lod1/stone_white | 269 | 2.464 |
| -0.60, 1.66, 0.02 | doorModern.lod1/stone_white | 48 | 2.516 |
| -0.62, 1.68, 0.02 | doorModern.lod1/stone_white | 297 | 2.522 |
| -0.62, 1.68, 0.00 | doorModern.lod1/stone_white | 140 | 2.522 |
| 0.18, 2.45, 0.01 | doorModern.lod1/stone_white | 121 | 1.107 |
| 0.18, 2.46, 0.02 | doorModern.lod1/stone_white | 122 | 1.124 |
| 0.20, 2.52, 0.02 | doorModern.lod1/stone_white | 146 | 1.24 |
| 0.21, 2.52, 0.00 | doorModern.lod1/stone_white | 69 | 1.24 |
| 0.55, 0.81, 0.01 | doorModern.lod1/stone_white | 145 | 2.452 |
| 0.58, 0.82, 0.02 | doorModern.lod1/stone_white | 41 | 2.465 |
| 0.62, 0.83, 0.02 | doorModern.lod1/stone_white | 297 | 2.516 |
| 0.62, 0.84, 0.00 | doorModern.lod1/stone_white | 140 | 2.522 |
| -0.55, 0.82, -0.10 | doorModern.lod1/metal_anodised | 41 | 2.449 |
| -0.51, 1.63, -0.10 | doorModern.lod1/metal_anodised | 41 | 2.449 |
| -0.54, 1.63, -0.12 | doorModern.lod1/metal_anodised | 54 | 2.448 |
| -0.52, 1.63, -0.06 | doorModern.lod1/metal_anodised | 54 | 2.448 |
| 0.51, 0.82, -0.10 | doorModern.lod1/metal_anodised | 41 | 2.449 |
| 0.55, 1.63, -0.10 | doorModern.lod1/metal_anodised | 41 | 2.449 |
| 0.52, 1.63, -0.12 | doorModern.lod1/metal_anodised | 54 | 2.448 |
| 0.54, 1.63, -0.06 | doorModern.lod1/metal_anodised | 54 | 2.448 |
| -0.25, 1.41, -0.12 | doorModern.lod1/metal_anodised | 53 | 2.108 |
| -0.24, 1.41, -0.06 | doorModern.lod1/metal_anodised | 53 | 2.108 |
| -0.23, 0.70, -0.10 | doorModern.lod1/metal_anodised | 47 | 2.108 |
| -0.17, 1.41, -0.10 | doorModern.lod1/metal_anodised | 47 | 2.108 |
| -0.21, 1.41, -0.11 | doorModern.lod1/metal_anodised | 42 | 2.109 |
| -0.19, 1.41, -0.07 | doorModern.lod1/metal_anodised | 42 | 2.109 |
| 0.46, 0.70, -0.10 | doorModern.lod1/metal_anodised | 47 | 2.108 |
| 0.51, 1.41, -0.10 | doorModern.lod1/metal_anodised | 47 | 2.108 |

(20 more in the JSON)

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| -0.51, 2.45, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.51, 2.45, -0.09 | doorModern.lod1/metal_anodised | 4 |
| -0.17, 2.11, -0.09 | doorModern.lod1/metal_anodised | 4 |
| -0.17, 0.00, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.46, 0.00, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.46, 2.11, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.14, 0.05, -0.11 | doorModern.lod1/metal_anodised | 4 |
| 0.14, 0.15, -0.11 | doorModern.lod1/metal_anodised | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 56)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.55, 0.00, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/stone_blue | 0.54 | 25 | 89.9 |
| 0.55, 0.00, -0.09 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 5.23 | 10 | 90 |
| 0.55, 1.16, 0.00 | doorModern.lod1/stone_white + wall/wall | 5.11 | 8 | 90 |
| -0.62, 0.28, 0.00 | doorModern.lod1/stone_white + wall/wall | 5.12 | 8 | 88.9 |
| -0.51, 2.15, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| 0.51, 2.11, -0.12 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| -0.51, 2.40, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.19 | 8 | 90 |
| -0.51, 2.15, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.19 | 8 | 90 |
| -0.24, 2.11, -0.12 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| -0.23, 1.18, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 4.4 | 8 | 90 |
| -0.17, 0.21, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.33 | 8 | 90 |
| 0.46, 0.15, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.33 | 8 | 90 |
| -0.51, 0.68, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.02 | 7 | 90 |
| 0.51, 0.00, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 4.35 | 7 | 90 |
| -0.27, 0.00, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.02 | 7 | 90 |
| -0.17, 0.10, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.38 | 7 | 90 |
| -0.03, 2.45, 0.00 | doorModern.lod1/stone_white + wall/wall | 2.2 | 6 | 88.9 |
| -0.17, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 1.35 | 6 | 90 |
| 0.46, 0.00, -0.11 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.19 | 6 | 90 |
| -0.17, 2.11, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.19 | 6 | 90 |
| 0.14, 2.11, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 1.35 | 6 | 90 |
| -0.26, 0.00, 0.00 | doorModern.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| 0.48, 2.11, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.23 | 5 | 90 |
| 0.46, 0.05, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.38 | 5 | 90 |
| -0.63, -0.04, 0.00 | doorModern.lod1/stone_blue + wall/wall | 0.22 | 4 | 90 |
| -0.63, -0.06, 0.01 | doorModern.lod1/stone_blue + ground/ground | 3.2 | 4 | 90 |
| -0.55, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.21 | 4 | 90 |
| -0.51, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.56 | 4 | 90 |
| -0.27, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.2 | 4 | 90 |
| -0.23, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.19 | 4 | 90 |
| 0.63, -0.02, 0.00 | doorModern.lod1/stone_blue + wall/wall | 0.22 | 4 | 90 |
| 0.51, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.21 | 4 | 90 |
| -0.51, 2.28, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.59 | 4 | 90 |
| -0.27, 0.95, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 1.17 | 4 | 90 |
| -0.45, 0.95, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.25 | 4 | 90 |
| 0.51, 2.15, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.59 | 4 | 90 |
| -0.17, 2.06, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.64 | 4 | 90 |
| -0.02, 0.21, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.64 | 4 | 90 |
| -0.55, 0.92, -0.12 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 2.81 | 3 | 90 |
| 0.11, 2.45, -0.12 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 1.25 | 3 | 90 |

(16 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.40, -0.16 | doorModern.lod1/stone_white | 1 + 0 + 0 | 2.452 |
| 0.55, 0.04, -0.16 | doorModern.lod1/stone_white | -1 + 0 + 0 | 2.452 |
| -0.50, 2.45, -0.16 | doorModern.lod1/stone_white | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.59, 0.00 | wall/wall | 0 + 0 + 1 | 1.552 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 111)

| at | parts | area |
|---|---|---|
| -0.55, 0.82, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.06606 |
| -0.55, 0.79, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01645 |
| 0.55, 0.49, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00641 |
| 0.55, 0.59, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.05465 |
| -0.34, 2.45, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01685 |
| -0.15, 2.45, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00795 |
| 0.55, 1.59, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.06703 |
| 0.55, 1.60, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01879 |
| 0.05, 2.45, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01345 |
| 0.26, 2.45, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.02235 |
| 0.52, 2.45, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00135 |
| 0.54, 2.45, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00135 |
| -0.55, 1.92, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00737 |
| -0.55, 1.82, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.05698 |
| -0.52, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00135 |
| -0.34, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.0048 |
| -0.54, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00135 |
| -0.42, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.0048 |
| -0.24, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.0012 |
| -0.25, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.0012 |
| -0.19, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00112 |
| 0.27, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.01124 |
| -0.21, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00112 |
| 0.07, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.0134 |
| 0.21, -0.06, -0.05 | doorModern.lod1/stone_blue + ground/ground | 0.2142 |
| 0.41, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00294 |
| 0.36, 0.00, -0.07 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00078 |
| 0.48, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00112 |
| 0.47, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00112 |
| 0.54, 0.00, -0.10 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00135 |
| 0.52, 0.00, -0.08 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.00135 |
| -0.21, -0.06, 0.07 | doorModern.lod1/stone_blue + ground/ground | 0.2142 |
| -0.51, 0.70, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00228 |
| -0.51, 0.88, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00132 |
| -0.51, 2.12, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00118 |
| -0.51, 2.23, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00536 |
| -0.51, 2.14, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00091 |
| -0.51, 2.32, -0.08 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00536 |
| -0.51, 2.42, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00135 |
| -0.51, 2.44, -0.07 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00133 |

(71 more in the JSON)
