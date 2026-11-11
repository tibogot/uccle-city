# Mesh audit (before pack): playgroundkit.pg_slide_lod2

1,460 triangles, 806 welded vertices, 0 open edges, 0 rays, 39 ms.

**0 blocking**, 289 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 289 |
| seam | info | 16 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 289)

| at | part | aspect | longest |
|---|---|---|---|
| -0.54, 1.26, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| -0.54, 1.60, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod2/wood_stained | 414 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod2/wood_stained | 414 | 2.534 |
| 0.46, 1.26, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.54, 0.59, 0.46 | pg_slide_lod2/wood_stained | 332 | 2.034 |
| 0.54, 0.59, 0.46 | pg_slide_lod2/wood_stained | 333 | 2.034 |
| 0.54, 1.26, 0.46 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.54, 0.59, 0.54 | pg_slide_lod2/wood_stained | 180 | 2.034 |
| 0.54, 1.26, 0.54 | pg_slide_lod2/wood_stained | 333 | 2.034 |
| 0.54, 1.26, 0.54 | pg_slide_lod2/wood_stained | 332 | 2.034 |
| 0.46, 0.75, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.46, 1.60, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.46, 1.60, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.46, 0.75, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.54, 1.60, -0.54 | pg_slide_lod2/wood_stained | 414 | 2.534 |
| 0.54, 0.75, -0.54 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.54, 1.60, -0.54 | pg_slide_lod2/wood_stained | 414 | 2.534 |
| 0.54, 0.75, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.54, 1.60, -0.46 | pg_slide_lod2/wood_stained | 224 | 2.534 |
| 0.15, 1.17, 0.34 | pg_slide_lod2/wood_stained | 160 | 0.902 |
| -0.15, 1.17, 0.34 | pg_slide_lod2/wood_stained | 160 | 0.902 |
| -0.15, 1.20, 0.34 | pg_slide_lod2/wood_stained | 160 | 0.902 |
| 0.15, 1.20, 0.34 | pg_slide_lod2/wood_stained | 160 | 0.902 |

(249 more in the JSON)

## seam (info, 16)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.29, 1.44, 0.54 | pg_slide_lod2/steel_galvanised + pg_slide_lod2/stainless_steel | 0.18 | 24 | 17.7 |
| -0.49, 1.99, 0.49 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.2 | 22 | 33.4 |
| 0.49, 1.96, 0.48 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.2 | 20 | 31.7 |
| -0.46, 1.94, 0.52 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.24 | 18 | 84.4 |
| -0.52, 1.08, 0.46 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.46, 1.08, 0.48 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.48, 1.08, -0.46 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| -0.46, 1.08, -0.52 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.46, 1.08, 0.52 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.48, 1.08, 0.46 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.46, 1.08, -0.48 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.52, 1.08, -0.46 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.26 | 18 | 90 |
| 0.46, 1.95, 0.52 | pg_slide_lod2/wood_stained + pg_slide_lod2/wood_stained | 0.24 | 17 | 84.4 |
| -0.21, 0.19, 3.34 | pg_slide_lod2/steel_galvanised + pg_slide_lod2/steel_galvanised | 0.11 | 13 | 35.4 |
| 0.20, 1.17, 0.52 | pg_slide_lod2/wood_stained + pg_slide_lod2/stainless_steel | 0.81 | 12 | 42.6 |
| 0.21, 0.19, 3.35 | pg_slide_lod2/steel_galvanised + pg_slide_lod2/steel_galvanised | 0.09 | 10 | 71.4 |

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| 0.23, 1.17, 0.81 | pg_slide_lod2/stainless_steel + pg_slide_lod2/stainless_steel | 0.01093 |
| 0.24, 1.13, 0.99 | pg_slide_lod2/stainless_steel + pg_slide_lod2/stainless_steel | 0.00558 |
| -0.23, 0.49, 2.21 | pg_slide_lod2/stainless_steel + pg_slide_lod2/stainless_steel | 0.00753 |
| -0.24, 0.55, 2.11 | pg_slide_lod2/stainless_steel + pg_slide_lod2/stainless_steel | 0.00419 |
| -0.04, 0.37, 2.42 | pg_slide_lod2/stainless_steel + pg_slide_lod2/stainless_steel | 0.02372 |


Nodes: pg_slide_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
