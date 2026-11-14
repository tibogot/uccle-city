# Mesh audit: streetkit plate_octagon lod2

32 triangles, 28 welded vertices, 0 open edges, 0 rays, 1 ms.

**0 blocking**, 3 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 3 |
| backtoback | info | 28 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.21, 0.09, 0.00 | plate_octagon.lod2 | 4 |
| -0.21, -0.09, 0.00 | plate_octagon.lod2 | 4 |
| -0.01, -0.15, -0.12 | plate_octagon.lod2 | 4 |

## backtoback (info, 28)

| at | parts | area |
|---|---|---|
| -0.07, -0.03, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.01258 |
| 0.21, -0.15, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| 0.06, -0.15, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.03037 |
| -0.23, 0.07, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0089 |
| 0.24, 0.10, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| -0.02, 0.25, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| 0.10, 0.16, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0089 |
| 0.21, 0.03, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| -0.21, 0.15, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| -0.06, 0.15, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.03037 |
| 0.23, -0.07, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0089 |
| 0.07, 0.03, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.01258 |
| -0.24, -0.10, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| -0.10, -0.16, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0089 |
| 0.02, -0.25, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| -0.21, -0.03, 0.00 | plate_octagon.lod2 + plate_octagon.lod2 | 0.02148 |
| 0.17, 0.15, -0.03 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0063 |
| -0.17, 0.15, -0.03 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0063 |
| 0.19, 0.14, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0068 |
| -0.19, 0.16, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0068 |
| 0.17, -0.15, -0.03 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0063 |
| -0.17, -0.15, -0.03 | plate_octagon.lod2 + plate_octagon.lod2 | 0.0063 |
| -0.06, -0.13, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00678 |
| 0.19, -0.16, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00679 |
| -0.19, -0.14, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00678 |
| 0.06, -0.17, -0.04 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00678 |
| -0.03, -0.14, -0.10 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00164 |
| -0.00, -0.14, -0.12 | plate_octagon.lod2 + plate_octagon.lod2 | 0.00092 |
