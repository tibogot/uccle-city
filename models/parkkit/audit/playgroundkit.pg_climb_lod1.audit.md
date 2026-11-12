# Mesh audit (before pack): playgroundkit.pg_climb_lod1

2,788 triangles, 1,504 welded vertices, 0 open edges, 0 rays, 67 ms.

**0 blocking**, 443 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 443 |
| seam | info | 82 |
| backtoback | info | 34 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 443)

| at | part | aspect | longest |
|---|---|---|---|
| -0.64, 1.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 0.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 1.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 0.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 0.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 1.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 0.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.64, 1.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 0.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 1.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 0.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 1.90, 0.56 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 0.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 1.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 0.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.56, 1.90, 0.64 | pg_climb_lod1/playground | 487 | 2.984 |
| -0.65, 1.90, 0.61 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.65, 0.90, 0.59 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.59, 1.90, 0.65 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.61, 0.90, 0.65 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.61, 1.90, 0.56 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.59, 0.90, 0.56 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.56, 1.90, 0.59 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.56, 0.90, 0.61 | pg_climb_lod1/playground | 40 | 2.985 |
| -0.64, 1.56, -0.56 | pg_climb_lod1/playground | 406 | 2.484 |
| -0.64, 0.74, -0.56 | pg_climb_lod1/playground | 406 | 2.484 |
| -0.64, 1.56, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.64, 0.74, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.64, 0.74, -0.64 | pg_climb_lod1/playground | 406 | 2.484 |
| -0.64, 1.56, -0.64 | pg_climb_lod1/playground | 406 | 2.484 |
| -0.64, 0.74, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.64, 1.56, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 0.74, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 1.56, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 0.74, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 1.56, -0.64 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 0.74, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 1.56, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 0.74, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |
| -0.56, 1.56, -0.56 | pg_climb_lod1/playground | 405 | 2.484 |

(403 more in the JSON)

## seam (info, 82)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.05, 2.96, -0.08 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.25 | 54 | 20 |
| -0.54, 1.47, -0.62 | pg_climb_lod1/playground + pg_climb_lod1/playground | 2.38 | 46 | 45 |
| 0.65, 0.91, 0.35 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 35 | 55.5 |
| 0.64, 1.21, 0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 35 | 55.3 |
| 0.64, 0.92, -0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 35 | 55.3 |
| 0.64, 0.63, -0.36 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 35 | 55.3 |
| 0.66, 0.62, 0.35 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.5 |
| 0.66, 0.33, 0.11 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.5 |
| 0.65, 0.62, 0.11 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.5 |
| 0.65, 0.33, -0.13 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.5 |
| 0.66, 1.21, -0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.3 |
| 0.66, 0.92, -0.36 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 34 | 55.3 |
| 0.68, 0.33, 0.35 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.15 | 33 | 56.1 |
| 0.66, 0.63, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 24 | 49.4 |
| 0.67, 0.05, 0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 23 | 48 |
| 0.68, 0.62, 0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 22 | 48.6 |
| 0.66, 0.91, 0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 22 | 49.2 |
| 0.66, 1.50, 0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 22 | 48.6 |
| 0.64, 0.34, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 22 | 48.2 |
| 0.67, 0.92, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 22 | 46.6 |
| -0.62, 1.38, 0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 21 | 89.9 |
| -0.58, 1.38, -0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 21 | 89.9 |
| 0.64, 0.04, -0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.14 | 21 | 45 |
| 0.65, 0.05, -0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 21 | 48.5 |
| 0.67, 1.20, -0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 21 | 47.7 |
| 0.35, 1.22, 0.84 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.1 | 20 | 89.8 |
| 0.67, 0.05, 0.36 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 20 | 45.2 |
| 0.64, 1.50, 0.36 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 20 | 47.7 |
| 0.67, 1.50, -0.12 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 20 | 46.2 |
| 0.63, 0.05, -0.36 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 20 | 45.8 |
| 0.67, 1.49, -0.37 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.08 | 20 | 47.2 |
| 0.64, 0.06, -0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.06 | 19 | 46 |
| -0.56, 1.39, 0.58 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |
| -0.56, 1.39, -0.62 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |
| 0.65, 1.20, 0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.14 | 18 | 44.5 |
| 0.65, 1.49, 0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.13 | 18 | 45.1 |
| 0.56, 1.39, 0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |
| 0.58, 1.38, 0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |
| 0.56, 1.39, -0.58 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |
| 0.61, 1.38, -0.56 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.26 | 18 | 90 |

(42 more in the JSON)

## backtoback (info, 34)

| at | parts | area |
|---|---|---|
| -0.61, 2.90, 0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00035 |
| -0.60, 2.90, 0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00017 |
| -0.61, 2.90, 0.61 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00009 |
| -0.59, 2.90, 0.61 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00043 |
| -0.60, 2.95, 0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00011 |
| -0.60, 2.40, -0.62 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00026 |
| -0.62, 2.40, -0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00019 |
| -0.61, 2.40, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00038 |
| -0.61, 2.40, -0.58 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00009 |
| -0.59, 2.40, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00046 |
| 0.60, 2.40, 0.58 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00026 |
| 0.59, 2.40, 0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00047 |
| 0.61, 2.40, 0.61 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00044 |
| 0.60, 2.40, 0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00029 |
| 0.60, 2.90, -0.61 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00035 |
| 0.59, 2.90, -0.60 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00035 |
| 0.61, 2.90, -0.61 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00009 |
| 0.60, 2.90, -0.59 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00041 |
| 0.05, 1.50, -0.02 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00006 |
| 0.06, 1.50, -0.03 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00026 |
| 0.04, 1.50, -0.03 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.0001 |
| 0.05, 1.50, -0.08 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00006 |
| 0.07, 1.50, -0.06 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00006 |
| 0.03, 1.50, -0.06 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00006 |
| 0.06, 1.50, -0.07 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00038 |
| 0.03, 1.50, -0.06 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00013 |
| 0.05, 1.50, -0.06 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00038 |
| -0.39, 0.54, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00116 |
| -0.39, 0.51, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00152 |
| 0.18, 1.37, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00121 |
| 0.15, 1.33, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00115 |
| 0.25, 0.68, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00131 |
| 0.27, 0.66, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00114 |
| -0.15, 0.91, -0.63 | pg_climb_lod1/playground + pg_climb_lod1/playground | 0.00119 |


Nodes: pg_climb_lod1. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
