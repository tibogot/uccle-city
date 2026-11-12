# Mesh audit: post lod0

672 triangles, 340 welded vertices, 0 open edges, 0 rays, 68 ms.

**0 blocking**, 28 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 28 |
| seam | info | 2 |
| backtoback | info | 14 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 28)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, 1.00, 0.01 | post.lod0 | 182 | 2.84 |
| 0.03, 1.95, 0.01 | post.lod0 | 182 | 2.84 |
| 0.03, 1.00, 0.02 | post.lod0 | 182 | 2.84 |
| 0.03, 1.95, 0.02 | post.lod0 | 182 | 2.84 |
| 0.02, 1.00, 0.03 | post.lod0 | 182 | 2.84 |
| 0.01, 1.95, 0.03 | post.lod0 | 182 | 2.84 |
| 0.00, 1.00, 0.03 | post.lod0 | 182 | 2.84 |
| -0.00, 1.95, 0.03 | post.lod0 | 182 | 2.84 |
| -0.01, 1.00, 0.03 | post.lod0 | 182 | 2.84 |
| -0.02, 1.95, 0.03 | post.lod0 | 182 | 2.84 |
| -0.03, 1.00, 0.02 | post.lod0 | 182 | 2.84 |
| -0.03, 1.95, 0.02 | post.lod0 | 182 | 2.84 |
| -0.03, 1.00, 0.01 | post.lod0 | 182 | 2.84 |
| -0.03, 1.95, 0.01 | post.lod0 | 182 | 2.84 |
| -0.03, 1.00, -0.01 | post.lod0 | 182 | 2.84 |
| -0.03, 1.95, -0.01 | post.lod0 | 182 | 2.84 |
| -0.03, 1.00, -0.02 | post.lod0 | 182 | 2.84 |
| -0.03, 1.95, -0.02 | post.lod0 | 182 | 2.84 |
| -0.02, 1.00, -0.03 | post.lod0 | 182 | 2.84 |
| -0.01, 1.95, -0.03 | post.lod0 | 182 | 2.84 |
| -0.00, 1.00, -0.03 | post.lod0 | 182 | 2.84 |
| 0.00, 1.95, -0.03 | post.lod0 | 182 | 2.84 |
| 0.01, 1.00, -0.03 | post.lod0 | 182 | 2.84 |
| 0.02, 1.95, -0.03 | post.lod0 | 182 | 2.84 |
| 0.03, 1.00, -0.02 | post.lod0 | 182 | 2.84 |
| 0.03, 1.95, -0.02 | post.lod0 | 182 | 2.84 |
| 0.03, 1.00, -0.01 | post.lod0 | 182 | 2.84 |
| 0.03, 1.95, -0.01 | post.lod0 | 182 | 2.84 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.03, 0.05, 0.01 | post.lod0 + post.lod0 | 0.19 | 28 | 45.7 |
| 0.03, 2.90, 0.01 | post.lod0 + post.lod0 | 0.19 | 28 | 45.7 |

## backtoback (info, 14)

| at | parts | area |
|---|---|---|
| 0.03, 0.05, 0.01 | post.lod0 + post.lod0 | 0.00006 |
| 0.02, 0.05, 0.01 | post.lod0 + post.lod0 | 0.00006 |
| 0.01, 0.05, 0.02 | post.lod0 + post.lod0 | 0.00006 |
| 0.00, 0.05, 0.03 | post.lod0 + post.lod0 | 0.00006 |
| -0.01, 0.05, 0.02 | post.lod0 + post.lod0 | 0.00006 |
| -0.02, 0.05, 0.02 | post.lod0 + post.lod0 | 0.00006 |
| -0.03, 0.05, 0.01 | post.lod0 + post.lod0 | 0.00006 |
| -0.03, 0.05, -0.01 | post.lod0 + post.lod0 | 0.00006 |
| -0.02, 0.05, -0.01 | post.lod0 + post.lod0 | 0.00006 |
| -0.01, 0.05, -0.02 | post.lod0 + post.lod0 | 0.00006 |
| -0.00, 0.05, -0.03 | post.lod0 + post.lod0 | 0.00006 |
| 0.01, 0.05, -0.02 | post.lod0 + post.lod0 | 0.00006 |
| 0.02, 0.05, -0.02 | post.lod0 + post.lod0 | 0.00006 |
| 0.03, 0.05, -0.01 | post.lod0 + post.lod0 | 0.00006 |
