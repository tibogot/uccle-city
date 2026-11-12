# Mesh audit: spot lod1

214 triangles, 113 welded vertices, 0 open edges, 0 rays, 6 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1 |
| seam | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1)

| at | part | aspect | longest |
|---|---|---|---|
| -0.01, 0.07, 0.20 | spot.lod1 | 706 | 0.336 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.00, 0.02 | spot.lod1 + spot.lod1 | 0.09 | 10 | 24.4 |
