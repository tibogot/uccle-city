# Mesh audit: fuelkit.glb

588 triangles, 308 welded vertices, 0 open edges, 0 rays, 44 ms.

**0 blocking**, 122 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 120 |
| nonmanifold | warn | 2 |
| seam | info | 5 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 120)

| at | part | aspect | longest |
|---|---|---|---|
| -0.74, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.74, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.01 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.01 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| -0.71, 1.98, 0.14 | shopfront/trim_alu | 63 | 3.038 |
| -0.73, 0.97, 0.14 | shopfront/trim_alu | 63 | 3.038 |
| -0.73, 1.98, 0.00 | shopfront/trim_alu | 63 | 3.038 |
| -0.71, 0.97, 0.00 | shopfront/trim_alu | 63 | 3.038 |
| 0.69, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.01 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.01 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.74, 1.98, 0.00 | shopfront/trim_alu | 662 | 3.038 |
| 0.74, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.14 | shopfront/trim_alu | 662 | 3.038 |
| 0.73, 1.98, 0.14 | shopfront/trim_alu | 63 | 3.038 |
| 0.71, 0.97, 0.14 | shopfront/trim_alu | 63 | 3.038 |
| 0.71, 1.98, 0.00 | shopfront/trim_alu | 63 | 3.038 |
| 0.73, 0.97, 0.00 | shopfront/trim_alu | 63 | 3.038 |

(80 more in the JSON)

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -0.69, 2.99, 0.07 | shopfront/trim_alu | 4 |
| 0.69, 2.99, 0.07 | shopfront/trim_alu | 4 |

## seam (info, 5)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.69, 2.50, 0.01 | shopfront/trim_alu + shopfront/trim_alu | 0.78 | 10 | 22.5 |
| 0.69, 2.50, 0.13 | shopfront/trim_alu + shopfront/trim_alu | 0.78 | 10 | 22.5 |
| -0.69, 0.24, 0.01 | shopfront/trim_alu + shopfront/plastic_dark | 0.8 | 7 | 22.5 |
| -0.69, 2.93, 0.07 | shopfront/trim_alu + shopfront/trim_alu | 0.13 | 2 | 22.5 |
| 0.69, 2.93, 0.07 | shopfront/trim_alu + shopfront/trim_alu | 0.13 | 2 | 22.5 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| -0.69, 0.24, 0.01 | shopfront/trim_alu + shopfront/plastic_dark | 0.00023 |
| -0.69, 0.14, 0.01 | shopfront/trim_alu + shopfront/plastic_dark | 0.00154 |
| -0.69, 2.52, 0.08 | shopfront/trim_alu + shopfront/trim_alu | 0.00397 |
| -0.69, 2.48, 0.06 | shopfront/trim_alu + shopfront/trim_alu | 0.00546 |
| -0.69, 2.98, 0.10 | shopfront/trim_alu + shopfront/trim_alu | 0.00426 |
| -0.69, 2.94, 0.07 | shopfront/trim_alu + shopfront/trim_alu | 0.00435 |
| -0.69, 0.12, 0.08 | shopfront/trim_alu + shopfront/plastic_dark | 0.01611 |
| -0.69, 0.04, 0.05 | shopfront/trim_alu + shopfront/plastic_dark | 0.01401 |
| -0.69, 2.50, 0.12 | shopfront/trim_alu + shopfront/trim_alu | 0.00166 |
| -0.69, 2.46, 0.12 | shopfront/trim_alu + shopfront/trim_alu | 0.00017 |
| -0.69, 2.97, 0.13 | shopfront/trim_alu + shopfront/trim_alu | 0.0001 |
| 0.69, 2.52, 0.06 | shopfront/trim_alu + shopfront/trim_alu | 0.00397 |
| 0.69, 2.48, 0.08 | shopfront/trim_alu + shopfront/trim_alu | 0.00546 |
| 0.69, 2.98, 0.04 | shopfront/trim_alu + shopfront/trim_alu | 0.00426 |
| 0.69, 2.94, 0.07 | shopfront/trim_alu + shopfront/trim_alu | 0.00435 |
| 0.69, 0.15, 0.04 | shopfront/trim_alu + shopfront/plastic_dark | 0.01577 |
| 0.69, 0.03, 0.06 | shopfront/trim_alu + shopfront/plastic_dark | 0.01613 |
| 0.69, 2.50, 0.02 | shopfront/trim_alu + shopfront/trim_alu | 0.00166 |
| 0.69, 2.46, 0.02 | shopfront/trim_alu + shopfront/trim_alu | 0.00017 |
| 0.69, 2.97, 0.01 | shopfront/trim_alu + shopfront/trim_alu | 0.0001 |


Nodes: shopfront, shopfront__glass. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
