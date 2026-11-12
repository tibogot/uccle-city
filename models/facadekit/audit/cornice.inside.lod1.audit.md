# Kit audit: cornice.inside LOD1

116 triangles, 66 welded vertices, 20 open edges, 12,256 rays, 6 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 36 |
| nonmanifold | warn | 4 |
| seam | info | 5 |
| opening | info | 10 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 36)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.40, 0.00 | cornice.lod1/stone_white | 214 | 3.002 |
| -2.01, 3.53, 0.03 | cornice.lod1/stone_white | 131 | 2.976 |
| -2.01, 3.54, 0.04 | cornice.lod1/stone_white | 123 | 2.96 |
| -2.02, 3.56, 0.06 | cornice.lod1/stone_white | 73 | 2.934 |
| -2.04, 3.60, 0.10 | cornice.lod1/stone_white | 52 | 2.881 |
| -2.04, 3.63, 0.12 | cornice.lod1/stone_white | 85 | 2.88 |
| -2.10, 3.64, 0.31 | cornice.lod1/stone_white | 90 | 2.69 |
| -1.00, 3.40, 0.01 | cornice.lod1/stone_white | 144 | 3.002 |
| -1.02, 3.54, 0.04 | cornice.lod1/stone_white | 187 | 2.976 |
| -1.03, 3.55, 0.04 | cornice.lod1/stone_white | 123 | 2.96 |
| -1.03, 3.56, 0.05 | cornice.lod1/stone_white | 113 | 2.96 |
| -1.08, 3.63, 0.13 | cornice.lod1/stone_white | 129 | 2.88 |
| -1.20, 3.64, 0.30 | cornice.lod1/stone_white | 211 | 2.7 |
| -1.21, 3.64, 0.31 | cornice.lod1/stone_white | 336 | 2.69 |
| -1.21, 3.64, 0.32 | cornice.lod1/stone_white | 136 | 2.69 |
| -1.25, 3.94, 0.37 | cornice.lod1/stone_white | 126 | 2.636 |
| -2.13, 3.93, 0.38 | cornice.lod1/zinc_roof | 105 | 2.622 |
| -1.25, 3.94, 0.38 | cornice.lod1/zinc_roof | 105 | 2.624 |
| -0.00, 3.40, 1.00 | cornice.lod1/stone_white | 214 | 3.002 |
| -0.03, 3.53, 1.02 | cornice.lod1/stone_white | 131 | 2.982 |
| -0.04, 3.54, 1.03 | cornice.lod1/stone_white | 123 | 2.96 |
| -0.06, 3.56, 1.04 | cornice.lod1/stone_white | 74 | 2.96 |
| -0.10, 3.60, 1.06 | cornice.lod1/stone_white | 54 | 2.921 |
| -0.12, 3.63, 1.08 | cornice.lod1/stone_white | 85 | 2.893 |
| -0.31, 3.64, 1.21 | cornice.lod1/stone_white | 90 | 2.7 |
| -0.01, 3.40, 2.00 | cornice.lod1/stone_white | 143 | 2.988 |
| -0.04, 3.54, 2.01 | cornice.lod1/stone_white | 185 | 2.96 |
| -0.04, 3.55, 2.01 | cornice.lod1/stone_white | 123 | 2.96 |
| -0.05, 3.56, 2.01 | cornice.lod1/stone_white | 113 | 2.96 |
| -0.13, 3.63, 2.04 | cornice.lod1/stone_white | 128 | 2.87 |
| -0.30, 3.64, 2.10 | cornice.lod1/stone_white | 211 | 2.7 |
| -0.31, 3.64, 2.10 | cornice.lod1/stone_white | 337 | 2.7 |
| -0.32, 3.64, 2.11 | cornice.lod1/stone_white | 134 | 2.67 |
| -0.37, 3.94, 2.12 | cornice.lod1/stone_white | 126 | 2.63 |
| -0.38, 3.93, 1.25 | cornice.lod1/zinc_roof | 105 | 2.624 |
| -0.38, 3.94, 2.13 | cornice.lod1/zinc_roof | 105 | 2.624 |

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.04, 3.55, 0.04 | cornice.lod1/stone_white | 4 |
| -0.21, 3.64, 0.21 | cornice.lod1/stone_white | 4 |
| -0.02, 3.78, 0.02 | cornice.lod1/stone_white | 4 |
| -0.06, 3.82, 0.06 | cornice.lod1/stone_white | 4 |

## seam (info, 5)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.96, 3.40, 0.00 | cornice.lod1/stone_white + wall/wall | 7.2 | 20 | 45 |
| 0.00, 3.40, 2.04 | cornice.lod1/stone_white + wall/wall | 7.2 | 20 | 45 |
| -0.02, 3.53, 0.02 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.43 | 17 | 45 |
| 0.00, 3.69, 0.00 | cornice.lod1/stone_white + wall/wall | 0.6 | 7 | 45 |
| 0.00, 3.68, 0.00 | cornice.lod1/stone_white + wall/wall | 0.6 | 7 | 45 |

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 3.45, -0.00 | cornice.lod1/stone_white | -1 + 0 + 0 | 0.602 |
| -3.00, 4.00, 0.10 | cornice.lod1/zinc_roof | 0 + 0.99 + 0.16 | 0.341 |
| -3.00, 3.94, 0.38 | cornice.lod1/zinc_roof | 0 + 0.08 + 1 | 0.025 |
| 0.00, 3.45, 3.00 | cornice.lod1/stone_white | 0 + 0 + 1 | 0.602 |
| -0.32, 3.96, 3.00 | cornice.lod1/zinc_roof | -0.16 + 0.99 + 0 | 0.341 |
| -0.38, 3.94, 3.00 | cornice.lod1/zinc_roof | -1 + 0.08 + 0 | 0.025 |
| -2.95, 2.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.80, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 2.00, 0.05 | wall/wall | -1 + 0 + 0 | 3 |
| 0.00, 4.80, 0.05 | wall/wall | -1 + 0 + 0 | 3 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| -0.01, 3.64, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00851 |
| -0.01, 3.46, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00033 |
| -0.01, 3.77, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00208 |
| -0.01, 3.78, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00569 |
| -0.21, 3.91, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.041 |
| -0.36, 3.91, 0.36 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00056 |
| -0.01, 3.42, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00091 |
| -0.06, 3.81, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00387 |
| -0.05, 3.73, 0.05 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.02257 |
| -0.07, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00021 |
| -0.04, 3.55, 0.04 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00027 |
| -0.06, 3.82, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00435 |
| -0.07, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00083 |
| -0.15, 3.77, 0.15 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.06396 |
| -0.20, 3.87, 0.20 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00179 |
| -0.21, 3.64, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00092 |
| -0.30, 3.64, 0.30 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00004 |
| -0.33, 3.67, 0.33 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00173 |
| -0.32, 3.64, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00011 |
| -0.23, 3.71, 0.23 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.0003 |
| -0.22, 3.68, 0.22 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.01591 |
| -0.32, 3.71, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00103 |
