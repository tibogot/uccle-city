# Kit audit: band.outside LOD0

120 triangles, 54 welded vertices, 12 open edges, 9,536 rays, 5 ms.

**0 blocking**, 85 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 60 |
| nonmanifold | warn | 25 |
| seam | info | 18 |
| opening | info | 6 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 60)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.12, 0.01 | band.lod0/stone_white | 94 | 2.998 |
| -1.99, 3.12, 0.03 | band.lod0/stone_white | 971 | 3.03 |
| -1.99, 3.12, 0.03 | band.lod0/stone_white | 972 | 3.033 |
| -1.99, 3.12, 0.04 | band.lod0/stone_white | 973 | 3.036 |
| -1.99, 3.13, 0.04 | band.lod0/stone_white | 973 | 3.037 |
| -1.99, 3.14, 0.04 | band.lod0/stone_white | 113 | 3.038 |
| -1.99, 3.16, 0.04 | band.lod0/stone_white | 322 | 3.038 |
| -1.99, 3.18, 0.05 | band.lod0/stone_white | 43 | 3.047 |
| -1.98, 3.23, 0.05 | band.lod0/stone_white | 651 | 3.05 |
| -1.98, 3.24, 0.05 | band.lod0/stone_white | 651 | 3.049 |
| -1.99, 3.24, 0.04 | band.lod0/stone_white | 651 | 3.046 |
| -1.99, 3.24, 0.04 | band.lod0/stone_white | 650 | 3.043 |
| -1.99, 3.25, 0.04 | band.lod0/stone_white | 237 | 3.038 |
| -1.99, 3.25, 0.02 | band.lod0/stone_white | 111 | 3.03 |
| -2.00, 3.26, 0.00 | band.lod0/stone_white | 501 | 3.004 |
| -0.99, 3.12, 0.02 | band.lod0/stone_white | 95 | 3.03 |
| -0.98, 3.12, 0.03 | band.lod0/stone_white | 972 | 3.033 |
| -0.98, 3.12, 0.04 | band.lod0/stone_white | 973 | 3.036 |
| -0.98, 3.12, 0.04 | band.lod0/stone_white | 973 | 3.037 |
| -0.97, 3.13, 0.04 | band.lod0/stone_white | 973 | 3.038 |
| -0.97, 3.15, 0.04 | band.lod0/stone_white | 113 | 3.038 |
| -0.97, 3.16, 0.04 | band.lod0/stone_white | 323 | 3.046 |
| -0.97, 3.21, 0.05 | band.lod0/stone_white | 44 | 3.05 |
| -0.97, 3.23, 0.05 | band.lod0/stone_white | 652 | 3.05 |
| -0.97, 3.24, 0.05 | band.lod0/stone_white | 652 | 3.049 |
| -0.97, 3.24, 0.04 | band.lod0/stone_white | 652 | 3.046 |
| -0.97, 3.24, 0.04 | band.lod0/stone_white | 651 | 3.043 |
| -0.98, 3.25, 0.03 | band.lod0/stone_white | 238 | 3.038 |
| -0.99, 3.26, 0.01 | band.lod0/stone_white | 112 | 3.03 |
| -1.00, 3.26, 0.00 | band.lod0/stone_white | 502 | 3.004 |
| 0.01, 3.12, -0.99 | band.lod0/stone_white | 96 | 3.03 |
| 0.03, 3.12, -0.98 | band.lod0/stone_white | 973 | 3.033 |
| 0.03, 3.12, -0.98 | band.lod0/stone_white | 973 | 3.036 |
| 0.04, 3.12, -0.98 | band.lod0/stone_white | 974 | 3.037 |
| 0.04, 3.13, -0.97 | band.lod0/stone_white | 973 | 3.038 |
| 0.04, 3.14, -0.97 | band.lod0/stone_white | 113 | 3.038 |
| 0.04, 3.16, -0.97 | band.lod0/stone_white | 324 | 3.046 |
| 0.05, 3.18, -0.97 | band.lod0/stone_white | 44 | 3.051 |
| 0.05, 3.23, -0.97 | band.lod0/stone_white | 651 | 3.05 |
| 0.05, 3.24, -0.97 | band.lod0/stone_white | 651 | 3.049 |

(20 more in the JSON)

## nonmanifold (warn, 25)

| at | part | uses |
|---|---|---|
| 0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.19, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.20, 0.04 | band.lod0/stone_white | 4 |
| 0.01, 3.12, 0.01 | band.lod0/stone_white | 4 |
| 0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| 0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| 0.04, 3.12, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.13, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.14, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.16, 0.04 | band.lod0/stone_white | 4 |
| 0.05, 3.19, 0.05 | band.lod0/stone_white | 4 |
| 0.05, 3.23, 0.05 | band.lod0/stone_white | 4 |
| 0.05, 3.24, 0.05 | band.lod0/stone_white | 4 |
| 0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| 0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| 0.03, 3.25, 0.03 | band.lod0/stone_white | 4 |
| 0.02, 3.26, 0.02 | band.lod0/stone_white | 4 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white | 4 |
| 0.02, 3.21, 0.02 | band.lod0/stone_white | 4 |
| 0.02, 3.14, 0.02 | band.lod0/stone_white | 4 |
| 0.02, 3.25, 0.02 | band.lod0/stone_white | 4 |
| 0.02, 3.25, 0.02 | band.lod0/stone_white | 4 |
| 0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| 0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| 0.03, 3.14, 0.03 | band.lod0/stone_white | 4 |

## seam (info, 18)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.60, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 6.14 | 10 | 90 |
| 0.00, 3.12, -2.40 | band.lod0/stone_white + wall/wall | 6.14 | 10 | 90 |
| 0.00, 3.19, 0.00 | band.lod0/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod0/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod0/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.19, 0.00 | band.lod0/stone_white + wall/wall | 0.13 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.26, 0.00 | band.lod0/stone_white + wall/wall | 0 | 1 | 45 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 3.19, -0.00 | band.lod0/stone_white | -1 + 0 + 0 | 0.14 |
| -0.00, 3.19, -3.00 | band.lod0/stone_white | 0 + 0 + -1 | 0.14 |
| -2.95, 1.26, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.06, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 1.26, -0.05 | wall/wall | 1 + 0 + 0 | 3 |
| 0.00, 4.06, -0.05 | wall/wall | 1 + 0 + 0 | 3 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| 0.04, 3.21, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00074 |
| 0.01, 3.18, 0.01 | band.lod0/stone_white + band.lod0/stone_white | 0.00396 |
| 0.01, 3.25, 0.01 | band.lod0/stone_white + band.lod0/stone_white | 0.00008 |
| 0.03, 3.22, 0.03 | band.lod0/stone_white + band.lod0/stone_white | 0.00246 |
| 0.02, 3.25, 0.02 | band.lod0/stone_white + band.lod0/stone_white | 0.00014 |
| 0.04, 3.18, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00038 |
| 0.04, 3.13, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00015 |
| 0.02, 3.13, 0.02 | band.lod0/stone_white + band.lod0/stone_white | 0.00079 |
