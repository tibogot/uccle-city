# Mesh audit (before pack): playgroundkit.pg_fence_lod1

496 triangles, 288 welded vertices, 0 open edges, 0 rays, 18 ms.

**0 blocking**, 152 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 152 |
| seam | info | 6 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 152)

| at | part | aspect | longest |
|---|---|---|---|
| -1.03, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -1.03, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -1.03, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -1.03, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -1.03, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -1.03, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -1.03, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -1.03, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -0.97, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -0.97, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -0.97, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -0.97, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -0.97, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -0.97, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| -0.97, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| -0.97, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 0.97, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 0.97, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 0.97, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 0.97, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 0.97, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 0.97, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 0.97, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 0.97, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 1.03, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 1.03, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 1.03, 0.30, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 1.03, 0.70, -0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 1.03, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 1.03, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 390 | 1.192 |
| 1.03, 0.30, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 1.03, 0.70, 0.02 | pg_fence_lod1/steel_painted_green | 389 | 1.192 |
| 0.32, 0.06, -0.03 | pg_fence_lod1/steel_painted_green | 544 | 1.92 |
| -0.32, 0.06, -0.03 | pg_fence_lod1/steel_painted_green | 544 | 1.92 |
| 0.32, 0.06, -0.03 | pg_fence_lod1/steel_painted_green | 544 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod1/steel_painted_green | 544 | 1.92 |
| 0.32, 0.06, -0.02 | pg_fence_lod1/steel_painted_green | 545 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod1/steel_painted_green | 545 | 1.92 |
| 0.32, 0.06, -0.02 | pg_fence_lod1/steel_painted_green | 545 | 1.92 |
| -0.32, 0.06, -0.03 | pg_fence_lod1/steel_painted_green | 545 | 1.92 |

(112 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.97, 0.83, -0.02 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.12 | 25 | 74.3 |
| 0.97, 0.18, -0.02 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.12 | 23 | 74.2 |
| 0.97, 0.83, -0.02 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.12 | 23 | 74.3 |
| -0.97, 0.18, -0.02 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.12 | 22 | 74.2 |
| -1.03, 1.10, 0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.17 | 6 | 45.1 |
| 0.97, 1.10, 0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.17 | 6 | 45.1 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.00, 1.10, -0.01 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.0004 |
| -1.02, 1.10, -0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.00043 |
| -0.98, 1.10, 0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.00043 |
| -1.00, 1.10, 0.01 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.0004 |
| 1.00, 1.10, -0.01 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.0004 |
| 0.98, 1.10, -0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.00043 |
| 1.02, 1.10, 0.00 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.00043 |
| 1.00, 1.10, 0.01 | pg_fence_lod1/steel_painted_green + pg_fence_lod1/steel_painted_green | 0.0004 |


Nodes: pg_fence_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
