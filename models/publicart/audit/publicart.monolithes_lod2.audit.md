# Mesh audit (before pack): publicart.monolithes_lod2

7,000 triangles, 3,648 welded vertices, 270 open edges, 72,544 rays, 429 ms.

**0 blocking**, 71 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 71 |
| seam | info | 13 |
| opening | info | 49 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 71)

| at | part | aspect | longest |
|---|---|---|---|
| 1.52, 0.35, 17.55 | monolithes_lod2/stone_blue | 202 | 0.699 |
| -10.12, 0.82, 8.95 | monolithes_lod2/stone_blue | 66 | 1.314 |
| 1.10, 1.76, 10.70 | monolithes_lod2/stone_blue | 176 | 1.437 |
| 17.86, 0.05, -8.78 | monolithes_lod2/stone_kerb | 47 | 1.137 |
| 16.10, 0.06, -11.70 | monolithes_lod2/stone_kerb | 50 | 1.137 |
| 14.92, 0.06, -13.18 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 11.24, 0.07, -16.43 | monolithes_lod2/stone_kerb | 90 | 1.138 |
| 1.14, 0.05, -19.87 | monolithes_lod2/stone_kerb | 56 | 1.137 |
| -0.38, 0.03, -19.90 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| -3.95, -0.00, -19.51 | monolithes_lod2/stone_kerb | 50 | 1.137 |
| -6.15, -0.02, -18.93 | monolithes_lod2/stone_kerb | 85 | 1.137 |
| -7.75, -0.04, -18.34 | monolithes_lod2/stone_kerb | 56 | 1.137 |
| -14.54, -0.10, -13.60 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| -16.10, -0.10, -11.70 | monolithes_lod2/stone_kerb | 49 | 1.137 |
| -19.89, 0.00, -0.76 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| -14.28, 0.04, 13.87 | monolithes_lod2/stone_kerb | 122 | 1.137 |
| -11.70, 0.03, 16.10 | monolithes_lod2/stone_kerb | 55 | 1.137 |
| -8.27, -0.00, 18.11 | monolithes_lod2/stone_kerb | 77 | 1.137 |
| -7.40, -0.02, 18.48 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 7.40, -0.04, 18.48 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 12.46, -0.04, 15.53 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 15.99, -0.03, 11.85 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 18.75, -0.02, 6.69 | monolithes_lod2/stone_kerb | 43 | 1.137 |
| 17.53, 0.05, -9.04 | monolithes_lod2/stone_kerb | 66 | 1.127 |
| 16.69, 0.05, -10.50 | monolithes_lod2/stone_kerb | 66 | 1.127 |
| 14.27, 0.07, -13.61 | monolithes_lod2/stone_kerb | 67 | 1.127 |
| 0.56, 0.04, -19.71 | monolithes_lod2/stone_kerb | 54 | 1.127 |
| -1.69, 0.01, -19.64 | monolithes_lod2/stone_kerb | 128 | 1.127 |
| -3.36, 0.00, -19.43 | monolithes_lod2/stone_kerb | 71 | 1.127 |
| -19.07, 0.06, 5.01 | monolithes_lod2/stone_kerb | 70 | 1.127 |
| 7.16, -0.04, 18.38 | monolithes_lod2/stone_kerb | 94 | 1.127 |
| 10.18, -0.04, 16.89 | monolithes_lod2/stone_kerb | 196 | 1.127 |
| 17.42, 0.05, -9.62 | monolithes_lod2/stone_kerb | 67 | 1.137 |
| 17.24, 0.04, -9.95 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| 15.17, 0.06, -12.89 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| -0.57, 0.03, -19.90 | monolithes_lod2/stone_kerb | 83 | 1.138 |
| -2.08, 0.01, -19.80 | monolithes_lod2/stone_kerb | 67 | 1.137 |
| -2.46, 0.01, -19.76 | monolithes_lod2/stone_kerb | 67 | 1.138 |
| -4.51, -0.01, -19.39 | monolithes_lod2/stone_kerb | 70 | 1.138 |
| -6.33, -0.03, -18.87 | monolithes_lod2/stone_kerb | 67 | 1.138 |

(31 more in the JSON)

## seam (info, 13)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 19.71, -0.04, -0.27 | monolithes_lod2/stone_kerb + monolithes_lod2/bed_planting | 123.91 | 652 | 87 |
| 1.54, 0.33, -6.76 | monolithes_lod2/bed_planting + monolithes_lod2/hedge_hornbeam | 56.03 | 276 | 31.7 |
| 0.75, 0.28, -0.69 | monolithes_lod2/bed_planting + monolithes_lod2/hedge_hornbeam | 62.95 | 249 | 35.8 |
| -11.81, 0.43, 2.32 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 14.31 | 74 | 69.4 |
| 0.46, 0.36, -15.92 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 14.17 | 70 | 77.2 |
| 0.17, 0.38, 11.80 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 14.39 | 69 | 65.5 |
| 7.32, 0.39, -11.37 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.01 | 38 | 68.9 |
| 9.75, 0.35, 4.36 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 4.76 | 36 | 72.4 |
| -7.00, 0.39, 5.87 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.3 | 34 | 80.5 |
| -9.84, 0.41, 8.97 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.26 | 32 | 81.5 |
| -7.19, 0.38, 9.29 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.1 | 32 | 75.1 |
| 1.13, 0.39, 9.38 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.08 | 31 | 81.8 |
| 6.28, 0.39, -14.53 | monolithes_lod2/stone_blue + monolithes_lod2/bed_planting | 5.32 | 31 | 86.4 |

## opening (info, 49)

| at | part | facing | edge_m |
|---|---|---|---|
| -7.17, -0.06, 5.89 | monolithes_lod2/stone_blue | -0.31 + -0.43 + -0.85 | 1.354 |
| -6.65, -0.07, 7.08 | monolithes_lod2/stone_blue | 0.23 + -0.65 + 0.72 | 1.384 |
| -0.00, -0.06, 9.51 | monolithes_lod2/stone_blue | -0.26 + -0.2 + -0.94 | 0.576 |
| 0.14, -0.10, 10.73 | monolithes_lod2/stone_blue | -0.6 + -0.09 + 0.8 | 0.21 |
| 0.13, -0.09, 11.83 | monolithes_lod2/stone_blue | -0.07 + -0.6 + -0.8 | 0.165 |
| -0.96, -0.08, 12.08 | monolithes_lod2/stone_blue | -0.34 + -0.62 + -0.7 | 0.598 |
| 8.77, -0.14, 4.56 | monolithes_lod2/stone_blue | 0.24 + -0.23 + 0.94 | 1.119 |
| 9.68, -0.12, 3.53 | monolithes_lod2/stone_blue | 0.7 + -0.52 + -0.49 | 0.527 |
| 9.41, -0.14, 3.25 | monolithes_lod2/stone_blue | -0.21 + -0.73 + -0.65 | 1.057 |
| -0.04, -0.13, -17.28 | monolithes_lod2/stone_blue | 0.47 + -0.62 + -0.62 | 0.203 |
| -0.14, -0.14, -17.29 | monolithes_lod2/stone_blue | -0.16 + -0.79 + -0.59 | 0.976 |
| -0.49, -0.11, -14.60 | monolithes_lod2/stone_blue | -0.8 + -0.53 + 0.27 | 2.105 |
| 1.47, -0.11, -11.78 | monolithes_lod2/stone_blue | 0.23 + -0.52 + 0.82 | 1.118 |
| 0.02, -0.14, -13.08 | monolithes_lod2/stone_blue | -0.36 + -0.93 + 0.1 | 1.678 |
| -9.95, -0.08, 8.99 | monolithes_lod2/stone_blue | -0.25 + -0.54 + -0.8 | 1.218 |
| -9.59, -0.08, 10.21 | monolithes_lod2/stone_blue | 0.39 + -0.41 + 0.82 | 0.547 |
| 7.24, -0.07, -11.49 | monolithes_lod2/stone_blue | 0.5 + -0.85 + 0.18 | 0.352 |
| -11.80, -0.08, 2.38 | monolithes_lod2/stone_blue | -0.25 + -0.19 + -0.95 | 0.98 |
| -10.52, -0.06, 7.98 | monolithes_lod2/stone_blue | 0.33 + -0.69 + 0.64 | 0.51 |
| -12.31, -0.07, 5.07 | monolithes_lod2/stone_blue | -0.8 + -0.56 + 0.23 | 1.689 |
| -12.74, -0.07, 2.61 | monolithes_lod2/stone_blue | -0.04 + -0.41 + -0.91 | 0.251 |
| -12.77, -0.07, 3.45 | monolithes_lod2/stone_blue | -0.79 + -0.59 + 0.2 | 0.695 |
| -12.28, -0.07, 5.17 | monolithes_lod2/stone_blue | -0.92 + -0.25 + 0.28 | 1.397 |
| -10.62, -0.07, 8.01 | monolithes_lod2/stone_blue | 0.23 + -0.43 + 0.87 | 0.837 |
| -11.87, -0.08, 6.50 | monolithes_lod2/stone_blue | -0.81 + -0.53 + 0.24 | 1.825 |
| -7.31, -0.11, 9.41 | monolithes_lod2/stone_blue | 0.42 + -0.53 + -0.74 | 0.423 |
| -6.83, -0.11, 10.50 | monolithes_lod2/stone_blue | 0.69 + -0.72 + 0.09 | 0.327 |
| 1.00, -0.10, 9.42 | monolithes_lod2/stone_blue | 0.67 + -0.64 + -0.37 | 0.322 |
| 0.93, -0.10, 9.38 | monolithes_lod2/stone_blue | -0.05 + -0.16 + -0.99 | 0.559 |
| 1.10, -0.09, 10.66 | monolithes_lod2/stone_blue | 0.11 + -0.26 + 0.96 | 0.976 |
| -0.04, -0.12, 11.87 | monolithes_lod2/stone_blue | -0.1 + -0.92 + -0.37 | 0.559 |
| 1.46, -0.09, 17.53 | monolithes_lod2/stone_blue | 0.14 + -0.41 + 0.9 | 1.14 |
| 9.80, -0.14, 4.24 | monolithes_lod2/stone_blue | 0.71 + -0.7 + -0.07 | 0.641 |
| 8.71, -0.14, 4.52 | monolithes_lod2/stone_blue | -0.81 + -0.55 + 0.22 | 1.043 |
| -1.03, -0.14, -17.00 | monolithes_lod2/stone_blue | -0.82 + -0.56 + 0.11 | 0.988 |
| 6.34, -0.08, -14.50 | monolithes_lod2/stone_blue | 0.2 + 0.25 + -0.95 | 0.317 |
| 5.26, -0.06, -14.27 | monolithes_lod2/stone_blue | -0.31 + -0.6 + -0.74 | 0.6 |
| -9.89, -0.08, 9.03 | monolithes_lod2/stone_blue | 0.84 + -0.47 + -0.26 | 1.257 |
| -11.03, -0.08, 9.50 | monolithes_lod2/stone_blue | -0.95 + -0.2 + 0.23 | 0.841 |
| 6.18, -0.06, -10.92 | monolithes_lod2/stone_blue | -0.53 + -0.7 + 0.48 | 0.478 |

(9 more in the JSON)


Nodes: monolithes_lod2. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
