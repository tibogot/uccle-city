# Mesh audit: streetkit plate_octagon lod1

152 triangles, 98 welded vertices, 0 open edges, 0 rays, 7 ms.

**0 blocking**, 23 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 3 |
| nonmanifold | warn | 20 |
| seam | info | 4 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.08, 0.15, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 2.36 | 84.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.08, 0.14, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 2.36 | 84.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.08, -0.15, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 2.36 | 84.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| -0.04, 0.15, -0.07 | plate_octagon.lod1 | 4 |
| -0.04, 0.15, -0.10 | plate_octagon.lod1 | 4 |
| -0.03, 0.15, -0.11 | plate_octagon.lod1 | 4 |
| -0.02, 0.15, -0.12 | plate_octagon.lod1 | 4 |
| -0.01, 0.15, -0.13 | plate_octagon.lod1 | 4 |
| 0.02, 0.15, -0.13 | plate_octagon.lod1 | 4 |
| 0.03, 0.15, -0.11 | plate_octagon.lod1 | 4 |
| 0.04, 0.15, -0.10 | plate_octagon.lod1 | 4 |
| 0.04, 0.15, -0.07 | plate_octagon.lod1 | 4 |
| -0.04, -0.15, -0.07 | plate_octagon.lod1 | 4 |
| -0.04, -0.15, -0.09 | plate_octagon.lod1 | 4 |
| -0.04, -0.15, -0.10 | plate_octagon.lod1 | 4 |
| -0.03, -0.15, -0.12 | plate_octagon.lod1 | 4 |
| -0.02, -0.15, -0.13 | plate_octagon.lod1 | 4 |
| 0.00, -0.15, -0.13 | plate_octagon.lod1 | 4 |
| 0.02, -0.15, -0.13 | plate_octagon.lod1 | 4 |
| 0.03, -0.15, -0.12 | plate_octagon.lod1 | 4 |
| 0.04, -0.15, -0.10 | plate_octagon.lod1 | 4 |
| 0.04, -0.15, -0.09 | plate_octagon.lod1 | 4 |
| 0.04, -0.15, -0.07 | plate_octagon.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.05 | plate_octagon.lod1 + plate_octagon.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.15, -0.05 | plate_octagon.lod1 + plate_octagon.lod1 | 0.05 | 12 | 33 |
| -0.05, -0.15, -0.05 | plate_octagon.lod1 + plate_octagon.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.15, -0.05 | plate_octagon.lod1 + plate_octagon.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.19, 0.14, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.0068 |
| -0.19, 0.16, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.0068 |
| -0.06, -0.13, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00678 |
| 0.19, -0.16, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00679 |
| -0.19, -0.14, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00678 |
| 0.06, -0.17, -0.04 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00678 |
| -0.04, 0.15, -0.10 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| -0.03, 0.14, -0.12 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| -0.02, 0.15, -0.13 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00036 |
| 0.03, 0.15, -0.12 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.03, 0.14, -0.11 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.04, 0.14, -0.09 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00027 |
| -0.04, -0.15, -0.08 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00035 |
| -0.04, -0.14, -0.10 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00058 |
| -0.03, -0.15, -0.11 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| -0.02, -0.14, -0.12 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| -0.01, -0.15, -0.13 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.01, -0.14, -0.13 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.02, -0.15, -0.12 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.03, -0.14, -0.11 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00048 |
| 0.04, -0.15, -0.10 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00058 |
| 0.04, -0.14, -0.08 | plate_octagon.lod1 + plate_octagon.lod1 | 0.00035 |
