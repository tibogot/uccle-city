# Mesh audit (before pack): playgroundkit.pg_sandpit_lod2

192 triangles, 113 welded vertices, 16 open edges, 928 rays, 30 ms.

**0 blocking**, 52 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 52 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 52)

| at | part | aspect | longest |
|---|---|---|---|
| 0.54, 0.02, 1.42 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.01, 1.42 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| 0.54, 0.05, 1.43 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| 0.54, -0.02, 1.43 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, -0.00, 1.57 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| 0.54, 0.02, 1.58 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.05, 1.57 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -0.54, 0.11, 1.52 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| 0.54, 0.11, 1.48 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| -0.54, 0.10, 1.46 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.07, 1.44 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| 0.54, 0.02, -1.58 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.01, -1.58 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| 0.54, 0.06, -1.57 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| -0.54, 0.04, -1.58 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| 0.54, -0.02, -1.57 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| 0.54, -0.01, -1.44 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -0.54, 0.01, -1.43 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| 0.54, 0.04, -1.42 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.06, -1.43 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| 0.54, 0.09, -1.44 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| 0.54, 0.10, -1.46 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -0.54, 0.11, -1.48 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| 0.54, 0.11, -1.52 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| -0.54, 0.09, -1.55 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| -1.49, -0.02, -0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.51, -0.02, 0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.45, -0.01, -0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.44, -0.00, 0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.43, 0.02, -0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.43, 0.09, -0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.44, 0.12, -0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.45, 0.13, 0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.49, 0.14, 0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.51, 0.14, -0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.55, 0.13, -0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.56, 0.11, 0.54 | pg_sandpit_lod2/wood_log | 44 | 3.21 |
| -1.57, 0.03, 0.54 | pg_sandpit_lod2/wood_log | 44 | 3.211 |
| -1.56, -0.00, -0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |
| -1.55, -0.01, 0.54 | pg_sandpit_lod2/wood_log | 85 | 3.21 |

(12 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.42, 0.03, -1.58 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/wood_log | 0.93 | 48 | 51.4 |
| -1.43, 0.03, 1.42 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/wood_log | 0.94 | 46 | 51.4 |
| 1.56, 0.00, -1.58 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/wood_log | 0.93 | 46 | 51.4 |
| 1.56, 0.00, 1.42 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/wood_log | 0.92 | 44 | 51.4 |
| 1.09, 0.00, 1.42 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/sand | 2.86 | 10 | 69.6 |
| 0.79, 0.00, -1.43 | pg_sandpit_lod2/wood_log + pg_sandpit_lod2/sand | 2.86 | 8 | 56 |


Nodes: pg_sandpit_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
