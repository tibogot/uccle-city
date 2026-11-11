# Mesh audit (before pack): playgroundkit.pg_swing_lod1

1,130 triangles, 627 welded vertices, 0 open edges, 0 rays, 72 ms.

**0 blocking**, 229 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 229 |
| seam | info | 26 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 229)

| at | part | aspect | longest |
|---|---|---|---|
| -1.64, 1.48, 0.27 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.63, 0.66, 0.53 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.67, 1.48, 0.27 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.66, 0.66, 0.53 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.62, 1.49, 0.28 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.61, 0.67, 0.55 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.60, 1.49, 0.30 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 0.67, 0.56 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 1.50, 0.32 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 0.68, 0.59 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 1.51, 0.34 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.60, 0.69, 0.61 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.61, 1.51, 0.36 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.62, 0.69, 0.63 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.63, 1.52, 0.38 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.64, 0.70, 0.64 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.66, 1.52, 0.38 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.67, 0.70, 0.64 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.68, 1.51, 0.37 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.69, 0.69, 0.63 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.70, 1.51, 0.35 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.71, 0.69, 0.61 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.71, 1.50, 0.33 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.71, 0.68, 0.58 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.71, 1.49, 0.30 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.70, 0.67, 0.56 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.69, 1.49, 0.28 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.68, 0.67, 0.54 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.64, 1.52, -0.38 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.63, 0.70, -0.64 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.67, 1.52, -0.38 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.66, 0.70, -0.64 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.62, 1.51, -0.37 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.61, 0.69, -0.63 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.60, 1.51, -0.35 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 0.69, -0.61 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 1.50, -0.33 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 0.68, -0.58 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.59, 1.49, -0.30 | pg_swing_lod1/wood_log | 97 | 2.579 |
| -1.60, 0.67, -0.56 | pg_swing_lod1/wood_log | 97 | 2.579 |

(189 more in the JSON)

## seam (info, 26)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.66, 2.42, -0.07 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.55 | 48 | 78.7 |
| 1.64, 2.42, -0.07 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.55 | 48 | 78.7 |
| -1.67, 2.31, 0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.66 | 37 | 21.7 |
| -1.67, 2.31, -0.01 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.66 | 37 | 21.7 |
| 1.63, 2.31, 0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.66 | 37 | 21.7 |
| 1.63, 2.34, -0.10 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.66 | 37 | 21.7 |
| -1.08, 0.46, -0.02 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/rubber_black | 0.13 | 23 | 71.6 |
| 0.62, 0.46, -0.02 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/rubber_black | 0.13 | 23 | 58.7 |
| 1.07, 0.48, 0.02 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/rubber_black | 0.14 | 23 | 62.4 |
| -1.10, 2.35, -0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.21 | 22 | 78.8 |
| -0.65, 2.35, -0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.21 | 22 | 78.8 |
| 0.59, 2.35, -0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.21 | 22 | 78.8 |
| 1.05, 2.35, -0.02 | pg_swing_lod1/wood_log + pg_swing_lod1/steel_galvanised | 0.21 | 22 | 78.8 |
| -0.63, 0.47, 0.02 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/rubber_black | 0.13 | 21 | 58.7 |
| -1.07, 2.27, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 87.6 |
| -0.61, 2.27, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 87.6 |
| -1.08, 0.52, -0.01 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 90 |
| -0.62, 0.52, -0.01 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 90 |
| 1.09, 2.27, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 87.6 |
| 0.62, 0.52, -0.01 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 90 |
| 1.08, 0.52, -0.01 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 12 | 90 |
| 0.62, 2.27, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.03 | 10 | 85.5 |
| -0.62, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.05 | 6 | 87.6 |
| 0.62, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.05 | 6 | 87.6 |
| 1.08, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.05 | 6 | 87.6 |
| -1.08, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.04 | 5 | 85.5 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| -0.62, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |
| -0.62, 2.33, 0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |
| 0.62, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |
| 0.62, 2.33, 0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |
| 1.08, 2.33, -0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |
| 1.08, 2.33, 0.00 | pg_swing_lod1/steel_galvanised + pg_swing_lod1/steel_galvanised | 0.00005 |


Nodes: pg_swing_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
