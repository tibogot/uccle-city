# Mesh audit (before pack): publicart.evades_lod1

5,939 triangles, 3,168 welded vertices, 245 open edges, 5,614 rays, 208 ms.

**0 blocking**, 115 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 112 |
| nonmanifold | warn | 3 |
| seam | info | 80 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 112)

| at | part | aspect | longest |
|---|---|---|---|
| -2.38, 0.01, -1.03 | evades_lod1/gravel | 57 | 0.684 |
| -0.96, 0.01, -2.41 | evades_lod1/gravel | 57 | 0.684 |
| -1.94, 0.01, -1.73 | evades_lod1/gravel | 57 | 0.684 |
| 0.15, 0.01, 2.59 | evades_lod1/gravel | 57 | 0.684 |
| 0.89, 0.01, 2.44 | evades_lod1/gravel | 76 | 0.456 |
| -0.46, -0.09, -0.15 | evades_lod1/stone_blue | 53 | 0.896 |
| -0.46, 0.14, 0.45 | evades_lod1/stone_blue | 41 | 0.696 |
| -0.46, 0.61, 0.15 | evades_lod1/stone_blue | 53 | 0.896 |
| -0.46, 0.38, -0.45 | evades_lod1/stone_blue | 41 | 0.696 |
| 0.15, -0.09, -0.46 | evades_lod1/stone_blue | 53 | 0.896 |
| -0.15, 0.61, -0.46 | evades_lod1/stone_blue | 53 | 0.896 |
| 0.45, 0.38, -0.46 | evades_lod1/stone_blue | 41 | 0.696 |
| 0.46, -0.09, 0.15 | evades_lod1/stone_blue | 53 | 0.896 |
| 0.46, 0.61, -0.15 | evades_lod1/stone_blue | 53 | 0.896 |
| 0.46, 0.38, 0.45 | evades_lod1/stone_blue | 41 | 0.696 |
| -0.15, -0.09, 0.46 | evades_lod1/stone_blue | 53 | 0.896 |
| 0.15, 0.61, 0.46 | evades_lod1/stone_blue | 53 | 0.896 |
| -3.67, 0.50, 0.79 | evades_lod1/stone_blue | 72 | 0.608 |
| -3.67, 0.54, 1.01 | evades_lod1/stone_blue | 72 | 0.608 |
| -2.98, 0.56, 0.59 | evades_lod1/stone_blue | 122 | 1.038 |
| -3.32, 0.65, 0.62 | evades_lod1/stone_blue | 122 | 1.038 |
| -2.63, 0.45, 0.99 | evades_lod1/stone_blue | 72 | 0.608 |
| -2.63, 0.59, 0.81 | evades_lod1/stone_blue | 72 | 0.608 |
| -3.32, 0.39, 1.18 | evades_lod1/stone_blue | 122 | 1.038 |
| -2.98, 0.49, 1.21 | evades_lod1/stone_blue | 122 | 1.038 |
| -3.55, 0.00, 1.02 | evades_lod1/stone_blue | 87 | 0.738 |
| -3.55, 0.25, 0.78 | evades_lod1/stone_blue | 87 | 0.738 |
| -3.41, 0.25, 0.78 | evades_lod1/stone_blue | 87 | 0.738 |
| -3.41, 0.25, 1.02 | evades_lod1/stone_blue | 87 | 0.738 |
| -2.89, 0.00, 1.02 | evades_lod1/stone_blue | 87 | 0.738 |
| -2.89, 0.25, 0.78 | evades_lod1/stone_blue | 87 | 0.738 |
| -2.75, 0.25, 0.78 | evades_lod1/stone_blue | 87 | 0.738 |
| -2.75, 0.25, 1.02 | evades_lod1/stone_blue | 87 | 0.738 |
| 2.63, 0.50, 0.79 | evades_lod1/stone_blue | 72 | 0.608 |
| 2.63, 0.54, 1.01 | evades_lod1/stone_blue | 72 | 0.608 |
| 3.32, 0.56, 0.59 | evades_lod1/stone_blue | 122 | 1.038 |
| 2.98, 0.64, 0.61 | evades_lod1/stone_blue | 122 | 1.038 |
| 3.67, 0.45, 0.99 | evades_lod1/stone_blue | 72 | 0.608 |
| 3.67, 0.59, 0.81 | evades_lod1/stone_blue | 72 | 0.608 |
| 2.98, 0.40, 1.19 | evades_lod1/stone_blue | 122 | 1.038 |

(72 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| -0.80, 0.74, 0.32 | evades_lod1/iron_black | 4 |
| 0.60, 1.38, 0.09 | evades_lod1/iron_black | 4 |
| 0.60, 1.12, 0.10 | evades_lod1/iron_black | 4 |

## seam (info, 80)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 1.35, 0.03, -0.39 | evades_lod1/gravel + evades_lod1/stone_blue | 13.4 | 428 | 8.8 |
| 0.46, 0.03, -0.06 | evades_lod1/gravel + evades_lod1/stone_blue | 3.65 | 69 | 90 |
| -0.46, 0.36, -0.45 | evades_lod1/stone_blue + evades_lod1/stone_blue | 1.46 | 48 | 39.5 |
| -0.72, 1.72, 0.10 | evades_lod1/iron_black + evades_lod1/iron_black | 0.32 | 29 | 42.8 |
| -0.72, 1.29, 0.19 | evades_lod1/iron_black + evades_lod1/iron_black | 0.27 | 27 | 44.4 |
| -0.73, 1.50, 0.15 | evades_lod1/iron_black + evades_lod1/iron_black | 0.23 | 26 | 28.5 |
| -0.74, 1.12, 0.24 | evades_lod1/iron_black + evades_lod1/iron_black | 0.21 | 25 | 40 |
| 0.59, 1.04, 0.19 | evades_lod1/iron_black + evades_lod1/iron_black | 0.2 | 22 | 54 |
| -0.73, 0.97, 0.26 | evades_lod1/iron_black + evades_lod1/iron_black | 0.23 | 21 | 40.3 |
| -0.73, 0.80, 0.32 | evades_lod1/iron_black + evades_lod1/iron_black | 0.19 | 20 | 34.4 |
| 0.08, 0.62, 0.07 | evades_lod1/stone_blue + evades_lod1/steel_stainless | 0.61 | 16 | 71 |
| -3.54, 0.50, 0.79 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.75 | 16 | 47 |
| -2.88, 0.50, 0.79 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.75 | 16 | 46.9 |
| 2.75, 0.50, 0.79 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.75 | 16 | 46.9 |
| 3.42, 0.50, 0.79 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.75 | 16 | 47 |
| -0.23, 0.62, 0.07 | evades_lod1/stone_blue + evades_lod1/steel_stainless | 0.61 | 16 | 71 |
| 0.58, 1.24, 0.12 | evades_lod1/iron_black + evades_lod1/iron_black | 0.24 | 16 | 29.3 |
| -0.63, 2.42, 0.01 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 14 | 43.6 |
| -0.50, 2.42, 0.03 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 14 | 45.8 |
| -0.36, 2.39, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 14 | 37.7 |
| -0.36, 2.41, 0.04 | evades_lod1/iron_black + evades_lod1/iron_black | 0.06 | 14 | 43.1 |
| 0.42, 2.45, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.06 | 14 | 30.3 |
| -0.43, 2.41, 0.04 | evades_lod1/iron_black + evades_lod1/iron_black | 0.06 | 13 | 35.1 |
| -0.69, 2.40, 0.01 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 12 | 38.8 |
| -0.56, 2.40, 0.03 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 32.4 |
| -0.43, 2.39, 0.04 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 12 | 17.5 |
| -0.29, 2.40, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 12 | 32.2 |
| 0.28, 2.44, 0.06 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 36.6 |
| 0.36, 2.45, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 49.4 |
| 0.49, 2.47, 0.03 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 43.6 |
| 0.55, 2.48, 0.03 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 38.7 |
| 0.69, 2.50, 0.03 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 12 | 42 |
| -0.69, 2.41, 0.00 | evades_lod1/steel_stainless + evades_lod1/iron_black | 0.08 | 11 | 65.8 |
| -0.23, 2.41, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 11 | 45.9 |
| -0.10, 2.42, 0.05 | evades_lod1/iron_black + evades_lod1/iron_black | 0.06 | 11 | 34.9 |
| 0.16, 2.42, 0.06 | evades_lod1/iron_black + evades_lod1/iron_black | 0.05 | 11 | 42 |
| 0.75, 2.51, 0.02 | evades_lod1/iron_black + evades_lod1/iron_black | 0.04 | 11 | 33.9 |
| -0.68, 1.94, 0.07 | evades_lod1/steel_stainless + evades_lod1/iron_black | 0.12 | 10 | 17.2 |
| 0.86, 2.45, 0.00 | evades_lod1/steel_stainless + evades_lod1/iron_black | 0.08 | 10 | 66.3 |
| -0.68, 2.39, 0.02 | evades_lod1/steel_stainless + evades_lod1/iron_black | 0.07 | 10 | 23.9 |

(40 more in the JSON)

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| -0.14, 0.40, 1.00 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.00051 |
| -0.16, 0.40, 0.97 | evades_lod1/stone_blue + evades_lod1/stone_blue | 0.00019 |


Nodes: evades_lod1. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
