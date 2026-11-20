# Mesh audit: christmas tree_lod1 (needle-vs-needle overlaps exempt: 9679)

36,572 triangles, 32,632 welded vertices, 19,974 open edges, 764,274 rays, 5401 ms.

**0 blocking**, 247 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 200 |
| nonmanifold | warn | 32 |
| seam | info | 6488 |
| opening | info | 15 |
| backtoback | info | 152 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 200)

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
| 1.23, 0.19, -0.58 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.13, 0.36, -0.68 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.02, 0.36, -0.79 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.01, 0.19, -0.80 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.99, 0.36, -0.78 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.91, 0.36, -0.90 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.90, 0.19, -0.91 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.88, 0.36, -0.89 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.80, 0.36, -1.01 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.58, 0.36, -1.23 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.25, 0.20, -0.47 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.22, 0.40, -0.56 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.30, 0.40, -0.59 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.34, 0.40, -0.50 | tree_lod1/wood_planks | 69 | 0.588 |
| 0.46, 0.19, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.32, 0.36, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |

(160 more in the JSON)

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

## seam (info, 6488)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.05, 9.46, -0.01 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.34 | 30 | 43.8 |
| 0.17, 1.24, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.19 | 30 | 27 |
| 0.16, 3.02, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.34 | 28 | 13.5 |
| -0.02, 2.95, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.7 | 28 | 13.6 |
| -0.13, 1.22, 0.18 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.79 | 26 | 26.7 |
| -0.15, 1.68, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.62 | 26 | 12.8 |
| -0.01, 2.79, -0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.65 | 25 | 12.5 |
| -1.13, 1.45, 0.20 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.88 | 24 | 20 |
| 0.01, 9.49, -0.00 | tree_lod1/fir_needles + tree_lod1/gold_metal | 0.11 | 24 | 51.9 |
| -0.01, 1.73, -0.18 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.5 | 24 | 13 |
| -0.08, 2.49, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.81 | 24 | 12.3 |
| 0.14, 3.27, -0.01 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.44 | 24 | 13.1 |
| -0.04, 1.49, 0.18 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.84 | 23 | 13.9 |
| -0.13, 3.51, 0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.88 | 23 | 20.4 |
| -0.05, 4.05, -0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.32 | 23 | 19.8 |
| 0.11, 7.47, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.63 | 23 | 19.2 |
| -0.81, 1.45, 0.84 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.84 | 22 | 22.4 |
| 0.07, 1.40, -0.22 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.95 | 22 | 31.4 |
| 0.07, 1.93, -0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.58 | 22 | 13.8 |
| 0.21, 3.52, 0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.92 | 22 | 32.5 |
| -0.06, 4.60, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.02 | 22 | 19.8 |
| -0.10, 5.77, -0.10 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.55 | 22 | 13.9 |
| 0.10, 7.16, -0.15 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.68 | 22 | 29.2 |
| -0.02, 7.75, -0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.53 | 22 | 32.1 |
| -0.01, 1.41, -0.15 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.6 | 21 | 21.1 |
| -0.11, 2.25, -0.07 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.5 | 21 | 38 |
| -0.12, 1.19, 0.08 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.59 | 21 | 49.8 |
| 0.39, 2.68, 0.95 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.71 | 21 | 64.7 |
| -0.10, 1.20, -0.21 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.48 | 21 | 13.9 |
| -0.17, 1.21, -0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.1 | 21 | 14.6 |
| -0.09, 1.21, -0.19 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.51 | 21 | 28.3 |
| -0.19, 1.40, 0.12 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.48 | 21 | 36.1 |
| 0.39, 1.64, 0.12 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.41 | 21 | 35.1 |
| 0.25, 3.74, 0.38 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.05 | 21 | 24.6 |
| -0.34, 4.32, 0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.22 | 21 | 21.6 |
| -0.27, 6.32, 0.17 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1 | 21 | 45.9 |
| 0.09, 8.03, -0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.58 | 21 | 31.8 |
| 0.11, 8.81, 0.00 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.42 | 21 | 34.1 |
| -0.14, 1.37, -0.04 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.6 | 20 | 51.4 |
| -0.13, 2.99, 0.00 | tree_lod1/fir_bark + tree_lod1/fir_needles | 0.46 | 20 | 35.7 |

(6448 more in the JSON)

## opening (info, 15)

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
| 0.99, 0.48, -0.77 | tree_lod1/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| -0.77, 0.48, -0.99 | tree_lod1/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.48, -0.15 | tree_lod1/wood_planks | -1 + 0 + 0 | 1.034 |
| -0.77, 0.48, 0.99 | tree_lod1/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.15, 0.48, 1.25 | tree_lod1/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.55, 0.48, 1.21 | tree_lod1/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.48, 0.15 | tree_lod1/wood_planks | 1 + 0 + 0 | 1.034 |

## backtoback (info, 152)

| at | parts | area |
|---|---|---|
| -0.11, 4.05, -0.12 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00126 |
| 0.30, 4.32, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00646 |
| -0.23, 5.40, 0.07 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00422 |
| 0.06, 3.96, -0.43 | tree_lod1/fir_needles + tree_lod1/fir_cards | 0.01271 |
| 0.01, 3.98, -0.39 | tree_lod1/fir_needles + tree_lod1/fir_cards | 0.00679 |
| -0.30, 4.58, -0.21 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01017 |
| -0.75, 5.86, -0.35 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00078 |
| 1.42, 2.55, 0.24 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00079 |
| 1.10, 5.67, -0.37 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00076 |
| -1.38, 2.22, 1.32 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| -1.40, 2.23, 1.30 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| -1.37, 2.23, 1.33 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| 1.46, 3.41, -0.47 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00034 |
| 1.44, 3.42, -0.49 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00034 |
| 1.47, 3.42, -0.46 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00034 |
| 0.01, 8.72, 0.45 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00083 |
| 0.35, 5.16, 1.34 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00023 |
| 0.33, 5.17, 1.32 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00023 |
| 0.36, 5.17, 1.35 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00023 |
| -0.95, 6.90, -0.21 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00086 |
| 1.92, 1.52, 0.64 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| 1.90, 1.53, 0.62 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| 1.93, 1.53, 0.65 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00029 |
| 2.40, 1.79, 0.07 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| 2.38, 1.80, 0.05 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| 2.42, 1.80, 0.08 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -0.31, 1.92, -1.89 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00081 |
| -0.20, 3.77, 1.12 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00074 |
| 0.39, 7.38, -0.47 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.0009 |
| -1.15, 1.43, -1.26 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -1.17, 1.45, -1.28 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -1.14, 1.45, -1.25 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -1.40, 2.16, -1.98 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -1.42, 2.17, -2.00 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| -1.39, 2.17, -1.96 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00039 |
| 1.10, 3.69, -0.87 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| 1.08, 3.70, -0.88 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| 1.11, 3.70, -0.86 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00028 |
| -1.01, 3.13, 1.21 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00022 |
| -1.03, 3.13, 1.19 | tree_lod1/gold_metal + tree_lod1/gold_metal | 0.00022 |

(112 more in the JSON)
