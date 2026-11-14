# Mesh audit: fuelkit.glb

1,020 triangles, 532 welded vertices, 0 open edges, 0 rays, 69 ms.

**0 blocking**, 186 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 184 |
| nonmanifold | warn | 2 |
| seam | info | 11 |
| backtoback | info | 23 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 184)

| at | part | aspect | longest |
|---|---|---|---|
| -0.74, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.74, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.75, 1.98, 0.01 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.01 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.69, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| -0.71, 1.98, 0.14 | shopdoor/trim_alu | 63 | 3.038 |
| -0.73, 0.97, 0.14 | shopdoor/trim_alu | 63 | 3.038 |
| -0.73, 1.98, 0.00 | shopdoor/trim_alu | 63 | 3.038 |
| -0.71, 0.97, 0.00 | shopdoor/trim_alu | 63 | 3.038 |
| 0.69, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.69, 1.98, 0.01 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.01 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.74, 1.98, 0.00 | shopdoor/trim_alu | 662 | 3.038 |
| 0.74, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 0.97, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.75, 1.98, 0.14 | shopdoor/trim_alu | 662 | 3.038 |
| 0.73, 1.98, 0.14 | shopdoor/trim_alu | 63 | 3.038 |
| 0.71, 0.97, 0.14 | shopdoor/trim_alu | 63 | 3.038 |
| 0.71, 1.98, 0.00 | shopdoor/trim_alu | 63 | 3.038 |
| 0.73, 0.97, 0.00 | shopdoor/trim_alu | 63 | 3.038 |

(144 more in the JSON)

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -0.69, 2.99, 0.07 | shopdoor/trim_alu | 4 |
| 0.69, 2.99, 0.07 | shopdoor/trim_alu | 4 |

## seam (info, 11)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.06, 2.27, 0.12 | shopdoor/trim_alu + shopdoor__glass/glass | 9.64 | 20 | 90 |
| 0.01, 2.27, 0.12 | shopdoor/trim_alu + shopdoor__glass/glass | 9.64 | 20 | 90 |
| -0.69, 2.50, 0.01 | shopdoor/trim_alu + shopdoor/trim_alu | 0.78 | 10 | 22.5 |
| 0.69, 2.50, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.78 | 10 | 22.5 |
| -0.69, 0.03, 0.01 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.36 | 7 | 22.5 |
| -0.04, 2.45, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.12 | 5 | 22.5 |
| 0.02, 2.45, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.12 | 5 | 22.5 |
| -0.05, 0.03, 0.12 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.09 | 5 | 22.5 |
| 0.01, 0.03, 0.12 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.09 | 5 | 22.5 |
| -0.69, 2.93, 0.07 | shopdoor/trim_alu + shopdoor/trim_alu | 0.13 | 2 | 22.5 |
| 0.69, 2.93, 0.07 | shopdoor/trim_alu + shopdoor/trim_alu | 0.13 | 2 | 22.5 |

## backtoback (info, 23)

| at | parts | area |
|---|---|---|
| -0.69, 0.00, 0.01 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.0001 |
| -0.69, 2.52, 0.08 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00397 |
| -0.69, 2.48, 0.06 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00546 |
| -0.69, 2.98, 0.10 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00426 |
| -0.69, 2.94, 0.07 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00435 |
| -0.69, -0.00, 0.07 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.00402 |
| -0.69, 2.50, 0.12 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00166 |
| -0.69, 2.46, 0.12 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00017 |
| -0.69, 2.97, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.0001 |
| 0.69, 2.52, 0.06 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00397 |
| 0.69, 2.48, 0.08 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00546 |
| 0.69, 2.98, 0.04 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00426 |
| 0.69, 2.94, 0.07 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00435 |
| 0.69, -0.01, 0.03 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.00389 |
| 0.69, 2.50, 0.02 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00166 |
| 0.69, 2.46, 0.02 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00017 |
| 0.69, 2.97, 0.01 | shopdoor/trim_alu + shopdoor/trim_alu | 0.0001 |
| -0.04, 2.45, 0.12 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00064 |
| -0.02, 2.45, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.0002 |
| 0.03, 2.45, 0.12 | shopdoor/trim_alu + shopdoor/trim_alu | 0.00064 |
| 0.04, 2.45, 0.13 | shopdoor/trim_alu + shopdoor/trim_alu | 0.0002 |
| -0.03, 0.03, 0.12 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.00008 |
| 0.03, 0.03, 0.12 | shopdoor/trim_alu + shopdoor/plastic_dark | 0.00008 |


Nodes: shopdoor, shopdoor__glass. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
