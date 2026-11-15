# Mesh audit (before pack): publicart.evades_lod2

2,416 triangles, 1,337 welded vertices, 98 open edges, 3,694 rays, 101 ms.

**0 blocking**, 167 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 111 |
| nonmanifold | warn | 56 |
| seam | info | 78 |
| backtoback | info | 118 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 111)

| at | part | aspect | longest |
|---|---|---|---|
| 2.08, 0.01, -1.55 | evades_lod2/gravel | 57 | 0.684 |
| 0.82, 0.01, 2.47 | evades_lod2/gravel | 57 | 0.684 |
| 1.55, 0.01, -2.08 | evades_lod2/gravel | 57 | 0.684 |
| 0.80, 0.01, -2.42 | evades_lod2/gravel | 49 | 1.13 |
| -0.96, 0.01, -2.41 | evades_lod2/gravel | 57 | 0.684 |
| 2.47, 0.01, 0.82 | evades_lod2/gravel | 57 | 0.684 |
| -0.46, -0.09, -0.15 | evades_lod2/stone_blue | 53 | 0.896 |
| -0.46, 0.14, 0.45 | evades_lod2/stone_blue | 41 | 0.696 |
| -0.46, 0.61, 0.15 | evades_lod2/stone_blue | 53 | 0.896 |
| -0.46, 0.38, -0.45 | evades_lod2/stone_blue | 41 | 0.696 |
| 0.15, -0.09, -0.46 | evades_lod2/stone_blue | 53 | 0.896 |
| -0.15, 0.61, -0.46 | evades_lod2/stone_blue | 53 | 0.896 |
| 0.45, 0.38, -0.46 | evades_lod2/stone_blue | 41 | 0.696 |
| 0.46, -0.09, 0.15 | evades_lod2/stone_blue | 53 | 0.896 |
| 0.46, 0.61, -0.15 | evades_lod2/stone_blue | 53 | 0.896 |
| 0.46, 0.38, 0.45 | evades_lod2/stone_blue | 41 | 0.696 |
| -0.15, -0.09, 0.46 | evades_lod2/stone_blue | 53 | 0.896 |
| 0.15, 0.61, 0.46 | evades_lod2/stone_blue | 53 | 0.896 |
| -3.67, 0.50, 0.79 | evades_lod2/stone_blue | 72 | 0.608 |
| -3.67, 0.54, 1.01 | evades_lod2/stone_blue | 72 | 0.608 |
| -2.98, 0.56, 0.59 | evades_lod2/stone_blue | 122 | 1.038 |
| -3.32, 0.65, 0.62 | evades_lod2/stone_blue | 122 | 1.038 |
| -2.63, 0.45, 0.99 | evades_lod2/stone_blue | 72 | 0.608 |
| -2.63, 0.59, 0.81 | evades_lod2/stone_blue | 72 | 0.608 |
| -3.32, 0.39, 1.18 | evades_lod2/stone_blue | 122 | 1.038 |
| -2.98, 0.49, 1.21 | evades_lod2/stone_blue | 122 | 1.038 |
| -3.55, 0.00, 1.02 | evades_lod2/stone_blue | 87 | 0.738 |
| -3.55, 0.25, 0.78 | evades_lod2/stone_blue | 87 | 0.738 |
| -3.41, 0.25, 0.78 | evades_lod2/stone_blue | 87 | 0.738 |
| -3.41, 0.25, 1.02 | evades_lod2/stone_blue | 87 | 0.738 |
| -2.89, 0.00, 1.02 | evades_lod2/stone_blue | 87 | 0.738 |
| -2.89, 0.25, 0.78 | evades_lod2/stone_blue | 87 | 0.738 |
| -2.75, 0.25, 0.78 | evades_lod2/stone_blue | 87 | 0.738 |
| -2.75, 0.25, 1.02 | evades_lod2/stone_blue | 87 | 0.738 |
| 2.63, 0.50, 0.79 | evades_lod2/stone_blue | 72 | 0.608 |
| 2.63, 0.54, 1.01 | evades_lod2/stone_blue | 72 | 0.608 |
| 3.32, 0.56, 0.59 | evades_lod2/stone_blue | 122 | 1.038 |
| 2.98, 0.64, 0.61 | evades_lod2/stone_blue | 122 | 1.038 |
| 3.67, 0.45, 0.99 | evades_lod2/stone_blue | 72 | 0.608 |
| 3.67, 0.59, 0.81 | evades_lod2/stone_blue | 72 | 0.608 |

(71 more in the JSON)

## nonmanifold (warn, 56)

| at | part | uses |
|---|---|---|
| 0.32, 0.36, -1.14 | evades_lod2/stone_blue | 4 |
| -0.70, 1.70, 0.11 | evades_lod2/iron_black | 4 |
| -0.67, 1.78, 0.10 | evades_lod2/iron_black | 4 |
| -0.68, 1.84, 0.08 | evades_lod2/iron_black | 4 |
| -0.69, 1.95, 0.06 | evades_lod2/iron_black | 4 |
| -0.74, 1.68, 0.14 | evades_lod2/iron_black | 4 |
| -0.74, 1.71, 0.11 | evades_lod2/iron_black | 4 |
| -0.74, 1.67, 0.07 | evades_lod2/iron_black | 4 |
| -0.73, 1.58, 0.08 | evades_lod2/iron_black | 4 |
| -0.72, 1.49, 0.11 | evades_lod2/iron_black | 4 |
| -0.73, 1.47, 0.12 | evades_lod2/iron_black | 4 |
| -0.70, 1.30, 0.18 | evades_lod2/iron_black | 4 |
| -0.70, 1.49, 0.15 | evades_lod2/iron_black | 4 |
| -0.77, 1.49, 0.13 | evades_lod2/iron_black | 4 |
| -0.77, 1.29, 0.17 | evades_lod2/iron_black | 4 |
| -0.75, 1.10, 0.26 | evades_lod2/iron_black | 4 |
| -0.75, 1.13, 0.26 | evades_lod2/iron_black | 4 |
| -0.74, 1.29, 0.22 | evades_lod2/iron_black | 4 |
| -0.73, 1.30, 0.16 | evades_lod2/iron_black | 4 |
| -0.69, 1.02, 0.26 | evades_lod2/iron_black | 4 |
| -0.70, 0.97, 0.28 | evades_lod2/iron_black | 4 |
| -0.76, 0.84, 0.34 | evades_lod2/iron_black | 4 |
| -0.76, 0.79, 0.32 | evades_lod2/iron_black | 4 |
| -0.75, 0.96, 0.31 | evades_lod2/iron_black | 4 |
| -0.74, 0.98, 0.26 | evades_lod2/iron_black | 4 |
| -0.74, 0.88, 0.24 | evades_lod2/iron_black | 4 |
| -0.70, 0.74, 0.35 | evades_lod2/iron_black | 4 |
| -0.71, 0.80, 0.33 | evades_lod2/iron_black | 4 |
| -0.74, 0.85, 0.32 | evades_lod2/iron_black | 4 |
| -0.71, 0.84, 0.32 | evades_lod2/iron_black | 4 |
| 0.59, 1.39, 0.07 | evades_lod2/iron_black | 4 |
| 0.52, 1.27, 0.08 | evades_lod2/iron_black | 4 |
| 0.56, 1.14, 0.19 | evades_lod2/iron_black | 4 |
| 0.58, 1.22, 0.10 | evades_lod2/iron_black | 4 |
| 0.61, 1.03, 0.14 | evades_lod2/iron_black | 4 |
| 0.65, 0.91, 0.25 | evades_lod2/iron_black | 4 |
| 0.62, 1.04, 0.20 | evades_lod2/iron_black | 4 |
| 0.58, 1.04, 0.17 | evades_lod2/iron_black | 4 |
| -0.69, 2.40, 0.02 | evades_lod2/iron_black | 4 |
| -0.66, 2.37, 0.04 | evades_lod2/iron_black | 4 |

(16 more in the JSON)

## seam (info, 78)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 1.35, 0.03, -0.63 | evades_lod2/gravel + evades_lod2/stone_blue | 11.85 | 216 | 13.2 |
| 0.46, 0.03, -0.06 | evades_lod2/gravel + evades_lod2/stone_blue | 3.65 | 44 | 90 |
| -0.46, 0.37, -0.45 | evades_lod2/stone_blue + evades_lod2/stone_blue | 1.55 | 36 | 32.9 |
| 0.58, 1.18, 0.14 | evades_lod2/iron_black + evades_lod2/iron_black | 0.5 | 26 | 17.3 |
| 0.08, 0.62, 0.07 | evades_lod2/stone_blue + evades_lod2/steel_stainless | 0.61 | 16 | 71 |
| -0.23, 0.62, 0.07 | evades_lod2/stone_blue + evades_lod2/steel_stainless | 0.61 | 16 | 71 |
| -3.54, 0.50, 0.79 | evades_lod2/stone_blue + evades_lod2/stone_blue | 0.74 | 14 | 16.6 |
| -2.88, 0.50, 0.79 | evades_lod2/stone_blue + evades_lod2/stone_blue | 0.74 | 14 | 16.6 |
| 2.75, 0.50, 0.79 | evades_lod2/stone_blue + evades_lod2/stone_blue | 0.74 | 14 | 16.6 |
| 3.42, 0.50, 0.79 | evades_lod2/stone_blue + evades_lod2/stone_blue | 0.74 | 14 | 16.6 |
| 0.59, 1.04, 0.19 | evades_lod2/iron_black + evades_lod2/iron_black | 0.13 | 13 | 41.4 |
| -0.73, 1.30, 0.18 | evades_lod2/iron_black + evades_lod2/iron_black | 0.18 | 12 | 49.5 |
| -0.51, 2.40, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.03 | 12 | 43.5 |
| 0.82, 2.50, 0.00 | evades_lod2/iron_black + evades_lod2/iron_black | 0.13 | 12 | 33.6 |
| -0.74, 1.68, 0.11 | evades_lod2/iron_black + evades_lod2/iron_black | 0.12 | 10 | 76.7 |
| 0.69, 2.50, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.02 | 10 | 44.3 |
| -0.74, 1.08, 0.22 | evades_lod2/iron_black + evades_lod2/iron_black | 0.13 | 8 | 65.9 |
| -0.75, 0.97, 0.27 | evades_lod2/iron_black + evades_lod2/iron_black | 0.15 | 8 | 40.5 |
| -0.74, 0.98, 0.27 | evades_lod2/iron_black + evades_lod2/iron_black | 0.08 | 8 | 34.4 |
| -0.57, 2.41, 0.02 | evades_lod2/iron_black + evades_lod2/iron_black | 0.02 | 8 | 44.6 |
| 0.22, 2.42, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.04 | 8 | 48.7 |
| -0.36, 2.39, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.04 | 7 | 62.4 |
| 0.09, 2.42, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.07 | 7 | 46.3 |
| 0.55, 2.47, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.05 | 7 | 47.8 |
| 0.36, 2.45, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.04 | 7 | 66.2 |
| -0.36, 2.42, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.04 | 7 | 47 |
| -0.76, 0.81, 0.32 | evades_lod2/iron_black + evades_lod2/iron_black | 0.15 | 6 | 53 |
| -0.77, 2.43, 0.01 | evades_lod2/iron_black + evades_lod2/iron_black | 0.03 | 6 | 49 |
| -0.64, 2.42, 0.02 | evades_lod2/iron_black + evades_lod2/iron_black | 0.03 | 6 | 55.2 |
| -0.29, 2.39, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.09 | 6 | 48 |
| -0.04, 2.41, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.03 | 6 | 42.2 |
| 0.03, 2.41, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.05 | 6 | 39.6 |
| 0.29, 2.44, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.04 | 6 | 74.9 |
| 0.43, 2.45, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.08 | 6 | 35.2 |
| 0.75, 2.51, 0.02 | evades_lod2/iron_black + evades_lod2/iron_black | 0.02 | 6 | 34.9 |
| 0.72, 2.49, 0.01 | evades_lod2/steel_stainless + evades_lod2/iron_black | 0.07 | 5 | 58.5 |
| 0.68, 2.39, 0.04 | evades_lod2/steel_stainless + evades_lod2/iron_black | 0.04 | 5 | 58.2 |
| 0.71, 2.46, 0.03 | evades_lod2/steel_stainless + evades_lod2/iron_black | 0.04 | 5 | 65.5 |
| -0.11, 2.39, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.02 | 5 | 26.8 |
| -0.11, 2.40, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.05 | 5 | 74.3 |

(38 more in the JSON)

## backtoback (info, 118)

| at | parts | area |
|---|---|---|
| 0.32, 0.32, -1.17 | evades_lod2/stone_blue + evades_lod2/stone_blue | 0.00388 |
| -0.68, 1.83, 0.09 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00186 |
| -0.69, 1.88, 0.07 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00343 |
| -0.77, 1.75, 0.08 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00162 |
| -0.74, 1.68, 0.12 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00287 |
| -0.73, 1.62, 0.08 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00315 |
| -0.72, 1.54, 0.09 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00192 |
| -0.73, 1.49, 0.12 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00121 |
| -0.77, 1.46, 0.14 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00156 |
| -0.77, 1.36, 0.15 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00102 |
| -0.74, 1.09, 0.26 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00071 |
| -0.74, 1.08, 0.21 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00106 |
| -0.75, 1.10, 0.25 | evades_lod2/iron_black + evades_lod2/iron_black | 0.0003 |
| -0.75, 1.13, 0.25 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00123 |
| -0.73, 1.28, 0.16 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00089 |
| -0.70, 0.99, 0.27 | evades_lod2/iron_black + evades_lod2/iron_black | 0.0014 |
| -0.75, 0.82, 0.33 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00133 |
| -0.71, 0.78, 0.34 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00172 |
| -0.73, 0.85, 0.31 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00094 |
| -0.75, 0.81, 0.32 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00413 |
| 0.58, 1.25, 0.12 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00255 |
| 0.60, 1.36, 0.08 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00312 |
| -0.76, 2.41, 0.01 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00018 |
| -0.70, 2.37, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00106 |
| -0.69, 2.41, 0.01 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00025 |
| -0.67, 2.38, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00113 |
| -0.65, 2.35, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00097 |
| -0.67, 2.45, 0.02 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00111 |
| -0.59, 2.37, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00156 |
| -0.56, 2.35, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00061 |
| -0.60, 2.46, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00156 |
| -0.57, 2.48, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00061 |
| -0.52, 2.37, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00151 |
| -0.46, 2.36, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00157 |
| -0.47, 2.44, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00073 |
| -0.44, 2.47, 0.03 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00097 |
| -0.34, 2.36, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00048 |
| -0.37, 2.39, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.0002 |
| -0.35, 2.42, 0.04 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00054 |
| -0.29, 2.39, 0.05 | evades_lod2/iron_black + evades_lod2/iron_black | 0.00088 |

(78 more in the JSON)


Nodes: evades_lod2. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
