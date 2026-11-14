# Mesh audit: streetkit plate_rect lod1

184 triangles, 114 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 31 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| sliver | warn | 8 |
| nonmanifold | warn | 21 |
| seam | info | 4 |
| backtoback | info | 33 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.08, 0.28, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 2.36 | 89.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.08, 0.27, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 2.36 | 89.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| 0.30, -0.14, -0.00 | plate_rect.lod1 | 245 | 0.851 |
| 0.09, 0.45, -0.00 | plate_rect.lod1 | 159 | 0.551 |
| -0.30, 0.14, -0.00 | plate_rect.lod1 | 245 | 0.851 |
| -0.10, -0.45, -0.00 | plate_rect.lod1 | 156 | 0.541 |
| 0.30, -0.14, -0.01 | plate_rect.lod1 | 49 | 0.852 |
| 0.30, 0.14, -0.01 | plate_rect.lod1 | 42 | 0.852 |
| -0.30, 0.14, -0.01 | plate_rect.lod1 | 49 | 0.852 |
| -0.30, -0.14, -0.01 | plate_rect.lod1 | 42 | 0.852 |

## nonmanifold (warn, 21)

| at | part | uses |
|---|---|---|
| -0.04, 0.27, -0.07 | plate_rect.lod1 | 4 |
| -0.04, 0.27, -0.08 | plate_rect.lod1 | 4 |
| -0.04, 0.27, -0.10 | plate_rect.lod1 | 4 |
| -0.03, 0.27, -0.11 | plate_rect.lod1 | 4 |
| -0.03, 0.27, -0.12 | plate_rect.lod1 | 4 |
| -0.01, 0.27, -0.13 | plate_rect.lod1 | 4 |
| 0.00, 0.27, -0.13 | plate_rect.lod1 | 4 |
| 0.03, 0.27, -0.12 | plate_rect.lod1 | 4 |
| 0.04, 0.27, -0.10 | plate_rect.lod1 | 4 |
| 0.04, 0.27, -0.09 | plate_rect.lod1 | 4 |
| 0.04, 0.27, -0.07 | plate_rect.lod1 | 4 |
| -0.04, -0.27, -0.07 | plate_rect.lod1 | 4 |
| -0.04, -0.27, -0.10 | plate_rect.lod1 | 4 |
| -0.04, -0.27, -0.10 | plate_rect.lod1 | 4 |
| -0.03, -0.27, -0.12 | plate_rect.lod1 | 4 |
| -0.02, -0.27, -0.13 | plate_rect.lod1 | 4 |
| 0.00, -0.27, -0.13 | plate_rect.lod1 | 4 |
| 0.02, -0.27, -0.13 | plate_rect.lod1 | 4 |
| 0.02, -0.27, -0.12 | plate_rect.lod1 | 4 |
| 0.04, -0.27, -0.10 | plate_rect.lod1 | 4 |
| 0.04, -0.27, -0.07 | plate_rect.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.27, -0.05 | plate_rect.lod1 + plate_rect.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.27, -0.05 | plate_rect.lod1 + plate_rect.lod1 | 0.05 | 12 | 31.7 |
| -0.05, -0.27, -0.05 | plate_rect.lod1 + plate_rect.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.27, -0.05 | plate_rect.lod1 + plate_rect.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 33)

| at | parts | area |
|---|---|---|
| 0.20, 0.26, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00723 |
| -0.20, 0.28, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00723 |
| -0.07, -0.25, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00721 |
| 0.20, -0.28, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00721 |
| -0.20, -0.26, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00721 |
| 0.07, -0.29, -0.04 | plate_rect.lod1 + plate_rect.lod1 | 0.00721 |
| -0.04, 0.27, -0.08 | plate_rect.lod1 + plate_rect.lod1 | 0.00025 |
| -0.04, 0.28, -0.09 | plate_rect.lod1 + plate_rect.lod1 | 0.00047 |
| -0.04, 0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| -0.03, 0.28, -0.12 | plate_rect.lod1 + plate_rect.lod1 | 0.00036 |
| -0.02, 0.28, -0.12 | plate_rect.lod1 + plate_rect.lod1 | 0.00036 |
| -0.01, 0.27, -0.13 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| 0.04, 0.28, -0.11 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| 0.04, 0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00036 |
| 0.04, 0.28, -0.08 | plate_rect.lod1 + plate_rect.lod1 | 0.00013 |
| -0.04, -0.27, -0.08 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| -0.04, -0.26, -0.09 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| -0.04, -0.28, -0.09 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| -0.04, -0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| -0.04, -0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| -0.03, -0.28, -0.11 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| -0.02, -0.27, -0.12 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| -0.01, -0.28, -0.13 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| 0.01, -0.27, -0.13 | plate_rect.lod1 + plate_rect.lod1 | 0.00048 |
| 0.02, -0.28, -0.13 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| 0.03, -0.27, -0.12 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| 0.04, -0.26, -0.11 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| 0.04, -0.28, -0.11 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| 0.04, -0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00024 |
| 0.04, -0.27, -0.10 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| 0.04, -0.28, -0.08 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| 0.04, -0.26, -0.09 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
| 0.04, -0.27, -0.08 | plate_rect.lod1 + plate_rect.lod1 | 0.00017 |
