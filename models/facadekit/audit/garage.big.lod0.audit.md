# Kit audit: garage.big LOD0

1,146 triangles, 606 welded vertices, 20 open edges, 17,436 rays, 69 ms.

**0 blocking**, 377 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 372 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 34 |
| opening | info | 6 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 372)

| at | part | aspect | longest |
|---|---|---|---|
| -0.57, 2.10, 0.00 | garage.lod0/stone_blue | 113 | 3.4 |
| -0.57, 2.10, 0.02 | garage.lod0/stone_blue | 425 | 3.4 |
| -0.57, 2.11, 0.03 | garage.lod0/stone_blue | 425 | 3.4 |
| -0.57, 2.10, 0.03 | garage.lod0/stone_blue | 425 | 3.4 |
| -0.57, 2.10, 0.03 | garage.lod0/stone_blue | 850 | 3.4 |
| -0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| -0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| -0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| -0.57, 2.31, 0.04 | garage.lod0/stone_blue | 177 | 3.4 |
| -0.57, 2.32, 0.02 | garage.lod0/stone_blue | 94 | 3.4 |
| -1.57, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.58, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.57, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.58, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 0.52, 0.01, -0.30 | garage.lod0/stone_blue | 513 | 3.144 |
| 0.52, 0.01, -0.30 | garage.lod0/stone_blue | 513 | 3.144 |
| -0.52, 0.01, 0.10 | garage.lod0/stone_blue | 513 | 3.144 |
| -0.52, 0.01, 0.10 | garage.lod0/stone_blue | 513 | 3.144 |
| 1.58, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.58, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.57, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.58, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -0.52, -0.03, -0.30 | garage.lod0/stone_blue | 513 | 3.144 |
| -0.52, -0.04, -0.30 | garage.lod0/stone_blue | 513 | 3.144 |
| 0.52, -0.03, 0.10 | garage.lod0/stone_blue | 513 | 3.144 |
| 0.52, -0.04, 0.10 | garage.lod0/stone_blue | 513 | 3.144 |
| -0.52, -0.01, -0.30 | garage.lod0/stone_blue | 81 | 3.144 |
| 0.52, -0.01, 0.10 | garage.lod0/stone_blue | 81 | 3.144 |
| 0.57, 2.10, 0.01 | garage.lod0/stone_blue | 113 | 3.4 |
| 0.57, 2.10, 0.02 | garage.lod0/stone_blue | 425 | 3.4 |
| 0.57, 2.11, 0.03 | garage.lod0/stone_blue | 425 | 3.4 |
| 0.57, 2.10, 0.03 | garage.lod0/stone_blue | 425 | 3.4 |
| 0.57, 2.10, 0.03 | garage.lod0/stone_blue | 850 | 3.4 |
| 0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| 0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| 0.57, 2.10, 0.04 | garage.lod0/stone_blue | 1095 | 3.4 |
| 0.57, 2.31, 0.03 | garage.lod0/stone_blue | 177 | 3.4 |
| 0.57, 2.32, 0.00 | garage.lod0/stone_blue | 94 | 3.4 |
| -1.58, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.58, -0.03, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |

(332 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod0/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -1.50, 0.00, 0.00 | wall/wall | 5.2 |
| 1.50, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 34)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.44, 0.06, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 102 | 25.2 |
| -1.43, 1.07, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 90 | 25.2 |
| -1.44, 0.56, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 88 | 25.2 |
| -1.43, 1.58, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 7.67 | 78 | 25.2 |
| -1.53, 0.01, -0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 1.38 | 60 | 90 |
| -1.53, 0.00, -0.00 | garage.lod0/garage_steel + ground/ground | 1.38 | 46 | 90 |
| 1.29, 0.72, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 42 | 90 |
| -1.45, 0.82, -0.23 | garage.lod0/garage_steel + garage.lod0/rubber_black | 20.98 | 37 | 66.8 |
| -1.44, 0.01, -0.24 | garage.lod0/stone_blue + garage.lod0/rubber_black | 0.13 | 28 | 90 |
| -1.57, 0.00, -0.30 | garage.lod0/stone_blue + ground/ground | 7.1 | 24 | 90 |
| 1.27, 0.60, -0.24 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.44 | 24 | 67.5 |
| -1.55, 2.10, 0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 12.25 | 23 | 78.7 |
| -1.44, 0.00, -0.24 | garage.lod0/rubber_black + ground/ground | 0.13 | 22 | 90 |
| 1.30, 0.77, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 18 | 90 |
| 1.30, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.06 | 18 | 90 |
| -1.29, 0.01, -0.27 | garage.lod0/stone_blue + garage.lod0/rubber_black | 5.94 | 14 | 45 |
| -1.57, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| 1.58, 0.01, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| -1.49, -0.00, 0.00 | garage.lod0/garage_steel + wall/wall | 0.03 | 11 | 78.8 |
| -1.21, 0.03, -0.25 | garage.lod0/metal_anodised + garage.lod0/rubber_black | 5.93 | 10 | 90 |
| -1.48, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 6.04 | 8 | 11.3 |
| -1.60, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.70, 2.29, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -1.55, 0.54, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| 1.55, 1.61, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| -0.35, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 6 | 5 | 90 |
| 1.45, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 3 | 3 | 90 |
| -0.71, 2.15, 0.00 | garage.lod0/garage_steel + wall/wall | 3 | 3 | 90 |
| -2.08, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 3 | 90 |
| -1.31, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.95 | 2 | 11.2 |
| -1.31, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.95 | 2 | 11.2 |
| -1.31, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.95 | 2 | 11.3 |
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

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.23, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.01164 |
| 1.48, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00008 |
| 1.41, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00025 |
| -1.00, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02549 |
| -0.05, 0.06, -0.25 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02618 |
| 1.29, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00025 |
| 1.30, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00026 |
| 1.29, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00005 |
| -0.42, 0.06, -0.27 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02482 |
| 1.12, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02972 |
| -1.16, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02746 |
| 0.47, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01974 |
| 0.39, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02499 |
| -1.16, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02746 |
| 0.47, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01974 |
| 0.39, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02499 |
| -1.16, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02746 |
| 0.47, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01974 |
| 0.39, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02499 |
| 1.01, 0.56, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02221 |
| 1.01, 1.07, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02221 |
| 1.01, 1.57, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02221 |
