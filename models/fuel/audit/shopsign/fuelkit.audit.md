# Mesh audit: fuelkit.glb

64 triangles, 38 welded vertices, 0 open edges, 0 rays, 7 ms.

**0 blocking**, 12 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 10 |
| nonmanifold | warn | 2 |
| seam | info | 4 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 10)

| at | part | aspect | longest |
|---|---|---|---|
| -0.17, 0.74, 0.01 | shopsign/trim_alu | 101 | 1 |
| 0.17, 0.75, 0.01 | shopsign/trim_alu | 101 | 1 |
| -0.17, 0.08, 0.00 | shopsign/brand_secondary | 167 | 1 |
| 0.17, 0.08, 0.00 | shopsign/brand_secondary | 167 | 1 |
| -0.17, 0.16, 0.00 | shopsign/brand_secondary | 167 | 1 |
| 0.17, 0.16, 0.00 | shopsign/brand_secondary | 167 | 1 |
| -0.17, -0.00, -0.08 | shopsign/led_strip | 167 | 1 |
| 0.17, -0.00, -0.08 | shopsign/led_strip | 167 | 1 |
| -0.17, -0.00, -0.01 | shopsign/led_strip | 167 | 1 |
| 0.17, -0.00, -0.01 | shopsign/led_strip | 167 | 1 |

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| 0.00, 0.05, -0.25 | shopsign/trim_alu | 4 |
| 0.00, 0.70, -0.25 | shopsign/trim_alu | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.32, 0.00, -0.08 | shopsign/trim_alu + shopsign/led_strip | 2.28 | 8 | 90 |
| -0.02, 0.08, 0.00 | shopsign/brand_primary + shopsign/brand_secondary | 2.32 | 8 | 90 |
| -0.02, 0.05, 0.00 | shopsign/trim_alu + shopsign/brand_primary | 1 | 2 | 90 |
| -0.47, 0.70, 0.00 | shopsign/trim_alu + shopsign/brand_primary | 1 | 2 | 90 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.41, 0.00, -0.04 | shopsign/trim_alu + shopsign/led_strip | 0.01182 |
| -0.29, 0.00, -0.07 | shopsign/trim_alu + shopsign/led_strip | 0.00341 |
| -0.05, 0.00, -0.03 | shopsign/trim_alu + shopsign/led_strip | 0.02318 |
| 0.16, 0.00, -0.06 | shopsign/trim_alu + shopsign/led_strip | 0.03159 |
| -0.38, 0.05, -0.16 | shopsign/trim_alu + shopsign/brand_primary | 0.06104 |
| -0.02, 0.05, -0.04 | shopsign/trim_alu + shopsign/brand_primary | 0.05824 |
| -0.13, 0.05, -0.22 | shopsign/trim_alu + shopsign/brand_primary | 0.06396 |
| 0.36, 0.05, -0.09 | shopsign/trim_alu + shopsign/brand_primary | 0.06676 |
| -0.36, 0.70, -0.09 | shopsign/trim_alu + shopsign/brand_primary | 0.06776 |
| 0.13, 0.70, -0.22 | shopsign/trim_alu + shopsign/brand_primary | 0.06432 |
| 0.14, 0.70, -0.03 | shopsign/trim_alu + shopsign/brand_primary | 0.05724 |
| 0.40, 0.70, -0.17 | shopsign/trim_alu + shopsign/brand_primary | 0.06068 |
| -0.08, 0.14, 0.00 | shopsign/brand_primary + shopsign/brand_secondary | 0.03898 |
| 0.10, 0.10, 0.00 | shopsign/brand_primary + shopsign/brand_secondary | 0.0324 |
| 0.42, 0.16, 0.00 | shopsign/brand_primary + shopsign/brand_secondary | 0.00102 |
| 0.46, 0.12, 0.00 | shopsign/brand_primary + shopsign/brand_secondary | 0.0076 |


Nodes: shopsign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
