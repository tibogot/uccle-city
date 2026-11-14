# Mesh audit: fuelkit.glb

10,832 triangles, 5,608 welded vertices, 24 open edges, 1,536 rays, 910 ms.

**0 blocking**, 530 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 82 |
| sliver | warn | 448 |
| seam | info | 92 |
| backtoback | info | 36 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 82)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 0.65, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 20.5 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.00, 0.59, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 6.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.00, 0.37, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 6.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.00, 0.31, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 20.5 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.00, 0.65, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 20.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, 0.59, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 6.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.00, 0.37, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 6.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, 0.31, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 3 | 20.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.11, 1.25, 0.24 | dispenser/plastic_dark + dispenser/screen | 1.6 | 321.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.17, 1.15, 0.24 | dispenser/plastic_dark + dispenser/screen | 1.6 | 8.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.03, 1.29, 0.24 | dispenser/plastic_dark + dispenser/screen | 1.6 | 8.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.03, 1.19, 0.24 | dispenser/plastic_dark + dispenser/screen | 1.6 | 321.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.19, 1.10, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 5.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.18, 1.09, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 0.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.19, 1.15, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.20, 1.14, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.25, 1.16, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 0.6 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.19, 1.20, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.20, 1.19, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.26, 1.20, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.27, 1.19, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 5.3 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.19, 1.25, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.20, 1.24, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.26, 1.25, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.27, 1.24, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.33, 1.25, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 5.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.21, 1.11, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 0.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.20, 1.09, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 5.8 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.26, 1.10, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.27, 1.09, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.26, 1.15, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 5.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.27, 1.14, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.28, 1.19, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.33, 1.10, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.34, 1.09, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.33, 1.15, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.34, 1.14, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.33, 1.20, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.34, 1.19, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 6.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.34, 1.26, 0.24 | dispenser/plastic_dark + dispenser/trim_alu | 2.4 | 1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

(42 more in the JSON)

## sliver (warn, 448)

| at | part | aspect | longest |
|---|---|---|---|
| -0.61, 0.10, -0.10 | dispenser/steel_brushed | 76 | 0.58 |
| -0.61, 0.10, 0.10 | dispenser/steel_brushed | 76 | 0.58 |
| -0.62, 0.10, -0.10 | dispenser/steel_brushed | 76 | 0.58 |
| -0.62, 0.09, 0.10 | dispenser/steel_brushed | 76 | 0.58 |
| 0.20, 0.10, -0.29 | dispenser/steel_brushed | 159 | 1.22 |
| -0.20, 0.10, -0.29 | dispenser/steel_brushed | 159 | 1.22 |
| 0.20, 0.10, -0.30 | dispenser/steel_brushed | 159 | 1.22 |
| -0.20, 0.09, -0.30 | dispenser/steel_brushed | 159 | 1.22 |
| 0.61, 0.10, 0.10 | dispenser/steel_brushed | 76 | 0.58 |
| 0.61, 0.10, -0.10 | dispenser/steel_brushed | 76 | 0.58 |
| 0.62, 0.10, 0.10 | dispenser/steel_brushed | 76 | 0.58 |
| 0.62, 0.09, -0.10 | dispenser/steel_brushed | 76 | 0.58 |
| -0.20, 0.10, 0.29 | dispenser/steel_brushed | 159 | 1.22 |
| 0.20, 0.10, 0.29 | dispenser/steel_brushed | 159 | 1.22 |
| -0.20, 0.10, 0.30 | dispenser/steel_brushed | 159 | 1.22 |
| 0.20, 0.09, 0.30 | dispenser/steel_brushed | 159 | 1.22 |
| -0.54, 0.10, 0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.54, 0.10, -0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.55, 0.11, 0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.55, 0.11, -0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.54, 0.60, 0.23 | dispenser/dispenser_body | 80 | 0.736 |
| -0.54, 0.36, 0.23 | dispenser/dispenser_body | 80 | 0.736 |
| -0.55, 0.60, 0.22 | dispenser/dispenser_body | 80 | 0.736 |
| -0.55, 0.36, 0.22 | dispenser/dispenser_body | 80 | 0.736 |
| -0.54, 0.86, -0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.54, 0.86, 0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.55, 0.85, -0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.55, 0.85, 0.07 | dispenser/dispenser_body | 47 | 0.436 |
| -0.54, 0.36, -0.23 | dispenser/dispenser_body | 80 | 0.736 |
| -0.54, 0.60, -0.23 | dispenser/dispenser_body | 80 | 0.736 |
| -0.55, 0.36, -0.22 | dispenser/dispenser_body | 80 | 0.736 |
| -0.55, 0.60, -0.22 | dispenser/dispenser_body | 80 | 0.736 |
| -0.18, 0.10, -0.22 | dispenser/dispenser_body | 117 | 1.076 |
| 0.18, 0.10, -0.22 | dispenser/dispenser_body | 117 | 1.076 |
| -0.18, 0.11, -0.23 | dispenser/dispenser_body | 117 | 1.076 |
| 0.18, 0.11, -0.23 | dispenser/dispenser_body | 117 | 1.076 |
| 0.18, 0.86, -0.22 | dispenser/dispenser_body | 117 | 1.076 |
| -0.18, 0.86, -0.22 | dispenser/dispenser_body | 117 | 1.076 |
| 0.18, 0.85, -0.23 | dispenser/dispenser_body | 117 | 1.076 |
| -0.18, 0.85, -0.23 | dispenser/dispenser_body | 117 | 1.076 |

(408 more in the JSON)

## seam (info, 92)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.56, 1.66, 0.27 | dispenser/brand_primary + dispenser/brand_secondary | 13.14 | 68 | 67.5 |
| 0.28, 1.22, 0.28 | dispenser/plastic_dark + dispenser/plastic_dark | 1.06 | 52 | 67.5 |
| 0.29, 1.18, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 52 | 67.5 |
| 0.29, 1.18, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 52 | 67.5 |
| 0.22, 1.26, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.36, 1.11, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.31, 1.17, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.31, 1.23, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.17, 1.08, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.24, 1.13, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.28, 1.22, -0.24 | dispenser/plastic_dark + dispenser/plastic_dark | 1.06 | 50 | 67.5 |
| 0.22, 1.25, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.36, 1.11, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.31, 1.23, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.17, 1.08, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.24, 1.13, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 50 | 67.5 |
| 0.31, 1.16, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 49 | 67.5 |
| 0.24, 1.23, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.31, 1.18, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.24, 1.08, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.17, 1.13, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.17, 1.18, 0.28 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.24, 1.23, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.31, 1.18, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.24, 1.08, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.17, 1.13, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.17, 1.18, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.33 | 48 | 67.5 |
| 0.28, 1.25, 0.29 | dispenser/plastic_dark + dispenser/trim_alu | 0.19 | 32 | 67.5 |
| 0.28, 1.25, -0.24 | dispenser/plastic_dark + dispenser/trim_alu | 0.19 | 32 | 67.5 |
| -0.41, 0.65, 0.32 | dispenser/rubber_black + dispenser/grade_green | 0.23 | 30 | 67.5 |
| 0.35, 0.65, 0.32 | dispenser/rubber_black + dispenser/rubber_black | 0.23 | 30 | 67.5 |
| -0.41, 0.65, -0.27 | dispenser/rubber_black + dispenser/grade_green | 0.23 | 30 | 67.5 |
| 0.35, 0.65, -0.27 | dispenser/rubber_black + dispenser/rubber_black | 0.23 | 30 | 67.5 |
| -0.24, 1.32, 0.25 | dispenser/dispenser_body + dispenser/plastic_dark | 1.23 | 26 | 67.5 |
| 0.32, 1.05, 0.25 | dispenser/dispenser_body + dispenser/plastic_dark | 1.02 | 26 | 90 |
| 0.17, 1.11, 0.25 | dispenser/dispenser_body + dispenser/trim_alu | 0.16 | 26 | 90 |
| -0.23, 1.08, -0.25 | dispenser/dispenser_body + dispenser/plastic_dark | 1.23 | 26 | 67.5 |
| 0.15, 1.28, -0.25 | dispenser/dispenser_body + dispenser/plastic_dark | 1.02 | 26 | 90 |
| 0.17, 1.26, -0.25 | dispenser/dispenser_body + dispenser/trim_alu | 0.16 | 26 | 90 |
| 0.39, 0.75, 0.28 | dispenser/rubber_black + dispenser/hose_black | 0.08 | 26 | 75.5 |

(52 more in the JSON)

## backtoback (info, 36)

| at | parts | area |
|---|---|---|
| -0.03, 0.10, -0.14 | dispenser/steel_brushed + dispenser/dispenser_body | 0.10862 |
| -0.38, 0.10, 0.06 | dispenser/steel_brushed + dispenser/dispenser_body | 0.12594 |
| 0.38, 0.10, -0.06 | dispenser/steel_brushed + dispenser/dispenser_body | 0.12594 |
| 0.03, 0.10, 0.14 | dispenser/steel_brushed + dispenser/dispenser_body | 0.10862 |
| 0.36, 0.60, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| 0.40, 0.55, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| -0.40, 0.60, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| -0.36, 0.55, 0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| 0.01, 0.86, -0.14 | dispenser/dispenser_body + dispenser/canopy_white | 0.11259 |
| -0.39, 0.86, -0.06 | dispenser/dispenser_body + dispenser/canopy_white | 0.12197 |
| 0.39, 0.86, 0.06 | dispenser/dispenser_body + dispenser/canopy_white | 0.12197 |
| -0.01, 0.86, 0.14 | dispenser/dispenser_body + dispenser/canopy_white | 0.11259 |
| -0.36, 0.60, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| -0.40, 0.55, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| 0.40, 0.60, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| 0.36, 0.55, -0.23 | dispenser/dispenser_body + dispenser/plastic_dark | 0.00724 |
| 0.13, 0.90, -0.18 | dispenser/dispenser_body + dispenser/canopy_white | 0.12584 |
| 0.34, 0.90, 0.00 | dispenser/dispenser_body + dispenser/canopy_white | 0.12073 |
| -0.34, 0.90, -0.00 | dispenser/dispenser_body + dispenser/canopy_white | 0.12073 |
| -0.13, 0.90, 0.18 | dispenser/dispenser_body + dispenser/canopy_white | 0.12584 |
| -0.13, 1.45, -0.18 | dispenser/dispenser_body + dispenser/brand_primary | 0.12328 |
| -0.34, 1.45, 0.00 | dispenser/dispenser_body + dispenser/brand_primary | 0.12328 |
| 0.34, 1.45, 0.00 | dispenser/dispenser_body + dispenser/brand_primary | 0.12328 |
| 0.13, 1.45, 0.18 | dispenser/dispenser_body + dispenser/brand_primary | 0.12328 |
| -0.40, 0.63, 0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00041 |
| -0.38, 0.63, 0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00194 |
| 0.36, 0.63, 0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00041 |
| 0.38, 0.63, 0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00194 |
| -0.36, 0.63, -0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00041 |
| -0.38, 0.63, -0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00194 |
| 0.40, 0.63, -0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00041 |
| 0.38, 0.63, -0.27 | dispenser/plastic_dark + dispenser/rubber_black | 0.00194 |
| 0.01, 1.86, -0.17 | dispenser/trim_alu + dispenser/brand_primary | 0.1394 |
| 0.41, 1.86, 0.06 | dispenser/trim_alu + dispenser/brand_primary | 0.14365 |
| -0.41, 1.86, -0.06 | dispenser/trim_alu + dispenser/brand_primary | 0.14365 |
| -0.01, 1.86, 0.17 | dispenser/trim_alu + dispenser/brand_primary | 0.1394 |


Nodes: dispenser, dispenser__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
