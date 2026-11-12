# Kit audit: dormer.big LOD1

72 triangles, 52 welded vertices, 20 open edges, 9,848 rays, 4 ms.

**0 blocking**, 4 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 4 |
| seam | info | 19 |
| opening | info | 6 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.32, 1.25, -0.38 | dormer.lod1/wood_frame_white | 4 |
| -0.32, 0.30, -0.38 | dormer.lod1/wood_frame_white | 4 |
| 0.32, 0.30, -0.38 | dormer.lod1/wood_frame_white | 4 |
| 0.32, 1.25, -0.38 | dormer.lod1/wood_frame_white | 4 |

## seam (info, 19)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.37, 0.38, -0.38 | dormer.lod1/wood_frame_white + roof/roof | 0.24 | 8 | 45 |
| -0.32, 1.00, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.3 | 8 | 90 |
| 0.32, 0.38, -0.38 | dormer.lod1/wood_frame_white + roof/roof | 0.24 | 8 | 45 |
| 0.32, 0.97, -0.39 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.3 | 8 | 90 |
| -0.32, 1.20, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.65 | 6 | 90 |
| -0.16, 0.35, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.65 | 6 | 90 |
| -0.32, 0.97, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.65 | 6 | 90 |
| -0.16, 1.02, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.65 | 6 | 90 |
| -0.40, 1.57, -1.57 | dormer.lod1/slate + roof/roof | 1.09 | 4 | 55.5 |
| -0.32, 0.88, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.63 | 3 | 90 |
| 0.32, 0.35, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.63 | 3 | 90 |
| -0.32, 0.35, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.05 | 2 | 90 |
| -0.32, 1.20, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.05 | 2 | 90 |
| -0.32, 1.11, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.18 | 2 | 90 |
| 0.32, 0.35, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.05 | 2 | 90 |
| 0.32, 1.20, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.05 | 2 | 90 |
| 0.00, 0.35, -0.35 | dormer.lod1/wood_frame_white + roof/roof | 1.28 | 2 | 45 |
| 0.32, 1.02, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/glass_window | 0.18 | 2 | 90 |
| -0.01, 0.38, -0.38 | dormer.lod1/glass_window + roof/roof | 0.65 | 2 | 45 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.59, 1.43, -1.68 | dormer.lod1/slate | -0.6 + 0.8 + 0 | 0.786 |
| 0.04, 1.84, -0.22 | dormer.lod1/slate | 0.6 + 0.8 + 0 | 0.786 |
| -0.63, 1.40, -1.63 | dormer.lod1/slate | -0.6 + 0.8 + 0 | 1.46 |
| 0.63, 1.40, -0.27 | dormer.lod1/slate | 0.6 + 0.8 + 0 | 1.46 |
| 3.00, 0.04, -0.04 | roof/roof | 0 + 0.71 + 0.71 | 4.243 |
| 2.95, 3.00, -3.00 | roof/roof | 0 + 0.71 + 0.71 | 6 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| -0.32, 0.32, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00006 |
| -0.32, 0.99, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00115 |
| -0.32, 1.01, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00069 |
| -0.32, 1.21, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00125 |
| -0.32, 1.24, -0.36 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00119 |
| 0.32, 0.34, -0.38 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00125 |
| 0.32, 0.31, -0.36 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00119 |
| 0.32, 1.00, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00056 |
| 0.32, 0.98, -0.39 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.0001 |
| 0.32, 1.23, -0.40 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00006 |
| 0.32, 1.24, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00119 |
| -0.32, 0.31, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00119 |
| -0.32, 0.98, -0.36 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.0001 |
| 0.32, 1.02, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00069 |
| -0.32, 0.34, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00125 |
| -0.32, 1.00, -0.36 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00056 |
| -0.32, 1.23, -0.35 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00006 |
| 0.32, 0.32, -0.35 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00006 |
| 0.32, 0.99, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00115 |
| 0.32, 1.21, -0.37 | dormer.lod1/wood_frame_white + dormer.lod1/wood_frame_white | 0.00125 |
