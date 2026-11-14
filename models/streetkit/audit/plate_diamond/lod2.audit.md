# Mesh audit: streetkit plate_diamond lod2

20 triangles, 20 welded vertices, 0 open edges, 0 rays, 1 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 1 |
| backtoback | info | 12 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 0.00, 0.00 | plate_diamond.lod2 | 4 |

## backtoback (info, 12)

| at | parts | area |
|---|---|---|
| 0.11, -0.00, 0.00 | plate_diamond.lod2 + plate_diamond.lod2 | 0.1165 |
| -0.11, -0.00, 0.00 | plate_diamond.lod2 + plate_diamond.lod2 | 0.11659 |
| 0.15, 0.11, -0.03 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00551 |
| -0.15, 0.11, -0.03 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00551 |
| 0.16, 0.10, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00596 |
| -0.16, 0.12, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00596 |
| 0.15, -0.11, -0.03 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00551 |
| -0.15, -0.11, -0.03 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00551 |
| -0.05, -0.09, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00594 |
| 0.16, -0.12, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00594 |
| -0.16, -0.10, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00594 |
| 0.05, -0.13, -0.04 | plate_diamond.lod2 + plate_diamond.lod2 | 0.00594 |
