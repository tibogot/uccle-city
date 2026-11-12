# Kit audit: band.inside LOD0

120 triangles, 54 welded vertices, 12 open edges, 9,536 rays, 3 ms.

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
| -2.00, 3.12, 0.01 | band.lod0/stone_white | 94 | 3.002 |
| -2.01, 3.12, 0.03 | band.lod0/stone_white | 951 | 2.97 |
| -2.01, 3.12, 0.03 | band.lod0/stone_white | 951 | 2.967 |
| -2.01, 3.12, 0.04 | band.lod0/stone_white | 950 | 2.964 |
| -2.01, 3.13, 0.04 | band.lod0/stone_white | 949 | 2.963 |
| -2.01, 3.14, 0.04 | band.lod0/stone_white | 110 | 2.962 |
| -2.01, 3.16, 0.04 | band.lod0/stone_white | 314 | 2.962 |
| -2.02, 3.18, 0.05 | band.lod0/stone_white | 42 | 2.955 |
| -2.02, 3.23, 0.05 | band.lod0/stone_white | 630 | 2.95 |
| -2.02, 3.24, 0.05 | band.lod0/stone_white | 630 | 2.951 |
| -2.02, 3.24, 0.04 | band.lod0/stone_white | 631 | 2.954 |
| -2.01, 3.24, 0.04 | band.lod0/stone_white | 632 | 2.957 |
| -2.01, 3.25, 0.04 | band.lod0/stone_white | 231 | 2.962 |
| -2.01, 3.25, 0.02 | band.lod0/stone_white | 109 | 2.97 |
| -2.00, 3.26, 0.00 | band.lod0/stone_white | 499 | 2.996 |
| -1.01, 3.12, 0.02 | band.lod0/stone_white | 95 | 3.002 |
| -1.02, 3.12, 0.03 | band.lod0/stone_white | 952 | 2.97 |
| -1.02, 3.12, 0.04 | band.lod0/stone_white | 951 | 2.967 |
| -1.02, 3.12, 0.04 | band.lod0/stone_white | 950 | 2.964 |
| -1.02, 3.13, 0.04 | band.lod0/stone_white | 949 | 2.963 |
| -1.02, 3.15, 0.04 | band.lod0/stone_white | 110 | 2.962 |
| -1.03, 3.16, 0.04 | band.lod0/stone_white | 315 | 2.962 |
| -1.03, 3.21, 0.05 | band.lod0/stone_white | 42 | 2.955 |
| -1.03, 3.23, 0.05 | band.lod0/stone_white | 630 | 2.951 |
| -1.03, 3.24, 0.05 | band.lod0/stone_white | 631 | 2.954 |
| -1.03, 3.24, 0.04 | band.lod0/stone_white | 632 | 2.957 |
| -1.03, 3.24, 0.04 | band.lod0/stone_white | 633 | 2.962 |
| -1.02, 3.25, 0.03 | band.lod0/stone_white | 232 | 2.97 |
| -1.01, 3.26, 0.01 | band.lod0/stone_white | 110 | 2.996 |
| -1.00, 3.26, 0.00 | band.lod0/stone_white | 500 | 3.002 |
| -0.01, 3.12, 1.01 | band.lod0/stone_white | 94 | 3.002 |
| -0.03, 3.12, 1.02 | band.lod0/stone_white | 951 | 2.97 |
| -0.03, 3.12, 1.02 | band.lod0/stone_white | 951 | 2.967 |
| -0.04, 3.12, 1.02 | band.lod0/stone_white | 950 | 2.964 |
| -0.04, 3.13, 1.02 | band.lod0/stone_white | 949 | 2.963 |
| -0.04, 3.14, 1.02 | band.lod0/stone_white | 110 | 2.962 |
| -0.04, 3.16, 1.03 | band.lod0/stone_white | 314 | 2.962 |
| -0.05, 3.18, 1.03 | band.lod0/stone_white | 42 | 2.954 |
| -0.05, 3.23, 1.03 | band.lod0/stone_white | 630 | 2.951 |
| -0.05, 3.24, 1.03 | band.lod0/stone_white | 631 | 2.954 |

(20 more in the JSON)

## nonmanifold (warn, 25)

| at | part | uses |
|---|---|---|
| -0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.19, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.20, 0.04 | band.lod0/stone_white | 4 |
| -0.01, 3.12, 0.01 | band.lod0/stone_white | 4 |
| -0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| -0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| -0.04, 3.12, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.13, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.14, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.16, 0.04 | band.lod0/stone_white | 4 |
| -0.05, 3.19, 0.05 | band.lod0/stone_white | 4 |
| -0.05, 3.23, 0.05 | band.lod0/stone_white | 4 |
| -0.05, 3.24, 0.05 | band.lod0/stone_white | 4 |
| -0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| -0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| -0.03, 3.25, 0.03 | band.lod0/stone_white | 4 |
| -0.02, 3.26, 0.02 | band.lod0/stone_white | 4 |
| -0.00, 3.26, 0.00 | band.lod0/stone_white | 4 |
| -0.02, 3.21, 0.02 | band.lod0/stone_white | 4 |
| -0.02, 3.14, 0.02 | band.lod0/stone_white | 4 |
| -0.02, 3.25, 0.02 | band.lod0/stone_white | 4 |
| -0.02, 3.25, 0.02 | band.lod0/stone_white | 4 |
| -0.04, 3.24, 0.04 | band.lod0/stone_white | 4 |
| -0.03, 3.12, 0.03 | band.lod0/stone_white | 4 |
| -0.03, 3.14, 0.03 | band.lod0/stone_white | 4 |

## seam (info, 18)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.60, 3.12, 0.00 | band.lod0/stone_white + wall/wall | 6.14 | 10 | 90 |
| 0.00, 3.12, 2.40 | band.lod0/stone_white + wall/wall | 6.14 | 10 | 90 |
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
| 0.00, 3.19, 3.00 | band.lod0/stone_white | 0 + 0 + 1 | 0.14 |
| -2.95, 1.26, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.06, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 1.26, 0.05 | wall/wall | -1 + 0 + 0 | 3 |
| 0.00, 4.06, 0.05 | wall/wall | -1 + 0 + 0 | 3 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -0.04, 3.21, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00074 |
| -0.01, 3.18, 0.01 | band.lod0/stone_white + band.lod0/stone_white | 0.00396 |
| -0.01, 3.25, 0.01 | band.lod0/stone_white + band.lod0/stone_white | 0.00008 |
| -0.03, 3.22, 0.03 | band.lod0/stone_white + band.lod0/stone_white | 0.00246 |
| -0.02, 3.25, 0.02 | band.lod0/stone_white + band.lod0/stone_white | 0.00014 |
| -0.04, 3.18, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00038 |
| -0.04, 3.13, 0.04 | band.lod0/stone_white + band.lod0/stone_white | 0.00015 |
| -0.02, 3.13, 0.02 | band.lod0/stone_white + band.lod0/stone_white | 0.00079 |
