# Mesh audit (before pack): playgroundkit.pg_gate_lod1

642 triangles, 369 welded vertices, 0 open edges, 0 rays, 14 ms.

**0 blocking**, 182 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 1 |
| sliver | warn | 181 |
| seam | info | 6 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.54, 0.90, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_galvanised | 2.99 | 2.6 | 4.5 | 55 | 0.45 | false | 0.38 + 0 + -0.92 |

## sliver (warn, 181)

| at | part | aspect | longest |
|---|---|---|---|
| -0.62, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| -0.62, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.62, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| -0.54, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| -0.54, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.54, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| -0.54, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| 0.54, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 182 | 1.29 |
| 0.54, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, -0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, 0.04 | pg_gate_lod1/steel_painted_green | 337 | 1.29 |
| -0.17, 0.06, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 0.06, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 0.10, -0.01 | pg_gate_lod1/steel_painted_green | 337 | 1.032 |
| -0.17, 0.10, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 0.10, -0.01 | pg_gate_lod1/steel_painted_green | 336 | 1.032 |
| 0.17, 0.10, -0.05 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| -0.17, 0.10, -0.05 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 0.06, -0.05 | pg_gate_lod1/steel_painted_green | 337 | 1.032 |
| -0.17, 0.06, -0.05 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 0.06, -0.05 | pg_gate_lod1/steel_painted_green | 338 | 1.032 |
| 0.17, 1.03, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| -0.17, 1.03, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| 0.17, 1.07, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |
| -0.17, 1.07, -0.01 | pg_gate_lod1/steel_painted_green | 182 | 1.032 |

(141 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.52, 0.88, -0.05 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_galvanised | 0.45 | 34 | 90 |
| 0.54, 0.88, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_galvanised | 0.4 | 27 | 89.9 |
| -0.54, 0.15, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_galvanised | 0.24 | 19 | 36 |
| -0.54, 0.85, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_galvanised | 0.23 | 16 | 54 |
| -0.61, 1.20, 0.00 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.28 | 4 | 44.9 |
| 0.55, 1.20, 0.00 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.28 | 4 | 44.9 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.59, 1.20, -0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00123 |
| -0.60, 1.20, 0.00 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00122 |
| -0.55, 1.20, 0.01 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00123 |
| -0.58, 1.20, 0.02 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00122 |
| 0.58, 1.20, -0.02 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00122 |
| 0.55, 1.20, -0.01 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00123 |
| 0.60, 1.20, 0.00 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00122 |
| 0.59, 1.20, 0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00123 |
| 0.51, 0.10, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| 0.49, 0.10, -0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| -0.49, 0.10, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| -0.51, 0.10, -0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| 0.49, 1.03, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| 0.51, 1.03, -0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| -0.51, 1.03, -0.04 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |
| -0.49, 1.03, -0.03 | pg_gate_lod1/steel_painted_green + pg_gate_lod1/steel_painted_green | 0.00045 |


Nodes: pg_gate_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
