# Mesh audit: table lod0

504 triangles, 255 welded vertices, 0 open edges, 0 rays, 21 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 40 |
| seam | info | 1 |
| backtoback | info | 44 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 40)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, 0.31, 0.00 | table.lod0 | 60 | 0.56 |
| 0.03, 0.49, 0.01 | table.lod0 | 64 | 0.56 |
| 0.03, 0.31, 0.01 | table.lod0 | 60 | 0.56 |
| 0.03, 0.49, 0.01 | table.lod0 | 64 | 0.56 |
| 0.02, 0.31, 0.02 | table.lod0 | 60 | 0.56 |
| 0.02, 0.49, 0.02 | table.lod0 | 64 | 0.56 |
| 0.01, 0.31, 0.03 | table.lod0 | 60 | 0.56 |
| 0.01, 0.49, 0.03 | table.lod0 | 64 | 0.56 |
| 0.01, 0.31, 0.03 | table.lod0 | 60 | 0.56 |
| 0.00, 0.49, 0.03 | table.lod0 | 64 | 0.56 |
| -0.00, 0.31, 0.03 | table.lod0 | 60 | 0.56 |
| -0.01, 0.49, 0.03 | table.lod0 | 64 | 0.56 |
| -0.01, 0.31, 0.03 | table.lod0 | 60 | 0.56 |
| -0.01, 0.49, 0.03 | table.lod0 | 64 | 0.56 |
| -0.02, 0.31, 0.02 | table.lod0 | 60 | 0.56 |
| -0.02, 0.49, 0.02 | table.lod0 | 64 | 0.56 |
| -0.03, 0.31, 0.01 | table.lod0 | 60 | 0.56 |
| -0.03, 0.49, 0.01 | table.lod0 | 64 | 0.56 |
| -0.03, 0.31, 0.01 | table.lod0 | 60 | 0.56 |
| -0.03, 0.49, 0.00 | table.lod0 | 64 | 0.56 |
| -0.03, 0.31, -0.00 | table.lod0 | 60 | 0.56 |
| -0.03, 0.49, -0.01 | table.lod0 | 64 | 0.56 |
| -0.03, 0.31, -0.01 | table.lod0 | 60 | 0.56 |
| -0.03, 0.49, -0.01 | table.lod0 | 64 | 0.56 |
| -0.02, 0.31, -0.02 | table.lod0 | 60 | 0.56 |
| -0.02, 0.49, -0.02 | table.lod0 | 64 | 0.56 |
| -0.01, 0.31, -0.03 | table.lod0 | 60 | 0.56 |
| -0.01, 0.49, -0.03 | table.lod0 | 64 | 0.56 |
| -0.01, 0.31, -0.03 | table.lod0 | 60 | 0.56 |
| -0.00, 0.49, -0.03 | table.lod0 | 64 | 0.56 |
| 0.00, 0.31, -0.03 | table.lod0 | 60 | 0.56 |
| 0.01, 0.49, -0.03 | table.lod0 | 64 | 0.56 |
| 0.01, 0.31, -0.03 | table.lod0 | 60 | 0.56 |
| 0.01, 0.49, -0.03 | table.lod0 | 64 | 0.56 |
| 0.02, 0.31, -0.02 | table.lod0 | 60 | 0.56 |
| 0.02, 0.49, -0.02 | table.lod0 | 64 | 0.56 |
| 0.03, 0.31, -0.01 | table.lod0 | 60 | 0.56 |
| 0.03, 0.49, -0.01 | table.lod0 | 64 | 0.56 |
| 0.03, 0.31, -0.01 | table.lod0 | 60 | 0.56 |
| 0.03, 0.49, -0.00 | table.lod0 | 64 | 0.56 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.06, 0.70, 0.01 | table.lod0 + table.lod0 | 0.38 | 44 | 32.3 |

## backtoback (info, 44)

| at | parts | area |
|---|---|---|
| 0.04, 0.70, 0.00 | table.lod0 + table.lod0 | 0.0004 |
| 0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00016 |
| 0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00024 |
| 0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00032 |
| 0.02, 0.70, 0.02 | table.lod0 + table.lod0 | 0.00008 |
| 0.03, 0.70, 0.03 | table.lod0 + table.lod0 | 0.0004 |
| 0.02, 0.70, 0.02 | table.lod0 + table.lod0 | 0.00008 |
| 0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00032 |
| 0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00024 |
| 0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00016 |
| 0.00, 0.70, 0.04 | table.lod0 + table.lod0 | 0.0004 |
| -0.00, 0.70, 0.04 | table.lod0 + table.lod0 | 0.0004 |
| -0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00016 |
| -0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00024 |
| -0.01, 0.70, 0.03 | table.lod0 + table.lod0 | 0.00032 |
| -0.02, 0.70, 0.02 | table.lod0 + table.lod0 | 0.00008 |
| -0.03, 0.70, 0.03 | table.lod0 + table.lod0 | 0.0004 |
| -0.02, 0.70, 0.02 | table.lod0 + table.lod0 | 0.00008 |
| -0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00032 |
| -0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00024 |
| -0.03, 0.70, 0.01 | table.lod0 + table.lod0 | 0.00016 |
| -0.03, 0.70, 0.00 | table.lod0 + table.lod0 | 0.0004 |
| -0.04, 0.70, -0.00 | table.lod0 + table.lod0 | 0.0004 |
| -0.03, 0.70, -0.01 | table.lod0 + table.lod0 | 0.00016 |
| -0.03, 0.70, -0.01 | table.lod0 + table.lod0 | 0.00024 |
| -0.03, 0.70, -0.01 | table.lod0 + table.lod0 | 0.00032 |
| -0.02, 0.70, -0.02 | table.lod0 + table.lod0 | 0.00008 |
| -0.03, 0.70, -0.03 | table.lod0 + table.lod0 | 0.0004 |
| -0.02, 0.70, -0.02 | table.lod0 + table.lod0 | 0.00008 |
| -0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00032 |
| -0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00024 |
| -0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00016 |
| -0.00, 0.70, -0.03 | table.lod0 + table.lod0 | 0.0004 |
| 0.00, 0.70, -0.04 | table.lod0 + table.lod0 | 0.0004 |
| 0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00016 |
| 0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00024 |
| 0.01, 0.70, -0.03 | table.lod0 + table.lod0 | 0.00032 |
| 0.02, 0.70, -0.02 | table.lod0 + table.lod0 | 0.00008 |
| 0.03, 0.70, -0.03 | table.lod0 + table.lod0 | 0.0004 |
| 0.02, 0.70, -0.02 | table.lod0 + table.lod0 | 0.00008 |

(4 more in the JSON)
