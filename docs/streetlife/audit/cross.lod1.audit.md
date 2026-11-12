# Mesh audit: cross lod1

264 triangles, 144 welded vertices, 0 open edges, 0 rays, 6 ms.

**0 blocking**, 0 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| seam | info | 1 |
| backtoback | info | 7 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.03, -0.01, 0.38 | cross.lod1 + cross.lod1 | 0.18 | 18 | 90 |

## backtoback (info, 7)

| at | parts | area |
|---|---|---|
| -0.13, 0.07, 0.79 | cross.lod1 + cross.lod1 | 0.00278 |
| -0.13, 0.03, 0.76 | cross.lod1 + cross.lod1 | 0.0058 |
| 0.13, 0.07, 0.77 | cross.lod1 + cross.lod1 | 0.00278 |
| 0.13, 0.03, 0.80 | cross.lod1 + cross.lod1 | 0.0058 |
| 0.01, 0.00, 0.03 | cross.lod1 + cross.lod1 | 0.00036 |
| -0.01, -0.00, 0.03 | cross.lod1 + cross.lod1 | 0.00036 |
| -0.00, 0.01, 0.03 | cross.lod1 + cross.lod1 | 0.00022 |
