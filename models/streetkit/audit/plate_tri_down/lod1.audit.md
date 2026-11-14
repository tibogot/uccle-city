# Mesh audit: streetkit plate_tri_down lod1

186 triangles, 115 welded vertices, 0 open edges, 0 rays, 9 ms.

**0 blocking**, 29 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 3 |
| sliver | warn | 6 |
| nonmanifold | warn | 20 |
| seam | info | 4 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.07, 0.13, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 2.36 | 73.8 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| -0.04, -0.04, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 2.38 | 41.9 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |
| 0.04, -0.04, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 2.38 | 41.9 | 2.9 | 90 | 0.69 | false | 0 + 0 + -1 |

## sliver (warn, 6)

| at | part | aspect | longest |
|---|---|---|---|
| -0.22, 0.09, -0.00 | plate_tri_down.lod1 | 170 | 0.589 |
| -0.12, -0.08, -0.00 | plate_tri_down.lod1 | 170 | 0.588 |
| 0.12, -0.08, -0.00 | plate_tri_down.lod1 | 170 | 0.589 |
| 0.22, 0.09, -0.00 | plate_tri_down.lod1 | 170 | 0.588 |
| 0.10, 0.30, -0.00 | plate_tri_down.lod1 | 170 | 0.589 |
| -0.10, 0.30, -0.00 | plate_tri_down.lod1 | 170 | 0.588 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| -0.04, 0.12, -0.07 | plate_tri_down.lod1 | 4 |
| -0.04, 0.12, -0.10 | plate_tri_down.lod1 | 4 |
| -0.02, 0.12, -0.12 | plate_tri_down.lod1 | 4 |
| -0.01, 0.12, -0.13 | plate_tri_down.lod1 | 4 |
| 0.01, 0.12, -0.13 | plate_tri_down.lod1 | 4 |
| 0.02, 0.12, -0.12 | plate_tri_down.lod1 | 4 |
| 0.03, 0.12, -0.11 | plate_tri_down.lod1 | 4 |
| 0.04, 0.12, -0.10 | plate_tri_down.lod1 | 4 |
| 0.04, 0.12, -0.08 | plate_tri_down.lod1 | 4 |
| 0.04, 0.12, -0.07 | plate_tri_down.lod1 | 4 |
| -0.04, -0.04, -0.07 | plate_tri_down.lod1 | 4 |
| -0.04, -0.04, -0.10 | plate_tri_down.lod1 | 4 |
| -0.04, -0.04, -0.11 | plate_tri_down.lod1 | 4 |
| -0.03, -0.04, -0.12 | plate_tri_down.lod1 | 4 |
| -0.01, -0.04, -0.13 | plate_tri_down.lod1 | 4 |
| 0.01, -0.04, -0.13 | plate_tri_down.lod1 | 4 |
| 0.02, -0.04, -0.12 | plate_tri_down.lod1 | 4 |
| 0.03, -0.04, -0.12 | plate_tri_down.lod1 | 4 |
| 0.04, -0.04, -0.09 | plate_tri_down.lod1 | 4 |
| 0.04, -0.04, -0.07 | plate_tri_down.lod1 | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.12, -0.05 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.05 | 14 | 25.5 |
| 0.05, 0.12, -0.05 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.05 | 12 | 31.7 |
| -0.05, -0.04, -0.05 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.05 | 12 | 22.4 |
| 0.05, -0.04, -0.05 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.05 | 12 | 33 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| -0.05, 0.14, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00596 |
| 0.16, 0.11, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00596 |
| -0.16, 0.13, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00597 |
| 0.05, 0.10, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00596 |
| 0.09, -0.05, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00344 |
| -0.09, -0.03, -0.04 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00344 |
| -0.01, 0.13, -0.13 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.00, 0.12, -0.13 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.01, 0.13, -0.13 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.03, 0.12, -0.12 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.04, 0.13, -0.10 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.04, 0.12, -0.09 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00047 |
| 0.04, 0.13, -0.08 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00025 |
| -0.04, -0.03, -0.09 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00027 |
| -0.04, -0.04, -0.10 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00024 |
| -0.03, -0.04, -0.12 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.00, -0.04, -0.13 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.01, -0.04, -0.13 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00048 |
| 0.03, -0.04, -0.12 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00024 |
| 0.04, -0.05, -0.10 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00027 |
| 0.04, -0.05, -0.08 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00009 |
| 0.04, -0.03, -0.08 | plate_tri_down.lod1 + plate_tri_down.lod1 | 0.00021 |
