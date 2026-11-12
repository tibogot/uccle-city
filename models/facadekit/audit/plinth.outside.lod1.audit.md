# Kit audit: plinth.outside LOD1

24 triangles, 18 welded vertices, 12 open edges, 8,608 rays, 1 ms.

**0 blocking**, 7 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| nonmanifold | warn | 3 |
| seam | info | 4 |
| opening | info | 2 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 0.54, 0.01 | plinth.lod1/stone_blue | 44 | 2.999 |
| -0.99, 0.52, 0.03 | plinth.lod1/stone_blue | 44 | 3.041 |
| 0.01, 0.54, -0.99 | plinth.lod1/stone_blue | 45 | 3.042 |
| 0.03, 0.52, -1.99 | plinth.lod1/stone_blue | 44 | 3.042 |

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.04, 0.10, 0.04 | plinth.lod1/stone_blue | 4 |
| 0.02, 0.53, 0.02 | plinth.lod1/stone_blue | 4 |
| 0.02, 0.10, 0.02 | plinth.lod1/stone_blue | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 45 |
| 0.00, 0.15, 0.00 | plinth.lod1/stone_blue + wall/wall | 0.82 | 1 | 45 |

## opening (info, 2)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.05, 0.80, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 0.80, -0.05 | wall/wall | 1 + 0 + 0 | 3 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| 0.01, 0.25, 0.01 | plinth.lod1/stone_blue + plinth.lod1/stone_blue | 0.02614 |
| 0.03, -0.03, 0.03 | plinth.lod1/stone_blue + plinth.lod1/stone_blue | 0.02503 |
