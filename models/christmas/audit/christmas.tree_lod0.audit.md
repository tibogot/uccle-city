# Mesh audit: christmas tree_lod0 (needle-vs-needle overlaps exempt: 101930)

135,192 triangles, 135,804 welded vertices, 111,104 open edges, 2,664,718 rays, 24630 ms.

**0 blocking**, 6838 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 6180 |
| nonmanifold | warn | 32 |
| seam | info | 21548 |
| opening | info | 15 |
| backtoback | info | 662 |

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

## seam (info, 21548)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.48, -0.16 | tree_lod0/fir_bark + tree_lod0/mulch | 1.04 | 26 | 89.2 |
| -0.03, 1.35, -0.15 | tree_lod0/fir_bark + tree_lod0/fir_needles | 0.96 | 24 | 89.2 |
| 1.96, 2.80, 0.26 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| 0.15, 7.54, -0.65 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 1.35, 1.72, -0.57 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -1.78, 1.48, -0.87 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 0.38, 5.47, 1.14 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 1.74, 2.46, -0.62 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| 0.32, 6.00, -0.90 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| -0.31, 2.89, -1.41 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -0.72, 1.93, 1.56 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -0.95, 3.17, 1.20 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 0.17, 3.24, 1.23 | tree_lod0/bauble + tree_lod0/gold_metal | 0.18 | 24 | 78.5 |
| -1.01, 3.46, -0.23 | tree_lod0/bauble + tree_lod0/gold_metal | 0.19 | 24 | 78.5 |
| 0.57, 8.47, 0.23 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -1.16, 2.47, -1.14 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 2.10, 1.75, 1.35 | tree_lod0/bauble + tree_lod0/gold_metal | 0.2 | 24 | 78.5 |
| -1.39, 1.35, 1.34 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 0.57, 3.40, -0.90 | tree_lod0/bauble + tree_lod0/gold_metal | 0.18 | 24 | 78.5 |
| -0.59, 8.40, 0.00 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 78.5 |
| 0.27, 6.70, 0.76 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -1.97, 2.98, 0.30 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| -1.43, 2.53, 0.98 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| -0.20, 3.05, -0.97 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -1.55, 4.83, 0.05 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| -0.49, 1.73, -2.35 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 78.5 |
| 0.73, 6.92, -0.40 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 78.5 |
| -1.08, 4.62, -0.78 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| -0.84, 5.54, 0.29 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 0.62, 7.78, -0.21 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| -0.31, 1.26, -1.40 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 0.27, 2.77, 1.52 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| -0.47, 7.87, 0.26 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 78.5 |
| -0.82, 7.46, 0.11 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| 0.63, 4.32, 0.95 | tree_lod0/bauble + tree_lod0/gold_metal | 0.14 | 24 | 78.5 |
| 1.05, 2.81, 0.47 | tree_lod0/bauble + tree_lod0/gold_metal | 0.17 | 24 | 78.5 |
| 1.17, 3.78, 0.61 | tree_lod0/bauble + tree_lod0/gold_metal | 0.18 | 24 | 78.5 |
| 1.19, 2.32, -1.01 | tree_lod0/bauble + tree_lod0/gold_metal | 0.16 | 24 | 78.5 |
| 1.43, 1.48, 1.51 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |
| 0.75, 2.61, 1.77 | tree_lod0/bauble + tree_lod0/gold_metal | 0.15 | 24 | 78.5 |

(21508 more in the JSON)

## opening (info, 15)

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
| -0.77, 0.48, 0.99 | tree_lod0/wood_planks | -0.71 + 0 + 0.71 | 1.034 |
| 0.77, 0.48, 0.99 | tree_lod0/wood_planks | 0.71 + 0 + 0.71 | 1.034 |
| 1.25, 0.48, 0.47 | tree_lod0/wood_planks | 1 + 0 + 0 | 1.034 |

## backtoback (info, 662)

| at | parts | area |
|---|---|---|
| -1.20, 0.65, -1.20 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00218 |
| -0.88, 0.93, -0.25 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0007 |
| -1.39, 0.74, -0.41 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00219 |
| -0.88, 0.94, 0.42 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00063 |
| -1.56, 0.67, 0.74 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00082 |
| -1.66, 0.51, 1.30 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0014 |
| -0.43, 0.57, 1.68 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00119 |
| 0.39, 0.57, 2.00 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00086 |
| 0.44, 0.47, 2.30 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00071 |
| 2.51, 0.32, 0.18 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00119 |
| 0.58, 1.06, -0.08 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00085 |
| 1.17, 0.88, -0.15 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00061 |
| 0.33, 1.10, -0.51 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0006 |
| 0.29, 0.55, -2.08 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00168 |
| 0.32, 0.47, -2.30 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00096 |
| -0.45, 0.61, -1.76 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00076 |
| -0.34, 0.77, -1.33 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00014 |
| 0.13, 0.97, 1.59 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00027 |
| 0.19, 0.67, 2.38 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00079 |
| 1.46, 0.80, 1.82 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00146 |
| 0.95, 1.13, 0.68 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00018 |
| 1.13, 1.05, 0.80 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00019 |
| 1.80, 0.78, 1.27 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00007 |
| 2.27, 0.72, 0.18 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00054 |
| 0.44, 1.15, -0.80 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00088 |
| 0.66, 1.01, -1.20 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00013 |
| -0.97, 0.98, -1.25 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.0003 |
| -1.35, 1.02, -0.71 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00026 |
| -1.96, 0.78, -1.04 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00025 |
| -1.09, 1.12, 0.13 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00144 |
| -0.74, 1.22, 0.09 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00009 |
| -1.55, 0.98, 0.18 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00019 |
| -1.34, 0.96, 0.71 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00222 |
| -1.40, 0.94, 0.74 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00019 |
| -0.66, 1.02, 1.34 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00218 |
| 0.45, 1.43, -0.70 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00288 |
| 0.93, 1.16, -1.47 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00141 |
| 0.07, 1.16, -1.83 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00085 |
| -0.41, 1.51, -0.71 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00273 |
| -0.32, 1.64, -0.27 | tree_lod0/fir_bark + tree_lod0/fir_cards | 0.00212 |

(622 more in the JSON)
