# Kit audit: garage.small LOD1

40 triangles, 38 welded vertices, 26 open edges, 19,680 rays, 5 ms.

**0 blocking**, 8 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| tjunction | warn | 4 |
| seam | info | 11 |
| opening | info | 12 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -0.35, 2.32, 0.01 | garage.lod1/stone_white | 70 | 2.112 |
| 0.35, 2.10, 0.01 | garage.lod1/stone_white | 70 | 2.112 |
| 0.35, 2.32, 0.02 | garage.lod1/stone_white | 70 | 2.112 |
| -0.35, 2.10, 0.02 | garage.lod1/stone_white | 70 | 2.112 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.94, -0.00, 0.00 | wall/wall | 5.2 |
| 0.94, -0.00, 0.00 | wall/wall | 1.2 |
| -0.94, -0.00, 0.00 | wall/wall | 1.2 |
| 0.94, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 11)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.94, 0.00, -0.06 | garage.lod1/render_white + ground/ground | 0.24 | 4 | 90 |
| -1.06, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| 0.11, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 3.74 | 3 | 90 |
| 1.00, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| -1.73, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 3 | 90 |
| 0.94, -0.00, 0.00 | garage.lod1/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.21, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 2 | 90 |
| 0.00, 2.10, 0.00 | garage.lod1/stone_white + garage.lod1/render_white | 1.87 | 1 | 90 |
| 0.94, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| -0.94, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 1.87 | 1 | 90 |

## opening (info, 12)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.94, 2.05, -0.12 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 0.94, 2.05, 0.00 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -0.89, 2.10, -0.12 | garage.lod1/render_white | 0 + -1 + 0 | 1.872 |
| -0.94, 0.05, 0.00 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 0.94, 0.05, -0.12 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| 0.89, 0.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.872 |
| 0.94, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -0.89, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.872 |
| 0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.00, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.02565 |
| 0.06, 2.27, 0.00 | garage.lod1/stone_white + wall/wall | 0.18216 |
| -0.88, 2.22, 0.00 | garage.lod1/stone_white + wall/wall | 0.02376 |
| 0.98, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.00075 |
| -0.98, 2.10, 0.00 | garage.lod1/stone_white + wall/wall | 0.00075 |
| 0.00, 2.15, 0.00 | garage.lod1/stone_white + wall/wall | 0.20583 |
| -0.93, 2.11, 0.00 | garage.lod1/stone_white + wall/wall | 0.00009 |
| 1.00, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.02565 |
