# Mesh audit: christmas tree_lod0 (needle-vs-needle overlaps exempt: 3619)

183,424 triangles, 96,381 welded vertices, 24 open edges, 4,608 rays, 6884 ms.

**0 blocking**, 876 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 508 |
| nonmanifold | warn | 32 |
| seam | info | 6863 |
| opening | info | 16 |
| backtoback | info | 137 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 508)

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
| -0.05, 2.10, -0.13 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.11, 2.10, -0.09 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.14, 2.10, -0.02 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.13, 2.10, 0.05 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.09, 2.10, 0.11 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.02, 2.10, 0.14 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.05, 2.10, 0.13 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.11, 2.10, 0.09 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.14, 2.10, 0.02 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.13, 2.10, -0.05 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.09, 2.10, -0.11 | tree_lod0/fir_bark | 40 | 2.701 |
| 0.02, 2.10, -0.14 | tree_lod0/fir_bark | 40 | 2.701 |
| -0.04, 4.00, -0.10 | tree_lod0/fir_bark | 45 | 3.001 |
| -0.07, 5.00, -0.06 | tree_lod0/fir_bark | 72 | 3.001 |
| -0.11, 4.00, -0.02 | tree_lod0/fir_bark | 45 | 3.001 |
| -0.10, 4.00, 0.04 | tree_lod0/fir_bark | 45 | 3.001 |

(468 more in the JSON)

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

## seam (info, 6863)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.35, 9.17, -0.25 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.56 | 154 | 13.6 |
| 0.53, 8.86, 0.02 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.9 | 135 | 13.5 |
| -0.33, 9.15, 0.01 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.57 | 134 | 12.7 |
| 0.17, 9.14, -0.24 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.75 | 134 | 15.7 |
| 0.47, 8.57, 0.10 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.13 | 132 | 12.9 |
| -0.19, 9.16, 0.13 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.6 | 131 | 14 |
| -0.21, 9.17, 0.20 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.45 | 131 | 16.3 |
| -0.02, 9.21, 0.39 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.72 | 131 | 14.9 |
| 0.27, 9.18, 0.26 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.59 | 131 | 12 |
| 0.04, 7.77, -0.61 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.54 | 128 | 12.9 |
| -0.17, 8.94, -0.39 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.77 | 126 | 13.6 |
| 0.41, 8.57, -0.47 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2 | 125 | 12.4 |
| 0.22, 1.28, -0.25 | tree_lod0/fir_needles + tree_lod0/fir_needles | 8.11 | 124 | 12.3 |
| 0.67, 8.09, -0.22 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.56 | 124 | 12.7 |
| 0.17, 3.08, -0.20 | tree_lod0/fir_needles + tree_lod0/fir_needles | 6.24 | 122 | 12.1 |
| 0.36, 8.00, 0.42 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.37 | 122 | 12.6 |
| 0.36, 9.21, 0.14 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.19 | 122 | 22.4 |
| -0.50, 8.59, -0.07 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.95 | 121 | 13.4 |
| 0.09, 9.21, 0.06 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.11 | 119 | 7.2 |
| 0.08, 1.78, -0.32 | tree_lod0/fir_needles + tree_lod0/fir_needles | 6.27 | 118 | 12 |
| -0.14, 9.17, -0.28 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.67 | 118 | 15.4 |
| 0.44, 8.37, -0.41 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.48 | 117 | 13.1 |
| -0.17, 8.54, -0.52 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.68 | 116 | 12.9 |
| -0.20, 8.87, 0.46 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.88 | 114 | 15.7 |
| -0.81, 7.50, 0.30 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.46 | 113 | 12.3 |
| 0.59, 8.26, 0.04 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.1 | 113 | 12.3 |
| 0.38, 9.12, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.62 | 112 | 16.1 |
| -0.12, 1.27, 0.34 | tree_lod0/fir_needles + tree_lod0/fir_needles | 6.84 | 111 | 13 |
| 0.43, 8.06, -0.54 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.39 | 111 | 14.1 |
| 0.12, 8.85, 0.06 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.89 | 111 | 13 |
| 0.06, 9.15, -0.09 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.1 | 110 | 42.8 |
| 0.93, 7.14, -0.32 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.27 | 109 | 12.5 |
| 0.67, 7.72, 0.34 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.34 | 109 | 12.6 |
| -0.13, 8.18, -0.60 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.04 | 109 | 15 |
| -0.38, 8.54, 0.36 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.04 | 109 | 13.7 |
| 0.26, 8.83, -0.30 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.6 | 109 | 12.4 |
| -0.39, 8.86, 0.13 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.4 | 108 | 18.6 |
| 0.36, 7.40, 0.76 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.47 | 107 | 12.2 |
| -0.55, 7.77, 0.54 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.26 | 107 | 12.2 |
| -0.70, 8.11, -0.28 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.58 | 107 | 13 |

(6823 more in the JSON)

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
| 1.21, 0.48, -0.55 | tree_lod0/wood_planks | 0.71 + 0 + -0.71 | 1.034 |
| 0.47, 0.48, -1.25 | tree_lod0/wood_planks | 0 + 0 + -1 | 1.034 |
| -0.55, 0.48, -1.21 | tree_lod0/wood_planks | -0.71 + 0 + -0.71 | 1.034 |
| -1.25, 0.48, -0.47 | tree_lod0/wood_planks | -1 + 0 + 0 | 1.034 |
| -1.21, 0.48, 0.55 | tree_lod0/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| -0.47, 0.48, 1.25 | tree_lod0/wood_planks | 0 + 0 + 1 | 1.034 |
| 0.55, 0.48, 1.21 | tree_lod0/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.48, -0.47 | tree_lod0/wood_planks | 1 + 0 + 0 | 1.034 |

## backtoback (info, 137)

| at | parts | area |
|---|---|---|
| -0.04, 5.73, -0.07 | tree_lod0/fir_bark + tree_lod0/fir_needles | 0.00005 |
| 0.28, 9.16, -0.02 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00113 |
| 0.14, 1.35, -0.92 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02547 |
| 0.19, 1.35, -0.82 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02526 |
| 0.05, 1.35, -0.94 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02359 |
| 0.23, 1.35, -0.75 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.0051 |
| 0.38, 1.35, -0.68 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01682 |
| 0.45, 1.35, -0.74 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02639 |
| 0.48, 1.35, -0.60 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00198 |
| -0.80, 1.05, -0.32 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00707 |
| -1.74, 0.38, -2.19 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00879 |
| -0.99, 0.95, 0.76 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00571 |
| 0.92, 1.05, 1.26 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00081 |
| 0.57, 1.09, 0.84 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02767 |
| 1.70, 0.99, -0.47 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00222 |
| 0.09, 1.17, -0.82 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00206 |
| 0.28, 1.32, 1.07 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00286 |
| 0.28, 1.33, 1.04 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00113 |
| 0.35, 1.30, 1.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01041 |
| 1.30, 1.22, 0.45 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00087 |
| 1.95, 0.80, 0.16 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00065 |
| 0.12, 1.35, -0.74 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.0173 |
| 0.00, 1.07, -1.21 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00925 |
| -0.88, 1.08, 0.21 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01572 |
| -1.55, 0.74, 0.88 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00406 |
| -0.81, 1.01, 0.89 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00393 |
| -1.61, 0.92, 0.37 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01557 |
| 0.48, 1.44, -1.44 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00089 |
| 0.57, 1.40, -1.50 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00373 |
| 0.56, 1.41, -1.41 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01736 |
| -1.09, 1.34, -1.63 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00006 |
| -0.94, 1.55, 0.62 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00054 |
| 0.73, 1.24, 1.17 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00369 |
| 0.72, 1.65, 0.42 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01362 |
| 1.54, 1.18, 1.59 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00161 |
| 1.02, 1.62, -0.08 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.0187 |
| 0.41, 1.42, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00889 |
| -1.19, 1.75, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00923 |
| 1.18, 1.57, 0.96 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00487 |
| 1.43, 1.67, 0.71 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00822 |

(97 more in the JSON)
