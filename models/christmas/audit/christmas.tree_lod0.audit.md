# Mesh audit: christmas tree_lod0 (needle-vs-needle overlaps exempt: 90144)

150,368 triangles, 139,655 welded vertices, 103,668 open edges, 2,531,426 rays, 26473 ms.

**0 blocking**, 6871 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 6180 |
| nonmanifold | warn | 32 |
| seam | info | 19823 |
| opening | info | 16 |
| backtoback | info | 655 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 6180)

| at | part | aspect | longest |
|---|---|---|---|
| -0.01, 5.00, -0.09 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.07, 4.00, -0.08 | tree_lod0/fir_bark | 45 | 3.001 |
| -0.09, 5.00, -0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.09, 5.00, 0.01 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.08, 4.00, 0.07 | tree_lod0/fir_bark | 45 | 3.001 |
| -0.04, 5.00, 0.09 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.01, 5.00, 0.09 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.07, 4.00, 0.08 | tree_lod0/fir_bark | 45 | 3.001 |
| 0.09, 5.00, 0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.09, 5.00, -0.01 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.08, 4.00, -0.07 | tree_lod0/fir_bark | 45 | 3.001 |
| 0.04, 5.00, -0.09 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.01, 8.00, -0.04 | tree_lod0/fir_bark | 193 | 3.001 |
| -0.04, 7.00, -0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.06, 7.00, -0.02 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.04, 8.00, 0.01 | tree_lod0/fir_bark | 193 | 3.001 |
| -0.04, 7.00, 0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.02, 7.00, 0.06 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.01, 8.00, 0.04 | tree_lod0/fir_bark | 193 | 3.001 |
| 0.04, 7.00, 0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.06, 7.00, 0.02 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.04, 8.00, -0.01 | tree_lod0/fir_bark | 193 | 3.001 |
| 0.04, 7.00, -0.04 | tree_lod0/fir_bark | 72 | 3.001 |
| 0.02, 7.00, -0.06 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.39, 1.04, -0.40 | tree_lod0/fir_bark | 53 | 0.709 |
| -0.23, 1.11, -0.23 | tree_lod0/fir_bark | 44 | 0.708 |
| -0.24, 1.12, -0.23 | tree_lod0/fir_bark | 44 | 0.709 |
| -0.39, 1.05, -0.40 | tree_lod0/fir_bark | 53 | 0.709 |
| -0.71, 0.90, -0.72 | tree_lod0/fir_bark | 54 | 0.722 |
| -0.87, 0.82, -0.87 | tree_lod0/fir_bark | 66 | 0.721 |
| -0.88, 0.82, -0.87 | tree_lod0/fir_bark | 66 | 0.722 |
| -0.71, 0.91, -0.72 | tree_lod0/fir_bark | 54 | 0.722 |
| -1.19, 0.65, -1.20 | tree_lod0/fir_bark | 66 | 0.73 |
| -1.35, 0.56, -1.35 | tree_lod0/fir_bark | 86 | 0.73 |
| -1.36, 0.57, -1.35 | tree_lod0/fir_bark | 86 | 0.73 |
| -1.19, 0.66, -1.20 | tree_lod0/fir_bark | 66 | 0.73 |
| -1.67, 0.39, -1.68 | tree_lod0/fir_bark | 86 | 0.732 |
| -1.83, 0.30, -1.83 | tree_lod0/fir_bark | 122 | 0.732 |
| -1.84, 0.30, -1.83 | tree_lod0/fir_bark | 122 | 0.732 |
| -1.67, 0.39, -1.68 | tree_lod0/fir_bark | 86 | 0.732 |

(6140 more in the JSON)

## nonmanifold (warn, 32)

| at | part | uses |
|---|---|---|
| 1.13, 0.57, -0.47 | tree_lod0/wood_planks | 4 |
| 0.47, 0.57, -1.13 | tree_lod0/wood_planks | 4 |
| 0.51, 0.55, -1.23 | tree_lod0/wood_planks | 4 |
| 0.55, 0.57, -1.32 | tree_lod0/wood_planks | 4 |
| 1.32, 0.57, -0.55 | tree_lod0/wood_planks | 4 |
| 1.23, 0.55, -0.51 | tree_lod0/wood_planks | 4 |
| 1.23, 0.58, -0.51 | tree_lod0/wood_planks | 4 |
| -0.47, 0.57, -1.13 | tree_lod0/wood_planks | 4 |
| -0.51, 0.55, -1.23 | tree_lod0/wood_planks | 4 |
| -0.55, 0.57, -1.32 | tree_lod0/wood_planks | 4 |
| 0.51, 0.58, -1.23 | tree_lod0/wood_planks | 4 |
| -1.13, 0.57, -0.47 | tree_lod0/wood_planks | 4 |
| -1.23, 0.55, -0.51 | tree_lod0/wood_planks | 4 |
| -1.32, 0.57, -0.55 | tree_lod0/wood_planks | 4 |
| -0.51, 0.58, -1.23 | tree_lod0/wood_planks | 4 |
| -1.13, 0.57, 0.47 | tree_lod0/wood_planks | 4 |
| -1.23, 0.55, 0.51 | tree_lod0/wood_planks | 4 |
| -1.32, 0.57, 0.55 | tree_lod0/wood_planks | 4 |
| -1.23, 0.58, -0.51 | tree_lod0/wood_planks | 4 |
| -0.47, 0.57, 1.13 | tree_lod0/wood_planks | 4 |
| -0.51, 0.55, 1.23 | tree_lod0/wood_planks | 4 |
| -0.55, 0.57, 1.32 | tree_lod0/wood_planks | 4 |
| -1.23, 0.58, 0.51 | tree_lod0/wood_planks | 4 |
| 0.47, 0.57, 1.13 | tree_lod0/wood_planks | 4 |
| 0.51, 0.55, 1.23 | tree_lod0/wood_planks | 4 |
| 0.55, 0.57, 1.32 | tree_lod0/wood_planks | 4 |
| -0.51, 0.58, 1.23 | tree_lod0/wood_planks | 4 |
| 1.13, 0.57, 0.47 | tree_lod0/wood_planks | 4 |
| 1.23, 0.55, 0.51 | tree_lod0/wood_planks | 4 |
| 1.32, 0.57, 0.55 | tree_lod0/wood_planks | 4 |
| 0.51, 0.58, 1.23 | tree_lod0/wood_planks | 4 |
| 1.23, 0.58, 0.51 | tree_lod0/wood_planks | 4 |

## seam (info, 19823)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.48, -0.16 | tree_lod0/fir_bark + tree_lod0/mulch | 1.04 | 26 | 89.2 |
| -0.03, 1.35, -0.15 | tree_lod0/fir_bark + tree_lod0/fir_needles | 0.96 | 24 | 89.2 |
| 0.76, 6.36, -0.69 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 0.94, 1.50, 1.95 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| -0.73, 5.86, -0.36 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| -0.69, 7.85, -0.12 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 81 |
| 1.44, 2.55, 0.23 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 81 |
| -0.79, 4.87, 1.06 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 2.15, 1.52, 1.60 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 1.41, 2.52, -0.75 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 1.55, 2.17, 0.90 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 81 |
| 1.09, 3.79, 0.39 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 1.12, 5.68, -0.37 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 0.58, 1.99, 1.40 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 1.08, 1.61, -1.75 | tree_lod0/bauble + tree_lod0/gold_metal | 0.19 | 24 | 81 |
| 0.88, 1.72, -1.29 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| -1.05, 6.35, -0.08 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 1.28, 5.46, 0.27 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 0.46, 6.13, 0.69 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 0.03, 4.93, -0.92 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 81 |
| -1.36, 2.22, 1.31 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 0.89, 1.30, 1.30 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 0.28, 2.69, 1.75 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 81 |
| 1.67, 1.57, -0.70 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 1.89, 1.33, 0.02 | tree_lod0/bauble + tree_lod0/gold_metal | 0.19 | 24 | 81 |
| 1.49, 3.41, -0.48 | tree_lod0/bauble + tree_lod0/gold_metal | 0.18 | 24 | 81 |
| 0.92, 7.14, 0.19 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| -1.50, 1.43, -0.06 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| -0.73, 2.08, -2.07 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 81 |
| -1.51, 1.65, -0.61 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 81 |
| 1.12, 4.56, 0.23 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| -0.88, 6.78, 0.30 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 0.04, 8.71, 0.45 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 0.36, 5.16, 1.33 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 81 |
| 0.64, 7.78, -0.17 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| -0.34, 2.54, -1.64 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| -0.93, 6.89, -0.22 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 81 |
| 1.94, 1.52, 0.63 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 81 |
| 0.08, 7.45, -0.83 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 81 |
| 2.43, 1.80, 0.06 | tree_lod0/bauble + tree_lod0/gold_metal | 0.19 | 24 | 81 |

(19783 more in the JSON)

## opening (info, 16)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.55, 0.00, -1.21 | tree_lod0/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| 0.47, 0.00, -1.25 | tree_lod0/wood_planks | 0 + 0 + -1 | 1.034 |
| -0.55, 0.00, -1.21 | tree_lod0/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.00, -0.47 | tree_lod0/wood_planks | -1 + 0 + 0 | 1.034 |
| -1.21, 0.00, 0.55 | tree_lod0/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.47, 0.00, 1.25 | tree_lod0/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.55, 0.00, 1.21 | tree_lod0/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.00, -0.47 | tree_lod0/wood_planks | 1 + 0 + 0 | 1.034 |
| 0.99, 0.48, -0.77 | tree_lod0/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| -0.15, 0.48, -1.25 | tree_lod0/wood_planks | 0 + 0 + -1 | 1.034 |
| -0.77, 0.48, -0.99 | tree_lod0/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.48, -0.15 | tree_lod0/wood_planks | -1 + 0 + 0 | 1.034 |
| -0.99, 0.48, 0.77 | tree_lod0/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.15, 0.48, 1.25 | tree_lod0/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.77, 0.48, 0.99 | tree_lod0/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.48, 0.47 | tree_lod0/wood_planks | 1 + 0 + 0 | 1.034 |

## backtoback (info, 655)

| at | parts | area |
|---|---|---|
| -1.33, 0.57, -1.34 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00122 |
| -2.08, 0.46, -0.60 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00054 |
| -1.08, 0.87, 0.51 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00093 |
| -2.29, 0.36, 1.08 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00121 |
| -0.93, 0.86, 0.72 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00025 |
| -0.81, 0.91, 0.63 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00132 |
| -0.45, 0.55, 1.73 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00041 |
| 0.38, 0.58, 1.96 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00021 |
| 0.49, 0.41, 2.51 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00128 |
| 0.46, 0.46, 2.36 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00005 |
| 0.68, 0.95, 0.70 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00077 |
| 0.97, 0.81, 0.99 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00015 |
| 1.25, 0.66, 1.27 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00027 |
| 2.71, 0.24, 0.19 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00117 |
| 1.56, 0.74, -0.21 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00023 |
| 0.18, 1.18, -0.29 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00119 |
| 0.17, 0.86, -1.24 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00158 |
| 0.24, 0.71, -1.66 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0014 |
| 0.04, 1.30, 0.63 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00259 |
| 0.06, 1.27, 0.75 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00008 |
| 0.09, 1.13, 1.15 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0006 |
| 0.54, 1.25, 0.68 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00278 |
| 1.63, 0.85, 1.15 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00011 |
| 1.11, 1.16, 0.08 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00079 |
| 2.19, 0.75, 0.17 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00037 |
| 1.24, 0.83, -1.22 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0016 |
| 0.40, 1.18, -0.72 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0024 |
| 0.35, 1.21, -0.64 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00138 |
| -0.74, 1.13, -0.96 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00106 |
| -0.80, 1.24, -0.42 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00044 |
| -0.19, 1.36, 0.40 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00161 |
| -0.97, 0.73, 1.99 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00013 |
| 0.31, 1.49, -0.49 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00076 |
| 0.66, 1.31, -1.04 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00152 |
| 0.79, 1.25, -1.23 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00231 |
| 1.13, 1.06, -1.78 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00153 |
| 0.02, 1.59, -0.42 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00196 |
| 0.02, 1.55, -0.55 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00067 |
| 0.08, 1.08, -2.12 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00146 |
| -0.39, 1.52, -0.67 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00009 |

(615 more in the JSON)
