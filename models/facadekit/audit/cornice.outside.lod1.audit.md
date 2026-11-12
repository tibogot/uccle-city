# Kit audit: cornice.outside LOD1

364 triangles, 198 welded vertices, 20 open edges, 12,768 rays, 9 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 36 |
| nonmanifold | warn | 4 |
| seam | info | 9 |
| opening | info | 10 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 36)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.40, 0.00 | cornice.lod1/stone_white | 214 | 2.998 |
| -1.99, 3.53, 0.03 | cornice.lod1/stone_white | 133 | 3.024 |
| -1.99, 3.54, 0.04 | cornice.lod1/stone_white | 127 | 3.04 |
| -1.98, 3.56, 0.06 | cornice.lod1/stone_white | 76 | 3.066 |
| -1.96, 3.60, 0.10 | cornice.lod1/stone_white | 57 | 3.121 |
| -1.96, 3.63, 0.12 | cornice.lod1/stone_white | 92 | 3.12 |
| -1.90, 3.64, 0.31 | cornice.lod1/stone_white | 110 | 3.31 |
| -0.99, 3.40, 0.01 | cornice.lod1/stone_white | 145 | 3.018 |
| -0.98, 3.54, 0.04 | cornice.lod1/stone_white | 190 | 3.04 |
| -0.97, 3.55, 0.04 | cornice.lod1/stone_white | 127 | 3.04 |
| -0.96, 3.56, 0.05 | cornice.lod1/stone_white | 118 | 3.066 |
| -0.92, 3.63, 0.13 | cornice.lod1/stone_white | 140 | 3.13 |
| -0.80, 3.64, 0.30 | cornice.lod1/stone_white | 259 | 3.31 |
| -0.79, 3.64, 0.31 | cornice.lod1/stone_white | 414 | 3.31 |
| -0.79, 3.64, 0.32 | cornice.lod1/stone_white | 166 | 3.33 |
| -0.76, 3.94, 0.37 | cornice.lod1/stone_white | 162 | 3.37 |
| -1.87, 3.93, 0.38 | cornice.lod1/zinc_roof | 135 | 3.378 |
| -0.75, 3.94, 0.38 | cornice.lod1/zinc_roof | 135 | 3.378 |
| 0.00, 3.40, -1.00 | cornice.lod1/stone_white | 216 | 3.012 |
| 0.03, 3.53, -0.98 | cornice.lod1/stone_white | 134 | 3.04 |
| 0.04, 3.54, -0.97 | cornice.lod1/stone_white | 127 | 3.04 |
| 0.06, 3.56, -0.96 | cornice.lod1/stone_white | 77 | 3.08 |
| 0.10, 3.60, -0.94 | cornice.lod1/stone_white | 56 | 3.107 |
| 0.12, 3.63, -0.92 | cornice.lod1/stone_white | 93 | 3.13 |
| 0.31, 3.64, -0.79 | cornice.lod1/stone_white | 112 | 3.33 |
| 0.01, 3.40, -2.00 | cornice.lod1/stone_white | 144 | 3.012 |
| 0.04, 3.54, -1.99 | cornice.lod1/stone_white | 190 | 3.04 |
| 0.04, 3.55, -1.99 | cornice.lod1/stone_white | 127 | 3.04 |
| 0.05, 3.56, -1.99 | cornice.lod1/stone_white | 116 | 3.04 |
| 0.13, 3.63, -1.96 | cornice.lod1/stone_white | 140 | 3.13 |
| 0.30, 3.64, -1.90 | cornice.lod1/stone_white | 258 | 3.3 |
| 0.31, 3.64, -1.90 | cornice.lod1/stone_white | 412 | 3.3 |
| 0.32, 3.64, -1.89 | cornice.lod1/stone_white | 167 | 3.33 |
| 0.37, 3.94, -1.88 | cornice.lod1/stone_white | 161 | 3.37 |
| 0.38, 3.93, -0.75 | cornice.lod1/zinc_roof | 135 | 3.378 |
| 0.38, 3.94, -1.88 | cornice.lod1/zinc_roof | 135 | 3.376 |

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.04, 3.55, 0.04 | cornice.lod1/stone_white | 4 |
| 0.21, 3.64, 0.21 | cornice.lod1/stone_white | 4 |
| 0.02, 3.78, 0.02 | cornice.lod1/stone_white | 4 |
| 0.06, 3.82, 0.06 | cornice.lod1/stone_white | 4 |

## seam (info, 9)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.65, 3.47, 0.02 | cornice.lod1/stone_white + modillion.lod1/stone_white | 0.66 | 38 | 63.4 |
| -2.05, 3.47, 0.02 | cornice.lod1/stone_white + modillion.lod1/stone_white | 0.66 | 38 | 63.4 |
| -1.45, 3.53, 0.02 | cornice.lod1/stone_white + modillion.lod1/stone_white | 0.66 | 36 | 63.4 |
| -0.85, 3.53, 0.02 | cornice.lod1/stone_white + modillion.lod1/stone_white | 0.65 | 36 | 63.4 |
| -0.96, 3.40, 0.00 | cornice.lod1/stone_white + wall/wall | 7.2 | 20 | 45 |
| 0.00, 3.40, -2.04 | cornice.lod1/stone_white + wall/wall | 7.2 | 20 | 45 |
| 0.02, 3.53, 0.02 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.43 | 17 | 44.8 |
| 0.00, 3.69, 0.00 | cornice.lod1/stone_white + wall/wall | 0.6 | 7 | 45 |
| 0.00, 3.68, 0.00 | cornice.lod1/stone_white + wall/wall | 0.6 | 7 | 45 |

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 3.45, -0.00 | cornice.lod1/stone_white | -1 + 0 + 0 | 0.602 |
| -3.00, 4.00, 0.10 | cornice.lod1/zinc_roof | 0 + 0.99 + 0.16 | 0.341 |
| -3.00, 3.94, 0.38 | cornice.lod1/zinc_roof | 0 + 0.08 + 1 | 0.025 |
| -0.00, 3.45, -3.00 | cornice.lod1/stone_white | 0 + 0 + -1 | 0.602 |
| 0.32, 3.96, -3.00 | cornice.lod1/zinc_roof | 0.16 + 0.99 + 0 | 0.341 |
| 0.38, 3.94, -3.00 | cornice.lod1/zinc_roof | 1 + 0.08 + 0 | 0.025 |
| -2.95, 2.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.80, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 2.00, -0.05 | wall/wall | 1 + 0 + 0 | 3 |
| 0.00, 4.80, -0.05 | wall/wall | 1 + 0 + 0 | 3 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.01, 3.64, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00851 |
| 0.01, 3.46, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00033 |
| 0.01, 3.77, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00208 |
| 0.01, 3.78, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00569 |
| 0.21, 3.91, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.041 |
| 0.36, 3.91, 0.36 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00056 |
| 0.01, 3.42, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00091 |
| 0.06, 3.81, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00387 |
| 0.05, 3.73, 0.05 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.02257 |
| 0.07, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00021 |
| 0.04, 3.55, 0.04 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00027 |
| 0.06, 3.82, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00435 |
| 0.07, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00083 |
| 0.15, 3.77, 0.15 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.06396 |
| 0.20, 3.87, 0.20 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00179 |
| 0.21, 3.64, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00092 |
| 0.30, 3.64, 0.30 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00004 |
| 0.33, 3.67, 0.33 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00173 |
| 0.32, 3.64, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00011 |
| 0.23, 3.71, 0.23 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.0003 |
| 0.22, 3.68, 0.22 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.01591 |
| 0.32, 3.71, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00103 |
