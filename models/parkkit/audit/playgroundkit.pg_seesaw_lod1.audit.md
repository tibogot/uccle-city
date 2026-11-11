# Mesh audit (before pack): playgroundkit.pg_seesaw_lod1

1,142 triangles, 591 welded vertices, 0 open edges, 0 rays, 19 ms.

**0 blocking**, 25 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 25 |
| seam | info | 7 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 25)

| at | part | aspect | longest |
|---|---|---|---|
| 0.06, 0.17, 0.20 | pg_seesaw_lod1/wood_stained | 41 | 0.348 |
| -0.06, 0.17, 0.20 | pg_seesaw_lod1/wood_stained | 41 | 0.348 |
| -0.18, 0.17, -0.07 | pg_seesaw_lod1/wood_stained | 85 | 0.388 |
| -0.18, 0.17, 0.07 | pg_seesaw_lod1/wood_stained | 46 | 0.388 |
| -0.17, 0.17, -0.07 | pg_seesaw_lod1/wood_stained | 84 | 0.388 |
| 0.18, 0.17, -0.07 | pg_seesaw_lod1/wood_stained | 46 | 0.388 |
| 0.18, 0.17, 0.07 | pg_seesaw_lod1/wood_stained | 46 | 0.388 |
| 0.06, 0.17, -0.20 | pg_seesaw_lod1/wood_stained | 41 | 0.348 |
| -0.06, 0.17, -0.20 | pg_seesaw_lod1/wood_stained | 41 | 0.348 |
| 0.53, 0.53, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.53, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.53, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.54, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.63, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.63, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.63, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.63, 0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.63, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.63, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.63, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.63, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.53, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.53, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| -0.53, 0.53, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |
| 0.53, 0.54, -0.06 | pg_seesaw_lod1/wood_stained | 694 | 3.188 |

## seam (info, 7)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.47, -0.15 | pg_seesaw_lod1/steel_galvanised + pg_seesaw_lod1/steel_galvanised | 0.36 | 28 | 88.7 |
| 0.01, 0.48, 0.16 | pg_seesaw_lod1/steel_galvanised + pg_seesaw_lod1/steel_galvanised | 0.36 | 28 | 88.7 |
| -1.52, 0.63, 0.06 | pg_seesaw_lod1/wood_stained + pg_seesaw_lod1/wood_stained | 0.92 | 22 | 45 |
| 1.18, 0.63, 0.05 | pg_seesaw_lod1/wood_stained + pg_seesaw_lod1/wood_stained | 0.92 | 22 | 45 |
| -0.10, 0.17, 0.13 | pg_seesaw_lod1/wood_stained + pg_seesaw_lod1/wood_stained | 0.98 | 18 | 90 |
| -0.06, 0.41, 0.15 | pg_seesaw_lod1/wood_stained + pg_seesaw_lod1/steel_galvanised | 0.26 | 12 | 45 |
| -0.06, 0.41, -0.15 | pg_seesaw_lod1/wood_stained + pg_seesaw_lod1/steel_galvanised | 0.26 | 11 | 45 |


Nodes: pg_seesaw_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
