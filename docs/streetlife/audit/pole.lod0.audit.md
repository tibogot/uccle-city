# Mesh audit: pole lod0

768 triangles, 388 welded vertices, 0 open edges, 0 rays, 70 ms.

**0 blocking**, 32 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 32 |
| seam | info | 2 |
| backtoback | info | 64 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 32)

| at | part | aspect | longest |
|---|---|---|---|
| 0.04, 1.10, 0.01 | pole.lod0 | 177 | 3.108 |
| 0.04, 2.14, 0.01 | pole.lod0 | 177 | 3.108 |
| 0.04, 1.10, 0.02 | pole.lod0 | 177 | 3.108 |
| 0.04, 2.14, 0.03 | pole.lod0 | 177 | 3.108 |
| 0.03, 1.10, 0.04 | pole.lod0 | 177 | 3.108 |
| 0.02, 2.14, 0.04 | pole.lod0 | 177 | 3.108 |
| 0.01, 1.10, 0.04 | pole.lod0 | 177 | 3.108 |
| 0.01, 2.14, 0.04 | pole.lod0 | 177 | 3.108 |
| -0.01, 1.10, 0.04 | pole.lod0 | 177 | 3.108 |
| -0.01, 2.14, 0.04 | pole.lod0 | 177 | 3.108 |
| -0.02, 1.10, 0.04 | pole.lod0 | 177 | 3.108 |
| -0.03, 2.14, 0.04 | pole.lod0 | 177 | 3.108 |
| -0.04, 1.10, 0.03 | pole.lod0 | 177 | 3.108 |
| -0.04, 2.14, 0.02 | pole.lod0 | 177 | 3.108 |
| -0.04, 1.10, 0.01 | pole.lod0 | 177 | 3.108 |
| -0.04, 2.14, 0.01 | pole.lod0 | 177 | 3.108 |
| -0.04, 1.10, -0.01 | pole.lod0 | 177 | 3.108 |
| -0.04, 2.14, -0.01 | pole.lod0 | 177 | 3.108 |
| -0.04, 1.10, -0.02 | pole.lod0 | 177 | 3.108 |
| -0.04, 2.14, -0.03 | pole.lod0 | 177 | 3.108 |
| -0.03, 1.10, -0.04 | pole.lod0 | 177 | 3.108 |
| -0.02, 2.14, -0.04 | pole.lod0 | 177 | 3.108 |
| -0.01, 1.10, -0.04 | pole.lod0 | 177 | 3.108 |
| -0.01, 2.14, -0.04 | pole.lod0 | 177 | 3.108 |
| 0.01, 1.10, -0.04 | pole.lod0 | 177 | 3.108 |
| 0.01, 2.14, -0.04 | pole.lod0 | 177 | 3.108 |
| 0.02, 1.10, -0.04 | pole.lod0 | 177 | 3.108 |
| 0.03, 2.14, -0.04 | pole.lod0 | 177 | 3.108 |
| 0.04, 1.10, -0.03 | pole.lod0 | 177 | 3.108 |
| 0.04, 2.14, -0.02 | pole.lod0 | 177 | 3.108 |
| 0.04, 1.10, -0.01 | pole.lod0 | 177 | 3.108 |
| 0.04, 2.14, -0.01 | pole.lod0 | 177 | 3.108 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.04, 0.06, 0.01 | pole.lod0 + pole.lod0 | 0.24 | 32 | 45.6 |
| 0.04, 3.18, 0.01 | pole.lod0 + pole.lod0 | 0.24 | 32 | 45.6 |

## backtoback (info, 64)

| at | parts | area |
|---|---|---|
| 0.03, 0.06, 0.01 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.03, 0.06, 0.02 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.02, 0.06, 0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.01, 0.06, 0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.01, 0.06, 0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.02, 0.06, 0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.03, 0.06, 0.02 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.03, 0.06, 0.01 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.03, 0.06, -0.01 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.03, 0.06, -0.02 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.02, 0.06, -0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| -0.01, 0.06, -0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.01, 0.06, -0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.02, 0.06, -0.03 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.03, 0.06, -0.02 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.03, 0.06, -0.01 | pole.lod0 + pole.lod0 | 0.0001 |
| 0.04, 3.18, 0.00 | pole.lod0 + pole.lod0 | 0.00005 |
| 0.03, 3.18, 0.01 | pole.lod0 + pole.lod0 | 0.00004 |
| 0.03, 3.18, 0.02 | pole.lod0 + pole.lod0 | 0.00005 |
| 0.03, 3.18, 0.02 | pole.lod0 + pole.lod0 | 0.00004 |
| 0.02, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00005 |
| 0.02, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00004 |
| 0.01, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00005 |
| 0.01, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.00, 3.18, 0.04 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.01, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.02, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.02, 3.18, 0.03 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.03, 3.18, 0.02 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.03, 3.18, 0.02 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.03, 3.18, 0.01 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.03, 3.18, 0.01 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.04, 3.18, -0.00 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.03, 3.18, -0.01 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.03, 3.18, -0.02 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.03, 3.18, -0.02 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.02, 3.18, -0.03 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.02, 3.18, -0.03 | pole.lod0 + pole.lod0 | 0.00004 |
| -0.01, 3.18, -0.03 | pole.lod0 + pole.lod0 | 0.00005 |
| -0.01, 3.18, -0.03 | pole.lod0 + pole.lod0 | 0.00004 |

(24 more in the JSON)
