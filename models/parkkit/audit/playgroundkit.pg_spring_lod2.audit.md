# Mesh audit (before pack): playgroundkit.pg_spring_lod2

380 triangles, 206 welded vertices, 0 open edges, 0 rays, 9 ms.

**0 blocking**, 9 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| nonmanifold | warn | 5 |
| seam | info | 4 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -0.18, 0.00, -0.06 | pg_spring_lod2/steel_galvanised | 62 | 0.352 |
| 0.18, 0.00, -0.06 | pg_spring_lod2/steel_galvanised | 62 | 0.352 |
| 0.29, 0.72, 0.02 | pg_spring_lod2/hdpe_red | 53 | 0.437 |
| 0.29, 0.72, -0.02 | pg_spring_lod2/hdpe_red | 53 | 0.437 |

## nonmanifold (warn, 5)

| at | part | uses |
|---|---|---|
| -0.09, 0.22, -0.01 | pg_spring_lod2/steel_galvanised | 4 |
| -0.06, 0.29, -0.07 | pg_spring_lod2/steel_galvanised | 4 |
| 0.08, 0.34, -0.04 | pg_spring_lod2/steel_galvanised | 4 |
| 0.07, 0.34, -0.07 | pg_spring_lod2/steel_galvanised | 4 |
| -0.06, 0.39, 0.08 | pg_spring_lod2/steel_galvanised | 4 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.57, 0.02 | pg_spring_lod2/steel_galvanised + pg_spring_lod2/hdpe_red | 0.42 | 31 | 82.5 |
| 0.05, 0.49, -0.06 | pg_spring_lod2/steel_galvanised + pg_spring_lod2/hdpe_green | 0.31 | 18 | 29.8 |
| -0.04, 0.48, -0.06 | pg_spring_lod2/steel_galvanised + pg_spring_lod2/steel_galvanised | 0.43 | 13 | 45 |
| -0.01, 0.60, -0.01 | pg_spring_lod2/hdpe_red + pg_spring_lod2/hdpe_green | 0.63 | 4 | 23.2 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 0.09, 0.11, 0.03 | pg_spring_lod2/steel_galvanised + pg_spring_lod2/steel_galvanised | 0.00087 |
| 0.08, 0.35, -0.06 | pg_spring_lod2/steel_galvanised + pg_spring_lod2/steel_galvanised | 0.00102 |
| 0.27, 0.85, 0.04 | pg_spring_lod2/hdpe_green + pg_spring_lod2/hdpe_green | 0.00352 |


Nodes: pg_spring_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
