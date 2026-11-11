# Mesh audit (before pack): playgroundkit.pg_gate_lod0

1,592 triangles, 944 welded vertices, 200 open edges, 0 rays, 123 ms.

**0 blocking**, 418 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 416 |
| tjunction | warn | 2 |
| seam | info | 146 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 416)

| at | part | aspect | longest |
|---|---|---|---|
| -0.62, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.62, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| -0.54, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.54, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, -0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.34, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.62, 0.77, 0.04 | pg_gate_lod0/steel_painted_green | 337 | 1.29 |
| 0.17, 0.06, -0.01 | pg_gate_lod0/steel_painted_green | 337 | 1.032 |
| -0.17, 0.06, -0.01 | pg_gate_lod0/steel_painted_green | 337 | 1.032 |
| 0.17, 0.06, -0.01 | pg_gate_lod0/steel_painted_green | 338 | 1.032 |
| -0.17, 0.06, -0.01 | pg_gate_lod0/steel_painted_green | 338 | 1.032 |
| -0.17, 0.10, -0.01 | pg_gate_lod0/steel_painted_green | 337 | 1.032 |
| 0.17, 0.10, -0.01 | pg_gate_lod0/steel_painted_green | 337 | 1.032 |
| -0.17, 0.10, -0.01 | pg_gate_lod0/steel_painted_green | 336 | 1.032 |
| 0.17, 0.10, -0.01 | pg_gate_lod0/steel_painted_green | 336 | 1.032 |

(376 more in the JSON)

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -0.47, 0.11, -0.03 | pg_gate_lod0/steel_painted_green | 0.003 |
| 0.47, 0.11, -0.03 | pg_gate_lod0/steel_painted_green | 0.003 |

## seam (info, 146)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.52, 0.88, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_galvanised | 0.45 | 50 | 90 |
| 0.55, 0.88, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_galvanised | 0.4 | 37 | 90 |
| -0.54, 0.15, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_galvanised | 0.25 | 33 | 54 |
| -0.54, 0.85, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_galvanised | 0.25 | 31 | 54 |
| -0.07, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 12 | 90 |
| -0.02, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 12 | 90 |
| 0.03, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 12 | 90 |
| 0.07, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.13, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.17, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.22, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.27, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.32, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.37, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.42, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.47, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.47, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.42, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.37, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.32, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.27, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.22, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.17, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| -0.12, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 10 | 90 |
| 0.47, 0.66, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0 | 9 | 36 |
| 0.47, 0.84, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0 | 9 | 36 |
| 0.47, 1.02, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0 | 9 | 36 |
| -0.42, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.37, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.32, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.27, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.22, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.17, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.12, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.07, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| -0.02, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.03, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.08, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.13, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |
| 0.17, 0.29, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.01 | 8 | 36 |

(106 more in the JSON)

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.59, 1.20, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00123 |
| -0.60, 1.20, 0.00 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00122 |
| -0.55, 1.20, 0.01 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00123 |
| -0.58, 1.20, 0.02 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00122 |
| 0.58, 1.20, -0.02 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00122 |
| 0.55, 1.20, -0.01 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00123 |
| 0.60, 1.20, 0.00 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00122 |
| 0.59, 1.20, 0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00123 |
| 0.51, 0.10, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| 0.49, 0.10, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| -0.49, 0.10, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| -0.51, 0.10, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| 0.49, 1.03, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| 0.51, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| -0.51, 1.03, -0.04 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |
| -0.49, 1.03, -0.03 | pg_gate_lod0/steel_painted_green + pg_gate_lod0/steel_painted_green | 0.00045 |


Nodes: pg_gate_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
