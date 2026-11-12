# Mesh audit (before pack): playgroundkit.pg_bench_lod0

1,004 triangles, 528 welded vertices, 0 open edges, 0 rays, 26 ms.

**0 blocking**, 168 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 16 |
| sliver | warn | 152 |
| seam | info | 10 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.71, 0.45, 0.17 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 1.1 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 12.1 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| -0.73, 0.43, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 12.8 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |
| -0.71, 0.43, 0.20 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 1.2 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 2.2 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 0.5 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| -0.73, 0.43, 0.20 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 1.2 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |
| -0.73, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 2.7 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |
| 0.73, 0.45, 0.17 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 1.1 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.73, 0.43, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 12.1 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.71, 0.43, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 12.8 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |
| 0.73, 0.43, 0.20 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 1.2 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.73, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 2.2 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.73, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2 | 0.5 | 0 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.71, 0.43, 0.20 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 1.2 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |
| 0.71, 0.43, 0.21 | pg_bench_lod0/playground + pg_bench_lod0/playground | 2.01 | 2.7 | 0 | 20 | 0.18 | false | -1 + 0 + 0 |

## sliver (warn, 152)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.43, -0.12 | pg_bench_lod0/playground | 40 | 0.482 |
| -0.72, 0.44, 0.04 | pg_bench_lod0/playground | 40 | 0.482 |
| -0.72, 0.56, 0.24 | pg_bench_lod0/playground | 55 | 0.439 |
| -0.72, 0.70, 0.27 | pg_bench_lod0/playground | 55 | 0.439 |
| -0.72, 0.57, 0.18 | pg_bench_lod0/playground | 55 | 0.439 |
| -0.72, 0.71, 0.21 | pg_bench_lod0/playground | 55 | 0.439 |
| 0.72, 0.43, -0.12 | pg_bench_lod0/playground | 40 | 0.482 |
| 0.72, 0.44, 0.04 | pg_bench_lod0/playground | 40 | 0.482 |
| 0.72, 0.56, 0.24 | pg_bench_lod0/playground | 55 | 0.439 |
| 0.72, 0.70, 0.27 | pg_bench_lod0/playground | 55 | 0.439 |
| 0.72, 0.57, 0.18 | pg_bench_lod0/playground | 55 | 0.439 |
| 0.72, 0.71, 0.21 | pg_bench_lod0/playground | 55 | 0.439 |
| -0.30, 0.44, -0.25 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.44, -0.25 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.44, -0.26 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.44, -0.26 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.25 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.47, -0.25 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.26 | pg_bench_lod0/playground | 292 | 1.784 |
| -0.30, 0.47, -0.26 | pg_bench_lod0/playground | 292 | 1.784 |
| 0.30, 0.44, -0.17 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.44, -0.17 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.44, -0.16 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.44, -0.16 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.47, -0.17 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.17 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.47, -0.16 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.16 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.46, -0.16 | pg_bench_lod0/playground | 94 | 1.784 |
| -0.30, 0.45, -0.16 | pg_bench_lod0/playground | 94 | 1.784 |
| -0.30, 0.46, -0.26 | pg_bench_lod0/playground | 94 | 1.784 |
| 0.30, 0.45, -0.26 | pg_bench_lod0/playground | 94 | 1.784 |
| -0.30, 0.44, -0.14 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.44, -0.14 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.44, -0.15 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.44, -0.15 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.14 | pg_bench_lod0/playground | 291 | 1.784 |
| -0.30, 0.47, -0.14 | pg_bench_lod0/playground | 291 | 1.784 |
| 0.30, 0.47, -0.15 | pg_bench_lod0/playground | 292 | 1.784 |
| -0.30, 0.47, -0.15 | pg_bench_lod0/playground | 292 | 1.784 |

(112 more in the JSON)

## seam (info, 10)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.77, 0.44, -0.25 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.19 | 46 | 74.5 |
| -0.78, 0.44, -0.25 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.19 | 44 | 74.5 |
| 0.73, 0.44, 0.08 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.23 | 30 | 70.8 |
| -0.72, 0.44, 0.16 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.11 | 28 | 78.2 |
| -0.71, 0.44, 0.08 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.23 | 26 | 70.8 |
| 0.72, 0.44, 0.16 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.11 | 26 | 78.2 |
| -0.71, 0.44, 0.05 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.15 | 12 | 64.2 |
| -0.72, 0.45, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.14 | 12 | 69.2 |
| 0.73, 0.44, 0.05 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.15 | 12 | 64.2 |
| 0.72, 0.45, 0.18 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.14 | 12 | 69.2 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| -0.72, 0.44, -0.03 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00004 |
| -0.72, 0.44, 0.01 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00033 |
| -0.72, 0.44, -0.03 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00005 |
| -0.72, 0.44, 0.01 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00052 |
| 0.72, 0.44, 0.01 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00034 |
| 0.72, 0.44, 0.01 | pg_bench_lod0/playground + pg_bench_lod0/playground | 0.00051 |


Nodes: pg_bench_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
