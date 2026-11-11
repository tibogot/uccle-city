# Mesh audit (before pack): playgroundkit.pg_slide_lod2

2,244 triangles, 1,206 welded vertices, 0 open edges, 0 rays, 49 ms.

**0 blocking**, 360 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 360 |
| seam | info | 20 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 360)

| at | part | aspect | longest |
|---|---|---|---|
| -0.54, 1.26, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| -0.54, 1.26, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod2/playground | 180 | 2.034 |
| -0.54, 1.60, -0.46 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.54, 1.60, -0.46 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod2/playground | 224 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod2/playground | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod2/playground | 413 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod2/playground | 413 | 2.534 |
| 0.46, 1.26, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.46, 1.26, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod2/playground | 180 | 2.034 |
| 0.54, 0.59, 0.46 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.54, 1.26, 0.46 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.54, 0.59, 0.46 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.54, 1.26, 0.46 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.54, 0.59, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.54, 1.26, 0.54 | pg_slide_lod2/playground | 332 | 2.034 |
| 0.54, 0.59, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.54, 1.26, 0.54 | pg_slide_lod2/playground | 331 | 2.034 |
| 0.46, 1.60, -0.46 | pg_slide_lod2/playground | 414 | 2.534 |

(320 more in the JSON)

## seam (info, 20)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.31, 1.41, 0.53 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.2 | 41 | 17.7 |
| -0.49, 1.98, 0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.22 | 30 | 29.8 |
| 0.50, 1.95, 0.48 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.21 | 26 | 15.1 |
| -0.46, 1.95, 0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.24 | 20 | 86.3 |
| 0.46, 1.95, 0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.24 | 20 | 86.3 |
| -0.52, 1.08, 0.46 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| -0.46, 1.08, 0.48 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| -0.48, 1.08, -0.46 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| -0.46, 1.08, -0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| 0.46, 1.08, 0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| 0.48, 1.08, 0.46 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| 0.46, 1.08, -0.48 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| 0.52, 1.08, -0.46 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.26 | 18 | 90 |
| -0.21, 0.20, 3.33 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.1 | 14 | 35.4 |
| 0.20, 1.17, 0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.81 | 13 | 42.8 |
| 0.20, 0.19, 3.36 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.1 | 12 | 36.6 |
| -0.52, 2.45, -0.49 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.12 | 5 | 5.8 |
| 0.50, 1.95, 0.48 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.13 | 5 | 7.6 |
| 0.50, 2.45, -0.52 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.11 | 5 | 5 |
| -0.52, 1.95, 0.50 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.04 | 2 | 27.5 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -0.51, 1.95, 0.49 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00043 |
| -0.49, 1.95, 0.50 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00058 |
| -0.51, 2.45, -0.50 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00034 |
| -0.50, 2.45, -0.49 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00022 |
| 0.49, 1.95, 0.50 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00053 |
| 0.51, 1.95, 0.50 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00024 |
| 0.50, 2.45, -0.51 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00041 |
| -0.31, 1.42, 0.53 | pg_slide_lod2/playground + pg_slide_lod2/playground | 0.00011 |


Nodes: pg_slide_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
