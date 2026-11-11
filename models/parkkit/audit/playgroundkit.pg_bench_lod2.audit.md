# Mesh audit (before pack): playgroundkit.pg_bench_lod2

334 triangles, 193 welded vertices, 0 open edges, 0 rays, 7 ms.

**0 blocking**, 111 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 15 |
| sliver | warn | 96 |
| seam | info | 10 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 15)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.71, 0.45, 0.17 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 1.1 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 12.1 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| -0.73, 0.43, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 12.8 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |
| -0.71, 0.43, 0.20 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 1.2 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 2.2 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| -0.71, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 0.5 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| -0.73, 0.43, 0.20 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 1.2 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |
| -0.73, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 2.7 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |
| 0.73, 0.45, 0.17 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 1.1 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| 0.73, 0.43, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 13.2 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| 0.71, 0.43, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 12.8 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |
| 0.73, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 2.2 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| 0.73, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2 | 0.5 | 0 | 160 | 1.25 | false | 1 + 0 + 0 |
| 0.71, 0.43, 0.20 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 1.2 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |
| 0.71, 0.43, 0.21 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 2.01 | 2.7 | 0 | 160 | 1.25 | false | -1 + 0 + 0 |

## sliver (warn, 96)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.43, -0.12 | pg_bench_lod2/steel_painted_green | 40 | 0.482 |
| -0.72, 0.44, 0.04 | pg_bench_lod2/steel_painted_green | 40 | 0.482 |
| -0.72, 0.56, 0.24 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| -0.72, 0.70, 0.27 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| -0.72, 0.57, 0.18 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| -0.72, 0.71, 0.21 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| 0.72, 0.43, -0.12 | pg_bench_lod2/steel_painted_green | 40 | 0.482 |
| 0.72, 0.44, 0.04 | pg_bench_lod2/steel_painted_green | 40 | 0.482 |
| 0.72, 0.56, 0.24 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| 0.72, 0.70, 0.27 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| 0.72, 0.57, 0.18 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| 0.72, 0.71, 0.21 | pg_bench_lod2/steel_painted_green | 55 | 0.439 |
| -0.30, 0.44, -0.25 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.44, -0.26 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.47, -0.25 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.47, -0.26 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.44, -0.17 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.44, -0.17 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.47, -0.17 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.47, -0.17 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.46, -0.16 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| -0.30, 0.45, -0.16 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| -0.30, 0.46, -0.26 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| 0.30, 0.45, -0.26 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| 0.30, 0.44, -0.14 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.44, -0.14 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.47, -0.14 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.47, -0.14 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.44, -0.06 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.44, -0.06 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.47, -0.06 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.47, -0.06 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.46, -0.05 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| -0.30, 0.45, -0.05 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| -0.30, 0.46, -0.15 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| 0.30, 0.45, -0.15 | pg_bench_lod2/wood_bench | 94 | 1.784 |
| 0.30, 0.44, -0.03 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.44, -0.04 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| -0.30, 0.47, -0.03 | pg_bench_lod2/wood_bench | 158 | 1.784 |
| 0.30, 0.47, -0.04 | pg_bench_lod2/wood_bench | 158 | 1.784 |

(56 more in the JSON)

## seam (info, 10)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.71, 0.44, 0.08 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.22 | 20 | 48.4 |
| -0.72, 0.44, 0.16 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.11 | 20 | 56.8 |
| 0.73, 0.44, 0.08 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.22 | 20 | 48.4 |
| 0.72, 0.44, 0.16 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.11 | 20 | 56.8 |
| 0.79, 0.44, -0.25 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.16 | 16 | 83.8 |
| -0.79, 0.44, -0.24 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.15 | 14 | 84.5 |
| -0.72, 0.45, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 0.14 | 12 | 69.2 |
| 0.72, 0.45, 0.18 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/steel_painted_green | 0.14 | 12 | 69.2 |
| 0.73, 0.44, 0.05 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.15 | 10 | 41.7 |
| -0.71, 0.44, 0.05 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.15 | 6 | 41.7 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| -0.72, 0.44, -0.03 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00004 |
| -0.72, 0.44, 0.01 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00033 |
| -0.72, 0.44, -0.03 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00005 |
| -0.72, 0.44, 0.01 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00052 |
| 0.72, 0.44, 0.01 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00034 |
| 0.72, 0.44, 0.01 | pg_bench_lod2/steel_painted_green + pg_bench_lod2/wood_bench | 0.00051 |


Nodes: pg_bench_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
