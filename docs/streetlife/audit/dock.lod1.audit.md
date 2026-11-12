# Mesh audit: dock lod1

278 triangles, 146 welded vertices, 0 open edges, 0 rays, 12 ms.

**0 blocking**, 0 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| seam | info | 3 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.06, 0.80, 0.00 | dock.lod1 + dock.lod1 | 0.36 | 41 | 36.8 |
| 0.04, 0.04, 0.03 | dock.lod1 + dock.lod1 | 0.3 | 14 | 24.4 |
| 0.01, 0.82, 0.10 | dock.lod1 + dock.lod1 | 0.2 | 14 | 45 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| 0.03, 0.04, 0.03 | dock.lod1 + dock.lod1 | 0.00035 |
| 0.02, 0.04, 0.02 | dock.lod1 + dock.lod1 | 0.00044 |
| 0.00, 0.04, 0.00 | dock.lod1 + dock.lod1 | 0.00006 |
| 0.01, 0.04, 0.04 | dock.lod1 + dock.lod1 | 0.00007 |
| 0.00, 0.04, 0.03 | dock.lod1 + dock.lod1 | 0.00033 |
| -0.01, 0.04, 0.03 | dock.lod1 + dock.lod1 | 0.00066 |
| -0.00, 0.04, 0.00 | dock.lod1 + dock.lod1 | 0.00006 |
| -0.03, 0.04, 0.02 | dock.lod1 + dock.lod1 | 0.00023 |
| -0.01, 0.04, 0.01 | dock.lod1 + dock.lod1 | 0.00016 |
| -0.02, 0.04, 0.01 | dock.lod1 + dock.lod1 | 0.00042 |
| -0.01, 0.04, -0.01 | dock.lod1 + dock.lod1 | 0.00072 |
| -0.02, 0.04, -0.01 | dock.lod1 + dock.lod1 | 0.00042 |
| -0.00, 0.04, -0.02 | dock.lod1 + dock.lod1 | 0.00039 |
| 0.00, 0.04, -0.02 | dock.lod1 + dock.lod1 | 0.00042 |
| 0.01, 0.04, -0.02 | dock.lod1 + dock.lod1 | 0.00042 |
| 0.02, 0.04, -0.01 | dock.lod1 + dock.lod1 | 0.00042 |
| 0.04, 0.04, 0.01 | dock.lod1 + dock.lod1 | 0.00007 |
| 0.03, 0.04, 0.01 | dock.lod1 + dock.lod1 | 0.00019 |
| 0.02, 0.04, 0.00 | dock.lod1 + dock.lod1 | 0.00016 |
| 0.02, 0.04, -0.00 | dock.lod1 + dock.lod1 | 0.00042 |
