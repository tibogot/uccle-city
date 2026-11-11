# Mesh audit (before pack): playgroundkit.pg_slide_lod1

3,318 triangles, 1,759 welded vertices, 0 open edges, 0 rays, 69 ms.

**0 blocking**, 459 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 459 |
| seam | info | 32 |
| backtoback | info | 11 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 459)

| at | part | aspect | longest |
|---|---|---|---|
| -0.54, 1.26, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.54, 1.26, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| -0.54, 1.60, -0.46 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.54, 1.60, -0.46 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod1/playground | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod1/playground | 413 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod1/playground | 413 | 2.534 |
| 0.46, 1.26, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod1/playground | 332 | 2.034 |
| 0.46, 1.26, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod1/playground | 331 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod1/playground | 332 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod1/playground | 331 | 2.034 |

(419 more in the JSON)

## seam (info, 32)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.31, 1.45, 0.53 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.35 | 71 | 35.7 |
| -0.49, 1.99, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.24 | 36 | 23.5 |
| 0.50, 1.95, 0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.22 | 30 | 31.7 |
| -0.46, 1.95, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.25 | 22 | 90 |
| 0.46, 1.95, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.25 | 22 | 90 |
| -0.21, 0.20, 3.33 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.11 | 22 | 41.2 |
| 0.21, 0.20, 3.37 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.1 | 22 | 41.2 |
| -0.52, 1.08, 0.46 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 19 | 89.9 |
| -0.48, 1.08, -0.46 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 19 | 89.9 |
| -0.46, 1.08, 0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| -0.46, 1.08, -0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| 0.46, 1.08, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| 0.48, 1.08, 0.46 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| 0.46, 1.08, -0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| 0.52, 1.08, -0.46 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.26 | 18 | 90 |
| 0.20, 1.17, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.81 | 13 | 42.8 |
| -0.22, 0.71, -0.91 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.1 | 12 | 10.8 |
| 0.22, 0.42, -1.06 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.1 | 12 | 8 |
| 0.22, 0.72, -0.89 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.1 | 12 | 8 |
| -0.22, 0.98, -0.70 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.11 | 11 | 14.8 |
| 0.22, 0.99, -0.73 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.1 | 9 | 8 |
| -0.49, 1.95, 0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.15 | 7 | 11.9 |
| 0.22, 0.18, -1.24 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.07 | 6 | 6.7 |
| -0.52, 2.45, -0.49 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.12 | 5 | 5.8 |
| -0.50, 2.50, -0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.05 | 5 | 9.4 |
| 0.50, 1.95, 0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.13 | 5 | 7.6 |
| 0.50, 2.45, -0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.11 | 5 | 5 |
| -0.22, 0.17, -1.21 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.07 | 5 | 10.7 |
| -0.22, 0.44, -1.04 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.07 | 5 | 10.8 |
| -0.51, 2.00, 0.51 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.03 | 4 | 6.3 |
| 0.51, 2.00, 0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0 | 2 | 7 |
| 0.51, 2.50, -0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.02 | 2 | 7.3 |

## backtoback (info, 11)

| at | parts | area |
|---|---|---|
| -0.50, 1.95, 0.48 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00026 |
| -0.52, 1.95, 0.51 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00019 |
| -0.51, 1.95, 0.49 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00038 |
| -0.51, 1.95, 0.52 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00009 |
| -0.49, 1.95, 0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00046 |
| -0.51, 2.45, -0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00034 |
| -0.50, 2.45, -0.49 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00022 |
| -0.50, 2.50, -0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00013 |
| 0.49, 1.95, 0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00053 |
| 0.51, 1.95, 0.50 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00024 |
| 0.50, 2.45, -0.51 | pg_slide_lod1/playground + pg_slide_lod1/playground | 0.00041 |


Nodes: pg_slide_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
