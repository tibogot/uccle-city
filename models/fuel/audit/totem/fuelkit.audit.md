# Mesh audit: fuelkit.glb

684 triangles, 424 welded vertices, 72 open edges, 11,520 rays, 65 ms.

**0 blocking**, 288 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 72 |
| sliver | warn | 216 |
| seam | info | 18 |
| backtoback | info | 40 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 72)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.66, 4.10, 0.05 | totem/brand_primary + totem/brand_secondary | 2 | 122.1 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.66, 4.06, 0.05 | totem/brand_primary + totem/brand_secondary | 2 | 72.9 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.66, 4.12, -0.14 | totem/brand_primary + totem/brand_secondary | 2 | 10.9 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -0.66, 4.08, -0.14 | totem/brand_primary + totem/brand_secondary | 2 | 60.1 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| 0.66, 4.10, -0.05 | totem/brand_primary + totem/brand_secondary | 2 | 122.1 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 0.66, 4.06, -0.05 | totem/brand_primary + totem/brand_secondary | 2 | 72.9 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 0.66, 4.12, 0.14 | totem/brand_primary + totem/brand_secondary | 2 | 10.9 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 0.66, 4.08, 0.14 | totem/brand_primary + totem/brand_secondary | 2 | 60.1 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| -0.13, 3.84, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 101.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.27, 3.89, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 206.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.46, 3.69, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 740.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.17, 3.82, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 863.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.24, 3.69, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 748.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.47, 3.81, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 643.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.21, 3.62, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 313.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.03, 3.68, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 190.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.13, 3.36, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 101.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.27, 3.41, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 206.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.46, 3.21, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 740.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.17, 3.34, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 863.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.24, 3.21, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 748.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.47, 3.33, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 643.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.21, 3.14, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 313.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.03, 3.20, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 190.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.13, 2.88, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 101.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.27, 2.93, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 206.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.46, 2.73, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 740.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.17, 2.86, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 863.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.24, 2.73, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 748.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.47, 2.85, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 643.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.21, 2.66, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 313.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.03, 2.72, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 190.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.13, 2.40, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 101.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.27, 2.45, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 206.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.46, 2.25, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 740.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.17, 2.38, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 863.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.24, 2.25, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 748.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.47, 2.37, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 643.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.21, 2.18, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 313.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.03, 2.24, 0.20 | totem/plastic_dark + totem__sign/sign | 3 | 190.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

(32 more in the JSON)

## sliver (warn, 216)

| at | part | aspect | longest |
|---|---|---|---|
| -0.83, 0.08, 0.32 | totem/concrete | 50 | 0.76 |
| -0.85, 0.08, 0.31 | totem/concrete | 50 | 0.76 |
| -0.84, 0.08, -0.32 | totem/concrete | 50 | 0.76 |
| -0.85, 0.08, -0.30 | totem/concrete | 50 | 0.76 |
| 0.28, 0.35, -0.30 | totem/concrete | 108 | 1.66 |
| -0.28, 0.35, -0.31 | totem/concrete | 108 | 1.66 |
| 0.28, 0.34, -0.32 | totem/concrete | 108 | 1.66 |
| -0.28, 0.34, -0.32 | totem/concrete | 108 | 1.66 |
| 0.85, 0.08, -0.31 | totem/concrete | 50 | 0.76 |
| 0.83, 0.08, -0.32 | totem/concrete | 50 | 0.76 |
| 0.84, 0.08, 0.32 | totem/concrete | 50 | 0.76 |
| 0.85, 0.08, 0.30 | totem/concrete | 50 | 0.76 |
| -0.28, 0.35, 0.30 | totem/concrete | 108 | 1.66 |
| 0.28, 0.35, 0.31 | totem/concrete | 108 | 1.66 |
| -0.28, 0.34, 0.32 | totem/concrete | 108 | 1.66 |
| 0.28, 0.34, 0.32 | totem/concrete | 108 | 1.66 |
| -0.74, 0.30, 0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.74, 0.30, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.75, 0.31, 0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.75, 0.31, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.74, 3.76, 0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.74, 2.04, 0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.75, 3.76, 0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.75, 2.04, 0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.74, 5.50, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.74, 5.50, 0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.75, 5.49, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.75, 5.49, 0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.74, 2.04, -0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.74, 3.76, -0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.75, 2.04, -0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.75, 3.76, -0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.65, 2.04, -0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.65, 3.76, -0.20 | totem/steel_brushed | 564 | 5.176 |
| -0.66, 2.04, -0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.66, 3.76, -0.21 | totem/steel_brushed | 564 | 5.176 |
| -0.66, 0.30, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.66, 0.30, 0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.65, 0.31, -0.07 | totem/steel_brushed | 43 | 0.396 |
| -0.65, 0.31, 0.07 | totem/steel_brushed | 43 | 0.396 |

(176 more in the JSON)

## seam (info, 18)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.65, 4.05, 0.20 | totem/brand_primary + totem/brand_secondary | 5.56 | 48 | 22.5 |
| -0.65, 0.36, -0.20 | totem/steel_brushed + totem/brand_primary | 11.78 | 40 | 67.5 |
| 0.65, 4.69, 0.20 | totem/steel_brushed + totem/brand_primary | 11.78 | 40 | 67.5 |
| -0.75, 5.45, 0.21 | totem/steel_brushed + totem/trim_alu | 1.02 | 33 | 63.4 |
| 0.66, 5.45, 0.21 | totem/steel_brushed + totem/trim_alu | 1.02 | 33 | 63.4 |
| -0.74, 0.35, -0.21 | totem/concrete + totem/steel_brushed | 1.02 | 24 | 90 |
| 0.65, 0.35, -0.20 | totem/concrete + totem/steel_brushed | 1.02 | 24 | 90 |
| -0.65, 4.05, -0.20 | totem/steel_brushed + totem/brand_secondary | 0.96 | 16 | 67.5 |
| 0.65, 4.08, 0.20 | totem/steel_brushed + totem/brand_secondary | 0.96 | 16 | 67.5 |
| -0.65, 5.45, -0.18 | totem/brand_primary + totem/trim_alu | 3.36 | 6 | 22.5 |
| 0.40, 2.11, 0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| 0.34, 2.59, 0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| 0.28, 3.07, 0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| 0.22, 3.55, 0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| -0.60, 2.31, -0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| -0.60, 2.79, -0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| -0.60, 3.27, -0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |
| -0.60, 3.75, -0.20 | totem/brand_primary + totem/plastic_dark | 3.2 | 6 | 90 |

## backtoback (info, 40)

| at | parts | area |
|---|---|---|
| -0.04, 0.35, -0.13 | totem/concrete + totem/brand_primary | 0.11169 |
| -0.46, 0.35, 0.05 | totem/concrete + totem/brand_primary | 0.13531 |
| 0.46, 0.35, -0.05 | totem/concrete + totem/brand_primary | 0.13531 |
| 0.04, 0.35, 0.13 | totem/concrete + totem/brand_primary | 0.11169 |
| 0.28, 2.46, 0.20 | totem/brand_primary + totem/plastic_dark | 0.03842 |
| 0.39, 2.27, 0.20 | totem/brand_primary + totem/plastic_dark | 0.14118 |
| 0.20, 2.93, 0.20 | totem/brand_primary + totem/plastic_dark | 0.05961 |
| 0.33, 2.74, 0.20 | totem/brand_primary + totem/plastic_dark | 0.16913 |
| 0.12, 3.39, 0.20 | totem/brand_primary + totem/plastic_dark | 0.08543 |
| 0.27, 3.21, 0.20 | totem/brand_primary + totem/plastic_dark | 0.19244 |
| 0.04, 3.86, 0.20 | totem/brand_primary + totem/plastic_dark | 0.11589 |
| 0.21, 3.68, 0.20 | totem/brand_primary + totem/plastic_dark | 0.21112 |
| -0.24, 2.37, 0.20 | totem/brand_primary + totem/plastic_dark | 0.20158 |
| -0.09, 2.19, 0.20 | totem/brand_primary + totem/plastic_dark | 0.09882 |
| -0.30, 2.84, 0.20 | totem/brand_primary + totem/plastic_dark | 0.18039 |
| -0.17, 2.66, 0.20 | totem/brand_primary + totem/plastic_dark | 0.07087 |
| -0.36, 3.31, 0.20 | totem/brand_primary + totem/plastic_dark | 0.15457 |
| -0.24, 3.13, 0.20 | totem/brand_primary + totem/plastic_dark | 0.04756 |
| -0.42, 3.78, 0.20 | totem/brand_primary + totem/plastic_dark | 0.12411 |
| -0.32, 3.59, 0.20 | totem/brand_primary + totem/plastic_dark | 0.02888 |
| -0.16, 5.45, -0.14 | totem/brand_primary + totem/trim_alu | 0.12712 |
| -0.43, 5.45, 0.00 | totem/brand_primary + totem/trim_alu | 0.11988 |
| 0.43, 5.45, -0.00 | totem/brand_primary + totem/trim_alu | 0.11988 |
| 0.16, 5.45, 0.14 | totem/brand_primary + totem/trim_alu | 0.12712 |
| -0.28, 2.46, -0.20 | totem/brand_primary + totem/plastic_dark | 0.03842 |
| -0.39, 2.27, -0.20 | totem/brand_primary + totem/plastic_dark | 0.14118 |
| -0.20, 2.93, -0.20 | totem/brand_primary + totem/plastic_dark | 0.05961 |
| -0.33, 2.74, -0.20 | totem/brand_primary + totem/plastic_dark | 0.16913 |
| -0.12, 3.39, -0.20 | totem/brand_primary + totem/plastic_dark | 0.08543 |
| -0.27, 3.21, -0.20 | totem/brand_primary + totem/plastic_dark | 0.19244 |
| -0.04, 3.86, -0.20 | totem/brand_primary + totem/plastic_dark | 0.11589 |
| -0.21, 3.68, -0.20 | totem/brand_primary + totem/plastic_dark | 0.21112 |
| 0.24, 2.37, -0.20 | totem/brand_primary + totem/plastic_dark | 0.20158 |
| 0.09, 2.19, -0.20 | totem/brand_primary + totem/plastic_dark | 0.09882 |
| 0.30, 2.84, -0.20 | totem/brand_primary + totem/plastic_dark | 0.18039 |
| 0.17, 2.66, -0.20 | totem/brand_primary + totem/plastic_dark | 0.07087 |
| 0.36, 3.31, -0.20 | totem/brand_primary + totem/plastic_dark | 0.15457 |
| 0.24, 3.13, -0.20 | totem/brand_primary + totem/plastic_dark | 0.04756 |
| 0.42, 3.78, -0.20 | totem/brand_primary + totem/plastic_dark | 0.12411 |
| 0.32, 3.59, -0.20 | totem/brand_primary + totem/plastic_dark | 0.02888 |


Nodes: totem, totem__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
