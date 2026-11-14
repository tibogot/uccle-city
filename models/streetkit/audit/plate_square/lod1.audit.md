# Mesh audit: streetkit plate_square lod1

176 triangles, 110 welded vertices, 0 open edges, 0 rays, 7 ms.

**0 blocking**, 27 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| sliver | warn | 5 |
| nonmanifold | warn | 20 |
| seam | info | 4 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.08, 0.15, -0.04 | plate_square.lod1 + plate_square.lod1 | 2.36 | 89.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.08, 0.14, -0.04 | plate_square.lod1 + plate_square.lod1 | 2.36 | 89.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## sliver (warn, 5)

| at | part | aspect | longest |
|---|---|---|---|
| 0.30, -0.09, -0.00 | plate_square.lod1 | 159 | 0.551 |
| 0.09, 0.30, -0.00 | plate_square.lod1 | 159 | 0.551 |
| -0.30, 0.10, -0.00 | plate_square.lod1 | 156 | 0.541 |
| -0.10, -0.30, -0.00 | plate_square.lod1 | 156 | 0.541 |
| -0.10, 0.29, -0.02 | plate_square.lod1 | 46 | 0.569 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| -0.04, 0.15, -0.07 | plate_square.lod1 | 4 |
| -0.04, 0.15, -0.10 | plate_square.lod1 | 4 |
| -0.03, 0.15, -0.11 | plate_square.lod1 | 4 |
| -0.02, 0.15, -0.12 | plate_square.lod1 | 4 |
| -0.01, 0.15, -0.13 | plate_square.lod1 | 4 |
| 0.02, 0.15, -0.13 | plate_square.lod1 | 4 |
| 0.03, 0.15, -0.11 | plate_square.lod1 | 4 |
| 0.04, 0.15, -0.10 | plate_square.lod1 | 4 |
| 0.04, 0.15, -0.07 | plate_square.lod1 | 4 |
| -0.04, -0.15, -0.07 | plate_square.lod1 | 4 |
| -0.04, -0.15, -0.09 | plate_square.lod1 | 4 |
| -0.04, -0.15, -0.10 | plate_square.lod1 | 4 |
| -0.03, -0.15, -0.12 | plate_square.lod1 | 4 |
| -0.02, -0.15, -0.13 | plate_square.lod1 | 4 |
| 0.00, -0.15, -0.13 | plate_square.lod1 | 4 |
| 0.02, -0.15, -0.13 | plate_square.lod1 | 4 |
| 0.03, -0.15, -0.12 | plate_square.lod1 | 4 |
| 0.04, -0.15, -0.10 | plate_square.lod1 | 4 |
| 0.04, -0.15, -0.09 | plate_square.lod1 | 4 |
| 0.04, -0.15, -0.07 | plate_square.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.05 | plate_square.lod1 + plate_square.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.15, -0.05 | plate_square.lod1 + plate_square.lod1 | 0.05 | 12 | 33 |
| -0.05, -0.15, -0.05 | plate_square.lod1 + plate_square.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.15, -0.05 | plate_square.lod1 + plate_square.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.20, 0.14, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00723 |
| -0.20, 0.16, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00723 |
| -0.07, -0.13, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00721 |
| 0.20, -0.16, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00721 |
| -0.20, -0.14, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00721 |
| 0.07, -0.17, -0.04 | plate_square.lod1 + plate_square.lod1 | 0.00721 |
| -0.04, 0.15, -0.10 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| -0.03, 0.14, -0.12 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| -0.02, 0.15, -0.13 | plate_square.lod1 + plate_square.lod1 | 0.00036 |
| 0.03, 0.15, -0.12 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.03, 0.14, -0.11 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.04, 0.14, -0.09 | plate_square.lod1 + plate_square.lod1 | 0.00027 |
| -0.04, -0.15, -0.08 | plate_square.lod1 + plate_square.lod1 | 0.00035 |
| -0.04, -0.14, -0.10 | plate_square.lod1 + plate_square.lod1 | 0.00058 |
| -0.03, -0.15, -0.11 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| -0.02, -0.14, -0.12 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| -0.01, -0.15, -0.13 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.01, -0.14, -0.13 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.02, -0.15, -0.12 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.03, -0.14, -0.11 | plate_square.lod1 + plate_square.lod1 | 0.00048 |
| 0.04, -0.15, -0.10 | plate_square.lod1 + plate_square.lod1 | 0.00058 |
| 0.04, -0.14, -0.08 | plate_square.lod1 + plate_square.lod1 | 0.00035 |
