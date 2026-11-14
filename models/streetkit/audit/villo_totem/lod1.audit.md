# Mesh audit: streetkit villo_totem lod1

1,183 triangles, 696 welded vertices, 119 open edges, 3,712 rays, 118 ms.

**0 blocking**, 294 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 7 |
| sliver | warn | 287 |
| seam | info | 21 |
| backtoback | info | 37 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 7)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.10, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.8 | 4.4 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.10, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.9 | 2.5 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.09, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.8 | 3.1 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.12, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.8 | 4.1 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.08, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.8 | 4.4 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.08, 1.06, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.8 | 4 | 90 | 0.69 | false | 0 + 0 + 1 |
| 0.07, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 3 | 0.6 | 2.6 | 90 | 0.69 | false | 0 + 0 + 1 |

## sliver (warn, 287)

| at | part | aspect | longest |
|---|---|---|---|
| 0.19, 0.65, 0.15 | villo_totem.lod1 | 147 | 2.3 |
| 0.18, 1.41, 0.15 | villo_totem.lod1 | 123 | 2.3 |
| 0.20, 0.65, 0.14 | villo_totem.lod1 | 147 | 2.3 |
| 0.20, 1.41, 0.15 | villo_totem.lod1 | 147 | 2.3 |
| 0.22, 0.65, 0.14 | villo_totem.lod1 | 147 | 2.3 |
| 0.21, 1.41, 0.14 | villo_totem.lod1 | 147 | 2.3 |
| 0.23, 0.65, 0.12 | villo_totem.lod1 | 147 | 2.3 |
| 0.23, 1.41, 0.13 | villo_totem.lod1 | 147 | 2.3 |
| 0.24, 0.65, 0.11 | villo_totem.lod1 | 147 | 2.3 |
| 0.23, 1.41, 0.12 | villo_totem.lod1 | 147 | 2.3 |
| 0.24, 0.65, 0.10 | villo_totem.lod1 | 147 | 2.3 |
| 0.24, 1.41, 0.10 | villo_totem.lod1 | 147 | 2.3 |
| 0.24, 0.65, 0.08 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.09 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.07 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.07 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.06 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.06 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.05 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.05 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.03 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.04 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.02 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.03 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, 0.01 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.01 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.00 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, 0.00 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.01 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.01 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.03 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.02 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.04 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.03 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.05 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.05 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.06 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.06 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 0.65, -0.07 | villo_totem.lod1 | 182 | 2.3 |
| 0.24, 1.41, -0.07 | villo_totem.lod1 | 182 | 2.3 |

(247 more in the JSON)

## seam (info, 21)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.17, 0.05, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 3.01 | 489 | 55.9 |
| -0.00, 2.15, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 1.51 | 270 | 40.1 |
| -0.17, 0.31, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.98 | 54 | 82.9 |
| 0.02, 1.16, 0.19 | villo_totem.lod1 + villo_totem.lod1 | 0.19 | 11 | 75 |
| 0.12, 1.03, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 10 | 81.3 |
| 0.08, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 87.9 |
| 0.10, 1.07, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 80.4 |
| 0.10, 1.09, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 80.8 |
| 0.12, 1.05, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 80.8 |
| 0.12, 1.07, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 90 |
| 0.12, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 80.9 |
| 0.08, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 8 | 80.9 |
| 0.07, 1.05, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 7 | 79.2 |
| 0.10, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 7 | 81 |
| -0.04, 1.18, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.36 | 6 | 22.5 |
| 0.10, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 6 | 82.4 |
| -0.13, 0.53, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 1.21 | 6 | 36.2 |
| 0.09, 1.37, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.82 | 6 | 22.5 |
| 0.07, 1.07, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.05 | 5 | 79.2 |
| 0.07, 1.07, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.3 | 4 | 22.5 |
| 0.25, 2.31, 0.16 | villo_totem.lod1 + villo_totem.lod1 | 0.83 | 3 | 36.2 |

## backtoback (info, 37)

| at | parts | area |
|---|---|---|
| 0.01, 2.31, -0.10 | villo_totem.lod1 + villo_totem.lod1 | 0.0397 |
| 0.19, 2.31, 0.04 | villo_totem.lod1 + villo_totem.lod1 | 0.04164 |
| -0.19, 2.31, -0.04 | villo_totem.lod1 + villo_totem.lod1 | 0.04139 |
| -0.01, 2.31, 0.11 | villo_totem.lod1 + villo_totem.lod1 | 0.03901 |
| 0.03, 1.22, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00013 |
| -0.01, 1.20, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00387 |
| 0.03, 1.18, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00233 |
| -0.01, 1.16, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00167 |
| 0.07, 1.11, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00005 |
| 0.08, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00006 |
| 0.09, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.10, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.09, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.10, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.12, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00005 |
| 0.12, 1.06, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.12, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.12, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.12, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.12, 1.10, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.07, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.08, 1.03, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.07, 1.06, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.08, 1.06, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.07, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.08, 1.08, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00009 |
| 0.09, 1.04, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.10, 1.03, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.09, 1.06, 0.17 | villo_totem.lod1 + villo_totem.lod1 | 0.00008 |
| 0.09, 1.08, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.0027 |
| 0.10, 1.05, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.0027 |
| -0.05, 0.65, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.04164 |
| -0.11, 0.73, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00276 |
| 0.04, 0.54, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.0444 |
| 0.10, 1.46, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.00452 |
| -0.00, 1.51, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.02061 |
| 0.02, 1.43, 0.15 | villo_totem.lod1 + villo_totem.lod1 | 0.01609 |
