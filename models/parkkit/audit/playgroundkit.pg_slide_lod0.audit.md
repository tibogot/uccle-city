# Mesh audit (before pack): playgroundkit.pg_slide_lod0

7,348 triangles, 3,774 welded vertices, 0 open edges, 0 rays, 444 ms.

**0 blocking**, 544 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 544 |
| seam | info | 32 |
| backtoback | info | 52 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 544)

| at | part | aspect | longest |
|---|---|---|---|
| -0.54, 1.26, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.54, 1.26, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.54, 0.59, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.54, 0.59, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.54, 1.26, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.46, 0.59, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.46, 1.26, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| -0.46, 0.59, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.46, 1.26, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| -0.54, 1.60, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 1.60, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 0.75, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 0.75, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.54, 1.60, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 0.75, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 1.60, -0.54 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 0.75, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| -0.46, 1.60, -0.46 | pg_slide_lod0/wood_stained | 414 | 2.534 |
| 0.46, 1.26, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| 0.46, 1.26, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| 0.46, 0.59, 0.54 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod0/wood_stained | 333 | 2.034 |
| 0.46, 0.59, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |
| 0.46, 1.26, 0.46 | pg_slide_lod0/wood_stained | 332 | 2.034 |

(504 more in the JSON)

## seam (info, 32)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.31, 1.45, 0.53 | pg_slide_lod0/steel_galvanised + pg_slide_lod0/stainless_steel | 0.35 | 71 | 35.7 |
| -0.49, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.22 | 51 | 40.7 |
| 0.49, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.22 | 51 | 40.7 |
| -0.46, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.25 | 34 | 90 |
| 0.46, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.25 | 34 | 90 |
| -0.52, 1.08, 0.46 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| -0.46, 1.09, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| -0.48, 1.08, -0.46 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| -0.46, 1.09, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| 0.46, 1.09, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| 0.48, 1.08, 0.46 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| 0.46, 1.09, -0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| 0.52, 1.08, -0.46 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.26 | 26 | 90 |
| -0.21, 0.20, 3.33 | pg_slide_lod0/steel_galvanised + pg_slide_lod0/steel_galvanised | 0.1 | 26 | 57 |
| 0.20, 0.19, 3.36 | pg_slide_lod0/steel_galvanised + pg_slide_lod0/steel_galvanised | 0.1 | 26 | 57 |
| -0.22, 0.44, -1.08 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 22 | 44.9 |
| -0.22, 0.71, -0.91 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 22 | 44.8 |
| 0.22, 0.42, -1.05 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 22 | 44.9 |
| 0.22, 0.69, -0.88 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 22 | 44.8 |
| -0.22, 0.98, -0.70 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 20 | 44.9 |
| -0.22, 0.17, -1.21 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 20 | 44.9 |
| 0.22, 0.99, -0.73 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 20 | 44.9 |
| 0.22, 0.18, -1.24 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.11 | 20 | 44.9 |
| -0.49, 2.00, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.08 | 16 | 24.1 |
| -0.49, 2.50, -0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.08 | 16 | 24.1 |
| 0.51, 2.00, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.08 | 16 | 24.1 |
| 0.51, 2.50, -0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.08 | 16 | 24.1 |
| -0.20, 1.17, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/stainless_steel | 0.82 | 15 | 36.6 |
| -0.48, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.16 | 14 | 23.7 |
| -0.48, 2.45, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.16 | 14 | 23.7 |
| 0.52, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.16 | 14 | 23.7 |
| 0.52, 2.45, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.16 | 14 | 23.7 |

## backtoback (info, 52)

| at | parts | area |
|---|---|---|
| -0.50, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.52, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.49, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00019 |
| -0.52, 1.95, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00026 |
| -0.51, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00038 |
| -0.48, 1.95, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.50, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.48, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00009 |
| -0.49, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00028 |
| -0.50, 1.95, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00046 |
| -0.49, 2.00, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| -0.50, 2.00, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| -0.50, 2.00, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00013 |
| -0.50, 2.45, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.52, 2.45, -0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.49, 2.45, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00019 |
| -0.52, 2.45, -0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00026 |
| -0.51, 2.45, -0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00038 |
| -0.48, 2.45, -0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.50, 2.45, -0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| -0.48, 2.45, -0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00009 |
| -0.49, 2.45, -0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00028 |
| -0.50, 2.45, -0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00046 |
| -0.49, 2.50, -0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| -0.50, 2.50, -0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| -0.50, 2.50, -0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00013 |
| 0.50, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| 0.48, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| 0.51, 1.95, 0.48 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00019 |
| 0.48, 1.95, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00026 |
| 0.49, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00038 |
| 0.52, 1.95, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| 0.50, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |
| 0.52, 1.95, 0.49 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00009 |
| 0.51, 1.95, 0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00028 |
| 0.50, 1.95, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00046 |
| 0.51, 2.00, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| 0.50, 2.00, 0.51 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00006 |
| 0.50, 2.00, 0.50 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00013 |
| 0.50, 2.45, -0.52 | pg_slide_lod0/wood_stained + pg_slide_lod0/wood_stained | 0.00004 |

(12 more in the JSON)


Nodes: pg_slide_lod0. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
