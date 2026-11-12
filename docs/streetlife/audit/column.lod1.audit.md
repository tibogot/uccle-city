# Mesh audit: column lod1

190 triangles, 98 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 20 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 20 |
| seam | info | 1 |
| backtoback | info | 15 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 20)

| at | part | aspect | longest |
|---|---|---|---|
| 0.15, 1.89, 0.00 | column.lod1 | 46 | 4.56 |
| 0.15, 3.41, 0.05 | column.lod1 | 46 | 4.56 |
| 0.13, 1.89, 0.09 | column.lod1 | 46 | 4.56 |
| 0.09, 3.41, 0.13 | column.lod1 | 46 | 4.56 |
| 0.05, 1.89, 0.15 | column.lod1 | 46 | 4.56 |
| 0.00, 3.41, 0.15 | column.lod1 | 46 | 4.56 |
| -0.05, 1.89, 0.15 | column.lod1 | 46 | 4.56 |
| -0.09, 3.41, 0.13 | column.lod1 | 46 | 4.56 |
| -0.13, 1.89, 0.09 | column.lod1 | 46 | 4.56 |
| -0.15, 3.41, 0.05 | column.lod1 | 46 | 4.56 |
| -0.15, 1.89, 0.00 | column.lod1 | 46 | 4.56 |
| -0.15, 3.41, -0.05 | column.lod1 | 46 | 4.56 |
| -0.13, 1.89, -0.09 | column.lod1 | 46 | 4.56 |
| -0.09, 3.41, -0.13 | column.lod1 | 46 | 4.56 |
| -0.05, 1.89, -0.15 | column.lod1 | 46 | 4.56 |
| 0.00, 3.41, -0.15 | column.lod1 | 46 | 4.56 |
| 0.05, 1.89, -0.15 | column.lod1 | 46 | 4.56 |
| 0.09, 3.41, -0.13 | column.lod1 | 46 | 4.56 |
| 0.13, 1.89, -0.09 | column.lod1 | 46 | 4.56 |
| 0.15, 3.41, -0.05 | column.lod1 | 46 | 4.56 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.00, 0.35, 0.13 | column.lod1 + column.lod1 | 0.85 | 13 | 31 |

## backtoback (info, 15)

| at | parts | area |
|---|---|---|
| 0.01, 0.35, 0.12 | column.lod1 + column.lod1 | 0.00107 |
| -0.00, 0.35, 0.06 | column.lod1 + column.lod1 | 0.00412 |
| -0.04, 0.35, 0.05 | column.lod1 + column.lod1 | 0.00576 |
| -0.05, 0.35, 0.02 | column.lod1 + column.lod1 | 0.0052 |
| -0.07, 0.35, -0.01 | column.lod1 + column.lod1 | 0.00273 |
| -0.05, 0.35, -0.04 | column.lod1 + column.lod1 | 0.00576 |
| -0.03, 0.35, -0.08 | column.lod1 + column.lod1 | 0.00576 |
| 0.02, 0.35, -0.06 | column.lod1 + column.lod1 | 0.0052 |
| 0.05, 0.35, -0.05 | column.lod1 + column.lod1 | 0.00273 |
| 0.06, 0.35, -0.02 | column.lod1 + column.lod1 | 0.0052 |
| 0.11, 0.35, 0.06 | column.lod1 + column.lod1 | 0.00048 |
| 0.06, 0.35, 0.03 | column.lod1 + column.lod1 | 0.0024 |
| 0.07, 0.35, 0.01 | column.lod1 + column.lod1 | 0.00273 |
| 0.07, 0.35, 0.09 | column.lod1 + column.lod1 | 0.00234 |
| 0.02, 0.35, 0.03 | column.lod1 + column.lod1 | 0.00327 |
