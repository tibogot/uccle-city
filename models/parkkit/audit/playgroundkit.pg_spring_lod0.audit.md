# Mesh audit (before pack): playgroundkit.pg_spring_lod0

2,496 triangles, 1,264 welded vertices, 0 open edges, 0 rays, 256 ms.

**0 blocking**, 80 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 80 |
| seam | info | 6 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 80)

| at | part | aspect | longest |
|---|---|---|---|
| -0.18, 0.00, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.00, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.00, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.00, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.00, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.00, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.00, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.00, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.00, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.00, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.00, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.00, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.00, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.00, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.00, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.00, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| 0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 115 | 0.352 |
| -0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| -0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| 0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| -0.06, 0.01, 0.18 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| -0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| 0.06, 0.01, -0.18 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| 0.18, 0.01, -0.06 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |
| 0.18, 0.01, 0.06 | pg_spring_lod0/steel_galvanised | 88 | 0.352 |

(40 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.57, 0.02 | pg_spring_lod0/steel_galvanised + pg_spring_lod0/hdpe_red | 0.44 | 51 | 90 |
| 0.05, 0.49, -0.07 | pg_spring_lod0/steel_galvanised + pg_spring_lod0/hdpe_green | 0.58 | 44 | 72 |
| -0.05, 0.48, -0.07 | pg_spring_lod0/steel_galvanised + pg_spring_lod0/steel_galvanised | 0.45 | 26 | 67.5 |
| 0.28, 0.85, 0.01 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.08 | 18 | 24 |
| -0.09, 0.46, -0.00 | pg_spring_lod0/steel_galvanised + pg_spring_lod0/steel_galvanised | 0.06 | 9 | 10.5 |
| 0.01, 0.60, 0.01 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.66 | 8 | 22.5 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.00, 0.60, 0.00 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.00165 |
| -0.16, 0.60, 0.01 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.00105 |
| -0.01, 0.60, -0.01 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.00087 |
| -0.16, 0.60, -0.00 | pg_spring_lod0/hdpe_red + pg_spring_lod0/hdpe_green | 0.00147 |


Nodes: pg_spring_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
