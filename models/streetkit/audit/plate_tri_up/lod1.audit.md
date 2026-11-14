# Mesh audit: streetkit plate_tri_up lod1

188 triangles, 116 welded vertices, 0 open edges, 0 rays, 10 ms.

**0 blocking**, 31 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 6 |
| nonmanifold | warn | 20 |
| seam | info | 4 |
| backtoback | info | 26 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.04, 0.04, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 2.38 | 41.9 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.04, 0.04, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 2.38 | 41.9 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| -0.07, -0.12, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 2.33 | 73.8 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.12, -0.11, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 2.33 | 6 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.07, -0.13, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 2.33 | 73.8 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## sliver (warn, 6)

| at | part | aspect | longest |
|---|---|---|---|
| -0.10, -0.30, -0.00 | plate_tri_up.lod1 | 170 | 0.589 |
| 0.10, -0.30, -0.00 | plate_tri_up.lod1 | 170 | 0.588 |
| 0.22, -0.09, -0.00 | plate_tri_up.lod1 | 170 | 0.589 |
| 0.12, 0.08, -0.00 | plate_tri_up.lod1 | 170 | 0.588 |
| -0.12, 0.08, -0.00 | plate_tri_up.lod1 | 170 | 0.589 |
| -0.22, -0.09, -0.00 | plate_tri_up.lod1 | 170 | 0.588 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| -0.04, 0.04, -0.07 | plate_tri_up.lod1 | 4 |
| -0.04, 0.04, -0.10 | plate_tri_up.lod1 | 4 |
| -0.02, 0.04, -0.13 | plate_tri_up.lod1 | 4 |
| -0.01, 0.04, -0.13 | plate_tri_up.lod1 | 4 |
| -0.00, 0.04, -0.13 | plate_tri_up.lod1 | 4 |
| 0.03, 0.04, -0.12 | plate_tri_up.lod1 | 4 |
| 0.04, 0.04, -0.09 | plate_tri_up.lod1 | 4 |
| 0.04, 0.04, -0.07 | plate_tri_up.lod1 | 4 |
| -0.04, -0.12, -0.07 | plate_tri_up.lod1 | 4 |
| -0.04, -0.12, -0.09 | plate_tri_up.lod1 | 4 |
| -0.04, -0.12, -0.10 | plate_tri_up.lod1 | 4 |
| -0.03, -0.12, -0.12 | plate_tri_up.lod1 | 4 |
| -0.02, -0.12, -0.13 | plate_tri_up.lod1 | 4 |
| 0.00, -0.12, -0.13 | plate_tri_up.lod1 | 4 |
| 0.01, -0.12, -0.13 | plate_tri_up.lod1 | 4 |
| 0.02, -0.12, -0.12 | plate_tri_up.lod1 | 4 |
| 0.03, -0.12, -0.12 | plate_tri_up.lod1 | 4 |
| 0.04, -0.12, -0.10 | plate_tri_up.lod1 | 4 |
| 0.04, -0.12, -0.08 | plate_tri_up.lod1 | 4 |
| 0.04, -0.12, -0.07 | plate_tri_up.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.04, -0.05 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.05 | 12 | 22.4 |
| 0.05, 0.04, -0.05 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.05 | 12 | 33 |
| -0.05, -0.12, -0.05 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.12, -0.05 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.05 | 12 | 31.7 |

## backtoback (info, 26)

| at | parts | area |
|---|---|---|
| 0.09, 0.03, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00344 |
| -0.09, 0.05, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00344 |
| -0.05, -0.10, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00596 |
| 0.16, -0.13, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00596 |
| -0.16, -0.11, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00596 |
| 0.05, -0.14, -0.04 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00596 |
| -0.04, 0.05, -0.09 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00027 |
| -0.02, 0.04, -0.13 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00024 |
| -0.01, 0.04, -0.13 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00024 |
| 0.03, 0.04, -0.11 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00016 |
| 0.04, 0.03, -0.10 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00032 |
| 0.04, 0.05, -0.10 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00008 |
| 0.04, 0.04, -0.10 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00016 |
| 0.04, 0.03, -0.08 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00009 |
| 0.04, 0.05, -0.08 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00021 |
| -0.04, -0.13, -0.08 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00035 |
| -0.04, -0.12, -0.10 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00058 |
| -0.03, -0.13, -0.11 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00048 |
| -0.02, -0.12, -0.12 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00048 |
| -0.01, -0.13, -0.13 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00048 |
| 0.00, -0.12, -0.13 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00024 |
| 0.01, -0.12, -0.13 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00036 |
| 0.02, -0.13, -0.12 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00048 |
| 0.04, -0.12, -0.11 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00048 |
| 0.04, -0.13, -0.09 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00058 |
| 0.04, -0.12, -0.08 | plate_tri_up.lod1 + plate_tri_up.lod1 | 0.00025 |
