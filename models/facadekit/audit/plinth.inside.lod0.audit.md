# Kit audit: plinth.inside LOD0

72 triangles, 36 welded vertices, 12 open edges, 8,608 rays, 2 ms.

**0 blocking**, 46 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 32 |
| nonmanifold | warn | 14 |
| seam | info | 12 |
| opening | info | 2 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 32)

| at | part | aspect | longest |
|---|---|---|---|
| -2.01, 0.50, 0.04 | plinth.lod0/stone_blue | 632 | 2.958 |
| -2.01, 0.51, 0.04 | plinth.lod0/stone_blue | 632 | 2.959 |
| -2.01, 0.51, 0.04 | plinth.lod0/stone_blue | 633 | 2.962 |
| -2.01, 0.51, 0.03 | plinth.lod0/stone_blue | 633 | 2.965 |
| -2.01, 0.52, 0.02 | plinth.lod0/stone_blue | 74 | 2.97 |
| -2.00, 0.55, 0.01 | plinth.lod0/stone_blue | 256 | 2.988 |
| -2.00, 0.56, 0.00 | plinth.lod0/stone_blue | 512 | 2.997 |
| -0.02, 0.24, 0.02 | plinth.lod0/stone_blue | 46 | 0.813 |
| -1.03, 0.50, 0.04 | plinth.lod0/stone_blue | 632 | 2.959 |
| -1.03, 0.51, 0.04 | plinth.lod0/stone_blue | 633 | 2.962 |
| -1.02, 0.51, 0.04 | plinth.lod0/stone_blue | 633 | 2.965 |
| -1.02, 0.51, 0.03 | plinth.lod0/stone_blue | 634 | 2.97 |
| -1.01, 0.54, 0.02 | plinth.lod0/stone_blue | 74 | 2.988 |
| -1.00, 0.55, 0.01 | plinth.lod0/stone_blue | 257 | 2.996 |
| -1.00, 0.56, 0.00 | plinth.lod0/stone_blue | 513 | 3.002 |
| -3.00, 0.24, 0.02 | plinth.lod0/stone_blue | 65 | 0.813 |
| -0.04, 0.50, 1.03 | plinth.lod0/stone_blue | 632 | 2.959 |
| -0.04, 0.51, 1.03 | plinth.lod0/stone_blue | 633 | 2.962 |
| -0.04, 0.51, 1.02 | plinth.lod0/stone_blue | 634 | 2.965 |
| -0.03, 0.51, 1.02 | plinth.lod0/stone_blue | 635 | 2.97 |
| -0.02, 0.52, 1.01 | plinth.lod0/stone_blue | 75 | 2.988 |
| -0.01, 0.55, 1.00 | plinth.lod0/stone_blue | 257 | 2.997 |
| -0.00, 0.56, 1.00 | plinth.lod0/stone_blue | 514 | 3.002 |
| -0.02, 0.24, 3.00 | plinth.lod0/stone_blue | 65 | 0.813 |
| -0.04, 0.50, 2.01 | plinth.lod0/stone_blue | 632 | 2.959 |
| -0.04, 0.51, 2.01 | plinth.lod0/stone_blue | 633 | 2.962 |
| -0.04, 0.51, 2.01 | plinth.lod0/stone_blue | 633 | 2.965 |
| -0.03, 0.51, 2.01 | plinth.lod0/stone_blue | 634 | 2.97 |
| -0.02, 0.54, 2.00 | plinth.lod0/stone_blue | 74 | 2.988 |
| -0.01, 0.55, 2.00 | plinth.lod0/stone_blue | 257 | 2.997 |
| 0.00, 0.56, 2.00 | plinth.lod0/stone_blue | 513 | 3.002 |
| -0.02, 0.24, 0.02 | plinth.lod0/stone_blue | 46 | 0.813 |

## nonmanifold (warn, 14)

| at | part | uses |
|---|---|---|
| -0.04, 0.51, 0.04 | plinth.lod0/stone_blue | 4 |
| -0.02, 0.10, 0.02 | plinth.lod0/stone_blue | 4 |
| -0.01, 0.11, 0.01 | plinth.lod0/stone_blue | 4 |
| -0.04, 0.10, 0.04 | plinth.lod0/stone_blue | 4 |
| -0.04, 0.50, 0.04 | plinth.lod0/stone_blue | 4 |
| -0.04, 0.51, 0.04 | plinth.lod0/stone_blue | 4 |
| -0.04, 0.51, 0.04 | plinth.lod0/stone_blue | 4 |
| -0.03, 0.51, 0.03 | plinth.lod0/stone_blue | 4 |
| -0.02, 0.53, 0.02 | plinth.lod0/stone_blue | 4 |
| -0.01, 0.55, 0.01 | plinth.lod0/stone_blue | 4 |
| -0.00, 0.56, 0.00 | plinth.lod0/stone_blue | 4 |
| -0.01, 0.54, 0.01 | plinth.lod0/stone_blue | 4 |
| -0.01, 0.55, 0.01 | plinth.lod0/stone_blue | 4 |
| -0.03, 0.51, 0.03 | plinth.lod0/stone_blue | 4 |

## seam (info, 12)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.15, 0.00 | plinth.lod0/stone_blue + wall/wall | 0.8 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod0/stone_blue + wall/wall | 0.8 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod0/stone_blue + wall/wall | 0.8 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod0/stone_blue + wall/wall | 0.8 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |
| 0.00, 0.56, 0.00 | plinth.lod0/stone_blue + wall/wall | 0 | 1 | 45 |

## opening (info, 2)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.05, 0.80, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 0.80, 0.05 | wall/wall | -1 + 0 + 0 | 3 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -0.02, 0.24, 0.02 | plinth.lod0/stone_blue + plinth.lod0/stone_blue | 0.00716 |
| -0.01, 0.26, 0.01 | plinth.lod0/stone_blue + plinth.lod0/stone_blue | 0.01941 |
| -0.01, 0.54, 0.01 | plinth.lod0/stone_blue + plinth.lod0/stone_blue | 0.00023 |
| -0.03, -0.03, 0.03 | plinth.lod0/stone_blue + plinth.lod0/stone_blue | 0.02489 |
