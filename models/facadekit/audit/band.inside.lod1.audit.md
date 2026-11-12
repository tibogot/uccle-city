# Kit audit: band.inside LOD1

32 triangles, 21 welded vertices, 12 open edges, 7,016 rays, 2 ms.

**0 blocking**, 18 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 12 |
| nonmanifold | warn | 6 |
| seam | info | 14 |
| opening | info | 6 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 12)

| at | part | aspect | longest |
|---|---|---|---|
| -2.01, 3.12, 0.02 | band.lod1/stone_white | 79 | 2.965 |
| -2.01, 3.13, 0.04 | band.lod1/stone_white | 76 | 2.965 |
| -2.02, 3.25, 0.03 | band.lod1/stone_white | 56 | 2.954 |
| -1.01, 3.12, 0.01 | band.lod1/stone_white | 80 | 3.002 |
| -1.03, 3.15, 0.04 | band.lod1/stone_white | 76 | 2.965 |
| -1.01, 3.25, 0.01 | band.lod1/stone_white | 57 | 3.002 |
| -0.02, 3.12, 1.01 | band.lod1/stone_white | 81 | 3.002 |
| -0.04, 3.13, 1.03 | band.lod1/stone_white | 76 | 2.964 |
| -0.03, 3.25, 1.01 | band.lod1/stone_white | 58 | 3.002 |
| -0.01, 3.12, 2.00 | band.lod1/stone_white | 80 | 3.002 |
| -0.04, 3.15, 2.02 | band.lod1/stone_white | 76 | 2.954 |
| -0.01, 3.25, 2.00 | band.lod1/stone_white | 57 | 3.002 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.02, 3.12, 0.02 | band.lod1/stone_white | 4 |
| -0.04, 3.14, 0.04 | band.lod1/stone_white | 4 |
| -0.05, 3.20, 0.05 | band.lod1/stone_white | 4 |
| -0.02, 3.25, 0.02 | band.lod1/stone_white | 4 |
| -0.02, 3.21, 0.02 | band.lod1/stone_white | 4 |
| -0.02, 3.14, 0.02 | band.lod1/stone_white | 4 |

## seam (info, 14)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.92, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 6.14 | 9 | 66.1 |
| 0.00, 3.12, 0.08 | band.lod1/stone_white + wall/wall | 6.14 | 9 | 66.1 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 45 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 3.19, -0.00 | band.lod1/stone_white | -1 + 0 + 0 | 0.14 |
| 0.00, 3.19, 3.00 | band.lod1/stone_white | 0 + 0 + 1 | 0.14 |
| -2.95, 1.26, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.06, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 1.26, 0.05 | wall/wall | -1 + 0 + 0 | 3 |
| 0.00, 4.06, 0.05 | wall/wall | -1 + 0 + 0 | 3 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| -0.01, 3.18, 0.01 | band.lod1/stone_white + band.lod1/stone_white | 0.00475 |
| -0.03, 3.22, 0.03 | band.lod1/stone_white + band.lod1/stone_white | 0.0027 |
| -0.03, 3.13, 0.03 | band.lod1/stone_white + band.lod1/stone_white | 0.00099 |
