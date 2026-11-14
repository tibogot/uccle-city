# Mesh audit: shopkit.glb

1,136 triangles, 600 welded vertices, 0 open edges, 0 rays, 61 ms.

**4 blocking**, 134 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| bentflat | block | 4 |
| sliver | warn | 134 |
| seam | info | 15 |
| backtoback | info | 28 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## bentflat (block, 4)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| -0.34, -0.02, 0.25 | awning/alu | 4.5 | 0.1751 | 0.35 |
| 0.34, -0.02, 0.20 | awning/alu | 4.5 | 0.1751 | 0.35 |
| -0.34, -0.16, 0.20 | awning/alu | 5.6 | 0.1957 | 0.39 |
| 0.34, -0.16, 0.27 | awning/alu | 5.6 | 0.1957 | 0.39 |

## sliver (warn, 134)

| at | part | aspect | longest |
|---|---|---|---|
| -0.34, -0.02, 0.32 | awning/alu | 110 | 2.06 |
| 0.34, -0.02, 0.32 | awning/alu | 110 | 2.06 |
| -0.34, -0.03, 0.34 | awning/alu | 110 | 2.06 |
| 0.34, -0.03, 0.33 | awning/alu | 110 | 2.06 |
| -0.34, -0.04, 0.35 | awning/alu | 110 | 2.06 |
| 0.34, -0.04, 0.35 | awning/alu | 110 | 2.06 |
| -0.34, -0.06, 0.36 | awning/alu | 110 | 2.06 |
| 0.34, -0.05, 0.36 | awning/alu | 110 | 2.06 |
| -0.34, -0.07, 0.37 | awning/alu | 110 | 2.06 |
| 0.34, -0.07, 0.37 | awning/alu | 110 | 2.06 |
| -0.34, -0.11, 0.37 | awning/alu | 52 | 2.06 |
| 0.34, -0.09, 0.37 | awning/alu | 52 | 2.06 |
| -0.34, -0.13, 0.37 | awning/alu | 132 | 2.06 |
| 0.34, -0.13, 0.37 | awning/alu | 132 | 2.06 |
| -0.34, -0.14, 0.36 | awning/alu | 132 | 2.06 |
| 0.34, -0.14, 0.36 | awning/alu | 132 | 2.06 |
| -0.34, -0.15, 0.35 | awning/alu | 132 | 2.06 |
| 0.34, -0.15, 0.35 | awning/alu | 132 | 2.06 |
| -0.34, -0.16, 0.34 | awning/alu | 132 | 2.06 |
| 0.34, -0.16, 0.34 | awning/alu | 132 | 2.06 |
| -0.34, -0.54, 1.75 | awning/alu | 99 | 2.06 |
| 0.34, -0.54, 1.75 | awning/alu | 99 | 2.06 |
| -0.34, -0.55, 1.77 | awning/alu | 100 | 2.06 |
| 0.34, -0.55, 1.76 | awning/alu | 100 | 2.06 |
| -0.34, -0.57, 1.78 | awning/alu | 100 | 2.06 |
| 0.34, -0.56, 1.77 | awning/alu | 100 | 2.06 |
| -0.34, -0.59, 1.77 | awning/alu | 100 | 2.06 |
| 0.34, -0.58, 1.78 | awning/alu | 100 | 2.06 |
| -0.34, -0.60, 1.76 | awning/alu | 100 | 2.06 |
| 0.34, -0.60, 1.77 | awning/alu | 100 | 2.06 |
| -0.34, -0.61, 1.75 | awning/alu | 100 | 2.06 |
| 0.34, -0.61, 1.75 | awning/alu | 100 | 2.06 |
| -0.84, -0.41, 0.33 | awning/alu | 74 | 0.821 |
| -0.79, -0.46, 0.59 | awning/alu | 74 | 0.821 |
| -0.83, -0.42, 0.32 | awning/alu | 74 | 0.821 |
| -0.78, -0.47, 0.59 | awning/alu | 74 | 0.821 |
| -0.82, -0.42, 0.32 | awning/alu | 74 | 0.821 |
| -0.77, -0.47, 0.59 | awning/alu | 74 | 0.821 |
| -0.81, -0.42, 0.32 | awning/alu | 74 | 0.821 |
| -0.76, -0.47, 0.58 | awning/alu | 74 | 0.821 |

(94 more in the JSON)

## seam (info, 15)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.74, -0.51, 0.84 | awning/alu + awning/alu | 0.11 | 38 | 32.5 |
| -0.74, -0.51, 0.87 | awning/alu + awning/alu | 0.1 | 38 | 38.9 |
| 0.71, -0.51, 0.83 | awning/alu + awning/alu | 0.11 | 36 | 32.5 |
| 0.71, -0.51, 0.88 | awning/alu + awning/alu | 0.1 | 34 | 38.9 |
| 0.73, -0.51, 0.85 | awning/alu + awning/alu | 0.08 | 26 | 25.6 |
| -1.01, -0.15, 0.14 | awning/alu + awning/alu | 0.43 | 24 | 90 |
| 0.91, -0.15, 0.14 | awning/alu + awning/alu | 0.43 | 24 | 90 |
| -0.74, -0.51, 0.86 | awning/alu + awning/alu | 0.08 | 24 | 25.6 |
| -0.85, -0.38, 0.08 | awning/alu + awning/alu | 0.11 | 22 | 75.7 |
| 0.88, -0.37, 0.08 | awning/alu + awning/alu | 0.11 | 22 | 75.7 |
| -1.03, -0.02, 0.23 | awning/alu + awning/alu | 0.69 | 16 | 22.5 |
| 1.03, -0.02, 0.23 | awning/alu + awning/alu | 0.69 | 16 | 22.5 |
| -0.23, -0.59, 1.77 | awning/alu + awning/canvas | 6.21 | 16 | 45 |
| -0.92, -0.15, 0.35 | awning/alu + awning/canvas | 4.1 | 12 | 53 |
| -0.23, -0.55, 1.67 | awning/alu + awning/canvas | 4.09 | 12 | 75.3 |

## backtoback (info, 28)

| at | parts | area |
|---|---|---|
| -1.03, -0.11, 0.17 | awning/alu + awning/alu | 0.00699 |
| -1.03, -0.14, 0.24 | awning/alu + awning/alu | 0.00575 |
| -1.03, -0.15, 0.34 | awning/alu + awning/alu | 0.00005 |
| -1.03, -0.14, 0.36 | awning/alu + awning/alu | 0.00005 |
| -1.03, -0.09, 0.37 | awning/alu + awning/alu | 0.00006 |
| -1.03, -0.04, 0.35 | awning/alu + awning/alu | 0.00005 |
| -1.03, -0.03, 0.33 | awning/alu + awning/alu | 0.00005 |
| -1.03, -0.04, 0.23 | awning/alu + awning/alu | 0.00788 |
| -1.03, -0.10, 0.30 | awning/alu + awning/alu | 0.00401 |
| -1.03, -0.14, 0.35 | awning/alu + awning/alu | 0.00033 |
| -1.03, -0.06, 0.36 | awning/alu + awning/alu | 0.00059 |
| -1.03, -0.04, 0.33 | awning/alu + awning/alu | 0.00063 |
| -1.03, -0.08, 0.33 | awning/alu + awning/alu | 0.00173 |
| -1.03, -0.09, 0.35 | awning/alu + awning/alu | 0.00226 |
| 1.03, -0.04, 0.23 | awning/alu + awning/alu | 0.0048 |
| 1.03, -0.07, 0.17 | awning/alu + awning/alu | 0.00654 |
| 1.03, -0.03, 0.33 | awning/alu + awning/alu | 0.00005 |
| 1.03, -0.05, 0.36 | awning/alu + awning/alu | 0.00005 |
| 1.03, -0.09, 0.37 | awning/alu + awning/alu | 0.00006 |
| 1.03, -0.14, 0.36 | awning/alu + awning/alu | 0.00005 |
| 1.03, -0.15, 0.35 | awning/alu + awning/alu | 0.00004 |
| 1.03, -0.08, 0.29 | awning/alu + awning/alu | 0.00448 |
| 1.03, -0.14, 0.24 | awning/alu + awning/alu | 0.00881 |
| 1.03, -0.04, 0.34 | awning/alu + awning/alu | 0.0004 |
| 1.03, -0.11, 0.36 | awning/alu + awning/alu | 0.00038 |
| 1.03, -0.11, 0.34 | awning/alu + awning/alu | 0.00176 |
| 1.03, -0.15, 0.34 | awning/alu + awning/alu | 0.00034 |
| 1.03, -0.08, 0.34 | awning/alu + awning/alu | 0.00266 |


Nodes: awning. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
