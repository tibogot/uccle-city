# Kit audit: cornice.straight LOD1

114 triangles, 64 welded vertices, 18 open edges, 12,768 rays, 4 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 36 |
| nonmanifold | warn | 4 |
| seam | info | 3 |
| opening | info | 4 |
| backtoback | info | 21 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 36)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.40, 0.00 | cornice.lod1/stone_white | 214 | 3 |
| -2.00, 3.53, 0.03 | cornice.lod1/stone_white | 132 | 3 |
| -2.00, 3.54, 0.04 | cornice.lod1/stone_white | 125 | 3 |
| -2.00, 3.56, 0.06 | cornice.lod1/stone_white | 75 | 3 |
| -2.00, 3.60, 0.10 | cornice.lod1/stone_white | 55 | 3.001 |
| -2.00, 3.63, 0.12 | cornice.lod1/stone_white | 88 | 3 |
| -2.00, 3.64, 0.31 | cornice.lod1/stone_white | 100 | 3 |
| -1.00, 3.40, 0.01 | cornice.lod1/stone_white | 144 | 3 |
| -1.00, 3.54, 0.04 | cornice.lod1/stone_white | 188 | 3 |
| -1.00, 3.55, 0.04 | cornice.lod1/stone_white | 125 | 3 |
| -1.00, 3.56, 0.05 | cornice.lod1/stone_white | 114 | 3 |
| -1.00, 3.63, 0.13 | cornice.lod1/stone_white | 134 | 3 |
| -1.00, 3.64, 0.30 | cornice.lod1/stone_white | 234 | 3 |
| -1.00, 3.64, 0.31 | cornice.lod1/stone_white | 375 | 3 |
| -1.00, 3.64, 0.32 | cornice.lod1/stone_white | 150 | 3 |
| -1.00, 3.94, 0.37 | cornice.lod1/stone_white | 144 | 3 |
| -2.00, 3.93, 0.38 | cornice.lod1/zinc_roof | 120 | 3 |
| -1.00, 3.94, 0.38 | cornice.lod1/zinc_roof | 120 | 3 |
| 1.00, 3.40, 0.00 | cornice.lod1/stone_white | 214 | 3 |
| 1.00, 3.53, 0.03 | cornice.lod1/stone_white | 132 | 3 |
| 1.00, 3.54, 0.04 | cornice.lod1/stone_white | 125 | 3 |
| 1.00, 3.56, 0.06 | cornice.lod1/stone_white | 75 | 3 |
| 1.00, 3.60, 0.10 | cornice.lod1/stone_white | 55 | 3.001 |
| 1.00, 3.63, 0.12 | cornice.lod1/stone_white | 88 | 3 |
| 1.00, 3.64, 0.31 | cornice.lod1/stone_white | 100 | 3 |
| 2.00, 3.40, 0.01 | cornice.lod1/stone_white | 144 | 3 |
| 2.00, 3.54, 0.04 | cornice.lod1/stone_white | 188 | 3 |
| 2.00, 3.55, 0.04 | cornice.lod1/stone_white | 125 | 3 |
| 2.00, 3.56, 0.05 | cornice.lod1/stone_white | 114 | 3 |
| 2.00, 3.63, 0.13 | cornice.lod1/stone_white | 134 | 3 |
| 2.00, 3.64, 0.30 | cornice.lod1/stone_white | 234 | 3 |
| 2.00, 3.64, 0.31 | cornice.lod1/stone_white | 375 | 3 |
| 2.00, 3.64, 0.32 | cornice.lod1/stone_white | 150 | 3 |
| 2.00, 3.94, 0.37 | cornice.lod1/stone_white | 144 | 3 |
| 1.00, 3.93, 0.38 | cornice.lod1/zinc_roof | 120 | 3 |
| 2.00, 3.94, 0.38 | cornice.lod1/zinc_roof | 120 | 3 |

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.00, 3.55, 0.04 | cornice.lod1/stone_white | 4 |
| 0.00, 3.64, 0.21 | cornice.lod1/stone_white | 4 |
| 0.00, 3.78, 0.02 | cornice.lod1/stone_white | 4 |
| 0.00, 3.82, 0.06 | cornice.lod1/stone_white | 4 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 1.29, 3.40, 0.00 | cornice.lod1/stone_white + wall/wall | 7.2 | 19 | 73.3 |
| -1.71, 3.40, 0.00 | cornice.lod1/stone_white + wall/wall | 7.2 | 18 | 73.3 |
| 0.00, 3.53, 0.02 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.41 | 17 | 89.8 |

## opening (info, 4)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 4.00, 0.10 | cornice.lod1/zinc_roof | 0 + 0.99 + 0.16 | 0.341 |
| 3.00, 3.96, 0.32 | cornice.lod1/zinc_roof | 0 + 0.99 + 0.16 | 0.341 |
| -3.15, 2.00, 0.00 | wall/wall | 0 + 0 + 1 | 6.4 |
| 3.15, 4.80, 0.00 | wall/wall | 0 + 0 + 1 | 6.4 |

## backtoback (info, 21)

| at | parts | area |
|---|---|---|
| 0.00, 3.64, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00602 |
| 0.00, 3.46, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00023 |
| 0.00, 3.77, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00147 |
| 0.00, 3.78, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00402 |
| 0.00, 3.91, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.02899 |
| 0.00, 3.91, 0.36 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.0004 |
| 0.00, 3.42, 0.01 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00065 |
| 0.00, 3.81, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00274 |
| 0.00, 3.73, 0.05 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.01596 |
| 0.00, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00015 |
| 0.00, 3.55, 0.04 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00019 |
| 0.00, 3.82, 0.06 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00307 |
| 0.00, 3.58, 0.07 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00059 |
| 0.00, 3.77, 0.15 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.04523 |
| 0.00, 3.87, 0.20 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00126 |
| 0.00, 3.64, 0.21 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00065 |
| 0.00, 3.67, 0.33 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00122 |
| 0.00, 3.64, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00008 |
| 0.00, 3.71, 0.23 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00021 |
| 0.00, 3.68, 0.22 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.01125 |
| 0.00, 3.71, 0.32 | cornice.lod1/stone_white + cornice.lod1/stone_white | 0.00073 |
