# Mesh audit: chair lod1

180 triangles, 110 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 4 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -0.20, 0.22, 0.18 | chair.lod1 | 65 | 0.451 |
| -0.19, 0.65, 0.22 | chair.lod1 | 40 | 0.404 |
| -0.19, 0.73, 0.23 | chair.lod1 | 42 | 0.404 |
| 0.18, 0.59, 0.21 | chair.lod1 | 42 | 0.403 |

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.18, 0.48, 0.20 | chair.lod1 + chair.lod1 | 0.06 | 13 | 53.7 |
| -0.18, 0.45, 0.18 | chair.lod1 + chair.lod1 | 0.06 | 11 | 84.7 |
| 0.19, 0.45, -0.18 | chair.lod1 + chair.lod1 | 0.06 | 10 | 82.1 |
| -0.18, 0.48, 0.20 | chair.lod1 + chair.lod1 | 0.06 | 9 | 80.3 |
| -0.17, 0.45, -0.19 | chair.lod1 + chair.lod1 | 0.06 | 8 | 83 |
| 0.18, 0.45, 0.19 | chair.lod1 + chair.lod1 | 0.06 | 8 | 84.1 |
