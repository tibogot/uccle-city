# Mesh audit: streetkit plate_square lod2

24 triangles, 24 welded vertices, 0 open edges, 0 rays, 1 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 1 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| -0.01, -0.15, -0.12 | plate_square.lod2 | 4 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.07, -0.21, 0.00 | plate_square.lod2 + plate_square.lod2 | 0.08583 |
| 0.21, 0.08, 0.00 | plate_square.lod2 + plate_square.lod2 | 0.08305 |
| -0.21, -0.07, 0.00 | plate_square.lod2 + plate_square.lod2 | 0.08107 |
| 0.07, 0.23, 0.00 | plate_square.lod2 + plate_square.lod2 | 0.07844 |
| 0.18, 0.15, -0.03 | plate_square.lod2 + plate_square.lod2 | 0.00671 |
| -0.18, 0.15, -0.03 | plate_square.lod2 + plate_square.lod2 | 0.00671 |
| 0.20, 0.14, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00723 |
| -0.20, 0.16, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00723 |
| 0.18, -0.15, -0.03 | plate_square.lod2 + plate_square.lod2 | 0.00671 |
| -0.18, -0.15, -0.03 | plate_square.lod2 + plate_square.lod2 | 0.00671 |
| -0.07, -0.13, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00721 |
| 0.20, -0.16, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00721 |
| -0.20, -0.14, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00721 |
| 0.07, -0.17, -0.04 | plate_square.lod2 + plate_square.lod2 | 0.00721 |
| -0.03, -0.14, -0.10 | plate_square.lod2 + plate_square.lod2 | 0.00164 |
| -0.00, -0.14, -0.12 | plate_square.lod2 + plate_square.lod2 | 0.00092 |
