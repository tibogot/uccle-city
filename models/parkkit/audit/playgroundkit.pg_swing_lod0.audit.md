# Mesh audit (before pack): playgroundkit.pg_swing_lod0

13,556 triangles, 6,832 welded vertices, 0 open edges, 0 rays, 895 ms.

**0 blocking**, 264 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 264 |
| seam | info | 114 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 264)

| at | part | aspect | longest |
|---|---|---|---|
| -1.64, 1.48, 0.27 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.63, 0.66, 0.53 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.67, 1.48, 0.27 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.66, 0.66, 0.53 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.62, 1.49, 0.28 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.61, 0.67, 0.55 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.60, 1.49, 0.30 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 0.67, 0.56 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 1.50, 0.32 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 0.68, 0.59 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 1.51, 0.34 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.60, 0.69, 0.61 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.61, 1.51, 0.36 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.62, 0.69, 0.63 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.63, 1.52, 0.38 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.64, 0.70, 0.64 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.66, 1.52, 0.38 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.67, 0.70, 0.64 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.68, 1.51, 0.37 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.69, 0.69, 0.63 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.70, 1.51, 0.35 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.71, 0.69, 0.61 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.71, 1.50, 0.33 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.71, 0.68, 0.58 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.71, 1.49, 0.30 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.70, 0.67, 0.56 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.69, 1.49, 0.28 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.68, 0.67, 0.54 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.64, 1.52, -0.38 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.63, 0.70, -0.64 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.67, 1.52, -0.38 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.66, 0.70, -0.64 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.62, 1.51, -0.37 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.61, 0.69, -0.63 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.60, 1.51, -0.35 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 0.69, -0.61 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 1.50, -0.33 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 0.68, -0.58 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.59, 1.49, -0.30 | pg_swing_lod0/playground | 97 | 2.579 |
| -1.60, 0.67, -0.56 | pg_swing_lod0/playground | 97 | 2.579 |

(224 more in the JSON)

## seam (info, 114)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.66, 2.42, -0.07 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.55 | 56 | 78.7 |
| 1.64, 2.42, -0.07 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.55 | 56 | 78.7 |
| -1.67, 2.34, 0.12 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.67 | 49 | 19.4 |
| -1.67, 2.30, -0.01 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.67 | 49 | 19.4 |
| 1.63, 2.34, 0.12 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.67 | 49 | 19.4 |
| 1.63, 2.30, -0.01 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.67 | 49 | 19.4 |
| -1.08, 0.46, -0.02 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.14 | 39 | 84.2 |
| -0.63, 0.48, 0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.14 | 39 | 84.2 |
| 0.62, 0.46, -0.02 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.14 | 39 | 84.2 |
| 1.07, 0.48, 0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.14 | 39 | 84.2 |
| -1.09, 0.52, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.06 | 32 | 44.3 |
| -0.63, 0.52, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.06 | 32 | 44.4 |
| 0.61, 0.52, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.06 | 32 | 44.4 |
| 1.07, 0.52, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.06 | 32 | 44.3 |
| -1.10, 2.35, -0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.21 | 30 | 78.8 |
| -0.65, 2.35, -0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.21 | 30 | 78.8 |
| 0.59, 2.35, -0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.21 | 30 | 78.8 |
| 1.05, 2.35, -0.03 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.21 | 30 | 78.8 |
| -1.07, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.05 | 10 | 90 |
| -0.61, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.05 | 10 | 90 |
| 0.63, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.05 | 10 | 90 |
| 1.09, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.05 | 10 | 90 |
| -1.08, 2.19, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.5 |
| -1.08, 2.12, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.2 |
| -1.08, 2.04, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 1.96, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.4 |
| -1.08, 1.89, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 1.81, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.2 |
| -1.08, 1.73, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.5 |
| -1.08, 1.65, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.5 |
| -1.08, 1.58, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.2 |
| -1.08, 1.50, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 1.42, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.4 |
| -1.08, 1.35, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 1.27, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.2 |
| -1.08, 1.19, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.5 |
| -1.08, 1.12, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 1.04, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.2 |
| -1.08, 0.96, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.3 |
| -1.08, 0.89, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0 | 8 | 76.4 |

(74 more in the JSON)

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -1.08, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| -1.08, 2.33, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| -0.62, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| -0.62, 2.33, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| 0.62, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| 0.62, 2.33, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| 1.08, 2.33, -0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |
| 1.08, 2.33, 0.00 | pg_swing_lod0/playground + pg_swing_lod0/playground | 0.00006 |


Nodes: pg_swing_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
