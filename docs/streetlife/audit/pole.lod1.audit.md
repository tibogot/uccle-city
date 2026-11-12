# Mesh audit: pole lod1

186 triangles, 97 welded vertices, 3 open edges, 34 rays, 7 ms.

**0 blocking**, 18 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| tjunction | warn | 1 |
| degenerate | warn | 1 |
| seam | info | 2 |
| backtoback | info | 19 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| 0.04, 1.10, 0.00 | pole.lod1 | 90 | 3.108 |
| 0.04, 2.14, 0.02 | pole.lod1 | 90 | 3.108 |
| 0.03, 1.10, 0.03 | pole.lod1 | 90 | 3.108 |
| 0.02, 2.14, 0.04 | pole.lod1 | 90 | 3.108 |
| 0.00, 1.10, 0.04 | pole.lod1 | 90 | 3.108 |
| -0.02, 2.14, 0.04 | pole.lod1 | 90 | 3.108 |
| -0.03, 1.10, 0.03 | pole.lod1 | 90 | 3.108 |
| -0.04, 2.14, 0.02 | pole.lod1 | 90 | 3.108 |
| -0.04, 1.10, 0.00 | pole.lod1 | 90 | 3.108 |
| -0.04, 2.14, -0.02 | pole.lod1 | 90 | 3.108 |
| -0.03, 1.10, -0.03 | pole.lod1 | 90 | 3.108 |
| -0.02, 2.14, -0.04 | pole.lod1 | 90 | 3.108 |
| 0.00, 1.10, -0.04 | pole.lod1 | 90 | 3.108 |
| 0.02, 2.14, -0.04 | pole.lod1 | 90 | 3.108 |
| 0.03, 1.10, -0.03 | pole.lod1 | 90 | 3.108 |
| 0.04, 2.14, -0.02 | pole.lod1 | 90 | 3.108 |

## tjunction (warn, 1)

| at | part | edge_m |
|---|---|---|
| 0.00, 3.18, 0.00 | pole.lod1 | 0.09 |

## degenerate (warn, 1)

| at | part | edge |
|---|---|---|
| 0.00, 3.18, 0.00 | pole.lod1 | 0.09 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.04, 3.18, 0.00 | pole.lod1 + pole.lod1 | 0.22 | 11 | 15 |
| -0.02, 0.06, -0.03 | pole.lod1 + pole.lod1 | 0.23 | 8 | 47.3 |

## backtoback (info, 19)

| at | parts | area |
|---|---|---|
| -0.01, 0.06, -0.01 | pole.lod1 + pole.lod1 | 0.00022 |
| -0.00, 0.06, -0.01 | pole.lod1 + pole.lod1 | 0.00038 |
| -0.01, 0.06, -0.00 | pole.lod1 + pole.lod1 | 0.00032 |
| 0.01, 0.06, 0.02 | pole.lod1 + pole.lod1 | 0.00045 |
| 0.00, 0.06, 0.01 | pole.lod1 + pole.lod1 | 0.00032 |
| -0.01, 0.06, 0.01 | pole.lod1 + pole.lod1 | 0.00054 |
| -0.02, 0.06, 0.00 | pole.lod1 + pole.lod1 | 0.00022 |
| 0.03, 0.06, 0.01 | pole.lod1 + pole.lod1 | 0.00032 |
| 0.01, 0.06, -0.00 | pole.lod1 + pole.lod1 | 0.00022 |
| 0.01, 0.06, -0.01 | pole.lod1 + pole.lod1 | 0.00038 |
| -0.03, 3.18, 0.00 | pole.lod1 + pole.lod1 | 0.00008 |
| -0.01, 3.18, 0.01 | pole.lod1 + pole.lod1 | 0.0003 |
| -0.01, 3.18, 0.02 | pole.lod1 + pole.lod1 | 0.00038 |
| -0.03, 3.18, -0.01 | pole.lod1 + pole.lod1 | 0.00019 |
| -0.01, 3.18, -0.01 | pole.lod1 + pole.lod1 | 0.00051 |
| 0.00, 3.18, -0.02 | pole.lod1 + pole.lod1 | 0.0004 |
| 0.02, 3.18, -0.00 | pole.lod1 + pole.lod1 | 0.00029 |
| 0.02, 3.18, 0.01 | pole.lod1 + pole.lod1 | 0.00035 |
| 0.01, 3.18, 0.02 | pole.lod1 + pole.lod1 | 0.00038 |
