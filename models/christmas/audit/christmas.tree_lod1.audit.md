# Mesh audit: christmas tree_lod1 (needle-vs-needle overlaps exempt: 752)

40,582 triangles, 23,752 welded vertices, 24 open edges, 4,608 rays, 1150 ms.

**0 blocking**, 286 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 220 |
| nonmanifold | warn | 32 |
| seam | info | 2769 |
| opening | info | 16 |
| backtoback | info | 193 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 220)

| at | part | aspect | longest |
|---|---|---|---|
| -0.01, 8.00, -0.04 | tree_lod1/fir_bark | 131 | 3.001 |
| -0.04, 8.00, -0.03 | tree_lod1/fir_bark | 131 | 3.001 |
| -0.04, 8.00, 0.01 | tree_lod1/fir_bark | 131 | 3.001 |
| -0.03, 8.00, 0.04 | tree_lod1/fir_bark | 131 | 3.001 |
| 0.01, 8.00, 0.04 | tree_lod1/fir_bark | 131 | 3.001 |
| 0.04, 8.00, 0.03 | tree_lod1/fir_bark | 131 | 3.001 |
| 0.04, 8.00, -0.01 | tree_lod1/fir_bark | 131 | 3.001 |
| 0.03, 8.00, -0.04 | tree_lod1/fir_bark | 131 | 3.001 |
| -0.05, 5.00, -0.08 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.09, 5.00, -0.02 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.08, 5.00, 0.05 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.02, 5.00, 0.09 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.05, 5.00, 0.08 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.09, 5.00, 0.02 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.08, 5.00, -0.05 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.02, 5.00, -0.09 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.03, 7.00, -0.05 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.06, 7.00, -0.02 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.05, 7.00, 0.03 | tree_lod1/fir_bark | 49 | 3.001 |
| -0.02, 7.00, 0.06 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.03, 7.00, 0.05 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.06, 7.00, 0.02 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.05, 7.00, -0.03 | tree_lod1/fir_bark | 49 | 3.001 |
| 0.02, 7.00, -0.06 | tree_lod1/fir_bark | 49 | 3.001 |
| 1.13, 0.36, -0.68 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.02, 0.36, -0.79 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.91, 0.36, -0.90 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.90, 0.19, -0.91 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.80, 0.36, -1.01 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.79, 0.19, -1.02 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.77, 0.36, -1.00 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.69, 0.36, -1.12 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.66, 0.36, -1.11 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.25, 0.20, -0.47 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.22, 0.40, -0.56 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.30, 0.40, -0.59 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.34, 0.40, -0.50 | tree_lod1/wood_planks | 69 | 0.588 |
| 0.46, 0.19, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.46, 0.36, -1.25 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.32, 0.36, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |

(180 more in the JSON)

## nonmanifold (warn, 32)

| at | part | uses |
|---|---|---|
| 1.13, 0.57, -0.47 | tree_lod1/wood_planks | 4 |
| 0.47, 0.57, -1.13 | tree_lod1/wood_planks | 4 |
| 0.51, 0.55, -1.23 | tree_lod1/wood_planks | 4 |
| 0.55, 0.57, -1.32 | tree_lod1/wood_planks | 4 |
| 1.32, 0.57, -0.55 | tree_lod1/wood_planks | 4 |
| 1.23, 0.55, -0.51 | tree_lod1/wood_planks | 4 |
| 1.23, 0.58, -0.51 | tree_lod1/wood_planks | 4 |
| -0.47, 0.57, -1.13 | tree_lod1/wood_planks | 4 |
| -0.51, 0.55, -1.23 | tree_lod1/wood_planks | 4 |
| -0.55, 0.57, -1.32 | tree_lod1/wood_planks | 4 |
| 0.51, 0.58, -1.23 | tree_lod1/wood_planks | 4 |
| -1.13, 0.57, -0.47 | tree_lod1/wood_planks | 4 |
| -1.23, 0.55, -0.51 | tree_lod1/wood_planks | 4 |
| -1.32, 0.57, -0.55 | tree_lod1/wood_planks | 4 |
| -0.51, 0.58, -1.23 | tree_lod1/wood_planks | 4 |
| -1.13, 0.57, 0.47 | tree_lod1/wood_planks | 4 |
| -1.23, 0.55, 0.51 | tree_lod1/wood_planks | 4 |
| -1.32, 0.57, 0.55 | tree_lod1/wood_planks | 4 |
| -1.23, 0.58, -0.51 | tree_lod1/wood_planks | 4 |
| -0.47, 0.57, 1.13 | tree_lod1/wood_planks | 4 |
| -0.51, 0.55, 1.23 | tree_lod1/wood_planks | 4 |
| -0.55, 0.57, 1.32 | tree_lod1/wood_planks | 4 |
| -1.23, 0.58, 0.51 | tree_lod1/wood_planks | 4 |
| 0.47, 0.57, 1.13 | tree_lod1/wood_planks | 4 |
| 0.51, 0.55, 1.23 | tree_lod1/wood_planks | 4 |
| 0.55, 0.57, 1.32 | tree_lod1/wood_planks | 4 |
| -0.51, 0.58, 1.23 | tree_lod1/wood_planks | 4 |
| 1.13, 0.57, 0.47 | tree_lod1/wood_planks | 4 |
| 1.23, 0.55, 0.51 | tree_lod1/wood_planks | 4 |
| 1.32, 0.57, 0.55 | tree_lod1/wood_planks | 4 |
| 0.51, 0.58, 1.23 | tree_lod1/wood_planks | 4 |
| 1.23, 0.58, 0.51 | tree_lod1/wood_planks | 4 |

## seam (info, 2769)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.34, 9.15, 0.11 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.98 | 57 | 13.5 |
| -0.43, 8.83, 0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.87 | 54 | 12.2 |
| -0.34, 2.38, -0.65 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.95 | 50 | 14.1 |
| -0.22, 8.05, -0.27 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.27 | 48 | 13 |
| 0.17, 9.14, 0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.83 | 48 | 25.2 |
| 0.48, 4.33, 0.22 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.27 | 45 | 12 |
| -0.25, 8.92, -0.36 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.87 | 44 | 13 |
| -0.23, 9.15, 0.04 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.86 | 44 | 21.2 |
| -0.17, 8.84, 0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.94 | 43 | 16.4 |
| -0.87, 2.07, -0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.09 | 42 | 12.2 |
| -0.11, 9.17, -0.13 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.77 | 42 | 29.9 |
| -0.68, 1.08, 0.38 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.62 | 41 | 19.5 |
| 1.16, 1.53, -0.35 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.53 | 41 | 13.8 |
| 0.43, 3.48, 0.48 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.78 | 41 | 12.1 |
| 0.10, 8.85, 0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.92 | 41 | 15.5 |
| -0.78, 1.26, 0.28 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.77 | 40 | 13.3 |
| -0.51, 8.24, -0.35 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.86 | 40 | 12.9 |
| -0.22, 8.33, 0.55 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.82 | 40 | 13.8 |
| 0.26, 9.17, -0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.78 | 40 | 24.4 |
| 0.07, 9.11, -0.27 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.79 | 40 | 19.8 |
| 0.29, 0.83, -1.25 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.8 | 38 | 14.8 |
| -0.45, 7.74, 0.51 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.9 | 38 | 16.6 |
| 0.19, 7.77, 0.33 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.2 | 38 | 12.8 |
| 0.17, 8.57, 0.47 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.73 | 38 | 12.1 |
| -1.66, 2.94, 0.34 | tree_lod1/fir_needles + tree_lod1/bauble | 0.97 | 37 | 21.1 |
| -0.70, 5.77, -0.45 | tree_lod1/fir_needles + tree_lod1/bauble | 0.94 | 37 | 35.4 |
| -0.43, 7.44, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.36 | 37 | 12.9 |
| 0.27, 8.08, -0.29 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.06 | 37 | 15.8 |
| -0.10, 9.13, 0.24 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.71 | 37 | 24.4 |
| 0.14, 1.26, -0.12 | tree_lod1/fir_needles + tree_lod1/fir_needles | 4.13 | 36 | 13.7 |
| -0.47, 8.09, 0.49 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.74 | 36 | 14.1 |
| 0.29, 8.33, 0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.91 | 36 | 13.6 |
| -0.24, 8.91, -0.05 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.72 | 36 | 22.2 |
| 0.08, 9.18, -0.27 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.58 | 36 | 12.7 |
| 0.92, 1.36, -0.12 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.18 | 35 | 14.2 |
| -0.94, 3.18, -0.23 | tree_lod1/fir_needles + tree_lod1/bauble | 1.24 | 35 | 18.4 |
| -1.23, 3.86, -1.28 | tree_lod1/fir_needles + tree_lod1/bauble | 1.4 | 35 | 27 |
| -0.94, 6.58, -0.01 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.87 | 35 | 13.4 |
| -0.68, 7.10, 0.47 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.95 | 35 | 13.1 |
| 0.14, 7.74, 0.70 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.82 | 35 | 19.2 |

(2729 more in the JSON)

## opening (info, 16)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.55, 0.00, -1.21 | tree_lod1/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| 0.47, 0.00, -1.25 | tree_lod1/wood_planks | 0 + 0 + -1 | 1.034 |
| -0.55, 0.00, -1.21 | tree_lod1/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.00, -0.47 | tree_lod1/wood_planks | -1 + 0 + 0 | 1.034 |
| -1.21, 0.00, 0.55 | tree_lod1/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.47, 0.00, 1.25 | tree_lod1/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.55, 0.00, 1.21 | tree_lod1/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.00, -0.47 | tree_lod1/wood_planks | 1 + 0 + 0 | 1.034 |
| 1.21, 0.48, -0.55 | tree_lod1/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| 0.47, 0.48, -1.25 | tree_lod1/wood_planks | 0 + 0 + -1 | 1.034 |
| -0.55, 0.48, -1.21 | tree_lod1/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.48, -0.47 | tree_lod1/wood_planks | -1 + 0 + 0 | 1.034 |
| -1.21, 0.48, 0.55 | tree_lod1/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.47, 0.48, 1.25 | tree_lod1/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.55, 0.48, 1.21 | tree_lod1/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.48, -0.47 | tree_lod1/wood_planks | 1 + 0 + 0 | 1.034 |

## backtoback (info, 193)

| at | parts | area |
|---|---|---|
| 0.08, 5.77, 0.01 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.00007 |
| -1.55, 0.94, 0.25 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00344 |
| -1.49, 1.15, -0.18 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00202 |
| 0.07, 2.05, 0.74 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01639 |
| 0.65, 4.27, 0.38 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01872 |
| -1.53, 0.95, 0.29 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00981 |
| -1.64, 1.10, -0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00878 |
| -0.30, 4.03, -0.20 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01556 |
| -0.74, 5.85, -0.35 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| -0.76, 5.86, -0.37 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| -0.73, 5.86, -0.34 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| 1.42, 2.55, 0.24 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00079 |
| 0.56, 1.98, 1.41 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00026 |
| 0.54, 1.99, 1.39 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00026 |
| 0.57, 1.99, 1.42 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00026 |
| 0.86, 1.71, -1.28 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| 0.84, 1.72, -1.29 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| 0.87, 1.72, -1.27 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00025 |
| 0.01, 4.93, -0.92 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00079 |
| -1.38, 2.22, 1.32 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| -1.40, 2.23, 1.30 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| -1.37, 2.23, 1.33 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| 0.25, 2.68, 1.76 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00032 |
| 0.27, 2.69, 1.74 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00032 |
| 0.24, 2.69, 1.77 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00032 |
| 1.87, 1.32, 0.03 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00038 |
| 1.84, 1.33, 0.01 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00038 |
| 1.88, 1.33, 0.04 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00038 |
| 0.90, 7.15, 0.19 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00095 |
| 0.01, 8.72, 0.45 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00083 |
| -0.36, 2.54, -1.63 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00024 |
| -0.38, 2.55, -1.65 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00024 |
| -0.35, 2.55, -1.63 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00024 |
| 1.92, 1.52, 0.64 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| 1.90, 1.53, 0.62 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| 1.93, 1.53, 0.65 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| -1.14, 2.96, 1.76 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00035 |
| -1.16, 2.97, 1.74 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00035 |
| -1.13, 2.97, 1.77 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00035 |
| -0.14, 2.98, -1.05 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00046 |

(153 more in the JSON)
