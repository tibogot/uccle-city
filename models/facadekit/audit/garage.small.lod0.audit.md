# Kit audit: garage.small LOD0

1,146 triangles, 606 welded vertices, 20 open edges, 17,126 rays, 46 ms.

**0 blocking**, 371 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 366 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 34 |
| opening | info | 6 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 366)

| at | part | aspect | longest |
|---|---|---|---|
| -0.38, 2.10, 0.00 | garage.lod0/stone_blue | 76 | 2.272 |
| -0.38, 2.10, 0.02 | garage.lod0/stone_blue | 284 | 2.272 |
| -0.38, 2.11, 0.03 | garage.lod0/stone_blue | 284 | 2.272 |
| -0.38, 2.10, 0.03 | garage.lod0/stone_blue | 284 | 2.272 |
| -0.38, 2.10, 0.03 | garage.lod0/stone_blue | 568 | 2.272 |
| -0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| -0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| -0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| -0.38, 2.31, 0.04 | garage.lod0/stone_blue | 118 | 2.272 |
| -0.38, 2.32, 0.02 | garage.lod0/stone_blue | 63 | 2.272 |
| -1.01, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.01, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.01, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.01, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 0.34, 0.01, -0.30 | garage.lod0/stone_blue | 329 | 2.016 |
| 0.34, 0.01, -0.30 | garage.lod0/stone_blue | 329 | 2.016 |
| -0.34, 0.01, 0.10 | garage.lod0/stone_blue | 329 | 2.016 |
| -0.34, 0.01, 0.10 | garage.lod0/stone_blue | 329 | 2.016 |
| 1.01, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.01, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.01, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.01, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -0.34, -0.03, -0.30 | garage.lod0/stone_blue | 329 | 2.016 |
| -0.34, -0.04, -0.30 | garage.lod0/stone_blue | 329 | 2.016 |
| 0.34, -0.03, 0.10 | garage.lod0/stone_blue | 329 | 2.016 |
| 0.34, -0.04, 0.10 | garage.lod0/stone_blue | 329 | 2.016 |
| -0.34, -0.01, -0.30 | garage.lod0/stone_blue | 52 | 2.016 |
| 0.34, -0.01, 0.10 | garage.lod0/stone_blue | 52 | 2.016 |
| 0.38, 2.10, 0.01 | garage.lod0/stone_blue | 76 | 2.272 |
| 0.38, 2.10, 0.02 | garage.lod0/stone_blue | 284 | 2.272 |
| 0.38, 2.11, 0.03 | garage.lod0/stone_blue | 284 | 2.272 |
| 0.38, 2.10, 0.03 | garage.lod0/stone_blue | 284 | 2.272 |
| 0.38, 2.10, 0.03 | garage.lod0/stone_blue | 568 | 2.272 |
| 0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| 0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| 0.38, 2.10, 0.04 | garage.lod0/stone_blue | 732 | 2.272 |
| 0.38, 2.31, 0.03 | garage.lod0/stone_blue | 118 | 2.272 |
| 0.38, 2.32, 0.00 | garage.lod0/stone_blue | 63 | 2.272 |
| -1.01, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.01, -0.03, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |

(326 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod0/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -0.94, 0.00, 0.00 | wall/wall | 5.2 |
| 0.94, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 34)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.88, 0.06, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 102 | 25.2 |
| -0.87, 1.07, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 90 | 25.2 |
| -0.87, 0.56, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 88 | 25.2 |
| -0.87, 1.58, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 5.41 | 78 | 25.2 |
| -0.96, 0.01, -0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 1.38 | 60 | 90 |
| -0.96, 0.00, -0.00 | garage.lod0/garage_steel + ground/ground | 1.38 | 46 | 90 |
| 0.73, 0.72, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 42 | 90 |
| -0.89, 0.82, -0.23 | garage.lod0/garage_steel + garage.lod0/rubber_black | 17.6 | 37 | 66.8 |
| -0.88, 0.01, -0.24 | garage.lod0/stone_blue + garage.lod0/rubber_black | 0.13 | 28 | 90 |
| -1.01, 0.00, -0.30 | garage.lod0/stone_blue + ground/ground | 4.85 | 24 | 90 |
| 0.71, 0.60, -0.24 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.44 | 24 | 67.5 |
| -0.99, 2.10, 0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 7.74 | 23 | 78.7 |
| -0.88, 0.00, -0.24 | garage.lod0/rubber_black + ground/ground | 0.13 | 22 | 90 |
| 0.73, 0.77, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 18 | 90 |
| 0.74, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.06 | 18 | 90 |
| -0.79, 0.01, -0.27 | garage.lod0/stone_blue + garage.lod0/rubber_black | 3.68 | 14 | 45 |
| -1.01, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| 1.01, 0.01, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| -0.93, -0.00, 0.00 | garage.lod0/garage_steel + wall/wall | 0.03 | 11 | 78.8 |
| -0.75, 0.03, -0.25 | garage.lod0/metal_anodised + garage.lod0/rubber_black | 3.67 | 10 | 90 |
| -0.91, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 3.79 | 8 | 11.3 |
| -1.04, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.14, 2.29, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -0.99, 0.54, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| 0.99, 1.61, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| -0.20, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 3.74 | 5 | 90 |
| 0.91, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 1.87 | 3 | 90 |
| -0.44, 2.15, 0.00 | garage.lod0/garage_steel + wall/wall | 1.87 | 3 | 90 |
| -1.73, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 3 | 90 |
| -0.81, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 1.82 | 2 | 11.2 |
| -0.81, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 1.82 | 2 | 11.2 |
| -0.81, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 1.82 | 2 | 11.3 |
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

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.16, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00736 |
| 0.93, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00006 |
| 0.90, 2.10, -0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00006 |
| -0.69, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.01574 |
| -0.25, 0.06, -0.24 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.01617 |
| 0.72, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00025 |
| 0.74, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00026 |
| 0.73, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00005 |
| -0.26, 0.06, -0.27 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.01533 |
| 0.69, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.01835 |
| -0.72, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01696 |
| 0.29, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01219 |
| 0.24, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01543 |
| -0.72, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01696 |
| 0.29, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01219 |
| 0.24, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01543 |
| -0.72, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01696 |
| 0.29, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01219 |
| 0.24, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01543 |
| 0.63, 0.56, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01372 |
| 0.63, 1.07, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01372 |
| 0.63, 1.57, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01372 |
