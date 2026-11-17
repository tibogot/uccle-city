# Mesh audit: christmas tree_lod1 (needle-vs-needle overlaps exempt: 1347)

40,616 triangles, 23,785 welded vertices, 24 open edges, 4,608 rays, 1377 ms.

**0 blocking**, 311 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 200 |
| nonmanifold | warn | 32 |
| seam | info | 4294 |
| opening | info | 16 |
| backtoback | info | 197 |

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
| 0.91, 0.36, -0.90 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.77, 0.36, -1.00 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.69, 0.36, -1.12 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.66, 0.36, -1.11 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.58, 0.36, -1.23 | tree_lod1/wood_planks | 94 | 0.532 |
| 1.25, 0.20, -0.47 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.22, 0.40, -0.56 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.30, 0.40, -0.59 | tree_lod1/wood_planks | 69 | 0.588 |
| 1.34, 0.40, -0.50 | tree_lod1/wood_planks | 69 | 0.588 |
| 0.46, 0.19, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.46, 0.36, -1.25 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.32, 0.36, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.30, 0.36, -1.25 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.15, 0.19, -1.28 | tree_lod1/wood_planks | 94 | 0.532 |
| 0.15, 0.36, -1.25 | tree_lod1/wood_planks | 94 | 0.532 |

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

## seam (info, 4294)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.12, 8.57, 0.53 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.47 | 60 | 16.9 |
| -0.46, 8.83, -0.04 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.58 | 60 | 12.2 |
| -0.34, 8.96, -0.37 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.37 | 59 | 12.6 |
| -0.27, 2.38, -0.76 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.94 | 56 | 12.1 |
| 0.24, 8.12, -0.27 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.73 | 52 | 12.8 |
| 0.16, 8.02, 0.44 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.68 | 52 | 15 |
| -0.43, 9.16, 0.20 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.1 | 52 | 12.7 |
| -0.43, 7.48, -0.08 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.19 | 51 | 15 |
| 0.47, 8.87, 0.30 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.24 | 50 | 13.5 |
| -0.08, 8.82, 0.20 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.18 | 49 | 17.7 |
| 0.11, 8.54, 0.25 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.31 | 48 | 26.1 |
| -0.25, 8.02, -0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.33 | 47 | 14.1 |
| 0.38, 7.97, -0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.72 | 46 | 18.3 |
| -0.50, 8.26, -0.45 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.55 | 46 | 12.1 |
| 0.34, 8.60, 0.09 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.31 | 46 | 24.8 |
| -0.13, 8.87, -0.32 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.31 | 46 | 25.7 |
| -0.28, 8.35, 0.53 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.32 | 45 | 15.7 |
| 0.16, 8.87, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.32 | 45 | 13.4 |
| -0.15, 6.96, -0.48 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.2 | 44 | 14.7 |
| 0.33, 7.72, 0.24 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.87 | 44 | 12.9 |
| 0.26, 7.71, -0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.48 | 44 | 22.7 |
| -0.22, 9.19, -0.14 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.79 | 44 | 35.5 |
| 0.58, 1.21, 0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 5.97 | 43 | 12.1 |
| 0.04, 4.35, 0.28 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.48 | 43 | 14.9 |
| -1.07, 6.20, -0.78 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.58 | 43 | 13.2 |
| -0.22, 6.89, 0.41 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.84 | 43 | 12.5 |
| -0.18, 8.04, -0.69 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.32 | 43 | 12.6 |
| -0.92, 1.04, 0.48 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.43 | 42 | 19.5 |
| -0.04, 1.51, -0.37 | tree_lod1/fir_needles + tree_lod1/fir_needles | 4.35 | 42 | 12.6 |
| -0.49, 6.31, -0.19 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.65 | 42 | 12.4 |
| -0.23, 7.47, -0.39 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.34 | 42 | 14.6 |
| -0.28, 8.23, -0.20 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.59 | 42 | 18.9 |
| 0.37, 8.31, 0.03 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.39 | 42 | 20.7 |
| 0.40, 3.53, 0.54 | tree_lod1/fir_needles + tree_lod1/fir_needles | 3.36 | 41 | 13.2 |
| 0.78, 4.86, -1.10 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.68 | 41 | 15.9 |
| -0.33, 6.63, 0.56 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.8 | 41 | 12.6 |
| -0.75, 7.52, 0.33 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.33 | 41 | 13.2 |
| -0.55, 7.76, 0.52 | tree_lod1/fir_needles + tree_lod1/fir_needles | 1.4 | 41 | 13 |
| 0.30, 0.77, -1.33 | tree_lod1/fir_needles + tree_lod1/fir_needles | 2.48 | 40 | 15.2 |
| 0.71, 3.02, -0.01 | tree_lod1/fir_needles + tree_lod1/fir_needles | 4.23 | 40 | 14 |

(4254 more in the JSON)

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

## backtoback (info, 197)

| at | parts | area |
|---|---|---|
| 0.76, 1.16, 0.16 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00231 |
| 0.73, 0.85, -1.71 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00469 |
| -0.06, 1.16, 0.68 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.0028 |
| 0.04, 1.00, 1.19 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.04502 |
| 0.76, 1.13, 1.40 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00774 |
| 0.12, 1.30, -1.01 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.03526 |
| -0.19, 1.56, 0.05 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00481 |
| -0.77, 1.13, 0.11 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.03013 |
| 0.11, 1.42, -0.58 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00824 |
| -0.11, 1.74, -0.42 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.02495 |
| -0.28, 1.66, -0.69 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00073 |
| -0.24, 1.68, -0.64 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.0037 |
| -0.40, 1.58, -1.00 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.05574 |
| -0.31, 1.64, -0.76 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00221 |
| -1.14, 1.20, -0.89 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.05765 |
| -0.32, 1.52, 0.05 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01176 |
| -1.37, 1.17, -0.11 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01997 |
| -0.54, 1.70, 0.37 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00647 |
| -0.55, 1.41, 0.54 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.04481 |
| 0.60, 1.28, 1.00 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.03425 |
| 0.67, 1.19, 1.26 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00771 |
| -1.24, 1.76, -0.15 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01425 |
| -0.55, 1.70, 0.27 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00904 |
| -0.65, 1.67, 0.39 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00377 |
| 0.22, 1.81, 1.00 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.04177 |
| -0.19, 1.67, -0.64 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00198 |
| -0.26, 1.65, -0.71 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00353 |
| 1.11, 2.01, -0.84 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01175 |
| 1.25, 1.95, -0.94 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.03936 |
| 0.58, 2.07, 1.46 | tree_lod1/fir_needles + tree_lod1/bauble | 0.00603 |
| -1.68, 1.96, -0.04 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.03749 |
| 0.79, 2.33, -1.28 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00731 |
| -1.70, 2.82, -0.72 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00919 |
| -1.57, 2.84, -0.67 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01827 |
| -0.76, 2.94, 0.26 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01573 |
| -0.59, 2.97, 0.68 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.04632 |
| -1.12, 2.75, 1.29 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00197 |
| 0.35, 2.71, 0.71 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00259 |
| -0.74, 2.91, 0.81 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.01023 |
| -0.78, 2.89, 0.96 | tree_lod1/fir_needles + tree_lod1/fir_needles | 0.00583 |

(157 more in the JSON)
