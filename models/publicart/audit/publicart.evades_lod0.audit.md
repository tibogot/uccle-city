# Mesh audit (before pack): publicart.evades_lod0

14,514 triangles, 7,486 welded vertices, 306 open edges, 6,816 rays, 771 ms.

**0 blocking**, 204 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 204 |
| seam | info | 82 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 204)

| at | part | aspect | longest |
|---|---|---|---|
| 2.60, -0.18, 0.23 | evades_lod0/gravel | 46 | 0.457 |
| 2.37, -0.18, 1.10 | evades_lod0/gravel | 46 | 0.457 |
| 2.14, -0.18, 1.50 | evades_lod0/gravel | 46 | 0.457 |
| 1.85, -0.18, 1.85 | evades_lod0/gravel | 46 | 0.457 |
| 1.10, -0.18, 2.37 | evades_lod0/gravel | 46 | 0.457 |
| 0.68, -0.18, 2.52 | evades_lod0/gravel | 46 | 0.457 |
| 0.23, -0.18, 2.60 | evades_lod0/gravel | 46 | 0.457 |
| -0.23, -0.18, 2.60 | evades_lod0/gravel | 46 | 0.457 |
| -0.68, -0.18, 2.52 | evades_lod0/gravel | 46 | 0.457 |
| -1.10, -0.18, 2.37 | evades_lod0/gravel | 46 | 0.457 |
| -1.85, -0.18, 1.85 | evades_lod0/gravel | 46 | 0.457 |
| -2.14, -0.18, 1.50 | evades_lod0/gravel | 46 | 0.457 |
| -2.37, -0.18, 1.10 | evades_lod0/gravel | 46 | 0.457 |
| -2.60, -0.18, 0.23 | evades_lod0/gravel | 46 | 0.457 |
| -2.60, -0.18, -0.23 | evades_lod0/gravel | 46 | 0.457 |
| -2.37, -0.18, -1.10 | evades_lod0/gravel | 46 | 0.457 |
| -2.14, -0.18, -1.50 | evades_lod0/gravel | 46 | 0.457 |
| -1.85, -0.18, -1.85 | evades_lod0/gravel | 46 | 0.457 |
| -1.10, -0.18, -2.37 | evades_lod0/gravel | 46 | 0.457 |
| -0.68, -0.18, -2.52 | evades_lod0/gravel | 46 | 0.457 |
| -0.23, -0.18, -2.60 | evades_lod0/gravel | 46 | 0.457 |
| 0.23, -0.18, -2.60 | evades_lod0/gravel | 46 | 0.457 |
| 0.68, -0.18, -2.52 | evades_lod0/gravel | 46 | 0.457 |
| 1.10, -0.18, -2.37 | evades_lod0/gravel | 46 | 0.457 |
| 1.85, -0.18, -1.85 | evades_lod0/gravel | 46 | 0.457 |
| 2.14, -0.18, -1.50 | evades_lod0/gravel | 46 | 0.457 |
| 2.37, -0.18, -1.10 | evades_lod0/gravel | 46 | 0.457 |
| 2.60, -0.18, -0.23 | evades_lod0/gravel | 46 | 0.457 |
| -0.45, -0.10, -0.15 | evades_lod0/stone_blue | 98 | 0.896 |
| -0.46, -0.09, -0.15 | evades_lod0/stone_blue | 98 | 0.896 |
| -0.45, 0.14, 0.46 | evades_lod0/stone_blue | 76 | 0.696 |
| -0.46, 0.14, 0.45 | evades_lod0/stone_blue | 76 | 0.696 |
| -0.45, 0.62, 0.15 | evades_lod0/stone_blue | 98 | 0.896 |
| -0.46, 0.61, 0.15 | evades_lod0/stone_blue | 98 | 0.896 |
| -0.45, 0.38, -0.46 | evades_lod0/stone_blue | 76 | 0.696 |
| -0.46, 0.38, -0.45 | evades_lod0/stone_blue | 76 | 0.696 |
| 0.15, -0.10, -0.45 | evades_lod0/stone_blue | 98 | 0.896 |
| 0.15, -0.09, -0.46 | evades_lod0/stone_blue | 97 | 0.896 |
| -0.15, 0.62, -0.45 | evades_lod0/stone_blue | 98 | 0.896 |
| -0.15, 0.61, -0.46 | evades_lod0/stone_blue | 98 | 0.896 |

(164 more in the JSON)

## seam (info, 82)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 1.36, 0.03, -0.02 | evades_lod0/gravel + evades_lod0/stone_blue | 13.61 | 651 | 20.9 |
| 0.46, 0.03, -0.02 | evades_lod0/gravel + evades_lod0/stone_blue | 3.66 | 92 | 90 |
| -0.45, 0.37, -0.46 | evades_lod0/stone_blue + evades_lod0/stone_blue | 1.49 | 76 | 40.8 |
| -0.72, 1.68, 0.09 | evades_lod0/iron_black + evades_lod0/iron_black | 0.23 | 48 | 48.3 |
| -0.72, 1.46, 0.15 | evades_lod0/iron_black + evades_lod0/iron_black | 0.21 | 48 | 42.9 |
| -0.73, 1.26, 0.17 | evades_lod0/iron_black + evades_lod0/iron_black | 0.17 | 48 | 41.2 |
| 0.61, 1.01, 0.20 | evades_lod0/iron_black + evades_lod0/iron_black | 0.17 | 48 | 39.4 |
| 0.58, 1.19, 0.12 | evades_lod0/iron_black + evades_lod0/iron_black | 0.21 | 47 | 42.3 |
| -0.73, 1.10, 0.23 | evades_lod0/iron_black + evades_lod0/iron_black | 0.14 | 46 | 21.8 |
| -0.30, 2.40, 0.06 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 25 | 35.8 |
| 0.08, 0.62, 0.07 | evades_lod0/stone_blue + evades_lod0/steel_stainless | 0.61 | 24 | 71 |
| -0.23, 0.62, 0.07 | evades_lod0/stone_blue + evades_lod0/steel_stainless | 0.61 | 24 | 71 |
| -0.23, 2.41, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 24 | 33.2 |
| 0.43, 2.46, 0.03 | evades_lod0/iron_black + evades_lod0/iron_black | 0.08 | 24 | 29.7 |
| -0.76, 2.42, 0.02 | evades_lod0/iron_black + evades_lod0/iron_black | 0.07 | 23 | 33.3 |
| -0.16, 2.41, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 23 | 39.5 |
| 0.10, 2.42, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.07 | 23 | 35 |
| 0.16, 2.43, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 23 | 36.2 |
| 0.23, 2.43, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 23 | 43.6 |
| 0.04, 2.42, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 22 | 23.5 |
| 0.75, 2.52, 0.01 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 22 | 33.8 |
| -0.10, 2.41, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 21 | 41.7 |
| 0.50, 2.45, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 21 | 41.6 |
| 0.62, 2.49, 0.02 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 21 | 37.1 |
| -0.56, 2.40, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 20 | 36.7 |
| -0.51, 2.39, 0.03 | evades_lod0/iron_black + evades_lod0/iron_black | 0.09 | 20 | 55.3 |
| -0.50, 2.42, 0.03 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 20 | 45.7 |
| -0.37, 2.39, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.06 | 20 | 30.6 |
| -0.22, 2.39, 0.06 | evades_lod0/iron_black + evades_lod0/iron_black | 0.07 | 20 | 25.3 |
| 0.36, 2.43, 0.05 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 20 | 39.1 |
| 0.35, 2.45, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 20 | 42.4 |
| 0.69, 2.48, 0.03 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 20 | 42.9 |
| 0.10, 2.41, 0.06 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 19 | 36.8 |
| 0.30, 2.43, 0.06 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 19 | 36.8 |
| 0.29, 2.44, 0.04 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 19 | 48.8 |
| 0.83, 2.51, 0.01 | evades_lod0/iron_black + evades_lod0/iron_black | 0.05 | 19 | 40 |
| -0.10, 2.35, 0.06 | evades_lod0/iron_black + evades_lod0/iron_black | 0.13 | 19 | 11 |
| -0.69, 2.40, 0.01 | evades_lod0/steel_stainless + evades_lod0/iron_black | 0.09 | 18 | 67 |
| -0.68, 2.38, 0.01 | evades_lod0/steel_stainless + evades_lod0/iron_black | 0.1 | 18 | 21.2 |
| 0.74, 2.55, 0.06 | evades_lod0/steel_stainless + evades_lod0/iron_black | 0.11 | 18 | 22.3 |

(42 more in the JSON)

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| -0.15, 0.38, 0.98 | evades_lod0/stone_blue + evades_lod0/stone_blue | 0.00005 |
| -0.14, 0.40, 1.00 | evades_lod0/stone_blue + evades_lod0/stone_blue | 0.00051 |
| -0.16, 0.40, 0.97 | evades_lod0/stone_blue + evades_lod0/stone_blue | 0.00016 |


Nodes: evades_lod0. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
