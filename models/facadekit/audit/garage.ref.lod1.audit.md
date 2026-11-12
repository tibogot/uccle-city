# Kit audit: garage.ref LOD1

40 triangles, 38 welded vertices, 26 open edges, 19,936 rays, 6 ms.

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
| -0.44, 2.32, 0.01 | garage.lod1/stone_white | 88 | 2.64 |
| 0.44, 2.10, 0.01 | garage.lod1/stone_white | 88 | 2.64 |
| 0.44, 2.32, 0.02 | garage.lod1/stone_white | 88 | 2.64 |
| -0.44, 2.10, 0.02 | garage.lod1/stone_white | 88 | 2.64 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -1.20, -0.00, 0.00 | wall/wall | 5.2 |
| 1.20, -0.00, 0.00 | wall/wall | 1.2 |
| -1.20, -0.00, 0.00 | wall/wall | 1.2 |
| 1.20, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 11)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.20, 0.00, -0.06 | garage.lod1/render_white + ground/ground | 0.24 | 4 | 90 |
| -1.32, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| 0.14, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 4.8 | 3 | 90 |
| 1.26, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.46 | 3 | 90 |
| -1.89, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 3 | 90 |
| 1.20, -0.00, 0.00 | garage.lod1/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.31, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 2 | 90 |
| 0.00, 2.10, 0.00 | garage.lod1/stone_white + garage.lod1/render_white | 2.4 | 1 | 90 |
| 1.20, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| -1.20, 1.05, 0.00 | garage.lod1/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 2.4 | 1 | 90 |

## opening (info, 12)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.20, 2.05, -0.12 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 1.20, 2.05, 0.00 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -1.15, 2.10, -0.12 | garage.lod1/render_white | 0 + -1 + 0 | 2.4 |
| -1.20, 0.05, 0.00 | garage.lod1/render_white | 1 + 0 + 0 | 2.104 |
| 1.20, 0.05, -0.12 | garage.lod1/render_white | -1 + 0 + 0 | 2.104 |
| -1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| 1.15, 0.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 1.20, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.26, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.0258 |
| 0.07, 2.27, 0.00 | garage.lod1/stone_white + wall/wall | 0.2335 |
| -1.13, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.0305 |
| 1.24, 2.32, 0.00 | garage.lod1/stone_white + wall/wall | 0.0006 |
| -1.24, 2.10, 0.00 | garage.lod1/stone_white + wall/wall | 0.0006 |
| 0.00, 2.15, 0.00 | garage.lod1/stone_white + wall/wall | 0.26393 |
| -1.20, 2.11, 0.00 | garage.lod1/stone_white + wall/wall | 0.00007 |
| 1.26, 2.21, 0.00 | garage.lod1/stone_white + wall/wall | 0.0258 |
