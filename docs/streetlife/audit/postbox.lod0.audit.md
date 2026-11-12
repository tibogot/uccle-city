# Mesh audit: postbox lod0

222 triangles, 122 welded vertices, 4 open edges, 512 rays, 7 ms.

**0 blocking**, 24 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 24 |
| seam | info | 3 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 24)

| at | part | aspect | longest |
|---|---|---|---|
| -0.05, 0.91, 0.18 | postbox.lod0 | 45 | 0.295 |
| 0.05, 0.91, 0.18 | postbox.lod0 | 45 | 0.295 |
| -0.05, 0.95, 0.18 | postbox.lod0 | 45 | 0.295 |
| 0.05, 0.95, 0.18 | postbox.lod0 | 45 | 0.295 |
| 0.05, 0.91, 0.18 | postbox.lod0 | 77 | 0.295 |
| -0.05, 0.91, 0.18 | postbox.lod0 | 77 | 0.295 |
| 0.05, 0.91, 0.18 | postbox.lod0 | 77 | 0.295 |
| -0.05, 0.91, 0.19 | postbox.lod0 | 77 | 0.295 |
| 0.05, 0.95, 0.18 | postbox.lod0 | 77 | 0.295 |
| -0.05, 0.95, 0.18 | postbox.lod0 | 77 | 0.295 |
| 0.05, 0.95, 0.19 | postbox.lod0 | 77 | 0.295 |
| -0.05, 0.95, 0.18 | postbox.lod0 | 77 | 0.295 |
| -0.05, 0.52, 0.18 | postbox.lod0 | 50 | 0.276 |
| 0.05, 0.52, 0.18 | postbox.lod0 | 50 | 0.276 |
| -0.05, 0.72, 0.18 | postbox.lod0 | 50 | 0.276 |
| 0.05, 0.72, 0.18 | postbox.lod0 | 50 | 0.276 |
| 0.05, 0.52, 0.18 | postbox.lod0 | 87 | 0.276 |
| -0.05, 0.52, 0.18 | postbox.lod0 | 87 | 0.276 |
| 0.05, 0.52, 0.18 | postbox.lod0 | 87 | 0.276 |
| -0.05, 0.52, 0.18 | postbox.lod0 | 87 | 0.276 |
| 0.05, 0.72, 0.18 | postbox.lod0 | 87 | 0.276 |
| -0.05, 0.72, 0.18 | postbox.lod0 | 87 | 0.276 |
| 0.05, 0.72, 0.18 | postbox.lod0 | 87 | 0.276 |
| -0.05, 0.72, 0.18 | postbox.lod0 | 87 | 0.276 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.52, 0.18 | postbox.lod0 + postbox.lod0 | 0.95 | 18 | 90 |
| 0.14, 0.91, 0.18 | postbox.lod0 + postbox.lod0 | 0.66 | 18 | 90 |
| -0.14, 0.18, -0.01 | postbox.lod0 + postbox.lod0 | 1.04 | 6 | 45 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -0.09, 0.18, -0.00 | postbox.lod0 + postbox.lod0 | 0.01608 |
| -0.04, 0.18, 0.09 | postbox.lod0 + postbox.lod0 | 0.01752 |
| 0.04, 0.18, -0.09 | postbox.lod0 + postbox.lod0 | 0.01752 |
| 0.09, 0.18, 0.00 | postbox.lod0 + postbox.lod0 | 0.01608 |
