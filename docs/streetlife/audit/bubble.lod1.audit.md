# Mesh audit: bubble lod1

479 triangles, 250 welded vertices, 7 open edges, 56 rays, 10 ms.

**0 blocking**, 3 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 3 |
| seam | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.01, 1.86, 0.01 | bubble.lod1 | 4 |
| -0.01, 1.98, -0.01 | bubble.lod1 | 4 |
| -0.07, 1.93, 0.00 | bubble.lod1 | 4 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.03, 1.65, 0.00 | bubble.lod1 + bubble.lod1 | 0.18 | 43 | 78.7 |
| -0.10, 1.28, -0.62 | bubble.lod1 + bubble.lod1 | 0.65 | 25 | 22.8 |
| 0.09, 1.27, 0.63 | bubble.lod1 + bubble.lod1 | 0.65 | 23 | 22.8 |
