# Kit audit: garage.small LOD1

246 triangles, 148 welded vertices, 20 open edges, 17,126 rays, 10 ms.

**0 blocking**, 110 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 105 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 30 |
| opening | info | 6 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 105)

| at | part | aspect | longest |
|---|---|---|---|
| -0.38, 2.10, 0.01 | garage.lod1/stone_blue | 54 | 2.272 |
| -0.38, 2.10, 0.04 | garage.lod1/stone_blue | 268 | 2.272 |
| -0.38, 2.31, 0.04 | garage.lod1/stone_blue | 118 | 2.272 |
| -0.38, 2.32, 0.02 | garage.lod1/stone_blue | 63 | 2.272 |
| 0.38, 2.10, 0.02 | garage.lod1/stone_blue | 54 | 2.272 |
| 0.38, 2.10, 0.04 | garage.lod1/stone_blue | 268 | 2.272 |
| 0.38, 2.31, 0.03 | garage.lod1/stone_blue | 118 | 2.272 |
| 0.38, 2.32, 0.00 | garage.lod1/stone_blue | 63 | 2.272 |
| -0.30, 0.03, -0.26 | garage.lod1/metal_anodised | 49 | 1.822 |
| -0.30, 0.04, -0.24 | garage.lod1/metal_anodised | 65 | 1.822 |
| -0.30, 0.06, -0.25 | garage.lod1/metal_anodised | 49 | 1.822 |
| -0.30, 0.05, -0.28 | garage.lod1/metal_anodised | 65 | 1.822 |
| 0.30, 0.03, -0.25 | garage.lod1/metal_anodised | 49 | 1.822 |
| 0.30, 0.05, -0.24 | garage.lod1/metal_anodised | 65 | 1.822 |
| 0.30, 0.06, -0.26 | garage.lod1/metal_anodised | 49 | 1.822 |
| 0.30, 0.04, -0.28 | garage.lod1/metal_anodised | 65 | 1.822 |
| -0.87, 0.68, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| -0.89, 0.68, -0.22 | garage.lod1/garage_steel | 41 | 2.043 |
| -0.93, 0.69, 0.00 | garage.lod1/garage_steel | 123 | 2.092 |
| -0.99, 0.72, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.29, 2.04, -0.22 | garage.lod1/garage_steel | 291 | 1.748 |
| -0.31, 2.09, 0.00 | garage.lod1/garage_steel | 110 | 1.86 |
| -0.33, 2.15, 0.00 | garage.lod1/garage_steel | 165 | 1.982 |
| 0.87, 1.36, -0.22 | garage.lod1/garage_steel | 340 | 2.042 |
| 0.91, 1.37, -0.22 | garage.lod1/garage_steel | 42 | 2.092 |
| 0.93, 1.40, 0.00 | garage.lod1/garage_steel | 124 | 2.104 |
| 0.99, 1.44, 0.00 | garage.lod1/garage_steel | 180 | 2.159 |
| -0.30, 0.06, -0.27 | garage.lod1/garage_steel | 48 | 1.822 |
| -0.30, 0.06, -0.24 | garage.lod1/garage_steel | 322 | 1.822 |
| -0.30, 0.56, -0.24 | garage.lod1/garage_steel | 129 | 1.822 |
| -0.30, 0.56, -0.26 | garage.lod1/garage_steel | 57 | 1.822 |
| -0.30, 0.56, -0.27 | garage.lod1/garage_steel | 51 | 1.822 |
| -0.30, 0.56, -0.24 | garage.lod1/garage_steel | 215 | 1.822 |
| -0.30, 1.06, -0.24 | garage.lod1/garage_steel | 129 | 1.822 |
| -0.30, 1.07, -0.26 | garage.lod1/garage_steel | 57 | 1.822 |
| -0.30, 1.07, -0.27 | garage.lod1/garage_steel | 51 | 1.822 |
| -0.30, 1.07, -0.24 | garage.lod1/garage_steel | 215 | 1.822 |
| -0.30, 1.57, -0.24 | garage.lod1/garage_steel | 129 | 1.822 |
| -0.30, 1.57, -0.26 | garage.lod1/garage_steel | 57 | 1.822 |
| -0.30, 1.57, -0.27 | garage.lod1/garage_steel | 51 | 1.822 |

(65 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod1/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod1/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -0.94, 0.00, 0.00 | wall/wall | 5.2 |
| 0.94, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 30)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.96, 0.01, -0.00 | garage.lod1/stone_blue + garage.lod1/garage_steel | 1.39 | 36 | 90 |
| -0.96, 0.00, -0.00 | garage.lod1/garage_steel + ground/ground | 1.39 | 36 | 90 |
| -0.89, 0.82, -0.23 | garage.lod1/garage_steel + garage.lod1/rubber_black | 11.77 | 32 | 90 |
| -0.88, 0.06, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 32 | 45 |
| -0.87, 0.57, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -0.87, 1.07, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 2.07 | 28 | 45 |
| -0.87, 1.58, -0.24 | garage.lod1/garage_steel + garage.lod1/rubber_black | 5.39 | 24 | 45 |
| -0.99, 2.10, 0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 7.74 | 19 | 45 |
| -0.88, 0.01, -0.24 | garage.lod1/stone_blue + garage.lod1/rubber_black | 0.13 | 17 | 89.9 |
| -0.88, 0.00, -0.24 | garage.lod1/rubber_black + ground/ground | 0.13 | 17 | 89.9 |
| -0.79, 0.01, -0.27 | garage.lod1/stone_blue + garage.lod1/rubber_black | 3.68 | 12 | 61.4 |
| -0.69, 0.03, -0.25 | garage.lod1/metal_anodised + garage.lod1/rubber_black | 3.68 | 11 | 32 |
| -1.02, 0.00, -0.24 | garage.lod1/stone_blue + ground/ground | 4.86 | 8 | 90 |
| -1.04, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.14, 2.12, 0.00 | garage.lod1/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -0.12, 2.10, 0.00 | garage.lod1/stone_blue + wall/wall | 3.74 | 5 | 90 |
| -0.47, 0.06, -0.25 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 3.52 | 5 | 5.4 |
| -0.93, -0.00, 0.00 | garage.lod1/garage_steel + wall/wall | 0.02 | 5 | 45 |
| -0.99, 0.36, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| 0.99, 1.44, 0.00 | garage.lod1/garage_steel + wall/wall | 2.27 | 5 | 90 |
| -1.02, -0.03, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| 1.02, 0.01, 0.00 | garage.lod1/stone_blue + wall/wall | 0.21 | 4 | 90 |
| 0.91, -0.04, 0.00 | garage.lod1/stone_blue + wall/wall | 1.87 | 3 | 90 |
| -0.61, 2.15, 0.00 | garage.lod1/garage_steel + wall/wall | 1.87 | 3 | 90 |
| -1.73, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 3 | 90 |
| -0.81, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 1.82 | 2 | 45 |
| -0.81, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 1.82 | 2 | 45 |
| -0.81, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 1.82 | 2 | 45 |
| 2.21, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 2 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 1.87 | 1 | 90 |

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| 0.94, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -0.89, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.872 |
| 0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| 0.18, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00742 |
| 0.93, 2.10, -0.01 | garage.lod1/stone_blue + garage.lod1/garage_steel | 0.00007 |
| -0.69, 0.06, -0.26 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.01574 |
| -0.26, 0.06, -0.27 | garage.lod1/metal_anodised + garage.lod1/garage_steel | 0.01533 |
| -0.72, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01696 |
| 0.29, 0.56, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01219 |
| 0.24, 0.56, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01543 |
| -0.72, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01696 |
| 0.29, 1.07, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01219 |
| 0.24, 1.07, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01543 |
| -0.72, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01696 |
| 0.29, 1.57, -0.25 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01219 |
| 0.24, 1.57, -0.27 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01543 |
| 0.63, 0.56, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01372 |
| 0.63, 1.07, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01372 |
| 0.63, 1.57, -0.26 | garage.lod1/garage_steel + garage.lod1/garage_steel | 0.01372 |
