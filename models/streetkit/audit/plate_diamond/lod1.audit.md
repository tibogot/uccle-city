# Mesh audit: streetkit plate_diamond lod1

164 triangles, 104 welded vertices, 0 open edges, 0 rays, 19 ms.

**0 blocking**, 36 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 12 |
| nonmanifold | warn | 19 |
| seam | info | 4 |
| backtoback | info | 23 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.07, 0.12, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 2.36 | 73.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.07, 0.10, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 2.36 | 73.6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| -0.07, -0.10, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 2.33 | 73.6 | 0.4 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.12, -0.10, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 1.93 | 6 | 0.4 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.07, -0.12, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 1.93 | 73.6 | 0.4 | 90 | 0.69 | false | 0 + 0 + -1 |

## sliver (warn, 12)

| at | part | aspect | longest |
|---|---|---|---|
| -0.00, -0.11, 0.00 | plate_diamond.lod1 | 51 | 0.683 |
| 0.23, -0.11, 0.00 | plate_diamond.lod1 | 52 | 0.483 |
| -0.23, -0.11, 0.00 | plate_diamond.lod1 | 52 | 0.483 |
| 0.00, 0.11, 0.00 | plate_diamond.lod1 | 51 | 0.683 |
| 0.23, 0.12, -0.00 | plate_diamond.lod1 | 138 | 0.474 |
| -0.12, 0.23, -0.00 | plate_diamond.lod1 | 138 | 0.474 |
| -0.23, -0.12, -0.00 | plate_diamond.lod1 | 138 | 0.474 |
| 0.12, -0.23, -0.00 | plate_diamond.lod1 | 138 | 0.474 |
| 0.12, -0.23, -0.02 | plate_diamond.lod1 | 46 | 0.493 |
| 0.23, -0.12, -0.02 | plate_diamond.lod1 | 113 | 0.482 |
| -0.12, 0.23, -0.02 | plate_diamond.lod1 | 46 | 0.493 |
| -0.23, 0.12, -0.02 | plate_diamond.lod1 | 113 | 0.482 |

## nonmanifold (warn, 19)

| at | part | uses |
|---|---|---|
| -0.04, 0.11, -0.07 | plate_diamond.lod1 | 4 |
| -0.04, 0.11, -0.11 | plate_diamond.lod1 | 4 |
| -0.03, 0.11, -0.12 | plate_diamond.lod1 | 4 |
| -0.02, 0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.00, 0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.01, 0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.02, 0.11, -0.12 | plate_diamond.lod1 | 4 |
| 0.04, 0.11, -0.11 | plate_diamond.lod1 | 4 |
| 0.04, 0.11, -0.10 | plate_diamond.lod1 | 4 |
| 0.04, 0.11, -0.09 | plate_diamond.lod1 | 4 |
| 0.04, 0.11, -0.07 | plate_diamond.lod1 | 4 |
| -0.04, -0.11, -0.07 | plate_diamond.lod1 | 4 |
| -0.04, -0.11, -0.10 | plate_diamond.lod1 | 4 |
| -0.02, -0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.00, -0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.02, -0.11, -0.13 | plate_diamond.lod1 | 4 |
| 0.03, -0.11, -0.11 | plate_diamond.lod1 | 4 |
| 0.04, -0.11, -0.09 | plate_diamond.lod1 | 4 |
| 0.04, -0.11, -0.07 | plate_diamond.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.11, -0.05 | plate_diamond.lod1 + plate_diamond.lod1 | 0.05 | 14 | 25.5 |
| -0.05, -0.11, -0.05 | plate_diamond.lod1 + plate_diamond.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.11, -0.05 | plate_diamond.lod1 + plate_diamond.lod1 | 0.05 | 12 | 33 |
| 0.05, -0.11, -0.05 | plate_diamond.lod1 + plate_diamond.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 23)

| at | parts | area |
|---|---|---|
| 0.16, 0.10, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00596 |
| -0.16, 0.12, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00596 |
| -0.05, -0.09, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00594 |
| 0.16, -0.12, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00594 |
| -0.16, -0.10, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00594 |
| 0.05, -0.13, -0.04 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00594 |
| -0.04, 0.12, -0.10 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00041 |
| -0.03, 0.10, -0.11 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00036 |
| -0.02, 0.12, -0.12 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| -0.01, 0.10, -0.13 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| 0.00, 0.12, -0.13 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| 0.02, 0.12, -0.12 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| 0.03, 0.10, -0.12 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| 0.04, 0.12, -0.11 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| 0.04, 0.10, -0.10 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00058 |
| 0.04, 0.12, -0.08 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00035 |
| -0.04, -0.11, -0.11 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| -0.03, -0.10, -0.12 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| -0.03, -0.12, -0.12 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| -0.02, -0.11, -0.13 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00024 |
| -0.01, -0.10, -0.13 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| 0.01, -0.12, -0.13 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00048 |
| 0.04, -0.10, -0.08 | plate_diamond.lod1 + plate_diamond.lod1 | 0.00035 |
