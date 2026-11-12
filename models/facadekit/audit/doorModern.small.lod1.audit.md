# Kit audit: doorModern.small LOD1

220 triangles, 145 welded vertices, 38 open edges, 19,472 rays, 9 ms.

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
| -0.55, 0.81, 0.01 | doorModern.lod1/stone_white | 144 | 2.429 |
| -0.58, 0.81, 0.02 | doorModern.lod1/stone_white | 40 | 2.438 |
| -0.62, 0.83, 0.02 | doorModern.lod1/stone_white | 293 | 2.489 |
| -0.62, 0.83, 0.01 | doorModern.lod1/stone_white | 139 | 2.495 |
| -0.19, 2.43, 0.02 | doorModern.lod1/stone_white | 122 | 1.116 |
| -0.21, 2.49, 0.02 | doorModern.lod1/stone_white | 146 | 1.234 |
| -0.21, 2.49, 0.01 | doorModern.lod1/stone_white | 69 | 1.24 |
| 0.55, 1.61, 0.01 | doorModern.lod1/stone_white | 264 | 2.429 |
| 0.56, 1.62, 0.02 | doorModern.lod1/stone_white | 266 | 2.437 |
| 0.60, 1.64, 0.02 | doorModern.lod1/stone_white | 48 | 2.489 |
| 0.62, 1.66, 0.02 | doorModern.lod1/stone_white | 294 | 2.495 |
| 0.62, 1.66, 0.01 | doorModern.lod1/stone_white | 139 | 2.495 |
| -0.56, 1.62, 0.02 | doorModern.lod1/stone_white | 266 | 2.437 |
| -0.60, 1.64, 0.02 | doorModern.lod1/stone_white | 48 | 2.489 |
| -0.62, 1.66, 0.02 | doorModern.lod1/stone_white | 294 | 2.495 |
| -0.62, 1.66, 0.00 | doorModern.lod1/stone_white | 139 | 2.495 |
| 0.18, 2.42, 0.01 | doorModern.lod1/stone_white | 121 | 1.107 |
| 0.18, 2.43, 0.02 | doorModern.lod1/stone_white | 122 | 1.124 |
| 0.20, 2.49, 0.02 | doorModern.lod1/stone_white | 146 | 1.24 |
| 0.21, 2.49, 0.00 | doorModern.lod1/stone_white | 69 | 1.24 |
| 0.55, 0.80, 0.01 | doorModern.lod1/stone_white | 144 | 2.425 |
| 0.58, 0.81, 0.02 | doorModern.lod1/stone_white | 40 | 2.438 |
| 0.62, 0.83, 0.02 | doorModern.lod1/stone_white | 293 | 2.489 |
| 0.62, 0.83, 0.00 | doorModern.lod1/stone_white | 139 | 2.495 |
| -0.55, 0.81, -0.10 | doorModern.lod1/metal_anodised | 40 | 2.422 |
| -0.51, 1.61, -0.10 | doorModern.lod1/metal_anodised | 40 | 2.422 |
| -0.54, 1.61, -0.12 | doorModern.lod1/metal_anodised | 54 | 2.421 |
| -0.52, 1.61, -0.06 | doorModern.lod1/metal_anodised | 54 | 2.421 |
| 0.51, 0.81, -0.10 | doorModern.lod1/metal_anodised | 40 | 2.422 |
| 0.55, 1.61, -0.10 | doorModern.lod1/metal_anodised | 40 | 2.422 |
| 0.52, 1.61, -0.12 | doorModern.lod1/metal_anodised | 54 | 2.421 |
| 0.54, 1.61, -0.06 | doorModern.lod1/metal_anodised | 54 | 2.421 |
| -0.25, 1.39, -0.12 | doorModern.lod1/metal_anodised | 52 | 2.081 |
| -0.24, 1.39, -0.06 | doorModern.lod1/metal_anodised | 52 | 2.081 |
| -0.23, 0.69, -0.10 | doorModern.lod1/metal_anodised | 46 | 2.082 |
| -0.17, 1.39, -0.10 | doorModern.lod1/metal_anodised | 46 | 2.082 |
| -0.21, 1.39, -0.11 | doorModern.lod1/metal_anodised | 42 | 2.082 |
| -0.19, 1.39, -0.07 | doorModern.lod1/metal_anodised | 42 | 2.082 |
| 0.46, 0.69, -0.10 | doorModern.lod1/metal_anodised | 46 | 2.082 |
| 0.51, 1.39, -0.10 | doorModern.lod1/metal_anodised | 46 | 2.082 |

(20 more in the JSON)

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| -0.51, 2.42, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.51, 2.42, -0.09 | doorModern.lod1/metal_anodised | 4 |
| -0.17, 2.08, -0.09 | doorModern.lod1/metal_anodised | 4 |
| -0.17, 0.00, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.46, 0.00, -0.09 | doorModern.lod1/metal_anodised | 4 |
| 0.46, 2.08, -0.09 | doorModern.lod1/metal_anodised | 4 |
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
| 0.55, 0.00, -0.09 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 5.17 | 10 | 90 |
| 0.55, 1.15, 0.00 | doorModern.lod1/stone_white + wall/wall | 5.06 | 8 | 90 |
| -0.62, 0.27, 0.00 | doorModern.lod1/stone_white + wall/wall | 5.07 | 8 | 88.9 |
| -0.51, 2.12, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| 0.51, 2.08, -0.12 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| -0.51, 2.38, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.19 | 8 | 90 |
| -0.51, 2.12, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2.19 | 8 | 90 |
| -0.24, 2.08, -0.12 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.28 | 8 | 90 |
| -0.23, 1.16, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 4.34 | 8 | 90 |
| -0.17, 0.21, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.33 | 8 | 90 |
| 0.46, 0.15, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.33 | 8 | 90 |
| -0.51, 0.67, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2 | 7 | 90 |
| 0.51, 0.00, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 4.3 | 7 | 90 |
| -0.27, 0.00, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 2 | 7 | 90 |
| -0.17, 0.10, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.38 | 7 | 90 |
| -0.03, 2.42, 0.00 | doorModern.lod1/stone_white + wall/wall | 2.2 | 6 | 88.9 |
| -0.17, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 1.35 | 6 | 90 |
| 0.46, 0.00, -0.11 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.19 | 6 | 90 |
| -0.17, 2.08, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.19 | 6 | 90 |
| 0.14, 2.08, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 1.35 | 6 | 90 |
| -0.26, 0.00, 0.00 | doorModern.lod1/stone_blue + wall/wall | 2.2 | 5 | 90 |
| 0.48, 2.08, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.23 | 5 | 90 |
| 0.46, 0.05, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.38 | 5 | 90 |
| -0.63, -0.04, 0.00 | doorModern.lod1/stone_blue + wall/wall | 0.22 | 4 | 90 |
| -0.63, -0.06, 0.01 | doorModern.lod1/stone_blue + ground/ground | 3.2 | 4 | 90 |
| -0.55, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.21 | 4 | 90 |
| -0.51, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.56 | 4 | 90 |
| -0.27, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.2 | 4 | 90 |
| -0.23, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.19 | 4 | 90 |
| 0.63, -0.02, 0.00 | doorModern.lod1/stone_blue + wall/wall | 0.22 | 4 | 90 |
| 0.51, 0.00, -0.09 | doorModern.lod1/stone_blue + doorModern.lod1/metal_anodised | 0.21 | 4 | 90 |
| -0.51, 2.25, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.59 | 4 | 90 |
| -0.27, 0.95, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 1.15 | 4 | 90 |
| -0.45, 0.94, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.25 | 4 | 90 |
| 0.51, 2.12, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.59 | 4 | 90 |
| -0.17, 2.03, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.64 | 4 | 90 |
| -0.02, 0.21, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/glass_window | 0.64 | 4 | 90 |
| -0.55, 0.91, -0.12 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 2.78 | 3 | 90 |
| 0.11, 2.42, -0.12 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 1.25 | 3 | 90 |

(16 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.16 | doorModern.lod1/stone_white | 1 + 0 + 0 | 2.425 |
| 0.55, 0.05, -0.16 | doorModern.lod1/stone_white | -1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.16 | doorModern.lod1/stone_white | 0 + -1 + 0 | 1.1 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.57, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 111)

| at | parts | area |
|---|---|---|
| -0.55, 0.82, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.06534 |
| -0.55, 0.79, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01627 |
| 0.55, 0.49, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00634 |
| 0.55, 0.58, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.05404 |
| -0.34, 2.42, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01685 |
| -0.15, 2.42, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00795 |
| 0.55, 1.58, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.06629 |
| 0.55, 1.58, -0.07 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01859 |
| 0.05, 2.42, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.01345 |
| 0.26, 2.42, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.02235 |
| 0.52, 2.42, -0.10 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00135 |
| 0.54, 2.42, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00135 |
| -0.55, 1.90, -0.11 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.00729 |
| -0.55, 1.80, -0.08 | doorModern.lod1/stone_white + doorModern.lod1/metal_anodised | 0.05635 |
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
| -0.51, 0.69, -0.11 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00226 |
| -0.51, 0.87, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00131 |
| -0.51, 2.09, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00118 |
| -0.51, 2.21, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00536 |
| -0.51, 2.11, -0.09 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00091 |
| -0.51, 2.29, -0.08 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00536 |
| -0.51, 2.39, -0.10 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00135 |
| -0.51, 2.41, -0.07 | doorModern.lod1/metal_anodised + doorModern.lod1/metal_anodised | 0.00133 |

(71 more in the JSON)
