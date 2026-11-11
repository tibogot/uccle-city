# Mesh audit (before pack): playgroundkit.pg_spring_lod1

1,012 triangles, 522 welded vertices, 0 open edges, 0 rays, 107 ms.

**0 blocking**, 35 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 35 |
| seam | info | 6 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 35)

| at | part | aspect | longest |
|---|---|---|---|
| -0.18, 0.00, 0.06 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| -0.18, 0.00, -0.06 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| 0.06, 0.00, -0.18 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| -0.06, 0.00, -0.18 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| -0.06, 0.01, -0.18 | pg_spring_lod1/steel_galvanised | 115 | 0.352 |
| 0.18, 0.00, -0.06 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| 0.18, 0.00, 0.06 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| 0.18, 0.01, -0.06 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| -0.06, 0.00, 0.18 | pg_spring_lod1/steel_galvanised | 115 | 0.352 |
| -0.06, 0.01, 0.18 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| 0.06, 0.01, 0.18 | pg_spring_lod1/steel_galvanised | 62 | 0.352 |
| -0.06, 0.01, 0.18 | pg_spring_lod1/steel_galvanised | 51 | 0.352 |
| -0.06, 0.01, -0.18 | pg_spring_lod1/steel_galvanised | 51 | 0.352 |
| 0.18, 0.01, -0.06 | pg_spring_lod1/steel_galvanised | 88 | 0.352 |
| 0.04, 0.47, -0.10 | pg_spring_lod1/steel_galvanised | 48 | 0.272 |
| -0.04, 0.47, -0.10 | pg_spring_lod1/steel_galvanised | 48 | 0.272 |
| -0.04, 0.46, 0.10 | pg_spring_lod1/steel_galvanised | 89 | 0.272 |
| 0.04, 0.47, 0.10 | pg_spring_lod1/steel_galvanised | 48 | 0.272 |
| -0.04, 0.47, 0.10 | pg_spring_lod1/steel_galvanised | 48 | 0.272 |
| -0.13, 0.53, 0.02 | pg_spring_lod1/hdpe_red | 54 | 0.496 |
| 0.03, 0.53, 0.02 | pg_spring_lod1/hdpe_red | 54 | 0.498 |
| -0.13, 0.52, 0.01 | pg_spring_lod1/hdpe_red | 54 | 0.499 |
| 0.03, 0.52, 0.01 | pg_spring_lod1/hdpe_red | 54 | 0.5 |
| -0.01, 0.60, -0.01 | pg_spring_lod1/hdpe_red | 62 | 0.563 |
| -0.19, 0.60, -0.01 | pg_spring_lod1/hdpe_red | 62 | 0.563 |
| -0.00, 0.59, -0.02 | pg_spring_lod1/hdpe_red | 62 | 0.567 |
| -0.19, 0.59, -0.02 | pg_spring_lod1/hdpe_red | 62 | 0.567 |
| -0.13, 0.52, -0.01 | pg_spring_lod1/hdpe_red | 54 | 0.5 |
| 0.03, 0.52, -0.01 | pg_spring_lod1/hdpe_red | 54 | 0.499 |
| -0.13, 0.53, -0.02 | pg_spring_lod1/hdpe_red | 54 | 0.498 |
| 0.03, 0.53, -0.02 | pg_spring_lod1/hdpe_red | 54 | 0.497 |
| 0.24, 0.73, 0.02 | pg_spring_lod1/hdpe_red | 43 | 0.328 |
| 0.29, 0.72, 0.02 | pg_spring_lod1/hdpe_red | 53 | 0.437 |
| 0.24, 0.73, -0.02 | pg_spring_lod1/hdpe_red | 43 | 0.328 |
| 0.29, 0.72, -0.02 | pg_spring_lod1/hdpe_red | 53 | 0.437 |

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.57, 0.02 | pg_spring_lod1/steel_galvanised + pg_spring_lod1/hdpe_red | 0.43 | 43 | 90 |
| 0.05, 0.49, -0.06 | pg_spring_lod1/steel_galvanised + pg_spring_lod1/hdpe_green | 0.33 | 26 | 48.2 |
| -0.04, 0.48, -0.06 | pg_spring_lod1/steel_galvanised + pg_spring_lod1/steel_galvanised | 0.43 | 14 | 45 |
| 0.01, 0.60, 0.01 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.66 | 8 | 22.5 |
| 0.28, 0.85, 0.01 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.05 | 8 | 30 |
| -0.10, 0.46, -0.01 | pg_spring_lod1/steel_galvanised + pg_spring_lod1/steel_galvanised | 0.04 | 4 | 30.9 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.00, 0.60, 0.00 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.00165 |
| -0.16, 0.60, 0.01 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.00105 |
| -0.01, 0.60, -0.01 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.00087 |
| -0.16, 0.60, -0.00 | pg_spring_lod1/hdpe_red + pg_spring_lod1/hdpe_green | 0.00147 |


Nodes: pg_spring_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
