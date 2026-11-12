# Mesh audit (before pack): sauvagere_cliff.all_lod2

25,142 triangles, 13,096 welded vertices, 1,066 open edges, 47,512 rays, 584 ms.

**0 blocking**, 72 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 69 |
| nonmanifold | warn | 1 |
| tjunction | warn | 2 |
| seam | info | 2 |
| opening | info | 8 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 69)

| at | part | aspect | longest |
|---|---|---|---|
| 12.00, 3.68, 7.99 | cliff_c7_lod2/rockwork_concrete | 56 | 0.284 |
| 12.19, 3.97, 7.71 | cliff_c7_lod2/rockwork_concrete | 64 | 0.403 |
| 12.27, 4.37, 7.82 | cliff_c7_lod2/rockwork_concrete | 73 | 0.427 |
| 12.00, 3.15, 4.50 | cliff_c7_lod2/rockwork_concrete | 49 | 0.427 |
| 12.00, 3.50, 5.18 | cliff_c7_lod2/rockwork_concrete | 71 | 0.3 |
| 12.03, 1.03, 1.71 | cliff_c7_lod2/rockwork_concrete | 320 | 0.486 |
| 12.00, 3.49, 4.84 | cliff_c7_lod2/rockwork_concrete | 90 | 0.421 |
| 12.00, 3.48, 4.74 | cliff_c7_lod2/rockwork_concrete | 51 | 0.268 |
| -14.61, 4.70, 11.98 | cliff_c0_lod2/rockwork_concrete | 50 | 1.39 |
| -15.55, 2.94, 5.16 | cliff_c0_lod2/rockwork_concrete | 43 | 0.983 |
| -12.00, 5.32, 11.00 | cliff_c0_lod2/rockwork_concrete | 114 | 0.298 |
| -12.00, 5.21, 8.94 | cliff_c0_lod2/rockwork_concrete | 153 | 0.362 |
| -12.00, 0.87, 0.82 | cliff_c0_lod2/rockwork_concrete | 334 | 0.277 |
| -8.79, 2.83, 2.68 | cliff_c1_lod2/rockwork_concrete | 43 | 0.434 |
| -12.00, 4.87, 11.32 | cliff_c1_lod2/rockwork_concrete | 70 | 0.282 |
| -8.00, 1.43, 1.13 | cliff_c1_lod2/rockwork_concrete | 46 | 0.312 |
| -8.00, 3.83, 3.03 | cliff_c1_lod2/rockwork_concrete | 72 | 0.287 |
| -8.02, 2.21, 12.00 | cliff_c1_lod2/rockwork_concrete | 557 | 0.343 |
| -8.02, 2.21, 12.00 | cliff_c1_lod2/rockwork_concrete | 378 | 0.339 |
| -8.00, 4.58, 6.19 | cliff_c1_lod2/rockwork_concrete | 90 | 0.286 |
| -8.00, 0.83, 1.07 | cliff_c2_lod2/rockwork_concrete | 99 | 0.287 |
| -5.92, 4.59, 8.92 | cliff_c2_lod2/rockwork_concrete | 55 | 0.6 |
| -4.14, 4.65, 9.77 | cliff_c2_lod2/rockwork_concrete | 641 | 0.51 |
| -4.00, 5.09, 5.18 | cliff_c2_lod2/rockwork_concrete | 51 | 0.298 |
| -4.00, 3.51, 1.13 | cliff_c2_lod2/rockwork_concrete | 68 | 0.317 |
| -7.81, 1.88, 12.01 | cliff_c2_lod2/rockwork_concrete | 165 | 0.74 |
| -4.00, 1.57, -1.26 | cliff_c2_lod2/rockwork_concrete | 162 | 0.3 |
| -4.00, 1.48, -1.25 | cliff_c2_lod2/rockwork_concrete | 71 | 0.445 |
| -4.00, 1.27, 11.99 | cliff_c2_lod2/rockwork_concrete | 209 | 0.291 |
| -4.14, -0.17, 12.01 | cliff_c2_lod2/rockwork_concrete | 66 | 0.522 |
| -3.94, -0.17, 12.01 | cliff_c3_lod2/rockwork_concrete | 73 | 0.346 |
| -3.94, -0.07, 12.00 | cliff_c3_lod2/rockwork_concrete | 55 | 0.488 |
| -4.00, 5.03, 3.18 | cliff_c3_lod2/rockwork_concrete | 80 | 0.285 |
| -4.00, 1.52, -1.26 | cliff_c3_lod2/rockwork_concrete | 91 | 0.458 |
| -3.94, 4.68, 6.99 | cliff_c3_lod2/rockwork_concrete | 70 | 0.511 |
| 0.00, 3.67, 0.55 | cliff_c3_lod2/rockwork_concrete | 1664 | 0.291 |
| 0.00, 3.48, 0.54 | cliff_c4_lod2/rockwork_concrete | 54 | 0.447 |
| 0.00, 3.38, 0.53 | cliff_c4_lod2/rockwork_concrete | 78 | 0.297 |
| 4.00, 5.36, 4.18 | cliff_c4_lod2/rockwork_concrete | 1296 | 0.605 |
| 4.00, 5.40, 4.57 | cliff_c4_lod2/rockwork_concrete | 159 | 0.273 |

(29 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 12.00, 3.89, 7.49 | cliff_c7_lod2/rockwork_concrete | 4 |

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| 8.00, 4.84, 3.67 | cliff_c5_lod2/rockwork_concrete | 0.002 |
| 8.00, 4.84, 3.67 | cliff_c6_lod2/rockwork_concrete | 0.002 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -8.00, 1.83, 1.70 | cliff_c1_lod2/rockwork_concrete + cliff_c2_lod2/rockwork_concrete | 0.12 | 2 | 73.1 |
| -4.00, 3.47, 1.26 | cliff_c2_lod2/rockwork_concrete + cliff_c3_lod2/rockwork_concrete | 0 | 1 | 77.7 |

## opening (info, 8)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.92, 0.18, -1.61 | cliff_c4_lod2/rockwork_concrete | -0.58 + -0.81 + 0.12 | 0.153 |
| 2.90, 0.18, -1.84 | cliff_c4_lod2/rockwork_concrete | -0.57 + -0.82 + -0.03 | 0.152 |
| 2.91, 0.18, -1.92 | cliff_c4_lod2/rockwork_concrete | -0.8 + -0.58 + -0.14 | 0.157 |
| 3.05, 0.17, -2.25 | cliff_c4_lod2/rockwork_concrete | -0.52 + -0.82 + -0.25 | 0.149 |
| 3.22, 0.20, -1.21 | cliff_c4_lod2/rockwork_concrete | -0.27 + -0.87 + 0.41 | 0.133 |
| 3.07, 0.19, -2.36 | cliff_c4_lod2/rockwork_concrete | -0.56 + -0.75 + -0.36 | 0.168 |
| 3.36, 0.21, -2.75 | cliff_c4_lod2/rockwork_concrete | -0.38 + -0.84 + -0.38 | 0.154 |
| 3.51, 0.07, -2.47 | cliff_c4_lod2/rockwork_concrete | -0.32 + -0.92 + -0.24 | 0.034 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 12.00, 3.89, 7.49 | cliff_c7_lod2/rockwork_concrete + cliff_c6_lod2/rockwork_concrete | 0.00166 |
| -8.00, 1.82, 1.69 | cliff_c1_lod2/rockwork_concrete + cliff_c2_lod2/rockwork_concrete | 0.00044 |
| -8.00, 1.83, 1.71 | cliff_c1_lod2/rockwork_concrete + cliff_c2_lod2/rockwork_concrete | 0.00037 |


Nodes: cliff_c7_lod2, cliff_c0_lod2, cliff_c1_lod2, cliff_c2_lod2, cliff_c3_lod2, cliff_c4_lod2, cliff_c5_lod2, cliff_c6_lod2. Distances: {"cliff_c7_lod0":16,"cliff_c7_lod1":40,"cliff_c7_lod2":260,"cliff_c0_lod0":16,"cliff_c0_lod1":40,"cliff_c0_lod2":260,"cliff_c1_lod0":16,"cliff_c1_lod1":40,"cliff_c1_lod2":260,"cliff_c2_lod0":16,"cliff_c2_lod1":40,"cliff_c2_lod2":260,"cliff_c3_lod0":16,"cliff_c3_lod1":40,"cliff_c3_lod2":260,"cliff_c4_lod0":16,"cliff_c4_lod1":40,"cliff_c4_lod2":260,"cliff_c5_lod0":16,"cliff_c5_lod1":40,"cliff_c5_lod2":260,"cliff_c6_lod0":16,"cliff_c6_lod1":40,"cliff_c6_lod2":260,"all_lod0":16,"all_lod1":40,"all_lod2":260}. Quantum 0.138 mm. Offset 0,0,0.
