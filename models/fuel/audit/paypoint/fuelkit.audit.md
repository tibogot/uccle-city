# Mesh audit: fuelkit.glb

770 triangles, 404 welded vertices, 4 open edges, 384 rays, 45 ms.

**0 blocking**, 144 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 140 |
| seam | info | 7 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.18, 1.63, 0.20 | paypoint/brand_primary + paypoint__sign/sign | 2 | 174.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.01, 1.70, 0.20 | paypoint/brand_primary + paypoint__sign/sign | 2 | 161.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.01, 1.60, 0.20 | paypoint/brand_primary + paypoint__sign/sign | 2 | 161.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.18, 1.67, 0.20 | paypoint/brand_primary + paypoint__sign/sign | 2 | 174.2 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## sliver (warn, 140)

| at | part | aspect | longest |
|---|---|---|---|
| -0.37, 0.08, -0.10 | paypoint/concrete | 81 | 0.62 |
| -0.38, 0.08, 0.10 | paypoint/concrete | 81 | 0.62 |
| -0.38, 0.07, -0.10 | paypoint/concrete | 81 | 0.62 |
| -0.38, 0.07, 0.10 | paypoint/concrete | 81 | 0.62 |
| 0.12, 0.08, -0.31 | paypoint/concrete | 97 | 0.74 |
| -0.12, 0.08, -0.32 | paypoint/concrete | 97 | 0.74 |
| 0.12, 0.07, -0.32 | paypoint/concrete | 97 | 0.74 |
| -0.12, 0.07, -0.32 | paypoint/concrete | 97 | 0.74 |
| 0.37, 0.08, 0.10 | paypoint/concrete | 81 | 0.62 |
| 0.38, 0.08, -0.10 | paypoint/concrete | 81 | 0.62 |
| 0.38, 0.07, 0.10 | paypoint/concrete | 81 | 0.62 |
| 0.38, 0.07, -0.10 | paypoint/concrete | 81 | 0.62 |
| -0.12, 0.08, 0.31 | paypoint/concrete | 97 | 0.74 |
| 0.12, 0.08, 0.32 | paypoint/concrete | 97 | 0.74 |
| -0.12, 0.07, 0.32 | paypoint/concrete | 97 | 0.74 |
| 0.12, 0.07, 0.32 | paypoint/concrete | 97 | 0.74 |
| -0.27, 1.05, 0.20 | paypoint/dispenser_body | 93 | 1.43 |
| -0.27, 0.58, 0.20 | paypoint/dispenser_body | 93 | 1.43 |
| -0.28, 1.05, 0.19 | paypoint/dispenser_body | 93 | 1.43 |
| -0.28, 0.58, 0.18 | paypoint/dispenser_body | 93 | 1.43 |
| -0.27, 0.58, -0.20 | paypoint/dispenser_body | 93 | 1.43 |
| -0.27, 1.05, -0.20 | paypoint/dispenser_body | 93 | 1.43 |
| -0.28, 0.58, -0.19 | paypoint/dispenser_body | 93 | 1.43 |
| -0.28, 1.05, -0.18 | paypoint/dispenser_body | 93 | 1.43 |
| 0.28, 0.58, -0.18 | paypoint/dispenser_body | 93 | 1.43 |
| 0.28, 1.05, -0.19 | paypoint/dispenser_body | 93 | 1.43 |
| 0.27, 0.58, -0.20 | paypoint/dispenser_body | 93 | 1.43 |
| 0.27, 1.05, -0.20 | paypoint/dispenser_body | 93 | 1.43 |
| 0.27, 0.58, 0.20 | paypoint/dispenser_body | 93 | 1.43 |
| 0.27, 1.05, 0.20 | paypoint/dispenser_body | 93 | 1.43 |
| 0.28, 0.58, 0.19 | paypoint/dispenser_body | 93 | 1.43 |
| 0.28, 1.05, 0.18 | paypoint/dispenser_body | 93 | 1.43 |
| -0.09, 1.55, -0.19 | paypoint/brand_primary | 47 | 0.54 |
| 0.09, 1.55, -0.20 | paypoint/brand_primary | 47 | 0.54 |
| -0.09, 1.56, -0.20 | paypoint/brand_primary | 47 | 0.54 |
| 0.09, 1.56, -0.20 | paypoint/brand_primary | 47 | 0.54 |
| 0.09, 1.75, -0.19 | paypoint/brand_primary | 47 | 0.54 |
| -0.09, 1.75, -0.20 | paypoint/brand_primary | 47 | 0.54 |
| 0.09, 1.74, -0.20 | paypoint/brand_primary | 47 | 0.54 |
| -0.09, 1.74, -0.20 | paypoint/brand_primary | 47 | 0.54 |

(100 more in the JSON)

## seam (info, 7)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.12, 1.00, 0.20 | paypoint/plastic_dark + paypoint/plastic_dark | 0.88 | 52 | 67.5 |
| -0.03, 0.98, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 0.7 | 26 | 67.5 |
| -0.18, 1.39, 0.21 | paypoint/plastic_dark + paypoint/screen | 1.16 | 10 | 90 |
| -0.26, 0.08, 0.00 | paypoint/concrete + paypoint/dispenser_body | 1.76 | 6 | 22.5 |
| -0.26, 1.55, 0.00 | paypoint/dispenser_body + paypoint/brand_primary | 1.76 | 6 | 22.5 |
| -0.21, 1.41, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 1.67 | 6 | 22.5 |
| -0.02, 2.30, -0.15 | paypoint/steel_brushed + paypoint/brand_secondary | 0.19 | 4 | 22.5 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.01, 0.08, -0.12 | paypoint/concrete + paypoint/dispenser_body | 0.04274 |
| -0.18, 0.08, 0.04 | paypoint/concrete + paypoint/dispenser_body | 0.05086 |
| 0.18, 0.08, -0.04 | paypoint/concrete + paypoint/dispenser_body | 0.05086 |
| 0.01, 0.08, 0.12 | paypoint/concrete + paypoint/dispenser_body | 0.04274 |
| -0.08, 1.33, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 0.06598 |
| 0.06, 1.13, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 0.07992 |
| -0.18, 1.17, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 0.02133 |
| -0.13, 1.04, 0.20 | paypoint/dispenser_body + paypoint/plastic_dark | 0.0074 |
| 0.00, 1.55, -0.12 | paypoint/dispenser_body + paypoint/brand_primary | 0.04642 |
| -0.19, 1.55, -0.04 | paypoint/dispenser_body + paypoint/brand_primary | 0.04718 |
| 0.19, 1.55, 0.04 | paypoint/dispenser_body + paypoint/brand_primary | 0.04718 |
| -0.00, 1.55, 0.12 | paypoint/dispenser_body + paypoint/brand_primary | 0.04642 |
| 0.01, 1.75, -0.16 | paypoint/brand_primary + paypoint/steel_brushed | 0.00115 |
| -0.01, 1.75, -0.14 | paypoint/brand_primary + paypoint/steel_brushed | 0.00115 |
| -0.01, 2.30, -0.16 | paypoint/steel_brushed + paypoint/brand_secondary | 0.00115 |
| 0.01, 2.30, -0.14 | paypoint/steel_brushed + paypoint/brand_secondary | 0.00115 |


Nodes: paypoint, paypoint__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
