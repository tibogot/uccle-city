# Mesh audit: shopkit.glb

1,004 triangles, 520 welded vertices, 0 open edges, 0 rays, 80 ms.

**6 blocking**, 36 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 6 |
| sliver | warn | 36 |
| seam | info | 10 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 6)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.01, 0.01, 0.00 | blade/iron + blade/iron | 0 | 0.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.01, 0.01, 0.00 | blade/iron + blade/iron | 0 | 0.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.01, -0.01, 0.00 | blade/iron + blade/iron | 0 | 0.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.01, -0.01, 0.00 | blade/iron + blade/iron | 0 | 0.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, 0.01, 0.00 | blade/iron + blade/iron | 0 | 2 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, -0.01, 0.00 | blade/iron + blade/iron | 0 | 2 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

## sliver (warn, 36)

| at | part | aspect | longest |
|---|---|---|---|
| -0.06, -0.14, 0.01 | blade/iron | 197 | 0.602 |
| -0.06, -0.34, 0.01 | blade/iron | 197 | 0.602 |
| -0.06, -0.14, 0.01 | blade/iron | 197 | 0.602 |
| -0.06, -0.34, 0.01 | blade/iron | 197 | 0.602 |
| -0.06, -0.34, 0.00 | blade/iron | 197 | 0.602 |
| -0.06, -0.14, 0.00 | blade/iron | 197 | 0.602 |
| -0.06, -0.34, 0.00 | blade/iron | 197 | 0.602 |
| -0.06, -0.14, 0.00 | blade/iron | 197 | 0.602 |
| 0.06, -0.34, 0.00 | blade/iron | 197 | 0.602 |
| 0.06, -0.14, 0.00 | blade/iron | 197 | 0.602 |
| 0.06, -0.34, 0.00 | blade/iron | 197 | 0.602 |
| 0.06, -0.14, 0.00 | blade/iron | 197 | 0.602 |
| 0.06, -0.34, 0.01 | blade/iron | 197 | 0.602 |
| 0.06, -0.14, 0.01 | blade/iron | 197 | 0.602 |
| 0.06, -0.34, 0.01 | blade/iron | 197 | 0.602 |
| 0.06, -0.14, 0.01 | blade/iron | 197 | 0.602 |
| -0.06, -0.14, 0.01 | blade/iron | 86 | 0.602 |
| -0.06, -0.34, 0.01 | blade/iron | 86 | 0.602 |
| 0.06, -0.14, 0.01 | blade/iron | 86 | 0.602 |
| 0.06, -0.34, 0.01 | blade/iron | 86 | 0.602 |
| -0.01, -0.01, 0.33 | blade/iron | 91 | 0.98 |
| -0.01, -0.00, 0.65 | blade/iron | 91 | 0.98 |
| -0.00, -0.01, 0.33 | blade/iron | 91 | 0.98 |
| -0.01, -0.01, 0.65 | blade/iron | 91 | 0.98 |
| 0.01, -0.01, 0.33 | blade/iron | 91 | 0.98 |
| 0.00, -0.01, 0.65 | blade/iron | 91 | 0.98 |
| 0.01, -0.00, 0.33 | blade/iron | 91 | 0.98 |
| 0.01, -0.01, 0.65 | blade/iron | 91 | 0.98 |
| 0.01, 0.01, 0.33 | blade/iron | 91 | 0.98 |
| 0.01, 0.00, 0.65 | blade/iron | 91 | 0.98 |
| 0.00, 0.01, 0.33 | blade/iron | 91 | 0.98 |
| 0.01, 0.01, 0.65 | blade/iron | 91 | 0.98 |
| -0.01, 0.01, 0.33 | blade/iron | 91 | 0.98 |
| -0.00, 0.01, 0.65 | blade/iron | 91 | 0.98 |
| -0.01, 0.00, 0.33 | blade/iron | 91 | 0.98 |
| -0.01, 0.01, 0.65 | blade/iron | 91 | 0.98 |

## seam (info, 10)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.00, -0.04, 0.25 | blade/iron + blade/iron | 0.07 | 40 | 30.2 |
| 0.01, -0.01, 0.04 | blade/iron + blade/iron | 0.07 | 34 | 73.1 |
| -0.01, -0.01, 0.98 | blade/iron + blade/iron | 0.09 | 30 | 44.5 |
| -0.01, -0.45, 0.01 | blade/iron + blade/iron | 0.16 | 25 | 41.6 |
| -0.01, -0.01, 0.01 | blade/iron + blade/iron | 0.17 | 24 | 90 |
| -0.01, -0.01, 0.66 | blade/iron + blade/iron | 0.09 | 20 | 43.9 |
| -0.00, -0.01, 0.25 | blade/iron + blade/iron | 0.03 | 14 | 67.5 |
| -0.00, -0.01, 0.85 | blade/iron + blade/iron | 0.03 | 14 | 67.5 |
| 0.00, -0.03, 0.01 | blade/iron + blade/iron | 0.06 | 10 | 22.5 |
| 0.00, -0.49, 0.01 | blade/iron + blade/iron | 0.06 | 10 | 22.5 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| 0.00, -0.02, 0.01 | blade/iron + blade/iron | 0.00006 |
| 0.00, -0.03, 0.01 | blade/iron + blade/iron | 0.00006 |
| -0.00, -0.02, 0.01 | blade/iron + blade/iron | 0.0001 |
| 0.00, -0.48, 0.01 | blade/iron + blade/iron | 0.00006 |
| 0.00, -0.48, 0.01 | blade/iron + blade/iron | 0.00006 |
| -0.00, -0.48, 0.01 | blade/iron + blade/iron | 0.0001 |


Nodes: blade. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
