# Mesh audit (before pack): playgroundkit.pg_fence_lod0

1,446 triangles, 958 welded vertices, 390 open edges, 0 rays, 76 ms.

**0 blocking**, 544 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 542 |
| tjunction | warn | 2 |
| seam | info | 244 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 542)

| at | part | aspect | longest |
|---|---|---|---|
| -1.03, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -1.03, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -1.03, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -1.03, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -1.03, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -1.03, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -1.03, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -1.03, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -0.97, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -0.97, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -0.97, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -0.97, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -0.97, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -0.97, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| -0.97, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| -0.97, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 0.97, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 0.97, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 0.97, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 0.97, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 0.97, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 0.97, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 0.97, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 0.97, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 1.03, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 1.03, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 1.03, 0.30, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 1.03, 0.70, -0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 1.03, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 1.03, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 390 | 1.192 |
| 1.03, 0.30, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 1.03, 0.70, 0.02 | pg_fence_lod0/steel_painted_green | 389 | 1.192 |
| 0.32, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 544 | 1.92 |
| -0.32, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 544 | 1.92 |
| 0.32, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 544 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod0/steel_painted_green | 544 | 1.92 |
| 0.32, 0.06, -0.02 | pg_fence_lod0/steel_painted_green | 545 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod0/steel_painted_green | 545 | 1.92 |
| 0.32, 0.06, -0.02 | pg_fence_lod0/steel_painted_green | 545 | 1.92 |
| -0.32, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 545 | 1.92 |

(502 more in the JSON)

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -0.96, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 0.003 |
| 0.96, 0.06, -0.03 | pg_fence_lod0/steel_painted_green | 0.003 |

## seam (info, 244)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.97, 0.83, -0.02 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.13 | 35 | 69.2 |
| -0.97, 0.17, -0.02 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.13 | 33 | 69.2 |
| 0.97, 0.17, -0.02 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.13 | 33 | 69.2 |
| 0.97, 0.82, -0.02 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.13 | 33 | 69.2 |
| -0.96, 0.17, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.03 | 26 | 68.5 |
| -0.96, 0.82, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.03 | 26 | 68.5 |
| 0.96, 0.17, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.03 | 26 | 68.5 |
| 0.96, 0.82, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.03 | 25 | 68.5 |
| 0.96, 0.62, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0 | 9 | 36 |
| 0.96, 0.81, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0 | 9 | 36 |
| 0.96, 1.00, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0 | 9 | 36 |
| -0.91, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.86, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.81, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.76, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.71, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.66, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.60, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.55, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.50, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.45, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.40, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.35, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.30, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.25, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.20, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.15, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.10, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.05, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.00, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.05, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.10, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.15, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.20, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.25, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.30, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.35, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.41, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.46, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.51, 0.25, -0.03 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.01 | 8 | 36 |

(204 more in the JSON)

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.00, 1.10, -0.01 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.0004 |
| -1.02, 1.10, -0.00 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.00043 |
| -0.98, 1.10, 0.00 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.00043 |
| -1.00, 1.10, 0.01 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.0004 |
| 1.00, 1.10, -0.01 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.0004 |
| 0.98, 1.10, -0.00 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.00043 |
| 1.02, 1.10, 0.00 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.00043 |
| 1.00, 1.10, 0.01 | pg_fence_lod0/steel_painted_green + pg_fence_lod0/steel_painted_green | 0.0004 |


Nodes: pg_fence_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
