# Mesh audit: post lod1

168 triangles, 88 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 14 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 14 |
| seam | info | 2 |
| backtoback | info | 13 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 14)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, 1.00, 0.00 | post.lod1 | 94 | 2.84 |
| 0.03, 1.95, 0.01 | post.lod1 | 94 | 2.84 |
| 0.02, 1.00, 0.03 | post.lod1 | 94 | 2.84 |
| 0.01, 1.95, 0.03 | post.lod1 | 94 | 2.84 |
| -0.01, 1.00, 0.03 | post.lod1 | 94 | 2.84 |
| -0.02, 1.95, 0.03 | post.lod1 | 94 | 2.84 |
| -0.03, 1.00, 0.01 | post.lod1 | 94 | 2.84 |
| -0.03, 1.95, 0.00 | post.lod1 | 94 | 2.84 |
| -0.03, 1.00, -0.01 | post.lod1 | 94 | 2.84 |
| -0.02, 1.95, -0.03 | post.lod1 | 94 | 2.84 |
| -0.01, 1.00, -0.03 | post.lod1 | 94 | 2.84 |
| 0.01, 1.95, -0.03 | post.lod1 | 94 | 2.84 |
| 0.02, 1.00, -0.03 | post.lod1 | 94 | 2.84 |
| 0.03, 1.95, -0.01 | post.lod1 | 94 | 2.84 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.03, 2.90, 0.00 | post.lod1 + post.lod1 | 0.17 | 13 | 25.1 |
| -0.02, 0.05, 0.01 | post.lod1 + post.lod1 | 0.17 | 6 | 21.3 |

## backtoback (info, 13)

| at | parts | area |
|---|---|---|
| -0.01, 0.05, 0.00 | post.lod1 + post.lod1 | 0.00044 |
| -0.01, 0.05, -0.01 | post.lod1 + post.lod1 | 0.00022 |
| 0.00, 0.05, -0.01 | post.lod1 + post.lod1 | 0.00022 |
| 0.01, 0.05, -0.01 | post.lod1 + post.lod1 | 0.00014 |
| 0.00, 0.05, 0.01 | post.lod1 + post.lod1 | 0.00044 |
| 0.01, 0.05, 0.00 | post.lod1 + post.lod1 | 0.0003 |
| 0.01, 2.90, 0.01 | post.lod1 + post.lod1 | 0.00037 |
| 0.00, 2.90, 0.01 | post.lod1 + post.lod1 | 0.00014 |
| -0.01, 2.90, 0.01 | post.lod1 + post.lod1 | 0.00028 |
| -0.02, 2.90, 0.00 | post.lod1 + post.lod1 | 0.00017 |
| -0.01, 2.90, -0.00 | post.lod1 + post.lod1 | 0.00015 |
| -0.00, 2.90, -0.01 | post.lod1 + post.lod1 | 0.00037 |
| 0.01, 2.90, -0.01 | post.lod1 + post.lod1 | 0.00044 |
