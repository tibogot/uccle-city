# Mesh audit: christmas tree_lod0 (needle-vs-needle overlaps exempt: 3594)

161,560 triangles, 85,427 welded vertices, 24 open edges, 4,608 rays, 5416 ms.

**0 blocking**, 857 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 508 |
| nonmanifold | warn | 32 |
| seam | info | 6471 |
| opening | info | 16 |
| backtoback | info | 144 |

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

## seam (info, 6471)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.16, 9.13, -0.24 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.16 | 106 | 16.3 |
| 0.05, 9.19, -0.44 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.06 | 105 | 20.8 |
| -0.22, 9.19, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.09 | 97 | 15.9 |
| 0.39, 9.22, 0.17 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.04 | 96 | 13.6 |
| 0.43, 8.01, 0.48 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.56 | 95 | 12.2 |
| 0.33, 7.96, -0.58 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.81 | 93 | 12.1 |
| -0.33, 9.20, -0.16 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.04 | 93 | 19.5 |
| 0.21, 8.64, 0.52 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.51 | 92 | 12.9 |
| -0.21, 9.17, 0.18 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.96 | 90 | 15.8 |
| -0.71, 8.14, -0.17 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.72 | 89 | 12 |
| 0.16, 8.91, -0.45 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.33 | 88 | 12 |
| -0.54, 8.16, -0.33 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.57 | 86 | 13 |
| -0.55, 7.76, 0.51 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.73 | 85 | 12.1 |
| 0.38, 8.90, 0.27 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.32 | 85 | 13.3 |
| 0.05, 9.22, 0.29 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.96 | 85 | 12.5 |
| -0.47, 8.77, 0.03 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.51 | 84 | 13.2 |
| 0.35, 1.27, 0.17 | tree_lod0/fir_needles + tree_lod0/fir_needles | 5.99 | 83 | 12.3 |
| 0.11, 1.77, -0.32 | tree_lod0/fir_needles + tree_lod0/fir_needles | 5.08 | 83 | 12.2 |
| -0.25, 9.18, 0.12 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1 | 83 | 15.8 |
| -0.73, 7.74, -0.10 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.64 | 82 | 12.4 |
| 0.39, 7.44, 0.69 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.87 | 81 | 12.5 |
| 0.35, 9.04, -0.23 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.14 | 81 | 14.7 |
| -0.08, 3.03, -0.27 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.64 | 78 | 13.3 |
| 0.66, 8.38, -0.04 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.47 | 78 | 12 |
| 0.02, 4.35, 0.29 | tree_lod0/fir_needles + tree_lod0/fir_needles | 3.57 | 77 | 13 |
| -0.09, 8.78, 0.50 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.3 | 77 | 13.9 |
| 0.16, 3.08, -0.23 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.89 | 76 | 13 |
| -0.28, 8.86, 0.14 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.87 | 76 | 12.2 |
| -0.20, 8.23, 0.65 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.42 | 75 | 12.9 |
| 0.12, 9.22, 0.39 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.86 | 75 | 15.9 |
| -0.10, 1.45, -0.28 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.67 | 74 | 14.1 |
| 0.10, 2.53, -0.26 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.38 | 74 | 17.4 |
| 0.10, 8.84, -0.00 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.43 | 74 | 12.5 |
| 0.00, 1.25, 0.34 | tree_lod0/fir_needles + tree_lod0/fir_needles | 5.62 | 73 | 12.5 |
| 0.01, 1.82, -0.22 | tree_lod0/fir_needles + tree_lod0/fir_needles | 5.35 | 73 | 14.7 |
| 0.23, 1.74, 0.45 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.91 | 73 | 9.7 |
| -0.13, 2.32, 0.14 | tree_lod0/fir_needles + tree_lod0/fir_needles | 5.07 | 73 | 12.7 |
| 0.29, 3.55, -0.03 | tree_lod0/fir_needles + tree_lod0/fir_needles | 4.13 | 73 | 16.1 |
| -0.08, 6.37, 0.06 | tree_lod0/fir_needles + tree_lod0/fir_needles | 2.79 | 73 | 12.8 |
| 0.52, 8.47, 0.01 | tree_lod0/fir_needles + tree_lod0/fir_needles | 1.14 | 73 | 15.3 |

(6431 more in the JSON)

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

## backtoback (info, 144)

| at | parts | area |
|---|---|---|
| -0.04, 5.73, -0.07 | tree_lod0/fir_bark + tree_lod0/fir_needles | 0.00005 |
| -0.24, 1.35, -1.03 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01434 |
| -1.34, 0.97, 0.40 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01989 |
| -0.30, 1.18, 0.57 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00567 |
| 0.69, 1.17, 0.34 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01219 |
| 1.73, 0.94, -0.21 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00517 |
| 1.42, 0.93, 0.13 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00157 |
| 1.55, 0.93, -0.04 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00376 |
| -0.01, 1.08, -1.23 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00027 |
| -0.46, 1.14, -0.64 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00065 |
| -0.13, 1.09, 1.72 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00302 |
| 0.61, 1.06, 0.94 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00121 |
| 0.65, 1.35, 0.36 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02246 |
| -0.11, 1.36, -0.83 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01988 |
| -0.63, 1.35, -0.61 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02422 |
| -0.52, 1.43, -0.59 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00461 |
| -0.42, 1.45, -0.53 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00982 |
| -0.85, 1.34, -0.41 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.02128 |
| -0.73, 1.35, -0.37 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00356 |
| -2.23, 0.96, 0.20 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00105 |
| -0.29, 1.24, 1.25 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01817 |
| 0.62, 1.30, -0.91 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00707 |
| 0.29, 1.65, -0.67 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00422 |
| 0.28, 1.66, -0.62 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00084 |
| -1.64, 1.23, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00196 |
| -1.69, 0.90, 1.45 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00122 |
| -1.45, 1.36, 0.62 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00075 |
| 0.57, 1.32, 1.63 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00086 |
| 0.84, 1.26, 1.07 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01023 |
| 1.47, 1.40, 0.51 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01033 |
| 1.93, 1.18, -0.54 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.0009 |
| -0.83, 1.89, 0.02 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00342 |
| 1.49, 1.55, 1.09 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00326 |
| 1.17, 1.43, -1.03 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00334 |
| 0.09, 2.04, -0.24 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.0104 |
| -0.06, 1.71, -1.47 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.01187 |
| -0.76, 1.85, -0.15 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00261 |
| 0.79, 2.05, -1.34 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00304 |
| 0.52, 2.01, -1.56 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00841 |
| 0.82, 2.04, -1.40 | tree_lod0/fir_needles + tree_lod0/fir_needles | 0.00222 |

(104 more in the JSON)
