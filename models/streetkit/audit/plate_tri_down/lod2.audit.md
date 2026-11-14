# Mesh audit: streetkit plate_tri_down lod2

30 triangles, 27 welded vertices, 0 open edges, 0 rays, 1 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 1 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.02, 0.12, -0.12 | plate_tri_down.lod2 | 4 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.07, 0.16, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.15883 |
| 0.15, 0.01, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00328 |
| -0.14, -0.00, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00378 |
| -0.11, -0.03, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00811 |
| -0.25, 0.19, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00909 |
| 0.26, 0.19, 0.00 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00561 |
| 0.15, 0.12, -0.03 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00552 |
| -0.15, 0.12, -0.03 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00552 |
| -0.05, 0.14, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00596 |
| 0.16, 0.11, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00596 |
| -0.16, 0.13, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00597 |
| 0.05, 0.10, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00596 |
| 0.09, -0.05, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00344 |
| -0.09, -0.03, -0.04 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00344 |
| 0.00, 0.12, -0.11 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00152 |
| 0.03, 0.12, -0.09 | plate_tri_down.lod2 + plate_tri_down.lod2 | 0.00136 |
