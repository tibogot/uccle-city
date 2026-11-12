# Mesh audit: column lod0

640 triangles, 323 welded vertices, 0 open edges, 0 rays, 29 ms.

**0 blocking**, 40 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 40 |
| seam | info | 1 |
| backtoback | info | 180 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 40)

| at | part | aspect | longest |
|---|---|---|---|
| 0.16, 1.89, 0.02 | column.lod0 | 91 | 4.56 |
| 0.15, 3.41, 0.03 | column.lod0 | 91 | 4.56 |
| 0.14, 1.89, 0.06 | column.lod0 | 91 | 4.56 |
| 0.14, 3.41, 0.08 | column.lod0 | 91 | 4.56 |
| 0.12, 1.89, 0.11 | column.lod0 | 91 | 4.56 |
| 0.11, 3.41, 0.12 | column.lod0 | 91 | 4.56 |
| 0.08, 1.89, 0.14 | column.lod0 | 91 | 4.56 |
| 0.06, 3.41, 0.14 | column.lod0 | 91 | 4.56 |
| 0.03, 1.89, 0.15 | column.lod0 | 91 | 4.56 |
| 0.02, 3.41, 0.16 | column.lod0 | 91 | 4.56 |
| -0.02, 1.89, 0.16 | column.lod0 | 91 | 4.56 |
| -0.03, 3.41, 0.15 | column.lod0 | 91 | 4.56 |
| -0.06, 1.89, 0.14 | column.lod0 | 91 | 4.56 |
| -0.08, 3.41, 0.14 | column.lod0 | 91 | 4.56 |
| -0.11, 1.89, 0.12 | column.lod0 | 91 | 4.56 |
| -0.12, 3.41, 0.11 | column.lod0 | 91 | 4.56 |
| -0.14, 1.89, 0.08 | column.lod0 | 91 | 4.56 |
| -0.14, 3.41, 0.06 | column.lod0 | 91 | 4.56 |
| -0.15, 1.89, 0.03 | column.lod0 | 91 | 4.56 |
| -0.16, 3.41, 0.02 | column.lod0 | 91 | 4.56 |
| -0.16, 1.89, -0.02 | column.lod0 | 91 | 4.56 |
| -0.15, 3.41, -0.03 | column.lod0 | 91 | 4.56 |
| -0.14, 1.89, -0.06 | column.lod0 | 91 | 4.56 |
| -0.14, 3.41, -0.08 | column.lod0 | 91 | 4.56 |
| -0.12, 1.89, -0.11 | column.lod0 | 91 | 4.56 |
| -0.11, 3.41, -0.12 | column.lod0 | 91 | 4.56 |
| -0.08, 1.89, -0.14 | column.lod0 | 91 | 4.56 |
| -0.06, 3.41, -0.14 | column.lod0 | 91 | 4.56 |
| -0.03, 1.89, -0.15 | column.lod0 | 91 | 4.56 |
| -0.02, 3.41, -0.16 | column.lod0 | 91 | 4.56 |
| 0.02, 1.89, -0.16 | column.lod0 | 91 | 4.56 |
| 0.03, 3.41, -0.15 | column.lod0 | 91 | 4.56 |
| 0.06, 1.89, -0.14 | column.lod0 | 91 | 4.56 |
| 0.08, 3.41, -0.14 | column.lod0 | 91 | 4.56 |
| 0.11, 1.89, -0.12 | column.lod0 | 91 | 4.56 |
| 0.12, 3.41, -0.11 | column.lod0 | 91 | 4.56 |
| 0.14, 1.89, -0.08 | column.lod0 | 91 | 4.56 |
| 0.14, 3.41, -0.06 | column.lod0 | 91 | 4.56 |
| 0.15, 1.89, -0.03 | column.lod0 | 91 | 4.56 |
| 0.16, 3.41, -0.02 | column.lod0 | 91 | 4.56 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.14, 0.35, 0.02 | column.lod0 + column.lod0 | 0.88 | 40 | 45.4 |

## backtoback (info, 180)

| at | parts | area |
|---|---|---|
| 0.12, 0.35, 0.02 | column.lod0 + column.lod0 | 0.00101 |
| 0.10, 0.35, 0.01 | column.lod0 + column.lod0 | 0.00018 |
| 0.09, 0.35, 0.00 | column.lod0 + column.lod0 | 0.00008 |
| 0.11, 0.35, 0.03 | column.lod0 + column.lod0 | 0.0005 |
| 0.08, 0.35, 0.01 | column.lod0 + column.lod0 | 0.0003 |
| 0.08, 0.35, 0.02 | column.lod0 + column.lod0 | 0.00004 |
| 0.11, 0.35, 0.06 | column.lod0 + column.lod0 | 0.00101 |
| 0.09, 0.35, 0.04 | column.lod0 + column.lod0 | 0.00018 |
| 0.08, 0.35, 0.03 | column.lod0 + column.lod0 | 0.00008 |
| 0.10, 0.35, 0.06 | column.lod0 + column.lod0 | 0.0005 |
| 0.07, 0.35, 0.04 | column.lod0 + column.lod0 | 0.0003 |
| 0.07, 0.35, 0.05 | column.lod0 + column.lod0 | 0.00004 |
| 0.09, 0.35, 0.09 | column.lod0 + column.lod0 | 0.00101 |
| 0.07, 0.35, 0.07 | column.lod0 + column.lod0 | 0.00018 |
| 0.07, 0.35, 0.05 | column.lod0 + column.lod0 | 0.00008 |
| 0.07, 0.35, 0.09 | column.lod0 + column.lod0 | 0.0005 |
| 0.06, 0.35, 0.06 | column.lod0 + column.lod0 | 0.0003 |
| 0.05, 0.35, 0.07 | column.lod0 + column.lod0 | 0.00004 |
| 0.06, 0.35, 0.11 | column.lod0 + column.lod0 | 0.00101 |
| 0.05, 0.35, 0.09 | column.lod0 + column.lod0 | 0.00018 |
| 0.05, 0.35, 0.07 | column.lod0 + column.lod0 | 0.00008 |
| 0.04, 0.35, 0.10 | column.lod0 + column.lod0 | 0.0005 |
| 0.04, 0.35, 0.07 | column.lod0 + column.lod0 | 0.0003 |
| 0.03, 0.35, 0.08 | column.lod0 + column.lod0 | 0.00004 |
| 0.02, 0.35, 0.12 | column.lod0 + column.lod0 | 0.00101 |
| 0.02, 0.35, 0.10 | column.lod0 + column.lod0 | 0.00018 |
| 0.02, 0.35, 0.08 | column.lod0 + column.lod0 | 0.00008 |
| 0.01, 0.35, 0.11 | column.lod0 + column.lod0 | 0.0005 |
| 0.01, 0.35, 0.08 | column.lod0 + column.lod0 | 0.0003 |
| 0.00, 0.35, 0.08 | column.lod0 + column.lod0 | 0.00004 |
| -0.02, 0.35, 0.12 | column.lod0 + column.lod0 | 0.00101 |
| -0.01, 0.35, 0.10 | column.lod0 + column.lod0 | 0.00018 |
| -0.00, 0.35, 0.09 | column.lod0 + column.lod0 | 0.00008 |
| -0.03, 0.35, 0.11 | column.lod0 + column.lod0 | 0.0005 |
| -0.01, 0.35, 0.08 | column.lod0 + column.lod0 | 0.0003 |
| -0.02, 0.35, 0.08 | column.lod0 + column.lod0 | 0.00004 |
| -0.06, 0.35, 0.11 | column.lod0 + column.lod0 | 0.00101 |
| -0.04, 0.35, 0.09 | column.lod0 + column.lod0 | 0.00018 |
| -0.03, 0.35, 0.08 | column.lod0 + column.lod0 | 0.00008 |
| -0.06, 0.35, 0.10 | column.lod0 + column.lod0 | 0.0005 |

(140 more in the JSON)
