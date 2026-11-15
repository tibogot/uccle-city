# Mesh audit (before pack): publicart.monolithes_lod1

14,229 triangles, 7,361 welded vertices, 467 open edges, 73,248 rays, 544 ms.

**0 blocking**, 18 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 18 |
| seam | info | 13 |
| opening | info | 110 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 18)

| at | part | aspect | longest |
|---|---|---|---|
| -7.96, 3.15, 7.46 | monolithes_lod1/stone_blue | 48 | 0.98 |
| -8.03, 4.42, 7.20 | monolithes_lod1/stone_blue | 94 | 1.254 |
| -0.29, 0.12, 15.17 | monolithes_lod1/stone_blue | 119 | 0.585 |
| -10.60, 5.05, 10.62 | monolithes_lod1/stone_blue | 64 | 1.15 |
| -7.22, 5.48, 5.82 | monolithes_lod1/stone_blue | 1359 | 0.7 |
| -8.06, 6.08, 7.13 | monolithes_lod1/stone_blue | 98 | 0.648 |
| 0.71, 0.77, 13.75 | monolithes_lod1/stone_blue | 52 | 1.019 |
| -11.14, 5.12, 9.45 | monolithes_lod1/stone_blue | 108 | 0.311 |
| 7.02, 3.38, -12.34 | monolithes_lod1/stone_blue | 99 | 0.697 |
| -10.47, -0.02, 6.49 | monolithes_lod1/stone_blue | 91 | 0.56 |
| -6.82, 4.55, 10.62 | monolithes_lod1/stone_blue | 73 | 0.98 |
| 3.69, 1.07, -6.70 | monolithes_lod1/hedge_hornbeam | 84 | 1.175 |
| 12.18, 0.71, -7.90 | monolithes_lod1/hedge_hornbeam | 126 | 0.776 |
| -8.54, 0.98, -0.61 | monolithes_lod1/hedge_hornbeam | 154 | 0.798 |
| -7.14, 1.26, -0.60 | monolithes_lod1/hedge_hornbeam | 55 | 0.792 |
| -6.49, 0.47, -6.69 | monolithes_lod1/hedge_hornbeam | 49 | 0.838 |
| -6.06, 1.79, -6.73 | monolithes_lod1/hedge_hornbeam | 54 | 0.678 |
| 8.73, 0.43, -1.81 | monolithes_lod1/hedge_hornbeam | 127 | 0.846 |

## seam (info, 13)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 19.71, -0.04, -0.27 | monolithes_lod1/stone_kerb + monolithes_lod1/bed_planting | 123.91 | 660 | 87 |
| 0.98, 0.28, -0.69 | monolithes_lod1/bed_planting + monolithes_lod1/hedge_hornbeam | 63.15 | 398 | 43.9 |
| 1.53, 0.33, -6.72 | monolithes_lod1/bed_planting + monolithes_lod1/hedge_hornbeam | 56.07 | 394 | 36.4 |
| -11.72, 0.43, 2.34 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 14.45 | 117 | 81.4 |
| -0.00, 0.36, -17.43 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 14.33 | 110 | 80.2 |
| 0.12, 0.38, 11.73 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 14.56 | 108 | 80.9 |
| -9.95, 0.41, 8.90 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.44 | 61 | 81.1 |
| 9.86, 0.35, 4.32 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 4.92 | 59 | 78.3 |
| -7.05, 0.39, 5.84 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.51 | 55 | 85.1 |
| 6.38, 0.39, -14.54 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.51 | 55 | 86.5 |
| -7.10, 0.38, 9.27 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.31 | 53 | 80.9 |
| 1.13, 0.39, 9.42 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.17 | 52 | 84.6 |
| 7.30, 0.39, -11.27 | monolithes_lod1/stone_blue + monolithes_lod1/bed_planting | 5.13 | 47 | 84.8 |

## opening (info, 110)

| at | part | facing | edge_m |
|---|---|---|---|
| -7.15, -0.10, 5.91 | monolithes_lod1/stone_blue | -0.11 + -0.75 + -0.65 | 0.187 |
| -6.87, -0.10, 6.38 | monolithes_lod1/stone_blue | 0.74 + -0.64 + -0.2 | 0.165 |
| -6.75, -0.10, 7.11 | monolithes_lod1/stone_blue | 0.37 + -0.83 + 0.41 | 0.209 |
| -7.23, -0.12, 5.95 | monolithes_lod1/stone_blue | -0.2 + -0.76 + -0.62 | 0.979 |
| -8.16, -0.10, 6.65 | monolithes_lod1/stone_blue | -0.82 + -0.34 + 0.46 | 0.16 |
| -6.84, -0.12, 7.14 | monolithes_lod1/stone_blue | 0.17 + -0.84 + 0.52 | 0.98 |
| -8.12, -0.11, 6.73 | monolithes_lod1/stone_blue | -0.76 + -0.61 + 0.25 | 0.7 |
| 0.41, -0.10, 10.72 | monolithes_lod1/stone_blue | 0.14 + -0.34 + 0.93 | 0.277 |
| 0.14, -0.09, 10.76 | monolithes_lod1/stone_blue | -0.14 + -0.33 + 0.93 | 0.164 |
| 0.05, -0.11, 11.85 | monolithes_lod1/stone_blue | 0.06 + -0.85 + -0.52 | 0.165 |
| -0.04, -0.12, 11.87 | monolithes_lod1/stone_blue | -0.12 + -0.88 + -0.46 | 0.559 |
| -0.95, -0.10, 12.05 | monolithes_lod1/stone_blue | -0.37 + -0.91 + -0.18 | 0.131 |
| -0.26, -0.07, 15.12 | monolithes_lod1/stone_blue | -0.35 + -0.93 + 0.09 | 0.166 |
| 0.55, -0.10, 17.72 | monolithes_lod1/stone_blue | -0.19 + -0.92 + 0.33 | 0.132 |
| 9.80, -0.14, 4.24 | monolithes_lod1/stone_blue | 0.48 + -0.88 + -0.04 | 0.208 |
| 9.58, -0.15, 3.36 | monolithes_lod1/stone_blue | 0.43 + -0.88 + -0.19 | 0.208 |
| 9.50, -0.14, 3.22 | monolithes_lod1/stone_blue | -0.21 + -0.36 + -0.91 | 0.073 |
| 9.41, -0.14, 3.24 | monolithes_lod1/stone_blue | -0.23 + -0.34 + -0.91 | 1.045 |
| 8.45, -0.14, 3.53 | monolithes_lod1/stone_blue | -0.37 + -0.93 + -0.09 | 0.072 |
| -0.02, -0.12, -17.32 | monolithes_lod1/stone_blue | 0.01 + -0.77 + -0.64 | 0.145 |
| 0.49, -0.13, -15.28 | monolithes_lod1/stone_blue | 0.27 + -0.96 + 0.06 | 0.152 |
| 0.66, -0.12, -14.75 | monolithes_lod1/stone_blue | 0.21 + -0.97 + -0.11 | 0.145 |
| 1.35, -0.12, -12.18 | monolithes_lod1/stone_blue | 0.17 + -0.96 + -0.23 | 0.145 |
| 1.45, -0.12, -11.78 | monolithes_lod1/stone_blue | 0.33 + -0.73 + 0.59 | 0.145 |
| -0.14, -0.14, -17.29 | monolithes_lod1/stone_blue | -0.16 + -0.79 + -0.59 | 0.838 |
| -0.96, -0.14, -17.07 | monolithes_lod1/stone_blue | -0.18 + -0.71 + -0.68 | 0.138 |
| -1.01, -0.14, -16.98 | monolithes_lod1/stone_blue | -0.51 + -0.85 + 0.13 | 0.138 |
| -0.98, -0.14, -16.86 | monolithes_lod1/stone_blue | -0.23 + -0.97 + 0.06 | 0.84 |
| -0.60, -0.12, -15.14 | monolithes_lod1/stone_blue | -0.24 + -0.97 + 0.06 | 0.15 |
| -0.34, -0.14, -14.43 | monolithes_lod1/stone_blue | -0.34 + -0.94 + 0.09 | 1.4 |
| 1.34, -0.14, -11.74 | monolithes_lod1/stone_blue | 0.15 + -0.81 + 0.57 | 0.976 |
| 0.02, -0.14, -13.08 | monolithes_lod1/stone_blue | -0.37 + -0.93 + 0.1 | 1.54 |
| 0.42, -0.14, -11.57 | monolithes_lod1/stone_blue | -0.22 + -0.97 + 0.06 | 0.138 |
| 6.16, -0.10, -14.44 | monolithes_lod1/stone_blue | -0.02 + -0.91 + -0.42 | 0.293 |
| 6.66, -0.09, -13.31 | monolithes_lod1/stone_blue | 0.96 + -0.17 + -0.22 | 0.837 |
| 5.34, -0.11, -14.26 | monolithes_lod1/stone_blue | -0.09 + -0.91 + -0.4 | 0.419 |
| 5.57, -0.09, -12.96 | monolithes_lod1/stone_blue | -0.12 + -0.9 + 0.42 | 0.126 |
| -9.97, -0.09, 9.00 | monolithes_lod1/stone_blue | -0.13 + -0.85 + -0.52 | 0.133 |
| -10.08, -0.09, 9.03 | monolithes_lod1/stone_blue | -0.19 + -0.76 + -0.62 | 0.975 |
| -10.00, -0.09, 10.33 | monolithes_lod1/stone_blue | 0.19 + -0.77 + 0.6 | 0.535 |

(70 more in the JSON)


Nodes: monolithes_lod1. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
