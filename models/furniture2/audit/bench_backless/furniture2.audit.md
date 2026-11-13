# Mesh audit: furniture2.glb

2,172 triangles, 1,128 welded vertices, 0 open edges, 0 rays, 156 ms.

**0 blocking**, 220 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 220 |
| seam | info | 14 |
| backtoback | info | 10 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 220)

| at | part | aspect | longest |
|---|---|---|---|
| -0.69, -0.08, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.70, 0.14, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.69, -0.08, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.69, 0.14, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.69, -0.08, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.69, 0.14, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.70, -0.08, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.69, 0.14, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.70, -0.08, 0.16 | bench_backless/frame_dark | 109 | 0.653 |
| -0.70, 0.14, 0.16 | bench_backless/frame_dark | 109 | 0.653 |
| -0.70, -0.08, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.70, 0.14, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.71, -0.08, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.71, 0.14, 0.16 | bench_backless/frame_dark | 213 | 0.653 |
| -0.71, -0.08, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.71, 0.14, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.70, -0.08, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.70, 0.14, 0.22 | bench_backless/frame_dark | 215 | 0.657 |
| -0.70, -0.08, 0.22 | bench_backless/frame_dark | 110 | 0.657 |
| -0.70, 0.14, 0.22 | bench_backless/frame_dark | 110 | 0.657 |
| -0.69, 0.43, 0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.70, 0.43, -0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.69, 0.43, 0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.69, 0.43, -0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.69, 0.38, 0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.69, 0.38, -0.05 | bench_backless/frame_dark | 90 | 0.277 |
| -0.70, 0.38, 0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.69, 0.38, -0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.70, 0.38, 0.05 | bench_backless/frame_dark | 46 | 0.276 |
| -0.70, 0.38, -0.05 | bench_backless/frame_dark | 46 | 0.276 |
| -0.70, 0.38, 0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.70, 0.38, -0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.71, 0.38, 0.05 | bench_backless/frame_dark | 90 | 0.277 |
| -0.71, 0.38, -0.05 | bench_backless/frame_dark | 90 | 0.276 |
| -0.71, 0.43, 0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.71, 0.43, -0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.70, 0.43, 0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.70, 0.43, -0.05 | bench_backless/frame_dark | 93 | 0.284 |
| -0.70, 0.43, 0.05 | bench_backless/frame_dark | 47 | 0.284 |
| -0.70, 0.43, -0.05 | bench_backless/frame_dark | 47 | 0.284 |

(180 more in the JSON)

## seam (info, 14)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.69, 0.00, 0.22 | bench_backless/frame_dark + bench_backless/frame_dark | 0.28 | 52 | 90 |
| -0.69, 0.00, -0.22 | bench_backless/frame_dark + bench_backless/frame_dark | 0.28 | 52 | 90 |
| 0.70, 0.00, 0.22 | bench_backless/frame_dark + bench_backless/frame_dark | 0.28 | 52 | 90 |
| 0.70, 0.00, -0.22 | bench_backless/frame_dark + bench_backless/frame_dark | 0.28 | 52 | 90 |
| -0.70, 0.47, 0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| 0.70, 0.47, 0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| -0.70, 0.47, 0.08 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| 0.70, 0.47, 0.08 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| -0.70, 0.47, -0.01 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| 0.70, 0.47, -0.01 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| -0.70, 0.47, -0.10 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| 0.70, 0.47, -0.10 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| -0.70, 0.47, -0.18 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |
| 0.70, 0.47, -0.18 | bench_backless/wood_slat + bench_backless/galvanised | 0.06 | 12 | 90 |

## backtoback (info, 10)

| at | parts | area |
|---|---|---|
| -0.70, 0.47, 0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| 0.70, 0.47, 0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| -0.70, 0.47, 0.09 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| 0.70, 0.47, 0.09 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| -0.70, 0.47, 0.00 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| 0.70, 0.47, 0.00 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| -0.70, 0.47, -0.09 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| 0.70, 0.47, -0.09 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| -0.70, 0.47, -0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |
| 0.70, 0.47, -0.17 | bench_backless/wood_slat + bench_backless/galvanised | 0.00011 |


Nodes: bench_backless. Distances: {"bench_backless":60}. Quantum 0.000 mm. Offset 0,0,0.
