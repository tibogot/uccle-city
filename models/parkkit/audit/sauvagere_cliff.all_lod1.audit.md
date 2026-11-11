# Mesh audit (before pack): sauvagere_cliff.all_lod1

49,254 triangles, 25,152 welded vertices, 1,066 open edges, 47,416 rays, 951 ms.

**0 blocking**, 61 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 59 |
| tjunction | warn | 2 |
| seam | info | 1 |
| opening | info | 10 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 59)

| at | part | aspect | longest |
|---|---|---|---|
| 12.19, 3.97, 7.71 | cliff_c7_lod1/rockwork_concrete | 64 | 0.403 |
| 14.40, 3.13, 7.76 | cliff_c7_lod1/rockwork_concrete | 44 | 0.398 |
| 13.28, 1.55, -2.32 | cliff_c7_lod1/rockwork_concrete | 52 | 0.424 |
| -15.80, 3.23, 12.01 | cliff_c0_lod1/rockwork_concrete | 42 | 1.05 |
| -13.57, 1.72, 3.67 | cliff_c0_lod1/rockwork_concrete | 42 | 0.669 |
| -12.00, 5.32, 11.00 | cliff_c0_lod1/rockwork_concrete | 114 | 0.298 |
| -12.00, 5.21, 8.94 | cliff_c0_lod1/rockwork_concrete | 153 | 0.362 |
| -11.05, 3.53, 5.12 | cliff_c1_lod1/rockwork_concrete | 86 | 0.288 |
| -9.98, 2.92, 3.36 | cliff_c1_lod1/rockwork_concrete | 55 | 0.298 |
| -12.00, 4.87, 11.32 | cliff_c1_lod1/rockwork_concrete | 70 | 0.282 |
| -8.00, 1.43, 1.13 | cliff_c1_lod1/rockwork_concrete | 46 | 0.312 |
| -8.02, 2.21, 12.00 | cliff_c1_lod1/rockwork_concrete | 557 | 0.343 |
| -8.02, 2.21, 12.00 | cliff_c1_lod1/rockwork_concrete | 378 | 0.339 |
| -8.00, 4.58, 6.19 | cliff_c1_lod1/rockwork_concrete | 90 | 0.286 |
| -8.00, 0.83, 1.07 | cliff_c2_lod1/rockwork_concrete | 99 | 0.287 |
| -4.14, 4.65, 9.77 | cliff_c2_lod1/rockwork_concrete | 641 | 0.51 |
| -4.00, 3.51, 1.13 | cliff_c2_lod1/rockwork_concrete | 68 | 0.317 |
| -7.96, 4.65, 9.71 | cliff_c2_lod1/rockwork_concrete | 49 | 0.347 |
| -7.91, 1.93, 12.01 | cliff_c2_lod1/rockwork_concrete | 112 | 0.416 |
| -4.00, 1.57, -1.26 | cliff_c2_lod1/rockwork_concrete | 162 | 0.3 |
| -4.00, 1.48, -1.25 | cliff_c2_lod1/rockwork_concrete | 71 | 0.445 |
| -4.00, 1.27, 11.99 | cliff_c2_lod1/rockwork_concrete | 209 | 0.291 |
| -4.00, 0.93, 11.99 | cliff_c3_lod1/rockwork_concrete | 60 | 0.448 |
| -4.00, 5.03, 3.18 | cliff_c3_lod1/rockwork_concrete | 80 | 0.285 |
| -1.27, 4.85, 9.07 | cliff_c3_lod1/rockwork_concrete | 51 | 0.43 |
| -4.00, 1.52, -1.26 | cliff_c3_lod1/rockwork_concrete | 91 | 0.458 |
| -2.08, 0.15, -2.53 | cliff_c3_lod1/rockwork_concrete | 96 | 0.436 |
| -3.94, 4.68, 6.99 | cliff_c3_lod1/rockwork_concrete | 70 | 0.511 |
| -4.00, 0.47, 12.00 | cliff_c3_lod1/rockwork_concrete | 72 | 0.359 |
| 0.00, 3.38, 0.53 | cliff_c4_lod1/rockwork_concrete | 78 | 0.297 |
| 1.63, 0.92, 12.00 | cliff_c4_lod1/rockwork_concrete | 203 | 0.845 |
| 4.00, 5.40, 4.57 | cliff_c4_lod1/rockwork_concrete | 159 | 0.273 |
| 0.00, 2.10, -1.71 | cliff_c4_lod1/rockwork_concrete | 74 | 0.317 |
| 2.70, -0.01, -2.71 | cliff_c4_lod1/rockwork_concrete | 43 | 0.26 |
| 4.00, 2.27, -0.98 | cliff_c4_lod1/rockwork_concrete | 692 | 0.269 |
| 4.00, 2.26, -0.94 | cliff_c4_lod1/rockwork_concrete | 869 | 0.303 |
| 4.00, 5.40, 4.56 | cliff_c5_lod1/rockwork_concrete | 108 | 0.274 |
| 4.00, 5.43, 4.82 | cliff_c5_lod1/rockwork_concrete | 218 | 0.325 |
| 8.00, 4.26, 10.43 | cliff_c5_lod1/rockwork_concrete | 60 | 0.302 |
| 8.00, 5.03, 8.86 | cliff_c5_lod1/rockwork_concrete | 1653 | 0.301 |

(19 more in the JSON)

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| 8.00, 4.84, 3.67 | cliff_c5_lod1/rockwork_concrete | 0.002 |
| 8.00, 4.84, 3.67 | cliff_c6_lod1/rockwork_concrete | 0.002 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -4.00, 3.47, 1.26 | cliff_c2_lod1/rockwork_concrete + cliff_c3_lod1/rockwork_concrete | 0 | 1 | 77.8 |

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.92, 0.18, -1.61 | cliff_c4_lod1/rockwork_concrete | -0.56 + -0.82 + 0.12 | 0.153 |
| 2.90, 0.18, -1.84 | cliff_c4_lod1/rockwork_concrete | -0.55 + -0.83 + -0.03 | 0.152 |
| 2.91, 0.18, -1.92 | cliff_c4_lod1/rockwork_concrete | -0.54 + -0.83 + -0.1 | 0.157 |
| 2.92, 0.20, -2.10 | cliff_c4_lod1/rockwork_concrete | -0.54 + -0.82 + -0.2 | 0.149 |
| 3.05, 0.17, -2.25 | cliff_c4_lod1/rockwork_concrete | -0.53 + -0.81 + -0.25 | 0.149 |
| 3.22, 0.20, -1.21 | cliff_c4_lod1/rockwork_concrete | -0.27 + -0.87 + 0.41 | 0.133 |
| 3.21, 0.21, -2.60 | cliff_c4_lod1/rockwork_concrete | -0.62 + -0.76 + -0.2 | 0.159 |
| 3.11, 0.23, -2.48 | cliff_c4_lod1/rockwork_concrete | -0.37 + -0.78 + -0.51 | 0.159 |
| 3.36, 0.21, -2.75 | cliff_c4_lod1/rockwork_concrete | -0.4 + -0.83 + -0.38 | 0.154 |
| 3.51, 0.07, -2.47 | cliff_c4_lod1/rockwork_concrete | -0.32 + -0.92 + -0.24 | 0.034 |


Nodes: cliff_c7_lod1, cliff_c0_lod1, cliff_c1_lod1, cliff_c2_lod1, cliff_c3_lod1, cliff_c4_lod1, cliff_c5_lod1, cliff_c6_lod1. Distances: {"cliff_c7_lod0":16,"cliff_c7_lod1":40,"cliff_c7_lod2":260,"cliff_c0_lod0":16,"cliff_c0_lod1":40,"cliff_c0_lod2":260,"cliff_c1_lod0":16,"cliff_c1_lod1":40,"cliff_c1_lod2":260,"cliff_c2_lod0":16,"cliff_c2_lod1":40,"cliff_c2_lod2":260,"cliff_c3_lod0":16,"cliff_c3_lod1":40,"cliff_c3_lod2":260,"cliff_c4_lod0":16,"cliff_c4_lod1":40,"cliff_c4_lod2":260,"cliff_c5_lod0":16,"cliff_c5_lod1":40,"cliff_c5_lod2":260,"cliff_c6_lod0":16,"cliff_c6_lod1":40,"cliff_c6_lod2":260,"all_lod0":16,"all_lod1":40,"all_lod2":260}. Quantum 0.138 mm. Offset 0,0,0.
