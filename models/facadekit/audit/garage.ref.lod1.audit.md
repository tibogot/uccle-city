# Kit audit: garage.ref LOD1

246 triangles, 148 welded vertices, 20 open edges, 17,232 rays, 18 ms.

**0 blocking**, 120 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 115 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 30 |
| opening | info | 6 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 115)

| at | part | aspect | longest |
|---|---|---|---|
| -0.47, 2.10, 0.01 | garage.lod1/stone_blue | 67 | 2.8 |
| -0.47, 2.10, 0.04 | garage.lod1/stone_blue | 330 | 2.8 |
| -0.47, 2.31, 0.04 | garage.lod1/stone_blue | 146 | 2.8 |
| -0.47, 2.32, 0.02 | garage.lod1/stone_blue | 78 | 2.8 |
| -0.43, -0.00, -0.30 | garage.lod1/stone_blue | 47 | 2.561 |
| 0.43, -0.00, 0.10 | garage.lod1/stone_blue | 47 | 2.561 |
| 0.47, 2.10, 0.02 | garage.lod1/stone_blue | 67 | 2.8 |
| 0.47, 2.10, 0.04 | garage.lod1/stone_blue | 330 | 2.8 |
| 0.47, 2.31, 0.03 | garage.lod1/stone_blue | 146 | 2.8 |
| 0.47, 2.32, 0.00 | garage.lod1/stone_blue | 78 | 2.8 |
| 0.43, -0.02, -0.30 | garage.lod1/stone_blue | 47 | 2.561 |
| -0.43, -0.02, 0.10 | garage.lod1/stone_blue | 47 | 2.561 |
| -0.39, 0.03, -0.26 | garage.lod1/metal_anodised | 64 | 2.35 |
| -0.39, 0.04, -0.24 | garage.lod1/metal_anodised | 84 | 2.35 |
| -0.39, 0.06, -0.25 | garage.lod1/metal_anodised | 64 | 2.35 |
| -0.39, 0.05, -0.28 | garage.lod1/metal_anodised | 84 | 2.35 |
| 0.39, 0.03, -0.25 | garage.lod1/metal_anodised | 64 | 2.35 |
| 0.39, 0.05, -0.24 | garage.lod1/metal_anodised | 84 | 2.35 |
| 0.39, 0.06, -0.26 | garage.lod1/metal_anodised | 64 | 2.35 |
| 0.39, 0.04, -0.28 | garage.lod1/metal_anodised | 84 | 2.35 |
| -1.14, 0.68, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| -1.16, 0.68, -0.22 | garage.lod1/garage_steel | 41 | 2.043 |
| -1.19, 0.69, 0.00 | garage.lod1/garage_steel | 123 | 2.092 |
| -1.25, 0.72, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.40, 2.14, -0.00 | garage.lod1/garage_steel | 46 | 2.51 |
| -0.38, 2.04, -0.22 | garage.lod1/garage_steel | 379 | 2.276 |
| -0.40, 2.06, -0.22 | garage.lod1/garage_steel | 48 | 2.327 |
| -0.40, 2.09, 0.00 | garage.lod1/garage_steel | 141 | 2.388 |
| -0.42, 2.12, 0.01 | garage.lod1/garage_steel | 46 | 2.456 |
| -0.42, 2.15, 0.00 | garage.lod1/garage_steel | 209 | 2.51 |
| 1.14, 1.36, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| 1.17, 1.37, -0.22 | garage.lod1/garage_steel | 42 | 2.092 |
| 1.20, 1.40, 0.00 | garage.lod1/garage_steel | 124 | 2.104 |
| 1.25, 1.44, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.39, 0.06, -0.27 | garage.lod1/garage_steel | 62 | 2.35 |
| -0.39, 0.06, -0.24 | garage.lod1/garage_steel | 415 | 2.35 |
| -0.39, 0.56, -0.24 | garage.lod1/garage_steel | 166 | 2.35 |
| -0.39, 0.56, -0.26 | garage.lod1/garage_steel | 73 | 2.35 |
| -0.39, 0.56, -0.27 | garage.lod1/garage_steel | 65 | 2.35 |
| -0.39, 0.56, -0.24 | garage.lod1/garage_steel | 277 | 2.35 |

(75 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod1/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -1.20, 0.00, 0.00 | wall/wall | 5.2 |
| 1.20, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 30)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.23, 0.01, -0.00 | garage.lod1/stone_blue + garage.lod1/garage_steel | 1.39 | 36 | 90 |
| -1.23, 0.00, -0.00 | garage.lod1/garage_steel + ground/ground | 1.39 | 36 | 90 |
| -1.15, 0.82, -0.23 | garage.lod1/garage_steel + garage.lod1/rubber_black | 12.82 | 32 | 90 |
| -1.14, 0.06, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 32 | 45 |
| -1.14, 0.57, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -1.13, 1.07, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -1.13, 1.58, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 6.45 | 24 | 45 |
| -1.25, 2.10, 0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 9.85 | 19 | 45 |
| -1.14, 0.01, -0.24 | garage.lod1/stone_blue + garage.lod1/rubber_black | 0.13 | 17 | 89.9 |
| -1.14, 0.00, -0.24 | garage.lod1/rubber_black + ground/ground | 0.13 | 17 | 89.9 |
| -1.02, 0.01, -0.27 | garage.lod1/stone_blue + garage.lod1/rubber_black | 4.73 | 12 | 61.4 |
| -0.89, 0.03, -0.25 | garage.lod1/metal_anodised + garage.lod1/rubber_black | 4.73 | 11 | 32 |
| -1.28, 0.00, -0.24 | garage.lod1/stone_blue + ground/ground | 5.92 | 8 | 90 |
| -1.30, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.40, 2.12, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -0.17, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 4.8 | 5 | 90 |
| -0.61, 0.06, -0.25 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 4.52 | 5 | 5.4 |
| -1.25, 0.36, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| 1.25, 1.44, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| -1.28, -0.03, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| 1.28, 0.01, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| -1.19, -0.00, 0.00 | garage.lod1/garage_steel + wall/wall | 0.02 | 4 | 45 |
| 1.16, -0.04, 0.00 | garage.lod1/stone_blue + wall/wall | 2.4 | 3 | 90 |
| -0.77, 2.15, 0.00 | garage.lod1/garage_steel + wall/wall | 2.4 | 3 | 90 |
| -1.89, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 3 | 90 |
| -1.04, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.35 | 2 | 45 |
| -1.04, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.35 | 2 | 45 |
| -1.04, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 2.35 | 2 | 45 |
| 2.31, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 2 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 2.4 | 1 | 90 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| 1.20, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| 0.22, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00948 |
| 1.19, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00008 |
| -0.80, 0.06, -0.26 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.0203 |
| -0.34, 0.06, -0.27 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.01977 |
| -0.92, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02187 |
| 0.38, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01573 |
| 0.31, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01991 |
| -0.92, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02187 |
| 0.38, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01573 |
| 0.31, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01991 |
| -0.92, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.02187 |
| 0.38, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01573 |
| 0.31, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01991 |
| 0.81, 0.56, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01769 |
| 0.81, 1.07, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01769 |
| 0.81, 1.57, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01769 |
