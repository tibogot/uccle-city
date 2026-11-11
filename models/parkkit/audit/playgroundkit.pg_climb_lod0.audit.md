# Mesh audit (before pack): playgroundkit.pg_climb_lod0

6,916 triangles, 3,650 welded vertices, 0 open edges, 0 rays, 296 ms.

**0 blocking**, 574 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 570 |
| seam | info | 163 |
| backtoback | info | 69 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.65, 1.29, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 2.75 | 11.2 | 0.8 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.65, 1.38, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 2.75 | 11.2 | 0.8 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.65, 0.15, -0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 2.75 | 11.6 | 2.7 | 20 | 0.18 | false | 1 + 0 + 0 |
| 0.65, 0.24, -0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 2.75 | 11.6 | 2.7 | 20 | 0.18 | false | 1 + 0 + 0 |

## sliver (warn, 570)

| at | part | aspect | longest |
|---|---|---|---|
| -0.64, 1.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 0.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 1.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 0.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 0.90, 0.56 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 1.90, 0.56 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.64, 0.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.64, 1.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 0.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 1.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 0.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 1.90, 0.56 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 0.90, 0.64 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 1.90, 0.64 | pg_climb_lod0/wood_stained | 487 | 2.984 |
| -0.56, 0.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.56, 1.90, 0.64 | pg_climb_lod0/wood_stained | 488 | 2.984 |
| -0.65, 1.90, 0.61 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.65, 0.90, 0.59 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.59, 1.90, 0.65 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.61, 0.90, 0.65 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.61, 1.90, 0.56 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.59, 0.90, 0.56 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.56, 1.90, 0.59 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.56, 0.90, 0.61 | pg_climb_lod0/wood_stained | 40 | 2.985 |
| -0.64, 1.56, -0.56 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.64, 0.74, -0.56 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.64, 1.56, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.64, 0.74, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.64, 0.74, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.64, 1.56, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.64, 0.74, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.64, 1.56, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.56, 0.74, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.56, 1.56, -0.64 | pg_climb_lod0/wood_stained | 406 | 2.484 |
| -0.56, 0.74, -0.64 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.56, 1.56, -0.64 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.56, 0.74, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.56, 1.56, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.56, 0.74, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |
| -0.56, 1.56, -0.56 | pg_climb_lod0/wood_stained | 405 | 2.484 |

(530 more in the JSON)

## seam (info, 163)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.54, 1.47, -0.62 | pg_climb_lod0/wood_stained + pg_climb_lod0/hpl_panel | 2.39 | 68 | 56.2 |
| 0.05, 2.96, -0.08 | pg_climb_lod0/steel_galvanised + pg_climb_lod0/steel_galvanised | 0.25 | 54 | 20 |
| 0.67, 0.34, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27 |
| 0.66, 0.63, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.7 |
| 0.64, 0.92, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.63, 1.21, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27.4 |
| 0.66, 0.34, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.7 |
| 0.64, 0.63, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.63, 0.92, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27.4 |
| 0.65, 1.21, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.64, 0.34, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.63, 0.63, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27.4 |
| 0.65, 0.92, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.67, 1.21, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.4 |
| 0.63, 0.34, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27.4 |
| 0.65, 0.63, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.5 |
| 0.67, 0.92, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 26.4 |
| 0.67, 1.21, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.12 | 44 | 27.8 |
| 0.67, 0.33, 0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 49.3 |
| 0.67, 0.62, 0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 52.4 |
| 0.66, 0.91, 0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 54.6 |
| 0.64, 1.20, 0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 53.4 |
| 0.67, 0.33, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 52.4 |
| 0.66, 0.62, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 54.6 |
| 0.64, 0.91, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 53.4 |
| 0.63, 1.20, 0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 49.9 |
| 0.66, 0.33, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 54.7 |
| 0.64, 0.62, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 53.4 |
| 0.63, 0.91, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 49.9 |
| 0.64, 0.33, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 53.4 |
| 0.63, 0.62, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 49.9 |
| 0.67, 1.20, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 48.9 |
| 0.63, 0.33, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 49.9 |
| 0.67, 1.20, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 51.3 |
| 0.67, 0.91, -0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 51.3 |
| 0.66, 1.20, -0.60 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 34 | 54.5 |
| 0.65, 1.20, 0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 33 | 48.9 |
| 0.65, 0.91, -0.12 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 33 | 48.9 |
| 0.65, 0.62, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 33 | 48.9 |
| 0.67, 0.91, -0.36 | pg_climb_lod0/rope_grey + pg_climb_lod0/rope_grey | 0.1 | 33 | 48.9 |

(123 more in the JSON)

## backtoback (info, 69)

| at | parts | area |
|---|---|---|
| -0.60, 2.90, 0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.62, 2.90, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.59, 2.90, 0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00019 |
| -0.62, 2.90, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00026 |
| -0.60, 2.90, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00038 |
| -0.58, 2.90, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00009 |
| -0.60, 2.90, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00046 |
| -0.58, 2.90, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.60, 2.90, 0.62 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.59, 2.90, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00028 |
| -0.59, 2.95, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00006 |
| -0.60, 2.95, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00013 |
| -0.60, 2.95, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00006 |
| -0.60, 2.40, -0.62 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.62, 2.40, -0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.59, 2.40, -0.62 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00019 |
| -0.62, 2.40, -0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00026 |
| -0.60, 2.40, -0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00038 |
| -0.58, 2.40, -0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.60, 2.40, -0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| -0.58, 2.40, -0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00009 |
| -0.59, 2.40, -0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00028 |
| -0.60, 2.40, -0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00046 |
| -0.59, 2.45, -0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00006 |
| -0.60, 2.45, -0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00006 |
| -0.60, 2.45, -0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00013 |
| 0.60, 2.40, 0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| 0.58, 2.40, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| 0.61, 2.40, 0.58 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00019 |
| 0.58, 2.40, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00026 |
| 0.59, 2.40, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00038 |
| 0.62, 2.40, 0.59 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00009 |
| 0.60, 2.40, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00046 |
| 0.60, 2.40, 0.62 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| 0.61, 2.40, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00028 |
| 0.62, 2.40, 0.61 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00004 |
| 0.65, 1.15, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 0.00056 |
| 0.65, 1.02, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 0.00116 |
| 0.65, 1.09, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/rope_grey | 0.0006 |
| 0.60, 2.45, 0.60 | pg_climb_lod0/wood_stained + pg_climb_lod0/wood_stained | 0.00006 |

(29 more in the JSON)


Nodes: pg_climb_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
