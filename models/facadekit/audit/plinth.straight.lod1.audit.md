# Kit audit: plinth.straight LOD1

22 triangles, 16 welded vertices, 10 open edges, 8,864 rays, 2 ms.

**0 blocking**, 7 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| nonmanifold | warn | 3 |
| seam | info | 2 |
| opening | info | 1 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 0.54, 0.01 | plinth.lod1/stone_blue | 44 | 3.001 |
| -1.00, 0.52, 0.03 | plinth.lod1/stone_blue | 44 | 3.001 |
| 1.00, 0.54, 0.01 | plinth.lod1/stone_blue | 44 | 3.001 |
| 2.00, 0.52, 0.03 | plinth.lod1/stone_blue | 44 | 3.001 |

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.10, 0.04 | plinth.lod1/stone_blue | 4 |
| 0.00, 0.53, 0.02 | plinth.lod1/stone_blue | 4 |
| 0.00, 0.10, 0.02 | plinth.lod1/stone_blue | 4 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 90 |
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 90 |

## opening (info, 1)

| at | part | facing | edge_m |
|---|---|---|---|
| 3.15, 0.80, 0.00 | wall/wall | 0 + 0 + 1 | 6.4 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| 0.00, 0.25, 0.01 | plinth.lod1/stone_blue + plinth.lod1/stone_blue | 0.01848 |
| 0.00, -0.03, 0.03 | plinth.lod1/stone_blue + plinth.lod1/stone_blue | 0.0177 |
