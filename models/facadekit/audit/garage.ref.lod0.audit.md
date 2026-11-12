# Kit audit: garage.ref LOD0

1,146 triangles, 606 welded vertices, 20 open edges, 17,232 rays, 48 ms.

**0 blocking**, 375 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 370 |
| nonmanifold | warn | 3 |
| tjunction | warn | 2 |
| seam | info | 34 |
| opening | info | 6 |
| backtoback | info | 22 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 370)

| at | part | aspect | longest |
|---|---|---|---|
| -0.47, 2.10, 0.00 | garage.lod0/stone_blue | 93 | 2.8 |
| -0.47, 2.10, 0.02 | garage.lod0/stone_blue | 350 | 2.8 |
| -0.47, 2.11, 0.03 | garage.lod0/stone_blue | 350 | 2.8 |
| -0.47, 2.10, 0.03 | garage.lod0/stone_blue | 350 | 2.8 |
| -0.47, 2.10, 0.03 | garage.lod0/stone_blue | 700 | 2.8 |
| -0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| -0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| -0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| -0.47, 2.31, 0.04 | garage.lod0/stone_blue | 146 | 2.8 |
| -0.47, 2.32, 0.02 | garage.lod0/stone_blue | 78 | 2.8 |
| -1.27, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.28, -0.04, -0.16 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.27, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.28, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 0.42, 0.01, -0.30 | garage.lod0/stone_blue | 415 | 2.544 |
| 0.42, 0.01, -0.30 | garage.lod0/stone_blue | 415 | 2.544 |
| -0.42, 0.01, 0.10 | garage.lod0/stone_blue | 415 | 2.544 |
| -0.42, 0.01, 0.10 | garage.lod0/stone_blue | 415 | 2.544 |
| 1.28, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.28, 0.01, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.27, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| 1.28, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -0.42, -0.03, -0.30 | garage.lod0/stone_blue | 415 | 2.544 |
| -0.42, -0.04, -0.30 | garage.lod0/stone_blue | 415 | 2.544 |
| 0.42, -0.03, 0.10 | garage.lod0/stone_blue | 415 | 2.544 |
| 0.42, -0.04, 0.10 | garage.lod0/stone_blue | 415 | 2.544 |
| -0.42, -0.01, -0.30 | garage.lod0/stone_blue | 65 | 2.544 |
| 0.42, -0.01, 0.10 | garage.lod0/stone_blue | 65 | 2.544 |
| 0.47, 2.10, 0.01 | garage.lod0/stone_blue | 93 | 2.8 |
| 0.47, 2.10, 0.02 | garage.lod0/stone_blue | 350 | 2.8 |
| 0.47, 2.11, 0.03 | garage.lod0/stone_blue | 350 | 2.8 |
| 0.47, 2.10, 0.03 | garage.lod0/stone_blue | 350 | 2.8 |
| 0.47, 2.10, 0.03 | garage.lod0/stone_blue | 700 | 2.8 |
| 0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| 0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| 0.47, 2.10, 0.04 | garage.lod0/stone_blue | 902 | 2.8 |
| 0.47, 2.31, 0.03 | garage.lod0/stone_blue | 146 | 2.8 |
| 0.47, 2.32, 0.00 | garage.lod0/stone_blue | 78 | 2.8 |
| -1.28, -0.04, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |
| -1.28, -0.03, -0.04 | garage.lod0/stone_blue | 63 | 0.384 |

(330 more in the JSON)

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| 0.00, 0.56, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.07, -0.28 | garage.lod0/garage_steel | 4 |
| 0.00, 1.57, -0.28 | garage.lod0/garage_steel | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -1.20, 0.00, 0.00 | wall/wall | 5.2 |
| 1.20, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 34)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.14, 0.06, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 102 | 25.2 |
| -1.13, 1.07, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 90 | 25.2 |
| -1.14, 0.56, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 2.1 | 88 | 25.2 |
| -1.13, 1.58, -0.24 | garage.lod0/garage_steel + garage.lod0/rubber_black | 6.47 | 78 | 25.2 |
| -1.23, 0.01, -0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 1.38 | 60 | 90 |
| -1.23, 0.00, -0.00 | garage.lod0/garage_steel + ground/ground | 1.38 | 46 | 90 |
| 0.99, 0.72, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 42 | 90 |
| -1.15, 0.82, -0.23 | garage.lod0/garage_steel + garage.lod0/rubber_black | 19.18 | 37 | 66.8 |
| -1.14, 0.01, -0.24 | garage.lod0/stone_blue + garage.lod0/rubber_black | 0.13 | 28 | 90 |
| -1.27, 0.00, -0.30 | garage.lod0/stone_blue + ground/ground | 5.9 | 24 | 90 |
| 0.97, 0.60, -0.24 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.44 | 24 | 67.5 |
| -1.25, 2.10, 0.00 | garage.lod0/stone_blue + garage.lod0/garage_steel | 9.85 | 23 | 78.7 |
| -1.14, 0.00, -0.24 | garage.lod0/rubber_black + ground/ground | 0.13 | 22 | 90 |
| 1.00, 0.77, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.1 | 18 | 90 |
| 1.00, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.06 | 18 | 90 |
| -1.02, 0.01, -0.27 | garage.lod0/stone_blue + garage.lod0/rubber_black | 4.74 | 14 | 45 |
| -1.27, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| 1.28, 0.01, 0.00 | garage.lod0/stone_blue + wall/wall | 0.21 | 12 | 90 |
| -1.19, -0.00, 0.00 | garage.lod0/garage_steel + wall/wall | 0.03 | 11 | 78.8 |
| -0.97, 0.03, -0.25 | garage.lod0/metal_anodised + garage.lod0/rubber_black | 4.73 | 10 | 90 |
| -1.18, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 4.84 | 8 | 11.3 |
| -1.30, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| 1.40, 2.29, 0.00 | garage.lod0/stone_blue + wall/wall | 0.62 | 6 | 90 |
| -1.25, 0.54, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| 1.25, 1.61, 0.00 | garage.lod0/garage_steel + wall/wall | 2.27 | 6 | 90 |
| -0.27, 2.10, 0.00 | garage.lod0/stone_blue + wall/wall | 4.8 | 5 | 90 |
| 1.16, -0.04, 0.00 | garage.lod0/stone_blue + wall/wall | 2.4 | 3 | 90 |
| -0.56, 2.15, 0.00 | garage.lod0/garage_steel + wall/wall | 2.4 | 3 | 90 |
| -1.89, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 3 | 90 |
| -1.04, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.35 | 2 | 11.2 |
| -1.04, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.35 | 2 | 11.2 |
| -1.04, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 2.35 | 2 | 11.3 |
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

## backtoback (info, 22)

| at | parts | area |
|---|---|---|
| 0.19, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00937 |
| 1.19, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00007 |
| 1.14, 2.10, -0.01 | garage.lod0/stone_blue + garage.lod0/garage_steel | 0.00014 |
| -0.80, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.0203 |
| -0.04, 0.06, -0.25 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02085 |
| 0.99, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00025 |
| 1.00, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00026 |
| 0.99, 0.75, -0.23 | garage.lod0/metal_anodised + garage.lod0/metal_anodised | 0.00005 |
| -0.34, 0.06, -0.27 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.01977 |
| 0.89, 0.06, -0.26 | garage.lod0/metal_anodised + garage.lod0/garage_steel | 0.02367 |
| -0.92, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02187 |
| 0.38, 0.56, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01573 |
| 0.31, 0.56, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01991 |
| -0.92, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02187 |
| 0.38, 1.07, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01573 |
| 0.31, 1.07, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01991 |
| -0.92, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.02187 |
| 0.38, 1.57, -0.25 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01573 |
| 0.31, 1.57, -0.27 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01991 |
| 0.81, 0.56, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01769 |
| 0.81, 1.07, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01769 |
| 0.81, 1.57, -0.26 | garage.lod0/garage_steel + garage.lod0/garage_steel | 0.01769 |
