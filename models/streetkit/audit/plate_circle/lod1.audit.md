# Mesh audit: streetkit plate_circle lod1

260 triangles, 152 welded vertices, 0 open edges, 0 rays, 14 ms.

**0 blocking**, 24 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| nonmanifold | warn | 20 |
| seam | info | 4 |
| backtoback | info | 24 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.07, 0.15, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 2.33 | 79.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| -0.13, 0.14, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 2.33 | 6.5 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.07, 0.14, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 2.33 | 79.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.07, -0.15, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 2.36 | 79.2 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| -0.04, 0.15, -0.07 | plate_circle.lod1 | 4 |
| -0.04, 0.15, -0.10 | plate_circle.lod1 | 4 |
| -0.03, 0.15, -0.11 | plate_circle.lod1 | 4 |
| -0.02, 0.15, -0.12 | plate_circle.lod1 | 4 |
| -0.01, 0.15, -0.13 | plate_circle.lod1 | 4 |
| 0.02, 0.15, -0.13 | plate_circle.lod1 | 4 |
| 0.03, 0.15, -0.11 | plate_circle.lod1 | 4 |
| 0.04, 0.15, -0.10 | plate_circle.lod1 | 4 |
| 0.04, 0.15, -0.07 | plate_circle.lod1 | 4 |
| -0.04, -0.15, -0.07 | plate_circle.lod1 | 4 |
| -0.04, -0.15, -0.09 | plate_circle.lod1 | 4 |
| -0.04, -0.15, -0.10 | plate_circle.lod1 | 4 |
| -0.03, -0.15, -0.12 | plate_circle.lod1 | 4 |
| -0.02, -0.15, -0.13 | plate_circle.lod1 | 4 |
| 0.00, -0.15, -0.13 | plate_circle.lod1 | 4 |
| 0.02, -0.15, -0.13 | plate_circle.lod1 | 4 |
| 0.03, -0.15, -0.12 | plate_circle.lod1 | 4 |
| 0.04, -0.15, -0.10 | plate_circle.lod1 | 4 |
| 0.04, -0.15, -0.09 | plate_circle.lod1 | 4 |
| 0.04, -0.15, -0.07 | plate_circle.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.15, -0.05 | plate_circle.lod1 + plate_circle.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.15, -0.05 | plate_circle.lod1 + plate_circle.lod1 | 0.05 | 12 | 33 |
| -0.05, -0.15, -0.05 | plate_circle.lod1 + plate_circle.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.15, -0.05 | plate_circle.lod1 + plate_circle.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 24)

| at | parts | area |
|---|---|---|
| -0.06, 0.17, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00639 |
| 0.17, 0.14, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00639 |
| -0.17, 0.16, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00639 |
| 0.06, 0.13, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00639 |
| -0.06, -0.13, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00638 |
| 0.17, -0.16, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.0064 |
| -0.17, -0.14, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00638 |
| 0.06, -0.17, -0.04 | plate_circle.lod1 + plate_circle.lod1 | 0.00638 |
| -0.04, 0.15, -0.10 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| -0.03, 0.14, -0.12 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| -0.02, 0.15, -0.13 | plate_circle.lod1 + plate_circle.lod1 | 0.00036 |
| 0.03, 0.15, -0.12 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.03, 0.14, -0.11 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.04, 0.14, -0.09 | plate_circle.lod1 + plate_circle.lod1 | 0.00027 |
| -0.04, -0.15, -0.08 | plate_circle.lod1 + plate_circle.lod1 | 0.00035 |
| -0.04, -0.14, -0.10 | plate_circle.lod1 + plate_circle.lod1 | 0.00058 |
| -0.03, -0.15, -0.11 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| -0.02, -0.14, -0.12 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| -0.01, -0.15, -0.13 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.01, -0.14, -0.13 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.02, -0.15, -0.12 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.03, -0.14, -0.11 | plate_circle.lod1 + plate_circle.lod1 | 0.00048 |
| 0.04, -0.15, -0.10 | plate_circle.lod1 + plate_circle.lod1 | 0.00058 |
| 0.04, -0.14, -0.08 | plate_circle.lod1 + plate_circle.lod1 | 0.00035 |
