# Mesh audit (before pack): playgroundkit.pg_seesaw_lod2

534 triangles, 287 welded vertices, 0 open edges, 0 rays, 7 ms.

**0 blocking**, 19 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| nonmanifold | warn | 3 |
| seam | info | 7 |
| backtoback | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| 0.06, 0.17, 0.20 | pg_seesaw_lod2/wood_stained | 41 | 0.348 |
| -0.06, 0.17, 0.20 | pg_seesaw_lod2/wood_stained | 41 | 0.348 |
| -0.18, 0.17, -0.07 | pg_seesaw_lod2/wood_stained | 46 | 0.388 |
| -0.18, 0.17, 0.07 | pg_seesaw_lod2/wood_stained | 46 | 0.388 |
| 0.18, 0.17, -0.07 | pg_seesaw_lod2/wood_stained | 46 | 0.388 |
| 0.18, 0.17, 0.07 | pg_seesaw_lod2/wood_stained | 46 | 0.388 |
| 0.06, 0.17, -0.20 | pg_seesaw_lod2/wood_stained | 41 | 0.348 |
| -0.06, 0.17, -0.20 | pg_seesaw_lod2/wood_stained | 41 | 0.348 |
| 0.53, 0.53, 0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| -0.53, 0.53, 0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| 0.53, 0.63, 0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| -0.53, 0.63, 0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| 0.53, 0.63, -0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| -0.53, 0.63, -0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| 0.53, 0.53, -0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |
| -0.53, 0.53, -0.06 | pg_seesaw_lod2/wood_stained | 376 | 3.188 |

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| -1.10, 0.92, 0.05 | pg_seesaw_lod2/steel_painted_red | 4 |
| 1.10, 0.68, 0.16 | pg_seesaw_lod2/steel_painted_red | 4 |
| 1.10, 0.92, -0.05 | pg_seesaw_lod2/steel_painted_red | 4 |

## seam (info, 7)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.47, -0.15 | pg_seesaw_lod2/steel_galvanised + pg_seesaw_lod2/steel_galvanised | 0.33 | 20 | 87.5 |
| 0.01, 0.48, 0.16 | pg_seesaw_lod2/steel_galvanised + pg_seesaw_lod2/steel_galvanised | 0.33 | 20 | 87.5 |
| -0.10, 0.17, 0.13 | pg_seesaw_lod2/wood_stained + pg_seesaw_lod2/wood_stained | 0.98 | 18 | 90 |
| -1.52, 0.63, 0.05 | pg_seesaw_lod2/wood_stained + pg_seesaw_lod2/wood_stained | 0.91 | 14 | 45 |
| 1.47, 0.63, 0.06 | pg_seesaw_lod2/wood_stained + pg_seesaw_lod2/wood_stained | 0.91 | 14 | 45 |
| -0.06, 0.41, -0.15 | pg_seesaw_lod2/wood_stained + pg_seesaw_lod2/steel_galvanised | 0.26 | 9 | 45 |
| -0.06, 0.41, 0.15 | pg_seesaw_lod2/wood_stained + pg_seesaw_lod2/steel_galvanised | 0.26 | 8 | 45 |

## backtoback (info, 1)

| at | parts | area |
|---|---|---|
| 1.10, 0.66, 0.15 | pg_seesaw_lod2/steel_painted_red + pg_seesaw_lod2/steel_painted_red | 0.0014 |


Nodes: pg_seesaw_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
