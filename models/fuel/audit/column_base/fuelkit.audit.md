# Mesh audit: fuelkit.glb

152 triangles, 80 welded vertices, 0 open edges, 0 rays, 13 ms.

**0 blocking**, 68 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 56 |
| sliver | warn | 12 |
| seam | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 56)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.19, 0.67, -0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.5 | 0 | 120 | 0.92 | false | 0.97 + 0 + -0.26 |
| 0.19, 0.73, -0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 0.4 | 0 | 120 | 0.92 | false | 0.97 + 0 + -0.26 |
| 0.20, 0.65, -0.15 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 11.7 | 0 | 120 | 0.92 | false | 0.97 + 0 + -0.26 |
| 0.20, 0.70, -0.15 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 18.6 | 0 | 120 | 0.92 | false | 0.97 + 0 + -0.26 |
| 0.17, 0.68, -0.19 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 6.6 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.18, 0.65, -0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 12 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.18, 0.71, -0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 18.3 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.14, 0.68, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.6 | 0 | 120 | 0.92 | false | 0.26 + 0 + -0.97 |
| 0.16, 0.65, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 12.4 | 0 | 120 | 0.92 | false | 0.26 + 0 + -0.97 |
| 0.16, 0.71, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 17.9 | 0 | 120 | 0.92 | false | 0.26 + 0 + -0.97 |
| -0.11, 0.68, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 60 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.12, 0.74, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 2.9 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.03, 0.65, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 108 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.02, 0.71, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 165.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.17, 0.67, -0.19 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.5 | 0 | 120 | 0.92 | false | -0.26 + 0 + -0.97 |
| -0.17, 0.73, -0.19 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 0.4 | 0 | 120 | 0.92 | false | -0.26 + 0 + -0.97 |
| -0.15, 0.65, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 11.7 | 0 | 120 | 0.92 | false | -0.26 + 0 + -0.97 |
| -0.15, 0.70, -0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 18.6 | 0 | 120 | 0.92 | false | -0.26 + 0 + -0.97 |
| -0.19, 0.68, -0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 6.6 | 0 | 120 | 0.92 | false | -0.71 + 0 + -0.71 |
| -0.18, 0.65, -0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 12 | 0 | 120 | 0.92 | false | -0.71 + 0 + -0.71 |
| -0.18, 0.71, -0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 18.3 | 0 | 120 | 0.92 | false | -0.71 + 0 + -0.71 |
| -0.20, 0.68, -0.14 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.6 | 0 | 120 | 0.92 | false | -0.97 + 0 + -0.26 |
| -0.20, 0.65, -0.16 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 12.4 | 0 | 120 | 0.92 | false | -0.97 + 0 + -0.26 |
| -0.20, 0.71, -0.16 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 17.9 | 0 | 120 | 0.92 | false | -0.97 + 0 + -0.26 |
| -0.20, 0.68, 0.11 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 60 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.20, 0.74, 0.12 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 2.9 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.20, 0.65, -0.03 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 108 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.20, 0.71, -0.02 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 165.1 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.19, 0.67, 0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.5 | 0 | 120 | 0.92 | false | -0.97 + 0 + 0.26 |
| -0.19, 0.73, 0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 0.4 | 0 | 120 | 0.92 | false | -0.97 + 0 + 0.26 |
| -0.20, 0.65, 0.15 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 11.7 | 0 | 120 | 0.92 | false | -0.97 + 0 + 0.26 |
| -0.20, 0.70, 0.15 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 18.6 | 0 | 120 | 0.92 | false | -0.97 + 0 + 0.26 |
| -0.17, 0.68, 0.19 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 6.6 | 0 | 120 | 0.92 | false | -0.71 + 0 + 0.71 |
| -0.18, 0.65, 0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 12 | 0 | 120 | 0.92 | false | -0.71 + 0 + 0.71 |
| -0.18, 0.71, 0.18 | column_base/steel_brushed + column_base/brand_secondary | 2.64 | 18.3 | 0 | 120 | 0.92 | false | -0.71 + 0 + 0.71 |
| -0.14, 0.68, 0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 6.6 | 0 | 120 | 0.92 | false | -0.26 + 0 + 0.97 |
| -0.16, 0.65, 0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 12.4 | 0 | 120 | 0.92 | false | -0.26 + 0 + 0.97 |
| -0.16, 0.71, 0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.54 | 17.9 | 0 | 120 | 0.92 | false | -0.26 + 0 + 0.97 |
| 0.11, 0.68, 0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 60 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.12, 0.74, 0.20 | column_base/steel_brushed + column_base/brand_secondary | 2.5 | 2.9 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

(16 more in the JSON)

## sliver (warn, 12)

| at | part | aspect | longest |
|---|---|---|---|
| 0.19, 0.86, -0.05 | column_base/steel_brushed | 46 | 0.295 |
| -0.05, 0.86, -0.19 | column_base/steel_brushed | 46 | 0.295 |
| -0.19, 0.86, 0.05 | column_base/steel_brushed | 46 | 0.295 |
| 0.05, 0.86, 0.19 | column_base/steel_brushed | 46 | 0.295 |
| 0.20, 0.74, -0.06 | column_base/brand_secondary | 42 | 0.312 |
| -0.06, 0.74, -0.20 | column_base/brand_secondary | 42 | 0.312 |
| -0.20, 0.74, 0.06 | column_base/brand_secondary | 42 | 0.312 |
| 0.06, 0.74, 0.20 | column_base/brand_secondary | 42 | 0.312 |
| 0.20, 0.62, 0.06 | column_base/brand_secondary | 42 | 0.312 |
| -0.06, 0.62, 0.20 | column_base/brand_secondary | 42 | 0.312 |
| -0.20, 0.62, -0.06 | column_base/brand_secondary | 42 | 0.312 |
| 0.06, 0.62, -0.20 | column_base/brand_secondary | 42 | 0.312 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.19, 0.62, -0.17 | column_base/steel_brushed + column_base/brand_secondary | 2.99 | 116 | 90 |


Nodes: column_base. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
