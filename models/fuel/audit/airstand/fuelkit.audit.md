# Mesh audit: fuelkit.glb

1,266 triangles, 652 welded vertices, 4 open edges, 320 rays, 86 ms.

**0 blocking**, 36 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 32 |
| seam | info | 6 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.11, 1.10, 0.14 | airstand/brand_primary + airstand__sign/sign | 1 | 143.5 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.01, 1.19, 0.14 | airstand/brand_primary + airstand__sign/sign | 1 | 125.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.00, 1.06, 0.14 | airstand/brand_primary + airstand__sign/sign | 1 | 141.5 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.10, 1.15, 0.14 | airstand/brand_primary + airstand__sign/sign | 1 | 159.3 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## sliver (warn, 32)

| at | part | aspect | longest |
|---|---|---|---|
| -0.29, 0.08, -0.08 | airstand/concrete | 63 | 0.48 |
| -0.29, 0.08, 0.08 | airstand/concrete | 63 | 0.48 |
| -0.30, 0.07, -0.08 | airstand/concrete | 63 | 0.48 |
| -0.30, 0.07, 0.08 | airstand/concrete | 63 | 0.48 |
| 0.10, 0.08, -0.24 | airstand/concrete | 76 | 0.58 |
| -0.10, 0.08, -0.24 | airstand/concrete | 76 | 0.58 |
| 0.10, 0.07, -0.25 | airstand/concrete | 76 | 0.58 |
| -0.10, 0.07, -0.25 | airstand/concrete | 76 | 0.58 |
| 0.29, 0.08, 0.08 | airstand/concrete | 63 | 0.48 |
| 0.29, 0.08, -0.08 | airstand/concrete | 63 | 0.48 |
| 0.30, 0.07, 0.08 | airstand/concrete | 63 | 0.48 |
| 0.30, 0.07, -0.08 | airstand/concrete | 63 | 0.48 |
| -0.10, 0.08, 0.24 | airstand/concrete | 76 | 0.58 |
| 0.10, 0.08, 0.24 | airstand/concrete | 76 | 0.58 |
| -0.10, 0.07, 0.25 | airstand/concrete | 76 | 0.58 |
| 0.10, 0.07, 0.25 | airstand/concrete | 76 | 0.58 |
| -0.15, 0.85, 0.13 | airstand/brand_secondary | 74 | 1.13 |
| -0.16, 0.48, 0.13 | airstand/brand_secondary | 74 | 1.13 |
| -0.17, 0.85, 0.12 | airstand/brand_secondary | 74 | 1.13 |
| -0.17, 0.48, 0.12 | airstand/brand_secondary | 74 | 1.13 |
| -0.15, 0.48, -0.13 | airstand/brand_secondary | 74 | 1.13 |
| -0.16, 0.85, -0.13 | airstand/brand_secondary | 74 | 1.13 |
| -0.17, 0.48, -0.12 | airstand/brand_secondary | 74 | 1.13 |
| -0.17, 0.85, -0.12 | airstand/brand_secondary | 74 | 1.13 |
| 0.17, 0.48, -0.12 | airstand/brand_secondary | 74 | 1.13 |
| 0.17, 0.85, -0.12 | airstand/brand_secondary | 74 | 1.13 |
| 0.16, 0.48, -0.13 | airstand/brand_secondary | 74 | 1.13 |
| 0.15, 0.85, -0.13 | airstand/brand_secondary | 74 | 1.13 |
| 0.15, 0.48, 0.13 | airstand/brand_secondary | 74 | 1.13 |
| 0.16, 0.85, 0.13 | airstand/brand_secondary | 74 | 1.13 |
| 0.17, 0.48, 0.12 | airstand/brand_secondary | 74 | 1.13 |
| 0.17, 0.85, 0.12 | airstand/brand_secondary | 74 | 1.13 |

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.16, 1.00, 0.13 | airstand/brand_secondary + airstand/brand_primary | 1.16 | 36 | 63.4 |
| 0.04, 0.80, 0.13 | airstand/brand_secondary + airstand/plastic_dark | 0.77 | 26 | 90 |
| 0.05, 0.63, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.34 | 18 | 22.5 |
| 0.07, 0.84, 0.15 | airstand/plastic_dark + airstand/screen | 0.48 | 10 | 90 |
| -0.15, 0.08, 0.00 | airstand/concrete + airstand/brand_secondary | 1.04 | 6 | 22.5 |
| 0.17, 0.95, 0.00 | airstand/brand_secondary + airstand/steel_brushed | 0.15 | 4 | 22.5 |

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| -0.01, 0.08, -0.07 | airstand/concrete + airstand/brand_secondary | 0.01556 |
| -0.11, 0.08, 0.03 | airstand/concrete + airstand/brand_secondary | 0.01744 |
| 0.11, 0.08, -0.03 | airstand/concrete + airstand/brand_secondary | 0.01744 |
| 0.01, 0.08, 0.07 | airstand/concrete + airstand/brand_secondary | 0.01556 |
| 0.04, 0.66, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| 0.05, 0.62, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| 0.03, 0.58, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| 0.02, 0.66, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00051 |
| 0.04, 0.60, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00059 |
| 0.03, 0.63, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00182 |
| 0.00, 0.67, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00005 |
| -0.04, 0.58, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| -0.05, 0.62, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| -0.04, 0.66, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| -0.02, 0.58, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.0006 |
| -0.04, 0.64, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.0006 |
| -0.02, 0.61, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.0029 |
| 0.00, 0.57, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00008 |
| -0.01, 0.67, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00009 |
| 0.01, 0.62, 0.13 | airstand/brand_secondary + airstand/steel_brushed | 0.00109 |
| 0.17, 0.98, 0.01 | airstand/brand_secondary + airstand/steel_brushed | 0.00067 |
| 0.17, 0.97, -0.01 | airstand/brand_secondary + airstand/steel_brushed | 0.00067 |


Nodes: airstand, airstand__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
