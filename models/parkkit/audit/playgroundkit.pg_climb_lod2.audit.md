# Mesh audit (before pack): playgroundkit.pg_climb_lod2

1,514 triangles, 859 welded vertices, 0 open edges, 0 rays, 40 ms.

**0 blocking**, 269 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 269 |
| seam | info | 74 |
| backtoback | info | 15 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 269)

| at | part | aspect | longest |
|---|---|---|---|
| -0.64, 1.90, 0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.64, 0.90, 0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.64, 0.90, 0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.64, 1.90, 0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.56, 0.90, 0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.56, 1.90, 0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.56, 0.90, 0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.56, 1.90, 0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| -0.65, 1.90, 0.61 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.65, 0.90, 0.59 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.59, 1.90, 0.65 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.61, 0.90, 0.65 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.61, 1.90, 0.56 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.59, 0.90, 0.56 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.56, 1.90, 0.59 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.56, 0.90, 0.61 | pg_climb_lod2/wood_stained | 40 | 2.985 |
| -0.64, 0.74, -0.56 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.64, 1.56, -0.56 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.64, 1.56, -0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.64, 0.74, -0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.56, 1.56, -0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.56, 0.74, -0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| -0.56, 1.56, -0.56 | pg_climb_lod2/wood_stained | 219 | 2.484 |
| -0.56, 0.74, -0.56 | pg_climb_lod2/wood_stained | 219 | 2.484 |
| 0.56, 0.74, 0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| 0.56, 1.56, 0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| 0.56, 0.74, 0.56 | pg_climb_lod2/wood_stained | 219 | 2.484 |
| 0.56, 1.56, 0.56 | pg_climb_lod2/wood_stained | 219 | 2.484 |
| 0.64, 1.56, 0.56 | pg_climb_lod2/wood_stained | 405 | 2.484 |
| 0.64, 0.74, 0.56 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| 0.64, 1.56, 0.56 | pg_climb_lod2/wood_stained | 406 | 2.484 |
| 0.64, 0.74, 0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| 0.64, 1.56, 0.64 | pg_climb_lod2/wood_stained | 220 | 2.484 |
| 0.56, 0.90, -0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.56, 1.90, -0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.56, 0.90, -0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.56, 1.90, -0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.64, 1.90, -0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.64, 0.90, -0.64 | pg_climb_lod2/wood_stained | 264 | 2.984 |
| 0.64, 0.90, -0.56 | pg_climb_lod2/wood_stained | 264 | 2.984 |

(229 more in the JSON)

## seam (info, 74)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.52, 1.47, -0.62 | pg_climb_lod2/wood_stained + pg_climb_lod2/hpl_panel | 2.38 | 37 | 32.4 |
| 0.66, 1.21, -0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 36 | 47.5 |
| 0.66, 0.92, -0.36 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 36 | 47.4 |
| 0.65, 0.33, -0.13 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 35 | 55.7 |
| 0.65, 0.91, 0.35 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 34 | 55.7 |
| 0.65, 0.62, 0.11 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 34 | 55.5 |
| 0.05, 2.96, -0.08 | pg_climb_lod2/steel_galvanised + pg_climb_lod2/steel_galvanised | 0.24 | 32 | 30.4 |
| 0.64, 1.21, 0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 30 | 55.4 |
| 0.65, 0.63, -0.36 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.14 | 30 | 47.4 |
| 0.68, 0.33, 0.35 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 29 | 55.8 |
| 0.66, 0.62, 0.35 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.14 | 29 | 51.2 |
| 0.65, 0.34, 0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.14 | 28 | 55.7 |
| 0.65, 0.92, -0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.15 | 27 | 47.4 |
| 0.66, 0.63, -0.60 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 24 | 49.4 |
| 0.67, 0.05, 0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 23 | 48 |
| 0.66, 1.50, 0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 22 | 48.7 |
| 0.64, 0.34, -0.60 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 22 | 48.2 |
| 0.67, 0.92, -0.60 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 22 | 46.6 |
| 0.68, 0.62, 0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 21 | 48.7 |
| 0.63, 0.05, -0.36 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 21 | 45.8 |
| 0.67, 1.20, -0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 21 | 47.7 |
| 0.67, 0.06, 0.35 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 20 | 45.3 |
| 0.64, 1.50, 0.36 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 20 | 47.7 |
| 0.67, 1.50, -0.12 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 20 | 46.4 |
| 0.67, 1.49, -0.37 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 20 | 47.3 |
| -0.62, 1.38, 0.56 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.56, 1.39, 0.58 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.58, 1.38, -0.56 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.56, 1.39, -0.62 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.56, 1.39, 0.60 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.58, 1.38, 0.56 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.56, 1.39, -0.58 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.61, 1.38, -0.56 | pg_climb_lod2/wood_stained + pg_climb_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.67, 0.34, 0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 18 | 45.3 |
| 0.64, 0.04, -0.56 | pg_climb_lod2/wood_stained + pg_climb_lod2/rope_grey | 0.13 | 17 | 45 |
| 0.65, 1.42, -0.60 | pg_climb_lod2/wood_stained + pg_climb_lod2/rope_grey | 0.87 | 17 | 45.1 |
| 0.66, 0.06, 0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.06 | 17 | 48.3 |
| 0.65, 1.20, 0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.08 | 17 | 46 |
| 0.64, 0.06, -0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.06 | 17 | 46 |
| 0.65, 1.49, -0.59 | pg_climb_lod2/rope_grey + pg_climb_lod2/rope_grey | 0.06 | 17 | 48.7 |

(34 more in the JSON)

## backtoback (info, 15)

| at | parts | area |
|---|---|---|
| 0.04, 1.50, -0.03 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00005 |
| 0.06, 1.50, -0.03 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00026 |
| 0.05, 1.50, -0.07 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00039 |
| 0.05, 1.50, -0.06 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00043 |
| 0.03, 1.50, -0.06 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00004 |
| 0.03, 1.50, -0.06 | pg_climb_lod2/wood_stained + pg_climb_lod2/steel_galvanised | 0.00006 |
| 0.23, 0.24, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.00282 |
| -0.40, 0.53, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.0024 |
| 0.32, 0.80, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.00248 |
| -0.22, 1.07, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.00259 |
| 0.18, 1.37, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.00121 |
| 0.16, 1.35, -0.63 | pg_climb_lod2/hdpe_green + pg_climb_lod2/hpl_panel | 0.00252 |
| -0.08, 0.39, -0.63 | pg_climb_lod2/hpl_panel + pg_climb_lod2/hdpe_red | 0.00244 |
| 0.25, 0.66, -0.63 | pg_climb_lod2/hpl_panel + pg_climb_lod2/hdpe_red | 0.00266 |
| -0.06, 0.42, -0.65 | pg_climb_lod2/hdpe_red + pg_climb_lod2/hdpe_red | 0.00018 |


Nodes: pg_climb_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
