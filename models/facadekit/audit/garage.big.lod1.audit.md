# Kit audit: garage.big LOD1

246 triangles, 148 welded vertices, 20 open edges, 17,436 rays, 10 ms.

**0 blocking**, 122 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 117 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 30 |
| opening | info | 6 |
| backtoback | info | 17 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 117)

| at | part | aspect | longest |
|---|---|---|---|
| -0.57, 2.10, 0.01 | garage.lod1/stone_blue | 81 | 3.4 |
| -0.57, 2.10, 0.04 | garage.lod1/stone_blue | 401 | 3.4 |
| -0.57, 2.31, 0.04 | garage.lod1/stone_blue | 177 | 3.4 |
| -0.57, 2.32, 0.02 | garage.lod1/stone_blue | 94 | 3.4 |
| -0.53, -0.00, -0.30 | garage.lod1/stone_blue | 57 | 3.16 |
| 0.53, -0.00, 0.10 | garage.lod1/stone_blue | 57 | 3.16 |
| 0.57, 2.10, 0.02 | garage.lod1/stone_blue | 81 | 3.4 |
| 0.57, 2.10, 0.04 | garage.lod1/stone_blue | 401 | 3.4 |
| 0.57, 2.31, 0.03 | garage.lod1/stone_blue | 177 | 3.4 |
| 0.57, 2.32, 0.00 | garage.lod1/stone_blue | 94 | 3.4 |
| 0.53, -0.02, -0.30 | garage.lod1/stone_blue | 57 | 3.16 |
| -0.53, -0.02, 0.10 | garage.lod1/stone_blue | 57 | 3.16 |
| -0.49, 0.03, -0.26 | garage.lod1/metal_anodised | 80 | 2.95 |
| -0.49, 0.04, -0.24 | garage.lod1/metal_anodised | 105 | 2.95 |
| -0.49, 0.06, -0.25 | garage.lod1/metal_anodised | 80 | 2.95 |
| -0.49, 0.05, -0.28 | garage.lod1/metal_anodised | 105 | 2.95 |
| 0.49, 0.03, -0.25 | garage.lod1/metal_anodised | 80 | 2.95 |
| 0.49, 0.05, -0.24 | garage.lod1/metal_anodised | 105 | 2.95 |
| 0.49, 0.06, -0.26 | garage.lod1/metal_anodised | 80 | 2.95 |
| 0.49, 0.04, -0.28 | garage.lod1/metal_anodised | 105 | 2.95 |
| -1.44, 0.68, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| -1.46, 0.68, -0.22 | garage.lod1/garage_steel | 41 | 2.043 |
| -1.49, 0.69, 0.00 | garage.lod1/garage_steel | 123 | 2.092 |
| -1.55, 0.72, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.50, 2.14, -0.00 | garage.lod1/garage_steel | 57 | 3.11 |
| -0.48, 2.08, -0.23 | garage.lod1/garage_steel | 48 | 3 |
| -0.48, 2.04, -0.22 | garage.lod1/garage_steel | 479 | 2.876 |
| -0.50, 2.06, -0.22 | garage.lod1/garage_steel | 60 | 2.926 |
| -0.50, 2.09, 0.00 | garage.lod1/garage_steel | 177 | 2.988 |
| -0.52, 2.12, 0.01 | garage.lod1/garage_steel | 57 | 3.055 |
| -0.52, 2.15, 0.00 | garage.lod1/garage_steel | 259 | 3.11 |
| 1.44, 1.36, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| 1.47, 1.37, -0.22 | garage.lod1/garage_steel | 42 | 2.092 |
| 1.50, 1.40, 0.00 | garage.lod1/garage_steel | 124 | 2.104 |
| 1.55, 1.44, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.49, 0.06, -0.27 | garage.lod1/garage_steel | 78 | 2.95 |
| -0.49, 0.06, -0.24 | garage.lod1/garage_steel | 521 | 2.95 |
| -0.49, 0.56, -0.24 | garage.lod1/garage_steel | 209 | 2.95 |
| -0.49, 0.56, -0.26 | garage.lod1/garage_steel | 92 | 2.95 |
| -0.49, 0.56, -0.27 | garage.lod1/garage_steel | 82 | 2.95 |

(77 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod1/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -1.50, 0.00, 0.00 | wall/wall | 5.2 |
| 1.50, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 30)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.53, 0.01, -0.00 | garage.lod1/stone_blue + garage.lod1/garage_steel | 1.39 | 36 | 90 |
| -1.53, 0.00, -0.00 | garage.lod1/garage_steel + ground/ground | 1.39 | 36 | 90 |
| -1.45, 0.82, -0.23 | garage.lod1/garage_steel + garage.lod1/rubber_black | 14.02 | 32 | 90 |
| -1.44, 0.06, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 32 | 45 |
| -1.44, 0.57, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -1.43, 1.07, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -1.43, 1.58, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 7.65 | 24 | 45 |
| -1.55, 2.10, 0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 12.25 | 19 | 45 |
| -1.44, 0.01, -0.24 | garage.lod1/stone_blue + garage.lod1/rubber_black | 0.13 | 17 | 89.9 |
| -1.44, 0.00, -0.24 | garage.lod1/rubber_black + ground/ground | 0.13 | 17 | 89.9 |
| -1.29, 0.01, -0.27 | garage.lod1/stone_blue + garage.lod1/rubber_black | 5.93 | 12 | 61.4 |
| -1.11, 0.03, -0.25 | garage.lod1/metal_anodised + garage.lod1/rubber_black | 5.93 | 11 | 32 |
| -1.58, 0.00, -0.24 | garage.lod1/stone_blue + ground/ground | 7.12 | 8 | 90 |
| -1.60, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.70, 2.12, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -0.22, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 6 | 5 | 90 |
| -0.77, 0.06, -0.25 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 5.66 | 5 | 5.4 |
| -1.49, -0.00, 0.00 | garage.lod1/garage_steel + wall/wall | 0.02 | 5 | 45 |
| -1.55, 0.36, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| 1.55, 1.44, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| -1.58, -0.03, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| 1.58, 0.01, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| 1.45, -0.04, 0.00 | garage.lod1/stone_blue + wall/wall | 3 | 3 | 90 |
| -0.97, 2.15, 0.00 | garage.lod1/garage_steel + wall/wall | 3 | 3 | 90 |
| -2.08, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 3 | 90 |
| -1.31, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.95 | 2 | 45 |
| -1.31, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.95 | 2 | 45 |
| -1.31, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.95 | 2 | 45 |
| 2.42, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 2 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 3 | 1 | 90 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| 1.50, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 17)

| at | parts | area |
|---|---|---|
| 0.26, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.01181 |
| 1.48, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00009 |
| 1.45, 2.10, -0.00 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00008 |
| -1.00, 0.06, -0.26 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.02549 |
| -0.42, 0.06, -0.27 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.02482 |
| -1.16, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02746 |
| 0.47, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01974 |
| 0.39, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02499 |
| -1.16, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02746 |
| 0.47, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01974 |
| 0.39, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02499 |
| -1.16, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02746 |
| 0.47, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01974 |
| 0.39, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02499 |
| 1.01, 0.56, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02221 |
| 1.01, 1.07, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02221 |
| 1.01, 1.57, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02221 |
