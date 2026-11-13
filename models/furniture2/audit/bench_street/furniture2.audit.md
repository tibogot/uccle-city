# Mesh audit: furniture2.glb

1,764 triangles, 936 welded vertices, 0 open edges, 0 rays, 114 ms.

**0 blocking**, 236 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 236 |
| seam | info | 16 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 236)

| at | part | aspect | longest |
|---|---|---|---|
| -0.70, -0.07, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, 0.17, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, -0.07, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, 0.17, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, -0.07, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, 0.17, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, -0.07, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, 0.17, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, -0.07, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.73, 0.17, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, -0.07, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, 0.17, 0.17 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, -0.07, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, 0.17, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.73, -0.07, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.74, 0.17, 0.21 | bench_street/frame_dark | 154 | 0.705 |
| -0.70, 0.09, -0.18 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.48, -0.22 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.09, -0.19 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.47, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.09, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.47, -0.27 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.08, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.70, 0.47, -0.27 | bench_street/frame_dark | 254 | 1.166 |
| -0.72, 0.08, -0.23 | bench_street/frame_dark | 42 | 1.166 |
| -0.71, 0.47, -0.27 | bench_street/frame_dark | 42 | 1.166 |
| -0.74, 0.08, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.73, 0.47, -0.27 | bench_street/frame_dark | 254 | 1.166 |
| -0.74, 0.09, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.74, 0.47, -0.27 | bench_street/frame_dark | 254 | 1.166 |
| -0.74, 0.09, -0.19 | bench_street/frame_dark | 254 | 1.166 |
| -0.74, 0.47, -0.23 | bench_street/frame_dark | 254 | 1.166 |
| -0.73, 0.09, -0.18 | bench_street/frame_dark | 254 | 1.166 |
| -0.74, 0.48, -0.22 | bench_street/frame_dark | 254 | 1.166 |
| -0.71, 0.09, -0.18 | bench_street/frame_dark | 42 | 1.166 |
| -0.72, 0.48, -0.22 | bench_street/frame_dark | 42 | 1.166 |
| -0.70, 0.42, 0.06 | bench_street/frame_dark | 115 | 0.44 |
| -0.70, 0.42, -0.09 | bench_street/frame_dark | 115 | 0.44 |
| -0.69, 0.41, 0.06 | bench_street/frame_dark | 115 | 0.44 |
| -0.70, 0.41, -0.09 | bench_street/frame_dark | 115 | 0.44 |

(196 more in the JSON)

## seam (info, 16)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.70, 0.00, 0.21 | bench_street/frame_dark + bench_street/frame_dark | 0.34 | 52 | 90 |
| -0.70, 0.00, -0.18 | bench_street/frame_dark + bench_street/frame_dark | 0.34 | 52 | 84.3 |
| 0.74, 0.00, 0.21 | bench_street/frame_dark + bench_street/frame_dark | 0.34 | 52 | 90 |
| 0.74, 0.00, -0.18 | bench_street/frame_dark + bench_street/frame_dark | 0.34 | 52 | 84.3 |
| -0.70, 0.38, -0.21 | bench_street/frame_dark + bench_street/frame_dark | 0.32 | 39 | 67.5 |
| 0.74, 0.38, -0.21 | bench_street/frame_dark + bench_street/frame_dark | 0.32 | 39 | 67.5 |
| -0.70, 0.13, 0.17 | bench_street/frame_dark + bench_street/frame_dark | 0.11 | 30 | 67.5 |
| -0.70, 0.13, -0.19 | bench_street/frame_dark + bench_street/frame_dark | 0.11 | 30 | 67.1 |
| 0.73, 0.13, 0.17 | bench_street/frame_dark + bench_street/frame_dark | 0.11 | 30 | 67.5 |
| 0.73, 0.13, -0.19 | bench_street/frame_dark + bench_street/frame_dark | 0.11 | 30 | 67.1 |
| -0.70, 0.38, 0.17 | bench_street/frame_dark + bench_street/frame_dark | 0.29 | 23 | 67.5 |
| 0.74, 0.38, 0.17 | bench_street/frame_dark + bench_street/frame_dark | 0.29 | 23 | 67.5 |
| 0.72, 0.63, -0.20 | bench_street/wood_slat + bench_street/galvanised | 0.06 | 12 | 90 |
| -0.72, 0.63, -0.20 | bench_street/wood_slat + bench_street/galvanised | 0.06 | 12 | 90 |
| 0.72, 0.79, -0.22 | bench_street/wood_slat + bench_street/galvanised | 0.06 | 12 | 90 |
| -0.72, 0.79, -0.22 | bench_street/wood_slat + bench_street/galvanised | 0.06 | 12 | 90 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.72, 0.62, -0.20 | bench_street/wood_slat + bench_street/galvanised | 0.00011 |
| -0.72, 0.62, -0.20 | bench_street/wood_slat + bench_street/galvanised | 0.00011 |
| 0.72, 0.78, -0.21 | bench_street/wood_slat + bench_street/galvanised | 0.00011 |
| -0.72, 0.78, -0.21 | bench_street/wood_slat + bench_street/galvanised | 0.00011 |


Nodes: bench_street. Distances: {"bench_street":60}. Quantum 0.000 mm. Offset 0,0,0.
