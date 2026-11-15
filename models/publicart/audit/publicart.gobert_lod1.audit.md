# Mesh audit (before pack): publicart.gobert_lod1

896 triangles, 484 welded vertices, 0 open edges, 0 rays, 22 ms.

**0 blocking**, 276 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 276 |
| seam | info | 15 |
| backtoback | info | 58 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 276)

| at | part | aspect | longest |
|---|---|---|---|
| -0.59, 0.10, 0.11 | gobert_lod1/stone_pale | 48 | 0.68 |
| -0.20, 0.10, -0.34 | gobert_lod1/stone_pale | 83 | 1.18 |
| 0.59, 0.10, -0.11 | gobert_lod1/stone_pale | 48 | 0.68 |
| 0.20, 0.10, 0.34 | gobert_lod1/stone_pale | 83 | 1.18 |
| -0.57, 0.10, -0.11 | gobert_lod1/stone_pale | 57 | 0.644 |
| -0.57, 0.89, 0.33 | gobert_lod1/stone_pale | 206 | 2.334 |
| -0.57, 2.45, 0.11 | gobert_lod1/stone_pale | 57 | 0.644 |
| -0.57, 1.66, -0.33 | gobert_lod1/stone_pale | 206 | 2.334 |
| 0.19, 0.10, -0.33 | gobert_lod1/stone_pale | 101 | 1.144 |
| -0.19, 2.45, -0.33 | gobert_lod1/stone_pale | 101 | 1.144 |
| 0.58, 1.66, -0.33 | gobert_lod1/stone_pale | 206 | 2.334 |
| 0.57, 0.10, 0.11 | gobert_lod1/stone_pale | 57 | 0.644 |
| 0.57, 2.45, -0.11 | gobert_lod1/stone_pale | 57 | 0.644 |
| 0.57, 1.66, 0.33 | gobert_lod1/stone_pale | 206 | 2.334 |
| -0.19, 0.10, 0.33 | gobert_lod1/stone_pale | 101 | 1.144 |
| 0.19, 2.45, 0.33 | gobert_lod1/stone_pale | 101 | 1.144 |
| -0.68, 2.45, -0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| -0.69, 2.46, -0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| -0.68, 2.62, 0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| -0.69, 2.62, 0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| 0.23, 2.45, -0.41 | gobert_lod1/stone_pale | 178 | 1.36 |
| 0.23, 2.46, -0.42 | gobert_lod1/stone_pale | 178 | 1.36 |
| -0.23, 2.62, -0.41 | gobert_lod1/stone_pale | 178 | 1.36 |
| -0.23, 2.62, -0.42 | gobert_lod1/stone_pale | 178 | 1.36 |
| 0.68, 2.45, 0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| 0.69, 2.46, 0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| 0.68, 2.62, -0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| 0.69, 2.62, -0.14 | gobert_lod1/stone_pale | 107 | 0.82 |
| -0.23, 2.45, 0.41 | gobert_lod1/stone_pale | 178 | 1.36 |
| -0.23, 2.46, 0.42 | gobert_lod1/stone_pale | 178 | 1.36 |
| 0.23, 2.62, 0.41 | gobert_lod1/stone_pale | 178 | 1.36 |
| 0.23, 2.62, 0.42 | gobert_lod1/stone_pale | 178 | 1.36 |
| -2.40, 0.10, -0.20 | gobert_lod1/stone_pale | 189 | 2.68 |
| -1.50, 0.10, 0.20 | gobert_lod1/stone_pale | 189 | 2.68 |
| -3.29, 0.10, -0.07 | gobert_lod1/stone_pale | 46 | 0.388 |
| -3.29, 0.58, 0.20 | gobert_lod1/stone_pale | 168 | 1.428 |
| -3.29, 1.54, 0.07 | gobert_lod1/stone_pale | 46 | 0.388 |
| -3.29, 1.06, -0.20 | gobert_lod1/stone_pale | 168 | 1.428 |
| -1.50, 0.10, -0.20 | gobert_lod1/stone_pale | 315 | 2.668 |
| -2.40, 1.54, -0.20 | gobert_lod1/stone_pale | 314 | 2.668 |

(236 more in the JSON)

## seam (info, 15)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.58, 1.63, 0.17 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 1.14 | 26 | 90 |
| 0.58, 1.54, -0.23 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 1.14 | 26 | 90 |
| 0.24, 1.74, 0.33 | gobert_lod1/stone_pale + gobert_lod1/bronze | 2.03 | 18 | 90 |
| -3.13, -0.18, 0.80 | gobert_lod1/bed_planting + gobert_lod1/stone_blue | 5.4 | 13 | 45 |
| 0.70, -0.18, 0.80 | gobert_lod1/bed_planting + gobert_lod1/stone_blue | 5.4 | 13 | 45 |
| 3.30, -0.14, -0.17 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 1.56 | 8 | 44.9 |
| -5.06, 1.20, -0.17 | gobert_lod1/stone_cream + gobert_lod1/stone_cream | 7.26 | 8 | 22.7 |
| 4.84, 1.20, -0.17 | gobert_lod1/stone_cream + gobert_lod1/stone_cream | 7.26 | 8 | 22.5 |
| -0.59, -0.18, 0.80 | gobert_lod1/stone_blue + gobert_lod1/stone_blue | 3.13 | 8 | 45 |
| 0.01, 0.10, -0.32 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 3.58 | 6 | 45 |
| -0.57, 2.45, 0.00 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 3.58 | 6 | 45.1 |
| -1.93, 0.10, -0.19 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 6.11 | 6 | 44.9 |
| -3.28, 1.54, 0.00 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 6.11 | 6 | 45 |
| 1.97, 0.10, -0.19 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 6.11 | 6 | 44.9 |
| 0.62, 1.54, 0.00 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 6.11 | 6 | 45 |

## backtoback (info, 58)

| at | parts | area |
|---|---|---|
| -0.60, -0.15, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.03415 |
| 0.41, -0.10, 0.35 | gobert_lod1/stone_pale + gobert_lod1/stone_blue | 0.10557 |
| 0.00, 0.10, -0.21 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.18205 |
| 0.43, 0.10, 0.08 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.18631 |
| 0.60, -0.15, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.03415 |
| -0.43, 0.10, -0.08 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.18631 |
| -0.01, 2.45, -0.21 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.17807 |
| 0.42, 2.45, -0.08 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.19029 |
| -0.42, 2.45, 0.08 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.19029 |
| -3.30, -0.16, 0.15 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.015 |
| -1.94, 0.10, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.25548 |
| -0.96, 0.10, 0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.26211 |
| -0.60, -0.05, -0.15 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.03415 |
| -2.94, 0.10, -0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.26211 |
| -2.01, 1.54, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.2422 |
| -0.99, 1.54, -0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.2754 |
| -2.89, 1.54, 0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.28315 |
| 0.60, -0.05, 0.15 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.03415 |
| 1.96, 0.10, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.25548 |
| 2.94, 0.10, 0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.26211 |
| 3.30, -0.16, -0.15 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.015 |
| 0.96, 0.10, -0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.26211 |
| 1.87, 1.54, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.23444 |
| 2.89, 1.54, -0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.28315 |
| 0.99, 1.54, 0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.2754 |
| -0.60, 0.01, 0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.05185 |
| -0.44, -0.10, 0.35 | gobert_lod1/stone_pale + gobert_lod1/stone_blue | 0.13191 |
| 0.01, 0.02, 0.35 | gobert_lod1/stone_pale + gobert_lod1/stone_blue | 0.11862 |
| -0.00, 0.10, 0.21 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.18205 |
| 0.60, 0.01, -0.05 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.05185 |
| 0.01, 2.45, 0.21 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.17807 |
| -3.30, -0.04, -0.04 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.06851 |
| -3.30, 0.06, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.00631 |
| -1.96, 0.10, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.25548 |
| -1.87, 1.54, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.23444 |
| 1.94, 0.10, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.25548 |
| 3.30, -0.04, 0.04 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.06851 |
| 3.30, 0.06, -0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_cream | 0.00631 |
| 2.01, 1.54, 0.13 | gobert_lod1/stone_pale + gobert_lod1/stone_pale | 0.2422 |
| -5.42, 1.20, -0.13 | gobert_lod1/stone_cream + gobert_lod1/stone_cream | 0.26608 |

(18 more in the JSON)


Nodes: gobert_lod1. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
