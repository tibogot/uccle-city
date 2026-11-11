# Mesh audit (before pack): sauvagere_cliff.all_lod0

92,640 triangles, 46,840 welded vertices, 1,050 open edges, 47,170 rays, 2122 ms.

**0 blocking**, 197 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 195 |
| degenerate | warn | 2 |
| opening | info | 10 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 195)

| at | part | aspect | longest |
|---|---|---|---|
| 14.92, -0.22, 11.98 | cliff_c7_lod0/rockwork_concrete | 154 | 0.308 |
| 12.93, 0.92, 12.00 | cliff_c7_lod0/rockwork_concrete | 63 | 0.551 |
| 12.87, 1.76, 11.99 | cliff_c7_lod0/rockwork_concrete | 49 | 0.481 |
| 12.77, 1.84, 12.00 | cliff_c7_lod0/rockwork_concrete | 51 | 0.604 |
| 12.25, 2.70, 12.01 | cliff_c7_lod0/rockwork_concrete | 52 | 0.328 |
| 13.09, 3.16, 9.70 | cliff_c7_lod0/rockwork_concrete | 42 | 0.322 |
| 13.96, 3.67, 6.59 | cliff_c7_lod0/rockwork_concrete | 77 | 0.3 |
| 14.00, 2.63, 4.43 | cliff_c7_lod0/rockwork_concrete | 62 | 0.42 |
| 14.17, 2.82, 1.58 | cliff_c7_lod0/rockwork_concrete | 67 | 0.409 |
| 14.63, 2.48, 12.01 | cliff_c7_lod0/rockwork_concrete | 78 | 0.3 |
| 14.27, 1.91, 12.00 | cliff_c7_lod0/rockwork_concrete | 80 | 0.4 |
| 14.92, 1.27, 11.99 | cliff_c7_lod0/rockwork_concrete | 80 | 0.3 |
| 14.33, 3.23, 7.72 | cliff_c7_lod0/rockwork_concrete | 90 | 0.276 |
| 14.99, 2.62, 0.32 | cliff_c7_lod0/rockwork_concrete | 110 | 0.373 |
| 15.65, 1.34, 12.00 | cliff_c7_lod0/rockwork_concrete | 73 | 0.336 |
| 16.27, 0.97, 8.42 | cliff_c7_lod0/rockwork_concrete | 82 | 0.285 |
| 15.91, 1.96, 9.40 | cliff_c7_lod0/rockwork_concrete | 44 | 0.341 |
| 15.98, 3.07, 6.61 | cliff_c7_lod0/rockwork_concrete | 54 | 0.287 |
| 15.82, 2.47, 0.23 | cliff_c7_lod0/rockwork_concrete | 57 | 0.422 |
| 17.35, 2.85, 6.61 | cliff_c7_lod0/rockwork_concrete | 79 | 0.454 |
| 17.24, 1.47, 2.06 | cliff_c7_lod0/rockwork_concrete | 60 | 0.41 |
| 15.25, 1.67, -0.21 | cliff_c7_lod0/rockwork_concrete | 110 | 0.439 |
| 15.97, 1.18, -2.17 | cliff_c7_lod0/rockwork_concrete | 150 | 0.32 |
| -17.48, -0.23, 4.62 | cliff_c0_lod0/rockwork_concrete | 160 | 0.305 |
| -18.03, 5.62, 8.78 | cliff_c0_lod0/rockwork_concrete | 86 | 0.299 |
| -17.79, 4.53, 10.52 | cliff_c0_lod0/rockwork_concrete | 167 | 0.44 |
| -17.62, 4.72, 10.50 | cliff_c0_lod0/rockwork_concrete | 110 | 0.323 |
| -17.18, 4.28, 10.40 | cliff_c0_lod0/rockwork_concrete | 112 | 0.43 |
| -17.79, 4.87, 10.52 | cliff_c0_lod0/rockwork_concrete | 49 | 0.288 |
| -17.57, 5.78, 10.08 | cliff_c0_lod0/rockwork_concrete | 74 | 0.678 |
| -17.10, 5.53, 10.11 | cliff_c0_lod0/rockwork_concrete | 115 | 0.631 |
| -17.88, 0.68, 7.33 | cliff_c0_lod0/rockwork_concrete | 101 | 0.452 |
| -17.88, 2.32, 3.83 | cliff_c0_lod0/rockwork_concrete | 76 | 0.301 |
| -17.90, 1.27, 0.38 | cliff_c0_lod0/rockwork_concrete | 188 | 0.665 |
| -15.99, 4.42, 11.32 | cliff_c0_lod0/rockwork_concrete | 127 | 0.426 |
| -16.57, 2.47, 10.32 | cliff_c0_lod0/rockwork_concrete | 121 | 0.29 |
| -16.58, 3.52, 10.33 | cliff_c0_lod0/rockwork_concrete | 92 | 0.304 |
| -16.71, 5.99, 8.84 | cliff_c0_lod0/rockwork_concrete | 43 | 0.34 |
| -15.72, 5.02, 8.69 | cliff_c0_lod0/rockwork_concrete | 116 | 0.294 |
| -16.47, 0.53, 4.98 | cliff_c0_lod0/rockwork_concrete | 85 | 0.455 |

(155 more in the JSON)

## degenerate (warn, 2)

| at | part | edge |
|---|---|---|
| 8.00, 4.84, 3.78 | cliff_c5_lod0/rockwork_concrete | 0.007 |
| 7.96, 4.85, 3.80 | cliff_c5_lod0/rockwork_concrete | 0.12 |

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.92, 0.18, -1.61 | cliff_c4_lod0/rockwork_concrete | -0.52 + -0.85 + 0.11 | 0.153 |
| 2.90, 0.18, -1.76 | cliff_c4_lod0/rockwork_concrete | -0.53 + -0.85 + -0.03 | 0.152 |
| 2.91, 0.18, -1.92 | cliff_c4_lod0/rockwork_concrete | -0.54 + -0.83 + -0.1 | 0.157 |
| 2.92, 0.20, -2.10 | cliff_c4_lod0/rockwork_concrete | -0.55 + -0.81 + -0.2 | 0.149 |
| 3.05, 0.17, -2.25 | cliff_c4_lod0/rockwork_concrete | -0.5 + -0.83 + -0.24 | 0.149 |
| 3.22, 0.20, -1.21 | cliff_c4_lod0/rockwork_concrete | -0.27 + -0.87 + 0.41 | 0.133 |
| 3.21, 0.21, -2.60 | cliff_c4_lod0/rockwork_concrete | -0.62 + -0.76 + -0.2 | 0.159 |
| 3.11, 0.23, -2.48 | cliff_c4_lod0/rockwork_concrete | -0.37 + -0.78 + -0.51 | 0.159 |
| 3.36, 0.21, -2.75 | cliff_c4_lod0/rockwork_concrete | -0.4 + -0.83 + -0.38 | 0.154 |
| 3.51, 0.07, -2.47 | cliff_c4_lod0/rockwork_concrete | -0.32 + -0.92 + -0.24 | 0.034 |


Nodes: cliff_c7_lod0, cliff_c0_lod0, cliff_c1_lod0, cliff_c2_lod0, cliff_c3_lod0, cliff_c4_lod0, cliff_c5_lod0, cliff_c6_lod0. Distances: {"cliff_c7_lod0":16,"cliff_c7_lod1":40,"cliff_c7_lod2":260,"cliff_c0_lod0":16,"cliff_c0_lod1":40,"cliff_c0_lod2":260,"cliff_c1_lod0":16,"cliff_c1_lod1":40,"cliff_c1_lod2":260,"cliff_c2_lod0":16,"cliff_c2_lod1":40,"cliff_c2_lod2":260,"cliff_c3_lod0":16,"cliff_c3_lod1":40,"cliff_c3_lod2":260,"cliff_c4_lod0":16,"cliff_c4_lod1":40,"cliff_c4_lod2":260,"cliff_c5_lod0":16,"cliff_c5_lod1":40,"cliff_c5_lod2":260,"cliff_c6_lod0":16,"cliff_c6_lod1":40,"cliff_c6_lod2":260,"all_lod0":16,"all_lod1":40,"all_lod2":260}. Quantum 0.138 mm. Offset 0,0,0.
