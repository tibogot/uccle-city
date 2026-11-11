# Mesh audit (before pack): playgroundkit.pg_sandpit_lod1

466 triangles, 257 welded vertices, 30 open edges, 944 rays, 23 ms.

**0 blocking**, 92 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 92 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 92)

| at | part | aspect | longest |
|---|---|---|---|
| 0.54, 0.02, 1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.01, 1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.06, 1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.04, 1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, -0.02, 1.43 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, -0.02, 1.57 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.01, 1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.02, 1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.04, 1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.06, 1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.08, 1.57 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.09, 1.56 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.10, 1.54 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.11, 1.53 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.11, 1.51 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.11, 1.49 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.11, 1.47 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.10, 1.46 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.09, 1.44 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.08, 1.43 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.02, -1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.01, -1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.06, -1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.04, -1.58 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, -0.02, -1.57 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, -0.02, -1.43 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.01, -1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.02, -1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.04, -1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.06, -1.42 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.08, -1.43 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.09, -1.44 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.10, -1.46 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.11, -1.47 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.11, -1.49 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.11, -1.51 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.11, -1.53 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.10, -1.54 | pg_sandpit_lod1/playground | 85 | 3.21 |
| 0.54, 0.09, -1.56 | pg_sandpit_lod1/playground | 85 | 3.21 |
| -0.54, 0.08, -1.57 | pg_sandpit_lod1/playground | 85 | 3.21 |

(52 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.42, 0.03, 1.42 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 0.96 | 78 | 52.6 |
| 1.56, 0.00, 1.42 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 0.96 | 78 | 52.6 |
| -1.42, 0.03, -1.58 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 0.96 | 78 | 52.6 |
| 1.56, 0.00, -1.58 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 0.96 | 78 | 52.6 |
| 0.95, 0.00, 1.42 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 2.86 | 18 | 69.6 |
| -0.87, 0.00, -1.42 | pg_sandpit_lod1/playground + pg_sandpit_lod1/playground | 2.86 | 14 | 68.7 |


Nodes: pg_sandpit_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
