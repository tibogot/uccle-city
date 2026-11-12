# Kit audit: band.straight LOD1

30 triangles, 19 welded vertices, 10 open edges, 7,272 rays, 2 ms.

**0 blocking**, 18 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 12 |
| nonmanifold | warn | 6 |
| seam | info | 8 |
| opening | info | 2 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 12)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.12, 0.02 | band.lod1/stone_white | 80 | 3 |
| -2.00, 3.13, 0.04 | band.lod1/stone_white | 77 | 3 |
| -2.00, 3.25, 0.03 | band.lod1/stone_white | 57 | 3 |
| -1.00, 3.12, 0.01 | band.lod1/stone_white | 80 | 3 |
| -1.00, 3.15, 0.04 | band.lod1/stone_white | 77 | 3 |
| -1.00, 3.25, 0.01 | band.lod1/stone_white | 57 | 3 |
| 1.00, 3.12, 0.02 | band.lod1/stone_white | 80 | 3 |
| 1.00, 3.13, 0.04 | band.lod1/stone_white | 77 | 3 |
| 1.00, 3.25, 0.03 | band.lod1/stone_white | 57 | 3 |
| 2.00, 3.12, 0.01 | band.lod1/stone_white | 80 | 3 |
| 2.00, 3.15, 0.04 | band.lod1/stone_white | 77 | 3 |
| 2.00, 3.25, 0.01 | band.lod1/stone_white | 57 | 3 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| 0.00, 3.12, 0.02 | band.lod1/stone_white | 4 |
| 0.00, 3.14, 0.04 | band.lod1/stone_white | 4 |
| 0.00, 3.20, 0.05 | band.lod1/stone_white | 4 |
| 0.00, 3.25, 0.02 | band.lod1/stone_white | 4 |
| 0.00, 3.21, 0.02 | band.lod1/stone_white | 4 |
| 0.00, 3.14, 0.02 | band.lod1/stone_white | 4 |

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.08, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 6.14 | 9 | 66.1 |
| -2.92, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 6.14 | 7 | 66.1 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 90 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 90 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 90 |
| 0.00, 3.26, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 90 |
| 0.00, 3.19, 0.00 | band.lod1/stone_white + wall/wall | 0.13 | 1 | 90 |
| 0.00, 3.12, 0.00 | band.lod1/stone_white + wall/wall | 0 | 1 | 90 |

## opening (info, 2)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.15, 1.26, 0.00 | wall/wall | 0 + 0 + 1 | 6.4 |
| 3.15, 4.06, 0.00 | wall/wall | 0 + 0 + 1 | 6.4 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 0.00, 3.18, 0.01 | band.lod1/stone_white + band.lod1/stone_white | 0.00336 |
| 0.00, 3.22, 0.03 | band.lod1/stone_white + band.lod1/stone_white | 0.00191 |
| 0.00, 3.13, 0.03 | band.lod1/stone_white + band.lod1/stone_white | 0.0007 |
