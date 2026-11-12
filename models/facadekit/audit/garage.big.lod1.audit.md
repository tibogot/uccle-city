# Kit audit: garage.big LOD1

40 triangles, 38 welded vertices, 26 open edges, 20,320 rays, 4 ms.

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
| -0.54, 2.32, 0.01 | garage.lod1/stone_white | 108 | 3.24 |
| 0.54, 2.10, 0.01 | garage.lod1/stone_white | 108 | 3.24 |
| 0.54, 2.32, 0.02 | garage.lod1/stone_white | 108 | 3.24 |
| -0.54, 2.10, 0.02 | garage.lod1/stone_white | 108 | 3.24 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -1.50, -0.00, 0.00 | wall/wall | 5.2 |
| 1.50, -0.00, 0.00 | wall/wall | 1.2 |
| -1.50, -0.00, 0.00 | wall/wall | 1.2 |
| 1.50, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 11)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.50, 0.00, -0.06 | garage.lod1/render_white + ground/ground | 0.24 | 4 | 90 |
| -1.62, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| 0.17, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 6 | 3 | 90 |
| 1.56, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| -2.08, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 3 | 90 |
| 1.50, -0.00, 0.00 | garage.lod1/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.42, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 2 | 90 |
| 0.00, 2.10, 0.00 | garage.lod1/stone_white + garage.lod1/render_white | 3 | 1 | 90 |
| 1.50, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| -1.50, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 3 | 1 | 90 |

## opening (info, 12)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.50, 2.05, -0.12 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 1.50, 2.05, 0.00 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -1.45, 2.10, -0.12 | garage.lod1/render_white | 0 + -1 + 0 | 3 |
| -1.50, 0.05, 0.00 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 1.50, 0.05, -0.12 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| 1.45, 0.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 1.50, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.56, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.02591 |
| 0.09, 2.27, 0.00 | garage.lod1/stone_white + wall/wall | 0.29185 |
| -1.41, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.03815 |
| 1.54, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.00049 |
| -1.54, 2.10, 0.00 | garage.lod1/stone_white + wall/wall | 0.00049 |
| 0.00, 2.15, 0.00 | garage.lod1/stone_white + wall/wall | 0.32994 |
| -1.50, 2.11, 0.00 | garage.lod1/stone_white + wall/wall | 0.00006 |
| 1.56, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.02591 |
